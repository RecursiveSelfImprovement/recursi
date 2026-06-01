class PaintSelectionPanel {
  
  constructor(app, container) {
    this.app = app;
    this.container = container;
    this.ui = {};
    this.currentPaintMode = 'add';
    this._isVisible = false;
    this.activityTimer = null;
    this.dialog = null;
    this.element = null;
  }

  isVisible() {
    return this._isVisible;
  }

  _createElement() {
    // --- Paint Tools ---
    const plusButton = this._createModeButton(
      'add',
      '+',
      'Set paint mode to ADD'
    );
    plusButton.addEventListener('mouseover', () =>
      GlowingTooltip.show(
        plusButton,
        'Set paint mode to ADD (select visibility widgets)',
        {
          color: [40, 167, 69],
        }
      )
    );
    plusButton.addEventListener('mouseout', () => GlowingTooltip.hide());

    const minusButton = this._createModeButton(
      'subtract',
      '−',
      'Set paint mode to REMOVE'
    );
    minusButton.addEventListener('mouseover', () =>
      GlowingTooltip.show(
        minusButton,
        'Set paint mode to REMOVE (unselect visibility widgets)',
        {
          color: [220, 53, 69],
        }
      )
    );
    minusButton.addEventListener('mouseout', () => GlowingTooltip.hide());

    this.ui.plusButton = plusButton;
    this.ui.minusButton = minusButton;

    this.ui.togglePaintBtn = makeElement('button', {
      className: 'paint-tool-btn paint-toggle-btn',
      innerHTML: '🖌️',
      onclick: () => this._handleTogglePaint(),
    });

    this.ui.togglePaintBtn.addEventListener('mouseover', () => {
      const text = this.app.isDrawingModeActive
        ? 'Stop Painting over visibility widgets to set them'
        : 'Start Painting';
      GlowingTooltip.show(this.ui.togglePaintBtn, text, {
        color: [255, 193, 7],
      });
    });
    this.ui.togglePaintBtn.addEventListener('mouseout', () =>
      GlowingTooltip.hide()
    );

    const paintToolsBox = makeElement(
      'div',
      { className: 'selector-box paint-tools' },
      [
        makeElement('div', { className: 'button-row' }, [
          plusButton,
          minusButton,
          this.ui.togglePaintBtn,
        ]),
      ]
    );

    // --- Bulk Tools ---
    this.ui.toggleCode = this._createBulkModifier('code', 'Code');
    this.ui.toggleCode.addEventListener('mouseover', () =>
      GlowingTooltip.show(
        this.ui.toggleCode,
        "Toggle 'Code' for bulk actions",
        { color: [108, 117, 125] }
      )
    );
    this.ui.toggleCode.addEventListener('mouseout', () =>
      GlowingTooltip.hide()
    );

    this.ui.toggleSignatures = this._createBulkModifier('signatures', 'Sig');
    this.ui.toggleSignatures.addEventListener('mouseover', () =>
      GlowingTooltip.show(
        this.ui.toggleSignatures,
        "Toggle 'Signatures' for bulk actions",
        { color: [108, 117, 125] }
      )
    );
    this.ui.toggleSignatures.addEventListener('mouseout', () =>
      GlowingTooltip.hide()
    );

    this.ui.toggleDocs = this._createBulkModifier('docs', 'Docs');
    this.ui.toggleDocs.addEventListener('mouseover', () =>
      GlowingTooltip.show(
        this.ui.toggleDocs,
        "Toggle 'Docs' for bulk actions",
        { color: [108, 117, 125] }
      )
    );
    this.ui.toggleDocs.addEventListener('mouseout', () =>
      GlowingTooltip.hide()
    );

    this.ui.applyToAllBtn = makeElement(
      'button',
      {
        className: 'paint-tool-btn bulk-select-btn',
        onclick: () => this._applyBulkSelection(true),
      },
      'Select All'
    );
    this.ui.applyToAllBtn.addEventListener('mouseover', () =>
      GlowingTooltip.show(
        this.ui.applyToAllBtn,
        'Apply selections to ALL files',
        { color: [40, 167, 69] }
      )
    );
    this.ui.applyToAllBtn.addEventListener('mouseout', () =>
      GlowingTooltip.hide()
    );

    this.ui.clearAllBtn = makeElement(
      'button',
      {
        className: 'paint-tool-btn bulk-clear-btn',
        onclick: () => this._applyBulkSelection(false),
      },
      'Clear All'
    );
    this.ui.clearAllBtn.addEventListener('mouseover', () =>
      GlowingTooltip.show(
        this.ui.clearAllBtn,
        'Clear selections from ALL files',
        { color: [220, 53, 69] }
      )
    );
    this.ui.clearAllBtn.addEventListener('mouseout', () =>
      GlowingTooltip.hide()
    );

    const bulkActionsBox = makeElement(
      'div',
      { className: 'selector-box bulk-tools' },
      [
        makeElement('div', { className: 'button-row' }, [
          this.ui.toggleCode,
          this.ui.toggleSignatures,
          this.ui.toggleDocs,
          this.ui.applyToAllBtn,
          this.ui.clearAllBtn,
        ]),
      ]
    );

    // --- Close Button ---
    const closeButton = makeElement('button', {
      className: 'paint-panel-close-btn',
      innerHTML: '&times;',
      title: 'Close Panel',
      onclick: () => this.hide(),
    });
    closeButton.addEventListener('mouseover', () =>
      GlowingTooltip.show(closeButton, 'Close Panel', {
        color: [108, 117, 125],
      })
    );
    closeButton.addEventListener('mouseout', () => GlowingTooltip.hide());

    const wrapper = makeElement('div', { id: 'paint-selector-wrapper' }, [
      closeButton,
      paintToolsBox,
      bulkActionsBox,
    ]);

    wrapper.addEventListener('click', () => this.resetActivityTimer());

    return wrapper;
  }

  _createModeButton(mode, symbol, tipText) {
    return document.createElement('button');
  }

  _createBulkModifier(part, label) {
    return document.createElement('button');
  }

  _handleTogglePaint() {
    this.app.featureManager.toggleDrawingMode(
      this.app.isDrawingModeActive ? null : this.currentPaintMode
    );
    this.updateButtonStates();
  }

  _setPaintMode(mode) {
    this.currentPaintMode = mode;
    if (this.app.glowDrawer) {
      this.app.glowDrawer.setMode(mode);
    }
    this.updateButtonStates();
  }

  _applyBulkSelection(isSelected) {
    if (!this.app.buildPromptTab) return;
    const partsToChange = {
      code: this.ui.toggleCode.getAttribute('aria-pressed') === 'true',
      signatures:
        this.ui.toggleSignatures.getAttribute('aria-pressed') === 'true',
      docs: this.ui.toggleDocs.getAttribute('aria-pressed') === 'true',
    };
    const allWidgets = this.app.getAllVisibilityWidgets();
    if (allWidgets.length === 0) return;
    allWidgets.forEach((widget) => {
      const newState = { ...widget.state };
      if (partsToChange.code) newState.code = isSelected;
      if (partsToChange.signatures) newState.signatures = isSelected;
      if (partsToChange.docs) newState.docsLevel = isSelected ? 4 : 0;
      widget.setState(newState, true);
    });
    this.app.buildPromptTab._widgetStateChangeCallback();
  }

  updateButtonStates() {
    if (!this.ui.addBtn) return;
    const isPainting = this.app.isDrawingModeActive;
    this.ui.paintBtn.classList.toggle('active', isPainting);
    this.ui.addBtn.classList.toggle('active', this.currentPaintMode === 'add');
    this.ui.subBtn.classList.toggle(
      'active',
      this.currentPaintMode === 'subtract'
    );
  }

  show(anchorElement) {
    if (this._isVisible && this.dialog) {
      this.dialog.setZOnTop?.();
      this.resetActivityTimer();
      return;
    }

    if (!this.element) {
      this._buildUI();
    }

    if (!this.dialog) {
      // Position near the anchor (Visibility Tools button) or default bottom-right
      let x = window.innerWidth - 340;
      let y = window.innerHeight - 160;
      if (anchorElement) {
        const r = anchorElement.getBoundingClientRect();
        x = Math.min(r.left, window.innerWidth - 320);
        y = r.bottom + 8;
      }

      this.dialog = UITools.makeDialog({
        title: '🖌️ Paint',
        contentElement: this.element,
        position: [x, y],
        width: 'auto',
        height: 'auto',
        noPadding: true,
        allowMaximize: false,
        allowMinimize: false,
        onClose: () => {
          this.dialog = null;
          this._isVisible = false;
          if (this.app.isDrawingModeActive) {
            this.app.featureManager.toggleDrawingMode(null);
          }
        },
      });

      this._hideDialogHeader();
    }

    this._isVisible = true;
    this.updateButtonStates();
    this.resetActivityTimer();
  }

  hide() {
    if (!this._isVisible) return;
    if (this.app.isDrawingModeActive) {
      this.app.featureManager.toggleDrawingMode(null);
    }
    this._isVisible = false;
    if (this.dialog) {
      this.dialog.close?.();
      this.dialog = null;
    }
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
  }

  resetActivityTimer() {
    if (this.activityTimer) clearTimeout(this.activityTimer);
    this.activityTimer = setTimeout(() => this.hide(), 3 * 60 * 1000);
  }

  _setupResizeObserver() {}

  _applyStyles() {}

  

  _buildUI() {
    this._injectPaintStyles();

    // ── Mode buttons ──
    this.ui.addBtn = this._modeBtn('add', '+', [40, 167, 69]);
    this.ui.subBtn = this._modeBtn('subtract', '−', [220, 53, 69]);

    // ── Paint toggle ──
    this.ui.paintBtn = makeElement(
      'button',
      {
        className: 'ps-btn ps-paint-btn',
        title: 'Toggle paint mode',
        onclick: () => {
          this.app.featureManager.toggleDrawingMode(
            this.app.isDrawingModeActive ? null : this.currentPaintMode
          );
          this.updateButtonStates();
          this.resetActivityTimer();
        },
      },
      '🖌️'
    );

    // ── Brush size ──
    this.ui.brushSizeLabel = makeElement(
      'span',
      { className: 'ps-brush-label' },
      '●'
    );
    this.ui.brushSmall = this._sizeBtn('S', 2, 'Small brush');
    this.ui.brushMed = this._sizeBtn('M', 5, 'Medium brush');
    this.ui.brushLarge = this._sizeBtn('L', 8, 'Large brush');

    const sep1 = makeElement('div', { className: 'ps-sep' });
    const sep2 = makeElement('div', { className: 'ps-sep' });
    const sep3 = makeElement('div', { className: 'ps-sep' });

    // ── Bulk segment toggles ──
    this.ui.codeToggle = this._segToggle('code', 'C', '#0088ff', 'Code');
    this.ui.sigToggle = this._segToggle('sig', 'S', '#d98e48', 'Signatures');
    this.ui.docsToggle = this._segToggle('docs', 'D', '#8433ff', 'Docs');

    // ── Bulk actions ──
    this.ui.selectAllBtn = makeElement(
      'button',
      {
        className: 'ps-btn ps-all-btn',
        title: 'Select all',
        onclick: () => {
          this._bulkApply(true);
          this.resetActivityTimer();
        },
      },
      '✓ All'
    );

    this.ui.clearAllBtn = makeElement(
      'button',
      {
        className: 'ps-btn ps-clear-btn',
        title: 'Clear all',
        onclick: () => {
          this._bulkApply(false);
          this.resetActivityTimer();
        },
      },
      '✕ Clear'
    );

    // ── Close ──
    const closeBtn = makeElement(
      'button',
      {
        className: 'ps-close-btn',
        title: 'Close',
        onclick: () => this.hide(),
      },
      '×'
    );

    this.element = makeElement(
      'div',
      { className: 'ps-panel' },
      makeElement(
        'div',
        { className: 'ps-row' },
        // Paint mode group
        makeElement(
          'div',
          { className: 'ps-group' },
          this.ui.addBtn,
          this.ui.subBtn,
          this.ui.paintBtn
        ),
        sep1,
        // Brush size group
        makeElement(
          'div',
          { className: 'ps-group' },
          this.ui.brushSmall,
          this.ui.brushMed,
          this.ui.brushLarge
        ),
        sep2,
        // Segment toggles
        makeElement(
          'div',
          { className: 'ps-group' },
          this.ui.codeToggle,
          this.ui.sigToggle,
          this.ui.docsToggle
        ),
        sep3,
        // Bulk actions
        makeElement(
          'div',
          { className: 'ps-group' },
          this.ui.selectAllBtn,
          this.ui.clearAllBtn
        ),
        closeBtn
      )
    );
  }

  _hideDialogHeader() {
    // After a tick so the dialog is in DOM
    setTimeout(() => {
      if (!this.dialog) return;
      const el = this.dialog.element;
      if (!el) return;
      const header = el.querySelector('.uw-header');
      if (header) header.style.display = 'none';
      const content = el.querySelector('.uw-content');
      if (content) {
        content.style.padding = '0';
        content.style.overflow = 'visible';
      }
      el.style.minWidth = '0';
      el.style.minHeight = '0';
      el.style.height = 'auto';
      el.style.width = 'auto';
      if (el.querySelector('.uw-corner')) {
        el.querySelectorAll('.uw-corner').forEach((c) => c.remove());
      }
      // Make whole panel draggable
      this.element.style.cursor = 'grab';
      this.element.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, input')) return;
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        el.style.transform = 'none';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        const st = {
          sx: e.clientX,
          sy: e.clientY,
          ox: rect.left,
          oy: rect.top,
        };
        this.element.style.cursor = 'grabbing';
        const mm = (ev) => {
          el.style.left = st.ox + ev.clientX - st.sx + 'px';
          el.style.top = Math.max(0, st.oy + ev.clientY - st.sy) + 'px';
        };
        const mu = () => {
          this.element.style.cursor = 'grab';
          window.removeEventListener('pointermove', mm);
          window.removeEventListener('pointerup', mu);
        };
        window.addEventListener('pointermove', mm);
        window.addEventListener('pointerup', mu);
      });
    }, 30);
  }

  _modeBtn(mode, label, color) {
    const btn = makeElement(
      'button',
      {
        className: 'ps-btn ps-mode-btn',
        title: mode === 'add' ? 'Add mode' : 'Subtract mode',
        onclick: () => {
          this.currentPaintMode = mode;
          if (this.app.glowDrawer) this.app.glowDrawer.setMode(mode);
          this.updateButtonStates();
          this.resetActivityTimer();
        },
      },
      label
    );
    btn.dataset.mode = mode;
    return btn;
  }

  _sizeBtn(label, level, title) {
    const btn = makeElement(
      'button',
      {
        className: 'ps-btn ps-size-btn',
        title,
        onclick: () => {
          if (this.app.glowDrawer) this.app.glowDrawer.setLevel(level);
          this.element
            .querySelectorAll('.ps-size-btn')
            .forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.resetActivityTimer();
        },
      },
      label
    );
    btn.dataset.level = level;
    if (level === 5) btn.classList.add('active'); // default medium
    return btn;
  }

 _segToggle(seg, label, color, title) {
    const btn = makeElement('button', {
      className: 'ps-btn ps-seg-btn active',
      title,
      style: { '--seg-color': color },
      onclick: () => {
        btn.classList.toggle('active');
        this.resetActivityTimer();
        if (this.app.glowDrawer && typeof this.app.glowDrawer.setSegments === 'function') {
          this.app.glowDrawer.setSegments(this._getActiveSegs());
        }
      }
    }, label);
    btn.dataset.seg = seg;
    return btn;
  }

  _getActiveSegs() {
    return {
      code: this.ui.codeToggle?.classList.contains('active'),
      sig: this.ui.sigToggle?.classList.contains('active'),
      docs: this.ui.docsToggle?.classList.contains('active'),
    };
  }

  _bulkApply(isSelect) {
    if (!this.app.buildPromptTab) return;
    const segs = this._getActiveSegs();
    const allWidgets = this.app.getAllVisibilityWidgets?.() || [];
    allWidgets.forEach((widget) => {
      const s = { ...widget.state };
      if (segs.code) s.code = isSelect;
      if (segs.sig) s.signatures = isSelect;
      if (segs.docs) s.docsLevel = isSelect ? 4 : 0;
      widget.setState(s, true);
    });
    this.app.buildPromptTab._widgetStateChangeCallback?.();
  }

  _injectPaintStyles() {
    if (document.getElementById('ps-styles')) return;
    const s = document.createElement('style');
    s.id = 'ps-styles';
    s.textContent = `
      .ps-panel {
        display: flex;
        flex-direction: column;
        background: rgba(16, 18, 26, 0.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.09);
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        overflow: hidden;
        user-select: none;
      }
      .ps-row {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 7px 10px;
      }
      .ps-group {
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .ps-sep {
        width: 1px;
        height: 18px;
        background: rgba(255,255,255,0.1);
        margin: 0 4px;
        flex-shrink: 0;
      }
      .ps-btn {
        height: 28px;
        min-width: 28px;
        padding: 0 8px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.06);
        color: rgba(210,225,255,0.8);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.12s, border-color 0.12s, color 0.12s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .ps-btn:hover {
        background: rgba(255,255,255,0.12);
        color: #fff;
      }
      .ps-btn.active {
        background: rgba(255,255,255,0.16);
        border-color: rgba(255,255,255,0.28);
        color: #fff;
      }
      .ps-mode-btn[data-mode="add"].active {
        background: rgba(40,167,69,0.28);
        border-color: rgba(40,200,80,0.55);
        color: #7fffaa;
      }
      .ps-mode-btn[data-mode="subtract"].active {
        background: rgba(220,53,69,0.28);
        border-color: rgba(255,80,100,0.55);
        color: #ff9aaa;
      }
      .ps-paint-btn.active {
        background: rgba(255,193,7,0.25);
        border-color: rgba(255,210,60,0.55);
        color: #ffe680;
        box-shadow: 0 0 10px rgba(255,200,0,0.3);
      }
      .ps-size-btn {
        font-size: 10px;
        min-width: 24px;
        padding: 0 5px;
      }
      .ps-size-btn.active {
        background: rgba(100,150,255,0.22);
        border-color: rgba(100,180,255,0.45);
        color: #c0d8ff;
      }
      .ps-seg-btn {
        font-size: 11px;
        font-family: ui-monospace, monospace;
        min-width: 24px;
        padding: 0 6px;
        border-color: rgba(255,255,255,0.08);
      }
      .ps-seg-btn[data-seg="code"].active {
        background: rgba(0,136,255,0.25);
        border-color: rgba(0,160,255,0.5);
        color: #80cfff;
      }
      .ps-seg-btn[data-seg="sig"].active {
        background: rgba(217,142,72,0.25);
        border-color: rgba(240,160,80,0.5);
        color: #ffd0a0;
      }
      .ps-seg-btn[data-seg="docs"].active {
        background: rgba(132,51,255,0.25);
        border-color: rgba(160,80,255,0.5);
        color: #d0a8ff;
      }
      .ps-all-btn.active, .ps-all-btn:hover {
        background: rgba(40,167,69,0.2);
        border-color: rgba(40,180,80,0.4);
        color: #80ffaa;
      }
      .ps-clear-btn:hover {
        background: rgba(220,53,69,0.2);
        border-color: rgba(255,80,100,0.4);
        color: #ff9aaa;
      }
      .ps-close-btn {
        margin-left: 4px;
        width: 22px;
        height: 22px;
        border-radius: 5px;
        border: none;
        background: transparent;
        color: rgba(200,200,220,0.4);
        font-size: 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.12s, color 0.12s;
        flex-shrink: 0;
      }
      .ps-close-btn:hover {
        background: rgba(255,80,80,0.22);
        color: #ff9999;
      }
    `;
    document.head.appendChild(s);
  }

  adjustLayoutForPanel() {}


  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### PaintSelectionPanel\n\nA floating panel that provides tools for painting and bulk-editing the prompt visibility state of files in the workspace.";
    }
}