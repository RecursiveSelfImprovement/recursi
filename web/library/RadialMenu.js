class RadialMenu {
  constructor(options = {}) {
    this.options = {
      radius: 90,
      innerRadius: 20,
      maxItems: 12,
      zIndex: 2147483648,
      showCenterControls: true,
      ...options,
    };

    this.root = null;
    this.isOpen = false;
    this.items = [];

    this._centerX = 0;
    this._centerY = 0;
    this._hasOpenedOnce = false;

    this._persistentXButton = null;
    this._persistentTimer = null;

    this._onDocPointerDown = this._onDocPointerDown.bind(this);
    this._onDocContextMenu = this._onDocContextMenu.bind(this);
    this._onDocKey = this._onDocKey.bind(this);
    this._onResize = this._onResize.bind(this);

    this._ensureStyles();
  }

  // Backward compatibility alias for Aardvark
  close(options) {
    this.hide(options);
  }

  show(x, y, items, config = {}) {
    this.hide({ skipPersistentX: true });

    if (!items || items.length === 0) return;

    this.items = items.slice(0, this.options.maxItems);
    this._currentConfig = config;

    // --- Create DOM Structure ---
    this.root = makeElement('div', { className: 'radial-menu-root' });
    this.root.style.zIndex = this.options.zIndex;
    this.root.setAttribute('data-style-exclude', '');

    if (!this._hasOpenedOnce) {
      this.root.classList.add('dramatic');
      this._hasOpenedOnce = true;
    } else {
      this.root.classList.add('subsequent');
    }

    const ring = makeElement('div', { className: 'radial-menu-ring' });

    // Center Dot (Dismiss)
    if (config.showDot !== false) {
      const dot = makeElement('div', {
        className: 'radial-menu-center-dot',
        title: 'Dismiss',
      });
      dot.onclick = (e) => {
        e.stopPropagation();
        this.hide();
      };
      ring.appendChild(dot);
    }

    // Left Control (Help - default '?')
    if (config.showHelp !== false && config.onHelp) {
      const help = makeElement('div', {
        className: 'radial-menu-center-help',
        textContent: '?',
        title: 'Help',
      });
      help.onclick = (e) => {
        e.stopPropagation();
        config.onHelp();
        this.hide();
      };
      ring.appendChild(help);
    } else if (config.leftButton) {
      const btn = makeElement('div', {
        className: 'radial-menu-center-help custom',
        innerHTML: config.leftButton.html || '',
        title: config.leftButton.title || '',
      });
      if (config.leftButton.active) btn.classList.add('active');
      btn.onclick = (e) => {
        e.stopPropagation();
        if (config.leftButton.onClick) config.leftButton.onClick();
        if (!config.leftButton.keepOpen) this.hide();
      };
      ring.appendChild(btn);
    }

    // Right Control (Quit - default 'X')
    if (config.showX !== false && config.onQuit) {
      const quit = makeElement('div', {
        className: 'radial-menu-center-quit',
        textContent: 'X',
        title: config.quitTitle || 'Quit',
      });
      quit.onclick = (e) => {
        e.stopPropagation();
        this._handleQuit();
      };
      ring.appendChild(quit);
    } else if (config.rightButton) {
      const btn = makeElement('div', {
        className: 'radial-menu-center-quit custom',
        innerHTML: config.rightButton.html || '',
        title: config.rightButton.title || '',
      });
      if (config.rightButton.active) btn.classList.add('active');
      btn.onclick = (e) => {
        e.stopPropagation();
        if (config.rightButton.onClick) config.rightButton.onClick();
        if (!config.rightButton.keepOpen) this.hide();
      };
      ring.appendChild(btn);
    }

    this.root.appendChild(ring);
    this._renderItems(this.root);
    document.body.appendChild(this.root);

    const clamped = this._clampCenter(x, y);
    this._centerX = clamped.x;
    this._centerY = clamped.y;
    this._updatePosition();

    this.isOpen = true;
    requestAnimationFrame(() => {
      if (this.root) this.root.classList.add('open');
    });

    setTimeout(() => {
      document.addEventListener('pointerdown', this._onDocPointerDown, true);
      document.addEventListener('contextmenu', this._onDocContextMenu, true);
      document.addEventListener('keydown', this._onDocKey, true);
      window.addEventListener('resize', this._onResize, true);
      window.addEventListener('scroll', this._onResize, true);
    }, 10);
  }

  refresh(items, config = {}) {
    if (!this.isOpen || !this.root) return;

    this.items = items.slice(0, this.options.maxItems);
    this._currentConfig = { ...this._currentConfig, ...config };

    const oldItems = this.root.querySelectorAll('.radial-menu-item');
    oldItems.forEach((el) => el.remove());

    this._renderItems(this.root);
  }

  hide(options = {}) {
    if (!this.isOpen) return;
    this.isOpen = false;

    document.removeEventListener('pointerdown', this._onDocPointerDown, true);
    document.removeEventListener('contextmenu', this._onDocContextMenu, true);
    document.removeEventListener('keydown', this._onDocKey, true);
    window.removeEventListener('resize', this._onResize, true);
    window.removeEventListener('scroll', this._onResize, true);

    if (
      !options.skipPersistentX &&
      this._currentConfig &&
      this._currentConfig.onQuit
    ) {
      this._showPersistentX();
    }

    if (this.root) {
      if (options.immediate) {
        this.root.remove();
        this.root = null;
      } else {
        this.root.classList.remove('open');
        const el = this.root;
        this.root = null;
        setTimeout(() => {
          if (el.parentNode) el.remove();
        }, 300);
      }
    }
  }

  _handleQuit() {
    if (this._currentConfig.onQuit) this._currentConfig.onQuit();
    // Hide menu immediately so it feels snappy
    this.hide({ immediate: true });
  }

  _showPersistentX() {
    if (this._persistentXButton) this._persistentXButton.remove();
    if (this._persistentTimer) clearTimeout(this._persistentTimer);

    const ghost = makeElement('div', {
      className: 'radial-menu-ghost-x',
      textContent: 'X',
      title: 'Quit (Persistent)',
      onclick: (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this._currentConfig.onQuit) this._currentConfig.onQuit();
        this._removePersistentX(true); // True = Immediate
      },
    });

    // Approximate original position of the X button relative to center
    // Center is 45px radius. Button is at ~20px right of center.
    const quitOffsetX = 20;

    ghost.style.left = this._centerX + quitOffsetX + 'px';
    ghost.style.top = this._centerY + 'px';
    ghost.style.zIndex = this.options.zIndex;

    document.body.appendChild(ghost);
    this._persistentXButton = ghost;

    requestAnimationFrame(() => ghost.classList.add('visible'));

    this._persistentTimer = setTimeout(() => {
      this._removePersistentX(false); // Fade out
    }, 2500);
  }

  _removePersistentX(immediate = false) {
    if (this._persistentXButton) {
      const el = this._persistentXButton;
      this._persistentXButton = null;

      if (immediate) {
        el.remove();
      } else {
        el.classList.remove('visible');
        setTimeout(() => {
          if (el.parentNode) el.remove();
        }, 300);
      }
    }
  }

  _renderItems(container) {
    const n = this.items.length;
    if (n === 0) return;

    const baseRadius = this.options.radius;
    let adjustment = 0;
    if (n <= 4) adjustment = -25;
    else if (n <= 6) adjustment = -15;
    else if (n <= 9) adjustment = -5;
    else adjustment = (n - 9) * 7;

    const r = Math.max(45, baseRadius + adjustment);
    const step = 360 / n;
    const startAngle = 0;

    this.items.forEach((item, i) => {
      const angle = startAngle + step * i;

      const btn = makeElement('button', {
        className: 'radial-menu-item',
        type: 'button',
      });
      if (item.title) btn.title = item.title;

      const labelWrap = this._buildLabel(item);
      btn.appendChild(labelWrap);

      const normAngle = ((angle % 360) + 360) % 360;
      const isLeft = normAngle > 90 && normAngle < 270;

      btn.style.position = 'absolute';
      btn.style.left = '50%';
      btn.style.top = '50%';

      if (!isLeft) {
        btn.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateX(${r}px) translateX(50%)`;
      } else {
        btn.style.transform = `translate(-50%, -50%) rotate(${
          angle - 180
        }deg) translateX(${-r}px) translateX(-50%)`;
      }

      btn.onclick = (e) => {
        e.stopPropagation();
        if (item.onClick) item.onClick();
        if (!item.keepOpen) this.hide();
      };

      btn.onmousedown = (e) => e.stopPropagation();
      container.appendChild(btn);
    });
  }

  _buildLabel(item) {
    const wrap = makeElement('div', { className: 'radial-menu-item-wrap' });
    const text = item.label || '';
    const hotKey = (item.key || '').toUpperCase();

    let content = [];

    if (hotKey && text.toUpperCase().includes(hotKey)) {
      const idx = text.toUpperCase().indexOf(hotKey);
      const pre = text.substring(0, idx);
      const post = text.substring(idx + 1);

      if (pre) content.push(makeElement('span', { className: 'rest' }, pre));
      content.push(makeElement('span', { className: 'hot' }, text[idx]));
      if (post) content.push(makeElement('span', { className: 'rest' }, post));
    } else if (hotKey) {
      content.push(makeElement('span', { className: 'hot' }, hotKey));
      content.push(makeElement('span', { className: 'rest' }, ' ' + text));
    } else {
      content.push(makeElement('span', { className: 'rest' }, text));
    }

    content.forEach((el) => wrap.appendChild(el));
    return wrap;
  }

  _clampCenter(x, y) {
    const pad = 20;
    const size = this.options.radius + 80;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const cx = Math.min(Math.max(x, pad + size), vw - pad - size);
    const cy = Math.min(Math.max(y, pad + size), vh - pad - size);
    return { x: cx, y: cy };
  }

  _updatePosition() {
    if (this.root) {
      this.root.style.left = `${this._centerX}px`;
      this.root.style.top = `${this._centerY}px`;
    }
  }

  _onDocPointerDown(e) {
    if (this.root && !this.root.contains(e.target)) {
      this.hide();
    }
  }

  _onDocContextMenu(e) {
    e.preventDefault();
    this.hide();
  }

  _onDocKey(e) {
    if (e.key === 'Escape') {
      this.hide();
      return;
    }
    const key = e.key.toUpperCase();
    const match = this.items.find((i) => (i.key || '').toUpperCase() === key);
    if (match) {
      e.preventDefault();
      if (match.onClick) match.onClick();
      if (!match.keepOpen) this.hide();
    }
  }

  _onResize() {
    if (!this.isOpen) return;
    const clamped = this._clampCenter(this._centerX, this._centerY);
    this._centerX = clamped.x;
    this._centerY = clamped.y;
    this._updatePosition();
  }

  _ensureStyles() {
    applyCss(
      `
      .radial-menu-root {
        position: fixed; width: 0; height: 0;
      }
      
      .radial-menu-root::before {
        content: ''; position: fixed; top: -5000px; left: -5000px; width: 10000px; height: 10000px;
        z-index: -1; 
        background: transparent;
      }

      .radial-menu-root.dramatic {
        transform: scale(0.2) rotate(-320deg);
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease-out;
      }
      .radial-menu-root.subsequent {
        transform: scale(0.9);
        opacity: 0;
        transition: transform 0.15s ease-out, opacity 0.1s ease-out;
      }
      .radial-menu-root.open {
        transform: scale(1) rotate(0deg);
        opacity: 1;
      }

      .radial-menu-ring {
        position: absolute; left: 50%; top: 50%;
        width: 90px; height: 90px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: rgba(0,0,0,0.4);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1);
        backdrop-filter: blur(4px);
        pointer-events: auto;
      }

      .radial-menu-center-dot {
        position: absolute; left: 50%; top: 50%;
        width: 14px; height: 14px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: rgba(100,100,100,0.9);
        box-shadow: 0 2px 5px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: transform 0.2s, background 0.2s;
        z-index: 2;
      }
      .radial-menu-center-dot:hover {
        transform: translate(-50%, -50%) scale(1.4);
        background: #fff;
      }

      .radial-menu-center-help, .radial-menu-center-quit {
        position: absolute; top: 50%;
        transform: translate(-50%, -50%);
        font-family: sans-serif; font-weight: bold;
        cursor: pointer;
        opacity: 0.8;
        transition: all 0.2s;
        font-size: 22px;
      }
      .radial-menu-center-help { left: 28%; color: #00bfff; }
      .radial-menu-center-help:hover { 
        opacity: 1; text-shadow: 0 0 15px #00bfff; transform: translate(-50%, -50%) scale(1.2); 
      }
      
      .radial-menu-center-quit { left: 72%; color: #ff4444; }
      .radial-menu-center-quit:hover { 
        opacity: 1; text-shadow: 0 0 15px #ff4444; transform: translate(-50%, -50%) scale(1.2); 
      }

      .radial-menu-center-help.custom, .radial-menu-center-quit.custom {
         font-size: 16px;
         background: rgba(255,255,255,0.1);
         border-radius: 50%;
         width: 28px; height: 28px;
         display: flex; align-items: center; justify-content: center;
         border: 1px solid rgba(255,255,255,0.2);
      }
      .radial-menu-center-help.custom.active { background: #28a745; color: white; border-color: #fff; }
      .radial-menu-center-quit.custom.active { background: #dc3545; color: white; border-color: #fff; }

      .radial-menu-item {
        position: absolute;
        background: transparent; border: none; padding: 0;
        cursor: pointer; pointer-events: auto;
        white-space: nowrap;
        outline: none;
      }
      
      .radial-menu-item-wrap {
        display: inline-flex; align-items: baseline;
        padding: 5px 10px; border-radius: 8px;
        background: rgba(20, 20, 20, 0.9);
        border: 1px solid rgba(255,255,255,0.15);
        box-shadow: 0 3px 8px rgba(0,0,0,0.5);
        color: #eee;
        font-family: 'Segoe UI', sans-serif;
        font-size: 13px; font-weight: 600;
        transition: all 0.1s;
      }

      .radial-menu-item:hover .radial-menu-item-wrap {
        background: rgba(60, 60, 60, 1);
        border-color: rgba(255,255,255,0.4);
        transform: scale(1.1);
        z-index: 10;
        box-shadow: 0 5px 15px rgba(0,0,0,0.6);
      }

      .radial-menu-item-wrap .hot {
        font-family: monospace; font-size: 16px; font-weight: 900;
        color: #ffd700; margin-right: 1px;
      }
      .radial-menu-item:hover .hot { color: #fff; text-shadow: 0 0 8px gold; }

      .radial-menu-ghost-x {
        position: fixed;
        width: 30px; height: 30px;
        transform: translate(-50%, -50%);
        font-family: sans-serif; font-size: 22px; font-weight: bold;
        color: #ff4444; 
        cursor: pointer; pointer-events: auto;
        opacity: 0;
        transition: opacity 0.2s, transform 0.2s;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.3); border-radius: 50%;
      }
      .radial-menu-ghost-x.visible { opacity: 0.8; }
      .radial-menu-ghost-x:hover { 
        opacity: 1; transform: translate(-50%, -50%) scale(1.3);
        background: rgba(0,0,0,0.6);
        text-shadow: 0 0 10px red;
      }
    `,
      'RadialMenuStyles'
    );
  }


  

  
}
