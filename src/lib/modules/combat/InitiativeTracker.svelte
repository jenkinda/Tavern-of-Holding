<script lang="ts">
    import ChatPanel from "../../core/components/ChatPanel.svelte";
    import { pushChatMessage } from "../../core/sync/chatStore";
    import {
        encounterStore,
        addCombatant,
        removeCombatant,
        handleDamage,
        handleHeal,
        toggleCond,
        setInitiative,
        nextTurn,
        prevTurn,
        resetEncounter,
        updateHP,
        fetchSavedEncounters,
        saveCurrentEncounter,
        loadEncounter,
        savedEncountersStore,
    } from "./stores";
    import type { CombatantType } from "../../types/models";
    import { onMount } from "svelte";

    onMount(() => {
        fetchSavedEncounters();
    });

    // Local state for the "Add Combatant" form
    let showAddForm = false;
    let newName = "";
    let newType: CombatantType = "npc";
    let newHpMax = 10;
    let newAc = 10;
    let newInitiative = 0;

    // Local state for Quick Edit values (Damage/Heal)
    let quickModifyValues: Record<string, number> = {};

    // Local state for condition duration rounds (-1 is infinite)
    let defaultCondDuration = -1;

    // D&D Beyond Import State
    let showBeyondImport = false;
    let beyondJsonText = "";

    function handleBeyondImport() {
        if (!beyondJsonText.trim()) return;
        try {
            const parsed = JSON.parse(beyondJsonText);
            const data = parsed.data || parsed;

            const pcName = data.name || "Unknown PC";
            const maxHp =
                (data.baseHitPoints || 10) + (data.bonusHitPoints || 0);

            // Rough estimation for AC/Init if present, fallback to 10/0
            let ac = 10;
            // Best effort to find Armor Class in character values (often computed, so raw JSON might not have a simple 'ac' field)
            if (data.characterValues) {
                const acVal = data.characterValues.find(
                    (v: any) => v.typeId === 4,
                ); // 4 is typical AC typeId, just a guess
                if (acVal && acVal.value) ac = acVal.value;
            }

            addCombatant({
                name: pcName,
                type: "pc",
                hp: { current: maxHp, max: maxHp },
                ac: ac,
                initiative: 0,
                conditions: [],
                notes: "Imported from Beyond",
            });

            beyondJsonText = "";
            showBeyondImport = false;
        } catch (e) {
            alert(
                "Failed to parse D&D Beyond JSON. Please ensure you copied the entire raw data.",
            );
        }
    }

    function handleAddSubmit(e: Event) {
        e.preventDefault();
        if (!newName.trim()) return;

        addCombatant({
            name: newName,
            type: newType,
            hp: { current: newHpMax, max: newHpMax },
            ac: newAc,
            initiative: newInitiative,
            conditions: [],
            notes: "",
        });

        newName = "";
        newHpMax = 10;
        showAddForm = false;
    }

    function doDamage(id: string) {
        const val = quickModifyValues[id];
        if (val && val > 0) {
            handleDamage(id, val);
            quickModifyValues[id] = 0;
        }
    }

    function doHeal(id: string) {
        const val = quickModifyValues[id];
        if (val && val > 0) {
            handleHeal(id, val);
            quickModifyValues[id] = 0;
        }
    }

    function handleInlineHp(e: Event, id: string, currentHp: number) {
        const input = e.currentTarget as HTMLInputElement;
        const val = input.value.trim();
        if (!val) {
            input.value = currentHp.toString(); // reset
            return;
        }

        if (val.startsWith("+")) {
            const num = parseInt(val.substring(1));
            if (!isNaN(num)) handleHeal(id, num);
        } else if (val.startsWith("-")) {
            const num = parseInt(val.substring(1));
            if (!isNaN(num)) handleDamage(id, num);
        } else {
            const num = parseInt(val);
            if (!isNaN(num)) updateHP(id, num);
        }

        // Reset input to current value (which will update reactively anyway, but good for blur)
        input.blur();
    }

    const commonConditions = [
        "Blinded",
        "Charmed",
        "Deafened",
        "Frightened",
        "Grappled",
        "Incapacitated",
        "Invisible",
        "Paralyzed",
        "Petrified",
        "Poisoned",
        "Prone",
        "Restrained",
        "Stunned",
        "Unconscious",
    ];
</script>

<div class="flex h-full gap-6">
    <div class="flex-1 flex flex-col space-y-6 animate-in fade-in duration-500 h-full min-w-0 overflow-hidden">
        <!-- Header & Controls -->
    <header
        class="border-b border-[var(--tavern-accent-gold)]/20 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0"
    >
        <div>
            <h1
                class="text-4xl font-serif text-[var(--tavern-accent-gold)] mb-2 tracking-wide"
            >
                The Fray
            </h1>
            <p class="text-[var(--tavern-text-main)]/60">
                Track initiative, health, and conditions during combat.
            </p>
        </div>

        <div
            class="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end"
        >
            <div
                class="px-4 py-1.5 bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded-lg text-center flex items-center justify-center min-w-[100px] mr-2 shadow-inner"
            >
                <span
                    class="text-xs uppercase tracking-widest text-[var(--tavern-text-main)]/50 mr-2"
                    >Round</span
                >
                <span
                    class="text-xl font-serif text-[var(--tavern-accent-gold)] font-bold"
                    >{$encounterStore.round}</span
                >
            </div>

            <button
                onclick={prevTurn}
                class="bg-[var(--tavern-bg-panel)] hover:bg-[var(--tavern-bg-base)] text-[var(--tavern-text-main)]/80 border border-[var(--tavern-accent-gold)]/20 hover:border-[var(--tavern-accent-gold)]/50 px-3 py-2 rounded transition-colors text-sm"
                >◀ Prev Turn</button
            >

            <button
                onclick={nextTurn}
                class="bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white px-5 py-2 rounded transition-colors shadow-[0_0_10px_rgba(139,58,58,0.3)] shadow-lg text-sm font-medium border border-[var(--tavern-accent-red)]"
                >Next Turn ▶</button
            >
        </div>
    </header>

    <!-- Encounter Vault Panel -->
    <div
        class="flex justify-between items-center bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow p-2 shrink-0 px-4"
    >
        <span class="text-sm font-serif text-[var(--tavern-text-main)]/60"
            >Encounter Vault</span
        >
        <div class="flex gap-2 items-center">
            <select
                class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 rounded px-2 py-1 text-xs text-[var(--tavern-text-main)] outline-none min-w-[200px]"
                onchange={(e) => {
                    const val = e.currentTarget.value;
                    if (val) loadEncounter(val);
                    e.currentTarget.value = ""; // reset
                }}
            >
                <option value="" disabled selected>-- Load Encounter --</option>
                {#each $savedEncountersStore as enc}
                    <option value={enc.id}>{enc.name}</option>
                {/each}
            </select>
            <button
                class="text-xs px-3 py-1 bg-emerald-900/30 text-emerald-200 border border-emerald-900 hover:bg-emerald-800/60 rounded"
                onclick={() => {
                    if ($encounterStore.combatants.length === 0) {
                        alert("No combatants to save!");
                        return;
                    }
                    const name = prompt("Name this encounter:");
                    if (name) saveCurrentEncounter(name);
                }}
            >
                Save Present
            </button>
        </div>
    </div>

    <!-- Add Combatant Panel -->
    <section
        class="bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg p-4 shrink-0"
    >
        <div class="flex justify-between items-center mb-2">
            <h2 class="font-serif text-[var(--tavern-accent-gold)]">
                Add Combatant
            </h2>
            <div class="space-x-2">
                <button
                    class="text-xs px-3 py-1 bg-[var(--tavern-bg-base)] rounded border border-[var(--tavern-accent-gold)]/20 hover:text-[var(--tavern-accent-gold)]"
                    onclick={() => {
                        showAddForm = !showAddForm;
                        showBeyondImport = false;
                    }}
                >
                    {showAddForm ? "Hide Form" : "Show Form"}
                </button>
                <button
                    class="text-xs px-3 py-1 bg-blue-900/30 text-blue-200 border border-blue-900 hover:bg-blue-800/60 rounded"
                    onclick={() => {
                        showBeyondImport = !showBeyondImport;
                        showAddForm = false;
                    }}
                >
                    Import Beyond
                </button>
                <button
                    class="text-xs px-3 py-1 bg-red-900/40 text-red-200 rounded border border-red-900 hover:bg-red-800/60"
                    onclick={() => {
                        if (confirm("Clear all combatants?")) resetEncounter();
                    }}
                >
                    Reset All
                </button>
            </div>
        </div>

        {#if showAddForm}
            <form
                class="grid grid-cols-2 md:grid-cols-6 gap-3 pt-3 border-t border-[var(--tavern-accent-gold)]/10 animate-in slide-in-from-top-2"
                onsubmit={handleAddSubmit}
            >
                <div class="col-span-2 md:col-span-2 flex flex-col gap-1">
                    <label
                        for="cname"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Name</label
                    >
                    <input
                        id="cname"
                        type="text"
                        required
                        bind:value={newName}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1 text-sm focus:border-[var(--tavern-accent-gold)] outline-none"
                        placeholder="Goblin, Player, etc."
                    />
                </div>
                <div class="flex flex-col gap-1">
                    <label
                        for="ctype"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Type</label
                    >
                    <select
                        id="ctype"
                        bind:value={newType}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1.5 text-sm focus:border-[var(--tavern-accent-gold)] outline-none"
                    >
                        <option value="pc">Player (PC)</option>
                        <option value="monster">Monster</option>
                        <option value="npc">Ally (NPC)</option>
                    </select>
                </div>
                <div class="flex flex-col gap-1">
                    <label
                        for="chp"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Max HP</label
                    >
                    <input
                        id="chp"
                        type="number"
                        min="1"
                        required
                        bind:value={newHpMax}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1 text-sm focus:border-[var(--tavern-accent-gold)] outline-none text-center"
                    />
                </div>
                <div class="flex flex-col gap-1">
                    <label
                        for="cac"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >AC</label
                    >
                    <input
                        id="cac"
                        type="number"
                        min="1"
                        required
                        bind:value={newAc}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1 text-sm focus:border-[var(--tavern-accent-gold)] outline-none text-center"
                    />
                </div>
                <div class="flex flex-col gap-1">
                    <label
                        for="cinit"
                        class="text-[0.65rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40"
                        >Init Roll</label
                    >
                    <input
                        id="cinit"
                        type="number"
                        required
                        bind:value={newInitiative}
                        class="bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-1 text-sm focus:border-[var(--tavern-accent-gold)] outline-none text-center"
                    />
                </div>
                <div class="col-span-2 md:col-span-6 flex justify-end mt-2">
                    <button
                        type="submit"
                        class="bg-[var(--tavern-accent-gold)]/10 text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-gold)]/30 hover:bg-[var(--tavern-accent-gold)]/20 px-6 py-1.5 rounded transition-colors text-sm font-medium"
                        >Add to Initiative Tracker</button
                    >
                </div>
            </form>
        {/if}

        {#if showBeyondImport}
            <div
                class="pt-3 border-t border-[var(--tavern-accent-gold)]/10 animate-in slide-in-from-top-2"
            >
                <p class="text-xs text-[var(--tavern-text-main)]/60 mb-2">
                    Paste raw JSON data exported from D&D Beyond to quick-add a
                    Party Member.
                </p>
                <textarea
                    bind:value={beyondJsonText}
                    class="w-full h-32 bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded p-2 text-xs font-mono text-[var(--tavern-text-main)]/70 focus:outline-none focus:border-[var(--tavern-accent-gold)]"
                    placeholder={'{"data": { "name": "Thorin", ... }}'}
                ></textarea>
                <div class="flex justify-end mt-2">
                    <button
                        onclick={handleBeyondImport}
                        class="bg-blue-900 text-blue-100 hover:bg-blue-800 px-6 py-1.5 rounded transition-colors text-sm font-medium border border-blue-700"
                        >Import PC</button
                    >
                </div>
            </div>
        {/if}
    </section>

    <!-- Initiative List -->
    <section class="flex-1 overflow-y-auto space-y-3 pb-10">
        {#if $encounterStore.combatants.length === 0}
            <div
                class="flex flex-col items-center justify-center p-12 text-[var(--tavern-text-main)]/30 italic text-center border-2 border-dashed border-[var(--tavern-accent-gold)]/10 rounded-xl"
            >
                <span class="text-4xl mb-4 opacity-30">⚔️</span>
                The fray is silent... for now. <br /> Add combatants to begin.
            </div>
        {/if}

        {#each $encounterStore.combatants as combatant, index (combatant.id)}
            {@const isActive = index === $encounterStore.turnIndex}
            {@const hpPercent = (combatant.hp.current / combatant.hp.max) * 100}

            <div
                class="relative rounded-xl border transition-all duration-300 overflow-hidden group
                      {isActive
                    ? 'bg-[var(--tavern-bg-base)] border-[var(--tavern-accent-red)] shadow-[0_0_20px_rgba(139,58,58,0.2)] scale-[1.01]'
                    : 'bg-[var(--tavern-bg-panel)]/80 border-[var(--tavern-accent-gold)]/10 hover:border-[var(--tavern-accent-gold)]/30'}"
            >
                <!-- Active Indicator Strip -->
                {#if isActive}
                    <div
                        class="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--tavern-accent-red)] shadow-[0_0_8px_var(--tavern-accent-red)]"
                    ></div>
                {/if}

                <div
                    class="p-4 pl-6 flex flex-col lg:flex-row gap-4 lg:items-center"
                >
                    <!-- Basic Info -->
                    <div class="flex items-center gap-4 w-full lg:w-1/4">
                        <!-- Initiative Roll Editor -->
                        <div
                            class="flex flex-col items-center justify-center bg-[var(--tavern-bg-base)] w-12 h-12 rounded-lg border border-[var(--tavern-accent-gold)]/20 shrink-0"
                        >
                            <input
                                type="number"
                                value={combatant.initiative}
                                onchange={(e) =>
                                    setInitiative(
                                        combatant.id,
                                        parseInt(e.currentTarget.value) || 0,
                                    )}
                                class="w-full bg-transparent text-center text-lg font-serif text-[var(--tavern-accent-gold)] font-bold focus:outline-none focus:bg-[var(--tavern-accent-gold)]/10 rounded"
                            />
                            <span
                                class="text-[0.5rem] uppercase tracking-widest text-[var(--tavern-text-main)]/40 -mt-1"
                                >Init</span
                            >
                        </div>

                        <div class="flex-1 overflow-hidden">
                            <h3
                                class="font-bold text-lg text-[var(--tavern-text-main)] truncate flex items-center gap-2"
                            >
                                {combatant.name}
                                {#if combatant.type === "pc"}
                                    <span
                                        class="text-[0.6rem] bg-blue-900/30 text-blue-200 border border-blue-800 px-1 py-0.5 rounded uppercase font-sans"
                                        >PC</span
                                    >
                                {:else if combatant.type === "npc"}
                                    <span
                                        class="text-[0.6rem] bg-emerald-900/30 text-emerald-200 border border-emerald-800 px-1 py-0.5 rounded uppercase font-sans"
                                        >NPC</span
                                    >
                                {:else}
                                    <span
                                        class="text-[0.6rem] bg-red-900/30 text-red-200 border border-red-800 px-1 py-0.5 rounded uppercase font-sans"
                                        >Monster</span
                                    >
                                {/if}
                            </h3>
                            <div
                                class="text-sm text-[var(--tavern-text-main)]/50 flex items-center gap-2"
                            >
                                <span
                                    class="px-1.5 py-0.5 border border-[var(--tavern-accent-gold)]/20 rounded text-[var(--tavern-accent-gold)] bg-[var(--tavern-accent-gold)]/5 text-xs inline-flex items-center"
                                    title="Armor Class"
                                >
                                    🛡️ {combatant.ac}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Health Math -->
                    <div class="w-full lg:w-2/4 flex flex-col gap-2 relative">
                        <div
                            class="flex justify-between text-sm items-end px-1"
                        >
                            <span
                                class="font-medium text-[var(--tavern-text-main)]/70 flex items-baseline gap-1"
                                >HP:
                                <input
                                    type="text"
                                    value={combatant.hp.current}
                                    onchange={(e) =>
                                        handleInlineHp(
                                            e,
                                            combatant.id,
                                            combatant.hp.current,
                                        )}
                                    title="Type -X to damage, +X to heal, or X to set"
                                    class="w-10 bg-transparent text-[var(--tavern-text-main)] font-bold text-base text-right focus:outline-none focus:bg-[var(--tavern-bg-base)] focus:px-1 rounded border border-transparent focus:border-[var(--tavern-accent-gold)]/30"
                                />
                                <span class="text-sm">/ {combatant.hp.max}</span
                                >
                            </span>

                            <div
                                class="flex items-center gap-1 opacity-100 lg:opacity-40 lg:group-hover:opacity-100 transition-opacity"
                            >
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Amt"
                                    bind:value={quickModifyValues[combatant.id]}
                                    class="w-16 bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-2 py-0.5 text-xs text-center focus:outline-none h-7"
                                />
                                <button
                                    onclick={() => doDamage(combatant.id)}
                                    class="bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-900 px-2 py-0.5 rounded text-xs transition-colors h-7 font-medium"
                                    >- Dmg</button
                                >
                                <button
                                    onclick={() => doHeal(combatant.id)}
                                    class="bg-emerald-900/40 hover:bg-emerald-800 text-emerald-200 border border-emerald-900 px-2 py-0.5 rounded text-xs transition-colors h-7 font-medium"
                                    >+ Heal</button
                                >
                            </div>
                        </div>

                        <div
                            class="w-full h-2.5 bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/20 rounded-full overflow-hidden shrink-0"
                        >
                            <!-- Health Bar Coloring -->
                            <div
                                class="h-full rounded-full transition-all duration-500 ease-out flex shadow-inner {hpPercent >
                                50
                                    ? 'bg-emerald-600/80'
                                    : hpPercent > 20
                                      ? 'bg-amber-500/80'
                                      : 'bg-red-600/80'}"
                                style="width: {hpPercent}%"
                            ></div>
                        </div>
                    </div>

                    <!-- Conditions and Removal -->
                    <div
                        class="w-full lg:w-1/4 flex items-center justify-between lg:justify-end gap-2"
                    >
                        <div class="flex flex-wrap gap-1 items-center">
                            {#each combatant.conditions as cond}
                                <button
                                    onclick={() =>
                                        toggleCond(combatant.id, cond.name)}
                                    class="px-1.5 py-0.5 bg-[var(--tavern-accent-red)]/20 border border-[var(--tavern-accent-red)]/50 text-[var(--tavern-text-main)] text-[0.6rem] uppercase tracking-wide rounded hover:bg-[var(--tavern-accent-red)]/40 hover:line-through"
                                    title="Click to remove"
                                    >{cond.name}{cond.duration > 0 ? ` (${cond.duration})` : ''}</button
                                >
                            {/each}

                            <!-- Condition Adder Dropdown -->
                            <div class="relative group inline-block">
                                <button
                                    class="px-1.5 py-0.5 border border-[var(--tavern-accent-gold)]/30 text-[var(--tavern-accent-gold)]/50 hover:text-[var(--tavern-accent-gold)] hover:border-[var(--tavern-accent-gold)] text-xs rounded border-dashed opacity-100 lg:opacity-30 lg:group-hover:opacity-100 transition-opacity"
                                >
                                    + Cond
                                </button>
                                <!-- Dropdown list -->
                                <div
                                    class="absolute bottom-full translate-y-2 lg:bottom-auto lg:top-full left-1/2 -translate-x-1/2 lg:-translate-x-[90%] lg:translate-y-2 mt-1 w-40 bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded shadow-xl hidden group-hover:flex flex-col z-50 overflow-hidden"
                                >
                                    <div class="p-2 border-b border-[var(--tavern-accent-gold)]/20 bg-[var(--tavern-bg-panel)] shrink-0">
                                        <div class="flex flex-col gap-1">
                                            <span class="text-[0.6rem] uppercase text-[var(--tavern-text-main)]/60 tracking-wider">Duration (-1 = ∞)</span>
                                            <input type="number" bind:value={defaultCondDuration} class="w-full bg-[var(--tavern-bg-base)] text-[var(--tavern-text-main)] text-xs px-2 py-1 border border-[var(--tavern-accent-gold)]/30 rounded focus:outline-none focus:border-[var(--tavern-accent-gold)]"/>
                                        </div>
                                    </div>
                                    <div class="max-h-48 overflow-y-auto custom-scrollbar">
                                        {#each commonConditions as c}
                                            <button
                                                class="w-full text-left px-2 py-1.5 text-[0.65rem] hover:bg-[var(--tavern-accent-gold)]/20 {combatant.conditions.some(cond => cond.name === c)
                                                    ? 'text-[var(--tavern-accent-red)]'
                                                    : 'text-[var(--tavern-text-main)]/70'}"
                                                onclick={() =>
                                                    toggleCond(combatant.id, c, defaultCondDuration)}
                                                >{c}</button
                                            >
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onclick={() => {
                                if (confirm(`Remove ${combatant.name}?`))
                                    removeCombatant(combatant.id);
                            }}
                            class="md:ml-2 text-[var(--tavern-text-main)]/20 hover:text-red-400 p-2 shrink-0 transition-colors"
                            title="Remove from Combat">✕</button
                        >
                    </div>
                </div>
            </div>
        {/each}
    </section>
    </div>

    <!-- GM Chat Panel -->
    <div class="w-80 h-full shrink-0 flex flex-col hidden lg:flex">
        <ChatPanel 
            currentIdentity="Game Master" 
            onSendChat={(text) => pushChatMessage({ id: crypto.randomUUID(), sender: 'GM', text, timestamp: Date.now(), color: 'var(--tavern-accent-red)' })} 
        />
    </div>
</div>

<style>
    /* Custom Scrollbar for Dropdown */
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(198, 162, 91, 0.2);
        border-radius: 10px;
    }
</style>
