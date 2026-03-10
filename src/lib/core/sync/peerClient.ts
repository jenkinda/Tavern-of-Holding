import Peer, { type DataConnection } from 'peerjs';
import { mapStore } from '../../modules/maps/stores';
import { encounterStore } from '../../modules/combat/stores';

let peer: Peer | null = null;
let hostConn: DataConnection | null = null;

export function joinSession(hostId: string, onStatus: (msg: string) => void) {
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
        });

        hostConn.on('data', (data: any) => {
            if (data.type === 'FULL_SYNC') {
                mapStore.set(data.map);
                encounterStore.set(data.combat);
            } else if (data.type === 'MAP_SYNC') {
                mapStore.set(data.diff);
            } else if (data.type === 'COMBAT_SYNC') {
                encounterStore.set(data.diff);
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
