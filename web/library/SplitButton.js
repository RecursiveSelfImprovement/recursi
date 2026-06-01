class SplitButton {
  constructor(options = {}) {
    this.label = options.label || 'Action';
    this.mainAction = options.mainAction || (() => {});
    this.dropdownItems = options.dropdownItems || []; // Array of { label, onClick }
    this.tooltip = options.tooltip || '';
    this.id = options.id || '';
    this.mainBtnClass = options.mainBtnClass || '';

    this.element = this.render();
  }



  setLabel(newLabel) {
    this.mainBtn.textContent = newLabel;
  }

  setDisabled(disabled) {
    this.mainBtn.disabled = disabled;
    this.triggerBtn.disabled = disabled;
    this.element.style.opacity = disabled ? '0.5' : '1';
  }

  render() {
    const container = makeElement('div', {
      className: 'split-btn-group',
      id: this.id,
      title: this.tooltip,
    });

    this.mainBtn = makeElement(
      'button',
      {
        className: `main-btn ${this.mainBtnClass}`,
        'aria-label':
          this.label.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim() ||
          this.label,
        onclick: (e) => {
          e.stopPropagation();
          this.mainAction(e);
        },
      },
      this.label
    );

    this.triggerBtn = makeElement(
      'button',
      {
        className: 'options-btn',
        'aria-label': 'More options',
        'aria-haspopup': 'true',
        'aria-expanded': 'false',
        onclick: (e) => {
          e.stopPropagation();
          this._showDropdown();
        },
      },
      '⋮'
    );

    container.appendChild(this.mainBtn);

    if (this.dropdownItems.length > 0) {
      container.appendChild(this.triggerBtn);
    }

    return container;
  }

  _showDropdown() {
    if (this.triggerBtn) {
      this.triggerBtn.setAttribute('aria-expanded', 'true');
    }
    new DropdownMenu({
      targetElement: this.triggerBtn,
      items: this.dropdownItems,
      onClose: () => {
        if (this.triggerBtn) {
          this.triggerBtn.setAttribute('aria-expanded', 'false');
          this.triggerBtn.focus(); // Return focus to trigger after menu closes
        }
      },
    });
  }


  

  
}


