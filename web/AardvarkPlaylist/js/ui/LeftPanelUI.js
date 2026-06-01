
class LeftPanelUI {
  
  constructor(player) {
    this.player = player;
    this.audioContainer = null;
  }

  build() {
      const leftC = this.player.leftPanel.contentContainer;
      leftC.innerHTML = '';

      if (this._timerInterval) {
        clearInterval(this._timerInterval);
        this._timerInterval = null;
      }

      const setupContent = this.player.leftPanel.addSection(
        'setup',
        'Welcome & Setup',
        false
      );

      // --- WELCOME BUTTON ---
      const welcomeBtn = makeElement(
        'button',
        {
          className: 'dialog-button',
          style:
            'width: 100%; padding: 10px; margin-bottom: 8px; font-size: 12px; font-weight: bold;',
          onclick: () => this.player._showWelcomeDialog(),
        },
        '👋 Open Welcome Screen'
      );

      // --- MIDI BUTTON ---
      const isMidiEnabled = this.player.state.settings.midiEnabled;
      const midiBtn = makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style: `width: 100%; padding: 10px; margin-bottom: 8px; font-size: 12px; font-weight: bold; background-color:${
            isMidiEnabled ? '#2ecc71' : '#3498db'
          }; border-color:${isMidiEnabled ? '#27ae60' : '#2980b9'};`,
          onclick: () => {
            localStorage.setItem('aardvark_midi_prompted', 'true');
            if (this.player.midiInputManager) {
              this.player.midiInputManager.setupMidi(true);
              this.player.setStatus(
                'MIDI Input Enabled. Permission requested.',
                '#4f4'
              );
              midiBtn.textContent = '✅ MIDI Keyboard Enabled';
              midiBtn.style.backgroundColor = '#2ecc71';
              midiBtn.style.borderColor = '#27ae60';
            }
          },
        },
        isMidiEnabled ? '✅ MIDI Keyboard Enabled' : '🎹 Enable MIDI Keyboard'
      );

      // --- ADVANCED TOOLS ---
      const advBtn = makeElement(
        'button',
        {
          className: 'dialog-button',
          style:
            'width: 100%; padding: 8px; margin-bottom: 5px; font-size: 11px;',
          onclick: () => this.player.advancedToolsUI.open(),
        },
        '🛠️ Advanced Tools (Import/Export)'
      );

      setupContent.append(welcomeBtn, midiBtn, advBtn);

      const plContent = this.player.leftPanel.addSection(
        'playlist',
        'Video Library',
        true
      );
      this._buildPlaylistControls(plContent);

      const karaokeContent = this.player.leftPanel.addSection(
        'karaokeStyle',
        'Karaoke Style',
        false
      );
      this._buildKaraokeStyleControls(karaokeContent);

      const coopContent = this.player.leftPanel.addSection(
        'coop',
        'Co-Op Watch Party',
        false
      );
      this._buildCoopControls(coopContent);

      // Section renamed from "Note Geometry (Dev)" to "Dev Tools"
      const geoContent = this.player.leftPanel.addSection(
        'geometry',
        'Dev Tools',
        false
      );
      this._buildGeoControls(geoContent);
    }

  _buildGeoControls(container) {
    this.geoContainer = container;
    this._renderGeometryControls();
  }

  _buildSystemControls(container) {
    const btnRow = makeElement('div', {
      style: 'display:flex; gap:5px; margin-bottom:15px;',
    });
    btnRow.append(
      makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style: 'flex:1; padding: 8px;',
          onclick: () => this.player.advancedToolsUI.open(),
        },
        '🛠️ Advanced Tools'
      )
    );
    container.append(btnRow);

    // Hotkeys Guide
    const grid = makeElement('div', {
      style:
        'display:grid; grid-template-columns: 1fr 3fr; gap:4px; font-size:10px; color:#aaa; line-height:1.4;',
    });
    const addKey = (k, desc) => {
      grid.append(
        makeElement(
          'b',
          { style: 'color:#fff; text-align:right; padding-right:5px;' },
          k
        ),
        makeElement('span', {}, desc)
      );
    };
    addKey('S', 'Sync Selected Note');
    addKey('Z', 'Undo');
    addKey('Del', 'Delete Selected');
    addKey('P', 'Play / Pause');
    addKey('B', 'Back 10s');
    addKey('0-9', 'Seek %');
    container.append(grid);
  }

  _buildPlaylistControls(container) {
    const timerBar = makeElement('div', {
      style:
        'display:flex; align-items:center; gap:8px; margin-bottom:10px; padding:6px; background:#222; border-radius:4px; border:1px solid #333;',
    });

    // Mode Select (Renamed Stop After to Stop at End)
    const pbSelect = makeElement('select', {
      style:
        'flex:1; font-size:10px; background:#111; color:#eee; border:1px solid #444; padding:2px;',
      title: 'Choose what happens when the video ends.',
      onchange: (e) => {
        const val = e.target.value;
        this.player.state.settings.playbackMode = val;

        if (val !== 'timer') {
          this.player.state.settings.playbackStopTime = null;
        } else {
          this.player.state.settings.playbackStopTime = Date.now() + 30 * 60000;
        }
        this.player._saveState();
        this.build();
      },
    });

    [
      { v: 'continuous', l: 'Loop / Play Next' },
      { v: 'stop_one', l: 'Stop at End' },
      { v: 'timer', l: 'Stop on Timer...' },
    ].forEach((m) => {
      const opt = makeElement('option', { value: m.v }, m.l);
      if (this.player.state.settings.playbackMode === m.v) opt.selected = true;
      pbSelect.appendChild(opt);
    });

    timerBar.appendChild(pbSelect);

    if (this.player.state.settings.playbackMode === 'timer') {
      const minInput = makeElement('input', {
        type: 'number',
        value: '30',
        style:
          'width:30px; font-size:10px; background:#111; color:#fff; border:1px solid #444; padding:2px; text-align:center;',
      });

      const setBtn = makeElement(
        'button',
        {
          className: 'dialog-button',
          style: 'padding:2px 6px; font-size:9px;',
          onclick: () => {
            const m = parseInt(minInput.value) || 30;
            this.player.state.settings.playbackStopTime =
              Date.now() + m * 60000;
            this.player._saveState();
            updateCountdown();
          },
        },
        'Set'
      );

      const countdownDisplay = makeElement(
        'div',
        {
          style:
            'font-size:10px; color:#4f4; font-family:monospace; min-width:40px; text-align:right;',
        },
        '--:--'
      );

      const updateCountdown = () => {
        const stopTime = this.player.state.settings.playbackStopTime;
        if (!stopTime) {
          countdownDisplay.textContent = 'OFF';
          countdownDisplay.style.color = '#888';
          return;
        }
        const diff = stopTime - Date.now();
        if (diff <= 0) {
          countdownDisplay.textContent = '00:00';
          countdownDisplay.style.color = '#f55';
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          countdownDisplay.textContent = `${mins}:${secs
            .toString()
            .padStart(2, '0')}`;
          countdownDisplay.style.color = '#4f4';
        }
      };

      updateCountdown();
      if (this._timerInterval) clearInterval(this._timerInterval);
      this._timerInterval = setInterval(updateCountdown, 1000);

      timerBar.append(
        minInput,
        makeElement('span', { style: 'font-size:9px;color:#888' }, 'm'),
        setBtn,
        countdownDisplay
      );
    }

    container.appendChild(timerBar);

    const listWrapper = makeElement('div', {
      style: 'flex:1; display:flex; flex-direction:column; min-height:200px;',
    });
    container.appendChild(listWrapper);

    let initialUrl = this.player.state.settings.lastPlaylistUrl;

    this.player.playlistManager = new Playlist(listWrapper, {
      initialUrl: initialUrl || '',
      playlistSelectorUI: this.player.playlistSelectorUI,
      onPlay: (item, index) => this.player._playVideo(item, index),
      onLoopToggle: () => this.player._saveState(),
      onPlaylistChange: () => {
        if (!this.player._isLoadingPlaylist && this.player.playlistSelectorUI) {
          this.player.playlistSelectorUI.markModified();
        }
        this.player._saveState();
        this.player._sendSync();
      },
      onLoadUrl: (url) => this.player._fetchAndLoadPlaylist(url),
      onCloudSave: () => this.player._savePlaylistToCloud(),
      onImportFile: () => this.player._importPlaylist(),
    });

    if (this.player.state.settings.playlistModified) {
      if (this.player.state.playlistData) {
        this.player.playlistManager.load(this.player.state.playlistData);
      }
    } else if (initialUrl) {
      this.player._fetchAndLoadPlaylist(initialUrl, 'replace');
    }
  }

  _renderMasterControls(container) {
    const fileRow = makeElement('div', {
      style: 'display:flex; gap:5px; margin-bottom:10px;',
    });
    fileRow.append(
      makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style: 'flex:1',
          onclick: () => this.player.advancedToolsUI.open(),
        },
        '🛠️ Advanced Tools'
      )
    );
    container.append(fileRow);
  }

  _buildCoopControls(container) {
    container.innerHTML = '';

    const info = makeElement(
      'div',
      {
        style:
          'font-size:11px; color:#888; margin-bottom:10px; line-height:1.4;',
      },
      'Synchronize playback with a peer. If one player races ahead by 2 seconds, it will automatically pause to wait.'
    );

    const btnRow = makeElement('div', {
      style: 'display:flex; gap:8px; margin-bottom:10px;',
    });

    const hostBtn = makeElement(
      'button',
      {
        className: 'dialog-button primary',
        style: 'flex:1;',
        onclick: () => this.player._initWebRTCHost(),
      },
      'Host Room'
    );

    const joinBtn = makeElement(
      'button',
      {
        className: 'dialog-button',
        style: 'flex:1;',
        onclick: () => this.player._initWebRTCGuest(),
      },
      'Join Room'
    );

    btnRow.append(hostBtn, joinBtn);

    // Status Box
    const statusBox = makeElement(
      'div',
      {
        id: 'webrtc-status-box',
        style:
          'background:#111; border:1px solid #333; padding:8px; font-size:10px; color:#aaa; font-family:monospace; word-break:break-all;',
      },
      'Not connected.'
    );

    // We will export a global function so the player can update this easily
    this.player.updateWebRTCStatus = (msg, color = '#aaa') => {
      if (statusBox) {
        statusBox.textContent = msg;
        statusBox.style.color = color;
      }
    };

    container.append(info, btnRow, statusBox);
  }

  refreshGeometryUI() {
    if (this.geoContainer) {
      this._renderGeometryControls();
    }
  }

  _renderGeometryControls() {
      this.geoContainer.innerHTML = '';

      const orbitRow = makeElement('div', {
        style:
          'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom: 1px solid #333; padding-bottom: 8px;',
      });
      const isOrbiting = !!this.player.piano3DApp?.orbitModeActive;
      const orbitCheck = makeElement('input', {
        type: 'checkbox',
        checked: isOrbiting,
      });
      orbitCheck.onchange = (e) => {
        const app = this.player.piano3DApp;
        if (app) {
          app.orbitModeActive = e.target.checked;
          if (app.app) app.app.enableOrbit(e.target.checked);
          const cvs = document.getElementById('canvas-container');
          if (e.target.checked) {
            if (cvs) cvs.style.pointerEvents = 'auto';
          } else {
            if (cvs) cvs.style.pointerEvents = 'none';
            if (this.player.gt?.pianoVisuals?.geometrySettings) {
              app.alignTo2D(this.player.gt.pianoVisuals.geometrySettings);
            }
          }
        }
      };
      orbitRow.append(
        makeElement(
          'span',
          { style: 'font-weight:bold; color:#4f4; font-size:11px;' },
          'Free Orbit Mode (3D)'
        ),
        orbitCheck
      );
      this.geoContainer.appendChild(orbitRow);

      const btn3D = makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style: 'width:100%; margin-bottom:10px; padding:8px; font-size:11px;',
          onclick: () => this.player.open3DSettingsDialog(),
        },
        '🖥️ Open 3D Piano Settings'
      );
      this.geoContainer.appendChild(btn3D);

      // Consolidated Developer & Diagnostics Panels
      const diagBtn = makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style:
            'width:100%; margin-bottom:10px; padding:8px; font-size:11px; background-color:#9b59b6; border-color:#8e44ad;',
          onclick: () => {
            if (!window.midiDiagnostics) {
              Promise.resolve({ MidiDiagnosticTool: (typeof MidiDiagnosticTool !== "undefined" ? MidiDiagnosticTool : null) }).then((mod) => {
                new mod.MidiDiagnosticTool().openDialog();
              });
            } else {
              window.midiDiagnostics.openDialog();
            }
          },
        },
        '🔍 Open MIDI Diagnostics'
      );
      this.geoContainer.appendChild(diagBtn);

      const smartArpBtn = makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style:
            'width:100%; margin-bottom:10px; padding:8px; font-size:11px; background-color:#27ae60; border-color:#1b5e20;',
          onclick: () => {
            window.openSmartArpDiagnostics();
          },
        },
        '🔀 Smart Arpeggiation Diagnostics'
      );
      this.geoContainer.appendChild(smartArpBtn);

      const curatorBtn = makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style:
            'width:100%; margin-bottom:10px; padding:8px; font-size:11px; background-color:#e050ff; border-color:#c040df;',
          onclick: () => {
            if (window.openCuratorDiagnostics) window.openCuratorDiagnostics();
          },
        },
        '🛠️ Curator & Developer Live Diagnostics'
      );
      this.geoContainer.appendChild(curatorBtn);

      const mkGroup = (title) => {
        const content = makeElement('div', {
          style: 'padding:8px 0; display:flex; flex-direction:column; gap:4px;',
        });
        const sum = makeElement(
          'summary',
          {
            style:
              'font-weight:bold; color:#bbb; cursor:pointer; font-size:11px; padding:4px 0;',
          },
          title
        );
        const det = makeElement(
          'details',
          {
            open: true,
            style:
              'border-bottom:1px solid #333; padding-bottom:4px; margin-bottom:4px;',
          },
          [sum, content]
        );
        this.geoContainer.appendChild(det);
        return content;
      };

      const getGeoVal = (prop, fallback) => {
        const g =
          this.player.gt?.pianoVisuals?.geometrySettings ||
          this.player.state.geometry ||
          {};
        return g[prop] !== undefined ? g[prop] : fallback;
      };

      const setGeoVal = (prop, v) => {
        try {
          if (this.player.gt?.pianoVisuals?.geometrySettings) {
            this.player.gt.pianoVisuals.geometrySettings[prop] = v;
          }
          if (this.player.state.geometry) {
            this.player.state.geometry[prop] = v;
          } else {
            this.player.state.geometry = { [prop]: v };
          }
          if (this.player._saveGeometry) this.player._saveGeometry();

          const pv = this.player.gt?.pianoVisuals;
          if (pv) {
            pv.updateLayout();
            if (pv.actionBar && pv.actionBar.recalculateLayout) {
              const gs = pv.geometrySettings;
              const wPct = (gs.customWidth || 100) / 100;
              pv.actionBar.recalculateLayout(gs.w || window.innerWidth * wPct);
            }
            if (this.player.gt?.videoPlayer) {
              let t = 0;
              try {
                const acc = this.player.gt.videoPlayer.getAccurateTime();
                t = (acc && typeof acc.time === 'number') ? acc.time * 1000 : 0;
              } catch (e) {
                t = (this.player.gt.videoPlayer.lastRealTime || 0) * 1000;
              }
              pv.setTime(t, 0, true);
            }
          }
          if (this.player.piano3DApp && this.player.piano3DApp.app) {
            this.player.piano3DApp.alignTo2D(this.player.gt.pianoVisuals.geometrySettings);
          }
        } catch (err) {
          console.error('[setGeoVal] Exception during live geometry sync:', err);
        }
      };

      const mk_comp_row = (l, p, min, max, step, def) => {
        return this._mkCompactSlider(
          l,
          () => getGeoVal(p, def),
          (v) => setGeoVal(p, v),
          min,
          max,
          step
        );
      };

      const barsGroup = mkGroup('Flying Bars Alignment');

      const resetBarsBtn = makeElement(
        'button',
        {
          className: 'dialog-button',
          style: 'width:100%; margin-bottom: 8px;',
          onclick: () => {
            setGeoVal('xShift', 0);
            setGeoVal('fineX', 10);
            setGeoVal('abWhiteSpread', 1.0);
            setGeoVal('abBlackSpread', 1.0);
            setGeoVal('abBlackYOffset', -15);
            setGeoVal('timeShift', 0);
            setGeoVal('whiteWidth', 1);
            setGeoVal('blackWidth', 1);
            setGeoVal('whiteKeyHeight', 0);
            setGeoVal('blackKeyHeight', 0);
          },
        },
        'Reset Alignment to Defaults'
      );

      barsGroup.append(
        resetBarsBtn,
        mk_comp_row('Global L/R Shift', 'xShift', -50, 50, 0.1, 0),
        mk_comp_row('Fine X Shift', 'fineX', -100, 100, 0.5, 10),
        mk_comp_row('White Key Spread', 'abWhiteSpread', 0.9, 1.1, 0.0001, 1.0),
        mk_comp_row('Black Key Spread', 'abBlackSpread', 0.9, 1.1, 0.0001, 1.0),
        mk_comp_row('Black Vert Offset', 'abBlackYOffset', -50, 50, 0.1, -15),
        mk_comp_row('Front/Back Shift', 'timeShift', -200, 200, 0.5, 0),
        mk_comp_row('White Width', 'whiteWidth', 0.9, 1.1, 0.001, 1),
        mk_comp_row('Black Width', 'blackWidth', 0.9, 1.1, 0.001, 1),
        mk_comp_row('White Key Height', 'whiteKeyHeight', -50, 50, 0.1, 0),
        mk_comp_row('Black Key Height', 'blackKeyHeight', -50, 50, 0.1, 0)
      );

      const outGroup = mkGroup('Export Settings JSON');
      const outText = makeElement('textarea', {
        style:
          'width:100%; height:120px; font-size:9px; background:#111; color:#aaa; border:1px solid #444; font-family:monospace; margin-bottom:4px;',
      });
      const btnBoxRow = makeElement('div', { style: 'display:flex; gap:4px;' });

      const refreshOut = () => {
        const payload = {
          geometrySettings: this.player.state.geometry || {},
        };
        outText.value = JSON.stringify(payload, null, 2);
      };

      btnBoxRow.append(
        makeElement(
          'button',
          {
            className: 'dialog-button',
            style: 'flex:1',
            onclick: refreshOut,
          },
          'Gen JSON'
        ),
        makeElement(
          'button',
          {
            className: 'dialog-button primary',
            style: 'flex:1',
            onclick: () => {
              refreshOut();
              navigator.clipboard
                .writeText(outText.value)
                .then(() => alert('Copied to clipboard!'));
            },
          },
          'Copy'
        )
      );
      outGroup.append(outText, btnBoxRow);
    }

  _mkCompactSlider(labelText, getVal, setVal, min, max, step) {
    const row = makeElement('div', {
      style: 'display:flex; align-items:center; gap:8px; margin-bottom:4px;',
    });
    const labelEl = makeElement(
      'div',
      {
        style:
          'flex: 0 0 65px; font-size:9px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition: color 0.1s;',
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

  refreshAudioUI() {
    // Legacy stub to prevent crashes if called
  }

  _buildKaraokeStyleControls(container) {
    applyCss(
      `
    .k-style-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
    }
    .k-style-label {
      flex: 0 0 55px; font-size: 10px; color: #aaa; white-space: nowrap;
    }
    .k-style-swatch {
      width: 22px; height: 22px; border-radius: 4px; border: 1px solid #555;
      cursor: pointer; box-shadow: 0 0 4px rgba(0,0,0,0.4); transition: transform 0.1s;
    }
    .k-style-swatch:hover { transform: scale(1.15); }
    .k-style-select {
      flex: 1; font-size: 10px; background: #111; color: #eee;
      border: 1px solid #444; padding: 3px 4px; border-radius: 3px;
    }
    .k-style-slider {
      flex: 1; height: 4px; margin: 0; cursor: pointer;
    }
    .k-style-val {
      flex: 0 0 30px; font-size: 10px; color: #4a90e2;
      text-align: right; font-family: monospace;
    }
  `,
      'gt-karaoke-style-ui'
    );

    this.karaokeContainer = container;

    const saved = this._loadKaraokeSettings();

    const fontRow = makeElement('div', { className: 'k-style-row' });
    const fontLabel = makeElement(
      'div',
      { className: 'k-style-label' },
      'Font'
    );
    const fontSelect = makeElement('select', { className: 'k-style-select' });

    const fonts = [
      {
        value: "'Architects Daughter', cursive, sans-serif",
        label: 'Architects Daughter',
      },
      { value: "'Arial', sans-serif", label: 'Arial' },
      { value: "'Georgia', serif", label: 'Georgia' },
      { value: "'Courier New', monospace", label: 'Courier New' },
      { value: "'Comic Sans MS', cursive", label: 'Comic Sans' },
      { value: "'Impact', sans-serif", label: 'Impact' },
      { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet' },
      { value: "'Verdana', sans-serif", label: 'Verdana' },
      { value: "'Palatino', serif", label: 'Palatino' },
    ];

    fonts.forEach((f) => {
      const opt = makeElement('option', { value: f.value }, f.label);
      if (saved.fontFamily === f.value) opt.selected = true;
      fontSelect.appendChild(opt);
    });

    fontSelect.onchange = () => {
      this._applyKaraokeSetting('fontFamily', fontSelect.value);
    };
    fontRow.append(fontLabel, fontSelect);

    const sizeRow = makeElement('div', { className: 'k-style-row' });
    const sizeLabel = makeElement(
      'div',
      { className: 'k-style-label' },
      'Size'
    );
    const sizeSlider = makeElement('input', {
      type: 'range',
      className: 'k-style-slider',
      min: 1.5,
      max: 6,
      step: 0.25,
      value: saved.fontSize || 3.5,
    });
    const sizeVal = makeElement(
      'div',
      { className: 'k-style-val' },
      (saved.fontSize || 3.5).toFixed(1)
    );

    sizeSlider.oninput = () => {
      const v = parseFloat(sizeSlider.value);
      sizeVal.textContent = v.toFixed(1);
      this._applyKaraokeSetting('fontSize', v);
    };
    sizeRow.append(sizeLabel, sizeSlider, sizeVal);

    const colorRow = makeElement('div', { className: 'k-style-row' });
    const colorLabel = makeElement(
      'div',
      { className: 'k-style-label' },
      'Colors'
    );

    const mkSwatch = (label, initialColor, settingKey) => {
      const wrap = makeElement('div', {
        style: 'display:flex; align-items:center; gap:4px;',
      });
      const lbl = makeElement(
        'span',
        {
          style: 'font-size:9px; color:#777;',
        },
        label
      );
      const swatch = makeElement('div', {
        className: 'k-style-swatch',
        style: { backgroundColor: initialColor },
      });

      swatch.onclick = (e) => {
        Promise.resolve({ ColorPicker: (typeof ColorPicker !== "undefined" ? ColorPicker : null) })
          .then(({ ColorPicker }) => {
            if (!ColorPicker) { console.warn("ColorPicker not loaded"); return; }
            new ColorPicker().openSmartPicker(
              e.target,
              swatch._currentColor || initialColor,
              (newColor) => {
                swatch.style.backgroundColor = newColor;
                swatch._currentColor = newColor;
                this._applyKaraokeSetting(settingKey, newColor);
              }
            );
          })
          .catch((err) => console.error('ColorPicker load error:', err));
      };

      swatch._currentColor = initialColor;
      wrap.append(lbl, swatch);
      return wrap;
    };

    const textSwatch = mkSwatch(
      'Text',
      saved.color || 'rgba(255,255,255,0.85)',
      'color'
    );
    const litSwatch = mkSwatch('Lit', saved.litColor || '#fff200', 'litColor');
    const glow1Swatch = mkSwatch(
      'Glow',
      saved.litGlow1 || '#ffae00',
      'litGlow1'
    );

    colorRow.append(colorLabel, textSwatch, litSwatch, glow1Swatch);

    const resetRow = makeElement('div', { className: 'k-style-row' });
    const resetBtn = makeElement(
      'button',
      {
        className: 'dialog-button',
        style: 'width:100%; font-size:10px; padding:5px;',
        onclick: () => {
          localStorage.removeItem('gt_karaoke_style');
          const defaults = {
            fontFamily: "'Architects Daughter', cursive, sans-serif",
            fontSize: 3.5,
            color: 'rgba(255, 255, 255, 0.85)',
            litColor: '#fff200',
            litGlow1: '#ffae00',
            litGlow2: '#ff4800',
          };
          const kd = this.player.gt?.karaokeDisplay;
          if (kd) kd.setStyle(defaults);
          container.innerHTML = '';
          this._buildKaraokeStyleControls(container);
        },
      },
      '↺ Reset to Defaults'
    );
    resetRow.append(resetBtn);

    container.append(fontRow, sizeRow, colorRow, resetRow);

    if (this.player.gt?.karaokeDisplay) {
      this.player.gt.karaokeDisplay.setStyle(saved);
    }
  }

  _loadKaraokeSettings() {
    try {
      const raw = localStorage.getItem('gt_karaoke_style');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      fontFamily: "'Architects Daughter', cursive, sans-serif",
      fontSize: 3.5,
      color: 'rgba(255, 255, 255, 0.85)',
      litColor: '#fff200',
      litGlow1: '#ffae00',
      litGlow2: '#ff4800',
    };
  }

  _applyKaraokeSetting(key, value) {
    const settings = this._loadKaraokeSettings();
    settings[key] = value;
    try {
      localStorage.setItem('gt_karaoke_style', JSON.stringify(settings));
    } catch (e) {}

    const kd = this.player.gt?.karaokeDisplay;
    if (kd) {
      kd.setStyle({ [key]: value });
    }
  }

  build3DDialogContent(container) {
      const app = this.player.piano3DApp;

      const btnRow = makeElement('div', {
        style: 'display:flex; gap:5px; margin-bottom:10px;',
      });
      btnRow.append(
        makeElement(
          'button',
          {
            className: 'dialog-button',
            style: 'flex:1',
            onclick: () => {
              app._resetToDefaults();
              container.innerHTML = '';
              this.build3DDialogContent(container);
            },
          },
          'Reset Defaults'
        ),
        makeElement(
          'button',
          {
            className: 'dialog-button primary',
            style: 'flex:1',
            onclick: () => app._copySettingsJSON(),
          },
          'Copy JSON'
        ),
        makeElement(
          'button',
          {
            className: 'dialog-button',
            style: 'flex:1',
            onclick: () => {
              const gs = this.player.gt?.pianoVisuals?.geometrySettings;
              if (app && gs) app.openAlignmentDialog(gs);
            },
          },
          '3D Align'
        )
      );
      container.appendChild(btnRow);

      const toggles = [
        {
          label: 'Orbit Mode',
          prop: 'orbitModeActive',
          updateFn: () => {
            if (app.app) app.app.enableOrbit(app.orbitModeActive);
            const pv = this.player.gt?.pianoVisuals;
            if (app.orbitModeActive) {
              if (pv?.flyingBars) pv.flyingBars.hide();
            } else {
              if (app.pivotControls) app.pivotControls.reset();
              if (pv?.flyingBars && !app.stealthMode) pv.flyingBars.show();
              if (app.app && app.app.camera) {
                app.app.camera.clearViewOffset();
              }
            }
            if (window.projectApp?.gt?.pianoVisuals?.geometrySettings) {
              app.alignTo2D(window.projectApp.gt.pianoVisuals.geometrySettings);
            }
          },
        },
        {
          label: 'Stealth Demo',
          prop: 'stealthMode',
          updateFn: () => {
            const pv = this.player.gt?.pianoVisuals;
            if (app.stealthMode) {
              if (pv?.flyingBars) {
                Object.values(pv.flyingBars.containerList).forEach((nc) => {
                  if (nc?.elems)
                    nc.elems.forEach((el) => {
                      if (el) el.style.display = 'none';
                    });
                });
              }
              if (app.visuals) app.visuals.turnOffAllNotes();
            } else {
              if (
                pv?.flyingBars &&
                !app.orbitModeActive &&
                this.player.state.settings.keyboardStyle !== 'none'
              ) {
                pv.flyingBars.show();
              }
            }
          },
        },
        { label: 'Single Key Mode', prop: 'singleKeyMode' },
        { label: 'Neon Glow Mode', prop: 'glowMode' },
        { label: 'Wireframe', prop: 'showOuterShape' },
        { label: 'Surface', prop: 'showSurface' },
        { label: 'Triangles', prop: 'showTriangles' },
        { label: 'Multi-Color', prop: 'coloredSurfaces' },
        {
          label: 'Grid',
          prop: 'showGrid',
          updateFn: () => {
            app.grid.visible = app.showGrid;
          },
        },
        { label: 'ID Tool', prop: 'showVertexMarkers' },
        { label: 'Hover Effect', prop: 'enableKeyHover' },
      ];

      const toggleCont = makeElement('div', {
        style:
          'display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #333;',
      });

      toggles.forEach((t) => {
        const lbl = makeElement('label', {
          style:
            'display:flex; align-items:center; font-size:10px; color:#ccc; cursor:pointer;',
        });
        const chk = makeElement('input', {
          type: 'checkbox',
          checked: !!app[t.prop],
        });
        chk.onchange = () => {
          app[t.prop] = chk.checked;
          if (t.updateFn) t.updateFn();
          else app._updateKeyGeometry();
        };
        lbl.append(
          chk,
          makeElement('span', { style: 'margin-left:5px' }, t.label)
        );
        toggleCont.append(lbl);
      });
      container.append(toggleCont);

      const swatchContainer = makeElement('div', {
        style:
          'margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #333; display:flex; gap:15px; justify-content:center;',
      });

      const mkSwatch = (label, getVal, setVal) => {
        const val = getVal();
        const wrapper = makeElement('div', {
          style: 'display:flex; align-items:center; gap:8px;',
        });
        wrapper.append(
          makeElement('span', { style: 'font-size:10px; color:#888' }, label)
        );
        const swatch = makeElement('div', {
          style: `width:20px; height:20px; background:${
            val || 'transparent'
          }; border:1px solid #555; border-radius:3px; cursor:pointer; box-shadow:0 0 4px rgba(0,0,0,0.5);`,
        });
        swatch.onclick = (e) => {
          Promise.resolve({ ColorPicker: (typeof ColorPicker !== "undefined" ? ColorPicker : null) })
            .then(({ ColorPicker }) => {
              new ColorPicker().openSmartPicker(e.target, getVal(), (newHex) => {
                swatch.style.background = newHex;
                setVal(newHex);
              });
            })
            .catch((err) => {
              console.error(err);
            });
        };
        wrapper.append(swatch);
        return wrapper;
      };

      swatchContainer.append(
        mkSwatch(
          'Key:',
          () => app.keyColor || '#000000',
          (c) => {
            app.keyColor = c;
            app.coloredSurfaces = false;
            app.visuals.setKeyColor(c);
            app._updateKeyGeometry();
          }
        )
      );
      swatchContainer.append(
        mkSwatch(
          'Background:',
          () => app.backgroundColor || '#1a0505',
          (c) => {
            app.backgroundColor = c;
            app._updateBackground();
          }
        )
      );
      container.appendChild(swatchContainer);

      const mkGroup = (l) =>
        container.appendChild(
          makeElement(
            'div',
            {
              style:
                'color:#4a90e2; font-size:9px; font-weight:700; margin:10px 0 4px 0; letter-spacing:1px;',
            },
            l
          )
        );

      const mkSet = (l, prop, min, max, step, def) => {
        return this._mkDialogSlider(
          l,
          () =>
            app?.dimensions && app.dimensions[prop] !== undefined
              ? app.dimensions[prop]
              : def,
          (v) => {
            if (app) app.setDimension(prop, v);
          },
          min,
          max,
          step
        );
      };

      const mkTransientSet = (l, prop, min, max, step, def) => {
        return this._mkDialogSlider(
          l,
          () => {
            if (app?.dimensions && app.dimensions[prop] !== undefined) return app.dimensions[prop];
            const gs = this.player.gt?.pianoVisuals?.geometrySettings;
            if (gs && gs[prop] !== undefined) return gs[prop];
            return def;
          },
          (v) => {
            if (app) app.setDimension(prop, v);
            const pv = this.player.gt?.pianoVisuals;
            if (pv && pv.geometrySettings) {
              pv.geometrySettings[prop] = v;
              pv.updateLayout();
              if (pv.actionBar && pv.actionBar.recalculateLayout) {
                const wPct = (pv.geometrySettings.customWidth || 100) / 100;
                pv.actionBar.recalculateLayout(pv.geometrySettings.w || window.innerWidth * wPct);
              }
              if (this.player.gt.videoPlayer && this.player.gt.videoPlayer.isReady) {
                const t = this.player.gt.videoPlayer.getAccurateTime().time * 1000;
                pv.setTime(t, 0, true);
              }
            }
          },
          min, max, step
        );
      };

      mkGroup('KEYBOARD LAYOUT');
      container.append(
        mkSet('Octaves', 'octaves', 1, 4, 1, 2),
        mkTransientSet('Key Spread', 'keyStretch', 50, 150, 0.1, 98.9),
        mkSet('W Width', 'whiteKeyWidth', 0.1, 2.0, 0.01, 1.12),
        mkSet('W Front Ext', 'whiteKeyLengthExtension', 0, 5.0, 0.01, 2.0),
        mkSet('W Height', 'whiteKeyHeight', 0.01, 1.5, 0.01, 0.14),
        mkSet('Key Gap', 'keyGap', 0, 0.2, 0.001, 0.04),
        mkSet('W Corner R', 'whiteCornerRadius', 0, 0.5, 0.01, 0.1),
        mkSet('W Bevel R', 'whiteBevelRadius', 0, 0.1, 0.001, 0.063),
        mkSet('B Y-Offset', 'blackKeyYOffset', -0.5, 1.0, 0.01, 0.0),
        mkSet('2-Clust Spr', 'cluster2Spread', -0.5, 0.5, 0.001, 0.112),
        mkSet('3-Clust Spr', 'cluster3Spread', -0.5, 0.5, 0.001, 0.173)
      );

      mkGroup('DIMENSIONS');
      container.append(
        mkSet('Base Width', 'baseWidth', 0.3, 1.5, 0.01, 0.66),
        mkSet('Base Length', 'baseLength', 2.0, 6.0, 0.01, 4.0),
        mkSet('Height', 'height', 0.2, 1.5, 0.01, 0.52)
      );

      mkGroup('TAPERS & RADII');
      container.append(
        mkSet('Front Taper', 'frontTaper', 0, 1.0, 0.001, 0.34),
        mkSet('Side Taper', 'sideTaper', 0, 0.5, 0.001, 0.1),
        mkSet('FrontBase R', 'frontBaseRadius', 0, 0.5, 0.001, 0.04),
        mkSet('TopSide R', 'topSideRadius', 0, 0.5, 0.001, 0.034),
        mkSet('FrontTop R', 'frontTopRadius', 0, 0.5, 0.001, 0.07),
        mkSet('TopCorner R', 'topCornerRadius', 0.01, 0.5, 0.001, 0.17),
        mkSet('SideCorner R', 'sideCornerRadius', 0.01, 0.5, 0.001, 0.27),
        mkSet('FrCorner R', 'frontCornerRadius', 0.01, 0.5, 0.001, 0.22)
      );

      mkGroup('SURFACE BULGE');
      container.append(
        mkSet('Top Inner', 'topBulgeInner', 0.1, 1.0, 0.001, 0.464),
        mkSet('Top Outer', 'topBulgeOuter', 0.1, 1.5, 0.001, 0.81),
        mkSet('Side Inner', 'sideBulgeInner', 0.1, 1.0, 0.001, 0.29),
        mkSet('Side Outer', 'sideBulgeOuter', 0.1, 1.5, 0.001, 0.6),
        mkSet('Front Inner', 'frontBulgeInner', 0.1, 1.0, 0.001, 0.53),
        mkSet('Front Outer', 'frontBulgeOuter', 0.1, 1.5, 0.001, 0.59)
      );

      mkGroup('TRIANGLE DETAIL');
      container.append(
        mkSet('Tri Bulge', 'triCenterBulge', -0.05, 0.1, 0.001, 0.035),
        mkSet('Shift X', 'triShiftX', -0.5, 0.5, 0.001, -0.007),
        mkSet('Shift Y', 'triShiftY', -0.5, 0.5, 0.001, -0.012),
        mkSet('Shift Z', 'triShiftZ', -0.5, 0.5, 0.001, -0.005)
      );
    }

}

