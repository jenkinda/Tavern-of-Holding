import type { Combatant, CombatEncounter } from '../../types/models';

/**
 * Pure functions for Combat Logic (Rules Scribe)
 * These routines mutate a *copy* of the state or return completely new arrays
 * to maintain strict reactivity in Svelte stores.
 */

export function sortInitiative(combatants: Combatant[]): Combatant[] {
    // Sort descending by initiative. 
    // In a real system, ties might be broken by DEX modifier. Here we just maintain stable sort for ties.
    return [...combatants].sort((a, b) => b.initiative - a.initiative);
}

export function advanceTurn(encounter: CombatEncounter): CombatEncounter {
    if (encounter.combatants.length === 0) return encounter;

    const currentCombatantIndex = encounter.turnIndex;
    let nextIndex = encounter.turnIndex + 1;
    let nextRound = encounter.round;

    if (nextIndex >= encounter.combatants.length) {
        nextIndex = 0;
        nextRound += 1;
    }

    // Process condition burn-down for the combatant whose turn just finished
    const updatedCombatants = encounter.combatants.map((c, i) => {
        if (i === currentCombatantIndex) {
            const newConditions = c.conditions
                .map(cond => cond.duration > 0 ? { ...cond, duration: cond.duration - 1 } : cond)
                .filter(cond => cond.duration !== 0);
            return { ...c, conditions: newConditions };
        }
        return c;
    });

    return {
        ...encounter,
        combatants: updatedCombatants,
        turnIndex: nextIndex,
        round: nextRound
    };
}

export function previousTurn(encounter: CombatEncounter): CombatEncounter {
    if (encounter.combatants.length === 0) return encounter;

    let prevIndex = encounter.turnIndex - 1;
    let prevRound = encounter.round;

    if (prevIndex < 0) {
        prevIndex = encounter.combatants.length - 1;
        prevRound = Math.max(1, prevRound - 1);
    }

    return {
        ...encounter,
        turnIndex: prevIndex,
        round: prevRound
    };
}

export function applyDamage(combatant: Combatant, amount: number): Combatant {
    const newCurrent = Math.max(0, combatant.hp.current - amount);
    return {
        ...combatant,
        hp: { ...combatant.hp, current: newCurrent }
    };
}

export function applyHealing(combatant: Combatant, amount: number): Combatant {
    const newCurrent = Math.min(combatant.hp.max, combatant.hp.current + amount);
    return {
        ...combatant,
        hp: { ...combatant.hp, current: newCurrent }
    };
}

export function toggleCondition(combatant: Combatant, condition: string, duration: number = -1): Combatant {
    const hasCond = combatant.conditions.some(c => c.name === condition);
    const newConditions = hasCond
        ? combatant.conditions.filter(c => c.name !== condition)
        : [...combatant.conditions, { name: condition, duration }];

    return {
        ...combatant,
        conditions: newConditions
    };
}
