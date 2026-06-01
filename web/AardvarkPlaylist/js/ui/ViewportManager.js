
class ViewportManager {
  
  constructor(player) {
    this.player = player;
    this.statusOverlay = null;
    this._statusTimer = null;
  }

  setStatus(msg, color = '#aaa') {
      if (!this.statusOverlay) {
        this.statusOverlay = makeElement('div', {
          style:
            'position:absolute; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); padding:8px 16px; border-radius:20px; font-size:12px; pointer-events:none; z-index:9999; transition:opacity 0.3s;',
        });
        this.player.rootElement.appendChild(this.statusOverlay);
      }
      this.statusOverlay.textContent = msg;
      this.statusOverlay.style.color = color;
      this.statusOverlay.style.opacity = '1';
      if (this._statusTimer) clearTimeout(this._statusTimer);
      this._statusTimer = setTimeout(() => {
        this.statusOverlay.style.opacity = '0';
      }, 3000);
    }

  init3DApp() {
      if (this.player.piano3DApp) return Promise.resolve();
      if (this._init3DPromise) return this._init3DPromise;
  
      let container = this.player.rootElement.querySelector('#canvas-container');
      if (!container) {
        container = makeElement('div', {
          id: 'canvas-container',
          style: 'position:absolute; top:0; left:0; width:100%; height:100%; z-index:100000; pointer-events:none; display:none;',
        });
        this.player.rootElement.appendChild(container);
      }
      this.player.layer3D = container;
  
      const currentPromise = Promise.resolve().then(() => {
          if (this._init3DPromise !== currentPromise) return;
  
          if (typeof Piano3DApp === 'undefined') {
            throw new Error('Piano3DApp class not loaded - check script order');
          }
  
          this.player.piano3DApp = new Piano3DApp();
  
          let currentContainer = this.player.rootElement.querySelector('#canvas-container');
          if (!currentContainer) {
            currentContainer = makeElement('div', {
              id: 'canvas-container',
              style: 'position:absolute; top:0; left:0; width:100%; height:100%; z-index:100000; pointer-events:none; display:none;',
            });
            this.player.rootElement.appendChild(currentContainer);
          }
  
          this.player.layer3D = currentContainer;
          this.player.layer3D.style.display = 'block';
  
          return this.player.piano3DApp.init(this.player.layer3D);
        })
        .then(() => {
          if (this._init3DPromise !== currentPromise) return;
          if (this.player.piano3DApp && this.player.piano3DApp.app) {
            setTimeout(() => this.player.piano3DApp.app.resize(), 0);
          }
          this._init3DPromise = null;
        })
        .catch((err) => {
          if (this._init3DPromise !== currentPromise) return;
          console.error('Failed to init 3D App:', err);
          alert('Error loading 3D Piano: ' + err.message);
          this._init3DPromise = null;
        });
  
      this._init3DPromise = currentPromise;
      return currentPromise;
    }

  setKeyboardStyle(style) {
    this.player.state.settings.keyboardStyle = style;
    if (this.player._saveState) this.player._saveState();

    if (!this.player.gt || !this.player.gt.pianoVisuals) return;

    const pv = this.player.gt.pianoVisuals;

    if (style === 'none') {
      pv.setActionBarVisible(false);
      pv.setFlyingBarsVisible(false);
      if (pv.flyingBars) pv.flyingBars.clearAllBars();
      this.destroy3DApp();
    } else if (style === '2d') {
      if (pv.geometrySettings) {
        pv.geometrySettings.rotationY = 0;
        pv.geometrySettings.rotationZ = 0;
      }
      if (this.player.state.geometry) {
        this.player.state.geometry.rotationY = 0;
        this.player.state.geometry.rotationZ = 0;
        if (this.player._saveGeometry) this.player._saveGeometry();
      }
      
      pv.setActionBarVisible(true);
      pv.setFlyingBarsVisible(true);
      
      const veq = window.VideoEventQueueClass?.current;
      if (veq && pv.flyingBars && (!pv.flyingBars.containerList || Object.keys(pv.flyingBars.containerList).length === 0)) {
          pv.loadVeq(veq);
      }
      
      this.destroy3DApp();
      
      setTimeout(() => {
        pv.updateLayout();
        if (this.player.gt.videoPlayer && this.player.gt.videoPlayer.isReady) {
          const accTime = this.player.gt.videoPlayer.getAccurateTime();
          if (accTime) pv.forceRefreshFlyingBars(accTime.time * 1000);
        }
      }, 50);
    } else if (style === '3d' || style === 'both') {
      pv.setActionBarVisible(style === 'both');
      pv.setFlyingBarsVisible(true);

      const veq = window.VideoEventQueueClass?.current;
      if (veq && pv.flyingBars && (!pv.flyingBars.containerList || Object.keys(pv.flyingBars.containerList).length === 0)) {
          pv.loadVeq(veq);
      }

      this.init3DApp().then(() => {
        const c = document.getElementById('canvas-container');
        if (c) c.style.display = 'block';

        if (this.player.piano3DApp && pv.geometrySettings) {
          pv.updateLayout();
          this.player.piano3DApp.alignTo2D(pv.geometrySettings, true);
        }
        if (this.player.rightPanelUI) this.player.rightPanelUI.build();
        if (
          this.player.leftPanelUI &&
          typeof this.player.leftPanelUI.refreshGeometryUI === 'function'
        ) {
          this.player.leftPanelUI.refreshGeometryUI();
        }
      });
    }
  }

  setDisplayMode(style) {
    this.player.state.settings.keyboardStyle = style;
    if (this.player._saveState) this.player._saveState();
    this.applyDisplayModeAfterLoad(style);
  }

  syncCanvasVisibilityToVeq() {
    const veq = window.VideoEventQueueClass?.current;
    const hasNotes =
      veq && veq.timedEvents && veq.timedEvents.some((e) => e.type === 'note');
    const style = this.player.state.settings.keyboardStyle || '2d';

    if (!hasNotes) {
      if (this.player.gt && this.player.gt.pianoVisuals) {
        this.player.gt.pianoVisuals.hide();
      }
      this.destroy3DApp();
    } else {
      if (style === '3d' || style === 'both') {
        this.init3DApp().then(() => {
          const c = document.getElementById('canvas-container');
          if (c) c.style.display = 'block';
          if (
            this.player.piano3DApp &&
            this.player.gt?.pianoVisuals?.geometrySettings
          ) {
            this.player.piano3DApp.alignTo2D(
              this.player.gt.pianoVisuals.geometrySettings,
              true
            );
          }
        });
      }
    }
  }

  applyDisplayModeAfterLoad(style) {
    if (!this.player.gt || !this.player.gt.pianoVisuals) return;

    const pv = this.player.gt.pianoVisuals;
    const veq = window.VideoEventQueueClass?.current;
    const hasNotes =
      veq && veq.timedEvents && veq.timedEvents.some((e) => e.type === 'note');

    if (!hasNotes || style === 'none') {
      pv.hide();
      if (pv.flyingBars) pv.flyingBars.clearAllBars();
      this.destroy3DApp();
      return;
    }

    if (style === '2d') {
      if (pv.geometrySettings) {
        pv.geometrySettings.rotationY = 0;
        pv.geometrySettings.rotationZ = 0;
      }
      if (this.player.state.geometry) {
        this.player.state.geometry.rotationY = 0;
        this.player.state.geometry.rotationZ = 0;
        if (this.player._saveGeometry) this.player._saveGeometry();
      }
    }

    pv.show();

    if (style === '2d') {
      pv.setActionBarVisible(true);
      pv.setFlyingBarsVisible(true);
      
      const veqq = window.VideoEventQueueClass?.current;
      if (veqq && pv.flyingBars && (!pv.flyingBars.containerList || Object.keys(pv.flyingBars.containerList).length === 0)) {
          pv.loadVeq(veqq);
      }
      
      this.destroy3DApp();
    } else if (style === '3d' || style === 'both') {
      pv.setActionBarVisible(style === 'both');
      pv.setFlyingBarsVisible(true);
      
      const veqq = window.VideoEventQueueClass?.current;
      if (veqq && pv.flyingBars && (!pv.flyingBars.containerList || Object.keys(pv.flyingBars.containerList).length === 0)) {
          pv.loadVeq(veqq);
      }

      this.init3DApp().then(() => {
        const c = document.getElementById('canvas-container');
        if (c) c.style.display = 'block';

        setTimeout(() => {
          if (this.player.piano3DApp && pv.geometrySettings) {
            pv.updateLayout();
            this.player.piano3DApp.alignTo2D(pv.geometrySettings, true);
          }
          if (this.player.rightPanelUI) this.player.rightPanelUI.build();
          if (
            this.player.leftPanelUI &&
            typeof this.player.leftPanelUI.refreshGeometryUI === 'function'
          ) {
            this.player.leftPanelUI.refreshGeometryUI();
          }
        }, 150);
      });
    }
  }

  toggleLeftPanel(section) {
    if (!this.player.leftPanel.isOpen) {
      this.player.leftPanel.open(section);
      this.updateDockUI();
      return;
    }
    const panel = this.player.leftPanel;
    const targetSection = panel.sections[section];
    if (targetSection) {
      targetSection.element.open = !targetSection.element.open;
    }
    const anyOpen = Object.values(panel.sections).some((s) => s.element.open);
    if (!anyOpen) {
      panel.close();
    }
    this.updateDockUI();
  }

  toggleRightPanel(section) {
    const panel = this.player.rightPanel;
    if (!panel) return;
    if (!panel.isOpen) {
      panel.open(section);
    } else {
      panel.open(section);
    }
    this.updateDockUI();
  }

  updateDockUI() {
    // Intentionally left blank. Bottom dock was removed.
  }

  injectStyles() {
      const css = `
  body { margin: 0; background: #121212; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #ccc; }
  
  #canvas-container {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 100000;
      pointer-events: none;
      display: none;
  }
  
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #111; }
  ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #555; }
  
  .dialog-button {
    padding: 4px 8px;
    background-color: #444;
    color: #eee;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    font-size: 10px;
    transition: background-color 0.2s;
  }
  .dialog-button:hover { background-color: #555; }
  .dialog-button.primary { background-color: #007acc; border-color: #005f9e; }
  .dialog-button.primary:hover { background: #006bb3; }
  
  .yt-pill-ctrl {
    position: absolute;
    z-index: 50001;
    background: rgba(15,15,15,0.95);
    border: 1px solid #333;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    display: flex;
    gap: 12px;
    padding: 8px 12px;
    align-items: center;
    transition: background-color 0.2s;
    cursor: grab;
  }
  .yt-pill-ctrl:active { cursor: grabbing; }
  
  .yt-side-panel {
    z-index: 50000;
  }
  
  .dock-btn {
    width: 46px;
    height: 46px;
    border-radius: 10px;
    background: #222;
    border: 1px solid #444;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.2s;
  }
  .dock-btn:hover { background: #333; transform: translateY(-2px); }
  .dock-btn.active { border-color: #888; background: #2a2a2a; }
  .dock-indicator {
    position: absolute; bottom: 0; width: 60%; height: 3px;
    background: currentColor; border-radius: 3px 3px 0 0;
    opacity: 0; transition: opacity 0.2s;
  }
  .dock-btn.on .dock-indicator { opacity: 1; }
  
  .video-dock-spacer { display: none; height: 60px; flex-shrink: 0; background: #000; pointer-events: none; }
  .dialog-box.maximized .video-dock-spacer { display: block; }
  
  /* FULLSCREEN OVERRIDES */
  body.fullscreen-mode .yt-side-panel { display: none !important; }
  body.fullscreen-mode .dialog-box {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    transform: none !important;
    background: #000 !important;
  }
  body.fullscreen-mode .dialog-header { display: none !important; }
  body.fullscreen-mode .dialog-content { padding: 0 !important; }
  body.fullscreen-mode .recursi-logo-widget { display: none !important; }
  body.fullscreen-mode .floating-menu-btn { display: none !important; }
  /* FULLSCREEN TOOLBAR */
  .gt-fullscreen-toolbar {
    position: fixed; z-index: 200000;
    display: flex; align-items: center; gap: 6px;
    padding: 5px 10px;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    cursor: grab; user-select: none;
    transition: opacity 0.2s;
  }
  .gt-fullscreen-toolbar:active { cursor: grabbing; }
  .gt-fullscreen-toolbar button, .gt-fullscreen-toolbar select,
  .gt-fullscreen-toolbar input, .gt-fullscreen-toolbar label {
    cursor: default;
  }
  `;
      applyCss(css, 'yt-player-core');
    }

  createFloatingMenuButton() {
      this.player.floatingMenuBtn = makeElement('button', {
        className: 'dialog-button floating-menu-btn',
        style: {
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: '40000',
          padding: '6px 12px',
          fontSize: '18px',
          lineHeight: '1.2',
          background: '#222',
          border: '1px solid #555',
          borderRadius: '6px',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          transition: 'background-color 0.2s, opacity 0.2s',
          display: this.player.leftPanel?.isOpen ? 'none' : 'block', // Auto hide if panel is already open
        },
        onmouseenter: (e) => (e.target.style.backgroundColor = '#444'),
        onmouseleave: (e) => (e.target.style.backgroundColor = '#222'),
        onclick: () => {
          this.player.leftPanel.open('playlist');
        },
      }, '☰');

      this.player.rootElement.appendChild(this.player.floatingMenuBtn);
    }

  makeDraggable(el, persistenceKey) {
    const constrainToScreen = () => {
      const r = el.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let newLeft = parseFloat(el.style.left) || r.left;
      let newTop = parseFloat(el.style.top) || r.top;
      let changed = false;

      if (newLeft > winW - r.width / 2) {
        newLeft = winW - r.width / 2;
        changed = true;
      }
      if (newLeft < -r.width / 2) {
        newLeft = -r.width / 2;
        changed = true;
      }

      if (newTop > winH - r.height / 2) {
        newTop = winH - r.height / 2;
        changed = true;
      }
      if (newTop < 0) {
        newTop = 0;
        changed = true;
      }

      if (changed) {
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
        if (persistenceKey) {
          localStorage.setItem(
            persistenceKey,
            JSON.stringify({ left: el.style.left, top: el.style.top })
          );
        }
      }
    };

    setTimeout(constrainToScreen, 100);

    el.addEventListener('mousedown', (e) => {
      if (
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'INPUT' ||
        e.target.closest('.dock-btn')
      )
        return;
      e.preventDefault();

      if (typeof UITools !== 'undefined' && UITools._showCovers) {
        UITools._showCovers();
      }

      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      el.style.transform = 'none';
      el.style.bottom = 'auto';
      el.style.right = 'auto';

      const onMove = (mv) => {
        const x = mv.clientX - offsetX;
        const y = mv.clientY - offsetY;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);

        if (typeof UITools !== 'undefined' && UITools._hideCovers) {
          UITools._hideCovers();
        }

        constrainToScreen();
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  createFullscreenToolbar() {
    this.destroyFullscreenToolbar();

    const saved = localStorage.getItem('gt-fs-toolbar-pos');
    let startLeft = 50,
      startTop = 20;
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        startLeft = pos.left;
        startTop = pos.top;
      } catch (e) {}
    }

    const toolbar = makeElement('div', {
      className: 'gt-fullscreen-toolbar',
      style: {
        left: startLeft + 'px',
        top: startTop + 'px',
      },
    });

    if (this.player.headerControlsUI) {
      this.player.headerControlsUI.buildFullscreenToolbar(toolbar);
    }

    const exitBtn = makeElement('button', {
      style:
        'padding:2px 4px; background:transparent; border:1px solid #555; border-radius:3px; cursor:pointer; margin-left:4px; display:flex; align-items:center;',
      title: 'Exit Fullscreen (Esc)',
      onclick: () => document.exitFullscreen(),
    });
    const exitSvg = makeElement('svg:svg', { width: 14, height: 14 });
    const d = [
      'M 1 5 L 1 1 L 5 1',
      'M 9 1 L 13 1 L 13 5',
      'M 13 9 L 13 13 L 9 13',
      'M 5 13 L 1 13 L 1 9',
    ].join(' ');
    exitSvg.appendChild(
      makeElement('svg:path', {
        d: d,
        stroke: '#999',
        'stroke-width': '1.5',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        fill: 'none',
      })
    );
    exitBtn.appendChild(exitSvg);
    toolbar.appendChild(exitBtn);

    document.body.appendChild(toolbar);
    this._fsToolbar = toolbar;

    let dragOffsetX,
      dragOffsetY,
      isDragging = false;
    toolbar.addEventListener('mousedown', (e) => {
      if (
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'LABEL' ||
        e.target.closest('label')
      )
        return;
      e.preventDefault();
      isDragging = true;
      if (typeof UITools !== 'undefined' && UITools._showCovers) UITools._showCovers();
      const rect = toolbar.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
    });

    this._fsDragMove = (e) => {
      if (!isDragging) return;
      let newX = e.clientX - dragOffsetX;
      let newY = e.clientY - dragOffsetY;
      const r = toolbar.getBoundingClientRect();
      newX = Math.max(0, Math.min(newX, window.innerWidth - r.width));
      newY = Math.max(0, Math.min(newY, window.innerHeight - r.height));
      toolbar.style.left = newX + 'px';
      toolbar.style.top = newY + 'px';
    };

    this._fsDragUp = () => {
      if (!isDragging) return;
      isDragging = false;
      if (typeof UITools !== 'undefined' && UITools._hideCovers) UITools._hideCovers();
      localStorage.setItem(
        'gt-fs-toolbar-pos',
        JSON.stringify({
          left: parseInt(toolbar.style.left),
          top: parseInt(toolbar.style.top),
        })
      );
    };

    document.addEventListener('mousemove', this._fsDragMove);
    document.addEventListener('mouseup', this._fsDragUp);

    requestAnimationFrame(() => {
      const r = toolbar.getBoundingClientRect();
      let x = parseInt(toolbar.style.left);
      let y = parseInt(toolbar.style.top);
      x = Math.max(0, Math.min(x, window.innerWidth - r.width));
      y = Math.max(0, Math.min(y, window.innerHeight - r.height));
      toolbar.style.left = x + 'px';
      toolbar.style.top = y + 'px';
    });
  }

  destroyFullscreenToolbar() {
    if (this._fsToolbar) {
      this._fsToolbar.remove();
      this._fsToolbar = null;
    }
    if (this._fsDragMove) {
      document.removeEventListener('mousemove', this._fsDragMove);
      this._fsDragMove = null;
    }
    if (this._fsDragUp) {
      document.removeEventListener('mouseup', this._fsDragUp);
      this._fsDragUp = null;
    }
  }

  toggleFullscreen() {
    const doResize = () => {
      // Step 1: Update piano visuals layout (reads window.innerWidth)
      if (this.player.gt && this.player.gt.pianoVisuals) {
        this.player.gt.pianoVisuals.updateLayout();
      }
      // Step 2: Align 3D to updated 2D layout (reads viewport bounding rect)
      // This will automatically call app.resize(w,h) inside alignTo2D
      if (
        this.player.piano3DApp &&
        this.player.gt?.pianoVisuals?.geometrySettings
      ) {
        this.player.piano3DApp.alignTo2D(
          this.player.gt.pianoVisuals.geometrySettings,
          true
        );
      }
    };
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          // Use requestAnimationFrame to ensure browser has reflowed
          requestAnimationFrame(() => {
            doResize();
            setTimeout(doResize, 300);
            setTimeout(doResize, 800);
            setTimeout(doResize, 1500);
          });
        })
        .catch((err) => {
          console.error('Fullscreen error:', err);
        });
    } else {
      document
        .exitFullscreen()
        .then(() => {
          requestAnimationFrame(() => {
            doResize();
            setTimeout(doResize, 300);
            setTimeout(doResize, 800);
          });
        })
        .catch(() => {});
    }
  }

  destroy3DApp() {
    this._init3DPromise = null; // Abort any pending startups
    if (this.player.piano3DApp) {
      if (typeof this.player.piano3DApp.destroy === 'function') {
        this.player.piano3DApp.destroy();
      }
      this.player.piano3DApp = null;
    }
    const container = document.getElementById('canvas-container');
    if (container) {
      container.remove();
    }
    this.player.layer3D = null;
  }

}

