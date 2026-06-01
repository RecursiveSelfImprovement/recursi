class ScrewThread {
  constructor() {
    this.app = null;
    this.meshes = [];
    this.surfaceGroup = null;
    this.controlHelpersGroup = null;

    this.raycastingEnabled = true;
    this.pointer = null; // initialized after THREE loads
    this.intersected = null;

    this.animating = false;
    this.animationData = {};
    this.savedParams = null;
    this.paramLimits = {};
    this.uiInputs = {};

    this.params = {
      color: '#d00000',
      metalness: 0.5,
      roughness: 0.5,
      clearcoat: 0.1,
      clearcoatRoughness: 0.1,
      radius: 3.0,
      pitch: 3.0,
      threadDepth: 0.5,
      threadThickness: 0.75,
      segmentCount: 1,
      resolution: 20,
      wireframe: false,
      showControls: true,
    };

    this.material = null; // initialized after THREE loads
  }

  _updateMaterial() {
    this.material.color.set(this.params.color);
    this.material.metalness = this.params.metalness;
    this.material.roughness = this.params.roughness;
    this.material.clearcoat = this.params.clearcoat;
    this.material.clearcoatRoughness = this.params.clearcoatRoughness;
    this.material.wireframe = this.params.wireframe;
  }

  _createBezierKnots(segments) {
    // Standard knot vector for clamped Bezier spline
    const knots = [];
    knots.push(0, 0, 0, 0); // Multiplicity 4 for degree 3
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      knots.push(t, t, t);
    }
    knots.push(1, 1, 1, 1);
    return knots;
  }

  _addControlVisuals(controlPoints) {
    const THREE = this.app.THREE;
    const dotGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      opacity: 0.6,
      transparent: true,
    });

    const numRows = controlPoints.length;
    const numCols = controlPoints[0].length;

    const instanceMesh = new THREE.InstancedMesh(
      dotGeo,
      dotMat,
      numRows * numCols
    );
    let idx = 0;
    const dummy = new THREE.Object3D();

    controlPoints.forEach((row) => {
      row.forEach((cp) => {
        dummy.position.set(cp.x, cp.y, cp.z);
        dummy.updateMatrix();
        instanceMesh.setMatrixAt(idx++, dummy.matrix);
      });
    });
    instanceMesh.instanceMatrix.needsUpdate = true;
    this.controlHelpersGroup.add(instanceMesh);

    controlPoints.forEach((row) => {
      const pts = row.map((cp) => new THREE.Vector3(cp.x, cp.y, cp.z));
      this.controlHelpersGroup.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat)
      );
    });

    for (let j = 0; j < numCols; j++) {
      const pts = [];
      for (let i = 0; i < numRows; i++) {
        const cp = controlPoints[i][j];
        pts.push(new THREE.Vector3(cp.x, cp.y, cp.z));
      }
      this.controlHelpersGroup.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat)
      );
    }
  }

  _rebuildScrewThread() {
    const THREE = this.app.THREE;
    const NURBSSurface = this.app.modules.NURBSSurface;
    const ParametricGeometry = this.app.modules.ParametricGeometry;

    if (!NURBSSurface || !ParametricGeometry) {
      console.error('Required modules (NURBS/Parametric) not loaded.');
      return;
    }

    while (this.surfaceGroup.children.length > 0) {
      const c = this.surfaceGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      this.surfaceGroup.remove(c);
    }
    while (this.controlHelpersGroup.children.length > 0) {
      const c = this.controlHelpersGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      this.controlHelpersGroup.remove(c);
    }
    this.meshes = [];

    const p = this.params;
    const k = 0.55228475;

    const R_root = p.radius;
    const R_tip = p.radius + p.threadDepth;
    const quarterPitch = p.pitch / 4.0;
    const halfThick = p.threadThickness / 2.0;
    const segmentCount = Math.floor(p.segmentCount || 1);

    const getHelixArcCPs = (rad, startY, endY) => {
      const x = [rad, rad, rad * k, 0];
      const z = [0, rad * k, rad, rad];
      const dy = endY - startY;
      const y = [startY, startY + dy * (1 / 3), startY + dy * (2 / 3), endY];
      return x.map((val, i) => new THREE.Vector4(val, y[i], z[i], 1));
    };

    const interpolateRows = (railA, railB, steps) => {
      const rows = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const row = [];
        for (let j = 0; j < railA.length; j++) {
          const p1 = railA[j];
          const p2 = railB[j];
          row.push(
            new THREE.Vector4(
              p1.x + (p2.x - p1.x) * t,
              p1.y + (p2.y - p1.y) * t,
              p1.z + (p2.z - p1.z) * t,
              1
            )
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const transformCP = (cp, angle, yShift) => {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return new THREE.Vector4(
        cp.x * c - cp.z * s,
        cp.y + yShift,
        cp.x * s + cp.z * c,
        cp.w
      );
    };

    const basePatches = [];

    {
      const railRoot = getHelixArcCPs(
        R_root,
        halfThick,
        halfThick - quarterPitch
      );
      const railTip = getHelixArcCPs(R_tip, 0, -quarterPitch);
      basePatches.push(interpolateRows(railRoot, railTip, 3));
    }

    {
      const railRoot = getHelixArcCPs(
        R_root,
        -halfThick,
        -halfThick - quarterPitch
      );
      const railTip = getHelixArcCPs(R_tip, 0, -quarterPitch);
      basePatches.push(interpolateRows(railRoot, railTip, 3));
    }

    const knots = this._createBezierKnots(1);

    for (let i = 0; i < segmentCount; i++) {
      const angle = i * (Math.PI / 2);
      const yShift = -i * quarterPitch;

      basePatches.forEach((baseGrid) => {
        const grid = baseGrid.map((row) =>
          row.map((cp) => transformCP(cp, angle, yShift))
        );

        const surf = new NURBSSurface(3, 3, knots, knots, grid);
        const geo = new ParametricGeometry(
          (u, v, target) => surf.getPoint(u, v, target),
          p.resolution,
          p.resolution
        );
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, this.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.surfaceGroup.add(mesh);
        this.meshes.push(mesh);

        if (p.showControls && i < 8) {
          this._addControlVisuals(grid);
        }
      });
    }
  }

  _setupUI() {
      const rebuild = () => this._rebuildScrewThread();
      const updateMat = () => this._updateMaterial();

      this.paramLimits = {};
      this.uiInputs = {};

      const createSlider = (
        label,
        min,
        max,
        key,
        step = 0.01,
        callback = rebuild
      ) => {
        const val = this.params[key] !== undefined ? this.params[key] : 0;
        this.paramLimits[key] = { min, max };
        const input = makeElement('input', {
          type: 'range',
          min,
          max,
          step,
          value: val,
          style: { flexGrow: 1 },
        });
        this.uiInputs[key] = input;
        const valDisplay = makeElement(
          'span',
          { style: { width: '35px', textAlign: 'right', fontSize: '10px' } },
          val.toFixed(2)
        );
        input.oninput = () => {
          this.params[key] = parseFloat(input.value);
          valDisplay.textContent = this.params[key].toFixed(2);
          callback();
        };
        input._valDisplay = valDisplay;
        return makeElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px',
            },
          },
          makeElement(
            'label',
            { style: { width: '100px', fontSize: '12px' } },
            label
          ),
          input,
          valDisplay
        );
      };

      const createColorPicker = (label, key) => {
        const input = makeElement('input', {
          type: 'color',
          value: this.params[key],
          style: { border: 'none', width: '30px', height: '20px', padding: 0 },
        });
        this.uiInputs[key] = input;
        input.oninput = () => {
          this.params[key] = input.value;
          updateMat();
        };
        return makeElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            },
          },
          makeElement('label', { style: { fontSize: '12px' } }, label),
          input
        );
      };

      const content = makeElement(
        'div',
        { style: { color: '#ccc', padding: '5px' } },
        makeElement(
          'h4',
          { style: { marginTop: 0, marginBottom: '10px' } },
          'Screw Generator'
        ),
        createSlider('Segments', 1, 100, 'segmentCount', 1),
        createSlider('Radius', 1, 6, 'radius'),
        createSlider('Pitch (360)', 0.5, 10, 'pitch'),
        createSlider('Thrd Depth', 0.1, 3, 'threadDepth'),
        createSlider('Thrd Thick', 0.1, 3, 'threadThickness'),
        makeElement('hr', { style: { borderColor: '#444' } }),
        createColorPicker('Color', 'color'),
        createSlider('Metalness', 0, 1, 'metalness', updateMat),
        createSlider('Roughness', 0, 1, 'roughness', updateMat),
        makeElement('hr', { style: { borderColor: '#444' } }),
        makeElement(
          'label',
          { style: { display: 'flex', gap: '6px', fontSize: '12px' } },
          makeElement('input', {
            type: 'checkbox',
            checked: this.params.wireframe,
            onchange: (e) => {
              this.params.wireframe = e.target.checked;
              updateMat();
            },
          }),
          'Wireframe'
        ),
        makeElement(
          'label',
          {
            style: {
              display: 'flex',
              gap: '6px',
              fontSize: '12px',
              marginTop: '4px',
            },
          },
          makeElement('input', {
            type: 'checkbox',
            checked: this.params.showControls,
            onchange: (e) => {
              this.params.showControls = e.target.checked;
              updateMat();
              rebuild();
            },
          }),
          'Control Points'
        ),
        makeElement(
          'button',
          {
            className: 'dialog-button primary',
            style: { width: '100%', marginTop: '15px' },
            onclick: (e) => this._toggleAnimation(e.target),
          },
          'Start Animation'
        )
      );

      this.controlsDialog = UITools.makeDialog({
        env: this.env, // Standardized environment routing
        title: 'ScrewThread',
        contentElement: content,
        size: [300, 580],
        position: [20, 20],
        transparent: true,
      });
    }

  _setupRaycasting() {
    if (!this.app.raycaster) return;

    const onPointerMove = (event) => {
      if (!this.raycastingEnabled) return;
      const rect = this.app.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    this.app.renderer.domElement.addEventListener('pointermove', onPointerMove);

    const originalOnUpdate = this.app.onUpdateCallback;
    this.app.onUpdateCallback = () => {
      if (originalOnUpdate) originalOnUpdate();
      this._updateRaycasting();
    };
  }

  _updateRaycasting() {
    if (this.animating) this._updateAnimation();
    if (!this.app.raycaster || !this.meshes.length) return;
    this.app.raycaster.setFromCamera(this.pointer, this.app.camera);
    const intersects = this.app.raycaster.intersectObjects(this.meshes, false);
    if (intersects.length > 0) {
      if (this.intersected !== intersects[0].object) {
        if (this.intersected)
          this.intersected.material.emissive.setHex(0x110000);
        this.intersected = intersects[0].object;
        this.intersected.material.emissive.setHex(0x441111);
      }
    } else {
      if (this.intersected) {
        this.intersected.material.emissive.setHex(0x110000);
        this.intersected = null;
      }
    }
  }

  _toggleAnimation(btn) {
    const THREE = this.app.THREE;
    if (this.animating) {
      this.animating = false;
      btn.textContent = 'Start Animation';
      btn.classList.remove('danger');
      btn.classList.add('primary');
      if (this.savedParams) {
        Object.assign(this.params, this.savedParams);
        this.savedParams = null;
        for (const [key, input] of Object.entries(this.uiInputs)) {
          if (this.params[key] !== undefined) {
            input.value = this.params[key];
            if (input._valDisplay)
              input._valDisplay.textContent =
                typeof this.params[key] === 'number'
                  ? this.params[key].toFixed(2)
                  : '';
          }
        }
        this._updateMaterial();
        this._rebuildScrewThread();
      }
    } else {
      this.savedParams = JSON.parse(JSON.stringify(this.params));
      this.animating = true;
      btn.textContent = 'Stop Animation';
      btn.classList.remove('primary');
      btn.classList.add('danger');
      this.animationData = {};
      for (const key in this.paramLimits) {
        this.animationData[key] = { target: this.params[key] };
      }
      const c = new THREE.Color(this.params.color);
      const hsl = {};
      c.getHSL(hsl);
      this.animationData.color = { hue: hsl.h };
    }
  }

  _updateAnimation() {
    const THREE = this.app.THREE;
    const lerpSpeed = 0.05;
    let geometryChanged = false;
    let materialChanged = false;

    for (const key in this.paramLimits) {
      const data = this.animationData[key];
      const limits = this.paramLimits[key];
      if (
        Math.abs(data.target - this.params[key]) < 0.01 ||
        Math.random() < 0.02
      ) {
        data.target = limits.min + Math.random() * (limits.max - limits.min);
      }
      const newVal =
        this.params[key] + (data.target - this.params[key]) * lerpSpeed;
      if (Math.abs(newVal - this.params[key]) > 0.0001) {
        this.params[key] = newVal;
        const input = this.uiInputs[key];
        if (input) {
          input.value = newVal;
          if (input._valDisplay)
            input._valDisplay.textContent = newVal.toFixed(2);
        }
        if (['metalness', 'roughness'].includes(key)) materialChanged = true;
        else geometryChanged = true;
      }
    }

    if (this.animationData.color) {
      this.animationData.color.hue += 0.002;
      if (this.animationData.color.hue > 1) this.animationData.color.hue -= 1;
      const c = new THREE.Color().setHSL(
        this.animationData.color.hue,
        1.0,
        0.5
      );
      this.params.color = '#' + c.getHexString();
      if (this.uiInputs.color) this.uiInputs.color.value = this.params.color;
      materialChanged = true;
    }

    if (materialChanged) this._updateMaterial();
    if (geometryChanged) this._rebuildScrewThread();
  }

  async run(env) {
      if (this.rootElement) {
        this.destroy();
      }

      if (!env || !env.container) {
        throw new Error("[ScrewThread] run() requires an environment object with a valid container.");
      }

      this.env = env; // Save environment securely
      const parentElement = env.container;
      this.rootElement = parentElement;

      parentElement.style.position = 'relative';
      parentElement.style.width = '100%';
      parentElement.style.height = '100%';
      parentElement.style.overflow = 'hidden';
      parentElement.style.background = '#222';

      const canvasId = 'screw-canvas-' + Math.random().toString(36).slice(2);
      const canvasContainer = makeElement('div', {
        id: canvasId,
        style: {
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: '0',
        },
      });
      parentElement.appendChild(canvasContainer);
      this.canvasContainer = canvasContainer;

      if (
        !parentElement._vibesAppResizeObserver &&
        typeof ResizeObserver !== 'undefined'
      ) {
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (this.app && typeof this.app.resize === 'function') {
              this.app.resize(entry.contentRect.width, entry.contentRect.height);
            }
          }
        });
        ro.observe(parentElement);
        parentElement._vibesAppResizeObserver = ro;
      }

      this.app = new ThreeJSLoader(canvasId, {
        cameraPos: { x: 5, y: 6, z: 8 },
        cameraTarget: { x: 0, y: -1, z: 0 },
        enableControls: true,
        useRaycaster: true,
        hdrPath:
          'https://recursi.dev/thirdparty/three-js-r153/assets/textures/venice_sunset_1k.hdr',
      });

      await this.app.init(canvasContainer);

      if (this.app.scene) {
        this.app.scene.background = null;
      }

      const THREE = this.app.THREE;
      this.pointer = new THREE.Vector2();

      try {
        const THREE_URL =
          'https://recursi.dev/thirdparty/three-js-r153/build/three.module.js';
        const ADDONS =
          'https://recursi.dev/thirdparty/three-js-r153/examples/jsm';

        const nurbsUrl = await this.app._fetchAndRewrite(
          ADDONS + '/curves/NURBSSurface.js',
          THREE_URL,
          1
        );
        const nurbsMod = await import(nurbsUrl);
        this.app.modules.NURBSSurface = nurbsMod.NURBSSurface;

        const paramUrl = await this.app._fetchAndRewrite(
          ADDONS + '/geometries/ParametricGeometry.js',
          THREE_URL,
          1
        );
        const paramMod = await import(paramUrl);
        this.app.modules.ParametricGeometry = paramMod.ParametricGeometry;
      } catch (e) {
        console.error(
          '[ScrewThread] Failed to load NURBS/Parametric modules:',
          e
        );
      }

      this.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(this.params.color),
        emissive: 0x110000,
        metalness: this.params.metalness,
        roughness: this.params.roughness,
        clearcoat: this.params.clearcoat,
        clearcoatRoughness: this.params.clearcoatRoughness,
        side: THREE.DoubleSide,
      });

      this.surfaceGroup = new THREE.Group();
      this.controlHelpersGroup = new THREE.Group();
      this.controlHelpersGroup.visible = true;

      this.app.add(this.surfaceGroup);
      this.app.add(this.controlHelpersGroup);

      this._setupUI();
      this._setupRaycasting();
      this._rebuildScrewThread();

      return this;
    }

  destroy() {
    console.log('[ScrewThread] destroy() called.');
    if (
      this.controlsDialog &&
      typeof this.controlsDialog.close === 'function'
    ) {
      this.controlsDialog.close();
      this.controlsDialog = null;
    }
    if (this.app && typeof this.app.destroy === 'function') {
      this.app.destroy();
      this.app = null;
    }
    if (this.canvasContainer) {
      this.canvasContainer.remove();
      this.canvasContainer = null;
    }
    this.rootElement = null;
    this.meshes = [];
    this.surfaceGroup = null;
    this.controlHelpersGroup = null;
    this.intersected = null;
    this.animating = false;
    console.log('[ScrewThread] destroy() complete.');
  }

  
}