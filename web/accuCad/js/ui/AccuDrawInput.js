class AccuDrawInput {
  constructor(name, color, parentUi) {
    this.name = name;
    this.color = color;
    this.parent = parentUi;
    this.isLocked = false;

    this.outerElem = makeElement('div', {
      className: 'accudrawInputContainer',
      style: {
        backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, .4)`,
        borderColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`,
        top: '0px',
      },
    });

    this.inputElem = makeElement('input', {
      className: 'accudrawInput',
      type: 'text',
      value: '0.0000',
      spellcheck: false,
      autocomplete: 'off',
      autocapitalize: 'off',
      autocorrect: 'off',
    });

    this.lockColorElem = makeElement('div', { className: 'lockColor' });
    this.lockImg = makeElement('img', {
      src: 'https://sniplets.org/resources/lock.png',
    });

    this.lockElem = makeElement(
      'div',
      { className: 'lock' },
      this.lockColorElem,
      this.lockImg
    );

    this.outerElem.appendChild(this.inputElem);
    this.outerElem.appendChild(this.lockElem);

    this.inputElem.addEventListener('focus', () => {
      this.parent.setFocus(this);
    });

    this.inputElem.addEventListener('keydown', (e) => {
      const accuDraw = this.parent.accuDraw;
      const logic =
        accuDraw && accuDraw.baseController
          ? accuDraw.baseController.accuDrawLogic
          : null;

      if (
        e.key.length === 1 &&
        /[a-zA-Z]/.test(e.key) &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        KeyCommandHandler.processKey(e.key.toUpperCase());
        return;
      }

      if (
        /[0-9.\-+]/.test(e.key) &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (logic) {
          logic.handleSmartLock();
        }
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (logic) {
          logic.switchMode();
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (logic) logic.handleInput('Tab');
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (logic) logic.handleInput('Escape');
        return;
      }

      const navKeys = [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ];
      if (navKeys.includes(e.key)) {
        if (logic && !logic.isInputActive(this.name)) {
          logic.notifyExplicitEdit(this.name, this.inputElem.value);
        }
        return;
      }
    });

    this.inputElem.addEventListener('input', (e) => {
      e.preventDefault();
    });
  }

  setValue(val) {
    let displayVal = val;

    if (typeof val === 'number') {
      if (Math.abs(val) < 0.0001) displayVal = '0.0000';
      else displayVal = val.toFixed(4);
    }

    if (this.inputElem.value !== displayVal.toString()) {
      this.inputElem.value = displayVal;
    }
  }

  setFocusState(isFocused) {
    const s = this.outerElem.style;
    const c = this.color;

    if (isFocused) {
      this.outerElem.style.pointerEvents = 'auto';
      this.inputElem.style.pointerEvents = 'auto';
    } else {
      if (this.parent && !this.parent.isClickable) {
        this.outerElem.style.pointerEvents = '';
        this.inputElem.style.pointerEvents = '';
      }
    }

    const baseZ = this.isLocked ? 200000 : isFocused ? 100001 : 100000;

    if (isFocused) {
      s.borderColor = `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.9)`;
      s.zIndex = baseZ;
      const scale = 1.25;
      s.transform = `scale3d(${scale}, ${scale}, 1)`;
    } else {
      s.borderColor = `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0)`;
      s.zIndex = baseZ;
      s.transform = 'scale3d(1, 1, 1)';
    }
  }

  toggleLock() {
    this.setLocked(!this.isLocked);
  }

  setLocked(locked) {
      if (this.isLocked === locked) return;
      this.isLocked = locked;

      if (locked) {
        this.lockColorElem.style.backgroundColor = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, 1)`;

        this.lockElem.style.transition = 'none';
        this.lockElem.style.opacity = '1';
        this.lockElem.style.transform = 'scale3d(0.05, 0.05, 1)';
        this.lockElem.style.display = 'block';

        requestAnimationFrame(() => {
          // Amplified the curve to 1.5 and duration to 0.28s to produce a beautiful, highly visible bounce
          this.lockElem.style.transition =
            'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.5), opacity 0.28s ease-in';
          this.lockElem.style.transform = 'scale3d(1, 1, 1)';
        });

        this.outerElem.style.zIndex = 200000;
      } else {
        this.lockElem.style.transition =
          'transform 0.15s ease-in, opacity 0.15s ease-in';
        this.lockElem.style.opacity = '0';
        this.lockElem.style.transform = 'scale3d(0, 0, 1)';

        // Clean up DOM layout boundaries once the transition completes
        setTimeout(() => {
          if (!this.isLocked) {
            this.lockElem.style.display = 'none';
          }
        }, 150);

        this.outerElem.style.zIndex =
          document.activeElement === this.inputElem ? 100001 : 100000;
      }
    }

  setSmartFocus(isActive) {
    if (this.isLocked || document.activeElement === this.inputElem) return;

    const s = this.outerElem.style;
    const c = this.color;

    if (isActive) {
      s.borderColor = `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.6)`;
      s.boxShadow = `0 0 6px rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.4)`;
      s.transform = 'scale3d(1.05, 1.05, 1)';
      s.zIndex = 100005;
    } else {
      s.borderColor = `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0)`;
      s.boxShadow = 'none';
      s.transform = 'scale3d(1, 1, 1)';
      s.zIndex = 100000;
    }
  }
}