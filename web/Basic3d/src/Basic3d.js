class Basic3d {
  getThemeColors() {
    const THREE = this.app.THREE;
    return [
      new THREE.Color(0xff0000), // Red
      new THREE.Color(0x00ff00), // Green
      new THREE.Color(0x0044ff), // Blue
      new THREE.Color(0xffff00), // Yellow
      // new THREE.Color(0x00ffff), // Cyan
      // new THREE.Color(0xff00ff), // Magenta
      // new THREE.Color(0xff8800), // Orange
      new THREE.Color(0x8800ff), // Purple
      // new THREE.Color(0xff1493), // Pink
      //  new THREE.Color(0xccff00), // Lime
      //new THREE.Color(0x008080), // Teal
      //new THREE.Color(0x8b4513), // Brown
      //new THREE.Color(0x808080), // Gray
      //new THREE.Color(0x000080), // Navy
    ];
  }

  constructor() {
    this.app = null;
    this.meshes = [];
    this.grid = null;
    this.thickLine = null;
    this.raycastingEnabled = true;
    this.intersected = null;
    this.loadedModel = null;
    this.isShiftDown = false;
    this.paintedObjectsThisStroke = new Set();
  }

  _buildPrimitives() {
    const result = Simple3dShapes.buildPrimitives(this.app, this.app.scene);
    this.meshes.push(...result.meshes);
    this.grid = result.grid;
    this._assignColorsRandomly();
  }

  _assignColorsRandomly() {
    const colors = this.getThemeColors();
    const shuffled = [...colors].sort(() => Math.random() - 0.5);

    this.meshes.forEach((m, i) => {
      if (m.userData.locked !== true) {
        m.material.color.copy(shuffled[i % shuffled.length]);
      }
    });

    if (this.thickLine && this.thickLine.userData.locked !== true) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      this.thickLine.material.color.copy(randomColor);
    }
  }

  _setupUI() {
    const feedback = makeElement(
      'div',
      { style: { marginTop: '6px', fontSize: '12px', color: '#888' } },
      'Ready.'
    );

    const btn = makeElement(
      'button',
      {
        style: {
          display: 'block',
          margin: '0 auto',
          width: '80%',
          padding: '5px',
        },
      },
      'Randomize Colors'
    );
    btn.onclick = () => {
      this._assignColorsRandomly();
      feedback.textContent =
        'Colors updated at ' + new Date().toLocaleTimeString();
    };

    const gridChk = makeElement('input', {
      type: 'checkbox',
      id: 'gridToggle',
    });
    const gridLbl = makeElement(
      'label',
      { htmlFor: 'gridToggle', style: { marginLeft: '4px' } },
      'Show grid'
    );
    gridChk.onchange = () => {
      this.grid.visible = gridChk.checked;
      feedback.textContent = gridChk.checked ? 'Grid ON' : 'Grid OFF';
    };
    const gridDiv = makeElement(
      'div',
      { style: { marginTop: '8px', textAlign: 'center' } },
      [gridChk, gridLbl]
    );

    const thickLineChk = makeElement('input', {
      type: 'checkbox',
      id: 'thickLineToggle',
      checked: true,
    });
    const thickLineLbl = makeElement(
      'label',
      { htmlFor: 'thickLineToggle', style: { marginLeft: '4px' } },
      'Show thick line'
    );
    thickLineChk.onchange = () => {
      if (this.thickLine) {
        this.thickLine.visible = thickLineChk.checked;
        feedback.textContent = thickLineChk.checked
          ? 'Thick line ON'
          : 'Thick line OFF';
      }
    };
    const thickLineDiv = makeElement(
      'div',
      { style: { marginTop: '4px', textAlign: 'center' } },
      [thickLineChk, thickLineLbl]
    );

    const raycastChk = makeElement('input', {
      type: 'checkbox',
      id: 'raycastToggle',
      checked: true,
    });
    const raycastLbl = makeElement(
      'label',
      { htmlFor: 'raycastToggle', style: { marginLeft: '4px' } },
      'Enable hover'
    );
    raycastChk.onchange = () => {
      this.raycastingEnabled = raycastChk.checked;
      feedback.textContent = this.raycastingEnabled ? 'Hover ON' : 'Hover OFF';
      if (!this.raycastingEnabled && this.intersected) {
        this._unhighlight(this.intersected);
        this.intersected = null;
      }
    };
    const raycastDiv = makeElement(
      'div',
      { style: { marginTop: '4px', textAlign: 'center' } },
      [raycastChk, raycastLbl]
    );

    const dropZone = makeElement(
      'div',
      {
        id: 'drop-zone',
        style: {
          border: '2px dashed #555',
          borderRadius: '5px',
          padding: '10px',
          textAlign: 'center',
          marginTop: '10px',
          color: '#888',
          fontSize: '12px',
        },
      },
      'Drop .glb file here'
    );

    dropZone.ondragover = (event) => {
      event.preventDefault();
      dropZone.style.backgroundColor = '#444';
      dropZone.style.borderColor = '#888';
    };
    dropZone.ondragleave = () => {
      dropZone.style.backgroundColor = 'transparent';
      dropZone.style.borderColor = '#555';
    };
    dropZone.ondrop = (event) => {
      event.preventDefault();
      dropZone.style.backgroundColor = 'transparent';
      dropZone.style.borderColor = '#555';
      const file = event.dataTransfer.files[0];
      if (file && file.name.toLowerCase().endsWith('.glb')) {
        this._loadGLB(file, feedback);
      } else {
        feedback.textContent = 'Please drop a .glb file.';
      }
    };

    const content = makeElement('div', {}, [
      btn,
      gridDiv,
      thickLineDiv,
      raycastDiv,
      dropZone,
      feedback,
    ]);

    // Provide `env` object to bind the dialog directly to the app container
    this.controlsDialog = UITools.makeDialog({
      env: this.env,
      title: 'Controls',
      contentElement: content,
      size: [220, 310],
      position: [20, 40],
      onGeometryChange: (boxInstance, geometry) => {
        if (geometry && geometry.inner) {
          feedback.textContent =
            'size … ' +
            geometry.inner.width.toFixed(0) +
            ' × ' +
            geometry.inner.height.toFixed(0);
        }
      },
    });
  }

  _buildThickLine() {
    const { Line2, LineGeometry, LineMaterial } = this.app.modules;
    if (!Line2 || !LineGeometry || !LineMaterial) {
      console.warn('Thick lines modules not loaded. Cannot build thick line.');
      return;
    }

    const points = [];
    const radius = 0.8;
    const y = 0.56;
    const segments = 64;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(radius * Math.cos(theta), y, radius * Math.sin(theta));
    }

    const geometry = new LineGeometry();
    geometry.setPositions(points);

    const material = new LineMaterial({
      color: 0xffaa00,
      linewidth: 5,
    });

    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.scale.set(1, 1, 1);
    line.userData.locked = false;
    this.app.scene.add(line);
    this.thickLine = line;

    const { clientWidth, clientHeight } = this.app.renderer.domElement;
    material.resolution.set(clientWidth, clientHeight);

    const chk = document.getElementById('thickLineToggle');
    if (chk) {
      this.thickLine.visible = chk.checked;
    }

    this._assignColorsRandomly();
  }

  _setupRaycasting() {
    if (!this.app.raycaster) return;

    const THREE = this.app.THREE;
    this.pointer = new THREE.Vector2();
    this.intersected = null;

    const onPointerMove = (event) => {
      if (!this.raycastingEnabled) return;
      const rect = this.app.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    this.app.renderer.domElement.addEventListener('pointermove', onPointerMove);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift' && !this.isShiftDown) {
        this.isShiftDown = true;
        this.paintedObjectsThisStroke.clear();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.isShiftDown = false;
    });

    const originalOnUpdate = this.app.onUpdateCallback;
    this.app.onUpdateCallback = () => {
      if (originalOnUpdate) originalOnUpdate();
      this._updateRaycasting();
    };
  }

  _updateRaycasting() {
    if (!this.app.raycaster || !this.raycastingEnabled) {
      if (this.intersected) {
        this._unhighlight(this.intersected);
        this.intersected = null;
      }
      return;
    }

    this.app.raycaster.setFromCamera(this.pointer, this.app.camera);
    if (this.thickLine) this.app.raycaster.params.Line.threshold = 0.02;

    const objectsToTest = this.thickLine
      ? [...this.meshes, this.thickLine]
      : this.meshes;
    const intersects = this.app.raycaster.intersectObjects(
      objectsToTest.filter((o) => o && o.visible),
      false
    );
    const newIntersect = intersects.length > 0 ? intersects[0] : null;

    if (this.isShiftDown) {
      if (this.intersected) {
        this._unhighlight(this.intersected);
        this.intersected = null;
      }

      if (
        newIntersect &&
        !this.paintedObjectsThisStroke.has(newIntersect.object)
      ) {
        this._applyPaintToObject(newIntersect);
        this.paintedObjectsThisStroke.add(newIntersect.object);
      }
      return;
    }

    const newIntersectedObject = newIntersect ? newIntersect.object : null;

    if (this.intersected !== newIntersectedObject) {
      this._unhighlight(this.intersected);
      this.intersected = newIntersectedObject;
      this._highlight(this.intersected);
    }
  }

  _loadGLB(file, feedbackElement) {
    ModelLoader.loadGLB(file, this.app, feedbackElement, (loadedModel) => {
      this._clearSceneGeometry();
      this.loadedModel = loadedModel;
      this.app.add(this.loadedModel);
      this.loadedModel.traverse((child) => {
        if (child.isMesh) {
          this.meshes.push(child);
        }
      });
    });
  }

  _clearSceneGeometry() {
    ModelLoader.clearSceneGeometry(this.app, this.meshes, this.loadedModel);
    this.loadedModel = null;
  }

  _generateSaturatedColor() {
    const THREE = this.app.THREE;
    const c = new THREE.Color(),
      v = [0, 1, Math.random()];
    v.sort(() => Math.random() - 0.5);
    return c.setRGB(v[0], v[1], v[2]), c;
  }

  _applyPaintToObject(intersect) {
    const THREE = this.app.THREE;
    const object = intersect.object;
    if (!object) return;

    object.userData.locked = true;

    if (object.isLine2) {
      const colors = this.getThemeColors();
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      object.material.color.copy(randomColor);
      return;
    }

    if (object.isMesh) {
      const newMaterial = new THREE.MeshPhysicalMaterial({});
      newMaterial.color.set(this._generateSaturatedColor());

      if (Math.random() > 0.4) {
        newMaterial.metalness = Math.random();
        newMaterial.roughness = Math.random() * 0.4;
        newMaterial.clearcoat = Math.random() > 0.5 ? Math.random() : 0.0;
        newMaterial.clearcoatRoughness = Math.random() * 0.3;
      } else {
        newMaterial.metalness = 0.0;
        newMaterial.roughness = 0.9;
        newMaterial.clearcoat = 0.0;
      }

      if (Array.isArray(object.material)) {
        const materialIndex = intersect.face.materialIndex;
        if (materialIndex !== undefined) {
          const oldMaterial = object.material[materialIndex];
          if (oldMaterial.map) newMaterial.map = oldMaterial.map;

          const newMaterials = object.material.slice();
          newMaterials[materialIndex] = newMaterial;
          object.material = newMaterials;
          if (oldMaterial.dispose) oldMaterial.dispose();
        }
      } else {
        const oldMaterial = object.material;
        if (oldMaterial.map) newMaterial.map = oldMaterial.map;

        object.material = newMaterial;
        if (oldMaterial.dispose) oldMaterial.dispose();
      }
    }
  }

  _highlight(object) {
    const THREE = this.app.THREE;
    if (!object) return;

    if (object.isMesh && object.material && object.material.emissive) {
      object.originalEmissive = object.material.emissive.getHex();
      object.material.emissive.setHex(0xff0000);
    } else if (object.isLine2) {
      object.originalColor = object.material.color.clone();
      object.material.color.lerp(new THREE.Color(0xffffff), 0.3);
    }
  }

  _unhighlight(object) {
    if (!object) return;

    if (
      object.isMesh &&
      object.material &&
      object.material.emissive &&
      object.originalEmissive !== undefined
    ) {
      object.material.emissive.setHex(object.originalEmissive);
    } else if (object.isLine2 && object.originalColor) {
      object.material.color.copy(object.originalColor);
    }
  }

  

  

  

  destroy() {
    this.destroyed = true;

    if (Array.isArray(this.cleanupFns)) {
      for (const cleanup of this.cleanupFns.splice(0)) {
        try {
          cleanup();
        } catch (error) {}
      }
    }

    if (
      this.controlsDialog &&
      typeof this.controlsDialog.close === 'function'
    ) {
      try {
        this.controlsDialog.close();
      } catch (e) {}
      this.controlsDialog = null;
    }

    if (this.app && typeof this.app.destroy === 'function') {
      try {
        this.app.destroy();
      } catch (error) {}
    }

    if (this.rootElement && this.rootElement.parentElement) {
      this.rootElement.parentElement.removeChild(this.rootElement);
    }

    this.rootElement = null;
    this.app = null;
    this.meshes = [];
    this.grid = null;
    this.thickLine = null;
    this.intersected = null;
    this.loadedModel = null;

    if (window.basic3d === this) {
      window.basic3d = null;
    }
  }

  async run(env) {
      if (this.rootElement) {
        this.destroy();
      }

      this.destroyed = false;
      this.cleanupFns = [];
      this.env = env;

      if (!env || !env.container) {
        throw new Error("[Basic3d] run() requires an environment object with a valid container.");
      }

      const parentElement = env.container;

      parentElement.style.position = 'relative';
      parentElement.style.width = '100%';
      parentElement.style.height = '100%';
      parentElement.style.margin = '0';
      parentElement.style.padding = '0';
      parentElement.style.overflow = 'hidden';
      parentElement.style.background = '#222';

      const canvasId = 'basic3d-canvas-' + Math.random().toString(36).slice(2);
      const canvasContainer = makeElement('div', {
        id: canvasId,
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          overflow: 'hidden',
          background: '#222',
        },
      });
      parentElement.appendChild(canvasContainer);
      this.rootElement = canvasContainer;

      if (
        !parentElement._vibesAppResizeObserver &&
        typeof ResizeObserver !== 'undefined'
      ) {
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (typeof this.onResize === 'function') {
              this.onResize(entry.contentRect.width, entry.contentRect.height);
            }
          }
        });
        ro.observe(parentElement);
        parentElement._vibesAppResizeObserver = ro;
      }

      this.app = new ThreeJSLoader(canvasId, {
        cameraPos: { x: 0.8, y: 1.5, z: 2.2 },
        enableControls: true,
        useThickLines: true,
        useRaycaster: true,
        commonLoaders: true,
        hdrPath:
          'https://recursi.dev/thirdparty/three-js-r153/assets/textures/venice_sunset_1k.hdr',
      });

      await this.app.init(canvasContainer);

      if (this.app.scene) {
        this.app.scene.background = null;
      }

      const initialRect = parentElement.getBoundingClientRect();
      if (
        initialRect.width > 0 &&
        initialRect.height > 0 &&
        typeof this.onResize === 'function'
      ) {
        this.onResize(initialRect.width, initialRect.height);
      }

      const THREE = this.app.THREE;
      this.pointer = new THREE.Vector2();

      this._buildPrimitives();
      this._setupUI();
      this._buildThickLine();
      this._setupRaycasting();

      // Safe environment-based handshake
      if (env && typeof env.requestKeystrokeControl === 'function') {
        env.requestKeystrokeControl((active) => {
          this.isKeystrokeCaptureActive = active;
          this.raycastingEnabled = active;
        });
      } else {
        this.isKeystrokeCaptureActive = true;
      }

      // STRICTLY FOR DEV CONSOLE DEBUGGING - DO NOT REFER INTERNAL CODE TO THESE
      window.threeApp = this.app;
      window.basic3d = this;

      return this;
    }

  onResize(width, height) {
    if (this.app && typeof this.app.resize === 'function') {
      this.app.resize(width, height);
    }
  }

  
}