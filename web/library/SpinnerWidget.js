class SpinnerWidget {
  static globalSVG = null;

  static globalTickOuter = null;

  static globalTickInner = null;

  static globalCircleOuter = null;

  static globalCircleMiddle = null;

  static globalCircleInner = null;

  static activeSpinner = null;

  static pollInterval = null;

  static pollIntervalMs = 500;

  static globalIsFastMode = false;

  static globalActive = false;

  static globalStickySpinner = null;

  static allSpinners = [];

  static currentRotation = 0;

  static targetRotation = 0;

  static currentSpinnerColor = '#0077FF';

  static globalGlowCircle = null;

  static lastRotation = 0;

  static smoothedSpeed = 0;

  static baseScale = 1.0;

  static baseOpacity = 1.0;

  static animationFrameId = null;

  static animationStartTime = null;

  static animationDuration = null;

  static animationType = null;

  static animationInitialScale = null;

  static animationInitialOpacity = null;

  static animationTargetScale = null;

  static animationTargetOpacity = null;

  static pendingAnimationCallback = null;

  static globalPaused = false;

  constructor(buttonText, callback, color = null) {
    this.callback = callback;
    this.rotation = 0;
    this.targetRotation = 0;
    this.isFastMode = false;
    this.color = color;
    this.isSticky = false;
    this.createButton(buttonText);

    this.insertSpinnerInOrder();
  }

  static setPaused(paused) {
    SpinnerWidget.globalPaused = paused;
    if (paused) {
      SpinnerWidget.removeGlobalListeners();
      SpinnerWidget.hideGlobalSVG();
    } else {
      const spinnerToShow =
        SpinnerWidget.globalStickySpinner || SpinnerWidget.activeSpinner;
      if (spinnerToShow) {
        SpinnerWidget.addGlobalListeners();
        SpinnerWidget.showGlobalSVGForSpinner(spinnerToShow);
      }
    }
  }

  static addGlobalListeners() {
    if (SpinnerWidget.globalActive || SpinnerWidget.globalPaused) return;
    document.addEventListener('keydown', SpinnerWidget.handleGlobalKeyDown);
    document.addEventListener('keyup', SpinnerWidget.handleGlobalKeyUp);
    document.addEventListener('wheel', SpinnerWidget.handleGlobalWheel, {
      passive: false,
    });
    SpinnerWidget.globalActive = true;
  }

  static removeGlobalListeners() {
    if (SpinnerWidget.globalActive) return;
    document.removeEventListener('keydown', SpinnerWidget.handleGlobalKeyDown);
    document.removeEventListener('keyup', SpinnerWidget.handleGlobalKeyUp);
    document.removeEventListener('wheel', SpinnerWidget.handleGlobalWheel);
    SpinnerWidget.globalActive = false;
  }

  static handleGlobalKeyDown(e) {
    if (!SpinnerWidget.activeSpinner && !SpinnerWidget.globalStickySpinner)
      return;

    if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      SpinnerWidget.globalIsFastMode = true;
      if (SpinnerWidget.globalTickInner) {
        SpinnerWidget.globalTickInner.setAttribute('stroke', 'yellow');
      }
    }

    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      if (!SpinnerWidget.globalStickySpinner && SpinnerWidget.activeSpinner) {
        SpinnerWidget.makeSpinnerSticky(SpinnerWidget.activeSpinner);
      }

      if (SpinnerWidget.globalStickySpinner) {
        e.preventDefault();
        e.stopPropagation();
        let idx = SpinnerWidget.allSpinners.indexOf(
          SpinnerWidget.globalStickySpinner
        );
        if (idx === -1) return;

        let newIndex;
        if (e.code === 'ArrowLeft') {
          newIndex =
            (idx - 1 + SpinnerWidget.allSpinners.length) %
            SpinnerWidget.allSpinners.length;
        } else {
          newIndex = (idx + 1) % SpinnerWidget.allSpinners.length;
        }

        SpinnerWidget.setStickySpinner(SpinnerWidget.allSpinners[newIndex]);
      }
    }
  }

  static handleGlobalKeyUp(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      SpinnerWidget.globalIsFastMode = false;
      if (SpinnerWidget.globalTickInner && SpinnerWidget.activeSpinner) {
        let tickColor = SpinnerWidget.activeSpinner.color
          ? SpinnerWidget.rgbToHex(SpinnerWidget.activeSpinner.color)
          : '#0077FF';
        SpinnerWidget.globalTickInner.setAttribute('stroke', tickColor);
      }
    }
  }

  static handleGlobalWheel(e) {
    // Use the active (hovered) spinner, but fall back to the sticky (clicked) spinner.
    // This allows MIDI control without requiring the mouse to be over the widget.
    const spinnerToControl =
      SpinnerWidget.activeSpinner || SpinnerWidget.globalStickySpinner;
    if (!spinnerToControl) return;

    if (e.metaKey || e.shiftKey || e.ctrlKey) {
      return;
    }

    e.preventDefault();
    const baseSpeed = SpinnerWidget.globalIsFastMode ? 1 : 0.1;
    const delta = e.deltaY * baseSpeed;
    SpinnerWidget.targetRotation += delta / 2;

    if (spinnerToControl.callback) {
      spinnerToControl.callback(delta);
    }
  }

  static animateGlobalSVG() {
    if (!SpinnerWidget.activeSpinner) {
      requestAnimationFrame(() => SpinnerWidget.animateGlobalSVG());
      return;
    }
    const step = 5;
    SpinnerWidget.currentRotation +=
      (SpinnerWidget.targetRotation - SpinnerWidget.currentRotation) / step;
    SpinnerWidget.updateGlobalTick();
    requestAnimationFrame(() => SpinnerWidget.animateGlobalSVG());
  }

  static updateGlobalTick() {
    if (!SpinnerWidget.activeSpinner) {
      requestAnimationFrame(() => SpinnerWidget.updateGlobalTick());
      return;
    }
    const step = 5;
    SpinnerWidget.currentRotation +=
      (SpinnerWidget.targetRotation - SpinnerWidget.currentRotation) / step;
    SpinnerWidget.updateGlobalTickElements();
    requestAnimationFrame(() => SpinnerWidget.updateGlobalTick());
  }

  static animateHoverEffect(timestamp) {
    if (!SpinnerWidget.animationStartTime) {
      SpinnerWidget.animationStartTime = timestamp;
    }

    const elapsed = timestamp - SpinnerWidget.animationStartTime;
    const progress = Math.min(elapsed / SpinnerWidget.animationDuration, 1);

    const currentScale =
      SpinnerWidget.animationInitialScale +
      (SpinnerWidget.animationTargetScale -
        SpinnerWidget.animationInitialScale) *
        progress;
    const currentOpacity =
      SpinnerWidget.animationInitialOpacity +
      (SpinnerWidget.animationTargetOpacity -
        SpinnerWidget.animationInitialOpacity) *
        progress;

    SpinnerWidget.baseScale = currentScale;
    SpinnerWidget.baseOpacity = currentOpacity;

    if (SpinnerWidget.globalSVG) {
      SpinnerWidget.globalSVG.style.opacity =
        SpinnerWidget.baseOpacity.toString();
      SpinnerWidget.globalSVG.style.transformOrigin = '50% 50%';
      SpinnerWidget.globalSVG.style.transform = `scale(${SpinnerWidget.baseScale})`;
    }

    if (progress < 1) {
      SpinnerWidget.animationFrameId = requestAnimationFrame(
        SpinnerWidget.animateHoverEffect
      );
    } else {
      SpinnerWidget.animationFrameId = null;
      SpinnerWidget.animationStartTime = null;

      if (SpinnerWidget.animationType === 'out') {
        if (SpinnerWidget.globalSVG) {
          SpinnerWidget.globalSVG.style.display = 'none';
        }
      }

      if (SpinnerWidget.pendingAnimationCallback) {
        SpinnerWidget.pendingAnimationCallback();
        SpinnerWidget.pendingAnimationCallback = null;
      }
    }
  }

  static updateGlobalTickElements() {
    if (SpinnerWidget.globalTickOuter && SpinnerWidget.globalTickInner) {
      SpinnerWidget.globalTickOuter.setAttribute(
        'transform',
        `rotate(${SpinnerWidget.currentRotation})`
      );
      SpinnerWidget.globalTickInner.setAttribute(
        'transform',
        `rotate(${SpinnerWidget.currentRotation})`
      );
    }

    const speed = Math.abs(
      SpinnerWidget.currentRotation - SpinnerWidget.lastRotation
    );
    SpinnerWidget.lastRotation = SpinnerWidget.currentRotation;
    const smoothingFactor = 0.2;
    SpinnerWidget.smoothedSpeed +=
      (speed - SpinnerWidget.smoothedSpeed) * smoothingFactor;

    const maxSpeed = 10;
    const clampedSpeed = Math.min(SpinnerWidget.smoothedSpeed, maxSpeed);
    const glowIntensity = clampedSpeed / maxSpeed;

    const speedScale = 1.0 + glowIntensity * 0.5;
    const finalScale = SpinnerWidget.baseScale * speedScale;
    if (SpinnerWidget.globalSVG) {
      SpinnerWidget.globalSVG.style.transformOrigin = '50% 50%';
      SpinnerWidget.globalSVG.style.transform = `scale(${finalScale})`;
      SpinnerWidget.globalSVG.style.opacity =
        SpinnerWidget.baseOpacity.toString();
    }

    if (SpinnerWidget.globalGlowCircle) {
      const newStrokeWidth = 53 * glowIntensity;
      SpinnerWidget.globalGlowCircle.setAttribute(
        'stroke-width',
        newStrokeWidth.toString()
      );
      SpinnerWidget.globalGlowCircle.setAttribute(
        'stroke-opacity',
        glowIntensity > 0.5 ? '1' : (glowIntensity * 2).toString()
      );

      const blurAmount = Math.round(8 * glowIntensity);
      SpinnerWidget.globalGlowCircle.style.filter =
        blurAmount > 0 ? `blur(${blurAmount}px)` : 'none';
    }

    if (SpinnerWidget.globalCircleMiddle) {
      const r = Math.round(128 + (255 - 128) * glowIntensity);
      const g = Math.round(128 + (255 - 128) * glowIntensity);
      const b = Math.round(128 + (0 - 128) * glowIntensity);
      const strokeColor = `rgb(${r}, ${g}, ${b})`;
      const strokeOpacity = 0.5 * (1 - glowIntensity);

      SpinnerWidget.globalCircleMiddle.setAttribute('stroke', strokeColor);
      SpinnerWidget.globalCircleMiddle.setAttribute(
        'stroke-opacity',
        strokeOpacity.toString()
      );
    }

    if (SpinnerWidget.globalCircleOuter) {
      SpinnerWidget.globalCircleOuter.setAttribute('stroke-opacity', '1');
    }
    if (SpinnerWidget.globalCircleInner) {
      SpinnerWidget.globalCircleInner.setAttribute('stroke-opacity', '1');
    }

    if (SpinnerWidget.globalTickOuter && SpinnerWidget.globalTickInner) {
      const outerBase = 14;
      const outerMax = 24;
      const innerBase = 12;
      const innerMax = 18;

      const outerWidth = outerBase + (outerMax - outerBase) * glowIntensity;
      const innerWidth = innerBase + (innerMax - innerBase) * glowIntensity;

      SpinnerWidget.globalTickOuter.setAttribute(
        'stroke-width',
        outerWidth.toString()
      );
      SpinnerWidget.globalTickInner.setAttribute(
        'stroke-width',
        innerWidth.toString()
      );
    }
  }

  static startAnimation(
    initialScale,
    initialOpacity,
    targetScale,
    targetOpacity,
    duration,
    type,
    callback
  ) {
    SpinnerWidget.animationInitialScale = initialScale;
    SpinnerWidget.animationInitialOpacity = initialOpacity;
    SpinnerWidget.animationTargetScale = targetScale;
    SpinnerWidget.animationTargetOpacity = targetOpacity;
    SpinnerWidget.animationDuration = duration;
    SpinnerWidget.animationType = type;
    SpinnerWidget.animationStartTime = null;
    SpinnerWidget.pendingAnimationCallback = callback || null;
    SpinnerWidget.animationFrameId = requestAnimationFrame((ts) =>
      SpinnerWidget.animateHoverEffect(ts)
    );
  }

  static cancelCurrentAnimation() {
    if (SpinnerWidget.animationFrameId) {
      cancelAnimationFrame(SpinnerWidget.animationFrameId);
      SpinnerWidget.animationFrameId = null;
    }
  }

  static showGlobalSVGForSpinner(spinner) {
    SpinnerWidget.createGlobalSVG();

    const rect = spinner.innerButton.getBoundingClientRect();
    const size = rect.height * 4.8;

    let wasHidden = SpinnerWidget.globalSVG.style.display === 'none';
    let changingSpinner =
      SpinnerWidget.activeSpinner && SpinnerWidget.activeSpinner !== spinner;

    SpinnerWidget.globalSVG.style.width = `${size}px`;
    SpinnerWidget.globalSVG.style.height = `${size}px`;
    SpinnerWidget.globalSVG.style.left = `${
      rect.left + window.scrollX - size / 2 + rect.width / 2
    }px`;
    SpinnerWidget.globalSVG.style.top = `${
      rect.top + window.scrollY - size / 2 + rect.height / 2
    }px`;
    SpinnerWidget.globalSVG.style.display = 'block';

    if (wasHidden || changingSpinner) {
      SpinnerWidget.targetRotation = 0;
      SpinnerWidget.currentRotation = 0;
    }

    SpinnerWidget.updateGlobalTickElements();

    let tickColor = spinner.color
      ? SpinnerWidget.rgbToHex(spinner.color)
      : '#0077FF';
    SpinnerWidget.globalTickInner.setAttribute(
      'stroke',
      SpinnerWidget.globalIsFastMode ? 'yellow' : tickColor
    );

    SpinnerWidget.cancelCurrentAnimation();

    function firstHalfDone() {
      SpinnerWidget.startAnimation(1.25, 1, 1.0, 1, 150, 'in');
    }

    SpinnerWidget.startAnimation(0.8, 0, 1.25, 1, 150, 'in', firstHalfDone);
  }

  getCenterPoint() {
    if (this.centerPoint) {
      return this.centerPoint;
    } else {
      const rect = this.innerButton.getBoundingClientRect();
      return {
        x: rect.left + window.scrollX + rect.width / 2,
        y: rect.top + window.scrollY + rect.height / 2,
      };
    }
  }

  update() {
    if (!this.innerButton) return;
    const rect = this.innerButton.getBoundingClientRect();

    this.centerPoint = {
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY + rect.height / 2,
    };

    if (
      SpinnerWidget.activeSpinner === this ||
      SpinnerWidget.globalStickySpinner === this
    ) {
      const size = rect.height * 4.8;
      SpinnerWidget.globalSVG.style.width = `${size}px`;
      SpinnerWidget.globalSVG.style.height = `${size}px`;
      SpinnerWidget.globalSVG.style.left = `${
        rect.left + window.scrollX - size / 2 + rect.width / 2
      }px`;
      SpinnerWidget.globalSVG.style.top = `${
        rect.top + window.scrollY - size / 2 + rect.height / 2
      }px`;
    }
  }

  static hideGlobalSVG() {
    if (SpinnerWidget.globalSVG) {
      SpinnerWidget.globalSVG.style.display = 'none';
    }
  }

  static createGlobalSVG() {
    if (SpinnerWidget.globalSVG) return;

    SpinnerWidget.globalSVG = makeElement('svg:svg', {
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        zIndex: 999999999999,
        pointerEvents: 'none',
        display: 'none',
      },
      width: '280',
      height: '280',
      viewBox: '-140 -140 280 280',
    });

    SpinnerWidget.globalCircleOuter = makeElement('svg:circle', {
      cx: 0,
      cy: 0,
      r: 88,
      stroke: 'black',
      'stroke-width': 1,
      fill: 'none',
    });

    SpinnerWidget.globalCircleMiddle = makeElement('svg:circle', {
      cx: 0,
      cy: 0,
      r: 82,
      stroke: 'rgba(128, 128, 128, 0.5)',
      'stroke-width': 12,
      fill: 'none',
    });

    SpinnerWidget.globalCircleInner = makeElement('svg:circle', {
      cx: 0,
      cy: 0,
      r: 76,
      stroke: 'black',
      'stroke-width': 1,
      fill: 'none',
    });

    SpinnerWidget.globalTickOuter = makeElement('svg:line', {
      x1: 0,
      y1: -55,
      x2: 0,
      y2: -105,
      stroke: 'black',
      'stroke-width': 14,
      'stroke-linecap': 'round',
    });

    SpinnerWidget.globalTickInner = makeElement('svg:line', {
      x1: 0,
      y1: -55,
      x2: 0,
      y2: -105,
      stroke: SpinnerWidget.currentSpinnerColor,
      'stroke-width': 12,
      'stroke-linecap': 'round',
    });

    SpinnerWidget.globalGlowCircle = makeElement('svg:circle', {
      cx: 0,
      cy: 0,
      r: 83,
      stroke: '#ff6600',
      fill: 'none',
      'stroke-width': '0',
      'stroke-opacity': '0',
      style: {
        transition: 'stroke-width 0.2s, stroke-opacity 0.2s, filter 0.2s',
      },
    });

    SpinnerWidget.globalSVG.append(
      SpinnerWidget.globalCircleOuter,
      SpinnerWidget.globalCircleMiddle,
      SpinnerWidget.globalCircleInner,
      SpinnerWidget.globalTickOuter,
      SpinnerWidget.globalTickInner,
      SpinnerWidget.globalGlowCircle
    );
    document.body.appendChild(SpinnerWidget.globalSVG);

    requestAnimationFrame(() => SpinnerWidget.animateGlobalSVG());
  }

  static startPollingIfNeeded() {
    if (SpinnerWidget.pollInterval) return;
    SpinnerWidget.pollInterval = setInterval(
      () => SpinnerWidget.pollSpinners(),
      SpinnerWidget.pollIntervalMs
    );
  }

  static stopPollingIfNoStickyOrActive() {
    if (
      !SpinnerWidget.globalStickySpinner &&
      !SpinnerWidget.activeSpinner &&
      SpinnerWidget.pollInterval
    ) {
      clearInterval(SpinnerWidget.pollInterval);
      SpinnerWidget.pollInterval = null;
    }
  }

  static pollSpinners() {
    for (let i = SpinnerWidget.allSpinners.length - 1; i >= 0; i--) {
      let sp = SpinnerWidget.allSpinners[i];
      if (!sp.outerButton.isConnected) {
        if (sp === SpinnerWidget.globalStickySpinner) {
          SpinnerWidget.globalStickySpinner = null;
        }
        if (sp === SpinnerWidget.activeSpinner) {
          SpinnerWidget.activeSpinner = null;
          SpinnerWidget.hideGlobalSVG();
          SpinnerWidget.removeGlobalListeners();
        }
        SpinnerWidget.allSpinners.splice(i, 1);
      }
    }

    if (!SpinnerWidget.globalStickySpinner && !SpinnerWidget.activeSpinner) {
      SpinnerWidget.stopPollingIfNoStickyOrActive();
    }
  }

  static makeSpinnerSticky(spinner) {
    if (
      SpinnerWidget.globalStickySpinner &&
      SpinnerWidget.globalStickySpinner !== spinner
    ) {
      SpinnerWidget.globalStickySpinner.isSticky = false;
      SpinnerWidget.globalStickySpinner.resetButtonColor();
    }
    spinner.isSticky = true;
    SpinnerWidget.globalStickySpinner = spinner;
    SpinnerWidget.showGlobalSVGForSpinner(spinner);
    spinner.lightenButton();
    SpinnerWidget.addGlobalListeners();
    SpinnerWidget.activeSpinner = spinner;
    SpinnerWidget.startPollingIfNeeded();
  }

  static clearStickySpinner() {
    if (SpinnerWidget.globalStickySpinner) {
      SpinnerWidget.globalStickySpinner.isSticky = false;
      SpinnerWidget.globalStickySpinner.resetButtonColor();
      SpinnerWidget.globalStickySpinner = null;
    }
  }

  static setStickySpinner(spinner) {
    SpinnerWidget.clearStickySpinner();
    SpinnerWidget.makeSpinnerSticky(spinner);
  }

  static rgbToHex(rgbArray) {
    return (
      '#' +
      rgbArray
        .map((c) => {
          const hex = c.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  static lightenColor(colorHex, amount) {
    let color = colorHex.substring(1);
    let num = parseInt(color, 16);

    let r = (num >> 16) + amount;
    r = r > 255 ? 255 : r;
    let g = ((num >> 8) & 0x00ff) + amount;
    g = g > 255 ? 255 : g;
    let b = (num & 0x0000ff) + amount;
    b = b > 255 ? 255 : b;

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  insertSpinnerInOrder() {
    let inserted = false;
    for (let i = 0; i < SpinnerWidget.allSpinners.length; i++) {
      let cmp = this.outerButton.compareDocumentPosition(
        SpinnerWidget.allSpinners[i].outerButton
      );
      if (cmp & Node.DOCUMENT_POSITION_FOLLOWING) {
        SpinnerWidget.allSpinners.splice(i, 0, this);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      SpinnerWidget.allSpinners.push(this);
    }
  }

  createButton(text) {
    let backgroundColor = '#0077FF';
    if (this.color) {
      backgroundColor = SpinnerWidget.rgbToHex(this.color);
    }

    this.outerButton = makeElement('div', {
      style: {
        display: 'inline-block',
        margin: '0',
        padding: '10px',
        position: 'relative',
      },
    });

    this.innerButton = makeElement(
      'div',
      {
        style: {
          minWidth: '60px',
          padding: '4px 7px',
          backgroundColor: 'transparent',
          color: backgroundColor,
          border: `1px solid ${backgroundColor}80`,
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '14px',
          textAlign: 'center',
          fontWeight: 'normal',
          transition: 'all 0.2s ease-out',
          boxShadow: 'none',
          textShadow: 'none',
        },
      },
      text
    );

    this.outerButton.appendChild(this.innerButton);

    this.originalBackgroundColor = backgroundColor;

    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleClick = this.handleClick.bind(this);

    this.outerButton.addEventListener('mouseenter', this.handleMouseEnter);
    this.outerButton.addEventListener('mouseleave', this.handleMouseLeave);
    this.outerButton.addEventListener('click', this.handleClick);
  }

  handleMouseEnter() {
    if (SpinnerWidget.globalPaused) return;
    if (
      SpinnerWidget.globalStickySpinner &&
      SpinnerWidget.globalStickySpinner !== this
    ) {
      return;
    }

    SpinnerWidget.activeSpinner = this;
    SpinnerWidget.showGlobalSVGForSpinner(this);
    this.lightenButton();
    SpinnerWidget.addGlobalListeners();
    SpinnerWidget.startPollingIfNeeded();
  }

  handleMouseLeave() {
    if (this.isSticky) return;
    if (SpinnerWidget.activeSpinner === this) {
      SpinnerWidget.activeSpinner = null;
    }
    this.hideIfNoSticky();
    this.resetButtonColor();
  }

  handleClick() {
    if (this.isSticky) {
      this.isSticky = false;
      if (SpinnerWidget.globalStickySpinner === this) {
        SpinnerWidget.globalStickySpinner = null;
      }
      if (SpinnerWidget.activeSpinner === this) {
        SpinnerWidget.activeSpinner = null;
      }
      this.hideIfNoSticky();
      this.resetButtonColor();
    } else {
      if (
        SpinnerWidget.globalStickySpinner &&
        SpinnerWidget.globalStickySpinner !== this
      ) {
        SpinnerWidget.globalStickySpinner.isSticky = false;
        SpinnerWidget.globalStickySpinner.resetButtonColor();
        SpinnerWidget.globalStickySpinner = null;

        SpinnerWidget.activeSpinner = this;
        SpinnerWidget.showGlobalSVGForSpinner(this);
        this.lightenButton();
        SpinnerWidget.addGlobalListeners();
        SpinnerWidget.startPollingIfNeeded();
      } else {
        this.isSticky = true;
        SpinnerWidget.globalStickySpinner = this;
        SpinnerWidget.activeSpinner = this;
        SpinnerWidget.showGlobalSVGForSpinner(this);
        this.lightenButton();
        SpinnerWidget.addGlobalListeners();
        SpinnerWidget.startPollingIfNeeded();
      }
    }
  }

  hideIfNoSticky() {
    if (!SpinnerWidget.globalStickySpinner && !SpinnerWidget.activeSpinner) {
      SpinnerWidget.hideGlobalSVG();
      SpinnerWidget.removeGlobalListeners();
    }
  }

  lightenButton() {
    const glowColor = SpinnerWidget.lightenColor(
      this.originalBackgroundColor,
      30
    );
    this.innerButton.style.borderColor = `${glowColor}`;
    this.innerButton.style.color = glowColor;
    this.innerButton.style.boxShadow = `0 0 8px ${glowColor}40`;
    this.innerButton.style.textShadow = `0 0 4px ${glowColor}40`;
  }

  resetButtonColor() {
    this.innerButton.style.borderColor = `${this.originalBackgroundColor}80`;
    this.innerButton.style.color = this.originalBackgroundColor;
    this.innerButton.style.boxShadow = 'none';
    this.innerButton.style.textShadow = 'none';
  }

  static adjustColor(colorHex, opacity = 1) {
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  appendTo(parent) {
    parent.appendChild(this.outerButton);
  }

  static get stickySpinner() {
    return SpinnerWidget.globalStickySpinner;
  }

  static get allSpinnersList() {
    return SpinnerWidget.allSpinners;
  }


  

  
}
