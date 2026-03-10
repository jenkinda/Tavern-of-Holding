/**
 * Default Generator Tables (The Oracle)
 * These act as the baseline rulesets for our random generators.
 */

import { pickRandom, rollDice } from './diceLogic';

// --- NPC Generation ---

const FirstNames = ["Aelar", "Borik", "Caeldrim", "Dara", "Elara", "Garrick", "Halia", "Ilyana", "Kael", "Lyra", "Merrick", "Nia", "Orion", "Perrin", "Quinn", "Rowan", "Sylas", "Thalia", "Varis", "Wyn"];
const LastNames = ["Ashwood", "Brightflame", "Coldiron", "Dawnstrider", "Evenwood", "Frostbeard", "Goldvein", "Highpeak", "Ironfist", "Lightbringer", "Moonwhisper", "Nightbreeze", "Oakhaven", "Proudfoot", "Silverleaf", "Stormrider", "Thunderstone", "Valerius", "Windrider", "Winterbourne"];
const Occupations = ["Blacksmith", "Tavern Keeper", "Merchant", "Guard", "Farmer", "Scholar", "Priest", "Thief", "Mercenary", "Alchemist", "Noble", "Beggar", "Minstrel", "Healer", "Hunter"];
const Quirks = ["Always squints", "Speaks in a whisper", "Missing a finger", "Has a nervous tick", "Constantly chewing on a root", "Overly polite", "Smells like brimstone", "Walks with a limp", "Laughs at inappropriate times", "Refuses to make eye contact", "Collects strange bugs", "Has a prominent scar"];
const Motivations = ["Wants to get rich", "Seeking revenge", "Looking for a lost family member", "Wants to protect their town", "Running from the law", "Trying to clear their name", "Seeking forbidden knowledge", "Wants to be famous", "Just trying to survive", "Following a divine vision"];

export function generateNPC() {
    return {
        name: `${pickRandom(FirstNames)} ${pickRandom(LastNames)}`,
        occupation: pickRandom(Occupations),
        quirk: pickRandom(Quirks),
        motivation: pickRandom(Motivations),
        stats: {
            str: rollDice(3, 6).total,
            dex: rollDice(3, 6).total,
            con: rollDice(3, 6).total,
            int: rollDice(3, 6).total,
            wis: rollDice(3, 6).total,
            cha: rollDice(3, 6).total,
        }
    };
}

// --- Tavern Generation ---

const TavernAdjectives = ["The Prancing", "The Rusty", "The Golden", "The Broken", "The Laughing", "The Drunken", "The Sleepy", "The Dancing", "The Blind", "The White"];
const TavernNouns = ["Pony", "Anchor", "Lion", "Shield", "Boar", "Dragon", "Giant", "Maiden", "Crow", "Dog"];
const TavernAtmospheres = ["Rowdy and packed with sailors", "Quiet and sullen, smelled of old smoke", "Bright and cheerful, live music playing", "Shady and dark, patrons whispering", "Clean and orderly, favored by merchants", "Run-down and dirty, cheap ale"];
const TavernSignatures = ["A stew that hasn't stopped boiling in a decade", "A mysterious glowing drink", "Meat pies of dubious origin", "The best honey mead in the realm", "A game of dice that never ends"];

export function generateTavern() {
    return {
        name: `${pickRandom(TavernAdjectives)} ${pickRandom(TavernNouns)}`,
        atmosphere: pickRandom(TavernAtmospheres),
        signature: pickRandom(TavernSignatures),
        proprietor: generateNPC()
    };
}

// --- Loot Generation ---

const Valuables = ["A silver ring set with an onyx", "A small pouch of gold dust", "A silk scarf", "A finely crafted dagger", "A golden goblet", "A pearl necklace", "A carved jade figurine"];
const Trinkets = ["A wooden coin", "A slightly glowing stone", "A tarnished key", "A piece of chalk", "A strange feather", "A glass eye", "A brass button"];
const MagicItems = ["Potion of Healing", "Scroll of Magic Missile", "+1 Arrow", "Ring of Protection", "Wand of Smiles", "Bag of Holding (fake)"];

export function generateLoot(tier: "low" | "medium" | "high") {
    let coins = "";
    const items = [];

    if (tier === "low") {
        coins = `${rollDice(3, 6).total} cp, ${rollDice(1, 6).total} sp`;
        if (rollDice(1, 100).total > 80) items.push(pickRandom(Trinkets));
    } else if (tier === "medium") {
        coins = `${rollDice(3, 10).total} sp, ${rollDice(2, 6).total} gp`;
        if (rollDice(1, 100).total > 50) items.push(pickRandom(Valuables));
        if (rollDice(1, 100).total > 90) items.push(pickRandom(MagicItems));
    } else {
        coins = `${rollDice(4, 10).total} gp, ${rollDice(1, 6).total} pp`;
        items.push(pickRandom(Valuables));
        if (rollDice(1, 100).total > 50) items.push(pickRandom(MagicItems));
    }

    return {
        coins,
        items: items.length > 0 ? items : ["None"]
    };
}

// --- Campfire Prompt Generation ---

const PromptTargets = [
    "The character sitting to your left",
    "The character sitting to your right",
    "The character with the highest max HP",
    "The character who took the most damage today",
    "The character who landed the killing blow on the toughest enemy",
    "The character who has been the quietest lately",
    "An ally of your choice",
    "The entire party"
];

const PromptTopics = [
    "Ask them about a childhood memory involving magic or a monster.",
    "Confess a fear or regret you haven't shared with the party yet.",
    "Offer them a drink or snack, and ask about their hometown.",
    "Ask if they have any family members or old friends they miss.",
    "Share a story about how you acquired one of your trinkets or an old scar.",
    "Ask them what they plan to do with their share of the loot once this is all over.",
    "Express gratitude for something specific they did recently to help you.",
    "Ask them what they consider to be the most dangerous foe they've ever faced."
];

export function generateCampfirePrompt() {
    return {
        target: pickRandom(PromptTargets),
        topic: pickRandom(PromptTopics)
    };
}
