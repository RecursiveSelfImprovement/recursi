class SliderControl {
  static allSliders = [];

  constructor(options) {
    // Default saveToLocalStorage to true if not specified
    this.options = {
      saveToLocalStorage: true,
      relativeMidi: false, // New option for relative/zero-start behavior
      ...options,
    };

    let savedValue = this.getSavedValue();

    // Only use saved value if it exists AND persistence is enabled
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

    // State for MIDI learning and conflict resolution
    this.midiLearnHandler = null;
    this.midiLearnTimeout = null;
    this.conflictData = null;

    // State for Relative MIDI Control
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
      class: 'slider-container',
    });
    this.container.style.setProperty('--hue', this.hue);
    this.label = makeElement('label', this.options.label);
    this.valueDisplay = this.options.showValue
      ? makeElement(
          'div',
          {
            class: 'value-display',
          },
          this.value
        )
      : null;
    this.slider = makeElement('input', {
      type: 'range',
      min: 0,
      max: 1000,
      value: this.convertToSliderValue(this.value),
    });

    this.midiBox = makeElement('div', {
      class: 'midi-box',
    });
    this.midiEmoji = makeElement(
      'span',
      {
        class: 'midi-emoji',
      },
      '🎛️'
    );
    this.midiInput = makeElement('input', {
      type: 'text',
      placeholder: 'MIDI CC',
      value: this.midiControl,
      class: 'midi-input',
    });

    this.midiBox.appendChild(this.midiEmoji);
    this.midiBox.appendChild(this.midiInput);
    this.container.appendChild(this.midiBox);

    this.container.appendChild(this.label);
    if (this.valueDisplay) this.container.appendChild(this.valueDisplay);
    this.container.appendChild(this.slider);
    if (this.subtleBox) {
      this.subtleBox.appendChild(this.midiInput);
      this.container.appendChild(this.subtleBox);
    }
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

    // Check for Control Change (176-191)
    const isControlChange = message.type >= 176 && message.type <= 191;
    if (!isControlChange) return false;

    const channel = (message.data[0] & 0x0f) + 1;
    const ccNumber = message.data[1];
    const newControl = `${channel},${ccNumber}`;

    // Check for conflict
    const conflictingSlider = SliderControl.allSliders.find(
      (s) => s !== this && s.midiControl === newControl
    );

    const now = Date.now();

    if (conflictingSlider) {
      // 1. Visual feedback: Move the existing slider so user sees what they are affecting
      conflictingSlider.handleMidiMessage(message);

      // 2. Conflict resolution logic
      if (!this.conflictData || this.conflictData.cc !== newControl) {
        // New conflict detected
        this.conflictData = {
          cc: newControl,
          startTime: now,
          lastActivity: now,
        };
      } else {
        // Existing conflict continuing

        // If they stopped moving for > 0.5s, reset the "stealing" timer
        if (now - this.conflictData.lastActivity > 500) {
          this.conflictData.startTime = now;
        }
        this.conflictData.lastActivity = now;

        // If moved continuously for > 2 seconds, steal the control
        if (now - this.conflictData.startTime > 2000) {
          conflictingSlider.setMidiControl(''); // Clear old
          this.setMidiControl(newControl); // Assign new
          this.hideMidiInput();
          this.conflictData = null;
        }
      }
      return true;
    }

    // No conflict? Assign immediately.
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
padding: 1px 5px 0 5px;
max-width: 200px;
width: 100%;
margin: 5px;
font-size: 12px;
box-sizing: border-box;
backdrop-filter: blur(2px);
}
.slider-container + .slider-container {
margin-top: 4px;
}

/* Slider Label */
.slider-container label {
color: hsl(var(--hue), 100%, 70%);
text-shadow: 0 0 3px hsla(var(--hue), 100%, 50%, 0.5);
font-weight: 300;
display: block;
margin: 0 0 4px;
padding: 3px 2px 0;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}

/* Slider Input */
.slider-container input[type="range"] {
width: 93%;
margin: 0 0 -5px 0;
height: 14px;
-webkit-appearance: none;
background: transparent;
border: none;
outline: none;
}

/* Remove focus outline */
.slider-container input[type="range"]:focus {
outline: none;
}

/* Slider Track */
.slider-container input[type="range"]::-webkit-slider-runnable-track {
height: 3px;
background: hsla(var(--hue), 100%, 50%, 0.1);
border-radius: 2px;
margin: 5px 0;
}

.slider-container input[type="range"]::-webkit-slider-thumb {
-webkit-appearance: none;
width: 12px;
height: 12px;
background: hsl(var(--hue), 30%, 90%); /* Matches your slider’s pale center */
border-radius: 50%;
cursor: pointer;
box-shadow: 0 0 2px hsl(var(--hue), 100%, 50%),
0 0 10px hsl(var(--hue), 100%, 50%),
0 0 20px hsl(var(--hue), 100%, 50%);
transition: transform 0.1s ease;
margin-top: -5px; /* Adjusted to center the thumb */
}
.slider-container input[type="range"]::-webkit-slider-thumb:hover {
transform: scale(1.1);
}

/* Value Display */
.value-display {
position: absolute;
top: 18px;
left: 50%;
transform: translateX(-50%);
background-color: rgba(0,0,0,0.6);
color: hsl(var(--hue), 100%, 70%);
padding: 2px 5px;
border-radius: 3px;
display: none;
font-size: 11px;
backdrop-filter: blur(2px);
text-shadow: 0 0 5px hsla(var(--hue), 100%, 50%, 0.4);
}

/* MIDI Box */
.midi-box {
position: absolute;
top: 2px;
right: 5px;
height: 5px;
cursor: pointer;
overflow: visible;
z-index: 10;
}

/* MIDI Emoji */
.midi-emoji {
position: absolute;
top: 0;
right: 0;
width: 16px;
height: 16px;
font-size: 12px;
line-height: 16px;
text-align: center;
z-index: 11;
background: hsla(var(--hue), 100%, 50%, 0.1); /* Faint colored background */
color: hsla(var(--hue), 100%, 70%, 0.7); /* Semi-transparent text */
border-radius: 3px;
backdrop-filter: blur(2px);
transition: all 0.2s ease;
}

.midi-emoji:hover {
background: hsla(var(--hue), 100%, 50%, 0.3); /* Slightly more opaque */
color: hsl(var(--hue), 100%, 70%); /* Fully opaque text */
text-shadow: 0 0 5px hsla(var(--hue), 100%, 50%, 0.8); /* Colored glow */
}
/* MIDI Input */
.midi-input {
position: absolute;
top: 0px;
right: 12px;
width: 0;
height: 16px;
padding: 0 5px;
border: none !important;
border-radius: 3px;
font-size: 10px;
opacity: 0;
transition: all 0.3s ease;
background: hsla(var(--hue), 100%, 50%, 0.2);
color: hsl(var(--hue), 100%, 70%);
text-shadow: 0 0 3px hsla(var(--hue), 100%, 50%, 0.5);
backdrop-filter: blur(2px);
}

.midi-box.expanded .midi-input {
width: 60px;
opacity: 1;
}
      `,
      'sliderControlStyles'
    );
  }

  checkMidiHandlerExistence() {
    // MidiInputHandler is now imported, not on window
    this.midiBox.style.display = 'block';
  }

  attachEventHandlers() {
    this.slider.addEventListener('input', (e) => {
      this.value = this.convertToRealValue(e.target.value);
      if (this.valueDisplay) {
        this.valueDisplay.textContent = this.value.toFixed(2);
        this.valueDisplay.style.top = `${this.slider.offsetTop - 20}px`;
        this.valueDisplay.style.display = 'block';
      }
      this.saveValue();
      if (this.options.callback) {
        this.options.callback(this.value);
      }
    });
    this.slider.addEventListener('change', () => {
      if (this.valueDisplay) {
        this.valueDisplay.style.display = 'none';
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
    // Close others so only one listens at a time
    SliderControl.hideAllInputs(this);

    this.midiBox.classList.add('expanded');
    this.midiInput.style.display = 'block';

    if (!this.midiLearnHandler) {
      this.midiLearnHandler = (message) => this.handleMidiLearning(message);
      MidiInputHandler.addDataHandler(this.midiLearnHandler);
    }

    this.refreshMidiLearnTimeout();

    setTimeout(() => {
      this.midiInput.style.width = '60px';
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
      this.valueDisplay.textContent = this.value.toFixed(2);
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
    // Remove the old handler if it exists, to prevent listening on multiple CCs
    if (this.midiMessageHandler) {
      MidiInputHandler.removeDataHandler(this.midiMessageHandler);
      this.midiMessageHandler = null;
    }

    if (this.midiControl) {
      // Bind the handler and store it so we can remove it later if needed
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

    // Check if it's a Control Change message on any channel
    const isControlChange = message.type >= 176 && message.type <= 191;
    if (isControlChange) {
      const messageChannel = (message.data[0] & 0x0f) + 1;
      const messageCC = message.data[1];

      // Check if the incoming message matches the slider's saved channel and CC
      if (messageChannel === savedChannel && messageCC === savedCC) {
        let midiValue = message.data[2]; // This is the 0-127 value

        if (this.options.relativeMidi) {
          // Relative Mode: "Start at Zero" Assumption
          // We treat the first received value as the anchor for the current slider value.
          if (this.midiBaseline === null) {
            this.midiBaseline = midiValue;
            this.valueBaseline = this.value;
            // Do not update on the very first frame to prevent jumps
            return;
          }

          // Calculate delta from the baseline
          const midiDelta = midiValue - this.midiBaseline;

          // Map 127 MIDI steps to the full slider range
          const range = this.options.max - this.options.min;
          const valueDelta = (midiDelta / 127) * range;

          // Apply delta to the baseline value
          let newValue = this.valueBaseline + valueDelta;

          // Clamp result
          newValue = Math.max(
            this.options.min,
            Math.min(this.options.max, newValue)
          );

          this.setValue(newValue);
        } else {
          // Absolute Mode (Standard)
          // Standard linear mapping for absolute sliders (0-127 -> 0-1000 internal -> min-max)
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
    // Auto-close after 3 seconds of silence
    this.midiLearnTimeout = setTimeout(() => {
      this.hideMidiInput();
    }, 3000);
  }


  

  
}
