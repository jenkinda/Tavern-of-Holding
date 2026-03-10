<script lang="ts">
    import { onMount } from "svelte";
    import { campaignStore } from "../../modules/campaigns/stores";
    import {
        getCanonForCampaign,
        saveCanonEntry,
        deleteCanonEntry,
        getRulingsForCampaign,
        saveRuling,
        deleteRuling,
    } from "../../core/storage/db";
    import type { CanonEntry, Ruling } from "../../types/models";
    import { analyzeNameCollisions } from "../../core/utils/soundex";

    let activeTab: "canon" | "rulings" = $state("canon");

    // Canon State
    let canonEntries: CanonEntry[] = $state([]);
    let newCanonName = $state("");
    let newCanonCategory: CanonEntry["category"] = $state("npc");
    let newCanonDesc = $state("");

    // Rulings State
    let rulings: Ruling[] = $state([]);
    let newQuery = $state("");
    let newRulingText = $state("");
    let newWeight = $state(3);
    let newTags = $state("");

    let searchQuery = $state("");

    onMount(async () => {
        if ($campaignStore.activeCampaignId) {
            await loadData();
        }
    });

    // Reactive campaign change reload
    $effect(() => {
        if ($campaignStore.activeCampaignId) {
            loadData();
        } else {
            canonEntries = [];
            rulings = [];
        }
    });

    async function loadData() {
        const cid = $campaignStore.activeCampaignId;
        if (!cid) return;
        canonEntries = await getCanonForCampaign(cid);
        rulings = await getRulingsForCampaign(cid);
    }

    // --- Canon Logic ---
    let nameWarnings = $derived(
        analyzeNameCollisions(
            newCanonName,
            canonEntries.map((e) => e.name),
        ),
    );

    let filteredCanon = $derived(
        canonEntries.filter((e) =>
            e.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    );

    async function handleSaveCanon() {
        const cid = $campaignStore.activeCampaignId;
        if (!cid || !newCanonName.trim()) return;

        const entry: CanonEntry = {
            id: crypto.randomUUID(),
            campaignId: cid,
            name: newCanonName.trim(),
            category: newCanonCategory,
            description: newCanonDesc.trim(),
            traits: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await saveCanonEntry(entry);
        canonEntries = [...canonEntries, entry];

        // Reset form
        newCanonName = "";
        newCanonDesc = "";
    }

    async function handleDeleteCanon(id: string) {
        if (confirm("Delete this Canon entry?")) {
            await deleteCanonEntry(id);
            canonEntries = canonEntries.filter((c) => c.id !== id);
        }
    }

    // --- Rulings Logic ---
    let filteredRulings = $derived(
        rulings.filter(
            (r) =>
                r.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.tags.some((t) =>
                    t.toLowerCase().includes(searchQuery.toLowerCase()),
                ),
        ),
    );

    async function handleSaveRuling() {
        const cid = $campaignStore.activeCampaignId;
        if (!cid || !newQuery.trim() || !newRulingText.trim()) return;

        const tagsArray = newTags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 0);

        const ruling: Ruling = {
            id: crypto.randomUUID(),
            campaignId: cid,
            query: newQuery.trim(),
            ruling: newRulingText.trim(),
            tags: tagsArray,
            precedentWeight: newWeight,
            createdAt: Date.now(),
        };

        await saveRuling(ruling);
        rulings = [...rulings, ruling];

        newQuery = "";
        newRulingText = "";
        newTags = "";
        newWeight = 3;
    }

    async function handleDeleteRuling(id: string) {
        if (confirm("Delete this Ruling?")) {
            await deleteRuling(id);
            rulings = rulings.filter((r) => r.id !== id);
        }
    }
</script>

{#if !$campaignStore.activeCampaignId}
    <div
        class="h-full flex items-center justify-center text-[var(--tavern-text-main)]/50"
    >
        <p>
            You must open a campaign in The Common Room to access The Archive.
        </p>
    </div>
{:else}
    <div class="h-full flex flex-col pt-4">
        <!-- Header & Tabs -->
        <header class="mb-6">
            <h2
                class="text-3xl font-serif text-[var(--tavern-accent-gold)] tracking-wide mb-4"
            >
                The Archive
            </h2>
            <div
                class="flex space-x-4 border-b border-[var(--tavern-accent-gold)]/20 pb-2"
            >
                <button
                    class="px-4 py-2 font-medium transition-colors {activeTab ===
                    'canon'
                        ? 'text-[var(--tavern-accent-gold)] border-b-2 border-[var(--tavern-accent-gold)]'
                        : 'text-[var(--tavern-text-main)]/60 hover:text-[var(--tavern-text-main)]'}"
                    onclick={() => (activeTab = "canon")}
                >
                    Canon Guard
                </button>
                <button
                    class="px-4 py-2 font-medium transition-colors {activeTab ===
                    'rulings'
                        ? 'text-[var(--tavern-accent-gold)] border-b-2 border-[var(--tavern-accent-gold)]'
                        : 'text-[var(--tavern-text-main)]/60 hover:text-[var(--tavern-text-main)]'}"
                    onclick={() => (activeTab = "rulings")}
                >
                    Ruling Registrar
                </button>
            </div>
        </header>

        <div class="flex-1 min-h-0 flex flex-col md:flex-row gap-6">
            <!-- LEFT PANEL: Entry List -->
            <div
                class="w-full md:w-1/2 flex flex-col bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg p-4 overflow-y-auto"
            >
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search {activeTab}..."
                    class="w-full bg-[var(--tavern-bg-base)] text-[var(--tavern-text-main)] border border-[var(--tavern-accent-gold)]/20 rounded p-2 mb-4 focus:outline-none focus:border-[var(--tavern-accent-gold)]/50"
                />

                {#if activeTab === "canon"}
                    <div class="space-y-3">
                        {#each filteredCanon as entry (entry.id)}
                            <div
                                class="bg-[var(--tavern-bg-base)] p-3 rounded border border-transparent hover:border-[var(--tavern-accent-gold)]/20 group relative"
                            >
                                <div class="flex justify-between items-start">
                                    <h4
                                        class="font-serif font-bold text-lg text-[var(--tavern-accent-gold)]"
                                    >
                                        {entry.name}
                                    </h4>
                                    <span
                                        class="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--tavern-bg-panel)] opacity-80"
                                        >{entry.category}</span
                                    >
                                </div>
                                <p
                                    class="text-sm mt-2 opacity-80 whitespace-pre-wrap"
                                >
                                    {entry.description}
                                </p>
                                <button
                                    onclick={() => handleDeleteCanon(entry.id)}
                                    class="absolute top-2 right-2 text-[var(--tavern-accent-red)] opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                        {/each}
                        {#if filteredCanon.length === 0}
                            <p class="text-center text-sm opacity-50 py-4">
                                No canon entries found.
                            </p>
                        {/if}
                    </div>
                {:else}
                    <div class="space-y-4">
                        {#each filteredRulings as rule (rule.id)}
                            <div
                                class="bg-[var(--tavern-bg-base)] p-4 rounded border border-[var(--tavern-accent-gold)]/10 group relative"
                            >
                                <div class="flex gap-2 mb-2 items-center">
                                    <div
                                        class="flex gap-1"
                                        title="Precedent Weight: {rule.precedentWeight}/5"
                                    >
                                        {#each Array(5) as _, i}
                                            <span
                                                class={i < rule.precedentWeight
                                                    ? "text-[var(--tavern-accent-gold)]"
                                                    : "text-gray-500/30"}
                                                >★</span
                                            >
                                        {/each}
                                    </div>
                                    <div class="flex gap-1 ml-auto">
                                        {#each rule.tags as tag}
                                            <span
                                                class="text-[0.6rem] uppercase tracking-wider bg-[var(--tavern-bg-panel)] px-1.5 py-0.5 rounded"
                                                >{tag}</span
                                            >
                                        {/each}
                                    </div>
                                </div>
                                <h4 class="font-medium italic mb-2 opacity-90">
                                    "{rule.query}"
                                </h4>
                                <div
                                    class="w-full h-px bg-[var(--tavern-accent-gold)]/20 mb-2"
                                ></div>
                                <p class="text-sm">➜ {rule.ruling}</p>
                                <button
                                    onclick={() => handleDeleteRuling(rule.id)}
                                    class="absolute top-2 right-2 text-[var(--tavern-accent-red)] opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                        {/each}
                        {#if filteredRulings.length === 0}
                            <p class="text-center text-sm opacity-50 py-4">
                                No rulings logged.
                            </p>
                        {/if}
                    </div>
                {/if}
            </div>

            <!-- RIGHT PANEL: Creation Forms -->
            <div
                class="w-full md:w-1/2 flex flex-col bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg p-6"
            >
                {#if activeTab === "canon"}
                    <h3
                        class="text-xl font-serif text-[var(--tavern-accent-gold)] mb-4 border-b border-[var(--tavern-accent-gold)]/20 pb-2"
                    >
                        Establish Canon
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <label
                                for="entityName"
                                class="block text-sm uppercase tracking-wider opacity-70 mb-1"
                                >Entity Name</label
                            >
                            <input
                                id="entityName"
                                type="text"
                                bind:value={newCanonName}
                                placeholder="e.g. Lord Valerius"
                                class="w-full bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded p-2 focus:border-[var(--tavern-accent-gold)] outline-none"
                            />
                        </div>

                        {#if nameWarnings.length > 0}
                            <div
                                class="bg-[var(--tavern-accent-red)]/10 border border-[var(--tavern-accent-red)]/50 rounded p-3 my-2 shadow-inner"
                            >
                                <p
                                    class="text-xs font-bold text-[var(--tavern-accent-red)] uppercase tracking-wider mb-2 flex items-center gap-2"
                                >
                                    <span>⚠️</span> Potential Name Collision
                                </p>
                                <ul class="text-sm space-y-1">
                                    {#each nameWarnings as warn}
                                        <li
                                            class="flex justify-between items-center bg-[var(--tavern-bg-base)]/50 px-2 py-1 rounded"
                                        >
                                            <span class="font-medium"
                                                >{warn.name}</span
                                            >
                                            <span
                                                class="text-xs opacity-80 italic"
                                                >{warn.reason}</span
                                            >
                                        </li>
                                    {/each}
                                </ul>
                                <p class="text-xs mt-2 opacity-70">
                                    Soundex & Levenshtein matching suggests this
                                    name sounds very similar to an existing
                                    entry. Are you sure you want to use it?
                                </p>
                            </div>
                        {/if}

                        <div>
                            <label
                                for="categoryName"
                                class="block text-sm uppercase tracking-wider opacity-70 mb-1"
                                >Category</label
                            >
                            <select
                                id="categoryName"
                                bind:value={newCanonCategory}
                                class="w-full bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded p-2 focus:border-[var(--tavern-accent-gold)] outline-none"
                            >
                                <option value="npc">NPC</option>
                                <option value="location">Location</option>
                                <option value="faction">Faction</option>
                                <option value="item">Key Item</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label
                                for="descLore"
                                class="block text-sm uppercase tracking-wider opacity-70 mb-1"
                                >Description & Lore</label
                            >
                            <textarea
                                id="descLore"
                                bind:value={newCanonDesc}
                                rows="5"
                                placeholder="Background, motives, or important details..."
                                class="w-full bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded p-2 focus:border-[var(--tavern-accent-gold)] outline-none resize-none"
                            ></textarea>
                        </div>

                        <button
                            onclick={handleSaveCanon}
                            disabled={!newCanonName.trim()}
                            class="w-full mt-4 py-3 rounded uppercase tracking-wider font-bold transition-all disabled:opacity-50
                                   {nameWarnings.length > 0
                                ? 'bg-[var(--tavern-accent-red)] text-white hover:bg-red-700 hover:shadow-[0_0_15px_var(--tavern-accent-red)]'
                                : 'bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)] hover:bg-[var(--tavern-accent-gold)]/30 border border-[var(--tavern-accent-gold)]/50'}"
                        >
                            {nameWarnings.length > 0
                                ? "Ignore Warning & Save"
                                : "Seal into Canon"}
                        </button>
                    </div>
                {:else}
                    <h3
                        class="text-xl font-serif text-[var(--tavern-accent-gold)] mb-4 border-b border-[var(--tavern-accent-gold)]/20 pb-2"
                    >
                        Log a Ruling
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <label
                                for="playerQuery"
                                class="block text-sm uppercase tracking-wider opacity-70 mb-1"
                                >Player Query / Scenario</label
                            >
                            <input
                                id="playerQuery"
                                type="text"
                                bind:value={newQuery}
                                placeholder="e.g. 'Can I cast Mage Hand to pull the lever?'"
                                class="w-full bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded p-2 focus:border-[var(--tavern-accent-gold)] outline-none italic"
                            />
                        </div>

                        <div>
                            <label
                                for="rulingAns"
                                class="block text-sm uppercase tracking-wider opacity-70 mb-1"
                                >Your Ruling</label
                            >
                            <textarea
                                id="rulingAns"
                                bind:value={newRulingText}
                                rows="3"
                                placeholder="e.g. 'Yes, but pulling a heavy lever requires an Athletics check from the hand.'"
                                class="w-full bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded p-2 focus:border-[var(--tavern-accent-gold)] outline-none resize-none font-medium"
                            ></textarea>
                        </div>

                        <div class="flex gap-4">
                            <div class="flex-1">
                                <label
                                    for="tagsInput"
                                    class="block text-sm uppercase tracking-wider opacity-70 mb-1"
                                    >Tags (comma separated)</label
                                >
                                <input
                                    id="tagsInput"
                                    type="text"
                                    bind:value={newTags}
                                    placeholder="spells, combat, environment..."
                                    class="w-full bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded p-2 focus:border-[var(--tavern-accent-gold)] outline-none text-sm"
                                />
                            </div>
                            <div class="w-32">
                                <label
                                    for="precedentWeight"
                                    class="block text-sm uppercase tracking-wider opacity-70 mb-1"
                                    title="1=minor, 5=core rule shift"
                                    >Precedent (1-5)</label
                                >
                                <input
                                    id="precedentWeight"
                                    type="number"
                                    min="1"
                                    max="5"
                                    bind:value={newWeight}
                                    class="w-full bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded p-2 focus:border-[var(--tavern-accent-gold)] outline-none text-center"
                                />
                            </div>
                        </div>

                        <div class="text-xs opacity-60 text-center italic py-2">
                            Weight {newWeight}: {newWeight <= 2
                                ? "Minor situation"
                                : newWeight === 3
                                  ? "Standard precedent"
                                  : "Major mechanical shift"}
                        </div>

                        <button
                            onclick={handleSaveRuling}
                            disabled={!newQuery.trim() || !newRulingText.trim()}
                            class="w-full mt-4 py-3 rounded uppercase tracking-wider font-bold transition-all disabled:opacity-50 bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)] hover:bg-[var(--tavern-accent-gold)]/30 border border-[var(--tavern-accent-gold)]/50"
                        >
                            Log Decision
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
