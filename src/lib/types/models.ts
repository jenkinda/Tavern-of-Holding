export type UUID = string;

// Campaigns & Sessions
export interface Campaign {
    id: UUID;
    name: string;
    createdAt: number;
}

export interface Session {
    id: UUID;
    campaignId: UUID;
    name: string;
    date: number; // timestamp
}

// Notes
export interface Note {
    id: UUID;
    campaignId: UUID;
    title: string;
    content: string; // Markdown
    tags: string[];  // e.g., ["NPC", "Location"]
    updatedAt: number;
}

// Bestiary
export interface StatBlockTrait {
    name: string;
    desc: string;
}

export interface Monster {
    id: UUID;
    campaignId: UUID | "global"; // If global, available across all campaigns
    name: string;
    size: string; // e.g. Medium
    type: string; // e.g. humanoid (goblinoid)
    alignment: string; // e.g. Neutral Evil
    ac: number;
    acType?: string; // e.g. (leather armor, shield)
    hp: number;
    hpDice?: string; // e.g. (2d6 + 0)
    speed: string; // e.g. 30 ft.
    stats: {
        str: number;
        dex: number;
        con: number;
        int: number;
        wis: number;
        cha: number;
    };
    skills: string;
    senses: string;
    languages: string;
    cr: string; // e.g. 1/4 (50 XP)
    traits: StatBlockTrait[];
    actions: StatBlockTrait[];
    reactions?: StatBlockTrait[];
    legendary?: StatBlockTrait[];
}

// Audio
export interface AudioTrack {
    id: UUID;
    campaignId: UUID | "global";
    name: string;
    type: 'ambient' | 'sfx';
    blobId: string;
}

// Combat
export type CombatantType = 'pc' | 'npc' | 'monster';

export interface Combatant {
    id: UUID;
    name: string;
    type: CombatantType;
    hp: { current: number; max: number };
    ac: number;
    initiative: number;
    conditions: string[];
    notes: string;
}

export interface CombatEncounter {
    id: UUID;
    campaignId: UUID;
    name: string;
    combatants: Combatant[];
    round: number;
    turnIndex: number; // Who is currently acting
}

// Generators
export interface RollTableEntry {
    weight: number;
    result: string;
}

export interface RollTable {
    id: UUID;
    name: string;
    category: string;
    entries: RollTableEntry[];
    isCustom: boolean;
}

export interface Token {
    id: UUID;
    mapId: UUID;
    entityId?: UUID; // Links to a Combatant or Note if applicable
    name: string;
    x: number; // Percent or grid coord
    y: number;
    color: string;
    size: number;
    shape?: 'circle' | 'square' | 'cone' | 'line' | 'pin'; // For spell areas and lore
    rotation?: number; // Degrees
}

export interface FogZone {
    id: UUID;
    x: number;
    y: number;
    width: number;
    height: number;
    isRevealed: boolean;
}

export interface MapScene {
    id: UUID;
    campaignId: UUID;
    name: string;
    backgroundId: string; // Reference to Blob in IndexedDB
    tokens: Token[];
    fogs: FogZone[];
    createdAt: number;
    showHexGrid?: boolean;
    weather?: 'none' | 'rain' | 'fog';
    timeOfDay?: 'day' | 'night' | 'dusk';
}

// ----------------------------------------------------------------------------
// Narrative Engine (The Loom)
// ----------------------------------------------------------------------------
export interface ThreadNote {
    text: string;
    sessionNumber: number;
    timestamp: number;
}

export interface Thread {
    id: UUID;
    campaignId: UUID;
    title: string;
    description?: string;
    category: 'quest' | 'mystery' | 'npc' | 'faction' | 'dungeon' | 'personal' | 'lore' | 'general';
    urgency: number; // 1-5 (1 = Low, 5 = Critical)
    escalationLevel: number; // 0-5
    sessionsOpen: number; // How long it's been active
    status: 'active' | 'scheduled' | 'escalating' | 'resolved' | 'archived';
    notesLog: ThreadNote[];
    createdAt: number;
    createdSession: number;
}

export interface VillainClock {
    id: UUID;
    campaignId: UUID;
    title: string;
    progress: number;
    max: number; // e.g., 4, 6, 8 segments
    triggers: string; // "When X happens, advance"
    category: string;
    createdAt: number;
}

// ----------------------------------------------------------------------------
// Continuity (The Archive)
// ----------------------------------------------------------------------------
export interface CanonEntry {
    id: UUID;
    campaignId: string;
    name: string;
    category: 'npc' | 'location' | 'faction' | 'item' | 'other';
    description: string;
    traits: string;
    createdAt: number;
    updatedAt: number;
}

export interface Ruling {
    id: UUID;
    campaignId: string;
    query: string;      // E.g., "Can I use prestidigitation to blind someone?"
    ruling: string;     // E.g., "No, but it can cause disadvantage if cast on glasses."
    tags: string[];
    precedentWeight: number; // 1 (Minor) to 5 (Core Homebrew Rule)
    createdAt: number;
}

// ----------------------------------------------------------------------------
// Megadungeon (The Underworld)
// ----------------------------------------------------------------------------
export interface DungeonLevel {
    id: UUID;
    campaignId: string;
    name: string;
    depth: number;
    description: string;
    factionControl: string;
    createdAt: number;
}

export type RoomStatus = 'unexplored' | 'explored' | 'cleared' | 'occupied' | 'trapped';

export interface DungeonRoom {
    id: UUID;
    levelId: string;
    campaignId: string;
    name: string;
    status: RoomStatus;
    description: string;
    occupants: string;
    traps: string;
    createdAt: number;
}

export interface PatrolRoute {
    id: UUID;
    campaignId: string;
    levelId: string;
    name: string;
    description: string;
    routeInterval: number; // Advance interval
    currentPositionIndex: number;
    routePath: string[]; // Array of room names or points
    createdAt: number;
}
