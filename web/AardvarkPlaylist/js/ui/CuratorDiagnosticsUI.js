class CuratorDiagnosticsUI {
    constructor(player) {
      this.player = player;
      this.dialog = null;
      this.listEl = null;
      this.logs = [];
      this.maxLogs = 120;
      this._injectStyles();
      
      // Global logging hook so any component can push tracing logs instantly
      window.curatorLog = (category, message, details = null) => {
        this.addLog(category, message, details);
      };
      
      // Default Curator Mode state
      if (localStorage.getItem('gt_curator_mode') === null) {
        localStorage.setItem('gt_curator_mode', 'false');
      }
    }

    static isCuratorModeActive() {
      return localStorage.getItem('gt_curator_mode') === 'true';
    }

    _injectStyles() {
      const css = `
        .curator-diag-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #121212;
          padding: 8px;
          box-sizing: border-box;
        }
        .curator-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid #333;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .curator-mode-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #ddd;
          cursor: pointer;
        }
        .curator-mode-toggle input {
          cursor: pointer;
          margin: 0;
        }
        .curator-log-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 10.5px;
          padding: 4px;
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 4px;
        }
        .curator-row {
          padding: 4px 6px;
          border-radius: 3px;
          line-height: 1.4;
          border-bottom: 1px solid #151515;
        }
        .curator-row.volume { color: #00e5ff; background: rgba(0, 229, 255, 0.04); }
        .curator-row.scope { color: #ffeb3b; background: rgba(255, 235, 59, 0.04); }
        .curator-row.auto-arp { color: #00e676; background: rgba(0, 230, 118, 0.04); }
        .curator-row.transpose { color: #d500f9; background: rgba(213, 0, 249, 0.04); }
        .curator-row.tracks { color: #ff9100; background: rgba(255, 145, 0, 0.04); }
        .curator-row.system { color: #ffffff; background: rgba(255, 255, 255, 0.04); }
        .curator-timestamp { color: #666; margin-right: 6px; }
        .curator-badge {
          font-weight: bold;
          margin-right: 6px;
          text-transform: uppercase;
        }
      `;
      if (typeof applyCss !== 'undefined') {
        applyCss(css, 'curator-diagnostics-styles');
      }
    }

    addLog(category, message, details = null) {
      const timestamp = new Date().toLocaleTimeString();
      const entry = { timestamp, category, message, details };
      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      this._renderLog(entry);
    }

    _renderLog(entry) {
      if (!this.listEl) return;
      const row = makeElement('div', {
        className: `curator-row ${entry.category.toLowerCase()}`
      });
      const tsSpan = makeElement('span', { className: 'curator-timestamp' }, entry.timestamp);
      const badgeSpan = makeElement('span', { className: 'curator-badge' }, `[${entry.category}]`);
      const textSpan = makeElement('span', {}, entry.message);
      row.append(tsSpan, badgeSpan, textSpan);
      if (entry.details) {
        const detailsDiv = makeElement('div', {
          style: 'font-size: 9px; color: #888; padding-left: 20px; margin-top: 2px;'
        }, JSON.stringify(entry.details));
        row.appendChild(detailsDiv);
      }
      this.listEl.appendChild(row);
      this.listEl.scrollTop = this.listEl.scrollHeight;
    }

    open() {
      if (this.dialog) {
        this.dialog.setZOnTop();
        return;
      }
      const container = makeElement('div', { className: 'curator-diag-container' });
      const header = makeElement('div', { className: 'curator-header-bar' });
      const curModeCheckbox = makeElement('input', {
        type: 'checkbox',
        checked: CuratorDiagnosticsUI.isCuratorModeActive()
      });
      const label = makeElement('label', { className: 'curator-mode-toggle' }, [
        curModeCheckbox,
        makeElement('span', {}, 'Curator Mode (Commits customizations to individual songSettings in playlist)')
      ]);
      curModeCheckbox.onchange = (e) => {
        const active = e.target.checked;
        localStorage.setItem('gt_curator_mode', String(active));
        window.curatorLog('Scope', `Active save target switched: ${active ? 'Curator Mode (Song-by-Song)' : 'Session Mode (Global/Session)'}`);
        if (this.player.headerControlsUI) {
          this.player.headerControlsUI.build();
        }
      };
      const clearBtn = makeElement('button', {
        className: 'dialog-button',
        onclick: () => {
          if (this.listEl) this.listEl.innerHTML = '';
          this.logs = [];
        }
      }, 'Clear Logs');
      header.append(label, clearBtn);
      this.listEl = makeElement('div', { className: 'curator-log-list' });
      container.append(header, this.listEl);
      this.logs.forEach(log => this._renderLog(log));
      const parentW = this.player.getAppWidth();
      this.dialog = UITools.makeDialog({
        env: this.player.env,
        title: '🛠️ Curator & Developer Live Diagnostics',
        width: '520px',
        height: '380px',
        position: [40, window.innerHeight - 440],
        content: container,
        appendTo: this.player.rootElement,
        onClose: () => {
          this.dialog = null;
          this.listEl = null;
        }
      });
      window.curatorLog('System', 'Curator Diagnostics Console Opened');
    }
  
  
}