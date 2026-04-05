/**
 * cloud.ts
 * Implements a generic Backend-as-a-Service (BaaS) adapter for Cloud Sync.
 * Currently uses JSONBlob as a frictionless, no-auth datastore to support 
 * "Host Tokens" immediately without requiring user API configurations.
 */

// We will use JSONBlob api for a frictionless BaaS
const BAAS_BASE_URL = 'https://jsonblob.com/api/jsonBlob';

/**
 * Pushes raw JSON string to the BaaS and returns a Host Token
 */
export async function pushToCloud(jsonPayload: string): Promise<string> {
    try {
        const response = await fetch(BAAS_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: jsonPayload
        });

        if (!response.ok) {
            throw new Error(`Cloud sync failed: ${response.statusText}`);
        }

        // JSONBlob returns the location of the new blob in the headers
        const location = response.headers.get('Location');
        if (!location) {
            throw new Error("BaaS did not return a valid Host Token location.");
        }

        // Location looks like: https://jsonblob.com/api/jsonBlob/1239847192837
        const parts = location.split('/');
        const hostToken = parts[parts.length - 1];

        return hostToken;
    } catch (err) {
        console.error("Cloud push error:", err);
        throw err;
    }
}

/**
 * Updates an EXISTING Host Token with new data.
 */
export async function updateCloud(hostToken: string, jsonPayload: string): Promise<boolean> {
    try {
        const response = await fetch(`${BAAS_BASE_URL}/${hostToken}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: jsonPayload
        });

        if (!response.ok) {
            throw new Error(`Cloud update failed: ${response.statusText}`);
        }
        return true;
    } catch (err) {
        console.error("Cloud update error:", err);
        throw err;
    }
}

/**
 * Pulls raw JSON string from the BaaS using a Host Token
 */
export async function pullFromCloud(hostToken: string): Promise<string> {
    if (!hostToken.trim()) {
        throw new Error("Invalid Host Token provided.");
    }

    try {
        const response = await fetch(`${BAAS_BASE_URL}/${hostToken}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Cloud fetch failed: ${response.statusText}. The token may be expired or invalid.`);
        }

        const text = await response.text();
        return text;
    } catch (err) {
        console.error("Cloud pull error:", err);
        throw err;
    }
}
