// IndexedDB-backed queue for citizen portal requests submitted while offline.
// The SW notifies clients via postMessage("FLUSH_OFFLINE_QUEUE") when
// Background Sync fires; the app also flushes on window "online" events.

const DB_NAME    = "op1na1-offline";
const STORE_NAME = "queue";
const DB_VERSION = 1;

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  timestamp: number;
  retries: number;
  label?: string; // human-readable (e.g. ticket summary)
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function enqueue(
  request: Omit<QueuedRequest, "id" | "timestamp" | "retries">,
): Promise<string> {
  const db  = await openDB();
  const id  = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const item: QueuedRequest = { ...request, id, timestamp: Date.now(), retries: 0 };

  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).add(item);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });

  // Request a background sync so the browser can replay when online
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
      .sync.register("op1na1-offline-queue").catch(() => { /* not supported */ });
  }

  return id;
}

export async function getAll(): Promise<QueuedRequest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedRequest[]);
    req.onerror   = () => reject(req.error);
  });
}

export async function remove(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function count(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
}

export async function flushQueue(): Promise<FlushResult> {
  const items = await getAll();
  let sent = 0, failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method:  item.method,
        headers: item.headers,
        body:    item.body,
      });
      if (res.ok) {
        await remove(item.id);
        sent++;
      } else {
        // Non-retriable HTTP errors (4xx): drop the item
        if (res.status >= 400 && res.status < 500) {
          await remove(item.id);
        }
        failed++;
      }
    } catch {
      // Network error — leave in queue for next attempt
      failed++;
    }
  }

  const remaining = await count();
  return { sent, failed, remaining };
}
