
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
    }

  _createSpinnerControls() {
      const hostContainer = this.baseController?.domElement?.parentElement || document.body;
      const parentHeight = hostContainer.clientHeight || window.innerHeight;
      const width = 690;
      
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
      const controller = this.baseController;
      const view = this.threeDView;
      if (!controller || !view) return;

      const target = controller.accuDraw;

      if (name === 'size') {
        const adjustedSize = value * (1.5 / 300);
        if (target?.setSizeAnimated) {
          target.setSizeAnimated(adjustedSize, 0.5);
        }
      } else if (name === 'color') {
        const colorVal = this._hueToRgb(value);
        if (target?.setColorAnimated) {
          target.setColorAnimated(colorVal, 0.5);
        }
      } else if (name === 'square or circle') {
        if (target?.setSquircleAnimated) {
          target.setSquircleAnimated(value, 0.5);
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
          target.setRotationAnimated(updatedMatrix, 0.5);
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
      this.rotations = { x: 0, y: 0, z: 0 };
      ['x', 'y', 'z'].forEach((axis) => {
        const slider = this.sliders[`${axis}rot`];
        if (slider) {
          slider.setValue(0);
        }
      });
    }
}

