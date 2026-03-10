<script lang="ts">
    import { onMount } from "svelte";
    import {
        soundboardStore,
        uploadAudio,
        removeAudio,
        playAmbient,
        stopAmbient,
        playSfx,
        updateVolumes,
    } from "./stores";

    let fileInput: HTMLInputElement;
    let uploadType: "ambient" | "sfx" = "ambient";

    function handleUpload(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;

        const file = target.files[0];
        if (!file.type.startsWith("audio/")) {
            alert("Please select a valid audio file.");
            return;
        }

        // Clean name (remove extension for display)
        const friendlyName = file.name.replace(/\.[^/.]+$/, "");
        uploadAudio(file, friendlyName, uploadType);

        target.value = ""; // Reset
    }

    function triggerFileInput(type: "ambient" | "sfx") {
        uploadType = type;
        fileInput.click();
    }

    // Derived lists for UI
    let ambientTracks = $derived(
        $soundboardStore.tracks.filter((t) => t.type === "ambient"),
    );
    let sfxTracks = $derived(
        $soundboardStore.tracks.filter((t) => t.type === "sfx"),
    );

    // Volume sliders local bindings
    let ambVol = $state($soundboardStore.ambientVolume);
    let sfxVol = $state($soundboardStore.sfxVolume);

    $effect(() => {
        updateVolumes(ambVol, sfxVol);
    });
</script>

<div
    class="h-full flex flex-col md:flex-row gap-6 animate-in fade-in duration-500"
>
    <!-- Left Column: Ambient Tracks -->
    <div
        class="flex-1 bg-[var(--tavern-bg-panel)] rounded-xl p-5 border border-[var(--tavern-accent-gold)]/20 shadow-lg flex flex-col"
    >
        <div
            class="flex justify-between items-center border-b border-[var(--tavern-accent-gold)]/20 pb-3 mb-4"
        >
            <div>
                <h2 class="text-2xl font-serif text-[var(--tavern-accent-gold)] tracking-wide">
                    Atmosphere
                </h2>
                <p
                    class="text-[0.65rem] text-[var(--tavern-text-main)]/50 uppercase tracking-widest mt-1"
                >
                    Looping Backgrounds
                </p>
            </div>
            <button
                onclick={() => triggerFileInput("ambient")}
                class="bg-transparent border border-[var(--tavern-accent-gold)]/30 text-[var(--tavern-accent-gold)] hover:bg-[var(--tavern-accent-gold)]/10 px-3 py-1.5 text-sm rounded transition-colors"
                title="Upload Ambient Loop"
            >
                + Add Track
            </button>
        </div>

        <!-- Volume Control -->
        <div
            class="mb-4 flex items-center gap-3 bg-[var(--tavern-bg-base)] p-3 rounded-lg border border-[var(--tavern-accent-gold)]/10"
        >
            <span class="text-xl opacity-60">🔉</span>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                bind:value={ambVol}
                class="flex-1 accent-[var(--tavern-accent-gold)]"
            />
        </div>

        <div class="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {#if ambientTracks.length === 0}
                <div
                    class="text-center py-8 text-[var(--tavern-text-main)]/30 text-sm italic border border-dashed border-[var(--tavern-accent-gold)]/10 rounded-xl"
                >
                    No ambient tracks. Add some tavern noise or dungeon drips!
                </div>
            {:else}
                {#each ambientTracks as track (track.id)}
                    {@const isActive =
                        $soundboardStore.activeAmbientId === track.id}
                    <div
                        class="group relative flex justify-between items-center bg-[var(--tavern-bg-base)] p-3 rounded-lg border transition-all {isActive
                            ? 'border-[var(--tavern-accent-red)] shadow-[0_0_15px_rgba(139,58,58,0.2)]'
                            : 'border-[var(--tavern-accent-gold)]/10 hover:border-[var(--tavern-accent-gold)]/30'}"
                    >
                        <div class="flex items-center gap-3 overflow-hidden">
                            <button
                                onclick={() =>
                                    isActive
                                        ? stopAmbient()
                                        : playAmbient(track.id)}
                                class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors {isActive
                                    ? 'bg-[var(--tavern-accent-red)] text-white animate-pulse'
                                    : 'bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)] hover:bg-[var(--tavern-accent-gold)]/40'}"
                            >
                                {#if isActive}
                                    ⏸
                                {:else}
                                    ▶
                                {/if}
                            </button>
                            <span
                                class="font-medium text-[var(--tavern-text-main)] truncate text-sm"
                                >{track.name}</span
                            >
                        </div>
                        <button
                            onclick={() => {
                                if (confirm("Delete track?"))
                                    removeAudio(track.id);
                            }}
                            class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 px-2 py-1 text-xs shrink-0"
                            title="Delete"
                        >
                            ✕
                        </button>
                    </div>
                {/each}
            {/if}
        </div>
    </div>

    <!-- Right Column: Sound Effects -->
    <div
        class="flex-1 bg-[var(--tavern-bg-panel)] rounded-xl p-5 border border-[var(--tavern-accent-gold)]/20 shadow-lg flex flex-col"
    >
        <div
            class="flex justify-between items-center border-b border-[var(--tavern-accent-gold)]/20 pb-3 mb-4"
        >
            <div>
                <h2 class="text-2xl font-serif text-[var(--tavern-accent-gold)] tracking-wide">
                    Soundboard
                </h2>
                <p
                    class="text-[0.65rem] text-[var(--tavern-text-main)]/50 uppercase tracking-widest mt-1"
                >
                    One-Shot Effects
                </p>
            </div>
            <button
                onclick={() => triggerFileInput("sfx")}
                class="bg-transparent border border-[var(--tavern-accent-gold)]/30 text-[var(--tavern-accent-gold)] hover:bg-[var(--tavern-accent-gold)]/10 px-3 py-1.5 text-sm rounded transition-colors"
                title="Upload Sound Effect"
            >
                + Add SFX
            </button>
        </div>

        <!-- Volume Control -->
        <div
            class="mb-4 flex items-center gap-3 bg-[var(--tavern-bg-base)] p-3 rounded-lg border border-[var(--tavern-accent-gold)]/10"
        >
            <span class="text-xl opacity-60">🔊</span>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                bind:value={sfxVol}
                class="flex-1 accent-[var(--tavern-accent-gold)]"
            />
        </div>

        <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {#if sfxTracks.length === 0}
                <div
                    class="text-center py-8 text-[var(--tavern-text-main)]/30 text-sm italic border border-dashed border-[var(--tavern-accent-gold)]/10 rounded-xl"
                >
                    No sound effects. Time to record a fireball!
                </div>
            {:else}
                <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {#each sfxTracks as track (track.id)}
                        <div class="group relative">
                            <button
                                onclick={() => playSfx(track.id)}
                                class="w-full aspect-square bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 rounded-xl flex flex-col items-center justify-center p-2 text-center hover:bg-[var(--tavern-accent-gold)]/10 hover:border-[var(--tavern-accent-gold)]/50 transition-all active:scale-95 shadow-md"
                            >
                                <span class="text-2xl mb-2 opacity-80">💥</span>
                                <span
                                    class="font-medium text-xs text-[var(--tavern-text-main)] line-clamp-2 w-full truncate px-1"
                                    >{track.name}</span
                                >
                            </button>
                            <button
                                onclick={() => {
                                    if (confirm("Delete SFX?"))
                                        removeAudio(track.id);
                                }}
                                class="absolute -top-2 -right-2 bg-red-900/80 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all text-xs"
                                title="Delete"
                            >
                                ✕
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- Hidden File Input -->
<input
    type="file"
    accept="audio/*"
    class="hidden"
    bind:this={fileInput}
    onchange={handleUpload}
/>
