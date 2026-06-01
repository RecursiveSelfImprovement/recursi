class UnifiedProtocolExecutor {

  constructor(app) {
    /* NCBFInstallNoCodeBlockFallback */ setTimeout(
      () => this._ncbfInstallNoCodeBlockFallback?.(),
      0
    );

    this.app = app;
  }

  static detect(text) {
      if (typeof RecursiProtocolExecutor !== 'undefined') {
        return RecursiProtocolExecutor.detect(text);
      }
      return false;
    }

  static detectFileReplace(text) {
      if (!text) return null;
      const lines = text.split('\n');

      let firstLineIdx = 0;
      while (firstLineIdx < lines.length && lines[firstLineIdx].trim() === '') {
        firstLineIdx++;
      }
      if (firstLineIdx >= lines.length) return null;

      if (/^```/.test(lines[firstLineIdx].trim())) {
        firstLineIdx++;
        while (firstLineIdx < lines.length && lines[firstLineIdx].trim() === '') {
          firstLineIdx++;
        }
      }
      if (firstLineIdx >= lines.length) return null;

      const match = lines[firstLineIdx].match(
        /^\/\/\s*(\/?[\w.\/ -]+\.[a-zA-Z0-9]+)\s*(?:\((?:recursi:)?(new|replace)\))?(.*)$/i
      );
      if (!match) return null;

      let path = match[1];
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      const mode = match[2] ? match[2].toLowerCase() : null;
      const inlineContent = match[3] ? match[3].trim() : '';

      // STRICT BLOCK: Refuse to process .js files via whole-file replacement.
      // Whole-file replacements for existing JavaScript files are completely disallowed.
      // Only 'new' mode is allowed to create completely brand-new files.
      if (path.endsWith('.js') && (mode === 'replace' || !mode)) {
        return null;
      }

      let contentLines = lines.slice(firstLineIdx + 1);

      let lastIdx = contentLines.length - 1;
      while (lastIdx >= 0 && contentLines[lastIdx].trim() === '') lastIdx--;

      if (lastIdx >= 0 && /^```/.test(contentLines[lastIdx].trim())) {
        contentLines = contentLines.slice(0, lastIdx);
      }

      let content = contentLines.join('\n');
      if (inlineContent) {
        content = inlineContent + '\n' + content;
      }
      content = content.trim();

      return { path, mode, content };
    }

  async executeFileReplace(detected, fileStore) {
      const normalizePath = (path) => {
        if (!path.startsWith('/')) return '/' + path;
        return path;
      };
      const key = normalizePath(detected.path);

      if (detected.path.endsWith('.js') && detected.mode === 'replace') {
        this._appendOutput(
          `[UnifiedProtocol] Error: Whole-file replacements for existing JavaScript files are disabled.`
        );
        return false;
      }

      const storeGet = (path) => {
        const pKey = normalizePath(path);
        if (fileStore.has && fileStore.has(pKey)) return fileStore.get(pKey);
        if (fileStore[pKey] !== undefined) return fileStore[pKey];
        const keyLower = pKey.toLowerCase();
        const allKeys = fileStore.keys
          ? [...fileStore.keys()]
          : Object.keys(fileStore);
        const match = allKeys.find((k) => k.toLowerCase() === keyLower);
        return match
          ? fileStore.get
            ? fileStore.get(match)
            : fileStore[match]
          : undefined;
      };

      let oldContent = null;
      const entry = storeGet(key);
      if (entry !== undefined && entry !== null) {
        oldContent =
          typeof entry === 'string'
            ? entry
            : entry.content ?? entry.value ?? null;
      }

      if (detected.mode === 'new' && oldContent !== null) {
        this._appendOutput(
          `[UnifiedProtocol] Error: File already exists, cannot use (new) mode for ${detected.path}`
        );
        return false;
      }
      if (detected.mode === 'replace' && oldContent === null) {
        this._appendOutput(
          `[UnifiedProtocol] Error: File does not exist, cannot use (replace) mode for ${detected.path}`
        );
        return false;
      }

      let isImplicitNew = false;
      if (!detected.mode && oldContent === null) {
        isImplicitNew = true;
      }

      if (
        oldContent !== null &&
        detected.mode !== 'replace' &&
        detected.mode !== 'new'
      ) {
        const acorn =
          this.app?.codeParser?.acorn ||
          (typeof window !== 'undefined' ? window.acorn : null);
        if (acorn) {
          let isNakedMethod = false;
          try {
            acorn.parse(detected.content, {
              ecmaVersion: 'latest',
              sourceType: 'module',
            });
          } catch (e) {
            try {
              const wrapped = `class _D_ extends Object {\n${detected.content}\n}`;
              const { ast, error } = AstUtils.parseCode(acorn, wrapped);
              if (!error && ast && ast.body[0]?.type === 'ClassDeclaration') {
                isNakedMethod = true;
              }
            } catch (e2) {}
          }

          if (isNakedMethod) {
            this._appendOutput(
              `[UnifiedProtocol] Detected naked method(s) for ${detected.path}. Converting to surgical transplant.`
            );
            const CJCP = window.ClientJSClassPatcher || ClientJSClassPatcher;
            const wrappedDonor = `class _D_ extends Object {\n${detected.content}\n}`;
            const methodsToTransplant = CJCP._listClassMethods(
              wrappedDonor,
              '_D_'
            );

            let currentContent = oldContent;
            const appliedMethods = [];

            for (const methodSig of methodsToTransplant) {
              const donorSrcObj = CJCP._findMethodInSource(
                wrappedDonor,
                methodSig,
                { className: '_D_', includeComments: true }
              );
              if (!donorSrcObj) {
                this._appendOutput(
                  `[UnifiedProtocol] Warning: Could not extract source for ${methodSig}`
                );
                continue;
              }

              const targetClasses = CJCP._listAllClasses(currentContent);
              const targetClass = targetClasses[0]; 
              if (!targetClass) {
                this._appendOutput(
                  `[UnifiedProtocol] Warning: No target class found in file ${detected.path}`
                );
                continue;
              }

              const classBody = CJCP._findClassBody(currentContent, targetClass);
              if (!classBody) continue;

              const innerContent = currentContent.slice(
                classBody.bodyStart,
                classBody.bodyEnd
              );

              let targetKind = undefined;
              let targetStatic = undefined;
              let cleanMethodName = methodSig;
              if (cleanMethodName.startsWith('static ')) {
                targetStatic = true;
                cleanMethodName = cleanMethodName.substring(7).trim();
              }
              if (cleanMethodName.startsWith('get ')) {
                targetKind = 'get';
                cleanMethodName = cleanMethodName.substring(4).trim();
              } else if (cleanMethodName.startsWith('set ')) {
                targetKind = 'set';
                cleanMethodName = cleanMethodName.substring(4).trim();
              }

              const existing = CJCP._findMethodInSource(
                innerContent,
                cleanMethodName,
                {
                  isStatic: targetStatic,
                  kind: targetKind,
                }
              );

              if (existing) {
                const absStart = classBody.bodyStart + existing.start;
                const absEnd = classBody.bodyStart + existing.end;
                currentContent =
                  currentContent.slice(0, absStart) +
                  donorSrcObj.source +
                  currentContent.slice(absEnd);
                appliedMethods.push(`~ ${methodSig}`);
              } else {
                currentContent =
                  currentContent.slice(0, classBody.bodyEnd) +
                  '\n  ' +
                  donorSrcObj.source +
                  '\n' +
                  currentContent.slice(classBody.bodyEnd);
                appliedMethods.push(`+ ${methodSig}`);
              }
            }

            if (appliedMethods.length > 0) {
              detected.content = currentContent;
              this._appendOutput(
                `[UnifiedProtocol] Successfully spliced methods: ${appliedMethods.join(
                  ', '
                )}`
              );
            } else {
              this._appendOutput(
                `[UnifiedProtocol] Error: Detected naked method but surgical transplant failed to parse or splice.`
              );
              return false;
            }
          }
        } else {
          this._appendOutput(
            `[UnifiedProtocol] Warning: Acorn AST parser not available, skipping Magic Transplant.`
          );
        }
      }

      const before = oldContent;
      
      let finalContent = detected.content;
      if (detected.path.endsWith('.js') && (isImplicitNew || detected.mode === 'new')) {
        const writer = window.ManagedMetadataWriter || globalThis.ManagedMetadataWriter;
        const acorn = this.app?.codeParser?.acorn || window.acorn;
        if (writer && acorn) {
          const existingMeta = writer.extractMetadata(finalContent, acorn);
          if (!existingMeta) {
            const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;
            const classes = CJCP ? CJCP._listAllClasses(finalContent) : [];
            const className = classes[0] || detected.path.split('/').pop().replace('.js', '');
            const meta = writer.makeMetadata({ previousMetadata: { provides: [className] } });
            const injected = writer.injectMetadata({ text: finalContent, filePath: detected.path, className, metadata: meta, acorn });
            if (injected.ok) finalContent = injected.text;
          }
        }
      }

      const plan = {
        file: detected.path,
        action: before === null ? 'create' : 'replaceFile',
        content: finalContent,
        rawBody: finalContent,
        replacements: [],
        additions: [],
        deletions: [],
        importAdditions: [],
        importDeletions: [],
        _viewMode: 'segments',
      };

      const after = detected.content;

      if (
        before !== null &&
        plan.action !== 'create' &&
        detected.mode !== 'replace'
      ) {
        const CJCP = window.ClientJSClassPatcher || ClientJSClassPatcher;
        const isJS = detected.path.endsWith('.js');
        if (isJS) {
          const beforeClasses = CJCP._listAllClasses(before);
          const afterClasses = CJCP._listAllClasses(after);
          const allClasses = [...new Set([...beforeClasses, ...afterClasses])];
          for (const cls of allClasses) {
            const bMethods = new Set(CJCP._listClassMethods(before, cls));
            const aMethods = new Set(CJCP._listClassMethods(after, cls));
            const added = [...aMethods].filter((m) => !bMethods.has(m));
            const removed = [...bMethods].filter((m) => !aMethods.has(m));
            const replaced = [...aMethods].filter((m) => {
              if (!bMethods.has(m)) return false;
              const bSrc = CJCP._findMethodInSource(before, m, {
                className: cls,
                includeComments: true,
              })?.source;
              const aSrc = CJCP._findMethodInSource(after, m, {
                className: cls,
                includeComments: true,
              })?.source;
              const normalize = str => str ? str.replace(/\s+/g, ' ').trim() : '';
              return normalize(bSrc) !== normalize(aSrc);
            });

            for (const m of added) {
              const addedSrc = CJCP._findMethodInSource(after, m, {
                className: cls,
                includeComments: true,
              });
              if (addedSrc)
                plan.additions.push({
                  name: `${cls}.${m}`,
                  code: addedSrc.source,
                });
            }
            for (const m of replaced) {
              const replSrc = CJCP._findMethodInSource(after, m, {
                className: cls,
                includeComments: true,
              });
              if (replSrc)
                plan.replacements.push({
                  name: `${cls}.${m}`,
                  code: replSrc.source,
                });
            }
            for (const m of removed) plan.deletions.push(`${cls}.${m}`);
          }

          try {
            const jmp = this.app?.codeParser?.jsModuleParser;
            if (jmp) {
              const bImp = jmp.getImports(before, detected.path).imports || [];
              const aImp = jmp.getImports(after, detected.path).imports || [];
              plan.importAdditions = aImp.filter(
                (a) => !bImp.some((b) => b.symbol === a.symbol)
              );
              plan.importDeletions = bImp.filter(
                (b) => !aImp.some((a) => a.symbol === b.symbol)
              );
            }
          } catch (e) {}

          if (
            plan.replacements.length > 0 ||
            plan.additions.length > 0 ||
            plan.deletions.length > 0 ||
            plan.importAdditions.length > 0 ||
            plan.importDeletions.length > 0
          ) {
            plan.action = 'update';
          }
        }
      } else if (detected.mode === 'replace') {
        plan._viewMode = 'raw';
      }

      if (
        !plan.replacements.length &&
        !plan.additions.length &&
        !plan.deletions.length
      ) {
        plan._viewMode = 'raw';
      }

      const appRef = this.app;
      const applyPlans = async (approvedPlans) => {
        const changeSummary = this._buildChangeSummary([
          { path: detected.path, before, after: finalContent },
        ]);

        let summaryHeader =
          '[UnifiedProtocol] Whole-File Paste: ' + detected.path;
        if (isImplicitNew) {
          summaryHeader += ' (⚠️ IMPLICIT NEW FILE)';
        } else if (detected.mode === 'new') {
          summaryHeader += ' (NEW)';
        } else if (detected.mode === 'replace') {
          summaryHeader += ' (EXPLICIT FILE REPLACE)';
        }

        this._appendOutput(summaryHeader + '\n\n' + (changeSummary || ''));

        const plansToDelegate = [];
        const filesToDelete = [];

        for (const p of approvedPlans) {
          if (appRef.historyManager) {
             appRef.historyManager.recordFileChange({
                 path: p.file,
                 oldContent: before,
                 content: p.action === 'delete' ? '' : (p.content || p.rawBody),
                 action: p.action === 'delete' ? 'delete' : (before === null ? 'create' : 'update')
             });
          }
          
          if (p.action === 'delete') filesToDelete.push(p.file);
          else plansToDelegate.push(p);

          // 🔥 FULL FILE HOT PATCHING 🔥
          if (appRef.settings && appRef.settings.preferHotPatching !== false) {
             if ((p.action === 'update' || p.action === 'replaceFile' || p.action === 'create') && p.file.endsWith('.js')) {
                const parser = appRef.codeParser?.jsModuleParser;
                const pContent = p.content || p.rawBody;
                if (parser && pContent) {
                   try {
                      const parsed = parser.parseForMetadata(pContent, p.file);
                      const cleanBody = parser.generateCleanBody(pContent, parsed, { stripExports: true, stripImports: true });
                      const targetClass = parsed.mainExport?.name;
                      if (targetClass) {
                         const EvalClass = new Function(cleanBody + "\nreturn " + targetClass + ";")();
                         let Cls = typeof window !== 'undefined' ? window[targetClass] : null;
                         if (!Cls && typeof globalThis !== 'undefined') Cls = globalThis[targetClass];
                         
                         if (Cls && EvalClass) {
                            for (const key of Object.getOwnPropertyNames(EvalClass.prototype)) {
                               if (key !== 'constructor') {
                                  Object.defineProperty(Cls.prototype, key, Object.getOwnPropertyDescriptor(EvalClass.prototype, key));
                               }
                            }
                            for (const key of Object.getOwnPropertyNames(EvalClass)) {
                               if (key !== 'length' && key !== 'name' && key !== 'prototype') {
                                  Object.defineProperty(Cls, key, Object.getOwnPropertyDescriptor(EvalClass, key));
                               }
                            }
                            this._appendOutput(`🔥 Hot-patched full file for ${targetClass} live in memory.`);
                         }
                      }
                   } catch(err) {
                      this._appendOutput(`⚠️ Full-file hot-patch failed for ${p.file}: ${err.message}`);
                   }
                }
             }
          }
        }

        if (plansToDelegate.length > 0) {
          await appRef.actionHandler.applyPastePlans(plansToDelegate);
        }

        for (const path of filesToDelete) {
          try {
            if (appRef.vfs) await appRef.vfs.deleteFile(path, { skipHistory: false });
            if (appRef.projectFilesManager?.removeNode) appRef.projectFilesManager.removeNode(path);
            else if (appRef.projectFilesManager?.refreshFileList) appRef.projectFilesManager.refreshFileList();
            
            if (appRef.tabOrchestrator?.getTabIdForPath) {
               const tabId = appRef.tabOrchestrator.getTabIdForPath(path);
               if (tabId) appRef.tabOrchestrator.removeTab(tabId);
            }
            this._appendOutput('[UnifiedProtocol] ✅ Deleted file ' + path);
          } catch (err) {
            this._appendOutput('[UnifiedProtocol] ❌ Error deleting file ' + path + ': ' + err.message);
          }
        }

        if (
          appRef.actionHandler &&
          typeof appRef.actionHandler.handlePushToRunner === 'function'
        ) {
          appRef.actionHandler.handlePushToRunner();
        }
        
        if (
          appRef.actionHandler &&
          typeof appRef.actionHandler.handleSaveAllFiles === 'function' &&
          appRef.editorControllers &&
          Array.from(appRef.editorControllers.values()).some(
            (c) => c && c.isDirty && typeof c.getReconstructedCode === 'function'
          )
        ) {
          await appRef.actionHandler.handleSaveAllFiles();
        }
      };

      return new Promise((resolve) => {
        new PasteReviewDialog([plan], this.app, async (approvedPlans) => {
          await applyPlans(approvedPlans);
          resolve(true);
        });
      });
    }

  

  async _buildTemporaryFileStore() {
    const fileMap = new Map();

    try {
      const vfs =
        this.app &&
        typeof this.app.refreshVirtualFileSystemStores === 'function'
          ? await this.app.refreshVirtualFileSystemStores()
          : this.app?.vfs || null;

      if (
        !vfs ||
        typeof vfs.listFiles !== 'function' ||
        typeof vfs.readFile !== 'function'
      ) {
        this._appendOutput(
          '[UnifiedProtocol] No VFS available for temporary execution store.'
        );
        return fileMap;
      }

      const allFiles = await vfs.listFiles({
        includeStatic: false,
      });

      for (const path of allFiles || []) {
        const ctrl = this.app.editorControllers?.get?.(path);

        if (ctrl && ctrl.isDirty && typeof ctrl.getCode === 'function') {
          fileMap.set(path, ctrl.getCode());
          continue;
        }

        if (
          ctrl &&
          ctrl.isDirty &&
          typeof ctrl.getReconstructedCode === 'function'
        ) {
          fileMap.set(path, await ctrl.getReconstructedCode('module'));
          continue;
        }

        const content = await vfs.readFile(path, {
          nullOnMissing: true,
          noStaticFetch: true,
        });

        if (typeof content === 'string') {
          fileMap.set(path, content);
        }
      }
    } catch (error) {
      this._appendOutput(
        '[UnifiedProtocol] Error building VFS temp file store: ' + error.message
      );
    }

    return fileMap;
  }

  _appendOutput(text) {
    try {
      if (
        this.app.uiManager &&
        typeof this.app.uiManager.showInOutputTab === 'function'
      ) {
        this.app.uiManager.showInOutputTab(text);
        return;
      }
    } catch (e) {
      console.error('[UnifiedProtocol] _appendOutput error:', e);
    }
    console.log(text);
  }

  _buildChangeSummary(changedFiles) {
    if (!changedFiles.length) return null;
    const CJCP = ClientJSClassPatcher;
    const lines = ['── Files changed ──'];
    for (const { path, before, after } of changedFiles) {
      const shortPath = path.replace(/^\/[^/]+/, '');
      const isJS = path.endsWith('.js');

      if (after === null) {
        lines.push('  ' + shortPath + '  (DELETED)');
        continue;
      }

      const beforeLines = before ? before.split('\n').length : 0;
      const afterLines = after ? after.split('\n').length : 0;
      const delta = afterLines - beforeLines;
      const deltaStr =
        delta === 0
          ? ''
          : delta > 0
          ? '  (+' + delta + ')'
          : '  (' + delta + ')';
      lines.push(
        '  ' +
          shortPath +
          '  ' +
          beforeLines +
          ' → ' +
          afterLines +
          ' lines' +
          deltaStr
      );

      if (isJS) {
        const beforeClasses = before ? CJCP._listAllClasses(before) : [];
        const afterClasses = after ? CJCP._listAllClasses(after) : [];
        const allClasses = [...new Set([...beforeClasses, ...afterClasses])];

        for (const cls of allClasses) {
          const bMethods = new Set(
            before ? CJCP._listClassMethods(before, cls) : []
          );
          const aMethods = new Set(
            after ? CJCP._listClassMethods(after, cls) : []
          );
          const added = [...aMethods].filter((m) => !bMethods.has(m));
          const removed = [...bMethods].filter((m) => !aMethods.has(m));
          const replaced = [...aMethods].filter((m) => {
            if (!bMethods.has(m)) return false;
            // Diff checking strictly isolated per class to prevent bleed
            const bSrc = CJCP._findMethodInSource(before, m, {
              className: cls,
              includeComments: true,
            })?.source;
            const aSrc = CJCP._findMethodInSource(after, m, {
              className: cls,
              includeComments: true,
            })?.source;
            return bSrc !== aSrc;
          });

          if (added.length || removed.length || replaced.length) {
            lines.push('    ' + cls + ':');
            for (const m of replaced) lines.push('      ~ ' + m + '()');
            for (const m of added) lines.push('      + ' + m + '()');
            for (const m of removed) lines.push('      - ' + m + '()');
          }
        }
      }
    }
    return lines.join('\n');
  }

  async execute(text, options = {}) {
      const isRecursi = typeof RecursiProtocolExecutor !== 'undefined' && RecursiProtocolExecutor.detect(text);

      if (isRecursi) {
        const exec = new RecursiProtocolExecutor(this.app);
        return exec.execute(text, options);
      }

      const detected = UnifiedProtocolExecutor.detectFileReplace(text);
      if (detected) {
        let fileStore = this.app.inMemoryFileStore;
        if (!fileStore) {
          fileStore = await this._buildTemporaryFileStore();
        }
        return await this.executeFileReplace(detected, fileStore);
      }

      this._appendOutput('[UnifiedProtocol] No executable run function or valid file replacement block found.');
      return { ok: false };
    }

  async _hydrateLibraryFilesIntoExecutionStore(fileStore) {
    if (!fileStore || typeof fileStore.set !== 'function') {
      return {
        ok: false,
        added: 0,
        reason: 'No writable fileStore.',
      };
    }

    const paths = new Set([
      '/library/recursi.js',
      '/library/ThreeJSApp.js',
      '/library/CompactMenu.js',
      '/library/GlowingTooltip.js',
    ]);

    for (const entry of fileStore.entries ? fileStore.entries() : []) {
      const path = entry[0];
      const content = entry[1];

      if (!String(path).endsWith('index.html') || typeof content !== 'string') {
        continue;
      }

      const marker = 'src=';
      let searchFrom = 0;

      while (searchFrom < content.length) {
        const srcIndex = content.indexOf(marker, searchFrom);
        if (srcIndex < 0) {
          break;
        }

        const quoteIndex = srcIndex + marker.length;
        const quote = content[quoteIndex];

        if (quote !== "'" && quote !== '"') {
          searchFrom = quoteIndex + 1;
          continue;
        }

        const endIndex = content.indexOf(quote, quoteIndex + 1);
        if (endIndex < 0) {
          break;
        }

        const src = content.slice(quoteIndex + 1, endIndex).split('?')[0];

        if (src.startsWith('/library/') && src.endsWith('.js')) {
          paths.add(src);
        }

        searchFrom = endIndex + 1;
      }
    }

    const vfs =
      this.app && typeof this.app.refreshVirtualFileSystemStores === 'function'
        ? await this.app.refreshVirtualFileSystemStores()
        : this.app?.vfs || null;

    let added = 0;
    let already = 0;
    let failed = 0;

    for (const path of Array.from(paths).sort()) {
      if (fileStore.has(path)) {
        already++;
        continue;
      }

      try {
        let content = null;

        if (vfs && typeof vfs.readFile === 'function') {
          content = await vfs.readFile(path, {
            nullOnMissing: true,
          });
        }

        if (typeof content !== 'string') {
          const response = await fetch(path + '?_=' + Date.now());
          if (response.ok) {
            content = await response.text();
          }
        }

        if (typeof content !== 'string') {
          failed++;
          continue;
        }

        fileStore.set(path, content);
        added++;
      } catch (error) {
        failed++;
      }
    }

    return {
      ok: true,
      added,
      already,
      failed,
    };
  }

  _generatePlansFromChanges(changedArray) {
    return changedArray.map((change) => {
      const { path, before, after } = change;
      const isJS = path.endsWith('.js');
      
      let finalAfter = after;

      // Automatically inject an empty metadata block for brand new JS files
      if (before === null && isJS && finalAfter !== null) {
        const writer = window.ManagedMetadataWriter || globalThis.ManagedMetadataWriter;
        const acorn = this.app?.codeParser?.acorn || window.acorn;
        if (writer && acorn) {
          const existingMeta = writer.extractMetadata(finalAfter, acorn);
          if (!existingMeta) {
            const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;
            const classes = CJCP ? CJCP._listAllClasses(finalAfter) : [];
            const className = classes[0] || path.split('/').pop().replace('.js', '');
            const meta = writer.makeMetadata({ previousMetadata: { provides: [className] } });
            const injected = writer.injectMetadata({ text: finalAfter, filePath: path, className, metadata: meta, acorn });
            if (injected.ok) {
              finalAfter = injected.text;
            }
          }
        }
      }

      // REMOVED: Hacky regexes are gone from here too.

      const plan = {
        file: path,
        action: finalAfter === null ? 'delete' : before === null ? 'create' : 'replaceFile',
        content: finalAfter,
        rawBody: finalAfter,
        replacements: [], additions: [], deletions: [], importAdditions: [], importDeletions: [],
        _viewMode: before === null ? 'raw' : 'segments', // Fix split view bug for new files
      };
      
      if (finalAfter === null) {
        plan._viewMode = 'raw';
        plan.rawBody = '// File deleted.';
        return plan;
      }

      if (isJS && before !== null) {
        const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher || ClientJSClassPatcher;
        const beforeClasses = before ? CJCP._listAllClasses(before) : [];
        const afterClasses = finalAfter ? CJCP._listAllClasses(finalAfter) : [];
        const allClasses = [...new Set([...beforeClasses, ...afterClasses])];
        
        for (const cls of allClasses) {
          const bMethods = new Set(before ? CJCP._listClassMethods(before, cls) : []);
          const aMethods = new Set(finalAfter ? CJCP._listClassMethods(finalAfter, cls) : []);
          
          const added = [...aMethods].filter((m) => !bMethods.has(m));
          const removed = [...bMethods].filter((m) => !aMethods.has(m));
          const replaced = [...aMethods].filter((m) => {
            if (!bMethods.has(m)) return false;
            const bSrc = CJCP._findMethodInSource(before, m, { className: cls, includeComments: true })?.source;
            const aSrc = CJCP._findMethodInSource(finalAfter, m, { className: cls, includeComments: true })?.source;
            const normalize = str => str ? str.replace(/\s+/g, ' ').trim() : '';
            return normalize(bSrc) !== normalize(aSrc);
          });

          for (const m of added) {
            const addedSrc = CJCP._findMethodInSource(finalAfter, m, { className: cls, includeComments: true });
            if (addedSrc) plan.additions.push({ name: m, code: addedSrc.source });
          }
          for (const m of replaced) {
            const replSrc = CJCP._findMethodInSource(finalAfter, m, { className: cls, includeComments: true });
            if (replSrc) plan.replacements.push({ name: m, code: replSrc.source });
          }
          for (const m of removed) plan.deletions.push(m);
        }
        
        try {
          const jmp = this.app?.codeParser?.jsModuleParser;
          if (jmp) {
            const bImp = before ? (jmp.getImports(before, path).imports || []) : [];
            const aImp = finalAfter ? (jmp.getImports(finalAfter, path).imports || []) : [];
            plan.importAdditions = aImp.filter((a) => !bImp.some((b) => b.symbol === a.symbol));
            plan.importDeletions = bImp.filter((b) => !aImp.some((a) => a.symbol === b.symbol));
          }
        } catch (e) {}
        
        if (plan.replacements.length > 0 || plan.additions.length > 0 || plan.deletions.length > 0 || plan.importAdditions.length > 0 || plan.importDeletions.length > 0) {
          plan.action = 'update';
          plan._viewMode = 'segments';
        }
      }
      
      if (!plan.replacements.length && !plan.additions.length && !plan.deletions.length) {
        plan._viewMode = 'raw';
      }
      return plan;
    });
  }

  _ncbfInstallNoCodeBlockFallback() {
    if (this._ncbfFallbackInstalled) return true;
    this._ncbfFallbackInstalled = true;

    const originalExecute = this.execute;
    if (typeof originalExecute !== 'function') return false;

    this.execute = async function (...args) {
      try {
        const result = await originalExecute.apply(this, args);

        if (this._ncbfLooksLikeNoCodeBlockResult?.(result)) {
          this._ncbfShowRawPasteReview?.(
            this._ncbfExtractPayloadFromArgs?.(args),
            {
              reason: 'executor returned no valid code block',
            }
          );
        }

        return result;
      } catch (e) {
        const message = String(e?.message || e || '');

        if (message.includes('No valid code block found')) {
          const payload = this._ncbfExtractPayloadFromArgs?.(args) || '';

          this._ncbfShowRawPasteReview?.(payload, {
            reason: message,
            error: e,
          });

          this._ncbfLog?.('opened raw paste review after no-code-block error');
          return {
            ok: false,
            handledByRawPasteReview: true,
            error: message,
          };
        }

        throw e;
      }
    };

    this._ncbfLog?.('installed no-code-block fallback wrapper');
    return true;
  }

  _ncbfLooksLikeNoCodeBlockResult(result) {
    if (!result) return false;

    const text = JSON.stringify(result).toLowerCase();
    return text.includes('no valid code block found');
  }

  _ncbfExtractPayloadFromArgs(args) {
    for (const arg of args || []) {
      if (typeof arg === 'string' && arg.trim()) return arg;

      if (arg && typeof arg === 'object') {
        const candidates = [
          arg.code,
          arg.text,
          arg.payload,
          arg.content,
          arg.message,
          arg.input,
          arg.raw,
          arg.rawText,
        ];

        for (const value of candidates) {
          if (typeof value === 'string' && value.trim()) return value;
        }
      }
    }

    return '';
  }

  _ncbfShowRawPasteReview(rawText, options = {}) {
      const text = String(rawText || '');

      this._ncbfInstallStyles?.();

      const overlay = document.createElement('div');
      overlay.className = 'ncbf-overlay';

      const panel = document.createElement('div');
      panel.className = 'ncbf-panel';

      const title = document.createElement('div');
      title.className = 'ncbf-title';
      title.textContent = 'No code block found - edit raw paste';

      const subtitle = document.createElement('div');
      subtitle.className = 'ncbf-subtitle';
      subtitle.textContent =
        'The paste was not recognized as an executable code block. Edit it here, wrap it if needed, then copy or run again.';

      const textarea = document.createElement('textarea');
      textarea.className = 'ncbf-textarea';
      textarea.spellcheck = false;
      textarea.value = text || '// Paste content was empty or unavailable.\n';

      const buttons = document.createElement('div');
      buttons.className = 'ncbf-buttons';

      const wrapRun = document.createElement('button');
      wrapRun.type = 'button';
      wrapRun.textContent = 'Wrap as run';

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copy';

      const runAgain = document.createElement('button');
      runAgain.type = 'button';
      runAgain.textContent = 'Run Edited Text';

      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Close';

      buttons.append(wrapRun, copy, runAgain, close);

      const log = document.createElement('div');
      log.className = 'ncbf-log';
      log.textContent = `NCBF opened raw paste editor. Reason: ${
        options.reason || 'no valid code block found'
      }`;

      panel.append(title, subtitle, textarea, buttons, log);
      overlay.append(panel);
      document.body.append(overlay);

      textarea.focus();
      textarea.setSelectionRange(0, 0);

      wrapRun.addEventListener('click', () => {
        const body = textarea.value;
        textarea.value = `async function run(env) {
  ${body
    .split('\n')
    .map((line) => '  ' + line)
    .join('\n')}
}`;
        log.textContent =
          'NCBF wrapped text as a run function. Review/edit before running.';
      });

      copy.addEventListener('click', async () => {
        await navigator.clipboard?.writeText?.(textarea.value);
        log.textContent = `NCBF copied ${textarea.value.length} bytes.`;
      });

      runAgain.addEventListener('click', async () => {
        log.textContent = 'NCBF attempting to run edited text...';

        try {
          if (typeof this.execute === 'function') {
            await this.execute(textarea.value);
            log.textContent = 'NCBF edited text submitted to executor.';
          } else {
            log.textContent =
              'NCBF cannot run: executor.execute is not available on this object.';
          }
        } catch (e) {
          log.textContent = `NCBF run failed: ${e.message}`;
        }
      });

      close.addEventListener('click', () => overlay.remove());

      return {
        overlay,
        textarea,
      };
    }

  _ncbfInstallStyles() {
    if (document.getElementById('ncbf-raw-paste-review-styles')) return;

    const style = document.createElement('style');
    style.id = 'ncbf-raw-paste-review-styles';
    style.textContent = `
      .ncbf-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(0,0,0,.28);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .ncbf-panel {
        width: min(900px, calc(100vw - 48px));
        max-height: calc(100vh - 48px);
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-radius: 12px;
        border: 1px solid rgba(160,200,240,.35);
        background: rgba(22,25,32,.98);
        color: white;
        box-shadow: 0 18px 70px rgba(0,0,0,.45);
        padding: 12px;
        font-family: system-ui, sans-serif;
      }

      .ncbf-title {
        font-size: 15px;
        font-weight: 800;
      }

      .ncbf-subtitle {
        font-size: 12px;
        opacity: .78;
      }

      .ncbf-textarea {
        width: 100%;
        min-height: 380px;
        resize: vertical;
        box-sizing: border-box;
        border-radius: 9px;
        border: 1px solid rgba(180,220,255,.25);
        background: rgba(0,0,0,.28);
        color: #eaf6ff;
        padding: 10px;
        font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }

      .ncbf-buttons {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
      }

      .ncbf-buttons button {
        border-radius: 7px;
        border: 1px solid rgba(180,220,255,.28);
        background: rgba(255,255,255,.08);
        color: white;
        padding: 6px 9px;
        cursor: pointer;
      }

      .ncbf-buttons button:hover {
        background: rgba(255,255,255,.16);
      }

      .ncbf-log {
        font-size: 11px;
        opacity: .78;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
    `;

    document.head.append(style);
  }

  _ncbfLog(message) {
    try {
      console.log('NCBF ' + message);
    } catch (e) {}
  }

  

  
}