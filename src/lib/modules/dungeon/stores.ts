import { writable } from 'svelte/store';
import type { DungeonLevel, DungeonRoom, PatrolRoute, UUID } from '../../types/models';
import { getDungeonLevelsForCampaign, getRoomsForLevel, getPatrolRoutesForLevel } from '../../core/storage/db';

interface DungeonState {
    levels: DungeonLevel[];
    rooms: Record<string, DungeonRoom[]>; // Keyed by levelId
    patrols: Record<string, PatrolRoute[]>; // Keyed by levelId
    activeLevelId: UUID | null;
    loading: boolean;
    error: string | null;
}

export const dungeonStore = writable<DungeonState>({
    levels: [],
    rooms: {},
    patrols: {},
    activeLevelId: null,
    loading: false,
    error: null
});

export async function loadDungeonForCampaign(campaignId: UUID) {
    dungeonStore.update(s => ({ ...s, loading: true, error: null }));
    try {
        const levels = await getDungeonLevelsForCampaign(campaignId);
        levels.sort((a, b) => a.depth - b.depth);

        const rooms: Record<string, DungeonRoom[]> = {};
        const patrols: Record<string, PatrolRoute[]> = {};

        for (const level of levels) {
            rooms[level.id] = await getRoomsForLevel(level.id);
            patrols[level.id] = await getPatrolRoutesForLevel(level.id);
        }

        const activeLevelId = levels.length > 0 ? levels[0].id : null;

        dungeonStore.update(s => ({
            ...s,
            levels,
            rooms,
            patrols,
            activeLevelId,
            loading: false
        }));
    } catch (err: any) {
        dungeonStore.update(s => ({ ...s, error: err.message, loading: false }));
    }
}
