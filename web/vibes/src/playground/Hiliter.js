class Hiliter {
  constructor(options = {}) {
    // --- EXPERIMENTAL GLOW ---
    this.useExperimentalGlow = true;
    // --- END EXPERIMENTAL ---

    this.colorPalette = [
      { name: 'Black', value: 'rgba(0, 0, 0, 1)' },
      { name: 'Dark Red', value: 'rgba(59, 0, 0, 1)' },
      { name: 'Dark Green', value: 'rgba(0, 40, 0, 1)' },
      { name: 'Dark Blue', value: 'rgba(0, 11, 55, 1)' },
    ];
    this.currentColorIndex = 0;

    this.defaults = {
      offsetX: 0,
      offsetY: 0,
      margin: 5,
      color: this.colorPalette[this.currentColorIndex].value,
      size: 30,
      smoothness: 166,
      useSVG: true,
      minMoveDistance: 10,
      closeThreshold: 25,
    };
    this.HIDE_SIZE = 20;
    this.CANVAS_ID = 'scMarkerCanvas__';

    this.settings = { ...this.defaults, ...options };
    this.stream = null;
    this.video = null;

    this.backgroundCanvas = null;
    this.backgroundCtx = null;
    this.foregroundCanvas = null;
    this.foregroundCtx = null;

    this.svgOverlay = null;

    // --- EXPERIMENTAL GLOW ---
    this.glowLayer = null;
    this.topLayer = null;
    this.currentGlowPath = null;
    this.currentTopPath = null; // Renamed from currentPath
    // --- END EXPERIMENTAL ---

    this.currentPoints = [];

    this.keyColor = null;
    this.tolerance = 50;
    this.isPickingColor = false;
    this.nudgeX = 0;
    this.nudgeY = 0;
    this.useExperimentalColorCorrection = false;
    this.isFilling = false;
    this.useDebugFill = false;

    this.cursorEl = null;

    this.isDrawing = false;
    this.isPaused = false;
    this.lastFrame = 0;
    this.actualX = 0;
    this.actualY = 0;
    this.virtualX = 0;
    this.virtualY = 0;
    this.animationFrameId = null;

    this._loadSettings();

    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleMouseLeave = this._handleMouseLeave.bind(this);
    this._handleMouseEnter = this._handleMouseEnter.bind(this);
    this._loop = this._loop.bind(this);
    this.togglePause = this.togglePause.bind(this);
    this.recapture = this.recapture.bind(this);
    this.stop = this.stop.bind(this);
    this._processAlphaMask = this._processAlphaMask.bind(this);
  }

  async start(opts = {}) {
    if (this.isActive()) {
      if (this.foregroundCanvas) this.foregroundCanvas.style.display = 'block';
      if (this.backgroundCanvas) this.backgroundCanvas.style.display = 'block';
      return;
    }

    Object.assign(this.settings, this.defaults, this.settings, opts);
    this._createUI();

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      this.video = document.createElement('video');
      this.video.style.display = 'none';
      this.video.srcObject = this.stream;
      document.body.appendChild(this.video);

      await new Promise((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.video
            .play()
            .then(() => {
              this._resizeCanvas();
              this._drawImageOnce();
              if (this.keyColor) {
                this._processAlphaMask();
              } else {
                this._enterColorPickMode();
              }
              resolve();
            })
            .catch(reject);
        };
        this.stream.getVideoTracks()[0].onended = () => this.stop();
      });

      this._addEventListeners();
      this.lastFrame = performance.now();
      this.animationFrameId = requestAnimationFrame(this._loop);
      this._log(
        'Highlighter On. Keys: [1] Recapture, [2] Pause, [3] Stop, [4] New BG Color, [B] Cycle Draw Color, [F] Fill, [7-0] Nudge'
      );
    } catch (err) {
      this._log('Screen capture failed or was cancelled.');
      this.stop();
    }
  }

  stop() {
    this._log('Highlighter turned off.');
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.video) this.video.remove();
    if (this.foregroundCanvas) this.foregroundCanvas.remove();
    if (this.backgroundCanvas) this.backgroundCanvas.remove();
    if (this.svgOverlay) this.svgOverlay.remove();
    if (this.cursorEl) this.cursorEl.remove();
    if (this.controlPanel) this.controlPanel.remove();

    this.stream =
      this.video =
      this.foregroundCanvas =
      this.foregroundCtx =
      this.backgroundCanvas =
      this.backgroundCtx =
      this.svgOverlay =
      this.cursorEl =
      this.controlPanel =
        null;
    this.isDrawing = false;
    this.isPaused = false;
  }

  togglePause() {
    if (!this.isActive()) return;
    this.isPaused = !this.isPaused;
    this._log(this.isPaused ? 'Highlighter Paused.' : 'Highlighter Resumed.');

    if (this.isPaused) {
      // When pausing, make everything invisible AND non-interactive.
      if (this.foregroundCanvas) {
        this.foregroundCanvas.style.display = 'none';
        // This is the key fix: make the input canvas click-through.
        this.foregroundCanvas.style.pointerEvents = 'none';
      }
      if (this.cursorEl) this.cursorEl.style.display = 'none';
      if (this.controlPanel) this.controlPanel.style.display = 'none';

      // Hide the correct drawing layer (SVG or Canvas).
      if (this.settings.useSVG && this.svgOverlay) {
        this.svgOverlay.style.display = 'none';
      } else if (this.backgroundCanvas) {
        this.backgroundCanvas.style.display = 'none';
      }
    } else {
      // When resuming, make everything visible AND interactive again.
      if (this.foregroundCanvas) {
        this.foregroundCanvas.style.display = 'block';
        // Restore mouse event capturing.
        this.foregroundCanvas.style.pointerEvents = 'auto';
      }
      if (this.cursorEl) this.cursorEl.style.display = 'block';
      if (this.controlPanel) this.controlPanel.style.display = '';

      // Show the correct drawing layer.
      if (this.settings.useSVG && this.svgOverlay) {
        this.svgOverlay.style.display = 'block';
      } else if (this.backgroundCanvas) {
        const displayMode = this.drawMode === 'dark' ? 'block' : 'none';
        this.backgroundCanvas.style.display = displayMode;
      }
    }

    if (this.pauseButton) {
      this.pauseButton.textContent = this.isPaused ? 'Resume' : 'Pause';
    }
  }

  recapture() {
    if (!this.isActive()) {
      this._log('Cannot recapture, highlighter is not active.');
      return;
    }
    this._log('Refreshing canvas with current screen content...');
    if (this.isPaused) {
      this.togglePause();
    }

    // If the background color hasn't been set, we can't proceed.
    if (!this.keyColor) {
      this._log(
        'Cannot recapture. Please set a background color first with key [4].'
      );
      return;
    }

    // 1. Draw a new frame from the LIVE video stream onto the canvas.
    this._drawImageOnce();

    // 2. Clear all previous SVG drawings.
    if (this.settings.useSVG && this.svgOverlay) {
      this.svgOverlay.innerHTML = '';
    } else if (this.backgroundCtx) {
      // Fallback for canvas mode
      this.backgroundCtx.clearRect(
        0,
        0,
        this.backgroundCanvas.width,
        this.backgroundCanvas.height
      );
    }

    // 3. Re-process the transparency mask on the new frame.
    // This makes the highlighter ready to draw again immediately.
    this._processAlphaMask();
  }

  _log(message) {
    console.log('[Hiliter]', message);
  }

  _resizeCanvas() {
    if (!this.foregroundCanvas) return;
    if (!this.backgroundCanvas && !this.svgOverlay) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = window.innerWidth - 2 * this.settings.margin;
    const cssHeight = window.innerHeight - 2 * this.settings.margin;

    const deviceWidth = cssWidth * dpr;
    const deviceHeight = cssHeight * dpr;

    this.foregroundCanvas.width = deviceWidth;
    this.foregroundCanvas.height = deviceHeight;

    this.foregroundCanvas.style.width = `${cssWidth}px`;
    this.foregroundCanvas.style.height = `${cssHeight}px`;

    if (this.settings.useSVG) {
      if (this.svgOverlay) {
        this.svgOverlay.setAttribute('width', deviceWidth);
        this.svgOverlay.setAttribute('height', deviceHeight);
        this.svgOverlay.setAttribute(
          'viewBox',
          `0 0 ${deviceWidth} ${deviceHeight}`
        );
        this.svgOverlay.style.width = `${cssWidth}px`;
        this.svgOverlay.style.height = `${cssHeight}px`;
      }
    } else {
      if (this.backgroundCanvas) {
        this.backgroundCanvas.width = deviceWidth;
        this.backgroundCanvas.height = deviceHeight;
        this.backgroundCanvas.style.width = `${cssWidth}px`;
        this.backgroundCanvas.style.height = `${cssHeight}px`;
      }
    }
  }

  _drawImageOnce() {
    if (!this.foregroundCtx || !this.video) return;
    this.foregroundCtx.clearRect(
      0,
      0,
      this.foregroundCanvas.width,
      this.foregroundCanvas.height
    );
    const w = this.foregroundCanvas.width;
    const h = this.foregroundCanvas.height;
    // THE FIX: Draw the image without any nudge offset. The transform handles positioning.
    this.foregroundCtx.drawImage(
      this.video,
      this.settings.offsetX,
      this.settings.offsetY,
      w,
      h,
      0,
      0,
      w,
      h
    );
  }

  _updateCursorStyle() {
    if (!this.cursorEl) return;
    const isColorPicker = this.isPickingColor;
    this.cursorEl.style.border = isColorPicker
      ? '2px solid #fff'
      : '3px solid rgba(0,255,0,0.8)';
    this.cursorEl.style.boxShadow = isColorPicker
      ? '0 0 5px #000'
      : '0 0 8px rgba(0,255,0,0.6)';
    this.cursorEl.style.background = isColorPicker
      ? 'transparent'
      : 'rgba(0,255,0,0.2)';
  }

  _handleMouseMove(e) {
    const dpr = window.devicePixelRatio || 1;
    // Convert mouse coordinates from CSS pixels to device pixels
    this.actualX = e.offsetX * dpr;
    this.actualY = e.offsetY * dpr;
  }

  _handleMouseDown(e) {
      if (this.isPaused || this.isPickingColor) return;
      this.isDrawing = true;
      
      const dpr = window.devicePixelRatio || 1;
      this.actualX = e.offsetX * dpr;
      this.actualY = e.offsetY * dpr;
      if (this.currentPoints.length === 0 || this.virtualX === 0) {
        this.virtualX = this.actualX;
        this.virtualY = this.actualY;
      }

      this._updateCursorStyle();

      if (this.settings.useSVG) {
        this.currentPoints = [[this.virtualX, this.virtualY]];
        const dpr = window.devicePixelRatio || 1;
        const strokeWidth = this.settings.size * dpr;

        if (this.useExperimentalGlow) {
          this.currentGlowPath = makeElement('svg:path');

          this.currentGlowPath.setAttribute('stroke', 'rgb(255, 255, 0)');
          this.currentGlowPath.setAttribute('stroke-opacity', '0.55');
          this.currentGlowPath.setAttribute(
            'stroke-width',
            strokeWidth.toString()
          );
          this.currentGlowPath.setAttribute('stroke-linejoin', 'round');
          this.currentGlowPath.setAttribute('stroke-linecap', 'round');
          this.currentGlowPath.setAttribute('fill', 'none');
          this.glowLayer.appendChild(this.currentGlowPath);

          this.currentTopPath = makeElement('svg:path');
          const currentDrawColor =
            this.colorPalette[this.currentColorIndex].value;
          const color = this._parseColor(currentDrawColor);
          const rgbColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

          this.currentTopPath.setAttribute('stroke', rgbColor);
          this.currentTopPath.setAttribute('stroke-opacity', '1');
          this.currentTopPath.setAttribute(
            'stroke-width',
            strokeWidth.toString()
          );
          this.currentTopPath.setAttribute('stroke-linejoin', 'round');
          this.currentTopPath.setAttribute('stroke-linecap', 'round');
          this.currentTopPath.setAttribute('fill', 'none');
          this.topLayer.appendChild(this.currentTopPath);
        }
      }
    }

  _handleMouseUp() {
    if (this.isDrawing) {
      if (this.settings.useSVG) {
        let finalPathString = this._pointsToPathString(this.currentPoints);
        finalPathString += ` L ${this.virtualX.toFixed(
          2
        )},${this.virtualY.toFixed(2)}`;
        const isClosed = this._isCloseToStart(this.virtualX, this.virtualY);

        // --- EXPERIMENTAL GLOW ---
        if (this.useExperimentalGlow) {
          if (this.currentGlowPath) {
            this.currentGlowPath.setAttribute('d', finalPathString);
          }
          if (this.currentTopPath) {
            if (isClosed) {
              finalPathString += ' Z';
              const currentDrawColor =
                this.colorPalette[this.currentColorIndex].value;
              const color = this._parseColor(currentDrawColor);
              this.currentTopPath.setAttribute(
                'fill',
                `rgb(${color.r}, ${color.g}, ${color.b})`
              );
              this.currentTopPath.setAttribute('fill-opacity', '1');
            }
            this.currentTopPath.setAttribute('d', finalPathString);
          }
        }
        // --- END EXPERIMENTAL ---
        else if (this.currentTopPath) {
          // Original non-glow logic
          if (isClosed) {
            finalPathString += ' Z';
            const currentDrawColor =
              this.colorPalette[this.currentColorIndex].value;
            const color = this._parseColor(currentDrawColor);
            this.currentTopPath.setAttribute(
              'fill',
              `rgb(${color.r}, ${color.g}, ${color.b})`
            );
            this.currentTopPath.setAttribute('fill-opacity', '1');
          }
          this.currentTopPath.setAttribute('d', finalPathString);
        }

        this.currentGlowPath = null;
        this.currentTopPath = null;
        this.currentPoints = [];
      }
      this.isDrawing = false;
      this._updateCursorStyle();
    }
  }

  _handleMouseLeave() {
    if (this.cursorEl) this.cursorEl.style.display = 'none';
    this._handleMouseUp();
  }

  _handleMouseEnter() {
    if (this.cursorEl && !this.isPaused) {
      this._updateCursorStyle();
      this.cursorEl.style.display = 'block';
    }
  }

  _loop(ts) {
    if (!this.isActive()) return;
    if (!this.isPaused) {
      // ... (smoothing logic is unchanged)
      const dt = ts - this.lastFrame;
      this.lastFrame = ts;
      const alpha =
        this.settings.smoothness > 0
          ? Math.min(dt / this.settings.smoothness, 1)
          : 1;
      this.virtualX += (this.actualX - this.virtualX) * alpha;
      this.virtualY += (this.actualY - this.virtualY) * alpha;

      if (this.cursorEl) {
        // ... (cursor logic is unchanged)
        const pd = this.isPickingColor ? 20 : this.settings.size;
        this.cursorEl.style.width = `${pd}px`;
        this.cursorEl.style.height = `${pd}px`;
        const dpr = window.devicePixelRatio || 1;
        const r = this.foregroundCanvas.getBoundingClientRect();
        this.cursorEl.style.left = `${r.left + this.virtualX / dpr}px`;
        this.cursorEl.style.top = `${r.top + this.virtualY / dpr}px`;
      }

      if (this.isDrawing) {
        if (this.settings.useSVG) {
          const lastPoint = this.currentPoints[this.currentPoints.length - 1];
          const dist = Math.hypot(
            this.virtualX - lastPoint[0],
            this.virtualY - lastPoint[1]
          );
          const dpr = window.devicePixelRatio || 1;

          if (dist > this.settings.minMoveDistance * dpr) {
            this.currentPoints.push([this.virtualX, this.virtualY]);
          }

          let pathString = this._pointsToPathString(this.currentPoints);
          pathString += ` L ${this.virtualX.toFixed(2)},${this.virtualY.toFixed(
            2
          )}`;

          // --- EXPERIMENTAL GLOW ---
          if (this.useExperimentalGlow && this.currentGlowPath) {
            this.currentGlowPath.setAttribute('d', pathString);

            // Handle fill only on the top path
            if (this.currentTopPath) {
              const isClosed = this._isCloseToStart(
                this.virtualX,
                this.virtualY
              );
              if (isClosed) {
                this.currentTopPath.setAttribute(
                  'fill',
                  this._getSemiFillColor()
                );
              } else {
                this.currentTopPath.setAttribute('fill', 'none');
              }
              this.currentTopPath.setAttribute('d', pathString);
            }
          }
          // --- END EXPERIMENTAL ---
          else if (this.currentTopPath) {
            // Original non-glow logic
            const isClosed = this._isCloseToStart(this.virtualX, this.virtualY);
            if (isClosed) {
              this.currentTopPath.setAttribute(
                'fill',
                this._getSemiFillColor()
              );
            } else {
              this.currentTopPath.setAttribute('fill', 'none');
            }
            this.currentTopPath.setAttribute('d', pathString);
          }
        }
      }
    }
    this.animationFrameId = requestAnimationFrame(this._loop);
  }

  _enterColorPickMode() {
    this.isPickingColor = true;
    this.foregroundCanvas.style.cursor = 'crosshair';
    this._log('Click on the desired background color to make it transparent.');
    this._updateCursorStyle();

    const clickListener = (e) => {
      const dpr = window.devicePixelRatio || 1;
      const x = e.offsetX * dpr;
      const y = e.offsetY * dpr;
      const pixelData = this.foregroundCtx.getImageData(x, y, 1, 1).data;
      this.keyColor = { r: pixelData[0], g: pixelData[1], b: pixelData[2] };
      this._saveSettings(); // Save the new color

      this.isPickingColor = false;
      this.foregroundCanvas.style.cursor = 'none';
      this._log('Processing transparency mask...');
      this._updateCursorStyle();

      setTimeout(() => {
        this._processAlphaMask();
        this._log('Processing complete.');
      }, 10);

      this.foregroundCanvas.removeEventListener('click', clickListener);
    };
    this.foregroundCanvas.addEventListener('click', clickListener, {
      once: true,
    });
  }

  _processAlphaMask() {
    if (!this.keyColor) {
      this._log('Cannot process mask without a key color.');
      this.panelStatus.textContent = 'Please pick a color first.';
      return;
    }

    const imageData = this.foregroundCtx.getImageData(
      0,
      0,
      this.foregroundCanvas.width,
      this.foregroundCanvas.height
    );
    const data = imageData.data;
    const bgR = this.keyColor.r;
    const bgG = this.keyColor.g;
    const bgB = this.keyColor.b;
    const tolerance = this.tolerance;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dr = r - bgR;
      const dg = g - bgG;
      const db = b - bgB;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      const alphaFloat = Math.min(1.0, distance / tolerance);
      const newAlpha = alphaFloat * 255;

      if (
        this.useExperimentalColorCorrection &&
        alphaFloat > 0.001 &&
        alphaFloat < 1.0
      ) {
        const newR = bgR + dr / alphaFloat;
        const newG = bgG + dg / alphaFloat;
        const newB = bgB + db / alphaFloat;
        data[i] = Math.max(0, Math.min(255, newR));
        data[i + 1] = Math.max(0, Math.min(255, newG));
        data[i + 2] = Math.max(0, Math.min(255, newB));
      }
      data[i + 3] = newAlpha;
    }
    this.foregroundCtx.putImageData(imageData, 0, 0);

    // THE FIX: We no longer pre-fill the canvas with an opaque color.
    // Instead, we just set the CSS background color of the element.
    if (this.backgroundCanvas) {
      const { r, g, b } = this.keyColor;
      this.backgroundCanvas.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }

    this._log(
      `Alpha mask processing complete. ${
        this.useExperimentalColorCorrection ? '(Color Correction Applied)' : ''
      }`
    );
  }

  isActive() {
    return !!this.stream;
  }

  _createUI() {
    if (this.settings.useSVG) {
      this.svgOverlay = makeElement('svg:svg', {
        id: this.CANVAS_ID + '_svg',
        style: {
          position: 'fixed',
          top: `${this.settings.margin}px`,
          left: `${this.settings.margin}px`,
          zIndex: '2147483645',
        },
      });

      // --- EXPERIMENTAL GLOW ---
      if (this.useExperimentalGlow) {
        this.glowLayer = makeElement('svg:g', {
          id: 'glow-layer',
          style: { filter: 'blur(8px)' },
        });

        this.topLayer = makeElement('svg:g', { id: 'top-layer' });
        this.svgOverlay.appendChild(this.glowLayer);
        this.svgOverlay.appendChild(this.topLayer);
      }
      // --- END EXPERIMENTAL ---

      document.body.appendChild(this.svgOverlay);
    }

    this.foregroundCanvas = document.createElement('canvas');
    this.foregroundCanvas.id = this.CANVAS_ID;
    Object.assign(this.foregroundCanvas.style, {
      position: 'fixed',
      top: `${this.settings.margin}px`,
      left: `${this.settings.margin}px`,
      zIndex: '2147483646',
      cursor: 'none',
    });
    document.body.appendChild(this.foregroundCanvas);
    this.foregroundCtx = this.foregroundCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    this.cursorEl = document.createElement('div');
    Object.assign(this.cursorEl.style, {
      position: 'fixed',
      pointerEvents: 'none',
      // FIX: Update cursor color to match the new blue glow
      border: '3px solid rgba(0, 100, 255, 0.8)',
      boxShadow: '0 0 8px rgba(0, 100, 255, 0.6)',
      background: 'rgba(0, 100, 255, 0.2)',
      borderRadius: '50%',
      transform: 'translate(-50%,-50%)',
      zIndex: '2147483647',
      display: 'none',
    });
    document.body.appendChild(this.cursorEl);
    this._applyNudgeTransform();
  }

  _addEventListeners() {
    this.foregroundCanvas.addEventListener('mousemove', this._handleMouseMove);
    this.foregroundCanvas.addEventListener('mousedown', this._handleMouseDown);
    this.foregroundCanvas.addEventListener('mouseup', this._handleMouseUp);
    this.foregroundCanvas.addEventListener(
      'mouseleave',
      this._handleMouseLeave
    );
    this.foregroundCanvas.addEventListener(
      'mouseenter',
      this._handleMouseEnter
    );
  }

  _loadSettings() {
    try {
      const storedColor = localStorage.getItem('hiliter_keyColor');
      if (storedColor) this.keyColor = JSON.parse(storedColor);

      const storedOffset = localStorage.getItem('hiliter_nudgeOffset');
      if (storedOffset) {
        const offset = JSON.parse(storedOffset);
        this.nudgeX = offset.x || 0;
        this.nudgeY = offset.y || 0;
      }

      const useCorrection = localStorage.getItem('hiliter_useColorCorrection');
      this.useExperimentalColorCorrection = useCorrection === 'true';

      // Load the new debug setting
      const useDebug = localStorage.getItem('hiliter_useDebugFill');
      this.useDebugFill = useDebug === 'true';

      this._log(
        `Hiliter settings loaded. Color Correction: ${
          this.useExperimentalColorCorrection ? 'ON' : 'OFF'
        }, Fill Debug: ${this.useDebugFill ? 'ON' : 'OFF'}`
      );
    } catch (e) {
      console.error('[Hiliter] Failed to load settings from localStorage', e);
    }
  }

  _saveSettings() {
    try {
      if (this.keyColor) {
        localStorage.setItem('hiliter_keyColor', JSON.stringify(this.keyColor));
      }
      const offset = { x: this.nudgeX, y: this.nudgeY };
      localStorage.setItem('hiliter_nudgeOffset', JSON.stringify(offset));
      localStorage.setItem(
        'hiliter_useColorCorrection',
        this.useExperimentalColorCorrection
      );
      // Save the new debug setting
      localStorage.setItem('hiliter_useDebugFill', this.useDebugFill);
    } catch (e) {
      console.error('[Hiliter] Failed to save settings to localStorage', e);
    }
  }

  forcePickColor() {
    if (!this.isActive() || this.isPaused || this.drawMode !== 'dark') {
      this._log(
        'Can only pick color when highlighter is active, unpaused, and in dark BG mode.'
      );
      return;
    }
    this._log('Forcing color re-selection...');
    this._enterColorPickMode();
  }

  nudge(dx, dy) {
    if (!this.isActive() || this.isPaused) return;
    this.nudgeX += dx;
    this.nudgeY += dy;
    this._log(
      `Nudging canvas. New offset: {x: ${this.nudgeX.toFixed(
        2
      )}, y: ${this.nudgeY.toFixed(2)}}`
    );
    this._saveSettings();
    this._applyNudgeTransform();
  }

  _applyNudgeTransform() {
    if (!this.foregroundCanvas) return;
    const transformValue = `translate(${this.nudgeX}px, ${this.nudgeY}px)`;
    this.foregroundCanvas.style.transform = transformValue;
    if (this.settings.useSVG) {
      if (this.svgOverlay) this.svgOverlay.style.transform = transformValue;
    } else {
      if (this.backgroundCanvas)
        this.backgroundCanvas.style.transform = transformValue;
    }
  }

  toggleColorCorrection() {
    this.useExperimentalColorCorrection = !this.useExperimentalColorCorrection;
    this._saveSettings();
    const status = this.useExperimentalColorCorrection ? 'ON' : 'OFF';
    this._log(
      `Experimental color correction is now ${status}. Press [1] to re-process and see changes.`
    );
    return `Color correction is now ${status}.`;
  }

  _initiateFill(startX, startY) {
    // THE FIX: We only need the data from the canvas we are drawing on.
    const drawingImageData = this.backgroundCtx.getImageData(
      0,
      0,
      this.backgroundCanvas.width,
      this.backgroundCanvas.height
    );

    const index = (startY * drawingImageData.width + startX) * 4;

    const drawingPixel = {
      r: drawingImageData.data[index],
      g: drawingImageData.data[index + 1],
      b: drawingImageData.data[index + 2],
      a: drawingImageData.data[index + 3],
    };

    if (this.useDebugFill) {
      console.log(
        `[Debug Fill] Checking start point (${startX}, ${startY}). DRAWING Canvas Alpha: ${drawingPixel.a}`
      );
      this.backgroundCtx.fillStyle = 'magenta';
      this.backgroundCtx.beginPath();
      this.backgroundCtx.arc(startX, startY, 5, 0, Math.PI * 2);
      this.backgroundCtx.fill();
      setTimeout(() => {
        this.backgroundCtx.clearRect(startX - 6, startY - 6, 12, 12);
      }, 1000);
    }

    // If the pixel on the drawing canvas is not transparent, we can't start the fill.
    if (drawingPixel.a > 0) {
      this._log(
        `Fill Cancelled: The starting point at (${startX}, ${startY}) is on top of your existing drawing.`
      );
      console.groupCollapsed('Fill Failure Details');
      console.log(
        `Reason: The pixel on the drawing canvas was not transparent.`
      );
      console.log(
        `Expected drawing pixel alpha to be 0, but it was ${drawingPixel.a}.`
      );
      console.log('Drawing Pixel RGBA:', drawingPixel);
      console.groupEnd();
      return;
    }

    this.isFilling = true;
    this._log('Valid empty area detected. Starting fill...');

    const fillCanvas = document.createElement('canvas');
    fillCanvas.width = this.backgroundCanvas.width;
    fillCanvas.height = this.backgroundCanvas.height;
    const fillCtx = fillCanvas.getContext('2d');

    // THE FIX: Pass only the drawing data to the algorithm.
    const pixelsFilled = this._floodFill(
      startX,
      startY,
      fillCtx,
      drawingImageData
    );

    if (this.useDebugFill) {
      console.log(
        `[Debug Fill] Flood fill complete. ${pixelsFilled} pixels were filled.`
      );
    }

    if (pixelsFilled > 0) {
      this._animateFill(fillCanvas);
    } else {
      this.isFilling = false;
      this._log('Fill complete (no area found).');
    }
  }

  _floodFill(startX, startY, fillCtx, drawingImageData) {
    const { width, height } = drawingImageData;
    // THE FIX: The only "walls" are the pixels on our drawing canvas.
    const boundaryData = drawingImageData.data;

    const fillColorConfig = this.useDebugFill
      ? { r: 255, g: 0, b: 255, a: 255 }
      : (() => {
          const [r, g, b, a] = this.settings.color.match(/\d+/g).map(Number);
          return { r, g, b, a: a !== undefined ? a : 255 };
        })();

    const fillImageData = fillCtx.createImageData(width, height);
    const fillData = fillImageData.data;
    const queue = [[startX, startY]];
    let pixelsFilled = 0;

    while (queue.length > 0) {
      const [x, y] = queue.shift();
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const index = (y * width + x) * 4;

      // THE FIX: The fill stops if it hits a pixel on the drawing canvas OR a pixel it has already filled.
      const isDrawingWall = boundaryData[index + 3] > 0;
      const alreadyFilled = fillData[index + 3] > 0;

      if (isDrawingWall || alreadyFilled) {
        continue;
      }

      fillData[index] = fillColorConfig.r;
      fillData[index + 1] = fillColorConfig.g;
      fillData[index + 2] = fillColorConfig.b;
      fillData[index + 3] = 255;
      pixelsFilled++;

      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    if (pixelsFilled > 0) {
      fillCtx.putImageData(fillImageData, 0, 0);
    }
    return pixelsFilled;
  }

  _animateFill(fillCanvas) {
    const duration = 300; // ms
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Set the opacity and draw the filled shape from the temp canvas
      this.backgroundCtx.globalAlpha = progress;
      this.backgroundCtx.drawImage(fillCanvas, 0, 0);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Animation complete
        this.backgroundCtx.globalAlpha = 1;
        // "Bake" the fill into the background canvas permanently
        this.backgroundCtx.drawImage(fillCanvas, 0, 0);
        this.isFilling = false;
        this._log('Fill complete.');
      }
    };

    requestAnimationFrame(step);
  }

  toggleFillDebug() {
    this.useDebugFill = !this.useDebugFill;
    this._saveSettings();
    const status = this.useDebugFill ? 'ON' : 'OFF';
    this._log(`Flood Fill Debug Mode is now ${status}.`);
    return `Flood Fill Debug Mode is now ${status}.`;
  }

  fillAtCursor() {
    if (this.settings.useSVG) {
      this._log('Flood fill is not available in SVG mode.');
      return;
    }
    if (this.isFilling || this.isPaused || this.drawMode !== 'dark') {
      this._log(
        'Fill command ignored. (Already filling, paused, or not in dark mode)'
      );
      return;
    }
    const startX = Math.round(this.virtualX);
    const startY = Math.round(this.virtualY);
    this._initiateFill(startX, startY);
  }

  _pointsToPathString(points) {
    if (!points || points.length === 0) return '';
    const command = (p, i) =>
      (i === 0 ? 'M' : 'L') + `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    return points.map(command).join(' ');
  }

  _isCloseToStart(x, y) {
    if (!this.currentPoints || this.currentPoints.length < 3) return false;
    const startPoint = this.currentPoints[0];
    const dist = Math.hypot(x - startPoint[0], y - startPoint[1]);
    const dpr = window.devicePixelRatio || 1;
    // The threshold is in CSS pixels, but drawing is in device pixels.
    return dist < this.settings.closeThreshold * dpr;
  }

  _getSemiFillColor() {
    // This creates the temporary, semi-transparent fill during the drawing action.
    const currentDrawColor = this.colorPalette[this.currentColorIndex].value;
    const color = this._parseColor(currentDrawColor);
    return `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
  }

  cycleColor() {
    if (!this.isActive() || this.isPaused) return null;
    this.currentColorIndex =
      (this.currentColorIndex + 1) % this.colorPalette.length;
    const newColor = this.colorPalette[this.currentColorIndex];
    this.settings.color = newColor.value; // Keep this for canvas fallback consistency
    return newColor.name; // Return the name of the new color for logging
  }

  _parseColor(colorString) {
    const match = colorString.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
    );
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1,
      };
    }
    // Fallback for other color formats (e.g., hex, named colors)
    const tempEl = document.createElement('div');
    tempEl.style.color = colorString;
    document.body.appendChild(tempEl);
    const computedColor = window.getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);
    return this._parseColor(computedColor); // Recurse with the computed rgb string
  }

    static _doc_Hiliter() {
    return {
      "generatedBy": "MigrateOwnedSidecarDocsToCapsulesV2",
      "migratedAt": "2026-04-29T05:02:29.407Z",
      "sourcePath": "/vibes/src/playground/Hiliter_js.md",
      "ownerPath": "/vibes/src/playground/Hiliter.js",
      "ownerClass": "Hiliter",
      "migrationStatus": "sidecar-embedded-sidecar-deleted",
      "visibilityRole": "documentation",
      "note": "Migrated from legacy *_js.md sidecar into the managed JS capsule. This method is documentation payload, not runtime code. Prompt visibility docsLevel should control inclusion.",
      "content": "# Hiliter\n\n## Summary\n\nHiliter is an experimental, browser-based screen annotation and \"green screen\" tool. By capturing a live video stream of the user's display (`navigator.mediaDevices.getDisplayMedia`), it allows the user to pick a background color (chroma keying). It then processes the video feed in real-time, making that color transparent, and overlays a drawing canvas so the user can sketch or highlight directly over their live screen content.\n\nThe philosophy is advanced visual debugging and presentation. It was designed to allow developers to draw on top of running applications, record the results, and create rich, annotated bug reports or tutorials without needing dedicated desktop screen-recording software.\n\n## Core Logic & Philosophy\n\n**Real-time chroma keying.** `_processAlphaMask` grabs the pixel data from the captured video frame on the `foregroundCanvas`. It iterates through every pixel, calculating the 3D distance between the pixel's RGB values and the user-selected `keyColor`. Based on the `tolerance` setting, it dynamically adjusts the alpha channel, turning the solid background color completely transparent so the underlying `backgroundCanvas` (where the drawing happens) is revealed.\n\n**Dual-layer rendering.** The tool supports both Canvas-based drawing and SVG-based drawing. When `useSVG` is enabled, it utilizes the \"Experimental Glow\" logic (similar to `GlowDrawer`), tracking the mouse to generate smooth `<path>` elements with heavy `feGaussianBlur` filters, creating glowing neon strokes on top of the live video feed.\n\n**Flood fill algorithm.** `_floodFill` implements a classic queue-based bucket fill. If the user activates the fill command (`fillAtCursor`), the algorithm starts at the mouse coordinates and radiates outward, changing pixel colors until it hits a \"wall\" (defined as any non-transparent pixel on the drawing layer).\n\n## Public API\n\n### Lifecycle\n- `constructor(options)` — Initializes state, loads settings from `localStorage`, and binds the animation loop.\n- `async start(opts)` — Requests screen-share permissions from the browser, binds the video stream to a hidden element, and kicks off the `requestAnimationFrame` render loop.\n- `stop()` — Kills the video stream, destroys all canvases and SVG overlays, and unbinds listeners.\n\n### Interaction\n- `togglePause()` — Freezes the live video feed and makes the canvases \"click-through\" (`pointerEvents: 'none'`), allowing the user to interact with the application beneath the overlay while keeping the drawing visible.\n- `recapture()` — Grabs a fresh frame from the video stream and re-runs the chroma keying mask.\n- `nudge(dx, dy)` — Offsets the rendering canvas slightly, useful for aligning the captured screen with the physical monitor layout.\n- `fillAtCursor()` — Triggers the flood-fill algorithm at the current virtual mouse coordinates.\n\n### Configuration\n- `forcePickColor()` — Enters a state where the next click on the canvas sets the new `keyColor` for transparency masking.\n- `cycleColor()` — Iterates through the predefined palette of drawing colors.\n- `toggleColorCorrection()` / `toggleFillDebug()` — Toggles experimental rendering modes and saves the preference to storage."
};
  }

}

