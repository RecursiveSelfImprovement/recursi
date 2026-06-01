class ColorPicker {
    
    constructor() {
      this.hueRing = null;
      this.trianglePickers = [];
    }

    init(targetElement) {
      this._applyPageStyles();

      const lightZone = makeElement(
        'div',
        { className: 'lab-zone lab-zone-light' },
        makeElement('div', { className: 'lab-label' }, 'Light Context')
      );
      const darkZone = makeElement(
        'div',
        { className: 'lab-zone lab-zone-dark' },
        makeElement('div', { className: 'lab-label' }, 'Dark Context')
      );

      targetElement.appendChild(lightZone);
      targetElement.appendChild(darkZone);

      this.addSwatches(lightZone, [
        { color: 'rgb(255, 60, 60)', top: 50, left: 50, width: 60, height: 60 },
        {
          color: 'rgb(60, 180, 255)',
          top: 150,
          left: 100,
          width: 80,
          height: 50,
        },
        { color: 'rgb(255, 180, 40)', top: 280, left: 60, width: 50, height: 50 },
      ]);

      this.addSwatches(darkZone, [
        { color: 'rgb(100, 255, 100)', top: 60, left: 60, width: 70, height: 70 },
        {
          color: 'rgb(200, 100, 255)',
          top: 180,
          left: 120,
          width: 90,
          height: 60,
        },
        {
          color: 'rgb(220, 220, 220)',
          top: 320,
          left: 80,
          width: 60,
          height: 60,
        },
      ]);
    }

    addSwatches(container, swatches) {
      swatches.forEach((config) => {
        const el = this.createSwatchElement(config);
        container.appendChild(el);

        const clickable = el.querySelector('.color-swatch-main');
        clickable.onclick = (e) => {
          e.stopPropagation();
          this.openSmartPicker(clickable, config.color, (newColor) => {
            clickable.style.backgroundColor = newColor;
            const label = el.querySelector('.swatch-label');
            if (label) label.textContent = newColor;
            config.color = newColor;
          });
        };
      });
    }

    createSwatchElement({ color, top, left, width, height }) {
      return makeElement(
        'div',
        {
          className: 'swatch-container',
          style: {
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
            width: `${width}px`,
          },
        },
        makeElement('div', {
          className: 'color-swatch-main',
          style: {
            height: `${height}px`,
            backgroundColor: color,
            borderRadius: '8px',
            cursor: 'pointer',
            border: '2px solid rgba(128,128,128,0.2)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          },
        }),
        makeElement(
          'div',
          {
            className: 'swatch-label',
            style: {
              fontSize: '10px',
              textAlign: 'center',
              marginTop: '4px',
              fontFamily: 'monospace',
            },
          },
          color
        )
      );
    }

    createHueRingDialog() {
      const hueRing = new HueRingCP(300);

      const styles = this._makePickerBarStyles();
      const transparencyCheck = makeElement('input', { type: 'checkbox' });
      const rotationRange = makeElement('input', {
        type: 'range',
        min: 0,
        max: 360,
        value: 0,
        style: { width: '100px' },
      });

      const controls = makeElement(
        'div',
        { style: styles.bar },
        makeElement(
          'label',
          { style: styles.checkboxRow },
          transparencyCheck,
          'Transparent'
        ),
        makeElement('label', { style: styles.labelRow }, 'Rotate:', rotationRange)
      );

      const hueDisplay = makeElement(
        'span',
        { style: { opacity: '0.95' } },
        'Hue: 0°'
      );
      const rgbDisplay = makeElement(
        'span',
        { style: { opacity: '0.8' } },
        'rgb(255, 0, 0)'
      );
      const footer = makeElement(
        'div',
        { style: styles.footer },
        hueDisplay,
        rgbDisplay
      );

      const wrapper = makeElement(
        'div',
        {
          style: {
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          },
        },
        hueRing.getElement()
      );

      const content = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            boxSizing: 'border-box',
          },
        },
        controls,
        wrapper,
        footer
      );

      let lastW = 0,
        lastH = 0;

      const dialog = UITools.makeDialog({
        title: 'Hue Ring',
        content: content,
        size: [360, 460],
        position: [window.innerWidth / 2 - 180, 80],
        noPadding: true,
        onGeometryChange: (box, geo) => {
          if (box._dragSt) return;
          const w = Math.round(geo.inner.width);
          const h = Math.round(geo.inner.height);

          if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return;
          lastW = w;
          lastH = h;

          const controlsH = controls.getBoundingClientRect().height || 40;
          const footerH = footer.getBoundingClientRect().height || 28;
          const availableH = h - controlsH - footerH;

          hueRing.resize(w - 40, availableH - 40);
        },
      });

      hueRing.onHueChange = (h) => {
        hueDisplay.textContent = `Hue: ${Math.round(h)}°`;
      };
      hueRing.onColorChange = (c) => {
        rgbDisplay.textContent = c;
      };

      rotationRange.oninput = (e) => {
        hueRing.setRotation(parseInt(e.target.value, 10));
      };

      transparencyCheck.onchange = (e) => {
        this._setDialogTransparency(dialog, controls, footer, !!e.target.checked);
      };

      dialog.triggerCallback();
      hueRing.setHue(0);
    }

    getRGBFromCustomWheel(angleDeg) {
      return [0, 0, 0];
    }

    _makePickerBarStyles() {
      return {
        bar: {
          padding: '8px',
          background: '#333',
          borderBottom: '1px solid #555',
          display: 'flex',
          gap: '15px',
          fontSize: '11px',
          alignItems: 'center',
          flexShrink: '0',
          boxSizing: 'border-box',
          width: '100%',
        },
        footer: {
          padding: '6px 8px',
          background: '#333',
          borderTop: '1px solid #555',
          display: 'flex',
          gap: '10px',
          fontSize: '11px',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: '0',
          boxSizing: 'border-box',
          width: '100%',
          color: '#cfcfcf',
          fontFamily: 'monospace',
        },
        labelRow: { display: 'flex', gap: '5px', alignItems: 'center' },
        checkboxRow: { display: 'flex', gap: '5px', alignItems: 'center' },
      };
    }

    _setDialogTransparency(dialog, controlsEl, footerEl, isTransparent) {
      if (!dialog || !dialog.element || !dialog.contentElement) return;

      if (isTransparent) {
        dialog.element.style.setProperty(
          'background-color',
          'transparent',
          'important'
        );
        dialog.contentElement.style.setProperty(
          'background-color',
          'transparent',
          'important'
        );
        dialog.element.style.boxShadow = 'none';
        if (controlsEl) controlsEl.style.backgroundColor = 'rgba(0,0,0,0.6)';
        if (footerEl) footerEl.style.backgroundColor = 'rgba(0,0,0,0.6)';
      } else {
        dialog.element.style.removeProperty('background-color');
        dialog.contentElement.style.removeProperty('background-color');
        dialog.element.style.boxShadow = '';
        if (controlsEl) controlsEl.style.backgroundColor = '#333';
        if (footerEl) footerEl.style.backgroundColor = '#333';
      }
    }

    _applyPageStyles() {
      const css = `
        .lab-zone {
          position: relative;
          width: 100%;
          height: 400px;
          margin-bottom: 20px;
          border-radius: 8px;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .lab-zone-light {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          color: #333;
        }
        .lab-zone-dark {
          background-color: #1e1e1e;
          border: 1px solid #333;
          color: #ccc;
        }
        .lab-label {
          position: absolute;
          top: 10px;
          left: 10px;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 12px;
          opacity: 0.5;
          pointer-events: none;
        }
        .swatch-container {
          transition: transform 0.1s;
        }
        .swatch-container:hover {
          transform: scale(1.05);
          z-index: 10;
        }
      `;
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }

    createCombinedDialog() {
      let state = {
        baseSize: 220,
        margin: 20,
        ratio: 1.0,
      };

      const hueRing = new HueRingCP(state.baseSize * state.ratio);
      const triangle = new TriangleCP(state.baseSize);

      const ringEl = hueRing.getElement();
      const triEl = triangle.getElement();

      ringEl.style.position = 'relative';
      triEl.style.position = 'relative';

      const bringToFront = (target) => {
        if (target === 'ring') {
          ringEl.style.zIndex = 10;
          triEl.style.zIndex = 1;
        } else {
          ringEl.style.zIndex = 1;
          triEl.style.zIndex = 10;
        }
      };

      bringToFront('ring');

      ringEl.addEventListener('mousedown', () => bringToFront('ring'));
      triEl.addEventListener('mousedown', () => bringToFront('tri'));

      const hueLabel = makeElement(
        'div',
        { className: 'param-label' },
        'Hue: 0°'
      );
      const satLabel = makeElement(
        'div',
        { className: 'param-label' },
        'Sat: 0%'
      );
      const whiteLabel = makeElement(
        'div',
        { className: 'param-label' },
        'Wht: 0%'
      );

      const pickersRow = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 10px',
            flex: 1,
            overflow: 'visible',
          },
        },
        ringEl,
        triEl
      );

      const updateStats = (hue, weights) => {
        hueLabel.textContent = `Hue: ${Math.round(hue)}°`;
        satLabel.textContent = `Sat: ${Math.round(weights.wA * 100)}%`;
        whiteLabel.textContent = `Wht: ${Math.round(weights.wC * 100)}%`;
      };

      hueRing.onHueChange = (h) => {
        triangle.setHue(h);
        updateStats(h, triangle.getWeights());
      };

      triangle.onColorUpdate = (colorString) => {
        hueRing.setThumbColor(colorString);
        hueRing.externalColorOverride = true;
        updateStats(hueRing.getHue(), triangle.getWeights());
      };

      const transparencyCheck = makeElement('input', { type: 'checkbox' });

      const makeSlider = (label, min, max, val, step, onChange) => {
        const input = makeElement('input', {
          type: 'range',
          min,
          max,
          value: val,
          step,
          style: { width: '80px', display: 'block', margin: '0 auto' },
        });
        input.oninput = (e) => onChange(parseFloat(e.target.value));
        return makeElement(
          'label',
          {
            style: {
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#bbb',
              textAlign: 'center',
            },
          },
          label,
          input
        );
      };

      const resizeAll = () => {
        const hSize = Math.round(state.baseSize * state.ratio);
        const tSize = Math.round(state.baseSize);
        hueRing.resize(hSize, hSize);
        triangle.resize(tSize, Math.round(tSize * 0.866));

        triEl.style.marginLeft = `${state.margin}px`;
      };

      const styles = this._makePickerBarStyles();

      const toolsRow = makeElement(
        'div',
        { style: styles.bar },
        makeElement(
          'label',
          { style: styles.checkboxRow },
          transparencyCheck,
          'Transp.'
        ),
        makeElement('div', {
          style: {
            width: '1px',
            height: '20px',
            background: '#555',
            margin: '0 5px',
          },
        }),
        makeSlider('Size', 100, 450, state.baseSize, 10, (v) => {
          state.baseSize = v;
          resizeAll();
        }),
        makeSlider('Gap', -150, 100, state.margin, 1, (v) => {
          state.margin = v;
          resizeAll();
        }),
        makeSlider('Ratio', 0.5, 1.5, state.ratio, 0.05, (v) => {
          state.ratio = v;
          resizeAll();
        })
      );

      const statsRow = makeElement(
        'div',
        { style: styles.footer },
        hueLabel,
        satLabel,
        whiteLabel
      );

      const container = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          },
        },
        toolsRow,
        pickersRow,
        statsRow
      );

      const dialog = UITools.makeDialog({
        title: 'Integrated Picker',
        content: container,
        size: [600, 500],
        position: [window.innerWidth / 2 - 300, 100],
        noPadding: true,
      });

      transparencyCheck.onchange = (e) => {
        this._setDialogTransparency(
          dialog,
          toolsRow,
          statsRow,
          !!e.target.checked
        );
      };

      resizeAll();
      hueRing.setHue(0);
      triangle.setHue(0);
    }

    _rybToRgb(rybHue) {
      const normalized = rybHue % 360;

      if (normalized < 120) {
        return normalized * 0.5;
      } else if (normalized < 240) {
        return 60 + (normalized - 120) * 1.5;
      } else {
        return 240 + (normalized - 240) * 1.0;
      }
    }

    _rgbToRyb(rgbHue) {
      const normalized = rgbHue % 360;

      if (normalized < 60) {
        return normalized * 2.0;
      } else if (normalized < 240) {
        return 120 + (normalized - 60) / 1.5;
      } else {
        return 240 + (normalized - 240) * 1.0;
      }
    }

    openSmartPicker(targetElement, initialColor, onColorUpdate) {
      if (this._activePicker) {
        this._activePicker.remove();
        this._activePicker = null;
      }

      const TOTAL_SIZE = 150;
      const TRIANGLE_SIZE = 100;
      const GAP = 10;

      const container = makeElement('div', {
        className: 'smart-picker-surface',
        style: {
          position: 'absolute',
          width: `${TOTAL_SIZE}px`,
          height: `${TOTAL_SIZE}px`,
          background: 'transparent',
          zIndex: '2147483647',
          userSelect: 'none',
          cursor: 'default',
          opacity: '0',
          transform: 'scale(0.5)',
          transition:
            'opacity 0.2s ease-out, transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          overflow: 'visible',
        },
      });

      document.body.appendChild(container);
      this._activePicker = container;

      const bgSizeRatio = 1.4;
      const bgSvg = makeElement('svg:svg', {
        style: {
          position: 'absolute',
          top: `${(1 - bgSizeRatio) * 50}%`,
          left: `${(1 - bgSizeRatio) * 50}%`,
          width: `${bgSizeRatio * 100}%`,
          height: `${bgSizeRatio * 100}%`,
          pointerEvents: 'none',
        },
      });

      const defs = makeElement('svg:defs');
      const filterId = `blur-bg-${Date.now()}`;
      const filter = makeElement('svg:filter', {
        id: filterId,
        x: '-50%',
        y: '-50%',
        width: '200%',
        height: '200%',
      });
      const feBlur = makeElement('svg:feGaussianBlur', {
        in: 'SourceGraphic',
        stdDeviation: '10',
      });
      filter.appendChild(feBlur);
      defs.appendChild(filter);

      const bgCircle = makeElement('svg:circle', {
        cx: '50%',
        cy: '50%',
        r: '34%',
        fill: 'rgba(20, 20, 20, 0.85)',
        filter: `url(#${filterId})`,
      });

      bgSvg.appendChild(defs);
      bgSvg.appendChild(bgCircle);
      container.appendChild(bgSvg);

      const rgbDisplay = makeElement(
        'div',
        {
          style: {
            position: 'absolute',
            bottom: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '11px',
            fontFamily: 'monospace',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            color: '#000',
            backdropFilter: 'blur(3px)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            transition: 'background-color 0.35s ease, color 0.1s',
            pointerEvents: 'none',
          },
        },
        '0,0,0'
      );
      container.appendChild(rgbDisplay);

      const rect = targetElement.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const swatchCy = rect.top + rect.height / 2;
      const pickerHalf = TOTAL_SIZE / 2;

      let left = rect.right + GAP;
      let top = swatchCy - pickerHalf;
      let originX = '0%';
      let originY = '50%';

      if (left + TOTAL_SIZE > winW - 10) {
        left = rect.left - TOTAL_SIZE - GAP;
        originX = '100%';
        if (left < 10) {
          left = rect.left + rect.width / 2 - pickerHalf;
          top = rect.bottom + GAP;
          originX = '50%';
          originY = '0%';
          if (top + TOTAL_SIZE > winH - 10) {
            top = rect.top - TOTAL_SIZE - GAP;
            originY = '100%';
            if (top < 10) {
              left = (winW - TOTAL_SIZE) / 2;
              top = (winH - TOTAL_SIZE) / 2;
              originX = '50%';
              originY = '50%';
            }
          }
        }
      }

      if (top < 10) top = 10;
      if (top + TOTAL_SIZE > winH - 10) top = winH - TOTAL_SIZE - 10;

      container.style.left = `${left + scrollX}px`;
      container.style.top = `${top + scrollY}px`;
      container.style.transformOrigin = `${originX} ${originY}`;

      requestAnimationFrame(() => {
        container.style.opacity = '1';
        container.style.transform = 'scale(1)';
      });

      const hueRing = new HueRingCP(TOTAL_SIZE);
      const triangle = new TriangleCP(TRIANGLE_SIZE);

      const rgbArray = ColorUtils.rgbStringToRgbArray(initialColor) || [
        128, 128, 128,
      ];
      const hsv = ColorUtils.rgbToHsv(rgbArray[0], rgbArray[1], rgbArray[2]);
      const initialRyb = this._rgbToRyb(hsv.h);

      const safeColorString = `rgb(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]})`;

      hueRing.setHue(initialRyb);
      triangle.setColor(safeColorString);
      triangle.rotation = initialRyb;

      hueRing.setThumbColor(safeColorString);
      hueRing.externalColorOverride = true;

      const ringEl = hueRing.getElement();
      const triEl = triangle.getElement();

      Object.assign(ringEl.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        pointerEvents: 'none',
      });

      const triOffset = (TOTAL_SIZE - TRIANGLE_SIZE) / 2;
      const geoCenterOffset = (TRIANGLE_SIZE - triangle.height) / 2;

      Object.assign(triEl.style, {
        position: 'absolute',
        left: `${triOffset}px`,
        top: `${triOffset + geoCenterOffset}px`,
        pointerEvents: 'none',
        transformOrigin: '50% 50%',
        zIndex: '10',
      });

      triEl.style.transform = `rotate(${initialRyb}deg)`;

      container.appendChild(ringEl);
      container.appendChild(triEl);

      const updateRGBLabel = (r, g, b, colorString) => {
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const isBright = brightness > 140;

        rgbDisplay.textContent = `${r},${g},${b}`;
        rgbDisplay.style.color = colorString;
        rgbDisplay.style.backgroundColor = isBright
          ? 'rgba(10, 10, 10, 0.7)'
          : 'rgba(245, 245, 245, 0.7)';
      };

      updateRGBLabel(rgbArray[0], rgbArray[1], rgbArray[2], safeColorString);

      const updateFinal = (newRgbHue) => {
        const { wA, wB, wC } = triangle.getWeights();
        const pureHue = ColorUtils.hsvToRgbArray(newRgbHue / 360, 1, 1);
        const r = Math.round(wA * pureHue[0] + wC * 255);
        const g = Math.round(wA * pureHue[1] + wC * 255);
        const b = Math.round(wA * pureHue[2] + wC * 255);
        const finalColor = `rgb(${r}, ${g}, ${b})`;

        hueRing.setThumbColor(finalColor);
        hueRing.externalColorOverride = true;

        updateRGBLabel(r, g, b, finalColor);
        if (onColorUpdate) onColorUpdate(finalColor);
      };

      hueRing.onHueChange = (rybHue) => {
        const rgbHue = this._rybToRgb(rybHue);
        triangle.rotation = rybHue;
        triEl.style.transform = `rotate(${rybHue}deg)`;
        triangle.setHue(rgbHue);
        updateFinal(rgbHue);
      };

      triangle.onColorUpdate = (c) => {
        const rgb = ColorUtils.rgbStringToRgbArray(c);
        if (rgb) {
          updateRGBLabel(rgb[0], rgb[1], rgb[2], c);
        }
        hueRing.setThumbColor(c);
        hueRing.externalColorOverride = true;
        if (onColorUpdate) onColorUpdate(c);
      };

      const isInsideTriangle = (x, y) => {
        if (!triangle.triGeometry) return false;
        const dx = x - TOTAL_SIZE / 2;
        const dy = y - TOTAL_SIZE / 2;
        return Math.sqrt(dx * dx + dy * dy) < TOTAL_SIZE * 0.3;
      };

      const processEvent = (e) => {
        const r = container.getBoundingClientRect();
        const cx = TOTAL_SIZE / 2;
        const cy = TOTAL_SIZE / 2;
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;

        let target = this._dragTarget;
        if (!target) target = isInsideTriangle(x, y) ? 'triangle' : 'ring';

        if (target === 'triangle') {
          const dx = x - cx;
          const dy = y - cy;
          const rad = (-triangle.rotation * Math.PI) / 180;
          const tx = dx * Math.cos(rad) - dy * Math.sin(rad) + TRIANGLE_SIZE / 2;
          const ty =
            dx * Math.sin(rad) + dy * Math.cos(rad) + triangle.height / 2;
          triangle.processInput(tx, ty);
          this._dragTarget = 'triangle';
        } else {
          hueRing.processInput(x - cx, y - cy);
          this._dragTarget = 'ring';
        }
      };

      container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._dragTarget = null;
        processEvent(e);
        const move = (ev) => processEvent(ev);
        const up = () => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
          this._dragTarget = null;
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      });

      const closeListener = (e) => {
        if (
          !container.contains(e.target) &&
          e.target !== targetElement &&
          !targetElement.contains(e.target)
        ) {
          cleanup();
        }
      };

      let leaveTimer;
      container.addEventListener('mouseleave', () => {
        if (this._dragTarget) return;
        leaveTimer = setTimeout(cleanup, 400);
      });
      container.addEventListener('mouseenter', () => clearTimeout(leaveTimer));

      const cleanup = () => {
        if (leaveTimer) clearTimeout(leaveTimer);
        window.removeEventListener('mousedown', closeListener);
        if (this._activePicker === container) {
          container.style.opacity = '0';
          container.style.transform = 'scale(0.8)';
          setTimeout(() => container.remove(), 200);
          this._activePicker = null;
        }
      };

      setTimeout(() => window.addEventListener('mousedown', closeListener), 50);
    }
  }