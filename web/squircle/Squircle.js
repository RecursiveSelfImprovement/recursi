class Squircle {
  constructor() {
      this.arcGeometry = new SquircleArc();
      this.bezierGeometry = new SquircleBezier();
      this.settingsDialog = null;
      this.pathDialog = null;
      this.paramsDialog = null;
      this.controls = null;
      this.appWrapper = null;
      this.isSettingsPoppedOut = false;
      this.toggleDockButton = null;
    }

  loadSettings() {
    const defaults = {
      mode: 'arc',
      t: 0.8,
      scale: 1.8,
      combine: true,
      showPoints: true,
      shapeColor: '#0064ff',
      dotsColor: '#ff0000',
      linesColor: '#d0d0d0',
    };
    const saved = JSON.parse(localStorage.getItem('squircleSettings') || '{}');
    if (saved.mode === 'polygon') {
      saved.mode = 'arc';
    }
    this.settings = { ...defaults, ...saved };
    this.mode = this.settings.mode;
  }

  saveSettings() {
    localStorage.setItem(
      'squircleSettings',
      JSON.stringify({
        mode: this.mode,
        t: parseFloat(this.slider.value),
        scale: parseFloat(this.scaleSlider.value),
        // 'blend' setting is now obsolete
        combine: this.combineCheckbox.checked,
        showPoints: this.showPointsCheckbox.checked,
        shapeColor: this.shapeColorPicker.value,
        dotsColor: this.dotsColorPicker.value,
        linesColor: this.linesColorPicker.value,
      })
    );
  }

  createRangeInput(min, max, step, value, width) {
    return makeElement('input', {
      type: 'range',
      className: 'control-slider',
      min,
      max,
      step,
      value,
      style: { width: `${width}px` },
    });
  }

  createNumberInput(min, max, step, value, width) {
    return makeElement('input', {
      type: 'number',
      className: 'control-number',
      min,
      max,
      step,
      value,
      style: { width: `${width}px`, margin: '0 10px' },
    });
  }

  createControlPair(min, max, step, value, onChange) {
    const slider = this.createRangeInput(min, max, step, value, 200);
    const number = this.createNumberInput(min, max, step, value, 80);

    slider.oninput = () => {
      number.value = slider.value;
      onChange();
    };

    number.oninput = () => {
      let val = parseFloat(number.value);
      if (val < min) val = min;
      if (val > max) val = max;
      slider.value = val;
      onChange();
    };

    number.onkeydown = (e) => {
      if (e.key === 'Enter') onChange();
    };

    return { slider, number };
  }

  createElements() {
      this.svg = makeElement('svg:svg', {
        id: 'squircle-canvas',
        width: 900,
        height: 900,
        viewBox: '-3 -3 6 6',
      });

      this.modeSelect = makeElement('select', {
        className: 'mode-select-dropdown',
        onchange: () => {
          this.mode = this.modeSelect.value;
          if (this.rootElement) this.rootElement.className = `dark-mode ${this.mode}-mode`;
          this.saveSettings();
          this.updateShape();
        },
      });

      ['arc', 'bezier'].forEach((mode) => {
        this.modeSelect.appendChild(
          makeElement('option', {
            value: mode,
            textContent: mode.charAt(0).toUpperCase() + mode.slice(1) + ' Mode',
          })
        );
      });

      this.modeSelect.value = this.settings.mode;
      if (this.rootElement) this.rootElement.className = `dark-mode ${this.settings.mode}-mode`;

      const shapeControl = this.createControlPair(0, 1, 0.001, this.settings.t, () => {
        this.saveSettings();
        this.updateShape();
      });
      this.slider = shapeControl.slider;
      this.numberInput = shapeControl.number;

      const scaleControl = this.createControlPair(0.25, 2, 0.01, this.settings.scale, () => {
        this.saveSettings();
        this.updateShape();
      });
      this.scaleSlider = scaleControl.slider;
      this.scaleNumberInput = scaleControl.number;

      this.combineCheckbox = makeElement('input', {
        type: 'checkbox',
        checked: this.settings.combine,
        onchange: () => {
          this.saveSettings();
          this.updateShape();
        },
      });
      this.showPointsCheckbox = makeElement('input', {
        type: 'checkbox',
        checked: this.settings.showPoints,
        onchange: () => {
          this.saveSettings();
          this.updateShape();
        },
      });
      this.showPathsButton = makeElement('button', {
        textContent: 'Show Path Strings',
        className: 'control-button control-button-grow',
        onclick: () => this.showPathStrings(),
      });
      this.showArcParamsButton = makeElement('button', {
        textContent: 'Show Arc Parameters',
        className: 'control-button control-button-grow',
        onclick: () => this.showArcParameters(),
      });
      this.shapeColorPicker = makeElement('input', {
        type: 'color',
        className: 'control-color-picker',
        value: this.settings.shapeColor,
        oninput: () => {
          this.saveSettings();
          this.updateShape();
        },
      });
      this.dotsColorPicker = makeElement('input', {
        type: 'color',
        className: 'control-color-picker',
        value: this.settings.dotsColor,
        oninput: () => {
          this.saveSettings();
          this.updateShape();
        },
      });
      this.linesColorPicker = makeElement('input', {
        type: 'color',
        className: 'control-color-picker',
        value: this.settings.linesColor,
        oninput: () => {
          this.saveSettings();
          this.updateShape();
        },
      });

      this.controls = makeElement('div', { className: 'controls' });
      const modeSelectorGroup = makeElement(
        'div',
        { className: 'control-group mode-selector-group' },
        makeElement('label', { textContent: 'Mode:' }),
        this.modeSelect
      );
      this.controls.appendChild(modeSelectorGroup);
      this.controls.appendChild(
        makeElement(
          'div',
          { className: 'control-group' },
          makeElement('label', { textContent: 'Shape Transition' }),
          makeElement('div', { className: 'control-input' }, this.slider, this.numberInput)
        )
      );
      this.controls.appendChild(
        makeElement(
          'div',
          { className: 'control-group' },
          makeElement('label', { textContent: 'Scale' }),
          makeElement('div', { className: 'control-input' }, this.scaleSlider, this.scaleNumberInput)
        )
      );
      
      const optionsGroup = makeElement('div', { className: 'control-group' });
      optionsGroup.appendChild(
        makeElement('div', { className: 'control-input' },
          this.combineCheckbox,
          makeElement('label', { textContent: ' Combine Paths', style: { minWidth: 'auto', textAlign: 'left', margin: '0 20px 0 5px' } })
        )
      );
      optionsGroup.appendChild(
        makeElement('div', { className: 'control-input' },
          this.showPointsCheckbox,
          makeElement('label', { textContent: '', className: 'points-label', style: { minWidth: 'auto', textAlign: 'left', margin: '0 0 0 5px' } })
        )
      );
      this.controls.appendChild(optionsGroup);
      
      const colorGroup = makeElement('div', { className: 'control-group', style: { flexDirection: 'column', alignItems: 'stretch' } });
      colorGroup.appendChild(
        makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          makeElement('label', { textContent: 'Shape Color' }), this.shapeColorPicker
        )
      );
      colorGroup.appendChild(
        makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' } },
          makeElement('label', { textContent: 'Dots Color' }), this.dotsColorPicker
        )
      );
      colorGroup.appendChild(
        makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' } },
          makeElement('label', { textContent: 'Lines Color' }), this.linesColorPicker
        )
      );
      this.controls.appendChild(colorGroup);
      
      this.controls.appendChild(
        makeElement('div', { className: 'control-group arc-mode-only arc-params-group' },
          this.showPathsButton, this.showArcParamsButton
        )
      );

      this.toggleDockButton = makeElement('button', {
        className: 'control-button icon-button',
        onclick: () => this.toggleSettingsDockState(),
      });

      this.controls.appendChild(
        makeElement('div', { className: 'control-group dock-toggle-group' }, this.toggleDockButton)
      );

      const canvasContainer = makeElement('div', { className: 'canvas-container' }, this.svg);
      this.appWrapper = makeElement('div', { className: 'app-wrapper squircle-app-wrapper' }, canvasContainer, this.controls);
      
      if (this.rootElement) {
        this.rootElement.appendChild(this.appWrapper);
      }

      this.updateToggleDockButtonIcon();
      this.updateShape();
    }

  updateShape() {
    const t = parseFloat(this.slider.value);
    const scale = parseFloat(this.scaleSlider.value);
    const combine = this.combineCheckbox.checked;
    const showPoints = this.showPointsCheckbox.checked;
    const shapeColor = this.shapeColorPicker.value;
    const dotsColor = this.dotsColorPicker.value;
    const linesColor = this.linesColorPicker.value;
    this.svg.innerHTML = '';

    const pointsLabel = document.querySelector('.points-label');
    pointsLabel.textContent =
      this.mode === 'bezier' ? 'Show Control Points' : 'Show Centers';

    let paths, arcParams, controlData;
    if (this.mode === 'arc') {
      paths = this.arcGeometry.getPaths(t, combine, scale);
      arcParams = this.arcGeometry.getArcParameters();
    } else if (this.mode === 'bezier') {
      paths = this.bezierGeometry.getPaths(t, combine, scale);
      controlData = this.bezierGeometry.getControlPoints(t, scale);
    }

    const strokeWidth = 5 / 150;
    const centerRadius = 5 / 150;
    const dashWidth = 1 / 150;
    const dashPattern = 5 / 150;

    if (this.mode === 'arc') {
      if (t === 0) {
        if (combine) {
          this.svg.appendChild(
            makeElement('svg:path', {
              d: paths[0],
              stroke: shapeColor,
              'stroke-width': strokeWidth,
              fill: `${shapeColor}80`,
            })
          );
        } else {
          paths.forEach((path) => {
            const [_, x1, y1, __, x2, y2] = path.split(' ');
            this.svg.appendChild(
              makeElement('svg:line', {
                x1,
                y1,
                x2,
                y2,
                stroke: shapeColor,
                'stroke-width': strokeWidth,
              })
            );
          });
        }
      } else {
        if (combine) {
          this.svg.appendChild(
            makeElement('svg:path', {
              d: paths[0],
              stroke: shapeColor,
              'stroke-width': strokeWidth,
              fill: `${shapeColor}80`,
            })
          );
        } else {
          const colors = [
            'red',
            'orange',
            'yellow',
            'green',
            'cyan',
            'blue',
            'purple',
            'magenta',
          ];
          paths.forEach((path, i) => {
            this.svg.appendChild(
              makeElement('svg:path', {
                d: path,
                stroke: colors[i],
                'stroke-width': strokeWidth,
                fill: 'none',
              })
            );
          });
        }
      }
      if (showPoints && t !== 0) {
        arcParams.forEach((params, index) => {
          if (!params || !params.center) return;
          const { center, radius, startAngle, endAngle } = params;
          this.svg.appendChild(
            makeElement('svg:circle', {
              cx: center.x,
              cy: center.y,
              r: centerRadius,
              fill: dotsColor,
              stroke: 'black',
              'stroke-width': dashWidth,
            })
          );
          const startX = center.x + radius * Math.cos(startAngle);
          const startY = center.y + radius * Math.sin(startAngle);
          this.svg.appendChild(
            makeElement('svg:line', {
              x1: startX,
              y1: startY,
              x2: center.x,
              y2: center.y,
              stroke: linesColor,
              'stroke-width': dashWidth,
              'stroke-dasharray': `${dashPattern},${dashPattern}`,
            })
          );
          const endX = center.x + radius * Math.cos(endAngle);
          const endY = center.y + radius * Math.sin(endAngle);
          this.svg.appendChild(
            makeElement('svg:line', {
              x1: center.x,
              y1: center.y,
              x2: endX,
              y2: endY,
              stroke: linesColor,
              'stroke-width': dashWidth,
              'stroke-dasharray': `${dashPattern},${dashPattern}`,
            })
          );
        });
      }
    } else if (this.mode === 'bezier') {
      if (t === 0) {
        if (combine) {
          this.svg.appendChild(
            makeElement('svg:path', {
              d: paths[0],
              stroke: shapeColor,
              'stroke-width': strokeWidth,
              fill: `${shapeColor}80`,
            })
          );
        } else {
          paths.forEach((path) => {
            const [_, x1, y1, __, x2, y2, ___, x3, y3, ____, x4, y4] =
              path.split(' ');
            this.svg.appendChild(
              makeElement('svg:line', {
                x1,
                y1,
                x2: x4,
                y2: y4,
                stroke: shapeColor,
                'stroke-width': strokeWidth,
              })
            );
          });
        }
      } else {
        if (combine) {
          this.svg.appendChild(
            makeElement('svg:path', {
              d: paths[0],
              stroke: shapeColor,
              'stroke-width': strokeWidth,
              fill: `${shapeColor}80`,
            })
          );
        } else {
          const colors = [
            'red',
            'orange',
            'yellow',
            'green',
            'cyan',
            'blue',
            'purple',
            'magenta',
          ];
          paths.forEach((path, i) => {
            this.svg.appendChild(
              makeElement('svg:path', {
                d: path,
                stroke: colors[i],
                'stroke-width': strokeWidth,
                fill: 'none',
              })
            );
          });
        }
      }
      if (showPoints && t !== 0) {
        controlData.points.forEach((pt) => {
          this.svg.appendChild(
            makeElement('svg:circle', {
              cx: pt[0],
              cy: pt[1],
              r: centerRadius,
              fill: dotsColor,
              stroke: 'black',
              'stroke-width': dashWidth,
            })
          );
        });
        controlData.lines.forEach((line) => {
          this.svg.appendChild(
            makeElement('svg:line', {
              x1: line.start[0],
              y1: line.start[1],
              x2: line.end[0],
              y2: line.end[1],
              stroke: linesColor,
              'stroke-width': dashWidth,
              'stroke-dasharray': `${dashPattern},${dashPattern}`,
            })
          );
        });
      }
    }
  }

  showPathStrings() {
      const geometry = this.mode === 'arc' ? this.arcGeometry : this.bezierGeometry;
      const textarea = makeElement('textarea', {
        style: { width: '100%', height: '100%', flexGrow: '1', resize: 'none', padding: '10px', boxSizing: 'border-box', backgroundColor: '#1e1e1e', color: '#d4d4d4', border: '1px solid #3c3c3c', borderRadius: '4px', fontFamily: 'monospace' },
        readOnly: true,
        textContent: geometry.pathData.join('\n'),
      });

      if (this.pathDialog) this.pathDialog.close();
      this.pathDialog = UITools.makeDialog({
        env: this.env, // <-- BIND DIALOG
        title: 'SVG Path Data',
        size: [400, 300],
        position: [100, 100],
        contentElement: textarea,
      });
    }

  showArcParameters() {
      const geometry = this.arcGeometry;
      const arcParams = geometry.getArcParameters();
      const formattedParams = arcParams.map((params, index) => {
        if (!params) return `Segment ${index}: Straight line (no arc parameters)`;
        const { center, radius, startAngle, endAngle, sweepFlag, largeArcFlag } = params;
        const sweepDirection = sweepFlag === 1 ? 'Counter-Clockwise' : 'Clockwise';
        return `Segment ${index}:\n  Center: (${center.x.toFixed(2)}, ${center.y.toFixed(2)})\n  Radius: ${radius.toFixed(2)}\n  Start Angle: ${((startAngle * 180) / Math.PI).toFixed(2)}°\n  End Angle: ${((endAngle * 180) / Math.PI).toFixed(2)}°\n  Sweep Flag: ${sweepFlag} (${sweepDirection})\n` + (largeArcFlag !== undefined ? `  Large Arc Flag: ${largeArcFlag}\n` : '');
      }).join('\n\n');

      const textarea = makeElement('textarea', {
        style: { width: '100%', height: '100%', flexGrow: '1', resize: 'none', padding: '10px', boxSizing: 'border-box', backgroundColor: '#1e1e1e', color: '#d4d4d4', border: '1px solid #3c3c3c', borderRadius: '4px', fontFamily: 'monospace' },
        readOnly: true,
        textContent: formattedParams,
      });

      if (this.paramsDialog) this.paramsDialog.close();
      this.paramsDialog = UITools.makeDialog({
        env: this.env, // <-- BIND DIALOG
        title: 'Arc Parameters',
        size: [600, 400],
        position: [150, 150],
        contentElement: textarea,
      });
    }

  popOutSettings() {
      if (this.settingsDialog) return;
      this.isSettingsPoppedOut = true;
      this.updateToggleDockButtonIcon();

      this.settingsDialog = UITools.makeDialog({
        env: this.env, // <-- BIND DIALOG
        title: 'Settings',
        contentElement: this.controls,
        size: [380, 500],
        onClose: () => this.dockSettings(),
      });
    }

  dockSettings() {
      if (!this.settingsDialog) return;
      this.isSettingsPoppedOut = false;
      this.updateToggleDockButtonIcon();
      if (this.appWrapper) {
        this.appWrapper.appendChild(this.controls);
      }
      this.settingsDialog = null;
    }

  toggleSettingsDockState() {
    if (this.isSettingsPoppedOut) {
      if (this.settingsDialog) this.settingsDialog.close();
    } else {
      this.popOutSettings();
    }
  }

  updateToggleDockButtonIcon() {
    this.toggleDockButton.innerHTML = '';
    let icon, title;

    if (this.isSettingsPoppedOut) {
      title = 'Dock Settings Panel';
      icon = makeElement(
        'svg:svg',
        { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'currentColor' },
        makeElement('svg:path', { d: 'M2,3h20v18H2V3z M10,5v14h10V5H10z' })
      );
    } else {
      title = 'Pop Out Settings Panel';
      icon = makeElement(
        'svg:svg',
        { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'currentColor' },
        makeElement('svg:path', {
          d: 'M10 4H4v6h6V4zm10 0h-6v6h6V4zM4 14h6v6H4v-6zm10 3h6v-3h-6v3z',
        })
      );
    }
    this.toggleDockButton.title = title;
    this.toggleDockButton.appendChild(icon);
  }

  

  

  async run(env) {
      if (this.rootElement) this.destroy();
      this.env = env;
      this.rootElement = env.container;

      // Ensure Fonts
      if (!document.getElementById('squircle-fonts')) {
        const link = document.createElement('link');
        link.id = 'squircle-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Roboto:wght@400;500&display=swap';
        document.head.appendChild(link);
      }

      // Fix standalone screen fill constraint
      if (this.rootElement === document.body) {
        document.documentElement.style.height = '100%';
        document.documentElement.style.width = '100%';
        document.documentElement.style.margin = '0';
        document.body.style.height = '100%';
        document.body.style.width = '100%';
        document.body.style.margin = '0';
      }
      
      applyCss(`
        .squircle-app-wrapper {
          --primary-color: #e0e0e0;
          --accent-color: #00d4ff;
          --background-color: #1a1a1a;
          --card-background: #252525;
          --control-background: #303030;
          --shadow-color: rgba(0, 0, 0, 0.3);
          --font-body: 'Architects Daughter', cursive;
          
          font-family: var(--font-body);
          display: flex; flex-direction: row; gap: 20px; 
          width: 100%; height: 100%; padding: 10px 20px 20px 20px; 
          box-sizing: border-box; background-color: var(--background-color); 
          color: var(--primary-color); overflow: hidden;
        }
        .squircle-app-wrapper .canvas-container {
          flex: 3; display: flex; justify-content: center; align-items: center;
          background-color: var(--card-background); border-radius: 12px;
          box-shadow: 0 4px 15px var(--shadow-color); padding: 10px; min-width: 0;
        }
        .squircle-app-wrapper #squircle-canvas { width: 100%; height: 100%; background-color: #151515; border-radius: 8px; }
        .squircle-app-wrapper .controls {
          flex: 1; display: flex; flex-direction: column; gap: 12px;
          padding: 10px; overflow-y: auto; min-width: 350px;
        }
        .squircle-app-wrapper .mode-selector-group { display: flex; flex-direction: row; align-items: center; justify-content: space-between; }
        .squircle-app-wrapper .mode-select-dropdown {
          background-color: #252525; color: var(--primary-color); border: 1px solid #4a4a4a;
          padding: 8px 16px; border-radius: 8px; box-shadow: 0 2px 4px var(--shadow-color);
          font-family: var(--font-body); font-size: 1em;
        }
        .squircle-app-wrapper .mode-select-dropdown:focus { outline: none; border-color: var(--accent-color); }
        .squircle-app-wrapper.bezier-mode .blend-group, .squircle-app-wrapper.bezier-mode .arc-params-group { opacity: 0.3; pointer-events: none; }
        .squircle-app-wrapper .control-group {
          background-color: rgba(70, 70, 70, 0.5); padding: 8px 15px; border-radius: 8px;
          box-shadow: 0 2px 4px var(--shadow-color); display: flex; flex-direction: column; gap: 8px;
        }
        .squircle-app-wrapper .control-group:has(.control-color-picker) > div + div { margin-top: 6px !important; }
        .squircle-app-wrapper .dock-toggle-group { margin-top: auto; background-color: transparent; box-shadow: none; padding: 5px 0 0 0; align-items: flex-end; }
        .squircle-app-wrapper .control-group label { font-weight: 500; font-size: 1.1em; margin-bottom: -4px; }
        .squircle-app-wrapper .control-input { display: flex; align-items: center; gap: 10px; }
        .squircle-app-wrapper .control-slider { flex-grow: 1; background: #404040; }
        .squircle-app-wrapper .control-slider::-webkit-slider-thumb { background: var(--accent-color); box-shadow: 0 0 8px rgba(0, 212, 255, 0.3); }
        .squircle-app-wrapper .control-number {
          background-color: var(--control-background); color: var(--primary-color); border: none;
          border-radius: 6px; padding: 6px 10px; box-shadow: inset 0 1px 3px var(--shadow-color); width: 80px;
          font-family: var(--font-body); font-size: 1em;
        }
        .squircle-app-wrapper .control-button {
          background-color: var(--accent-color); color: #1a1a1a; border: none; padding: 8px 16px;
          border-radius: 6px; box-shadow: 0 2px 4px var(--shadow-color); cursor: pointer;
          font-family: var(--font-body); font-weight: 500; font-size: 1.1em;
        }
        .squircle-app-wrapper .control-button:hover { background-color: #33e0ff; }
        .squircle-app-wrapper .icon-button { padding: 6px; width: 32px; height: 32px; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
        .squircle-app-wrapper .control-button-grow { flex-grow: 1; }
        .squircle-app-wrapper .arc-params-group { flex-direction: row; justify-content: space-around; }
        .squircle-app-wrapper .control-color-picker { -webkit-appearance: none; -moz-appearance: none; appearance: none; width: 40px; height: 25px; background-color: transparent; border: none; cursor: pointer; }
        .squircle-app-wrapper .control-color-picker::-webkit-color-swatch { border-radius: 4px; border: 1px solid #555; }
      `, 'squircle-root-styles');
      
      this.loadSettings();
      this.createElements();
      
      return this;
    }

  destroy() {
      console.log('[Squircle] destroy() called.');
      if (this.settingsDialog && typeof this.settingsDialog.close === 'function') this.settingsDialog.close();
      if (this.pathDialog && typeof this.pathDialog.close === 'function') this.pathDialog.close();
      if (this.paramsDialog && typeof this.paramsDialog.close === 'function') this.paramsDialog.close();
      if (this.appWrapper) this.appWrapper.remove();
      
      this.settingsDialog = null;
      this.pathDialog = null;
      this.paramsDialog = null;
      this.appWrapper = null;
      this.rootElement = null;
      console.log('[Squircle] destroy() complete.');
    }
}