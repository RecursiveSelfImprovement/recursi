class ProjectVisibilitySetFilterController {
  
  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  applyVisibilitySet(manager, settings, setName) {
      let actualManager = this.manager;
      let actualSettings = settings;
      let actualSetName = setName;

      if (manager && manager.app) {
        actualManager = manager;
      } else {
        actualSettings = manager;
        actualSetName = settings;
      }

      if (!actualManager) {
        return { ok: false, applied: 0, missed: 0 };
      }

      const cleanSettings = actualManager.normalizeVisibilitySet 
        ? actualManager.normalizeVisibilitySet(actualSettings).files 
        : actualSettings;
        
      let applied = 0;
      let missed = 0;

      actualManager._forEachFileTreeView((treeView) => {
        if (!treeView?.nodesMap) return;
        
        // Reset all widgets not in this set on this tree
        for (const node of treeView.nodesMap.values()) {
          if (node.type === 'file' && node.visibilityWidget) {
            if (!cleanSettings[node.id]) {
              node.visibilityWidget.setState({
                code: false,
                codeLevel: 0,
                signatures: false,
                sig: false,
                docs: false,
                docsLevel: 0
              }, true);
            }
          }
        }

        // Apply set states to existing matching nodes
        for (const [path, state] of Object.entries(cleanSettings)) {
          const node = treeView.nodesMap.get(path);
          if (node && node.visibilityWidget) {
            node.visibilityWidget.setState(state, true);
            applied++;
          } else {
            missed++;
          }
        }

        treeView.redrawLines?.();
      });

      if (actualManager.app?.buildPromptTab?._widgetStateChangeCallback) {
        actualManager.app.buildPromptTab._widgetStateChangeCallback();
      }

      if (actualManager.app?.visibilityManager?.notify) {
        actualManager.app.visibilityManager.notify();
      }

      if (actualManager.app?.uiManager) {
        const label = actualSetName ? `"${actualSetName}"` : 'visibility set';
        actualManager.app.uiManager.setStatus(
          `Applied ${label} to all trees: ${applied} matched.`
        );
      }

      return {
        ok: true,
        setName: actualSetName || null,
        applied,
        missed
      };
    }

  installVisibilitySetFilterUI(manager = this.manager, reason = "install") {
      if (!manager) {
        return false;
      }

      if (manager._visibilitySetFilterInstallInProgress) return false;
      manager._visibilitySetFilterInstallInProgress = true;

      try {
        const trees = typeof manager.getFileTreeViews === 'function' ? manager.getFileTreeViews() : [];
        if (trees.length === 0) {
          setTimeout(() => {
            manager._visibilitySetFilterInstallInProgress = false;
            manager._installVisibilitySetFilterUI?.("retry-no-active-trees");
          }, 400);
          return false;
        }

        const host = manager._visibilitySetFilterHost();
        if (!host) {
          setTimeout(() => {
            manager._visibilitySetFilterInstallInProgress = false;
            manager._installVisibilitySetFilterUI?.("retry-no-host");
          }, 400);
          return false;
        }

        if (manager.visibilitySetFilterBar?.isConnected) {
          manager._refreshVisibilitySetFilterOptions();
          return true;
        }

        manager._installVisibilitySetFilterStyles();

        const bar = document.createElement("div");
        bar.className = "visibility-set-filter-bar";
        bar.dataset.vsf1 = "true";

        const title = document.createElement("div");
        title.className = "visibility-set-filter-title";
        title.textContent = "Visibility Set Filter";

        const row = document.createElement("div");
        row.className = "visibility-set-filter-row";

        const select = document.createElement("select");
        select.className = "visibility-set-filter-select";

        const filterButton = document.createElement("button");
        filterButton.type = "button";
        filterButton.textContent = "Show only set";

        const applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.textContent = "Apply + show";

        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.textContent = "Clear filter";

        row.append(select, filterButton, applyButton, clearButton);

        const status = document.createElement("div");
        status.className = "visibility-set-filter-status";
        status.textContent = `VSF1 ready · ${reason}`;

        bar.append(title, row, status);

        manager.visibilitySetFilterBar = bar;
        manager.visibilitySetFilterSelect = select;
        manager.visibilitySetFilterStatus = status;

        filterButton.addEventListener("click", () => {
          const result = manager.filterTreeToVisibilitySet(select.value, {
            applyWidgetState: false
          });
          manager._visibilitySetFilterStatus(result);
        });

        applyButton.addEventListener("click", () => {
          const result = manager.filterTreeToVisibilitySet(select.value, {
            applyWidgetState: true
          });
          manager._visibilitySetFilterStatus(result);
        });

        clearButton.addEventListener("click", () => {
          const result = manager.clearVisibilitySetTreeFilter();
          manager._visibilitySetFilterStatus(result);
        });

        const searchPanel = manager.searchPanel;
        if (searchPanel) {
          searchPanel.appendChild(bar);
        } else {
          host.prepend(bar);
        }

        manager._refreshVisibilitySetFilterOptions();
        manager._visibilitySetFilterLog(`installed UI: ${reason}`);
        return true;
      } finally {
        manager._visibilitySetFilterInstallInProgress = false;
      }
    }

  vsol1ApplyWidgetStates(manager = this.manager, set, options = {}) {
    if (!manager) {
      return {
        applied: 0,
        missing: 0,
        skippedDirectories: 0,
        resetCount: 0,
        exactOnly: true
      };
    }

    const resetFirst = options.resetFirst !== false;

    let resetCount = 0;
    let applied = 0;
    let missing = 0;
    let skippedDirectories = 0;

    if (resetFirst) {
      resetCount = manager._visreset1ClearAllVisibilityWidgets();
    }

    for (const item of set.items || []) {
      const node = manager._vsol1FindNodeForPath(item.path);

      if (!node) {
        missing++;
        continue;
      }

      const cleanItemPath = String(item.path || "").replace(new RegExp("/+$"), "");
      const cleanNodeId = String(node.id || "").replace(new RegExp("/+$"), "");

      if (cleanNodeId !== cleanItemPath) {
        missing++;
        continue;
      }

      if (
        node.type === "directory" &&
        item.kind !== "directory" &&
        item.isDirectory !== true
      ) {
        skippedDirectories++;
        continue;
      }

      const state = manager._vsol1ItemToWidgetState(item);

      if (typeof manager._setNodeVisibilityStateSilently === "function") {
        if (manager._setNodeVisibilityStateSilently(node, state)) {
          applied++;
          continue;
        }
      }

      if (typeof node.setVisibilityState === "function") {
        node.setVisibilityState(state);
        applied++;
        continue;
      }

      if (node.visibilityWidget?.setState) {
        node.visibilityWidget.setState(state, true);
        applied++;
        continue;
      }

      missing++;
    }

    manager._syncVisibilityStateAcrossTrees?.();
    manager.syncFileStates?.();
    manager._updatePromptSizeEstimate?.();

    manager._vsol1Log?.(
      `VISRESET1 exact reset apply: reset=${resetCount} applied=${applied} missing=${missing} skippedDirectories=${skippedDirectories}`
    );

    return {
      applied,
      missing,
      skippedDirectories,
      resetCount,
      exactOnly: true
    };
  }

  vsol1FilterTreeToSet(manager = this.manager, set) {
      if (!manager) {
        return {
          ok: false,
          reason: "manager unavailable",
          matchingIds: 0,
          exactOnly: true
        };
      }

      const matchingIds = new Set();
      let exactFiles = 0;
      let missing = 0;

      manager._forEachFileTreeView((treeView) => {
        if (!treeView?.nodesMap) return;
        for (const item of set.items || []) {
          const node = manager._findNodeForVisibilityPath(item.path);
          if (!node) {
            missing++;
            continue;
          }

          matchingIds.add(node.id);
          exactFiles++;

          let parent = node.parentNode;
          while (parent) {
            matchingIds.add(parent.id);
            parent = parent.parentNode;
          }
        }

        if (typeof treeView.applyFilter === "function") {
          treeView.applyFilter(matchingIds);
        }
      });

      manager._expandAncestorsForMatchingIds(matchingIds);

      manager._activeStoredVisibilitySetFilter = {
        name: set.name,
        matchingIds,
        exactFiles,
        missing,
        exactOnly: true,
        appliedAt: new Date().toISOString()
      };

      manager._vsol1Log?.(
        `EXACTVS1 filtered exact-only set "${set.name}": exactFiles=${exactFiles} missing=${missing} matchingIdsWithAncestors=${matchingIds.size}`
      );

      return {
        ok: true,
        name: set.name,
        exactFiles,
        missing,
        matchingIds: matchingIds.size,
        exactOnly: true
      };
    }

  async applyStoredVisibilitySet(manager = this.manager, name, options = {}) {
    if (!manager) return { ok: false, reason: 'manager unavailable' };
    if (!name) return { ok: false, reason: 'No visibility set selected' };

    if (typeof manager.applyStoredVisibilitySetToAllTrees === 'function') {
      return await manager.applyStoredVisibilitySetToAllTrees(name, {
        ...options,
        reason: options.reason || 'ProjectVisibilitySetFilterController.applyStoredVisibilitySet'
      });
    }

    return { ok: false, reason: 'applyStoredVisibilitySetToAllTrees unavailable' };
  }

  installVisibilitySetFilterStyles() {
    if (document.getElementById("visibility-set-filter-vsf1-styles")) return;

    const style = document.createElement("style");
    style.id = "visibility-set-filter-vsf1-styles";
    style.textContent = `
      .visibility-set-filter-bar {
        margin: 7px 0;
        padding: 7px;
        border-radius: 7px;
        border: 1px solid rgba(140, 180, 220, .32);
        background: rgba(20, 24, 32, .92);
        color: var(--text-color, white);
        font-family: system-ui, sans-serif;
      }

      .visibility-set-filter-title {
        font-size: 12px;
        font-weight: 750;
        margin-bottom: 5px;
      }

      .visibility-set-filter-row {
        display: grid;
        grid-template-columns: 1fr auto auto auto;
        gap: 5px;
        align-items: center;
      }

      .visibility-set-filter-row select,
      .visibility-set-filter-row button {
        min-width: 0;
        border-radius: 5px;
        border: 1px solid rgba(180, 210, 240, .28);
        background: rgba(255,255,255,.08);
        color: var(--text-color, white);
        padding: 4px 6px;
        font-size: 11px;
      }

      .visibility-set-filter-row button {
        cursor: pointer;
        white-space: nowrap;
      }

      .visibility-set-filter-row button:hover {
        background: rgba(255,255,255,.15);
      }

      .visibility-set-filter-status {
        margin-top: 5px;
        font-size: 11px;
        opacity: .76;
        line-height: 1.35;
      }
    `;

    document.head.appendChild(style);
  }

  vsol1InstallStyles() {
    if (document.getElementById("vsol1-styles")) return;

    const style = document.createElement("style");
    style.id = "vsol1-styles";
    style.textContent = `
      .vsol1-panel {
        margin: 7px 0;
        padding: 7px;
        border-radius: 7px;
        border: 1px solid rgba(140, 180, 220, .32);
        background: rgba(20, 24, 32, .92);
        color: var(--text-color, white);
        font-family: system-ui, sans-serif;
      }

      .vsol1-title {
        font-size: 12px;
        font-weight: 750;
        margin-bottom: 5px;
      }

      .vsol1-row {
        display: grid;
        grid-template-columns: 1fr auto auto auto;
        gap: 5px;
        align-items: center;
      }

      .vsol1-row select,
      .vsol1-row button {
        min-width: 0;
        border-radius: 5px;
        border: 1px solid rgba(180, 210, 240, .28);
        background: rgba(255,255,255,.08);
        color: var(--text-color, white);
        padding: 4px 6px;
        font-size: 11px;
      }

      .vsol1-row button {
        cursor: pointer;
        white-space: nowrap;
      }

      .vsol1-row button:hover {
        background: rgba(255,255,255,.15);
      }

      .vsol1-status {
        margin-top: 5px;
        font-size: 11px;
        opacity: .76;
        line-height: 1.35;
      }
    `;
    document.head.append(style);
  }

  async filterTreeToVisibilitySet(manager = this.manager, name, options = {}) {
    if (!manager) return { ok: false, reason: 'manager unavailable' };
    if (!name) return { ok: false, reason: 'No visibility set selected' };

    const set =
      typeof manager.readStoredVisibilitySetByName === 'function'
        ? await manager.readStoredVisibilitySetByName(name)
        : null;

    if (!set) {
      return { ok: false, reason: 'Could not load visibility set: ' + name };
    }

    if (options.applyWidgetState) {
      if (typeof manager.applyVisibilitySetToAllTrees === 'function') {
        return await manager.applyVisibilitySetToAllTrees(set, {
          reason: 'filterTreeToVisibilitySet applyWidgetState'
        });
      }
    }

    if (typeof manager.applyStoredVisibilitySetToAllTrees === 'function') {
      return await manager.applyStoredVisibilitySetToAllTrees(name, {
        reason: 'filterTreeToVisibilitySet fallback all trees'
      });
    }

    return { ok: false, reason: 'No compatible visibility apply method found' };
  }

  applyVisibilitySetStateToWidgets(manager = this.manager, set) {
    if (!manager || !manager.fileTreeView?.nodesMap) {
      return {
        applied: 0,
        missing: (set.items || []).length
      };
    }

    let applied = 0;
    let missing = 0;

    for (const item of set.items || []) {
      const node = manager._findNodeForVisibilityPath(item.path);
      if (!node) {
        missing++;
        continue;
      }

      const state = manager._visibilityItemToWidgetState(item);

      if (typeof manager._setNodeVisibilityStateSilently === "function") {
        if (manager._setNodeVisibilityStateSilently(node, state)) {
          applied++;
          continue;
        }
      }

      if (typeof node.setVisibilityState === "function") {
        node.setVisibilityState(state);
        applied++;
        continue;
      }

      missing++;
    }

    manager._syncVisibilityStateAcrossTrees?.();
    manager.syncFileStates?.();
    manager._updatePromptSizeEstimate?.();

    manager._visibilitySetFilterLog(
      `applied widget states: applied=${applied} missing=${missing}`
    );

    return {
      applied,
      missing
    };
  }

  visibilityEnsureNodesForSettings(manager = this.manager, settings) {
    const result = {
      requested: 0,
      alreadyFound: 0,
      created: 0,
      stillMissing: []
    };

    if (!manager || !settings || typeof settings !== "object") {
      return result;
    }

    if (typeof manager.addInMemoryFileNode !== "function") {
      result.stillMissing = Object.keys(settings);
      return result;
    }

    for (const path of Object.keys(settings)) {
      result.requested++;

      if (manager._visibilityFindNodeAcrossTrees(path)) {
        result.alreadyFound++;
        continue;
      }

      try {
        manager.addInMemoryFileNode(path);
      } catch (error) {
        console.warn(
          "[ProjectFilesManager] could not create visibility node:",
          path,
          error
        );
      }

      if (manager._visibilityFindNodeAcrossTrees(path)) {
        result.created++;
      } else {
        result.stillMissing.push(path);
      }
    }

    return result;
  }

  visibilityPathAliasesForPath(manager = this.manager, path) {
    const pieces = manager._visibilityPathPieces(path);
    const aliases = new Set();

    if (!pieces.length) return aliases;

    const addFromIndex = (index) => {
      if (index < 0 || index >= pieces.length) return;
      aliases.add("/" + pieces.slice(index).join("/"));
    };

    addFromIndex(0);

    const interestingRoots = ["vibes", "library"];

    for (const root of interestingRoots) {
      const index = pieces.indexOf(root);
      if (index >= 0) addFromIndex(index);
    }

    const webIndex = pieces.indexOf("web");
    if (webIndex >= 0 && webIndex + 1 < pieces.length) {
      addFromIndex(webIndex + 1);
    }

    const srcIndex = pieces.indexOf("src");
    if (srcIndex >= 0) {
      aliases.add("/" + pieces.slice(srcIndex).join("/"));
    }

    const fileName = pieces[pieces.length - 1];
    if (fileName) {
      aliases.add(fileName);
    }

    return aliases;
  }

  createStoredVisibilitySet(manager = this.manager, name, items, options = {}) {
    const cleanName = String(name || "").trim();
    if (!cleanName) {
      throw new Error("createStoredVisibilitySet requires a name");
    }

    const cleanItems = manager._vsol1NormalizeVisibilityItems(items || []);
    const missing = [];
    const found = [];

    for (const item of cleanItems) {
      const node = manager._vsol1FindNodeForPath(item.path);
      if (node) found.push(item);
      else missing.push(item);
    }

    const set = {
      name: cleanName,
      description: options.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: options.source || "ProjectFilesManager.createStoredVisibilitySet",
      requestedCount: cleanItems.length,
      foundCount: found.length,
      missingCount: missing.length,
      missingPaths: missing.map((item) => item.path),
      items: options.keepMissing ? cleanItems : found
    };

    manager._vsol1WriteStoredVisibilitySet(set);

    manager._vsol1Log(
      `stored visibility set "${cleanName}" requested=${cleanItems.length} stored=${set.items.length} missing=${missing.length}`
    );

    return set;
  }

  async installVisibilitySetToolbarsOnOpenTrees(manager = this.manager, options = {}) {
    const views =
      typeof manager.getFileTreeViews === "function"
        ? manager.getFileTreeViews()
        : [];
    const unique = [];
    const seen = new Set();

    for (const view of views) {
      if (!view || seen.has(view)) continue;
      seen.add(view);
      unique.push(view);
    }

    if (manager.fileTreeView && !seen.has(manager.fileTreeView)) {
      unique.unshift(manager.fileTreeView);
    }

    const results = [];

    for (const treeView of unique) {
      if (
        !treeView ||
        typeof treeView.ensureVisibilitySetToolbar !== "function"
      ) {
        results.push({
          ok: false,
          reason: "tree missing ensureVisibilitySetToolbar"
        });
        continue;
      }

      const toolbar = treeView.ensureVisibilitySetToolbar(options);

      if (
        toolbar &&
        typeof treeView.refreshVisibilitySetToolbar === "function"
      ) {
        await treeView.refreshVisibilitySetToolbar();
      }

      results.push({
        ok: !!toolbar,
        tree:
          typeof manager.getTreeIdentity === "function"
            ? manager.getTreeIdentity(treeView)
            : null
      });
    }

    return {
      ok: true,
      installed: results.filter((result) => result.ok).length,
      total: results.length,
      results
    };
  }

}