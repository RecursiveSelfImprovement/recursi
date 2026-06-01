class JitterGradient {
  // Replace constructor and init with run()
    constructor() {
      // Empty constructor to overwrite legacy
    }

  init(targetElement) {
    this.container = targetElement;
    this.createStyles();
    this.createUI();
    this.generateCanvas();
  }

  createStyles() {
      // Consolidated styles, all scoped to .bluegreen-wrapper
      applyCss(`
        .bluegreen-wrapper {
            background-color: #f4f7f9;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            color: #333;
            width: 100%;
            height: 100%;
            overflow: auto;
            box-sizing: border-box;
            padding: 20px;
        }
        .bluegreen-wrapper .jg-container { display: flex; flex-direction: column; gap: 20px; max-width: 1200px; margin: 0 auto; }
        .bluegreen-wrapper .jg-controls {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 20px;
            background-color: #ffffff;
            border: 1px solid #dcdcdc;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .bluegreen-wrapper .jg-control-group { display: flex; flex-direction: column; gap: 8px; }
        .bluegreen-wrapper .jg-control-group > label {
            font-weight: bold;
            font-size: 1em;
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 5px;
            margin-bottom: 5px;
        }
        .bluegreen-wrapper .jg-control-item { display: flex; flex-direction: column; gap: 4px; }
        .bluegreen-wrapper .jg-control-item label, .bluegreen-wrapper .jg-checkbox-group label { font-size: 0.85em; color: #555; user-select: none; cursor: pointer;}
        .bluegreen-wrapper .jg-control-item input[type="color"] { width: 100%; height: 35px; padding: 2px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
        .bluegreen-wrapper .jg-control-item .color-display { font-size: 0.8em; font-family: monospace; color: #333; background: #f0f0f0; padding: 4px; border-radius: 3px; text-align: center; }
        .bluegreen-wrapper .jg-control-item input[type="number"] { width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;}
        .bluegreen-wrapper .jg-control-item input[type="range"] { width: 100%; cursor: pointer; }
        .bluegreen-wrapper .jg-slider-group { display: flex; align-items: center; gap: 8px; }
        .bluegreen-wrapper .jg-slider-group .value-display {
            font-family: monospace;
            font-size: 0.9em;
            background-color: #e9ecef;
            padding: 3px 6px;
            border-radius: 4px;
            min-width: 40px;
            text-align: center;
        }
        .bluegreen-wrapper .jg-checkbox-group { display: flex; align-items: center; gap: 5px; }
        .bluegreen-wrapper .jg-canvas-container {
            position: relative;
            border: 1px solid #ccc;
            background-color: #fff;
            line-height: 0;
            width: fit-content;
            margin: 0 auto;
        }
        .bluegreen-wrapper .jg-highlighter {
            position: absolute;
            background-color: transparent;
            border: 2px solid white;
            box-shadow: 0 0 8px rgba(0,0,0,0.6);
            box-sizing: border-box;
            pointer-events: none;
            display: none;
        }
        .bluegreen-wrapper .jg-swatch-container {
            display: none;
            justify-content: center;
            align-items: center;
            margin-top: 10px;
            min-height: 110px;
        }
        .bluegreen-wrapper .jg-swatch-area { display: flex; align-items: center; gap: 15px; padding: 10px; background: #fff; border-radius: 5px; border: 1px solid #ccc; }
        .bluegreen-wrapper .jg-swatch-color { width: 80px; height: 80px; border: 1px solid #000; flex-shrink: 0; }
        .bluegreen-wrapper .jg-swatch-text {
            font-family: monospace;
            font-size: 1.1em;
            line-height: 1.4;
            min-width: 220px; 
        }
      `, 'jitter-gradient-styles');
    }

  createUI() {
    // ... (Omitting color, dimension groups as they are unchanged) ...
    const colorGroup = makeElement('div', { className: 'jg-control-group' }, [
      makeElement('label', 'Colors'),
      makeElement('div', { className: 'jg-control-item' }, [
        makeElement('label', { htmlFor: 'colorLeft' }, 'Left'),
        (this.ui.colorLeft = makeElement('input', {
          type: 'color',
          id: 'colorLeft',
          value: this.config.colorLeft,
        })),
        (this.ui.colorLeftDisplay = makeElement('div', {
          className: 'color-display',
        })),
      ]),
      makeElement('div', { className: 'jg-control-item' }, [
        makeElement('label', { htmlFor: 'colorRight' }, 'Right'),
        (this.ui.colorRight = makeElement('input', {
          type: 'color',
          id: 'colorRight',
          value: this.config.colorRight,
        })),
        (this.ui.colorRightDisplay = makeElement('div', {
          className: 'color-display',
        })),
      ]),
    ]);
    const dimGroup = makeElement('div', { className: 'jg-control-group' }, [
      makeElement('label', 'Dimensions'),
      makeElement('div', { className: 'jg-control-item' }, [
        makeElement('label', { htmlFor: 'width' }, 'Width'),
        (this.ui.width = makeElement('input', {
          type: 'number',
          id: 'width',
          value: this.config.width,
          min: 10,
          step: 10,
        })),
      ]),
      makeElement('div', { className: 'jg-control-item' }, [
        makeElement('label', { htmlFor: 'height' }, 'Height'),
        (this.ui.height = makeElement('input', {
          type: 'number',
          id: 'height',
          value: this.config.height,
          min: 10,
          step: 10,
        })),
      ]),
    ]);

    // Rendering Group - with new addition
    const renderGroup = makeElement('div', { className: 'jg-control-group' }, [
      makeElement('label', 'Rendering'),
      makeElement('div', { className: 'jg-control-item' }, [
        makeElement('label', { htmlFor: 'randomness' }, 'Randomness'),
        makeElement('div', { className: 'jg-slider-group' }, [
          (this.ui.randomness = makeElement('input', {
            type: 'range',
            id: 'randomness',
            min: 0,
            max: 1,
            step: 0.01,
            value: this.config.randomness,
          })),
          (this.ui.randomnessValue = makeElement(
            'span',
            { className: 'value-display' },
            this.config.randomness
          )),
        ]),
      ]),
      makeElement('div', { className: 'jg-control-item' }, [
        makeElement('label', { htmlFor: 'granularity' }, 'Granularity'),
        (this.ui.granularity = makeElement('input', {
          type: 'number',
          id: 'granularity',
          min: 1,
          value: this.config.granularity,
        })),
      ]),
      makeElement('div', { className: 'jg-control-item' }, [
        makeElement('label', 'Neighbor Finding'),
        makeElement(
          'div',
          { style: { display: 'flex', gap: '15px', marginTop: '5px' } },
          [
            makeElement('div', { className: 'jg-checkbox-group' }, [
              (this.ui.neighborHorizontal = makeElement('input', {
                type: 'radio',
                name: 'neighbor',
                id: 'neighborH',
                value: 'horizontal',
                checked: this.config.neighborFinding === 'horizontal',
              })),
              makeElement('label', { htmlFor: 'neighborH' }, 'Horizontal Only'),
            ]),
            makeElement('div', { className: 'jg-checkbox-group' }, [
              (this.ui.neighborAll = makeElement('input', {
                type: 'radio',
                name: 'neighbor',
                id: 'neighborA',
                value: 'all',
                checked: this.config.neighborFinding === 'all',
              })),
              makeElement('label', { htmlFor: 'neighborA' }, 'All Directions'),
            ]),
          ]
        ),
      ]),
    ]);

    const gridGroup = makeElement('div', { className: 'jg-control-group' }, [
      makeElement('label', 'Grid'),
      makeElement('div', { className: 'jg-checkbox-group' }, [
        (this.ui.gridEnabled = makeElement('input', {
          type: 'checkbox',
          id: 'gridEnabled',
          checked: this.config.grid.enabled,
        })),
        makeElement('label', { htmlFor: 'gridEnabled' }, 'Show Grid'),
      ]),
      makeElement('div', { className: 'jg-control-item' }, [
        makeElement('label', { htmlFor: 'gridColor' }, 'Grid Color'),
        (this.ui.gridColor = makeElement('input', {
          type: 'color',
          id: 'gridColor',
          value: this.config.grid.color,
        })),
      ]),
      makeElement('div', { className: 'jg-control-item' }, [
        makeElement('label', { htmlFor: 'gridOpacity' }, 'Opacity'),
        makeElement('div', { className: 'jg-slider-group' }, [
          (this.ui.gridOpacity = makeElement('input', {
            type: 'range',
            id: 'gridOpacity',
            min: 0,
            max: 1,
            step: 0.01,
            value: this.config.grid.opacity,
          })),
          (this.ui.gridOpacityValue = makeElement(
            'span',
            { className: 'value-display' },
            this.config.grid.opacity
          )),
        ]),
      ]),
    ]);

    const controlsContainer = makeElement('div', { className: 'jg-controls' });
    controlsContainer.append(colorGroup, dimGroup, renderGroup, gridGroup);

    // ... (Omitting swatch and container creation as it's unchanged) ...
    this.ui.canvasContainer = makeElement('div', {
      className: 'jg-canvas-container',
    });
    this.ui.highlighter = makeElement('div', { className: 'jg-highlighter' });
    this.ui.canvasContainer.appendChild(this.ui.highlighter);
    this.ui.swatch1 = {
      area: makeElement('div', { className: 'jg-swatch-area' }),
      color: makeElement('div', { className: 'jg-swatch-color' }),
      text: makeElement('div', { className: 'jg-swatch-text' }),
    };
    this.ui.swatch1.area.append(this.ui.swatch1.color, this.ui.swatch1.text);
    this.ui.swatch2 = {
      area: makeElement('div', { className: 'jg-swatch-area' }),
      color: makeElement('div', { className: 'jg-swatch-color' }),
      text: makeElement('div', { className: 'jg-swatch-text' }),
    };
    this.ui.swatch2.area.append(this.ui.swatch2.color, this.ui.swatch2.text);
    this.ui.swatchContainer = makeElement(
      'div',
      { className: 'jg-swatch-container' },
      [this.ui.swatch1.area, this.ui.swatch2.area]
    );

    this.container.innerHTML = '';
    const mainContainer = makeElement('div', { className: 'jg-container' }, [
      makeElement(
        'h1',
        { style: { textAlign: 'center', color: '#444' } },
        'Jitter Gradient Generator'
      ),
      controlsContainer,
      this.ui.canvasContainer,
      this.ui.swatchContainer,
    ]);
    this.container.appendChild(mainContainer);
    this._attachEventListeners();
  }

  updateConfigFromUI() {
    this.config.colorLeft = this.ui.colorLeft.value;
    this.config.colorRight = this.ui.colorRight.value;
    this.config.width = parseInt(this.ui.width.value, 10);
    this.config.height = parseInt(this.ui.height.value, 10);
    this.config.randomness = parseFloat(this.ui.randomness.value);
    this.config.granularity = parseInt(this.ui.granularity.value, 10) || 1;
    this.config.grid.enabled = this.ui.gridEnabled.checked;
    this.config.grid.color = this.ui.gridColor.value;
    this.config.grid.opacity = parseFloat(this.ui.gridOpacity.value);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  generateCanvas() {
    this.updateConfigFromUI();
    this.handleCanvasMouseLeave(); // Hide hover elements during redraw

    const canvasWidth = Math.max(10, this.config.width);
    const canvasHeight = Math.max(10, this.config.height);

    if (
      !this.ui.canvas ||
      this.ui.canvas.width !== canvasWidth ||
      this.ui.canvas.height !== canvasHeight
    ) {
      // Remove old canvas if it exists
      if (this.ui.canvas) {
        this.ui.canvas.remove();
      }
      this.ui.canvas = makeElement('canvas', {
        width: canvasWidth,
        height: canvasHeight,
      });
      this.ui.canvasContainer.insertBefore(this.ui.canvas, this.ui.highlighter);
    }

    const ctx = this.ui.canvas.getContext('2d');
    const { colorLeft, colorRight, randomness, granularity } = this.config;

    const c1 = this.hexToRgb(colorLeft);
    const c2 = this.hexToRgb(colorRight);

    if (!c1 || !c2) {
      console.error('Invalid color format');
      return;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let y = 0; y < canvasHeight; y += granularity) {
      for (let x = 0; x < canvasWidth; x += granularity) {
        const baseRatio = x / (canvasWidth > 1 ? canvasWidth - 1 : 1);
        const jitter = (Math.random() - 0.5) * 2 * randomness;
        const finalRatio = Math.max(0, Math.min(1, baseRatio + jitter));

        const r = c1.r * (1 - finalRatio) + c2.r * finalRatio;
        const g = c1.g * (1 - finalRatio) + c2.g * finalRatio;
        const b = c1.b * (1 - finalRatio) + c2.b * finalRatio;

        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
        ctx.fillRect(x, y, granularity, granularity);
      }
    }

    if (this.config.grid.enabled) {
      this.drawGrid(ctx);
    }
  }

  drawGrid(ctx) {
    const { width, height, granularity } = this.config;
    const { color, opacity, width: gridWidth } = this.config.grid;

    if (granularity <= gridWidth) return;

    const gridColorRgb = this.hexToRgb(color);
    if (!gridColorRgb) return;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(${gridColorRgb.r}, ${gridColorRgb.g}, ${gridColorRgb.b}, ${opacity})`;
    ctx.lineWidth = gridWidth;

    for (let x = granularity; x < width; x += granularity) {
      ctx.moveTo(x - gridWidth / 2, 0);
      ctx.lineTo(x - gridWidth / 2, height);
    }

    for (let y = granularity; y < height; y += granularity) {
      ctx.moveTo(0, y - gridWidth / 2);
      ctx.lineTo(width, y - gridWidth / 2);
    }
    ctx.stroke();
  }

  _attachEventListeners() {
    // ... (Omitting most of the function as it's mostly unchanged) ...
    const inputs = [
      this.ui.colorLeft,
      this.ui.colorRight,
      this.ui.width,
      this.ui.height,
      this.ui.granularity,
      this.ui.gridEnabled,
      this.ui.gridColor,
    ];
    inputs.forEach((input) => {
      input.addEventListener('change', () => this.generateCanvas());
    });
    const liveInputs = [this.ui.width, this.ui.height, this.ui.granularity];
    liveInputs.forEach((input) => {
      input.addEventListener('input', () => this.generateCanvas());
    });
    this.ui.colorLeft.addEventListener('input', () =>
      this.updateColorDisplays()
    );
    this.ui.colorRight.addEventListener('input', () =>
      this.updateColorDisplays()
    );
    this.ui.randomness.addEventListener('input', () => {
      this.ui.randomnessValue.textContent = parseFloat(
        this.ui.randomness.value
      ).toFixed(2);
      this.generateCanvas();
    });
    this.ui.gridOpacity.addEventListener('input', () => {
      this.ui.gridOpacityValue.textContent = parseFloat(
        this.ui.gridOpacity.value
      ).toFixed(2);
      this.generateCanvas();
    });

    // Add listeners for new radio buttons
    this.ui.neighborHorizontal.addEventListener('change', (e) => {
      if (e.target.checked) this.config.neighborFinding = 'horizontal';
    });
    this.ui.neighborAll.addEventListener('change', (e) => {
      if (e.target.checked) this.config.neighborFinding = 'all';
    });

    // Set initial values for displays
    this.ui.randomnessValue.textContent = parseFloat(
      this.ui.randomness.value
    ).toFixed(2);
    this.ui.gridOpacityValue.textContent = parseFloat(
      this.ui.gridOpacity.value
    ).toFixed(2);
    this.updateColorDisplays();

    // Canvas hover events
    this.ui.canvasContainer.addEventListener('mousemove', (e) =>
      this.handleCanvasMouseMove(e)
    );
    this.ui.canvasContainer.addEventListener('mouseleave', () =>
      this.handleCanvasMouseLeave()
    );
  }

  rgbToPercentString({ r, g, b }) {
    const r_pct = ((r / 255) * 100).toFixed(1);
    const g_pct = ((g / 255) * 100).toFixed(1);
    const b_pct = ((b / 255) * 100).toFixed(1);
    return `R:${r_pct}% G:${g_pct}% B:${b_pct}%`;
  }

  updateColorDisplays() {
    const cLeft = this.hexToRgb(this.ui.colorLeft.value);
    if (cLeft) {
      this.ui.colorLeftDisplay.textContent = this.rgbToPercentString(cLeft);
    }
    const cRight = this.hexToRgb(this.ui.colorRight.value);
    if (cRight) {
      this.ui.colorRightDisplay.textContent = this.rgbToPercentString(cRight);
    }
  }

  handleCanvasMouseMove(event) {
    if (!this.ui.canvas) return;

    const rect = this.ui.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (
      mouseX < 0 ||
      mouseX >= rect.width ||
      mouseY < 0 ||
      mouseY >= rect.height
    ) {
      this.handleCanvasMouseLeave();
      return;
    }

    const g = this.config.granularity;
    if (g <= 0) return;

    const cellX = Math.floor(mouseX / g);
    const cellY = Math.floor(mouseY / g);

    const innerX = mouseX - cellX * g;
    const innerY = mouseY - cellY * g;
    const dx = innerX - g / 2;
    const dy = innerY - g / 2;

    let neighborX = cellX;
    let neighborY = cellY;

    // Respect the neighbor finding setting
    if (this.config.neighborFinding === 'all') {
      if (Math.abs(dx) > Math.abs(dy)) {
        neighborX += dx > 0 ? 1 : -1;
      } else {
        neighborY += dy > 0 ? 1 : -1;
      }
    } else {
      // 'horizontal'
      neighborX += dx > 0 ? 1 : -1;
    }

    const numCellsX = Math.floor(this.ui.canvas.width / g);
    const numCellsY = Math.floor(this.ui.canvas.height / g);
    let isPaired = true;

    if (
      neighborX < 0 ||
      neighborX >= numCellsX ||
      neighborY < 0 ||
      neighborY >= numCellsY
    ) {
      isPaired = false;
    }

    // ... (rest of the function is unchanged) ...
    const padding = 3;
    const highlighLeft =
      Math.min(cellX, isPaired ? neighborX : cellX) * g - padding;
    const highlightTop =
      Math.min(cellY, isPaired ? neighborY : cellY) * g - padding;
    const highlightWidth =
      ((isPaired ? Math.abs(cellX - neighborX) : 0) + 1) * g + 2 * padding;
    const highlightHeight =
      ((isPaired ? Math.abs(cellY - neighborY) : 0) + 1) * g + 2 * padding;
    this.ui.highlighter.style.display = 'block';
    Object.assign(this.ui.highlighter.style, {
      left: `${highlighLeft}px`,
      top: `${highlightTop}px`,
      width: `${highlightWidth}px`,
      height: `${highlightHeight}px`,
    });
    const ctx = this.ui.canvas.getContext('2d');
    const updateSwatch = (swatchUI, cx, cy) => {
      const sampleX = Math.min(this.ui.canvas.width - 1, cx * g + g / 2);
      const sampleY = Math.min(this.ui.canvas.height - 1, cy * g + g / 2);
      const colorData = ctx.getImageData(sampleX, sampleY, 1, 1).data;
      const [r, green, b] = colorData;
      swatchUI.area.style.display = 'flex';
      swatchUI.color.style.backgroundColor = `rgb(${r}, ${green}, ${b})`;
      const percentString = this.rgbToPercentString({ r: r, g: green, b: b });
      swatchUI.text.innerHTML = `rgb(${r}, ${green}, ${b})<br>${percentString}`;
    };
    this.ui.swatchContainer.style.display = 'flex';
    if (isPaired) {
      if (neighborX !== cellX) {
        this.ui.swatchContainer.style.flexDirection = 'row';
        this.ui.swatchContainer.style.gap = '30px';
        const leftCellX = Math.min(cellX, neighborX);
        const rightCellX = Math.max(cellX, neighborX);
        updateSwatch(this.ui.swatch1, leftCellX, cellY);
        updateSwatch(this.ui.swatch2, rightCellX, cellY);
      } else {
        this.ui.swatchContainer.style.flexDirection = 'column';
        this.ui.swatchContainer.style.gap = '10px';
        const topCellY = Math.min(cellY, neighborY);
        const bottomCellY = Math.max(cellY, neighborY);
        updateSwatch(this.ui.swatch1, cellX, topCellY);
        updateSwatch(this.ui.swatch2, cellX, bottomCellY);
      }
    } else {
      this.ui.swatchContainer.style.flexDirection = 'row';
      updateSwatch(this.ui.swatch1, cellX, cellY);
      this.ui.swatch2.area.style.display = 'none';
    }
  }

  handleCanvasMouseLeave() {
    this.ui.highlighter.style.display = 'none';
    this.ui.swatchContainer.style.display = 'none';
  }

  

  

  async run(env) {
      if (this.container) this.destroy();

      this.env = env;
      this.container = env.container;

      if (this.container === document.body) {
        document.documentElement.style.height = '100%';
        document.documentElement.style.margin = '0';
        document.body.style.height = '100%';
        document.body.style.margin = '0';
      }

      this.container.classList.add('bluegreen-wrapper');

      // Ported from old constructor
      this.config = {
        width: 850,
        height: 150,
        colorLeft: '#800080', // purple
        colorRight: '#FFFF00', // yellow
        randomness: 0.5,
        granularity: 12,
        neighborFinding: 'horizontal', 
        grid: {
          enabled: true,
          color: '#000000',
          opacity: 0.17,
          width: 1,
        },
      };

      this.ui = {};

      this.createStyles();
      this.createUI();
      this.generateCanvas();
    }

  destroy() {
      if (this.container) {
        this.container.innerHTML = '';
      }
      this.ui = {};
    }
}

