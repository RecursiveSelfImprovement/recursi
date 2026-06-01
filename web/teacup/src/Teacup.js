class Teacup {
  

  constructor() {
    this.THREE = null;
    this.app = null;
    this.meshes = [];
    this.surfaceGroup = null;
    this.controlHelpersGroup = null;

    this.raycastingEnabled = true;
    this.pointer = null; // initialized in init() after THREE loads
    this.material = null; // initialized in init() after THREE loads
    this.intersected = null;

    // Animation State
    this.animating = false;
    this.animationData = {};
    this.savedParams = null;
    this.paramLimits = {};
    this.uiInputs = {};

    this.params = {
      // Material
      color: '#d00000',
      metalness: 0.2,
      roughness: 0.15,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,

      // Cup Shape
      cupHeight: 1.0,
      cupRadius: 0.7,
      baseRadius: 0.4,
      wallThickness: 0.06,
      cupSquareness: 0.0,
      bulgeHeight: 0.4,
      bulgeScale: 0.95,

      // Handle Shape
      handleSize: 0.65,
      handleStretch: 0.6,
      handleReach: 0.1,
      handleVerticalPos: 0.55,
      handleThickness: 0.07,
      handleAngle: 5.0,
      handleSquareness: 0.6,
      sectionSquareness: 0.5,
      handleAsymmetry: 0.2,
      handleEmbed: 0.8,

      // System
      resolution: 24,
      wireframe: false,
      showControls: false,
    };
  }

  _updateMaterial() {
    this.material.color.set(this.params.color);
    this.material.metalness = this.params.metalness;
    this.material.roughness = this.params.roughness;
    this.material.clearcoat = this.params.clearcoat;
    this.material.clearcoatRoughness = this.params.clearcoatRoughness;
    this.material.wireframe = this.params.wireframe;
  }

  _getSquircleLayout(squareness) {
    const baseK = 0.55228475;
    const maxK = 0.95;
    const K = baseK + (maxK - baseK) * squareness;

    return [
      [1, 0],
      [1, K],
      [K, 1],
      [0, 1],
      [-K, 1],
      [-1, K],
      [-1, 0],
      [-1, -K],
      [-K, -1],
      [0, -1],
      [K, -1],
      [1, -K],
      [1, 0],
    ];
  }

  _rebuildTeacup() {
    const NURBSSurface = this.app.modules.NURBSSurface;
    const ParametricGeometry = this.app.modules.ParametricGeometry;

    if (!NURBSSurface || !ParametricGeometry) {
      console.error('Required modules (NURBS/Parametric) not loaded.');
      return;
    }

    // Cleanup
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

    // --- 1. Cup Body ---
    const bodyLayout = this._getSquircleLayout(p.cupSquareness);

    const T = p.wallThickness;
    const H = p.cupHeight;
    const R = p.cupRadius;
    const Rb = p.baseRadius;

    const R_bulge = R * p.bulgeScale;
    const H_bulge = H * p.bulgeHeight;

    const profile = [
      { r: 0, y: 0 }, // 0
      { r: Rb, y: 0 }, // 1
      { r: R_bulge, y: H_bulge }, // 2
      { r: R, y: H - T * 0.5 }, // 3
      { r: R, y: H + T * 0.4 }, // 4
      { r: R - T, y: H + T * 0.4 }, // 5
      { r: R - T, y: H - T * 0.5 }, // 6
      { r: R_bulge - T * 0.9, y: H_bulge }, // 7
      { r: Rb - T, y: T }, // 8
      { r: 0, y: T }, // 9
    ];

    const uPoints = bodyLayout.length;
    const vPoints = profile.length;
    const cupControlPoints = [];

    for (let i = 0; i < uPoints; i++) {
      const [mx, mz] = bodyLayout[i];
      const row = [];
      for (let pt of profile) {
        row.push(new this.THREE.Vector4(mx * pt.r, pt.y, mz * pt.r, 1));
      }
      cupControlPoints.push(row);
    }

    const cupKnotsU = this._createBezierKnots(4);
    const cupKnotsV = this._createClampedKnots(vPoints, 3);

    const cupSurf = new NURBSSurface(
      3,
      3,
      cupKnotsU,
      cupKnotsV,
      cupControlPoints
    );
    const cupGeo = new ParametricGeometry(
      (u, v, target) => cupSurf.getPoint(u, v, target),
      p.resolution * 4,
      p.resolution * 2
    );
    cupGeo.computeVertexNormals();

    const cupMesh = new this.THREE.Mesh(cupGeo, this.material);
    cupMesh.castShadow = true;
    cupMesh.receiveShadow = true;
    this.surfaceGroup.add(cupMesh);
    this.meshes.push(cupMesh);

    if (p.showControls) this._addControlVisuals(cupControlPoints);

    // --- 2. Handle ---

    const taperAngle = Math.atan2(R - Rb, H);
    const finalAngle = taperAngle + (p.handleAngle * Math.PI) / 180;

    const hY = p.handleVerticalPos * H;
    const hH = p.handleSize * 0.5;

    // Scale: Overall width scaling
    const hW = hH * 0.8 * p.handleStretch;

    // Asymmetry
    const hW_Top = hW * (1.0 + p.handleAsymmetry);
    const hW_Bot = hW * (1.0 - p.handleAsymmetry);

    // Reach: Pushes the outer vertical bar further away independently
    const hReach = p.handleReach !== undefined ? p.handleReach : 0.0;

    // Base Offset: Moves the entire handle linearly relative to the wall radius
    const hBaseOffset =
      p.handleBaseOffset !== undefined ? p.handleBaseOffset : 0.0;

    // Squareness
    const sqFac = 0.5 + p.handleSquareness * 0.8;

    const rawSpine = [
      // 0: In Top (Anchor)
      new this.THREE.Vector3(-hW_Top * 0.3, hH, 0),
      // 1: Out Top (Transition)
      new this.THREE.Vector3(hW_Top * 0.3, hH, 0),

      // 2: Corner Top (Dynamic + Reach)
      new this.THREE.Vector3(
        hW_Top * (0.5 + sqFac * 0.5) + hReach,
        hH * sqFac,
        0
      ),

      // 3: Corner Bot (Dynamic + Reach)
      new this.THREE.Vector3(
        hW_Bot * (0.5 + sqFac * 0.5) + hReach,
        -hH * sqFac,
        0
      ),

      // 4: Out Bot (Transition)
      new this.THREE.Vector3(hW_Bot * 0.3, -hH, 0),
      // 5: In Bot (Anchor)
      new this.THREE.Vector3(-hW_Bot * 0.3, -hH, 0),
    ];

    const spinePoints = rawSpine.map((pt) => {
      const cos = Math.cos(finalAngle);
      const sin = Math.sin(finalAngle);

      // Rotate the raw points first
      const px = pt.x * cos - pt.y * sin;
      const py = pt.x * sin + pt.y * cos;

      const worldY = py + hY;
      const heightRatio = Math.max(0, Math.min(1, worldY / H));

      // Calculate where the surface is at this height
      const surfaceRadius = Rb + (R - Rb) * heightRatio;

      // Apply the computed X (px) PLUS the new global Base Offset
      // This slides the whole handle in/out without distorting vectors
      return new this.THREE.Vector3(
        surfaceRadius + px + hBaseOffset,
        worldY,
        0
      );
    });

    // Frames
    const frames = spinePoints.map((pt, i, arr) => {
      let tan = new this.THREE.Vector3();
      if (i === 0) tan.subVectors(arr[1], arr[0]);
      else if (i === arr.length - 1) tan.subVectors(arr[i], arr[i - 1]);
      else tan.subVectors(arr[i + 1], arr[i - 1]);
      tan.z = 0;
      tan.normalize();
      const normal = new this.THREE.Vector3(-tan.y, tan.x, 0);
      const binormal = new this.THREE.Vector3(0, 0, 1);
      return { pos: pt, normal, binormal };
    });

    // Cross-Section
    const handleSectionLayout = this._getSquircleLayout(p.sectionSquareness);
    const handleCPs = [];

    for (let i = 0; i < spinePoints.length; i++) {
      const { pos, normal, binormal } = frames[i];
      const row = [];
      for (let j = 0; j < handleSectionLayout.length; j++) {
        const [cx, cy] = handleSectionLayout[j];
        const pt = new this.THREE.Vector3().copy(pos);
        pt.addScaledVector(normal, cx * p.handleThickness);
        pt.addScaledVector(binormal, cy * p.handleThickness * 1.3);
        row.push(new this.THREE.Vector4(pt.x, pt.y, pt.z, 1));
      }
      handleCPs.push(row);
    }

    const handleKnotsU = this._createClampedKnots(spinePoints.length, 3);
    const handleKnotsV = this._createBezierKnots(4);

    const handleSurf = new NURBSSurface(
      3,
      3,
      handleKnotsU,
      handleKnotsV,
      handleCPs
    );
    const handleGeo = new ParametricGeometry(
      (u, v, target) => handleSurf.getPoint(u, v, target),
      p.resolution * 2,
      p.resolution
    );
    handleGeo.computeVertexNormals();

    const handleMesh = new this.THREE.Mesh(handleGeo, this.material);
    handleMesh.castShadow = true;
    handleMesh.receiveShadow = true;
    this.surfaceGroup.add(handleMesh);
    this.meshes.push(handleMesh);

    if (p.showControls) this._addControlVisuals(handleCPs);
  }

  _createClampedKnots(numPoints, degree) {
    const knots = [];
    for (let i = 0; i <= degree; i++) knots.push(0);
    const count = numPoints - 1 - degree;
    for (let i = 1; i <= count; i++) knots.push(i / (count + 1));
    for (let i = 0; i <= degree; i++) knots.push(1);
    return knots;
  }

  _addControlVisuals(controlPoints) {
    const dotGeo = new this.THREE.BoxGeometry(0.015, 0.015, 0.015);
    const dotMat = new this.THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const lineMat = new this.THREE.LineBasicMaterial({
      color: 0xffffff,
      opacity: 0.6,
      transparent: true,
    });

    const numRows = controlPoints.length;
    const numCols = controlPoints[0].length;

    // Dots
    const instanceMesh = new this.THREE.InstancedMesh(
      dotGeo,
      dotMat,
      numRows * numCols
    );
    let idx = 0;
    const dummy = new this.THREE.Object3D();

    controlPoints.forEach((row) => {
      row.forEach((cp) => {
        dummy.position.set(cp.x, cp.y, cp.z);
        dummy.updateMatrix();
        instanceMesh.setMatrixAt(idx++, dummy.matrix);
      });
    });
    instanceMesh.instanceMatrix.needsUpdate = true;
    this.controlHelpersGroup.add(instanceMesh);

    // U Lines
    controlPoints.forEach((row) => {
      const pts = row.map((cp) => new this.THREE.Vector3(cp.x, cp.y, cp.z));
      this.controlHelpersGroup.add(
        new this.THREE.Line(
          new this.THREE.BufferGeometry().setFromPoints(pts),
          lineMat
        )
      );
    });

    // V Lines
    for (let j = 0; j < numCols; j++) {
      const pts = [];
      for (let i = 0; i < numRows; i++) {
        const cp = controlPoints[i][j];
        pts.push(new this.THREE.Vector3(cp.x, cp.y, cp.z));
      }
      this.controlHelpersGroup.add(
        new this.THREE.Line(
          new this.THREE.BufferGeometry().setFromPoints(pts),
          lineMat
        )
      );
    }
  }

  _setupUI() {
      const rebuild = () => this._rebuildTeacup();
      const updateMat = () => this._updateMaterial();

      if (this.params.handleStretch === undefined)
        this.params.handleStretch = 0.6;
      if (this.params.handleReach === undefined) this.params.handleReach = 0.1;
      if (this.params.handleBaseOffset === undefined)
        this.params.handleBaseOffset = 0.0;

      this.paramLimits = {};
      this.uiInputs = {};

      const createSlider = (label, min, max, key, callback = rebuild) => {
        const val = this.params[key] !== undefined ? this.params[key] : 0;
        this.paramLimits[key] = { min, max };

        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = 0.01;
        input.value = val;
        input.style.flexGrow = 1;
        this.uiInputs[key] = input;

        const valDisplay = document.createElement('span');
        valDisplay.style.cssText = "width: 25px; text-align: right; font-size: 10px;";
        valDisplay.textContent = val.toFixed(2);

        input.oninput = () => {
          this.params[key] = parseFloat(input.value);
          valDisplay.textContent = this.params[key].toFixed(2);
          callback();
        };
        input._valDisplay = valDisplay;

        const row = document.createElement('div');
        row.style.cssText = "display: flex; align-items: center; gap: 6px; margin-bottom: 4px;";
        
        const lbl = document.createElement('label');
        lbl.style.cssText = "width: 85px; font-size: 12px;";
        lbl.textContent = label;

        row.appendChild(lbl);
        row.appendChild(input);
        row.appendChild(valDisplay);
        return row;
      };

      const createColorPicker = (label, key) => {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = this.params[key];
        input.style.cssText = "border: none; width: 30px; height: 20px; padding: 0;";
        
        this.uiInputs[key] = input;
        input.oninput = () => {
          this.params[key] = input.value;
          updateMat();
        };

        const row = document.createElement('div');
        row.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;";
        
        const lbl = document.createElement('label');
        lbl.style.fontSize = '12px';
        lbl.textContent = label;

        row.appendChild(lbl);
        row.appendChild(input);
        return row;
      };

      const createSection = (title, children) => {
        const container = document.createElement('div');
        container.style.cssText = "display: none; padding-left: 8px; border-left: 2px solid #444; margin-top: 5px;";
        children.forEach(c => container.appendChild(c));

        const header = document.createElement('div');
        header.style.cssText = "cursor: pointer; font-weight: bold; padding: 4px 0; color: #eee; user-select: none; font-size: 13px;";
        header.innerHTML = `▸ ${title}`;
        
        header.onclick = () => {
          const isOpen = container.style.display === 'block';
          container.style.display = isOpen ? 'none' : 'block';
          header.innerHTML = isOpen ? `▸ ${title}` : `▾ ${title}`;
        };

        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '5px';
        wrapper.appendChild(header);
        wrapper.appendChild(container);
        return wrapper;
      };

      const materialSection = [
        createColorPicker('Color', 'color'),
        createSlider('Metalness', 0, 1, 'metalness', updateMat),
        createSlider('Roughness', 0, 1, 'roughness', updateMat),
        createSlider('Clearcoat', 0, 1, 'clearcoat', updateMat),
        createSlider('Coat Rough', 0, 1, 'clearcoatRoughness', updateMat),
      ];

      const cupSection = [
        createSlider('Height', 0.5, 2.0, 'cupHeight'),
        createSlider('Radius', 0.4, 1.5, 'cupRadius'),
        createSlider('Base Radius', 0.1, 1.0, 'baseRadius'),
        createSlider('Thickness', 0.01, 0.15, 'wallThickness'),
        createSlider('Squaricle', 0.0, 1.0, 'cupSquareness'),
        createSlider('Bulge Pos', 0.1, 0.9, 'bulgeHeight'),
        createSlider('Bulge Amt', 0.8, 1.2, 'bulgeScale'),
      ];

      const handleSection = [
        createSlider('Size', 0.3, 1.5, 'handleSize'),
        createSlider('Stretch', 0.2, 1.5, 'handleStretch'),
        createSlider('Reach', 0.0, 0.6, 'handleReach'),
        createSlider('Vertical Pos', 0.2, 0.9, 'handleVerticalPos'),
        createSlider('Thickness', 0.02, 0.15, 'handleThickness'),
        createSlider('Angle', -15, 30, 'handleAngle'),
        createSlider('Asymmetry', -0.8, 0.8, 'handleAsymmetry'),
        createSlider('Squareness', 0.0, 1.0, 'handleSquareness'),
        createSlider('Sect Shape', 0.0, 1.0, 'sectionSquareness'),
        createSlider('Base Offset', -0.2, 0.5, 'handleBaseOffset'),
      ];

      const wireframeInput = document.createElement('input');
      wireframeInput.type = 'checkbox';
      wireframeInput.checked = this.params.wireframe;
      wireframeInput.onchange = (e) => {
        this.params.wireframe = e.target.checked;
        updateMat();
      };

      const wfLabel = document.createElement('label');
      wfLabel.style.cssText = "display: flex; align-items: center; gap: 6px; font-size: 12px;";
      wfLabel.appendChild(wireframeInput);
      wfLabel.appendChild(document.createTextNode('Show Wireframe'));

      const controlsInput = document.createElement('input');
      controlsInput.type = 'checkbox';
      controlsInput.checked = this.params.showControls;
      controlsInput.onchange = (e) => {
        this.params.showControls = e.target.checked;
        updateMat();
        rebuild();
      };

      const cLabel = document.createElement('label');
      cLabel.style.cssText = "display: flex; align-items: center; gap: 6px; font-size: 12px; margin-top: 5px;";
      cLabel.appendChild(controlsInput);
      cLabel.appendChild(document.createTextNode('Show Control Net'));

      const displaySection = [wfLabel, cLabel];

      const animBtn = document.createElement('button');
      animBtn.className = 'dialog-button primary';
      animBtn.style.cssText = "width: 100%; margin-top: 15px;";
      animBtn.textContent = 'Start Animation';
      animBtn.onclick = (e) => this._toggleAnimation(e.target);

      const content = document.createElement('div');
      content.style.cssText = "color: #ccc; padding: 5px;";
      
      const sec1 = createSection('Material', materialSection);
      const sec2 = createSection('Cup Shape', cupSection);
      const sec3 = createSection('Handle Shape', handleSection);
      const sec4 = createSection('Display', displaySection);

      content.appendChild(sec1);
      content.appendChild(sec2);
      content.appendChild(sec3);
      content.appendChild(sec4);
      content.appendChild(animBtn);

      sec2.children[1].style.display = 'block';
      sec2.children[0].innerHTML = '▾ Cup Shape';
      sec3.children[1].style.display = 'block';
      sec3.children[0].innerHTML = '▾ Handle Shape';

      this.controlsDialog = UITools.makeDialog({
        env: this.env, // Pass environment to automatically bind dialog lifecycle
        title: 'Teacup Factory',
        contentElement: content,
        size: [320, 680],
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
    if (this.animating) {
      this._updateAnimation();
    }

    if (
      !this.app ||
      !this.app.raycaster ||
      !this.app.camera ||
      !this.meshes.length ||
      !this.raycastingEnabled
    ) {
      return;
    }

    if (
      !this.pointer ||
      typeof this.pointer.x !== 'number' ||
      typeof this.pointer.y !== 'number'
    ) {
      return;
    }

    this.app.raycaster.setFromCamera(this.pointer, this.app.camera);
    const intersects = this.app.raycaster.intersectObjects(this.meshes, false);

    if (intersects.length > 0) {
      if (this.intersected !== intersects[0].object) {
        if (this.intersected) {
          this.intersected.material.emissive.setHex(0x110000);
        }
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

  _createBezierKnots(segments) {
    // For Degree 3.
    // Structure: 0,0,0,0, 1,1,1, 2,2,2 ... N,N,N,N
    // Normalized to 0..1
    const knots = [];
    // Start
    knots.push(0, 0, 0, 0);
    // Internal joins (multiplicity 3)
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      knots.push(t, t, t);
    }
    // End
    knots.push(1, 1, 1, 1);
    return knots;
  }

  _toggleAnimation(btn) {
    if (this.animating) {
      // Stop
      this.animating = false;
      btn.textContent = 'Start Animation';
      btn.classList.remove('danger');
      btn.classList.add('primary');

      // Restore original state
      if (this.savedParams) {
        Object.assign(this.params, this.savedParams);
        this.savedParams = null;

        // Update UI to match restored params
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
        this._rebuildTeacup();
      }
    } else {
      // Start
      this.savedParams = JSON.parse(JSON.stringify(this.params));
      this.animating = true;
      btn.textContent = 'Stop Animation';
      btn.classList.remove('primary');
      btn.classList.add('danger');

      // Initialize animation targets
      this.animationData = {};
      for (const key in this.paramLimits) {
        this.animationData[key] = {
          target: this.params[key],
        };
      }

      // Initialize color animation (Hue 0-1)
      const c = new this.THREE.Color(this.params.color);
      const hsl = {};
      c.getHSL(hsl);
      this.animationData.color = { hue: hsl.h };
    }
  }

  _updateAnimation() {
    const lerpSpeed = 0.05;
    let geometryChanged = false;
    let materialChanged = false;

    // Animate Sliders
    for (const key in this.paramLimits) {
      const data = this.animationData[key];
      const limits = this.paramLimits[key];

      // Time to pick new target? (When close to target or randomly)
      if (
        Math.abs(data.target - this.params[key]) < 0.01 ||
        Math.random() < 0.02
      ) {
        // New random target within limits
        data.target = limits.min + Math.random() * (limits.max - limits.min);
      }

      // Interpolate towards target
      const newVal =
        this.params[key] + (data.target - this.params[key]) * lerpSpeed;
      if (Math.abs(newVal - this.params[key]) > 0.0001) {
        this.params[key] = newVal;

        // Update UI elements
        const input = this.uiInputs[key];
        if (input) {
          input.value = newVal;
          if (input._valDisplay)
            input._valDisplay.textContent = newVal.toFixed(2);
        }

        // Determine if we need to rebuild geometry or just update material
        if (
          [
            'metalness',
            'roughness',
            'clearcoat',
            'clearcoatRoughness',
          ].includes(key)
        ) {
          materialChanged = true;
        } else {
          geometryChanged = true;
        }
      }
    }

    // Animate Color (Continuous Hue Rotation for saturation)
    // Standard HSL with L=0.5 and S=1.0 guarantees one channel is 255 and one is 0.
    this.animationData.color.hue += 0.003;
    if (this.animationData.color.hue > 1) this.animationData.color.hue -= 1;

    const c = new this.THREE.Color().setHSL(
      this.animationData.color.hue,
      1.0,
      0.5
    );
    this.params.color = '#' + c.getHexString();
    if (this.uiInputs.color) this.uiInputs.color.value = this.params.color;
    materialChanged = true;

    if (materialChanged) this._updateMaterial();
    if (geometryChanged) this._rebuildTeacup();
  }

  async run(env) {
      if (this.rootElement) this.destroy();

      if (!env || !env.container) {
        throw new Error("[Teacup] run() requires an environment object with a valid container.");
      }

      this.env = env; // Save environment securely
      const parentElement = env.container;
      this.rootElement = parentElement;

      parentElement.style.position = 'relative';
      parentElement.style.width = '100%';
      parentElement.style.height = '100%';
      parentElement.style.overflow = 'hidden';
      parentElement.style.background = '#222';

      const canvasId = 'teacup-canvas-' + Math.random().toString(36).slice(2);
      const canvasContainer = document.createElement('div');
      canvasContainer.id = canvasId;
      canvasContainer.style.cssText = "width: 100%; height: 100%; position: absolute; inset: 0;";
      
      parentElement.appendChild(canvasContainer);
      this.canvasContainer = canvasContainer;

      if (!parentElement._vibesAppResizeObserver && typeof ResizeObserver !== 'undefined') {
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
        cameraPos: { x: 1.8, y: 2.2, z: 2.8 },
        cameraTarget: { x: 0, y: 0.5, z: 0 },
        enableControls: true,
        useRaycaster: true,
        hdrPath: 'https://recursi.dev/thirdparty/three-js-r153/assets/textures/venice_sunset_1k.hdr',
      });

      await this.app.init(canvasContainer);
      if (this.app.scene) {
        this.app.scene.background = null;
      }

      this.THREE = this.app.THREE;

      try {
        const THREE_URL = 'https://recursi.dev/thirdparty/three-js-r153/build/three.module.js';
        const ADDONS = 'https://recursi.dev/thirdparty/three-js-r153/examples/jsm';

        const nurbsUrl = await this.app._fetchAndRewrite(ADDONS + '/curves/NURBSSurface.js', THREE_URL, 1);
        const nurbsMod = await import(nurbsUrl);
        this.app.modules.NURBSSurface = nurbsMod.NURBSSurface;

        const paramUrl = await this.app._fetchAndRewrite(ADDONS + '/geometries/ParametricGeometry.js', THREE_URL, 1);
        const paramMod = await import(paramUrl);
        this.app.modules.ParametricGeometry = paramMod.ParametricGeometry;
      } catch (e) {
        console.error('[Teacup] Failed to load NURBS/Parametric modules:', e);
      }

      this.material = new this.THREE.MeshPhysicalMaterial({
        color: new this.THREE.Color(this.params.color),
        emissive: 0x110000,
        metalness: this.params.metalness,
        roughness: this.params.roughness,
        clearcoat: this.params.clearcoat,
        clearcoatRoughness: this.params.clearcoatRoughness,
        side: this.THREE.DoubleSide,
      });

      this.surfaceGroup = new this.THREE.Group();
      this.controlHelpersGroup = new this.THREE.Group();
      this.controlHelpersGroup.visible = true;

      this.app.add(this.surfaceGroup);
      this.app.add(this.controlHelpersGroup);

      this.pointer = new this.THREE.Vector2();

      this._setupUI();
      this._setupRaycasting();
      this._rebuildTeacup();

      return this;
    }

  destroy() {
    console.log('[Teacup] destroy() called.');
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
    console.log('[Teacup] destroy() complete.');
  }

  
}