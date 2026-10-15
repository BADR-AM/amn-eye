const DB_NAME = 'amn_eye_offline_db';
const STORE_NAME = 'pending_recruits';
const DB_VERSION = 1;

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not available'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueuePendingRecruit({ fields, photoBlob = null, videoBlob = null, createdAt = Date.now() }) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add({ fields, photoBlob, videoBlob, createdAt });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingRecruits() {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return [];
  }
}

export async function getPendingCount() {
  const items = await getPendingRecruits();
  return items.length;
}

export async function removePendingRecruit(localId) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

let isFlushing = false;

export async function flushOfflineQueue(getTokenFn) {
  if (isFlushing) return { synced: 0, remaining: await getPendingCount() };
  isFlushing = true;

  try {
    const items = await getPendingRecruits();
    if (!items.length) return { synced: 0, remaining: 0 };

    let synced = 0;
    for (const item of items) {
      try {
        const formData = new FormData();
        Object.entries(item.fields || {}).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            formData.append(key, typeof val === 'object' ? JSON.stringify(val) : val);
          }
        });
        if (item.photoBlob) {
          formData.append('photo', item.photoBlob, `offline_photo_${item.createdAt}.jpg`);
        }
        if (item.videoBlob) {
          formData.append('video', item.videoBlob, `offline_video_${item.createdAt}.webm`);
        }

        const token = typeof getTokenFn === 'function' ? getTokenFn() : '';
        const res = await fetch('/api/recruits', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (res.ok || res.status === 409) {
          await removePendingRecruit(item.localId);
          synced++;
        } else if (res.status >= 500) {
          break;
        }
      } catch (_) {
        // Network still unreachable; stop flushing and retry on next sync tick
        break;
      }
    }

    const remaining = await getPendingCount();
    return { synced, remaining };
  } finally {
    isFlushing = false;
  }
}
