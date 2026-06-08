
class ViewControls {
  constructor(baseController, threeDView, customCompassContainer = null) {
      this.baseController = baseController;
      this.threeDView = threeDView;
      this.customCompassContainer = customCompassContainer;

      this.compassBox = null;
      this.spinnerBox = null;
      this.sliders = {};
      this.spinners = {};

      this.rotations = { x: 0, y: 0, z: 0 };

      this.spinnerMoveMult = 5;
      this.spinnerDivider = 20;

      // Track active P2P control mode & last selected slider indexes independently for remembrance
      this.p2pControlMode = 'compass'; // 'compass' or 'tool'
      this.lastCompassSelectedIndex = 0;
      this.lastToolSelectedIndex = 0;
    }

  toggle() {
    if (this.compassBox && this.spinnerBox) {
      this.compassBox.element.style.display === 'none'
        ? this.show()
        : this.hide();
    } else {
      this.show();
    }
  }

  show() {
      if (!this.compassBox) this._createCompassControls();
      this.compassBox.element.style.display = 'block';
      if (this.spinnerBox) {
        this.spinnerBox.element.style.display = 'flex';
        this.spinnerBox.element.style.opacity = '1';
        this.spinnerBox.element.style.transform = 'translateX(-50%) translateY(0)';
      }
    }

  hide() {
      if (this.compassBox) this.compassBox.element.style.display = 'none';
      if (this.spinnerBox) {
        this.spinnerBox.element.style.display = 'none';
        this.spinnerBox.element.style.opacity = '0';
        this.spinnerBox.element.style.transform = 'translateX(-50%) translateY(20px)';
      }
    }

  _createCompassControls() {
      const hostContainer = this.baseController?.domElement?.parentElement || document.body;

      this.rotations = { x: 0, y: 0, z: 0 };
      const savedSettings = this._loadSettings();

      // Programmatic setting load start
      this._isProgrammaticReset = true;

      if (this.customCompassContainer) {
        this.compassBox = {
          element: this.customCompassContainer,
          contentElement: this.customCompassContainer
        };
      } else {
        const parentHeight = hostContainer.clientHeight || window.innerHeight;
        const compassTop = Math.max(20, parentHeight - 485);

        this.compassBox = UITools.makeDialog({
          stateId: 'accuCad-compassBox',
          title: 'Compass Controls',
          width: '225px',
          height: 'auto',
          position: [20, compassTop], 
          titleBarAtBottom: false,
          transparent: true,
          allowMaximize: false,
          noPadding: true,
          appendTo: hostContainer,
        });

        this.compassBox.contentElement.style.overflow = 'hidden';
        this.compassBox.contentElement.style.padding = '4px 6px 6px 6px';
      }

      // Compass Size slider renamed to "size"
      this.sliders.size = new SliderControl({
        label: 'size',
        min: 10,
        max: 500,
        initialValue: savedSettings.size !== undefined ? savedSettings.size : 60,
        showValue: true,
        callback: (val) => {
          const rounded = Number(val.toFixed(0));
          this._applyCompassSetting('size', rounded);
          this._saveSetting('size', rounded);
        },
      });
      this.compassBox.contentElement.appendChild(this.sliders.size.container);

      // Dedicated Swatch Picker for Compass Color - Separated cleanly from drawing color
      const compassColorContainer = document.createElement('div');
      compassColorContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 0; margin-bottom: 8px;';
      
      const compassColorLabel = document.createElement('div');
      compassColorLabel.style.cssText = 'font-size: 11px; color: #aaa; text-transform: uppercase; font-weight: bold;';
      compassColorLabel.textContent = 'color';
      
      const compassSwatch = document.createElement('div');
      compassSwatch.className = 'compass-color-swatch-picker';
      const initialCompassColor = savedSettings.hexColor || '#88ccff';
      this._compassColorHex = initialCompassColor;
      compassSwatch.style.cssText = `width: 42px; height: 20px; border-radius: 4px; background-color: ${initialCompassColor}; border: 1px solid #555; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.5);`;
      this.compassSwatch = compassSwatch;

      compassSwatch.onclick = (e) => {
        e.stopPropagation();
        const picker = new ColorPicker();
        picker.openSmartPicker(compassSwatch, this._compassColorHex || '#88ccff', (newColor) => {
          compassSwatch.style.backgroundColor = newColor;
          this._compassColorHex = newColor;
          
          const rgbNum = this._hexToRgbNum(newColor);
          if (this.baseController.accuDraw?.update) {
            this.baseController.accuDraw.update({ color: rgbNum });
          }
          this._saveSetting('hexColor', newColor);
        });
      };
      
      compassColorContainer.appendChild(compassColorLabel);
      compassColorContainer.appendChild(compassSwatch);
      this.compassBox.contentElement.appendChild(compassColorContainer);

      this.sliders.opa = new SliderControl({
        label: 'transparency',
        min: 0,
        max: 1,
        initialValue: savedSettings.opa !== undefined ? savedSettings.opa : 1,
        showValue: true,
        callback: (val) => {
          const rounded = Number(val.toFixed(2));
          this._applyCompassSetting('transparency', rounded);
          this._saveSetting('opa', rounded);
        },
      });
      this.compassBox.contentElement.appendChild(this.sliders.opa.container);

      this.sliders.sqrcl = new SliderControl({
        label: 'square or circle',
        min: 0,
        max: 1,
        initialValue: savedSettings.sqrcl !== undefined ? savedSettings.sqrcl : 0.5,
        showValue: true,
        callback: (val) => {
          const rounded = Number(val.toFixed(2));
          this._applyCompassSetting('square or circle', rounded);
          this._saveSetting('sqrcl', rounded);
        },
      });
      this.compassBox.contentElement.appendChild(this.sliders.sqrcl.container);

      // Rotation angles constrained cleanly to -90..90
      ['x', 'y', 'z'].forEach((axis) => {
        this.sliders[`${axis}rot`] = new SliderControl({
          label: `${axis} rotation`,
          min: -90,
          max: 90,
          initialValue: 0,
          saveToLocalStorage: false,
          relativeMidi: true,
          showValue: true,
          callback: (val) =>
            this._applyCompassSetting(`${axis} rotation`, Math.round(val)),
        });
        this.compassBox.contentElement.appendChild(
          this.sliders[`${axis}rot`].container
        );
      });

      this.sliders.bg = new SliderControl({
        label: 'background',
        min: 0,
        max: 255,
        initialValue: savedSettings.bg !== undefined ? savedSettings.bg : 34,
        showValue: true,
        callback: (val) => {
          const rounded = Math.round(val);
          this._applyCompassSetting('background', rounded);
          this._saveSetting('bg', rounded);
        },
      });
      this.compassBox.contentElement.appendChild(this.sliders.bg.container);

      // Dedicated 3D infinite roller wheel to displace the AccuDraw coordinate plane along its active Z-vector infinitely
      this.sliders.accudrawZ = new SliderControl({
        label: 'accudraw Z position',
        isInfiniteWheel: true,
        saveToLocalStorage: false,
        callback: (val) => {
          const currentOrigin = this.baseController.origin;
          const delta = typeof window.zMoveDelta !== 'undefined' ? window.zMoveDelta : 0.002;
          const rm = this.baseController.rotationMatrix;
          const zAxis = rm[2];
          // val is the relative horizontal displacement increment
          const displacement = zAxis.map((component) => component * val * delta * 1.5);
          const newOrigin = [
            currentOrigin[0] + displacement[0],
            currentOrigin[1] + displacement[1],
            currentOrigin[2] + displacement[2],
          ];
          this.baseController.setOrigin(newOrigin);
        }
      });
      this.compassBox.contentElement.appendChild(this.sliders.accudrawZ.container);

      // Release initial setup setting lock BEFORE applying settings on start
      this._isProgrammaticReset = false;

      this._applyAllSavedSettings(savedSettings);

      const diagBtn = makeElement('button', {
        className: 'accudraw-diag-btn',
        style: {
          display: 'block',
          width: '100%',
          padding: '8px',
          marginTop: '12px',
          background: '#0a0d0a',
          border: '1px dashed #00ff66',
          color: '#00ff66',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,255,102,0.15)',
          transition: 'all 0.15s ease'
        },
        onclick: () => {
          if (!this.baseController.accuDrawDiagnostics) {
            this.baseController.accuDrawDiagnostics = new AccuDrawDiagnostics(
              this.baseController
            );
          }
          this.baseController.accuDrawDiagnostics.toggle();
        }
      }, 'AccuDraw Diagnostics ▶');

      diagBtn.onmouseover = () => {
        diagBtn.style.background = '#0e240e';
        diagBtn.style.boxShadow = '0 2px 10px rgba(0,255,102,0.3)';
      };
      diagBtn.onmouseout = () => {
        diagBtn.style.background = '#0a0d0a';
        diagBtn.style.boxShadow = '0 2px 6px rgba(0,255,102,0.15)';
      };

      this.compassBox.contentElement.appendChild(diagBtn);

      const spinnerBtn = makeElement('button', {
        className: 'accudraw-diag-btn',
        style: {
          display: 'block',
          width: '100%',
          padding: '8px',
          marginTop: '8px',
          background: '#0a0a0d',
          border: '1px dashed #4af',
          color: '#4af',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(68,170,255,0.15)',
          transition: 'all 0.15s ease'
        },
        onclick: () => {
          if (!this.spinnerBox) {
            this._createSpinnerControls();
          } else {
            const show = this.spinnerBox.element.style.display === 'none';
            this.spinnerBox.element.style.display = show ? 'flex' : 'none';
            this.spinnerBox.element.style.opacity = show ? '1' : '0';
            this.spinnerBox.element.style.transform = show ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)';
          }
        }
      }, 'Toggle View Spinners ▞');

      spinnerBtn.onmouseover = () => {
        spinnerBtn.style.background = '#0e1a24';
        spinnerBtn.style.boxShadow = '0 2px 10px rgba(68,170,255,0.3)';
      };
      spinnerBtn.onmouseout = () => {
        spinnerBtn.style.background = '#0a0a0d';
        spinnerBtn.style.boxShadow = '0 2px 6px rgba(68,170,255,0.15)';
      };

      this.compassBox.contentElement.appendChild(spinnerBtn);
    }

  _createSpinnerControls() {
      const hostContainer = this.baseController?.domElement?.parentElement || document.body;

      // Bottom-floating translucent spinners container dock replacing the heavy Dialog box
      const spinnerBar = document.createElement('div');
      spinnerBar.id = 'accucad-floating-spinners';
      spinnerBar.style.cssText = `
        position: absolute;
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        display: flex;
        flex-direction: row;
        background: rgba(20, 20, 24, 0.85);
        border: 1.5px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 4px 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(12px);
        z-index: 10005;
        gap: 10px;
        align-items: center;
        opacity: 1;
        transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
      `;

      const create = (key, label, cb, color) => {
        this.spinners[key] = new SpinnerWidget(label, cb, color);
        this.spinners[key].appendTo(spinnerBar);
      };

      create('moveX', 'move X', (inc) => this._transformView(inc * this.spinnerMoveMult, 'dx'), [200, 0, 0]);
      create('moveY', 'move Y', (inc) => this._transformView(inc * this.spinnerMoveMult, 'dy'), [0, 180, 0]);
      create('moveZ', 'move Z', (inc) => this._transformView(inc * this.spinnerMoveMult, 'dz'), [0, 110, 255]);
      create('spin', 'spin', (inc) => this._transformView(inc * this.spinnerMoveMult, 'spin'));
      create('tilt', 'tilt', (inc) => this._transformView(inc * this.spinnerMoveMult, 'tilt'));
      create('diagonal', 'diagonal', (inc) => this._transformView(inc * this.spinnerMoveMult, 'ddiag'));
      create('perspective', 'perspective', (inc) => this._transformView(inc, 'dfov'));
      create('accudraw Z', 'accudraw Z', (inc) => this._transformView(inc, 'accudrawZ'));

      hostContainer.appendChild(spinnerBar);
      this.spinnerBox = {
        element: spinnerBar,
        close: () => {
          spinnerBar.remove();
          this.spinnerBox = null;
        }
      };
    }

  _hueToRgb(h) {
    h = h % 360;
    const c = 1,
      x = 1 - Math.abs(((h / 60) % 2) - 1);
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return (
      (Math.round(r * 255) << 16) |
      (Math.round(g * 255) << 8) |
      Math.round(b * 255)
    );
  }

  _buildRotationMatrix(x, y, z) {
      const controller = this.baseController;
      // Start rotation from front view identity as the base absolute anchor
      const base = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];

      const baseM = new THREE.Matrix4().set(
        base[0][0], base[0][1], base[0][2], 0,
        base[1][0], base[1][1], base[1][2], 0,
        base[2][0], base[2][1], base[2][2], 0,
        0, 0, 0, 1
      );

      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(x),
        THREE.MathUtils.degToRad(y),
        THREE.MathUtils.degToRad(z),
        'XYZ'
      );
      const rotM = new THREE.Matrix4().makeRotationFromEuler(euler);

      const combinedM = baseM.clone().multiply(rotM);
      const te = combinedM.elements;
      return [
        [te[0], te[4], te[8]],
        [te[1], te[5], te[9]],
        [te[2], te[6], te[10]],
      ];
    }

  _applyDancerStyle(level) {
    // TODO: The dancer logic should be encapsulated in its own module and passed as a dependency.
    console.log(`TODO: Apply dancer style for level ${level}`);
  }

  _applyCompassSetting(name, value) {
      if (this._isProgrammaticReset) return;

      const controller = this.baseController;
      const view = this.threeDView;
      if (!controller || !view) return;

      const target = controller.accuDraw;

      if (name === 'size') {
        const adjustedSize = value * (1.5 / 300);
        if (target?.setSizeAnimated) {
          target.setSizeAnimated(adjustedSize, 0);
        }
      } else if (name === 'square or circle') {
        if (target?.setSquircleAnimated) {
          target.setSquircleAnimated(value, 0);
        }
      } else if (name === 'background') {
        const percent = value / 255;
        view.scene.background = new THREE.Color(percent, percent, percent);
      } else if (name === 'transparency') {
        if (target?.update) {
          target.update({ opacity: 1 - value });
        }
      } else if (name === 'depth aware') {
        if (target?.update) {
          target.update({ depthTest: value });
        }
      } else if (name.endsWith('rotation')) {
        const axis = name.split(' ')[0];
        this.rotations[axis] = value;
        const updatedMatrix = this._buildRotationMatrix(
          this.rotations.x,
          this.rotations.y,
          this.rotations.z
        );
        if (target?.setRotationAnimated) {
          controller.rotationMatrix = updatedMatrix;
          target.setRotationAnimated(updatedMatrix, 0);
          controller.refreshMousePosition();
        }
      }
    }

  _transformView(inc, name) {
    if (name === 'accudrawZ') {
      const currentOrigin = this.baseController.origin;
      const delta =
        typeof window.zMoveDelta !== 'undefined' ? window.zMoveDelta : 0.002;
      const rm = this.baseController.rotationMatrix;
      const zAxis = rm[2];
      const displacement = zAxis.map((component) => component * inc * delta);
      const newOrigin = [
        currentOrigin[0] + displacement[0],
        currentOrigin[1] + displacement[1],
        currentOrigin[2] + displacement[2],
      ];
      this.baseController.setOrigin(newOrigin);
      return;
    }

    const adjustments = { [name]: inc / this.spinnerDivider };
    TransformView.transform(adjustments, this.threeDView)
      .then((finalValues) => {
        // TODO: The tableDialog global needs to be refactored into a dependency.
        if (window.tableDialog) {
          const o = {
            target: [
              finalValues.targetX,
              finalValues.targetY,
              finalValues.targetZ,
            ],
            spin: finalValues.spin,
            tilt: finalValues.tilt,
            perspective: finalValues.fov,
            diagonal: finalValues.diag,
            lights: finalValues.envRotation,
          };
          window.tableDialog.updateValues(o);
        }
      })
      .catch((err) => console.error('[transformView] Error:', err));
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem('accuCad-viewControlSettings');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('[ViewControls] Failed to load settings', e);
    }
    return {};
  }

  _saveSetting(key, value) {
    try {
      const current = this._loadSettings();
      current[key] = value;
      localStorage.setItem(
        'accuCad-viewControlSettings',
        JSON.stringify(current)
      );
    } catch (e) {
      console.warn('[ViewControls] Failed to save setting', e);
    }
  }

  _applyAllSavedSettings(settings) {
      if (settings.size !== undefined) {
        this._applyCompassSetting('size', settings.size);
      }
      if (settings.hexColor !== undefined) {
        this._compassColorHex = settings.hexColor;
        if (this.compassSwatch) {
          this.compassSwatch.style.backgroundColor = settings.hexColor;
        }
        if (this.baseController.accuDraw?.update) {
          this.baseController.accuDraw.update({ color: this._hexToRgbNum(settings.hexColor) });
        }
      }
      if (settings.opa !== undefined) {
        this._applyCompassSetting('transparency', settings.opa);
      }
      if (settings.sqrcl !== undefined) {
        this._applyCompassSetting('square or circle', settings.sqrcl);
      }
      if (settings.bg !== undefined) {
        this._applyCompassSetting('background', settings.bg);
      }
    }


  destroy() {
      if (this.compassBox && typeof this.compassBox.close === 'function') {
        try { this.compassBox.close(); } catch (e) {}
      }
      if (this.spinnerBox && typeof this.spinnerBox.close === 'function') {
        try { this.spinnerBox.close(); } catch (e) {}
      }
      this.compassBox = null;
      this.spinnerBox = null;
    }

  resetRotationSliders(planeType = 'front') {
      this._isProgrammaticReset = true;
      
      this.rotations = { x: 0, y: 0, z: 0 };
      if (planeType === 'top') {
        this.rotations.x = 90;
      } else if (planeType === 'side') {
        this.rotations.y = 90;
      }

      ['x', 'y', 'z'].forEach((axis) => {
        const slider = this.sliders[`${axis}rot`];
        if (slider) {
          slider.setValue(this.rotations[axis]);
        }
      });
      
      this._isProgrammaticReset = false;
    }

  highlightCompassBox(highlight) {
      // Map directly to highlightActiveControlBox to unify all code execution paths
      this.highlightActiveControlBox(highlight ? 'sliders' : 'tool');
    }

  selectSliderRelative(change) {
      const allSliders = this.getNavigatableSliders();
      if (allSliders.length === 0) return;

      const activeMode = this.p2pControlMode || 'compass';
      const activeList = allSliders.filter(item => item.type === activeMode);
      if (activeList.length === 0) return;

      // Localize selection inside this specific active box
      const globalIndex = this.selectedSliderIndex || 0;
      let localIndex = activeList.findIndex(item => {
        return allSliders.indexOf(item) === globalIndex;
      });
      if (localIndex === -1) localIndex = 0;

      // Restrict up/down cycling solely to this active list (enforcing wrapping)
      const nextLocalIndex = (localIndex + change + activeList.length) % activeList.length;

      // Remember selection index for this box
      if (activeMode === 'compass') {
        this.lastCompassSelectedIndex = nextLocalIndex;
      } else {
        this.lastToolSelectedIndex = nextLocalIndex;
      }

      const targetItem = activeList[nextLocalIndex];
      const targetGlobalIndex = allSliders.indexOf(targetItem);
      this.setSelectedSliderIndex(targetGlobalIndex);

      this.recenterDragLineOnActive();
    }

  adjustSelectedSlider(ratio) {
      const list = this.getNavigatableSliders();
      if (list.length === 0) return;

      if (this.selectedSliderIndex === undefined || this.selectedSliderIndex === null) {
        this.selectedSliderIndex = 0;
      }
      const item = list[this.selectedSliderIndex];
      if (item && this.sliderStartValue !== undefined) {
        const slider = item.slider;
        const key = item.key;
        
        if (key === 'accudrawZ') {
          // Calculate relative horizontal drag delta on the host
          if (this._lastP2PRatio === undefined) {
            this._lastP2PRatio = ratio;
            return;
          }
          const dRatio = ratio - this._lastP2PRatio;
          this._lastP2PRatio = ratio;

          // Scale relative displacement to rotate the infinite wheel smoothly with high speed
          const scale = dRatio * 250;
          slider.wheelOffset += scale;
          slider.drawWheel();

          // Smoothly accumulate kinetic velocity for release-flick inertia triggers
          slider.wheelVelocity = slider.wheelVelocity * 0.4 + scale * 0.6;
          
          if (typeof slider.options.callback === 'function') {
            slider.options.callback(scale);
          }
          return;
        }

        if (key === 'drawingColor') {
          let newHue = (this.sliderStartValue + ratio * 360) % 360;
          if (newHue < 0) newHue += 360;

          const hsv = this._hexToHsv(this.baseController.currentColor || '#00ff00');
          const newHex = this._hsvToHex(newHue, hsv.s, hsv.v);

          this.baseController.setColor(newHex);
          if (this.baseController.colorSwatchPicker) {
            this.baseController.colorSwatchPicker.style.backgroundColor = newHex;
          }
          
          if (typeof ColorPicker !== 'undefined' && ColorPicker.activeInstance) {
            ColorPicker.activeInstance.updateColorExternal(newHex);
          }

          this.baseController.refreshMousePosition();
          return;
        }

        if (key === 'compassColor') {
          let newHue = (this.sliderStartValue + ratio * 360) % 360;
          if (newHue < 0) newHue += 360;

          const hsv = this._hexToHsv(this._compassColorHex || '#88ccff');
          const newHex = this._hsvToHex(newHue, hsv.s, hsv.v);

          this._compassColorHex = newHex;
          if (this.compassSwatch) {
            this.compassSwatch.style.backgroundColor = newHex;
          }
          if (this.baseController.accuDraw?.update) {
            this.baseController.accuDraw.update({ color: this._hexToRgbNum(newHex) });
          }
          this._saveSetting('hexColor', newHex);

          if (typeof ColorPicker !== 'undefined' && ColorPicker.activeInstance) {
            ColorPicker.activeInstance.updateColorExternal(newHex);
          }
          return;
        }

        const rangeInfo = this._getSliderRange(key, slider);
        const min = rangeInfo.min;
        const max = rangeInfo.max;
        const range = max - min;
        
        let newVal = this.sliderStartValue + ratio * range;
        newVal = Math.max(min, Math.min(max, newVal));
        slider.setValue(newVal);

        this._showDiagnosticHud(key, this.sliderStartValue, ratio, newVal, min, max);
      }
    }

  _updateSlidersHighlighting() {
      const list = this.getNavigatableSliders();
      const activeMode = this.p2pControlMode || 'compass';

      list.forEach((item, idx) => {
        const slider = item.slider;
        if (slider && slider.container) {
          slider.container.style.setProperty('transition', 'all 0.15s ease', 'important');
          slider.container.style.removeProperty('border-left');
          slider.container.style.removeProperty('background');
          slider.container.style.removeProperty('padding-left');

          // Only apply green accent trims if the item belongs to the active box
          if (idx === this.selectedSliderIndex && item.type === activeMode) {
            slider.container.style.setProperty('border-left', '4px solid #00e676', 'important');
            slider.container.style.setProperty('background', 'rgba(0, 230, 118, 0.15)', 'important');
            slider.container.style.setProperty('padding-left', '6px', 'important');
          }
        }
      });
    }

  _clearSlidersHighlighting() {
      const list = this.getNavigatableSliders();
      list.forEach((item) => {
        const slider = item.slider;
        if (slider && slider.container) {
          slider.container.style.borderLeft = '';
          slider.container.style.background = '';
          slider.container.style.paddingLeft = '';
        }
      });
    }

  startSliderAdjustment() {
      this._lastP2PRatio = 0; // Initialize ratio anchor on touch start

      if (this.hoverIndicatorLine) {
        this.hoverIndicatorLine.style.opacity = '0';
        setTimeout(() => {
          if (this.hoverIndicatorLine && this.hoverIndicatorLine.style.opacity === '0') {
            this.hoverIndicatorLine.style.display = 'none';
          }
        }, 150);
      }

      const list = this.getNavigatableSliders();
      if (list.length === 0) return;

      if (this.selectedSliderIndex === undefined || this.selectedSliderIndex === null) {
        this.selectedSliderIndex = 0;
      }
      const item = list[this.selectedSliderIndex];
      if (item) {
        const slider = item.slider;
        
        if (item.key === 'drawingColor') {
          const hsv = this._hexToHsv(this.baseController.currentColor || '#00ff00');
          this.sliderStartValue = hsv.h;
          if (this.baseController.colorSwatchPicker) {
            const activePicker = document.querySelector('.smart-picker-surface');
            if (!activePicker) {
              this.baseController.colorSwatchPicker.click();
            }
          }
          return;
        }

        if (item.key === 'compassColor') {
          const hsv = this._hexToHsv(this._compassColorHex || '#88ccff');
          this.sliderStartValue = hsv.h;
          if (this.compassSwatch) {
            const activePicker = document.querySelector('.smart-picker-surface');
            if (!activePicker) {
              this.compassSwatch.click();
            }
          }
          return;
        }

        let val = slider.value;
        if (val === undefined) {
          if (slider.options && slider.options.value !== undefined) {
            val = slider.options.value;
          } else if (slider.config && slider.config.value !== undefined) {
            val = slider.config.value;
          } else if (typeof slider.getValue === 'function') {
            val = slider.getValue();
          } else if (slider.container) {
            const input = slider.container.querySelector('input[type="range"]');
            if (input) {
              const rawVal = parseFloat(input.value);
              const domMin = parseFloat(input.getAttribute('min')) || 0;
              const domMax = parseFloat(input.getAttribute('max')) || 1000;
              const domRange = domMax - domMin;
              
              const rangeInfo = this._getSliderRange(item.key, slider);
              if (domRange > 0) {
                const pct = (rawVal - domMin) / domRange;
                val = rangeInfo.min + pct * (rangeInfo.max - rangeInfo.min);
              }
            }
          }
        }
        this.sliderStartValue = val !== undefined && !isNaN(val) ? val : 0;
      }
    }

  _getSliderRange(key, slider) {
      let min = undefined;
      let max = undefined;

      if (slider) {
        if (slider.min !== undefined) min = slider.min;
        if (slider.max !== undefined) max = slider.max;

        if (slider.options) {
          if (slider.options.min !== undefined) min = slider.options.min;
          if (slider.options.max !== undefined) max = slider.options.max;
        }

        if (slider.config) {
          if (slider.config.min !== undefined) min = slider.config.min;
          if (slider.config.max !== undefined) max = slider.config.max;
        }
      }

      // Exact mathematical defaults representing the target CAD sliders
      const staticRanges = {
        size: { min: 10, max: 500 },
        hue: { min: 0, max: 360 },
        opa: { min: 0, max: 1 },
        depth: { min: 0, max: 1 },
        sqrcl: { min: 0, max: 1 },
        xrot: { min: -127, max: 127 },
        yrot: { min: -127, max: 127 },
        zrot: { min: -127, max: 127 },
        bg: { min: 0, max: 255 }
      };

      const fb = staticRanges[key] || { min: 0, max: 100 };
      return {
        min: min !== undefined ? min : fb.min,
        max: max !== undefined ? max : fb.max
      };
    }

  

  getNavigatableSliders() {
      const list = [];
      
      // 1. Size Slider (First visually in Compass)
      if (this.sliders.size) {
        list.push({ key: 'size', slider: this.sliders.size, type: 'compass' });
      }
      
      // 2. Compass Color Swatch (Second visually in Compass!)
      if (this.compassSwatch) {
        list.push({
          key: 'compassColor',
          slider: {
            container: this.compassSwatch.parentElement || this.compassSwatch,
            value: this._hexToHsv(this._compassColorHex || '#88ccff').h,
            setValue: (val) => {
              const hsv = this._hexToHsv(this._compassColorHex || '#88ccff');
              const newHex = this._hsvToHex(val % 360, hsv.s, hsv.v);
              this._compassColorHex = newHex;
              if (this.compassSwatch) {
                this.compassSwatch.style.backgroundColor = newHex;
              }
              if (this.baseController.accuDraw?.update) {
                this.baseController.accuDraw.update({ color: this._hexToRgbNum(newHex) });
              }
              this._saveSetting('hexColor', newHex);
            }
          },
          type: 'compass'
        });
      }

      // 3. Other Compass Sliders (With accudrawZ re-enabled for Touch selection!)
      const remainingKeys = ['opa', 'sqrcl', 'xrot', 'yrot', 'zrot', 'bg', 'accudrawZ'];
      remainingKeys.forEach(key => {
        if (this.sliders[key]) {
          list.push({
            key: key,
            slider: this.sliders[key],
            type: 'compass'
          });
        }
      });

      // 4. Drawing Color Swatch (First visually in Tool Settings)
      const swatchPicker = this.baseController?.colorSwatchPicker;
      if (swatchPicker) {
        const hsv = this._hexToHsv(this.baseController.currentColor || '#00ff00');
        list.push({
          key: 'drawingColor',
          slider: {
            container: swatchPicker.parentElement || swatchPicker,
            value: hsv.h,
            setValue: (val) => {
              const hsvCurrent = this._hexToHsv(this.baseController.currentColor || '#00ff00');
              const newHex = this._hsvToHex(val % 360, hsvCurrent.s, hsvCurrent.v);
              this.baseController.setColor(newHex);
              if (this.baseController.colorSwatchPicker) {
                this.baseController.colorSwatchPicker.style.backgroundColor = newHex;
              }
              this.baseController.refreshMousePosition();
            }
          },
          type: 'tool'
        });
      }

      // 5. Remaining Tool Sliders
      const sidePanel = this.baseController?.sidePanel;
      const toolSliders = this.baseController?.toolSliders || sidePanel?.toolSliders;
      if (toolSliders) {
        Object.entries(toolSliders).forEach(([key, slider]) => {
          if (slider) {
            list.push({
              key: key,
              slider: slider,
              type: 'tool'
            });
          }
        });
      }

      return list;
    }

  selectSliderAbsolute(index) {
      const list = this.getNavigatableSliders();
      if (list.length === 0) return;
      this.selectedSliderIndex = Math.max(0, Math.min(list.length - 1, index));
      this._updateSlidersHighlighting();
    }

  handleSliderDragStart(mode) {
      this.p2pControlMode = mode === 'sliders' ? 'compass' : (mode || 'compass');
      
      const sidePanel = this.baseController?.sidePanel;
      if (!sidePanel) return;

      const sectionObj = this.p2pControlMode === 'compass' 
        ? sidePanel.sections['compass']
        : sidePanel.sections['setup'];
        
      const parent = sectionObj?.element;
      if (!parent) return;

      // Glow neon green dashed indicator
      if (!this.hoverIndicatorLine) {
        this.hoverIndicatorLine = document.createElement('div');
        this.hoverIndicatorLine.id = 'p2p-hover-indicator-line';
        this.hoverIndicatorLine.style.cssText = 'position: fixed; left: 12px; right: 12px; height: 1px; border-top: 1.5px dashed #00e676; pointer-events: none; z-index: 999999; opacity: 0; transition: opacity 0.15s ease; filter: drop-shadow(0 0 3px #00e676);';
      }

      if (this.hoverIndicatorLine.parentElement !== document.body) {
        document.body.appendChild(this.hoverIndicatorLine);
      }

      const allSliders = this.getNavigatableSliders();
      this.activeSlidersForDrag = allSliders.filter(item => {
        return item.type === this.p2pControlMode;
      });

      const N = this.activeSlidersForDrag.length;
      if (N === 0) return;

      const globalIndex = this.selectedSliderIndex || 0;
      let localIndex = this.activeSlidersForDrag.findIndex(item => {
        return allSliders.indexOf(item) === globalIndex;
      });
      if (localIndex === -1) {
        localIndex = 0;
        this.selectedSliderIndex = allSliders.indexOf(this.activeSlidersForDrag[0]);
        this._updateSlidersHighlighting();
      }
      this.dragLocalIndex = localIndex;

      // Extract viewport offsets cleanly
      const firstSlider = this.activeSlidersForDrag[0].slider?.container;
      const lastSlider = this.activeSlidersForDrag[N - 1].slider?.container;

      if (!firstSlider || !lastSlider) return;

      const firstRect = firstSlider.getBoundingClientRect();
      const lastRect = lastSlider.getBoundingClientRect();

      // Set boundary values to align exactly with the first and last slider centers
      const firstCenterY = (firstRect.top + firstRect.bottom) / 2;
      const lastCenterY = (lastRect.top + lastRect.bottom) / 2;

      this.dragTotalHeight = lastCenterY - firstCenterY;
      this.dragMinY = firstCenterY;
      this.dragMaxY = lastCenterY;

      const parentRect = parent.getBoundingClientRect();
      this.hoverIndicatorLine.style.left = `${parentRect.left + 8}px`;
      this.hoverIndicatorLine.style.width = `${parentRect.width - 16}px`;

      const selectedSlider = this.activeSlidersForDrag[localIndex].slider?.container;
      if (selectedSlider) {
        const selectedRect = selectedSlider.getBoundingClientRect();
        const centerY = (selectedRect.top + selectedRect.bottom) / 2;
        this.dragStartCenterY = centerY;
        this.dragCurrentY = centerY;

        this.hoverIndicatorLine.style.top = `${centerY}px`;
        this.hoverIndicatorLine.style.display = 'block';
        this.hoverIndicatorLine.style.opacity = '1';
      }
    }

  handleSliderDragMove(dy, phoneHeight) {
      if (!this.hoverIndicatorLine || !this.activeSlidersForDrag) return;

      const N = this.activeSlidersForDrag.length;
      if (N === 0) return;

      const scale = phoneHeight ? (this.dragTotalHeight / (phoneHeight * 0.45)) : 1.8;
      const hostDy = dy * scale;
      
      const targetY = Math.max(this.dragMinY, Math.min(this.dragMaxY, this.dragStartCenterY + hostDy));
      this.dragCurrentY = targetY;

      this.hoverIndicatorLine.style.top = `${targetY}px`;

      let closestIdx = 0;
      let minDistance = Infinity;

      this.activeSlidersForDrag.forEach((item, idx) => {
        const container = item.slider?.container;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (rect.width === 0) return; // Ignore hidden elements
        const centerY = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(targetY - centerY);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      if (this.dragLocalIndex !== closestIdx) {
        this.dragLocalIndex = closestIdx;
        const allSliders = this.getNavigatableSliders();
        const targetItem = this.activeSlidersForDrag[closestIdx];
        
        const targetGlobalIndex = allSliders.findIndex(item => item.key === targetItem.key);
        
        if (this.p2pControlMode === 'compass') {
          this.lastCompassSelectedIndex = closestIdx;
        } else {
          this.lastToolSelectedIndex = closestIdx;
        }

        this.setSelectedSliderIndex(targetGlobalIndex);
      }
    }

  handleSliderDragEnd() {
      if (this.hoverIndicatorLine) {
        this.hoverIndicatorLine.style.opacity = '0';
        
        if (this.activeSlidersForDrag && this.activeSlidersForDrag[this.dragLocalIndex]) {
          const selectedSlider = this.activeSlidersForDrag[this.dragLocalIndex].slider?.container;
          if (selectedSlider) {
            const selectedRect = selectedSlider.getBoundingClientRect();
            const finalY = (selectedRect.top + selectedRect.bottom) / 2;
            this.hoverIndicatorLine.style.top = `${finalY}px`;
          }
        }
        
        setTimeout(() => {
          if (this.hoverIndicatorLine && this.hoverIndicatorLine.style.opacity === '0') {
            this.hoverIndicatorLine.style.display = 'none';
          }
        }, 150);
      }

      // If releasing an infinite wheel with sliding velocity, trigger its native, high-performance inertia
      if (this.sliders.accudrawZ && Math.abs(this.sliders.accudrawZ.wheelVelocity) > 0.5) {
        this.sliders.accudrawZ._startWheelInertia();
      }
      this._lastP2PRatio = undefined;

      // Close the ColorPicker popup smoothly on slider adjustment release
      const activePicker = document.querySelector('.smart-picker-surface');
      if (activePicker) {
        activePicker.style.opacity = '0';
        activePicker.style.transform = 'scale(0.8)';
        setTimeout(() => activePicker.remove(), 200);
      }
    }

  recenterDragLineOnActive() {
      if (!this.hoverIndicatorLine || !this.activeSlidersForDrag) return;

      const globalList = this.getNavigatableSliders();
      const globalIndex = this.selectedSliderIndex || 0;

      let localIndex = this.activeSlidersForDrag.findIndex(item => {
        return globalList.indexOf(item) === globalIndex;
      });
      if (localIndex === -1) localIndex = 0;
      this.dragLocalIndex = localIndex;

      const selectedSlider = this.activeSlidersForDrag[localIndex].slider.container;
      const selectedRect = selectedSlider.getBoundingClientRect();

      const centerY = (selectedRect.top + selectedRect.bottom) / 2;
      this.dragStartCenterY = centerY;
      this.dragCurrentY = centerY;

      this.hoverIndicatorLine.style.top = `${centerY}px`;
    }

  highlightActiveControlBox(mode) {
      const mappedControlMode = mode === 'sliders' ? 'compass' : (mode === 'tool' ? 'tool' : 'compass');
      const isModeChange = this.p2pControlMode !== mappedControlMode;
      
      this.p2pControlMode = mappedControlMode;
      
      const sidePanel = this.baseController?.sidePanel;
      if (!sidePanel) {
        return;
      }

      // Extract sections cleanly from SidePanel reference registry
      const compassObj = sidePanel.sections?.['compass'];
      const compassBox = compassObj?.element;
      const compassHeader = compassObj?.element?.querySelector('summary');

      const toolObj = sidePanel.sections?.['setup'];
      const toolBox = toolObj?.element;
      const toolHeader = toolObj?.element?.querySelector('summary');

      const applyHighlightStyle = (box, header, highlight) => {
        if (!box) return;

        if (highlight) {
          box.classList.add('active-p2p-section');
          box.open = true; // Automatically expand the toggled section
          
          box.style.setProperty('box-shadow', '0 0 25px rgba(0, 230, 118, 0.45)', 'important');
          box.style.setProperty('border-color', '#00e676', 'important');
          box.style.setProperty('border-width', '1.5px', 'important');
          box.style.setProperty('border-style', 'solid', 'important');
          box.style.setProperty('border-radius', '6px', 'important');
          box.style.setProperty('background', 'rgba(0, 230, 118, 0.05)', 'important');
          
          if (header) {
            header.style.setProperty('background', 'linear-gradient(90deg, rgba(0, 230, 118, 0.35), rgba(0, 230, 118, 0.06))', 'important');
            header.style.setProperty('color', '#00ff66', 'important');
            header.style.setProperty('text-shadow', '0 0 6px rgba(0, 255, 102, 0.8)', 'important');
          }
        } else {
          box.classList.remove('active-p2p-section');
          // PRESERVE existing open state of other sections; do not force close them
          
          box.style.removeProperty('box-shadow');
          box.style.removeProperty('border-color');
          box.style.removeProperty('border-width');
          box.style.removeProperty('border-style');
          box.style.removeProperty('border-radius');
          box.style.removeProperty('background');
          
          if (header) {
            header.style.removeProperty('background');
            header.style.removeProperty('color');
            header.style.removeProperty('text-shadow');
          }
        }
      };

      if (this.p2pControlMode === 'compass') {
        applyHighlightStyle(compassBox, compassHeader, true);
        applyHighlightStyle(toolBox, toolHeader, false);
      } else {
        applyHighlightStyle(compassBox, compassHeader, false);
        applyHighlightStyle(toolBox, toolHeader, true);
      }

      // Dispatch layout event to let UI recalculate margins smoothly
      window.dispatchEvent(new CustomEvent('panel-toggle-complete'));

      if (isModeChange) {
        const allSliders = this.getNavigatableSliders();
        const activeSliders = allSliders.filter(item => item.type === this.p2pControlMode);
        if (activeSliders.length > 0) {
          const rememberedLocalIdx = this.p2pControlMode === 'compass' 
            ? (this.lastCompassSelectedIndex || 0)
            : (this.lastToolSelectedIndex || 0);
            
          const clampedLocalIdx = Math.max(0, Math.min(activeSliders.length - 1, rememberedLocalIdx));
          const targetIndex = allSliders.indexOf(activeSliders[clampedLocalIdx]);
          
          this.setSelectedSliderIndex(targetIndex);
        } else {
          this._updateSlidersHighlighting();
        }
      } else {
        this._updateSlidersHighlighting();
      }

      // Present a clean and elegant computer screen HUD notification
      if (typeof UITools !== 'undefined' && typeof UITools.showHUD === 'function') {
        const modeLabel = this.p2pControlMode === 'compass' ? 'Compass Controls' : 'Tool Settings';
        UITools.showHUD({
          id: 'p2p-mode-hud',
          html: `<div style="padding: 10px 20px; background: rgba(20, 20, 25, 0.95); border: 1.5px solid #00e676; border-radius: 30px; color: #fff; font-family: monospace; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.4); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #00e676;">🎛️</span> Mode: ${modeLabel}
                 </div>`,
          position: 'bottom',
          autoClose: 1800
        });
      }
    }

  setSelectedSliderIndex(index) {
      const list = this.getNavigatableSliders();
      if (list.length === 0) return;

      const newIndex = Math.max(0, Math.min(list.length - 1, index));
      this.selectedSliderIndex = newIndex;
      this._updateSlidersHighlighting();
    }

  _hexToHsv(hex) {
      if (!hex) return { h: 0, s: 1, v: 1 };
      let r = 0, g = 0, b = 0;
      hex = String(hex).trim();
      if (hex.startsWith('#')) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }
        r = parseInt(hex.substring(0, 2), 16) / 255;
        g = parseInt(hex.substring(2, 4), 16) / 255;
        b = parseInt(hex.substring(4, 6), 16) / 255;
      } else {
        const rgbMatch = hex.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
        if (rgbMatch) {
          r = parseInt(rgbMatch[1]) / 255;
          g = parseInt(rgbMatch[2]) / 255;
          b = parseInt(rgbMatch[3]) / 255;
        }
      }
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        r = 0; g = 1; b = 0; // Default green fallback
      }
      let max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, v = max;
      let d = max - min;
      s = max === 0 ? 0 : d / max;
      if (max === min) {
        h = 0;
      } else {
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h: h * 360, s, v };
    }

  _hsvToHex(h, s, v) {
      h /= 360;
      let r, g, b;
      let i = Math.floor(h * 6);
      let f = h * 6 - i;
      let p = v * (1 - s);
      let q = v * (1 - f * s);
      let t = v * (1 - (1 - f) * s);
      switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
      }
      const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      return '#' + toHex(r) + toHex(g) + toHex(b);
    }

  _hexToRgbNum(hex) {
      hex = String(hex).replace('#', '');
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      return parseInt(hex, 16);
    }

  handleRemoteAccudrawZ(dy) {
      if (this.sliders.accudrawZ) {
        // Roll the infinite wheel on computer screen in real-time matching the finger gesture
        this.sliders.accudrawZ.wheelOffset -= dy * 1.5;
        this.sliders.accudrawZ.drawWheel();

        // Fire the underlying displacement callback
        if (typeof this.sliders.accudrawZ.options.callback === 'function') {
          this.sliders.accudrawZ.options.callback(-dy * 1.5);
        }
      }
    }
}

