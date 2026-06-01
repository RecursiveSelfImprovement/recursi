class YouTubePlayer {
  

  constructor() {
      this.gt = null;
      this.playlistManager = null;
      this.videoDialog = null;
      this.stateManager = new AppStateManager(this);
      this.fileIOManager = new FileIOManager(this);
      this.coopManager = new CoopManager(this);
      this.midiInputManager = new MidiInputManager(this);
      this.keyboardEditController = new KeyboardEditController(this);
      this.settingsDialogUI = new SettingsDialogUI(this);
      this.viewportManager = new ViewportManager(this);
      this.playbackController = new PlaybackController(this);
      this.advancedToolsUI = new AdvancedToolsUI(this);
      this.playlistSelectorUI = new PlaylistSelectorUI(this);
      this.welcomeDialogUI = new WelcomeDialogUI(this);
      this.state = this.stateManager.loadState();
      this.basePath = '/Bookmarklets/glowtunes/';

      // Playback Logic State
      this.activeSegments = null; // Array of {start, end}
      this.currentSegmentIndex = -1;
      
      // Track load state to avoid race conditions with incoming commands
      this._isPlaylistLoaded = false;
    }

  _buildLeftPanel() {
    this.leftPanelUI = new LeftPanelUI(this);
    this.leftPanelUI.build();
  }

  _buildRightPanel() {
    this.DialogBoxClass = typeof UITools !== 'undefined' ? UITools : null;
  }

  _playVideo(item, index) {
    this.playbackController.playVideo(item, index);
  }

  _handlePlayerState(s) {
    this.playbackController.handlePlayerState(s);
  }

  _toggleLeftPanel(section) {
    this.viewportManager.toggleLeftPanel(section);
  }

  _toggleRightPanel(section) {
    this.viewportManager.toggleRightPanel(section);
  }

  _updateDockUI() {
    this.viewportManager.updateDockUI();
  }

  _saveState() {
    this.stateManager.saveState();
  }

  _triggerSync() {
    this.pianoLogic.syncSelected();
  }

  _triggerUndo() {
    this.pianoLogic.undo();
  }

  _triggerDelete() {
    this.pianoLogic.deleteSelected();
  }

  setStatus(msg, color = '#aaa') {
    this.viewportManager.setStatus(msg, color);
  }

  _setupEditKeys() {
    this.keyboardEditController.setupEditKeys();
  }

  _init3DApp() {
    return this.viewportManager.init3DApp();
  }

  _importVEQ() {
    this.fileIOManager.importVEQ();
  }

  _exportVEQ() {
    this.fileIOManager.exportVEQ();
  }

  _setupComms() {
    this.coopManager.setupComms();
  }

  _handleMessage(event) {
    this.coopManager.handleMessage(event);
  }

  _handleRemoteAdd(payload) {
    this.coopManager.handleRemoteAdd(payload);
  }

  _handleRemotePlay(payload) {
    this.coopManager.handleRemotePlay(payload);
  }

  _sendMessage(type, payload = {}) {
    this.coopManager.sendMessage(type, payload);
  }

  _sendSync() {
    this.coopManager.sendSync();
  }

  computePlaylistHash() {
    return this.coopManager.computePlaylistHash();
  }

  _onGlobalTimeUpdate(time, isPlaying) {
    this.playbackController.onGlobalTimeUpdate(time, isPlaying);
  }

  _ensurePlaybackStart() {
    this.playbackController.ensurePlaybackStart();
  }

  _startFadeOutAndStop() {
    this.playbackController.startFadeOutAndStop();
  }

  async _savePlaylistToCloud() {
    await this.fileIOManager.savePlaylistToCloud();
  }

  async _initWebRTCHost() {
    await this.coopManager.initWebRTCHost();
  }

  async _initWebRTCGuest() {
    await this.coopManager.initWebRTCGuest();
  }

  _setupMidi() {
    this.midiInputManager.setupMidi();
  }

  _onMidiMessage(message) {
    this.midiInputManager.onMidiMessage(message);
  }

  setKeyboardStyle(style) {
    this.viewportManager.setKeyboardStyle(style);
  }

  setDisplayMode(style) {
    this.viewportManager.setDisplayMode(style);
  }

  _syncCanvasVisibilityToVeq() {
    this.viewportManager.syncCanvasVisibilityToVeq();
  }

  open3DSettingsDialog() {
    this.settingsDialogUI.open3DSettingsDialog();
  }

  _build3DDialogContent(container) {
    this.settingsDialogUI.build3DDialogContent(container);
  }

  _mkDialogSlider(labelText, getVal, setVal, min, max, step) {
    const row = makeElement('div', {
      style: 'display:flex; align-items:center; gap:8px; margin-bottom:4px;',
    });
    const labelEl = makeElement(
      'div',
      {
        style:
          'flex:0 0 75px; font-size:9px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color 0.1s;',
      },
      labelText
    );

    const sl = makeElement('input', {
      type: 'range',
      min,
      max,
      step,
      value: getVal(),
      style: 'flex:1; height:4px; margin:0; cursor:pointer;',
    });

    const decimals = step < 1 ? (step < 0.01 ? 3 : 2) : 0;

    const updateDisplay = (val) => {
      labelEl.textContent = val.toFixed(decimals);
      labelEl.style.color = '#4a90e2';
      labelEl.style.fontWeight = 'bold';
    };
    const resetDisplay = () => {
      labelEl.textContent = labelText;
      labelEl.style.color = '#aaa';
      labelEl.style.fontWeight = 'normal';
    };

    let isDragging = false;

    sl.onmousedown = () => {
      isDragging = true;
      updateDisplay(parseFloat(sl.value));
    };
    sl.onmouseup = () => {
      isDragging = false;
      resetDisplay();
    };
    sl.onmouseleave = () => {
      if (!isDragging) resetDisplay();
    };

    sl.addEventListener(
      'touchstart',
      () => {
        isDragging = true;
        updateDisplay(parseFloat(sl.value));
      },
      { passive: true }
    );
    sl.addEventListener('touchend', () => {
      isDragging = false;
      resetDisplay();
    });

    sl.oninput = () => {
      const v = parseFloat(sl.value);
      setVal(v);
      if (isDragging) updateDisplay(v);
    };

    const poll = () => {
      if (!sl.isConnected) return;
      const actual = getVal();
      if (
        actual !== undefined &&
        Math.abs(actual - parseFloat(sl.value)) > 0.001
      ) {
        sl.value = actual;
      }
      setTimeout(poll, 250);
    };
    setTimeout(poll, 250);

    row.append(labelEl, sl);
    return row;
  }

  _applyDisplayModeAfterLoad(style) {
    this.viewportManager.applyDisplayModeAfterLoad(style);
  }

  _loadState() {
    return this.stateManager.loadState();
  }

  _closeQuickSettingsDropdown() {
    this.settingsDialogUI.closeQuickSettingsDropdown();
  }

  _toggleQuickSettingsDropdown(btnEl) {
    this.settingsDialogUI.toggleQuickSettingsDropdown(btnEl);
  }

  _saveSettings() {
    this.stateManager.saveState();
  }

  _saveGeometry() {
    this.stateManager.saveGeometry();
  }

  _midiToName(mc) {
    const names = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    return names[mc % 12] + (Math.floor(mc / 12) - 1);
  }

  _updateSongSettings(updates) {
    this.stateManager.updateSongSettings(updates);
  }

  _setupGlobalSyncKeys() {
    this.keyboardEditController.setupGlobalSyncKeys();
  }

  showKeystroke(keyStr) {
    this.keyboardEditController.showKeystroke(keyStr);
  }

  _importPlaylist() {
    this.fileIOManager.importPlaylist();
  }

  _fetchAndLoadPlaylist(url, forcedAddType = null) {
    this.fileIOManager.fetchAndLoadPlaylist(url, forcedAddType);
  }

  toggleFullscreen() {
    this.viewportManager.toggleFullscreen();
  }

  _injectStyles() {
    this.viewportManager.injectStyles();
  }

  _createFloatingMenuButton() {
    this.viewportManager.createFloatingMenuButton();
  }

  _makeDraggable(el, persistenceKey) {
    this.viewportManager.makeDraggable(el, persistenceKey);
  }

  _processUrlParameters() {
    this.fileIOManager.processUrlParameters();
  }

  _refreshVisuals(forceFinal = false) {
    if (this.gt?.pianoVisuals) {
      this.gt.pianoVisuals.updateLayout();
    }
    if (this.piano3DApp && this.gt?.pianoVisuals?.geometrySettings) {
      if (forceFinal) {
        this.piano3DApp._lastVpW = null;
        this.piano3DApp._lastVpH = null;
      }
      this.piano3DApp.alignTo2D(
        this.gt.pianoVisuals.geometrySettings,
        forceFinal
      );
    }
  }

  _scheduleLayoutRefresh(reason) {
    // Immediate light refresh so dragging feels responsive
    this._refreshVisuals(false);

    // Debounced final rebuild — guaranteed clean state after events settle
    if (this._layoutRebuildTimer) clearTimeout(this._layoutRebuildTimer);
    this._layoutRebuildTimer = setTimeout(() => {
      this._layoutRebuildTimer = null;
      SidePanel.updateGlobalSafeArea();
      this._refreshVisuals(true);
      // Second pass after browser has had a frame to settle CSS transitions
      requestAnimationFrame(() => {
        this._refreshVisuals(true);
      });
      if (window.smartLog) {
        window.smartLog(
          'Layout',
          `[Resize Tracker] Final rebuild after: ${reason}`
        );
      }
    }, 180);
  }

  _showWelcomeDialog() {
    this.welcomeDialogUI.show();
  }

  _showMidiPrompt() {
      const container = makeElement('div', {
        style:
          'padding: 10px; color: #eee; font-family: sans-serif; line-height: 1.5;',
      });

      container.appendChild(
        makeElement(
          'h3',
          { style: 'margin: 0 0 10px 0; color: #4a90e2;' },
          '🎹 Piano Roll Detected!'
        )
      );
      container.appendChild(
        makeElement(
          'p',
          { style: 'margin: 0 0 15px 0;' },
          'It looks like this video has piano note data. Do you have a MIDI keyboard you want to connect to play along?'
        )
      );

      const btnRow = makeElement('div', {
        style: 'display: flex; gap: 10px; justify-content: flex-end;',
      });

      const noBtn = makeElement(
        'button',
        { className: 'dialog-button', style: 'padding: 8px 16px;' },
        'No, just watch'
      );
      const yesBtn = makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style: 'padding: 8px 16px; font-weight: bold;',
        },
        'Yes, Connect MIDI'
      );

      noBtn.onclick = () => {
        if (this.midiPromptDialog) this.midiPromptDialog.close();
      };

      yesBtn.onclick = () => {
        if (this.midiInputManager) {
          this.midiInputManager.setupMidi(true);
          this.setStatus('MIDI Input Enabled.', '#4f4');
          if (this.leftPanelUI) this.leftPanelUI.build();
        }
        if (this.midiPromptDialog) this.midiPromptDialog.close();
      };

      btnRow.append(noBtn, yesBtn);
      container.appendChild(btnRow);

      this.midiPromptDialog =
        typeof UITools !== 'undefined'
          ? UITools.makeDialog({
              env: this.env, // Automatically binds UI to lifecycle
              title: 'MIDI Setup',
              content: container,
              width: '380px',
              position: [
                window.innerWidth / 2 - 190,
                window.innerHeight / 2 - 100,
              ],
              appendTo: this.rootElement,
              onClose: () => {
                this.midiPromptDialog = null;
              },
            })
          : null;
    }

  init(targetElement) {
      this.rootElement = targetElement || document.body;
      window.player = this;
      window.projectApp = this; // Restored to support Aardvark's hardcoded sub-module references

      this.DialogBoxClass = typeof UITools !== 'undefined' ? UITools : null;

      window.smartLog = (cat, msg, data) => SmartLogger.log(cat, msg, data);
      this._injectStyles();
      this.pianoLogic = new PianoRollController(this);
      this.headerControlsUI = new HeaderControlsUI(this);

      // Pass the environment into SidePanel
      this.leftPanel = new SidePanel('left', 360, this.env);

      this._buildLeftPanel();

      GlowTunesKeys.initialize(this);
      this._setupGlobalSyncKeys();

      this._setupComms();
      this._setupMidi();

      this._createFloatingMenuButton();

      // Curator: Instantiate our Diagnostics UI on app boot
      this.curatorDiagnosticsUI = new CuratorDiagnosticsUI(this);
      window.openCuratorDiagnostics = () => {
        this.curatorDiagnosticsUI.open();
      };

      // Register developer helper functions
      window.toggleSmartAutoArp = (enable) => {
        this.state.settings.smartAutoArp = !!enable;
        this._saveSettings();
        console.log(`[SmartArp] smartAutoArp is now: ${!!enable}`);
        if (this.smartArpDiagnosticsUI) this.smartArpDiagnosticsUI.refresh();
      };

      window.toggleSmartAutoArpViewport = (enable) => {
        this.state.settings.smartAutoArpVerbose = !!enable;
        this._saveSettings();
        console.log(`[SmartArp] smartAutoArpVerbose is now: ${!!enable}`);
        if (this.smartArpDiagnosticsUI) this.smartArpDiagnosticsUI.refresh();
      };

      window.clearPlaylistSettings = () => {
        if (this.playlistManager && this.playlistManager.playlist) {
          this.playlistManager.playlist.forEach(item => {
            delete item.songSettings;
            delete item.startTime;
            delete item.endTime;
          });
          this.playlistManager.renderItems();
          this._saveState();
          this._sendSync();
          console.log("[SmartArp] Cleared custom song settings, start times, and end times for all playlist items in memory.");
          if (this.smartArpDiagnosticsUI) this.smartArpDiagnosticsUI.refresh();
        }
      };

      window.openSmartArpDiagnostics = () => {
        if (!this.smartArpDiagnosticsUI) {
          this.smartArpDiagnosticsUI = new SmartArpDiagnosticsUI(this);
        }
        this.smartArpDiagnosticsUI.open();
      };

      window.addEventListener('webgl-context-restored', () => {
        this.setStatus('Graphics memory reset. Restoring 3D Piano...', '#fa0');
        const currentMode = this.state.settings.keyboardStyle || '3d';
        this.setDisplayMode('2d');
        setTimeout(() => {
          this.setDisplayMode(currentMode);
          this.setStatus('3D Piano Restored.', '#4f4');
        }, 1000);
      });

      window.addEventListener('panel-toggle-complete', () => {
        this._scheduleLayoutRefresh('panel-toggle-complete');
      });

      window.addEventListener('layout-safe-area-change', (e) => {
        this._scheduleLayoutRefresh('layout-safe-area-change');
      });

      window.addEventListener('resize', () => {
        SidePanel.updateGlobalSafeArea();
        this._scheduleLayoutRefresh('window.resize');
      });
      SidePanel.updateGlobalSafeArea();

      const update3DInteraction = (e) => {
        const cvs = document.getElementById('canvas-container');
        if (!cvs || cvs.style.display === 'none') return;

        const modDown = e.metaKey || e.ctrlKey || e.altKey || e.shiftKey;
        const isOrbiting = this.piano3DApp && this.piano3DApp.orbitModeActive;

        if (modDown || isOrbiting) {
          if (cvs.style.pointerEvents !== 'auto')
            cvs.style.pointerEvents = 'auto';
        } else {
          if (cvs.style.pointerEvents !== 'none')
            cvs.style.pointerEvents = 'none';
        }
      };

      window.addEventListener('keydown', update3DInteraction, true);
      window.addEventListener('keyup', update3DInteraction, true);
      window.addEventListener('mousemove', update3DInteraction, true);
      window.addEventListener('mousedown', update3DInteraction, true);
      window.addEventListener('wheel', update3DInteraction, true);

      window.addEventListener('blur', () => {
        const cvs = document.getElementById('canvas-container');
        if (cvs) cvs.style.pointerEvents = 'none';
      });

      window.addEventListener(
        'wheel',
        (e) => {
          if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

          if (this.piano3DApp && this.piano3DApp.orbitModeActive) return;

          if (e.target && e.target.closest) {
            if (
              e.target.closest('.yt-side-panel') ||
              e.target.closest('.yt-pill-ctrl')
            )
              return;

            const dialog = e.target.closest('.uw-dialog');
            if (dialog) {
              const titleEl = dialog.querySelector('.uw-title');
              if (titleEl && !titleEl.textContent.startsWith('Video:')) {
                return;
              }
            }
          }

          if (this.gt && this.gt.videoPlayer && this.gt.videoPlayer.isReady) {
            e.preventDefault();
            let vol = this.gt.videoPlayer.getVolume();
            val += e.deltaY < 0 ? 5 : -5;
            val = Math.max(0, Math.min(100, vol));
            this.state.settings.videoVolume = vol;
            this._saveState();
            this.setStatus(`Volume: ${Math.round(vol)}%`, '#4f4');
            if (this.leftPanelUI) this.leftPanelUI.refreshAudioUI();
          }
        },
        { passive: false, capture: true }
      );

      window.addEventListener('blur', () => {
        setTimeout(() => {
          window.focus();
        }, 10);
      });

      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
          document.body.classList.remove('fullscreen-mode');
          this.viewportManager.destroyFullscreenToolbar();
        } else {
          document.body.classList.add('fullscreen-mode');
        }
        SidePanel.updateGlobalSafeArea();
        this._scheduleLayoutRefresh('fullscreenchange');
        setTimeout(() => {
          if (document.fullscreenElement) {
            this.viewportManager.createFullscreenToolbar();
          }
        }, 600);
      });

      setTimeout(() => {
        this._processUrlParameters();

        // Setup IndexedDB Async playlist parsing on app boot
        this.stateManager.loadPlaylistAsync().then((playlistData) => {
          if (playlistData && this.playlistManager) {
            this.playlistManager.load(playlistData);
            this.state.playlistData = playlistData;
            if (this.playlistManager.playlist.length > 0) {
              if (!this.leftPanel.isOpen) {
                this.leftPanel.open('playlist');
                this._updateDockUI();
              }
            }
          } else if (!this.videoDialog) {
            if (!this.leftPanel.isOpen) {
              this.leftPanel.open('playlist');
            }
          }
          
          this._isPlaylistLoaded = true;
          if (this.coopManager && typeof this.coopManager.flushPendingIncomingCommands === 'function') {
            this.coopManager.flushPendingIncomingCommands();
          }
        });

        if (!localStorage.getItem('aardvark_welcome_shown_v1')) {
          localStorage.setItem('aardvark_welcome_shown_v1', 'true');
          this._showWelcomeDialog();
        }

        // Auto-reopen diagnostics window if it was left open previously
        if (localStorage.getItem('gt_smart_arp_diag_open') === 'true') {
          window.openSmartArpDiagnostics();
        }
      }, 500);

      return this;
    }

  async run(env) {
      if (this.rootElement) {
        this.destroy();
      }

      // Save environment so we can pass it down to child UI components
      this.env = env;

      if (!env || !env.container) {
        throw new Error("[Aardvark] run() requires an environment object with a valid container.");
      }

      const parentElement = env.container;

      const containerId = 'yt-app-' + Math.random().toString(36).slice(2);
      const appContainer = makeElement('div', {
        id: containerId,
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          overflow: 'hidden',
        },
      });
      parentElement.appendChild(appContainer);
      this.rootElement = appContainer;

      // Ensure layout recalculates gracefully when the container changes size (e.g. Vibes split pane)
      if (
        !parentElement._vibesAppResizeObserver &&
        typeof ResizeObserver !== 'undefined'
      ) {
        const ro = new ResizeObserver(() => {
          if (typeof SidePanel !== 'undefined') SidePanel.updateGlobalSafeArea();
          if (this._scheduleLayoutRefresh)
            this._scheduleLayoutRefresh('container_resize_observer');
        });
        ro.observe(parentElement);
        parentElement._vibesAppResizeObserver = ro;
      }

      this.init(appContainer);

      // Safe environment-based handshake
      if (env && typeof env.requestKeystrokeControl === 'function') {
        env.requestKeystrokeControl((active) => {
          this.isKeystrokeCaptureActive = active;
          if (typeof KeyCommandHandler !== 'undefined') {
            KeyCommandHandler.setPaused(!active);
          }
          if (this.keyboardEditController && typeof this.keyboardEditController.setPaused === 'function') {
            this.keyboardEditController.setPaused(!active);
          }
        });
      } else {
        this.isKeystrokeCaptureActive = true;
      }

      return this;
    }

  

  destroy() {
      if (this._layoutRebuildTimer) {
        clearTimeout(this._layoutRebuildTimer);
        this._layoutRebuildTimer = null;
      }

      if (this._volEnforcerInterval) {
        clearInterval(this._volEnforcerInterval);
        this._volEnforcerInterval = null;
      }

      if (this._volPoll) {
        clearInterval(this._volPoll);
        this._volPoll = null;
      }

      if (
        this.viewportManager &&
        typeof this.viewportManager.destroyFullscreenToolbar === 'function'
      ) {
        try {
          this.viewportManager.destroyFullscreenToolbar();
        } catch (error) {}
      }

      if (this.videoDialog && typeof this.videoDialog.close === 'function') {
        try {
          this.videoDialog.close();
        } catch (e) {}
      }
      this.videoDialog = null;

      if (this.leftPanel && typeof this.leftPanel.close === 'function') {
        try {
          this.leftPanel.close();
        } catch (e) {}
      }
      this.leftPanel = null;

      if (this.rightPanel && typeof this.rightPanel.close === 'function') {
        try {
          this.rightPanel.close();
        } catch (e) {}
      }
      this.rightPanel = null;

      if (this.settingsDialogUI) {
        try {
          this.settingsDialogUI.closeQuickSettingsDropdown();
        } catch (e) {}
        if (
          this.settingsDialogUI._3dSettingsDialog &&
          typeof this.settingsDialogUI._3dSettingsDialog.close === 'function'
        ) {
          try {
            this.settingsDialogUI._3dSettingsDialog.close();
          } catch (e) {}
        }
      }

      if (
        this.advancedToolsUI &&
        this.advancedToolsUI.dialog &&
        typeof this.advancedToolsUI.dialog.close === 'function'
      ) {
        try {
          this.advancedToolsUI.dialog.close();
        } catch (e) {}
      }

      if (
        this.advancedToolsUI &&
        this.advancedToolsUI.editorDialog &&
        typeof this.advancedToolsUI.editorDialog.close === 'function'
      ) {
        try {
          this.advancedToolsUI.editorDialog.close();
        } catch (e) {}
      }

      if (
        this.welcomeDialogUI &&
        this.welcomeDialogUI.dialog &&
        typeof this.welcomeDialogUI.dialog.close === 'function'
      ) {
        try {
          this.welcomeDialogUI.dialog.close();
        } catch (e) {}
      }

      if (
        this.midiPromptDialog &&
        typeof this.midiPromptDialog.close === 'function'
      ) {
        try {
          this.midiPromptDialog.close();
        } catch (e) {}
      }

      const mdt = window.MidiDiagnosticTool
        ? window.MidiDiagnosticTool.getInstance()
        : null;
      if (mdt && mdt.dialog && typeof mdt.dialog.close === 'function') {
        try {
          mdt.dialog.close();
        } catch (e) {}
      }

      if (this.gt && typeof this.gt.destroy === 'function') {
        try {
          this.gt.destroy();
        } catch (e) {}
      }
      this.gt = null;

      if (this.piano3DApp && typeof this.piano3DApp.destroy === 'function') {
        try {
          this.piano3DApp.destroy();
        } catch (e) {}
      }
      this.piano3DApp = null;

      if (this.floatingMenuBtn && this.floatingMenuBtn.parentElement) {
        this.floatingMenuBtn.parentElement.removeChild(this.floatingMenuBtn);
      }
      this.floatingMenuBtn = null;

      if (this.rootElement && this.rootElement.parentElement) {
        this.rootElement.parentElement.removeChild(this.rootElement);
      }
      this.rootElement = null;

      if (window.player === this) window.player = null;
      if (window.projectApp === this) window.projectApp = null; // Restored
      if (window.HackerAPI && window.HackerAPI.mainApp === this) {
        window.HackerAPI.mainApp = null;
      }
    }

  _applyArpVisuals() {
    if (this.gt?.pianoVisuals && window.VideoEventQueueClass?.current) {
      this.gt.pianoVisuals.loadVeq(window.VideoEventQueueClass.current);
    }
    this._refreshVisuals();
    if (this.gt?.synchronizer) {
      this.gt.synchronizer.resyncScheduler();
    }
  }

  getAppWidth() {
    if (!this.rootElement) return window.innerWidth;
    return this.rootElement === document.body
      ? window.innerWidth
      : this.rootElement.clientWidth;
  }

  getAppHeight() {
    if (!this.rootElement) return window.innerHeight;
    return this.rootElement === document.body
      ? window.innerHeight
      : this.rootElement.clientHeight;
  }

  
}