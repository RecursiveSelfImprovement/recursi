class BuildPromptTab {
  constructor(app) {
      this.app = app;
      this.projectFilesManager = this.app.projectFilesManager;
      this.ui = {};
      this.isDestroyed = false;
      this.ui.protocolEditor = null;

      this.manifest = {};
      this.currentSetName = null;
      this.loadedSetSettings = this._collectWidgetStates();
      this.isDirty = false;

      this.sectionStates = {
        userInstructions:
          localStorage.getItem('bp_section_userInstructions') !== 'false',
        protocol: localStorage.getItem('bp_section_protocol') !== 'false',
        fileContext: localStorage.getItem('bp_section_fileContext') !== 'false',
        searchResults:
          localStorage.getItem('bp_section_searchResults') === 'true',
      };

      this.superDictateWidget = new DictationWidget();
      this.superDictateWidget.init();

      this.dictationContent = '';
      this.dictationUpdateCallback = this._updateDictationState.bind(this);
      this.superDictateWidget.subscribe(this.dictationUpdateCallback);

      this._widgetStateChangeCallback = this._checkDirtyState.bind(this);

      this._onTreeChanged = () => {
        clearTimeout(this._treeChangeTimer);
        this._treeChangeTimer = setTimeout(() => {
          if (this.isDestroyed) return;

          // Dynamically ensure ALL active trees have the onVisibilityChange callback wired
          const trees = this._collectFileTreeViewsForPrompt();
          for (const entry of trees) {
            if (entry.tree?.options) {
              entry.tree.options.onVisibilityChange = this._widgetStateChangeCallback;
            }
          }

          this._checkDirtyState();
          this.updateCopyButtonState();
          this._refreshTreeIncludeControls();
        }, 50);
      };

      this.app.on('vfs:store-mounted', this._onTreeChanged);
      this.app.on('file-tree:registered', this._onTreeChanged);
      this.app.on('file-tree:unregistered', this._onTreeChanged);

      // Trigger initial setup for any existing loaded trees
      this._onTreeChanged();

      this.element = this._createElement();

      this._loadManifest().then(() => {
        const lastSet = localStorage.getItem('promptBuilder_lastSet');
        if (lastSet && this.manifest[lastSet]) {
          this.ui.select.value = lastSet;
          this._loadSet(lastSet);
        }
      });
    }

  getElement() {
    if (!this.element && typeof this._createElement === 'function') {
      this._createElement();
    }

    if (typeof this._wireTreeScopedPromptBuilder === 'function') {
      this._wireTreeScopedPromptBuilder();
    }

    if (typeof this._ensureMultiTreePromptBundleButton === 'function') {
      this._ensureMultiTreePromptBundleButton();
    }

    return this.element;
  }

  destroy() {
      this.isDestroyed = true;
      clearTimeout(this._treeChangeTimer);
      if (this.superDictateWidget) {
        this.superDictateWidget.unsubscribe(this.dictationUpdateCallback);
        this.superDictateWidget.destroy();
      }
      if (this.ui.protocolEditor) {
        this.ui.protocolEditor.destroy();
      }
      if (this.buttonGlow) {
        this.buttonGlow.destroy();
      }
      if (this._onTreeChanged) {
        this.app.off('vfs:store-mounted', this._onTreeChanged);
        this.app.off('file-tree:registered', this._onTreeChanged);
        this.app.off('file-tree:unregistered', this._onTreeChanged);
      }
    }

  smartOpen(context) {
    this.updateCopyButtonState();
  }

  _createElement() {
      const helpContent = {
        main: `
                <h3>Prompt Generation Workflow</h3>
                <ol>
                    <li><strong>Describe Goal:</strong> Use the "User Prompt" section to tell the AI what you want (e.g., "Add a search bar").</li>
                    <li><strong>Select Context:</strong> Use the "Source Files" section to choose which files the AI needs to see. You don't need to send everything!</li>
                    <li><strong>Generate:</strong> Click "Generate Prompt" to combine your instructions, the protocol rules, and the selected code into one package.</li>
                </ol>
                <p><strong>Tip:</strong> The "Protocol Doc" defines the AI's persona and output format. You usually only need to include this <em>once</em> at the start of a new chat session.</p>
            `,
        userInstructions: `
                <h3>User Prompt & Dictation</h3>
                <p>This is where you tell the AI what to do.</p>
                <ul>
                    <li><strong>Dictation:</strong> Click "Start Listening" to use voice input.</li>
                    <li><strong>Quick Edit:</strong> Click "Quick Edit" to enter a mode where you can fix punctuation and capitalization with single clicks or keystrokes.
                        <ul>
                            <li><em>Hover + . / , / ?</em> : Add punctuation.</li>
                            <li><em>Shift + Click</em> : Toggle capitalization.</li>
                        </ul>
                    </li>
                    <li><strong>Magic Send:</strong> If the Teleporter is connected, the "Send to Gemini" button will appear, letting you paste directly into the AI's chat window.</li>
                </ul>
            `,
        protocol: `
                <h3>Protocol Document</h3>
                <p>The <strong>Protocol</strong> is a set of system instructions that tells the AI how to behave.</p>
                <p>It defines:</p>
                <ul>
                    <li><strong>Role:</strong> "You are an expert developer..."</li>
                    <li><strong>Output Format:</strong> How the AI should format its code responses using the standard \`run(env)\` block format.</li>
                    <li><strong>Constraints:</strong> Rules about not abbreviating code or removing comments.</li>
                </ul>
                <p>You can view or edit this document to customize how the AI responds to you.</p>
            `,
        fileContext: `
                <h3>Source Files</h3>
                <p>This section controls which files are sent to the AI as context.</p>
                <ul>
                    <li><strong>Visibility Sets:</strong> Save and load different groups of files (e.g., "UI Logic", "Backend").</li>
                    <li><strong>The File Tree:</strong> Use the <strong>Visibility Widgets</strong> (the colored capsules) next to each file to choose what to include:
                        <ul>
                            <li><span style="color:#0088ff">Blue (Code)</span>: Full source code.</li>
                            <li><span style="color:#d98e48">Orange (Sig)</span>: Only function signatures (API surface).</li>
                            <li><span style="color:#8433ff">Purple (Docs)</span>: Associated documentation.</li>
                        </ul>
                    </li>
                    <li><strong>Bulk Actions:</strong> Right-click any widget (or use the "Bulk Selection Tools" button) to select/deselect files in bulk.</li>
                </ul>
            `,
      };

      const showHelp = (key, title) => {
        UITools.makeDialog({
          title: `Help: ${title}`,
          contentHTML: helpContent[key] || helpContent.main,
          width: '500px',
          noPadding: false,
        });
      };

      const createSection = ({
        id,
        title,
        description,
        content,
        isOpen,
        includeInPrompt = true,
        color,
      }) => {
        this.ui[`${id}_includeCheckbox`] = makeElement('input', {
          type: 'checkbox',
          checked: includeInPrompt,
        });

        const helpIcon = makeElement('span', {
          className: 'section-help-icon',
          innerHTML: '?',
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'var(--text-secondary)',
            fontSize: '10px',
            fontWeight: 'bold',
            marginLeft: '6px',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.2)',
          },
          onclick: (e) => {
            e.stopPropagation();
            showHelp(id, title);
          },
        });

        const titleEl = makeElement(
          'label',
          { className: 'section-title', onclick: (e) => e.stopPropagation() },
          [this.ui[`${id}_includeCheckbox`], title, helpIcon]
        );

        const titleWrapper = makeElement(
          'div',
          { className: 'section-title-wrapper' },
          [titleEl]
        );
        this.ui[`${id}_titleWrapper`] = titleWrapper;
        const header = makeElement(
          'div',
          {
            className: 'prompt-section-header',
            onclick: () => this._toggleSection(id),
            style: { borderLeft: `4px solid ${color}` },
          },
          [
            makeElement('span', { className: 'toggler-icon' }),
            titleWrapper,
            makeElement('p', { className: 'section-description' }, description),
          ]
        );
        const contentContainer = makeElement(
          'div',
          { className: 'prompt-section-content' },
          content
        );
        return makeElement(
          'div',
          {
            id: `bp-section-${id}`,
            className: `prompt-section-container ${isOpen ? 'is-open' : ''}`,
          },
          [header, contentContainer]
        );
      };

      const addTip = (el, text, color) => {
        if (!el) return;
        el.addEventListener('mouseover', () =>
          GlowingTooltip.show(el, text, { color, allowHtml: true })
        );
        el.addEventListener('mouseout', () => GlowingTooltip.hide());
      };

      const userPromptContent = this.superDictateWidget.getElement();
      setTimeout(() => {
        const editBtn = userPromptContent.querySelector('.dictation-edit-btn');
        if (editBtn)
          addTip(
            editBtn,
            '<strong>Quick Edit Mode:</strong><br>Hover over a space and press `.` or `,`. Shift+Click a word to toggle case.',
            [243, 156, 18]
          );
      }, 500);

      this.ui.viewProtocolBtn = makeElement(
        'button',
        { onclick: () => this._toggleProtocolEditor() },
        'View/Edit Protocol'
      );
      this.ui.protocolEditorHost = makeElement('div', {
        className: 'protocol-editor-host',
        style: { display: 'none', marginTop: '10px' },
      });

      const protocolContent = makeElement('div', {}, [
        this.ui.viewProtocolBtn,
        this.ui.protocolEditorHost,
      ]);

      this.ui.select = makeElement('select', {
        onchange: (e) => this._loadSet(e.target.value),
      });
      this.ui.dirtyIndicator = makeElement(
        'span',
        { className: 'dirty-indicator', style: { display: 'none' } },
        '*'
      );
      this.ui.saveButton = makeElement(
        'button',
        {
          className: 'primary-action',
          onclick: () => this._handleSave(),
          disabled: true,
        },
        'Save'
      );
      const saveAsButton = makeElement(
        'button',
        { onclick: () => this._handleSaveAs() },
        'Save As...'
      );
      this.ui.deleteButton = makeElement(
        'button',
        {
          className: 'danger',
          onclick: () => this._handleDelete(),
          disabled: true,
        },
        'Delete'
      );

      this.ui.treeSummary = makeElement('div', {
        className: 'tree-summary-label',
        style: {
          fontSize: '11px',
          color: '#888',
          marginTop: '8px',
          fontStyle: 'italic',
        },
      });

      const sourceFilesContent = makeElement(
        'div',
        { className: 'source-files-content' },
        [
          makeElement('div', { className: 'prompt-controls' }, [
            makeElement('label', {}, 'Visibility Set:'),
            makeElement('div', { className: 'set-selector-wrapper' }, [
              this.ui.select,
              this.ui.dirtyIndicator,
            ]),
            this.ui.saveButton,
            saveAsButton,
            this.ui.deleteButton,
          ]),
          this.ui.treeSummary,
        ]
      );

      this.ui.searchResultsEditorHost = makeElement(
        'div',
        {
          className: 'search-results-editor-host',
          style: {
            minHeight: '60px',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '10px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            color: 'var(--text-secondary)',
            maxHeight: '300px',
            overflow: 'auto',
            backgroundColor: 'var(--bg-primary)',
          },
        },
        'No search results yet.'
      );

      this.ui.generateButton = makeElement(
        'button',
        {
          className: 'generate-prompt-btn',
          onclick: () => {
            this._generatePrompt();
            if (this.superDictateWidget) {
              this.superDictateWidget.markAsUsed();
            }
          },
          style: {
            backgroundColor: '#233926',
            borderColor: '#345',
            color: '#a0cfa0',
            boxShadow: 'none',
            transition: 'background-color 0.3s, color 0.3s',
          },
          onmouseenter: (e) => {
            if (!e.target.disabled) {
              e.target.style.backgroundColor = '#2d4a32';
              e.target.style.color = '#fff';
            }
          },
          onmouseleave: (e) => {
            if (!e.target.disabled) {
              e.target.style.backgroundColor = '#233926';
              e.target.style.color = '#a0cfa0';
            }
          },
        },
        'Generate Prompt'
      );

      const mainHelpBtn = makeElement('button', {
        className: 'main-help-btn',
        innerHTML: '?',
        title: 'How this works',
        onclick: () => showHelp('main', 'Workflow'),
        style: {
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#aaa',
          border: '1px solid #444',
          cursor: 'pointer',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      });

      const librariesBtn = makeElement('button', {
        className: 'select-tools-btn',
        textContent: '📚 Libraries',
        title: 'Add shared libraries to your project',
        onclick: () => {
          if (typeof LibraryManagerDialog !== 'undefined') {
            const dialog = new LibraryManagerDialog(this.app);
            dialog.show();
          }
        },
      });

      const headerControls = makeElement(
        'div',
        {
          className: 'tab-header-controls',
          style: 'display: flex; gap: 10px; align-items: center;',
        },
        [this.ui.generateButton, librariesBtn, mainHelpBtn]
      );

      const container = makeElement(
        'div',
        { className: 'build-prompt-tab-container' },
        [
          makeElement('style', ''),
          headerControls,
          createSection({
            id: 'userInstructions',
            title: 'User Prompt',
            description: 'Dictate or type instructions.',
            content: userPromptContent,
            isOpen: this.sectionStates.userInstructions,
            color: 'var(--accent-blue)',
          }),
          createSection({
            id: 'protocol',
            title: 'Protocol Doc',
            description: 'Rules for the LLM (only needed once).',
            content: protocolContent,
            isOpen: this.sectionStates.protocol,
            includeInPrompt: true,
            color: 'var(--accent-purple)',
          }),
          createSection({
            id: 'searchResults',
            title: 'Search Results',
            description: 'Output from your last Advanced Search.',
            content: this.ui.searchResultsEditorHost,
            isOpen: this.sectionStates.searchResults || false,
            includeInPrompt: false,
            color: 'var(--accent-orange)',
          }),
          createSection({
            id: 'fileContext',
            title: 'Source Files',
            description: 'Code included in the prompt.',
            content: sourceFilesContent,
            isOpen: this.sectionStates.fileContext,
            color: 'var(--accent-teal)',
          }),
        ]
      );

      container.querySelector(
        'style'
      ).textContent = `.build-prompt-tab-container { padding: 20px; display: flex; flex-direction: column; gap: 15px; } .tab-header-controls { margin-bottom: 5px; display: flex; } .prompt-section-container { border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-secondary); overflow: hidden; transition: background-color 0.2s; } .prompt-section-header { margin: 0; padding: 10px 15px; cursor: pointer; display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 10px 20px; } .section-title-wrapper { display: inline-block; grid-column: 2; justify-self: start; } .section-title { font-size: 1.1em; display: flex; align-items: center; gap: 10px; margin: 0; font-weight: bold; cursor: pointer; color: var(--text-primary); } .section-description { grid-column: 3; margin: 0; color: var(--text-secondary); font-size: 0.9em; text-align: right; } .toggler-icon { grid-column: 1; content: ''; display: inline-block; width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 5px solid var(--text-secondary); transition: transform 0.2s ease-in-out; } .prompt-section-container.is-open .toggler-icon { transform: rotate(90deg); } .prompt-section-content { display: none; padding: 15px; border-top: 1px solid var(--border-color); } #bp-section-userInstructions .prompt-section-content, #bp-section-fileContext .prompt-section-content { padding: 0; } .prompt-section-container.is-open .prompt-section-content { display: block; } .prompt-section-content .superdictate-widget-container { border: none; height: 300px; } .source-files-content { padding: 15px; display: flex; flex-direction: column; gap: 15px; } .prompt-controls { display: grid; grid-template-columns: auto 1fr auto auto auto; gap: 10px; align-items: center; } .set-selector-wrapper { position: relative; display: flex; align-items: center; } .dirty-indicator { color: var(--accent-orange); font-size: 1.5em; font-weight: bold; margin-left: 5px; cursor: help; } .build-prompt-tab-container button { border-radius: 5px; border: 1px solid #555; padding: 8px 16px; cursor: pointer; transition: all 0.2s ease; background-color: #3c3c3c; color: var(--text-primary); font-weight: 500; } .build-prompt-tab-container button:disabled { opacity: 0.5; cursor: not-allowed; background-color: #4a4a4a !important; color: #888; } .build-prompt-tab-container button:not(:disabled):hover { border-color: #777; background-color: #4f4f4f; transform: translateY(-1px); } .build-prompt-tab-container button.primary-action { background-color: var(--accent-blue); border-color: #005f9e; color: white; } .build-prompt-tab-container button.primary-action:hover:not(:disabled) { background-color: #008cff; } .build-prompt-tab-container button.danger { background-color: transparent; border-color: var(--accent-red); color: var(--accent-red); } .build-prompt-tab-container button.danger:hover:not(:disabled) { background-color: var(--accent-red); color: white; } .generate-prompt-btn { padding: 12px 24px; font-size: 1.1em; font-weight: bold; } .select-tools-btn { border-color: var(--accent-teal); color: var(--accent-teal); } .select-tools-btn:hover:not(:disabled) { background-color: var(--accent-teal); color: white; }`;

      const addGlow = (el, text, color) => {
        if (!el) return;
        el.addEventListener('mouseover', () => {
          if (window.GlowingTooltip) GlowingTooltip.show(el, text, { color });
        });
        el.addEventListener('mouseout', () => {
          if (window.GlowingTooltip) GlowingTooltip.hide();
        });
      };

      addGlow(this.ui.viewProtocolBtn, 'Toggle the system rule configurations editor that instructs the AI how to format and structure its code answers.', [132, 51, 255]);
      addGlow(this.ui.saveButton, 'Save your currently selected file checkboxes and visibility levels as a preset set.', [0, 191, 165]);
      addGlow(saveAsButton, 'Save this checklist configuration under a new visibility set name.', [0, 191, 165]);
      addGlow(this.ui.deleteButton, 'Delete the current active visibility set.', [255, 80, 80]);
      addGlow(this.ui.generateButton, 'Compile and assemble all active instructions, rule documents, search results, and checked code/docs into a unified LLM prompt.', [40, 167, 69]);
      addGlow(librariesBtn, 'Add shared library components and code utilities to your current workspace context.', [0, 191, 165]);
      addGlow(mainHelpBtn, 'View complete workspace documentation, workflow tips, and prompt engineering instructions.', [100, 110, 120]);

      return container;
    }

  _checkDirtyState() {
    if (this.isDestroyed) return;

    this._removeLegacySourceVisibilityControls();
    this._refreshTreeIncludeControls();

    const currentSettings = this._collectWidgetStates();
    const isDifferent =
      JSON.stringify(currentSettings) !==
      JSON.stringify(this.loadedSetSettings);

    this.isDirty = isDifferent;

    if (this.ui.dirtyIndicator) {
      this.ui.dirtyIndicator.style.display = this.isDirty ? 'inline' : 'none';
    }

    const hasActiveSet = !!this.currentSetName;

    if (this.ui.saveButton) {
      this.ui.saveButton.disabled = true;
      this.ui.saveButton.title =
        "Global visibility-set saving was moved to each tree's Visibility Tools.";
    }

    if (this.ui.deleteButton) {
      this.ui.deleteButton.disabled = true;
      this.ui.deleteButton.title =
        'Global visibility-set deletion is disabled here. Use tree-scoped tools.';
    }

    if (this.ui.treeSummary) {
      const trees = this._collectFileTreeViewsForPrompt();
      const included = trees.filter((entry) =>
        this._isTreeIncludedForPrompt(entry)
      );
      const selectedCount = Object.values(currentSettings).filter((state) => {
        return state.code || state.signatures || state.docsLevel > 0;
      }).length;

      this.ui.treeSummary.textContent =
        included.length +
        '/' +
        trees.length +
        ' tree(s) included · ' +
        selectedCount +
        ' selected file(s)';
    }
  }

  _updateDictationState(content) {
    const hadContentBefore = this.dictationContent.length > 0;
    this.dictationContent = content.trim();
    const hasContentNow = this.dictationContent.length > 0;

    if (hasContentNow && !hadContentBefore) {
      if (this.ui.userInstructions_includeCheckbox) {
        this.ui.userInstructions_includeCheckbox.checked = true;
      }
    }
  }

  async _loadManifest() {
    this.manifest = {};
    const files = [];
    if (this.app.inMemoryFileStore)
      files.push(...this.app.inMemoryFileStore.keys());
    if (this.app.workspaceFileStores) {
      for (const store of this.app.workspaceFileStores.values()) {
        if (store.keys) files.push(...store.keys());
      }
    }
    const uniqueFiles = [...new Set(files)];
    const capsulePaths = uniqueFiles.filter(
      (p) => p.endsWith('.js') && p.includes('VisibilitySet')
    );

    for (const p of capsulePaths) {
      let content = null;
      if (this.app.inMemoryFileStore?.has(p))
        content = this.app.inMemoryFileStore.get(p);
      else {
        const rootId = '/' + p.split('/').filter(Boolean)[0];
        const store = this.app.workspaceFileStores?.get(rootId);
        if (store?.get) content = store.get(p);
      }

      if (typeof content === 'string') {
        const acorn = this.app.codeParser?.acorn || window.acorn;
        if (acorn) {
          try {
            const ast = acorn.parse(content, {
              ecmaVersion: 'latest',
              sourceType: 'module',
            });
            for (const node of ast.body) {
              let classNode = node.type === 'ClassDeclaration' ? node : null;
              if (
                node.type === 'ExportNamedDeclaration' ||
                node.type === 'ExportDefaultDeclaration'
              ) {
                if (node.declaration?.type === 'ClassDeclaration')
                  classNode = node.declaration;
              }
              if (classNode) {
                for (const m of classNode.body.body) {
                  if (
                    m.type === 'MethodDefinition' &&
                    m.key.name?.startsWith('_set_')
                  ) {
                    try {
                      const fnCode = content.slice(m.start, m.end);
                      const tempClass = new Function(
                        `return class Temp { ${fnCode} }`
                      )();
                      const setData = tempClass[m.key.name]();
                      const displayName =
                        setData.name ||
                        m.key.name.substring(5).replace(/_/g, ' ');
                      this.manifest[displayName] = {
                        capsulePath: p,
                        methodName: m.key.name,
                        data: setData,
                      };
                    } catch (e) {}
                  }
                }
              }
            }
          } catch (e) {}
        }
      }
    }

    if (this.ui.saveButton) this.ui.saveButton.disabled = false;
    if (this.ui.deleteButton) this.ui.deleteButton.disabled = false;
    if (this.ui.select) this.ui.select.disabled = false;

    this._populateSelect();
  }

  _populateSelect() {
    if (!this.ui.select) return;
    const currentVal = this.ui.select.value;
    this.ui.select.innerHTML = '';
    this.ui.select.appendChild(
      makeElement('option', { value: '' }, '— Current View —')
    );
    Object.keys(this.manifest)
      .sort()
      .forEach((name) => {
        this.ui.select.appendChild(
          makeElement('option', { value: name }, name)
        );
      });
    this.ui.select.value = currentVal;
  }

  async _loadSet(setName) {
    if (!setName) {
      this.currentSetName = null;
      const currentStates = this._collectWidgetStates();
      this.projectFilesManager.applyVisibilitySet(currentStates, null);
      this.loadedSetSettings = this._collectWidgetStates();
      localStorage.removeItem('promptBuilder_lastSet');
      this._checkDirtyState();
      return;
    }

    try {
      const setObj = this.manifest[setName];
      if (!setObj)
        throw new Error(`Set name '${setName}' not found in manifest.`);

      const cleanSettings =
        setObj.data.files || setObj.data.settings || setObj.data;
      this.projectFilesManager.applyVisibilitySet(cleanSettings, setName);
      this.loadedSetSettings = this._collectWidgetStates();
      this.currentSetName = setName;
      localStorage.setItem('promptBuilder_lastSet', setName);

      this.app.uiManager.setStatus(
        `Applied visibility set: ${setName}.`,
        false
      );
      this._checkDirtyState();
    } catch (e) {
      this.app.uiManager.setStatus(
        `Error: Could not load set '${setName}'. ${e.message}`,
        true
      );
      this.ui.select.value = '';
      await this._loadSet('');
    }
  }

  _collectWidgetStates() {
    const widgetStates = {};
    const trees = this._collectFileTreeViewsForPrompt();

    for (const entry of trees) {
      if (!this._isTreeIncludedForPrompt(entry)) continue;

      const tree = entry.tree;
      if (!tree?.nodesMap) continue;

      for (const node of tree.nodesMap.values()) {
        const widget = node?.visibilityWidget;
        if (!widget?.file?.path || !widget.state) continue;

        const path = widget.file.path;
        const state = { ...widget.state };

        // Guarantee normalized translation in case older un-migrated values slip in
        if (state.code && !state.codeLevel) state.codeLevel = 4;
        if (state.docsLevel > 0) state.docs = true;

        const existing = widgetStates[path];
        if (existing) {
          existing.code = !!(existing.code || state.code);
          existing.codeLevel = Math.max(
            existing.codeLevel || 0,
            state.codeLevel || 0
          );
          existing.signatures = !!(existing.signatures || state.signatures);
          existing.sig = existing.signatures;
          existing.docsLevel = Math.max(
            existing.docsLevel || 0,
            state.docsLevel || 0
          );
          existing.docs = !!(
            existing.docs ||
            state.docs ||
            existing.docsLevel > 0
          );
        } else {
          widgetStates[path] = state;
        }
      }
    }

    return widgetStates;
  }

  _handleSave() {
    if (!this.currentSetName || !this.isDirty) return;
    const currentSettings = this._collectWidgetStates();
    this._saveSet(this.currentSetName, currentSettings);
  }

  _handleSaveAs() {
    const currentName = this.currentSetName || '';
    const input = makeElement('input', {
      type: 'text',
      placeholder: 'Enter new set name...',
      value: currentName,
    });
    UITools.makeDialog({
      title: 'Save Visibility Set As...',
      content: input,
      buttons: [
        {
          label: 'Save',
          className: 'primary',
          onClick: async () => {
            const name = input.value.trim();
            if (!name) return false;
            const currentSettings = this._collectWidgetStates();
            await this._saveSet(name, currentSettings);
          },
        },
        { label: 'Cancel' },
      ],
    });
  }

  async _saveSet(name, settings) {
    try {
      await this.app.commands.saveVisibilitySet({ name, settings });
      this.app.uiManager.setStatus(`Visibility set '${name}' saved.`, false);
      await this._loadManifest();
      this.ui.select.value = name;
      await this._loadSet(name);
    } catch (e) {}
  }

  _handleDelete() {
    const setName = this.currentSetName;
    if (!setName) return;

    if (typeof UITools !== 'undefined') {
      UITools.makeDialog({
        title: 'Delete Visibility Set?',
        content: makeElement(
          'p',
          {},
          `Are you sure you want to permanently delete the set "${setName}"?`
        ),
        buttons: [
          {
            label: 'Delete',
            className: 'danger',
            onClick: async () => {
              if (this.app.executeLlmCommand) {
                await this.app.executeLlmCommand({
                  action: 'deleteVisibilitySet',
                  name: setName,
                });
              } else if (
                this.app.commands &&
                typeof this.app.commands.deleteVisibilitySet === 'function'
              ) {
                await this.app.commands.deleteVisibilitySet({ name: setName });
              }
            },
          },
          { label: 'Cancel' },
        ],
      });
    }
  }

  async _generatePrompt() {
    try {
      this.app.uiManager.setStatus('Generating prompt...');

      const filesForContext = [];
      if (this.ui.fileContext_includeCheckbox.checked) {
        const widgetStates = this._collectWidgetStates();
        for (const [path, state] of Object.entries(widgetStates)) {
          if (state.code || state.signatures || state.docsLevel > 0) {
            filesForContext.push({ path, state });
          }
        }
      }

      let userPromptContent = null;
      if (
        this.ui.userInstructions_includeCheckbox.checked &&
        this.dictationContent
      ) {
        userPromptContent = this.dictationContent;
      }

      let protocolContent = null;
      if (this.ui.protocol_includeCheckbox.checked) {
        if (this.ui.protocolEditor) {
          protocolContent = this.ui.protocolEditor.state.doc.toString();
        } else {
          const protocolPath = '/vibes/protocol.md';
          protocolContent = await this.app.projectFilesManager.getFileContent(
            protocolPath
          );
          if (!protocolContent) {
            protocolContent = await this._promptReadProtocolContent();
          }
          if (!protocolContent) {
            throw new Error(`Protocol document not found at ${protocolPath}`);
          }
        }
      }

      let finalPrompt = await this._buildPromptString({
        files: filesForContext,
        protocolContent: protocolContent,
        dictationContent: userPromptContent,
      });

      this.app.uiManager.showInOutputTab(finalPrompt.trim());
      this.app.uiManager.setStatus('Prompt generated.');
    } catch (error) {
      console.error('Error generating prompt:', error);
      this.app.uiManager.setStatus(`Error: ${error.message}`, true);
    }
  }

  _toggleSection(sectionId) {
    const container = this.element.querySelector(`#bp-section-${sectionId}`);
    if (container) {
      const isOpen = container.classList.toggle('is-open');
      this.sectionStates[sectionId] = isOpen;
      localStorage.setItem(`bp_section_${sectionId}`, isOpen);
    }
  }

  async _toggleProtocolEditor() {
      const host = this.ui.protocolEditorHost;
      if (!host) return;

      const isVisible = host.style.display !== 'none';

      if (isVisible) {
        host.style.display = 'none';
        this.ui.viewProtocolBtn.textContent = 'View/Edit Protocol';
        return;
      }

      host.style.display = 'block';
      this.ui.viewProtocolBtn.textContent = 'Hide Protocol';

      if (this.ui.protocolEditor) return;

      try {
        const protocolText = await this._promptReadProtocolContent();

        if (!protocolText) {
          throw new Error('Protocol document could not be loaded.');
        }

        // Await the CodeMirror dynamic module loader safely
        const m = await CodeMirrorWidget.ensureLoaded();
        const EditorStateClass = m.EditorState;
        const EditorViewClass = m.EditorView;
        const keymapFn = m.keymap;
        const defaultKeymapArr = m.defaultKeymap;
        const lineNumbersFn = m.lineNumbers;
        const oneDarkTheme = m.oneDark;

        const extensions = [
          lineNumbersFn ? lineNumbersFn() : [],
          keymapFn ? keymapFn.of([...defaultKeymapArr]) : [],
          oneDarkTheme,
          EditorViewClass.lineWrapping,
          EditorViewClass.theme({
            '&': { height: '400px', maxHeight: '60vh' },
            '.cm-scroller': { overflow: 'auto' },
          }),
        ].flat().filter(Boolean);

        const state = EditorStateClass.create({
          doc: protocolText,
          extensions,
        });

        this.ui.protocolEditor = new EditorViewClass({ state, parent: host });
      } catch (e) {
        host.textContent = `Error loading protocol: ${e.message}`;
        console.error(e);
      }
    }

  _applyPromptCodeStripping(codeContent, codeLevel, lang) {
    let textContent = codeContent;
    let suffix = '';

    if (codeLevel >= 4) return { textContent, suffix };

    if (lang === 'javascript') {
      const acorn = this.app?.codeParser?.acorn || window.acorn;
      if (acorn) {
        try {
          const ast = acorn.parse(textContent, {
            ecmaVersion: 'latest',
            sourceType: 'module',
          });
          const cls = ast.body.find(
            (n) =>
              n.type === 'ClassDeclaration' ||
              (n.type.startsWith('Export') &&
                n.declaration?.type === 'ClassDeclaration')
          );

          if (cls) {
            const classNode =
              cls.type === 'ClassDeclaration' ? cls : cls.declaration;
            const methods = classNode.body.body.filter(
              (m) => m.type === 'MethodDefinition'
            );
            const methodsToRemove = [];

            for (const m of methods) {
              const name = m.key?.name || m.key?.value || '';
              const isPrivate = name.startsWith('_') || name.startsWith('#');
              const isPatch =
                name.includes('__patch_') || name.includes('__broken_');

              if (codeLevel <= 3 && isPatch) {
                methodsToRemove.push({ node: m, stripCompletely: true });
              } else if (codeLevel <= 2 && isPrivate && !isPatch) {
                methodsToRemove.push({ node: m, stripBody: true });
              }
            }

            for (let i = methodsToRemove.length - 1; i >= 0; i--) {
              const {
                node: m,
                stripBody,
                stripCompletely,
              } = methodsToRemove[i];
              if (stripCompletely) {
                textContent =
                  textContent.slice(0, m.start) + textContent.slice(m.end);
              } else if (
                stripBody &&
                m.value &&
                m.value.body &&
                m.value.body.type === 'BlockStatement'
              ) {
                const start = m.value.body.start + 1;
                const end = m.value.body.end - 1;
                textContent =
                  textContent.slice(0, start) +
                  '\n    // body removed. do not guess.\n  ' +
                  textContent.slice(end);
              }
            }

            if (codeLevel === 2)
              suffix = ' (Private bodies and patches removed)';
            else if (codeLevel === 3) suffix = ' (Patches removed)';
          }
        } catch (e) {
          console.warn('[BuildPrompt] AST parsing failed during stripping', e);
        }
      }
    } else if (codeLevel > 0) {
      // Fallback for non-JS files: truncate by percentage
      const pct = codeLevel * 25;
      const lines = textContent.split('\n');
      textContent = lines
        .slice(0, Math.ceil(lines.length * (pct / 100)))
        .join('\n')
        .trim();
      suffix = ` (${pct}%)`;
    }

    return { textContent: textContent.trim(), suffix };
  }

  _formatPromptSignatures(codeContent, goldenPath, state) {
    let metadata = { imports: [], mainExport: null };
    try {
      metadata = this.app.codeParser.parseForMetadata(codeContent, goldenPath);
    } catch (e) {}

    const members = this.app.codeParser
      .getMemberDetails(codeContent)
      .filter((m) => m.isPublic)
      .map((m) => m.signature);

    let condensedView = '// --- IMPORTS ---\n';
    if (metadata.imports && metadata.imports.length > 0) {
      const importLines = metadata.imports.map((imp) => {
        const symbol =
          imp.kind === 'default' ? imp.local : `{ ${imp.imported} }`;
        return `import ${symbol} from '${imp.source}';`;
      });
      condensedView += importLines.join('\n');
    } else {
      condensedView += '// (No imports)';
    }

    condensedView += '\n\n// --- EXPORT ---\n';
    if (metadata.mainExport) {
      condensedView += `export class ${metadata.mainExport.name}`;
    } else {
      condensedView += '// (No main export found)';
    }

    condensedView += '\n\n// --- MEMBERS ---\n';
    if (members.length > 0) {
      condensedView += members.join('\n');
    } else {
      condensedView += '// (No public members found)';
    }

    let cleanBody = null;
    if (state.code) {
      cleanBody = this.app.codeParser.generateCleanBody(codeContent, metadata);
    }

    return { condensedView, cleanBody };
  }

  async _buildPromptString(options = {}) {
    const files = Array.isArray(options.files) ? options.files : [];
    const protocolContent = options.protocolContent || null;
    const dictationContent = options.dictationContent || null;
    let finalPrompt = '';

    if (dictationContent) {
      finalPrompt += String(dictationContent).trim() + '\n\n';
    }

    if (protocolContent) {
      finalPrompt += '// Protocol Definition\n```markdown\n';
      finalPrompt += String(protocolContent).trim();
      finalPrompt += '\n```\n\n';
    }

    if (
      this.ui.searchResults_includeCheckbox?.checked &&
      this.lastSearchResultsText
    ) {
      finalPrompt += '// --- Search Results ---\n';
      finalPrompt += this.lastSearchResultsText.trim() + '\n\n';
    }

    const selection = files.slice().sort((a, b) => {
      return String(a.path).localeCompare(String(b.path));
    });

    for (const item of selection) {
      const pathStr = item.path;
      const state = item.state || {};
      const goldenPath = this._promptNormalizePath(pathStr);
      if (!goldenPath) continue;

      const bundle = await this._promptReadFileBundle(goldenPath, state);
      const codeContent = bundle.code;
      const docContent = bundle.docs;

      finalPrompt += '// ' + goldenPath + '\n';

      if (state.code && typeof codeContent === 'string') {
        let cleanCode = codeContent;

        if (
          goldenPath.endsWith('.js') &&
          this.app.codeParser &&
          this.app.codeParser.acorn
        ) {
          try {
            const ast = this.app.codeParser.acorn.parse(codeContent, {
              ecmaVersion: 'latest',
              sourceType: 'module',
              ranges: true,
            });
            const removals = [];
            for (const node of ast.body) {
              let classNode = null;
              if (node.type === 'ClassDeclaration') classNode = node;
              else if (node.declaration?.type === 'ClassDeclaration')
                classNode = node.declaration;

            }
            if (removals.length > 0) {
              removals.sort((a, b) => b.start - a.start);
              for (const r of removals) {
                cleanCode =
                  cleanCode.slice(0, r.start) + cleanCode.slice(r.end);
              }
              cleanCode = cleanCode.replace(/\n\s*\n\s*\n/g, '\n\n');
            }
          } catch (e) {
            console.warn('[BuildPrompt] AST stripping failed', e);
          }
        }

        finalPrompt += '// Code\n```javascript\n';
        finalPrompt += cleanCode.trim();
        finalPrompt += '\n```\n\n';
      } else if (state.signatures && typeof codeContent === 'string') {
        finalPrompt += '// Signatures\n```javascript\n';
        finalPrompt += this._promptFormatSignaturesCompat({
          path: goldenPath,
          code: codeContent,
          docs: docContent,
          state,
        });
        finalPrompt += '\n```\n\n';
      }

      if (
        state.docsLevel > 0 &&
        typeof docContent === 'string' &&
        docContent.trim()
      ) {
        finalPrompt += '// Documentation\n```markdown\n';
        finalPrompt += docContent.trim();
        finalPrompt += '\n```\n\n';
      }
    }
    return finalPrompt;
  }

  updateCopyButtonState() {
      if (!this.superDictateWidget) return;

      const widgetRoot = this.superDictateWidget.getElement();
      const originalCopyBtn = widgetRoot.querySelector('.dictation-copy-btn');
      if (!originalCopyBtn) return;

      const toolbar = originalCopyBtn.parentElement;

      if (!this.ui.dictationSplitButton) {
        originalCopyBtn.style.display = 'none';

        this.ui.dictationSplitButton = new SplitButton({
          label: 'Copy',
          tooltip: 'Copy dictation text',
          mainAction: (e) => {
            this._handleProxyCopy(e, false);
          },
          dropdownItems: [
            {
              label: 'Copy + Protocol Tips',
              onClick: (e) => this._handleProxyCopy(e, true),
            },
          ],
        });

        const el = this.ui.dictationSplitButton.element;
        toolbar.insertBefore(el, originalCopyBtn.nextSibling);

        if (this.app.guidanceManager) {
          this.app.guidanceManager.register(
            'dictationCopy',
            this.ui.dictationSplitButton.mainBtn
          );
        }
      }
    }

  updateGuidance() {}

  hideGlows() {}

  _reportStateToGuidance() {
    // Intentionally stripped of GuidanceManager references.
  }

  handleMagicSend() {
    const text = this.generatedPrompt || '';
    if (!text) {
      this.app.uiManager.setStatus('Nothing to send.', true);
      return;
    }

    if (this.app.clipboardSink) {
      this.app.clipboardSink.receive(text);
      this.app.uiManager.setStatus('Sent to Gemini!');
      this.app.guidanceManager.updateState('lastPasteTime', Date.now());
    }
  }

  _handleProxyCopy(e, injectTips) {
      const text = this.superDictateWidget.getText();
      if (!text) {
        this.app.uiManager.setStatus('No text to copy.', true);
        return;
      }

      navigator.clipboard.writeText(text).then(() => {
        this.app.uiManager.setStatus('Copied to clipboard.');
        if (this.ui.dictationSplitButton) {
          const btn = this.ui.dictationSplitButton.mainBtn;
          const oldText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = oldText), 1500);
        }
        this.superDictateWidget.markAsUsed();
      });
    }

  _ensureMultiTreePromptBundleButton() {
    const root = this.element || this.container || this.rootElement || null;

    if (!root || !root.querySelector || !root.appendChild) {
      return false;
    }

    if (root.querySelector('[data-multi-tree-prompt-bundle-button]')) {
      return true;
    }

    this._installPromptBundleButtonStyles();

    const host = this._findPromptBundleButtonHost(root);
    if (!host) return false;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '📦 Copy Bundle';
    button.title =
      'Copy Build Prompt + Prompt Output + selected files across all open trees.';
    button.dataset.multiTreePromptBundleButton = 'true';
    button.className = 'multi-tree-prompt-bundle-button';

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await this._copyMultiTreePromptBundle(button);
    });

    host.appendChild(button);
    return true;
  }

  async _copyMultiTreePromptBundle(button = null) {
    const originalText = button ? button.textContent : '';
    try {
      if (button) {
        button.disabled = true;
        button.textContent = 'Copying…';
      }
      const widgetStates = this._collectWidgetStates();
      const filesForContext = [];
      for (const entry of Object.entries(widgetStates)) {
        const path = entry[0];
        const state = entry[1];
        if (state.code || state.signatures || state.docsLevel > 0) {
          filesForContext.push({ path, state });
        }
      }
      let userPromptContent = null;
      if (
        this.ui.userInstructions_includeCheckbox?.checked &&
        this.dictationContent
      ) {
        userPromptContent = this.dictationContent;
      }
      let protocolContent = null;
      if (this.ui.protocol_includeCheckbox?.checked) {
        if (this.ui.protocolEditor) {
          protocolContent = this.ui.protocolEditor.state.doc.toString();
        } else {
          protocolContent = await this._promptReadProtocolContent();
        }
      }
      let finalPrompt = await this._buildPromptString({
        files: filesForContext,
        protocolContent,
        dictationContent: userPromptContent,
      });
      await navigator.clipboard.writeText(finalPrompt.trim());
      if (button) {
        button.textContent = 'Copied!';
      }
      return finalPrompt;
    } catch (error) {
      console.error(error);
      if (button) {
        button.textContent = 'Copy failed';
      }
      throw error;
    } finally {
      if (button) {
        setTimeout(() => {
          button.disabled = false;
          button.textContent = originalText || 'Copy Prompt Bundle';
        }, 1200);
      }
    }
  }

  _findPromptBundleButtonHost(root) {
    const candidates = [
      root.querySelector?.('.toolbar'),
      root.querySelector?.('.build-prompt-toolbar'),
      root.querySelector?.('.controls'),
      root.querySelector?.('header'),
      root.firstElementChild,
      root,
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (candidate && candidate.appendChild) {
        return candidate;
      }
    }

    return root;
  }

  _installPromptBundleButtonStyles() {
    const id = 'multi-tree-prompt-bundle-button-styles';
    let style = document.getElementById(id);

    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }

    style.textContent = `
      .multi-tree-prompt-bundle-button {
        margin-left: 6px;
        padding: 5px 9px;
        border-radius: 8px;
        border: 1px solid rgba(150, 190, 255, 0.32);
        background: rgba(120, 170, 255, 0.13);
        color: #dce9ff;
        font: 11px system-ui, sans-serif;
        font-weight: 750;
        cursor: pointer;
        white-space: nowrap;
      }

      .multi-tree-prompt-bundle-button:hover {
        background: rgba(120, 170, 255, 0.22);
        box-shadow: 0 0 16px rgba(120, 170, 255, 0.18);
      }

      .multi-tree-prompt-bundle-button:disabled {
        opacity: 0.58;
        cursor: wait;
      }
    `;

    return true;
  }

  ensureVisibilityToolsBridge(options = {}) {
    if (
      this.visibilityToolsBridge &&
      this.visibilityToolsBridge.root &&
      this.visibilityToolsBridge.root.isConnected
    ) {
      this._setVisibilityToolsBridgeStatus('Ready.');
      return this.visibilityToolsBridge;
    }

    const bridge = this._createVisibilityToolsBridgeElement(options);
    const host = this._findVisibilityToolsBridgeHost();

    if (!host) {
      return null;
    }

    if (host.firstChild) {
      host.insertBefore(bridge.root, host.firstChild);
    } else {
      host.appendChild(bridge.root);
    }

    this.visibilityToolsBridge = bridge;
    this._setVisibilityToolsBridgeStatus('Ready.');

    return bridge;
  }

  _createVisibilityToolsBridgeElement(options = {}) {
    const root = document.createElement('div');
    root.className = 'build-prompt-visibility-tools-bridge';
    root.style.display = 'flex';
    root.style.alignItems = 'center';
    root.style.gap = '8px';
    root.style.padding = '8px 10px';
    root.style.margin = '0 0 10px 0';
    root.style.border = '1px solid rgba(130,170,255,0.36)';
    root.style.borderRadius = '12px';
    root.style.background = 'rgba(18,24,42,0.72)';
    root.style.boxShadow = '0 0 16px rgba(80,130,255,0.14)';
    root.style.color = '#eef3ff';
    root.style.fontSize = '12px';

    const label = document.createElement('div');
    label.textContent = 'Visibility sets are tree-scoped now.';
    label.style.flex = '1 1 auto';
    label.style.opacity = '0.9';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Open Visibility Tools';
    button.title = 'Open tree-scoped visibility set tools';
    button.style.border = '1px solid rgba(140,170,255,0.5)';
    button.style.borderRadius = '8px';
    button.style.background =
      'linear-gradient(135deg, rgba(80,110,210,0.75), rgba(110,70,190,0.72))';
    button.style.color = 'white';
    button.style.padding = '5px 10px';
    button.style.cursor = 'pointer';
    button.style.whiteSpace = 'nowrap';
    button.style.fontSize = '12px';

    const status = document.createElement('span');
    status.className = 'build-prompt-visibility-tools-bridge-status';
    status.textContent = '';
    status.style.opacity = '0.72';
    status.style.minWidth = '60px';
    status.style.whiteSpace = 'nowrap';

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._openVisibilityToolsBridge();
    });

    root.appendChild(label);
    root.appendChild(button);
    root.appendChild(status);

    return {
      root,
      label,
      button,
      status,
      options,
    };
  }

  _findVisibilityToolsBridgeHost() {
    const candidates = [
      this.element,
      this.rootElement,
      this.container,
      this.containerElement,
      this.panel,
      typeof this.getElement === 'function' ? this.getElement() : null,
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.appendChild) {
        return candidate;
      }
    }

    return null;
  }

  _openVisibilityToolsBridge() {
    const manager = this._getVisibilityToolsProjectFilesManager();

    if (
      !manager ||
      typeof manager.showVisibilitySetToolbarTools !== 'function'
    ) {
      this._setVisibilityToolsBridgeStatus('No tools');
      return null;
    }

    const dialog = manager.showVisibilitySetToolbarTools({
      reason: 'BuildPromptTab visibility tools bridge',
    });

    this._setVisibilityToolsBridgeStatus(dialog ? 'Opened' : 'Failed');

    return dialog;
  }

  _getVisibilityToolsProjectFilesManager() {
    if (this.app && this.app.projectFilesManager) {
      return this.app.projectFilesManager;
    }

    if (
      this.options &&
      this.options.app &&
      this.options.app.projectFilesManager
    ) {
      return this.options.app.projectFilesManager;
    }

    if (typeof app !== 'undefined' && app && app.projectFilesManager) {
      return app.projectFilesManager;
    }

    if (
      typeof vibesApp !== 'undefined' &&
      vibesApp &&
      vibesApp.projectFilesManager
    ) {
      return vibesApp.projectFilesManager;
    }

    if (typeof projectFilesManager !== 'undefined') {
      return projectFilesManager;
    }

    if (typeof pfm !== 'undefined') {
      return pfm;
    }

    return null;
  }

  _setVisibilityToolsBridgeStatus(message) {
    const bridge = this.visibilityToolsBridge;

    if (!bridge || !bridge.status) {
      return;
    }

    bridge.status.textContent = String(message || '');
  }

  _wireTreeScopedPromptBuilder() {
    if (this._treeScopedPromptBuilderWired) {
      this._refreshTreeIncludeControls?.();
      return true;
    }

    this._treeScopedPromptBuilderWired = true;

    if (typeof this._generatePromptTreeScoped === 'function') {
      this._generatePrompt = this._generatePromptTreeScoped.bind(this);
    }

    this._widgetStateChangeCallback = this._checkDirtyState.bind(this);

    const trees = this._collectFileTreeViewsForPrompt();
    for (const entry of trees) {
      if (entry.tree?.options) {
        entry.tree.options.onVisibilityChange = this._widgetStateChangeCallback;
      }
    }

    this._removeLegacySourceVisibilityControls();
    this._ensureTreeIncludeControls();
    this._refreshTreeIncludeControls();
    this._checkDirtyState();

    return true;
  }

  _removeLegacySourceVisibilityControls() {
    const root = this.element;
    if (!root || !root.querySelectorAll) return false;

    const source = root.querySelector('.source-files-content');
    if (!source) return false;

    const allPanels = Array.from(
      source.querySelectorAll('.tree-include-controls')
    );
    for (let i = 1; i < allPanels.length; i++) {
      allPanels[i].remove();
    }

    const legacyControls = source.querySelector('.prompt-controls');
    if (legacyControls) {
      legacyControls.style.display = 'none';
      legacyControls.dataset.replacedByTreeScopedIncludes = 'true';
    }

    const legacyBulk = source.querySelector('.bulk-actions');
    if (legacyBulk) {
      legacyBulk.style.display = 'none';
      legacyBulk.dataset.replacedByTreeScopedIncludes = 'true';
    }

    const staleBridge = source.querySelector(
      '.build-prompt-visibility-tools-bridge'
    );
    if (staleBridge) {
      staleBridge.remove();
    }

    return true;
  }

  _ensureTreeIncludeControls() {
    const root = this.element;
    if (!root || !root.querySelector) return null;

    const source = root.querySelector('.source-files-content');
    if (!source) return null;

    // STRICTLY DESTROY ALL EXISTING PANELS to prevent duplicates
    const existingPanels = Array.from(
      source.querySelectorAll('.tree-include-controls')
    );
    for (const p of existingPanels) p.remove();

    const panel = document.createElement('div');
    panel.className = 'tree-include-controls';
    panel.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'gap:8px',
      'padding:10px 12px',
      'border:1px solid rgba(90,150,210,0.28)',
      'border-radius:10px',
      'background:rgba(14,22,34,0.64)',
      'box-shadow:0 0 14px rgba(60,140,210,0.10)',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = 'Prompt source trees';
    title.style.cssText = [
      'font-size:12px',
      'font-weight:800',
      'letter-spacing:0.3px',
      'text-transform:uppercase',
      'color:#cfe7ff',
    ].join(';');

    const help = document.createElement('div');
    help.textContent =
      'Choose which open file trees contribute their current visibility-widget selections to the generated prompt.';
    help.style.cssText = [
      'font-size:12px',
      'line-height:1.35',
      'color:rgba(220,235,255,0.72)',
    ].join(';');

    const list = document.createElement('div');
    list.className = 'tree-include-list';
    list.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'gap:6px',
    ].join(';');

    panel.append(title, help, list);

    const summary = this.ui.treeSummary;
    if (summary && summary.parentElement === source) {
      source.insertBefore(panel, summary);
    } else {
      source.appendChild(panel);
    }

    this.ui.treeIncludeControls = panel;
    this.ui.treeIncludeList = list;

    return panel;
  }

  _refreshTreeIncludeControls() {
    this._ensureTreeIncludeControls();

    const list = this.ui.treeIncludeList;
    if (!list) return false;

    list.innerHTML = '';

    const entries = this._collectFileTreeViewsForPrompt();

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No file trees found yet.';
      empty.style.cssText = 'font-size:12px;color:rgba(230,230,230,0.65);';
      list.appendChild(empty);
      return false;
    }

    for (const entry of entries) {
      const row = document.createElement('label');
      row.className = 'tree-include-row';
      row.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:8px',
        'padding:7px 8px',
        'border-radius:8px',
        'background:rgba(255,255,255,0.035)',
        'cursor:pointer',
      ].join(';');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this._isTreeIncludedForPrompt(entry);
      checkbox.dataset.treeIncludeId = entry.id;

      checkbox.addEventListener('change', () => {
        localStorage.setItem(
          this._treeIncludeStorageKey(entry),
          checkbox.checked ? 'true' : 'false'
        );
        this._checkDirtyState();
      });

      const label = document.createElement('span');
      label.textContent = entry.label;
      label.style.cssText = [
        'font-size:13px',
        'font-weight:650',
        'color:#eef6ff',
        'min-width:0',
        'overflow:hidden',
        'text-overflow:ellipsis',
        'white-space:nowrap',
        'flex:1 1 auto',
      ].join(';');

      const count = document.createElement('span');
      count.textContent = entry.widgetCount + ' widgets';
      count.style.cssText = [
        'font-size:11px',
        'color:rgba(220,235,255,0.58)',
        'white-space:nowrap',
      ].join(';');

      row.append(checkbox, label, count);
      list.appendChild(row);
    }

    return true;
  }

  _collectFileTreeViewsForPrompt() {
    const roots = [];
    if (this.app?.projectFilesManager) roots.push(this.app.projectFilesManager);
    if (this.app) roots.push(this.app);

    const seenObjects = new WeakSet();
    const found = [];

    const isTree = (value) => {
      return !!(
        value &&
        typeof value === 'object' &&
        value.nodesMap instanceof Map &&
        typeof value.getAllVisibilityWidgets === 'function'
      );
    };

    const visit = (value, depth) => {
      if (!value || typeof value !== 'object') return;
      if (seenObjects.has(value)) return;
      seenObjects.add(value);

      if (isTree(value)) {
        found.push(value);
        return;
      }

      if (depth <= 0) return;

      if (value instanceof HTMLElement) return;
      if (value instanceof Window) return;
      if (value instanceof Document) return;

      if (value instanceof Map) {
        for (const item of value.values()) visit(item, depth - 1);
        return;
      }

      if (Array.isArray(value)) {
        for (const item of value) visit(item, depth - 1);
        return;
      }

      const keys = Object.keys(value).filter((key) => {
        return (
          key.toLowerCase().includes('tree') ||
          key.toLowerCase().includes('file') ||
          key.toLowerCase().includes('view') ||
          key.toLowerCase().includes('store') ||
          key.toLowerCase().includes('manager')
        );
      });

      for (const key of keys) {
        try {
          visit(value[key], depth - 1);
        } catch (error) {}
      }
    };

    for (const root of roots) visit(root, 5);

    const unique = [];
    const seenTrees = new Set();

    for (const tree of found) {
      if (seenTrees.has(tree)) continue;
      seenTrees.add(tree);
      unique.push(tree);
    }

    return unique.map((tree, index) => {
      const rootId =
        tree.rootId ||
        tree.storeRootId ||
        tree.rootPath ||
        tree.rootNodes?.[0]?.id ||
        'tree-' + (index + 1);

      const baseId = String(rootId);
      const id = baseId + '::' + index;
      const widgets = tree.getAllVisibilityWidgets?.() || [];

      return {
        id,
        baseId,
        index,
        tree,
        label: this._labelForPromptTree(tree, baseId, index),
        widgetCount: widgets.length,
      };
    });
  }

  _labelForPromptTree(tree, baseId, index) {
      const explicit =
        tree.displayName ||
        tree.name ||
        tree.title ||
        tree.storeName ||
        tree.options?.displayName ||
        tree.options?.title;

      if (explicit) return String(explicit);

      if (baseId && baseId !== 'tree-' + (index + 1)) {
        return baseId;
      }

      return 'File tree ' + (index + 1);
    }

  _treeIncludeStorageKey(entry) {
    return 'bp_include_tree_' + entry.id;
  }

  _isTreeIncludedForPrompt(entry) {
    const stored = localStorage.getItem(this._treeIncludeStorageKey(entry));
    return stored !== 'false';
  }

  async _promptReadProtocolContent() {
    const candidates = [
      '/vibes/docs/VibesProtocolCapsule.js',
      '/vibes/protocol.md',
      '/protocol/skills/unified-protocol.md',
      '/vibes/protocol/skills/unified-protocol.md',
    ];
    for (const path of candidates) {
      let content = await this._promptReadText(path);
      if (typeof content === 'string' && content.trim()) {
        if (path.endsWith('Capsule.js')) {
          content = content.replace(/^\s*export\s+(default\s+)?/gm, '');
          try {
            const match = content.match(/class\s+([A-Za-z_$][\w$]*)/);
            if (match) {
              const tempClass = new Function(
                content + '\nreturn ' + match[1] + ';'
              )();
              if (tempClass) {
                if (typeof tempClass.getMarkdown === 'function') {
                  return tempClass.getMarkdown();
                } else if (typeof tempClass._doc === 'function') {
                  const res = tempClass._doc();
                  if (typeof res === 'string') return res;
                  if (Array.isArray(res)) return res.join('\n');
                }
                const docParts = [];
                for (const key of Object.getOwnPropertyNames(tempClass)) {
                  if (
                    key.startsWith('_doc') &&
                    typeof tempClass[key] === 'function'
                  ) {
                    const res = tempClass[key]();
                    if (typeof res === 'string') docParts.push(res);
                    else if (Array.isArray(res)) docParts.push(res.join('\n'));
                  }
                }
                if (docParts.length > 0) return docParts.join('\n\n');
              }
            }
          } catch (e) {
            console.warn('Could not extract docs from protocol capsule', e);
          }
        }
        return content;
      }
    }
    if (
      this.app?.projectFilesManager &&
      typeof this.app.projectFilesManager.getProtocolDefinition === 'function'
    ) {
      const def = await this.app.projectFilesManager.getProtocolDefinition();
      if (typeof def === 'string' && def.trim()) {
        return def;
      }
    }
    return null;
  }
  async _promptReadFileBundle(goldenPath, state = {}) {
    const wantsCode = !!(state.code || state.signatures);
    const wantsDocs = !!(state.docsLevel > 0);
    const result = { code: null, docs: null };
    if (wantsCode) {
      result.code = await this._promptReadText(goldenPath);
    }
    if (wantsDocs) {
      const docPath = this._promptDocPathFor(goldenPath);
      result.docs = await this._promptReadText(docPath);
    }
    return result;
  }

  async _promptReadText(path) {
    const goldenPath = this._promptNormalizePath(path);
    if (!goldenPath) {
      return null;
    }
    const vfs = await this._promptGetVfs();
    if (vfs && typeof vfs.readFile === 'function') {
      try {
        const content = await vfs.readFile(goldenPath, { nullOnMissing: true });
        if (typeof content === 'string') {
          return content;
        }
      } catch (error) {
        this._promptLogReadFallback('vfs.readFile', goldenPath, error);
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
          return content;
        }
        if (content && typeof content === 'object') {
          if (typeof content.code === 'string') {
            return content.code;
          }
          if (typeof content.docs === 'string') {
            return content.docs;
          }
        }
      } catch (error) {
        this._promptLogReadFallback(
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
          return content;
        }
      } catch (error) {
        this._promptLogReadFallback(
          'projectFilesManager.getFileContent',
          goldenPath,
          error
        );
      }
    }
    return null;
  }

  async _promptGetVfs() {
    if (!this.app) {
      return null;
    }
    if (typeof this.app.refreshVirtualFileSystemStores === 'function') {
      return await this.app.refreshVirtualFileSystemStores();
    }
    return this.app.vfs || null;
  }

  _promptNormalizePath(path) {
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

  _promptDocPathFor(goldenPath) {
    if (
      this.app?.documentationManager &&
      typeof this.app.documentationManager.getDocPath === 'function'
    ) {
      return this.app.documentationManager.getDocPath(goldenPath);
    }
    if (goldenPath.endsWith('.js')) {
      return goldenPath.slice(0, -3) + '_js.md';
    }
    return goldenPath + '.md';
  }

  _promptLogReadFallback(operation, path, error) {
    const message = error && error.message ? error.message : String(error);
    if (this.app && typeof this.app.logFileOp === 'function') {
      this.app.logFileOp('debug', 'BuildPromptTab VFS read fallback', {
        operation,
        path,
        error: message,
      });
      return;
    }
    if (this.app?.fileLogger && typeof this.app.fileLogger.log === 'function') {
      this.app.fileLogger.log('debug', 'BuildPromptTab VFS read fallback', {
        operation,
        path,
        error: message,
      });
    }
  }

  _promptFormatSignaturesCompat(bundle) {
    if (!bundle || typeof bundle.code !== 'string') {
      return '';
    }
    if (typeof this._formatPromptSignatures !== 'function') {
      return bundle.code;
    }
    const attempts = [
      () => this._formatPromptSignatures(bundle),
      () => this._formatPromptSignatures(bundle.code, bundle.path),
      () =>
        this._formatPromptSignatures({
          source: bundle.code,
          path: bundle.path,
          code: bundle.code,
          docs: bundle.docs,
        }),
      () => this._promptNaiveSignatures(bundle.code),
    ];
    let lastError = null;
    for (const attempt of attempts) {
      try {
        const result = attempt();
        if (typeof result === 'string') {
          return result;
        }
        if (result && typeof result.code === 'string') {
          return result.code;
        }
        if (result && typeof result.text === 'string') {
          return result.text;
        }
      } catch (error) {
        lastError = error;
      }
    }
    this._promptLogReadFallback(
      '_formatPromptSignatures',
      bundle.path || '',
      lastError || new Error('No formatter attempt returned a string.')
    );
    return this._promptNaiveSignatures(bundle.code);
  }

  _promptNaiveSignatures(code) {
    const lines = String(code || '').split('\n');
    const output = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('class ') ||
        trimmed.startsWith('static ') ||
        trimmed.startsWith('async ') ||
        this._promptLooksLikeMethodSignature(trimmed)
      ) {
        output.push(line);
      }
    }
    return output.join('\n');
  }

  _promptLooksLikeMethodSignature(trimmed) {
    if (!trimmed) {
      return false;
    }
    if (trimmed.includes('=>')) {
      return false;
    }
    const openParen = trimmed.indexOf('(');
    const closeParen = trimmed.indexOf(')');
    if (openParen <= 0 || closeParen <= openParen) {
      return false;
    }
    if (!trimmed.endsWith('{')) {
      return false;
    }
    const prefix = trimmed.slice(0, openParen).trim();
    if (!prefix) {
      return false;
    }
    const banned = ['if', 'for', 'while', 'switch', 'catch', 'function'];
    return !banned.includes(prefix);
  }

  

  static _doc() {
    return [
      this._doc_overview(),
      this._doc_widget_integration(),
      this._doc_multi_tree(),
    ].join('\n\n---\n\n');
  }

  static _doc_overview() {
    return `# BuildPromptTab\n\nThe \`BuildPromptTab\` is the central nervous system for LLM communication in Vibes. It aggregates selected files from the workspace, compiles them into a formatted Markdown prompt, and prepares the payload for the AI agent.`;
  }

  static _doc_widget_integration() {
    return `## Widget Integration\n\nThis tab constantly listens to the \`UIVisibilityManager\` and scans all active \`VisibilityWidget\` instances across the UI. Based on what is toggled (Code, Signatures, Docs, and their respective slider levels), it selectively strips down the AST or truncates lines to fit the context window perfectly while maximizing relevance.`;
  }

  static _doc_multi_tree() {
    return `## Multi-Tree Support\n\nTo support floating windows and external directory mounts, \`BuildPromptTab\` does not just look at the main project tree. It traverses a registry of all open \`FileTreeView\` instances, collecting checked files seamlessly across multiple repositories or libraries into a single unified prompt.`;
  }

  setSearchResults(text) {
    this.lastSearchResultsText = text || '';
    const numLines = this.lastSearchResultsText.split('\n').length;

    if (this.ui.searchResultsEditorHost) {
      this.ui.searchResultsEditorHost.innerHTML = '';

      const header = document.createElement('div');
      header.style.marginBottom = '10px';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';

      const title = document.createElement('span');
      title.style.fontWeight = 'bold';
      title.style.color = 'var(--text-primary)';
      title.textContent = `Results: ${numLines} lines`;

      const trimBtn = document.createElement('button');
      trimBtn.className = 'select-tools-btn';
      trimBtn.textContent = 'Trim Results...';
      trimBtn.onclick = () => this._showTrimDialog(numLines);

      header.append(title, trimBtn);

      const pre = document.createElement('pre');
      pre.style.maxHeight = '250px';
      pre.style.overflow = 'auto';
      pre.style.margin = '0';
      pre.style.padding = '10px';
      pre.style.background = 'rgba(0,0,0,0.2)';
      pre.style.border = '1px solid var(--border-color)';
      pre.style.borderRadius = '4px';
      pre.style.color = 'var(--text-secondary)';
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordBreak = 'break-word';
      pre.textContent = this.lastSearchResultsText;

      this.ui.searchResultsEditorHost.append(header, pre);
    }

    if (text && text.trim()) {
      if (this.ui.searchResults_includeCheckbox) {
        this.ui.searchResults_includeCheckbox.checked = true;
      }
      const container = this.element.querySelector('#bp-section-searchResults');
      if (container && !container.classList.contains('is-open')) {
        this._toggleSection('searchResults');
      }
    }
  }

  _showTrimDialog(currentLines) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = Math.min(1000, currentLines);
    input.style.width = '100px';
    input.style.padding = '5px';

    const content = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = `Currently ${currentLines} lines. Trim to:`;
    content.append(p, input);

    const uiToolsObj =
      typeof UITools !== 'undefined'
        ? UITools
        : window.projectApp?.uiManager?.uiTools || window.UITools;

    if (uiToolsObj) {
      uiToolsObj.makeDialog({
        title: 'Trim Search Results',
        content,
        buttons: [
          { label: 'Cancel' },
          {
            label: 'Trim',
            className: 'danger',
            onClick: (e, dialog) => {
              const limit = parseInt(input.value, 10);
              if (limit > 0 && this.lastSearchResultsText) {
                const lines = this.lastSearchResultsText.split('\n');
                if (lines.length > limit) {
                  this.lastSearchResultsText =
                    lines.slice(0, limit).join('\n') +
                    `\n\n... (trimmed ${lines.length - limit} lines)`;
                  this.setSearchResults(this.lastSearchResultsText);
                }
              }
              dialog.close();
            },
          },
        ],
      });
    }
  }

}