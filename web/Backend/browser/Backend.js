class Backend {
  async run(env) {
    this.env = env;
    const targetElement = env.container;

    this.pollInterval = null;
    this.serverActive = false;
    this.isScanning = false;
    this.deletedFiles = new Set();
    this.currentResults = [];
    this.sortBy = 'size'; 
    this.pendingAction = null;
    this.projects = [];
    this.activeApp = 'deployer'; 

    this.applyStyles();
    this.render(targetElement);
    this.startPolling();
    this.appendLog("Command console loaded. Port 8000 server active check initiated.");
  }

  applyStyles() {
    applyCss(`
      .unified-container {
        background-color: #0f172a;
        color: #f1f5f9;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 25px;
        min-height: 100vh;
        box-sizing: border-box;
      }
      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #334155;
        padding-bottom: 15px;
        margin-bottom: 20px;
      }
      .app-title {
        margin: 0;
        font-size: 26px;
        font-weight: 800;
        color: #f8fafc;
      }
      .app-subtitle {
        color: #94a3b8;
        font-size: 13px;
        margin-top: 4px;
      }
      .server-badge {
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
      }
      .badge-offline { background-color: #450a0a; color: #fecaca; }
      .badge-online { background-color: #064e3b; color: #a7f3d0; }
      .badge-scanning { background-color: #78350f; color: #fef3c7; }

      .main-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
        align-items: start;
      }
      @media (min-width: 1024px) {
        .main-grid {
          grid-template-columns: 380px 1fr;
        }
      }

      .control-panel-stack {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      .panel-box {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 20px;
      }
      .panel-title {
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 15px;
        color: #38bdf8;
        border-bottom: 1px solid #334155;
        padding-bottom: 8px;
        font-weight: 700;
      }
      .app-selector-dropdown {
        background-color: #0f172a;
        color: #38bdf8;
        border: 1px solid #475569;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        width: 100%;
        outline: none;
      }
      .form-group {
        margin-bottom: 12px;
      }
      .form-group label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .form-group input, .form-group textarea, .form-group select {
        width: 100%;
        padding: 8px 12px;
        background-color: #0f172a;
        border: 1px solid #475569;
        border-radius: 6px;
        color: #f1f5f9;
        font-family: inherit;
        font-size: 13px;
        box-sizing: border-box;
      }
      .form-group textarea {
        resize: vertical;
        height: 55px;
        font-family: monospace;
      }
      .checkbox-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
      }
      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 12px;
        color: #cbd5e1;
      }
      .checkbox-item input {
        margin: 0;
      }

      .btn-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 15px;
      }
      .btn {
        flex: 1;
        padding: 9px 12px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        border: none;
        transition: background-color 0.15s, opacity 0.15s;
        text-align: center;
      }
      .btn-bar .btn {
         min-width: 120px;
      }
      .btn-primary { background-color: #0ea5e9; color: #fff; }
      .btn-primary:hover { background-color: #0284c7; }
      .btn-success { background-color: #10b981; color: #fff; }
      .btn-success:hover { background-color: #059669; }
      .btn-warning { background-color: #f59e0b; color: #fff; }
      .btn-warning:hover { background-color: #d97706; }
      .btn-danger { background-color: #ef4444; color: #fff; }
      .btn-danger:hover { background-color: #dc2626; }
      .btn-secondary { background-color: #475569; color: #fff; }
      .btn-secondary:hover { background-color: #334155; }
      .btn-disabled { opacity: 0.5; cursor: not-allowed; }

      .results-area {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .terminal-prompt-box {
        background-color: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 12px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
      }
      .terminal-prompt-text {
        font-family: monospace;
        font-size: 12px;
        color: #38bdf8;
        word-break: break-all;
      }
      .btn-copy-mini {
        padding: 5px 10px;
        font-size: 11px;
        background-color: #334155;
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 700;
        transition: background-color 0.15s;
      }
      .btn-copy-mini:hover { background-color: #475569; }

      .log-container-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 15px;
      }
      .log-panel {
        background-color: #090d16;
        border: 1px solid #1e293b;
        border-radius: 6px;
        padding: 12px;
        font-family: monospace;
        font-size: 11px;
        color: #38bdf8;
        height: 250px;
        overflow-y: auto;
        white-space: pre-wrap;
        margin: 0;
      }
      .log-action-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .results-container {
        border: 1px solid #334155;
        background-color: #1e293b;
        border-radius: 10px;
        padding: 20px;
      }
      .file-card {
        background-color: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
      }
      .file-info { flex: 1; min-width: 0; }
      .file-name { font-weight: 700; color: #fff; font-size: 14px; margin-bottom: 3px; }
      .file-path { font-family: monospace; font-size: 11px; color: #94a3b8; word-break: break-all; }
      .file-meta { font-size: 11px; color: #38bdf8; margin-top: 5px; font-weight: 500; }
      .file-card.deleted .file-name { text-decoration: line-through; color: #ef4444; }

      .mini-btn-stack {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 85px;
      }
      .btn-mini {
        padding: 4px 6px;
        font-size: 10px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-weight: 700;
        text-transform: uppercase;
        text-align: center;
        transition: background-color 0.15s;
      }
      .btn-play { background-color: #064e3b; color: #a7f3d0; }
      .btn-play:hover { background-color: #065f46; }
      .btn-reveal { background-color: #475569; color: #fff; }
      .btn-reveal:hover { background-color: #5a6a82; }
      .btn-delete { background-color: #7f1d1d; color: #fecaca; }
      .btn-delete:hover { background-color: #991b1b; }

      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #0f172a;
      }
      ::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #475569;
      }
    `, 'unified-console-styles');
  }

  render(targetElement) {
    targetElement.innerHTML = '';

    const container = makeElement('div', { className: 'unified-container' });

    // Header
    this.badge = makeElement('div', { className: 'server-badge badge-offline' }, 'OFFLINE');
    const header = makeElement('div', { className: 'header-row' }, [
      makeElement('div', {}, [
        makeElement('h1', { className: 'app-title' }, 'Command & Deploy Console'),
        makeElement('div', { className: 'app-subtitle' }, 'Unified task execution system running on Port 8000')
      ]),
      this.badge
    ]);

    // Left Column Side Stack
    const sideStack = makeElement('div', { className: 'control-panel-stack' });

    // App Selector Dropdown
    this.appSelector = makeElement('select', {
      className: 'app-selector-dropdown',
      onchange: (e) => this.switchApp(e.target.value)
    }, [
      makeElement('option', { value: 'deployer', selected: this.activeApp === 'deployer' }, '⚡ Main Site Deployer'),
      makeElement('option', { value: 'scanner', selected: this.activeApp === 'scanner' }, '📂 Big File Searcher')
    ]);
    sideStack.appendChild(this.appSelector);

    // Form A: Site Deployment Panel
    this.dryRunCheck = makeElement('input', { type: 'checkbox', checked: true });
    this.forceCheck = makeElement('input', { type: 'checkbox' });
    this.commentsCheck = makeElement('input', { type: 'checkbox', checked: true });

    this.deployPanel = makeElement('div', { className: 'panel-box' }, [
      makeElement('h2', { className: 'panel-title' }, 'Main Site Deployer'),
      makeElement('div', { className: 'checkbox-row' }, [
        makeElement('label', { className: 'checkbox-item' }, [this.dryRunCheck, 'Dry Run (Test Mode)']),
        makeElement('label', { className: 'checkbox-item' }, [this.forceCheck, 'Force (Upload All Files)']),
        makeElement('label', { className: 'checkbox-item' }, [this.commentsCheck, 'Also Deploy Comments API'])
      ]),
      makeElement('div', { className: 'btn-bar' }, [
        makeElement('button', { className: 'btn btn-primary', onclick: () => this.checkHealth() }, 'Health Check'),
        makeElement('button', { className: 'btn btn-primary', onclick: () => this.fetchProjects() }, 'Get Projects'),
        makeElement('button', { className: 'btn btn-secondary', onclick: () => this.compileBundle('vibes') }, 'Compile Bundle'),
        makeElement('button', { className: 'btn btn-secondary', onclick: () => this.deployBundle('vibes') }, 'Deploy Bundle'),
        makeElement('button', { className: 'btn btn-success', onclick: () => this.deployMainSite() }, 'Deploy Main'),
        makeElement('button', { className: 'btn btn-success', onclick: () => this.deployComments() }, 'Deploy Comments'),
        makeElement('button', { className: 'btn btn-warning', style: { width: '100%', marginTop: '5px' }, onclick: () => this.runFullDeployFlow() }, 'Run Full Deploy Flow')
      ])
    ]);
    sideStack.appendChild(this.deployPanel);

    // Form B: Disk Scanner Panel
    this.dirInput = makeElement('input', { type: 'text', value: '/Users/rob' });
    this.sizeInput = makeElement('input', { type: 'number', value: '50' });
    this.moveTargetInput = makeElement('input', { type: 'text', value: '', placeholder: 'Target path' });
    this.skipDirsInput = makeElement('textarea', {}, 'node_modules, .git, .cache, Library, System, Applications, .Trash');
    this.skipHiddenCheck = makeElement('input', { type: 'checkbox', checked: true });

    this.scannerPanel = makeElement('div', { className: 'panel-box', style: { display: 'none' } }, [
      makeElement('h2', { className: 'panel-title' }, 'Big File Searcher'),
      makeElement('div', { className: 'form-group' }, [makeElement('label', {}, 'Starting Path:'), this.dirInput]),
      makeElement('div', { className: 'form-group' }, [makeElement('label', {}, 'Min File Size (MB):'), this.sizeInput]),
      makeElement('div', { className: 'form-group' }, [makeElement('label', {}, 'Move Target Path:'), this.moveTargetInput]),
      makeElement('div', { className: 'form-group' }, [makeElement('label', {}, 'Skip Directories:'), this.skipDirsInput]),
      makeElement('label', { className: 'checkbox-item', style: { marginBottom: '10px' } }, [this.skipHiddenCheck, 'Skip Hidden Folders']),
      makeElement('div', { className: 'btn-bar' }, [
        this.startBtn = makeElement('button', { className: 'btn btn-success', onclick: () => this.startScan() }, 'Start Scan'),
        this.stopBtn = makeElement('button', { className: 'btn btn-danger btn-disabled', onclick: () => this.stopScan() }, 'Stop')
      ])
    ]);
    sideStack.appendChild(this.scannerPanel);

    // Logs Container
    this.logConsole = makeElement('pre', { className: 'log-panel' }, 'Console log active.');
    const logActionRow = makeElement('div', { className: 'log-action-row' }, [
      makeElement('span', { style: { fontSize: '10px', color: '#64748b', fontWeight: 'bold' } }, 'TELEMETRY'),
      makeElement('div', { style: { display: 'flex', gap: '5px' } }, [
        makeElement('button', { className: 'btn-copy-mini', onclick: () => this.clearLog() }, 'Clear'),
        makeElement('button', {
          className: 'btn-copy-mini',
          onclick: () => {
            navigator.clipboard.writeText(this.logConsole.textContent);
            this.appendLog("✓ Complete log copied to clipboard.");
          }
        }, 'Copy')
      ])
    ]);

    this.logBlock = makeElement('div', { className: 'log-container-wrapper' }, [
      this.logConsole,
      logActionRow
    ]);
    sideStack.appendChild(this.logBlock);

    // Right Column Area
    const resultsArea = makeElement('div', { className: 'results-area' });

    // Absolute start server prompt
    const terminalPrompt = "node /Users/rob/source/recursi/web/Backend/server/Starter.js";
    this.terminalPromptBox = makeElement('div', { className: 'terminal-prompt-box' }, [
      makeElement('div', {}, [
        makeElement('span', { style: { fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', display: 'block', marginBottom: '3px' } }, 'LAUNCH BACKEND IN TERMINAL (ABSOLUTE PATH):'),
        makeElement('code', { className: 'terminal-prompt-text' }, terminalPrompt)
      ]),
      makeElement('button', {
        className: 'btn-copy-mini',
        onclick: () => {
          navigator.clipboard.writeText(terminalPrompt);
          this.appendLog("✓ Server terminal command copied to clipboard.");
        }
      }, 'Copy')
    ]);
    resultsArea.appendChild(this.terminalPromptBox);

    // Results container
    this.resultsWrapper = makeElement('div', { className: 'results-container' }, [
      makeElement('div', { style: { padding: '40px', color: '#64748b', textAlign: 'center' } }, 'No operations run yet.')
    ]);
    resultsArea.appendChild(this.resultsWrapper);

    // Layout Assembly
    const mainGrid = makeElement('div', { className: 'main-grid' }, [
      sideStack,
      resultsArea
    ]);

    container.appendChild(header);
    container.appendChild(mainGrid);
    targetElement.appendChild(container);

    this.switchApp(this.activeApp);
  }

  switchApp(appName) {
    this.activeApp = appName;
    if (appName === 'deployer') {
      this.deployPanel.style.display = 'block';
      this.scannerPanel.style.display = 'none';
      this.renderProjectsList();
    } else {
      this.deployPanel.style.display = 'none';
      this.scannerPanel.style.display = 'block';
      this.renderFileList();
    }
  }

  clearLog() {
    this.logConsole.textContent = '';
  }

  async runRemote(serverFn, params = {}) {
    const response = await fetch('http://localhost:8000/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: serverFn.toString(),
        params
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Server bridge failed.');
    }
    return await response.json();
  }

  appendLog(msg) {
    this.logConsole.textContent += `[${new Date().toLocaleTimeString()}] ` + msg + '\n';
    this.logConsole.scrollTop = this.logConsole.scrollHeight;
  }

  appendLines(lines) {
    if (Array.isArray(lines)) {
      lines.forEach(l => this.appendLog(l));
    } else {
      this.appendLog(lines);
    }
  }

  getFlags() {
    return {
      isTest: !!this.dryRunCheck.checked,
      isForce: !!this.forceCheck.checked,
      deployComments: !!this.commentsCheck.checked
    };
  }

  async checkHealth() {
    try {
      const data = await this.runRemote(async (env) => {
        return { message: "Unified server is listening and healthy on Port 8000." };
      });
      this.appendLog(data.result.message);
    } catch(e) {
      this.appendLog("Server offline or not responding on Port 8000.");
    }
  }

  async fetchProjects() {
    this.appendLog("Gathering cataloged repository projects...");
    try {
      const data = await this.runRemote(async (env) => {
        const CatalogClass = await env.getClass('DeployCatalog');
        const projectNames = await CatalogClass.getProjectNames(env.options, { fs: env.fsPromises, fsSync: env.fs, path: env.path, DeployConfig: await env.getClass('DeployConfig') });
        return projectNames;
      });
      this.projects = data.result || [];
      this.renderProjectsList();
      this.appendLog(`Fetched s${this.projects.length} repository projects.`);
    } catch(e) {
      this.appendLog("Failed to fetch projects: " + e.message);
    }
  }

  renderProjectsList() {
    if (this.activeApp !== 'deployer') return;
    this.resultsWrapper.innerHTML = '';
    const header = makeElement('h3', { style: { color: '#38bdf8', marginTop: '0' } }, 'Repository Projects');
    const list = makeElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
    
    if (this.projects.length === 0) {
      this.resultsWrapper.appendChild(
        makeElement('div', { style: { color: '#64748b', padding: '15px' } }, 'No projects gathered yet. Click "Get Projects" to scan.')
      );
      return;
    }

    this.projects.forEach(p => {
      list.appendChild(makeElement('div', { style: { padding: '8px 12px', backgroundColor: '#0f172a', borderRadius: '4px', border: '1px solid #334155' } }, p));
    });
    this.resultsWrapper.appendChild(header);
    this.resultsWrapper.appendChild(list);
  }

  async deployMainSite() {
    const flags = this.getFlags();
    this.appendLog(`Starting Main Site Deploy (Dry Run: ${flags.isTest}, Force: ${flags.isForce})...`);
    try {
      const data = await this.runRemote(async (env) => {
        const DeployerClass = await env.getClass('MainSiteDeployer');
        
        const deps = {
          fs: env.fsPromises,
          fsSync: env.fs,
          path: env.path,
          os: env.os,
          http: env.http,
          SftpClient: env.SftpClient,
          pathToFileURL: env.pathToFileURL,
          DeployLogger: await env.getClass('DeployLogger'),
          PathUtils: await env.getClass('PathUtils'),
          DeployConfig: await env.getClass('DeployConfig'),
          FileWalker: await env.getClass('FileWalker'),
          DeployCatalog: await env.getClass('DeployCatalog'),
          SftpHelper: await env.getClass('SftpHelper'),
          ProjectsService: await env.getClass('ProjectsService'),
        };

        const res = await DeployerClass.deploy(env.params, env.options, deps);
        return res;
      }, { site: 'recursi', isTest: flags.isTest, isForce: flags.isForce });

      this.appendLines(data.result.logs || data.logs);
      if (data.result.success) {
        this.appendLog("✅ Main site deploy completed successfully.");
      } else {
        this.appendLog("✖ Main site deploy failed: " + data.result.error);
      }
    } catch(e) {
      this.appendLog("Deployment task failed: " + e.message);
    }
  }

  async deployComments() {
    const flags = this.getFlags();
    this.appendLog(`Starting Comments Deploy (Dry Run: ${flags.isTest})...`);
    try {
      const data = await this.runRemote(async (env) => {
        const DeployerClass = await env.getClass('CommentsDeployer');
        
        const deps = {
          fs: env.fsPromises,
          fsSync: env.fs,
          path: env.path,
          os: env.os,
          http: env.http,
          SftpClient: env.SftpClient,
          pathToFileURL: env.pathToFileURL,
          DeployLogger: await env.getClass('DeployLogger'),
          PathUtils: await env.getClass('PathUtils'),
          DeployConfig: await env.getClass('DeployConfig'),
          FileWalker: await env.getClass('FileWalker'),
          DeployCatalog: await env.getClass('DeployCatalog'),
          SftpHelper: await env.getClass('SftpHelper'),
          ProjectsService: await env.getClass('ProjectsService'),
        };

        const res = await DeployerClass.deploy(env.params, env.options, deps);
        return res;
      }, { isTest: flags.isTest, remotePath: 'recursi.dev/commentsApi' });

      this.appendLines(data.result.logs || data.logs);
      if (data.result.success) {
        this.appendLog("✅ Comments deploy completed successfully.");
      } else {
        this.appendLog("✖ Comments deploy failed: " + data.result.error);
      }
    } catch(e) {
      this.appendLog("Comments deployment task failed: " + e.message);
    }
  }

  async compileBundle(projectName = 'vibes') {
    this.appendLog(`Compiling external bundle for ${projectName} outside the repository...`);
    try {
      const data = await this.runRemote(async (env) => {
        const fs = env.require('fs');
        const path = env.require('path');
        
        env.log(`[Server-Diagnostic] projectRoot: ${env.options.projectRoot}`);
        env.log(`[Server-Diagnostic] webRoot: ${env.options.webRoot}`);

        const serverAppDir = path.join(env.options.webRoot, 'Backend', 'server');

        const searchPaths = [
          path.join(serverAppDir, 'ProjectBundler.js'),
          path.join(serverAppDir, 'utils', 'ProjectBundler.js'),
          path.join(serverAppDir, 'apps/BigFileFinder', 'ProjectBundler.js'),
          path.join(serverAppDir, 'apps/DeployRecursi', 'ProjectBundler.js')
        ];

        env.log("[Server-Diagnostic] Checking ProjectBundler.js locations:");
        searchPaths.forEach(p => {
          const exists = fs.existsSync(p);
          env.log(`  Path: ${p} | Exists: ${exists}`);
          if (exists) {
            const content = fs.readFileSync(p, 'utf8');
            env.log(`    - Has generateExternalBundle: ${content.includes('generateExternalBundle')}`);
            env.log(`    - Has deployExternalBundle: ${content.includes('deployExternalBundle')}`);
            const stat = fs.statSync(p);
            env.log(`    - mtimeMs: ${stat.mtimeMs}`);
          }
        });

        if (global.classCache && global.classCache['ProjectBundler']) {
          env.log(`[Server-Diagnostic] classCache['ProjectBundler'] found in memory.`);
          env.log(`    - Cached mtime: ${global.classCache['ProjectBundler'].mtime}`);
          const cachedClass = global.classCache['ProjectBundler'].Class;
          env.log(`    - Cached methods: ${Object.getOwnPropertyNames(cachedClass)}`);
        } else {
          env.log(`[Server-Diagnostic] classCache['ProjectBundler'] is NOT currently cached.`);
        }

        const BundlerClass = await env.getClass('ProjectBundler');
        env.log(`[Server-Diagnostic] Loaded BundlerClass type: ${typeof BundlerClass}`);
        if (BundlerClass) {
          env.log(`[Server-Diagnostic] Loaded BundlerClass methods: ${Object.getOwnPropertyNames(BundlerClass)}`);
        }

        const res = await BundlerClass.generateExternalBundle(
          env.params.projectName,
          env.options.webRoot,
          env.options.projectRoot,
          env.fsPromises,
          env.path,
          env.os
        );
        return res;
      }, { projectName });

      if (data.success && data.result) {
        this.appendLog(`✅ Bundle generated outside repo: ${data.result.destPath} (${(data.result.sizeBytes / 1024).toFixed(1)} KB)`);
      } else {
        this.appendLog(`✖ Bundle generation failed: ` + data.error);
      }
    } catch (e) {
      this.appendLog(`Bundling failed: ${e.message}`);
    }
  }

  async deployBundle(projectName = 'vibes') {
      this.appendLog(`Moving compiled external bundle for ${projectName} into the repository...`);
      try {
        const data = await this.runRemote(async (env) => {
          const fs = env.require('fs');
          const path = env.require('path');

          const BundlerClass = await env.getClass('ProjectBundler');
          const SftpHelper = await env.getClass('SftpHelper');
          const SftpClient = env.SftpClient;
          const DeployConfig = await env.getClass('DeployConfig');
          const pathToFileURL = env.pathToFileURL;

          const deps = {
            DeployConfig,
            SftpHelper,
            SftpClient,
            pathToFileURL,
            fsSync: env.fsSync
          };

          const res = await BundlerClass.deployExternalBundle(
            env.params.projectName,
            env.options.webRoot,
            env.options.projectRoot,
            env.fsPromises,
            env.path,
            deps
          );
          return res;
        }, { projectName });

        if (data.success && data.result) {
          this.appendLog(`✅ Bundle deployed remotely: ${data.result.remoteDestPath}`);
        } else {
          this.appendLog(`✖ Bundle deployment failed: ` + data.error);
        }
      } catch (e) {
        this.appendLog(`Deployment failed: ${e.message}`);
      }
    }

  async runFullDeployFlow() {
    this.appendLog("=== STARTING FULL DEPLOYMENT FLOW ===");
    await this.checkHealth();
    await this.fetchProjects();
    await this.compileBundle('vibes');
    await this.deployBundle('vibes');
    await this.deployMainSite();
    if (this.commentsCheck.checked) {
      await this.deployComments();
    }
    this.appendLog("=== FULL DEPLOYMENT FLOW COMPLETE ===");
  }

  async startScan() {
    if (!this.serverActive || this.isScanning) return;
    this.deletedFiles.clear();
    this.currentResults = [];

    const directory = this.dirInput.value.trim();
    const minSizeMB = this.sizeInput.value.trim();
    const skipDirs = this.skipDirsInput.value.trim();
    const skipHidden = this.skipHiddenCheck.checked;
    const targetDir = this.moveTargetInput.value.trim();

    this.appendLog(`Triggering big file scan starting at: s${directory}...`);

    try {
      await this.runRemote(async (env) => {
        const ScannerClass = await env.getClass('BigFileScanner');
        const scanner = env.getScannerInstance(ScannerClass);
        const params = env.params;
        const skipList = (params.skipDirs || '').split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);

        scanner.startScan(
          params.directory || '.',
          parseFloat(params.minSizeMB) || 50,
          skipList,
          !!params.skipHidden,
          params.targetDir || ''
        );
        return { status: 'started' };
      }, { directory, minSizeMB, skipDirs, skipHidden, targetDir });

      this.pollStatus();
    } catch(e) {
      this.appendLog("Scan start failed: " + e.message);
    }
  }

  async stopScan() {
    if (!this.serverActive || !this.isScanning) return;
    this.appendLog("Halting file scanner loop...");
    try {
      await this.runRemote(async (env) => {
        const ScannerClass = await env.getClass('BigFileScanner');
        const scanner = env.getScannerInstance(ScannerClass);
        scanner.abortRequested = true;
        return { status: 'aborting' };
      });
      this.pollStatus();
    } catch(e) {
      this.appendLog("Halt scanner command failed: " + e.message);
    }
  }

  async pollStatus() {
    try {
      const data = await this.runRemote(async (env) => {
        const ScannerClass = await env.getClass('BigFileScanner');
        const scanner = env.getScannerInstance(ScannerClass);
        return {
          scanning: scanner.scanning,
          progress: scanner.progress,
          scanned: scanner.filesScannedCount,
          found: scanner.filesFoundCount,
          results: scanner.results
        };
      });

      this.serverActive = true;
      this.isScanning = data.result.scanning;

      if (this.isScanning) {
        this.badge.className = 'server-badge badge-scanning';
        this.badge.textContent = 'SCANNING (' + data.result.scanned.toLocaleString() + ')';
        this.startBtn.classList.add('btn-disabled');
        this.stopBtn.classList.remove('btn-disabled');
      } else {
        this.badge.className = 'server-badge badge-online';
        this.badge.textContent = 'ONLINE';
        this.startBtn.classList.remove('btn-disabled');
        this.stopBtn.classList.add('btn-disabled');
      }

      this.currentResults = data.result.results || [];
      if (this.activeApp === 'scanner') {
        this.renderFileList();
      }
    } catch(e) {
      this.serverActive = false;
      this.isScanning = false;
      this.badge.className = 'server-badge badge-offline';
      this.badge.textContent = 'OFFLINE';
      this.startBtn.classList.remove('btn-disabled');
      this.stopBtn.classList.add('btn-disabled');
    }
  }

  renderFileList() {
    if (this.activeApp !== 'scanner') return;
    this.resultsWrapper.innerHTML = '';
    const header = makeElement('h3', { style: { color: '#38bdf8', marginTop: '0' } }, `Matches Found (${this.currentResults.length})`);
    this.resultsWrapper.appendChild(header);

    const list = makeElement('div');
    
    if (this.currentResults.length === 0) {
      this.resultsWrapper.appendChild(
        makeElement('div', { style: { color: '#64748b', padding: '40px', textAlign: 'center' } }, 'No big files matching criteria found. Click "Start Scan" to run.')
      );
      return;
    }

    this.currentResults.forEach(file => {
      const isDeleted = this.deletedFiles.has(file.path);
      const isVideo = file.path.match(/\.(mp4|mov|webm)$/i);
      const cardClass = `file-card ${isDeleted ? 'deleted' : ''}`;

      const fileName = file.path.split(/[\\/]/).pop();
      const dirPath = file.path.substring(0, file.path.length - fileName.length);
      const dateStr = new Date(file.modified).toISOString().split('T')[0];

      const actionCell = makeElement('div', { className: 'mini-btn-stack' });
      if (isDeleted) {
        actionCell.appendChild(makeElement('span', { style: { color: '#ef4444', fontSize: '10px', fontStyle: 'bold', textAlign: 'center' } }, 'DELETED'));
      } else {
        if (isVideo) {
          actionCell.appendChild(makeElement('button', { className: 'btn-mini btn-play', onclick: () => this.playVideo(file.path, fileName) }, 'Play'));
        }
        actionCell.appendChild(makeElement('button', { className: 'btn-mini btn-reveal', onclick: () => this.revealFile(file.path) }, 'Reveal'));
        actionCell.appendChild(makeElement('button', { className: 'btn-mini btn-delete', onclick: () => this.deleteFile(file.path) }, 'Delete'));
      }

      const card = makeElement('div', { className: cardClass }, [
        makeElement('div', { className: 'file-info' }, [
          makeElement('div', { className: 'file-name' }, fileName),
          makeElement('div', { className: 'file-path' }, dirPath),
          makeElement('div', { className: 'file-meta' }, `${file.sizeMB} MB | ${dateStr}`)
        ]),
        actionCell
      ]);

      list.appendChild(card);
    });

    this.resultsWrapper.appendChild(list);
  }

  playVideo(filePath, fileName) {
    const videoUrl = `http://localhost:8000/video?path=${encodeURIComponent(filePath)}`;
    const playerBox = UITools.makeDialog({
      env: this.env,
      title: `Inspect: ${fileName}`,
      size: [640, 410],
      position: [420, 120]
    });

    const videoElement = makeElement('video', {
      src: videoUrl,
      controls: true,
      autoplay: true,
      style: { width: '100%', height: '100%', backgroundColor: '#000', borderRadius: '4px' }
    });
    playerBox.contentElement.appendChild(videoElement);
  }

  async revealFile(filePath) {
    try {
      await this.runRemote(async (env) => {
        const fs = env.require('fs');
        const os = env.require('os');
        const path = env.require('path');
        const { exec } = env.require('child_process');
        const targetPath = env.params.filePath;

        const platform = os.platform();
        let cmd = '';
        if (platform === 'win32') cmd = `explorer.exe /select,"${targetPath.replace(/"/g, '\\"')}"`;
        else if (platform === 'darwin') cmd = `open -R "${targetPath.replace(/"/g, '\\"')}"`;
        else cmd = `xdg-open "${path.dirname(targetPath).replace(/"/g, '\\"')}"`;

        exec(cmd);
        return { success: true };
      }, { filePath });
    } catch(e) {
      alert("Could not reveal file: " + e.message);
    }
  }

  async deleteFile(filePath) {
    if (!confirm(`Are you sure you want to permanently delete this file?\n\n${filePath}`)) return;
    try {
      await this.runRemote(async (env) => {
        const fs = env.require('fs');
        const targetPath = env.params.filePath;
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
        return { success: true };
      }, { filePath });
      this.deletedFiles.add(filePath);
      this.renderFileList();
    } catch(e) {
      alert("Delete failed: " + e.message);
    }
  }

  startPolling() {
    this.pollStatus();
    this.pollInterval = setInterval(() => this.pollStatus(), 1000);
  }

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}