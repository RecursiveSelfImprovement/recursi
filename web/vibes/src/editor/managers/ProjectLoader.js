class ProjectLoader {
  
  constructor(app) {
      this.app = app;
    }

  async boot(options = {}) {
        try {
          this.app.uiManager.setStatus('Booting project environment...');
          const projectName =
            options.projectName || this.app.projectName || 'project';
          this.app.projectName = projectName;
          this.app.sourceProjectName = options.sourceProjectName || projectName;
          document.title = `${projectName} - Recursi`;

          // Enable hidden creation mode before building shell & dialogs
          if (typeof UITools !== 'undefined') {
            UITools.creationVisibilityMode = 'hidden';
          }

          await this._bootShell();
          await this._mountStores(options);
          await this._openPatchLayer();
          await this._prewarmCache();
          await this._buildFileTree();
          await this._initializeUI();

          // Arrange windows beautifully while they are invisible (opacity: 0.01)
          if (this.app.actionHandler && typeof this.app.actionHandler.handleRearrangeWindows === 'function') {
            this.app.actionHandler.handleRearrangeWindows({ silent: true, instant: true });
          }

          // Cascade Boot: reveal all hidden dialogs simultaneously and restore normal mode
          if (typeof UITools !== 'undefined') {
            UITools.revealHiddenDialogs();
            UITools.creationVisibilityMode = 'visible';
          }

          this.app.uiManager.setStatus('Ready.', false, 4000);
          return { ok: true };
        } catch (error) {
          console.error('Boot failed:', error);
          if (typeof UITools !== 'undefined') {
            UITools.creationVisibilityMode = 'visible';
          }
          this.app.uiManager.setStatus(`Boot failed: ${error.message}`, true);
          return { ok: false, error: error.message };
        }
      }

  async _bootShell() {
      if (this.app.isUiReady) {
        const tabsToKeep = ['project-browser-tab', 'build-prompt-tab', 'output-tab'];
        if (this.app.tabManager) {
          const allTabIds = Array.from(this.app.tabManager.tabs.keys());
          for (const tabId of allTabIds) {
            if (!tabsToKeep.includes(tabId)) {
              this.app.tabOrchestrator.removeTab(tabId);
            }
          }
        }
        
        for (const [id, ctrl] of this.app.editorControllers.entries()) {
          if (!tabsToKeep.includes(id)) {
            this.app.editorControllers.delete(id);
          }
        }
        this.app.activeEditorController = null;
        return;
      }

      if (this.app.tabManager) {
        this.app.tabManager.closeAllTabs(true);
      }
      this.app.editorControllers.clear();
      this.app.activeEditorController = null;
      this.app.rootContainer.innerHTML = '';

      this.app.uiManager.createLayout();
      this.app.uiManager.renderGlobalControls();

      this.app.buildPromptTab = new this.app.BuildPromptTab(this.app);
      this.app.outputTab = new this.app.OutputTab(this.app);

      this.app.tabManager = new this.app.TabManager(
        this.app.mainContentContainer,
        this.app.actionHandler.handleTabChange.bind(this.app.actionHandler),
        this.app.actionHandler.handleTabCloseRequest.bind(this.app.actionHandler),
        this.app.appearanceManager,
        this.app.actionHandler.handleCloseAllTabs.bind(this.app.actionHandler),
        this.app.visibilityManager,
        null
      );

      // Pass the instance-bound reference directly to TabManager to avoid global lookups:
      this.app.tabManager.app = this.app;

      this.app.tabManager.addTabAtStart(
        'Prompt Output',
        this.app.outputTab.getElement(),
        true,
        'output-tab'
      );

      this.app.tabManager.addTabAtStart(
        'Build Prompt',
        this.app.buildPromptTab.getElement(),
        true,
        'build-prompt-tab'
      );

      this.app.tabOrchestrator.createProjectBrowserTab();

      this.app.tabManager.onDirtyIndicatorClick = (tabId) => {
        const controller = this.app.editorControllers.get(tabId);
        if (controller && controller.isDirty) {
          controller.showDiff();
        }
      };
    }

  async _mountStores(options) {
      if (!this.app.inMemoryFileStore) {
        this.app.inMemoryFileStore = new Map();
      }

      if (typeof VirtualFileSystem === 'undefined') {
        await this.app._ensureVirtualFileSystemLoaded();
      }

      if (!this.app.vfs) {
        this.app.vfs = new VirtualFileSystem(this.app);
      }

      this.app.vfs.setMemoryStore(this.app.inMemoryFileStore);
      this.app.vfs.setStaticRoot('');

      if (options.localDirStore) {
        this.app.localDirectoryStore = options.localDirStore;
        this.app.vfs.setLocalStore(options.localDirStore);
        if (!this.app.workspaceFileStores) {
          this.app.workspaceFileStores = new Map();
        }
        this.app.workspaceFileStores.set(
          '/' + this.app.projectName,
          options.localDirStore
        );
      } else {
        this.app.localDirectoryStore = null;
        this.app.vfs.setLocalStore(null);
      }

      if (options.unpackedFileMap) {
        for (const [path, content] of options.unpackedFileMap.entries()) {
          const pathObj = this.app.createPath(path);
          this.app.inMemoryFileStore.set(pathObj.toString(), content);
        }
      }

      try {
        await this._hydrateHostedLibraryFilesForVisibleProject(
          this.app.inMemoryFileStore
        );
      } catch (error) {
        console.warn('Library hydration failed:', error);
      }
    }

  async _openPatchLayer() {
      if (
        typeof VibesPatchStore === 'undefined' ||
        typeof PatchManager === 'undefined'
      ) {
        console.warn('Patch layer classes not loaded.');
        return;
      }

      if (!this.app.patchManager) {
        this.app.patchManager = new PatchManager(this.app);
        await this.app.patchManager.init();
      }

      const mode = this.app.patchManager.getPatchMode();
      this.app.uiManager.setUIMode(mode);
    }

  async _prewarmCache() {
      if (!this.app.patchStore || !this.app.vfs) return;

      const patchedFiles = await this.app.patchStore.listPatchedFiles();
      const allFiles = new Set([
        ...patchedFiles,
        ...Array.from(this.app.inMemoryFileStore.keys()),
      ]);

      for (const path of allFiles) {
        if (!path.startsWith('/library/')) {
          const patches = await this.app.patchStore.getPatchesForFile(path);
          if (patches && Object.keys(patches).length > 0) {
            const reconstructed = await this.app.vfs._reconstructFromPatches(
              path
            );
            if (reconstructed) {
              this.app.inMemoryFileStore.set(path, reconstructed);
            }
          }
        }
      }
    }

  async _buildFileTree() {
      const allPaths = new Set();

      const projectFilesData = await this._fetchStaticManifest(this.app.projectName);
      if (projectFilesData) {
        const staticInfos = [
          ...(projectFilesData.js || []),
          ...(projectFilesData.html || []),
          ...(projectFilesData.css || []),
          ...(projectFilesData.other || []),
        ];
        for (const info of staticInfos) {
          if (info.path) allPaths.add(info.path);
        }
      }

      if (this.app.vfs) {
        const vfsFiles = await this.app.vfs.listFiles({ includeStatic: false });
        for (const path of vfsFiles) {
          allPaths.add(path);
        }
      }

      this.app.inMemoryFileMetadata = await this._calculateInMemoryMetadata();

      this.app.projectFilesManager =
        new (await this.app._getProjectFilesManagerClassAsync())(
          this.app,
          (nodeInfo) => {
             const path = nodeInfo.id;
             const rootId = '/' + path.split('/').filter(Boolean)[0];
             const store = this.app.workspaceFileStores?.get(rootId) || this.app.inMemoryFileStore;
             this.app.projectFilesManager._openFloatingExternalEditorWindow(path, store);
          },
          this.app.actionHandler.handlePackAndSave.bind(this.app.actionHandler),
          this.app.runHtmlInIframe.bind(this)
        );

      await this.app.rebuildSymbolMap();

      // Deprecated toggleSidebarVisibility call has been completely removed.

      try {
        await this._showHostedLibraryTreeFromServer(this.app.inMemoryFileMetadata);
      } catch (e) {
        console.warn('Hosted library tree result failed:', e);
      }
    }

  async _initializeUI() {
      this.app.uiManager.updateGlobalButtonStates();
      this.app.isUiReady = true;

      if (this.app.actionHandler && typeof this.app.actionHandler.injectVfsToggle === 'function') {
        this.app.actionHandler.injectVfsToggle();
      }

      if (!this.app.isStaticMode && this.app.actionHandler && typeof this.app.actionHandler.handlePushToRunner === 'function') {
        await this.app.actionHandler.handlePushToRunner();
      }
    }
 async bootForStaticEdit(projectName) {
      console.log(`[ProjectLoader] 🚀 bootForStaticEdit initiated for: ${projectName}`);
      
      if (!window._vibesPopStateAttached) {
        window.addEventListener('popstate', (e) => {
          const params = new URLSearchParams(window.location.search);
          const sp = params.get('project');
          const app = window.vibesApp || window.projectApp;
          if (!app) return;

          if (!sp && app.projectName) {
            if (app.activeInjector) {
              app.activeInjector.destroy();
              app.activeInjector = null;
            }
            if (app.projectFilesManager?.floatingFileTreeState?.trees) {
              for (const tree of app.projectFilesManager.floatingFileTreeState.trees.values()) {
                if (tree.dialog && typeof tree.dialog.close === 'function') tree.dialog.close();
              }
              app.projectFilesManager.floatingFileTreeState.trees.clear();
            }
            app.projectName = null;
            app.sourceProjectName = null;
            app.workspaceFileStores?.clear();
            document.title = 'Recursi - Select Project';
            
            if (app.tabManager && app.tabManager.tabs.has('project-browser-tab')) {
              app.tabManager.setActiveTab('project-browser-tab');
            }
          } else if (sp && sp !== app.projectName) {
            app.projectLoader.bootForStaticEdit(sp);
          }
        });
        window._vibesPopStateAttached = true;
      }

      try {
        const url = new URL(window.location);
        url.searchParams.delete('static_project');
        url.searchParams.delete('in-memory-project');
        url.searchParams.set('project', projectName);
        window.history.pushState({}, `Recursi - ${projectName}`, url.toString());

        if (this.app.projectName && this.app.projectName !== projectName) {
          if (this.app.activeInjector) {
            this.app.activeInjector.destroy();
            this.app.activeInjector = null;
          }
          if (this.app.projectFilesManager?.floatingFileTreeState?.trees) {
            for (const tree of this.app.projectFilesManager.floatingFileTreeState.trees.values()) {
              if (tree.dialog && typeof tree.dialog.close === 'function') {
                tree.dialog.close();
              }
            }
            this.app.projectFilesManager.floatingFileTreeState.trees.clear();
          }
        }

        console.log('[ProjectLoader] Step 1: Booting shell...');
        await this._bootShell();

        if (this.app.workspaceFileStores) this.app.workspaceFileStores.clear();
        this.app.localDirectoryStore = null;
        this.app.localDirStore = null;

        if (!this.app.inMemoryFileStore) this.app.inMemoryFileStore = new Map();
        else this.app.inMemoryFileStore.clear();

        console.log('[ProjectLoader] Step 2: Mounting stores...');
        await this._mountStores({});
        await this._openPatchLayer(); 
        await this._prewarmCache();

        console.log('[ProjectLoader] Step 3: Fetching files...');
        const toFetch = new Set();
        
        const manifest = await this._fetchStaticManifest(projectName);
        if (manifest) {
          const allManifestInfos = [ 
            ...(manifest.html || []), 
            ...(manifest.js || []), 
            ...(manifest.css || []), 
            ...(manifest.other || []) 
          ];
          for (const info of allManifestInfos) {
            if (info.path) toFetch.add(info.path);
          }
        }

        if (this.app.vfs) {
          try {
            const files = await this.app.vfs.listFiles({ includeStatic: true });
            const prefix = `/${projectName}/`;
            for (const file of files) {
              if (file.startsWith(prefix) && !file.includes('/node_modules/') && !file.includes('/.git/')) {
                toFetch.add(file);
              }
            }
          } catch (e) {
            console.warn('[bootForStaticEdit] VFS listFiles failed', e);
          }
        }
        
        if (toFetch.size === 0 && typeof ProjectCatalogCapsule !== 'undefined') {
          const info = ProjectCatalogCapsule.findProject(projectName);
          if (info?.project?.entryFile) {
            toFetch.add(info.project.entryFile);
          }
        }

        for (let path of toFetch) {
          if (path.startsWith('http') || path.startsWith('//') || path.startsWith('/library/')) continue;
          
          let cleanPath = path.replace(/^\.\//, '');
          if (!cleanPath.startsWith('/')) cleanPath = `/${projectName}/${cleanPath}`;

          if (this.app.inMemoryFileStore.has(cleanPath)) continue;

          let content = null;
          try { content = await this.app.vfs.readFile(cleanPath, { nullOnMissing: true }); } catch(e) {}
          if (!content) {
            try {
              const r = await fetch(cleanPath + '?_=' + Date.now());
              if (r.ok) content = await r.text();
            } catch(e) {}
          }
          if (content) {
            this.app.inMemoryFileStore.set(cleanPath, content);
          }
        }

        if (this.app.projectFilesManager) {
          const pfm = this.app.projectFilesManager;
          const store = {
            _projectName: projectName,
            name: projectName,
            rootId: `/${projectName}`,
            readOnly: false,
            keys: () => Array.from(this.app.inMemoryFileStore.keys()).filter(k => k.startsWith(`/${projectName}/`) || k === `/${projectName}`),
            entries() { return this.keys().map(k => [k, this.get(k)]); },
            has: (p) => this.app.inMemoryFileStore.has(p),
            get: (p) => this.app.inMemoryFileStore.get(p),
            readFile: async (p) => this.app.inMemoryFileStore.get(p),
            set: async (p, c) => {
              this.app.inMemoryFileStore.set(p, c);
              if (this.app.vfs && typeof this.app.vfs._diffAndPatch === 'function') {
                await this.app.vfs._diffAndPatch(p, c);
              }
            },
            delete: async (p) => {
              this.app.inMemoryFileStore.delete(p);
              if (this.app.patchManager) await this.app.patchManager.revertFilePatch(p);
            }
          };
          
          if (!this.app.workspaceFileStores) this.app.workspaceFileStores = new Map();
          this.app.workspaceFileStores.set(`/${projectName}`, store);
          
          if (typeof pfm.openFloatingTreeForStore === 'function') {
            pfm.openFloatingTreeForStore(`/${projectName}`, store);
          } else if (typeof pfm._callOpenFloatingTreeForStore === 'function') {
            pfm._callOpenFloatingTreeForStore(`/${projectName}`, store, projectName);
          }
        }

        const isRecursiveVibes = projectName === 'vibes' && (window.projectApp && window.projectApp !== this.app);
        
        if (!isRecursiveVibes) {
          if (typeof InWindowScriptInjector === 'undefined') {
            await this.app._loadClassicScriptOnce('/vibes/src/tools/runner/InWindowScriptInjector.js');
          }

          if (typeof InWindowScriptInjector !== 'undefined') {
            const injector = new InWindowScriptInjector(this.app, { projectName });
            await injector.launch();
          }
        }

        console.log('[ProjectLoader] Step 4: Initializing UI...');
        await this._initializeUI();

        this.app.uiManager.setStatus(`${projectName} loaded natively.`, false, 4000);
        return { ok: true };
      } catch (error) {
        console.error('[bootForStaticEdit] failed:', error);
        this.app.uiManager.setStatus(`Edit failed: ${error.message}`, true);
        return { ok: false, error: error.message };
      }
    }

  async bootFromStaticServer(projectName) {
      return await this.boot({ projectName });
    }

  async bootFromUnpacked(fileMap, projectName, sourceProjectName = null) {
      const url = new URL(window.location);
      url.searchParams.delete('project');
      url.searchParams.set('project', projectName);
      window.history.pushState({}, `Recursi - ${projectName}`, url.toString());

      const goldenPathFileMap = new Map();
      for (const [path, content] of fileMap.entries()) {
        const pathObj = this.app.createPath(path);
        goldenPathFileMap.set(pathObj.toString(), content);
      }

      return await this.boot({
        unpackedFileMap: goldenPathFileMap,
        projectName,
        sourceProjectName,
      });
    }

  async bootFromLocalDirectory(store) {
      const url = new URL(window.location);
      url.searchParams.delete('project');
      url.searchParams.delete('static_project');
      url.searchParams.delete('in-memory-project');
      window.history.pushState(
        {},
        `Recursi - ${store._projectName}`,
        url.toString()
      );

      return await this.boot({
        localDirStore: store,
        projectName: store._projectName,
      });
    }

  async attachLocalDirectory(store) {
      this.app.localDirectoryStore = store;
      if (!this.app.vfs) this.app.vfs = new VirtualFileSystem(this.app);
      this.app.vfs.setLocalStore(store);

      if (!this.app.workspaceFileStores) {
        this.app.workspaceFileStores = new Map();
      }
      this.app.workspaceFileStores.set('/' + store._projectName, store);

      if (this.app.patchManager) {
        await this.app.patchManager.promoteToLocalDir();
        const mode = this.app.patchManager.getPatchMode();
        this.app.uiManager.setUIMode(mode);
      }

      await this._buildFileTree();
    }

  async loadProjectFromServer() {
      return await this.bootFromStaticServer(this.app.projectName);
    }

async loadStaticProjectFromServerFiles() {
      return await this.bootForStaticEdit(this.app.projectName);
    }
  
  async loadProjectFromUnpacked(
      fileMap,
      newProjectName,
      fileMetadata = null,
      sourceProjectName = null
    ) {
      return await this.bootFromUnpacked(
        fileMap,
        newProjectName,
        sourceProjectName
      );
    }

  async loadProjectFromLocalDirectory(store) {
      return await this.bootFromLocalDirectory(store);
    }

  async loadProjectFromLocalDirectoryPicker() {
      const pfm = this.app?.projectFilesManager;
      if (pfm && typeof pfm.openBrowserWebRootFromPicker === 'function') {
        this.app.uiManager?.setStatus?.(
          'Use browser web-root mode: choose the parent web/ folder.'
        );
        return await pfm.openBrowserWebRootFromPicker();
      }
      this.app.uiManager?.setStatus?.(
        'Browser web-root picker is not available yet.',
        true
      );
      return { ok: false, reason: 'openBrowserWebRootFromPicker missing' };
    }

  async checkForSavedLocalDir() {}

  async _fetchStaticManifest(projectName) {
      if (!projectName) return null;

      try {
        const filesRes = await fetch(
          `/${projectName}/files.json?_=${Date.now()}`
        );
        if (filesRes.ok) {
          const filesJson = await filesRes.json();
          const js = [];
          const css = [];
          const other = [];

          const mainFile = Array.isArray(filesJson.main)
            ? filesJson.main[0]
            : filesJson.main;
          if (mainFile) {
            js.push({ path: `/${projectName}/${mainFile.replace(/^\.\//, '')}` });
          }

          for (const loc of filesJson.local || []) {
            const path = `/${projectName}/${loc.replace(/^\.\//, '')}`;
            if (loc.endsWith('.css')) css.push({ path });
            else if (loc.endsWith('.js')) js.push({ path });
            else other.push({ path });
          }

          // EXTENSION: Support server/backend files
          // Added to 'other' so they are cloned during a Fork, but not executed in the browser
          for (const srv of filesJson.server || []) {
            const path = `/${projectName}/${srv.replace(/^\.\//, '')}`;
            other.push({ path });
          }

          return {
            html: [
              { path: `/${projectName}/index.html` },
              { path: `/${projectName}/files.json` },
            ],
            js,
            css,
            other,
          };
        }
      } catch (e) {
        console.warn(
          `[ProjectLoader] Failed to fetch files.json for ${projectName}`,
          e
        );
      }

      try {
        const htmlRes = await fetch(`/${projectName}/index.html?_=${Date.now()}`);
        if (htmlRes.ok) {
          const htmlContent = await htmlRes.text();
          const scanner =
            typeof HTMLDependencyScanner !== 'undefined'
              ? HTMLDependencyScanner
              : window.HTMLDependencyScanner;
          let js = [];
          let css = [];
          if (scanner) {
            const deps = scanner.scan(htmlContent, `/${projectName}/index.html`);
            js = deps.scripts.map((s) => ({ path: s }));
            css = deps.styles.map((s) => ({ path: s }));
          }
          return {
            html: [{ path: `/${projectName}/index.html` }],
            js: js,
            css: css,
            other: [],
          };
        }
      } catch (e) {
        console.warn(
          `[ProjectLoader] Failed to fetch index.html for ${projectName}`,
          e
        );
      }
      return null;
    }

  async _calculateInMemoryMetadata(fileMap = null) {
      console.log('[ProjectLoader] Calculating metadata from VFS...');
      const metadata = {};
      const docPathMap = new Map();

      const allPaths = new Set();
      if (fileMap) {
        for (const p of fileMap.keys()) allPaths.add(p);
      } else {
        if (this.app.vfs) {
          const vfsFiles = await this.app.vfs.listFiles({ includeStatic: false });
          vfsFiles.forEach((p) => allPaths.add(p));
        }
        if (this.app.inMemoryFileStore) {
          for (const p of this.app.inMemoryFileStore.keys()) allPaths.add(p);
        }

        const manifest = await this._fetchStaticManifest(this.app.projectName);
        if (manifest) {
          [
            ...(manifest.js || []),
            ...(manifest.css || []),
            ...(manifest.html || []),
            ...(manifest.other || []),
          ].forEach((i) => {
            if (i.path) allPaths.add(i.path);
          });
        }
      }

      const isDev = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.search.includes('dev=true') || 
                    window.location.search.includes('useDB=true');

      for (const goldenPath of allPaths) {
        let content = null;
        if (fileMap && fileMap.has(goldenPath)) {
          content = fileMap.get(goldenPath);
        } else if (
          this.app.inMemoryFileStore &&
          this.app.inMemoryFileStore.has(goldenPath)
        ) {
          content = this.app.inMemoryFileStore.get(goldenPath);
        } else if (this.app.vfs && isDev) { // Only fetch from VFS on dev (localhost)
          try {
            content = await this.app.vfs.readFile(goldenPath, {
              nullOnMissing: true,
            });
          } catch (e) {}
        }

        if (goldenPath.includes('/documentation/')) {
          docPathMap.set(goldenPath, content);
          continue;
        }

        const lineCount =
          typeof content === 'string' ? content.split('\n').length : 1;
        let internalDocSize = 0;
        let isStrictCapsule = false;
        let isPureDocCapsule = false;

        if (goldenPath.endsWith('.js') && typeof content === 'string') {
          const acorn = this.app?.codeParser?.acorn || window.acorn;
          if (acorn) {
            try {
              const ast = acorn.parse(content, {
                ecmaVersion: 'latest',
                sourceType: 'module',
              });
              const bodyNodes = ast.body.filter(
                (n) => n.type !== 'EmptyStatement'
              );
              const classNodes = bodyNodes.filter(
                (n) =>
                  n.type === 'ClassDeclaration' ||
                  (n.type.startsWith('Export') &&
                    n.declaration?.type === 'ClassDeclaration')
              );
              const imports = bodyNodes.filter(
                (n) => n.type === 'ImportDeclaration'
              );
              const exports = bodyNodes.filter((n) =>
                n.type.startsWith('Export')
              );
              const loose = bodyNodes.filter(
                (n) =>
                  n.type !== 'ClassDeclaration' &&
                  n.type !== 'ImportDeclaration' &&
                  !n.type.startsWith('Export')
              );

              if (
                classNodes.length === 1 &&
                imports.length === 0 &&
                exports.length === 0 &&
                loose.length === 0
              ) {
                isStrictCapsule = true;
                isPureDocCapsule = true;
              }

              if (classNodes.length === 1) {
                const cls =
                  classNodes[0].type === 'ClassDeclaration'
                    ? classNodes[0]
                    : classNodes[0].declaration;
                for (const member of cls.body.body || []) {
                  if (member.type === 'MethodDefinition') {
                    const name = member.key?.name || member.key?.value;
                    if (
                      name &&
                      (name.startsWith('_doc') || name.startsWith('_meta'))
                    ) {
                      const mLines = content
                        .slice(member.start, member.end)
                        .split('\n').length;
                      internalDocSize += mLines;
                    } else if (name !== 'getMetadata') {
                      isPureDocCapsule = false;
                    }
                  } else if (member.type === 'PropertyDefinition') {
                    isPureDocCapsule = false;
                  }
                }
              }
            } catch (e) {}
          }
        }

        metadata[goldenPath] = {
          codeSize: lineCount,
          docSize: internalDocSize,
          isStrictCapsule,
          isPureDocCapsule,
        };
      }

      for (const sourceGoldenPath in metadata) {
        const sourcePathObj = this.app.createPath(sourceGoldenPath);
        const docPathObj = sourcePathObj.documentationPath;
        if (docPathObj) {
          const docGoldenPath = docPathObj.toString();
          if (docPathMap.has(docGoldenPath)) {
            const docContent = docPathMap.get(docGoldenPath);
            metadata[sourceGoldenPath].docSize += docContent
              ? docContent.split('\n').length
              : 0;
          }
        }
      }
      return metadata;
    }

  _transformPathsToTreeData(paths) {
      const roots = {};
      const nodeMap = new Map();
      const sortedPaths = paths.sort();

      for (const goldenPath of sortedPaths) {
        if (
          goldenPath.includes('/documentation/') ||
          goldenPath.includes('/visibilitySets/') ||
          goldenPath.endsWith('/_meta.js') ||
          goldenPath.endsWith('/_folder.js')
        ) {
          continue;
        }

        const pathSegments = goldenPath.substring(1).split('/');
        if (pathSegments.length === 0 || pathSegments[0] === '') continue;

        const rootName = pathSegments[0];
        if (rootName === 'Project Browser') continue;

        const rootId = `/${rootName}`;

        if (!roots[rootId]) {
          const isRootFile = pathSegments.length === 1;
          roots[rootId] = {
            id: rootId,
            name: rootName,
            type: isRootFile ? 'file' : 'directory',
            children: isRootFile ? undefined : [],
            isExpanded: !isRootFile,
            readOnly: false,
          };
          nodeMap.set(rootId, roots[rootId]);
          if (isRootFile) continue;
        }

        let currentParentNode = roots[rootId];
        let builtPath = rootId;

        for (let i = 1; i < pathSegments.length; i++) {
          const partName = pathSegments[i];
          builtPath += `/${partName}`;
          let childNode = nodeMap.get(builtPath);

          if (!childNode) {
            const isLastSegment = i === pathSegments.length - 1;
            childNode = {
              id: builtPath,
              name: partName,
              type: isLastSegment ? 'file' : 'directory',
              readOnly: false,
              children: isLastSegment ? undefined : [],
              isExpanded: !isLastSegment,
            };
            currentParentNode.children.push(childNode);
            nodeMap.set(builtPath, childNode);
          }
          currentParentNode = childNode;
        }
      }

      const finalRoots = Object.values(roots);

      const sortNodes = (node) => {
        if (node.children?.length > 0) {
          node.children.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          node.children.forEach(sortNodes);
        }
      };
      finalRoots.forEach(sortNodes);

      finalRoots.sort((a, b) => {
        if (this.app.projectName && a.name === this.app.projectName) return -1;
        if (this.app.projectName && b.name === this.app.projectName) return 1;
        return a.name.localeCompare(b.name);
      });

      return finalRoots;
    }

  getProjectInfoFromUrl() {
      const isChildApp = typeof window !== 'undefined' && window.projectApp && window.projectApp !== this.app;
      if (isChildApp) {
        return { mode: 'default', name: null };
      }
      const params = new URLSearchParams(window.location.search);
      const project = params.get('project');
      
      if (project) {
        return { mode: 'static-project', name: project };
      }
      return { mode: 'default', name: null };
    }

  async _hydrateHostedLibraryFilesForVisibleProject(fileMap = null) {
      const targetMap = fileMap || this.app?.inMemoryFileStore;
      if (!targetMap || typeof targetMap.set !== 'function') {
        return {
          ok: false,
          added: 0,
          reason: 'No writable in-memory file map available.',
        };
      }

      // applyCss.js and makeElement.js removed from hydration set as they are now globalized in DomBasics
      const libraryPaths = new Set([
        '/library/recursi.js',
        '/library/CompactMenu.js',
        '/library/GlowingTooltip.js',
      ]);

      const normalizeLibraryPath = (rawPath) => {
        if (!rawPath || typeof rawPath !== 'string') return null;
        let path = rawPath.trim();
        path = path.split('#')[0].split('?')[0];

        if (path.startsWith('https://recursi.dev/library/')) {
          path = '/library/' + path.slice('https://recursi.dev/library/'.length);
        } else if (path.startsWith('/hostedLibrary/')) {
          path = '/library/' + path.slice('/hostedLibrary/'.length);
        } else if (path.startsWith('hostedLibrary/')) {
          path = '/library/' + path.slice('hostedLibrary/'.length);
        } else if (path.startsWith('library/')) {
          path = '/' + path;
        }

        if (!path.startsWith('/library/')) return null;
        return path;
      };

      const addLibraryPath = (rawPath) => {
        const normalized = normalizeLibraryPath(rawPath);
        if (normalized) libraryPaths.add(normalized);
      };

      for (const [filePath, content] of Array.from(targetMap.entries())) {
        if (typeof content !== 'string') continue;

        const regexes = [
          /(?:src|href)\s*=\s*["']([^"']*\/library\/[^"']+)["']/g,
          /(?:from\s+|import\s*\()\s*["']([^"']*\/library\/[^"']+)["']/g,
          /["'](\/hostedLibrary\/[^"']+)["']/g,
          /["'](\/library\/[^"']+)["']/g,
          /(https:\/\/recursi\.dev\/library\/[^\s"'<>]+)/g,
        ];

        for (const regex of regexes) {
          let match;
          while ((match = regex.exec(content))) {
            addLibraryPath(match[1]);
          }
        }

        if (filePath.startsWith('/library/')) {
          addLibraryPath(filePath);
        }
      }

      const fetchOne = async (path) => {
        if (!path || targetMap.has(path)) return false;
        
        if (path.includes('ManagedDependencyLoader.js') || path.includes('recursiModule.js') || path.includes('file_metadata.json') || path.includes('filelist.json') || path.includes('DialogBox.js') || path.includes('ThreeJSApp.js') || path.includes('ThreeJsApp.js')) return false;

        try {
          const response = await fetch(path + '?_=' + Date.now());
          if (!response.ok) return false;

          const contentType = response.headers.get('content-type') || '';
          const isText =
            contentType.includes('text/') ||
            contentType.includes('javascript') ||
            contentType.includes('json') ||
            contentType.includes('xml') ||
            /\.(js|mjs|css|html|json|md|txt|svg|yaml|yml)$/i.test(path);

          if (!isText) return false;

          const text = await response.text();
          targetMap.set(path, text);
          return true;
        } catch (error) {
          console.warn(
            '[ProjectLoader] Could not hydrate hosted library file:',
            path,
            error
          );
          return false;
        }
      };

      let added = 0;
      const pathsArray = Array.from(libraryPaths).sort();
      const BATCH_SIZE = 15;

      for (let i = 0; i < pathsArray.length; i += BATCH_SIZE) {
        const batch = pathsArray.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (path) => {
            if (await fetchOne(path)) {
              added++;
            }
          })
        );
      }

      return {
        ok: true,
        added,
        totalLibraryPaths: Array.from(targetMap.keys()).filter((path) =>
          path.startsWith('/library/')
        ).length,
        considered: pathsArray,
      };
    }

  async _showHostedLibraryTreeFromServer(sharedMeta = {}) {
      const projectFilesManager = this.app?.projectFilesManager;
      if (
        !projectFilesManager ||
        typeof projectFilesManager.addSharedLibraryTree !== 'function'
      ) {
        console.warn(
          '[ProjectLoader] Cannot show hosted library tree: ProjectFilesManager.addSharedLibraryTree missing.'
        );
        return {
          ok: false,
          reason: 'ProjectFilesManager.addSharedLibraryTree missing',
        };
      }

      const libraryPaths = new Set();

      const addPath = (path) => {
        if (typeof path !== 'string') return;
        const clean = path.split('?')[0].split('#')[0];
        if (clean.startsWith('/library/') && !clean.endsWith('/')) {
          libraryPaths.add(clean);
        }
      };

      for (const key of Object.keys(sharedMeta || {})) {
        addPath(key);
      }

      [
        '/library/CompactMenu.js',
        '/library/DictationWidget.js',
        '/library/DropdownMenu.js',
        '/library/KeystrokeHandler.js',
      ].forEach(addPath);

      const paths = Array.from(libraryPaths).sort();

      await projectFilesManager.addSharedLibraryTree(paths, sharedMeta || {});

      return {
        ok: true,
        count: paths.length,
        paths,
      };
    }

  _attachIDBMirror(store) {
      if (!store || store._isMirrored) return;
      const originalSet = store.set.bind(store);
      store.set = (key, value) => {
        originalSet(key, value);
        if (typeof value === 'string') {
          try {
            const req = indexedDB.open('recursi_local_dir_store');
            req.onupgradeneeded = (e) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
            };
            req.onsuccess = (e) => {
              const db = e.target.result;
              if (db.objectStoreNames.contains('files')) {
                const tx = db.transaction('files', 'readwrite');
                tx.objectStore('files').put(value, key);
              }
              db.close();
            };
          } catch(err) {}
        }
        return store;
      };
      store._isMirrored = true;
    }

  _attachDevMirror(store) {
      if (!store || store._isDevMirrored) return;
      const originalSet = store.set.bind(store);
      store.set = (key, value) => {
        originalSet(key, value);
        if (typeof value === 'string') {
          try {
            const req = indexedDB.open('vibes_dev_mirror', 1);
            req.onupgradeneeded = (e) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
            };
            req.onsuccess = (e) => {
              const db = e.target.result;
              if (db.objectStoreNames.contains('files')) {
                const tx = db.transaction('files', 'readwrite');
                tx.objectStore('files').put(value, key);
              }
              db.close();
            };
          } catch(err) {}
        }
        return store;
      };
      store._isDevMirrored = true;
    }


  static _doc_overview() {
      return `# ProjectLoader\n\nThe \`ProjectLoader\` is the environment bootloader for Vibes. It reads active URL parameters to initialize workspaces.`;
    }

  static _doc_lifecycle() {
      return `## Environment Boot and Hydration\n\n- **Shell Boot**: \`_bootShell\` initializes the main layout, spawns the \`TabManager\`, and instantiates base panels.`;
    }

  static _doc() {
      return [
        this._doc_ProjectLoader(),
        this._doc_overview(),
        this._doc_lifecycle()
      ].join('\n\n');
    }

  

  static _doc_ProjectLoader() {
      return `# ProjectLoader\n\n## Summary\n\nProjectLoader is the environment bootloader for Vibes.`;
    }
}