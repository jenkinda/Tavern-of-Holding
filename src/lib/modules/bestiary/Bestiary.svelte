<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
        bestiaryStore,
        createMonster,
        removeMonster,
        setActiveMonster,
    } from "./stores";
    import Statblock from "./Statblock.svelte";
    import { addCombatant } from "../combat/stores";

    let searchFilter = $state("");

    function handleCreate() {
        createMonster({
            name: "New Monster " + Math.floor(Math.random() * 1000),
        });
    }

    let showImport = $state(false);
    let importText = $state("");

    function handleImport() {
        if (!importText.trim()) return;
        try {
            const parsed = JSON.parse(importText);
            // 5e.tools often puts monsters in an array: { "monster": [ { ... } ] }
            const monsters = parsed.monster
                ? parsed.monster
                : Array.isArray(parsed)
                  ? parsed
                  : [parsed];

            for (const mData of monsters) {
                // Approximate 5e.tools schema mapping
                createMonster({
                    name: mData.name || "Imported Monster",
                    type: mData.type
                        ? typeof mData.type === "string"
                            ? mData.type
                            : mData.type.type
                        : "humanoid",
                    size: mData.size
                        ? mData.size === "M"
                            ? "Medium"
                            : mData.size === "L"
                              ? "Large"
                              : mData.size === "H"
                                ? "Huge"
                                : mData.size === "G"
                                  ? "Gargantuan"
                                  : mData.size === "S"
                                    ? "Small"
                                    : mData.size === "T"
                                      ? "Tiny"
                                      : mData.size
                        : "Medium",
                    alignment: mData.alignment
                        ? mData.alignment.join(" ")
                        : "unaligned",
                    ac: mData.ac
                        ? typeof mData.ac[0] === "number"
                            ? mData.ac[0]
                            : mData.ac[0].ac || 10
                        : 10,
                    hp: mData.hp ? mData.hp.average || 10 : 10,
                    speed: mData.speed
                        ? Object.keys(mData.speed)
                              .map((k) => `${k} ${mData.speed[k]}ft`)
                              .join(", ")
                        : "30 ft",
                    stats: {
                        str: mData.str || 10,
                        dex: mData.dex || 10,
                        con: mData.con || 10,
                        int: mData.int || 10,
                        wis: mData.wis || 10,
                        cha: mData.cha || 10,
                    },
                    cr: mData.cr
                        ? typeof mData.cr === "string"
                            ? mData.cr
                            : mData.cr.cr || "0"
                        : "0",
                    traits: (mData.trait || []).map((t: any) => ({
                        name: t.name,
                        desc: t.entries?.join(" ") || "",
                    })),
                    actions: (mData.action || []).map((t: any) => ({
                        name: t.name,
                        desc: t.entries?.join(" ") || "",
                    })),
                });
            }
            importText = "";
            showImport = false;
        } catch (e) {
            alert(
                "Failed to parse 5e.tools JSON. Ensure you pasted a valid JSON object or array.",
            );
        }
    }

    function sendToFray() {
        const state = $bestiaryStore;
        if (!state.activeMonsterId) return;

        const monster = state.monsters.find(
            (m) => m.id === state.activeMonsterId,
        );
        if (!monster) return;

        addCombatant({
            name: monster.name,
            type: "monster",
            hp: { current: monster.hp, max: monster.hp },
            ac: monster.ac,
            initiative: 0, // Need to roll this generally, or let DM edit
            conditions: [],
            notes: `${monster.size} ${monster.type} | CR: ${monster.cr}`,
        });

        // Small visual feedback logic could go here
        alert(`${monster.name} added to The Fray!`);
    }

    let filteredMonsters = $derived(
        $bestiaryStore.monsters.filter((m) =>
            m.name.toLowerCase().includes(searchFilter.toLowerCase()),
        ),
    );
</script>

<div class="h-full flex gap-4 animate-in fade-in duration-500">
    <!-- Left Column: Monster List -->
    <div
        class="w-1/3 bg-[var(--tavern-bg-panel)] rounded-xl p-4 border border-[var(--tavern-accent-gold)]/20 shadow-lg flex flex-col min-w-[200px]"
    >
        <div
            class="flex justify-between items-center border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-4"
        >
            <h2 class="text-xl font-serif text-[var(--tavern-accent-gold)]">
                Bestiary
            </h2>
            <div class="flex gap-2">
                <button
                    onclick={() => (showImport = !showImport)}
                    class="bg-blue-900/30 text-blue-200 border border-blue-900 hover:bg-blue-800/60 px-3 py-1 text-xs rounded transition-colors"
                >
                    Import
                </button>
                <button
                    onclick={handleCreate}
                    class="bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white px-3 py-1 text-sm rounded transition-colors"
                    title="Create New Monster"
                >
                    + New
                </button>
            </div>
        </div>

        {#if showImport}
            <div
                class="mb-4 animate-in slide-in-from-top-2 border border-blue-900/50 rounded p-2 bg-blue-900/10"
            >
                <p class="text-[0.65rem] text-blue-200/70 mb-2">
                    Paste 5e.tools JSON data to import monsters.
                </p>
                <textarea
                    bind:value={importText}
                    class="w-full h-24 bg-[var(--tavern-bg-base)] border border-blue-900/50 rounded p-1 text-xs font-mono text-blue-100/70 focus:outline-none focus:border-blue-500"
                    placeholder={'{"monster": [ ... ]}'}
                ></textarea>
                <button
                    onclick={handleImport}
                    class="w-full mt-2 bg-blue-900 text-white hover:bg-blue-800 px-2 py-1 rounded text-xs transition-colors"
                    >Import 5e.tools JSON</button
                >
            </div>
        {/if}

        <input
            type="text"
            bind:value={searchFilter}
            placeholder="Search monsters..."
            class="w-full bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-3 py-2 text-sm text-[var(--tavern-text-main)] focus:outline-none focus:border-[var(--tavern-accent-gold)] mb-4 transition-colors"
        />

        <div class="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {#if $bestiaryStore.loading}
                <div
                    class="text-center py-4 text-[var(--tavern-accent-gold)]/50 animate-pulse text-sm"
                >
                    Loading lore...
                </div>
            {:else if filteredMonsters.length === 0}
                <div
                    class="text-center py-4 text-[var(--tavern-text-main)]/40 text-sm italic"
                >
                    No monsters found.
                </div>
            {:else}
                {#each filteredMonsters as monster (monster.id)}
                    <div class="group relative flex items-center">
                        <button
                            class="flex-1 text-left px-3 py-2 text-sm rounded transition-colors border {$bestiaryStore.activeMonsterId ===
                            monster.id
                                ? 'bg-[var(--tavern-bg-base)] border-[var(--tavern-accent-gold)]/40 text-[var(--tavern-accent-gold)] shadow-inner'
                                : 'border-transparent hover:bg-[var(--tavern-bg-base)]/50 text-[var(--tavern-text-main)]/80 hover:text-[var(--tavern-text-main)]'}"
                            onclick={() => setActiveMonster(monster.id)}
                        >
                            <div class="font-medium truncate">
                                {monster.name}
                            </div>
                            <div class="text-[0.65rem] opacity-50 truncate">
                                CR {monster.cr} • {monster.type}
                            </div>
                        </button>
                        <button
                            onclick={() => {
                                if (confirm(`Delete ${monster.name}?`))
                                    removeMonster(monster.id);
                            }}
                            class="absolute right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-1"
                            title="Delete"
                        >
                            ✕
                        </button>
                    </div>
                {/each}
            {/if}
        </div>
    </div>

    <!-- Right Column: Statblock Preview & Tools -->
    <div
        class="flex-1 bg-[var(--tavern-bg-base)] rounded-xl p-4 border border-[var(--tavern-accent-gold)]/10 shadow-inner flex flex-col relative overflow-hidden"
    >
        {#if $bestiaryStore.activeMonsterId}
            {@const activeMonster = $bestiaryStore.monsters.find(
                (m) => m.id === $bestiaryStore.activeMonsterId,
            )}
            {#if activeMonster}
                <!-- Action Bar -->
                <div
                    class="flex justify-end gap-2 mb-4 pb-4 border-b border-[var(--tavern-accent-gold)]/10"
                >
                    <button
                        class="px-4 py-2 bg-transparent border border-[var(--tavern-accent-gold)]/30 text-[var(--tavern-accent-gold)] hover:bg-[var(--tavern-accent-gold)]/10 transition-colors rounded text-sm font-medium"
                        onclick={() =>
                            alert("Editing UI not implemented in MVP hook.")}
                    >
                        Edit Block
                    </button>
                    <button
                        onclick={sendToFray}
                        class="px-4 py-2 bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white rounded text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <span>⚔️</span> Send to Fray
                    </button>
                </div>

                <!-- Centered Statblock renderer -->
                <div
                    class="flex-1 overflow-y-auto flex justify-center items-start pt-4 custom-scrollbar"
                >
                    <Statblock monster={activeMonster} />
                </div>
            {/if}
        {:else}
            <div
                class="absolute inset-0 flex flex-col items-center justify-center text-[var(--tavern-text-main)]/20"
            >
                <span class="text-6xl mb-4 opacity-50">🐉</span>
                <p>Select a creature from the Bestiary to view its stats.</p>
            </div>
        {/if}
    </div>
</div>
