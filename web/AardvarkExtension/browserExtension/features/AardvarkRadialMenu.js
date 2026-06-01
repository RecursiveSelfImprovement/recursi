class AardvarkRadialMenu {
  constructor(aardvark) {
    this.main = aardvark;

    this._root = null;
    this._items = [];
    this._isOpen = false;

    this._centerX = 0;
    this._centerY = 0;

    this._onDocPointerDown = this._onDocPointerDown.bind(this);
    this._onDocContextMenu = this._onDocContextMenu.bind(this);
    this._onKeyDownCapture = this._onKeyDownCapture.bind(this);
    this._onResize = this._onResize.bind(this);

    this._didCss = false;
    this._hasOpenedOnce = false; // State for animation intensity

    // Tunables (Tighter & Punchier)
    this.opts = {
      radius: 34,
      innerRadius: 8,
      padding: 10,
      itemHitPad: 6,
      maxItems: 12,
      ringBlurPx: 2,
    };
  }

  isOpen() {
    return !!this._isOpen;
  }

  close() {
    if (!this._isOpen) return;

    this._isOpen = false;

    try {
      document.removeEventListener('pointerdown', this._onDocPointerDown, true);
      document.removeEventListener('contextmenu', this._onDocContextMenu, true);
      document.removeEventListener('keydown', this._onKeyDownCapture, true);
      window.removeEventListener('resize', this._onResize, true);
      window.removeEventListener('scroll', this._onResize, true);
    } catch (e) {}

    // Restore hover selection behavior if we paused it
    this._unfreezeSelection();

    if (this._root && this._root.isConnected) {
      this._root.remove();
    }
    this._root = null;
    this._items = [];
  }

  openAt(clientX, clientY, items) {
    this._ensureCss();
    this.close();

    this._items = Array.isArray(items)
      ? items.slice(0, this.opts.maxItems)
      : [];
    if (this._items.length === 0) return;

    this._freezeSelection();

    const root = document.createElement('div');
    root.className = 'aardvark-radial';

    if (!this._hasOpenedOnce) {
      root.classList.add('dramatic');
      this._hasOpenedOnce = true;
    }

    root.setAttribute('data-style-exclude', '');
    root.tabIndex = -1;
    root.style.left = clientX + 'px';
    root.style.top = clientY + 'px';

    const ring = document.createElement('div');
    ring.className = 'aardvark-radial-ring';
    ring.setAttribute('data-style-exclude', '');

    // 1. Center Dot (Dismiss)
    const dot = document.createElement('div');
    dot.className = 'aardvark-radial-dot';
    dot.setAttribute('data-style-exclude', '');
    dot.title = 'Dismiss menu';
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });

    // 2. Left Question Mark (Help)
    const help = document.createElement('div');
    help.className = 'aardvark-radial-help';
    help.setAttribute('data-style-exclude', '');
    help.textContent = '?';
    help.title = 'Help';
    help.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.main && this.main.overlay) this.main.overlay.showHelp();
    });

    // 3. Right X (Quit Aardvark)
    const quit = document.createElement('div');
    quit.className = 'aardvark-radial-quit';
    quit.setAttribute('data-style-exclude', '');
    quit.textContent = 'X';
    quit.title = 'Quit Aardvark';
    quit.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.main) this.main.quit();
    });

    ring.appendChild(help);
    ring.appendChild(dot);
    ring.appendChild(quit);
    root.appendChild(ring);

    this._renderItemsIntoRoot(root);

    document.body.appendChild(root);

    const clamped = this._clampCenter(clientX, clientY, root);
    this._centerX = clamped.x;
    this._centerY = clamped.y;

    root.style.left = this._centerX + 'px';
    root.style.top = this._centerY + 'px';

    this._root = root;
    this._isOpen = true;

    requestAnimationFrame(() => {
      if (this._root) this._root.classList.add('open');
    });

    document.addEventListener('pointerdown', this._onDocPointerDown, true);
    document.addEventListener('contextmenu', this._onDocContextMenu, true);
    document.addEventListener('keydown', this._onKeyDownCapture, true);
    window.addEventListener('resize', this._onResize, true);
    window.addEventListener('scroll', this._onResize, true);
  }

  _ensureCss() {
    if (this._didCss) return;
    this._didCss = true;

    applyCss(
      `
    .aardvark-radial {
      position: fixed; z-index: 2147483647;
      width: 1px; height: 1px; left: 0; top: 0;
      pointer-events: none; user-select: none;
      opacity: 0;
      transform: scale(0.8) rotate(-15deg);
      transition: opacity 150ms ease-out, transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1.2);
    }
    .aardvark-radial.dramatic {
      transform: scale(0.2) rotate(-320deg);
      transition: opacity 300ms ease-out, transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .aardvark-radial.open { opacity: 1; transform: scale(1) rotate(0deg); }
    
    .aardvark-radial-ring {
      position: absolute; left: 50%; top: 50%;
      width: 90px; height: 90px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: rgba(0,0,0,0.25);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.08);
      pointer-events: none;
    }

    /* Center Dot (Dismiss) */
    .aardvark-radial-dot {
      position: absolute; left: 50%; top: 50%;
      width: 14px; height: 14px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: rgba(80,80,80,0.8);
      box-shadow: 0 2px 5px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.3);
      pointer-events: auto; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, background 0.2s;
      color: transparent; font-size: 10px; font-weight: bold;
    }
    .aardvark-radial-dot:hover {
      transform: translate(-50%, -50%) scale(1.3);
      background: #aaa;
      color: #333;
    }
    .aardvark-radial-dot:hover::after { content: "✕"; }

    /* The Question Mark (Help) */
    @keyframes av-pulse-blue {
      0% { text-shadow: 0 0 5px rgba(0, 190, 255, 0.5); transform: translate(-50%, -50%) scale(1); }
      50% { text-shadow: 0 0 15px rgba(0, 190, 255, 0.9), 0 0 25px rgba(0, 190, 255, 0.6); transform: translate(-50%, -50%) scale(1.1); }
      100% { text-shadow: 0 0 5px rgba(0, 190, 255, 0.5); transform: translate(-50%, -50%) scale(1); }
    }
    .aardvark-radial-help {
      position: absolute; top: 50%; left: 28%; /* Left of center */
      transform: translate(-50%, -50%);
      font-family: sans-serif; font-size: 24px; font-weight: bold;
      color: #00bfff; /* Deep Sky Blue */
      cursor: pointer; pointer-events: auto;
      animation: av-pulse-blue 2.5s infinite ease-in-out;
      opacity: 0.9; transition: opacity 0.2s;
    }
    .aardvark-radial-help:hover { opacity: 1; animation: none; text-shadow: 0 0 20px #00bfff; }

    /* The Big X (Quit) */
    .aardvark-radial-quit {
      position: absolute; top: 50%; left: 72%; /* Right of center */
      transform: translate(-50%, -50%);
      font-family: sans-serif; font-size: 22px; font-weight: bold;
      color: #ff4444; 
      cursor: pointer; pointer-events: auto;
      opacity: 0.8; transition: transform 0.2s, opacity 0.2s, color 0.2s;
    }
    .aardvark-radial-quit:hover {
      opacity: 1; transform: translate(-50%, -50%) scale(1.2);
      color: #ff0000; text-shadow: 0 0 10px rgba(255,0,0,0.5);
    }

    /* Items */
    .aardvark-radial-item {
      position: absolute; pointer-events: auto; cursor: pointer;
      border: 0; padding: 0; margin: 0; background: transparent;
      width: max-content; height: max-content;
    }
    .aardvark-radial-wrap {
      display: inline-flex; align-items: baseline; gap: 0; 
      padding: 5px 8px; border-radius: 6px;
      background: rgba(15, 15, 15, 0.85);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 4px 6px 12px rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
    }
    .aardvark-radial-item:hover .aardvark-radial-wrap {
      background: rgba(50, 50, 50, 0.95);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.3), 6px 8px 16px rgba(0,0,0,0.7);
      transform: scale(1.08) translateY(-2px);
      z-index: 10;
    }
    .aardvark-radial-hot {
      font-family: monospace; font-size: 19px; font-weight: 900;
      line-height: 1; color: #ffd700; display: inline-block;
    }
    .aardvark-radial-rest {
      font-size: 13px; font-weight: 700; line-height: 1;
      color: #fff; display: inline-block; white-space: nowrap;
    }
  `,
      'aardvarkRadialMenuStyles'
    );
  }

  _clampCenter(x, y, root) {
    const pad = this.opts.padding;
    const maxR = this.opts.radius + 70; // ring radius + label padding heuristic
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer actual layout if available
    try {
      const rect = root.getBoundingClientRect();
      // rect is around (x,y) because root is 1x1; use heuristic anyway
      void rect;
    } catch (e) {}

    const cx = Math.min(Math.max(x, pad + maxR), vw - pad - maxR);
    const cy = Math.min(Math.max(y, pad + maxR), vh - pad - maxR);
    return { x: cx, y: cy };
  }

  _onDocPointerDown(e) {
    if (!this._isOpen) return;

    // Clicking inside menu should not close (handled by buttons)
    const t = e && e.target ? e.target : null;
    if (
      t &&
      this._root &&
      (t === this._root || t.closest('.aardvark-radial'))
    ) {
      return;
    }

    // Any other click closes
    this.close();
  }

  _onDocContextMenu(e) {
    if (!this._isOpen) return;

    // If right-click occurs while open, just close and prevent browser menu (feels intentional)
    try {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    } catch (err) {}
    this.close();
  }

  _onKeyDownCapture(e) {
    if (!this._isOpen) return;

    const key = e && e.key ? String(e.key) : '';
    if (key === 'Escape') {
      try {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      } catch (err) {}
      this.close();
    }
  }

  _onResize() {
    if (!this._isOpen || !this._root) return;
    const clamped = this._clampCenter(this._centerX, this._centerY, this._root);
    this._centerX = clamped.x;
    this._centerY = clamped.y;
    this._root.style.left = this._centerX + 'px';
    this._root.style.top = this._centerY + 'px';
  }

  _buildHotLabel(item) {
    const hot = (item && item.key ? String(item.key) : '').toUpperCase();
    const labelRaw = (item && item.label ? String(item.label) : '').trim();

    const wrap = document.createElement('span');
    wrap.className = 'aardvark-radial-wrap';
    wrap.setAttribute('data-style-exclude', '');

    const big = document.createElement('span');
    big.className = 'aardvark-radial-hot';
    big.textContent = hot || '';

    const small = document.createElement('span');
    small.className = 'aardvark-radial-rest';

    // Try to integrate hot letter into the label if it appears in the word.
    // Example: Remove with R => "R" big + "emove" small
    // If not found, prefix: "X clear captures"
    if (!labelRaw) {
      small.textContent = '';
      wrap.appendChild(big);
      return wrap;
    }

    const idx = hot ? labelRaw.toUpperCase().indexOf(hot) : -1;

    if (idx >= 0) {
      // Keep prefix (if any) in small, then big, then suffix in small
      const pre = labelRaw.slice(0, idx);
      const post = labelRaw.slice(idx + 1);

      if (pre) {
        const preSpan = document.createElement('span');
        preSpan.className = 'aardvark-radial-rest';
        preSpan.textContent = pre;
        wrap.appendChild(preSpan);
      }

      wrap.appendChild(big);

      if (post) {
        const postSpan = document.createElement('span');
        postSpan.className = 'aardvark-radial-rest';
        postSpan.textContent = post;
        wrap.appendChild(postSpan);
      }

      return wrap;
    }

    // Not in word: "X clear captures" style
    wrap.appendChild(big);

    const space = document.createElement('span');
    space.className = 'aardvark-radial-rest';
    space.textContent = ' ';

    const rest = document.createElement('span');
    rest.className = 'aardvark-radial-rest';
    rest.textContent = labelRaw;

    wrap.appendChild(space);
    wrap.appendChild(rest);
    return wrap;
  }

  _freezeSelection() {
    // "Lock Aardvark to where it is" while radial menu is up.
    // We do NOT use main.lockElements() because that toggles and shows popups.
    try {
      if (!this.main) return;

      // Remember whether hover tracking was active
      this._savedListenerAttached = !!this.main.listenerAttached;

      if (this.main.listenerAttached && this.main.mouseMoveHandler) {
        document.body.removeEventListener(
          'mousemove',
          this.main.mouseMoveHandler
        );
        this.main.listenerAttached = false;
      }
    } catch (e) {}
  }

  _unfreezeSelection() {
    try {
      if (!this.main) return;

      // Only restore if it was attached before we froze it
      if (this._savedListenerAttached && !this.main.listenerAttached) {
        if (this.main.mouseMoveHandler) {
          document.body.addEventListener(
            'mousemove',
            this.main.mouseMoveHandler
          );
          this.main.listenerAttached = true;
        }
      }
    } catch (e) {}
    this._savedListenerAttached = null;
  }

  refreshItems(items, opts = {}) {
    if (!this._isOpen || !this._root) return;

    const animate = opts.animate !== undefined ? !!opts.animate : false;

    this._items = Array.isArray(items)
      ? items.slice(0, this.opts.maxItems)
      : [];
    if (this._items.length === 0) {
      this.close();
      return;
    }

    // Re-render buttons in-place (no close/open cycle)
    this._renderItemsIntoRoot(this._root);

    // Keep centered (and clamped) where it already is
    const clamped = this._clampCenter(this._centerX, this._centerY, this._root);
    this._centerX = clamped.x;
    this._centerY = clamped.y;
    this._root.style.left = this._centerX + 'px';
    this._root.style.top = this._centerY + 'px';

    // Optional: allow re-animating if explicitly requested (default false)
    if (animate) {
      try {
        this._root.classList.remove('open');
        requestAnimationFrame(
          () => this._root && this._root.classList.add('open')
        );
      } catch (e) {}
    }
  }

  _renderItemsIntoRoot(root) {
    if (!root) return;

    const oldBtns = root.querySelectorAll('.aardvark-radial-item');
    oldBtns.forEach((b) => b.remove());

    const n = this._items.length;
    if (n <= 0) return;

    // Start at 3:00 (Right) -> 0 degrees standard CSS
    const startAngle = 0;
    const step = 360 / n;

    for (let i = 0; i < n; i++) {
      const item = this._items[i];
      const angle = startAngle + step * i;
      const r = this.opts.radius;

      const btn = document.createElement('button');
      btn.className = 'aardvark-radial-item';
      btn.type = 'button';
      btn.setAttribute('data-style-exclude', '');

      const hotLabel = this._buildHotLabel(item);
      btn.appendChild(hotLabel);

      // Calculate position
      // Normalise angle to 0-360
      const norm = ((angle % 360) + 360) % 360;
      const isLeftSide = norm > 90 && norm < 270;

      btn.style.position = 'absolute';
      btn.style.left = '50%';
      btn.style.top = '50%';

      // Rotate container, Translate out, Rotate content back
      if (!isLeftSide) {
        btn.style.transform = `
        translate(-50%, -50%)
        rotate(${angle}deg)
        translateX(${r}px)
        translateX(50%)
      `;
      } else {
        // Flip logic for left side readability
        btn.style.transform = `
        translate(-50%, -50%)
        rotate(${angle - 180}deg)
        translateX(-${r}px)
        translateX(-50%)
      `;
      }

      if (item && item.title) btn.title = String(item.title);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const keepOpen = !!(item && item.keepOpen);

        try {
          if (item && typeof item.onClick === 'function') item.onClick();
        } catch (err) {
          console.error(err);
        }

        if (!keepOpen) {
          this.close();
          return;
        }

        // Refresh for keepOpen
        try {
          if (this.main && typeof this.main._buildRadialItems === 'function') {
            this.refreshItems(this.main._buildRadialItems(), {
              animate: false,
            });
          }
        } catch (e2) {}
      });

      root.appendChild(btn);
    }
  }

  getCenter() {
    return { x: this._centerX, y: this._centerY };
  }

  _renderItems() {
    if (!this._root) return;

    // Remove any existing items (leave dot + ring intact)
    const old = this._root.querySelectorAll('.aardvark-radial-item');
    old.forEach((n) => n.remove());

    const n = this._items.length;
    if (n === 0) return;

    const startAngle = -90; // top
    const step = 360 / n;

    for (let i = 0; i < n; i++) {
      const item = this._items[i];
      const angle = startAngle + step * i;
      const r = this.opts.radius;

      const btn = document.createElement('button');
      btn.className = 'aardvark-radial-item';
      btn.type = 'button';
      btn.setAttribute('data-style-exclude', '');

      // Build integrated hot-letter label
      const hotLabel = this._buildHotLabel(item);
      btn.appendChild(hotLabel);

      // Determine Right/Left side to handle text direction
      const norm = ((angle % 360) + 360) % 360;
      const isLeftSide = norm > 90 && norm < 270;

      // Base styles for centering
      btn.style.position = 'absolute';
      btn.style.left = '50%';
      btn.style.top = '50%';

      if (!isLeftSide) {
        btn.style.transform = `
        translate(-50%, -50%)
        rotate(${angle}deg)
        translateX(${r}px)
        translateX(50%)
      `;
      } else {
        btn.style.transform = `
        translate(-50%, -50%)
        rotate(${angle - 180}deg)
        translateX(-${r}px)
        translateX(-50%)
      `;
      }

      if (item && item.title) btn.title = String(item.title);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const keepOpen = !!(item && item.keepOpen);
        try {
          if (item && typeof item.onClick === 'function') item.onClick();
        } catch (err) {
          console.error('[AardvarkRadialMenu] item error', err);
        }

        if (keepOpen) {
          // Rebuild items (e.g., Wider makes Narrower appear) without re-animating
          try {
            if (
              this.main &&
              typeof this.main._buildRadialItems === 'function'
            ) {
              this._items = this.main
                ._buildRadialItems()
                .slice(0, this.opts.maxItems);
              this._renderItems();
            }
          } catch (e2) {}
          try {
            // No animate-in: keep it open and stable
            if (this._root) this._root.classList.add('open');
          } catch (e3) {}
          return;
        }

        this.close();
      });

      this._root.appendChild(btn);
    }
  }

  setItemProvider(fn) {
    this._itemProvider = typeof fn === 'function' ? fn : null;
  }

  refresh(items) {
    if (!this._isOpen || !this._root) return;

    this._items = Array.isArray(items)
      ? items.slice(0, this.opts.maxItems)
      : [];

    if (this._items.length === 0) {
      this.close();
      return;
    }

    // Instant DOM update (no animation classes toggled)
    this._rebuildItems(this._root);

    // Recenter just in case
    const clamped = this._clampCenter(this._centerX, this._centerY, this._root);
    this._centerX = clamped.x;
    this._centerY = clamped.y;
    this._root.style.left = this._centerX + 'px';
    this._root.style.top = this._centerY + 'px';

    // Ensure we are open
    this._root.classList.add('open');
  }

  _rebuildItems(root) {
    // Alias to _renderItemsIntoRoot for consistency
    this._renderItemsIntoRoot(root);
  }

}