<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
        getThreadsForCampaign,
        saveThread,
        deleteThread,
        getClocksForCampaign,
        saveClock,
        deleteClock,
    } from "../../core/storage/db";
    import { campaignStore } from "../campaigns/stores";
    import type { Thread, VillainClock, UUID } from "../../types/models";

    // Modals & State
    let showThreadModal = $state(false);
    let editingThread = $state<Thread | null>(null);

    // Form bind
    let threadTitle = $state("");
    let threadDesc = $state("");
    let threadUrgency = $state(1);
    let threadCat = $state<Thread["category"]>("quest");

    let clockTitle = $state("");
    let clockMax = $state(4);
    let clockTriggers = $state("");

    let showClockModal = $state(false);
    let editingClock = $state<VillainClock | null>(null);

    // Data Stores
    let threads = $state<Thread[]>([]);
    let clocks = $state<VillainClock[]>([]);

    let unsubscribe: () => void;

    async function loadData(cid: string) {
        if (!cid) return;
        threads = await getThreadsForCampaign(cid);
        clocks = await getClocksForCampaign(cid);
    }

    onMount(() => {
        unsubscribe = campaignStore.subscribe((state) => {
            if (state.activeCampaignId) loadData(state.activeCampaignId);
        });
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    // Calculate Global Pressure (0-100)
    const pressureLevel = $derived(() => {
        if (threads.length === 0 && clocks.length === 0) return 0;

        const activeThreads = threads.filter(
            (t) => t.status === "active" || t.status === "escalating",
        );
        const avgAge = activeThreads.length
            ? activeThreads.reduce((s, t) => s + t.sessionsOpen, 0) /
              activeThreads.length
            : 0;
        const avgUrg = activeThreads.length
            ? activeThreads.reduce((s, t) => s + t.urgency, 0) /
              activeThreads.length
            : 0;
        const clockPressure = clocks.length
            ? clocks.reduce((s, c) => s + c.progress / c.max, 0) / clocks.length
            : 0;

        // Weighted formula
        const raw = (avgAge * 0.2 + avgUrg * 0.4 + clockPressure * 0.4) * 20;
        return Math.min(Math.round(raw), 100);
    });

    // Sub-actions
    function openAddThread() {
        editingThread = null;
        threadTitle = "";
        threadDesc = "";
        threadUrgency = 1;
        threadCat = "quest";
        showThreadModal = true;
    }

    function editThread(t: Thread) {
        editingThread = t;
        threadTitle = t.title;
        threadDesc = t.description || "";
        threadUrgency = t.urgency;
        threadCat = t.category;
        showThreadModal = true;
    }

    async function handleSaveThread() {
        const cid = $campaignStore.activeCampaignId;
        if (!cid) return;

        let target: Thread;
        if (editingThread) {
            target = {
                ...editingThread,
                title: threadTitle,
                description: threadDesc,
                urgency: threadUrgency,
                category: threadCat,
            };
        } else {
            target = {
                id: crypto.randomUUID(),
                campaignId: cid,
                title: threadTitle,
                description: threadDesc,
                category: threadCat,
                urgency: threadUrgency,
                escalationLevel: 0,
                sessionsOpen: 0,
                status: "active",
                notesLog: [],
                createdAt: Date.now(),
                createdSession: 1, // TODO: Should hook into session counter
            };
        }
        await saveThread($state.snapshot(target));
        await loadData(cid);
        showThreadModal = false;
    }

    async function handleAdvanceAge(t: Thread) {
        const target = { ...t, sessionsOpen: t.sessionsOpen + 1 };
        await saveThread($state.snapshot(target));
        if ($campaignStore.activeCampaignId)
            await loadData($campaignStore.activeCampaignId);
    }

    async function handleDeleteThread(t: Thread) {
        if (!confirm(`Permanently unravel the thread "${t.title}"?`)) return;
        await deleteThread(t.id);
        if ($campaignStore.activeCampaignId)
            await loadData($campaignStore.activeCampaignId);
    }

    async function toggleSchedule(t: Thread) {
        const scheduled = threads.filter((x) => x.status === "scheduled");
        let newStatus = t.status;
        if (t.status !== "scheduled") {
            if (scheduled.length >= 3) {
                alert("You can only schedule 3 threads simultaneously!");
                return;
            }
            newStatus = "scheduled";
        } else {
            newStatus = "active";
        }
        await saveThread($state.snapshot({ ...t, status: newStatus as any }));
        if ($campaignStore.activeCampaignId)
            await loadData($campaignStore.activeCampaignId);
    }

    // CLOCKS
    function openAddClock() {
        editingClock = null;
        clockTitle = "";
        clockMax = 4;
        clockTriggers = "";
        showClockModal = true;
    }

    function editClock(c: VillainClock) {
        editingClock = c;
        clockTitle = c.title;
        clockMax = c.max;
        clockTriggers = c.triggers;
        showClockModal = true;
    }

    async function handleSaveClock() {
        const cid = $campaignStore.activeCampaignId;
        if (!cid) return;
        const target: VillainClock = editingClock
            ? {
                  ...editingClock,
                  title: clockTitle,
                  max: clockMax,
                  triggers: clockTriggers,
              }
            : {
                  id: crypto.randomUUID(),
                  campaignId: cid,
                  title: clockTitle,
                  progress: 0,
                  max: clockMax,
                  triggers: clockTriggers,
                  category: "threat",
                  createdAt: Date.now(),
              };

        await saveClock($state.snapshot(target));
        await loadData(cid);
        showClockModal = false;
    }

    async function handleAdvanceClock(c: VillainClock, amnt: number) {
        let n = c.progress + amnt;
        if (n < 0) n = 0;
        if (n > c.max) n = c.max;
        await saveClock($state.snapshot({ ...c, progress: n }));
        if ($campaignStore.activeCampaignId)
            await loadData($campaignStore.activeCampaignId);
    }

    async function handleDeleteClock(c: VillainClock) {
        if (!confirm(`Destroy clock "${c.title}"?`)) return;
        await deleteClock(c.id);
        if ($campaignStore.activeCampaignId)
            await loadData($campaignStore.activeCampaignId);
    }
</script>

<div class="h-full flex flex-col space-y-6">
    <div class="flex justify-between items-center">
        <div>
            <h2 class="text-3xl font-serif text-[var(--tavern-accent-gold)]">
                The Loom
            </h2>
            <p class="text-[var(--tavern-text-main)]/60 text-sm mt-1">
                Narrative Pressure & Thread Tracker
            </p>
        </div>

        <div
            class="flex gap-4 items-center bg-[var(--tavern-bg-panel)] p-4 rounded-xl shadow-lg border border-[var(--tavern-accent-gold)]/20"
        >
            <div
                class="flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 {pressureLevel() >
                75
                    ? 'border-[var(--tavern-accent-red)]'
                    : pressureLevel() > 40
                      ? 'border-[var(--tavern-accent-gold)]'
                      : 'border-green-600/50'}"
            >
                <span
                    class="text-3xl font-bold {pressureLevel() > 75
                        ? 'text-[var(--tavern-accent-red)]'
                        : 'text-[var(--tavern-text-main)]'}"
                    >{pressureLevel()}</span
                >
            </div>
            <div class="flex flex-col">
                <span
                    class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                    >Global Pressure</span
                >
                <span
                    class="text-sm {pressureLevel() > 75
                        ? 'text-[var(--tavern-accent-red)] font-bold'
                        : ''}"
                >
                    {pressureLevel() > 75
                        ? "Critical Tension"
                        : pressureLevel() > 40
                          ? "Rising Action"
                          : "Simmering"}
                </span>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        <!-- Threads Column -->
        <div
            class="lg:col-span-2 flex flex-col space-y-4 bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 p-4 h-full"
        >
            <div class="flex justify-between items-center">
                <h3 class="text-xl font-serif text-[var(--tavern-text-main)]">
                    Loose Threads
                </h3>
                <button
                    onclick={openAddThread}
                    class="bg-[var(--tavern-accent-red)]/20 text-[var(--tavern-text-main)] px-3 py-1 rounded hover:bg-[var(--tavern-accent-red)]/40 transition-colors border border-[var(--tavern-accent-red)]/50 text-sm"
                >
                    + Add Thread
                </button>
            </div>

            <div class="flex-1 overflow-y-auto pr-2 space-y-3">
                {#if threads.length === 0}
                    <div
                        class="flex flex-col items-center justify-center h-48 opacity-50 border-2 border-dashed border-[var(--tavern-accent-gold)]/20 rounded-xl"
                    >
                        <span class="text-4xl mb-2">🧵</span>
                        <p>No loose threads woven into the Loom yet.</p>
                    </div>
                {:else}
                    {#each threads as thread}
                        <!-- Mock Thread Card -->
                        <div
                            class="bg-[var(--tavern-bg-base)] p-3 rounded-lg border border-[var(--tavern-accent-gold)]/20 shadow-sm border-l-4 {thread.urgency >=
                            4
                                ? 'border-l-[var(--tavern-accent-red)]'
                                : 'border-l-[var(--tavern-accent-gold)]'}"
                        >
                            <div class="flex justify-between">
                                <button
                                    class="font-bold text-lg cursor-pointer hover:underline text-left block w-full"
                                    onclick={() => editThread(thread)}
                                >
                                    {thread.title}
                                </button>
                                <div class="flex gap-2 text-xs">
                                    <button
                                        onclick={() => toggleSchedule(thread)}
                                        class="opacity-50 hover:opacity-100 px-1 border border-transparent hover:border-{thread.status ===
                                        'scheduled'
                                            ? 'blue'
                                            : 'blue'}-500/30 rounded"
                                        title={thread.status === "scheduled"
                                            ? "Unschedule"
                                            : "Schedule for next session"}
                                    >
                                        {thread.status === "scheduled"
                                            ? "📌 Unpin"
                                            : "📌 Pin"}
                                    </button>
                                    <button
                                        onclick={() => handleAdvanceAge(thread)}
                                        class="opacity-50 hover:opacity-100 px-1 border border-transparent hover:border-[var(--tavern-text-main)]/30 rounded"
                                        title="Advance Age (Session passed)"
                                        >+1 Age</button
                                    >
                                    <button
                                        onclick={() =>
                                            handleDeleteThread(thread)}
                                        class="opacity-50 hover:opacity-100 text-[var(--tavern-accent-red)] px-1 border border-transparent hover:border-[var(--tavern-accent-red)]/30 rounded"
                                        title="Delete thread">x</button
                                    >
                                </div>
                            </div>
                            <div class="flex gap-2 mt-1">
                                <span
                                    class="px-2 py-0.5 rounded text-xs bg-[var(--tavern-bg-panel)] uppercase tracking-wider opacity-75"
                                    >{thread.category}</span
                                >
                                <span
                                    class="px-2 py-0.5 rounded text-xs {thread.status ===
                                    'scheduled'
                                        ? 'bg-blue-900/40 text-blue-200 border border-blue-500/30'
                                        : 'bg-purple-900/40 text-purple-200 border border-purple-500/30'} uppercase tracking-wider"
                                    >{thread.status}</span
                                >
                            </div>
                            <p
                                class="text-sm text-[var(--tavern-text-main)]/70 mt-2"
                            >
                                {thread.description}
                            </p>
                            <div
                                class="flex gap-4 mt-3 text-xs text-[var(--tavern-text-main)]/50"
                            >
                                <span
                                    >Sessions Open: <b
                                        class="text-[var(--tavern-text-main)]"
                                        >{thread.sessionsOpen}</b
                                    ></span
                                >
                                <span
                                    >Urgency:
                                    <span class="flex inline-flex gap-0.5 ml-1">
                                        {#each Array(5) as _, i}
                                            <div
                                                class="w-2 h-2 rounded-full {i <
                                                thread.urgency
                                                    ? thread.urgency >= 4
                                                        ? 'bg-[var(--tavern-accent-red)]'
                                                        : 'bg-[var(--tavern-accent-gold)]'
                                                    : 'bg-[var(--tavern-text-main)]/10'}"
                                            ></div>
                                        {/each}
                                    </span>
                                </span>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>

        <!-- Right Column: Schedule & Clocks -->
        <div class="flex flex-col gap-6 h-full overflow-hidden">
            <!-- Rule of Three Scheduler -->
            <div
                class="flex flex-col flex-1 bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 p-4"
            >
                <h3
                    class="text-lg font-serif text-[var(--tavern-text-main)] border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-3"
                >
                    Scheduled (Pick 3)
                </h3>
                <p class="text-xs text-[var(--tavern-text-main)]/60 mb-2">
                    Pin 3 threads to definitively pay off next session.
                </p>
                <div class="flex-1 space-y-2">
                    <!-- Scheduled slots -->
                    {#each Array(3) as _, i}
                        {#if threads.filter((x) => x.status === "scheduled")[i]}
                            {@const t = threads.filter(
                                (x) => x.status === "scheduled",
                            )[i]}
                            <div
                                class="h-16 border border-[var(--tavern-accent-gold)]/40 bg-[var(--tavern-bg-base)] rounded flex flex-col justify-center px-3 text-sm shadow-inner relative group border-l-4 border-l-blue-500/50"
                            >
                                <span class="font-bold truncate text-blue-200"
                                    >{t.title}</span
                                >
                                <span
                                    class="text-xs text-[var(--tavern-text-main)]/50"
                                    >{t.category} (x{t.sessionsOpen})</span
                                >
                                <button
                                    onclick={() => toggleSchedule(t)}
                                    class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-xs text-blue-400 border border-blue-500/30 rounded px-1 hidden md:block"
                                    >Unpin</button
                                >
                            </div>
                        {:else}
                            <div
                                class="h-16 border border-dashed border-[var(--tavern-accent-gold)]/30 rounded flex items-center justify-center text-[var(--tavern-text-main)]/30 text-sm"
                            >
                                Empty Slot
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>

            <!-- Villain Clocks -->
            <div
                class="flex flex-col flex-1 bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 p-4"
            >
                <div
                    class="flex justify-between items-center border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-3"
                >
                    <h3
                        class="text-lg font-serif text-[var(--tavern-text-main)]"
                    >
                        Villain Clocks
                    </h3>
                    <button
                        class="text-xs bg-[var(--tavern-accent-red)]/10 border border-[var(--tavern-accent-red)]/30 px-2 py-0.5 rounded text-[var(--tavern-text-main)]/80 hover:text-[var(--tavern-text-main)] hover:bg-[var(--tavern-accent-red)]/30 transition-colors"
                        onclick={openAddClock}>+ Add Clock</button
                    >
                </div>
                <div class="flex-1 overflow-y-auto space-y-4">
                    {#if clocks.length === 0}
                        <div class="text-center opacity-40 text-sm mt-4">
                            No impending doom.
                        </div>
                    {:else}
                        {#each clocks as clock}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="flex flex-col bg-[var(--tavern-bg-base)] p-3 rounded border border-[var(--tavern-accent-gold)]/10 shadow-sm relative group cursor-pointer hover:border-[var(--tavern-accent-gold)]/30"
                                onclick={() => editClock(clock)}
                            >
                                <div class="flex items-start justify-between">
                                    <div class="flex flex-col flex-1 pr-2">
                                        <span
                                            class="font-bold text-sm text-[var(--tavern-accent-red)]/90"
                                            >{clock.title}</span
                                        >
                                        <span
                                            class="text-xs text-[var(--tavern-text-main)]/50 mt-0.5 leading-tight"
                                            >{clock.triggers}</span
                                        >
                                    </div>
                                    <!-- Clock Pie -->
                                    <div
                                        class="relative w-12 h-12 rounded-full border-2 border-[var(--tavern-accent-gold)]/20 shadow-inner flex items-center justify-center bg-[var(--tavern-bg-panel)] overflow-hidden shrink-0"
                                    >
                                        <div
                                            class="absolute inset-0"
                                            style="background: conic-gradient(var(--tavern-accent-red) {(clock.progress /
                                                clock.max) *
                                                360}deg, transparent 0);"
                                        ></div>
                                        <div
                                            class="absolute inset-1 bg-[var(--tavern-bg-panel)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--tavern-text-main)]/80 {clock.progress >=
                                            clock.max
                                                ? 'text-[var(--tavern-accent-red)] shadow-[0_0_10px_var(--tavern-accent-red)]'
                                                : ''}"
                                        >
                                            {clock.progress}/{clock.max}
                                        </div>
                                    </div>
                                </div>

                                <!-- Hover Actions -->
                                <div
                                    class="hidden group-hover:flex justify-end gap-1 mt-2"
                                >
                                    <button
                                        class="text-xs px-2 py-1 bg-[var(--tavern-bg-panel)] border border-[var(--tavern-accent-gold)]/20 rounded hover:border-[var(--tavern-accent-gold)]"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            handleAdvanceClock(clock, -1);
                                        }}>-1</button
                                    >
                                    <button
                                        class="text-xs px-2 py-1 bg-[var(--tavern-bg-panel)] border border-[var(--tavern-accent-gold)]/20 rounded hover:border-[var(--tavern-accent-gold)]"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            handleAdvanceClock(clock, 1);
                                        }}>+1</button
                                    >
                                    <button
                                        class="text-xs px-2 py-1 bg-[var(--tavern-accent-red)]/10 border border-[var(--tavern-accent-red)]/20 text-[var(--tavern-accent-red)] rounded hover:bg-[var(--tavern-accent-red)]/20 ml-2"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClock(clock);
                                        }}>Del</button
                                    >
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

{#if showThreadModal}
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
        <div
            class="bg-[var(--tavern-bg-panel)] border border-[var(--tavern-accent-gold)]/30 rounded-xl p-6 max-w-lg w-full shadow-2xl"
        >
            <h3
                class="text-2xl font-serif text-[var(--tavern-accent-gold)] mb-4 border-b border-[var(--tavern-accent-gold)]/20 pb-2"
            >
                {editingThread ? "Weave Thread" : "New Loose Thread"}
            </h3>

            <div class="space-y-4">
                <div class="flex flex-col gap-1">
                    <label
                        for="threadTitle"
                        class="text-xs uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                        >Thread Title</label
                    >
                    <input
                        id="threadTitle"
                        type="text"
                        bind:value={threadTitle}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 p-2 rounded focus:outline-none focus:border-[var(--tavern-accent-gold)] text-[var(--tavern-text-main)]"
                        placeholder="e.g. The Cult of the Black Earth..."
                    />
                </div>

                <div class="flex flex-col gap-1">
                    <label
                        for="threadDesc"
                        class="text-xs uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                        >Description</label
                    >
                    <textarea
                        id="threadDesc"
                        bind:value={threadDesc}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 p-2 rounded focus:outline-none focus:border-[var(--tavern-accent-gold)] h-24 text-sm text-[var(--tavern-text-main)]"
                    ></textarea>
                </div>

                <div class="flex gap-4">
                    <div class="flex-1 flex flex-col gap-1">
                        <label
                            for="threadCat"
                            class="text-xs uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                            >Category</label
                        >
                        <select
                            id="threadCat"
                            bind:value={threadCat}
                            class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 p-2 rounded focus:outline-none text-[var(--tavern-text-main)]"
                        >
                            <option value="quest">Quest / Objective</option>
                            <option value="mystery">Unsolved Mystery</option>
                            <option value="npc">NPC Agenda</option>
                            <option value="faction">Faction Move</option>
                            <option value="personal">Character Arc</option>
                            <option value="general">General Hook</option>
                        </select>
                    </div>

                    <div class="flex flex-col gap-1">
                        <label
                            for="threadUrgency"
                            class="text-xs uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                            >Urgency (1-5)</label
                        >
                        <input
                            id="threadUrgency"
                            type="number"
                            min="1"
                            max="5"
                            bind:value={threadUrgency}
                            class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 p-2 rounded focus:outline-none focus:border-[var(--tavern-accent-gold)] w-24 text-[var(--tavern-text-main)] text-center"
                        />
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
                <button
                    class="px-4 py-2 text-[var(--tavern-text-main)]/60 hover:text-[var(--tavern-text-main)]"
                    onclick={() => (showThreadModal = false)}
                >
                    Cancel
                </button>
                <button
                    class="px-4 py-2 bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-text-main)] border border-[var(--tavern-accent-gold)] rounded hover:bg-[var(--tavern-accent-gold)]/30 transition-colors shadow-lg disabled:opacity-50"
                    onclick={handleSaveThread}
                    disabled={!threadTitle.trim()}
                >
                    {editingThread ? "Save Thread" : "Tangle Web"}
                </button>
            </div>
        </div>
    </div>
{/if}

{#if showClockModal}
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
        <div
            class="bg-[var(--tavern-bg-panel)] border border-[var(--tavern-accent-gold)]/30 rounded-xl p-6 max-w-sm w-full shadow-2xl"
        >
            <h3
                class="text-xl font-serif text-[var(--tavern-accent-red)] mb-4 border-b border-[var(--tavern-accent-gold)]/20 pb-2"
            >
                {editingClock ? "Adjust Clock" : "Forge Villain Clock"}
            </h3>

            <div class="space-y-4">
                <div class="flex flex-col gap-1">
                    <label
                        for="clockTitle"
                        class="text-xs uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                        >Clock Name</label
                    >
                    <input
                        id="clockTitle"
                        type="text"
                        bind:value={clockTitle}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 p-2 rounded focus:outline-none focus:border-[var(--tavern-accent-gold)] text-[var(--tavern-text-main)]"
                        placeholder="e.g. Cult summons Meteor..."
                    />
                </div>

                <div class="flex flex-col gap-1">
                    <label
                        for="clockMax"
                        class="text-xs uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                        >Segments (Max)</label
                    >
                    <select
                        id="clockMax"
                        bind:value={clockMax}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 p-2 rounded focus:outline-none text-[var(--tavern-text-main)]"
                    >
                        <option value={4}>4 Segments (Fast)</option>
                        <option value={6}>6 Segments (Standard)</option>
                        <option value={8}>8 Segments (Long)</option>
                        <option value={10}>10 Segments (Epic)</option>
                    </select>
                </div>

                <div class="flex flex-col gap-1">
                    <label
                        for="clockTriggers"
                        class="text-xs uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                        >Advance Triggers</label
                    >
                    <textarea
                        id="clockTriggers"
                        bind:value={clockTriggers}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 p-2 rounded focus:outline-none focus:border-[var(--tavern-accent-gold)] h-16 text-sm text-[var(--tavern-text-main)]"
                        placeholder="e.g. When the PCs ignore the mines..."
                    ></textarea>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
                <button
                    class="px-4 py-2 text-[var(--tavern-text-main)]/60 hover:text-[var(--tavern-text-main)]"
                    onclick={() => (showClockModal = false)}
                >
                    Cancel
                </button>
                <button
                    class="px-4 py-2 bg-[var(--tavern-accent-red)]/20 text-[var(--tavern-text-main)] border border-[var(--tavern-accent-red)] rounded hover:bg-[var(--tavern-accent-red)]/40 transition-colors shadow-lg disabled:opacity-50"
                    onclick={handleSaveClock}
                    disabled={!clockTitle.trim()}
                >
                    {editingClock ? "Update" : "Create"}
                </button>
            </div>
        </div>
    </div>
{/if}
