class ProjectWalkerTool {

  static register(app) {
    if (!app) app = window.projectApp;
    if (app && app.actionRegistry) {
      app.actionRegistry.register({
        id: 'tools:project-walker',
        label: '🌲 Project Tree Walker',
        menuPath: 'Tools/Project Tree Walker',
        handler: () => {
          const tool = new ProjectWalkerTool(app);
          tool.open();
        }
      });
      console.log('[ProjectWalkerTool] Registered in ActionRegistry.');
    } else {
      console.warn('[ProjectWalkerTool] ActionRegistry not found. Registration failed.');
    }
  }

  constructor(app) {
      this.app = app;
      this.dialog = null;
      this.element = null;
      this.ui = {};
      this.widgets = {};

      this.state = {
        running: false,
        paused: false,
        nodes: [],
        index: 0,
        delay: 50
      };

      this.scripts = {
        onFile: localStorage.getItem('pw_script_onFile') || this._getDefaultOnFileScript(),
        onDir: localStorage.getItem('pw_script_onDir') || this._getDefaultOnDirScript(),
        live: localStorage.getItem('pw_script_live') || this._getDefaultLiveScript()
      };
      
      this.activeTab = 'onFile';
    }

  open() {
      if (this.dialog) {
        if (typeof this.dialog.setZOnTop === 'function') this.dialog.setZOnTop();
        return this;
      }

      this.element = this._createElement();

      if (typeof UITools !== 'undefined') {
        this.dialog = UITools.makeDialog({
          title: 'Project Tree Walker',
          contentElement: this.element,
          size: [860, 720],
          onClose: () => { 
            this.pause(); 
            this.dialog = null; 
          }
        });
      }

      this._initEditors();
      this._updateUI();
      return this;
    }

  _createElement() {
    const root = document.createElement('div');
    Object.assign(root.style, {
      display: 'flex', flexDirection: 'column', height: '100%', gap: '10px',
      background: '#0d1117', color: '#c9d1d9', padding: '10px', boxSizing: 'border-box'
    });

    // Toolbar
    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, { display: 'flex', gap: '8px', alignItems: 'center', flexShrink: '0' });

    this.ui.btnStart = this._createBtn('Start', () => this.start(), '#238636', '#fff');
    this.ui.btnPause = this._createBtn('Pause', () => this.pause(), '#8957e5', '#fff');
    this.ui.btnStep  = this._createBtn('Step', () => this.step(), '#21262d', '#c9d1d9');
    this.ui.btnReset = this._createBtn('Reset', () => this.reset(), '#da3633', '#fff');

    const delayWrap = document.createElement('div');
    Object.assign(delayWrap.style, { display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '10px', fontSize: '12px' });
    delayWrap.textContent = 'Delay (ms):';
    this.ui.delayInput = document.createElement('input');
    Object.assign(this.ui.delayInput, { type: 'number', value: this.state.delay, min: 0, max: 5000 });
    Object.assign(this.ui.delayInput.style, { width: '60px', background: '#010409', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '4px', padding: '2px 4px' });
    this.ui.delayInput.onchange = () => { this.state.delay = parseInt(this.ui.delayInput.value, 10) || 0; };
    delayWrap.appendChild(this.ui.delayInput);

    this.ui.lblStatus = document.createElement('div');
    Object.assign(this.ui.lblStatus.style, { marginLeft: 'auto', fontSize: '12px', color: '#8b949e', fontFamily: 'monospace' });
    this.ui.lblStatus.textContent = 'Ready';

    toolbar.append(this.ui.btnStart, this.ui.btnPause, this.ui.btnStep, this.ui.btnReset, delayWrap, this.ui.lblStatus);

    // Tabs
    const tabs = document.createElement('div');
    Object.assign(tabs.style, { display: 'flex', gap: '4px', flexShrink: '0' });
    this.ui.tabBtns = {};
    
    ['onFile', 'onDir', 'live'].forEach(tab => {
      const btn = document.createElement('button');
      btn.textContent = tab === 'live' ? 'Live Console' : tab;
      Object.assign(btn.style, {
        background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d',
        padding: '6px 12px', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontWeight: 'bold'
      });
      btn.onclick = () => this._switchTab(tab);
      this.ui.tabBtns[tab] = btn;
      tabs.appendChild(btn);
    });

    // Editor Area
    this.ui.editorHost = document.createElement('div');
    Object.assign(this.ui.editorHost.style, {
      flex: '1', minHeight: '0', border: '1px solid #30363d', background: '#010409', position: 'relative'
    });

    this.ui.btnRunLive = this._createBtn('▶ Run Live Code', () => this.runLiveCode(), '#007acc', '#fff');
    Object.assign(this.ui.btnRunLive.style, { position: 'absolute', bottom: '10px', right: '20px', zIndex: '100' });

    // Log Area
    this.ui.logContainer = document.createElement('div');
    Object.assign(this.ui.logContainer.style, {
      height: '180px', overflowY: 'auto', background: '#010409', border: '1px solid #30363d',
      borderRadius: '6px', padding: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#a5d6ff', flexShrink: '0'
    });

    root.append(toolbar, tabs, this.ui.editorHost, this.ui.logContainer);
    return root;
  }

  _createBtn(text, onClick, bg, color) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      background: bg, color: color, border: '1px solid rgba(255,255,255,0.1)',
      padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
    });
    btn.onclick = onClick;
    return btn;
  }

  _initEditors() {
      this.ui.segmentWrappers = {};
      
      ['onFile', 'onDir', 'live'].forEach(tab => {
        const wrapper = document.createElement('div');
        Object.assign(wrapper.style, { width: '100%', height: '100%', display: 'none', position: 'absolute', inset: '0' });
        
        const widget = new CodeMirrorWidget(`walker_${tab}`, this.scripts[tab], 'javascript', () => {
          this.scripts[tab] = widget.getText();
          localStorage.setItem(`pw_script_${tab}`, this.scripts[tab]);
        });
        
        const el = widget.getElement();
        Object.assign(el.style, { width: '100%', height: '100%' });
        wrapper.appendChild(el);
        
        this.widgets[tab] = widget;
        this.ui.segmentWrappers[tab] = wrapper;
        this.ui.editorHost.appendChild(wrapper);
      });

      this.ui.editorHost.appendChild(this.ui.btnRunLive);
      this._switchTab('onFile');
    }

  _switchTab(tab) {
    this.activeTab = tab;
    Object.keys(this.ui.tabBtns).forEach(k => {
      this.ui.tabBtns[k].style.background = (k === tab) ? '#1f6feb' : '#21262d';
      this.ui.tabBtns[k].style.color = (k === tab) ? '#ffffff' : '#c9d1d9';
    });
    Object.keys(this.ui.segmentWrappers).forEach(k => {
      this.ui.segmentWrappers[k].style.display = (k === tab) ? 'block' : 'none';
    });
    this.ui.btnRunLive.style.display = (tab === 'live') ? 'block' : 'none';
  }

  log(...args) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    const line = document.createElement('div');
    line.style.padding = '2px 0';
    line.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    this.ui.logContainer.appendChild(line);
    this.ui.logContainer.scrollTop = this.ui.logContainer.scrollHeight;
    console.log('[ProjectWalker]', msg);
  }

  _updateUI() {
    this.ui.btnStart.disabled = this.state.running && !this.state.paused;
    this.ui.btnStart.style.opacity = this.ui.btnStart.disabled ? '0.5' : '1';

    this.ui.btnPause.disabled = !this.state.running || this.state.paused;
    this.ui.btnPause.style.opacity = this.ui.btnPause.disabled ? '0.5' : '1';

    this.ui.btnStep.disabled = !this.state.paused && this.state.running;
    this.ui.btnStep.style.opacity = this.ui.btnStep.disabled ? '0.5' : '1';

    const count = this.state.nodes.length;
    if (count > 0) {
      this.ui.lblStatus.textContent = `Node ${this.state.index} / ${count}  |  ${this.state.paused ? 'PAUSED' : (this.state.running ? 'RUNNING' : 'STOPPED')}`;
    } else {
      this.ui.lblStatus.textContent = 'Ready';
    }
  }

  // --- WALKER LOGIC ---

  async start() {
    if (this.state.running && !this.state.paused) return;

    if (!this.state.running) {
      this.log("Starting walker...");
      const pfm = this.app?.projectFilesManager;
      if (!pfm || !pfm.fileTreeView) {
        this.log("Error: FileTreeView not ready.");
        return;
      }
      
      const nodes = [];
      const traverse = (n) => {
        nodes.push({ id: n.id, name: n.name, type: n.type });
        if (n.children) n.children.forEach(traverse);
      };
      pfm.fileTreeView.rootNodes.forEach(traverse);
      
      this.state.nodes = nodes;
      this.state.index = 0;
      this.state.running = true;
    } else {
      this.log("Resuming walker...");
    }

    this.state.paused = false;
    this._updateUI();
    this._stepLoop();
  }

  pause() {
    if (!this.state.running || this.state.paused) return;
    this.state.paused = true;
    this.log(`Paused at index ${this.state.index}.`);
    this._updateUI();
  }

  async step() {
    if (!this.state.running) {
      await this.start();
      this.pause();
    }
    this.state.paused = true;
    await this._processSingleNode();
    this._updateUI();
  }

  reset() {
    this.state.running = false;
    this.state.paused = false;
    this.state.index = 0;
    this.state.nodes = [];
    this.log("Walker reset.");
    this._updateUI();
  }

  async _stepLoop() {
    if (!this.state.running || this.state.paused) return;
    
    const processed = await this._processSingleNode();
    
    if (processed && this.state.running && !this.state.paused) {
      if (this.state.delay > 0) {
        setTimeout(() => this._stepLoop(), this.state.delay);
      } else {
        Promise.resolve().then(() => this._stepLoop());
      }
    }
  }

  async _processSingleNode() {
      if (this.state.index >= this.state.nodes.length) {
        this.log("Walker finished. Processed all nodes.");
        this.state.running = false;
        this.state.paused = false;
        this._updateUI();
        return false;
      }

      const node = this.state.nodes[this.state.index];
      this.ui.lblStatus.textContent = `Node ${this.state.index + 1} / ${this.state.nodes.length}: ${node.name}`;
      
      const ctx = await this._buildContext(node);
      const code = node.type === 'file' ? this.widgets.onFile.getText() : this.widgets.onDir.getText();

      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction('ctx', code);
        await fn(ctx);
      } catch (e) {
        this.log(`Error processing ${node.id}: ${e.message}`);
        this.pause();
        return false; 
      }

      this.state.index++;
      return true;
    }

  async runLiveCode() {
      if (!this.state.paused && this.state.running) {
        this.log("Cannot run live code while walker is free-running. Pause first.");
        return;
      }
      
      const code = this.widgets.live.getText();
      const node = this.state.nodes[this.state.index] || null;
      const ctx = await this._buildContext(node);
      
      this.log("▶ Running Live Code...");
      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction('ctx', code);
        await fn(ctx);
        this.log("✓ Live code finished.");
      } catch (e) {
        this.log("❌ Live code error: " + e.message);
      }
    }

  async _buildContext(node) {
    const app = this.app;
    const ctx = {
      app,
      node,
      path: node?.id,
      type: node?.type,
      acorn: window.acorn,
      log: (...args) => this.log(...args),
      pause: () => this.pause(),
      read: async (p = node?.id) => {
        return await this._walkerReadFileContent(p);
      },
      write: async (content, p = node?.id) => {
        if (!p) {
          return false;
        }
        await app.commands.saveFile({
          relativePath: p,
          content
        });
        this.log("Saved: " + p);
        return true;
      },
      // readSidecar, writeSidecar, getSidecarPath removed
      parseAst: (code) => {
        if (!window.acorn) {
          this.log("acorn not found.");
          return null;
        }
        try {
          return window.acorn.parse(code, {
            ecmaVersion: "latest",
            sourceType: "module"
          });
        } catch (error) {
          return null;
        }
      },
      evalMetadata: (code, className) => {
        try {
          const fn = new Function(
            '"use strict";\n' +
              code +
              '\nif (typeof ' +
              className +
              ' === "undefined") return null;\n' +
              'if (typeof ' +
              className +
              '.getMetadata !== "function") return null;\n' +
              'return ' +
              className +
              '.getMetadata();'
          );
          return fn();
        } catch (error) {
          return {
            error: error.message
          };
        }
      },
      walker: {
        getIndex: () => this.state.index,
        setIndex: (i) => {
          this.state.index = i;
          this._updateUI();
        },
        getNodes: () => this.state.nodes
      }
    };
    return ctx;
  }

  // --- DEFAULT SCRIPTS ---

  _getDefaultOnFileScript() {
    return `// Runs for each file.
// ctx provides: app, node, path, type, log, pause, read, write, parseAst, 
//               evalMetadata, readSidecar, writeSidecar, getSidecarPath

if (!ctx.path.endsWith('.js')) return;

const content = await ctx.read();
if (!content) return;

const ast = ctx.parseAst(content);
if (!ast) {
  ctx.log("Parse failed: " + ctx.path);
  return;
}

// Compliance: Exactly one class?
const classDecls = ast.body.filter(n => 
  n.type === 'ClassDeclaration' || 
  (n.type.includes('Export') && n.declaration?.type === 'ClassDeclaration')
);

if (classDecls.length !== 1) {
  ctx.log("Skipping (not a pure single-class file): " + ctx.path);
  return;
}

const className = classDecls[0].id?.name || classDecls[0].declaration?.id?.name;
const meta = ctx.evalMetadata(content, className);

if (meta && !meta.error) {
  ctx.log("Metadata OK for " + className);
  
  // Read YAML sidecar if it exists
  const yamlContent = await ctx.readSidecar('yaml');
  if (yamlContent) {
    ctx.log("Found YAML sidecar for " + className);
    // You could merge the yaml into the class here, then ctx.write(newContent)
    
    // ctx.pause(); // Pause to inspect or run Live code
  }
} else {
  ctx.log("No valid metadata for " + className);
}`;
  }

  _getDefaultOnDirScript() {
    return `// Runs for each directory
// ctx.log("Entering directory: " + ctx.path);
`;
  }

  _getDefaultLiveScript() {
    return `// Runs immediately when you click "Run Live Code"
ctx.log("Live execution context for: " + (ctx.path || "Workspace Root"));

// Example: Peek at the content
/*
if (ctx.type === 'file') {
  const content = await ctx.read();
  ctx.log("First 100 chars:", content.substring(0, 100).replace(/\\n/g, ' '));
}
*/
`;
  }

  async _walkerReadFileContent(path) {    const goldenPath = this._walkerNormalizePath(path);    if (!goldenPath) {      return null;    }    const app = this.app || null;    if (app?.inMemoryFileStore?.has(goldenPath)) {      return app.inMemoryFileStore.get(goldenPath);    }    const vfs = await this._walkerGetVfs();    if (vfs && typeof vfs.readFile === "function") {      try {        const content = await vfs.readFile(goldenPath, {          nullOnMissing: true        });        if (typeof content === "string") {          return content;        }      } catch (error) {        this._walkerLogReadFallback("vfs.readFile", goldenPath, error);      }    }    if (app?.commands && typeof app.commands.fetchFileContentForApp === "function") {      try {        const content = await app.commands.fetchFileContentForApp(goldenPath);        if (typeof content === "string") {          return content;        }        if (content && typeof content.code === "string") {          return content.code;        }      } catch (error) {        this._walkerLogReadFallback("commands.fetchFileContentForApp", goldenPath, error);      }    }    if (      app?.projectFilesManager &&      typeof app.projectFilesManager.getFileContent === "function"    ) {      try {        const content = await app.projectFilesManager.getFileContent(goldenPath);        if (typeof content === "string") {          return content;        }      } catch (error) {        this._walkerLogReadFallback("projectFilesManager.getFileContent", goldenPath, error);      }    }    return null;  }

  async _walkerGetVfs() {    const app = this.app || null;    if (!app) {      return null;    }    if (typeof app.refreshVirtualFileSystemStores === "function") {      return await app.refreshVirtualFileSystemStores();    }    return app.vfs || null;  }

  _walkerNormalizePath(path) {    if (path && typeof path.toString === "function" && typeof path !== "string") {      path = path.toString();    }    if (typeof path !== "string") {      return "";    }    let key = path.trim();    if (!key) {      return "";    }    const queryIndex = key.indexOf("?");    if (queryIndex >= 0) {      key = key.slice(0, queryIndex);    }    const hashIndex = key.indexOf("#");    if (hashIndex >= 0) {      key = key.slice(0, hashIndex);    }    while (key.includes("//")) {      key = key.split("//").join("/");    }    if (!key.startsWith("/")) {      key = "/" + key;    }    return key;  }

  _walkerLogReadFallback(operation, path, error) {    const message = error && error.message ? error.message : String(error);    if (this.app && typeof this.app.logFileOp === "function") {      this.app.logFileOp("debug", "ProjectWalkerTool VFS read fallback", {        operation,        path,        error: message      });      return;    }    if (this.app?.fileLogger && typeof this.app.fileLogger.log === "function") {      this.app.fileLogger.log("debug", "ProjectWalkerTool VFS read fallback", {        operation,        path,        error: message      });    }  }

}