class TreeWalkerDialog {
  constructor(app) {
    this.app = app;
    this.isRunning = false;
    this.isPaused = false;
    this._stopFlag = false;
    this._resumeFn = null;
    this.currentNode = null;
    this.lastPausedNode = null;
    this.lastPausedContent = null;
    this.lastPausedMeta = null;
    this.fileList = [];
    this.fileListIndex = 0;
    this.stats = { visited: 0, skipped: 0, errors: 0, modified: 0 };
    this.slots = this._loadSlots();
    this.dialog = null;
    this.ui = {};
    this._editors = {};
    this.results = [];
    this._outputText = '';
    this._outputOpen = false;
    this._mountHost = null;
    this._externalOnClose = null;
  }

  show() {
    if (this.dialog) {
      this.dialog.setZOnTop?.();
      return;
    }

    const root = this._buildCompactSurface({
      standalone: true,
      onClose: () => {
        this._handleStop();
        this._saveSlots();
        this.dialog = null;
      },
    });

    this.dialog = UITools.makeDialog({
      title: '🌲 Tree Walker',
      content: root,
      width: '760px',
      height: '560px',
      resizable: true,
      onClose: () => {
        this._handleStop();
        this._saveSlots();
        this.dialog = null;
      },
    });
  }

  // ── Persistence ───────────────────────────────────────────────
  _loadSlots() {
    try {
      return (
        JSON.parse(localStorage.getItem('treewalker_v2_slots') || 'null') ||
        this._defaultSlots()
      );
    } catch (e) {
      return this._defaultSlots();
    }
  }

  _defaultSlots() {
    return {
      onFile: `// Called for every matched file.\n// args: { path, content, meta, sidecarMd, sidecarYaml }\n// env: { readFile, writeFile, deleteFile, moveFile, log, acorn, app }\n// Return { skip:true } to skip, { pause:true } to pause here.\nasync function onFile(node, env, walker) {\n  env.log(node.path);\n}`,
      onDir: `// Called at each directory boundary.\n// Return { skip:true } to skip entire directory.\nasync function onDir(dirPath, env, walker) {\n  if (dirPath.includes('node_modules') || dirPath.includes('.git')) return { skip: true };\n}`,
      onPause: `// Runs when you hit '▶ Run REPL' while paused.\n// walker.node / walker.content / walker.meta are the paused node.\nasync function onPause(node, env, walker) {\n  env.log('Paused at: ' + node.path);\n  env.log(JSON.stringify(node.meta, null, 2));\n}`,
      onExport:`// Runs after walk completes - build your export class here.\n// walker.results is an array you can push to from onFile.\nasync function onExport(results, env, walker) {\n  const lines = ['class WalkResults {'];\n  lines.push('\\n');\n  for (const r of results) {\n    lines.push('  // ' + r.path);\n  }\n  lines.push('}');\n  const code = lines.join('\\n');\n  env.log(code);\n  // env.writeFile('/vibes/docs/WalkResults.js', code);\n}`,
    };
  }

  _saveSlots() {
    const saved = {};
    for (const [name, ed] of Object.entries(this._editors)) {
      saved[name] = ed ? ed.getValue() : this.slots[name] || '';
    }
    // fill any missing
    for (const k of Object.keys(this.slots)) {
      if (!saved[k]) saved[k] = this.slots[k];
    }
    this.slots = saved;
    try {
      localStorage.setItem('treewalker_v2_slots', JSON.stringify(saved));
    } catch (e) {}
  }

  // ── UI Build ───────────────────────────────────────────────────
  _build() {
    return this._buildCompactSurface({ standalone: true });
  }

  _initEditor(name, pane) {
    const code = this.slots[name] || '';
    if (typeof EditorView !== 'undefined' && typeof javascript === 'function') {
      try {
        const view = new EditorView({
          state: EditorState.create({
            doc: code,
            extensions: [
              lineNumbers(),
              history(),
              javascript(),
              oneDark,
              EditorView.lineWrapping,
              keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
            ],
          }),
          parent: pane,
        });
        view.dom.style.height = '100%';
        view.dom.style.fontSize = '12px';
        this._editors[name] = {
          getValue: () => view.state.doc.toString(),
          setValue: (val) => {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: val },
            });
          },
        };
        return;
      } catch (e) {}
    }
    // Fallback textarea
    const ta = makeElement('textarea', {
      style: {
        width: '100%',
        height: '100%',
        background: '#1e1e1e',
        color: '#eee',
        border: 'none',
        padding: '6px',
        fontFamily: 'monospace',
        fontSize: '12px',
        resize: 'none',
        boxSizing: 'border-box',
      },
    });
    ta.value = code;
    pane.appendChild(ta);
    this._editors[name] = {
      getValue: () => ta.value,
      setValue: (val) => {
        ta.value = val;
      },
    };
  }

  _populateTreeSelect() {
    this.ui.treeSelect.innerHTML = '';
    const trees = this._getAvailableTrees();
    trees.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.label;
      this.ui.treeSelect.appendChild(opt);
    });
  }

  _getAvailableTrees() {
    const trees = [];
    const pfm =
      this._attachedProjectFilesManager ||
      this.app?.projectFilesManager ||
      null;

    if (this._sourceTreeView) {
      trees.push({
        id: 'attached',
        label: '🎯 Attached Tree',
        treeView: this._sourceTreeView,
        filter: (path) => {
          if (this._sourceRootPath && this._sourceRootPath !== '/') {
            return String(path).startsWith(this._sourceRootPath + '/');
          }
          return true;
        },
        attached: true,
      });
    }

    if (!pfm) return trees;

    if (pfm.getFileTreeViews) {
      let i = 0;
      const views = pfm.getFileTreeViews();
      views.forEach((treeView) => {
        if (!treeView) return;
        if (treeView === this._sourceTreeView) return;

        const rootId = pfm.getTreeRootId ? pfm.getTreeRootId(treeView) : '';
        const label = rootId ? `🪟 Tree: ${rootId}` : `🪟 Float ${++i}`;

        trees.push({
          id: 'float_' + i,
          label,
          treeView,
          filter: () => true,
        });
      });
    }

    if (trees.length > 1) {
      trees.unshift({
        id: 'all',
        label: '🌍 All Trees',
        treeView: null,
        filter: () => true,
      });
    }

    return trees;
  }

  // ── Walk Engine ────────────────────────────────────────────────
  async _handleRun() {
    if (this.isRunning && !this.isPaused) return;
    if (this.isPaused) {
      this._resume();
      return;
    }

    this._saveSlots();
    this.stats = { visited: 0, skipped: 0, errors: 0, modified: 0 };
    this.results = [];
    this._stopFlag = false;
    this.isRunning = true;
    this.isPaused = false;
    this.fileListIndex = 0;

    this._setBtn(this.ui.runBtn, '⏸', '#e65100');
    if (this.ui.pauseBtn) this.ui.pauseBtn.disabled = false;
    if (this.ui.stopBtn) this.ui.stopBtn.disabled = false;
    if (this.ui.runPauseBtn) this.ui.runPauseBtn.disabled = true;

    this._outputText = '';
    if (this.ui.logEl) this.ui.logEl.value = '';
    this._updateOutputSummary();

    this.log('Starting walk');
    this.fileList = this._buildFileList();
    this.log('Found ' + this.fileList.length + ' files');

    await this._walkList();

    if (!this._stopFlag) {
      this.log('Done. ' + JSON.stringify(this.stats));
      await this._runExport();
    }

    this._resetControls();
  }

  _buildFileList() {
    const rootFilter =
      this.ui?.rootInput?.value?.trim?.() ||
      this.rootPath ||
      this._launchPath ||
      this._sourceRootPath ||
      '';

    const extFilter = this.ui?.filterInput?.value?.trim?.() || '';
    const selectedId =
      this.ui?.treeSelect?.value || (this._sourceTreeView ? 'attached' : 'all');

    const trees = this._getAvailableTrees();
    const selected = trees.find((tree) => tree.id === selectedId);

    const files = [];
    const seen = new Set();

    const addFromNodesMap = (nodesMap, treeFilter) => {
      if (!nodesMap) return;

      for (const [key, node] of nodesMap) {
        if (node.type !== 'file') continue;
        if (seen.has(key)) continue;
        if (treeFilter && !treeFilter(key)) continue;

        // FIX: Include library files if selected tree is all or library
        const includeLib =
          this._includeLibrary ||
          selectedId === 'all' ||
          selectedId === 'library' ||
          selected?.id === 'library';
        if (!includeLib && key.startsWith('/library/')) continue;

        if (rootFilter && rootFilter !== '/' && !key.startsWith(rootFilter))
          continue;
        if (extFilter && !key.endsWith(extFilter)) continue;

        seen.add(key);
        files.push(key);
      }
    };

    if (this._sourceTreeView && (!selected || selectedId === 'attached')) {
      addFromNodesMap(this._sourceTreeView.nodesMap, (path) => {
        if (this._sourceRootPath && this._sourceRootPath !== '/') {
          return String(path).startsWith(this._sourceRootPath + '/');
        }
        return true;
      });
      return files.sort();
    }

    if (selectedId === 'all') {
      for (const tree of trees) {
        if (tree.id === 'all') continue;
        if (tree.treeView?.nodesMap) {
          addFromNodesMap(tree.treeView.nodesMap, tree.filter);
        }
      }
    } else if (selected?.treeView?.nodesMap) {
      addFromNodesMap(selected.treeView.nodesMap, selected.filter);
    }

    return files.sort();
  }

  async _walkList() {
    const onDirFn = this._compile('onDir');
    const onFileFn = this._compile('onFile');
    let lastDir = null;

    for (let i = this.fileListIndex; i < this.fileList.length; i++) {
      if (this._stopFlag) break;
      this.fileListIndex = i;

      const path = this.fileList[i];
      const dir = path.substring(0, path.lastIndexOf('/'));

      if (dir !== lastDir) {
        lastDir = dir;

        if (onDirFn) {
          try {
            const result = await onDirFn(dir, this._makeEnv(), this);
            if (result?.skip) {
              const skipped = this.fileList
                .slice(i)
                .filter((p) => p.startsWith(dir + '/'));
              this.stats.skipped += skipped.length;
              i += skipped.length - 1;
              this.log(
                'Skipped dir: ' + dir + ' (' + skipped.length + ' files)'
              );
              continue;
            }
          } catch (error) {
            this.stats.errors++;
            this.log('onDir error: ' + error.message);
            this._highlightInTree(path, 'error', {
              label: 'ERR',
              title: error.message,
            });
          }
        }
      }

      await this._waitIfPaused();
      if (this._stopFlag) break;

      this.currentNode = path;

      if (this.ui.nodeBar) {
        this.ui.nodeBar.textContent = '→ ' + path;
        this.ui.nodeBar.style.display = 'block';
      }

      if (this.ui.progressLabel) {
        this.ui.progressLabel.textContent = `${i + 1}/${this.fileList.length}`;
      }

      if (this._hasBreakpoint(path)) {
        this._highlightInTree(path, 'breakpoint', {
          label: 'BREAK',
          title: 'Breakpoint: ' + path,
          clearCurrent: false,
        });

        this._handlePause();
        this.log('Breakpoint hit: ' + path);
        await this._waitIfPaused();
        if (this._stopFlag) break;
      }

      this._highlightInTree(path, 'current', {
        label: 'WALK',
        title: path,
        behavior: this.ui?.delaySlider?.value === '0' ? 'auto' : 'smooth',
      });

      const node = await this._buildNodeForPath(path);

      if (!node || node.content === null || node.content === undefined) {
        this.stats.skipped++;
        this._highlightInTree(path, 'skipped', {
          label: 'MISS',
          title: 'Could not read file',
        });
        continue;
      }

      this.lastPausedNode = node;
      this.lastPausedContent = node.content;
      this.lastPausedMeta = node.meta;

      if (onFileFn) {
        try {
          const result = await onFileFn(node, this._makeEnv(), this);

          if (result?.skip) {
            this.stats.skipped++;
            this._highlightInTree(path, 'skipped', {
              label: 'SKIP',
              title: path,
            });
            continue;
          }

          if (result?.pause) {
            this._handlePause();
            this._highlightInTree(path, 'paused', {
              label: 'PAUSE',
              title: 'Paused at ' + path,
              clearCurrent: false,
            });
            await this._waitIfPaused();
          }

          if (result?.modified) {
            this.stats.modified++;
            this._highlightInTree(path, 'modified', {
              label: 'MOD',
              title: path,
            });
          }
        } catch (error) {
          this.stats.errors++;
          this.log(path.split('/').pop() + ': ' + error.message);
          this._highlightInTree(path, 'error', {
            label: 'ERR',
            title: error.message,
          });
        }
      }

      this.stats.visited++;

      if (this.ui.progressLabel) {
        this.ui.progressLabel.textContent =
          `${i + 1}/${this.fileList.length} ` +
          `V:${this.stats.visited} E:${this.stats.errors} M:${this.stats.modified}`;
      }

      const delay = Math.max(
        0,
        parseInt(this.ui?.delaySlider?.value || '0', 10) || 0
      );

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (i % 18 === 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
  }

  _highlightInTree(path, state = 'current', details = {}) {
    const trees = this._getAvailableTrees();
    const selectedId =
      this.ui?.treeSelect?.value || (this._sourceTreeView ? 'attached' : 'all');

    let candidates = [];

    if (this._sourceTreeView?.nodesMap?.has?.(path)) {
      candidates.push({
        id: 'attached',
        treeView: this._sourceTreeView,
        attached: true,
      });
    }

    if (!candidates.length && selectedId === 'all') {
      candidates = trees.filter((tree) => tree.treeView?.nodesMap?.has?.(path));
    } else if (!candidates.length) {
      const selected = trees.find((tree) => tree.id === selectedId);
      if (selected?.treeView?.nodesMap?.has?.(path)) {
        candidates.push(selected);
      }
    }

    if (!candidates.length) {
      candidates = trees.filter((tree) => tree.treeView?.nodesMap?.has?.(path));
    }

    let highlighted = 0;

    for (const candidate of candidates) {
      const treeView = candidate.treeView;
      if (!treeView) continue;

      if (typeof treeView.clearWalkerHighlights === 'function') {
        treeView.clearWalkerHighlights({ keepModified: true });
      }

      if (typeof treeView.highlightNode === 'function') {
        treeView.highlightNode(path, {
          state,
          label: details.label,
          title: details.title || path,
          clearCurrent: true,
          behavior: details.behavior || 'smooth',
        });
        highlighted++;
      } else if (typeof treeView.setNodeWalkerState === 'function') {
        treeView.setNodeWalkerState(path, state, details);
        highlighted++;
      }
    }

    return highlighted > 0;
  }

  // ── Pause / Resume / Stop ──────────────────────────────────────
  _handlePause() {
    if (!this.isRunning) return;
    this.isPaused = true;
    this._setBtn(this.ui.runBtn, '▶', '#2e7d32');
    if (this.ui.runPauseBtn) this.ui.runPauseBtn.disabled = false;
    this.log('Paused at: ' + (this.currentNode || '?'));
  }

  _resume() {
    this.isPaused = false;
    this._setBtn(this.ui.runBtn, '⏸', '#e65100');
    if (this.ui.runPauseBtn) this.ui.runPauseBtn.disabled = true;

    if (this._resumeFn) {
      const fn = this._resumeFn;
      this._resumeFn = null;
      fn();
    }
  }

  _handleStop() {
    this._stopFlag = true;
    this.isPaused = false;

    if (this._resumeFn) {
      this._resumeFn();
      this._resumeFn = null;
    }

    this._resetControls();
    this.log('Stopped');
  }

  _waitIfPaused() {
    if (!this.isPaused) return Promise.resolve();
    return new Promise((r) => {
      this._resumeFn = r;
    });
  }

  _resetControls() {
    this.isRunning = false;
    this.isPaused = false;

    this._setBtn(this.ui.runBtn, '▶', '#2e7d32');

    if (this.ui.pauseBtn) this.ui.pauseBtn.disabled = true;
    if (this.ui.stopBtn) this.ui.stopBtn.disabled = true;
    if (this.ui.runPauseBtn) this.ui.runPauseBtn.disabled = true;

    if (this.ui.progressLabel) this.ui.progressLabel.textContent = '';

    return true;
  }

  async _runOnPause() {
    const fn = this._compile('onPause');

    if (!fn) {
      this.log('No onPause code to run');
      return;
    }

    const node = this.lastPausedNode || {
      path: this.currentNode,
      content: this.currentNode ? this._readFile(this.currentNode) || '' : '',
      meta: this.lastPausedMeta || null,
    };

    try {
      await fn(node, this._makeEnv(), this);
    } catch (error) {
      this.log('onPause error: ' + error.message);
    }
  }

  async _runExport() {
    this._saveSlots();
    this.log(
      '_runExport: _activeWalkScript=' +
        (this._activeWalkScript
          ? this._activeWalkScript.constructor.name
          : 'null')
    );
    this.log(
      '_runExport: onExport slot length=' +
        (this._editors?.onExport?.getValue?.()?.length || 0)
    );
    const fn = this._compile('onExport');
    this.log('_runExport: fn=' + (fn ? 'found' : 'null'));
    if (!fn) {
      this.log('No onExport code');
      return;
    }
    try {
      await fn(this.results, this._makeEnv(), this);
    } catch (e) {
      this.log('❌ onExport error: ' + e.message);
      this.log(e.stack || '');
    }
  }

  // ── Slot Compilation ──────────────────────────────────────────
  _compile(slotName) {
    if (
      this._activeWalkScript &&
      typeof this._activeWalkScript[slotName] === 'function'
    ) {
      return this._activeWalkScript[slotName].bind(this._activeWalkScript);
    }
    const code =
      this._editors[slotName]?.getValue() || this.slots[slotName] || '';
    if (!code.trim()) return null;
    try {
      return new Function(
        'node',
        'env',
        'walker',
        `
        ${code}
        let targetFn = null;
        try { targetFn = eval('${slotName}'); } catch(e) {}
        if (typeof targetFn === 'function') return targetFn(node, env, walker);
      `
      );
    } catch (e) {
      this.log('❌ Compile error [' + slotName + ']: ' + e.message);
      return null;
    }
  }

  // ── File I/O ──────────────────────────────────────────────────
  _readFile(path) {
    const key = String(path || '').trim();

    if (!key) {
      return null;
    }

    if (this.app?.inMemoryFileStore?.has?.(key)) {
      return this.app.inMemoryFileStore.get(key);
    }

    const rootId = '/' + key.split('/').filter(Boolean)[0];
    const store = this.app?.workspaceFileStores?.get?.(rootId);

    if (store && typeof store.get === 'function') {
      const value = store.get(key);
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value.content === 'string') {
        return value.content;
      }
    }

    this.log?.('readFile blocked legacy /api fallback for ' + key);
    return null;
  }

  _writeFile(path, content, options = {}) {
    const key = String(path || '').trim();

    if (!key || typeof content !== 'string') {
      this.log?.('writeFile failed: missing path or non-string content.');
      return false;
    }

    const before = this._readFile(key);
    const rootId = '/' + key.split('/').filter(Boolean)[0];
    const store = this.app?.workspaceFileStores?.get?.(rootId);
    let ok = false;

    try {
      if (store && typeof store.set === 'function') {
        store.set(key, content);
        ok = true;
      } else if (
        this.app?.inMemoryFileStore &&
        typeof this.app.inMemoryFileStore.set === 'function'
      ) {
        this.app.inMemoryFileStore.set(key, content);
        ok = this.app.inMemoryFileStore.get(key) === content;
      } else {
        this.log?.('writeFile blocked legacy /api fallback for ' + key);
        return false;
      }
    } catch (error) {
      this.stats.errors++;
      this.log?.('writeFile failed: ' + key + ': ' + error.message);
      return false;
    }

    if (!ok) {
      this.stats.errors++;
      this.log?.('writeFile failed readback for ' + key);
      return false;
    }

    this.stats.modified++;

    const reason = options.reason || options.source || 'programmaticWrite';
    const state =
      reason === 'user' || reason === 'userWrite' || reason === 'user-generated'
        ? 'userWrite'
        : 'programmaticWrite';

    this._highlightInTree?.(key, state, {
      label: state === 'userWrite' ? 'USER' : 'PROG',
      title: state + ': ' + key,
      clearCurrent: false,
    });

    if (before !== content) {
      this.log?.('wrote ' + key + ' (' + reason + ')');
    } else {
      this.log?.('write unchanged ' + key + ' (' + reason + ')');
    }

    return true;
  }

  _readSidecar(path, ext) {
    const sourcePath = String(path || '');
    const cleanExt = String(ext || 'md').replace(/^\./, '');

    const rootId = '/' + sourcePath.split('/').filter(Boolean)[0];
    const store = this.app?.workspaceFileStores?.get?.(rootId);

    const candidates = [];

    if (cleanExt === 'md' && typeof SidecarDocumentation !== 'undefined') {
      try {
        const docsPath = SidecarDocumentation.docsPathForFile(sourcePath);
        if (docsPath) candidates.push(docsPath);
      } catch (error) {}
    }

    const slash = sourcePath.lastIndexOf('/');
    const dir = slash >= 0 ? sourcePath.slice(0, slash) : '';
    const file = slash >= 0 ? sourcePath.slice(slash + 1) : sourcePath;
    const dot = file.lastIndexOf('.');
    const stem = dot >= 0 ? file.slice(0, dot) : file;
    const fileExt = dot >= 0 ? file.slice(dot + 1) : '';

    if (fileExt) {
      candidates.push(`${dir}/${stem}_${fileExt}.${cleanExt}`);
      candidates.push(`${dir}/${file.replace(/\./g, '_')}.${cleanExt}`);
      candidates.push(`${dir}/${file}.${cleanExt}`);
    }

    candidates.push(`${dir}/${stem}.${cleanExt}`);

    const unique = Array.from(new Set(candidates.filter(Boolean)));

    for (const candidate of unique) {
      let value = null;

      if (store?.get) value = store.get(candidate);
      if (value === null || value === undefined) {
        if (this.app?.inMemoryFileStore?.has?.(candidate)) {
          value = this.app.inMemoryFileStore.get(candidate);
        }
      }

      if (typeof value === 'string') return value;
    }

    return null;
  }

  _parseMeta(content) {
    if (!content) return null;
    try {
      const m = content.match(
        /static\s+getMetadata\s*\(\s*\)\s*\{[\s\S]*?return\s*(\{[\s\S]*?\n\s*\})\s*;/
      );
      if (m)
        return JSON.parse(
          m[1]
            .replace(/\/\/[^\n]*/g, '')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
        );
    } catch (e) {}
    return null;
  }

  // ── Env exposed to slots ──────────────────────────────────────
  _makeEnv() {
    const w = this;

    return {
      readFile: (p) => w._readFile(p),
      writeFile: (p, c, options = {}) => w._writeFile(p, c, options),
      writeUserFile: (p, c) => w._writeFile(p, c, { reason: 'userWrite' }),
      deleteFile: (p) => w._deleteFile(p),
      moveFile: (s, d) => w._moveFile(s, d),
      log: (m) => w.log(m),

      app: w.app,
      acorn: window.acorn,
      results: w.results,
      fileList: w.fileList,
      stats: w.stats,
      walker: w,

      highlightNode: (path, state = 'current', details = {}) =>
        w._highlightInTree(path, state, details),

      setNodeState: (path, state = 'current', details = {}) =>
        w._highlightInTree(path, state, details),

      pause: () => w._handlePause(),
      stop: () => w._handleStop(),

      addResult: (item) => {
        w.results.push(item);
        return item;
      },

      hasBreakpoint: (path) => w._hasBreakpoint(path),
      toggleBreakpoint: (path) => w._toggleBreakpointForPath(path),
      clearBreakpoints: () => w._clearBreakpoints(),

      readSidecar: (path, ext = 'md') => w._readSidecar(path, ext),
      readSidecars: (path) => w._readSidecars(path),

      buildNode: (path) => w._buildNodeForPath(path),

      parseAst: (source) => {
        if (!window.acorn) return null;
        return window.acorn.parse(source || '', {
          ecmaVersion: 'latest',
          sourceType: 'script',
          allowHashBang: true,
        });
      },

      listMethods: (source) => {
        if (!window.acorn) return [];
        const ast = window.acorn.parse(source || '', {
          ecmaVersion: 'latest',
          sourceType: 'script',
          allowHashBang: true,
        });

        const methods = [];
        for (const top of ast.body || []) {
          if (top.type !== 'ClassDeclaration') continue;
          const className = top.id?.name || '(anonymous)';
          for (const item of top.body?.body || []) {
            if (item.type !== 'MethodDefinition') continue;
            methods.push({
              className,
              name: item.key?.name || item.key?.value || '(computed)',
              kind: item.kind,
              static: !!item.static,
              start: item.start,
              end: item.end,
            });
          }
        }
        return methods;
      },

      findTextInMethods: (source, needle) => {
        const methods = this.listMethods ? this.listMethods(source) : [];
        const text = String(source || '');
        const q = String(needle || '');
        return methods
          .map((m) => ({ ...m, source: text.slice(m.start, m.end) }))
          .filter((m) => m.source.includes(q));
      },

      liveGetMetadata: (path, src) => {
        try {
          const code = src || w._readFile(path);
          if (!code) return null;
          const cls = (code.match(/class\s+(\w+)/) || [])[1];
          if (!cls) return null;
          const fn = new Function(
            code +
              `\nreturn typeof ${cls} !== 'undefined' ? ${cls}.getMetadata() : null;`
          );
          return fn();
        } catch (e) {
          return null;
        }
      },

      setDependencies: (path, deps) => {
        let content = w._readFile(path);
        if (!content) {
          w.log('setDependencies: file not found: ' + path);
          return false;
        }

        const depsJson = JSON.stringify(deps);
        const updated = content.replace(
          /"dependencies"\s*:\s*\[[^\]]*\]/,
          `"dependencies": ${depsJson}`
        );

        if (updated === content) {
          w.log('setDependencies: no dependencies field found in ' + path);
          return false;
        }

        w._writeFile(path, updated, { reason: 'programmaticWrite' });
        w.log('setDependencies: ' + path + ' → ' + depsJson);
        return true;
      },
    };
  }

  // ── Helpers ───────────────────────────────────────────────────
  log(message) {
    const line = String(message ?? '');
    const stamped = `[${new Date().toLocaleTimeString()}] ${line}`;

    this._outputText = this._outputText
      ? this._outputText + '\n' + stamped
      : stamped;

    if (this.ui?.logEl) {
      this.ui.logEl.value = this._outputText;
      this.ui.logEl.scrollTop = this.ui.logEl.scrollHeight;
    }

    this._updateOutputSummary();
  }

  _makeBtn(label, bg, onclick, disabled = false) {
    const btn = makeElement('button', {
      textContent: label,
      disabled,
      style: { ...this._btnStyle(bg), opacity: disabled ? '0.4' : '1' },
      onclick,
    });
    btn.addEventListener('click', () => {});
    return btn;
  }

  _setBtn(btn, label, bg) {
    if (!btn) return;
    btn.textContent = label;
    btn.style.background = bg;
  }

  _btnStyle(bg) {
    return {
      padding: '5px 12px',
      background: bg,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '13px',
    };
  }

  _inputStyle(width) {
    return {
      width,
      padding: '5px 8px',
      background: '#1e1e1e',
      color: '#eee',
      border: '1px solid #444',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '12px',
    };
  }

  async _loadWalkScripts(rootPath = null) {
    const startPath = rootPath || this._launchPath || this.rootPath || '/';
    const scriptDirs = [];

    const launchDir = this._directoryOfPath(startPath) || startPath;
    scriptDirs.push(startPath);
    scriptDirs.push(launchDir);
    scriptDirs.push(this._parentDirectory(launchDir));
    scriptDirs.push('/vibes/src/tools/TreeWalker/scripts');

    const uniqueDirs = Array.from(new Set(scriptDirs.filter(Boolean)));
    this.log(
      `🔍 [WalkScripts] Searching directories: ${uniqueDirs.join(', ')}`
    );
    const scripts = [];

    for (const dir of uniqueDirs) {
      const paths = await this._listCandidateWalkScriptPaths(dir);
      this.log(`🔍 [WalkScripts] Found ${paths.length} candidates in ${dir}`);

      for (const path of paths) {
        const info = await this._readWalkScriptInfo(path, startPath);
        if (info) {
          scripts.push(info);
        } else {
          this.log(
            `🔍 [WalkScripts] Rejected candidate: ${path} (Failed to parse/load)`
          );
        }
      }
    }

    // Deduplicate by path
    const uniqueScriptsMap = new Map();
    for (const s of scripts) uniqueScriptsMap.set(s.path, s);
    const uniqueScripts = Array.from(uniqueScriptsMap.values());

    uniqueScripts.sort((a, b) => {
      const ca = a.category || '';
      const cb = b.category || '';
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.label || a.className || a.path).localeCompare(
        b.label || b.className || b.path
      );
    });

    this._availableWalkScripts = uniqueScripts;
    return uniqueScripts;
  }

  // Explicitly deprecate the custom picker logic entirely
  _showScriptPicker() {
    env.log('Script picker is obsolete. Use the unified dropdown.');
  }

  async _installScript(ScriptClass, scriptInfo = {}) {
    if (!ScriptClass) throw new Error('Missing WalkScript class');

    const instance = new ScriptClass();
    const slots = {
      onFile: instance.onFile || ScriptClass.prototype.onFile,
      onDir: instance.onDir || ScriptClass.prototype.onDir,
      onPause: instance.onPause || ScriptClass.prototype.onPause,
      onExport: instance.onExport || ScriptClass.prototype.onExport,
    };

    for (const [slotName, fn] of Object.entries(slots)) {
      if (typeof fn !== 'function') continue;
      this._setCodeSlot(slotName, this._methodBodySource(fn));
    }

    this._activeWalkScript = instance;
    this._activeWalkScriptInfo = scriptInfo;

    if (scriptInfo.startPath) {
      this.rootPath = scriptInfo.startPath;
    }

    this.log?.(
      `🌲 Installed WalkScript: ${scriptInfo.label || ScriptClass.name}`
    );
    this.log?.(`start path: ${this.rootPath || this._launchPath || '/'}`);

    return instance;
  }

  _saveScriptToDirectory(dirPath, scriptName) {
    const onFile = this._editors.onFile.getValue();
    const onDir = this._editors.onDir.getValue();
    const onPause = this._editors.onPause.getValue();
    const onExport = this._editors.onExport.getValue();

    // Strip standalone `function` back to class method syntax
    const cleanFn = (src) =>
      src.replace(/^async\s+function\s+/, 'async ').replace(/^function\s+/, '');

    const content = `class ${scriptName} {\n
\n\n  ${cleanFn(onFile).split('\\n').join('\n  ')}\n\n  ${cleanFn(onDir)
      .split('\\n')
      .join('\n  ')}\n\n  ${cleanFn(onPause)
      .split('\\n')
      .join('\n  ')}\n\n  ${cleanFn(onExport).split('\\n').join('\n  ')}\n}\n`;

    let p = dirPath;
    if (!p.endsWith('/')) p += '/';
    p += `_walkscript_${scriptName}.js`;

    // We can write it right into memory via the direct helper (or the backend if requested)
    this._writeFile(p, content);
    this.log('✅ Saved script to ' + p);
  }

  _copyOutputToClipboard() {
    const lines = Array.from(this.ui.logEl.childNodes)
      .map((n) => n.textContent)
      .join('\n');
    UITools.makeDialog({
      title: 'Copy Output',
      content: makeElement('div', { style: { padding: '10px' } }, [
        makeElement('p', {}, `Copy ${lines.length} bytes to clipboard?`),
        makeElement(
          'pre',
          {
            style: {
              height: '150px',
              overflow: 'auto',
              background: '#111',
              color: '#ccc',
              padding: '8px',
              fontSize: '11px',
              border: '1px solid #333',
            },
          },
          lines.slice(0, 500) + (lines.length > 500 ? '\n...' : '')
        ),
      ]),
      buttons: [
        { label: 'Cancel' },
        {
          label: 'Copy Raw',
          className: 'primary',
          onClick: (e, dialog) => {
            navigator.clipboard.writeText(lines);
            this.log('📋 Copied to clipboard.');
            dialog.close();
          },
        },
        {
          label: 'Copy as run function',
          onClick: (e, dialog) => {
            const safeStr = lines
              .replace(/\\/g, '\\\\')
              .replace(/\`/g, '\\`')
              .replace(/\$/g, '\\$');
            const code =
              'async function run(env) {\n  env.log(`' + safeStr + '`);\n}';
            navigator.clipboard.writeText(code);
            this.log('📋 Copied as run function.');
            dialog.close();
          },
        },
      ],
    });
  }

  attachToSourceTree(options = {}) {
    const sourceTreeView =
      options.sourceTreeView ||
      options.treeView ||
      options.fileTreeView ||
      options.sourceTree ||
      this._sourceTreeView ||
      null;

    this._sourceTreeView = sourceTreeView;
    this._sourceStore =
      options.store || options.fileStore || this._sourceStore || null;

    this._sourceRootPath =
      options.rootPath ||
      options.treeRootPath ||
      options.rootId ||
      this._sourceRootPath ||
      '/';

    this._launchPath =
      options.launchPath ||
      options.dirPath ||
      options.path ||
      this._launchPath ||
      this._sourceRootPath;

    this.rootPath =
      this._launchPath || this.rootPath || this._sourceRootPath || '/';

    this._attachedProjectFilesManager =
      options.projectFilesManager ||
      this._attachedProjectFilesManager ||
      this.app?.projectFilesManager ||
      null;

    this._attachedFloatingPanelHost =
      options.floatingPanelHost || this._attachedFloatingPanelHost || null;

    this._activeWalkScriptPath =
      options.scriptPath || this._activeWalkScriptPath || null;

    if (!this._walkUiState) this._walkUiState = {};
    this._walkUiState.launchPath = this._launchPath;
    this._walkUiState.currentPath = this.rootPath;
    this._walkUiState.sourceRootPath = this._sourceRootPath;
    this._walkUiState.scriptPath = this._activeWalkScriptPath;
    this._walkUiState.attachedTree = !!this._sourceTreeView;

    if (this.ui?.rootInput) {
      this.ui.rootInput.value = this.rootPath;
    }

    if (this.ui?.treeSelect) {
      this._populateTreeSelect();

      const trees = this._getAvailableTrees();
      const attached = trees.find(
        (tree) => tree.treeView === this._sourceTreeView
      );

      if (attached) {
        this.ui.treeSelect.value = attached.id;
      }
    }

    this._applyWalkerVisualChrome?.('attached source tree');
    this._updateAttachedTreeLabel?.();

    this.log?.(
      `🌲 Attached TreeWalker to ${this.rootPath}${
        this._sourceTreeView ? ' using exact source FileTreeView' : ''
      }`
    );

    return this;
  }

  _updateAttachedTreeLabel() {
    const text = [
      '🌲 Attached tree',
      this._sourceRootPath ? `root: ${this._sourceRootPath}` : null,
      this._launchPath ? `start: ${this._launchPath}` : null,
      this._activeWalkScriptPath
        ? `script: ${this._activeWalkScriptPath.split('/').pop()}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

    if (this._attachedTreeLabel) {
      this._attachedTreeLabel.textContent = text;
      return;
    }

    const host =
      this.contentEl ||
      this.bodyEl ||
      this.el ||
      this.rootEl ||
      this.dialog?.contentEl ||
      this.dialog?.bodyEl ||
      null;

    if (!host || !document?.createElement) return;

    const label = document.createElement('div');
    label.className = 'tree-walker-attached-tree-label';
    label.textContent = text;
    label.style.cssText = [
      'font-size:11px',
      'opacity:.82',
      'padding:4px 8px',
      'margin:4px 0',
      'border-radius:8px',
      'background:rgba(120,170,255,.10)',
      'border:1px solid rgba(120,170,255,.22)',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis',
    ].join(';');

    this._attachedTreeLabel = label;
    host.prepend(label);
  }

  _resolveWalkStartPath(scriptMeta = {}, scriptPath = null) {
    const launchPath =
      this._launchPath || this.rootPath || this._sourceRootPath || '/';
    const treeRoot = this._sourceRootPath || this.rootPath || '/';

    if (scriptMeta.startPath && typeof scriptMeta.startPath === 'string') {
      if (scriptMeta.startPath === '.')
        return this._directoryOfPath(scriptPath) || launchPath;
      if (scriptMeta.startPath === '..')
        return this._parentDirectory(
          this._directoryOfPath(scriptPath) || launchPath
        );
      if (
        scriptMeta.startPath === '$clicked' ||
        scriptMeta.startPath === '$launch'
      )
        return launchPath;
      if (
        scriptMeta.startPath === '$treeRoot' ||
        scriptMeta.startPath === '$root'
      )
        return treeRoot;
      if (scriptMeta.startPath.startsWith('/')) return scriptMeta.startPath;
      return this._joinPath(
        this._directoryOfPath(scriptPath) || launchPath,
        scriptMeta.startPath
      );
    }

    if (scriptMeta.startMode === 'scriptDir')
      return this._directoryOfPath(scriptPath) || launchPath;
    if (scriptMeta.startMode === 'scriptParent')
      return this._parentDirectory(
        this._directoryOfPath(scriptPath) || launchPath
      );
    if (scriptMeta.startMode === 'treeRoot') return treeRoot;
    if (scriptMeta.startMode === 'clickedDirectory') return launchPath;

    if (scriptPath && scriptPath.includes('/_tw_')) {
      return this._directoryOfPath(scriptPath) || launchPath;
    }

    return launchPath;
  }

  _directoryOfPath(path) {
    if (!path || typeof path !== 'string') return null;
    const clean = path.replace(/\/+$/, '');
    const i = clean.lastIndexOf('/');
    if (i <= 0) return '/';
    return clean.slice(0, i);
  }

  _parentDirectory(path) {
    const dir = this._directoryOfPath(path);
    if (!dir || dir === '/') return '/';
    return this._directoryOfPath(dir);
  }

  _joinPath(base, child) {
    if (!base) base = '/';
    if (!child) return base;
    return `${base.replace(/\/+$/, '')}/${child.replace(/^\/+/, '')}`;
  }

  async _listCandidateWalkScriptPaths(dirPath) {
    const out = [];
    const seen = new Set();

    const add = (path) => {
      if (!path || seen.has(path)) return;
      seen.add(path);
      // Smart inclusion logic
      if (
        path.endsWith('.js') &&
        (path.endsWith('Walker.js') ||
          path.includes('/TreeWalker/scripts/') ||
          path.includes('_tw_'))
      ) {
        out.push(path);
      }
    };

    // Source 1: VFS (The most reliable source)
    if (this.app?.vfs?.listFiles) {
      try {
        const files = await this.app.vfs.listFiles({ includeStatic: true });
        for (const file of files || []) {
          const p = typeof file === 'string' ? file : file.path;
          if (p) add(p);
        }
      } catch (e) {
        this.log(`❌ [WalkScripts] VFS listFiles error: ${e.message}`);
      }
    }

    // Source 2: File Tree View NodesMap (Guaranteed to have UI-visible files)
    try {
      const trees = [
        this.app?.projectFilesManager?.fileTreeView,
        this._sourceTreeView,
      ];
      for (const tree of trees) {
        if (tree?.nodesMap) {
          for (const [p, node] of tree.nodesMap.entries()) {
            if (node.type === 'file') add(p);
          }
        }
      }
    } catch (e) {
      this.log(`❌ [WalkScripts] nodesMap error: ${e.message}`);
    }

    // Source 3: Commands fallback
    if (this.app?.commands?.getRawFileList) {
      try {
        const files = await this.app.commands.getRawFileList({});
        for (const file of files || []) {
          const p = typeof file === 'string' ? file : file.path;
          if (p) add(p);
        }
      } catch (e) {}
    }

    // Filter to only those in the dirPath or global scripts dir
    const filtered = out.filter(
      (p) =>
        p.startsWith(dirPath) ||
        p.startsWith('/vibes/src/tools/TreeWalker/scripts/')
    );
    return filtered;
  }

  async _readWalkScriptInfo(path, rootPath) {
    const content = await this._readWalkScriptSource(path);
    if (!content) {
      this.log(`❌ [WalkScripts] Read failed: ${path} (empty or missing)`);
      return null;
    }

    const className = this._extractPrimaryClassName(content);
    if (!className) {
      this.log(`❌ [WalkScripts] No class name found in: ${path}`);
      return null;
    }

    let ScriptClass = window[className];

    if (!ScriptClass) {
      try {
        // Strip imports to avoid syntax errors inside new Function() evaluation
        const cleanContent = content.replace(/^import\s+.*?;?\s*$/gm, '');
        const loader = new Function(`${cleanContent}\nreturn ${className};`);
        ScriptClass = loader();

        if (ScriptClass) {
          globalThis[className] = ScriptClass;
          if (typeof window !== 'undefined') {
            window[className] = ScriptClass;
          }
        }
      } catch (e) {
        this.log(`⚠️ [WalkScripts] Eval failed for ${path}: ${e.message}`);

        // Safe Fallback: Extract getMetadata directly via Regex if eval fails
        try {
          const metaStr = content.match(
            /static\s+getMetadata\s*\(\s*\)\s*\{([\s\S]*?)return\s*(\{[\s\S]*?\})\s*;/
          );
          if (metaStr && metaStr[2]) {
            const metaObj = new Function(`return ${metaStr[2]};`)();
            if (metaObj) {
              this.log(
                `✅ [WalkScripts] Recovered metadata via Regex for ${path}`
              );
              return {
                path,
                className,
                label: metaObj.label || className,
                description: metaObj.description || '',
                category: metaObj.category || 'local',
                meta: metaObj,
                ScriptClass: null, // Defer eval until selected by user
                startPath: this._resolveWalkStartPath(metaObj, path),
              };
            }
          }
        } catch (err2) {
          this.log(
            `❌ [WalkScripts] Regex meta fallback failed for ${path}: ${err2.message}`
          );
        }
        return null;
      }
    }

    if (!ScriptClass || typeof ScriptClass.getMetadata !== 'function') {
      this.log(`❌ [WalkScripts] No getMetadata function on: ${className}`);
      return null;
    }

    let meta = {};
    try {
      meta = ScriptClass.getMetadata() || {};
    } catch (e) {
      this.log(
        `❌ [WalkScripts] getMetadata threw error on: ${className} -> ${e.message}`
      );
      return null;
    }

    if (
      meta.type !== 'TreeWalker' &&
      !meta.label &&
      !path.includes('_tw_') &&
      !path.includes('Walker.js')
    ) {
      this.log(`❌ [WalkScripts] Does not look like a walker: ${path}`);
      return null;
    }

    return {
      path,
      className,
      label: meta.label || className,
      description: meta.description || '',
      category: meta.category || 'local',
      meta,
      ScriptClass,
      startPath: this._resolveWalkStartPath(meta, path),
    };
  }

  async _readWalkScriptSource(path) {
    // 1. Try VirtualFileSystem API
    if (this.app?.vfs?.readFile) {
      try {
        const content = await this.app.vfs.readFile(path, {
          nullOnMissing: true,
        });
        if (content) return content;
      } catch (e) {}
    }

    // 2. Try Local Reader
    if (typeof this._readFile === 'function') {
      try {
        const value = this._readFile(path);
        if (value) return value;
      } catch (e) {}
    }

    // 3. Try Global Command Fetcher
    if (this.app?.commands?.fetchFileContentForApp) {
      try {
        const content = await this.app.commands.fetchFileContentForApp(path);
        if (typeof content === 'string') return content;
        if (content?.code) return content.code;
      } catch (e) {}
    }

    return null;
  }

  _extractPrimaryClassName(content) {
    if (!content) return null;

    if (this.env?.acorn || window.acorn) {
      try {
        const acorn = this.env?.acorn || window.acorn;
        const ast = acorn.parse(content, {
          ecmaVersion: 'latest',
          sourceType: 'script',
        });
        const klass = ast.body.find(
          (node) => node.type === 'ClassDeclaration' && node.id?.name
        );
        if (klass) return klass.id.name;
      } catch (e) {}
    }

    const match = content.match(/class\s+([A-Za-z_$][\w$]*)\s*/);
    return match ? match[1] : null;
  }

  _walkScriptStorageKey(rootPath) {
    return `vibes.treeWalker.walkScript.${rootPath || '/'}`;
  }

  async _installRememberedWalkScript() {
    const rootPath = this._launchPath || this.rootPath || '/';
    const raw = localStorage.getItem(this._walkScriptStorageKey(rootPath));
    if (!raw) return false;

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch (e) {
      return false;
    }

    if (!saved?.scriptPath) return false;

    const info = await this._readWalkScriptInfo(saved.scriptPath, rootPath);
    if (!info) return false;

    await this._installScript(info.ScriptClass, info);
    this._activeWalkScriptPath = info.path;
    this.rootPath = info.startPath || rootPath;
    this._launchPath = this.rootPath;
    this._updateAttachedTreeLabel();
    return true;
  }

  _methodBodySource(fn) {
    const source = String(fn);
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end < start) return source;
    return source.slice(start + 1, end).trim();
  }

  _setCodeSlot(slotName, value) {
    const candidates = [
      this[slotName + 'Editor'],
      this[slotName + 'CodeMirror'],
      this[slotName + 'Input'],
      this[slotName],
      this.codeSlots?.[slotName],
      this._editors?.[slotName],
      this.editors?.[slotName],
      this.slotEditors?.[slotName],
    ].filter(Boolean);

    this.log?.(
      '_setCodeSlot [' + slotName + '] candidates: ' + candidates.length
    );
    this.log?.(
      '  _editors keys: ' + Object.keys(this._editors || {}).join(', ')
    );

    for (const candidate of candidates) {
      if (typeof candidate.setValue === 'function') {
        candidate.setValue(value);
        this.log?.('  set via setValue');
        return true;
      }
      if (typeof candidate.dispatch === 'function' && candidate.state?.doc) {
        candidate.dispatch({
          changes: { from: 0, to: candidate.state.doc.length, insert: value },
        });
        this.log?.('  set via dispatch');
        return true;
      }
      if ('value' in candidate) {
        candidate.value = value;
        candidate.dispatchEvent?.(new Event('input', { bubbles: true }));
        this.log?.('  set via .value');
        return true;
      }
      if ('textContent' in candidate) {
        candidate.textContent = value;
        this.log?.('  set via textContent');
        return true;
      }
    }

    this._pendingSlotValues ||= {};
    this._pendingSlotValues[slotName] = value;
    this.log?.('  NO MATCH - stored as pending');
    return false;
  }

  _getCodeSlot(slotName) {
    const candidates = [
      this[`${slotName}Editor`],
      this[`${slotName}CodeMirror`],
      this[`${slotName}Input`],
      this[slotName],
      this.codeSlots?.[slotName],
      this.editors?.[slotName],
      this.slotEditors?.[slotName],
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (typeof candidate.getValue === 'function') return candidate.getValue();
      if (candidate.state?.doc) return candidate.state.doc.toString();
      if ('value' in candidate) return candidate.value;
      if ('textContent' in candidate) return candidate.textContent;
    }

    return this._pendingSlotValues?.[slotName] || '';
  }

  _escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (ch) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }[ch])
    );
  }

  async _saveCurrentAsWalkScript(dirPath, options = {}) {
    const name = options.name || 'LocalWalker';
    const className = name.replace(/[^A-Za-z0-9_$]/g, '') || 'LocalWalker';
    const fileName = `_tw_${className}.js`;
    const path = `${dirPath.replace(/\/+$/, '')}/${fileName}`;

    const label = options.label || `🌲 ${className}`;
    const description =
      options.description || `Saved TreeWalker script for ${dirPath}`;

    const source = `class ${className} {
async onFile(node, env, walker) {
${this._indent(this._getCodeSlot('onFile'), 4)}
  }

  async onDir(dirPath, env, walker) {
${this._indent(this._getCodeSlot('onDir'), 4)}
  }

  async onPause(node, env, walker) {
${this._indent(this._getCodeSlot('onPause'), 4)}
  }

  async onExport(results, env, walker) {
${this._indent(this._getCodeSlot('onExport'), 4)}
  }
}
`;

    if (this.env?.writeFile) {
      await this.env.writeFile(path, source);
    } else if (typeof this._writeFile === 'function') {
      await this._writeFile(path, source);
    } else {
      throw new Error('No write API available for saving WalkScript');
    }

    this.log?.(`💾 Saved WalkScript: ${path}`);
    return path;
  }

  _indent(text, spaces) {
    const pad = ' '.repeat(spaces);
    const clean = String(text || '').trimEnd();
    if (!clean.trim()) return `${pad}// empty`;
    return clean
      .split('\n')
      .map((line) => pad + line)
      .join('\n');
  }

  mountInto(container, options = {}) {
    if (!container)
      throw new Error('TreeWalkerDialog.mountInto requires a container.');

    this.attachToSourceTree(options);
    this._mountHost = container;
    this._externalOnClose = options.onClose || null;

    if (!this.breakpoints) this.breakpoints = new Set();
    this._breakpointPickMode = false;

    container.textContent = '';
    container.appendChild(
      this._buildCompactSurface({
        standalone: false,
        onClose: this._externalOnClose,
      })
    );

    this._installBreakpointTreeHandling();
    this._updateOutputSummary();
    return this;
  }

  // Remove legacy loading fallback for deleted "compact scripts" array
  _buildCompactSurface(options = {}) {
    this.ui = {};
    this._editors = {};
    this.results = this.results || [];
    this._outputText = this._outputText || '';

    const root = makeElement('div', {
      className: 'treewalker-compact-surface',
      style: {
        height: '100%',
        minHeight: '0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#dce8ff',
        background: 'transparent',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
      },
    });

    const toolbar = this._buildCompactToolbar(options);
    const fields = this._buildCompactFields();

    this.ui.nodeBar = makeElement(
      'div',
      {
        className: 'treewalker-compact-nodebar',
        style: {
          display: 'none',
          flex: '0 0 auto',
          margin: '6px 8px 0',
          padding: '5px 7px',
          borderRadius: '7px',
          background: 'rgba(75,140,255,0.10)',
          border: '1px solid rgba(120,180,255,0.20)',
          color: '#8fc7ff',
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          fontSize: '11px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      },
      ''
    );

    const outputHeader = makeElement('div', {
      style: {
        flex: '0 0 auto',
        margin: '6px 8px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      },
    });

    const outputSummary = makeElement(
      'button',
      {
        type: 'button',
        className: 'treewalker-compact-output-summary',
        style: {
          flex: '1 1 auto',
          padding: '5px 7px',
          borderRadius: '7px',
          border: '1px solid rgba(120,180,255,0.18)',
          background: 'rgba(255,255,255,0.045)',
          color: '#9fb6d8',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: '11px',
        },
        onclick: () => this._setOutputOpen(!this._outputOpen),
      },
      'Output: 0 bytes'
    );

    const copyBtn = makeElement(
      'button',
      {
        type: 'button',
        style: {
          display: 'none',
          padding: '4px 10px',
          borderRadius: '7px',
          border: '1px solid rgba(120,180,255,0.18)',
          background: 'rgba(255,255,255,0.045)',
          color: '#9fb6d8',
          cursor: 'pointer',
          fontSize: '11px',
        },
        onclick: () => {
          navigator.clipboard.writeText(this._outputText || '').then(() => {
            copyBtn.textContent = '✓ Copied';
            setTimeout(() => {
              copyBtn.textContent = '📋 Copy';
            }, 1500);
          });
        },
      },
      '📋 Copy'
    );

    this.ui.outputSummary = outputSummary;
    this.ui.copyOutputBtn = copyBtn;
    outputHeader.append(outputSummary, copyBtn);

    this.ui.logEl = makeElement('textarea', {
      className: 'treewalker-compact-output',
      readOnly: true,
      spellcheck: 'false',
      style: {
        display: 'none',
        flex: '0 0 130px',
        minHeight: '70px',
        maxHeight: '240px',
        resize: 'vertical',
        margin: '0 8px 8px',
        padding: '7px',
        borderRadius: '8px',
        border: '1px solid rgba(120,180,255,0.18)',
        outline: 'none',
        color: '#cfe9d3',
        background: 'rgba(0,0,0,0.32)',
        fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
        fontSize: '11px',
        lineHeight: '1.35',
      },
    });

    root.append(toolbar, this.ui.nodeBar, fields, outputHeader, this.ui.logEl);

    if (this._pendingSlotValues) {
      for (const [name, value] of Object.entries(this._pendingSlotValues)) {
        this._setSlotText(name, value);
      }
      this._pendingSlotValues = null;
    }

    this._setOutputOpen(false);
    this._updateOutputSummary();
    return root;
  }

  _buildCompactToolbar(options = {}) {
    const toolbar = makeElement('div', {
      className: 'treewalker-compact-toolbar',
      style: {
        flex: '0 0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px',
        alignItems: 'center',
        padding: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(12,16,26,0.72)',
      },
    });

    // Playback Controls
    this.ui.runBtn = this._makeBtn('▶', '#58d37b', () => this._handleRun());
    this.ui.pauseBtn = this._makeBtn(
      '⏸',
      '#ffb86b',
      () => this._handlePause(),
      true
    );
    this.ui.stopBtn = this._makeBtn(
      '■',
      '#ff6f91',
      () => this._handleStop(),
      true
    );
    this.ui.runPauseBtn = this._makeBtn(
      '▶ Run REPL',
      '#7fd6ff',
      () => this._runOnPause(),
      true
    );
    this.ui.breakBtn = this._makeBtn('◇ Break', '#ffb7ef', () =>
      this._toggleBreakpointPickMode()
    );
    this.ui.breakBtn.title =
      'Toggle breakpoint pick mode, then click nodes in the tree.';

    // Unified Script Selector
    this.ui.scriptSelect = makeElement('select', {
      title: 'Choose Tree Walker',
      style: {
        flex: '1 1 auto',
        minWidth: '120px',
        maxWidth: '300px',
        padding: '5px 7px',
        borderRadius: '8px',
        border: '1px solid rgba(160,190,255,0.22)',
        color: '#dce8ff',
        background: 'rgba(0,0,0,0.25)',
        fontSize: '11px',
        boxShadow: '0 0 14px rgba(100, 160, 255, 0.06)',
      },
      onchange: () => this._onScriptSelectChanged(),
    });

    // Populate async immediately
    this._refreshScriptDropdown();

    // Right-aligned controls (Speed slider and progress)
    const right = makeElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '6px',
        flex: '1 1 auto',
      },
    });

    this.ui.delaySlider = makeElement('input', {
      type: 'range',
      min: '0',
      max: '1200',
      value: '120',
      title: 'Speed: 0 screams through but still yields periodically',
      style: { width: '72px', accentColor: '#ffb7ef' },
    });

    this.ui.progressLabel = makeElement(
      'span',
      {
        style: {
          color: '#8fc7ff',
          fontSize: '10px',
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          minWidth: '48px',
          textAlign: 'right',
        },
      },
      ''
    );

    if (!options.standalone) {
      const closeBtn = this._makeBtn('×', '#9fb2d9', () => {
        this._handleStop();
        this._saveSlots();
        options.onClose?.();
      });
      right.append(this.ui.delaySlider, this.ui.progressLabel, closeBtn);
    } else {
      right.append(this.ui.delaySlider, this.ui.progressLabel);
    }

    // Assemble the toolbar WITHOUT the customScriptsBtn
    toolbar.append(
      this.ui.runBtn,
      this.ui.pauseBtn,
      this.ui.stopBtn,
      this.ui.runPauseBtn,
      this.ui.breakBtn,
      this.ui.scriptSelect,
      right
    );

    // Hidden inputs required for state management
    this.ui.treeSelect = makeElement('select', { style: { display: 'none' } });
    this._populateTreeSelect?.();

    this.ui.rootInput = makeElement('input', {
      value: this.rootPath || this._launchPath || this._sourceRootPath || '/',
      style: { display: 'none' },
    });

    this.ui.filterInput = makeElement('input', {
      value: '',
      style: { display: 'none' },
    });

    this._includeLibrary = false;

    return toolbar;
  }

  _buildCompactFields() {
    const wrap = makeElement('div', {
      className: 'treewalker-compact-fields',
      style: {
        flex: '1 1 auto',
        minHeight: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        padding: '8px',
        overflow: 'hidden',
      },
    });

    wrap.append(
      this._makeCompactField('onDir', 'On directory'),
      this._makeCompactField('onFile', 'On file'),
      this._makeCompactField(
        'onPause',
        'Scratchpad / REPL (Run against paused node)'
      )
    );

    return wrap;
  }

  _makeCompactField(slotName, label) {
    const box = makeElement('div', {
      style: {
        flex: '1 1 auto',
        minHeight: '60px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '9px',
        border: '1px solid rgba(140,180,255,0.16)',
        background: 'rgba(0,0,0,0.18)',
        resize: 'vertical',
      },
    });

    const title = makeElement(
      'div',
      {
        style: {
          flex: '0 0 auto',
          padding: '4px 7px',
          color: '#9fbfff',
          fontSize: '11px',
          fontWeight: '700',
          borderBottom: '1px solid rgba(140,180,255,0.10)',
          background: 'rgba(255,255,255,0.035)',
        },
      },
      label
    );

    const pane = makeElement('div', {
      style: { flex: '1 1 auto', minHeight: '0', overflow: 'auto' },
    });

    box.append(title, pane);

    const initialValue = this.slots[slotName] || '';

    if (
      typeof EditorView !== 'undefined' &&
      typeof EditorState !== 'undefined' &&
      typeof javascript === 'function'
    ) {
      const extensions = [
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { height: '100%', fontSize: '11px', background: 'transparent' },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          },
          '.cm-content': { padding: '6px' },
          '.cm-focused': { outline: 'none' },
        }),
      ];

      if (typeof oneDark !== 'undefined') extensions.push(oneDark);
      if (typeof lineNumbers === 'function') extensions.push(lineNumbers());
      if (typeof history === 'function') extensions.push(history());
      if (
        typeof keymap !== 'undefined' &&
        typeof defaultKeymap !== 'undefined'
      ) {
        const maps = [...defaultKeymap];
        if (typeof historyKeymap !== 'undefined') maps.push(...historyKeymap);
        if (typeof indentWithTab !== 'undefined') maps.push(indentWithTab);
        extensions.push(keymap.of(maps));
      }
      extensions.push(javascript());
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged)
            this.slots[slotName] = update.state.doc.toString();
        })
      );

      const view = new EditorView({
        state: EditorState.create({ doc: initialValue, extensions }),
        parent: pane,
      });

      this._editors[slotName] = {
        getValue: () => view.state.doc.toString(),
        setValue: (value) => {
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: value || '',
            },
          });
          this.slots[slotName] = value || '';
        },
      };
    } else {
      // Fallback textarea if CodeMirror not available
      const textarea = makeElement('textarea', {
        spellcheck: 'false',
        style: {
          flex: '1 1 auto',
          minHeight: '0',
          width: '100%',
          resize: 'none',
          boxSizing: 'border-box',
          border: '0',
          outline: 'none',
          padding: '7px',
          color: '#dce8ff',
          background: 'transparent',
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          fontSize: '11px',
          lineHeight: '1.35',
        },
        oninput: () => {
          this.slots[slotName] = textarea.value;
        },
      });
      textarea.value = initialValue;
      pane.appendChild(textarea);
      this._editors[slotName] = {
        getValue: () => textarea.value,
        setValue: (value) => {
          textarea.value = value;
          this.slots[slotName] = value;
        },
      };
    }

    return box;
  }

  _getSlotText(slotName) {
    return (
      this._editors?.[slotName]?.getValue?.() || this.slots?.[slotName] || ''
    );
  }

  _setSlotText(slotName, value) {
    if (!this.slots) this.slots = {};
    this.slots[slotName] = value || '';

    if (this._editors?.[slotName]?.setValue) {
      this._editors[slotName].setValue(value || '');
      return true;
    }

    return false;
  }

  _installCompactScript(scriptId) {
    const script =
      this._getCompactScripts().find((item) => item.id === scriptId) ||
      this._getCompactScripts()[0];

    this._setSlotText('onDir', script.onDir);
    this._setSlotText('onFile', script.onFile);
    this._setSlotText('onPause', script.onPause);

    this.log(`Loaded walker preset: ${script.label}`);
    return script;
  }

  _getCompactScripts() {
    return [];
  }

  _setOutputOpen(open) {
    this._outputOpen = !!open;

    if (this.ui?.logEl) {
      this.ui.logEl.style.display = this._outputOpen ? 'block' : 'none';
    }

    if (this.ui?.copyOutputBtn) {
      this.ui.copyOutputBtn.style.display = this._outputOpen
        ? 'inline-block'
        : 'none';
    }

    this._updateOutputSummary();
    return this._outputOpen;
  }

  _updateOutputSummary() {
    if (!this.ui?.outputSummary) return false;

    const bytes = new Blob([this._outputText || '']).size;
    const lines = this._outputText ? this._outputText.split('\n').length : 0;

    this.ui.outputSummary.textContent =
      (this._outputOpen ? '▾' : '▸') +
      ' Output: ' +
      this._formatByteCount(bytes) +
      ' · ' +
      lines +
      ' line' +
      (lines === 1 ? '' : 's');

    if (!this.ui.copyOutputBtn) {
      const btn = this._makeBtn('📋 Copy', '#4a6a9a', () => {
        navigator.clipboard.writeText(this._outputText || '').then(() => {
          btn.textContent = '✓ Copied';
          setTimeout(() => {
            btn.textContent = '📋 Copy';
          }, 1500);
        });
      });
      btn.style.display = this._outputOpen ? 'inline-block' : 'none';
      btn.style.marginLeft = '8px';
      btn.style.fontSize = '11px';
      btn.style.padding = '3px 8px';
      this.ui.copyOutputBtn = btn;
      this.ui.outputSummary.parentNode?.insertBefore(
        btn,
        this.ui.outputSummary.nextSibling
      );
    }

    return true;
  }

  _formatByteCount(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1000) return `${n} bytes`;
    if (n < 1000 * 1000) return `${(n / 1000).toFixed(1)}k`;
    return `${(n / (1000 * 1000)).toFixed(1)}MB`;
  }

  _readSidecars(path) {
    return {
      md: this._readSidecar(path, 'md'),
      yaml: this._readSidecar(path, 'yaml') || this._readSidecar(path, 'yml'),
    };
  }

  async _buildNodeForPath(path) {
    const content = this._readFile(path);
    const sidecars = this._readSidecars(path);
    const meta = this._parseMeta(content);

    let ast = null;
    let methods = [];

    if (content && window.acorn && /\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(path)) {
      try {
        ast = window.acorn.parse(content, {
          ecmaVersion: 'latest',
          sourceType: 'script',
          allowHashBang: true,
        });

        for (const top of ast.body || []) {
          if (top.type !== 'ClassDeclaration') continue;
          const className = top.id?.name || '(anonymous)';
          for (const item of top.body?.body || []) {
            if (item.type !== 'MethodDefinition') continue;
            methods.push({
              className,
              name: item.key?.name || item.key?.value || '(computed)',
              kind: item.kind,
              static: !!item.static,
              start: item.start,
              end: item.end,
            });
          }
        }
      } catch (error) {
        this.log('AST parse failed: ' + path + ': ' + error.message);
      }
    }

    return {
      path,
      content,
      meta,
      sidecarMd: sidecars.md,
      sidecarYaml: sidecars.yaml,
      sidecars,
      ast,
      methods,
      methodCount: methods.length,
    };
  }

  _installBreakpointTreeHandling() {
    const tree = this._sourceTreeView;
    const container = tree?.container || tree?.treeElement || null;
    if (!container || this._breakpointTreeHandlerInstalled) return false;

    this._breakpointTreeHandlerInstalled = true;

    this._breakpointTreeClickHandler = (event) => {
      const nodeEl = event.target?.closest?.('.tree-node');
      if (!nodeEl) return;

      const path =
        nodeEl.dataset?.nodeId ||
        nodeEl.getAttribute?.('data-node-id') ||
        nodeEl.querySelector?.('.node-name')?.getAttribute?.('title') ||
        null;

      if (!path) return;

      const shouldToggle =
        this._breakpointPickMode ||
        event.altKey ||
        (event.shiftKey && event.metaKey);

      if (!shouldToggle) return;

      event.preventDefault();
      event.stopPropagation();

      this._toggleBreakpointForPath(path);
    };

    container.addEventListener('click', this._breakpointTreeClickHandler, true);
    return true;
  }

  _toggleBreakpointPickMode() {
    this._breakpointPickMode = !this._breakpointPickMode;

    if (this.ui?.breakBtn) {
      this.ui.breakBtn.textContent = this._breakpointPickMode
        ? '◆ Pick…'
        : '◇ Break';
      this.ui.breakBtn.style.boxShadow = this._breakpointPickMode
        ? '0 0 18px rgba(255, 120, 220, 0.45)'
        : '';
    }

    const host = this._sourceTreeView?.container?.closest?.(
      '.floating-panel-host'
    );
    if (host) {
      host.classList.toggle(
        'treewalker-breakpoint-pick-active',
        !!this._breakpointPickMode
      );
    }

    this.log(
      this._breakpointPickMode
        ? 'Breakpoint pick mode on'
        : 'Breakpoint pick mode off'
    );
    return this._breakpointPickMode;
  }

  _toggleBreakpointForPath(path) {
    if (!this.breakpoints) this.breakpoints = new Set();

    if (this.breakpoints.has(path)) {
      this.breakpoints.delete(path);
      this._highlightInTree(path, 'clearBreakpoint', {
        label: '',
        title: 'Breakpoint removed',
        clearCurrent: false,
      });
      this.log('Removed breakpoint: ' + path);
      return false;
    }

    this.breakpoints.add(path);
    this._highlightInTree(path, 'breakpoint', {
      label: 'BREAK',
      title: 'Breakpoint: ' + path,
      clearCurrent: false,
    });
    this.log('Breakpoint set: ' + path);
    return true;
  }

  _hasBreakpoint(path) {
    return !!this.breakpoints?.has?.(path);
  }

  _clearBreakpoints() {
    const paths = Array.from(this.breakpoints || []);
    this.breakpoints = new Set();

    for (const path of paths) {
      this._highlightInTree(path, 'clearBreakpoint', {
        clearCurrent: false,
      });
    }

    this.log('Cleared breakpoints');
    return paths.length;
  }

  async _deleteFile(path) {
    const key = String(path || '').trim();

    if (!key) {
      return false;
    }

    const rootId = '/' + key.split('/').filter(Boolean)[0];
    const store = this.app?.workspaceFileStores?.get?.(rootId);
    let ok = false;

    try {
      if (store && typeof store.delete === 'function') {
        await store.delete(key);
        ok = true;
      } else if (
        this.app?.inMemoryFileStore &&
        typeof this.app.inMemoryFileStore.delete === 'function'
      ) {
        this.app.inMemoryFileStore.delete(key);
        ok = true;
      } else {
        this.log?.('deleteFile blocked legacy /api fallback for ' + key);
        return false;
      }
    } catch (error) {
      this.stats.errors++;
      this.log?.('deleteFile failed: ' + key + ': ' + error.message);
      return false;
    }

    if (ok) {
      this.stats.modified++;
      this.log?.('deleted ' + key);
      this._highlightInTree?.(key, 'deleted', {
        label: 'DEL',
        title: 'Deleted file',
        clearCurrent: false,
      });
    }

    return ok;
  }

  async _moveFile(source, dest) {
    const content = this._readFile(source);
    if (content === null) {
      this.log('❌ moveFile failed: source not found: ' + source);
      return false;
    }
    const delOk = await this._deleteFile(source);
    if (!delOk) return false;
    const writeOk = this._writeFile(dest, content, {
      reason: 'programmaticWrite',
    });
    if (writeOk) {
      this.log(`🚚 moved ${source} -> ${dest}`);
      return true;
    }
    return false;
  }

  async extractHtmlDependencies(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const scripts = [];
    const scriptTags = Array.from(doc.querySelectorAll('script[src]'));
    for (const script of scriptTags) {
      const src = script.getAttribute('src');
      if (src) {
        scripts.push(src);
      }
    }

    const links = [];
    const linkTags = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    for (const link of linkTags) {
      const href = link.getAttribute('href');
      if (href) {
        links.push(href);
      }
    }

    return { scripts, links };
  }

  async _refreshScriptDropdown() {
    if (!this.ui.scriptSelect) return;
    this.ui.scriptSelect.innerHTML =
      '<option value="">Loading walkers...</option>';
    this.log('🔍 [WalkScripts] Refreshing script dropdown...');

    try {
      const scripts = await this._loadWalkScripts(this.rootPath);
      this.log(`🔍 [WalkScripts] Found ${scripts.length} valid scripts.`);

      this.ui.scriptSelect.innerHTML =
        '<option value="default">-- Select a Walker --</option>';
      for (const script of scripts) {
        const optText = `${script.category ? script.category + ': ' : ''}${
          script.label
        }`;
        const opt = document.createElement('option');
        opt.value = script.path;
        opt.textContent = optText;
        this.ui.scriptSelect.appendChild(opt);
      }
    } catch (e) {
      this.log('❌ [WalkScripts] Error refreshing dropdown: ' + e.message);
    }
  }

  async _onScriptSelectChanged() {
    const path = this.ui.scriptSelect.value;
    if (!path || path === 'default') return;
    const script = this._availableWalkScripts?.find((s) => s.path === path);

    if (script) {
      this.log(`🔍 [WalkScripts] Selected: ${path}`);
      let ScriptClass = script.ScriptClass;

      // If we deferred evaluation (e.g. regex fallback), eval it now
      if (!ScriptClass) {
        const content = await this._readWalkScriptSource(path);
        if (!content) {
          this.log(`❌ [WalkScripts] Could not read source for ${path}`);
          return;
        }
        // Strip imports that would break new Function()
        const cleanContent = content.replace(/^import\s+.*?;?\s*$/gm, '');
        try {
          const loader = new Function(
            `${cleanContent}\nreturn ${script.className};`
          );
          ScriptClass = loader();
        } catch (e) {
          this.log(
            `❌ [WalkScripts] Critical Eval Error: Cannot run ${script.className} - ${e.message}`
          );
          return;
        }
      }

      try {
        await this._installScript(ScriptClass, script);
        this._activeWalkScriptPath = script.path;
      } catch (e) {
        this.log(`❌ [WalkScripts] Install error: ${e.message}`);
      }
    }
  }

  _focusBaseVibesTree() {
    const pfm =
      this._attachedProjectFilesManager || this.app?.projectFilesManager;
    const trees =
      pfm && typeof pfm.getFileTreeViews === 'function'
        ? pfm.getFileTreeViews()
        : [];
    const tree = trees[0] || null;
    if (!tree) return false;

    const rootPath =
      '/' + String(this.app?.projectName || 'vibes').replace(/^\/+/, '');

    try {
      if (typeof tree.ensureNodeVisible === 'function') {
        tree.ensureNodeVisible(rootPath);
        return true;
      }

      const nodeEl =
        tree.container?.querySelector?.('[data-node-id="' + rootPath + '"]') ||
        tree.treeElement?.querySelector?.('[data-node-id="' + rootPath + '"]');

      if (nodeEl && typeof nodeEl.scrollIntoView === 'function') {
        nodeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return true;
      }
    } catch (error) {}

    return false;
  }
}