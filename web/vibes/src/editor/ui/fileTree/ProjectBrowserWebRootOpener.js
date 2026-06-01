class ProjectBrowserWebRootOpener {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  async openBrowserWebRootFromPicker(options = {}) {
    const manager = options.manager || this.manager || null;

    if (!("showDirectoryPicker" in window)) {
      const result = {
        ok: false,
        reason: "File System Access API unavailable. Use Chrome or Edge."
      };

      manager?.app?.uiManager?.setStatus?.(result.reason, true);
      return result;
    }

    let handle = null;

    try {
      handle = await window.showDirectoryPicker({
        mode: "readwrite",
        id: "vibes-browser-web-root"
      });
    } catch (error) {
      if (error && error.name === "AbortError") {
        return { ok: false, cancelled: true };
      }

      const result = {
        ok: false,
        reason: error?.message || String(error)
      };

      manager?.app?.uiManager?.setStatus?.(
        "Could not open browser workspace: " + result.reason,
        true
      );

      return result;
    }

    return await this.openBrowserWebRootWorkspace(handle, {
      ...options,
      manager
    });
  }

  async openBrowserWebRootWorkspace(webRootHandle, options = {}) {
    const manager = options.manager || this.manager || null;

    if (!webRootHandle || webRootHandle.kind !== "directory") {
      return {
        ok: false,
        reason: "Expected a directory handle for the parent web/ folder."
      };
    }

    if (!manager?.app) {
      return {
        ok: false,
        reason: "ProjectFilesManager app missing."
      };
    }

    if (!manager.app.workspaceFileStores) {
      manager.app.workspaceFileStores = new Map();
    }

    manager.app.browserWebRootHandle = webRootHandle;
    manager.app.browserWebRootWorkspace = {
      handle: webRootHandle,
      name: webRootHandle.name || "web",
      openedAt: new Date().toISOString()
    };

    if (typeof manager._removeAllInternalWebRootStoresAndTrees === "function") {
      manager._removeAllInternalWebRootStoresAndTrees();
    }

    const result = await this.openBrowserWebRootVisibleTrees(webRootHandle, {
      ...options,
      manager
    });

    if (typeof manager._removeAllInternalWebRootStoresAndTrees === "function") {
      manager._removeAllInternalWebRootStoresAndTrees();
    }

    if (typeof manager.installBrowserWorkspaceStartupControls === "function") {
      manager.installBrowserWorkspaceStartupControls();
    }

    return {
      ok: result.ok !== false,
      webRootName: webRootHandle.name || "web",
      ...result
    };
  }

  async openBrowserWebRootVisibleTrees(webRootHandle, options = {}) {
      const manager = options.manager || this.manager || null;
      const subfolders = await this.listBrowserWebRootSubfolders(webRootHandle);

      const names = subfolders
        .map((item) => item?.name)
        .filter((name) => typeof name === "string" && name.trim());

      const folderByLower = new Map();
      for (const item of subfolders) {
        if (item?.name && item?.handle) {
          folderByLower.set(item.name.toLowerCase(), item);
        }
      }

      const foldersToOpen = [];
      const addIfPresent = (name, visSet = null) => {
        const clean = String(name || "").toLowerCase();
        const item = folderByLower.get(clean);
        if (item && !foldersToOpen.some((existing) => existing.name === item.name)) {
          foldersToOpen.push({ ...item, visSet });
        }
      };

      let savedState = [];
      try {
        const raw = localStorage.getItem('vibes_workspace_state');
        if (raw) savedState = JSON.parse(raw);
      } catch (e) {}

      if (savedState && savedState.length > 0) {
        for (const entry of savedState) {
          const folderName = entry.rootId.replace(/^\//, '');
          addIfPresent(folderName, entry.visSet);
        }
      } else {
        const explicitProject = options.projectHint || options.projectName || options.appFolder || options.folderName || null;
        if (explicitProject) {
          addIfPresent(explicitProject);
        }
      }

      const opened = [];
      const failed = [];

      for (const item of foldersToOpen) {
        try {
          const result = await this.openBrowserWebRootSubtree(
            webRootHandle,
            item.name,
            { ...options, manager, label: item.name, source: "browser-web-root" }
          );

          if (result?.ok === false) {
            failed.push({ folderName: item.name, result });
          } else {
            opened.push(result);
            
            if (item.visSet && result.rootId) {
              const state = manager._ensureFloatingFileTreeState?.();
              const treeInfo = state?.trees?.get(result.rootId);
              if (treeInfo?.host) {
                 setTimeout(async () => {
                    const host = treeInfo.host;
                    if (host.visSetSelect) {
                       host.visSetSelect.value = item.visSet;
                       host.currentVisSet = item.visSet;
                       if (typeof host._onVisSetChange === 'function') {
                          await host._onVisSetChange();
                       }
                    }
                 }, 600);
              }
            }
          }
        } catch (error) {
          failed.push({
            folderName: item.name,
            error: error?.message || String(error),
            stack: error?.stack || ""
          });
        }
      }

      setTimeout(() => {
        if (typeof manager?._openFloatingExternalFileTreeLauncher === 'function') {
          manager._openFloatingExternalFileTreeLauncher();
        }
      }, 50);

      return {
        ok: failed.length === 0,
        foldersToOpen: foldersToOpen.map((item) => item.name),
        opened,
        failed,
        availableFolders: names
      };
    }

  async openBrowserWebRootSubtree(webRootHandle, folderName, options = {}) {
      const manager = options.manager || this.manager || null;
      const cleanFolderName = String(folderName || "").trim();

      if (!webRootHandle || !cleanFolderName) {
        return {
          ok: false,
          reason: "Missing webRootHandle or folderName.",
          folderName: cleanFolderName || null
        };
      }

      if (cleanFolderName.toLowerCase() === "web") {
        return {
          ok: true,
          suppressed: true,
          folderName: cleanFolderName,
          reason: "web/ is the internal permission root, not a visible tree."
        };
      }

      const handle = await webRootHandle.getDirectoryHandle(cleanFolderName);
      const StoreClass = await this.ensureLocalDirectoryStoreForBrowserRoot(
        manager
      );

      const store = await StoreClass.open(handle, cleanFolderName);
      const rootId = "/" + cleanFolderName;

      if (!manager.app.workspaceFileStores) {
        manager.app.workspaceFileStores = new Map();
      }

      manager.app.workspaceFileStores.set(rootId, store);
      
      if (manager.app.emit) {
          manager.app.emit('vfs:store-mounted', { rootId });
      }

      const openResult = await this.openBrowserRootStoreAsTree(
        rootId,
        store,
        {
          ...options,
          manager,
          label: options.label || cleanFolderName,
          title: options.title || cleanFolderName,
          source: "browser-web-root"
        }
      );

      return {
        ok: openResult?.ok !== false,
        folderName: cleanFolderName,
        label: options.label || cleanFolderName,
        rootId,
        storeName: store._projectName || cleanFolderName,
        openResult
      };
    }

  async listBrowserWebRootSubfolders(webRootHandle) {
      const folders = [];

      if (!webRootHandle || webRootHandle.kind !== "directory") {
        return folders;
      }

      const addEntry = (name, handle) => {
        const cleanName = String(name || handle?.name || handle?.fullPath || "")
          .split("/")
          .filter(Boolean)
          .pop();

        if (!cleanName || !handle || handle.kind !== "directory") {
          return;
        }

        // Strictly filter out hidden folders (names starting with .)
        if (cleanName.startsWith('.')) {
          return;
        }

        folders.push({
          name: cleanName,
          handle
        });
      };

      if (typeof webRootHandle.entries === "function") {
        for await (const entry of webRootHandle.entries()) {
          if (Array.isArray(entry)) {
            addEntry(entry[0], entry[1]);
          } else {
            addEntry(entry?.name, entry);
          }
        }
      } else if (typeof webRootHandle.values === "function") {
        for await (const handle of webRootHandle.values()) {
          addEntry(handle?.name, handle);
        }
      } else if (typeof webRootHandle.keys === "function") {
        for await (const name of webRootHandle.keys()) {
          try {
            const handle = await webRootHandle.getDirectoryHandle(name);
            addEntry(name, handle);
          } catch (error) {}
        }
      }

      folders.sort((a, b) => a.name.localeCompare(b.name));
      return folders;
    }

  async chooseBrowserWebRootAppFolder(folders = []) {
    const choices = folders
      .map((item) => (typeof item === "string" ? item : item?.name))
      .filter((name) => {
        if (!name) return false;

        const lower = String(name).toLowerCase();

        if (lower === "vibes") return false;
        if (lower === "library") return false;
        if (lower === "documentation") return false;
        if (lower === "node_modules") return false;
        if (lower === "vendor") return false;
        if (lower === "thirdparty") return false;

        return true;
      });

    if (!choices.length) return "";

    if (choices.includes("BasicsWithDialogBox")) {
      return "BasicsWithDialogBox";
    }

    const typed = window.prompt("Open one app folder from web root:", choices[0]);

    if (!typed) return "";

    return choices.includes(typed) ? typed : "";
  }

  async openBrowserWebRootDefaults(options = {}) {
    const manager = options.manager || this.manager || null;
    const opened = [];
    const failed = [];
    const webHandle = options.webHandle || manager?.browserWebRootHandle;

    const openOne = async (folderName) => {
      const result = await this.openBrowserWebRootSubtree(webHandle, folderName, {
        ...options,
        manager
      });

      if (result && result.ok) opened.push(result);
      else failed.push(result);

      return result;
    };

    await openOne("vibes");
    await openOne("library");

    let appFolderName = options.appFolderName || "";

    if (!appFolderName && options.chooseApp !== false) {
      const folders = await this.listBrowserWebRootSubfolders(webHandle);
      appFolderName = await this.chooseBrowserWebRootAppFolder(folders);
    }

    if (appFolderName) {
      await openOne(appFolderName);
    }

    this.browserRootStatus(
      manager,
      "Opened browser web root trees: " +
        opened.map((item) => item.rootId || item.folderName).join(", ")
    );

    return { opened, failed };
  }

  async ensureLocalDirectoryStoreForBrowserRoot(manager = this.manager) {
    if (typeof LocalDirectoryStore !== "undefined") {
      return LocalDirectoryStore;
    }

    if (globalThis.LocalDirectoryStore) {
      return globalThis.LocalDirectoryStore;
    }

    await this.loadClassicScriptForBrowserRoot(
      "/vibes/src/editor/comms/LocalDirectoryStore.js"
    );

    if (typeof LocalDirectoryStore !== "undefined") {
      return LocalDirectoryStore;
    }

    if (globalThis.LocalDirectoryStore) {
      return globalThis.LocalDirectoryStore;
    }

    throw new Error("LocalDirectoryStore did not load.");
  }

  async openBrowserRootStoreAsTree(rootId, store, options = {}) {
    const manager = options.manager || this.manager || null;
    let actualRootId = String(rootId || "").trim();

    if (!store) {
      return {
        ok: false,
        rootId: actualRootId || null,
        reason:
          "Missing store. openBrowserRootStoreAsTree expects (rootId, store, options)."
      };
    }

    if (!actualRootId) {
      return {
        ok: false,
        reason:
          "Missing rootId. openBrowserRootStoreAsTree expects a string rootId."
      };
    }

    if (!actualRootId.startsWith("/")) {
      actualRootId = "/" + actualRootId;
    }

    if (actualRootId.toLowerCase() === "/web") {
      if (manager?.app?.workspaceFileStores) {
        manager.app.workspaceFileStores.delete("/web");
        manager.app.workspaceFileStores.delete("web");
      }

      return {
        ok: true,
        suppressed: true,
        rootId: actualRootId,
        reason: "web/ is the internal browser workspace root, not a visible tree."
      };
    }

    if (typeof manager?.openFloatingTreeForStore !== "function") {
      return {
        ok: false,
        rootId: actualRootId,
        reason: "openFloatingTreeForStore is unavailable."
      };
    }

    const label = options.label || options.title || actualRootId;

    try {
      const result = await manager.openFloatingTreeForStore(actualRootId, store);

      return {
        ok: result?.ok !== false,
        rootId: actualRootId,
        label,
        result
      };
    } catch (error) {
      return {
        ok: false,
        rootId: actualRootId,
        label,
        reason: error?.message || String(error),
        stack: error?.stack || ""
      };
    }
  }

  browserRootStatus(manager, message, isError = false) {
    if (
      manager?.app?.uiManager &&
      typeof manager.app.uiManager.setStatus === "function"
    ) {
      manager.app.uiManager.setStatus(message, !!isError);
      return true;
    }

    console[isError ? "error" : "log"]("[BrowserWebRootMode] " + message);
    return true;
  }

  loadClassicScriptForBrowserRoot(src) {
    return new Promise((resolve, reject) => {
      const cleanSrc = String(src || "").trim();

      if (!cleanSrc) {
        reject(new Error("Missing script src."));
        return;
      }

      const existing = Array.from(document.scripts).find((script) => {
        const current = String(script.getAttribute("src") || "").split("?")[0];
        return current === cleanSrc;
      });

      if (existing) {
        resolve(existing);
        return;
      }

      const script = document.createElement("script");
      script.src = cleanSrc + "?_=" + Date.now();
      script.onload = () => resolve(script);
      script.onerror = () =>
        reject(new Error("Could not load script: " + cleanSrc));
      document.head.appendChild(script);
    });
  }

  browserRootSafeLabel(value) {
    const raw =
      String(value || "Workspace")
        .replaceAll("\\", "/")
        .split("/")
        .filter(Boolean)
        .pop() || "Workspace";

    return (
      raw
        .replaceAll("-", " ")
        .replaceAll("_", " ")
        .replaceAll(".", " ")
        .trim() || "Workspace"
    );
  }

}