class ProjectFloatingTreeStoreBuilder {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  async openLibraryAsFloatingTree(manager = this.manager) {
    await this.ensureLibraryPathsForFloatingTree(manager);

    const opened = await this.openPrefixAsFloatingTree(manager, {
      prefix: "/library",
      label: "📚 Library Tree",
      includeLibrary: true
    });

    if (!opened) {
      manager?.app?.uiManager?.setStatus?.(
        "Could not open /library floating tree. Library files may not be hydrated.",
        true
      );
    }

    return opened;
  }

  async ensureLibraryPathsForFloatingTree(manager = this.manager) {
    const known = this.collectKnownPathsForPrefix(manager, "/library", {
      includeLibrary: true
    });

    if (known.length > 0) {
      return known;
    }

    if (
      manager?.app?.projectLoader &&
      typeof manager.app.projectLoader._showHostedLibraryTreeFromServer ===
        "function"
    ) {
      try {
        await manager.app.projectLoader._showHostedLibraryTreeFromServer(
          manager.app.inMemoryFileMetadata || {}
        );
      } catch (error) {
        console.warn(
          "[ProjectFloatingTreeStoreBuilder] hosted library tree restore failed:",
          error
        );
      }
    }

    const afterProjectLoader = this.collectKnownPathsForPrefix(
      manager,
      "/library",
      {
        includeLibrary: true
      }
    );

    if (afterProjectLoader.length > 0) {
      return afterProjectLoader;
    }

    await this.hydrateLibraryManifest(manager);

    return this.collectKnownPathsForPrefix(manager, "/library", {
      includeLibrary: true
    });
  }

  async hydrateLibraryManifest(manager = this.manager) {
    if (!manager?.app) return false;

    try {
      const response = await fetch("/library/filelist.json?_=" + Date.now());

      if (!response.ok) {
        return false;
      }

      const text = await response.text();
      const manifest = JSON.parse(text);
      const all = []
        .concat(manifest.js || [])
        .concat(manifest.css || [])
        .concat(manifest.html || [])
        .concat(manifest.other || []);

      if (!manager.app.inMemoryFileStore) {
        manager.app.inMemoryFileStore = new Map();
      }

      manager.app.inMemoryFileStore.set("/library/filelist.json", text);

      for (const item of all) {
        const rawPath = typeof item === "string" ? item : item.path;
        if (!rawPath) continue;

        const path = rawPath.startsWith("/") ? rawPath : "/" + rawPath;
        if (!path.startsWith("/library/")) continue;

        if (!manager.app.inMemoryFileStore.has(path)) {
          try {
            const fileResponse = await fetch(path + "?_=" + Date.now());

            if (fileResponse.ok) {
              const fileText = await fileResponse.text();
              manager.app.inMemoryFileStore.set(path, fileText);
            }
          } catch (fileError) {}
        }
      }

      return true;
    } catch (error) {
      console.warn(
        "[ProjectFloatingTreeStoreBuilder] library manifest hydration failed:",
        error
      );
      return false;
    }
  }

  async openPrefixAsFloatingTree(manager = this.manager, options = {}) {
    const prefix = options.prefix || "/";
    const label = options.label || prefix;

    const paths = this.collectKnownPathsForPrefix(manager, prefix, {
      includeLibrary: !!options.includeLibrary
    });

    if (!paths.length) {
      return false;
    }

    const store = this.makeReadOnlyFloatingTreeStore(manager, {
      prefix,
      label,
      paths
    });

    return await this.callOpenFloatingTreeForStore(manager, prefix, store, label);
  }

  makeReadOnlyFloatingTreeStore(manager = this.manager, options = {}) {
    const builder = this;
    const prefix = options.prefix || "/";
    const label = options.label || prefix;
    const pathSet = new Set(options.paths || []);

    return {
      _projectName: builder.safeFloatingTreeRootLabel(label),
      name: label,
      rootId: prefix,
      readOnly: false, // Writable / Patchable

      keys() {
        return Array.from(pathSet).sort();
      },

      entries() {
        return this.keys().map((path) => [path, this.get(path)]);
      },

      has(path) {
        return pathSet.has(path);
      },

      get(path) {
        return builder.readKnownPathForFloatingTree(manager, path);
      },

      async readFile(path) {
        return builder.readKnownPathForFloatingTree(manager, path);
      },

      async set(path, content) {
        console.log(`[PatchableStore] Intercepted write on ${path}. Saving client-side patch.`);
        const patchManager = manager?.app?.patchManager;
        if (patchManager) {
          const isJs = path.endsWith('.js');
          if (isJs) {
            await patchManager.applyFilePatch(path, content);
          } else if (manager?.app?.patchStore) {
            await manager.app.patchStore.setMethodPatch(path, null, content, {});
          }
          
          pathSet.add(path);
          
          const vfs = manager?.app?.vfs;
          if (vfs) {
            vfs._afterWrite(path, content, 'indexeddb');
          }
          return true;
        } else {
          throw new Error("PatchManager not loaded; cannot write patch for: " + path);
        }
      },

      async delete(path) {
        console.log(`[PatchableStore] Intercepted delete on ${path}. Reverting client-side patch.`);
        const patchManager = manager?.app?.patchManager;
        if (patchManager) {
          await patchManager.revertFilePatch(path);
          pathSet.delete(path);
          
          const vfs = manager?.app?.vfs;
          if (vfs) {
            vfs._afterDelete(path, 'indexeddb');
          }
          return true;
        } else {
          throw new Error("PatchManager not loaded; cannot delete patch for: " + path);
        }
      }
    };
  }

  collectKnownPathsForPrefix(manager = this.manager, prefix, options = {}) {
      const includeLibrary = !!options.includeLibrary;
      const out = new Set();

      const add = (path) => {
        if (typeof path !== "string") return;
        if (!path.startsWith(prefix + "/") && path !== prefix) return;
        if (!includeLibrary && path.startsWith("/library/")) return;
        out.add(path);
      };

      const addTree = (treeView) => {
        if (!treeView?.nodesMap) return;

        for (const pair of treeView.nodesMap) {
          const path = pair[0];
          const node = pair[1];

          if (node && node.type === "file") {
            add(path);
          }
        }
      };

      if (manager && typeof manager._forEachFileTreeView === 'function') {
        manager._forEachFileTreeView((treeView) => addTree(treeView));
      }

      const memory = manager?.app?.inMemoryFileStore;
      if (memory?.keys) {
        try {
          for (const path of memory.keys()) {
            add(path);
          }
        } catch (error) {}
      }

      const stores = manager?.app?.workspaceFileStores;
      if (stores?.entries) {
        try {
          for (const pair of stores.entries()) {
            const store = pair[1];
            if (!store?.keys) continue;
            for (const path of store.keys()) {
              add(path);
            }
          }
        } catch (error) {}
      }

      return Array.from(out).sort();
    }

  readKnownPathForFloatingTree(manager = this.manager, path) {
      if (!path) return null;

      const memory = manager?.app?.inMemoryFileStore;
      if (memory?.has?.(path)) {
        return memory.get(path);
      }

      const stores = manager?.app?.workspaceFileStores;
      const rootId = "/" + String(path).split("/").filter(Boolean)[0];
      const store = stores?.get?.(rootId);

      if (store) {
        if (typeof store.get === "function") {
          const value = store.get(path);
          if (value !== undefined && value !== null) return value;
        }

        if (typeof store.readFile === "function") {
          try {
            const maybePromise = store.readFile(path);
            if (typeof maybePromise === "string") return maybePromise;
          } catch (error) {}
        }
      }

      let directFromTree = null;
      if (manager && typeof manager._forEachFileTreeView === 'function') {
        manager._forEachFileTreeView((treeView) => {
          if (!directFromTree && treeView.nodesMap?.has(path)) {
            directFromTree = treeView.nodesMap.get(path);
          }
        });
      }

      if (directFromTree && typeof directFromTree.content === "string") {
        return directFromTree.content;
      }

      if (typeof manager?._syncReadFileViaApiForFloatingTree === "function") {
        return manager._syncReadFileViaApiForFloatingTree(path);
      }

      return null;
    }

  safeFloatingTreeRootLabel(label) {
    const text = String(label || "Project").trim();
    const parts = text.split("/").filter(Boolean);

    if (parts.length > 0) {
      return parts[parts.length - 1];
    }

    return text || "Project";
  }

  async callOpenFloatingTreeForStore(
    manager = this.manager,
    rootId,
    store,
    label = ""
  ) {
    if (typeof manager?.openFloatingTreeForStore !== "function") {
      return false;
    }

    try {
      const result = await manager.openFloatingTreeForStore(rootId, store);
      manager.app?.uiManager?.setStatus?.(
        "Opened floating tree: " + (label || rootId)
      );
      return result !== false;
    } catch (firstError) {
      try {
        const result = await manager.openFloatingTreeForStore(store);
        manager.app?.uiManager?.setStatus?.(
          "Opened floating tree: " + (label || rootId)
        );
        return result !== false;
      } catch (secondError) {
        console.warn(
          "[ProjectFloatingTreeStoreBuilder] openFloatingTreeForStore failed:",
          firstError,
          secondError
        );
        return false;
      }
    }
  }

  async openExternalAppFolderTree(manager = this.manager) {
    if (manager) {
      manager._vibesSingleExternalFolderMode = true;
    }

    if (typeof manager?._pickExternalFolderAndOpenFileTreeDialog === "function") {
      return await manager._pickExternalFolderAndOpenFileTreeDialog();
    }

    if (typeof manager?.openExternalDirectoryRootFromPicker === "function") {
      return await manager.openExternalDirectoryRootFromPicker();
    }

    if (typeof manager?._openFloatingExternalFileTreeLauncher === "function") {
      return await manager._openFloatingExternalFileTreeLauncher();
    }

    manager?.app?.uiManager?.setStatus?.(
      "No external-folder picker is available.",
      true
    );

    return false;
  }

}