class AccuDrawLogic {
  constructor(baseController) {
    this.baseController = baseController;

    this.active = true;
    this.mode = 'rectangular'; // 'rectangular' | 'polar' | 'mixed'
    this.origin = [0, 0, 0];
    this.rotation = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];

    // Axes state
    this.currentAxis = 'x';
    this.isLocked = { x: false, y: false, z: false, dist: false, angle: false };
    this.lockedValues = { x: 0, y: 0, z: 0, dist: 0, angle: 0 };

    // Focus State
    this.stickyFocus = false; // If true, mouse movement won't change the active axis
    this.typingMouseAnchor = null; // Anchor for gesture detection during typing

    // Tracking for directional input
    this.lastLocalDelta = { x: 0, y: 0, z: 0 };
    this.lastIndexedAxis = null;

    // Input state
    this.inputBuffer = '';
    this.inputActive = false;
  }

  onMotion(mousePoint, tentativePoint, indexedToAxis) {
    if (!this.active) return;

    const rawInput = tentativePoint || mousePoint;
    if (!rawInput) return;

    const delta = [
      rawInput[0] - this.origin[0],
      rawInput[1] - this.origin[1],
      rawInput[2] - this.origin[2],
    ];

    const currentRotation = this.baseController.rotationMatrix || this.rotation;

    const X = currentRotation[0];
    const Y = currentRotation[1];
    const Z = currentRotation[2];

    const localX = delta[0] * X[0] + delta[1] * X[1] + delta[2] * X[2];
    const localY = delta[0] * Y[0] + delta[1] * Y[1] + delta[2] * Y[2];
    const localZ = delta[0] * Z[0] + delta[1] * Z[1] + delta[2] * Z[2];

    this.lastLocalDelta = { x: localX, y: localY, z: localZ };
    this.lastIndexedAxis = indexedToAxis;

    const dist = Math.sqrt(localX * localX + localY * localY);
    const angleRad = Math.atan2(localY, localX);
    const angleDeg = (angleRad * 180) / Math.PI;

    // === SMART FOCUS LOGIC ===
    // CRITICAL: If we are actively typing (inputActive), focus is FROZEN.
    // stickyFocus alone is not enough because confirmInput clears it.
    // The ONLY way to leave the typing axis is an explicit mouse gesture
    // that is large enough to indicate intentional axis switching.
    if (!this.stickyFocus && !this.inputActive) {
      let newAxis = this.currentAxis;

      if (this.mode === 'rectangular' || this.mode === 'mixed') {
        let xAnchor = this.isLocked.x ? this.lockedValues.x : 0;
        let yAnchor = this.isLocked.y ? this.lockedValues.y : 0;

        let xPull = Math.abs(localX - xAnchor);
        let yPull = Math.abs(localY - yAnchor);

        if (xPull >= yPull) {
          newAxis = 'x';
        } else {
          newAxis = 'y';
        }

        if (newAxis !== this.currentAxis) {
          this.currentAxis = newAxis;
          if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
            this.baseController.accuDraw.ui.focusField(newAxis);
          }
        }
      } else {
        if (this.isLocked.dist && !this.isLocked.angle)
          this.currentAxis = 'angle';
        else if (!this.isLocked.dist) this.currentAxis = 'dist';
      }
    }

    // === GESTURE-BASED COMMIT (the "pull away" to confirm typed value) ===
    // If the user IS typing and moves the mouse decisively in the OTHER axis direction,
    // THAT is the signal to lock in the typed value and switch focus.
    if (this.inputActive && this.typingMouseAnchor) {
      const typingAxis = this.currentAxis;
      let otherAxis = null;

      if (this.mode === 'rectangular' || this.mode === 'mixed') {
        if (typingAxis === 'x') otherAxis = 'y';
        else if (typingAxis === 'y') otherAxis = 'x';
      }

      if (otherAxis) {
        const otherNow = otherAxis === 'x' ? localX : localY;
        const otherAnchor = this.typingMouseAnchor[otherAxis];
        const typingNow = typingAxis === 'x' ? localX : localY;
        const typingAnchor = this.typingMouseAnchor[typingAxis];

        const otherDelta = Math.abs(otherNow - otherAnchor);
        const typingDelta = Math.abs(typingNow - typingAnchor);

        // Threshold: Must move meaningfully more in the other axis than in the typing axis.
        // Use the marker size as a reference for "meaningful" distance.
        const markerSize = this.baseController.accuDraw
          ? this.baseController.accuDraw.options.size
          : 1;
        const gestureThreshold = markerSize * 0.3;

        if (otherDelta > gestureThreshold && otherDelta > typingDelta * 1.5) {
          // Commit the typed value
          this.confirmInput();
          // Now switch to the other axis
          this.currentAxis = otherAxis;
          if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
            this.baseController.accuDraw.ui.focusField(otherAxis);
          }
        }
      }
    }

    // === PREPARE UI VALUES ===
    const uiValues = {};

    const getUiVal = (axis, liveVal) => {
      // If we are actively typing in THIS axis, always show the raw buffer.
      // This prevents "2" from becoming "2.0000" while the user is still typing.
      if (this.inputActive && this.currentAxis === axis) {
        return this.inputBuffer;
      }
      if (this.isLocked[axis]) return this.lockedValues[axis];
      return liveVal;
    };

    if (this.mode === 'rectangular' || this.mode === 'mixed') {
      uiValues.x = getUiVal('x', localX);
      uiValues.y = getUiVal('y', localY);
    }

    if (this.mode === 'polar' || this.mode === 'mixed') {
      uiValues.dist = getUiVal('dist', dist);
      uiValues.angle = getUiVal('angle', angleDeg);
    }

    uiValues.z = getUiVal('z', localZ);

    // === UPDATE UI ===
    if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
      this.baseController.accuDraw.ui.updateValues(uiValues);
      this.baseController.accuDraw.ui.setSmartFocus(this.currentAxis);

      this.baseController.accuDraw.ui.setLocked('x', this.isLocked.x);
      this.baseController.accuDraw.ui.setLocked('y', this.isLocked.y);
      this.baseController.accuDraw.ui.setLocked('dist', this.isLocked.dist);
      this.baseController.accuDraw.ui.setLocked('angle', this.isLocked.angle);
      this.baseController.accuDraw.ui.setLocked('z', this.isLocked.z);
    }
  }

  getConstrainedPoint(mousePoint, tentativePoint) {
    const rawInput = tentativePoint || mousePoint;
    if (!rawInput) return [0, 0, 0];

    const delta = [
      rawInput[0] - this.origin[0],
      rawInput[1] - this.origin[1],
      rawInput[2] - this.origin[2],
    ];

    // FIX: Use source of truth
    const currentRotation = this.baseController.rotationMatrix || this.rotation;
    const X = currentRotation[0];
    const Y = currentRotation[1];
    const Z = currentRotation[2];

    let lx = delta[0] * X[0] + delta[1] * X[1] + delta[2] * X[2];
    let ly = delta[0] * Y[0] + delta[1] * Y[1] + delta[2] * Y[2];
    let lz = delta[0] * Z[0] + delta[1] * Z[1] + delta[2] * Z[2];

    if (this.mode === 'rectangular' || this.mode === 'mixed') {
      if (this.isLocked.x) lx = this.lockedValues.x;
      if (this.isLocked.y) ly = this.lockedValues.y;
    }

    if (this.mode === 'polar') {
      let dist = Math.sqrt(lx * lx + ly * ly);
      let angleRad = Math.atan2(ly, lx);

      if (this.isLocked.dist) dist = this.lockedValues.dist;
      if (this.isLocked.angle)
        angleRad = (this.lockedValues.angle * Math.PI) / 180;

      lx = dist * Math.cos(angleRad);
      ly = dist * Math.sin(angleRad);
    }

    if (this.isLocked.z) lz = this.lockedValues.z;

    return [
      this.origin[0] + lx * X[0] + ly * Y[0] + lz * Z[0],
      this.origin[1] + lx * X[1] + ly * Y[1] + lz * Z[1],
      this.origin[2] + lx * X[2] + ly * Y[2] + lz * Z[2],
    ];
  }

  handleInput(char) {
    if (!this.active) return false;
    const diag = this.baseController.accuDrawDiagnostics;

    if (char === 'Escape') {
      const isLocked =
        this.isLocked.x ||
        this.isLocked.y ||
        this.isLocked.dist ||
        this.isLocked.angle ||
        this.isLocked.z;
      const isTyping = this.inputActive;

      if (isLocked || isTyping) {
        if (diag)
          diag.logEvent(
            'escape',
            'clear all locks' +
              (isTyping ? ' + cancel typing "' + this.inputBuffer + '"' : '')
          );
        this.inputActive = false;
        this.inputBuffer = '';
        this.stickyFocus = false;
        this.typingMouseAnchor = null;
        this.isLocked.x = false;
        this.isLocked.y = false;
        this.isLocked.z = false;
        this.isLocked.dist = false;
        this.isLocked.angle = false;
        this.updateUiLocks();
        this.baseController.refreshMousePosition();
        return true;
      }
      return false;
    }

    if (char === 'Tab') {
      if (this.inputActive) {
        if (diag)
          diag.logEvent(
            'tab',
            'confirm "' +
              this.inputBuffer +
              '" on ' +
              this.currentAxis +
              ', then switch'
          );
        this.confirmInput();
      }
      this.stickyFocus = true;
      this.typingMouseAnchor = null;
      const prevAxis = this.currentAxis;
      if (this.mode === 'rectangular') {
        this.currentAxis = this.currentAxis === 'x' ? 'y' : 'x';
      } else if (this.mode === 'polar') {
        this.currentAxis = this.currentAxis === 'dist' ? 'angle' : 'dist';
      } else {
        const order = ['x', 'y', 'dist', 'angle'];
        const idx = order.indexOf(this.currentAxis);
        this.currentAxis = order[(idx + 1) % order.length];
      }
      if (diag) diag.logEvent('tab', prevAxis + ' → ' + this.currentAxis);
      this.inputActive = false;
      this.inputBuffer = '';
      if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
        this.baseController.accuDraw.ui.focusField(this.currentAxis);
      }
      return true;
    }

    if (/[0-9.\-+]/.test(char)) {
      if (!this.inputActive) {
        this.inputBuffer = '';
        this.inputActive = true;
        this.stickyFocus = true;
        this.typingMouseAnchor = { ...this.lastLocalDelta };
        if (diag)
          diag.logEvent(
            'typing:start',
            'axis=' +
              this.currentAxis +
              ' char="' +
              char +
              '" anchor=(' +
              this.lastLocalDelta.x.toFixed(3) +
              ',' +
              this.lastLocalDelta.y.toFixed(3) +
              ')'
          );
      }

      this.inputBuffer += char;

      let val = parseFloat(this.inputBuffer);
      if (!isNaN(val)) {
        if (this.mode === 'rectangular') {
          const delta =
            this.currentAxis === 'x'
              ? this.lastLocalDelta.x
              : this.lastLocalDelta.y;
          if (val > 0 && delta < 0) {
            val = -val;
          }
        }
        this.lockedValues[this.currentAxis] = val;
      } else {
        if (this.inputBuffer !== '-' && this.inputBuffer !== '.') {
          this.lockedValues[this.currentAxis] = 0;
        }
      }

      this.isLocked[this.currentAxis] = true;

      if (diag)
        diag.logEvent(
          'typing:char',
          '"' +
            this.inputBuffer +
            '" → lock ' +
            this.currentAxis +
            '=' +
            this.lockedValues[this.currentAxis]
        );

      if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
        this.baseController.accuDraw.ui.setLocked(this.currentAxis, true);
        this.baseController.accuDraw.ui.updateValues({
          [this.currentAxis]: this.inputBuffer,
        });
      }

      if (this.baseController.refreshMousePosition) {
        this.baseController.refreshMousePosition();
      }
      return true;
    }

    if (char === 'Backspace') {
      if (this.inputActive) {
        const prev = this.inputBuffer;
        this.inputBuffer = this.inputBuffer.slice(0, -1);

        if (this.inputBuffer.length === 0) {
          if (diag)
            diag.logEvent(
              'typing:clear',
              'backspaced from "' +
                prev +
                '" — cancel typing on ' +
                this.currentAxis
            );
          this.inputActive = false;
          this.stickyFocus = false;
          this.typingMouseAnchor = null;
          this.isLocked[this.currentAxis] = false;
          this.lockedValues[this.currentAxis] = 0;
        } else {
          let val = parseFloat(this.inputBuffer);
          if (!isNaN(val)) {
            if (this.mode === 'rectangular') {
              const delta =
                this.currentAxis === 'x'
                  ? this.lastLocalDelta.x
                  : this.lastLocalDelta.y;
              if (val > 0 && delta < 0) {
                val = -val;
              }
            }
            this.lockedValues[this.currentAxis] = val;
          } else {
            this.lockedValues[this.currentAxis] = 0;
          }
          if (diag)
            diag.logEvent(
              'typing:backspace',
              '"' +
                prev +
                '" → "' +
                this.inputBuffer +
                '" lock=' +
                this.lockedValues[this.currentAxis]
            );
        }

        if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
          this.baseController.accuDraw.ui.updateValues({
            [this.currentAxis]: this.inputActive
              ? this.inputBuffer
              : this.lastLocalDelta[this.currentAxis],
          });
          this.baseController.accuDraw.ui.setLocked(
            this.currentAxis,
            this.isLocked[this.currentAxis]
          );
        }

        if (this.baseController.refreshMousePosition) {
          this.baseController.refreshMousePosition();
        }
        return true;
      }
    }

    return false;
  }

  confirmInput() {
    const diag = this.baseController.accuDrawDiagnostics;
    const axis = this.currentAxis;
    const val = parseFloat(this.lockedValues[axis]);

    if (diag)
      diag.logEvent(
        'confirm',
        'axis=' +
          axis +
          ' val=' +
          (isNaN(val) ? 'NaN' : val.toFixed(4)) +
          ' buffer="' +
          this.inputBuffer +
          '"'
      );

    this.inputActive = false;
    this.stickyFocus = false;
    this.typingMouseAnchor = null;
    this.inputBuffer = '';

    if (!isNaN(val)) {
      this.lockedValues[axis] = val;
      this.isLocked[axis] = true;
    }
    this.updateUiLocks();

    if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
      this.baseController.accuDraw.ui.updateValues({
        [axis]: this.lockedValues[axis],
      });
    }
  }

  toggleLock(axis) {
    if (this.mode === 'rectangular' && (axis === 'dist' || axis === 'angle'))
      return;
    if (this.mode === 'polar' && (axis === 'x' || axis === 'y')) return;
    this.isLocked[axis] = !this.isLocked[axis];
    this.updateUiLocks();
  }

  setOrigin(newOrigin) {
    this.origin = newOrigin;
    this.isLocked.x = false;
    this.isLocked.y = false;
    this.isLocked.dist = false;
    this.isLocked.angle = false;
    this.isLocked.z = false;
    this.lockedValues = { x: 0, y: 0, z: 0, dist: 0, angle: 0 };
    this.inputActive = false;
    this.inputBuffer = '';
    this.updateUiLocks();
  }

  setRotation(matrix) {
    this.rotation = matrix;
  }

  reset() {
    this.isLocked.x = false;
    this.isLocked.y = false;
    this.isLocked.z = false;
    this.isLocked.dist = false;
    this.isLocked.angle = false;
    this.inputActive = false;
    this.inputBuffer = '';
    this.stickyFocus = false;
    this.typingMouseAnchor = null;
    this.updateUiLocks();
  }

  updateUiLocks() {
    if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
      this.baseController.accuDraw.ui.setLocked('x', this.isLocked.x);
      this.baseController.accuDraw.ui.setLocked('y', this.isLocked.y);
      this.baseController.accuDraw.ui.setLocked('dist', this.isLocked.dist);
      this.baseController.accuDraw.ui.setLocked('angle', this.isLocked.angle);
      this.baseController.accuDraw.ui.setLocked('z', this.isLocked.z);
      this.baseController.accuDraw.ui.setSmartFocus(this.currentAxis);
    }
  }

  switchMode() {
    if (this.mode === 'rectangular') this.mode = 'polar';
    else if (this.mode === 'polar') this.mode = 'mixed';
    else this.mode = 'rectangular';

    this.isLocked.x = false;
    this.isLocked.y = false;
    this.isLocked.dist = false;
    this.isLocked.angle = false;
    this.inputActive = false;
    this.stickyFocus = false;
    this.inputBuffer = '';

    if (this.baseController.accuDraw) {
      if (this.baseController.accuDraw.ui) {
        this.baseController.accuDraw.ui.setMode(this.mode);
      }
      let shapeVal = 0;
      if (this.mode === 'polar') shapeVal = 1;
      if (this.mode === 'mixed') shapeVal = 0.5;
      this.baseController.accuDraw.setSquircleAnimated(shapeVal, 0.3);
    }
  }

  handleSmartLock() {
    const diag = this.baseController.accuDrawDiagnostics;

    if (this.inputActive) {
      if (diag)
        diag.logEvent(
          'smartLock',
          'confirmInput (was typing "' +
            this.inputBuffer +
            '" on ' +
            this.currentAxis +
            ')'
        );
      this.confirmInput();
      return;
    }
    const anyPlanarLocked =
      this.isLocked.x ||
      this.isLocked.y ||
      this.isLocked.dist ||
      this.isLocked.angle;
    if (anyPlanarLocked) {
      if (diag) diag.logEvent('smartLock', 'UNLOCK all planar');
      this.isLocked.x = false;
      this.isLocked.y = false;
      this.isLocked.dist = false;
      this.isLocked.angle = false;
    } else {
      if (this.mode === 'rectangular' || this.mode === 'mixed') {
        const x = this.lastLocalDelta.x;
        const y = this.lastLocalDelta.y;
        if (Math.abs(x) > Math.abs(y)) {
          this.lockedValues.y = 0;
          this.isLocked.y = true;
          this.isLocked.x = false;
          this.isLocked.z = true;
          if (diag)
            diag.logEvent(
              'smartLock',
              'LOCK Y=0 (cursor closer to X-axis, |x|=' +
                Math.abs(x).toFixed(4) +
                ' > |y|=' +
                Math.abs(y).toFixed(4) +
                ')'
            );
        } else {
          this.lockedValues.x = 0;
          this.isLocked.x = true;
          this.isLocked.y = false;
          this.isLocked.z = true;
          if (diag)
            diag.logEvent(
              'smartLock',
              'LOCK X=0 (cursor closer to Y-axis, |y|=' +
                Math.abs(y).toFixed(4) +
                ' > |x|=' +
                Math.abs(x).toFixed(4) +
                ')'
            );
        }
      } else {
        this.lockedValues.angle =
          Math.atan2(this.lastLocalDelta.y, this.lastLocalDelta.x) *
          (180 / Math.PI);
        this.isLocked.angle = true;
        this.isLocked.dist = false;
        this.isLocked.z = true;
        if (diag)
          diag.logEvent(
            'smartLock',
            'LOCK angle=' + this.lockedValues.angle.toFixed(2) + '°'
          );
      }
    }
    this.updateUiLocks();
    this.baseController.refreshMousePosition();
  }

  onUiValueChange(axis, valueStr) {
    // Called only from direct DOM interaction (user clicked the field and typed).
    // Sets up the same typing session as handleInput but driven from the DOM side.
    this.currentAxis = axis;
    this.inputActive = true;
    this.inputBuffer = valueStr;
    this.stickyFocus = true;

    if (!this.typingMouseAnchor) {
      this.typingMouseAnchor = { ...this.lastLocalDelta };
    }

    let val = parseFloat(valueStr);
    if (!isNaN(val)) {
      if (this.mode === 'rectangular') {
        const delta =
          axis === 'x' ? this.lastLocalDelta.x : this.lastLocalDelta.y;
        if (val > 0 && delta < 0) {
          val = -val;
        }
      }
      this.lockedValues[axis] = val;
    } else {
      if (valueStr !== '-' && valueStr !== '.') {
        this.lockedValues[axis] = 0;
      }
    }
    this.isLocked[axis] = true;
    if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
      this.baseController.accuDraw.ui.setLocked(axis, true);
    }
    if (this.baseController.refreshMousePosition) {
      this.baseController.refreshMousePosition();
    }
  }

  notifyExplicitEdit(axis, currentValue) {
    if (!this.inputActive) {
      this.inputActive = true;
      this.inputBuffer = currentValue;
      this.currentAxis = axis;
      this.isLocked[axis] = true;
      this.updateUiLocks();
    }
  }

  isInputActive(axis) {
    return this.inputActive && this.currentAxis === axis;
  }

}

