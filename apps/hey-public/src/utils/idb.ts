/* =====================================================
   轻量 IndexedDB 封装（零依赖）
   用于无限画布草稿持久化
   ===================================================== */

const DB_NAME = 'hey19-canvas-db';
const STORE = 'workflows';
const VERSION = 1;

let dbPromise: null | Promise<IDBDatabase> = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.addEventListener('upgradeneeded', () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    });
    req.addEventListener('success', () => resolve(req.result));
    req.addEventListener('error', () => reject(req.error));
  });
  return dbPromise;
}

export async function idbSave(key: string, value: unknown): Promise<boolean> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id: key, data: value, savedAt: Date.now() });
      tx.addEventListener('complete', () => resolve(true));
      tx.addEventListener('error', () => reject(tx.error));
    });
  } catch {
    return false;
  }
}

export async function idbLoad<T = unknown>(key: string): Promise<null | T> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.addEventListener('success', () =>
        resolve((req.result?.data as T) ?? null),
      );
      req.addEventListener('error', () => reject(req.error));
    });
  } catch {
    return null;
  }
}

export async function idbDelete(key: string): Promise<boolean> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.addEventListener('complete', () => resolve(true));
      tx.addEventListener('error', () => resolve(false));
    });
  } catch {
    return false;
  }
}

/* 检查 IndexedDB 可用性 */
export function idbSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}
