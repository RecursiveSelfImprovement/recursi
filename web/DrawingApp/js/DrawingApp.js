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
      console.log('[DrawingApp] Debug P2PConnector load state:', typeof P2PConnector);
      console.log('[DrawingApp] Debug SidePanel load state:', typeof SidePanel);

      targetElement.innerHTML = '';
      this.drawnPaths = [];

      if (!this.history || typeof this.history.clear !== 'function') {
        this.history = new DrawingHistory();
      }
      this.history.clear();

      if (!this.colorPicker) {
        this.colorPicker = new ColorPicker();
      }

      this.loadSettings();
      this.injectStyles();

      // Create AccuCAD style layout wrapper
      const layoutWrapper = document.createElement('div');
      layoutWrapper.id = 'drawing-app-layout-wrapper';
      layoutWrapper.style.cssText = 'display: flex; flex-direction: row; width: 100%; height: 100%; overflow: hidden; position: relative;';
      targetElement.appendChild(layoutWrapper);
      this.layoutWrapper = layoutWrapper;

      // Instantiate SidePanel passing a structured environment object
      if (typeof SidePanel !== 'undefined') {
        const sidePanelEnv = { container: layoutWrapper };
        this.sidePanel = new SidePanel('left', 260, sidePanelEnv);
        this.sidePanel.toolSettingsSection = this.sidePanel.addSection('setup', 'Tool Settings', true);
        this.sidePanel.p2pSection = this.sidePanel.addSection('p2p', 'Controller', false);
        
        // Explicitly open the sidebar on startup for DrawingApp
        this.sidePanel.open();
      }

      // Create canvas container next to SidePanel
      const canvasContainer = document.createElement('div');
      canvasContainer.id = 'drawing-canvas-container';
      canvasContainer.style.cssText = 'flex-grow: 1; height: 100%; position: relative; overflow: hidden;';
      layoutWrapper.appendChild(canvasContainer);
      this.canvasContainer = canvasContainer;

      // Initialize workspace/canvas and sidebar settings
      this.createDrawingInterface(canvasContainer);
      this.createSettingsInterface();
      this.setupGlobalKeys();

      // Setup P2PConnector inside sidebar layout with strict safety checks
      if (typeof P2PConnector !== 'undefined') {
        this.p2pConnector = new P2PConnector(this);
        if (this.sidePanel && this.sidePanel.p2pSection) {
          console.log('[DrawingApp] Appending P2P Controller controls to side panel');
          this.p2pConnector.renderControls(this.sidePanel.p2pSection);
          
          // AUTO LAUNCH HOST CONNECTION ON STARTUP (frictionless experience)
          const savedRoom = localStorage.getItem('drawing-app-p2p-room') || '7777';
          this.p2pConnector.startWirelessHost(savedRoom, this.p2pConnector.statusLabel);
        } else {
          console.warn('[DrawingApp] p2pSection container was missing during load');
        }
      } else {
        console.warn('[DrawingApp] P2PConnector class was not defined at runtime');
      }

      // Check for saved mappings or auto-enable MIDI if persistent
      const savedMappings = localStorage.getItem('drawingAppMidiMappings_v1');
      const midiEnabled = localStorage.getItem('midi-controller-enabled') === 'true';
      if (midiEnabled || savedMappings) {
        try {
          if (!this.midiMapper) {
            this.midiMapper = new MidiMapper(
              this.sidePanel ? this.sidePanel.toolSettingsSection : this.settingsDialog.contentElement,
              this
            );
          }
          if (midiEnabled) {
            this.midiMapper.activate();
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
      /* --- Dynamic Sidebar CAD Styling (Scoped specifically to DrawingApp - Targeting .yt-side-panel) --- */
      #drawing-app-layout-wrapper .yt-side-panel {
        background: rgba(18, 18, 18, 0.96) !important;
        border-right: 1.5px solid rgba(255, 255, 255, 0.05) !important;
      }
      
      #drawing-app-layout-wrapper .yt-side-panel div:first-child {
        padding: 12px 14px !important;
        background: #141416 !important;
        border-bottom: 1.5px solid rgba(255, 255, 255, 0.06) !important;
      }

      #drawing-app-layout-wrapper details {
        background: #1c1c1f !important;
        border: 1.2px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 6px !important;
        overflow: hidden !important;
        transition: all 0.2s ease !important;
        display: block !important;
        margin-bottom: 8px !important;
      }

      #drawing-app-layout-wrapper summary {
        padding: 10px 12px !important;
        font-family: sans-serif !important;
        font-size: 11px !important;
        font-weight: bold !important;
        color: #aaa !important;
        cursor: pointer !important;
        user-select: none !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        background: #232328 !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.02) !important;
        outline: none !important;
      }

      #drawing-app-layout-wrapper summary:hover {
        background: #2a2a30 !important;
        color: #fff !important;
      }

      /* Hide native summary disclosure markers inside DrawingApp side panel */
      #drawing-app-layout-wrapper details summary::-webkit-details-marker {
        display: none !important;
      }
      #drawing-app-layout-wrapper details summary {
        list-style: none !important;
        outline: none !important;
      }

      /* Custom caret symbols on summary headers */
      #drawing-app-layout-wrapper summary::after {
        content: '▼' !important;
        font-size: 8px !important;
        color: #555 !important;
        transition: transform 0.2s ease !important;
        display: inline-block !important;
      }

      #drawing-app-layout-wrapper details[open] summary::after {
        transform: rotate(-180deg) !important;
        color: #00ff66 !important;
      }

      #drawing-app-layout-wrapper details > div {
        padding: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
        opacity: 0 !important;
        background: #141416 !important;
      }

      #drawing-app-layout-wrapper details[open] > div {
        padding: 10px !important;
        height: auto !important;
        opacity: 1 !important;
        overflow: visible !important;
        border-top: 1px solid rgba(255, 255, 255, 0.03) !important;
      }

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

      .setting-row { 
        margin-bottom: 15px; 
        display: flex; 
        flex-direction: column; 
        gap: 6px; 
      }
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
      
      .construction-line {
          stroke: #95a5a6;
          stroke-width: var(--const-width, 1px);
          opacity: var(--const-opacity, 0.5);
          stroke-dasharray: 4,2;
          vector-effect: non-scaling-stroke;
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
      
      .hide-all-construction .curve-group .controls,
      .hide-all-construction .curve-group .construction-label { 
          display: none !important; 
      }
      
      .active-only-construction .curve-group:not(.active-curve) .controls,
      .active-only-construction .curve-group:not(.active-curve) .construction-label {
          display: none !important;
      }

      .drawing-surface.panning { cursor: grab !important; }
      .drawing-surface.panning:active { cursor: grabbing !important; }

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

  createDrawingInterface(canvasContainer) {
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

      // Append directly to our adjacent canvas layout container rather than a pop-up window
      canvasContainer.appendChild(wrapper);
      this.canvasWrapper = wrapper;
      this.updateZoom();
    }

  createSettingsInterface() {
      // Re-routed completely to our dynamic renderToolSettings engine
      this.renderToolSettings();
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
      if (this.drawingDialog && typeof this.drawingDialog.setTitle === 'function') {
        this.drawingDialog.setTitle(`Drawing Panel - ${pct}%`);
      }
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
      const curvature = this.curveParams?.curvature !== undefined ? this.curveParams.curvature : 1.0;
      const balance = this.curveParams?.balance !== undefined ? this.curveParams.balance : 1.0;
      const tangencyDeg = this.toolSliders && this.toolSliders['tangency'] ? this.toolSliders['tangency'].value : 0;
      const tangencyRad = tangencyDeg * (Math.PI / 180);

      if (this.isDrawing && this.settings.toolMode === 'curve' && this.activeCurve) {
        const vertices = this.activeCurve.vertices;
        if (vertices.length > 0) {
          const lastV = vertices[vertices.length - 1];
          lastV.curvature = curvature;
          lastV.balance = balance;
          lastV.tangentAngleOffset = tangencyRad;

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
      } else if (this.editingPoint) {
        const pathObj = this.drawnPaths[this.editingPoint.pathIndex];
        if (pathObj && pathObj.type === 'curve') {
          const v = pathObj.instance.vertices[this.editingPoint.pointIndex];
          v.curvature = curvature;
          v.balance = balance;
          v.tangentAngleOffset = tangencyRad;

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
      if (this.sidePanel && typeof this.sidePanel.destroy === 'function') {
        try { this.sidePanel.destroy(); } catch(e) {}
      }
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
      if (this.canvasWrapper) {
        this.canvasWrapper.remove();
      }
      if (this.canvasContainer) {
        this.canvasContainer.remove();
      }
      if (this.layoutWrapper) {
        this.layoutWrapper.remove();
      }
      if (this.rootElement) {
        this.rootElement.innerHTML = '';
        this.rootElement = null;
      }
    }


  setTool(mode, suppressDialog = false) {
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

      if (mode === 'image' && !this.pendingImage && !suppressDialog) {
        this.fileInput.click();
      }

      this.updateUIState();
      this.saveSettings();

      // Dynamically rebuild the sidebar controls to display contextual sliders
      this.renderToolSettings();
    }

  renderToolSettings() {
      if (!this.sidePanel || !this.sidePanel.toolSettingsSection) return;
      this.sidePanel.toolSettingsSection.innerHTML = '';
      this.toolSliders = {};

      const container = makeElement('div', { className: 'settings-container', style: { padding: '5px' } });

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

      // File input cache
      this.fileInput = makeElement('input', {
        type: 'file',
        accept: 'image/*',
        style: { display: 'none' },
        onchange: (e) => this.handleImageFileSelect(e.target.files[0]),
      });
      container.appendChild(this.fileInput);

      // Tools title and grid
      const toolsHeader = makeElement('div', { 
        className: 'setting-label', 
        style: { marginBottom: '8px', fontSize: '11px', color: '#888' } 
      }, 'Tools');
      container.appendChild(toolsHeader);

      const grid = makeElement('div', { className: 'tool-grid' });
      this.toolButtons = {};

      toolModes.forEach((m) => {
        const btn = makeElement(
          'button',
          {
            className: `tool-option ${m.danger ? 'danger' : ''}`,
            onclick: () => this.setTool(m.id),
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
              this.setTool('image', true);
            }
          };
        }
        if (this.settings.toolMode === m.id) btn.classList.add('active');
        this.toolButtons[m.id] = btn;
        grid.appendChild(btn);
      });
      container.appendChild(grid);

      // Image preview container if active
      this.imagePreviewEl = makeElement('div', {
        className: 'image-preview-container',
      });
      container.appendChild(this.imagePreviewEl);

      // Contextual Parameters header
      const paramsHeader = makeElement('div', { 
        className: 'setting-label', 
        style: { marginTop: '15px', marginBottom: '10px', fontSize: '11px', color: '#888' } 
      }, 'Parameters');
      container.appendChild(paramsHeader);

      // Dynamic Color swatch picker utilizing shared library ColorPicker.js
      const colorContainer = document.createElement('div');
      colorContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 0; margin-bottom: 12px;';

      const colorLabel = document.createElement('div');
      colorLabel.style.cssText = 'font-size: 11px; color: #aaa; text-transform: uppercase; font-weight: bold;';
      colorLabel.textContent = 'Line Color';

      const swatch = document.createElement('div');
      swatch.className = 'drawing-color-swatch-picker';
      swatch.style.cssText = `width: 42px; height: 20px; border-radius: 4px; background-color: ${
        this.settings.strokeColor || '#00ffaa'
      }; border: 1px solid #555; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.5);`;

      this.colorSwatchPicker = swatch;

      swatch.onclick = (e) => {
        e.stopPropagation();
        this.colorPicker.openSmartPicker(
          swatch,
          this.settings.strokeColor || '#00ffaa',
          (newColor) => {
            swatch.style.backgroundColor = newColor;
            this.settings.strokeColor = newColor;
            this.updateSettingsForActive();
            this.saveSettings();
          }
        );
      };

      colorContainer.appendChild(colorLabel);
      colorContainer.appendChild(swatch);
      container.appendChild(colorContainer);

      // Universal Slider: Line Thickness
      const thicknessSlider = new SliderControl({
        label: 'thickness',
        min: 1,
        max: 50,
        initialValue: this.settings.strokeWidth || 4,
        showValue: true,
        callback: (val) => {
          this.settings.strokeWidth = Math.round(val);
          this.updateSettingsForActive();
          this.saveSettings();
        }
      });
      container.appendChild(thicknessSlider.container);
      this.toolSliders['thickness'] = thicknessSlider;

      const activeTool = this.settings.toolMode;

      // Tool Contextual Slider: Tangency, Curvature & Balance (Curve tool only)
      if (activeTool === 'curve') {
        const tangencySlider = new SliderControl({
          label: 'tangency',
          min: -90,
          max: 90,
          initialValue: 0,
          showValue: true,
          callback: (val) => {
            this.updateActiveCurveParams();
          }
        });
        container.appendChild(tangencySlider.container);
        this.toolSliders['tangency'] = tangencySlider;

        const curvSlider = new SliderControl({
          label: 'curvature',
          min: 0.1,
          max: 3.0,
          initialValue: this.curveParams?.curvature || 1.0,
          showValue: true,
          callback: (val) => {
            if (!this.curveParams) this.curveParams = {};
            this.curveParams.curvature = val;
            this.updateActiveCurveParams();
          }
        });
        container.appendChild(curvSlider.container);
        this.toolSliders['curvature'] = curvSlider;

        const balSlider = new SliderControl({
          label: 'balance',
          min: 0.0,
          max: 2.0,
          initialValue: this.curveParams?.balance || 1.0,
          showValue: true,
          callback: (val) => {
            if (!this.curveParams) this.curveParams = {};
            this.curveParams.balance = val;
            this.updateActiveCurveParams();
          }
        });
        container.appendChild(balSlider.container);
        this.toolSliders['balance'] = balSlider;
      }

      // Tool Contextual Slider: Corner Radius & Arc Bend (PolyArc tool only)
      if (activeTool === 'polyarc') {
        const radiusSlider = new SliderControl({
          label: 'radius',
          min: 0,
          max: 800,
          initialValue: this.settings.cornerRadius || 0,
          showValue: true,
          callback: (val) => {
            this.settings.cornerRadius = Math.round(val);
            if (this.isDrawing && this.currentPoints.length > 0) {
              this.currentPoints.forEach((p) => (p.cornerRadius = this.settings.cornerRadius));
              if (this.activeElement) {
                this.activeElement.setAttribute('d', this.buildPolyArcPath(this.currentPoints));
              }
            }
            this.saveSettings();
          }
        });
        container.appendChild(radiusSlider.container);
        this.toolSliders['radius'] = radiusSlider;

        const bendSlider = new SliderControl({
          label: 'bend',
          min: -180,
          max: 180,
          initialValue: this.settings.arcAngle || 0,
          showValue: true,
          callback: (val) => {
            this.settings.arcAngle = Math.round(val);
            if (this.isDrawing && this.currentMousePt) {
              this.updateRubberBand(this.currentMousePt);
            }
          }
        });
        container.appendChild(bendSlider.container);
        this.toolSliders['bend'] = bendSlider;
      }

      // Tool Contextual Slider: Image Opacity (Image tool only)
      if (activeTool === 'image') {
        const opacitySlider = new SliderControl({
          label: 'image opacity',
          min: 0.0,
          max: 1.0,
          initialValue: this.imageOpacity || 0.5,
          showValue: true,
          callback: (val) => {
            this.imageOpacity = val;
            if (this.svgElement) {
              const images = this.svgElement.querySelectorAll('.drawing-image');
              images.forEach(img => {
                img.style.opacity = val;
              });
            }
          }
        });
        container.appendChild(opacitySlider.container);
        this.toolSliders['opacity'] = opacitySlider;
      }

      // Color Swatch: Background Color
      const bgContainer = document.createElement('div');
      bgContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 0; margin-bottom: 12px; margin-top: 8px;';

      const bgLabel = document.createElement('div');
      bgLabel.style.cssText = 'font-size: 11px; color: #aaa; text-transform: uppercase; font-weight: bold;';
      bgLabel.textContent = 'Bg Color';

      const bgSwatch = document.createElement('div');
      bgSwatch.style.cssText = `width: 42px; height: 20px; border-radius: 4px; background-color: ${
        this.settings.bgColor || '#222222'
      }; border: 1px solid #555; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.5);`;

      bgSwatch.onclick = (e) => {
        e.stopPropagation();
        this.colorPicker.openSmartPicker(
          bgSwatch,
          this.settings.bgColor || '#222222',
          (newColor) => {
            bgSwatch.style.backgroundColor = newColor;
            this.settings.bgColor = newColor;
            this.svgElement.style.setProperty('--bg-color', newColor);
            this.saveSettings();
          }
        );
      };

      bgContainer.appendChild(bgLabel);
      bgContainer.appendChild(bgSwatch);
      container.appendChild(bgContainer);

      // Compact Folding Construction settings Card
      const constHeader = makeElement('div', { 
        className: 'setting-label', 
        style: { marginTop: '15px', marginBottom: '10px', fontSize: '11px', color: '#888' } 
      }, 'Construction');
      container.appendChild(constHeader);

      const defC = this.settings.construction || {};

      const activeOnlyCheck = makeElement('input', {
        type: 'checkbox',
        checked: defC.activeOnly,
        style: { accentColor: '#00ff66' },
        onchange: (e) => {
          this.settings.construction.activeOnly = e.target.checked;
          this.updateConstructionVisuals();
          this.saveSettings();
        },
      });

      const showAllCheck = makeElement('input', {
        type: 'checkbox',
        checked: defC.visible,
        style: { accentColor: '#00ff66' },
        onchange: (e) => {
          this.settings.construction.visible = e.target.checked;
          this.updateConstructionVisuals();
          this.saveSettings();
        },
      });

      container.appendChild(
        makeElement('div', { className: 'setting-row compact-grid' }, [
          makeElement('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#ccc', cursor: 'pointer' } }, [showAllCheck, 'Show Constr.']),
          makeElement('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#ccc', cursor: 'pointer' } }, [activeOnlyCheck, 'Active Only']),
        ])
      );

      // Undo button
      container.appendChild(
        makeElement(
          'button',
          { className: 'action-btn', style: { marginTop: '10px' }, onclick: () => this.performUndo() },
          'Undo (Ctrl+Z)'
        )
      );

      this.sidePanel.toolSettingsSection.appendChild(container);

      // Restore highlight outlines on re-renders
      this.setSelectedSliderIndex(this.selectedSliderIndex || 0);
    }

  getNavigatableSliders() {
      const list = [];
      
      // 1. Line Color Swatch (First in order)
      if (this.colorSwatchPicker) {
        list.push({
          key: 'drawingColor',
          slider: {
            container: this.colorSwatchPicker.parentElement || this.colorSwatchPicker,
            value: this._hexToHsv(this.settings.strokeColor || '#00ffaa').h,
            setValue: (val) => {
              const hsv = this._hexToHsv(this.settings.strokeColor || '#00ffaa');
              const newHex = this._hsvToHex(val % 360, hsv.s, hsv.v);
              this.settings.strokeColor = newHex;
              if (this.colorSwatchPicker) {
                this.colorSwatchPicker.style.backgroundColor = newHex;
              }
              this.updateSettingsForActive();
            }
          },
          type: 'tool'
        });
      }

      // 2. Active sliders in exact physical layout order
      if (this.toolSliders) {
        Object.entries(this.toolSliders).forEach(([key, slider]) => {
          if (slider) {
            list.push({ key: key, slider: slider, type: 'tool' });
          }
        });
      }
      
      return list;
    }

  setSelectedSliderIndex(index) {
      const list = this.getNavigatableSliders();
      if (list.length === 0) return;

      this.selectedSliderIndex = Math.max(0, Math.min(list.length - 1, index));
      this._updateSlidersHighlighting();
    }

  selectSliderRelative(change) {
      const list = this.getNavigatableSliders();
      if (list.length === 0) return;

      const currentIdx = this.selectedSliderIndex || 0;
      const nextIdx = (currentIdx + change + list.length) % list.length;
      this.setSelectedSliderIndex(nextIdx);
      this.recenterDragLineOnActive();
    }

  _updateSlidersHighlighting() {
      const list = this.getNavigatableSliders();
      list.forEach((item, idx) => {
        const slider = item.slider;
        if (slider && slider.container) {
          slider.container.style.setProperty('transition', 'all 0.15s ease', 'important');
          slider.container.style.removeProperty('border-left');
          slider.container.style.removeProperty('background');
          slider.container.style.removeProperty('padding-left');

          if (idx === this.selectedSliderIndex) {
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
          const hsv = this._hexToHsv(this.settings.strokeColor || '#00ffaa');
          this.sliderStartValue = hsv.h;
          if (this.colorSwatchPicker) {
            const activePicker = document.querySelector('.smart-picker-surface');
            if (!activePicker) {
              this.colorSwatchPicker.click();
            }
          }
          return;
        }

        let val = slider.value;
        if (val === undefined) {
          if (slider.options && slider.options.value !== undefined) {
            val = slider.options.value;
          } else if (typeof slider.getValue === 'function') {
            val = slider.getValue();
          }
        }
        this.sliderStartValue = val !== undefined && !isNaN(val) ? val : 0;
      }
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

        // Fully resolved and synced Drawing Color updates
        if (key === 'drawingColor') {
          let newHue = (this.sliderStartValue + ratio * 360) % 360;
          if (newHue < 0) newHue += 360;
          const hsv = this._hexToHsv(this.settings.strokeColor || '#00ffaa');
          const newHex = this._hsvToHex(newHue, hsv.s, hsv.v);
          this.settings.strokeColor = newHex;
          if (this.colorSwatchPicker) {
            this.colorSwatchPicker.style.backgroundColor = newHex;
          }
          this.updateSettingsForActive();
          if (this.activeElement) {
            this.activeElement.setAttribute('stroke', newHex);
          }
          this.saveSettings();

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

        // Force callback triggers so slider values connect immediately with drawing logic
        if (slider.options && typeof slider.options.callback === 'function') {
          slider.options.callback(newVal);
        } else if (typeof slider.callback === 'function') {
          slider.callback(newVal);
        }
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
      }
      const staticRanges = {
        thickness: { min: 1, max: 50 },
        tangency: { min: -90, max: 90 },
        curvature: { min: 0.1, max: 3.0 },
        balance: { min: 0.0, max: 2.0 },
        radius: { min: 0, max: 800 },
        bend: { min: -180, max: 180 },
        opacity: { min: 0.0, max: 1.0 }
      };
      const fb = staticRanges[key] || { min: 0, max: 100 };
      return {
        min: min !== undefined ? min : fb.min,
        max: max !== undefined ? max : fb.max
      };
    }

  handleSliderDragStart(mode) {
      const sidePanel = this.sidePanel;
      if (!sidePanel) return;

      if (!this.hoverIndicatorLine) {
        this.hoverIndicatorLine = document.createElement('div');
        this.hoverIndicatorLine.id = 'p2p-hover-indicator-line';
        this.hoverIndicatorLine.style.cssText = 'position: fixed; left: 12px; right: 12px; height: 1px; border-top: 1.2px dashed rgba(255, 255, 255, 0.25); pointer-events: none; z-index: 999999; opacity: 0; transition: opacity 0.15s ease;';
      }

      if (this.hoverIndicatorLine.parentElement !== document.body) {
        document.body.appendChild(this.hoverIndicatorLine);
      }

      const allSliders = this.getNavigatableSliders();
      const N = allSliders.length;
      if (N === 0) return;

      const localIndex = this.selectedSliderIndex || 0;
      this.dragLocalIndex = localIndex;

      const firstSlider = allSliders[0].slider.container;
      const lastSlider = allSliders[N - 1].slider.container;

      const firstRect = firstSlider.getBoundingClientRect();
      const lastRect = lastSlider.getBoundingClientRect();

      const firstCenterY = (firstRect.top + firstRect.bottom) / 2;
      const lastCenterY = (lastRect.top + lastRect.bottom) / 2;

      this.dragTotalHeight = lastCenterY - firstCenterY;
      this.dragMinY = firstCenterY;
      this.dragMaxY = lastCenterY;

      const parentRect = sidePanel.toolSettingsSection.getBoundingClientRect();
      this.hoverIndicatorLine.style.left = `${parentRect.left + 8}px`;
      this.hoverIndicatorLine.style.width = `${parentRect.width - 16}px`;

      const selectedSlider = allSliders[localIndex].slider.container;
      const selectedRect = selectedSlider.getBoundingClientRect();

      const centerY = (selectedRect.top + selectedRect.bottom) / 2;
      this.dragStartCenterY = centerY;
      this.dragCurrentY = centerY;

      this.hoverIndicatorLine.style.top = `${centerY}px`;
      this.hoverIndicatorLine.style.display = 'block';
      this.hoverIndicatorLine.style.opacity = '1';
    }

  handleSliderDragMove(dy, phoneHeight) {
      if (!this.hoverIndicatorLine) return;
      const allSliders = this.getNavigatableSliders();
      const N = allSliders.length;
      if (N === 0) return;

      const scale = phoneHeight ? (this.dragTotalHeight / (phoneHeight * 0.45)) : 1.8;
      const hostDy = dy * scale;
      
      const targetY = Math.max(this.dragMinY, Math.min(this.dragMaxY, this.dragStartCenterY + hostDy));
      this.dragCurrentY = targetY;
      this.hoverIndicatorLine.style.top = `${targetY}px`;

      let closestIdx = 0;
      let minDistance = Infinity;

      allSliders.forEach((item, idx) => {
        const rect = item.slider.container.getBoundingClientRect();
        const centerY = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(targetY - centerY);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      if (this.dragLocalIndex !== closestIdx) {
        this.dragLocalIndex = closestIdx;
        this.setSelectedSliderIndex(closestIdx);
      }
    }

  handleSliderDragEnd() {
      if (this.hoverIndicatorLine) {
        this.hoverIndicatorLine.style.opacity = '0';
        setTimeout(() => {
          if (this.hoverIndicatorLine && this.hoverIndicatorLine.style.opacity === '0') {
            this.hoverIndicatorLine.style.display = 'none';
          }
        }, 150);
      }

      const activePicker = document.querySelector('.smart-picker-surface');
      if (activePicker) {
        activePicker.style.opacity = '0';
        activePicker.style.transform = 'scale(0.8)';
        setTimeout(() => activePicker.remove(), 200);
      }
    }

  recenterDragLineOnActive() {
      if (!this.hoverIndicatorLine) return;
      const allSliders = this.getNavigatableSliders();
      const localIndex = this.selectedSliderIndex || 0;
      if (!allSliders[localIndex]) return;

      const selectedSlider = allSliders[localIndex].slider.container;
      const selectedRect = selectedSlider.getBoundingClientRect();

      const centerY = (selectedRect.top + selectedRect.bottom) / 2;
      this.dragStartCenterY = centerY;
      this.dragCurrentY = centerY;

      this.hoverIndicatorLine.style.top = `${centerY}px`;
    }

  highlightActiveControlBox(mode) {
      const sidePanel = this.sidePanel;
      if (!sidePanel || !sidePanel.toolSettingsSection) return;

      const card = sidePanel.sectionObjects?.['setup']?.container;
      const header = sidePanel.sectionObjects?.['setup']?.header;

      if (!card) return;

      const highlight = (mode === 'tool');

      if (highlight) {
        card.style.setProperty('box-shadow', '0 0 25px rgba(0, 230, 118, 0.45)', 'important');
        card.style.setProperty('border-color', '#00e676', 'important');
        card.style.setProperty('border-width', '1.5px', 'important');
        card.style.setProperty('border-style', 'solid', 'important');
        card.style.setProperty('border-radius', '6px', 'important');
        card.style.setProperty('background', 'rgba(0, 230, 118, 0.05)', 'important');
        
        if (header) {
          header.style.setProperty('background', 'linear-gradient(90deg, rgba(0, 230, 118, 0.35), rgba(0, 230, 118, 0.06))', 'important');
          header.style.setProperty('color', '#00ff66', 'important');
          header.style.setProperty('text-shadow', '0 0 6px rgba(0, 255, 102, 0.8)', 'important');
        }
        this._updateSlidersHighlighting();
      } else {
        card.style.removeProperty('box-shadow');
        card.style.removeProperty('border-color');
        card.style.removeProperty('border-width');
        card.style.removeProperty('border-style');
        card.style.removeProperty('border-radius');
        card.style.removeProperty('background');
        
        if (header) {
          header.style.removeProperty('background');
          header.style.removeProperty('color');
          header.style.removeProperty('text-shadow');
        }
        this._clearSlidersHighlighting();
      }
    }

  _hexToHsv(colorStr) {
      if (!colorStr) return { h: 0, s: 1, v: 1 };
      let r = 0, g = 0, b = 0;
      colorStr = String(colorStr).trim();

      // Robustly match functional rgb(r, g, b) strings generated by the standard ColorPicker
      if (colorStr.startsWith('rgb')) {
        const match = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
        if (match) {
          r = parseInt(match[1], 10) / 255;
          g = parseInt(match[2], 10) / 255;
          b = parseInt(match[3], 10) / 255;
        }
      } else {
        let hex = colorStr.replace('#', '');
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }
        r = parseInt(hex.substring(0, 2), 16) / 255;
        g = parseInt(hex.substring(2, 4), 16) / 255;
        b = parseInt(hex.substring(4, 6), 16) / 255;
      }

      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return { h: 0, s: 1, v: 1 }; // Default fallback to prevent NaN color updates
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

  _updatePropertiesPanel() {
      if (!this.toolSliders) return;

      const thicknessSlider = this.toolSliders['thickness'];
      const tangencySlider = this.toolSliders['tangency'];
      const curvatureSlider = this.toolSliders['curvature'];
      const balanceSlider = this.toolSliders['balance'];
      const radiusSlider = this.toolSliders['radius'];
      const bendSlider = this.toolSliders['bend'];
      const opacitySlider = this.toolSliders['opacity'];

      if (thicknessSlider) thicknessSlider.setValue(this.settings.strokeWidth);

      if (this.activeVertex) {
        const vertex = this.activeVertex.curve.vertices[this.activeVertex.index];
        
        if (tangencySlider) {
          const deg = vertex.tangentAngleOffset ? Math.round(vertex.tangentAngleOffset * (180 / Math.PI)) : 0;
          tangencySlider.setValue(deg);
        }
        if (curvatureSlider) curvatureSlider.setValue(vertex.curvature !== undefined ? vertex.curvature : 1.0);
        if (balanceSlider) balanceSlider.setValue(vertex.balance !== undefined ? vertex.balance : 1.0);
      } else {
        if (tangencySlider) tangencySlider.setValue(0);
        if (curvatureSlider) curvatureSlider.setValue(this.curveParams?.curvature || 1.0);
        if (balanceSlider) balanceSlider.setValue(this.curveParams?.balance || 1.0);
      }

      if (radiusSlider) radiusSlider.setValue(this.settings.cornerRadius || 0);
      if (bendSlider) bendSlider.setValue(this.settings.arcAngle || 0);
      if (opacitySlider) opacitySlider.setValue(this.imageOpacity || 0.5);
    }

  handleRemoteDrag(dx, dy, mode) {
      if (mode === 'pan') {
        const panSensitivity = 0.8;
        this.panX += dx * panSensitivity / this.zoom;
        this.panY += dy * panSensitivity / this.zoom;
        this.updateZoom();
      }
    }

  handleRemoteZoom(ratio) {
      const factor = 1 / ratio;
      const oldZoom = this.zoom;
      const newZoom = Math.max(0.1, Math.min(20, oldZoom * factor));
      if (newZoom === oldZoom) return;

      // 1. Identify the center of the SVG viewport in ViewBox units
      const cx = this.vbWidth / 2;
      const cy = this.vbHeight / 2;

      // 2. Map this screen center to World Coordinates using the old transform state
      const worldCx = (cx / oldZoom) - this.panX;
      const worldCy = (cy / oldZoom) - this.panY;

      // 3. Compute the new pan offsets so the calculated center remains anchored
      const zoomRatio = oldZoom / newZoom;
      this.panX = this.panX * zoomRatio + worldCx * (zoomRatio - 1);
      this.panY = this.panY * zoomRatio + worldCy * (zoomRatio - 1);

      this.zoom = newZoom;
      this.updateZoom();
    }

  getP2PCapabilities() {
      // Returns exact drawing workspace schema coordinates for Touch Controller
      return {
        leftTrackpad: {
          title: "Canvas Navigation",
          modes: {
            pan: { label: "Pan & Zoom", type: "drag_pinch" }
          }
        },
        rightTrackpad: {
          title: "Brushes / Sliders",
          modes: {
            sliders: { label: "Thickness & Curve Settings", type: "sliders" }
          }
        }
      };
    }
}

