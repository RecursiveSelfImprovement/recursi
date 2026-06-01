class GoogleContent {
    constructor() {
      this.addedVideos = new Set();
      this.pendingTransactions = new Map();
      this.isRunning = false;
      this.observer = null;
      this.scanTimeout = null;

      this.focusPlayerTab = true;
      this._initFocusSetting();
    }

    init() {
      if (!this._isGoogleSearchPage()) return;
      this.isRunning = true;
      this.injectStyles();
      this.startScanning();
      this.listenForAcks();
    }

    _isGoogleSearchPage() {
      const url = window.location.href;
      return window.location.hostname.includes('google.') && url.includes('/search');
    }

    injectStyles() {
      const css = `
        .bmo-google-widget {
          display: inline-flex !important;
          align-items: center !important;
          margin-left: 8px !important;
          vertical-align: middle !important;
          z-index: 99 !important;
        }
        .bmo-google-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 18px !important;
          height: 18px !important;
          background-color: #cc0000 !important;
          color: #fff !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          border-radius: 4px !important;
          font-size: 11px !important;
          font-weight: bold !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          user-select: none !important;
        }
        .bmo-google-btn:hover {
          transform: scale(1.15) !important;
          filter: brightness(1.2) !important;
        }
        .bmo-google-btn.added {
          background-color: #008800 !important;
          border-color: #00aa00 !important;
        }
        .bmo-google-btn.pending {
          background-color: #ff8800 !important;
          border-color: #ffaa00 !important;
          animation: bmo-google-pulse 1s infinite alternate !important;
        }
        .bmo-google-btn.error {
          background-color: #d32f2f !important;
          border-color: #f44336 !important;
        }
        @keyframes bmo-google-pulse {
          from { opacity: 0.65; }
          to { opacity: 1; }
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
      if (!document.getElementById('bmo-google-styles')) {
        const style = document.createElement('style');
        style.id = 'bmo-google-styles';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
      }
    }

    startScanning() {
      this.scan();

      this.observer = new MutationObserver(() => {
        if (this.scanTimeout) clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => this.scan(), 300);
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    scan() {
      if (!this.isRunning) return;

      const links = document.querySelectorAll('a[href*="youtube.com/watch"], a[href*="youtu.be/"], a[href*="/shorts/"]');
      
      links.forEach((link) => {
        const videoId = this.extractVideoId(link.getAttribute('href'));
        if (!videoId) return;

        if (link.dataset.bmoProcessed === 'true') return;
        link.dataset.bmoProcessed = 'true';

        const titleEl = link.querySelector('h3');
        if (!titleEl) return;

        const titleText = titleEl.textContent?.trim() || 'YouTube Video';
        const widget = this.createWidget(videoId, titleText);

        titleEl.appendChild(widget);
      });
    }

    extractVideoId(url) {
      if (!url) return null;
      const vMatch = url.match(/[?&]v=([^&]+)/);
      const sMatch = url.match(/\/shorts\/([^/?&]+)/);
      const bMatch = url.match(/youtu\.be\/([^/?&]+)/);

      if (vMatch) return vMatch[1];
      if (sMatch) return sMatch[1];
      if (bMatch) return bMatch[1];
      return null;
    }

    createWidget(videoId, title) {
      const widget = document.createElement('span');
      widget.className = 'bmo-google-widget';
      widget.setAttribute('data-video-id', videoId);

      const isAdded = this.addedVideos.has(videoId);
      const initialText = isAdded ? '✓' : '▶';

      const btn = document.createElement('span');
      btn.className = 'bmo-google-btn' + (isAdded ? ' added' : '');
      btn.textContent = initialText;
      btn.title = `Queue in Aardvark\n${title}`;

      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.pausePageVideos();

        const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        btn.textContent = '...';
        btn.className = 'bmo-google-btn pending';

        this.registerPendingTransaction(msgId, videoId, btn);
        
        chrome.runtime.sendMessage({
          type: 'YT_Video_Op',
          data: {
            type: 'ADD_VIDEO',
            videoId: videoId,
            title: title,
            msgId: msgId,
            focusPlayer: this.focusPlayerTab
          }
        }, (response) => {
          if (chrome.runtime.lastError || (response && response.error)) {
            this.handleTransactionTimeout(msgId);
          }
        });
      };

      btn.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e, videoId, title, btn);
      };

      widget.appendChild(btn);
      return widget;
    }

    registerPendingTransaction(msgId, videoId, element) {
      // Increased from 5s to 15s to allow sufficient time for cold tab boots
      const timeoutId = setTimeout(() => {
        this.handleTransactionTimeout(msgId);
      }, 15000);

      this.pendingTransactions.set(msgId, { videoId, element, timeoutId });
    }

    handleTransactionTimeout(msgId) {
      const tx = this.pendingTransactions.get(msgId);
      if (!tx) return;

      const el = tx.element;
      if (el) {
        // Render a visible error state (Red ✗) to indicate communication failure
        el.className = 'bmo-google-btn error';
        el.textContent = '✗';
        el.title = 'Failed to queue video in Aardvark. Is the player blocked?';
        
        // Revert to default state after 2.5s
        setTimeout(() => {
          if (el.className === 'bmo-google-btn error') {
            el.className = 'bmo-google-btn';
            el.textContent = '▶';
            el.title = 'Queue in Aardvark';
          }
        }, 2500);
      }
      this.pendingTransactions.delete(msgId);
    }

    handleTransactionAck(msgId) {
      const tx = this.pendingTransactions.get(msgId);
      if (!tx) return;

      clearTimeout(tx.timeoutId);

      const el = tx.element;
      if (el) {
        el.className = 'bmo-google-btn added';
        el.textContent = '✓';
      }

      this.addedVideos.add(tx.videoId);
      this.pendingTransactions.delete(msgId);
    }

    listenForAcks() {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request) => {
          if (request.type === 'YT_BRIDGE_TO_EXTENSION_UI' && request.payload) {
            const data = request.payload;
            if (data.type === 'YT_VIDEO_OP_ACK' && data.msgId) {
              this.handleTransactionAck(data.msgId);
            }
            if (data.type === 'SYNC_PLAYLIST' && Array.isArray(data.playlist)) {
              this.addedVideos.clear();
              data.playlist.forEach((v) => this.addedVideos.add(v.id));
              this.updateAllButtons();
            }
          }
        });
      }
    }

    updateAllButtons() {
      document.querySelectorAll('.bmo-google-widget').forEach((widget) => {
        const videoId = widget.getAttribute('data-video-id');
        if (!videoId) return;
        const btn = widget.children[0];
        if (this.addedVideos.has(videoId)) {
          btn.textContent = '✓';
          btn.className = 'bmo-google-btn added';
        } else {
          btn.textContent = '▶';
          btn.className = 'bmo-google-btn';
        }
      });
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

  _isContextValid() {
      try {
        return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
      } catch (e) {
        return false;
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

  showContextMenu(e, videoId, title, btn) {
      this.closeContextMenu();

      const menu = document.createElement('div');
      menu.className = 'bmo-yt-context-menu';
      menu.style.top = `${e.clientY}px`;
      menu.style.left = `${e.clientX}px`;

      // Prevent events inside the menu from reaching document to prevent immediate closure
      menu.addEventListener('mousedown', (ev) => {
        ev.stopPropagation();
      });
      menu.addEventListener('click', (ev) => {
        ev.stopPropagation();
      });

      const createItem = (text, type, position, playNow) => {
        const item = document.createElement('div');
        item.className = 'bmo-yt-context-item';
        item.textContent = text;
        item.onclick = (ev) => {
          ev.stopPropagation();
          this.closeContextMenu();
          this.pausePageVideos();

          const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          btn.textContent = '...';
          btn.className = 'bmo-google-btn pending';

          this.registerPendingTransaction(msgId, videoId, btn);

          chrome.runtime.sendMessage({
            type: 'YT_Video_Op',
            data: {
              type: type,
              videoId: videoId,
              title: title,
              msgId: msgId,
              position: position,
              playNow: playNow,
              focusPlayer: this.focusPlayerTab
            }
          }, (response) => {
            if (chrome.runtime.lastError || (response && response.error)) {
              this.handleTransactionTimeout(msgId);
            }
          });
        };
        return item;
      };

      const itemPlayNow = createItem('▶ Play now', 'PLAY_NOW', 'top', true);
      const itemPlayNext = createItem('⏭ Play next', 'ADD_VIDEO', 'next', false);
      const itemTopList = createItem('🔝 Top of list', 'ADD_VIDEO', 'top', false);

      const divider = document.createElement('div');
      divider.className = 'bmo-yt-context-divider';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bmo-yt-context-checkbox';
      checkbox.checked = this.focusPlayerTab;
      checkbox.onchange = (ev) => {
        const checked = !!ev.target.checked;
        this.focusPlayerTab = checked;
        if (this._isContextValid() && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ bmo_focus_player_tab: checked });
        }
      };

      // Wrap inside label for native clean toggling
      const checkboxLabel = document.createElement('label');
      checkboxLabel.className = 'bmo-yt-context-checkbox-label';
      checkboxLabel.appendChild(checkbox);
      checkboxLabel.appendChild(document.createTextNode('Focus Player Tab'));

      menu.appendChild(itemPlayNow);
      menu.appendChild(itemPlayNext);
      menu.appendChild(itemTopList);
      menu.appendChild(divider);
      menu.appendChild(checkboxLabel);

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

new GoogleContent().init();