class YouTubeContent {
  constructor() {
      this.processedCount = 0;
      this.isRunning = false;
      this.messageQueue = [];
      this.addedVideos = new Map();
      this.currentVideoId = null;
      this.connected = false;
      this.lastHeartbeat = 0;
      this.statusEl = null;
      this.queueStorageKey = 'yt_client_pending_queue';
      this.currentSessionId = null;
      this.lastPlaylistHash = null;
      this._loadPersistentQueue();

      this.focusPlayerTab = true;
      this._initFocusSetting();
    }

  injectStyles() {
      const css = `
        .yt-playlist-widget { display: inline-flex !important; align-items: center !important; margin-left: 8px !important; gap: 4px !important; z-index: 2000 !important; }
        .yt-playlist-btn { display: inline-flex !important; align-items: center !important; justify-content: center !important; width: 24px !important; height: 24px !important; background-color: #cc0000 !important; color: #fff !important; border: 1px solid rgba(255,255,255,0.2) !important; border-radius: 4px !important; font-size: 14px !important; font-weight: bold !important; cursor: pointer !important; transition: all 0.2s !important; }
        .yt-playlist-btn:hover { transform: scale(1.1); filter: brightness(1.2); }
        .yt-playlist-btn.added { background-color: #008800 !important; border-color: #00aa00 !important; }
        .yt-playlist-btn.pending { background-color: #ff8800 !important; border-color: #ffaa00 !important; animation: bmo-yt-pulse 1s infinite alternate !important; }
        .yt-playlist-btn.error { background-color: #d32f2f !important; border-color: #f44336 !important; }
        .yt-playlist-btn.play-once { background-color: #ff8800 !important; border-color: #ffaa00 !important; }
        .yt-playlist-btn.play-now { background-color: #0066cc !important; border-color: #0088ff !important; }
        .yt-playlist-btn.current-video { width: 30px !important; height: 30px !important; border: 2px solid #fff !important; box-shadow: 0 0 5px rgba(0,0,0,0.5); }

        #bmo-yt-toast { position: fixed; top: 70px; right: 20px; z-index: 99999; padding: 12px 20px; border-radius: 8px; color: white; font-family: Roboto, Arial, sans-serif; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); transition: opacity 0.3s ease; pointer-events: none; }
        .bmo-toast-success { background: #2e7d32; border: 1px solid #4caf50; }
        .bmo-toast-error { background: #c62828; border: 1px solid #ef5350; }
        .bmo-toast-warn { background: #ef6c00; border: 1px solid #ff9800; }

        #bmo-status-container { position: fixed; top: 56px; right: 24px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; pointer-events: auto; }
        #bmo-status-launcher { width: 28px; height: 28px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(4px); }
        #bmo-status-launcher:hover { background: rgba(50,50,50,0.9); transform: scale(1.1); border-color: #fff; }
        .bmo-dot { width: 3px; height: 3px; background: #ccc; border-radius: 50%; }
        
        #bmo-status-launcher.flash { background: #007acc; border-color: #00aaff; animation: bmo-flash 1s infinite; }
        #bmo-status-launcher.flash .bmo-dot { background: #fff; }
        
        @keyframes bmo-yt-pulse {
          from { opacity: 0.65; }
          to { opacity: 1; }
        }
        @keyframes bmo-flash { 0% { box-shadow: 0 0 0 0 rgba(0, 122, 204, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(0, 122, 204, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 122, 204, 0); } }

        #bmo-yt-status-box { display: none; width: 320px; max-height: 300px; background: rgba(18,18,18,0.98); border: 1px solid #333; border-radius: 8px; margin-top: 8px; flex-direction: column; box-shadow: 0 8px 24px rgba(0,0,0,0.7); overflow: hidden; font-family: 'Consolas', monospace; font-size: 11px; color: #0f0; }
        #bmo-yt-status-header { padding: 8px 12px; background: #222; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; color: #eee; font-family: system-ui, sans-serif; font-weight: 600; font-size: 12px; }
        #bmo-yt-status-content { flex: 1; overflow-y: auto; padding: 10px; scrollbar-width: thin; scrollbar-color: #444 #111; }
        .bmo-status-line { margin-bottom: 3px; border-bottom: 1px solid #222; padding-bottom: 2px; word-break: break-all; white-space: pre-wrap; line-height: 1.3; }
        
        .bmo-btn-xs { background: #333; border: 1px solid #555; color: #ccc; padding: 3px 8px; font-size: 10px; border-radius: 3px; cursor: pointer; transition: background 0.1s; }
        .bmo-btn-xs:hover { background: #444; color: #fff; }
        .bmo-close-btn { background: none; border: none; color: #888; font-size: 16px; cursor: pointer; padding: 0 4px; line-height: 1; }
        .bmo-close-btn:hover { color: #fff; }

        player-middle-controls:has(button[aria-label*="Pause"]),
        .ytwPlayerMiddleControlsHost:has(button[aria-label*="Pause"]) {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        player-middle-controls:has(button[aria-label*="Play"]),
        .ytwPlayerMiddleControlsHost:has(button[aria-label*="Play"]) {
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }

        .bmo-yt-context-menu {
          position: fixed !important;
          z-index: 2147483647 !important;
          background: rgba(28, 28, 28, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5) !important;
          padding: 6px 0 !important;
          min-width: 140px !important;
          font-family: Roboto, Arial, sans-serif !important;
          font-size: 12px !important;
          color: #eee !important;
          backdrop-filter: blur(8px) !important;
          user-select: none !important;
          pointer-events: auto !important;
          text-align: left !important;
        }
        .bmo-yt-context-item {
          padding: 6px 12px !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          transition: background 0.15s !important;
          color: #eee !important;
        }
        .bmo-yt-context-item:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
        }
        .bmo-yt-context-divider {
          height: 1px !important;
          background: rgba(255, 255, 255, 0.1) !important;
          margin: 4px 0 !important;
        }
        .bmo-yt-context-checkbox-label {
          padding: 6px 12px !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          cursor: pointer !important;
          color: #aaa !important;
          font-size: 11px !important;
        }
        .bmo-yt-context-checkbox {
          margin: 0 !important;
          cursor: pointer !important;
          accent-color: #cc0000 !important;
        }
      `;

      if (!document.getElementById('yt-playlist-styles')) {
        const style = document.createElement('style');
        style.id = 'yt-playlist-styles';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        console.log('BMO: Styles injected');
      }
    }

  startScanning() {
    this.scan();
    this.intervalId = setInterval(() => {
      if (!this.isRunning) return;
      this.scan();
    }, 1500);

    this.scrollHandler = () => {
      if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => this.scan(), 200);
    };
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  showNotification(text, type = 'success') {
    let toast = document.getElementById('bmo-yt-toast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'bmo-yt-toast';
    toast.className = `bmo-toast-${type}`;
    toast.textContent = text;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  detectCurrentVideo() {
      const url = window.location.href;
      const match = url.match(/[?&]v=([^&]+)/);
      const newId = match ? match[1] : null;

      // Unconditionally sync video ID and add the queue button if a new video is active
      if (newId !== this.currentVideoId) {
        this.currentVideoId = newId;
        if (newId) {
          setTimeout(() => this.addCurrentVideoButton(), 500);
        }
      }
    }

  updateAllButtons() {
      document.querySelectorAll('.yt-playlist-widget').forEach((widget) => {
        const videoId = widget.getAttribute('data-video-id');
        if (!videoId) return;
        const addBtn = widget.children[0];
        
        // Skip updating buttons that are in an active error or pending feedback cycle
        if (addBtn.classList.contains('error') || addBtn.classList.contains('pending')) {
          if (this.addedVideos.has(videoId)) {
            addBtn.classList.remove('pending');
            addBtn.textContent = '✓';
            addBtn.className = 'yt-playlist-btn added';
          }
          return;
        }

        if (this.addedVideos.has(videoId)) {
          addBtn.textContent = '✓';
          addBtn.className = 'yt-playlist-btn added';
        } else {
          addBtn.textContent = '▶';
          addBtn.className = 'yt-playlist-btn';
        }
      });
    }

  _makeElement(type, props = {}, ...children) {
    const el = document.createElement(type);
    Object.entries(props).forEach(([key, val]) => {
      if (key === 'className') el.className = val;
      else if (key === 'style' && typeof val === 'object')
        Object.assign(el.style, val);
      else if (key.startsWith('on') && typeof val === 'function')
        el.addEventListener(key.substring(2).toLowerCase(), val);
      else if (typeof val === 'boolean') {
        if (val) el.setAttribute(key, '');
      } else el.setAttribute(key, val);
    });
    children.forEach((c) => {
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else if (c instanceof Node) el.appendChild(c);
    });
    return el;
  }

  _createStatusIndicator() {
    const create = () => {
      if (!document.body) {
        setTimeout(create, 50);
        return;
      }
      const old = document.getElementById('bmo-status-container');
      if (old) old.remove();

      const container = this._makeElement('div', {
        id: 'bmo-status-container',
      });

      // 1. Launcher (Styled purely with CSS to avoid font issues)
      const launcher = this._makeElement('div', {
        id: 'bmo-status-launcher',
        title: 'Connection Status',
        onclick: () => this._toggleStatusBox(),
      });
      // Create the "3 dots" manually
      for (let i = 0; i < 3; i++) {
        launcher.appendChild(
          this._makeElement('div', { className: 'bmo-dot' })
        );
      }

      // 2. Box
      const box = this._makeElement('div', { id: 'bmo-yt-status-box' });

      // Header
      const header = this._makeElement('div', { id: 'bmo-yt-status-header' });
      const title = this._makeElement('span', {}, 'Bridge Log');

      const controls = this._makeElement('div', {
        style: 'display:flex; gap:5px;',
      });

      const copyBtn = this._makeElement(
        'button',
        {
          className: 'bmo-btn-xs',
          onclick: (e) => {
            e.stopPropagation();
            this._copyLogToClipboard();
          },
        },
        'Copy'
      );

      const closeBtn = this._makeElement(
        'button',
        {
          className: 'bmo-close-btn',
          onclick: (e) => {
            e.stopPropagation();
            this._toggleStatusBox(false);
          },
        },
        '×'
      );

      controls.append(copyBtn, closeBtn);
      header.append(title, controls);

      const content = this._makeElement('div', { id: 'bmo-yt-status-content' });

      box.append(header, content);
      container.append(launcher, box);
      document.body.appendChild(container);

      this.statusBox = box;
      this.statusContent = content;
      this.statusLauncher = launcher;
    };
    create();
  }

  _updateStatus(text, type = 'warn') {
    this._logToScreen(`[${type.toUpperCase()}] ${text}`);
  }

  _flushQueue() {
    if (this.messageQueue.length === 0) return;
    const count = this.messageQueue.length;
    this.messageQueue.forEach((payload) => {
      chrome.runtime.sendMessage({
        type: 'YT_Video_Op',
        data: payload,
      });
    });
    this.messageQueue = [];
    if (count > 0) {
      this.showNotification(
        `Applied ${count} queued action${count > 1 ? 's' : ''}`,
        'success'
      );
    }
  }

  computePlaylistHash() {
    const items = [];
    this.addedVideos.forEach((playOnce, id) => {
      items.push(`${id}:${playOnce ? '1' : '0'}`);
    });
    items.sort();
    const str = items.join(',');
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619) | 0;
    }
    return hash >>> 0;
  }

  _loadPersistentQueue() {
    try {
      const saved = sessionStorage.getItem(this.queueStorageKey);
      if (saved) {
        this.messageQueue = JSON.parse(saved);
        console.log(
          `BMO: Loaded ${this.messageQueue.length} queued actions from sessionStorage`
        );
      }
    } catch (e) {
      console.error('BMO: Failed to load persistent queue', e);
      this.messageQueue = [];
    }
  }

  _savePersistentQueue() {
    try {
      sessionStorage.setItem(
        this.queueStorageKey,
        JSON.stringify(this.messageQueue)
      );
    } catch (e) {
      console.error('BMO: Failed to save persistent queue', e);
    }
  }

  _flushPersistentQueue() {
    if (this.messageQueue.length === 0) return;
    if (!this._isContextValid()) {
      this._shutdownSilently();
      return;
    }

    console.log(`BMO: Flushing ${this.messageQueue.length} queued actions`);

    this.messageQueue.forEach((payload) => {
      this.safelySendMessage(
        {
          type: 'YT_Video_Op',
          data: payload,
        },
        (response) => {
          if (response && !response.success) {
            console.warn('BMO: Queued message logic failure', payload);
          }
        }
      );
    });

    const count = this.messageQueue.length;
    this.messageQueue = [];
    this._savePersistentQueue();
    if (count > 0) {
      this.showNotification(
        `Applied ${count} queued action${count > 1 ? 's' : ''}`,
        'success'
      );
    }
  }

  getInsertionPoint(container, context) {
    let target = null;
    let position = 'append'; // 'append', 'before', 'after'

    if (context === 'watchHeader') {
      target =
        container.querySelector('#title h1') ||
        container.querySelector('#title');
    } else if (context === 'playlistPanel') {
      target =
        container.querySelector('#action-buttons') ||
        container.querySelector('#meta');
    } else if (context === 'watchRail') {
      // Try after title, before metadata
      const title =
        container.querySelector('.yt-lockup-metadata-view-model__title') ||
        container.querySelector('#video-title');
      if (title && title.parentNode) {
        target = title;
        position = 'after';
      } else {
        target = container.querySelector('.text-wrapper') || container;
      }
    } else {
      // Grid / History / General (Home screen, Channels, etc)

      // 1. Try Metadata Line (Traditional UI)
      const meta = container.querySelector('#metadata-line');
      if (meta && meta.parentNode) {
        target = meta.parentNode;
        position = 'append';
      }
      // 2. Fallback to Title (New Polymer/Lockup UI)
      else {
        const title =
          container.querySelector('#video-title') ||
          container.querySelector('.yt-lockup-metadata-view-model__title');

        if (title) {
          target = title;

          // CHANGE: Place AFTER the title link to avoid overflow cropping
          if (
            title.classList.contains('yt-lockup-metadata-view-model__title')
          ) {
            position = 'after';
          } else {
            // For the old UI #video-title, we usually place it after
            position = 'after';
          }
        }
      }
    }
    return { target, position };
  }

  _processSurface(selector, context) {
    const containers = document.querySelectorAll(selector);
    containers.forEach((container) => {
      // Avoid processing hidden items or main player
      if (container.closest('#player') || container.hidden) return;

      const data = this.extractVideoData(container, context);
      if (!data || !data.videoId) return;

      // Deduplicate
      const existing = container.querySelector('.yt-playlist-widget');
      if (existing) {
        if (existing.getAttribute('data-video-id') === data.videoId) return;
        existing.remove();
      }

      const { target, position } = this.getInsertionPoint(container, context);
      if (!target) return;

      const widget = this.createWidget(data, false);

      if (position === 'after') {
        if (target.nextSibling) {
          target.parentNode.insertBefore(widget, target.nextSibling);
        } else {
          target.parentNode.appendChild(widget);
        }
      } else if (position === 'before') {
        target.parentNode.insertBefore(widget, target);
      } else {
        target.appendChild(widget);
      }
    });
  }

  addCurrentVideoButton() {
    if (!this.currentVideoId) return;

    // Use specific watch metadata root
    const root = document.querySelector('ytd-watch-metadata');
    if (!root) return;

    const titleEl = root.querySelector('#title h1 yt-formatted-string');
    const parent =
      root.querySelector('#title h1') || root.querySelector('#title');
    if (!parent) return;

    // Check existing
    const existing = parent.querySelector('.yt-playlist-widget');
    if (
      existing &&
      existing.getAttribute('data-video-id') === this.currentVideoId
    )
      return;
    if (existing) existing.remove();

    // Gather Watch Page Data
    const data = {
      videoId: this.currentVideoId,
      title: titleEl
        ? titleEl.textContent.trim()
        : document.title.replace(' - YouTube', ''),
      context: 'watchHeader',
    };

    // Extract views/age from info text
    const info = root.querySelector('#info');
    if (info) {
      const txt = info.textContent;
      if (txt.includes('views')) data.views = txt.split('views')[0] + 'views';
      if (txt.includes('ago')) {
        const parts = txt.split('views');
        if (parts[1]) data.postedAge = parts[1].trim();
      }
    }

    const widget = this.createWidget(data, true);
    parent.appendChild(widget);
  }

  scanRegularVideos() {
    // 1. Grid Items (Home, Channel)
    this._processSurface('ytd-rich-item-renderer', 'grid');
    // 2. Grid (Channel)
    this._processSurface('ytd-grid-video-renderer', 'grid');
    // 3. Watch Rail (Related)
    this._processSurface('ytd-compact-video-renderer', 'watchRail');
    this._processSurface('yt-lockup-view-model', 'watchRail');
    // 4. Playlist Panel
    this._processSurface('ytd-playlist-panel-video-renderer', 'playlistPanel');
    // 5. History / List
    this._processSurface('ytd-video-renderer', 'history');
  }

  createWidget(videoData, isCurrent = false) {
      const { videoId, title } = videoData;

      const widget = this._makeElement('span', {
        className: 'yt-playlist-widget',
        'data-video-id': videoId,
      });
      const currentClass = isCurrent ? ' current-video' : '';
      const initialText = this.addedVideos.has(videoId) ? '✓' : '▶';

      let tooltip = `Play in Aardvark\nTitle: ${title}`;
      if (videoData.duration) tooltip += `\nDuration: ${videoData.duration}`;
      if (videoData.postedAge) tooltip += `\nPosted: ${videoData.postedAge}`;

      const addBtn = this._makeElement(
        'span',
        {
          className: 'yt-playlist-btn' + currentClass,
          title: tooltip,
          onclick: (e) => {
            e.preventDefault();
            e.stopPropagation();

            addBtn.textContent = '...';
            addBtn.className = 'yt-playlist-btn pending' + currentClass;

            this.sendToPlayer('ADD_VIDEO', videoData, false, false, addBtn);
          },
          oncontextmenu: (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, videoData, addBtn, currentClass);
          }
        },
        initialText
      );

      if (this.addedVideos.has(videoId)) {
        addBtn.classList.add('added');
      }

      widget.append(addBtn);
      return widget;
    }

  extractVideoData(container, context = 'unknown') {
    const data = {
      videoId: null,
      title: '',
      duration: null,
      postedAge: null,
      views: null,
      context: context,
    };

    const link =
      container.querySelector('a#video-title-link') ||
      container.querySelector('a#video-title') ||
      container.querySelector('a[href*="/watch?v="]') ||
      container.querySelector('a[href*="/shorts/"]');

    if (!link) return null;

    const href = link.getAttribute('href');
    if (!href) return null;

    const vMatch = href.match(/[?&]v=([^&]+)/);
    const sMatch = href.match(/\/shorts\/([^/?&]+)/);

    if (vMatch) {
      data.videoId = vMatch[1];
    } else if (sMatch) {
      data.videoId = sMatch[1];
      data.context = 'shorts';
    } else {
      const thumbLink = container.querySelector('a.ytd-thumbnail');
      if (thumbLink) {
        const tHref = thumbLink.getAttribute('href');
        const tMatch = tHref && tHref.match(/[?&]v=([^&]+)/);
        if (tMatch) data.videoId = tMatch[1];
      }
    }

    if (!data.videoId) return null;

    const titleEl =
      container.querySelector('#video-title') ||
      container.querySelector('.yt-lockup-metadata-view-model__title') ||
      container.querySelector('#headline') ||
      container.querySelector('h3') ||
      link;

    if (titleEl) {
      // Aggressive fallbacks in case standard textContent evaluates to empty during DOM swaps
      data.title =
        titleEl.textContent?.trim() || titleEl.innerText?.trim() || '';
      if (!data.title) {
        data.title =
          titleEl.getAttribute('title') ||
          titleEl.getAttribute('aria-label') ||
          link.getAttribute('title') ||
          link.getAttribute('aria-label') ||
          link.innerText?.trim() ||
          '';
      }
    }

    if (data.context !== 'shorts') {
      const badge = container.querySelector(
        '.ytd-thumbnail-overlay-time-status-renderer, .badge-shape-text'
      );
      if (badge) data.duration = badge.textContent.trim();

      const metaSpans = container.querySelectorAll(
        '#metadata-line span, .yt-lockup-metadata-view-model__metadata span'
      );
      metaSpans.forEach((span) => {
        const txt = span.textContent.trim();
        if (txt.includes('ago')) data.postedAge = txt;
        else if (txt.includes('views')) data.views = txt;
      });
    }

    return data;
  }

  scanShorts() {
    // Use the generic processor for shorts containers
    this._processSurface('ytd-reel-item-renderer', 'shorts');
    // Also scan rich grid media (often shorts on home page)
    this._processSurface('ytd-rich-grid-slim-media', 'shorts');
  }

  scan() {
    if (!this._isContextValid()) {
      this._shutdownSilently();
      return;
    }

    try {
      this.scanRegularVideos();
      this.scanShorts();
    } catch (e) {
      // Suppress minor DOM errors
    }
  }

  init() {
      console.log('BMO: YouTube Injector Loaded (waiting for DOM)...');

      // Double-injection protection: decommission previous instance if orphaned
      if (window.__bmoYouTubeContentInstance) {
        try {
          console.log('BMO: Cleaning up previous orphaned instance...');
          window.__bmoYouTubeContentInstance._shutdownSilently();
        } catch (e) {
          console.warn('BMO: Failed to decommission old instance:', e);
        }
      }
      window.__bmoYouTubeContentInstance = this;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._boot());
      } else {
        this._boot();
      }
    }

  _boot() {
    console.log(
      'BMO: Booting Injector (Top window: ' + (window === window.top) + ')'
    );

    // 1. INJECT STYLES GLOBALLY (even in iframes) to squash obnoxious YouTube UI
    this.injectStyles();

    // Guard: Halt the rest of the Aardvark logic if we are inside an iframe
    if (window !== window.top) {
      console.log('BMO: Iframe detected. CSS injected, halting main logic.');
      return;
    }

    this.isRunning = true;
    this._createStatusIndicator();
    this._updateStatus('Checking for player tab...', 'warn');
    this.detectCurrentVideo();
    this.startScanning();
    this.attemptDiscovery();

    window.addEventListener('yt-navigate-finish', () => {
      this.detectCurrentVideo();
      this.scan();
      if (!this.connected) this.attemptDiscovery();
    });

    if (this._isContextValid() && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'YT_BRIDGE_TO_EXTENSION_UI') {
          this.handleRemoteMessage(request.payload);
        }
      });
    }

    this.disconnectChecker = setInterval(() => {
      if (this.connected && Date.now() - this.lastHeartbeat > 10000) {
        this.connected = false;
        this._updateStatus('Player disconnected', 'error');
      }
    }, 4000);
  }

  attemptDiscovery() {
    if (!this.isRunning) return;
    this._updateStatus('Checking for player tab...', 'warn');

    this.safelySendMessage(
      { type: 'YT_Video_Op', data: { type: 'PING' } },
      (response) => {
        if (response && response.found) {
          this._updateStatus('Player tab found – waiting for sync...', 'warn');
        } else {
          this._updateStatus(
            'No player tab – click a video button to open',
            'warn'
          );
        }
      }
    );
  }

  safelySendMessage(message, callback, isRetry = false) {
      if (!this._isContextValid()) {
        this._shutdownSilently();
        return;
      }

      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (!this._isContextValid()) return;
          const err = chrome.runtime.lastError;
          if (err) {
            // Catch invalidation error and gracefully shut down
            if (err.message && err.message.includes('context invalidated')) {
              this._shutdownSilently();
              return;
            }
            if (!isRetry) {
              setTimeout(
                () => this.safelySendMessage(message, callback, true),
                600
              );
            }
            return;
          }
          if (callback) callback(response);
        });
      } catch (e) {
        this._shutdownSilently();
      }
    }

  sendToPlayer(type, videoData, playOnce = false, isRetry = false, targetBtn = null) {
      if (!this._isContextValid()) {
        this._shutdownSilently();
        return;
      }

      this.pausePageVideos();

      let title = 'Untitled';
      let videoId = null;

      if (typeof videoData === 'string') {
        videoId = videoData;
        title = arguments[2] || 'Untitled';
      } else {
        videoId = videoData.videoId;
        title = videoData.title || 'Untitled';
      }

      this._logToScreen(`👉 ACTION: ${type}`);
      this._logToScreen(`   Target: "${title}" (${videoId})`);

      let payload = {
        type: type,
        timestamp: Date.now(),
        msgId: videoData.msgId || 'msg_' + Date.now() + Math.random().toString(36).substr(2, 5),
      };

      if (typeof videoData === 'string') {
        payload.videoId = videoId;
        payload.title = title;
        payload.playOnce = playOnce;
      } else {
        Object.assign(payload, videoData);
        if (typeof playOnce === 'boolean') payload.playOnce = playOnce;
      }

      if (this.currentSessionId) {
        payload.sessionId = this.currentSessionId;
      }

      payload.focusPlayer = this.focusPlayerTab;

      const showButtonFailure = () => {
        if (targetBtn) {
          targetBtn.textContent = '✗';
          targetBtn.className = 'yt-playlist-btn error';
          setTimeout(() => {
            if (targetBtn.className.includes('error')) {
              targetBtn.textContent = '▶';
              targetBtn.className = 'yt-playlist-btn';
            }
          }, 2500);
        }
      };

      try {
        chrome.runtime.sendMessage(
          { type: 'YT_Video_Op', data: payload },
          (response) => {
            if (!this._isContextValid()) return;

            if (chrome.runtime.lastError) {
              const errMsg = chrome.runtime.lastError.message;
              this._logToScreen(`❌ Runtime Error: ${errMsg}`);

              if (errMsg && errMsg.includes('context invalidated')) {
                this._shutdownSilently();
                return;
              }

              if (!isRetry) {
                this._logToScreen(`⚠️ Waking up extension and retrying...`);
                setTimeout(() => {
                  this.sendToPlayer(type, videoData, playOnce, true, targetBtn);
                }, 600);
              } else {
                this._updateStatus('Extension Error - Reload Page', 'error');
                showButtonFailure();
              }
              return;
            }

            if (response && response.error) {
              const err = response.error;
              this._logToScreen(`❌ Service Error: ${err}`);

              const isConnectionError =
                err.includes('not active') ||
                err.includes('found') ||
                err.includes('Unreachable') ||
                err.includes('timed out');

              if (isConnectionError) {
                this._logToScreen('⚠️ Queuing command for later...');
                this._updateStatus('Player opening... command queued.', 'warn');
                this.messageQueue.push(payload);
                this._savePersistentQueue();
              } else {
                this._updateStatus(`Failed: ${err}`, 'error');
                showButtonFailure();
              }
              return;
            }

            if (response && response.success) {
              this._logToScreen('✅ Sent to Background. Waiting for App...');
            } else {
              this._logToScreen('❓ Unknown response from Background');
              showButtonFailure();
            }
          }
        );
      } catch (e) {
        this._shutdownSilently();
      }
    }

  _createDebugDisplay() {
    if (document.getElementById('bmo-debug-overlay')) return;

    const div = document.createElement('div');
    div.id = 'bmo-debug-overlay';
    div.style.cssText = `
        position: fixed; top: 10px; right: 10px; width: 350px; height: 300px;
        background: rgba(0,0,0,0.85); color: #0f0; z-index: 2147483647;
        font-family: monospace; font-size: 11px; padding: 10px;
        overflow-y: auto; border: 2px solid #0f0; pointer-events: none;
    `;
    document.body.appendChild(div);
    this._logToScreen('Debug Overlay Initialized');
  }

  _logToScreen(msg) {
    if (!this.statusContent) return;

    const line = document.createElement('div');
    line.className = 'bmo-status-line';
    line.style.color = msg.includes('Error')
      ? '#f55'
      : msg.includes('RX')
      ? '#aaf'
      : '#0f0';

    const time = new Date().toLocaleTimeString().split(' ')[0];
    line.textContent = `[${time}] ${msg}`;

    this.statusContent.appendChild(line);
    this.statusContent.scrollTop = this.statusContent.scrollHeight;

    // Flash the icon if box is closed and it's important
    if (this.statusBox.style.display !== 'flex') {
      if (
        msg.includes('Error') ||
        msg.includes('RX') ||
        msg.includes('LINKED')
      ) {
        this.statusLauncher.classList.add('flash');
      }
    }
  }

  _toggleStatusBox(show) {
    if (!this.statusBox) return;
    const isVisible = this.statusBox.style.display === 'flex';
    const shouldShow = show !== undefined ? show : !isVisible;

    this.statusBox.style.display = shouldShow ? 'flex' : 'none';

    if (shouldShow) {
      this.statusLauncher.classList.remove('flash'); // Stop flashing on open
      this.statusContent.scrollTop = this.statusContent.scrollHeight;
    }
  }

  _copyLogToClipboard() {
    if (!this.statusContent) return;
    const text = this.statusContent.innerText;
    navigator.clipboard.writeText(text).then(() => {
      const btn = this.statusBox.querySelector('.bmo-btn-xs');
      const oldText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = oldText), 1000);
    });
  }

  handleRemoteMessage(data) {
      if (!data) return;

      if (data.type === 'BG_LOG') {
        this._logToScreen(`[BG] ${data.message}`);
        return;
      }

      this._logToScreen(`RX: ${data.type}`);

      // Update heartbeat to prevent false disconnects
      this.lastHeartbeat = Date.now();

      // 1. Connection Status Update (Visual Only)
      if (data.type === 'PLAYER_CONNECTED') {
        this._logToScreen(`LINKED! Session: ${data.sessionId}`);
        this.connected = true;
        this.currentSessionId = data.sessionId;
      }

      // 2. Queue Flushing (Functional)
      // Only flush when we know the App (YouTubePlayer.js) is listening.
      if (
        data.type === 'PLAYER_READY' ||
        data.type === 'HANDSHAKE' ||
        data.type === 'SYNC_PLAYLIST'
      ) {
        if (this.messageQueue.length > 0) {
          this._logToScreen(`App Ready (${data.type}). Flushing Queue...`);
          this._flushPersistentQueue();
        }
      }

      if (data.type === 'PLAYER_DISCONNECTED') {
        this._logToScreen(`DISCONNECTED: ${data.reason}`);
        this.connected = false;
      }

      if (data.type === 'SYNC_PLAYLIST' && Array.isArray(data.playlist)) {
        this.addedVideos.clear();
        data.playlist.forEach((v) => this.addedVideos.set(v.id, !!v.playOnce));
        this.updateAllButtons();
      }
    }

  _isContextValid() {
    try {
      return (
        typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id
      );
    } catch (e) {
      return false;
    }
  }

  _shutdownSilently() {
      if (!this.isRunning) return;
      console.log(
        'BMO: Extension context invalidated. Stopping background sync.'
      );
      this.isRunning = false;

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.disconnectChecker) {
        clearInterval(this.disconnectChecker);
        this.disconnectChecker = null;
      }
      if (this.scrollHandler) {
        window.removeEventListener('scroll', this.scrollHandler);
        this.scrollHandler = null;
      }

      const container = document.getElementById('bmo-status-container');
      if (container) container.remove(); // Cleanly remove the DOM element
    }

  _initFocusSetting() {
      if (this._isContextValid() && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['bmo_focus_player_tab'], (res) => {
          if (res && res.hasOwnProperty('bmo_focus_player_tab')) {
            this.focusPlayerTab = !!res.bmo_focus_player_tab;
          }
        });
        chrome.storage.onChanged.addListener((changes) => {
          if (changes && changes.bmo_focus_player_tab) {
            this.focusPlayerTab = !!changes.bmo_focus_player_tab.newValue;
          }
        });
      }
    }

  pausePageVideos() {
      try {
        const videos = document.querySelectorAll('video');
        videos.forEach((video) => {
          if (video && !video.paused) {
            video.pause();
          }
        });
      } catch (e) {
        console.warn('Failed to pause page videos:', e);
      }
    }

  showContextMenu(e, videoData, addBtn, currentClass) {
      this.closeContextMenu();

      const menu = this._makeElement('div', {
        className: 'bmo-yt-context-menu',
        style: {
          top: `${e.clientY}px`,
          left: `${e.clientX}px`,
        }
      });

      // Prevent mouse and click events inside the menu from propagating to the document
      // This stops the dismiss handler from immediately destroying the menu on mousedown
      menu.addEventListener('mousedown', (ev) => {
        ev.stopPropagation();
      });
      menu.addEventListener('click', (ev) => {
        ev.stopPropagation();
      });

      const itemPlayNow = this._makeElement('div', {
        className: 'bmo-yt-context-item',
        onclick: (ev) => {
          ev.stopPropagation();
          this.closeContextMenu();
          addBtn.textContent = '...';
          addBtn.className = 'yt-playlist-btn pending' + currentClass;
          this.sendToPlayer('PLAY_NOW', { ...videoData, playNow: true, position: 'top' }, false, false, addBtn);
        }
      }, '▶ Play now');

      const itemPlayNext = this._makeElement('div', {
        className: 'bmo-yt-context-item',
        onclick: (ev) => {
          ev.stopPropagation();
          this.closeContextMenu();
          addBtn.textContent = '...';
          addBtn.className = 'yt-playlist-btn pending' + currentClass;
          this.sendToPlayer('ADD_VIDEO', { ...videoData, position: 'next' }, false, false, addBtn);
        }
      }, '⏭ Play next');

      const itemTopList = this._makeElement('div', {
        className: 'bmo-yt-context-item',
        onclick: (ev) => {
          ev.stopPropagation();
          this.closeContextMenu();
          addBtn.textContent = '...';
          addBtn.className = 'yt-playlist-btn pending' + currentClass;
          this.sendToPlayer('ADD_VIDEO', { ...videoData, position: 'top' }, false, false, addBtn);
        }
      }, '🔝 Top of list');

      const divider = this._makeElement('div', { className: 'bmo-yt-context-divider' });

      const checkbox = this._makeElement('input', {
        type: 'checkbox',
        className: 'bmo-yt-context-checkbox',
        checked: this.focusPlayerTab,
        onchange: (ev) => {
          const checked = !!ev.target.checked;
          this.focusPlayerTab = checked;
          if (this._isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ bmo_focus_player_tab: checked });
          }
        }
      });

      // Natively wrap inside the label to let the browser handle toggles automatically
      const checkboxLabel = this._makeElement('label', {
        className: 'bmo-yt-context-checkbox-label'
      }, checkbox, 'Focus Player Tab');

      menu.append(itemPlayNow, itemPlayNext, itemTopList, divider, checkboxLabel);
      document.body.appendChild(menu);

      this.activeContextMenu = menu;

      const dismissHandler = () => {
        this.closeContextMenu();
        document.removeEventListener('mousedown', dismissHandler);
      };
      setTimeout(() => {
        document.addEventListener('mousedown', dismissHandler);
      }, 50);
    }

  closeContextMenu() {
      if (this.activeContextMenu) {
        this.activeContextMenu.remove();
        this.activeContextMenu = null;
      }
    }
}

new YouTubeContent().init();

/* recursi-meta
{
  "schema": 1,
  "lines": 978,
  "provides": [
    "YouTubeContent"
  ],
  "deps": []
}
recursi-meta */
