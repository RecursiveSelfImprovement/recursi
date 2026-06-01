
class CameraOrbitAnimator {
  static initStatics() {
    if (this._staticsInitialized) return;
    this._params = { numSides: 100, quantize: false, duration: 5, numCircles: Infinity, radiusFraction: 0.05 };
    this._running = false; this._requestId = null; this._startTime = null;
    this._initialCamPos = null; this._initialTarget = null; this._tangent = null;
    this._bitangent = null; this._maxRadius = null; this._distance = null;
    this._threeDView = null; this._cameraOscillationSettings = null;
    this._staticsInitialized = true;
  }

  static start(params = {}) {
    this.initStatics();
    // If dialog is not open, open it (which acts as the 'start' trigger)
    if (!this._dialog) {
      this.showDialog();
    }

    this._params = Object.assign({}, this._params, params);
    this._syncWithGlobalSettings();

    if (!this._threeDView) {
      console.error('CameraOrbitAnimator dependencies not set.');
      return;
    }
    if (this._threeDView.camera.isOrthographicCamera) {
      console.log('Orthographic camera; orbit animation not applied.');
      return;
    }

    // Only reset initial positions if we are not just resuming from a pause
    if (!this._running && !this._isPausedForInteraction) {
      this._initialCamPos = this._threeDView.camera.position.clone();
      this._initialTarget = this._threeDView.target.clone();
      const D = this._initialCamPos.clone().sub(this._initialTarget);
      this._distance = D.length();

      const normal = D.clone().normalize();
      let arbitrary = new THREE.Vector3(0, 1, 0);
      if (Math.abs(normal.dot(arbitrary)) > 0.99) {
        arbitrary.set(1, 0, 0);
      }
      this._tangent = new THREE.Vector3()
        .crossVectors(normal, arbitrary)
        .normalize();
      this._bitangent = new THREE.Vector3()
        .crossVectors(normal, this._tangent)
        .normalize();

      this._startTime = performance.now();
    }

    this._running = true;
    this._isPausedForInteraction = false;
    this._maxRadius = this._distance * this._params.radiusFraction;
    this._animate();
  }

  static _syncWithGlobalSettings() {
    // This now references an internal property, but can still be overridden by the window object for debugging.
    const settings =
      window.cameraOscillationSettings || this._cameraOscillationSettings;
    if (settings) {
      if (typeof settings.duration === 'number')
        this._params.duration = settings.duration;
      if (typeof settings.radiusFraction === 'number')
        this._params.radiusFraction = settings.radiusFraction;
      if (typeof settings.numSides === 'number')
        this._params.numSides = settings.numSides;
      if (typeof settings.quantize === 'boolean')
        this._params.quantize = settings.quantize;
      if (
        settings.numCircles === Infinity ||
        typeof settings.numCircles === 'number'
      )
        this._params.numCircles = settings.numCircles;
      if (settings.enabled === false && this._running) {
        this.stop();
      }
    }
  }

  static _animate() {
    if (!this._running || !this._threeDView) return;
    if (this._isPausedForInteraction) return;

    const settings =
      window.cameraOscillationSettings || this._cameraOscillationSettings;
    if (settings && settings.enabled === false) {
      this.stop();
      return;
    }

    const currentTime = performance.now();
    const elapsed = currentTime - this._startTime;

    const totalDuration =
      this._params.numCircles === Infinity
        ? Infinity
        : this._params.duration * 1000 * this._params.numCircles;

    if (elapsed >= totalDuration) {
      this.stop();
      return;
    }

    const rampUpTime = (settings?.rampUpTime || 1.0) * 1000;
    const ramp = Math.min(1, elapsed / rampUpTime);
    const currentRadius = this._maxRadius * ramp;

    // Calculate angle
    let angle = (elapsed / (this._params.duration * 1000)) * 2 * Math.PI;
    if (this._params.quantize && this._params.numSides > 0) {
      const step = (2 * Math.PI) / this._params.numSides;
      angle = Math.round(angle / step) * step;
    }

    const offset = new THREE.Vector3()
      .addScaledVector(this._tangent, Math.cos(angle) * currentRadius)
      .addScaledVector(this._bitangent, Math.sin(angle) * currentRadius);

    const newPos = this._initialCamPos.clone().add(offset);
    this._threeDView.camera.position.copy(newPos);
    this._threeDView.camera.lookAt(this._initialTarget);

    if (
      window.cameraOscillationSettings?.debugDraw ||
      window.debugOrbit != null
    ) {
      return;
    }
    this._requestId = requestAnimationFrame(this._animate.bind(this));
  }

  static stop() {
    if (this._running) {
      cancelAnimationFrame(this._requestId);
      this._running = false;
      this._requestId = null;
      this._isPausedForInteraction = false;
    }
    // Closing the dialog is the visual indicator of stopping
    this.closeDialog();
  }

  static toggle() {
    if (this._running || this._dialog) {
      this.stop();
    } else {
      this.start();
    }
  }

  static updateSettings() {
    if (this._running) {
      this.stop();
      this.start();
    }
  }

  static setDependencies(threeDView, settings) {
    this._threeDView = threeDView;
    this._cameraOscillationSettings = settings || {
      duration: 5,
      radiusFraction: 0.05,
      numSides: 100,
      quantize: false,
      numCircles: Infinity,
      enabled: true,
      rampUpTime: 1.0,
    };
  }

  static pauseForInteraction() {
    if (!this._running) return;

    this._isPausedForInteraction = true;
    cancelAnimationFrame(this._requestId);

    // Auto-resume handlers
    const resume = () => {
      // Small delay to ensure input event is fully cleared
      setTimeout(() => {
        this.resumeFromInteraction();
      }, 50);
      window.removeEventListener('pointerup', resume);
      window.removeEventListener('keyup', resume);
      window.removeEventListener('wheel', wheelResume);
    };

    // For mouse wheel, we need a debounce since there is no 'wheelup'
    let wheelTimeout;
    const wheelResume = () => {
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(resume, 200);
    };

    window.addEventListener('pointerup', resume);
    window.addEventListener('keyup', resume);
    // If it was triggered by wheel, we attach a listener to detect end of wheeling
    window.addEventListener('wheel', wheelResume);
  }

  static resumeFromInteraction() {
    if (this._running && this._isPausedForInteraction) {
      // Reset start time shift so animation doesn't jump
      // We want continuity in the phase, or just resume moving from where we are?
      // For orbit, it's based on 'elapsed'. If we paused, 'elapsed' jumped.
      // We should probably shift _startTime so 'elapsed' picks up where it left off
      // OR just accept the time skip. Time skip keeps it synced to wall clock.
      // Let's just re-init positions based on NEW camera location to avoid snap back.

      this._isPausedForInteraction = false;

      // Re-anchor the oscillation to the NEW camera position established by the user
      this._initialCamPos = this._threeDView.camera.position.clone();
      this._initialTarget = this._threeDView.target.clone();

      // Re-calc basis vectors for new view angle
      const D = this._initialCamPos.clone().sub(this._initialTarget);
      this._distance = D.length();
      this._maxRadius = this._distance * this._params.radiusFraction;

      const normal = D.clone().normalize();
      let arbitrary = new THREE.Vector3(0, 1, 0);
      if (Math.abs(normal.dot(arbitrary)) > 0.99) arbitrary.set(1, 0, 0);

      this._tangent = new THREE.Vector3()
        .crossVectors(normal, arbitrary)
        .normalize();
      this._bitangent = new THREE.Vector3()
        .crossVectors(normal, this._tangent)
        .normalize();

      // Reset time to 0 phase to start smooth loop from new center?
      // Or just keep running. If we keep running, 'elapsed' is large.
      // Let's reset start time so we start a fresh loop from the new position.
      this._startTime = performance.now();

      this._animate();
    }
  }

  static showDialog() {
      if (this._dialog) return;

      const hostContainer = this._threeDView?.renderer?.domElement?.parentElement || document.body;
      const parentWidth = hostContainer.clientWidth || window.innerWidth;
      const parentHeight = hostContainer.clientHeight || window.innerHeight;

      const content = document.createElement('div');
      content.style.padding = '10px';
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      content.style.gap = '10px';

      const initialSpeedPct = ((20 - this._params.duration) / 18) * 100;

      const speedSlider = new SliderControl({
        label: 'Speed',
        min: 0,
        max: 100,
        initialValue: Math.max(0, Math.min(100, initialSpeedPct)),
        showValue: false,
        callback: (val) => {
          const duration = 20 - (val / 100) * 18;
          this._params.duration = duration;
        },
      });

      const initialSizePct = ((this._params.radiusFraction - 0.01) / 0.29) * 100;

      const sizeSlider = new SliderControl({
        label: 'Size',
        min: 0,
        max: 100,
        initialValue: Math.max(0, Math.min(100, initialSizePct)),
        showValue: false,
        callback: (val) => {
          const frac = 0.01 + (val / 100) * 0.29;
          this._params.radiusFraction = frac;
          if (this._distance) {
            this._maxRadius = this._distance * frac;
          }
        },
      });

      content.appendChild(speedSlider.container);
      content.appendChild(sizeSlider.container);

      const width = 220;
      const height = 130;
      const left = parentWidth - width - 5;
      const top = parentHeight - height;

      this._dialog = UITools.makeDialog({
        title: 'Oscillate',
        width: `${width}px`,
        height: 'auto',
        content: content,
        titleBarAtBottom: true,
        transparent: true,
        position: [left, top],
        appendTo: hostContainer,
        onClose: () => {
          this._dialog = null;
          this.stop();
        },
      });
    }

  static closeDialog() {
    if (this._dialog) {
      this._dialog.close();
      this._dialog = null;
    }
  }

}

