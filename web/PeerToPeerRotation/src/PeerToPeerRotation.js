class PeerToPeerRotation {
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

      // P2P/WebRTC states
      this.peerConnection = null;
      this.dataChannel = null;
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

      // P2P Synchronization Section
      const p2pTitle = makeElement('div', {
        style: { fontWeight: 'bold', marginTop: '12px', marginBottom: '6px', borderTop: '1px solid #444', paddingTop: '8px', color: '#00e676', textAlign: 'center' }
      }, 'P2P Controller Link');

      const roomInput = makeElement('input', {
        placeholder: 'Room code (e.g. 7777)',
        value: '7777',
        style: {
          width: '100%',
          padding: '5px',
          background: '#222',
          border: '1px solid #444',
          color: '#fff',
          borderRadius: '3px',
          marginBottom: '6px',
          boxSizing: 'border-box',
          textAlign: 'center'
        }
      });

      const connectBtn = makeElement('button', {
        style: {
          width: '100%',
          padding: '6px',
          background: '#00e676',
          color: '#000',
          border: 'none',
          borderRadius: '3px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }
      }, 'Start Host Sync');

      const p2pStatusLabel = makeElement('div', {
        style: { fontSize: '11px', marginTop: '4px', fontStyle: 'italic', color: '#aaa', textAlign: 'center' }
      }, 'Status: Disconnected');

      connectBtn.onclick = () => {
        const room = roomInput.value.trim();
        if (!room) {
          p2pStatusLabel.textContent = 'Enter room code.';
          return;
        }
        this._startWirelessHost(room, p2pStatusLabel);
      };

      const manualToggle = makeElement('div', {
        style: { marginTop: '8px', color: '#888', cursor: 'pointer', fontSize: '10px', textDecoration: 'underline', textAlign: 'center' }
      }, 'Manual Sync (Copy-Paste)');

      const manualArea = makeElement('div', {
        style: { display: 'none', marginTop: '6px' }
      });

      const offerArea = makeElement('textarea', {
        readOnly: true,
        placeholder: 'Generating offer...',
        style: {
          width: '100%',
          height: '45px',
          background: '#111',
          color: '#00e676',
          fontFamily: 'monospace',
          fontSize: '9px',
          border: '1px solid #333',
          borderRadius: '3px',
          marginBottom: '4px',
          boxSizing: 'border-box'
        }
      });

      const copyOfferBtn = makeElement('button', {
        style: {
          width: '100%',
          padding: '4px',
          background: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '3px',
          marginBottom: '4px',
          cursor: 'pointer'
        }
      }, 'Copy Offer');

      const answerArea = makeElement('textarea', {
        placeholder: 'Paste Phone Answer here...',
        style: {
          width: '100%',
          height: '45px',
          background: '#111',
          color: '#00ffff',
          fontFamily: 'monospace',
          fontSize: '9px',
          border: '1px solid #333',
          borderRadius: '3px',
          marginBottom: '4px',
          boxSizing: 'border-box'
        }
      });

      const processAnswerBtn = makeElement('button', {
        style: {
          width: '100%',
          padding: '4px',
          background: '#00b0ff',
          color: '#fff',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer'
        }
      }, 'Process Answer');

      manualToggle.onclick = () => {
        if (manualArea.style.display === 'none') {
          manualArea.style.display = 'block';
          manualToggle.textContent = 'Hide Manual Sync';
          this._generateManualOffer(offerArea, p2pStatusLabel);
        } else {
          manualArea.style.display = 'none';
          manualToggle.textContent = 'Manual Sync (Copy-Paste)';
        }
      };

      copyOfferBtn.onclick = () => {
        offerArea.select();
        document.execCommand('copy');
        p2pStatusLabel.textContent = 'Offer copied to clipboard.';
      };

      processAnswerBtn.onclick = () => {
        this._processManualAnswer(answerArea.value, p2pStatusLabel);
      };

      manualArea.appendChild(offerArea);
      manualArea.appendChild(copyOfferBtn);
      manualArea.appendChild(answerArea);
      manualArea.appendChild(processAnswerBtn);

      const content = makeElement('div', {}, [
        btn,
        gridDiv,
        thickLineDiv,
        raycastDiv,
        dropZone,
        p2pTitle,
        roomInput,
        connectBtn,
        p2pStatusLabel,
        manualToggle,
        manualArea,
        feedback,
      ]);

      this.controlsDialog = UITools.makeDialog({
        env: this.env,
        title: 'Controls',
        contentElement: content,
        size: [230, 480],
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
        // Removed legacy _updateP2PRotation since movement is now directly event-driven
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

      // Dynamically inject styling to guarantee html/body fill the viewport in separate tabs
      applyCss(`
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #222;
        }
      `, 'peertopeerrotation-style-reset');

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

  

  async _startWirelessHost(roomCode, statusLabel) {
      const SIGNAL_BASE = 'http://192.168.2.213:7102/signal';

      if (this._hostConnecting) {
        statusLabel.textContent = 'Already connecting, please wait...';
        return;
      }
      this._hostConnecting = true;
      statusLabel.textContent = 'Initializing connection...';

      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch(e) {}
        this.peerConnection = null;
      }
      if (this.hostBeaconInterval) clearInterval(this.hostBeaconInterval);
      if (this.hostPollInterval) clearInterval(this.hostPollInterval);

      const hostTopic = `vibes-rotate-${roomCode}-host`;
      const clientTopic = `vibes-rotate-${roomCode}-client`;

      try {
        await fetch(`${SIGNAL_BASE}/${hostTopic}`, { method: 'POST', body: '' });
        await fetch(`${SIGNAL_BASE}/${clientTopic}`, { method: 'POST', body: '' });
      } catch(e) {}

      statusLabel.textContent = 'Cleared. Building offer...';
      await new Promise(r => setTimeout(r, 300));

      try {
        const pc = new RTCPeerConnection(this._getRTCConfig());
        this.peerConnection = pc;

        pc.oniceconnectionstatechange = () => {
          console.log('ICE:', pc.iceConnectionState);
          statusLabel.textContent = `ICE: ${pc.iceConnectionState.toUpperCase()}`;
          if (pc.iceConnectionState === 'failed') {
            statusLabel.textContent = 'ICE Failed.';
            this._hostConnecting = false;
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('Conn:', pc.connectionState);
          statusLabel.textContent = `Conn: ${pc.connectionState.toUpperCase()}`;
          if (pc.connectionState === 'connected') {
            statusLabel.textContent = 'Linked Successfully!';
            statusLabel.style.color = '#00e676';
            this._hostConnecting = false;
          }
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            this._hostConnecting = false;
          }
        };

        const channel = pc.createDataChannel('ctrl');
        this.dataChannel = channel;
        this._setupDataChannelEvents(channel, statusLabel);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this._waitForIceGathering(pc);

        const bakedOffer = encodeURIComponent(JSON.stringify({
          sdp: pc.localDescription
        }));

        statusLabel.textContent = 'Broadcasting host beacon...';

        fetch(`${SIGNAL_BASE}/${hostTopic}`, { method: 'POST', body: bakedOffer })
          .catch(e => console.warn('Offer post error:', e));

        this.hostBeaconInterval = setInterval(async () => {
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            clearInterval(this.hostBeaconInterval);
            return;
          }
          try {
            await fetch(`${SIGNAL_BASE}/${hostTopic}`, { method: 'POST', body: bakedOffer });
          } catch(err) {}
        }, 2000);

        this.hostPollInterval = setInterval(async () => {
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            clearInterval(this.hostPollInterval);
            return;
          }
          try {
            const res = await fetch(`${SIGNAL_BASE}/${clientTopic}`);
            const text = await res.text();
            if (!text || text.trim() === '') return;
            if (!pc.remoteDescription) {
              const envelope = JSON.parse(decodeURIComponent(text));
              if (!envelope.sdp) return;
              await pc.setRemoteDescription(envelope.sdp);
              statusLabel.textContent = 'Answer received. Linking...';
              clearInterval(this.hostPollInterval);
            }
          } catch(err) {
            console.warn('Answer poll error:', err);
          }
        }, 1500);

        this.cleanupFns.push(() => {
          clearInterval(this.hostBeaconInterval);
          clearInterval(this.hostPollInterval);
          this._hostConnecting = false;
        });

      } catch(err) {
        statusLabel.textContent = 'Error: ' + err.message;
        this._hostConnecting = false;
      }
    }

  async _generateManualOffer(offerTextArea, statusLabel) {
      if (this.peerConnection) return;
      statusLabel.textContent = 'Preparing Manual Handshake...';
      
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        this.peerConnection = pc;

        const channel = pc.createDataChannel('ctrl');
        this.dataChannel = channel;
        this._setupDataChannelEvents(channel, statusLabel);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await this._waitForIceGathering(pc);

        const bakedOffer = btoa(JSON.stringify(pc.localDescription));
        offerTextArea.value = bakedOffer;
        statusLabel.textContent = 'Copy Offer and paste into the phone app.';
      } catch (err) {
        statusLabel.textContent = 'Manual Init Error: ' + err.message;
      }
    }

  async _processManualAnswer(answerBase64, statusLabel) {
      if (!this.peerConnection) {
        statusLabel.textContent = 'Generate an offer first.';
        return;
      }
      try {
        const answerDesc = JSON.parse(atob(answerBase64.trim()));
        await this.peerConnection.setRemoteDescription(answerDesc);
        statusLabel.textContent = 'Processing completed.';
      } catch (err) {
        statusLabel.textContent = 'Error parsing Answer: ' + err.message;
      }
    }

  _waitForIceGathering(pc) {
      return new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const checkState = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', checkState);

        // Log every candidate as it arrives
        pc.addEventListener('icecandidate', (e) => {
          if (e.candidate) {
            console.log('ICE CANDIDATE:', e.candidate.candidate);
          } else {
            console.log('ICE GATHERING COMPLETE');
          }
        });

        setTimeout(resolve, 8000);
      });
    }

  _setupDataChannelEvents(channel, statusLabel) {
      channel.onopen = () => {
        statusLabel.textContent = 'Linked to phone successfully.';
        statusLabel.style.color = '#00e676';
      };
      channel.onclose = () => {
        statusLabel.textContent = 'Link closed.';
        statusLabel.style.color = '#ff8800';
      };
      channel.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          
          if (payload.type === 'dragStart') {
            if (payload.mode === 'paint') {
              this.isShiftDown = true;
              this.paintedObjectsThisStroke.clear();
            }
          } 
          else if (payload.type === 'drag') {
            this._handleRemoteDrag(payload.dx, payload.dy, payload.mode);
          } 
          else if (payload.type === 'dragEnd') {
            if (payload.mode === 'paint' || this.isShiftDown) {
              this.isShiftDown = false;
            }
          } 
          else if (payload.type === 'zoom') {
            this._handleRemoteZoom(payload.ratio);
          }
        } catch (err) {
          console.error('Error handling channel frame:', err);
        }
      };
    }

  _updateP2PRotation() {
      if (!this.joystickVelocity || (this.joystickVelocity.x === 0 && this.joystickVelocity.y === 0)) {
        return;
      }

      const THREE = this.app.THREE;
      const camera = this.app.camera;
      const controls = this.app.controls;

      // Extract looking target vector from controls, default to our model's bounds
      const target = controls ? controls.target : new THREE.Vector3(0, 0.5, 0);
      
      const offset = new THREE.Vector3().copy(camera.position).sub(target);
      const spherical = new THREE.Spherical().setFromVector3(offset);

      // Adjust orbit angles based on continuous touch velocity
      const orbitSpeedFactor = 0.035;
      spherical.theta -= this.joystickVelocity.x * orbitSpeedFactor;
      spherical.phi -= this.joystickVelocity.y * orbitSpeedFactor;

      // Enforce physical boundary limits to prevent camera flipping at poles
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      spherical.makeSafe();
      offset.setFromSpherical(spherical);
      camera.position.copy(target).add(offset);
      camera.lookAt(target);

      if (controls) {
        controls.update();
      }
    }

  _handleRemoteDrag(dx, dy, mode) {
      const THREE = this.app.THREE;
      const camera = this.app.camera;
      const controls = this.app.controls;
      const target = controls ? controls.target : new THREE.Vector3(0, 0.5, 0);

      if (mode === 'rotate') {
        const offset = new THREE.Vector3().copy(camera.position).sub(target);
        const spherical = new THREE.Spherical().setFromVector3(offset);

        // Smooth trackball angular changes
        const sensitivity = 0.005;
        spherical.theta -= dx * sensitivity;
        spherical.phi -= dy * sensitivity;

        // Apply physical constraints to avoid polar flipping
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        spherical.makeSafe();
        offset.setFromSpherical(spherical);
        camera.position.copy(target).add(offset);
        camera.lookAt(target);
        if (controls) controls.update();
      } 
      else if (mode === 'pan') {
        // Pull direct axis alignments from camera orientation matrix
        const vX = new THREE.Vector3(); // right axis
        const vY = new THREE.Vector3(); // up axis
        camera.matrix.extractBasis(vX, vY, new THREE.Vector3());

        const panSpeed = 0.005;
        const translation = new THREE.Vector3()
          .addScaledVector(vX, -dx * panSpeed)
          .addScaledVector(vY, dy * panSpeed);

        camera.position.add(translation);
        if (controls) {
          controls.target.add(translation);
          controls.update();
        }
      } 
      else if (mode === 'paint') {
        // Feed displacement directly into raycaster pointer
        const pointerSensitivity = 0.008;
        this.pointer.x += dx * pointerSensitivity;
        this.pointer.y -= dy * pointerSensitivity;

        this.pointer.x = Math.max(-1.0, Math.min(1.0, this.pointer.x));
        this.pointer.y = Math.max(-1.0, Math.min(1.0, this.pointer.y));
      }
    }

  _handleRemoteZoom(ratio) {
      const THREE = this.app.THREE;
      const camera = this.app.camera;
      const controls = this.app.controls;
      const target = controls ? controls.target : new THREE.Vector3(0, 0.5, 0);

      const offset = new THREE.Vector3().copy(camera.position).sub(target);
      offset.multiplyScalar(1 / ratio);

      const length = offset.length();
      if (length > 0.4 && length < 15.0) {
        camera.position.copy(target).add(offset);
        if (controls) controls.update();
      }
    }

  _getRTCConfig() {
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      };
    }
}