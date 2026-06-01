
class HarnessSettingsManager {
  constructor(app) {
    this.app = app;
    this.settings = {};
    this.styleTagId = 'harness-dynamic-styles';
    this.storageKey = 'comment-harness-settings';
    this.onUpdateCallback = null;
  }

  static get defaults() {
    // The Test Harness now reads the defaults directly from the production styles file.
    return CommentStyles.defaultSettings;
  }

  load() {
    // DISABLED LOCAL STORAGE
    // Always load fresh defaults from the code to ensure WYSIWYG accuracy.
    this.settings = { ...HarnessSettingsManager.defaults };
    return this.settings;
  }

  save() {
    // DISABLED LOCAL STORAGE
    // Settings are now transient (in-memory only) for the session.
    // They will reset on page reload.
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value, noApply = false) {
    this.settings[key] = value;
    this.save();
    if (!noApply) {
      this.apply();
    }
  }

  reset() {
    // Just reload the code defaults
    this.load();
    this.apply();
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  importSettings(jsonString) {
    try {
      const newSettings = JSON.parse(jsonString);
      const defaults = HarnessSettingsManager.defaults;
      // Merge imported settings over the defaults to ensure all keys are present
      this.settings = { ...defaults, ...newSettings };
      this.save();
      this.apply();
      if (this.onUpdateCallback) {
        this.onUpdateCallback();
      }
    } catch (e) {
      alert('Error parsing settings JSON: ' + e.message);
      console.error('Settings import error:', e);
    }
  }

  apply() {
    // Delegate entirely to the main App's theme engine.
    // This ensures consistency between the test harness and production usage.
    this.app.applyTheme(this.settings);
  }

  getChangedSettings() {
    const defaults = HarnessSettingsManager.defaults;
    const current = this.settings;
    const changed = {};

    for (const key in current) {
      if (current.hasOwnProperty(key)) {
        if (current[key] !== defaults[key]) {
          changed[key] = current[key];
        }
      }
    }
    return changed;
  }

  _hexToRgba(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return (
        'rgba(' +
        [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') +
        ',' +
        alpha +
        ')'
      );
    }
    return hex; // Fallback
  }

}

