
class AccuDrawDialog {
  constructor(accuDrawInstance) {
    this.accuDraw = accuDrawInstance;
    this.inputs = {};
    this.items = [
      { key: 'dist', label: 'Dist', color: [255, 190, 0] }, // Amber
      { key: 'angle', label: 'Angle', color: [210, 0, 255] }, // Magenta
      { key: 'x', label: 'X', color: [255, 0, 0] }, // Red
      { key: 'y', label: 'Y', color: [60, 200, 0] }, // Green
      { key: 'z', label: 'Z', color: [0, 120, 255] }, // Blue
    ];

    this._injectStyles();
    this._createDialog();
    this._createInputs();
  }

  _injectStyles() {
    const css = `
      .accudraw-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        background: transparent; 
      }

      .accudraw-input-container {
        position: relative;
        display: flex;
        align-items: center;
        height: 32px;
        border: 2px solid transparent;
        border-radius: 5px;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        transition: transform 0.15s ease-out, border-color 0.1s ease-in;
        padding-right: 30px; /* Space for lock icon */
      }

      .accudraw-input-label {
        width: 50px;
        text-align: right;
        padding-right: 8px;
        font-family: 'Architects Daughter', sans-serif;
        font-weight: bold;
        color: rgba(255,255,255,0.9);
        text-shadow: 1px 1px 2px black;
        user-select: none;
      }

      .accudraw-input-field {
        flex-grow: 1;
        background: transparent;
        border: none;
        outline: none;
        color: white;
        font-family: monospace;
        font-size: 16px;
        text-shadow: 1px 1px 1px black;
        width: 100px;
      }

      .accudraw-lock-icon {
        position: absolute;
        right: 5px;
        top: 4px;
        width: 20px;
        height: 20px;
        opacity: 0;
        transform: scale(0);
        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: none;
      }

      .accudraw-input-container.locked .accudraw-lock-icon {
        opacity: 1;
        transform: scale(1);
      }

      .accudraw-input-container.focused {
        border-color: white !important; 
        box-shadow: 0 0 10px rgba(255,255,255,0.5);
      }
    `;
    applyCss(css, 'accudraw-ui-styles');
  }

  _createDialog() {
      const hostContainer = this.accuDraw?.baseController?.domElement?.parentElement || document.body;
      this.contentContainer = makeElement('div', {
        className: 'accudraw-container',
      });

      this.dialog = UITools.makeDialog({
        title: 'AccuDraw',
        width: '240px',
        height: 'auto',
        content: this.contentContainer,
        transparent: true,
        position: [100, 100],
        titleBarAtBottom: true,
        appendTo: hostContainer,
      });
    }

  _createInputs() {
    this.items.forEach((item) => {
      const inputObj = new AccuDrawInput(item.label, item.color, this);
      this.inputs[item.key] = inputObj;
      this.contentContainer.appendChild(inputObj.container);
    });
  }

  setFocus(focusedInputObj) {
    // Animate the focused one up and others down
    Object.values(this.inputs).forEach((input) => {
      input.setFocusState(input === focusedInputObj);
    });
  }

  updateValues(values) {
    for (const [key, val] of Object.entries(values)) {
      if (this.inputs[key]) {
        this.inputs[key].setValue(val);
      }
    }
  }

  focusField(fieldName) {
    if (this.inputs[fieldName]) {
      this.inputs[fieldName].inputElem.focus();
    }
  }

  show() {
    this.dialog.element.style.display = 'block';
  }

  hide() {
    this.dialog.element.style.display = 'none';
  }

  toggle() {
    if (this.dialog.element.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

}

