/**
 * IndexedDB storage utility for handling large data like file uploads
 * Provides a localStorage-like API but with much larger quota (~50MB+)
 */

const DB_NAME = "CRM_Storage";
const DB_VERSION = 1;
const STORE_NAME = "fileData";

let dbInstance: IDBDatabase | null = null;

async function getDatabase(): Promise<IDBDatabase> {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

/**
 * Store large data (like file URLs) in IndexedDB
 */
export async function setIndexedDbItem(key: string, value: any): Promise<void> {
    try {
        const db = await getDatabase();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.put(value, key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error(`Failed to write IndexedDB key "${key}"`, error);
        throw error;
    }
}

/**
 * Retrieve large data from IndexedDB
 */
export async function getIndexedDbItem<T = any>(key: string): Promise<T | null> {
    try {
        const db = await getDatabase();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result || null);
            };
        });
    } catch (error) {
        console.error(`Failed to read IndexedDB key "${key}"`, error);
        return null;
    }
}

/**
 * Remove item from IndexedDB
 */
export async function removeIndexedDbItem(key: string): Promise<void> {
    try {
        const db = await getDatabase();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error(`Failed to remove IndexedDB key "${key}"`, error);
        throw error;
    }
}

/**
 * Clear all data from IndexedDB
 */
export async function clearIndexedDb(): Promise<void> {
    try {
        const db = await getDatabase();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error("Failed to clear IndexedDB", error);
        throw error;
    }
}

/**
 * Split payment approval data: metadata in localStorage, file data in IndexedDB
 * This prevents localStorage from being overwhelmed with large base64 data
 */
export function stripFileDataFromPaymentRequest(request: any) {
    const { paymentReceiptUrl, ...requestWithoutFile } = request;
    return requestWithoutFile;
}

/**
 * Store payment approval metadata in localStorage, file data in IndexedDB
 */
export async function storePaymentApprovalWithFile(
    request: any,
    fileKey: string
): Promise<any> {
    if (request.paymentReceiptUrl) {
        // Store file data in IndexedDB
        await setIndexedDbItem(fileKey, request.paymentReceiptUrl);
    }

    // Return request without file data for localStorage
    return stripFileDataFromPaymentRequest(request);
}

/**
 * Retrieve file data for a payment approval
 */
export async function getPaymentApprovalFile(fileKey: string): Promise<string | null> {
    return getIndexedDbItem<string>(fileKey);
}
