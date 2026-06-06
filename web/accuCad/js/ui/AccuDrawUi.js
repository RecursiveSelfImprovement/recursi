class AccuDrawUi {
  constructor(accuDrawInstance) {
    this.accuDraw = accuDrawInstance;
    this.inputs = [];
    this.isClickable = false;

    this.fieldsDef = [
      { name: 'dist', color: [255, 190, 0] },
      { name: 'angle', color: [210, 0, 255] },
      { name: 'x', color: [255, 0, 0] },
      { name: 'y', color: [60, 200, 0] },
      { name: 'z', color: [0, 120, 255] },
    ];

    this._injectStyles();
    this._createElements();

    const container =
      this.accuDraw?.baseController?.domElement?.parentElement || document.body;
    const parentWidth = container.clientWidth || window.innerWidth;

    const startX = parentWidth - 280;
    const startY = 60;
    this.setPosition(startX, startY);

    this.setClickable(false);
    this.setMode('rectangular');
  }

  _injectStyles() {
      const css = `
        .accudrawOuterBox {
          position: absolute; top: 0; left: 0; z-index: 20000; pointer-events: none;
        }
        .accudrawDragger {
          position: absolute; overflow: hidden; top: 0; left: 0;
          width: 32px; height: 35px; background-color: rgba(0, 0, 0, 0);
          border-radius: 5px; transition: .12s ease-out; cursor: grab; pointer-events: auto;
        }
        .accudrawDragger:active { cursor: grabbing; }
        .accudrawDragger.stickyFullBox {
          width: 225px; height: 164px; background-color: rgba(0, 0, 0, .5); border-radius: 5px;
        }
        .accudrawDragger.stickyFullBox:hover { background-color: rgba(0, 0, 0, .6); }
        .accudrawIcon {
          position: absolute; top: -32px; left: -32px; width: 100px; height: 100px;
          transform-origin: center center; opacity: .8; transform: scale3d(.25, .25, 1);
          transition: .12s ease-out; pointer-events: none;
        }
        .accudrawDragger:hover .accudrawIcon, .accudrawDragger.stickyFullBox .accudrawIcon {
          opacity: 1; transform: scale3d(.3, .3, 1);
        }
        .accudrawTitle {
          position: absolute; top: 9px; left: 34px; line-height: 24px;
          font-size: 15px; font-family: 'Architects Daughter', sans-serif;
          text-shadow: 2px 2px 2px #000; color: #bbb; pointer-events: none;
          white-space: nowrap; opacity: 0; transition: opacity 0.2s;
        }
        .accudrawDragger.stickyFullBox .accudrawTitle { opacity: 1; }
        .accudrawAllInputsContainer {
          position: absolute; top: 36px; left: 10px; height: 122px; width: 208px;
          pointer-events: none; overflow: visible !important;
        }
        .accudrawAllInputsContainer.interactive { pointer-events: auto; }
        .accudrawInputContainer {
          position: absolute; padding: -4px 8px 2px 8px; width: 200px; height: 32px;
          border: 2px solid rgba(255, 255, 255, 0); border-radius: 5px;
          box-shadow: 2px 2px 2px #000; transition: transform .15s ease-out, opacity .1s ease-in, border-color .1s ease-in;
          transform-origin: center center; transform: scale3d(1, 1, 1);
          display: block; overflow: visible !important;
        }
        .accudrawInput {
          background-color: rgba(0, 0, 0, 0); outline: none; border: none;
          width: 100%; height: 100%; position: absolute; left: 0px; top: 0px;
          line-height: 32px; font-size: 25px; font-family: rounded, sans-serif;
          text-align: left; text-shadow: 2px 2px 2px #000; color: #eee; padding-left: 8px;
        }

        /* LOCK STYLING - RIGHT: -4px ALLOWS IT TO TOUCH AND SLIGHTLY OVERLAP THE RIGHT CONTAINER BORDER */
        div.lock {
          display: none;
          width: 28px; height: 34px;
          position: absolute;
          top: -1px; right: -4px; 
          pointer-events: none;
          opacity: 0;
          transform-origin: 50% 50%;
          transform: scale3d(0, 0, 1);
          z-index: 200002;
          border: none;
        }
        div.lock div.lockColor {
          width: 26px; height: 20px; position: absolute;
          left: 1px; top: 14px; border-radius: 6px;
          background-color: rgba(100, 100, 100, .7);
          box-shadow: 1px 1px 1px #000;
        }
        div.lock img {
          width: 28px; height: 34px; position: absolute; left: 0; top: 0;
        }
      `;
      applyCss(css, 'accudraw-legacy-styles');
    }

  _createElements() {
    this.draggerBox = makeElement(
      'div',
      { className: 'accudrawDragger' },
      makeElement('img', {
        src: 'https://recursi.dev/resources/accudraw-small.png',
        className: 'accudrawIcon',
      }),
      makeElement('div', { className: 'accudrawTitle' }, 'accudraw')
    );

    this.inputsContainer = makeElement('div', {
      className: 'accudrawAllInputsContainer',
    });

    this.outerBox = makeElement(
      'div',
      { className: 'accudrawOuterBox' },
      this.draggerBox,
      this.inputsContainer
    );

    const spacing = 41;
    this.fieldsDef.forEach((def, index) => {
      const input = new AccuDrawInput(def.name, def.color, this);
      input.outerElem.style.top = `${index * spacing}px`;
      this.inputs.push(input);
      this.inputsContainer.appendChild(input.outerElem);
    });

    const container =
      this.accuDraw?.baseController?.domElement?.parentElement || document.body;
    container.appendChild(this.outerBox);
    this._setupDrag();
  }

  _setupDrag() {
    this.dragState = { active: false, offsetX: 0, offsetY: 0, moved: false };

    const onDown = (e) => {
      if (!this.draggerBox.contains(e.target)) return;

      e.preventDefault();
      this.dragState.active = true;
      this.dragState.moved = false;

      const rect = this.outerBox.getBoundingClientRect();
      this.dragState.offsetX = e.clientX - rect.left;
      this.dragState.offsetY = e.clientY - rect.top;

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };

    const onMove = (e) => {
      if (!this.dragState.active) return;
      this.dragState.moved = true;

      // Use offsetParent boundaries instead of window bounds if within relative container
      const parentRect = this.outerBox.offsetParent
        ? this.outerBox.offsetParent.getBoundingClientRect()
        : {
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          };

      const x = e.clientX - parentRect.left - this.dragState.offsetX;
      const y = e.clientY - parentRect.top - this.dragState.offsetY;
      this.setPosition(x, y);
    };

    const onUp = (e) => {
      if (!this.dragState.active) return;
      this.dragState.active = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      if (!this.dragState.moved) {
        this.toggleClickable();
      }
    };

    this.draggerBox.addEventListener('mousedown', onDown);
  }

  setPosition(x, y) {
    this.outerBox.style.left = `${x}px`;
    this.outerBox.style.top = `${y}px`;
  }

  setClickable(isClickable) {
    this.isClickable = isClickable;
    if (this.isClickable) {
      this.inputsContainer.classList.add('interactive');
      this.draggerBox.classList.add('stickyFullBox');
      // Expand height to fit 3 inputs
      this.draggerBox.style.height = '164px';
    } else {
      this.inputsContainer.classList.remove('interactive');
      this.draggerBox.classList.remove('stickyFullBox');
      // Shrink to icon only
      this.draggerBox.style.height = '35px';

      if (
        document.activeElement &&
        this.inputsContainer.contains(document.activeElement)
      ) {
        document.activeElement.blur();
      }
    }
  }

  toggleClickable() {
    this.setClickable(!this.isClickable);
  }

  setFocus(activeInput) {
    this.inputs.forEach((input) => {
      input.setFocusState(input === activeInput);
    });
  }

  updateValues(values) {
    this.inputs.forEach((input) => {
      if (values[input.name] !== undefined) {
        input.setValue(values[input.name]);
      }
    });
  }

  show() {
    this.outerBox.style.display = 'block';
  }

  hide() {
    this.outerBox.style.display = 'none';
  }

  toggle() {
    this.outerBox.style.display =
      this.outerBox.style.display === 'none' ? 'block' : 'none';
  }

  setSmartFocus(fieldName) {
    // Visual highlight based on mouse direction
    this.inputs.forEach((input) => {
      input.setSmartFocus(input.name === fieldName);
    });
  }

  setLocked(fieldName, isLocked) {
    const input = this.inputs.find((i) => i.name === fieldName);
    if (input) input.setLocked(isLocked);
  }

  setMode(mode) {
    // Show/Hide inputs based on mode
    this.inputs.forEach((input) => {
      if (input.name === 'z') {
        // Z is always visible in 3D views
        input.outerElem.style.display = 'block';
        return;
      }

      if (mode === 'rectangular') {
        if (input.name === 'x' || input.name === 'y') {
          input.outerElem.style.display = 'block';
        } else {
          input.outerElem.style.display = 'none';
        }
      } else if (mode === 'polar') {
        if (input.name === 'dist' || input.name === 'angle') {
          input.outerElem.style.display = 'block';
        } else {
          input.outerElem.style.display = 'none';
        }
      } else if (mode === 'mixed') {
        // Mixed: Show all
        input.outerElem.style.display = 'block';
      }
    });

    // Re-layout positions of visible inputs
    const visibleInputs = this.inputs.filter(
      (i) => i.outerElem.style.display !== 'none'
    );
    const spacing = 41;
    visibleInputs.forEach((input, index) => {
      input.outerElem.style.top = `${index * spacing}px`;
    });

    // Adjust background box height if currently expanded
    if (this.isClickable) {
      // approximate height calculation: icon header + rows
      this.draggerBox.style.height = `${35 + visibleInputs.length * 43}px`;
    }
  }

  handleInputChange(name, value) {
    if (this.accuDraw && this.accuDraw.accuDrawLogic) {
      this.accuDraw.accuDrawLogic.onUiValueChange(name, value);
    }
  }

  focusField(fieldName) {
      const input = this.inputs.find((i) => i.name === fieldName);
      if (input) {
        input.outerElem.style.pointerEvents = 'auto';
        input.inputElem.style.pointerEvents = 'auto';
        input.inputElem.focus({ preventScroll: true });
      }
    }

  destroy() {
    if (this.outerBox && this.outerBox.isConnected) {
      this.outerBox.remove();
    }
  }
}