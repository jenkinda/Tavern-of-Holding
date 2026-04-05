import { writable } from 'svelte/store';
import type { ChatMessage } from '../../types/models';

export const chatStore = writable<ChatMessage[]>([]);

export function pushChatMessage(msg: ChatMessage) {
    chatStore.update(s => {
        const next = [...s, msg];
        if (next.length > 100) return next.slice(-100);
        return next;
    });
}

export function clearChat() {
    chatStore.set([]);
}
