class SmartArpDiagnosticsUI {
    constructor(player) {
      this.player = player;
      this.dialog = null;
      this.viewerDialog = null;
      this.contentContainer = null;
      this.viewerContainer = null;
      this._didCss = false;
      this._viewerInterval = null;
    }

    open() {
      this._injectStyles();
      if (this.dialog) {
        if (typeof this.dialog.setZOnTop === 'function') {
          this.dialog.setZOnTop();
        }
        return;
      }

      this.contentContainer = makeElement('div', { className: 'sad-container' });

      this.dialog = UITools.makeDialog({
        env: this.player.env,
        title: 'Smart Arpeggiation Diagnostics',
        content: this.contentContainer,
        width: '560px',
        height: '520px',
        appendTo: this.player.rootElement,
        onClose: () => {
          this.dialog = null;
          this.contentContainer = null;
          localStorage.setItem('gt_smart_arp_diag_open', 'false');
          this.closeLiveViewer();
        }
      });

      localStorage.setItem('gt_smart_arp_diag_open', 'true');
      this.refresh();
    }

    refresh() {
      if (!this.dialog || !this.contentContainer) return;
      const container = this.contentContainer;
      container.innerHTML = '';

      const settings = this.player.state.settings;
      const veq = window.VideoEventQueueClass?.current;
      const notes = veq ? veq.timedEvents.filter(e => e.type === 'note') : [];
      const item = this.player.currentPlayItem;

      const header = makeElement('div', { className: 'sad-header' }, [
        makeElement('div', { className: 'title' }, `Active Song: ${item?.title || 'None'}`),
        makeElement('div', { className: 'stats' }, `${notes.length} notes | Arp: ${window.arpEnabled ? 'ACTIVE' : 'OFF'} | Split: ${settings.splitPitch || 60} (${VideoEventQueue.midiToNoteName(settings.splitPitch || 60)})`)
      ]);

      const controls = makeElement('div', { className: 'sad-controls' }, [
        this._createToggle('Auto-Arp Split', !!settings.smartAutoArp, (v) => {
          this.player.state.settings.smartAutoArp = v;
          this.player._saveSettings();
          this.refresh();
        }),
        this._createToggle('Verbose Logs', !!settings.smartAutoArpVerbose, (v) => {
          this.player.state.settings.smartAutoArpVerbose = v;
          this.player._saveSettings();
          this.refresh();
        })
      ]);

      const playground = this._buildPlaygroundPanel(veq);

      const analysisBox = makeElement('div', { className: 'sad-analysis-box' });
      this._runLiveAnalysis(analysisBox, veq, settings.smartAutoArpVerbose);

      const actions = makeElement('div', { className: 'sad-actions' }, [
        makeElement('button', {
          className: 'dialog-button',
          onclick: () => {
            if (item) {
              delete item.songSettings;
              delete item.startTime;
              delete item.endTime;
            }
            window.arpEnabled = false;
            this.player.state.settings.splitMethod = null;
            if (window.VideoEventQueueClass?.current?.timedEvents) {
              window.VideoEventQueueClass.current.timedEvents.forEach(e => {
                if (e.type === 'note') {
                  e.tr = 0;
                  delete e.chordId;
                  delete e.chordRank;
                }
              });
            }
            if (this.player.gt?.instruments) {
              this.player.gt.instruments.setVolume(1.0);
              this.player.gt.instruments.restoreTrackState([
                { instrument: 'Piano', volume: 5.0, octaveShift: 0 }
              ]);
            }
            if (this.player.gt?.pianoVisuals) {
              this.player.gt.pianoVisuals.loadVeq(window.VideoEventQueueClass.current);
            }
            this.player._refreshVisuals(true);
            this.player.playlistManager?.renderItems();
            this.player._saveState();
            this.player._sendSync();
            if (this.player.headerControlsUI) this.player.headerControlsUI.build();
            if (this.player.gt?.synchronizer) this.player.gt.synchronizer.resyncScheduler();
            this.refresh();
          }
        }, 'Wipe Song Settings'),
        makeElement('button', {
          className: 'dialog-button primary',
          onclick: () => {
            if (veq && notes.length >= 15) {
              const autoResult = VideoEventQueue.detectOptimalSplitAndChords(veq, true);
              if (autoResult) {
                const defaults = VideoEventQueue.getSmartArpDefaults();
                window.arpEnabled = true;
                window.arpGlobalSpread = defaults.arpSpread;
                window.arpPattern = defaults.arpPattern;
                window.arpAnchor = defaults.arpAnchor;
                window.arpGlobalLenFactor = defaults.arpLenFactor;
                this.player.state.settings.splitPitch = autoResult.splitPitch;
                this.player.pianoLogic.splitTracks('smart', autoResult.splitPitch, true);
                if (this.player.gt?.instruments) {
                  this.player.gt.instruments.setVolume(1.0);
                  this.player.gt.instruments.restoreTrackState([
                    { instrument: defaults.trebleInstrument, volume: defaults.trebleVolume, octaveShift: 0 },
                    { instrument: defaults.bassInstrument, volume: defaults.bassVolume, octaveShift: 0 }
                  ]);
                }
                if (this.player.gt?.pianoVisuals) {
                  this.player.gt.pianoVisuals.loadVeq(window.VideoEventQueueClass.current);
                }
                this.player._refreshVisuals(true);
                if (this.player.gt?.synchronizer) this.player.gt.synchronizer.resyncScheduler();
              }
            }
            this.refresh();
          }
        }, 'Auto-Detect & Split'),
        makeElement('button', {
          className: 'dialog-button primary',
          style: 'background-color: #9b59b6; border-color: #8e44ad;',
          onclick: () => this.openLiveViewer()
        }, '🔍 Open Live Note/Chord Viewer'),
        makeElement('button', {
          className: 'dialog-button',
          style: 'margin-left: auto;',
          onclick: () => {
            window.clearPlaylistSettings();
            this.refresh();
          }
        }, 'Wipe All Playlist Settings')
      ]);

      container.append(header, controls, playground, analysisBox, actions);
    }

    _createToggle(label, checked, onChange) {
      const lbl = makeElement('label', { className: 'sad-toggle-label' });
      const chk = makeElement('input', { type: 'checkbox', checked: checked });
      chk.onchange = () => onChange(chk.checked);
      lbl.append(chk, label);
      return lbl;
    }

    _runLiveAnalysis(target, veq, verbose) {
      if (!veq || !veq.timedEvents || veq.timedEvents.length === 0) {
        target.textContent = 'No active piano roll note events loaded.';
        return;
      }

      const notes = veq.timedEvents.filter(e => e.type === 'note');
      if (notes.length < 15) {
        target.innerHTML = `<div style="color:#ffaa00; font-family: monospace; font-size: 11px;">Skipped: Note density too low (${notes.length} notes < 15 minimum).</div>`;
        return;
      }

      const bassChords = VideoEventQueue.extractTrueChords(notes);

      if (bassChords.length === 0) {
        target.innerHTML = `<div style="color:#ff5555; font-family: monospace; font-size: 11px;">No bass chord clusters detected (average pitch < 65). Auto-split skipped.</div>`;
        return;
      }

      let maxChordNotePitch = -Infinity;
      let maxChordNoteTimeMs = 0;
      bassChords.forEach(c => {
        const maxPitch = Math.max(...c.map(n => n.mc));
        if (maxPitch > maxChordNotePitch) {
          maxChordNotePitch = maxPitch;
          const matchNote = c.find(n => n.mc === maxPitch);
          if (matchNote) maxChordNoteTimeMs = matchNote.t;
        }
      });

      const maxAllowedSplit = Math.max(42, Math.min(72, maxChordNotePitch + 1));
      const minAllowedSplit = Math.max(36, Math.min(60, maxChordNotePitch - 6));

      const scoringRows = [];
      let bestSplit = maxAllowedSplit;
      let maxScore = -Infinity;

      for (let P = minAllowedSplit; P <= maxAllowedSplit; P++) {
        const distToTarget = Math.abs(P - maxAllowedSplit);
        let score = 100 - distToTarget * 6;

        const distTo60 = Math.abs(P - 60);
        score -= distTo60 * 2;

        let intactCount = 0;
        let cutCount = 0;

        bassChords.forEach(chord => {
          const pitches = chord.map(n => n.mc);
          const minPitch = Math.min(...pitches);
          const maxPitch = Math.max(...pitches);

          if (maxPitch < P) {
            score += 20;
            intactCount++;
          } else if (minPitch < P && maxPitch >= P) {
            score -= 15;
            cutCount++;
          }
        });

        const bassNoteCount = notes.filter(n => n.mc < P).length;
        const trebleNoteCount = notes.filter(n => n.mc >= P).length;
        const balanceFactor = Math.abs(bassNoteCount - trebleNoteCount) / (notes.length || 1);
        score -= balanceFactor * 30;

        scoringRows.push({
          pitch: P,
          name: VideoEventQueue.midiToNoteName(P),
          score: score,
          intact: intactCount,
          cuts: cutCount,
          bassNotes: bassNoteCount,
          trebleNotes: trebleNoteCount
        });

        if (score > maxScore) {
          maxScore = score;
          bestSplit = P;
        }
      }

      const tableHeader = makeElement('tr', {}, [
        makeElement('th', {}, 'Pitch'),
        makeElement('th', {}, 'Score'),
        makeElement('th', {}, 'Intact'),
        makeElement('th', {}, 'Cuts'),
        makeElement('th', {}, 'Bass/Treb Notes')
      ]);

      const table = makeElement('table', { className: 'sad-table' }, tableHeader);

      scoringRows.forEach(r => {
        const isBest = r.pitch === bestSplit;
        const tr = makeElement('tr', {
          style: isBest ? 'background: rgba(46,204,113,0.18); font-weight: bold; color: #2ecc71;' : ''
        }, [
          makeElement('td', {}, `${r.name} (${r.pitch})`),
          makeElement('td', {}, r.score.toFixed(1)),
          makeElement('td', {}, r.intact),
          makeElement('td', {}, r.cuts),
          makeElement('td', {}, `${r.bassNotes}/${r.trebleNotes}`)
        ]);
        table.appendChild(tr);
      });

      const bestRow = scoringRows.find(r => r.pitch === bestSplit);
      const isSignificant = bestRow.intact >= 3 && (bestRow.intact / bassChords.length) >= 0.15;

      const m = Math.floor(maxChordNoteTimeMs / 60000);
      const s = Math.floor((maxChordNoteTimeMs % 60000) / 1000);
      const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

      const transposeOffset = this.player.gt?.transposeOffset || 0;

      const summary = makeElement('div', { className: 'sad-summary' }, [
        makeElement('div', {}, `Highest Chord Note: ${VideoEventQueue.midiToNoteName(maxChordNotePitch)} (${maxChordNotePitch}) at ${timeStr} [Transposed]`),
        makeElement('div', {}, `Optimal Split Point: ${VideoEventQueue.midiToNoteName(bestSplit)} (${bestSplit}) with Score ${maxScore.toFixed(1)}`),
        makeElement('div', {}, `Bass Chords Intact: ${bestRow.intact}/${bassChords.length} (${((bestRow.intact / bassChords.length)*100).toFixed(1)}%)`),
        makeElement('div', { style: 'color: #9b59b6; margin-top: 2px;' }, `Active Transpose Shift: ${transposeOffset > 0 ? '+' : ''}${transposeOffset} semitones`),
        makeElement('div', {
          style: `font-weight: bold; margin-top: 5px; color: ${isSignificant ? '#2ecc71' : '#ff5555'}`
        }, `Result: ${isSignificant ? 'SIGNIFICANT CHORDS DETECTED (Auto-Arp splitting active)' : 'NOT SIGNIFICANT (Single instrument playback)'}`)
      ]);

      const scrollWrap = makeElement('div', {
        style: 'flex: 1; overflow-y: auto; margin-top: 10px; border: 1px solid #333; background: #111; padding: 4px;'
      }, table);

      target.append(summary, scrollWrap);
    }

    _injectStyles() {
      if (this._didCss) return;
      this._didCss = true;
      applyCss(`
        .sad-container { display: flex; flex-direction: column; height: 100%; gap: 10px; }
        .sad-header { padding: 8px 10px; background: rgba(0,0,0,0.18); border-radius: 6px; border: 1px solid #333; }
        .sad-header .title { font-weight: bold; font-size: 13px; color: #fff; }
        .sad-header .stats { font-size: 11px; color: #888; margin-top: 2px; }
        .sad-controls { display: flex; gap: 15px; background: rgba(0,0,0,0.12); padding: 8px 12px; border-radius: 6px; }
        .sad-toggle-label { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #ccc; cursor: pointer; }
        .sad-toggle-label input { margin: 0; cursor: pointer; }
        .sad-analysis-box { flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 10px; border-radius: 6px; background: rgba(0,0,0,0.18); border: 1px solid #333; }
        .sad-summary { font-size: 11px; line-height: 1.45; color: #ddd; margin-bottom: 5px; }
        .sad-table { width: 100%; border-collapse: collapse; font-family: monospace; font-size: 11px; color: #aaa; }
        .sad-table th { text-align: left; padding: 4px 6px; border-bottom: 1px solid #444; color: #4a90e2; }
        .sad-table td { padding: 3px 6px; border-bottom: 1px solid #222; }
        .sad-actions { display: flex; gap: 10px; margin-top: auto; }
      `, 'smart-arp-diag-css');
    }

    _buildPlaygroundPanel(veq) {
      const panel = makeElement('div', {
        style: 'background: rgba(0,0,0,0.15); border: 1px solid #333; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 6px;'
      });

      const title = makeElement('div', {
        style: 'font-size: 10px; color: #4a90e2; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;'
      }, '🎮 Live Tweak Playground (No-Save)');

      const insts = this.player.gt?.instruments?.getAvailableInstruments() || ['Piano', 'Vibes', 'Chimes', 'Harp'];
      const curTracks = this.player.gt?.instruments?.tracks || [
        { instrument: 'Piano', volume: 5.0 },
        { instrument: 'Vibes', volume: 5.0 }
      ];

      const mkInstRow = (label, trackId, color) => {
        const curInst = curTracks[trackId]?.instrument || (trackId === 0 ? 'Piano' : 'Vibes');
        const curVol = curTracks[trackId]?.volume ?? 5.0;

        const row = makeElement('div', {
          style: 'display: flex; align-items: center; gap: 8px;'
        });

        const lbl = makeElement('span', {
          style: `font-size: 10px; color: ${color}; font-weight: bold; width: 45px;`
        }, label);

        const sel = makeElement('select', {
          style: 'background: #000; color: #fff; border: 1px solid #444; font-size: 10px; padding: 2px 4px; border-radius: 3px; cursor: pointer; width: 85px;'
        });
        insts.forEach(inst => {
          const opt = makeElement('option', { value: inst }, inst);
          if (inst === curInst) opt.selected = true;
          sel.appendChild(opt);
        });

        const sl = makeElement('input', {
          type: 'range',
          min: 0,
          max: 10,
          step: 0.1,
          value: curVol,
          style: `flex: 1; cursor: pointer; height: 3px; accent-color: ${color};`
        });

        const valDisp = makeElement('span', {
          style: 'font-size: 10px; color: #888; font-family: monospace; width: 20px; text-align: right;'
        }, curVol.toFixed(1));

        sel.onchange = () => {
          if (this.player.gt?.instruments) {
            this.player.gt.instruments.setTrackInstrument(trackId, sel.value);
            curTracks[trackId] = curTracks[trackId] || {};
            curTracks[trackId].instrument = sel.value;
          }
        };

        sl.oninput = () => {
          const v = parseFloat(sl.value);
          valDisp.textContent = v.toFixed(1);
          if (this.player.gt?.instruments) {
            this.player.gt.instruments.setTrackVolume(trackId, v);
            curTracks[trackId] = curTracks[trackId] || {};
            curTracks[trackId].volume = v;
          }
        };

        row.append(lbl, sel, sl, valDisp);
        return row;
      };

      const mkArpSlider = (label, val, min, max, step, color, onChange) => {
        const row = makeElement('div', { style: 'display: flex; align-items: center; gap: 8px;' });
        const lbl = makeElement('span', { style: `font-size: 10px; color: ${color}; font-weight: bold; width: 45px;` }, label);
        const sl = makeElement('input', {
          type: 'range',
          min,
          max,
          step,
          value: val,
          style: `flex: 1; cursor: pointer; height: 3px; accent-color: ${color};`
        });
        const valDisp = makeElement('span', {
          style: 'font-size: 10px; color: #888; font-family: monospace; width: 35px; text-align: right;'
        }, typeof val === 'number' ? val.toFixed(step < 1 ? 1 : 0) : val);

        sl.oninput = () => {
          const v = parseFloat(sl.value);
          valDisp.textContent = v.toFixed(step < 1 ? 1 : 0);
          onChange(v);
        };
        row.append(lbl, sl, valDisp);
        return row;
      };

      const splitRow = mkArpSlider('Split P.', this.player.state.settings.splitPitch || 60, 36, 84, 1, '#2980b9', (v) => {
        window.arpEnabled = true;
        this.player.state.settings.splitPitch = v;
        this.player.pianoLogic.splitTracks('smart', v, true);
        
        if (this.player.gt?.pianoVisuals) {
          this.player.gt.pianoVisuals.loadVeq(window.VideoEventQueueClass.current);
        }
        this.player._refreshVisuals(true);
        if (this.player.headerControlsUI) this.player.headerControlsUI.build();
        this.refresh();
      });

      const spreadRow = mkArpSlider('Spread', window.arpGlobalSpread || 0, 0, 400, 5, '#4a90e2', (v) => {
        window.arpEnabled = true;
        window.arpGlobalSpread = v;
        this.player._applyArpVisuals();
      });

      const anchorRow = mkArpSlider('Anchor', window.arpAnchor !== undefined ? window.arpAnchor : 0.8, 0, 1, 0.1, '#9b59b6', (v) => {
        window.arpEnabled = true;
        window.arpAnchor = v;
        this.player._applyArpVisuals();
      });

      panel.append(
        title,
        mkInstRow('Melody', 0, '#4f4'),
        mkInstRow('Backing', 1, '#fa0'),
        splitRow,
        spreadRow,
        anchorRow
      );

      return panel;
    }

    openLiveViewer() {
      if (this.viewerDialog) {
        if (typeof this.viewerDialog.setZOnTop === 'function') {
          this.viewerDialog.setZOnTop();
        }
        return;
      }

      this.viewerContainer = makeElement('div', {
        className: 'sad-viewer-container',
        style: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ccc',
          background: '#0a0a0a',
          padding: '8px',
          boxSizing: 'border-box'
        }
      });

      this.viewerListEl = makeElement('div', {
        style: 'flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px;'
      });

      const copyBtn = makeElement('button', {
        className: 'dialog-button primary',
        style: 'width: 100%; margin-top: 8px; font-weight: bold; font-family: sans-serif; height: 32px; flex-shrink: 0;',
        onclick: () => {
          if (this._lastViewerTextLines && this._lastViewerTextLines.length > 0) {
            const compiledText = this._lastViewerTextLines.join('\n');
            navigator.clipboard.writeText(compiledText).then(() => {
              copyBtn.textContent = '✓ Note List Copied!';
              setTimeout(() => {
                copyBtn.textContent = '📋 Copy Note List';
              }, 1500);
            });
          }
        }
      }, '📋 Copy Note List');

      this.viewerContainer.append(this.viewerListEl, copyBtn);

      this.viewerDialog = UITools.makeDialog({
        env: this.player.env,
        title: 'Smart Arp - Live Piano Roll Viewer',
        content: this.viewerContainer,
        width: '450px',
        height: '420px',
        position: [40, 60],
        appendTo: this.player.rootElement,
        onClose: () => {
          this.viewerDialog = null;
          this.viewerContainer = null;
          this.viewerListEl = null;
          this.closeLiveViewer();
        }
      });

      this.startLiveViewer();
    }

    startLiveViewer() {
      if (this._viewerInterval) clearInterval(this._viewerInterval);
      this._viewerInterval = setInterval(() => {
        this.refreshLiveViewer();
      }, 100);
    }

    closeLiveViewer() {
      if (this._viewerInterval) {
        clearInterval(this._viewerInterval);
        this._viewerInterval = null;
      }
      if (this.viewerDialog && typeof this.viewerDialog.close === 'function') {
        try {
          this.viewerDialog.close();
        } catch(e) {}
      }
    }

    refreshLiveViewer() {
      if (!this.viewerListEl) return;
      const list = this.viewerListEl;
      list.innerHTML = '';

      const veq = window.VideoEventQueueClass?.current;
      if (!veq || !veq.timedEvents) {
        list.textContent = 'No VEQ loaded.';
        return;
      }

      const player = window.projectApp;
      const currentSec = player?.gt?.videoPlayer?.getCurrentRawTime() || 0;
      const currentMs = currentSec * 1000;

      const minSec = currentSec - 5;
      const maxSec = currentSec + 5;

      const notes = veq.timedEvents.filter(e => e.type === 'note' && (e.t / 1000) >= minSec && (e.t / 1000) <= maxSec);

      if (notes.length === 0) {
        list.innerHTML = `<div style="color: #666; padding: 20px; text-align: center;">Waiting for active notes... (Playback at ${currentSec.toFixed(2)}s)</div>`;
        return;
      }

      const trueChords = VideoEventQueue.extractTrueChords(notes);

      const chordTimesMap = new Map();
      trueChords.forEach(c => {
        chordTimesMap.set(c[0].t, c);
      });

      const sorted = [...notes].sort((a, b) => a.t - b.t);
      const groups = [];
      if (sorted.length > 0) {
        let curGroup = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
          const n = sorted[i];
          if (Math.abs(n.t - curGroup[0].t) <= 10) {
            curGroup.push(n);
          } else {
            groups.push(curGroup);
            curGroup = [n];
          }
        }
        groups.push(curGroup);
      }

      const formatTimeSec = (tSec) => {
        const m = Math.floor(tSec / 60);
        const s = tSec % 60;
        return `${m}:${s.toFixed(2).padStart(5, '0')}`;
      };

      const textLinesBuffer = [];

      groups.forEach(group => {
        const tStart = group[0].t;
        const duration = group[0].d || 500;
        const tEnd = tStart + duration;

        const isCurrentlyPlaying = currentMs >= tStart && currentMs <= tEnd;
        const timeSpanStr = `${formatTimeSec(tStart / 1000)} - ${formatTimeSec(tEnd / 1000)}`;

        const row = makeElement('div', {
          style: {
            padding: '3px 6px',
            borderRadius: '4px',
            background: isCurrentlyPlaying ? 'rgba(46, 204, 113, 0.22)' : 'rgba(255,255,255,0.02)',
            border: isCurrentlyPlaying ? '1px solid #2ecc71' : '1px solid #222',
            color: isCurrentlyPlaying ? '#2ecc71' : '#ccc',
            fontSize: '11px',
            fontFamily: 'monospace',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        });

        const leftArea = makeElement('span');

        const trueChord = chordTimesMap.get(tStart);

        if (trueChord) {
          trueChord.sort((a, b) => a.mc - b.mc);
          const isArp = window.arpEnabled && trueChord.some(n => n.tr === 1 && n.chordRank !== undefined);
          const noteNames = trueChord.map(n => VideoEventQueue.midiToNoteName(n.mc)).join(', ');
          const pitches = trueChord.map(n => n.mc).join(',');
          
          leftArea.innerHTML = `<span style="color:#fa0">[Chord]</span> <b>${noteNames}</b> (Pitches: ${pitches}) | Arp: <span style="color: ${isArp ? '#2ecc71' : '#ff5555'}">${isArp ? 'YES' : 'NO'}</span>`;
          textLinesBuffer.push(`[Chord] ${noteNames} (Pitches: ${pitches}) | Arp: ${isArp ? 'YES' : 'NO'} | ${timeSpanStr}`);

          const nonChordNotes = group.filter(n => !trueChord.includes(n));
          if (nonChordNotes.length > 0) {
            nonChordNotes.forEach(n => {
              textLinesBuffer.push(`[Note] ${VideoEventQueue.midiToNoteName(n.mc)} (${n.mc}) | Track: ${n.tr === 1 ? '1 (Bass)' : '0 (Treble)'} | ${timeSpanStr} (Melody)`);
            });
          }
        } else {
          if (group.length === 1) {
            const n = group[0];
            leftArea.innerHTML = `<span style="color:#555">[Note]</span> <b>${VideoEventQueue.midiToNoteName(n.mc)}</b> (${n.mc}) | Track: ${n.tr === 1 ? '1 (Bass)' : '0 (Treble)'}`;
            textLinesBuffer.push(`[Note] ${VideoEventQueue.midiToNoteName(n.mc)} (${n.mc}) | Track: ${n.tr === 1 ? '1 (Bass)' : '0 (Treble)'} | ${timeSpanStr}`);
          } else {
            group.sort((a, b) => a.mc - b.mc);
            const noteNames = group.map(n => VideoEventQueue.midiToNoteName(n.mc)).join(', ');
            const pitches = group.map(n => n.mc).join(',');
            leftArea.innerHTML = `<span style="color:#888">[Group]</span> <b>${noteNames}</b> (Pitches: ${pitches}) | Track: Mixed`;
            textLinesBuffer.push(`[Group] ${noteNames} (Pitches: ${pitches}) | ${timeSpanStr}`);
          }
        }

        const rightArea = makeElement('span', {
          style: { color: isCurrentlyPlaying ? '#2ecc71' : '#666', fontSize: '10px' }
        }, timeSpanStr);

        row.append(leftArea, rightArea);
        list.appendChild(row);
      });

      this._lastViewerTextLines = textLinesBuffer;
    }
  }