class MidiDiagnosticTool {
  constructor() {
    if (MidiDiagnosticTool.getInstance())
      return MidiDiagnosticTool.getInstance();
    MidiDiagnosticTool.setInstance(this);

    this.logs = [];
    this.maxLogs = 80;
    this.enabled = true;
    this.dialog = null;
    this.listEl = null;
    this.filter = 'all';

    this._injectStyles();
    this._hookSettingsWatchers();
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

  _instShort(name) {
    if (!name) return '???';
    const map = {
      Piano: 'Pno',
      Vibes: 'Vib',
      'Electric Guitar': 'EGr',
      'Wurlitzer EP': 'Wur',
      Marimba: 'Mar',
      'Steel Drum': 'Stl',
      Harp: 'Hrp',
      'Music Box': 'Box',
      'Choir Aahs': 'Chr',
    };
    return map[name] || name.substring(0, 3);
  }

  _nowTime() {
    const vp = window.projectApp?.gt?.videoPlayer;
    if (vp && vp.isReady) return vp.getCurrentRawTime().toFixed(1);
    return '-.--';
  }

  _getTransposeState() {
    const gt = window.projectApp?.gt;
    const inst = gt?.instruments;
    if (!inst) return null;
    return {
      globalTranspose: inst.globalTranspose,
      fileTranspose: gt.fileTranspose,
      userTranspose: gt.userTranspose,
      t0oct: inst.tracks?.[0]?.octaveShift || 0,
      t1oct: inst.tracks?.[1]?.octaveShift || 0,
      t0inst: inst.tracks?.[0]?.instrument || '?',
      t1inst: inst.tracks?.[1]?.instrument || '?',
    };
  }

  logNoteOn(id, data) {
    if (!this.enabled) return;

    const existing = this.logs.find((l) => l.id === id && l.active);
    if (existing) {
      existing.active = false;
      if (existing.dom) existing.dom.className = 'mdt-row off';
    }

    const transposeState = this._getTransposeState();

    const entry = {
      id,
      category: 'note',
      ...data,
      active: true,
      dom: null,
      transposeSnapshot: transposeState,
    };
    this._pushEntry(entry);
  }

  logNoteOff(id) {
    const entry = this.logs.find((l) => l.id === id && l.active);
    if (entry) {
      entry.active = false;
      if (entry.dom) {
        entry.dom.className = 'mdt-row off';
      }
    }
  }

  logSetting(label, detail) {
    if (!this.enabled) return;
    const entry = {
      id: 'set_' + Date.now(),
      category: 'setting',
      label,
      detail,
      active: false,
      dom: null,
    };
    this._pushEntry(entry);
  }

  logWarning(label, detail) {
    if (!this.enabled) return;
    const entry = {
      id: 'warn_' + Date.now(),
      category: 'warning',
      label,
      detail,
      active: false,
      dom: null,
    };
    this._pushEntry(entry);
  }

  logTransposeState(reason) {
    if (!this.enabled) return;
    const state = this._getTransposeState();
    if (!state) return;

    const detail =
      `gTr=${state.globalTranspose} file=${state.fileTranspose} user=${state.userTranspose} ` +
      `T0oct=${state.t0oct} T1oct=${state.t1oct} ` +
      `T0=${this._instShort(state.t0inst)} T1=${this._instShort(state.t1inst)}`;

    const entry = {
      id: 'tr_' + Date.now(),
      category: 'transpose',
      label: reason || 'snapshot',
      detail,
      active: false,
      dom: null,
    };
    this._pushEntry(entry);
  }

  _pushEntry(entry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      const removed = this.logs.shift();
      if (removed.dom) removed.dom.remove();
    }

    if (this.listEl && this._matchesFilter(entry)) {
      const row = this._renderRow(entry);
      entry.dom = row;
      this.listEl.appendChild(row);
      this.listEl.scrollTop = this.listEl.scrollHeight;
    }
  }

  _matchesFilter(entry) {
    if (this.filter === 'all') return true;
    return entry.category === this.filter;
  }

  _renderRow(entry) {
    if (entry.category === 'note') return this._renderNoteRow(entry);
    if (entry.category === 'setting') return this._renderSettingRow(entry);
    if (entry.category === 'warning') return this._renderWarningRow(entry);
    if (entry.category === 'transpose') return this._renderTransposeRow(entry);
    return makeElement('div', { className: 'mdt-row off' }, '???');
  }

  _renderNoteRow(entry) {
    const row = makeElement('div', {
      className: entry.active ? 'mdt-row on' : 'mdt-row off',
    });

    const src = entry.source === 'U' ? '🎹' : '🎵';
    const tr = entry.trackId === 1 ? 'B' : 'T';
    const vM = this._midiToName(entry.visualMidi);
    const pM =
      entry.playedMidi !== entry.visualMidi
        ? ` → ${this._midiToName(entry.playedMidi)}`
        : '';
    const inst = this._instShort(entry.instrument);
    const oct =
      entry.octaveShift !== 0
        ? ` oct${entry.octaveShift > 0 ? '+' : ''}${entry.octaveShift}`
        : '';

    const ts = entry.transposeSnapshot;
    let trInfo = '';
    if (
      ts &&
      (ts.globalTranspose !== 0 ||
        ts.fileTranspose !== 0 ||
        ts.userTranspose !== 0)
    ) {
      trInfo = ` [gTr=${ts.globalTranspose}]`;
    }

    row.innerHTML =
      `<span class="mdt-src">${src}</span>` +
      `<span class="mdt-time">${entry.time.toFixed(1)}s</span> ` +
      `<span class="mdt-track mdt-track-${tr}">${tr}</span> ` +
      `<span class="mdt-note">${vM}</span>` +
      `<span class="mdt-mapped">${pM}</span> ` +
      `<span class="mdt-inst">${inst}</span> ` +
      `<span class="mdt-vel">v${entry.velocity}</span>` +
      `<span class="mdt-oct">${oct}</span>` +
      `<span class="mdt-tr">${trInfo}</span>`;

    return row;
  }

  _renderSettingRow(entry) {
    const row = makeElement('div', { className: 'mdt-row setting' });
    row.innerHTML =
      `<span class="mdt-src">⚙️</span>` +
      `<span class="mdt-setting-label">${entry.label}</span> ` +
      `<span class="mdt-setting-val">${entry.detail}</span>`;
    return row;
  }

  _renderWarningRow(entry) {
    const row = makeElement('div', { className: 'mdt-row warning' });
    row.innerHTML =
      `<span class="mdt-src">⚠️</span>` +
      `<span class="mdt-warning-label">${entry.label}</span> ` +
      `<span class="mdt-warning-val">${entry.detail}</span>`;
    return row;
  }

  _renderTransposeRow(entry) {
    const row = makeElement('div', { className: 'mdt-row transpose' });
    row.innerHTML =
      `<span class="mdt-src">🔀</span>` +
      `<span class="mdt-tr-label">${entry.label}</span> ` +
      `<span class="mdt-tr-detail">${entry.detail}</span>`;
    return row;
  }

  _copyLogs() {
    const text = this.logs
      .map((l) => {
        if (l.category === 'note') {
          const src = l.source === 'U' ? 'USER' : 'AUTO';
          const tr = l.trackId === 1 ? 'B' : 'T';
          return `${src} ${l.time.toFixed(1)}s ${tr} ${this._midiToName(
            l.visualMidi
          )}→${this._midiToName(l.playedMidi)} ${this._instShort(
            l.instrument
          )} v${l.velocity} ${l.active ? '(on)' : '(off)'}`;
        }
        if (l.category === 'transpose')
          return `TRANSPOSE [${l.label}] ${l.detail}`;
        if (l.category === 'setting') return `SETTING [${l.label}] ${l.detail}`;
        if (l.category === 'warning') return `WARNING [${l.label}] ${l.detail}`;
        return '???';
      })
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      alert('Diagnostics copied to clipboard!');
    });
  }

  openDialog() {
    if (this.dialog) {
      if (typeof this.dialog.setZOnTop === 'function') {
        this.dialog.setZOnTop();
      }
      return;
    }

    const container = makeElement('div', {
      style:
        'display:flex; flex-direction:column; height:400px; padding:5px; background:#111;',
    });

    const toolbar = makeElement('div', {
      style:
        'display:flex; align-items:center; gap:6px; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #333; flex-wrap:wrap;',
    });

    const enableWrap = makeElement('label', {
      style:
        'display:flex; align-items:center; gap:4px; color:#ccc; font-size:10px; cursor:pointer;',
    });
    const enableChk = makeElement('input', {
      type: 'checkbox',
      checked: this.enabled,
    });
    enableChk.onchange = (e) => (this.enabled = e.target.checked);
    enableWrap.append(enableChk, makeElement('span', {}, 'Log'));

    const mkFilterBtn = (label, filterVal) => {
      const active = this.filter === filterVal;
      const btn = makeElement(
        'button',
        {
          className: 'mdt-filter-btn' + (active ? ' active' : ''),
          onclick: () => {
            this.filter = filterVal;
            this._refreshList();
            toolbar
              .querySelectorAll('.mdt-filter-btn')
              .forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
          },
        },
        label
      );
      return btn;
    };

    const filterAll = mkFilterBtn('All', 'all');
    const filterNotes = mkFilterBtn('🎵', 'note');
    const filterTr = mkFilterBtn('🔀', 'transpose');
    const filterSet = mkFilterBtn('⚙️', 'setting');
    const filterWarn = mkFilterBtn('⚠️', 'warning');

    const snapBtn = makeElement(
      'button',
      {
        className: 'mdt-action-btn',
        onclick: () => this.logTransposeState('manual snapshot'),
      },
      '📸 Snap'
    );

    const copyBtn = makeElement(
      'button',
      {
        className: 'mdt-action-btn',
        style: 'margin-left:auto;',
        onclick: () => this._copyLogs(),
      },
      '📋 Copy'
    );

    const clearBtn = makeElement(
      'button',
      {
        className: 'mdt-action-btn',
        onclick: () => {
          this.logs = [];
          this._refreshList();
        },
      },
      '🗑'
    );

    toolbar.append(
      enableWrap,
      filterAll,
      filterNotes,
      filterTr,
      filterSet,
      filterWarn,
      snapBtn,
      clearBtn,
      copyBtn
    );

    this.listEl = makeElement('div', {
      style:
        'flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:2px; font-family:"SF Mono",Consolas,Monaco,monospace; font-size:11px;',
    });

    this._refreshList();
    container.append(toolbar, this.listEl);

    const parentW = window.projectApp
      ? window.projectApp.getAppWidth()
      : window.innerWidth;
    const hostEnv = window.projectApp?.env || null; // Extract env from global app if present

    this.dialog =
      typeof UITools !== 'undefined'
        ? UITools.makeDialog({
            env: hostEnv, // Automatically binds UI to lifecycle
            title: 'MIDI Diagnostics',
            width: '520px',
            content: container,
            position: [Math.max(20, parentW - 560), 60],
            appendTo: window.projectApp
              ? window.projectApp.rootElement
              : document.body,
            onClose: () => {
              this.dialog = null;
              this.listEl = null;
            },
          })
        : null;
  }

  _updateFilterBtns(toolbar) {
    toolbar.querySelectorAll('.mdt-filter-btn').forEach((btn) => {
      const map = {
        All: 'all',
        '🎵': 'note',
        '🔀': 'transpose',
        '⚙️': 'setting',
        '⚠️': 'warning',
      };
      const val = map[btn.textContent] || 'all';
      if (val === this.filter) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  _refreshList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';
    this.logs.forEach((log) => {
      if (this._matchesFilter(log)) {
        const row = this._renderRow(log);
        log.dom = row;
        this.listEl.appendChild(row);
      }
    });
    this.listEl.scrollTop = this.listEl.scrollHeight;
  }

  _hookSettingsWatchers() {
    const self = this;

    const origSetTranspose = window.GlowTunesPlayer?.prototype?.setTranspose;
    if (origSetTranspose) {
      console.warn(
        '[MidiDiag] Cannot hook GlowTunesPlayer.setTranspose at construct time - will hook on first use.'
      );
    }

    this._patchInterval = setInterval(() => {
      const gt = window.projectApp?.gt;
      if (!gt) return;

      if (!gt._midiDiagPatched) {
        gt._midiDiagPatched = true;

        const origSetTranspose = gt.setTranspose.bind(gt);
        gt.setTranspose = function (semitones) {
          const before = self._getTransposeState();
          origSetTranspose(semitones);
          const after = self._getTransposeState();
          self.logSetting(
            'setTranspose',
            `input=${semitones} gTr: ${before?.globalTranspose}→${after?.globalTranspose} file=${after?.fileTranspose} user=${after?.userTranspose}`
          );
          self.logTransposeState('after setTranspose');
        };

        const origSyncSettings = gt.syncSettings.bind(gt);
        gt.syncSettings = async function (settings) {
          await origSyncSettings(settings);
          if (settings.transpose !== undefined) {
            self.logSetting(
              'syncSettings.transpose',
              `val=${settings.transpose}`
            );
          }
          if (settings.tracks) {
            settings.tracks.forEach((t, i) => {
              if (t) {
                self.logSetting(
                  `syncSettings.track[${i}]`,
                  `inst=${t.instrument || '?'} vol=${t.volume ?? '?'} oct=${
                    t.octaveShift ?? 0
                  }`
                );
              }
            });
          }
          self.logTransposeState('after syncSettings');
        };

        const inst = gt.instruments;
        if (inst) {
          const origSetTrackOctave = inst.setTrackOctave.bind(inst);
          inst.setTrackOctave = function (trackId, shift) {
            origSetTrackOctave(trackId, shift);
            self.logSetting('octaveShift', `track=${trackId} shift=${shift}`);
            self.logTransposeState('after octaveShift');
          };

          const origSetTrackInst = inst.setTrackInstrument.bind(inst);
          inst.setTrackInstrument = async function (trackId, instrumentName) {
            await origSetTrackInst(trackId, instrumentName);
            self.logSetting(
              'instrument',
              `track=${trackId} → ${instrumentName}`
            );
          };

          const origGlobalTranspose = inst.setTranspose.bind(inst);
          inst.setTranspose = function (semitones) {
            const old = inst.globalTranspose;
            origGlobalTranspose(semitones);
            self.logSetting(
              'inst.globalTranspose',
              `${old} → ${inst.globalTranspose} (input=${semitones})`
            );
          };
        }

        self.logTransposeState('initial patch');
      }
    }, 1000);
  }

  _injectStyles() {
    const css = `
        .mdt-row {
          padding: 3px 6px;
          border-radius: 3px;
          white-space: nowrap;
          line-height: 1.5;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mdt-row.on {
          background: rgba(74, 144, 226, 0.15);
          color: #7bb8ff;
        }
        .mdt-row.off {
          color: #888;
        }
        .mdt-row.setting {
          color: #aaddaa;
          background: rgba(80,180,80,0.06);
        }
        .mdt-row.warning {
          color: #ffaa55;
          background: rgba(255,170,85,0.08);
        }
        .mdt-row.transpose {
          color: #cc99ff;
          background: rgba(180,120,255,0.08);
        }
        .mdt-src { flex: 0 0 18px; text-align: center; }
        .mdt-time { color: #666; flex: 0 0 38px; text-align: right; }
        .mdt-track { font-weight: bold; flex: 0 0 12px; }
        .mdt-track-T { color: #6f6; }
        .mdt-track-B { color: #fa0; }
        .mdt-note { color: #fff; font-weight: bold; }
        .mdt-mapped { color: #ff6666; font-weight: bold; }
        .mdt-inst { color: #888; }
        .mdt-vel { color: #666; }
        .mdt-oct { color: #cc88ff; }
        .mdt-tr { color: #ff8888; font-size: 10px; }
        .mdt-setting-label { color: #8c8; font-weight: bold; }
        .mdt-setting-val { color: #aaa; }
        .mdt-warning-label { color: #fa0; font-weight: bold; }
        .mdt-warning-val { color: #ddd; }
        .mdt-tr-label { color: #b88aff; font-weight: bold; }
        .mdt-tr-detail { color: #aaa; font-size: 10px; }

        .mdt-filter-btn {
          background: #222;
          border: 1px solid #444;
          color: #888;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mdt-filter-btn:hover { background: #333; color: #ccc; }
        .mdt-filter-btn.active { background: #335; border-color: #4a90e2; color: #4a90e2; }

        .mdt-action-btn {
          background: #2a2a2a;
          border: 1px solid #444;
          color: #ccc;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          cursor: pointer;
        }
        .mdt-action-btn:hover { background: #444; color: #fff; }
      `;
    applyCss(css, 'midi-diag-styles');
  }

 

  static instance_state() {
    if (!this._state) this._state = { instance: null };
    return this._state;
  }

  static getInstance() {
    if (!this._instance) this._instance = null;
    return this._instance;
  }

  static setInstance(inst) {
    this._instance = inst;
  }
}