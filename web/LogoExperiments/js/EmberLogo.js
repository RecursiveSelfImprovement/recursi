class EmberLogo {
  constructor(brandEl, options = {}) {
    this.brand = brandEl;
    this.brandEl = brandEl;
    this.options = {
      isAwake: true,
      showSubtitle: false,
      emberCountMultiplier: 1.0,
      emberSpeedMultiplier: 1.0,
      emberSizeMultiplier: 1.0,
      outlineContainer: false,
      rainbowMode: false,
      coolMode: false,
      ...options,
    };

    this.isHovered = false;
    this.isAwake = this.options.isAwake;
    this.tickTimer = null;
    this._widthsMeasured = false;
    this.fadeWidths = { w1: 0, w2: 0, w3: 0 };
    this._pollInterval = null;
    this._entranceTimer = null;
    this._animFrame = null;
    this._listeners = {};

    this.colorCycle = 0;

    this._init();
  }

  _init() {
    EmberLogo._loadGoogleFont();
    this.applyLogoStyles();

    this.brand.dataset.animInitialized = 'true';
    this.brand.style.position = 'relative';
    this.brand.classList.add('ember-brand');

    // Recreate the exact original HTML structure — these outer spans are the
    // carefully-tuned measurement targets; do NOT alter their classes or nesting.
    this.brand.innerHTML =
      '<span class="p-keep" style="position:relative; z-index:2;">recur</span>' +
      '<span class="p-fade p-f1" style="position:relative; z-index:1;">sive </span>' +
      '<span class="p-keep" style="position:relative; z-index:2;">s</span>' +
      '<span class="p-fade p-f2" style="position:relative; z-index:1;">elf-</span>' +
      '<span class="p-keep" style="position:relative; z-index:2;">i</span>' +
      '<span class="p-fade p-f3" style="position:relative; z-index:1;">mprovement</span>' +
      '<span class="brand-subtitle">self-modifying runtime</span>';

    // Split each segment's text into individual .logo-char spans using makeElement,
    // preserving the exact original dataset.charIdx approach for the animate loop.
    const textSpans = this.brand.querySelectorAll('.p-keep, .p-fade');
    let globalCharIdx = 0;
    textSpans.forEach((span) => {
      const text = span.textContent;
      span.innerHTML = '';
      for (let i = 0; i < text.length; i++) {
        const charSpan = makeElement('span', { className: 'logo-char' }, text[i]);
        charSpan.dataset.charIdx = globalCharIdx++;
        charSpan.style.display = 'inline-block';
        charSpan.style.transition = 'margin 0.3s ease, opacity 0.3s ease';
        span.appendChild(charSpan);
      }
    });

    this._setupHoverTransitions();
    this._startTick();

    this._animFrame = requestAnimationFrame((t) => this._animate(t));
    this._updateStyle();
  }

  applyLogoStyles() {
    const cssParts = [
      EmberLogo.getBrandStyles(),
      EmberLogo.getHoverStyles(),
      EmberLogo.getAwakeStyles(),
      EmberLogo.getKeepStyles(),
      EmberLogo.getFadeStyles(),
      EmberLogo.getSubtitleStyles(),
      EmberLogo.getEmberAnimationStyles(),
      EmberLogo.getPulseAnimationStyles(),
      EmberLogo.getOutlineStyles(),
    ];
    applyCss(cssParts.join('\n'), 'EmberLogoStyles');
  }

  static getBrandStyles() {
    return `
      .ember-brand {
        position: relative;
        display: inline-flex;
        align-items: baseline;
        white-space: nowrap;
        font-family: 'Comfortaa', cursive, sans-serif;
        font-weight: 700;
        font-size: 32px;
        letter-spacing: -0.02em;
        color: #ffebd2;
        cursor: pointer;
        user-select: none;
      }
    `;
  }

  static getHoverStyles() { return `.ember-brand:hover {}`; }
  static getAwakeStyles() { return `.brand-awake {}`; }

  static getKeepStyles() {
    return `
      .p-keep {
        position: relative;
        z-index: 2;
        display: inline-block;
      }
    `;
  }

  static getFadeStyles() {
    return `
      .p-fade {
        display: inline-block;
        vertical-align: baseline;
        position: relative;
        z-index: 1;
        opacity: 0;
        white-space: pre;
      }
    `;
  }

  static getSubtitleStyles() {
    return `
      .brand-subtitle {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.05em;
        color: #7d7487;
        margin-left: 14px;
        text-transform: lowercase;
        opacity: 0.8;
        text-shadow: none !important;
        align-self: center;
        display: inline-block;
        pointer-events: none;
        transition: opacity 0.8s ease, max-width 0.8s ease;
      }
    `;
  }

  static getEmberAnimationStyles() {
    return `
      @keyframes emberFloat {
        0%   { transform: translate3d(0,0,0) scale(1); opacity: 0.8; }
        100% { transform: translate3d(var(--dx),var(--dy),0) scale(0.2); opacity: 0; }
      }
    `;
  }

  static getPulseAnimationStyles() {
    return `
      @keyframes brandPulse {
        0%   { transform: scale(1); }
        100% { transform: scale(1.02); }
      }
    `;
  }

  static getOutlineStyles() {
    return `
      .ember-brand.show-layout-outline {
        outline: 1.5px dashed #ff6b35;
        outline-offset: 6px;
        background: rgba(255,107,53,0.05);
        border-radius: 4px;
      }
    `;
  }

  _doCollapseAnimation() {
      const f1 = this.brand.querySelector('.p-f1');
      const f2 = this.brand.querySelector('.p-f2');
      const f3 = this.brand.querySelector('.p-f3');
      const subEl = this.brand.querySelector('.brand-subtitle');

      if (!f1 || !f2 || !f3) return;

      const trans = 'margin-right 1.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1)';
      [f1, f2, f3].forEach(f => { f.style.transition = trans; });
      void getComputedStyle(f1).transition;
      void getComputedStyle(f2).transition;
      void getComputedStyle(f3).transition;

      if (this._widthsMeasured) {
        const { w1, w2, w3 } = this.fadeWidths;
        f1.style.marginRight = `${-w1}px`;
        f2.style.marginRight = `${-w2}px`;
        f3.style.marginRight = `${-w3}px`;
      }
      f1.style.opacity = '0';
      f2.style.opacity = '0';
      f3.style.opacity = '0';

      if (subEl) {
        subEl.style.transition = 'opacity 0.8s ease, max-width 0.8s ease';
        if (this.options.showSubtitle) {
          subEl.style.opacity = '0.8';
          subEl.style.maxWidth = '300px';
        } else {
          subEl.style.opacity = '0';
          subEl.style.maxWidth = '0px';
        }
      }
    }

  _setupHoverTransitions() {
      const f1 = this.brand.querySelector('.p-f1');
      const f2 = this.brand.querySelector('.p-f2');
      const f3 = this.brand.querySelector('.p-f3');
      const subEl = this.brand.querySelector('.brand-subtitle');
      const keeps = this.brand.querySelectorAll('.p-keep');

      if (!f1 || !f2 || !f3) return;

      const trans = 'margin-right 1.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1)';

      [f1, f2, f3, ...keeps].forEach((f) => {
        f.style.display = 'inline-block';
        f.style.verticalAlign = 'baseline';
        f.style.whiteSpace = 'pre';
      });

      const performMeasurement = () => {
        if (this._widthsMeasured) return true;
        const w1 = f1.getBoundingClientRect().width;
        const w2 = f2.getBoundingClientRect().width;
        const w3 = f3.getBoundingClientRect().width;
        if (w1 < 5 || w2 < 5 || w3 < 5) return false;
        this.fadeWidths = { w1, w2, w3 };
        this._widthsMeasured = true;
        return true;
      };

      const expand = () => {
        this.isHovered = true;
        clearTimeout(this._entranceTimer);
        performMeasurement();
        if (this.options.rainbowMode) { this._doCollapseAnimation(); return; }
        [f1, f2, f3].forEach(f => { f.style.transition = trans; });
        f1.style.marginRight = '0px';
        f2.style.marginRight = '0px';
        f3.style.marginRight = '0px';
        f1.style.opacity = '1';
        f2.style.opacity = '1';
        f3.style.opacity = '1';
        if (subEl) {
          subEl.style.opacity = '0';
          subEl.style.maxWidth = '0px';
          subEl.style.overflow = 'hidden';
        }
      };

      const collapse = () => {
        this.isHovered = false;
        this._doCollapseAnimation();
      };

      this._cleanupHover();
      this._expandFn = expand;
      this._collapseFn = collapse;
      this.brand.addEventListener('mouseenter', this._expandFn);
      this.brand.addEventListener('mouseleave', this._collapseFn);

      [f1, f2, f3].forEach(f => { f.style.transition = 'none'; });
      void getComputedStyle(f1).transition;
      f1.style.marginRight = '0px';
      f2.style.marginRight = '0px';
      f3.style.marginRight = '0px';
      f1.style.opacity = '1';
      f2.style.opacity = '1';
      f3.style.opacity = '1';
      if (subEl) {
        subEl.style.transition = 'none';
        subEl.style.opacity = '0';
        subEl.style.maxWidth = '0px';
        subEl.style.overflow = 'hidden';
      }
      void getComputedStyle(f1).opacity;

      this._pollInterval = setInterval(() => {
        if (performMeasurement()) {
          clearInterval(this._pollInterval);
          this._entranceTimer = setTimeout(() => {
            if (!this.isHovered) {
              // Snap back to expanded (no transition) before collapsing - guards
              // against setOptions having clobbered state during entrance window.
              [f1, f2, f3].forEach(f => { f.style.transition = 'none'; });
              void getComputedStyle(f1).transition;
              f1.style.marginRight = '0px';
              f2.style.marginRight = '0px';
              f3.style.marginRight = '0px';
              f1.style.opacity = '1';
              f2.style.opacity = '1';
              f3.style.opacity = '1';
              void getComputedStyle(f1).opacity;
              this._doCollapseAnimation();
            }
          }, 1500);
        }
      }, 50);
    }

  _forceCollapse() {
    this._doCollapseAnimation();
  }

  _forceExpand() {
    const f1 = this.brand.querySelector('.p-f1');
    const f2 = this.brand.querySelector('.p-f2');
    const f3 = this.brand.querySelector('.p-f3');
    const subEl = this.brand.querySelector('.brand-subtitle');

    if (!f1 || !f2 || !f3) return;

    f1.style.marginRight = '0px';
    f2.style.marginRight = '0px';
    f3.style.marginRight = '0px';
    f1.style.opacity = '1';
    f2.style.opacity = '1';
    f3.style.opacity = '1';

    if (subEl) {
      subEl.style.opacity = '0';
      subEl.style.maxWidth = '0px';
    }
  }

  _cleanupHover() {
    clearTimeout(this._entranceTimer);
    if (this.brand) {
      if (this._expandFn) this.brand.removeEventListener('mouseenter', this._expandFn);
      if (this._collapseFn) this.brand.removeEventListener('mouseleave', this._collapseFn);
    }
  }

  generateDiagnosticReport() {
      const brand = this.brand;
      if (!brand) return 'No brand element found.';
      const comp = window.getComputedStyle(brand);
      const rect = brand.getBoundingClientRect();
      let report = `=== EMBERLOGO DIAGNOSTIC REPORT ===\n`;
      report += `Timestamp: ${new Date().toISOString()}\n`;
      report += `Bounds: ${rect.width.toFixed(1)}W x ${rect.height.toFixed(1)}H\n\n`;
      report += `[ options config ]\n`;
      report += `isAwake: ${this.isAwake}\n`;
      report += `showSubtitle: ${this.options.showSubtitle}\n`;
      report += `rainbowMode: ${this.options.rainbowMode}\n`;
      report += `coolMode: ${this.options.coolMode}\n`;
      report += `outlineContainer: ${this.options.outlineContainer}\n`;
      report += `emberCountMultiplier: ${this.options.emberCountMultiplier}\n`;
      report += `emberSpeedMultiplier: ${this.options.emberSpeedMultiplier}\n`;
      report += `emberSizeMultiplier: ${this.options.emberSizeMultiplier}\n\n`;
      report += `[ computed styles for .ember-brand ]\n`;
      report += `Font Family: ${comp.fontFamily}\n`;
      report += `Font Size: ${comp.fontSize}\n`;
      report += `Color: ${comp.color}\n`;
      report += `Display: ${comp.display}\n`;
      return report;
    }

  _updateStyle() {
    if (!this.brand) return;
    if (!this.options._fontSizeScaling) {
      this.brand.style.transform = `scale(${this.options.scale || 1})`;
      this.brand.style.transformOrigin = 'center center';
    } else {
      this.brand.style.transform = 'none';
    }
    if (this.options.isAwake || this.isAwake) {
      this.brand.classList.add('brand-awake');
    } else {
      this.brand.classList.remove('brand-awake');
    }
    if (this.options.outlineContainer) {
      this.brand.classList.add('show-layout-outline');
    } else {
      this.brand.classList.remove('show-layout-outline');
    }
  }

  setAwake(state) {
    this.isAwake = state;
    this._updateStyle();
    if (state) {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => this._createSparkle(), Math.random() * 300);
      }
    }
  }

  setOptions(newOpts) {
      Object.assign(this.options, newOpts);
      if (newOpts.isAwake !== undefined) this.setAwake(newOpts.isAwake);

      if (!this._widthsMeasured) {
        this._updateStyle();
        return;
      }

      if (this.options.rainbowMode) {
        this._doCollapseAnimation();
      } else {
        if (this.isHovered) this._forceExpand();
        else this._doCollapseAnimation();
      }

      this._updateStyle();
    }

  _animate(time) {
    if (!this.brand) return;

    const chars = this.brand.querySelectorAll('.logo-char');
    const isAwake = this.isAwake;
    const rainbow = this.options.rainbowMode;
    const cool = this.options.coolMode;

    const visibleChars = [];
    chars.forEach((char) => {
      const parent = char.parentElement;
      const isFade = parent.classList.contains('p-fade');
      const isVisible = !isFade || (parent.style.opacity !== '0' && parent.style.opacity !== '');
      if (isVisible) {
        visibleChars.push(char);
      } else {
        char.style.color = '';
        char.style.textShadow = '';
      }
    });

    visibleChars.forEach((char, visibleIndex) => {
      let targetColor = '';
      let targetTextShadow = '';

      if (rainbow && this.isHovered) {
        const hue = (time * 0.22 - visibleIndex * 20) % 360;
        targetColor = `hsl(${hue}, 100%, 80%)`;
        targetTextShadow = `0 0 10px hsl(${hue}, 100%, 55%), 0 0 22px hsl(${hue}, 100%, 42%)`;
      } else if (cool) {
        // Cool / underwater mode — blue-tinted letters with watery glow
        const wave = (Math.sin(time * 0.002 + visibleIndex * 0.4) + 1) / 2;
        const hue = 195 + wave * 25;
        const lightness = 72 + wave * 14;
        targetColor = `hsl(${hue}, 70%, ${lightness}%)`;
        const glowSize = 6 + wave * 10;
        targetTextShadow = `0 0 ${glowSize}px hsl(${hue}, 100%, 60%), 0 0 ${glowSize * 2}px hsl(${hue}, 100%, 40%), 0 0 ${glowSize * 3}px rgba(40,160,255,0.2)`;
      } else if (isAwake) {
        const letterBreath = (Math.sin(time * 0.0025 + visibleIndex * 0.35) + 1) / 2;
        targetColor = `hsl(30, 80%, ${82 + letterBreath * 8}%)`;
        const hue = 14 + letterBreath * 22;
        const glowSize = 5 + letterBreath * 10;
        targetTextShadow = `0 0 ${glowSize}px hsl(${hue}, 100%, 52%), 0 0 ${glowSize * 1.8}px hsl(${hue}, 100%, 38%), 0 0 ${glowSize * 2.8}px rgba(255,60,0,0.2)`;
      } else {
        const idleBreath = (Math.sin(time * 0.0012 + visibleIndex * 0.2) + 1) / 2;
        targetColor = `hsl(28, 70%, ${78 + idleBreath * 10}%)`;
        const glowSize = 6 + idleBreath * 5;
        targetTextShadow = `0 0 ${glowSize}px rgba(255,107,53,0.9), 0 0 ${glowSize * 2}px rgba(255,107,53,0.55), 0 0 ${glowSize * 3}px rgba(255,107,53,0.25)`;
      }

      char.style.color = targetColor;
      char.style.textShadow = targetTextShadow;
    });

    this._animFrame = requestAnimationFrame((t) => this._animate(t));
  }

  getSparkleColors(awake) {
    if (this.options.coolMode) {
      // Bubbles: whitish-blue, slightly translucent
      return [
        'rgba(200, 235, 255, 0.85)',
        'rgba(160, 210, 255, 0.75)',
        'rgba(220, 245, 255, 0.9)',
        'rgba(140, 195, 240, 0.7)',
        'rgba(255, 255, 255, 0.8)',
      ];
    }
    if (this.options.rainbowMode) {
      const hue = (this.colorCycle * 3) % 360;
      return [
        `hsl(${hue}, 100%, 65%)`,
        `hsl(${(hue + 60) % 360}, 100%, 60%)`,
        `hsl(${(hue + 120) % 360}, 100%, 55%)`,
        '#ffffff',
      ];
    }
    if (awake) {
      return ['#ffffff', '#ffeedd', '#ff3300', '#00ffff', '#cc33ff', '#33ff77', '#ff1155', '#ffcc00'];
    }
    return ['#ff6b35', '#c44d20', '#ffaa00', '#ff8844', '#ffffff'];
  }

  getSparkleSize(awake) {
    const sizeMult = this.options.emberSizeMultiplier || 1.0;
    const baseSize = awake ? 1.5 : 1.0;
    return (Math.random() * (awake ? 3.0 : 2.0) + baseSize) * sizeMult;
  }

  getSparkleOpacity(awake) {
    if (this.options.coolMode) return Math.random() * 0.4 + 0.3;
    return Math.random() * (awake ? 0.6 : 0.4) + 0.4;
  }

  getSparkleBoxShadow(size, color, awake) {
    if (this.options.coolMode) {
      // Bubble border: faint blue rim
      return `0 0 ${size * 1.5}px rgba(140,210,255,0.4), inset 0 0 ${size * 0.5}px rgba(255,255,255,0.2)`;
    }
    return `0 0 ${size * (awake ? 4 : 2.5)}px ${color}`;
  }

  _createSparkle() {
    if (!this.brand) return;

    const cool = this.options.coolMode;
    const awake = this.isAwake;
    const speedMult = (this.options.emberSpeedMultiplier || 1.0) * (awake ? 2.5 : 1);
    const size = this.getSparkleSize(awake);
    const colors = this.getSparkleColors(awake);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const opacity = this.getSparkleOpacity(awake);
    const boxShadow = this.getSparkleBoxShadow(size, color, awake);

    // Use makeElement for the particle
    const ember = makeElement('div', {
      style: {
        position: 'absolute',
        width: size + 'px',
        height: size + 'px',
        background: cool ? 'transparent' : color,
        borderRadius: '50%',
        pointerEvents: 'none',
        opacity: String(opacity),
        boxShadow: cool
          ? `0 0 ${size * 1.8}px rgba(160,215,255,0.5), inset 0 0 ${size * 0.5}px rgba(255,255,255,0.3), 0 0 0 ${Math.max(0.5, size * 0.12)}px rgba(180,225,255,0.25)`
          : boxShadow,
        zIndex: Math.random() > 0.5 ? '10' : '-1',
        // Bubble fill for cool mode: radial gradient
        backgroundImage: cool
          ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.6) 0%, ${color} 45%, rgba(100,180,255,0.1) 100%)`
          : 'none',
      },
    });

    const rect = this.brand.getBoundingClientRect();
    const startX = Math.random() * rect.width;
    const startY = Math.random() * rect.height * 0.7 + rect.height * 0.1;

    ember.style.left = startX + 'px';
    ember.style.top = startY + 'px';

    let dx, dy, duration;

    if (cool) {
      // Bubbles drift upward more slowly, with gentle horizontal wobble
      dx = (Math.random() - 0.5) * 20 * speedMult;
      dy = (Math.random() * -30 - 10) * speedMult;
      duration = (Math.random() * 2.5 + 2.0) / (this.options.emberSpeedMultiplier || 1.0);
    } else {
      dx = (Math.random() - 0.5) * 50 * speedMult;
      dy = (Math.random() - 1) * 35 * speedMult - 10;
      duration = (Math.random() * 1.5 + (awake ? 0.5 : 1.5)) / (this.options.emberSpeedMultiplier || 1.0);
    }

    ember.style.setProperty('--dx', dx + 'px');
    ember.style.setProperty('--dy', dy + 'px');
    ember.style.animation = `emberFloat ${duration}s cubic-bezier(0.25, 1, 0.5, 1) forwards`;

    this.brand.appendChild(ember);

    setTimeout(() => { if (ember.parentNode) ember.remove(); }, duration * 1000);
  }

  _startTick() {
    const tick = () => {
      if (!this.brand) return;

      this.colorCycle++;
      const countMult = this.options.emberCountMultiplier || 1.0;
      const spawnChance = countMult;

      const spawn = () => {
        if (Math.random() < spawnChance) this._createSparkle();
      };

      if (this.isAwake) {
        spawn();
        if (Math.random() > 0.5) spawn();
        this.tickTimer = setTimeout(tick, 50 + Math.random() * 100);
      } else if (this.isHovered) {
        spawn();
        this.tickTimer = setTimeout(tick, 150 + Math.random() * 200);
      } else {
        if (Math.random() > 0.2) spawn();
        if (Math.random() > 0.7) spawn();
        this.tickTimer = setTimeout(tick, 300 + Math.random() * 500);
      }
    };
    tick();
  }

  destroy() {
    clearInterval(this._pollInterval);
    clearTimeout(this._entranceTimer);
    clearTimeout(this.tickTimer);
    cancelAnimationFrame(this._animFrame);
    this._cleanupHover();
    this.brand = null;
    this.brandEl = null;
  }

  static _loadGoogleFont() {
    const fontId = 'GoogleFontComfortaa';
    if (!document.getElementById(fontId)) {
      const link = makeElement('link', {
        id: fontId,
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&display=swap',
      });
      document.head.appendChild(link);
    }
  }

  // ── Floating panel factory ─────────────────────────────────────────────
  static createFloatingPanel(container, logoOptions = {}) {
    EmberLogo._loadGoogleFont();

    const shell = makeElement('div', {
      className: 'ebl-shell',
      style: {
        position: 'absolute',
        display: 'inline-block',
        pointerEvents: 'none',
        left: '8px',
        top: '8px',
        zIndex: '9000',
        overflow: 'visible',
      },
    });

    const dragZone = makeElement('div', {
      className: 'ebl-drag-zone',
      style: {
        position: 'relative',
        pointerEvents: 'auto',
        cursor: 'grab',
        padding: '8px 14px 8px 30px',
        borderRadius: '14px',
        background: `rgba(10,10,14,${logoOptions.bgOpacity ?? 0})`,
        transition: 'background 0.3s ease',
        overflow: 'visible',
        boxSizing: 'border-box',
        userSelect: 'none',
        display: 'block',
        width: '160px',
      },
    });

    // ── 3-dot hamburger ──
    const hamburger = makeElement('div', {
      className: 'ebl-hamburger',
      style: {
        position: 'absolute',
        top: '50%',
        left: '7px',
        transform: 'translateY(-50%)',
        width: '16px',
        height: '18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        cursor: 'pointer',
        opacity: '0',
        transition: 'opacity 0.18s ease',
        zIndex: '30',
        pointerEvents: 'auto',
      },
    });

    const dotEls = [0, 1, 2].map(() => {
      const dot = makeElement('div', {
        style: {
          width: '3px',
          height: '3px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.38)',
          transition: 'background 0.15s',
          pointerEvents: 'none',
          flexShrink: '0',
        },
      });
      hamburger.appendChild(dot);
      return dot;
    });

    const tintDots = (on) => dotEls.forEach(d => {
      d.style.background = on ? 'rgba(255,120,60,0.9)' : 'rgba(255,255,255,0.38)';
    });

    // ── Menu panel ──
    const menuPanel = makeElement('div', {
      style: {
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: '0px',
        minWidth: '170px',
        background: 'rgba(7,7,11,0.88)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderRadius: '11px',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '5px',
        zIndex: '200',
        display: 'none',
        flexDirection: 'column',
        gap: '2px',
        boxShadow: '0 10px 36px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.04) inset',
        fontFamily: "'Comfortaa', cursive, sans-serif",
        pointerEvents: 'auto',
      },
    });

    let menuOpen = false;
    const openMenu = () => { menuOpen = true; menuPanel.style.display = 'flex'; tintDots(true); };
    const closeMenu = () => { menuOpen = false; menuPanel.style.display = 'none'; tintDots(false); };
    const toggleMenu = () => menuOpen ? closeMenu() : openMenu();

    hamburger.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });

    const outsideHandler = (e) => {
      if (menuOpen && !menuPanel.contains(e.target) && !hamburger.contains(e.target)) closeMenu();
    };
    document.addEventListener('click', outsideHandler);

    // Menu item factory
    const makeItem = (label, onClick, opts = {}) => {
      const el = makeElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 10px',
          borderRadius: '7px',
          cursor: 'pointer',
          color: opts.danger ? 'rgba(255,110,70,0.9)' : 'rgba(255,255,255,0.8)',
          fontSize: '12px',
          fontFamily: "'Comfortaa', cursive, sans-serif",
          fontWeight: '600',
          letterSpacing: '0.01em',
          userSelect: 'none',
          gap: '10px',
          transition: 'background 0.1s',
        },
      }, makeElement('span', {}, label));

      let track, knob, _on = opts.toggleDefault || false;
      if (opts.isToggle) {
        track = makeElement('div', {
          style: {
            width: '28px',
            height: '15px',
            borderRadius: '8px',
            flexShrink: '0',
            background: _on ? 'rgba(255,107,53,0.75)' : 'rgba(255,255,255,0.12)',
            transition: 'background 0.2s',
            position: 'relative',
          },
        });
        knob = makeElement('div', {
          style: {
            position: 'absolute',
            top: '2px',
            left: _on ? '15px' : '2px',
            width: '11px',
            height: '11px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            transition: 'left 0.2s',
          },
        });
        track.appendChild(knob);
        el.appendChild(track);
        el.setToggle = (val) => {
          _on = val;
          track.style.background = val ? 'rgba(255,107,53,0.75)' : 'rgba(255,255,255,0.12)';
          knob.style.left = val ? '15px' : '2px';
        };
      }

      el.addEventListener('mouseenter', () => { el.style.background = 'rgba(255,255,255,0.065)'; });
      el.addEventListener('mouseleave', () => { el.style.background = 'transparent'; });
      el.addEventListener('click', (e) => { e.stopPropagation(); onClick(el); });
      return el;
    };

    // ── Warm / Cool toggle row ──
    const makeVibeRow = (currentCool, onWarm, onCool) => {
      const row = makeElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          padding: '4px 10px 6px',
          gap: '6px',
        },
      }, makeElement('span', {
        style: {
          fontSize: '11px',
          color: 'rgba(255,255,255,0.45)',
          fontFamily: "'Comfortaa', cursive, sans-serif",
          fontWeight: '600',
          letterSpacing: '0.04em',
          flexShrink: '0',
          marginRight: '2px',
        },
      }, 'Vibe'));

      const makeVibeBtn = (label, isWarm, isActive) => {
        const color = isWarm ? '#ff8c42' : '#4ab3e8';
        const bgActive = isWarm ? 'rgba(255,120,50,0.22)' : 'rgba(60,170,230,0.22)';
        const borderActive = isWarm ? 'rgba(255,120,50,0.55)' : 'rgba(60,170,230,0.55)';
        const btn = makeElement('div', {
          style: {
            flex: '1',
            textAlign: 'center',
            padding: '5px 4px',
            borderRadius: '7px',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: "'Comfortaa', cursive, sans-serif",
            fontWeight: '700',
            color,
            background: isActive ? bgActive : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isActive ? borderActive : 'rgba(255,255,255,0.08)'}`,
            transition: 'background 0.15s, border-color 0.15s',
            userSelect: 'none',
            letterSpacing: '0.03em',
          },
        }, label);
        btn._setActive = (active) => {
          btn.style.background = active ? bgActive : 'rgba(255,255,255,0.04)';
          btn.style.borderColor = active ? borderActive : 'rgba(255,255,255,0.08)';
        };
        return btn;
      };

      const warmBtn = makeVibeBtn('☀ warm', true, !currentCool);
      const coolBtn = makeVibeBtn('❄ cool', false, currentCool);

      warmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        warmBtn._setActive(true);
        coolBtn._setActive(false);
        onWarm();
      });
      coolBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        warmBtn._setActive(false);
        coolBtn._setActive(true);
        onCool();
      });

      row.appendChild(warmBtn);
      row.appendChild(coolBtn);
      row._warmBtn = warmBtn;
      row._coolBtn = coolBtn;
      return row;
    };

    const brandEl = makeElement('div', {
      style: { display: 'inline-block', overflow: 'visible', verticalAlign: 'middle' },
    });

    dragZone.appendChild(hamburger);
    dragZone.appendChild(brandEl);
    dragZone.appendChild(menuPanel);
    shell.appendChild(dragZone);
    container.appendChild(shell);

    // ResizeObserver keeps dragZone width matching brand width
    const ro = new ResizeObserver(() => {
      const bw = brandEl.getBoundingClientRect().width;
      if (bw > 10) dragZone.style.width = `${bw + 44}px`;
    });
    ro.observe(brandEl);

    // ── Drag ──
    let dragState = null;
    dragZone.addEventListener('mousedown', (e) => {
      if (e.target.closest('.ebl-hamburger') || menuPanel.contains(e.target)) return;
      e.preventDefault();
      closeMenu();
      dragZone.style.cursor = 'grabbing';
      dragState = {
        sx: e.clientX, sy: e.clientY,
        ol: parseFloat(shell.style.left) || 0,
        ot: parseFloat(shell.style.top) || 0,
      };
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragState) return;
      shell.style.left = `${dragState.ol + e.clientX - dragState.sx}px`;
      shell.style.top  = `${dragState.ot + e.clientY - dragState.sy}px`;
    });
    window.addEventListener('mouseup', () => {
      if (!dragState) return;
      dragState = null;
      dragZone.style.cursor = 'grab';
    });

    dragZone.addEventListener('mouseenter', () => {
      hamburger.style.opacity = '1';
      const op = logoOptions.bgOpacity ?? 0;
      if (op < 0.08) dragZone.style.background = 'rgba(10,10,14,0.10)';
    });
    dragZone.addEventListener('mouseleave', () => {
      if (!menuOpen) hamburger.style.opacity = '0';
      const op = logoOptions.bgOpacity ?? 0;
      dragZone.style.background = `rgba(10,10,14,${op})`;
    });

    // ── Logo instance ──
    const logo = new EmberLogo(brandEl, {
      showSubtitle: false,
      isAwake: true,
      ...logoOptions,
      scale: 1.0,
      _fontSizeScaling: true,
    });

    logo._shell = shell;
    logo._listeners = logo._listeners || {};
    logo._currentScale = logoOptions.scale ?? 1.0;

    const scaleTarget = logoOptions.scale ?? 1.0;
    const pollBrand = setInterval(() => {
      const brand = brandEl.querySelector('.ember-brand');
      if (!brand) return;
      clearInterval(pollBrand);
      brand.style.fontSize = `${32 * scaleTarget}px`;
      logo._currentScale = scaleTarget;
      brand.addEventListener('mouseenter', () => logo._emit('expand', {}));
      brand.addEventListener('mouseleave', () => logo._emit('collapse', {}));
    }, 20);
    setTimeout(() => clearInterval(pollBrand), 2000);

    // ── Build menu items ──
    const awakeItem = makeItem(
      'Awake pulse',
      (item) => {
        const next = !logo.isAwake;
        logo.setAwake(next);
        item.setToggle(next);
        logo._emit('awake', { isAwake: next });
      },
      { isToggle: true, toggleDefault: logoOptions.isAwake !== false }
    );

    const subtitleItem = makeItem(
      'Show subtitle',
      (item) => {
        const next = !logo.options.showSubtitle;
        logo.setOptions({ showSubtitle: next });
        item.setToggle(next);
        logo._emit('subtitle', { showSubtitle: next });
      },
      { isToggle: true, toggleDefault: logoOptions.showSubtitle || false }
    );

    const rainbowItem = makeItem(
      'Rainbow mode',
      (item) => {
        const next = !logo.options.rainbowMode;
        logo.setOptions({ rainbowMode: next });
        item.setToggle(next);
        logo._emit('rainbow', { rainbowMode: next });
      },
      { isToggle: true, toggleDefault: logoOptions.rainbowMode || false }
    );

    // ── Vibe row (warm/cool) ──
    const vibeRow = makeVibeRow(
      logoOptions.coolMode || false,
      () => {
        logo.setOptions({ coolMode: false });
        logo._emit('vibe', { coolMode: false });
      },
      () => {
        logo.setOptions({ coolMode: true });
        logo._emit('vibe', { coolMode: true });
      }
    );

    const separator = makeElement('div', {
      style: {
        height: '1px',
        background: 'rgba(255,255,255,0.06)',
        margin: '3px 4px',
      },
    });

    const removeItem = makeItem(
      'Remove',
      () => {
        closeMenu();
        document.removeEventListener('click', outsideHandler);
        ro.disconnect();
        logo._emit('close', {});
        logo.destroy();
        shell.remove();
        if (typeof logoOptions.onClose === 'function') logoOptions.onClose();
      },
      { danger: true }
    );

    menuPanel.appendChild(awakeItem);
    menuPanel.appendChild(subtitleItem);
    menuPanel.appendChild(rainbowItem);
    menuPanel.appendChild(vibeRow);
    menuPanel.appendChild(separator);
    menuPanel.appendChild(removeItem);

    // ── Exposed methods ──
    logo.setScale = function(s) {
      this._currentScale = s;
      const brand = brandEl.querySelector('.ember-brand');
      if (brand) brand.style.fontSize = `${32 * s}px`;
    }.bind(logo);

    logo._syncRainbowMenuItem = (val) => rainbowItem.setToggle(val);
    logo._syncVibeButtons = (cool) => {
      vibeRow._warmBtn._setActive(!cool);
      vibeRow._coolBtn._setActive(cool);
    };

    logo._setBgOpacity = (op) => {
      logoOptions.bgOpacity = op;
      dragZone.style.background = `rgba(10,10,14,${op})`;
    };

    return logo;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  setScale(s) {
    this._currentScale = s;
    const brand = this.brandEl.querySelector('.ember-brand');
    if (brand) brand.style.fontSize = `${32 * s}px`;
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  }

  off(event, fn) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
    return this;
  }

  getState() {
    return {
      scale: this._currentScale ?? 1.0,
      rainbowMode: this.options.rainbowMode,
      coolMode: this.options.coolMode,
      isAwake: this.isAwake,
      emberCountMultiplier: this.options.emberCountMultiplier,
      emberSpeedMultiplier: this.options.emberSpeedMultiplier,
      emberSizeMultiplier: this.options.emberSizeMultiplier,
      showSubtitle: this.options.showSubtitle,
      outlineContainer: this.options.outlineContainer,
    };
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => { try { fn(data); } catch(_) {} });
  }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 1148,
  "provides": [
    "EmberLogo"
  ]
}
recursi-meta */
