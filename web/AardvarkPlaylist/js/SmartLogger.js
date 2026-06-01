
class SmartLogger {

    constructor() {
    if (SmartLogger.getInstance()) return SmartLogger.getInstance();
    SmartLogger.setInstance(this);

    this.logs = [];
    this.maxLogs = 500;
    this.paused = false;
    this.autoScroll = true;
    this.filterText = '';
    this.container = null;
    this.logList = null;

    this._injectStyles();
  }

  static log(category, msg, data = null) {
    if (!SmartLogger.getInstance()) new SmartLogger();
    SmartLogger.getInstance().add(category, msg, data);
  }

  add(category, msg, data) {
    if (this.paused) return;

    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      category,
      msg,
      data,
      count: 1,
      domElement: null,
    };

    const last = this.logs[this.logs.length - 1];
    if (
      last &&
      last.category === category &&
      last.msg === msg &&
      JSON.stringify(last.data) === JSON.stringify(data)
    ) {
      last.count++;
      last.timestamp = new Date();
      this._updateLogEntryDOM(last);
      return;
    }

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    if (this.logList) {
      if (this._matchesFilter(entry)) {
        this._renderLogEntry(entry);
        if (this.autoScroll) this.logList.scrollTop = this.logList.scrollHeight;
      }
    }
  }

  renderUI(container) {
    this.container = container;
    this.container.innerHTML = '';
    this.container.style.height = '100%';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';

    const wrapper = makeElement('div', { className: 'sl-container' });

    const toolbar = makeElement('div', { className: 'sl-toolbar' });

    const filterInput = makeElement('input', {
      type: 'text',
      placeholder: 'Filter...',
      value: this.filterText,
      className: 'sl-filter',
    });

    filterInput.oninput = (e) => {
      this.filterText = e.target.value;
      this._refreshList();
    };

    const mkBtn = (lbl, cb) =>
      makeElement('button', { className: 'sl-btn', onclick: cb }, lbl);

    const setFilter = (txt) => {
      this.filterText = txt;
      filterInput.value = txt;
      this._refreshList();
    };

    toolbar.append(
      filterInput,
      mkBtn('T:0', () => setFilter('Tr:0')),
      mkBtn('T:1', () => setFilter('Tr:1')),
      mkBtn('Audio', () => setFilter('AudioOut')),
      mkBtn('X', () => {
        this._clear();
      }),
      this._createToggle('⇩', this.autoScroll, (v) => (this.autoScroll = v))
    );

    this.logList = makeElement('div', { className: 'sl-list' });
    this._refreshList();

    wrapper.append(toolbar, this.logList);
    this.container.append(wrapper);
  }

  _renderLogEntry(entry) {
    const row = makeElement('div', { className: 'sl-entry' });

    if (entry.category === 'Error') row.style.color = '#ff5555';
    else if (entry.category === 'Warn') row.style.color = '#ffaa00';
    else if (entry.category.includes('Dialog')) row.style.color = '#aaddff';
    else if (entry.category.includes('Layout')) row.style.color = '#ff88ff';

    const time = entry.timestamp.toISOString().split('T')[1].slice(3, -1);

    const countDisplay =
      entry.count > 1 ? `<span class="sl-count">${entry.count}</span>` : '';

    let html = `<span class="sl-time">${time}</span> <span class="sl-cat">[${entry.category}]</span> ${entry.msg} ${countDisplay}`;

    if (entry.data) {
      const compact = this._formatCompact(entry.data);
      html += `<div class="sl-data">${compact}</div>`;
    }

    row.innerHTML = html;
    entry.domElement = row;
    this.logList.appendChild(row);
  }

  _updateLogEntryDOM(entry) {
    if (!entry.domElement) return;
    const countEl = entry.domElement.querySelector('.sl-count');
    if (entry.count > 1) {
      this._renderLogEntry(entry);
      entry.domElement.remove();
    }
  }

  _createToggle(label, init, cb) {
    const btn = makeElement('button', { className: 'sl-btn toggle' }, label);
    if (init) btn.classList.add('active');
    btn.onclick = () => {
      const newState = !btn.classList.contains('active');
      if (newState) btn.classList.add('active');
      else btn.classList.remove('active');
      cb(newState);
    };
    return btn;
  }

  _clear() {
    this.logs = [];
    this._refreshList();
  }

  _copyToClipboard() {
    const visibleLogs = this.logs.filter((l) => this._matchesFilter(l));
    const text = visibleLogs
      .map((l) => {
        let s = `${l.timestamp.toISOString()} [${l.category}] ${l.msg}`;
        if (l.count > 1) s += ` (x${l.count})`;
        if (l.data) s += `\n  ${this._formatCompact(l.data)}`;
        return s;
      })
      .join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => alert(`${visibleLogs.length} logs copied!`));
  }

  _injectStyles() {
    const css = `
    .sl-container {
      display: flex; 
      flex-direction: column; 
      height: 100%; 
      width: 100%;
      background: #111;
      overflow: hidden;
    }

    .sl-toolbar { 
      display: flex; 
      gap: 4px; 
      padding: 4px; 
      background: #222; 
      border-bottom: 1px solid #444; 
      flex-shrink: 0; 
      align-items: center;
    }
    
    .sl-filter { 
      flex: 1; 
      background: #111; 
      border: 1px solid #444; 
      color: #fff; 
      font-size: 10px; 
      padding: 2px 5px; 
      min-width: 40px; 
    }
    
    .sl-btn { 
      background: #333; 
      border: 1px solid #555; 
      color: #aaa; 
      font-size: 9px; 
      padding: 2px 6px; 
      cursor: pointer; 
      min-width: 20px; 
      white-space: nowrap;
    }
    .sl-btn:hover { background: #444; color: #fff; }
    
    .sl-list { 
      flex-grow: 1; 
      overflow-y: auto; 
      font-family: 'Consolas', 'Monaco', monospace; 
      font-size: 10px; 
      padding: 5px; 
      background: #111; 
      color: #ccc; 
      line-height: 1.4; 
    }

    .sl-entry { 
      display: block;
      margin-bottom: 6px; 
      border-bottom: 1px solid #222; 
      padding-bottom: 4px; 
    }
  `;
    applyCss(css, 'smart-logger-css');
  }

  _matchesFilter(entry) {
    if (!this.filterText) return true;
    const search = this.filterText.toLowerCase();
    const txt = `${entry.category} ${entry.msg}`.toLowerCase();

    const terms = search.split(' ').filter((t) => t.length > 0);
    return terms.every((term) => txt.includes(term));
  }

  _formatCompact(obj) {
    if (!obj) return '';
    try {
      const keys = Object.keys(obj);
      if (keys.length > 0 && keys.every((k) => typeof obj[k] !== 'object')) {
        return keys.map((k) => `${k}:${obj[k]}`).join(' ');
      }
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  }

  _refreshList() {
    if (!this.logList) return;
    this.logList.innerHTML = '';
    this.logs.forEach((l) => {
      if (this._matchesFilter(l)) this._renderLogEntry(l);
    });
    if (this.autoScroll) this.logList.scrollTop = this.logList.scrollHeight;
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

