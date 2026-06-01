
class ProjectShowcase {

  constructor(container) {
    this.container = container;
    this.players = [];
    this.editing = false;
    this.pageEl = null;
    this.currentTheme = 'editorial';

    // Default data (overridden by JSON import if available)
    this.videos = [
      {
        id: 'jNQXAC9IVRw',
        title: 'Project Genesis',
        subtitle: 'Where it all started',
        description: 'This video explains the initial spark of the idea. Watch how the core concepts were developed and the earliest prototypes came to life through iterative design and experimentation.',
        sections: [
          {time: 0, label: 'Introduction', description: 'Overview of the project goals and the problem space we set out to address.'},
          {time: 10, label: 'The Elephants', description: 'First look at the core data structures and how they interact with the rendering layer.'},
          {time: 15, label: 'Long Trunks', description: 'Deep dive into the extension mechanism that allows modular growth.'},
        ],
      },
      {
        id: 'dQw4w9WgXcQ',
        title: 'Technical Deep Dive',
        subtitle: 'Architecture, patterns & implementation details',
        description: 'A comprehensive walkthrough of the entire system architecture covering design patterns, communication bridges, rendering pipelines, state management, and testing strategies.',
        sections: [
          {time: 0, label: 'System Overview', description: 'High-level topology of the application and how the major subsystems connect.'},
          {time: 18, label: 'Message Bus', description: 'The event-driven backbone that routes commands between the UI, workers, and server.'},
          {time: 42, label: 'State Management', description: 'How we track and synchronize state across multiple execution contexts without conflicts.'},
          {time: 65, label: 'Rendering Pipeline', description: 'From data model to pixels: the multi-stage rendering pipeline and its optimization points.'},
          {time: 85, label: 'Bridge Layer', description: 'Cross-context communication patterns including the iframe bridge and postMessage protocol.'},
          {time: 110, label: 'Plugin Architecture', description: 'How third-party extensions hook into the system without touching core code.'},
          {time: 135, label: 'Error Handling', description: 'Graceful degradation, retry strategies, and how we surface actionable errors to users.'},
          {time: 160, label: 'Testing Strategy', description: 'Unit, integration, and visual regression testing with our custom snapshot approach.'},
          {time: 180, label: 'Performance Profiling', description: 'Identifying bottlenecks: flame charts, memory snapshots, and render timing analysis.'},
          {time: 200, label: 'Deployment Pipeline', description: 'From commit to production: CI checks, staging environments, and rollback procedures.'},
        ],
      },
      {
        id: 'M7lc1UVf-VE',
        title: 'Future Roadmap',
        subtitle: 'What comes next',
        description: 'Where we are going next. Discussing upcoming features, scaling plans, and how the community can get involved in shaping the direction.',
        sections: [
          {time: 30, label: 'Vision', description: 'The north star and guiding principles for the next phase of development.'},
          {time: 60, label: 'Collaboration Tools', description: 'Real-time multi-user editing and how we plan to handle conflicts at scale.'},
          {time: 120, label: 'Milestones', description: 'Concrete deliverables and target dates for the next three quarters.'},
          {time: 180, label: 'Community Input', description: 'How user feedback has shaped the roadmap and the process for submitting proposals.'},
          {time: 240, label: 'Q&A', description: 'Open discussion addressing community questions and feature requests.'},
        ],
      },
    ];
  }

  async init() {
    await this._loadContent();
    this._loadThemePreference();
    this._injectFonts();
    this._injectStyles();
    this.render();
  }

  async _loadContent() {
    try {
      const resp = await fetch('./showcase-content.json');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          this.videos = data;
        }
      }
    } catch (e) {
      // No JSON file found, use default data
    }
  }

  _loadThemePreference() {
    try {
      const saved = localStorage.getItem('ps-theme');
      if (saved && ProjectShowcase.THEMES[saved]) this.currentTheme = saved;
    } catch (e) {}
  }

  _saveThemePreference() {
    try {localStorage.setItem('ps-theme', this.currentTheme);} catch (e) {}
  }

  _injectFonts() {
    const theme = ProjectShowcase.THEMES[this.currentTheme];
    let link = document.getElementById('ps-google-fonts');
    if (link) link.remove();
    link = document.createElement('link');
    link.id = 'ps-google-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + theme.fonts + '&display=swap';
    document.head.appendChild(link);
  }

  setTheme(themeKey) {
    if (!ProjectShowcase.THEMES[themeKey]) return;
    this.currentTheme = themeKey;
    this._saveThemePreference();
    this._injectFonts();
    this._applyThemeVars();
  }

  _applyThemeVars() {
    const t = ProjectShowcase.THEMES[this.currentTheme];
    const r = document.documentElement.style;
    r.setProperty('--ps-bg', t.bg);
    r.setProperty('--ps-text', t.text);
    r.setProperty('--ps-heading', t.heading);
    r.setProperty('--ps-muted', t.muted);
    r.setProperty('--ps-subtle', t.subtle);
    r.setProperty('--ps-faint', t.faint);
    r.setProperty('--ps-border', t.border);
    r.setProperty('--ps-border-light', t.borderLight);
    r.setProperty('--ps-accent', t.accent);
    r.setProperty('--ps-accent-hover', t.accentHover);
    r.setProperty('--ps-btn-bg', t.btnBg);
    r.setProperty('--ps-btn-text', t.btnText);
    r.setProperty('--ps-btn-hover', t.btnHover);
    r.setProperty('--ps-chapter-hover', t.chapterHover);
    r.setProperty('--ps-input-bg', t.inputBg);
    r.setProperty('--ps-input-border', t.inputBorder);
    r.setProperty('--ps-input-text', t.inputText);
    r.setProperty('--ps-video-bg', t.videoBg);
    r.setProperty('--ps-video-shadow', t.videoShadow);
    r.setProperty('--ps-edit-highlight', t.editHighlight);
    r.setProperty('--ps-heading-font', t.headingFont);
    r.setProperty('--ps-body-font', t.bodyFont);
    // Update theme picker active state
    document.querySelectorAll('.ps-theme-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.theme === this.currentTheme);
    });
  }

  toggleEdit() {
    this.editing = !this.editing;
    this._rerender();
  }

  _harvestEdits() {
    if (!this.pageEl) return;
    const spreads = this.pageEl.querySelectorAll('.ps-spread');
    spreads.forEach((spreadEl, idx) => {
      if (idx >= this.videos.length) return;
      const v = this.videos[idx];
      const titleEl = spreadEl.querySelector('.ps-spread-title');
      const subtitleEl = spreadEl.querySelector('.ps-spread-subtitle');
      const descEl = spreadEl.querySelector('.ps-spread-desc');
      const vidIdEl = spreadEl.querySelector('.ps-video-id-input');
      if (titleEl) v.title = titleEl.textContent.trim();
      if (subtitleEl) v.subtitle = subtitleEl.textContent.trim();
      if (descEl) v.description = descEl.innerHTML.trim();
      if (vidIdEl) v.id = vidIdEl.value.trim();
      const chapterEls = spreadEl.querySelectorAll('.ps-chapter');
      chapterEls.forEach((chEl, si) => {
        if (si >= v.sections.length) return;
        const lbl = chEl.querySelector('.ps-chapter-label');
        const desc = chEl.querySelector('.ps-chapter-desc');
        const timeInput = chEl.querySelector('.ps-time-input');
        if (lbl) v.sections[si].label = lbl.textContent.trim();
        if (desc) v.sections[si].description = desc.innerHTML.trim();
        if (timeInput) {
          const parts = timeInput.value.split(':');
          const mins = parseInt(parts[0]) || 0;
          const secs = parseInt(parts[1]) || 0;
          v.sections[si].time = mins * 60 + secs;
        }
      });
    });
  }

  _rerender() {
    this._harvestEdits();
    this.players.forEach(pw => {if (pw.player) pw.player.destroy();});
    this.players = [];
    this.container.innerHTML = '';
    this._injectStyles();
    this.render();
  }

  _serializeData() {
    this._harvestEdits();
    return JSON.stringify(this.videos, null, 2);
  }

  _exportJSON() {
    const json = this._serializeData();
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'showcase-content.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  _injectStyles() {
    this._applyThemeVars();
    const css = `
      *, *::before, *::after { box-sizing: border-box; }
      body {
        font-family: var(--ps-body-font);
        background: var(--ps-bg);
        color: var(--ps-text);
        margin: 0; padding: 0;
        -webkit-font-smoothing: antialiased;
        transition: background 0.4s ease, color 0.3s ease;
      }
      .ps-page { max-width: 1200px; margin: 0 auto; padding: 80px 40px; }
      .ps-header { margin-bottom: 80px; border-bottom: 2px solid var(--ps-heading); padding-bottom: 40px; }
      .ps-header h1 {
        font-family: var(--ps-heading-font);
        font-size: 4rem; font-weight: 400; color: var(--ps-heading);
        margin: 0 0 16px 0; line-height: 1.1; letter-spacing: -1px;
      }
      .ps-header .ps-lead { font-size: 1.15rem; color: var(--ps-muted); line-height: 1.6; max-width: 600px; margin: 0; }
      .ps-spread { margin-bottom: 100px; }
      .ps-spread-number { font-family: var(--ps-heading-font); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 3px; color: var(--ps-faint); margin: 0 0 12px 0; }
      .ps-spread-title { font-family: var(--ps-heading-font); font-size: 2.8rem; font-weight: 400; color: var(--ps-heading); margin: 0 0 6px 0; line-height: 1.15; }
      .ps-spread-subtitle { font-size: 1.05rem; color: var(--ps-subtle); font-style: italic; margin: 0 0 20px 0; }
      .ps-spread-desc { font-size: 1.05rem; line-height: 1.7; color: var(--ps-muted); max-width: 700px; margin: 0 0 32px 0; }
      .ps-video-frame { width: 100%; aspect-ratio: 16/9; background: var(--ps-video-bg); border-radius: 6px; overflow: hidden; position: relative; box-shadow: 0 8px 40px var(--ps-video-shadow); }
      .ps-theater-payload { display: flex; flex-direction: column; width: 100%; height: 100%; background: #000; min-height: 0; }
      .ps-yt-container { flex: 1; min-height: 0; width: 100%; position: relative; overflow: hidden; }
      .ps-yt-container::after { content: ''; position: absolute; bottom: 0; right: 0; width: 120px; height: 40px; background: linear-gradient(to right, transparent, #000 40%); pointer-events: none; z-index: 2; opacity: 0; transition: opacity 0.3s; }
      .ps-yt-container:not(:hover)::after { opacity: 1; }
      .ps-chapters { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0; border-top: 1px solid var(--ps-border); margin-top: 0; }
      .ps-chapter { padding: 24px; border-bottom: 1px solid var(--ps-border-light); cursor: pointer; transition: background 0.15s ease; position: relative; }
      .ps-chapter:hover { background: var(--ps-chapter-hover); }
      .ps-chapter-time { font-size: 0.8rem; font-weight: 600; color: var(--ps-accent); letter-spacing: 0.5px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
      .ps-chapter-label { font-family: var(--ps-heading-font); font-size: 1.15rem; color: var(--ps-heading); margin-bottom: 6px; }
      .ps-chapter-desc { font-size: 0.9rem; color: var(--ps-subtle); line-height: 1.5; }
      .ps-divider { border: none; border-top: 1px solid var(--ps-border); margin: 0 0 100px 0; }

      /* --- Toolbar --- */
      .ps-toolbar { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; gap: 8px; align-items: center; }
      .ps-edit-toggle { background: var(--ps-btn-bg); color: var(--ps-btn-text); border: none; padding: 10px 20px; border-radius: 4px; font-family: var(--ps-body-font); font-size: 0.8rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
      .ps-edit-toggle:hover { background: var(--ps-btn-hover); }
      .ps-edit-toggle.active { background: var(--ps-accent); color: #000; }

      /* --- Theme Picker --- */
      .ps-theme-picker { display: flex; gap: 6px; align-items: center; padding: 6px 10px; background: var(--ps-video-bg); border-radius: 20px; }
      .ps-theme-dot { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; position: relative; }
      .ps-theme-dot:hover { transform: scale(1.2); }
      .ps-theme-dot.active { border-color: #fff; box-shadow: 0 0 0 2px var(--ps-accent); }
      .ps-theme-dot[title]::after { content: attr(title); position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%); font-size: 10px; color: var(--ps-muted); white-space: nowrap; opacity: 0; transition: opacity 0.2s; pointer-events: none; font-family: var(--ps-body-font); }
      .ps-theme-dot:hover::after { opacity: 1; }

      /* --- Edit Mode --- */
      .ps-editable { outline: none; }
      .ps-editable:focus { background: var(--ps-edit-highlight); border-radius: 3px; }
      .ps-edit-btn { background: var(--ps-border-light); color: var(--ps-muted); border: 1px solid var(--ps-border); padding: 6px 14px; border-radius: 3px; cursor: pointer; font-family: var(--ps-body-font); font-size: 0.8rem; font-weight: 500; transition: all 0.15s; }
      .ps-edit-btn:hover { background: var(--ps-border); color: var(--ps-heading); }
      .ps-edit-btn.danger { color: #c44; border-color: #daa; }
      .ps-edit-btn.danger:hover { background: #c44; color: #fff; }
      .ps-edit-btn.primary { background: var(--ps-btn-bg); color: var(--ps-btn-text); border-color: var(--ps-btn-bg); }
      .ps-edit-btn.primary:hover { background: var(--ps-btn-hover); }
      .ps-video-id-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
      .ps-video-id-label { font-size: 0.8rem; font-weight: 600; color: var(--ps-faint); text-transform: uppercase; letter-spacing: 1px; }
      .ps-video-id-input { font-family: monospace; font-size: 0.9rem; padding: 6px 12px; border: 1px solid var(--ps-input-border); border-radius: 3px; background: var(--ps-input-bg); color: var(--ps-input-text); width: 200px; }
      .ps-time-input { font-family: monospace; font-size: 0.8rem; padding: 2px 6px; border: 1px solid var(--ps-input-border); border-radius: 3px; width: 60px; background: var(--ps-input-bg); color: var(--ps-input-text); }
      .ps-delete-section { position: absolute; top: 8px; right: 8px; background: none; border: none; color: #c44; cursor: pointer; font-size: 1.1rem; padding: 2px 6px; border-radius: 3px; opacity: 0.6; transition: opacity 0.15s; }
      .ps-delete-section:hover { opacity: 1; background: rgba(204,68,68,0.1); }

      /* --- Theater Overlay (fullscreen) --- */
      .ps-theater-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        z-index: 10000; background: #000; display: flex; flex-direction: column;
        animation: ps-theater-in 0.3s ease;
      }
      @keyframes ps-theater-in { from { opacity: 0; } to { opacity: 1; } }
      .ps-theater-video-area {
        width: 100%; flex: 1; min-height: 0; position: relative; background: #000;
      }
      .ps-theater-close {
        position: absolute; top: 16px; right: 20px; z-index: 10001;
        background: rgba(255,255,255,0.15); color: #fff; border: none;
        width: 40px; height: 40px; border-radius: 50%; font-size: 1.4rem;
        cursor: pointer; transition: background 0.2s; display: flex;
        align-items: center; justify-content: center; backdrop-filter: blur(4px);
      }
      .ps-theater-close:hover { background: rgba(255,255,255,0.3); }
      .ps-theater-title {
        position: absolute; top: 16px; left: 24px; z-index: 10001;
        color: #fff; font-family: var(--ps-heading-font); font-size: 1.3rem;
        text-shadow: 0 2px 8px rgba(0,0,0,0.6); pointer-events: none;
        opacity: 1; transition: opacity 0.5s;
      }
      .ps-theater-bottom {
        flex-shrink: 0; max-height: 35vh; overflow-y: auto;
        background: #0a0a0a; border-top: 1px solid #222;
        padding: 20px 24px;
      }
      .ps-theater-bottom::-webkit-scrollbar { width: 6px; }
      .ps-theater-bottom::-webkit-scrollbar-track { background: #0a0a0a; }
      .ps-theater-bottom::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      .ps-theater-section {
        padding: 14px 16px; border-bottom: 1px solid #1a1a1a;
        cursor: pointer; transition: background 0.15s; display: flex; gap: 16px;
        align-items: flex-start;
      }
      .ps-theater-section:last-child { border-bottom: none; }
      .ps-theater-section:hover { background: rgba(255,255,255,0.04); }
      .ps-theater-section-time {
        font-family: monospace; font-size: 0.85rem; color: var(--ps-accent, #b8860b);
        font-weight: 600; min-width: 50px; padding-top: 2px;
      }
      .ps-theater-section-info { flex: 1; }
      .ps-theater-section-label {
        font-family: var(--ps-heading-font); font-size: 1.05rem; color: #eee; margin-bottom: 4px;
      }
      .ps-theater-section-desc { font-size: 0.85rem; color: #888; line-height: 1.5; }

      /* --- Theater trigger button (above video) --- */
      .ps-video-header { display: flex; justify-content: flex-end; margin-bottom: 10px; }
      .ps-theater-trigger {
        background: none; border: 1px solid var(--ps-border); color: var(--ps-muted);
        padding: 6px 16px; border-radius: 3px; font-family: var(--ps-body-font);
        font-size: 0.8rem; font-weight: 500; letter-spacing: 0.5px;
        cursor: pointer; transition: all 0.2s; display: inline-flex;
        align-items: center; gap: 6px;
      }
      .ps-theater-trigger:hover { border-color: var(--ps-accent); color: var(--ps-accent); }

      @media (max-width: 768px) {
        .ps-page { padding: 40px 20px; }
        .ps-header h1 { font-size: 2.5rem; }
        .ps-spread-title { font-size: 2rem; }
        .ps-chapters { grid-template-columns: 1fr; }
        .ps-toolbar { top: 10px; right: 10px; flex-wrap: wrap; }
      }
    `;
    applyCss(css, 'project-showcase-styles');
  }

  render() {
    const page = makeElement('div', {className: 'ps-page'});
    this.pageEl = page;
    const ed = this.editing;

    // --- Toolbar (theme picker + edit toggle) ---
    const toolbar = makeElement('div', {className: 'ps-toolbar'});

    // Theme picker
    const themePicker = makeElement('div', {className: 'ps-theme-picker'});
    const dotColors = {
      editorial: '#f4f1eb', midnight: '#818cf8', forest: '#7cb342',
      rose: '#c2185b', brutalist: '#ff0000', ocean: '#00b4d8',
      warm: '#c97030', neon: '#39ff14',
    };
    Object.keys(ProjectShowcase.THEMES).forEach(key => {
      const t = ProjectShowcase.THEMES[key];
      const dot = makeElement('div', {
        className: 'ps-theme-dot' + (key === this.currentTheme ? ' active' : ''),
        title: t.label,
        onclick: () => this.setTheme(key),
      });
      dot.dataset.theme = key;
      dot.style.background = dotColors[key] || t.accent;
      if (key === 'editorial') dot.style.border = '2px solid #ccc';
      themePicker.appendChild(dot);
    });
    toolbar.appendChild(themePicker);

    // Export button (edit mode)
    if (ed) {
      toolbar.appendChild(makeElement('button', {className: 'ps-edit-btn primary', onclick: () => this._exportJSON()}, 'Export JSON'));
    }

    // Edit toggle
    toolbar.appendChild(makeElement('button', {
      className: 'ps-edit-toggle' + (ed ? ' active' : ''),
      onclick: () => this.toggleEdit(),
    }, ed ? 'Done' : 'Edit'));
    this.container.appendChild(toolbar);

    // --- Header ---
    const header = makeElement('div', {className: 'ps-header'},
      makeElement('h1', {}, 'Project Showcase'),
      makeElement('p', {className: 'ps-lead'},
        'An interactive overview of key projects. Browse the videos, jump to chapters, or open Theater Mode for the full experience.'
      )
    );
    page.appendChild(header);

    const formatTime = (secs) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m + ':' + String(s).padStart(2, '0');
    };

    // --- Project Spreads ---
    this.videos.forEach((data, idx) => {
      const spread = makeElement('div', {className: 'ps-spread'});
      spread.appendChild(makeElement('p', {className: 'ps-spread-number'}, 'Project ' + String(idx + 1).padStart(2, '0')));
      const titleEl = makeElement('h2', {className: 'ps-spread-title' + (ed ? ' ps-editable' : ''), contentEditable: ed ? 'true' : 'false'}, data.title);
      spread.appendChild(titleEl);
      const subtitleEl = makeElement('p', {className: 'ps-spread-subtitle' + (ed ? ' ps-editable' : ''), contentEditable: ed ? 'true' : 'false'}, data.subtitle || '');
      spread.appendChild(subtitleEl);
      const descEl = makeElement('p', {className: 'ps-spread-desc' + (ed ? ' ps-editable' : '')});
      descEl.contentEditable = ed ? 'true' : 'false';
      descEl.innerHTML = data.description;
      spread.appendChild(descEl);

      if (ed) {
        spread.appendChild(makeElement('div', {className: 'ps-video-id-row'},
          makeElement('span', {className: 'ps-video-id-label'}, 'YouTube ID:'),
          makeElement('input', {className: 'ps-video-id-input', type: 'text', value: data.id}),
        ));
      }

      const ytContainer = makeElement('div', {className: 'ps-yt-container'});
      const playerWrapper = {player: null};
      const sections = data.sections || [];

      const payload = makeElement('div', {className: 'ps-theater-payload'}, ytContainer);
      const videoFrame = makeElement('div', {className: 'ps-video-frame'}, payload);

      // Theater trigger above the video
      const videoHeader = makeElement('div', {className: 'ps-video-header'});
      const rebuildPlayer = (targetContainer, autoplay, startTime) => {
        if (playerWrapper.player) playerWrapper.player.destroy();
        setTimeout(() => {
          playerWrapper.player = new VideoPlayer({
            container: targetContainer, playerType: 'youtube', videoId: data.id,
            controls: true, autoplay: autoplay, startTime: startTime,
          });
        }, 0);
      };

      const openTheater = () => {
        let currentTime = 0, isPlaying = true;
        if (playerWrapper.player && playerWrapper.player.isReady) {
          currentTime = playerWrapper.player.getCurrentRawTime();
          isPlaying = playerWrapper.player.isPlaying();
        }

        // Build the overlay
        const overlay = makeElement('div', {className: 'ps-theater-overlay'});

        // Video area
        const vidArea = makeElement('div', {className: 'ps-theater-video-area'});
        vidArea.appendChild(payload);

        // Title
        vidArea.appendChild(makeElement('div', {className: 'ps-theater-title'}, data.title));

        // Close button
        const closeTheater = () => {
          let exitTime = 0, exitPlaying = false;
          if (playerWrapper.player && playerWrapper.player.isReady) {
            exitTime = playerWrapper.player.getCurrentRawTime();
            exitPlaying = playerWrapper.player.isPlaying();
          }
          overlay.remove();
          videoFrame.appendChild(payload);
          document.body.style.overflow = '';
          rebuildPlayer(ytContainer, exitPlaying, exitTime);
        };
        vidArea.appendChild(makeElement('button', {className: 'ps-theater-close', onclick: closeTheater}, '×'));
        overlay.appendChild(vidArea);

        // Chapters panel
        const bottomPanel = makeElement('div', {className: 'ps-theater-bottom'});
        sections.forEach(sec => {
          const row = makeElement('div', {
            className: 'ps-theater-section',
            onclick: () => {
              if (playerWrapper.player && playerWrapper.player.isReady) {
                playerWrapper.player.seekTo(sec.time);
                playerWrapper.player.play();
              }
            }
          },
            makeElement('div', {className: 'ps-theater-section-time'}, formatTime(sec.time)),
            makeElement('div', {className: 'ps-theater-section-info'},
              makeElement('div', {className: 'ps-theater-section-label'}, sec.label),
              sec.description ? makeElement('div', {className: 'ps-theater-section-desc'}, sec.description) : null
            ),
          );
          bottomPanel.appendChild(row);
        });
        overlay.appendChild(bottomPanel);

        // ESC key to close
        const escHandler = (e) => {if (e.key === 'Escape') {closeTheater(); document.removeEventListener('keydown', escHandler);} };
        document.addEventListener('keydown', escHandler);

        document.body.style.overflow = 'hidden';
        document.body.appendChild(overlay);
        rebuildPlayer(ytContainer, isPlaying, currentTime);
      };

      videoHeader.appendChild(makeElement('button', {
        className: 'ps-theater-trigger',
        onclick: openTheater,
      }, '▶ Theater Mode'));
      spread.appendChild(videoHeader);
      spread.appendChild(videoFrame);

      const chapters = makeElement('div', {className: 'ps-chapters'});
      sections.forEach((sec, si) => {
        const ch = makeElement('div', {
          className: 'ps-chapter', onclick: ed ? null : () => {
            if (playerWrapper.player && playerWrapper.player.isReady) {playerWrapper.player.seekTo(sec.time); playerWrapper.player.play();}
          }
        });
        if (ed) {
          ch.appendChild(makeElement('div', {className: 'ps-chapter-time'}, makeElement('input', {className: 'ps-time-input', type: 'text', value: formatTime(sec.time)})));
        } else {
          ch.appendChild(makeElement('div', {className: 'ps-chapter-time'}, formatTime(sec.time)));
        }
        ch.appendChild(makeElement('div', {className: 'ps-chapter-label' + (ed ? ' ps-editable' : ''), contentEditable: ed ? 'true' : 'false'}, sec.label));
        const dscEl = makeElement('div', {className: 'ps-chapter-desc' + (ed ? ' ps-editable' : '')});
        dscEl.contentEditable = ed ? 'true' : 'false';
        dscEl.innerHTML = sec.description || '';
        ch.appendChild(dscEl);
        if (ed) {
          ch.appendChild(makeElement('button', {
            className: 'ps-delete-section',
            onclick: (e) => {e.stopPropagation(); this._harvestEdits(); data.sections.splice(si, 1); this._rerender();},
          }, '×'));
        }
        chapters.appendChild(ch);
      });

      if (ed) {
        chapters.appendChild(makeElement('div', {
          className: 'ps-chapter',
          style: {cursor: 'pointer', textAlign: 'center', color: 'var(--ps-faint)', borderStyle: 'dashed'},
          onclick: () => {this._harvestEdits(); data.sections.push({time: 0, label: 'New Section', description: 'Description here.'}); this._rerender();},
        }, '+ Add Section'));
      }
      spread.appendChild(chapters);

      const btnRow = makeElement('div', {style: {display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px'}});

      if (ed) {
        btnRow.appendChild(makeElement('button', {
          className: 'ps-edit-btn danger',
          onclick: () => {this._harvestEdits(); this.videos.splice(idx, 1); this._rerender();},
        }, 'Remove Project'));
      }
      spread.appendChild(btnRow);
      page.appendChild(spread);
      if (idx < this.videos.length - 1) page.appendChild(makeElement('hr', {className: 'ps-divider'}));

      setTimeout(() => {rebuildPlayer(ytContainer, false, 0); this.players.push(playerWrapper);}, 0);
    });

    if (ed) {
      page.appendChild(makeElement('button', {
        className: 'ps-theater-trigger',
        style: {width: '100%', justifyContent: 'center', marginTop: '40px', padding: '14px 28px', fontSize: '0.9rem'},
        onclick: () => {
          this._harvestEdits();
          this.videos.push({id: 'dQw4w9WgXcQ', title: 'New Project', subtitle: 'Subtitle here', description: 'Describe this project.', sections: [{time: 0, label: 'First Section', description: 'Description here.'}]});
          this._rerender();
        },
      }, '+ Add Project'));
    }

    this.container.appendChild(page);
  }

  static ps_state() {
    if (!this._state) this._state = {
      THEMES: {
        editorial: { label: 'Editorial', fonts: 'DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700', headingFont: "'DM Serif Display', Georgia, serif", bodyFont: "'DM Sans', system-ui, sans-serif", bg: '#f4f1eb', pageBg: '#f4f1eb', text: '#2a2a2a', heading: '#1a1a1a', muted: '#666', subtle: '#888', faint: '#999', border: '#d4d0c8', borderLight: '#e8e4dc', accent: '#b8860b', accentHover: '#d4a017', cardBg: '#f4f1eb', btnBg: '#1a1a1a', btnText: '#f4f1eb', btnHover: '#333', chapterHover: 'rgba(0,0,0,0.03)', inputBg: '#fff', inputBorder: '#d4d0c8', inputText: '#1a1a1a', videoBg: '#1a1a1a', videoShadow: 'rgba(0,0,0,0.15)', editHighlight: 'rgba(184,134,11,0.06)' },
        midnight: { label: 'Midnight', fonts: 'Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400', headingFont: "'Playfair Display', Georgia, serif", bodyFont: "'Inter', system-ui, sans-serif", bg: '#0a0a0f', pageBg: '#0a0a0f', text: '#d4d4d8', heading: '#fafafa', muted: '#a1a1aa', subtle: '#71717a', faint: '#52525b', border: '#27272a', borderLight: '#1e1e22', accent: '#818cf8', accentHover: '#a5b4fc', cardBg: '#0a0a0f', btnBg: '#818cf8', btnText: '#0a0a0f', btnHover: '#a5b4fc', chapterHover: 'rgba(255,255,255,0.03)', inputBg: '#18181b', inputBorder: '#27272a', inputText: '#fafafa', videoBg: '#000', videoShadow: 'rgba(0,0,0,0.5)', editHighlight: 'rgba(129,140,248,0.08)' },
        forest: { label: 'Forest', fonts: 'Lora:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@300;400;500;600', headingFont: "'Lora', Georgia, serif", bodyFont: "'Source Sans 3', system-ui, sans-serif", bg: '#1a2318', pageBg: '#1a2318', text: '#c8d6c0', heading: '#e8f0e4', muted: '#8fa688', subtle: '#6b8563', faint: '#4d6347', border: '#2d3b28', borderLight: '#253020', accent: '#7cb342', accentHover: '#9ccc65', cardBg: '#1a2318', btnBg: '#7cb342', btnText: '#1a2318', btnHover: '#9ccc65', chapterHover: 'rgba(124,179,66,0.06)', inputBg: '#212d1e', inputBorder: '#2d3b28', inputText: '#e8f0e4', videoBg: '#111a0f', videoShadow: 'rgba(0,0,0,0.4)', editHighlight: 'rgba(124,179,66,0.08)' },
        rose: { label: 'Rosé', fonts: 'Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Nunito+Sans:wght@300;400;500;600', headingFont: "'Cormorant Garamond', Georgia, serif", bodyFont: "'Nunito Sans', system-ui, sans-serif", bg: '#fdf2f4', pageBg: '#fdf2f4', text: '#4a3035', heading: '#2d1a1e', muted: '#8a6068', subtle: '#b08890', faint: '#c4a0a8', border: '#e8c8cc', borderLight: '#f0d8dc', accent: '#c2185b', accentHover: '#e91e63', cardBg: '#fdf2f4', btnBg: '#c2185b', btnText: '#fff', btnHover: '#e91e63', chapterHover: 'rgba(194,24,91,0.04)', inputBg: '#fff', inputBorder: '#e8c8cc', inputText: '#2d1a1e', videoBg: '#2d1a1e', videoShadow: 'rgba(45,26,30,0.15)', editHighlight: 'rgba(194,24,91,0.06)' },
        brutalist: { label: 'Brutalist', fonts: 'Space+Mono:wght@400;700&family=Archivo+Black', headingFont: "'Archivo Black', Impact, sans-serif", bodyFont: "'Space Mono', monospace", bg: '#ffffff', pageBg: '#ffffff', text: '#000000', heading: '#000000', muted: '#444', subtle: '#666', faint: '#888', border: '#000', borderLight: '#000', accent: '#ff0000', accentHover: '#cc0000', cardBg: '#fff', btnBg: '#000', btnText: '#fff', btnHover: '#333', chapterHover: 'rgba(255,0,0,0.05)', inputBg: '#fff', inputBorder: '#000', inputText: '#000', videoBg: '#000', videoShadow: 'none', editHighlight: 'rgba(255,0,0,0.06)' },
        ocean: { label: 'Deep Ocean', fonts: 'Outfit:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,400;0,700;1,400', headingFont: "'Fraunces', Georgia, serif", bodyFont: "'Outfit', system-ui, sans-serif", bg: '#0b1628', pageBg: '#0b1628', text: '#b0c4de', heading: '#e0ecff', muted: '#7a94b4', subtle: '#5a7494', faint: '#3d5574', border: '#1a2d4a', borderLight: '#152440', accent: '#00b4d8', accentHover: '#48cae4', cardBg: '#0b1628', btnBg: '#00b4d8', btnText: '#0b1628', btnHover: '#48cae4', chapterHover: 'rgba(0,180,216,0.06)', inputBg: '#0f1e38', inputBorder: '#1a2d4a', inputText: '#e0ecff', videoBg: '#060e1a', videoShadow: 'rgba(0,0,0,0.5)', editHighlight: 'rgba(0,180,216,0.08)' },
        warm: { label: 'Warm Minimal', fonts: 'IBM+Plex+Serif:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Sans:wght@300;400;500;600', headingFont: "'IBM Plex Serif', Georgia, serif", bodyFont: "'IBM Plex Sans', system-ui, sans-serif", bg: '#faf8f5', pageBg: '#faf8f5', text: '#3d3530', heading: '#1c1714', muted: '#7a6e64', subtle: '#a09488', faint: '#c0b4a8', border: '#e0d8cc', borderLight: '#ece4d8', accent: '#c97030', accentHover: '#e08840', cardBg: '#faf8f5', btnBg: '#1c1714', btnText: '#faf8f5', btnHover: '#3d3530', chapterHover: 'rgba(201,112,48,0.04)', inputBg: '#fff', inputBorder: '#e0d8cc', inputText: '#1c1714', videoBg: '#1c1714', videoShadow: 'rgba(28,23,20,0.12)', editHighlight: 'rgba(201,112,48,0.06)' },
        neon: { label: 'Neon', fonts: 'Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700', headingFont: "'Orbitron', sans-serif", bodyFont: "'Rajdhani', system-ui, sans-serif", bg: '#0a0a0a', pageBg: '#0a0a0a', text: '#d0d0d0', heading: '#fff', muted: '#888', subtle: '#666', faint: '#444', border: '#222', borderLight: '#1a1a1a', accent: '#39ff14', accentHover: '#7fff00', cardBg: '#0a0a0a', btnBg: '#39ff14', btnText: '#000', btnHover: '#7fff00', chapterHover: 'rgba(57,255,20,0.05)', inputBg: '#111', inputBorder: '#333', inputText: '#39ff14', videoBg: '#000', videoShadow: '0 0 30px rgba(57,255,20,0.15)', editHighlight: 'rgba(57,255,20,0.08)' }
      }
    };
    return this._state;
  }

  static get THEMES() { return this.ps_state().THEMES; }
}

