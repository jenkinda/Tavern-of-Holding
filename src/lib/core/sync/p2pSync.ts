import Peer, { type DataConnection } from 'peerjs';

// Random token generator for the temporary sync nexus
function generateNexusToken() {
    return 'NEXUS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Hosts a temporary P2P webRTC channel to beam out the campaign payload.
 *
 * @param jsonPayload The massive exported campaign string
 * @param onUpdate UI callback to show status
 * @returns An un-host function to close everything
 */
export function hostSyncSession(jsonPayload: string, onUpdate: (msg: string) => void): () => void {
    const hostId = generateNexusToken();
    const peer = new Peer(hostId);
    const activeConns = new Set<DataConnection>();

    peer.on('open', (id) => {
        onUpdate(`Hosting on Token: ${id}\nWaiting for connection...`);
    });

    peer.on('connection', (conn) => {
        activeConns.add(conn);
        onUpdate(`Device connected! Compressing WebRTC tunnel...`);

        conn.on('open', () => {
            onUpdate(`Beaming campaign data securely...`);
            // Send payload wrapped cleanly
            conn.send({
                type: 'P2P_SYNC_DATA',
                payload: jsonPayload
            });
        });

        conn.on('data', (data: any) => {
            if (data.type === 'P2P_SYNC_ACK') {
                onUpdate(`Sync complete! Shutting down Nexus.`);
                setTimeout(() => {
                    conn.close();
                    peer.destroy();
                }, 2000);
            }
        });

        conn.on('error', (err) => {
            console.error('Peer connection error', err);
            onUpdate(`Error during beaming: ${err}`);
        });
    });

    peer.on('error', (err) => {
        console.error('Peer error', err);
        onUpdate(`Nexus Error: ${err.message}`);
    });

    return () => {
        onUpdate('Nexus stopped.');
        activeConns.forEach(c => c.close());
        peer.destroy();
    };
}

/**
 * Connects to a Hosted Nexus Token to pull the multi-megabyte campaign dataset.
 *
 * @param nexusToken The token from the host
 * @param onUpdate UI callback
 * @returns A promise resolving to the JSON string payload
 */
export function pullSyncData(nexusToken: string, onUpdate: (msg: string) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!nexusToken || !nexusToken.trim()) {
            return reject(new Error("Token is empty."));
        }

        const peer = new Peer();

        peer.on('open', () => {
            onUpdate(`Dialing Nexus: ${nexusToken.trim()}...`);
            const conn = peer.connect(nexusToken.trim(), { reliable: true });

            conn.on('open', () => {
                onUpdate(`Connected. Receiving massive payload...`);
            });

            conn.on('data', (data: any) => {
                if (data.type === 'P2P_SYNC_DATA') {
                    onUpdate(`Payload received! Merging local DB...`);
                    // Send ACK so host can close
                    conn.send({ type: 'P2P_SYNC_ACK' });

                    // Disconnect our side
                    setTimeout(() => {
                        conn.close();
                        peer.destroy();
                    }, 500);

                    resolve(data.payload);
                }
            });

            conn.on('error', (err) => {
                console.error("Pull Connection Error", err);
                reject(err);
            });
        });

        peer.on('error', (err) => {
            console.error("Pull Peer Error", err);
            reject(new Error(`Failed to find Nexus Token: ${nexusToken}. Is the host still open?`));
        });
    });
}
