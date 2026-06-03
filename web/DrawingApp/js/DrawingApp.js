class DrawingApp {
  titleElement = null;

  statusDiv = null;

  configSection = null;

  configTextarea = null;

  createBoxButton = null;

  autoLoadedBox = null;

  autoLoadedBoxDimensionDisplay = null;

  configuredBoxes = [];

  init(targetElement) {
      console.log('Initializing Drawing Panel v10 (Tools)...');
      targetElement.innerHTML = '';

      this.drawnPaths = [];

      // Safe initialization using the newly isolated DrawingHistory class
      if (!this.history || typeof this.history.clear !== 'function') {
        this.history = new DrawingHistory();
      }
      this.history.clear();

      if (!this.colorPicker) {
        this.colorPicker = new ColorPicker();
      }

      this.loadSettings();
      this.injectStyles();

      const rect = targetElement.getBoundingClientRect();
      const containerW = (rect.width && rect.width > 100) ? rect.width : window.innerWidth;
      const containerH = (rect.height && rect.height > 100) ? rect.height : window.innerHeight;

      const pad = 20;
      const settingsW = 280;
      const mainW = Math.max(
        400,
        Math.min(
          containerW * 0.70,
          containerW - pad * 3 - settingsW
        )
      );
      const mainH = Math.floor(containerH * 0.85);

      this.createDrawingInterface({ x: pad, y: pad, w: mainW, h: mainH });
      this.createSettingsInterface({
        x: pad + mainW + pad,
        y: pad,
        w: settingsW,
        h: Math.min(400, containerH - pad * 2),
      });
      this.setupGlobalKeys();

      const savedMappings = localStorage.getItem('drawingAppMidiMappings_v1');
      if (savedMappings) {
        try {
          const parsed = JSON.parse(savedMappings);
          if (parsed.mappings && Object.keys(parsed.mappings).length > 0) {
            console.log('Found saved MIDI mappings, initializing controller...');
            this.midiMapper = new MidiMapper(
              this.settingsDialog.contentElement,
              this
            );
          }
        } catch (e) {
          console.warn('Error checking MIDI mappings', e);
        }
      }
    }

  createConfigurableBox() {
    if (!this.configTextarea || !this.statusDiv) {
      console.error('Required elements not initialized.');
      return;
    }

    const jsonString = this.configTextarea.value;
    let options;

    try {
      options = JSON.parse(jsonString);
      this.statusDiv.textContent = 'Creating box with provided config...';

      const configuredBox = new DialogBox(options);

      if (!options.contentHTML && !options.contentElement) {
        // Corrected: Use .contentElement
        configuredBox.contentElement.appendChild(
          makeElement(
            'p',
            `Box created with title: "${options.title || 'Untitled'}"`
          )
        );
        configuredBox.contentElement.appendChild(
          makeElement(
            'p',
            `Size: ${options.size ? options.size.join('x') : 'Default'}`
          )
        );
      }

      this.configuredBoxes.push(configuredBox);
      this.statusDiv.textContent = `DialogBox "${
        options.title || 'Untitled'
      }" created successfully. Count: ${this.configuredBoxes.length}`;
    } catch (error) {
      console.error('Error parsing JSON config:', error);
      this.statusDiv.textContent = `Error: Invalid JSON configuration. ${error.message}`;
      alert(
        `Invalid JSON configuration:\n${error.message}\nPlease check the text area.`
      );
    }
  }

  updateStatus(message) {
    if (this.statusDiv) {
      this.statusDiv.textContent = message;
    }
  }

  getLastConfiguredBox() {
    return this.configuredBoxes.length > 0
      ? this.configuredBoxes[this.configuredBoxes.length - 1]
      : null;
  }

  constructor() {
      this.svgElement = null;
      this.drawingDialog = null;
      this.settingsDialog = null;
      this.modeLabel = null;
      this.cursorTip = null;
      this.history = new DrawingHistory(); // Updated instantiation
      this.colorPicker = new ColorPicker();

      this.activeElement = null;
      this.rubberBand = null;
      this.arcChordGuide = null;
      this.isDrawing = false;
      this.currentPoints = [];
      this.drawnPaths = [];
      this.highlightCircle = null;
      this.snappedPoint = null;
      this.hoveredElement = null;
      this.carriedElement = null;
      this.carryOrigin = null;
      this.originalPathData = null;
      this.editingPoint = null;
      this.editStartPos = null;
      this.pulsingElement = null;
      this.pendingImage = null;
      this.imageAspectRatio = 1;
      this.imageStartPoint = null;
      this.imagePreviewEl = null;

      this.isShiftDown = false;
      this.isCtrlDown = false;
      this.isSpaceDown = false;

      this.currentMousePt = null;
      this.cornerCentersGroup = null;
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.zoomGroup = null;
      
      this.settings = {
        toolMode: 'curve',
        bgColor: '#222222',
        strokeColor: 'rgb(0, 255, 170)',
        strokeWidth: 4,
        cornerRadius: 0,
        arcAngle: 0,
        construction: {
          visible: true,
          activeOnly: false,
          opacity: 0.6,
          lineWidth: 1,
          labelSize: 10,
        },
      };
      this.vbWidth = 2000;
      this.vbHeight = 1500;

      this.identityTransform = {
        worldToScreen: (pt) => [pt[0], pt[1]],
        screenToWorld: (pt) => [pt[0], pt[1]],
        zoom: 1,
      };
    }

  injectStyles() {
    applyCss(
      `
    /* --- Dialog Box Beautification Overrides --- */
    .dialog-box {
        border: 1px solid #444 !important;
        box-shadow: 0 15px 40px rgba(0,0,0,0.6) !important;
        background-color: rgba(35, 35, 35, 0.95) !important;
        backdrop-filter: blur(12px);
        border-radius: 10px !important;
    }
    .dialog-header {
        background: linear-gradient(to bottom, #3a3a3a, #2b2b2b) !important;
        border-bottom: 1px solid #444 !important;
        font-family: 'Segoe UI', system-ui, sans-serif !important;
        font-size: 13px !important;
        letter-spacing: 0.5px;
        padding: 8px 12px !important;
        border-radius: 10px 10px 0 0 !important;
    }
    .dialog-content {
        background-color: transparent !important;
        color: #e0e0e0 !important;
    }
    .dialog-button {
        background: linear-gradient(to bottom, #4a4a4a, #3a3a3a) !important;
        border: 1px solid #555 !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        border-radius: 4px !important;
        color: #eee !important;
    }
    .dialog-button:hover {
        background: linear-gradient(to bottom, #555, #454545) !important;
        border-color: #777 !important;
    }
    .dialog-footer {
        background-color: rgba(30, 30, 30, 0.5) !important;
        border-top: 1px solid #444 !important;
        border-radius: 0 0 10px 10px !important;
    }

    /* --- App Specific Styles --- */
    .setting-row { 
      margin-bottom: 15px; 
      display: flex; 
      flex-direction: column; 
      gap: 6px; 
    }
    /* Compact Row for Construction settings */
    .setting-row.compact-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 10px;
    }
    .compact-control {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .compact-control .setting-label {
        font-size: 10px;
        color: #888;
    }

    .setting-label { 
      color: #aaa; 
      font-size: 12px; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
    }
    .value-display { 
      font-family: 'Consolas', monospace; 
      color: #4fc3f7; 
      font-size: 11px; 
      background: rgba(0,0,0,0.3); 
      padding: 2px 6px; 
      border-radius: 4px; 
    }
    .drawing-surface { 
      background-color: var(--bg-color, #222); 
      width: 100%; 
      height: 100%; 
      display: block; 
      touch-action: none; 
      cursor: crosshair; 
    }
    
    /* --- Construction Line Styles --- */
    .construction-line {
        stroke: #95a5a6;
        stroke-width: var(--const-width, 1px);
        opacity: var(--const-opacity, 0.5);
        stroke-dasharray: 4,2;
        vector-effect: non-scaling-stroke; /* Keep lines crisp on zoom */
    }
    .construction-cp {
        fill: #f1c40f;
        stroke: none;
        r: calc(var(--const-width, 1px) + 2px);
        opacity: var(--const-opacity, 0.5);
    }
    .construction-label {
        font-family: monospace;
        font-weight: bold;
        font-size: var(--const-label-size, 10px);
        fill: #bdc3c7;
        opacity: var(--const-opacity, 0.5);
        pointer-events: none;
        user-select: none;
    }
    
    /* Visibility Modifiers */
    .hide-all-construction .curve-group .controls,
    .hide-all-construction .curve-group .construction-label { 
        display: none !important; 
    }
    
    /* Hide construction on non-active curves if 'Active Only' is enabled */
    .active-only-construction .curve-group:not(.active-curve) .controls,
    .active-only-construction .curve-group:not(.active-curve) .construction-label {
        display: none !important;
    }

    /* Panning Cursor State */
    .drawing-surface.panning { cursor: grab !important; }
    .drawing-surface.panning:active { cursor: grabbing !important; }

    /* Compact Swatch Styles */
    .color-swatch {
      width: 100%;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      border: 2px solid rgba(255,255,255,0.15);
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      transition: all 0.15s ease;
    }
    .color-swatch:hover { 
      transform: translateY(-1px);
      border-color: rgba(255,255,255,0.4);
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
    }

    /* --- Image Tool Styles --- */
    .image-preview-container {
        transition: max-height 0.3s ease, margin 0.3s ease, opacity 0.3s ease;
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        background: rgba(0,0,0,0.3);
        border-radius: 6px;
        border: 1px dashed #555;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 0;
    }
    .image-preview-container.active {
        max-height: 150px;
        opacity: 1;
        margin-top: 10px;
        padding: 5px;
    }
    .image-thumb {
        max-width: 100%;
        max-height: 140px;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }
    .tool-option.drag-over {
        border-color: #00ff00 !important;
        background-color: rgba(0, 255, 0, 0.2) !important;
        color: #fff !important;
        box-shadow: 0 0 10px rgba(0,255,0,0.3);
    }

    /* --- MIDI Mapping Styles --- */
    .midi-toggle-btn {
      width: 100%;
      padding: 8px;
      margin-top: 20px;
      background: rgba(50, 50, 50, 0.5);
      border: 1px solid #555;
      color: #aaa;
      cursor: pointer;
      border-radius: 6px;
      font-size: 11px;
      transition: all 0.2s;
    }
    .midi-toggle-btn:hover {
      background: rgba(70, 70, 70, 0.7);
      color: #fff;
    }
    .midi-toggle-btn.active {
      background: #007acc;
      color: #fff;
      border-color: #0088e0;
    }
    
    @keyframes midi-pulse {
      0%, 100% { 
        border-color: #ffff00; 
        box-shadow: 0 0 0 0 rgba(255, 255, 0, 0.7);
      }
      50% { 
        border-color: #ffaa00;
        box-shadow: 0 0 0 8px rgba(255, 255, 0, 0);
      }
    }
    
    .settings-container { position: relative; }
    .drawing-path { stroke-linecap: round; stroke-linejoin: round; fill: none; transition: stroke 0.2s, stroke-width 0.2s; }
    .drawing-path.highlighted { stroke: white !important; filter: drop-shadow(0 0 5px white); cursor: pointer; }
    .rubber-band { stroke-linecap: round; stroke-linejoin: round; fill: none; opacity: 0.8; pointer-events: none; stroke-dasharray: 4 4; }
    .arc-chord-guide { stroke: white; stroke-width: 2px; stroke-dasharray: 6 6; fill: none; opacity: 0.7; pointer-events: none; }
    .snap-highlight { fill: rgba(255, 255, 255, 0.2); stroke: #ff00ff; stroke-width: 3px; pointer-events: none; transition: r 0.1s ease-out; }
    .cursor-tip { font-family: monospace; font-size: 14px; fill: white; text-shadow: 0px 0px 3px black; pointer-events: none; font-weight: bold; }
    .mode-toast {
      position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 8px 16px; border-radius: 20px;
      background-color: rgba(30, 30, 30, 0.85); color: #ccc; font-family: sans-serif; font-size: 13px;
      pointer-events: none; user-select: none; border: 1px solid rgba(255,255,255,0.15); transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); text-align: center; white-space: nowrap; backdrop-filter: blur(4px);
    }
    .mode-toast.highlight { color: #fff; background-color: rgba(0, 120, 215, 0.8); border-color: rgba(100, 200, 255, 0.4); }
    .mode-toast.edit-mode { background-color: rgba(200, 50, 50, 0.8); border-color: #ff8888; }
    .settings-container { padding: 10px; color: #eee; }
    input[type=range] { width: 100%; background: transparent; margin: 2px 0 0 0; cursor: pointer; accent-color: #007acc; }
    .action-btn { width: 100%; padding: 10px; margin-top: 15px; background: #3a3a3a; border: 1px solid #555; color: #e0e0e0; cursor: pointer; border-radius: 6px; font-weight: 500; transition: all 0.2s; }
    .action-btn:hover { background: #4a4a4a; border-color: #666; color: white; }
    .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
    .tool-option { text-align: center; padding: 10px; cursor: pointer; border-radius: 6px; font-size: 13px; background: #2a2a2a; transition: all 0.2s; color: #aaa; border: 1px solid #3c3c3c; }
    .tool-option:hover { color: #fff; border-color: #555; background: #333; }
    .tool-option.active { background: #007acc; color: #fff; font-weight: 600; border-color: #0088e0; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .tool-option.danger:hover { color: #ff8888; border-color: #800; }
    .tool-option.danger.active { background: #d32f2f; color: white; border-color: #ff5252; }
  `,
      'DrawingAppStyles_v13'
    );
  }

  createDrawingInterface(layout) {
      this.svgElement = makeElement('svg:svg', {
        viewBox: `0 0 ${this.vbWidth} ${this.vbHeight}`,
        preserveAspectRatio: 'xMidYMid meet',
        className: 'drawing-surface',
        style: { '--bg-color': this.settings.bgColor },
      });
      this.svgElement.addEventListener('mouseleave', () => {
        this.isMouseOverBoard = false;
        if (this.rubberBand) this.rubberBand.style.display = 'none';
        if (this.arcChordGuide) this.arcChordGuide.style.display = 'none';
        this.cursorTip.style.display = 'none';
        this.hideHighlight();
        this.cornerCentersGroup.innerHTML = '';
        if (this.isDrawing) {
          if (
            this.settings.toolMode === 'line' &&
            this.currentPoints.length > 0
          ) {
            const lastPt = this.currentPoints[this.currentPoints.length - 1];
            this.updateRubberBand({ x: lastPt.x, y: lastPt.y });
          }
        }
      });
      this.svgElement.addEventListener('mouseenter', () => {
        this.isMouseOverBoard = true;
        if (this.rubberBand && this.isDrawing) this.rubberBand.style.display = '';
        if (
          this.arcChordGuide &&
          this.isDrawing &&
          this.currentPoints.length === 2
        )
          this.arcChordGuide.style.display = '';
      });
      this.zoomGroup = makeElement('svg:g');
      this.pathsGroup = makeElement('svg:g', { id: 'paths-layer' });
      this.tempGroup = makeElement('svg:g', { id: 'temp-layer' });
      this.uiGroup = makeElement('svg:g', { id: 'ui-layer' });
      this.zoomGroup.appendChild(this.pathsGroup);
      this.zoomGroup.appendChild(this.tempGroup);
      this.zoomGroup.appendChild(this.uiGroup);
      this.svgElement.appendChild(this.zoomGroup);
      this.highlightCircle = makeElement('svg:circle', {
        r: 20,
        cx: -100,
        cy: -100,
        className: 'snap-highlight',
        style: { display: 'none' },
      });
      this.uiGroup.appendChild(this.highlightCircle);
      this.cursorTip = makeElement(
        'svg:text',
        { x: 0, y: 0, className: 'cursor-tip', style: { display: 'none' } },
        ''
      );
      this.uiGroup.appendChild(this.cursorTip);
      this.cornerCentersGroup = makeElement('svg:g');
      this.uiGroup.appendChild(this.cornerCentersGroup);
      this.modeLabel = makeElement(
        'div',
        { className: 'mode-toast' },
        'Draw Mode'
      );
      const wrapper = makeElement(
        'div',
        {
          style: {
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          },
        },
        [this.svgElement, this.modeLabel]
      );
      this.svgElement.addEventListener('mousedown', (e) =>
        this.handlePointerDown(e)
      );
      this.svgElement.addEventListener('mousemove', (e) =>
        this.handlePointerMove(e)
      );
      this.svgElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.stopDrawing();
        if (this.editingPoint) this.dropPoint();
        if (this.carriedElement) this.cancelCarry();
      });
      this.svgElement.addEventListener('wheel', (e) => this.handleWheel(e), {
        passive: false,
      });
      this.svgElement.addEventListener('dblclick', (e) => {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateZoom();
      });

      const stateId = 'drawing_panel_v10';
      this.drawingDialog = UITools.makeDialog({
        env: this.env,
        title: 'Drawing Panel',
        size: [layout.w, layout.h],
        position: [layout.x, layout.y],
        contentElement: wrapper,
        noPadding: true,
        allowMaximize: true,
        stateId: stateId,
      });

      if (!localStorage.getItem(`uw_${stateId}`)) {
        Object.assign(this.drawingDialog.element.style, {
          left: layout.x + 'px',
          top: layout.y + 'px',
          width: layout.w + 'px',
          height: layout.h + 'px',
          transform: 'none',
        });
        this.drawingDialog._saveState();
      }
      this.updateZoom();
    }

  createSettingsInterface(layout) {
      const container = makeElement('div', { className: 'settings-container' });

      const toolModes = [
        { id: 'curve', label: 'Curve', group: 'draw' },
        { id: 'drawstring', label: 'DrawString', group: 'draw' },
        { id: 'polyarc', label: 'PolyArc', group: 'draw' },
        { id: 'arc', label: 'Arc (3-Pt)', group: 'draw' },
        { id: 'image', label: 'Image', group: 'draw' },
        { id: 'move', label: 'Move', group: 'edit' },
        { id: 'copy', label: 'Copy', group: 'edit' },
        { id: 'delete', label: 'Delete', group: 'edit', danger: true },
      ];

      this.fileInput = makeElement('input', {
        type: 'file',
        accept: 'image/*',
        style: { display: 'none' },
        onchange: (e) => this.handleImageFileSelect(e.target.files[0]),
      });
      container.appendChild(this.fileInput);

      const grid = makeElement('div', { className: 'tool-grid' });
      this.toolButtons = {};

      const setTool = (mode, suppressDialog = false) => {
        this.stopDrawing();

        if (this.currentToolInstance) {
          if (this.currentToolInstance.deactivate)
            this.currentToolInstance.deactivate();
          this.currentToolInstance = null;
        }

        if (this.carriedElement) this.cancelCarry();
        this.settings.toolMode = mode;

        if (mode === 'drawstring') {
          if (!this.drawStringTool)
            this.drawStringTool = new DrawStringTool(this);
          this.currentToolInstance = this.drawStringTool;
          this.currentToolInstance.activate();
        }

        Object.values(this.toolButtons).forEach((b) =>
          b.classList.remove('active')
        );
        if (this.toolButtons[mode])
          this.toolButtons[mode].classList.add('active');

        if (this.arcBendRow) {
          this.arcBendRow.style.display = mode === 'polyarc' ? 'flex' : 'none';
        }
        if (this.curveParamsRow) {
          this.curveParamsRow.style.display = mode === 'curve' ? 'block' : 'none';
        }
        if (this.radiusRow) {
          this.radiusRow.style.display = mode === 'polyarc' ? 'flex' : 'none';
        }

        if (mode === 'image' && !this.pendingImage && !suppressDialog) {
          this.fileInput.click();
        }
        this.updateUIState();
        this.saveSettings();
      };

      toolModes.forEach((m) => {
        const btn = makeElement(
          'button',
          {
            className: `tool-option ${m.danger ? 'danger' : ''}`,
            onclick: () => setTool(m.id),
          },
          m.label
        );
        if (m.id === 'image') {
          btn.ondragover = (e) => {
            e.preventDefault();
            btn.classList.add('drag-over');
          };
          btn.ondragleave = (e) => {
            btn.classList.remove('drag-over');
          };
          btn.ondrop = (e) => {
            e.preventDefault();
            btn.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              this.handleImageFileSelect(e.dataTransfer.files[0]);
              setTool('image', true);
            }
          };
        }
        if (this.settings.toolMode === m.id) btn.classList.add('active');
        this.toolButtons[m.id] = btn;
        grid.appendChild(btn);
      });

      container.appendChild(
        makeElement('div', { className: 'setting-label' }, 'Tools')
      );
      container.appendChild(grid);

      this.imagePreviewEl = makeElement('div', {
        className: 'image-preview-container',
      });
      container.appendChild(this.imagePreviewEl);

      container.appendChild(
        this.createColorSwatch('Line Color', this.settings.strokeColor, (c) => {
          this.settings.strokeColor = c;
          this.updateSettingsForActive();
          if (this.activeElement) {
            this.activeElement.setAttribute('stroke', c);
          }
          this.saveSettings();
        })
      );

      const thicknessDisplay = makeElement(
        'span',
        { className: 'value-display' },
        this.settings.strokeWidth + 'px'
      );
      container.appendChild(
        makeElement('div', { className: 'setting-row' }, [
          makeElement('div', { className: 'setting-label' }, [
            'Thickness',
            thicknessDisplay,
          ]),
          makeElement('input', {
            type: 'range',
            min: 1,
            max: 50,
            step: 1,
            value: this.settings.strokeWidth,
            oninput: (e) => {
              this.settings.strokeWidth = parseInt(e.target.value);
              thicknessDisplay.textContent = this.settings.strokeWidth + 'px';
              this.updateSettingsForActive();
              this.saveSettings();
            },
          }),
        ])
      );

      const radiusDisplay = makeElement(
        'span',
        { className: 'value-display' },
        this.settings.cornerRadius
      );
      const MAX_RAD = 800;
      const POWER = 3;
      const toSlider = (val) =>
        Math.round(100 * Math.pow(val / MAX_RAD, 1 / POWER));
      const fromSlider = (val) =>
        Math.round(MAX_RAD * Math.pow(val / 100, POWER));

      this.radiusRow = makeElement(
        'div',
        {
          className: 'setting-row',
          style: {
            display: this.settings.toolMode === 'polyarc' ? 'flex' : 'none',
          },
        },
        [
          makeElement('div', { className: 'setting-label' }, [
            'Corner Radius',
            radiusDisplay,
          ]),
          makeElement('input', {
            type: 'range',
            min: 0,
            max: 100,
            step: 1,
            value: toSlider(this.settings.cornerRadius),
            oninput: (e) => {
              const val = fromSlider(parseInt(e.target.value));
              this.settings.cornerRadius = val;
              radiusDisplay.textContent = val;
              if (
                this.isDrawing &&
                this.settings.toolMode === 'polyarc' &&
                this.currentPoints.length > 0
              ) {
                this.currentPoints.forEach((p) => (p.cornerRadius = val));
                if (this.activeElement) {
                  this.activeElement.setAttribute(
                    'd',
                    this.buildPolyArcPath(this.currentPoints)
                  );
                }
              }
              this.saveSettings();
            },
          }),
        ]
      );
      container.appendChild(this.radiusRow);

      const arcAngleDisplay = makeElement(
        'span',
        { className: 'value-display' },
        this.settings.arcAngle + '°'
      );
      this.arcAngleInput = makeElement('input', {
        type: 'range',
        min: -180,
        max: 180,
        step: 1,
        value: this.settings.arcAngle,
        oninput: (e) => {
          const val = parseInt(e.target.value);
          this.settings.arcAngle = val;
          arcAngleDisplay.textContent = val + '°';
          if (
            this.isDrawing &&
            this.settings.toolMode === 'polyarc' &&
            this.currentMousePt
          ) {
            this.updateRubberBand(this.currentMousePt);
          }
        },
      });
      this.arcBendRow = makeElement(
        'div',
        {
          className: 'setting-row',
          style: {
            display: this.settings.toolMode === 'polyarc' ? 'flex' : 'none',
          },
        },
        [
          makeElement('div', { className: 'setting-label' }, [
            'Arc Bend (L/R)',
            arcAngleDisplay,
          ]),
          this.arcAngleInput,
        ]
      );
      container.appendChild(this.arcBendRow);

      this.curveParams = { curvature: 1.0, balance: 1.0 };
      const curvDisplay = makeElement(
        'span',
        { className: 'value-display' },
        '1.00'
      );
      const balDisplay = makeElement(
        'span',
        { className: 'value-display' },
        '1.00'
      );
      this.curveParamsRow = makeElement(
        'div',
        {
          style: {
            display: this.settings.toolMode === 'curve' ? 'block' : 'none',
          },
        },
        [
          makeElement('div', { className: 'setting-row' }, [
            makeElement('div', { className: 'setting-label' }, [
              'Curvature',
              curvDisplay,
            ]),
            makeElement('input', {
              type: 'range',
              min: 0.1,
              max: 3.0,
              step: 0.01,
              value: 1.0,
              oninput: (e) => {
                this.curveParams.curvature = parseFloat(e.target.value);
                curvDisplay.textContent = this.curveParams.curvature.toFixed(2);
                this.updateActiveCurveParams();
              },
            }),
          ]),
          makeElement('div', { className: 'setting-row' }, [
            makeElement('div', { className: 'setting-label' }, [
              'Balance',
              balDisplay,
            ]),
            makeElement('input', {
              type: 'range',
              min: 0.0,
              max: 2.0,
              step: 0.01,
              value: 1.0,
              oninput: (e) => {
                this.curveParams.balance = parseFloat(e.target.value);
                balDisplay.textContent = this.curveParams.balance.toFixed(2);
                this.updateActiveCurveParams();
              },
            }),
          ]),
        ]
      );
      container.appendChild(this.curveParamsRow);

      container.appendChild(
        this.createColorSwatch('Background Color', this.settings.bgColor, (c) => {
          this.settings.bgColor = c;
          this.svgElement.style.setProperty('--bg-color', this.settings.bgColor);
          this.saveSettings();
        })
      );

      container.appendChild(
        makeElement('div', {
          style: {
            margin: '15px 0 5px 0',
            borderTop: '1px solid #444',
            paddingTop: '10px',
          },
        })
      );
      container.appendChild(
        makeElement(
          'div',
          { className: 'setting-label', style: { marginBottom: '10px' } },
          'Construction'
        )
      );

      const defC = this.settings.construction || {};

      const activeOnlyCheck = makeElement('input', {
        type: 'checkbox',
        checked: defC.activeOnly,
        onchange: (e) => {
          this.settings.construction.activeOnly = e.target.checked;
          this.updateConstructionVisuals();
          this.saveSettings();
        },
      });

      const showAllCheck = makeElement('input', {
        type: 'checkbox',
        checked: defC.visible,
        onchange: (e) => {
          this.settings.construction.visible = e.target.checked;
          this.updateConstructionVisuals();
          this.saveSettings();
        },
      });

      container.appendChild(
        makeElement('div', { className: 'setting-row compact-grid' }, [
          makeElement(
            'label',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#ccc',
              },
            },
            [showAllCheck, 'Show Construction']
          ),
          makeElement(
            'label',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#ccc',
              },
            },
            [activeOnlyCheck, 'Active Only']
          ),
        ])
      );

      const opDisplay = makeElement(
        'span',
        { className: 'value-display', style: { fontSize: '9px' } },
        defC.opacity
      );
      const opControl = makeElement('div', { className: 'compact-control' }, [
        makeElement('div', { className: 'setting-label' }, [
          'Constr. Opacity',
          opDisplay,
        ]),
        makeElement('input', {
          type: 'range',
          min: 0,
          max: 1,
          step: 0.05,
          value: defC.opacity,
          oninput: (e) => {
            this.settings.construction.opacity = parseFloat(e.target.value);
            opDisplay.textContent = this.settings.construction.opacity.toFixed(2);
            this.updateConstructionVisuals();
            this.saveSettings();
          },
        }),
      ]);

      const lwDisplay = makeElement(
        'span',
        { className: 'value-display', style: { fontSize: '9px' } },
        defC.lineWidth
      );
      const lwControl = makeElement('div', { className: 'compact-control' }, [
        makeElement('div', { className: 'setting-label' }, [
          'Constr. Width',
          lwDisplay,
        ]),
        makeElement('input', {
          type: 'range',
          min: 0.5,
          max: 5,
          step: 0.5,
          value: defC.lineWidth,
          oninput: (e) => {
            this.settings.construction.lineWidth = parseFloat(e.target.value);
            lwDisplay.textContent = this.settings.construction.lineWidth;
            this.updateConstructionVisuals();
            this.saveSettings();
          },
        }),
      ]);

      const lsDisplay = makeElement(
        'span',
        { className: 'value-display', style: { fontSize: '9px' } },
        defC.labelSize
      );
      const lsControl = makeElement('div', { className: 'compact-control' }, [
        makeElement('div', { className: 'setting-label' }, [
          'Label Size',
          lsDisplay,
        ]),
        makeElement('input', {
          type: 'range',
          min: 6,
          max: 32,
          step: 1,
          value: defC.labelSize,
          oninput: (e) => {
            this.settings.construction.labelSize = parseInt(e.target.value);
            lsDisplay.textContent = this.settings.construction.labelSize;
            this.updateConstructionVisuals();
            this.saveSettings();
          },
        }),
      ]);

      container.appendChild(
        makeElement('div', { className: 'setting-row compact-grid' }, [
          opControl,
          lwControl,
        ])
      );
      container.appendChild(
        makeElement('div', { className: 'setting-row compact-grid' }, [lsControl])
      );

      container.appendChild(
        makeElement(
          'button',
          { className: 'action-btn', onclick: () => this.performUndo() },
          'Undo (Ctrl+Z)'
        )
      );

      const midiBtn = makeElement(
        'button',
        {
          className: 'midi-toggle-btn',
          onclick: () => {
            if (!this.midiMapper)
              this.midiMapper = new MidiMapper(container, this);
            if (this.midiMapper.isActive) {
              this.midiMapper.deactivate();
              midiBtn.textContent = '🎹 Map MIDI';
              midiBtn.classList.remove('active');
            } else {
              this.midiMapper.activate();
              midiBtn.textContent = '✓ Done Mapping';
              midiBtn.classList.add('active');
            }
          },
        },
        '🎹 Map MIDI'
      );
      container.appendChild(midiBtn);

      const stateId = 'drawing_settings_v12';
      this.settingsDialog = UITools.makeDialog({
        env: this.env,
        title: 'Settings',
        size: [layout.w, layout.h || 400],
        position: [layout.x, layout.y],
        contentElement: container,
        allowMinimize: true,
        stateId: stateId,
      });

      if (!localStorage.getItem(`uw_${stateId}`)) {
        Object.assign(this.settingsDialog.element.style, {
          left: layout.x + 'px',
          top: layout.y + 'px',
          transform: 'none',
        });
        this.settingsDialog._saveState();
      }

      setTimeout(() => this.updateConstructionVisuals(), 0);
    }

  getSvgPoint(evt) {
    const rect = this.svgElement.getBoundingClientRect();
    if (rect.width === 0) return { x: 0, y: 0 };

    // 1. Calculate aspect ratios to map Screen Pixels -> SVG ViewBox Units
    const aspectSVG = this.vbWidth / this.vbHeight;
    const aspectRect = rect.width / rect.height;
    let drawScale,
      offX = 0,
      offY = 0;

    if (aspectRect > aspectSVG) {
      drawScale = this.vbHeight / rect.height;
      offX = (rect.width - rect.height * aspectSVG) / 2;
    } else {
      drawScale = this.vbWidth / rect.width;
      offY = (rect.height - rect.width / aspectSVG) / 2;
    }

    // Coordinates relative to the SVG ViewBox (0..2000, 0..1500)
    const vbX = (evt.clientX - rect.left - offX) * drawScale;
    const vbY = (evt.clientY - rect.top - offY) * drawScale;

    // 2. Apply Inverse Transform of the ZoomGroup to get World Coordinates
    // The transform is: scale(zoom) translate(panX, panY)
    // Formula: ViewBoxCoord = zoom * (WorldCoord + pan)
    // Inverse: WorldCoord = (ViewBoxCoord / zoom) - pan

    return {
      x: vbX / this.zoom - this.panX,
      y: vbY / this.zoom - this.panY,
    };
  }

  handlePointerDown(e) {
    if (e.button !== 0) return;
    const pt = this.getSvgPoint(e);
    if (this.isSpaceDown) return;

    // --- Delegation to Tool Instance ---
    if (
      this.currentToolInstance &&
      typeof this.currentToolInstance.onMouseDown === 'function'
    ) {
      this.currentToolInstance.onMouseDown(pt, e);
      // If the tool captures input entirely, we return early
      if (this.settings.toolMode === 'drawstring') {
        this.updateUIState();
        return;
      }
    }

    if (this.carriedElement) {
      this.dropCarriedElement();
      return;
    }
    if (this.editingPoint) {
      const target = this.snappedPoint
        ? { x: this.snappedPoint.x, y: this.snappedPoint.y }
        : pt;
      const oldPos = this.editStartPos;
      if (
        Math.abs(oldPos.x - target.x) > 0.1 ||
        Math.abs(oldPos.y - target.y) > 0.1
      ) {
        this.pushMoveAction(
          this.editingPoint.pathIndex,
          this.editingPoint.pointIndex,
          oldPos,
          target
        );
      }
      this.dropPoint();
      return;
    }

    const tool = this.settings.toolMode;

    if (tool === 'image') {
      if (!this.pendingImage) {
        this.fileInput.click();
        return;
      }
      if (!this.imageStartPoint) {
        this.imageStartPoint = pt;
        this.isDrawing = true;
        if (this.imagePreviewEl) {
          this.imagePreviewEl.classList.remove('active');
          this.imagePreviewEl.innerHTML = '';
        }
      } else {
        this.finalizeImagePlacement(pt);
      }
      this.updateUIState();
      return;
    }

    if (tool === 'delete') {
      if (this.hoveredElement) this.deleteElement(this.hoveredElement);
      return;
    }
    if (['move', 'copy'].includes(tool)) {
      if (this.hoveredElement) this.pickupElement(this.hoveredElement, pt);
      return;
    }

    if (this.isCtrlDown && this.snappedPoint) {
      if (!this.snappedPoint.isCurrent) {
        this.editingPoint = {
          pathIndex: this.snappedPoint.pathIndex,
          pointIndex: this.snappedPoint.pointIndex,
        };
        this.editStartPos = { x: this.snappedPoint.x, y: this.snappedPoint.y };
        this.updateUIState();
        return;
      }
    }

    const target = this.snappedPoint
      ? { x: this.snappedPoint.x, y: this.snappedPoint.y }
      : pt;

    // CURVE TOOL LOGIC
    if (tool === 'curve') {
      if (!this.isDrawing) {
        this.isDrawing = true;
        this.activeCurve = new Curve(this.pathsGroup);
        this.activeCurve.pathElement.setAttribute(
          'stroke',
          this.settings.strokeColor
        );
        this.activeCurve.pathElement.setAttribute(
          'stroke-width',
          this.settings.strokeWidth
        );
        this.drawnPaths.push({
          type: 'curve',
          element: this.activeCurve.group,
          instance: this.activeCurve,
        });
      }
      this.activeCurve.addVertex([target.x, target.y], {
        curvature: this.curveParams.curvature,
        balance: this.curveParams.balance,
      });

      const activeIdx = this.activeCurve.vertices.length - 1;
      this.activeCurve.render(this.identityTransform, {
        curve: this.activeCurve,
        index: activeIdx,
      });

      this.updateUIState();
      return;
    }

    // STANDARD TOOLS
    if (!this.isDrawing) {
      this.startPath(target);
    } else {
      this.addPoint(target);
    }
    this.updateUIState();
  }

  handlePointerMove(e) {
    this.lastPointerEvent = e;
    if (this.isSpaceDown) {
      const dx = e.movementX;
      const dy = e.movementY;
      if (dx !== 0 || dy !== 0) {
        this.panX += dx / this.zoom;
        this.panY += dy / this.zoom;
        this.updateZoom();
      }
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (this.isCtrlDown !== mod) this.isCtrlDown = mod;
    if (this.isShiftDown !== e.shiftKey) this.isShiftDown = e.shiftKey;
    const pt = this.getSvgPoint(e);
    this.currentMousePt = pt;

    // --- Delegation to Tool Instance ---
    if (
      this.currentToolInstance &&
      typeof this.currentToolInstance.onMouseMove === 'function'
    ) {
      this.currentToolInstance.onMouseMove(pt, e);
      if (this.settings.toolMode === 'drawstring') {
        this.updateUIState();
        return;
      }
    }

    if (this.settings.toolMode === 'image' && this.imageStartPoint) {
      this.updateImagePreview(pt);
      return;
    }

    if (this.carriedElement) {
      let target = pt;
      if (this.isShiftDown) {
        this.findAndHighlightNearest(pt, [this.carriedElement.element]);
        if (this.snappedPoint)
          target = { x: this.snappedPoint.x, y: this.snappedPoint.y };
      } else {
        this.hideHighlight();
      }

      const dx = target.x - this.carryOrigin.x;
      const dy = target.y - this.carryOrigin.y;

      if (this.carriedElement.type === 'curve') {
        const curve = this.carriedElement.instance;
        const origVerts = this.originalPathData.vertices;
        curve.vertices.forEach((v, i) => {
          const o = origVerts[i];
          v.point = [o[0] + dx, o[1] + dy];
          v.controlPoints[0] = [o.cp0[0] + dx, o.cp0[1] + dy];
          v.controlPoints[1] = [o.cp1[0] + dx, o.cp1[1] + dy];
        });
        curve.render(this.identityTransform);
      } else {
        const origPts = this.originalPathData.points;
        this.carriedElement.points.forEach((p, i) => {
          p.x = origPts[i].x + dx;
          p.y = origPts[i].y + dy;
        });
        this.refreshPathGeometry(this.carriedElement);
      }
      this.updateUIState();
      return;
    }

    if (this.editingPoint) {
      let target = pt;
      if (this.isShiftDown) {
        this.findAndHighlightNearest(pt);
        if (this.snappedPoint)
          target = { x: this.snappedPoint.x, y: this.snappedPoint.y };
      } else {
        this.hideHighlight();
      }
      this.moveVertex(this.editingPoint, target);
      this.updateUIState();
      return;
    }

    const tool = this.settings.toolMode;
    if (['move', 'copy', 'delete'].includes(tool)) {
      this.findAndHighlightElement(pt);
      this.updateUIState();
      return;
    }

    let target = pt;
    if (this.isShiftDown || (this.isCtrlDown && !this.editingPoint)) {
      this.findAndHighlightNearest(pt);
      if (this.snappedPoint)
        target = { x: this.snappedPoint.x, y: this.snappedPoint.y };
    } else {
      this.hideHighlight();
    }

    this.updateUIState();

    if (this.isDrawing) {
      if (tool === 'curve') {
        const activeIdx = this.activeCurve.vertices.length - 1;
        const activeV = { curve: this.activeCurve, index: activeIdx };
        this.activeCurve.render(this.identityTransform, activeV, null, [
          target.x,
          target.y,
        ]);
      } else {
        this.updateRubberBand(target);
      }
    }
  }

  startPath(pt) {
    this.isDrawing = true;
    this.currentPoints = [
      {
        x: pt.x,
        y: pt.y,
        cornerRadius: 0,
        arcAngle: 0,
      },
    ];
    const w = this.settings.strokeWidth;
    const c = this.settings.strokeColor;
    const tool = this.settings.toolMode;

    if (tool === 'arc') {
      this.activeElement = makeElement('svg:path', {
        d: `M ${pt.x} ${pt.y}`,
        className: 'drawing-path',
        stroke: c,
        'stroke-width': w,
        fill: 'none',
        style: { display: 'none' },
      });
      this.rubberBand = makeElement('svg:path', {
        d: `M ${pt.x} ${pt.y}`,
        className: 'rubber-band',
        stroke: c,
        'stroke-width': w,
        fill: 'none',
      });
      this.pathsGroup.appendChild(this.activeElement);
      this.tempGroup.appendChild(this.rubberBand);
    } else if (tool === 'polyarc') {
      this.activeElement = makeElement('svg:path', {
        d: `M ${pt.x} ${pt.y}`,
        className: 'drawing-path',
        stroke: c,
        'stroke-width': w,
        fill: 'none',
      });
      this.pathsGroup.appendChild(this.activeElement);
      this.rubberBand = null;
    }
  }

  addPoint(pt) {
    const tool = this.settings.toolMode;

    if (tool === 'curve') {
      if (this.activeCurve) {
        this.activeCurve.addVertex([pt.x, pt.y], {
          curvature: this.curveParams.curvature,
          balance: this.curveParams.balance,
        });
        const activeIdx = this.activeCurve.vertices.length - 1;
        this.activeCurve.render(this.identityTransform, {
          curve: this.activeCurve,
          index: activeIdx,
        });
      }
      return;
    }

    // Set corner radius for previous point
    if (this.currentPoints.length > 0) {
      this.currentPoints[this.currentPoints.length - 1].cornerRadius =
        this.settings.cornerRadius;
    }

    const newPoint = {
      x: pt.x,
      y: pt.y,
      cornerRadius: this.settings.cornerRadius,
      arcAngle: tool === 'polyarc' ? this.settings.arcAngle : 0,
    };

    this.currentPoints.push(newPoint);

    if (tool === 'polyarc') {
      this.settings.arcAngle = 0;
      if (this.arcAngleInput) {
        this.arcAngleInput.value = 0;
        const row = this.arcAngleInput.closest('.setting-row');
        if (row) {
          const display = row.querySelector('.value-display');
          if (display) display.textContent = '0°';
        }
      }
      const pathData = this.buildPolyArcPath(this.currentPoints);
      this.activeElement.setAttribute('d', pathData);
    } else if (tool === 'arc') {
      if (this.currentPoints.length === 2) {
        const p1 = this.currentPoints[0];
        const p2 = this.currentPoints[1];
        this.arcChordGuide = makeElement('svg:line', {
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          className: 'arc-chord-guide',
        });
        this.tempGroup.appendChild(this.arcChordGuide);
      } else if (this.currentPoints.length === 3) {
        this.stopDrawing();
      }
    }
  }

  stopDrawing(cancel) {
    // --- Delegation to Tool Instance ---
    if (
      this.currentToolInstance &&
      typeof this.currentToolInstance.onMouseUp === 'function'
    ) {
      // The tool might not use stopDrawing directly, but we call onMouseUp to finish
      // if user forced stop (like right click).
      this.currentToolInstance.onMouseUp(null, { forced: true });
      if (this.settings.toolMode === 'drawstring') {
        this.updateUIState();
        return;
      }
    }

    if (!this.isDrawing) return;

    if (this.settings.toolMode === 'image') {
      this.imageStartPoint = null;
      this.imageGhostBox = null;
      if (this.tempGroup) this.tempGroup.innerHTML = '';
      this.isDrawing = false;
      this.updateUIState();
      return;
    }

    if (this.settings.toolMode === 'curve') {
      if (
        cancel ||
        (this.activeCurve && this.activeCurve.vertices.length < 2)
      ) {
        if (this.activeCurve && this.activeCurve.group) {
          this.activeCurve.group.remove();
        }
        this.drawnPaths.pop();
      } else {
        this.activeCurve.render(this.identityTransform, null);
        const curve = this.activeCurve;
        const pathObj = this.drawnPaths[this.drawnPaths.length - 1];

        this.history.push({
          undo: () => {
            curve.group.remove();
            const idx = this.drawnPaths.indexOf(pathObj);
            if (idx > -1) this.drawnPaths.splice(idx, 1);
          },
        });
      }
      this.activeCurve = null;
      this.isDrawing = false;
      this.updateUIState();
      return;
    }

    if (this.cornerCentersGroup) {
      this.cornerCentersGroup.innerHTML = '';
    }

    if (cancel) {
      if (this.activeElement) this.activeElement.remove();
    } else {
      const tool = this.settings.toolMode;
      const isArc = tool === 'arc';
      const minPoints = isArc ? 3 : 2;

      if (this.currentPoints.length >= minPoints) {
        let finalPoints = [...this.currentPoints];

        if (isArc) {
          const mid = Geometry.getArcMidpoint(
            finalPoints[0],
            finalPoints[1],
            finalPoints[2]
          );
          finalPoints[2] = mid;
          const pathObj = {
            element: this.activeElement,
            type: 'arc',
            points: finalPoints,
          };
          pathObj.element.setAttribute(
            'd',
            Geometry.calculateArcPath(
              pathObj.points[0],
              pathObj.points[1],
              pathObj.points[2]
            )
          );
          this.activeElement.style.display = '';
          this.drawnPaths.push(pathObj);
          this.pushCreateAction(pathObj);
        } else if (tool === 'polyarc') {
          const pathObj = {
            element: this.activeElement,
            type: 'polyarc',
            points: finalPoints,
          };
          this.activeElement.setAttribute(
            'd',
            this.buildPolyArcPath(finalPoints)
          );
          this.drawnPaths.push(pathObj);
          this.pushCreateAction(pathObj);
        }
      } else {
        if (this.activeElement) this.activeElement.remove();
      }
    }

    this.isDrawing = false;
    this.currentPoints = [];
    this.activeElement = null;
    if (this.rubberBand) {
      this.rubberBand.remove();
      this.rubberBand = null;
    }
    if (this.arcChordGuide) {
      this.arcChordGuide.remove();
      this.arcChordGuide = null;
    }

    this.updateUIState();
  }

  saveSettings() {
    localStorage.setItem('svg_arc_settings_v10', JSON.stringify(this.settings));
  }

  loadSettings() {
    try {
      const r = localStorage.getItem('svg_arc_settings_v10');
      if (r) this.settings = { ...this.settings, ...JSON.parse(r) };
    } catch (e) {
      console.warn(e);
    }
  }

  updateCurrentToolState() {
    if (this.isDrawing && this.activePolyline && this.rubberBand) {
      const w = this.settings.strokeWidth;
      const c = this.settings.strokeColor;
      this.activePolyline.setAttribute('stroke', c);
      this.activePolyline.setAttribute('stroke-width', w);
      this.rubberBand.setAttribute('stroke', c);
      this.rubberBand.setAttribute('stroke-width', w);
    }
  }

  updateSnapping() {
    if (this.lastPointerEvent) {
      this.handlePointerMove(this.lastPointerEvent);
    } else {
      this.updateUIState();
    }
  }

  findAndHighlightNearest(pt, excludeElements = []) {
    const threshold = 70;
    let closest = null;
    let minDst = Infinity;

    this.drawnPaths.forEach((pathObj, pIdx) => {
      if (excludeElements.includes(pathObj.element)) return;

      if (pathObj.type === 'curve') {
        // Handle Curve type (array of BezierVertices)
        pathObj.instance.vertices.forEach((v, vIdx) => {
          if (
            this.editingPoint &&
            this.editingPoint.pathIndex === pIdx &&
            this.editingPoint.pointIndex === vIdx
          )
            return;

          // v.point is [x, y]
          const d = Math.hypot(pt.x - v.point[0], pt.y - v.point[1]);
          if (d < threshold && d < minDst) {
            minDst = d;
            closest = {
              pathIndex: pIdx,
              pointIndex: vIdx,
              x: v.point[0],
              y: v.point[1],
              element: pathObj.element,
              isCurve: true,
            };
          }
        });
      } else {
        // Standard types (array of point objects {x,y})
        pathObj.points.forEach((v, vIdx) => {
          if (
            this.editingPoint &&
            this.editingPoint.pathIndex === pIdx &&
            this.editingPoint.pointIndex === vIdx
          )
            return;
          const d = Geometry.distance(pt, v);
          if (d < threshold && d < minDst) {
            minDst = d;
            closest = {
              pathIndex: pIdx,
              pointIndex: vIdx,
              x: v.x,
              y: v.y,
              element: pathObj.element,
            };
          }
        });
      }
    });

    if (this.isShiftDown && this.isDrawing) {
      // Snapping to current drawing path
      if (this.settings.toolMode === 'curve' && this.activeCurve) {
        this.activeCurve.vertices.forEach((v) => {
          const d = Math.hypot(pt.x - v.point[0], pt.y - v.point[1]);
          if (d < threshold && d < minDst) {
            minDst = d;
            closest = { x: v.point[0], y: v.point[1], isCurrent: true };
          }
        });
      } else {
        this.currentPoints.forEach((v) => {
          const d = Geometry.distance(pt, v);
          if (d < threshold && d < minDst) {
            minDst = d;
            closest = { x: v.x, y: v.y, isCurrent: true };
          }
        });
      }
    }

    if (closest) {
      this.snappedPoint = closest;
      this.highlightCircle.setAttribute('cx', closest.x);
      this.highlightCircle.setAttribute('cy', closest.y);
      this.highlightCircle.style.display = 'block';
      this.highlightCircle.style.stroke = this.isCtrlDown
        ? '#ff4444'
        : '#00ffff';
    } else {
      this.hideHighlight();
    }
  }

  hideHighlight() {
    this.highlightCircle.style.display = 'none';
    this.snappedPoint = null;
    this.cursorTip.style.display = 'none';
  }

  moveVertex(vertexInfo, newPt) {
    const { pathIndex, pointIndex } = vertexInfo;
    const pathObj = this.drawnPaths[pathIndex];
    if (!pathObj) return;

    if (pathObj.type === 'curve') {
      const v = pathObj.instance.vertices[pointIndex];
      v.point = [newPt.x, newPt.y];
      const activeV = { curve: pathObj.instance, index: pointIndex };
      pathObj.instance.render(this.identityTransform, activeV);
    } else {
      pathObj.points[pointIndex].x = newPt.x;
      pathObj.points[pointIndex].y = newPt.y;
      this.refreshPathGeometry(pathObj);
    }

    this.highlightCircle.setAttribute('cx', newPt.x);
    this.highlightCircle.setAttribute('cy', newPt.y);
  }

  dropPoint() {
    if (this.editingPoint) {
      const pathObj = this.drawnPaths[this.editingPoint.pathIndex];
      if (pathObj && pathObj.type === 'arc') {
        // Re-calculate midpoint based on new geometry so the handle remains centered
        const p1 = pathObj.points[0];
        const p2 = pathObj.points[1];
        const p3 = pathObj.points[2];
        const newMid = Geometry.getArcMidpoint(p1, p2, p3);
        pathObj.points[2] = newMid;
        Geometry.refreshPathGeometry(pathObj);
      }
    }

    this.editingPoint = null;
    this.editStartPos = null;
    this.hideHighlight();
    this.updateUIState();
  }

  setupGlobalKeys() {
    const isCmd = (e) => e.key === 'Control' || e.key === 'Meta';
    const isUndo = (e) => isCmd(e) && e.key.toLowerCase() === 'z';

    window.addEventListener('keydown', (e) => {
      // Delegate to tool first
      if (
        this.currentToolInstance &&
        typeof this.currentToolInstance.onKeyDown === 'function'
      ) {
        this.currentToolInstance.onKeyDown(e);
      }

      if (e.repeat && !isUndo(e)) return;
      if (e.key === 'Escape') {
        if (this.isDrawing) this.stopDrawing();
        if (this.editingPoint) this.dropPoint();
        if (this.carriedElement) this.cancelCarry();
      }
      if (e.key === 'Shift') {
        this.isShiftDown = true;
        this.updateSnapping();
      }
      if (isCmd(e)) {
        this.isCtrlDown = true;
        this.updateSnapping();
      }
      if (e.key === ' ') {
        if (!this.isSpaceDown) {
          this.isSpaceDown = true;
          if (this.svgElement) this.svgElement.classList.add('panning');
        }
      }
      if (isUndo(e)) {
        e.preventDefault();
        this.performUndo();
      }
    });

    window.addEventListener('keyup', (e) => {
      // Delegate to tool first
      if (
        this.currentToolInstance &&
        typeof this.currentToolInstance.onKeyUp === 'function'
      ) {
        this.currentToolInstance.onKeyUp(e);
      }

      if (e.key === 'Shift') {
        this.isShiftDown = false;
        this.updateSnapping();
      }
      if (isCmd(e)) {
        this.isCtrlDown = false;
        this.updateSnapping();
      }
      if (e.key === ' ') {
        this.isSpaceDown = false;
        if (this.svgElement) this.svgElement.classList.remove('panning');
      }
    });
  }

  updateModeUI() {
    if (this.isCtrlDown) {
      this.modeLabel.textContent = this.editingPoint
        ? 'Editing: Click to Drop Point'
        : 'Edit Mode: Hover point, Click to Pick Up';
      this.modeLabel.classList.add('active');
    } else if (this.isShiftDown) {
      this.modeLabel.textContent = 'Snap Mode: Start/Continue from points';
      this.modeLabel.classList.add('active');
    } else {
      const tool = this.settings.toolMode;
      let msg = '';
      if (this.isDrawing) {
        if (tool === 'arc') msg = 'Drawing Arc...';
        else if (tool === 'polyarc')
          msg = 'Drawing PolyArc... (Use slider to bend)';
        else if (tool === 'curve')
          msg = 'Drawing Curve... (Click to add vertex)';
        else if (tool === 'image')
          msg = 'Placing Image... Click 2nd point to define size';
        msg += ' (Right click to stop)';
      } else {
        if (tool === 'image') {
          if (!this.pendingImage)
            msg = 'Image Mode: Choose file or Drag & Drop';
          else msg = 'Image Mode: Click to set first corner';
        } else {
          msg = 'Draw Mode: Click to start';
        }
      }
      this.modeLabel.textContent = msg;
      this.modeLabel.classList.remove('active');
    }
  }

  updateUIState() {
    this.modeLabel.className = 'mode-toast';
    const tool = this.settings.toolMode;
    if (this.carriedElement) {
      this.modeLabel.textContent = `${
        tool === 'copy' ? 'Copying' : 'Moving'
      }... Click to Drop (Shift: Snap)`;
      this.modeLabel.classList.add('edit-mode');
    } else if (this.editingPoint) {
      this.modeLabel.textContent = 'Moving Vertex... Click to Drop';
      this.modeLabel.classList.add('edit-mode');
    } else if (tool === 'move' || tool === 'copy') {
      this.modeLabel.textContent = `${
        tool === 'copy' ? 'Copy' : 'Move'
      }: Click element to grab (Shift snaps)`;
      this.modeLabel.classList.add('highlight');
    } else if (tool === 'delete') {
      this.modeLabel.textContent = 'Delete: Click element to remove';
      this.modeLabel.classList.add('edit-mode');
    } else if (this.isDrawing) {
      this.modeLabel.textContent =
        tool === 'arc'
          ? 'Drawing Arc...'
          : tool === 'curve'
          ? 'Drawing Curve...'
          : 'Drawing PolyArc...';
    } else {
      this.modeLabel.textContent =
        'Draw Mode | Shift: Snap | Ctrl: Edit Vertex';
    }

    if (this.snappedPoint) {
      this.cursorTip.style.display = 'block';
      this.cursorTip.setAttribute('x', this.snappedPoint.x + 30);
      this.cursorTip.setAttribute('y', this.snappedPoint.y - 15);
      this.cursorTip.textContent = this.isCtrlDown ? 'Pick' : 'Snap';
    } else {
      this.cursorTip.style.display = 'none';
    }
  }

  updateSettingsForActive() {
    if (this.isDrawing) {
      if (this.activeCurve) {
        // Apply settings to the active Curve
        this.activeCurve.pathElement.setAttribute(
          'stroke',
          this.settings.strokeColor
        );
        this.activeCurve.pathElement.setAttribute(
          'stroke-width',
          this.settings.strokeWidth
        );
      } else if (this.activeElement) {
        // Apply settings to standard SVG paths (Line, PolyArc, Arc)
        this.activeElement.setAttribute('stroke', this.settings.strokeColor);
        this.activeElement.setAttribute(
          'stroke-width',
          this.settings.strokeWidth
        );
        if (this.rubberBand) {
          this.rubberBand.setAttribute('stroke', this.settings.strokeColor);
          this.rubberBand.setAttribute(
            'stroke-width',
            this.settings.strokeWidth
          );
        }
      }
    }
  }

  performUndo() {
    if (this.editingPoint) {
      this.moveVertex(this.editingPoint, this.editStartPos);
      this.dropPoint();
      return;
    }

    if (this.isDrawing) {
      const tool = this.settings.toolMode;

      if (tool === 'curve' && this.activeCurve) {
        if (this.activeCurve.vertices.length > 0) {
          this.activeCurve.vertices.pop();
          this.activeCurve.vertexElements.pop().remove();

          if (this.activeCurve.vertices.length === 0) {
            this.stopDrawing(true);
          } else {
            const activeIdx = this.activeCurve.vertices.length - 1;
            this.activeCurve.render(this.identityTransform, {
              curve: this.activeCurve,
              index: activeIdx,
            });
          }
        }
        return;
      }

      if (this.currentPoints.length > 1) {
        this.currentPoints.pop();

        if (tool === 'arc') {
          if (this.currentPoints.length === 1) {
            if (this.arcChordGuide) {
              this.arcChordGuide.remove();
              this.arcChordGuide = null;
            }
            const p1 = this.currentPoints[0];
            if (this.rubberBand) {
              this.rubberBand.setAttribute(
                'd',
                `M ${p1.x} ${p1.y} L ${p1.x} ${p1.y}`
              );
            }
          }
        } else if (tool === 'polyarc') {
          if (this.currentPoints.length >= 1) {
            const pathData = this.buildPolyArcPath(this.currentPoints);
            this.activeElement.setAttribute('d', pathData);
          }
          if (this.currentMousePt) {
            this.updateRubberBand(this.currentMousePt);
          }
        }
      } else {
        this.stopDrawing(true);
      }
      return;
    }

    this.history.undo();
  }

  pushMoveAction(pathIndex, pointIndex, oldPos, newPos) {
    this.history.push({
      undo: () => {
        const pathObj = this.drawnPaths[pathIndex];
        if (!pathObj) return;
        pathObj.points[pointIndex] = { ...oldPos };
        this.refreshPathGeometry(pathObj);
      },
    });
  }

  pushCreateAction(pathObj) {
    this.history.push({
      undo: () => {
        pathObj.element.remove();
        const idx = this.drawnPaths.indexOf(pathObj);
        if (idx > -1) this.drawnPaths.splice(idx, 1);
      },
    });
  }

  updateRubberBand(target) {
    const tool = this.settings.toolMode;
    // Allow Line and PolyArc modes (which have no rubberBand element initially)
    if (!this.rubberBand && tool !== 'line' && tool !== 'polyarc') return;

    if (tool === 'line') {
      if (this.activeElement && this.currentPoints.length > 0) {
        const pts = this.currentPoints.map((p) => ({ ...p }));
        if (pts.length > 0) {
          pts[pts.length - 1].cornerRadius = this.settings.cornerRadius;
        }
        pts.push({ x: target.x, y: target.y, cornerRadius: 0 });
        const pathData = this.buildRoundedPath(pts, true);

        if (this.activeElement.tagName !== 'path') {
          const newActive = makeElement('svg:path', {
            className: 'drawing-path',
            stroke: this.settings.strokeColor,
            'stroke-width': this.settings.strokeWidth,
            fill: 'none',
          });
          this.activeElement.replaceWith(newActive);
          this.activeElement = newActive;
        }
        this.activeElement.setAttribute('d', pathData);
      }
    } else if (tool === 'polyarc') {
      if (this.activeElement && this.currentPoints.length > 0) {
        // Rebuild visual path with dynamic point
        const pts = [...this.currentPoints];

        // Add temp point with CURRENT slider angle
        pts.push({
          x: target.x,
          y: target.y,
          arcAngle: this.settings.arcAngle, // Use current slider value
        });

        const pathData = this.buildPolyArcPath(pts);
        this.activeElement.setAttribute('d', pathData);
      }
    } else {
      // Arc mode logic
      if (!this.rubberBand) return;

      if (this.currentPoints.length === 1) {
        const p1 = this.currentPoints[0];
        if (this.rubberBand.tagName !== 'path') {
          const newRubber = makeElement('svg:path', {
            className: 'rubber-band',
            stroke: this.settings.strokeColor,
            'stroke-width': this.settings.strokeWidth,
            fill: 'none',
          });
          this.rubberBand.replaceWith(newRubber);
          this.rubberBand = newRubber;
        }
        this.rubberBand.setAttribute(
          'd',
          `M ${p1.x} ${p1.y} L ${target.x} ${target.y}`
        );
      } else if (this.currentPoints.length === 2) {
        const p1 = this.currentPoints[0];
        const p2 = this.currentPoints[1];
        this.rubberBand.setAttribute(
          'd',
          Geometry.calculateArcPath(p1, p2, target)
        );
      }
    }
  }

  updateActiveShapeGeometry() {
    // This method is no longer needed since we update in updateRubberBand
    // But keep it for compatibility
    if (this.settings.toolMode === 'line' && this.currentMousePt) {
      this.updateRubberBand(this.currentMousePt);
    }
  }

  refreshPathGeometry(pathObj) {
    if (pathObj.type === 'line') {
      const ptsStr = pathObj.points.map((p) => `${p.x},${p.y}`).join(' ');
      pathObj.element.setAttribute('points', ptsStr);
    } else if (pathObj.type === 'rounded-line') {
      const pathData = this.buildRoundedPath(pathObj.points);
      pathObj.element.setAttribute('d', pathData);
    } else if (pathObj.type === 'polyarc') {
      const pathData = this.buildPolyArcPath(pathObj.points);
      pathObj.element.setAttribute('d', pathData);
    } else if (pathObj.type === 'arc' && pathObj.points.length === 3) {
      const d = this.calculateArcPath(
        pathObj.points[0],
        pathObj.points[1],
        pathObj.points[2]
      );
      pathObj.element.setAttribute('d', d);
    }
  }

  calculateArcPath(p1, p2, p3) {
    const val = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y);
    if (Math.abs(val) < 1e-4)
      return `M ${p1.x} ${p1.y} L ${p3.x} ${p3.y} L ${p2.x} ${p2.y}`;

    const m1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const m2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

    let k1 = (p2.y - p1.y) / (p2.x - p1.x);
    let k2 = (p3.y - p2.y) / (p3.x - p2.x);
    let cx, cy;

    if (!isFinite(k1)) {
      const m2k = -1 / k2;
      cx = (m1.y - m2.y + m2k * m2.x) / m2k;
      cy = m1.y;
    } else if (!isFinite(k2)) {
      const m1k = -1 / k1;
      cx = (m2.y - m1.y + m1k * m1.x) / m1k;
      cy = m2.y;
    } else {
      const m1k = -1 / k1;
      const m2k = -1 / k2;
      if (Math.abs(m1k - m2k) < 1e-5)
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
      cx = (m1k * m1.x - m2k * m2.x + m2.y - m1.y) / (m1k - m2k);
      cy = m1k * (cx - m1.x) + m1.y;
    }

    const r = Math.sqrt(Math.pow(p1.x - cx, 2) + Math.pow(p1.y - cy, 2));
    const ang1 = Math.atan2(p1.y - cy, p1.x - cx);
    const ang2 = Math.atan2(p2.y - cy, p2.x - cx);
    const ang3 = Math.atan2(p3.y - cy, p3.x - cx);

    const norm = (a) => (a + Math.PI * 2) % (Math.PI * 2);
    const t1 = norm(ang1);
    const t2 = norm(ang2);
    const t3 = norm(ang3);

    let sweepFlag = 0;
    if (t1 < t2) {
      if (t3 > t1 && t3 < t2) sweepFlag = 1;
    } else {
      if (t3 > t1 || t3 < t2) sweepFlag = 1;
    }

    let diff =
      sweepFlag === 1
        ? (t2 - t1 + Math.PI * 2) % (Math.PI * 2)
        : (t1 - t2 + Math.PI * 2) % (Math.PI * 2);
    const largeArcFlag = diff > Math.PI ? 1 : 0;

    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${p2.x} ${p2.y}`;
  }

  findAndHighlightElement(pt) {
    const threshold = 15; // Hit distance
    let closest = null;
    let minDist = Infinity;

    this.drawnPaths.forEach((pathObj) => {
      let dist = Infinity;

      if (pathObj.type === 'curve') {
        // Curve Hit Test: Check distance to vertices (simplified)
        // Ideally we check distance to Bezier path segments, but vertex proximity is okay for selection
        let nearVertex = false;
        for (const v of pathObj.instance.vertices) {
          const d = Math.hypot(pt.x - v.point[0], pt.y - v.point[1]);
          if (d < threshold) {
            nearVertex = true;
            break;
          }
        }
        if (nearVertex) dist = 0;
      } else if (
        pathObj.type === 'line' ||
        pathObj.type === 'rounded-line' ||
        pathObj.type === 'polyarc'
      ) {
        if (Geometry.isNearPolyline(pt, pathObj.points, threshold)) {
          dist = 0;
        }
      } else if (pathObj.type === 'arc') {
        if (Geometry.isNearArc(pt, pathObj.points, threshold)) {
          dist = 0;
        }
      } else if (pathObj.type === 'image') {
        if (Geometry.isNearPolyline(pt, pathObj.points, threshold)) {
          dist = 0;
        }
      }

      if (dist < minDist) {
        closest = pathObj;
        minDist = dist;
      }
    });

    if (closest) {
      if (this.hoveredElement !== closest) {
        if (this.hoveredElement) {
          if (this.hoveredElement.type === 'curve') {
            // Curve handles highlight via its pathElement
            this.hoveredElement.instance.pathElement.setAttribute(
              'stroke',
              this.settings.strokeColor
            ); // Reset
            this.hoveredElement.instance.pathElement.setAttribute(
              'stroke-width',
              this.settings.strokeWidth
            );
          } else {
            this.hoveredElement.element.classList.remove('highlighted');
            this.hoveredElement.element.style.strokeWidth = '';
          }
        }

        this.hoveredElement = closest;

        if (closest.type === 'curve') {
          // Specific Highlight for Curve
          closest.instance.pathElement.setAttribute('stroke', '#00ffff');
          // closest.instance.pathElement.setAttribute('stroke-width', parseInt(this.settings.strokeWidth) + 2);
        } else if (closest.type !== 'image') {
          this.hoveredElement.element.classList.add('highlighted');
          const currentW =
            this.hoveredElement.element.getAttribute('stroke-width') || 1;
          this.hoveredElement.element.style.strokeWidth =
            parseInt(currentW) + 4 + 'px';
        }
      }
    } else {
      if (this.hoveredElement) {
        if (this.hoveredElement.type === 'curve') {
          this.hoveredElement.instance.pathElement.setAttribute(
            'stroke',
            this.settings.strokeColor
          );
          this.hoveredElement.instance.pathElement.setAttribute(
            'stroke-width',
            this.settings.strokeWidth
          );
        } else {
          this.hoveredElement.element.classList.remove('highlighted');
          this.hoveredElement.element.style.strokeWidth = '';
        }
        this.hoveredElement = null;
      }
    }
  }

  pickupElement(pathObj, pt) {
    let grip = { x: pt.x, y: pt.y };
    if (this.isShiftDown) {
      if (pathObj.type === 'curve') {
        let closestV = null;
        let minD = Infinity;
        pathObj.instance.vertices.forEach((v) => {
          const d = Math.hypot(pt.x - v.point[0], pt.y - v.point[1]);
          if (d < minD) {
            minD = d;
            closestV = v;
          }
        });
        if (closestV && minD < 50)
          grip = { x: closestV.point[0], y: closestV.point[1] };
      } else {
        let closestV = null;
        let minD = Infinity;
        pathObj.points.forEach((v) => {
          const d = Geometry.distance(pt, v);
          if (d < minD) {
            minD = d;
            closestV = v;
          }
        });
        if (closestV && minD < 50) grip = { ...closestV };
      }
    }

    this.carryOrigin = grip;

    if (pathObj.type === 'curve') {
      const curve = pathObj.instance;
      this.originalPathData = {
        vertices: curve.vertices
          .map((v) => [
            [...v.point],
            { cp0: [...v.controlPoints[0]], cp1: [...v.controlPoints[1]] },
          ])
          .map((d) => Object.assign(d[0], d[1])),
      };
    } else {
      this.originalPathData = { points: pathObj.points.map((p) => ({ ...p })) };
    }

    if (this.settings.toolMode === 'copy') {
      if (pathObj.type === 'curve') {
        const oldCurve = pathObj.instance;
        const newCurve = new Curve(this.pathsGroup);
        oldCurve.vertices.forEach((v) => {
          newCurve.addVertex(v.point.slice(), {
            curvature: v.curvature,
            balance: v.balance,
            tangentAngleOffset: v.tangentAngleOffset,
          });
        });
        newCurve.render(this.identityTransform);
        const newObj = {
          type: 'curve',
          instance: newCurve,
          element: newCurve.group,
        };
        this.drawnPaths.push(newObj);
        this.carriedElement = newObj;
      } else {
        const newPoints = pathObj.points.map((p) => ({ ...p }));
        const newEl = pathObj.element.cloneNode(true);
        newEl.classList.remove('highlighted');
        newEl.style.strokeWidth = '';
        this.pathsGroup.appendChild(newEl);
        const newObj = {
          element: newEl,
          type: pathObj.type,
          points: newPoints,
        };
        this.drawnPaths.push(newObj);
        this.carriedElement = newObj;
      }
    } else {
      this.carriedElement = pathObj;
    }
    this.updateUIState();
  }

  dropCarriedElement() {
    // Commit logic
    const pathObj = this.carriedElement;
    const isCopy = this.settings.toolMode === 'copy';

    if (isCopy) {
      this.pushCreateAction(pathObj);
    } else {
      // Move
      const oldPts = this.originalPathData.points;
      const newPts = pathObj.points.map((p) => ({ ...p }));
      const idx = this.drawnPaths.indexOf(pathObj);
      // Create Undo for the whole path move
      this.history.push({
        undo: () => {
          const obj = this.drawnPaths[idx];
          if (!obj) return;
          obj.points = oldPts.map((p) => ({ ...p }));
          // Fix: Use this.refreshPathGeometry for undoing moves on rounded lines
          this.refreshPathGeometry(obj);
        },
      });
    }

    // Reset styles
    if (this.hoveredElement) {
      this.hoveredElement.element.classList.remove('highlighted');
      this.hoveredElement.element.style.strokeWidth = '';
    }

    this.carriedElement = null;
    this.carryOrigin = null;
    this.originalPathData = null;
    this.hoveredElement = null;
    this.updateUIState();
  }

  cancelCarry() {
    if (!this.carriedElement) return;

    if (this.settings.toolMode === 'copy') {
      // Just remove the clone
      this.carriedElement.element.remove();
      this.drawnPaths.pop(); // Remove from array
    } else {
      // Revert move
      const orig = this.originalPathData.points;
      this.carriedElement.points = orig.map((p) => ({ ...p }));
      // Fix: Use this.refreshPathGeometry
      this.refreshPathGeometry(this.carriedElement);
      this.carriedElement.element.classList.remove('highlighted');
      this.carriedElement.element.style.strokeWidth = '';
    }

    this.carriedElement = null;
    this.hoveredElement = null;
    this.updateUIState();
  }

  deleteElement(pathObj) {
    if (pathObj.type === 'curve') {
      pathObj.instance.group.remove();
    } else {
      pathObj.element.remove();
    }

    const idx = this.drawnPaths.indexOf(pathObj);
    if (idx > -1) {
      this.drawnPaths.splice(idx, 1);
      this.hoveredElement = null; // Clear ref

      this.history.push({
        undo: () => {
          if (pathObj.type === 'curve') {
            this.pathsGroup.appendChild(pathObj.instance.group);
          } else {
            this.pathsGroup.appendChild(pathObj.element);
          }
          this.drawnPaths.splice(idx, 0, pathObj);
        },
      });
    }
  }

  updateZoom() {
    if (this.zoomGroup) {
      this.zoomGroup.setAttribute(
        'transform',
        `scale(${this.zoom}) translate(${this.panX},${this.panY})`
      );
    }
    const pct = Math.round(this.zoom * 100);
    this.drawingDialog.setTitle(`Drawing Panel - ${pct}%`);
  }

  handleWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    const oldZoom = this.zoom;
    const newZoom = Math.max(0.1, Math.min(20, oldZoom * factor));

    if (newZoom === oldZoom) return;

    // pt is now in World Coordinates
    const pt = this.getSvgPoint(e);

    // We want the World Point 'pt' to remain at the same Screen/ViewBox location.
    // ViewBox = oldZoom * (pt + oldPan)
    // ViewBox = newZoom * (pt + newPan)
    // Therefore: newPan = (oldZoom / newZoom) * (pt + oldPan) - pt

    const ratio = oldZoom / newZoom;

    this.panX = this.panX * ratio + pt.x * (ratio - 1);
    this.panY = this.panY * ratio + pt.y * (ratio - 1);

    this.zoom = newZoom;
    this.updateZoom();
  }

  computeArcCenter(p1, vertex, p3, r) {
    // Vector from vertex to p1
    const toP1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const lenToP1 = Math.hypot(toP1.x, toP1.y);
    if (lenToP1 < 1e-6) return null;

    // Vector from vertex to p3
    const toP3 = { x: p3.x - vertex.x, y: p3.y - vertex.y };
    const lenToP3 = Math.hypot(toP3.x, toP3.y);
    if (lenToP3 < 1e-6) return null;

    // Unit vectors
    const unitP1 = { x: toP1.x / lenToP1, y: toP1.y / lenToP1 };
    const unitP3 = { x: toP3.x / lenToP3, y: toP3.y / lenToP3 };

    // Perpendicular vectors (rotate 90° CCW for offset toward the other line)
    // For line P1-P2: perpendicular pointing toward P3 side
    const perpP1 = { x: -unitP1.y, y: unitP1.x };

    // For line P2-P3: perpendicular pointing toward P1 side
    const perpP3 = { x: -unitP3.y, y: unitP3.x };

    // Check which side P3 is relative to P1-P2 line
    const cross1 = toP1.x * toP3.y - toP1.y * toP3.x;

    // Flip perpendicular if needed so it points toward the correct side
    if (cross1 < 0) {
      perpP1.x = -perpP1.x;
      perpP1.y = -perpP1.y;
    }

    // For the P2-P3 line, flip to point toward P1
    if (cross1 > 0) {
      perpP3.x = -perpP3.x;
      perpP3.y = -perpP3.y;
    }

    // Offset line 1: starts at vertex, goes in direction of unitP1, offset by r * perpP1
    const offset1Start = {
      x: vertex.x + r * perpP1.x,
      y: vertex.y + r * perpP1.y,
    };
    const offset1Dir = unitP1;

    // Offset line 2: starts at vertex, goes in direction of unitP3, offset by r * perpP3
    const offset2Start = {
      x: vertex.x + r * perpP3.x,
      y: vertex.y + r * perpP3.y,
    };
    const offset2Dir = unitP3;

    // Find intersection of the two offset lines
    // Line 1: offset1Start + t * offset1Dir
    // Line 2: offset2Start + s * offset2Dir
    // Solve: offset1Start + t * offset1Dir = offset2Start + s * offset2Dir

    const dx = offset2Start.x - offset1Start.x;
    const dy = offset2Start.y - offset1Start.y;

    const det = offset1Dir.x * offset2Dir.y - offset1Dir.y * offset2Dir.x;
    if (Math.abs(det) < 1e-6) return null; // Lines are parallel

    const t = (dx * offset2Dir.y - dy * offset2Dir.x) / det;

    const center = {
      x: offset1Start.x + t * offset1Dir.x,
      y: offset1Start.y + t * offset1Dir.y,
    };

    // Now project center onto the two line segments to get start and end points
    // For P1-P2 line: project center perpendicular onto this line
    const vecP1P2 = { x: vertex.x - p1.x, y: vertex.y - p1.y };
    const lenP1P2 = Math.hypot(vecP1P2.x, vecP1P2.y);

    const vecCenterFromP1 = { x: center.x - p1.x, y: center.y - p1.y };
    const dotP1 =
      (vecCenterFromP1.x * vecP1P2.x + vecCenterFromP1.y * vecP1P2.y) /
      (lenP1P2 * lenP1P2);

    const startPt = {
      x: p1.x + dotP1 * vecP1P2.x,
      y: p1.y + dotP1 * vecP1P2.y,
    };

    // For P2-P3 line: project center perpendicular onto this line
    const vecP2P3 = { x: p3.x - vertex.x, y: p3.y - vertex.y };
    const lenP2P3 = Math.hypot(vecP2P3.x, vecP2P3.y);

    const vecCenterFromP2 = { x: center.x - vertex.x, y: center.y - vertex.y };
    const dotP3 =
      (vecCenterFromP2.x * vecP2P3.x + vecCenterFromP2.y * vecP2P3.y) /
      (lenP2P3 * lenP2P3);

    const endPt = {
      x: vertex.x + dotP3 * vecP2P3.x,
      y: vertex.y + dotP3 * vecP2P3.y,
    };

    // Project from center toward vertex by radius to get midpoint
    const vecToVertex = { x: vertex.x - center.x, y: vertex.y - center.y };
    const distToVertex = Math.hypot(vecToVertex.x, vecToVertex.y);
    if (distToVertex < 1e-6) return null;

    const unitToVertex = {
      x: vecToVertex.x / distToVertex,
      y: vecToVertex.y / distToVertex,
    };

    const midPt = {
      x: center.x + unitToVertex.x * r,
      y: center.y + unitToVertex.y * r,
    };

    return {
      center,
      startPt,
      endPt,
      midPt,
      unitBis: unitToVertex,
      lenIn: lenToP1,
      lenOut: lenToP3,
    };
  }

  createColorSwatch(label, initialColor, callback) {
    const swatch = makeElement('div', {
      className: 'color-swatch',
      style: { backgroundColor: initialColor },
    });
    swatch.__colorCallback__ = callback;
    swatch.onclick = (e) => {
      e.stopPropagation();
      this.colorPicker.openSmartPicker(
        swatch,
        swatch.style.backgroundColor,
        (newColor) => {
          swatch.style.backgroundColor = newColor;
          callback(newColor);
          // Fixed: Removed the loop that was forcing all existing paths to change color
        }
      );
    };
    return makeElement('div', { className: 'setting-row' }, [
      makeElement('div', { className: 'setting-label' }, label),
      swatch,
    ]);
  }

  buildPolyArcPath(points) {
    // Decide if we should draw debug info (only during active PolyArc drawing)
    const isDebug = this.isDrawing && this.settings.toolMode === 'polyarc';

    if (isDebug && this.cornerCentersGroup) {
      this.cornerCentersGroup.innerHTML = '';
    }

    if (points.length < 2) return '';

    let pathData = `M ${points[0].x} ${points[0].y}`;

    if (isDebug) {
      this.debugPoint(points[0].x, points[0].y, 'P0');
    }

    let currentStart = points[0];

    for (let i = 1; i < points.length; i++) {
      const p_prev = points[i - 1];
      const p_curr = points[i];

      // This is the segment ending at p_curr.
      // Properties (angle) are stored on p_curr.
      const angle = p_curr.arcAngle || 0;

      // DEBUG: Draw the full circle geometry for this segment
      if (isDebug) {
        const fullGeo = Geometry.getArcGeo(p_prev, p_curr, angle);
        this.debugPoint(p_curr.x, p_curr.y, `P${i}`);

        if (fullGeo.type === 'arc') {
          // Draw the full circle of the arc segment
          this.debugCircle(
            fullGeo.cx,
            fullGeo.cy,
            fullGeo.r,
            'rgba(0, 255, 255, 0.4)',
            `Seg${i}`
          );
          this.debugPoint(fullGeo.cx, fullGeo.cy, `C${i}`);
        }
      }

      // Check if we need to fillet at p_curr (connecting to next segment)
      let fillet = null;
      if (i < points.length - 1) {
        const p_next = points[i + 1];
        const r = p_curr.cornerRadius || 0;
        const angleNext = p_next.arcAngle || 0;

        if (r > 0) {
          fillet = Geometry.solveCorner(
            p_prev,
            p_curr,
            p_next,
            angle,
            angleNext,
            r
          );
        }
      }

      // DEBUG: Draw fillet construction
      if (isDebug && fillet) {
        this.debugCircle(
          fillet.center.x,
          fillet.center.y,
          fillet.radius,
          'rgba(255, 0, 255, 0.6)',
          `Fillet${i}`
        );
        this.debugPoint(fillet.center.x, fillet.center.y, `FC${i}`);
        this.debugPoint(fillet.startPt.x, fillet.startPt.y, `FS${i}`);
        this.debugPoint(fillet.endPt.x, fillet.endPt.y, `FE${i}`);
      }

      // Determine draw target for this segment
      // If we have a fillet at the end of this segment (at p_curr), we draw to fillet.startPt
      // If not, we draw to p_curr

      let segmentEnd = p_curr;
      if (fillet) {
        segmentEnd = fillet.startPt;
      }

      // Draw the main segment (from currentStart to segmentEnd)
      // Note: The segment geometry (Line vs Arc) is defined by 'angle'.
      // However, we are drawing a sub-segment of the original full segment (p_prev -> p_curr).
      // If it's a Line, it's just a line to segmentEnd.
      // If it's an Arc, we must trace the arc from currentStart to segmentEnd along the original path.
      // Since currentStart and segmentEnd are ON the original arc, and we know the original radius/center,
      // we can just issue an Arc command.

      if (Math.abs(angle) < 1) {
        pathData += ` L ${segmentEnd.x} ${segmentEnd.y}`;
      } else {
        // It's an arc.
        // We need the geometric props of the ORIGINAL full segment to know R and sweep.
        // But 'getArcCommand' recalculates R based on chord length.
        // If we shorten the chord, we must NOT recalculate R based on the new chord length
        // assuming the same angle, because the angle changes!
        // We must use the Fixed Radius and Fixed Center of the original segment.

        const fullGeo = Geometry.getArcGeo(p_prev, p_curr, angle);

        // We draw from currentStart -> segmentEnd.
        // Radius is fullGeo.r. Sweep is fullGeo.sweep.
        // Large Arc Flag?
        // We need to check the angle swept by the sub-segment.
        // Usually for corner rounding it's small, so 0.
        // But to be safe... actually for PolyArc tool angles are usually < 180 per segment.
        // Sub-segment is definitely < 180.

        pathData += ` A ${fullGeo.r.toFixed(2)} ${fullGeo.r.toFixed(2)} 0 0 ${
          fullGeo.sweep
        } ${segmentEnd.x} ${segmentEnd.y}`;
      }

      // If fillet exists, draw the fillet
      if (fillet) {
        pathData += ` A ${fillet.radius.toFixed(2)} ${fillet.radius.toFixed(
          2
        )} 0 0 ${fillet.sweep} ${fillet.endPt.x} ${fillet.endPt.y}`;

        // Next segment will start from fillet end
        currentStart = fillet.endPt;

        // We effectively skip the processing of the 'start' of the next loop iteration
        // because the loop handles "Draw from currentStart to segmentEnd".
        // So we just update currentStart.
      } else {
        currentStart = p_curr;
      }
    }

    return pathData;
  }

  debugPoint(x, y, label) {
    if (!this.cornerCentersGroup) return;
    const pt = makeElement('svg:circle', {
      cx: x,
      cy: y,
      r: 2,
      fill: '#ffff00',
      stroke: 'none',
    });
    this.cornerCentersGroup.appendChild(pt);

    if (label) {
      const txt = makeElement(
        'svg:text',
        {
          x: x + 4,
          y: y - 4,
          fill: '#ffff00',
          'font-size': '10px',
          'font-family': 'monospace',
          'pointer-events': 'none',
          style: { textShadow: '0 0 2px black' },
        },
        label
      );
      this.cornerCentersGroup.appendChild(txt);
    }
  }

  debugCircle(cx, cy, r, color, label) {
    if (!this.cornerCentersGroup) return;
    const c = makeElement('svg:circle', {
      cx: cx,
      cy: cy,
      r: r,
      fill: 'none',
      stroke: color,
      'stroke-width': 1,
      'stroke-dasharray': '3 3',
      opacity: 0.6,
    });
    this.cornerCentersGroup.appendChild(c);

    if (label) {
      const txt = makeElement(
        'svg:text',
        {
          x: cx,
          y: cy - r - 2,
          fill: color,
          'font-size': '9px',
          'text-anchor': 'middle',
          'font-family': 'monospace',
          style: { textShadow: '0 0 2px black' },
        },
        label
      );
      this.cornerCentersGroup.appendChild(txt);
    }
  }

  handleImageFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.pendingImage = img;
        this.imageAspectRatio = img.width / img.height;

        // Update Preview UI
        this.imagePreviewEl.innerHTML = '';
        const thumb = makeElement('img', {
          src: img.src,
          className: 'image-thumb',
        });
        this.imagePreviewEl.appendChild(thumb);
        this.imagePreviewEl.classList.add('active');

        this.updateUIState();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateImagePreview(mousePt) {
    if (!this.tempGroup || !this.imageStartPoint || !this.pendingImage) return;
    this.tempGroup.innerHTML = '';

    // 1. Calculate dimensions based on Mouse vs Start
    const rawW = mousePt.x - this.imageStartPoint.x;
    const rawH = mousePt.y - this.imageStartPoint.y;

    // Determine primary direction of drag to decide constraint
    let w, h;
    const ratio = this.imageAspectRatio;

    // If dragging wider than tall (relative to aspect), base on width
    if (Math.abs(rawW / rawH) > ratio) {
      w = rawW;
      h = rawW / ratio;
      // Fix direction flip if H goes opposite way of mouse
      if (Math.sign(h) !== Math.sign(rawH)) h = -h;
    } else {
      h = rawH;
      w = rawH * ratio;
      if (Math.sign(w) !== Math.sign(rawW)) w = -w;
    }

    const x = w > 0 ? this.imageStartPoint.x : this.imageStartPoint.x + w;
    const y = h > 0 ? this.imageStartPoint.y : this.imageStartPoint.y + h;
    const absW = Math.abs(w);
    const absH = Math.abs(h);
    const endPoint = {
      x: this.imageStartPoint.x + w,
      y: this.imageStartPoint.y + h,
    };

    // 2. Dashed Line (Start to Calculated Corner) - actually prompt says Mouse to Determined Point.
    // The "Determined Point" is the corner of the image box that the mouse is dragging.
    // The "Mouse Point" is the cursor.
    // One coord matches, the other is constrained.

    const dashLine = makeElement('svg:line', {
      x1: mousePt.x,
      y1: mousePt.y,
      x2: endPoint.x,
      y2: endPoint.y,
      stroke: '#fff',
      'stroke-width': 1,
      'stroke-dasharray': '5 5',
    });
    this.tempGroup.appendChild(dashLine);

    // 3. Ghost Image Container
    const ghost = makeElement('svg:rect', {
      x: x,
      y: y,
      width: absW,
      height: absH,
      fill: 'none',
      stroke: '#00ff00',
      'stroke-width': 2,
      'stroke-dasharray': '2 2',
    });
    this.tempGroup.appendChild(ghost);

    // 4. Actual ghost image (50% opacity)
    const fo = makeElement('svg:foreignObject', {
      x: x,
      y: y,
      width: absW,
      height: absH,
      style: { opacity: '0.5', pointerEvents: 'none' },
    });

    // We can just use an img tag for preview speed
    const imgPreview = this.pendingImage.cloneNode();
    imgPreview.style.width = '100%';
    imgPreview.style.height = '100%';
    fo.appendChild(imgPreview);
    this.tempGroup.appendChild(fo);

    // Store calculated box for finalization
    this.imageGhostBox = { x, y, w: absW, h: absH };
  }

  finalizeImagePlacement(mousePt) {
    if (!this.imageGhostBox) return; // Should have been updated by move

    const { x, y, w, h } = this.imageGhostBox;

    // Create final Structure
    // <foreignObject>
    //    <canvas width="..." height="...">
    // </foreignObject>

    const fo = makeElement('svg:foreignObject', {
      x,
      y,
      width: w,
      height: h,
      class: 'drawing-image',
      style: { overflow: 'visible' }, // Ensure contents don't clip weirdly if slightly off
    });

    const canvas = makeElement('canvas', {
      width: this.pendingImage.width,
      height: this.pendingImage.height,
      style: {
        width: '100%',
        height: '100%',
        display: 'block',
      },
    });

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.pendingImage, 0, 0);

    fo.appendChild(canvas);

    // "Insert... lower layer than all curves"
    // pathsGroup contains all drawing paths. We prepend to put it at the bottom of that stack.
    if (this.pathsGroup.firstChild) {
      this.pathsGroup.insertBefore(fo, this.pathsGroup.firstChild);
    } else {
      this.pathsGroup.appendChild(fo);
    }

    // Register as object for history/selection/deletion
    const pathObj = {
      element: fo,
      type: 'image',
      points: [
        { x: x, y: y }, // Top Left
        { x: x + w, y: y }, // Top Right
        { x: x + w, y: y + h }, // Bottom Right
        { x: x, y: y + h }, // Bottom Left
      ],
      // Note: 'points' for image allows `findAndHighlight` to treat it like a polyline rect
      // for hit testing if we update geometry logic, or we treat it specially.
    };

    this.drawnPaths.push(pathObj);
    this.pushCreateAction(pathObj);

    // Reset Image State
    this.imageStartPoint = null;
    this.imageGhostBox = null;
    this.tempGroup.innerHTML = '';
    this.isDrawing = false;

    // Keep pending image for multiple stamps? Or clear?
    // Usually cleaner to keep it until user changes tool or file.
  }

  updateActiveCurveParams() {
    // 1. Drawing Mode: Update the last placed vertex
    if (
      this.isDrawing &&
      this.settings.toolMode === 'curve' &&
      this.activeCurve
    ) {
      const vertices = this.activeCurve.vertices;
      if (vertices.length > 0) {
        const lastV = vertices[vertices.length - 1];
        lastV.curvature = this.curveParams.curvature;
        lastV.balance = this.curveParams.balance;

        // Re-render including the ephemeral segment to mouse
        if (this.currentMousePt) {
          const activeIdx = vertices.length - 1;
          const activeV = { curve: this.activeCurve, index: activeIdx };
          this.activeCurve.render(this.identityTransform, activeV, null, [
            this.currentMousePt.x,
            this.currentMousePt.y,
          ]);
        } else {
          this.activeCurve.render(this.identityTransform);
        }
      }
    }
    // 2. Edit Mode: Update the selected vertex
    else if (this.editingPoint) {
      const pathObj = this.drawnPaths[this.editingPoint.pathIndex];
      if (pathObj && pathObj.type === 'curve') {
        const v = pathObj.instance.vertices[this.editingPoint.pointIndex];
        v.curvature = this.curveParams.curvature;
        v.balance = this.curveParams.balance;

        const activeV = {
          curve: pathObj.instance,
          index: this.editingPoint.pointIndex,
        };
        pathObj.instance.render(this.identityTransform, activeV);
      }
    }
  }

  updateConstructionVisuals() {
    const c = this.settings.construction || {};

    // Set CSS variables on the SVG container
    this.svgElement.style.setProperty(
      '--const-opacity',
      c.visible ? c.opacity : 0
    );
    this.svgElement.style.setProperty('--const-width', `${c.lineWidth}px`);
    this.svgElement.style.setProperty('--const-label-size', `${c.labelSize}px`);

    // Manage visibility classes for "Active Only" logic
    if (c.activeOnly) {
      this.pathsGroup.classList.add('active-only-construction');
    } else {
      this.pathsGroup.classList.remove('active-only-construction');
    }

    if (!c.visible) {
      this.pathsGroup.classList.add('hide-all-construction');
    } else {
      this.pathsGroup.classList.remove('hide-all-construction');
    }

    // Identify the active curve group in DOM if needed
    // We do this by ensuring when activeCurve changes, we toggle a class on the group
    if (this.activeCurve && this.activeCurve.group) {
      // First clear others
      this.drawnPaths.forEach((p) => {
        if (p.type === 'curve' && p.instance.group) {
          p.instance.group.classList.remove('active-curve');
        }
      });
      this.activeCurve.group.classList.add('active-curve');
    }
  }

  async run(env) {
      if (this.rootElement) {
        this.destroy();
      }
      this.env = env;
      const parentElement = env.container;

      if (parentElement === document.body) {
        document.documentElement.style.height = '100%';
        document.documentElement.style.width = '100%';
        document.documentElement.style.margin = '0';
        document.body.style.height = '100%';
        document.body.style.width = '100%';
        document.body.style.margin = '0';
      }

      parentElement.style.position = 'relative';
      parentElement.style.width = '100%';
      parentElement.style.height = '100%';
      parentElement.style.margin = '0';
      parentElement.style.padding = '0';
      parentElement.style.overflow = 'hidden';
      parentElement.style.background = '#222';

      this.rootElement = parentElement;
      this.init(parentElement);

      return this;
    }

  destroy() {
      if (this.drawingDialog && typeof this.drawingDialog.close === 'function') {
        this.drawingDialog.close();
      }
      if (this.settingsDialog && typeof this.settingsDialog.close === 'function') {
        this.settingsDialog.close();
      }
      if (this.configuredBoxes) {
        this.configuredBoxes.forEach(b => {
          if (typeof b.close === 'function') b.close();
        });
      }
      this.configuredBoxes = [];
      if (this.rootElement) {
        this.rootElement.innerHTML = '';
        this.rootElement = null;
      }
    }

}

