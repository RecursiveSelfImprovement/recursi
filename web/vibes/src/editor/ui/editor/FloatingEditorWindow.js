class FloatingEditorWindow {
  
  constructor(options = {}) {
    this.app = options.app || window.projectApp || null;
    this.path = options.path;
    this.store = options.store;
    this.rootId = options.rootId || this._rootIdFromPath(this.path);
    this.projectName = this.rootId.replace(/^\//, '');
    this.title = options.title || this.path?.split('/').pop() || 'Floating Editor';
    this.docsPath = options.docsPath || this._docsPathForExternalPath(this.path);

    this.dialog = null;
    this.contentElement = null;
    this.toolbarElement = null;
    this.editorPanel = null;
    this.statusElement = null;
    this.pathElement = null;
    this.visibilityWidgetContainer = null;
    this.modeButtons = {};
    this.controller = null;
    this.visibilityWidget = null;
    this.isText = typeof this.store?.get?.(this.path) === 'string';
  }

  async open() {
      if (this.contentElement?.isConnected) {
        this.bringToFront();
        return this;
      }

      if (typeof EditorTabController === 'undefined') {
        throw new Error('EditorTabController is not loaded.');
      }

      this._installStyles();

      this.editorPanel = makeElement('div', {
        className: 'floating-real-editor-panel',
      });

      this.toolbarElement = this._createToolbar();

      this.contentElement = makeElement('div', {
        className: 'floating-real-editor-window',
      }, this.toolbarElement, this.editorPanel);

      // Calculate deterministic cascading position
      const openEditors = document.querySelectorAll('.floating-real-editor-window').length;
      const startX = Math.floor(window.innerWidth * 0.20); // Left-center side
      const startY = 100;
      const cascadeX = startX + (openEditors * 45);
      const cascadeY = startY + (openEditors * 45);

      this.dialog = UITools.makeDialog({
        title: '🪟 ' + this.title,
        contentElement: this.contentElement,
        size: [900, 720],
        position: [cascadeX, cascadeY],
      });

      await this._mountRealEditorController();
      this._applyFloatingMode();
      this._syncHorizontalButtonsFromRealView();

      return this;
    }

  bringToFront() {
    try {
      this.dialog?.bringToFront?.();
    } catch (error) {}

    const box =
      this.contentElement?.closest?.('.dialog-box') ||
      this.contentElement?.parentElement;

    if (box) {
      box.style.zIndex = String(Date.now() % 100000 + 2000);
    }
  }

  _createToolbar() {
      const codeButton      = this._makeModeButton('Code', 'code');
      const signatureButton = this._makeModeButton('Signature', 'structured');
      const docsButton      = this._makeModeButton('Docs', 'docs');

      const saveButton   = this._makeToolbarButton('💾 Save',   () => this.save(),                          'save');
      const reloadButton = this._makeToolbarButton('↻ Reload',  () => this.reload(),                        'secondary');
      const searchButton = this._makeToolbarButton('🔍 Search', () => this.controller?.triggerSearch(),     'secondary');
      const diffButton   = this._makeToolbarButton('⚖️ Diff',   () => this.controller?.showDiff(),          'secondary');

      this.saveButton = saveButton;
      this.copyButton = this._makeToolbarButton('📋 Copy', () => this.copyCurrent(), 'secondary');

      this.visibilityWidgetContainer = makeElement('div', {
        className: 'floating-real-editor-visibility',
        title: 'Prompt visibility for this floating editor',
      });

      this.pathElement = makeElement('div', {
        className: 'floating-real-editor-path',
        title: this.path,
      }, this.path);

      this.statusElement = makeElement('div', {
        className: 'floating-real-editor-status',
      }, this.isText ? 'ready' : 'binary / unavailable');

      const modes = makeElement('div', {
        className: 'floating-real-editor-mode-pills',
      }, codeButton, signatureButton, docsButton);

      const actions = makeElement('div', {
        className: 'floating-real-editor-actions',
      }, saveButton, reloadButton, this.copyButton, searchButton, diffButton);

      return makeElement('div', {
        className: 'floating-real-editor-toolbar',
      }, modes, actions, this.visibilityWidgetContainer, this.pathElement, this.statusElement);
    }

  _makeModeButton(label, viewName) {
    const button = makeElement('button', {
      className: 'floating-real-editor-pill',
      onclick: () => this.setActiveView(viewName),
    }, label);

    this.modeButtons[viewName] = button;
    return button;
  }

  _makeToolbarButton(label, onClick, kind) {
    return makeElement('button', {
      className: 'floating-real-editor-button floating-real-editor-button-' + kind,
      onclick: onClick,
    }, label);
  }

  async _mountRealEditorController() {
      const initialContent = this.isText ? String(this.store.get(this.path) ?? '') : '';
      this._initialCode = initialContent;
      const hasDocs = typeof this.store.get(this.docsPath) === 'string';
      const readOnly = !this.isText;
      const appContext = this._createFloatingEditorAppContext();

      this.controller = new EditorTabController(
        this.path,
        this.projectName,
        this.editorPanel,
        appContext,
        hasDocs,
        readOnly
      );

      this.controller.isFloatingExternalEditor = true;
      this.controller.externalStore = this.store;
      this.controller.externalRootId = this.rootId;
      this.controller.externalDocsPath = this.docsPath;

      this._patchControllerForExternalStore(this.controller);

      if (this.app?.editorControllers) {
        this.app.editorControllers.set(this.path, this.controller);
      }

      await this.controller.init(initialContent, true, null);
      this._installToolbarVisibilityWidget();
    }

  _createFloatingEditorAppContext() {
    const documentationManager = this._createExternalDocumentationAdapter();

    return {
      app: this.app,
      documentationManager,
      lastEditorViewMode: this.app?.lastEditorViewMode || 'code',

      onDirtyStateChange: (ctrl, isDirty) => {
        this._setStatus(isDirty ? 'dirty' : 'clean', isDirty ? 'dirty' : 'ready');
      },

      onCodeChange: () => {
        this._setStatus('dirty', 'dirty');
      },

      onUndoStateChange: () => {},

      onStatusUpdate: (message, isError) => {
        this._setStatus(message || '', isError ? 'error' : 'ready');
      },

      onViewModeChange: (viewName) => {
        this._syncHorizontalButtonsFromRealView(viewName);
      },
    };
  }

  _createExternalDocumentationAdapter() {
    return {
      getDocPath: () => this.docsPath,

      ensureDocExists: async () => {
        if (typeof this.store.get(this.docsPath) !== 'string') {
          await this.store.set(this.docsPath, '');
        }
        return true;
      },

      readDoc: async () => {
        return typeof this.store.get(this.docsPath) === 'string'
          ? this.store.get(this.docsPath)
          : '';
      },

      writeDoc: async (docPath, content) => {
        await this.store.set(docPath || this.docsPath, String(content ?? ''));
        return true;
      },
    };
  }

  _patchControllerForExternalStore(controller) {
      controller._floatingOriginalFetchFileContent = controller._fetchFileContent;

      controller._fetchFileContent = async (filePath) => {
        const content = this.store.get(filePath);
        if (typeof content === 'string') {
          return { content, error: null };
        }
        return { content: '', error: 'File is binary or unavailable in external store.' };
      };

      controller.showDiff = async () => {
        if (!controller.isDirty) return;
        this._setStatus('Generating diff...', 'ready');
        
        const originalCode = this._initialCode ?? '';
        const currentCode = this._getMainCodeFromController() ?? '';

        const onRevert = async () => {
          await controller.updateCodeAndMetadata(originalCode);
          controller.markClean();
          controller.viewManager.showStandardView();
          this._setStatus('Reverted', 'ready');
        };

        const onAcceptAll = () => {
          controller.viewManager.showStandardView();
        };

        await controller.viewManager.renderDiffView(
          originalCode,
          currentCode,
          onRevert,
          onAcceptAll
        );
        this._setStatus('Diff active', 'ready');
      };
    }

  _installToolbarVisibilityWidget() {
    if (!this.visibilityWidgetContainer || typeof VisibilityWidget === 'undefined') {
      return;
    }

    this.visibilityWidgetContainer.innerHTML = '';

    const codeLines = this.isText
      ? String(this.store.get(this.path) ?? '').split('\n').length
      : 1;

    const docLines = typeof this.store.get(this.docsPath) === 'string'
      ? String(this.store.get(this.docsPath)).split('\n').length
      : 0;

    this.visibilityWidget = new VisibilityWidget({
      fileData: {
        path: this.path,
        name: this.title,
        code: codeLines,
        docs: docLines,
        isStructured: /\.js$/i.test(this.path),
        hasDocs: docLines > 0,
      },
      maxSizes: {
        maxCodeLength: Math.max(40, Math.min(180, codeLines + 20)),
        maxDocsLength: Math.max(24, Math.min(80, docLines + 20)),
      },
      initialState: {
        code: true,
        signatures: /\.js$/i.test(this.path),
        docsLevel: docLines > 0 ? 4 : 0,
      },
      onChange: () => {
        this._setStatus('visibility changed', 'ready');
      },
    });

    this.visibilityWidgetContainer.appendChild(this.visibilityWidget.getElement());
  }

  _applyFloatingMode() {
    if (!this.contentElement) return;

    this.contentElement.classList.add('floating-real-editor-mounted');

    const sidebar = this.editorPanel.querySelector('.editor-mode-sidebar');
    if (sidebar) sidebar.style.display = 'none';

    const wrapper = this.editorPanel.querySelector('.editor-area-wrapper');
    if (wrapper) wrapper.classList.add('floating-real-editor-area-wrapper');

    const viewContainer = this.editorPanel.querySelector('.editor-view-container');
    if (viewContainer) viewContainer.classList.add('floating-real-editor-view-container');
  }

  setActiveView(viewName) {
    if (!this.controller?.viewManager) return;

    const normalized = viewName === 'signature' ? 'structured' : viewName;

    if (typeof this.controller.viewManager.setActiveView === 'function') {
      this.controller.viewManager.setActiveView(normalized);
    } else if (typeof this.controller.viewManager.switchView === 'function') {
      this.controller.viewManager.switchView(normalized);
    }

    this._syncHorizontalButtonsFromRealView(normalized);
  }

  _syncHorizontalButtonsFromRealView(viewName = null) {
    const active =
      viewName ||
      this.controller?.viewManager?.activeView ||
      this.app?.lastEditorViewMode ||
      'code';

    for (const [mode, button] of Object.entries(this.modeButtons)) {
      button.classList.toggle('active', mode === active);
    }
  }

  async save() {
    try {
      if (!this.controller) return false;

      const active = this.controller.viewManager?.activeView;
      if (active === 'docs') {
        return await this._saveDocsFromRealEditor();
      }

      return await this._saveCodeFromRealEditor();
    } catch (error) {
      this._setStatus('save failed', 'error');
      console.error('[FloatingEditorWindow] save failed:', error);
      return false;
    }
  }

  _saveCodeFromRealEditor() {
    const code = this._getMainCodeFromController();
    const codeLen = code != null ? String(code).length : -1;

    if (code === null || code === undefined) {
      this._setStatus('no code editor found', 'error');
      return Promise.resolve(false);
    }

    const codeStr = String(code);

    if (codeStr.length < 2) {
      this._setStatus('save blocked: content empty (' + codeStr.length + ' bytes)', 'error');
      console.warn('[FloatingEditorWindow] save blocked — content too short:', codeLen, 'chars');
      return Promise.resolve(false);
    }

    this._setStatus('saving…', 'saving');
    console.log('[FloatingEditorWindow] saving', codeStr.length, 'chars to', this.path);

    return this.store.set(this.path, codeStr).then(() => {
      this._initialCode = codeStr;
      if (this.controller) {
        this.controller.isDirty = false;
        this.controller.markClean?.();
      }
      this._afterSave();
      this._setStatus('saved ' + new Date().toLocaleTimeString(), 'saved');
      return true;
    }).catch(err => {
      this._setStatus('save failed: ' + err.message, 'error');
      console.error('[FloatingEditorWindow] store.set failed:', err);
      return false;
    });
  }

  async _saveDocsFromRealEditor() {
    const docs = this._getDocsFromRealEditor();

    this._setStatus('saving docs…', 'saving');
    await this.store.set(this.docsPath, docs);

    this._afterSave();
    this._installToolbarVisibilityWidget();
    this._setStatus('docs saved ' + new Date().toLocaleTimeString(), 'saved');
    return true;
  }

  _getMainCodeFromController() {
      if (this.editorPanel && typeof EditorView !== 'undefined') {
        const cmEl = this.editorPanel.querySelector('.cm-editor');
        if (cmEl) {
          const view = EditorView.findFromDOM(cmEl);
          if (view?.state?.doc) {
            const content = view.state.doc.toString();
            if (content.length > 0) {
              console.log('[FloatingEditorWindow] got content from live EditorView DOM:', content.length, 'chars');
              return content;
            }
          }
        }
      }

      if (!this.controller?.codeMirrorWidgets) return null;

      const widgets = this.controller.codeMirrorWidgets;
      const keys = Array.from(widgets.keys());
      const fileName = this.path.split('/').pop();

      const widget =
        widgets.get(fileName) ||
        widgets.get(this.path) ||
        widgets.get(keys.find(k => k.endsWith(fileName)) ?? '') ||
        Array.from(widgets.values())[0];

      if (!widget) return null;

      const candidates = [];

      if (typeof widget.getValue === 'function') {
        const v = widget.getValue();
        if (v) candidates.push(v);
      }
      if (widget.editor?.state?.doc) {
        const v = widget.editor.state.doc.toString();
        if (v) candidates.push(v);
      }
      if (widget.textareaElement?.value) {
        candidates.push(widget.textareaElement.value);
      }
      if (widget.containerDiv) {
        const ta = widget.containerDiv.querySelector?.('textarea');
        if (ta?.value) candidates.push(ta.value);
      }

      if (candidates.length === 0) {
        console.warn('[FloatingEditorWindow] all widget accessors returned empty for:', fileName, 'keys:', keys);
        return null;
      }

      const best = candidates.reduce((a, b) => a.length >= b.length ? a : b);
      console.log('[FloatingEditorWindow] got content from widget fallback:', best.length, 'chars');
      return best;
    }

  _getDocsFromRealEditor() {
    const view = this.controller?.viewManager;

    if (view?.docEditorInstance?.state?.doc) {
      return view.docEditorInstance.state.doc.toString();
    }

    if (view?.markdownEditorView) {
      const textarea = view.markdownEditorView.querySelector('textarea');
      if (textarea) return textarea.value;
    }

    return typeof this.store.get(this.docsPath) === 'string'
      ? this.store.get(this.docsPath)
      : '';
  }

  _getValueFromSegment(segment) {
    if (!segment) return null;

    if (typeof segment.getValue === 'function') return segment.getValue();
    if (segment.editor?.state?.doc) return segment.editor.state.doc.toString();
    if (segment.textareaElement) return segment.textareaElement.value ?? '';
    if (segment.containerDiv) {
      const textarea = segment.containerDiv.querySelector?.('textarea');
      if (textarea) return textarea.value;
    }

    return null;
  }

  reload() {
    if (!this.controller) return;

    this.editorPanel.innerHTML = '';
    this._mountRealEditorController().then(() => {
      this._applyFloatingMode();
      this._syncHorizontalButtonsFromRealView();
      this._setStatus('reloaded', 'ready');
    });
  }

  async copyCurrent() {
    try {
      const active = this.controller?.viewManager?.activeView;
      const text = active === 'docs'
        ? this._getDocsFromRealEditor()
        : this._getMainCodeFromController();

      await navigator.clipboard.writeText(String(text ?? ''));
      this._setStatus('copied ✓', 'saved');

      // Flash the button
      if (this.copyButton) {
        const orig = this.copyButton.textContent;
        this.copyButton.textContent = '✓ Copied!';
        this.copyButton.style.color = '#6ff0a0';
        setTimeout(() => {
          this.copyButton.textContent = orig;
          this.copyButton.style.color = '';
        }, 1500);
      }
    } catch (error) {
      this._setStatus('copy failed', 'error');
    }
  }

  _afterSave() {
    try {
      if (this.app?.workspaceFileStores && this.rootId) {
        this.app.workspaceFileStores.set(this.rootId, this.store);
      }

      this.app?.projectFilesManager?._refreshFloatingTreeForPath?.(this.path);
      this.app?.tabOrchestrator?.refreshRunnerTab?.();
    } catch (error) {
      console.warn('[FloatingEditorWindow] after-save refresh failed:', error);
    }
  }

  _setStatus(text, kind = 'ready') {
      if (this.statusElement) {
        this.statusElement.textContent = text;
        this.statusElement.dataset.kind = kind;
      }
      
      // Upgrade: Visually change the actual save button
      if (this.saveButton) {
        this.saveButton.classList.remove('is-dirty', 'is-saving', 'is-saved');
        
        if (kind === 'dirty') {
          this.saveButton.classList.add('is-dirty');
          this.saveButton.textContent = '💾 Save*';
        } else if (kind === 'saving') {
          this.saveButton.classList.add('is-saving');
          this.saveButton.textContent = '⏳ Saving...';
        } else if (kind === 'saved') {
          this.saveButton.classList.add('is-saved');
          this.saveButton.textContent = '✓ Saved';
          setTimeout(() => {
            if (this.saveButton && this.saveButton.classList.contains('is-saved')) {
              this.saveButton.classList.remove('is-saved');
              this.saveButton.textContent = '💾 Save';
            }
          }, 2000);
        } else {
          this.saveButton.textContent = '💾 Save';
        }
      }
    }

  _rootIdFromPath(path) {
    const first = String(path || '').split('/').filter(Boolean)[0] || 'ExternalFolder';
    return '/' + first;
  }

  _docsPathForExternalPath(path) {
    if (typeof SidecarDocumentation !== 'undefined') {
      return SidecarDocumentation.docsPathForFile(path);
    }

    const slashIndex = String(path || '').lastIndexOf('/');
    const dir = slashIndex >= 0 ? String(path).slice(0, slashIndex) : '';
    const name = slashIndex >= 0 ? String(path).slice(slashIndex + 1) : String(path);
    return `${dir}/${name.replace(/\./g, '_')}.md`;
  }

  _installStyles() {
      const id = 'FloatingEditorWindowRealEditorStyles';
      if (document.getElementById(id)) return;
      // yes it stuck
      const css = `
        .floating-real-editor-window {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          background: #0d1117;
          color: var(--text-primary, #dce6ff);
        }

        .floating-real-editor-toolbar {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 8px;
          border-bottom: 1px solid rgba(130, 160, 255, 0.22);
          background: rgba(12, 16, 28, 0.93);
          box-shadow: 0 8px 28px rgba(0,0,0,0.24);
          min-width: 0;
        }

        .floating-real-editor-mode-pills,
        .floating-real-editor-actions {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px;
          border-radius: 9px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          flex: 0 0 auto;
        }

        .floating-real-editor-pill,
        .floating-real-editor-button {
          padding: 5px 10px;
          font-size: 12px;
          border-radius: 7px;
          border: 1px solid rgba(130,160,255,0.36);
          background: rgba(35,48,88,0.84);
          color: #dfe8ff;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .floating-real-editor-pill:hover,
        .floating-real-editor-button:hover {
          background: rgba(55,80,145,0.95);
          border-color: rgba(170,195,255,0.75);
        }

        .floating-real-editor-pill.active {
          color: white;
          border-color: rgba(210,225,255,0.9);
          box-shadow: 0 0 16px rgba(80,140,255,0.42);
        }

        .floating-real-editor-button-save {
          background: rgba(35, 92, 60, 0.9);
          border-color: rgba(90, 220, 145, 0.42);
        }
        
        .floating-real-editor-button-save.is-dirty {
          background: rgba(40, 167, 69, 0.9) !important;
          border-color: rgba(60, 200, 90, 0.9) !important;
          box-shadow: 0 0 8px rgba(40, 167, 69, 0.4);
          color: #fff !important;
        }
        
        .floating-real-editor-button-save.is-saving {
          background: rgba(100, 150, 200, 0.9) !important;
          border-color: rgba(120, 180, 255, 0.9) !important;
          color: #fff !important;
        }
        
        .floating-real-editor-button-save.is-saved {
          background: rgba(30, 130, 70, 0.9) !important;
          border-color: rgba(50, 180, 100, 0.9) !important;
          color: #fff !important;
        }

        .floating-real-editor-visibility {
          flex: 0 0 auto;
          max-width: 260px;
          overflow: visible;
        }

        .floating-real-editor-path {
          flex: 1 1 auto;
          min-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #aebdf8;
          font-size: 11px;
          font-family: ui-monospace, Menlo, Consolas, monospace;
        }

        .floating-real-editor-status {
          flex: 0 0 auto;
          min-width: 90px;
          text-align: right;
          color: #8794b8;
          font-size: 11px;
        }

        .floating-real-editor-status[data-kind="dirty"] { color: #f5c15c; }
        .floating-real-editor-status[data-kind="saving"] { color: #72c7ff; }
        .floating-real-editor-status[data-kind="saved"] { color: #6ff0a0; }
        .floating-real-editor-status[data-kind="error"] { color: #ff7777; }
        .floating-real-editor-status[data-kind="readonly"] { color: #c08cff; }

        .floating-real-editor-panel {
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }

        .floating-real-editor-panel .editor-tab-controller,
        .floating-real-editor-panel .editor-area-wrapper,
        .floating-real-editor-panel .floating-real-editor-area-wrapper {
          height: 100%;
          min-height: 0;
        }

        .floating-real-editor-panel .editor-area-wrapper {
          display: flex;
        }

        .floating-real-editor-panel .editor-mode-sidebar {
          display: none !important;
        }

        .floating-real-editor-panel .editor-view-container {
          flex: 1 1 auto;
          min-width: 0;
          min-height: 0;
        }

        .floating-real-editor-panel .code-block,
        .floating-real-editor-panel .editor-host,
        .floating-real-editor-panel .cm-editor {
          height: 100% !important;
          min-height: 0 !important;
        }

        .floating-real-editor-panel .cm-scroller {
          overflow: auto !important;
        }
      `;

      const style = document.createElement('style');
      style.id = id;
      style.textContent = css;
      document.head.appendChild(style);
    }


  static _doc_overview() {
      return `# FloatingEditorWindow

The \`FloatingEditorWindow\` implements a self-contained, draggable editor that exists outside the main tab area.
It allows developers to open, edit, save, diff, and configure prompt visibilities for files residing in external local directories or separate workspace mounts.`;
    }

  static _doc_sandboxing() {
      return `## Decoupled Sandboxing

- **Self-Contained Controller**: Instantiates its own \`EditorTabController\` and patches the file-fetching/saving methods to interact directly with the specified \`LocalDirectoryStore\` or external workspace backend.
- **Horizontal Toolbar**: Replaces the classic vertical mode sidebar with a horizontal header containing custom pills for view switching (Code, Signature, Docs) and actions (Save, Reload, Diff, Copy).
- **Inline Indicator**: Updates the Save button with custom states (\`is-dirty\`, \`is-saving\`, \`is-saved\`) to provide immediate feedback on external disk operations.`;
    }

  static _doc() {
      return [
        this._doc_FloatingEditorWindow(),
        this._doc_overview(),
        this._doc_sandboxing()
      ].join('\n\n');
    }

  

  static _doc_FloatingEditorWindow() {
      return `# FloatingEditorWindow

## Summary

FloatingEditorWindow implements a self-contained, draggable editor that exists outside the main tab area. It allows developers to open, edit, save, diff, and configure prompt visibilities for files residing in external local directories or separate workspace mounts.`;
    }

  _getValueFromWidget(widget) {
      if (!widget) return null;

      if (typeof widget.getValue === 'function') return widget.getValue();
      if (widget.editor?.state?.doc) return widget.editor.state.doc.toString();
      if (widget.textareaElement) return widget.textareaElement.value ?? '';
      if (widget.containerDiv) {
        const textarea = widget.containerDiv.querySelector?.('textarea');
        if (textarea) return textarea.value;
      }

      return null;
    }

  close(closeDialog = true) {
      if (this.controller && this.controller.isDirty) {
        return new Promise((resolve) => {
          UITools.makeDialog({
            title: 'Unsaved Changes',
            contentElement: makeElement(
              'p',
              `Do you want to save the changes you made to ${this.title}?`
            ),
            buttons: [
              {
                label: 'Save',
                className: 'primary',
                onClick: async (e, d) => {
                  d.close();
                  await this.save();
                  this._performClose(closeDialog);
                  resolve(true);
                },
              },
              {
                label: "Don't Save",
                onClick: (e, d) => {
                  d.close();
                  if (this.controller) this.controller.isDirty = false;
                  this._performClose(closeDialog);
                  resolve(true);
                },
              },
              {
                label: 'Cancel',
                onClick: (e, d) => {
                  d.close();
                  resolve(false);
                }
              },
            ],
          });
        });
      }

      this._performClose(closeDialog);
      return Promise.resolve(true);
    }

  _performClose(closeDialog) {
      this._lifecycleObserver?.disconnect();
      clearTimeout(this._connTimer);
      this._removeConnector();
      this._children?.forEach((c) => {
        try {
          c.dockBack?.();
        } catch (_) {}
      });

      if (this.app?.editorControllers) {
        this.app.editorControllers.delete(this.path);
      }

      if (closeDialog && this.dialog?.close) {
        const dialog = this.dialog;
        this.dialog = null;
        dialog.close();
      } else {
        this.dialog = null;
      }

      this.options.onClose?.(this);
      setTimeout(() => this._saveWorkspaceState(), 100);
    }
}