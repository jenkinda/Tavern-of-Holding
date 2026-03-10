<script lang="ts">
    import { onMount } from "svelte";
    import {
        mapStore,
        loadMaps,
        setActiveMap,
        uploadNewMap,
        updateMapTokens,
        updateJourneySettings,
        removeMap,
    } from "./stores";
    import type { Token } from "../../types/models";

    let fileInput: HTMLInputElement;
    let bgImageRef: HTMLImageElement | undefined = $state();
    let mapContainer: HTMLDivElement | undefined = $state();

    let isDragging = false;
    let draggedTokenId: string | null = $state(null);
    let grabOffsetX = 0;
    let grabOffsetY = 0;

    // Ping State
    let pingTimeout: ReturnType<typeof setTimeout>;
    let pings = $state<{ x: number; y: number; id: string }[]>([]);

    function handleMapMouseDown(e: MouseEvent | TouchEvent) {
        if (!activeMap || !mapContainer) return;
        // Don't trigger if we clicked a token
        if ((e.target as HTMLElement).closest(".cursor-grab")) return;

        const clientX =
            "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY =
            "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        const rect = mapContainer.getBoundingClientRect();

        const pctX = ((clientX - rect.left) / rect.width) * 100;
        const pctY = ((clientY - rect.top) / rect.height) * 100;

        pingTimeout = setTimeout(() => {
            triggerPing(pctX, pctY);
        }, 500); // 500ms hold
    }

    function handleMapMouseUp() {
        clearTimeout(pingTimeout);
    }

    function triggerPing(x: number, y: number) {
        const id = crypto.randomUUID();
        pings = [...pings, { x, y, id }];
        setTimeout(() => {
            pings = pings.filter((p) => p.id !== id);
        }, 1500);
    }

    onMount(() => {
        loadMaps();
    });

    let activeMap = $derived(
        $mapStore.maps.find((m) => m.id === $mapStore.activeMapId),
    );
    let tokens = $derived(activeMap?.tokens || []);

    async function handleUpload(e: Event) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const name = prompt("Name your map:", file.name.split(".")[0]);
        if (name) {
            await uploadNewMap(file, name);
        }

        if (fileInput) fileInput.value = "";
    }

    // --- Token Logic ---
    function addToken() {
        if (!activeMap) return;
        const name = prompt("Token Name:", "Goblin");
        if (!name) return;

        const newToken: Token = {
            id: crypto.randomUUID(),
            mapId: activeMap.id,
            name,
            x: 50, // Default drop pos
            y: 50,
            color: "var(--tavern-accent-red)", // Default Red
            size: 1, // 1 tile usually
        };

        updateMapTokens(activeMap.id, [...tokens, newToken]);
    }

    function addSpellArea(shape: "circle" | "cone" | "square" | "line") {
        if (!activeMap) return;
        let size = 4; // default 20ft radius = 4 tiles
        let color = "rgba(239, 68, 68, 0.4)"; // translucent red
        let name = "AoE";

        if (shape === "circle") {
            name = "20ft Sphere";
            size = 8;
            color = "rgba(245, 158, 11, 0.4)";
        }
        if (shape === "cone") {
            name = "15ft Cone";
            size = 3;
            color = "rgba(56, 189, 248, 0.4)";
        }
        if (shape === "square") {
            name = "10ft Cube";
            size = 2;
            color = "rgba(168, 85, 247, 0.4)";
        }
        if (shape === "line") {
            name = "60ft Line";
            size = 12;
            color = "rgba(94, 234, 212, 0.4)";
        }

        const newToken: Token = {
            id: crypto.randomUUID(),
            mapId: activeMap.id,
            name,
            x: 50,
            y: 50,
            color,
            size,
            shape,
            rotation: 0,
        };

        updateMapTokens(activeMap.id, [...tokens, newToken]);
    }

    function addLorePin() {
        if (!activeMap) return;
        const name = prompt("Lore Pin Name / Note:", "Hidden Door");
        if (!name) return;

        const newToken: Token = {
            id: crypto.randomUUID(),
            mapId: activeMap.id,
            name,
            x: 50,
            y: 50,
            color: "var(--tavern-accent-gold)",
            size: 0.8,
            shape: "pin",
        };

        updateMapTokens(activeMap.id, [...tokens, newToken]);
    }

    function addPartyToken() {
        if (!activeMap) return;
        // Check if party already exists
        if (tokens.find((t) => t.name === "The Party")) {
            alert("The Party token is already on the map!");
            return;
        }

        const partyToken: Token = {
            id: crypto.randomUUID(),
            mapId: activeMap.id,
            name: "The Party",
            x: 50,
            y: 50,
            color: "var(--tavern-accent-gold)", // Gold for party
            size: 1.5,
        };

        updateMapTokens(activeMap.id, [...tokens, partyToken]);
    }

    function startDrag(e: MouseEvent | TouchEvent, token: Token) {
        if (!mapContainer) return;
        isDragging = true;
        draggedTokenId = token.id;

        const clientX =
            "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY =
            "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const rect = mapContainer.getBoundingClientRect();

        // Grab offset relative to token element center
        // e.target is the token DOM node
        const tokenRect = (e.target as HTMLElement).getBoundingClientRect();

        // Calculate offset so dragging doesn't snap to top-left of mouse
        const centerX = tokenRect.left + tokenRect.width / 2;
        const centerY = tokenRect.top + tokenRect.height / 2;
        grabOffsetX = clientX - centerX;
        grabOffsetY = clientY - centerY;

        e.preventDefault(); // Stop mobile scrolling
    }

    function onDragMove(e: MouseEvent | TouchEvent) {
        if (!isDragging || !draggedTokenId || !mapContainer || !activeMap)
            return;

        const clientX =
            "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY =
            "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const rect = mapContainer.getBoundingClientRect();

        // Calculate new center in pixels relative to container
        let newX = clientX - rect.left - grabOffsetX;
        let newY = clientY - rect.top - grabOffsetY;

        // Constrain to container
        newX = Math.max(0, Math.min(newX, rect.width));
        newY = Math.max(0, Math.min(newY, rect.height));

        // Convert to percentages for responsive scaling
        const pctX = (newX / rect.width) * 100;
        const pctY = (newY / rect.height) * 100;

        // Optimistic local update
        const updatedTokens = tokens.map((t) =>
            t.id === draggedTokenId ? { ...t, x: pctX, y: pctY } : t,
        );

        // Note: in a real app holding this state locally then flushing on `drop` is better for performance.
        // For MVP Svelte is fast enough to handle this reactive update on small arrays.
        activeMap.tokens = updatedTokens;
    }

    function onDragEnd() {
        if (isDragging && activeMap) {
            // Flush to IDB
            updateMapTokens(activeMap.id, activeMap.tokens);
        }
        isDragging = false;
        draggedTokenId = null;
    }

    function deleteToken(id: string) {
        if (!activeMap) return;
        updateMapTokens(
            activeMap.id,
            tokens.filter((t) => t.id !== id),
        );
    }

    function updateTokenColor(id: string, color: string) {
        if (!activeMap) return;
        updateMapTokens(
            activeMap.id,
            tokens.map((t) => (t.id === id ? { ...t, color } : t)),
        );
    }

    function rotateToken(id: string, degrees: number) {
        if (!activeMap) return;
        updateMapTokens(
            activeMap.id,
            tokens.map((t) => {
                if (t.id === id) {
                    const currentRot = t.rotation || 0;
                    return { ...t, rotation: (currentRot + degrees) % 360 };
                }
                return t;
            }),
        );
    }

    // --- Journey Logic ---
    function setGrid(hex: boolean) {
        if (!activeMap) return;
        updateJourneySettings(activeMap.id, { showHexGrid: hex });
    }

    function setWeather(weather: "none" | "rain" | "fog") {
        if (!activeMap) return;
        updateJourneySettings(activeMap.id, { weather });
    }

    function setTime(timeOfDay: "day" | "night" | "dusk") {
        if (!activeMap) return;
        updateJourneySettings(activeMap.id, { timeOfDay });
    }
</script>

<svelte:window
    on:mousemove={onDragMove}
    on:mouseup={onDragEnd}
    on:touchmove={onDragMove}
    on:touchend={onDragEnd}
/>

<div class="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
    <!-- Header -->
    <header
        class="border-b border-[var(--tavern-accent-gold)]/20 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0"
    >
        <div>
            <h1
                class="text-4xl font-serif text-[var(--tavern-accent-gold)] mb-2 tracking-wide"
            >
                The Cartographer
            </h1>
            <p class="text-[var(--tavern-text-main)]/60">
                Upload maps, place tokens, and visualize the battlefield.
            </p>
        </div>

        <div class="flex flex-wrap gap-2 w-full md:w-auto items-center">
            <!-- Map Selector Dropdown -->
            <select
                value={$mapStore.activeMapId || ""}
                onchange={(e) => setActiveMap(e.currentTarget.value || null)}
                class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--tavern-accent-gold)]"
            >
                <option value="">-- Select Map --</option>
                {#each $mapStore.maps as map}
                    <option value={map.id}>{map.name}</option>
                {/each}
            </select>

            <input
                type="file"
                accept="image/*"
                class="hidden"
                bind:this={fileInput}
                onchange={handleUpload}
            />

            <button
                onclick={() => fileInput.click()}
                class="bg-[var(--tavern-bg-panel)] hover:bg-[var(--tavern-bg-base)] text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-gold)]/50 px-4 py-2 rounded transition-colors text-sm font-medium whitespace-nowrap"
                >Upload Map</button
            >

            {#if activeMap}
                <button
                    onclick={() => {
                        if (confirm("Delete map and all tokens?"))
                            removeMap(activeMap.id);
                    }}
                    class="text-xs px-2 py-2 text-red-400/50 hover:text-red-400 transition-colors"
                    >Delete</button
                >
            {/if}
        </div>
    </header>

    <!-- Main Work Area -->
    <div class="flex-1 flex flex-col min-h-0 relative">
        {#if $mapStore.loading}
            <div
                class="absolute inset-0 flex items-center justify-center bg-[var(--tavern-bg-base)]/80 z-50 rounded-xl"
            >
                <span class="text-[var(--tavern-accent-gold)] animate-pulse"
                    >Unrolling parchment...</span
                >
            </div>
        {/if}

        {#if !activeMap}
            <div
                class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--tavern-accent-gold)]/20 rounded-xl p-12 text-center text-[var(--tavern-text-main)]/40 h-full"
            >
                <span class="text-6xl mb-4 opacity-20">🗺️</span>
                Upload an image or select an<br />existing map to begin
                charting.

                <button
                    onclick={() => fileInput.click()}
                    class="mt-6 px-6 py-2 bg-[var(--tavern-bg-base)] rounded-lg border border-[var(--tavern-accent-gold)]/30 hover:border-[var(--tavern-accent-gold)]/70 transition-colors text-[var(--tavern-accent-gold)]"
                    >Select Image File</button
                >
            </div>
        {:else}
            <!-- Map Toolbar -->
            <div
                class="bg-[var(--tavern-bg-panel)] border border-[var(--tavern-accent-gold)]/20 rounded-t-xl p-2 flex flex-col items-center md:flex-row gap-4 shrink-0"
            >
                <div class="flex gap-2">
                    <button
                        onclick={addToken}
                        class="bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white px-3 py-1.5 rounded transition-colors text-xs font-medium border border-[var(--tavern-accent-red)] flex items-center gap-1"
                    >
                        <span class="text-base leading-none mb-0.5">+</span> Add
                        Token
                    </button>
                    <!-- Spell Area Button -->
                    <button
                        onclick={() => {
                            const type = prompt(
                                "Shape (circle, cone, square, line)?",
                                "circle",
                            );
                            if (
                                type &&
                                ["circle", "cone", "square", "line"].includes(
                                    type.trim().toLowerCase(),
                                )
                            ) {
                                addSpellArea(type.trim().toLowerCase() as any);
                            }
                        }}
                        class="bg-[var(--tavern-accent-gold)]/20 hover:bg-[var(--tavern-accent-gold)]/30 text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-gold)]/50 px-3 py-1.5 rounded transition-colors text-xs font-medium flex items-center gap-1"
                    >
                        <span class="text-base leading-none mb-0.5">✨</span> Add
                        Spell Area
                    </button>
                    <!-- Lore Pin Button -->
                    <button
                        onclick={addLorePin}
                        class="bg-[var(--tavern-accent-gold)]/20 hover:bg-[var(--tavern-accent-gold)]/30 text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-gold)]/50 px-3 py-1.5 rounded transition-colors text-xs font-medium flex items-center gap-1"
                    >
                        <span class="text-base leading-none mb-0.5">📌</span> Add
                        Pin
                    </button>
                    <!-- Grid Toggle -->
                    <div
                        class="flex bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 rounded overflow-hidden"
                    >
                        <button
                            onclick={() => setGrid(false)}
                            class="px-2 py-1 text-xs transition-colors {activeMap.showHexGrid
                                ? 'text-[var(--tavern-text-main)]/40 hover:bg-[var(--tavern-accent-gold)]/10'
                                : 'bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)]'}"
                            >Square</button
                        >
                        <button
                            onclick={() => setGrid(true)}
                            class="px-2 py-1 text-xs transition-colors {activeMap.showHexGrid
                                ? 'bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)]'
                                : 'text-[var(--tavern-text-main)]/40 hover:bg-[var(--tavern-accent-gold)]/10'}"
                            >Hex</button
                        >
                    </div>
                </div>

                <!-- Environment Controls -->
                <div
                    class="flex items-center gap-2 border-l border-[var(--tavern-accent-gold)]/20 pl-4"
                >
                    <span
                        class="text-[0.6rem] text-[var(--tavern-text-main)]/40 uppercase tracking-widest mr-1"
                        >Time</span
                    >
                    <select
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1 text-xs text-[var(--tavern-text-main)] focus:outline-none"
                        value={activeMap.timeOfDay || "day"}
                        onchange={(e) => setTime(e.currentTarget.value as any)}
                    >
                        <option value="day">Day</option>
                        <option value="dusk">Dusk</option>
                        <option value="night">Night</option>
                    </select>

                    <span
                        class="text-[0.6rem] text-[var(--tavern-text-main)]/40 uppercase tracking-widest ml-2 mr-1"
                        >Weather</span
                    >
                    <select
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1 text-xs text-[var(--tavern-text-main)] focus:outline-none"
                        value={activeMap.weather || "none"}
                        onchange={(e) =>
                            setWeather(e.currentTarget.value as any)}
                    >
                        <option value="none">Clear</option>
                        <option value="rain">Rain</option>
                        <option value="fog">Fog</option>
                    </select>
                </div>

                <!-- A minimal legend/info -->
                <div
                    class="ml-auto text-[0.65rem] text-[var(--tavern-text-main)]/40 uppercase tracking-widest hidden lg:flex items-center"
                >
                    Drag to move • Right click to edit
                </div>
            </div>

            <!-- Interactive Map Container -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                bind:this={mapContainer}
                class="flex-1 bg-[var(--tavern-bg-dark)] border-x border-b border-[var(--tavern-accent-gold)]/20 rounded-b-xl overflow-hidden relative group"
                onmousedown={handleMapMouseDown}
                ontouchstart={handleMapMouseDown}
                onmouseup={handleMapMouseUp}
                ontouchend={handleMapMouseUp}
                onmouseleave={handleMapMouseUp}
                oncontextmenu={(e) => {
                    // Only prevent default on the map itself if they click and hold, or just let default happen
                    // Actually, we disable right click on the map to prevent context menu popping up when missing a token.
                    // But maybe we want the browser default context menu? Let's just suppress it for cleaner UI.
                    if (!(e.target as HTMLElement).closest(".cursor-grab")) {
                        e.preventDefault();
                    }
                }}
            >
                {#if $mapStore.activeMapUrl}
                    <!-- Background Image -->
                    <img
                        bind:this={bgImageRef}
                        src={$mapStore.activeMapUrl}
                        alt={activeMap.name}
                        class="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-90 transition-all duration-700
                            {activeMap.timeOfDay === 'night'
                            ? 'brightness-50 sepia-[.3] contrast-125 hue-rotate-180'
                            : ''}
                            {activeMap.timeOfDay === 'dusk'
                            ? 'sepia-[.5] brightness-75 hue-rotate-[-15deg]'
                            : ''}"
                    />

                    <!-- Grid Overlay MVP -->
                    {#if activeMap.showHexGrid}
                        <!-- Hex Grid -->
                        <div
                            class="absolute inset-0 pointer-events-none opacity-20"
                            style="background-image: url('data:image/svg+xml,%3Csvg width=\'55\' height=\'95\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M27.5 0l27.5 15.8v31.7L27.5 63.3 0 47.5V15.8z\' fill=\'none\' stroke=\'%23ffffff\' stroke-opacity=\'1\' stroke-width=\'2\'/%3E%3Cpath d=\'M27.5 95l27.5-15.8V47.5L27.5 31.7 0 47.5v31.7z\' fill=\'none\' stroke=\'%23ffffff\' stroke-opacity=\'1\' stroke-width=\'2\'/%3E%3C/svg%3E'); background-size: 55px 95px;"
                        ></div>
                    {:else}
                        <!-- Square Grid -->
                        <div
                            class="absolute inset-0 pointer-events-none opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0zOSAzOVYxaC0zOHYzOHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIvPjwvc3ZnPg==')]"
                        ></div>
                    {/if}

                    <!-- Weather Overlays -->
                    {#if activeMap.weather === "rain"}
                        <div
                            class="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen bg-repeat bg-[length:100px_100px]"
                            style="background-image: url('data:image/svg+xml,%3Csvg width=\'20\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M10 0l-5 100\' stroke=\'%23fff\' stroke-width=\'1\' opacity=\'0.5\'/%3E%3C/svg%3E'); animation: fall 0.5s linear infinite;"
                        ></div>
                        <style>
                            @keyframes fall {
                                to {
                                    background-position: -20px 100px;
                                }
                            }
                        </style>
                    {/if}
                    {#if activeMap.weather === "fog"}
                        <div
                            class="absolute inset-0 pointer-events-none opacity-[0.25] mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/dust.png')] bg-repeat"
                            style="animation: drift 60s linear infinite;"
                        ></div>
                        <style>
                            @keyframes drift {
                                to {
                                    background-position: 1000px 0;
                                }
                            }
                        </style>
                    {/if}

                    <!-- Pings Layer -->
                    <div class="absolute inset-0 z-30 pointer-events-none">
                        {#each pings as ping (ping.id)}
                            <div
                                class="absolute w-12 h-12 bg-red-500/30 rounded-full animate-ping pointer-events-none"
                                style="left: {ping.x}%; top: {ping.y}%; transform: translate(-50%, -50%);"
                            ></div>
                            <div
                                class="absolute w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red] pointer-events-none"
                                style="left: {ping.x}%; top: {ping.y}%; transform: translate(-50%, -50%);"
                            ></div>
                        {/each}
                    </div>

                    <!-- Tokens Layer -->
                    <div class="absolute inset-0 z-10">
                        {#each tokens as token (token.id)}
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="absolute shadow-[0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-grab active:cursor-grabbing font-bold text-white text-xs select-none transition-shadow {token.name ===
                                'The Party'
                                    ? 'border-2 border-[#ffdf00] z-20'
                                    : 'border-2 border-white/50 z-10'}
                                    {token.shape
                                    ? 'border-0 shadow-none'
                                    : 'rounded-full'}"
                                class:shadow-[0_0_15px_rgba(255,255,255,0.8)]={draggedTokenId ===
                                    token.id}
                                style="
                                   width: {token.shape === 'line'
                                    ? token.size * 40
                                    : 40 * (token.size || 1)}px;
                                   height: {token.shape === 'line'
                                    ? 40
                                    : 40 * (token.size || 1)}px;
                                   left: {token.x}%; 
                                   top: {token.y}%; 
                                   background-color: {token.color};
                                   transform: translate(-50%, -50%) rotate({token.rotation ||
                                    0}deg);
                                   z-index: {draggedTokenId === token.id
                                    ? 50
                                    : token.name === 'The Party'
                                      ? 20
                                      : 10};
                                   {token.shape === 'circle'
                                    ? 'border-radius: 50%; opacity: 0.8;'
                                    : ''}
                                   {token.shape === 'square'
                                    ? 'border-radius: 0%; opacity: 0.8;'
                                    : ''}
                                   {token.shape === 'line'
                                    ? 'border-radius: 0%; opacity: 0.8;'
                                    : ''}
                                   {token.shape === 'cone'
                                    ? 'border-radius: 0%; opacity: 0.8; clip-path: polygon(50% 100%, 0 0, 100% 0);'
                                    : ''}
                                   {token.shape === 'pin'
                                    ? 'clip-path: polygon(50% 100%, 0 0, 100% 0); border-radius: 50% 50% 0 0; opacity: 1; border: none; background: transparent; transform: translate(-50%, -100%) rotate(' +
                                      (token.rotation || 0) +
                                      'deg);'
                                    : ''}
                                "
                                onmousedown={(e) => startDrag(e, token)}
                                ontouchstart={(e) => startDrag(e, token)}
                                oncontextmenu={(e) => {
                                    e.preventDefault();
                                    const action = prompt(
                                        `Edit [${token.name}]\n1 = Delete Token\n2 = Change Color to Blue\n3 = Change Color to Green\n4 = Change Color to Red\n5 = Rotate +45°\n6 = Rotate -45°`,
                                        "1",
                                    );
                                    if (action === "1") deleteToken(token.id);
                                    if (action === "2")
                                        updateTokenColor(
                                            token.id,
                                            token.shape
                                                ? "rgba(37, 99, 235, 0.4)"
                                                : "#2563eb",
                                        );
                                    if (action === "3")
                                        updateTokenColor(
                                            token.id,
                                            token.shape
                                                ? "rgba(22, 163, 74, 0.4)"
                                                : "#16a34a",
                                        );
                                    if (action === "4")
                                        updateTokenColor(
                                            token.id,
                                            token.shape
                                                ? "rgba(239, 68, 68, 0.4)"
                                                : "var(--tavern-accent-red)",
                                        );
                                    if (action === "5")
                                        rotateToken(token.id, 45);
                                    if (action === "6")
                                        rotateToken(token.id, -45);
                                }}
                            >
                                {#if token.shape === "pin"}
                                    <span class="text-2xl drop-shadow-md"
                                        >📍</span
                                    >
                                {:else if token.shape}
                                    {""}
                                {:else}
                                    {token.name.substring(0, 2).toUpperCase()}
                                {/if}
                                <!-- Tooltip MVP -->
                                <div
                                    class="absolute top-full mt-1 bg-black/80 px-2 py-0.5 rounded text-[0.6rem] whitespace-nowrap opacity-0 md:group-hover:opacity-100 font-sans tracking-wide"
                                >
                                    {token.name}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>
