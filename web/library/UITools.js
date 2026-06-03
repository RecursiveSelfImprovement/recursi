class UITools {
  static _getState() {
    if (!this.hasOwnProperty('_state')) {
      Object.defineProperty(this, '_state', {
        value: {
          all: [],
          z: 100000,
          svgOverlay: null,
          iframeCovers: [],
          safe: { top: 0, bottom: 0, left: 0, right: 0 },
          globalsInit: false,
          styled: false,
          activeCount: 0,
          wheelLockedWidget: null,
        },
        writable: true,
        configurable: true,
      });
    }
    return this._state;
  }

  static get allWidgets() {
    return UITools._getState().all;
  }

  static get activeCount() {
    return UITools._getState().activeCount;
  }

  static get safeArea() {
    return UITools._getState().safe;
  }

  static makeDialog(options = {}) {
    return new UITools({ ...options, _uiMode: 'dialog' });
  }

  static makeWidget(options = {}) {
    return new UITools({ ...options, _uiMode: 'widget' });
  }

  static makeControl(options = {}) {
    return new UITools({ ...options, _uiMode: 'widget', compact: true });
  }

  static setSafeArea(padding = {}) {
    UITools._getState().safe = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      ...padding,
    };
    UITools._getState().all.forEach((w) => {
      if (w._maximized) w.maximize(true);
    });
  }

  static collapseAll() {
    UITools._getState().all.forEach((w) => {
      if (w._floating) w.dockBack();
    });
  }

  static closeAll() {
    [...UITools._getState().all].forEach((w) => w.close?.());
  }

  static isSmallScreen() {
    return window.innerWidth <= 768;
  }

  static prompt(options = {}) {
    return new Promise((resolve) => {
      const inp = UITools._el('input', {
        type: 'text',
        value: options.defaultValue || '',
        className: 'uw-prompt-inp',
      });
      const msg = UITools._el(
        'div',
        { className: 'uw-prompt-msg' },
        options.message || ''
      );
      const wrap = UITools._el('div', {}, msg, inp);

      const d = UITools.makeDialog({
        title: options.title || 'Prompt',
        content: wrap,
        width: '320px',
        height: 'auto',
        allowMinimize: false,
        allowMaximize: false,
        buttons: [
          {
            label: options.okLabel || 'OK',
            className: 'primary',
            onClick: () => {
              resolve(inp.value);
              return true;
            },
          },
          {
            label: 'Cancel',
            onClick: () => {
              resolve(null);
              return true;
            },
          },
        ],
        onClose: () => resolve(null),
      });
      setTimeout(() => inp.focus(), 60);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          resolve(inp.value);
          d.close();
        }
      });
    });
  }

  static _el(tag, attrs = {}, ...children) {
    const el = tag.startsWith('svg:')
      ? document.createElementNS('http://www.w3.org/2000/svg', tag.slice(4))
      : document.createElement(tag);

    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'className' || k === 'class') el.setAttribute('class', v);
      else if (k === 'innerHTML') el.innerHTML = v;
      else if (k === 'textContent') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function')
        el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (typeof v === 'boolean') {
        if (v) el.setAttribute(k, '');
        else el.removeAttribute(k);
      } else el.setAttribute(k, String(v));
    }
    children.flat().forEach((c) => {
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else if (c instanceof Node) el.appendChild(c);
    });
    return el;
  }

  static _setWheelLock(widget) {
    if (UITools._getState().wheelLockedWidget) {
      UITools._getState().wheelLockedWidget._dockedEl?.classList.remove(
        'uw-wheel-locked'
      );
      UITools._getState().wheelLockedWidget._floatEl?.classList.remove(
        'uw-wheel-locked'
      );
    }
    UITools._getState().wheelLockedWidget = widget;

    if (widget) {
      widget._dockedEl?.classList.add('uw-wheel-locked');
      widget._floatEl?.classList.add('uw-wheel-locked');
    }
  }

  constructor(rawOpts = {}) {
    this._id = 'uw' + Math.random().toString(36).slice(2, 9);
    this._mode = rawOpts._uiMode || 'dialog';

    const defaults = {
      title: this._mode === 'widget' ? 'Widget' : 'Dialog',
      color: [100, 180, 255],
      position: null,
      stateId: null,
      parent: null,
      midiCC: null,
      compact: false,
      onClose: null,
      onMove: null,
      onResize: null,
      onGeometryChange: null,
      content: null,
      contentElement: null,
      contentHTML: null,
      customHeaderControls: null,
      buttons: [],
      width: '520px',
      height: 'auto',
      minWidth: 160,
      minHeight: 80,
      allowMaximize: true,
      allowMinimize: true,
      allowTransparency: false,
      noPadding: false,
      titleBarAtBottom: false,
      transparent: false,
      size: null,
      type: 'toggle',
      label: 'Control',
      value: null,
      min: 0,
      max: 1,
      step: 0.01,
      selectOptions: [],
      placeholder: '',
      onChange: null,
      env: null,
      appendTo: null,
    };

    this.options = { ...defaults, ...rawOpts };

    this.env = this.options.env || null;
    this.container =
      this.env?.container || this.options.appendTo || document.body;

    if (Array.isArray(this.options.size)) {
      const [w, h] = this.options.size;
      if (w != null) this.options.width = typeof w === 'number' ? `${w}px` : String(w);
      if (h != null) this.options.height = typeof h === 'number' ? `${h}px` : String(h);
    }

    if (this.options.contentElement)
      this.options.content = this.options.contentElement;
    if (this.options.contentHTML)
      this.options.content = UITools._el('div', {
        innerHTML: this.options.contentHTML,
      });

    this.callback = this.options.onGeometryChange;

    this._maximized = false;
    this._minimized = false;
    this._floating = false;
    this._midiArmed = false;
    this._value = this.options.value ?? this._defaultVal();
    this._children = [];
    this._connTimer = null;
    this._dragSt = null;
    this._resizeSt = null;
    this._preMaxSt = null;
    this._preMinH = null;
    this._restored = false;
    this._floatPos = { x: 300, y: 200 };
    this._isSnapped = false;

    this.element = null;
    this.header = null;
    this.contentElement = null;
    this.footer = null;
    this._sizers = [];
    this._dockedCtr = null;
    this._dockedEl = null;
    this._placeholderEl = null;
    this._floatEl = null;

    UITools._getState().all.push(this);
    if (this.options.parent instanceof UITools)
      this.options.parent._children.push(this);

    UITools._applyStyles();
    UITools._initGlobalListeners();
    this._build();
  }

  set content(v) {
    this.setContent(v);
  }

  set value(v) {
    this.setValue(v);
  }

  _build() {
    if (this._mode === 'dialog') this._buildDialog();
    else this._buildWidgetDocked();
  }

  _getEffectiveSafeArea() {
    const s = { ...UITools._getState().safe };
    let lPanel = null;
    let rPanel = null;
    if (typeof SidePanel !== 'undefined' && typeof SidePanel.getInstances === 'function') {
      const instances = SidePanel.getInstances();
      if (instances) {
        lPanel = instances.left;
        rPanel = instances.right;
      }
    }
    if (lPanel && lPanel.element && lPanel.isOpen && this.element && this.element.contains(lPanel.element)) {
      s.left = 0;
    }
    if (rPanel && rPanel.element && rPanel.isOpen && this.element && this.element.contains(rPanel.element)) {
      s.right = 0;
    }
    return s;
  }

  _buildDialog() {
    const o = this.options;
    const compact = o.compact;

    const btnNodes = [];
    if (o.allowTransparency)
      btnNodes.push(this._utilBtn('◑', 'Transparency', () => this.toggleTransparency()));
    if (o.allowMinimize)
      btnNodes.push(this._utilBtn('▁', 'Minimize', () => this.toggleMinimize()));
    if (o.allowMaximize)
      btnNodes.push(this._utilBtn('⊙', 'Maximize', () => this.toggleMaximize()));
    btnNodes.push(this._closeBtn());

    const ctrls = UITools._el('div', { className: 'uw-controls' }, btnNodes);

    const headerChildren = [];
    if (!compact)
      headerChildren.push(UITools._el('div', { className: 'uw-swipe-hint' }));
    headerChildren.push(
      UITools._el('span', { className: 'uw-title' }, o.title)
    );

    if (o.customHeaderControls) {
      headerChildren.push(o.customHeaderControls);
    }

    headerChildren.push(ctrls);

    this.header = UITools._el(
      'div',
      { className: `uw-header${compact ? ' uw-header-compact' : ''}` },
      headerChildren
    );

    this.contentElement = UITools._el('div', { className: 'uw-content' });
    if (o.noPadding) this.contentElement.style.padding = '0';
    
    if (o.content instanceof Node) this.contentElement.appendChild(o.content);
    else if (typeof o.content === 'string')
      this.contentElement.innerHTML = o.content;

    this._sizers = this._makeCorners();

    this.element = UITools._el(
      'div',
      { className: 'uw-dialog' },
      this.header,
      this.contentElement,
      ...this._sizers
    );

    this.element.addEventListener('mousedown', () => this.bringToFront(), {
      capture: true,
      passive: true,
    });
    this.element.addEventListener('touchstart', () => this.bringToFront(), {
      capture: true,
      passive: true,
    });

    if (o.transparent) this.element.classList.add('uw-transparent');
    if (o.titleBarAtBottom) this.element.classList.add('uw-title-bottom');
    if (compact) this.element.classList.add('uw-dialog-compact');

    if (o.buttons?.length) this._buildFooter();

    this._setZ();
    this._restoreState();

    const isHiddenMode = UITools.creationVisibilityMode === 'hidden';
    this.element.style.opacity = isHiddenMode ? '0.01' : '0';
    this.element.style.transform = isHiddenMode ? 'none' : 'scale(0.92)';

    if (!this._restored) {
      this.element.style.width = o.width;
      this.element.style.height = o.height;
      if (o.position) {
        this.element.style.left = `${o.position[0]}px`;
        this.element.style.top = `${o.position[1]}px`;
      } else {
        this._smartDialogPos();
      }
    }

    this._listenDragDialog();
    this._listenResizeDialog();
    UITools._getState().activeCount++;

    this.container.appendChild(this.element);

    if (
      this.env ||
      this.container !== document.body ||
      (this.container &&
        this.container.className &&
        this.container.className.includes('vibes'))
    ) {
      this.element.style.position = 'absolute';
    }

    this._setupLifecycleObserver();
    this._softClamp();
    if (this.callback) this.triggerCallback();

    if (!isHiddenMode) {
      void this.element.offsetHeight;
      this.element.style.transition = 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
      this.element.style.opacity = '1';
      this.element.style.transform = 'none';

      setTimeout(() => {
        if (this.element) {
          this.element.style.transition = '';
        }
      }, 250);
    }
  }

  _buildWidgetDocked() {
    const o = this.options;
    const phDot = UITools._el('div', {
      className: 'uw-w-ph-dot',
      style: { background: this._colorCss() },
    });
    const phLbl = UITools._el('span', { className: 'uw-w-ph-lbl' }, o.label);
    const phBtn = UITools._el(
      'button',
      {
        className: 'uw-w-ph-btn',
        title: 'Dock',
        onclick: (e) => {
          e.stopPropagation();
          this.dockBack();
        },
      },
      '↩'
    );
    this._placeholderEl = UITools._el(
      'div',
      { className: 'uw-w-ph', style: { display: 'none' } },
      phDot,
      phLbl,
      phBtn
    );

    const lbl = UITools._el('span', { className: 'uw-w-lbl' }, o.label);
    const popBtn = UITools._el(
      'button',
      { className: 'uw-w-pop', title: 'Pop out' },
      '↗'
    );
    popBtn.onclick = (e) => {
      e.stopPropagation();
      this.popOut();
    };

    const dragGrip = UITools._el(
      'div',
      {
        className: 'uw-inline-grip',
        title: 'Drag to pop out / Right-Click for menu',
      },
      '⋮'
    );

    if (o.compact) {
      const hdr = UITools._el(
        'div',
        { className: 'uw-inline-hdr' },
        dragGrip,
        lbl,
        popBtn
      );
      hdr.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._showContextMenu(e.clientX, e.clientY);
      });
      const ctrlWrap = UITools._el(
        'div',
        { className: 'uw-w-ctrl' },
        this._buildControl('docked')
      );
      this._dockedEl = UITools._el(
        'div',
        { className: 'uw-w-docked uw-w-inline' },
        hdr,
        ctrlWrap
      );
      this._setupSmartSplit(this._dockedEl, hdr, ctrlWrap);
    } else {
      this._midiDotEl = UITools._el('div', {
        className: 'uw-midi-dot',
        title: 'Arm MIDI',
        onclick: () => this._toggleMidi(),
      });
      this._midiDotEl.classList.toggle('uw-midi-armed', this._midiArmed);
      const hdr = UITools._el(
        'div',
        { className: 'uw-w-hdr' },
        dragGrip,
        this._midiDotEl,
        lbl,
        popBtn
      );
      hdr.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._showContextMenu(e.clientX, e.clientY);
      });
      const ctrlWrap = UITools._el(
        'div',
        { className: 'uw-w-ctrl' },
        this._buildControl('docked')
      );
      this._dockedEl = UITools._el(
        'div',
        { className: 'uw-w-docked' },
        hdr,
        ctrlWrap
      );
    }

    this._listenInlineDragOut(dragGrip);
    this._dockedCtr = UITools._el(
      'div',
      { className: 'uw-w-wrap' },
      this._placeholderEl,
      this._dockedEl
    );

    this._setupLifecycleObserver();
  }

  popOut(startX = null, startY = null) {
    if (this._floating || this._mode !== 'widget') return;
    this._floating = true;
    this._saveState();

    this._placeholderEl.style.display = 'flex';
    this._dockedEl.style.display = 'none';

    const o = this.options;
    const dockBtn = UITools._el(
      'button',
      {
        className: 'uw-float-dock',
        onclick: (e) => {
          e.stopPropagation();
          this.dockBack();
        },
      },
      '↩'
    );
    const ctrlWrap = UITools._el(
      'div',
      { className: 'uw-float-ctrl' },
      this._buildControl('float')
    );
    const lH = UITools._el('div', { className: 'uw-fres uw-fres-l' });
    const rH = UITools._el('div', { className: 'uw-fres uw-fres-r' });
    this._listenWidgetHResize(lH, 'left');
    this._listenWidgetHResize(rH, 'right');

    let bar;
    if (o.compact) {
      const dragGrip = UITools._el('div', { className: 'uw-inline-grip' }, '⋮');
      const lbl = UITools._el('span', { className: 'uw-inline-lbl' }, o.label);
      bar = UITools._el(
        'div',
        { className: 'uw-inline-hdr' },
        dragGrip,
        lbl,
        dockBtn
      );
      bar.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._showContextMenu(e.clientX, e.clientY);
      });
      this._floatEl = UITools._el(
        'div',
        {
          className: 'uw-float uw-float-inline',
          style: { zIndex: ++UITools._getState().z },
        },
        bar,
        ctrlWrap,
        lH,
        rH
      );
      this._setupSmartSplit(this._floatEl, bar, ctrlWrap);
    } else {
      this._floatMidiDot = UITools._el('div', {
        className: 'uw-midi-dot',
        onclick: () => this._toggleMidi(),
      });
      this._floatMidiDot.classList.toggle('uw-midi-armed', this._midiArmed);
      const lbl = UITools._el('span', { className: 'uw-float-lbl' }, o.label);
      bar = UITools._el(
        'div',
        { className: 'uw-float-bar' },
        this._floatMidiDot,
        lbl,
        dockBtn
      );
      bar.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._showContextMenu(e.clientX, e.clientY);
      });
      this._floatEl = UITools._el(
        'div',
        { className: 'uw-float', style: { zIndex: ++UITools._getState().z } },
        bar,
        ctrlWrap,
        lH,
        rH
      );
    }

    this._floatEl.addEventListener('mousedown', () => this.bringToFront(), {
      capture: true,
      passive: true,
    });
    this._floatEl.addEventListener('touchstart', () => this.bringToFront(), {
      capture: true,
      passive: true,
    });

    let { x, y } = this._smartWidgetPos();
    if (startX !== null) x = startX;
    if (startY !== null) y = startY;

    this._floatPos = { x, y };
    this._floatEl.style.left = `${x}px`;
    this._floatEl.style.top = `${y}px`;

    if (UITools._getState().wheelLockedWidget === this)
      this._floatEl.classList.add('uw-wheel-locked');

    if (this.container !== document.body) {
      this._floatEl.style.position = 'absolute';
    }
    this.container.appendChild(this._floatEl);

    this._listenWidgetDrag(bar);

    requestAnimationFrame(() => this._floatEl?.classList.add('uw-float-vis'));
    this._showConnector();
    this._flashAccent();
  }

  dockBack() {
    if (!this._floating || this._mode !== 'widget') return;
    this._floating = false;

    const el = this._floatEl;
    this._floatEl = null;

    if (el && this._placeholderEl.isConnected) {
      const pR = this._placeholderEl.getBoundingClientRect();
      el.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.left = `${pR.left}px`;
      el.style.top = `${pR.top}px`;
      el.style.transform = 'scale(0.8)';
      el.style.opacity = '0';
      this._collapseConnector();
      setTimeout(() => {
        el.remove();
        this._placeholderEl.style.display = 'none';
        this._dockedEl.style.display = '';
        this._flashAccent(this._dockedEl);
      }, 350);
    } else {
      if (el) el.remove();
      this._removeConnector();
      this._placeholderEl.style.display = 'none';
      this._dockedEl.style.display = '';
    }
  }

  buildDockedView() {
    if (!this._dockedCtr) this._buildWidgetDocked();
    return this._dockedCtr;
  }

  registerWithDialog(dlg) {
    const orig = dlg.options.onClose;
    dlg.options.onClose = (...a) => {
      this.dockBack();
      if (typeof orig === 'function') orig(...a);
    };
    return this;
  }

  close() {
    this._lifecycleObserver?.disconnect();
    clearTimeout(this._connTimer);
    this._removeConnector();
    this._children.forEach((c) => {
      try {
        c.dockBack?.();
      } catch (_) {}
    });

    if (this.element) {
      this.element.style.transition = 'opacity .22s, transform .22s';
      this.element.style.opacity = '0';
      this.element.style.transform = 'scale(0.96)';
    }
    const done = () => {
      this.element?.remove();
      UITools._getState().all = UITools._getState().all.filter(
        (w) => w !== this
      );
      UITools._getState().activeCount = Math.max(
        0,
        UITools._getState().activeCount - 1
      );
      if (UITools._getState().wheelLockedWidget === this)
        UITools._getState().wheelLockedWidget = null;
      this.options.onClose?.();
    };
    this.element?.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 300);
  }

  setZOnTop() {
    this._setZ();
  }

  bringToFront() {
    this._setZ();
  }

  maximize(force = false) {
    if (this._maximized && !force) return;
    if (!this._maximized) this._preMaxSt = this.element.getAttribute('style');
    this._maximized = true;
    this.element.classList.add('uw-maximized');
    const s = this._getEffectiveSafeArea();

    const parent = this.container;
    const isBody = parent === document.body && !this.env;
    const pW = isBody ? window.innerWidth : parent.clientWidth;
    const pH = isBody ? window.innerHeight : parent.clientHeight;

    Object.assign(this.element.style, {
      top: `${s.top}px`,
      left: `${s.left}px`,
      transform: 'none',
      width: `${pW - s.left - s.right}px`,
      height: `${pH - s.top - s.bottom}px`,
    });
    this._saveState();
  }

  restore() {
    if (this._isSnapped) {
      this._isSnapped = false;
      this.element.classList.remove('uw-snapped');
    }
    const wasMini = this._minimized;
    this._maximized = this._minimized = false;
    this.element.classList.remove('uw-maximized', 'uw-minimized');

    if (wasMini && this._preMinPos) {
      this.element.style.transition =
        'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      this.element.style.left = this._preMinPos.left;
      this.element.style.top = this._preMinPos.top;
      this.element.style.width = this._preMinPos.width;
      if (this._preMinH) this.element.style.height = this._preMinH;

      const animStep = () => {
        this._children.forEach((c) => c._kickConnector?.());
        if (!this._minimized && this.element.style.transition)
          requestAnimationFrame(animStep);
      };
      requestAnimationFrame(animStep);

      setTimeout(() => {
        this.element.style.transition = '';
        if (this._preMaxSt != null && !wasMini) {
          this.element.setAttribute('style', this._preMaxSt);
        }
      }, 450);
    } else {
      if (this._preMaxSt != null) {
        this.element.setAttribute('style', this._preMaxSt);
        this._preMaxSt = null;
      }
    }
    this.element.style.overflow = '';
    this._saveState();
  }

  toggleMaximize() {
    this._maximized ? this.restore() : this.maximize();
  }

  toggleMinimize() {
    if (this._minimized) {
      this.restore();
      return;
    }
    if (!this._preMaxSt) this._preMaxSt = this.element.getAttribute('style');
    this._preMinH = this.element.style.height || '';
    this._preMinPos = {
      left: this.element.style.left,
      top: this.element.style.top,
      width: this.element.style.width,
    };

    this._minimized = true;
    this.element.classList.add('uw-minimized');

    const h = this.header.getBoundingClientRect().height;
    this.element.style.overflow = 'hidden';

    this.element.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    this.element.style.height = `${h}px`;
    this.element.style.width = '220px';

    const minis = UITools._getState().all.filter(
      (w) => w._minimized && w._mode === 'dialog'
    );
    const idx = minis.length - 1;
    
    const parent = this.container;
    const isBody = (parent === document.body && !this.env);
    const parentHeight = isBody ? window.innerHeight : parent.clientHeight;
    
    const targetX = 20;
    const targetY = parentHeight - 5 - (idx + 1) * (h + 4);

    this.element.style.left = `${targetX}px`;
    this.element.style.top = `${targetY}px`;

    const animStep = () => {
      this._children.forEach((c) => c._kickConnector?.());
      if (this._minimized && this.element.style.transition)
        requestAnimationFrame(animStep);
    };
    requestAnimationFrame(animStep);

    setTimeout(() => {
      this.element.style.transition = '';
    }, 450);
  }

  toggleTransparency() {
    this.element.classList.toggle('uw-transparent');
  }

  setTitle(t) {
    this.options.title = t;
    const el = this.header?.querySelector('.uw-title');
    if (el) el.textContent = t;
  }

  setContent(c) {
    if (!this.contentElement) return;
    this.contentElement.innerHTML = '';
    if (c instanceof Node) this.contentElement.appendChild(c);
    else this.contentElement.innerHTML = String(c);
  }

  triggerCallback() {
    if (!this.callback || !this.element) return;
    const r = this.element.getBoundingClientRect();
    const cr = this.contentElement?.getBoundingClientRect() ?? r;
    this.callback(this, { outer: r, inner: cr });
  }

  setValue(v) {
    this._value = v;
    this._syncControls();
    return this;
  }

  _buildControl(ctx = 'docked') {
    const wrap = UITools._el('div', { className: 'uw-ctrl-inner' });

    let el;
    switch (this.options.type) {
      case 'toggle':
        el = this._bToggle(ctx);
        break;
      case 'slider':
        el = this._bSlider(ctx);
        break;
      case 'textInput':
        el = this._bText(ctx);
        break;
      case 'select':
        el = this._bSelect(ctx);
        break;
      case 'buttonSet':
        el = this._bButtonSet(ctx);
        break;
      case 'custom':
        el =
          this.options.content instanceof Node
            ? this.options.content
            : UITools._el('span', {}, '–');
        break;
      default:
        el = UITools._el(
          'span',
          { className: 'uw-unknown' },
          `[${this.options.type}]`
        );
    }

    wrap.appendChild(el);
    return wrap;
  }

  _bToggle(ctx) {
    const [r, g, b] = this.options.color;
    const col = this._colorCss();
    const track = UITools._el(
      'div',
      { className: 'uw-toggle' },
      UITools._el('div', { className: 'uw-toggle-thumb' })
    );

    const sync = () => {
      track.classList.toggle('uw-on', !!this._value);
      track.style.background = this._value ? col : '';
      track.style.boxShadow = this._value
        ? `0 0 14px rgba(${r},${g},${b},0.55), inset 0 1px 0 rgba(255,255,255,0.12)`
        : '';
    };
    track._sync = sync;
    sync();

    track.addEventListener('click', () => {
      UITools._setWheelLock(this);
      this._value = !this._value;
      this._syncControls();
      this.options.onChange?.(this._value, this);
      this._flashAccent();
    });
    return track;
  }

  _bSlider(ctx) {
    const { min, max, step } = this.options;
    const [r, g, b] = this.options.color || [100, 180, 255];
    const col = `rgb(${r},${g},${b})`;

    const wrap = UITools._el('div', {
      className: 'uw-sl-wrap',
      style: {
        width: '100%',
        height: '36px',
        position: 'relative',
        cursor: 'ew-resize',
        touchAction: 'none',
      },
    });

    const svg = UITools._el('svg:svg', {
      style: {
        width: '100%',
        height: '100%',
        display: 'block',
        overflow: 'visible',
      },
    });

    const filterId = 'glow-' + Math.random().toString(36).substr(2, 9);
    const defs = UITools._el(
      'svg:defs',
      {},
      UITools._el(
        'svg:filter',
        { id: filterId, x: '-50%', y: '-50%', width: '200%', height: '200%' },
        UITools._el('svg:feGaussianBlur', {
          stdDeviation: '3',
          result: 'blur',
        }),
        UITools._el(
          'svg:feMerge',
          {},
          UITools._el('svg:feMergeNode', { in: 'blur' }),
          UITools._el('svg:feMergeNode', { in: 'SourceGraphic' })
        )
      )
    );

    const tBg = UITools._el('svg:line', {
      stroke: 'rgba(255,255,255,0.1)',
      'stroke-width': 5,
      'stroke-linecap': 'round',
    });
    const tGlow = UITools._el('svg:line', {
      stroke: col,
      'stroke-width': 8,
      'stroke-linecap': 'round',
      style: `transition: stroke-width 0.2s ease, filter 0.2s ease; filter: drop-shadow(0 0 5px ${col});`,
    });
    const tFill = UITools._el('svg:line', {
      stroke: '#ffffff',
      'stroke-width': 3,
      'stroke-linecap': 'round',
    });
    const tThumb = UITools._el('svg:circle', {
      fill: '#ffffff',
      r: 7,
      style: `transition: r 0.2s ease, filter 0.2s ease; filter: drop-shadow(0 0 5px ${col});`,
    });

    const tValGroup = UITools._el('svg:g', {
      style: 'pointer-events: none; user-select: none;',
    });
    const tValOutline = UITools._el('svg:text', {
      fill: 'none',
      stroke: 'rgba(0,0,0,0.85)',
      'stroke-width': 5,
      'stroke-linejoin': 'round',
      'font-family': 'system-ui, sans-serif',
      'font-size': '15px',
      'font-weight': '800',
      'dominant-baseline': 'middle',
    });
    const tVal = UITools._el('svg:text', {
      fill: '#ffffff',
      'font-family': 'system-ui, sans-serif',
      'font-size': '15px',
      'font-weight': '800',
      'dominant-baseline': 'middle',
    });
    tValGroup.append(tValOutline, tVal);

    svg.append(defs, tBg, tGlow, tFill, tThumb, tValGroup);
    wrap.appendChild(svg);

    const getPct = () =>
      Math.max(0, Math.min(1, (this._value - min) / (max - min)));
    const fmt = (v) =>
      step >= 1
        ? String(Math.round(v))
        : v.toFixed(Math.min((String(step).split('.')[1] || '').length, 3));

    let cachedW = 100;

    const sync = () => {
      if (!wrap._isDragging) {
        const cw = wrap.clientWidth;
        if (cw > 0) cachedW = cw;
      }

      const W = cachedW;
      const H = 36;
      const pad = 24;
      const trackW = Math.max(1, W - pad * 2);
      const p = getPct();
      const tx = pad + p * trackW;
      const ty = H / 2;

      tBg.setAttribute('x1', pad);
      tBg.setAttribute('y1', ty);
      tBg.setAttribute('x2', W - pad);
      tBg.setAttribute('y2', ty);

      tGlow.setAttribute('x1', pad);
      tGlow.setAttribute('y1', ty);
      tGlow.setAttribute('x2', tx);
      tGlow.setAttribute('y2', ty);

      tFill.setAttribute('x1', pad);
      tFill.setAttribute('y1', ty);
      tFill.setAttribute('x2', tx);
      tFill.setAttribute('y2', ty);

      tThumb.setAttribute('cx', tx);
      tThumb.setAttribute('cy', ty);

      const valStr = fmt(this._value);
      tVal.textContent = valStr;
      tValOutline.textContent = valStr;

      if (p < 0.5) {
        tVal.setAttribute('x', W - pad + 8);
        tValOutline.setAttribute('x', W - pad + 8);
        tVal.setAttribute('text-anchor', 'end');
        tValOutline.setAttribute('text-anchor', 'end');
      } else {
        tVal.setAttribute('x', pad - 8);
        tValOutline.setAttribute('x', pad - 8);
        tVal.setAttribute('text-anchor', 'start');
        tValOutline.setAttribute('text-anchor', 'start');
      }
      tVal.setAttribute('y', ty + 1.5);
      tValOutline.setAttribute('y', ty + 1.5);
    };

    wrap._sync = sync;
    setTimeout(sync, 0);

    let dragRect = null;

    const upd = (cx) => {
      if (!dragRect) dragRect = wrap.getBoundingClientRect();
      const pad = 24;
      const trackW = Math.max(1, dragRect.width - pad * 2);
      const p = Math.max(0, Math.min(1, (cx - dragRect.left - pad) / trackW));
      this._value = Math.max(
        min,
        Math.min(max, Math.round((min + p * (max - min)) / step) * step)
      );
      sync();
      this.options.onChange?.(this._value, this);
    };

    const setDragState = (dragging) => {
      wrap._isDragging = dragging;
      if (dragging) {
        tThumb.setAttribute('r', '9.5');
        tGlow.setAttribute('stroke-width', '13');
        tGlow.style.filter = `drop-shadow(0 0 10px ${col})`;
      } else {
        tThumb.setAttribute('r', '7');
        tGlow.setAttribute('stroke-width', '8');
        tGlow.style.filter = `drop-shadow(0 0 5px ${col})`;
      }
    };

    const bindDrag = (e) => {
      e.preventDefault();
      if (typeof UITools._setWheelLock === 'function')
        UITools._setWheelLock(this);
      if (typeof UITools._setDraggingGlobal === 'function')
        UITools._setDraggingGlobal(true);

      wrap.classList.add('uw-active');
      setDragState(true);
      dragRect = wrap.getBoundingClientRect();
      cachedW = dragRect.width;

      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      upd(clientX);

      const mm = (ev) => {
        const cx = ev.clientX ?? ev.touches?.[0]?.clientX;
        if (cx !== undefined) upd(cx);
      };
      const mu = () => {
        wrap.classList.remove('uw-active');
        setDragState(false);
        dragRect = null;
        if (typeof UITools._setDraggingGlobal === 'function')
          UITools._setDraggingGlobal(false);

        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
        window.removeEventListener('touchmove', mm, { passive: false });
        window.removeEventListener('touchmove', preventDefault, {
          passive: false,
        });
        window.removeEventListener('touchend', mu);
      };

      const preventDefault = (ev) => ev.preventDefault();
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
      window.addEventListener('touchmove', mm, { passive: false });
      window.addEventListener('touchmove', preventDefault, { passive: false });
      window.addEventListener('touchend', mu);
    };

    wrap.addEventListener('mousedown', bindDrag);
    wrap.addEventListener('touchstart', bindDrag, { passive: false });

    wrap.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const inc = -Math.sign(e.deltaY) * step * 3;
        this._value = Math.max(min, Math.min(max, this._value + inc));
        sync();
        this.options.onChange?.(this._value, this);
      },
      { passive: false }
    );

    return wrap;
  }

  _bText(ctx) {
    const inp = UITools._el('input', {
      className: 'uw-text-inp',
      type: 'text',
      value: this._value || '',
      placeholder: this.options.placeholder || '',
    });
    inp._sync = () => {
      if (document.activeElement !== inp) inp.value = this._value || '';
    };
    inp.addEventListener('focus', () => UITools._setWheelLock(this));
    inp.addEventListener('input', () => {
      this._value = inp.value;
      this._syncControls();
      this.options.onChange?.(this._value, this);
    });
    return inp;
  }

  _bSelect(ctx) {
    const options = (this.options.selectOptions || []).map((opt) => {
      const val = typeof opt === 'object' ? opt.value : opt;
      const lbl = typeof opt === 'object' ? opt.label : opt;
      return UITools._el(
        'option',
        { value: val, selected: String(val) === String(this._value) },
        lbl
      );
    });
    const sel = UITools._el('select', { className: 'uw-select' }, ...options);
    sel._sync = () => {
      sel.value = String(this._value);
    };
    sel.addEventListener('focus', () => UITools._setWheelLock(this));
    sel.addEventListener('change', () => {
      this._value = sel.value;
      this._syncControls();
      this.options.onChange?.(this._value, this);
    });
    return sel;
  }

  _bButtonSet(ctx) {
    const wrap = UITools._el('div', { className: 'uw-btnset' });
    const btns = (this.options.buttons || []).map((btn) => {
      const label = typeof btn === 'string' ? btn : btn.label || '?';
      const b = UITools._el('button', { className: 'uw-btn-item' }, label);
      if (typeof btn === 'object' && btn.color) {
        b.style.color = btn.color;
        b._baseColor = btn.color;
      }
      b.addEventListener('click', () => {
        UITools._setWheelLock(this);
        if (typeof btn === 'object') {
          btn.onClick?.(this);
          if (btn.value !== undefined) {
            this._value = btn.value;
            this._syncControls();
          }
        }
        this.options.onChange?.(this._value, this);
        this._flashAccent();
      });
      return b;
    });

    wrap._sync = () => {
      btns.forEach((b, i) => {
        const val = this.options.buttons[i]?.value;
        const isSelf = val !== undefined && String(this._value) === String(val);
        b.classList.toggle('uw-active', isSelf);
        if (b._baseColor) {
          b.style.boxShadow = isSelf
            ? `0 0 10px ${b._baseColor
                .replace('rgb', 'rgba')
                .replace(')', ', 0.6)')}`
            : '';
        }
      });
    };
    wrap.append(...btns);
    wrap._sync();
    return wrap;
  }

  _syncControls() {
    [this._dockedEl, this._floatEl].forEach((ctr) => {
      if (!ctr) return;
      ctr
        .querySelectorAll('.uw-toggle, .uw-sl-wrap, .uw-text-inp, .uw-select')
        .forEach((el) => el._sync?.());
    });
  }

  _showConnector() {
    return false;
  }

  _kickConnector() {
    return false;
  }

  _fadeConnector() {
    const g = UITools._getState().svgOverlay?.querySelector(
      `#${this._id}_conn`
    );
    if (!g) return;
    g.style.transition = 'opacity 0.35s';
    g.style.opacity = '0';
    setTimeout(() => g.remove(), 380);
  }

  _collapseConnector() {
    return false;
  }

  _removeConnector() {
    if (this.connectorEl && this.connectorEl.remove) {
      try {
        this.connectorEl.remove();
      } catch (error) {}
    }

    this.connectorEl = null;
    this.connectorPathEl = null;
    this.connectorTargetEl = null;

    return true;
  }

  _drawConnector() {
    return false;
  }

  _checkEdgeSnap() {
    return null;
  }

  _listenDragDialog() {
    const onDown = (e) => {
      if (
        !e.target.closest('.uw-header') ||
        e.target.closest('button, .uw-controls, input, select')
      )
        return;
      if (this._maximized || this._minimized || UITools.isSmallScreen()) return;
      e.preventDefault();

      if (this._isSnapped) {
        this.restore();
      }

      this._setZ();
      UITools._showCovers();
      const el = this.element;
      el.style.transition = 'none';
      el.style.transform = 'none';

      const currentLeft = parseFloat(el.style.left) || 0;
      const currentTop = parseFloat(el.style.top) || 0;

      const pt = this._pt(e);
      this._dragSt = { px: pt.x, py: pt.y, rl: currentLeft, rt: currentTop };

      const mm = (ev) => {
        if (!this._dragSt) return;
        if (ev.cancelable) ev.preventDefault();
        const p = this._pt(ev);
        el.style.left = `${this._dragSt.rl + (p.x - this._dragSt.px)}px`;
        el.style.top = `${this._dragSt.rt + (p.y - this._dragSt.py)}px`;
        this._children.forEach((c) => c._kickConnector?.());
        this.options.onMove?.(
          parseFloat(el.style.left),
          parseFloat(el.style.top)
        );
      };
      const mu = () => {
        this._dragSt = null;
        el.style.transition = '';
        UITools._hideCovers();
        this._checkEdgeSnap(el);
        if (!this._isSnapped) this._saveState();

        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
        window.removeEventListener('touchmove', mm);
        window.removeEventListener('touchend', mu);
      };
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
      window.addEventListener('touchmove', mm, { passive: false });
      window.addEventListener('touchend', mu);
    };
    this.header.addEventListener('mousedown', onDown);
    this.header.addEventListener('touchstart', onDown, { passive: false });
    this.header.addEventListener('dblclick', (e) => {
      if (!e.target.closest('button')) this.toggleMaximize();
    });

    let swY = null;
    this.header.addEventListener(
      'touchstart',
      (e) => {
        swY = e.touches[0].clientY;
      },
      { passive: true }
    );
    this.header.addEventListener(
      'touchend',
      (e) => {
        if (swY === null) return;
        const dy = e.changedTouches[0].clientY - swY;
        swY = null;
        if (dy > 55 && UITools.isSmallScreen()) this.toggleMinimize();
      },
      { passive: true }
    );
  }

  _listenResizeDialog() {
    const xFs = [1, 1, -1, -1];
    const yFs = [-1, 1, 1, -1];
    this._sizers.forEach((sizer, i) => {
      const onDown = (e) => {
        if (this._maximized || this._isSnapped) return;
        e.preventDefault();
        e.stopPropagation();
        UITools._showCovers();
        const el = this.element;
        el.style.transition = 'none';

        const rect = el.getBoundingClientRect();
        const currentLeft = parseFloat(el.style.left) || 0;
        const currentTop = parseFloat(el.style.top) || 0;

        el.style.transform = 'none';
        const pt = this._pt(e);
        const st = {
          sx: pt.x,
          sy: pt.y,
          l: currentLeft,
          t: currentTop,
          w: rect.width,
          h: rect.height,
          xF: xFs[i],
          yF: yFs[i],
        };

        const mm = (ev) => {
          if (ev.cancelable) ev.preventDefault();
          const p = this._pt(ev),
            dx = p.x - st.sx,
            dy = p.y - st.sy;
          const nW = Math.max(this.options.minWidth, st.w + dx * st.xF);
          const nH = Math.max(this.options.minHeight, st.h + dy * st.yF);
          Object.assign(el.style, {
            width: `${nW}px`,
            height: `${nH}px`,
            left: `${st.xF < 0 ? st.l + (st.w - nW) : st.l}px`,
            top: `${st.yF < 0 ? st.t + (st.h - nH) : st.t}px`,
          });
          if (this.callback) this.triggerCallback();
          this.options.onResize?.(nW, nH);
        };
        const mu = () => {
          UITools._hideCovers();
          this._saveState();
          window.removeEventListener('mousemove', mm);
          window.removeEventListener('mouseup', mu);
          window.removeEventListener('touchmove', mm);
          window.removeEventListener('touchend', mu);
        };
        window.addEventListener('mousemove', mm);
        window.addEventListener('mouseup', mu);
        window.addEventListener('touchmove', mm, { passive: false });
        window.addEventListener('touchend', mu);
      };
      sizer.addEventListener('mousedown', onDown);
      sizer.addEventListener('touchstart', onDown, { passive: false });
    });
  }

  _listenWidgetHResize(handle, side) {
    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = this._floatEl.getBoundingClientRect();
      const sx = this._pt(e).x,
        sw = rect.width,
        sl = rect.left;
      const mm = (ev) => {
        if (ev.cancelable) ev.preventDefault();
        const dx = this._pt(ev).x - sx;
        const minW = this.options.compact ? 60 : 120;
        const nW = Math.max(minW, sw + (side === 'right' ? dx : -dx));
        this._floatEl.style.width = `${nW}px`;
        if (side === 'left') this._floatEl.style.left = `${sl + (sw - nW)}px`;
        this._kickConnector();
      };
      const mu = () => {
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
        window.removeEventListener('touchmove', mm);
        window.removeEventListener('touchend', mu);
      };
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
      window.addEventListener('touchmove', mm, { passive: false });
      window.addEventListener('touchend', mu);
    };
    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
  }

  _listenWidgetDrag(bar) {
    const onDown = (e) => {
      if (
        e.target.closest(
          'button, input, select, .uw-fres, .uw-sl-wrap, .uw-toggle'
        )
      )
        return;
      e.preventDefault();
      const pt = this._pt(e);
      const currentLeft = parseFloat(this._floatEl.style.left) || 0;
      const currentTop = parseFloat(this._floatEl.style.top) || 0;

      this._dragSt = { sx: pt.x, sy: pt.y, ox: currentLeft, oy: currentTop };

      const mm = (ev) => {
        if (!this._dragSt || !this._floatEl) return;
        if (ev.cancelable) ev.preventDefault();
        const p = this._pt(ev);
        const x = this._dragSt.ox + (p.x - this._dragSt.sx);
        const y = this._dragSt.oy + (p.y - this._dragSt.sy);
        this._floatEl.style.left = `${x}px`;
        this._floatEl.style.top = `${y}px`;
        this._floatPos = { x, y };
        this._kickConnector();
      };
      const mu = () => {
        this._dragSt = null;
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
        window.removeEventListener('touchmove', mm);
        window.removeEventListener('touchend', mu);
      };
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
      window.addEventListener('touchmove', mm, { passive: false });
      window.addEventListener('touchend', mu);
    };
    bar.addEventListener('mousedown', onDown);
    bar.addEventListener('touchstart', onDown, { passive: false });
  }

  _listenInlineDragOut(grip) {
    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pt = this._pt(e);
      let popped = false;

      const mm = (ev) => {
        if (ev.cancelable) ev.preventDefault();
        const p = this._pt(ev);
        if (
          !popped &&
          (Math.abs(p.x - pt.x) > 10 || Math.abs(p.y - pt.y) > 10)
        ) {
          popped = true;
          this.popOut(p.x - 20, p.y - 15);
          if (this._floatEl) {
            const currentLeft = parseFloat(this._floatEl.style.left) || 0;
            const currentTop = parseFloat(this._floatEl.style.top) || 0;
            this._dragSt = {
              sx: p.x,
              sy: p.y,
              ox: currentLeft,
              oy: currentTop,
            };
          }
        }
        if (popped && this._dragSt && this._floatEl) {
          const nx = this._dragSt.ox + (p.x - this._dragSt.sx);
          const ny = this._dragSt.oy + (p.y - this._dragSt.sy);
          this._floatEl.style.left = `${nx}px`;
          this._floatEl.style.top = `${ny}px`;
          this._floatPos = { x: nx, y: ny };
          this._kickConnector();
        }
      };
      const mu = () => {
        this._dragSt = null;
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
        window.removeEventListener('touchmove', mm);
        window.removeEventListener('touchend', mu);
      };

      const preventDefault = (ev) => ev.preventDefault();
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
      window.addEventListener('touchmove', mm, { passive: false });
      window.addEventListener('touchmove', preventDefault, { passive: false });
      window.addEventListener('touchend', mu);
    };
    grip.addEventListener('mousedown', onDown);
    grip.addEventListener('touchstart', onDown, { passive: false });
  }

  _flashAccent(targetEl = null) {
    const el = targetEl || this._floatEl || this._dockedEl;
    if (!el) return;
    el.classList.remove('uw-flash-fx');
    void el.offsetWidth;
    el.classList.add('uw-flash-fx');
  }

  static _initGlobalListeners() {
    if (UITools._getState().globalsInit) return;
    UITools._getState().globalsInit = true;

    window.addEventListener(
      'wheel',
      (e) => {
        if (
          UITools._getState().wheelLockedWidget &&
          document.activeElement.tagName !== 'TEXTAREA'
        ) {
          const w = UITools._getState().wheelLockedWidget;
          if (w.options.type === 'slider') {
            e.preventDefault();
            const step = w.options.step || 0.01;
            w._value = Math.max(
              w.options.min,
              Math.min(
                w.options.max,
                w._value + -Math.sign(e.deltaY) * step * 3
              )
            );
            w._syncControls();
            w.options.onChange?.(w._value, w);
            w._flashAccent();
          }
        }
      },
      { passive: false }
    );

    window.addEventListener('mousedown', (e) => {
      if (
        UITools._getState().wheelLockedWidget &&
        !e.target.closest('.uw-wheel-locked, .uw-w-docked, .uw-float')
      ) {
        UITools._setWheelLock(null);
      }
    });

    console.log('[UITools] Ready for MIDI assignment (click to lock wheel)');
  }

  _smartDialogPos() {
    const dialogs =
      UITools._getState().all.filter((w) => w._mode === 'dialog').length - 1;
    const off = (dialogs % 14) * 26;
    Object.assign(this.element.style, {
      left: `${70 + off}px`,
      top: `${80 + off}px`,
      transform: 'none',
    });
  }

  _smartWidgetPos() {
    if (!this._placeholderEl?.isConnected) return { x: 300, y: 200 };
    const pR = this._placeholderEl.getBoundingClientRect();
    let x = pR.right + 16,
      y = pR.top - 2;
    if (x + 190 > window.innerWidth - 8) x = pR.left - 196;
    if (y + 90 > window.innerHeight - 8) y = window.innerHeight - 96;
    return { x: Math.max(6, x), y: Math.max(6, y) };
  }

  _saveState() {
    if (!this.options.stateId || !this.element) return;
    const r = this.element.getBoundingClientRect();
    try {
      localStorage.setItem(
        `uw_${this.options.stateId}`,
        JSON.stringify({
          x: r.left,
          y: r.top,
          w: r.width,
          h: r.height,
          max: this._maximized,
        })
      );
    } catch (_) {}
  }

  _restoreState() {
    if (!this.options.stateId) return;
    try {
      const raw = localStorage.getItem(`uw_${this.options.stateId}`);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.w < 50) return;
      Object.assign(this.element.style, {
        left: `${s.x}px`,
        top: `${s.y}px`,
        width: `${s.w}px`,
        transform: 'none',
      });
      if (s.h > 50 && this.options.height !== 'auto')
        this.element.style.height = `${s.h}px`;
      if (s.max) setTimeout(() => this.maximize(true), 0);
      this._restored = true;
    } catch (_) {}
  }

  _softClamp() {
    if (this._maximized || this._isSnapped || !this.element) return;
    const r = this.element.getBoundingClientRect(),
      vis = 48;
    const s = this._getEffectiveSafeArea();
    
    const parent = this.container;
    const isBody = (parent === document.body && !this.env);
    const pRect = isBody ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight } : parent.getBoundingClientRect();
    
    if (!isBody && (pRect.width === 0 || pRect.height === 0)) {
      return;
    }

    let x = parseFloat(this.element.style.left) || 0,
      y = parseFloat(this.element.style.top) || 0,
      changed = false;
      
    if (r.height > pRect.height) {
       this.element.style.maxHeight = `${pRect.height - s.top - s.bottom - 10}px`;
       changed = true;
    }

    if (r.right < pRect.left + s.left + vis) {
      x = s.left + vis - r.width;
      changed = true;
    }
    if (r.left > pRect.right - s.right - vis) {
      x = pRect.width - s.right - vis;
      changed = true;
    }
    if (r.bottom < pRect.top + s.top + vis) {
      y = s.top + vis - r.height;
      changed = true;
    }
    if (r.top > pRect.bottom - s.bottom - vis) {
      y = pRect.height - s.bottom - vis;
    }
    if (changed) {
      this.element.style.left = `${x}px`;
      this.element.style.top = `${y}px`;
      if (this.element.style.transform === 'scale(0.95)') {
          // Leave transform untouched
      } else {
          this.element.style.transform = 'none';
      }
    }
  }

  _pt(e) {
    if (e.touches?.length)
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches?.length)
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  _setZ() {
    if (this.options.stateId === 'yt_main_player_dialog') {
      if (this.element) this.element.style.zIndex = 5000;
      return;
    }
    const z = ++UITools._getState().z;
    if (this.element) this.element.style.zIndex = z;
    if (this._floatEl) this._floatEl.style.zIndex = z;
    if (UITools._getState().svgOverlay)
      UITools._getState().svgOverlay.style.zIndex = z + 1;
  }

  _colorCss(a = 1) {
    const [r, g, b] = this.options.color;
    return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
  }

  _defaultVal() {
    if (this.options.type === 'toggle') return false;
    if (this.options.type === 'slider') return this.options.min ?? 0;
    if (this.options.type === 'textInput') return '';
    return null;
  }

  _utilBtn(icon, title, fn) {
    const b = UITools._el('button', { className: 'uw-util-btn', title }, icon);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
    return b;
  }

  _closeBtn() {
    const svg = UITools._el(
      'svg:svg',
      {
        viewBox: '0 0 14 14',
        width: '12',
        height: '12',
        style: { pointerEvents: 'none' },
      },
      UITools._el('svg:path', {
        d: 'M1 1 L13 13',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
      }),
      UITools._el('svg:path', {
        d: 'M13 1 L1 13',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
      })
    );
    const b = UITools._el(
      'button',
      { className: 'uw-close-btn', title: 'Close' },
      svg
    );
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
    return b;
  }

  _buildFooter() {
    const buttons = this.options.buttons.map((cfg) => {
      const b = UITools._el(
        'button',
        { className: `uw-btn ${cfg.className || ''}` },
        cfg.label || 'OK'
      );
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cfg.onClick?.(e.currentTarget, this) !== false) this.close();
      });
      return b;
    });
    this.footer = UITools._el('div', { className: 'uw-footer' }, ...buttons);
    this.element.appendChild(this.footer);
  }

  _makeCorners() {
    const defs = [
      {
        cls: 'uw-c-tr',
        pos: { top: '-2px', right: '-2px', cursor: 'nesw-resize' },
        path: 'M 5 3 Q 13 3 13 11',
      },
      {
        cls: 'uw-c-br',
        pos: { bottom: '-2px', right: '-2px', cursor: 'nwse-resize' },
        path: 'M 13 5 Q 13 13 5 13',
      },
      {
        cls: 'uw-c-bl',
        pos: { bottom: '-2px', left: '-2px', cursor: 'nesw-resize' },
        path: 'M 11 13 Q 3 13 3 5',
      },
      {
        cls: 'uw-c-tl',
        pos: { top: '-2px', left: '-2px', cursor: 'nwse-resize' },
        path: 'M 3 11 Q 3 3 11 3',
      },
    ];
    return defs.map((def) => {
      const svg = UITools._el(
        'svg:svg',
        {
          viewBox: '0 0 15 15',
          width: '14',
          height: '14',
          style: {
            display: 'block',
            color: 'rgba(255,255,255,0.4)',
            pointerEvents: 'none',
          },
        },
        UITools._el('svg:path', {
          d: def.path,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2.5',
          'stroke-linecap': 'square',
          'stroke-linejoin': 'miter',
        })
      );
      return UITools._el(
        'div',
        {
          className: `uw-corner ${def.cls}`,
          style: {
            position: 'absolute',
            width: '14px',
            height: '14px',
            zIndex: '10',
            opacity: '0',
            transition: 'opacity 0.2s',
            touchAction: 'none',
            ...def.pos,
          },
        },
        svg
      );
    });
  }

  static _applyStyles() {
    if (UITools._getState().styled) return;
    UITools._getState().styled = true;
    const css = `
        :root {
          --uw-bg: rgba(22, 24, 30, 0.98);
          --uw-border: rgba(255,255,255,0.08);
          --uw-text: #ced6e0;
          --uw-title: rgba(255,255,255,0.45);
          --uw-btn-bg: rgba(255,255,255,0.06);
          --uw-btn-hover: rgba(255,255,255,0.12);
          --uw-hdr-bg: rgba(255,255,255,0.015);
          --uw-ctrl-bg: rgba(0,0,0,0.3);
          --uw-float-bg: rgba(14, 16, 22, 0.98);
          --uw-ph-bg: rgba(255,255,255,0.015);
          --uw-ph-border: rgba(255,255,255,0.08);
        }
        .uw-light-mode {
          --uw-bg: rgba(245, 245, 245, 0.98);
          --uw-border: rgba(0,0,0,0.15);
          --uw-text: #222;
          --uw-title: rgba(0,0,0,0.6);
          --uw-btn-bg: rgba(0,0,0,0.06);
          --uw-btn-hover: rgba(0,0,0,0.12);
          --uw-hdr-bg: rgba(0,0,0,0.05);
          --uw-ctrl-bg: #fff;
          --uw-float-bg: rgba(250, 250, 250, 0.98);
          --uw-ph-bg: rgba(0,0,0,0.03);
          --uw-ph-border: rgba(0,0,0,0.15);
        }

        .uw-dialog {
          position: fixed; box-sizing: border-box; display: flex; flex-direction: column;
          background: var(--uw-bg); 
          border: 1px solid var(--uw-border); border-radius: 12px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
          min-width: 0; min-height: 0;
          overflow: visible;
          top: 50%; left: 50%; transform: translate(-50%,-50%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          font-size: 13px; line-height: 1.5; color: var(--uw-text);
        }
        .uw-dialog:focus-within { box-shadow: 0 0 0 1px rgba(100,180,255,0.3), 0 14px 28px rgba(0,0,0,0.8); }
        .uw-dialog.uw-snapped { border-radius: 0; transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .uw-dialog.uw-maximized { border-radius:0!important; border:none!important; box-shadow:none!important; }
        .uw-dialog.uw-maximized .uw-header { cursor:default; }
        .uw-dialog.uw-maximized .uw-corner,
        .uw-dialog.uw-minimized .uw-corner { display:none!important; }
        .uw-dialog.uw-minimized .uw-content { opacity: 0; pointer-events: none; }
        
        .uw-dialog.uw-minimized .fp-search-wrapper { display: none !important; }
        .uw-dialog.uw-minimized .uw-title { display: block !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .uw-header {
          display: flex; align-items: center; gap: 4px;
          padding: 4px 8px; min-height: 28px; flex-shrink: 0;
          background: var(--uw-hdr-bg); border-bottom: 1px solid var(--uw-border);
          border-radius: 12px 12px 0 0; cursor: move; user-select: none; touch-action: none;
        }
        .uw-header-compact { padding: 2px 6px !important; min-height: 22px !important; }
        .uw-title {
          font-size: 11px; font-weight: 600; color: var(--uw-title);
          flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;
          letter-spacing: 0.02em; text-transform: uppercase;
        }

        .uw-controls { display:flex; align-items:center; gap:2px; flex-shrink:0; }
        .uw-util-btn, .uw-close-btn {
          background: none; border: none; cursor: pointer; color: var(--uw-title);
          width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
          border-radius: 4px; font-size: 10px; padding: 0; transition: all 0.12s; touch-action: manipulation;
        }
        .uw-util-btn:hover { background: var(--uw-btn-hover); color: var(--uw-text); }
        .uw-close-btn:hover { background: #e53935; color: #fff; }

        .uw-content {
          padding: 14px; flex-grow: 1; overflow: auto; background: transparent; color: var(--uw-text);
          -webkit-overflow-scrolling: touch; overscroll-behavior: contain; transition: opacity 0.2s;
        }
        
        .uw-content label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: rgba(255,255,255,0.7);
          font-size: 12px;
        }
        .uw-content input[type="text"], 
        .uw-content input[type="number"], 
        .uw-content select {
          width: 100%;
          padding: 7px 10px;
          margin-bottom: 12px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.15);
          color: var(--uw-text);
          border-radius: 6px;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .uw-content input[type="text"]:focus, 
        .uw-content input[type="number"]:focus, 
        .uw-content select:focus {
          border-color: rgba(100, 180, 255, 0.6);
          outline: none;
          box-shadow: 0 0 0 2px rgba(100, 180, 255, 0.15);
        }
        .uw-content .form-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 12px;
        }
        .uw-content .form-row label {
          margin-bottom: 0;
          flex-shrink: 0;
        }

        .uw-footer {
          padding: 8px 14px; background: rgba(0,0,0,0.15); border-top: 1px solid var(--uw-border);
          display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; border-radius: 0 0 12px 12px;
        }
        .uw-btn {
          padding: 6px 14px; background: var(--uw-btn-bg); color: var(--uw-text); border: 1px solid var(--uw-border);
          border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.15s;
        }
        .uw-btn:hover { background: var(--uw-btn-hover); color: var(--uw-text); transform: translateY(-1px); }
        .uw-btn.primary { background: #2962ff; border-color: #2979ff; color: #fff; }
        .uw-btn.primary:hover { background: #448aff; box-shadow: 0 2px 8px rgba(41,98,255,0.4); }

        .uw-transparent { background:transparent!important; border:none!important; box-shadow:none!important; backdrop-filter:none!important; }
        .uw-transparent .uw-header { background: rgba(0,0,0,0.3)!important; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 4px; }
        .uw-transparent .uw-content { background:transparent!important; padding: 0; }
        .uw-transparent .uw-footer { display:none!important; }
        .uw-dialog:hover .uw-corner { opacity: 1 !important; }

        .uw-w-wrap { margin: 2px 0; }
        .uw-w-ph {
          display: flex; align-items: center; gap: 6px; padding: 4px 8px; min-height: 26px;
          border-radius: 6px; background: var(--uw-ph-bg); border: 1px dashed var(--uw-ph-border);
        }
        .uw-w-ph-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink:0; animation: uw-pulse 2s ease-in-out infinite; }
        .uw-w-ph-lbl { font-size: 10px; color: var(--uw-title); font-style: italic; flex-grow:1; }
        .uw-w-ph-btn { background:none; border:none; color:var(--uw-title); cursor:pointer; font-size:14px; padding:0 4px; border-radius:4px; transition:all 0.15s; line-height:1; }
        .uw-w-ph-btn:hover { color:var(--uw-text); background:var(--uw-btn-hover); }

        .uw-w-docked { border-radius: 6px; overflow: hidden; background: var(--uw-hdr-bg); border: 1px solid var(--uw-border); transition: box-shadow 0.2s; }
        .uw-w-hdr {
          display: flex; align-items: center; gap: 4px; padding: 3px 8px; min-height: 22px;
          background: var(--uw-btn-bg); border-bottom: 1px solid var(--uw-border);
        }
        .uw-w-lbl { font-size: 9.5px; font-weight: 700; color: var(--uw-title); text-transform: uppercase; letter-spacing: 0.08em; flex-grow:1; pointer-events: none; }
        .uw-w-pop { background:none; border:none; color:var(--uw-title); cursor:pointer; font-size:12px; padding:2px 5px; border-radius:3px; transition:all 0.15s; line-height:1; }
        .uw-w-pop:hover { color:var(--uw-text); background:var(--uw-btn-hover); }
        .uw-w-ctrl { padding: 6px 8px; }

        .uw-w-inline { display: flex; align-items: center; border-radius: 16px; background: var(--uw-btn-bg); border: 1px solid var(--uw-border); overflow: hidden; }
        .uw-w-inline .uw-inline-hdr { display: flex; align-items: center; padding-left: 8px; flex-shrink: 1; min-width: 40px; }
        .uw-w-inline .uw-w-ctrl { flex-grow: 1; padding: 2px 8px 2px 0; display: flex; justify-content: flex-end; }
        .uw-inline-grip { color: var(--uw-title); cursor: grab; padding: 0 4px; font-size: 14px; user-select: none; }
        .uw-inline-lbl { font-size: 10px; font-weight: 600; color: var(--uw-title); text-transform: uppercase; letter-spacing: 0.05em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 6px; pointer-events: none; }

        .uw-float {
          position: fixed; min-width: 140px;
          background: var(--uw-float-bg); 
          border: 1px solid var(--uw-border); border-radius: 10px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.85), 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          opacity: 0; transform: scale(0.85) translateY(-8px);
          transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
          overflow: hidden;
        }
        .uw-float.uw-float-vis { opacity: 1; transform: scale(1) translateY(0); }

        .uw-float-inline { 
          display: flex; align-items: center; border-radius: 20px; 
          background: var(--uw-float-bg); min-width: 160px; height: 40px; padding: 0;
        }
        .uw-float-inline .uw-inline-hdr { display: flex; align-items: center; padding-left: 10px; flex-shrink: 1; min-width: 60px; border: none; cursor: grab; height: 100%; }
        .uw-float-inline .uw-float-ctrl { flex-grow: 1; padding: 0 12px 0 0; display: flex; justify-content: flex-end; }
        .uw-float-inline .uw-float-dock { background: none; border: none; color: var(--uw-title); cursor: pointer; font-size: 14px; margin-left: auto; padding: 4px; transition: color 0.15s; }
        .uw-float-inline .uw-float-dock:hover { color: var(--uw-text); }

        .uw-float-bar {
          display: flex; align-items: center; gap: 6px; padding: 4px 8px;
          background: var(--uw-hdr-bg); border-bottom: 1px solid var(--uw-border);
          cursor: grab; user-select: none; min-height: 24px;
        }
        .uw-float-bar:active, .uw-inline-hdr:active { cursor: grabbing; }
        .uw-float-lbl { flex-grow:1; font-size: 10px; font-weight: 700; color: var(--uw-title); text-transform: uppercase; letter-spacing: 0.08em; pointer-events: none; }
        .uw-float-ctrl { padding: 8px; }

        .uw-fres { position:absolute; top:8px; bottom:8px; width:6px; cursor:ew-resize; opacity:0; transition:opacity 0.2s; border-radius:3px; background:rgba(255,255,255,0.15); }
        .uw-float:hover .uw-fres { opacity: 1; }
        .uw-fres-l { left: -2px; }
        .uw-fres-r { right: -2px; }

        .uw-flash-fx { animation: uw-flash-anim 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes uw-flash-anim { 0% { box-shadow: 0 0 0 2px rgba(100,255,150,0.8), inset 0 0 20px rgba(100,255,150,0.4); } 100% { box-shadow: 0 0 0 0 rgba(100,255,150,0); inset 0 0 0 rgba(100,255,150,0); } }
        .uw-wheel-locked { box-shadow: 0 0 0 1px rgba(100, 180, 255, 0.5), 0 0 15px rgba(100, 180, 255, 0.2); border-color: rgba(100, 180, 255, 0.5); }

        .uw-midi-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .uw-midi-dot:hover { background: rgba(255,180,0,0.6); border-color: rgba(255,180,0,0.9); box-shadow: 0 0 6px rgba(255,180,0,0.5); }
        .uw-midi-dot.uw-midi-armed { background: #ff3333; border-color: #ff6666; animation: uw-pulse 0.5s ease-in-out infinite; box-shadow: 0 0 8px rgba(255,50,50,0.6); }
        .uw-light-mode .uw-midi-dot { background: rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.1); }

        .uw-ctrl-inner { display: flex; align-items: center; justify-content: flex-start; min-height: 26px; width: 100%; }

        .uw-toggle {
          width: 40px; height: 22px; border-radius: 11px; position: relative; cursor: pointer; flex-shrink:0;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.05);
          transition: background 0.25s, box-shadow 0.25s;
        }
        .uw-toggle-thumb {
          position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
          background: #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.6);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); pointer-events:none;
        }
        .uw-toggle.uw-on .uw-toggle-thumb { transform: translateX(18px); background: #fff; }
        .uw-light-mode .uw-toggle { background: rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.05); }

        .uw-sl-wrap { position: relative; width: 100%; height: 32px; display: flex; align-items: center; cursor: ew-resize; padding: 0 8px; box-sizing: border-box; touch-action: none; margin-top: 6px; }
        .uw-sl-bg { position: absolute; left: 8px; right: 8px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; }
        .uw-light-mode .uw-sl-bg { background: rgba(0,0,0,0.1); }
        .uw-sl-fill { position: absolute; left: 8px; height: 4px; border-radius: 2px; pointer-events: none; transition: background-color 0.2s, box-shadow 0.2s, filter 0.2s; background-color: rgba(255,255,255,0.6); }
        .uw-sl-thumb { position: absolute; width: 8px; height: 14px; border-radius: 4px; background: #fff; transform: translate(-50%, 0); pointer-events: none; transition: transform 0.2s, opacity 0.2s; opacity: 0.5; }
        .uw-sl-wrap:hover .uw-sl-fill, .uw-sl-wrap.uw-active .uw-sl-fill { background-color: #fff !important; filter: brightness(1.2); }
        .uw-sl-wrap:hover .uw-sl-thumb, .uw-sl-wrap.uw-active .uw-sl-thumb { opacity: 1; transform: translate(-50%, 0) scale(1.3); }
        .uw-sl-txt { position: absolute; width: auto; font-size: 11px; font-weight: 800; pointer-events: none; text-shadow: 0 1px 3px #000, 0 0 4px #000, 0 0 6px rgba(0,0,0,0.8); color: #fff; font-family: monospace; letter-spacing: 0.05em; left: 0; top: -16px; z-index: 2; }
        .uw-w-inline .uw-sl-wrap { margin-top: 0; }
        .uw-w-inline .uw-sl-txt { top: -12px; position: absolute; width: auto; right: 8px; left: auto; font-size: 10px; }

        .uw-text-inp, .uw-select {
          width:100%; background:var(--uw-ctrl-bg); border:1px solid var(--uw-border);
          border-radius:5px; color:var(--uw-text); padding:6px 10px; font-size:12px;
          outline:none; transition:border-color 0.2s, box-shadow 0.2s;
        }
        .uw-text-inp:focus, .uw-select:focus { border-color:rgba(100,180,255,0.6); box-shadow: 0 0 0 2px rgba(100,180,255,0.15); }
        .uw-select { cursor: pointer; }

        .uw-btnset { display:flex; gap:2px; flex-wrap:wrap; width:100%; background: rgba(0,0,0,0.3); padding: 3px; border-radius: 6px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.4); }
        .uw-light-mode .uw-btnset { background: rgba(0,0,0,0.05); box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); }
        .uw-btn-item {
          flex:1; min-width:32px; padding:4px 8px;
          background: transparent; border: none;
          border-radius:4px; color: var(--uw-title);
          font-size:11px; font-weight: 600; cursor:pointer; transition:all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); white-space:nowrap;
        }
        .uw-btn-item:hover { color: var(--uw-text); background: var(--uw-btn-hover); }
        .uw-light-mode .uw-btn-item:hover { background: rgba(0,0,0,0.05); }
        .uw-btn-item.uw-active { background: rgba(255,255,255,0.15); color: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
        .uw-light-mode .uw-btn-item.uw-active { background: #fff; color: #000; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }

        .uw-prompt-inp { width:100%; padding:8px 12px; background:var(--uw-ctrl-bg); color:var(--uw-text); border:1px solid var(--uw-border); border-radius:6px; font-size:14px; outline:none; margin-top:10px; box-sizing:border-box; transition:border-color 0.2s; }
        .uw-prompt-inp:focus { border-color: #2979ff; box-shadow: 0 0 0 2px rgba(41,121,255,0.2); }
        .uw-prompt-msg { color: var(--uw-title); font-size: 13px; line-height: 1.4; }

        @keyframes uw-pulse { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.4); } }
        @media (max-width: 768px) {
          .uw-dialog { max-width:calc(100vw - 16px)!important; max-height:calc(100vh - 24px)!important; }
          .uw-header { min-height:44px!important; padding:6px 12px!important; cursor:default; }
          .uw-swipe-hint { display:block; width: 32px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 0 auto; }
          .uw-title { font-size: 13px; }
          .uw-util-btn, .uw-close-btn { width: 36px!important; height: 36px!important; font-size: 14px!important; background: rgba(255,255,255,0.05); }
          .uw-corner { display:none!important; }
          .uw-btn { padding: 12px 20px; font-size: 14px; min-height: 44px; }
        }
      `;

    if (typeof applyCss === 'function') {
      applyCss(css, 'UIToolsStyles');
    } else {
      let style = document.getElementById('UIToolsStyles');
      if (!style) {
        style = document.createElement('style');
        style.id = 'UIToolsStyles';
        (document.head || document.documentElement).appendChild(style);
      }
      style.textContent = css;
    }
  }

  _toggleMidi() {
    this._midiArmed = !this._midiArmed;
    if (this._midiDotEl)
      this._midiDotEl.classList.toggle('uw-midi-armed', this._midiArmed);
    if (this._floatMidiDot)
      this._floatMidiDot.classList.toggle('uw-midi-armed', this._midiArmed);

    if (this._midiArmed) {
      if (typeof MidiInputHandler !== 'undefined') {
        localStorage.setItem('uw_midi_enabled', 'true');
        if (!MidiInputHandler._getState().isInitialized)
          MidiInputHandler.init();
        if (!this._midiBound) {
          this._midiListener = (msg) => this._onMidi(msg);
          this._midiBound = true;
        }
        MidiInputHandler.addDataHandler(this._midiListener);
        console.log(
          `[UITools] MIDI Armed for "${this.options.label}" - turn a knob to map.`
        );
      } else {
        console.warn('[UITools] MidiInputHandler not found.');
        this._midiArmed = false;
        if (this._midiDotEl) this._midiDotEl.classList.remove('uw-midi-armed');
        if (this._floatMidiDot)
          this._floatMidiDot.classList.remove('uw-midi-armed');
      }
    } else {
      if (this._midiBound && typeof MidiInputHandler !== 'undefined') {
        MidiInputHandler.removeDataHandler(this._midiListener);
      }
    }
  }

  _onMidi(msg) {
    const [status, cc, val] = msg.data;
    if (status >= 176 && status <= 191) {
      if (this._midiArmed && this.options.midiCC == null) {
        this.options.midiCC = cc;
        this._toggleMidi();

        MidiInputHandler.addDataHandler((m) => {
          const [s, c, v] = m.data;
          if (s >= 176 && s <= 191 && c === this.options.midiCC) {
            this._applyMidiVal(v);
          }
        });
        console.log(`[UITools] Mapped CC ${cc} to "${this.options.label}"`);
        this._flashAccent();
      }
    }
  }

  _applyMidiVal(val) {
    if (this.options.type === 'slider') {
      const { min, max } = this.options;
      this.setValue(min + (val / 127) * (max - min));
      this.options.onChange?.(this._value, this);
    } else if (this.options.type === 'toggle') {
      this.setValue(val > 64);
      this.options.onChange?.(this._value, this);
    } else if (this.options.type === 'custom' && this.options.onMidi) {
      this.options.onMidi(val);
    }
    this._flashAccent();
  }

  static _showCovers() {
    if (!UITools._getState().iframeCovers) {
      UITools._getState().iframeCovers = [];
    }
    document.querySelectorAll('iframe').forEach((f) => {
      const c = document.createElement('div');
      c.className = 'uw-iframe-cover';
      Object.assign(c.style, {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        background: 'transparent',
      });
      if (f.parentElement) {
        f.parentElement.style.position = 'relative';
        f.parentElement.appendChild(c);
        UITools._getState().iframeCovers.push(c);
      }
    });
  }

  static _hideCovers() {
    if (UITools._getState().iframeCovers) {
      UITools._getState().iframeCovers.forEach((c) => c.remove());
      UITools._getState().iframeCovers = [];
    }
  }

  static _ensureSVG() {}

  _setupSmartSplit(container, hdr, ctrlWrap) {
    if (!container || !hdr || !ctrlWrap) return;

    hdr.style.flex = '1';
    ctrlWrap.style.flex = '1';
    hdr.style.width = '50%';
    ctrlWrap.style.width = '50%';

    if (this._smartSplitObserver) {
      this._smartSplitObserver.disconnect();
      this._smartSplitObserver = null;
    }
  }

  static showHUD(options = {}) {
    const state = UITools._getState();
    if (!state.huds) state.huds = [];

    let isNew = false;
    let hudObj = options.id
      ? state.huds.find((h) => h.id === options.id)
      : null;

    if (!hudObj) {
      isNew = true;
      const position = options.position || 'bottom-right';
      const el = document.createElement('div');
      el.className = `uw-hud uw-hud-${position}`;
      Object.assign(el.style, {
        position: 'fixed',
        zIndex: ++state.z + 10000,
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        pointerEvents: 'auto',
        opacity: '0',
        transform: position.includes('bottom')
          ? 'translateY(20px)'
          : 'translateY(-20px)',
      });

      if (position === 'top-banner' || position === 'bottom-banner') {
        el.style.left = '0';
        el.style.right = '0';
        el.style.width = '100%';
        el.style.transform =
          position === 'top-banner' ? 'translateY(-100%)' : 'translateY(100%)';
      }

      document.body.appendChild(el);

      hudObj = {
        id: options.id || Math.random().toString(),
        position,
        el,
        close: () => {
          hudObj.el.style.opacity = '0';
          hudObj.el.style.pointerEvents = 'none';
          if (hudObj.position === 'top-banner')
            hudObj.el.style.transform = 'translateY(-100%)';
          else if (hudObj.position === 'bottom-banner')
            hudObj.el.style.transform = 'translateY(100%)';
          else
            hudObj.el.style.transform = hudObj.position.includes('bottom')
              ? 'translateY(20px)'
              : 'translateY(-20px)';

          setTimeout(() => {
            if (hudObj.el.isConnected) hudObj.el.remove();
            state.huds = state.huds.filter((h) => h !== hudObj);
            UITools._recalculateHUDPositions(hudObj.position);
          }, 300);
        },
      };
      state.huds.push(hudObj);
    }

    if (options.contentElement) {
      hudObj.el.innerHTML = '';
      hudObj.el.appendChild(options.contentElement);
    } else if (options.html) {
      hudObj.el.innerHTML = options.html;
    }

    requestAnimationFrame(() => {
      hudObj.el.style.opacity = '1';
      if (
        hudObj.position === 'top-banner' ||
        hudObj.position === 'bottom-banner'
      ) {
        hudObj.el.style.transform = 'translateY(0)';
      } else {
        hudObj.el.style.transform =
          hudObj.position.includes('bottom') && hudObj.position === 'bottom'
            ? 'translate(-50%, 0)'
            : 'translate(0, 0)';
      }
      UITools._recalculateHUDPositions(hudObj.position);
    });

    if (options.autoClose) {
      setTimeout(hudObj.close, options.autoClose);
    }

    return hudObj;
  }

  static _recalculateHUDPositions(position) {
    const state = UITools._getState();
    if (!state.huds) return;
    const huds = state.huds.filter((h) => h.position === position);

    let offset =
      position === 'top-banner' || position === 'bottom-banner' ? 0 : 20;

    if (position.includes('bottom')) {
      for (let i = huds.length - 1; i >= 0; i--) {
        const hud = huds[i];
        hud.el.style.bottom = `${offset}px`;
        if (position === 'bottom-right') hud.el.style.right = '20px';
        if (position === 'bottom-left') hud.el.style.left = '20px';
        if (position === 'bottom') {
          hud.el.style.left = '50%';
          hud.el.style.transform = 'translate(-50%, 0)';
        }
        offset += hud.el.offsetHeight + (position.includes('banner') ? 0 : 10);
      }
    } else {
      for (let i = huds.length - 1; i >= 0; i--) {
        const hud = huds[i];
        hud.el.style.top = `${offset}px`;
        if (position === 'top-right') hud.el.style.right = '20px';
        if (position === 'top-left') hud.el.style.left = '20px';
        if (position === 'top') {
          hud.el.style.left = '50%';
          hud.el.style.transform = 'translate(-50%, 0)';
        }
        offset += hud.el.offsetHeight + (position.includes('banner') ? 0 : 10);
      }
    }
  }

  _setupLifecycleObserver() {
    if (this.env && this.env.container) {
      const parent = this.env.container.parentNode || document.body;
      
      this._lifecycleObserver = new MutationObserver(() => {
        const isConnected = document.body.contains(this.env.container);
        if (!isConnected) {
          console.log(`[UITools] 🗑️ Closing dialog "${this.options.title}" due to parent container unmounting.`);
          this.close();
        }
      });
      
      this._lifecycleObserver.observe(parent, { childList: true });
    }
  }

  setSubtitle(sub) {
    if (!this.header) return;
    let subEl = this.header.querySelector('.uw-subtitle');
    if (!subEl) {
      subEl = UITools._el('span', { className: 'uw-subtitle', style: 'opacity: 0.6; font-size: 0.9em; margin-left: 6px; font-weight: normal;' });
      const titleEl = this.header.querySelector('.uw-title');
      if (titleEl) titleEl.appendChild(subEl);
    }
    subEl.textContent = sub ? `(${sub})` : '';
  }

  static get creationVisibilityMode() {
    return this._creationVisibilityMode || 'visible';
  }

  static set creationVisibilityMode(val) {
    this._creationVisibilityMode = val;
  }

  static revealHiddenDialogs() {
    UITools._getState().all.forEach(w => {
      if (w.element && (w.element.style.opacity === '0' || w.element.style.opacity === '0.01')) {
        w.element.style.transition = 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
        w.element.style.opacity = '1';
        w.element.style.transform = 'none';
        setTimeout(() => {
          if (w.element) w.element.style.transition = '';
        }, 250);
      }
    });
  }
}