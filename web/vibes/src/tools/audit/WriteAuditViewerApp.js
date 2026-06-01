class WriteAuditViewerApp {
  
  constructor(options = {}) {
    this.root = options.root || document.body;
    this.folderHandle = null;
    this.dirs = {};
    this.records = [];
    this.selected = null;
    this.refreshTimer = null;
    this.autoRefreshMs = options.autoRefreshMs || 1500;
    this.nodeId = 'write-audit-viewer-' + new Date().toISOString().replace(/[:.]/g, '-');
    this.statusText = 'No folder opened.';
  }

  static start(options = {}) {
    const app = new WriteAuditViewerApp(options);
    app.mount();
    window.writeAuditViewerApp = app;
    return app;
  }

  mount() {
    this.installStyles();
    this.root.textContent = '';
    this.header = this.make('header', { className: 'wav2-header' });
    this.sidebar = this.make('aside', { className: 'wav2-sidebar' });
    this.detail = this.make('main', { className: 'wav2-detail' });
    this.status = this.make('span', { className: 'wav2-status', text: this.statusText });

    this.header.append(
      this.button('Open folder', () => this.openFolder()),
      this.button('Refresh', () => this.refresh()),
      this.button('Publish viewer API', () => this.publishViewerApi()),
      this.button(
        'Create blockable canary',
        () => this.createBlockableCanaryRequest(),
        'good'
      ),
      this.button('Clean reviewed', () => this.cleanReviewed()),
      this.button('Delete selected', () => this.deleteSelected()),
      this.status
    );

    this.layout = this.make('div', { className: 'wav2-layout' }, [
      this.sidebar,
      this.detail,
    ]);
    this.root.append(this.header, this.layout);
    this.renderEmpty();
  }

  installStyles() {
    const css = `
      :root { color-scheme: dark; }
      body { margin: 0; background: #090b12; color: #f4f4ff; font-family: system-ui, sans-serif; }
      .wav2-header { position: sticky; top: 0; z-index: 5; display: flex; gap: 8px; align-items: center; padding: 12px; background: rgba(18,20,32,.96); border-bottom: 1px solid #34384a; backdrop-filter: blur(14px); }
      .wav2-button { border: 1px solid #5e6680; border-radius: 10px; background: #242a3d; color: white; padding: 7px 11px; font: inherit; cursor: pointer; }
      .wav2-button:hover { background: #303852; }
      .wav2-button.good { background: #173827; border-color: #4a7; }
      .wav2-button.bad { background: #421f25; border-color: #a66; }
      .wav2-button:disabled { opacity: .45; cursor: default; }
      .wav2-status { margin-left: auto; color: #abb0c8; font-size: 13px; }
      .wav2-layout { display: grid; grid-template-columns: 460px 1fr; height: calc(100vh - 58px); }
      .wav2-sidebar { overflow: auto; border-right: 1px solid #34384a; background: rgba(12,14,22,.9); }
      .wav2-detail { overflow: auto; padding: 14px; background: radial-gradient(circle at top right, #202840, #090b12 45%); }
      .wav2-card { background: rgba(18,20,30,.86); border: 1px solid #34384a; border-radius: 14px; padding: 12px; margin-bottom: 12px; box-shadow: 0 10px 35px rgba(0,0,0,.24); }
      .wav2-title { font-weight: 900; color: #7cf7ff; margin-bottom: 8px; }
      .wav2-record { padding: 10px 12px; border-bottom: 1px solid #252938; cursor: pointer; font-size: 13px; }
      .wav2-record:hover { background: #1d2334; }
      .wav2-record.selected { background: #30304a; box-shadow: inset 4px 0 #ffd966; }
      .wav2-record.pending { background: rgba(100, 75, 20, .28); }
      .wav2-record.approved { background: rgba(20, 90, 50, .20); }
      .wav2-record.rejected { background: rgba(110, 30, 30, .22); }
      .wav2-kind { color: #ffd966; font-weight: 850; }
      .wav2-path { color: #9fd3ff; overflow-wrap: anywhere; }
      .wav2-meta { color: #aeb3c7; font-size: 12px; }
      .wav2-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
      .wav2-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
      .wav2-pill { background: #22283b; border: 1px solid #3a4158; border-radius: 999px; padding: 5px 9px; font-size: 12px; color: #dce0f4; }
      pre.wav2-pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; background: #070910; border: 1px solid #2d3347; border-radius: 10px; padding: 10px; }
      .wav2-diff { border: 1px solid #34384a; border-radius: 10px; overflow: hidden; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .wav2-line { white-space: pre-wrap; overflow-wrap: anywhere; padding: 2px 8px; border-bottom: 1px solid rgba(255,255,255,.04); }
      .wav2-same { color: #c8ccdc; background: rgba(10,10,14,.8); }
      .wav2-add { color: #cbffdc; background: rgba(40,120,65,.25); }
      .wav2-del { color: #ffd1d1; background: rgba(145,45,45,.26); }
      .wav2-warn { color: #ffd966; }
      .wav2-good { color: #8cffb0; }
      .wav2-bad { color: #ff9b9b; }
    `;

    if (window.applyCss) {
      window.applyCss(css, 'WriteAuditViewerAppStyles');
      return;
    }

    let style = document.querySelector('style[data-name=WriteAuditViewerAppStyles]');
    if (!style) {
      style = document.createElement('style');
      style.dataset.name = 'WriteAuditViewerAppStyles';
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  make(tag, props = {}, children = []) {
    if (!Array.isArray(children)) children = [children];

    if (window.makeElement) {
      try {
        return window.makeElement(tag, props, children);
      } catch {
        // Fall back to local creator if project helper signature differs.
      }
    }

    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (key === 'className') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key === 'html') el.innerHTML = value;
      else if (key.startsWith('on') && typeof value === 'function')
        el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value !== undefined && value !== null) el.setAttribute(key, value);
    }
    for (const child of children) {
      if (child === null || child === undefined) continue;
      el.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  button(text, onClick, className = '') {
    return this.make('button', {
      className: 'wav2-button ' + className,
      onclick: onClick,
      text,
    });
  }

  escape(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  setStatus(text) {
    this.statusText = text;
    if (this.status) this.status.textContent = text;
  }

  async openFolder() {
    if (!window.showDirectoryPicker) {
      alert('File System Access API is not available in this browser.');
      return;
    }
    this.folderHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await this.ensureDirs();
    await this.publishViewerApi();
    await this.refresh();
    this.startAutoRefresh();
  }

  async ensureDirs() {
    this.dirs.logs = this.folderHandle;
    this.dirs.requests = await this.folderHandle.getDirectoryHandle('write-requests', {
      create: true,
    });
    this.dirs.decisions = await this.folderHandle.getDirectoryHandle('write-decisions', {
      create: true,
    });
    this.dirs.nodes = await this.folderHandle.getDirectoryHandle('api-nodes', {
      create: true,
    });
    this.dirs.commands = await this.folderHandle.getDirectoryHandle('api-commands', {
      create: true,
    });
    this.dirs.results = await this.folderHandle.getDirectoryHandle('api-results', {
      create: true,
    });
    this.dirs.archive = await this.folderHandle.getDirectoryHandle('api-archive', {
      create: true,
    });
  }

  startAutoRefresh() {
    clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => this.refresh(), this.autoRefreshMs);
  }

  async publishViewerApi() {
    if (!this.folderHandle) return;
    await this.ensureDirs();
    const manifest = {
      schema: 1,
      type: 'fs-api-node-manifest',
      nodeKind: 'write-audit-viewer',
      nodeId: this.nodeId,
      status: 'online',
      time: new Date().toISOString(),
      commandDir: 'api-commands',
      resultDir: 'api-results',
      skills: {
        listRequests: { description: 'List pending write requests.' },
        summarizeAuditFolder: { description: 'Return counts and recent records.' },
        approveRequest: { args: ['requestFile', 'reason'] },
        rejectRequest: { args: ['requestFile', 'reason'] },
      },
    };
    await this.writeJson(this.dirs.nodes, this.nodeId + '.json', manifest);
    this.setStatus('Published viewer API: ' + this.nodeId);
  }

  async writeJson(dirHandle, name, payload) {
    const fileHandle = await dirHandle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    return { ok: true, name };
  }

  async readJsonRecord(dirHandle, name, folder) {
    const handle = await dirHandle.getFileHandle(name);
    const file = await handle.getFile();
    const text = await file.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (error) {
      json = { type: 'parse-error', error: error.message, raw: text };
    }
    return { folder, name, handle, file, text, json };
  }

  async readDir(dirHandle, folder) {
    const out = [];
    if (!dirHandle) return out;
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind !== 'file' || !name.endsWith('.json')) continue;
      try {
        out.push(await this.readJsonRecord(dirHandle, name, folder));
      } catch (error) {
        out.push({
          folder,
          name,
          handle,
          json: { type: 'read-error', error: error.message },
        });
      }
    }
    return out;
  }

  async refresh() {
    if (!this.folderHandle) return;
    await this.ensureDirs();

    const logs = await this.readDir(this.dirs.logs, 'logs');
    const requests = await this.readDir(this.dirs.requests, 'write-requests');
    const decisions = await this.readDir(this.dirs.decisions, 'write-decisions');
    const nodes = await this.readDir(this.dirs.nodes, 'api-nodes');
    const commands = await this.readDir(this.dirs.commands, 'api-commands');
    const results = await this.readDir(this.dirs.results, 'api-results');

    const decisionByName = new Map(decisions.map((record) => [record.name, record.json]));
    for (const request of requests)
      request.decision = decisionByName.get(request.name) || null;

    this.records = [
      ...requests,
      ...logs,
      ...decisions,
      ...nodes,
      ...commands,
      ...results,
    ].sort((a, b) =>
      String(b.json.time || b.name).localeCompare(String(a.json.time || a.name))
    );

    if (this.selected) {
      this.selected =
        this.records.find(
          (r) => r.folder === this.selected.folder && r.name === this.selected.name
        ) || this.selected;
    }

    this.renderList();
    if (this.selected) this.renderDetail();
    this.setStatus(
      `${this.records.length} items · ${requests.length} requests · ${decisions.length} decisions · ${logs.length} logs`
    );
  }

  requestStatus(record) {
    if (record.folder !== 'write-requests') return '';
    if (!record.decision) return 'pending';
    return record.decision.approved ? 'approved' : 'rejected';
  }

  renderList() {
    this.sidebar.textContent = '';
    for (const record of this.records) {
      const status = this.requestStatus(record);
      const selected =
        this.selected &&
        this.selected.folder === record.folder &&
        this.selected.name === record.name;
      const item = this.make('div', {
        className: `wav2-record ${status} ${selected ? 'selected' : ''}`,
      });
      const j = record.json || {};
      item.append(
        this.make('div', {
          className: 'wav2-kind',
          text: `${record.folder} · ${j.type || j.operation || j.command || 'unknown'}${
            status ? ' · ' + status : ''
          }`,
        }),
        this.make('div', {
          className: 'wav2-path',
          text: j.path || j.message || record.name,
        }),
        this.make('div', {
          className: 'wav2-meta',
          text: `${j.time || ''} · ${record.name}`,
        })
      );
      item.addEventListener('click', () => {
        this.selected = record;
        this.renderList();
        this.renderDetail();
      });
      this.sidebar.append(item);
    }
  }

  renderEmpty() {
    this.detail.textContent = '';
    this.detail.append(
      this.card(
        'Write Audit Viewer V2',
        'Open the shared audit folder. This page previews logs, write requests, decisions, API node manifests, commands, and results.'
      )
    );
  }

  card(title, body) {
    return this.make('div', { className: 'wav2-card' }, [
      this.make('div', { className: 'wav2-title', text: title }),
      typeof body === 'string' ? this.make('div', { text: body }) : body,
    ]);
  }

  pre(obj) {
    return this.make('pre', {
      className: 'wav2-pre',
      text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2),
    });
  }

  statsPills(stats) {
    const box = this.make('div', { className: 'wav2-grid' });
    if (!stats) return box;
    box.append(
      this.make('span', { className: 'wav2-pill', text: 'chars ' + stats.chars }),
      this.make('span', { className: 'wav2-pill', text: 'lines ' + stats.lines }),
      this.make('span', { className: 'wav2-pill', text: 'hash ' + stats.hash })
    );
    return box;
  }

  simpleLineDiff(before, after) {
    const a = String(before || '').split('\n');
    const b = String(after || '').split('\n');
    const max = Math.max(a.length, b.length);
    const out = [];
    for (let i = 0; i < max; i++) {
      if (a[i] === b[i]) out.push({ type: 'same', text: '  ' + (a[i] || '') });
      else {
        if (a[i] !== undefined) out.push({ type: 'del', text: '- ' + a[i] });
        if (b[i] !== undefined) out.push({ type: 'add', text: '+ ' + b[i] });
      }
    }
    return out.slice(0, 2000);
  }

  diffElement(before, after) {
    const box = this.make('div', { className: 'wav2-diff' });
    for (const row of this.simpleLineDiff(before, after)) {
      box.append(
        this.make('div', { className: 'wav2-line wav2-' + row.type, text: row.text })
      );
    }
    return box;
  }

  renderDetail() {
    this.detail.textContent = '';
    if (!this.selected) {
      this.renderEmpty();
      return;
    }
    if (this.selected.folder === 'write-requests') this.renderWriteRequest(this.selected);
    else this.renderGeneric(this.selected);
  }

  renderWriteRequest(record) {
    const j = record.json || {};
    const decision = record.decision;
    const toolbar = this.make('div', { className: 'wav2-toolbar' });
    const approve = this.button(
      'Approve',
      () => this.writeDecision(record, true),
      'good'
    );
    const reject = this.button('Reject', () => this.writeDecision(record, false), 'bad');
    approve.disabled = !!decision;
    reject.disabled = !!decision;
    toolbar.append(
      approve,
      reject,
      this.button('Delete request', () => this.deleteRecord(record))
    );

    this.detail.append(toolbar);
    this.detail.append(
      this.card(
        'Write Request',
        this.make('div', {}, [
          this.make('div', { className: 'wav2-path', text: j.path || '' }),
          this.statsPills(j.fileStats?.before),
          this.statsPills(j.fileStats?.intendedAfter),
          this.pre({
            requestId: j.requestId,
            operation: j.operation,
            status: decision ? decision.decision : 'pending',
            notes: j.notes || null,
            decision,
          }),
        ])
      )
    );
    this.detail.append(
      this.card(
        'Diff Preview',
        this.diffElement(j.content?.before || '', j.content?.intendedAfter || '')
      )
    );
    this.detail.append(this.card('Raw Request JSON', this.pre(j)));
  }

  renderGeneric(record) {
    const toolbar = this.make('div', { className: 'wav2-toolbar' }, [
      this.button('Delete this', () => this.deleteRecord(record)),
    ]);
    this.detail.append(toolbar);
    this.detail.append(
      this.card(`${record.folder} / ${record.name}`, this.pre(record.json))
    );
  }

  async writeDecision(record, approved) {
    const reason = prompt(
      approved ? 'Approval note?' : 'Reject reason?',
      approved
        ? 'Approved in Write Audit Viewer V2.'
        : 'Rejected in Write Audit Viewer V2.'
    );
    if (reason === null) return;
    const payload = {
      schema: 1,
      auditMarker: 'BLOCKABLE_WRITE_DECISION_V2',
      requestId: record.json.requestId,
      time: new Date().toISOString(),
      decision: approved ? 'approved' : 'rejected',
      approved,
      reason,
      requestFile: 'write-requests/' + record.name,
    };
    await this.writeJson(this.dirs.decisions, record.name, payload);
    await this.refresh();
  }

  async deleteRecord(record) {
    const dir =
      record.folder === 'write-requests'
        ? this.dirs.requests
        : record.folder === 'write-decisions'
        ? this.dirs.decisions
        : record.folder === 'api-nodes'
        ? this.dirs.nodes
        : record.folder === 'api-commands'
        ? this.dirs.commands
        : record.folder === 'api-results'
        ? this.dirs.results
        : this.dirs.logs;
    await dir.removeEntry(record.name).catch(() => {});
    this.selected = null;
    await this.refresh();
    this.renderEmpty();
  }

  async cleanReviewed() {
    if (
      !confirm(
        'Delete approved/rejected requests plus matching decisions from the loaded audit folder?'
      )
    )
      return;
    const reviewed = this.records.filter(
      (r) => r.folder === 'write-requests' && r.decision
    );
    for (const record of reviewed) {
      await this.dirs.requests.removeEntry(record.name).catch(() => {});
      await this.dirs.decisions.removeEntry(record.name).catch(() => {});
    }
    this.selected = null;
    await this.refresh();
    this.renderEmpty();
  }

  async deleteSelected() {
    if (this.selected) await this.deleteRecord(this.selected);
  }

}
