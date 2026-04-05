import Peer, { type DataConnection } from 'peerjs';
import { mapStore } from '../../modules/maps/stores';
import { encounterStore } from '../../modules/combat/stores';
import { chatStore } from './chatStore';

let peer: Peer | null = null;
let hostConn: DataConnection | null = null;

// Dedicated local audio receivers
const clientAmbientPlayer = new Audio();
clientAmbientPlayer.loop = true;
const clientSfxPlayer = new Audio();
let currentAmbientObjectUrl: string | null = null;

export function joinSession(hostId: string, playerName: string, onStatus: (msg: string) => void) {
    if (peer) {
        peer.destroy();
    }

    peer = new Peer();

    peer.on('open', (id) => {
        onStatus("Connecting to DM...");

        // Ensure prefix
        if (!hostId.startsWith("TOH-")) {
            hostId = "TOH-" + hostId.toUpperCase();
        }

        hostConn = peer!.connect(hostId);

        hostConn.on('open', () => {
            onStatus("Connected to Session.");
            hostConn!.send({ type: 'IDENTITY', payload: { name: playerName } });
        });

        hostConn.on('data', (data: any) => {
            if (data.type === 'FULL_SYNC') {
                mapStore.set(data.map);
                encounterStore.set(data.combat);
                if (data.chat) chatStore.set(data.chat);
            } else if (data.type === 'MAP_SYNC') {
                mapStore.set(data.diff);
            } else if (data.type === 'COMBAT_SYNC') {
                encounterStore.set(data.diff);
            } else if (data.type === 'CHAT_SYNC') {
                chatStore.set(data.payload);
            } else if (data.type === 'PLAY_AMBIENT') {
                if (currentAmbientObjectUrl) {
                    URL.revokeObjectURL(currentAmbientObjectUrl);
                }
                // Construct a robust Blob from the incoming data 
                const newBlob = new Blob([data.blob]); 
                currentAmbientObjectUrl = URL.createObjectURL(newBlob);
                clientAmbientPlayer.src = currentAmbientObjectUrl;
                clientAmbientPlayer.play().catch(e => console.error("Client Ambient Playback failed:", e));
            } else if (data.type === 'STOP_AMBIENT') {
                clientAmbientPlayer.pause();
                clientAmbientPlayer.currentTime = 0;
            } else if (data.type === 'PLAY_SFX') {
                const sfxBlob = new Blob([data.blob]); 
                const currentSfxObjectUrl = URL.createObjectURL(sfxBlob);
                clientSfxPlayer.src = currentSfxObjectUrl;
                clientSfxPlayer.play().catch(e => console.error("Client SFX Playback failed:", e));
                clientSfxPlayer.onended = () => {
                    URL.revokeObjectURL(currentSfxObjectUrl);
                    clientSfxPlayer.onended = null;
                };
            }
        });

        hostConn.on('close', () => {
            onStatus("Disconnected from host.");
            hostConn = null;
        });

        hostConn.on('error', (err) => {
            onStatus("Connection error.");
            console.error(err);
        });
    });

    peer.on('error', (err) => {
        onStatus("Failed to reach signalling server or host.");
        console.error(err);
    });
}

export function leaveSession() {
    if (hostConn) {
        hostConn.close();
        hostConn = null;
    }
    if (peer) {
        peer.destroy();
        peer = null;
    }
}

export function sendClientChat(text: string, sender: string) {
    if (hostConn && hostConn.open) {
        hostConn.send({
            type: 'CHAT',
            payload: {
                id: crypto.randomUUID(),
                sender,
                text,
                timestamp: Date.now()
            }
        });
    }
}
