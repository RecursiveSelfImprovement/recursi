// phase2-managed-migration: internal imports/exports stripped
class ActionInitializer {
  
  constructor(app) {
    this.app = app;
  }

  registerAllActions() {
      this.app.actionRegistry.register({ id: 'file:open-browser', label: '🚀 Open Project Browser', handler: () => this.app.tabOrchestrator.createProjectBrowserTab(), menuPath: 'File / Open Project Browser' });
      this.app.actionRegistry.register({ id: 'file:save-all', label: '💾 Save All', handler: () => this.app.actionHandler.handleSaveAllFiles() });
      this.app.actionRegistry.register({ id: 'file:scaffold-capsule', label: '💊 Scaffold Project Capsule', handler: () => this.app.commands.scaffoldProjectCapsule({}), menuPath: 'File / Scaffold Project Capsule' });
      this.app.actionRegistry.register({ id: 'file:pack-and-save', label: '📦 Pack Project (Recursi-Ball)...', handler: () => this.app.actionHandler.handlePackAndSave(), menuPath: 'File / Pack Project...' });
      this.app.actionRegistry.register({ id: 'file:export-zip', label: '🗜️ Export as .zip file', handler: () => this.app.actionHandler.handleExportToZip(), menuPath: 'File / Export as .zip' });
      this.app.actionRegistry.register({ id: 'file:convert-to-localdir', label: '📁 Convert to Local Directory...', handler: () => this.app.actionHandler.handleConvertToLocalDirectory(this.app.projectName), menuPath: 'File / Convert to Local Directory...' });
      
      this.app.actionRegistry.register({ id: 'view:rearrange-windows', label: '🗔 Rearrange Windows', handler: () => this.app.actionHandler.handleRearrangeWindows() });
      this.app.actionRegistry.register({ id: 'view:appearance-settings', label: '🖌️ Global Appearance Settings', handler: () => this.app.appearanceManager.showDialog(), menuPath: 'View / Appearance Settings' });
      this.app.actionRegistry.register({ id: 'view:show-logo', label: '✨ Show Logo', handler: () => this.app.uiManager.showLogoAnimation(), menuPath: 'View / Show Logo' });
      
      this.app.actionRegistry.register({ id: 'tools:show-playground', label: '🕹️ Component Playground', handler: () => this.app.actionHandler.togglePlayground(), menuPath: 'Tools / Component Playground' });
      this.app.actionRegistry.register({ id: 'tools:push-to-runner', label: '🚀 Live Preview', handler: () => this.app.actionHandler.handlePushToRunner() });
      
      this.app.actionRegistry.register({
        id: 'tools:view-class-logs',
        label: '📋 View Global Class Logs',
        handler: () => this.app.actionHandler.handleViewClassLogs(),
        menuPath: 'Tools / View Global Class Logs'
      });

      this.app.actionRegistry.register({
        id: 'tools:clear-local-data',
        label: '🧹 Clear All Local Data (Safe)',
        menuPath: 'Tools / Clear All Local Data',
        handler: () => this.app.actionHandler.handleClearLocalData()
      });

      this.app.actionRegistry.register({
        id: 'tools:hot-patch-manager', label: '🔥 Toggle Hot Patch Mode',
        handler: () => {
          if (this.app.settings) {
            this.app.settings.preferHotPatching = !(this.app.settings.preferHotPatching !== false);
            if (typeof this.app._saveSettings === 'function') this.app._saveSettings();
            if (this.app.uiManager?.updateGlobalButtonStates) this.app.uiManager.updateGlobalButtonStates();
            if (this.app.uiManager?.setStatus) {
              this.app.uiManager.setStatus(`🔥 Hot Patching ${this.app.settings.preferHotPatching !== false ? 'ON' : 'OFF'}`, false, 3000);
            }
          }
        }
      });
      
      this.app.actionRegistry.register({ id: 'debug:rebuild-symbol-map', label: '🧠 Rebuild Symbol Map', handler: () => this.app.rebuildSymbolMap() });
      this.app.actionRegistry.register({ id: 'debug:recalculate-all-metadata', label: '🧮 Recalculate All Metadata', handler: () => this.app.commands.recalculateAllMetadata() });
      this.app.actionRegistry.register({ id: 'debug:show-file-logger', label: '📜 Show File Operation Log', handler: () => this.app.fileLogDialog?.show(), menuPath: 'Debug / File Operation Log' });
      this.app.actionRegistry.register({ id: 'debug:paste', label: 'Paste', handler: () => this.app.uiManager.ui.pasteButton?.click(), shortcut: 'p' });
      
      this.app.actionRegistry.register({
        id: 'tools:clipboard-path-scanner',
        label: '📋 Extract Files from Clipboard',
        menuPath: 'Tools / Extract Files from Clipboard',
        handler: async () => {
          if (typeof ClipboardPathScanner === 'undefined') {
            try {
              await this.app._loadClassicScriptOnce('/vibes/src/editor/ui/tools/ClipboardPathScanner.js');
            } catch (e) {
              this.app.uiManager?.setStatus('Failed to load ClipboardPathScanner', true);
              return;
            }
          }
          if (typeof ClipboardPathScanner !== 'undefined') {
            new ClipboardPathScanner().execute(this.app);
          }
        }
      });

      this.app.actionRegistry.register({
        id: 'runner:install-node-runner',
        label: '📦 Install Node Runner to Workspace',
        menuPath: 'Tools / Node Runner / 1. Install to Workspace',
        handler: async () => {
          const stores = Array.from(this.app.workspaceFileStores?.entries() || []);
          if (stores.length === 0) {
            this.app.uiManager?.setStatus('No workspace roots available. Mount a folder first.', true);
            return;
          }
          const [rootId, store] = stores[0];
          const tools = this.app.projectFilesManager?._ensureBreakdownHelpers?.()?.visibleNodeRunnerTools;
          if (tools) {
            this.app.uiManager?.setStatus('Installing Node Runner...');
            const result = await tools.installVisibleNodeRunnerForWorkspaceRoot(this.app.projectFilesManager, rootId, store);
            if (result.failed === 0) {
              this.app.uiManager?.setStatus('Node Runner installed! Run "node VibesNodeRunner/boot.js" in your terminal.', false, 10000);
            } else {
              this.app.uiManager?.setStatus('Failed to install Node Runner. Errors: ' + result.errors.join(', '), true);
            }
          }
        }
      });

      this.app.actionRegistry.register({
        id: 'runner:smoke-test',
        label: '💨 Send Node Runner Smoke Test',
        menuPath: 'Tools / Node Runner / 2. Send Smoke Test',
        handler: async () => {
          const stores = Array.from(this.app.workspaceFileStores?.entries() || []);
          if (stores.length === 0) return;
          const [rootId, store] = stores[0];
          const tools = this.app.projectFilesManager?._ensureBreakdownHelpers?.()?.visibleNodeRunnerTools;
          if (tools) {
            await tools.enqueueVisibleNodeRunnerSmokeJob(this.app.projectFilesManager, rootId, store);
            this.app.uiManager?.setStatus('Smoke test queued. Check terminal!', false, 5000);
          }
        }
      });
      
      this.app.actionRegistry.register({
        id: 'runner:screenshot-demo',
        label: '🧹 Run Screenshot Organizer Demo',
        menuPath: 'Tools / Node Runner / 3. Run Screenshot Organizer',
        handler: async () => {
          const stores = Array.from(this.app.workspaceFileStores?.entries() || []);
          if (stores.length === 0) return;
          const [rootId, store] = stores[0];
          const tools = this.app.projectFilesManager?._ensureBreakdownHelpers?.()?.visibleNodeRunnerTools;
          if (tools) {
            await tools.enqueueScreenshotOrganizerJob(this.app.projectFilesManager, rootId, store);
            this.app.uiManager?.setStatus('Screenshot Organizer job queued. Check terminal!', false, 5000);
          }
        }
      });

      this.app.actionRegistry.register({
        id: 'runner:view-outbox',
        label: '📥 View Node Runner Outbox',
        menuPath: 'Tools / Node Runner / 4. View Outbox',
        handler: async () => {
          const stores = Array.from(this.app.workspaceFileStores?.entries() || []);
          if (stores.length === 0) return;
          const [rootId, store] = stores[0];
          const tools = this.app.projectFilesManager?._ensureBreakdownHelpers?.()?.visibleNodeRunnerTools;
          if (tools) {
            tools.showVisibleNodeRunnerOutbox(this.app.projectFilesManager, rootId, store);
          }
        }
      });

      if (typeof this._registerPlaygroundActions === 'function') this._registerPlaygroundActions();
    }

  _registerPlaygroundActions() {
      this.app.actionRegistry.register({
        id: 'playground:llm-input',
        label: '🤖 LLM Input Simulator',
        description: 'Simulate incoming text from an LLM without using the clipboard. Useful for testing prompts and protocols.',
        category: 'playground',
        handler: () => {},
        contentRendererMethod: '_createLlmInputCardContent',
      });

      this.app.actionRegistry.register({
        id: 'playground:screen-cap',
        label: '📸 Screen Capture Tool',
        description: 'A tool for capturing screen regions and generating thumbnails.',
        category: 'playground',
        handler: () => {},
        contentRendererMethod: '_createScreenCapCardContent',
      });

      this.app.actionRegistry.register({
        id: 'playground:hiliter',
        label: '🖍️ Screen Highlighter',
        description: 'An interactive screen annotation and chroma key overlay tool.',
        category: 'playground',
        handler: () => {},
        contentRendererMethod: '_createHiliterCardContent',
      });

      this.app.actionRegistry.register({
        id: 'playground:file-search',
        label: '🔍 File Search',
        description: 'Quickly find text across all JS, HTML, and CSS files in the project.',
        category: 'playground',
        handler: () => {},
        contentRendererMethod: '_createFileSearchCardContent',
      });

      this.app.actionRegistry.register({
        id: 'playground:clipboard-catcher',
        label: '🪤 Clipboard Catcher',
        description: 'Intercepts "Copy to Clipboard" actions from other tools (Dictation, Prompt Output) and routes the text here instead.',
        category: 'playground',
        handler: () => {},
        contentRendererMethod: '_createClipboardCatcherCardContent',
      });

      this.app.actionRegistry.register({
        id: 'playground:vis-stripper',
        label: '✂️ AST Visibility Stripper',
        description: 'Test the AST logic used by the BuildPromptTab to compress files before sending them to the LLM.',
        category: 'playground',
        handler: () => {},
        contentRendererMethod: '_createVisStripperCardContent',
      });

      this.app.actionRegistry.register({
        id: 'tools:floating-workbench',
        label: '🛠️ Floating Workbench',
        handler: () => {
          if (!this.app._floatingWorkbench) {
            this.app._floatingWorkbench = new FloatingWorkbenchLauncher(this.app);
          }
          this.app._floatingWorkbench.open();
        },
        menuPath: 'Tools / Floating Workbench',
      });
    }

    


  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### ActionInitializer\n\nRegisters all core global shortcuts, workspace menus, and playground actions with the central ActionRegistry on startup.";
    }
}