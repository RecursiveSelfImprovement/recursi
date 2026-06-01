class ProjectFilesManagerBreakdownHelperFactory {
  
  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  ensureAll(manager, existing = null) {
      const helpers = existing || {};
      this.ensureMetadataAnalyzer(manager, helpers);
      this.ensureTreeDataBuilder(manager, helpers);
      this.ensureFolderMetaAttacher(manager, helpers);
      this.ensureVisibilityCoordinator(manager, helpers);
      this.ensurePromptBundleBuilder(manager, helpers);
      this.ensureVisibilitySetCapsuleReader(manager, helpers);
      this.ensureFileTreeRegistry(manager, helpers);
      this.ensureLegacyNodeApiFileBridge(manager, helpers);
      this.ensureWorkspaceTreePolicy(manager, helpers);
      this.ensureBrowserWorkspaceCleanup(manager, helpers);
      this.ensureBrowserWebRootOpener(manager, helpers);
      this.ensureBrowserWorkspaceStartupControls(manager, helpers);
      this.ensureWorkspaceTreesManager(manager, helpers);
      this.ensureFloatingTreeLauncher(manager, helpers);
      this.ensureFloatingExternalEditor(manager, helpers);
      this.ensureFloatingTreeStoreBuilder(manager, helpers);
      this.ensureVibesProjectFloatingStore(manager, helpers);
      this.ensureExternalRootsExplorer(manager, helpers);
      this.ensureExternalRootsPanel(manager, helpers);
      
      this.ensureVisibleNodeRunnerTools(manager, helpers);
      this.ensureVisibilityToolbarTools(manager, helpers);
      this.ensureSearchController(manager, helpers);
      this.ensureTreeOperations(manager, helpers);
      this.ensureDialogActions(manager, helpers);
      this.ensurePromptSizeEstimator(manager, helpers);
      this.ensureWorkspaceRootOperations(manager, helpers);
      this.ensureEditorBridge(manager, helpers);
      this.ensureVisibilitySetFilterController(manager, helpers);
      this.ensureFloatingTreeStoreDialogController(manager, helpers);
      return helpers;
    }

  ensureMetadataAnalyzer(manager, helpers) {
    if (
      !helpers.metadataAnalyzer &&
      typeof ProjectFilesMetadataAnalyzer !== "undefined"
    ) {
      helpers.metadataAnalyzer = new ProjectFilesMetadataAnalyzer({
        app: manager.app,
        acorn: this.getAcorn(manager)
      });
    }

    return helpers.metadataAnalyzer || null;
  }

  ensureTreeDataBuilder(manager, helpers) {
    if (
      !helpers.treeDataBuilder &&
      typeof ProjectFileTreeDataBuilder !== "undefined"
    ) {
      helpers.treeDataBuilder = new ProjectFileTreeDataBuilder({
        projectName: manager.projectName || manager.app?.projectName || "",
        metadataAnalyzer: helpers.metadataAnalyzer || null
      });
    }

    if (helpers.treeDataBuilder) {
      helpers.treeDataBuilder.projectName =
        manager.projectName || manager.app?.projectName || "";
      helpers.treeDataBuilder.metadataAnalyzer =
        helpers.metadataAnalyzer || helpers.treeDataBuilder.metadataAnalyzer || null;
    }

    return helpers.treeDataBuilder || null;
  }

  ensureFolderMetaAttacher(manager, helpers) {
    if (
      !helpers.folderMetaAttacher &&
      typeof ProjectFolderMetaCapsuleAttacher !== "undefined"
    ) {
      helpers.folderMetaAttacher = new ProjectFolderMetaCapsuleAttacher({
        app: manager.app,
        acorn: this.getAcorn(manager),
        getFileContent: async (path) => {
          if (typeof manager.getFileContent === "function") {
            return await manager.getFileContent(path);
          }

          return null;
        }
      });
    }

    return helpers.folderMetaAttacher || null;
  }

  ensureVisibilityCoordinator(manager, helpers) {
    if (
      !helpers.visibilityCoordinator &&
      typeof ProjectFilesVisibilityCoordinator !== "undefined"
    ) {
      helpers.visibilityCoordinator = new ProjectFilesVisibilityCoordinator({
        app: manager.app
      });
    }

    return helpers.visibilityCoordinator || null;
  }

  ensurePromptBundleBuilder(manager, helpers) {
    if (
      !helpers.promptBundleBuilder &&
      typeof ProjectFilesPromptBundleBuilder !== "undefined"
    ) {
      helpers.promptBundleBuilder = new ProjectFilesPromptBundleBuilder({
        app: manager.app,
        manager
      });
    }

    return helpers.promptBundleBuilder || null;
  }

  ensureVisibilitySetCapsuleReader(manager, helpers) {
    if (
      !helpers.visibilitySetCapsuleReader &&
      typeof ProjectVisibilitySetCapsuleReader !== "undefined"
    ) {
      helpers.visibilitySetCapsuleReader =
        new ProjectVisibilitySetCapsuleReader({
          app: manager.app,
          manager,
          acorn: this.getAcorn(manager)
        });
    }

    return helpers.visibilitySetCapsuleReader || null;
  }

  ensureFileTreeRegistry(manager, helpers) {
      if (
        !helpers.fileTreeRegistry &&
        typeof ProjectFileTreeRegistry !== "undefined"
      ) {
        helpers.fileTreeRegistry = new ProjectFileTreeRegistry({
          manager
        });
      }

      return helpers.fileTreeRegistry || null;
    }

  

  getAcorn(manager) {
    return (
      manager?.app?.codeParser?.acorn ||
      (typeof window !== "undefined" ? window.acorn : null) ||
      (typeof globalThis !== "undefined" ? globalThis.acorn : null)
    );
  }

  ensureLegacyNodeApiFileBridge(manager, helpers) {
      return helpers;
    }

  ensureWorkspaceTreePolicy(manager, helpers) {
      return helpers;
    }

  ensureBrowserWorkspaceCleanup(manager, helpers) {
      return helpers;
    }

  ensureBrowserWebRootOpener(manager, helpers) {
    if (
      !helpers.browserWebRootOpener &&
      typeof ProjectBrowserWebRootOpener !== "undefined"
    ) {
      helpers.browserWebRootOpener = new ProjectBrowserWebRootOpener({
        manager
      });
    }

    return helpers.browserWebRootOpener || null;
  }

  ensureBrowserWorkspaceStartupControls(manager, helpers) {
      return helpers;
    }

  ensureWorkspaceTreesManager(manager, helpers) {
      return helpers;
    }

  ensureFloatingTreeLauncher(manager, helpers) {
    if (
      !helpers.floatingTreeLauncher &&
      typeof ProjectFloatingTreeLauncher !== "undefined"
    ) {
      helpers.floatingTreeLauncher = new ProjectFloatingTreeLauncher({
        manager
      });
    }

    return helpers.floatingTreeLauncher || null;
  }

  ensureFloatingExternalEditor(manager, helpers) {
    if (
      !helpers.floatingExternalEditor &&
      typeof ProjectFloatingExternalEditor !== "undefined"
    ) {
      helpers.floatingExternalEditor = new ProjectFloatingExternalEditor({
        manager
      });
    }

    return helpers.floatingExternalEditor || null;
  }

  ensureFloatingTreeStoreBuilder(manager, helpers) {
    if (
      !helpers.floatingTreeStoreBuilder &&
      typeof ProjectFloatingTreeStoreBuilder !== "undefined"
    ) {
      helpers.floatingTreeStoreBuilder = new ProjectFloatingTreeStoreBuilder({
        manager
      });
    }

    return helpers.floatingTreeStoreBuilder || null;
  }

  ensureVibesProjectFloatingStore(manager, helpers) {
    if (
      !helpers.vibesProjectFloatingStore &&
      typeof ProjectVibesProjectFloatingStore !== "undefined"
    ) {
      helpers.vibesProjectFloatingStore = new ProjectVibesProjectFloatingStore({
        manager
      });
    }

    return helpers.vibesProjectFloatingStore || null;
  }

  ensureExternalRootsExplorer(manager, helpers) {
      return helpers;
    }

  ensureExternalRootsPanel(manager, helpers) {
      return helpers;
    }

  ensureSidecarWorkspaceTools(manager, helpers) {
    if (
      !helpers.sidecarWorkspaceTools &&
      typeof ProjectSidecarWorkspaceTools !== "undefined"
    ) {
      helpers.sidecarWorkspaceTools = new ProjectSidecarWorkspaceTools({
        manager
      });
    }

    return helpers.sidecarWorkspaceTools || null;
  }

  ensureVisibleNodeRunnerTools(manager, helpers) {
    if (
      !helpers.visibleNodeRunnerTools &&
      typeof ProjectVisibleNodeRunnerTools !== "undefined"
    ) {
      helpers.visibleNodeRunnerTools = new ProjectVisibleNodeRunnerTools({
        manager
      });
    }

    return helpers.visibleNodeRunnerTools || null;
  }

  ensureVisibilityToolbarTools(manager, helpers) {
    if (
      !helpers.visibilityToolbarTools &&
      typeof ProjectVisibilityToolbarTools !== "undefined"
    ) {
      helpers.visibilityToolbarTools = new ProjectVisibilityToolbarTools({
        manager
      });
    }

    return helpers.visibilityToolbarTools || null;
  }

  ensureSidebarChrome(manager, helpers) {
      return helpers;
    }

  ensureSidebarResize(manager, helpers) {
      return helpers;
    }

  ensureSearchController(manager, helpers) {
    if (
      !helpers.searchController &&
      typeof ProjectFilesSearchController !== "undefined"
    ) {
      helpers.searchController = new ProjectFilesSearchController({ manager });
    }

    return helpers.searchController || null;
  }

  ensureTreeOperations(manager, helpers) {
    if (
      !helpers.treeOperations &&
      typeof ProjectFilesTreeOperations !== "undefined"
    ) {
      helpers.treeOperations = new ProjectFilesTreeOperations({ manager });
    }

    return helpers.treeOperations || null;
  }

  ensureDialogActions(manager, helpers) {
    if (
      !helpers.dialogActions &&
      typeof ProjectFilesDialogActions !== "undefined"
    ) {
      helpers.dialogActions = new ProjectFilesDialogActions({ manager });
    }

    return helpers.dialogActions || null;
  }

  ensurePromptSizeEstimator(manager, helpers) {
    if (
      !helpers.promptSizeEstimator &&
      typeof ProjectFilesPromptSizeEstimator !== "undefined"
    ) {
      helpers.promptSizeEstimator = new ProjectFilesPromptSizeEstimator({
        manager
      });
    }

    return helpers.promptSizeEstimator || null;
  }

  ensureWorkspaceRootOperations(manager, helpers) {
    if (
      !helpers.workspaceRootOperations &&
      typeof ProjectWorkspaceRootOperations !== "undefined"
    ) {
      helpers.workspaceRootOperations = new ProjectWorkspaceRootOperations({
        manager
      });
    }

    return helpers.workspaceRootOperations || null;
  }

  ensureEditorBridge(manager, helpers) {
    if (
      !helpers.editorBridge &&
      typeof ProjectFilesEditorBridge !== "undefined"
    ) {
      helpers.editorBridge = new ProjectFilesEditorBridge({ manager });
    }

    return helpers.editorBridge || null;
  }

  ensureVisibilitySetFilterController(manager, helpers) {
    if (
      !helpers.visibilitySetFilterController &&
      typeof ProjectVisibilitySetFilterController !== "undefined"
    ) {
      helpers.visibilitySetFilterController =
        new ProjectVisibilitySetFilterController({ manager });
    }

    return helpers.visibilitySetFilterController || null;
  }

  ensureFloatingTreeStoreDialogController(manager, helpers) {
    if (
      !helpers.floatingTreeStoreDialogController &&
      typeof ProjectFloatingTreeStoreDialogController !== "undefined"
    ) {
      helpers.floatingTreeStoreDialogController =
        new ProjectFloatingTreeStoreDialogController({ manager });
    }

    return helpers.floatingTreeStoreDialogController || null;
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
}