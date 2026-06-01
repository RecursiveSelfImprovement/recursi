class MidiMapper {
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this.isActive = false;
    this.mappings = new Map();
    this.reverseMappings = new Map();
    this.waitingForInput = null;
    this.controllables = [];
    this.overlays = [];
    this.midiHandler = null;
    this.colorPickerTimeout = null;
    this.STORAGE_KEY = 'drawingAppMidiMappings_v1';
    this.storageKey = 'drawingAppMidiMappings_v1';

    this._discoverControllables();
    this.loadMappings();
    MidiInputHandler.init();
    this._setupMidiListener();
  }

  activate() {
    if (this.isActive) return;
    this.isActive = true;
    this._createOverlays();
  }

  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    this.waitingForInput = null;
    this._clearOverlays();
  }

  _startMapping() {
    this.isActive = true;
    this._discoverControllables();
    this._createOverlays();
    this._setupMidiListener();
  }

  _discoverControllables() {
    this.controllables = [];

    const ranges = this.container.querySelectorAll('input[type="range"]');
    ranges.forEach((range) => {
      const row = range.closest('.setting-row');
      if (!row) return;
      const labelEl = row.querySelector('.setting-label');

      // Robustly extract text: Ignore child elements (like value displays)
      let labelText = 'Unknown';
      if (labelEl) {
        labelText = Array.from(labelEl.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent.trim())
          .join(' ')
          .trim();

        if (!labelText && labelEl.textContent) {
          // Fallback
          labelText = labelEl.textContent.trim().split('\n')[0];
        }
      }

      this.controllables.push({
        type: 'range',
        element: range,
        label: labelText,
        applyDelta: (delta) => {
          const min = parseFloat(range.min) || 0;
          const max = parseFloat(range.max) || 100;
          const step = (max - min) / 64;
          const newVal = Math.max(
            min,
            Math.min(max, parseFloat(range.value) + delta * step)
          );
          range.value = newVal;
          range.dispatchEvent(new Event('input', { bubbles: true }));
          range.dispatchEvent(new Event('change', { bubbles: true }));
        },
        setValue: (val) => {
          range.value = val;
          range.dispatchEvent(new Event('input', { bubbles: true }));
          range.dispatchEvent(new Event('change', { bubbles: true }));
        },
      });
    });

    const swatches = this.container.querySelectorAll('.color-swatch');
    swatches.forEach((swatch) => {
      const row = swatch.closest('.setting-row');
      if (!row) return;
      const labelEl = row.querySelector('.setting-label');

      // Same robust extraction for colors
      let labelText = 'Color';
      if (labelEl) {
        labelText = Array.from(labelEl.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent.trim())
          .join(' ')
          .trim();

        if (!labelText && labelEl.textContent) {
          labelText = labelEl.textContent.trim();
        }
      }

      const defaultMode = labelText.toLowerCase().includes('background')
        ? 'V'
        : 'H';

      this.controllables.push({
        type: 'color',
        element: swatch,
        label: labelText,
        mode: defaultMode,
      });
    });
  }

  _ensureColorPickerOpen(swatch) {
    if (this.colorPickerTimeout) clearTimeout(this.colorPickerTimeout);

    const cp = this.app.colorPicker;

    // Always open the picker for color controls on first MIDI input — this ensures all color logic stays in ColorPicker
    if (!cp._activePicker || cp.currentTargetSwatch !== swatch) {
      if (cp._activePicker) this._closeColorPicker();
      swatch.click();
    }

    // Keep open during activity
    this.colorPickerTimeout = setTimeout(() => this._closeColorPicker(), 4000);
  }

  _createOverlays() {
    this._clearOverlays();

    this.controllables.forEach((ctrl, index) => {
      const bounds = ctrl.element.getBoundingClientRect();
      const containerBounds = this.container.getBoundingClientRect();

      // Shifted left and up by 2px
      const top =
        bounds.top - containerBounds.top + this.container.scrollTop - 2;
      const left =
        bounds.left - containerBounds.left + this.container.scrollLeft - 2;

      const overlay = makeElement('div', {
        className: 'midi-mapping-overlay',
        style: {
          position: 'absolute',
          top: `${top}px`,
          left: `${left}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          border: '2px dashed #00ffff',
          backgroundColor: 'rgba(0, 255, 255, 0.1)',
          cursor: 'pointer',
          zIndex: '10000',
          pointerEvents: 'auto',
          transition: 'all 0.2s ease',
          borderRadius: '4px',
        },
        onclick: (e) => {
          if (ctrl.type === 'color' && e.button === 2) {
            e.preventDefault();
            ctrl.mode = ctrl.mode === 'H' ? 'V' : 'H';
            this.saveMappings();
            this._createOverlays();
            return;
          }
          this._selectControl(index);
        },
        oncontextmenu: (e) => {
          e.preventDefault();
          if (ctrl.type === 'color') {
            ctrl.mode = ctrl.mode === 'H' ? 'V' : 'H';
            this.saveMappings();
            this._createOverlays();
          }
        },
      });

      const controlId = this._getControlId(ctrl);
      const mapping = this.mappings.get(controlId);

      if (mapping && mapping.midiCC !== undefined) {
        overlay.style.borderColor = '#00ff00';
        overlay.style.backgroundColor = 'rgba(0, 255, 0, 0.15)';
        const modeText =
          ctrl.type === 'color'
            ? ` (${ctrl.mode === 'H' ? 'Hue' : 'Brt'})`
            : '';
        overlay.appendChild(
          makeElement(
            'div',
            {
              style: {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '11px',
                color: '#00ff00',
                fontWeight: 'bold',
                textShadow: '0 0 3px black',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              },
            },
            `CC${mapping.midiCC}${modeText}`
          )
        );
      } else if (ctrl.type === 'color') {
        overlay.appendChild(
          makeElement(
            'div',
            {
              style: {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '11px',
                color: '#00ffff',
                fontWeight: 'bold',
                textShadow: '0 0 3px black',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              },
            },
            ctrl.mode === 'H' ? 'Hue' : 'Brt'
          )
        );
      }

      this.container.appendChild(overlay);
      this.overlays.push(overlay);
    });
  }

  _selectControl(index) {
    const ctrl = this.controllables[index];
    this.overlays.forEach((o) => {
      o.style.animation = '';
      o.style.borderColor =
        o.style.borderColor === '#00ff00' ? '#00ff00' : '#00ffff';
    });
    this.waitingForInput = ctrl;
    const overlay = this.overlays[index];
    overlay.style.animation = 'midi-pulse 0.6s ease-in-out infinite';
    overlay.style.borderColor = '#ffff00';
    const modeInfo =
      ctrl.type === 'color'
        ? ` (${
            ctrl.mode === 'H' ? 'Hue' : 'Brightness'
          } mode - right-click to cycle)`
        : '';
    console.log(`Waiting for MIDI CC for: ${ctrl.label}${modeInfo}`);
  }

  _setupMidiListener() {
    if (this.midiHandler) return;

    console.log('Setting up MIDI listener');

    this.midiHandler = (event) => {
      const [status, data1, data2] = event.data;
      console.log('MIDI message received:', status.toString(16), data1, data2);

      // Removed: Hardcoded Velocity-sensitive thickness logic (0x90).
      // This was conflicting with user mappings for other controls (like Hue).

      // CC messages
      if (status >= 176 && status <= 191) {
        // Mapping mode: map on any CC, using data1 as CC number (works with encoders sending 65/63)
        if (this.waitingForInput) {
          console.log(
            'Mapping mode: assigning CC',
            data1,
            'to',
            this.waitingForInput.label
          );
          this._createMapping(this.waitingForInput, data1);
          this.waitingForInput = null;
          this._createOverlays();
          return;
        }

        // Normal operation: first check for special relative encoder values
        let relativeDelta = 0;
        if (data2 === 1 || data2 === 65) relativeDelta = 1;
        else if (data2 === 127 || data2 === 63) relativeDelta = -1;

        if (relativeDelta !== 0) {
          console.log(
            'Detected relative encoder delta:',
            relativeDelta,
            'for CC',
            data1
          );
          this._applyRelativeDelta(data1, relativeDelta);
          return;
        }

        // Standard absolute CC or small-delta relative
        console.log('Standard CC processing:', data1, data2);
        this._applyMidiControl(data1, data2);
      }
    };

    MidiInputHandler.addDataHandler(this.midiHandler);
    console.log('MIDI listener added');
  }

  _routeRelativeEncoder(cc, delta) {
    const controlId = this.reverseMappings.get(cc);
    if (!controlId) return;

    const ctrl = this.controllables.find(
      (c) => this._getControlId(c) === controlId
    );
    if (!ctrl) return;

    if (ctrl.applyDelta) {
      ctrl.applyDelta(delta);
    }
  }

  _routeMidiToControl(cc, value) {
    const controlId = this.reverseMappings.get(cc);
    if (!controlId) return;

    const ctrl = this.controllables.find(
      (c) => this._getControlId(c) === controlId
    );
    if (!ctrl) return;

    const mapping = this.mappings.get(controlId);
    if (!mapping) return;

    // Detect if this is a relative encoder by checking for small deltas
    const lastValue = mapping.lastValue || 64;
    const delta = value - lastValue;

    // If delta is small, treat as relative encoder
    if (Math.abs(delta) <= 5 && Math.abs(delta) >= 1) {
      if (ctrl.applyDelta) {
        ctrl.applyDelta(delta > 0 ? 1 : -1);
      }
    } else if (Math.abs(delta) > 10) {
      // Large jump = absolute value (slider)
      if (ctrl.setValue) {
        const min = ctrl.element.min ? parseFloat(ctrl.element.min) : 0;
        const max = ctrl.element.max ? parseFloat(ctrl.element.max) : 100;
        const newVal = min + (value / 127) * (max - min);
        ctrl.setValue(newVal);
      }
    }

    mapping.lastValue = value;
  }

  _createMapping(ctrl, cc) {
    const controlId = this._getControlId(ctrl);

    const oldId = this.reverseMappings.get(cc);
    if (oldId) this.mappings.delete(oldId);
    const oldMapping = this.mappings.get(controlId);
    if (oldMapping && oldMapping.midiCC !== undefined) {
      this.reverseMappings.delete(oldMapping.midiCC);
    }

    const mappingInfo = {
      midiCC: cc,
      lastValue: 64,
      ...(ctrl.type === 'color' ? { mode: ctrl.mode } : {}),
    };

    this.mappings.set(controlId, mappingInfo);
    this.reverseMappings.set(cc, controlId);

    console.log(
      `✓ Mapped CC${cc} to ${ctrl.label}${
        ctrl.type === 'color'
          ? ` (${ctrl.mode === 'H' ? 'Hue' : 'Brightness'})`
          : ''
      }`
    );
    this.saveMappings();
  }

  _getControlId(ctrl) {
    const safeLabel = ctrl.label.replace(/\s+/g, '_');
    return `${ctrl.type}_${safeLabel}`;
  }

  _clearOverlays() {
    this.overlays.forEach((o) => o.remove());
    this.overlays = [];
  }

  

  loadMappings() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      console.log('Raw mappings from storage:', raw);
      if (!raw) {
        console.log('No mappings found in storage');
        return;
      }
      const { mappings: mappingsObj = {} } = JSON.parse(raw);
      console.log('Parsed mappings:', mappingsObj);

      for (const [id, info] of Object.entries(mappingsObj)) {
        this.mappings.set(id, info);
        if (info.midiCC !== undefined)
          this.reverseMappings.set(info.midiCC, id);
      }

      console.log('Loaded', this.mappings.size, 'mappings');

      this.controllables.forEach((ctrl) => {
        if (ctrl.type === 'color') {
          const info = this.mappings.get(this._getControlId(ctrl));
          if (info?.mode) {
            ctrl.mode = info.mode;
            console.log('Restored mode for', ctrl.label, ':', ctrl.mode);
          }
        }
      });
    } catch (e) {
      console.warn('Failed to load MIDI mappings', e);
    }
  }

  saveMappings() {
    try {
      const mappingsObj = Object.fromEntries(this.mappings);
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({ mappings: mappingsObj })
      );
    } catch (e) {
      console.warn('Failed to save MIDI mappings', e);
    }
  }

  _applyMidiControl(cc, value) {
    const ctrl = this._findControlByCC(cc);
    if (!ctrl) {
      // Optional: debug log if needed
      // console.log('No mapping for CC', cc, '(value:', value, ')');
      return;
    }

    const mapping = this.mappings.get(this._getControlId(ctrl));
    if (!mapping) return;

    const lastValue = mapping.lastValue ?? 64;
    mapping.lastValue = value;

    if (ctrl.type === 'range') {
      // --- UPDATED LOGIC ---
      // Previously, small deltas were forced to be relative (+/- 1 step).
      // Now we treat standard CC inputs as Absolute mapping for ranges.
      // This allows knobs to sweep the full -127 to 127 (or min/max) range smoothly.
      const min = parseFloat(ctrl.element.min) || 0;
      const max = parseFloat(ctrl.element.max) || 100;

      // Map 0-127 MIDI value to the slider's min-max range
      const newVal = min + (value / 127) * (max - min);
      ctrl.setValue(newVal);
    } else if (ctrl.type === 'color') {
      // For colors, we also prefer absolute mapping if the input is standard CC (0-127).
      // This maps the knob position directly to the Hue (0-360) or Brightness (0-1).
      const amount = value / 127;
      // We pass isRelative = false
      this._handleColorDelta(ctrl, amount, false);
    }
  }

  _applyRelativeDelta(cc, delta) {
    const ctrl = this._findControlByCC(cc);
    if (!ctrl) {
      console.log('No mapping for relative CC', cc);
      return;
    }
    console.log('Applying relative delta', delta, 'to', ctrl.label);

    if (ctrl.type === 'range') {
      ctrl.applyDelta(delta);
    } else if (ctrl.type === 'color') {
      this._handleColorDelta(ctrl, delta, true);
    }
  }

  _closeColorPicker() {
    const cp = this.app.colorPicker;
    if (cp._activePicker) {
      cp._activePicker.style.opacity = '0';
      cp._activePicker.style.transform = 'scale(0.8)';
      setTimeout(() => {
        if (cp._activePicker) {
          cp._activePicker.remove();
          cp._activePicker = null;
          cp.currentHueRing = null;
          cp.currentTriangle = null;
        }
      }, 200);
    }
    this.colorPickerTimeout = null;
  }

  

  _findControlByCC(cc) {
    const controlId = this.reverseMappings.get(cc);
    if (!controlId) return null;
    return this.controllables.find((c) => this._getControlId(c) === controlId);
  }

  _handleColorDelta(ctrl, amount, isRelative) {
    const { mode, element: swatch } = ctrl;

    // We let the MidiMapper manage the "keep alive" timer for the UI
    // but we delegate the actual color manipulation to the ColorPicker
    this._ensureColorPickerOpen(swatch);

    if (this.app && this.app.colorPicker) {
      // "Here is a new number (amount) for control (mode) on this widget (swatch)"
      this.app.colorPicker.handleMidiInput(swatch, mode, amount, isRelative);
    }
  }

  

  
}

