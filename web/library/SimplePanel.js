class SimplePanel {
  constructor(opts = {}) {
    this.opts = opts;

    // State
    this.isCollapsed = !!opts.isCollapsed;
    this.pulseEnabled = false;

    // Rotation controls
    this.rotationEnabled = !!opts.rotationEnabled; // global “allow rotation”
    this.rotateWhenPulsing = opts.rotateWhenPulsing !== false; // default true

    // Icons
    this.iconChoices = Array.isArray(opts.iconChoices)
      ? opts.iconChoices.slice()
      : null;
    this.icon = opts.icon || '🌀'; // ✅ cyclone default

    // DOM refs (set in _buildDom)
    this.root = null;
    this.header = null;
    this.iconEl = null;
    this.titleEl = null;
    this.body = null;

    // Drag
    this._drag = { active: false, dx: 0, dy: 0 };

    // Build
    this._ensureSimplePanelStyles();
    this._buildDom();
    this._applyIcon(this.icon);
    this._updateVisualState();
  }

  init() {
    this.injectStyles();
    this.createDOM();
  }

  injectStyles() {
    const css = `
    .simple-panel {
      all: initial; display: flex; flex-direction: column;
      position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
      width: 240px; background: #0a0a0a !important;
      border: 1px solid #333 !important; border-radius: 4px !important;
      z-index: 2147483647 !important; box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
      font-family: 'Courier New', Courier, monospace !important; cursor: grab;
      overflow: hidden; transition: width 0.2s ease;
    }
    .sp-header { 
      display: flex; align-items: center; gap: 8px; padding: 6px 10px;
      background: #1a1a1a; border-bottom: 1px solid #222;
    }
    .sp-icon { font-size: 14px; }
    .sp-title { font-size: 11px; font-weight: bold; color: #888 !important; flex: 1; text-transform: uppercase; letter-spacing: 1px; }
    .sp-status { font-size: 10px; color: #00ff00 !important; font-weight: bold; }
    
    /* Terminal Styling */
    .sp-log {
      display: none; height: 120px; overflow-y: auto; padding: 6px 10px;
      background: #050505; font-size: 10px; line-height: 1.3;
      color: #00ff00 !important; border-bottom: 1px solid #222;
    }
    .sp-log div { color: #00ff00 !important; border-bottom: 1px solid #111; padding: 2px 0; }
    .sp-log::-webkit-scrollbar { width: 4px; }
    .sp-log::-webkit-scrollbar-thumb { background: #333; }

    .sp-details { font-size: 9px; color: #666 !important; padding: 4px 10px; }
    .sp-actions { display: flex; gap: 4px; padding: 6px 10px; background: #111; justify-content: flex-end; }
    
    .sp-btn {
      background: #222 !important; border: 1px solid #444 !important; color: #aaa !important;
      padding: 2px 6px !important; border-radius: 2px !important; font-size: 9px !important;
      cursor: pointer !important; text-transform: uppercase;
    }
    .sp-btn:hover { background: #333 !important; color: #fff !important; }
    .sp-btn.primary { background: #004d40 !important; border-color: #00695c !important; color: #00ff00 !important; }

    /* Expand/Collapse Logic */
    .simple-panel.expanded { width: 400px; }
    .simple-panel.expanded .sp-log { display: block; }

    .sp-input-row { display: flex; padding: 6px 10px; background: #1a1a1a; gap: 5px; }
    .sp-input { 
      flex: 1; background: #000; border: 1px solid #333; color: #00ff00 !important; 
      font-size: 10px; padding: 3px 6px; font-family: inherit;
    }

    @keyframes sp-pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    .pulsing { animation: sp-pulse 1s infinite; }
    .spinning { display: inline-block; animation: sp-spin 2s linear infinite; }
    @keyframes sp-spin { 100% { transform: rotate(360deg); } }
  `;
    applyCss(css, 'SimplePanelStyles');
  }

  createDOM() {
    if (this.panel) return;

    this.iconElement = makeElement('div', { className: 'sp-icon' }, this.icon);
    this.statusText = makeElement('div', { className: 'sp-status' }, 'READY');
    const header = makeElement(
      'div',
      { className: 'sp-header' },
      this.iconElement,
      makeElement('div', { className: 'sp-title' }, this.title),
      this.statusText
    );

    this.logContainer = makeElement('div', { className: 'sp-log' });
    this.detailsText = makeElement(
      'div',
      { className: 'sp-details' },
      'System initialized.'
    );
    this.actionsContainer = makeElement('div', { className: 'sp-actions' });

    // Add the Toggle Button
    this.addAction('[+] Terminal', () => this.toggleExpand(), false);
    const toggleBtn = this.actionsContainer.lastChild;
    toggleBtn.classList.add('sp-toggle-btn');

    this.panel = makeElement(
      'div',
      { className: 'simple-panel' },
      header,
      this.logContainer,
      this.detailsText,
      this.actionsContainer
    );

    this._makeDraggable(this.panel);
    document.body.appendChild(this.panel);
  }

  updateStatus(text, isSpinning = false) {
    if (this.statusText) this.statusText.textContent = text;
    if (this.iconElement) {
      if (isSpinning) this.iconElement.classList.add('spinning');
      else this.iconElement.classList.remove('spinning');
    }
  }

  addAction(label, callback, isPrimary = false) {
    const btn = makeElement(
      'button',
      {
        className: `sp-btn ${isPrimary ? 'primary' : ''}`,
        onclick: (e) => {
          e.stopPropagation();
          callback(e);
        },
      },
      label
    );
    this.actionsContainer.appendChild(btn);
  }

  toggleExpand(forceState) {
    this.expanded =
      typeof forceState === 'boolean' ? forceState : !this.expanded;
    if (this.panel) {
      if (this.expanded) this.panel.classList.add('expanded');
      else this.panel.classList.remove('expanded');

      // Update the Toggle Button text if it exists
      const btn = this.panel.querySelector('.sp-toggle-btn');
      if (btn)
        btn.textContent = this.expanded ? '[-] Terminal' : '[+] Terminal';
    }
  }

  setConnectedState() {
    const inputRow = this.panel
      ? this.panel.querySelector('.sp-input-row')
      : null;
    if (inputRow) inputRow.style.display = 'none';
    if (this.statusText) {
      this.statusText.style.display = 'block';
      this.statusText.textContent = 'Linked';
    }
    if (this.panel) {
      this.panel.style.borderColor = 'rgba(76, 175, 80, 0.5)';
    }
  }

  show() {
    if (this.panel) this.panel.style.display = 'flex';
  }

  hide() {
    if (this.panel) this.panel.style.display = 'none';
  }

  _makeDraggable(el) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    const onDown = (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();

      // Switch to absolute positioning on drag
      el.style.transform = 'none';
      el.style.left = rect.left + 'px';
      el.style.top = rect.top + 'px';

      initialLeft = rect.left;
      initialTop = rect.top;
      el.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = initialLeft + dx + 'px';
      el.style.top = initialTop + dy + 'px';
    };

    const onUp = () => {
      isDragging = false;
      if (el) el.style.cursor = 'grab';
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  pulse(active = true, color = null) {
    if (this.iconElement) {
      if (active) {
        this.iconElement.classList.add('pulsing');
        if (color) {
          this.iconElement.style.color = color;
          this.iconElement.style.filter = `drop-shadow(0 0 5px ${color})`;
          if (this.panel) this.panel.style.borderColor = color;
        }
      } else {
        this.iconElement.classList.remove('pulsing');
        this.iconElement.style.color = '';
        this.iconElement.style.filter = '';
        if (this.panel)
          this.panel.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      }
    }
  }

  hideInput() {
    const inputRow = this.panel
      ? this.panel.querySelector('.sp-input-row')
      : null;
    if (inputRow) inputRow.style.display = 'none';
    if (this.statusText) this.statusText.style.display = 'block';
  }

  showInput(currentValue, placeholder, onConfirm) {
    if (!this.panel) return;

    // Ensure the panel is visible and expanded to show the setup
    this.panel.style.display = 'flex';
    this.toggleExpand(true);

    // Hide the "Linked" or "Idle" text while typing the URL
    if (this.statusText) this.statusText.style.display = 'none';

    let inputRow = this.panel.querySelector('.sp-input-row');
    if (!inputRow) {
      const input = makeElement('input', {
        className: 'sp-input',
        type: 'text',
        value: currentValue,
        placeholder: placeholder || 'Enter URL...',
        style: {
          background: '#222',
          border: '1px solid #444',
          color: '#fff',
          padding: '4px 8px',
          fontSize: '11px',
          width: '140px',
          borderRadius: '4px',
        },
      });

      const goBtn = makeElement(
        'button',
        {
          className: 'sp-btn primary',
          style: { marginLeft: '5px', background: '#007acc' },
          onclick: (e) => {
            e.stopPropagation();
            if (onConfirm) onConfirm(input.value);
            // We don't hide the input row here; Teleporter.connect
            // will update the status and hide it once linked.
          },
        },
        'OK'
      );

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (onConfirm) onConfirm(input.value);
        }
      });

      inputRow = makeElement(
        'div',
        {
          className: 'sp-input-row',
          style: { display: 'flex', alignItems: 'center', marginTop: '5px' },
        },
        input,
        goBtn
      );

      // Insert into the header area
      const header = this.panel.querySelector('.sp-header');
      header.appendChild(inputRow);

      setTimeout(() => input.focus(), 50);
    } else {
      inputRow.style.display = 'flex';
      inputRow.querySelector('input').focus();
    }
  }

  setInfo(text) {
    if (this.detailsText) this.detailsText.textContent = text;
  }

  addLog(msg) {
    if (!this.logContainer) return;
    const line = makeElement('div', {}, `> ${msg}`);
    this.logContainer.appendChild(line);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
    // Keep log short
    while (this.logContainer.children.length > 20) {
      this.logContainer.removeChild(this.logContainer.firstChild);
    }
  }

  _buildDom() {
    // Root
    this.root = document.createElement('div');
    this.root.className = 'SimplePanel';

    // Header
    this.header = document.createElement('div');
    this.header.className = 'SimplePanel-header';

    // Icon (drag handle + dblclick collapse)
    this.iconEl = document.createElement('div');
    this.iconEl.className = 'SimplePanel-icon';
    this.iconEl.title = 'Double-click to collapse/expand';
    this.iconEl.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleCollapsed();
    });

    this.iconEl.addEventListener('click', (e) => {
      if (!this._getIconChoices().length) return;
      if (this._drag.active) return;
      this._cycleIcon();
    });

    // Title
    this.titleEl = document.createElement('div');
    this.titleEl.className = 'SimplePanel-title';
    this.titleEl.textContent = this.opts.title || 'Panel';

    this.header.appendChild(this.iconEl);
    this.header.appendChild(this.titleEl);

    // Body
    this.body = document.createElement('div');
    this.body.className = 'SimplePanel-body';

    // If caller provided content element/string, preserve (best-effort)
    if (this.opts.content instanceof HTMLElement) {
      this.body.appendChild(this.opts.content);
    } else if (typeof this.opts.content === 'string') {
      // Safe fallback: textContent.
      // If HTML was expected, caller should pass an Element constructed via makeElement.
      this.body.textContent = this.opts.content;
    }

    this.root.appendChild(this.header);
    this.root.appendChild(this.body);

    this._wireDragHandle(this.iconEl);

    if (this.opts.parent instanceof HTMLElement) {
      this.opts.parent.appendChild(this.root);
    }
  }

  _bindEvents() {
    // Double-click on icon toggles collapsed icon-only mode
    this._iconWrap.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleCollapsed();
    });

    // Draggable: drag from icon area (works in collapsed and normal)
    const dragHandle = this._iconWrap;

    dragHandle.addEventListener('pointerdown', (e) => {
      // only primary button / touch
      if (e.button != null && e.button !== 0) return;

      const r = this.el.getBoundingClientRect();
      this._drag.on = true;
      this._drag.dx = e.clientX - r.left;
      this._drag.dy = e.clientY - r.top;

      this.el.setPointerCapture?.(e.pointerId);
      this.el.classList.add('SimplePanel-dragging');
      e.preventDefault();
    });

    this.el.addEventListener('pointermove', (e) => {
      if (!this._drag.on) return;

      // position: fixed by default so it stays where you put it
      this.el.style.position = 'fixed';
      this.el.style.left = `${Math.round(e.clientX - this._drag.dx)}px`;
      this.el.style.top = `${Math.round(e.clientY - this._drag.dy)}px`;
      e.preventDefault();
    });

    this.el.addEventListener('pointerup', (e) => {
      if (!this._drag.on) return;
      this._drag.on = false;
      this.el.classList.remove('SimplePanel-dragging');
      try {
        this.el.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
      e.preventDefault();
    });

    this.el.addEventListener('pointercancel', (e) => {
      if (!this._drag.on) return;
      this._drag.on = false;
      this.el.classList.remove('SimplePanel-dragging');
      try {
        this.el.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
      e.preventDefault();
    });
  }

  _ensureStyles() {
    if (this._stylesInstalled) return;
    this._stylesInstalled = true;

    if (document.getElementById('SimplePanel-styles')) return;

    const style = document.createElement('style');
    style.id = 'SimplePanel-styles';
    style.textContent = `
    .SimplePanel{
      user-select:none;
      -webkit-user-select:none;
      border-radius:12px;
      backdrop-filter: blur(10px);
      background: rgba(30, 30, 40, 0.50);
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 10px 30px rgba(0,0,0,0.30);
      overflow: hidden;
      transform: translateZ(0);
    }
    .SimplePanel-header{
      display:flex;
      align-items:center;
      gap:10px;
      padding:10px;
    }
    .SimplePanel-iconWrap{
      width:40px;
      height:40px;
      border-radius:10px;
      display:flex;
      align-items:center;
      justify-content:center;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      cursor: grab;
      transform-origin: 50% 50%;
      will-change: transform, filter;
    }
    .SimplePanel-dragging .SimplePanel-iconWrap{ cursor: grabbing; }
    .SimplePanel-icon{
      font-size:22px;
      line-height:1;
      transform-origin: 50% 50%;
      display:block;
    }
    .SimplePanel-headerSpacer{ flex: 1 1 auto; }
    .SimplePanel-content{ padding: 10px; }

    /* Collapsed (icon-only) */
    .SimplePanel.is-collapsed{
      width:auto !important;
      height:auto !important;
    }
    .SimplePanel.is-collapsed .SimplePanel-header{ padding:8px; }
    .SimplePanel.is-collapsed .SimplePanel-content{ display:none !important; }

    /* Stronger pulse: scale + glow. strength is applied via CSS var. */
    .SimplePanel-iconWrap.is-pulsing{
      animation: SimplePanelPulse 900ms ease-in-out infinite;
      filter: drop-shadow(0 0 calc(10px * var(--spPulseStrength, 1)) rgba(255,255,255,0.20));
    }
    @keyframes SimplePanelPulse{
      0%   { transform: scale(1);    filter: drop-shadow(0 0 calc(10px * var(--spPulseStrength, 1)) rgba(255,255,255,0.15)); }
      50%  { transform: scale(calc(1 + 0.16 * var(--spPulseStrength, 1)));
             filter: drop-shadow(0 0 calc(22px * var(--spPulseStrength, 1)) rgba(255,255,255,0.28)); }
      100% { transform: scale(1);    filter: drop-shadow(0 0 calc(10px * var(--spPulseStrength, 1)) rgba(255,255,255,0.15)); }
    }
  `;
    document.head.appendChild(style);
  }

  setIcons(icons) {
    if (!Array.isArray(icons) || !icons.length) return;
    this._icons = icons.slice();
    if (!this._icons.includes('🌀')) this._icons.push('🌀');
    if (!this._icons.includes(this._icon)) this._icon = this._icons[0];
    this._syncIcon();
  }

  setIcon(icon) {
    this.icon = icon || '🌀';
    this._applyIcon(this.icon);
    this._updateVisualState();
  }

  toggleCollapsed(force) {
    if (typeof force === 'boolean') this.isCollapsed = force;
    else this.isCollapsed = !this.isCollapsed;
    this._updateVisualState();
  }

  _applyCollapsedState() {
    this.el.classList.toggle('is-collapsed', !!this._collapsed);
    // When collapsed, the panel should be basically “just the emoji + little rectangle”
    // This is already handled by CSS hiding .SimplePanel-content.
  }

  setPulse(enabled) {
    this.pulseEnabled = !!enabled;
    this._updateVisualState();
  }

  setRotation(on = true, opts = {}) {
    const { speedDegPerSec } = opts || {};
    this._rotateOn = !!on;
    if (typeof speedDegPerSec === 'number' && isFinite(speedDegPerSec)) {
      this._rotateSpeedDegPerSec = Math.max(10, Math.min(2000, speedDegPerSec));
    }
    this._syncAnimations();
  }

  setRotateWhenPulsing(enabled) {
    this.rotateWhenPulsing = !!enabled;
    this._updateVisualState();
  }

  _syncIcon() {
    if (!this._iconEl) return;
    this._iconEl.textContent = this._icon;
  }

  _syncAnimations() {
    if (!this._iconWrap) return;

    // Apply stronger pulse
    this._iconWrap.style.setProperty(
      '--spPulseStrength',
      String(this._pulseStrength ?? 1.0)
    );
    this._iconWrap.classList.toggle('is-pulsing', !!this._pulseOn);

    const shouldRotate =
      !!this._rotateOn || (this._rotateWhenPulsing && this._pulseOn);
    if (shouldRotate) this._startAnimLoop();
    else this._stopAnimLoop();
  }

  _startAnimLoop() {
    if (this._animRaf) return;
    this._lastTs = 0;
    const tick = (ts) => {
      if (!this._animRaf) return;

      if (!this._lastTs) this._lastTs = ts;
      const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
      this._lastTs = ts;

      const shouldRotate =
        !!this._rotateOn || (this._rotateWhenPulsing && this._pulseOn);
      if (shouldRotate && this._iconWrap) {
        this._rotationDeg =
          (this._rotationDeg + this._rotateSpeedDegPerSec * dt) % 360;
        // rotate the WRAPPER so the pulse scale still applies cleanly
        // pulse uses transform on iconWrap, so we need to combine transforms:
        // easiest: apply rotate on a child. But we made iconWrap the rotating target.
        // So instead, rotate the ICON itself, not the wrap.
        if (this._iconEl) {
          this._iconEl.style.transform = `rotate(${this._rotationDeg}deg)`;
        }
      }

      // If nothing is active anymore, shut down
      if (!shouldRotate) {
        this._stopAnimLoop();
        return;
      }

      this._animRaf = requestAnimationFrame(tick);
    };
    this._animRaf = requestAnimationFrame(tick);
  }

  _stopAnimLoop() {
    if (!this._animRaf) return;
    cancelAnimationFrame(this._animRaf);
    this._animRaf = 0;
    this._lastTs = 0;

    // reset rotation transform if rotation isn't enabled
    const shouldRotate =
      !!this._rotateOn || (this._rotateWhenPulsing && this._pulseOn);
    if (!shouldRotate && this._iconEl) this._iconEl.style.transform = '';
  }

  setRotationEnabled(enabled) {
    this.rotationEnabled = !!enabled;
    this._updateVisualState();
  }

  _applyIcon(icon) {
    if (!this.iconEl) return;
    this.iconEl.textContent = icon;
  }

  _cycleIcon() {
    const choices = this._getIconChoices();
    if (!choices.length) return;

    const cur = this.icon || '🌀';
    const i = choices.indexOf(cur);
    const next = choices[(i >= 0 ? i + 1 : 0) % choices.length];
    this.setIcon(next);
  }

  _getIconChoices() {
    // If user supplied, honor it.
    if (this.iconChoices && this.iconChoices.length) {
      // Ensure cyclone is always available even if they forgot it.
      if (!this.iconChoices.includes('🌀')) this.iconChoices.push('🌀');
      return this.iconChoices;
    }

    // Default set (includes cyclone, pencil is still here but not default)
    return ['🌀', '✏️', '⭐️', '🧠', '⚙️', '✨', '📌', '🔍', '🎛️'];
  }

  _updateVisualState() {
    if (!this.root) return;

    // Collapsed vs normal layout
    if (this.isCollapsed) {
      this.root.classList.add('SimplePanel-collapsed');
    } else {
      this.root.classList.remove('SimplePanel-collapsed');
    }

    // Stronger pulse (more visible)
    if (this.pulseEnabled) {
      this.iconEl?.classList.add('isPulsing');
    } else {
      this.iconEl?.classList.remove('isPulsing');
    }

    // Rotation:
    // - If rotationEnabled: always spin icon
    // - Else if rotateWhenPulsing: spin only while pulsing (nice default for 🌀)
    const shouldSpin =
      this.rotationEnabled || (this.rotateWhenPulsing && this.pulseEnabled);

    if (shouldSpin) {
      this.iconEl?.classList.add('isSpinning');
    } else {
      this.iconEl?.classList.remove('isSpinning');
    }
  }

  _wireDragHandle(handleEl) {
    if (!handleEl) return;

    const onDown = (e) => {
      // Only primary button
      if (e.button !== 0) return;

      const r = this.root.getBoundingClientRect();
      this._drag.active = true;
      this._drag.dx = e.clientX - r.left;
      this._drag.dy = e.clientY - r.top;

      // Make sure positioned
      const cs = getComputedStyle(this.root);
      if (cs.position === 'static') this.root.style.position = 'fixed';

      e.preventDefault();
    };

    const onMove = (e) => {
      if (!this._drag.active) return;
      const x = e.clientX - this._drag.dx;
      const y = e.clientY - this._drag.dy;
      this.root.style.left = `${Math.round(x)}px`;
      this.root.style.top = `${Math.round(y)}px`;
    };

    const onUp = () => {
      this._drag.active = false;
    };

    handleEl.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  _ensureSimplePanelStyles() {
    if (document.getElementById('SimplePanel-styles')) return;

    const style = document.createElement('style');
    style.id = 'SimplePanel-styles';
    style.textContent = `
    .SimplePanel{
      position: fixed;
      left: 24px;
      top: 24px;
      min-width: 220px;
      max-width: 520px;
      background: rgba(20, 20, 24, 0.72);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      color: rgba(255,255,255,0.92);
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.35);
      overflow: hidden;
      user-select: none;
    }

    .SimplePanel-header{
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.10);
    }

    .SimplePanel-icon{
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      font-size: 20px;
      line-height: 1;
      border-radius: 10px;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.12);
      cursor: grab;
      transform-origin: 50% 50%;
      will-change: transform, filter;
    }

    .SimplePanel-icon:active{
      cursor: grabbing;
    }

    .SimplePanel-title{
      font-size: 13px;
      opacity: 0.92;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .SimplePanel-body{
      padding: 12px;
      user-select: text;
    }

    /* Stronger pulse: bigger scale + visible glow */
    @keyframes SimplePanelPulse {
      0%   { transform: scale(1);    filter: drop-shadow(0 0 0 rgba(255,255,255,0.0)); }
      50%  { transform: scale(1.18); filter: drop-shadow(0 0 12px rgba(255,255,255,0.55)); }
      100% { transform: scale(1);    filter: drop-shadow(0 0 0 rgba(255,255,255,0.0)); }
    }
    .SimplePanel-icon.isPulsing{
      animation: SimplePanelPulse 0.9s ease-in-out infinite;
    }

    /* Spin (centered) */
    @keyframes SimplePanelSpin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .SimplePanel-icon.isSpinning{
      animation: SimplePanelSpin 0.9s linear infinite;
    }

    /* Combine spin + pulse when both are active */
    .SimplePanel-icon.isPulsing.isSpinning{
      animation:
        SimplePanelPulse 0.9s ease-in-out infinite,
        SimplePanelSpin 0.7s linear infinite;
    }

    /* Collapsed mode: emoji-only tiny pill */
    .SimplePanel.SimplePanel-collapsed{
      min-width: 0;
      width: auto;
      max-width: none;
      border-radius: 12px;
    }
    .SimplePanel.SimplePanel-collapsed .SimplePanel-header{
      padding: 8px;
      border-bottom: none;
    }
    .SimplePanel.SimplePanel-collapsed .SimplePanel-title{
      display: none;
    }
    .SimplePanel.SimplePanel-collapsed .SimplePanel-body{
      display: none;
    }
    .SimplePanel.SimplePanel-collapsed .SimplePanel-icon{
      width: 34px;
      height: 34px;
      font-size: 22px;
      border-radius: 12px;
    }
  `;
    document.head.appendChild(style);
  }

  addSelect(id, onChange) {
    if (!this.actionsContainer) return;

    // Create a wrapper for styling if needed, or just the select
    const select = makeElement('select', {
      className: 'sp-select',
      style: {
        background: '#222',
        color: '#aaa',
        border: '1px solid #444',
        fontSize: '10px',
        maxWidth: '100px',
        padding: '2px',
        marginLeft: '4px',
        cursor: 'pointer',
      },
      onchange: (e) => onChange(e.target.value),
    });

    // Store ref for updates
    if (!this._selects) this._selects = {};
    this._selects[id] = select;

    this.actionsContainer.insertBefore(
      select,
      this.actionsContainer.firstChild
    );
  }

  updateSelect(id, options, selectedValue) {
    if (!this._selects || !this._selects[id]) return;
    const select = this._selects[id];

    // Save current selection if not provided
    const currentVal =
      selectedValue !== undefined ? selectedValue : select.value;

    // Rebuild options without innerHTML
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }

    // Add placeholder
    select.appendChild(makeElement('option', { value: '' }, '-- Jump to --'));

    options.forEach((opt) => {
      const isSelected = opt.value === currentVal;
      select.appendChild(
        makeElement(
          'option',
          {
            value: opt.value,
            selected: isSelected,
          },
          opt.label
        )
      );
    });
  }


  

  
}
