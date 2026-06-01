
class LandingPage {
  constructor() {
      this.container = null;
    }

  init(targetElement) {
      this.container = targetElement;
      StyleManager.init();
      this.renderLayout();
    }

  renderLayout() {
      this.container.innerHTML = '';

      const bgImage = makeElement('div', { className: 'app-background' });
      const bgOverlay = makeElement('div', { className: 'app-overlay' });

      const title = LandingPageText.heroTitle();
      const subtitle = LandingPageText.heroSubtitle();

      const cardData = LandingPageText.composeFeatureCards();
      const featureCards = cardData.map(([t, d]) => this.createFeatureCard(t, d));
      const featuresGrid = makeElement(
        'div',
        { className: 'features-grid' },
        ...featureCards
      );

      const launchBtn = makeElement('button', {
        className: 'btn-primary btn-large',
        textContent: 'Launch Editor',
        onclick: () => this.launchApp(),
      });

      const starterPicker = this._createStarterPicker();

      const launchRow = makeElement(
        'div',
        { className: 'starter-picker-row' },
        launchBtn,
        starterPicker
      );

      const dropZone = this.createDropZone();

      const heroSection = makeElement(
        'div',
        { className: 'hero-section' },
        title,
        subtitle,
        launchRow
      );

      const mainContent = makeElement(
        'div',
        { className: 'landing-layout' },
        heroSection,
        featuresGrid,
        dropZone
      );

      const docsSection = this.createDocumentationSection();

      this.container.append(bgImage, bgOverlay, mainContent, docsSection);

      const exportBtn = makeElement('button', {
        textContent: '⬇ Save as HTML',
        onclick: () => this.saveAsStaticHtml(),
        style: {
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          padding: '6px 14px',
          fontSize: '0.75rem',
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: '9999',
          backdropFilter: 'blur(8px)',
        }
      });
      this.container.appendChild(exportBtn);

      this._loadOptionalFeatures(mainContent, dropZone);
    }

  createFeatureCard(title, desc) {
    return makeElement(
      'div',
      { className: 'feature-card' },
      makeElement('h3', title),
      makeElement('p', desc)
    );
  }

  launchApp() {
      const mode = this._getStarterMode();
      let basePath = window.location.pathname;
      if (!basePath.endsWith('/')) {
        if (basePath.endsWith('.html')) {
          basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        } else {
          basePath += '/';
        }
      }
      const targetUrl = basePath + 'blank.html' + (mode === 'blank' ? '?starter=blank' : '');
      window.location.href = targetUrl;
    }

  createMvgThumbnail() {
    // Reuse your specific branding asset
    const img = makeElement('img', {
      src: 'https://recursi.dev/resources/mvg.png',
      alt: 'Mindful Vibe Coding',
    });

    return makeElement(
      'div',
      {
        className: 'mvg-thumbnail',
        title: 'Mindful Vibe Coding',
        onclick: () => {
          const modal = document.querySelector('.mvg-modal');
          if (modal) modal.classList.add('active');
        },
      },
      img
    );
  }

  createMvgModal() {
    const img = makeElement('img', {
      src: 'https://recursi.dev/resources/mvg.png',
      className: 'mvg-full-img',
    });
    const text = makeElement(
      'div',
      { className: 'mvg-text' },
      makeElement('div', { className: 'mvg-title' }, 'Mindful Vibe Coding'),
      makeElement(
        'div',
        { className: 'mvg-subtitle' },
        makeElement('span', 'Structured'),
        makeElement('span', 'Scalable'),
        makeElement('span', 'Intentional')
      ),
      makeElement(
        'p',
        {
          style: {
            marginTop: '20px',
            color: '#ccc',
            lineHeight: '1.6',
          },
        },
        'Markdown Notebook is part of a small family of tools built around a simple idea: your work should live in plain files you can see and copy. ',
        'The UI runs as static JavaScript served from sniplets.org; your notes themselves live inside regular .html files you can rename, move, or version however you want.'
      )
    );
    const content = makeElement(
      'div',
      { className: 'mvg-modal-content' },
      img,
      text
    );
    const modal = makeElement(
      'div',
      {
        className: 'mvg-modal',
        onclick: (e) => {
          if (e.target.classList.contains('mvg-modal')) {
            modal.classList.remove('active');
          }
        },
      },
      content
    );
    return modal;
  }

  createDocumentationSection() {
    // CSS stays here since it's layout, not text
    applyCss(`
    .docs-section {
      max-width: 960px;
      margin: 40px auto 60px;
      padding: 32px 40px 40px;
      box-sizing: border-box;
      border-radius: 16px;
      background: rgba(10, 10, 20, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(10px);
      color: #e8e4df;
      position: relative;
      z-index: 1;
    }

    @media (max-width: 700px) {
      .docs-section {
        margin: 24px 16px 40px;
        padding: 20px 18px 26px;
      }
    }

    .docs-heading {
      font-family: 'Outfit', sans-serif;
      font-size: 1.8rem;
      font-weight: 700;
      margin: 0 0 1rem 0;
      letter-spacing: -0.01em;
      background: linear-gradient(135deg, #ffffff 30%, #a5f3fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .docs-intro {
      margin: 0 0 1.5rem 0;
      line-height: 1.7;
      color: #ccc;
      font-size: 1rem;
    }

    .docs-section h3 {
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      margin: 2rem 0 0.6rem 0;
      font-size: 1.15rem;
      color: #a5f3fc;
    }

    .docs-section p {
      line-height: 1.7;
      color: #bbb;
      font-size: 0.95rem;
    }

    .docs-section code {
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 0.85em;
      color: #e0e0e0;
    }

    .docs-list {
      margin: 0.5rem 0 1.5rem 1.4rem;
      padding: 0;
      list-style: none;
    }

    .docs-list li {
      margin: 0 0 0.6rem 0;
      line-height: 1.6;
      color: #bbb;
      font-size: 0.95rem;
      position: relative;
      padding-left: 1.2rem;
    }

    .docs-list li::before {
      content: '\u2192';
      position: absolute;
      left: 0;
      color: #a5f3fc;
      font-size: 0.85rem;
    }

    .docs-note {
      margin-top: 1rem;
      font-size: 0.88rem;
      color: #888;
      line-height: 1.6;
      font-style: italic;
    }
  `);

    // All children come from LandingPageText — just assemble
    const children = LandingPageText.composeDocsSectionChildren();
    return makeElement('section', { className: 'docs-section' }, ...children);
  }

  async _loadOptionalFeatures(mainContent, dropZone) {
    // Video showcase — loads only if VideoShowcase is available on this server
    try {
      const vsMod = await import('/library/VideoShowcase.js');
      const videoSection = this._buildVideoShowcase(vsMod.VideoShowcase);
      if (videoSection) {
        mainContent.insertBefore(videoSection, dropZone);
      }
    } catch (e) {
      // VideoShowcase not available on this server — skip silently
    }

    // Comments — loads only if Comments module is available
    try {
      const cmMod = await import('/Comments/js/Comments.js');
      const commentsSection = this._buildCommentsSection();
      this.container.appendChild(commentsSection);
      this._initComments(cmMod.Comments);
    } catch (e) {
      // Comments not available on this server — skip silently
    }
  }

  _buildVideoShowcase(VideoShowcase) {
    const showcase = new VideoShowcase({
      heading: 'See It in Action',
      subheading: 'Watch how Markdown Notebook handles real-world workflows.',
      layout: 'grid',
      videos: [
        {
          id: 'dQw4w9WgXcQ',
          title: 'Getting Started',
          subtitle: 'From first paste to saved notebook in 2 minutes',
          description:
            'A quick walkthrough showing how to paste formatted content from Claude, ChatGPT, or Gemini, convert it to Markdown, and save your notebook as a reusable HTML file.',
          sections: [
            {
              time: 0,
              label: 'Opening the editor',
              description:
                'Launch the app and orient yourself in the interface.',
            },
            {
              time: 30,
              label: 'Pasting formatted output',
              description:
                'Copy a formatted AI response and paste it — it becomes clean Markdown.',
            },
            {
              time: 60,
              label: 'Editing and organizing',
              description:
                'Switch views, add blocks, reorder, and refine your notes.',
            },
            {
              time: 90,
              label: 'Saving your notebook',
              description:
                'Download a self-contained HTML file you can reopen and keep editing.',
            },
          ],
        },
      ],
    });

    const section = showcase.render();
    section.style.maxWidth = '960px';
    section.style.margin = '0 auto';
    section.style.padding = '0 20px 60px';
    return section;
  }

  createDropZone() {
    applyCss(
      `
      .landing-drop-zone {
        margin-top: 40px;
        padding: 30px;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.3s ease, background 0.3s ease;
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 600px;
      }
      .landing-drop-zone:hover,
      .landing-drop-zone.drag-over {
        border-color: rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.05);
      }
      .landing-drop-zone.drag-over {
        border-color: var(--accent-color, #3b82f6);
        background: rgba(59, 130, 246, 0.1);
      }
      .drop-zone-text {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.95rem;
        line-height: 1.5;
      }
      .drop-zone-text strong {
        color: rgba(255, 255, 255, 0.7);
      }
    `,
      'landing-drop-zone-styles'
    );

    const dropText = makeElement(
      'div',
      { className: 'drop-zone-text' },
      makeElement('strong', 'Drop an HTML file here'),
      makeElement('br'),
      'to open it in the editor'
    );

    const dropZone = makeElement(
      'div',
      { className: 'landing-drop-zone' },
      dropText
    );

    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    dropZone.addEventListener('dragover', prevent);
    dropZone.addEventListener('dragenter', (e) => {
      prevent(e);
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', (e) => {
      prevent(e);
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      prevent(e);
      dropZone.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length === 0) return;
      const file = files[0];
      if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
        // Inline feedback instead of alert
        dropText.querySelector('strong').textContent =
          'Please drop an .html file';
        dropText.querySelector('strong').style.color = '#f87171';
        setTimeout(() => {
          dropText.querySelector('strong').textContent =
            'Drop an HTML file here';
          dropText.querySelector('strong').style.color = '';
        }, 3000);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Store the file content and navigate to blank.html to load it
        try {
          sessionStorage.setItem('mw-import-html', ev.target.result);
          sessionStorage.setItem('mw-import-filename', file.name);
        } catch (err) {
          console.error('sessionStorage failed:', err);
        }
        this.launchApp();
      };
      reader.readAsText(file);
    });

    // Also allow clicking to pick a file
    dropZone.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.html,.htm';
      input.onchange = () => {
        if (input.files.length === 0) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            sessionStorage.setItem('mw-import-html', ev.target.result);
            sessionStorage.setItem('mw-import-filename', file.name);
          } catch (err) {
            console.error('sessionStorage failed:', err);
          }
          this.launchApp();
        };
        reader.readAsText(file);
      };
      input.click();
    });

    return dropZone;
  }

  _buildCommentsSection() {
    applyCss(
      `
      .md-comments-section {
        max-width: 960px;
        margin: 0 auto 60px;
        padding: 0 32px;
        position: relative;
        z-index: 1;
      }
      .md-comments-header {
        font-family: 'Outfit', sans-serif;
        font-size: 1.4rem;
        font-weight: 700;
        color: #fff;
        margin-bottom: 16px;
        text-align: center;
      }
      .md-comments-wrapper {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 24px;
      }
      @media (max-width: 700px) {
        .md-comments-section {
          padding: 0 16px;
          margin-bottom: 40px;
        }
        .md-comments-wrapper {
          padding: 16px;
        }
      }
    `,
      'md-comments-styles'
    );

    const section = makeElement('div', { className: 'md-comments-section' });
    const header = makeElement(
      'div',
      { className: 'md-comments-header' },
      'Discussion'
    );
    const wrapper = makeElement('div', {
      className: 'md-comments-wrapper',
      id: 'md-comments-root',
    });
    section.append(header, wrapper);
    return section;
  }

  _initComments(Comments) {
    const root = document.getElementById('md-comments-root');
    if (!root) return;

    const commentsApp = new Comments();
    commentsApp.init(root, {
      threadId: 'main',
      apiMode: 'mock',
      showTitle: false,
    });

    // Theme to match the markdown page dark style
    commentsApp.applyTheme({
      textColorPrimary: '#e0e0e0',
      bgColorPrimary: 'transparent',
      bgColorSecondary: 'rgba(255, 255, 255, 0.05)',
      accentColor: '#3b82f6',
      lineColor: 'rgba(255, 255, 255, 0.1)',
      fontFamily: "'Inter', sans-serif",
      borderRadius: 12,
      shadow: 'none',
      alignment: 'left',
    });
  }

  _getStarterMode() {
    try {
      return localStorage.getItem('mw-starter-mode') || 'sample';
    } catch (e) {
      return 'sample';
    }
  }

  _setStarterMode(mode) {
    try {
      localStorage.setItem('mw-starter-mode', mode);
    } catch (e) {
      // localStorage unavailable
    }
  }

  _createStarterPicker() {
    const currentMode = this._getStarterMode();

    applyCss(
      `
    .starter-picker-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 24px;
    }
    .starter-picker {
      display: inline-flex;
      align-items: center;
      gap: 0;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 3px;
      backdrop-filter: blur(8px);
      user-select: none;
    }
    .starter-option {
      padding: 5px 14px;
      font-size: 0.78rem;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.5);
      background: transparent;
      border: none;
      transition: all 0.2s ease;
      white-space: nowrap;
      letter-spacing: 0.01em;
    }
    .starter-option:hover {
      color: rgba(255, 255, 255, 0.75);
      background: rgba(255, 255, 255, 0.05);
    }
    .starter-option.active {
      color: #fff;
      background: rgba(59, 130, 246, 0.5);
      box-shadow: 0 1px 6px rgba(59, 130, 246, 0.25);
    }
  `,
      'starter-picker-styles'
    );

    const sampleBtn = makeElement('button', {
      className: 'starter-option' + (currentMode === 'sample' ? ' active' : ''),
      textContent: 'With samples',
    });

    const blankBtn = makeElement('button', {
      className: 'starter-option' + (currentMode === 'blank' ? ' active' : ''),
      textContent: 'Blank',
    });

    const setActive = (mode) => {
      this._setStarterMode(mode);
      if (mode === 'sample') {
        sampleBtn.classList.add('active');
        blankBtn.classList.remove('active');
      } else {
        blankBtn.classList.add('active');
        sampleBtn.classList.remove('active');
      }
    };

    sampleBtn.addEventListener('click', () => setActive('sample'));
    blankBtn.addEventListener('click', () => setActive('blank'));

    const picker = makeElement(
      'div',
      { className: 'starter-picker' },
      sampleBtn,
      blankBtn
    );

    return picker;
  }
  async saveAsStaticHtml() {
    // Collect all inlined CSS from applyCss style tags
    const styleEls = document.querySelectorAll('style[data-id]');
    let inlinedCss = '';
    styleEls.forEach(s => { inlinedCss += s.textContent + '\n'; });
    // Also grab any style tags without data-id
    document.querySelectorAll('style:not([data-id])').forEach(s => {
      inlinedCss += s.textContent + '\n';
    });

    // Background image uses server-relative path — works fine on same host

    // Serialize the live DOM sections that have real text content
    const bodyContent = [];
    const selectors = [
      '.app-background', '.app-overlay', '.landing-layout', '.docs-section'
    ];
    selectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        // Clone and strip the export button and event-listener-only elements
        const clone = el.cloneNode(true);
        // Remove export button if present
        clone.querySelectorAll('button').forEach(btn => {
          if (btn.textContent.includes('Save as HTML')) btn.remove();
        });
        bodyContent.push(clone.outerHTML);
      }
    });

    // Build the head — same fonts/CDN as indexDynamic
    const head = [
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>Markdown Notebook | Mindful Vibe Coding</title>',
      '<meta name="description" content="A self-contained Markdown notebook for LLM output and web writing. Paste rich HTML from Claude, ChatGPT, Gemini, or the web, clean it to Markdown, and save everything into a single HTML file you own.">',
      '<link rel="preconnect" href="https://fonts.googleapis.com">',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;700;800&family=Inter:wght@400;600&family=Fira+Code:wght@300;400;500&display=swap" rel="stylesheet">',
      '<script src="https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js" defer></' + 'script>',
      '<script src="https://cdn.jsdelivr.net/npm/turndown/dist/turndown.min.js" defer></' + 'script>',
      '<script src="https://cdn.jsdelivr.net/npm/turndown-plugin-gfm/dist/turndown-plugin-gfm.min.js" defer></' + 'script>',
      '<style>' + inlinedCss + '</style>',
    ].join('\n');

    // Interactive wiring script — runs on existing DOM, no renderLayout()
    const interactiveScript = [
      '<script type="module">',
      '  import { LandingPage } from \'./landing/LandingPage.js\';',
      '  new LandingPage().initInteractive(document.body);',
      '</' + 'script>',
    ].join('\n');

    const html = [
      '<!DOCTYPE html>',
      '<!-- Pre-rendered static export from indexDynamic.html -->',
      '<html lang="en">',
      '<head>',
      head,
      '</head>',
      '<body>',
      ...bodyContent,
      interactiveScript,
      '</body>',
      '</html>',
    ].join('\n');

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  initInteractive(container) {
    // Wire up interactive behaviors on pre-rendered DOM — no text building
    this.container = container; // needed by _loadOptionalFeatures
    StyleManager.init(); // Re-inject CSS in case it's missing

    // Launch button
    const launchBtn = container.querySelector('.btn-large');
    if (launchBtn) launchBtn.addEventListener('click', () => this.launchApp());

    // Starter picker — re-wire the toggle buttons
    const opts = container.querySelectorAll('.starter-option');
    if (opts.length === 2) {
      opts[0].addEventListener('click', () => {
        this._setStarterMode('sample');
        opts[0].classList.add('active'); opts[1].classList.remove('active');
      });
      opts[1].addEventListener('click', () => {
        this._setStarterMode('blank');
        opts[1].classList.add('active'); opts[0].classList.remove('active');
      });
      // Set initial state
      const mode = this._getStarterMode();
      opts[0].classList.toggle('active', mode === 'sample');
      opts[1].classList.toggle('active', mode === 'blank');
    }

    // Drop zone — re-wire on existing element
    const dropZone = container.querySelector('.landing-drop-zone');
    if (dropZone) this._wireDropZone(dropZone);

    // Optional features (video, comments)
    const mainContent = container.querySelector('.landing-layout');
    const dz = container.querySelector('.landing-drop-zone');
    if (mainContent && dz) this._loadOptionalFeatures(mainContent, dz);
  }

  _wireDropZone(dropZone) {
    const dropText = dropZone.querySelector('.drop-zone-text');
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    dropZone.addEventListener('dragover', prevent);
    dropZone.addEventListener('dragenter', (e) => { prevent(e); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', (e) => { prevent(e); dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', (e) => {
      prevent(e); dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file || (!file.name.endsWith('.html') && !file.name.endsWith('.htm'))) {
        if (dropText) { const s = dropText.querySelector('strong'); if(s){s.textContent='Please drop an .html file';s.style.color='#f87171';setTimeout(()=>{s.textContent='Drop an HTML file here';s.style.color='';},3000);}}
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try { sessionStorage.setItem('mw-import-html', ev.target.result); sessionStorage.setItem('mw-import-filename', file.name); } catch(err) {}
        this.launchApp();
      };
      reader.readAsText(file);
    });
    dropZone.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.html,.htm';
      input.onchange = () => {
        if (!input.files.length) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          try { sessionStorage.setItem('mw-import-html', ev.target.result); sessionStorage.setItem('mw-import-filename', file.name); } catch(err) {}
          this.launchApp();
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }


  

  

  async run(env) {
      this.env = env;
      this.init(env.container);
      return this;
    }
}



