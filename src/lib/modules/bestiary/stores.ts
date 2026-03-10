import { writable, get } from 'svelte/store';
import type { Monster, UUID } from '../../types/models';
import { getMonstersForCampaign, saveMonster, deleteMonster } from '../../core/storage/db';
import { campaignStore } from '../campaigns/stores';

type BestiaryState = {
    monsters: Monster[];
    loading: boolean;
    activeMonsterId: UUID | null;
};

export const bestiaryStore = writable<BestiaryState>({
    monsters: [],
    loading: false,
    activeMonsterId: null
});

export async function loadMonsters() {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) {
        bestiaryStore.update(s => ({ ...s, monsters: [], activeMonsterId: null }));
        return;
    }

    bestiaryStore.update(s => ({ ...s, loading: true }));
    const monsters = await getMonstersForCampaign(campaignId);

    // Sort monsters alphabetically by name
    monsters.sort((a, b) => a.name.localeCompare(b.name));

    bestiaryStore.update(s => {
        let activeMonsterId = s.activeMonsterId;
        if (monsters.length > 0 && !monsters.find(m => m.id === activeMonsterId)) {
            activeMonsterId = monsters[0].id;
        } else if (monsters.length === 0) {
            activeMonsterId = null;
        }
        return { ...s, monsters, activeMonsterId, loading: false };
    });
}

export function setActiveMonster(id: UUID | null) {
    bestiaryStore.update(s => ({ ...s, activeMonsterId: id }));
}

export async function createMonster(baseParams: Partial<Monster> = {}) {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) return;

    const newMonster: Monster = {
        id: crypto.randomUUID(),
        campaignId, // Make non-global by default so it's tied to active campaign
        name: baseParams.name || 'New Monster',
        size: baseParams.size || 'Medium',
        type: baseParams.type || 'humanoid',
        alignment: baseParams.alignment || 'unaligned',
        ac: baseParams.ac || 10,
        hp: baseParams.hp || 9,
        speed: baseParams.speed || '30 ft.',
        stats: baseParams.stats || {
            str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
        },
        skills: baseParams.skills || '',
        senses: baseParams.senses || 'passive Perception 10',
        languages: baseParams.languages || '--',
        cr: baseParams.cr || '1',
        traits: baseParams.traits || [],
        actions: baseParams.actions || [
            { name: 'Unarmed Strike', desc: 'Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 1 bludgeoning damage.' }
        ]
    };

    await saveMonster(newMonster);
    await loadMonsters();
    setActiveMonster(newMonster.id);
}

export async function updateMonster(updatedMonster: Monster) {
    await saveMonster(updatedMonster);
    bestiaryStore.update(s => ({
        ...s,
        monsters: s.monsters.map(m => m.id === updatedMonster.id ? updatedMonster : m)
    }));
}

export async function removeMonster(id: UUID) {
    await deleteMonster(id);
    await loadMonsters();
}

// Auto-load when active campaign changes
campaignStore.subscribe(() => {
    setTimeout(loadMonsters, 0);
});
