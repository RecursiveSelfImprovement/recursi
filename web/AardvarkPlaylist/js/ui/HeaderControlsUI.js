
class HeaderControlsUI {

  constructor(player) {
    this.player = player;
  }

  build() {
    if (!this.player.headerControls) return;
    this.player.headerControls.innerHTML = '';

    const veqData = window.VideoEventQueueClass?.current;
    const hasNotes =
      veqData &&
      veqData.timedEvents &&
      veqData.timedEvents.some((e) => e.type === 'note');

    let hasTrack1 = false;
    if (hasNotes && veqData.timedEvents) {
      hasTrack1 = veqData.timedEvents.some(
        (e) => e.type === 'note' && e.tr === 1
      );
    }

    const splitActive =
      hasTrack1 ||
      window.arpEnabled ||
      !!this.player.currentPlayItem?.songSettings?.splitMethod;

    this._buildLibraryButton();

    if (!hasNotes) {
      if (hasNotes === false) {
        this._buildVideoVolumeOnly();
      }
      this.removeSplitClefRow();
      return;
    }

    this._buildCenterControls(splitActive);

    if (hasNotes && splitActive) {
      this.buildSplitClefRow();
    } else {
      this.removeSplitClefRow();
    }
  }

  _buildLibraryButton() {
    const isLibOpen =
      this.player.leftPanel.isOpen &&
      this.player.leftPanel.sections['playlist']?.element.open;

    const btn = makeElement(
      'button',
      {
        className: 'dialog-button',
        style: `padding:1px 5px; font-size:9px; background:${
          isLibOpen ? '#4a90e2' : '#222'
        }; color:${
          isLibOpen ? '#fff' : '#eee'
        }; border:1px solid #444; border-radius:3px; margin-right:auto;`,
        onclick: () => {
          if (
            this.player.leftPanel.isOpen &&
            this.player.leftPanel.sections['playlist']?.element.open
          ) {
            this.player.leftPanel.close();
          } else {
            this.player.leftPanel.open('playlist');
          }
          this.build();
        },
      },
      '☰'
    );
    this.player.headerControls.appendChild(btn);
  }

  _buildVideoVolumeOnly() {
    const container = makeElement('div', {
      style: 'display:flex; align-items:center; gap:6px;'
    });
    this._appendVideoVolumeControl(container);
    this.player.headerControls.appendChild(container);
  }

  _buildCenterControls(splitActive) {
    const center = makeElement('div', {
      style: 'display:flex; align-items:center; gap:6px;',
    });

    this._appendVideoVolumeControl(center);

    if (!splitActive) {
      this._appendSingleTrackControls(center);
    }

    this._appendAutoplayControl(center);

    // --- TRANSPOSE CONTROL ---
    this._appendTransposeControl(center);

    center.appendChild(
      makeElement('div', { style: 'width:1px; height:12px; background:#444;' })
    );

    this._appendSplitToggleButton(center, splitActive);
    this._appendSettingsGear(center);

    this.player.headerControls.appendChild(center);
  }

  _appendVideoVolumeControl(container) {
      let currentVol = this.player.state.settings.videoVolume ?? 100;
      
      if (this.player.gt && this.player.gt.videoPlayer && this.player.gt.videoPlayer.isReady) {
        currentVol = Math.round(this.player.gt.videoPlayer.getVolume());
        this.player.state.settings.videoVolume = currentVol;
      }
      
      this._lastTrackedVolume = currentVol;
      this.player._targetVolume = currentVol; // Curator: Initialize target volume tracker

      const vidVol = makeElement('input', {
        type: 'range',
        className: 'gt-video-vol-slider',
        min: 0,
        max: 100,
        value: currentVol,
        style: 'width:50px; height:3px; cursor:pointer; margin:0;',
        title: 'Video Volume',
      });
      
      vidVol.oninput = () => {
        const val = parseInt(vidVol.value, 10);
        
        // Curator: Lock the poller from running, and declare our active volume target
        this.player._volumeChangingLock = Date.now();
        this.player._targetVolume = val;
        this._lastTrackedVolume = val;

        if (typeof window.curatorLog === 'function') {
          window.curatorLog('Volume', `User manually adjusted volume slider to: ${val}%`);
        }
        
        this.player.gt?.setVideoVolume(val);
        this.player.state.settings.videoVolume = val;
        this.player._saveSettings();

        document.querySelectorAll('.gt-video-vol-slider').forEach(sl => {
          if (sl !== vidVol) sl.value = val;
        });
      };
      container.appendChild(vidVol);

      if (this.player._volPoll) clearInterval(this.player._volPoll);
      
      this.player._volPoll = setInterval(() => {
        if (this.player.gt && this.player.gt.videoPlayer && this.player.gt.videoPlayer.isReady) {
          const actualVol = Math.round(this.player.gt.videoPlayer.getVolume());
          
          const isUserSliding = Array.from(document.querySelectorAll('.gt-video-vol-slider')).some(sl => document.activeElement === sl);
          const isFading = this.player.playbackController && this.player.playbackController.isFadingOut;
          const isScriptMuted = this.player.gt._scriptMuted;
          
          // Curator: Strict 3-second recovery lock post manual volume changes
          const lastChangeTime = this.player._volumeChangingLock || 0;
          const isLocked = (Date.now() - lastChangeTime) < 3000;

          if (this.player._targetVolume !== undefined) {
            if (Math.abs(actualVol - this.player._targetVolume) <= 1) {
              this.player._targetVolume = undefined;
            }
          }

          if (actualVol !== this._lastTrackedVolume && !isUserSliding && !isScriptMuted && !isFading && !isLocked && this.player._targetVolume === undefined) {
            if (typeof window.curatorLog === 'function') {
              window.curatorLog('Volume', `Sync slider position to native YouTube player volume: ${actualVol}%`, {
                oldValue: this._lastTrackedVolume,
                newValue: actualVol
              });
            }
            
            this._lastTrackedVolume = actualVol;
            document.querySelectorAll('.gt-video-vol-slider').forEach(sl => {
              sl.value = actualVol;
            });
            
            this.player.state.settings.videoVolume = actualVol;
            this.player._saveSettings();
          }
        }
      }, 1000);
    }

  _appendSingleTrackControls(container) {
      container.appendChild(
        makeElement('div', {
          style: 'width:1px; height:12px; background:#444;',
        })
      );

      const instSel = makeElement('select', {
        style:
          'background:#111; color:#ddd; font-size:9px; padding:0 1px; border:1px solid #444; border-radius:3px; cursor:pointer; max-width:70px;',
      });
      const insts = this.player.gt?.instruments?.getAvailableInstruments() || [];
      let cur = 'Piano';
      try {
        cur = this.player.gt?.instruments?.tracks[0]?.instrument || 'Piano';
      } catch (e) {}

      insts.forEach((inst) => {
        const opt = makeElement('option', { value: inst }, inst);
        if (inst === cur) opt.selected = true;
        instSel.appendChild(opt);
      });
      instSel.onchange = (e) => {
        this.player.gt?.instruments?.setTrackInstrument(0, e.target.value);
        this.player.state.settings.tracks =
          this.player.state.settings.tracks || [];
        this.player.state.settings.tracks[0] =
          this.player.state.settings.tracks[0] || {};
        this.player.state.settings.tracks[0].instrument = e.target.value;
        
        // Correctly route to curator system
        this.player._updateSongSettings({
          tracks: this.player.gt?.instruments?.tracks,
        });
        
        this.player._saveSettings();
      };
      container.appendChild(instSel);

      let defaultVol = 5.0; // Standardized treble default
      try {
        defaultVol = this.player.gt?.instruments?.tracks[0]?.volume ?? 5.0;
      } catch (e) {}

      const instVol = makeElement('input', {
        type: 'range',
        min: 0,
        max: 10,
        step: 0.1,
        value: defaultVol,
        style: 'width:45px; height:3px; cursor:pointer; margin:0;',
        title: 'Instrument Volume',
      });
      instVol.oninput = () => {
        const v = parseFloat(instVol.value);
        this.player.gt?.instruments?.setTrackVolume(0, v);
        this.player.state.settings.tracks =
          this.player.state.settings.tracks || [];
        this.player.state.settings.tracks[0] =
          this.player.state.settings.tracks[0] || {};
        this.player.state.settings.tracks[0].volume = v;
        
        // Correctly route to curator system
        this.player._updateSongSettings({
          tracks: this.player.gt?.instruments?.tracks,
        });
        
        this.player._saveSettings();
      };
      container.appendChild(instVol);
      container.appendChild(this._createOctaveUI(0));
    }

  _appendAutoplayControl(container) {
    const autoWrap = makeElement('label', {
      style:
        'display:flex; align-items:center; gap:2px; font-size:8px; color:#aaa; cursor:pointer;',
    });
    const autoChk = makeElement('input', {
      type: 'checkbox',
      checked: this.player.state.settings.autoplay !== false,
      style: 'cursor:pointer; margin:0; width:11px; height:11px;',
    });
    autoChk.onchange = (e) => {
      this.player.state.settings.autoplay = e.target.checked;
      this.player.gt?.setAutoplay(e.target.checked);
      if (!e.target.checked) this.player.gt?.instruments?.stopAllNotes();
      this.player._saveSettings();
    };
    autoWrap.append(autoChk, makeElement('span', {}, 'Auto'));
    container.appendChild(autoWrap);
  }

  _appendSplitToggleButton(container, splitActive) {
    const splitBtn = makeElement(
      'button',
      {
        style: `padding:0 6px; font-size:13px; line-height:1; background:${
          splitActive ? '#1a2a1a' : '#222'
        }; color:${splitActive ? '#4f4' : '#888'}; border:1px solid ${
          splitActive ? '#4f4' : '#555'
        }; border-radius:3px; cursor:pointer; font-family:serif; letter-spacing:-1px; transition:all 0.15s;`,
        title: splitActive
          ? 'Tracks are split — click to merge'
          : 'Smart Split into treble + bass tracks',
        onclick: () => {
          if (splitActive) {
            if (!window.VideoEventQueueClass) return;
            window.VideoEventQueueClass.pushUndoState();
            window.VideoEventQueueClass.current.timedEvents.forEach((e) => {
              if (e.type === 'note') {
                e.tr = 0;
                delete e.chordId;
                delete e.chordRank;
              }
            });
            this.player._updateSongSettings({
              splitMethod: null,
              arpEnabled: false,
            });
            window.VideoEventQueueClass.notifySubscribers();
            this.player._refreshVisuals();
            this.build();
            if (
              this.player.leftPanelUI &&
              typeof this.player.leftPanelUI.refreshAudioUI === 'function'
            ) {
              this.player.leftPanelUI.refreshAudioUI();
            }
            if (this.player.gt?.synchronizer)
              this.player.gt.synchronizer.resyncScheduler();
            this.player.setStatus('Tracks merged.', '#4f4');
          } else {
            if (this.player.gt?.instruments) {
              const t0 = this.player.gt.instruments.tracks[0] || {
                instrument: 'Piano',
                volume: 5.0,
                octaveShift: 0,
              };
              this.player.gt.instruments.tracks[1] = {
                instrument: t0.instrument,
                volume: t0.volume,
                octaveShift: t0.octaveShift,
              };
            }
            this.player.pianoLogic.splitTracks(
              'smart',
              this.player.state.settings.splitPitch || 60
            );
            this.player._updateSongSettings({
              arpEnabled: true,
              arpSpread: 30,
              arpPattern: [0, 1, 2],
              splitMethod: 'smart',
              tracks: this.player.gt?.instruments?.tracks,
            });

            if (window.VideoEventQueueClass) {
              window.VideoEventQueueClass.findChords(false);
              window.VideoEventQueueClass.notifySubscribers();
            }
            this.player._refreshVisuals();
            this.build();
            if (
              this.player.leftPanelUI &&
              typeof this.player.leftPanelUI.refreshAudioUI === 'function'
            ) {
              this.player.leftPanelUI.refreshAudioUI();
            }
            if (this.player.gt?.synchronizer) {
              this.player.gt.synchronizer.resyncScheduler();
            }
            this.player.setStatus('Smart Split applied.', '#4f4');
          }
        },
      },
      '\u{1D122}\u{1D11E}'
    );
    container.appendChild(splitBtn);
  }

  _appendSettingsGear(container) {
      container.appendChild(
        makeElement(
          'button',
          {
            className: 'dialog-button',
            style:
              'padding:1px 3px; font-size:11px; background:transparent; border:none; color:#aaa; cursor:pointer;',
            onclick: (e) =>
              this.player._toggleQuickSettingsDropdown(e.currentTarget),
          },
          '⚙️'
        )
      );
    }

  buildSplitClefRow() {
    this.removeSplitClefRow();

    const dialogEl = this.player.videoDialog?.element;
    const dialogHeader = this.player.videoDialog?.header;
    if (!dialogEl || !dialogHeader) return;

    const insts = this.player.gt?.instruments?.getAvailableInstruments() || [];
    const arpOn = window.arpEnabled || false;

    const row = makeElement('div', {
      className: 'gt-split-clef-row',
      style: {
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: '5px 10px',
        background: 'linear-gradient(to bottom, #1e1e1e, #181818)',
        borderTop: '1px solid #333',
        borderBottom: '1px solid #222',
        userSelect: 'none',
        flexShrink: '0',
        overflow: 'hidden',
        gap: '40px',
      },
      onmousedown: (e) => e.stopPropagation(),
    });

    this._appendBassPanel(row, insts);
    this._appendArpCenterPanel(row, arpOn);
    this._appendTreblePanel(row, insts);

    dialogHeader.parentNode.insertBefore(row, dialogHeader.nextSibling);
    this.player._splitClefRow = row;
  }

  _appendBassPanel(row, insts) {
      const bassPanel = makeElement('div', {
        style:
          'display:flex; align-items:center; gap:8px; padding:4px 12px; border-right:1px solid #333; flex:0 0 auto;',
      });

      const bassGlyph = makeElement(
        'span',
        {
          style:
            'font-size:26px; line-height:1; font-family:serif; color:#fa0; opacity:0.9;',
          title: 'Bass / Backing',
        },
        '\u{1D122}'
      );

      const bassControls = makeElement('div', {
        style: 'display:flex; flex-direction:column; gap:4px;',
      });

      const inst1Sel = makeElement('select', {
        style:
          'background:#0a0a0a; color:#fa0; font-size:10px; padding:2px 4px; border:1px solid #3a3a3a; border-radius:3px; cursor:pointer; width:80px;',
      });
      let cur1 = 'Vibes';
      try {
        cur1 = this.player.gt?.instruments?.tracks[1]?.instrument || 'Vibes';
      } catch (e) {}

      insts.forEach((inst) => {
        const opt = makeElement('option', { value: inst }, inst);
        if (inst === cur1) opt.selected = true;
        inst1Sel.appendChild(opt);
      });
      inst1Sel.onchange = (e) => {
        this.player.gt?.instruments?.setTrackInstrument(1, e.target.value);
        this.player.state.settings.tracks =
          this.player.state.settings.tracks || [];
        this.player.state.settings.tracks[1] =
          this.player.state.settings.tracks[1] || {};
        this.player.state.settings.tracks[1].instrument = e.target.value;
        this.player._updateSongSettings({
          tracks: this.player.gt.instruments.tracks,
        });
        this.player._saveSettings();
      };

      const bottomRow = makeElement('div', {
        style: 'display:flex; align-items:center; gap:6px;',
      });

      const vol1Row = makeElement('div', {
        style: 'display:flex; align-items:center; gap:3px;',
      });

      let defaultVol1 = 3.0; // Standardized bass default (changed from 4.0)
      try {
        defaultVol1 = this.player.gt?.instruments?.tracks[1]?.volume ?? 3.0;
      } catch (e) {}

      const vol1Sl = makeElement('input', {
        type: 'range',
        min: '0',
        max: '10',
        step: '0.1',
        value: defaultVol1,
        style:
          'width:70px; height:3px; cursor:pointer; margin:0; accent-color:#fa0;',
        title: 'Backing Volume',
      });
      vol1Sl.oninput = () => {
        this.player.gt?.instruments?.setTrackVolume(1, parseFloat(vol1Sl.value));
        this.player.state.settings.tracks =
          this.player.state.settings.tracks || [];
        this.player.state.settings.tracks[1] =
          this.player.state.settings.tracks[1] || {};
        this.player.state.settings.tracks[1].volume = parseFloat(vol1Sl.value);
        this.player._updateSongSettings({
          tracks: this.player.gt.instruments.tracks,
        });
        this.player._saveSettings();
      };
      vol1Row.append(vol1Sl);

      bottomRow.append(vol1Row, this._createOctaveUI(1));
      bassControls.append(inst1Sel, bottomRow);

      bassPanel.append(bassGlyph, bassControls);
      row.append(bassPanel);
    }

  _appendArpCenterPanel(row, arpOn) {
      const centerPanel = makeElement('div', {
        style: 'display:flex; align-items:center; gap:10px; padding:2px 10px; flex:0 1 auto;',
      });

      const splitSel = makeElement('select', {
        style: 'background:#0a0a0a; color:#4a90e2; font-size:10px; padding:3px 6px; border:1px solid #444; border-radius:3px; cursor:pointer; font-family:monospace;',
        title: 'Split point',
      });
      const currentSplit = this.player.state.settings.splitPitch || 60;

      for (let mc = 36; mc <= 84; mc++) {
        const opt = makeElement(
          'option',
          { value: String(mc) },
          this.player._midiToName(mc)
        );
        if (mc === currentSplit) opt.selected = true;
        splitSel.appendChild(opt);
      }
      splitSel.onchange = (e) => {
        const val = parseInt(e.target.value);
        this.player.state.settings.splitPitch = val;
        this.player._saveSettings();
        this.player.pianoLogic.splitTracks(
          this.player.state.settings.splitMethod || 'smart',
          val
        );

        // Always commit the absolute un-transposed split pitch to curation settings
        const currentTranspose = this.player.gt?.transposeOffset || 0;
        const originalSplitPitch = val - currentTranspose;
        this.player._updateSongSettings({
          splitPitch: originalSplitPitch
        });
      };
      centerPanel.appendChild(splitSel);

      centerPanel.appendChild(
        makeElement('div', { style: 'width:1px; height:20px; background:#333;' })
      );

      const arpToggle = makeElement(
        'button',
        {
          style: `padding:3px 10px; font-size:10px; font-weight:bold; letter-spacing:0.5px; border-radius:10px; cursor:pointer; transition:all 0.15s; border:1px solid ${
            arpOn ? '#4a90e2' : '#444'
          }; background:${
            arpOn ? 'rgba(74,144,226,0.15)' : 'transparent'
          }; color:${arpOn ? '#4a90e2' : '#888'};`,
          title: 'Toggle Arpeggiator',
          onclick: () => {
            if (window.arpEnabled && window.VideoEventQueueClass) {
              window.VideoEventQueueClass.findChords(false);
            }
            window.arpEnabled = !window.arpEnabled;
            if (window.arpEnabled && window.VideoEventQueueClass) {
              window.VideoEventQueueClass.findChords(false);
            }
            this.player._updateSongSettings({ arpEnabled: window.arpEnabled });
            this.player._applyArpVisuals();
            this.player.headerControlsUI.buildSplitClefRow();
          },
        },
        'ARP'
      );
      centerPanel.appendChild(arpToggle);

      if (arpOn) {
        const arpBox = makeElement('div', {
          style: 'display:flex; align-items:center; gap:8px; padding:4px 10px; background:rgba(74,144,226,0.06); border:1px solid rgba(74,144,226,0.2); border-radius:4px;',
        });

        const patSel = makeElement('select', {
          style: 'background:#0a0a0a; color:#fff; font-size:14px; padding:1px 4px; border:1px solid #444; border-radius:3px; cursor:pointer; width:38px; text-align:center; line-height:1;',
          title: 'Pattern direction',
        });
        [
          { l: '↑', v: '[0,1,2]' },
          { l: '↓', v: '[2,1,0]' },
          { l: '↕', v: '[0,2,1]' },
          { l: '⇄', v: '[1,0,2]' },
        ].forEach((p) => {
          const opt = makeElement('option', { value: p.v }, p.l);
          if (JSON.stringify(window.arpPattern) === p.v) opt.selected = true;
          patSel.appendChild(opt);
        });
        
        patSel.onchange = (e) => {
          window.arpEnabled = true;
          window.arpPattern = JSON.parse(e.target.value);
          if (window.VideoEventQueueClass) window.VideoEventQueueClass.findChords(false);
          this.player._updateSongSettings({ arpEnabled: true, arpPattern: window.arpPattern });
          this.player._applyArpVisuals();
        };

        const mkMiniSlider = (label, val, min, max, step, color, onInput) => {
          const wrap = makeElement('div', {
            style: 'display:flex; flex-direction:column; align-items:center; gap:5px; padding:0 8px;',
          });
          const lbl = makeElement(
            'div',
            {
              style: `font-size:9px; color:${color}; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; line-height:1;`,
            },
            label
          );
          const sl = makeElement('input', {
            type: 'range',
            min,
            max,
            step,
            value: val,
            style: `width:60px; height:4px; cursor:pointer; margin:0; accent-color:${color};`,
          });
          sl.oninput = () => onInput(parseFloat(sl.value));
          wrap.append(lbl, sl);
          return wrap;
        };

        arpBox.append(
          patSel,
          mkMiniSlider(
            'Spread',
            window.arpGlobalSpread || 0,
            '0',
            '400',
            '10',
            '#4a90e2',
            (v) => {
              window.arpEnabled = true;
              window.arpGlobalSpread = v;
              if (window.VideoEventQueueClass) window.VideoEventQueueClass.findChords(false);
              this.player._updateSongSettings({ arpEnabled: true, arpSpread: v });
              this.player._applyArpVisuals();
            }
          ),
          mkMiniSlider(
            'Anchor',
            window.arpAnchor !== undefined ? window.arpAnchor : 0.8,
            '0',
            '1',
            '0.1',
            '#9b59b6',
            (v) => {
              window.arpEnabled = true;
              window.arpAnchor = v;
              if (window.VideoEventQueueClass) window.VideoEventQueueClass.findChords(false);
              this.player._updateSongSettings({ arpEnabled: true, arpAnchor: v });
              this.player._applyArpVisuals();
            }
          ),
          mkMiniSlider(
            'Length',
            window.arpGlobalLenFactor || 1.0,
            '0.1',
            '1.5',
            '0.05',
            '#27ae60',
            (v) => {
              window.arpEnabled = true;
              window.arpGlobalLenFactor = v;
              if (window.VideoEventQueueClass) window.VideoEventQueueClass.findChords(false);
              this.player._updateSongSettings({ arpEnabled: true, arpLen: v });
              this.player._applyArpVisuals();
            }
          )
        );

        centerPanel.appendChild(arpBox);
      }
      row.append(centerPanel);
    }

  _appendTreblePanel(row, insts) {
      const treblePanel = makeElement('div', {
        style:
          'display:flex; align-items:center; gap:8px; padding:4px 12px; border-left:1px solid #333; flex:0 0 auto;',
      });

      const trebleControls = makeElement('div', {
        style: 'display:flex; flex-direction:column; gap:4px;',
      });

      const inst0Sel = makeElement('select', {
        style:
          'background:#0a0a0a; color:#4f4; font-size:10px; padding:2px 4px; border:1px solid #3a3a3a; border-radius:3px; cursor:pointer; width:80px;',
      });
      let cur0 = 'Piano';
      try {
        cur0 = this.player.gt?.instruments?.tracks[0]?.instrument || 'Piano';
      } catch (e) {}

      insts.forEach((inst) => {
        const opt = makeElement('option', { value: inst }, inst);
        if (inst === cur0) opt.selected = true;
        inst0Sel.appendChild(opt);
      });
      inst0Sel.onchange = (e) => {
        this.player.gt?.instruments?.setTrackInstrument(0, e.target.value);
        this.player.state.settings.tracks =
          this.player.state.settings.tracks || [];
        this.player.state.settings.tracks[0] =
          this.player.state.settings.tracks[0] || {};
        this.player.state.settings.tracks[0].instrument = e.target.value;
        this.player._updateSongSettings({
          tracks: this.player.gt.instruments.tracks,
        });
        this.player._saveSettings();
      };

      const bottomRow = makeElement('div', {
        style: 'display:flex; align-items:center; gap:6px;',
      });

      const vol0Row = makeElement('div', {
        style: 'display:flex; align-items:center; gap:3px;',
      });

      let defaultVol0 = 5.0; // Standardized treble default (changed from 8.0)
      try {
        defaultVol0 = this.player.gt?.instruments?.tracks[0]?.volume ?? 5.0;
      } catch (e) {}

      const vol0Sl = makeElement('input', {
        type: 'range',
        min: '0',
        max: '10',
        step: '0.1',
        value: defaultVol0,
        style:
          'width:70px; height:3px; cursor:pointer; margin:0; accent-color:#4f4;',
        title: 'Melody Volume',
      });
      vol0Sl.oninput = () => {
        this.player.gt?.instruments?.setTrackVolume(0, parseFloat(vol0Sl.value));
        this.player.state.settings.tracks =
          this.player.state.settings.tracks || [];
        this.player.state.settings.tracks[0] =
          this.player.state.settings.tracks[0] || {};
        this.player.state.settings.tracks[0].volume = parseFloat(vol0Sl.value);
        this.player._updateSongSettings({
          tracks: this.player.gt.instruments.tracks,
        });
        this.player._saveSettings();
      };
      vol0Row.append(vol0Sl);
      bottomRow.append(vol0Row, this._createOctaveUI(0));

      trebleControls.append(inst0Sel, bottomRow);

      const trebleGlyph = makeElement(
        'span',
        {
          style:
            'font-size:28px; line-height:1; font-family:serif; color:#4f4; opacity:0.9;',
          title: 'Treble / Melody',
        },
        '\u{1D11E}'
      );

      treblePanel.append(trebleControls, trebleGlyph);
      row.append(treblePanel);
    }

  removeSplitClefRow() {
    if (this.player._splitClefRow) {
      this.player._splitClefRow.remove();
      this.player._splitClefRow = null;
    }
  }

  _appendTransposeControl(container) {
      container.appendChild(
        makeElement('div', { style: 'width:1px; height:12px; background:#444;' })
      );

      const wrap = makeElement('div', {
        style: 'display:flex; align-items:center; gap:3px;',
        title: 'Transpose (Semitones)',
      });

      wrap.appendChild(
        makeElement(
          'span',
          {
            style:
              'font-size:8px; color:#aaa; font-weight:bold; letter-spacing:0.5px;',
          },
          'TR'
        )
      );

      const valEl = makeElement('div', {
        style:
          'font-size:9px; color:#4a90e2; font-family:monospace; width:16px; text-align:right;',
      });

      const currentOffset =
        this.player.gt?.transposeOffset ??
        this.player.state.settings.transpose ??
        0;

      const sl = makeElement('input', {
        type: 'range',
        min: -12,
        max: 12,
        step: 1,
        value: currentOffset,
        style: 'width:80px; height:4px; cursor:pointer; margin:0;',
      });

      const updateVal = (v) => {
        valEl.textContent = (v > 0 ? '+' : '') + v;
      };
      updateVal(sl.value);

      sl.oninput = () => {
        const v = parseInt(sl.value);
        updateVal(v);
        this.player.state.settings.transpose = v;
        this.player.gt?.setTranspose(v);

        // Commit ONLY transpose (splitPitch remains un-transposed in curation)
        this.player._updateSongSettings({
          transpose: v
        });
        this.player._saveSettings();

        const splitSel = this.player._splitClefRow?.querySelector(
          'select[title="Split point"]'
        );
        if (splitSel)
          splitSel.value = String(this.player.state.settings.splitPitch);
      };

      wrap.append(sl, valEl);
      container.appendChild(wrap);
    }

  buildFullscreenToolbar(container) {
    const veqData = window.VideoEventQueueClass?.current;
    const hasNotes =
      veqData &&
      veqData.timedEvents &&
      veqData.timedEvents.some((e) => e.type === 'note');
    let hasTrack1 = false;
    if (hasNotes && veqData.timedEvents) {
      hasTrack1 = veqData.timedEvents.some(
        (e) => e.type === 'note' && e.tr === 1
      );
    }

    const splitActive =
      hasTrack1 ||
      window.arpEnabled ||
      !!this.player.currentPlayItem?.songSettings?.splitMethod;

    if (!hasNotes) {
      this._appendVideoVolumeControl(container);
      return;
    }

    this._appendVideoVolumeControl(container);

    container.appendChild(
      makeElement('div', {
        style: 'width:1px; height:14px; background:#444;',
      })
    );

    if (!splitActive) {
      this._appendSingleTrackControls(container);
    }

    this._appendAutoplayControl(container);
    this._appendTransposeControl(container);

    container.appendChild(
      makeElement('div', {
        style: 'width:1px; height:14px; background:#444;',
      })
    );

    this._appendSplitToggleButton(container, splitActive);
    this._appendSettingsGear(container);
  }

  _createOctaveUI(trackId) {
    const wrap = makeElement('div', {
      style: 'display:flex; align-items:center; gap:2px; margin-left:4px;',
    });

    let shiftVal = 0;
    if (
      this.player.gt &&
      this.player.gt.instruments &&
      this.player.gt.instruments.tracks &&
      this.player.gt.instruments.tracks[trackId]
    ) {
      shiftVal = this.player.gt.instruments.tracks[trackId].octaveShift || 0;
    }

    const lbl = makeElement(
      'span',
      { style: 'font-size:9px; color:#aaa; width:28px; text-align:center;' },
      `Oct:${shiftVal > 0 ? '+' : ''}${shiftVal}`
    );

    const updateShift = (delta) => {
      let shift = 0;
      if (
        this.player.gt &&
        this.player.gt.instruments &&
        this.player.gt.instruments.tracks &&
        this.player.gt.instruments.tracks[trackId]
      ) {
        shift = this.player.gt.instruments.tracks[trackId].octaveShift || 0;
      }
      shift += delta;

      if (this.player.gt && this.player.gt.instruments) {
        this.player.gt.instruments.setTrackOctave(trackId, shift);
      }

      this.player.state.settings.tracks =
        this.player.state.settings.tracks || [];
      this.player.state.settings.tracks[trackId] =
        this.player.state.settings.tracks[trackId] || {};
      this.player.state.settings.tracks[trackId].octaveShift = shift;

      if (this.player.gt && this.player.gt.instruments) {
        this.player._updateSongSettings({
          tracks: this.player.gt.instruments.tracks,
        });
      }
      this.player._saveSettings();
      lbl.textContent = `Oct:${shift > 0 ? '+' : ''}${shift}`;
    };

    const minus = makeElement(
      'button',
      {
        className: 'dialog-button',
        style: 'padding:1px 4px; font-size:9px;',
        onclick: () => updateShift(-1),
      },
      '-'
    );
    const plus = makeElement(
      'button',
      {
        className: 'dialog-button',
        style: 'padding:1px 4px; font-size:9px;',
        onclick: () => updateShift(1),
      },
      '+'
    );

    wrap.append(minus, lbl, plus);
    return wrap;
  }

  _appendTransposeControl(container) {
    container.appendChild(
      makeElement('div', { style: 'width:1px; height:12px; background:#444;' })
    );

    const wrap = makeElement('div', {
      style: 'display:flex; align-items:center; gap:3px;',
      title: 'Transpose (Semitones)',
    });

    wrap.appendChild(
      makeElement(
        'span',
        {
          style:
            'font-size:8px; color:#aaa; font-weight:bold; letter-spacing:0.5px;',
        },
        'TR'
      )
    );

    const valEl = makeElement('div', {
      style:
        'font-size:9px; color:#4a90e2; font-family:monospace; width:16px; text-align:right;',
    });

    const currentOffset =
      this.player.gt?.transposeOffset ??
      this.player.state.settings.transpose ??
      0;

    const sl = makeElement('input', {
      type: 'range',
      min: -12,
      max: 12,
      step: 1,
      value: currentOffset,
      style: 'width:80px; height:4px; cursor:pointer; margin:0;',
    });

    const updateVal = (v) => {
      valEl.textContent = (v > 0 ? '+' : '') + v;
    };
    updateVal(sl.value);

    sl.oninput = () => {
      const v = parseInt(sl.value);
      updateVal(v);
      this.player.state.settings.transpose = v;
      this.player.gt?.setTranspose(v);

      this.player._updateSongSettings({
        transpose: v,
        splitPitch: this.player.state.settings.splitPitch,
      });
      this.player._saveSettings();

      // CLEANUP: Target the select within the specific dialog DOM node instead of standard querySelector
      // which is fragile if multiple controls render.
      const splitSel = this.player._splitClefRow?.querySelector(
        'select[title="Split point"]'
      );
      if (splitSel)
        splitSel.value = String(this.player.state.settings.splitPitch);
    };

    wrap.append(sl, valEl);
    container.appendChild(wrap);
  }

  _appendDisplayModeControl(container) {
    // Intentionally left blank. The Piano Style dropdown has been removed
    // from the header controls and moved to the Options Key Command menu.
  }
}

