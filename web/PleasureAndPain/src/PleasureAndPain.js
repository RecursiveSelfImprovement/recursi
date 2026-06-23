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
      this.neuronGrid = null;

      // Active sequence state
      this.activeSequence = null;

      // Default states requested by user: uniform blue, randomized strength, bloom on by default
      this.colorsRandomized = false;
      this.strengthRandomized = true;
      this.bloomEnabled = true;
      this.composer = null;

      // Default configuration requested: 11x27x34, radius 0.05, transparency 0.75, count 10
      this.gridParams = {
        nx: 11,
        ny: 27,
        nz: 34,
        radius: 0.05,
        transparency: 0.75
      };

      // External bulbs & buttons trackers
      this.bulbInstances = [];
      this.buttonInstances = [];
      this.interactiveMeshes = [];
      this.externalCount = 10;
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

      // Slider for External Bulbs & Buttons along face boundaries
      const valSpanExt = makeElement('span', { style: { float: 'right', fontWeight: 'bold', color: '#fff' } }, this.externalCount.toString());
      const labelExt = makeElement('div', { style: { fontSize: '12px', color: '#ccc', marginBottom: '3px' } }, ['External Bulbs & Buttons', valSpanExt]);
      const sliderExt = makeElement('input', {
        type: 'range',
        min: '0',
        max: '30',
        step: '1',
        value: this.externalCount.toString(),
        style: { width: '100%', marginBottom: '8px', accentColor: '#a9dfd1' }
      });
      sliderExt.oninput = (e) => {
        const val = parseInt(e.target.value);
        this.externalCount = val;
        valSpanExt.textContent = e.target.value;
        this._spawnExternalElements(this.externalCount);
        feedback.textContent = `Spawned ${val} bulbs/buttons along network perimeter.`;
      };
      const sliderExtRow = makeElement('div', { style: { marginBottom: '4px' } }, [labelExt, sliderExt]);

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

      const content = makeElement('div', { style: { padding: '5px' } }, [
        totalNeuronsSpan,
        sliderA,
        sliderB,
        sliderC,
        sliderRadius,
        sliderTransparency,
        sliderExtRow,
        btnHighlight,
        btnRandomize,
        btnRandomizeStrength,
        btnBloom,
        feedback,
      ]);

      this.controlsDialog = UITools.makeDialog({
        env: this.env,
        title: 'Pleasure & Pain Network',
        contentElement: content,
        size: [270, 500],
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
      this._clearExternalElements();
      if (this.neuronGrid) {
        this.neuronGrid.clear();
      } else {
        ModelLoader.clearSceneGeometry(this.app, this.meshes, this.loadedModel);
      }
      
      if (this.loadedModel) {
        this.app.remove(this.loadedModel);
        this.loadedModel = null;
      }
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
      this._clearExternalElements();

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
        throw new Error("[PleasureAndPain] run() requires an environment object with a valid container.");
      }

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

      this._buildHexagonalGrid(true);
      this._setupUI();
      this._setupRaycasting();

      if (this.bloomEnabled) {
        this._setupBloomPostProcessing().catch(err => console.error(err));
      }

      this.app.onUpdateCallback = () => {
        this._updateAnimations();
      };

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
      
      if (!this.neuronGrid) {
        this.neuronGrid = new NeuronGrid(this.app);
      }

      console.log("[PleasureAndPain] Calling neuronGrid.build() with gridParams:", this.gridParams);

      this.neuronGrid.build(
        this.gridParams.nx,
        this.gridParams.ny,
        this.gridParams.nz,
        this.gridParams.radius,
        this.gridParams.transparency
      );

      this.meshes = this.neuronGrid.meshes;
      this.sharedNeuronMaterial = this.neuronGrid.sharedMaterial;

      // Center the bounding box metrics matching centered neuron coordinates
      const THREE = this.app.THREE;
      const rawBbox = this.neuronGrid.bbox;
      const center = new THREE.Vector3();
      rawBbox.getCenter(center);
      
      this.bbox = rawBbox.clone();
      this.bbox.min.sub(center);
      this.bbox.max.sub(center);

      console.log("[PleasureAndPain] Grid build completed. Meshes synced:", this.meshes.length);
      
      this.meshes.forEach((m) => {
        if (this.strengthRandomized) {
          m.userData.strength = Math.random();
        } else {
          m.userData.strength = 1.0;
        }
      });

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

      this._spawnExternalElements(this.externalCount);

      if (adjustCamera) {
        console.log("[PleasureAndPain] Adjusting camera to fit bbox:", this.bbox);
        this._adjustCameraToFit(this.bbox);
      }
    }

  _adjustCameraToFit(bbox) {
      const THREE = this.app.THREE;
      if (!bbox) return;

      if (this.app.camera) {
        this.app.camera.far = 1000;
        this.app.camera.updateProjectionMatrix();
      }

      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 1.0);

      const fov = this.app.camera.fov * (Math.PI / 180);
      let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraDistance *= 1.8;

      this.app.camera.position.set(maxDim * 1.0, maxDim * 0.9, cameraDistance);
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
      if (this.neuronGrid) {
        return this.neuronGrid.findAdjacentSpheres(targetMesh);
      }
      return [];
    }

  triggerHighlightSequence() {
      if (this.meshes.length === 0) return;
      const randomNeuron = this.meshes[Math.floor(Math.random() * this.meshes.length)];
      this.triggerHighlightSequenceAtNeuron(randomNeuron);
    }

  _updateAnimations() {
      const THREE = this.app.THREE;

      // 1. Update button plungers
      if (this.buttonInstances) {
        for (const btn of this.buttonInstances) {
          let targetY = 0.15;
          if (btn.pressActive) {
            targetY = 0.08;
            if (Date.now() - btn.pressStartTime > 140) {
              btn.pressActive = false;
            }
          }
          if (btn.plungerMesh) {
            btn.plungerMesh.position.y += (targetY - btn.plungerMesh.position.y) * 0.35;
          }
        }
      }

      // 2. Update bulb illuminations
      if (this.bulbInstances) {
        for (const bulb of this.bulbInstances) {
          const maxIntensity = bulb.maxIntensity || 4.0;
          const targetIntensity = bulb.isOn ? maxIntensity : 0.0;
          const targetGlowOpacity = bulb.isOn ? 0.35 : 0.0;

          if (bulb.pointLight) {
            bulb.pointLight.intensity += (targetIntensity - bulb.pointLight.intensity) * 0.25;
          }

          // Core glow
          if (bulb.coreMesh && bulb.coreMesh.material) {
            const targetCoreIntensity = bulb.isOn ? 6.0 : 0.1;
            if (bulb.coreMesh.material.emissiveIntensity !== undefined) {
              bulb.coreMesh.material.emissiveIntensity += (targetCoreIntensity - bulb.coreMesh.material.emissiveIntensity) * 0.25;
            }

            const targetCoreColor = bulb.isOn ? bulb.color.clone().multiplyScalar(1.5) : bulb.color.clone().multiplyScalar(0.1);
            if (bulb.coreMesh.material.emissive && bulb.coreMesh.material.emissive.lerp) {
              bulb.coreMesh.material.emissive.lerp(targetCoreColor, 0.25);
            }
          }

          // Bulb glass transparency & glow colors
          if (bulb.glassMesh && bulb.glassMesh.material) {
            const targetGlassEmissive = bulb.isOn ? 1.4 : 0.0;
            if (bulb.glassMesh.material.emissiveIntensity !== undefined) {
              bulb.glassMesh.material.emissiveIntensity += (targetGlassEmissive - bulb.glassMesh.material.emissiveIntensity) * 0.25;
            }

            const targetColor = bulb.isOn ? bulb.color : new THREE.Color(0x000000);
            if (bulb.glassMesh.material.emissive && bulb.glassMesh.material.emissive.lerp) {
              bulb.glassMesh.material.emissive.lerp(targetColor, 0.25);
            }

            bulb.glassMesh.material.transmission = bulb.isOn ? 0.25 : 0.95;
          }

          // Corona glow envelope
          if (bulb.glowMesh && bulb.glowMesh.material) {
            bulb.glowMesh.material.opacity += (targetGlowOpacity - bulb.glowMesh.material.opacity) * 0.15;
          }
        }
      }

      // 3. Highlight sequence update
      if (!this.activeSequence) return;

      const seq = this.activeSequence;
      const elapsed = (performance.now() - seq.startTime) / 1000;

      const yellowColor = new THREE.Color(0xffff00);
      const orangeColor = new THREE.Color(0xff6600);

      if (elapsed <= 1.0) {
        const t = elapsed / 1.0;
        const scale = THREE.MathUtils.lerp(1.0, 2.2, t);
        seq.centerSphere.scale.setScalar(scale);

        seq.centerSphere.material.color.lerpColors(seq.centerBaseColor, yellowColor, t);
        seq.centerSphere.material.opacity = THREE.MathUtils.lerp(seq.baseOpacity, 1.0, t);
        seq.centerSphere.material.transparent = seq.centerSphere.material.opacity < 1.0;

        if (seq.centerSphere.material.emissive) {
          seq.centerSphere.material.emissive.copy(yellowColor);
          seq.centerSphere.material.emissiveIntensity = THREE.MathUtils.lerp(0.0, 2.5, t);
        }
      }
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
            seq.centerSphere.material.emissive.setHex ? seq.centerSphere.material.emissive.setHex(0x000000) : null;
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
              m.material.emissive.setHex ? m.material.emissive.setHex(0x000000) : null;
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
      
      if (this.sharedNeuronMaterial) {
        this.sharedNeuronMaterial.transparent = baseOpacity < 1.0;
        this.sharedNeuronMaterial.opacity = baseOpacity;
        this.sharedNeuronMaterial.needsUpdate = true;
      }

      this.meshes.forEach((mesh) => {
        const strength = mesh.userData.strength !== undefined ? mesh.userData.strength : 1.0;
        const warmth = mesh.userData.warmth || 0;

        mesh.scale.setScalar(strength);

        if (strength !== 1.0 || warmth > 0) {
          this._ensureUniqueMaterial(mesh);
          mesh.material.transparent = true;
          mesh.material.opacity = baseOpacity * strength;
        } else {
          const oldMat = mesh.material;
          if (oldMat !== this.sharedNeuronMaterial) {
            mesh.material = this.sharedNeuronMaterial;
            oldMat.dispose();
          }
        }
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

      const bloomPass = new UnrealBloomPass(
        new this.app.THREE.Vector2(width, height),
        1.6,
        0.4,
        0.05
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

  _clearExternalElements() {
      if (this.bulbInstances) {
        for (const bulb of this.bulbInstances) {
          this.app.scene.remove(bulb.group);
          bulb.group.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
              }
            }
          });
        }
      }
      this.bulbInstances = [];

      if (this.buttonInstances) {
        for (const btn of this.buttonInstances) {
          this.app.scene.remove(btn.group);
          btn.group.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
              }
            }
          });
        }
      }
      this.buttonInstances = [];
      this.interactiveMeshes = [];
    }

  _spawnExternalElements(count) {
      this._clearExternalElements();
      if (!this.bbox) return;

      const THREE = this.app.THREE;
      const min = this.bbox.min;
      const max = this.bbox.max;

      const faces = ['left', 'right', 'top', 'bottom', 'front', 'back'];
      const themeColors = this.getThemeColors();

      const numToSpawn = Math.max(0, count);

      for (let i = 0; i < numToSpawn; i++) {
        const isBulb = Math.random() > 0.5;
        const face = faces[Math.floor(Math.random() * faces.length)];
        
        let x = 0, y = 0, z = 0;
        let orientation = 'top';
        const margin = 0.22;

        // Position bases exactly on the boundary plane faces of centered grid
        switch (face) {
          case 'left':
            x = min.x;
            y = this._getRandomInRange(min.y, max.y, margin);
            z = this._getRandomInRange(min.z, max.z, margin);
            orientation = 'left';
            break;
          case 'right':
            x = max.x;
            y = this._getRandomInRange(min.y, max.y, margin);
            z = this._getRandomInRange(min.z, max.z, margin);
            orientation = 'right';
            break;
          case 'top':
            x = this._getRandomInRange(min.x, max.x, margin);
            y = max.y;
            z = this._getRandomInRange(min.z, max.z, margin);
            orientation = 'top';
            break;
          case 'bottom':
            x = this._getRandomInRange(min.x, max.x, margin);
            y = min.y;
            z = this._getRandomInRange(min.z, max.z, margin);
            orientation = 'bottom';
            break;
          case 'front':
            x = this._getRandomInRange(min.x, max.x, margin);
            y = this._getRandomInRange(min.y, max.y, margin);
            z = max.z;
            orientation = 'front';
            break;
          case 'back':
            x = this._getRandomInRange(min.x, max.x, margin);
            y = this._getRandomInRange(min.y, max.y, margin);
            z = min.z;
            orientation = 'back';
            break;
        }

        const colorHex = themeColors[Math.floor(Math.random() * themeColors.length)].getHex();
        const scale = 0.5 + Math.random() * 0.4;

        if (isBulb) {
          const bulb = Simple3dShapes.createBulb(this.app, {
            color: colorHex,
            orientation,
            position: { x, y, z },
            scale,
            onClick: (isOn) => {
              this._playSwitchSound(isOn);
            }
          });
          this._registerBulbInstance(bulb);
        } else {
          const btn = Simple3dShapes.createButton(this.app, {
            color: colorHex,
            orientation,
            position: { x, y, z },
            scale,
            onClick: () => {
              this._playClickSound();
              this._toggleRandomBulb();
              this.triggerHighlightSequence();
            }
          });
          this._registerButtonInstance(btn);
        }
      }
    }

  _getRandomInRange(minVal, maxVal, margin) {
      if (maxVal - minVal < margin * 2) {
        return (minVal + maxVal) / 2;
      }
      return minVal + margin + Math.random() * (maxVal - minVal - margin * 2);
    }

  _registerBulbInstance(bulb) {
      bulb.isOn = false;
      bulb.maxIntensity = 4.0;
      this.bulbInstances.push(bulb);
      
      bulb.group.traverse((child) => {
        if (child.isMesh) {
          this.interactiveMeshes.push(child);
        }
      });
    }

  _registerButtonInstance(btn) {
      btn.pressActive = false;
      btn.pressStartTime = 0;
      this.buttonInstances.push(btn);
      
      btn.group.traverse((child) => {
        if (child.isMesh) {
          this.interactiveMeshes.push(child);
        }
      });
    }

  _toggleRandomBulb() {
      if (this.bulbInstances.length > 0) {
        const randomBulb = this.bulbInstances[Math.floor(Math.random() * this.bulbInstances.length)];
        randomBulb.isOn = !randomBulb.isOn;
        this._playSwitchSound(randomBulb.isOn);
      }
    }

  triggerHighlightSequenceAtNeuron(centerSphere) {
      if (!centerSphere) return;
      this.cleanupHighlightSequence();

      const THREE = this.app.THREE;
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

  _setupRaycasting() {
      const THREE = this.app.THREE;
      
      const onPointerDown = (event) => {
        if (!this.app || !this.app.renderer || !this.app.camera) return;
        const rect = this.app.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.app.camera);

        const intersects = raycaster.intersectObjects(this.app.scene.children, true);
        if (intersects.length > 0) {
          const clickedObj = intersects[0].object;

          // 1. Detect active Bulb clicks
          for (const bulb of this.bulbInstances) {
            let matches = false;
            clickedObj.traverseAncestors((ancestor) => {
              if (ancestor === bulb.group) matches = true;
            });
            if (clickedObj === bulb.glassMesh || clickedObj === bulb.coreMesh) {
              matches = true;
            }
            if (matches) {
              this._toggleBulbInstance(bulb);
              return;
            }
          }

          // 2. Detect active Button clicks
          for (const btn of this.buttonInstances) {
            let matches = false;
            clickedObj.traverseAncestors((ancestor) => {
              if (ancestor === btn.group) matches = true;
            });
            if (clickedObj === btn.plungerMesh) {
              matches = true;
            }
            if (matches) {
              this._pressButtonInstance(btn);
              return;
            }
          }

          // 3. Detect grid neurons
          if (this.meshes.includes(clickedObj)) {
            this.triggerHighlightSequenceAtNeuron(clickedObj);
          }
        }
      };

      const domElement = this.app.renderer.domElement;
      domElement.addEventListener('pointerdown', onPointerDown);

      this.cleanupFns.push(() => {
        domElement.removeEventListener('pointerdown', onPointerDown);
      });
    }

  _toggleBulbInstance(bulb) {
      bulb.isOn = !bulb.isOn;
      this._playSwitchSound(bulb.isOn);
      if (typeof bulb.onClick === 'function') {
        bulb.onClick(bulb.isOn);
      }
    }

  _pressButtonInstance(btn) {
      btn.pressActive = true;
      btn.pressStartTime = Date.now();
      this._playClickSound();
      if (typeof btn.onClick === 'function') {
        btn.onClick();
      }
    }

  _playClickSound() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch (e) {}
    }

  _playSwitchSound(state) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(state ? 750 : 380, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } catch (e) {}
    }
}