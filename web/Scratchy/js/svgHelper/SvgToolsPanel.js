
class SvgToolsPanel {
  constructor(container) {
    this.container = container;
    this.scrollArea = null;
    this.svgElement = null;
    this.onApplyTransforms = null;
    this.onApplyRounding = null;
    this.onSetViewBox = null;
    this.onRescaleViewBox = null;
    this.onRunUserScript = null;
    this.onConvertToRelative = null;
    this.onConvertToAbsolute = null;
    this.onExportSvg = null;
    this.onToggleViewBox = null;
    this.onToggleAnimBg = null;
    this.onAutoFitViewBox = null;
    this.onFitContentToViewBox = null;

    // Tweaker / Smudge
    this.onTweakerToggle = null;
    this.onTweakerModeChange = null;
    this.onSmudgeRadiusChange = null;
    this.onSmudgeStrengthChange = null;
    this.onTangencyGranularityChange = null;
    this.onWheelSpeedChange = null; // New

    this.onGridColorsChange = null;
    this.onToggleControlPoints = null;

    this.tweakerEnabled = false;
    this.modeBrush = true;
    this.modePoints = false;

    this.smudgeInnerRadius = 15;
    this.smudgeOuterRadius = 40;
    this.smudgeStrength = 0.35;
    this.tangencyGranularity = 5;
    this.wheelSpeed = 0.1; // New

    this.showControlPoints = false;
    this.precision = 2;
    this.userCode =
      '// info.element — the DOM element\n// info.tag — tag name\n// info.path — array of ancestors\n// info.pathString — breadcrumb string\n// info.attributes — all attributes\n\n// Example: remove all fill attributes\n// if (info.tag === "path") {\n//   info.element.removeAttribute("fill");\n// }';
  }

  init() {
    this.scrollArea = makeElement('div', {
      className: 'svgh-right-panel-scroll',
    });
    this.container.appendChild(this.scrollArea);
    this.render();
  }

  setSvg(svgElement) {
    this.svgElement = svgElement;
    this._updateViewBoxInputs();
  }

  render() {
    this.scrollArea.innerHTML = '';

    this._renderSmudgeSection();
    this._renderViewSection();
    this._renderSimplifySection();
    this._renderViewBoxSection();
    this._renderUserScriptSection();
    this._renderExportSection();
  }

  _renderViewSection() {
    const section = SvgToolsPanel._makeSection('Display', false);
    const body = section.querySelector('.svgh-section-body');

    const viewBoxCheck = SvgToolsPanel._makeCheckbox(
      'show-vb',
      'Show ViewBox outline',
      true,
      (checked) => {
        if (this.onToggleViewBox) this.onToggleViewBox(checked);
      }
    );

    const cpCheck = SvgToolsPanel._makeCheckbox(
      'show-cp',
      'Show control points',
      this.showControlPoints,
      (checked) => {
        this.showControlPoints = checked;
        if (this.onToggleControlPoints) this.onToggleControlPoints(checked);
      }
    );

    const savedColor1 = localStorage.getItem('svgh_grid_color1') || '#2a2d42';
    const savedColor2 = localStorage.getItem('svgh_grid_color2') || '#1a1d2e';
    const savedAnimBg = localStorage.getItem('svgh_anim_bg') === 'true';

    const colorSwatch1 = makeElement('input', {
      type: 'color',
      value: savedColor1,
      title: 'Grid color 1',
      style: {
        width: '24px',
        height: '24px',
        border: '1px solid var(--border-medium)',
        borderRadius: '3px',
        padding: '0',
        cursor: 'pointer',
        background: 'none',
      },
      oninput: (e) => {
        localStorage.setItem('svgh_grid_color1', e.target.value);
        if (this.onGridColorsChange)
          this.onGridColorsChange(e.target.value, colorSwatch2.value);
      },
    });

    const colorSwatch2 = makeElement('input', {
      type: 'color',
      value: savedColor2,
      title: 'Grid color 2',
      style: {
        width: '24px',
        height: '24px',
        border: '1px solid var(--border-medium)',
        borderRadius: '3px',
        padding: '0',
        cursor: 'pointer',
        background: 'none',
      },
      oninput: (e) => {
        localStorage.setItem('svgh_grid_color2', e.target.value);
        if (this.onGridColorsChange)
          this.onGridColorsChange(colorSwatch1.value, e.target.value);
      },
    });

    const gridRow = makeElement(
      'div',
      { className: 'svgh-checkbox-row', style: { gap: '6px' } },
      makeElement(
        'span',
        { style: { fontSize: '12px', color: 'var(--text-secondary)' } },
        'Grid'
      ),
      colorSwatch1,
      colorSwatch2
    );

    const animCheck = SvgToolsPanel._makeCheckbox(
      'anim-bg',
      'Animate grid',
      savedAnimBg,
      (checked) => {
        localStorage.setItem('svgh_anim_bg', String(checked));
        if (this.onToggleAnimBg) this.onToggleAnimBg(checked);
      }
    );

    body.appendChild(viewBoxCheck);
    body.appendChild(cpCheck);
    body.appendChild(gridRow);
    body.appendChild(animCheck);
    this.scrollArea.appendChild(section);
  }

  _renderSimplifySection() {
    const section = SvgToolsPanel._makeSection('Simplify & Transform', false);
    const body = section.querySelector('.svgh-section-body');

    body.appendChild(
      makeElement(
        'div',
        { className: 'svgh-field' },
        makeElement(
          'span',
          { className: 'svgh-field-label' },
          'Coordinate Precision'
        ),
        makeElement(
          'div',
          { className: 'svgh-field-row' },
          makeElement('input', {
            className: 'svgh-input svgh-input-sm',
            type: 'number',
            min: '0',
            max: '6',
            value: String(this.precision),
            onchange: (e) => {
              this.precision = parseInt(e.target.value) || 2;
            },
          }),
          makeElement(
            'span',
            { style: { color: 'var(--text-muted)', fontSize: '11px' } },
            'decimal places'
          )
        )
      )
    );

    const btnRow1 = makeElement('div', {
      style: {
        display: 'flex',
        gap: '6px',
        marginBottom: '8px',
        flexWrap: 'wrap',
      },
    });

    btnRow1.appendChild(
      makeElement(
        'button',
        {
          className: 'svgh-btn svgh-btn-primary',
          onclick: () => {
            if (this.onApplyTransforms) this.onApplyTransforms();
          },
        },
        'Flatten Transforms'
      )
    );

    btnRow1.appendChild(
      makeElement(
        'button',
        {
          className: 'svgh-btn svgh-btn-accent',
          onclick: () => {
            if (this.onApplyRounding) this.onApplyRounding(this.precision);
          },
        },
        'Round Coordinates'
      )
    );

    body.appendChild(btnRow1);

    const btnRow2 = makeElement('div', {
      style: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    });

    btnRow2.appendChild(
      makeElement(
        'button',
        {
          className: 'svgh-btn',
          onclick: () => {
            if (this.onConvertToAbsolute) this.onConvertToAbsolute();
          },
        },
        'To Absolute'
      )
    );

    btnRow2.appendChild(
      makeElement(
        'button',
        {
          className: 'svgh-btn',
          onclick: () => {
            if (this.onConvertToRelative) this.onConvertToRelative();
          },
        },
        'To Relative'
      )
    );

    body.appendChild(btnRow2);
    this.scrollArea.appendChild(section);
  }

  _renderViewBoxSection() {
    const section = SvgToolsPanel._makeSection('ViewBox & Scale', false);
    const body = section.querySelector('.svgh-section-body');

    body.appendChild(
      makeElement(
        'div',
        { className: 'svgh-field' },
        makeElement(
          'span',
          { className: 'svgh-field-label' },
          'Target ViewBox'
        ),
        makeElement(
          'div',
          { className: 'svgh-field-row' },
          makeElement('input', {
            className: 'svgh-input svgh-input-sm',
            placeholder: 'x',
            id: 'svgh-vb-x',
            value: '-50',
          }),
          makeElement('input', {
            className: 'svgh-input svgh-input-sm',
            placeholder: 'y',
            id: 'svgh-vb-y',
            value: '-50',
          }),
          makeElement('input', {
            className: 'svgh-input svgh-input-sm',
            placeholder: 'w',
            id: 'svgh-vb-w',
            value: '100',
          }),
          makeElement('input', {
            className: 'svgh-input svgh-input-sm',
            placeholder: 'h',
            id: 'svgh-vb-h',
            value: '100',
          })
        )
      )
    );

    body.appendChild(
      makeElement(
        'div',
        { className: 'svgh-field' },
        makeElement(
          'span',
          { className: 'svgh-field-label' },
          'Padding (inside viewBox)'
        ),
        makeElement(
          'div',
          { className: 'svgh-field-row' },
          makeElement('input', {
            className: 'svgh-input svgh-input-sm',
            type: 'number',
            min: '0',
            max: '50',
            value: '2',
            id: 'svgh-vb-padding',
          }),
          makeElement(
            'span',
            { style: { color: 'var(--text-muted)', fontSize: '11px' } },
            'units'
          )
        )
      )
    );

    const presetRow = makeElement('div', {
      style: {
        display: 'flex',
        gap: '4px',
        marginBottom: '8px',
        flexWrap: 'wrap',
      },
    });

    const presets = [
      { label: 'Scratch', vb: [-50, -50, 100, 100] },
      { label: '0,0 → 100×100', vb: [0, 0, 100, 100] },
      { label: '0,0 → 480×360', vb: [0, 0, 480, 360] },
      { label: '0,0 → 1920×1080', vb: [0, 0, 1920, 1080] },
    ];

    for (const p of presets) {
      presetRow.appendChild(
        makeElement(
          'button',
          {
            className: 'svgh-btn',
            style: { fontSize: '10px', padding: '3px 8px', height: '24px' },
            onclick: () => {
              document.getElementById('svgh-vb-x').value = p.vb[0];
              document.getElementById('svgh-vb-y').value = p.vb[1];
              document.getElementById('svgh-vb-w').value = p.vb[2];
              document.getElementById('svgh-vb-h').value = p.vb[3];
            },
          },
          p.label
        )
      );
    }

    body.appendChild(presetRow);

    const vbBtns = makeElement('div', {
      style: {
        display: 'flex',
        gap: '6px',
        marginBottom: '8px',
        flexWrap: 'wrap',
      },
    });

    vbBtns.appendChild(
      makeElement(
        'button',
        {
          className: 'svgh-btn svgh-btn-accent',
          style: { fontWeight: '600' },
          onclick: () => {
            const x =
              parseFloat(document.getElementById('svgh-vb-x').value) || 0;
            const y =
              parseFloat(document.getElementById('svgh-vb-y').value) || 0;
            const w =
              parseFloat(document.getElementById('svgh-vb-w').value) || 100;
            const h =
              parseFloat(document.getElementById('svgh-vb-h').value) || 100;
            const pad =
              parseFloat(document.getElementById('svgh-vb-padding').value) || 0;
            if (this.onFitContentToViewBox)
              this.onFitContentToViewBox(x, y, w, h, pad);
          },
        },
        '⬡ Fit Content Into ViewBox'
      )
    );

    vbBtns.appendChild(
      makeElement(
        'button',
        {
          className: 'svgh-btn',
          onclick: () => {
            if (this.onAutoFitViewBox) this.onAutoFitViewBox();
          },
        },
        'Auto-Fit ViewBox'
      )
    );

    body.appendChild(vbBtns);

    const vbBtns2 = makeElement('div', {
      style: {
        display: 'flex',
        gap: '6px',
        marginBottom: '8px',
        flexWrap: 'wrap',
      },
    });

    vbBtns2.appendChild(
      makeElement(
        'button',
        {
          className: 'svgh-btn',
          onclick: () => {
            const x =
              parseFloat(document.getElementById('svgh-vb-x').value) || 0;
            const y =
              parseFloat(document.getElementById('svgh-vb-y').value) || 0;
            const w =
              parseFloat(document.getElementById('svgh-vb-w').value) || 100;
            const h =
              parseFloat(document.getElementById('svgh-vb-h').value) || 100;
            if (this.onSetViewBox) this.onSetViewBox(x, y, w, h);
          },
        },
        'Set ViewBox Only'
      )
    );

    vbBtns2.appendChild(
      makeElement(
        'button',
        {
          className: 'svgh-btn',
          onclick: () => {
            const x =
              parseFloat(document.getElementById('svgh-vb-x').value) || 0;
            const y =
              parseFloat(document.getElementById('svgh-vb-y').value) || 0;
            const w =
              parseFloat(document.getElementById('svgh-vb-w').value) || 100;
            const h =
              parseFloat(document.getElementById('svgh-vb-h').value) || 100;
            if (this.onRescaleViewBox) this.onRescaleViewBox(x, y, w, h);
          },
        },
        'Rescale Coords'
      )
    );

    body.appendChild(vbBtns2);

    body.appendChild(
      makeElement(
        'div',
        {
          style: {
            fontSize: '10px',
            color: 'var(--text-muted)',
            lineHeight: '1.6',
            marginTop: '4px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '8px',
          },
        },
        makeElement(
          'p',
          { style: { marginBottom: '4px' } },
          makeElement(
            'strong',
            { style: { color: 'var(--accent-cyan)' } },
            'Fit Content Into ViewBox'
          ),
          ' — The big one. Flattens transforms, converts all shapes to paths, then scales and translates all coordinates so the artwork fits exactly inside your target viewBox. For Scratch, use the preset to get -50,-50,100,100.'
        ),
        makeElement(
          'p',
          { style: { marginBottom: '4px' } },
          makeElement(
            'strong',
            { style: { color: 'var(--text-secondary)' } },
            'Auto-Fit ViewBox'
          ),
          ' — Shrinks the viewBox to tightly wrap the existing content. Does not move coordinates.'
        ),
        makeElement(
          'p',
          { style: { marginBottom: '4px' } },
          makeElement(
            'strong',
            { style: { color: 'var(--text-secondary)' } },
            'Set ViewBox Only'
          ),
          ' — Changes the viewBox attribute without touching coordinates. Like cropping/zooming.'
        ),
        makeElement(
          'p',
          {},
          makeElement(
            'strong',
            { style: { color: 'var(--text-secondary)' } },
            'Rescale Coords'
          ),
          ' — Transforms coordinates proportionally so appearance stays the same but numbers change to match the new viewBox.'
        )
      )
    );

    this.scrollArea.appendChild(section);
  }

  _renderUserScriptSection() {
    const section = SvgToolsPanel._makeSection('Element Script', true);
    const body = section.querySelector('.svgh-section-body');

    body.appendChild(
      makeElement(
        'p',
        {
          style: {
            fontSize: '10px',
            color: 'var(--text-muted)',
            lineHeight: '1.5',
            marginBottom: '8px',
          },
        },
        'Runs for every element in the SVG. The "info" object contains: element, tag, path, pathString, depth, id, className, attributes.'
      )
    );

    const textarea = makeElement('textarea', {
      className: 'svgh-code-area',
      style: { minHeight: '140px' },
      value: this.userCode,
      oninput: (e) => {
        this.userCode = e.target.value;
      },
      spellcheck: false,
    });
    textarea.value = this.userCode;

    body.appendChild(textarea);

    body.appendChild(
      makeElement(
        'div',
        { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
        makeElement(
          'button',
          {
            className: 'svgh-btn svgh-btn-accent',
            onclick: () => {
              if (this.onRunUserScript) this.onRunUserScript(this.userCode);
            },
          },
          '▶ Run Script'
        )
      )
    );

    this.scrollArea.appendChild(section);
  }

  _renderExportSection() {
    const section = SvgToolsPanel._makeSection('Export', false);
    const body = section.querySelector('.svgh-section-body');

    body.appendChild(
      makeElement(
        'div',
        { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
        makeElement(
          'button',
          {
            className: 'svgh-btn svgh-btn-primary',
            onclick: () => {
              if (this.onExportSvg) this.onExportSvg('download');
            },
          },
          makeElement(
            'svg:svg',
            {
              viewBox: '0 0 24 24',
              width: '14',
              height: '14',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
            },
            makeElement('svg:path', { d: 'M12 16V4m0 12l-4-4m4 4l4-4M4 20h16' })
          ),
          'Download SVG'
        ),
        makeElement(
          'button',
          {
            className: 'svgh-btn',
            onclick: () => {
              if (this.onExportSvg) this.onExportSvg('clipboard');
            },
          },
          'Copy to Clipboard'
        )
      )
    );

    this.scrollArea.appendChild(section);
  }

  _updateViewBoxInputs() {
    if (!this.svgElement) return;
    const vb = this.svgElement.getAttribute('viewBox');
    if (!vb) return;
    const [x, y, w, h] = vb.split(/[\s,]+/).map(Number);
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setTimeout(() => {
      setVal('svgh-vb-x', x);
      setVal('svgh-vb-y', y);
      setVal('svgh-vb-w', w);
      setVal('svgh-vb-h', h);
    }, 50);
  }

  static _makeSection(title, collapsed) {
    const header = makeElement(
      'div',
      {
        className: `svgh-section-header ${collapsed ? 'collapsed' : ''}`,
      },
      makeElement('span', title),
      makeElement(
        'svg:svg',
        { viewBox: '0 0 10 10', fill: 'currentColor' },
        makeElement('svg:path', { d: 'M2 3L5 7L8 3' })
      )
    );

    const body = makeElement('div', {
      className: `svgh-section-body ${collapsed ? 'collapsed' : ''}`,
    });

    header.addEventListener('click', () => {
      header.classList.toggle('collapsed');
      body.classList.toggle('collapsed');
    });

    return makeElement('div', { className: 'svgh-section' }, header, body);
  }

  static _makeCheckbox(id, label, checked, onChange) {
    const input = makeElement('input', {
      type: 'checkbox',
      id: `svgh-cb-${id}`,
    });
    if (checked) input.checked = true;
    input.addEventListener('change', () => onChange(input.checked));

    return makeElement(
      'div',
      { className: 'svgh-checkbox-row' },
      input,
      makeElement('label', { htmlFor: `svgh-cb-${id}` }, label)
    );
  }

  _renderSmudgeSection() {
    const section = SvgToolsPanel._makeSection('Tweaker Tool', false);
    const body = section.querySelector('.svgh-section-body');

    // Master Toggle
    const toggleBtn = makeElement(
      'button',
      {
        className: this.tweakerEnabled
          ? 'svgh-btn svgh-btn-danger'
          : 'svgh-btn svgh-btn-accent',
        style: {
          width: '100%',
          justifyContent: 'center',
          marginBottom: '10px',
          fontWeight: '600',
        },
        onclick: () => {
          this.tweakerEnabled = !this.tweakerEnabled;
          if (this.onTweakerToggle) this.onTweakerToggle(this.tweakerEnabled);
          this.render();
        },
      },
      this.tweakerEnabled ? '■ Disable Tweaker' : '✎ Enable Tweaker'
    );
    body.appendChild(toggleBtn);

    // Mode Radio Buttons
    if (this.tweakerEnabled) {
      const modeRow = makeElement('div', {
        style:
          'display: flex; gap: 12px; margin-bottom: 12px; padding: 0 4px; align-items: center;',
      });

      const makeRadio = (id, label, value, currentVal, onClick) => {
        const input = makeElement('input', {
          type: 'radio',
          name: 'tweaker-mode',
          id: id,
          value: value,
          checked: value === currentVal,
        });
        input.addEventListener('change', () => onClick(value));

        return makeElement(
          'div',
          { className: 'svgh-checkbox-row' },
          input,
          makeElement('label', { htmlFor: id, style: 'cursor:pointer;' }, label)
        );
      };

      const currentMode = this.modeBrush ? 'brush' : 'points';

      modeRow.appendChild(
        makeRadio('mode-brush', 'Smudge Brush', 'brush', currentMode, (val) => {
          this.modeBrush = true;
          this.modePoints = false;
          if (this.onTweakerModeChange) {
            this.onTweakerModeChange('brush', true);
            this.onTweakerModeChange('points', false);
          }
          this.render();
        })
      );

      modeRow.appendChild(
        makeRadio(
          'mode-points',
          'Edit Points',
          'points',
          currentMode,
          (val) => {
            this.modeBrush = false;
            this.modePoints = true;
            if (this.onTweakerModeChange) {
              this.onTweakerModeChange('brush', false);
              this.onTweakerModeChange('points', true);
            }
            this.render();
          }
        )
      );

      body.appendChild(modeRow);
    }

    // Help Text
    body.appendChild(
      makeElement(
        'div',
        {
          style: {
            fontSize: '10px',
            color: 'var(--text-muted)',
            lineHeight: '1.5',
            marginBottom: '10px',
            padding: '6px 8px',
            background: 'rgba(79,209,197,0.05)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(79,209,197,0.1)',
          },
        },
        this.modeBrush
          ? 'Brush Mode: Drag background to warp geometry.'
          : 'Points Mode: Click to grab point (sticky). Shift+Wheel to rotate handles. Ctrl+Wheel to scale handles.'
      )
    );

    const makeSliderField = (label, min, max, step, value, unit, onChange) => {
      const valDisplay = makeElement(
        'span',
        {
          style: {
            color: 'var(--accent-cyan)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            minWidth: '40px',
            textAlign: 'right',
          },
        },
        String(value)
      );
      const slider = makeElement('input', {
        type: 'range',
        min: String(min),
        max: String(max),
        step: String(step),
        value: String(value),
        style: {
          flex: '1',
          accentColor: 'var(--accent-blue)',
          cursor: 'pointer',
        },
        oninput: (e) => {
          const v = parseFloat(e.target.value);
          valDisplay.textContent = String(v);
          onChange(v);
        },
      });
      return makeElement(
        'div',
        { className: 'svgh-field' },
        makeElement('span', { className: 'svgh-field-label' }, label),
        makeElement(
          'div',
          { className: 'svgh-field-row', style: { gap: '8px' } },
          slider,
          valDisplay,
          makeElement(
            'span',
            { style: { color: 'var(--text-muted)', fontSize: '10px' } },
            unit
          )
        )
      );
    };

    // Shared Sensitivity
    body.appendChild(
      makeSliderField('Mouse Sensitivity', 0.1, 5.0, 0.1, 1.0, 'x', (v) => {
        if (this.onWheelSpeedChange) this.onWheelSpeedChange(v);
      })
    );

    if (this.tweakerEnabled && this.modeBrush) {
      body.appendChild(
        makeSliderField(
          'Inner Radius',
          0,
          50,
          1,
          this.smudgeInnerRadius,
          '%',
          (v) => {
            this.smudgeInnerRadius = v;
            if (this.onSmudgeRadiusChange)
              this.onSmudgeRadiusChange(v, this.smudgeOuterRadius);
          }
        )
      );
      body.appendChild(
        makeSliderField(
          'Outer Radius',
          1,
          100,
          1,
          this.smudgeOuterRadius,
          '%',
          (v) => {
            this.smudgeOuterRadius = v;
            if (this.onSmudgeRadiusChange)
              this.onSmudgeRadiusChange(this.smudgeInnerRadius, v);
          }
        )
      );
      body.appendChild(
        makeSliderField(
          'Strength',
          0.01,
          1,
          0.01,
          this.smudgeStrength,
          '',
          (v) => {
            this.smudgeStrength = v;
            if (this.onSmudgeStrengthChange) this.onSmudgeStrengthChange(v);
          }
        )
      );
    }

    if (this.tweakerEnabled && this.modePoints) {
      body.appendChild(
        makeSliderField(
          'Tangency Snap',
          1,
          45,
          1,
          this.tangencyGranularity,
          'deg',
          (v) => {
            this.tangencyGranularity = v;
            if (this.onTangencyGranularityChange)
              this.onTangencyGranularityChange(v);
          }
        )
      );
    }

    this.scrollArea.appendChild(section);
  }
}

