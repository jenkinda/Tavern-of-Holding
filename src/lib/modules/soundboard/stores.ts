import { writable, get } from 'svelte/store';
import type { AudioTrack, UUID } from '../../types/models';
import { getAudioTracks, saveAudioTrack, deleteAudioTrack, saveImageBlob, getImageBlob, deleteImageBlob } from '../../core/storage/db';
import { campaignStore } from '../campaigns/stores';
import { broadcastAudioAction } from '../../core/sync/peerHost';

type SoundboardState = {
    tracks: AudioTrack[];
    loading: boolean;
    activeAmbientId: UUID | null;
    ambientVolume: number;
    sfxVolume: number;
};

export const soundboardStore = writable<SoundboardState>({
    tracks: [],
    loading: false,
    activeAmbientId: null,
    ambientVolume: 0.5,
    sfxVolume: 0.8
});

// Singleton Audio elements for cross-route persistent playback
const ambientPlayer = new Audio();
ambientPlayer.loop = true;
const sfxPlayer = new Audio();

// Sync volumes
soundboardStore.subscribe(state => {
    ambientPlayer.volume = state.ambientVolume;
    sfxPlayer.volume = state.sfxVolume;
});

export async function loadAudioTracks() {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) {
        soundboardStore.update(s => ({ ...s, tracks: [] }));
        return;
    }

    soundboardStore.update(s => ({ ...s, loading: true }));
    const tracks = await getAudioTracks(campaignId);

    soundboardStore.update(s => ({ ...s, tracks, loading: false }));
}

export async function uploadAudio(file: File, name: string, type: 'ambient' | 'sfx') {
    const campaignId = get(campaignStore).activeCampaignId;
    if (!campaignId) return;

    const blobId = crypto.randomUUID();
    await saveImageBlob(blobId, file); // Re-using image blob store for generic media

    const newTrack: AudioTrack = {
        id: crypto.randomUUID(),
        campaignId,
        name: name || file.name,
        type,
        blobId
    };

    await saveAudioTrack(newTrack);
    await loadAudioTracks();
}

export async function removeAudio(id: UUID) {
    const state = get(soundboardStore);
    const track = state.tracks.find(t => t.id === id);
    if (!track) return;

    if (state.activeAmbientId === id) {
        stopAmbient();
    }

    await deleteAudioTrack(id);
    await deleteImageBlob(track.blobId);
    await loadAudioTracks();
}

// Audio Playback API
let currentAmbientObjectUrl: string | null = null;

export async function playAmbient(id: UUID) {
    const state = get(soundboardStore);
    const track = state.tracks.find(t => t.id === id);
    if (!track) return;

    const blob = await getImageBlob(track.blobId);
    if (!blob) return;

    // Cleanup previous Blob URL to prevent memory leaks
    if (currentAmbientObjectUrl) {
        URL.revokeObjectURL(currentAmbientObjectUrl);
    }

    currentAmbientObjectUrl = URL.createObjectURL(blob);
    ambientPlayer.src = currentAmbientObjectUrl;
    ambientPlayer.play().catch(e => console.error("Playback failed:", e));

    broadcastAudioAction('PLAY_AMBIENT', blob, track.name);

    soundboardStore.update(s => ({ ...s, activeAmbientId: id }));
}

export function stopAmbient() {
    ambientPlayer.pause();
    ambientPlayer.currentTime = 0;

    broadcastAudioAction('STOP_AMBIENT');

    soundboardStore.update(s => ({ ...s, activeAmbientId: null }));
}

export async function playSfx(id: UUID) {
    const state = get(soundboardStore);
    const track = state.tracks.find(t => t.id === id);
    if (!track) return;

    const blob = await getImageBlob(track.blobId);
    if (!blob) return;

    broadcastAudioAction('PLAY_SFX', blob, track.name);

    const currentSfxObjectUrl = URL.createObjectURL(blob);
    sfxPlayer.src = currentSfxObjectUrl;
    sfxPlayer.play().catch(e => console.error("SFX Playback failed:", e));

    // Revoke URL after play ends (approximate or via event listener)
    sfxPlayer.onended = () => {
        URL.revokeObjectURL(currentSfxObjectUrl);
        sfxPlayer.onended = null;
    };
}

export function updateVolumes(ambient: number, sfx: number) {
    soundboardStore.update(s => ({ ...s, ambientVolume: ambient, sfxVolume: sfx }));
}

campaignStore.subscribe(() => {
    setTimeout(loadAudioTracks, 0);
});
