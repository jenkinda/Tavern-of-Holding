import { openDB, type IDBPDatabase } from 'idb';
import type { Campaign, Session, Note, CombatEncounter, MapScene, Monster, AudioTrack, Thread, VillainClock, CanonEntry, Ruling, DungeonLevel, DungeonRoom, PatrolRoute } from '../../types/models';

export const DB_NAME = 'TavernHoldingDB';
const DB_VERSION = 5;

export interface TavernDB {
    campaigns: {
        key: string;
        value: Campaign;
    };
    sessions: {
        key: string;
        value: Session;
        index: { 'by-campaignId': string };
    };
    notes: {
        key: string;
        value: Note;
        index: { 'by-campaignId': string; 'by-updatedAt': number };
    };
    maps: {
        key: string;
        value: MapScene;
        index: { 'by-campaignId': string };
    };
    monsters: {
        key: string;
        value: Monster;
        index: { 'by-campaignId': string };
    };
    audio: {
        key: string;
        value: AudioTrack;
        index: { 'by-campaignId': string };
    };
    images: {
        key: string;
        value: Blob;
    };
    threads: {
        key: string;
        value: Thread;
        index: { 'by-campaignId': string };
    };
    clocks: {
        key: string;
        value: VillainClock;
        index: { 'by-campaignId': string };
    };
    canon: {
        key: string;
        value: CanonEntry;
        index: { 'by-campaignId': string };
    };
    rulings: {
        key: string;
        value: Ruling;
        index: { 'by-campaignId': string };
    };
    dungeon_levels: {
        key: string;
        value: DungeonLevel;
        index: { 'by-campaignId': string };
    };
    dungeon_rooms: {
        key: string;
        value: DungeonRoom;
        index: { 'by-campaignId': string; 'by-levelId': string };
    };
    patrol_routes: {
        key: string;
        value: PatrolRoute;
        index: { 'by-campaignId': string; 'by-levelId': string };
    };
    encounters: {
        key: string;
        value: CombatEncounter;
        index: { 'by-campaignId': string };
    };
}

let dbPromise: Promise<IDBPDatabase<TavernDB>>;

export async function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<TavernDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('campaigns')) {
                    db.createObjectStore('campaigns', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
                    sessionStore.createIndex('by-campaignId', 'campaignId');
                }

                if (!db.objectStoreNames.contains('notes')) {
                    const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
                    noteStore.createIndex('by-campaignId', 'campaignId');
                    noteStore.createIndex('by-updatedAt', 'updatedAt');
                }

                if (!db.objectStoreNames.contains('maps')) {
                    const mapStore = db.createObjectStore('maps', { keyPath: 'id' });
                    mapStore.createIndex('by-campaignId', 'campaignId');
                }

                if (!db.objectStoreNames.contains('monsters')) {
                    const monsterStore = db.createObjectStore('monsters', { keyPath: 'id' });
                    monsterStore.createIndex('by-campaignId', 'campaignId');
                }

                if (!db.objectStoreNames.contains('audio')) {
                    const audioStore = db.createObjectStore('audio', { keyPath: 'id' });
                    audioStore.createIndex('by-campaignId', 'campaignId');
                }

                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images'); // No keypath, we will use out-of-line keys
                }

                if (!db.objectStoreNames.contains('threads')) {
                    const threadStore = db.createObjectStore('threads', { keyPath: 'id' });
                    threadStore.createIndex('by-campaignId', 'campaignId');
                }

                if (!db.objectStoreNames.contains('clocks')) {
                    const clockStore = db.createObjectStore('clocks', { keyPath: 'id' });
                    clockStore.createIndex('by-campaignId', 'campaignId');
                }

                if (!db.objectStoreNames.contains('canon')) {
                    const canonStore = db.createObjectStore('canon', { keyPath: 'id' });
                    canonStore.createIndex('by-campaignId', 'campaignId');
                }

                if (!db.objectStoreNames.contains('rulings')) {
                    const rulingStore = db.createObjectStore('rulings', { keyPath: 'id' });
                    rulingStore.createIndex('by-campaignId', 'campaignId');
                }

                if (!db.objectStoreNames.contains('dungeon_levels')) {
                    const levelStore = db.createObjectStore('dungeon_levels', { keyPath: 'id' });
                    levelStore.createIndex('by-campaignId', 'campaignId');
                }

                if (!db.objectStoreNames.contains('dungeon_rooms')) {
                    const roomStore = db.createObjectStore('dungeon_rooms', { keyPath: 'id' });
                    roomStore.createIndex('by-campaignId', 'campaignId');
                    roomStore.createIndex('by-levelId', 'levelId');
                }

                if (!db.objectStoreNames.contains('patrol_routes')) {
                    const patrolStore = db.createObjectStore('patrol_routes', { keyPath: 'id' });
                    patrolStore.createIndex('by-campaignId', 'campaignId');
                    patrolStore.createIndex('by-levelId', 'levelId');
                }

                if (!db.objectStoreNames.contains('encounters')) {
                    const encounterStore = db.createObjectStore('encounters', { keyPath: 'id' });
                    encounterStore.createIndex('by-campaignId', 'campaignId');
                }
            },
        });
    }
    return dbPromise;
}

// ------------------------------------------------------------------
// Campaigns API
// ------------------------------------------------------------------
export async function getCampaigns(): Promise<Campaign[]> {
    const db = await getDB();
    return db.getAll('campaigns');
}

export async function saveCampaign(c: Campaign): Promise<void> {
    const db = await getDB();
    await db.put('campaigns', c);
}

export async function deleteCampaign(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('campaigns', id);
    // Optional: In a real app we would cascade delete associated notes/sessions/maps
}

// ------------------------------------------------------------------
// Sessions API
// ------------------------------------------------------------------
export async function getSessionsForCampaign(campaignId: string): Promise<Session[]> {
    const db = await getDB();
    return db.getAllFromIndex('sessions', 'by-campaignId', campaignId);
}

export async function saveSession(s: Session): Promise<void> {
    const db = await getDB();
    await db.put('sessions', s);
}

export async function deleteSession(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('sessions', id);
}

// ------------------------------------------------------------------
// Notes API
// ------------------------------------------------------------------
export async function getNotesForCampaign(campaignId: string): Promise<Note[]> {
    const db = await getDB();
    return db.getAllFromIndex('notes', 'by-campaignId', campaignId);
}

export async function saveNote(note: Note): Promise<void> {
    const db = await getDB();
    await db.put('notes', note);
}

export async function deleteNote(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('notes', id);
}

// ------------------------------------------------------------------
// Maps & Background API
// ------------------------------------------------------------------

export async function getMapsForCampaign(campaignId: string): Promise<MapScene[]> {
    const db = await getDB();
    return db.getAllFromIndex('maps', 'by-campaignId', campaignId);
}

export async function saveMap(map: MapScene): Promise<void> {
    const db = await getDB();
    await db.put('maps', map);
}

export async function deleteMap(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('maps', id);
}

// Images stored out-of-line by ID
export async function saveImageBlob(id: string, blob: Blob): Promise<void> {
    const db = await getDB();
    await db.put('images', blob, id);
}

export async function getImageBlob(id: string): Promise<Blob | undefined> {
    const db = await getDB();
    return db.get('images', id);
}

export async function deleteImageBlob(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('images', id);
}

// ------------------------------------------------------------------
// Bestiary API
// ------------------------------------------------------------------

export async function getMonstersForCampaign(campaignId: string): Promise<Monster[]> {
    const db = await getDB();
    const specific = await db.getAllFromIndex('monsters', 'by-campaignId', campaignId);
    if (campaignId !== 'global') {
        const global = await db.getAllFromIndex('monsters', 'by-campaignId', 'global');
        return [...specific, ...global];
    }
    return specific;
}

export async function saveMonster(monster: Monster): Promise<void> {
    const db = await getDB();
    await db.put('monsters', monster);
}

export async function deleteMonster(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('monsters', id);
}

// ------------------------------------------------------------------
// Audio API
// ------------------------------------------------------------------

export async function getAudioTracks(campaignId: string): Promise<AudioTrack[]> {
    const db = await getDB();
    const specific = await db.getAllFromIndex('audio', 'by-campaignId', campaignId);
    if (campaignId !== 'global') {
        const global = await db.getAllFromIndex('audio', 'by-campaignId', 'global');
        return [...specific, ...global];
    }
    return specific;
}

export async function saveAudioTrack(track: AudioTrack): Promise<void> {
    const db = await getDB();
    await db.put('audio', track);
}

export async function deleteAudioTrack(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('audio', id);
}

// ------------------------------------------------------------------
// The Loom (Threads & Clocks) API
// ------------------------------------------------------------------

export async function getThreadsForCampaign(campaignId: string): Promise<Thread[]> {
    const db = await getDB();
    return db.getAllFromIndex('threads', 'by-campaignId', campaignId);
}

export async function saveThread(thread: Thread): Promise<void> {
    const db = await getDB();
    await db.put('threads', thread);
}

export async function deleteThread(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('threads', id);
}

export async function getClocksForCampaign(campaignId: string): Promise<VillainClock[]> {
    const db = await getDB();
    return db.getAllFromIndex('clocks', 'by-campaignId', campaignId);
}

export async function saveClock(clock: VillainClock): Promise<void> {
    const db = await getDB();
    await db.put('clocks', clock);
}

export async function deleteClock(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('clocks', id);
}

// ------------------------------------------------------------------
// The Archive (Canon & Rulings) API
// ------------------------------------------------------------------

export async function getCanonForCampaign(campaignId: string): Promise<CanonEntry[]> {
    const db = await getDB();
    return db.getAllFromIndex('canon', 'by-campaignId', campaignId);
}

export async function saveCanonEntry(entry: CanonEntry): Promise<void> {
    const db = await getDB();
    await db.put('canon', entry);
}

export async function deleteCanonEntry(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('canon', id);
}

export async function getRulingsForCampaign(campaignId: string): Promise<Ruling[]> {
    const db = await getDB();
    return db.getAllFromIndex('rulings', 'by-campaignId', campaignId);
}

export async function saveRuling(ruling: Ruling): Promise<void> {
    const db = await getDB();
    await db.put('rulings', ruling);
}

export async function deleteRuling(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('rulings', id);
}

// ------------------------------------------------------------------
// The Underworld (Megadungeon) API
// ------------------------------------------------------------------

export async function getDungeonLevelsForCampaign(campaignId: string): Promise<DungeonLevel[]> {
    const db = await getDB();
    return db.getAllFromIndex('dungeon_levels', 'by-campaignId', campaignId);
}

export async function saveDungeonLevel(level: DungeonLevel): Promise<void> {
    const db = await getDB();
    await db.put('dungeon_levels', level);
}

export async function deleteDungeonLevel(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('dungeon_levels', id);
}

export async function getRoomsForLevel(levelId: string): Promise<DungeonRoom[]> {
    const db = await getDB();
    return db.getAllFromIndex('dungeon_rooms', 'by-levelId', levelId);
}

export async function saveDungeonRoom(room: DungeonRoom): Promise<void> {
    const db = await getDB();
    await db.put('dungeon_rooms', room);
}

export async function deleteDungeonRoom(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('dungeon_rooms', id);
}

export async function getPatrolRoutesForLevel(levelId: string): Promise<PatrolRoute[]> {
    const db = await getDB();
    return db.getAllFromIndex('patrol_routes', 'by-levelId', levelId);
}

export async function savePatrolRoute(route: PatrolRoute): Promise<void> {
    const db = await getDB();
    await db.put('patrol_routes', route);
}

export async function deletePatrolRoute(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('patrol_routes', id);
}

// ------------------------------------------------------------------
// Encounters API
// ------------------------------------------------------------------

export async function getEncountersForCampaign(campaignId: string): Promise<CombatEncounter[]> {
    const db = await getDB();
    return db.getAllFromIndex('encounters', 'by-campaignId', campaignId);
}

export async function saveEncounter(encounter: CombatEncounter): Promise<void> {
    const db = await getDB();
    await db.put('encounters', encounter);
}

export async function deleteEncounter(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('encounters', id);
}
