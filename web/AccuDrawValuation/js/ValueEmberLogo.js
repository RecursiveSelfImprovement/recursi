class ValueEmberLogo {
    constructor(element, options = {}) {
      this.element = element;
      this.options = {
        isAwake: true,
        emberCountMultiplier: 0.4,
        emberSpeedMultiplier: 0.3,
        emberSizeMultiplier: 0.4,
        rainbowMode: false,
        ...options,
      };

      this.isHovered = false;
      this.isAwake = this.options.isAwake;
      this.tickTimer = null;
      this._animFrame = null;
      this.colorCycle = 0;
      this.charSpans = [];

      this._init();
    }

    _init() {
      ValueEmberLogo._loadGoogleFont();
      this.applyStyles();

      const text = this.element.textContent || "$2.3 Billion";
      this.element.innerHTML = "";
      
      this.element.style.fontFamily = "'Comfortaa', cursive, sans-serif";
      this.element.style.fontWeight = "700";
      this.element.style.position = "relative";
      this.element.style.display = "inline-flex";
      this.element.style.alignItems = "baseline";
      this.element.style.whiteSpace = "nowrap";
      this.element.style.cursor = "pointer";
      this.element.style.userSelect = "none";
      this.element.style.overflow = "visible";

      for (let i = 0; i < text.length; i++) {
        const charSpan = document.createElement('span');
        if (text[i] === ' ') {
          charSpan.innerHTML = '&nbsp;';
        } else {
          charSpan.textContent = text[i];
        }
        charSpan.className = 'logo-char';
        charSpan.style.display = 'inline-block';
        charSpan.style.transition = 'margin 0.3s ease, opacity 0.3s ease';
        this.element.appendChild(charSpan);
        this.charSpans.push(charSpan);
      }

      this._setupHover();
      this._startTick();

      this._animFrame = requestAnimationFrame((t) => this._animate(t));
    }

    applyStyles() {
      applyCss(`
        @keyframes valueEmberFloat {
          0%   { transform: translate3d(0,0,0) scale(1); opacity: 0.8; }
          100% { transform: translate3d(var(--dx),var(--dy),0) scale(0.2); opacity: 0; }
        }
      `, 'ValueEmberLogoStyles');
    }

    _setupHover() {
      this.element.addEventListener('mouseenter', () => {
        this.isHovered = true;
        for (let i = 0; i < 5; i++) {
          this._createSparkle();
        }
      });
      this.element.addEventListener('mouseleave', () => {
        this.isHovered = false;
      });
    }

    _createSparkle() {
      if (!this.element) return;

      const awake = this.isAwake || this.isHovered;
      const speedMult = this.options.emberSpeedMultiplier * (awake ? 2.5 : 1);
      const sizeMult = this.options.emberSizeMultiplier;
      const baseSize = awake ? 1.5 : 1.0;
      const size = (Math.random() * (awake ? 3.0 : 2.0) + baseSize) * sizeMult;

      const isLight = !!this.element.closest('.theme-light');
      let colors;
      if (isLight) {
        colors = ['#d32f2f', '#e64a19', '#f57c00', '#e65100', '#f59e0b', '#b71c1c'];
      } else {
        colors = ['#ff6b35', '#c44d20', '#ffaa00', '#ff8844', '#ffffff'];
        if (awake) {
          colors = ['#ffffff', '#ffeedd', '#ff3300', '#00ffff', '#cc33ff', '#33ff77', '#ff1155', '#ffcc00'];
        }
      }
      if (this.options.rainbowMode) {
        const hue = (this.colorCycle * 3) % 360;
        colors = [`hsl(${hue}, 100%, 65%)`, `hsl(${(hue + 60) % 360}, 100%, 60%)`, '#ffffff'];
      }

      const color = colors[Math.floor(Math.random() * colors.length)];
      const opacity = Math.random() * (awake ? 0.6 : 0.4) + 0.4;
      const boxShadow = isLight
        ? `0 0 ${size * 2}px ${color}`
        : `0 0 ${size * (awake ? 4 : 2.5)}px ${color}`;

      const ember = document.createElement('div');
      Object.assign(ember.style, {
        position: 'absolute',
        width: size + 'px',
        height: size + 'px',
        background: color,
        borderRadius: '50%',
        pointerEvents: 'none',
        opacity: String(opacity),
        boxShadow: boxShadow,
        zIndex: '10'
      });

      const rect = this.element.getBoundingClientRect();
      const startX = Math.random() * rect.width;
      const startY = Math.random() * rect.height * 0.7 + rect.height * 0.1;

      ember.style.left = startX + 'px';
      ember.style.top = startY + 'px';

      const dx = (Math.random() - 0.5) * 45 * speedMult;
      const dy = (Math.random() - 1) * 35 * speedMult - 12;
      const duration = (Math.random() * 1.5 + (awake ? 0.5 : 1.5)) / this.options.emberSpeedMultiplier;

      ember.style.setProperty('--dx', dx + 'px');
      ember.style.setProperty('--dy', dy + 'px');
      ember.style.animation = `valueEmberFloat ${duration}s cubic-bezier(0.25, 1, 0.5, 1) forwards`;

      this.element.appendChild(ember);

      setTimeout(() => { if (ember.parentNode) ember.remove(); }, duration * 1000);
    }

    _startTick() {
      const tick = () => {
        if (!this.element) return;

        this.colorCycle++;
        const spawnChance = this.options.emberCountMultiplier;

        const spawn = () => {
          if (Math.random() < spawnChance) this._createSparkle();
        };

        if (this.isAwake || this.isHovered) {
          spawn();
          if (Math.random() > 0.5) spawn();
          this.tickTimer = setTimeout(tick, 50 + Math.random() * 100);
        } else {
          if (Math.random() > 0.2) spawn();
          this.tickTimer = setTimeout(tick, 300 + Math.random() * 500);
        }
      };
      tick();
    }

    _animate(time) {
      if (!this.element || !this.charSpans.length) return;

      const isAwake = this.isAwake;
      const rainbow = this.options.rainbowMode;
      const isLight = !!this.element.closest('.theme-light');

      this.charSpans.forEach((char, idx) => {
        let targetColor = '';
        let targetTextShadow = '';

        if (rainbow) {
          const hue = (time * 0.22 - idx * 20) % 360;
          targetColor = `hsl(${hue}, 100%, 80%)`;
          targetTextShadow = `0 0 10px hsl(${hue}, 100%, 55%), 0 0 22px hsl(${hue}, 100%, 42%)`;
        } else if (isLight) {
          const letterBreath = (Math.sin(time * 0.0025 + idx * 0.35) + 1) / 2;
          targetColor = `hsl(16, 92%, ${34 + letterBreath * 8}%)`;
          const hue = 14 + letterBreath * 12;
          const glowSize = 3 + letterBreath * 4;
          targetTextShadow = `0 0 ${glowSize}px hsl(${hue}, 95%, 60%), 0 0 ${glowSize * 1.5}px rgba(224, 83, 0, 0.4)`;
        } else if (isAwake || this.isHovered) {
          const letterBreath = (Math.sin(time * 0.0025 + idx * 0.35) + 1) / 2;
          targetColor = `hsl(30, 80%, ${82 + letterBreath * 8}%)`;
          const hue = 14 + letterBreath * 22;
          const glowSize = 5 + letterBreath * 10;
          targetTextShadow = `0 0 ${glowSize}px hsl(${hue}, 100%, 52%), 0 0 ${glowSize * 1.8}px hsl(${hue}, 100%, 38%), 0 0 ${glowSize * 2.8}px rgba(255,60,0,0.2)`;
        } else {
          const idleBreath = (Math.sin(time * 0.0012 + idx * 0.2) + 1) / 2;
          targetColor = `hsl(28, 70%, ${78 + idleBreath * 10}%)`;
          const glowSize = 6 + idleBreath * 5;
          targetTextShadow = `0 0 ${glowSize}px rgba(255,107,53,0.9), 0 0 ${glowSize * 2}px rgba(255,107,53,0.55), 0 0 ${glowSize * 3}px rgba(255,107,53,0.25)`;
        }

        char.style.color = targetColor;
        char.style.textShadow = targetTextShadow;
      });

      this._animFrame = requestAnimationFrame((t) => this._animate(t));
    }

    destroy() {
      clearTimeout(this.tickTimer);
      cancelAnimationFrame(this._animFrame);
      this.element = null;
      this.charSpans = [];
    }
  
  static _loadGoogleFont() {
      const fontId = 'GoogleFontComfortaa';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700;900&display=swap';
        document.head.appendChild(link);
      }
    }
}