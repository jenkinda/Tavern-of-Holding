import { writable, get } from 'svelte/store';
import type { Campaign, Session, UUID } from '../../types/models';
import { getCampaigns, saveCampaign, deleteCampaign, getSessionsForCampaign, saveSession, deleteSession } from '../../core/storage/db';

// ------------------------------------------------------------------
// State Types
// ------------------------------------------------------------------
interface CampaignState {
    campaigns: Campaign[];
    activeCampaignId: UUID | null;
    loading: boolean;
    error: string | null;
}

interface SessionState {
    sessions: Session[];
    activeSessionId: UUID | null;
    loading: boolean;
    error: string | null;
}

// ------------------------------------------------------------------
// Stores
// ------------------------------------------------------------------
export const campaignStore = writable<CampaignState>({
    campaigns: [],
    activeCampaignId: null,
    loading: true,
    error: null
});

export const sessionStore = writable<SessionState>({
    sessions: [],
    activeSessionId: null,
    loading: false,
    error: null
});

// ------------------------------------------------------------------
// Actions (Campaigns)
// ------------------------------------------------------------------
export async function loadCampaigns() {
    campaignStore.update(s => ({ ...s, loading: true }));
    try {
        const campaigns = await getCampaigns();

        // Auto-select first campaign if none selected and some exist
        const state = get(campaignStore);
        let activeId = state.activeCampaignId;
        if (!activeId && campaigns.length > 0) {
            activeId = campaigns[0].id;
            // Load sessions for auto-selected campaign
            loadSessions(activeId);
        }

        campaignStore.update(s => ({ ...s, campaigns, activeCampaignId: activeId, loading: false }));
    } catch (err: any) {
        campaignStore.update(s => ({ ...s, error: err.message, loading: false }));
    }
}

export async function createTreeOfLife(name: string) {
    const newCampaign: Campaign = {
        id: crypto.randomUUID(),
        name,
        createdAt: Date.now()
    };

    await saveCampaign(newCampaign);

    campaignStore.update(s => {
        const campaigns = [...s.campaigns, newCampaign];
        return { ...s, campaigns, activeCampaignId: newCampaign.id };
    });

    // Clear old sessions and load empty list for new compaign
    loadSessions(newCampaign.id);
}

export async function removeCampaign(id: UUID) {
    await deleteCampaign(id);
    campaignStore.update(s => {
        const campaigns = s.campaigns.filter(c => c.id !== id);
        let activeId = s.activeCampaignId;
        if (activeId === id) {
            activeId = campaigns.length > 0 ? campaigns[0].id : null;
            if (activeId) loadSessions(activeId);
            else sessionStore.update(ss => ({ ...ss, sessions: [], activeSessionId: null }));
        }
        return { ...s, campaigns, activeCampaignId: activeId };
    });
}

export function setActiveCampaign(id: UUID) {
    campaignStore.update(s => ({ ...s, activeCampaignId: id }));
    loadSessions(id);
}

// ------------------------------------------------------------------
// Actions (Sessions)
// ------------------------------------------------------------------
export async function loadSessions(campaignId: UUID) {
    sessionStore.update(s => ({ ...s, loading: true, sessions: [], activeSessionId: null }));
    try {
        const sessions = await getSessionsForCampaign(campaignId);
        // Sort by date descending
        sessions.sort((a, b) => b.date - a.date);

        // Auto-select most recent
        const activeSessionId = sessions.length > 0 ? sessions[0].id : null;
        sessionStore.update(s => ({ ...s, sessions, activeSessionId, loading: false }));
    } catch (err: any) {
        sessionStore.update(s => ({ ...s, error: err.message, loading: false }));
    }
}

export async function createSession(campaignId: UUID, name: string) {
    const newSession: Session = {
        id: crypto.randomUUID(),
        campaignId,
        name,
        date: Date.now()
    };

    await saveSession(newSession);

    sessionStore.update(s => {
        const sessions = [newSession, ...s.sessions];
        return { ...s, sessions, activeSessionId: newSession.id };
    });
}

export async function removeSession(id: UUID) {
    await deleteSession(id);
    sessionStore.update(s => {
        const sessions = s.sessions.filter(sess => sess.id !== id);
        let activeId = s.activeSessionId;
        if (activeId === id) {
            activeId = sessions.length > 0 ? sessions[0].id : null;
        }
        return { ...s, sessions, activeSessionId: activeId };
    });
}

export function setActiveSession(id: UUID) {
    sessionStore.update(s => ({ ...s, activeSessionId: id }));
}
