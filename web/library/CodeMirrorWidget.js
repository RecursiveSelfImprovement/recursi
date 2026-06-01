class CodeMirrorWidget {
  static _modules = null;

  static _loadingPromise = null;

  static async ensureLoaded() {
      if (this._modules) return this._modules;
      if (this._loadingPromise) return this._loadingPromise;

      this._loadingPromise = (async () => {
        let importMap = document.querySelector('script[type="importmap"]');
        let mapData = { imports: {} };
        if (importMap) {
          try { mapData = JSON.parse(importMap.textContent); } catch (e) {}
        } else {
          importMap = document.createElement('script');
          importMap.type = 'importmap';
          document.head.appendChild(importMap);
        }

        const cmImports = {
          "@codemirror/state": "https://esm.sh/@codemirror/state@6.4.1",
          "@codemirror/view": "https://esm.sh/@codemirror/view@6.24.1?external=@codemirror/state",
          "@codemirror/language": "https://esm.sh/@codemirror/language@6.10.1?external=@codemirror/state,@codemirror/view",
          "@codemirror/commands": "https://esm.sh/@codemirror/commands@6.3.3?external=@codemirror/state,@codemirror/view,@codemirror/language",
          "@codemirror/search": "https://esm.sh/@codemirror/search@6.5.6?external=@codemirror/state,@codemirror/view",
          "@codemirror/autocomplete": "https://esm.sh/@codemirror/autocomplete@6.15.0?external=@codemirror/state,@codemirror/view,@codemirror/language",
          "@codemirror/lint": "https://esm.sh/@codemirror/lint@6.5.0?external=@codemirror/state,@codemirror/view",
          "@codemirror/lang-json": "https://esm.sh/@codemirror/lang-json@6.0.1?external=@codemirror/state,@codemirror/language",
          "@codemirror/lang-javascript": "https://esm.sh/@codemirror/lang-javascript@6.2.2?external=@codemirror/state,@codemirror/language,@codemirror/view,@codemirror/commands",
          "@codemirror/lang-markdown": "https://esm.sh/@codemirror/lang-markdown@6.2.5?external=@codemirror/state,@codemirror/language,@codemirror/view",
          "@codemirror/lang-html": "https://esm.sh/@codemirror/lang-html@6.4.9?external=@codemirror/state,@codemirror/language,@codemirror/view",
          "@codemirror/lang-css": "https://esm.sh/@codemirror/lang-css@6.2.1?external=@codemirror/state,@codemirror/language,@codemirror/view",
          "@codemirror/theme-one-dark": "https://esm.sh/@codemirror/theme-one-dark@6.1.2?external=@codemirror/state,@codemirror/view,@codemirror/language",
          "@lezer/common": "https://esm.sh/@lezer/common@1.2.1",
          "@lezer/highlight": "https://esm.sh/@lezer/highlight@1.2.0",
          "@lezer/lr": "https://esm.sh/@lezer/lr@1.4.0",
          "crelt": "https://esm.sh/crelt@1.0.6",
          "style-mod": "https://esm.sh/style-mod@4.1.2",
          "w3c-keyname": "https://esm.sh/w3c-keyname@2.2.8"
        };

        let needsUpdate = false;
        for (const [key, val] of Object.entries(cmImports)) {
          if (!mapData.imports[key]) {
            mapData.imports[key] = val;
            needsUpdate = true;
          }
        }
        if (needsUpdate) {
          importMap.textContent = JSON.stringify(mapData, null, 2);
        }

        const [
          state, view, language, commands, search, autocomplete,
          themeOneDark, langJs, langJson
        ] = await Promise.all([
          import("@codemirror/state"),
          import("@codemirror/view"),
          import("@codemirror/language"),
          import("@codemirror/commands"),
          import("@codemirror/search"),
          import("@codemirror/autocomplete"),
          import("@codemirror/theme-one-dark"),
          import("@codemirror/lang-javascript"),
          import("@codemirror/lang-json")
        ]);

        this._modules = {
          EditorState: state.EditorState,
          Compartment: state.Compartment,
          Transaction: state.Transaction,
          EditorView: view.EditorView,
          drawSelection: view.drawSelection,
          keymap: view.keymap,
          lineNumbers: view.lineNumbers,
          highlightSpecialChars: view.highlightSpecialChars,
          syntaxHighlighting: language.syntaxHighlighting,
          defaultHighlightStyle: language.defaultHighlightStyle,
          bracketMatching: language.bracketMatching,
          defaultKeymap: commands.defaultKeymap,
          historyKeymap: commands.historyKeymap,
          history: commands.history,
          search: search.search,
          searchKeymap: search.searchKeymap,
          openSearchPanel: search.openSearchPanel,
          closeSearchPanel: search.closeSearchPanel,
          closeBrackets: autocomplete.closeBrackets,
          oneDark: themeOneDark.oneDark,
          javascript: langJs.javascript,
          json: langJson.json
        };

        // Export all loaded versioned modules dynamically to global scope (removes need for CodeMirrorGlobals.mjs)
        for (const [key, val] of Object.entries(this._modules)) {
          globalThis[key] = val;
          window[key] = val;
        }

        // Establish core commands and history aliases
        globalThis.cmHistory = state.history || commands.history;
        window.cmHistory = state.history || commands.history;

        globalThis.openSearchPanel = search.openSearchPanel;
        globalThis.closeSearchPanel = search.closeSearchPanel;
        window.openSearchPanel = search.openSearchPanel;
        window.closeSearchPanel = search.closeSearchPanel;

        return this._modules;
      })();

      return this._loadingPromise;
    }

  constructor(
    optionsOrName,
    initialContent,
    mode = 'javascript',
    onChange = null
  ) {
    if (typeof optionsOrName === 'string' || arguments.length > 1) {
      // Legacy CodeSegment fallback for Vibes
      this.options = {
        name: optionsOrName,
        content: initialContent,
        mode: mode,
        onChange: onChange,
        readOnly: false,
        wrap: false,
      };
    } else {
      // Modern options object
      this.options = Object.assign(
        {
          host: null,
          content: '',
          mode: 'javascript',
          onChange: null,
          readOnly: false,
          wrap: true,
          name: 'CodeMirrorWidget',
          fontSize: null,
        },
        optionsOrName || {}
      );
    }

    this.name = this.options.name;
    this.initialValue = String(this.options.content || '');
    this.initialContent = this.initialValue;
    this._plainValue = this.initialValue;
    this._usingPlainFallback = false;
    this.editor = null;

    this.containerDiv = makeElement('div', { className: 'cm-widget-block' });
    this.editorHostDiv = makeElement('div', { className: 'cm-widget-host' });
    this.containerDiv.appendChild(this.editorHostDiv);

    if (this.options.host) {
      this.options.host.appendChild(this.containerDiv);
    }

    this._applyStyles();
    this.initializationPromise = this._initEditor();
  }

  async _initEditor() {
    try {
      const m = await CodeMirrorWidget.ensureLoaded();
      this.editableCompartment = new m.Compartment();

      const langExt = await this._getLanguageExtension(this.options.mode, m);

      const extensions = [
        m.lineNumbers(),
        m.highlightSpecialChars(),
        m.history(),
        m.drawSelection(),
        m.syntaxHighlighting(m.defaultHighlightStyle, { fallback: true }),
        m.bracketMatching(),
        m.closeBrackets(),
        m.keymap.of([
          ...m.defaultKeymap,
          ...m.historyKeymap,
          ...m.searchKeymap,
        ]),
        m.search({ top: true }),
        m.oneDark,
        langExt,
        this.editableCompartment.of(
          m.EditorState.readOnly.of(this.options.readOnly)
        ),
        m.EditorView.updateListener.of((update) => {
          if (
            update.docChanged &&
            update.transactions.some((tr) =>
              tr.annotation(m.Transaction.userEvent)
            )
          ) {
            if (this.options.onChange) this.options.onChange(this.getText());
          }
        }),
      ].filter(Boolean);

      if (this.options.wrap !== false) {
        extensions.push(m.EditorView.lineWrapping);
      }

      const state = m.EditorState.create({
        doc: this.initialValue,
        extensions,
      });

      this.editor = new m.EditorView({
        state,
        parent: this.editorHostDiv,
      });

      if (this.options.fontSize && this.editorHostDiv) {
        this.editorHostDiv.style.fontSize = this.options.fontSize + 'px';
      }

      // Sync any changes made programmatically while module was downloading
      if (this.initialValue !== this._plainValue) {
        this.setText(this._plainValue);
      }
    } catch (e) {
      console.warn(
        'CodeMirrorWidget: Initialization failed, using plain fallback.',
        e
      );
      this._createPlainFallback();
    }
  }

  async _getLanguageExtension(modeStr, m) {
    const mode = String(modeStr || '').toLowerCase();
    try {
      if (mode === 'json' || mode.endsWith('.json')) return m.json();

      if (mode === 'markdown' || mode.endsWith('.md')) {
        if (!m.markdown) {
          const pkg = await import('@codemirror/lang-markdown');
          m.markdown = pkg.markdown;
        }
        return m.markdown();
      }

      if (mode === 'html' || mode.endsWith('.html')) {
        if (!m.html) {
          const pkg = await import('@codemirror/lang-html');
          m.html = pkg.html;
        }
        return m.html();
      }

      if (mode === 'css' || mode.endsWith('.css')) {
        if (!m.css) {
          const pkg = await import('@codemirror/lang-css');
          m.css = pkg.css;
        }
        return m.css();
      }

      return m.javascript();
    } catch (e) {
      console.warn('CodeMirrorWidget: Failed to load language mode', mode, e);
      return [];
    }
  }

  _createPlainFallback() {
    this._usingPlainFallback = true;
    this.editorHostDiv.innerHTML = '';

    this.textareaElement = document.createElement(
      this.options.readOnly ? 'pre' : 'textarea'
    );
    this.textareaElement.style.width = '100%';
    this.textareaElement.style.height = '100%';
    this.textareaElement.style.minHeight = '220px';
    this.textareaElement.style.boxSizing = 'border-box';
    this.textareaElement.style.fontFamily = 'monospace';
    this.textareaElement.style.background = '#1e1e1e';
    this.textareaElement.style.color = '#ccc';

    if (this.textareaElement.tagName === 'TEXTAREA') {
      this.textareaElement.value = this._plainValue;
      this.textareaElement.addEventListener('input', () => {
        this._plainValue = this.textareaElement.value;
        if (this.options.onChange) this.options.onChange(this._plainValue);
      });
    } else {
      this.textareaElement.textContent = this._plainValue;
    }

    this.editorHostDiv.appendChild(this.textareaElement);
  }

  _applyStyles() {
    applyCss(
      `
      .cm-widget-block { width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; }
      .cm-widget-host { width: 100%; height: 100%; flex: 1; min-height: 0; }
      .cm-widget-host .cm-editor { height: 100%; border: none; }
      .cm-scroller { overflow: auto !important; }
      .cm-search.cm-panel { background-color: #252526; color: #ccc; border: 1px solid #444; }
      .cm-search input { background-color: #1e1e1e; color: #ccc; border: 1px solid #444; }
      .cm-search button { background-color: #333; color: #ccc; border: 1px solid #555; }
    `,
      'CodeMirrorWidgetStyles'
    );
  }

  getElement() {
    return this.containerDiv;
  }

  getName() {
    return this.name;
  }

  getText() {
    return this.getValue();
  }

  getValue() {
    if (this._usingPlainFallback) return this._plainValue;
    if (this.editor && this.editor.state)
      return this.editor.state.doc.toString();
    return this._plainValue;
  }

  setText(newContent) {
    this.setValue(newContent);
  }

  setValue(newContent) {
    const trimmed = String(newContent || '');
    this._plainValue = trimmed;

    if (this._usingPlainFallback && this.textareaElement) {
      if (this.textareaElement.tagName === 'TEXTAREA') {
        this.textareaElement.value = trimmed;
      } else {
        this.textareaElement.textContent = trimmed;
      }
      return;
    }

    if (this.editor && this.editor.state) {
      if (this.editor.state.doc.toString() !== trimmed) {
        this.editor.dispatch({
          changes: {
            from: 0,
            to: this.editor.state.doc.length,
            insert: trimmed,
          },
        });
      }
    }
  }

  setReadOnly(isReadOnly) {
    this.options.readOnly = isReadOnly;

    if (
      this._usingPlainFallback &&
      this.textareaElement &&
      this.textareaElement.tagName === 'TEXTAREA'
    ) {
      this.textareaElement.readOnly = isReadOnly;
    }

    if (!this.editor || !this.editableCompartment) return;

    const m = CodeMirrorWidget._modules;
    if (m) {
      this.editor.dispatch({
        effects: this.editableCompartment.reconfigure(
          m.EditorState.readOnly.of(isReadOnly)
        ),
      });
    }
  }

  requestMeasure() {
    if (this.editor) this.editor.requestMeasure();
  }

  static async ensureLoaded() {
    if (this._modules) return this._modules;
    if (this._loadingPromise) return this._loadingPromise;

    this._loadingPromise = (async () => {
      // 1. Inject or update the import map independently
      let importMap = document.querySelector('script[type="importmap"]');
      let mapData = { imports: {} };
      if (importMap) {
        try {
          mapData = JSON.parse(importMap.textContent);
        } catch (e) {}
      } else {
        importMap = document.createElement('script');
        importMap.type = 'importmap';
        document.head.appendChild(importMap);
      }

      const cmImports = {
        '@codemirror/state': 'https://esm.sh/@codemirror/state@6.4.1',
        '@codemirror/view':
          'https://esm.sh/@codemirror/view@6.24.1?external=@codemirror/state',
        '@codemirror/language':
          'https://esm.sh/@codemirror/language@6.10.1?external=@codemirror/state,@codemirror/view',
        '@codemirror/commands':
          'https://esm.sh/@codemirror/commands@6.3.3?external=@codemirror/state,@codemirror/view,@codemirror/language',
        '@codemirror/search':
          'https://esm.sh/@codemirror/search@6.5.6?external=@codemirror/state,@codemirror/view',
        '@codemirror/autocomplete':
          'https://esm.sh/@codemirror/autocomplete@6.15.0?external=@codemirror/state,@codemirror/view,@codemirror/language',
        '@codemirror/lint':
          'https://esm.sh/@codemirror/lint@6.5.0?external=@codemirror/state,@codemirror/view',
        '@codemirror/lang-json':
          'https://esm.sh/@codemirror/lang-json@6.0.1?external=@codemirror/state,@codemirror/language',
        '@codemirror/lang-javascript':
          'https://esm.sh/@codemirror/lang-javascript@6.2.2?external=@codemirror/state,@codemirror/language,@codemirror/view,@codemirror/commands',
        '@codemirror/lang-markdown':
          'https://esm.sh/@codemirror/lang-markdown@6.2.5?external=@codemirror/state,@codemirror/language,@codemirror/view',
        '@codemirror/lang-html':
          'https://esm.sh/@codemirror/lang-html@6.4.9?external=@codemirror/state,@codemirror/language,@codemirror/view',
        '@codemirror/lang-css':
          'https://esm.sh/@codemirror/lang-css@6.2.1?external=@codemirror/state,@codemirror/language,@codemirror/view',
        '@codemirror/theme-one-dark':
          'https://esm.sh/@codemirror/theme-one-dark@6.1.2?external=@codemirror/state,@codemirror/view,@codemirror/language',
        '@lezer/common': 'https://esm.sh/@lezer/common@1.2.1',
        '@lezer/highlight': 'https://esm.sh/@lezer/highlight@1.2.0',
        '@lezer/lr': 'https://esm.sh/@lezer/lr@1.4.0',
        crelt: 'https://esm.sh/crelt@1.0.6',
        'style-mod': 'https://esm.sh/style-mod@4.1.2',
        'w3c-keyname': 'https://esm.sh/w3c-keyname@2.2.8',
      };

      let needsUpdate = false;
      for (const [key, val] of Object.entries(cmImports)) {
        if (!mapData.imports[key]) {
          mapData.imports[key] = val;
          needsUpdate = true;
        }
      }
      if (needsUpdate) {
        importMap.textContent = JSON.stringify(mapData, null, 2);
      }

      // 2. Import core functionality
      const [
        state,
        view,
        language,
        commands,
        search,
        autocomplete,
        themeOneDark,
        langJs,
        langJson,
      ] = await Promise.all([
        import('@codemirror/state'),
        import('@codemirror/view'),
        import('@codemirror/language'),
        import('@codemirror/commands'),
        import('@codemirror/search'),
        import('@codemirror/autocomplete'),
        import('@codemirror/theme-one-dark'),
        import('@codemirror/lang-javascript'),
        import('@codemirror/lang-json'),
      ]);

      // Publish commands globally to align with legacy Global lookup fallbacks
      globalThis.openSearchPanel = search.openSearchPanel;
      globalThis.closeSearchPanel = search.closeSearchPanel;

      this._modules = {
        EditorState: state.EditorState,
        Compartment: state.Compartment,
        Transaction: state.Transaction,
        EditorView: view.EditorView,
        drawSelection: view.drawSelection,
        keymap: view.keymap,
        lineNumbers: view.lineNumbers,
        highlightSpecialChars: view.highlightSpecialChars,
        syntaxHighlighting: language.syntaxHighlighting,
        defaultHighlightStyle: language.defaultHighlightStyle,
        bracketMatching: language.bracketMatching,
        defaultKeymap: commands.defaultKeymap,
        historyKeymap: commands.historyKeymap,
        history: commands.history,
        search: search.search,
        searchKeymap: search.searchKeymap,
        openSearchPanel: search.openSearchPanel,
        closeSearchPanel: search.closeSearchPanel,
        closeBrackets: autocomplete.closeBrackets,
        oneDark: themeOneDark.oneDark,
        javascript: langJs.javascript,
        json: langJson.json,
      };

      return this._modules;
    })();

    return this._loadingPromise;
  }
}