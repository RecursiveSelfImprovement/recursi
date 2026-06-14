class LogoExperiments {
  async run(env) {
        this.env       = env;
        this.container = env.container;
        this.activeLogos = [];

        applyCss(`
          .lx-root {
            background: #0c0e12;
            color: #e2e8f0;
            font-family: system-ui, sans-serif;
            min-height: 100vh;
            padding: 28px;
            box-sizing: border-box;
            background-image: radial-gradient(circle at 50% 25%, #191410 0%, #0c0e12 68%);
            position: relative;
            overflow: hidden;
          }
          .lx-header { margin-bottom: 22px; }
          .lx-title {
            font-size: 20px; font-weight: 800; margin: 0 0 4px 0;
            background: linear-gradient(125deg,#fff 0%,#ff9f43 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            text-transform: uppercase; letter-spacing: 0.06em;
          }
          .lx-sub {
            font-size: 11px; color: #ff6b35; text-transform: uppercase;
            letter-spacing: 0.12em;
          }
          .lx-layout { display: flex; gap: 24px; align-items: flex-start; }
          .lx-panel {
            background: rgba(16,18,24,0.9);
            border: 1px solid rgba(255,107,53,0.13);
            border-radius: 12px;
            padding: 18px;
            backdrop-filter: blur(10px);
            display: flex; flex-direction: column; gap: 12px;
            width: 260px; flex-shrink: 0;
            position: relative; z-index: 1;
          }
          .lx-section-title {
            font-size: 10px; font-weight: 700; color: #ff6b35;
            text-transform: uppercase; letter-spacing: 0.12em;
            border-bottom: 1px solid rgba(255,107,53,0.13);
            padding-bottom: 5px; margin-bottom: 4px;
          }
          .lx-row { margin-bottom: 6px; }
          .lx-row label {
            display: block; font-size: 10px; color: #718096;
            text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;
          }
          .lx-slider-wrap { display: flex; align-items: center; gap: 8px; }
          .lx-slider {
            flex-grow: 1; accent-color: #ff6b35; cursor: pointer;
            height: 4px; border-radius: 2px;
          }
          .lx-slider:disabled { opacity: 0.3; cursor: default; }
          .lx-val {
            font-family: monospace; font-size: 11px; color: #ff9f43;
            min-width: 36px; text-align: right; transition: opacity 0.2s;
          }
          .lx-val.dim { opacity: 0.3; }
          .lx-toggle-row {
            display: flex; align-items: center;
            justify-content: space-between; margin-bottom: 6px;
          }
          .lx-toggle-row label { font-size: 11px; color: #e2e8f0; cursor: pointer; }
          .lx-cb { accent-color: #ff6b35; cursor: pointer; width: 14px; height: 14px; }
          .lx-cb:disabled { opacity: 0.3; cursor: default; }
          .lx-btn {
            width: 100%;
            background: linear-gradient(135deg,#ff9f43 0%,#ff6b35 100%);
            border: none; border-radius: 7px; color: #fff;
            padding: 9px; font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.05em;
            cursor: pointer; transition: opacity 0.15s;
          }
          .lx-btn:hover { opacity: 0.88; }
          .lx-btn.ghost {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.09);
            color: #718096; margin-top: 5px;
          }
          .lx-btn.ghost:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }
          .lx-btn:disabled { opacity: 0.3; cursor: default; }
          .lx-status {
            font-size: 10px; text-align: center;
            color: #718096; margin-top: 2px; letter-spacing: 0.05em;
            transition: color 0.3s;
          }
          .lx-status.active { color: #ff9f43; }
          .lx-diag {
            display: none; width: 100%; height: 110px;
            background: rgba(0,0,0,0.5); color: #5af78e;
            border: 1px solid rgba(255,107,53,0.18);
            font-family: monospace; font-size: 9px;
            margin-top: 6px; padding: 7px;
            box-sizing: border-box; border-radius: 7px; resize: vertical;
          }
          .lx-bg {
            flex: 1; min-height: 420px; position: relative;
            border-radius: 10px;
            border: 1px dashed rgba(255,107,53,0.08);
          }
        `, 'lx-styles');

        this.container.classList.add('lx-root');
        this.container.innerHTML = '';

        const header = makeElement('div', { className: 'lx-header' },
          makeElement('h1', { className: 'lx-title' }, 'Ember Logo · Test Harness'),
          makeElement('div', { className: 'lx-sub' }, 'interactive live playground'),
        );

        const layout = makeElement('div', { className: 'lx-layout' });
        const panel  = makeElement('div', { className: 'lx-panel' });
        this.bg = makeElement('div', { className: 'lx-bg' });

        layout.appendChild(panel);
        layout.appendChild(this.bg);
        this.container.appendChild(header);
        this.container.appendChild(layout);

        panel.appendChild(makeElement('div', { className: 'lx-section-title' }, 'Logo Config'));

        this._buildSlider(panel, 'density', 'Ember Density',    0.1, 3.0, 0.05, 0.4,  v => v.toFixed(2)+'×');
        this._buildSlider(panel, 'speed',   'Ember Speed',      0.1, 4.0, 0.05, 0.3,  v => v.toFixed(2)+'×');
        this._buildSlider(panel, 'size',    'Ember Size',       0.1, 3.0, 0.05, 0.4,  v => v.toFixed(2)+'×');
        this._buildSlider(panel, 'bgOp',    'Panel Opacity',    0,   1.0, 0.05, 0.0,  v => Math.round(v*100)+'%');

        this._buildToggle(panel, 'awake',    'Awake Pulse',   true);
        this._buildToggle(panel, 'subtitle', 'Show Subtitle', false);
        this._buildToggle(panel, 'rainbow',  'Rainbow Mode',  false);
        this._buildToggle(panel, 'outline',  'Show Outline',  false);

        // Harness Customization Controls
        panel.appendChild(makeElement('div', { className: 'lx-section-title' }, 'Harness Controls'));

        // Toggle to force expand / simulated hover
        const hoverRow = makeElement('div', { className: 'lx-toggle-row' },
          makeElement('label', { htmlFor: 'lx-cb-forceHover' }, 'Force Hover (Animate)'),
          this.forceHoverCb = makeElement('input', {
            type: 'checkbox',
            className: 'lx-cb',
            id: 'lx-cb-forceHover'
          })
        );
        this.forceHoverCb.addEventListener('change', () => {
          const logo = this.activeLogos.at(-1);
          if (logo && logo.brand) {
            if (this.forceHoverCb.checked) {
              logo.brand.dispatchEvent(new MouseEvent('mouseenter'));
            } else {
              logo.brand.dispatchEvent(new MouseEvent('mouseleave'));
            }
          }
        });
        panel.appendChild(hoverRow);

        // Custom Background Selector
        const bgPickerRow = makeElement('div', { className: 'lx-row' },
          makeElement('label', {}, 'Harness Background')
        );

        const pickerWrap = makeElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } });

        const colorInput = makeElement('input', {
          type: 'color',
          value: '#0c0e12',
          style: {
            border: 'none',
            padding: '0',
            width: '28px',
            height: '24px',
            background: 'transparent',
            cursor: 'pointer'
          }
        });

        colorInput.addEventListener('input', (e) => {
          const val = e.target.value;
          this.container.style.backgroundImage = 'none';
          this.container.style.backgroundColor = val;
        });

        const makePresetBtn = (label, color, isGradient = false) => {
          const btn = makeElement('button', {
            style: {
              background: isGradient ? 'rgba(255,255,255,0.08)' : color,
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '9px',
              padding: '3px 6px',
              cursor: 'pointer',
              fontFamily: 'sans-serif'
            }
          }, label);
          btn.addEventListener('click', () => {
            if (isGradient) {
              this.container.style.backgroundImage = color;
              this.container.style.backgroundColor = '';
            } else {
              this.container.style.backgroundImage = 'none';
              this.container.style.backgroundColor = color;
            }
            if (color.startsWith('#') && color.length === 7) {
              colorInput.value = color;
            }
          });
          return btn;
        };

        pickerWrap.appendChild(colorInput);
        pickerWrap.appendChild(makePresetBtn('Default', 'radial-gradient(circle at 50% 25%, #191410 0%, #0c0e12 68%)', true));
        pickerWrap.appendChild(makePresetBtn('Chroma', '#00ff00'));
        pickerWrap.appendChild(makePresetBtn('Dark', '#0a0a0e'));
        pickerWrap.appendChild(makePresetBtn('Light', '#f7fafc'));

        bgPickerRow.appendChild(pickerWrap);
        panel.appendChild(bgPickerRow);

        // Spawn position
        panel.appendChild(makeElement('div', { className: 'lx-section-title' }, 'Spawn Position'));
        this._spawnX = makeElement('input', { type: 'number', value: '8', min: '0',
          style: { width: '60px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,107,53,0.2)',
            borderRadius: '5px', color: '#ff9f43', fontFamily: 'monospace', fontSize: '11px',
            padding: '4px 6px', textAlign: 'right', outline: 'none' } });
        this._spawnY = makeElement('input', { type: 'number', value: '8', min: '0',
          style: { width: '60px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,107,53,0.2)',
            borderRadius: '5px', color: '#ff9f43', fontFamily: 'monospace', fontSize: '11px',
            padding: '4px 6px', textAlign: 'right', outline: 'none' } });
        panel.appendChild(makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          makeElement('label', { style: { fontSize: '10px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'X'),
          this._spawnX,
          makeElement('label', { style: { fontSize: '10px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Y'),
          this._spawnY,
        ));

        this.statusEl = makeElement('div', { className: 'lx-status' }, 'No logos spawned');
        panel.appendChild(this.statusEl);

        this.spawnBtn = makeElement('button', { className: 'lx-btn' }, 'Spawn Floating Logo');
        this.spawnBtn.addEventListener('click', () => this.spawnLogo());
        panel.appendChild(this.spawnBtn);

        this.popoutBtn = makeElement('button', { className: 'lx-btn ghost' }, '↗ Pop Out Logo');
        this.popoutBtn.addEventListener('click', () => this._popOutLogo());
        panel.appendChild(this.popoutBtn);

        this.diagBtn = makeElement('button', { className: 'lx-btn ghost' }, '🔬 Diagnose Active Logo');
        this.diagBtn.addEventListener('click', () => this.runDiagnostics());
        panel.appendChild(this.diagBtn);

        this.diagEl = makeElement('textarea', { className: 'lx-diag' });
        panel.appendChild(this.diagEl);

        this._updateControlState();
        setTimeout(() => this.spawnLogo(), 150);
      }

  _popOutLogo() {
      const logo = this.activeLogos.at(-1);
      if (!logo || !logo._shell) return;
      const shell = logo._shell;
      if (shell._poppedOut) return;
      const rect = shell.getBoundingClientRect();
      shell.style.position = 'fixed';
      shell.style.left = rect.left + 'px';
      shell.style.top  = rect.top  + 'px';
      document.body.appendChild(shell);
      shell._poppedOut = true;
      logo._emit('popout', {});
    }

  runDiagnostics() {
        if (!this.activeLogos.length) {
          this.diagEl.value = 'No active logos. Spawn one first!';
          this.diagEl.style.display = 'block';
          return;
        }
        this._showTimingLog(this.activeLogos[0]);
        if (typeof this.activeLogos[0].openDiagnosticDialog === 'function') {
          this.activeLogos[0].openDiagnosticDialog();
        }
      }

  destroy() {
      [...this.activeLogos].forEach(lg => { try { lg.destroy(); lg._shell?.remove(); } catch(_){} });
      this.activeLogos = [];
    }

  _buildSlider(parent, key, label, min, max, step, def, fmt) {
      if (!this._sliders) this._sliders = {};
      if (!this._vals)    this._vals    = {};

      const slider = makeElement('input', {
        type: 'range',
        className: 'lx-slider',
        min: String(min),
        max: String(max),
        step: String(step),
        value: String(def),
      });

      const valEl = makeElement('span', { className: 'lx-val' }, fmt(def));

      const onSlide = () => {
        const v = parseFloat(slider.value);
        valEl.textContent = fmt(v);
        this._pushToLogos();
      };

      slider.addEventListener('input', onSlide);
      slider.addEventListener('change', onSlide);

      this._sliders[key] = slider;
      this._vals[key]    = valEl;

      const row = makeElement('div', { className: 'lx-row' },
        makeElement('label', {}, label),
        makeElement('div', { className: 'lx-slider-wrap' }, slider, valEl),
      );
      parent.appendChild(row);
    }

  _buildToggle(parent, key, label, defaultOn = false) {
      if (!this._toggles) this._toggles = {};

      const cb = makeElement('input', {
        type: 'checkbox',
        className: 'lx-cb',
        id: 'lx-cb-' + key,
      });
      cb.checked = defaultOn;

      cb.addEventListener('change', () => {
        this._pushToLogos();
        if (key === 'rainbow') {
          this.activeLogos.forEach(lg => {
            if (lg._syncRainbowMenuItem) lg._syncRainbowMenuItem(cb.checked);
          });
        }
      });

      this._toggles[key] = cb;

      const row = makeElement('div', { className: 'lx-toggle-row' },
        makeElement('label', { htmlFor: 'lx-cb-' + key }, label),
        cb,
      );
      parent.appendChild(row);
    }

  _pushToLogos() {
      const logo = this.activeLogos ? this.activeLogos.at(-1) : null;
      if (!logo) return;

      const s = this._sliders;
      const t = this._toggles;
      if (!s || !t) return;

      const opts = {
        emberCountMultiplier: parseFloat(s.density.value),
        emberSpeedMultiplier: parseFloat(s.speed.value),
        emberSizeMultiplier:  parseFloat(s.size.value),
        isAwake:              t.awake.checked,
        showSubtitle:         t.subtitle.checked,
        outlineContainer:     t.outline.checked,
        rainbowMode:          t.rainbow.checked,
      };
      const bgOp = parseFloat(s.bgOp.value);

      logo.setOptions(opts);
      if (logo._setBgOpacity) logo._setBgOpacity(bgOp);
    }

  _updateControlState() {
      const hasLogos = this.activeLogos.length > 0;
      const count    = this.activeLogos.length;

      Object.values(this._sliders || {}).forEach(sl => { sl.disabled = !hasLogos; });
      Object.values(this._vals    || {}).forEach(v  => { v.classList.toggle('dim', !hasLogos); });
      Object.values(this._toggles || {}).forEach(cb => { cb.disabled = !hasLogos; });
      if (this.forceHoverCb) this.forceHoverCb.disabled = !hasLogos;
      if (this.diagBtn)   this.diagBtn.disabled   = !hasLogos;
      if (this.popoutBtn) this.popoutBtn.disabled  = !hasLogos;

      if (this.statusEl) {
        this.statusEl.textContent = hasLogos
          ? count === 1
            ? '1 logo active - sliders live'
            : `${count} logos · controlling most recent`
          : 'No logos - spawn one to start';
        this.statusEl.classList.toggle('active', hasLogos);
      }
    }

  spawnLogo() {
        const s = this._sliders;
        const t = this._toggles;
        const useX = parseFloat(this._spawnX?.value) || 8;
        const useY = parseFloat(this._spawnY?.value) || 8;

        const logo = EmberLogo.createFloatingPanel(this.container, {
          showSubtitle:         t.subtitle.checked,
          emberCountMultiplier: parseFloat(s.density.value),
          emberSpeedMultiplier: parseFloat(s.speed.value),
          emberSizeMultiplier:  parseFloat(s.size.value),
          isAwake:              t.awake.checked,
          outlineContainer:     t.outline.checked,
          rainbowMode:          t.rainbow.checked,
          bgOpacity:            parseFloat(s.bgOp.value),
        });

        if (logo._shell) {
          logo._shell.style.left = `${useX}px`;
          logo._shell.style.top  = `${useY}px`;
        }

        // Apply programmatic force-hover trigger immediately on spawn if requested
        if (this.forceHoverCb && this.forceHoverCb.checked) {
          setTimeout(() => {
            if (logo.brand) {
              logo.brand.dispatchEvent(new MouseEvent('mouseenter'));
            }
          }, 100);
        }

        logo.on('rainbow', ({ rainbowMode }) => {
          if (this.activeLogos.at(-1) === logo) {
            if (this._toggles.rainbow) this._toggles.rainbow.checked = rainbowMode;
            if (logo._syncRainbowMenuItem) logo._syncRainbowMenuItem(rainbowMode);
          }
        });
        logo.on('awake', ({ isAwake }) => {
          if (this.activeLogos.at(-1) === logo && this._toggles.awake)
            this._toggles.awake.checked = isAwake;
        });
        logo.on('subtitle', ({ showSubtitle }) => {
          if (this.activeLogos.at(-1) === logo && this._toggles.subtitle)
            this._toggles.subtitle.checked = showSubtitle;
        });
        logo.on('close', () => {
          this.activeLogos = this.activeLogos.filter(l => l !== logo);
          this._updateControlState();
        });

        this.activeLogos.push(logo);
        this._updateControlState();
        this._pushToLogos();
      }

  _showTimingLog(logo) {
        if (!this.diagEl) return;
        const report = (typeof logo.generateDetailedDiagnosticReport === 'function')
          ? logo.generateDetailedDiagnosticReport()
          : (logo.generateDiagnosticReport?.() ?? 'N/A');
        this.diagEl.value = report;
        this.diagEl.style.display = 'block';
      }
}