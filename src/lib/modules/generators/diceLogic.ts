/**
 * Dice logic for the Oracle
 */

// Roll an NdX drop lowest, etc. For MVP, just NdX + Mod
export function rollDice(count: number, sides: number, modifier: number = 0): { total: number, rolls: number[] } {
    const rolls: number[] = [];
    let sum = 0;

    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        sum += roll;
    }

    return {
        total: sum + modifier,
        rolls
    };
}

// Helper to pick a random item from an array
export function pickRandom<T>(arr: T[]): T {
    if (!arr || arr.length === 0) throw new Error("Cannot pick from empty array");
    return arr[Math.floor(Math.random() * arr.length)];
}
