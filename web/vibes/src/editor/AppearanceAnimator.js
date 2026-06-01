// phase2-managed-migration: internal imports/exports stripped
// phase1-global-rewrite: internal imports/exports stripped
class AppearanceAnimator {
  constructor(appearanceManager, controlsMap, onStopComplete) {
    this.appearanceManager = appearanceManager;
    this.controlsMap = controlsMap;
    this.onStopComplete = onStopComplete;
    this.originalSettings = null;
    this.isRunning = false;
    this.animationFrameId = null;
    this.pickerIntervalId = null;
    this.activeTweens = new Map();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.originalSettings = this.appearanceManager.getCurrentSettings();
    this.pickerIntervalId = setInterval(() => this.pickNewTweens(), 1800);
    this.pickNewTweens();
    this.animationLoop();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.pickerIntervalId);
    this.pickerIntervalId = null;
    const settingsToRestore = {
      ...this.appearanceManager.getCurrentSettings(),
    };
    this.activeTweens.clear();
    for (const key in this.originalSettings) {
      if (settingsToRestore[key] !== this.originalSettings[key]) {
        this.startTween(key, this.originalSettings[key], 1500);
      }
    }
    if (this.activeTweens.size === 0 && this.onStopComplete) {
      this.onStopComplete();
    }
  }

  animationLoop() {
    this.updateTweens();
    if (!this.isRunning && this.activeTweens.size === 0) {
      for (const key in this.originalSettings) {
        this.appearanceManager.settings[key] = this.originalSettings[key];
        const control = this.controlsMap.get(key);
        if (control) {
          control.input.value = this.originalSettings[key];
          if (control.display)
            control.display.textContent = parseFloat(
              this.originalSettings[key]
            ).toFixed(2);
        }
      }
      this.appearanceManager.notifySubscribers();
      this.animationFrameId = null;
      if (this.onStopComplete) {
        this.onStopComplete();
      }
      return;
    }
    this.animationFrameId = requestAnimationFrame(() => this.animationLoop());
  }

  updateTweens() {
    const now = performance.now();
    let needsNotification = false;
    for (const [key, tween] of this.activeTweens.entries()) {
      const elapsed = now - tween.startTime;
      const progress = Math.min(elapsed / tween.duration, 1);
      let currentValue;
      if (tween.isColor) {
        currentValue = this.lerpColor(
          tween.startValue,
          tween.endValue,
          progress
        );
      } else {
        currentValue =
          tween.startValue + (tween.endValue - tween.startValue) * progress;
      }
      this.appearanceManager.settings[key] = currentValue;
      const control = this.controlsMap.get(key);
      if (control) {
        control.input.value = currentValue;
        if (control.display) {
          control.display.textContent = currentValue.toFixed(2);
        }
      }
      needsNotification = true;
      if (progress >= 1) {
        this.activeTweens.delete(key);
      }
    }
    if (needsNotification) {
      this.appearanceManager.notifySubscribers();
    }
  }

  pickNewTweens() {
    if (!this.isRunning) return;
    const allKeys = Array.from(this.controlsMap.keys());
    const availableKeys = allKeys.filter((key) => !this.activeTweens.has(key));
    const colorKeys = availableKeys.filter(
      (key) => this.controlsMap.get(key)?.input.type === 'color'
    );
    const sliderKeys = availableKeys.filter(
      (key) => this.controlsMap.get(key)?.input.type === 'range'
    );
    colorKeys.sort(() => 0.5 - Math.random());
    sliderKeys.sort(() => 0.5 - Math.random());
    const keysToAnimate = [...colorKeys.slice(0, 3), ...sliderKeys.slice(0, 4)];
    for (const key of keysToAnimate) {
      const control = this.controlsMap.get(key);
      if (!control) continue;
      let targetValue;
      if (control.input.type === 'color') {
        targetValue = this.generatePleasingColor();
      } else if (control.input.type === 'range') {
        const min = parseFloat(control.input.min);
        const max = parseFloat(control.input.max);
        targetValue = min + Math.random() * (max - min);
      }
      if (targetValue !== undefined) {
        this.startTween(key, targetValue, 1500 + Math.random() * 1000);
      }
    }
  }

  startTween(key, targetValue, duration) {
    const startValue = this.appearanceManager.get(key);
    const isColor =
      typeof startValue === 'string' && startValue.startsWith('#');
    this.activeTweens.set(key, {
      startTime: performance.now(),
      duration,
      startValue,
      endValue: targetValue,
      isColor,
    });
  }

  generatePleasingColor() {
    const hue = Math.random() * 360;
    const saturation = 60 + Math.random() * 30;
    const lightness = 50 + Math.random() * 20;
    return this.hslToHex(hue, saturation, lightness);
  }

  hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  lerpColor(a, b, amount) {
    const ah = parseInt(a.replace(/#/g, ''), 16),
      ar = ah >> 16,
      ag = (ah >> 8) & 0xff,
      ab = ah & 0xff,
      bh = parseInt(b.replace(/#/g, ''), 16),
      br = bh >> 16,
      bg = (bh >> 8) & 0xff,
      bb = bh & 0xff,
      rr = ar + amount * (br - ar),
      rg = ag + amount * (bg - ag),
      rb = ab + amount * (bb - ab);
    return (
      '#' +
      (((1 << 24) + (rr << 16) + (rg << 8) + rb) | 0).toString(16).slice(1)
    );
  }

    


  static _doc_overview() {
      return "### AppearanceAnimator\n\nAnimates the active UI theme elements over time, allowing smooth tweening of color values and other ranges. Primarily used for visual flair and theme transitions.";
    }

  static _doc_animation() {
      return "## Tweening and HSL Color Blending\n\n- **Tween Loop**: Runs a continuous `requestAnimationFrame` loop that interpolates active theme variables smoothly.\n- **HSL Color Blending**: Rather than picking random RGB values, it generates pastel targets within specific HSL thresholds. It blends hex codes mathematically via `lerpColor`, providing a smooth color-fade effect.";
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_features()
      ].join('\n\n');
    }

  

  static _doc_features() {
      return "### Features\n\n- **Procedural Transitions**: Generates pleasing color themes in HSL and smoothly interpolates (lerps) active UI properties.\n- **Automatic Restoration**: Remembers initial theme properties and gracefully restores them on stop.";
    }
}

