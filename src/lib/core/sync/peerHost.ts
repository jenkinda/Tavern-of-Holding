import Peer, { type DataConnection } from 'peerjs';
import { get } from 'svelte/store';
import { mapStore } from '../../modules/maps/stores';
import { encounterStore } from '../../modules/combat/stores';

let peer: Peer | null = null;
const connections: Set<DataConnection> = new Set();
let broadcastUnsubscribe: (() => void)[] = [];

// Simple 6 character alphanumeric code generator
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function startHosting(onOpen: (id: string) => void, onConnect: (connStr: string) => void) {
    if (peer) {
        peer.destroy();
    }

    // Prefix to avoid basic collisions on the free public PeerJS server
    const hostId = "TOH-" + generateRoomCode();

    // Setup peer
    peer = new Peer(hostId);

    peer.on('open', (id) => {
        onOpen(id);
        setupBroadcasting();
    });

    peer.on('connection', (conn) => {
        connections.add(conn);

        conn.on('open', () => {
            onConnect(`Player connected!`);
            // Immediately send current state
            sendFullState(conn);
        });

        conn.on('close', () => {
            connections.delete(conn);
        });

        conn.on('error', (err) => {
            console.error(err);
            connections.delete(conn);
        });
    });

    return hostId;
}

export function stopHosting() {
    broadcastUnsubscribe.forEach(unsub => unsub());
    broadcastUnsubscribe = [];
    connections.forEach(c => c.close());
    connections.clear();
    if (peer) {
        peer.destroy();
        peer = null;
    }
}

function sendFullState(targetConn?: DataConnection) {
    const payload = {
        type: 'FULL_SYNC',
        map: get(mapStore),
        combat: get(encounterStore)
    };

    if (targetConn) {
        targetConn.send(payload);
    } else {
        broadcast(payload);
    }
}

function setupBroadcasting() {
    // Clean up old subscriptions
    broadcastUnsubscribe.forEach(unsub => unsub());

    broadcastUnsubscribe = [
        mapStore.subscribe(state => {
            broadcast({ type: 'MAP_SYNC', diff: state });
        }),
        encounterStore.subscribe(state => {
            broadcast({ type: 'COMBAT_SYNC', diff: state });
        })
    ];
}

function broadcast(data: any) {
    connections.forEach(conn => {
        if (conn.open) {
            conn.send(data);
        }
    });
}
