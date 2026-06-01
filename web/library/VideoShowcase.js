class VideoShowcase {
  /**
   * Creates a video showcase component with mini preview + dialog viewer.
   *
   * @param {Object} options
   * @param {Array} options.videos - Array of video objects:
   *   { id, title, subtitle?, description?, sections: [{ time, label, description? }] }
   * @param {string} [options.heading] - Optional heading above the showcase
   * @param {string} [options.subheading] - Optional subheading text
   * @param {string} [options.layout='grid'] - 'grid' | 'list' | 'single'
   * @param {Object} [options.theme] - Color overrides { accent, accentHover, cardBg, ... }
   */
  constructor(options = {}) {
    this.options = {
      videos: [],
      heading: null,
      subheading: null,
      layout: 'grid',
      theme: {},
      ...options,
    };
    this.players = [];
    this.activeDialog = null;
    this._stylesInjected = false;
  }

  /**
   * Renders the showcase into a container element and returns it.
   * Can also be called with no args to just get back a DOM element.
   */
  render(container) {
    this._injectStyles();
    const el = this._build();
    if (container) container.appendChild(el);
    return el;
  }

  _build() {
    const wrapper = makeElement('div', { className: 'vs-showcase' });

    if (this.options.heading) {
      wrapper.appendChild(makeElement('h2', { className: 'vs-heading' }, this.options.heading));
    }
    if (this.options.subheading) {
      wrapper.appendChild(makeElement('p', { className: 'vs-subheading' }, this.options.subheading));
    }

    const layout = this.options.layout;
    const gridClass = layout === 'single' ? 'vs-grid vs-single'
      : layout === 'list' ? 'vs-grid vs-list'
      : 'vs-grid';

    const grid = makeElement('div', { className: gridClass });

    this.options.videos.forEach((video, idx) => {
      grid.appendChild(this._buildCard(video, idx));
    });

    wrapper.appendChild(grid);
    return wrapper;
  }

  _buildCard(video, idx) {
    const thumbUrl = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;

    const overlay = makeElement('div', { className: 'vs-card-overlay' },
      makeElement('div', { className: 'vs-play-btn' },
        makeElement('svg:svg', { viewBox: '0 0 24 24', width: '32', height: '32' },
          makeElement('svg:path', {
            d: 'M8 5v14l11-7z',
            fill: '#fff',
          })
        )
      )
    );

    const thumb = makeElement('div', { className: 'vs-card-thumb' },
      makeElement('img', {
        src: thumbUrl,
        alt: video.title || 'Video thumbnail',
        loading: 'lazy',
      }),
      overlay
    );

    const info = makeElement('div', { className: 'vs-card-info' },
      makeElement('h3', { className: 'vs-card-title' }, video.title || 'Untitled'),
      video.subtitle
        ? makeElement('p', { className: 'vs-card-subtitle' }, video.subtitle)
        : null,
      video.sections && video.sections.length > 0
        ? makeElement('span', { className: 'vs-card-chapters' },
            video.sections.length + ' chapter' + (video.sections.length !== 1 ? 's' : ''))
        : null
    );

    const card = makeElement('div', {
      className: 'vs-card',
      onclick: () => this._openDialog(video),
    }, thumb, info);

    return card;
  }

  _openDialog(video) {
    // Close any existing dialog from this showcase
    if (this.activeDialog) {
      try { this.activeDialog.close(); } catch(e) {}
      this.activeDialog = null;
    }

    const formatTime = (secs) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m + ':' + String(s).padStart(2, '0');
    };

    // --- Build dialog content ---
    const contentWrap = makeElement('div', { className: 'vs-dialog-content' });

    // Video container
    const ytContainer = makeElement('div', { className: 'vs-dialog-video' });
    contentWrap.appendChild(ytContainer);

    // Chapter list
    const sections = video.sections || [];
    if (sections.length > 0) {
      const chapterList = makeElement('div', { className: 'vs-dialog-chapters' });

      sections.forEach((sec) => {
        const row = makeElement('div', {
          className: 'vs-dialog-chapter',
          onclick: () => {
            if (player && player.isReady) {
              player.seekTo(sec.time);
              player.play();
            }
          },
        },
          makeElement('span', { className: 'vs-chapter-time' }, formatTime(sec.time)),
          makeElement('div', { className: 'vs-chapter-body' },
            makeElement('div', { className: 'vs-chapter-label' }, sec.label),
            sec.description
              ? makeElement('div', { className: 'vs-chapter-desc' }, sec.description)
              : null
          )
        );
        chapterList.appendChild(row);
      });

      contentWrap.appendChild(chapterList);
    }

    // Description
    if (video.description) {
      const desc = makeElement('div', { className: 'vs-dialog-description' });
      desc.innerHTML = video.description;
      contentWrap.appendChild(desc);
    }

    // --- Create the dialog ---
    const dialogTitle = video.title || 'Video';
    const dialog = UITools.makeDialog({
      title: dialogTitle,
      content: contentWrap,
      buttons: [],
      width: '900px',
      height: '620px',
      noPadding: true,
      allowMaximize: true,
      stateId: 'video-showcase-' + (video.id || ''),
      onClose: () => {
        if (player) {
          try { player.destroy(); } catch(e) {}
        }
        this.activeDialog = null;
      },
      onResize: () => {
        // VideoPlayer auto-fills its container, no action needed
      },
    });

    this.activeDialog = dialog;

    // --- Initialize the video player after dialog is in DOM ---
    let player = null;
    setTimeout(() => {
      player = new VideoPlayer({
        container: ytContainer,
        playerType: 'youtube',
        videoId: video.id,
        controls: true,
        autoplay: true,
        startTime: 0,
      });
      this.players.push(player);
    }, 100);
  }

  destroy() {
    this.players.forEach(p => { try { p.destroy(); } catch(e) {} });
    this.players = [];
    if (this.activeDialog) {
      try { this.activeDialog.close(); } catch(e) {}
      this.activeDialog = null;
    }
  }

  _injectStyles() {
    if (this._stylesInjected) return;
    this._stylesInjected = true;

    const accent = this.options.theme.accent || '#3b82f6';
    const accentHover = this.options.theme.accentHover || '#60a5fa';

    applyCss(`
      /* === VideoShowcase === */
      .vs-showcase {
        width: 100%;
        position: relative;
        z-index: 1;
      }
      .vs-heading {
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: 1.8rem;
        font-weight: 700;
        margin: 0 0 8px 0;
        background: linear-gradient(135deg, #ffffff 30%, #a5f3fc 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
      }
      .vs-subheading {
        text-align: center;
        color: #aaa;
        font-size: 1rem;
        margin: 0 0 32px 0;
        line-height: 1.5;
      }

      /* --- Grid layout --- */
      .vs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        width: 100%;
      }
      .vs-grid.vs-single {
        grid-template-columns: 1fr;
        max-width: 600px;
        margin: 0 auto;
      }
      .vs-grid.vs-list {
        grid-template-columns: 1fr;
      }

      /* --- Card --- */
      .vs-card {
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
      }
      .vs-card:hover {
        transform: translateY(-4px);
        border-color: ${accent}44;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px ${accent}22;
      }

      /* Thumbnail area */
      .vs-card-thumb {
        position: relative;
        width: 100%;
        aspect-ratio: 16/9;
        overflow: hidden;
        background: #000;
      }
      .vs-card-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s ease, filter 0.4s ease;
      }
      .vs-card:hover .vs-card-thumb img {
        transform: scale(1.05);
        filter: brightness(0.7);
      }

      /* Play button overlay */
      .vs-card-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .vs-card:hover .vs-card-overlay {
        opacity: 1;
      }
      .vs-play-btn {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding-left: 3px;
        transition: transform 0.2s ease, background 0.2s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }
      .vs-card:hover .vs-play-btn {
        transform: scale(1.1);
        background: ${accent}cc;
      }

      /* Card info */
      .vs-card-info {
        padding: 16px 18px 18px;
      }
      .vs-card-title {
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: 1.15rem;
        font-weight: 600;
        color: #fff;
        margin: 0 0 4px 0;
      }
      .vs-card-subtitle {
        font-size: 0.9rem;
        color: #999;
        margin: 0 0 8px 0;
        line-height: 1.4;
      }
      .vs-card-chapters {
        font-size: 0.8rem;
        color: ${accent};
        font-weight: 500;
        letter-spacing: 0.3px;
      }

      /* --- Dialog content --- */
      .vs-dialog-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #0a0a0f;
        color: #e0e0e0;
        min-height: 0;
      }
      .vs-dialog-video {
        width: 100%;
        aspect-ratio: 16/9;
        background: #000;
        flex-shrink: 0;
        position: relative;
      }
      .vs-dialog-video iframe {
        width: 100% !important;
        height: 100% !important;
      }

      /* Chapter list inside dialog */
      .vs-dialog-chapters {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .vs-dialog-chapters::-webkit-scrollbar { width: 6px; }
      .vs-dialog-chapters::-webkit-scrollbar-track { background: transparent; }
      .vs-dialog-chapters::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

      .vs-dialog-chapter {
        display: flex;
        gap: 14px;
        padding: 14px 18px;
        cursor: pointer;
        transition: background 0.15s ease;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        align-items: flex-start;
      }
      .vs-dialog-chapter:last-child { border-bottom: none; }
      .vs-dialog-chapter:hover {
        background: rgba(255, 255, 255, 0.04);
      }

      .vs-chapter-time {
        font-family: 'Fira Code', monospace;
        font-size: 0.85rem;
        color: ${accent};
        font-weight: 500;
        min-width: 44px;
        padding-top: 1px;
        flex-shrink: 0;
      }
      .vs-chapter-body { flex: 1; min-width: 0; }
      .vs-chapter-label {
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: 1rem;
        font-weight: 500;
        color: #eee;
        margin-bottom: 3px;
      }
      .vs-chapter-desc {
        font-size: 0.85rem;
        color: #888;
        line-height: 1.5;
      }

      /* Description at bottom */
      .vs-dialog-description {
        padding: 16px 18px;
        font-size: 0.9rem;
        color: #999;
        line-height: 1.6;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        flex-shrink: 0;
      }

      /* --- Responsive --- */
      @media (max-width: 640px) {
        .vs-grid {
          grid-template-columns: 1fr;
        }
        .vs-heading {
          font-size: 1.4rem;
        }
        .vs-card-info {
          padding: 12px 14px 14px;
        }
      }
    `, 'video-showcase-styles');
  }

  /**
   * Auto-popup a video dialog on first visit. Checks localStorage to avoid
   * showing again after dismissed. Returns a small "reopen" button element
   * that can be placed anywhere in the host page's UI.
   *
   * @param {Object} options
   * @param {Object} options.video - Single video object { id, title, subtitle, description, sections }
   * @param {string} options.storageKey - localStorage key to track dismissal (e.g. 'yolo-intro-video')
   * @param {string} [options.startHereText='Start Here'] - Text for the overlay prompt
   * @param {string} [options.reopenLabel='📺 Intro Video'] - Label for the reopen button
   * @param {boolean} [options.autoplay=false] - Auto-play video when dialog opens
   * @param {Object} [options.theme] - Color overrides
   * @param {string} [options.dialogWidth='900px']
   * @param {string} [options.dialogHeight='620px']
   * @returns {{ reopenButton: HTMLElement, openDialog: Function }}
   */
  static autoPopup(options = {}) {
    const {
      video,
      storageKey = 'vs-intro-seen',
      startHereText = 'Start Here',
      reopenLabel = '📺 Intro Video',
      autoplay = false,
      theme = {},
      dialogWidth = '900px',
      dialogHeight = '620px',
    } = options;

    if (!video) {
      console.warn('VideoShowcase.autoPopup: no video provided');
      return { reopenButton: makeElement('span'), openDialog: () => {} };
    }

    const accent = theme.accent || '#3b82f6';
    const instance = new VideoShowcase({ videos: [video], theme });
    instance._injectStyles();

    // Inject auto-popup specific styles
    applyCss(`
      /* Start Here overlay inside the dialog video area */
      .vs-start-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(6px);
        z-index: 10;
        cursor: pointer;
        transition: opacity 0.4s ease;
      }
      .vs-start-overlay:hover .vs-start-btn {
        transform: scale(1.08);
      }
      .vs-start-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 36px;
        background: ${accent};
        color: #fff;
        border: none;
        border-radius: 12px;
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: 1.2rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.25s ease, box-shadow 0.25s ease;
        box-shadow: 0 4px 24px ${accent}66;
        pointer-events: none; /* parent handles click */
      }
      .vs-start-play-icon {
        width: 24px;
        height: 24px;
      }
      .vs-start-subtitle {
        margin-top: 12px;
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.9rem;
      }

      /* Reopen button — small, unobtrusive */
      .vs-reopen-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.8rem;
        font-family: system-ui, sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .vs-reopen-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        border-color: ${accent}44;
        color: rgba(255, 255, 255, 0.9);
      }
    `, 'video-showcase-autopop-styles');

    let activePlayer = null;
    let activeDialog = null;

    const formatTime = (secs) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m + ':' + String(s).padStart(2, '0');
    };

    const openDialog = (showOverlay) => {
      if (activeDialog) {
        try { activeDialog.close(); } catch(e) {}
        activeDialog = null;
      }
      if (activePlayer) {
        try { activePlayer.destroy(); } catch(e) {}
        activePlayer = null;
      }

      const contentWrap = makeElement('div', { className: 'vs-dialog-content' });

      // Video area (with optional Start Here overlay)
      const videoArea = makeElement('div', { className: 'vs-dialog-video' });

      if (showOverlay) {
        const playIcon = makeElement('svg:svg', {
          viewBox: '0 0 24 24', width: '24', height: '24', className: 'vs-start-play-icon'
        }, makeElement('svg:path', { d: 'M8 5v14l11-7z', fill: '#fff' }));

        const overlay = makeElement('div', { className: 'vs-start-overlay' },
          makeElement('div', { className: 'vs-start-btn' }, playIcon, startHereText),
          video.subtitle
            ? makeElement('div', { className: 'vs-start-subtitle' }, video.subtitle)
            : null
        );

        overlay.addEventListener('click', () => {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 400);
          if (activePlayer && activePlayer.isReady) {
            activePlayer.play();
          }
          // Mark as seen
          try { localStorage.setItem(storageKey, 'true'); } catch(e) {}
        });

        videoArea.appendChild(overlay);
      }

      contentWrap.appendChild(videoArea);

      // Chapters
      const sections = video.sections || [];
      if (sections.length > 0) {
        const chapterList = makeElement('div', { className: 'vs-dialog-chapters' });
        sections.forEach((sec) => {
          const row = makeElement('div', {
            className: 'vs-dialog-chapter',
            onclick: () => {
              if (activePlayer && activePlayer.isReady) {
                activePlayer.seekTo(sec.time);
                activePlayer.play();
              }
              // Remove overlay if still visible
              const ol = videoArea.querySelector('.vs-start-overlay');
              if (ol) { ol.style.opacity = '0'; setTimeout(() => ol.remove(), 400); }
              try { localStorage.setItem(storageKey, 'true'); } catch(e) {}
            },
          },
            makeElement('span', { className: 'vs-chapter-time' }, formatTime(sec.time)),
            makeElement('div', { className: 'vs-chapter-body' },
              makeElement('div', { className: 'vs-chapter-label' }, sec.label),
              sec.description
                ? makeElement('div', { className: 'vs-chapter-desc' }, sec.description)
                : null
            )
          );
          chapterList.appendChild(row);
        });
        contentWrap.appendChild(chapterList);
      }

      if (video.description) {
        const desc = makeElement('div', { className: 'vs-dialog-description' });
        desc.innerHTML = video.description;
        contentWrap.appendChild(desc);
      }

      activeDialog = UITools.makeDialog({
        title: video.title || 'Intro Video',
        content: contentWrap,
        buttons: [],
        width: dialogWidth,
        height: dialogHeight,
        noPadding: true,
        allowMaximize: true,
        stateId: 'vs-autopop-' + storageKey,
        onClose: () => {
          if (activePlayer) {
            try { activePlayer.destroy(); } catch(e) {}
            activePlayer = null;
          }
          activeDialog = null;
          // Mark as seen on close too
          try { localStorage.setItem(storageKey, 'true'); } catch(e) {}
        },
      });

      setTimeout(() => {
        activePlayer = new VideoPlayer({
          container: videoArea,
          playerType: 'youtube',
          videoId: video.id,
          controls: true,
          autoplay: showOverlay ? false : autoplay,
          startTime: 0,
        });
      }, 100);
    };

    // Build the reopen button
    const reopenButton = makeElement('button', {
      className: 'vs-reopen-btn',
      onclick: () => openDialog(false),
    }, reopenLabel);

    // Check if first visit
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === 'true'; } catch(e) {}

    if (!seen) {
      // Auto-open with overlay after a short delay to let the host page settle
      setTimeout(() => openDialog(true), 800);
    }

    return { reopenButton, openDialog };
  }


  

  
}

if (typeof globalThis !== 'undefined') {
  globalThis.VideoShowcase = VideoShowcase;
}
if (typeof window !== 'undefined') {
  window.VideoShowcase = VideoShowcase;
}
