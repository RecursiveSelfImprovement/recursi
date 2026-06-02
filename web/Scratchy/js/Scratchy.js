
class Scratchy {
  constructor() {
    this.zipEntries = null;
    this.projectData = null;
    this.selectedFile = null;
    this.fileBlobs = {};
    this.contentArea = null;
    this.statusDiv = null;
    this.activeTab = 'files';
    this.instructionsEditor = null;
    this.sendInstructions = true;
    this.isLessScratchy = false;
    this.loadedFileName = null;
    this.hasReceivedPatch = false;
    this.currentViewer = null;
    this.currentViewerBuffer = null;
    this.styles = new ScratchyStyles();
    this.editorManager = new ScratchyEditorManager(this);
    this.dropHandler = new ScratchyDropHandler(this);
    this.fileList = new ScratchyFileList(this);
    this.llmBridge = new ScratchyLLMBridge(this);
    this.exporter = new ScratchyExporter(this);
    this.intro = new ScratchyIntro(this);
    this.callouts = new ScratchyCallouts(this);
    this.settings = new ScratchySettings(this);
    this.instructions = new ScratchyInstructions(this);
    this.viewerLauncher = new ScratchyViewerLauncher(this);
    this.instructionsText = 'Loading instructions...';
    this.liveSettings = this.settings.getDefaultLiveSettings();
    this.buttonCallouts = this.callouts.getDefaultCalloutConfig();
    this._secretBuffer = '';
  }

  init(env) {
      this.targetElement = env.container;
      this.styles.injectAll();
      this.templateSelector = new ScratchyTemplateSelector(this);

      this.statusDiv = makeElement(
        'div',
        { className: 'scratchy-status' },
        'Drop an .sb3 file to begin'
      );

      this.contentArea = makeElement('div', { className: 'scratchy-content' });

      const mainLayout = makeElement('div', { className: 'scratchy-main' }, [
        this.contentArea,
      ]);

      this.includeInstructionsCheckbox = makeElement('input', {
        type: 'checkbox',
        checked: true,
        id: 'scratchy-include-instructions',
      });

      this.dropHandler.createFileInput();
      this.dropHandler.createDropZone();

      this.buttonCallouts = this.callouts.getDefaultCalloutConfig();

      const openCol = this._makeButtonCol(
        'open',
        [
          makeElement('span', {}, '📂 Open File'),
          makeElement(
            'div',
            {
              style:
                'font-size:13px; opacity:0.9; margin-top:2px; font-weight:600;',
            },
            '(.sb3, png, wav, etc)'
          ),
        ],
        () => this.fileInput.click()
      );

      const buildPromptCol = this._makeButtonCol(
        'buildprompt',
        '🎙️ Build Prompt',
        () => this.llmBridge.openPromptBuilderDialog()
      );
      const pasteCol = this._makeButtonCol('paste', '📋 Paste from LLM', () =>
        this.llmBridge.handlePasteFromLLM()
      );
      const saveCol = this._makeButtonCol('save', '💾 Save .sb3', () =>
        this.exporter.exportSb3()
      );
      const viewerCol = this._makeButtonCol('viewer', '📺 Viewer', () =>
        this.viewerLauncher.openViewer()
      );

      this.buttonElements = {};
      this.buttonElements.open = openCol.querySelector('.scratchy-action-btn');
      this.buttonElements.buildprompt = buildPromptCol.querySelector(
        '.scratchy-action-btn'
      );
      this.buttonElements.paste = pasteCol.querySelector('.scratchy-action-btn');
      this.buttonElements.save = saveCol.querySelector('.scratchy-action-btn');
      this.buttonElements.viewer = viewerCol.querySelector(
        '.scratchy-action-btn'
      );

      const tabBar = makeElement('div', { className: 'scratchy-tabs' }, [
        this.instructions.makeTab('files', 'Project Files'),
        this.instructions.makeTab('instructions', 'Edit System Prompt'),
      ]);

      this.logoImg = makeElement('img', {
        className: 'scratchy-logo-img',
        src: 'https://recursi.dev/SiteResources/scratchy/logo.png',
        alt: 'Scratchy',
      });

      this.logoSubtitle = makeElement('div', {
        className: 'scratchy-logo-subtitle',
        textContent: 'vibecoding helper for Scratch',
      });

      this.settingsBtn = makeElement('button', {
        className: 'scratchy-settings-gear',
        title: 'Layout Settings',
        onclick: () => this.settings.openSettingsPanel(),
        textContent: '⚙️',
      });

      this.mascotImg = makeElement('img', {
        className: 'scratchy-mascot-img',
        src: 'https://recursi.dev/SiteResources/scratchy/mascot.png',
        alt: 'Scratchy the dog',
        onclick: () => this.openStoryDialog(),
      });

      this.mascotLink = makeElement(
        'button',
        {
          className: 'scratchy-mascot-link',
          onclick: (e) => {
            e.stopPropagation();
            this.openStoryDialog()
          }
        },
        [
          makeElement('span', { className: 'line1' }, 'about me,'),
          makeElement('span', { className: 'line2' }, 'Scratchy'),
        ]
      );

      this.mascotContainer = makeElement(
        'div',
        { className: 'scratchy-mascot-container' },
        [
          this.mascotImg,
          makeElement('div', { className: 'scratchy-mascot-link-wrapper' }, [
            this.mascotLink,
          ]),
        ]
      );

      this.lessScratchyCheckbox = makeElement('input', {
        type: 'checkbox',
        id: 'scratchy-less-scratchy',
        onchange: () => this.toggleLessScratchy(),
      });

      this.lessScratchyLabel = makeElement(
        'label',
        {
          className: 'scratchy-less-scratchy-label',
          htmlFor: 'scratchy-less-scratchy',
          style: { marginRight: '60px' },
        },
        [this.lessScratchyCheckbox, ' less scratchy']
      );

      const themeOptions = [
        'default',
        'dark',
        'garish',
        'cool',
        'warm',
        'boring',
        'weird',
      ];
      const themeSelect = makeElement('select', {
        className: 'scratchy-theme-select',
        onchange: (e) => {
          this.liveSettings.theme = e.target.value;
          this.settings.applyLiveSettings();
        },
      });
      themeOptions.forEach((t) => {
        const opt = makeElement(
          'option',
          { value: t },
          t.charAt(0).toUpperCase() + t.slice(1)
        );
        if (t === this.liveSettings.theme) opt.selected = true;
        themeSelect.appendChild(opt);
      });

      this.themeWidget = makeElement(
        'div',
        { className: 'scratchy-theme-widget' },
        [makeElement('span', {}, '🎨 Theme: '), themeSelect]
      );

      const introLayer = this.intro.createIntroElements();
      const calloutOverlay = this.callouts.createOverlay();

      const headerBar = makeElement('div', { className: 'scratchy-header-bar' }, [
        this.settingsBtn,
        makeElement('div', { className: 'scratchy-header-left' }, [
          this.logoImg,
          this.logoSubtitle,
        ]),
        makeElement('div', { className: 'scratchy-header-center' }, [
          makeElement('div', { className: 'scratchy-buttons-row' }, [
            openCol,
            buildPromptCol,
            pasteCol,
            saveCol,
            viewerCol,
          ]),
          makeElement('div', { className: 'scratchy-header-bottom-row' }, [
            tabBar,
            this.statusDiv,
            this.lessScratchyLabel,
          ]),
        ]),
        makeElement('div', { className: 'scratchy-header-right' }, [
          this.mascotContainer,
        ]),
      ]);

      this.instructionsArea = makeElement('div', {
        className: 'scratchy-instructions-area',
      });
      this.instructionsArea.style.display = 'none';

      this.appRoot = makeElement('div', { className: 'scratchy-app' }, [
        headerBar,
        mainLayout,
        this.instructionsArea,
        introLayer,
        calloutOverlay,
        this.themeWidget,
        this.fileInput,
      ]);

      this.targetElement.appendChild(this.appRoot);

      this.dropHandler.setupDropHandlers();
      this.instructions.buildInstructionsTab();

      this.settings.applyLiveSettings();

      this._setupSecretEasterEggTrigger();

      requestAnimationFrame(() => {
        setTimeout(() => this.intro.playIntroAnimation(), 50);
        this._handleAutoLoad();
      });

      this.llmBridge
        .getDefaultInstructions()
        .then((text) => {
          this.instructionsText = text;
          if (this.instructionsEditor) {
            this.instructionsEditor.setText(text);
          }
        })
        .catch((err) => console.error('Failed to load instructions:', err));

      setTimeout(() => {
        this.llmBridge.startEasterEgg();
      }, 15000);
    }

  _setupSecretEasterEggTrigger() {
    const secret = 'hatchy';
    document.addEventListener('keydown', (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      )
        return;
      this._secretBuffer += e.key.toLowerCase();
      if (this._secretBuffer.length > 20) {
        this._secretBuffer = this._secretBuffer.slice(-20);
      }
      if (this._secretBuffer.endsWith(secret)) {
        this._secretBuffer = '';
        this.llmBridge.showHatchyDialog();
      }
    });
  }

  _makeButtonCol(key, label, onClick) {
    return makeElement('div', { className: 'scratchy-btn-col' }, [
      makeElement(
        'button',
        {
          className: 'scratchy-action-btn ' + key,
          onclick: onClick,
          onmouseenter: () => this.callouts.showCallout(key),
          onmouseleave: () => this.callouts.hideCallout(),
        },
        label
      ),
    ]);
  }

  toggleLessScratchy() {
    this.isLessScratchy = this.lessScratchyCheckbox.checked;
    if (this.isLessScratchy) {
      this.logoImg.src = 'https://recursi.dev/SiteResources/scratchy/logoSmooth.png';
      this.mascotImg.src = 'https://recursi.dev/SiteResources/scratchy/mascotSleeping.png';
      this.mascotImg.classList.add('sleeping');
    } else {
      this.logoImg.src = 'https://recursi.dev/SiteResources/scratchy/logo.png';
      this.mascotImg.src = 'https://recursi.dev/SiteResources/scratchy/mascot.png';
      this.mascotImg.classList.remove('sleeping');
    }
  }

  openStoryDialog() {
      const wrapper = makeElement('div', {
        style: {
          width: '100%',
          height: '100%',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
        },
      });

      const iframe = makeElement('iframe', {
        src: '/Scratchy/about.html',
        style: { flex: '1', border: 'none', width: '100%' },
      });

      wrapper.appendChild(iframe);

      const dlgW = Math.min(Math.round(window.innerWidth * 0.85), 900);
      const dlgH = Math.min(Math.round(window.innerHeight * 0.85), 800);

      let storyDialog = null;

      const titleBarLink = makeElement('a', {
        href: '/Scratchy/about.html',
        target: '_blank',
        textContent: 'Open in new tab ↗',
        style: {
          fontSize: '12px',
          color: '#aaa',
          textDecoration: 'none',
          marginRight: '8px',
          cursor: 'pointer',
          fontFamily: 'sans-serif',
        },
        onclick: (e) => {
          e.stopPropagation();
          if (storyDialog) storyDialog.close();
        },
      });

      storyDialog = UITools.makeDialog({
        env: this.env,
        title: "Scratchy's Story",
        size: [dlgW, dlgH],
        contentElement: wrapper,
        noPadding: true,
        buttons: [{ label: 'Close' }],
      });

      const controls = storyDialog.header.querySelector('.uw-controls');
      if (controls) {
        controls.insertBefore(titleBarLink, controls.firstChild);
      }
    }

  async _handleAutoLoad() {
      // Load templates dynamically first
      if (this.templateSelector && typeof this.templateSelector.loadTemplates === 'function') {
        await this.templateSelector.loadTemplates();
      }

      const params = new URLSearchParams(window.location.search);
      const url = params.get('url');
      let targetUrl = url;
      let filename = 'project.sb3';

      if (!targetUrl) {
        const tmpl = this.templateSelector.getSelectedTemplate();
        const file = tmpl.file;
        targetUrl = this._resolveUrl(file);
        filename = file.split('/').pop() || file;
        this.loadedFileName = tmpl.name;
      } else {
        const parts = targetUrl.split('/');
        const last = parts[parts.length - 1];
        if (last) filename = last;
        this.templateSelector.setCustomProject(filename.replace(/\.sb3$/i, ''));
      }

      try {
        this.statusDiv.textContent = `Loading ${filename}...`;
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const blob = await response.blob();

        const file = new File([blob], filename, {
          type: blob.type || 'application/x-scratch-sb3',
        });
        await this.dropHandler.loadSb3File(file);
      } catch (e) {
        console.warn('Auto-load failed:', e);
        this.statusDiv.textContent = 'Drop an .sb3 file to begin';
      }
    }

  async _loadTemplate(templateFile, displayName) {
      try {
        this.statusDiv.textContent = `Loading template: ${displayName}...`;
        const targetUrl = this._resolveUrl(templateFile);

        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const blob = await response.blob();

        const file = new File([blob], templateFile.split('/').pop() || templateFile, {
          type: blob.type || 'application/x-scratch-sb3',
        });
        this.loadedFileName = displayName;
        await this.dropHandler.loadSb3File(file);
        this.statusDiv.textContent = `Loaded template: ${displayName}`;
      } catch (e) {
        console.warn('Template load failed:', e);
        this.statusDiv.textContent = `Failed to load template: ${e.message}`;
      }
    }

  

  async run(env) {
      this.env = env;
      this.init(env);
      return this;
    }

  

  _resolveUrl(file) {
      if (!file) return '';
      if (file.startsWith('http://') || file.startsWith('https://')) {
        return file;
      }
      // If path already starts with /Scratchy/ but we are in a subdirectory,
      // let's resolve it smoothly. The best way is to keep files relative.
      return file;
    }
}

