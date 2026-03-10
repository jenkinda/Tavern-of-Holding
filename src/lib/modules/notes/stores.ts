import { writable, get } from 'svelte/store';
import type { Note, UUID } from '../../types/models';
import { getNotesForCampaign, saveNote, deleteNote } from '../../core/storage/db';
import { campaignStore } from '../campaigns/stores';

interface NotesState {
    notes: Note[];
    activeNoteId: UUID | null;
    loading: boolean;
    error: string | null;
    searchQuery: string;
}

export const notesStore = writable<NotesState>({
    notes: [],
    activeNoteId: null,
    loading: false,
    error: null,
    searchQuery: ""
});

// ------------------------------------------------------------------
// Actions
// ------------------------------------------------------------------
export async function loadNotes() {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) {
        notesStore.update(s => ({ ...s, notes: [], activeNoteId: null }));
        return;
    }

    notesStore.update(s => ({ ...s, loading: true }));
    try {
        const notes = await getNotesForCampaign(campaignId);
        // Sort by updated descending
        notes.sort((a, b) => b.updatedAt - a.updatedAt);

        notesStore.update(s => ({ ...s, notes, loading: false }));
    } catch (err: any) {
        notesStore.update(s => ({ ...s, error: err.message, loading: false }));
    }
}

export async function createNote(title: string = "New Note") {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) return;

    const newNote: Note = {
        id: crypto.randomUUID(),
        campaignId,
        title,
        content: "",
        tags: [],
        updatedAt: Date.now()
    };

    await saveNote(newNote);

    notesStore.update(s => {
        const notes = [newNote, ...s.notes];
        return { ...s, notes, activeNoteId: newNote.id };
    });
}

export async function updateNote(noteId: UUID, updates: Partial<Note>) {
    const state = get(notesStore);
    const existing = state.notes.find(n => n.id === noteId);
    if (!existing) return;

    const updatedNote = { ...existing, ...updates, updatedAt: Date.now() };
    await saveNote(updatedNote);

    notesStore.update(s => {
        const notes = s.notes.map(n => n.id === noteId ? updatedNote : n);
        // re-sort
        notes.sort((a, b) => b.updatedAt - a.updatedAt);
        return { ...s, notes };
    });
}

export async function removeNote(id: UUID) {
    await deleteNote(id);
    notesStore.update(s => {
        const notes = s.notes.filter(n => n.id !== id);
        let activeId = s.activeNoteId;
        if (activeId === id) {
            activeId = null;
        }
        return { ...s, notes, activeNoteId: activeId };
    });
}

export function setActiveNote(id: UUID | null) {
    notesStore.update(s => ({ ...s, activeNoteId: id }));
}

export function setSearchQuery(query: string) {
    notesStore.update(s => ({ ...s, searchQuery: query }));
}

// Subscribe to campaign changes to reload notes
campaignStore.subscribe((state) => {
    // Basic reactvity: if campaign changes, reload notes.
    // Setting a timeout prevents too many rapid calls during init
    setTimeout(loadNotes, 0);
});
