class EditorTabController {
  constructor(
      filePath,
      projectName,
      contentPanel,
      appContext,
      hasDocs = false,
      isReadOnly = false
    ) {
      if (!filePath) throw new Error('EditorTabController requires a file path.');
      if (!projectName) throw new Error('EditorTabController requires a project name.');
      if (!contentPanel) throw new Error('EditorTabController requires a content panel element.');

      this.filePath = filePath;
      this.projectName = projectName;
      this.contentPanel = contentPanel;
      this.appContext = appContext || {};
      this.app = this.appContext.app || window._dev_projectEditorInstance;
      this.documentationManager = appContext.documentationManager;
      this.isStructuredJs = /\.js$/i.test(filePath);
      this.hasDocs = hasDocs;
      this.isReadOnly = isReadOnly;
      this.isAutoOpened = false;

      this.codeParser = new CodeParser(window.acorn);
      this.imports = [];
      this.exports = null;
      this.docContent = null;
      this.codeMirrorWidgets = new Map();
      this.segmentOrder = [];
      this.isLoaded = false;
      this.isLoading = false;
      this.isDirty = false;
      this.undoStack = [];
      this.redoStack = [];

      this.contentPanel.innerHTML = '';
      this.contentPanel.classList.add('editor-tab-controller');

      this.viewManager = new EditorViewManager(this);
      this.dataHandler = new EditorDataHandler(this, this.app);

      this.viewManager.createLayout();
    }

  async init(initialContent = null, treatAsClean = false, searchTerm = null) {
      this._setLoadingState(true);
      let codeToProcess;
      let isInitiallyDirty;

      if (initialContent !== null) {
        codeToProcess = initialContent;
        isInitiallyDirty = !treatAsClean;
      } else {
        this.viewManager.editorContainer.innerHTML = `<p style="padding: 20px;">Loading ${this.filePath}...</p>`;
        const fetchResult = await this._fetchFileContent(this.filePath);
        if (fetchResult && fetchResult.error) {
          this.viewManager.editorContainer.innerHTML = `<p class="error-message" style="padding: 20px;">Failed to load file: ${fetchResult.error}</p>`;
          this._setLoadingState(false);
          this.isLoaded = false;
          return;
        }
        codeToProcess = this._normalizeFetchContentResult(fetchResult);
        isInitiallyDirty = false;
      }

      await this._processLoadedContent(codeToProcess);

      let targetView = this.app?.lastEditorViewMode || 'code';

      if (targetView === 'standard' || targetView === 'diff') {
        targetView = 'code';
      }

      if (targetView === 'structured' && !this.isStructuredJs) {
        targetView = 'code';
      }

      if (targetView === 'docs' && !this.hasDocs) {
        targetView = 'code';
      }

      if (!searchTerm && this._shouldPreferDocumentationView(codeToProcess)) {
        targetView = 'docs';
      }

      this.viewManager.setActiveView(targetView, true);

      if (this.segmentOrder.length > 0) {
        const mainSegmentName = this.segmentOrder[0];
        const widget = this.codeMirrorWidgets.get(mainSegmentName);
        if (widget && widget.initializationPromise) {
          await widget.initializationPromise;
        }
      }

      this.isLoaded = true;
      this._setLoadingState(false);
      this._setDirtyState(isInitiallyDirty);

      if (searchTerm) {
        setTimeout(() => {
          this.viewManager.triggerSearch(searchTerm);
        }, 50);
      }
    }

  async reloadWithNewContent(newCode) {
    await this.updateCodeAndMetadata(newCode);
  }

  async _fetchFileContent(fullPath) {
    const goldenPath = this._editorTabNormalizePath(fullPath);
    if (!goldenPath) {
      return { content: '', error: 'Invalid file path.' };
    }

    const vfs = await this._editorTabGetVfs();
    if (vfs && typeof vfs.readFile === 'function') {
      try {
        const content = await vfs.readFile(goldenPath, { nullOnMissing: true });
        if (typeof content === 'string') {
          return { content, error: null };
        }
      } catch (error) {
        this._editorTabLogReadFallback('vfs.readFile', goldenPath, error);
      }
    }

    if (
      this.app?.commands &&
      typeof this.app.commands.fetchFileContentForApp === 'function'
    ) {
      try {
        const content = await this.app.commands.fetchFileContentForApp(
          goldenPath
        );
        if (typeof content === 'string') {
          return { content, error: null };
        }
        if (content && typeof content.code === 'string') {
          return { content: content.code, error: null };
        }
        if (content && typeof content.content === 'string') {
          return { content: content.content, error: null };
        }
      } catch (error) {
        this._editorTabLogReadFallback(
          'commands.fetchFileContentForApp',
          goldenPath,
          error
        );
      }
    }

    if (
      this.app?.projectFilesManager &&
      typeof this.app.projectFilesManager.getFileContent === 'function'
    ) {
      try {
        const content = await this.app.projectFilesManager.getFileContent(
          goldenPath
        );
        if (typeof content === 'string') {
          return { content, error: null };
        }
      } catch (error) {
        this._editorTabLogReadFallback(
          'projectFilesManager.getFileContent',
          goldenPath,
          error
        );
      }
    }

    try {
      const response = await fetch(goldenPath + '?_=' + Date.now());
      if (response.ok) {
        return { content: await response.text(), error: null };
      }
      return {
        content: '',
        error: 'HTTP ' + response.status + ' while fetching ' + goldenPath,
      };
    } catch (error) {
      this._editorTabLogReadFallback('static fetch', goldenPath, error);
      return {
        content: '',
        error: error && error.message ? error.message : String(error),
      };
    }
  }

  async _processLoadedContent(codeContent) {
      const fileName = this.filePath.substring(
        this.filePath.lastIndexOf('/') + 1
      );
      codeContent = this._normalizeFetchContentResult(codeContent);

      const stripResult = this.codeParser.extractAndStripFooterMetadata(
        codeContent,
        this.filePath
      );
      let formattedCode = stripResult.code ?? '';

      this.isStructuredJs = /\.js$/i.test(this.filePath);

      try {
        if (this.isStructuredJs) {
          formattedCode = await CodeFormatter.format(formattedCode);
        }
      } catch (e) {
        console.warn('Formatting failed, proceeding with original code.', e);
      }

      const capsuleDocContent = this._detectCapsuleDocsFromSource(formattedCode);
      if (capsuleDocContent && capsuleDocContent.trim()) {
        this.docContent = capsuleDocContent;
        this.hasDocs = true;
        this.isDocumentationCapsule =
          this._looksLikeDocumentationCapsule(formattedCode);
      } else {
        this.isDocumentationCapsule = false;
      }

      const onContentChange = (newText) => {
        this._setDirtyState(true);
        if (this.appContext.onCodeChange) {
          this.appContext.onCodeChange(this.filePath, this.getCode());
        }
      };

      const setReadOnlyIfNeeded = () => {
        if (this.isReadOnly && this.codeMirrorWidgets.size > 0) {
          const widget = this.codeMirrorWidgets.values().next().value;
          if (widget) {
            widget.setReadOnly(true);
          }
        }
      };

      if (!this.isStructuredJs) {
        this.imports = [];
        this.exports = [];
        this.viewManager.displaySingleSegment(
          fileName,
          formattedCode,
          this._getModeForFile(this.filePath),
          onContentChange
        );
        this.viewManager.updateButtonVisibility();
        setReadOnlyIfNeeded();
        return;
      }

      const metadataResult = this.codeParser.parseForMetadata(
        formattedCode,
        this.filePath
      );
      this.imports = metadataResult.imports || [];
      this.exports = metadataResult.exports || [];

      if (metadataResult.error) {
        this.isStructuredJs = false;
        this.viewManager.displaySingleSegment(
          fileName,
          formattedCode,
          this._getModeForFile(this.filePath),
          onContentChange
        );
        this.viewManager.updateButtonVisibility();
        setReadOnlyIfNeeded();
        return;
      }

      const canBeHandledStructurally = this.exports.some(
        (exp) =>
          exp.kind === 'ClassDeclaration' ||
          exp.kind === 'VariableDeclaration' ||
          exp.kind === 'FunctionDeclaration'
      );

      if (!canBeHandledStructurally) {
        this.isStructuredJs = false;
      }

      const codeForEditor = this.isStructuredJs
        ? this._generateCleanEditorCode(formattedCode)
        : formattedCode;

      this.viewManager.displaySingleSegment(
        fileName,
        codeForEditor,
        this._getModeForFile(this.filePath),
        onContentChange
      );
      setReadOnlyIfNeeded();

      const editorMetadata = {
        codeSize: codeForEditor.split('\n').length,
        docSize: this.docContent ? this.docContent.split('\n').length : 0,
      };

      this.viewManager.updateDynamicStyles(editorMetadata);
      this.viewManager.updateButtonVisibility();
    }

  _generateCleanEditorCode(originalCode) {
    const parseResult = this.codeParser.parseForMetadata(
      originalCode,
      this.filePath
    );
    return this.codeParser.generateCleanBody(originalCode, parseResult, {
      stripExports: false,
      stripImports: false,
    });
  }

  _getModeForFile(filePath) {
    if (/\.js$/i.test(filePath)) return 'javascript';
    if (/\.css$/i.test(filePath)) return 'css';
    if (/\.html?$/i.test(filePath)) return 'htmlmixed';
    if (/\.md$/i.test(filePath)) return 'markdown';
    if (/\.json$/i.test(filePath)) return { name: 'javascript', json: true };
    if (/\.xml$/i.test(filePath)) return 'xml';
    return null;
  }

  getCode() {
      if (!this.isLoaded || this.segmentOrder.length === 0) return null;
      const singleSegmentName = this.segmentOrder[0];
      return this.codeMirrorWidgets.get(singleSegmentName)?.getText() || '';
    }

  _setDirtyState(isDirty) {
      if (this.isReadOnly) {
        if (this.isDirty !== false) {
          this.isDirty = false;
          this.appContext.onDirtyStateChange(this, false);
        }
        return;
      }
      if (this.isDirty !== isDirty) {
        this.isDirty = isDirty;
        this.appContext.onDirtyStateChange(this, isDirty);
      }
    }

  markClean() {
    this._setDirtyState(false);
  }

  destroy() {
      if (this.viewManager) {
        this.viewManager.destroyGlowBoxes();
      }
      this.codeMirrorWidgets.forEach((widget) => widget.getElement()?.remove());
      this.codeMirrorWidgets.clear();
      this.contentPanel.innerHTML = '';
    }

  _setLoadingState(isLoading) {
      this.isLoading = isLoading;
      if (this.contentPanel)
        this.contentPanel.style.opacity = isLoading ? '0.6' : '1';

      this.codeMirrorWidgets.forEach((widget) => {
        if (widget.setReadOnly) {
          widget.setReadOnly(isLoading);
        }
      });
    }

  handleUndo() {
    if (this.undoStack.length === 0) return;
    const currentState = this.getCode();
    this.redoStack.push(currentState);
    const stateToRestore = this.undoStack.pop();
    this.reloadWithNewContent(stateToRestore).then(() => {
      this._setDirtyState(true);
      this._updateUndoState();
    });
  }

  handleRedo() {
    if (this.redoStack.length === 0) return;
    const currentState = this.getCode();
    this.undoStack.push(currentState);
    const stateToRestore = this.redoStack.pop();
    this.reloadWithNewContent(stateToRestore).then(() => {
      this._setDirtyState(true);
      this._updateUndoState();
    });
  }

  _updateUndoState() {
    const canUndo = this.undoStack.length > 0;
    const canRedo = this.redoStack.length > 0;
    this.appContext.onUndoStateChange(canUndo, canRedo);
  }

  async getReconstructedCode(format = 'module') {
    return this.dataHandler.getReconstructedCode(format);
  }

  async applyRecursiUpdate(plan) {
    return this.dataHandler.applyRecursiUpdate(plan);
  }

  async applyImportUpdate(newImports) {
    return this.dataHandler.applyImportUpdate(newImports);
  }

  async refreshDocs() {
    await this.viewManager.fetchAndRenderDocs();
    const hadDocsBefore = this.hasDocs;
    this.hasDocs = !!(this.docContent && this.docContent.trim());

    if (this.hasDocs !== hadDocsBefore) {
      this.viewManager.updateButtonVisibility();
    }

    const codeForEditor = this.getCode() || '';
    const metadata = {
      codeSize: codeForEditor.split('\n').length,
      docSize: this.docContent ? this.docContent.split('\n').length : 0,
    };
    this.viewManager.updateDynamicStyles(metadata);
  }

  async updateCodeAndMetadata(newCode) {
    this.isAutoOpened = false;
    const formattedCode = newCode;

    if (this.app.vfs) {
      await this.app.vfs.writeFile(this.filePath, formattedCode);
      if (this.app.inMemoryFileStore) {
        this.app.inMemoryFileStore.set(this.filePath, formattedCode);
      }
    } else {
      const rootId = '/' + this.filePath.split('/').filter(Boolean)[0];
      const externalStore = this.app.workspaceFileStores?.get(rootId);

      if (externalStore && typeof externalStore.set === 'function') {
        await externalStore.set(this.filePath, formattedCode);
        if (this.app.inMemoryFileStore) {
          this.app.inMemoryFileStore.set(this.filePath, formattedCode);
        }
      } else if (this.app.inMemoryFileStore) {
        this.app.inMemoryFileStore.set(this.filePath, formattedCode);
      } else {
        throw new Error('No writable store available for ' + this.filePath);
      }
    }

    const activeCode = this.getCode();
    this._setDirtyState(activeCode !== formattedCode);

    if (this.app.updateSingleFileMetadata) {
      await this.app
        .updateSingleFileMetadata(this.filePath, formattedCode)
        .catch((e) => console.warn(e));
    }
  }

  async showDiff() {
    console.log(
      '[EditorTabController Debug] showDiff() triggered. Path:',
      this.filePath,
      'isDirty:',
      this.isDirty
    );
    if (!this.isDirty) {
      console.warn(
        '[EditorTabController Debug] Aborting showDiff: file is not dirty.'
      );
      return;
    }

    this.appContext.onStatusUpdate(`Generating diff for ${this.filePath}...`);
    this._setLoadingState(true);

    try {
      console.log(
        '[EditorTabController Debug] Fetching original file content...'
      );
      const originalFileResult = await this._fetchFileContent(this.filePath);
      console.log(
        '[EditorTabController Debug] Original file content retrieved:',
        originalFileResult
      );

      if (originalFileResult.error) {
        throw new Error(
          `Could not fetch original file content: ${originalFileResult.error}`
        );
      }
      const originalCode = originalFileResult.content || '';
      console.log(
        '[EditorTabController Debug] Reconstructing current code from editor...'
      );
      const currentCode = await this.getReconstructedCode();
      console.log(
        '[EditorTabController Debug] Current code reconstructed. Length:',
        currentCode ? currentCode.length : 0
      );

      const onRevert = async () => {
        console.log('[EditorTabController Debug] Revert action triggered.');
        await this.updateCodeAndMetadata(originalCode);
        this.markClean();
        this.viewManager.showStandardView();
        this.appContext.onStatusUpdate(
          `Changes reverted for ${this.filePath}.`,
          false,
          2000
        );
      };

      const onAcceptAll = () => {
        console.log('[EditorTabController Debug] Accept action triggered.');
        this.viewManager.showStandardView();
      };

      console.log(
        '[EditorTabController Debug] Delegating to renderDiffView()...'
      );
      await this.viewManager.renderDiffView(
        originalCode,
        currentCode,
        onRevert,
        onAcceptAll
      );
      console.log(
        '[EditorTabController Debug] renderDiffView() completed successfully.'
      );
    } catch (error) {
      console.error(
        '[EditorTabController Debug] Error inside showDiff():',
        error
      );
      this.appContext.onStatusUpdate(
        `Error generating diff: ${error.message}`,
        true,
        5000
      );
    } finally {
      console.log(
        '[EditorTabController Debug] Transitioning loading state to false.'
      );
      this._setLoadingState(false);
    }
  }

  triggerSearch() {
    if (this.viewManager) {
      return this.viewManager.triggerSearch();
    }
    return false;
  }

  previewHistoricalState(tempCode) {
      if (this._originalCodeBeforePreview === undefined) {
        this._originalCodeBeforePreview = this.getCode() ?? '';
      }

      if (this.segmentOrder.length > 0) {
        const mainSegmentName = this.segmentOrder[0];
        const mainWidget = this.codeMirrorWidgets.get(mainSegmentName);
        if (mainWidget) {
          mainWidget.setText(tempCode);
        }
      }
    }

  revertHistoricalPreview() {
      if (this._originalCodeBeforePreview !== undefined) {
        if (this.segmentOrder.length > 0) {
          const mainSegmentName = this.segmentOrder[0];
          const mainWidget = this.codeMirrorWidgets.get(mainSegmentName);
          if (mainWidget) {
            mainWidget.setText(this._originalCodeBeforePreview);
          }
        }
        this._originalCodeBeforePreview = undefined;
      }
    }

  setHotpatchedState(isHotpatched) {
    this.isHotpatched = isHotpatched;
    if (this.tabElement) {
      if (isHotpatched) {
        this.tabElement.classList.add('is-hotpatched');
        let badge = this.tabElement.querySelector('.hotpatch-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'hotpatch-badge';
          badge.textContent = '🔥';
          badge.style.marginLeft = '4px';
          badge.style.fontSize = '12px';
          this.tabElement.appendChild(badge);
        }
      } else {
        this.tabElement.classList.remove('is-hotpatched');
        const badge = this.tabElement.querySelector('.hotpatch-badge');
        if (badge) badge.remove();
      }
    }
  }

  async _editorTabGetVfs() {
    if (!this.app) {
      return null;
    }
    if (typeof this.app.refreshVirtualFileSystemStores === 'function') {
      return await this.app.refreshVirtualFileSystemStores();
    }
    return this.app.vfs || null;
  }

  _editorTabNormalizePath(path) {
    if (
      path &&
      typeof path.toString === 'function' &&
      typeof path !== 'string'
    ) {
      path = path.toString();
    }
    if (typeof path !== 'string') {
      return '';
    }
    let key = path.trim();
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

  _editorTabLogReadFallback(operation, path, error) {
    const message = error && error.message ? error.message : String(error);
    if (this.app && typeof this.app.logFileOp === 'function') {
      this.app.logFileOp('debug', 'EditorTabController VFS read fallback', {
        operation,
        path,
        error: message,
      });
      return;
    }
    if (this.app?.fileLogger && typeof this.app.fileLogger.log === 'function') {
      this.app.fileLogger.log(
        'debug',
        'EditorTabController VFS read fallback',
        {
          operation,
          path,
          error: message,
        }
      );
    }
  }

  _normalizeFetchContentResult(value) {
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value.content === 'string') {
      return value.content;
    }
    if (value && typeof value.code === 'string') {
      return value.code;
    }
    return '';
  }

  _detectCapsuleDocsFromSource(source) {
    if (typeof source !== 'string' || !source.trim()) {
      return '';
    }
    if (!/static\s+(_doc\b|_doc_[A-Za-z0-9_$]+)/.test(source)) {
      return '';
    }

    try {
      const code = source.replace(/^\s*export\s+(default\s+)?/gm, '');
      const match = code.match(/\bclass\s+([A-Za-z_$][\w$]*)\b/);
      if (!match) {
        return '';
      }

      const className = match[1];
      const tempClass = new Function(code + '\nreturn ' + className + ';')();

      if (!tempClass) {
        return '';
      }

      if (typeof tempClass._doc === 'function') {
        const doc = tempClass._doc();
        if (typeof doc === 'string') {
          return doc;
        }
        if (Array.isArray(doc)) {
          return doc.join('\n');
        }
      }

      const docParts = [];
      const staticNames = Object.getOwnPropertyNames(tempClass)
        .filter(
          (name) =>
            name.startsWith('_doc_') && typeof tempClass[name] === 'function'
        )
        .sort();

      for (const name of staticNames) {
        const value = tempClass[name]();
        if (typeof value === 'string') {
          docParts.push(value);
        } else if (Array.isArray(value)) {
          docParts.push(value.join('\n'));
        }
      }

      return docParts.join('\n\n');
    } catch (error) {
      console.warn(
        '[EditorTabController] Capsule doc extraction failed:',
        error
      );
      return '';
    }
  }

  _looksLikeDocumentationCapsule(source) {
    const filePath = String(this.filePath || '');
    if (!/\.js$/i.test(filePath)) {
      return false;
    }
    if (filePath.includes('/docs/')) {
      return true;
    }
    if (/Capsule\.js$/i.test(filePath)) {
      return true;
    }
    if (
      typeof source === 'string' &&
      /\bclass\s+[A-Za-z_$][\w$]*Docs?[A-Za-z0-9_$]*\b/.test(source)
    ) {
      return true;
    }
    return false;
  }

  _shouldPreferDocumentationView(source) {
    if (!this.hasDocs) {
      return false;
    }
    if (this.isDocumentationCapsule) {
      return true;
    }
    return this._looksLikeDocumentationCapsule(source);
  }

  

  

  static _doc() {
    return [this._doc_overview(), this._doc_formatting_and_diffs()].join(
      '\n\n'
    );
  }

  static getMarkdown() {
    return this._doc();
  }

  static _doc_overview() {
    return `# EditorTabController

The \`EditorTabController\` is the state machine behind an open editor tab.
It manages the file loading pipeline, handles local undo/redo stacks, tracks file-dirty states, and coordinates layout repaints.
It supports standard files, structured classes, binary assets (images), and floating external workspace files.`;
  }

  static _doc_formatting_and_diffs() {
    return `## View Toggling, Auto-Healing, and Inline Diffs

- **View Management**: Coordinates with \`EditorViewManager\` to toggle between Code view, Structured view (API signatures list), and Markdown Docs view.
- **Auto-Healing**: When a file is loaded or modified, \`EditorDataHandler\` scans the active identifiers against the global symbol map to automatically inject missing imports and strip unused ones.
- **Inline Diffs**: When a file is modified by an LLM update, calling \`showDiff()\` opens a CodeMirror \`unifiedMergeView\` comparing the original file against the newly generated changes, giving the user precise, visual merge-approval control.`;
  }

  static _doc_EditorTabController() {
    return `# EditorTabController

## Summary

The EditorTabController is the state machine behind an open editor tab. It manages the file loading pipeline, handles local undo/redo stacks, tracks file-dirty states, and coordinates layout repaints. It supports standard files, structured classes, binary assets (images), and floating external workspace files.`;
  }
}