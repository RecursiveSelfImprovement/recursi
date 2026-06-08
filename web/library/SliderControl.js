class SliderControl {
    static allSliders = [];

    constructor(options) {
      this.options = {
        saveToLocalStorage: true,
        relativeMidi: false,
        isInfiniteWheel: false, // New infinite scroll wheel option
        ...options,
      };

      let savedValue = this.getSavedValue();

      if (savedValue !== null && this.options.saveToLocalStorage) {
        savedValue = Number(savedValue);
        this.value = Math.max(
          this.options.min,
          Math.min(this.options.max, savedValue)
        );
      } else {
        this.value =
          options.initialValue !== undefined
            ? options.initialValue
            : this.options.min;
      }

      this.midiControl = this.getSavedMidiControl() || '';
      this.midiMessageHandler = null;

      this.midiLearnHandler = null;
      this.midiLearnTimeout = null;
      this.conflictData = null;

      this.midiBaseline = null;
      this.valueBaseline = null;

      this.hue = Math.floor(Math.random() * 360);
      this.createElements();
      this.applyStyles();
      this.checkMidiHandlerExistence();
      this.attachEventHandlers();
      if (options.callback && !this.options.isInfiniteWheel) {
        options.callback(this.value);
      }
      SliderControl.allSliders.push(this);
      this.registerWithMidiHandler();
    }

    createElements() {
      this.container = makeElement('div', {
        className: 'slider-container',
      });
      this.container.style.setProperty('--hue', this.hue);
      this.label = makeElement('label', this.options.label);
      
      const midiEnabled = localStorage.getItem('midi-controller-enabled') === 'true';

      if (this.options.isInfiniteWheel) {
        // Render high-contrast 3D rolling sideways wheel with border outline
        this.wheelCanvas = makeElement('canvas', {
          className: 'slider-wheel-canvas',
          style: {
            width: '100%',
            height: '16px',
            display: 'block',
            cursor: 'ew-resize',
            borderRadius: '3px',
            background: 'rgba(20, 20, 25, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginTop: '6px',
            boxSizing: 'border-box'
          }
        });
        
        this.container.appendChild(this.label);
        this.container.appendChild(this.wheelCanvas);

        this.wheelOffset = 0;
        this.wheelVelocity = 0;
        this.wheelInertiaId = null;

        setTimeout(() => {
          if (this.wheelCanvas) {
            const rect = this.wheelCanvas.getBoundingClientRect();
            this.wheelCanvas.width = rect.width || 200;
            this.wheelCanvas.height = 16;
            this.drawWheel();
          }
        }, 120);

      } else {
        // Render standard slider
        const displaySuffix = this.options.label.includes('rotation') ? '°' : '';
        this.valueDisplay = this.options.showValue
          ? makeElement(
              'div',
              {
                className: 'value-display'
              },
              this.value.toFixed(1) + displaySuffix
            )
          : null;
        if (this.valueDisplay) {
          this.valueDisplay.style.setProperty('right', midiEnabled ? '32px' : '8px', 'important');
        }

        this.slider = makeElement('input', {
          type: 'range',
          min: 0,
          max: 1000,
          value: this.convertToSliderValue(this.value),
        });

        this.midiBox = makeElement('div', {
          className: 'midi-box'
        });
        this.midiBox.style.setProperty('display', midiEnabled ? 'flex' : 'none', 'important');

        this.midiEmoji = makeElement(
          'span',
          {
            className: 'midi-emoji',
          },
          '🎛️'
        );
        this.midiInput = makeElement('input', {
          type: 'text',
          placeholder: 'MIDI CC',
          value: this.midiControl,
          className: 'midi-input',
          style: { display: 'none' }
        });

        this.midiBox.appendChild(this.midiEmoji);
        this.midiBox.appendChild(this.midiInput);
        this.container.appendChild(this.midiBox);

        this.container.appendChild(this.label);
        if (this.valueDisplay) this.container.appendChild(this.valueDisplay);
        this.container.appendChild(this.slider);
        this.slider.SliderControl = this;
      }
    }

    convertToSliderValue(realValue) {
      return Math.round(
        ((realValue - this.options.min) / (this.options.max - this.options.min)) *
          1000
      );
    }

    convertToRealValue(sliderValue) {
      return Number(
        (
          (sliderValue / 1000) * (this.options.max - this.options.min) +
          this.options.min
        ).toFixed(2)
      );
    }

    handleMidiLearning(message) {
      if (!this.midiBox.classList.contains('expanded')) return false;

      this.refreshMidiLearnTimeout();

      const isControlChange = message.type >= 176 && message.type <= 191;
      if (!isControlChange) return false;

      const channel = (message.data[0] & 0x0f) + 1;
      const ccNumber = message.data[1];
      const newControl = `${channel},${ccNumber}`;

      const conflictingSlider = SliderControl.allSliders.find(
        (s) => s !== this && s.midiControl === newControl
      );

      const now = Date.now();

      if (conflictingSlider) {
        conflictingSlider.handleMidiMessage(message);

        if (!this.conflictData || this.conflictData.cc !== newControl) {
          this.conflictData = {
            cc: newControl,
            startTime: now,
            lastActivity: now,
          };
        } else {
          if (now - this.conflictData.lastActivity > 500) {
            this.conflictData.startTime = now;
          }
          this.conflictData.lastActivity = now;

          if (now - this.conflictData.startTime > 2000) {
            conflictingSlider.setMidiControl('');
            this.setMidiControl(newControl);
            this.hideMidiInput();
            this.conflictData = null;
          }
        }
        return true;
      }

      if (newControl !== this.midiControl) {
        this.setMidiControl(newControl);
        this.hideMidiInput();
        return true;
      }

      return false;
    }

    applyStyles() {
      const hue = Math.floor(Math.random() * 360);
      this.container.style.setProperty('--hue', hue);

      applyCss(
        `
        .slider-container {
          overflow: visible;
          position: relative;
          background-color: rgba(0,0,0,0.4);
          border-radius: 4px;
          padding: 6px 10px;
          width: 100%;
          margin: 6px 0;
          font-size: 11px;
          box-sizing: border-box;
          backdrop-filter: blur(2px);
          border: 1px solid rgba(255,255,255,0.03);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }

        .slider-container label {
          color: hsl(var(--hue), 100%, 75%);
          text-shadow: 0 0 3px hsla(var(--hue), 100%, 50%, 0.4);
          font-weight: 600;
          display: block;
          margin: 0 0 6px;
          padding: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          width: calc(100% - 24px);
        }

        .slider-container input[type="range"] {
          width: 100%;
          margin: 4px 0;
          height: 14px;
          -webkit-appearance: none;
          background: transparent;
          border: none;
          outline: none;
          display: block;
        }

        .slider-container input[type="range"]:focus {
          outline: none;
        }

        .slider-container input[type="range"]::-webkit-slider-runnable-track {
          height: 4px;
          background: hsla(var(--hue), 100%, 50%, 0.15);
          border-radius: 2px;
        }

        .slider-container input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: #ffffff;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 2px hsl(var(--hue), 100%, 50%),
                      0 0 8px hsl(var(--hue), 100%, 50%);
          transition: transform 0.1s ease;
          margin-top: -4px;
        }
        .slider-container input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .value-display {
          position: absolute;
          top: 4px;
          right: 32px;
          background-color: rgba(10,10,15,0.9) !important;
          border: 1px solid hsla(var(--hue), 100%, 50%, 0.3) !important;
          color: hsl(var(--hue), 100%, 75%) !important;
          padding: 1px 4px !important;
          border-radius: 3px !important;
          font-size: 10px !important;
          font-family: monospace !important;
          text-shadow: 0 0 4px hsla(var(--hue), 100%, 50%, 0.5) !important;
          box-sizing: border-box !important;
        }

        .midi-box {
          position: absolute !important;
          top: 4px !important;
          right: 8px !important;
          height: 12px !important;
          width: 12px !important; /* Constrain tightly to the corner */
          cursor: pointer !important;
          overflow: visible !important;
          z-index: 10 !important;
          display: flex; /* Remove !important so P2P inline none toggle works smoothly */
          align-items: center !important;
          justify-content: center !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }

        .midi-box.expanded {
          width: auto !important; /* Expand horizontally only when actively mapping */
        }

        .midi-emoji {
          width: 12px !important;
          height: 12px !important;
          font-size: 8px !important;
          line-height: 12px !important;
          text-align: center !important;
          background: rgba(255, 255, 255, 0.05) !important; /* Neutral background removes the ugly black box */
          color: rgba(255, 255, 255, 0.7) !important;
          border-radius: 3px !important;
          backdrop-filter: blur(2px) !important;
          transition: all 0.15s ease !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          display: inline-block !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .midi-emoji:hover {
          background: hsla(var(--hue), 100%, 50%, 0.35) !important;
          color: hsl(var(--hue), 100%, 80%) !important;
          text-shadow: 0 0 5px hsla(var(--hue), 100%, 50%, 0.8) !important;
          border-color: hsla(var(--hue), 100%, 50%, 0.5) !important;
        }

        .midi-input {
          display: none !important; /* Entirely strip the input element from layout when collapsed */
          position: absolute !important;
          top: 0px !important;
          right: 22px !important;
          width: 0px !important;
          height: 12px !important;
          padding: 0 !important;
          border: none !important;
          border-radius: 3px !important;
          font-size: 9px !important;
          opacity: 0 !important;
          transition: all 0.25s ease !important;
          background: rgba(10,10,15,0.95) !important;
          color: hsl(var(--hue), 100%, 75%) !important;
          text-shadow: 0 0 3px hsla(var(--hue), 100%, 50%, 0.5) !important;
          backdrop-filter: blur(2px) !important;
          text-align: center !important;
          box-sizing: border-box !important;
          pointer-events: none !important;
        }

        .midi-box.expanded .midi-input {
          display: block !important; /* Re-integrate the input block for typing */
          width: 65px !important;
          opacity: 1 !important;
          padding: 0 4px !important;
          border: 1px solid hsla(var(--hue), 100%, 50%, 0.4) !important;
          pointer-events: auto !important;
        }
        `,
        'sliderControlStyles'
      );
    }

    checkMidiHandlerExistence() {
      if (this.midiBox) {
        const enabled = localStorage.getItem('midi-controller-enabled') === 'true';
        this.midiBox.style.setProperty('display', enabled ? 'flex' : 'none', 'important');
      }
    }

    attachEventHandlers() {
      if (this.options.isInfiniteWheel) {
        const onDown = (e) => {
          e.preventDefault();
          this._stopWheelInertia();
          let lastX = e.clientX ?? e.touches?.[0]?.clientX;
          
          const onMove = (ev) => {
            const currentX = ev.clientX ?? ev.touches?.[0]?.clientX;
            if (currentX === undefined) return;
            const dx = currentX - lastX;
            lastX = currentX;
            
            this.wheelOffset += dx;
            this.wheelVelocity = this.wheelVelocity * 0.3 + dx * 0.7; // Smooth velocity damping
            this.drawWheel();
            
            if (this.options.callback) {
              this.options.callback(dx);
            }
          };
          
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
            
            if (Math.abs(this.wheelVelocity) > 0.5) {
              this._startWheelInertia();
            }
          };
          
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
          window.addEventListener('touchmove', onMove, { passive: false });
          window.addEventListener('touchend', onUp);
        };

        this.wheelCanvas.addEventListener('mousedown', onDown);
        this.wheelCanvas.addEventListener('touchstart', onDown, { passive: false });
        return;
      }

      this.slider.addEventListener('input', (e) => {
        this.value = this.convertToRealValue(e.target.value);
        if (this.valueDisplay) {
          this.valueDisplay.textContent = this.value.toFixed(1);
          this.valueDisplay.style.display = 'block';
        }
        this.saveValue();
        if (this.options.callback) {
          this.options.callback(this.value);
        }
      });
      this.slider.addEventListener('change', () => {
        if (this.valueDisplay) {
          this.valueDisplay.style.display = 'block';
        }
      });

      this.midiEmoji.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMidiInput();
      });
      this.midiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.midiControl = e.target.value;
          this.saveMidiControl();
          this.hideMidiInput();
        } else if (e.key === 'Escape') {
          this.hideMidiInput();
        }
      });
      document.addEventListener('click', (e) => {
        if (this.midiBox && !this.midiBox.contains(e.target)) {
          this.hideMidiInput();
        }
      });
    }

    toggleMidiInput() {
      if (this.midiBox.classList.contains('expanded')) {
        this.hideMidiInput();
      } else {
        this.showMidiInput();
      }
    }

    showMidiInput() {
      SliderControl.hideAllInputs(this);

      this.midiBox.classList.add('expanded');
      this.midiInput.style.display = 'block';

      if (!this.midiLearnHandler) {
        this.midiLearnHandler = (message) => this.handleMidiLearning(message);
        MidiInputHandler.addDataHandler(this.midiLearnHandler);
      }

      this.refreshMidiLearnTimeout();

      setTimeout(() => {
        this.midiInput.style.width = '65px';
        this.midiInput.style.opacity = '1';
        this.midiInput.style.pointerEvents = 'auto';
      }, 10);

      setTimeout(() => {
        this.midiInput.focus();
        this.midiInput.select();
      }, 300);
    }

    hideMidiInput() {
      this.midiBox.classList.remove('expanded');
      this.midiInput.blur();
      this.midiInput.style.width = '0';
      this.midiInput.style.opacity = '0';
      this.midiInput.style.pointerEvents = 'none';

      if (this.midiLearnHandler) {
        MidiInputHandler.removeDataHandler(this.midiLearnHandler);
        this.midiLearnHandler = null;
      }

      if (this.midiLearnTimeout) {
        clearTimeout(this.midiLearnTimeout);
        this.midiLearnTimeout = null;
      }

      this.conflictData = null;
    }

    getValue() {
      return this.value;
    }

    setValue(newValue) {
      this.value = Number(newValue.toFixed(2));
      if (this.slider) {
        this.slider.value = this.convertToSliderValue(this.value);
      }
      if (this.valueDisplay) {
        const displaySuffix = this.options.label.includes('rotation') ? '°' : '';
        this.valueDisplay.textContent = this.value.toFixed(1) + displaySuffix;
      }
      this.saveValue();
      if (this.options.callback && !this.options.isInfiniteWheel) {
        this.options.callback(this.value);
      }
    }

    getSavedValue() {
      if (this.options.saveToLocalStorage === false) return null;
      let saved = localStorage.getItem(this.options.label);
      return saved !== null ? Number(saved) : null;
    }

    saveValue() {
      if (this.options.saveToLocalStorage === false) return;
      localStorage.setItem(this.options.label, this.value.toFixed(2));
    }

    getSavedMidiControl() {
      return localStorage.getItem(this.options.label + '_midi');
    }

    saveMidiControl() {
      localStorage.setItem(this.options.label + '_midi', this.midiControl);
      this.registerWithMidiHandler();
      SliderControl.initializeMidiHandlerIfNeeded();
    }

    registerWithMidiHandler() {
      if (this.midiMessageHandler) {
        MidiInputHandler.removeDataHandler(this.midiMessageHandler);
        this.midiMessageHandler = null;
      }

      if (this.midiControl) {
        this.midiMessageHandler = this.handleMidiMessage.bind(this);
        MidiInputHandler.addDataHandler(this.midiMessageHandler);
      }
    }

    static anySliderHasMidiControl() {
      return SliderControl.allSliders.some((slider) => {
        const midiControl = slider.midiControl.split(',');
        return midiControl.length === 2 && !isNaN(parseInt(midiControl[1]));
      });
    }

    handleMidiMessage(message) {
      if (!this.midiControl) return;

      const parts = this.midiControl.split(',');
      if (parts.length < 2) return;

      const savedChannel = parseInt(parts[0], 10);
      const savedCC = parseInt(parts[1], 10);

      if (isNaN(savedChannel) || isNaN(savedCC)) return;

      const isControlChange = message.type >= 176 && message.type <= 191;
      if (isControlChange) {
        const messageChannel = (message.data[0] & 0x0f) + 1;
        const messageCC = message.data[1];

        if (messageChannel === savedChannel && messageCC === savedCC) {
          let midiValue = message.data[2];

          if (this.options.relativeMidi) {
            if (this.midiBaseline === null) {
              this.midiBaseline = midiValue;
              this.valueBaseline = this.value;
              return;
            }

            const midiDelta = midiValue - this.midiBaseline;
            const range = this.options.max - this.options.min;
            const valueDelta = (midiDelta / 127) * range;

            let newValue = this.valueBaseline + valueDelta;
            newValue = Math.max(
              this.options.min,
              Math.min(this.options.max, newValue)
            );

            this.setValue(newValue);
          } else {
            const sliderValue = Math.round((midiValue / 127) * 1000);
            this.setValue(this.convertToRealValue(sliderValue));
          }
        }
      }
    }

    appendTo(parent) {
      parent.appendChild(this.container);
    }

    static initializeMidiHandlers() {
      SliderControl.allSliders.forEach((slider) => {
        slider.checkMidiHandlerExistence();
        if (slider.midiControl) {
          slider.registerWithMidiHandler();
        }
      });
    }

    static initializeMidiHandlerIfNeeded() {
      if (SliderControl.anySliderHasMidiControl()) {
        MidiInputHandler.init((status) => {
          console.log('MIDI initialization status:', status);
          if (status.success) {
            SliderControl.allSliders.forEach((slider) => {
              if (slider.midiControl && slider.midiControl.trim() !== '') {
                slider.registerWithMidiHandler();
              }
            });
          }
        });
      }
    }

    static hideAllInputs(exceptSlider) {
      SliderControl.allSliders.forEach((s) => {
        if (s !== exceptSlider) s.hideMidiInput();
      });
    }

    setMidiControl(val) {
      this.midiControl = val;
      this.midiInput.value = this.midiControl;
      this.saveMidiControl();
    }

    refreshMidiLearnTimeout() {
      if (this.midiLearnTimeout) clearTimeout(this.midiLearnTimeout);
      this.midiLearnTimeout = setTimeout(() => {
        this.hideMidiInput();
      }, 3000);
    }
  
  static syncAllDisplay() {
      const enabled = localStorage.getItem('midi-controller-enabled') === 'true';
      SliderControl.allSliders.forEach(slider => {
        if (slider.midiBox) {
          slider.midiBox.style.setProperty('display', enabled ? 'flex' : 'none', 'important');
        }
        if (slider.valueDisplay) {
          slider.valueDisplay.style.setProperty('right', enabled ? '32px' : '8px', 'important');
        }
      });
    }

  drawWheel() {
      if (!this.wheelCanvas) return;
      const ctx = this.wheelCanvas.getContext('2d');
      const W = this.wheelCanvas.width;
      const H = this.wheelCanvas.height;
      ctx.clearRect(0, 0, W, H);

      // Draw horizontal track center-guide (brightened for high contrast)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, H / 2);
      ctx.lineTo(W - 12, H / 2);
      ctx.stroke();

      // Render rotating vertical ticks with solid contrast
      const spacing = 16;
      const offset = (this.wheelOffset % spacing + spacing) % spacing;

      for (let x = offset; x < W; x += spacing) {
        const distFromCenter = Math.abs(x - W / 2);
        const pctFromCenter = distFromCenter / (W / 2);
        // Base minimum opacity of 0.25 guarantees ticks remain visible near the 3D rounded edges
        const alpha = Math.max(0.25, 1 - pctFromCenter * pctFromCenter); 

        ctx.strokeStyle = `hsla(var(--hue), 100%, 75%, ${alpha})`;
        ctx.lineWidth = 1.8;
        
        ctx.beginPath();
        ctx.moveTo(x, 4);
        ctx.lineTo(x, H - 4);
        ctx.stroke();
      }
    }

  _startWheelInertia() {
      this._stopWheelInertia();
      const friction = 0.94; // Decelerate smoothly over frames

      const step = () => {
        this.wheelVelocity *= friction;

        if (Math.abs(this.wheelVelocity) < 0.1) {
          this.wheelInertiaId = null;
          return;
        }

        this.wheelOffset += this.wheelVelocity;
        this.drawWheel();

        if (this.options.callback) {
          this.options.callback(this.wheelVelocity);
        }

        this.wheelInertiaId = requestAnimationFrame(step);
      };

      this.wheelInertiaId = requestAnimationFrame(step);
    }

  _stopWheelInertia() {
      if (this.wheelInertiaId) {
        cancelAnimationFrame(this.wheelInertiaId);
        this.wheelInertiaId = null;
      }
    }
}