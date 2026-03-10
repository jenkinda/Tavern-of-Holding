<script lang="ts">
    import { onMount, tick } from "svelte";

    // Player Data Structure
    type Resource = {
        name: string;
        max: number;
        current: number;
        resetOn: "short" | "long";
    };
    type PlayerData = {
        name: string;
        hpMax: number;
        hpCurrent: number;
        ac: number;
        resources: Resource[];
    };

    let data = $state<PlayerData>({
        name: "Unknown Hero",
        hpMax: 10,
        hpCurrent: 10,
        ac: 10,
        resources: [{ name: "Hit Dice", max: 1, current: 1, resetOn: "long" }],
    });

    let showImport = $state(false);
    let importJson = $state("");

    onMount(() => {
        const saved = localStorage.getItem("toh_player_sheet");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.name) data = parsed;
            } catch (e) {
                console.error("Failed to load player sheet", e);
            }
        }
    });

    $effect(() => {
        localStorage.setItem("toh_player_sheet", JSON.stringify(data));
    });

    function handleImport() {
        if (!importJson.trim()) return;
        try {
            const parsed = JSON.parse(importJson);
            const raw = parsed.data || parsed;

            const name = raw.name || "Unknown Hero";
            const hpMax = (raw.baseHitPoints || 10) + (raw.bonusHitPoints || 0);

            let ac = 10;
            if (raw.characterValues) {
                const acVal = raw.characterValues.find(
                    (v: any) => v.typeId === 4,
                );
                if (acVal && acVal.value) ac = acVal.value;
            }

            // Attempt to glean some resources (very rough for MVP)
            let resources: Resource[] = [];
            const level = raw.classes?.[0]?.level || 1;
            resources.push({
                name: "Hit Dice",
                max: level,
                current: level,
                resetOn: "long",
            });

            if (
                raw.classes?.some((c: any) => c.definition?.name === "Fighter")
            ) {
                resources.push({
                    name: "Second Wind",
                    max: 1,
                    current: 1,
                    resetOn: "short",
                });
                resources.push({
                    name: "Action Surge",
                    max: level >= 2 ? 1 : 0,
                    current: level >= 2 ? 1 : 0,
                    resetOn: "short",
                });
            }

            data = {
                name,
                hpMax,
                hpCurrent: hpMax,
                ac,
                resources: resources.filter((r) => r.max > 0),
            };

            importJson = "";
            showImport = false;
        } catch (e) {
            alert(
                "Failed to parse D&D Beyond JSON. Ensure you copied the raw character data correctly.",
            );
        }
    }

    function shortRest() {
        if (
            confirm("Take a Short Rest? This will reset Short Rest resources.")
        ) {
            data.resources = data.resources.map((r) =>
                r.resetOn === "short" ? { ...r, current: r.max } : r,
            );
        }
    }

    function longRest() {
        if (
            confirm(
                "Take a Long Rest? This fully heals you and resets all resources.",
            )
        ) {
            data.hpCurrent = data.hpMax;
            data.resources = data.resources.map((r) => ({
                ...r,
                current: r.max,
            }));
        }
    }

    function addResource() {
        const name = prompt(
            "Resource Name (e.g. Ki Points, Spell Slots 1st Level)",
        );
        if (!name) return;
        const maxStr = prompt(`Maximum Uses for ${name}?`, "1");
        const max = parseInt(maxStr || "1");
        if (isNaN(max) || max <= 0) return;

        const resetStr = prompt(
            "Reset on Short or Long rest? (Type 'short' or 'long')",
            "long",
        );
        const resetOn = resetStr?.toLowerCase() === "short" ? "short" : "long";

        data.resources = [
            ...data.resources,
            { name, max, current: max, resetOn },
        ];
    }

    function removeResource(index: number) {
        data.resources = data.resources.filter((_, i) => i !== index);
    }
</script>

<div
    class="h-full flex flex-col p-4 animate-in fade-in duration-500 max-w-2xl mx-auto w-full"
>
    <!-- Controls -->
    <div
        class="flex justify-between items-center bg-[var(--tavern-bg-panel)] p-4 rounded-xl border border-[var(--tavern-accent-gold)]/20 shadow-lg mb-4"
    >
        <h2 class="text-xl font-serif text-[var(--tavern-accent-gold)]">
            {data.name}
        </h2>
        <div class="flex gap-2">
            <button
                onclick={() => (showImport = !showImport)}
                class="text-xs px-3 py-1.5 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                >Import DDB</button
            >
            <button
                onclick={shortRest}
                class="text-xs px-3 py-1.5 border border-[var(--tavern-accent-gold)]/30 text-[var(--tavern-accent-gold)] hover:bg-[var(--tavern-accent-gold)]/10 rounded transition-colors"
                >Short Rest</button
            >
            <button
                onclick={longRest}
                class="text-xs px-3 py-1.5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                >Long Rest</button
            >
        </div>
    </div>

    {#if showImport}
        <div
            class="bg-[var(--tavern-bg-base)] p-4 rounded-xl border border-blue-500/30 shadow-lg mb-4 animate-in slide-in-from-top-2"
        >
            <h3 class="text-sm font-bold text-blue-400 mb-2">
                D&D Beyond Import
            </h3>
            <p class="text-xs text-[var(--tavern-text-main)]/60 mb-2">
                Paste the raw <code class="bg-black/30 px-1 rounded">/json</code
                >
                payload for your character. (e.g.
                <code
                    >https://character-service.dndbeyond.com/character/v5/character/YOUR_CHAR_ID</code
                >)
            </p>
            <textarea
                bind:value={importJson}
                class="w-full bg-[var(--tavern-bg-panel)] border border-[var(--tavern-accent-gold)]/30 rounded p-2 text-xs font-mono mb-2 h-24 focus:outline-none focus:border-blue-400"
                placeholder="Paste JSON here..."
            ></textarea>
            <div class="flex justify-end gap-2">
                <button
                    onclick={() => (showImport = false)}
                    class="text-xs px-3 py-1 text-[var(--tavern-text-main)]/50 hover:text-[var(--tavern-text-main)]"
                    >Cancel</button
                >
                <button
                    onclick={handleImport}
                    class="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
                    >Parse & Import</button
                >
            </div>
        </div>
    {/if}

    <!-- Sheet Main -->
    <div
        class="bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/20 shadow-lg p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
    >
        <div class="grid grid-cols-2 gap-4 mb-8">
            <div
                class="bg-[var(--tavern-bg-base)] p-4 rounded-lg border border-red-500/20 text-center relative pointer-events-auto"
            >
                <div
                    class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/50 mb-1"
                >
                    Hit Points
                </div>
                <div class="flex items-center justify-center gap-2">
                    <input
                        type="number"
                        bind:value={data.hpCurrent}
                        class="w-16 bg-transparent text-center text-3xl font-bold text-red-400 focus:outline-none"
                    />
                    <span class="text-xl text-[var(--tavern-text-main)]/30"
                        >/</span
                    >
                    <input
                        type="number"
                        bind:value={data.hpMax}
                        class="w-12 bg-transparent text-center text-xl text-[var(--tavern-text-main)] focus:outline-none"
                    />
                </div>
            </div>

            <div
                class="bg-[var(--tavern-bg-base)] p-4 rounded-lg border border-[var(--tavern-accent-gold)]/20 text-center"
            >
                <div
                    class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/50 mb-1"
                >
                    Armor Class
                </div>
                <input
                    type="number"
                    bind:value={data.ac}
                    class="w-full bg-transparent text-center text-3xl font-bold text-[var(--tavern-accent-gold)] focus:outline-none"
                />
            </div>
        </div>

        <div
            class="mb-4 flex justify-between items-end border-b border-[var(--tavern-accent-gold)]/20 pb-2"
        >
            <h3 class="font-serif text-[var(--tavern-accent-gold)] text-lg">
                Resources
            </h3>
            <button
                onclick={addResource}
                class="text-xs text-[var(--tavern-text-main)]/50 hover:text-[var(--tavern-accent-gold)] flex items-center gap-1"
                ><span class="text-base leading-none mb-0.5">+</span> Add Tracker</button
            >
        </div>

        {#if data.resources.length === 0}
            <div
                class="text-center py-6 text-[var(--tavern-text-main)]/30 text-sm italic"
            >
                No resources tracked. Add spell slots, superiority dice, or ki
                points here.
            </div>
        {:else}
            <div class="space-y-3">
                {#each data.resources as res, i}
                    <div
                        class="flex items-center justify-between bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/10 p-3 rounded-lg group"
                    >
                        <div class="flex-1">
                            <div
                                class="text-sm font-medium text-[var(--tavern-text-main)]/90"
                            >
                                {res.name}
                            </div>
                            <div
                                class="text-[0.65rem] text-[var(--tavern-text-main)]/40 uppercase tracking-widest"
                            >
                                Resets on {res.resetOn} rest
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <!-- Clickable Uses -->
                            <div
                                class="flex gap-1 flex-wrap justify-end max-w-[200px]"
                            >
                                {#each Array(res.max) as _, boxIndex}
                                    <button
                                        onclick={() => {
                                            // Toggle usage up to this box
                                            if (
                                                res.current ===
                                                res.max - boxIndex
                                            ) {
                                                // Deselecting the last active one
                                                data.resources[i].current =
                                                    res.max - boxIndex - 1;
                                            } else {
                                                data.resources[i].current =
                                                    res.max - boxIndex;
                                            }
                                        }}
                                        class="w-5 h-5 rounded-sm border transition-colors {boxIndex <
                                        res.max - res.current
                                            ? 'border-[var(--tavern-text-main)]/20 bg-transparent' // Used
                                            : 'border-[var(--tavern-accent-gold)]/50 bg-[var(--tavern-accent-gold)]/30 shadow-[0_0_5px_rgba(198,162,91,0.2)]'}"
                                        title={boxIndex < res.max - res.current
                                            ? "Used"
                                            : "Available"}
                                    ></button>
                                {/each}
                            </div>
                            <button
                                onclick={() => removeResource(i)}
                                class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-1 text-xs"
                                title="Remove Tracker">✕</button
                            >
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
