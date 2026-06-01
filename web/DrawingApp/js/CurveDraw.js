class CurveDraw {
  constructor() {
    this.svg = null;
    this.curves = [];
    this.placedImages = [];
    this.currentCurve = null;
    this.isDrawing = false;
    this.isPanning = false;
    this.mode = 'draw';
    this.activeVertex = null;
    this.selectedModify = null;
    this.hoveredVertex = null;

    this.mainContainer = null;
    this.imageContainer = null;
    this.cursorVisual = null;
    this.searchRadius = 10;
    this.dragStartPos = null;
    this.panLastPos = null;
    this.lastMouseScreenPos = null;

    this.viewTransform = new ViewTransform();

    // "Live" tool settings
    this.currentCurvature = 1.0;
    this.currentBalance = 1.0;
    this.tangencyResetTimer = null;
  }

  init(targetElement) {
    applyCss(
      `
            html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
            .curvedraw-main-container { position: relative; width: 100%; height: 100%; background-color: #2c3e50; overflow: hidden; }
            .curvedraw-image-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
            .curvedraw-image-container img { position: absolute; transform-origin: top left; }
            .curve-draw-svg { position: relative; width: 100%; height: 100%; cursor: crosshair; user-select: none; background-color: transparent; }
            .curve-draw-svg.modify-mode { cursor: none; }
            .curve-draw-svg.panning-mode { cursor: grab; }
            .curve-group .vertex { transition: r 0.1s ease, stroke 0.1s ease, fill 0.1s ease; }
            .add-image-button { position: absolute; top: 10px; left: 10px; z-index: 100; padding: 8px 12px; background-color: #34495e; color: white; border: 1px solid #7f8c8d; border-radius: 4px; cursor: pointer; }
            .place-image-button { position: absolute; bottom: 10px; left: 10px; z-index: 100; padding: 8px 12px; background-color: #27ae60; color: white; border: 1px solid #2ecc71; border-radius: 4px; cursor: pointer; }
        `,
      'curvedraw-styles'
    );

    this.mainContainer = makeElement('div', {
      className: 'curvedraw-main-container',
    });
    this.imageContainer = makeElement('div', {
      className: 'curvedraw-image-container',
    });
    this.svg = makeElement('svg:svg', { className: 'curve-draw-svg' });

    this.mainContainer.appendChild(this.imageContainer);
    this.mainContainer.appendChild(this.svg);
    targetElement.appendChild(this.mainContainer);

    const addImageButton = makeElement(
      'button',
      {
        className: 'add-image-button',
        onclick: () => this._createImageDropDialog(),
      },
      'Add Image'
    );
    this.mainContainer.appendChild(addImageButton);

    this.cursorVisual = makeElement('svg:circle', {
      cx: -100,
      cy: -100,
      r: this.searchRadius,
      fill: 'rgba(255, 255, 255, 0.2)',
      stroke: 'rgba(255, 255, 255, 0.8)',
      'stroke-width': 1,
      'pointer-events': 'none',
      style: { display: 'none' },
    });
    this.svg.appendChild(this.cursorVisual);

    this.addEventListeners();

    // Create the properties panel
    this._createPropertiesPanel();

    console.log(
      'CurveDraw Initialized. Click to draw. Hold Ctrl/Cmd to modify. Hold Space to pan.'
    );
  }

  addEventListeners() {
    this.svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.svg.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.svg.addEventListener('contextmenu', this.onContextMenu.bind(this));
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    this.svg.addEventListener('wheel', this.onWheel.bind(this));
    document.documentElement.addEventListener('mouseleave', () => {
      if (this.isPanning) this.panLastPos = null;
    });
  }

  _createImageDropDialog() {
      const box = UITools.makeDialog({
        env: this.app?.env || this.env,
        title: 'Drop Image File',
        size: [400, 300],
        transparent: true,
      });

      const dropZone = makeElement('div', {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #95a5a6',
          color: '#bdc3c7',
        },
        textContent: 'Drag & Drop Image Here',
      });

      box.contentElement.appendChild(dropZone);

      box.element.addEventListener('dragover', (e) => e.preventDefault());
      box.element.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const naturalImg = new Image();
            naturalImg.onload = () => {
              const imgDisplay = makeElement('img', {
                src: e.target.result,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: 0.75,
                },
              });

              const placeButton = makeElement(
                'button',
                { className: 'place-image-button' },
                'Place Image Here'
              );

              placeButton.onclick = () => {
                const containerRect = imgDisplay.getBoundingClientRect();
                const imageRatio =
                  naturalImg.naturalWidth / naturalImg.naturalHeight;
                const containerRatio = containerRect.width / containerRect.height;

                let renderedWidth, renderedHeight;

                if (imageRatio > containerRatio) {
                  renderedWidth = containerRect.width;
                  renderedHeight = renderedWidth / imageRatio;
                } else {
                  renderedHeight = containerRect.height;
                  renderedWidth = renderedHeight * imageRatio;
                }

                const offsetX = (containerRect.width - renderedWidth) / 2;
                const offsetY = (containerRect.height - renderedHeight) / 2;
                const screenPos = [
                  containerRect.left + offsetX,
                  containerRect.top + offsetY,
                ];

                const worldPos = this.viewTransform.screenToWorld(screenPos);
                const worldSize = {
                  width: renderedWidth / this.viewTransform.zoom,
                  height: renderedHeight / this.viewTransform.zoom,
                };

                this.placeImage(naturalImg.src, worldPos, worldSize);
                box.close();
              };

              box.contentElement.innerHTML = '';
              box.contentElement.appendChild(imgDisplay);
              box.contentElement.appendChild(placeButton);
            };
            naturalImg.src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

  placeImage(src, worldPos, worldSize) {
    const imgElement = makeElement('img', { src });
    const imageData = {
      element: imgElement,
      worldPos: {
        x: worldPos[0],
        y: worldPos[1],
        width: worldSize.width,
        height: worldSize.height,
      },
    };
    this.placedImages.push(imageData);
    this.imageContainer.appendChild(imgElement);
    this._renderScene();
  }

  _renderScene() {
    this.curves.forEach((c) =>
      c.render(this.viewTransform, this.activeVertex, this.hoveredVertex)
    );

    this.placedImages.forEach((imgData) => {
      const screenPos = this.viewTransform.worldToScreen([
        imgData.worldPos.x,
        imgData.worldPos.y,
      ]);
      const screenWidth = imgData.worldPos.width * this.viewTransform.zoom;
      const screenHeight = imgData.worldPos.height * this.viewTransform.zoom;

      imgData.element.style.transform = `translate(${screenPos[0]}px, ${screenPos[1]}px)`;
      imgData.element.style.width = `${screenWidth}px`;
      imgData.element.style.height = `${screenHeight}px`;
      // --- NEW: Apply global opacity ---
      imgData.element.style.opacity = this.imageOpacity;
    });
  }

  _renderCurrentState(mouseScreenPos) {
    this._renderScene();
    const currentMousePos = mouseScreenPos || [
      this.panLastPos?.x,
      this.panLastPos?.y,
    ];
    if (!currentMousePos[0] && !currentMousePos[1]) return;
    const worldPt = this.viewTransform.screenToWorld(currentMousePos);

    if (this.isDrawing && this.currentCurve) {
      this.currentCurve.render(
        this.viewTransform,
        this.activeVertex,
        null,
        worldPt
      );
    }
    if (this.selectedModify) {
      this.selectedModify.curve.render(
        this.viewTransform,
        this.activeVertex,
        null
      );
    }
    if (this.mode === 'modify' && !this.selectedModify) {
      this.cursorVisual.setAttribute('cx', currentMousePos[0]);
      this.cursorVisual.setAttribute('cy', currentMousePos[1]);
      const nearest = this._findNearestVertex(worldPt);
      if (nearest !== this.hoveredVertex) {
        this.hoveredVertex = nearest;
        this._renderScene();
      }
    }
  }

  _updateModifyVisuals() {
    if (this.mode === 'modify' && !this.isDrawing) {
      if (this.selectedModify) {
        this.svg.style.cursor = 'crosshair';
        this.cursorVisual.style.display = 'none';
      } else {
        this.svg.style.cursor = 'none';
        this.cursorVisual.style.display = 'block';
      }
    } else {
      this.svg.style.cursor = 'crosshair';
      this.cursorVisual.style.display = 'none';
    }
  }

  _updateMode(e) {
    const wantsModify = e.ctrlKey || e.metaKey || e.altKey;
    const oldMode = this.mode;
    if (wantsModify && !this.isDrawing) {
      this.mode = 'modify';
    } else {
      this.mode = 'draw';
      if (this.hoveredVertex) {
        this.hoveredVertex = null;
        this._renderScene();
      }
    }
    if (oldMode !== this.mode) {
      this._updateModifyVisuals();
    }
  }

  _findNearestVertex(worldPt) {
    let closest = null;
    let minDistance = this.searchRadius / this.viewTransform.zoom;
    for (const curve of this.curves) {
      for (let i = 0; i < curve.vertices.length; i++) {
        const vertex = curve.vertices[i];
        const distance = GeometryUtils.getDistance(worldPt, vertex.point);
        if (distance < minDistance) {
          minDistance = distance;
          closest = { curve, vertex, index: i };
        }
      }
    }
    return closest;
  }

  onMouseDown(e) {
    if (this.isPanning) {
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    const screenPt = this.getMousePosition(e);
    const worldPt = this.viewTransform.screenToWorld(screenPt);
    if (this.mode === 'modify') {
      if (this.selectedModify) {
        // Deselecting the vertex
        this.selectedModify = null;
        this.activeVertex = null;
        this._updatePropertiesPanel();
        this.cursorVisual.setAttribute('cx', screenPt[0]);
        this.cursorVisual.setAttribute('cy', screenPt[1]);
      } else if (this.hoveredVertex) {
        // Selecting a new vertex
        const { curve, vertex, index } = this.hoveredVertex;
        this.selectedModify = {
          curve,
          vertex,
          index,
          originalPoint: vertex.point.slice(),
        };
        this.activeVertex = this.hoveredVertex;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this._updatePropertiesPanel(); // Update sliders on selection
      }
      this._updateModifyVisuals();
      return;
    }
    if (!this.isDrawing) {
      this.isDrawing = true;
      this.currentCurve = new Curve(this.svg);
      this.curves.push(this.currentCurve);
    }

    this.currentCurve.addVertex(worldPt, {
      curvature: this.currentCurvature,
      balance: this.currentBalance,
    });

    this.activeVertex = {
      curve: this.currentCurve,
      index: this.currentCurve.vertices.length - 1,
    };

    this.currentCurve.render(this.viewTransform, this.activeVertex);

    this._updatePropertiesPanel(); // Update sliders for new vertex
  }

  onMouseMove(e) {
    const screenPt = [e.clientX, e.clientY];
    this.lastMouseScreenPos = screenPt; // Keep track of the latest mouse position

    if (this.isPanning) {
      if (this.panLastPos) {
        const dx = e.clientX - this.panLastPos.x;
        const dy = e.clientY - this.panLastPos.y;
        this.viewTransform.applyPan(dx, dy);
        this._renderCurrentState();
      }
      this.panLastPos = { x: e.clientX, y: e.clientY };
      return;
    }
    const worldPt = this.viewTransform.screenToWorld(screenPt);
    if (!this.isDrawing && !this.selectedModify) {
      this._updateMode(e);
    }
    if (this.mode === 'modify') {
      if (this.selectedModify) {
        this.selectedModify.vertex.point = worldPt;
        this.selectedModify.curve.render(
          this.viewTransform,
          this.activeVertex,
          null
        );
      } else {
        this.cursorVisual.setAttribute('cx', screenPt[0]);
        this.cursorVisual.setAttribute('cy', screenPt[1]);
        const nearest = this._findNearestVertex(worldPt);
        if (nearest !== this.hoveredVertex) {
          this.hoveredVertex = nearest;
          this._renderScene();
          this.cursorVisual.setAttribute(
            'fill',
            nearest ? 'rgba(46, 204, 113, 0.4)' : 'rgba(255, 255, 255, 0.2)'
          );
        }
      }
      return;
    }
    if (this.isDrawing && this.currentCurve) {
      this.currentCurve.render(
        this.viewTransform,
        this.activeVertex,
        null,
        worldPt
      );
    }
  }

  onMouseUp(e) {
    if (this.selectedModify && this.dragStartPos) {
      const dx = e.clientX - this.dragStartPos.x;
      const dy = e.clientY - this.dragStartPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        this.selectedModify = null;
        this._updateModifyVisuals();
      }
    }
    this.dragStartPos = null;
  }

  onContextMenu(e) {
    e.preventDefault();
    if (this.selectedModify) {
      this.selectedModify = null;
      this.activeVertex = null; // Clear active vertex on deselect
      this._updatePropertiesPanel(); // Update panel to show global settings
      const screenPt = this.getMousePosition(e);
      this.cursorVisual.setAttribute('cx', screenPt[0]);
      this.cursorVisual.setAttribute('cy', screenPt[1]);
      this._updateModifyVisuals();
    } else if (this.isDrawing) {
      this.finalizeCurrentCurve();
    }
  }

  onKeyDown(e) {
    if (e.key === ' ' && !this.isPanning) {
      e.preventDefault();
      this.isPanning = true;
      this.panLastPos = null;
      this.svg.classList.add('panning-mode');
      this.cursorVisual.style.display = 'none';
    }
    if (e.key === 'Escape') {
      if (this.selectedModify) {
        this.selectedModify.vertex.point = this.selectedModify.originalPoint;
        this.selectedModify.curve.render(this.viewTransform, this.activeVertex);
        this.selectedModify = null;
        const screenPt = this.getMousePosition(e, true);
        this.cursorVisual.setAttribute('cx', screenPt[0]);
        this.cursorVisual.setAttribute('cy', screenPt[1]);
        this._updateModifyVisuals();
      } else {
        this.finalizeCurrentCurve(true);
      }
    }
    this._updateMode(e);
  }

  onKeyUp(e) {
    if (e.key === ' ') {
      this.isPanning = false;
      this.panLastPos = null;
      this.svg.classList.remove('panning-mode');
      this.svg.style.cursor = '';
      this._updateMode(e);
      this._updateModifyVisuals();
    }
    if (!this.selectedModify) {
      this._updateMode(e);
    }
  }

  onWheel(e) {
    e.preventDefault();
    const screenPt = this.getMousePosition(e);
    this.viewTransform.applyZoom(e.deltaY, screenPt);
    this._renderCurrentState(screenPt);
  }

  finalizeCurrentCurve(cancel = false) {
    if (!this.currentCurve) return;
    if (cancel || this.currentCurve.vertices.length < 2) {
      if (this.currentCurve.group.parentNode) {
        this.currentCurve.group.parentNode.removeChild(this.currentCurve.group);
      }
      this.curves = this.curves.filter((c) => c !== this.currentCurve);
    } else {
      this.currentCurve.render(this.viewTransform, null);
    }
    this.isDrawing = false;
    this.currentCurve = null;
    this.activeVertex = null;
    this._updatePropertiesPanel(); // Update sliders on finalization
  }

  getMousePosition(evt) {
    return [evt.clientX, evt.clientY];
  }

  _createPropertiesPanel() {
      this.propertiesPanel = UITools.makeDialog({
        env: this.app?.env || this.env,
        title: 'Properties',
        size: [320, 300],
        position: [10, 50],
      });

      const sliderContainer = makeElement('div', {
        style: { padding: '5px' },
      });

      this.connectionStatusEl = makeElement('div', {
        style: {
          padding: '8px',
          margin: '5px 0',
          background: '#444',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center',
          color: '#ddd',
        },
        textContent: 'Initializing MIDI...',
      });

      this.propertiesPanel.contentElement.appendChild(this.connectionStatusEl);
      this.propertiesPanel.contentElement.appendChild(sliderContainer);

      const midiManagerConfig = {
        sliderConfigs: [
          {
            label: 'Curvature',
            min: 0.1,
            max: 3.0,
            step: 0.01,
            value: 1.0,
            onchange: this.handleSliderChange.bind(this),
          },
          {
            label: 'Balance',
            min: 0.0,
            max: 2.0,
            step: 0.01,
            value: 1.0,
            onchange: this.handleSliderChange.bind(this),
          },
          {
            label: 'Tangency',
            min: -90,
            max: 90,
            step: 1,
            value: 0,
            isRotary: true,
            suffix: '°',
            onchange: this.handleSliderChange.bind(this),
          },
          {
            label: 'Curve Hue',
            min: 0,
            max: 360,
            step: 1,
            value: 207,
            isRotary: true,
            suffix: '°',
            onchange: this.handleSliderChange.bind(this),
          },
          {
            label: 'Image Opacity',
            min: 0,
            max: 1,
            step: 0.01,
            value: 0.5,
            onchange: this.handleSliderChange.bind(this),
          },
        ],
        onUpdate: () => this._renderCurrentState(this.lastMouseScreenPos),
      };

      this.imageOpacity = 0.5;

      // Note: MidiManager handles these sliders. If MidiManager wasn't updated to avoid assuming DialogBox exist, 
      // we assume it just creates sliders in the sliderContainer.
      this.sliderManager = new MidiManager(sliderContainer, midiManagerConfig);
      this.sliderManager.onStatusChange = this.updateConnectionStatus.bind(this);
      this.sliderManager.init();

      this._updatePropertiesPanel();
    }

  _updatePropertiesPanel() {
    if (!this.sliderManager || !this.sliderManager.sliders.length) return;

    const [
      curvatureSlider,
      balanceSlider,
      tangentSlider,
      hueSlider,
      opacitySlider,
    ] = this.sliderManager.sliders;

    if (this.activeVertex) {
      const vertex = this.activeVertex.curve.vertices[this.activeVertex.index];
      const curve = this.activeVertex.curve;

      // Update sliders with vertex-specific properties
      curvatureSlider.setValue(vertex.curvature);
      balanceSlider.setValue(vertex.balance);

      const tangentAngle = vertex.tangentAngleOffset
        ? vertex.tangentAngleOffset * (180 / Math.PI)
        : 0;
      tangentSlider.setValue(tangentAngle);

      // Sync hue slider to the selected curve's hue
      const curveHue = curve.hue !== undefined ? curve.hue : 207;
      hueSlider.setValue(curveHue);
    } else {
      // No active vertex, show the global "live" tool settings
      curvatureSlider.setValue(this.currentCurvature);
      balanceSlider.setValue(this.currentBalance);
      tangentSlider.setValue(0); // Tangency is always relative to a vertex
    }

    // Always update global sliders
    opacitySlider.setValue(this.imageOpacity);
  }

  handleSliderChange(value, slider, fromRemote = false) {
    if (this.tangencyResetTimer) {
      clearTimeout(this.tangencyResetTimer);
      this.tangencyResetTimer = null;
    }

    const property = slider.options.label;

    if (this.activeVertex) {
      const vertex = this.activeVertex.curve.vertices[this.activeVertex.index];
      const curve = this.activeVertex.curve;

      switch (property) {
        case 'Curvature':
          vertex.curvature = value;
          break;
        case 'Balance':
          vertex.balance = value;
          break;
        case 'Tangency':
          vertex.tangentAngleOffset = value * (Math.PI / 180);
          // Set a timer to snap the value back to 0
          this.tangencyResetTimer = setTimeout(() => {
            vertex.tangentAngleOffset = 0;
            tangentSlider.setValue(0); // Update UI as well
            this._renderCurrentState(this.lastMouseScreenPos);
          }, 750);
          break;
        case 'Curve Hue':
          curve.hue = value;
          curve.pathElement.setAttribute('stroke', `hsl(${value}, 80%, 70%)`);
          break;
      }
    } else {
      // No active vertex, so update the global tool settings
      switch (property) {
        case 'Curvature':
          this.currentCurvature = value;
          break;
        case 'Balance':
          this.currentBalance = value;
          break;
      }
    }

    if (property === 'Image Opacity') {
      this.imageOpacity = value;
    }

    if (!fromRemote) {
      this._renderCurrentState(this.lastMouseScreenPos);
    }
  }

  updateConnectionStatus(status) {
    if (!this.connectionStatusEl) return;
    let bgColor, textColor;

    if (status.toLowerCase().includes('connected')) {
      bgColor = '#d4edda';
      textColor = '#155724';
    } else if (
      status.toLowerCase().includes('failed') ||
      status.toLowerCase().includes('not supported')
    ) {
      bgColor = '#f8d7da';
      textColor = '#721c24';
    } else {
      bgColor = '#fff3cd';
      textColor = '#856404';
    }

    this.connectionStatusEl.textContent = status;
    this.connectionStatusEl.style.background = bgColor;
    this.connectionStatusEl.style.color = textColor;
  }

}

