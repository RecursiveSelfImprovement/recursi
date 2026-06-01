class VibesEnv {
  constructor({ appRef, fileStore, projectRoot, code }) {
    this.appRef = appRef;
    this.fileStore = fileStore;
    this.projectRoot = projectRoot;
    this.executingCode = code;
    this.logs = [];
    this._changedFiles = new Map();
    this._virtualStore = new Map();
  }

  async runNode(fn) {
    if (typeof fn !== 'function') {
      throw new Error('runNode requires a function parameter.');
    }

    const codeString = fn.toString();

    const approve = await new Promise((resolve) => {
      const content = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: '420px',
          },
        },
        [
          makeElement(
            'p',
            'This capsule requests permission to execute native code on your local computer:'
          ),
          makeElement(
            'pre',
            {
              style: {
                background: '#12131a',
                color: '#a8ffb2',
                padding: '12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                maxHeight: '220px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              },
            },
            codeString
          ),
          makeElement(
            'p',
            {
              style: { color: '#ff7777', fontSize: '11px', fontWeight: 'bold' },
            },
            '⚠️ Warning: Running untrusted local scripts can compromise files, processes, and configurations.'
          ),
        ]
      );

      const dialog = UITools.makeDialog({
        title: 'Local Execution Request',
        content,
        buttons: [
          {
            label: 'Approve & Run',
            className: 'primary',
            onClick: () => {
              resolve(true);
              return true;
            },
          },
          {
            label: 'Deny',
            onClick: () => {
              resolve(false);
              return true;
            },
          },
        ],
        onClose: () => resolve(false),
      });
    });

    if (!approve) {
      this.log('❌ Local execution denied by user.');
      return { success: false, error: 'Denied by user' };
    }

    this.log('🚀 Sending capsule code to local server...');

    try {
      const response = await fetch('http://localhost:7501/api/admin/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/javascript',
        },
        body: codeString,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((l) => this.log(`[node] ${l}`));
      }

      if (data.browserQueue && Array.isArray(data.browserQueue)) {
        for (const script of data.browserQueue) {
          try {
            const browserRunner = new Function(
              'env',
              'UITools',
              'makeElement',
              `return (${script})();`
            );
            browserRunner(this, window.UITools, window.makeElement);
          } catch (scriptErr) {
            this.log(`[browser-exec error] ${scriptErr.message}`);
          }
        }
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown server error');
      }

      return data.result;
    } catch (err) {
      this.log(`❌ Local execution failed: ${err.message}`);
      throw err;
    }
  }

  get changedFiles() {
    return Array.from(this._changedFiles.values());
  }

  _normalizePath(path) {
    if (path === null || path === undefined) return '';
    path = String(path);
    if (!path.startsWith('/')) return '/' + path;
    return path;
  }

  _storeGet(path) {
    const key = this._normalizePath(path);
    if (!key) return undefined;

    const keyLower = key.toLowerCase();

    for (const fs of this._getStoreCandidates()) {
      if (fs.has && fs.has(key)) return fs.get(key);
      if (fs[key] !== undefined) return fs[key];

      const allKeys = fs.keys ? [...fs.keys()] : Object.keys(fs);
      const match = allKeys.find((k) => String(k).toLowerCase() === keyLower);
      if (match) return fs.get ? fs.get(match) : fs[match];
    }

    return undefined;
  }

  readFile(path) {
    const key = this._normalizePath(path);
    if (this._virtualStore.has(key) && this._virtualStore.get(key) === null)
      return null;
    if (this._virtualStore.has(key)) return this._virtualStore.get(key);
    const entry = this._storeGet(path);
    if (entry === undefined || entry === null) return null;
    return typeof entry === 'string'
      ? entry
      : entry.content ?? entry.value ?? null;
  }

  writeFile(path, content) {
    const key = this._normalizePath(path);
    const parts = key.split('/').filter(Boolean);
    const rootId = '/' + parts[0];

    const isInsideProject =
      key.startsWith(this.projectRoot + '/') || key === this.projectRoot;
    const isSharedLib = key.startsWith('/library/');
    const isWorkspace = this.appRef?.workspaceFileStores?.has(rootId);

    if (isInsideProject && parts.length > 1) {
      const nestedRootId = '/' + parts[1];
      if (
        this.appRef?.workspaceFileStores?.has(nestedRootId) &&
        nestedRootId !== rootId
      ) {
        const msg = `❌ Refusing to write cross-root nested path: ${key}\n\nPath '${parts[1]}' is its own workspace root. Write to '${nestedRootId}/...' instead.`;
        this.logs.push(msg);
        if (typeof alert !== 'undefined') alert(msg);
        return;
      }
    }

    if (!isInsideProject && !isSharedLib && !isWorkspace) {
      const msg = `❌ Cannot write outside project bounds: ${key}\n\nOnly files under ${this.projectRoot}/, /library/, or open workspace folders can be written.`;
      this.logs.push(msg);
      if (typeof alert !== 'undefined') alert(msg);
      return;
    }

    let isNewFile = true;
    for (const fs of this._getStoreCandidates()) {
      if (fs.has ? fs.has(key) : fs[key] !== undefined) {
        isNewFile = false;
        break;
      }
    }

    let oldContent = null;
    if (!isNewFile) {
      const entry = this._storeGet(key);
      oldContent =
        typeof entry === 'string'
          ? entry
          : entry?.content ?? entry?.value ?? null;
    }

    this._changedFiles.set(key, {
      path: key,
      before: oldContent,
      after: content,
    });
    this._virtualStore.set(key, content);
    this.logs.push('[writeFile] queued write: ' + key);
  }

  deleteFile(paths) {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    let allOk = true;
    for (const path of pathArray) {
      const key = this._normalizePath(path);
      const parts = key.split('/').filter(Boolean);
      const rootId = '/' + parts[0];
      const isInsideProject =
        key.startsWith(this.projectRoot + '/') || key === this.projectRoot;
      const isSharedLib = key.startsWith('/library/');
      const isWorkspace = this.appRef?.workspaceFileStores?.has(rootId);

      if (isInsideProject && parts.length > 1) {
        const nestedRootId = '/' + parts[1];
        if (
          this.appRef?.workspaceFileStores?.has(nestedRootId) &&
          nestedRootId !== rootId
        ) {
          const msg = `❌ Refusing cross-root nested delete: ${key}\n\nPath '${parts[1]}' is its own workspace root.`;
          this.logs.push(msg);
          if (typeof alert !== 'undefined') alert(msg);
          allOk = false;
          continue;
        }
      }

      if (!isInsideProject && !isSharedLib && !isWorkspace) {
        const msg = `❌ Cannot delete outside project bounds: ${key}\n\nOnly files under ${this.projectRoot}/, /library/, or open workspaces can be deleted.`;
        this.logs.push(msg);
        if (typeof alert !== 'undefined') alert(msg);
        allOk = false;
        continue;
      }

      const inVirtual =
        this._virtualStore.has(key) && this._virtualStore.get(key) !== null;
      let inStore = false;
      for (const fs of this._getStoreCandidates()) {
        if (fs.has ? fs.has(key) : fs[key] !== undefined) {
          inStore = true;
          break;
        }
      }

      if (!inVirtual && !inStore) {
        this.logs.push('[deleteFile] not found: ' + key);
        allOk = false;
        continue;
      }

      this._changedFiles.set(key, {
        path: key,
        before: this._storeGet(key),
        after: null,
      });
      this._virtualStore.set(key, null);
      this.logs.push('[deleteFile] queued for deletion: ' + key);
    }
    return allOk;
  }

  

  

  ensureImport(filePathOrName, importStatement) {
    let resolvedPath = filePathOrName;
    if (!filePathOrName.startsWith('/')) {
      const allFiles = this.listFiles();
      const matches = allFiles.filter((p) => {
        if (!p.endsWith('.js')) return false;
        const parts = p.split('/');
        const filename = parts[parts.length - 1];
        const withoutExt = filename.substring(0, filename.length - 3);
        return withoutExt.toLowerCase() === filePathOrName.toLowerCase();
      });
      if (matches.length === 1) resolvedPath = matches[0];
      else if (matches.length === 0) {
        this.logs.push(
          '[ensureImport] no file found matching: ' + filePathOrName
        );
        return false;
      } else {
        this.logs.push('[ensureImport] ambiguous: ' + matches.join(', '));
        return false;
      }
    }

    const key = this._normalizePath(resolvedPath);
    const content = this.readFile(key);
    if (content === null || content === undefined) {
      this.logs.push('[ensureImport] file not found: ' + key);
      return false;
    }

    let insertIdx = 0;
    try {
      const jmp =
        this.appRef &&
        this.appRef.codeParser &&
        this.appRef.codeParser.jsModuleParser;

      if (jmp) {
        const { imports } = jmp.getImports(content, key);
        if (imports && imports.length > 0) {
          insertIdx = Math.max(...imports.map((imp) => imp.end));
        }

        const newImportsRes = jmp.getImports(importStatement, key);
        const newImports = newImportsRes.imports || [];

        if (newImports.length > 0) {
          const newResolved = jmp._resolveImportPath(key, newImports[0].source);
          let ast;
          try {
            ast = jmp.acorn.parse(content, {
              ecmaVersion: 'latest',
              sourceType: 'module',
            });
          } catch (e) {}

          if (ast) {
            for (const node of ast.body) {
              if (
                node.type === 'ImportDeclaration' &&
                (jmp._resolveImportPath(key, node.source.value) ===
                  newResolved ||
                  node.source.value === newImports[0].source)
              ) {
                let newAst;
                try {
                  newAst = jmp.acorn.parse(importStatement, {
                    ecmaVersion: 'latest',
                    sourceType: 'module',
                  });
                } catch (e) {
                  continue;
                }

                const newDecl = newAst.body.find(
                  (n) => n.type === 'ImportDeclaration'
                );
                if (!newDecl) continue;

                const existingSpecs = node.specifiers;
                let needsAddition = false;
                const mergedSpecs = [...existingSpecs];

                for (const nSpec of newDecl.specifiers) {
                  const alreadyHas = existingSpecs.some((eSpec) => {
                    if (eSpec.type !== nSpec.type) return false;
                    if (eSpec.type === 'ImportSpecifier') {
                      return (
                        eSpec.imported.name === nSpec.imported.name &&
                        eSpec.local.name === nSpec.local.name
                      );
                    }
                    return eSpec.local.name === nSpec.local.name;
                  });

                  if (!alreadyHas) {
                    mergedSpecs.push(nSpec);
                    needsAddition = true;
                  }
                }

                if (!needsAddition) {
                  this.logs.push(
                    '[ensureImport] already present: ' + importStatement.trim()
                  );
                  return false;
                }

                const defaultSpec = mergedSpecs.find(
                  (s) => s.type === 'ImportDefaultSpecifier'
                );
                const namespaceSpec = mergedSpecs.find(
                  (s) => s.type === 'ImportNamespaceSpecifier'
                );
                const namedSpecs = mergedSpecs.filter(
                  (s) => s.type === 'ImportSpecifier'
                );

                let parts = [];
                if (defaultSpec) parts.push(defaultSpec.local.name);
                if (namespaceSpec)
                  parts.push(`* as ${namespaceSpec.local.name}`);
                if (namedSpecs.length > 0) {
                  const namedStr = namedSpecs
                    .map((s) => {
                      return s.imported.name === s.local.name
                        ? s.local.name
                        : `${s.imported.name} as ${s.local.name}`;
                    })
                    .join(', ');
                  parts.push(`{ ${namedStr} }`);
                }

                const newImportLine = `import ${parts.join(', ')} from ${
                  node.source.raw
                };`;
                const newContent =
                  content.slice(0, node.start) +
                  newImportLine +
                  content.slice(node.end);

                this.writeFile(resolvedPath, newContent);
                this.logs.push(
                  '[ensureImport] merged into existing import: ' +
                    importStatement.trim()
                );
                return true;
              }
            }
          }
        }
      }
    } catch (e) {
      this.logs.push('[ensureImport] AST error: ' + e.message);
    }

    const before = content.slice(0, insertIdx);
    const after = content.slice(insertIdx);
    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const newContent =
      before + prefix + importStatement.trim() + '\n' + after.trimStart();

    this.writeFile(resolvedPath, newContent);
    this.logs.push('[ensureImport] added: ' + importStatement.trim());
    return true;
  }

  deleteImport(filePathOrName, symbolName) {
    let resolvedPath = filePathOrName;
    if (!filePathOrName.startsWith('/')) {
      const allFiles = this.listFiles();
      const matches = allFiles.filter((p) => {
        if (!p.endsWith('.js')) return false;
        const filename = p.split('/').pop();
        const withoutExt = filename.substring(0, filename.length - 3);
        return withoutExt.toLowerCase() === filePathOrName.toLowerCase();
      });
      if (matches.length === 1) resolvedPath = matches[0];
      else if (matches.length === 0) {
        this.logs.push(
          '[deleteImport] no file found matching: ' + filePathOrName
        );
        return false;
      } else {
        this.logs.push('[deleteImport] ambiguous: ' + matches.join(', '));
        return false;
      }
    }

    const key = this._normalizePath(resolvedPath);
    const content = this.readFile(key);
    if (!content) {
      this.logs.push('[deleteImport] file not found: ' + key);
      return false;
    }

    try {
      const jmp = this.appRef?.codeParser?.jsModuleParser;
      if (!jmp) throw new Error('JsModuleParser not available');

      const ast = jmp.acorn.parse(content, {
        ecmaVersion: 'latest',
        sourceType: 'module',
      });
      if (!ast) throw new Error('Failed to parse AST');

      let modified = false;
      let removals = [];

      for (const node of ast.body) {
        if (node.type === 'ImportDeclaration') {
          const specifiers = node.specifiers;
          const targetSpecifier = specifiers.find(
            (s) => s.local.name === symbolName
          );

          if (targetSpecifier) {
            modified = true;
            if (specifiers.length === 1) {
              removals.push({
                start: node.start,
                end: node.end,
                replacement: '',
              });
            } else {
              const remaining = specifiers.filter(
                (s) => s.local.name !== symbolName
              );
              const defaultSpec = remaining.find(
                (s) => s.type === 'ImportDefaultSpecifier'
              );
              const namespaceSpec = remaining.find(
                (s) => s.type === 'ImportNamespaceSpecifier'
              );
              const namedSpecs = remaining.filter(
                (s) => s.type === 'ImportSpecifier'
              );

              let parts = [];
              if (defaultSpec) parts.push(defaultSpec.local.name);
              if (namespaceSpec) parts.push(`* as ${namespaceSpec.local.name}`);
              if (namedSpecs.length > 0) {
                const namedStr = namedSpecs
                  .map((s) => {
                    return s.imported.name === s.local.name
                      ? s.local.name
                      : `${s.imported.name} as ${s.local.name}`;
                  })
                  .join(', ');
                parts.push(`{ ${namedStr} }`);
              }

              const newImportLine = `import ${parts.join(', ')} from ${
                node.source.raw
              };`;
              removals.push({
                start: node.start,
                end: node.end,
                replacement: newImportLine,
              });
            }
          }
        }
      }

      if (!modified) {
        this.logs.push(
          '[deleteImport] symbol not found in imports: ' + symbolName
        );
        return false;
      }

      let newContent = content;
      removals
        .sort((a, b) => b.start - a.start)
        .forEach((r) => {
          let actEnd = r.end;
          if (r.replacement === '' && newContent[actEnd] === '\n') {
            actEnd += 1;
          }
          newContent =
            newContent.slice(0, r.start) +
            r.replacement +
            newContent.slice(actEnd);
        });

      this.writeFile(resolvedPath, newContent);
      this.logs.push('[deleteImport] removed ' + symbolName + ' from ' + key);
      return true;
    } catch (e) {
      this.logs.push('[deleteImport] Error: ' + e.message);
      return false;
    }
  }

  moveFile(sourcePath, destinationPath) {
    if (!sourcePath || !destinationPath) return;

    let content = this.readFile(sourcePath);
    if (content) {
      const oldName = sourcePath.split('/').pop().replace(/\.js$/, '');
      const newName = destinationPath.split('/').pop().replace(/\.js$/, '');

      const acorn = typeof window !== 'undefined' ? window.acorn : null;
      if (acorn) {
        try {
          const ast = acorn.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ranges: true,
          });
          // Cleanly rename the class using AST ranges
          const classNode = ast.body.find(
            (n) => n.type === 'ClassDeclaration' && n.id?.name === oldName
          );
          if (classNode) {
            content =
              content.substring(0, classNode.id.start) +
              newName +
              content.substring(classNode.id.end);
          }
        } catch (e) {
          this.log(
            `Warning: AST parsing failed during class rename for ${sourcePath}`
          );
        }
      }

      const writer =
        typeof window !== 'undefined' ? window.ManagedMetadataWriter : null;
      if (acorn && writer) {
        let meta = writer.extractMetadata(content, acorn) || {};
        meta.provides = [newName];

        // Cleanly strip the old metadata using the official writer
        const stripped = writer.stripMetadata({
          text: content,
          acorn,
          className: newName,
        });
        if (stripped && stripped.text) content = stripped.text;

        // Inject fresh metadata
        const injected = writer.injectMetadata({
          text: content,
          filePath: destinationPath,
          className: newName,
          metadata: meta,
          acorn,
        });
        if (injected.ok) content = injected.text;
      }

      // Stage write BEFORE delete so it safely completes
      this.writeFile(destinationPath, content);
      this.deleteFile(sourcePath);
    } else {
      this.log(`Warning: Could not read source file for move: ${sourcePath}`);
    }
  }

  findFile(pattern, hint = null) {
      const all = this.listFiles();
      let matches;
      if (pattern instanceof RegExp) {
        matches = all.filter((p) => pattern.test(p));
      } else {
        const lower = pattern.toLowerCase();
        matches = all.filter((p) => p.toLowerCase().includes(lower));
      }

      // Filter matches by path hint if present
      if (hint && typeof hint === 'string') {
        const cleanHint = hint.toLowerCase().replace(/^\/+/, '');
        const filtered = matches.filter(p => p.toLowerCase().includes(cleanHint));
        if (filtered.length > 0) {
          matches = filtered;
        }
      }

      if (matches.length === 1) return matches[0];
      if (matches.length === 0) {
        this.logs.push('[findFile] no match for: ' + pattern + (hint ? ' with hint: ' + hint : ''));
        return null;
      }
      if (typeof pattern === 'string') {
        const lower = pattern.toLowerCase();
        const exact = matches.filter((p) => {
          const parts = p.split('/');
          const filename = parts[parts.length - 1].toLowerCase();
          return filename === lower || filename.replace(/\.js$/, '') === lower;
        });
        if (exact.length === 1) return exact[0];
      }
      this.logs.push(
        '[findFile] ambiguous (' +
          matches.length +
          ' matches) for: ' +
          pattern +
          ' -> ' +
          matches.join(', ')
      );
      return null;
    }

  log(...args) {
    const line = args
      .map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2)))
      .join(' ');
    this.logs.push(line);
  }

  clearOutput() {
    this.logs.length = 0;
    try {
      if (this.appRef?.uiManager?.showInOutputTab) {
        this.appRef.uiManager.showInOutputTab('');
      }
    } catch (e) {}
  }

  setVisibility(spec) {
    if (!spec) return;

    const log = (...args) => {
      if (typeof this.log === 'function') {
        this.log(...args);
      } else if (Array.isArray(this.logs)) {
        this.logs.push(args.map((arg) => String(arg)).join(' '));
      }
    };

    const reset = spec.resetFirst !== false;
    const pfm = this.appRef?.projectFilesManager;
    const trees = [];
    const seen = new Set();

    const addTree = (tree, source) => {
      if (!tree || seen.has(tree)) return;
      seen.add(tree);
      trees.push({ tree, source });
    };

    if (pfm) {
      if (typeof pfm.getFileTreeViews === 'function') {
        try {
          const found = pfm.getFileTreeViews();
          if (Array.isArray(found)) {
            for (const tree of found) addTree(tree, 'pfm.getFileTreeViews');
          }
        } catch (error) {
          log(
            '[setVisibility] getFileTreeViews failed:',
            error.message || String(error)
          );
        }
      }

      if (typeof pfm._forEachFileTreeView === 'function') {
        try {
          pfm._forEachFileTreeView((tree) =>
            addTree(tree, 'pfm._forEachFileTreeView')
          );
        } catch (error) {
          log(
            '[setVisibility] _forEachFileTreeView failed:',
            error.message || String(error)
          );
        }
      }

      addTree(pfm.fileTreeView, 'pfm.fileTreeView');

      for (const key of [
        'fileTreeViews',
        'floatingTreeViews',
        'openTreeViews',
        'treeViews',
        '_fileTreeViews',
        '_floatingTreeViews',
        '_openTreeViews',
        '_treeViews',
      ]) {
        const value = pfm[key];
        if (Array.isArray(value)) {
          for (const tree of value) addTree(tree, 'pfm.' + key);
        } else if (value instanceof Set) {
          for (const tree of value) addTree(tree, 'pfm.' + key);
        } else if (value instanceof Map) {
          for (const tree of value.values()) addTree(tree, 'pfm.' + key);
        }
      }
    }

    if (trees.length === 0) {
      log('[setVisibility] No file trees found');
      return;
    }

    const filesObj = spec.files || {};
    const patternsArr = Array.isArray(spec.patterns) ? spec.patterns : [];
    const missingFiles = new Set(Object.keys(filesObj));
    let changedCount = 0;
    let resetCount = 0;
    let scannedCount = 0;

    const normalizeState = (oldState, newState) => {
      const base = reset
        ? {
            code: false,
            codeLevel: 0,
            signatures: false,
            sig: false,
            docs: false,
            docsLevel: 0,
          }
        : { ...(oldState || {}) };

      if (!newState) return base;

      if (newState.codeLevel !== undefined) {
        base.codeLevel = Number(newState.codeLevel) || 0;
        base.code = base.codeLevel > 0;
      } else if (newState.code !== undefined) {
        base.code = !!newState.code;
        if (base.codeLevel === undefined || base.codeLevel === 0) {
          base.codeLevel = base.code ? 4 : 0;
        }
      }

      if (newState.sig !== undefined) {
        base.sig = !!newState.sig;
        base.signatures = !!newState.sig;
      }

      if (newState.signatures !== undefined) {
        base.signatures = !!newState.signatures;
        base.sig = !!newState.signatures;
      }

      if (newState.docsLevel !== undefined) {
        base.docsLevel = Number(newState.docsLevel) || 0;
        base.docs = base.docsLevel > 0;
      } else if (newState.docs !== undefined) {
        base.docs = !!newState.docs;
        if (base.docsLevel === undefined || base.docsLevel === 0) {
          base.docsLevel = base.docs ? 4 : 0;
        }
      }

      return base;
    };

    const applyToNode = (node, state) => {
      if (!node || !node.visibilityWidget) return false;
      const current = node.visibilityWidget.state || {};
      const normalized = normalizeState(current, state);

      if (typeof node.setVisibilityState === 'function') {
        node.setVisibilityState(normalized);
      } else if (typeof node.visibilityWidget.setState === 'function') {
        node.visibilityWidget.setState(normalized, true);
      } else {
        return false;
      }

      return true;
    };

    const nodeEntriesForTree = (tree) => {
      if (tree?.nodesMap instanceof Map) {
        return Array.from(tree.nodesMap.entries());
      }

      if (tree?.nodesMap && typeof tree.nodesMap === 'object') {
        return Object.entries(tree.nodesMap);
      }

      if (tree?.nodes instanceof Map) {
        return Array.from(tree.nodes.entries());
      }

      if (tree?.nodes && typeof tree.nodes === 'object') {
        return Object.entries(tree.nodes);
      }

      return [];
    };

    for (const entry of trees) {
      const tree = entry.tree;
      const entries = nodeEntriesForTree(tree);
      let treeChanged = 0;
      let treeReset = 0;
      let treeScanned = 0;

      for (const [id, node] of entries) {
        if (!node || node.type !== 'file' || !node.visibilityWidget) continue;

        treeScanned++;
        scannedCount++;

        const path = String(node.id || id || '');
        let newState = null;

        if (Object.prototype.hasOwnProperty.call(filesObj, path)) {
          newState = filesObj[path];
          missingFiles.delete(path);
        } else {
          for (const patternSpec of patternsArr) {
            const match = patternSpec && patternSpec.match;
            const matched =
              typeof match === 'string'
                ? path.includes(match)
                : match instanceof RegExp
                ? match.test(path)
                : false;

            if (matched) {
              newState = patternSpec;
              break;
            }
          }
        }

        if (newState !== null || reset) {
          try {
            if (applyToNode(node, newState)) {
              if (newState !== null) {
                changedCount++;
                treeChanged++;
              } else {
                resetCount++;
                treeReset++;
              }
            }
          } catch (error) {
            log(
              '[setVisibility] failed node:',
              path,
              error.message || String(error)
            );
          }
        }
      }

      try {
        tree.redrawLines?.();
      } catch (error) {
        log(
          '[setVisibility] redrawLines failed:',
          error.message || String(error)
        );
      }

      try {
        tree.options?.onVisibilityChange?.();
      } catch (error) {
        log(
          '[setVisibility] tree onVisibilityChange failed:',
          error.message || String(error)
        );
      }

      log(
        '[setVisibility] tree:',
        entry.source,
        'scanned=' + treeScanned,
        'matched=' + treeChanged,
        'reset=' + treeReset
      );
    }

    try {
      this.appRef?.buildPromptTab?._widgetStateChangeCallback?.();
    } catch (error) {
      log(
        '[setVisibility] buildPromptTab callback failed:',
        error.message || String(error)
      );
    }

    try {
      this.appRef?.visibilityManager?.notify?.();
    } catch (error) {
      log(
        '[setVisibility] visibilityManager notify failed:',
        error.message || String(error)
      );
    }

    for (const path of missingFiles) {
      log('[setVisibility] skipped (not found): ' + path);
    }

    log(
      '[setVisibility] applied matched=' +
        changedCount +
        ' reset=' +
        resetCount +
        ' scanned=' +
        scannedCount +
        ' trees=' +
        trees.length +
        ' resetFirst=' +
        reset
    );
  }

  async saveVisibilitySet(name, spec) {
    const isCapturingCurrentWidgets = !spec;
    const effectiveSpec =
      spec || this._visibilityBuildSpecFromCurrentWidgets(name);

    if (isCapturingCurrentWidgets) {
      const fileCount = Object.keys(effectiveSpec.files || {}).length;
      const roots = this._visibilityRootsForSet(effectiveSpec);
      const limit = 100;

      if (fileCount > limit) {
        this.log('visibility set capture refused: too many active widgets');
        this.log('name:', String(name || '').trim() || '(unnamed)');
        this.log('active files:', fileCount);
        this.log('roots:', roots.join(', ') || '(none)');
        this.log('limit:', limit);
        this.log(
          'Use env.saveVisibilitySet(name, explicitSpec) for large generated sets.'
        );
        this.log(
          'Tip: narrow the tree/widget state first, then run saveVisibilitySet(name) again.'
        );
        return {
          ok: false,
          refused: true,
          reason: 'too-many-active-widgets',
          name: String(name || '').trim(),
          fileCount,
          roots,
          limit,
        };
      }
    }

    const normalized = this._visibilityNormalizeSet(name, effectiveSpec);
    const partitions = this._visibilityPartitionSetByRoot(normalized);

    if (partitions.length > 1) {
      const saved = [];

      for (const part of partitions) {
        const methodName = this._visibilityMethodNameForSet(part.name);
        const capsulePath = this._visibilityCapsulePath();
        const before = this._visibilityEnsureCapsuleSource(
          this.readFile(capsulePath)
        );
        const methodSource = this._visibilityBuildMethodSource(
          methodName,
          part
        );
        const after = this._visibilityUpsertSetMethod(
          before,
          methodName,
          methodSource
        );

        this.writeFile(capsulePath, after);

        saved.push({
          name: part.name,
          methodName,
          treeRoot: part.treeRoot,
          fileCount: Object.keys(part.files || {}).length,
          patternCount: Array.isArray(part.patterns) ? part.patterns.length : 0,
        });
      }

      this.log(
        'visibility set split by tree root:',
        normalized.name,
        '=>',
        saved.map((item) => item.name).join(', ')
      );

      for (const item of saved) {
        this.log(
          'saved partition:',
          item.name,
          'treeRoot:',
          item.treeRoot || '(none)',
          'method:',
          item.methodName,
          'files:',
          item.fileCount,
          'patterns:',
          item.patternCount
        );
      }

      return {
        ...normalized,
        split: true,
        partitions: saved,
      };
    }

    const single = partitions[0] || normalized;
    const methodName = this._visibilityMethodNameForSet(single.name);
    const capsulePath = this._visibilityCapsulePath();
    const before = this._visibilityEnsureCapsuleSource(
      this.readFile(capsulePath)
    );
    const methodSource = this._visibilityBuildMethodSource(methodName, single);
    const after = this._visibilityUpsertSetMethod(
      before,
      methodName,
      methodSource
    );

    this.writeFile(capsulePath, after);

    this.log('visibility set saved to capsule:', single.name);
    this.log('method:', methodName);
    this.log('treeRoot:', single.treeRoot || '(none)');
    this.log('treeLabel:', single.treeLabel || '(none)');
    this.log('files:', Object.keys(single.files || {}).length);
    this.log(
      'patterns:',
      Array.isArray(single.patterns) ? single.patterns.length : 0
    );

    return single;
  }

  async loadVisibilitySet(name) {
    const requested = String(name || '').trim();
    const requestedSlug = this._visibilitySlug(requested);
    const sets = this._visibilityReadAllSetsFromCapsule({
      includeDuplicates: true,
    });
    const candidates = [];

    for (const item of sets) {
      if (
        item.name === requested ||
        item.id === requested ||
        item.methodName === requested
      ) {
        candidates.push(item);
        continue;
      }

      if (
        this._visibilitySlug(item.name) === requestedSlug ||
        this._visibilitySlug(item.id) === requestedSlug
      ) {
        candidates.push(item);
      }
    }

    const found = this._visibilityChooseBestSetEntry(candidates, requested);

    if (!found || !found.set) {
      this.log('visibility set not found:', requested);
      this.log(
        'available sets:',
        sets.map((item) => item.name + ' [' + item.methodName + ']').join(', ')
      );
      return null;
    }

    const normalized = this._visibilityNormalizeSet(found.set.name, found.set);
    this.setVisibility(normalized);

    this.log('visibility set loaded and applied:', normalized.name);
    this.log('method:', found.methodName);
    this.log('files:', Object.keys(normalized.files || {}).length);
    this.log(
      'patterns:',
      Array.isArray(normalized.patterns) ? normalized.patterns.length : 0
    );

    return normalized;
  }

  listVisibilitySets() {
    const sets = this._visibilityReadAllSetsFromCapsule();

    return sets.map((item) => {
      return {
        name: item.name,
        id: item.id,
        methodName: item.methodName,
        description: item.description || '',
        scope: item.scope || 'workspace',
        fileCount: item.fileCount || 0,
        patternCount: item.patternCount || 0,
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
        error: item.error || undefined,
      };
    });
  }

  

  listFiles(pattern) {
    const all = [];

    for (const fs of this._getStoreCandidates()) {
      const keys = fs.keys ? [...fs.keys()] : Object.keys(fs);
      all.push(...keys);
    }

    const virtual = [...this._virtualStore.keys()].filter(
      (k) => this._virtualStore.get(k) !== null
    );

    let unique = [...new Set([...all, ...virtual])];

    // INJECTED HISTORY FILTER: Blind the environment to the shadow archive
    unique = unique.filter((p) => !p.includes('/.vibes-history/'));

    if (!pattern) return unique;

    if (pattern instanceof RegExp) {
      return unique.filter((p) => pattern.test(p));
    }

    const lower = String(pattern).toLowerCase();
    return unique.filter((p) => String(p).toLowerCase().includes(lower));
  }

  _getStoreCandidates() {
    const stores = [];

    if (this.fileStore) stores.push(this.fileStore);

    const liveStore = this.appRef?.inMemoryFileStore;
    if (liveStore && liveStore !== this.fileStore) {
      stores.push(liveStore);
    }

    const workspaceStores = this.appRef?.workspaceFileStores;
    if (workspaceStores) {
      if (workspaceStores.values) {
        for (const store of workspaceStores.values()) {
          if (store && !stores.includes(store)) stores.push(store);
        }
      } else {
        for (const key of Object.keys(workspaceStores)) {
          const store = workspaceStores[key];
          if (store && !stores.includes(store)) stores.push(store);
        }
      }
    }

    return stores.filter(Boolean);
  }

  _sanityTestMethod() {
    return 'sanity_ok';
  }

  saveCapsule(targetPath) {
      const code = this.executingCode;
      if (!code) {
        this.logs.push('[saveCapsule] No executing code found.');
        return false;
      }
      this.writeFile(targetPath, code);
      this.logs.push(`[saveCapsule] Saved class capsule to ${targetPath}`);
      return true;
    }

  

  _visibilityCapsulePath() {
    return '/vibes/VisibilitySetsCapsule.js';
  }

  _visibilityNowIso() {
    return new Date().toISOString();
  }

  _visibilitySlug(value) {
    const text = String(value || 'unnamed')
      .trim()
      .toLowerCase();
    let out = '';
    let previousDash = false;

    for (const ch of text) {
      const code = ch.charCodeAt(0);
      const isDigit = code >= 48 && code <= 57;
      const isLower = code >= 97 && code <= 122;
      const isUpper = code >= 65 && code <= 90;

      if (isDigit || isLower || isUpper) {
        out += ch.toLowerCase();
        previousDash = false;
      } else if (!previousDash) {
        out += '-';
        previousDash = true;
      }
    }

    while (out.startsWith('-')) out = out.slice(1);
    while (out.endsWith('-')) out = out.slice(0, -1);

    return out || 'unnamed';
  }

  _visibilityMethodNameForSet(name) {
    const slug = this._visibilitySlug(name);
    const parts = slug.split('-');
    let suffix = '';

    for (const part of parts) {
      if (!part) continue;
      suffix += part.charAt(0).toUpperCase() + part.slice(1);
    }

    return '_set_' + (suffix || 'Unnamed');
  }

  _visibilityFriendlyNameFromMethodName(methodName) {
    const raw = String(methodName || '');

    if (!raw.startsWith('_set_')) {
      return raw || 'Unnamed';
    }

    const suffix = raw.slice(5);
    let out = '';

    for (let i = 0; i < suffix.length; i += 1) {
      const ch = suffix.charAt(i);
      const code = ch.charCodeAt(0);
      const isUpper = code >= 65 && code <= 90;

      if (i > 0 && isUpper) {
        out += ' ';
      }

      out += ch;
    }

    return out.trim() || 'Unnamed';
  }

  _visibilityNormalizeState(state) {
    const input = state && typeof state === 'object' ? state : {};

    let codeLevel = Number(input.codeLevel);
    if (!Number.isFinite(codeLevel)) {
      codeLevel = input.code ? 4 : 0;
    }

    if (codeLevel < 0) codeLevel = 0;
    if (codeLevel > 4) codeLevel = 4;

    const docsLevelRaw = Number(input.docsLevel);
    let docsLevel = Number.isFinite(docsLevelRaw)
      ? docsLevelRaw
      : input.docs
      ? 4
      : 0;
    if (docsLevel < 0) docsLevel = 0;
    if (docsLevel > 4) docsLevel = 4;

    const signatures = !!(input.signatures || input.sig);
    const code = !!input.code || codeLevel > 0;
    const docs = !!input.docs || docsLevel > 0;

    return {
      code,
      codeLevel: code ? codeLevel || 4 : 0,
      sig: signatures,
      signatures,
      docs,
      docsLevel: docs ? docsLevel || 4 : 0,
    };
  }

  _visibilityNormalizeSet(nameOrSet, maybeSpec) {
    let input;

    if (typeof nameOrSet === 'string') {
      input =
        maybeSpec && typeof maybeSpec === 'object' ? { ...maybeSpec } : {};
      input.name = input.name || nameOrSet;
    } else {
      input =
        nameOrSet && typeof nameOrSet === 'object' ? { ...nameOrSet } : {};
    }

    const name = String(
      input.name || input.id || 'Unnamed Visibility Set'
    ).trim();
    const now = this._visibilityNowIso();
    const normalized = {
      id: input.id || this._visibilitySlug(name),
      name,
      description: input.description || '',
      scope: input.scope || 'workspace',
      createdAt: input.createdAt || now,
      updatedAt: now,
      resetFirst: input.resetFirst !== false,
      treeRoot: input.treeRoot || null,
      treeLabel: input.treeLabel || null,
      files: {},
      patterns: Array.isArray(input.patterns) ? input.patterns.slice() : [],
    };

    const files =
      input.files && typeof input.files === 'object' ? input.files : {};

    for (const path of Object.keys(files)) {
      normalized.files[path] = this._visibilityNormalizeState(files[path]);
    }

    const roots = this._visibilityRootsForSet(normalized);
    if (!normalized.treeRoot && roots.length === 1) {
      normalized.treeRoot = roots[0];
    }

    if (!normalized.treeLabel && normalized.treeRoot) {
      normalized.treeLabel = this._visibilityRootLabel(normalized.treeRoot);
    }

    return normalized;
  }

  _visibilityEnsureCapsuleSource(source) {
    if (source && String(source).trim()) {
      return String(source);
    }

    return [
      'class VisibilitySetsCapsule {',
      '
',
      '}',
      '',
    ].join('\n');
  }

  _visibilityGetAcorn() {
    if (typeof acorn !== 'undefined' && acorn && acorn.parse) {
      return acorn;
    }

    if (typeof window !== 'undefined' && window.acorn && window.acorn.parse) {
      return window.acorn;
    }

    if (
      typeof globalThis !== 'undefined' &&
      globalThis.acorn &&
      globalThis.acorn.parse
    ) {
      return globalThis.acorn;
    }

    throw new Error(
      'Acorn is required to read/write VisibilitySetsCapsule.js safely.'
    );
  }

  _visibilityParseCapsule(source) {
    const acornInstance = this._visibilityGetAcorn();

    try {
      return acornInstance.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'script',
      });
    } catch (scriptError) {
      try {
        return acornInstance.parse(source, {
          ecmaVersion: 'latest',
          sourceType: 'module',
        });
      } catch (moduleError) {
        throw scriptError;
      }
    }
  }

  _visibilityFindCapsuleClass(ast) {
    const body = ast && Array.isArray(ast.body) ? ast.body : [];

    for (const node of body) {
      if (
        node.type === 'ClassDeclaration' &&
        node.id &&
        node.id.name === 'VisibilitySetsCapsule'
      ) {
        return node;
      }

      if (node.type === 'ExportNamedDeclaration') {
        const declaration = node.declaration;
        if (
          declaration &&
          declaration.type === 'ClassDeclaration' &&
          declaration.id &&
          declaration.id.name === 'VisibilitySetsCapsule'
        ) {
          return declaration;
        }
      }
    }

    return null;
  }

  _visibilityGetMethodName(methodNode) {
    if (!methodNode || !methodNode.key) return '';

    if (methodNode.key.type === 'Identifier') {
      return methodNode.key.name || '';
    }

    if (methodNode.key.type === 'Literal') {
      return String(methodNode.key.value || '');
    }

    return '';
  }

  _visibilityBuildMethodSource(methodName, normalizedSet) {
    const json = JSON.stringify(normalizedSet, null, 2);
    const indentedJson = json
      .split('\n')
      .map((line) => '    ' + line)
      .join('\n');

    return [
      '  static ' + methodName + '() {',
      '    return ' + indentedJson.trimStart() + ';',
      '  }',
    ].join('\n');
  }

  _visibilityUpsertSetMethod(source, methodName, methodSource) {
    const safeSource = this._visibilityEnsureCapsuleSource(source);
    const ast = this._visibilityParseCapsule(safeSource);
    const classNode = this._visibilityFindCapsuleClass(ast);

    if (!classNode) {
      throw new Error(
        'VisibilitySetsCapsule class not found in /vibes/VisibilitySetsCapsule.js'
      );
    }

    const members =
      classNode.body && Array.isArray(classNode.body.body)
        ? classNode.body.body
        : [];
    let existing = null;

    for (const member of members) {
      if (this._visibilityGetMethodName(member) === methodName) {
        existing = member;
        break;
      }
    }

    if (existing) {
      return (
        safeSource.slice(0, existing.start) +
        methodSource +
        safeSource.slice(existing.end)
      );
    }

    const insertAt = classNode.body.end - 1;
    const needsLeadingNewline = safeSource.charAt(insertAt - 1) !== '\n';
    const insertion =
      (needsLeadingNewline ? '\n' : '') + '\n' + methodSource + '\n';

    return (
      safeSource.slice(0, insertAt) + insertion + safeSource.slice(insertAt)
    );
  }

  _visibilityEvaluateSetMethod(methodSource) {
    const wrapper = [
      'class __VisibilitySetEvalWrapper {',
      methodSource,
      '}',
      'return __VisibilitySetEvalWrapper.' +
        this._visibilityGetMethodNameFromSource(methodSource) +
        '();',
    ].join('\n');

    return Function(wrapper)();
  }

  _visibilityReadAllSetsFromCapsule(options = {}) {
    const capsulePath = this._visibilityCapsulePath();
    const source = this._visibilityEnsureCapsuleSource(
      this.readFile(capsulePath)
    );
    const ast = this._visibilityParseCapsule(source);
    const classNode = this._visibilityFindCapsuleClass(ast);

    if (!classNode) {
      return [];
    }

    const members =
      classNode.body && Array.isArray(classNode.body.body)
        ? classNode.body.body
        : [];
    const rawEntries = [];

    for (const member of members) {
      const methodName = this._visibilityGetMethodName(member);
      if (!methodName.startsWith('_set_')) continue;

      const methodSource = source.slice(member.start, member.end);

      try {
        const rawSet = this._visibilityEvaluateSetMethod(methodSource);
        const fallbackName =
          this._visibilityFriendlyNameFromMethodName(methodName);
        const normalized = this._visibilityNormalizeSet(
          rawSet && rawSet.name ? rawSet.name : fallbackName,
          rawSet
        );

        rawEntries.push({
          methodName,
          name: normalized.name,
          id: normalized.id,
          description: normalized.description || '',
          scope: normalized.scope || 'workspace',
          fileCount: normalized.files
            ? Object.keys(normalized.files).length
            : 0,
          patternCount: Array.isArray(normalized.patterns)
            ? normalized.patterns.length
            : 0,
          createdAt: normalized.createdAt || '',
          updatedAt: normalized.updatedAt || '',
          set: normalized,
        });
      } catch (error) {
        rawEntries.push({
          methodName,
          name: this._visibilityFriendlyNameFromMethodName(methodName),
          id: this._visibilitySlug(methodName),
          description: '',
          scope: 'workspace',
          fileCount: 0,
          patternCount: 0,
          createdAt: '',
          updatedAt: '',
          error: error && error.message ? error.message : String(error),
        });
      }
    }

    const includeDuplicates = !!options.includeDuplicates;

    if (includeDuplicates) {
      rawEntries.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return rawEntries;
    }

    const groups = new Map();

    for (const entry of rawEntries) {
      const key = this._visibilitySlug(
        entry.name || entry.id || entry.methodName
      );
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }

    const deduped = [];

    for (const group of groups.values()) {
      const requestedName = group[0] && group[0].name ? group[0].name : '';
      const best = this._visibilityChooseBestSetEntry(group, requestedName);
      if (best) deduped.push(best);
    }

    deduped.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return deduped;
  }

  _visibilityGetMethodNameFromSource(methodSource) {
    const wrappedSource = 'class X {\n' + methodSource + '\n}';
    const ast = this._visibilityParseCapsule(wrappedSource);
    const classNode = ast.body && ast.body.length ? ast.body[0] : null;

    if (!classNode || !classNode.body || !Array.isArray(classNode.body.body)) {
      throw new Error('Could not parse visibility set method wrapper.');
    }

    const members = classNode.body.body;

    if (!members.length) {
      throw new Error('Could not parse visibility set method source.');
    }

    return this._visibilityGetMethodName(members[0]);
  }

  _visibilitySetEntryScore(entry, requestedName) {
    if (!entry || entry.error) return -1000000;

    const requested = String(requestedName || '').trim();
    const requestedSlug = this._visibilitySlug(requested);
    const canonicalMethod = requested
      ? this._visibilityMethodNameForSet(requested)
      : '';

    let score = 0;

    if (entry.methodName === canonicalMethod) score += 100000;
    if (entry.name === requested) score += 50000;
    if (this._visibilitySlug(entry.name) === requestedSlug) score += 25000;
    if (entry.id && this._visibilitySlug(entry.id) === requestedSlug)
      score += 10000;

    const fileCount = Number(entry.fileCount || 0);
    const patternCount = Number(entry.patternCount || 0);

    score += fileCount * 100;
    score += patternCount * 20;

    if (entry.description) score += 10;
    if (entry.createdAt) score += 2;
    if (entry.updatedAt) score += 3;

    if (entry.set && entry.set.files && Object.keys(entry.set.files).length) {
      score += Object.keys(entry.set.files).length * 100;
    }

    if (
      entry.set &&
      Array.isArray(entry.set.patterns) &&
      entry.set.patterns.length
    ) {
      score += entry.set.patterns.length * 20;
    }

    return score;
  }

  _visibilityChooseBestSetEntry(entries, requestedName) {
    const list = Array.isArray(entries) ? entries.slice() : [];

    list.sort((a, b) => {
      const scoreDelta =
        this._visibilitySetEntryScore(b, requestedName) -
        this._visibilitySetEntryScore(a, requestedName);
      if (scoreDelta !== 0) return scoreDelta;

      const aUpdated = String(a && a.updatedAt ? a.updatedAt : '');
      const bUpdated = String(b && b.updatedAt ? b.updatedAt : '');
      return bUpdated.localeCompare(aUpdated);
    });

    return list.length ? list[0] : null;
  }

  _visibilityBuildSpecFromCurrentWidgets(name = '') {
    const files = {};
    const roots = new Set();
    const trees = this._visibilityGetFileTreeViews();

    for (const tree of trees) {
      const nodesMap = tree?.nodesMap;
      if (!nodesMap || typeof nodesMap.values !== 'function') {
        continue;
      }

      for (const node of nodesMap.values()) {
        if (!node || node.type !== 'file' || !node.visibilityWidget) {
          continue;
        }

        const path = this._visibilityPathForNode(node);
        if (!path) {
          continue;
        }

        const state = this._visibilityStateFromWidget(node.visibilityWidget);
        if (!this._visibilityStateIsActive(state)) {
          continue;
        }

        files[path] = state;

        const root = this._visibilityRootForPath(path);
        if (root) {
          roots.add(root);
        }
      }
    }

    const rootList = Array.from(roots);
    const spec = {
      name: String(name || 'Captured Visibility Set').trim(),
      resetFirst: true,
      files,
      patterns: [],
    };

    if (rootList.length === 1) {
      spec.treeRoot = rootList[0];
      spec.treeLabel = this._visibilityRootLabel(rootList[0]);
    }

    this.log(
      'captured current visibility widgets:',
      Object.keys(files).length,
      'file(s)',
      rootList.length ? 'root(s): ' + rootList.join(', ') : 'no roots'
    );

    return spec;
  }

  _visibilityGetFileTreeViews() {
    const pfm = this.appRef?.projectFilesManager;
    const trees = [];

    if (pfm && typeof pfm.getFileTreeViews === 'function') {
      const fromManager = pfm.getFileTreeViews();
      if (Array.isArray(fromManager)) {
        trees.push(...fromManager);
      }
    }

    if (pfm?.fileTreeView && !trees.includes(pfm.fileTreeView)) {
      trees.push(pfm.fileTreeView);
    }

    const extraCandidates = [
      this.appRef?.fileTreeView,
      this.appRef?.buildPromptTab?.fileTreeView,
      this.appRef?.buildPromptTab?.treeView,
    ];

    for (const candidate of extraCandidates) {
      if (candidate && !trees.includes(candidate)) {
        trees.push(candidate);
      }
    }

    return trees;
  }

  _visibilityPathForNode(node) {
    const candidates = [
      node?.id,
      node?.path,
      node?.fullPath,
      node?.filePath,
      node?.goldenPath,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.startsWith('/')) {
        return candidate;
      }
    }

    return null;
  }

  _visibilityStateFromWidget(widget) {
    const state =
      widget?.state && typeof widget.state === 'object' ? widget.state : {};
    return this._visibilityNormalizeState(state);
  }

  _visibilityStateIsActive(state) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    return !!(
      state.code ||
      state.sig ||
      state.signatures ||
      state.docs ||
      Number(state.codeLevel) > 0 ||
      Number(state.docsLevel) > 0
    );
  }

  _visibilityPartitionSetByRoot(set) {
    const normalized = this._visibilityNormalizeSet(set);
    const roots = this._visibilityRootsForSet(normalized);

    if (roots.length <= 1) {
      if (!normalized.treeRoot && roots.length === 1) {
        normalized.treeRoot = roots[0];
      }

      if (!normalized.treeLabel && normalized.treeRoot) {
        normalized.treeLabel = this._visibilityRootLabel(normalized.treeRoot);
      }

      return [normalized];
    }

    const byRoot = new Map();

    for (const path of Object.keys(normalized.files || {})) {
      const root = this._visibilityRootForPath(path) || '';
      if (!byRoot.has(root)) {
        byRoot.set(root, {});
      }
      byRoot.get(root)[path] = normalized.files[path];
    }

    const parts = [];

    for (const root of roots) {
      const rootFiles = byRoot.get(root) || {};
      const rootLabel = this._visibilityRootLabel(root);
      const partName = normalized.name + ' - ' + rootLabel;

      parts.push({
        ...normalized,
        id: this._visibilitySlug(partName),
        name: partName,
        description: normalized.description,
        treeRoot: root,
        treeLabel: rootLabel,
        files: rootFiles,
        patterns: Array.isArray(normalized.patterns)
          ? normalized.patterns.slice()
          : [],
      });
    }

    return parts;
  }

  _visibilityRootsForSet(set) {
    const roots = new Set();
    const files = set?.files && typeof set.files === 'object' ? set.files : {};

    for (const path of Object.keys(files)) {
      const root = this._visibilityRootForPath(path);
      if (root) {
        roots.add(root);
      }
    }

    return Array.from(roots).sort();
  }

  _visibilityRootForPath(path) {
    if (typeof path !== 'string') {
      return null;
    }

    const parts = path.split('/').filter(Boolean);
    if (!parts.length) {
      return null;
    }

    return '/' + parts[0];
  }

  _visibilityRootLabel(root) {
    if (typeof root !== 'string' || !root.trim()) {
      return 'workspace';
    }

    const parts = root.split('/').filter(Boolean);
    return parts[0] || 'workspace';
  }

  async searchCode(query, options = {}) {
    const app = this.appRef;
    if (
      app &&
      app.commands &&
      typeof app.commands.fuzzySearchMethods === 'function'
    ) {
      const results = await app.commands.fuzzySearchMethods({
        query,
        ...options,
      });
      this.log('\n' + results);
      return results;
    }
    return 'Search failed: AppCommands.fuzzySearchMethods not available.';
  }

  extractClass(className) {
    const acorn =
      (typeof window !== 'undefined' && window.acorn) ||
      (this.appRef && this.appRef.codeParser && this.appRef.codeParser.acorn);
    if (!acorn) return null;
    const codeToParse = this.executingCode || this.code;
    if (!codeToParse) return null;
    const utils = typeof AstUtils !== 'undefined' ? AstUtils : window.AstUtils;
    const { ast, comments, error } = utils.parseCode(acorn, codeToParse);
    if (error || !ast) return null;
    const decl = utils.findDeclarationByName(ast, className);
    if (decl && decl.node) {
      const start = utils.findEffectiveStart(
        decl.node,
        comments || [],
        codeToParse,
        0
      );
      return codeToParse.substring(start, decl.node.end);
    }
    return null;
  }

  writeClassToFile(className, targetPath) {
    const source = this.extractClass(className);
    if (source) {
      // Just write the raw, pure class block.
      this.writeFile(targetPath, source);
    } else {
      this.log(`Error: Could not extract class ${className}`);
    }
  }

  

  

  async saveClass(options, classExpression) {
      if (!options) throw new Error('saveClass requires an options object');

      let className = options.name;
      if (
        !className &&
        classExpression &&
        typeof classExpression === 'function'
      ) {
        className = classExpression.name;
      }

      if (!className && options.path) {
        className = options.path.split('/').pop().replace(/\.js$/i, '');
      }

      if (!className) {
        const optsStr = JSON.stringify(options || {});
        const exprStr = String(classExpression || '')
          .substring(0, 150)
          .replace(/\n/g, '\\n');
        throw new Error(
          `[saveClass Error] Missing class name!\n` +
            `Could not determine target class name. options.name was missing, and we couldn't infer it from the path.\n` +
            `Options passed: ${optsStr}\n` +
            `Payload snippet: "${exprStr}..."\n` +
            `Fix: Add 'name: "YourClassName"' to the options object.`
        );
      }

      let targetPath = options.path;
      if (!targetPath) {
        targetPath = await this._resolveTargetPath(className);
        if (!targetPath) {
          throw new Error(
            `[saveClass Error] Could not find or resolve file for class '${className}'. Please provide a 'path' in options.`
          );
        }
      }

      let pristineSource = '';
      if (typeof classExpression === 'string') {
        pristineSource = classExpression;
      } else if (classExpression) {
        pristineSource = this._extractClassSource(className);
      }

      const type = options.type || 'modify';
      let currentContent = this.readFile(targetPath);

      if (type === 'new') {
        if (currentContent !== null) {
          throw new Error(
            `[saveClass Error] File already exists at '${targetPath}'. To modify an existing JavaScript file, you must use type: "modify" to apply safe method-level patches.`
          );
        }
        let newContent = pristineSource;
        newContent = this._updateMetadata(
          newContent,
          targetPath,
          className,
          options
        );
        this.writeFile(targetPath, newContent);
        return true;
      } else if (type === 'modify') {
        if (currentContent === null) {
          let newContent = pristineSource;
          newContent = this._updateMetadata(
            newContent,
            targetPath,
            className,
            options
          );
          this.writeFile(targetPath, newContent);
          return true;
        }

        let patchedContent = currentContent;

        // Surgically handle deleteMethods array directly within saveClass
        if (options.deleteMethods && Array.isArray(options.deleteMethods)) {
          const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;
          if (CJCP) {
            for (const method of options.deleteMethods) {
              let mockContent = patchedContent;
              const mockEnv = {
                appRef: this.appRef,
                readFile: (p) => mockContent,
                writeFile: (p, c) => { mockContent = c; },
                log: () => {}
              };
              CJCP.deleteMethod(mockEnv, {
                methodName: method,
                targetFile: targetPath,
                targetClass: className,
                allowComplianceDowngrade: true
              });
              patchedContent = mockContent;
            }
          }
        }

        if (pristineSource) {
          patchedContent = this._applySurgicalDiff(
            patchedContent,
            pristineSource,
            className
          );
        }
        patchedContent = this._updateMetadata(
          patchedContent,
          targetPath,
          className,
          options
        );

        if (patchedContent !== currentContent) {
          this.writeFile(targetPath, patchedContent);
        } else {
          this.log(`ℹ️ No changes detected for ${className} at ${targetPath}.`);
        }
        return true;
      }
    }

  _extractClassSource(className) {
    const acorn = this.appRef?.codeParser?.acorn || window.acorn;
    if (!acorn) return null;
    let foundSource = null;
    const code = this.executingCode;

    try {
      let ast;
      try {
        ast = acorn.parse(code, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ranges: true,
        });
      } catch (e) {
        ast = acorn.parse(`class _W_ {\n${code}\n}`, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ranges: true,
        });
      }

      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (foundSource) return;

        if (
          className &&
          (node.type === 'ClassDeclaration' ||
            node.type === 'ClassExpression') &&
          node.id &&
          node.id.name === className
        ) {
          foundSource = code.substring(node.start, node.end);
          return;
        }

        if (
          node.type === 'CallExpression' &&
          node.callee &&
          node.callee.property &&
          node.callee.property.name === 'saveClass'
        ) {
          if (node.arguments && node.arguments.length >= 2) {
            const classArg = node.arguments[1];
            if (
              classArg.type === 'ClassExpression' ||
              classArg.type === 'ClassDeclaration'
            ) {
              if (
                !className ||
                (classArg.id && classArg.id.name === className)
              ) {
                foundSource = code.substring(classArg.start, classArg.end);
                return;
              }
            }
          }
        }

        for (const key in node) {
          if (Array.isArray(node[key])) node[key].forEach(walk);
          else if (
            node[key] &&
            typeof node[key] === 'object' &&
            typeof node[key].type === 'string'
          )
            walk(node[key]);
        }
      };

      walk(ast);
      return foundSource;
    } catch (e) {
      this.log('Extract class source error: ' + e.message);
      return null;
    }
  }

  _applySurgicalDiff(current, donor, className) {
    const acorn = this.appRef?.codeParser?.acorn || window.acorn;
    const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;

    if (!CJCP || !acorn) {
      this.log(
        'Missing ClientJSClassPatcher for surgical diff, falling back to replace.'
      );
      return donor;
    }

    let patched = current;
    const methods = CJCP._listClassMethods(donor, className);

    for (const method of methods) {
      const srcObj = CJCP._findMethodInSource(donor, method, {
        className,
        includeComments: true,
      });
      if (!srcObj) continue;

      const existing = CJCP._findMethodInSource(patched, method, {
        className,
        includeComments: true,
      });

      if (existing) {
        patched =
          patched.slice(0, existing.start) +
          srcObj.source +
          patched.slice(existing.end);
      } else {
        try {
          const ast = acorn.parse(patched, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ranges: true,
          });
          let targetClassNode = null;
          ast.body.forEach((n) => {
            if (n.type === 'ClassDeclaration' && n.id?.name === className)
              targetClassNode = n;
            else if (
              n.type === 'ExportDefaultDeclaration' &&
              n.declaration?.type === 'ClassDeclaration' &&
              (n.declaration.id?.name === className || !n.declaration.id)
            )
              targetClassNode = n.declaration;
            else if (
              n.type === 'ExportNamedDeclaration' &&
              n.declaration?.type === 'ClassDeclaration' &&
              n.declaration.id?.name === className
            )
              targetClassNode = n.declaration;
          });

          if (targetClassNode) {
            const insertAt = targetClassNode.end - 1;
            patched =
              patched.slice(0, insertAt) +
              '\n  ' +
              srcObj.source.trim() +
              '\n' +
              patched.slice(insertAt);
          }
        } catch (e) {
          this.log('Surgical diff parse error: ' + e.message);
        }
      }
    }
    return patched;
  }

  _updateMetadata(content, targetPath, className, options) {
    if (!content) return content;
    const writer =
      window.ManagedMetadataWriter || globalThis.ManagedMetadataWriter;
    const acorn = this.appRef?.codeParser?.acorn || window.acorn;
    if (!writer || !acorn) return content;

    let meta = writer.extractMetadata(content, acorn) || {};
    if (!meta.provides || meta.provides.length === 0)
      meta.provides = [className];
    if (!meta.dependencies) meta.dependencies = [];

    if (options.dependencies && Array.isArray(options.dependencies)) {
      meta.dependencies = [...options.dependencies];
    } else {
      if (options.addDependencies && Array.isArray(options.addDependencies)) {
        for (const dep of options.addDependencies) {
          if (!meta.dependencies.includes(dep)) meta.dependencies.push(dep);
        }
      }
      if (
        options.deleteDependencies &&
        Array.isArray(options.deleteDependencies)
      ) {
        meta.dependencies = meta.dependencies.filter(
          (d) => !options.deleteDependencies.includes(d)
        );
      }
    }

    let baseContent = content;
    const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;

    // STRICTLY strip ALL existing getMetadata blocks (fixes duplication bugs)
    if (CJCP && typeof CJCP._findMethodInSource === 'function') {
      let existing;
      while (
        (existing = CJCP._findMethodInSource(baseContent, 'getMetadata', {
          className,
          isStatic: true,
          includeComments: true,
        }))
      ) {
        baseContent =
          baseContent.slice(0, existing.start) +
          baseContent.slice(existing.end);
      }
    }

    // Fallback pass with the official metadata writer
    const stripped = writer.stripMetadata({
      text: baseContent,
      acorn,
      className,
    });
    if (stripped && stripped.text) baseContent = stripped.text;

    const injected = writer.injectMetadata({
      text: baseContent,
      filePath: targetPath,
      className,
      metadata: meta,
      acorn,
    });
    return injected.ok ? injected.text : baseContent;
  }

  async _resolveTargetPath(className, options = {}) {
      const allFiles = this.listFiles();
      let matches;
      const lower = className.toLowerCase();

      const exact = allFiles.filter((p) => {
        const parts = p.split('/');
        const filename = parts[parts.length - 1].toLowerCase();
        return filename === lower || filename.replace(/\.js$/, '') === lower;
      });

      if (exact.length > 0) {
        matches = exact;
      } else {
        matches = allFiles.filter((p) => p.toLowerCase().includes(lower));
      }

      // Filter by path hint if provided
      const hint = options.hint || options.pathHint;
      if (hint && typeof hint === 'string') {
        const cleanHint = hint.toLowerCase().replace(/^\/+/, '');
        const filtered = matches.filter(p => p.toLowerCase().includes(cleanHint));
        if (filtered.length > 0) {
          matches = filtered;
        }
      }

      if (matches.length === 0) {
        this.logs.push(`[saveClass] No file found for class: ${className}`);
        return null;
      }
      if (matches.length === 1) {
        return matches[0];
      }

      const inOpenTree = matches.filter((p) => this._isPathInOpenTree(p));

      if (inOpenTree.length === 1) {
        this.log(
          `⚠️ Ambiguous class name "${className}". Automatically chose ${inOpenTree[0]} because it is in an open tree. Please provide 'path' in options next time.`
        );
        return inOpenTree[0];
      }

      const optionsToAsk = inOpenTree.length > 1 ? inOpenTree : matches;
      const chosen = await this._askUserToResolveAmbiguity(
        className,
        optionsToAsk
      );

      if (chosen) {
        this.log(
          `⚠️ Ambiguous class name "${className}". User manually resolved to ${chosen}. Please provide 'path' in options next time.`
        );
      } else {
        this.log(`❌ User cancelled ambiguity resolution for "${className}".`);
      }
      return chosen;
    }

  _isPathInOpenTree(path) {
      const pfm = this.appRef?.projectFilesManager;
      if (!pfm) return false;
      let found = false;
      const trees = typeof pfm.getFileTreeViews === 'function' ? pfm.getFileTreeViews() : [];
      for (const tree of trees) {
        if (tree?.nodesMap && tree.nodesMap.has(path)) {
          found = true;
          break;
        }
      }
      return found;
    }

  _askUserToResolveAmbiguity(className, options) {
    return new Promise((resolve) => {
      const UIToolsObj =
        typeof window !== 'undefined'
          ? window.UITools || this.appRef?.uiManager?.uiTools
          : null;
      if (!UIToolsObj) {
        resolve(options[0]);
        return;
      }

      const content = document.createElement('div');
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      content.style.gap = '10px';

      const msg = document.createElement('p');
      msg.textContent = `The class name "${className}" is ambiguous. Multiple files match. Please select the correct target file:`;
      content.appendChild(msg);

      let selectedPath = options[0];

      const select = document.createElement('select');
      select.style.padding = '8px';
      select.style.background = 'var(--bg-primary, #1e1e1e)';
      select.style.color = 'var(--text-primary, #fff)';
      select.style.border = '1px solid var(--border-color, #444)';
      select.style.borderRadius = '4px';

      options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });

      select.onchange = (e) => {
        selectedPath = e.target.value;
      };

      content.appendChild(select);

      let dialog;
      dialog = UIToolsObj.makeDialog({
        title: 'Ambiguous Class Name',
        content: content,
        buttons: [
          {
            label: 'Select',
            className: 'primary',
            onClick: () => {
              dialog.close();
              resolve(selectedPath);
            },
          },
          {
            label: 'Cancel',
            onClick: () => {
              dialog.close();
              resolve(null);
            },
          },
        ],
      });
    });
  }

  async addDependency(path, manifestPath = null) {
      if (this.appRef?.commands?.addDependency) {
        return await this.appRef.commands.addDependency({ path, manifestPath });
      }
      this.log('❌ addDependency failed: commands list not loaded on app.');
      return { ok: false, error: 'Commands not loaded' };
    }

  async removeDependency(path, manifestPath = null) {
      if (this.appRef?.commands?.removeDependency) {
        return await this.appRef.commands.removeDependency({ path, manifestPath });
      }
      this.log('❌ removeDependency failed: commands list not loaded on app.');
      return { ok: false, error: 'Commands not loaded' };
    }
}