import { getDB } from './db';

/**
 * Serializes a single campaign into a JSON string.
 */
export async function exportCampaignData(campaignId: string): Promise<string> {
    const db = await getDB();
    const exportData: Record<string, any> = {
        version: "1.0.0",
        timestamp: Date.now(),
        type: "campaign_export"
    };

    const campaign = await db.get('campaigns', campaignId);
    if (!campaign) throw new Error("Campaign not found");
    exportData['campaigns'] = [campaign];

    const stores = [
        'sessions', 'notes', 'maps', 'monsters', 'audio', 'threads', 'clocks', 'canon', 'rulings', 'dungeon_levels', 'dungeon_rooms', 'patrol_routes', 'encounters'
    ];

    for (const storeName of stores) {
        const records = await db.getAllFromIndex(storeName as any, 'by-campaignId', campaignId);
        if (records.length > 0) {
            exportData[storeName] = records;
        }
    }

    exportData.images = [];
    if (exportData.maps) {
        for (const map of exportData.maps) {
            const blob: Blob = await db.get('images', map.id);
            if (blob) {
                const base64 = await blobToBase64(blob);
                exportData.images.push({ id: map.id, data: base64, type: blob.type });
            }
        }
    }

    return JSON.stringify(exportData, null, 2);
}

/**
 * Triggers a download of the provided JSON string as a file.
 */
export function downloadJsonFile(jsonString: string, filename = 'tavern-export.json') {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parses a JSON string and appends it into IndexedDB safely without deleting existing campaigns.
 */
export async function importCampaignData(jsonString: string): Promise<void> {
    const db = await getDB();
    const data = JSON.parse(jsonString);

    if (data.type !== "campaign_export" && !data.campaigns) {
        throw new Error("Invalid campaign export format");
    }

    const stores = [
        'campaigns', 'sessions', 'notes', 'maps', 'monsters', 'audio', 'threads', 'clocks', 'canon', 'rulings', 'dungeon_levels', 'dungeon_rooms', 'patrol_routes', 'encounters'
    ];

    for (const storeName of stores) {
        if (data[storeName] && Array.isArray(data[storeName])) {
            const tx = db.transaction(storeName as any, 'readwrite');
            for (const item of data[storeName]) {
                await tx.store.put(item);
            }
            await tx.done;
        }
    }

    if (data.images && Array.isArray(data.images)) {
        const tx = db.transaction('images', 'readwrite');
        for (const imgRecord of data.images) {
            const blob = await base64ToBlob(imgRecord.data, imgRecord.type);
            await tx.store.put(blob, imgRecord.id);
        }
        await tx.done;
    }
}

// Helpers
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function base64ToBlob(base64: string, type: string): Promise<Blob> {
    const response = await fetch(`data:${type};base64,${base64}`);
    return response.blob();
}
