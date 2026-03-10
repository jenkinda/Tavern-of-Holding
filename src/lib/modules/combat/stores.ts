import { writable, get } from 'svelte/store';
import type { CombatEncounter, Combatant } from '../../types/models';
import { sortInitiative, advanceTurn, previousTurn, applyDamage, applyHealing, toggleCondition } from './combatLogic';
import { campaignStore } from '../campaigns/stores';
import { getEncountersForCampaign, saveEncounter, deleteEncounter } from '../../core/storage/db';

// For MVP, we'll store the combat state purely in memory since it's highly ephemeral during a session.
// In a V2, this could be hydrated/saved to IndexedDB per-session to survive page reloads.
export const encounterStore = writable<CombatEncounter>({
    id: '',
    campaignId: '',
    name: 'Current Encounter',
    combatants: [],
    round: 1,
    turnIndex: 0
});

export function addCombatant(c: Omit<Combatant, 'id'>) {
    const newCombatant: Combatant = {
        ...c,
        id: crypto.randomUUID()
    };

    encounterStore.update(state => {
        const activeCombatantId = state.combatants[state.turnIndex]?.id;
        // Add and re-sort
        const newList = [...state.combatants, newCombatant];
        const sorted = sortInitiative(newList);

        let newTurnIndex = state.turnIndex;
        if (activeCombatantId) {
            const foundIndex = sorted.findIndex(c => c.id === activeCombatantId);
            if (foundIndex !== -1) {
                newTurnIndex = foundIndex;
            }
        }

        return {
            ...state,
            combatants: sorted,
            turnIndex: newTurnIndex
        };
    });
}

export function removeCombatant(id: string) {
    encounterStore.update(state => {
        const list = state.combatants.filter(c => c.id !== id);
        let newIndex = state.turnIndex;
        if (newIndex >= list.length) newIndex = Math.max(0, list.length - 1);

        return {
            ...state,
            combatants: list,
            turnIndex: newIndex
        };
    });
}

export function handleDamage(id: string, amount: number) {
    encounterStore.update(state => ({
        ...state,
        combatants: state.combatants.map(c => c.id === id ? applyDamage(c, amount) : c)
    }));
}

export function handleHeal(id: string, amount: number) {
    encounterStore.update(state => ({
        ...state,
        combatants: state.combatants.map(c => c.id === id ? applyHealing(c, amount) : c)
    }));
}

export function updateHP(id: string, amount: number) {
    encounterStore.update(state => ({
        ...state,
        combatants: state.combatants.map(c => {
            if (c.id === id) {
                const newCurrent = Math.max(0, Math.min(c.hp.max, amount));
                return { ...c, hp: { ...c.hp, current: newCurrent } };
            }
            return c;
        })
    }));
}

export function toggleCond(id: string, cond: string) {
    encounterStore.update(state => ({
        ...state,
        combatants: state.combatants.map(c => c.id === id ? toggleCondition(c, cond) : c)
    }));
}

export function setInitiative(id: string, roll: number) {
    encounterStore.update(state => {
        const activeCombatantId = state.combatants[state.turnIndex]?.id;
        const updated = state.combatants.map(c => c.id === id ? { ...c, initiative: roll } : c);
        const sorted = sortInitiative(updated);

        let newTurnIndex = state.turnIndex;
        if (activeCombatantId) {
            const foundIndex = sorted.findIndex(c => c.id === activeCombatantId);
            if (foundIndex !== -1) {
                newTurnIndex = foundIndex;
            }
        }

        return {
            ...state,
            combatants: sorted,
            turnIndex: newTurnIndex
        };
    });
}

export function nextTurn() {
    encounterStore.update(state => advanceTurn(state));
}

export function prevTurn() {
    encounterStore.update(state => previousTurn(state));
}

export function resetEncounter() {
    encounterStore.update(state => ({
        ...state,
        combatants: [],
        round: 1,
        turnIndex: 0
    }));
}

// ----------------------------------------------------------------------------
// Encounter Vault (Save/Load)
// ----------------------------------------------------------------------------

export const savedEncountersStore = writable<CombatEncounter[]>([]);

export async function fetchSavedEncounters() {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) return;
    const encounters = await getEncountersForCampaign(campaignId);
    savedEncountersStore.set(encounters);
}

export async function saveCurrentEncounter(name: string) {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) return;

    const current = get(encounterStore);

    // We create a fresh copy of the encounter to save.
    const encounterToSave: CombatEncounter = {
        ...current,
        id: crypto.randomUUID(), // Always save as a new encounter template
        campaignId,
        name: name || "Saved Encounter"
    };

    await saveEncounter(encounterToSave);
    await fetchSavedEncounters();
}

export async function loadEncounter(id: string) {
    const encounters = get(savedEncountersStore);
    const target = encounters.find(e => e.id === id);
    if (!target) return;

    // Load it into the active encounter store (keep the current encounter's ID, just replace combatants)
    encounterStore.update(state => ({
        ...state,
        combatants: target.combatants.map(c => ({
            ...c,
            id: crypto.randomUUID(), // Re-roll IDs so they are fresh instances
            hp: { current: c.hp.max, max: c.hp.max }, // Reset HP to max on fresh load
            conditions: [] // Reset conditions
        })),
        round: 1,
        turnIndex: 0
    }));
}

export async function removeSavedEncounter(id: string) {
    await deleteEncounter(id);
    await fetchSavedEncounters();
}
