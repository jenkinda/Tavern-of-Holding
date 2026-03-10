import { writable, get } from 'svelte/store';
import type { MapScene, Token, UUID } from '../../types/models';
import { getMapsForCampaign, saveMap, deleteMap, saveImageBlob, getImageBlob, deleteImageBlob } from '../../core/storage/db';
import { campaignStore } from '../campaigns/stores';

type MapState = {
    maps: MapScene[];
    activeMapId: UUID | null;
    activeMapUrl: string | null;
    loading: boolean;
};

export const mapStore = writable<MapState>({
    maps: [],
    activeMapId: null,
    activeMapUrl: null,
    loading: false
});

// Load all maps for the current campaign
export async function loadMaps() {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) {
        mapStore.update(s => ({ ...s, maps: [], activeMapId: null, activeMapUrl: null }));
        return;
    }

    mapStore.update(s => ({ ...s, loading: true }));
    const maps = await getMapsForCampaign(campaignId);

    mapStore.update(s => {
        // Find if we had an active map, try to keep it active
        let activeMapId = s.activeMapId;
        if (maps.length > 0 && !maps.find(m => m.id === activeMapId)) {
            activeMapId = maps[0].id;
        } else if (maps.length === 0) {
            activeMapId = null;
        }

        return { ...s, maps, activeMapId, loading: false };
    });

    if (get(mapStore).activeMapId) {
        await loadActiveMapBackground();
    }
}

// Set a map as active and load its background blob
export async function setActiveMap(id: UUID | null) {
    mapStore.update(s => ({ ...s, activeMapId: id }));
    if (id) {
        await loadActiveMapBackground();
    } else {
        revokeMapUrl();
    }
}

// Clean up object URLs to prevent memory leaks
function revokeMapUrl() {
    const currentUrl = get(mapStore).activeMapUrl;
    if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
        mapStore.update(s => ({ ...s, activeMapUrl: null }));
    }
}

async function loadActiveMapBackground() {
    const activeId = get(mapStore).activeMapId;
    if (!activeId) return;

    const state = get(mapStore);
    const activeMap = state.maps.find(m => m.id === activeId);
    if (!activeMap) return;

    // Load from IDB using the content id
    const blob = await getImageBlob(activeMap.backgroundId);
    if (blob) {
        revokeMapUrl(); // Cleanup old one
        const url = URL.createObjectURL(blob);
        mapStore.update(s => ({ ...s, activeMapUrl: url }));
    }
}

export async function uploadNewMap(file: File, name: string) {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) return;

    // Save blob separately mapping by a unique ID
    const backgroundId = crypto.randomUUID();
    await saveImageBlob(backgroundId, file);

    const newMap: MapScene = {
        id: crypto.randomUUID(),
        campaignId,
        name: name || "New Map",
        backgroundId,
        tokens: [],
        fogs: [],
        createdAt: Date.now()
    };

    await saveMap(newMap);
    await loadMaps(); // Reload the list
    await setActiveMap(newMap.id); // Switch to the new map
}

export async function removeMap(id: UUID) {
    const state = get(mapStore);
    const map = state.maps.find(m => m.id === id);
    if (!map) return;

    await deleteMap(id);
    await deleteImageBlob(map.backgroundId);

    // Revoke URL if we are deleting the active map
    if (state.activeMapId === id) {
        revokeMapUrl();
    }

    await loadMaps();
}

// Token Updates
export async function updateMapTokens(mapId: UUID, tokens: Token[]) {
    const state = get(mapStore);
    const map = state.maps.find(m => m.id === mapId);
    if (!map) return;

    const updatedMap = { ...map, tokens };
    await saveMap(updatedMap);

    mapStore.update(s => {
        return {
            ...s,
            maps: s.maps.map(m => m.id === mapId ? updatedMap : m)
        };
    });
}

// Journey / Grid Updates
export async function updateJourneySettings(mapId: UUID, updates: { showHexGrid?: boolean, weather?: 'none' | 'rain' | 'fog', timeOfDay?: 'day' | 'night' | 'dusk' }) {
    const state = get(mapStore);
    const map = state.maps.find(m => m.id === mapId);
    if (!map) return;

    const updatedMap = { ...map, ...updates };
    await saveMap(updatedMap);

    mapStore.update(s => {
        return {
            ...s,
            maps: s.maps.map(m => m.id === mapId ? updatedMap : m)
        };
    });
}

// Fog Updates
export async function updateMapFogs(mapId: UUID, fogs: any[]) {
    // Fogs MVP structure depends on how we build the UI for it
    const state = get(mapStore);
    const map = state.maps.find(m => m.id === mapId);
    if (!map) return;

    const updatedMap = { ...map, fogs };
    await saveMap(updatedMap);

    mapStore.update(s => {
        return {
            ...s,
            maps: s.maps.map(m => m.id === mapId ? updatedMap : m)
        };
    });
}

// Wire to campaign
campaignStore.subscribe(() => {
    setTimeout(loadMaps, 0);
});
