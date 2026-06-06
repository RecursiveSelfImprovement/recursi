
class ViewControls {
  constructor(baseController, threeDView) {
      this.baseController = baseController;
      this.threeDView = threeDView;

      this.compassBox = null;
      this.spinnerBox = null;
      this.sliders = {};
      this.spinners = {};

      this.rotations = { x: 0, y: 0, z: 0 };

      this.spinnerMoveMult = 5;
      this.spinnerDivider = 20;
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
    if (!this.spinnerBox) this._createSpinnerControls();

    this.compassBox.element.style.display = 'block';
    this.spinnerBox.element.style.display = 'block';
  }

  hide() {
    if (this.compassBox) this.compassBox.element.style.display = 'none';
    if (this.spinnerBox) this.spinnerBox.element.style.display = 'none';
  }

  _createCompassControls() {
      const hostContainer = this.baseController?.domElement?.parentElement || document.body;
      const parentHeight = hostContainer.clientHeight || window.innerHeight;

      this.rotations = { x: 0, y: 0, z: 0 };
      const savedSettings = this._loadSettings();

      const spinnerTop = Math.max(20, parentHeight - 85);
      const compassTop = Math.max(20, spinnerTop - 425);

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

      this.sliders.size = new SliderControl({
        label: 'compass size',
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

      this.sliders.hue = new SliderControl({
        label: 'color',
        min: 0,
        max: 360,
        initialValue: savedSettings.hue !== undefined ? savedSettings.hue : 0,
        showValue: true,
        callback: (val) => {
          this._applyCompassSetting('color', (val + 30) % 360);
          this._saveSetting('hue', val);
        },
      });
      this.compassBox.contentElement.appendChild(this.sliders.hue.container);

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

      this.sliders.depth = new SliderControl({
        label: 'depth aware',
        min: 0,
        max: 1,
        initialValue: savedSettings.depth !== undefined ? savedSettings.depth : 1,
        showValue: true,
        callback: (val) => {
          this._applyCompassSetting('depth aware', val >= 0.5);
          this._saveSetting('depth', val);
        },
      });
      this.compassBox.contentElement.appendChild(this.sliders.depth.container);

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

      ['x', 'y', 'z'].forEach((axis) => {
        this.sliders[`${axis}rot`] = new SliderControl({
          label: `${axis} rotation`,
          min: -127,
          max: 127,
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

      this._applyAllSavedSettings(savedSettings);

      // ADDED: Glowing Diagnostics Launcher Button for Bentley Presenters
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
      }, 'AccuDraw Diagnostics \u25b6');

      diagBtn.onmouseover = () => {
        diagBtn.style.background = '#0e240e';
        diagBtn.style.boxShadow = '0 2px 10px rgba(0,255,102,0.3)';
      };
      diagBtn.onmouseout = () => {
        diagBtn.style.background = '#0a0d0a';
        diagBtn.style.boxShadow = '0 2px 6px rgba(0,255,102,0.15)';
      };

      this.compassBox.contentElement.appendChild(diagBtn);
    }

  _createSpinnerControls() {
      const hostContainer = this.baseController?.domElement?.parentElement || document.body;
      const parentHeight = hostContainer.clientHeight || window.innerHeight;
      const width = 740;
      
      const left = 20;
      const top = Math.max(20, parentHeight - 85);

      this.spinnerBox = UITools.makeDialog({
        stateId: 'accuCad-spinnerBox',
        title: 'View Spinners',
        width: `${width}px`,
        height: '55px',
        position: [left, top],
        titleBarAtBottom: false,
        transparent: true,
        allowMaximize: false,
        noPadding: true,
        appendTo: hostContainer,
      });

      this.spinnerBox.contentElement.style.display = 'flex';
      this.spinnerBox.contentElement.style.flexDirection = 'row';
      this.spinnerBox.contentElement.style.overflow = 'hidden';
      this.spinnerBox.contentElement.style.padding = '0';

      const create = (key, label, cb, color) => {
        this.spinners[key] = new SpinnerWidget(label, cb, color);
        this.spinners[key].appendTo(this.spinnerBox.contentElement);
      };

      create('moveX', 'move X', (inc) => this._transformView(inc * this.spinnerMoveMult, 'dx'), [200, 0, 0]);
      create('moveY', 'move Y', (inc) => this._transformView(inc * this.spinnerMoveMult, 'dy'), [0, 180, 0]);
      create('moveZ', 'move Z', (inc) => this._transformView(inc * this.spinnerMoveMult, 'dz'), [0, 110, 255]);
      create('spin', 'spin', (inc) => this._transformView(inc * this.spinnerMoveMult, 'spin'));
      create('tilt', 'tilt', (inc) => this._transformView(inc * this.spinnerMoveMult, 'tilt'));
      create('diagonal', 'diagonal', (inc) => this._transformView(inc * this.spinnerMoveMult, 'ddiag'));
      create('perspective', 'perspective', (inc) => this._transformView(inc, 'dfov'));
      create('accudraw Z', 'accudraw Z', (inc) => this._transformView(inc, 'accudrawZ'));

      const p2pBtn = makeElement('button', {
        style: {
          width: '50px',
          height: '100%',
          background: '#090a0f',
          border: 'none',
          borderLeft: '1px solid #333',
          color: '#00e676',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box'
        },
        onclick: () => {
          if (this.baseController && this.baseController.p2pConnector) {
            this.baseController.p2pConnector.showDialog();
          }
        }
      }, 'P2P');
      this.spinnerBox.contentElement.appendChild(p2pBtn);
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
      const base = (controller && controller.basePlaneMatrix) ? controller.basePlaneMatrix : [
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
      // Bypass settings updates if they are triggered by a programmatic slider reset
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
      } else if (name === 'color') {
        const colorVal = this._hueToRgb(value);
        if (target?.setColorAnimated) {
          target.setColorAnimated(colorVal, 0);
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
      if (settings.hue !== undefined) {
        this._applyCompassSetting('color', (settings.hue + 30) % 360);
      }
      if (settings.opa !== undefined) {
        this._applyCompassSetting('transparency', settings.opa);
      }
      if (settings.depth !== undefined) {
        this._applyCompassSetting('depth aware', settings.depth >= 0.5);
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

  resetRotationSliders() {
      // Set the programmatic flag to block redundant callbacks during plane snaps
      this._isProgrammaticReset = true;
      this.rotations = { x: 0, y: 0, z: 0 };
      ['x', 'y', 'z'].forEach((axis) => {
        const slider = this.sliders[`${axis}rot`];
        if (slider) {
          slider.setValue(0);
        }
      });
      this._isProgrammaticReset = false;
    }

  highlightCompassBox(highlight) {
      if (this.compassBox && this.compassBox.element) {
        if (highlight) {
          this.compassBox.element.style.boxShadow = '0 0 25px #00e676';
          this.compassBox.element.style.borderColor = '#00e676';
          this.compassBox.element.style.borderWidth = '2px';
          this.compassBox.element.style.transition = 'all 0.3s ease';
          this._updateSlidersHighlighting();
        } else {
          this.compassBox.element.style.boxShadow = '';
          this.compassBox.element.style.borderColor = '';
          this.compassBox.element.style.borderWidth = '';
          this._clearSlidersHighlighting();
        }
      }
    }

  selectSliderRelative(change) {
      const list = ['size', 'hue', 'opa', 'depth', 'sqrcl', 'xrot', 'yrot', 'zrot', 'bg'];
      if (!this.selectedSliderIndex && this.selectedSliderIndex !== 0) {
        this.selectedSliderIndex = 0;
      }
      this.selectedSliderIndex = (this.selectedSliderIndex + change + list.length) % list.length;
      this._updateSlidersHighlighting();
    }

  adjustSelectedSlider(ratio) {
      const list = ['size', 'hue', 'opa', 'depth', 'sqrcl', 'xrot', 'yrot', 'zrot', 'bg'];
      if (!this.selectedSliderIndex && this.selectedSliderIndex !== 0) {
        this.selectedSliderIndex = 0;
      }
      const key = list[this.selectedSliderIndex];
      const slider = this.sliders[key];
      if (slider && this.sliderStartValue !== undefined) {
        const rangeInfo = this._getSliderRange(key, slider);
        const min = rangeInfo.min;
        const max = rangeInfo.max;
        const range = max - min;
        
        let newVal = this.sliderStartValue + ratio * range;
        newVal = Math.max(min, Math.min(max, newVal));
        slider.setValue(newVal);

        // Display real-time diagnostics HUD
        this._showDiagnosticHud(key, this.sliderStartValue, ratio, newVal, min, max);
      }
    }

  _updateSlidersHighlighting() {
      const list = ['size', 'hue', 'opa', 'depth', 'sqrcl', 'xrot', 'yrot', 'zrot', 'bg'];
      if (!this.selectedSliderIndex && this.selectedSliderIndex !== 0) {
        this.selectedSliderIndex = 0;
      }
      list.forEach((key, idx) => {
        const slider = this.sliders[key];
        if (slider && slider.container) {
          slider.container.style.transition = 'all 0.15s ease';
          if (idx === this.selectedSliderIndex) {
            slider.container.style.borderLeft = '4px solid #00e676';
            slider.container.style.background = 'rgba(0, 230, 118, 0.15)';
            slider.container.style.paddingLeft = '6px';
          } else {
            slider.container.style.borderLeft = '';
            slider.container.style.background = '';
            slider.container.style.paddingLeft = '';
          }
        }
      });
    }

  _clearSlidersHighlighting() {
      const list = ['size', 'hue', 'opa', 'depth', 'sqrcl', 'xrot', 'yrot', 'zrot', 'bg'];
      list.forEach((key) => {
        const slider = this.sliders[key];
        if (slider && slider.container) {
          slider.container.style.borderLeft = '';
          slider.container.style.background = '';
          slider.container.style.paddingLeft = '';
        }
      });
    }

  startSliderAdjustment() {
      const list = ['size', 'hue', 'opa', 'depth', 'sqrcl', 'xrot', 'yrot', 'zrot', 'bg'];
      if (!this.selectedSliderIndex && this.selectedSliderIndex !== 0) {
        this.selectedSliderIndex = 0;
      }
      const key = list[this.selectedSliderIndex];
      const slider = this.sliders[key];
      if (slider) {
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
              const rawVal = parseFloat(input.value); // typically 0..1000 range resolution
              const domMin = parseFloat(input.getAttribute('min')) || 0;
              const domMax = parseFloat(input.getAttribute('max')) || 1000;
              const domRange = domMax - domMin;
              
              const rangeInfo = this._getSliderRange(key, slider);
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

  _showDiagnosticHud(key, startValue, ratio, newVal, min, max) {
      const inlineContainer = document.getElementById('p2p-diag-container');
      const percentMoved = (ratio * 100).toFixed(1);
      
      // Render in-dialog if active, otherwise fallback to floating
      if (inlineContainer && inlineContainer.style.display !== 'none') {
        inlineContainer.innerHTML = `
          <div style="color:#00ff66;font-weight:bold;border-bottom:1px solid #222;padding-bottom:2px;margin-bottom:4px;">P2P DIAGNOSTICS</div>
          Key:       <span style="color:#fff">${key}</span><br>
          Start Val: <span style="color:#fff">${startValue.toFixed(4)}</span><br>
          Drag:      <span style="color:#00ff66">${percentMoved}%</span><br>
          Target:    <span style="color:#fff">${newVal.toFixed(4)}</span><br>
          Range:     <span style="color:#888">[${min} - ${max}]</span>
        `;
        return;
      }

      let hud = document.getElementById('p2p-diagnostic-hud');
      if (!hud) {
        hud = document.createElement('div');
        hud.id = 'p2p-diagnostic-hud';
        hud.style.cssText = 'position: absolute; top: 80px; left: 50%; transform: translateX(-50%); background: rgba(15,23,42,0.95); color: #38bdf8; border: 1.5px solid #0284c7; border-radius: 6px; padding: 12px 18px; font-family: monospace; font-size: 13px; z-index: 999999; pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5); line-height: 1.5; min-width: 250px; transition: opacity 0.15s ease;';
        document.body.appendChild(hud);
      }
      hud.innerHTML = `
        <div style="color:#00ff66;font-weight:bold;margin-bottom:4px;border-bottom:1px solid #334155;padding-bottom:2px;">P2P SLIDER DIAGNOSTICS</div>
        <div>Active Key:  <span style="color:#fff">${key}</span></div>
        <div>Start Val:  <span style="color:#fff">${startValue.toFixed(4)}</span></div>
        <div>Drag Moved: <span style="color:#00ff66">${percentMoved}%</span></div>
        <div>Target Val: <span style="color:#fff">${newVal.toFixed(4)}</span></div>
        <div>Range:      <span style="color:#888">[${min} to ${max}]</span></div>
      `;
      hud.style.display = 'block';
      hud.style.opacity = '1';
      
      clearTimeout(hud.timeoutId);
      hud.timeoutId = setTimeout(() => {
        hud.style.opacity = '0';
        setTimeout(() => { if (hud.style.opacity === '0') hud.style.display = 'none'; }, 300);
      }, 2000);
    }
}

