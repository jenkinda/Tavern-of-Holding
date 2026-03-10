<script lang="ts">
    import { rollDice } from "./diceLogic";
    import {
        generateNPC,
        generateTavern,
        generateLoot,
        generateCampfirePrompt,
    } from "./defaultTables";
    import { calcEncounterBudget, calcMagicItemPrice } from "./calculators";

    // State for basic dice roller
    let numDice = $state(1);
    let numSides = $state(20);
    let modifier = $state(0);
    let lastRoll = $state<{ total: number; rolls: number[] } | null>(null);

    function handleRoll() {
        lastRoll = rollDice(numDice, numSides, modifier);
    }

    // State for Generators
    let generatedContent = $state("");
    let genType = $state("npc");

    function handleGenerate() {
        if (genType === "npc") {
            const npc = generateNPC();
            generatedContent = `
               <h3 class="text-xl font-serif text-[var(--tavern-accent-gold)] mb-2">${npc.name}</h3>
               <p><strong>Occupation:</strong> ${npc.occupation}</p>
               <p><strong>Quirk:</strong> ${npc.quirk}</p>
               <p><strong>Motivation:</strong> ${npc.motivation}</p>
               <div class="mt-4 grid grid-cols-3 gap-2 text-sm text-center">
                   <div class="bg-[var(--tavern-bg-base)] p-2 rounded border border-[var(--tavern-accent-gold)]/20"><span class="block text-[0.6rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40">STR</span> ${npc.stats.str}</div>
                   <div class="bg-[var(--tavern-bg-base)] p-2 rounded border border-[var(--tavern-accent-gold)]/20"><span class="block text-[0.6rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40">DEX</span> ${npc.stats.dex}</div>
                   <div class="bg-[var(--tavern-bg-base)] p-2 rounded border border-[var(--tavern-accent-gold)]/20"><span class="block text-[0.6rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40">CON</span> ${npc.stats.con}</div>
                   <div class="bg-[var(--tavern-bg-base)] p-2 rounded border border-[var(--tavern-accent-gold)]/20"><span class="block text-[0.6rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40">INT</span> ${npc.stats.int}</div>
                   <div class="bg-[var(--tavern-bg-base)] p-2 rounded border border-[var(--tavern-accent-gold)]/20"><span class="block text-[0.6rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40">WIS</span> ${npc.stats.wis}</div>
                   <div class="bg-[var(--tavern-bg-base)] p-2 rounded border border-[var(--tavern-accent-gold)]/20"><span class="block text-[0.6rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40">CHA</span> ${npc.stats.cha}</div>
               </div>
           `;
        } else if (genType === "tavern") {
            const tavern = generateTavern();
            generatedContent = `
               <h3 class="text-xl font-serif text-[var(--tavern-accent-gold)] mb-2">${tavern.name}</h3>
               <p><strong>Atmosphere:</strong> ${tavern.atmosphere}</p>
               <p><strong>Signature Item:</strong> ${tavern.signature}</p>
               <div class="mt-4 p-4 border-l-2 border-[var(--tavern-accent-red)] bg-[var(--tavern-accent-red)]/10 rounded-r">
                   <p class="text-sm uppercase tracking-widest text-[var(--tavern-text-main)]/40 mb-1">Proprietor</p>
                   <p class="font-medium text-[var(--tavern-accent-gold)]">${tavern.proprietor.name}</p>
                   <p class="text-xs">${tavern.proprietor.quirk}</p>
               </div>
           `;
        } else if (
            genType === "loot_low" ||
            genType === "loot_med" ||
            genType === "loot_high"
        ) {
            let tier: "low" | "medium" | "high" = "low";
            if (genType === "loot_med") tier = "medium";
            if (genType === "loot_high") tier = "high";

            const loot = generateLoot(tier);
            generatedContent = `
               <h3 class="text-xl font-serif text-[var(--tavern-accent-gold)] mb-2">Loot Hoard (${tier.toUpperCase()})</h3>
               <p><strong>Coins:</strong> ${loot.coins}</p>
               <p class="mt-2"><strong>Items:</strong></p>
               <ul class="list-disc pl-5 mt-1 space-y-1">
                   ${loot.items.map((i) => `<li>${i}</li>`).join("")}
               </ul>
           `;
        } else if (genType === "campfire") {
            const prompt = generateCampfirePrompt();
            generatedContent = `
               <h3 class="text-xl font-serif text-[var(--tavern-accent-gold)] mb-2">🔥 Campfire Chat</h3>
               <p class="text-[var(--tavern-accent-red)] font-bold text-[0.65rem] uppercase tracking-widest mb-1">Target</p>
               <p class="mb-4">${prompt.target}</p>
               <p class="text-[var(--tavern-accent-gold)] font-bold text-[0.65rem] uppercase tracking-widest mb-1">Prompt</p>
               <p class="italic text-base text-[var(--tavern-text-main)]/90">"${prompt.topic}"</p>
           `;
        }
    }

    // Encounter Calculator State
    let partySize = $state(4);
    let avgLevel = $state(3);
    let encounterBudget = $derived(calcEncounterBudget(partySize, avgLevel));

    // Arcane Appraiser State
    let rarity = $state("uncommon");
    let isConsumable = $state(false);
    let magicItemData = $derived(calcMagicItemPrice(rarity, isConsumable));

    // Coin Splitter State
    let rawCoins = $state("");
    let coinPartySize = $state(4);

    function parseCoins(input: string) {
        const result = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
        const regex = /(\d+)\s*(cp|sp|ep|gp|pp)/gi;
        let match;
        let foundAny = false;

        while ((match = regex.exec(input)) !== null) {
            const val = parseInt(match[1]);
            const type = match[2].toLowerCase() as keyof typeof result;
            if (!isNaN(val)) {
                result[type] += val;
                foundAny = true;
            }
        }

        // Fallback: if they just entered a number like "120" with no suffix, assume gp
        if (!foundAny) {
            const fallbackMatch = input.match(/(\d+)/);
            if (fallbackMatch) {
                result.gp = parseInt(fallbackMatch[1]);
            }
        }

        return result;
    }

    let coinSplitResult = $derived(
        (() => {
            if (!rawCoins.trim() || coinPartySize < 1) return null;
            const totals = parseCoins(rawCoins);
            const perPlayer = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
            const remainder = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

            let hasCoins = Object.values(totals).some((v) => v > 0);
            if (!hasCoins) return null;

            const coinOrder = [
                { type: "pp", next: "gp", mult: 10 },
                { type: "gp", next: "ep", mult: 2 },
                { type: "ep", next: "sp", mult: 5 },
                { type: "sp", next: "cp", mult: 10 },
                { type: "cp", next: null, mult: 1 },
            ];

            for (const step of coinOrder) {
                const c = step.type as keyof typeof totals;
                const val = totals[c];

                perPlayer[c] = Math.floor(val / coinPartySize);
                const rem = val % coinPartySize;

                if (step.next && rem > 0) {
                    totals[step.next as keyof typeof totals] += rem * step.mult;
                    remainder[c] = 0;
                } else {
                    remainder[c] = rem;
                }
            }
            return { perPlayer, remainder };
        })(),
    );

    function formatCoinObj(obj: Record<string, number>) {
        const parts = [];
        if (obj.pp) parts.push(`${obj.pp}pp`);
        if (obj.gp) parts.push(`${obj.gp}gp`);
        if (obj.ep) parts.push(`${obj.ep}ep`);
        if (obj.sp) parts.push(`${obj.sp}sp`);
        if (obj.cp) parts.push(`${obj.cp}cp`);
        return parts.length > 0 ? parts.join(", ") : "0";
    }

    // Journey Calculator State
    let journeyMiles = $state(0);
    let journeyPace = $state("normal");
    let journeyCalculated = $state<{ days: number; weather: string } | null>(
        null,
    );

    const weatherConditions = [
        "Clear & Sunny",
        "Light Rain",
        "Heavy Rain",
        "Dense Fog",
        "Overcast & Gloomy",
        "High Winds",
        "Thunderstorm",
        "Abnormally Cold/Hot",
        "Perfectly Mild",
    ];

    function calculateJourney() {
        if (journeyMiles <= 0) return;
        let paceMiles = 24;
        if (journeyPace === "fast") paceMiles = 30;
        if (journeyPace === "slow") paceMiles = 18;

        const days = Math.ceil(journeyMiles / paceMiles);
        const w =
            weatherConditions[
                Math.floor(Math.random() * weatherConditions.length)
            ];
        journeyCalculated = { days, weather: w };
    }
</script>

<div class="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
    <!-- Header -->
    <header
        class="border-b border-[var(--tavern-accent-gold)]/20 pb-4 shrink-0"
    >
        <h1
            class="text-4xl font-serif text-[var(--tavern-accent-gold)] mb-2 tracking-wide"
        >
            The Oracle
        </h1>
        <p class="text-[var(--tavern-text-main)]/60">
            Consult the fates for quick answers, names, and treasure.
        </p>
    </header>

    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <!-- Dice Roller -->
        <section
            class="bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg p-5 flex flex-col shrink-0 h-min"
        >
            <h2
                class="font-serif text-[var(--tavern-accent-gold)] text-xl border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-4"
            >
                Divining Bones (Dice)
            </h2>

            <div class="flex items-end gap-3 mb-6 flex-wrap">
                <div class="flex flex-col gap-1 w-20">
                    <label
                        for="numdice"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Count (N)</label
                    >
                    <input
                        id="numdice"
                        type="number"
                        min="1"
                        max="100"
                        bind:value={numDice}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1.5 text-center focus:outline-none focus:border-[var(--tavern-accent-gold)]"
                    />
                </div>
                <span
                    class="text-xl font-serif text-[var(--tavern-accent-gold)] mb-1.5"
                    >d</span
                >
                <div class="flex flex-col gap-1 w-20">
                    <label
                        for="sides"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Sides</label
                    >
                    <select
                        id="sides"
                        bind:value={numSides}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-2 text-center focus:outline-none focus:border-[var(--tavern-accent-gold)] appearance-none cursor-pointer"
                    >
                        <option value={4}>4</option>
                        <option value={6}>6</option>
                        <option value={8}>8</option>
                        <option value={10}>10</option>
                        <option value={12}>12</option>
                        <option value={20}>20</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                <span
                    class="text-xl font-serif text-[var(--tavern-accent-gold)] mb-1.5"
                    >+</span
                >
                <div class="flex flex-col gap-1 w-20">
                    <label
                        for="mod"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Bonus</label
                    >
                    <input
                        id="mod"
                        type="number"
                        bind:value={modifier}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1.5 text-center focus:outline-none focus:border-[var(--tavern-accent-gold)]"
                    />
                </div>

                <button
                    onclick={handleRoll}
                    class="ml-auto bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white px-6 py-2 rounded transition-colors shadow-lg font-medium tracking-wide border border-[var(--tavern-accent-red)]"
                    >CAST</button
                >
            </div>

            <div
                class="bg-[var(--tavern-bg-base)] rounded-lg p-6 flex flex-col items-center justify-center min-h-[120px] border border-[var(--tavern-accent-gold)]/10 relative overflow-hidden"
            >
                {#if lastRoll}
                    <div
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/30 absolute top-2 left-3"
                    >
                        Result
                    </div>

                    <div
                        class="text-6xl font-serif text-[var(--tavern-accent-gold)] font-bold drop-shadow-[0_0_15px_rgba(198,162,91,0.2)]"
                    >
                        {lastRoll.total}
                    </div>

                    {#if numDice > 1 || modifier !== 0}
                        <div
                            class="text-xs text-[var(--tavern-text-main)]/40 mt-2 font-mono"
                        >
                            [{lastRoll.rolls.join(" + ")}] {modifier !== 0
                                ? modifier > 0
                                    ? `+ ${modifier}`
                                    : `- ${Math.abs(modifier)}`
                                : ""}
                        </div>
                    {/if}
                {:else}
                    <div
                        class="text-[var(--tavern-text-main)]/20 italic text-sm"
                    >
                        Waiting for the cast...
                    </div>
                {/if}
            </div>
        </section>

        <!-- Plot Hooks / Generators -->
        <section
            class="bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg p-5 flex flex-col min-h-0"
        >
            <h2
                class="font-serif text-[var(--tavern-accent-gold)] text-xl border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-4"
            >
                Sparks of Creation
            </h2>

            <div class="flex gap-2 mb-4 flex-wrap">
                <select
                    bind:value={genType}
                    class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--tavern-accent-gold)] cursor-pointer flex-1"
                >
                    <option value="npc">Random NPC</option>
                    <option value="tavern">Random Tavern</option>
                    <option value="loot_low">Loot Cache (Low Tier)</option>
                    <option value="loot_med">Loot Cache (Medium Tier)</option>
                    <option value="loot_high">Loot Hoard (High Tier)</option>
                    <option value="campfire">Campfire RP Prompts</option>
                </select>

                <button
                    onclick={handleGenerate}
                    class="bg-[var(--tavern-bg-panel)] hover:bg-[var(--tavern-bg-base)] text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-gold)]/50 px-4 py-2 rounded transition-colors text-sm font-medium"
                    >Generate</button
                >
            </div>

            <div
                class="flex-1 overflow-y-auto bg-[var(--tavern-bg-base)] p-5 rounded-lg border border-[var(--tavern-accent-gold)]/10 font-sans text-[var(--tavern-text-main)]/80 text-sm leading-relaxed"
            >
                {#if generatedContent}
                    {@html generatedContent}
                {:else}
                    <div
                        class="h-full flex items-center justify-center text-[var(--tavern-text-main)]/20 italic text-center"
                    >
                        Select a category and generate <br />to conjure
                        inspiration.
                    </div>
                {/if}
            </div>

            <!-- Placeholder for pure text export button if needed later -->
        </section>

        <!-- Target CR Finder -->
        <section
            class="bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg p-5 flex flex-col shrink-0"
        >
            <h2
                class="font-serif text-[var(--tavern-accent-gold)] text-xl border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-4"
            >
                🎯 Target CR Finder
            </h2>
            <div class="flex items-end gap-3 mb-4">
                <div class="flex flex-col gap-1 w-24">
                    <label
                        for="partySize"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Party Size</label
                    >
                    <input
                        id="partySize"
                        type="number"
                        min="1"
                        max="10"
                        bind:value={partySize}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1.5 text-center focus:outline-none focus:border-[var(--tavern-accent-gold)]"
                    />
                </div>
                <span
                    class="text-xl font-serif text-[var(--tavern-accent-gold)] mb-1.5 font-bold"
                    >@</span
                >
                <div class="flex flex-col gap-1 w-24">
                    <label
                        for="avgLevel"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Avg Level</label
                    >
                    <input
                        id="avgLevel"
                        type="number"
                        min="1"
                        max="20"
                        bind:value={avgLevel}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1.5 text-center focus:outline-none focus:border-[var(--tavern-accent-gold)]"
                    />
                </div>
            </div>

            <div
                class="bg-[var(--tavern-bg-base)] p-4 rounded border border-[var(--tavern-accent-gold)]/10 text-sm"
            >
                <div
                    class="flex justify-between border-b border-[var(--tavern-accent-gold)]/10 pb-2 mb-2 font-bold text-[var(--tavern-text-main)]"
                >
                    <span>Daily XP Budget</span>
                    <span class="text-[var(--tavern-accent-gold)]"
                        >{encounterBudget.daily} XP</span
                    >
                </div>
                <div class="grid grid-cols-2 gap-2 mt-3">
                    <div class="text-[0.8rem] flex justify-between space-x-2">
                        <span class="text-emerald-400 opacity-80">Easy:</span>
                        <span>{encounterBudget.easy} XP</span>
                    </div>
                    <div class="text-[0.8rem] flex justify-between space-x-2">
                        <span class="text-blue-400 opacity-80">Medium:</span>
                        <span>{encounterBudget.medium} XP</span>
                    </div>
                    <div class="text-[0.8rem] flex justify-between space-x-2">
                        <span class="text-amber-500 opacity-80">Hard:</span>
                        <span>{encounterBudget.hard} XP</span>
                    </div>
                    <div class="text-[0.8rem] flex justify-between space-x-2">
                        <span class="text-[var(--tavern-accent-red)] font-bold"
                            >Deadly:</span
                        > <span>{encounterBudget.deadly} XP</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Arcane Appraiser -->
        <section
            class="bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg p-5 flex flex-col shrink-0"
        >
            <h2
                class="font-serif text-[var(--tavern-accent-gold)] text-xl border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-4"
            >
                ⚖️ Arcane Appraiser
            </h2>
            <div class="flex items-end gap-3 mb-4">
                <div class="flex flex-col gap-1 flex-1">
                    <label
                        for="itemRarity"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Item Rarity</label
                    >
                    <select
                        id="itemRarity"
                        bind:value={rarity}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-2 text-sm focus:outline-none focus:border-[var(--tavern-accent-gold)]"
                    >
                        <option value="common">Common</option>
                        <option value="uncommon">Uncommon</option>
                        <option value="rare">Rare</option>
                        <option value="very rare">Very Rare</option>
                        <option value="legendary">Legendary</option>
                    </select>
                </div>
                <div class="flex items-center gap-2 mb-2 mr-2">
                    <input
                        type="checkbox"
                        id="consumable"
                        bind:checked={isConsumable}
                        class="accent-[var(--tavern-accent-gold)] w-4 h-4 cursor-pointer"
                    />
                    <label
                        for="consumable"
                        class="text-sm cursor-pointer select-none text-[var(--tavern-text-main)]/80"
                        >Consumable?</label
                    >
                </div>
            </div>

            <div
                class="bg-[var(--tavern-bg-base)] p-4 rounded border border-[var(--tavern-accent-gold)]/10 text-sm"
            >
                <div
                    class="flex justify-between border-b border-[var(--tavern-accent-gold)]/10 pb-2 mb-2"
                >
                    <span class="text-[var(--tavern-text-main)]/60"
                        >Estimated Value</span
                    >
                    <span
                        class="text-[var(--tavern-accent-gold)] font-bold text-base"
                        >{magicItemData.min.toLocaleString()} - {magicItemData.max.toLocaleString()}
                        GP</span
                    >
                </div>
                <div
                    class="text-[0.75rem] text-[var(--tavern-text-main)]/50 mt-2 space-y-1"
                >
                    <p>
                        <strong class="text-[var(--tavern-text-main)]/70"
                            >Crafting Time:</strong
                        >
                        {magicItemData.craftWait.replace(
                            "var(--tavern-text-main)s",
                            "workweeks",
                        )} ({magicItemData.craftGold} GP)
                    </p>
                    <p>
                        <strong class="text-[var(--tavern-text-main)]/70"
                            >Crafting Quest:</strong
                        >
                        Encounter CR {magicItemData.encounterCr} required.
                    </p>
                </div>
            </div>
        </section>

        <!-- Coin Splitter -->
        <section
            class="bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg p-5 flex flex-col shrink-0"
        >
            <h2
                class="font-serif text-[var(--tavern-accent-gold)] text-xl border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-4"
            >
                💰 Coin Splitter
            </h2>
            <div class="flex items-start gap-3 mb-4 flex-col lg:flex-row">
                <div class="flex flex-col gap-1 w-full lg:flex-1">
                    <label
                        for="rawCoins"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Loot Pouch (e.g. 150gp, 12sp)</label
                    >
                    <input
                        id="rawCoins"
                        type="text"
                        bind:value={rawCoins}
                        placeholder="100gp 50sp"
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--tavern-accent-gold)] w-full"
                    />
                </div>
                <div class="flex flex-col gap-1 w-24 shrink-0">
                    <label
                        for="coinPartySize"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Party Size</label
                    >
                    <input
                        id="coinPartySize"
                        type="number"
                        min="1"
                        bind:value={coinPartySize}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-2 text-center text-sm focus:outline-none focus:border-[var(--tavern-accent-gold)] w-full"
                    />
                </div>
            </div>

            <div
                class="bg-[var(--tavern-bg-base)] p-4 rounded border border-[var(--tavern-accent-gold)]/10 text-sm mt-auto"
            >
                {#if coinSplitResult}
                    <div
                        class="flex justify-between border-b border-[var(--tavern-accent-gold)]/10 pb-2 mb-2"
                    >
                        <span class="text-[var(--tavern-text-main)]/60"
                            >Per Player:</span
                        >
                        <span class="text-[var(--tavern-accent-gold)] font-bold"
                            >{formatCoinObj(coinSplitResult.perPlayer)}</span
                        >
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[var(--tavern-text-main)]/40 text-xs"
                            >Remainder (Group Fund):</span
                        >
                        <span
                            class="text-[var(--tavern-text-main)]/60 text-xs font-mono"
                            >{formatCoinObj(coinSplitResult.remainder)}</span
                        >
                    </div>
                {:else}
                    <div
                        class="text-[var(--tavern-text-main)]/20 italic text-center text-xs py-2"
                    >
                        Enter coin amounts to divide the spoils.
                    </div>
                {/if}
            </div>
        </section>

        <!-- Journey Calculator -->
        <section
            class="bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg p-5 flex flex-col shrink-0 h-min"
        >
            <h2
                class="font-serif text-[var(--tavern-accent-gold)] text-xl border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-4"
            >
                🧭 Journey Calculator
            </h2>

            <div class="flex items-end gap-3 mb-4 flex-wrap">
                <div class="flex flex-col gap-1 w-24">
                    <label
                        for="journeyMiles"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Total Miles</label
                    >
                    <input
                        id="journeyMiles"
                        type="number"
                        min="0"
                        bind:value={journeyMiles}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1.5 text-center focus:outline-none focus:border-[var(--tavern-accent-gold)]"
                    />
                </div>
                <div class="flex flex-col gap-1 flex-1 min-w-[100px]">
                    <label
                        for="journeyPace"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Travel Pace</label
                    >
                    <select
                        id="journeyPace"
                        bind:value={journeyPace}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-2 text-sm focus:outline-none focus:border-[var(--tavern-accent-gold)] cursor-pointer"
                    >
                        <option value="fast">Fast (30m/day)</option>
                        <option value="normal">Normal (24m/day)</option>
                        <option value="slow">Slow (18m/day)</option>
                    </select>
                </div>
                <button
                    onclick={calculateJourney}
                    disabled={journeyMiles <= 0}
                    class="bg-[var(--tavern-accent-red)]/20 hover:bg-[var(--tavern-accent-red)]/40 text-[var(--tavern-accent-red)] border border-[var(--tavern-accent-red)]/50 px-4 py-1.5 rounded transition-colors text-sm font-medium tracking-wide disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
                    >Embark</button
                >
            </div>

            <div
                class="bg-[var(--tavern-bg-base)] p-4 rounded border border-[var(--tavern-accent-gold)]/10 text-sm mt-auto relative overflow-hidden"
            >
                {#if journeyCalculated}
                    <div
                        class="flex justify-between border-b border-[var(--tavern-accent-gold)]/10 pb-2 mb-2"
                    >
                        <span class="text-[var(--tavern-text-main)]/60"
                            >Estimated Travel Time</span
                        >
                        <span class="text-[var(--tavern-accent-gold)] font-bold"
                            >{journeyCalculated.days} Day{journeyCalculated.days !==
                            1
                                ? "s"
                                : ""}</span
                        >
                    </div>
                    <div class="flex justify-between items-center text-xs mt-3">
                        <span
                            class="text-[var(--tavern-text-main)]/40 uppercase tracking-widest"
                            >Weather Event</span
                        >
                        <span
                            class="bg-[var(--tavern-bg-panel)] px-2 py-1 rounded text-[var(--tavern-accent-gold)]/80 border border-[var(--tavern-accent-gold)]/10"
                            >{journeyCalculated.weather}</span
                        >
                    </div>
                {:else}
                    <div
                        class="text-[var(--tavern-text-main)]/20 italic text-center text-xs py-2"
                    >
                        Chart a course to see estimated travel time.
                    </div>
                {/if}
            </div>
        </section>
    </div>
</div>
