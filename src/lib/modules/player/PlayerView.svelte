<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { joinSession, leaveSession, sendClientChat } from "../../core/sync/peerClient";
    import { mapStore } from "../../modules/maps/stores";
    import { encounterStore } from "../../modules/combat/stores";
    import PlayerSheet from "./PlayerSheet.svelte";
    import ChatPanel from "../../core/components/ChatPanel.svelte";

    let joinCode = $state("");
    let playerName = $state("");
    let statusMsg = $state("Enter a Session Code & Name");
    let isConnected = $state(false);
    let activeTab = $state<"vtt" | "sheet">("vtt");

    function connect() {
        if (!joinCode || !playerName) return;
        joinSession(joinCode, playerName, (msg) => {
            statusMsg = msg;
            if (msg === "Connected to Session.") {
                isConnected = true;
            } else if (
                msg.includes("Disconnected") ||
                msg.includes("Failed") ||
                msg.includes("error")
            ) {
                isConnected = false;
            }
        });
    }

    function disconnect() {
        leaveSession();
        isConnected = false;
        statusMsg = "Disconnected. Enter code to join.";
    }

    onDestroy(() => {
        leaveSession();
    });
</script>

<div class="h-full flex flex-col items-center p-4">
    {#if !isConnected}
        <div
            class="mt-20 flex flex-col items-center bg-[var(--tavern-bg-panel)] p-8 rounded-xl border border-[var(--tavern-accent-gold)]/30 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-500"
        >
            <h1
                class="text-3xl font-serif text-[var(--tavern-accent-gold)] mb-2 tracking-wide text-center"
            >
                Join The Party
            </h1>
            <p
                class="text-[var(--tavern-text-main)]/60 text-center mb-6 text-sm"
            >
                {statusMsg}
            </p>

            <input
                type="text"
                bind:value={playerName}
                placeholder="Character Name"
                class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/50 rounded-lg px-4 py-3 w-full tracking-widest text-[var(--tavern-text-main)] mb-3 focus:outline-none focus:border-[var(--tavern-accent-gold)]"
                onkeypress={(e) => e.key === "Enter" && connect()}
            />

            <input
                type="text"
                bind:value={joinCode}
                placeholder="Room Code (e.g. A1B2C3)"
                class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/50 rounded-lg px-4 py-3 w-full text-center tracking-widest text-[var(--tavern-text-main)] font-mono text-xl mb-4 focus:outline-none focus:border-[var(--tavern-accent-gold)] uppercase"
                maxlength="6"
                onkeypress={(e) => e.key === "Enter" && connect()}
            />

            <button
                onclick={connect}
                class="w-full bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white px-4 py-3 rounded-lg font-bold transition-all shadow-[0_4px_14px_0_rgba(139,58,58,0.39)] hover:shadow-[0_6px_20px_rgba(139,58,58,0.23)]"
            >
                Connect to Nexus
            </button>
        </div>
    {:else}
        <!-- Player Dashboard View -->
        <div
            class="w-full h-full flex flex-col max-w-5xl mx-auto gap-4 animate-in fade-in duration-700"
        >
            <header
                class="flex justify-between items-center bg-[var(--tavern-bg-panel)] p-4 rounded-xl border border-[var(--tavern-accent-gold)]/20 shrink-0"
            >
                <div>
                    <h2
                        class="text-[var(--tavern-accent-gold)] font-serif text-xl"
                    >
                        Nexus Connection
                    </h2>
                    <div
                        class="text-green-500/80 text-xs flex items-center gap-1.5 font-medium tracking-wide"
                    >
                        <span
                            class="w-2 h-2 rounded-full bg-green-500 animate-pulse"
                        ></span>
                        SYNCED TO HOST: {joinCode.toUpperCase()}
                    </div>
                    <div class="flex items-center gap-4">
                        <div
                            class="flex bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 rounded overflow-hidden"
                        >
                            <button
                                onclick={() => (activeTab = "vtt")}
                                class="px-3 py-1.5 text-xs font-medium transition-colors {activeTab ===
                                'vtt'
                                    ? 'bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)]'
                                    : 'text-[var(--tavern-text-main)]/50 hover:bg-[var(--tavern-accent-gold)]/10'}"
                                >Live VTT</button
                            >
                            <button
                                onclick={() => (activeTab = "sheet")}
                                class="px-3 py-1.5 text-xs font-medium transition-colors {activeTab ===
                                'sheet'
                                    ? 'bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)]'
                                    : 'text-[var(--tavern-text-main)]/50 hover:bg-[var(--tavern-accent-gold)]/10'}"
                                >Character Sheet</button
                            >
                        </div>
                        <button
                            onclick={disconnect}
                            class="text-xs px-3 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            >Disconnect</button
                        >
                    </div>
                </div>
            </header>

            {#if activeTab === "vtt"}
                <!-- Read Only Active Map -->
                <div
                    class="flex-1 min-h-0 bg-[var(--tavern-bg-dark)] border border-[var(--tavern-accent-gold)]/20 rounded-xl relative overflow-hidden group"
                >
                    {#if $mapStore.activeMapUrl}
                        <img
                            src={$mapStore.activeMapUrl}
                            alt="Current Battlemap"
                            class="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-90"
                        />
                        <!-- Grid -->
                        <div
                            class="absolute inset-0 pointer-events-none opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0zOSAzOVYxaC0zOHYzOHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIvPjwvc3ZnPg==')]"
                        ></div>

                        <!-- Tokens Layer (Readonly) -->
                        <div class="absolute inset-0 z-10 pointer-events-none">
                            {#each $mapStore.maps.find((m) => m.id === $mapStore.activeMapId)?.tokens || [] as token}
                                <div
                                    class="absolute w-10 h-10 rounded-full border-2 border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center font-bold text-white text-xs"
                                    style="left: {token.x}%; top: {token.y}%; background-color: {token.color}; transform: translate(-50%, -50%);"
                                >
                                    {token.name.substring(0, 2).toUpperCase()}
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div
                            class="absolute inset-0 flex items-center justify-center text-[var(--tavern-text-main)]/30"
                        >
                            Host has not shared a map.
                        </div>
                    {/if}
                </div>

                <!-- Read Only Fray/Combat Tracker -->
                <div
                    class="bg-[var(--tavern-bg-panel)] border border-[var(--tavern-accent-gold)]/20 rounded-xl p-4 shrink-0 max-h-64 overflow-y-auto custom-scrollbar"
                >
                    <h3
                        class="text-[var(--tavern-accent-gold)] font-serif mb-2 tracking-wide uppercase text-sm border-b border-[var(--tavern-accent-gold)]/20 pb-1"
                    >
                        The Fray - Round {$encounterStore.round}
                    </h3>
                    {#if $encounterStore.combatants.length === 0}
                        <p class="text-[var(--tavern-text-main)]/40 text-sm">
                            No active combat.
                        </p>
                    {:else}
                        <div class="space-y-1 mt-2">
                            {#each $encounterStore.combatants as combatant, index}
                                <div
                                    class="flex justify-between items-center p-2 rounded {index ===
                                    $encounterStore.turnIndex
                                        ? 'bg-[var(--tavern-accent-red)]/20 border border-[var(--tavern-accent-red)] text-white shadow-[0_0_10px_rgba(139,58,58,0.2)]'
                                        : 'bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/10 text-[var(--tavern-text-main)]/80'}"
                                >
                                    <span
                                        class="font-bold {index ===
                                        $encounterStore.turnIndex
                                            ? 'text-[var(--tavern-accent-gold)]'
                                            : ''}">{combatant.name}</span
                                    >
                                    <div class="flex gap-4">
                                        <!-- Don't show exact HP of enemies to players in a typical VTT, MVP shows it for parity/simplicity or obscure it -->
                                        <span
                                            class="text-xs text-red-400 font-mono tracking-wider"
                                            >HP: {(
                                                (combatant.hp.current /
                                                    Math.max(
                                                        1,
                                                        combatant.hp.max,
                                                    )) *
                                                100
                                            ).toFixed(0)}%</span
                                        >
                                        <span
                                            class="text-xs bg-black/40 px-1.5 py-0.5 rounded border border-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)] font-mono"
                                            >INIT: {combatant.initiative}</span
                                        >
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Chat Panel -->
                <div class="h-64 shrink-0">
                    <ChatPanel 
                        currentIdentity={playerName} 
                        onSendChat={(text: string) => sendClientChat(text, playerName)} 
                    />
                </div>
            {:else}
                <!-- Player Sheet View -->
                <div
                    class="flex-1 min-h-0 bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/20 overflow-hidden relative"
                >
                    <PlayerSheet />
                </div>
            {/if}
        </div>
    {/if}
</div>
