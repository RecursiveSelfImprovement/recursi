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
      this.sharedNeuronMaterial = null;

      // Active sequence state
      this.activeSequence = null;

      // Toggle states
      this.colorsRandomized = false;
      this.strengthRandomized = false;
      this.bloomEnabled = false;
      this.composer = null;

      // Default configuration
      this.gridParams = {
        nx: 10,
        ny: 40,
        nz: 30,
        radius: 0.08,
        transparency: 0.6
      };
    }

  

  

  _setupUI() {
      const feedback = makeElement(
        'div',
        { style: { marginTop: '8px', fontSize: '11px', color: '#aaa', textAlign: 'center' } },
        'Ready.'
      );

      const totalNeuronsSpan = makeElement('div', {
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
      }, `Total Neurons: ${this.meshes.length}`);

      let rebuildTimeout = null;
      const triggerRebuild = () => {
        if (rebuildTimeout) clearTimeout(rebuildTimeout);
        feedback.textContent = 'Calculating...';
        rebuildTimeout = setTimeout(() => {
          this._buildHexagonalGrid(false);
          totalNeuronsSpan.textContent = `Total Neurons: ${this.meshes.length}`;
          feedback.textContent = `Network rebuilt.`;
        }, 120);
      };

      const makeSliderRow = (labelText, key, min, max, step) => {
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
            this._updateNeuronOpacity();
          } else {
            triggerRebuild();
          }
        };
        return makeElement('div', { style: { marginBottom: '4px' } }, [label, slider]);
      };

      const sliderA = makeSliderRow('Width', 'nx', 1, 40, 1);
      const sliderB = makeSliderRow('Height', 'ny', 1, 50, 1);
      const sliderC = makeSliderRow('Length', 'nz', 1, 45, 1);
      const sliderRadius = makeSliderRow('Radius', 'radius', 0.01, 0.08, 0.01);
      const sliderTransparency = makeSliderRow('Transparency', 'transparency', 0.0, 0.95, 0.05);

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
        '🔥 Highlight Path'
      );
      btnHighlight.onclick = () => {
        this.triggerHighlightSequence();
        const count = this.activeSequence ? this.activeSequence.adjSpheres.length : 0;
        feedback.textContent = `Highlighted path starting at neuron with ${count} neighbors.`;
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
        'Toggle Random Colors'
      );
      btnRandomize.onclick = () => {
        this._toggleRandomColors(feedback);
      };

      const btnRandomizeStrength = makeElement(
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
        'Toggle Random Strength'
      );
      btnRandomizeStrength.onclick = () => {
        this._toggleRandomStrength(feedback);
      };

      const btnBloom = makeElement(
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
        'Toggle Glow Effect'
      );
      btnBloom.onclick = () => {
        this._toggleBloom(feedback);
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
        totalNeuronsSpan,
        sliderA,
        sliderB,
        sliderC,
        sliderRadius,
        sliderTransparency,
        btnHighlight,
        btnRandomize,
        btnRandomizeStrength,
        btnBloom,
        dropZone,
        feedback,
      ]);

      this.controlsDialog = UITools.makeDialog({
        env: this.env,
        title: 'Pleasure & Pain Network',
        contentElement: content,
        size: [270, 550],
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
        if (oldMaterial && oldMaterial !== this.sharedNeuronMaterial) {
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

      // Fit camera ONCE at the initial network creation
      this._buildHexagonalGrid(true);
      this._setupUI();

      // Hook up render-update frame callback to drive animations smoothly
      const originalOnUpdate = this.app.onUpdateCallback;
      this.app.onUpdateCallback = () => {
        if (originalOnUpdate) originalOnUpdate();
        this._updateAnimations();
      };

      // Set up modular rendering that honors post-processing if active
      this.app.renderer.setAnimationLoop(() => {
        if (this.app.controls) this.app.controls.update();
        if (this.app.onUpdateCallback) this.app.onUpdateCallback();

        if (this.bloomEnabled && this.composer) {
          this.composer.render();
        } else {
          this.app.renderer.render(this.app.scene, this.app.camera);
        }
      });

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
      if (this.composer) {
        this.composer.setSize(width, height);
      }
    }

  

  _buildHexagonalGrid(adjustCamera = false) {
      this.cleanupHighlightSequence();
      this._clearSceneGeometry();
      
      const opacity = 1.0 - this.gridParams.transparency;

      const result = Simple3dShapes.buildHexagonalGrid(
        this.app,
        this.gridParams.nx,
        this.gridParams.ny,
        this.gridParams.nz,
        this.gridParams.radius,
        opacity
      );
      this.meshes.push(...result.meshes);
      this.sharedNeuronMaterial = result.sharedMaterial;
      this.bbox = result.bbox;
      
      // Initialize or restore neuron strengths
      this.meshes.forEach((m) => {
        if (this.strengthRandomized) {
          m.userData.strength = Math.random();
        } else {
          m.userData.strength = 1.0;
        }
      });

      // Keep colors randomized if currently toggled on
      if (this.colorsRandomized) {
        const colors = this.getThemeColors();
        this.meshes.forEach((m) => {
          if (m.userData.locked !== true) {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            this._ensureUniqueMaterial(m);
            m.material.color.copy(randomColor);
          }
        });
      }

      this._applyStrengthAndOpacity();

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
      if (mesh.material === this.sharedNeuronMaterial) {
        mesh.material = this.sharedNeuronMaterial.clone();
      }
    }

  getAdjacentSpheres(targetMesh) {
      const D = 0.16;
      const tolerance = D * 1.15;
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
      const D = 0.16;
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

      this._ensureUniqueMaterial(centerSphere);
      adjSpheres.forEach(m => this._ensureUniqueMaterial(m));

      const centerBaseColor = centerSphere.material.color.clone();
      const neighborBaseColors = adjSpheres.map(m => m.material.color.clone());
      const baseOpacity = 1.0 - this.gridParams.transparency;

      this.activeSequence = {
        startTime: performance.now(),
        centerSphere: centerSphere,
        adjSpheres: adjSpheres,
        centerBaseColor: centerBaseColor,
        neighborBaseColors: neighborBaseColors,
        baseOpacity: baseOpacity
      };
    }

  _updateAnimations() {
      if (!this.activeSequence) return;

      const THREE = this.app.THREE;
      const seq = this.activeSequence;
      const elapsed = (performance.now() - seq.startTime) / 1000;

      const yellowColor = new THREE.Color(0xffff00);
      const orangeColor = new THREE.Color(0xff6600);

      // Phase 1: 0.0s to 1.0s -> Center sphere scales up and turns yellow with bright emissive glow
      if (elapsed <= 1.0) {
        const t = elapsed / 1.0;
        const scale = THREE.MathUtils.lerp(1.0, 2.2, t);
        seq.centerSphere.scale.setScalar(scale);

        seq.centerSphere.material.color.lerpColors(seq.centerBaseColor, yellowColor, t);
        seq.centerSphere.material.opacity = THREE.MathUtils.lerp(seq.baseOpacity, 1.0, t);
        seq.centerSphere.material.transparent = seq.centerSphere.material.opacity < 1.0;

        // Apply high emissive intensity for the bloom filter to catch
        if (seq.centerSphere.material.emissive) {
          seq.centerSphere.material.emissive.copy(yellowColor);
          seq.centerSphere.material.emissiveIntensity = THREE.MathUtils.lerp(0.0, 2.5, t);
        }
      }
      // Phase 2: 1.0s to 2.5s -> Center sphere shrinks back down, neighbors become solid glowing orange
      else if (elapsed <= 2.5) {
        const tCenter = Math.min((elapsed - 1.0) / 0.5, 1.0);
        const scale = THREE.MathUtils.lerp(2.2, 1.0, tCenter);
        seq.centerSphere.scale.setScalar(scale);

        seq.centerSphere.material.color.lerpColors(yellowColor, seq.centerBaseColor, tCenter);
        seq.centerSphere.material.opacity = THREE.MathUtils.lerp(1.0, seq.baseOpacity, tCenter);
        seq.centerSphere.material.transparent = seq.centerSphere.material.opacity < 1.0;

        if (seq.centerSphere.material.emissive) {
          seq.centerSphere.material.emissiveIntensity = THREE.MathUtils.lerp(2.5, 0.0, tCenter);
        }

        const tAdj = Math.min((elapsed - 1.0) / 0.4, 1.0);
        seq.adjSpheres.forEach((m, idx) => {
          const originalColor = seq.neighborBaseColors[idx];
          m.material.color.lerpColors(originalColor, orangeColor, tAdj);
          m.material.opacity = THREE.MathUtils.lerp(seq.baseOpacity, 1.0, tAdj);
          m.material.transparent = m.material.opacity < 1.0;

          if (m.material.emissive) {
            m.material.emissive.copy(orangeColor);
            m.material.emissiveIntensity = THREE.MathUtils.lerp(0.0, 2.0, tAdj);
          }
        });
      }
      // Phase 3: 2.5s to 4.0s -> Adjacent spheres fade smoothly back to original translucent state
      else if (elapsed <= 4.0) {
        const tFade = (elapsed - 2.5) / 1.5;
        seq.adjSpheres.forEach((m, idx) => {
          const originalColor = seq.neighborBaseColors[idx];
          m.material.color.lerpColors(orangeColor, originalColor, tFade);
          m.material.opacity = THREE.MathUtils.lerp(1.0, seq.baseOpacity, tFade);
          m.material.transparent = m.material.opacity < 1.0;

          if (m.material.emissive) {
            m.material.emissiveIntensity = THREE.MathUtils.lerp(2.0, 0.0, tFade);
          }
        });
      }
      else {
        this.cleanupHighlightSequence();
      }
    }

  cleanupHighlightSequence() {
      if (this.activeSequence) {
        const seq = this.activeSequence;

        if (seq.centerSphere) {
          seq.centerSphere.scale.setScalar(1.0);
          seq.centerSphere.material.color.copy(seq.centerBaseColor);
          seq.centerSphere.material.opacity = seq.baseOpacity;
          seq.centerSphere.material.transparent = seq.baseOpacity < 1.0;

          if (seq.centerSphere.material.emissive) {
            seq.centerSphere.material.emissive.setHex(0x000000);
            seq.centerSphere.material.emissiveIntensity = 0.0;
          }
        }

        if (seq.adjSpheres) {
          seq.adjSpheres.forEach((m, idx) => {
            const originalColor = seq.neighborBaseColors[idx];
            m.material.color.copy(originalColor);
            m.material.opacity = seq.baseOpacity;
            m.material.transparent = seq.baseOpacity < 1.0;

            if (m.material.emissive) {
              m.material.emissive.setHex(0x000000);
              m.material.emissiveIntensity = 0.0;
            }
          });
        }

        this.activeSequence = null;
      }
    }

  _toggleRandomColors(feedback) {
      const THREE = this.app.THREE;
      this.colorsRandomized = !this.colorsRandomized;

      if (this.colorsRandomized) {
        const colors = this.getThemeColors();
        this.meshes.forEach((m) => {
          if (m.userData.locked !== true) {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            this._ensureUniqueMaterial(m);
            m.material.color.copy(randomColor);
          }
        });
        feedback.textContent = 'Randomized neuron colors applied.';
      } else {
        const defaultBlue = new THREE.Color(0x0055ff);
        this.meshes.forEach((m) => {
          if (m.userData.locked !== true) {
            if (m.material !== this.sharedNeuronMaterial) {
              m.material.color.copy(defaultBlue);
            } else {
              m.material.color.copy(defaultBlue);
            }
          }
        });
        feedback.textContent = 'Returned to uniform neuron colors.';
      }
    }

  _updateNeuronOpacity() {
      this._applyStrengthAndOpacity();
    }

  _toggleRandomStrength(feedbackElement) {
      this.strengthRandomized = !this.strengthRandomized;
      if (this.strengthRandomized) {
        this.meshes.forEach((m) => {
          m.userData.strength = Math.random();
        });
        feedbackElement.textContent = 'Randomized neuron strengths applied.';
      } else {
        this.meshes.forEach((m) => {
          m.userData.strength = 1.0;
        });
        feedbackElement.textContent = 'Returned to full neuron strengths.';
      }
      this._applyStrengthAndOpacity();
    }

  _applyStrengthAndOpacity() {
      const baseOpacity = 1.0 - this.gridParams.transparency;
      this.meshes.forEach((mesh) => {
        const strength = mesh.userData.strength !== undefined ? mesh.userData.strength : 1.0;
        
        // Scale physical size is controlled by individual strength
        mesh.scale.setScalar(strength);
        
        // Custom material transparency represents opacity modified by individual strength
        this._ensureUniqueMaterial(mesh);
        mesh.material.transparent = true;
        mesh.material.opacity = baseOpacity * strength;
      });
    }

  async _setupBloomPostProcessing() {
      const THREE_URL = 'https://recursi.dev/thirdparty/three-js-r153/build/three.module.js';
      const ADDONS = 'https://recursi.dev/thirdparty/three-js-r153/examples/jsm';

      const loadAddon = async (path) => {
        const blobUrl = await this.app._fetchAndRewrite(ADDONS + path, THREE_URL, 1);
        return await import(blobUrl);
      };

      const { EffectComposer } = await loadAddon('/postprocessing/EffectComposer.js');
      const { RenderPass } = await loadAddon('/postprocessing/RenderPass.js');
      const { UnrealBloomPass } = await loadAddon('/postprocessing/UnrealBloomPass.js');

      const rect = this.app.renderer.domElement.getBoundingClientRect();
      const width = rect.width || 640;
      const height = rect.height || 360;

      const composer = new EffectComposer(this.app.renderer);
      composer.setSize(width, height);

      const renderPass = new RenderPass(this.app.scene, this.app.camera);
      composer.addPass(renderPass);

      // Bloom Pass Parameters: (resolution, strength, radius, threshold)
      const bloomPass = new UnrealBloomPass(
        new this.app.THREE.Vector2(width, height),
        1.6,  // strength
        0.4,  // radius
        0.05  // low threshold to capture emissive values easily
      );
      composer.addPass(bloomPass);
      this.composer = composer;
    }

  _toggleBloom(feedbackElement) {
      this.bloomEnabled = !this.bloomEnabled;
      if (this.bloomEnabled) {
        if (!this.composer) {
          feedbackElement.textContent = 'Loading glow post-processing...';
          this._setupBloomPostProcessing().then(() => {
            feedbackElement.textContent = 'Glow effect activated.';
          }).catch((err) => {
            console.error(err);
            feedbackElement.textContent = 'Error loading post-processing libraries.';
            this.bloomEnabled = false;
          });
        } else {
          feedbackElement.textContent = 'Glow effect activated.';
        }
      } else {
        feedbackElement.textContent = 'Glow effect deactivated.';
      }
    }
}