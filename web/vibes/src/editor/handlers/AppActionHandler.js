class AppActionHandler {
  constructor(app) {
    this.app = app;
  }

  async handleSaveAllFiles() {
      if (!this.app.editorControllers || this.app.editorControllers.size === 0) {
        this.app.uiManager.setStatus('No open files to save.');
        return [];
      }

      const dirtyControllers = Array.from(
        this.app.editorControllers.values()
      ).filter(
        (ctl) =>
          ctl && ctl.isDirty && typeof ctl.getReconstructedCode === 'function'
      );

      if (dirtyControllers.length === 0) {
        if (this.app.inMemoryFileStore) {
          if (this.app.activeRunnerInjector) {
            await this.handlePushToRunner();
            return [];
          }
        }
        this.app.uiManager.setStatus('All files are already saved.');
        return [];
      }

      this.app.uiManager.setStatus(
        `Saving ${dirtyControllers.length} file(s)...`
      );

      const saved = [];
      const failed = [];
      const CHUNK_SIZE = 5;

      for (let i = 0; i < dirtyControllers.length; i += CHUNK_SIZE) {
        const chunk = dirtyControllers.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (ctl) => {
            try {
              let code = await ctl.getReconstructedCode('module');
              const goldenPath = ctl.filePath;

              if (this.shouldAppendFooterMetadata(goldenPath)) {
                const metadata = {
                  schema: 1,
                  lines: code.split('\n').length,
                  provides: ctl.exports ? ctl.exports.map((e) => e.name) : [],
                };
                code = this.app.codeParser.appendFooterMetadata(
                  code,
                  goldenPath,
                  metadata
                );
              }

              if (this.app.vfs) {
                await this.app.vfs.writeFile(goldenPath, code);
                if (this.app.inMemoryFileStore) {
                  this.app.inMemoryFileStore.set(goldenPath, code);
                }
              } else {
                const rootId = '/' + goldenPath.split('/').filter(Boolean)[0];
                const externalStore = this.app.workspaceFileStores?.get(rootId);

                if (externalStore && typeof externalStore.set === 'function') {
                  await externalStore.set(goldenPath, code);
                  if (this.app.inMemoryFileStore) {
                    this.app.inMemoryFileStore.set(goldenPath, code);
                  }
                } else if (this.app.inMemoryFileStore) {
                  this.app.inMemoryFileStore.set(goldenPath, code);
                } else {
                  throw new Error(
                    'No writable store available for ' + goldenPath
                  );
                }
              }

              ctl.markClean();
              await this.app.updateSingleFileMetadata(goldenPath, code);
              saved.push(goldenPath);
            } catch (err) {
              failed.push(ctl.filePath);
              console.error('Save failed for ' + ctl.filePath + ':', err);
            }
          })
        );
      }

      if (failed.length) {
        this.app.uiManager.setStatus(
          `Saved with ${failed.length} failure(s).`,
          true
        );
      } else {
        this.app.uiManager.setStatus(
          `Saved ${saved.length} file(s) successfully.`
        );
        if (this.app.inMemoryFileStore && this.app.activeRunnerInjector) {
          await this.handlePushToRunner();
        } else if (this.app.tabOrchestrator?.previewTabId) {
          this.app.tabOrchestrator.refreshUrlPreviewTab(this.app.projectName);
        }
      }
      return failed;
    }

  handleTabChange(newTabId, oldTabId) {
      if (newTabId === 'output-tab' && this.app.outputTab) {
        if (this.app.outputTab.updateCopyButtonState) {
          this.app.outputTab.updateCopyButtonState();
        }
      }
      if (newTabId === 'build-prompt-tab' && this.app.buildPromptTab) {
        if (this.app.buildPromptTab.updateCopyButtonState) {
          this.app.buildPromptTab.updateCopyButtonState();
        }
      }
    }

  async handleTabCloseRequest(tabId) {
      this.app.tabOrchestrator.removeTab(tabId);
      return Promise.resolve(true);
    }

  async togglePlayground() {
    if (
      this.app.playgroundTabId &&
      this.app.tabManager.tabs.has(this.app.playgroundTabId)
    ) {
      this.app.tabManager.setActiveTab(this.app.playgroundTabId);
      return;
    }

    const ControllerClass =
      globalThis.PlaygroundController || window.PlaygroundController;
    if (!ControllerClass) {
      this.app.uiManager.setStatus(
        'PlaygroundController is not loaded in the global scope.',
        true
      );
      return;
    }

    const playgroundPanel = makeElement('div', {
      className: 'playground-container',
      style: { height: '100%', display: 'flex', flexDirection: 'column' },
    });

    this.app.playgroundTabId = this.app.tabManager.addTab(
      'Playground',
      playgroundPanel,
      true,
      'playground-tab'
    );

    this.app.playgroundController = new ControllerClass(playgroundPanel);
    this.app.tabManager.setActiveTab(this.app.playgroundTabId);

    if (this.app.uiManager.ui.playgroundButton) {
      this.app.uiManager.ui.playgroundButton.style.opacity = '0.3';
    }
  }

  

  async handleOpenDocFor(sourcePath) {
      if (!sourcePath) return;
      this.app.uiManager.setStatus(`Opening documentation for ${sourcePath}...`);
      try {
        const exists = await this.app.documentationManager.ensureDocExists(
          sourcePath
        );
        if (exists) {
          const docPath = this.app.documentationManager.getDocPath(sourcePath);
          if (docPath) {
            const fullDocPath = `/${this.app.projectName}/${docPath}`;
            const store = this.app.workspaceFileStores?.get('/' + this.app.projectName) || this.app.inMemoryFileStore;
            if (this.app.projectFilesManager && typeof this.app.projectFilesManager._openFloatingExternalEditorWindow === 'function') {
              await this.app.projectFilesManager._openFloatingExternalEditorWindow(fullDocPath, store);
            }
          }
        } else {
          throw new Error('Could not create the documentation file.');
        }
      } catch (error) {
        console.error(`Error opening documentation for ${sourcePath}:`, error);
        this.app.uiManager.setStatus(
          `Failed to open documentation: ${error.message}`,
          true
        );
      }
    }

  async handleCloseAllTabs() {
    const tabManager = this.app.tabManager;
    if (!tabManager) return;

    const allTabIds = Array.from(tabManager.tabs.keys());
    const fileTabIds = allTabIds.filter((tabId) =>
      this.app.editorControllers.has(tabId)
    );

    if (fileTabIds.length > 0) {
      this.app.uiManager.setStatus(
        `Closing ${fileTabIds.length} file tab(s)...`
      );
      const closePromises = fileTabIds.map((tabId) =>
        this.handleTabCloseRequest(tabId)
      );
      await Promise.all(closePromises);
      this.app.uiManager.setStatus(`File tabs closed.`);
    } else {
      this.app.uiManager.setStatus('Closing all tool tabs...');
      const toolTabIds = allTabIds.filter(
        (tabId) => !this.app.editorControllers.has(tabId)
      );

      for (const tabId of toolTabIds) {
        this.app.tabOrchestrator.removeTab(tabId);
      }
    }
  }

  async handleRecalculateFileMetadata() {
    this.app.uiManager.setStatus('Recalculating file metadata...');
    try {
      await this.app.recalculateFileMetadata();
      this.app.uiManager.setStatus('File metadata updated successfully.');
    } catch (error) {
      console.error('Failed to recalculate file metadata:', error);
      this.app.uiManager.setStatus(`Error: ${error.message}`, true);
    }
  }

  async handleToggleDictation() {
    this.app.actionHandler.focusBuildPromptTab();
  }

  handleReportButtonClick() {
    if (!this.app.reportManager) return;
    const reportText = this.app.reportManager.getReportPayload(
      this.app.projectName
    );
    this.app.uiManager.showInOutputTab(reportText);
    this.app.reportManager
      .getPendingChecks()
      .forEach((c) => this.app.reportManager.acknowledge(c.timestamp));
    this.app.updateReportButtonState();
  }

  async handlePushToRunner(directPayload = null) {
      const projectName = this.app.sourceProjectName || this.app.projectName;
      if (projectName === 'vibes') {
        console.log(
          '[AppActionHandler] 🧠 Self-detection: Vibes is editing itself - runner preview suppressed. Use Hot Patch or reload.'
        );
        this.app.uiManager.setStatus(
          'Vibes does not preview itself - use 🔥 Hot Patch or reload.',
          false,
          6000
        );
        return;
      }

      this.app.uiManager.setStatus('Launching Native In-Window Runner...');

      if (typeof InWindowScriptInjector !== 'undefined') {
        const injector = new InWindowScriptInjector(this.app, { projectName });
        try {
          if (this.app.activeRunnerInjector) this.app.activeRunnerInjector.destroy();
          await injector.launch();
          this.app.activeRunnerInjector = injector;
          this.app.activeRunnerProject = projectName;
          if (this.app.emit) this.app.emit('runner:started', projectName);
          this.app.uiManager.setStatus('In-Window Runner launched successfully.');
        } catch (error) {
          this.app.uiManager.setStatus(`Live Preview Failed: ${error.message}`, true);
        }
      } else {
        this.app.uiManager.setStatus('InWindowScriptInjector failed to load.', true);
      }
    }

  focusBuildPromptTab() {
    if (!this.app.tabManager) return;

    let tabId = 'build-prompt-tab';
    if (!this.app.tabManager.tabs.has(tabId)) {
      if (this.app.BuildPromptTab) {
        this.app.buildPromptTab = new this.app.BuildPromptTab(this.app);
        this.app.tabManager.addTab(
          'Build Prompt',
          this.app.buildPromptTab.getElement(),
          true,
          tabId
        );
      }
    }

    if (!this.app.tabManager.tabs.has('output-tab')) {
      if (this.app.OutputTab) {
        this.app.outputTab = new this.app.OutputTab(this.app);
        this.app.tabManager.addTab(
          'Output',
          this.app.outputTab.getElement(),
          true,
          'output-tab'
        );
      }
    }

    const context = {};
    const timeSinceVisibilityChange =
      Date.now() - (this.app.lastVisibilityChangeTime || 0);
    if (timeSinceVisibilityChange < 5000) {
      context.reason = 'fileVisibilityChanged';
    }

    if (this.app.buildPromptTab) {
      this.app.buildPromptTab.smartOpen(context);
    }

    this.app.tabManager.setActiveTab(tabId);
  }

  async handlePackAndSave() {
      const includeDocsKey = 'recursi_pack_include_docs';
      const namingSchemeKey = 'recursi_pack_naming_scheme';

      const lastDocsSetting = localStorage.getItem(includeDocsKey);
      const lastNamingScheme = localStorage.getItem(namingSchemeKey) || 'date';

      const defaultChecked = this.app.inMemoryFileStore
        ? lastDocsSetting !== 'false'
        : lastDocsSetting === 'true';

      const baseNameInput = makeElement('input', {
        id: 'pack-base-filename-input',
        type: 'text',
        value: this.app.projectName,
      });

      const schemeSelect = makeElement('select', { id: 'pack-naming-scheme' }, [
        makeElement('option', { value: 'date', selected: lastNamingScheme === 'date' }, 'Append Date/Time'),
        makeElement('option', { value: 'number', selected: lastNamingScheme === 'number' }, 'Append Incrementing Number'),
        makeElement('option', { value: 'none', selected: lastNamingScheme === 'none' }, 'None'),
      ]);

      const docsCheckbox = makeElement('input', {
        id: 'pack-include-docs-checkbox',
        type: 'checkbox',
        checked: defaultChecked,
        style: { width: 'auto', marginBottom: '0' } // Override UITools 100% width for checkboxes
      });

      const filenamePreview = makeElement('div', {
        style: {
           marginTop: '15px', 
           padding: '10px', 
           background: 'rgba(0,0,0,0.4)', 
           borderRadius: '6px',
           border: '1px solid rgba(100,180,255,0.2)',
           color: '#aaccff',
           fontFamily: 'monospace',
           fontSize: '11px',
           textAlign: 'center'
        }
      });

      const updatePreview = () => {
        const baseName = baseNameInput.value.trim();
        if (!baseName) {
          filenamePreview.textContent = 'Invalid base name';
          return;
        }
        let finalName = '';
        if (schemeSelect.value === 'date') {
          const dateStr = this._getFormattedDateForFilename();
          finalName = `${baseName}_${dateStr}.html`;
        } else if (schemeSelect.value === 'number') {
          const storageKey = `recursi_pack_increment_${baseName}`;
          const lastNum = parseInt(localStorage.getItem(storageKey) || '0', 10);
          finalName = `${baseName}-${lastNum + 1}.html`;
        } else {
          finalName = `${baseName}.html`;
        }
        filenamePreview.textContent = `Output: ${finalName}`;
      };

      const content = makeElement('div', {}, [
        makeElement('p', { style: { color: 'rgba(255,255,255,0.7)', marginBottom: '20px' } }, 'Create a standalone, self-contained HTML file from the current project state.'),
        
        makeElement('div', { className: 'form-row' }, [
          makeElement('label', { htmlFor: 'pack-base-filename-input' }, 'Base Filename'),
          baseNameInput
        ]),
        
        makeElement('div', { className: 'form-row' }, [
          makeElement('label', { htmlFor: 'pack-naming-scheme' }, 'Naming Scheme'),
          schemeSelect
        ]),
        
        makeElement('div', { className: 'form-row', style: { justifyContent: 'flex-start', gap: '10px' } }, [
          docsCheckbox,
          makeElement('label', { htmlFor: 'pack-include-docs-checkbox' }, 'Include documentation files in payload')
        ]),

        filenamePreview
      ]);

      [baseNameInput, schemeSelect].forEach((input) =>
        input.addEventListener('input', updatePreview)
      );
      [baseNameInput, schemeSelect].forEach((input) =>
        input.addEventListener('change', updatePreview)
      );

      UITools.makeDialog({
        title: '📦 Pack Standalone App',
        content: content,
        width: '460px',
        buttons: [
          {
            label: 'Pack and Download',
            className: 'primary',
            onClick: (e, dialog) => {
              const baseName = baseNameInput.value.trim();
              if (!baseName) {
                baseNameInput.style.borderColor = '#ff4444';
                return false;
              }
              let finalName = '';
              const selectedScheme = schemeSelect.value;
              
              if (selectedScheme === 'date') {
                const dateStr = this._getFormattedDateForFilename();
                finalName = `${baseName}_${dateStr}.html`;
              } else if (selectedScheme === 'number') {
                const storageKey = `recursi_pack_increment_${baseName}`;
                const lastNum = parseInt(localStorage.getItem(storageKey) || '0', 10);
                const nextNum = lastNum + 1;
                finalName = `${baseName}-${nextNum}.html`;
                localStorage.setItem(storageKey, nextNum.toString());
              } else {
                finalName = `${baseName}.html`;
              }
              
              const includeDocs = docsCheckbox.checked;
              localStorage.setItem(includeDocsKey, includeDocs.toString());
              localStorage.setItem(namingSchemeKey, selectedScheme);
              dialog.close();
              this._executePacking(finalName, includeDocs);
            },
          },
          { label: 'Cancel' },
          {
            label: '📁 Save to Local Disk…',
            onClick: (e, dialog) => {
              dialog.close();
              this.handleSaveToLocalDisk();
            },
          },
        ],
      });
      updatePreview();
    }

  async _executePacking(filename, includeDocs) {
      const packer = new ProjectPacker(this.app.projectName);
      const targetFilename =
        filename || this.app.projectName + '-standalone.html';
      let fileMapToPack = new Map();
      let metadataToPack = null;

      this.app.uiManager.setStatus('Gathering files for packing through VFS...');
      this.app.uiManager.setLoadingState(true);

      try {
        await this.handleSaveAllFiles();

        const vfs = await this._getVfsForStaticMigration();
        let paths = [];

        if (vfs && typeof vfs.listFiles === 'function') {
          paths = await vfs.listFiles({
            includeStatic: false,
          });
        }

        if (!Array.isArray(paths) || paths.length === 0) {
          if (
            this.app.inMemoryFileStore &&
            typeof this.app.inMemoryFileStore.keys === 'function'
          ) {
            paths = Array.from(this.app.inMemoryFileStore.keys());
          }
        }

        if ((!Array.isArray(paths) || paths.length === 0) && this.app.projectFilesManager) {
          const seen = new Set();
          const trees = typeof this.app.projectFilesManager.getFileTreeViews === 'function' 
            ? this.app.projectFilesManager.getFileTreeViews() 
            : [];
          if (trees.length === 0 && this.app.projectFilesManager.fileTreeView) {
            trees.push(this.app.projectFilesManager.fileTreeView);
          }
          for (const tree of trees) {
            if (tree?.nodesMap) {
              for (const node of tree.nodesMap.values()) {
                if (node && node.type === 'file' && !seen.has(node.id)) {
                  seen.add(node.id);
                  paths.push(node.id);
                }
              }
            }
          }
        }

        const failedReads = [];

        for (const path of Array.from(new Set(paths)).sort()) {
          if (!includeDocs && String(path).includes('/documentation/')) {
            continue;
          }

          const content = await this._readFileForStaticMigration(path);

          if (typeof content === 'string') {
            fileMapToPack.set(path, content);
          } else {
            failedReads.push(path);
          }
        }

        if (failedReads.length > 0) {
          throw new Error(
            'Aborted pack: failed to read ' +
              failedReads.length +
              ' file(s) through VFS/store. First missing: ' +
              failedReads[0]
          );
        }

        if (fileMapToPack.size === 0) {
          throw new Error(
            'File gathering failed; no files were collected for packing.'
          );
        }

        if (
          this.app.documentationManager &&
          typeof this.app.documentationManager.getFileMetadata === 'function'
        ) {
          metadataToPack = await this.app.documentationManager.getFileMetadata();
        } else {
          metadataToPack = this.app.inMemoryFileMetadata || {};
        }

        this.app.uiManager.setStatus(
          'Packing project to ' + targetFilename + '...'
        );
        await packer.packFromMemoryAndDownload(
          fileMapToPack,
          metadataToPack,
          targetFilename
        );
        this.app.uiManager.setStatus(
          'Project packed and downloaded as ' + targetFilename + '.'
        );
      } catch (error) {
        this.app.uiManager.setStatus('Packing failed: ' + error.message, true);
      } finally {
        this.app.uiManager.setLoadingState(false);
      }
    }

  _getFormattedDateForFilename() {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2),
      mm = String(d.getMonth() + 1).padStart(2, '0'),
      dd = String(d.getDate()).padStart(2, '0'),
      hh = String(d.getHours()).padStart(2, '0'),
      mi = String(d.getMinutes()).padStart(2, '0');
    return `${yy}${mm}${dd}-${hh}${mi}`;
  }

  safeConsoleClear() {
    if (
      this.app.chatterinessLevel >= 9 &&
      typeof console.clear === 'function'
    ) {
      console.clear();
    }
  }

  async handleExportToZip() {
      if (typeof JSZip === 'undefined') {
        this.app.uiManager.setStatus(
          'JSZip library not loaded. Cannot export to zip.',
          true
        );
        return;
      }

      this.app.uiManager.setStatus(
        'Gathering files for zip export through VFS...'
      );
      this.app.uiManager.setLoadingState(true);

      try {
        await this.handleSaveAllFiles();

        const zip = new JSZip();
        const projectFolder = zip.folder(this.app.projectName);
        const fileMapToZip = new Map();
        const vfs = await this._getVfsForStaticMigration();
        let paths = [];

        if (vfs && typeof vfs.listFiles === 'function') {
          paths = await vfs.listFiles({
            includeStatic: false,
          });
        }

        if (
          (!Array.isArray(paths) || paths.length === 0) &&
          this.app.inMemoryFileStore
        ) {
          paths = Array.from(this.app.inMemoryFileStore.keys());
        }

        if (
          (!Array.isArray(paths) || paths.length === 0) &&
          this.app.projectFilesManager
        ) {
          const seen = new Set();
          const trees = typeof this.app.projectFilesManager.getFileTreeViews === 'function' ? this.app.projectFilesManager.getFileTreeViews() : [];
          for (const tree of trees) {
            if (tree.nodesMap) {
              for (const node of tree.nodesMap.values()) {
                if (node && node.type === 'file' && !seen.has(node.id)) {
                  seen.add(node.id);
                  paths.push(node.id);
                }
              }
            }
          }
        }

        const failedReads = [];

        for (const path of Array.from(new Set(paths)).sort()) {
          if (String(path).includes('/library/')) {
            continue;
          }

          const content = await this._readFileForStaticMigration(path);

          if (typeof content === 'string') {
            fileMapToZip.set(path, content);
          } else {
            failedReads.push(path);
          }
        }

        if (failedReads.length > 0) {
          throw new Error(
            'Aborted Zip Export: failed to read ' +
              failedReads.length +
              ' file(s) through VFS/store. First missing: ' +
              failedReads[0]
          );
        }

        if (fileMapToZip.size === 0) {
          throw new Error('No files were collected for zipping.');
        }

        const projectPrefix = this.app.projectName + '/';

        for (const entry of fileMapToZip.entries()) {
          const path = entry[0];
          const content = entry[1];
          let zipPath = path;

          if (zipPath.startsWith('/')) {
            zipPath = zipPath.substring(1);
          }

          if (zipPath.startsWith(projectPrefix)) {
            zipPath = zipPath.substring(projectPrefix.length);
          }

          if (zipPath) {
            projectFolder.file(zipPath, content);
          }
        }

        const zipBlob = await zip.generateAsync({
          type: 'blob',
        });

        const downloadFilename = this.app.projectName + '.zip';
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFilename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.app.uiManager.setStatus(
          'Project exported as ' + downloadFilename + '.'
        );
      } catch (error) {
        this.app.uiManager.setStatus('Zip export failed: ' + error.message, true);
      } finally {
        this.app.uiManager.setLoadingState(false);
      }
    }

  async handleImportFromZip(file) {
    if (typeof JSZip === 'undefined') {
      this.app.uiManager.setStatus(
        'JSZip library not loaded. Cannot import from zip.',
        true
      );
      return;
    }

    const welcomeContainer =
      this.app.rootContainer.querySelector('.welcome-container');
    if (welcomeContainer) {
      welcomeContainer.querySelector(
        'p'
      ).textContent = `Reading ${file.name}...`;
    } else {
      this.app.uiManager.setStatus(`Reading zip file: ${file.name}...`);
    }

    this.app.uiManager.setLoadingState(true);

    try {
      const zip = await JSZip.loadAsync(file);

      const fileMap = new Map();
      const promises = [];

      const rootFolders = new Set();
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const parts = relativePath.split('/');
          if (parts.length > 1 && parts[0] !== '__MACOSX') {
            rootFolders.add(parts[0]);
          }
        }
      });

      let base_folder = '';
      if (rootFolders.size === 1) {
        base_folder = rootFolders.values().next().value + '/';
      }

      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && !relativePath.startsWith('__MACOSX')) {
          const promise = zipEntry.async('string').then((content) => {
            let pathInProject = relativePath;
            if (base_folder && relativePath.startsWith(base_folder)) {
              pathInProject = relativePath.substring(base_folder.length);
            }
            fileMap.set(pathInProject, content);
          });
          promises.push(promise);
        }
      });

      await Promise.all(promises);

      if (fileMap.size === 0) {
        throw new Error('Zip file is empty or contains no files.');
      }

      const projectName = file.name.replace(/\.zip$/, '');
      await this.app.loadProjectFromUnpacked(fileMap, projectName, null);
    } catch (err) {
      console.error('Failed to unpack zip file:', err);
      const message = `Error: ${err.message}`;
      if (welcomeContainer) {
        welcomeContainer.querySelector('p').textContent = message;
      } else {
        this.app.uiManager.setStatus(message, true);
      }
    } finally {
      this.app.uiManager.setLoadingState(false);
    }
  }

  async handlePasteFromLlm() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        this.app.uiManager.setStatus('Clipboard is empty.', true);
        return;
      }
      this.app.llmQueueManager.receive(text, 'clipboard');
    } catch (err) {
      // Clipboard read failed - show manual paste dialog
      this.handlePasteText();
    }
  }

  handlePasteText() {
    const textarea = document.createElement('textarea');
    textarea.style.cssText =
      'width:100%;height:300px;background:#1e1e1e;color:#e0e0e0;border:1px solid #555;border-radius:4px;font-family:monospace;font-size:13px;padding:12px;box-sizing:border-box;resize:vertical;outline:none;';
    textarea.placeholder = 'Paste LLM instructions or code here...';

    const dialog = UITools.makeDialog({
      title: 'Manual Paste',
      content: textarea,
      width: '600px',
      buttons: [
        {
          label: 'Apply',
          className: 'primary',
          onClick: () => {
            const text = textarea.value.trim();
            if (text) this.app.llmQueueManager.receive(text, 'clipboard');
          },
        },
        { label: 'Cancel' },
      ],
    });

    setTimeout(() => textarea.focus(), 50);
  }

  async handleSaveToLocalDisk() {
    if (!('showDirectoryPicker' in window)) {
      this.app.uiManager.setStatus(
        'Your browser does not support the File System Access API. Try Chrome or Edge.',
        true
      );
      return;
    }
    if (!this.app.inMemoryFileStore || this.app.inMemoryFileStore.size === 0) {
      this.app.uiManager.setStatus('No in-memory project is loaded.', true);
      return;
    }
    await this.handleSaveAllFiles();
    let parentHandle;
    try {
      parentHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop',
        id: 'vibes-save-to-disk',
      });
    } catch (e) {
      if (e.name === 'AbortError') return;
      this.app.uiManager.setStatus(`Could not open folder: ${e.message}`, true);
      return;
    }
    const projectName = this.app.projectName;
    this.app.uiManager.setStatus(`Creating "${projectName}" folder on disk…`);
    try {
      // Pull strictly from the global scope (standardized capsule loading behavior)
      const StoreClass =
        globalThis.LocalDirectoryStore || window.LocalDirectoryStore;
      if (!StoreClass) {
        throw new Error('LocalDirectoryStore is not loaded in global scope.');
      }

      const subfolderHandle = await parentHandle.getDirectoryHandle(
        projectName,
        { create: true }
      );
      const store = await StoreClass.open(subfolderHandle, projectName);
      const entries = Array.from(this.app.inMemoryFileStore.entries());
      let written = 0;

      for (const [goldenPath, content] of entries) {
        if (goldenPath.startsWith('/library/')) continue;
        await store.set(goldenPath, content);
        written++;
        if (written % 10 === 0)
          this.app.uiManager.setStatus(
            `Writing files… ${written}/${entries.length}`
          );
      }
      this.app.uiManager.setStatus(
        `Saved ${written} files to "${projectName}" on disk.`
      );
    } catch (err) {
      console.error('[handleSaveToLocalDisk]', err);
      this.app.uiManager.setStatus(`Save to disk failed: ${err.message}`, true);
    }
  }

  shouldAppendFooterMetadata(goldenPath) {
    if (!goldenPath || !goldenPath.endsWith('.js')) return false;
    if (goldenPath.startsWith('/library/')) return false;
    return true;
  }

  async applyPastePlans(plans) {
      const failed = [];
      const stageEditsLocally = this.app.settings?.stageLlmEdits === true;

      for (const plan of plans) {
        try {
          if (!plan.file) {
            throw new Error('No target file specified.');
          }

          let fullPath = plan.file;
          const firstSegment = String(fullPath).split('/').filter(Boolean)[0] || '';
          const rootId = '/' + firstSegment;
          const isMountedWorkspaceRoot = !!this.app.workspaceFileStores?.get(rootId);

          const isKnown =
            this.app.editorControllers.has(fullPath) ||
            (this.app.projectFilesManager?.getFileTreeViews() || []).some(tree => tree.nodesMap?.has(fullPath)) ||
            isMountedWorkspaceRoot;

          if (!isKnown && !fullPath.startsWith('/@ext/')) {
            const pathObj = this.app.createPath(plan.file);
            fullPath = pathObj.toString();
          }

          const finalRootId = '/' + fullPath.split('/').filter(Boolean)[0];
          const externalStore = this.app.workspaceFileStores?.get(finalRootId);

          let activeEditorWindow = null;
          if (this.app.projectFilesManager?.floatingFileTreeState?.editors) {
            activeEditorWindow = this.app.projectFilesManager.floatingFileTreeState.editors.get(fullPath);
          }

          // STRICT SAFETY PASS: Reject total file rewrites on existing JavaScript scripts
          if (plan.action === 'replaceFile' && fullPath.endsWith('.js')) {
            throw new Error(`[Write Aborted] Whole-file replacement is disallowed for existing JavaScript files: ${fullPath}`);
          }

          if (this.app.historyManager) {
            let oldContent = null;
            if (this.app.inMemoryFileStore) {
              oldContent = this.app.inMemoryFileStore.get(fullPath);
            } else if (externalStore && typeof externalStore.get === 'function') {
              oldContent = await Promise.resolve(externalStore.get(fullPath));
              if (typeof oldContent !== 'string' && oldContent?.content) {
                oldContent = oldContent.content;
              }
            }

            if (oldContent && typeof oldContent === 'string') {
              await this.app.historyManager.recordFileChange({
                path: fullPath,
                content: plan.content || plan.rawBody,
                oldContent: oldContent,
                action: plan.action === 'delete' ? 'delete' : (oldContent === null ? 'create' : 'update'),
                additions: plan.additions || [],
                replacements: plan.replacements || [],
                deletions: plan.deletions || []
              });
            }
          }

          if (activeEditorWindow && activeEditorWindow.controller) {
            const existingCtl = activeEditorWindow.controller;
            if (plan.action === 'create' || plan.action === 'replaceFile') {
              await existingCtl.updateCodeAndMetadata(plan.content);
            } else {
              await existingCtl.dataHandler.applyRecursiUpdate(plan);
            }

            if (stageEditsLocally) {
              existingCtl.markDirty?.();
              if (this.app.inMemoryFileStore && typeof plan.content === 'string') {
                this.app.inMemoryFileStore.set(fullPath, plan.content);
              }
            } else {
              const finalCode = await existingCtl.getReconstructedCode('module');
              if (externalStore && typeof externalStore.set === 'function') {
                await externalStore.set(fullPath, finalCode);
              } else {
                await this._saveFileToWritableTarget(fullPath, finalCode);
              }
              await this.app.updateSingleFileMetadata?.(fullPath, finalCode);
              existingCtl.markClean?.();
            }
            continue;
          }

          if (plan.action === 'delete') {
            let targetPath = fullPath;
            try {
              if (this.app.protocolHandler && this.app.protocolHandler._resolveTargetFile) {
                targetPath = this.app.protocolHandler._resolveTargetFile(plan.file, plan.hint || plan.pathHint);
              }
            } catch (e) {
              continue; 
            }

            if (!targetPath) continue;

            await this._deleteFileForStaticMigration(targetPath);
            if (this.app.projectFilesManager) {
              this.app.projectFilesManager.removeNode(targetPath);
            }

            if (activeEditorWindow) {
              activeEditorWindow.close?.();
            }
            continue;
          }

          if (typeof plan.content !== 'string') {
            continue;
          }

          if (['create', 'createFile', 'replaceFile'].includes(plan.action)) {
            if (this.app.projectFilesManager) {
              this.app.projectFilesManager.addInMemoryFileNode(fullPath);
            }
          }

          if (this.app.inMemoryFileStore) {
            this.app.inMemoryFileStore.set(fullPath, plan.content);
          }

          if (externalStore && typeof externalStore.set === 'function') {
            await externalStore.set(fullPath, plan.content);
          } else {
            await this._saveFileToWritableTarget(fullPath, plan.content);
          }

          await this.app.updateSingleFileMetadata?.(fullPath, plan.content);
        } catch (error) {
          failed.push(plan);
        }
      }

      return failed;
    }

  

  async _getVfsForStaticMigration() {
    if (
      this.app &&
      typeof this.app.refreshVirtualFileSystemStores === 'function'
    ) {
      return await this.app.refreshVirtualFileSystemStores();
    }
    return this.app?.vfs || null;
  }

  async _readFileForStaticMigration(goldenPath, options = {}) {
    const path = String(goldenPath || '').trim();
    if (!path) {
      return null;
    }

    const openController = this.app?.editorControllers?.get?.(path);
    if (
      openController &&
      openController.isDirty &&
      typeof openController.getReconstructedCode === 'function'
    ) {
      return await openController.getReconstructedCode('module');
    }

    const vfs = await this._getVfsForStaticMigration();
    if (vfs && typeof vfs.readFile === 'function') {
      const content = await vfs.readFile(path, {
        nullOnMissing: true,
        noStaticFetch: options.noStaticFetch === true,
      });
      if (typeof content === 'string') {
        return content;
      }
    }

    const rootId = '/' + path.split('/').filter(Boolean)[0];
    const workspaceStore = this.app?.workspaceFileStores?.get?.(rootId);
    if (workspaceStore && typeof workspaceStore.get === 'function') {
      const value = await workspaceStore.get(path);
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value.content === 'string') {
        return value.content;
      }
    }

    const memoryStore = this.app?.inMemoryFileStore;
    if (
      memoryStore &&
      typeof memoryStore.has === 'function' &&
      memoryStore.has(path)
    ) {
      const value = memoryStore.get(path);
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value.content === 'string') {
        return value.content;
      }
    }

    return null;
  }

  async _deleteFileForStaticMigration(goldenPath) {
      const path = String(goldenPath || '').trim();
      if (!path) {
        return {
          ok: false,
          error: 'Missing path',
        };
      }

      // Explicitly clear memory store cache at the start of deletion
      if (this.app?.inMemoryFileStore && typeof this.app.inMemoryFileStore.delete === 'function') {
        this.app.inMemoryFileStore.delete(path);
      }
      if (this.app?.inMemoryFileMetadata) {
        delete this.app.inMemoryFileMetadata[path];
      }

      const vfs = await this._getVfsForStaticMigration();
      if (vfs && typeof vfs.deleteFile === 'function') {
        return await vfs.deleteFile(path);
      }

      const rootId = '/' + path.split('/').filter(Boolean)[0];
      const workspaceStore = this.app?.workspaceFileStores?.get?.(rootId);
      if (workspaceStore && typeof workspaceStore.delete === 'function') {
        await workspaceStore.delete(path);
        return {
          ok: true,
          backend: 'workspace',
          path,
        };
      }

      const memoryStore = this.app?.inMemoryFileStore;
      if (memoryStore && typeof memoryStore.delete === 'function') {
        memoryStore.delete(path);
        return {
          ok: true,
          backend: 'memory',
          path,
        };
      }

      throw new Error(
        'Cannot delete ' +
          path +
          '; no VFS, workspace, or memory store is available.'
      );
    }

  async _saveFileToWritableTarget(goldenPath, content) {
    if (!goldenPath) {
      throw new Error(
        '[WRITE ABORTED] No path provided to _saveFileToWritableTarget'
      );
    }

    if (typeof content !== 'string') {
      throw new Error(
        '[WRITE ABORTED] Content for ' + goldenPath + ' is not a string.'
      );
    }

    const beforeChars = content.length;
    const beforeLines = content.split('\n').length;
    const vfs = await this._getVfsForStaticMigration();

    if (vfs && typeof vfs.writeFile === 'function') {
      this.app?.logFileOp?.(2, 'Save through writable target', {
        path: goldenPath,
        size: beforeChars,
      });

      const writeResult = await vfs.writeFile(goldenPath, content);
      const readback = await vfs.readFile(goldenPath, {
        nullOnMissing: true,
        noStaticFetch: true,
      });

      if (readback !== content) {
        const readbackLength =
          typeof readback === 'string' ? readback.length : 0;
        const msg =
          '[WRITE MISMATCH] ' +
          goldenPath +
          ' writable-target readback differs; wrote ' +
          beforeChars +
          ' chars, read back ' +
          readbackLength +
          ' chars.';

        this.app?.uiManager?.setStatus?.(msg, true);
        this.app?.logFileOp?.(1, 'Writable Target Save MISMATCH', {
          path: goldenPath,
          wroteChars: beforeChars,
          readbackChars: readbackLength,
          wroteLines: beforeLines,
          readbackLines:
            typeof readback === 'string' ? readback.split('\n').length : 0,
        });

        return {
          success: false,
          ok: false,
          error: msg,
          source: 'writable-target',
        };
      }

      if (
        this.app?.inMemoryFileStore &&
        typeof this.app.inMemoryFileStore.set === 'function'
      ) {
        this.app.inMemoryFileStore.set(goldenPath, content);
      }

      this.app?.logFileOp?.(3, 'Writable Target Save Verified ✓', {
        path: goldenPath,
        backend: writeResult?.backend || 'vfs',
        chars: beforeChars,
        lines: beforeLines,
      });

      return {
        success: true,
        ok: true,
        verified: true,
        source: 'writable-target',
        backend: writeResult?.backend || 'vfs',
      };
    }

    const rootId = '/' + String(goldenPath).split('/').filter(Boolean)[0];
    const workspaceStore = this.app?.workspaceFileStores?.get?.(rootId);

    if (workspaceStore && typeof workspaceStore.set === 'function') {
      await workspaceStore.set(goldenPath, content);
      const readback = await workspaceStore.get?.(goldenPath);

      if (readback !== content) {
        throw new Error(
          '[WRITE ABORTED] Workspace store readback mismatch for ' + goldenPath
        );
      }

      if (
        this.app?.inMemoryFileStore &&
        typeof this.app.inMemoryFileStore.set === 'function'
      ) {
        this.app.inMemoryFileStore.set(goldenPath, content);
      }

      this.app?.logFileOp?.(3, 'Workspace Save Verified ✓', {
        path: goldenPath,
        chars: beforeChars,
        lines: beforeLines,
      });

      return {
        success: true,
        ok: true,
        verified: true,
        source: 'workspace',
        backend: 'workspace',
      };
    }

    if (
      this.app?.inMemoryFileStore &&
      typeof this.app.inMemoryFileStore.set === 'function'
    ) {
      this.app.inMemoryFileStore.set(goldenPath, content);
      const readback = this.app.inMemoryFileStore.get(goldenPath);

      if (readback !== content) {
        throw new Error(
          '[WRITE ABORTED] Memory store readback mismatch for ' + goldenPath
        );
      }

      this.app?.logFileOp?.(3, 'Memory Fork Save Verified ✓', {
        path: goldenPath,
        chars: beforeChars,
        lines: beforeLines,
      });

      return {
        success: true,
        ok: true,
        verified: true,
        source: 'memory-fork',
        backend: 'memory',
      };
    }

    const msg =
      '[WRITE ABORTED] No VFS, workspace store, or memory fork is available for ' +
      goldenPath +
      '.';

    this.app?.uiManager?.setStatus?.(msg, true);
    this.app?.logFileOp?.(1, 'Save blocked - no writable browser target', {
      path: goldenPath,
    });

    return {
      success: false,
      ok: false,
      error: msg,
      source: 'blocked-static-migration',
    };
  }

  async handleForkToLocalFolder(projectName) {
    if (!('showDirectoryPicker' in window)) {
      this.app.uiManager.setStatus(
        'Your browser does not support the File System Access API. Try Chrome or Edge.',
        true
      );
      return;
    }

    let parentHandle;
    try {
      parentHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop',
        id: 'vibes-fork-to-disk',
      });
    } catch (e) {
      return; // User canceled
    }

    this.app.uiManager.setStatus(`Fetching files for "${projectName}"...`);
    try {
      let filesData;
      const staticRes = await fetch(
        `/${projectName}/filelist.json?_=${Date.now()}`
      );
      if (!staticRes.ok) throw new Error('Could not get file list');
      filesData = await staticRes.json();

      const allFileInfos = [
        ...(filesData.js || []),
        ...(filesData.html || []),
        ...(filesData.css || []),
        ...(filesData.other || []),
      ];

      this.app.uiManager.setStatus(
        `Creating folder and saving ${allFileInfos.length} files...`
      );

      const StoreClass =
        globalThis.LocalDirectoryStore || window.LocalDirectoryStore;
      if (!StoreClass) throw new Error('LocalDirectoryStore is not loaded.');

      const subfolderHandle = await parentHandle.getDirectoryHandle(
        projectName,
        { create: true }
      );
      const store = await StoreClass.open(subfolderHandle, projectName);

      let written = 0;
      for (const info of allFileInfos) {
        if (info.path.startsWith('/library/')) continue;
        const res = await fetch(info.path);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          await store.set(info.path, new Uint8Array(buffer));
          written++;
        }
      }

      this.app.uiManager.setStatus(`Fork complete. Loading local folder...`);
      await this.app.projectLoader.loadProjectFromLocalDirectory(store);
    } catch (err) {
      console.error(err);
      this.app.uiManager.setStatus(`Fork failed: ${err.message}`, true);
    }
  }

  handleRearrangeWindows(options = {}) {
      const isSilent = options.silent === true;
      const isInstant = options.instant === true;
      
      if (!isSilent && this.app.uiManager?.setStatus) {
        this.app.uiManager.setStatus('Rearranging windows...');
      }

      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let currentZ = (typeof UITools !== 'undefined' && UITools._getState) ? UITools._getState().z + 10 : 1000;

      const toolbar = this.app.uiManager?.ui?.toolbarDialog;
      const workbench = this.app.uiManager?.ui?.workbenchDialog;
      const launcher = this.app.projectFilesManager?.floatingFileTreeState?.launcherDialog;

      const treeDialogs = [];
      if (this.app.projectFilesManager?.floatingFileTreeState?.trees) {
        for (const tree of this.app.projectFilesManager.floatingFileTreeState.trees.values()) {
          if (tree.dialog && tree.dialog.element && tree.dialog.element.isConnected) {
            treeDialogs.push(tree.dialog);
          }
        }
      }

      const allWidgets = typeof UITools !== 'undefined' ? UITools.allWidgets.filter(w => w.element && w.element.isConnected) : [];

      const isSpecial = (w) => {
        if (w === toolbar) return true;
        if (w === workbench) return true;
        if (w === launcher) return true;
        if (treeDialogs.includes(w)) return true;
        return false;
      };

      const miscDialogs = allWidgets.filter(w => !isSpecial(w) && w._mode === 'dialog' && !w._minimized && !w._maximized);

      const applyPos = (widget, x, y) => {
        const el = widget.element;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const w = rect.width || 400;
        const h = rect.height || 300;

        if (x + w > winW) x = Math.max(0, winW - w);
        if (y + h > winH) y = Math.max(0, winH - h);

        if (x < 0) x = 0;
        if (y < 45) y = 45;

        const isFadingIn = el.style.opacity === '0' || parseFloat(window.getComputedStyle(el).opacity) < 0.9;

        if (isInstant || isFadingIn) {
          const oldTransition = el.style.transition;
          el.style.transition = 'none';
          el.style.transform = 'none';
          el.style.left = x + 'px';
          el.style.top = y + 'px';
          el.style.zIndex = currentZ++;
          void el.offsetHeight; 
          el.style.transition = oldTransition;
        } else {
          el.style.transform = 'none';
          el.style.left = x + 'px';
          el.style.top = y + 'px';
          el.style.zIndex = currentZ++;
        }
        
        widget._saveState?.();
      };

      if (workbench && workbench.element && !workbench._minimized) {
        applyPos(workbench, 20, 60);
      }

      treeDialogs.sort((a, b) => {
        const rectA = a.element.getBoundingClientRect();
        const rectB = b.element.getBoundingClientRect();
        const areaA = rectA.width * rectA.height;
        const areaB = rectB.width * rectB.height;
        return areaB - areaA;
      });

      let treeStartX = Math.floor(winW * 0.55);
      let treeStartY = 80;

      treeDialogs.forEach((t, i) => {
        if (t._minimized) return;
        applyPos(t, treeStartX + (i * 35), treeStartY + (i * 35));
      });

      let miscStartX = Math.floor(winW * 0.25);
      let miscStartY = 100;

      miscDialogs.forEach((m, i) => {
        applyPos(m, miscStartX + (i * 45), miscStartY + (i * 45));
      });

      if (launcher && launcher.element && !launcher._minimized) {
        const rect = launcher.element.getBoundingClientRect();
        let h = rect.height || 400;
        applyPos(launcher, 20, winH - h - 20);
      }

      if (toolbar && toolbar.element) {
        const el = toolbar.element;
        if (isInstant) el.style.transition = 'none';
        el.style.transform = 'none';
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = winW + 'px';
        el.style.zIndex = currentZ++;
        if (isInstant) void el.offsetHeight;
        if (isInstant) el.style.transition = '';
        toolbar._saveState?.();
      }

      if (typeof UITools !== 'undefined' && UITools._getState) {
        UITools._getState().z = currentZ;
      }
    }


  static _doc_overview() {
      return "### AppActionHandler\n\nCoordinates user-initiated application actions such as saving all files, tab changes, closing tabs, packing/zipping projects, and managing clipboard interactions.";
    }

  static _doc_save_and_pack() {
      return `## Workspace Saves, Exports, and Standalone Packing\n\n- **Save All**: Scans all active \`editorControllers\`. For each dirty file, it builds the reconstructed code, commits it to the active VFS/Store, and recalculates the line-count metadata.\n- **Standalone Packing (Recursi-Ball)**: Instructs \`ProjectPacker\` to bundle the entire project-including HTML, topologically sorted scripts, inline stylesheets, Base64 assets, and project manifests-into a single self-contained HTML file.\n- **Zip Import/Export**: Bundles project files into structured \`.zip\` archives or unpacks them back into in-memory storage, ensuring complete application portability.`;
    }

  static _doc_window_management() {
      return `## Window and Tab Orchestration\n\n- **Tab Closures**: Intercepts tab close gestures. If a tab is dirty, it prompts the user with a customized Save/Don't Save/Cancel modal.\n- **Window Rearranging**: Iterates through all connected floating dialogs (toolbar, workbench, floating file trees, and editors) and neatly slides them into deterministic, cascading coordinates, keeping the infinite floating workspace tidy.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_actions()
      ].join('\n\n');
    }

  static getMarkdown() {
      return this._doc();
    }

  static _doc_actions() {
      return "### Key Workflows\n\n- **Save All**: Persists dirty editor contents back to the mounted directory or memory stores.\n- **Export & Pack**: Compiles project assets into a self-contained single-file bundle.";
    }

  async handleRunAppFromDisk(node) {
      if (!node || !node.id) return;
      this.app.uiManager.setStatus(`Launching ${node.name} from disk...`);

      if (typeof InWindowScriptInjector !== 'undefined') {
        const injector = new InWindowScriptInjector(this.app, { filesJsonPath: node.id, projectName: node.name });
        try {
          if (this.app.activeRunnerInjector) this.app.activeRunnerInjector.destroy();
          await injector.launch();
          this.app.activeRunnerInjector = injector;
          this.app.activeRunnerProject = node.name;
          if (this.app.emit) this.app.emit('runner:started', node.name);
          this.app.uiManager.setStatus('In-Window Runner launched successfully from manifest.');
        } catch (error) {
          this.app.uiManager.setStatus(`Live Preview Failed: ${error.message}`, true);
        }
      } else {
        this.app.uiManager.setStatus('InWindowScriptInjector failed to load.', true);
      }
    }

  async handleForkAndSaveToDisk(templateName) {
      if (!('showDirectoryPicker' in window)) {
        this.app.uiManager.setStatus('Your browser does not support the File System Access API. Try Chrome or Edge.', true);
        return;
      }

      const newName = await UITools.prompt({
        title: `Fork Template: ${templateName}`,
        message: 'Enter a name for your new project:',
        defaultValue: `${templateName}Fork`
      });

      if (!newName || !newName.trim()) {
        this.app.uiManager.setStatus('Fork cancelled: invalid project name.', true);
        return;
      }

      const cleanNewName = newName.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
      if (!cleanNewName) {
        this.app.uiManager.setStatus('Fork cancelled: project name contains invalid characters.', true);
        return;
      }

      let parentHandle = this.app.browserWebRootHandle;
      let usingExistingWorkspace = !!parentHandle;

      if (!usingExistingWorkspace) {
        const confirmChoose = await new Promise((resolve) => {
          UITools.makeDialog({
            title: 'Select Destination Folder',
            content: makeElement('div', { style: { color: '#ccd', lineHeight: '1.4' } }, [
              makeElement('p', {}, 'Vibes needs a parent folder on your computer to save your project.'),
              makeElement('p', { style: { fontSize: '11px', color: '#8aa', marginTop: '6px' } }, 'Please pick an empty or dedicated folder (e.g., "VibesProjects"). A subfolder with your new project name will be created inside it.')
            ]),
            buttons: [
              { label: 'Select Folder...', className: 'primary', onClick: () => { resolve(true); return true; } },
              { label: 'Cancel', onClick: () => { resolve(false); return true; } }
            ],
            onClose: () => resolve(false)
          });
        });

        if (!confirmChoose) return;

        try {
          parentHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            id: 'vibes-workspace-root'
          });
        } catch (e) {
          if (e.name === 'AbortError') return;
          this.app.uiManager.setStatus(`Could not select folder: ${e.message}`, true);
          return;
        }

        this.app.browserWebRootHandle = parentHandle;
        this.app.browserWebRootWorkspace = {
          handle: parentHandle,
          name: parentHandle.name || "web",
          openedAt: new Date().toISOString()
        };
      }

      this.app.uiManager.setStatus(`Sourcing files for "${templateName}"...`);

      try {
        const loader = this.app.projectLoader;
        const manifest = await loader._fetchStaticManifest(templateName);
        if (!manifest) {
          throw new Error(`Could not load files manifest for template "${templateName}".`);
        }

        const allPaths = new Set();
        [
          ...(manifest.html || []),
          ...(manifest.js || []),
          ...(manifest.css || []),
          ...(manifest.other || [])
        ].forEach(info => {
          if (info.path) allPaths.add(info.path);
        });

        const refactoredFiles = new Map();

        for (const path of allPaths) {
          const res = await fetch(path + '?_refactor=' + Date.now());
          if (!res.ok) {
            throw new Error(`Failed to fetch baseline template file: ${path}`);
          }
          
          let content;
          if (path.endsWith('.glb') || path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
            content = new Uint8Array(await res.arrayBuffer());
          } else {
            content = await res.text();
          }

          const newPath = this._smartRenamePath(path, templateName, cleanNewName);

          let finalContent = content;
          if (typeof content === 'string') {
            if (path.endsWith('.js')) {
              finalContent = this._smartRenameJSContent(content, templateName, cleanNewName);
            } else {
              finalContent = this._smartRenameTextContent(content, templateName, cleanNewName);
            }
          }

          refactoredFiles.set(newPath, finalContent);
        }

        this.app.uiManager.setStatus(`Writing files to disk...`);
        const subfolderHandle = await parentHandle.getDirectoryHandle(cleanNewName, { create: true });
        
        const StoreClass = globalThis.LocalDirectoryStore || window.LocalDirectoryStore;
        if (!StoreClass) {
          throw new Error('LocalDirectoryStore class is not loaded.');
        }

        const store = await StoreClass.open(subfolderHandle, cleanNewName);

        for (const [newPath, finalContent] of refactoredFiles.entries()) {
          await store.set(newPath, finalContent);
        }

        this.app.uiManager.setStatus(`Project "${cleanNewName}" saved successfully.`);

        const rootId = `/${cleanNewName}`;
        if (!this.app.workspaceFileStores) {
          this.app.workspaceFileStores = new Map();
        }
        this.app.workspaceFileStores.set(rootId, store);

        this.app.localDirectoryStore = store;
        this.app.localDirStore = store;
        this.app.projectName = cleanNewName;

        if (this.app.vfs) {
          this.app.vfs.setLocalStore(store);
          this.app.vfs.setMode('localdir');
        }

        if (this.app.patchManager) {
          const mode = this.app.patchManager.getPatchMode();
          this.app.uiManager.setUIMode(mode);
        }

        const url = new URL(window.location);
        url.searchParams.delete('project');
        url.searchParams.delete('static_project');
        url.searchParams.delete('in-memory-project');
        window.history.pushState({}, `Recursi - ${cleanNewName}`, url.toString());

        if (this.app.projectFilesManager) {
          if (typeof this.app.projectFilesManager.openFloatingTreeForStore === 'function') {
            await this.app.projectFilesManager.openFloatingTreeForStore(rootId, store);
          }
          
          if (typeof this.app.projectFilesManager._openFloatingExternalFileTreeLauncher === 'function') {
            this.app.projectFilesManager._openFloatingExternalFileTreeLauncher();
          }

          if (this.app.actionHandler && typeof this.app.actionHandler.handleRearrangeWindows === 'function') {
            this.app.actionHandler.handleRearrangeWindows({ instant: false });
          }
        }

        const mainPath = `/${cleanNewName}/src/${cleanNewName}.js`;
        if (this.app.projectFilesManager && refactoredFiles.has(mainPath)) {
          setTimeout(() => {
            this.app.projectFilesManager._openFloatingExternalEditorWindow(mainPath, store);
          }, 500);
        }

        if (typeof InWindowScriptInjector !== 'undefined') {
          const injector = new InWindowScriptInjector(this.app, { projectName: cleanNewName });
          await injector.launch();
        }

      } catch (err) {
        console.error('[Fork/Save to Disk failed]', err);
        this.app.uiManager.setStatus(`Fork failed: ${err.message}`, true);
      }
    }

  _smartRenameJSContent(content, oldName, newName) {
      const acorn = this.app.codeParser?.acorn || window.acorn;
      if (!acorn) {
        return content.split(oldName).join(newName);
      }

      let ast;
      try {
        ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
      } catch (e) {
        try {
          ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'script', ranges: true });
        } catch (e2) {
          return content.split(oldName).join(newName);
        }
      }

      const replacements = [];
      
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        
        if (node.type === 'Identifier' && node.name === oldName) {
          replacements.push({ start: node.start, end: node.end });
        }
        
        for (const key of Object.keys(node)) {
          const val = node[key];
          if (Array.isArray(val)) {
            val.forEach(walk);
          } else if (val && typeof val === 'object') {
            walk(val);
          }
        }
      };

      walk(ast);

      // Sort replacements in descending order to avoid offsetting ranges
      replacements.sort((a, b) => b.start - a.start);

      let result = content;
      const applied = new Set();
      for (const r of replacements) {
        const key = `${r.start}-${r.end}`;
        if (applied.has(key)) continue;
        applied.add(key);
        result = result.slice(0, r.start) + newName + result.slice(r.end);
      }

      return result;
    }

  _smartRenameTextContent(content, oldName, newName) {
      let result = content;
      result = result.split(oldName).join(newName);
      const oldLower = oldName.toLowerCase();
      const newLower = newName.toLowerCase();
      result = result.split(oldLower).join(newLower);
      return result;
    }

  _smartRenamePath(path, oldName, newName) {
      let result = path;
      result = result.replace(new RegExp(`^/${oldName}/`, 'i'), `/${newName}/`);
      const parts = result.split('/');
      const lastIdx = parts.length - 1;
      if (parts[lastIdx].toLowerCase().includes(oldName.toLowerCase())) {
        parts[lastIdx] = parts[lastIdx].replace(new RegExp(oldName, 'ig'), newName);
      }
      return parts.join('/');
    }

  handleConvertToLocalDirectory(currentProjectName) {
      if (!currentProjectName) {
        this.app.uiManager.setStatus('No active project found to convert.', true);
        return;
      }

      const content = makeElement('div', { style: { color: '#ccd', lineHeight: '1.5', fontSize: '13px' } }, [
        makeElement('p', { style: { marginBottom: '12px' } }, 'This process will transition your current temporary browser-only session into a persistent directory on your local computer using the W3C File System Access API.'),
        makeElement('ul', { style: { paddingLeft: '20px', marginBottom: '16px' } }, [
          makeElement('li', { style: { marginBottom: '6px' } }, 'All your browser-local edits (patches) will be merged with the base files.'),
          makeElement('li', { style: { marginBottom: '6px' } }, 'You can optionally rename the project and the main class/references will be refactored.'),
          makeElement('li', { style: { marginBottom: '6px' } }, 'Once written and byte-verified on your disk, the temporary browser database will be cleared.'),
          makeElement('li', { style: { marginBottom: '6px' } }, 'The workspace will reload in direct disk-editing mode.')
        ]),
        makeElement('p', { style: { color: '#ffb300', fontWeight: 'bold' } }, '⚠️ You will be prompted to select a folder on your computer.')
      ]);

      UITools.makeDialog({
        title: '📁 Convert Workspace to Local Folder',
        content: content,
        width: '480px',
        buttons: [
          {
            label: 'Continue',
            className: 'primary',
            onClick: async (e, dialog) => {
              dialog.close();
              await this._executeConvertToLocalDirectory(currentProjectName);
            }
          },
          {
            label: 'Cancel'
          }
        ]
      });
    }

  async _executeConvertToLocalDirectory(currentProjectName) {
      const newName = await UITools.prompt({
        title: 'Rename Project (Optional)',
        message: 'Enter a name for your project folder and main class:',
        defaultValue: currentProjectName
      });

      if (newName === null) {
        this.app.uiManager.setStatus('Conversion cancelled.');
        return;
      }

      const cleanNewName = newName.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
      if (!cleanNewName) {
        this.app.uiManager.setStatus('Conversion cancelled: invalid project name.', true);
        return;
      }

      if (!('showDirectoryPicker' in window)) {
        this.app.uiManager.setStatus('Your browser does not support the File System Access API. Try Chrome or Edge.', true);
        return;
      }

      let parentHandle;
      try {
        parentHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'desktop',
          id: 'vibes-workspace-root'
        });
      } catch (e) {
        if (e.name === 'AbortError') {
          this.app.uiManager.setStatus('Conversion cancelled.');
          return;
        }
        this.app.uiManager.setStatus(`Could not select folder: ${e.message}`, true);
        return;
      }

      this.app.uiManager.setStatus(`Creating folder "${cleanNewName}"...`);
      this.app.uiManager.setLoadingState(true);

      try {
        const subfolderHandle = await parentHandle.getDirectoryHandle(cleanNewName, { create: true });
        
        const StoreClass = globalThis.LocalDirectoryStore || window.LocalDirectoryStore;
        if (!StoreClass) {
          throw new Error('LocalDirectoryStore class is not loaded.');
        }
        const store = await StoreClass.open(subfolderHandle, cleanNewName);

        this.app.uiManager.setStatus('Retrieving and reconstructing project files...');
        const allPaths = await this.app.vfs.listFiles({ includeStatic: true });
        let written = 0;

        for (const path of allPaths) {
          if (path.startsWith('/library/')) continue;

          let content;
          if (path.endsWith('.glb') || path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.ico') || path.endsWith('.woff') || path.endsWith('.woff2') || path.endsWith('.ttf')) {
            const res = await fetch(path + '?_convert=' + Date.now());
            if (res.ok) {
              content = new Uint8Array(await res.arrayBuffer());
            } else {
              throw new Error(`Failed to fetch binary asset: ${path}`);
            }
          } else {
            content = await this.app.vfs.readFile(path);
            if (content === null || content === undefined) {
              throw new Error(`Failed to read file from VFS: ${path}`);
            }
          }

          const newPath = this._smartRenamePath(path, currentProjectName, cleanNewName);
          let finalContent = content;
          if (typeof content === 'string' && cleanNewName !== currentProjectName) {
            if (path.endsWith('.js')) {
              finalContent = this._smartRenameJSContent(content, currentProjectName, cleanNewName);
            } else {
              finalContent = this._smartRenameTextContent(content, currentProjectName, cleanNewName);
            }
          }

          this.app.uiManager.setStatus(`Writing and verifying ${newPath.split('/').pop()}...`);
          await store.set(newPath, finalContent);
          written++;
        }

        this.app.uiManager.setStatus('Purging browser patch database...');
        if (this.app.patchStore) {
          await this.app.patchStore.clear();
        }

        this.app.uiManager.setStatus('Loading disk workspace...');
        const rootId = `/${cleanNewName}`;
        if (!this.app.workspaceFileStores) {
          this.app.workspaceFileStores = new Map();
        }
        this.app.workspaceFileStores.set(rootId, store);

        this.app.localDirectoryStore = store;
        this.app.localDirStore = store;
        this.app.projectName = cleanNewName;

        if (this.app.vfs) {
          this.app.vfs.setLocalStore(store);
          this.app.vfs.setMode('localdir');
        }

        this.app.uiManager.setUIMode('localdir');

        if (this.app.inMemoryFileStore) {
          this.app.inMemoryFileStore.clear();
        }

        await this.app.projectLoader.bootFromLocalDirectory(store);
        this.app.uiManager.setStatus(`Successfully converted to local directory: "${cleanNewName}"!`, false, 8000);

      } catch (err) {
        console.error('[Conversion failed]', err);
        this.app.uiManager.setStatus(`Conversion failed: ${err.message}`, true);
      } finally {
        this.app.uiManager.setLoadingState(false);
      }
    }

  handleViewClassLogs() {
      const text = globalThis.__classRegistrationLogger?.getFormattedText() || 'No logs found.';
      
      const textarea = makeElement('textarea', {
        style: {
          width: '100%',
          height: '320px',
          backgroundColor: '#090d16',
          color: '#38bdf8',
          fontFamily: 'monospace',
          fontSize: '11px',
          padding: '12px',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          boxSizing: 'border-box',
          resize: 'none',
          outline: 'none'
        },
        readOnly: true
      });
      
      // Explicitly set the text content directly on the textarea property
      textarea.value = text;

      const content = makeElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', padding: '5px' } }, [
        textarea
      ]);

      const dialog = UITools.makeDialog({
        title: '📋 Global Class Registration Logs',
        content: content,
        contentElement: content,
        width: '600px',
        buttons: [
          {
            label: 'Clear Logs',
            className: 'danger',
            onClick: () => {
              globalThis.__classRegistrationLogger?.clear();
              textarea.value = globalThis.__classRegistrationLogger?.getFormattedText() || 'No logs found.';
              this.app.uiManager.setStatus('Class registration logs cleared.');
              return false;
            }
          },
          { label: 'Close' }
        ]
      });
    }
}