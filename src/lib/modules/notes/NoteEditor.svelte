<script lang="ts">
    import { onMount } from "svelte";
    import { marked } from "marked";
    import {
        notesStore,
        loadNotes,
        createNote,
        updateNote,
        removeNote,
        setActiveNote,
        setSearchQuery,
    } from "./stores";

    let newTagInput = $state("");

    onMount(() => {
        loadNotes();
    });

    // Create a computed list of notes based on search query
    let filteredNotes = $derived(
        $notesStore.notes.filter((note) => {
            const q = $notesStore.searchQuery.toLowerCase();
            if (!q) return true;
            return (
                note.title.toLowerCase().includes(q) ||
                note.content.toLowerCase().includes(q) ||
                note.tags.some((t) => t.toLowerCase().includes(q))
            );
        }),
    );

    let activeNote = $derived(
        $notesStore.notes.find((n) => n.id === $notesStore.activeNoteId),
    );

    // Wiki-link and Dice parser hook for marked.js
    const renderer = new marked.Renderer();
    const originalText = renderer.text.bind(renderer);
    renderer.text = (token: any) => {
        const rawText = typeof token === "string" ? token : token.text || "";

        // 1. Parse Dice Rolls: [[1d20+4]]
        let parsedText = rawText.replace(
            /\[\[(\d*d\d+(?:[\+\-]\d+)?)\]\]/gi,
            (match: string, p1: string) => {
                return `<button class="inline-dice-roll bg-[var(--tavern-accent-red)]/20 text-[var(--tavern-accent-red)] border border-[var(--tavern-accent-red)]/50 px-1 rounded hover:bg-[var(--tavern-accent-red)]/40 transition-colors cursor-pointer font-mono font-bold text-xs" data-roll="${p1.toLowerCase()}" title="Roll ${p1.toLowerCase()}">🎲 ${p1.toLowerCase()}</button>`;
            },
        );

        // 2. Parse Wiki Links (anything remaining in brackets)
        parsedText = parsedText.replace(
            /\[\[(.*?)\]\]/g,
            (match: string, p1: string) => {
                return `<span class="wiki-link text-[var(--tavern-accent-gold)] underline underline-offset-4 cursor-pointer hover:text-[#e0bb70] font-medium" data-term="${p1}">${match}</span>`;
            },
        );
        return originalText({ ...token, text: parsedText });
    };
    marked.setOptions({ renderer });

    let parsedContent = $derived(activeNote ? marked(activeNote.content) : "");

    let isEditing = $state(true);

    // Draft states to prevent cursor jumping
    let draftTitle = $state("");
    let draftContent = $state("");
    let debounceTimeout: ReturnType<typeof setTimeout>;

    // Sync draft states when active note changes
    $effect(() => {
        if (activeNote) {
            draftTitle = activeNote.title;
            draftContent = activeNote.content;
        } else {
            draftTitle = "";
            draftContent = "";
        }
    });

    function handleAddTag() {
        if (!activeNote || !newTagInput.trim()) return;
        const tag = newTagInput.trim().toLowerCase();
        if (!activeNote.tags.includes(tag)) {
            updateNote(activeNote.id, { tags: [...activeNote.tags, tag] });
        }
        newTagInput = "";
    }

    function handleRemoveTag(tagToRemove: string) {
        if (!activeNote) return;
        updateNote(activeNote.id, {
            tags: activeNote.tags.filter((t) => t !== tagToRemove),
        });
    }

    function handleContentChange(e: Event) {
        if (!activeNote) return;
        const target = e.target as HTMLTextAreaElement;
        draftContent = target.value;

        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            if (activeNote && activeNote.content !== draftContent) {
                updateNote(activeNote.id, { content: draftContent });
            }
        }, 500);
    }

    function handleTitleChange(e: Event) {
        if (!activeNote) return;
        const target = e.target as HTMLInputElement;
        draftTitle = target.value;

        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            if (activeNote && activeNote.title !== draftTitle) {
                updateNote(activeNote.id, { title: draftTitle });
            }
        }, 500);
    }

    function formatDate(ms: number) {
        return new Date(ms).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    let toastMsg = $state("");
    let toastTimeout: ReturnType<typeof setTimeout>;

    function showToast(msg: string) {
        toastMsg = msg;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastMsg = "";
        }, 4000);
    }

    function executeInlineRoll(rollStr: string) {
        const match = rollStr.match(/(\d*)d(\d+)(?:([\+\-])(\d+))?/i);
        if (!match) return;

        const count = parseInt(match[1]) || 1;
        const sides = parseInt(match[2]);
        const op = match[3];
        const mod = parseInt(match[4]) || 0;

        let total = 0;
        let rolls = [];
        for (let i = 0; i < count; i++) {
            const r = Math.floor(Math.random() * sides) + 1;
            rolls.push(r);
            total += r;
        }

        if (op === "+") total += mod;
        if (op === "-") total -= mod;

        const modStr = op ? ` ${op} ${mod}` : "";
        showToast(`🎲 ${rollStr} ➔ [${rolls.join(", ")}]${modStr} = ${total}`);
    }

    function handleProseClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        const diceBtn = target.closest(".inline-dice-roll");
        if (diceBtn) {
            const rollStr = diceBtn.getAttribute("data-roll");
            if (rollStr) executeInlineRoll(rollStr);
        }
    }
</script>

<div class="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
    <!-- Header & Search -->
    <header
        class="border-b border-[var(--tavern-accent-gold)]/20 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0"
    >
        <div>
            <h1
                class="text-4xl font-serif text-[var(--tavern-accent-gold)] mb-2 tracking-wide"
            >
                Lore & Ledger
            </h1>
            <p class="text-[var(--tavern-text-main)]/60">
                Record your world's history, NPCs, and secrets.
            </p>
        </div>

        <div class="flex gap-2 w-full md:w-auto">
            <input
                type="text"
                placeholder="Search notes or tags..."
                value={$notesStore.searchQuery}
                oninput={(e) => setSearchQuery(e.currentTarget.value)}
                class="flex-1 md:w-64 bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--tavern-accent-gold)] transition-colors"
            />
            <button
                onclick={() => {
                    createNote();
                    isEditing = true;
                }}
                class="bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white px-4 py-2 rounded transition-colors text-sm font-medium whitespace-nowrap"
                >+ New Entry</button
            >
        </div>
    </header>

    <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        <!-- Notes Index Sidebar -->
        <section
            class="lg:col-span-1 bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg flex flex-col min-h-0 overflow-hidden"
        >
            <div
                class="p-4 border-b border-[var(--tavern-accent-gold)]/20 bg-[var(--tavern-bg-base)]/30"
            >
                <h2 class="font-serif text-[var(--tavern-accent-gold)]">
                    Index
                </h2>
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
                {#if $notesStore.loading}
                    <div
                        class="text-center py-8 text-[var(--tavern-accent-gold)]/50 animate-pulse text-sm"
                    >
                        Searching archives...
                    </div>
                {:else if filteredNotes.length === 0}
                    <div
                        class="text-center py-8 text-[var(--tavern-text-main)]/40 text-xs italic"
                    >
                        No entries found.
                    </div>
                {:else}
                    {#each filteredNotes as note (note.id)}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_interactive_supports_focus -->
                        <div
                            class="p-3 rounded cursor-pointer border-l-2 transition-colors
                               {$notesStore.activeNoteId === note.id
                                ? 'bg-[var(--tavern-bg-base)] border-[var(--tavern-accent-gold)] text-[var(--tavern-accent-gold)]'
                                : 'border-transparent hover:bg-[var(--tavern-bg-base)]/50 text-[var(--tavern-text-main)]/80'}"
                            onclick={() => setActiveNote(note.id)}
                            role="button"
                        >
                            <div class="font-medium truncate text-sm mb-1">
                                {note.title || "Untitled Entry"}
                            </div>
                            <div class="flex gap-1 overflow-hidden">
                                {#each note.tags.slice(0, 3) as tag}
                                    <span
                                        class="text-[0.6rem] bg-[var(--tavern-accent-gold)]/10 text-[var(--tavern-accent-gold)] px-1.5 py-0.5 rounded uppercase"
                                        >{tag}</span
                                    >
                                {/each}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </section>

        <!-- Note Editor / Viewer -->
        <section
            class="lg:col-span-3 bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/10 shadow-lg flex flex-col min-h-0 overflow-hidden relative"
        >
            {#if !activeNote}
                <div
                    class="flex-1 flex items-center justify-center p-12 text-[var(--tavern-text-main)]/40 text-center flex-col"
                >
                    <span class="text-4xl opacity-20 mb-4">📜</span>
                    <p>
                        Select an entry from the index,<br />or transcribe a new
                        one.
                    </p>
                </div>
            {:else}
                <!-- Editor Header -->
                <div
                    class="p-5 border-b border-[var(--tavern-accent-gold)]/20 bg-[var(--tavern-bg-base)]/50 shrink-0"
                >
                    <div class="flex justify-between items-start mb-4">
                        <input
                            type="text"
                            value={draftTitle}
                            oninput={handleTitleChange}
                            class="text-2xl font-serif text-[var(--tavern-accent-gold)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--tavern-accent-gold)]/50 rounded px-1 w-full font-medium"
                            placeholder="Entry Title..."
                        />

                        <div class="flex gap-2 ml-4 shrink-0">
                            <button
                                onclick={() => (isEditing = !isEditing)}
                                class="text-xs px-3 py-1.5 border border-[var(--tavern-accent-gold)]/30 rounded hover:bg-[var(--tavern-accent-gold)]/10 transition-colors text-[var(--tavern-accent-gold)]"
                            >
                                {isEditing ? "Preview Mode" : "Edit Mode"}
                            </button>
                        </div>
                    </div>

                    <!-- Tagging Area -->
                    <div class="flex flex-wrap items-center gap-2">
                        <span
                            class="text-xs text-[var(--tavern-text-main)]/40 uppercase tracking-widest mr-1"
                            >Tags:</span
                        >

                        {#each activeNote.tags as tag}
                            <span
                                class="text-xs bg-[var(--tavern-accent-gold)]/10 text-[var(--tavern-accent-gold)] px-2 py-1 rounded flex items-center gap-1 group border border-[var(--tavern-accent-gold)]/20"
                            >
                                #{tag}
                                <button
                                    onclick={() => handleRemoveTag(tag)}
                                    class="opacity-50 hover:opacity-100 hover:text-red-400 focus:outline-none"
                                    >×</button
                                >
                            </span>
                        {/each}

                        <form
                            onsubmit={(e) => {
                                e.preventDefault();
                                handleAddTag();
                            }}
                            class="flex"
                        >
                            <input
                                type="text"
                                bind:value={newTagInput}
                                placeholder="+ Add tag"
                                class="text-xs bg-transparent border-b border-[var(--tavern-accent-gold)]/30 pb-0.5 px-1 w-24 focus:outline-none focus:border-[var(--tavern-accent-gold)] text-[var(--tavern-text-main)]/80 placeholder-[var(--tavern-text-main)]/30"
                            />
                        </form>
                    </div>
                </div>

                <!-- Main Content Body -->
                <div
                    class="flex-1 overflow-y-auto p-5 md:p-8 bg-[var(--tavern-text-main)]/[0.02]"
                >
                    {#if isEditing}
                        <textarea
                            class="w-full h-full min-h-[300px] bg-transparent resize-none focus:outline-none font-mono text-sm leading-relaxed text-[var(--tavern-text-main)]/80 custom-scrollbar"
                            placeholder="Write your lore here using Markdown... Use [[Brackets]] to link to other entries."
                            value={draftContent}
                            oninput={handleContentChange}
                        ></textarea>
                    {:else}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            class="prose prose-invert prose-tavern max-w-none"
                            onclick={handleProseClick}
                        >
                            {@html parsedContent}
                        </div>
                    {/if}
                </div>

                <!-- Footer Metadata -->
                <div
                    class="p-3 border-t border-[var(--tavern-accent-gold)]/10 bg-[var(--tavern-bg-base)] text-[0.65rem] text-[var(--tavern-text-main)]/30 flex justify-between shrink-0"
                >
                    <span>ID: {activeNote.id.substring(0, 8)}...</span>
                    <span>Last Updated: {formatDate(activeNote.updatedAt)}</span
                    >
                </div>

                <!-- Delete Button overlay -->
                <button
                    onclick={() => {
                        if (confirm("Delete this entry forever?"))
                            removeNote(activeNote.id);
                    }}
                    class="absolute bottom-4 right-4 bg-red-900/50 hover:bg-red-800 text-red-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors opacity-30 hover:opacity-100"
                    title="Delete Entry"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><path d="M3 6h18"></path><path
                            d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
                        ></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
                        ></path></svg
                    >
                </button>
            {/if}
        </section>
    </div>
</div>

<!-- Simple Toast for Dice Rolls -->
{#if toastMsg}
    <div
        class="fixed bottom-6 right-6 bg-[var(--tavern-bg-panel)] border border-[var(--tavern-accent-gold)] shadow-[0_4px_20px_rgba(0,0,0,0.5)] rounded-xl p-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 max-w-sm"
    >
        <p class="text-[var(--tavern-accent-gold)] font-mono text-lg">
            {toastMsg}
        </p>
    </div>
{/if}

<style>
    /* Custom Scrollbar for Textarea */
    .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(198, 162, 91, 0.2);
        border-radius: 10px;
    }

    /* Markdown Prose Styling within Svelte */
    :global(.prose-tavern) {
        color: rgba(244, 236, 216, 0.85);
    }
    :global(
            .prose-tavern h1,
            .prose-tavern h2,
            .prose-tavern h3,
            .prose-tavern h4
        ) {
        color: var(--tavern-accent-gold);
        font-family: var(--font-serif);
        font-weight: normal;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        line-height: 1.2;
    }
    :global(.prose-tavern h1) {
        font-size: 2.25em;
        border-bottom: 1px solid rgba(198, 162, 91, 0.2);
        padding-bottom: 0.2em;
    }
    :global(.prose-tavern h2) {
        font-size: 1.75em;
    }
    :global(.prose-tavern h3) {
        font-size: 1.35em;
    }

    :global(.prose-tavern p) {
        margin-bottom: 1.2em;
        line-height: 1.6;
    }
    :global(.prose-tavern strong) {
        color: var(--tavern-text-main);
        font-weight: 600;
    }

    :global(.prose-tavern ul) {
        list-style-type: disc;
        padding-left: 1.5em;
        margin-bottom: 1.2em;
    }
    :global(.prose-tavern ol) {
        list-style-type: decimal;
        padding-left: 1.5em;
        margin-bottom: 1.2em;
    }
    :global(.prose-tavern li) {
        margin-bottom: 0.25em;
    }

    :global(.prose-tavern blockquote) {
        border-left: 3px solid var(--tavern-accent-red);
        padding-left: 1em;
        margin-left: 0;
        margin-right: 0;
        font-style: italic;
        color: rgba(244, 236, 216, 0.6);
        background: rgba(139, 58, 58, 0.05);
        padding-top: 0.5em;
        padding-bottom: 0.5em;
    }
</style>
