/**
 * Client-side queue for offline XP sync — drained on online + SW postMessage.
 * Uses IndexedDB; idempotent keys must match server applyXpAward award_key.
 */

const DB_NAME = "mentrixa-pwa";
const DB_VERSION = 1;
const STORE = "xp_queue";

export type XpQueueItem = {
  id?: number;
  amount: number;
  awardKey: string;
  divisionKey?: string | null;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

async function getAll(): Promise<(XpQueueItem & { id: number })[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).getAll();
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve((r.result as (XpQueueItem & { id: number })[]) ?? []);
  });
}

async function remove(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function enqueueXpRetry(item: Omit<XpQueueItem, "id">): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushXpQueue(): Promise<{ flushed: number; errors: number }> {
  const items = await getAll();
  let flushed = 0;
  let errors = 0;
  for (const row of items) {
    if (row.id == null) continue;
    try {
      const res = await fetch("/api/pwa/xp-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: row.amount,
          awardKey: row.awardKey,
          divisionKey: row.divisionKey ?? null,
        }),
      });
      if (res.ok) {
        await remove(row.id);
        flushed++;
      } else {
        errors++;
      }
    } catch {
      errors++;
    }
  }
  return { flushed, errors };
}

export async function requestXpBackgroundSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  if ("sync" in reg && typeof (reg as ServiceWorkerRegistration & { sync: { register: (t: string) => Promise<void> } }).sync?.register === "function") {
    try {
      await (reg as ServiceWorkerRegistration & { sync: { register: (t: string) => Promise<void> } }).sync.register(
        "mentrixa-xp-sync"
      );
    } catch {
      /* Sync API unsupported or quota */
    }
  }
}
