class ProjectEditorApp {
  getAllVisibilityWidgets() {
    const widgets = [];
    const pfm = this.projectFilesManager;
    if (!pfm) return widgets;

    if (typeof pfm.getAllVisibilityWidgets === 'function') {
      const mainWidgets = pfm.getAllVisibilityWidgets();
      if (mainWidgets) widgets.push(...mainWidgets);
    }

    if (pfm.fileTreeViews) {
      pfm.fileTreeViews.forEach((treeView) => {
        if (
          treeView &&
          typeof treeView.getAllVisibilityWidgets === 'function'
        ) {
          const treeWidgets = treeView.getAllVisibilityWidgets();
          for (const tw of treeWidgets) {
            if (!widgets.includes(tw)) widgets.push(tw);
          }
        }
      });
    }

    return widgets;
  }

  async processPendingTasks() {
    if (this.isLoading) return;
    const tasks = this.pendingTaskManager.getTasks();
    if (tasks.length === 0) return;
    this.uiManager.setLoadingState(true);
    for (const task of tasks) {
      if (task.type === 'command') {
        await this.protocolHandler.handleCommand(task.payload);
      } else if (task.type === 'status') {
        const isError = task.payload.type === 'error';
        this.uiManager.setStatus(task.payload.message, isError, 4000);
      }
    }
    this.pendingTaskManager.clear();
    this.uiManager.setLoadingState(false);
  }

  async rebuildSymbolMap() {
    this.symbolMap.clear();
    this.uiManager.setStatus('Building symbol map...');
    this._report(
      'symbolMap:build:v4-no-legacy-server-fetch',
      'Starting symbol map build without legacy server fetches...',
      {},
      10
    );

    const candidates = new Map();

    const addCandidate = (filePath, content) => {
      if (typeof filePath !== 'string' || typeof content !== 'string') return;
      if (!filePath.endsWith('.js')) return;
      candidates.set(filePath, content);
    };

    if (this.inMemoryFileStore && this.inMemoryFileStore.size) {
      for (const [filePath, content] of this.inMemoryFileStore.entries()) {
        addCandidate(filePath, content);
      }
    }

    if (
      this.workspaceFileStores &&
      typeof this.workspaceFileStores.entries === 'function'
    ) {
      for (const [, store] of this.workspaceFileStores.entries()) {
        if (
          !store ||
          typeof store.keys !== 'function' ||
          typeof store.get !== 'function'
        ) {
          continue;
        }

        try {
          const keys = Array.from(store.keys());
          for (const filePath of keys) {
            if (typeof filePath !== 'string' || !filePath.endsWith('.js'))
              continue;
            const content = await Promise.resolve(store.get(filePath));
            addCandidate(filePath, content);
          }
        } catch (error) {
          console.warn('[SymbolMap] Workspace store scan failed:', error);
        }
      }
    }

    if (
      this.vfs &&
      typeof this.vfs.listFiles === 'function' &&
      typeof this.vfs.readFile === 'function'
    ) {
      try {
        const paths = await this.vfs.listFiles({ includeStatic: false });
        for (const filePath of paths || []) {
          if (typeof filePath !== 'string' || !filePath.endsWith('.js'))
            continue;
          if (candidates.has(filePath)) continue;

          const content = await this.vfs.readFile(filePath, {
            nullOnMissing: true,
          });
          addCandidate(filePath, content);
        }
      } catch (error) {
        console.warn('[SymbolMap] VFS scan failed:', error);
      }
    }

    const parseJobs = [];
    for (const [filePath, content] of candidates.entries()) {
      parseJobs.push(
        (async () => {
          if (!content) return;

          try {
            const parseResult = this.codeParser.parseForMetadata(
              content,
              filePath
            );

            if (parseResult.mainExport && parseResult.mainExport.name) {
              const exportName = parseResult.mainExport.name;
              const slash = filePath.lastIndexOf('/');
              const sourceDir =
                slash === -1 ? '' : filePath.substring(0, slash);
              this.symbolMap.set(exportName, sourceDir);
            }
          } catch (err) {
            console.warn(`[SymbolMap] Parse failed for ${filePath}:`, err);
          }
        })()
      );
    }

    await Promise.all(parseJobs);
    this.uiManager.setStatus(
      `Symbol map built with ${this.symbolMap.size} symbols.`
    );
  }

  async updateSingleFileMetadata(filePath, fileContent) {
    try {
      const relativePath = filePath.replace(`${this.projectName}/`, '');
      const metadata = await this.documentationManager.getFileMetadata();
      if (!metadata[relativePath]) metadata[relativePath] = {};
      const newSize = (fileContent.match(/\n/g) || []).length + 1;
      if (metadata[relativePath].codeSize === newSize) return;
      metadata[relativePath].codeSize = newSize;
      const success = await this.documentationManager.saveFileMetadata(
        metadata
      );
      if (success && this.projectFilesManager) {
        this.projectFilesManager.updateNodeMetadata(
          relativePath,
          metadata[relativePath]
        );
      }
    } catch (error) {
      console.error(`Failed to update metadata for ${filePath}:`, error);
      this.uiManager.setStatus(
        `Could not update file size for ${filePath}.`,
        true
      );
    }
  }

  

  updateReportButtonState() {
    if (!this.isUiReady || !this.reportButton || !this.reportManager) return;
    const pendingChecks = this.reportManager.getPendingChecks();
    if (pendingChecks.length > 0) {
      if (!this.reportButton.classList.contains('active')) {
        this.reportButton.classList.add('active');
      }
    } else {
      this.reportButton.classList.remove('active');
    }
    this.reportButton.title =
      pendingChecks.length > 0
        ? `Report (${pendingChecks.length} pending items)`
        : 'Report (No pending items)';
  }

  logFileOp(priority, message, details = {}) {
    if (this.fileLogger) {
      this.fileLogger.log(priority, message, details);
    }
  }

  async _processPendingSharedLibs() {
      if (this.pendingSharedLibs.size === 0) return;
      const libsToAdd = Array.from(this.pendingSharedLibs);
      this.pendingSharedLibs.clear();
      this.uiManager.setStatus(
        `Adding ${libsToAdd.length} shared library file(s)...`
      );

      const allFilePathsToAdd = [];
      const newMetadataForLibs = {};
      const fetchedContent = new Map();

      const _extractHostedLibraryDeps = (jsContent) => {
        const deps = new Set();
        const regex =
          /from\s+['"]((?:\.\/(\w+\.js))|(?:(?:\/library\/|\/hostedLibrary\/)(\w+\.js)))['"]/g;
        let m;
        while ((m = regex.exec(jsContent)) !== null) {
          const depName = m[2] || m[3];
          if (depName) deps.add(depName);
        }
        return deps;
      };

      const _isAlreadyPresent = (libName) => {
        const canonical = `/library/${libName}`;
        const legacy = `/hostedLibrary/${libName}`;
        if (
          this.inMemoryFileStore &&
          (this.inMemoryFileStore.has(canonical) ||
            this.inMemoryFileStore.has(legacy))
        )
          return true;

        if (this.projectFilesManager) {
          const trees = typeof this.projectFilesManager.getFileTreeViews === 'function'
            ? this.projectFilesManager.getFileTreeViews()
            : [];
          for (const tree of trees) {
            if (tree?.nodesMap?.has?.(canonical)) return true;
            if (tree?.nodesMap?.has?.(legacy)) return true;
          }
        }

        return (
          allFilePathsToAdd.includes(canonical) ||
          allFilePathsToAdd.includes(legacy)
        );
      };

      const _fetchOneLib = async (libName) => {
        const jsGoldenPath = `/library/${libName}`;
        if (allFilePathsToAdd.includes(jsGoldenPath)) return;

        let jsContent = null;
        let docContent = null;

        try {
          const vfs =
            typeof this.refreshVirtualFileSystemStores === 'function'
              ? await this.refreshVirtualFileSystemStores()
              : this.vfs;
          if (vfs) {
            jsContent = await vfs.readFile(jsGoldenPath, { nullOnMissing: true });
          }
          if (!jsContent && typeof jsContent !== 'string') {
            const jsRes = await fetch(jsGoldenPath + '?_=' + Date.now());
            if (jsRes.ok) jsContent = await jsRes.text();
          }
          if (typeof jsContent === 'string' && this.inMemoryFileStore) {
            this.inMemoryFileStore.set(jsGoldenPath, jsContent);
          }

          const docGoldenPath =
            this.documentationManager?.getDocPath(jsGoldenPath);
          if (docGoldenPath) {
            if (vfs) {
              docContent = await vfs.readFile(docGoldenPath, {
                nullOnMissing: true,
              });
            }
            if (!docContent && typeof docContent !== 'string') {
              const docRes = await fetch(docGoldenPath + '?_=' + Date.now());
              if (docRes.ok) docContent = await docRes.text();
            }
            if (typeof docContent === 'string' && this.inMemoryFileStore) {
              this.inMemoryFileStore.set(docGoldenPath, docContent);
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch shared lib ${libName}:`, e);
        }

        if (jsContent !== null) {
          allFilePathsToAdd.push(jsGoldenPath);
          fetchedContent.set(libName, jsContent);
          newMetadataForLibs[jsGoldenPath] = {
            codeSize: jsContent.split('\n').length,
            docSize: docContent ? docContent.split('\n').length : 0,
          };
        }
      };

      await Promise.all(libsToAdd.map((name) => _fetchOneLib(name)));

      let resolvedAll = false;
      const maxDepth = 5;
      let depth = 0;
      while (!resolvedAll && depth < maxDepth) {
        resolvedAll = true;
        depth++;
        const newDeps = [];
        for (const [, content] of fetchedContent) {
          const deps = _extractHostedLibraryDeps(content);
          for (const dep of deps) {
            if (!_isAlreadyPresent(dep) && !fetchedContent.has(dep)) {
              newDeps.push(dep);
              resolvedAll = false;
            }
          }
        }
        if (newDeps.length > 0) {
          console.log(
            `[SharedLib] Resolving transitive deps (depth ${depth}): ${newDeps.join(
              ', '
            )}`
          );
          await Promise.all(newDeps.map((name) => _fetchOneLib(name)));
        }
      }

      if (!this.inMemoryFileStore) {
        try {
          const currentMeta = await this.documentationManager.getFileMetadata();
          const updatedMeta = { ...currentMeta, ...newMetadataForLibs };
          await this.documentationManager.saveFileMetadata(updatedMeta);
        } catch (e) {
          console.warn('Could not persist metadata for new shared libs:', e);
        }
      }

      if (this.projectFilesManager) {
        await this.projectFilesManager.addSharedLibraryTree(
          allFilePathsToAdd,
          newMetadataForLibs
        );
        const totalAdded = allFilePathsToAdd.length;
        const autoAdded = totalAdded - libsToAdd.length;
        let msg = `Added ${libsToAdd.length} shared file(s) to the project tree.`;
        if (autoAdded > 0) {
          msg += ` (${autoAdded} dependency/dependencies auto-included)`;
        }
        this.uiManager.setStatus(msg);
      }
    }

  _getProjectNameFromUrl() {
      const isChild = window._dev_projectEditorInstance && window._dev_projectEditorInstance !== this;
      if (isChild) {
        console.log('[ProjectEditorApp] Nested child instance detected. Suppressing recursive URL project auto-load.');
        return null;
      }
      return this.projectLoader.getProjectInfoFromUrl().name;
    }

  _setupGlobalKeyListeners() {
      // Safe child check to prevent key event conflicts or duplicate handlers
      if (window._dev_projectEditorInstance && window._dev_projectEditorInstance !== this) {
        console.log('[ProjectEditorApp] Child instance: skipping global key listeners.');
        return;
      }
      window.addEventListener(
        'keydown',
        (e) => {
          if (
            this.featureManager.highlighter &&
            this.featureManager.highlighter.isActive()
          ) {
            return;
          }

          const isMod = e.ctrlKey || e.metaKey;

          if (isMod && e.key === 's') {
            e.preventDefault();
            this.actionHandler.handleSaveAllFiles();
            return;
          }

          if (isMod && e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            Promise.resolve({
              UndoTimelineDialog:
                typeof UndoTimelineDialog !== 'undefined'
                  ? UndoTimelineDialog
                  : null,
            }).then(({ UndoTimelineDialog }) => {
              new UndoTimelineDialog(this);
            });
            return;
          }

          if (isMod && e.key === 'f') {
            if (
              document.activeElement &&
              document.activeElement.classList.contains('tree-search-input')
            ) {
              if (this.projectFilesManager) {
                this.projectFilesManager.closeSearch();
              }
              return;
            }

            const activeCtrl = this.activeEditorController;
            if (activeCtrl && activeCtrl.isLoaded && activeCtrl.viewManager) {
              if (activeCtrl.viewManager.isSearchPanelFocused()) {
                activeCtrl.viewManager.closeSearch();
                e.preventDefault();
                if (this.projectFilesManager) {
                  this.projectFilesManager.focusSearch();
                }
                return;
              }
              e.preventDefault();
              activeCtrl.triggerSearch();
              return;
            }

            if (this.projectFilesManager) {
              e.preventDefault();
              this.projectFilesManager.focusSearch();
            }
            return;
          }

          const activeEl = document.activeElement;
          if (activeEl) {
            const tagName = activeEl.tagName.toUpperCase();
            const isInputElement = tagName === 'INPUT' || tagName === 'TEXTAREA';
            if (
              isInputElement ||
              activeEl.isContentEditable ||
              activeEl.closest('.CodeMirror, .cm-editor')
            ) {
              return;
            }
          }
          const key = e.key.toLowerCase();
          const action = this.actionRegistry.getActionForShortcut(key);
          if (action) {
            action.handler();
            e.preventDefault();
          } else if (key === 'e') {
            this._showEasterEgg();
            e.preventDefault();
          }
        },
        true
      );

      window.addEventListener(
        'paste',
        async (e) => {
          const activeEl = document.activeElement;
          if (activeEl) {
            const tagName = activeEl.tagName.toUpperCase();
            const isInput =
              tagName === 'INPUT' ||
              tagName === 'TEXTAREA' ||
              activeEl.isContentEditable;
            const isEditor = activeEl.closest('.CodeMirror, .cm-editor');
            if (isInput || isEditor) return;
          }

          if (this.actionHandler && this.actionHandler.handlePaste) {
            await this.actionHandler.handlePaste(e);
          }
        },
        true
      );
    }

  async _loadThirdPartyLibs() {
    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () =>
          reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
      });
    return Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js'),
      loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
      ),
    ]);
  }

  _loadSettings() {
    const defaults = {
      lastEditorViewMode: 'code',
      confirmPaste: false,
      preferHotPatching: true,
      protocolMode: 'recursi', // <-- Made recursi V2 the default Protocol!
    };
    try {
      const stored = localStorage.getItem('recursi_editorSettings');
      const settings = stored ? JSON.parse(stored) : {};
      this.settings = { ...defaults, ...settings };
    } catch (e) {
      this.settings = defaults;
    }
    this.lastEditorViewMode = this.settings.lastEditorViewMode;

    if (typeof window !== 'undefined') {
      window.setProtocolMode = (mode) => this.setProtocolMode(mode);
    }
  }

  _saveSettings() {
    this.settings.lastEditorViewMode = this.lastEditorViewMode;
    try {
      localStorage.setItem(
        'recursi_editorSettings',
        JSON.stringify(this.settings)
      );
    } catch (e) {
      console.error('Failed to save settings.', e);
    }
  }

  

  createPath(pathString) {
    if (!pathString) throw new Error('createPath requires a path string.');
    if (pathString instanceof Path) return pathString;

    try {
      return new Path(pathString, { projectName: this.projectName });
    } catch (e) {
      console.error(`[Path] Failed to create path for "${pathString}":`, e);
      throw e;
    }
  }

  _setupMessageListener() {
      // Safe child check to prevent infinite postMessage event recursion
      if (window._dev_projectEditorInstance && window._dev_projectEditorInstance !== this) {
        console.log('[ProjectEditorApp] Child instance: skipping global message listener registration to prevent event loops.');
        return;
      }
      window.addEventListener('message', async (event) => {
        const { type, payload } = event.data;
        switch (type) {
          case 'recursi:openLocalFolder':
            if (
              this.projectFilesManager &&
              typeof this.projectFilesManager.openWorkingFolder === 'function'
            ) {
              this.projectFilesManager.openWorkingFolder();
            }
            break;
          case 'recursi:loadProject':
            if (payload && payload.projectName)
              window.location.search = `?project=${payload.projectName}`;
            break;
          case 'recursi:previewProjectInTab':
            if (payload && payload.url && payload.projectName)
              this.tabOrchestrator.createUrlPreviewTab(
                payload.url,
                payload.projectName
              );
            break;
          case 'recursi:loadStaticProject':
            if (payload && payload.projectName) {
              console.log('[Edit] static load:start', payload.projectName);
              try {
                const url = new URL(window.location);
                url.searchParams.delete('project');
                url.searchParams.delete('in-memory-project');
                url.searchParams.set('static_project', payload.projectName);
                window.history.pushState(
                  {},
                  `Recursi - ${payload.projectName}`,
                  url.toString()
                );
                this.projectName = payload.projectName;
                this.isStaticMode = true;
                if (
                  this.uiManager &&
                  typeof this.uiManager.setUIMode === 'function'
                ) {
                  this.uiManager.setUIMode('indexeddb');
                }
                console.log('[Edit] static load:mode-set');
                const result =
                  await this.projectLoader.loadStaticProjectFromServerFiles();
                console.log('[Edit] static load:loader-returned', result);
                if (result && result.ok === false) {
                  this.uiManager.setStatus(
                    `Edit failed: ${result.error || 'unknown'}`,
                    true
                  );
                } else {
                  this.uiManager.setStatus(
                    `Loaded ${payload.projectName} - ready to edit.`,
                    false,
                    4000
                  );
                }
              } catch (error) {
                console.error('[Edit] static load:exception', error);
                this.uiManager.setStatus(`Edit failed: ${error.message}`, true);
              }
            }
            break;
          case 'recursi:runProjectInWindow':
            if (payload && payload.projectName) {
              await this._handleRunProjectInWindowMessage({ data: event.data });
            }
            break;
          case 'recursi:requestLoadProject':
            if (payload) {
              if (this.hasDirtyFiles()) {
                UITools.makeDialog({
                  title: 'Unsaved Changes',
                  content: makeElement(
                    'p',
                    `You have unsaved changes in the current project. Loading a new project will discard these changes. Are you sure you want to continue?`
                  ),
                  buttons: [
                    {
                      label: 'Discard Changes & Continue',
                      className: 'primary',
                      onClick: async (e, dialog) => {
                        dialog.close();
                        const fileMap = new Map(Object.entries(payload.fileMap));
                        await this.projectLoader.loadProjectFromUnpacked(
                          fileMap,
                          payload.projectName,
                          null,
                          payload.sourceProjectName
                        );
                      },
                    },
                    { label: 'Cancel' },
                  ],
                });
              } else {
                const fileMap = new Map(Object.entries(payload.fileMap));
                await this.projectLoader.loadProjectFromUnpacked(
                  fileMap,
                  payload.projectName,
                  null,
                  payload.sourceProjectName
                );
              }
            }
            break;
          case 'recursi:loadProjectFromMemory':
            if (payload) {
              const fileMap = new Map(Object.entries(payload.fileMap));
              await this.projectLoader.loadProjectFromUnpacked(
                fileMap,
                payload.projectName,
                null,
                payload.sourceProjectName
              );
            }
            break;
          case 'recursi:addSharedLibrary':
            if (payload && payload.fileName) {
              this.uiManager.setStatus(
                `Queued '${payload.fileName}' for addition.`
              );
              this.pendingSharedLibs.add(payload.fileName);
              if (
                this.projectFilesManager &&
                this.projectFilesManager.fileTreeView
              ) {
                await this._processPendingSharedLibs();
              }
            }
            break;
        }
      });
    }

  notifyVisibilityChange() {
      this.lastVisibilityChangeTime = Date.now();
      window.dispatchEvent(new CustomEvent('vfs:visibility-changed'));
    }

  hasDirtyFiles() {
    for (const controller of this.editorControllers.values()) {
      if (controller.isDirty) {
        return true;
      }
    }
    return false;
  }

  autoPaste(text) {
    console.log('[App] autoPaste received content.');
    this.llmQueueManager.receive(text, 'auto');
  }

  

  on(event, handler) {
    if (!this._eventListeners) this._eventListeners = new Map();
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event).add(handler);
  }

  off(event, handler) {
    if (!this._eventListeners) return;
    if (this._eventListeners.has(event)) {
      this._eventListeners.get(event).delete(handler);
    }
  }

  emit(event, payload) {
    if (!this._eventListeners) return;
    if (this._eventListeners.has(event)) {
      this._eventListeners.get(event).forEach((handler) => {
        try {
          handler(payload);
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      });
    }
  }

  _initComms() {
      if (!this.windowMessenger) {
        this.windowMessenger = new WindowMessenger(null, {
          debug: false,
          protocolId: 'MVC_IPC_1.0',
        });
      }

      if (!this.llmQueueManager) {
        this.llmQueueManager = new LlmQueueManager(this);
      }

      // OBSOLETE: The teleporterBridge cross-window postMessage communication is completely removed.
      this.teleporterBridge = null;

      console.log('[App] Comms subsystem initialized.');
    }

  constructor(rootContainer) {
      this.rootContainer = rootContainer || null;
      this._eventListeners = new Map();
      
      const isChild = window._dev_projectEditorInstance && window._dev_projectEditorInstance !== this;

      if (!window._dev_projectEditorInstance) {
        window._dev_projectEditorInstance = this;
      }
      
      // Initialize the Global Class Registration Logger
      if (!globalThis.__classRegistrationLogger) {
        globalThis.__classRegistrationLogger = {
          logs: [],
          log(className, type) {
            this.logs.push({
              className,
              type,
              timestamp: new Date().toLocaleTimeString()
            });
            console.log(`[Class Logger] Registered ${className} as global (${type})`);
          },
          clear() {
            this.logs = [];
          },
          getFormattedText() {
            if (this.logs.length === 0) return 'No classes registered globally yet.';
            return this.logs.map(l => `[${l.timestamp}] Class "${l.className}" registered as global (Source: ${l.type})`).join('\n');
          }
        };
      }

      if (!isChild) {
        window.injectAllFooters = async () => {
          if (this.commands && this.commands.injectMetadataFooters) {
            await this.commands.injectMetadataFooters({});
          }
        };
      }

      this.projectLoader = new ProjectLoader(this);
      this.tabOrchestrator = new TabOrchestrator(this);
      this.actionInitializer = new ActionInitializer(this);
      this.featureManager = new FeatureManager(this);
      this.promptInjector = new PromptInjector();
      this.llmQueueManager = new LlmQueueManager(this);

      if (typeof HistoryManager !== 'undefined') {
        this._historyManager = new HistoryManager(this);
      }

      this.projectName = this._getProjectNameFromUrl();
      this.instanceId = `build_${new Date().toISOString()}`;
      this.editorControllers = new Map();
      this.inMemoryFileStore = null;
      this.inMemoryFileMetadata = null;
      this.activeEditorController = null;
      this.previouslyActiveController = null;
      this.isLoading = false;
      this.isUiReady = false;
      this.symbolMap = new Map();
      this.isStaticMode = false;
      this.pendingSharedLibs = new Set();
      this.lastVisibilityChangeTime = 0;
      this.clipboardSink = null;
      this.localDirSessionManager = null;
      this.playgroundController = null;
      this.playgroundTabId = null;
      this.reportButton = null;
      this.ui = {};

      this.treeViewGlowBox = null;
      this.paintSelectionPanel = null;
      this.outputTab = null;
      this.buildPromptTab = null;
      this.ProjectFilesManager = null;
      this.BuildPromptTab = BuildPromptTab;
      this.OutputTab = OutputTab;
      this.TabManager = TabManager;
      this.fileLogger = new FileOperationLogger();
      this.fileLogDialog = new FileLogDialog(this.fileLogger);
      this.fileLogger.setDialog(this.fileLogDialog);
      this.windowMessenger = new WindowMessenger();
      this.clientStateManager = new ClientStateManager(this, this.windowMessenger);
      this.runnerManager = null; 
      this.runInPageRunner = typeof RunInPageRunner !== 'undefined' ? new RunInPageRunner(this) : null;
      this.appStyles = new AppStyles();
      this.appearanceManager = new AppearanceManager(this);
      this.reportManager = new ReportManager();
      this.pendingTaskManager = new PendingTaskManager();
      this.codeParser = new CodeParser(window.acorn);
      this.projectUnpacker = new ProjectUnpacker();
      this.documentationManager = new DocumentationManager(this);
      this.analysisManager = new ProjectAnalysisManager(this);
      this.taskRunner = new TaskRunner(this);
      this.uiManager = new AppUIManager(this);
      this.actionHandler = new AppActionHandler(this);
      this.commands = new AppCommands(this);
      this.protocolHandler = new AppProtocolHandler(this, this.commands, this.commandParser);
      this.visibilityManager = new UIVisibilityManager(this);
      this.actionRegistry = new ActionRegistry(this);
      this.chatterinessLevel = 10;
      this._report = this.reportManager.log.bind(this.reportManager);
      this._loadSettings();
    }

  

  get historyManager() {
    if (!this._historyManager) {
      if (typeof HistoryManager !== 'undefined') {
        this._historyManager = new HistoryManager(this);
      } else {
        console.error(
          '[ProjectEditorApp] HistoryManager is undefined. File may not be loaded yet.'
        );
      }
    }
    return this._historyManager;
  }

  _getProjectFilesManagerClassAsync() {
      // Resolve the globally available class immediately
      return Promise.resolve(ProjectFilesManager);
    }

  

  

  

  

  

  _exposeDevGlobals(reason = 'unknown') {
      const isChild = window._dev_projectEditorInstance && window._dev_projectEditorInstance !== this;
      if (isChild) {
        console.log('[ProjectEditorApp] Child instance: suppressing dev global exposure.');
        return;
      }
      try {
        globalThis.__vibesProjectEditorApp = this;
        globalThis.__vibesProjectFilesManager = this.projectFilesManager || null;
        globalThis.__vibesProjectEditorAppExposeReason = reason;
        globalThis.__vibesProjectEditorAppExposeAt = new Date().toISOString();
      } catch (error) {
        console.warn('[ProjectEditorApp] Could not expose dev globals:', error);
      }
    }

  _createVirtualFileSystem() {
    if (typeof VirtualFileSystem === 'undefined') {
      this._ensureVirtualFileSystemLoaded();
      console.warn(
        '[VFS] VirtualFileSystem class is not loaded yet; lazy load requested.'
      );
      return null;
    }
    return new VirtualFileSystem(this, {
      memoryStore: this.inMemoryFileStore || null,
      localStore: this.localDirectoryStore || this.localDirStore || null,
    });
  }

  async refreshVirtualFileSystemStores() {
    if (typeof VirtualFileSystem === 'undefined') {
      await this._ensureVirtualFileSystemLoaded();
    }
    if (!this.vfs) {
      this.vfs = this._createVirtualFileSystem();
    }
    if (!this.vfs) {
      return null;
    }
    this.vfs.setMemoryStore(this.inMemoryFileStore || null);
    const localStore =
      this.localDirectoryStore ||
      this.localDirStore ||
      this.workspaceStore ||
      null;
    this.vfs.setLocalStore(localStore);
    return this.vfs;
  }

  async getVirtualFileSystemStatus() {
    const vfs = await this.refreshVirtualFileSystemStores();
    if (!vfs) {
      return {
        ok: false,
        reason: 'VirtualFileSystem is not available on window/global scope.',
      };
    }
    return {
      ok: true,
      status: vfs.describe(),
    };
  }

  async _ensureVirtualFileSystemLoaded() {
    if (typeof VirtualFileSystem !== 'undefined') {
      return true;
    }
    if (this._vfsLoadPromise) {
      return await this._vfsLoadPromise;
    }
    this._vfsLoadPromise = new Promise((resolve) => {
      const existing = document.querySelector(
        'script[data-vibes-vfs-loader="VirtualFileSystem"]'
      );
      if (existing) {
        existing.addEventListener(
          'load',
          () => resolve(typeof VirtualFileSystem !== 'undefined'),
          { once: true }
        );
        existing.addEventListener('error', () => resolve(false), {
          once: true,
        });
        return;
      }
      const script = document.createElement('script');
      script.src = '/vibes/src/editor/comms/VirtualFileSystem.js';
      script.dataset.vibesVfsLoader = 'VirtualFileSystem';
      script.onload = () => resolve(typeof VirtualFileSystem !== 'undefined');
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
    return await this._vfsLoadPromise;
  }

  async init() {
      if (!this.rootContainer) {
        this.rootContainer =
          document.getElementById('app-container') || document.body;
      }

      const params = new URLSearchParams(window.location.search);
      const projectInfo = this.projectLoader.getProjectInfoFromUrl();

      const forceStaticMode = params.get('mode') === 'static';
      this.isStaticMode =
        forceStaticMode ||
        projectInfo.mode === 'static-project' ||
        window.Recursi_SERVER_MODE === 'static';

      const serverMode = this.isStaticMode
        ? 'static'
        : window.Recursi_SERVER_MODE || 'node';
      console.log(
        `[App] Running in ${serverMode} mode. (Static forced by URL: ${forceStaticMode})`
      );

      this.appearanceManager.subscribe((settings) => this.appStyles.applyAll());
      this.appStyles.applyAll();
      this.uiManager.setStatus('Initializing application...');
      this.actionInitializer.registerAllActions();
      await this._loadThirdPartyLibs();

      this.uiManager.createLayout();
      this.uiManager.renderGlobalControls();

      this._initComms();

      // CLEANUP: No more dynamic loading here.
      window.VibesPatchStore = typeof VibesPatchStore !== 'undefined' ? VibesPatchStore : null;
      window.PatchManager = typeof PatchManager !== 'undefined' ? PatchManager : null;
      if (!this.patchManager && window.PatchManager) {
        this.patchManager = new window.PatchManager(this);
        await this.patchManager.init();
      }

      this.appearanceManager.notifySubscribers();
      this.reportManager.acknowledgeAllPendingOnLoad();
      this.updateReportButtonState();

      this.projectFilesManager =
        new (await this._getProjectFilesManagerClassAsync())(
          this,
          (nodeInfo) => {
            const path = nodeInfo.id;
            const rootId = '/' + path.split('/').filter(Boolean)[0];
            const store =
              this.workspaceFileStores?.get(rootId) || this.inMemoryFileStore;
            this.projectFilesManager._openFloatingExternalEditorWindow(
              path,
              store
            );
          },
          this.actionHandler.handlePackAndSave.bind(this.actionHandler),
          null 
        );

      this._exposeDevGlobals('after-project-files-manager-create');

      if (this.isStaticMode) {
        this.uiManager.setUIMode('indexeddb');
        if (projectInfo.mode === 'static-project') {
          this.projectName = projectInfo.name;
          await this.projectLoader.loadStaticProjectFromServerFiles();
        } else {
          this.projectName = null;
          document.title = 'Recursi - Load Static Project';
          await this.projectLoader._bootShell();
          this.tabOrchestrator.createProjectBrowserTab();
        }
      } else {
        this.uiManager.setUIMode('server');
        if (projectInfo.mode === 'server') {
          this.projectName = projectInfo.name;
          await this.projectLoader.loadProjectFromServer();
        } else {
          this.projectName = null;
          document.title = 'Recursi - Select Project';
          await this.projectLoader._bootShell();
          this.tabOrchestrator.createProjectBrowserTab();
        }
      }

      try {
        const startupShell = document.getElementById('startup-logo-shell');
        const overlay = document.getElementById('startup-overlay');

        if (startupShell && window.vibesStartupLogo) {
          this.emberLogo = window.vibesStartupLogo;
          
          // Clear the 1.4s transition to prevent conflicts with JS positioning/glide
          startupShell.style.transition = 'none';
          
          this.emberLogo.glideToHeader('450px', '2px', 0.55);

          if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
              overlay.remove();
            }, 1000);
          }
        } else if (typeof EmberLogo !== 'undefined') {
          EmberLogo._loadGoogleFont();

          setTimeout(() => {
            if (this.emberLogo) return;
            this.emberLogo = EmberLogo.createFloatingPanel(document.body, {
              showSubtitle: false,
              isAwake: true,
              scale: 0.55,
              emberCountMultiplier: 0.4,
              emberSpeedMultiplier: 0.3,
              emberSizeMultiplier: 0.4,
              bgOpacity: 0.0,
              displaySubtitle: false,
            });
            if (this.emberLogo._shell) {
              this.emberLogo._shell.style.position = 'absolute';
              this.emberLogo._shell.style.left = '450px'; 
              this.emberLogo._shell.style.top = '2px'; 
              this.emberLogo._shell.style.zIndex = '9999999';
            }
          }, 1000);
        }
      } catch (e) {
        console.warn('Failed to load or instantiate EmberLogo:', e);
      }

      await this.processPendingTasks();
      this.uiManager.setStatus('Ready.', false, 4000);
      this._setupGlobalKeyListeners();
      this._setupMessageListener();

      const isChild = window._dev_projectEditorInstance && window._dev_projectEditorInstance !== this;
      if (!isChild) {
        window.vibesApp = this;
      }
    }

  async _handleRunProjectInWindowMessage(event) {
      const { type, payload } = event?.data || {};
      if (type !== 'recursi:runProjectInWindow') return;
      const projectName = payload?.projectName;
      if (!projectName) {
        console.warn(
          '[ProjectEditorApp] runProjectInWindow: missing projectName in payload'
        );
        return;
      }
      console.log('[ProjectEditorApp] runProjectInWindow:', projectName);

      if (typeof InWindowScriptInjector === 'undefined') {
        console.error('[ProjectEditorApp] InWindowScriptInjector not loaded');
        return;
      }

      const injector = new InWindowScriptInjector(this, { projectName });
      try {
        await injector.launch();
      } catch (e) {
        console.error('[ProjectEditorApp] runProjectInWindow failed:', e);
        this.uiManager?.setStatus(
          'Failed to launch ' + projectName + ': ' + e.message,
          true
        );
      }
    }

  

  static _doc_intro() {
      return '## ProjectEditorApp\n\nThe central orchestrator and state holder for the Vibes IDE. It binds together the UI managers, file systems, code parsers, and command handlers into a single cohesive application instance.';
    }

  static _doc_architecture() {
      return '## Architecture\n\n`ProjectEditorApp` acts as the root dependency injection container. Subsystems like `ProjectFilesManager`, `TabOrchestrator`, `AppUIManager`, and `RunnerManager` are instantiated here and hold references back to this app object.';
    }

  static _doc_bootLifecycle() {
      return '## Boot Lifecycle\n\nThe app initialization is driven by `ProjectLoader`, which reads URL parameters (static mode, server mode) to determine the data source, mounts the appropriate `VirtualFileSystem`, and brings up the initial layout.';
    }

  

  setProtocolMode(mode) {
    this.settings.protocolMode = mode;
    this._saveSettings();
    if (this.uiManager) {
      this.uiManager.setStatus(`Protocol mode set to ${mode}`);
    }
    console.log(`[ProjectEditorApp] Protocol mode set to ${mode}`);
  }


  static _doc_overview() {
      return `# ProjectEditorApp

The \`ProjectEditorApp\` is the master orchestrator, root state holder, and dependency injection container for the Vibes IDE.
It instantiates and binds together all major subsystems, including the Virtual File System (VFS), Code Parsers, Action Registries, Tab Orchestrators, and UIs.
A single global instance is published at \`window._dev_projectEditorInstance\` to allow decoupled communication between floating workspaces and tools.`;
    }

  static _doc_state_coordination() {
      return `## Core State & Lifecycle Management

The app coordinates two primary patching operation modes:
1. **Browser-only IndexedDB Patch Mode**: Non-destructive browser-first editing. Edits are written to browser IndexedDB and files are dynamically reconstructed and hot-patched in memory.
2. **Local Directory Mode**: Files are committed directly to local disk storage via \`LocalDirectoryStore\`.

### Key Registries
- \`editorControllers\`: Tracks open floating editor window structures.
- \`symbolMap\`: A compiled registry linking exported class symbols to their exact physical paths, enabling automated ES6 import resolutions.
- \`historyManager\`: Tracks file and method mutations across IndexedDB, feeding the Timeline Undo dialog.`;
    }

  static _doc_comms() {
      return `## Inter-Frame Cross-Window Handshake

**NOTE: TeleporterBridge is obsolete.** The system has transitioned away from the deprecated cross-window postMessage teleporter.
For modular coordination, the app leverages direct File System Access API workspace mounting and in-memory VFS routing to achieve a fully portable, client-side, hot-patchable editing workflow.`;
    }

  static _doc() {
      return [
        this._doc_ProjectEditorApp(),
        this._doc_intro(),
        this._doc_architecture(),
        this._doc_bootLifecycle(),
        this._doc_state_coordination(),
        this._doc_comms()
      ].join('\n\n');
    }

  static _doc_ProjectEditorApp() {
      return `# ProjectEditorApp

## Summary

ProjectEditorApp is the master dependency injection container and state coordinator for the Vibes browser-based workspace. It unifies all major subsystems-VFS, code parsers, action registries, tab managers, and floating dialogs-and publishes its central instance at window._dev_projectEditorInstance to let decoupled tools communicate seamlessly.`;
    }

  async run(env) {
      this.env = env;
      this.rootContainer = env.container;
      await this.init();
      return this;
    }

  

  

  async injectMetadataFooters(command) {
      this.app.uiManager.setStatus(
        'Injecting metadata footers into all project files...'
      );
      this.app.uiManager.setLoadingState(true);

      const codeParser = this.app.codeParser;

      try {
        const listResult = await this.listFiles({});
        if (listResult.error) throw new Error(listResult.error);

        const allFiles = [
          ...(listResult.fileTree.js || []),
          ...(listResult.fileTree.css || []),
          ...(listResult.fileTree.html || []),
          ...(listResult.fileTree.other || []),
        ];

        let modifiedCount = 0;
        const skipFiles = new Set([
          'project_metadata.json',
          'file_metadata.json',
          'clone-metadata.json',
          'template.md',
          'README.md',
        ]);

        for (const fileInfo of allFiles) {
          const goldenPath = fileInfo.path;
          const fileName = goldenPath.split('/').pop();

          if (
            goldenPath.startsWith('/library/') ||
            goldenPath.includes('/documentation/') ||
            goldenPath.includes('/visibilitySets/') ||
            skipFiles.has(fileName)
          ) {
            continue;
          }

          let rawCode = null;

          if (this.app.vfs) {
            rawCode = await this.app.vfs.readFile(goldenPath, {
              nullOnMissing: true,
            });
          } else if (
            this.app.inMemoryFileStore &&
            this.app.inMemoryFileStore.has(goldenPath)
          ) {
            rawCode = this.app.inMemoryFileStore.get(goldenPath);
          }

          if (rawCode === null) continue;

          const { code: strippedCode } = codeParser.extractAndStripFooterMetadata(
            rawCode,
            goldenPath
          );

          let provides = [];

          if (goldenPath.endsWith('.js')) {
            const parseResult = codeParser.parseForMetadata(
              strippedCode,
              goldenPath
            );
            provides = (parseResult.exports || [])
              .map((e) => e.name)
              .filter(Boolean);
          }

          const metadata = {
            schema: 1,
            lines: strippedCode.split('\n').length,
          };

          if (provides.length > 0) metadata.provides = provides;

          const newCode = codeParser.appendFooterMetadata(
            strippedCode,
            goldenPath,
            metadata
          );

          if (newCode !== rawCode) {
            if (this.app.vfs) {
              await this.app.vfs.writeFile(goldenPath, newCode);
              if (this.app.inMemoryFileStore)
                this.app.inMemoryFileStore.set(goldenPath, newCode);
            } else if (this.app.inMemoryFileStore) {
              this.app.inMemoryFileStore.set(goldenPath, newCode);
            }
            modifiedCount++;
          }
        }

        this.app.uiManager.setStatus(
          `Injected footers into ${modifiedCount} files.`,
          false,
          4000
        );

        if (modifiedCount > 0) {
          if (this.app.projectLoader) {
            this.app.inMemoryFileMetadata =
              await this.app.projectLoader._calculateInMemoryMetadata();
            if (this.app.projectFilesManager) {
              this.app.projectFilesManager.fileMetadata =
                this.app.inMemoryFileMetadata;
            }
          }
        }

        for (const ctrl of this.app.editorControllers.values()) {
          const activePath = ctrl.filePath;
          let currentRaw = null;

          if (this.app.vfs) {
            currentRaw = await this.app.vfs.readFile(activePath, {
              nullOnMissing: true,
            });
          } else if (
            this.app.inMemoryFileStore &&
            this.app.inMemoryFileStore.has(activePath)
          ) {
            currentRaw = this.app.inMemoryFileStore.get(activePath);
          }

          if (currentRaw) {
            const cleanCode = codeParser.extractAndStripFooterMetadata(
              currentRaw,
              activePath
            ).code;
            if (ctrl.getCode() !== cleanCode) {
              await ctrl.updateCodeAndMetadata(cleanCode);
              ctrl.markClean();
            }
          }
        }
      } catch (error) {
        console.error(error);
        this.app.uiManager.setStatus(
          `Failed to inject footers: ${error.message}`,
          true
        );
      } finally {
        this.app.uiManager.setLoadingState(false);
      }
    }

  _getGlobalLexicalClassByName(className) {
      if (!className) return null;

      try {
        const value = Function(
          'className',
          "try { return eval('typeof ' + className) !== 'undefined' ? eval(className) : null; } catch (error) { return null; }"
        )(className);

        if (typeof value === 'function') {
          try {
            globalThis[className] = value;
            if (typeof window !== 'undefined') {
              window[className] = value;
            }
            
            // Log global class registration
            if (globalThis.__classRegistrationLogger && typeof globalThis.__classRegistrationLogger.log === 'function') {
              globalThis.__classRegistrationLogger.log(className, 'separate');
            }

            globalThis.__vibesGlobalScriptClasses =
              globalThis.__vibesGlobalScriptClasses || new Set();
            globalThis.__vibesGlobalScriptClasses.add(className);
          } catch (error) {}
          return value;
        }
      } catch (error) {}

      try {
        const value = globalThis[className];
        if (typeof value === 'function') {
          if (typeof window !== 'undefined' && !window[className]) {
            window[className] = value;
          }
          return value;
        }
      } catch (error) {}

      return null;
    }
}