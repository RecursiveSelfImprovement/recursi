// (replace)
class VirtualFileSystem {
  constructor(app, options = {}) {
    this.app = app;
    this.localStore = options.localStore || null;
    this.memoryStore = options.memoryStore || null;
    this.staticRoot = options.staticRoot || '';
    this.mode = options.mode || 'static-readonly';
    this.fetchCache = new Map();
  }

  setLocalStore(store) {
    this.localStore = store;
  }

  setMemoryStore(store) {
    this.memoryStore = store;
  }

  setStaticRoot(staticRoot) {
    this.staticRoot = staticRoot;
  }

  setMode(mode) {
    this.mode = mode;
  }

  getMode() {
    return this.mode;
  }

  isWritable() {
    return this.mode !== 'static-readonly';
  }

  async hasFile(goldenPath) {
      const path = this.normalizePath(goldenPath);
      
      // Check for patch tombstone first
      if (this.app?.patchStore) {
        const patches = await this.app.patchStore.getPatchesForFile(path);
        if (patches && patches['__file__'] && patches['__file__'].deleted) {
          return false;
        }
      }

      const workspaceStore = this._getWorkspaceStoreForPath(path);
      if (workspaceStore && (await this._storeHas(workspaceStore, path)))
        return true;
      if (this.localStore && (await this._storeHas(this.localStore, path)))
        return true;
      if (this.memoryStore && (await this._storeHas(this.memoryStore, path)))
        return true;
      if (this.app?.patchStore) {
        const patches = await this.app.patchStore.getPatchesForFile(path);
        if (patches && Object.keys(patches).length > 0) return true;
      }
      return await this._staticExists(path);
    }

  async readFile(goldenPath, options = {}) {
      const path = this.normalizePath(goldenPath);
      if (!path) {
        throw new Error('VirtualFileSystem.readFile requires a path.');
      }

      // Check for patch tombstone first
      if (this.app?.patchStore) {
        const patches = await this.app.patchStore.getPatchesForFile(path);
        if (patches && patches['__file__'] && patches['__file__'].deleted) {
          if (options.nullOnMissing) return null;
          throw new Error(`File has been deleted: ${path}`);
        }
      }

      const workspaceStore = this._getWorkspaceStoreForPath(path);
      if (workspaceStore && (await this._storeHas(workspaceStore, path))) {
        return await this._storeGet(workspaceStore, path);
      }
      const localStore = this._getLocalStore();
      if (localStore && (await this._storeHas(localStore, path))) {
        return await this._storeGet(localStore, path);
      }
      const memoryStore = this._getMemoryStore();
      if (memoryStore && (await this._storeHas(memoryStore, path))) {
        return await this._storeGet(memoryStore, path);
      }
      if (options.noStaticFetch) {
        return null;
      }
      const content = await this._fetchStaticFile(path, options);
      if (typeof content === 'string' && options.noIdbPatch !== true) {
        return await this._applyIdbMethodPatches(path, content);
      }
      return content;
    }

  async writeFile(goldenPath, content, options = {}) {
      const path = this.normalizePath(goldenPath);
      if (!path) throw new Error('VirtualFileSystem.writeFile requires a path.');
      if (typeof content !== 'string')
        throw new Error('VirtualFileSystem.writeFile content must be a string.');

      const parts = path.split('/').filter(Boolean);
      if (parts.length > 1 && this.app?.workspaceFileStores) {
        const directRootId = '/' + parts[0];
        const nestedRootId = '/' + parts[1];
        const directStore = this.app.workspaceFileStores.get(directRootId);
        const nestedStore = this.app.workspaceFileStores.get(nestedRootId);
        if (directStore && nestedStore && directStore !== nestedStore) {
          const nestedProjectName = nestedStore._projectName || parts[1];
          if (nestedProjectName === parts[1]) {
            throw new Error(
              `[VFS] Refusing cross-root nested workspace path: ${path}. Write directly to ${nestedRootId} instead.`
            );
          }
        }
      }

      if (!options.skipHistory) {
        const existingContent = await this.readFile(path, {
          noStaticFetch: true,
          noIdbPatch: true,
        }).catch(() => null);
        if (existingContent === content) {
          this.app?.uiManager?.setStatus(
            `No changes detected for ${path}. Save ignored.`,
            true
          );
          return { ok: true, unchanged: true, path, backend: 'none' };
        }

        if (existingContent) {
          this._hotPatchLiveMemory(path, existingContent, content);
        }

        if (this.app?.historyManager) {
          await this.app.historyManager.recordFileChange({
            path,
            content,
            oldContent: existingContent,
            action: existingContent !== null ? 'update' : 'create',
          });
        }
      }

      const workspaceStore = this._getWorkspaceStoreForPath(path);
      if (
        workspaceStore &&
        options.target !== 'localdir'
      ) {
        await this._storeSet(workspaceStore, path, content);
        this._afterWrite(path, content, 'workspace');
        return { ok: true, path, backend: 'workspace' };
      }

      const preferredTarget = options.target || this.getMode();
      if (preferredTarget === 'localdir') {
        const localStore = this._getLocalStore();
        if (!localStore)
          throw new Error(
            'Cannot write to localdir because no LocalDirectoryStore is mounted.'
          );
        await this._storeSet(localStore, path, content);
        this._afterWrite(path, content, 'localdir');
        return { ok: true, path, backend: 'localdir' };
      }

      const localStore = this._getLocalStore();
      if (
        preferredTarget === 'indexeddb' ||
        preferredTarget === 'patch' ||
        (!localStore && !workspaceStore)
      ) {
        if (this.app?.patchManager) {
          await this._diffAndPatch(path, content);
          return { ok: true, path, backend: 'indexeddb' };
        }
      }

      if (localStore && options.allowImplicitWritableTarget !== false) {
        await this._storeSet(localStore, path, content);
        this._afterWrite(path, content, 'localdir');
        return { ok: true, path, backend: 'localdir' };
      }
      
      throw new Error(
        `Cannot write ${path}; current VFS mode is static-readonly and no writable store is mounted.`
      );
    }


  async _reconstructFromPatches(path) {
      if (!this.app || !this.app.patchStore) return null;
      const patches = await this.app.patchStore.getPatchesForFile(path);
      if (!patches || Object.keys(patches).length === 0) return null;

      if (patches['__file__'] && patches['__file__'].deleted) return null;
      if (patches['__file__']) return patches['__file__'].source;

      const base = await this._fetchStaticFile(path, { nullOnMissing: true });
      if (!base) return null;

      return await this._applyIdbMethodPatches(path, base);
    }

  async deleteFile(goldenPath, options = {}) {
      const path = this.normalizePath(goldenPath);
      if (!path) throw new Error('VirtualFileSystem.deleteFile requires a path.');

      if (!options.skipHistory) {
        const existingContent = await this.readFile(path, {
          noStaticFetch: true,
          noIdbPatch: true,
        }).catch(() => null);
        if (existingContent && this.app?.historyManager) {
          await this.app.historyManager.recordFileChange({
            path,
            content: existingContent,
            oldContent: existingContent,
            action: 'delete',
          });
        }
      }

      // Synchronize caches - clean up memory store
      if (this.memoryStore && typeof this.memoryStore.delete === 'function') {
        this.memoryStore.delete(path);
      }
      if (this.app?.inMemoryFileStore && typeof this.app.inMemoryFileStore.delete === 'function') {
        this.app.inMemoryFileStore.delete(path);
      }

      const workspaceStore = this._getWorkspaceStoreForPath(path);
      if (
        workspaceStore &&
        options.target !== 'localdir'
      ) {
        await this._storeDelete(workspaceStore, path);
        this._afterDelete(path, 'workspace');
        return { ok: true, path, backend: 'workspace' };
      }

      const preferredTarget = options.target || this.getMode();
      if (preferredTarget === 'localdir') {
        const localStore = this._getLocalStore();
        if (!localStore)
          throw new Error(
            'Cannot delete from localdir because no LocalDirectoryStore is mounted.'
          );
        await this._storeDelete(localStore, path);
        this._afterDelete(path, 'localdir');
        return { ok: true, path, backend: 'localdir' };
      }

      if (
        preferredTarget === 'indexeddb' ||
        preferredTarget === 'patch' ||
        (!this._getLocalStore() && !workspaceStore)
      ) {
        if (this.app?.patchStore) {
          // Write a tombstone patch to mark baseline static files as deleted
          await this.app.patchStore.setMethodPatch(path, null, '', { deleted: true });
          this._afterDelete(path, 'indexeddb');
          return { ok: true, path, backend: 'indexeddb' };
        }
      }

      const localStore = this._getLocalStore();
      if (localStore && options.allowImplicitWritableTarget !== false) {
        await this._storeDelete(localStore, path);
        this._afterDelete(path, 'localdir');
        return { ok: true, path, backend: 'localdir' };
      }

      throw new Error(`Cannot delete ${path}; static files are read-only.`);
    }

  async moveFile(sourcePath, destinationPath, options = {}) {
    return { ok: false };
  }

  async listFiles(options = {}) {
      const includeStatic = options.includeStatic !== false;
      const result = new Set();
      
      // Collect all tombstones we should exclude
      const tombstones = new Set();
      if (this.app?.patchStore) {
        const patchedFiles = await this.app.patchStore.listPatchedFiles();
        for (const p of patchedFiles) {
          const patches = await this.app.patchStore.getPatchesForFile(p);
          if (patches && patches['__file__'] && patches['__file__'].deleted) {
            tombstones.add(this.normalizePath(p));
          }
        }
      }

      for (const entry of this._getWorkspaceStores()) {
        const workspaceFiles = await this._storeKeys(entry.store);
        for (const path of workspaceFiles) {
          result.add(this.normalizePath(path));
        }
      }
      const localStore = this._getLocalStore();
      if (localStore) {
        const localFiles = await this._storeKeys(localStore);
        for (const path of localFiles) {
          result.add(this.normalizePath(path));
        }
      }

      if (this.app?.patchStore) {
        const patchedFiles = await this.app.patchStore.listPatchedFiles();
        for (const p of patchedFiles) {
          result.add(this.normalizePath(p));
        }
      }

      if (includeStatic) {
        const staticFiles = await this._listStaticFiles(options);
        for (const path of staticFiles) {
          result.add(this.normalizePath(path));
        }
      }

      return Array.from(result)
        .map(p => this.normalizePath(p))
        .filter(p => p && !tombstones.has(p))
        .sort();
    }

  normalizePath(path) {
    if (!path) return '';
    let p = String(path).trim();
    if (!p.startsWith('/')) p = '/' + p;
    return p;
  }

  toStaticUrl(goldenPath) {
    return this.staticRoot + goldenPath;
  }

  clearFetchCache() {
    this.fetchCache.clear();
  }

  _getLocalStore() {
    return this.localStore;
  }

  _getMemoryStore() {
    return this.memoryStore;
  }

  _ensureMemoryStore() {
    if (!this.memoryStore) this.memoryStore = new Map();
    return this.memoryStore;
  }

  _getWorkspaceStores() {
    if (this.app?.workspaceFileStores)
      return Array.from(this.app.workspaceFileStores.entries()).map((e) => ({
        id: e[0],
        store: e[1],
      }));
    return [];
  }

  _getWorkspaceStoreForPath(path) {
      const normalized = this.normalizePath(path);
      const parts = normalized.split('/').filter(Boolean);

      if (parts.length === 0 || !this.app?.workspaceFileStores) {
        return null;
      }

      const directRootId = '/' + parts[0];
      const directStore = this.app.workspaceFileStores.get(directRootId);

      return directStore || null;
    }

  async _storeHas(store, path) {
    if (typeof store.has === 'function') return await store.has(path);
    return path in store;
  }

  async _storeGet(store, path) {
    if (typeof store.get === 'function') {
      const v = await store.get(path);
      return typeof v === 'string' ? v : v?.content ?? null;
    }
    return store[path];
  }

  async _storeSet(store, path, content) {
    if (typeof store.set === 'function') await store.set(path, content);
    else store[path] = content;
  }

  async _storeDelete(store, path) {
    if (typeof store.delete === 'function') await store.delete(path);
    else delete store[path];
  }

  async _storeKeys(store) {
    if (typeof store.keys === 'function') return Array.from(await store.keys());
    return Object.keys(store);
  }

  async _fetchStaticFile(path, options = {}) {
    const target = String(path || '');
    if (
      target.endsWith('filelist.json') ||
      target.endsWith('file_metadata.json') ||
      target.endsWith('ManagedDependencyLoader.js') ||
      target.endsWith('recursiModule.js')
    ) {
      if (options.nullOnMissing) return null;
      throw new Error(`Obsolete file intercepted: ${target}`);
    }

    if (this.fetchCache.has(path)) return this.fetchCache.get(path);
    try {
      const res = await fetch(this.toStaticUrl(path));
      if (!res.ok) {
        if (options.nullOnMissing) return null;
        throw new Error(`Failed to fetch static file: ${res.statusText}`);
      }
      const text = await res.text();
      this.fetchCache.set(path, text);
      return text;
    } catch (e) {
      if (options.nullOnMissing) return null;
      throw e;
    }
  }

  async _staticExists(path) {
    try {
      const res = await fetch(this.toStaticUrl(path), { method: 'HEAD' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async _listStaticFiles(options = {}) {
    if (!this.app || !this.app.projectName) return [];
    const projectName = this.app.projectName;

    try {
      const htmlRes = await fetch(`/${projectName}/index.html?_=${Date.now()}`);
      if (htmlRes.ok) {
        const htmlContent = await htmlRes.text();
        const paths = [`/${projectName}/index.html`];

        const scanner =
          typeof HTMLDependencyScanner !== 'undefined'
            ? HTMLDependencyScanner
            : window.HTMLDependencyScanner;
        if (scanner) {
          const deps = scanner.scan(htmlContent, `/${projectName}/index.html`);
          paths.push(...deps.scripts, ...deps.styles);
        }

        const dataMainMatch = htmlContent.match(/data-main=["']([^"']+)["']/i);
        if (dataMainMatch) {
          let mainFile = dataMainMatch[1];
          if (mainFile.startsWith('./')) mainFile = mainFile.substring(2);
          if (!mainFile.startsWith('/'))
            mainFile = `/${projectName}/${mainFile}`;
          if (!paths.includes(mainFile)) paths.push(mainFile);
        }

        const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
        let match;
        while ((match = scriptRegex.exec(htmlContent))) {
          let src = match[1];
          if (!src.startsWith('http')) {
            if (src.startsWith('./')) src = src.substring(2);
            if (!src.startsWith('/')) src = `/${projectName}/${src}`;
            if (!paths.includes(src)) paths.push(src);
          }
        }

        const linkRegex = /<link[^>]+href=["']([^"']+)["']/gi;
        while ((match = linkRegex.exec(htmlContent))) {
          let href = match[1];
          if (!href.startsWith('http')) {
            if (href.startsWith('./')) href = href.substring(2);
            if (!href.startsWith('/')) href = `/${projectName}/${href}`;
            if (!paths.includes(href)) paths.push(href);
          }
        }

        return paths;
      }
    } catch (e) {}
    return [];
  }

  _afterWrite(path, content, backend) {
    if (this.app?.projectFilesManager?.addInMemoryFileNode) {
      this.app.projectFilesManager.addInMemoryFileNode(path);
    }

    if (this.app?.editorControllers) {
      const ctrl = this.app.editorControllers.get(path);
      if (ctrl && typeof ctrl.init === 'function') {
        ctrl.init(content, true).catch((e) => console.error(e));
      }
    }

    if (typeof window !== 'undefined')
      window.dispatchEvent(
        new CustomEvent('vfs:file-written', { detail: { path, backend } })
      );
  }

  _afterDelete(path, backend) {
    if (typeof window !== 'undefined')
      window.dispatchEvent(
        new CustomEvent('vfs:file-deleted', { detail: { path, backend } })
      );
  }

  async _getIdbPatchStore() {
    if (this._idbPatchStoreCache) {
      return this._idbPatchStoreCache;
    }
    const pmStore = this.app?.patchManager?.store;
    if (pmStore) {
      if (!pmStore._db) {
        try {
          await pmStore.init();
        } catch (e) {
          /* ignore init errors */
        }
      }
      if (pmStore._db) {
        this._idbPatchStoreCache = pmStore;
        return pmStore;
      }
    }
    if (typeof VibesPatchStore !== 'undefined') {
      try {
        const store = await VibesPatchStore.open();
        this._idbPatchStoreCache = store;
        return store;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  async _applyIdbMethodPatches(path, content) {
      if (!path.endsWith('.js') || typeof content !== 'string') {
        return content;
      }
      let store;
      try {
        store = await this._getIdbPatchStore();
      } catch (e) {
        return content;
      }
      if (!store) return content;
      let patches;
      try {
        patches = await store.getPatchesForFile(path);
      } catch (e) {
        return content;
      }
      if (!patches) return content;
      if (!Array.isArray(patches)) patches = Object.values(patches);
      if (patches.length === 0) return content;
      const acorn = (typeof window !== 'undefined' && window.acorn) || null;
      if (!acorn) {
        console.warn(
          '[VFS] IDB patches exist for',
          path,
          'but acorn is not available - skipping.'
        );
        return content;
      }
      let patched = content;
      let applied = 0;
      for (const patch of patches) {
        try {
          patched = this._applyOneIdbMethodPatch(acorn, patched, patch);
          applied++;
        } catch (e) {
          const warnMsg = `⚠️ Failed to apply patch '${patch.methodName}' on ${path.split('/').pop()}: ${e.message}`;
          console.warn(warnMsg);
          // Highlight failure on the status bar so the user knows something failed to apply
          if (this.app?.uiManager?.setStatus) {
            this.app.uiManager.setStatus(warnMsg, true, 8000);
          }
        }
      }
      return patched;
    }

  _applyOneIdbMethodPatch(acorn, source, patch) {
    const {
      methodName,
      source: methodSource,
      className: targetClassName,
    } = patch;
    if (!methodName || typeof methodSource !== 'string') {
      return source;
    }

    const normalize = (str) =>
      String(str || '')
        .replace(/^(static\s+|async\s+|get\s+|set\s+)+/, '')
        .trim();
    const cleanTarget = normalize(methodName);

    let ast;
    try {
      ast = acorn.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        ranges: true,
      });
    } catch (e) {
      try {
        ast = acorn.parse(source, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ranges: true,
        });
      } catch (e2) {
        throw new Error('Could not parse source: ' + e2.message);
      }
    }

    let classNode = null;
    for (const node of ast.body) {
      if (node.type === 'ClassDeclaration') {
        if (!targetClassName || node.id?.name === targetClassName) {
          classNode = node;
          break;
        }
      }
    }
    if (!classNode) {
      throw new Error(
        'Class' +
          (targetClassName ? ' ' + targetClassName : '') +
          ' not found in source.'
      );
    }

    let methodNode = null;
    for (const member of classNode.body.body) {
      let memberName = null;
      if (member.key?.type === 'Identifier') memberName = member.key.name;
      else if (member.key?.type === 'Literal')
        memberName = String(member.key.value);
      if (memberName && normalize(memberName) === cleanTarget) {
        methodNode = member;
        break;
      }
    }

    let result;
    if (methodNode) {
      result =
        source.slice(0, methodNode.start) +
        methodSource +
        source.slice(methodNode.end);
    } else {
      const insertAt = classNode.body.end - 1;
      result =
        source.slice(0, insertAt) +
        '\n\n  ' +
        methodSource +
        '\n' +
        source.slice(insertAt);
    }

    try {
      acorn.parse(result, { ecmaVersion: 'latest', sourceType: 'script' });
    } catch (parseError) {
      throw new Error(
        'Patch for ' +
          methodName +
          ' produced invalid syntax: ' +
          parseError.message
      );
    }

    return result;
  }

 async _diffAndPatch(path, newContent) {
      if (!this.app || !this.app.patchManager) return false;
      const baseContent = await this._fetchStaticFile(path, { nullOnMissing: true });
      
      if (!baseContent || !path.endsWith('.js')) {
        await this.app.patchManager.applyFilePatch(path, newContent);
        this._afterWrite(path, newContent, 'indexeddb');
        return true;
      }
      
      const CJCP = typeof ClientJSClassPatcher !== 'undefined' ? ClientJSClassPatcher : window.ClientJSClassPatcher;
      if (!CJCP || typeof CJCP._listAllClasses !== 'function') {
        await this.app.patchManager.applyFilePatch(path, newContent);
        this._afterWrite(path, newContent, 'indexeddb');
        return true;
      }

      try {
        const beforeClasses = CJCP._listAllClasses(baseContent);
        const afterClasses = CJCP._listAllClasses(newContent);
        const allClasses = [...new Set([...beforeClasses, ...afterClasses])];
        let hasChanges = false;

        const cleanForCompare = async (src) => {
          if (!src) return '';
          let formatted = src;
          try {
            if (typeof CodeFormatter !== 'undefined' && typeof CodeFormatter.format === 'function') {
              formatted = await CodeFormatter.format(src);
            }
          } catch (e) {}
          return String(formatted)
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s+/g, ' ')
            .trim();
        };

        const applyToLiveMemory = (cls, mName, mSrc) => {
          if (this.app.settings?.preferHotPatching !== false && mSrc) {
             try {
               let Cls = typeof window !== 'undefined' ? window[cls] : null;
               if (!Cls && typeof globalThis !== 'undefined') Cls = globalThis[cls];
               if (Cls) {
                 const TempClass = new Function("return (class __VibesHotPatch__ { " + mSrc + "\n})")();
                 const isStatic = mSrc.trim().startsWith('static ');
                 const targetObj = isStatic ? Cls : Cls.prototype;
                 let cleanName = mName.replace(/^(static\s+|async\s+|get\s+|set\s+)+/, '').trim();
                 const desc = Object.getOwnPropertyDescriptor(isStatic ? TempClass : TempClass.prototype, cleanName);
                 if (desc) Object.defineProperty(targetObj, cleanName, desc);
               }
             } catch(e) {}
          }
        };

        for (const cls of allClasses) {
          const bMethods = new Set(CJCP._listClassMethods(baseContent, cls) || []);
          const aMethods = new Set(CJCP._listClassMethods(newContent, cls) || []);
          const added = [...aMethods].filter(m => !bMethods.has(m));
          const removed = [...bMethods].filter(m => !aMethods.has(m));
          
          const replaced = [];
          for (const m of [...aMethods]) {
            if (!bMethods.has(m)) continue;
            const bSrc = CJCP._findMethodInSource(baseContent, m, { className: cls, includeComments: true })?.source;
            const aSrc = CJCP._findMethodInSource(newContent, m, { className: cls, includeComments: true })?.source;
            
            const cleanB = await cleanForCompare(bSrc);
            const cleanA = await cleanForCompare(aSrc);
            if (cleanB !== cleanA) {
              replaced.push(m);
            }
          }

          for (const m of added) {
            const src = CJCP._findMethodInSource(newContent, m, { className: cls, includeComments: true })?.source;
            if (src) { await this.app.patchStore.setMethodPatch(path, m, src, { className: cls }); applyToLiveMemory(cls, m, src); }
          }
          for (const m of replaced) {
            const src = CJCP._findMethodInSource(newContent, m, { className: cls, includeComments: true })?.source;
            if (src) { await this.app.patchStore.setMethodPatch(path, m, src, { className: cls }); applyToLiveMemory(cls, m, src); }
          }
          for (const m of removed) {
            await this.app.patchStore.setMethodPatch(path, m, '', { className: cls, deleted: true });
          }
          
          if (added.length || replaced.length || removed.length) hasChanges = true;
        }

        if (hasChanges) {
          const reconstructed = await this._reconstructFromPatches(path);
          if (reconstructed) {
             if (this.app.inMemoryFileStore) this.app.inMemoryFileStore.set(path, reconstructed);
             this._afterWrite(path, reconstructed, 'indexeddb');
          }
          return true;
        }
      } catch (err) {
        console.error('[VFS] AST Diffing failed on save:', err);
        const errorMsg = `AST Patching Failed for ${path.split('/').pop()}: ${err.message}`;
        this.app.uiManager?.setStatus(errorMsg, true);
        
        // Expose the error with complete transparency to the user via a detailed dialog
        const UIToolsObj = typeof window !== 'undefined' ? (window.UITools || window._dev_projectEditorInstance?.uiManager?.uiTools) : null;
        if (UIToolsObj && typeof makeElement === 'function') {
          const pre = document.createElement('pre');
          pre.style.cssText = 'background: #2d1313; color: #ffb8b8; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 11px; max-height: 350px; overflow: auto; border: 1px solid rgba(255, 80, 80, 0.4);';
          pre.textContent = err.stack || err.message || String(err);
          
          UIToolsObj.makeDialog({
            title: '⚠️ AST Saving Failure',
            contentElement: makeElement('div', {}, [
              makeElement('p', { style: { fontWeight: 'bold', color: '#ffa0a0', marginBottom: '10px' } }, 'Saving was aborted because the changes produced an AST error. Your file was NOT saved:'),
              pre
            ]),
            width: '600px'
          });
        }
        
        throw err; // Throw to halt the write transaction
      }
      
      // Fallback in case there were no surgical differences found on a JS file
      await this.app.patchManager.applyFilePatch(path, newContent);
      this._afterWrite(path, newContent, 'indexeddb');
      return true;
    }

  static _doc_overview() {
      return `# VirtualFileSystem (VFS)

The \`VirtualFileSystem\` (VFS) is the core storage and file-routing hub of the Vibes environment.
It acts as a single gateway that abstracts file access over multiple layers:
1. **Local Directory Store** (\`LocalDirectoryStore\`): Direct read/write access to the local OS file system via browser File System Access APIs.
2. **Patch Store** (\`PatchManager\` / \`VibesPatchStore\`): Browser-local IndexedDB storage containing surgical, method-level patches applied over read-only static files.
3. **In-Memory Cache** (\`inMemoryFileStore\`): A volatile RAM-cache containing dirty changes staged for hot-patching or previewing.
4. **Static Server Fallback**: A read-only web server fallback used to fetch baseline template files.

### Philosophy & Design
By channeling all file reads and writes through the VFS, Vibes avoids the complexity of traditional file systems.
The IDE can run perfectly inside a static web page with zero local server, utilizing browser-local IndexedDB to 'patch' files, or connect directly to a local project directory when the user grants permission.`;
    }

  static _doc_patching() {
      return `## Intelligent Patching & Live Hot Patching

VFS is not a dumb file wrapper; it has a deep understanding of code structure.
When writing a \`.js\` file, VFS performs an AST-based diff check via \`ClientJSClassPatcher\`:
- It compares the new content with the existing static/VFS content.
- It isolates the added, replaced, or deleted class methods.
- Instead of replacing the whole file on disk, it writes individual, surgical method-level patches to \`VibesPatchStore\`.
- It simultaneously hot-patches the running JavaScript prototype in the browser window on the fly.

This architectural decision means edits are instantly live in the preview sandbox without page reloads or slow compilation cycles.`;
    }

  static _doc_coordination() {
      return `## Key Coordinates & Collaborators

- \`LocalDirectoryStore\`: Bound as the writable target in local directory mode.
- \`PatchManager\`: Manages IndexedDB method patches for the current session.
- \`ClientJSClassPatcher\`: The AST-diff engine used to dissect JS class bodies into individual methods.
- \`HTMLDependencyScanner\`: Explores HTML script/stylesheet links to build file index catalogs.`;
    }

  static _doc() {
      return [
        this._doc_VirtualFileSystem(),
        this._doc_overview(),
        this._doc_patching(),
        this._doc_coordination()
      ].join('\n\n');
    }

  

  static _doc_VirtualFileSystem() {
      return `# VirtualFileSystem

## Summary

VirtualFileSystem (VFS) is the core storage and file-routing hub of the Vibes environment. It acts as a single gateway that abstracts file access over multiple layers:
1. **Local Directory Store** (\`LocalDirectoryStore\`): Direct read/write access to the local OS file system via browser File System Access APIs.
2. **Patch Store** (\`PatchManager\` / \`VibesPatchStore\`): Browser-local IndexedDB storage containing surgical, method-level patches.
3. **In-Memory Cache** (\`inMemoryFileStore\`): A volatile RAM-cache containing dirty changes staged for hot-patching or previewing.
4. **Static Server Fallback**: A read-only web server fallback used to fetch baseline template files.

By channeling all file reads and writes through the VFS, Vibes avoids the complexity of traditional file systems. The IDE can run perfectly inside a static web page with zero local server, utilizing browser-local IndexedDB to "patch" files, or connect directly to a local project directory when the user grants permission.`;
    }

  _hotPatchLiveMemory(path, oldContent, newContent) {
      const fileName = path.split('/').pop();
      
      // Send diagnostic tracers directly to F12 Dev Tools Console
      console.log(`%c[VFS Hot Patch] 🔍 Analyzing class changes in: ${fileName}`, 'color: #00bfa5; font-weight: bold;');

      if (!path.endsWith('.js') || !oldContent || !newContent) {
        console.log('[VFS Hot Patch] Skipping: Not a JavaScript file or content is empty.');
        return;
      }
      if (this.app?.settings?.preferHotPatching === false) {
        console.log('[VFS Hot Patch] Skipping: preferHotPatching is disabled in settings.');
        return;
      }

      const CJCP = typeof ClientJSClassPatcher !== 'undefined' ? ClientJSClassPatcher : window.ClientJSClassPatcher;
      if (!CJCP || typeof CJCP._listAllClasses !== 'function') {
        console.warn('[VFS Hot Patch] ClientJSClassPatcher is not loaded on global/window scope.');
        return;
      }

      try {
        const beforeClasses = CJCP._listAllClasses(oldContent);
        const afterClasses = CJCP._listAllClasses(newContent);
        const allClasses = [...new Set([...beforeClasses, ...afterClasses])];

        if (allClasses.length === 0) {
          console.log(`[VFS Hot Patch] No class declarations detected in ${fileName}.`);
          return;
        }

        const applyToLiveMemory = (cls, mName, mSrc) => {
          if (mSrc) {
             try {
               let Cls = typeof window !== 'undefined' ? window[cls] : null;
               if (!Cls && typeof globalThis !== 'undefined') Cls = globalThis[cls];
               
               if (!Cls) {
                 console.log(`%c[VFS Hot Patch] Class "${cls}" is not registered on window scope. Method "${mName}" cannot be live-bound.`, 'color: #ff9800;');
                 return false;
               }

               const TempClass = new Function("return (class __VibesHotPatch__ { " + mSrc + "\n})")();
               const isStatic = mSrc.trim().startsWith('static ');
               const targetObj = isStatic ? Cls : Cls.prototype;
               
               let cleanName = mName.replace(/^(static\s+|async\s+|get\s+|set\s+)+/, '').trim();
               const desc = Object.getOwnPropertyDescriptor(isStatic ? TempClass : TempClass.prototype, cleanName);
               if (desc) {
                 Object.defineProperty(targetObj, cleanName, desc);
                 console.log(`%c[VFS Hot Patch] 🟢 SUCCESS: Live patched method -> ${cls}.${cleanName}`, 'color: #4caf50; font-weight: bold;');
                 this.app?.uiManager?.setStatus(`⚡ Hot-patched: ${cls}.${cleanName}`);
                 return true;
               }
             } catch(e) {
               console.error(`[VFS Hot Patch] Failed to compile method ${mName} for class ${cls}:`, e);
             }
          }
          return false;
        };

        for (const cls of allClasses) {
          const bMethods = new Set(CJCP._listClassMethods(oldContent, cls) || []);
          const aMethods = new Set(CJCP._listClassMethods(newContent, cls) || []);
          const added = [...aMethods].filter(m => !bMethods.has(m));
          const replaced = [];

          for (const m of [...aMethods]) {
            if (!bMethods.has(m)) continue;
            const bSrc = CJCP._findMethodInSource(oldContent, m, { className: cls, includeComments: true })?.source;
            const aSrc = CJCP._findMethodInSource(newContent, m, { className: cls, includeComments: true })?.source;

            if (bSrc !== aSrc) {
              replaced.push(m);
            }
          }

          console.log(`[VFS Hot Patch] Discovered ${added.length} added and ${replaced.length} modified methods in Class "${cls}".`);

          for (const m of added) {
            const src = CJCP._findMethodInSource(newContent, m, { className: cls, includeComments: true })?.source;
            if (src) applyToLiveMemory(cls, m, src);
          }
          for (const m of replaced) {
            const src = CJCP._findMethodInSource(newContent, m, { className: cls, includeComments: true })?.source;
            if (src) applyToLiveMemory(cls, m, src);
          }
        }
      } catch (err) {
        console.error('[VFS Hot Patch] AST diff process failed:', err);
      }
    }
}