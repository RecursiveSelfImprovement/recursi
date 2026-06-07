class SliderControl {
    static allSliders = [];

    constructor(options) {
      this.options = {
        saveToLocalStorage: true,
        relativeMidi: false,
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
      if (options.callback) {
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
      this.valueDisplay = this.options.showValue
        ? makeElement(
            'div',
            {
              className: 'value-display',
            },
            this.value.toFixed(1)
          )
        : null;
      this.slider = makeElement('input', {
        type: 'range',
        min: 0,
        max: 1000,
        value: this.convertToSliderValue(this.value),
      });

      this.midiBox = makeElement('div', {
        className: 'midi-box',
      });
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
      });

      this.midiBox.appendChild(this.midiEmoji);
      this.midiBox.appendChild(this.midiInput);
      this.container.appendChild(this.midiBox);

      // Only display the MIDI assign icon if MIDI controller is connected/selected in localStorage
      const midiEnabled = localStorage.getItem('midi-controller-enabled') === 'true';
      this.midiBox.style.display = midiEnabled ? 'block' : 'none';

      this.container.appendChild(this.label);
      if (this.valueDisplay) this.container.appendChild(this.valueDisplay);
      this.container.appendChild(this.slider);
      this.slider.SliderControl = this;
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
          background-color: rgba(10,10,15,0.9);
          border: 1px solid hsla(var(--hue), 100%, 50%, 0.3);
          color: hsl(var(--hue), 100%, 75%);
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 10px;
          font-family: monospace;
          text-shadow: 0 0 4px hsla(var(--hue), 100%, 50%, 0.5);
        }

        .midi-box {
          position: absolute;
          top: 4px;
          right: 8px;
          height: 20px;
          cursor: pointer;
          overflow: visible;
          z-index: 10;
          display: flex;
          align-items: center;
        }

        .midi-emoji {
          width: 18px;
          height: 18px;
          font-size: 11px;
          line-height: 18px;
          text-align: center;
          background: hsla(var(--hue), 100%, 50%, 0.12);
          color: hsla(var(--hue), 100%, 75%, 0.7);
          border-radius: 3px;
          backdrop-filter: blur(2px);
          transition: all 0.15s ease;
          border: 1px solid hsla(var(--hue), 100%, 50%, 0.15);
          display: inline-block;
        }

        .midi-emoji:hover {
          background: hsla(var(--hue), 100%, 50%, 0.35);
          color: hsl(var(--hue), 100%, 80%);
          text-shadow: 0 0 5px hsla(var(--hue), 100%, 50%, 0.8);
          border-color: hsla(var(--hue), 100%, 50%, 0.5);
        }

        .midi-input {
          position: absolute;
          top: 0px;
          right: 22px;
          width: 0;
          height: 18px;
          padding: 0;
          border: none !important;
          border-radius: 3px;
          font-size: 9px;
          opacity: 0;
          transition: all 0.25s ease;
          background: rgba(10,10,15,0.95);
          color: hsl(var(--hue), 100%, 75%);
          text-shadow: 0 0 3px hsla(var(--hue), 100%, 50%, 0.5);
          backdrop-filter: blur(2px);
          text-align: center;
          box-sizing: border-box;
          pointer-events: none;
        }

        .midi-box.expanded .midi-input {
          width: 65px;
          opacity: 1;
          padding: 0 4px;
          border: 1px solid hsla(var(--hue), 100%, 50%, 0.4) !important;
        }
        `,
        'sliderControlStyles'
      );
    }

    checkMidiHandlerExistence() {
      this.midiBox.style.display = 'block';
    }

    attachEventHandlers() {
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
        // Enforce always showing the slider value instead of returning to a blank display
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
        if (!this.midiBox.contains(e.target)) {
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
      this.slider.value = this.convertToSliderValue(this.value);
      if (this.valueDisplay) {
        this.valueDisplay.textContent = this.value.toFixed(1);
      }
      this.saveValue();
      if (this.options.callback) {
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
  }