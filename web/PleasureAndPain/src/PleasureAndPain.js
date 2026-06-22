class PleasureAndPain {
  getThemeColors() {
      const THREE = this.app.THREE;
      return [
        new THREE.Color(0xff0000), // Red
        new THREE.Color(0x00ff00), // Green
        new THREE.Color(0x0044ff), // Blue
        new THREE.Color(0xffff00), // Yellow
        new THREE.Color(0x8800ff), // Purple
        new THREE.Color(0xff00ff), // Magenta
        new THREE.Color(0x00ffff), // Cyan
      ];
    }

  constructor() {
      this.app = null;
      this.meshes = [];
      this.loadedModel = null;
      this.sharedSphereMaterial = null;

      // Active sequence state
      this.activeSequence = null;

      // Default configuration
      this.gridParams = {
        nx: 10,
        ny: 40,
        nz: 30,
        radius: 0.08,
        spacingFactor: 1.0,
        transparency: 0.4
      };
    }

  

  _assignColorsRandomly() {
      const colors = this.getThemeColors();
      this.meshes.forEach((m) => {
        if (m.userData.locked !== true) {
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          this._ensureUniqueMaterial(m);
          m.material.color.copy(randomColor);
        }
      });
    }

  _setupUI() {
      const feedback = makeElement(
        'div',
        { style: { marginTop: '8px', fontSize: '11px', color: '#aaa', textAlign: 'center' } },
        'Ready.'
      );

      const totalSpheresSpan = makeElement('div', {
        style: {
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#aed',
          marginBottom: '10px',
          textAlign: 'center',
          background: '#333',
          padding: '4px',
          borderRadius: '4px'
        }
      }, `Total Spheres: ${this.meshes.length}`);

      let rebuildTimeout = null;
      const triggerRebuild = (adjustCamera = false) => {
        if (rebuildTimeout) clearTimeout(rebuildTimeout);
        feedback.textContent = 'Calculating...';
        rebuildTimeout = setTimeout(() => {
          this._buildHexagonalGrid(adjustCamera);
          totalSpheresSpan.textContent = `Total Spheres: ${this.meshes.length}`;
          feedback.textContent = `Grid rebuilt.`;
        }, 120);
      };

      const makeSliderRow = (labelText, key, min, max, step, forceCameraRefit = false) => {
        const valSpan = makeElement('span', { style: { float: 'right', fontWeight: 'bold', color: '#fff' } }, this.gridParams[key].toString());
        const label = makeElement('div', { style: { fontSize: '12px', color: '#ccc', marginBottom: '3px' } }, [labelText, valSpan]);
        const slider = makeElement('input', {
          type: 'range',
          min: min.toString(),
          max: max.toString(),
          step: step.toString(),
          value: this.gridParams[key].toString(),
          style: { width: '100%', marginBottom: '8px', accentColor: '#a9dfd1' }
        });
        slider.oninput = (e) => {
          const val = parseFloat(e.target.value);
          this.gridParams[key] = val;
          valSpan.textContent = e.target.value;

          if (key === 'transparency') {
            this._updateSphereOpacity();
          } else {
            triggerRebuild(forceCameraRefit);
          }
        };
        return makeElement('div', { style: { marginBottom: '4px' } }, [label, slider]);
      };

      // Camera adjusts to fit ONLY when counts (nx, ny, nz) change!
      const sliderA = makeSliderRow('Spheres A (X)', 'nx', 1, 40, 1, true);
      const sliderB = makeSliderRow('Spheres B (Y)', 'ny', 1, 50, 1, true);
      const sliderC = makeSliderRow('Spheres C (Z)', 'nz', 1, 45, 1, true);
      const sliderRadius = makeSliderRow('Sphere Radius', 'radius', 0.02, 0.4, 0.01, false);
      const sliderSpacing = makeSliderRow('Spacing Factor', 'spacingFactor', 0.5, 2.0, 0.05, false);
      const sliderTransparency = makeSliderRow('Transparency (Opacity)', 'transparency', 0.05, 1.0, 0.05, false);

      const btnHighlight = makeElement(
        'button',
        {
          style: {
            display: 'block',
            margin: '8px auto 4px auto',
            width: '100%',
            padding: '8px',
            background: '#ffdd00',
            border: 'none',
            borderRadius: '4px',
            color: '#111',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px'
          },
        },
        '🔥 Highlight Sequence'
      );
      btnHighlight.onclick = () => {
        this.triggerHighlightSequence();
        const count = this.activeSequence ? this.activeSequence.adjSpheres.length : 0;
        feedback.textContent = `Highlighted sphere with ${count} neighbors.`;
      };

      const btnRandomize = makeElement(
        'button',
        {
          style: {
            display: 'block',
            margin: '4px auto',
            width: '100%',
            padding: '6px',
            background: '#444',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '11px'
          },
        },
        'Randomize Colors'
      );
      btnRandomize.onclick = () => {
        this._assignColorsRandomly();
        feedback.textContent = 'Vibrant randomized colors applied.';
      };

      const dropZone = makeElement(
        'div',
        {
          id: 'drop-zone',
          style: {
            border: '1px dashed #666',
            borderRadius: '4px',
            padding: '8px',
            textAlign: 'center',
            marginTop: '8px',
            color: '#aaa',
            fontSize: '11px',
            background: '#2b2b2b',
            cursor: 'pointer'
          },
        },
        'Drop GLB to load custom mesh'
      );

      dropZone.ondragover = (event) => {
        event.preventDefault();
        dropZone.style.backgroundColor = '#383838';
        dropZone.style.borderColor = '#888';
      };
      dropZone.ondragleave = () => {
        dropZone.style.backgroundColor = '#2b2b2b';
        dropZone.style.borderColor = '#666';
      };
      dropZone.ondrop = (event) => {
        event.preventDefault();
        dropZone.style.backgroundColor = '#2b2b2b';
        dropZone.style.borderColor = '#666';
        const file = event.dataTransfer.files[0];
        if (file && file.name.toLowerCase().endsWith('.glb')) {
          this._loadGLB(file, feedback);
        } else {
          feedback.textContent = 'Please drop a .glb file.';
        }
      };

      const content = makeElement('div', { style: { padding: '5px' } }, [
        totalSpheresSpan,
        sliderA,
        sliderB,
        sliderC,
        sliderRadius,
        sliderSpacing,
        sliderTransparency,
        btnHighlight,
        btnRandomize,
        dropZone,
        feedback,
      ]);

      this.controlsDialog = UITools.makeDialog({
        env: this.env,
        title: 'Hexagonal Close Packing',
        contentElement: content,
        size: [270, 520],
        position: [20, 40],
        onGeometryChange: (boxInstance, geometry) => {
          if (geometry && geometry.inner) {
            feedback.textContent =
              'size: ' +
              geometry.inner.width.toFixed(0) +
              ' × ' +
              geometry.inner.height.toFixed(0);
          }
        },
      });
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

        const oldMaterial = object.material;
        object.material = newMaterial;
        if (oldMaterial && oldMaterial !== this.sharedSphereMaterial) {
          oldMaterial.dispose();
        }
      }
    }

  

  

  

  

  

  destroy() {
      this.destroyed = true;
      this.cleanupHighlightSequence();

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
        useThickLines: false,
        useRaycaster: false,
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

      // Fit camera on initial build
      this._buildHexagonalGrid(true);
      this._setupUI();

      // Hook up render-update frame callback to drive animations smoothly
      const originalOnUpdate = this.app.onUpdateCallback;
      this.app.onUpdateCallback = () => {
        if (originalOnUpdate) originalOnUpdate();
        this._updateAnimations();
      };

      if (env && typeof env.requestKeystrokeControl === 'function') {
        env.requestKeystrokeControl((active) => {
          this.isKeystrokeCaptureActive = active;
        });
      } else {
        this.isKeystrokeCaptureActive = true;
      }

      window.threeApp = this.app;
      window.basic3d = this;

      return this;
    }

  onResize(width, height) {
      if (this.app && typeof this.app.resize === 'function') {
        this.app.resize(width, height);
      }
    }

  

  _buildHexagonalGrid(adjustCamera = false) {
      this.cleanupHighlightSequence();
      this._clearSceneGeometry();
      
      const result = Simple3dShapes.buildHexagonalGrid(
        this.app,
        this.gridParams.nx,
        this.gridParams.ny,
        this.gridParams.nz,
        this.gridParams.radius,
        this.gridParams.spacingFactor,
        this.gridParams.transparency
      );
      this.meshes.push(...result.meshes);
      this.sharedSphereMaterial = result.sharedMaterial;
      this.bbox = result.bbox;
      
      if (adjustCamera) {
        this._adjustCameraToFit(result.bbox);
      }
    }

  _adjustCameraToFit(bbox) {
      const THREE = this.app.THREE;
      if (!bbox) return;
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 1.0);

      const fov = this.app.camera.fov * (Math.PI / 180);
      let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraDistance *= 1.6; // framing margin

      this.app.camera.position.set(maxDim * 0.9, maxDim * 0.8, cameraDistance);
      if (this.app.controls) {
        this.app.controls.target.set(0, 0, 0);
        this.app.controls.update();
      }
    }

  _ensureUniqueMaterial(mesh) {
      if (mesh.material === this.sharedSphereMaterial) {
        mesh.material = this.sharedSphereMaterial.clone();
      }
    }

  getAdjacentSpheres(targetMesh) {
      // Find neighboring spheres in close-packed distance threshold
      const D = 2 * this.gridParams.radius * this.gridParams.spacingFactor;
      const tolerance = D * 1.15; // slightly larger for floating point tolerance
      const neighbors = [];
      const targetPos = targetMesh.position;

      this.meshes.forEach((mesh) => {
        if (mesh !== targetMesh) {
          const dist = targetPos.distanceTo(mesh.position);
          if (dist < tolerance) {
            neighbors.push(mesh);
          }
        }
      });
      return neighbors;
    }

  

  

  

  _updateSphereOpacity() {
      const val = this.gridParams.transparency;
      const isTransparent = val < 1.0;

      if (this.sharedSphereMaterial) {
        this.sharedSphereMaterial.transparent = isTransparent;
        this.sharedSphereMaterial.opacity = val;
        this.sharedSphereMaterial.needsUpdate = true;
      }

      this.meshes.forEach((mesh) => {
        // Only touch non-active sequence meshes
        const inActiveSeq = this.activeSequence && (
          mesh === this.activeSequence.centerSphere ||
          this.activeSequence.adjSpheres.includes(mesh)
        );
        if (!inActiveSeq) {
          mesh.material.transparent = isTransparent;
          mesh.material.opacity = val;
        }
      });
    }

  findAdjacentSpheres(targetMesh) {
      const D = 2 * this.gridParams.radius * this.gridParams.spacingFactor;
      // Define a tight range to find touching neighbors in the HCP crystal structure
      const minDistance = D * 0.85;
      const maxDistance = D * 1.15;
      const neighbors = [];
      const targetPos = targetMesh.position;

      this.meshes.forEach((mesh) => {
        if (mesh !== targetMesh) {
          const dist = targetPos.distanceTo(mesh.position);
          if (dist >= minDistance && dist <= maxDistance) {
            neighbors.push(mesh);
          }
        }
      });
      return neighbors;
    }

  triggerHighlightSequence() {
      if (this.meshes.length === 0) return;
      this.cleanupHighlightSequence();

      const THREE = this.app.THREE;
      const centerSphere = this.meshes[Math.floor(Math.random() * this.meshes.length)];
      const adjSpheres = this.findAdjacentSpheres(centerSphere);

      // Make sure all target meshes have unique cloned materials to avoid affecting other spheres
      this._ensureUniqueMaterial(centerSphere);
      adjSpheres.forEach(m => this._ensureUniqueMaterial(m));

      // Save initial state so we can restore perfectly later
      const centerBaseColor = centerSphere.material.color.clone();
      const neighborBaseColors = adjSpheres.map(m => m.material.color.clone());

      this.activeSequence = {
        startTime: performance.now(),
        centerSphere: centerSphere,
        adjSpheres: adjSpheres,
        centerBaseColor: centerBaseColor,
        neighborBaseColors: neighborBaseColors,
        baseOpacity: this.gridParams.transparency
      };
    }

  _updateAnimations() {
      if (!this.activeSequence) return;

      const THREE = this.app.THREE;
      const seq = this.activeSequence;
      const elapsed = (performance.now() - seq.startTime) / 1000; // in seconds

      // Phase 1: 0.0s to 1.0s -> Center sphere scales up and turns yellow
      if (elapsed <= 1.0) {
        const t = elapsed / 1.0;
        const scale = THREE.MathUtils.lerp(1.0, 2.2, t);
        seq.centerSphere.scale.setScalar(scale);

        seq.centerSphere.material.color.lerpColors(seq.centerBaseColor, new THREE.Color(0xffff00), t);
        seq.centerSphere.material.opacity = THREE.MathUtils.lerp(seq.baseOpacity, 1.0, t);
        seq.centerSphere.material.transparent = seq.centerSphere.material.opacity < 1.0;
      }
      // Phase 2: 1.0s to 2.5s -> Center sphere shrinks back down, neighbors become solid orange
      else if (elapsed <= 2.5) {
        // 1. Restore center sphere
        const tCenter = Math.min((elapsed - 1.0) / 0.5, 1.0); // complete center transition in 0.5s
        const scale = THREE.MathUtils.lerp(2.2, 1.0, tCenter);
        seq.centerSphere.scale.setScalar(scale);

        seq.centerSphere.material.color.lerpColors(new THREE.Color(0xffff00), seq.centerBaseColor, tCenter);
        seq.centerSphere.material.opacity = THREE.MathUtils.lerp(1.0, seq.baseOpacity, tCenter);
        seq.centerSphere.material.transparent = seq.centerSphere.material.opacity < 1.0;

        // 2. Turn adjacent spheres orange and opaque
        const tAdj = Math.min((elapsed - 1.0) / 0.4, 1.0); // complete neighbor fade-in in 0.4s
        seq.adjSpheres.forEach((m, idx) => {
          const originalColor = seq.neighborBaseColors[idx];
          m.material.color.lerpColors(originalColor, new THREE.Color(0xff6600), tAdj);
          m.material.opacity = THREE.MathUtils.lerp(seq.baseOpacity, 1.0, tAdj);
          m.material.transparent = m.material.opacity < 1.0;
        });
      }
      // Phase 3: 2.5s to 4.0s -> Adjacent spheres fade smoothly back to original translucent state
      else if (elapsed <= 4.0) {
        const tFade = (elapsed - 2.5) / 1.5; // smooth 1.5s fade-out
        seq.adjSpheres.forEach((m, idx) => {
          const originalColor = seq.neighborBaseColors[idx];
          m.material.color.lerpColors(new THREE.Color(0xff6600), originalColor, tFade);
          m.material.opacity = THREE.MathUtils.lerp(1.0, seq.baseOpacity, tFade);
          m.material.transparent = m.material.opacity < 1.0;
        });
      }
      // Sequence completed
      else {
        this.cleanupHighlightSequence();
      }
    }

  cleanupHighlightSequence() {
      if (this.activeSequence) {
        const seq = this.activeSequence;

        // Restore center
        if (seq.centerSphere) {
          seq.centerSphere.scale.setScalar(1.0);
          seq.centerSphere.material.color.copy(seq.centerBaseColor);
          seq.centerSphere.material.opacity = seq.baseOpacity;
          seq.centerSphere.material.transparent = seq.baseOpacity < 1.0;
        }

        // Restore neighbors
        if (seq.adjSpheres) {
          seq.adjSpheres.forEach((m, idx) => {
            const originalColor = seq.neighborBaseColors[idx];
            m.material.color.copy(originalColor);
            m.material.opacity = seq.baseOpacity;
            m.material.transparent = seq.baseOpacity < 1.0;
          });
        }

        this.activeSequence = null;
      }
    }
}