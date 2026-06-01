class ProjectFloatingTreeStoreDialogController {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  openFloatingTreeForStore(manager = this.manager, rootId, store) {
      const state = manager._ensureFloatingFileTreeState();

      const existing = state.trees.get(rootId);
      if (existing?.host?.isOpen?.()) {
        existing.host.bringToFront();
        existing.host._ensureTreeContainerVisible?.();
        existing.host.onResize?.();
        if (existing.host.treeView) {
          manager.registerFileTreeView(existing.host.treeView);
          existing.host.treeView.calculateLayout?.();
          existing.host.treeView.redrawLines?.();
        }
        return existing.host.dialog;
      }

      if (typeof FloatingPanelHost !== "function") {
        throw new Error("FloatingPanelHost is not loaded.");
      }

      // Spawns new workspace folder tree dialogs invisibly first to measure sizing
      const wasHidden = typeof UITools !== 'undefined' && UITools.creationVisibilityMode === 'hidden';
      if (typeof UITools !== 'undefined' && !wasHidden) {
        UITools.creationVisibilityMode = 'hidden';
      }

      const host = new FloatingPanelHost({
        app: manager.app,
        mode: "tree",
        title: "🌲 " + rootId,
        rootId,
        store,
        projectName: rootId.replace(/^\//, ""),
        projectFilesManager: manager,
        stateId: "floating-tree-" + rootId.replace(/[^\w.-]+/g, "-"),
        onFileSelect: (path, nodeInfo) => {
          if (!path) return;
          if (typeof manager._openFloatingExternalEditorWindow === "function") {
            manager._openFloatingExternalEditorWindow(path, store);
            return;
          }
          manager._handleFileOpenRequest?.({
            id: path,
            path,
            hasDocs: nodeInfo?.hasDocs || false,
            readOnly: nodeInfo?.readOnly || false
          });
        },
        onRunHtmlFile: (path) => {
          if (typeof manager._openFloatingExternalEditorWindow === "function") {
            manager._openFloatingExternalEditorWindow(path, store);
            return;
          }
          if (typeof manager.onRunHtmlFile === "function") {
            manager.onRunHtmlFile(path);
          }
        },
        onClose: () => {
          const current = state.trees.get(rootId);
          if (current?.host === host) state.trees.delete(rootId);
          if (host.treeView && typeof manager.unregisterFileTreeView === "function") {
            manager.unregisterFileTreeView(host.treeView);
          }
          if (typeof manager._renderFloatingFileTreeLauncher === "function") manager._renderFloatingFileTreeLauncher();
        }
      });

      host.open();
      host._ensureTreeContainerVisible?.();
      host.onResize?.();

      if (host.treeView) {
        manager.registerFileTreeView(host.treeView);
        host.treeView.calculateLayout?.();
        host.treeView.redrawLines?.();
        
        if (manager.app) {
          if (typeof manager.app.notifyVisibilityChange === 'function') manager.app.notifyVisibilityChange();
          if (manager.app.buildPromptTab && typeof manager.app.buildPromptTab._widgetStateChangeCallback === 'function') {
            manager.app.buildPromptTab._widgetStateChangeCallback();
          }
        }
      }

      manager._addCopyContentsButtonToFloatingPanel?.(host, rootId, store);

      state.trees.set(rootId, {
        host,
        dialog: host.dialog,
        content: host.contentElement,
        treeContainer: host.treeContainer,
        treeView: host.treeView,
        store,
        metadata: host.metadata,
        treeData: host.treeData
      });

      if (typeof manager._renderFloatingFileTreeLauncher === "function") {
        manager._renderFloatingFileTreeLauncher();
      }

      // Rearrange layout and fade dialogs in simultaneously
      if (typeof UITools !== 'undefined' && !wasHidden) {
        requestAnimationFrame(() => {
          if (manager.app?.actionHandler && typeof manager.app.actionHandler.handleRearrangeWindows === 'function') {
            manager.app.actionHandler.handleRearrangeWindows({ silent: true, instant: true });
          }
          UITools.revealHiddenDialogs();
          UITools.creationVisibilityMode = 'visible';
        });
      }

      return host.dialog;
    }

  async rebuildBrowserBackedVibesTree(manager = this.manager) {
    const app = manager.app;
    const stores = app?.workspaceFileStores;

    if (!stores || typeof stores.get !== "function") {
      return {
        ok: false,
        reason: "workspaceFileStores missing"
      };
    }

    const store = stores.get("/vibes");

    if (!store) {
      return {
        ok: false,
        reason: "No /vibes browser-backed store is registered.",
        storeRoots: manager._browserStoreRootIds()
      };
    }

    const beforeCount = manager._browserStoreFileCount(store);

    if (typeof store.scan === "function") {
      try {
        await store.scan();
      } catch (error) {}
    }

    if (typeof store.refresh === "function") {
      try {
        await store.refresh();
      } catch (error) {}
    }

    if (typeof store._scanDirectory === "function" && store.rootHandle) {
      try {
        await store._scanDirectory(store.rootHandle, "/vibes");
      } catch (error) {}
    }

    const afterCount = manager._browserStoreFileCount(store);

    const removed = manager._removeFloatingTreesByRootIdForce("/vibes");
    const opened = await manager._openStoreTreeForce("/vibes", store, {
      label: "Vibes",
      title: "Vibes"
    });

    return {
      ok: opened?.ok !== false,
      beforeCount,
      afterCount,
      removed,
      opened,
      storeRoots: manager._browserStoreRootIds()
    };
  }

  removeFloatingTreesByRootIdForce(manager = this.manager, rootId) {
    const removed = [];
    const cleanRoot = String(rootId || "");

    if (!cleanRoot) return removed;

    const views =
      typeof manager.getFileTreeViews === "function"
        ? manager.getFileTreeViews()
        : Array.from(manager.fileTreeViews || []);

    for (const treeView of views) {
      if (!treeView || treeView === manager.fileTreeView) continue;

      const roots = manager._treeViewRootIdsForForceFix(treeView);

      if (!roots.includes(cleanRoot)) continue;

      removed.push({
        roots,
        className: treeView.constructor?.name || ""
      });

      try {
        if (typeof manager.unregisterFileTreeView === "function") {
          manager.unregisterFileTreeView(treeView);
        }
      } catch (error) {}

      try {
        const container =
          treeView.container || treeView.element || treeView.rootElement;
        const dialog = container?.closest?.(".uw-dialog");
        if (dialog) dialog.remove();
      } catch (error) {}
    }

    return removed;
  }

  async openStoreTreeForce(manager = this.manager, rootId, store, options = {}) {
    if (typeof manager.openFloatingTreeForStore === "function") {
      try {
        const result = await manager.openFloatingTreeForStore(rootId, store, {
          label: options.label || rootId,
          title: options.title || rootId
        });
        return { ok: result?.ok !== false, result };
      } catch (firstError) {
        try {
          const result = await manager.openFloatingTreeForStore(store, {
            rootId,
            label: options.label || rootId,
            title: options.title || rootId
          });
          return { ok: result?.ok !== false, result };
        } catch (secondError) {
          return {
            ok: false,
            reason:
              secondError?.message ||
              firstError?.message ||
              "openFloatingTreeForStore failed"
          };
        }
      }
    }

    return {
      ok: false,
      reason: "openFloatingTreeForStore missing"
    };
  }

}