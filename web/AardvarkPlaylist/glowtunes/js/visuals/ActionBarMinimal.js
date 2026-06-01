class ActionBarMinimal {
  
  

    _getNextZIndex() {
    return String(this._zIndexCounter++);
  }

  _createContainers() {
    if (this.containerW && this.containerW.isConnected) return true;

    const parentViewport = this.pianoVisuals._createViewport();

    const commonStyle = {
      position: 'absolute',
      left: '0',
      width: '100%',
      height: '1px',
      pointerEvents: 'none',
      display: 'block',
    };

    // THE FIX: Higher Z-index than NoteContainers (100)
    this.containerW = makeElement('div', {
      style: {...commonStyle, zIndex: '500'},
    });

    this.containerB = makeElement('div', {
      style: {...commonStyle, zIndex: '510'},
    });

    parentViewport.appendChild(this.containerB);
    parentViewport.appendChild(this.containerW);
    return true;
  }

  recalculateLayout(availableWidth) {
    if (!this.containerW || !this.containerB) {
      if (!this._createContainers()) return;
    }

    const gs = this.pianoVisuals.geometrySettings;
    const top = gs.actionBarY || 0;
    const blackOffset = gs.blackNoteOffset || 0;
    const yOffsetBlack = gs.abBlackYOffset || 0;

    // Adjust minimal bar visually up/down based on the Z height parameters
    const whiteZ = gs.whiteKeyHeight || 0;
    const blackZ = gs.blackKeyHeight || 0;

    this.containerW.style.top = `${top + blackOffset - 2 - whiteZ}px`;
    this.containerB.style.top = `${top + yOffsetBlack - blackZ}px`;

    // Apply global left/right shifts
    this.containerW.style.left = `${gs.xShift || 0}px`;
    this.containerB.style.left = `${gs.xShift || 0}px`;

    this.containerW.style.transformOrigin = `50% 0`;
    this.containerB.style.transformOrigin = `50% 0`;
    this.containerW.style.transform = `scaleX(${gs.whiteWidth || 1})`;
    this.containerB.style.transform = `scaleX(${gs.blackWidth || 1})`;

    this.containerW.style.border = gs.debugMode ? '1px solid magenta' : 'none';
    this.containerB.style.border = gs.debugMode ? '1px solid cyan' : 'none';

    if (!this.isVisible) return;
    this._clearKeys();

    const keyLayoutArray = this.pianoVisuals.keyArray;
    if (!keyLayoutArray) return;

    // Establish the horizontal center of the keyboard for outward spreading
    const centerX = availableWidth / 2;

    keyLayoutArray.forEach((dd) => {
      const targetContainer = dd.isBlack ? this.containerB : this.containerW;
      const noteElements = {};

      // Apply the spread factor horizontally from the center
      const spread = dd.isBlack ? gs.abBlackSpread ?? 1 : gs.abWhiteSpread ?? 1;
      const adjustedLeft = centerX + (dd.left - centerX) * spread;
      const adjustedWidth = dd.width * spread;

      // Clone so we don't accidentally mutate the master layout dict
      const adjustedDd = {...dd, left: adjustedLeft, width: adjustedWidth};

      this._makeSolidKey(
        adjustedDd,
        targetContainer,
        adjustedDd.c1,
        this.lsBS,
        adjustedDd.isBlack ? 'blackKey' : 'whiteKey',
        noteElements
      );
      if (noteElements.bg) this.keyElements[adjustedDd.mc] = noteElements;
    });
  }

  _makeSolidKey(item, container, color, shadowString, classString, elementStore) {
    if (!item || !color || !container) return;

    const rgb = `${color[0]},${color[1]},${color[2]}`;
    const saberShadow = shadowString.replace(/X/g, rgb);

    const bg = makeElement('div', {
      className: classString,
      style: {
        position: 'absolute',
        left: `${item.left + 2}px`,
        top: '1px',
        width: `${Math.max(1, item.width - 4)}px`,
        height: '2px',
        backgroundColor: classString === 'whiteKey' ? 'transparent' : 'rgba(0,0,0,0.4)',
        border: classString === 'whiteKey' ? '1px solid white' : '1px solid black',
        borderRadius: '3px',
        boxShadow: classString === 'whiteKey' ? '0px 0px 6px #000' : 'none',
        pointerEvents: 'none',
      },
    });

    const tintColor = (c, ratio) => {
      if (!c || !Array.isArray(c) || c.length < 3) return '0,0,0';
      const out = [];
      for (let i = 0; i < 3; i++) {
        out[i] = Math.min(255, Math.max(0, Math.round(c[i] + (255 - c[i]) * ratio)));
      }
      return `${out[0]},${out[1]},${out[2]}`;
    };

    const saber = makeElement('div', {
      className: 'lightSaber',
      style: {
        display: 'none',
        position: 'absolute',
        left: `${item.left + 2}px`,
        top: '0',
        width: `${Math.max(1, item.width - 4)}px`,
        height: '3px',
        borderRadius: '3px',
        borderWidth: '1px',
        borderStyle: 'solid',
        pointerEvents: 'none',
        boxShadow: saberShadow,
        borderColor: `rgb(${tintColor(color, 0.7)})`,
        backgroundColor: `rgb(${tintColor(color, 0.85)})`,
        zIndex: '10',
      },
    });

    container.appendChild(bg);
    container.appendChild(saber);
    elementStore.bg = bg;
    elementStore.elem1 = saber;
  }

  _makeSplitKey(item, container, colors, shadowStrings, classString, elementStore) {
    if (!item || !colors || colors.length < 2 || !colors[0] || !colors[1] || !container) {
      if (item && colors && colors[0] && container)
        this._makeSolidKey(item, container, colors[0], this.lsBS, classString, elementStore);
      return;
    }
    
    const styles = this._getStyles();
    const baseKeyStyle = classString === 'whiteKey' ? styles.whiteKey : styles.blackKey;
    const bgShadow = '0px 0px 4px rgba(255,255,255,.75)';

    const bg = makeElement('div', {
      style: {
        ...baseKeyStyle,
        left: `${item.left}px`,
        top: '-1px',
        width: `${item.width}px`,
        boxShadow: bgShadow,
      },
    });

    if (item.width < 3) {
      this._makeSolidKey(item, container, colors[0], this.lsBS, classString, elementStore);
      if (bg && !elementStore.bg) {
        try {
          container.appendChild(bg);
          elementStore.bg = bg;
        } catch (e) {}
      }
      return;
    }

    const tintColor = (c, ratio) => {
      if (!c || !Array.isArray(c) || c.length < 3) return '0,0,0';
      const out = [];
      for (let i = 0; i < 3; i++) {
        out[i] = Math.min(255, Math.max(0, Math.round(c[i] + (255 - c[i]) * ratio)));
      }
      return `${out[0]},${out[1]},${out[2]}`;
    };

    const half = Math.round(item.width / 2);
    const rightWidth = half;

    const leftSaber = makeElement('div', {
      style: {
        ...styles.leftLightSaber,
        left: `${item.left}px`,
        top: '0',
        width: `${half}px`,
        boxShadow: shadowStrings[0].replace(/X/g, colors[0].join(',')),
        borderColor: `rgb(${tintColor(colors[0], 0.7)})`,
        backgroundColor: `rgb(${tintColor(colors[0], 0.45)})`,
      },
    });
    const rightSaber = makeElement('div', {
      style: {
        ...styles.rightLightSaber,
        left: `${item.left + half}px`,
        top: '0',
        width: `${rightWidth}px`,
        boxShadow: shadowStrings[1].replace(/X/g, colors[1].join(',')),
        borderColor: `rgb(${tintColor(colors[1], 0.7)})`,
        backgroundColor: `rgb(${tintColor(colors[1], 0.45)})`,
      },
    });
    try {
      container.appendChild(bg);
      container.appendChild(leftSaber);
      container.appendChild(rightSaber);
      elementStore.bg = bg;
      elementStore.elem1 = leftSaber;
      elementStore.elem2 = rightSaber;
    } catch (e) {
      console.error(`Error appending split key ${item.mc}:`, e);
    }
  }

  _clearKeys() {
    if (this.containerW) this.containerW.innerHTML = '';
    if (this.containerB) this.containerB.innerHTML = '';
    this.keyElements = {};
    this.activeNotes.clear();
  }

  toggleNoteDisplay(midiCode, turnOn) {
    if (!this.isVisible) return;
    const mc = Number(midiCode);
    const key = this.keyElements[mc];
    if (!key) return;

    if (turnOn) {
      this.activeNotes.add(mc);
    } else {
      this.activeNotes.delete(mc);
    }

    const displayStyle = turnOn ? 'block' : 'none';
    if (key.elem1) {
      try {
        key.elem1.style.display = displayStyle;
        if (turnOn) key.elem1.style.zIndex = this._getNextZIndex();
      } catch (e) {
        console.error(`Error elem1 toggle ${mc}`, e);
      }
    }
    if (key.elem2) {
      try {
        key.elem2.style.display = displayStyle;
        if (turnOn) key.elem2.style.zIndex = this._getNextZIndex();
      } catch (e) {
        console.error(`Error elem2 toggle ${mc}`, e);
      }
    }
  }

  show() {
      if (!this._createContainers()) {
        this.isVisible = false;
        return;
      }
  
      // LOGGING INJECTION
      const wZ = this.containerW.style.zIndex;
      const bZ = this.containerB.style.zIndex;
      window.smartLog?.(
        'Z-Debug',
        `ActionBar: Show called. White Z: ${wZ}, Black Z: ${bZ}`
      );
  
      if (this.containerW && this.containerB) {
        this.containerW.style.display = 'block';
        this.containerB.style.display = 'block';
        this.containerW.style.opacity = '1';
        this.containerB.style.opacity = '1';
  
        this.isVisible = true;
        const appW = window.projectApp ? window.projectApp.getAppWidth() : AppContext.getTargetWindow().innerWidth;
        this.recalculateLayout(appW);
      } else {
        this.isVisible = false;
      }
    }

  hide() {
    if (!this.isVisible) return;
    this._clearKeys();
    this.containerW?.remove();
    this.containerB?.remove();
    this.containerW = null;
    this.containerB = null;
    this.isVisible = false;
  }

  destroy() {
    this.hide();
    this.keyElements = {};
    this.pianoVisuals = null;
  }

  _getStyles() {
    return {
      whiteKey: {
        position: 'absolute',
        height: '2px',
        border: '1px solid white',
        borderRadius: '3px',
        backgroundColor: 'transparent',
        pointerEvents: 'none',
      },
      blackKey: {
        position: 'absolute',
        height: '2px',
        border: '1px solid #000',
        borderRadius: '3px',
        backgroundColor: 'rgba(0,0,0,0.4)',
        pointerEvents: 'none',
      },
      lightSaber: {
        display: 'none',
        position: 'absolute',
        height: '3px',
        borderRadius: '3px',
        borderWidth: '1px',
        borderStyle: 'solid',
        pointerEvents: 'none',
        zIndex: '30000',
      },
      rightLightSaber: {
        display: 'none',
        position: 'absolute',
        height: '3px',
        borderRadius: '0 3px 3px 0',
        borderStyle: 'solid',
        borderWidth: '1px 1px 1px 0',
        pointerEvents: 'none',
        zIndex: '30000',
      },
      leftLightSaber: {
        display: 'none',
        position: 'absolute',
        height: '3px',
        borderRadius: '3px 0 0 3px',
        borderStyle: 'solid',
        borderWidth: '1px 0 1px 1px',
        pointerEvents: 'none',
        zIndex: '30000',
      },
    };
  }

  activeNotes = new Set();

  turnOffAllActiveNotes() {
    const notesToTurnOff = [...this.activeNotes];
    notesToTurnOff.forEach((midiCode) => {
      this.toggleNoteDisplay(midiCode, false);
    });
  }

  setBarVisibility(visible) {
    const opacity = visible ? '1' : '0';
    if (this.containerW) this.containerW.style.opacity = opacity;
    if (this.containerB) this.containerB.style.opacity = opacity;
  }

  constructor(pianoVisualsInstance) {
    this._state = {
      pianoVisuals: null, isVisible: false, layoutWidth: 0,
      containerW: null, containerB: null, keyElements: {},
      _zIndexCounter: 30000,
      lsBS: 'rgb(255,255,255) 0px 0px 5px 3px, rgb(X) 0px 0px 18px 12px',
      llsBS: 'rgb(X) 0px 0px 5px, rgba(X,.35) -3px 1px 12px, rgba(X,.35) -3px 0px 12px, rgba(X,.35) -3px -1px 12px, rgba(X,.35) -5px 0px 12px, rgba(X,.35) -5px -1px 12px, rgba(X,.35) -5px 1px 12px, rgba(X,.25) -5px 1px 25px, rgba(X,.25) -5px 0px 25px, rgba(X,.25) -5px -1px 25px, rgba(X,.25) -1px 0px 25px, rgba(X,.25) -1px -1px 25px, rgba(X,.25) -1px 1px 25px',
      rlsBS: 'rgb(X) 0px 0px 5px, rgba(X,.35) 7px 1px 12px, rgba(X,.35) 5px 0px 12px, rgba(X,.35) 5px 1px 12px, rgba(X,.35) 7px 0px 12px, rgba(X,.35) 7px -1px 12px, rgba(X,.35) 5px -1px 12px, rgba(X,.25) 3px 1px 20px, rgba(X,.25) 7px 0px 20px, rgba(X,.25) 7px 1px 20px, rgba(X,.25) 3px 0px 20px, rgba(X,.25) 3px -1px 20px, rgba(X,.25) 7px -1px 20px'
    };
    Object.defineProperties(this, {
      pianoVisuals: { get: () => this._state.pianoVisuals, set: v => this._state.pianoVisuals = v, configurable: true },
      isVisible: { get: () => this._state.isVisible, set: v => this._state.isVisible = v, configurable: true },
      layoutWidth: { get: () => this._state.layoutWidth, set: v => this._state.layoutWidth = v, configurable: true },
      containerW: { get: () => this._state.containerW, set: v => this._state.containerW = v, configurable: true },
      containerB: { get: () => this._state.containerB, set: v => this._state.containerB = v, configurable: true },
      keyElements: { get: () => this._state.keyElements, set: v => this._state.keyElements = v, configurable: true },
      _zIndexCounter: { get: () => this._state._zIndexCounter, set: v => this._state._zIndexCounter = v, configurable: true },
      lsBS: { get: () => this._state.lsBS, set: v => this._state.lsBS = v, configurable: true },
      llsBS: { get: () => this._state.llsBS, set: v => this._state.llsBS = v, configurable: true },
      rlsBS: { get: () => this._state.rlsBS, set: v => this._state.rlsBS = v, configurable: true }
    });

    this.pianoVisuals = pianoVisualsInstance;
    if (!this.pianoVisuals) {
      throw new Error(
        `ActionBarMinimal Error: PianoVisuals instance not provided.`
      );
    }
    console.log(`ActionBarMinimal: Initialized.`);
  }

}

