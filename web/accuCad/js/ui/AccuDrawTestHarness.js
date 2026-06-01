class AccuDrawTestHarness {
  constructor(baseController) {
    this.baseController = baseController;
    // We assume the active UI is attached to the baseController's accuDraw instance
    this.ui = baseController.accuDraw.ui;
    this.container = null;
  }

  toggle() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    } else {
      this.show();
    }
  }

  show() {
      const hostContainer = this.baseController?.domElement?.parentElement || document.body;

      this.container = makeElement('div', {
        style: {
          position: 'absolute',
          top: '100px',
          left: '10px',
          background: 'rgba(40, 40, 40, 0.9)',
          padding: '10px',
          border: '1px solid #666',
          borderRadius: '5px',
          zIndex: '100000',
          fontFamily: 'sans-serif',
          width: '200px',
          color: '#eee',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        },
      });

      const h3 = makeElement(
        'h3',
        {
          style: {
            margin: '0 0 10px 0',
            fontSize: '14px',
            color: '#fff',
            textAlign: 'center',
          },
        },
        'AccuDraw Harness'
      );
      this.container.appendChild(h3);

      this._addBtn('Randomize Values', () => {
        const r = () => (Math.random() * 100).toFixed(4);
        this.ui.updateValues({
          x: r(),
          y: r(),
          z: r(),
        });
      });

      this._addBtn('Focus X', () => {
        const input = this._getInput('x');
        if (input) {
          this.ui.setFocus(input);
          input.inputElem.focus();
        }
      });

      this._addBtn('Focus Y', () => {
        const input = this._getInput('y');
        if (input) {
          this.ui.setFocus(input);
          input.inputElem.focus();
        }
      });

      this._addBtn('Toggle Lock X', () => {
        const input = this._getInput('x');
        if (input) input.toggleLock();
      });

      this._addBtn('Toggle Lock Y', () => {
        const input = this._getInput('y');
        if (input) input.toggleLock();
      });

      this._addBtn('Toggle Clickable', () => {
        this.ui.toggleClickable();
      });

      this._addBtn('Toggle Visibility', () => {
        this.ui.toggle();
      });

      hostContainer.appendChild(this.container);
    }

  _getInput(name) {
    // The new AccuDrawUi uses an array for inputs
    return this.ui.inputs.find((i) => i.name === name);
  }

  _addBtn(label, onClick) {
    const btn = makeElement(
      'button',
      {
        onclick: onClick,
        style: {
          display: 'block',
          marginBottom: '6px',
          width: '100%',
          padding: '6px',
          cursor: 'pointer',
          backgroundColor: '#555',
          color: '#fff',
          border: '1px solid #777',
          borderRadius: '3px',
          fontSize: '12px',
        },
      },
      label
    );

    // Hover effect via JS since we're inline
    btn.onmouseover = () => (btn.style.backgroundColor = '#666');
    btn.onmouseout = () => (btn.style.backgroundColor = '#555');

    this.container.appendChild(btn);
  }

  destroy() {
      if (this.container && this.container.isConnected) {
        this.container.remove();
      }
    }

}

