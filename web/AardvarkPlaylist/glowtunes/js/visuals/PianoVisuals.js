class PianoVisuals {
  
  
  
    _createChildComponents() {
    this.actionBar?.destroy();
    this.flyingBars?.destroy();
    this.actionBar = null;
    this.flyingBars = null;

    try {
      this.actionBar = new ActionBarMinimal(this);
      this.flyingBars = new FlyingBars(this);
    } catch (error) {
      this.actionBar = null;
      this.flyingBars = null;
    }
  }

  init(videoPlayerRef = null) {
    if (!this.geometrySettings || !this.actionBar || !this.flyingBars) {
      return;
    }
    if (videoPlayerRef) {
      this._videoPlayerRef = videoPlayerRef;
    }

    this.updateLayout();
    this.flyingBars.init();
  }

  show() {
    if (this.isVisible) return;
    if (!this.actionBar || !this.flyingBars) {
      return;
    }
    this.actionBar.show();
    this.flyingBars.show();
    this.isVisible = true;
  }

  hide() {
    if (!this.isVisible) return;
    this.actionBar?.hide();
    this.flyingBars?.hide();
    this.isVisible = false;
  }

  setTime(timeMs, intervalMs, forcePosition) {
    if (this.isVisible) {
      this.flyingBars?.setTime(timeMs, intervalMs, forcePosition);
    }
  }

  loadVeq(veq) {
    if (this.flyingBars) {
      this.flyingBars.clearAllBars();
    }

    if (!veq || !veq.timedEvents) {
      return;
    }

    const style = window.projectApp?.state?.settings?.keyboardStyle || this.config.keyboardStyle;
    if (style === 'none') {
        return;
    }

    const gs = this.geometrySettings;

    if (gs && gs.debugMode) {
      window.smartLog?.(
        'Debug',
        `Injecting calibration notes. Range: ${gs.minMidi}-${gs.maxMidi}`
      );

      for (let t = 0; t < 60000; t += 5000) {
        veq.timedEvents.push({
          type: 'note',
          mc: gs.minMidi,
          t: t,
          d: 2000,
          v: 100,
          tr: 0,
          debugNote: true,
        });
        veq.timedEvents.push({
          type: 'note',
          mc: gs.maxMidi,
          t: t,
          d: 2000,
          v: 100,
          tr: 0,
          debugNote: true,
        });
      }

      if (window.VideoEventQueueClass) {
        window.VideoEventQueueClass.sort(veq.timedEvents);
      }
    }

    this.flyingBars?.loadVeq(veq);
  }

  toggleNoteDisplay(midiCode, turnOn) {
    const mc = Number(midiCode);
    if (this.isVisible) {
      this.actionBar?.toggleNoteDisplay(mc, turnOn);
    }
    if ((window.projectApp?.piano3DApp || window.aardvarkPlaylistInstance?.piano3DApp)) {
      (window.projectApp?.piano3DApp || window.aardvarkPlaylistInstance?.piano3DApp).toggleNoteDisplay(mc, turnOn);
    }
  }

  updateMidiRangeBasedOnMode() {
    if (!this.geometrySettings) return false;
    const minimalMin = 36; // C2
    const minimalMax = 84; // C6
    return this.geometrySettings.setMidiRange(minimalMin, minimalMax);
  }

  updateLayout() {
      if (!this.geometrySettings) return false;
      const viewport = this._createViewport();
      const gs = this.geometrySettings;

      let sLeft = 0;
      let sRight = 0;

      // Use UITools boundary tracking to respect the sidebar
      if (typeof UITools !== 'undefined' && UITools.safeArea) {
        sLeft = UITools.safeArea.left || 0;
        sRight = UITools.safeArea.right || 0;
      } else if (window.projectApp && !document.fullscreenElement) {
        const p = window.projectApp;
        if (p.leftPanel?.isOpen) sLeft = p.leftPanel.element?.offsetWidth || 360;
        if (p.rightPanel?.isOpen) sRight = p.rightPanel.element?.offsetWidth || 360;
      }

      const appW = window.projectApp ? window.projectApp.getAppWidth() : window.innerWidth;
      const appH = window.projectApp ? window.projectApp.getAppHeight() : window.innerHeight;

      const panelGapWidth = appW - sLeft - sRight;
      const widthPercent = (gs.customWidth || 100) / 100;
      const finalWidth = panelGapWidth * widthPercent;
      const centeringOffset = (panelGapWidth - finalWidth) / 2;

      Object.assign(viewport.style, {
        left: `${sLeft + centeringOffset}px`,
        width: `${finalWidth}px`,
        display: 'block',
      });

      if (typeof gs.actionBarYRatio !== 'number' || isNaN(gs.actionBarYRatio)) {
        const inferred =
          typeof gs.actionBarY === 'number' && appH > 0
            ? gs.actionBarY / appH
            : 0.66;
        gs.actionBarYRatio = Math.max(0.05, Math.min(0.95, inferred));
      }

      gs.actionBarY = Math.round(appH * gs.actionBarYRatio);
      gs.start = gs.actionBarY;
      gs.w = finalWidth;

      const layoutData = PianoLayout.calculate(gs, finalWidth, null);
      this.keyMap = layoutData.map;
      this.keyArray = layoutData.array;

      if (this.actionBar) {
        this.actionBar.recalculateLayout(finalWidth);
      }

      if ((window.projectApp?.piano3DApp || window.aardvarkPlaylistInstance?.piano3DApp)) {
        (window.projectApp?.piano3DApp || window.aardvarkPlaylistInstance?.piano3DApp).alignTo2D(gs);
      }

      // Immediately update the CSS transforms so the 3D/2D views stay perfectly synced to the mouse at 60fps
      const vp = window.projectApp?.gt?.videoPlayer;
      if (vp && vp.isReady) {
        const accTime = vp.getAccurateTime();
        if (accTime) {
          this.forceRefreshFlyingBars(accTime.time * 1000);
        }
      }

      // Defer the extremely heavy DOM recreation of flying notes until 150ms after the user stops dragging
      if (this.flyingBars && window.VideoEventQueueClass?.current) {
          if (this._veqDebounce) clearTimeout(this._veqDebounce);
          this._veqDebounce = setTimeout(() => {
              this.flyingBars.loadVeq(window.VideoEventQueueClass.current);
              if (vp && vp.isReady) {
                  const accTime = vp.getAccurateTime();
                  if (accTime) this.forceRefreshFlyingBars(accTime.time * 1000);
              }
          }, 150);
      }

      return true;
    }

  setMode(newMode) {
    this.config.mode = newMode;
  }

  destroy() {
    this.hide();
    this.actionBar?.destroy();
    this.flyingBars?.destroy();
    if (this.viewport && this.viewport.isConnected) {
      this.viewport.remove();
    }
    this.viewport = null;
    this.geometrySettings = null;
    this.actionBar = null;
    this.flyingBars = null;
    this.keyMap = {};
    this.keyArray = [];
    this._videoPlayerRef = null;
  }

  getNoteRenderData(midiCode) {
    const item = this.keyMap[midiCode];
    if (!item) return null;
    return {
      left: item.left,
      width: item.width,
      name: item.name,
      c1: item.c1,
      c2: item.c2,
      color: item.color,
      mc: item.mc,
      isBlack: item.isBlack,
    };
  }

  forceRefreshFlyingBars(currentTimeMs) {
    if (!this.flyingBars) return;
    // By passing forcePosition=true, FlyingBars internally determines which containers
    // to unhide/hide based on the new bounds.
    this.flyingBars.setTime(currentTimeMs, 0, true);
  }

  turnOffAllNotes() {
    if (this.isVisible) {
      this.actionBar?.turnOffAllActiveNotes?.();
    }
    if ((window.projectApp?.piano3DApp || window.aardvarkPlaylistInstance?.piano3DApp)) {
      (window.projectApp?.piano3DApp || window.aardvarkPlaylistInstance?.piano3DApp).turnOffAllNotes();
    }
  }

  setEditMode(enabled) {
    this.config.isClickable = enabled;
    if (this.flyingBars) {
      this.flyingBars.setClickability(enabled);
    }
  }

  setActionBarVisible(visible) {
    if (
      this.actionBar &&
      typeof this.actionBar.setBarVisibility === 'function'
    ) {
      this.actionBar.setBarVisibility(visible);
    }
  }

  _attachToBody(el) {
    if (el && !el.isConnected) {
      document.body.appendChild(el);
    }
  }

  setFlyingBarsVisible(visible) {
    if (this.flyingBars) {
      visible ? this.flyingBars.show() : this.flyingBars.hide();
    }
  }

  _createViewport() {
      if (this.viewport && this.viewport.isConnected) return this.viewport;
  
      const targetDoc = AppContext.getTargetDocument();
      const parent = window.projectApp ? window.projectApp.rootElement : targetDoc.body;
  
      const existing = parent.querySelector('#gt-master-viewport');
      if (existing) existing.remove();
  
      const gs = this.geometrySettings;
      const borderStyle = gs && gs.debugMode ? '5px solid red' : 'none';
  
      this.viewport = makeElement('div', {
        id: 'gt-master-viewport',
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: '99999',
          overflow: 'visible',
          display: 'block',
          border: borderStyle,
          boxSizing: 'border-box',
        },
      });
  
      parent.appendChild(this.viewport);
      return this.viewport;
    }

  constructor(initialConfig = {}) {
    this._state = {
      config: { mode: 'min', splitBlackKeys: true, showNoteNames: false, isClickable: false },
      geometrySettings: null, actionBar: null, flyingBars: null,
      isVisible: false, keyMap: {}, keyArray: [], layoutCalcs: {}, _videoPlayerRef: null
    };
    Object.defineProperties(this, {
      config: { get: () => this._state.config, set: v => this._state.config = v, configurable: true },
      geometrySettings: { get: () => this._state.geometrySettings, set: v => this._state.geometrySettings = v, configurable: true },
      actionBar: { get: () => this._state.actionBar, set: v => this._state.actionBar = v, configurable: true },
      flyingBars: { get: () => this._state.flyingBars, set: v => this._state.flyingBars = v, configurable: true },
      isVisible: { get: () => this._state.isVisible, set: v => this._state.isVisible = v, configurable: true },
      keyMap: { get: () => this._state.keyMap, set: v => this._state.keyMap = v, configurable: true },
      keyArray: { get: () => this._state.keyArray, set: v => this._state.keyArray = v, configurable: true },
      layoutCalcs: { get: () => this._state.layoutCalcs, set: v => this._state.layoutCalcs = v, configurable: true },
      _videoPlayerRef: { get: () => this._state._videoPlayerRef, set: v => this._state._videoPlayerRef = v, configurable: true }
    });

    this.config = {...this.config, ...initialConfig};
    this.basePath = initialConfig.basePath || './';
    console.log(`PianoVisuals: Initializing. Mode: ${this.config.mode}`);

    if (!this.geometrySettings) {
      this.geometrySettings = new GeometrySettings();
    }

    this.updateMidiRangeBasedOnMode();
    this._createChildComponents();
  }

}

