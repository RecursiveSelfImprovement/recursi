
class OrbitPivotControls {
  constructor(app) {
    this.app = app;
    this.enabled = true;

    // State
    this.isShiftDown = false;
    this.mode = 'pivot';
    this.scrollSpeedMultiplier = 1.0;

    // Tap Detection
    this.lastShiftUpTime = 0;
    this.tapCount = 0;

    // Data
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.pivotDist = 10;
    this.hue = 0;

    // EXPERIMENTAL STATE
    this.depthMode = 'box';
    this.savedCameraState = { near: 0.1, far: 1000 };
    this.isClipping = false;
    this._limitsRelaxed = false;

    // Oscillation
    this.oscillationTargetAmp = 0;
    this.oscillationCurrentAmp = 0;
    this.oscillationAngle = 0;
    this.lastOffsetVector = new THREE.Vector3();
    this.oscillationPaused = false;
    this.isZooming = false;
    this.zoomTimeout = null;

    // Config
    this.activationScreenFrac = 0.15;
    this._visualScale = 1.0;
    this._lastAspect = 0;

    // Default thickness
    this.boxDepthRatio = 1.0;

    // --- VISUALS GROUP ---
    this.visualGroup = new THREE.Group();
    this.visualGroup.visible = false;
    this.visualGroup.renderOrder = 0;
    this.app.scene.add(this.visualGroup);

    // Sub-groups
    this.boxVisuals = new THREE.Group();
    this.plateVisuals = new THREE.Group();
    this.visualGroup.add(this.boxVisuals);
    this.visualGroup.add(this.plateVisuals);

    this._buildAllVisuals();

    // --- UI ELEMENTS ---
    this._createLabel();
    this._createStopButton();
    // REMOVED: _createExperimentDialog call

    // --- EVENTS ---
    this._boundMouseMove = (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', this._boundMouseMove);

    const dom = this.app.renderer.domElement;
    this._boundOnWheel = this._onWheel.bind(this);
    dom.addEventListener('wheel', this._boundOnWheel, { passive: false });

    this._boundOnKey = this._onKey.bind(this);
    window.addEventListener('keydown', this._boundOnKey);
    window.addEventListener('keyup', this._boundOnKey);
  }

  _build3DVisuals() {
    // 1. Main Plate (Geometry built in _updateVisualGeometry)
    // Depth Test TRUE allows it to slice through geometry
    this.mainMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
      })
    );
    this.visualGroup.add(this.mainMesh);

    // 2. Outline (Geometry built in _updateVisualGeometry)
    this.outlineMesh = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 1.0,
        depthTest: true,
        depthWrite: false,
      })
    );
    this.visualGroup.add(this.outlineMesh);

    // 3. Crosshair
    const tick = 0.15;
    const pts = [-tick, 0, 0, tick, 0, 0, 0, -tick, 0, 0, tick, 0];
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));

    this.crosshairMesh = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
        depthTest: false, // Crosshair always visible
        depthWrite: false,
      })
    );
    this.crosshairMesh.position.z = 0.0001; // Tiny offset
    this.visualGroup.add(this.crosshairMesh);
  }

  _addCrosshairs(tickSize) {
    const positions = [
      -tickSize,
      0,
      0,
      tickSize,
      0,
      0,
      0,
      -tickSize,
      0,
      0,
      tickSize,
      0,
    ];
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.crosshairMesh = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
        depthTest: true,
        depthWrite: false,
      })
    );
    this.visualGroup.add(this.crosshairMesh);
  }

  reset() {
    // Clean up all transient state when orbit mode is toggled off
    this.visualGroup.visible = false;
    this.isShiftDown = false;
    this.mode = "pivot";
    this.oscillationPaused = false;
    this.oscillationTargetAmp = 0;
    this.oscillationCurrentAmp = 0;
    this.lastOffsetVector.set(0, 0, 0);
    this.isZooming = false;
    this.pivotDist = 10;
    this.label.style.opacity = 0;

    // Restore camera clipping if it was modified
    if (this.isClipping) {
      this.app.camera.near = this.savedCameraState.near;
      this.app.camera.far = this.savedCameraState.far;
      this.app.camera.updateProjectionMatrix();
      this.isClipping = false;
    }

    // Re-enable zoom on controls
    if (this.app.controls) this.app.controls.enableZoom = true;
  }

    update() {
    // 1. Ensure zoom limits are relaxed
    if (!this._limitsRelaxed && this.app.controls) {
      this.app.controls.minDistance = 0.01;
      this._limitsRelaxed = true;
    }

    if (this.lastOffsetVector.lengthSq() > 0) {
      this.app.camera.position.sub(this.lastOffsetVector);
    }

    // Oscillation Physics
    this.oscillationCurrentAmp +=
      (this.oscillationTargetAmp - this.oscillationCurrentAmp) * 0.05;
    const hasAmp = this.oscillationCurrentAmp > 0.001;

    if (this.oscillationTargetAmp > 0.01) {
      this.oscillationToggle.style.opacity = '1';
      this.oscillationToggle.style.pointerEvents = 'auto';
    } else {
      this.oscillationToggle.style.opacity = '0';
      this.oscillationToggle.style.pointerEvents = 'none';
    }

    if (hasAmp) {
      // If paused via Shift (pivot/perspective/speed), rigid lock.
      // NOTE: Perspective Zoom handles its own recalculation in the scroll handler
      if (this.oscillationPaused) {
        this.app.camera.position.add(this.lastOffsetVector);
      } else {
        this.lastOffsetVector.set(0, 0, 0);
        this._calculateNewOscillationOffset();
        this.app.camera.position.add(this.lastOffsetVector);
      }
    } else {
      this.lastOffsetVector.set(0, 0, 0);
    }

    // Visuals & Color Cycling
    if (this.mode === 'pivot' && this.visualGroup.visible) {
      this.visualGroup.quaternion.copy(this.app.camera.quaternion);
      this._updatePivotPosition();

      // Color Cycle
      this.hue = (this.hue + 0.0008) % 1;
      const c = new THREE.Color().setHSL(this.hue, 0.85, 0.55);

      this.boxEdges.material.color.copy(c);
      this.boxMain.material.color.setHSL(this.hue, 0.85, 0.35);
      this.plateOutline.material.color.copy(c);
      this.plateMesh.material.color.setHSL(this.hue, 0.85, 0.45);

      const aspect = window.innerWidth / window.innerHeight;

      if (this.depthMode === 'box') {
        this.boxVisuals.visible = true;
        this.plateVisuals.visible = false;

        this.visualGroup.scale.set(
          this._visualScale * aspect,
          this._visualScale,
          this._visualScale * this.boxDepthRatio
        );
      } else {
        // Plate Modes
        this.boxVisuals.visible = false;
        this.plateVisuals.visible = true;

        this._updatePlateGeometry(aspect);
        this.visualGroup.scale.set(this._visualScale, this._visualScale, 1);
      }

      this._updateLabelScreenPosition();
    }
  }

  _calculateNewOscillationOffset() {
    const cam = this.app.camera;
    const target = this.app.controls
      ? this.app.controls.target
      : new THREE.Vector3();
    const lookVec = new THREE.Vector3().subVectors(cam.position, target);
    const dist = lookVec.length();
    const zAxis = lookVec.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

    // Pause ANGLE update if zoomed or paused, but allow radius update
    if (!this.isZooming && !this.oscillationPaused) {
      const speed = 0.005 + this.oscillationCurrentAmp * 0.002;
      this.oscillationAngle += speed;
    }

    const radius = this.oscillationCurrentAmp * (dist * 0.1);
    const offsetX = xAxis.multiplyScalar(
      Math.cos(this.oscillationAngle) * radius
    );
    const offsetY = yAxis.multiplyScalar(
      Math.sin(this.oscillationAngle) * radius
    );
    this.lastOffsetVector.addVectors(offsetX, offsetY);
  }

  _updateLabelScreenPosition() {
      const pivotPos = this.visualGroup.position.clone();
      pivotPos.project(this.app.camera);
      
      const container = window.projectApp ? window.projectApp.rootElement : document.body;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      
      const x = (pivotPos.x * 0.5 + 0.5) * w;
      const y = (-(pivotPos.y * 0.5) + 0.5) * h;
      this.label.style.left = `${x}px`;
      this.label.style.top = `${y + 60}px`;
    }

  _setLabel(main, color = '#eee', sub = null) {
    this.label.firstChild.textContent = main;
    this.label.lastChild.textContent = sub || 'Double-tap Shift to change mode';
    this.label.style.color = color;
    this.label.style.opacity = 1;
    if (this.mode !== 'pivot') {
      this.label.style.top = '15%';
      this.label.style.left = '50%';
    }
    if (this._labelTimer) clearTimeout(this._labelTimer);
  }

  _onKey(e) {
    if (e.key !== 'Shift') return;
    const now = Date.now();

    if (e.type === 'keydown') {
      if (!this.isShiftDown) {
        this.isShiftDown = true;

        // GLOBAL PAUSE when Shift is down
        this.oscillationPaused = true;

        if (now - this.lastShiftUpTime < 350) {
          this.tapCount++;
        } else {
          this.tapCount = 1;
          this.mode = 'pivot';
          this._setLabel('Scroll to adjust depth', '#eee');
          this.label.style.top = '15%';
          this.label.style.left = '50%';
          this._labelTimer = setTimeout(() => {
            this.label.style.opacity = 0;
          }, 2000);
        }

        if (this.tapCount === 2) this._switchMode('oscillation');
        else if (this.tapCount === 3) this._switchMode('perspective');
        else if (this.tapCount === 4) this._switchMode('scrollSpeed');
        else if (this.tapCount > 4) {
          this.tapCount = 1;
          this._switchMode('pivot');
        }

        if (this.app.controls) this.app.controls.enableZoom = false;
      }
    } else if (e.type === 'keyup') {
      this.isShiftDown = false;
      this.lastShiftUpTime = now;
      this.oscillationPaused = false;

      if (this.isClipping) this._commitPivot();
      else if (this.mode === 'pivot' && this.visualGroup.visible)
        this._commitPivot();

      if (this.app.controls) this.app.controls.enableZoom = true;
    }
  }

  _switchMode(newMode) {
    this.mode = newMode;
    this.visualGroup.visible = this.mode === 'pivot';
    let text = '',
      col = '#fff',
      sub = 'Scroll to adjust';

    if (this.mode === 'perspective') {
      text = `Perspective (${Math.round(this.app.camera.fov)}°)`;
      col = '#d0f';
      sub = '';
    } else if (this.mode === 'oscillation') {
      const percent = (this.oscillationTargetAmp / 5.0) * 100;
      text = `Oscillation: ${percent.toFixed(0)}`;
      col = '#fa0';
      sub = '';
    } else if (this.mode === 'scrollSpeed') {
      text = `Scroll Speed (${this.scrollSpeedMultiplier.toFixed(2)}x)`;
      col = '#0ff';
      sub = 'Affects all modes';
    } else {
      text = 'Depth Mode';
      col = '#eee';
    }

    this._setLabel(text, col, sub);
    this._labelTimer = setTimeout(() => {
      this.label.style.opacity = 0;
    }, 1500);
  }

  _onWheel(e) {
    if (!this.isShiftDown) {
      this.isZooming = true;
      if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
      this.zoomTimeout = setTimeout(() => {
        this.isZooming = false;
      }, 250);
      return;
    }

    e.preventDefault();
    let delta = e.deltaX || e.deltaY || 0;
    if (Math.abs(delta) < 1) return;

    if (this.mode === 'perspective') this._handlePerspectiveScroll(delta);
    else if (this.mode === 'oscillation') this._handleOscillationScroll(delta);
    else if (this.mode === 'scrollSpeed') this._handleScrollSpeedScroll(delta);
    else this._handlePivotScroll(delta);
  }

  _handleOscillationScroll(delta) {
    const sensitivity = 0.001 * this.scrollSpeedMultiplier;
    this.oscillationTargetAmp -= delta * sensitivity;
    this.oscillationTargetAmp = Math.max(
      0,
      Math.min(5.0, this.oscillationTargetAmp)
    );
    const percent = (this.oscillationTargetAmp / 5.0) * 100;
    this._setLabel(`Oscillation: ${percent.toFixed(0)}`, '#fa0', '');
    if (this._labelTimer) clearTimeout(this._labelTimer);
    this._labelTimer = setTimeout(() => {
      this.label.style.opacity = 0;
    }, 1000);
  }

  _handleFovScroll(delta) {
    const cam = this.app.camera;
    const fov = cam.fov;

    if (!this.pivotDist) {
      const target = this.app.controls
        ? this.app.controls.target
        : new THREE.Vector3();
      this.pivotDist = this.app.camera.position.distanceTo(target);
    }

    const dist = this.pivotDist;
    const deg2rad = Math.PI / 180;
    const visibleHeight = 2 * dist * Math.tan((fov * deg2rad) / 2);

    const zoomSpeed = 0.25;
    let newFov = fov + (delta > 0 ? zoomSpeed * 5 : -zoomSpeed * 5);
    newFov = Math.max(1, Math.min(120, newFov));

    if (Math.abs(newFov - fov) < 0.01) return;

    const newDist = visibleHeight / (2 * Math.tan((newFov * deg2rad) / 2));

    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);

    const pivotPoint = cam.position
      .clone()
      .add(dir.clone().multiplyScalar(dist));
    const newPos = pivotPoint.clone().sub(dir.clone().multiplyScalar(newDist));

    cam.position.copy(newPos);
    cam.fov = newFov;
    cam.updateProjectionMatrix();

    this.pivotDist = newDist;

    this._setLabel(`FOV: ${newFov.toFixed(1)}°`, '#e050ff', 'Dolly Zoom');
    if (this._labelTimer) clearTimeout(this._labelTimer);
    this._labelTimer = setTimeout(() => (this.label.style.opacity = 0), 1000);
  }

  _handlePivotScroll(delta) {
    // Initial Activation
    if (!this.visualGroup.visible) {
      this.visualGroup.visible = true;
      this.raycaster.setFromCamera(this.mouse, this.app.camera);
      const camDir = new THREE.Vector3();
      this.app.camera.getWorldDirection(camDir);

      const target = this.app.controls.target.clone();
      this.pivotDist = this.app.camera.position.distanceTo(target);

      this._updateVisualScale(this.pivotDist);

      if (this.depthMode === 'plate_clip') {
        this.isClipping = true;
        this.savedCameraState.near = this.app.camera.near;
        this.savedCameraState.far = this.app.camera.far;
      }
    }

    const sensitivity = 0.0006 * this.scrollSpeedMultiplier;
    const factor = Math.exp(-delta * sensitivity);
    this.pivotDist *= factor;
    this.pivotDist = Math.max(0.2, Math.min(300, this.pivotDist));

    // Update Camera Clipping
    if (this.isClipping) {
      // Visual Box Thickness logic = visualScale * ratio
      const boxThick = this._visualScale * this.boxDepthRatio;

      // Clip range is 3x Box Thickness
      const clipRange = boxThick * 3;

      const near = Math.max(0.01, this.pivotDist - clipRange / 2);
      const far = this.pivotDist + clipRange / 2;

      this.app.camera.near = near;
      this.app.camera.far = far;
      this.app.camera.updateProjectionMatrix();
    }

    this._setLabel(`Depth: ${this.pivotDist.toFixed(2)}`, '#eee');
  }

  _updatePivotPosition() {
    const cam = this.app.camera;
    this.raycaster.setFromCamera(this.mouse, cam);
    const ray = this.raycaster.ray;
    const normal = new THREE.Vector3();
    cam.getWorldDirection(normal);
    const cosAngle = ray.direction.dot(normal);
    if (Math.abs(cosAngle) < 0.0001) return;
    const t = this.pivotDist / cosAngle;
    const pos = ray.origin.clone().add(ray.direction.clone().multiplyScalar(t));
    this.visualGroup.position.copy(pos);
  }

  _updateVisualScale(dist) {
    const cam = this.app && this.app.camera;
    if (!cam || !cam.isPerspectiveCamera) {
      this._visualScale = 2.2;
      return;
    }
    const d = dist != null && isFinite(dist) ? dist : null;
    if (!d || d <= 0) return;
    const fovRad = (cam.fov * Math.PI) / 180;
    this._visualScale =
      2 * d * Math.tan(fovRad / 2) * this.activationScreenFrac;
  }

  _commitPivot() {
    const cam = this.app.camera;

    if (this.isClipping) {
      cam.near = this.savedCameraState.near;
      cam.far = this.savedCameraState.far;
      cam.updateProjectionMatrix();
      this.isClipping = false;
    }

    const lookDir = new THREE.Vector3();
    cam.getWorldDirection(lookDir);
    const newTarget = cam.position
      .clone()
      .add(lookDir.multiplyScalar(this.pivotDist));
    if (this.app.controls) {
      this.app.controls.target.copy(newTarget);
      this.app.controls.update();
    }
    this._setLabel(
      `Depth set to ${this.pivotDist.toFixed(2)}`,
      '#88ff88',
      'Orbit Center Updated'
    );
    this.visualGroup.visible = false;
    this.pivotDist = null;
    this._labelTimer = setTimeout(() => {
      this.label.style.opacity = 0;
    }, 1200);
  }

  _handleScrollSpeedScroll(delta) {
    const sensitivity = 0.002;
    this.scrollSpeedMultiplier -= delta * sensitivity;
    this.scrollSpeedMultiplier = Math.max(
      0.33,
      Math.min(3.0, this.scrollSpeedMultiplier)
    );
    this._setLabel(
      `Scroll Speed: ${this.scrollSpeedMultiplier.toFixed(2)}x`,
      '#0ff',
      'Affects all modes'
    );
    if (this._labelTimer) clearTimeout(this._labelTimer);
    this._labelTimer = setTimeout(() => {
      this.label.style.opacity = 0;
    }, 1200);
  }

  _handlePerspectiveScroll(delta) {
    // 1. Temporarily UN-OFFSET the camera so we operate on the base position
    if (this.oscillationCurrentAmp > 0) {
      this.app.camera.position.sub(this.lastOffsetVector);
    }

    this.isZooming = true;
    if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
    this.zoomTimeout = setTimeout(() => {
      this.isZooming = false;
    }, 250);

    const cam = this.app.camera;
    const fov = cam.fov;
    const target = this.app.controls
      ? this.app.controls.target
      : new THREE.Vector3();
    this.pivotDist = cam.position.distanceTo(target);

    const dist = this.pivotDist;
    const deg2rad = Math.PI / 180;
    const visibleHeight = 2 * dist * Math.tan((fov * deg2rad) / 2);

    const zoomSpeed = 0.25 * this.scrollSpeedMultiplier;
    let newFov = fov + (delta > 0 ? zoomSpeed * 5 : -zoomSpeed * 5);
    newFov = Math.max(1, Math.min(160, newFov));

    if (Math.abs(newFov - fov) > 0.01) {
      let newDist = visibleHeight / (2 * Math.tan((newFov * deg2rad) / 2));
      const minLimit = 0.001;
      if (newDist >= minLimit && newDist <= 500) {
        const dir = new THREE.Vector3();
        cam.getWorldDirection(dir);
        const pivotPoint = cam.position
          .clone()
          .add(dir.clone().multiplyScalar(dist));
        const newPos = pivotPoint
          .clone()
          .sub(dir.clone().multiplyScalar(newDist));

        cam.position.copy(newPos);
        cam.fov = newFov;
        cam.updateProjectionMatrix();
        this.pivotDist = newDist;
      }
    }

    // 2. RE-OFFSET the camera with updated radius (angle frozen by isZooming/oscillationPaused)
    if (this.oscillationCurrentAmp > 0) {
      this.lastOffsetVector.set(0, 0, 0);
      this._calculateNewOscillationOffset(); // Recalcs radius for new dist
      this.app.camera.position.add(this.lastOffsetVector);
    }

    this._setLabel(`Perspective: ${newFov.toFixed(1)}°`, '#e050ff', '');
    if (this._labelTimer) clearTimeout(this._labelTimer);
    this._labelTimer = setTimeout(() => (this.label.style.opacity = 0), 1000);
  }

  _updateVisualGeometry(aspect) {
    if (this._lastAspect && Math.abs(this._lastAspect - aspect) < 0.01) return;
    this._lastAspect = aspect;

    if (this.mainMesh.geometry) this.mainMesh.geometry.dispose();
    if (this.outlineMesh.geometry) this.outlineMesh.geometry.dispose();

    // Dimensions: Width = aspect, Height = 1.0
    const w = aspect;
    const h = 1.0;
    const r = 0.15; // Corner radius

    const shape = new THREE.Shape();

    // Start Top Center
    shape.moveTo(0, h / 2);

    // Top Edge -> Top Right Corner
    shape.lineTo(w / 2 - r, h / 2);
    // Arc: Center (w/2-r, h/2-r). 90deg (PI/2) -> 0deg. Clockwise.
    shape.absarc(w / 2 - r, h / 2 - r, r, Math.PI / 2, 0, true);

    // Right Edge -> Bottom Right Corner
    shape.lineTo(w / 2, -h / 2 + r);
    // Arc: 0deg -> -90deg (-PI/2). Clockwise.
    shape.absarc(w / 2 - r, -h / 2 + r, r, 0, -Math.PI / 2, true);

    // Bottom Edge -> Bottom Left Corner
    shape.lineTo(-w / 2 + r, -h / 2);
    // Arc: -90deg -> -180deg (-PI). Clockwise.
    shape.absarc(-w / 2 + r, -h / 2 + r, r, -Math.PI / 2, -Math.PI, true);

    // Left Edge -> Top Left Corner
    shape.lineTo(-w / 2, h / 2 - r);
    // Arc: -180deg (PI) -> -270deg (PI/2). Clockwise.
    shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI, Math.PI / 2, true);

    this.mainMesh.geometry = new THREE.ShapeGeometry(shape);
    const points = shape.getPoints();
    this.outlineMesh.geometry = new THREE.BufferGeometry().setFromPoints(
      points
    );
  }

  _createLabel() {
      this.label = makeElement(
        'div',
        {
          style: {
            position: 'absolute',
            top: '0px',
            left: '0px',
            transform: 'translate(-50%, 0)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '13px',
            fontFamily: 'monospace',
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 10000,
            opacity: 0,
            transition: 'opacity 0.2s ease',
            backgroundColor: 'rgba(5, 5, 5, 0.75)',
            color: '#eee',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        },
        makeElement(
          'div',
          { className: 'opc-main-text' },
          'Set viewing depth...'
        ),
        makeElement(
          'div',
          {
            className: 'opc-sub-text',
            style: {
              fontSize: '9px',
              color: '#888',
              marginTop: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            },
          },
          'Double-tap Shift to change mode'
        )
      );
      const container = window.projectApp ? window.projectApp.rootElement : document.body;
      container.appendChild(this.label);
    }

  _createStopButton() {
      this.oscillationToggle = makeElement(
        'button',
        {
          style: {
            position: 'absolute',
            bottom: '15px',
            left: '15px',
            padding: '4px 8px',
            backgroundColor: 'rgba(30, 30, 30, 0.5)',
            color: '#aaa',
            border: '1px solid rgba(80,80,80,0.3)',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 10000,
            fontWeight: 'normal',
            fontSize: '10px',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            opacity: '0',
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease, background-color 0.2s',
          },
          onclick: () => {
            this.oscillationTargetAmp = 0;
            this.oscillationCurrentAmp = 0;
            if (this.mode === 'oscillation')
              this._setLabel(`Oscillation: 0`, '#fa0', '');
          },
          onmouseenter: (e) => {
            e.target.style.backgroundColor = 'rgba(50, 50, 50, 0.8)';
            e.target.style.color = '#fff';
          },
          onmouseleave: (e) => {
            e.target.style.backgroundColor = 'rgba(30, 30, 30, 0.5)';
            e.target.style.color = '#aaa';
          },
        },
        'Stop Oscillation'
      );
      const container = window.projectApp ? window.projectApp.rootElement : document.body;
      container.appendChild(this.oscillationToggle);
    }

  _buildAllVisuals() {
    // --- 1. BOX VISUALS (Sharp Edges) ---
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    this.boxMain = new THREE.Mesh(
      boxGeo,
      new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
      })
    );

    this.boxEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeo),
      new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 1.0,
        depthTest: true,
        depthWrite: false,
      })
    );

    this.boxVisuals.add(this.boxMain);
    this.boxVisuals.add(this.boxEdges);

    // Box Crosshair
    const bTick = 0.2;
    const bPos = [
      -bTick,
      0,
      0,
      bTick,
      0,
      0,
      0,
      -bTick,
      0,
      0,
      bTick,
      0,
      0,
      0,
      -bTick,
      0,
      0,
      bTick,
    ];
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3));
    this.boxCross = new THREE.LineSegments(
      bGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true })
    );
    this.boxVisuals.add(this.boxCross);

    // --- 2. PLATE VISUALS (Rounded) ---
    this.plateMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
      })
    );
    this.plateVisuals.add(this.plateMesh);

    this.plateOutline = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 1.0,
        depthTest: true,
        depthWrite: false,
      })
    );
    this.plateVisuals.add(this.plateOutline);

    const pTick = 0.15;
    const pPos = [-pTick, 0, 0, pTick, 0, 0, 0, -pTick, 0, 0, pTick, 0];
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
    this.plateCross = new THREE.LineSegments(
      pGeo,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
        depthTest: false,
      })
    );
    this.plateCross.position.z = 0.0001;
    this.plateVisuals.add(this.plateCross);
  }

  _updatePlateGeometry(aspect) {
    if (this._lastAspect && Math.abs(this._lastAspect - aspect) < 0.01) return;
    this._lastAspect = aspect;

    if (this.plateMesh.geometry) this.plateMesh.geometry.dispose();
    if (this.plateOutline.geometry) this.plateOutline.geometry.dispose();

    const w = aspect;
    const h = 1.0;
    const r = 0.15;

    const shape = new THREE.Shape();
    shape.moveTo(0, h / 2);
    shape.lineTo(w / 2 - r, h / 2);
    shape.absarc(w / 2 - r, h / 2 - r, r, Math.PI / 2, 0, true);
    shape.lineTo(w / 2, -h / 2 + r);
    shape.absarc(w / 2 - r, -h / 2 + r, r, 0, -Math.PI / 2, true);
    shape.lineTo(-w / 2 + r, -h / 2);
    shape.absarc(-w / 2 + r, -h / 2 + r, r, -Math.PI / 2, -Math.PI, true);
    shape.lineTo(-w / 2, h / 2 - r);
    shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI, Math.PI / 2, true);
    shape.lineTo(0, h / 2);

    this.plateMesh.geometry = new THREE.ShapeGeometry(shape);
    const points = shape.getPoints();
    this.plateOutline.geometry = new THREE.BufferGeometry().setFromPoints(
      points
    );
  }

}

