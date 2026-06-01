class AardvarkStyleEditor {
  constructor(aardvark) {
    this.main = aardvark;
    this._didStyleEditorCss = false;
    this._pausedForDialog = false;
    this._pauseState = null;
    // Store the changes applied in the last session for the "Previous" button
    this.lastAppliedChanges = new Map();
  }

  openStyleEditor() {
    if (!this.main.currentElement) {
      KeystrokeHandler.showPopup('No element selected');
      return;
    }

    // Pause Aardvark
    this._pauseForDialog();

    const el = this.main.currentElement;

    // Use Shared Positioning from Overlay
    const dialogWidth = 560;
    const dialogHeight = 520;
    let pos = null;

    if (
      this.main.overlay &&
      typeof this.main.overlay.calculateSmartPosition === 'function'
    ) {
      const rect = el.getBoundingClientRect();
      pos = this.main.overlay.calculateSmartPosition(
        rect,
        dialogWidth,
        dialogHeight
      );
    }

    // Snapshot original inline style
    const originalStyleText = el.getAttribute('style') || '';
    const originalMap = this._parseInlineStyleMap(originalStyleText);
    const changedSet = new Set();

    const ui = this._buildStyleEditorUI({
      element: el,
      originalMap,
      originalStyleText,
      changedSet,
      lastAppliedChanges: this.lastAppliedChanges,
      onRequestResume: () => this._resumeAfterDialog(),
    });

    const box = new DialogBox({
      title: 'Style Editor',
      size: [dialogWidth, dialogHeight],
      position: pos,
      contentElement: ui.root,
      onClose: () => {
        if (ui.restoreOnCloseCheckbox && ui.restoreOnCloseCheckbox.checked) {
          ui.revertAll();
        } else {
          if (ui.sessionChanges.size > 0) {
            this.lastAppliedChanges = new Map(ui.sessionChanges);
          }
        }
        this._resumeAfterDialog();
      },
    });

    this.main.overlay.setDataStyleExclude(box.element);
    box.element.addEventListener('keydown', (e) => e.stopPropagation(), true);
    box.element.addEventListener('keyup', (e) => e.stopPropagation(), true);
    box.element.addEventListener('keypress', (e) => e.stopPropagation(), true);

    setTimeout(() => {
      if (ui.firstFocusable) ui.firstFocusable.focus();
    }, 30);
  }

  _pauseForDialog() {
    if (this._pausedForDialog) return;
    this._pausedForDialog = true;

    // Remember whether Aardvark was actively tracking the mouse
    this._pauseState = {
      listenerAttached: !!this.main.listenerAttached,
      hoverWasPresent: !!this.main.overlay.hoverElement,
      infoWasPresent: !!this.main.overlay.infoElement,
    };

    // Remove selector overlays
    this.main.overlay.clearOverlays();

    // Stop mouse tracking
    if (this.main.listenerAttached) {
      document.body.removeEventListener(
        'mousemove',
        this.main.mouseMoveHandler
      );
      this.main.listenerAttached = false;
    }

    // Stop shortcuts so inputs can be typed freely
    this.main.removeKeyboardHandlers();

    KeystrokeHandler.showPopup('Style Editor (Aardvark paused)');
  }

  _resumeAfterDialog() {
    if (!this._pausedForDialog) return;
    this._pausedForDialog = false;

    // Reattach shortcuts
    this.main.attachKeyboardHandlers();

    // Restore mouse tracking if it was previously enabled
    const wasTracking = !!this._pauseState?.listenerAttached;
    if (wasTracking) {
      this.main.attachListener();
      // Re-draw overlay on current element
      if (this.main.currentElement) {
        this.main.overlay.highlightElement(this.main.currentElement);
        this.main.overlay.displayElementInfo(this.main.currentElement);
      }
    }

    this._pauseState = null;
    KeystrokeHandler.showPopup('Aardvark resumed');
  }

  _buildStyleEditorUI({
    element,
    originalMap,
    originalStyleText,
    changedSet,
    lastAppliedChanges,
    onRequestResume,
  }) {
    if (!this._didStyleEditorCss) {
      this._injectStyles();
    }

    const sessionChanges = new Map();
    const root = makeElement('div', {
      className: 'av-styleEditor',
    });

    // UI Headers and Top Bar logic
    const tag = element.tagName.toLowerCase();
    const idPart = element.id ? `#${element.id}` : '';
    const classPart =
      element.className && typeof element.className === 'string'
        ? '.' + element.className.split(' ')[0]
        : '';

    const title = makeElement(
      'div',
      {
        className: 'av-styleTitle',
      },
      [
        makeElement(
          'div',
          {
            className: 'main',
          },
          `Editing: ${tag}${idPart}${classPart}`
        ),
        makeElement(
          'div',
          {
            className: 'sub',
          },
          'Type property names to see computed values.'
        ),
      ]
    );

    const actionsContainer = makeElement('div', {
      className: 'av-styleActions',
    });

    const grid = makeElement('div', {
      className: 'av-styleGrid',
    });
    const rows = [];
    const normalizedOriginal = new Map();
    originalMap.forEach((v, k) =>
      normalizedOriginal.set(this._normalizeCssPropName(k), v)
    );

    // The helper that builds each row
    const makeRow = (prop = '', val = '') => {
      const propInput = makeElement('input', {
        placeholder: 'property',
        value: prop,
      });
      const valInput = makeElement('input', {
        placeholder: 'value',
        value: val,
      });

      // Computed Value Placeholder Logic
      const updateComputedPlaceholder = () => {
        const p = this._normalizeCssPropName(propInput.value);
        if (p && element) {
          try {
            const computed = window
              .getComputedStyle(element)
              .getPropertyValue(p);
            if (computed && computed !== 'initial') {
              valInput.placeholder = computed;
            } else {
              valInput.placeholder = 'value';
            }
          } catch (e) {
            valInput.placeholder = 'value';
          }
        } else {
          valInput.placeholder = 'value';
        }
      };

      propInput.addEventListener('input', updateComputedPlaceholder);
      if (prop) updateComputedPlaceholder();

      const stopKeys = (e) => e.stopPropagation();
      propInput.addEventListener('keydown', stopKeys);
      valInput.addEventListener('keydown', stopKeys);

      const delBtn = makeElement(
        'div',
        {
          className: 'av-styleDel',
          onclick: (e) => {
            e.stopPropagation();
            const p = (propInput.value || '').trim();
            if (p) api.removeProperty(p);
            propInput.value = '';
            valInput.value = '';
            valInput.placeholder = 'value';
          },
        },
        '✕'
      );

      const rowEl = makeElement(
        'div',
        {
          className: 'av-styleRow',
        },
        propInput,
        valInput,
        delBtn
      );
      const row = {
        rowEl,
        propInput,
        valInput,
      };
      rows.push(row);

      const applyFromRow = () => {
        const pRaw = (propInput.value || '').trim();
        const vRaw = (valInput.value || '').trim();
        if (!pRaw) return;
        if (!vRaw) api.removeProperty(pRaw);
        else api.setProperty(pRaw, vRaw);
      };

      let applyTimer = null;
      const scheduleApply = () => {
        clearTimeout(applyTimer);
        applyTimer = setTimeout(applyFromRow, 60);
      };

      propInput.addEventListener('input', scheduleApply);
      valInput.addEventListener('input', scheduleApply);
      propInput.addEventListener('blur', applyFromRow);
      valInput.addEventListener('blur', applyFromRow);

      grid.appendChild(rowEl);
      return row;
    };

    // --- API and Initialization ---
    const api = {
      normalize: (p) => this._normalizeCssPropName(p),
      setProperty: (pRaw, vRaw) => {
        const p = api.normalize(pRaw);
        if (!p) return;
        element.style.setProperty(p, vRaw);
        sessionChanges.set(p, vRaw);
        const orig = normalizedOriginal.get(p);
        if (orig !== vRaw) changedSet.add(p);
        else changedSet.delete(p);
      },
      removeProperty: (pRaw) => {
        const p = api.normalize(pRaw);
        if (!p) return;
        element.style.removeProperty(p);
        sessionChanges.set(p, null);
        if (normalizedOriginal.has(p)) changedSet.add(p);
        else changedSet.delete(p);
      },
      refreshRowsFromElement: () => {
        const curText = element.getAttribute('style') || '';
        const curMap = this._parseInlineStyleMap(curText);
        const curNorm = new Map();
        curMap.forEach((v, k) => curNorm.set(this._normalizeCssPropName(k), v));
        const entries = Array.from(curNorm.entries()).sort((a, b) =>
          a[0].localeCompare(b[0])
        );
        while (rows.length < entries.length + 8) makeRow('', '');
        rows.forEach((r) => {
          r.propInput.value = '';
          r.valInput.value = '';
          r.valInput.placeholder = 'value';
        });
        entries.forEach(([k, v], i) => {
          rows[i].propInput.value = k;
          rows[i].valInput.value = v;
          const p = this._normalizeCssPropName(k);
          const comp = window.getComputedStyle(element).getPropertyValue(p);
          if (comp) rows[i].valInput.placeholder = comp;
        });
      },
      revertChangedOnly: () => {
        Array.from(changedSet).forEach((p) => {
          if (normalizedOriginal.has(p))
            element.style.setProperty(p, normalizedOriginal.get(p));
          else element.style.removeProperty(p);
          sessionChanges.delete(p);
        });
        changedSet.clear();
        api.refreshRowsFromElement();
      },
      clearAllEdits: () => {
        // Clear properties tracked in current session
        Array.from(sessionChanges.keys()).forEach((p) =>
          element.style.removeProperty(p)
        );
        sessionChanges.clear();
        api.refreshRowsFromElement();
      },
    };

    // Populate initial rows
    const originalEntries = Array.from(normalizedOriginal.entries()).sort(
      (a, b) => a[0].localeCompare(b[0])
    );
    originalEntries.forEach(([k, v]) => makeRow(k, v));
    for (let i = 0; i < 8; i++) makeRow('', '');

    const firstFocusable =
      rows.length > 0 ? rows[0].valInput || rows[0].propInput : null;

    // Assemble final UI
    const saveBtn = makeElement(
      'button',
      {
        title: 'Save',
        onclick: () => this._saveStyles(element),
      },
      '💾'
    );
    const loadBtn = makeElement(
      'button',
      {
        title: 'Load',
        onclick: () => this._triggerLoadStyles(api),
      },
      '📂'
    );
    const prevBtn = makeElement(
      'button',
      {
        className: 'primary',
        disabled: !(lastAppliedChanges && lastAppliedChanges.size > 0),
        onclick: () => {
          lastAppliedChanges.forEach((v, k) =>
            v === null ? api.removeProperty(k) : api.setProperty(k, v)
          );
          api.refreshRowsFromElement();
        },
      },
      'Previous'
    );

    actionsContainer.append(
      saveBtn,
      loadBtn,
      prevBtn,
      makeElement(
        'button',
        {
          onclick: () => api.revertChangedOnly(),
        },
        'Revert'
      ),
      makeElement(
        'button',
        {
          onclick: () => api.clearAllEdits(),
        },
        'Clear'
      ),
      makeElement(
        'button',
        {
          onclick: () => onRequestResume(),
        },
        'Close'
      )
    );

    const topBar = makeElement(
      'div',
      {
        className: 'av-styleTopBar',
      },
      title,
      actionsContainer
    );
    const bottomBar = makeElement(
      'div',
      {
        className: 'av-styleBottomBar',
      },
      [
        makeElement('label', {}, [
          (this.restoreOnCloseCheckbox = makeElement('input', {
            type: 'checkbox',
          })),
          makeElement('span', {}, 'Restore on close'),
        ]),
        makeElement(
          'div',
          {
            className: 'av-styleHint',
          },
          'Tip: Property name triggers computed value placeholder.'
        ),
      ]
    );

    root.append(topBar, grid, bottomBar);

    return {
      root,
      firstFocusable,
      sessionChanges,
      revertAll: () => {
        if (originalStyleText.trim())
          element.setAttribute('style', originalStyleText);
        else element.removeAttribute('style');
        api.refreshRowsFromElement();
      },
    };
  }

  _parseInlineStyleMap(styleText) {
    const map = new Map();
    if (!styleText) return map;

    const parts = String(styleText).split(';');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      const idx = part.indexOf(':');
      if (idx === -1) continue;

      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (!k) continue;
      map.set(k, v);
    }
    return map;
  }

  _normalizeCssPropName(prop) {
    let p = String(prop || '').trim();
    if (!p) return '';

    // If already kebab-case-ish, just lowercase
    if (p.includes('-')) return p.toLowerCase();

    // Convert camelCase -> kebab-case
    // borderRadius -> border-radius
    p = p.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

    // Also allow weird spacing / underscores
    p = p.replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase();

    return p;
  }

  _injectStyles() {
    applyCss(
      `
      .av-styleEditor { display:flex; flex-direction:column; gap:10px; height:100%; }
      .av-styleTopBar { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px; border:1px solid rgba(255,255,255,0.12); border-radius:10px; background: rgba(0,0,0,0.18); }
      .av-styleTitle { display:flex; flex-direction:column; gap:3px; }
      .av-styleTitle .main { font-weight:700; font-size:13px; color:#ddd; }
      .av-styleTitle .sub { font-size:12px; color:#aaa; }
      .av-styleActions { display:flex; align-items:center; gap:10px; }
      .av-styleActions button { font-size:12px; padding:7px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color:#eee; cursor:pointer; }
      .av-styleActions button:hover { background: rgba(255,255,255,0.14); }
      .av-styleActions button.primary { background: rgba(0,122,204,0.9); border-color: rgba(0,122,204,1); }
      .av-styleActions button.primary:hover { background: rgba(0,122,204,1); }
      .av-styleGrid { display:flex; flex-direction:column; gap:6px; padding:10px; border:1px solid rgba(255,255,255,0.12); border-radius:10px; background: rgba(0,0,0,0.12); overflow:auto; }
      .av-styleRow { display:grid; grid-template-columns: 1fr 1.2fr 34px; gap:8px; align-items:center; }
      .av-styleRow input { width:100%; padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.25); color:#eee; outline:none; font-size:12.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .av-styleRow input:focus { border-color: rgba(79,193,255,0.8); box-shadow: 0 0 0 3px rgba(79,193,255,0.12); }
      .av-styleDel { width:34px; height:34px; border-radius:8px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color:#ddd; cursor:pointer; display:flex; align-items:center; justify-content:center; user-select:none; }
      .av-styleDel:hover { background: rgba(255,60,60,0.18); border-color: rgba(255,60,60,0.4); color: #fff; }
      .av-styleBottomBar { display:flex; align-items:center; justify-content:space-between; padding:10px; border:1px solid rgba(255,255,255,0.12); border-radius:10px; background: rgba(0,0,0,0.12); }
      .av-styleBottomBar label { display:flex; align-items:center; gap:8px; font-size:12px; color:#bbb; user-select:none; }
      .av-styleHint { font-size:12px; color:#aaa; }
      `,
      'aardvarkStyleEditorStyles'
    );
    this._didStyleEditorCss = true;
  }

  _saveStyles(element) {
    const styleMap = {};
    // Get all inline styles
    for (let i = 0; i < element.style.length; i++) {
      const key = element.style[i];
      styleMap[key] = element.style.getPropertyValue(key);
    }

    // Create blob
    const json = JSON.stringify(styleMap, null, 2);
    const blob = new Blob([json], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'aardvark-style.json';
    a.click();

    URL.revokeObjectURL(url);
    KeystrokeHandler.showPopup('Styles Saved');
  }

  _triggerLoadStyles(api) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const loadedMap = JSON.parse(evt.target.result);
          if (typeof loadedMap !== 'object' || loadedMap === null)
            throw new Error('Invalid JSON');

          // Apply loaded styles
          Object.entries(loadedMap).forEach(([k, v]) => {
            api.setProperty(k, v);
          });

          api.refreshRowsFromElement();
          KeystrokeHandler.showPopup('Styles Loaded');
        } catch (err) {
          console.error(err);
          KeystrokeHandler.showPopup('Load Failed');
        }
      };
      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
    input.remove();
  }

  hasPreviousStyles() {
    return this.lastAppliedChanges && this.lastAppliedChanges.size > 0;
  }

  applyPreviousStyles() {
    if (!this.main.currentElement || !this.hasPreviousStyles()) return;

    const el = this.main.currentElement;
    let count = 0;

    this.lastAppliedChanges.forEach((val, key) => {
      // Basic normalization just in case
      const prop = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

      if (val === null) {
        el.style.removeProperty(prop);
      } else {
        el.style.setProperty(prop, val);
      }
      count++;
    });

    KeystrokeHandler.showPopup(`Applied ${count} styles`);

    // Refresh overlay to match new dimensions if changed
    this.main.overlay.highlightElement(el);
  }

}