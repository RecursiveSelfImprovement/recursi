class BulbAndButton {
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
      this.raycastingEnabled = true;
      this.intersected = null;
      this.pointer = null;
      this.cleanupFns = [];
      
      // Instance Tracking
      this.bulbInstances = [];
      this.buttonInstances = [];
    }

  _buildPrimitives() {
      // Spawn standard demonstration elements
      const initialBulb = Simple3dShapes.createBulb(this.app, {
        color: 0xffaa00,
        orientation: 'top',
        position: { x: -0.45, y: 0, z: 0 },
        scale: 1.0
      });
      this._registerBulb(initialBulb);

      const initialButton = Simple3dShapes.createButton(this.app, {
        color: 0xdd2222,
        orientation: 'top',
        position: { x: 0.45, y: 0, z: 0 },
        scale: 1.0
      });
      this._registerButton(initialButton);

      // Add a grid for orientation references
      this.grid = new THREE.GridHelper(6, 12, 0x444444, 0x222222);
      this.grid.visible = false;
      this.app.scene.add(this.grid);
    }

  

  _setupUI() {
      const feedback = makeElement(
        'div',
        { style: { marginTop: '8px', fontSize: '11px', color: '#aaa', textAlign: 'center' } },
        'Click elements in 3D to interact!'
      );

      const typeSelect = makeElement('select', {
        style: { width: '100%', padding: '6px', marginBottom: '8px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }
      }, [
        makeElement('option', { value: 'bulb' }, 'Light Bulb 💡'),
        makeElement('option', { value: 'button' }, 'Button 🟥')
      ]);

      const colorSelect = makeElement('select', {
        style: { width: '100%', padding: '6px', marginBottom: '8px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }
      }, [
        makeElement('option', { value: '0xdd2222' }, 'Crimson Red'),
        makeElement('option', { value: '0x22cc22' }, 'Green'),
        makeElement('option', { value: '0x2288ff' }, 'Blue'),
        makeElement('option', { value: '0xffaa00' }, 'Orange/Amber'),
        makeElement('option', { value: '0xee00ff' }, 'Purple'),
        makeElement('option', { value: '0x00eeee' }, 'Cyan'),
        makeElement('option', { value: '0xffffff' }, 'White')
      ]);

      const orientSelect = makeElement('select', {
        style: { width: '100%', padding: '6px', marginBottom: '8px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }
      }, [
        makeElement('option', { value: 'top' }, 'Top (Facing Up)'),
        makeElement('option', { value: 'bottom' }, 'Bottom (Facing Down)'),
        makeElement('option', { value: 'front' }, 'Front (Facing Forward)'),
        makeElement('option', { value: 'back' }, 'Back (Facing Backward)'),
        makeElement('option', { value: 'left' }, 'Left (Facing Left)'),
        makeElement('option', { value: 'right' }, 'Right (Facing Right)')
      ]);

      const coordsDiv = makeElement('div', {
        style: { display: 'flex', gap: '4px', marginBottom: '8px' }
      }, [
        makeElement('input', { id: 'spawnX', type: 'number', step: '0.1', value: '0.0', style: { width: '33%', padding: '4px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' } }),
        makeElement('input', { id: 'spawnY', type: 'number', step: '0.1', value: '0.0', style: { width: '33%', padding: '4px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' } }),
        makeElement('input', { id: 'spawnZ', type: 'number', step: '0.1', value: '0.0', style: { width: '33%', padding: '4px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' } })
      ]);

      const scaleLabel = makeElement('div', { style: { fontSize: '11px', color: '#bbb', marginBottom: '2px' } }, 'Scale: 1.0');
      const scaleSlider = makeElement('input', {
        type: 'range',
        min: '0.4',
        max: '2.0',
        step: '0.1',
        value: '1.0',
        style: { width: '100%', marginBottom: '12px' }
      });
      scaleSlider.oninput = () => {
        scaleLabel.textContent = `Scale: ${parseFloat(scaleSlider.value).toFixed(1)}`;
      };

      const spawnBtn = makeElement(
        'button',
        {
          style: {
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginBottom: '8px'
          },
        },
        'Spawn Element'
      );
      
      spawnBtn.onclick = () => {
        const type = typeSelect.value;
        const color = parseInt(colorSelect.value, 16);
        const orientation = orientSelect.value;
        const x = parseFloat(document.getElementById('spawnX').value) || 0;
        const y = parseFloat(document.getElementById('spawnY').value) || 0;
        const z = parseFloat(document.getElementById('spawnZ').value) || 0;
        const scale = parseFloat(scaleSlider.value) || 1.0;

        if (type === 'bulb') {
          const bulb = Simple3dShapes.createBulb(this.app, {
            color,
            orientation,
            position: { x, y, z },
            scale,
            onClick: (isOn) => {
              feedback.textContent = `Bulb clicked! Now ${isOn ? 'ON' : 'OFF'}`;
            }
          });
          this._registerBulb(bulb);
          feedback.textContent = `Spawned colored Bulb at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})!`;
        } else {
          const btn = Simple3dShapes.createButton(this.app, {
            color,
            orientation,
            position: { x, y, z },
            scale,
            onClick: () => {
              feedback.textContent = '3D Button was pressed!';
            }
          });
          this._registerButton(btn);
          feedback.textContent = `Spawned colored Button at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})!`;
        }
      };

      const clearBtn = makeElement(
        'button',
        {
          style: {
            display: 'block',
            width: '100%',
            padding: '6px',
            backgroundColor: '#333',
            color: '#f66',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }
        },
        'Clear All Elements'
      );
      clearBtn.onclick = () => {
        this._clearAllInstances();
        feedback.textContent = 'Cleared all elements.';
      };

      const gridChk = makeElement('input', {
        type: 'checkbox',
        id: 'gridToggle',
      });
      const gridLbl = makeElement(
        'label',
        { htmlFor: 'gridToggle', style: { marginLeft: '4px', fontSize: '11px', color: '#ccc' } },
        'Show grid'
      );
      gridChk.onchange = () => {
        if (this.grid) {
          this.grid.visible = gridChk.checked;
        }
      };
      const gridDiv = makeElement(
        'div',
        { style: { marginTop: '8px', textAlign: 'center' } },
        [gridChk, gridLbl]
      );

      const content = makeElement('div', { style: { padding: '5px' } }, [
        makeElement('div', { style: { fontSize: '11px', color: '#bbb', marginBottom: '4px' } }, 'Select Element & Properties:'),
        typeSelect,
        colorSelect,
        orientSelect,
        makeElement('div', { style: { fontSize: '11px', color: '#bbb', marginBottom: '2px' } }, 'Position Base (X, Y, Z):'),
        coordsDiv,
        scaleLabel,
        scaleSlider,
        spawnBtn,
        clearBtn,
        gridDiv,
        feedback,
      ]);

      this.controlsDialog = UITools.makeDialog({
        env: this.env,
        title: 'Factory Spawner',
        contentElement: content,
        size: [240, 365],
        position: [20, 40],
      });
    }

  

  _setupRaycasting() {
      if (!this.app.raycaster) return;

      const THREE = this.app.THREE;
      this.pointer = new THREE.Vector2();

      const onPointerMove = (event) => {
        if (!this.raycastingEnabled) return;
        const rect = this.app.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onPointerDown = (event) => {
        if (!this.raycastingEnabled) return;
        const rect = this.app.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.app.camera);

        const intersects = raycaster.intersectObjects(this.app.scene.children, true);
        if (intersects.length > 0) {
          const clickedObj = intersects[0].object;

          // Detect active Bulb hits
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

          // Detect active Button hits
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
        }
      };

      this.app.renderer.domElement.addEventListener('pointermove', onPointerMove);
      this.app.renderer.domElement.addEventListener('pointerdown', onPointerDown);

      this.cleanupFns.push(() => {
        this.app.renderer.domElement.removeEventListener('pointermove', onPointerMove);
        this.app.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      });

      const originalOnUpdate = this.app.onUpdateCallback;
      this.app.onUpdateCallback = () => {
        if (originalOnUpdate) originalOnUpdate();
        this._updateRaycasting();
        this._updateAnimations();
      };
    }

  _updateRaycasting() {
      if (!this.app.raycaster || !this.raycastingEnabled || !this.pointer) {
        if (this.intersected) {
          this._unhighlight(this.intersected);
          this.intersected = null;
        }
        return;
      }

      this.app.raycaster.setFromCamera(this.pointer, this.app.camera);

      const intersects = this.app.raycaster.intersectObjects(
        this.meshes.filter((o) => o && o.visible),
        true
      );
      const newIntersect = intersects.length > 0 ? intersects[0] : null;
      const newIntersectedObject = newIntersect ? newIntersect.object : null;

      if (this.intersected !== newIntersectedObject) {
        this._unhighlight(this.intersected);
        this.intersected = newIntersectedObject;
        this._highlight(this.intersected);
      }
    }

  

  

  

  

  _highlight(object) {
      if (!object) return;

      if (object.name === "button_plunger" && object.material) {
        object.originalEmissive = object.material.emissive.getHex();
        const hoverColor = object.material.color.clone().addScalar(0.2);
        object.material.emissive.copy(hoverColor);
      } else if (object.name === "bulb_glass" && object.material) {
        object.originalEmissive = object.material.emissive.getHex();
        const hoverColor = object.material.color.clone().multiplyScalar(0.3);
        object.material.emissive.copy(hoverColor);
      }
    }

  _unhighlight(object) {
      if (!object) return;

      if (object.material && object.originalEmissive !== undefined) {
        object.material.emissive.setHex(object.originalEmissive);
      }
    }

  

  

  

  destroy() {
      this.destroyed = true;
      this._clearAllInstances();

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
      this.intersected = null;

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
        throw new Error("[BulbAndButton] run() requires an environment object with a valid container.");
      }

      const parentElement = env.container;

      parentElement.style.position = 'relative';
      parentElement.style.width = '100%';
      parentElement.style.height = '100%';
      parentElement.style.margin = '0';
      parentElement.style.padding = '0';
      parentElement.style.overflow = 'hidden';
      parentElement.style.background = '#18181c';

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
          background: '#18181c',
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
        cameraPos: { x: 0.0, y: 1.2, z: 2.2 },
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

      // Ensure global Three is accessible to standard loaders
      window.THREE = this.app.THREE;

      this._buildPrimitives();
      this._setupUI();
      this._setupRaycasting();

      if (env && typeof env.requestKeystrokeControl === 'function') {
        env.requestKeystrokeControl((active) => {
          this.raycastingEnabled = active;
        });
      } else {
        this.raycastingEnabled = true;
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

  

  _pressButton() {
      this.buttonPressActive = true;
      this.buttonPressStartTime = Date.now();
      this._playClickSound();
    }

  _toggleBulb() {
      this.bulbOn = !this.bulbOn;
      this._playSwitchSound();
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

  _updateAnimations() {
      const THREE = this.app.THREE;

      // Update button plungers
      for (const btn of this.buttonInstances) {
        let targetY = 0.15;
        if (btn.pressActive) {
          targetY = 0.08;
          if (Date.now() - btn.pressStartTime > 140) {
            btn.pressActive = false;
          }
        }
        btn.plungerMesh.position.y += (targetY - btn.plungerMesh.position.y) * 0.35;
      }

      // Update bulb illuminations
      for (const bulb of this.bulbInstances) {
        const targetIntensity = bulb.isOn ? bulb.maxIntensity : 0.0;
        const targetGlowOpacity = bulb.isOn ? 0.35 : 0.0;

        bulb.pointLight.intensity += (targetIntensity - bulb.pointLight.intensity) * 0.25;

        // Core glow
        if (bulb.coreMesh && bulb.coreMesh.material) {
          const targetCoreIntensity = bulb.isOn ? 6.0 : 0.1;
          bulb.coreMesh.material.emissiveIntensity += (targetCoreIntensity - bulb.coreMesh.material.emissiveIntensity) * 0.25;

          const targetCoreColor = bulb.isOn ? bulb.color.clone().multiplyScalar(1.5) : bulb.color.clone().multiplyScalar(0.1);
          bulb.coreMesh.material.emissive.lerp(targetCoreColor, 0.25);
        }

        // Bulb glass transparency & glow colors
        if (bulb.glassMesh && bulb.glassMesh.material) {
          const targetGlassEmissive = bulb.isOn ? 1.4 : 0.0;
          bulb.glassMesh.material.emissiveIntensity += (targetGlassEmissive - bulb.glassMesh.material.emissiveIntensity) * 0.25;

          const targetColor = bulb.isOn ? bulb.color : new THREE.Color(0x000000);
          bulb.glassMesh.material.emissive.lerp(targetColor, 0.25);

          bulb.glassMesh.material.transmission = bulb.isOn ? 0.25 : 0.95;
        }

        // Corona glow envelope
        if (bulb.glowMesh && bulb.glowMesh.material) {
          bulb.glowMesh.material.opacity += (targetGlowOpacity - bulb.glowMesh.material.opacity) * 0.15;
        }
      }
    }

  _registerBulb(bulb) {
      bulb.isOn = false;
      bulb.maxIntensity = 3.5;
      this.bulbInstances.push(bulb);
      
      bulb.group.traverse((child) => {
        if (child.isMesh) {
          this.meshes.push(child);
        }
      });
    }

  _registerButton(btn) {
      btn.pressActive = false;
      btn.pressStartTime = 0;
      this.buttonInstances.push(btn);
      
      btn.group.traverse((child) => {
        if (child.isMesh) {
          this.meshes.push(child);
        }
      });
    }

  _pressButtonInstance(btn) {
      btn.pressActive = true;
      btn.pressStartTime = Date.now();
      this._playClickSound();
      if (typeof btn.onClick === 'function') {
        btn.onClick();
      }
    }

  _toggleBulbInstance(bulb) {
      bulb.isOn = !bulb.isOn;
      this._playSwitchSound(bulb.isOn);
      if (typeof bulb.onClick === 'function') {
        bulb.onClick(bulb.isOn);
      }
    }

  _clearAllInstances() {
      // Clear Bulb groups
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
      this.bulbInstances = [];

      // Clear Button groups
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
      this.buttonInstances = [];
      this.meshes = [];
    }
}