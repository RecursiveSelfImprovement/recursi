// (new)
class VibesPatchStore {
  static makeKey(filePath, methodName) {
    return `${filePath}::${methodName || '__file__'}`;
  }

  static async open() {
    const store = new VibesPatchStore();
    await store.init();
    return store;
  }

  constructor() {
    this.dbName = 'vibes-patch-store';
    this.storeName = 'patches';
    this.version = 1;
    this.db = null;
    this.fallbackMap = new Map(); // In case IDB fails
    this.useFallback = false;
  }

  async init() {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.dbName, this.version);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve();
        };
        req.onerror = (e) => {
          console.warn(
            'IDB open failed, falling back to memory map for patches',
            e
          );
          this.useFallback = true;
          resolve();
        };
      } catch (e) {
        console.warn(
          'IDB open exception, falling back to memory map for patches',
          e
        );
        this.useFallback = true;
        resolve();
      }
    });
  }

  _transaction(mode) {
    if (this.useFallback) return null;
    return this.db.transaction(this.storeName, mode);
  }

  async getMethodPatch(filePath, methodName) {
    const key = VibesPatchStore.makeKey(filePath, methodName);
    if (this.useFallback) return this.fallbackMap.get(key) || null; 

    return new Promise((resolve, reject) => {
      const tx = this._transaction('readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async setMethodPatch(filePath, methodName, source, meta = {}) {
    const key = VibesPatchStore.makeKey(filePath, methodName);

    // fetch existing to manage history ring
    let existing = await this.getMethodPatch(filePath, methodName);
    if (!existing) {
      existing = {
        filePath,
        className: meta.className || null,
        methodName: methodName || null,
        source: '',
        history: [],
      };
    }

    // push current source to history if it exists
    if (existing.source) {
      existing.history.unshift({
        source: existing.source,
        replacedAt: new Date().toISOString(),
      });
      // limit history to 20
      if (existing.history.length > 20) {
        existing.history.pop();
      }
    }

    existing.source = source;
    existing.patchedAt = new Date().toISOString();
    existing.patchedBy = meta.patchedBy || 'llm';
    existing.sessionId = meta.sessionId || 'session';
    existing.className = meta.className || existing.className;

    if (this.useFallback) {
      this.fallbackMap.set(key, existing);
    } else {
      await new Promise((resolve, reject) => {
        const tx = this._transaction('readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.put(existing, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('patch-changed', { detail: { filePath, methodName } })
      );
    }
  }

  async deleteMethodPatch(filePath, methodName) {
    const key = VibesPatchStore.makeKey(filePath, methodName);
    if (this.useFallback) {
      this.fallbackMap.delete(key);
    } else {
      await new Promise((resolve, reject) => {
        const tx = this._transaction('readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('patch-changed', { detail: { filePath, methodName } })
      );
    }
  }

  async deleteFilePatch(filePath) {
    const patches = await this.getPatchesForFile(filePath);
    for (const methodName of Object.keys(patches)) {
      const key = VibesPatchStore.makeKey(
        filePath,
        methodName === '__file__' ? null : methodName
      );
      if (this.useFallback) {
        this.fallbackMap.delete(key);
      } else {
        await new Promise((resolve, reject) => {
          const tx = this._transaction('readwrite');
          const store = tx.objectStore(this.storeName);
          store.delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('patch-changed', { detail: { filePath } })
      );
    }
  }

  async listPatchedFiles() {
    const all = await this.getAllPatches();
    const files = new Set();
    for (const p of all) {
      if (p.filePath) files.add(p.filePath);
    }
    return Array.from(files);
  }

  async getPatchesForFile(filePath) {
    const all = await this.getAllPatches();
    const result = {};
    for (const p of all) {
      if (p.filePath === filePath) {
        const mName = p.methodName || '__file__';
        result[mName] = p;
      }
    }
    return result;
  }

  async getAllPatches() {
    if (this.useFallback) return Array.from(this.fallbackMap.values());

    return new Promise((resolve, reject) => {
      const tx = this._transaction('readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async clear() {
    if (this.useFallback) {
      this.fallbackMap.clear();
    } else {
      await new Promise((resolve, reject) => {
        const tx = this._transaction('readwrite');
        const store = tx.objectStore(this.storeName);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  async exportJson() {
    const all = await this.getAllPatches();
    return JSON.stringify(all, null, 2);
  }

  async importJson(jsonString) {
    try {
      const all = JSON.parse(jsonString);
      await this.clear();
      for (const p of all) {
        const key = VibesPatchStore.makeKey(p.filePath, p.methodName);
        if (this.useFallback) {
          this.fallbackMap.set(key, p);
        } else {
          await new Promise((resolve, reject) => {
            const tx = this._transaction('readwrite');
            const store = tx.objectStore(this.storeName);
            store.put(p, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
        }
      }
    } catch (e) {
      throw new Error('Failed to import patches: ' + e.message);
    }
  }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 245,
  "provides": [
    "VibesPatchStore"
  ],
  "deps": []
}
recursi-meta */
