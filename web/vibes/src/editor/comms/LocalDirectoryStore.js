// phase2-managed-migration: internal imports/exports stripped
class LocalDirectoryStore {
  static idbVersion() {
    return 1;
  }

  static idbStoreName() {
    return 'handles';
  }

  static idbDbName() {
    return 'vibes-localdir';
  }

  static textExtensions() {
    return new Set([
      '.js',
      '.mjs',
      '.cjs',
      '.ts',
      '.tsx',
      '.jsx',
      '.html',
      '.htm',
      '.css',
      '.json',
      '.md',
      '.txt',
      '.svg',
      '.xml',
      '.yaml',
      '.yml',
      '.csv',
      '.sh',
      '.bash',
      '.env',
      '.gitignore',
      '.gitattributes',
      '.prettierrc',
      '.eslintrc',
      '.babelrc',
      '.editorconfig',
      '.map',
      '.webmanifest',
      '.toml',
      '.ini',
    ]);
  }

  constructor(dirHandle, projectName) {
    this._handle = dirHandle;
    this._projectName = projectName;
    this._cache = new Map(); // goldenPath → string | Uint8Array
  }

  static async open(dirHandle, projectName) {
    const store = new LocalDirectoryStore(dirHandle, projectName);
    await store._scanDirectory(dirHandle, `/${projectName}`);
    await store._persistToIDB();
    return store;
  }

  static async restore(projectName) {
    let handle;
    try {
      handle = await LocalDirectoryStore._loadFromIDB(projectName);
    } catch (e) {
      console.warn('[LocalDirectoryStore] IDB read failed during restore:', e);
      return null;
    }
    if (!handle) return null;

    let perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      perm = await handle.requestPermission({ mode: 'readwrite' });
    }
    if (perm !== 'granted') return null;

    const store = new LocalDirectoryStore(handle, projectName);
    await store._scanDirectory(handle, `/${projectName}`);
    return store;
  }

  static async listSaved() {
    const rawKeys = await LocalDirectoryStore._idbGetAllKeys();
    return rawKeys
      .filter((k) => typeof k === 'string' && k.startsWith('localdir:'))
      .map((k) => k.slice('localdir:'.length));
  }

  static async forget(projectName) {
    await LocalDirectoryStore._idbDelete(`localdir:${projectName}`);
  }

  get size() {
    return this._cache.size;
  }

  has(goldenPath) {
    return this._cache.has(goldenPath);
  }

  get(goldenPath) {
    return this._cache.get(goldenPath);
  }

  keys() {
    return this._cache.keys();
  }

  entries() {
    return this._cache.entries();
  }

  values() {
    return this._cache.values();
  }

  forEach(callback, thisArg) {
    this._cache.forEach(callback, thisArg);
  }

  async delete(goldenPath) {
    const hadCacheEntry = this._cache.has(goldenPath);
    this._cache.delete(goldenPath);

    let diskDeleted = false;
    let diskWasMissing = false;

    try {
      const { parentHandle, fileName } = await this._resolveParentHandle(
        goldenPath,
        false
      );

      if (parentHandle && fileName) {
        await parentHandle.removeEntry(fileName);
        diskDeleted = true;
      }
    } catch (error) {
      if (
        error &&
        (error.name === 'NotFoundError' ||
          String(error.message || '')
            .toLowerCase()
            .includes('not found'))
      ) {
        diskWasMissing = true;
      } else {
        console.warn(
          `[LocalDirectoryStore] Could not delete ${goldenPath} from disk:`,
          error
        );
        return false;
      }
    }

    if (
      typeof window !== 'undefined' &&
      window.projectApp?.localDirSessionManager?.removeFile
    ) {
      window.projectApp.localDirSessionManager.removeFile(goldenPath);
    }

    if (typeof window !== 'undefined' && window.projectApp?.tabOrchestrator) {
      window.projectApp.tabOrchestrator.refreshRunnerTab?.();
      window.projectApp.tabOrchestrator.refreshUrlPreviewTab?.();
    }

    return hadCacheEntry || diskDeleted || diskWasMissing;
  }

  async deleteDirectory(goldenPath) {
    try {
      const { parentHandle, fileName } = await this._resolveParentHandle(
        goldenPath,
        false
      );
      if (parentHandle && fileName) {
        await parentHandle.removeEntry(fileName, { recursive: true });
      }
    } catch (e) {
      console.warn(
        `[LocalDirectoryStore] Could not delete directory ${goldenPath} from disk:`,
        e
      );
    }
  }

  async _scanDirectory(dirHandle, prefix) {
    const allowedDotFiles = new Set([
      '.env',
      '.gitignore',
      '.gitattributes',
      '.prettierrc',
      '.eslintrc',
      '.babelrc',
      '.editorconfig',
    ]);

    try {
      for await (const [name, handle] of dirHandle.entries()) {
        // Ignore hidden directories completely (like .git or .vscode)
        if (handle.kind === 'directory' && name.startsWith('.')) continue;

        // Ignore hidden files unless they are common recognized config files
        if (
          handle.kind === 'file' &&
          name.startsWith('.') &&
          !allowedDotFiles.has(name)
        )
          continue;

        if (name === 'node_modules') continue;

        const goldenPath = `${prefix}/${name}`;

        if (handle.kind === 'directory') {
          await this._scanDirectory(handle, goldenPath);
        } else {
          try {
            const file = await handle.getFile();
            const dotIdx = name.lastIndexOf('.');
            const ext = dotIdx !== -1 ? name.slice(dotIdx).toLowerCase() : '';

            if (
              LocalDirectoryStore.textExtensions().has(ext) ||
              allowedDotFiles.has(name)
            ) {
              this._cache.set(goldenPath, await file.text());
            } else {
              const buf = await file.arrayBuffer();
              this._cache.set(goldenPath, new Uint8Array(buf));
            }
          } catch (e) {
            console.warn(
              `[LocalDirectoryStore] Could not read ${goldenPath}:`,
              e
            );
          }
        }
      }
    } catch (dirErr) {
      console.warn(
        `[LocalDirectoryStore] Restricted or unreadable directory skipped: ${prefix}`,
        dirErr
      );
    }
  }

  async _writeToDisk(goldenPath, content) {
    try {
      const fileHandle = await this._resolveFileHandle(goldenPath, true);
      const writable = await fileHandle.createWritable();
      if (content instanceof Uint8Array) {
        await writable.write(content);
      } else {
        await writable.write(
          typeof content === 'string' ? content : String(content)
        );
      }
      await writable.close();
    } catch (e) {
      console.error(
        `[LocalDirectoryStore] Disk write failed for ${goldenPath}:`,
        e
      );
      throw e;
    }
  }

  async _resolveFileHandle(goldenPath, create = false) {
    const parts = this._relativeSegments(goldenPath);
    const fileName = parts.pop();
    let current = this._handle;
    for (const seg of parts) {
      current = await current.getDirectoryHandle(seg, { create });
    }
    return current.getFileHandle(fileName, { create });
  }

  async _resolveParentHandle(goldenPath, create = false) {
    const parts = this._relativeSegments(goldenPath);
    const fileName = parts.pop();
    let current = this._handle;
    try {
      for (const seg of parts) {
        current = await current.getDirectoryHandle(seg, { create });
      }
      return { parentHandle: current, fileName };
    } catch (e) {
      return { parentHandle: null, fileName };
    }
  }

  _relativeSegments(goldenPath) {
    const prefix = `/${this._projectName}/`;
    let rel = goldenPath.startsWith(prefix)
      ? goldenPath.slice(prefix.length)
      : goldenPath.replace(/^\//, '');
    return rel.split('/').filter(Boolean);
  }

  _idbKey() {
    return `localdir:${this._projectName}`;
  }

  async _persistToIDB() {
    await LocalDirectoryStore._idbPut(this._idbKey(), this._handle);
  }

  static _openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(
        LocalDirectoryStore.idbDbName(),
        LocalDirectoryStore.idbVersion()
      );
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(LocalDirectoryStore.idbStoreName());
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async _idbPut(key, value) {
    const db = await LocalDirectoryStore._openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        LocalDirectoryStore.idbStoreName(),
        'readwrite'
      );
      tx.objectStore(LocalDirectoryStore.idbStoreName()).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  static async _idbGet(key) {
    const db = await LocalDirectoryStore._openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LocalDirectoryStore.idbStoreName(), 'readonly');
      const req = tx.objectStore(LocalDirectoryStore.idbStoreName()).get(key);
      req.onsuccess = () => {
        db.close();
        resolve(req.result ?? null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  }

  static async _idbGetAllKeys() {
    const db = await LocalDirectoryStore._openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LocalDirectoryStore.idbStoreName(), 'readonly');
      const req = tx
        .objectStore(LocalDirectoryStore.idbStoreName())
        .getAllKeys();
      req.onsuccess = () => {
        db.close();
        resolve(req.result ?? []);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  }

  static async _idbDelete(key) {
    const db = await LocalDirectoryStore._openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        LocalDirectoryStore.idbStoreName(),
        'readwrite'
      );
      tx.objectStore(LocalDirectoryStore.idbStoreName()).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  static async _loadFromIDB(projectName) {
    return LocalDirectoryStore._idbGet(`localdir:${projectName}`);
  }

  async set(goldenPath, content) {
    const oldContent = this._cache.get(goldenPath);

    this._cache.set(goldenPath, content);
    await this._writeToDisk(goldenPath, content);

    const cachedReadback = this._cache.get(goldenPath);
    if (cachedReadback !== content) {
      throw new Error(
        `[LocalDirectoryStore] Cache readback mismatch after save: ${goldenPath}`
      );
    }

    if (typeof this._resolveFileHandle === 'function') {
      const fileHandle = await this._resolveFileHandle(goldenPath, false);
      const file = await fileHandle.getFile();

      if (content instanceof Uint8Array) {
        const diskBytes = new Uint8Array(await file.arrayBuffer());
        if (diskBytes.length !== content.length) {
          throw new Error(
            `[LocalDirectoryStore] Disk byte length mismatch after save: ${goldenPath}`
          );
        }
        for (let i = 0; i < content.length; i++) {
          if (diskBytes[i] !== content[i]) {
            throw new Error(
              `[LocalDirectoryStore] Disk byte mismatch after save at byte ${i}: ${goldenPath}`
            );
          }
        }
      } else {
        const expectedText =
          typeof content === 'string' ? content : String(content);
        const diskText = await file.text();
        if (diskText !== expectedText) {
          throw new Error(
            `[LocalDirectoryStore] Disk text readback mismatch after save: ${goldenPath}`
          );
        }
      }
    }

    if (
      typeof content === 'string' &&
      typeof oldContent === 'string' &&
      oldContent !== content
    ) {
      const app =
        window._dev_projectEditorInstance ||
        window.vibesApp ||
        window.projectApp;
      if (app && app.vfs && typeof app.vfs._hotPatchLiveMemory === 'function') {
        app.vfs._hotPatchLiveMemory(goldenPath, oldContent, content);
      }
    }

    if (
      typeof window !== 'undefined' &&
      window.projectApp?.localDirSessionManager?.updateFile
    ) {
      window.projectApp.localDirSessionManager.updateFile(goldenPath, content);
    }

    if (typeof window !== 'undefined' && window.projectApp?.tabOrchestrator) {
      window.projectApp.tabOrchestrator.refreshRunnerTab?.();
      window.projectApp.tabOrchestrator.refreshUrlPreviewTab?.();
    }

    return true;
  }

  static _doc_overview() {
    return `# LocalDirectoryStore

The \`LocalDirectoryStore\` is the local-disk gateway for the Vibes browser-based workspace.
It utilizes the W3C File System Access API (\`showDirectoryPicker\`) to obtain a persistent, secure directory handle from the operating system.
This allows the browser to perform direct read and write actions on local project folders.`;
  }

  static _doc_persistence() {
    return `## Persistence & Verification

To make workspace loading frictionless:
- Once a directory handle is selected by the user, the handle is serialized and cached inside IndexedDB (\`vibes-localdir\`).
- On subsequent page loads, Vibes requests permission to restore this handle, allowing users to 'vibe code' over local directories across reloads without having to pick the folder every single time.

### Bulletproof Verification
Following **Vibes Rule 1 (The Prime Directive)**, saving a file to the local directory is highly verified.
Every \`set\` operation:
1. Writes the content to the FileSystemFileHandle.
2. Reads the file back from disk instantly.
3. Asserts an exact match (either byte-length or text comparison) against the intended buffer.
4. If any readback mismatch is detected, the operation fails noisily, halting execution to prevent silent file corruption.`;
  }

  static _doc_collaborators() {
    return `## Key Coordinates & Collaborators

- \`VirtualFileSystem\`: Integrates the store as the primary workspace storage layer.
- \`LocalDirSessionManager\`: Translates the local file map and pipes it to the service worker.
- \`runner-sw.js\`: Serves local files from memory with native MIME types, allowing standard ES modules to resolve seamlessly inside the runner iframe.`;
  }

  static _doc() {
    return [
      this._doc_overview(),
      this._doc_persistence(),
      this._doc_collaborators(),
    ].join('\n\n');
  }

  static _doc_LocalDirectoryStore() {
    return `# LocalDirectoryStore

## Summary

LocalDirectoryStore is the local-disk gateway for the Vibes browser-based workspace. It utilizes the W3C File System Access API (\`showDirectoryPicker\`) to obtain a persistent, secure directory handle from the operating system, allowing the browser to perform direct read and write actions on local project folders.`;
  }
}