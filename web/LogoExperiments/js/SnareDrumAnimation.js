class SnareDrumAnimation {
    // Static preloader reference to cache the video resource
    static preloadedVideo = null;

    static preload(url = 'drumroll.mp4') {
      const targetUrl = url.startsWith('http') || url.startsWith('/') ? url : this.getResolvedUrl(url);
      if (this.preloadedVideo) return;
      try {
        const video = document.createElement('video');
        video.style.position = 'fixed';
        video.style.bottom = '4px';
        video.style.right = '4px';
        video.style.width = '10px';
        video.style.height = '10px';
        video.style.opacity = '0.02';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-99999';
        video.src = targetUrl;
        video.preload = 'auto';
        video.muted = false;
        video.playsInline = true;
        video.load();
        document.body.appendChild(video);
        this.preloadedVideo = video;
      } catch (err) {
        console.warn('Preload failed:', err);
      }
    }

    constructor(options = {}) {
      this.options = {
        duration: 3000, // Hardcoded matching the 3-second drum roll climax
        soundUrl: 'drumroll.mp4',
        onComplete: null,
        accentColor: '#ff6b35',
        ...options
      };
      this.isPlaying = false;
      this.videoElement = null;
      this.animationFrame = null;
      this.startTime = null;
      this.lastLeftHitVal = 0;
      this.lastRightHitVal = 0;
      this.element = null;
    }

    // Precise centering using fixed positioning relative to viewport
    trigger(triggerEl) {
      if (this.isPlaying) return;
      this.isPlaying = true;

      if (!triggerEl) {
        triggerEl = document.body;
      }

      // Viewport relative coordinates (independent of scrolling containers)
      const rect = triggerEl.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;
      const buttonCenterY = rect.top + rect.height / 2;

      this.element = makeElement('div', {
        style: {
          position: 'fixed',
          left: `${buttonCenterX}px`,
          top: `${buttonCenterY}px`,
          width: '180px',
          height: '180px',
          zIndex: '100000',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%) scale(0.1)',
          transformOrigin: 'center center',
          opacity: '0',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }
      });

      this.element.innerHTML = this.getSvgContent();
      this.svg = this.element.querySelector('svg');

      document.body.appendChild(this.element);

      // Force style reflow
      void this.element.offsetHeight;

      // Calculate perfect slide-under destination
      const targetY = rect.bottom + 12 + 90; // center of the 180px drum under the button
      this.element.style.opacity = '1';
      this.element.style.top = `${targetY}px`;
      this.element.style.transform = 'translate(-50%, -50%) scale(1)';

      this.startAudio();

      this.startTime = performance.now();
      this.lastLeftHitVal = 0;
      this.lastRightHitVal = 0;
      
      this.animationFrame = requestAnimationFrame((t) => this.tick(t));
    }

    getSvgContent() {
      const accent = this.options.accentColor;
      return `
        <svg width="100%" height="100%" viewBox="0 0 500 500" style="overflow: visible;">
          <defs>
            <linearGradient id="chromeShell" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#4a5568" />
              <stop offset="15%" stop-color="#cbd5e0" />
              <stop offset="30%" stop-color="#718096" />
              <stop offset="50%" stop-color="#edf2f7" />
              <stop offset="70%" stop-color="#4a5568" />
              <stop offset="85%" stop-color="#e2e8f0" />
              <stop offset="100%" stop-color="#2d3748" />
            </linearGradient>
            <linearGradient id="chromeHoop" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#718096" />
              <stop offset="50%" stop-color="#edf2f7" />
              <stop offset="100%" stop-color="#4a5568" />
            </linearGradient>
            <radialGradient id="drumHead" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="80%" stop-color="#f7fafc" />
              <stop offset="100%" stop-color="#cbd5e0" />
            </radialGradient>
            <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(0,0,0,0.6)" />
              <stop offset="100%" stop-color="rgba(0,0,0,0)" />
            </radialGradient>
            <linearGradient id="stickGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#8a5a36" />
              <stop offset="50%" stop-color="#d7a15c" />
              <stop offset="100%" stop-color="#5c3a21" />
            </linearGradient>
          </defs>

          <!-- Drum Shadow -->
          <ellipse cx="250" cy="380" rx="140" ry="25" fill="url(#shadow)" />

          <!-- Snare Body -->
          <g id="drum-body">
            <!-- Cylinder -->
            <path d="M 120,200 L 120,310 A 130 35 0 0 0 380 310 L 380,200 A 130 35 0 0 1 120 200 Z" fill="url(#chromeShell)" />

            <!-- Dynamic Accent Stripe -->
            <path d="M 120,230 L 120,280 A 130 32 0 0 0 380 280 L 380,230 A 130 32 0 0 1 120 230 Z" fill="${accent}" opacity="0.85" />
            
            <!-- Steel Badge -->
            <rect x="238" y="244" width="24" height="18" rx="2" fill="url(#chromeHoop)" stroke="#1a202c" stroke-width="0.5" />
            <circle cx="250" cy="253" r="3" fill="#000" />

            <!-- Lugs -->
            <g transform="translate(150, 0)">
              <rect x="0" y="198" width="6" height="115" fill="url(#chromeHoop)" rx="1" />
              <rect x="-2" y="202" width="10" height="10" fill="#4a5568" rx="1" />
              <rect x="-2" y="296" width="10" height="10" fill="#4a5568" rx="1" />
            </g>
            <g transform="translate(200, 0)">
              <rect x="0" y="202" width="6" height="112" fill="url(#chromeHoop)" rx="1" />
              <rect x="-2" y="206" width="10" height="10" fill="#4a5568" rx="1" />
              <rect x="-2" y="294" width="10" height="10" fill="#4a5568" rx="1" />
            </g>
            <g transform="translate(294, 0)">
              <rect x="0" y="202" width="6" height="112" fill="url(#chromeHoop)" rx="1" />
              <rect x="-2" y="206" width="10" height="10" fill="#4a5568" rx="1" />
              <rect x="-2" y="294" width="10" height="10" fill="#4a5568" rx="1" />
            </g>
            <g transform="translate(344, 0)">
              <rect x="0" y="198" width="6" height="115" fill="url(#chromeHoop)" rx="1" />
              <rect x="-2" y="202" width="10" height="10" fill="#4a5568" rx="1" />
              <rect x="-2" y="296" width="10" height="10" fill="#4a5568" rx="1" />
            </g>

            <path d="M 118,310 A 132 36 0 0 0 382 310 L 382,316 A 132 36 0 0 1 118 316 Z" fill="url(#chromeHoop)" stroke="#2d3748" stroke-width="0.5" />
            <path d="M 118,200 A 132 36 0 0 0 382 200 L 382,207 A 132 36 0 0 1 118 207 Z" fill="url(#chromeHoop)" stroke="#2d3748" stroke-width="0.5" />
            <ellipse cx="250" cy="200" rx="132" ry="36" fill="none" stroke="url(#chromeHoop)" stroke-width="4" />

            <ellipse id="drum-head-surface" cx="250" cy="200" rx="128" ry="33" fill="url(#drumHead)" />

            <!-- Real-time Hit Ripples -->
            <ellipse id="drum-ripple-left" cx="215" cy="200" rx="0" ry="0" fill="none" stroke="#fff" stroke-width="3" opacity="0" pointer-events="none" />
            <ellipse id="drum-ripple-right" cx="285" cy="200" rx="0" ry="0" fill="none" stroke="#fff" stroke-width="3" opacity="0" pointer-events="none" />
            <ellipse id="drum-ripple-climax" cx="250" cy="200" rx="0" ry="0" fill="none" stroke="#ffd700" stroke-width="5" opacity="0" pointer-events="none" />
          </g>

          <!-- Drumsticks -->
          <g id="stick-left-container" transform="translate(0, 0)">
            <g id="stick-left" style="transform-origin: 90px 90px; transition: transform 0.05s ease-out;">
              <path d="M 90,95 L 212,196 A 4 4 0 0 0 218,191 L 96,90 Z" fill="url(#stickGrad)" />
              <ellipse cx="215" cy="194" rx="4.5" ry="3.5" fill="#f7fafc" opacity="0.9" />
            </g>
          </g>

          <g id="stick-right-container" transform="translate(0, 0)">
            <g id="stick-right" style="transform-origin: 410px 90px; transition: transform 0.05s ease-out;">
              <path d="M 410,95 L 288,196 A 4 4 0 0 1 282,191 L 404,90 Z" fill="url(#stickGrad)" />
              <ellipse cx="285" cy="194" rx="4.5" ry="3.5" fill="#f7fafc" opacity="0.9" />
            </g>
          </g>
        </svg>
      `;
    }

    startAudio() {
      const filename = this.options.soundUrl || 'drumroll.mp4';
      const resolvedUrl = filename.startsWith('http') || filename.startsWith('/') ? filename : this.constructor.getResolvedUrl(filename);

      // Dual Fallback Audio strategy:
      // Try HTML5 Audio object first (most compatible for purely audio tracks within container layouts).
      // Fall back to rendered Video element on restriction/failure.
      try {
        const audio = new Audio();
        audio.src = resolvedUrl;
        audio.volume = 1.0;
        this.audioElement = audio;

        audio.play()
          .then(() => {
            console.log('Playback started successfully via standard Audio engine.');
          })
          .catch((err) => {
            console.warn('Audio play request blocked or failed, attempting video element fallback:', err);
            this.playVideoFallback(resolvedUrl);
          });
      } catch (err) {
        console.warn('Audio initializer error, attempting video element fallback:', err);
        this.playVideoFallback(resolvedUrl);
      }
    }

    triggerHitRipple(side) {
      const r = this.svg.querySelector(`#drum-ripple-${side}`);
      if (!r) return;

      r.setAttribute('rx', '0');
      r.setAttribute('ry', '0');
      r.setAttribute('opacity', '0.85');

      let scale = 0;
      const anim = () => {
        scale += 3.5;
        r.setAttribute('rx', String(scale * 1.5));
        r.setAttribute('ry', String(scale * 0.4));
        r.setAttribute('opacity', String(Math.max(0, 0.85 - scale / 15)));
        if (scale < 15) {
          requestAnimationFrame(anim);
        } else {
          r.setAttribute('opacity', '0');
        }
      };
      anim();

      const body = this.svg.querySelector('#drum-body');
      if (body) {
        const shakeX = (Math.random() - 0.5) * 3;
        const shakeY = (Math.random() - 0.5) * 3;
        body.setAttribute('transform', `translate(${shakeX}, ${shakeY})`);
        setTimeout(() => { if (body) body.removeAttribute('transform'); }, 50);
      }
    }

    triggerClimaxRipple() {
      const r = this.svg.querySelector('#drum-ripple-climax');
      if (!r) return;

      r.setAttribute('rx', '0');
      r.setAttribute('ry', '0');
      r.setAttribute('opacity', '1');

      let scale = 0;
      const anim = () => {
        scale += 6;
        r.setAttribute('rx', String(scale * 2.2));
        r.setAttribute('ry', String(scale * 0.6));
        r.setAttribute('opacity', String(Math.max(0, 1.0 - scale / 45)));
        if (scale < 45) {
          requestAnimationFrame(anim);
        } else {
          r.setAttribute('opacity', '0');
        }
      };
      anim();

      const body = this.svg.querySelector('#drum-body');
      if (body) {
        body.setAttribute('transform', 'scale(1.08) translate(0, 4)');
        setTimeout(() => {
          if (body) body.removeAttribute('transform');
        }, 150);
      }

      // Sparkles explosion
      for (let i = 0; i < 20; i++) {
        this.spawnParticle();
      }
    }

    spawnParticle() {
      if (!this.svg) return;
      const x = 250 + (Math.random() - 0.5) * 160;
      const y = 200 + (Math.random() - 0.5) * 40;
      const colors = ['#ff8c00', '#ffd700', '#ff4500', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 4 + 2;

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(x));
      dot.setAttribute('cy', String(y));
      dot.setAttribute('r', String(size));
      dot.setAttribute('fill', color);
      dot.setAttribute('opacity', '1');

      this.svg.appendChild(dot);

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed - 1.5;
      
      let curX = x, curY = y, curOp = 1;
      const move = () => {
        curX += dx;
        curY += dy;
        curOp -= 0.04;
        dot.setAttribute('cx', String(curX));
        dot.setAttribute('cy', String(curY));
        dot.setAttribute('opacity', String(Math.max(0, curOp)));

        if (curOp > 0) {
          requestAnimationFrame(move);
        } else {
          dot.remove();
        }
      };
      requestAnimationFrame(move);
    }

    tick(time) {
      if (!this.isPlaying) return;

      const elapsed = time - this.startTime;
      const duration = this.options.duration; // 3000ms

      const leftStick = this.svg.querySelector('#stick-left');
      const rightStick = this.svg.querySelector('#stick-right');

      if (elapsed < duration - 250) {
        // Alternating rolls
        const pct = Math.min(1, elapsed / (duration - 250));
        const frequency = 0.085 + (pct * 0.035);
        const leftVal = Math.sin(elapsed * frequency);
        const rightVal = Math.sin(elapsed * frequency + Math.PI);

        const leftAngle = Math.max(0, leftVal) * -24;
        const rightAngle = Math.max(0, rightVal) * -24;

        if (leftStick) leftStick.style.transform = `rotate(${leftAngle}deg)`;
        if (rightStick) rightStick.style.transform = `rotate(${rightAngle}deg)`;

        if (leftVal <= 0.08 && this.lastLeftHitVal > 0.08) {
          this.triggerHitRipple('left');
        }
        if (rightVal <= 0.08 && this.lastRightHitVal > 0.08) {
          this.triggerHitRipple('right');
        }

        this.lastLeftHitVal = leftVal;
        this.lastRightHitVal = rightVal;

        this.animationFrame = requestAnimationFrame((t) => this.tick(t));

      } else if (elapsed < duration) {
        // High stick bounce expectation
        const phase2Pct = (elapsed - (duration - 250)) / 250;
        const highAngle = -35 * Math.sin(phase2Pct * Math.PI / 2);

        if (leftStick) leftStick.style.transform = `rotate(${highAngle}deg)`;
        if (rightStick) rightStick.style.transform = `rotate(${highAngle}deg)`;

        this.animationFrame = requestAnimationFrame((t) => this.tick(t));

      } else {
        // Climax strike down hard
        if (leftStick) leftStick.style.transform = 'rotate(0deg)';
        if (rightStick) rightStick.style.transform = 'rotate(0deg)';

        this.triggerClimaxRipple();

        this.isPlaying = false;
        setTimeout(() => {
          this.exit();
        }, 600);
      }
    }

    exit() {
      if (this.element) {
        this.element.style.opacity = '0';
        this.element.style.transform = 'translate(-50%, -50%) scale(0.6)';
      }

      setTimeout(() => {
        this.destroy();
        if (typeof this.options.onComplete === 'function') {
          this.options.onComplete();
        }
      }, 400);
    }

    destroy() {
      this.isPlaying = false;
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      if (this.audioElement) {
        try { this.audioElement.pause(); } catch(_) {}
        this.audioElement = null;
      }
      if (this.videoElement) {
        try { this.videoElement.pause(); } catch(_) {}
        this.videoElement.remove();
        this.videoElement = null;
      }
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
    }
  
  // Resolves file name to current directory path dynamically
    static getResolvedUrl(filename) {
      const loc = window.location;
      const path = loc.pathname;
      const dir = path.substring(0, path.lastIndexOf('/'));
      return `${loc.origin}${dir}/${filename}`;
    }

  playVideoFallback(resolvedUrl) {
      try {
        const video = document.createElement('video');
        video.style.position = 'fixed';
        video.style.bottom = '4px';
        video.style.right = '4px';
        video.style.width = '10px';
        video.style.height = '10px';
        video.style.opacity = '0.02';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-99999';
        
        video.src = resolvedUrl;
        video.preload = 'auto';
        video.muted = false;
        video.volume = 1.0;
        video.playsInline = true;
        
        document.body.appendChild(video);
        this.videoElement = video;

        video.play().catch((err) => {
          console.warn('Video fallback play prevented by modern browser autoplay policy:', err);
        });
      } catch (err) {
        console.warn('Video fallback failed:', err);
      }
    }
}