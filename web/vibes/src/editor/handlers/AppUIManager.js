class AppUIManager {
  constructor(app) {
      this.app = app;
      this.ui = {};
      this.statusTimer = null;
      this.uiMode = 'server'; // 'server' | 'indexeddb' | 'localdir'
      this.appStartTime = Date.now();
    }

  createLayout() {
      if (this.ui && this.ui.toolbarDialog) {
        if (this.app.mainContentContainer) {
          this.app.mainContentContainer.innerHTML = '';
        }
        const isRecursive = typeof window !== 'undefined' && window.projectApp && window.projectApp !== this.app;
        if (isRecursive && this.app.rootContainer) {
          if (this.app.mainContentContainer && !this.app.mainContentContainer.parentElement) {
            this.app.rootContainer.appendChild(this.app.mainContentContainer);
          }
          
          const restoreDialog = (dialog) => {
            if (!dialog || !dialog.element) return;
            const el = dialog.element;
            let rootEl = el;
            while (rootEl.parentElement && rootEl.parentElement !== document.body && rootEl.parentElement !== this.app.rootContainer) {
              rootEl = rootEl.parentElement;
            }
            if (rootEl && !rootEl.isConnected) {
              this.app.rootContainer.appendChild(rootEl);
            }
          };

          if (this.ui.toolbarDialog) restoreDialog(this.ui.toolbarDialog);
          if (this.ui.workbenchDialog) restoreDialog(this.ui.workbenchDialog);
        }
        return;
      }
      this.app.rootContainer.innerHTML = '';

      this.ui.globalControlsContainer = makeElement('div', {
        className: 'global-controls',
        style: {
          background: 'transparent',
          border: 'none',
          padding: '0',
          display: 'flex',
          gap: '8px',
          minHeight: 'auto',
          flexWrap: 'wrap',
          width: '100vw',
        },
      });

      this.app.mainContentContainer = makeElement('div', {
        className: 'main-content-container',
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      });

      if (typeof UITools !== 'undefined') {
        const isRecursive = window.projectApp && window.projectApp !== this.app;
        const dialogEnv = isRecursive ? this.app.env : null;

        this.ui.toolbarDialog = UITools.makeDialog({
          env: dialogEnv,
          title: 'Vibes Toolbar',
          content: this.ui.globalControlsContainer,
          position: [20, 20],
          width: 'auto',
          height: 'auto',
          allowMinimize: false,
          allowMaximize: false,
          allowTransparency: false,
          transparent: false,
          noPadding: true,
          stateId: 'vibes-toolbar',
        });

        this.ui.workbenchDialog = UITools.makeDialog({
          env: dialogEnv,
          title: 'Vibes Dashboard',
          content: this.app.mainContentContainer,
          position: [400, 100],
          width: '800px',
          height: '600px',
          noPadding: true,
          stateId: 'vibes-workbench',
        });
      }
    }

  setStatus(message, typeOrIsError = 'info', duration = null) {
      if (!this.ui.statusElement) return;

      let type = 'info';
      let isError = false;

      if (typeOrIsError === true) {
        type = 'error';
        isError = true;
      } else if (typeof typeOrIsError === 'string') {
        type = typeOrIsError;
        if (type === 'error') isError = true;
      }

      const isStartup = Date.now() - this.appStartTime < 5000;
      if (isStartup && type === 'info') {
        if (message.includes('Visibility set') || message.includes('Ready.'))
          return;
      }

      clearTimeout(this.statusTimer);

      // Logo container styling reset removed completely!

      this.ui.statusElement.textContent = message;
      this.ui.statusElement.classList.add('visible');

      if (isError) {
        this.ui.statusElement.style.borderTop = 'none';
        this.ui.statusElement.style.backgroundColor = 'rgba(80, 20, 20, 0.95)';
        this.ui.statusElement.style.color = '#ffcfc0';
      } else if (type === 'important') {
        this.ui.statusElement.style.backgroundColor = 'rgba(40, 60, 100, 0.95)';
        this.ui.statusElement.style.color = '#fff';
      } else {
        this.ui.statusElement.style.backgroundColor = 'rgba(40, 40, 45, 0.95)';
        this.ui.statusElement.style.color = '#e0e0e0';
      }

      const displayDuration =
        typeof duration === 'number' && duration > 0 ? duration : 4000;

      this.statusTimer = setTimeout(() => {
        this.ui.statusElement.classList.remove('visible');
      }, displayDuration);
    }

  setLoadingState(isLoading) {
      this.app.isLoading = isLoading;
      if (this.ui.tabAreaContainer) {
        this.ui.tabAreaContainer.style.opacity = isLoading ? '0.7' : '1';
        this.ui.tabAreaContainer.style.pointerEvents = isLoading
          ? 'none'
          : 'auto';
      }
      this.updateGlobalButtonStates();
    }

  updateGlobalButtonStates() {
      if (!this.ui.saveButton || !this.ui.pasteButton) return;

      const hasDirtyFiles = Array.from(this.app.editorControllers.values()).some(
        (c) =>
          c.isLoaded && c.isDirty && typeof c.getReconstructedCode === 'function'
      );
      const isPatchingMode = this.uiMode === 'indexeddb' || this.uiMode === 'localdir';

      if (isPatchingMode) {
        this.ui.syncBtn.style.display = hasDirtyFiles ? 'flex' : 'none';
        this.ui.saveButton.style.display = 'none';
      } else {
        this.ui.saveButton.style.display = hasDirtyFiles ? 'flex' : 'none';
        this.ui.syncBtn.style.display = 'none';
      }

      this.ui.saveButton.disabled = !hasDirtyFiles;
      this.ui.syncBtn.disabled = !hasDirtyFiles;

      if (this.ui.pasteButton && this.ui.pasteButton.setDisabled) {
        this.ui.pasteButton.setDisabled(this.app.isLoading);
      } else if (this.ui.pasteButton instanceof HTMLElement) {
        this.ui.pasteButton.disabled = this.app.isLoading;
      }

      if (this.ui.hotPatchBtn) {
        const isActive = this.app.settings?.preferHotPatching !== false;
        this.ui.hotPatchBtn.style.opacity = isActive ? '1' : '0.4';
        this.ui.hotPatchBtn.style.filter = isActive
          ? 'drop-shadow(0 0 4px rgba(255,100,0,0.8))'
          : 'grayscale(100%)';
      }
    }

  

  

  pulsePasteButton(durationSeconds = 1) {
      if (!this.ui.pasteButton) return;
      const pasteButton = this.ui.pasteButton.element || this.ui.pasteButton;
      pasteButton.classList.add('pulse-animation');

      setTimeout(() => {
        pasteButton.classList.remove('pulse-animation');
      }, durationSeconds * 1000);
    }

  

  

  _setupResizeListener() {
      window.addEventListener('resize', () => {
        if (this.ui.toolbarDialog && this.ui.toolbarDialog.element) {
          const el = this.ui.toolbarDialog.element;
          el.style.left = '0px';
          el.style.top = '0px';
          el.style.width = '100vw';
        }
        // updateLogoPositioning trigger removed!
      });
    }

  showInOutputTab(text) {
      if (this.app.tabOrchestrator) {
        this.app.tabOrchestrator.ensureOutputTabExists(); 
      }
      if (this.app.outputTab) {
        this.app.outputTab.setContent(text);
      }
      if (this.app.tabManager) {
        this.app.tabManager.setActiveTab('output-tab');
      }
    }

  _addDragDropListeners() {
      const container = this.ui.globalControlsContainer;
      if (!container) return;

      let dragCounter = 0;

      container.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        container.style.boxShadow = 'inset 0 0 10px 2px var(--accent-blue)';
      });

      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      container.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
          container.style.boxShadow = '';
        }
      });

      container.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        container.style.boxShadow = '';
        this.app.actionHandler.handleFileDrop(e);
      });
    }

  setUIMode(mode) {
      let targetMode = mode;
      if (targetMode === 'memory') {
        targetMode = 'indexeddb';
      }
      if (
        targetMode !== 'server' &&
        targetMode !== 'localdir' &&
        targetMode !== 'indexeddb'
      )
        return;
      this.uiMode = targetMode;

      const isPatchingMode =
        targetMode === 'localdir' || targetMode === 'indexeddb';

      console.log(
        `[UI Mode] Switched to ${targetMode.toUpperCase()} mode.`,
        'color: #00bcd4; font-weight: bold;'
      );

      if (this.ui.memoryModeIndicator) {
        if (targetMode === 'indexeddb') {
          this.ui.memoryModeIndicator.textContent = '🩹 Patching (Browser)';
          this.ui.memoryModeIndicator.style.display = 'inline-block';
        } else {
          this.ui.memoryModeIndicator.style.display = 'none';
        }
      }

      if (this.ui.localFolderIndicator) {
        if (targetMode === 'localdir') {
          this.ui.localFolderIndicator.textContent = '📁 Patching (Local)';
          this.ui.localFolderIndicator.style.display = 'inline-block';
        } else {
          this.ui.localFolderIndicator.style.display = 'none';
        }
      }

      if (this.ui.syncBtn)
        this.ui.syncBtn.style.display = isPatchingMode ? 'flex' : 'none';
      if (this.ui.saveButton)
        this.ui.saveButton.style.display = isPatchingMode ? 'none' : 'flex';

      document.querySelectorAll('.fp-compact-btn[title="Convert to Local Directory"]').forEach(btn => {
        btn.style.display = targetMode === 'indexeddb' ? 'inline-flex' : 'none';
      });

      if (isPatchingMode) {
        this.setStatus(`Editing in ${targetMode} mode.`, false, null);
      } else {
        this.setStatus('Ready.', false, 4000);
      }

      this.updateGlobalButtonStates();
    }

  

  triggerRemotePasteEffect() {
      const btnComponent = this.ui.pasteButton;
      const btn = btnComponent.element ? btnComponent.mainBtn : btnComponent;

      if (!btn) return;

      if (!document.getElementById('remote-paste-styles')) {
        const css = `
        @keyframes remote-data-stream {
            0% { background-position: 0% 50%; border-color: #00ffaa; box-shadow: 0 0 5px #00ffaa; }
            50% { background-position: 100% 50%; border-color: #ccff00; box-shadow: 0 0 15px #00ffaa, inset 0 0 10px #00ffaa; }
            100% { background-position: 0% 50%; border-color: #00ffaa; box-shadow: 0 0 5px #00ffaa; }
        }
        @keyframes drop-arrow {
            0% { top: -25px; opacity: 0; }
            30% { opacity: 1; }
            100% { top: 10px; opacity: 0; }
        }
        .remote-paste-active {
            background: linear-gradient(90deg, #1e3a2f, #2e7d32, #00bfa5, #2e7d32, #1e3a2f) !important;
            background-size: 300% 300% !important;
            animation: remote-data-stream 0.4s linear infinite !important;
            color: #e0f2f1 !important;
            text-shadow: 0 0 2px black !important;
            transform: scale(1.05);
            z-index: 10;
            position: relative; 
        }
        .remote-paste-active::after {
            content: '⚡';
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            color: #00ffaa;
            font-size: 18px;
            animation: drop-arrow 0.4s ease-in infinite;
            text-shadow: 0 0 5px #00ffaa;
            pointer-events: none;
        }
      `;
        applyCss(css, 'remote-paste-styles');
      }

      if (this.remotePasteTimer) clearTimeout(this.remotePasteTimer);

      if (!btn.dataset.originalHtml) {
        btn.dataset.originalHtml = btn.innerHTML;
      }

      btn.classList.add('remote-paste-active');
      btn.innerHTML = '⚡ Receiving...';

      this.remotePasteTimer = setTimeout(() => {
        btn.classList.remove('remote-paste-active');
        if (btn.dataset.originalHtml) {
          btn.innerHTML = btn.dataset.originalHtml;
          delete btn.dataset.originalHtml;
        }
      }, 1500);
    }

  renderGlobalControls() {
      if (this._globalControlsRendered) {
        console.warn(
          '[AppUIManager] renderGlobalControls called twice - ignoring.'
        );
        return;
      }
      this._globalControlsRendered = true;

      const container = this.ui.globalControlsContainer;
      container.innerHTML = '';

      this._injectToolbarStyles();

      this.ui.leftControlGroup = makeElement('div', {
        className: 'control-group left',
      });
      const rightGroup = makeElement('div', { className: 'control-group right' });

      this.ui.connectionDot = makeElement('div', {
        className: 'connection-dot tb-dot',
        title: 'Clipboard Link: Disconnected',
        role: 'status',
        'aria-label': 'Clipboard link: disconnected',
        'aria-live': 'polite',
      });

      const addTooltip = (el, text, color = [0, 200, 255]) => {
        if (typeof GlowingTooltip !== 'undefined') {
          el.addEventListener('mouseover', () =>
            GlowingTooltip.show(el, text, { color })
          );
          el.addEventListener('mouseout', () => GlowingTooltip.hide());
        }
      };

      const patchesBtn = makeElement(
        'button',
        {
          className: 'tb-btn tb-icon-btn',
          id: 'patchDashboardBtn',
          onclick: async () => {
            if (typeof PatchDashboard === 'undefined') {
              try {
                await this.app._loadClassicScriptOnce(
                  '/vibes/src/editor/ui/dialogs/PatchDashboard.js'
                );
              } catch (e) {
                console.warn('Failed to lazy load PatchDashboard', e);
              }
            }
            if (typeof PatchDashboard !== 'undefined') {
              new PatchDashboard(this.app).show();
            }
          },
        },
        '🩹'
      );
      addTooltip(patchesBtn, 'View Hot Patches Dashboard', [200, 100, 255]);

      const supportsBrowserWorkspace = 'showDirectoryPicker' in window;
      const openFolderBtn = makeElement(
        'button',
        {
          className: 'tb-btn',
          id: 'openBrowserWorkspaceBtn',
          'aria-label': 'Open local directory',
          style: { display: supportsBrowserWorkspace ? '' : 'none' },
          onclick: async () => {
            const pfm = this.app && this.app.projectFilesManager;
            if (!pfm || typeof pfm.openBrowserWebRootFromPicker !== 'function') {
              this.setStatus('Browser workspace opener is not available.', true);
              return;
            }
            this.setStatus('Choose a folder to open…');
            try {
              const result = await pfm.openBrowserWebRootFromPicker({
                chooseApp: true,
              });
              if (result && result.ok === false) {
                if (!result.cancelled) {
                  this.setStatus(
                    'Could not open folder: ' + (result.reason || 'unknown'),
                    true
                  );
                }
                return;
              }
              this.setStatus('Folder opened.');
              if (this.app.tabManager) {
                const pbTab = Array.from(this.app.tabManager.tabs.values()).find(
                  (t) => t.id === 'project-browser-tab'
                );
                if (pbTab) this.app.tabOrchestrator.removeTab(pbTab.id);
              }
            } catch (error) {
              this.setStatus(
                'Open failed: ' +
                  (error && error.message ? error.message : String(error)),
                true
              );
            }
          },
        },
        '📂 Open Folder'
      );
      addTooltip(
        openFolderBtn,
        'Open a local folder (browser File System Access)',
        [0, 220, 180]
      );
      this.ui.openFolderBtn = openFolderBtn;

      const sep1 = makeElement('div', { className: 'tb-sep' });

      const pasteMainBtn = makeElement(
        'button',
        {
          className: 'tb-btn',
          style: {
            borderTopRightRadius: '0',
            borderBottomRightRadius: '0',
            borderRight: 'none',
          },
          onclick: () => this.app.actionHandler.handlePasteFromLlm(),
        },
        '📥 Paste'
      );

      const pasteDropBtn = makeElement(
        'button',
        {
          className: 'tb-btn',
          style: {
            borderTopLeftRadius: '0',
            borderBottomLeftRadius: '0',
            padding: '0 6px',
            minWidth: '0',
          },
          onclick: (e) => {
            e.stopPropagation();
            const items = [
              {
                label: '📋 View Sanity Report',
                onClick: () => this.app.actionHandler.handleReportButtonClick(),
              },
              {
                label: '🔄 Force Sync All',
                onClick: () => {
                  this.app.actionHandler.handleSaveAllFiles();
                },
              },
              {
                label: '⚠️ Clear System Errors',
                onClick: () => {
                  if (this.app.promptInjector)
                    this.app.promptInjector.clearErrors();
                  this.setStatus('System error context cleared.');
                },
              },
            ];
            if (typeof DropdownMenu !== 'undefined') {
              new DropdownMenu({ targetElement: pasteDropBtn, items });
            }
          },
        },
        '▼'
      );

      const pasteGroup = makeElement(
        'div',
        { style: { display: 'flex' } },
        pasteMainBtn,
        pasteDropBtn
      );
      this.ui.pasteButton = pasteMainBtn;
      this.ui.pasteGroup = pasteGroup;
      addTooltip(
        pasteMainBtn,
        'Paste code/instructions from LLM',
        [189, 138, 194]
      );

      const hotPatchBtn = makeElement(
        'button',
        {
          id: 'toolbarHotPatchBtn',
          className: 'tb-btn tb-icon-btn',
          title: 'Hot Patch Mode',
          onclick: () => {
            if (this.app.settings) {
              this.app.settings.preferHotPatching = !(
                this.app.settings.preferHotPatching !== false
              );
              if (typeof this.app._saveSettings === 'function')
                this.app._saveSettings();
              this.updateGlobalButtonStates();
              this.setStatus(
                `🔥 Hot Patching ${
                  this.app.settings.preferHotPatching !== false ? 'ON' : 'OFF'
                }`,
                false,
                3000
              );
            }
          },
        },
        '🔥'
      );
      this.ui.hotPatchBtn = hotPatchBtn;
      addTooltip(hotPatchBtn, 'Toggle Hot Patch Mode', [255, 100, 0]);

      const saveAllBtn = makeElement(
        'button',
        {
          className: 'tb-btn',
          id: 'saveAllBtn',
          'aria-label': 'Save all files',
          style: { display: 'none' },
        },
        '💾 Save All'
      );
      addTooltip(saveAllBtn, 'Save all changes to server', [40, 167, 69]);

      const syncBtn = makeElement(
        'button',
        {
          className: 'tb-btn',
          id: 'syncBtn',
          'aria-label': 'Sync changes',
          style: {
            display: 'none',
            backgroundColor: '#1a4d2a',
            borderColor: '#1f7c35',
          },
        },
        '🔄 Sync'
      );
      addTooltip(syncBtn, 'Sync changes to memory & preview', [40, 167, 69]);

      const sep2 = makeElement('div', { className: 'tb-sep' });

      const timelineBtn = makeElement(
        'button',
        {
          className: 'tb-btn tb-icon-btn',
          id: 'timelineBtn',
          'aria-label': 'Undo timeline',
          onclick: async () => {
            const DialogClass =
              globalThis.UndoTimelineDialog || window.UndoTimelineDialog;
            if (DialogClass) new DialogClass(this.app);
            else this.setStatus('UndoTimelineDialog is not loaded.', true);
          },
        },
        '⏳'
      );
      addTooltip(timelineBtn, 'Undo History Timeline', [255, 105, 180]);
      this.ui.timelineBtn = timelineBtn;

      const rearrangeBtn = makeElement(
        'button',
        {
          className: 'tb-btn tb-icon-btn',
          title: 'Rearrange Windows',
          onclick: () => {
            if (
              this.app.actionHandler &&
              typeof this.app.actionHandler.handleRearrangeWindows === 'function'
            ) {
              this.app.actionHandler.handleRearrangeWindows();
            }
          },
        },
        '🗔'
      );
      addTooltip(rearrangeBtn, 'Rearrange Windows', [255, 200, 0]);

      const settingsBtn = makeElement(
        'button',
        {
          className: 'tb-btn tb-icon-btn',
          id: 'settingsBtn',
          'aria-label': 'Open menu and settings',
          'aria-haspopup': 'true',
          'aria-expanded': 'false',
          onclick: (e) => {
            e.stopPropagation();
            settingsBtn.setAttribute('aria-expanded', 'false');
            const items = this.app.actionRegistry.getMenuItems();
            if (typeof DropdownMenu !== 'undefined') {
              new DropdownMenu({
                targetElement: e.currentTarget,
                items: items,
                onClose: () => settingsBtn.setAttribute('aria-expanded', 'false'),
              });
            }
          },
        },
        '⚙️'
      );
      addTooltip(settingsBtn, 'Menu & Settings', [150, 150, 150]);

      this.ui.statusContainer = makeElement('div', {
        className: 'status-container',
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true',
      });

      this.ui.statusElement = makeElement('div', {
        className: 'status-message',
        'aria-hidden': 'true',
      });
      this.ui.statusElement.textContent = 'Ready';

      this.ui.memoryModeIndicator = makeElement('div', {
        className: 'memory-mode-indicator',
        textContent: '🩹 Patching (Browser)',
        style: { display: 'none' },
      });

      this.ui.localFolderIndicator = makeElement('div', {
        className: 'memory-mode-indicator',
        textContent: '📁 Patching (Local)',
        style: { display: 'none' },
      });

      this.ui.statusContainer.append(
        this.ui.statusElement,
        this.ui.memoryModeIndicator,
        this.ui.localFolderIndicator
      );

      this.ui.leftControlGroup.append(
        this.ui.connectionDot,
        openFolderBtn,
        sep1,
        this.ui.pasteGroup,
        this.ui.hotPatchBtn
      );

      rightGroup.append(
        sep2,
        timelineBtn,
        patchesBtn,
        rearrangeBtn,
        settingsBtn
      );

      container.append(
        this.ui.leftControlGroup,
        this.ui.statusContainer,
        rightGroup
      );

      this.ui.saveButton = saveAllBtn;
      this.ui.syncBtn = syncBtn;
      this.ui.patchesBtn = patchesBtn;

      if (this._addDragDropListeners) this._addDragDropListeners();
      this.setUIMode(this.uiMode);

      if (this._setupResizeListener) this._setupResizeListener();
      setTimeout(() => {
        if (this._setupToolbarDragging) this._setupToolbarDragging();
      }, 100);
    }

  setTeleporterStatus(isConnected) {
      if (!this.ui.connectionDot) {
        let existing =
          this.ui.globalControlsContainer.querySelector('.connection-dot');
        if (!existing) {
          this.ui.connectionDot = makeElement('div', {
            className: 'connection-dot',
            role: 'status',
            'aria-live': 'polite',
            title: 'Clipboard Link: Disconnected',
            style: {
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#444',
              marginRight: '12px',
              border: '1px solid #222',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 0 2px #000',
            },
          });
          if (this.ui.leftControlGroup) {
            this.ui.leftControlGroup.prepend(this.ui.connectionDot);
          }
        } else {
          this.ui.connectionDot = existing;
        }
      }

      if (isConnected) {
        this.ui.connectionDot.classList.add('active');
        this.ui.connectionDot.title = 'Clipboard Link: ACTIVE (Receiving)';
        this.ui.connectionDot.setAttribute(
          'aria-label',
          'Clipboard link: active'
        );
        if (this.ui.memoryModeIndicator) {
          this.ui.memoryModeIndicator.style.borderColor = '#00ff00';
          setTimeout(
            () => (this.ui.memoryModeIndicator.style.borderColor = ''),
            500
          );
        }
      } else {
        this.ui.connectionDot.classList.remove('active');
        this.ui.connectionDot.title = 'Clipboard Link: Disconnected';
        this.ui.connectionDot.setAttribute(
          'aria-label',
          'Clipboard link: disconnected'
        );
      }
    }

  

  _injectToolbarStyles() {
      const id = 'vibes-toolbar-styles';
      
      const existingStyle = document.getElementById(id);
      if (existingStyle) {
        existingStyle.remove();
      }

      applyCss(
        `
        .global-controls {
          display: grid !important;
          grid-template-columns: 1fr auto 1fr !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 6px 12px !important;
          min-height: 44px !important;
          background: rgba(18, 20, 28, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5) !important;
          width: 100vw !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }

        .control-group.left {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 4px;
          min-width: 0;
        }
        .control-group.right {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 4px;
          min-width: 0;
        }

        .status-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 0;
          position: relative;
          overflow: visible;
        }

        .tb-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #333; border: 1px solid #222; margin-right: 4px; flex-shrink: 0; transition: all 0.3s ease; }
        .tb-dot.active { background-color: #00e676 !important; box-shadow: 0 0 7px #00e676; border-color: #00bfa5 !important; }
        
        .tb-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 30px;
          padding: 0 10px;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.055);
          color: rgba(220,230,255,0.88);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.08s;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          flex-shrink: 0;
        }
        .tb-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.22); color: #fff; }
        .tb-btn:active { transform: scale(0.96); }
        .tb-btn:focus-visible { outline: 2px solid rgba(100,180,255,0.7); outline-offset: 2px; }
        
        .tb-icon-btn { padding: 0 9px; font-size: 14px; min-width: 32px; justify-content: center; }
        .tb-sep { width: 1px; height: 20px; background: rgba(255,255,255,0.1); margin: 0 4px; flex-shrink: 0; border-radius: 1px; }

        .uw-dialog:has(.global-controls) { border-radius: 0 !important; background: transparent !important; border: none !important; box-shadow: none !important; }
        .uw-dialog:has(.global-controls) .uw-header { display: none !important; }
        .uw-dialog:has(.global-controls) .uw-content { padding: 0 !important; background: transparent !important; overflow: visible !important; }
        
        .global-controls button:focus-visible { outline: 2px solid rgba(100,180,255,0.7); outline-offset: 2px; position: relative; z-index: 1; }
      `,
        id
      );
    }

  _setupToolbarDragging() {
      if (this._toolbarDraggingSetup) return;
      this._toolbarDraggingSetup = true;

      const dialog = this.ui.toolbarDialog;
      const container = this.ui.globalControlsContainer;
      if (!dialog || !container) return;

      const el = dialog.element;
      if (!el) return;

      if (dialog.header) dialog.header.style.display = 'none';
      if (dialog._sizers && dialog._sizers.length) {
        dialog._sizers.forEach((s) => s.remove());
        dialog._sizers = [];
      }

      el.style.width = '100vw';
      el.style.minWidth = '0';
      el.style.minHeight = '0';
      el.style.height = 'auto';
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.transform = 'none';
      el.style.borderRadius = '0';

      if (dialog.contentElement) {
        dialog.contentElement.style.padding = '0';
        dialog.contentElement.style.overflow = 'visible';
      }

      container.style.cursor = 'default';

      window.addEventListener('resize', () => {
        el.style.left = '0px';
        el.style.top = '0px';
      });
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_features()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### AppUIManager\n\nManages the top-level IDE workspace layout and controls. Renders the main toolbar and handles status messages, loading overlays, and window arrangements.";
    }

  static _doc_features() {
      return "### Features\n\n- **UI Modes**: Transitions layouts smoothly between server mode and static/memory mode.\n- **Window Management**: Integrates with draggable dialog boxes, allowing clean cascade and workspace resets.";
    }

  _runLayoutDiagnostic() {
      const isRecursive = typeof window !== 'undefined' && window.projectApp && window.projectApp !== this.app;
      console.log(`%c[Vibes-In-Window-Diagnostic] running layout diagnostic. isRecursive: ${isRecursive}`, "color: #ff9800; font-weight: bold;");
      
      const logElementInfo = (el, label) => {
        if (!el) {
          console.log(`  ${label}: null`);
          return;
        }
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        console.log(`  ${label}:`, {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top },
          styles: {
            position: style.position,
            display: style.display,
            overflow: style.overflow,
            zIndex: style.zIndex,
            top: style.top,
            left: style.left,
            height: style.height,
            width: style.width,
            flexDirection: style.flexDirection
          }
        });
      };

      logElementInfo(this.app.rootContainer, "this.app.rootContainer");

      const dialogs = document.querySelectorAll('.dialog-box, .uw-dialog');
      console.log(`  Found ${dialogs.length} dialogs on the page:`);
      dialogs.forEach((d, idx) => {
        const title = d.querySelector('.dialog-title, .uw-title')?.textContent || '(untitled)';
        logElementInfo(d, `Dialog #${idx} ("${title}")`);
        const header = d.querySelector('.dialog-header, .uw-header');
        logElementInfo(header, `  Header of Dialog #${idx}`);
        const content = d.querySelector('.dialog-content, .uw-content');
        logElementInfo(content, `  Content of Dialog #${idx}`);
      });
    }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 1039,
  "provides": [
    "AppUIManager"
  ],
  "deps": []
}
recursi-meta */
