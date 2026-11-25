// Interim, browser-only storage for TIMON application documents (IndexedDB).
// Files stay on this device until server-side blob storage replaces this; the application only records
// a local id ("bin-...") for them. Every function resolves safely if IndexedDB is unavailable.
const DB_NAME = 'timon-local-documents';
const STORE = 'files';

// Local ids are the "bin-..." references the form creates; real stored files use UUIDs.
export const isLocalBinaryId = (id) => typeof id === 'string' && id.startsWith('bin-');

const openDb = () => new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available'));
        return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

const run = async (mode, fn) => {
    const db = await openDb();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, mode);
            const request = fn(tx.objectStore(STORE));
            tx.oncomplete = () => resolve(request?.result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
};

export const saveLocalDocument = (id, file) => run('readwrite', (s) => s.put(file, id));
export const getLocalDocument = (id) => run('readonly', (s) => s.get(id));
export const deleteLocalDocument = (id) => run('readwrite', (s) => s.delete(id));

// Opens a stored file in a new tab. Returns false when it is not on this device.
export async function openLocalDocument(id) {
    try {
        const file = await getLocalDocument(id);
        if (!file) return false;
        const url = URL.createObjectURL(file);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return true;
    } catch {
        return false;
    }
}
