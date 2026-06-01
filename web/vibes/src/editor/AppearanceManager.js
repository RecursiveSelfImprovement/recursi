
class AppearanceManager {
  
  constructor() {
    this.STORAGE_KEY = 'recursi_appearanceSettings_v1';
    this.subscribers = new Set();
    this.settings = {};
    this.animator = null;

    // FIX: Initialize styling utility
    this.appStyles = new AppStyles();

    this.load();

    // FIX: Ensure styles are applied immediately on startup
    this.notifySubscribers();
  }

  load() {
    // A comprehensive set of defaults merged from both old and new versions.
    const defaults = {
      // General & Accent CSS variables from the current version
      '--bg-primary': '#1e1e1e',
      '--bg-secondary': '#252526',
      '--bg-tertiary': '#333333',
      '--text-primary': '#d4d4d4',
      '--text-secondary': '#b0b0b0',
      '--border-color': '#4a4a4a',
      '--accent-red': '#f48771',
      '--accent-green': '#85d287',
      '--accent-blue': '#007acc',
      '--accent-purple': '#6a329f',
      '--accent-orange': '#d98e48',
      '--accent-teal': '#00bfa5',
      '--font-main': 'system-ui, sans-serif',
      '--font-monospace': 'Menlo, Monaco, "Courier New", monospace',

      // File Tree settings
      'tree.lineWidth': 2.5,
      'tree.lineRadius': 6,
      'tree.indentation': 24,
      'tree.nodeHeight': 24,
      'tree.fontSize': 0.9,
      'tree.toggleSize': 18,
      'tree.arrowShadowWidth': 6,
      'tree.arrowForegroundWidth': 2,
      'tree.lineEndpointOffset': 12,
      'tree.lineColor': '#5a5a5a',
      'tree.textColor': '#d1d4d7',
      'tree.toggleColor': '#d7ba7d',
      'tree.hoverBg': 'rgba(85, 85, 85, 0.4)',
      'tree.selectedBg': 'rgba(0, 122, 204, 0.25)',
      'tree.openBg': 'rgba(85, 85, 85, 0.7)',
      'tree.activeBg': 'rgba(0,122,204,0.25)',

      // Tabs settings
      'tabs.height': 35,
      'tabs.fontSize': 0.9,
      'tabs.borderRadius': 4,
      'tabs.inactiveBg': '#2d2d2d',
      'tabs.activeBg': '#1e1e1e',
      'tabs.hoverBg': '#3c3c3c',
      'tabs.textColor': '#9e9e9e',
      'tabs.activeTextColor': '#ffffff',
      'tabs.dirtyIndicatorColor': '#00bfa5',
      'tabs.activeBorderColor': '#007acc',

      // Dialog settings
      'dialog.bgColor': '#2a2a2e',
      'dialog.headerBgColor': '#394665',
      'dialog.borderColor': '#4a4a4a', // Default border color
      'dialog.opacity': 0.95,
      'dialog.hasGlow': true, // Default glow enabled
      'dialog.glowColor': '#00bfa5',
      'dialog.glowSize': 8,
    };

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const savedSettings = stored ? JSON.parse(stored) : {};
      this.settings = { ...defaults, ...savedSettings };
    } catch (e) {
      console.error('Failed to load appearance settings:', e);
      this.settings = defaults;
    }
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save appearance settings:', e);
    }
  }

  get(key) {
    return this.settings[key];
  }

  getSettingsFor(componentPrefix) {
    const componentSettings = {};
    for (const key in this.settings) {
      if (key.startsWith(componentPrefix)) {
        const newKey = key.substring(componentPrefix.length);
        componentSettings[newKey] = this.settings[key];
      }
    }
    return componentSettings;
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.notifySubscribers();
    this.save();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.settings);
  }

  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  notifySubscribers() {
    if (this.appStyles) {
      if (typeof this.appStyles.applyThemeVariables === 'function') {
        this.appStyles.applyThemeVariables(this.settings);
      } else {
        this.appStyles.applyDialogStyles(this.settings);
      }
    }
    this.subscribers.forEach((callback) => callback(this.settings));
  }

  showDialog() {
    const mainContent = makeElement('div', {
      className: 'appearance-dialog-content',
    });

    const controlsMap = new Map();

    const createControl = (label, type, optionKey, options = {}) => {
      const row = makeElement('div', { className: 'appearance-control-row' });
      const labelEl = makeElement('label', {}, `${label}:`);
      let inputEl;
      let valueDisplay = null;

      const liveUpdate = (newValue) => {
        this.settings[optionKey] = newValue;
        this.notifySubscribers();
      };

      if (type === 'range') {
        const { min, max, step } = options;
        valueDisplay = makeElement(
          'span',
          {},
          parseFloat(this.settings[optionKey]).toFixed(2)
        );
        inputEl = makeElement('input', {
          type: 'range',
          min,
          max,
          step,
          value: this.settings[optionKey],
          oninput: (e) => {
            const val = parseFloat(e.target.value);
            valueDisplay.textContent = val.toFixed(2);
            liveUpdate(val);
          },
        });
        row.append(labelEl, inputEl, valueDisplay);
      } else if (type === 'checkbox') {
        // New boolean toggle support
        inputEl = makeElement('input', {
          type: 'checkbox',
          checked: !!this.settings[optionKey],
          onchange: (e) => liveUpdate(e.target.checked),
        });
        // Checkboxes don't need full width, styling handled in CSS or here
        inputEl.style.justifySelf = 'start';
        row.append(labelEl, inputEl);
      } else {
        inputEl = makeElement('input', {
          type: 'color',
          value: this.settings[optionKey],
          oninput: (e) => liveUpdate(e.target.value),
        });
        row.append(labelEl, inputEl);
      }

      controlsMap.set(optionKey, { input: inputEl, display: valueDisplay });
      return row;
    };

    const generalSection = makeElement('div', {
      className: 'appearance-section',
    });
    generalSection.appendChild(makeElement('h4', {}, 'General'));
    generalSection.append(
      createControl('Primary BG', 'color', '--bg-primary'),
      createControl('Secondary BG', 'color', '--bg-secondary'),
      createControl('Tertiary BG', 'color', '--bg-tertiary'),
      createControl('Primary Text', 'color', '--text-primary'),
      createControl('Secondary Text', 'color', '--text-secondary'),
      createControl('Border Color', 'color', '--border-color')
    );

    const accentsSection = makeElement('div', {
      className: 'appearance-section',
    });
    accentsSection.appendChild(makeElement('h4', {}, 'Accents'));
    accentsSection.append(
      createControl('Accent Red', 'color', '--accent-red'),
      createControl('Accent Green', 'color', '--accent-green'),
      createControl('Accent Blue', 'color', '--accent-blue'),
      createControl('Accent Purple', 'color', '--accent-purple'),
      createControl('Accent Orange', 'color', '--accent-orange'),
      createControl('Accent Teal', 'color', '--accent-teal')
    );

    const treeSection = makeElement('div', { className: 'appearance-section' });
    treeSection.appendChild(makeElement('h4', {}, 'File Tree'));
    treeSection.append(
      createControl('Indentation', 'range', 'tree.indentation', {
        min: 12,
        max: 40,
        step: 1,
      }),
      createControl('Node Height', 'range', 'tree.nodeHeight', {
        min: 18,
        max: 32,
        step: 1,
      }),
      createControl('Font Size (em)', 'range', 'tree.fontSize', {
        min: 0.7,
        max: 1.2,
        step: 0.05,
      }),
      createControl('Toggle Size', 'range', 'tree.toggleSize', {
        min: 8,
        max: 24,
        step: 1,
      }),
      createControl('Line Width', 'range', 'tree.lineWidth', {
        min: 1,
        max: 5,
        step: 0.5,
      }),
      createControl('Line Radius', 'range', 'tree.lineRadius', {
        min: 0,
        max: 12,
        step: 1,
      }),
      createControl('Text Color', 'color', 'tree.textColor'),
      createControl('Line Color', 'color', 'tree.lineColor'),
      createControl('Arrow Color', 'color', 'tree.toggleColor'),
      createControl('Hover BG', 'color', 'tree.hoverBg'),
      createControl('Selected BG', 'color', 'tree.selectedBg'),
      createControl('Open File BG', 'color', 'tree.openBg'),
      createControl('Active Dir BG', 'color', 'tree.activeBg')
    );

    const tabsSection = makeElement('div', { className: 'appearance-section' });
    tabsSection.appendChild(makeElement('h4', {}, 'Tabs'));
    tabsSection.append(
      createControl('Tab Height', 'range', 'tabs.height', {
        min: 28,
        max: 50,
        step: 1,
      }),
      createControl('Font Size (em)', 'range', 'tabs.fontSize', {
        min: 0.8,
        max: 1.2,
        step: 0.05,
      }),
      createControl('Border Radius', 'range', 'tabs.borderRadius', {
        min: 0,
        max: 15,
        step: 1,
      }),
      createControl('Inactive BG', 'color', 'tabs.inactiveBg'),
      createControl('Active BG', 'color', 'tabs.activeBg'),
      createControl('Hover BG', 'color', 'tabs.hoverBg'),
      createControl('Text Color', 'color', 'tabs.textColor'),
      createControl('Active Text', 'color', 'tabs.activeTextColor'),
      createControl('Active Border', 'color', 'tabs.activeBorderColor'),
      createControl('Dirty Indicator', 'color', 'tabs.dirtyIndicatorColor')
    );

    const dialogSection = makeElement('div', {
      className: 'appearance-section',
    });
    dialogSection.appendChild(makeElement('h4', {}, 'Dialog Boxes'));
    dialogSection.append(
      createControl('Opacity', 'range', 'dialog.opacity', {
        min: 0.1,
        max: 1.0,
        step: 0.01,
      }),
      createControl('Background', 'color', 'dialog.bgColor'),
      createControl('Header BG', 'color', 'dialog.headerBgColor'),
      createControl('Border Color', 'color', 'dialog.borderColor'),
      createControl('Enable Glow', 'checkbox', 'dialog.hasGlow'),
      createControl('Glow Color', 'color', 'dialog.glowColor'),
      createControl('Glow Size (px)', 'range', 'dialog.glowSize', {
        min: 0,
        max: 50,
        step: 1,
      })
    );

    mainContent.append(
      generalSection,
      accentsSection,
      treeSection,
      tabsSection,
      dialogSection
    );
    mainContent.prepend(
      makeElement(
        'style',
        `
        .appearance-dialog-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; }
        .appearance-section h4 { margin-top:0; border-bottom:1px solid #444; padding-bottom:5px; }
        .appearance-control-row { display: grid; grid-template-columns: 1fr 1fr 50px; align-items: center; gap: 10px; margin-bottom: 12px; }
        .appearance-control-row label { grid-column: 1; justify-self: start; white-space: nowrap; }
        .appearance-control-row input[type=range] { grid-column: 2; width: 100%; }
        .appearance-control-row span { grid-column: 3; text-align: right; font-family: var(--font-monospace); }
        .appearance-control-row input[type=color] { grid-column: 2 / span 2; width: 100%; height: 25px; padding: 0 2px; border: none; background: none; }
        .appearance-control-row input[type=checkbox] { grid-column: 2; width: 20px; height: 20px; cursor: pointer; }
      `
      )
    );

    this.animator = new AppearanceAnimator(this, controlsMap, () => {
      const animateBtn = document.querySelector('#animate-theme-btn');
      if (animateBtn) animateBtn.textContent = 'Animate Theme';
    });

    UITools.makeDialog({
      title: 'Global Appearance Settings',
      content: mainContent,
      width: '90vw',
      buttons: [
        {
          id: 'animate-theme-btn',
          label: 'Animate Theme',
          onClick: (buttonEl) => {
            if (this.animator.isRunning) {
              this.animator.stop();
              buttonEl.textContent = 'Animate Theme';
            } else {
              this.animator.start();
              buttonEl.textContent = 'Stop Animation';
            }
            return false;
          },
        },
        {
          label: 'Save',
          className: 'primary',
          onClick: () => {
            this.save();
            return false;
          },
        },
        {
          label: 'Close',
          onClick: () => {
            if (this.animator && this.animator.isRunning) {
              this.animator.stop();
            }
          },
        },
      ],
      onClose: () => {
        if (this.animator && this.animator.isRunning) {
          this.animator.stop();
        }
      },
    });
  }

  getCurrentSettings() {
    return { ...this.settings };
  }

    static _doc_AppearanceManager() {
      return `# AppearanceManager

## Summary

Handles global theme and layout configuration for the Vibes IDE. Loads and saves settings (colors, dimensions, paddings) to \`localStorage\` under the \`recursi_appearanceSettings_v1\` key. Components can \`subscribe()\` to receive live updates when the user tweaks settings in the Appearance Dialog.`;
    }

  


  static _doc_overview() {
      return `# AppearanceManager\n\nThe \`AppearanceManager\` is the configuration manager for the IDE's visual theme variables and structural dimensions.\nIt stores settings (such as background colors, margins, fonts, line widths, and shadows) and persists them inside \`localStorage\`.`;
    }

  static _doc_theme() {
      return `## Reactive Subscription and Style Updates\n\n- **Reactive Subscription**: Exposes a \`subscribe\` pattern allowing file trees and editor controllers to register. When a user modifies a variable, the manager pushes the updated state to all subscribers immediately.\n- **CSS Injection**: Works closely with \`AppStyles\` to regenerate and inject active theme values into the document \`:root\`, repainting the entire workspace on the fly without page reloads.`;
    }

  static _doc() {
      return [
        this._doc_AppearanceManager(),
        this._doc_theme()
      ].join('\n\n');
    }
}

