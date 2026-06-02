
class ScratchyTemplateSelector {
  constructor(app) {
      this._app = app;
      this._isOpen = false;
      this._dropdown = null;
      this._selectedTemplate = null;
      this._isCustomProject = false;
      this._customName = null;
      this._rendered = false;
      this._templates = [
        {
          name: 'Blank Canvas',
          file: 'empty.sb3',
          description: 'An empty project with a single blank sprite. Start from scratch.',
        },
        {
          name: 'Story Starter',
          file: 'empty.sb3',
          description: 'Two sprites with a backdrop - great for dialogue and narration projects.',
        },
        {
          name: 'Platformer Kit',
          file: 'empty.sb3',
          description: 'A sprite with basic gravity and movement blocks. Jump right into game building.',
        },
        {
          name: 'Art Studio',
          file: 'empty.sb3',
          description: 'Pen-based drawing template with color controls and stamp tools ready to go.',
        },
        {
          name: 'Quiz Show',
          file: 'empty.sb3',
          description: 'Ask-and-answer framework with scoring. Perfect for trivia and learning games.',
        },
        {
          name: 'Animation Lab',
          file: 'empty.sb3',
          description: 'Multiple costumes and frame-by-frame setup for flipbook-style animations.',
        }
      ];
      this._selectedTemplate = this._templates[0];
    }

  getSelectedTemplate() {
    return this._selectedTemplate;
  }

  getSelectedFile() {
      return this._selectedTemplate ? this._selectedTemplate.file : '/Scratchy/empty.sb3';
    }

  getSelectedName() {
    if (this._isCustomProject && this._customName) return this._customName;
    return this._selectedTemplate
      ? this._selectedTemplate.name
      : 'Blank Canvas';
  }

  setCustomProject(name) {
    this._isCustomProject = true;
    this._customName = name;
    this._selectedTemplate = null;
    if (this._triggerLabel) {
      this._triggerLabel.textContent = '▾';
      this._triggerLabel.title = 'Switch template';
    }
  }

  syncName(newName) {
    const match = this._templates.find(
      (t) => t.name.toLowerCase() === newName.toLowerCase()
    );
    if (match) {
      this._selectedTemplate = match;
      this._isCustomProject = false;
      this._customName = null;
    } else {
      this._isCustomProject = true;
      this._customName = newName;
      this._selectedTemplate = null;
    }
  }

  render() {
    if (!this._rendered) {
      this._injectStyles();
      this._rendered = true;
    }

    const trigger = makeElement(
      'button',
      {
        className: 'tmpl-select-trigger',
        title: 'Choose a template',
        onclick: (e) => {
          e.stopPropagation();
          this._toggle();
        },
      },
      [makeElement('span', { className: 'tmpl-select-arrow' }, '▾')]
    );

    this._triggerLabel = trigger;

    const container = makeElement(
      'div',
      { className: 'tmpl-select-container' },
      [trigger]
    );
    this._container = container;

    document.addEventListener('click', () => this._close());

    return container;
  }

  _toggle() {
    if (this._isOpen) {
      this._close();
    } else {
      this._open();
    }
  }

  _open() {
    if (this._dropdown) this._dropdown.remove();

    const dropdown = makeElement('div', { className: 'tmpl-select-dropdown' });

    if (this._isCustomProject) {
      const customItem = makeElement(
        'div',
        {
          className: 'tmpl-select-item active custom-item',
        },
        [
          makeElement(
            'div',
            { className: 'tmpl-select-item-name' },
            this._customName || 'Your Project'
          ),
          makeElement(
            'div',
            { className: 'tmpl-select-item-desc' },
            'Currently loaded project (not a template).'
          ),
        ]
      );
      dropdown.appendChild(customItem);

      const divider = makeElement('div', {
        style: 'height:1px;background:var(--border-tab);margin:0;',
      });
      dropdown.appendChild(divider);

      const dividerLabel = makeElement(
        'div',
        {
          style:
            'padding:6px 14px 2px;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;font-family:var(--font-main);',
        },
        'Switch to template:'
      );
      dropdown.appendChild(dividerLabel);
    }

    for (const tmpl of this._templates) {
      const isActive =
        !this._isCustomProject && tmpl === this._selectedTemplate;
      const item = makeElement(
        'div',
        {
          className: 'tmpl-select-item' + (isActive ? ' active' : ''),
          onclick: (e) => {
            e.stopPropagation();
            this._select(tmpl);
          },
        },
        [
          makeElement('div', { className: 'tmpl-select-item-name' }, tmpl.name),
          makeElement(
            'div',
            { className: 'tmpl-select-item-desc' },
            tmpl.description
          ),
        ]
      );
      dropdown.appendChild(item);
    }

    this._container.appendChild(dropdown);
    this._dropdown = dropdown;
    this._isOpen = true;
  }

  _close() {
    if (this._dropdown) {
      this._dropdown.remove();
      this._dropdown = null;
    }
    this._isOpen = false;
  }

  _select(tmpl) {
    this._selectedTemplate = tmpl;
    this._isCustomProject = false;
    this._customName = null;
    this._close();

    if (this._app && this._app._loadTemplate) {
      this._app._loadTemplate(tmpl.file, tmpl.name);
    }
  }

  _injectStyles() {
    applyCss(
      `
.tmpl-select-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  z-index: 100;
  flex-shrink: 0;
}

.tmpl-select-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: var(--bg-tab-inactive);
  border: 1px solid var(--border-tab);
  border-radius: 6px;
  cursor: pointer;
  font-family: var(--font-main);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-muted);
  transition: all 0.15s;
}

.tmpl-select-trigger:hover {
  background: var(--bg-tab-active);
  border-color: var(--color-tab-active);
  color: var(--color-tab-active);
}

.tmpl-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 340px;
  max-width: 420px;
  background: var(--bg-asset-card);
  border: 1px solid var(--border-tab);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  overflow: hidden;
  animation: tmplDropIn 0.15s ease-out;
  z-index: 200;
}

@keyframes tmplDropIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.tmpl-select-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-asset);
  transition: background 0.1s;
}

.tmpl-select-item:last-child {
  border-bottom: none;
}

.tmpl-select-item:hover {
  background: var(--bg-asset-thumb);
}

.tmpl-select-item.active {
  background: var(--bg-json-btn-hover);
}

.tmpl-select-item.custom-item {
  cursor: default;
  background: var(--bg-app);
  border-bottom: none;
}

.tmpl-select-item.custom-item:hover {
  background: var(--bg-app);
}

.tmpl-select-item-name {
  font-family: var(--font-main);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 2px;
}

.tmpl-select-item-desc {
  font-family: system-ui, sans-serif;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.35;
}

.scratchy-project-title-editable {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-section-header);
  font-family: var(--font-main);
  letter-spacing: 0.5px;
  outline: none;
  border-bottom: 2px solid transparent;
  padding: 0 4px 2px;
  cursor: text;
  min-width: 60px;
  max-width: 400px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.2s;
  line-height: 1.2;
}

.scratchy-project-title-editable:hover {
  border-bottom-color: var(--border-tab);
}

.scratchy-project-title-editable:focus {
  border-bottom-color: var(--color-section-header);
  background: var(--bg-tab-inactive);
  border-radius: 4px 4px 0 0;
}
`,
      'scratchy-template-selector-styles'
    );
  }

  async loadTemplates() {
      try {
        const response = await fetch('templates.json');
        if (response.ok) {
          const list = await response.json();
          if (Array.isArray(list) && list.length > 0) {
            this._templates = list;
            this._selectedTemplate = this._templates[0];
            console.log('[TemplateSelector] Successfully loaded dynamic templates from templates.json');
          }
        }
      } catch (e) {
        console.warn('[TemplateSelector] Failed to fetch templates.json, using relative fallbacks:', e);
      }
    }
}

