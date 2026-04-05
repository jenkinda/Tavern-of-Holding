<script lang="ts">
    import { chatStore } from '../sync/chatStore';
    import { onMount, tick } from 'svelte';
    import type { ChatMessage } from '../../types/models';

    interface Props {
        onSendChat: (text: string) => void;
        currentIdentity: string;
    }
    let { onSendChat, currentIdentity }: Props = $props();

    let chatInput = $state("");
    let chatContainer: HTMLDivElement | undefined = $state();

    // Auto scroll
    $effect(() => {
        if ($chatStore.length > 0) {
            tick().then(() => {
                if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            });
        }
    });

    function handleSend() {
        if (!chatInput.trim()) return;
        onSendChat(chatInput.trim());
        chatInput = "";
    }
</script>

<div class="flex flex-col h-full bg-[var(--tavern-bg-panel)] rounded-xl border border-[var(--tavern-accent-gold)]/20 overflow-hidden">
    <div class="p-2 border-b border-[var(--tavern-accent-gold)]/20 bg-black/30">
        <h3 class="text-xs uppercase tracking-widest text-[var(--tavern-accent-gold)]/80 font-bold">Combat & Activity Log</h3>
    </div>
    
    <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar" bind:this={chatContainer}>
        {#if $chatStore.length === 0}
            <div class="text-center text-xs text-[var(--tavern-text-main)]/30 mt-4 italic">No activity yet.</div>
        {:else}
            {#each $chatStore as msg (msg.id)}
                <div class="text-sm">
                    {#if msg.sender === 'SYSTEM'}
                        <div class="text-xs italic text-[var(--tavern-text-main)]/50 text-center my-2">-- {msg.text} --</div>
                    {:else if msg.sender === 'GM'}
                        <div class="bg-[var(--tavern-accent-red)]/10 border-l-2 border-[var(--tavern-accent-red)] pl-2 py-1 relative mt-1">
                            <span class="font-bold text-[var(--tavern-accent-red)] text-xs uppercase hidden sm:inline-block absolute top-1 right-2 opacity-50">GM</span>
                            <span class="font-bold text-[var(--tavern-text-main)] mr-1">{msg.sender}:</span>
                            <span class="text-[var(--tavern-text-main)] break-words">{msg.text}</span>
                        </div>
                    {:else}
                        <div class="pl-2 py-0.5 border-l-2 border-[var(--tavern-accent-gold)]/30">
                            <span class="font-bold text-[var(--tavern-accent-gold)] mr-1">{msg.sender}:</span>
                            <span class="text-[var(--tavern-text-main)]/90 break-words">{msg.text}</span>
                        </div>
                    {/if}
                </div>
            {/each}
        {/if}
    </div>

    <div class="p-2 border-t border-[var(--tavern-accent-gold)]/20 bg-black/40 flex">
        <input 
            type="text" 
            bind:value={chatInput} 
            placeholder="Type as {currentIdentity}..." 
            class="flex-1 bg-transparent outline-none text-sm text-[var(--tavern-text-main)] px-2"
            onkeypress={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <button 
            class="text-[var(--tavern-accent-gold)] hover:text-white transition-colors p-1"
            onclick={handleSend}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
    </div>
</div>
