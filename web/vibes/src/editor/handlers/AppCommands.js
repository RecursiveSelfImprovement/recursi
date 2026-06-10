class AppCommands {
  constructor(app) {
    this.app = app;
  }

  async listFiles(command) {
      const result = { query: command, fileTree: null, error: null };

      const categorized = {
        html: [],
        js: [],
        css: [],
        other: [],
      };

      const addFile = async (goldenPath) => {
        if (!goldenPath || typeof goldenPath !== 'string') {
          return;
        }

        if (
          goldenPath.includes('/documentation/')
        ) {
          return;
        }

        const hasDocs = false;
        const fileInfo = { path: goldenPath, hasDocs };

        if (goldenPath.endsWith('.js')) {
          categorized.js.push(fileInfo);
        } else if (goldenPath.endsWith('.html')) {
          categorized.html.push(fileInfo);
        } else if (goldenPath.endsWith('.css')) {
          categorized.css.push(fileInfo);
        } else {
          categorized.other.push(fileInfo);
        }
      };

      try {
        let rawFiles = null;

        const vfs =
          typeof this._vfsForCommands === 'function'
            ? await this._vfsForCommands()
            : this.app.vfs || null;

        if (vfs && typeof vfs.listFiles === 'function') {
          try {
            rawFiles = await vfs.listFiles({ includeStatic: false });
          } catch (error) {
            this._vfsLogCommandReadFallback?.(
              'listFiles',
              '(vfs.listFiles)',
              error
            );
          }
        }

        if (
          !Array.isArray(rawFiles) &&
          typeof this._vfsListCommandFilesFromKnownStores === 'function'
        ) {
          rawFiles = this._vfsListCommandFilesFromKnownStores();
        }

        if (!Array.isArray(rawFiles) && this.app.inMemoryFileStore) {
          rawFiles = Array.from(this.app.inMemoryFileStore.keys());
        }

        if (!Array.isArray(rawFiles)) {
          rawFiles = [];
        }

        for (const goldenPath of rawFiles) {
          await addFile(goldenPath);
        }

        Object.values(categorized).forEach((list) =>
          list.sort((a, b) => a.path.localeCompare(b.path))
        );

        result.fileTree = categorized;

        this.app._report?.(
          'command:response:listFiles',
          'Project Files',
          result.fileTree,
          10
        );
        this.pulseReportButton?.();

        const outputString =
          '### Project Files\n\n```json\n' +
          JSON.stringify(result.fileTree, null, 2) +
          '\n```';

        this.app.uiManager?.showInOutputTab?.(outputString);

        const total =
          categorized.html.length +
          categorized.js.length +
          categorized.css.length +
          categorized.other.length;

        if (total === 0) {
          this.app.uiManager?.setStatus?.(
            'No files found in VFS, workspace stores, or memory fork.',
            true
          );
        }
      } catch (error) {
        result.error = error.message;
        this.app.uiManager?.setStatus?.(
          'Failed to list files: ' + error.message,
          true
        );
      }

      return result;
    }

  getDOM(command) {
    const { selector } = command;
    const result = { query: command, outerHTML: null, error: null };
    try {
      const element = document.querySelector(selector);
      if (element) {
        result.outerHTML = element.outerHTML;
      } else {
        result.error = `Element with selector "${selector}" not found.`;
      }
    } catch (e) {
      result.error = `Invalid selector "${selector}": ${e.message}`;
    }
    return result;
  }

  exec(command) {
    if (command.code) {
      try {
        new Function(command.code)();
        this.app.uiManager.setStatus('`exec` command completed.');
      } catch (e) {
        console.error('Error executing command code:', e);
        this.app.uiManager.setStatus(
          `Error in 'exec' command: ${e.message}`,
          true
        );
      }
    }
  }

  postRefresh(command) {
    if (command.commandToRun) {
      this.app.pendingTaskManager.enqueue('command', command.commandToRun);
      this.app.uiManager.setStatus('Refreshing page to execute task...');
      setTimeout(() => window.location.reload(), 100);
    }
  }

  async getImports(command) {
    const { path: pathObj } = command;
    if (!pathObj) {
      this.app.uiManager.setStatus(
        'getImports command requires a "path" property.',
        true
      );
      return;
    }
    const goldenPath = pathObj.toString();
    const result = {
      query: { ...command, path: goldenPath },
      path: goldenPath,
      imports: null,
      error: null,
    };
    try {
      const sourceResult = await this.fetchFileContentForApp(pathObj);
      if (sourceResult.error) throw new Error(sourceResult.error);
      const fileContent = sourceResult.code;
      if (fileContent === null)
        throw new Error(`Could not retrieve content for "${goldenPath}".`);
      const parseResult = this.app.codeParser.getImports(
        fileContent,
        goldenPath
      );
      if (parseResult.error) throw new Error(parseResult.error);
      result.imports = parseResult.imports || [];
    } catch (error) {
      result.error = error.message;
      this.app.uiManager.setStatus(
        `Failed to get imports for ${goldenPath}: ${error.message}`,
        true
      );
    }
    return result;
  }

  async getImportMap(command) {
    await this.app.analysisManager.buildImportMap();
    const mapData = Object.fromEntries(this.app.analysisManager.getImportMap());
    this.app.uiManager.setStatus('Import map generated.');
  }

  async rebuildSymbolMap(command) {
    await this.app.rebuildSymbolMap();
    this.app.uiManager.setStatus(
      `Symbol map rebuilt with ${this.app.symbolMap.size} entries.`
    );
  }

  async getReferenceMap(command) {
    await this.app.analysisManager.buildReferenceMap(this.app.symbolMap);
    const refMap = this.app.analysisManager.getReferenceMap();
    const refMapData = {};
    for (const [key, valueSet] of refMap.entries()) {
      refMapData[key] = Array.from(valueSet);
    }
    this.app.uiManager.setStatus('Reference map generated.');
  }

  async updateDoc(command) {
    const sourcePathObj = command.path || command.target;
    if (!sourcePathObj) {
      this.app._report(
        'error',
        'UpdateDoc failed: No path or target provided.'
      );
      return;
    }
    const sourcePath = sourcePathObj.toString();
    const content = command.rawBody || command.content || '';

    if (!content.trim()) {
      this.app.uiManager.setStatus(
        'Doc update failed: Content is empty. Did you copy the whole block?',
        true
      );
      return;
    }

    await this.app.documentationManager.replaceDocContent(sourcePath, content);
    this.app.uiManager.setStatus(`Documentation updated for ${sourcePath}`);
    this.app._report('success', `Updated doc for ${sourcePath}`);
  }

  async appendToDoc(command) {
    const sourcePathObj = command.path || command.target;
    if (!sourcePathObj) {
      this.app._report(
        'error',
        'AppendToDoc failed: No path or target provided.'
      );
      return;
    }
    const sourcePath = sourcePathObj.toString();
    const content = command.rawBody || command.content || '';

    if (!content.trim()) {
      this.app.uiManager.setStatus(
        'Doc append failed: Content is empty. Did you copy the whole block?',
        true
      );
      return;
    }

    await this.app.documentationManager.appendToDoc(sourcePath, content);
    this.app.uiManager.setStatus(`Appended to documentation for ${sourcePath}`);
    this.app._report('success', `Appended doc for ${sourcePath}`);
  }

  async getCondensedView(command) {
    const filePath = command.path || command.target;
    if (!filePath) return;

    await this.buildProjectContext({
      files: [{ path: filePath, details: 's' }],
    });
  }

  getFilesForConcept(command) {
    if (command.concept) {
      const files = this.app.analysisManager.getFilesForConcept(
        command.concept
      );
      this.app.uiManager.setStatus(
        `Found ${files.length} files for concept "${command.concept}".`
      );
    }
  }

  async promptForReport(command) {
    if (command.queryToRun && command.queryToRun.action) {
      const { queryToRun } = command;
      const handler = this.app.protocolHandler.commandMap.get(
        queryToRun.action
      );
      if (handler) {
        await handler.call(this.app.commands, queryToRun);
        this.pulseReportButton();
        this.app.uiManager.setStatus(
          `Report for '${queryToRun.action}' is ready. Click the pulsing button.`
        );
      } else {
        this.app.uiManager.setStatus(
          `promptForReport: Unknown action '${queryToRun.action}'`,
          true
        );
      }
    }
  }

  async findPlaceholderDocs(command) {
    this.app.uiManager.setStatus('Scanning for placeholder documentation...');
    const result = { query: command, placeholderFiles: [], error: null };
    try {
      const listResult = await this.listFiles({});
      if (listResult.error) throw new Error(listResult.error);
      const jsFiles = listResult.fileTree.js || [];
      for (const file of jsFiles) {
        const sourcePathObj = this.app.createPath(file.path);
        const docPathObj = sourcePathObj.documentationPath;
        if (!docPathObj) continue;
        const docGoldenPath = docPathObj.toString();
        const sourceResult = await this.fetchFileContentForApp(sourcePathObj, [
          'docs',
        ]);
        if (sourceResult?.docs) {
          if (
            this.app.documentationManager.isContentPlaceholder(
              sourceResult.docs
            )
          ) {
            result.placeholderFiles.push(docGoldenPath);
          }
        }
      }
      this.app.uiManager.setStatus(
        `Scan complete. Found ${result.placeholderFiles.length} placeholder doc(s).`
      );
    } catch (error) {
      result.error = error.message;
      this.app.uiManager.setStatus(
        `Error scanning for docs: ${error.message}`,
        true
      );
    }
    return result;
  }

  async deleteFile(command) {
      const targetFile =
        command?.path ||
        command?.file ||
        (typeof command === 'string' ? command : null);
      if (!targetFile) return { ok: false, error: 'No path provided' };

      try {
        if (this.app.vfs) {
          await this.app.vfs.deleteFile(targetFile, { skipHistory: false });
        }

        // Automatically unregister from files.json dependency manifest
        try {
          await this.removeDependency({ path: targetFile });
        } catch (manifestError) {
          console.warn('[deleteFile] Failed to automatically remove dependency:', manifestError);
        }

        // Clean up memory store cache
        if (this.app.inMemoryFileStore) {
          this.app.inMemoryFileStore.delete(targetFile);
        }
        if (this.app.inMemoryFileMetadata) {
          delete this.app.inMemoryFileMetadata[targetFile];
        }

        // Clean up UI trees and nodes
        if (this.app.projectFilesManager?.removeNode) {
          this.app.projectFilesManager.removeNode(targetFile);
        } else if (this.app.projectFilesManager?.fileTreeView?.removeNode) {
          this.app.projectFilesManager.fileTreeView.removeNode(targetFile);
        } else if (this.app.projectFilesManager?.refreshFileList) {
          this.app.projectFilesManager.clear?.();
          this.app.projectFilesManager.setData?.();
        }

        // Clean up tabs and tab-management controllers
        if (this.app.tabOrchestrator?.getTabIdForPath) {
          const tabId = this.app.tabOrchestrator.getTabIdForPath(targetFile);
          if (tabId) this.app.tabOrchestrator.removeTab(tabId);
        } else if (this.app.tabManager?.tabs?.has(targetFile)) {
          this.app.tabManager.removeTab(targetFile);
        }

        // Close associated active floating editor window if open
        const activeEditorWindow = this.app.projectFilesManager?.floatingFileTreeState?.editors?.get(targetFile);
        if (activeEditorWindow && typeof activeEditorWindow.close === 'function') {
          activeEditorWindow.close();
        }

        return { ok: true, path: targetFile };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

  async buildProjectContext(command) {
    this.app.tabOrchestrator.ensureBuildPromptTabExists();

    if (!this.app.buildPromptTab) {
      this.app.uiManager.setStatus(
        'Error: BuildPromptTab could not be initialized.',
        true
      );
      return;
    }

    const loadingDialog = UITools.makeDialog({
      title: 'Building Prompt...',
      content: makeElement('p', 'Processing files...'),
      buttons: [],
    });

    try {
      const files = command.files || [];
      const normalizedFiles = [];
      const errors = [];

      for (const f of files) {
        const rawPath = f.path || f.target;
        if (!rawPath) continue;

        let resolvedPath = rawPath;

        if (
          this.app.protocolHandler &&
          this.app.protocolHandler._resolveTargetFile
        ) {
          try {
            const found = this.app.protocolHandler._resolveTargetFile(rawPath);
            if (found) {
              resolvedPath = found;
            }
          } catch (e) {
            errors.push(`Error resolving "${rawPath}": ${e.message}`);
            continue;
          }
        }

        let state;
        if (f.state) {
          state = f.state;
        } else if (f.details !== undefined) {
          state = this._detailsStringToWidgetState(f.details);
        } else if (f.level !== undefined) {
          state = this._levelToWidgetState(f.level);
        } else {
          state = this._detailsStringToWidgetState(undefined);
        }

        normalizedFiles.push({
          path: resolvedPath,
          state: state,
        });
      }

      if (errors.length > 0) {
        this.app.uiManager.showInOutputTab(
          `### Resolution Errors\n\n${errors.join('\n')}`
        );
        this.app.uiManager.setStatus(
          'Errors occurred during file resolution.',
          true
        );
        return;
      }

      if (normalizedFiles.length === 0) {
        this.app.uiManager.setStatus('No valid files to process.', true);
        return;
      }

      const finalPrompt = await this.app.buildPromptTab._buildPromptString({
        files: normalizedFiles,
      });

      this.app.uiManager.showInOutputTab(finalPrompt.trim());
    } catch (e) {
      console.error(e);
      this.app.uiManager.setStatus(
        `Error building context: ${e.message}`,
        true
      );
    } finally {
      loadingDialog.close();
    }
  }

  unsuppressReport(command) {
    const { id } = command;
    if (!id) return;
    this.app.sanityCheckManager.unsuppress(id);
    this.app.updateSanityCheckState();
  }

  async hotPatch(command) {
    const { className, methodName, code, modulePath, exportName } =
      command || {};
    try {
      if (!className || !methodName || typeof code !== 'string')
        throw new Error('hotPatch requires { className, methodName, code }');
      let Ctor = window[className];
      if (!Ctor && modulePath) {
        const mod = await import(modulePath);
        Ctor = mod[exportName || className] || mod.default;
      }
      if (!Ctor) throw new Error(`Class "${className}" not found.`);
      const newFn = new Function(
        `return function ${methodName}(...args) { ${code} };`
      )();
      Ctor.prototype[methodName] = newFn;
    } catch (e) {
      this.app.uiManager.setStatus(`Hot patch failed: ${e.message}`, true);
    }
  }

  async hotPatchModule(command) {
    const {
      moduleSpecifier,
      exportName,
      methodSource,
      attach = 'prototype',
    } = command || {};
    try {
      if (!moduleSpecifier || !methodSource)
        throw new Error(
          'hotPatchModule needs { moduleSpecifier, methodSource }'
        );
      const mod = await import(moduleSpecifier);
      const ctor = exportName ? mod[exportName] : mod.default;
      if (typeof ctor !== 'function')
        throw new Error('Exported constructor not found.');
      const fn = new Function(`return (${methodSource});`)();
      if (attach === 'static') {
        ctor[fn.name] = fn;
      } else {
        ctor.prototype[fn.name] = fn;
      }
    } catch (e) {
      this.app.uiManager.setStatus(`hotPatchModule failed: ${e.message}`, true);
    }
  }

  async saveVisibilitySet(command) {
      const { name, settings, files, treeRoot, treeLabel, fileCount } = command;
      const resolvedFiles = files || settings;
      if (!name || !resolvedFiles) 
        return;

      const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
      const methodName = `_set_${safeName}`;
      const payload = {
        name,
        files: resolvedFiles,
        treeRoot: treeRoot || null,
        treeLabel: treeLabel || null,
        fileCount: fileCount || Object.keys(resolvedFiles).length,
      };
      const methodSource = `  static ${methodName}() {\n    return ${JSON.stringify(
        payload,
        null,
        6
      ).replace(/\n/g, '\n    ')};\n  }`;

      const targetFile = `/vibes/VisibilitySetsCapsule.js`;

      let content = null;
      if (this.app.vfs) {
        try {
          content = await this.app.vfs.readFile(targetFile, {
            nullOnMissing: true,
          });
        } catch (e) {}
      }
      if (!content && this.app.inMemoryFileStore?.has?.(targetFile)) {
        content = this.app.inMemoryFileStore.get(targetFile);
      }
      if (!content) {
        content = `class VisibilitySetsCapsule {\n
\n}`;
      }

      const CJCP =
        typeof ClientJSClassPatcher !== 'undefined'
          ? ClientJSClassPatcher
          : window._vibesCJCP?.ClientJSClassPatcher ||
            window.ClientJSClassPatcher;

      if (!CJCP) {
        this.app.uiManager.setStatus(`ClientJSClassPatcher not available.`, true);
        return;
      }

      let newContent = null;
      const mockEnv = {
        appRef: this.app,
        executingCode: `class Temp {\n${methodSource}\n}`,
        readFile: (p) => (p === targetFile ? content : null),
        writeFile: (p, c) => {
          newContent = c;
        },
        log: (msg) => console.log(msg),
      };

      let res;
      try {
        res = CJCP.transplant(mockEnv, {
          method: methodName,
          targetFile: targetFile,
          targetClass: 'VisibilitySetsCapsule',
          allowComplianceDowngrade: true,
        });
      } catch (e) {
        this.app.uiManager.setStatus(`Exception in CJCP: ${e.message}`, true);
        return;
      }

      if (!res.ok) {
        this.app.uiManager.setStatus(`Failed to save set: ${res.error}`, true);
        return;
      }

      if (!newContent) {
        this.app.uiManager.setStatus(
          `CJCP succeeded but produced no content.`,
          true
        );
        return;
      }

      // Write to all stores with proper awaiting
      this.app.inMemoryFileStore?.set?.(targetFile, newContent);

      const rootId = '/' + targetFile.split('/').filter(Boolean)[0];
      const store = this.app.workspaceFileStores?.get(rootId);
      if (store?.set) {
        await store.set(targetFile, newContent);
      }

      if (this.app.vfs?.writeFile) {
        try {
          await this.app.vfs.writeFile(targetFile, newContent);
        } catch (e) {
          console.warn('[saveVisibilitySet] VFS write failed:', e);
        }
      }

      const ctrl = this.app.editorControllers.get(targetFile);
      if (ctrl) ctrl.updateCodeAndMetadata(newContent);

      const pfm = this.app.projectFilesManager;
      if (
        pfm &&
        !(pfm.getFileTreeViews() || []).some(tree => tree.nodesMap?.has?.(targetFile))
      ) {
        pfm.addInMemoryFileNode(targetFile);
      }

      this._installRuntimeVisibilitySetsCapsule(newContent);

      this.app.uiManager.setStatus(`Visibility set "${name}" saved to capsule.`);
      if (this.app.buildPromptTab) {
        await this.app.buildPromptTab._loadManifest();
        this.app.buildPromptTab.ui.select.value = name;
        await this.app.buildPromptTab._loadSet(name);
      }
    }

  async getAnalysisInDialog(command) {
    const { path: pathObj } = command;
    if (!pathObj) return;
    const goldenPath = pathObj.toString();
    this.app.uiManager.setStatus(`Analyzing ${goldenPath}...`);
    try {
      const sourceResult = await this.fetchFileContentForApp(pathObj);
      if (sourceResult.error) throw new Error(sourceResult.error);
      const fileContent = sourceResult.code;
      const metadata = this.app.codeParser.parseForMetadata(
        fileContent,
        goldenPath
      );
      const memberDetails = this.app.codeParser.getMemberDetails(fileContent);
      const analysisObject = {
        path: goldenPath,
        parsing_error: metadata.error,
        exports: metadata.exports,
        imports: metadata.imports,
        members: memberDetails,
      };
      const content = makeElement(
        'pre',
        { style: { maxHeight: '70vh', overflow: 'auto' } },
        JSON.stringify(analysisObject, null, 2)
      );
      UITools.makeDialog({
        title: `Code Analysis: ${goldenPath}`,
        content,
        width: '80vw',
      });
      this.app.uiManager.setStatus(`Analysis complete for ${goldenPath}.`);
    } catch (error) {
      this.app.uiManager.setStatus(
        `Analysis failed for ${goldenPath}: ${error.message}`,
        true
      );
    }
  }

  async scanFileSizes(command) {
    this.app.uiManager.setStatus('Scanning file sizes...');
    try {
      const fileMetadata =
        await this.app.documentationManager.getFileMetadata();
      const listResult = await this.listFiles({});
      if (listResult.error) throw new Error(listResult.error);
      const jsFiles = listResult.fileTree.js || [];
      const promises = jsFiles.map(async (fileInfo) => {
        const pathObj = this.app.createPath(fileInfo.path);
        const metadataKey = pathObj.asMetadataKey();
        if (!fileMetadata[metadataKey]) fileMetadata[metadataKey] = {};
        try {
          const sourceResult = await this.fetchFileContentForApp(pathObj, [
            'code',
            'docs',
          ]);
          fileMetadata[metadataKey].codeSize = sourceResult.code
            ? sourceResult.code.split('\n').length
            : 0;
          fileMetadata[metadataKey].docSize = sourceResult.docs
            ? sourceResult.docs.split('\n').length
            : 0;
        } catch (e) {}
      });
      await Promise.all(promises);
      await this.app.documentationManager.saveFileMetadata(fileMetadata);
      this.app.uiManager.setStatus(
        `File size scan complete for ${jsFiles.length} files.`
      );
    } catch (error) {
      this.app.uiManager.setStatus(
        `File size scan failed: ${error.message}`,
        true
      );
    }
  }

  async getDocIndex(command) {
    this.app.uiManager.setStatus('Building documentation index...');
    try {
      const index = await this._getDocIndexData();
      return { index };
    } catch (error) {
      this.app.uiManager.setStatus(
        `Error building documentation index: ${error.message}`,
        true
      );
      return { error: error.message };
    }
  }

  async _getDocIndexData() {
    const listResult = await this.listFiles({});
    if (listResult.error) throw new Error(listResult.error);
    const jsFiles = listResult.fileTree.js || [];
    const docCheckPromises = jsFiles.map(async (file) => {
      const pathObj = this.app.createPath(file.path);
      let status = 'missing';
      const sourceResult = await this.fetchFileContentForApp(pathObj, [
        'docs',
      ]).catch(() => null);
      if (sourceResult && sourceResult.docs) {
        status = this.app.documentationManager.isContentPlaceholder(
          sourceResult.docs
        )
          ? 'placeholder'
          : 'documented';
      }
      return { path: pathObj.toString(), status };
    });
    const unsortedIndex = await Promise.all(docCheckPromises);
    return unsortedIndex.sort((a, b) => a.path.localeCompare(b.path));
  }

  _generateInitialDocContent(sourcePath, condensedView) {
    if (!condensedView || !condensedView.view)
      return `### Summary for \`${sourcePath}\`\n\nDocumentation could not be auto-generated.`;
    const { view } = condensedView;
    const className = view.exports?.[0] || 'Module';
    let summary = `### Summary for \`${className}.js\`\n\nThis document provides an overview of the \`${className}.js\` module.`;
    let apiDetails = `### API Details\n\n\`\`\`javascript\n`;
    (view.members || []).forEach((member) => {
      if (member.public) apiDetails += `${member.signature}\n`;
    });
    apiDetails += `\`\`\`\n`;
    return `${summary}\n\n${apiDetails}`;
  }

  async populateMissingDocs(command) {
    this.app.uiManager.setStatus('Scanning for missing documentation...');
    try {
      const docIndex = await this._getDocIndexData();
      const filesToDocument = docIndex.filter(
        (f) => f.status === 'missing' || f.status === 'placeholder'
      );
      for (const file of filesToDocument) {
        this.app.taskRunner.enqueue(
          `Generate docs for ${file.path}`,
          async () => {
            const pathObj = this.app.createPath(file.path);
            const condensedView = await this._getCondensedViewForApp({
              path: pathObj,
            });
            if (condensedView && !condensedView.error) {
              const newContent = this._generateInitialDocContent(
                file.path,
                condensedView
              );
              await this.updateDoc({ path: pathObj, content: newContent });
            }
          }
        );
      }
    } catch (error) {
      this.app.uiManager.setStatus(
        `Error populating docs: ${error.message}`,
        true
      );
    }
  }

  async deletePlaceholderDocs(command) {
    this.app.uiManager.setStatus('Scanning for placeholder docs to delete...');
    try {
      const docIndex = await this._getDocIndexData();
      const filesToDelete = docIndex.filter((f) => f.status === 'placeholder');
      for (const file of filesToDelete) {
        const pathObj = await this.app.createPath(file.path);
        const docPathObj = pathObj.documentationPath;
        if (docPathObj) {
          this.app.taskRunner.enqueue(
            `Delete placeholder doc for ${file.path}`,
            () => this.deleteFile({ path: docPathObj, skipConfirm: true })
          );
        }
      }
    } catch (error) {
      this.app.uiManager.setStatus(
        `Error deleting placeholder docs: ${error.message}`,
        true
      );
    }
  }

  

  clearReports(command) {
    this.app.reportManager.clearChecks(command.maxAgeSeconds);
    this.app.updateReportButtonState();
    this.app.uiManager.setStatus('Report log cleared.');
  }

  pulseReportButton(durationSeconds = 15) {
    const reportBtn = this.app.reportButton;
    if (!reportBtn || reportBtn.classList.contains('pulse-action')) return;
    reportBtn.classList.add('pulse-action');
    const clickListener = () => {
      reportBtn.classList.remove('pulse-action');
      reportBtn.removeEventListener('click', clickListener);
    };
    reportBtn.addEventListener('click', clickListener);
    setTimeout(() => {
      reportBtn.classList.remove('pulse-action');
      reportBtn.removeEventListener('click', clickListener);
    }, durationSeconds * 1000);
  }

  async deleteVisibilitySet(command) {
    const { name } = command;
    if (!name) return;

    const manifestEntry = this.app.buildPromptTab?.manifest?.[name];
    if (!manifestEntry) {
      this.app.uiManager.setStatus(
        `Cannot find capsule path for set '${name}'.`,
        true
      );
      return;
    }

    const targetFile = manifestEntry.capsulePath;
    const methodName = manifestEntry.methodName;

    let content = null;
    if (this.app.inMemoryFileStore?.has(targetFile)) {
      content = this.app.inMemoryFileStore.get(targetFile);
    } else {
      const rootId = '/' + targetFile.split('/').filter(Boolean)[0];
      const store = this.app.workspaceFileStores?.get(rootId);
      if (store?.get) content = store.get(targetFile);
    }

    if (!content) {
      this.app.uiManager.setStatus(
        `Capsule file not found for set '${name}'.`,
        true
      );
      return;
    }

    const CJCP =
      typeof ClientJSClassPatcher !== 'undefined'
        ? ClientJSClassPatcher
        : window._vibesCJCP?.ClientJSClassPatcher ||
          window.ClientJSClassPatcher;
    if (!CJCP) {
      this.app.uiManager.setStatus(
        `ClientJSClassPatcher not available to delete set.`,
        true
      );
      return;
    }

    const mockEnv = {
      appRef: this.app,
      readFile: (p) => (p === targetFile ? content : null),
      writeFile: (p, c) => {
        if (
          this.app.inMemoryFileStore &&
          p.startsWith(`/${this.app.projectName}/`)
        ) {
          this.app.inMemoryFileStore.set(p, c);
        } else {
          const rootId = '/' + p.split('/').filter(Boolean)[0];
          const store = this.app.workspaceFileStores?.get(rootId);
          if (store && store.set) store.set(p, c);
        }
        const ctrl = this.app.editorControllers.get(p);
        if (ctrl) ctrl.updateCodeAndMetadata(c);
      },
      log: (msg) => console.log(msg),
    };

    try {
      const res = CJCP.deleteMethod(mockEnv, {
        methodName: methodName,
        targetFile: targetFile,
        targetClass: 'VisibilitySetsCapsule',
        allowComplianceDowngrade: true,
      });

      if (res.ok) {
        this.app.uiManager.setStatus(
          `Visibility set '${name}' deleted successfully.`,
          false,
          3000
        );
        if (this.app.buildPromptTab) {
          await this.app.buildPromptTab._loadManifest();
          this.app.buildPromptTab.ui.select.value = '';
          await this.app.buildPromptTab._loadSet('');
        }
      } else {
        this.app.uiManager.setStatus(
          `Failed to delete set: ${res.error}`,
          true
        );
      }
    } catch (e) {
      this.app.uiManager.setStatus(
        `Exception deleting set: ${e.message}`,
        true
      );
    }
  }

  

  async _getProjectFileMap(projectName) {
    const listResult = await this.listFiles({});
    if (listResult.error) throw new Error(listResult.error);
    const allFilePaths = [
      ...(listResult.fileTree.js || []),
      ...(listResult.fileTree.css || []),
      ...(listResult.fileTree.html || []),
      ...(listResult.fileTree.other || []),
    ].map((f) => f.path);
    const fileMap = new Map();
    const contentPromises = allFilePaths.map(async (goldenPath) => {
      const pathObj = this.app.createPath(goldenPath);
      const sourceResult = await this.fetchFileContentForApp(pathObj);
      if (sourceResult && sourceResult.code) {
        fileMap.set(pathObj.asMetadataKey(), sourceResult.code);
      }
    });
    await Promise.all(contentPromises);
    return fileMap;
  }

  async exportProjectAsJson(command) {
    const projectName = this.app.projectName || 'project';
    try {
      // Previously immediately aborted if inMemoryFileStore existed. Allow it to run.
      const fileMap = await this._getProjectFileMap(projectName);
      const fileDataObject = Object.fromEntries(fileMap);
      const jsonString = JSON.stringify(fileDataObject, null, 2);

      this.app._report(
        'command:response:exportProjectAsJson',
        'Project JSON Export',
        { filename: `${projectName}.json`, content: jsonString },
        10
      );
      this.pulseReportButton();
    } catch (error) {
      this.app.uiManager.setStatus(
        `Failed to export project: ${error.message}`,
        true
      );
    }
  }

  async recalculateAllMetadata(command) {
      this.app.uiManager.setStatus('Recalculating metadata locally...');
      try {
        if (
          this.app.projectLoader &&
          typeof this.app.projectLoader._calculateInMemoryMetadata === 'function'
        ) {
          let fileMap = null;
          if (this.app.vfs) {
            fileMap = new Map();
            const paths = await this.app.vfs.listFiles({ includeStatic: false });
            for (const p of paths) {
              const content = await this.app.vfs.readFile(p, {
                noStaticFetch: true,
                nullOnMissing: true,
              });
              if (typeof content === 'string') fileMap.set(p, content);
            }
          }

          const newMeta = await this.app.projectLoader._calculateInMemoryMetadata(
            fileMap
          );
          this.app.inMemoryFileMetadata = newMeta;

          if (this.app.projectFilesManager) {
            this.app.projectFilesManager.fileMetadata = newMeta;
            const trees = typeof this.app.projectFilesManager.getFileTreeViews === 'function' ? this.app.projectFilesManager.getFileTreeViews() : [];
            for (const tree of trees) {
              await tree.applyFileMetadata(newMeta);
            }
          }
          this.app.uiManager.setStatus(
            'All metadata successfully updated locally.',
            false,
            3000
          );
          return;
        }
        throw new Error(
          'Client-side metadata calculation requires ProjectLoader._calculateInMemoryMetadata.'
        );
      } catch (error) {
        console.error('Metadata recalculation failed:', error);
        this.app.uiManager.setStatus(
          `Metadata recalculation failed: ${error.message}`,
          true
        );
      }
    }

  async getTabLayout(command) {
    this.app.uiManager.setStatus('Capturing tab layout...');
    try {
      const tabArea = this.app.uiManager.ui.tabAreaContainer;
      if (!tabArea) {
        throw new Error('<div class="tab-area"> not found.');
      }

      const clone = tabArea.cloneNode(true);

      clone.querySelectorAll('.cm-editor').forEach((editorEl) => {
        const placeholder = makeElement(
          'div',
          {
            style: {
              border: '2px dashed red',
              padding: '10px',
              color: 'red',
              background: '#330000',
              fontFamily: 'monospace',
            },
          },
          '--- CodeMirror Editor Content Replaced ---'
        );
        editorEl.innerHTML = '';
        editorEl.appendChild(placeholder);
      });

      const html = clone.outerHTML;

      this.app._report(
        'debug:response:getTabLayout',
        'Tab Area Layout HTML',
        { html },
        10
      );
      this.app.uiManager.setStatus(
        'Tab layout captured. Check the Report panel.'
      );
      this.pulseReportButton();
    } catch (error) {
      this.app.uiManager.setStatus(
        `Failed to capture layout: ${error.message}`,
        true
      );
      console.error('Error in getTabLayout:', error);
    }
  }

  async getRawFileList(command) {
    const vfs = await this._vfsForCommands();
    let files = null;
    if (vfs) {
      try {
        files = await vfs.listFiles({ includeStatic: false });
      } catch (error) {
        this._vfsLogCommandReadFallback('getRawFileList', '(listFiles)', error);
      }
    }
    if (!Array.isArray(files)) {
      files = this._vfsListCommandFilesFromKnownStores();
    }
    if (command && typeof command === 'object') {
      command.result = files;
      command.files = files;
      command.ok = Array.isArray(files);
    }
    return files;
  }

  async getFileContent(command) {
    const key = this._vfsPathFromCommand(command);
    const content = await this.fetchFileContentForApp(key);
    if (command && typeof command === 'object') {
      command.result = content;
      command.content = content;
      command.ok = typeof content === 'string';
    }
    if (typeof content !== 'string') {
      this._vfsLogCommandReadFallback(
        'getFileContent',
        key || '(missing path)',
        new Error('File content not found')
      );
    }
    return content;
  }

  _levelToWidgetState(level) {
    if (level <= 0) return { code: false, signatures: false, docsLevel: 0 };
    if (level <= 2) return { code: false, signatures: true, docsLevel: 0 };
    if (level < 5) return { code: false, signatures: true, docsLevel: 0 };
    if (level === 5) return { code: true, signatures: false, docsLevel: 0 };

    const docsLevel = Math.min(4, Math.max(0, level - 5));
    return { code: true, signatures: false, docsLevel };
  }

  _detailsStringToWidgetState(detailsString) {
    if (detailsString === undefined) {
      return { code: true, signatures: false, docsLevel: 4 };
    }

    const state = { code: false, signatures: false, docsLevel: 0 };
    if (typeof detailsString !== 'string' || detailsString.trim() === '') {
      return state;
    }

    const cleanedString = detailsString.toLowerCase().replace(/[\s,]/g, '');
    const parts = cleanedString.match(/(c|s|d(25|50|75)?)/g) || [];

    for (const part of parts) {
      if (part === 'c') state.code = true;
      if (part === 's') state.signatures = true;
      if (part.startsWith('d')) {
        const num = parseInt(part.substring(1), 10);
        if (num === 25) state.docsLevel = 1;
        else if (num === 50) state.docsLevel = 2;
        else if (num === 75) state.docsLevel = 3;
        else state.docsLevel = 4;
      }
    }

    return state;
  }

  async fetchFileContentForApp(pathObj, types = []) {
    const key = this._vfsNormalizeCommandPath(pathObj);
    if (!key) {
      return null;
    }
    const vfs = await this._vfsForCommands();
    if (vfs) {
      try {
        const content = await vfs.readFile(key, { nullOnMissing: true });
        if (typeof content === 'string') {
          return content;
        }
      } catch (error) {
        this._vfsLogCommandReadFallback('fetchFileContentForApp', key, error);
      }
    }
    const managerContent =
      await this._vfsReadCommandPathFromProjectFilesManager(key);
    if (typeof managerContent === 'string') {
      return managerContent;
    }
    const storeContent = await this._vfsReadCommandPathFromKnownStores(key);
    if (typeof storeContent === 'string') {
      return storeContent;
    }
    return null;
  }

  async _getCondensedViewForApp(command) {
    const { path: pathObj } = command;
    if (!pathObj) {
      console.error('_getCondensedViewForApp requires a "path" property.');
      return { view: {}, error: 'Path property is required.' };
    }
    const goldenPath = pathObj.toString();
    const result = {
      query: { ...command, path: goldenPath },
      path: goldenPath,
      view: {},
      error: null,
    };
    try {
      const sourceResult = await this.fetchFileContentForApp(pathObj);
      if (sourceResult.error) throw new Error(sourceResult.error);
      const fileContent = sourceResult.code;
      if (fileContent == null)
        throw new Error(`Could not retrieve content for ${goldenPath}`);
      const metadata = this.app.codeParser.parseForMetadata(
        fileContent,
        goldenPath
      );
      if (metadata.error) throw new Error(metadata.error);
      const memberDetails = this.app.codeParser.getMemberDetails(fileContent);
      result.view = {
        path: goldenPath,
        exports: (metadata.exports || []).map((e) => e.name),
        imports: (metadata.imports || []).map((i) => i.symbol),
        members: memberDetails.map((m) => ({
          signature: m.signature,
          public: m.isPublic,
        })),
      };
    } catch (error) {
      result.error = error.message;
    }
    return result;
  }

  async injectMetadataFooters(command) {
    this.app.uiManager.setStatus(
      'Injecting metadata footers into all project files...'
    );
    this.app.uiManager.setLoadingState(true);

    const codeParser = this.app.codeParser;

    try {
      const listResult = await this.listFiles({});
      if (listResult.error) throw new Error(listResult.error);

      const allFiles = [
        ...(listResult.fileTree.js || []),
        ...(listResult.fileTree.css || []),
        ...(listResult.fileTree.html || []),
        ...(listResult.fileTree.other || []),
      ];

      let modifiedCount = 0;
      const skipFiles = new Set([
        'project_metadata.json',
        'file_metadata.json',
        'clone-metadata.json',
        'template.md',
        'README.md',
      ]);

      for (const fileInfo of allFiles) {
        const goldenPath = fileInfo.path;
        const fileName = goldenPath.split('/').pop();

        if (
          goldenPath.startsWith('/library/') ||
          goldenPath.includes('/documentation/') ||
          goldenPath.includes('/visibilitySets/') ||
          skipFiles.has(fileName)
        ) {
          continue;
        }

        let rawCode = null;

        if (this.app.vfs) {
          rawCode = await this.app.vfs.readFile(goldenPath, {
            nullOnMissing: true,
          });
        } else if (
          this.app.inMemoryFileStore &&
          this.app.inMemoryFileStore.has(goldenPath)
        ) {
          rawCode = this.app.inMemoryFileStore.get(goldenPath);
        }

        if (rawCode === null) continue;

        const { code: strippedCode } = codeParser.extractAndStripFooterMetadata(
          rawCode,
          goldenPath
        );

        let provides = [];
        let deps = [];

        if (goldenPath.endsWith('.js')) {
          const parseResult = codeParser.parseForMetadata(
            strippedCode,
            goldenPath
          );
          provides = (parseResult.exports || [])
            .map((e) => e.name)
            .filter(Boolean);
          deps = (parseResult.imports || [])
            .map((i) => i.symbol)
            .filter(Boolean);
        }

        const metadata = {
          schema: 1,
          lines: strippedCode.split('\n').length,
        };

        if (provides.length > 0) metadata.provides = provides;
        if (deps.length > 0) metadata.deps = deps;

        const newCode = codeParser.appendFooterMetadata(
          strippedCode,
          goldenPath,
          metadata
        );

        if (newCode !== rawCode) {
          if (this.app.vfs) {
            await this.app.vfs.writeFile(goldenPath, newCode);
            if (this.app.inMemoryFileStore)
              this.app.inMemoryFileStore.set(goldenPath, newCode);
          } else if (this.app.inMemoryFileStore) {
            this.app.inMemoryFileStore.set(goldenPath, newCode);
          }
          modifiedCount++;
        }
      }

      this.app.uiManager.setStatus(
        `Injected footers into ${modifiedCount} files.`,
        false,
        4000
      );

      if (modifiedCount > 0) {
        if (this.app.projectLoader) {
          this.app.inMemoryFileMetadata =
            await this.app.projectLoader._calculateInMemoryMetadata();
          if (this.app.projectFilesManager) {
            this.app.projectFilesManager.fileMetadata =
              this.app.inMemoryFileMetadata;
          }
        }
      }

      for (const ctrl of this.app.editorControllers.values()) {
        const activePath = ctrl.filePath;
        let currentRaw = null;

        if (this.app.vfs) {
          currentRaw = await this.app.vfs.readFile(activePath, {
            nullOnMissing: true,
          });
        } else if (
          this.app.inMemoryFileStore &&
          this.app.inMemoryFileStore.has(activePath)
        ) {
          currentRaw = this.app.inMemoryFileStore.get(activePath);
        }

        if (currentRaw) {
          const cleanCode = codeParser.extractAndStripFooterMetadata(
            currentRaw,
            activePath
          ).code;
          if (ctrl.getCode() !== cleanCode) {
            await ctrl.updateCodeAndMetadata(cleanCode);
            ctrl.markClean();
          }
        }
      }
    } catch (error) {
      console.error(error);
      this.app.uiManager.setStatus(
        `Failed to inject footers: ${error.message}`,
        true
      );
    } finally {
      this.app.uiManager.setLoadingState(false);
    }
  }

  async moveFile(command) {
      const sourceRaw = command.source || command.path || command.target;
      const destinationRaw = command.destination || command.to;

      if (!sourceRaw || !destinationRaw) {
        this.app.uiManager.setStatus('moveFile requires both "source" and "destination".', true);
        return;
      }

      const sourcePath = this._resolveGoldenPath(sourceRaw);
      const destinationPath = this._resolveGoldenPath(destinationRaw);

      if (sourcePath === destinationPath) {
        this.app.uiManager.setStatus('moveFile source and destination are the same.', true);
        return;
      }

      const content = await this._getLiveFileContent(sourcePath);
      if (content === null || content === undefined) {
        this.app.uiManager.setStatus(`moveFile could not read source file: ${sourcePath}`, true);
        return;
      }

      const oldMetadata = this.app.inMemoryFileMetadata?.[sourcePath] != null
        ? JSON.parse(JSON.stringify(this.app.inMemoryFileMetadata[sourcePath]))
        : null;

      await this.deleteFile({ path: sourcePath, skipConfirm: true });

      if (this.app.vfs) {
        await this.app.vfs.writeFile(destinationPath, content);
        if (this.app.inMemoryFileStore) {
          this.app.inMemoryFileStore.set(destinationPath, content);
          if (oldMetadata) this.app.inMemoryFileMetadata[destinationPath] = oldMetadata;
        }
      } else if (this.app.inMemoryFileStore) {
        this.app.inMemoryFileStore.set(destinationPath, content);
        if (oldMetadata) {
          this.app.inMemoryFileMetadata[destinationPath] = oldMetadata;
        }
      } else {
        this.app.uiManager.setStatus(`Cannot move file: no writable store available.`, true);
        return;
      }

      if (this.app.projectFilesManager) {
        this.app.projectFilesManager.addInMemoryFileNode(destinationPath);
        if (oldMetadata) {
          await this.app.projectFilesManager.updateNodeMetadata(destinationPath, oldMetadata);
        }
      }

      // Close legacy tab if open, and trigger floating editor window
      if (this.app.tabOrchestrator) {
        this.app.tabOrchestrator.removeTab(sourcePath);
      }

      const rootId = '/' + destinationPath.split('/').filter(Boolean)[0];
      const store = this.app.workspaceFileStores?.get(rootId) || this.app.inMemoryFileStore;
      
      if (this.app.projectFilesManager && typeof this.app.projectFilesManager._openFloatingExternalEditorWindow === 'function') {
        await this.app.projectFilesManager._openFloatingExternalEditorWindow(destinationPath, store);
      }

      if (this.app.actionHandler && typeof this.app.actionHandler.handlePushToRunner === 'function') {
        await this.app.actionHandler.handlePushToRunner();
      }

      this.app.uiManager.setStatus(`Moved ${sourcePath} to ${destinationPath}`, false, 3000);
    }

  _resolveGoldenPath(filePath) {
    try {
      return this.app.createPath(filePath).toString();
    } catch (e) {
      return filePath.startsWith('/') ? filePath : '/' + filePath;
    }
  }

  async _getLiveFileContent(goldenPath) {
    const controller = this.app.editorControllers.get(goldenPath);
    if (controller && typeof controller.getCode === 'function') {
      return controller.getCode();
    }

    if (this.app.vfs) {
      try {
        return await this.app.vfs.readFile(goldenPath, { nullOnMissing: true });
      } catch (e) {
        console.warn(
          `[VFS] _getLiveFileContent failed to read ${goldenPath}:`,
          e
        );
        return null;
      }
    }

    if (
      this.app.inMemoryFileStore &&
      this.app.inMemoryFileStore.has(goldenPath)
    ) {
      return this.app.inMemoryFileStore.get(goldenPath);
    }

    return null;
  }

  

  

  async scaffoldProjectCapsule(command) {
      const projectName = this.app.projectName;
      if (!projectName) {
        this.app.uiManager.setStatus('No active project.', true);
        return;
      }

      const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '');
      const className = safeName + 'Capsule';
      const path = `/${projectName}/${className}.js`;

      if (
        this.app.inMemoryFileStore?.has(path) ||
        this.app.workspaceFileStores?.get('/' + projectName)?.has(path)
      ) {
        this.app.uiManager.setStatus(`Capsule already exists at ${path}`, true);
        return;
      }

      const code = `class ${className} {
  static _doc() {
    return "Project capsule for ${projectName}. Description: Project manifest and boot configuration.";
  }
}
`;

      if (this.app.inMemoryFileStore) {
        this.app.inMemoryFileStore.set(path, code);
        this.app.projectFilesManager?.addInMemoryFileNode(path);
      } else {
        const store = this.app.workspaceFileStores?.get('/' + projectName);
        if (store?.set) {
          await store.set(path, code);
        } else {
          this.app.uiManager.setStatus(
            `No writable store available for ${path}`,
            true
          );
        }
      }

      const store = this.app.workspaceFileStores?.get('/' + projectName) || this.app.inMemoryFileStore;
      if (this.app.projectFilesManager && typeof this.app.projectFilesManager._openFloatingExternalEditorWindow === 'function') {
        await this.app.projectFilesManager._openFloatingExternalEditorWindow(path, store);
      }
      this.app.uiManager.setStatus(`Scaffolded ${className}.js`);
    }

  async _vfsForCommands() {
    if (!this.app) {
      return null;
    }
    if (typeof this.app.refreshVirtualFileSystemStores === 'function') {
      return await this.app.refreshVirtualFileSystemStores();
    }
    return this.app.vfs || null;
  }

  _vfsPathFromCommand(command) {
    if (typeof command === 'string') {
      return this._vfsNormalizeCommandPath(command);
    }
    if (!command || typeof command !== 'object') {
      return '';
    }
    const directKeys = [
      'path',
      'file',
      'filePath',
      'goldenPath',
      'sourcePath',
      'targetPath',
    ];
    for (const key of directKeys) {
      if (typeof command[key] === 'string') {
        return this._vfsNormalizeCommandPath(command[key]);
      }
    }
    const containers = [
      command.args,
      command.params,
      command.payload,
      command.data,
    ];
    for (const container of containers) {
      if (!container || typeof container !== 'object') {
        continue;
      }
      for (const key of directKeys) {
        if (typeof container[key] === 'string') {
          return this._vfsNormalizeCommandPath(container[key]);
        }
      }
    }
    return '';
  }

  _vfsNormalizeCommandPath(pathObj) {
    if (
      pathObj &&
      typeof pathObj.toString === 'function' &&
      typeof pathObj !== 'string'
    ) {
      pathObj = pathObj.toString();
    }
    if (typeof pathObj !== 'string') {
      return '';
    }
    let key = pathObj.trim();
    if (!key) {
      return '';
    }
    const queryIndex = key.indexOf('?');
    if (queryIndex >= 0) {
      key = key.slice(0, queryIndex);
    }
    const hashIndex = key.indexOf('#');
    if (hashIndex >= 0) {
      key = key.slice(0, hashIndex);
    }
    while (key.includes('//')) {
      key = key.split('//').join('/');
    }
    if (!key.startsWith('/')) {
      key = '/' + key;
    }
    return key;
  }

  async _vfsReadCommandPathFromProjectFilesManager(key) {
    const manager = this.app?.projectFilesManager;
    if (!manager || typeof manager.getFileContent !== 'function') {
      return null;
    }
    try {
      return await manager.getFileContent(key);
    } catch (error) {
      this._vfsLogCommandReadFallback(
        'projectFilesManager.getFileContent',
        key,
        error
      );
      return null;
    }
  }

  async _vfsReadCommandPathFromKnownStores(key) {
    const stores = [
      this.app?.inMemoryFileStore,
      this.app?.fileStore,
      this.app?.files,
      this.app?.workspaceFileStores,
    ];
    for (const store of stores) {
      const content = await this._vfsReadCommandPathFromStore(store, key);
      if (typeof content === 'string') {
        return content;
      }
    }
    return null;
  }

  async _vfsReadCommandPathFromStore(store, key) {
    if (!store) {
      return null;
    }
    if (
      store instanceof Map &&
      this._vfsLooksLikeWorkspaceStoreMap(store, key)
    ) {
      const rootId = '/' + key.split('/').filter(Boolean)[0];
      const nestedStore = store.get(rootId);
      if (nestedStore) {
        return await this._vfsReadCommandPathFromStore(nestedStore, key);
      }
    }
    const variants = this._vfsCommandPathVariants(key);
    for (const candidate of variants) {
      try {
        if (typeof store.has === 'function' && !(await store.has(candidate))) {
          continue;
        }
        if (typeof store.get === 'function') {
          const value = await store.get(candidate);
          const content = this._vfsCoerceCommandFileContent(value);
          if (typeof content === 'string') {
            return content;
          }
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(store, candidate)) {
          const content = this._vfsCoerceCommandFileContent(store[candidate]);
          if (typeof content === 'string') {
            return content;
          }
        }
      } catch (error) {
        this._vfsLogCommandReadFallback('store fallback', candidate, error);
      }
    }
    return null;
  }

  _vfsLooksLikeWorkspaceStoreMap(store, key) {
    const parts = key.split('/').filter(Boolean);
    if (!parts.length) {
      return false;
    }
    const rootId = '/' + parts[0];
    return store.has(rootId);
  }

  _vfsCommandPathVariants(key) {
    const normalized = this._vfsNormalizeCommandPath(key);
    const variants = [normalized];
    if (normalized.startsWith('/')) {
      variants.push(normalized.slice(1));
    }
    if (normalized.startsWith('/vibes/')) {
      variants.push(normalized.slice('/vibes'.length));
      variants.push(normalized.slice('/vibes/'.length));
    }
    return Array.from(new Set(variants.filter(Boolean)));
  }

  _vfsCoerceCommandFileContent(value) {
    if (typeof value === 'string') {
      return value;
    }
    if (!value || typeof value !== 'object') {
      return null;
    }
    if (typeof value.content === 'string') {
      return value.content;
    }
    if (typeof value.value === 'string') {
      return value.value;
    }
    if (typeof value.text === 'string') {
      return value.text;
    }
    return null;
  }

  _vfsListCommandFilesFromKnownStores() {
    const files = new Set();
    const stores = [
      this.app?.inMemoryFileStore,
      this.app?.fileStore,
      this.app?.files,
    ];
    for (const store of stores) {
      this._vfsCollectCommandFileKeys(files, store);
    }
    const workspaceStores = this.app?.workspaceFileStores;
    if (workspaceStores && typeof workspaceStores.entries === 'function') {
      for (const entry of workspaceStores.entries()) {
        this._vfsCollectCommandFileKeys(files, entry[1]);
      }
    }
    return Array.from(files).sort();
  }

  _vfsCollectCommandFileKeys(files, store) {
    if (!store) {
      return;
    }
    if (typeof store.keys === 'function') {
      const keys = Array.from(store.keys());
      for (const key of keys) {
        files.add(this._vfsNormalizeCommandPath(key));
      }
      return;
    }
    for (const key of Object.keys(store)) {
      files.add(this._vfsNormalizeCommandPath(key));
    }
  }

  _vfsLogCommandReadFallback(operation, key, error) {
    const message = error && error.message ? error.message : String(error);
    if (this.app && typeof this.app.logFileOp === 'function') {
      this.app.logFileOp('debug', 'AppCommands VFS read fallback', {
        operation,
        path: key,
        error: message,
      });
      return;
    }
    if (this.app?.fileLogger && typeof this.app.fileLogger.log === 'function') {
      this.app.fileLogger.log('debug', 'AppCommands VFS read fallback', {
        operation,
        path: key,
        error: message,
      });
    }
  }

  async revertFile(command) {
      const fileRaw = command.path || command.target;
      if (!fileRaw) {
        this.app.uiManager.setStatus('revertFile requires a "path" or "target".', true);
        return;
      }

      const filePath = this._resolveGoldenPath(fileRaw);
      const stepsBack = Math.max(1, Number(command.stepsBack) || 1);
      const timestamp = command.timestamp !== undefined ? Number(command.timestamp) : null;

      let snapshot = null;
      if (this.app.historyManager && typeof this.app.historyManager.getPreviousStateForFile === 'function') {
        snapshot = await this.app.historyManager.getPreviousStateForFile(filePath, { stepsBack, timestamp });
      }

      if (!snapshot || snapshot.oldContent == null) {
        this.app.uiManager.setStatus(`No historical state found for ${filePath}.`, true);
        return;
      }

      if (this.app.vfs) {
        await this.app.vfs.writeFile(filePath, snapshot.oldContent);
        if (this.app.inMemoryFileStore) {
          this.app.inMemoryFileStore.set(filePath, snapshot.oldContent);
        }
      } else if (this.app.inMemoryFileStore) {
        this.app.inMemoryFileStore.set(filePath, snapshot.oldContent);
      } else {
        this.app.uiManager.setStatus(`Cannot revert ${filePath}: no writable store available.`, true);
        return;
      }

      const rootId = '/' + filePath.split('/').filter(Boolean)[0];
      const store = this.app.workspaceFileStores?.get(rootId) || this.app.inMemoryFileStore;

      if (this.app.projectFilesManager && typeof this.app.projectFilesManager._openFloatingExternalEditorWindow === 'function') {
        await this.app.projectFilesManager._openFloatingExternalEditorWindow(filePath, store);
      }

      if (this.app.actionHandler && typeof this.app.actionHandler.handlePushToRunner === 'function') {
        await this.app.actionHandler.handlePushToRunner();
      }

      this.app.uiManager.setStatus(`Reverted ${filePath} successfully.`, false, 3000);
    }

  _installRuntimeVisibilitySetsCapsule(source) {
    try {
      const Capsule = new Function(
        source + '\nreturn VisibilitySetsCapsule;'
      )();
      window.VisibilitySetsCapsule = Capsule;
      return true;
    } catch (e) {
      console.warn(
        '[saveVisibilitySet] Runtime capsule install failed:',
        e.message
      );
      return false;
    }
  }

  async fuzzySearchMethods(command) {
      const query = String(command.query || '');
      let normalizedQuery = query.replace(/[^a-z0-9]/gi, '').toLowerCase();

      if (!normalizedQuery && typeof prompt === 'function') {
        const userInput = prompt(
          'Enter a method name or code snippet to search for:'
        );
        if (!userInput) {
          this.app.uiManager.setStatus('Search cancelled.');
          return 'Search cancelled.';
        }
        command.query = userInput;
        normalizedQuery = userInput.replace(/[^a-z0-9]/gi, '').toLowerCase();
      }

      if (!normalizedQuery) {
        this.app.uiManager.setStatus(
          'fuzzySearchMethods requires a query.',
          true
        );
        return 'Error: fuzzySearchMethods requires a query.';
      }

      const maxLines = command.maxLines || 10000;
      const pathPrefix = command.pathPrefix || '';
      const includeDocs = command.includeDocs !== false;
      const includeMeta = command.includeMeta !== false;

      this.app.uiManager.setStatus(
        `Fuzzy searching methods for "${command.query}"...`
      );

      if (this.app.tabOrchestrator)
        this.app.tabOrchestrator.ensureOutputTabExists();
      if (this.app.tabManager) this.app.tabManager.setActiveTab('output-tab');

      let header = `## Fuzzy Search Results for "${command.query}"\n\n`;

      const outputView = this.app.outputTab?.codeMirrorWidget?.editor || null;
      let fallbackOutput = header;
      const EditorView = window.EditorView;

      let batchedOutput = '';
      let batchTimer = null;

      const flushOutput = () => {
        if (!batchedOutput) return;
        fallbackOutput += batchedOutput;
        if (outputView && typeof outputView.dispatch === 'function') {
          outputView.dispatch({
            changes: { from: outputView.state.doc.length, insert: batchedOutput },
          });
          if (EditorView) {
            outputView.dispatch({
              effects: EditorView.scrollIntoView(outputView.state.doc.length),
            });
          }
        } else {
          this.app.uiManager.showInOutputTab(fallbackOutput);
        }
        batchedOutput = '';
      };

      const appendToOutput = (text) => {
        batchedOutput += text;
        if (!batchTimer) {
          batchTimer = setTimeout(() => {
            flushOutput();
            batchTimer = null;
          }, 100);
        }
      };

      if (outputView && typeof outputView.dispatch === 'function') {
        outputView.dispatch({
          changes: { from: 0, to: outputView.state.doc.length, insert: header },
        });
      } else {
        this.app.uiManager.showInOutputTab(header);
      }

      const jsFiles = [];
      if (this.app.projectFilesManager) {
        const seen = new Set();
        const trees = typeof this.app.projectFilesManager.getFileTreeViews === 'function' 
          ? this.app.projectFilesManager.getFileTreeViews() 
          : [];
        if (trees.length === 0 && this.app.projectFilesManager.fileTreeView) {
          trees.push(this.app.projectFilesManager.fileTreeView);
        }
        for (const tree of trees) {
          if (tree?.nodesMap) {
            for (const [path, node] of tree.nodesMap) {
              if (node && node.type === 'file' && path.endsWith('.js') && !seen.has(path)) {
                seen.add(path);
                jsFiles.push(path);
              }
            }
          }
        }
      }
      
      if (jsFiles.length === 0) {
        const listResult = await this.listFiles({});
        for (const f of listResult.fileTree?.js || []) {
          jsFiles.push(f.path);
        }
      }
      jsFiles.sort();

      let totalLines = 0;
      let matchCount = 0;

      for (let i = 0; i < jsFiles.length; i++) {
        const path = jsFiles[i];
        if (pathPrefix && !path.startsWith(pathPrefix)) continue;
        if (totalLines >= maxLines) break;

        if (i % 5 === 0) {
          this.app.uiManager.setStatus(
            `Searching... ${i}/${jsFiles.length} (Found: ${matchCount})`
          );
          await new Promise((r) => setTimeout(r, 15));
        }

        const content = await this.fetchFileContentForApp({
          toString: () => path,
        });
        if (!content) continue;

        const acorn = this.app.codeParser?.acorn || window.acorn;
        if (!acorn) continue;

        let ast = null;
        try {
          ast = acorn.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
          });
        } catch (e) {
          try {
            ast = acorn.parse(content, {
              ecmaVersion: 'latest',
              sourceType: 'script',
            });
          } catch (e2) {}
        }

        if (!ast) continue;

        for (const node of ast.body) {
          let classNode = null;
          if (node.type === 'ClassDeclaration') classNode = node;
          else if (
            node.type === 'ExportNamedDeclaration' &&
            node.declaration?.type === 'ClassDeclaration'
          )
            classNode = node.declaration;
          else if (
            node.type === 'ExportDefaultDeclaration' &&
            node.declaration?.type === 'ClassDeclaration'
          )
            classNode = node.declaration;

          if (!classNode) continue;

          const className = classNode.id?.name || 'Anonymous';
          for (const member of classNode.body.body || []) {
            if (member.type === 'MethodDefinition') {
              const methodName =
                member.key?.name || member.key?.value || '(computed)';

              const isDoc = methodName.startsWith('_doc');
              const isMeta =
                methodName === 'getMetadata' ||
                methodName.startsWith('_meta') ||
                methodName.startsWith('_set_') ||
                methodName.startsWith('visibilitySet');

              if (isDoc && !includeDocs) continue;
              if (isMeta && !includeMeta) continue;

              const methodSrc = content.slice(member.start, member.end);
              const strippedSrc = methodSrc
                .replace(/[^a-z0-9]/gi, '')
                .toLowerCase();

              if (strippedSrc.includes(normalizedQuery)) {
                const lines = methodSrc.split('\n').length;
                matchCount++;
                totalLines += lines;

                appendToOutput(
                  `// ${path}\n// Class: ${className} | Method: ${methodName}\n\`\`\`javascript\n${methodSrc}\n\`\`\`\n\n`
                );

                if (totalLines >= maxLines) break;
              }
            }
          }
          if (totalLines >= maxLines) break;
        }
      }

      if (batchTimer) {
        clearTimeout(batchTimer);
        flushOutput();
      }

      if (matchCount === 0) {
        const noMatchMsg = `*No methods found matching fuzzy query: "${command.query}".*\n`;
        appendToOutput(noMatchMsg);
        this.app.uiManager.setStatus('No matches found.');

        if (
          this.app.buildPromptTab &&
          typeof this.app.buildPromptTab.setSearchResults === 'function'
        ) {
          this.app.buildPromptTab.setSearchResults(fallbackOutput);
        }
        return fallbackOutput;
      }

      if (totalLines >= maxLines) {
        appendToOutput(
          `\n*Note: Search stopped early because it reached the line limit (${maxLines} lines).*`
        );
      }

      this.app.uiManager.setStatus(`Done! Found ${matchCount} matching methods.`);

      if (
        this.app.buildPromptTab &&
        typeof this.app.buildPromptTab.setSearchResults === 'function'
      ) {
        this.app.buildPromptTab.setSearchResults(fallbackOutput);
      }

      return fallbackOutput;
    }

  _fuzzyExtractAllMethods(content, filePath) {
    const acorn = window.acorn;
    if (!acorn || typeof content !== 'string') {
      return { methods: [], parseError: acorn ? null : 'acorn-unavailable' };
    }

    const opts = {
      ecmaVersion: 'latest',
      allowHashBang: true,
      locations: true,
      ranges: true,
    };

    let ast = null;
    let parseError = null;
    try {
      ast = acorn.parse(
        content,
        Object.assign({}, opts, { sourceType: 'script' })
      );
    } catch (e1) {
      try {
        ast = acorn.parse(
          content,
          Object.assign({}, opts, { sourceType: 'module' })
        );
      } catch (e2) {
        parseError = (e2 && e2.message) || (e1 && e1.message) || 'parse-failed';
      }
    }

    if (!ast) return { methods: [], parseError };

    const methods = [];

    const collectClass = (classNode) => {
      const className = (classNode.id && classNode.id.name) || '(anonymous)';
      const body = classNode.body && classNode.body.body;
      if (!Array.isArray(body)) return;
      for (const member of body) {
        if (member.type !== 'MethodDefinition') continue;
        const key = member.key || {};
        const name = key.name || key.value || '(computed)';
        const startLine =
          (member.loc && member.loc.start && member.loc.start.line) || 0;
        const endLine =
          (member.loc && member.loc.end && member.loc.end.line) || 0;
        const source = content.slice(member.start, member.end);
        methods.push({
          path: filePath,
          type: 'method',
          className,
          name,
          kind: member.kind || 'method',
          static: !!member.static,
          startLine,
          endLine,
          source,
        });
      }
    };

    const collectTopLevelFn = (fnNode) => {
      const name = (fnNode.id && fnNode.id.name) || '(anonymous)';
      const startLine =
        (fnNode.loc && fnNode.loc.start && fnNode.loc.start.line) || 0;
      const endLine =
        (fnNode.loc && fnNode.loc.end && fnNode.loc.end.line) || 0;
      const source = content.slice(fnNode.start, fnNode.end);
      methods.push({
        path: filePath,
        type: 'function',
        className: null,
        name,
        kind: 'function',
        static: false,
        startLine,
        endLine,
        source,
      });
    };

    for (const node of ast.body || []) {
      if (!node) continue;
      if (node.type === 'ClassDeclaration') {
        collectClass(node);
      } else if (node.type === 'FunctionDeclaration') {
        collectTopLevelFn(node);
      } else if (
        node.type === 'ExportNamedDeclaration' ||
        node.type === 'ExportDefaultDeclaration'
      ) {
        const decl = node.declaration;
        if (!decl) continue;
        if (decl.type === 'ClassDeclaration') {
          collectClass(decl);
        } else if (decl.type === 'FunctionDeclaration') {
          collectTopLevelFn(decl);
        }
      }
    }

    return { methods, parseError };
  }

  _fuzzyNormalize(s) {
    if (typeof s !== 'string' || !s) return '';
    const lower = s.toLowerCase();
    let out = '';
    for (let i = 0; i < lower.length; i++) {
      const c = lower.charCodeAt(i);
      // 0-9 (48-57) or a-z (97-122)
      if ((c >= 48 && c <= 57) || (c >= 97 && c <= 122)) {
        out += lower[i];
      }
    }
    return out;
  }

  _fuzzyListJsFiles() {
      const app = this.app;
      const pfm = app && app.projectFilesManager;
      if (!pfm) return [];

      const blocked = [
        '/library/',
        '/node_modules/',
        '/.git/',
        '/dist/',
        '/build/',
        '/thirdparty/',
        '/vendor/',
      ];
      const out = [];
      const seen = new Set();

      const trees = typeof pfm.getFileTreeViews === 'function' ? pfm.getFileTreeViews() : [];
      if (trees.length === 0 && pfm.fileTreeView) {
        trees.push(pfm.fileTreeView);
      }

      for (const tree of trees) {
        if (tree?.nodesMap && typeof tree.nodesMap.entries === 'function') {
          for (const [path, node] of tree.nodesMap) {
            if (!node || node.type !== 'file') continue;
            if (typeof path !== 'string') continue;
            if (!path.endsWith('.js')) continue;
            if (seen.has(path)) continue;

            let isBlocked = false;
            for (let i = 0; i < blocked.length; i++) {
              if (path.indexOf(blocked[i]) !== -1) {
                isBlocked = true;
                break;
              }
            }
            if (isBlocked) continue;

            seen.add(path);
            out.push(path);
          }
        }
      }

      out.sort();
      return out;
    }

  _fuzzyReadFile(path) {
    const app = this.app;
    if (!app || typeof path !== 'string' || !path) return null;

    // Prefer in-memory store (canonical edited source)
    const ims = app.inMemoryFileStore;
    if (ims && typeof ims.has === 'function' && ims.has(path)) {
      const v = ims.get(path);
      if (typeof v === 'string') return v;
    }

    // Fall back to workspace file stores keyed by root segment
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    const rootId = '/' + parts[0];

    const stores = app.workspaceFileStores;
    if (stores && typeof stores.get === 'function') {
      const store = stores.get(rootId);
      if (store && typeof store.get === 'function') {
        const v = store.get(path);
        if (typeof v === 'string') return v;
        if (v && typeof v.content === 'string') return v.content;
      }
    }

    return null;
  }

  static _doc_overview() {
      return "### AppCommands\n\nExecutes automated system commands. Handles filesystem operations (like list, rename, delete, and revert) and AST-based analysis tasks.";
    }

  static _doc_ast_and_analysis() {
      return `## Deep Code Analysis & Metadata Management\n\n- **Fuzzy Search Methods**: Performs extremely fast, project-wide searches inside class prototypes, matching method names or content against fuzzy keywords. It streams matching code blocks into the Output tab in real-time.\n- **Symbol Mapping**: Scans the workspace to map exported class names to their exact folders, creating the primary index for automated ES6 import resolutions.`;
    }

  static _doc_workspace() {
      return `## Workspace Control & File Mutations\n\n- **File Operations**: Exposes safe wrappers for deleting, moving, or reverting files. Reverting files integrates with \`HistoryManager\` to restore previous file or method states from IndexedDB snapshots.\n- **Scaffold Capsule**: Quickly stubs project-capsule files (\`YourProjectCapsule.js\`) to define custom initiator scripts and external resources.\n- **Visibility Sets**: Serializes active file tree visibilities into \`VisibilitySetsCapsule.js\` as static capsule methods, allowing workspace layouts to be stored as code.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_search()
      ].join('\n\n');
    }

  

  static _doc_search() {
      return "### Search Features\n\n- **Fuzzy Method Search**: Scans the AST of all class files in the project to search for matching method declarations and outputs the results.";
    }

  async addDependency(command) {
      const { path, manifestPath } = command;
      if (!path) return { ok: false, error: 'No path provided' };

      let targetManifest = manifestPath;
      if (!targetManifest) {
        const allFiles = await this.app.vfs.listFiles({ includeStatic: false });
        const manifests = allFiles.filter(p => p.endsWith('files.json'));
        if (manifests.length === 0) {
          this.app.uiManager?.setStatus('No files.json manifest found.', true);
          return { ok: false, error: 'No manifest found' };
        }
        const projectRoot = '/' + path.split('/').filter(Boolean)[0];
        targetManifest = manifests.find(m => m.startsWith(projectRoot)) || manifests[0];
      }

      try {
        let content = await this.app.vfs.readFile(targetManifest, { nullOnMissing: true });
        let manifest = { main: [], local: [], library: [], thirdParty: [] };
        if (content) {
          manifest = JSON.parse(content);
        }

        manifest.local = manifest.local || [];
        manifest.library = manifest.library || [];
        manifest.thirdParty = manifest.thirdParty || [];

        let category = 'local';
        let formattedPath = path;

        if (path.startsWith('http://') || path.startsWith('https://')) {
          category = 'thirdParty';
        } else if (path.includes('/library/') || path.startsWith('/library/')) {
          category = 'library';
          formattedPath = path.split('/').pop();
        } else {
          category = 'local';
          const projectRoot = targetManifest.substring(0, targetManifest.lastIndexOf('/'));
          if (path.startsWith(projectRoot + '/')) {
            formattedPath = path.slice(projectRoot.length + 1);
          } else if (path.startsWith('/')) {
            formattedPath = path.slice(1);
          }
        }

        if (!manifest[category].includes(formattedPath)) {
          manifest[category].push(formattedPath);
          manifest[category].sort();
        }

        const newContent = JSON.stringify(manifest, null, 2);
        await this.app.vfs.writeFile(targetManifest, newContent);
        if (this.app.inMemoryFileStore) {
          this.app.inMemoryFileStore.set(targetManifest, newContent);
        }

        const ctrl = this.app.editorControllers.get(targetManifest);
        if (ctrl) {
          await ctrl.updateCodeAndMetadata(newContent);
          ctrl.markClean();
        }

        this.app.uiManager?.setStatus(`Added "${formattedPath}" to ${category} in ${targetManifest.split('/').pop()}.`);
        return { ok: true, manifest: targetManifest };
      } catch (e) {
        this.app.uiManager?.setStatus(`Failed to add dependency: ${e.message}`, true);
        return { ok: false, error: e.message };
      }
    }

  async removeDependency(command) {
      const { path, manifestPath } = command;
      if (!path) return { ok: false, error: 'No path provided' };

      let targetManifest = manifestPath;
      if (!targetManifest) {
        const allFiles = await this.app.vfs.listFiles({ includeStatic: false });
        const manifests = allFiles.filter(p => p.endsWith('files.json'));
        if (manifests.length === 0) return { ok: false, error: 'No manifest found' };
        const projectRoot = '/' + path.split('/').filter(Boolean)[0];
        targetManifest = manifests.find(m => m.startsWith(projectRoot)) || manifests[0];
      }

      try {
        let content = await this.app.vfs.readFile(targetManifest, { nullOnMissing: true });
        if (!content) return { ok: false, error: 'Manifest empty' };

        let manifest = JSON.parse(content);
        manifest.local = manifest.local || [];
        manifest.library = manifest.library || [];
        manifest.thirdParty = manifest.thirdParty || [];

        let formattedLocal = path;
        const projectRoot = targetManifest.substring(0, targetManifest.lastIndexOf('/'));
        if (path.startsWith(projectRoot + '/')) {
          formattedLocal = path.slice(projectRoot.length + 1);
        } else if (path.startsWith('/')) {
          formattedLocal = path.slice(1);
        }

        const formattedLibrary = path.split('/').pop();

        manifest.local = manifest.local.filter(p => p !== formattedLocal && p !== path);
        manifest.library = manifest.library.filter(p => p !== formattedLibrary && p !== path);
        manifest.thirdParty = manifest.thirdParty.filter(p => p !== path);

        const newContent = JSON.stringify(manifest, null, 2);
        await this.app.vfs.writeFile(targetManifest, newContent);
        if (this.app.inMemoryFileStore) {
          this.app.inMemoryFileStore.set(targetManifest, newContent);
        }

        const ctrl = this.app.editorControllers.get(targetManifest);
        if (ctrl) {
          await ctrl.updateCodeAndMetadata(newContent);
          ctrl.markClean();
        }

        this.app.uiManager?.setStatus(`Removed dependency from ${targetManifest.split('/').pop()}.`);
        return { ok: true, manifest: targetManifest };
      } catch (e) {
        this.app.uiManager?.setStatus(`Failed to remove dependency: ${e.message}`, true);
        return { ok: false, error: e.message };
      }
    }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 2426,
  "provides": [
    "AppCommands"
  ],
  "deps": []
}
recursi-meta */
