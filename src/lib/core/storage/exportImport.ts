import JSZip from 'jszip';
import { getDB } from './db';

export async function exportTavernData(): Promise<void> {
    const db = await getDB();
    const zip = new JSZip();

    // 1. Gather all non-blob data
    const data: Record<string, any[]> = {};
    const storeNames = Array.from(db.objectStoreNames).filter(n => n !== 'images');
    
    for (const store of storeNames) {
        data[store] = await db.getAll(store);
    }
    
    zip.file("data.json", JSON.stringify(data, null, 2));

    // 2. Gather blobs from images store
    const assets = zip.folder("assets");
    if (assets) {
        const tx = db.transaction('images', 'readonly');
        const store = tx.objectStore('images');
        let cursor = await store.openCursor();
        
        while (cursor) {
            const id = cursor.key.toString();
            const blob = cursor.value; 
            assets.file(id, blob);
            cursor = await cursor.continue();
        }
    }

    // 3. Generate Zip
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // 4. Download
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    const date = new Date().toISOString().split('T')[0];
    a.download = `Tavern_Backup_${date}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

export async function importTavernData(file: File): Promise<void> {
    const db = await getDB();
    const jszip = new JSZip();
    const zip = await jszip.loadAsync(file);

    const jsonFile = zip.file("data.json");
    if (!jsonFile) throw new Error("Invalid Tavern Backup: Missing data.json");

    const jsonText = await jsonFile.async("string");
    const data = JSON.parse(jsonText);

    // 1. Clear ALL existing data (Overwrite policy)
    for (const store of db.objectStoreNames) {
        await db.clear(store);
    }

    // 2. Restore JSON stores
    for (const [storeName, records] of Object.entries(data)) {
        if (db.objectStoreNames.contains(storeName)) {
            const tx = db.transaction(storeName, 'readwrite');
            for (const record of (records as any[])) {
                await tx.store.put(record);
            }
            await tx.done;
        }
    }

    // 3. Restore Images/Blobs
    const assets = zip.folder("assets");
    if (assets && db.objectStoreNames.contains('images')) {
        const tx = db.transaction('images', 'readwrite');
        const promises: Promise<any>[] = [];
        assets.forEach((relativePath, fileNode) => {
            if (!fileNode.dir) {
                promises.push(
                    fileNode.async("blob").then(blob => {
                        return tx.store.put(blob, relativePath);
                    })
                );
            }
        });
        await Promise.all(promises);
        await tx.done;
    }
}
