
class AccuDrawDiagnostics {
  constructor(baseController) {
    this.baseController = baseController;
    this.dialog = null;
    this.contentEl = null;
    this.isVisible = false;
    this._lastSnapshot = '';
    this._historyLines = [];
    this._maxHistory = 40;
    this._eventLog = [];
    this._maxEventLog = 25;
    this._injectStyles();
  }

  _injectStyles() {
    const css = `
      .ad-diag-wrap {
        font-family: 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.4;
        color: #ccc;
        user-select: text;
        cursor: text;
      }
      .ad-diag-section {
        margin-bottom: 6px;
        padding: 4px 6px;
        background: rgba(0,0,0,0.3);
        border-radius: 3px;
        border-left: 3px solid #555;
      }
      .ad-diag-section.state { border-left-color: #4af; }
      .ad-diag-section.visual { border-left-color: #fa4; }
      .ad-diag-section.events { border-left-color: #4f4; }
      .ad-diag-section.history { border-left-color: #a4f; }
      .ad-diag-label {
        font-weight: bold;
        color: #fff;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 2px;
      }
      .ad-diag-row {
        display: flex;
        justify-content: space-between;
        padding: 1px 0;
      }
      .ad-diag-key { color: #888; }
      .ad-diag-val { color: #eee; text-align: right; }
      .ad-diag-val.active { color: #ff0; font-weight: bold; }
      .ad-diag-val.locked { color: #f44; font-weight: bold; }
      .ad-diag-val.on { color: #4f4; }
      .ad-diag-val.off { color: #666; }
      .ad-diag-event-line {
        padding: 1px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ad-diag-event-line .timestamp { color: #666; margin-right: 6px; }
      .ad-diag-event-line .action { color: #4f4; }
      .ad-diag-event-line .detail { color: #aaa; }
      .ad-diag-copy-btn {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: #ccc;
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
        margin: 2px;
      }
      .ad-diag-copy-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
    `;
    applyCss(css, 'accudraw-diagnostics-styles');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    if (!this.dialog) {
      this._createDialog();
    }
    this.dialog.element.style.display = 'block';
    this.isVisible = true;
    this._startUpdateLoop();
  }

  hide() {
    if (this.dialog) {
      this.dialog.element.style.display = 'none';
    }
    this.isVisible = false;
  }

  _createDialog() {
      const hostContainer = this.baseController?.domElement?.parentElement || document.body;
      const parentWidth = hostContainer.clientWidth || window.innerWidth;

      this.contentEl = makeElement('div', { className: 'ad-diag-wrap' });

      const toolbar = makeElement('div', {
        style: { marginBottom: '4px', display: 'flex', gap: '4px' },
      });

      const copyStateBtn = makeElement('button', {
          className: 'ad-diag-copy-btn',
          onclick: () => this._copyToClipboard('state'),
        }, 'Copy State');

      const copyLogBtn = makeElement('button', {
          className: 'ad-diag-copy-btn',
          onclick: () => this._copyToClipboard('log'),
        }, 'Copy Log');

      const clearBtn = makeElement('button', {
          className: 'ad-diag-copy-btn',
          onclick: () => {
            this._eventLog = [];
            this._historyLines = [];
          },
        }, 'Clear');

      toolbar.appendChild(copyStateBtn);
      toolbar.appendChild(copyLogBtn);
      toolbar.appendChild(clearBtn);

      this.stateSection = makeElement('div', { className: 'ad-diag-section state' });
      this.visualSection = makeElement('div', { className: 'ad-diag-section visual' });
      this.eventsSection = makeElement('div', { className: 'ad-diag-section events' });
      this.historySection = makeElement('div', { className: 'ad-diag-section history' });

      const wrap = makeElement('div');
      wrap.appendChild(toolbar);
      wrap.appendChild(this.stateSection);
      wrap.appendChild(this.visualSection);
      wrap.appendChild(this.eventsSection);
      wrap.appendChild(this.historySection);
      this.contentEl.appendChild(wrap);

      this.dialog = UITools.makeDialog({
        stateId: 'accuCad-diagnostics',
        title: 'AccuDraw Diagnostics',
        width: '340px',
        height: '500px',
        position: [parentWidth - 360, 80],
        content: this.contentEl,
        transparent: true,
        allowMaximize: true,
        noPadding: true,
        appendTo: hostContainer,
      });

      this.dialog.contentElement.style.overflow = 'auto';
      this.dialog.contentElement.style.padding = '6px';
    }

  logEvent(action, detail) {
    const now = performance.now();
    const ts = (now / 1000).toFixed(2);
    this._eventLog.unshift({ ts, action, detail: detail || '' });
    if (this._eventLog.length > this._maxEventLog) {
      this._eventLog.length = this._maxEventLog;
    }
  }

  _startUpdateLoop() {
    const update = () => {
      if (!this.isVisible) return;
      this._render();
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  _render() {
    const bc = this.baseController;
    const logic = bc ? bc.accuDrawLogic : null;
    const ad = bc ? bc.accuDraw : null;

    const fmt = (v) => (typeof v === 'number' ? v.toFixed(4) : String(v));
    const boolClass = (v) => (v ? 'on' : 'off');
    const boolStr = (v) => (v ? 'YES' : 'no');

    // === STATE SECTION ===
    let stateHtml =
      '<div class="ad-diag-label">Logic State <span style="color:#666;font-weight:normal;text-transform:none">frame ' +
      this._frameCount +
      '</span></div>';

    if (logic) {
      stateHtml += this._row('mode', logic.mode);
      stateHtml += this._row('currentAxis', logic.currentAxis, 'active');
      stateHtml += this._row(
        'inputActive',
        boolStr(logic.inputActive),
        boolClass(logic.inputActive)
      );
      stateHtml += this._row(
        'inputBuffer',
        logic.inputBuffer ? '"' + logic.inputBuffer + '"' : '(empty)'
      );
      stateHtml += this._row(
        'stickyFocus',
        boolStr(logic.stickyFocus),
        boolClass(logic.stickyFocus)
      );
      stateHtml += this._row(
        'typingAnchor',
        logic.typingMouseAnchor ? 'set' : 'null',
        boolClass(logic.typingMouseAnchor)
      );

      stateHtml += '<div style="margin-top:4px"></div>';
      stateHtml += this._row(
        'lock.x',
        boolStr(logic.isLocked.x) +
          (logic.isLocked.x ? ' = ' + fmt(logic.lockedValues.x) : ''),
        logic.isLocked.x ? 'locked' : 'off'
      );
      stateHtml += this._row(
        'lock.y',
        boolStr(logic.isLocked.y) +
          (logic.isLocked.y ? ' = ' + fmt(logic.lockedValues.y) : ''),
        logic.isLocked.y ? 'locked' : 'off'
      );
      stateHtml += this._row(
        'lock.z',
        boolStr(logic.isLocked.z) +
          (logic.isLocked.z ? ' = ' + fmt(logic.lockedValues.z) : ''),
        logic.isLocked.z ? 'locked' : 'off'
      );
      stateHtml += this._row(
        'lock.dist',
        boolStr(logic.isLocked.dist) +
          (logic.isLocked.dist ? ' = ' + fmt(logic.lockedValues.dist) : ''),
        logic.isLocked.dist ? 'locked' : 'off'
      );
      stateHtml += this._row(
        'lock.angle',
        boolStr(logic.isLocked.angle) +
          (logic.isLocked.angle ? ' = ' + fmt(logic.lockedValues.angle) : ''),
        logic.isLocked.angle ? 'locked' : 'off'
      );

      stateHtml += '<div style="margin-top:4px"></div>';
      stateHtml += this._row('lastLocal.x', fmt(logic.lastLocalDelta.x));
      stateHtml += this._row('lastLocal.y', fmt(logic.lastLocalDelta.y));
      stateHtml += this._row('lastLocal.z', fmt(logic.lastLocalDelta.z));
      stateHtml += this._row('lastIndexAxis', logic.lastIndexedAxis || 'none');
    } else {
      stateHtml +=
        '<div style="color:#f44">No AccuDrawLogic found on baseController</div>';
      stateHtml +=
        '<div style="color:#888">accuDrawLogic = ' +
        typeof (bc ? bc.accuDrawLogic : undefined) +
        '</div>';
    }
    this.stateSection.innerHTML = stateHtml;

    // === VISUAL SECTION ===
    let visHtml = '<div class="ad-diag-label">Visual / Controller</div>';
    if (bc) {
      const hasTent = !!bc._tentativeOriginalPoint;
      visHtml += this._row(
        'tentativePoint',
        hasTent ? this._fmtPt(bc._tentativeOriginalPoint) : 'none',
        boolClass(hasTent)
      );
      visHtml += this._row(
        'lastWorldPoint',
        bc._lastWorldPoint ? this._fmtPt(bc._lastWorldPoint) : 'none'
      );
      visHtml += this._row('origin', this._fmtPt(bc.origin));
      visHtml += this._row(
        'zPlaneLocked',
        boolStr(bc.zPlaneLocked),
        boolClass(bc.zPlaneLocked)
      );
      visHtml += this._row(
        'indexEnabled',
        bc.indexEnabled !== undefined ? boolStr(bc.indexEnabled) : '?',
        boolClass(bc.indexEnabled)
      );

      if (ad) {
        const animAxis = ad.activeAnimationAxis || 'none';
        const idxVis = ad.indexIndicator
          ? ad.indexIndicator.visible
            ? 'visible'
            : 'hidden'
          : 'n/a';
        const projVis = ad.projectedMarker
          ? ad.projectedMarker.visible
            ? 'visible'
            : 'hidden'
          : 'n/a';
        visHtml += this._row('animAxis', animAxis);
        visHtml += this._row('indexLine', idxVis);
        visHtml += this._row('miniJack', projVis);
      }

      if (bc.activeCommand) {
        visHtml += this._row(
          'command',
          bc.activeCommand.constructor
            ? bc.activeCommand.constructor.name
            : 'unknown'
        );
      }

      const ae = document.activeElement;
      visHtml += this._row(
        'docFocus',
        ae
          ? ae.tagName + (ae.className ? '.' + ae.className.split(' ')[0] : '')
          : 'none'
      );
    }
    this.visualSection.innerHTML = visHtml;

    // === EVENT LOG SECTION ===
    let evHtml =
      '<div class="ad-diag-label">Event Log (' +
      this._eventLog.length +
      ')</div>';
    this._eventLog.forEach((ev) => {
      evHtml +=
        '<div class="ad-diag-event-line"><span class="timestamp">' +
        ev.ts +
        '</span><span class="action">' +
        ev.action +
        '</span> <span class="detail">' +
        ev.detail +
        '</span></div>';
    });
    if (this._eventLog.length === 0) {
      evHtml += '<div style="color:#666">(no events yet)</div>';
    }
    this.eventsSection.innerHTML = evHtml;

    // === HISTORY (state changes) ===
    const snapshot = this._takeSnapshot(logic);
    if (snapshot !== this._lastSnapshot) {
      const ts = (performance.now() / 1000).toFixed(2);
      const diff = this._diffSnapshots(this._lastSnapshot, snapshot);
      if (diff) {
        this._historyLines.unshift(ts + ' | ' + diff);
        if (this._historyLines.length > this._maxHistory) {
          this._historyLines.length = this._maxHistory;
        }
      }
      this._lastSnapshot = snapshot;
    }

    let histHtml =
      '<div class="ad-diag-label">State Changes (' +
      this._historyLines.length +
      ')</div>';
    this._historyLines.forEach((line) => {
      histHtml +=
        '<div class="ad-diag-event-line"><span class="detail">' +
        line +
        '</span></div>';
    });
    if (this._historyLines.length === 0) {
      histHtml += '<div style="color:#666">(no changes yet)</div>';
    }
    this.historySection.innerHTML = histHtml;
  }

  _row(key, val, valClass) {
    return `<div class="ad-diag-row"><span class="ad-diag-key">${key}</span><span class="ad-diag-val ${
      valClass || ''
    }">${val}</span></div>`;
  }

  _fmtPt(pt) {
    if (!pt) return 'null';
    if (Array.isArray(pt)) return pt.map((v) => v.toFixed(3)).join(', ');
    return `${pt.x.toFixed(3)}, ${pt.y.toFixed(3)}, ${pt.z.toFixed(3)}`;
  }

  _takeSnapshot(logic) {
    if (!logic) return '';
    return JSON.stringify({
      mode: logic.mode,
      axis: logic.currentAxis,
      inputActive: logic.inputActive,
      buffer: logic.inputBuffer,
      sticky: logic.stickyFocus,
      anchor: !!logic.typingMouseAnchor,
      lx: logic.isLocked.x,
      ly: logic.isLocked.y,
      lz: logic.isLocked.z,
      ld: logic.isLocked.dist,
      la: logic.isLocked.angle,
      vx: logic.isLocked.x ? logic.lockedValues.x : null,
      vy: logic.isLocked.y ? logic.lockedValues.y : null,
    });
  }

  _diffSnapshots(oldJson, newJson) {
    if (!oldJson) return 'init';
    try {
      const o = JSON.parse(oldJson);
      const n = JSON.parse(newJson);
      const changes = [];
      for (const k of Object.keys(n)) {
        if (JSON.stringify(o[k]) !== JSON.stringify(n[k])) {
          changes.push(
            k + ':' + JSON.stringify(o[k]) + '→' + JSON.stringify(n[k])
          );
        }
      }
      return changes.length > 0 ? changes.join(' ') : null;
    } catch (e) {
      return 'parse-error';
    }
  }

  _copyToClipboard(mode) {
    let text = '';
    if (mode === 'state') {
      text = '=== AccuDraw Diagnostics Snapshot ===\n';
      text += new Date().toISOString() + '\n\n';
      text += this.stateSection.innerText + '\n\n';
      text += this.visualSection.innerText + '\n';
    } else if (mode === 'log') {
      text = '=== AccuDraw Event Log ===\n';
      text += new Date().toISOString() + '\n\n';
      this._eventLog.forEach((ev) => {
        text += `${ev.ts} ${ev.action} ${ev.detail}\n`;
      });
      text += '\n=== State Changes ===\n';
      this._historyLines.forEach((line) => {
        text += line + '\n';
      });
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log('[Diagnostics] Copied to clipboard');
      })
      .catch((err) => {
        console.warn('[Diagnostics] Clipboard write failed', err);
      });
  }

}

