<script lang="ts">
    import { onMount, tick } from "svelte";
    import { exportTavernData, importTavernData } from "../../core/storage/exportImport";

    const THEME_KEY = "tavern-theme-v1";

    const defaultTheme = {
        "--tavern-bg-base": "#1a120b",
        "--tavern-bg-panel": "#2c1e16",
        "--tavern-bg-dark": "#0a0705",
        "--tavern-accent-gold": "#c6a25b",
        "--tavern-accent-gold-bright": "#e69a28",
        "--tavern-text-main": "#f4ecd8",
        "--tavern-accent-red": "#8b3a3a",
        "--tavern-accent-red-hover": "#a54a4a",
    };

    let themeObj = $state({ ...defaultTheme });

    onMount(() => {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) {
            try {
                themeObj = { ...defaultTheme, ...JSON.parse(saved) };
            } catch (e) {
                console.error("Theme parse error", e);
            }
        }
    });

    $effect(() => {
        localStorage.setItem(THEME_KEY, JSON.stringify(themeObj));
        for (const [key, value] of Object.entries(themeObj)) {
            document.documentElement.style.setProperty(key, value);
        }
    });

    function resetToDefault() {
        if (confirm("Revert your whole tavern to standard wood-and-gold?")) {
            themeObj = { ...defaultTheme };
        }
    }

    // Cloud Sync State
    let isExporting = $state(false);
    let isImporting = $state(false);

    async function handleExport() {
        isExporting = true;
        try {
            await exportTavernData();
        } catch (e) {
            console.error(e);
            alert("Export failed. See console.");
        }
        isExporting = false;
    }

    async function handleImport(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (!confirm("WARNING: This will overwrite ALL current Tavern data with the uploaded backup. Proceed?")) {
            input.value = "";
            return;
        }

        isImporting = true;
        try {
            await importTavernData(file);
            alert("Tavern successfully restored! The page will now reload.");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Failed to import Tavern data. See console for details.");
            isImporting = false;
            input.value = "";
        }
    }
</script>

<div
    class="h-full flex flex-col md:flex-row gap-6 animate-in fade-in duration-500 max-w-4xl mx-auto"
>
    <div
        class="flex-1 bg-[var(--tavern-bg-panel)] rounded-xl p-6 md:p-8 border border-[var(--tavern-accent-gold)]/20 shadow-lg flex flex-col"
    >
        <header
            class="border-b border-[var(--tavern-accent-gold)]/20 pb-4 mb-6 shrink-0 flex justify-between items-end"
        >
            <div>
                <h1
                    class="text-3xl font-serif text-[var(--tavern-accent-gold)] tracking-wide mb-1"
                >
                    Tavern Configuration
                </h1>
                <p class="text-[var(--tavern-text-main)]/60 text-sm">
                    Manage your world's backups and global aesthetics.
                </p>
            </div>
            <button
                onclick={resetToDefault}
                class="text-[var(--tavern-accent-red)]/70 hover:text-[var(--tavern-accent-red)] text-xs transition-colors"
            >
                [ Reset to MVP Default ]
            </button>
        </header>

        <div class="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
            
            <section>
                <h2
                    class="text-lg font-serif text-[var(--tavern-accent-gold-bright)] mb-4 border-b border-[var(--tavern-accent-gold)]/10 pb-1"
                >
                    Portable Tavern (Backups)
                </h2>
                <div class="bg-[var(--tavern-bg-base)] p-4 rounded-lg border border-[var(--tavern-accent-gold)]/20 shadow-inner flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div class="text-sm text-[var(--tavern-text-main)]/80">
                        <p class="mb-1 text-[var(--tavern-accent-gold)] font-medium">Backup & Clone</p>
                        <p class="text-xs opacity-70">Export a .zip file containing all your campaigns, notes, monsters, maps, and audio tracks. You can use this file to load your world onto another device.</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button
                            onclick={handleExport}
                            disabled={isExporting}
                            class="px-4 py-2 bg-[var(--tavern-accent-gold)]/10 text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-gold)] rounded hover:bg-[var(--tavern-accent-gold)]/20 transition-colors disabled:opacity-50 text-sm"
                        >
                            {isExporting ? 'Packing...' : 'Export Backup ZIP'}
                        </button>
                        
                        <label class="px-4 py-2 bg-[var(--tavern-accent-red)]/10 text-[var(--tavern-accent-red)] border border-[var(--tavern-accent-red)] rounded hover:bg-[var(--tavern-accent-red)]/20 transition-colors cursor-pointer text-sm mb-0 flex items-center justify-center {isImporting ? 'opacity-50 pointer-events-none' : ''}">
                            {isImporting ? 'Restoring...' : 'Restore from ZIP'}
                            <input type="file" accept=".zip" class="hidden" onchange={handleImport} />
                        </label>
                    </div>
                </div>
            </section>

            <section>
                <h2
                    class="text-lg font-serif text-[var(--tavern-accent-gold-bright)] mb-4 border-b border-[var(--tavern-accent-gold)]/10 pb-1"
                >
                    Environment
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label class="flex flex-col gap-2">
                        <span class="text-sm font-medium">Base Background</span>
                        <div class="flex items-center gap-3">
                            <input
                                type="color"
                                bind:value={themeObj["--tavern-bg-base"]}
                                class="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                            />
                            <span class="text-xs opacity-60 font-mono uppercase"
                                >{themeObj["--tavern-bg-base"]}</span
                            >
                        </div>
                    </label>
                    <label class="flex flex-col gap-2">
                        <span class="text-sm font-medium">Panel Background</span
                        >
                        <div class="flex items-center gap-3">
                            <input
                                type="color"
                                bind:value={themeObj["--tavern-bg-panel"]}
                                class="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                            />
                            <span class="text-xs opacity-60 font-mono uppercase"
                                >{themeObj["--tavern-bg-panel"]}</span
                            >
                        </div>
                    </label>
                    <label class="flex flex-col gap-2">
                        <span class="text-sm font-medium"
                            >Dark Accents (Inputs/Inner)</span
                        >
                        <div class="flex items-center gap-3">
                            <input
                                type="color"
                                bind:value={themeObj["--tavern-bg-dark"]}
                                class="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                            />
                            <span class="text-xs opacity-60 font-mono uppercase"
                                >{themeObj["--tavern-bg-dark"]}</span
                            >
                        </div>
                    </label>
                    <label class="flex flex-col gap-2">
                        <span class="text-sm font-medium">Text Main</span>
                        <div class="flex items-center gap-3">
                            <input
                                type="color"
                                bind:value={themeObj["--tavern-text-main"]}
                                class="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                            />
                            <span class="text-xs opacity-60 font-mono uppercase"
                                >{themeObj["--tavern-text-main"]}</span
                            >
                        </div>
                    </label>
                </div>
            </section>

            <section>
                <h2
                    class="text-lg font-serif text-[var(--tavern-accent-gold-bright)] mb-4 border-b border-[var(--tavern-accent-gold)]/10 pb-1"
                >
                    Primary Color Scheme
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label class="flex flex-col gap-2">
                        <span class="text-sm font-medium"
                            >Brand Gold (Borders/Titles)</span
                        >
                        <div class="flex items-center gap-3">
                            <input
                                type="color"
                                bind:value={themeObj["--tavern-accent-gold"]}
                                class="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                            />
                            <span class="text-xs opacity-60 font-mono uppercase"
                                >{themeObj["--tavern-accent-gold"]}</span
                            >
                        </div>
                    </label>
                    <label class="flex flex-col gap-2">
                        <span class="text-sm font-medium"
                            >Brand Gold Bright (Highlights)</span
                        >
                        <div class="flex items-center gap-3">
                            <input
                                type="color"
                                bind:value={
                                    themeObj["--tavern-accent-gold-bright"]
                                }
                                class="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                            />
                            <span class="text-xs opacity-60 font-mono uppercase"
                                >{themeObj["--tavern-accent-gold-bright"]}</span
                            >
                        </div>
                    </label>
                    <label class="flex flex-col gap-2">
                        <span class="text-sm font-medium"
                            >Action Red (Buttons/Combat)</span
                        >
                        <div class="flex items-center gap-3">
                            <input
                                type="color"
                                bind:value={themeObj["--tavern-accent-red"]}
                                class="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                            />
                            <span class="text-xs opacity-60 font-mono uppercase"
                                >{themeObj["--tavern-accent-red"]}</span
                            >
                        </div>
                    </label>
                    <label class="flex flex-col gap-2">
                        <span class="text-sm font-medium">Action Red Hover</span
                        >
                        <div class="flex items-center gap-3">
                            <input
                                type="color"
                                bind:value={
                                    themeObj["--tavern-accent-red-hover"]
                                }
                                class="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                            />
                            <span class="text-xs opacity-60 font-mono uppercase"
                                >{themeObj["--tavern-accent-red-hover"]}</span
                            >
                        </div>
                    </label>
                </div>
            </section>

            <section
                class="mt-8 border border-[var(--tavern-accent-gold)]/30 rounded-lg p-6 text-center bg-[var(--tavern-bg-base)]"
            >
                <p class="text-sm text-[var(--tavern-text-main)]/80 italic">
                    "The walls ripple, the mahogany lightens, and suddenly the
                    tavern is entirely rebuilt..."
                </p>
                <div
                    class="mt-4 opacity-50 text-[10px] uppercase font-mono tracking-widest text-[var(--tavern-accent-gold)]"
                >
                    All changes applied globally in real-time.
                </div>
            </section>
        </div>
    </div>
</div>
