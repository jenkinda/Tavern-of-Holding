<script lang="ts">
    import { onMount, tick } from "svelte";
    import { campaignStore } from "../../modules/campaigns/stores";
    import { dungeonStore, loadDungeonForCampaign } from "./stores";
    import {
        saveDungeonLevel,
        deleteDungeonLevel,
        saveDungeonRoom,
        deleteDungeonRoom,
        savePatrolRoute,
        deletePatrolRoute,
    } from "../../core/storage/db";
    import type {
        DungeonLevel,
        DungeonRoom,
        PatrolRoute,
        RoomStatus,
    } from "../../types/models";

    let selectedTab = $state<"rooms" | "patrols">("rooms");
    let expandedRoomId = $state<string | null>(null);

    // Form inputs for Level
    let showNewLevelForm = $state(false);
    let newLevelName = $state("");
    let newLevelDepth = $state(1);
    let newLevelFaction = $state("");

    // Form inputs for Room
    let showNewRoomForm = $state(false);
    let newRoomName = $state("");

    // Form inputs for Patrol
    let showNewPatrolForm = $state(false);
    let newPatrolName = $state("");
    let newPatrolPath = $state("");
    let newPatrolDesc = $state("");

    onMount(async () => {
        if ($campaignStore.activeCampaignId) {
            await loadDungeonForCampaign($campaignStore.activeCampaignId);
        }
    });

    // Reactive campaign change reload
    $effect(() => {
        if ($campaignStore.activeCampaignId) {
            loadDungeonForCampaign($campaignStore.activeCampaignId);
            showNewLevelForm = false;
            showNewRoomForm = false;
            showNewPatrolForm = false;
        }
    });

    async function handleAddLevel() {
        const cid = $campaignStore.activeCampaignId;
        if (!cid || !newLevelName.trim()) return;

        const level: DungeonLevel = {
            id: crypto.randomUUID(),
            campaignId: cid,
            name: newLevelName.trim(),
            depth: newLevelDepth,
            description: "",
            factionControl: newLevelFaction.trim(),
            createdAt: Date.now(),
        };

        await saveDungeonLevel(level);
        await loadDungeonForCampaign(cid); // Reload

        $dungeonStore.activeLevelId = level.id;

        showNewLevelForm = false;
        newLevelName = "";
        newLevelDepth += 1;
        newLevelFaction = "";
    }

    async function handleDeleteLevel(id: string) {
        if (
            !confirm(
                "Are you sure you want to delete this level and everything in it?",
            )
        )
            return;
        await deleteDungeonLevel(id);
        const cid = $campaignStore.activeCampaignId;
        if (cid) await loadDungeonForCampaign(cid);
    }

    function selectLevel(id: string) {
        $dungeonStore.activeLevelId = id;
        showNewRoomForm = false;
        showNewPatrolForm = false;
    }

    async function handleAddRoom() {
        const cid = $campaignStore.activeCampaignId;
        const lid = $dungeonStore.activeLevelId;
        if (!cid || !lid || !newRoomName.trim()) return;

        const room: DungeonRoom = {
            id: crypto.randomUUID(),
            campaignId: cid,
            levelId: lid,
            name: newRoomName.trim(),
            status: "unexplored",
            description: "",
            occupants: "",
            traps: "",
            createdAt: Date.now(),
        };

        await saveDungeonRoom(room);
        await loadDungeonForCampaign(cid); // Reload to update state
        newRoomName = "";
        showNewRoomForm = false;
        expandedRoomId = room.id; // Auto-expand new room
    }

    async function handleUpdateRoom(room: DungeonRoom) {
        await saveDungeonRoom(room);
        const cid = $campaignStore.activeCampaignId;
        if (cid) await loadDungeonForCampaign(cid);
    }

    async function handleDeleteRoom(id: string) {
        if (!confirm("Destroy this room?")) return;
        await deleteDungeonRoom(id);
        const cid = $campaignStore.activeCampaignId;
        if (cid) await loadDungeonForCampaign(cid);
    }

    function toggleRoom(id: string) {
        expandedRoomId = expandedRoomId === id ? null : id;
    }

    // --- Patrol Logic ---
    async function handleAddPatrol() {
        const cid = $campaignStore.activeCampaignId;
        const lid = $dungeonStore.activeLevelId;
        if (!cid || !lid || !newPatrolName.trim() || !newPatrolPath.trim())
            return;

        const pathArray = newPatrolPath
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (pathArray.length === 0) return;

        const patrol: PatrolRoute = {
            id: crypto.randomUUID(),
            campaignId: cid,
            levelId: lid,
            name: newPatrolName.trim(),
            description: newPatrolDesc.trim(),
            routeInterval: 1,
            currentPositionIndex: 0,
            routePath: pathArray,
            createdAt: Date.now(),
        };

        await savePatrolRoute(patrol);
        await loadDungeonForCampaign(cid);

        newPatrolName = "";
        newPatrolPath = "";
        newPatrolDesc = "";
        showNewPatrolForm = false;
    }

    async function handleDeletePatrol(id: string) {
        if (!confirm("Remove this patrol route?")) return;
        await deletePatrolRoute(id);
        const cid = $campaignStore.activeCampaignId;
        if (cid) await loadDungeonForCampaign(cid);
    }

    async function advancePatrol(patrol: PatrolRoute, step: number) {
        patrol.currentPositionIndex += step;

        // Wrap around logic
        if (patrol.currentPositionIndex >= patrol.routePath.length) {
            patrol.currentPositionIndex = 0;
        } else if (patrol.currentPositionIndex < 0) {
            patrol.currentPositionIndex = patrol.routePath.length - 1;
        }

        await savePatrolRoute(patrol);
        const cid = $campaignStore.activeCampaignId;
        if (cid) await loadDungeonForCampaign(cid);
    }

    async function advanceTimeForAll() {
        const lid = $dungeonStore.activeLevelId;
        if (!lid) return;

        const patrols = $dungeonStore.patrols[lid] || [];
        for (const p of patrols) {
            p.currentPositionIndex += 1;
            if (p.currentPositionIndex >= p.routePath.length) {
                p.currentPositionIndex = 0;
            }
            await savePatrolRoute(p);
        }

        const cid = $campaignStore.activeCampaignId;
        if (cid) await loadDungeonForCampaign(cid);
    }

    const roomStatuses: RoomStatus[] = [
        "unexplored",
        "explored",
        "cleared",
        "occupied",
        "trapped",
    ];

    function getStatusColor(status: RoomStatus) {
        switch (status) {
            case "unexplored":
                return "bg-gray-500/20 text-gray-400";
            case "explored":
                return "bg-blue-500/20 text-blue-400";
            case "cleared":
                return "bg-green-500/20 text-green-400";
            case "occupied":
                return "bg-red-500/20 text-red-400";
            case "trapped":
                return "bg-yellow-500/20 text-yellow-400";
            default:
                return "bg-gray-500/20 text-gray-400";
        }
    }
</script>

{#if !$campaignStore.activeCampaignId}
    <div
        class="h-full flex items-center justify-center text-[var(--tavern-text-main)]/50"
    >
        Please enter the Tavern (select a campaign) before exploring The
        Underworld.
    </div>
{:else}
    <div class="flex h-[calc(100vh-6rem)] gap-4">
        <!-- Left Panel: Levels & Rooms Accordion -->
        <div
            class="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar"
        >
            <div class="flex justify-between items-center">
                <h2
                    class="text-2xl font-serif text-[var(--tavern-accent-gold)] tracking-wider"
                >
                    Dungeon Depths
                </h2>
                <button
                    class="text-xs bg-[var(--tavern-accent-gold)]/10 text-[var(--tavern-accent-gold)] px-2 py-1 rounded hover:bg-[var(--tavern-accent-gold)]/30 transition-colors"
                    onclick={() => (showNewLevelForm = !showNewLevelForm)}
                >
                    + Delve Deeper
                </button>
            </div>
            <div
                class="h-px w-full bg-[var(--tavern-accent-gold)]/20 mb-2"
            ></div>

            {#if showNewLevelForm}
                <div
                    class="bg-black/30 p-3 rounded border border-[var(--tavern-accent-gold)]/30 flex flex-col gap-2"
                >
                    <div class="flex gap-2">
                        <div class="w-16 flex flex-col gap-1">
                            <label
                                for="levelDepth"
                                class="text-[0.65rem] uppercase tracking-widest opacity-60"
                                >Depth</label
                            >
                            <input
                                id="levelDepth"
                                type="number"
                                bind:value={newLevelDepth}
                                class="w-full bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-2 py-1 text-sm text-[var(--tavern-text-main)] outline-none focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                            />
                        </div>
                        <div class="flex-1 flex flex-col gap-1">
                            <label
                                for="levelName"
                                class="text-[0.65rem] uppercase tracking-widest opacity-60"
                                >Level Name</label
                            >
                            <input
                                id="levelName"
                                type="text"
                                bind:value={newLevelName}
                                placeholder="e.g. The Gilded Vaults"
                                class="w-full bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-2 py-1 text-sm text-[var(--tavern-text-main)] outline-none focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                            />
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label
                            for="factionCtrl"
                            class="text-[0.65rem] uppercase tracking-widest opacity-60"
                            >Faction in Control (Optional)</label
                        >
                        <input
                            id="factionCtrl"
                            type="text"
                            bind:value={newLevelFaction}
                            placeholder="e.g. The Cult of the Serpent"
                            class="w-full bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-2 py-1 text-sm text-[var(--tavern-text-main)] outline-none focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                        />
                    </div>
                    <button
                        class="bg-[var(--tavern-accent-red)] text-[var(--tavern-text-main)] text-sm py-1 rounded font-medium mt-1 hover:bg-red-800 transition-colors"
                        onclick={handleAddLevel}
                    >
                        Establish Level
                    </button>
                </div>
            {/if}

            <div class="flex flex-col gap-2">
                {#each $dungeonStore.levels as level}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="p-3 rounded border cursor-pointer transition-all flex justify-between items-center group
                        {level.id === $dungeonStore.activeLevelId
                            ? 'bg-[var(--tavern-accent-red)]/10 border-[var(--tavern-accent-red)]/50'
                            : 'bg-black/20 border-transparent hover:border-[var(--tavern-accent-gold)]/20'}"
                        onclick={() => selectLevel(level.id)}
                    >
                        <div>
                            <div
                                class="text-xs text-[var(--tavern-accent-gold)]/70 uppercase font-bold tracking-widest"
                            >
                                Level {level.depth}
                            </div>
                            <div class="font-serif text-lg">{level.name}</div>
                            {#if level.factionControl}
                                <div class="text-[0.65rem] opacity-60">
                                    Controlled by: {level.factionControl}
                                </div>
                            {/if}
                        </div>
                        <button
                            class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-2"
                            onclick={(e) => {
                                e.stopPropagation();
                                handleDeleteLevel(level.id);
                            }}
                            title="Delete Level"
                        >
                            ✖
                        </button>
                    </div>
                {/each}
                {#if $dungeonStore.levels.length === 0 && !showNewLevelForm}
                    <div class="text-sm opacity-50 italic text-center py-8">
                        The depths are uncharted. Click "+ Delve Deeper" to
                        begin your megadungeon.
                    </div>
                {/if}
            </div>
        </div>

        <!-- Right Panel: Room Details or Patrol UI -->
        <div
            class="flex-1 bg-[var(--tavern-bg-base)]/50 border border-[var(--tavern-accent-gold)]/10 rounded flex flex-col"
        >
            {#if !$dungeonStore.activeLevelId}
                <div class="h-full flex items-center justify-center">
                    <h2
                        class="text-xl font-serif text-[var(--tavern-accent-gold)]/50"
                    >
                        Select a Level to view its topology
                    </h2>
                </div>
            {:else}
                {@const activeLevel = $dungeonStore.levels.find(
                    (l) => l.id === $dungeonStore.activeLevelId,
                )}
                <div
                    class="p-4 border-b border-[var(--tavern-accent-gold)]/20 bg-black/20 flex justify-between items-end"
                >
                    <div>
                        <div
                            class="text-xs text-[var(--tavern-accent-gold)]/70 uppercase tracking-widest"
                        >
                            Level {activeLevel?.depth}
                        </div>
                        <h2 class="text-3xl font-serif mt-1">
                            {activeLevel?.name}
                        </h2>
                    </div>
                    <div
                        class="flex space-x-1 bg-black/30 rounded border border-[var(--tavern-accent-gold)]/20 p-1"
                    >
                        <button
                            class="px-4 py-1 text-sm rounded transition-colors {selectedTab ===
                            'rooms'
                                ? 'bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)] shadow-inset'
                                : 'text-white/60 hover:text-white'}"
                            onclick={() => (selectedTab = "rooms")}
                        >
                            Rooms ({$dungeonStore.rooms[
                                $dungeonStore.activeLevelId
                            ]?.length || 0})
                        </button>
                        <button
                            class="px-4 py-1 text-sm rounded transition-colors {selectedTab ===
                            'patrols'
                                ? 'bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)] shadow-inset'
                                : 'text-white/60 hover:text-white'}"
                            onclick={() => (selectedTab = "patrols")}
                        >
                            Patrol Routes ({$dungeonStore.patrols[
                                $dungeonStore.activeLevelId
                            ]?.length || 0})
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {#if selectedTab === "rooms"}
                        <div class="flex justify-between mb-4 items-center">
                            <h3 class="text-lg font-serif">Room Topology</h3>
                            <button
                                class="bg-[var(--tavern-accent-gold)]/10 text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-gold)]/30 px-3 py-1 rounded text-sm hover:bg-[var(--tavern-accent-gold)]/20 transition-colors"
                                onclick={() =>
                                    (showNewRoomForm = !showNewRoomForm)}
                            >
                                + Excavate Room
                            </button>
                        </div>

                        {#if showNewRoomForm}
                            <div
                                class="mb-4 bg-black/40 p-3 rounded flex gap-2 border border-dashed border-[var(--tavern-accent-gold)]/50"
                            >
                                <input
                                    type="text"
                                    bind:value={newRoomName}
                                    placeholder="Room Name (e.g. 1A - Entrance Hall)"
                                    class="flex-1 bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-3 py-2 text-sm text-[var(--tavern-text-main)] outline-none focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                                />
                                <button
                                    class="bg-[var(--tavern-accent-red)] text-[var(--tavern-text-main)] px-4 rounded font-medium hover:bg-red-800 transition-colors"
                                    onclick={handleAddRoom}>Add</button
                                >
                            </div>
                        {/if}

                        <div class="flex flex-col gap-3">
                            {#each $dungeonStore.rooms[$dungeonStore.activeLevelId] || [] as room}
                                <div
                                    class="bg-black/30 border border-[var(--tavern-accent-gold)]/20 rounded overflow-hidden"
                                >
                                    <!-- Accordion Header -->
                                    <div
                                        class="flex items-center justify-between p-3 bg-black/20 cursor-pointer hover:bg-black/40 transition-colors select-none"
                                        onclick={() => toggleRoom(room.id)}
                                        onkeydown={(e) => {
                                            if (e.key === "Enter")
                                                toggleRoom(room.id);
                                        }}
                                        tabindex="0"
                                        role="button"
                                    >
                                        <div class="flex flex-col">
                                            <div class="font-serif text-lg">
                                                {room.name}
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <select
                                                aria-label="Room Status"
                                                class="text-xs px-2 py-1 rounded outline-none border border-[var(--tavern-accent-gold)]/20 uppercase tracking-wider font-bold {getStatusColor(
                                                    room.status,
                                                )}"
                                                bind:value={room.status}
                                                onclick={(e) =>
                                                    e.stopPropagation()}
                                                onchange={() =>
                                                    handleUpdateRoom(room)}
                                            >
                                                {#each roomStatuses as status}
                                                    <option
                                                        value={status}
                                                        class="bg-[var(--tavern-bg-panel)] text-white"
                                                        >{status}</option
                                                    >
                                                {/each}
                                            </select>
                                            <span
                                                class="text-[var(--tavern-accent-gold)]/50 transform transition-transform {expandedRoomId ===
                                                room.id
                                                    ? 'rotate-180'
                                                    : ''}">▼</span
                                            >
                                        </div>
                                    </div>
                                    <!-- Accordion Body -->
                                    {#if expandedRoomId === room.id}
                                        <div
                                            class="p-3 flex flex-col gap-3 border-t border-[var(--tavern-accent-gold)]/10"
                                        >
                                            <div class="flex flex-col gap-1">
                                                <label
                                                    for={`visualdesc-${room.id}`}
                                                    class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                                                    >Visual Description</label
                                                >
                                                <textarea
                                                    id={`visualdesc-${room.id}`}
                                                    bind:value={
                                                        room.description
                                                    }
                                                    onblur={() =>
                                                        handleUpdateRoom(room)}
                                                    placeholder="Smells of ozone, cracked stone pillars..."
                                                    class="w-full bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-2 py-1 text-sm text-[var(--tavern-text-main)] outline-none min-h-[4rem] focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                                                ></textarea>
                                            </div>
                                            <div class="flex gap-3">
                                                <div
                                                    class="flex-1 flex flex-col gap-1"
                                                >
                                                    <label
                                                        for={`occupants-${room.id}`}
                                                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                                                        >Occupants</label
                                                    >
                                                    <textarea
                                                        id={`occupants-${room.id}`}
                                                        bind:value={
                                                            room.occupants
                                                        }
                                                        onblur={() =>
                                                            handleUpdateRoom(
                                                                room,
                                                            )}
                                                        placeholder="3 Goblins playing dice"
                                                        class="w-full bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-2 py-1 text-sm text-[var(--tavern-text-main)] outline-none min-h-[4rem] focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                                                    ></textarea>
                                                </div>
                                                <div
                                                    class="flex-1 flex flex-col gap-1"
                                                >
                                                    <label
                                                        for={`features-${room.id}`}
                                                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                                                        >Features & Traps</label
                                                    >
                                                    <textarea
                                                        id={`features-${room.id}`}
                                                        bind:value={room.traps}
                                                        onblur={() =>
                                                            handleUpdateRoom(
                                                                room,
                                                            )}
                                                        placeholder="Poison dart trap on the chest (DC 14)"
                                                        class="w-full bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-2 py-1 text-sm text-[var(--tavern-text-main)] outline-none min-h-[4rem] focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                                                    ></textarea>
                                                </div>
                                            </div>
                                            <div class="flex justify-end mt-2">
                                                <button
                                                    class="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                                                    onclick={() =>
                                                        handleDeleteRoom(
                                                            room.id,
                                                        )}
                                                >
                                                    <span class="text-base"
                                                        >✖</span
                                                    > Collapse Room
                                                </button>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                            {#if ($dungeonStore.rooms[$dungeonStore.activeLevelId]?.length || 0) === 0 && !showNewRoomForm}
                                <div
                                    class="text-center italic opacity-40 py-10"
                                >
                                    This level is completely hollow. Excavate a
                                    room to begin charting.
                                </div>
                            {/if}
                        </div>
                    {:else if selectedTab === "patrols"}
                        <div class="flex justify-between mb-4 items-center">
                            <h3 class="text-lg font-serif">
                                Wandering Patrols
                            </h3>
                            <div class="flex gap-2">
                                <button
                                    class="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded text-sm hover:bg-blue-500/20 transition-colors flex items-center gap-2"
                                    onclick={advanceTimeForAll}
                                    title="Moves all patrols forward 1 step along their route"
                                >
                                    <span>⏳</span> Advance Time
                                </button>
                                <button
                                    class="bg-[var(--tavern-accent-gold)]/10 text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-gold)]/30 px-3 py-1 rounded text-sm hover:bg-[var(--tavern-accent-gold)]/20 transition-colors"
                                    onclick={() =>
                                        (showNewPatrolForm =
                                            !showNewPatrolForm)}
                                >
                                    + Assign Patrol
                                </button>
                            </div>
                        </div>

                        {#if showNewPatrolForm}
                            <div
                                class="mb-4 bg-black/40 p-3 rounded flex flex-col gap-2 border border-dashed border-[var(--tavern-accent-gold)]/50"
                            >
                                <input
                                    type="text"
                                    bind:value={newPatrolName}
                                    placeholder="Patrol Name (e.g. Goblin Alpha Squad)"
                                    class="w-full bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-3 py-2 text-sm text-[var(--tavern-text-main)] outline-none focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                                />
                                <input
                                    type="text"
                                    bind:value={newPatrolPath}
                                    placeholder="Route Path, comma separated (e.g. 1A, 1B, 1C, Barracks)"
                                    class="w-full bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-3 py-2 text-sm text-[var(--tavern-text-main)] outline-none focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                                />
                                <input
                                    type="text"
                                    bind:value={newPatrolDesc}
                                    placeholder="Description (Optional)"
                                    class="w-full bg-black/50 border border-[var(--tavern-accent-gold)]/20 rounded px-3 py-2 text-sm text-[var(--tavern-text-main)] outline-none focus:border-[var(--tavern-accent-red)]/50 transition-colors"
                                />
                                <div class="flex justify-end mt-1">
                                    <button
                                        class="bg-[var(--tavern-accent-red)] text-[var(--tavern-text-main)] px-4 py-1 rounded font-medium hover:bg-red-800 transition-colors text-sm"
                                        onclick={handleAddPatrol}
                                        >Deploy Patrol</button
                                    >
                                </div>
                            </div>
                        {/if}

                        <div class="flex flex-col gap-3">
                            {#each $dungeonStore.patrols[$dungeonStore.activeLevelId] || [] as patrol}
                                <div
                                    class="bg-black/30 border border-[var(--tavern-accent-gold)]/20 rounded p-3 relative group"
                                >
                                    <button
                                        class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
                                        onclick={() =>
                                            handleDeletePatrol(patrol.id)}
                                        >✖</button
                                    >
                                    <h4
                                        class="font-serif text-lg text-[var(--tavern-accent-gold)]"
                                    >
                                        {patrol.name}
                                    </h4>
                                    {#if patrol.description}
                                        <p
                                            class="text-xs opacity-60 italic mb-2"
                                        >
                                            {patrol.description}
                                        </p>
                                    {/if}

                                    <div
                                        class="mt-3 bg-black/40 p-2 rounded flex flex-col gap-2 border border-white/5"
                                    >
                                        <div
                                            class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/50"
                                        >
                                            Current Position
                                        </div>
                                        <div
                                            class="flex flex-wrap gap-2 items-center"
                                        >
                                            {#each patrol.routePath as node, i}
                                                <div
                                                    class="px-2 py-1 rounded text-sm font-bold {i ===
                                                    patrol.currentPositionIndex
                                                        ? 'bg-[var(--tavern-accent-red)] text-white shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                                                        : 'bg-black/50 text-white/40 border border-white/10'}"
                                                >
                                                    {node}
                                                </div>
                                                {#if i < patrol.routePath.length - 1}
                                                    <span
                                                        class="text-white/20 text-xs"
                                                        >→</span
                                                    >
                                                {/if}
                                            {/each}
                                        </div>

                                        <div
                                            class="flex justify-between items-center mt-2 pt-2 border-t border-white/5"
                                        >
                                            <button
                                                class="text-xs bg-black/50 border border-white/10 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                                                onclick={() =>
                                                    advancePatrol(patrol, -1)}
                                            >
                                                ← Step Back
                                            </button>
                                            <button
                                                class="text-xs bg-black/50 border border-[var(--tavern-accent-gold)]/30 text-[var(--tavern-accent-gold)] px-2 py-1 rounded hover:bg-[var(--tavern-accent-gold)]/20 transition-colors"
                                                onclick={() =>
                                                    advancePatrol(patrol, 1)}
                                            >
                                                Advance Step →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                            {#if ($dungeonStore.patrols[$dungeonStore.activeLevelId]?.length || 0) === 0 && !showNewPatrolForm}
                                <div
                                    class="text-center italic opacity-40 py-10"
                                >
                                    No patrols active on this level.
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
{/if}
