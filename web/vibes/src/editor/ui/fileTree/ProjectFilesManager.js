class ProjectFilesManager {
  
  constructor(
      app,
      onFileSelect,
      onPackProject,
      onRunHtmlFile
    ) {
      this.app = app;
      this.onFileSelect = onFileSelect;
      this.onPackProject = onPackProject;
      this.onRunHtmlFile = onRunHtmlFile;
      this.projectName = app.projectName;
      this.openFileCallback = onFileSelect;
      this.fileMetadata = {};

      this.isWideView = false;
      this.currentVisibilitySetName = null;
      this.paintSelectionPanel = null;
    }

  getElement() {
    return this.mainElement;
  }

  refreshFileList() {
    window.location.reload();
  }

  addInMemoryFileNode(goldenPath) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeOperations = helpers.treeOperations;

    if (
      treeOperations &&
      typeof treeOperations.addInMemoryFileNode === "function"
    ) {
      return treeOperations.addInMemoryFileNode(this, goldenPath);
    }

    return false;
  }

  async updateNodeMetadata(metadataKey, newMetadataEntry) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeOperations = helpers.treeOperations;

    if (
      treeOperations &&
      typeof treeOperations.updateNodeMetadata === "function"
    ) {
      return await treeOperations.updateNodeMetadata(
        this,
        metadataKey,
        newMetadataEntry
      );
    }

    return false;
  }

  async addSharedLibraryTree(sharedFilePaths, metadata = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeOperations = helpers.treeOperations;

    if (
      treeOperations &&
      typeof treeOperations.addSharedLibraryTree === "function"
    ) {
      return await treeOperations.addSharedLibraryTree(
        this,
        sharedFilePaths,
        metadata
      );
    }

    return false;
  }

  

  

  

  

  setNodeDocStatus(sourcePath, hasDocs) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeOperations = helpers.treeOperations;

    if (
      treeOperations &&
      typeof treeOperations.setNodeDocStatus === "function"
    ) {
      return treeOperations.setNodeDocStatus(this, sourcePath, hasDocs);
    }

    return 0;
  }

  async reloadMetadata() {
      this.app.inMemoryFileMetadata = null;
      this.fileMetadata = await this.app.documentationManager.getFileMetadata();
      
      // Broadcast metadata updates to all registered active floating trees
      this._forEachFileTreeView((tree) => {
        tree.applyFileMetadata(this.fileMetadata);
      });
    }

  _handleFileOpenRequest(node) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const searchController = helpers.searchController;

    if (
      searchController &&
      typeof searchController.handleFileOpenRequest === "function"
    ) {
      return searchController.handleFileOpenRequest(this, node);
    }

    return false;
  }

  applyVisibilitySet(settings, name = null) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (controller && typeof controller.applyVisibilitySet === "function") {
      return controller.applyVisibilitySet(this, settings, name);
    }

    return false;
  }

  _updatePromptSizeEstimate() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const estimator = helpers.promptSizeEstimator;

    if (
      estimator &&
      typeof estimator.updatePromptSizeEstimate === "function"
    ) {
      return estimator.updatePromptSizeEstimate(this);
    }

    return {
      ok: false,
      reason: "ProjectFilesPromptSizeEstimator unavailable"
    };
  }

  _calculateLevelFromState(state) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const estimator = helpers.promptSizeEstimator;

    if (
      estimator &&
      typeof estimator.calculateLevelFromState === "function"
    ) {
      return estimator.calculateLevelFromState(state);
    }

    return 0;
  }

  syncFileStates(selectedFileId, openFileIds) {
      const actualSelected = selectedFileId || (this.app?.activeEditorController ? this.app.activeEditorController.filePath : null);
      let actualOpen = openFileIds;
      if (!actualOpen && this.app) {
        actualOpen = new Set(Array.from(this.app.editorControllers.keys()));
        if (actualSelected) {
          actualOpen.add(actualSelected);
        }
      }

      const helpers = this._ensureBreakdownHelpers?.() || {};
      const treeOperations = helpers.treeOperations;

      if (
        treeOperations &&
        typeof treeOperations.syncFileStates === "function"
      ) {
        return treeOperations.syncFileStates(this, actualSelected, actualOpen);
      }

      return 0;
    }

  getAllVisibilityWidgets() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeOperations = helpers.treeOperations;

    if (
      treeOperations &&
      typeof treeOperations.getAllVisibilityWidgets === "function"
    ) {
      return treeOperations.getAllVisibilityWidgets(this);
    }

    return [];
  }

  async init(options = {}) {
      const {
        appearanceManager = null,
        fileMetadata = null,
      } = options;
      this.fileMetadata = fileMetadata || {};
      
      this.mainElement = makeElement('div', {
        className: 'project-files-content',
      });

      this.treeContainer = makeElement('div', {
        className: 'tree-view-container',
      });
      this.treeContainer.addEventListener('scroll', () => {
        if (this.app.visibilityManager) this.app.visibilityManager.notify();
      });

      try {
        this._createSearchUI();
      } catch (e) {
        console.warn('[ProjectFilesManager] Search UI creation failed', e);
      }
      
      if (!this.searchWrapper || !(this.searchWrapper instanceof Node)) {
        this.searchWrapper = makeElement('div', { style: { display: 'none' } });
      }
      this.treeContainer.appendChild(this.searchWrapper);

      this.promptSizeIndicator = makeElement('div', {
        className: 'prompt-size-indicator',
      });
      const tooltipContent =
        'This is an approximate token count for the prompt that will be generated from your current selections in the visibility widgets below.';
      this.promptSizeIndicator.addEventListener('mouseover', () =>
        GlowingTooltip.show(this.promptSizeIndicator, tooltipContent, {
          color: [100, 110, 120],
        })
      );
      this.promptSizeIndicator.addEventListener('mouseout', () =>
        GlowingTooltip.hide()
      );
      this.treeContainer.appendChild(this.promptSizeIndicator);
      this.mainElement.append(this.treeContainer);

      this._installVersionBanner?.();

      try {
        this._installFloatingTreeLauncherButton?.();
      } catch (floatingTreeLauncherError) {
        console.warn(
          '[ProjectFilesManager] Floating tree launcher install failed:',
          floatingTreeLauncherError
        );
      }

      this.paintSelectionPanel = null;
      this._updatePromptSizeEstimate();
      this.installVisibilityDebugTap?.("ProjectFilesManager.init");
    }

  _applyStyles() {
      // Sidebar chrome styles are obsolete; returning true as layout is handled by custom tree container styles
      return true;
    }

  async getProtocolDefinition() {
    const paths = ['/vibes/protocol.md', 'protocol.md', '/protocol.md'];
    for (const p of paths) {
      try {
        if (this.app.inMemoryFileStore && this.app.inMemoryFileStore.has(p)) {
          return this.app.inMemoryFileStore.get(p);
        }
        const response = await fetch(p);
        if (response.ok) return await response.text();
      } catch (error) {
        // Keep trying the next path
      }
    }
    console.error('Failed to fetch protocol definition from any known path.');
    return `### Error\n\nCould not load protocol definition.`;
  }

  syncNodeSelection(newActiveId, oldActiveId) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeOperations = helpers.treeOperations;

    if (
      treeOperations &&
      typeof treeOperations.syncNodeSelection === "function"
    ) {
      return treeOperations.syncNodeSelection(this, newActiveId, oldActiveId);
    }

    return false;
  }

  

  _showInputDialog(title, message, defaultValue, onConfirm) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const dialogActions = helpers.dialogActions;

    if (
      dialogActions &&
      typeof dialogActions.showInputDialog === "function"
    ) {
      return dialogActions.showInputDialog(
        this,
        title,
        message,
        defaultValue,
        onConfirm
      );
    }

    return null;
  }

  _handleDelete(node) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const dialogActions = helpers.dialogActions;

    if (
      dialogActions &&
      typeof dialogActions.handleDelete === "function"
    ) {
      return dialogActions.handleDelete(this, node);
    }

    return false;
  }

  async setData(treeDataArray, fileMetadata = {}) {
      this.fileMetadata = fileMetadata || {};
      this._calculateWidgetMaxSizes();

      if (typeof this._attachFolderMetaCapsulesFromWorkspaceStores === "function") {
        try {
          await this._attachFolderMetaCapsulesFromWorkspaceStores();
        } catch (error) {
          console.warn(
            "[ProjectFilesManager] folder meta capsule attachment failed:",
            error
          );
        }
      }
    }

  _createSearchUI() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const chrome = helpers.sidebarChrome;

    if (chrome && typeof chrome.createSearchUI === "function") {
      return chrome.createSearchUI(this);
    }

    return null;
  }

  _toggleSearchPanel() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const chrome = helpers.sidebarChrome;

    if (chrome && typeof chrome.toggleSearchPanel === "function") {
      return chrome.toggleSearchPanel(this);
    }

    return false;
  }

  focusSearch() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const chrome = helpers.sidebarChrome;

    if (chrome && typeof chrome.focusSearch === "function") {
      return chrome.focusSearch(this);
    }

    return false;
  }

  closeSearch() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const chrome = helpers.sidebarChrome;

    if (chrome && typeof chrome.closeSearch === "function") {
      return chrome.closeSearch(this);
    }

    return false;
  }

  showGlobalToolsMenu() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const chrome = helpers.sidebarChrome;

    if (chrome && typeof chrome.showGlobalToolsMenu === "function") {
      return chrome.showGlobalToolsMenu(this);
    }

    return false;
  }

  _transformFilesToTreeData(filesData) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.treeDataBuilder;

    if (
      builder &&
      typeof builder.transformFilesToTreeData === "function"
    ) {
      builder.projectName = this.projectName || this.app?.projectName || "";
      return builder.transformFilesToTreeData(filesData);
    }

    throw new Error(
      "ProjectFilesManager tree-data helper missing: ProjectFileTreeDataBuilder.transformFilesToTreeData"
    );
  }

  async getFileContent(filePath) {    const key = this._vfsNormalizeFileContentPath(filePath);    if (!key) {      return null;    }    const vfs = await this._vfsForFileContent();    if (vfs) {      try {        const content = await vfs.readFile(key, {          nullOnMissing: true        });        if (typeof content === "string") {          return content;        }      } catch (error) {        this._vfsLogFileContentFallback(key, error);      }    }    const editorBridgeContent = await this._vfsReadFileContentFromEditorBridge(key);    if (typeof editorBridgeContent === "string") {      return editorBridgeContent;    }    const workspaceContent = await this._vfsReadFileContentFromWorkspaceStores(key);    if (typeof workspaceContent === "string") {      return workspaceContent;    }    const appStoreContent = await this._vfsReadFileContentFromAppStores(key);    if (typeof appStoreContent === "string") {      return appStoreContent;    }    return null;  }

  async _handleSearchInput(query) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const searchController = helpers.searchController;

    if (
      searchController &&
      typeof searchController.handleSearchInput === "function"
    ) {
      return await searchController.handleSearchInput(this, query);
    }

    return false;
  }

  _calculateWidgetMaxSizes() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const estimator = helpers.promptSizeEstimator;

    if (
      estimator &&
      typeof estimator.calculateWidgetMaxSizes === "function"
    ) {
      return estimator.calculateWidgetMaxSizes(this);
    }

    return {
      maxCodeLength: 42,
      maxDocsLength: 24,
      code: 42,
      docs: 24,
      maxCode: 42,
      maxDocs: 24,
      codeSize: 42,
      docSize: 24
    };
  }

  _workspaceSafeRootName(name) {
      return String(name || "ExternalFolder");
    }

  _buildWorkspaceTreeDataFromPaths(paths, rootId, rootName) {
      return {
        id: rootId,
        name: rootName,
        type: "directory",
        children: []
      };
    }

  _cloneTreeNodeForWorkspaceRoots(node, seen = new Set()) {
      return null;
    }

  _getCurrentRootTreeDataForWorkspaceInsert() {
      return [];
    }

  async _insertOrReplaceWorkspaceRootTree(rootData, metadataPatch = {}) {
      return null;
    }

  async addWorkspaceRootFromFileStore(store, options = {}) {
      return {
        ok: true,
        rootId: options.rootId || "/external",
        rootName: options.rootName || "External",
        files: 0
      };
    }

  async openExternalDirectoryRootFromPicker() {
    if (typeof this.openBrowserWebRootFromPicker === 'function') {
      return await this.openBrowserWebRootFromPicker({ chooseApp: true });
    }
    return { ok: false, reason: 'openBrowserWebRootFromPicker missing' };
  }

  _installWorkspaceRootButton() {
    return {
      ok: true,
      suppressed: true,
      reason:
        'Old workspace-root button is obsolete. Use browser web-root workspace launcher.',
    };
  }

  async _repairVisibilityWidgetsForAllNodes() {
      const metadata = this.fileMetadata || this.app?.inMemoryFileMetadata || {};
      const maxSizes = this._calculateWidgetMaxSizes();

      let repaired = 0;
      let missingWidgets = 0;
      let badAfter = 0;

      this._forEachFileTreeView((treeView) => {
        if (!treeView?.nodesMap) return;

        for (const node of treeView.nodesMap.values()) {
          if (!node || node.type !== 'file') continue;

          const meta = node.metadata || metadata[node.id] || {};
          const sizes = {
            code: Number(meta.codeSize ?? meta.code ?? 0) || 0,
            docs: Number(meta.docSize ?? meta.docs ?? 0) || 0,
            isStructured: !!meta.isStructured,
            hasDocs: !!meta.docSize || !!meta.hasDocs,
          };

          if (node.visibilityWidget) {
            try {
              node.visibilityWidget.updateSizes(sizes, maxSizes);
              repaired++;

              const svg =
                node.visibilityWidget.getElement?.() ||
                node.visibilityWidget.svgElement;
              const width = Number(svg?.getAttribute?.('width'));
              if (!Number.isFinite(width) || width > 420) badAfter++;
            } catch (error) {}
          } else {
            missingWidgets++;
          }
        }
      });

      return {
        ok: true,
        repaired,
        missingWidgets,
        badAfter,
        maxSizes,
        metadataKeys: Object.keys(metadata).length,
      };
    }

  _scaleVisibilityValue(value, min = 12, power = 1.25, cap = 180) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const estimator = helpers.promptSizeEstimator;

    if (
      estimator &&
      typeof estimator.scaleVisibilityValue === "function"
    ) {
      return estimator.scaleVisibilityValue(value, min, power, cap);
    }

    const n = Number(value) || 0;

    if (n <= 0) {
      return 0;
    }

    const scaled = min + Math.sqrt(n) * power;
    return Math.max(min, Math.min(cap, scaled));
  }

  _installFileTreeLayoutRepairStyles() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const chrome = helpers.sidebarChrome;

    if (
      chrome &&
      typeof chrome.installFileTreeLayoutRepairStyles === "function"
    ) {
      return chrome.installFileTreeLayoutRepairStyles(this);
    }

    return false;
  }

  clear() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeOperations = helpers.treeOperations;

    if (treeOperations && typeof treeOperations.clear === "function") {
      return treeOperations.clear(this);
    }

    return false;
  }

  _installSafeExternalRootsStyles() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (
      panel &&
      typeof panel.installSafeExternalRootsStyles === "function"
    ) {
      return panel.installSafeExternalRootsStyles(this);
    }

    return false;
  }

  _findExternalRootsHost() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (panel && typeof panel.findExternalRootsHost === "function") {
      return panel.findExternalRootsHost(this);
    }

    return (
      this.mainElement ||
      this.container ||
      document.querySelector(".project-files-content") ||
      null
    );
  }

  _safeRootName(name) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (panel && typeof panel.safeRootName === "function") {
      return panel.safeRootName(this, name);
    }

    return String(name || "ExternalFolder");
  }

  _ensureExternalRootsPanel() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (panel && typeof panel.ensureExternalRootsPanel === "function") {
      return panel.ensureExternalRootsPanel(this);
    }

    const oldPanel = document.getElementById("vibes-external-roots-panel");
    if (oldPanel) oldPanel.remove();
    return null;
  }

  async _safeOpenExternalRoot() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (panel && typeof panel.safeOpenExternalRoot === "function") {
      return await panel.safeOpenExternalRoot(this);
    }

    return {
      ok: false,
      reason: "ProjectExternalRootsPanel unavailable"
    };
  }

  _renderExternalRootsPanel() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (panel && typeof panel.renderExternalRootsPanel === "function") {
      return panel.renderExternalRootsPanel(this);
    }

    return false;
  }

  _openExternalFileInEditor(path, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (panel && typeof panel.openExternalFileInEditor === "function") {
      return panel.openExternalFileInEditor(this, path, store);
    }

    return false;
  }

  _startExternalRootsPanelKeeper() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (panel && typeof panel.startExternalRootsPanelKeeper === "function") {
      return panel.startExternalRootsPanelKeeper(this);
    }

    return false;
  }

  _wrapExternalRootsAroundTreeMutators() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (
      panel &&
      typeof panel.wrapExternalRootsAroundTreeMutators === "function"
    ) {
      return panel.wrapExternalRootsAroundTreeMutators(this);
    }

    return {
      disabled: true,
      reason: "Floating FileTreeView dialogs replaced sidebar external-root UI."
    };
  }

  _createExternalRootsPanel() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const panel = helpers.externalRootsPanel;

    if (panel && typeof panel.createExternalRootsPanel === "function") {
      return panel.createExternalRootsPanel(this);
    }

    return null;
  }

  _ensureExternalRootState() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (explorer && typeof explorer.ensureExternalRootState === "function") {
      return explorer.ensureExternalRootState(this);
    }

    if (!this.app.workspaceFileStores) this.app.workspaceFileStores = new Map();

    if (!this.externalRootExplorerState) {
      this.externalRootExplorerState = {
        dialog: null,
        content: null,
        rootsList: null,
        status: null,
        fileDialogs: new Map()
      };
    }

    return this.externalRootExplorerState;
  }

  _externalRootSafeName(name) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (explorer && typeof explorer.externalRootSafeName === "function") {
      return explorer.externalRootSafeName(this, name);
    }

    return String(name || "ExternalFolder");
  }

  _makeExternalExplorerButton(label, onClick, extraStyle = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (explorer && typeof explorer.makeExternalExplorerButton === "function") {
      return explorer.makeExternalExplorerButton(label, onClick, extraStyle);
    }

    return makeElement("button", { onclick: onClick, style: extraStyle }, label);
  }

  _openFloatingExternalRootsExplorer() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (
      explorer &&
      typeof explorer.openFloatingExternalRootsExplorer === "function"
    ) {
      return explorer.openFloatingExternalRootsExplorer(this);
    }

    return null;
  }

  async _openExternalFolderIntoFloatingExplorer() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (
      explorer &&
      typeof explorer.openExternalFolderIntoFloatingExplorer === "function"
    ) {
      return await explorer.openExternalFolderIntoFloatingExplorer(this);
    }

    return {
      ok: false,
      reason: "ProjectExternalRootsExplorer unavailable"
    };
  }

  async _refreshExternalRootStores() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (explorer && typeof explorer.refreshExternalRootStores === "function") {
      return await explorer.refreshExternalRootStores(this);
    }

    return {
      ok: true,
      refreshed: 0
    };
  }

  _renderFloatingExternalRootsExplorer() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (
      explorer &&
      typeof explorer.renderFloatingExternalRootsExplorer === "function"
    ) {
      return explorer.renderFloatingExternalRootsExplorer(this);
    }

    return false;
  }

  _buildFloatingExternalRootTree(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (
      explorer &&
      typeof explorer.buildFloatingExternalRootTree === "function"
    ) {
      return explorer.buildFloatingExternalRootTree(this, rootId, store);
    }

    return makeElement("div", {}, String(rootId || ""));
  }

  _externalStoreToNestedTree(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (explorer && typeof explorer.externalStoreToNestedTree === "function") {
      return explorer.externalStoreToNestedTree(rootId, store);
    }

    return {
      name: String(rootId || "").replace(/^\//, ""),
      path: rootId,
      type: "directory",
      children: []
    };
  }

  _renderFloatingExternalNode(node, rootId, store, depth) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const explorer = helpers.externalRootsExplorer;

    if (
      explorer &&
      typeof explorer.renderFloatingExternalNode === "function"
    ) {
      return explorer.renderFloatingExternalNode(this, node, rootId, store, depth);
    }

    return makeElement("div", {}, node?.name || node?.path || "");
  }

  _openFloatingExternalFileWindow(path, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const editor = helpers.floatingExternalEditor;

    if (editor && typeof editor.openFloatingExternalFileWindow === "function") {
      return editor.openFloatingExternalFileWindow(this, path, store);
    }

    return null;
  }

  _ensureFloatingFileTreeState() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const launcher = helpers.floatingTreeLauncher;

    if (launcher && typeof launcher.ensureFloatingFileTreeState === "function") {
      return launcher.ensureFloatingFileTreeState(this);
    }

    if (!this.floatingFileTreeState) {
      this.floatingFileTreeState = {
        launcherDialog: null,
        launcherContent: null,
        rootsList: null,
        status: null,
        trees: new Map(),
        editors: new Map()
      };
    }

    return this.floatingFileTreeState;
  }

  _floatingTreeSafeRootName(name) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const launcher = helpers.floatingTreeLauncher;

    if (launcher && typeof launcher.floatingTreeSafeRootName === "function") {
      return launcher.floatingTreeSafeRootName(this, name);
    }

    return String(name || "ExternalFolder");
  }

  _makeFloatingTreeButton(label, onClick, extraStyle = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const launcher = helpers.floatingTreeLauncher;

    if (launcher && typeof launcher.makeFloatingTreeButton === "function") {
      return launcher.makeFloatingTreeButton(label, onClick, extraStyle);
    }

    return makeElement("button", { onclick: onClick, style: extraStyle }, label);
  }

  _openFloatingExternalFileTreeLauncher() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const launcher = helpers.floatingTreeLauncher;

    if (
      launcher &&
      typeof launcher.openFloatingExternalFileTreeLauncher === "function"
    ) {
      return launcher.openFloatingExternalFileTreeLauncher(this);
    }

    return null;
  }

  _renderFloatingFileTreeLauncher() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const launcher = helpers.floatingTreeLauncher;

    if (
      launcher &&
      typeof launcher.renderFloatingFileTreeLauncher === "function"
    ) {
      return launcher.renderFloatingFileTreeLauncher(this);
    }

    return this._ensureFloatingFileTreeState();
  }

  async _pickExternalFolderAndOpenFileTreeDialog() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const launcher = helpers.floatingTreeLauncher;

    if (
      launcher &&
      typeof launcher.pickExternalFolderAndOpenFileTreeDialog === "function"
    ) {
      return await launcher.pickExternalFolderAndOpenFileTreeDialog(this);
    }

    return {
      ok: false,
      reason: "ProjectFloatingTreeLauncher unavailable"
    };
  }

  _pathFromFloatingTreeNodeInfo(nodeInfo) {
    if (!nodeInfo) return null;
    if (typeof nodeInfo === 'string') return nodeInfo;

    return (
      nodeInfo.id ||
      nodeInfo.path ||
      nodeInfo.filePath ||
      nodeInfo.goldenPath ||
      nodeInfo.node?.id ||
      nodeInfo.node?.path ||
      nodeInfo.data?.id ||
      nodeInfo.data?.path ||
      null
    );
  }

  _installFloatingTreeLauncherButton() {
      // Return cleanly; legacy toolbar and launcher row elements are permanently unmounted at startup
      return true;
    }

  _floatingEditorLanguageForPath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const editor = helpers.floatingExternalEditor;

    if (editor && typeof editor.floatingEditorLanguageForPath === "function") {
      return editor.floatingEditorLanguageForPath(path);
    }

    return "text";
  }

  _makeFloatingSignatureForContent(path, content) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const editor = helpers.floatingExternalEditor;

    if (editor && typeof editor.makeFloatingSignatureForContent === "function") {
      return editor.makeFloatingSignatureForContent(path, content);
    }

    if (typeof content !== "string") return "(binary file)";
    return `File: ${path}\nLines: ${content.split("\n").length}`;
  }

  _docsPathForExternalPath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const editor = helpers.floatingExternalEditor;

    if (editor && typeof editor.docsPathForExternalPath === "function") {
      return editor.docsPathForExternalPath(path);
    }

    const withoutSlash = String(path || "").replace(/^\//, "");
    const safe = withoutSlash.replace(/[\/.]/g, "_");
    const root = "/" + withoutSlash.split("/")[0];

    return `${root}/.vibes/docs/${safe}.md`;
  }

  async _openFloatingExternalEditorWindow(path, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const editor = helpers.floatingExternalEditor;

    if (editor && typeof editor.openFloatingExternalEditorWindow === "function") {
      return await editor.openFloatingExternalEditorWindow(this, path, store);
    }

    return this._openFloatingExternalFileWindow(path, store);
  }

  _refreshFloatingTreeForPath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const editor = helpers.floatingExternalEditor;

    if (editor && typeof editor.refreshFloatingTreeForPath === "function") {
      return editor.refreshFloatingTreeForPath(this, path);
    }

    return false;
  }

  _migrateDocumentationDirectoryInStore(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.sidecarWorkspaceTools;

    if (
      tools &&
      typeof tools.migrateDocumentationDirectoryInStore === "function"
    ) {
      return tools.migrateDocumentationDirectoryInStore(this, rootId, store);
    }

    return {
      rootId,
      moved: 0,
      skipped: 0,
      errors: ["ProjectSidecarWorkspaceTools unavailable"],
      moves: []
    };
  }

  _migrateDocumentationDirectoriesInWorkspaceStores() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.sidecarWorkspaceTools;

    if (
      tools &&
      typeof tools.migrateDocumentationDirectoriesInWorkspaceStores ===
        "function"
    ) {
      return tools.migrateDocumentationDirectoriesInWorkspaceStores(this);
    }

    return {
      roots: 0,
      moved: 0,
      skipped: 0,
      errors: ["ProjectSidecarWorkspaceTools unavailable"],
      moves: []
    };
  }

  _installFloatingDocsMigrationButton() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.sidecarWorkspaceTools;

    if (
      tools &&
      typeof tools.installFloatingDocsMigrationButton === "function"
    ) {
      return tools.installFloatingDocsMigrationButton(this);
    }

    return false;
  }

  async _runSidecarMetadataScannerCommand() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.sidecarWorkspaceTools;

    if (
      tools &&
      typeof tools.runSidecarMetadataScannerCommand === "function"
    ) {
      return await tools.runSidecarMetadataScannerCommand(this);
    }

    throw new Error("ProjectSidecarWorkspaceTools unavailable");
  }

  _installSidecarMetadataScannerButton() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.sidecarWorkspaceTools;

    if (
      tools &&
      typeof tools.installSidecarMetadataScannerButton === "function"
    ) {
      return tools.installSidecarMetadataScannerButton(this);
    }

    return false;
  }

  _showSidecarMetadataScanReport(report) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.sidecarWorkspaceTools;

    if (
      tools &&
      typeof tools.showSidecarMetadataScanReport === "function"
    ) {
      return tools.showSidecarMetadataScanReport(this, report);
    }

    return false;
  }

  _visibleNodeRunnerSource() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibleNodeRunnerTools;

    if (tools && typeof tools.visibleNodeRunnerSource === "function") {
      return tools.visibleNodeRunnerSource(this);
    }

    return Promise.reject("ProjectVisibleNodeRunnerTools unavailable");
  }

  _visibleNodeRunnerSmokeJobSource() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibleNodeRunnerTools;

    if (
      tools &&
      typeof tools.visibleNodeRunnerSmokeJobSource === "function"
    ) {
      return tools.visibleNodeRunnerSmokeJobSource(this);
    }

    return "";
  }

  async _installVisibleNodeRunnerForWorkspaceRoot(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibleNodeRunnerTools;

    if (
      tools &&
      typeof tools.installVisibleNodeRunnerForWorkspaceRoot === "function"
    ) {
      return await tools.installVisibleNodeRunnerForWorkspaceRoot(
        this,
        rootId,
        store
      );
    }

    return {
      rootId,
      written: 0,
      failed: 1,
      errors: ["ProjectVisibleNodeRunnerTools unavailable"]
    };
  }

  async _enqueueVisibleNodeRunnerSmokeJob(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibleNodeRunnerTools;

    if (
      tools &&
      typeof tools.enqueueVisibleNodeRunnerSmokeJob === "function"
    ) {
      return await tools.enqueueVisibleNodeRunnerSmokeJob(this, rootId, store);
    }

    throw new Error("ProjectVisibleNodeRunnerTools unavailable");
  }

  _showVisibleNodeRunnerOutbox(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibleNodeRunnerTools;

    if (tools && typeof tools.showVisibleNodeRunnerOutbox === "function") {
      return tools.showVisibleNodeRunnerOutbox(this, rootId, store);
    }

    return false;
  }

  _workspaceLabelForStore(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibleNodeRunnerTools;

    if (tools && typeof tools.workspaceLabelForStore === "function") {
      return tools.workspaceLabelForStore(rootId, store);
    }

    const count = store?.keys
      ? Array.from(store.keys()).filter((path) => path.startsWith(rootId + "/"))
          .length
      : 0;

    return `${rootId} - ${count} files`;
  }

  _openWorkspaceTreeBestEffort(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const launcher = helpers.floatingTreeLauncher;

    if (launcher && typeof launcher.openWorkspaceTreeBestEffort === "function") {
      return launcher.openWorkspaceTreeBestEffort(this, rootId, store);
    }

    if (typeof this.openFloatingTreeForStore === "function") {
      return this.openFloatingTreeForStore(rootId, store);
    }

    return null;
  }

  openFloatingTreeForStore(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.floatingTreeStoreDialogController;

    if (
      controller &&
      typeof controller.openFloatingTreeForStore === "function"
    ) {
      return controller.openFloatingTreeForStore(this, rootId, store);
    }

    throw new Error("ProjectFloatingTreeStoreDialogController unavailable");
  }

  registerFileTreeView(treeView) {
      if (!treeView) return false;

      const helpers = this._ensureBreakdownHelpers?.() || {};
      const registry = helpers.fileTreeRegistry;

      if (registry && typeof registry.registerFileTreeView === "function") {
        const ok = registry.registerFileTreeView(treeView);
        this.fileTreeViews = registry.treeViews;
        return ok;
      }

      if (!this.fileTreeViews) {
        this.fileTreeViews = new Set();
      }

      this.fileTreeViews.add(treeView);
      return true;
    }

  unregisterFileTreeView(treeView) {
      if (!treeView) return false;

      const helpers = this._ensureBreakdownHelpers?.() || {};
      const registry = helpers.fileTreeRegistry;

      if (registry && typeof registry.unregisterFileTreeView === "function") {
        const ok = registry.unregisterFileTreeView(treeView);
        this.fileTreeViews = registry.treeViews;
        return ok;
      }

      if (!this.fileTreeViews) return false;
      this.fileTreeViews.delete(treeView);
      return true;
    }

  getFileTreeViews() {
      const helpers = this._ensureBreakdownHelpers?.() || {};
      const registry = helpers.fileTreeRegistry;

      if (registry && typeof registry.getFileTreeViews === "function") {
        return registry.getFileTreeViews();
      }

      const views = [];

      if (
        this.fileTreeViews &&
        typeof this.fileTreeViews.forEach === "function"
      ) {
        this.fileTreeViews.forEach((treeView) => {
          if (treeView && !views.includes(treeView)) {
            views.push(treeView);
          }
        });
      }

      return views;
    }

  _forEachFileTreeView(callback) {
      const helpers = this._ensureBreakdownHelpers?.() || {};
      const registry = helpers.fileTreeRegistry;

      if (registry && typeof registry.forEachFileTreeView === "function") {
        return registry.forEachFileTreeView(callback, {
          onError: (error) => {
            console.warn(
              "[ProjectFilesManager] file tree callback failed:",
              error
            );
          }
        });
      }

      const views = this.getFileTreeViews();

      for (const treeView of views) {
        try {
          callback(treeView);
        } catch (error) {
          console.warn(
            "[ProjectFilesManager] file tree callback failed:",
            error
          );
        }
      }

      return views.length;
    }

  _setNodeVisibilityStateSilently(node, state) {
    if (!node || !state) return false;

    if (typeof node.setVisibilityState === 'function') {
      node.setVisibilityState(state);
      return true;
    }

    if (
      node.visibilityWidget &&
      typeof node.visibilityWidget.setState === 'function'
    ) {
      node.visibilityWidget.setState(state, true);
      return true;
    }

    if (node.visibilityWidget) {
      node.visibilityWidget.state = { ...state };

      if (typeof node.visibilityWidget.redraw === 'function') {
        node.visibilityWidget.redraw();
        return true;
      }

      if (typeof node.visibilityWidget.render === 'function') {
        node.visibilityWidget.render();
        return true;
      }
    }

    return false;
  }

  _syncVisibilityStateAcrossTrees(sourceNode, state) {
    if (!sourceNode || !sourceNode.id || !state) return 0;

    let synced = 0;

    this._forEachFileTreeView((treeView) => {
      const peerNode = treeView?.nodesMap?.get?.(sourceNode.id);
      if (!peerNode || peerNode === sourceNode) return;

      if (this._setNodeVisibilityStateSilently(peerNode, state)) {
        synced++;
      }
    });

    return synced;
  }

  onVisibilityChange(node, reason = 'programmatic', sourceTreeView = null) {
      const state = node?.visibilityWidget?.state
        ? { ...node.visibilityWidget.state }
        : null;

      if (node && state) {
        this._syncVisibilityStateAcrossTrees(node, state);
      }

      this._updatePromptSizeEstimate?.();

      if (this.app?.buildPromptTab?._checkDirtyState) {
        this.app.buildPromptTab._checkDirtyState();
      }

      if (this.app?.buildPromptTab?._widgetStateChangeCallback) {
        this.app.buildPromptTab._widgetStateChangeCallback();
      }

      if (this.app?.notifyVisibilityChange) {
        this.app.notifyVisibilityChange();
      }

      if (this.app?.visibilityManager?.notify) {
        this.app.visibilityManager.notify();
      }

      if (this.floatingFileTreeState && this.floatingFileTreeState.launcherDialog && this.floatingFileTreeState.launcherDialog.element && this.floatingFileTreeState.launcherDialog.element.isConnected) {
          const launcher = this._ensureBreakdownHelpers?.()?.floatingTreeLauncher;
          if (launcher && typeof launcher.renderFloatingFileTreeLauncher === 'function') {
              launcher.renderFloatingFileTreeLauncher(this);
          }
      }

      return {
        ok: true,
        reason,
        sourceTreeView: !!sourceTreeView,
        nodeId: node?.id || null,
      };
    }

  _externalStoreToFileTreeData(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.treeDataBuilder;

    if (
      builder &&
      typeof builder.externalStoreToFileTreeData === "function"
    ) {
      builder.projectName = this.projectName || this.app?.projectName || "";
      return builder.externalStoreToFileTreeData(rootId, store);
    }

    throw new Error(
      "ProjectFilesManager tree-data helper missing: ProjectFileTreeDataBuilder.externalStoreToFileTreeData"
    );
  }

  _isSidecarOrMetadataFile(goldenPath) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.treeDataBuilder;

    if (
      builder &&
      typeof builder.isSidecarOrMetadataFile === "function"
    ) {
      return builder.isSidecarOrMetadataFile(goldenPath);
    }

    const filename =
      String(goldenPath || "")
        .split("/")
        .pop() || "";

    if (
      filename === "_folder.meta.yaml" ||
      filename === "file_metadata.json" ||
      filename === "project_metadata.json" ||
      filename === "clone-metadata.json"
    ) {
      return true;
    }

    return (
      new RegExp(
        "_(js|mjs|cjs|ts|tsx|jsx|html|htm|css|json|yaml|yml|txt|md)\\.md$",
        "i"
      ).test(filename) ||
      new RegExp(
        "_(js|mjs|cjs|ts|tsx|jsx|html|htm|css|json|yaml|yml|txt|md)\\.ya?ml$",
        "i"
      ).test(filename)
    );
  }

  _getDocPathForSource(sourceGoldenPath, projectName) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.treeDataBuilder;

    if (
      builder &&
      typeof builder.getDocPathForSource === "function"
    ) {
      return builder.getDocPathForSource(sourceGoldenPath, projectName);
    }

    if (!sourceGoldenPath || !String(sourceGoldenPath).includes(".")) {
      return null;
    }

    if (
      typeof SidecarDocumentation !== "undefined" &&
      typeof SidecarDocumentation.docsPathForFile === "function"
    ) {
      return SidecarDocumentation.docsPathForFile(sourceGoldenPath);
    }

    const parts = String(sourceGoldenPath).split("/");
    const filename = parts.pop();
    if (!filename) return null;

    const docFilename =
      filename.replace(new RegExp("[^\\w.-]+", "g"), "_").replaceAll(".", "_") +
      ".md";

    parts.push(docFilename);
    return parts.join("/");
  }

  _visibilitySetFilterLog(message) {
    try {
      console.log('VSF1 ' + message);
    } catch (e) {}
  }

  _visibilitySetFilterStatus(result) {
    const status = this.visibilitySetFilterStatus;
    if (!status) return;

    if (!result?.ok) {
      status.textContent = `VSF1 failed: ${result?.reason || 'unknown'}`;
      return;
    }

    if (result.action === 'clear') {
      status.textContent = 'VSF1 cleared filter';
      return;
    }

    status.textContent = `VSF1 ${result.action}: ${result.name} · set items ${result.items} · matching tree ids ${result.matchingIds}`;
  }

  _visibilityItemToWidgetState(item) {
    const docs =
      item.docs === true ||
      item.docsLevel === 'full' ||
      item.docsLevel === 'summary' ||
      item.docsLevel === 'signatures';

    return {
      code: !!item.code,
      signatures: !!item.signatures,
      docs,
      docsLevel: item.docsLevel || (docs ? 'full' : 'none'),
    };
  }

  _applyVisibilitySetStateToWidgets(set) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (
      controller &&
      typeof controller.applyVisibilitySetStateToWidgets === "function"
    ) {
      return controller.applyVisibilitySetStateToWidgets(this, set);
    }

    return {
      applied: 0,
      missing: set && set.items ? set.items.length : 0
    };
  }

  _expandAncestorsForMatchingIds(matchingIds) {
      this._forEachFileTreeView((treeView) => {
        if (!treeView?.nodesMap) return;

        for (const id of matchingIds) {
          const node = treeView.nodesMap.get(id);
          if (!node) continue;

          let parent = node.parentNode;
          while (parent) {
            if (parent.type === 'directory') {
              if (typeof parent.setOpen === 'function') {
                parent.setOpen(true);
              } else if (
                typeof parent.toggleExpandCollapse === 'function' &&
                !parent.isExpanded
              ) {
                parent.toggleExpandCollapse();
              } else {
                parent.isExpanded = true;
                parent.updateVisualState?.();
              }
            }

            parent = parent.parentNode;
          }
        }

        treeView.redrawLines?.();
      });
    }

  _findNodeForVisibilityPath(path) {
      if (!path) return null;
      let foundNode = null;

      this._forEachFileTreeView((treeView) => {
        if (foundNode || !treeView?.nodesMap) return;

        const nodesMap = treeView.nodesMap;

        if (nodesMap.has(path)) {
          foundNode = nodesMap.get(path);
          return;
        }

        const noSlash = path.replace(/\/+$/, '');
        if (nodesMap.has(noSlash)) {
          foundNode = nodesMap.get(noSlash);
          return;
        }

        const basename = noSlash.split('/').pop();

        for (const node of nodesMap.values()) {
          if (node.id === noSlash) {
            foundNode = node;
            return;
          }

          if (
            node.id?.endsWith('/' + basename) &&
            noSlash.endsWith('/' + basename)
          ) {
            foundNode = node;
            return;
          }
        }
      });

      return foundNode;
    }

  _normalizeVisibilitySetPath(path) {
    return String(path || '').replace(/\/+$/, '');
  }

  _matchingIdsForVisibilitySet(set) {
    const matchingIds = new Set();

    for (const item of set.items || []) {
      const path = this._normalizeVisibilitySetPath(item.path);
      const node = this._findNodeForVisibilityPath(path);

      if (!node) continue;

      matchingIds.add(node.id);

      let parent = node.parentNode;
      while (parent) {
        matchingIds.add(parent.id);
        parent = parent.parentNode;
      }
    }

    return matchingIds;
  }

  _visibilitySetFilterSlug(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  _loadVisibilitySetForFilter(name) {
    const slug = this._visibilitySetFilterSlug(name);

    const keys = [
      `vibes.visibilitySet.vset2.${slug}`,
      `vibes.visibilitySet.${slug}`,
      `visibilitySet:${name}`,
      `visibility-set:${name}`,
    ];

    let best = null;

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (parsed?.name === name && Array.isArray(parsed.items)) {
          if (!best || parsed.items.length > best.items.length) {
            best = parsed;
          }
        }
      } catch (e) {}
    }

    return best;
  }

  clearVisibilitySetTreeFilter() {
    if (this.fileTreeView?.applyFilter) {
      this.fileTreeView.applyFilter(null);
    }

    this._activeVisibilitySetFilter = null;

    this._visibilitySetFilterLog('cleared visibility set filter');

    return {
      ok: true,
      action: 'clear',
    };
  }

  filterTreeToVisibilitySet(name, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (
      controller &&
      typeof controller.filterTreeToVisibilitySet === "function"
    ) {
      return controller.filterTreeToVisibilitySet(this, name, options);
    }

    return {
      ok: false,
      reason: "ProjectVisibilitySetFilterController unavailable"
    };
  }

  _getSavedVisibilitySetNames() {
    const names = new Set();

    for (const key of Object.keys(localStorage)) {
      if (!key.toLowerCase().includes('visibility')) continue;

      try {
        const parsed = JSON.parse(localStorage.getItem(key));
        if (parsed?.name && Array.isArray(parsed.items)) {
          names.add(parsed.name);
        }
      } catch (e) {}
    }

    return Array.from(names).sort();
  }

  _refreshVisibilitySetFilterOptions() {
    const select = this.visibilitySetFilterSelect;
    if (!select) return [];

    const names = this._getSavedVisibilitySetNames();
    const previous = select.value;

    select.textContent = '';

    if (!names.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '(no saved visibility sets found)';
      select.appendChild(option);
      return [];
    }

    for (const name of names) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    }

    if (previous && names.includes(previous)) {
      select.value = previous;
    }

    return names;
  }

  _installVisibilitySetFilterStyles() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (
      controller &&
      typeof controller.installVisibilitySetFilterStyles === "function"
    ) {
      return controller.installVisibilitySetFilterStyles();
    }

    return false;
  }

  _visibilitySetFilterHost() {
    return (
      this.searchPanel ||
      this.treeContainer ||
      this.mainElement ||
      this.element ||
      this.container ||
      this.getElement?.() ||
      null
    );
  }

  _installVisibilitySetFilterUI(reason = "install") {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (
      controller &&
      typeof controller.installVisibilitySetFilterUI === "function"
    ) {
      return controller.installVisibilitySetFilterUI(this, reason);
    }

    return false;
  }


  _vsol1Slug(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  _vsol1ReadJsonLocalStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  _vsol1IsVisibilitySetKey(key) {
    return (
      key.startsWith('vibes.visibilitySet.') ||
      key.startsWith('visibilitySet:') ||
      key.startsWith('visibility-set:')
    );
  }

  _vsol1InstallStyles() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (controller && typeof controller.vsol1InstallStyles === "function") {
      return controller.vsol1InstallStyles();
    }

    return false;
  }




  







  clearStoredVisibilitySetFilter() {
    if (this.fileTreeView?.applyFilter) {
      this.fileTreeView.applyFilter(null);
    }

    this._activeStoredVisibilitySetFilter = null;
    this._vsol1UpdatePanelStatus?.('Cleared visibility-set filter');
    this._vsol1Log('cleared stored visibility-set filter');

    return {
      ok: true,
      action: 'clear-filter',
    };
  }

  async applyStoredVisibilitySet(name, options = {}) {
    const requested = String(name || "").trim();
    const candidates = await this._visibilityCollectApplyCandidates(requested);
    const trees = this._visibilityGetOpenTreesForApply();

    const shouldClearFirst = options.resetUnmatchedTrees !== false;
    const preReset = [];

    if (shouldClearFirst) {
      for (const treeView of trees) {
        const treeRoot = this._visibilityRootForTree(treeView);
        let reset = 0;

        if (typeof this._visibilityClearTreeForApply === "function") {
          reset = this._visibilityClearTreeForApply(treeView);
        } else if (treeView?.nodesMap && typeof treeView.nodesMap.values === "function") {
          for (const node of treeView.nodesMap.values()) {
            if (node?.type !== "file" || !node.visibilityWidget) continue;
            node.visibilityWidget.setState({
              code: false,
              codeLevel: 0,
              signatures: false,
              sig: false,
              docs: false,
              docsLevel: 0
            }, true);
            reset++;
          }
        }

        preReset.push({ treeRoot, reset });
      }
    }

    const results = [];

    for (const candidate of candidates) {
      for (const treeView of trees) {
        const treeRoot = this._visibilityRootForTree(treeView);

        if (candidate.treeRoot && treeRoot && candidate.treeRoot !== treeRoot) {
          continue;
        }

        if (typeof this.applyStoredVisibilitySetToTree === "function") {
          const result = await this.applyStoredVisibilitySetToTree(candidate.name, treeView, {
            ...options,
            resetFirst: false,
            reason: options.reason || "applyStoredVisibilitySet-parent-partition"
          });

          results.push({
            candidateName: candidate.name,
            candidateRoot: candidate.treeRoot,
            treeRoot,
            result
          });
        } else {
          results.push({
            candidateName: candidate.name,
            candidateRoot: candidate.treeRoot,
            treeRoot,
            result: this._visibilityApplySetToTreeDirect(treeView, candidate.set, candidate.name, {
              ...options,
              resetFirst: false
            })
          });
        }
      }
    }

    for (const treeView of trees) {
      try {
        treeView.redrawLines?.();
      } catch (error) {}

      try {
        treeView.options?.onVisibilityChange?.();
      } catch (error) {}
    }

    try {
      this._refreshVisibilityTreesAfterApply?.();
    } catch (error) {}

    try {
      this.app?.visibilityManager?.notify?.();
    } catch (error) {}

    try {
      this.app?.buildPromptTab?._widgetStateChangeCallback?.();
    } catch (error) {}

    const matched = results.reduce((sum, item) => {
      return sum + Number(
        item.result?.matched ||
        item.result?.applied ||
        item.result?.matchedCount ||
        0
      );
    }, 0);

    const reset = preReset.reduce((sum, item) => sum + Number(item.reset || 0), 0);

    const summary = {
      ok: matched > 0,
      requested,
      candidateCount: candidates.length,
      treeCount: trees.length,
      matched,
      reset,
      preReset,
      candidates: candidates.map(item => item.name),
      results
    };

    console.log("[VisibilitySets] applyStoredVisibilitySet", summary);

    try {
      if (this.app?.uiManager?.setStatus) {
        this.app.uiManager.setStatus(
          matched > 0
            ? `Applied visibility set "${requested}": ${matched} matched.`
            : `Visibility set "${requested}" matched 0 files.`
        );
      }
    } catch (error) {}

    return summary;
  }



  createStoredVisibilitySet(name, items, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (
      controller &&
      typeof controller.createStoredVisibilitySet === "function"
    ) {
      return controller.createStoredVisibilitySet(this, name, items, options);
    }

    throw new Error("ProjectVisibilitySetFilterController unavailable");
  }

  _visreset1ClearAllVisibilityWidgets() {
      let resetCount = 0;

      const offState = {
        code: false,
        signatures: false,
        docs: false,
        docsLevel: 0,
      };

      this._forEachFileTreeView((treeView) => {
        if (!treeView?.nodesMap) return;
        for (const node of treeView.nodesMap.values()) {
          if (!node || node.type === 'directory') continue;

          try {
            if (node.visibilityWidget?.setState) {
              node.visibilityWidget.setState(offState, true);
              resetCount++;
            }
          } catch (error) {
            console.warn('VISRESET1 reset failed for node', node.id, error);
          }
        }
      });

      return resetCount;
    }





  _installVersionBanner() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const chrome = helpers.sidebarChrome;

    if (chrome && typeof chrome.installVersionBanner === "function") {
      return chrome.installVersionBanner(this);
    }

    return false;
  }


  _bridgeWorkspaceStoreIntoMemory(rootId, store) {
    if (!this.app) return 0;
    if (!this.app.inMemoryFileStore) this.app.inMemoryFileStore = new Map();

    let synced = 0;
    const keys = typeof store.keys === 'function' ? [...store.keys()] : [];
    for (const path of keys) {
      const content = store.get(path);
      if (typeof content === 'string') {
        this.app.inMemoryFileStore.set(path, content);
        synced++;
      }
    }
    console.log(
      `[WorkspaceBridge] bridged ${synced} files from ${rootId} into inMemoryFileStore`
    );
    return synced;
  }

  async transplantToStore(options = {}) {
    const { method, targetPath, targetClass, donor } = options;
    const app = this.app;

    const mounted = this._getWorkspaceStoreForMountedRootPath
      ? this._getWorkspaceStoreForMountedRootPath(targetPath)
      : null;

    const rootId = mounted?.rootId || '/' + String(targetPath).split('/').filter(Boolean)[0];
    const store = mounted?.store || app?.workspaceFileStores?.get(rootId);

    if (!store) throw new Error('No workspace store for ' + rootId);

    const normalizedPath = mounted?.path || targetPath;

    const current = store.get(normalizedPath);
    if (typeof current !== 'string') {
      throw new Error('File not readable from store: ' + normalizedPath);
    }

    if (!app.inMemoryFileStore) app.inMemoryFileStore = new Map();
    app.inMemoryFileStore.set(normalizedPath, current);

    const patched = this._applyMethodTransplant(
      current,
      targetClass,
      method,
      donor
    );

    if (!patched.ok) {
      throw new Error('Transplant failed: ' + patched.error);
    }

    const approved = await this._showWorkspaceTransplantDiff({
      path: normalizedPath,
      before: current,
      after: patched.content,
      method,
    });

    if (!approved) {
      app.inMemoryFileStore.delete(normalizedPath);
      return { ok: false, reason: 'cancelled' };
    }

    let commitResult = null;

    if (typeof this.commitMountedRootFileToDisk === 'function') {
      commitResult = await this.commitMountedRootFileToDisk(normalizedPath, patched.content);
    } else {
      await store.set(normalizedPath, patched.content);
      const readback = store.get(normalizedPath);
      if (readback !== patched.content) {
        throw new Error('Readback mismatch after write');
      }
      commitResult = {
        ok: true,
        path: normalizedPath,
        rootId,
        backend: 'store.set',
        diskVerified: false
      };
    }

    if (!commitResult || !commitResult.ok) {
      throw new Error('Mounted root commit failed: ' + JSON.stringify(commitResult));
    }

    app.inMemoryFileStore.set(normalizedPath, patched.content);

    return {
      ok: true,
      action: patched.action,
      path: normalizedPath,
      rootId,
      commit: commitResult
    };
  }

  _applyMethodTransplant(source, className, methodName, methodSource) {
    const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;
    if (!CJCP) {
      return { ok: false, error: 'ClientJSClassPatcher not available for AST parsing' };
    }
    
    const classBody = CJCP._findClassBody(source, className);
    if (!classBody) return { ok: false, error: 'Class not found in AST: ' + className };

    const innerContent = source.slice(classBody.bodyStart, classBody.bodyEnd);
    
    // Use AST to precisely locate existing method bounds
    const existing = CJCP._findMethodInSource(innerContent, methodName);

    let action;
    let content;

    if (existing) {
      const absStart = classBody.bodyStart + existing.start;
      const absEnd = classBody.bodyStart + existing.end;
      // Surgically replace the exact AST string bounds
      content = source.slice(0, absStart) + methodSource.trim() + source.slice(absEnd);
      action = 'replaced';
    } else {
      // Surgically insert right before the closing brace of the class body
      content =
        source.slice(0, classBody.bodyEnd) +
        '\n  ' +
        methodSource.trim() +
        '\n' +
        source.slice(classBody.bodyEnd);
      action = 'inserted';
    }

    return { ok: true, content, action };
  }

  async _showWorkspaceTransplantDiff({ path, before, after, method }) {
    return new Promise((resolve) => {
      const beforeLines = before.split('\n').length;
      const afterLines = after.split('\n').length;
      const delta = afterLines - beforeLines;

      const content = makeElement('div', {
        style: { fontFamily: 'system-ui', color: '#dce6ff', minWidth: '500px' },
      });

      content.appendChild(
        makeElement(
          'div',
          {
            style: { marginBottom: '10px', fontSize: '13px' },
          },
          `Transplant "${method}" → ${path}`
        )
      );

      content.appendChild(
        makeElement(
          'div',
          {
            style: { fontSize: '12px', color: '#8aa0cc', marginBottom: '12px' },
          },
          `${beforeLines} → ${afterLines} lines (${
            delta >= 0 ? '+' : ''
          }${delta})`
        )
      );

      // simple before/after snippet
      const pre = makeElement('pre', {
        style: {
          background: 'rgba(0,0,0,0.4)',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '11px',
          maxHeight: '300px',
          overflow: 'auto',
          color: '#b0c4de',
          whiteSpace: 'pre-wrap',
        },
      });
      pre.textContent =
        after.slice(0, 1200) + (after.length > 1200 ? '\n...' : '');
      content.appendChild(pre);

      UITools.makeDialog({
        title: '🔧 Workspace Transplant - Review',
        content,
        buttons: [
          { label: 'Cancel', onClick: () => resolve(false) },
          {
            label: '✓ Apply to Store',
            className: 'primary',
            onClick: () => resolve(true),
          },
        ],
      });
    });
  }

  static _doc_ProjectFilesManager() {
    return '## ProjectFilesManager\n\nThe master controller for file trees, workspace mounting, and file-level operations. It bridges the gap between the `VirtualFileSystem` and visual `FileTreeView` components.';
  }

  _ensureUnifiedFloatingTreeLauncherRow() {
    this._removeUnifiedFloatingTreeLauncherRow();
    this._updateToolbarWorkspaces();
    return false;
  }

  _makeUnifiedFloatingTreeButton(options = {}) {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = options.label || 'Tree';
    button.title = options.title || '';
    button.dataset.treeLauncherRole = options.role || '';
    button.className = 'vibes-unified-floating-tree-button';
    button.style.cssText = [
      'flex:1 1 auto',
      'min-width:76px',
      'padding:5px 8px',
      'border-radius:9px',
      'border:1px solid rgba(150,190,255,.26)',
      'background:rgba(255,255,255,.065)',
      'color:#dce9ff',
      'font:11px system-ui,sans-serif',
      'font-weight:700',
      'cursor:pointer',
      'white-space:nowrap',
    ].join(';');

    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(120,170,255,.18)';
      button.style.boxShadow = '0 0 16px rgba(120,170,255,.16)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(255,255,255,.065)';
      button.style.boxShadow = '';
    });

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        button.disabled = true;
        button.style.opacity = '0.55';
        await options.onClick?.();
      } catch (error) {
        console.error('[ProjectFilesManager] tree launcher failed:', error);
        this.app?.uiManager?.setStatus?.(
          'Tree launcher failed: ' + error.message,
          true
        );
      } finally {
        button.disabled = false;
        button.style.opacity = '1';
      }
    });

    return button;
  }


  async _openLibraryAsFloatingTree() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.floatingTreeStoreBuilder;

    if (builder && typeof builder.openLibraryAsFloatingTree === "function") {
      return await builder.openLibraryAsFloatingTree(this);
    }

    return false;
  }

  async _ensureLibraryPathsForFloatingTree() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.floatingTreeStoreBuilder;

    if (
      builder &&
      typeof builder.ensureLibraryPathsForFloatingTree === "function"
    ) {
      return await builder.ensureLibraryPathsForFloatingTree(this);
    }

    return [];
  }

  async _openPrefixAsFloatingTree(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.floatingTreeStoreBuilder;

    if (builder && typeof builder.openPrefixAsFloatingTree === "function") {
      return await builder.openPrefixAsFloatingTree(this, options);
    }

    return false;
  }

  _makeReadOnlyFloatingTreeStore(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.floatingTreeStoreBuilder;

    if (
      builder &&
      typeof builder.makeReadOnlyFloatingTreeStore === "function"
    ) {
      return builder.makeReadOnlyFloatingTreeStore(this, options);
    }

    return null;
  }

  _collectKnownPathsForPrefix(prefix, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.floatingTreeStoreBuilder;

    if (builder && typeof builder.collectKnownPathsForPrefix === "function") {
      return builder.collectKnownPathsForPrefix(this, prefix, options);
    }

    return [];
  }

  _readKnownPathForFloatingTree(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.floatingTreeStoreBuilder;

    if (builder && typeof builder.readKnownPathForFloatingTree === "function") {
      return builder.readKnownPathForFloatingTree(this, path);
    }

    return null;
  }

  _syncReadFileViaApiForFloatingTree(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.legacyNodeApiFileBridge;

    if (bridge && typeof bridge.readFileSync === "function") {
      return bridge.readFileSync(path);
    }

    return null;
  }

  _safeFloatingTreeRootLabel(label) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.floatingTreeStoreBuilder;

    if (builder && typeof builder.safeFloatingTreeRootLabel === "function") {
      return builder.safeFloatingTreeRootLabel(label);
    }

    return String(label || "Project");
  }

  async _callOpenFloatingTreeForStore(rootId, store, label = "") {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.floatingTreeStoreBuilder;

    if (builder && typeof builder.callOpenFloatingTreeForStore === "function") {
      return await builder.callOpenFloatingTreeForStore(
        this,
        rootId,
        store,
        label
      );
    }

    if (typeof this.openFloatingTreeForStore === "function") {
      return await this.openFloatingTreeForStore(rootId, store);
    }

    return false;
  }

  _buildUnifiedTreeLauncherTitle() {
    const title = document.createElement('div');
    title.className = 'vibes-unified-tree-launcher-title';
    title.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:8px',
      'font:11px system-ui,sans-serif',
      'color:#aecaee',
      'letter-spacing:.02em',
    ].join(';');

    const label = document.createElement('div');
    label.textContent = 'Open trees';
    label.style.cssText = [
      'font-weight:750',
      'text-transform:uppercase',
      'font-size:10px',
      'opacity:.78',
    ].join(';');

    const model = document.createElement('div');
    model.textContent = 'Base: Vibes · plus Library · one App Folder';
    model.style.cssText = [
      'flex:1 1 auto',
      'opacity:.72',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis',
    ].join(';');

    title.append(label, model);
    return title;
  }

  async _openExternalAppFolderTree() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.floatingTreeStoreBuilder;

    if (builder && typeof builder.openExternalAppFolderTree === "function") {
      return await builder.openExternalAppFolderTree(this);
    }

    return false;
  }

  _installTreeLauncherCleanupStyles() {
    const id = 'vibes-tree-launcher-cleanup-styles';
    let style = document.getElementById(id);

    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }

    style.textContent = `
      .vibes-unified-floating-tree-launchers button[data-tree-launcher-role="base"] {
        background: rgba(120, 180, 255, 0.13) !important;
      }

      [data-vibes-demoted-tree-toolbar-button="true"] {
        display: none !important;
      }

      .vibes-unified-floating-tree-launchers {
        position: relative;
        z-index: 2;
      }
    `;

    return true;
  }

  _demoteLegacyTreeToolbarButtons(newLauncherRow = null) {
    const host = this._treeLauncherHost();

    if (!host || !host.querySelectorAll) {
      return 0;
    }

    const protectedButtons = new Set(
      Array.from(newLauncherRow?.querySelectorAll?.('button') || [])
    );

    const noisyNeedles = [
      'add folder root',
      'open folder root',
      'open folder',
      'floating tree',
      'tree walker',
      'walker',
      'add folder',
      'folder root',
    ];

    let count = 0;
    const buttons = Array.from(host.querySelectorAll('button'));

    for (const button of buttons) {
      if (protectedButtons.has(button)) continue;

      const text = String(button.textContent || button.title || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

      if (!text) continue;

      const noisy = noisyNeedles.some((needle) => text.includes(needle));

      if (!noisy) continue;

      button.dataset.vibesDemotedTreeToolbarButton = 'true';
      button.title =
        (button.title ? button.title + '\n\n' : '') +
        'Demoted by unified tree launcher. Use Vibes / Library / App Folder / Tools.';
      count++;
    }

    return count;
  }

  _treeLauncherHost() {
      return (
        this.rootElement ||
        this.container ||
        this.element ||
        this.sidebarContainer ||
        this.app?.sidebarContainer ||
        this.app?.leftPanel ||
        this.externalRootsHost ||
        null
      );
    }

  _focusBaseVibesTree() {
    const tree = this.fileTreeView;
    if (!tree) return false;

    const rootPath =
      '/' + String(this.app?.projectName || 'vibes').replace(/^\/+/, '');

    try {
      if (typeof tree.ensureNodeVisible === 'function') {
        tree.ensureNodeVisible(rootPath);
        return true;
      }

      const nodeEl =
        tree.container?.querySelector?.('[data-node-id="' + rootPath + '"]') ||
        tree.treeElement?.querySelector?.('[data-node-id="' + rootPath + '"]');

      if (nodeEl && typeof nodeEl.scrollIntoView === 'function') {
        nodeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return true;
      }
    } catch (error) {}

    return false;
  }

  _removeUnifiedFloatingTreeLauncherRow() {
      const roots = [
        this.rootElement,
        this.container,
        this.element,
        this.sidebarContainer,
        this.app?.sidebarContainer,
        document,
      ].filter(Boolean);

      let removed = 0;

      for (const root of roots) {
        if (!root.querySelectorAll) continue;

        const rows = root.querySelectorAll(
          '[data-vibes-unified-floating-tree-launchers]'
        );
        rows.forEach((row) => {
          row.remove();
          removed++;
        });
      }

      return removed;
    }



  _makeVibesProjectFloatingTreeStore(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const storeHelper = helpers.vibesProjectFloatingStore;

    if (
      storeHelper &&
      typeof storeHelper.makeVibesProjectFloatingTreeStore === "function"
    ) {
      return storeHelper.makeVibesProjectFloatingTreeStore(this, options);
    }

    return null;
  }

  _listVibesProjectPathsForFloatingTree(rootId = null) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const storeHelper = helpers.vibesProjectFloatingStore;

    if (
      storeHelper &&
      typeof storeHelper.listVibesProjectPathsForFloatingTree === "function"
    ) {
      return storeHelper.listVibesProjectPathsForFloatingTree(this, rootId);
    }

    return [];
  }

  _readVibesProjectPathForFloatingTree(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const storeHelper = helpers.vibesProjectFloatingStore;

    if (
      storeHelper &&
      typeof storeHelper.readVibesProjectPathForFloatingTree === "function"
    ) {
      return storeHelper.readVibesProjectPathForFloatingTree(this, path);
    }

    return null;
  }

  _writeVibesProjectPathForFloatingTree(path, content) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const storeHelper = helpers.vibesProjectFloatingStore;

    if (
      storeHelper &&
      typeof storeHelper.writeVibesProjectPathForFloatingTree === "function"
    ) {
      return storeHelper.writeVibesProjectPathForFloatingTree(
        this,
        path,
        content
      );
    }

    return false;
  }

  _deleteVibesProjectPathForFloatingTree(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const storeHelper = helpers.vibesProjectFloatingStore;

    if (
      storeHelper &&
      typeof storeHelper.deleteVibesProjectPathForFloatingTree === "function"
    ) {
      return storeHelper.deleteVibesProjectPathForFloatingTree(this, path);
    }

    return false;
  }

  _apiReadFileSyncForFloatingTree(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.legacyNodeApiFileBridge;

    if (bridge && typeof bridge.readFileSync === "function") {
      return bridge.readFileSync(path);
    }

    return null;
  }

  _apiWriteFileSyncForFloatingTree(path, content) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.legacyNodeApiFileBridge;

    if (bridge && typeof bridge.writeFileSync === "function") {
      return bridge.writeFileSync(path, content);
    }

    return false;
  }

  _apiDeleteFileSyncForFloatingTree(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.legacyNodeApiFileBridge;

    if (bridge && typeof bridge.deleteFileSync === "function") {
      return bridge.deleteFileSync(path);
    }

    return false;
  }

  _hideRedundantProjectFilesAndGlobalTreeButtons() {
      this._installSameTreeDialogCleanupStyles();

      const roots = [
        this.rootElement,
        this.container,
        this.element,
        this.sidebarContainer,
        this.app?.rootContainer,
        document.body,
      ].filter(Boolean);

      let hidden = 0;

      for (const root of roots) {
        if (!root.querySelectorAll) continue;

        const buttons = Array.from(root.querySelectorAll('button'));

        for (const button of buttons) {
          if (button.dataset.sameTreeDialogKeep === 'true') continue;
          if (!this._buttonTextLooksLikeRedundantTreeToolbar(button)) continue;

          button.dataset.sameTreeDialogHidden = 'true';
          hidden++;
        }
      }

      return hidden;
    }

  _installSameTreeDialogCleanupStyles() {
    const id = 'same-tree-dialog-cleanup-styles';
    let style = document.getElementById(id);

    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }

    style.textContent = `
      [data-same-tree-dialog-hidden="true"] {
        display: none !important;
      }

      [data-vibes-unified-floating-tree-launchers] {
        display: none !important;
      }

      .vibes-unified-floating-tree-launchers {
        display: none !important;
      }
    `;

    return true;
  }

  _buttonTextLooksLikeRedundantTreeToolbar(button) {
    const raw = [
      button.textContent || '',
      button.title || '',
      button.getAttribute?.('aria-label') || '',
    ].join(' ');

    const text = raw.toLowerCase().replace(/\s+/g, ' ').trim();

    if (!text) return false;

    const exactish = [
      'tree walker',
      'open folder',
      'open folder root',
      'add folder root',
      'floating tree',
      'project tree',
      'library tree',
      'app folder',
      'folder…',
      'folder...',
    ];

    return exactish.some((needle) => text.includes(needle));
  }

  collectPromptFilesAcrossOpenTrees(options = {}) {
      const helpers = this._ensureBreakdownHelpers?.() || {};
      const builder = helpers.promptBundleBuilder;

      if (
        builder &&
        typeof builder.collectPromptFilesAcrossOpenTrees === "function"
      ) {
        this.registerExistingFloatingTreeViewsForPromptBundle?.();

        return builder.collectPromptFilesAcrossOpenTrees({
          ...options,
          app: this.app,
          manager: this,
          // Explicitly omit baseTree, relying strictly on active tree views
          treeViews:
            typeof this.getFileTreeViews === "function"
              ? this.getFileTreeViews()
              : []
        });
      }

      return [];
    }

  _collectPromptFilesFromTreeView(treeView, treeInfo = {}, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.promptBundleBuilder;

    if (
      builder &&
      typeof builder.collectPromptFilesFromTreeView === "function"
    ) {
      return builder.collectPromptFilesFromTreeView(treeView, treeInfo, {
        ...options,
        app: this.app,
        manager: this
      });
    }

    return [];
  }

  _promptBundleWidgetState(node) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.promptBundleBuilder;

    if (builder && typeof builder.promptBundleWidgetState === "function") {
      return builder.promptBundleWidgetState(node);
    }

    return {
      code: false,
      signatures: false,
      docs: false,
      docsLevel: 0,
      codeLevel: 0
    };
  }

  _promptBundleStateIsSelected(state) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.promptBundleBuilder;

    if (builder && typeof builder.promptBundleStateIsSelected === "function") {
      return builder.promptBundleStateIsSelected(state);
    }

    return false;
  }

  async _readPromptBundleFileContent(path) {
    const key = String(path || "").trim();

    if (!key) {
      return null;
    }

    if (this.app?.commands && typeof this.app.commands.fetchFileContentForApp === "function") {
      const content = await this.app.commands.fetchFileContentForApp(key);
      if (typeof content === "string") {
        return content;
      }
      if (content && typeof content.code === "string") {
        return content.code;
      }
    }

    if (this.app?.projectFilesManager && typeof this.app.projectFilesManager.getFileContent === "function") {
      const content = await this.app.projectFilesManager.getFileContent(key);
      if (typeof content === "string") {
        return content;
      }
    }

    const vfs =
      this.app && typeof this.app.refreshVirtualFileSystemStores === "function"
        ? await this.app.refreshVirtualFileSystemStores()
        : this.app?.vfs || null;

    if (vfs && typeof vfs.readFile === "function") {
      const content = await vfs.readFile(key, {
        nullOnMissing: true
      });

      if (typeof content === "string") {
        return content;
      }
    }

    const rootId = "/" + key.split("/").filter(Boolean)[0];
    const store = this.app?.workspaceFileStores?.get?.(rootId);
    const fromStore = this._readPromptBundleFileFromStore(store, key);

    if (typeof fromStore === "string") {
      return fromStore;
    }

    const memoryStore = this.app?.inMemoryFileStore;
    const fromMemory = this._readPromptBundleFileFromStore(memoryStore, key);

    if (typeof fromMemory === "string") {
      return fromMemory;
    }

    return null;
  }

  _readPromptBundleFileFromStore(store, path) {
    if (!store || !path) {
      return null;
    }

    const variants = this._staticMigrationPathVariants(path);

    for (const candidate of variants) {
      try {
        if (typeof store.has === "function" && !store.has(candidate)) {
          continue;
        }

        if (typeof store.get === "function") {
          const value = store.get(candidate);
          if (typeof value === "string") {
            return value;
          }
          if (value && typeof value.content === "string") {
            return value.content;
          }
        }

        if (Object.prototype.hasOwnProperty.call(store, candidate)) {
          const value = store[candidate];
          if (typeof value === "string") {
            return value;
          }
          if (value && typeof value.content === "string") {
            return value.content;
          }
        }
      } catch (error) {}
    }

    return null;
  }

  _readPromptBundleFileFromApiSync(path) {
    return null;
  }

  async buildPromptBundleAcrossOpenTrees(options = {}) {
      const helpers = this._ensureBreakdownHelpers?.() || {};
      const builder = helpers.promptBundleBuilder;

      if (
        builder &&
        typeof builder.buildPromptBundleAcrossOpenTrees === "function"
      ) {
        this.registerExistingFloatingTreeViewsForPromptBundle?.();

        return await builder.buildPromptBundleAcrossOpenTrees({
          ...options,
          app: this.app,
          manager: this,
          treeViews:
            typeof this.getFileTreeViews === "function"
              ? this.getFileTreeViews()
              : []
        });
      }

      return {
        generatedAt: new Date().toISOString(),
        projectName: this.app?.projectName || "",
        sourceProjectName: this.app?.sourceProjectName || "",
        buildPromptText: "",
        outputText: "",
        files: [],
        text: "// No selected files found across open trees.\n"
      };
    }

  async _getCurrentBuildPromptTextForBundle() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.promptBundleBuilder;

    if (
      builder &&
      typeof builder.getCurrentBuildPromptTextForBundle === "function"
    ) {
      return await builder.getCurrentBuildPromptTextForBundle({
        app: this.app,
        manager: this
      });
    }

    return "";
  }

  _getCurrentPromptOutputTextForBundle() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.promptBundleBuilder;

    if (
      builder &&
      typeof builder.getCurrentPromptOutputTextForBundle === "function"
    ) {
      return builder.getCurrentPromptOutputTextForBundle({
        app: this.app,
        manager: this
      });
    }

    return "";
  }

  _formatPromptBundleAcrossOpenTrees(bundle = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.promptBundleBuilder;

    if (
      builder &&
      typeof builder.formatPromptBundleAcrossOpenTrees === "function"
    ) {
      return builder.formatPromptBundleAcrossOpenTrees(bundle);
    }

    return "// No selected files found across open trees.\n";
  }

  async copyPromptBundleAcrossOpenTrees(options = {}) {
      const helpers = this._ensureBreakdownHelpers?.() || {};
      const builder = helpers.promptBundleBuilder;

      if (
        builder &&
        typeof builder.copyPromptBundleAcrossOpenTrees === "function"
      ) {
        this.registerExistingFloatingTreeViewsForPromptBundle?.();

        return await builder.copyPromptBundleAcrossOpenTrees({
          ...options,
          app: this.app,
          manager: this,
          // Explicitly omit baseTree, relying strictly on active tree views
          treeViews:
            typeof this.getFileTreeViews === "function"
              ? this.getFileTreeViews()
              : []
        });
      }

      const bundle = await this.buildPromptBundleAcrossOpenTrees(options);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(bundle.text);
      }

      return bundle;
    }

  async openBrowserWebRootFromPicker(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.openBrowserWebRootFromPicker === "function") {
      return await opener.openBrowserWebRootFromPicker({
        ...options,
        manager: this
      });
    }

    return {
      ok: false,
      reason: "ProjectBrowserWebRootOpener unavailable"
    };
  }

  _rememberBrowserWebRootHandle(webHandle) {
    this.browserWebRootHandle = webHandle;

    if (!this.app.browserWebRootHandles) {
      this.app.browserWebRootHandles = new Map();
    }

    this.app.browserWebRootHandles.set('web', webHandle);

    if (!this.app.workspaceRoots) {
      this.app.workspaceRoots = new Map();
    }

    this.app.workspaceRoots.set('browser-web-root', {
      kind: 'browser-directory-handle',
      name: webHandle.name,
      handle: webHandle,
      visibleTreeRoots: ['/vibes', '/library'],
    });

    return true;
  }

  async _openBrowserWebRootSubtree(webRootHandle, folderName, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.openBrowserWebRootSubtree === "function") {
      return await opener.openBrowserWebRootSubtree(webRootHandle, folderName, {
        ...options,
        manager: this
      });
    }

    return {
      ok: false,
      reason: "ProjectBrowserWebRootOpener unavailable"
    };
  }

  async _openBrowserWebRootDefaults(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.openBrowserWebRootDefaults === "function") {
      return await opener.openBrowserWebRootDefaults({
        ...options,
        manager: this
      });
    }

    return {
      opened: [],
      failed: [],
      reason: "ProjectBrowserWebRootOpener unavailable"
    };
  }

  async _chooseBrowserWebRootAppFolder(folders = []) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.chooseBrowserWebRootAppFolder === "function") {
      return await opener.chooseBrowserWebRootAppFolder(folders);
    }

    return "";
  }

  async _listBrowserWebRootSubfolders(webRootHandle) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.listBrowserWebRootSubfolders === "function") {
      return await opener.listBrowserWebRootSubfolders(webRootHandle);
    }

    return [];
  }

  async _ensureLocalDirectoryStoreForBrowserRoot() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (
      opener &&
      typeof opener.ensureLocalDirectoryStoreForBrowserRoot === "function"
    ) {
      return await opener.ensureLocalDirectoryStoreForBrowserRoot(this);
    }

    throw new Error("ProjectBrowserWebRootOpener unavailable");
  }

  async _openBrowserRootStoreAsTree(rootId, store, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.openBrowserRootStoreAsTree === "function") {
      return await opener.openBrowserRootStoreAsTree(rootId, store, {
        ...options,
        manager: this
      });
    }

    return {
      ok: false,
      rootId: rootId || null,
      reason: "ProjectBrowserWebRootOpener unavailable"
    };
  }

  _browserRootStatus(message, isError = false) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.browserRootStatus === "function") {
      return opener.browserRootStatus(this, message, isError);
    }

    console[isError ? "error" : "log"]("[BrowserWebRootMode] " + message);
    return true;
  }

  _installBrowserWebRootModeHook() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controls = helpers.browserWorkspaceStartupControls;

    if (
      controls &&
      typeof controls.installBrowserWebRootModeHook === "function"
    ) {
      return controls.installBrowserWebRootModeHook(this);
    }

    return false;
  }

  async openBrowserWebRootWorkspace(webRootHandle, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.openBrowserWebRootWorkspace === "function") {
      return await opener.openBrowserWebRootWorkspace(webRootHandle, {
        ...options,
        manager: this
      });
    }

    return {
      ok: false,
      reason: "ProjectBrowserWebRootOpener unavailable"
    };
  }

  async _openBrowserWebRootVisibleTrees(webRootHandle, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.openBrowserWebRootVisibleTrees === "function") {
      return await opener.openBrowserWebRootVisibleTrees(webRootHandle, {
        ...options,
        manager: this
      });
    }

    return {
      ok: false,
      reason: "ProjectBrowserWebRootOpener unavailable"
    };
  }

  _removeAccidentalVisibleWebRootTree() {
    if (
      !this.fileTreeViews ||
      typeof this.fileTreeViews.forEach !== 'function'
    ) {
      return { removed: 0, reason: 'no fileTreeViews set' };
    }

    const remove = [];

    this.fileTreeViews.forEach((treeView) => {
      if (this._isAccidentalWebRootTreeView(treeView)) {
        remove.push(treeView);
      }
    });

    for (const treeView of remove) {
      try {
        if (typeof this.unregisterFileTreeView === 'function') {
          this.unregisterFileTreeView(treeView);
        } else {
          this.fileTreeViews.delete(treeView);
        }

        const host =
          treeView.container?.closest?.('.floating-panel-host') ||
          treeView.container?.closest?.('.dialog-box') ||
          treeView.container?.parentElement ||
          null;

        if (host && typeof host.remove === 'function') {
          host.remove();
        }
      } catch (error) {}
    }

    return {
      removed: remove.length,
      visibleTreeRoots: this._floatingTreeRootNames(),
    };
  }

  _isAccidentalWebRootTreeView(treeView) {
    if (!treeView || !treeView.nodesMap) return false;

    const rootKeys = Array.from(treeView.nodesMap.keys()).filter((path) => {
      return String(path).split('/').filter(Boolean).length === 1;
    });

    if (rootKeys.length !== 1) return false;

    const root = rootKeys[0];

    if (root === '/web') return true;

    if (root.toLowerCase && root.toLowerCase() === '/web') return true;

    return false;
  }

  _floatingTreeRootNames() {
    const names = [];

    const addTree = (treeView) => {
      if (!treeView || !treeView.nodesMap) return;

      const roots = Array.from(treeView.nodesMap.keys()).filter((path) => {
        return String(path).split('/').filter(Boolean).length === 1;
      });

      for (const root of roots) {
        if (!names.includes(root)) names.push(root);
      }
    };

    addTree(this.fileTreeView);

    if (this.fileTreeViews) {
      this.fileTreeViews.forEach((treeView) => addTree(treeView));
    }

    return names.sort();
  }



  // Delete resizer and wide view methods by omitting them during our modify operation.
    // The AST diff engine will safely preserve all other active class methods.







  showWorkspaceTreesManager(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (
      treeManager &&
      typeof treeManager.showWorkspaceTreesManager === "function"
    ) {
      return treeManager.showWorkspaceTreesManager({
        ...options,
        manager: this
      });
    }

    return {
      ok: false,
      reason: "ProjectWorkspaceTreesManager unavailable"
    };
  }

  _renderWorkspaceTreesManager() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (
      treeManager &&
      typeof treeManager.renderWorkspaceTreesManager === "function"
    ) {
      return treeManager.renderWorkspaceTreesManager(this);
    }

    return false;
  }

  _workspaceTreesManagerRecords() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (
      treeManager &&
      typeof treeManager.workspaceTreesManagerRecords === "function"
    ) {
      return treeManager.workspaceTreesManagerRecords(this);
    }

    return [];
  }

  _workspaceTreesManagerRootNamesForTree(treeView) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (
      treeManager &&
      typeof treeManager.workspaceTreesManagerRootNamesForTree === "function"
    ) {
      return treeManager.workspaceTreesManagerRootNamesForTree(treeView);
    }

    return [];
  }

  _workspaceTreesManagerLabelForTree(treeView, roots = [], kind = "") {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (
      treeManager &&
      typeof treeManager.workspaceTreesManagerLabelForTree === "function"
    ) {
      return treeManager.workspaceTreesManagerLabelForTree(treeView, roots, kind);
    }

    if (roots.length === 1) return roots[0];
    if (roots.length > 1) return roots.join(" + ");
    if (kind === "main") return "Legacy embedded tree";
    return "Floating tree";
  }

  _workspaceTreesManagerKindForTree(treeView) {
      return "floating";
    }

  _workspaceTreesManagerStoreForRoot(rootId) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (
      treeManager &&
      typeof treeManager.workspaceTreesManagerStoreForRoot === "function"
    ) {
      return treeManager.workspaceTreesManagerStoreForRoot(this, rootId);
    }

    return null;
  }

  _focusWorkspaceTree(recordId) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (treeManager && typeof treeManager.focusWorkspaceTree === "function") {
      return treeManager.focusWorkspaceTree(this, recordId);
    }

    return false;
  }

  _closeWorkspaceTree(recordId) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (treeManager && typeof treeManager.closeWorkspaceTree === "function") {
      return treeManager.closeWorkspaceTree(this, recordId);
    }

    return false;
  }

  _closeDuplicateWorkspaceTrees() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (
      treeManager &&
      typeof treeManager.closeDuplicateWorkspaceTrees === "function"
    ) {
      return treeManager.closeDuplicateWorkspaceTrees(this);
    }

    return {
      closed: 0,
      labels: [],
      reason: "ProjectWorkspaceTreesManager unavailable"
    };
  }

  _installWorkspaceTreesManagerStyles() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const treeManager = helpers.workspaceTreesManager;

    if (
      treeManager &&
      typeof treeManager.installWorkspaceTreesManagerStyles === "function"
    ) {
      return treeManager.installWorkspaceTreesManagerStyles();
    }

    return {
      ok: false,
      reason: "ProjectWorkspaceTreesManager unavailable"
    };
  }

  _installWorkspaceTreesManagerHook() {
    const app = this.app || window._dev_projectEditorInstance || window.app || null;

    if (app) {
      if (!app.browserWebRootMode) {
        app.browserWebRootMode = {};
      }

      app.browserWebRootMode.showTrees = () => this.showWorkspaceTreesManager();
      app.browserWebRootMode.closeDuplicateTrees = () =>
        this._closeDuplicateWorkspaceTrees();

      if (typeof this.cleanupBrowserWorkspaceUi === 'function') {
        app.browserWebRootMode.cleanupUi = () =>
          this.cleanupBrowserWorkspaceUi();
      }
    }

    window.showWorkspaceTreesManager = () => this.showWorkspaceTreesManager();
    window.closeDuplicateWorkspaceTrees = () =>
      this._closeDuplicateWorkspaceTrees();

    return true;
  }

  removeInternalWebRootTreeNow() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (policy && typeof policy.removeInternalWebRootTreeNow === "function") {
      return policy.removeInternalWebRootTreeNow({
        manager: this
      });
    }

    return {
      ok: false,
      reason: "ProjectWorkspaceTreePolicy unavailable"
    };
  }

  _isInternalWebRootKey(key) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (policy && typeof policy.isInternalWebRootKey === "function") {
      return policy.isInternalWebRootKey(key);
    }

    const clean = String(key || "")
      .replaceAll("\\", "/")
      .toLowerCase()
      .trim();

    return clean === "/web" || clean === "web";
  }

  _installInternalWebRootAutoCleanup() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controls = helpers.browserWorkspaceStartupControls;

    if (
      controls &&
      typeof controls.installInternalWebRootAutoCleanup === "function"
    ) {
      return controls.installInternalWebRootAutoCleanup(this);
    }

    return {
      ok: false,
      reason: "ProjectBrowserWorkspaceStartupControls unavailable"
    };
  }

  browserWorkspacePolicyDiskSeed() {
    return {
      ok: true,
      label: 'Browser workspace policy disk seed',
      purpose: 'Proves ProjectFilesManager.js was actually patched on disk.',
      generatedAt: 'runtime-generated-by-ProveDiskWriteAndPersistPolicySeedV1',
    };
  }

  enforceBrowserWorkspaceTreePolicy(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.enforceBrowserWorkspaceTreePolicy === "function"
    ) {
      return policy.enforceBrowserWorkspaceTreePolicy({
        ...options,
        manager: this
      });
    }

    return {
      ok: false,
      reason: "ProjectWorkspaceTreePolicy unavailable"
    };
  }

  _isInternalBrowserRootKey(key) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (policy && typeof policy.isInternalBrowserRootKey === "function") {
      return policy.isInternalBrowserRootKey(key);
    }

    return this._isInternalWebRootKey(key);
  }

  _removeInternalBrowserRootStore() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.removeInternalBrowserRootStore === "function"
    ) {
      return policy.removeInternalBrowserRootStore(this);
    }

    return {
      removed: [],
      reason: "ProjectWorkspaceTreePolicy unavailable"
    };
  }

  _removeInternalBrowserRootTrees() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.removeInternalBrowserRootTrees === "function"
    ) {
      return policy.removeInternalBrowserRootTrees(this);
    }

    return {
      removed: [],
      reason: "ProjectWorkspaceTreePolicy unavailable"
    };
  }

  _hideStartupServerProjectTree() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.hideStartupServerProjectTree === "function"
    ) {
      return policy.hideStartupServerProjectTree(this);
    }

    return {
      skipped: true,
      reason: "ProjectWorkspaceTreePolicy unavailable"
    };
  }

  _treeRootsForPolicy(treeView) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (policy && typeof policy.treeRootsForPolicy === "function") {
      return policy.treeRootsForPolicy(treeView);
    }

    return [];
  }

  _treeHasBrowserStoreForPolicy(treeView) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.treeHasBrowserStoreForPolicy === "function"
    ) {
      return policy.treeHasBrowserStoreForPolicy(treeView);
    }

    return false;
  }

  _removeTreeViewForPolicy(treeView) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (policy && typeof policy.removeTreeViewForPolicy === "function") {
      return policy.removeTreeViewForPolicy(this, treeView);
    }

    return false;
  }

  suppressAllStartupProjectTrees(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.suppressAllStartupProjectTrees === "function"
    ) {
      return policy.suppressAllStartupProjectTrees({
        ...options,
        manager: this
      });
    }

    return {
      ok: false,
      reason: "ProjectWorkspaceTreePolicy unavailable"
    };
  }

  _isVibesEditorShellStartup() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.isVibesEditorShellStartup === "function"
    ) {
      return policy.isVibesEditorShellStartup(this);
    }

    return false;
  }

  _hideProjectSidebarSurface() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.hideProjectSidebarSurface === "function"
    ) {
      return policy.hideProjectSidebarSurface(this);
    }

    return {
      hidden: [],
      reason: "ProjectWorkspaceTreePolicy unavailable"
    };
  }

  _removeAllInternalWebRootStoresAndTrees() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.removeAllInternalWebRootStoresAndTrees === "function"
    ) {
      return policy.removeAllInternalWebRootStoresAndTrees(this);
    }

    return {
      removedStores: [],
      removedTrees: [],
      reason: "ProjectWorkspaceTreePolicy unavailable"
    };
  }

  _removeAllServerBackedStartupTrees() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const policy = helpers.workspaceTreePolicy;

    if (
      policy &&
      typeof policy.removeAllServerBackedStartupTrees === "function"
    ) {
      return policy.removeAllServerBackedStartupTrees(this);
    }

    return {
      hiddenMain: [],
      removed: [],
      reason: "ProjectWorkspaceTreePolicy unavailable"
    };
  }

  _treeRootsForStartupSuppression(treeView) {
    return this._treeRootsForPolicy(treeView);
  }

  _treeHasBrowserStoreForStartupSuppression(treeView) {
    return this._treeHasBrowserStoreForPolicy(treeView);
  }

  _removeTreeViewForStartupSuppression(treeView) {
    return this._removeTreeViewForPolicy(treeView);
  }

  installBrowserWorkspaceStartupControls() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controls = helpers.browserWorkspaceStartupControls;

    if (
      controls &&
      typeof controls.installBrowserWorkspaceStartupControls === "function"
    ) {
      return controls.installBrowserWorkspaceStartupControls({
        manager: this
      });
    }

    return {
      ok: false,
      reason: "ProjectBrowserWorkspaceStartupControls unavailable"
    };
  }

  _ensureBrowserWorkspaceLauncherButton() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controls = helpers.browserWorkspaceStartupControls;

    if (
      controls &&
      typeof controls.ensureBrowserWorkspaceLauncherButton === "function"
    ) {
      return controls.ensureBrowserWorkspaceLauncherButton(this);
    }

    return {
      ok: false,
      reason: "ProjectBrowserWorkspaceStartupControls unavailable"
    };
  }

  _browserWorkspaceLauncherHost() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controls = helpers.browserWorkspaceStartupControls;

    if (
      controls &&
      typeof controls.browserWorkspaceLauncherHost === "function"
    ) {
      return controls.browserWorkspaceLauncherHost(this);
    }

    return this.app?.mainContentContainer || document.body || null;
  }

  _hideObsoleteGlobalToolbarButtons() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controls = helpers.browserWorkspaceStartupControls;

    if (
      controls &&
      typeof controls.hideObsoleteGlobalToolbarButtons === "function"
    ) {
      return controls.hideObsoleteGlobalToolbarButtons(this);
    }

    return {
      hidden: [],
      reason: "ProjectBrowserWorkspaceStartupControls unavailable"
    };
  }

  _looksLikeObsoleteGlobalToolbarButton(el) {
    if (!el) return false;

    if (el.id === "openBrowserWorkspaceBtn") {
      return false;
    }

    if (el.closest && el.closest("#openBrowserWorkspaceBtn")) {
      return false;
    }

    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controls = helpers.browserWorkspaceStartupControls;

    if (
      controls &&
      typeof controls.looksLikeObsoleteGlobalToolbarButton === "function"
    ) {
      return controls.looksLikeObsoleteGlobalToolbarButton(this, el);
    }

    return false;
  }

  _neutralizeObsoleteToolbarElement(el) {
    if (!el) return false;

    if (el.id === "openBrowserWorkspaceBtn") {
      return false;
    }

    if (el.closest && el.closest("#openBrowserWorkspaceBtn")) {
      return false;
    }

    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controls = helpers.browserWorkspaceStartupControls;

    if (
      controls &&
      typeof controls.neutralizeObsoleteToolbarElement === "function"
    ) {
      return controls.neutralizeObsoleteToolbarElement(this, el);
    }

    return false;
  }

  _loadClassicScriptForBrowserRoot(src) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.loadClassicScriptForBrowserRoot === "function") {
      return opener.loadClassicScriptForBrowserRoot(src);
    }

    return Promise.reject(
      new Error("ProjectBrowserWebRootOpener unavailable")
    );
  }

  _browserRootSafeLabel(value) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const opener = helpers.browserWebRootOpener;

    if (opener && typeof opener.browserRootSafeLabel === "function") {
      return opener.browserRootSafeLabel(value);
    }

    return String(value || "Workspace");
  }


  _closeConnectedWorkspaceManagerDialogs() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const cleanup = helpers.browserWorkspaceCleanup;

    if (
      cleanup &&
      typeof cleanup.closeConnectedWorkspaceManagerDialogs === "function"
    ) {
      return cleanup.closeConnectedWorkspaceManagerDialogs();
    }

    return {
      removed: [],
      reason: "ProjectBrowserWorkspaceCleanup unavailable"
    };
  }


  _compactFloatingTreeToolbarButtons() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const cleanup = helpers.browserWorkspaceCleanup;

    if (
      cleanup &&
      typeof cleanup.compactFloatingTreeToolbarButtons === "function"
    ) {
      return cleanup.compactFloatingTreeToolbarButtons();
    }

    return {
      touched: [],
      reason: "ProjectBrowserWorkspaceCleanup unavailable"
    };
  }


  _isConnectedWorkspaceDialogElement(dialog) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const cleanup = helpers.browserWorkspaceCleanup;

    if (
      cleanup &&
      typeof cleanup.isConnectedWorkspaceDialogElement === "function"
    ) {
      return cleanup.isConnectedWorkspaceDialogElement(dialog);
    }

    return false;
  }

  _buttonTextForChromeCleanup(button) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const cleanup = helpers.browserWorkspaceCleanup;

    if (
      cleanup &&
      typeof cleanup.buttonTextForChromeCleanup === "function"
    ) {
      return cleanup.buttonTextForChromeCleanup(button);
    }

    return [
      button?.textContent || "",
      button?.getAttribute?.("title") || "",
      button?.getAttribute?.("aria-label") || ""
    ]
      .join(" ")
      .toLowerCase()
      .trim();
  }

  async rebuildBrowserBackedVibesTree() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.floatingTreeStoreDialogController;

    if (
      controller &&
      typeof controller.rebuildBrowserBackedVibesTree === "function"
    ) {
      return await controller.rebuildBrowserBackedVibesTree(this);
    }

    return {
      ok: false,
      reason: "ProjectFloatingTreeStoreDialogController unavailable"
    };
  }

  _browserStoreFileCount(store) {
    if (!store) return 0;

    if (store.files instanceof Map) return store.files.size;
    if (store.fileMap instanceof Map) return store.fileMap.size;
    if (store.cache instanceof Map) return store.cache.size;
    if (store._files instanceof Map) return store._files.size;
    if (store._fileMap instanceof Map) return store._fileMap.size;

    if (typeof store.keys === 'function') {
      try {
        const keys = store.keys();
        if (Array.isArray(keys)) return keys.length;
      } catch (error) {}
    }

    if (typeof store.entries === 'function') {
      try {
        const entries = store.entries();
        if (Array.isArray(entries)) return entries.length;
      } catch (error) {}
    }

    return 0;
  }

  _browserStoreRootIds() {
    if (!this.app?.workspaceFileStores) return [];

    return Array.from(this.app.workspaceFileStores.entries()).map(
      ([key, store]) => ({
        key,
        className: store?.constructor?.name || '',
        projectName:
          store?._projectName || store?.projectName || store?.name || '',
        count: this._browserStoreFileCount(store),
      })
    );
  }

  _treeViewRootIdsForForceFix(treeView) {
    const roots = [];

    if (!treeView) return roots;

    if (treeView.rootId) roots.push(treeView.rootId);
    if (treeView._rootId) roots.push(treeView._rootId);
    if (treeView.rootPath) roots.push(treeView.rootPath);
    if (treeView._rootPath) roots.push(treeView._rootPath);

    if (treeView.nodesMap instanceof Map) {
      for (const key of treeView.nodesMap.keys()) {
        const clean = String(key || '');
        const parts = clean.split('/').filter(Boolean);
        if (parts.length > 0) {
          roots.push('/' + parts[0]);
          break;
        }
      }
    }

    return Array.from(new Set(roots.filter(Boolean)));
  }

  _removeFloatingTreesByRootIdForce(rootId) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.floatingTreeStoreDialogController;

    if (
      controller &&
      typeof controller.removeFloatingTreesByRootIdForce === "function"
    ) {
      return controller.removeFloatingTreesByRootIdForce(this, rootId);
    }

    return [];
  }

  async _openStoreTreeForce(rootId, store, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.floatingTreeStoreDialogController;

    if (controller && typeof controller.openStoreTreeForce === "function") {
      return await controller.openStoreTreeForce(this, rootId, store, options);
    }

    return {
      ok: false,
      reason: "ProjectFloatingTreeStoreDialogController unavailable"
    };
  }

  registerExistingFloatingTreeViewsForPromptBundle() {
    const state =
      typeof this._ensureFloatingFileTreeState === 'function'
        ? this._ensureFloatingFileTreeState()
        : null;

    const registered = [];
    const skipped = [];

    if (!state || !state.trees || typeof state.trees.forEach !== 'function') {
      return {
        ok: true,
        registered,
        skipped,
        registeredCount: 0,
        reason: 'No floating tree state.',
      };
    }

    state.trees.forEach((record, rootId) => {
      const treeView = record?.treeView || record?.host?.treeView || null;

      if (!treeView) {
        skipped.push({
          rootId,
          reason: 'No treeView on floating tree record.',
        });
        return;
      }

      this.registerFileTreeView(treeView);

      registered.push({
        rootId,
        nodeCount: treeView.nodesMap?.size || 0,
      });
    });

    return {
      ok: true,
      registered,
      skipped,
      registeredCount: registered.length,
    };
  }

  _visibilityPathPieces(path) {
    return String(path || '')
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  _visibilityPathAliasesForPath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (
      controller &&
      typeof controller.visibilityPathAliasesForPath === "function"
    ) {
      return controller.visibilityPathAliasesForPath(this, path);
    }

    return new Set();
  }

  _visibilityPathAliasesForNode(node) {
    const aliases = new Set();

    const candidates = [
      node?.id,
      node?.path,
      node?.filePath,
      node?.fullPath,
      node?.goldenPath,
      node?.data?.id,
      node?.data?.path,
      node?.data?.filePath,
      node?.data?.fullPath,
    ];

    for (const candidate of candidates) {
      for (const alias of this._visibilityPathAliasesForPath(candidate)) {
        aliases.add(alias);
      }
    }

    return aliases;
  }

  _visibilityBuildSettingsAliasMap(settings) {
    const aliasMap = new Map();
    const rawSettings = settings || {};

    for (const [path, state] of Object.entries(rawSettings)) {
      for (const alias of this._visibilityPathAliasesForPath(path)) {
        if (!aliasMap.has(alias)) {
          aliasMap.set(alias, {
            path,
            state,
          });
        }
      }
    }

    return aliasMap;
  }

  _visibilityResolveSettingForNode(node, aliasMap) {
    if (!node || !aliasMap) return null;

    const aliases = this._visibilityPathAliasesForNode(node);

    for (const alias of aliases) {
      if (aliasMap.has(alias)) {
        return aliasMap.get(alias);
      }
    }

    return null;
  }

  _visibilityFindNodeAcrossTrees(path) {
    const aliases = this._visibilityPathAliasesForPath(path);
    const views =
      typeof this.getFileTreeViews === 'function'
        ? this.getFileTreeViews()
        : this.fileTreeView
        ? [this.fileTreeView]
        : [];

    for (const treeView of views) {
      if (!treeView?.nodesMap) continue;

      for (const alias of aliases) {
        if (treeView.nodesMap.has(alias)) {
          return treeView.nodesMap.get(alias);
        }
      }

      for (const node of treeView.nodesMap.values()) {
        const nodeAliases = this._visibilityPathAliasesForNode(node);

        for (const alias of aliases) {
          if (nodeAliases.has(alias)) {
            return node;
          }
        }
      }
    }

    return null;
  }

  _visibilityEnsureNodesForSettings(settings) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (
      controller &&
      typeof controller.visibilityEnsureNodesForSettings === "function"
    ) {
      return controller.visibilityEnsureNodesForSettings(this, settings);
    }

    return {
      requested: 0,
      alreadyFound: 0,
      created: 0,
      stillMissing: settings && typeof settings === "object"
        ? Object.keys(settings)
        : []
    };
  }

  _installOpenDirectoriesStyles() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const launcher = helpers.floatingTreeLauncher;

    if (launcher && typeof launcher.installOpenDirectoriesStyles === "function") {
      return launcher.installOpenDirectoriesStyles();
    }

    return false;
  }

  getTreeIdentity(treeView) {
      const helpers = this._ensureBreakdownHelpers?.() || {};
      const coordinator = helpers.visibilityCoordinator;

      if (
        coordinator &&
        typeof coordinator.getTreeIdentity === "function"
      ) {
        return coordinator.getTreeIdentity(treeView);
      }

      return {
        id: "tree-unknown",
        rootId: "",
        label: "File tree",
        displayName: "File tree",
        className: "FileTreeView",
        elementId: "",
        widgetCount: 0,
        hasStore: false,
        isMainTree: false, // Legacy main tree unmounted
        isFloatingTree: false,
        optionKeys: []
      };
    }

  getTreeDisplayName(treeView) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const coordinator = helpers.visibilityCoordinator;

    if (
      coordinator &&
      typeof coordinator.getTreeDisplayName === "function"
    ) {
      return coordinator.getTreeDisplayName(treeView);
    }

    if (treeView === this.fileTreeView) return "Main project tree";
    return "File tree";
  }

  getTreeRootId(treeView) {
    const tree = treeView || null;
    const options =
      tree && tree.options && typeof tree.options === 'object'
        ? tree.options
        : {};
    const store =
      options.store ||
      options.fileStore ||
      (tree && (tree.store || tree.fileStore)) ||
      null;

    const candidates = [
      options.rootId,
      options.workspaceRootId,
      options.storeRootId,
      options.projectRootId,
      tree && tree.rootId,
      tree && tree.workspaceRootId,
      tree && tree.storeRootId,
      store && store.rootId,
      store && store.id,
      store && store.name,
      store && store.folderName,
    ];

    for (const value of candidates) {
      if (value != null && String(value).trim()) {
        return String(value).trim();
      }
    }

    if (this.fileTreeView && tree === this.fileTreeView) {
      return 'main';
    }

    return '';
  }

  describeFileTreeViews() {
      const helpers = this._ensureBreakdownHelpers?.() || {};
      const fileTreeRegistry = helpers.fileTreeRegistry;

      const describeOne = (treeView, index) => {
        const identity =
          typeof this.getTreeIdentity === "function"
            ? this.getTreeIdentity(treeView)
            : {};

        return {
          index,
          id: identity.id || "",
          label: identity.label || identity.displayName || "File tree",
          displayName: identity.displayName || identity.label || "File tree",
          rootId: identity.rootId || "",
          className: identity.className || treeView?.constructor?.name || "",
          elementId: identity.elementId || "",
          widgetCount: Number(identity.widgetCount || 0),
          hasStore: !!identity.hasStore,
          isMainTree: false,
          isFloatingTree: !!identity.isFloatingTree,
          optionKeys: Array.isArray(identity.optionKeys)
            ? identity.optionKeys
            : []
        };
      };

      if (
        fileTreeRegistry &&
        typeof fileTreeRegistry.describeFileTreeViews === "function"
      ) {
        return fileTreeRegistry.describeFileTreeViews({
          describeOne
        });
      }

      const views =
        typeof this.getFileTreeViews === "function"
          ? this.getFileTreeViews()
          : [];

      return views.map((treeView, index) => describeOne(treeView, index));
    }

  _treeIdentityString(parts) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const coordinator = helpers.visibilityCoordinator;

    if (
      coordinator &&
      typeof coordinator.treeIdentityString === "function"
    ) {
      return coordinator.treeIdentityString(parts);
    }

    const input = parts && typeof parts === "object" ? parts : {};
    const raw = [
      input.rootId || "",
      input.label || "",
      input.elementId || "",
      input.className || ""
    ].join("|");

    let hash = 0;

    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }

    const positive = Math.abs(hash).toString(36);
    return "tree-" + positive;
  }

  _safeTreeOptionValue(value) {
    if (value == null) return '';

    const type = typeof value;

    if (type === 'string' || type === 'number' || type === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return '[array:' + value.length + ']';
    }

    if (type === 'object') {
      const ctor =
        value.constructor && value.constructor.name
          ? value.constructor.name
          : 'object';
      return '[' + ctor + ']';
    }

    return '[' + type + ']';
  }

  normalizeVisibilityState(state) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const coordinator = helpers.visibilityCoordinator;

    if (
      coordinator &&
      typeof coordinator.normalizeVisibilityState === "function"
    ) {
      return coordinator.normalizeVisibilityState(state);
    }

    const input = state && typeof state === "object" ? state : {};

    let codeLevel = Number(input.codeLevel);
    if (!Number.isFinite(codeLevel)) {
      codeLevel = input.code ? 4 : 0;
    }

    if (codeLevel < 0) codeLevel = 0;
    if (codeLevel > 4) codeLevel = 4;

    let docsLevel = Number(input.docsLevel);
    if (!Number.isFinite(docsLevel)) {
      docsLevel = input.docs ? 4 : 0;
    }

    if (docsLevel < 0) docsLevel = 0;
    if (docsLevel > 4) docsLevel = 4;

    const signatures = !!(input.signatures || input.sig);
    const code = !!input.code || codeLevel > 0;
    const docs = !!input.docs || docsLevel > 0;

    return {
      code,
      codeLevel: code ? codeLevel || 4 : 0,
      sig: signatures,
      signatures,
      docs,
      docsLevel: docs ? docsLevel || 4 : 0
    };
  }

  normalizeVisibilitySet(setOrSpec, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const coordinator = helpers.visibilityCoordinator;

    if (
      coordinator &&
      typeof coordinator.normalizeVisibilitySet === "function"
    ) {
      return coordinator.normalizeVisibilitySet(setOrSpec, options);
    }

    const input = setOrSpec && typeof setOrSpec === "object" ? setOrSpec : {};
    const name = String(
      input.name || options.name || "Unnamed Visibility Set"
    ).trim();

    const normalized = {
      id: input.id || "",
      name,
      description: input.description || "",
      scope: input.scope || options.scope || "workspace",
      resetFirst: input.resetFirst !== false,
      files: {},
      patterns: Array.isArray(input.patterns) ? input.patterns.slice() : []
    };

    const files =
      input.files && typeof input.files === "object" ? input.files : {};

    for (const path of Object.keys(files)) {
      normalized.files[path] = this.normalizeVisibilityState(files[path]);
    }

    return normalized;
  }

  getVisibilityWidgetsForTree(treeView) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const coordinator = helpers.visibilityCoordinator;

    if (
      coordinator &&
      typeof coordinator.getVisibilityWidgetsForTree === "function"
    ) {
      return coordinator.getVisibilityWidgetsForTree(treeView);
    }

    if (!treeView) return [];

    if (typeof treeView.getAllVisibilityWidgets === "function") {
      return treeView.getAllVisibilityWidgets();
    }

    const container =
      treeView.containerElement ||
      treeView.container ||
      treeView.element ||
      null;

    if (!container || !container.querySelectorAll) {
      return [];
    }

    const nodes = Array.from(
      container.querySelectorAll("[data-visibility-widget], .visibility-widget")
    );

    const widgets = [];

    for (const node of nodes) {
      if (node.visibilityWidget) {
        widgets.push(node.visibilityWidget);
      } else if (node.__visibilityWidget) {
        widgets.push(node.__visibilityWidget);
      }
    }

    return widgets;
  }

  applyVisibilitySetToTree(treeView, setOrSpec, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const coordinator = helpers.visibilityCoordinator;

    if (
      coordinator &&
      typeof coordinator.applyVisibilitySetToTree === "function"
    ) {
      return coordinator.applyVisibilitySetToTree(treeView, setOrSpec, options);
    }

    return {
      ok: false,
      error: "ProjectFilesVisibilityCoordinator unavailable.",
      applied: 0,
      reset: 0,
      tree: null
    };
  }

  async applyVisibilitySetToAllTrees(setOrSpec, options = {}) {
    const original = this.__applyVisibilitySetToAllTreesBeforeRefreshPatch;

    if (typeof original === 'function') {
      const result = await original.call(this, setOrSpec, options);
      this._refreshVisibilityTreesAfterApply?.();
      return result;
    }

    const trees =
      typeof this.getFileTreeViews === 'function'
        ? this.getFileTreeViews()
        : [];

    const results = [];
    let applied = 0;
    let reset = 0;

    for (const treeView of trees) {
      const result = await this.applyVisibilitySetToTree(treeView, setOrSpec, options);
      results.push(result);
      applied += Number(result?.applied || 0);
      reset += Number(result?.reset || 0);
    }

    this._refreshVisibilityTreesAfterApply?.();

    return {
      ok: true,
      scope: 'all-trees',
      setName: setOrSpec?.name || options.name || '',
      treeCount: trees.length,
      applied,
      reset,
      results
    };
  }

  _visibilityPathMatchesSpec(path, set) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const coordinator = helpers.visibilityCoordinator;

    if (
      coordinator &&
      typeof coordinator.visibilityPathMatchesSpec === "function"
    ) {
      return coordinator.visibilityPathMatchesSpec(path, set);
    }

    return null;
  }

  _visibilityWidgetPath(widget) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const coordinator = helpers.visibilityCoordinator;

    if (
      coordinator &&
      typeof coordinator.visibilityWidgetPath === "function"
    ) {
      return coordinator.visibilityWidgetPath(widget);
    }

    return "";
  }

  _notifyScopedVisibilityChange(details = {}) {
    if (this.app && typeof this.app.notifyVisibilityChange === 'function') {
      this.app.notifyVisibilityChange(details);
    }

    if (typeof this.onVisibilityChange === 'function') {
      this.onVisibilityChange(details);
    }

    if (
      details.treeView &&
      typeof details.treeView.checkActiveNodeVisibility === 'function'
    ) {
      details.treeView.checkActiveNodeVisibility();
    }
  }

  async readStoredVisibilitySetByName(name) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.readStoredVisibilitySetByName === "function"
    ) {
      return await reader.readStoredVisibilitySetByName(name, {
        app: this.app,
        manager: this,
        normalizeVisibilitySet: (set, options) =>
          this.normalizeVisibilitySet(set, options)
      });
    }

    return null;
  }

  async applyStoredVisibilitySetToTree(name, treeView, options = {}) {
    const requested = String(name || "").trim();
    const candidates = await this._visibilityCollectApplyCandidates(requested);
    const treeRoot = this._visibilityRootForTree(treeView);

    const results = [];

    for (const candidate of candidates) {
      if (candidate.treeRoot && treeRoot && candidate.treeRoot !== treeRoot) {
        continue;
      }

      results.push(
        this._visibilityApplySetToTreeDirect(
          treeView,
          candidate.set,
          candidate.name,
          options
        )
      );
    }

    const scanned = results.reduce((sum, item) => sum + Number(item.scanned || 0), 0);
    const matched = results.reduce((sum, item) => sum + Number(item.matched || 0), 0);
    const reset = results.reduce((sum, item) => sum + Number(item.reset || 0), 0);

    const summary = {
      ok: matched > 0,
      requested,
      treeRoot,
      candidateCount: candidates.length,
      scanned,
      matched,
      reset,
      results
    };

    console.log("[VisibilitySets] applyStoredVisibilitySetToTree", summary);

    if (this.app?.uiManager?.setStatus) {
      const message =
        matched > 0
          ? `Applied visibility set "${requested}" to ${treeRoot}: ${matched} matched.`
          : `Visibility set "${requested}" matched 0 files in ${treeRoot || "this tree"}.`;
      this.app.uiManager.setStatus(message);
    }

    return summary;
  }

  async applyStoredVisibilitySetToAllTrees(name, options = {}) {
    if (options && options.__fromApplyStoredVisibilitySet) {
      return {
        ok: false,
        requested: String(name || ""),
        reason: "Blocked recursive applyStoredVisibilitySetToAllTrees call."
      };
    }

    if (typeof this.applyStoredVisibilitySet === "function") {
      return await this.applyStoredVisibilitySet(name, {
        ...options,
        reason: options.reason || "applyStoredVisibilitySetToAllTrees delegates to parent-aware apply",
        __fromApplyStoredVisibilitySetToAllTrees: true
      });
    }

    return {
      ok: false,
      requested: String(name || ""),
      reason: "applyStoredVisibilitySet unavailable."
    };
  }

  async _readVisibilitySetsCapsuleSource() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.readVisibilitySetsCapsuleSource === "function"
    ) {
      return await reader.readVisibilitySetsCapsuleSource({
        app: this.app,
        manager: this
      });
    }

    return null;
  }

  _findVisibilitySetMethodSource(source, name) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.findVisibilitySetMethodSource === "function"
    ) {
      return reader.findVisibilitySetMethodSource(source, name);
    }

    return null;
  }

  _evaluateVisibilitySetMethodSource(methodSource) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.evaluateVisibilitySetMethodSource === "function"
    ) {
      return reader.evaluateVisibilitySetMethodSource(methodSource);
    }

    return null;
  }

  _visibilitySetMethodNameForName(name) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.visibilitySetMethodNameForName === "function"
    ) {
      return reader.visibilitySetMethodNameForName(name);
    }

    return "_set_Unnamed";
  }

  _visibilitySetFriendlyNameFromMethodName(methodName) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.visibilitySetFriendlyNameFromMethodName === "function"
    ) {
      return reader.visibilitySetFriendlyNameFromMethodName(methodName);
    }

    return String(methodName || "") || "Unnamed";
  }

  _visibilitySetSlug(value) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.visibilitySetSlug === "function"
    ) {
      return reader.visibilitySetSlug(value);
    }

    return String(value || "unnamed")
      .trim()
      .toLowerCase()
      .replace(new RegExp("[^a-z0-9]+", "g"), "-")
      .replace(new RegExp("^-+|-+$", "g"), "") || "unnamed";
  }

  _visibilitySetMethodName(methodNode) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.visibilitySetMethodName === "function"
    ) {
      return reader.visibilitySetMethodName(methodNode);
    }

    if (!methodNode || !methodNode.key) return "";

    if (methodNode.key.type === "Identifier") {
      return methodNode.key.name || "";
    }

    if (methodNode.key.type === "Literal") {
      return String(methodNode.key.value || "");
    }

    return "";
  }

  _visibilitySetMethodNameFromSource(methodSource) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.visibilitySetMethodNameFromSource === "function"
    ) {
      return reader.visibilitySetMethodNameFromSource(methodSource);
    }

    throw new Error("ProjectVisibilitySetCapsuleReader unavailable.");
  }

  async installVisibilitySetToolbarsOnOpenTrees(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const controller = helpers.visibilitySetFilterController;

    if (
      controller &&
      typeof controller.installVisibilitySetToolbarsOnOpenTrees === "function"
    ) {
      return await controller.installVisibilitySetToolbarsOnOpenTrees(
        this,
        options
      );
    }

    return {
      ok: false,
      installed: 0,
      total: 0,
      reason: "ProjectVisibilitySetFilterController unavailable"
    };
  }

  async listStoredVisibilitySetSummaries() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const reader = helpers.visibilitySetCapsuleReader;

    if (
      reader &&
      typeof reader.listStoredVisibilitySetSummaries === "function"
    ) {
      return await reader.listStoredVisibilitySetSummaries({
        app: this.app,
        manager: this
      });
    }

    return [];
  }

  showVisibilitySetToolbarTools(options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibilityToolbarTools;

    if (tools && typeof tools.showVisibilitySetToolbarTools === "function") {
      return tools.showVisibilitySetToolbarTools(this, options);
    }

    return {
      ok: false,
      reason: "ProjectVisibilityToolbarTools unavailable"
    };
  }

  async _renderVisibilitySetToolbarTools() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibilityToolbarTools;

    if (tools && typeof tools.renderVisibilitySetToolbarTools === "function") {
      return await tools.renderVisibilitySetToolbarTools(this);
    }

    return null;
  }

  _visibilityToolbarToolsMakeButton(text, onClick) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibilityToolbarTools;

    if (
      tools &&
      typeof tools.visibilityToolbarToolsMakeButton === "function"
    ) {
      return tools.visibilityToolbarToolsMakeButton(this, text, onClick);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
  }

  _visibilityToolbarToolsSetStatus(message) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibilityToolbarTools;

    if (
      tools &&
      typeof tools.visibilityToolbarToolsSetStatus === "function"
    ) {
      return tools.visibilityToolbarToolsSetStatus(this, message);
    }

    const dialog = this.visibilitySetToolbarToolsDialog;

    if (dialog?.status) {
      dialog.status.textContent = String(message || "");
    }
  }

  async _visibilityToolbarToolsRefresh() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const tools = helpers.visibilityToolbarTools;

    if (
      tools &&
      typeof tools.visibilityToolbarToolsRefresh === "function"
    ) {
      return await tools.visibilityToolbarToolsRefresh(this);
    }

    return null;
  }

_analyzePromptMetadataForFile(path, content, docsContent) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const analyzer = helpers.metadataAnalyzer;

    if (
      analyzer &&
      typeof analyzer.analyzePromptMetadataForFile === "function"
    ) {
      return analyzer.analyzePromptMetadataForFile(path, content, docsContent);
    }

    const text = typeof content === "string" ? content : "";
    const sidecarText = typeof docsContent === "string" ? docsContent : "";

    const totalLines = this._countPromptMetadataLines(text);
    const sidecarDocLines =
      sidecarText.length > 0
        ? this._countPromptMetadataLines(sidecarText)
        : 0;

    const isStructured = this._isJavaScriptLikePromptMetadataPath(path);
    const result = {
      codeSize: totalLines,
      docSize: sidecarDocLines,
      metadataSize: 0,
      totalLines,
      sidecarDocSize: sidecarDocLines,
      capsuleDocSize: 0,
      isStructured,
      hasDocs: sidecarDocLines > 0,
      hasCapsuleDocs: false,
      hasRuntimeMetadata: false,
      isStrictCapsule: false,
      isPureDocCapsule: false
    };

    if (!isStructured || !text.trim()) {
      return result;
    }

    const roles = this._analyzeJavaScriptCapsuleLineRoles(text);

    if (!roles.ok) {
      result.capsuleAnalysisError =
        roles.error || "unknown capsule analysis error";
      return result;
    }

    result.capsuleDocSize = roles.docSize;
    result.metadataSize = roles.metadataSize;
    result.docSize = sidecarDocLines + roles.docSize;
    result.codeSize = Math.max(
      0,
      totalLines - roles.docSize - roles.metadataSize
    );
    result.hasCapsuleDocs = roles.docSize > 0;
    result.hasRuntimeMetadata = roles.metadataSize > 0;
    result.hasDocs = result.docSize > 0;
    result.isStrictCapsule = !!roles.isStrictCapsule;
    result.isPureDocCapsule =
      result.isStrictCapsule && result.codeSize === 0 && result.docSize > 0;

    return result;
  }

_analyzeJavaScriptCapsuleLineRoles(source) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const analyzer = helpers.metadataAnalyzer;

    if (
      analyzer &&
      typeof analyzer.analyzeJavaScriptCapsuleLineRoles === "function"
    ) {
      return analyzer.analyzeJavaScriptCapsuleLineRoles(source);
    }

    const acornInstance = this._getCapsuleMetadataAcorn();

    if (!acornInstance) {
      return {
        ok: false,
        error: "Acorn unavailable"
      };
    }

    let ast = null;
    let parseError = null;

    for (const sourceType of ["script", "module"]) {
      try {
        ast = acornInstance.parse(source, {
          ecmaVersion: "latest",
          sourceType,
          locations: true
        });
        parseError = null;
        break;
      } catch (error) {
        parseError = error;
      }
    }

    if (!ast) {
      return {
        ok: false,
        error:
          parseError && parseError.message ? parseError.message : "parse failed"
      };
    }

    const topLevelClasses = ast.body.filter((node) => {
      return node.type === "ClassDeclaration";
    });

    const classNode = topLevelClasses[0] || null;

    if (!classNode || !classNode.body || !Array.isArray(classNode.body.body)) {
      return {
        ok: true,
        docSize: 0,
        metadataSize: 0,
        isStrictCapsule: false
      };
    }

    let docSize = 0;
    let metadataSize = 0;

    for (const member of classNode.body.body) {
      if (member.type !== "MethodDefinition") continue;

      const name =
        member.key && member.key.type === "Identifier"
          ? member.key.name || ""
          : member.key && member.key.type === "Literal"
          ? String(member.key.value || "")
          : "";

      const startLine = Number(
        member.loc && member.loc.start && member.loc.start.line
      );
      const endLine = Number(
        member.loc && member.loc.end && member.loc.end.line
      );
      const lineCount =
        startLine > 0 && endLine >= startLine ? endLine - startLine + 1 : 0;

      if (member.static && name === "getMetadata") {
        metadataSize += lineCount;
      } else if (member.static && String(name).startsWith("_doc_")) {
        docSize += lineCount;
      }
    }

    const isStrictCapsule =
      topLevelClasses.length === 1 &&
      ast.body.every((node) => node === classNode);

    return {
      ok: true,
      docSize,
      metadataSize,
      isStrictCapsule
    };
  }

_getCapsuleMetadataAcorn() {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const analyzer = helpers.metadataAnalyzer;

    if (analyzer && typeof analyzer.getAcorn === "function") {
      return analyzer.getAcorn();
    }

    return this.app?.codeParser?.acorn || window.acorn || null;
  }

_countPromptMetadataLines(text) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const analyzer = helpers.metadataAnalyzer;

    if (analyzer && typeof analyzer.countLines === "function") {
      return analyzer.countLines(text);
    }

    if (typeof text !== "string" || text.length === 0) return 0;
    return text.split("\n").length;
  }

_isJavaScriptLikePromptMetadataPath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const analyzer = helpers.metadataAnalyzer;

    if (analyzer && typeof analyzer.isJavaScriptLikePath === "function") {
      return analyzer.isJavaScriptLikePath(path);
    }

    const lower = String(path || "").toLowerCase();

    return [
      ".js",
      ".mjs",
      ".cjs",
      ".ts",
      ".tsx",
      ".jsx"
    ].some((suffix) => lower.endsWith(suffix));
  }

_isFolderMetaCapsulePath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.treeDataBuilder;

    if (
      builder &&
      typeof builder.isFolderMetaCapsulePath === "function"
    ) {
      return builder.isFolderMetaCapsulePath(path);
    }

    return new RegExp("(^|/)_folder\\.js$", "i").test(String(path || ""));
  }

_isHiddenImplementationCapsulePath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const builder = helpers.treeDataBuilder;

    if (
      builder &&
      typeof builder.isHiddenImplementationCapsulePath === "function"
    ) {
      return builder.isHiddenImplementationCapsulePath(path);
    }

    return this._isFolderMetaCapsulePath(path);
  }

_extractFolderMetaCapsuleInfo(rootId, store) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const attacher = helpers.folderMetaAttacher;

    if (
      attacher &&
      typeof attacher.extractFolderMetaCapsuleInfo === "function"
    ) {
      return attacher.extractFolderMetaCapsuleInfo(rootId, store);
    }

    return {};
  }

_evaluateFolderMetaCapsuleSource(source) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const attacher = helpers.folderMetaAttacher;

    if (
      attacher &&
      typeof attacher.evaluateFolderMetaCapsuleSource === "function"
    ) {
      return attacher.evaluateFolderMetaCapsuleSource(source);
    }

    return {
      ok: false,
      error: "ProjectFolderMetaCapsuleAttacher unavailable"
    };
  }

_attachFolderMetaCapsulesToTree(store, rootId, treeView) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const attacher = helpers.folderMetaAttacher;

    if (
      attacher &&
      typeof attacher.attachFolderMetaCapsulesToTree === "function"
    ) {
      return attacher.attachFolderMetaCapsulesToTree(
        store,
        rootId,
        treeView || this.fileTreeView
      );
    }

    return {
      ok: false,
      reason: "ProjectFolderMetaCapsuleAttacher unavailable"
    };
  }



_scheduleWorkspaceFolderMetaCapsuleAttach() {
    const delays = [0, 80, 300, 900, 1800];
    const scheduled = [];

    for (const delay of delays) {
      const timer = setTimeout(async () => {
        try {
          const result =
            await this._attachFolderMetaCapsulesFromWorkspaceStores();

          this._lastWorkspaceFolderMetaAttachResult = result;

          if (result && result.attached > 0) {
            this._lastFolderMetaAttachResult = result;
          }
        } catch (error) {
          this._lastWorkspaceFolderMetaAttachResult = {
            ok: false,
            error: error?.message || String(error)
          };

          console.warn(
            "[ProjectFilesManager] workspace folder-meta capsule attach failed:",
            error
          );
        }
      }, delay);

      scheduled.push(delay);
    }

    return {
      ok: true,
      scheduledDelays: scheduled
    };
  }

async _attachFolderMetaCapsulesFromWorkspaceStores() {
      const helpers = this._ensureBreakdownHelpers?.() || {};
      const attacher = helpers.folderMetaAttacher;

      if (
        attacher &&
        typeof attacher.attachFolderMetaCapsulesFromWorkspaceStores === "function"
      ) {
        // Removed passing of the legacy single 'this.fileTreeView' parameter entirely
        return await attacher.attachFolderMetaCapsulesFromWorkspaceStores(
          this.app?.workspaceFileStores
        );
      }

      return {
        ok: false,
        reason: "ProjectFolderMetaCapsuleAttacher unavailable"
      };
    }

  _ensureBreakdownHelpers() {
    if (!this._breakdownHelpers2) {
      this._breakdownHelpers2 = {};
    }

    if (
      !this._breakdownHelperFactory2 &&
      typeof ProjectFilesManagerBreakdownHelperFactory !== "undefined"
    ) {
      this._breakdownHelperFactory2 =
        new ProjectFilesManagerBreakdownHelperFactory({
          manager: this
        });
    }

    if (
      this._breakdownHelperFactory2 &&
      typeof this._breakdownHelperFactory2.ensureAll === "function"
    ) {
      this._breakdownHelpers2 = this._breakdownHelperFactory2.ensureAll(
        this,
        this._breakdownHelpers2
      );
    }

    return this._breakdownHelpers2;
  }

  _workspaceTreesManagerDialogClass() {
      const helpers = this._ensureBreakdownHelpers?.() || {};
      const treeManager = helpers.workspaceTreesManager;

      if (
        treeManager &&
        typeof treeManager.workspaceTreesManagerDialogClass === "function"
      ) {
        return treeManager.workspaceTreesManagerDialogClass();
      }

      if (typeof UITools !== "undefined") return UITools;
      if (window.UITools) return window.UITools;
      return null;
    }

  async _addWorkspaceRootFromFileStore(store, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const operations = helpers.workspaceRootOperations;

    if (
      operations &&
      typeof operations.addWorkspaceRootFromFileStore === "function"
    ) {
      return await operations.addWorkspaceRootFromFileStore(
        this,
        store,
        options
      );
    }

    return {
      ok: false,
      reason: "ProjectWorkspaceRootOperations unavailable"
    };
  }


  _normalizeEditorFilePath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.editorBridge;

    if (bridge && typeof bridge.normalizeEditorFilePath === "function") {
      return bridge.normalizeEditorFilePath(path);
    }

    return typeof path === "string" ? path.replace(/^\/+/, "") : "";
  }

  _pathLooksLikeWorkspacePath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.editorBridge;

    if (bridge && typeof bridge.pathLooksLikeWorkspacePath === "function") {
      return bridge.pathLooksLikeWorkspacePath(path);
    }

    return typeof path === "string" && path.startsWith("/");
  }

  _storeForEditorPath(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.editorBridge;

    if (bridge && typeof bridge.storeForEditorPath === "function") {
      return bridge.storeForEditorPath(this, path);
    }

    return null;
  }

  async _readEditorPathContent(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.editorBridge;

    if (bridge && typeof bridge.readEditorPathContent === "function") {
      return await bridge.readEditorPathContent(this, path);
    }

    return "";
  }

  async _openEditorPath(path, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.editorBridge;

    if (bridge && typeof bridge.openEditorPath === "function") {
      return await bridge.openEditorPath(this, path, options);
    }

    return {
      ok: false,
      reason: "ProjectFilesEditorBridge unavailable"
    };
  }

  async _openNodeInEditor(node, options = {}) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.editorBridge;

    if (bridge && typeof bridge.openNodeInEditor === "function") {
      return await bridge.openNodeInEditor(this, node, options);
    }

    return {
      ok: false,
      reason: "ProjectFilesEditorBridge unavailable"
    };
  }

  _markNodeAsActiveFile(path) {
    const helpers = this._ensureBreakdownHelpers?.() || {};
    const bridge = helpers.editorBridge;

    if (bridge && typeof bridge.markNodeAsActiveFile === "function") {
      return bridge.markNodeAsActiveFile(this, path);
    }

    return false;
  }

  _vfsNormalizeFileContentPath(filePath) {    if (typeof filePath !== "string") {      return "";    }    let key = filePath.trim();    if (!key) {      return "";    }    const queryIndex = key.indexOf("?");    if (queryIndex >= 0) {      key = key.slice(0, queryIndex);    }    const hashIndex = key.indexOf("#");    if (hashIndex >= 0) {      key = key.slice(0, hashIndex);    }    while (key.includes("//")) {      key = key.split("//").join("/");    }    if (!key.startsWith("/")) {      key = "/" + key;    }    return key;  }

  async _vfsForFileContent() {    if (!this.app) {      return null;    }    if (typeof this.app.refreshVirtualFileSystemStores === "function") {      return await this.app.refreshVirtualFileSystemStores();    }    if (this.app.vfs) {      return this.app.vfs;    }    return null;  }

  async _vfsReadFileContentFromEditorBridge(key) {    if (typeof this.readEditorPathContent !== "function") {      return null;    }    try {      return await this.readEditorPathContent(this, key);    } catch (error) {      this._vfsLogFileContentFallback(key, error);      return null;    }  }

  async _vfsReadFileContentFromWorkspaceStores(key) {    const stores = this.app?.workspaceFileStores ||      this.workspaceFileStores ||      null;    if (!stores) {      return null;    }    const rootId = "/" + key.split("/").filter(Boolean)[0];    const store = typeof stores.get === "function"      ? stores.get(rootId)      : stores[rootId];    if (!store) {      return null;    }    try {      if (typeof store.has === "function" && !(await store.has(key))) {        return null;      }      if (typeof store.get === "function") {        const value = await store.get(key);        return this._vfsCoerceFileContent(value);      }      return this._vfsCoerceFileContent(store[key]);    } catch (error) {      this._vfsLogFileContentFallback(key, error);      return null;    }  }

  async _vfsReadFileContentFromAppStores(key) {    const stores = [      this.app?.inMemoryFileStore,      this.app?.fileStore,      this.app?.files,      this.fileStore,      this.files    ];    for (const store of stores) {      const content = await this._vfsReadFromGenericStore(store, key);      if (typeof content === "string") {        return content;      }    }    return null;  }

  async _vfsReadFromGenericStore(store, key) {    if (!store) {      return null;    }    const variants = this._vfsPathVariants(key);    for (const candidate of variants) {      try {        if (typeof store.has === "function" && !(await store.has(candidate))) {          continue;        }        if (typeof store.get === "function") {          const value = await store.get(candidate);          const content = this._vfsCoerceFileContent(value);          if (typeof content === "string") {            return content;          }          continue;        }        if (Object.prototype.hasOwnProperty.call(store, candidate)) {          const content = this._vfsCoerceFileContent(store[candidate]);          if (typeof content === "string") {            return content;          }        }      } catch (error) {        this._vfsLogFileContentFallback(candidate, error);      }    }    return null;  }

  _vfsCoerceFileContent(value) {    if (typeof value === "string") {      return value;    }    if (!value || typeof value !== "object") {      return null;    }    if (typeof value.content === "string") {      return value.content;    }    if (typeof value.value === "string") {      return value.value;    }    if (typeof value.text === "string") {      return value.text;    }    return null;  }

  _vfsPathVariants(key) {    const normalized = this._vfsNormalizeFileContentPath(key);    const variants = [normalized];    if (normalized.startsWith("/")) {      variants.push(normalized.slice(1));    }    if (normalized.startsWith("/vibes/")) {      variants.push(normalized.slice("/vibes".length));      variants.push(normalized.slice("/vibes/".length));    }    return Array.from(new Set(variants.filter(Boolean)));  }

  _vfsLogFileContentFallback(key, error) {    const message = error && error.message ? error.message : String(error);    if (this.app && typeof this.app.logFileOp === "function") {      this.app.logFileOp("debug", "ProjectFilesManager.getFileContent VFS fallback", {        path: key,        error: message      });      return;    }    if (this.app?.fileLogger && typeof this.app.fileLogger.log === "function") {      this.app.fileLogger.log("debug", "ProjectFilesManager.getFileContent VFS fallback", {        path: key,        error: message      });    }  }

  _staticMigrationPathVariants(path) {
    const normalized = String(path || "").startsWith("/") ? String(path) : "/" + String(path || "");
    const withoutSlash = normalized.startsWith("/") ? normalized.slice(1) : normalized;
    const variants = [normalized, withoutSlash];

    if (normalized.startsWith("/vibes/")) {
      variants.push(normalized.slice("/vibes".length));
      variants.push(normalized.slice("/vibes/".length));
    }

    return Array.from(new Set(variants.filter(Boolean)));
  }

  installVisibilityDebugTap(reason = 'manual') {
    this._visibilityDebugRemoveOldPanels();

    if (!Array.isArray(this._visibilityDebugLines)) {
      this._visibilityDebugLines = [];
    }

    globalThis.__vibesVisibilityDebugTapProjectFilesManager = this;
    globalThis.__vibesVisibilityDebugLog = (...args) => {
      this._visibilityDebugLog(...args);
    };

    this._ensureVisibilityDebugButton(reason);

    if (!this._visibilityDebugTapInstalled) {
      this._visibilityDebugTapInstalled = true;

      this._visibilityDebugInstallDomListeners?.();
      this._visibilityDebugWrapGlobals?.();

      setTimeout(() => {
        this._visibilityDebugWrapGlobals?.();
        this._visibilityDebugGlobalCheck?.();
        this._ensureVisibilityDebugButton('delayed pass 1');
      }, 500);

      setTimeout(() => {
        this._visibilityDebugWrapGlobals?.();
        this._visibilityDebugGlobalCheck?.();
        this._ensureVisibilityDebugButton('delayed pass 2');
      }, 1800);
    }

    this._visibilityDebugLog('visibility debug tap installed', reason);

    return {
      ok: true,
      reason
    };
  }

  _visibilityDebugLog(...args) {
    if (!Array.isArray(this._visibilityDebugLines)) {
      this._visibilityDebugLines = [];
    }

    const text =
      '[VIS-PFM ' +
      new Date().toLocaleTimeString() +
      '] ' +
      args.map((arg) => this._visibilityDebugShort?.(arg) ?? String(arg)).join(' ');

    this._visibilityDebugLines.push(text);

    if (this._visibilityDebugLines.length > 1000) {
      this._visibilityDebugLines.splice(0, this._visibilityDebugLines.length - 1000);
    }

    console.log(text);
    this._appendVisibilityDebugDialogLine(text);

    return text;
  }

  _visibilityDebugShort(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    if (typeof value === 'string') {
      return value.length > 260 ? value.slice(0, 260) + '…' : value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'function') {
      return '[function ' + (value.name || 'anonymous') + ']';
    }

    if (Array.isArray(value)) {
      return (
        '[' +
        value.slice(0, 10).map((item) => this._visibilityDebugShort(item)).join(', ') +
        (value.length > 10 ? ', …' : '') +
        ']'
      );
    }

    if (typeof value === 'object') {
      const summary = {};
      const keys = [
        'path',
        'filePath',
        'fullPath',
        'id',
        'name',
        'type',
        'segment',
        'code',
        'codeLevel',
        'sig',
        'signatures',
        'docs',
        'docsLevel',
        'silent',
        'resetFirst',
        'applied',
        'missing',
        'resetCount',
        'reason',
        'ok',
        'value'
      ];

      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          summary[key] = value[key];
        }
      }

      if (value.files && typeof value.files === 'object') {
        summary.files = 'files[' + Object.keys(value.files).length + ']';
      }

      if (Array.isArray(value.items)) {
        summary.items = 'items[' + value.items.length + ']';
      }

      if (Array.isArray(value.patterns)) {
        summary.patterns = 'patterns[' + value.patterns.length + ']';
      }

      if (!Object.keys(summary).length) {
        const objectKeys = Object.keys(value).slice(0, 8);
        for (const key of objectKeys) {
          const item = value[key];
          if (typeof item === 'function') {
            summary[key] = '[function]';
          } else if (item && typeof item === 'object') {
            summary[key] = '[object ' + (item.constructor?.name || 'Object') + ']';
          } else {
            summary[key] = item;
          }
        }
      }

      try {
        return JSON.stringify(summary);
      } catch (error) {
        return String(value);
      }
    }

    return String(value);
  }

  _visibilityDebugWrapGlobals() {
    const wrappers = [
      ['VisibilityWidget', 'toggleSegment'],
      ['VisibilityWidget', 'setState'],
      ['VisibilityWidget', 'redraw'],
      ['VisibilityWidget', 'render'],
      ['UIVisibilityManager', 'subscribe'],
      ['UIVisibilityManager', 'notify'],
      ['UIVisibilityManager', '_notifySubscribers'],
      ['ProjectFilesManager', 'normalizeVisibilityState'],
      ['ProjectFilesManager', 'normalizeVisibilitySet'],
      ['ProjectFilesManager', 'loadStoredVisibilitySet'],
      ['ProjectFilesManager', 'createStoredVisibilitySet'],
      ['ProjectFilesManager', 'filterTreeToVisibilitySet'],
      ['ProjectFilesManager', '_vsol1ApplyWidgetStates'],
      ['ProjectFilesManager', '_vsol1FilterTreeToSet'],
      ['ProjectFilesManager', 'onVisibilityChange'],
      ['ProjectVisibilitySetFilterController', 'applyVisibilitySet'],
      ['ProjectVisibilitySetFilterController', 'applyStoredVisibilitySet'],
      ['ProjectVisibilitySetFilterController', 'vsol1ApplyWidgetStates'],
      ['ProjectVisibilitySetFilterController', 'applyVisibilitySetStateToWidgets'],
      ['ProjectVisibilityToolbarTools', 'renderVisibilitySetRows'],
      ['ProjectVisibilityToolbarTools', 'visibilityToolbarToolsSetStatus'],
      ['ProjectVisibilityToolbarTools', 'openVisibilityTools'],
      ['ProjectVisibilityToolbarTools', 'loadVisibilitySet']
    ];

    let wrappedCount = 0;

    for (const item of wrappers) {
      if (this._visibilityDebugWrapClassMethod(item[0], item[1])) {
        wrappedCount++;
      }
    }

    this._visibilityDebugLog('wrapper pass complete', { wrappedCount });
    return wrappedCount;
  }

  _visibilityDebugWrapClassMethod(className, methodName) {
    const Klass = globalThis[className] || (typeof window !== 'undefined' ? window[className] : null);

    if (!Klass || !Klass.prototype) {
      this._visibilityDebugLog('missing global class for wrapper', className, methodName);
      return false;
    }

    const proto = Klass.prototype;
    const original = proto[methodName];

    if (typeof original !== 'function') {
      this._visibilityDebugLog('missing method for wrapper', className + '.' + methodName);
      return false;
    }

    const originalKey = '__visibilityDebugOriginal_' + methodName;

    if (proto[originalKey]) {
      return true;
    }

    const owner = this;
    proto[originalKey] = original;

    proto[methodName] = function (...args) {
      owner._visibilityDebugLog('CALL', className + '.' + methodName, {
        path:
          this?.fileData?.path ||
          this?.filePath ||
          this?.path ||
          this?.node?.path ||
          this?.id ||
          '',
        args
      });

      try {
        const result = original.apply(this, args);

        if (result && typeof result.then === 'function') {
          return result
            .then((value) => {
              owner._visibilityDebugLog('RETURN ASYNC', className + '.' + methodName, value);
              return value;
            })
            .catch((error) => {
              owner._visibilityDebugLog(
                'THROW ASYNC',
                className + '.' + methodName,
                error && error.message ? error.message : String(error)
              );
              throw error;
            });
        }

        owner._visibilityDebugLog('RETURN', className + '.' + methodName, result);
        return result;
      } catch (error) {
        owner._visibilityDebugLog(
          'THROW',
          className + '.' + methodName,
          error && error.message ? error.message : String(error)
        );
        throw error;
      }
    };

    this._visibilityDebugLog('wrapped', className + '.' + methodName);
    return true;
  }

  _visibilityDebugInstallDomListeners() {
    if (globalThis.__vibesVisibilityDebugDomListenersInstalled) {
      this._visibilityDebugLog('DOM listeners already installed');
      return false;
    }

    globalThis.__vibesVisibilityDebugDomListenersInstalled = true;

    document.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!target || !target.closest) return;

        const hit = target.closest(
          '.vis-tools-btn, .visibility-widget, [data-visibility-widget], .visibility-widget-container, [data-widget-path], [data-path], .visibility-set-row, .visibility-tools, .visibility-toolbar, button, select, input'
        );

        if (!hit) return;

        const className =
          typeof hit.className === 'string'
            ? hit.className
            : hit.className?.baseVal || '';

        const text = String(hit.textContent || '').trim().split(/\s+/).join(' ').slice(0, 180);

        this._visibilityDebugLog('DOM CLICK', {
          tag: hit.tagName,
          className,
          value: hit.value || '',
          text
        });
      },
      true
    );

    document.addEventListener(
      'change',
      (event) => {
        const target = event.target;
        if (!target) return;

        const className =
          typeof target.className === 'string'
            ? target.className
            : target.className?.baseVal || '';

        const text = String(target.textContent || '').trim().split(/\s+/).join(' ').slice(0, 220);

        this._visibilityDebugLog('DOM CHANGE', {
          tag: target.tagName,
          className,
          value: target.value || '',
          text
        });

        setTimeout(() => {
          this._visibilityDebugLog('post-change wrapper pass');
          this._visibilityDebugWrapGlobals();
          this._visibilityDebugGlobalCheck();
        }, 80);
      },
      true
    );

    this._visibilityDebugLog('installed permanent DOM listeners');
    return true;
  }

  _visibilityDebugGlobalCheck() {
    const names = [
      'VisibilityWidget',
      'UIVisibilityManager',
      'ProjectFilesManager',
      'ProjectVisibilitySetFilterController',
      'ProjectVisibilityToolbarTools',
      'EditorViewManager',
      'EditorTabController',
      'FloatingEditorWindow'
    ];

    const result = {};

    for (const name of names) {
      result[name] = typeof globalThis[name];
    }

    this._visibilityDebugLog('GLOBAL CHECK', result);
    return result;
  }

  _ensureVisibilityDebugButton(reason = 'manual') {
    this._visibilityDebugRemoveOldPanels();

    const existing = document.getElementById('vibes-visibility-debug-button');
    if (existing && existing.isConnected) {
      return true;
    }

    if (!document.body) {
      setTimeout(() => this._ensureVisibilityDebugButton('retry waiting for body'), 100);
      return false;
    }

    const host =
      this.mainElement ||
      this.container ||
      this.treeContainer?.parentElement ||
      document.body;

    if (!host) {
      console.warn('[VIS-PFM] No deterministic host for Debug button', { reason });
      setTimeout(() => this._ensureVisibilityDebugButton('retry waiting for host'), 250);
      return false;
    }

    let debugBar = document.getElementById('vibes-visibility-debug-bar');

    if (!debugBar) {
      debugBar = document.createElement('div');
      debugBar.id = 'vibes-visibility-debug-bar';
      debugBar.className = 'vibes-visibility-debug-bar';
      debugBar.style.display = 'flex';
      debugBar.style.alignItems = 'center';
      debugBar.style.gap = '6px';
      debugBar.style.padding = '4px 6px';
      debugBar.style.borderBottom = '1px solid rgba(255,255,255,0.12)';
      debugBar.style.background = 'rgba(255,255,255,0.035)';
      debugBar.style.flexShrink = '0';

      if (host.firstChild) {
        host.insertBefore(debugBar, host.firstChild);
      } else {
        host.appendChild(debugBar);
      }
    }

    const button = document.createElement('button');
    button.id = 'vibes-visibility-debug-button';
    button.textContent = 'Debug';
    button.title = 'Open visibility debug dialog';
    button.className = 'vis-debug-btn';
    button.style.padding = '3px 8px';
    button.style.fontSize = '12px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showVisibilityDebugDialog();
    });

    const label = document.createElement('span');
    label.id = 'vibes-visibility-debug-label';
    label.textContent = 'visibility';
    label.style.opacity = '0.65';
    label.style.fontSize = '11px';

    debugBar.append(button, label);

    console.log('[VIS-PFM] Debug button inserted deterministically', {
      reason,
      host: host.className || host.id || host.tagName
    });

    return true;
  }

  showVisibilityDebugDialog() {
      this._visibilityDebugRemoveOldPanels();

      if (!Array.isArray(this._visibilityDebugLines)) {
        this._visibilityDebugLines = [];
      }

      if (this._visibilityDebugDialog?.contentElement?.isConnected) {
        this._visibilityDebugDialog.bringToFront?.();
        this._appendVisibilityDebugDialogLine('debug dialog brought to front');
        return this._visibilityDebugDialog;
      }

      const content = document.createElement('div');
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      content.style.height = '100%';
      content.style.gap = '8px';
      content.style.fontFamily = 'system-ui, sans-serif';

      const toolbar = document.createElement('div');
      toolbar.style.display = 'flex';
      toolbar.style.gap = '8px';
      toolbar.style.alignItems = 'center';

      const rescanButton = document.createElement('button');
      rescanButton.textContent = 'Rescan wrappers';
      rescanButton.onclick = () => {
        this._visibilityDebugWrapGlobals?.();
        this._visibilityDebugGlobalCheck?.();
        this._visibilityDebugLog('manual rescan wrappers');
      };

      const clearButton = document.createElement('button');
      clearButton.textContent = 'Clear';
      clearButton.onclick = () => {
        this._visibilityDebugLines = [];
        if (this._visibilityDebugTextElement) {
          this._visibilityDebugTextElement.textContent = '';
        }
        console.log('[VIS-PFM] visibility debug dialog cleared');
      };

      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy';
      copyButton.onclick = async () => {
        const text = (this._visibilityDebugLines || []).join('\n');
        try {
          await navigator.clipboard.writeText(text);
          this._visibilityDebugLog('copied debug log to clipboard', {
            lines: this._visibilityDebugLines.length
          });
        } catch (error) {
          this._visibilityDebugLog('copy debug log failed', error.message || String(error));
        }
      };

      const note = document.createElement('span');
      note.textContent = 'Console is canonical; this mirrors recent VIS-PFM lines.';
      note.style.opacity = '0.7';
      note.style.fontSize = '12px';

      toolbar.append(rescanButton, clearButton, copyButton, note);

      const pre = document.createElement('pre');
      pre.style.flex = '1';
      pre.style.margin = '0';
      pre.style.padding = '10px';
      pre.style.overflow = 'auto';
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.background = 'rgba(0,0,0,0.25)';
      pre.style.border = '1px solid rgba(255,255,255,0.15)';
      pre.style.borderRadius = '6px';
      pre.style.font = '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      pre.textContent = (this._visibilityDebugLines || []).join('\n');

      this._textElement = pre;

      content.append(toolbar, pre);

      if (typeof UITools !== 'undefined' && typeof UITools.makeDialog === 'function') {
        this._visibilityDebugDialog = UITools.makeDialog({
          title: 'Visibility Debug',
          contentElement: content,
          size: [760, 520],
          position: [160, 110]
        });
      } else {
        console.warn('[VIS-PFM] No UITools available; console only.');
        return null;
      }

      this._visibilityDebugLog('debug dialog opened');

      return this._visibilityDebugDialog;
    }

  _appendVisibilityDebugDialogLine(text) {
    if (!this._visibilityDebugTextElement) {
      return false;
    }

    this._visibilityDebugTextElement.textContent = (this._visibilityDebugLines || []).join('\n');
    this._visibilityDebugTextElement.scrollTop = this._visibilityDebugTextElement.scrollHeight;
    return true;
  }

  _visibilityDebugRemoveOldPanels() {
    const oldIds = [
      'vibes-visibility-debug-panel',
      'vibes-visibility-debug-panel-3',
      'vibes-project-files-visibility-debug-panel'
    ];

    for (const id of oldIds) {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    }

    return true;
  }

  _refreshVisibilityTreesAfterApply() {
    const trees =
      typeof this.getFileTreeViews === 'function'
        ? this.getFileTreeViews()
        : [];

    for (const tree of trees) {
      if (typeof tree.refresh === 'function') tree.refresh();
      else if (typeof tree.render === 'function') tree.render();
      else if (typeof tree.redraw === 'function') tree.redraw();
      else if (typeof tree.update === 'function') tree.update();
    }

    this._syncVisibilityStateAcrossTrees?.();
    this.syncFileStates?.();
    this._updatePromptSizeEstimate?.();
    this.app?.visibilityManager?.notify?.();

    return trees.length;
  }

  _getWorkspaceStoreRootForPath(goldenPath) {
    const normalized = this._normalizeMountedRootCommitPath(goldenPath);
    const first = normalized.split('/').filter(Boolean)[0];

    if (!first || !this.app?.workspaceFileStores) {
      return null;
    }

    return '/' + first;
  }

  _normalizeMountedRootCommitPath(path) {
    if (path && typeof path.toString === 'function' && typeof path !== 'string') {
      path = path.toString();
    }

    if (typeof path !== 'string') {
      return '';
    }

    let normalized = path.trim();

    if (!normalized) {
      return '';
    }

    const queryIndex = normalized.indexOf('?');
    if (queryIndex >= 0) {
      normalized = normalized.slice(0, queryIndex);
    }

    const hashIndex = normalized.indexOf('#');
    if (hashIndex >= 0) {
      normalized = normalized.slice(0, hashIndex);
    }

    while (normalized.includes('//')) {
      normalized = normalized.split('//').join('/');
    }

    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    return normalized;
  }

  _getWorkspaceStoreForMountedRootPath(goldenPath) {
    const normalized = this._normalizeMountedRootCommitPath(goldenPath);
    const firstSegment = normalized.split('/').filter(Boolean)[0];

    if (!firstSegment || !this.app?.workspaceFileStores) {
      return null;
    }

    const rootId = '/' + firstSegment;
    const store = this.app.workspaceFileStores.get(rootId);

    if (!store || typeof store.set !== 'function') {
      return null;
    }

    return {
      rootId,
      store,
      path: normalized
    };
  }

  async commitMountedRootFileToDisk(goldenPath, content) {
      const resolved = this._getWorkspaceStoreForMountedRootPath(goldenPath);

      if (!resolved) {
        return {
          ok: false,
          reason: 'no-mounted-workspace-store',
          path: this._normalizeMountedRootCommitPath(goldenPath)
        };
      }

      const text = typeof content === 'string' ? content : String(content ?? '');

      // Read the original content from the local store before we write over it
      let oldContent = null;
      try {
        if (typeof resolved.store.get === 'function') {
          const val = await resolved.store.get(resolved.path);
          oldContent = typeof val === 'string' ? val : val?.content ?? null;
        }
      } catch (err) {
        console.warn('[commitMountedRootFileToDisk] Failed to read pre-save content:', err);
      }

      // Commit the write to the physical local OS directory
      await resolved.store.set(resolved.path, text);

      const cacheText = typeof resolved.store.get === 'function'
        ? resolved.store.get(resolved.path)
        : undefined;

      if (cacheText !== text) {
        throw new Error('Mounted root cache readback mismatch: ' + resolved.path);
      }

      let diskVerified = false;

      if (typeof resolved.store._resolveFileHandle === 'function') {
        const handle = await resolved.store._resolveFileHandle(resolved.path, false);
        const file = await handle.getFile();
        const diskText = await file.text();

        if (diskText !== text) {
          throw new Error('Mounted root disk readback mismatch: ' + resolved.path);
        }

        diskVerified = true;
      }

      // Trigger dynamic hot-patching for the modified file content
      if (oldContent && oldContent !== text && this.app?.vfs?._hotPatchLiveMemory) {
        this.app.vfs._hotPatchLiveMemory(resolved.path, oldContent, text);
      }

      if (this.app?.inMemoryFileStore?.set) {
        this.app.inMemoryFileStore.set(resolved.path, text);
      }

      if (this.app?.localDirSessionManager?.updateFile) {
        this.app.localDirSessionManager.updateFile(resolved.path, text);
      }

      return {
        ok: true,
        path: resolved.path,
        rootId: resolved.rootId,
        backend: 'workspaceFileStores',
        diskVerified
      };
    }

  async commitEnvOverlayFileToMountedRoot(env, goldenPath) {
    const normalized = this._normalizeMountedRootCommitPath(goldenPath);
    const content = env.readFile(normalized);

    if (typeof content !== 'string') {
      return {
        ok: false,
        reason: 'env-read-missing',
        path: normalized
      };
    }

    return await this.commitMountedRootFileToDisk(normalized, content);
  }

  _visibilityApplyGuardNormalizeRoot(root) {
    if (typeof root !== "string") {
      return null;
    }

    const first = root.split("/").filter(Boolean)[0];
    return first ? "/" + first : null;
  }

  _visibilityApplyGuardInferTreeRoot(treeView) {
    if (!treeView || !treeView.nodesMap || typeof treeView.nodesMap.keys !== "function") {
      return null;
    }

    const counts = new Map();

    for (const key of treeView.nodesMap.keys()) {
      if (typeof key !== "string" || !key.startsWith("/")) {
        continue;
      }

      const root = this._visibilityApplyGuardNormalizeRoot(key);

      if (!root) {
        continue;
      }

      counts.set(root, (counts.get(root) || 0) + 1);
    }

    let bestRoot = null;
    let bestCount = 0;

    for (const [root, count] of counts.entries()) {
      if (count > bestCount) {
        bestRoot = root;
        bestCount = count;
      }
    }

    return bestRoot;
  }

  _visibilityApplyGuardSingleRootFromFiles(files) {
    if (!files || typeof files !== "object") {
      return null;
    }

    const roots = new Set();

    for (const path of Object.keys(files)) {
      const root = this._visibilityApplyGuardNormalizeRoot(path);

      if (root) {
        roots.add(root);
      }

      if (roots.size > 1) {
        return null;
      }
    }

    return roots.size === 1 ? Array.from(roots)[0] : null;
  }

  _visibilityApplyGuardRootsFromFiles(files) {
    if (!files || typeof files !== "object") {
      return [];
    }

    const roots = new Set();

    for (const path of Object.keys(files)) {
      const root = this._visibilityApplyGuardNormalizeRoot(path);

      if (root) {
        roots.add(root);
      }
    }

    return Array.from(roots).sort();
  }

  async runAppCapsuleFromNode(nodeOrPath, options = {}) {
    const filePath = typeof nodeOrPath === 'string' ? nodeOrPath : nodeOrPath?.id;

    if (!filePath || !String(filePath).endsWith('.js')) {
      this.app?.uiManager?.setStatus?.('Run App expects a JavaScript capsule file.', true);
      return {
        ok: false,
        reason: 'not-js-file',
        filePath,
      };
    }

    this.app?.uiManager?.setStatus?.('Running app capsule: ' + filePath);

    let dialogInfo = null;

    try {
      const source = await this._runAppCapsuleReadSource(filePath);
      if (typeof source !== 'string') {
        throw new Error('Could not read capsule source for ' + filePath);
      }

      const ClassCtor = await this._runAppCapsuleInstallClassicSource(filePath, source);
      const metadata =
        ClassCtor && typeof ClassCtor.getMetadata === 'function'
          ? ClassCtor.getMetadata() || {}
          : {};

      const prototype = ClassCtor?.prototype || null;
      const canRun = prototype && typeof prototype.run === 'function';
      const canInit = prototype && typeof prototype.init === 'function';

      const hasRunnableMetadata =
        metadata.runnable === true ||
        metadata.run === true ||
        metadata.entryPoint === 'run' ||
        metadata.entry === 'run' ||
        metadata.runner === true ||
        (metadata.runner && metadata.runner.method === 'run');

      if (!canRun && !canInit && !hasRunnableMetadata) {
        throw new Error('Capsule does not appear runnable: no run(), no init(), and no runnable metadata.');
      }

      const dependencyResults = await this._runAppCapsuleLoadDependencies(metadata, filePath);

      dialogInfo = this._runAppCapsuleCreateDialog(filePath);
      const instance = new ClassCtor();

      await this._runAppCapsuleCallEntry(instance, metadata, dialogInfo, filePath, options);

      dialogInfo.instance = instance;
      globalThis.__vibesLastRunAppCapsule = {
        filePath,
        instance,
        dialog: dialogInfo.dialog,
        contentElement: dialogInfo.contentElement,
        metadata,
        dependencyResults,
      };

      this.app?.uiManager?.setStatus?.('Running app capsule: ' + filePath, false, 3000);

      return {
        ok: true,
        filePath,
        className: ClassCtor.name,
        metadata,
        dependencyResults,
      };
    } catch (error) {
      console.error('[Run App Capsule] failed:', error);

      if (dialogInfo && dialogInfo.contentElement) {
        this._runAppCapsuleShowError(dialogInfo.contentElement, error);
      }

      this.app?.uiManager?.setStatus?.('Run App failed: ' + error.message, true);

      return {
        ok: false,
        filePath,
        error: error.message,
      };
    }
  }

  async _runAppCapsuleReadSource(filePath) {
    const openController = Array.from(this.app?.editorControllers?.values?.() || []).find((controller) => {
      return controller && controller.filePath === filePath && controller.isLoaded;
    });

    if (openController && typeof openController.getCode === 'function') {
      return openController.getCode();
    }

    const rootId = '/' + String(filePath).split('/').filter(Boolean)[0];
    const store = this.app?.workspaceFileStores?.get(rootId);

    if (store && typeof store.get === 'function') {
      const value = store.get(filePath);
      if (typeof value === 'string') {
        return value;
      }
    }

    if (this.app?.inMemoryFileStore) {
      if (this.app.inMemoryFileStore.has(filePath)) {
        return this.app.inMemoryFileStore.get(filePath);
      }

      const projectPrefix = '/' + this.app.projectName + '/';
      if (filePath.startsWith(projectPrefix)) {
        const relative = filePath.slice(projectPrefix.length);
        if (this.app.inMemoryFileStore.has(relative)) {
          return this.app.inMemoryFileStore.get(relative);
        }
      }
    }

    if (this.app?.vfs && typeof this.app.vfs.readFile === 'function') {
      const value = await this.app.vfs.readFile(filePath, { nullOnMissing: true });
      if (typeof value === 'string') {
        return value;
      }
    }

    const response = await fetch(filePath + '?_runApp=' + Date.now());
    if (response.ok) {
      return await response.text();
    }

    return null;
  }

  async _runAppCapsuleInstallClassicSource(filePath, source) {
    const className = this._runAppCapsuleResolveClassName(filePath, source);

    if (!className) {
      throw new Error('Could not resolve capsule class name for ' + filePath);
    }

    const existingClass =
      typeof this._runAppCapsuleResolveLoadedGlobal === 'function'
        ? this._runAppCapsuleResolveLoadedGlobal(className)
        : null;

    if (typeof existingClass === 'function') {
      if (typeof globalThis !== 'undefined') {
        globalThis[className] = existingClass;
      }

      if (typeof window !== 'undefined') {
        window[className] = existingClass;
      }

      return existingClass;
    }

    const trailer = [
      '',
      ';try {',
      '  if (typeof ' + className + ' !== "undefined") {',
      '    globalThis.' + className + ' = ' + className + ';',
      '    if (typeof window !== "undefined") window.' + className + ' = ' + className + ';',
      '    globalThis.__vibesRunAppGlobals = globalThis.__vibesRunAppGlobals || new Set();',
      '    globalThis.__vibesRunAppGlobals.add("' + className + '");',
      '  }',
      '} catch (error) {',
      '  console.warn("[RunAppCapsule] expose failed for ' + className + '", error);',
      '}'
    ].join('\n');

    const script = document.createElement('script');
    script.dataset.vibesRunAppCapsule = filePath;
    script.textContent = source + trailer + '\n//# sourceURL=' + filePath + '?runApp=' + Date.now();
    document.head.appendChild(script);

    const ClassCtor =
      typeof this._runAppCapsuleResolveLoadedGlobal === 'function'
        ? this._runAppCapsuleResolveLoadedGlobal(className)
        : globalThis[className] || window[className];

    if (typeof ClassCtor !== 'function') {
      throw new Error('Class was not available after installing capsule: ' + className);
    }

    globalThis[className] = ClassCtor;
    if (typeof window !== 'undefined') {
      window[className] = ClassCtor;
    }

    return ClassCtor;
  }

  _runAppCapsuleResolveClassName(filePath, source) {
    const fileName = String(filePath || '').split('/').pop() || '';
    const fromFile = fileName.endsWith('.js') ? fileName.slice(0, -3) : fileName;

    if (fromFile && source.includes('class ' + fromFile)) {
      return fromFile;
    }

    const marker = 'class ';
    const index = source.indexOf(marker);
    if (index < 0) {
      return fromFile || null;
    }

    let cursor = index + marker.length;
    while (cursor < source.length && source[cursor] === ' ') {
      cursor++;
    }

    let name = '';
    while (cursor < source.length) {
      const ch = source[cursor];
      const isLetter =
        (ch >= 'a' && ch <= 'z') ||
        (ch >= 'A' && ch <= 'Z') ||
        ch === '_' ||
        ch === '$';
      const isDigit = ch >= '0' && ch <= '9';

      if (!isLetter && !isDigit) {
        break;
      }

      name += ch;
      cursor++;
    }

    return name || fromFile || null;
  }

  async _runAppCapsuleLoadDependencies(metadata, ownerPath) {
    const deps = Array.isArray(metadata?.dependencies) ? metadata.dependencies : [];
    const css = Array.isArray(metadata?.css) ? metadata.css : [];
    const results = [];

    for (const dep of deps) {
      const result = await this._runAppCapsuleLoadDependency(dep, ownerPath);
      results.push(result);
    }

    for (const cssPath of css) {
      const result = await this._runAppCapsuleLoadCss(cssPath, ownerPath);
      results.push(result);
    }

    console.log('[RunAppCapsule] dependencies loaded for', ownerPath, results);
    return results;
  }

  async _runAppCapsuleLoadDependency(depPath, ownerPath) {
    const resolved = this._runAppCapsuleResolveRelativePath(depPath, ownerPath);
    const fileBaseName = String(resolved).split('/').pop()?.replace('.js', '') || '';

    const existingGlobal = this._runAppCapsuleResolveLoadedGlobal(fileBaseName);
    if (fileBaseName && typeof existingGlobal === 'function') {
      if (typeof globalThis !== 'undefined' && !globalThis[fileBaseName]) {
        globalThis[fileBaseName] = existingGlobal;
      }

      if (typeof window !== 'undefined' && !window[fileBaseName]) {
        window[fileBaseName] = existingGlobal;
      }

      return {
        ok: true,
        cached: true,
        path: resolved,
        globalName: fileBaseName,
        globalType: 'function',
      };
    }

    const source = await this._runAppCapsuleReadSource(resolved);
    if (typeof source !== 'string') {
      throw new Error('Could not read dependency: ' + resolved);
    }

    const possibleClassName = this._runAppCapsuleResolveClassName(resolved, source);
    const functionNames = this._runAppCapsuleFindTopLevelFunctionNames(source);

    const existingClass = this._runAppCapsuleResolveLoadedGlobal(possibleClassName);
    if (possibleClassName && typeof existingClass === 'function') {
      if (typeof globalThis !== 'undefined' && !globalThis[possibleClassName]) {
        globalThis[possibleClassName] = existingClass;
      }

      if (typeof window !== 'undefined' && !window[possibleClassName]) {
        window[possibleClassName] = existingClass;
      }

      return {
        ok: true,
        cached: true,
        path: resolved,
        globalName: possibleClassName,
        globalType: 'function',
      };
    }

    const trailerLines = [];
    trailerLines.push('');
    trailerLines.push(';globalThis.__vibesRunAppGlobals = globalThis.__vibesRunAppGlobals || new Set();');

    if (possibleClassName) {
      trailerLines.push('try {');
      trailerLines.push('  if (typeof ' + possibleClassName + ' !== "undefined") {');
      trailerLines.push('    globalThis.' + possibleClassName + ' = ' + possibleClassName + ';');
      trailerLines.push('    if (typeof window !== "undefined") window.' + possibleClassName + ' = ' + possibleClassName + ';');
      trailerLines.push('    globalThis.__vibesRunAppGlobals.add("' + possibleClassName + '");');
      trailerLines.push('  }');
      trailerLines.push('} catch (error) {');
      trailerLines.push('  console.warn("[RunAppCapsule] dependency class expose failed for ' + possibleClassName + '", error);');
      trailerLines.push('}');
    }

    for (const functionName of functionNames) {
      const existingFunction = this._runAppCapsuleResolveLoadedGlobal(functionName);
      if (typeof existingFunction === 'function') {
        if (typeof globalThis !== 'undefined' && !globalThis[functionName]) {
          globalThis[functionName] = existingFunction;
        }

        if (typeof window !== 'undefined' && !window[functionName]) {
          window[functionName] = existingFunction;
        }

        continue;
      }

      trailerLines.push('try {');
      trailerLines.push('  if (typeof ' + functionName + ' !== "undefined") {');
      trailerLines.push('    globalThis.' + functionName + ' = ' + functionName + ';');
      trailerLines.push('    if (typeof window !== "undefined") window.' + functionName + ' = ' + functionName + ';');
      trailerLines.push('    globalThis.__vibesRunAppGlobals.add("' + functionName + '");');
      trailerLines.push('  }');
      trailerLines.push('} catch (error) {');
      trailerLines.push('  console.warn("[RunAppCapsule] dependency function expose failed for ' + functionName + '", error);');
      trailerLines.push('}');
    }

    const script = document.createElement('script');
    script.dataset.vibesRunAppDependency = resolved;
    script.textContent = source + trailerLines.join('\n') + '\n//# sourceURL=' + resolved + '?runAppDependency=' + Date.now();
    document.head.appendChild(script);

    const DepCtor = possibleClassName ? globalThis[possibleClassName] || window[possibleClassName] : null;
    const depMeta = DepCtor && typeof DepCtor.getMetadata === 'function' ? DepCtor.getMetadata() || {} : {};

    if (depMeta && (Array.isArray(depMeta.dependencies) || Array.isArray(depMeta.css))) {
      await this._runAppCapsuleLoadDependencies(depMeta, resolved);
    }

    return {
      ok: true,
      cached: false,
      path: resolved,
      className: possibleClassName,
      functionNames,
      exposedClassType: possibleClassName ? typeof globalThis[possibleClassName] : null,
      exposedFunctionTypes: functionNames.map(name => ({ name, type: typeof globalThis[name] })),
    };
  }

  async _runAppCapsuleLoadCss(cssPath, ownerPath) {
    const resolved = this._runAppCapsuleResolveRelativePath(cssPath, ownerPath);

    const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => {
      return link.dataset && link.dataset.vibesRunAppCss === resolved;
    });

    if (existing) {
      return {
        ok: true,
        cached: true,
        path: resolved,
      };
    }

    await new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = resolved;
      link.dataset.vibesRunAppCss = resolved;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Failed to load CSS: ' + resolved));
      document.head.appendChild(link);
    });

    return {
      ok: true,
      cached: false,
      path: resolved,
    };
  }

  _runAppCapsuleResolveRelativePath(path, ownerPath) {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid dependency path');
    }

    const clean = path.trim();

    if (clean.startsWith('/')) {
      return clean;
    }

    const hasPathSyntax =
      clean.includes('/') ||
      clean.endsWith('.js') ||
      clean.endsWith('.css') ||
      clean.startsWith('.');

    if (!hasPathSyntax) {
      return '/library/' + clean + '.js';
    }

    const owner = String(ownerPath || '');
    const slash = owner.lastIndexOf('/');
    const base = slash >= 0 ? owner.slice(0, slash + 1) : '/';

    const parts = (base + clean).split('/');
    const out = [];

    for (const part of parts) {
      if (!part || part === '.') {
        continue;
      }

      if (part === '..') {
        out.pop();
        continue;
      }

      out.push(part);
    }

    return '/' + out.join('/');
  }

  _runAppCapsuleCreateDialog(filePath) {
    const title = 'Run App: ' + (String(filePath).split('/').pop() || filePath);

    const contentElement = makeElement('div', {
      className: 'vibes-run-app-capsule-host',
      style: {
        width: '100%',
        height: '100%',
        minHeight: '480px',
        position: 'relative',
        overflow: 'hidden',
        background: '#222'
      }
    });

    let dialog = null;
    const closeState = {
      instance: null,
    };

    dialog = UITools.makeDialog({
      title,
      contentElement,
      size: [780, 580],
      position: [140, 90],
      onClose: () => {
        const instance = closeState.instance;
        if (instance && typeof instance.destroy === 'function') {
          try {
            instance.destroy();
          } catch (error) {
            console.warn('[RunAppCapsule] destroy failed:', error);
          }
        }
      }
    });

    return {
      dialog,
      contentElement,
      closeState,
      instance: null,
    };
  }

  async _runAppCapsuleCallEntry(instance, metadata, dialogInfo, filePath, options = {}) {
    dialogInfo.closeState.instance = instance;

    const hostEnv = {
      container: dialogInfo.contentElement,
      parentElement: dialogInfo.contentElement,
      targetElement: dialogInfo.contentElement,
      rootElement: dialogInfo.contentElement,
      app: this.app,
      vibesApp: this.app,
      manager: this,
      projectFilesManager: this,
      filePath,
      metadata,
      dialog: dialogInfo.dialog,
      sourceTreeView: options.sourceTreeView || null,
    };

    const methodName =
      metadata?.runner?.method ||
      metadata?.entryPoint ||
      metadata?.entry ||
      (typeof instance.run === 'function' ? 'run' : 'init');

    if (typeof instance[methodName] !== 'function') {
      throw new Error('Runnable method not found: ' + methodName);
    }

    try {
      return await instance[methodName](hostEnv);
    } catch (error) {
      const message = String(error && error.message ? error.message : error);

      if (message.includes('appendChild is not a function')) {
        dialogInfo.contentElement.innerHTML = '';
        return await instance[methodName](dialogInfo.contentElement);
      }

      throw error;
    }
  }

  _runAppCapsuleFindTopLevelFunctionNames(source) {
    const text = String(source || '');
    const names = [];
    const marker = 'function ';

    let index = 0;
    while (index < text.length) {
      const found = text.indexOf(marker, index);
      if (found < 0) {
        break;
      }

      const before = text[found - 1] || '';
      const isBoundary =
        !before ||
        before === '\n' ||
        before === '\r' ||
        before === ';' ||
        before === ' ';

      if (!isBoundary) {
        index = found + marker.length;
        continue;
      }

      let cursor = found + marker.length;
      let name = '';

      while (cursor < text.length) {
        const ch = text[cursor];
        const isLetter =
          (ch >= 'a' && ch <= 'z') ||
          (ch >= 'A' && ch <= 'Z') ||
          ch === '_' ||
          ch === '$';
        const isDigit = ch >= '0' && ch <= '9';

        if (!isLetter && !isDigit) {
          break;
        }

        name += ch;
        cursor++;
      }

      if (name && !names.includes(name)) {
        names.push(name);
      }

      index = cursor;
    }

    return names;
  }

  _runAppCapsuleShowError(contentElement, error) {
    if (!contentElement) {
      return;
    }

    const text = error && error.stack ? error.stack : String(error);

    contentElement.innerHTML = '';

    contentElement.appendChild(makeElement('pre', {
      style: {
        whiteSpace: 'pre-wrap',
        color: '#ffb3b3',
        background: '#220000',
        padding: '12px',
        margin: '0',
        height: '100%',
        overflow: 'auto',
        font: '12px monospace'
      }
    }, text));
  }

  static getMarkdown() {
      return this._doc();
    }

  static _doc_fileTreeCoordination() {
    return '## File Tree Coordination\n\nManages both the main embedded project sidebar and floating tree views. Synchronizes selection, expansion, and file dirty-states across all visible trees simultaneously.';
  }

  static _doc_workspaceMounting() {
    return '## Workspace Mounting\n\nSupports attaching external local directories (via the File System Access API) and layering them seamlessly alongside in-memory project files. It routes file reads/writes to the correct underlying store based on the file path.';
  }

  _runAppCapsuleResolveLoadedGlobal(name) {
    if (!name || typeof name !== 'string') {
      return null;
    }

    try {
      if (typeof globalThis !== 'undefined' && globalThis[name]) {
        return globalThis[name];
      }
    } catch (error) {}

    try {
      if (typeof window !== 'undefined' && window[name]) {
        return window[name];
      }
    } catch (error) {}

    try {
      return Function(
        'name',
        "try { return eval('typeof ' + name) !== 'undefined' ? eval(name) : null; } catch (error) { return null; }"
      )(name);
    } catch (error) {
      return null;
    }
  }

  _visibilityPartitionRootSuffixes() {
    return [
      "AardvarkPlaylist",
      "Basic3d",
      "BasicsWithDialogBox",
      "library",
      "vibes"
    ];
  }

  _visibilityPartitionBaseName(name) {
    const text = String(name || "").trim();
    if (!text) return "";

    for (const root of this._visibilityPartitionRootSuffixes()) {
      const suffix = " - " + root;
      if (text.endsWith(suffix)) {
        return text.slice(0, -suffix.length);
      }
    }

    return text;
  }

  _visibilityNormalizeRootForApply(root) {
    const text = String(root || "").trim();
    if (!text) return null;
    const first = text.split("/").filter(Boolean)[0];
    return first ? "/" + first : null;
  }

  _visibilityRootForTree(treeView) {
    if (!treeView) return null;

    const identity =
      typeof this.getTreeIdentity === "function"
        ? this.getTreeIdentity(treeView)
        : null;

    const direct =
      identity?.rootId ||
      identity?.root ||
      identity?.storeRootId ||
      identity?.projectRootId ||
      treeView.rootId ||
      treeView.treeRoot ||
      treeView.options?.rootId ||
      treeView.options?.treeRoot ||
      treeView.options?.storeRoot ||
      treeView.store?.rootId ||
      treeView.store?.treeRoot ||
      null;

    const normalizedDirect = this._visibilityNormalizeRootForApply(direct);
    if (normalizedDirect) return normalizedDirect;

    if (
      typeof this._visibilityApplyGuardInferTreeRoot === "function"
    ) {
      const inferred = this._visibilityApplyGuardInferTreeRoot(treeView);
      const normalizedInferred = this._visibilityNormalizeRootForApply(inferred);
      if (normalizedInferred) return normalizedInferred;
    }

    if (treeView.nodesMap && typeof treeView.nodesMap.values === "function") {
      for (const node of treeView.nodesMap.values()) {
        if (node?.type === "file" && typeof node.id === "string") {
          const root = this._visibilityNormalizeRootForApply(node.id);
          if (root) return root;
        }
      }
    }

    return null;
  }

  _visibilityInferRootFromVisibilityFiles(files) {
    for (const path of Object.keys(files || {})) {
      const root = this._visibilityNormalizeRootForApply(path);
      if (root) return root;
    }
    return null;
  }

  _visibilityGetOpenTreesForApply() {
      if (typeof this.getFileTreeViews === "function") {
        return this.getFileTreeViews().filter(Boolean);
      }
      return [];
    }

  _visibilityUnwrapStoredVisibilitySet(value) {
    if (!value) return null;

    const candidates = [
      value,
      value.set,
      value.visibilitySet,
      value.result,
      value.result?.set,
      value.result?.visibilitySet,
      value.data,
      value.data?.set,
      value.data?.visibilitySet
    ];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") continue;

      if (candidate.files && typeof candidate.files === "object") {
        return candidate;
      }

      if (candidate.settings && typeof candidate.settings === "object") {
        return {
          ...candidate,
          files: candidate.settings
        };
      }
    }

    return null;
  }

  async _visibilityReadStoredSetForApply(name) {
    if (typeof this.readStoredVisibilitySetByName !== "function") {
      return null;
    }

    const raw = await this.readStoredVisibilitySetByName(name);
    const set = this._visibilityUnwrapStoredVisibilitySet(raw);

    if (!set) return null;

    if (!set.name) {
      set.name = String(name || "");
    }

    if (!set.treeRoot) {
      set.treeRoot = this._visibilityInferRootFromVisibilityFiles(set.files);
    }

    return set;
  }

  _visibilityListStoredSetNamesForApply() {
      const names = [];

      const addName = (name) => {
        const text = String(name || "").trim();
        if (text) names.push(text);
      };

      const addListed = (listed) => {
        if (!Array.isArray(listed)) return;
        for (const item of listed) {
          if (typeof item === "string") {
            addName(item);
          } else if (item && typeof item === "object") {
            addName(item.name || item.id || item.setName);
          }
        }
      };

      if (Array.isArray(this.__visibilityParentPatchSetNames)) {
        addListed(this.__visibilityParentPatchSetNames);
      }

      if (Array.isArray(window.__visibilityParentPatchSetNames)) {
        addListed(window.__visibilityParentPatchSetNames);
      }

      try {
        if (typeof this.listStoredVisibilitySets === "function") {
          addListed(this.listStoredVisibilitySets());
        }
      } catch (error) {
        console.warn("[VisibilitySets] listStoredVisibilitySets failed", error);
      }

      try {
        if (typeof this.listStoredVisibilitySetSummaries === "function") {
          addListed(this.listStoredVisibilitySetSummaries());
        }
      } catch (error) {
        console.warn("[VisibilitySets] listStoredVisibilitySetSummaries failed", error);
      }

      try {
        if (typeof this._getSavedVisibilitySetNames === "function") {
          addListed(this._getSavedVisibilitySetNames());
        }
      } catch (error) {
        console.warn("[VisibilitySets] _getSavedVisibilitySetNames failed", error);
      }

      const app = this.app || window._dev_projectEditorInstance || window.vibesApp || null;
      const possibleEnvs = [
        app?.env,
        app?.vibesEnv,
        app?.protocolEnv,
        app?.unifiedProtocolEnv,
        window.vibesEnv,
        window.currentVibesEnv,
        window.unifiedProtocolEnv
      ];

      for (const env of possibleEnvs) {
        try {
          if (env && typeof env.listVisibilitySets === "function") {
            addListed(env.listVisibilitySets());
          }
        } catch (error) {
          console.warn("[VisibilitySets] env.listVisibilitySets failed", error);
        }
      }

      try {
        const capsule =
          window.VisibilitySetsCapsule ||
          globalThis.VisibilitySetsCapsule ||
          null;

        if (capsule) {
          const methodNames = Object.getOwnPropertyNames(capsule)
            .filter(name => name.startsWith("_set_"))
            .sort();

          for (const methodName of methodNames) {
            try {
              const set = capsule[methodName]();
              addName(set?.name);
            } catch (error) {
              console.warn("[VisibilitySets] capsule method failed", methodName, error);
            }
          }
        }
      } catch (error) {
        console.warn("[VisibilitySets] VisibilitySetsCapsule scan failed", error);
      }

      return Array.from(new Set(names)).sort();
    }

  async _visibilityCollectApplyCandidates(name) {
    const requested = String(name || "").trim();
    const base = this._visibilityPartitionBaseName(requested);
    const listedNames = await this._visibilityListStoredSetNamesForApply();

    const candidateNames = [];

    if (requested && listedNames.includes(requested)) {
      candidateNames.push(requested);
    }

    for (const listedName of listedNames) {
      if (base && listedName.startsWith(base + " - ")) {
        candidateNames.push(listedName);
      }
    }

    const uniqueNames = Array.from(new Set(candidateNames));
    const candidates = [];

    for (const candidateName of uniqueNames) {
      const set = await this._visibilityReadStoredSetForApply(candidateName);
      if (!set || !set.files) continue;

      candidates.push({
        name: candidateName,
        baseName: this._visibilityPartitionBaseName(candidateName),
        treeRoot: this._visibilityNormalizeRootForApply(
          set.treeRoot || this._visibilityInferRootFromVisibilityFiles(set.files)
        ),
        set
      });
    }

    return candidates;
  }

  normalizeVisibilityStateForApply(state) {
    if (typeof this.normalizeVisibilityState === "function") {
      return this.normalizeVisibilityState(state);
    }

    const input = state && typeof state === "object" ? state : {};

    let codeLevel = Number(input.codeLevel);
    if (!Number.isFinite(codeLevel)) {
      codeLevel = input.code ? 4 : 0;
    }
    codeLevel = Math.max(0, Math.min(4, codeLevel));

    let docsLevel = Number(input.docsLevel);
    if (!Number.isFinite(docsLevel)) {
      docsLevel = input.docs ? 4 : 0;
    }
    docsLevel = Math.max(0, Math.min(4, docsLevel));

    const signatures = !!(input.signatures || input.sig);

    return {
      code: codeLevel > 0,
      codeLevel,
      signatures,
      sig: signatures,
      docs: docsLevel > 0,
      docsLevel
    };
  }

  _visibilityClearTreeForApply(treeView) {
    let reset = 0;

    if (!treeView?.nodesMap || typeof treeView.nodesMap.values !== "function") {
      return reset;
    }

    for (const node of treeView.nodesMap.values()) {
      if (node?.type !== "file" || !node.visibilityWidget) continue;

      node.visibilityWidget.setState({
        code: false,
        codeLevel: 0,
        signatures: false,
        sig: false,
        docs: false,
        docsLevel: 0
      }, true);

      reset++;
    }

    return reset;
  }

  _visibilityApplySetToTreeDirect(treeView, set, setName, options = {}) {
    const treeRoot = this._visibilityRootForTree(treeView);

    if (!treeView?.nodesMap || !set?.files) {
      return {
        ok: false,
        setName,
        treeRoot,
        scanned: 0,
        matched: 0,
        reset: 0,
        reason: "Missing tree nodesMap or set.files."
      };
    }

    const files = set.files || {};
    const resetFirst = set.resetFirst !== false && options.resetFirst !== false;
    const missing = new Set(Object.keys(files));

    let scanned = 0;
    let matched = 0;
    let reset = 0;

    for (const node of treeView.nodesMap.values()) {
      if (node?.type !== "file" || !node.visibilityWidget) continue;

      scanned++;

      const state = files[node.id];

      if (state) {
        node.visibilityWidget.setState(
          this.normalizeVisibilityStateForApply(state),
          true
        );
        matched++;
        missing.delete(node.id);
        continue;
      }

      if (resetFirst) {
        node.visibilityWidget.setState({
          code: false,
          codeLevel: 0,
          signatures: false,
          sig: false,
          docs: false,
          docsLevel: 0
        }, true);
        reset++;
      }
    }

    try {
      treeView.redrawLines?.();
    } catch (error) {}

    try {
      treeView.options?.onVisibilityChange?.();
    } catch (error) {}

    try {
      this._notifyScopedVisibilityChange?.(treeView);
    } catch (error) {}

    try {
      this.app?.visibilityManager?.notify?.();
    } catch (error) {}

    try {
      this.app?.buildPromptTab?._widgetStateChangeCallback?.();
    } catch (error) {}

    try {
      this._refreshVisibilityTreesAfterApply?.();
    } catch (error) {}

    return {
      ok: matched > 0,
      setName,
      treeRoot,
      scanned,
      matched,
      reset,
      missingCount: missing.size,
      missingSample: Array.from(missing).slice(0, 10)
    };
  }

  removeNode(nodeId, animate = true) {
      this._forEachFileTreeView((treeView) => {
        if (typeof treeView.removeNode === 'function') {
          try {
            treeView.removeNode(nodeId);
          } catch (e) {
            console.warn('[ProjectFilesManager] Failed to remove node from floating tree:', treeView.rootId, e);
          }
        }
      });
    }

  static _doc_overview() {
      return [
        "# ProjectFilesManager",
        "",
        "The `ProjectFilesManager` is the central coordinator for all directory structures and file trees in the workspace.",
        "It bridges the gap between the `VirtualFileSystem` and the active `FileTreeView` UI views."
      ].join('\n');
    }

  static _doc_vis_sets() {
      return [
        "## Prompt Bundling and Multi-Tree Coordination",
        "",
        "Vibes supports opening multiple local directories and libraries simultaneously in floating windows.",
        "The manager coordinates this layout dynamically:",
        "- **Multi-Tree Tracking**: Tracks all active `FileTreeView` instances in its `fileTreeRegistry`.",
        "- **Prompt Bundling**: When copying a prompt, `ProjectFilesPromptBundleBuilder` traverses all open tree views, collecting checked code and documentation into a single, unified clipboard payload.",
        "- **Visibility Sets**: Reads saved visibility sets from `VisibilitySetsCapsule.js` and applies them across all active tree views, allowing complex layout configurations to be loaded instantly."
      ].join('\n');
    }

  static _doc_folder_capsules() {
      return [
        "## Folder-Level Metadata Capsules",
        "",
        "Following the capsule philosophy, directories can define their own static metadata classes in `_folder.js` files.",
        "`ProjectFolderMetaCapsuleAttacher` extracts these configurations at runtime and attaches custom descriptions and action buttons directly to the folder nodes inside the file tree, extending folder-level IDE capabilities dynamically."
      ].join('\n');
    }

  static _doc() {
      return [
        this._doc_ProjectFilesManager(),
        this._doc_overview(),
        this._doc_vis_sets(),
        this._doc_folder_capsules()
      ].join('\n\n');
    }

  getVisibilityWidgetsForStore(rootId) {
      let active = 0;
      let total = 0;
      const state = this._ensureFloatingFileTreeState?.();
      const treeInfo = state?.trees?.get(rootId);
      if (treeInfo && treeInfo.host && treeInfo.host.treeView) {
        const treeView = treeInfo.host.treeView;
        if (treeView.nodesMap) {
            for (const node of treeView.nodesMap.values()) {
              if (node.type === 'file' && node.visibilityWidget) {
                total++;
                const s = node.visibilityWidget.state;
                if (s.code || s.signatures || s.docsLevel > 0) active++;
              }
            }
        }
      }
      return { active, total };
    }

  _shouldIncludeProjectFilePath(goldenPath) {
      if (!goldenPath) return false;
      if (goldenPath.includes("/reports/")) return false;
      if (goldenPath.includes("/visibilitySets/")) return false;
      if (this.isSidecarOrMetadataFile(goldenPath)) return false;
      return true;
    }
}