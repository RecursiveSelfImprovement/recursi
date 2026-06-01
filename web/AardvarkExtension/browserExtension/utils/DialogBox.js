class DialogBox {
  static baseZIndex = 210000;

  static currentZIndex = 210000;

  static getNextZ() {
    this.currentZIndex += 1;
    return this.currentZIndex;
  }

  static allBoxes = [];

  static iframeCovers = [];

  static activeDialogCount = 0;

  constructor(options = {}) {
    // 1. Merge options with defaults (Merging features from Extended)
    this.options = {
      title: 'Dialog',
      content: null,
      buttons: [], // Default empty, but checked below
      appearanceManager: null,
      width: '600px',
      height: 'auto',
      position: null,
      onClose: null,
      onResize: null,
      onMove: null,
      onGeometryChange: null,
      transparent: false,
      titleBarAtBottom: false,
      noPadding: false,
      allowMaximize: true, // New capability
      ...options,
    };

    // Smart Defaults (from Extended): Default to OK if undefined
    if (this.options.buttons === undefined) {
      this.options.buttons = [{ label: 'OK' }];
    }

    // Auto-attach appearance manager if global app exists (from Extended)
    if (
      !this.options.appearanceManager &&
      window.projectApp?.appearanceManager
    ) {
      this.options.appearanceManager = window.projectApp.appearanceManager;
    }

    // Size Normalization
    if (this.options.size) {
      this.options.width =
        typeof this.options.size[0] === 'number'
          ? `${this.options.size[0]}px`
          : this.options.size[0];
      this.options.height =
        typeof this.options.size[1] === 'number'
          ? `${this.options.size[1]}px`
          : this.options.size[1];
    }

    // Content Normalization
    if (this.options.contentElement)
      this.options.content = this.options.contentElement;
    if (this.options.contentHTML)
      this.options.content = makeElement('div', {
        innerHTML: this.options.contentHTML,
      });

    // State Init
    this.callback = this.options.onGeometryChange;
    this.appearanceUpdateCallback = null;
    this.isDragging = false;
    this.isResizing = false;
    this.isMaximized = false;
    this.preMaximizeState = null;
    this.dragState = {};
    this.resizeState = {};
    this.minWidth = 70;
    this.minHeight = 40;

    this._applyStyles();
    DialogBox.allBoxes.push(this);
    DialogBox.activeDialogCount++;

    // Build DOM
    const corners = ['TopRight', 'BottomRight', 'BottomLeft', 'TopLeft'];
    this.sizers = corners.map((corner, i) =>
      makeElement(
        'div',
        { className: `dialog-resizer dialog-${corner.toLowerCase()}` },
        DialogBox.makeResizerCorner({
          width: 15,
          height: 15,
          whichCorner: i,
          className: 'dialog-resizer-svg',
        })
      )
    );

    this.header = makeElement('div', { className: 'dialog-header' });
    if (this.options.title) {
      const titleElement = makeElement(
        'span',
        { className: 'dialog-title' },
        this.options.title
      );
      this.header.appendChild(titleElement);
    }

    this.transparencyButton = makeElement('button', {
      className: 'dialog-util-btn',
      title: 'Toggle Transparency',
      onclick: (e) => {
        e.stopPropagation();
        this.toggleTransparency();
      },
    });

    // Header Buttons
    this.header.appendChild(this.transparencyButton);

    this.closeButton = DialogBox.makeCrossMark({
      width: 15,
      height: 15,
      className: 'dialog-close-btn',
    });
    this.closeButton.onclick = (e) => {
      e.stopPropagation();
      this.close();
    };

    this.header.appendChild(this.closeButton);

    // Double click header to maximize
    if (this.options.allowMaximize) {
      this.header.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        this.toggleMaximize();
      });
    }

    this.contentElement = makeElement('div', { className: 'dialog-content' });
    if (this.options.noPadding) this.contentElement.style.padding = '0';
    if (this.options.content instanceof Node)
      this.contentElement.appendChild(this.options.content);

    this.element = makeElement('div', { className: 'dialog-box' }, [
      this.header,
      this.contentElement,
      ...this.sizers,
    ]);

    this._createFooter();
    this._subscribeToAppearanceManager();

    this.setZOnTop();
    this.element.style.width = this.options.width;
    this.element.style.height = this.options.height;

    if (this.options.position) {
      this.element.style.left = `${this.options.position[0]}px`;
      this.element.style.top = `${this.options.position[1]}px`;
      this.element.style.transform = 'none';
    }

    if (this.options.transparent) this.element.classList.add('is-transparent');
    if (this.options.titleBarAtBottom)
      this.element.classList.add('title-bar-bottom');

    this._setupEventListeners();
    document.body.appendChild(this.element);

    setTimeout(() => this.constrainPosition(), 0);

    if (typeof this.options.onResize === 'function') {
      this.resizeObserver = new ResizeObserver(() => {
        const rect = this.element.getBoundingClientRect();
        this.options.onResize(rect.width, rect.height);
      });
      this.resizeObserver.observe(this.element);
    }
  }

  static prompt(options = {}) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = options.defaultValue || '';
      input.style.width = '100%';
      input.style.marginBottom = '10px';
      input.style.padding = '8px';
      input.style.backgroundColor = '#333';
      input.style.color = '#fff';
      input.style.border = '1px solid #555';
      input.style.borderRadius = '4px';

      const msg = document.createElement('div');
      msg.textContent = options.message || '';
      msg.style.marginBottom = '10px';

      const container = document.createElement('div');
      container.append(msg, input);

      const d = new DialogBox({
        title: options.title || 'Prompt',
        content: container,
        width: '350px',
        buttons: [
          {
            label: options.okLabel || 'OK',
            className: 'primary',
            onClick: () => {
              resolve(input.value);
            },
          },
          {
            label: 'Cancel',
            onClick: () => {
              resolve(null);
            },
          },
        ],
        onClose: () => {
          // If closed via X or Escape without buttons, resolve null
          resolve(null);
        },
      });

      setTimeout(() => input.focus(), 50);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          resolve(input.value);
          d.close();
        }
      });
    });
  }

  maximize() {
    if (this.isMaximized) return;
    this.isMaximized = true;

    // Save current state
    this.preMaximizeState = {
      style: this.element.getAttribute('style'),
      class: this.element.className,
    };

    // Apply maximized class
    this.element.classList.add('maximized');

    // Create Restore Indicator
    this._createRestoreIndicator();
  }

  restore() {
    if (!this.isMaximized) return;
    this.isMaximized = false;

    // Restore state
    if (this.preMaximizeState) {
      this.element.setAttribute('style', this.preMaximizeState.style);
      this.element.className = this.preMaximizeState.class;
    }

    this.element.classList.remove('maximized');
    this._removeRestoreIndicator();
    this.constrainPosition();
    this.setZOnTop();
  }

  toggleMaximize() {
    if (this.isMaximized) this.restore();
    else this.maximize();
  }

  _createRestoreIndicator() {
    if (this.restoreIndicator) return;

    this.restoreIndicator = makeElement(
      'div',
      {
        className: 'dialog-restore-indicator',
        title: 'Restore Dialog',
        onclick: (e) => {
          e.stopPropagation();
          this.restore();
        },
      },
      [
        // Simple "contract" icon
        makeElement(
          'svg:svg',
          { viewBox: '0 0 24 24', width: 24, height: 24 },
          [
            makeElement('svg:path', {
              d: 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z',
              fill: 'currentColor',
            }),
          ]
        ),
      ]
    );

    // Ensure it sits above everything
    this.restoreIndicator.style.zIndex =
      parseInt(this.element.style.zIndex || 1000) + 1;
    document.body.appendChild(this.restoreIndicator);
  }

  _removeRestoreIndicator() {
    if (this.restoreIndicator) {
      this.restoreIndicator.remove();
      this.restoreIndicator = null;
    }
  }

  _createFooter() {
    if (
      this.options.buttons &&
      Array.isArray(this.options.buttons) &&
      this.options.buttons.length > 0
    ) {
      this.footer = makeElement('div', { className: 'dialog-footer' });
      this.options.buttons.forEach((btnConfig) => {
        const button = makeElement(
          'button',
          {
            className: `dialog-button ${btnConfig.className || ''}`,
            id: btnConfig.id || null,
            onclick: (e) => {
              e.stopPropagation();
              if (btnConfig.onClick) {
                // If handler returns explicit false, do not close
                if (btnConfig.onClick(e.currentTarget, this) === false) return;
              }
              this.close();
            },
          },
          btnConfig.label
        );
        this.footer.appendChild(button);
      });
      this.element.appendChild(this.footer);
    }
  }

  _subscribeToAppearanceManager() {
    const appearanceManager = this.options.appearanceManager;
    if (
      appearanceManager &&
      typeof appearanceManager.subscribe === 'function'
    ) {
      this.appearanceUpdateCallback = this._applyAppearanceSettings.bind(this);
      appearanceManager.subscribe(this.appearanceUpdateCallback);
      if (typeof appearanceManager.getCurrentSettings === 'function') {
        this._applyAppearanceSettings(appearanceManager.getCurrentSettings());
      }
    }
  }

  _applyAppearanceSettings(settings) {
    // Hooks for future theme logic
  }

  setTitle(newTitle) {
    this.options.title = newTitle;
    const titleEl = this.header.querySelector('.dialog-title');
    if (titleEl) titleEl.textContent = newTitle;
  }

  close() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.options.appearanceManager && this.appearanceUpdateCallback) {
      if (typeof this.options.appearanceManager.unsubscribe === 'function') {
        this.options.appearanceManager.unsubscribe(
          this.appearanceUpdateCallback
        );
      }
    }

    this._removeRestoreIndicator();

    this.element.style.transition = 'opacity .25s ease, transform .25s ease';
    this.element.style.opacity = '0';

    const isCssCentered =
      this.element.style.left === '50%' && this.element.style.top === '50%';
    if (isCssCentered) {
      this.element.style.transform = 'translate(-50%, -50%) scale(0.97)';
    } else {
      const currentTransform = this.element.style.transform;
      if (currentTransform && currentTransform !== 'none') {
        this.element.style.transform = `${currentTransform} scale(0.97)`;
      } else {
        this.element.style.transform = 'scale(0.97)';
      }
    }

    const removeFn = () => {
      this.element.remove();
      DialogBox.allBoxes = DialogBox.allBoxes.filter((b) => b !== this);
      DialogBox.activeDialogCount--;
      if (typeof this.options.onClose === 'function') {
        this.options.onClose();
      }
    };
    this.element.addEventListener('transitionend', removeFn, { once: true });
    setTimeout(removeFn, 300);
  }

  static showIframeCovers() {
    document.querySelectorAll('iframe').forEach((iframe) => {
      const r = iframe.getBoundingClientRect();
      const cover = makeElement('div', {
        className: 'dialog-iframe-cover',
        style: {
          top: `${r.top}px`,
          left: `${r.left}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          zIndex: DialogBox.getNextZ(),
        },
      });
      document.body.appendChild(cover);
      DialogBox.iframeCovers.push(cover);
    });
    document.body.style.userSelect = 'none';
  }

  static hideIframeCovers() {
    DialogBox.iframeCovers.forEach((c) => c.remove());
    DialogBox.iframeCovers.length = 0;
    document.body.style.userSelect = '';
  }

  static handleDragStart(dBox, e) {
    if (!e.target.closest('.dialog-header') || e.target.closest('button'))
      return;
    if (dBox.isResizing || dBox.isMaximized) return;

    e.preventDefault();
    dBox.isDragging = true;
    dBox.setZOnTop();
    DialogBox.showIframeCovers();
    dBox.element.style.transition = 'none';

    const rect = dBox.element.getBoundingClientRect();
    dBox.element.style.transform = 'none';
    dBox.element.style.left = `${rect.left}px`;
    dBox.element.style.top = `${rect.top}px`;

    dBox.dragState = { prevX: e.clientX, prevY: e.clientY, rect };
    dBox.dragMoveListener = (ev) => DialogBox.handleDragMove(dBox, ev);
    dBox.dragEndListener = () => DialogBox.handleDragEnd(dBox);

    window.addEventListener('mousemove', dBox.dragMoveListener);
    window.addEventListener('mouseup', dBox.dragEndListener);
    window.addEventListener('mouseleave', dBox.dragEndListener);
    window.addEventListener('blur', dBox.dragEndListener);
  }

  static handleDragMove(dBox, e) {
    if (!dBox.isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dBox.dragState.prevX;
    const dy = e.clientY - dBox.dragState.prevY;
    const newLeft = dBox.dragState.rect.left + dx;
    const newTop = dBox.dragState.rect.top + dy;
    Object.assign(dBox.element.style, {
      left: `${newLeft}px`,
      top: `${newTop}px`,
    });
    if (dBox.callback) dBox.triggerCallback();
    if (typeof dBox.options.onMove === 'function') {
      dBox.options.onMove(newLeft, newTop);
    }
  }

  static handleDragEnd(dBox) {
    if (!dBox.isDragging) return;
    window.removeEventListener('mousemove', dBox.dragMoveListener);
    window.removeEventListener('mouseup', dBox.dragEndListener);
    window.removeEventListener('mouseleave', dBox.dragEndListener);
    window.removeEventListener('blur', dBox.dragEndListener);

    DialogBox.hideIframeCovers();
    dBox.isDragging = false;
    dBox.dragState = {};
    dBox.element.style.transition = '';
    dBox.constrainPosition();
  }

  static handleResizeStart(dBox, e) {
    if (dBox.isMaximized) return;
    e.preventDefault();
    dBox.isResizing = true;
    dBox.setZOnTop();
    DialogBox.showIframeCovers();
    dBox.element.style.transition = 'none';
    const rect = dBox.element.getBoundingClientRect();
    dBox.element.style.transform = 'none';
    dBox.element.style.left = `${rect.left}px`;
    dBox.element.style.top = `${rect.top}px`;
    const cornerIndex = dBox.sizers.indexOf(e.currentTarget);
    dBox.resizeState = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      xFactor: cornerIndex === 0 || cornerIndex === 1 ? 1 : -1,
      yFactor: cornerIndex === 1 || cornerIndex === 2 ? 1 : -1,
    };
    dBox.resizeMoveListener = (ev) => DialogBox.handleResizeMove(dBox, ev);
    dBox.resizeEndListener = () => DialogBox.handleResizeEnd(dBox);
    window.addEventListener('mousemove', dBox.resizeMoveListener);
    window.addEventListener('mouseup', dBox.resizeEndListener, { once: true });
  }

  static handleResizeMove(dBox, e) {
    if (!dBox.isResizing) return;
    e.preventDefault();
    const { startX, startY, startPos, xFactor, yFactor } = dBox.resizeState;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newW = Math.max(startPos.width + dx * xFactor, dBox.minWidth);
    let newH = Math.max(startPos.height + dy * yFactor, dBox.minHeight);
    let newL = startPos.left;
    let newT = startPos.top;

    // Adjust position if resizing from left or top
    if (xFactor === -1) newL = startPos.left + (startPos.width - newW);
    if (yFactor === -1) newT = startPos.top + (startPos.height - newH);

    Object.assign(dBox.element.style, {
      width: `${newW}px`,
      height: `${newH}px`,
      left: `${newL}px`,
      top: `${newT}px`,
    });

    if (dBox.callback) dBox.triggerCallback();

    if (
      (xFactor === -1 || yFactor === -1) &&
      typeof dBox.options.onMove === 'function'
    ) {
      dBox.options.onMove(newL, newT);
    }
  }

  static handleResizeEnd(dBox) {
    window.removeEventListener('mousemove', dBox.resizeMoveListener);
    DialogBox.hideIframeCovers();
    dBox.isResizing = false;
    if (dBox.callback) dBox.triggerCallback();

    if (typeof dBox.options.onMove === 'function') {
      const finalLeft = parseFloat(dBox.element.style.left);
      const finalTop = parseFloat(dBox.element.style.top);
      if (!isNaN(finalLeft) && !isNaN(finalTop)) {
        dBox.options.onMove(finalLeft, finalTop);
      }
    }

    dBox.resizeState = {};
    dBox.element.style.transition = '';
  }

  _setupEventListeners() {
    this.header.addEventListener('mousedown', (e) =>
      DialogBox.handleDragStart(this, e)
    );
    this.sizers.forEach((r) =>
      r.addEventListener('mousedown', (e) =>
        DialogBox.handleResizeStart(this, e)
      )
    );
    this.transparencyButton.onclick = () => this.toggleTransparency();
  }

  triggerCallback() {
    if (!this.callback) return;
    const rect = this.element.getBoundingClientRect();
    const contentRect = this.contentElement.getBoundingClientRect();
    this.callback(this, { outer: rect, inner: contentRect });
  }

  setZOnTop() {
    const newZ = DialogBox.getNextZ();
    this.element.style.zIndex = newZ;
    if (this.restoreIndicator) {
      this.restoreIndicator.style.zIndex = newZ + 1;
    }
  }

  toggleTransparency() {
    this.element.classList.toggle('is-transparent');
  }

  constrainPosition() {
    const rect = this.element.getBoundingClientRect();
    const minVisibleWidth = 50;
    const safeMarginTop = 10;
    let newTop = rect.top;
    let newLeft = rect.left;
    if (newTop < safeMarginTop) newTop = safeMarginTop;
    if (newLeft < minVisibleWidth - rect.width)
      newLeft = minVisibleWidth - rect.width;
    if (newLeft > window.innerWidth - minVisibleWidth)
      newLeft = window.innerWidth - minVisibleWidth;
    if (newTop !== rect.top || newLeft !== rect.left) {
      this.element.style.transform = 'none';
      this.element.style.top = `${newTop}px`;
      this.element.style.left = `${newLeft}px`;
    }
  }

  static isAnyDialogOpen() {
    return DialogBox.activeDialogCount > 0;
  }

  _applyStyles() {
    const css = `
          .dialog-box {
            position: fixed; min-width: 200px; min-height: 150px;
            background-color: #2a2a2a; border: 1px solid #4a4a4a;
            border-radius: 8px; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
            display: flex; flex-direction: column; overflow: visible;
            top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 1000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px; line-height: 1.5; color: #d4d4d4;
            box-sizing: border-box; text-align: left;
          }
          .dialog-box.maximized {
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            transform: none !important; border-radius: 0 !important;
            border: none !important; box-shadow: none !important;
          }
          .dialog-box.maximized .dialog-header { display: none !important; }
          .dialog-box.maximized .dialog-resizer { display: none !important; }
          .dialog-box.maximized .dialog-content { border-radius: 0; }
          .dialog-restore-indicator {
            position: fixed; top: 10px; right: 10px;
            width: 40px; height: 40px; background-color: rgba(30,30,30,0.8);
            border: 1px solid rgba(255,255,255,0.2); border-radius: 50%;
            color: white; display: flex; align-items: center; justify-content: center;
            cursor: pointer; backdrop-filter: blur(4px); transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
          .dialog-restore-indicator:hover { background-color: var(--accent-blue, #007acc); transform: scale(1.1); }
          .dialog-box *, .dialog-box *::before, .dialog-box *::after { box-sizing: border-box; }
          .dialog-header {
            padding: 8px 12px; background-color: #333333;
            border-bottom: 1px solid #4a4a4a; display: flex;
            justify-content: space-between; align-items: center;
            cursor: move; user-select: none; flex-shrink: 0;
            border-radius: 7px 7px 0 0; height: auto; min-height: 32px;
          }
          .dialog-title {
            font-weight: 600; color: #cccccc; pointer-events: none; flex-grow: 1;
            margin: 0; padding: 0; font-size: 13px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .dialog-close-btn {
            background: none !important; border: none !important; cursor: pointer;
            padding: 0 !important; margin: 0 0 0 8px !important;
            width: 15px !important; height: 15px !important;
            min-width: 15px !important; min-height: 15px !important;
            border-radius: 4px; transition: all 0.2s ease; flex-shrink: 0;
            color: #b0b0b0; display: block;
            opacity: 1 !important; visibility: visible !important; box-shadow: none !important;
          }
          .dialog-close-btn:hover { background-color: #d32f2f !important; color: white !important; transform: scale(1.1); }
          .dialog-util-btn {
            width: 12px !important; height: 12px !important; 
            margin: 0 0 0 8px !important; padding: 0 !important;
            background-color: rgba(255,255,255,0.2) !important;
            border: 1px solid rgba(0,0,0,0.2) !important;
            border-radius: 50% !important; cursor: pointer;
            transition: all 0.2s ease; min-width: 12px !important; min-height: 12px !important;
            box-sizing: border-box !important; display: block; box-shadow: none !important;
          }
          .dialog-util-btn:hover { background-color: #00bfa5 !important; transform: scale(1.1); }
          .maximize-btn:hover { background-color: #28a745 !important; }
          .dialog-content {
            padding: 16px; flex-grow: 1; overflow: auto;
            background-color: #252526; color: #d4d4d4;
            display: flex; flex-direction: column;
          }
          .dialog-footer {
            padding: 12px 16px; background-color: #333333;
            border-top: 1px solid #4a4a4a; display: flex; justify-content: flex-end; gap: 10px;
            flex-shrink: 0; border-radius: 0 0 7px 7px;
          }
          .dialog-button {
            padding: 8px 15px !important; background-color: #6c757d; color: white;
            border: none !important; border-radius: 4px; cursor: pointer; font-weight: 500;
            transition: background-color 0.2s ease; font-size: 13px !important; line-height: 1.4 !important;
          }
          .dialog-button:hover { background-color: #5a6268; }
          .dialog-button.primary { background-color: #007acc; }
          .dialog-button.primary:hover { background-color: #005fa3; }
          .dialog-button.danger { background-color: #d32f2f; }
          .dialog-button.danger:hover { background-color: #b71c1c; }
          .dialog-resizer {
            position: absolute; width: 15px; height: 15px; z-index: 10;
            opacity: 0; transition: opacity 0.2s ease;
          }
          .dialog-box:hover .dialog-resizer { opacity: 0.7; }
          .dialog-resizer:hover { opacity: 1 !important; transform: scale(1.4); }
          .dialog-topleft { top: -2px; left: -2px; cursor: nwse-resize; }
          .dialog-topright { top: -2px; right: -2px; cursor: nesw-resize; }
          .dialog-bottomleft { bottom: -2px; left: -2px; cursor: nesw-resize; }
          .dialog-bottomright { bottom: -2px; right: -2px; cursor: nwse-resize; }
          .dialog-resizer-svg { pointer-events: none; color: #b0b0b0; width: 100%; height: 100%; display: block; }
          .dialog-resizer:hover .dialog-resizer-svg { color: #d4d4d4; }
          .dialog-box.is-transparent { background-color: transparent !important; box-shadow: none !important; border: none !important; }
          .dialog-box.is-transparent .dialog-header { background: rgba(0,0,0,0.2) !important; border-bottom: 1px solid rgba(255,255,255,0.2) !important; }
          .dialog-box.is-transparent .dialog-content { background: transparent !important; }
          .dialog-box.title-bar-bottom { flex-direction: column-reverse; }
          .dialog-box.title-bar-bottom .dialog-header { border-bottom: none; border-top: 1px solid #4a4a4a; border-radius: 0 0 7px 7px; }
          .dialog-box.title-bar-bottom .dialog-content { border-radius: 7px 7px 0 0; }
          .dialog-iframe-cover { position: fixed; background-color: transparent; pointer-events: auto; }
        `;
    applyCss(css, 'DialogBoxBaseStyles');
  }

  static createSVGPath({
    width,
    height,
    color,
    lineWidth,
    joinStyle,
    capStyle,
    coordinates,
    offsetX = 0,
    offsetY = 0,
  }) {
    let d = '';
    coordinates.forEach((c, i) => {
      const x = (c[0] + offsetX) * width;
      const y = (c[1] + offsetY) * height;
      d += (i === 0 ? 'M' : 'L') + `${x} ${y} `;
    });
    return makeElement('svg:path', {
      d,
      stroke: color || 'currentColor',
      'stroke-width': lineWidth || '2',
      'stroke-linecap': capStyle || 'round',
      'stroke-linejoin': joinStyle || 'round',
      fill: 'none',
    });
  }

  static createSVGElement({ width, height, className, elements = [] }) {
    return makeElement(
      'svg:svg',
      { width, height, class: className },
      ...elements
    );
  }

  static makeCrossMark(opts) {
    const { width: w, height: h } = opts;
    const paths = [
      [
        [0.17, 0.17],
        [0.83, 0.83],
      ],
      [
        [0.17, 0.83],
        [0.83, 0.17],
      ],
    ];
    const shadow = paths.map((c) =>
      DialogBox.createSVGPath({
        width: w,
        height: h,
        lineWidth: 5.8,
        color: 'rgba(0,0,0,0.6)',
        offsetX: 0.022,
        offsetY: 0.022,
        coordinates: c,
      })
    );
    const highlight = paths.map((c) =>
      DialogBox.createSVGPath({
        width: w,
        height: h,
        lineWidth: 4,
        coordinates: c,
      })
    );
    return DialogBox.createSVGElement({
      width: w,
      height: h,
      className: opts.className,
      elements: [...shadow, ...highlight],
    });
  }

  static makeResizerCorner(opts) {
    const { width: w, height: h, whichCorner } = opts;
    const definitivePaths = [
      [
        [0.2, 0.15],
        [0.85, 0.15],
        [0.85, 0.8],
      ],
      [
        [0.2, 0.85],
        [0.85, 0.85],
        [0.85, 0.2],
      ],
      [
        [0.8, 0.85],
        [0.15, 0.85],
        [0.15, 0.2],
      ],
      [
        [0.8, 0.15],
        [0.15, 0.15],
        [0.15, 0.8],
      ],
    ];
    const coords = definitivePaths[whichCorner];
    const elems = [
      DialogBox.createSVGPath({
        width: w,
        height: h,
        lineWidth: 4.5,
        capStyle: 'square',
        color: 'rgba(0,0,0,0.5)',
        coordinates: coords,
      }),
      DialogBox.createSVGPath({
        width: w,
        height: h,
        lineWidth: 2.5,
        capStyle: 'square',
        coordinates: coords,
      }),
    ];
    return DialogBox.createSVGElement({
      width: w,
      height: h,
      className: opts.className,
      elements: elems,
    });
  }

}