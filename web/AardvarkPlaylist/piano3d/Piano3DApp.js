
class Piano3DApp {
  
  constructor() {
    this.app = null;
    this.grid = null;

    this.glowMode = false;
    this.showOuterShape = false;
    this.showSurface = true;
    this.showTriangles = false;
    this.smoothShading = false;
    this.showBeziers = false;
    this.showTrueArcs = false;
    this.coloredSurfaces = false;
    this.colorSeed = Math.random();
    this.showGrid = false;
    this.singleKeyMode = false;
    this.enableKeyHover = true;
    this.showVertexMarkers = false;
    this.leftHanded = false;

    this.keyColor = '#000000';
    this.backgroundColor = '#1a0505';

    this.geometry = null;
    this.visuals = null;
    this.geoData = null;

    this.THREE = null;
    this.mouse = null;
    this.raycaster = null;
  }

  async init(parentElement) {
      if (!document.getElementById('canvas-container')) {
        const container = makeElement('div', { id: 'canvas-container' });
        parentElement.appendChild(container);
      }

      this._loadSettings();
      if (!this.dimensions) {
        this._resetToDefaults();
      }

      // Instantiate the active ThreeJSLoader class
      this.app = new ThreeJSLoader('canvas-container', {
        cameraPos: this.savedCamera
          ? this.savedCamera.pos
          : { x: 0.5777, y: 0.6294, z: 2.6512 },
        cameraTarget: this.savedCamera
          ? this.savedCamera.target
          : { x: 0.2088, y: 0.2443, z: 1.7126 },
        enableControls: true,
        alpha: true,
        hdrPath:
          'https://recursi.dev/thirdparty/three-js-r153/assets/textures/venice_sunset_1k.hdr',
        onUpdate: () => this._onUpdate(),
      });

      await this.app.start(document.getElementById('canvas-container'));

      this.THREE = this.app.THREE || window.THREE;
      const THREE = this.THREE;

      if (!THREE) {
        throw new Error('Piano3DApp.init failed: THREE was not loaded by ThreeJSApp.');
      }

      this.mouse = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      this.raycaster.params.Line.threshold = 0.02;

      if (this.app.renderer) {
        this.app.renderer.setClearColor(0x000000, 0);
      }

      this._updateBackground();
      this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
      this.grid.visible = !!this.showGrid;
      this.app.scene.add(this.grid);

      this.geometry = new KeyGeometry(this.dimensions, this.dimensions);
      this.visuals = new KeyVisuals(this.app);
      this.visuals.setKeyColor(this.keyColor);

      if (this.app.controls) {
        this.app.controls.maxDistance = 15000;
      }
      this.app.enableOrbit(!!this.orbitModeActive || !!this.devModeActive);

      this._updateKeyGeometry();

      if (window.projectApp?.gt?.pianoVisuals?.geometrySettings) {
        this.alignTo2D(window.projectApp.gt.pianoVisuals.geometrySettings, true);
      } else {
        this.app.resize();
      }
    }

  setDimension(prop, value) {
    if (!this.dimensions) return;
    this.dimensions[prop] = parseFloat(value);

    const now = Date.now();
    if (!this._lastDimUpdate) this._lastDimUpdate = 0;

    if (now - this._lastDimUpdate > 30) {
      this._doDimUpdate();
      this._lastDimUpdate = now;
    } else {
      if (this._dimUpdateTimer) clearTimeout(this._dimUpdateTimer);
      this._dimUpdateTimer = setTimeout(() => {
        this._doDimUpdate();
        this._lastDimUpdate = Date.now();
        this._dimUpdateTimer = null;
      }, 30);
    }
  }

  renderSettingsUI(container) {
    // Helper to create slider rows
    const mkRow = (label, prop, min, max, step = 0.01) => {
      const def = this.dimensions?.[prop] || 0;

      const row = makeElement('div', { style: 'margin-bottom:6px;' });
      const head = makeElement('div', {
        style:
          'display:flex; justify-content:space-between; font-size:10px; color:#bbb;',
      });
      head.innerHTML = `<span>${label}</span><span class="val" style="color:#4a90e2; font-family:monospace;">${def.toFixed(
        2
      )}</span>`;

      const sl = makeElement('input', {
        type: 'range',
        min,
        max,
        step,
        value: def,
        style: 'width:100%; height:4px; display:block;',
      });

      sl.oninput = () => {
        const v = parseFloat(sl.value);
        head.querySelector('.val').textContent = v.toFixed(2);
        this.setDimension(prop, v);
      };

      // Self-poll for external updates
      const poll = () => {
        if (!sl.isConnected) return; // Stop if removed
        const actual = this.dimensions[prop];
        if (Math.abs(actual - parseFloat(sl.value)) > 0.001) {
          sl.value = actual;
          head.querySelector('.val').textContent = actual.toFixed(2);
        }
        setTimeout(poll, 250);
      };
      setTimeout(poll, 250);

      row.append(head, sl);
      return row;
    };

    const addHeader = (txt) =>
      container.append(
        makeElement(
          'div',
          {
            style:
              'font-size:9px; font-weight:700; color:#666; margin:12px 0 4px 0; border-bottom:1px solid #333; padding-bottom:2px;',
          },
          txt
        )
      );

    // --- UI STRUCTURE ---

    // Actions Row
    const btnRow = makeElement('div', {
      style: 'display:flex; gap:5px; margin-bottom:10px;',
    });
    btnRow.append(
      makeElement(
        'button',
        {
          className: 'dialog-button',
          style: 'flex:1',
          onclick: () => this._resetToDefaults(),
        },
        'Reset defaults'
      )
    );
    container.append(btnRow);

    addHeader('MAIN DIMENSIONS');
    container.append(mkRow('Base Width', 'baseWidth', 0.3, 1.5));
    container.append(mkRow('Base Length', 'baseLength', 2.0, 6.0));
    container.append(mkRow('Height', 'height', 0.2, 1.5));

    addHeader('TAPERS & RADII');
    container.append(mkRow('Front Taper', 'frontTaper', 0, 1.0));
    container.append(mkRow('Side Taper', 'sideTaper', 0, 0.5));
    container.append(mkRow('Front Base Rad', 'frontBaseRadius', 0, 0.5));
    container.append(mkRow('Top Side Rad', 'topSideRadius', 0, 0.5));
    container.append(mkRow('Front Top Rad', 'frontTopRadius', 0, 0.5));
    container.append(mkRow('Top Corner Rad', 'topCornerRadius', 0.01, 0.5));
    container.append(mkRow('Side Corner Rad', 'sideCornerRadius', 0.01, 0.5));
    container.append(mkRow('Front Corner Rad', 'frontCornerRadius', 0.01, 0.5));

    addHeader('SURFACE BULGE');
    container.append(mkRow('Top Inner', 'topBulgeInner', 0.1, 1.0));
    container.append(mkRow('Top Outer', 'topBulgeOuter', 0.1, 1.5));
    container.append(mkRow('Side Inner', 'sideBulgeInner', 0.1, 1.0));
    container.append(mkRow('Side Outer', 'sideBulgeOuter', 0.1, 1.5));
    container.append(mkRow('Front Inner', 'frontBulgeInner', 0.1, 1.0));
    container.append(mkRow('Front Outer', 'frontBulgeOuter', 0.1, 1.5));

    addHeader('TRIANGLE DETAIL');
    container.append(mkRow('Tri Bulge', 'triCenterBulge', -0.05, 0.1));
    container.append(mkRow('Shift X', 'triShiftX', -0.5, 0.5));
    container.append(mkRow('Shift Y', 'triShiftY', -0.5, 0.5));
    container.append(mkRow('Shift Z', 'triShiftZ', -0.5, 0.5));
  }

  _updateKeyGeometry() {
    if (!this.geometry || !this.visuals) return;

    // SAVE ACTIVE NOTES
    const activeNotes = [];
    if (this.visuals && this.visuals.keysByMidi) {
      this.visuals.keysByMidi.forEach((data, mc) => {
        if (Math.abs(data.pivot.rotation.x) > 0.01) {
          activeNotes.push(mc);
        }
      });
    }

    const options = {
      showOuterShape: this.showOuterShape,
      showSurface: this.showSurface,
      showTriangles: this.showTriangles,
      showBeziers: this.showBeziers,
      showTrueArcs: this.showTrueArcs,
      coloredSurfaces: this.coloredSurfaces,
      colorSeed: this.colorSeed,
      glowMode: !!this.glowMode,
      singleKeyMode: !!this.singleKeyMode,
      leftHanded: !!this.leftHanded,
      minMidi: this._linkedMinMidi ?? 36,
      maxMidi: this._linkedMaxMidi ?? 84,
    };

    this._updateBackground();

    this.geoData = this.geometry.calculate(options);
    this.visuals.update(this.geoData, options, this.dimensions);

    if (this.showVertexMarkers) {
      this.visuals.spawnVertexMarkers(this.geoData.points);

      this.visuals.groups.vertexTop.position.set(0, 0, 0);
      this.visuals.groups.vertexSide.position.set(0, 0, 0);
      this.visuals.groups.vertexFront.position.set(0, 0, 0);
      this.visuals.groups.vertexCenter.position.set(0, 0, 0);
    } else {
      this.visuals.spawnVertexMarkers({});
    }

    if (window.projectApp?.gt?.pianoVisuals?.geometrySettings) {
      this.alignTo2D(window.projectApp.gt.pianoVisuals.geometrySettings);
    }

    // RESTORE ACTIVE NOTES
    if (this.visuals && activeNotes.length > 0) {
      activeNotes.forEach((mc) => this.visuals.toggleNoteDisplay(mc, true));
    }
  }

  _onUpdate() {
    // Left intentionally blank - Pivot controls removed
  }

  _updateBackground() {
    if (this.app && this.app.scene) {
      this.app.scene.background = null;
    }
    // FIX: We NEVER touch document.body.style.backgroundColor here anymore.
    // It was wiping out the video player. The 3D canvas must remain transparent.
  }

  _saveSettings() {
    // Intentionally left blank. We no longer persist developer/demo 3D settings
    // to local storage so the piano always resets to a clean, expected state.
  }

  _loadSettings() {
    // Clear out any old saved settings to prevent weird state bugs
    localStorage.removeItem('piano3d_settings_v3');
  }

  _resetToDefaults() {
    this.dimensions = {
      baseWidth: 0.66,
      baseLength: 4.0,
      height: 0.52,
      frontTaper: 0.34,
      sideTaper: 0.1,
      frontBaseRadius: 0.04,
      topSideRadius: 0.034,
      frontTopRadius: 0.07,
      topCornerRadius: 0.17,
      sideCornerRadius: 0.27,
      frontCornerRadius: 0.22,
      topBulgeInner: 0.464,
      topBulgeOuter: 0.81,
      sideBulgeInner: 0.29,
      sideBulgeOuter: 0.6,
      frontBulgeInner: 0.53,
      frontBulgeOuter: 0.59,
      triCenterBulge: 0.035,
      triShiftX: -0.007,
      triShiftY: -0.012,
      triShiftZ: -0.005,
      octaves: 4,
      whiteKeyWidth: 1.12,
      whiteKeyLengthExtension: 2.0,
      whiteKeyHeight: 0.14,
      keyGap: 0.04,
      whiteCornerRadius: 0.1,
      whiteBevelRadius: 0.063,
      blackKeyYOffset: 0.0,
      cluster2Spread: 0.112,
      cluster3Spread: 0.173,
      whitePivotBehindFactor: 0.5,
      blackPivotBehindFactor: 0.6667,
    };

    this.keyColor = '#000000';
    this.backgroundColor = '#1a0505';

    this.glowMode = false;
    this.showOuterShape = false;
    this.showSurface = true;
    this.showTriangles = false;
    this.coloredSurfaces = false;
    this.enableKeyHover = true;
    this.singleKeyMode = false;
    this.showGrid = false;
    this.showVertexMarkers = false;
    this.leftHanded = false;
    this.orbitModeActive = false;
    this.devModeActive = false;
    this.stealthMode = false;

    // Re-enable orbit controls to match reset state
    if (this.app) this.app.enableOrbit(false);

    if (this.geometry && this.visuals) {
      this._updateKeyGeometry();
      this._updateBackground();
      if (this.grid) this.grid.visible = this.showGrid;
    }

    if (this.app && this.app.camera && this.app.controls) {
      this.app.camera.position.set(0.5777, 0.6294, 2.6512);
      this.app.controls.target.set(0.2088, 0.2443, 1.7126);
      this.app.controls.update();
    }

    this._saveSettings();
  }

  _showIdBox(x, y, fullId, shortName) {
    let box = document.getElementById('gt-id-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'gt-id-box';
      box.style.cssText =
        'position:fixed; padding:5px 8px; background:rgba(0,0,0,0.8); color:#fff; border-radius:4px; font-size:11px; pointer-events:none; z-index:100000; border:1px solid #555;';
      document.body.appendChild(box);
    }
    box.style.display = 'block';
    box.style.left = x + 15 + 'px';
    box.style.top = y + 15 + 'px';
    box.innerHTML = `<b>${shortName}</b><br><span style="color:#aaa">${fullId}</span>`;
  }

  _hideIdBox() {
    const box = document.getElementById('gt-id-box');
    if (box) box.style.display = 'none';
  }

  _copySettingsJSON() {
    let camState = null;
    if (this.app && this.app.camera && this.app.controls) {
      camState = {
        pos: this.app.camera.position.clone(),
        target: this.app.controls.target.clone(),
      };
    }

    const payload = {
      dimensions: this.dimensions,
      toggles: {
        glowMode: this.glowMode,
        showOuterShape: this.showOuterShape,
        showSurface: this.showSurface,
        showTriangles: this.showTriangles,
        coloredSurfaces: this.coloredSurfaces,
        singleKeyMode: this.singleKeyMode,
        showGrid: this.showGrid,
        showVertexMarkers: this.showVertexMarkers,
        enableKeyHover: this.enableKeyHover,
      },
      colors: {
        keyColor: this.keyColor,
        backgroundColor: this.backgroundColor,
      },
      camera: camState,
    };

    const json = JSON.stringify(payload, null, 2);
    navigator.clipboard
      .writeText(json)
      .then(() => {
        alert(
          'Settings copied to clipboard!\n\n' + json.substring(0, 200) + '...'
        );
      })
      .catch((err) => {
        console.error('Failed to copy settings', err);
      });
  }

  toggleNoteDisplay(midiCode, turnOn) {
    if (this.visuals) {
      this.visuals.toggleNoteDisplay(midiCode, turnOn);
    }
  }

  alignTo2D(gs, forceUpdate = false) {
      if (!this.app || !this.app.camera || !gs) return;

      if (this.devModeActive) return;

      const newMinMidi = gs.minMidi ?? 36;
      const newMaxMidi = gs.maxMidi ?? 84;
      const newLeftHanded = !!gs.leftHanded;

      const rangeChanged =
        this._linkedMinMidi !== newMinMidi || this._linkedMaxMidi !== newMaxMidi;
      const handedChanged = this.leftHanded !== newLeftHanded;

      this._linkedMinMidi = newMinMidi;
      this._linkedMaxMidi = newMaxMidi;
      this.leftHanded = newLeftHanded;

      if (rangeChanged || handedChanged || forceUpdate) {
        this._updateKeyGeometry();
      }

      const vp = window.projectApp ? window.projectApp.rootElement.querySelector('#gt-master-viewport') : document.getElementById('gt-master-viewport');
      const cvs = window.projectApp ? window.projectApp.rootElement.querySelector('#canvas-container') : document.getElementById('canvas-container');
      
      let viewportW = window.projectApp ? window.projectApp.getAppWidth() : window.innerWidth;
      let viewportH = window.projectApp ? window.projectApp.getAppHeight() : window.innerHeight;

      if (vp && cvs) {
        const rect = vp.getBoundingClientRect();
        if (rect.width > 10) {
          viewportW = rect.width;
          viewportH = rect.height;
        }

        if (cvs.style.left !== vp.style.left) cvs.style.left = vp.style.left;
        cvs.style.width = viewportW + 'px';
        cvs.style.height = viewportH + 'px';

        if (forceUpdate || this._lastVpW !== viewportW || this._lastVpH !== viewportH) {
          if (this.app) this.app.resize(viewportW, viewportH);
          this._lastVpW = viewportW;
          this._lastVpH = viewportH;
        }
      }

      viewportW = Math.max(1, viewportW);
      viewportH = Math.max(1, viewportH);

      const cam = this.app.camera;
      const basePerspective = gs.perspective || 2100;
      const effectivePerspective = basePerspective;

      const fov =
        2 * Math.atan(viewportH / (2 * effectivePerspective)) * (180 / Math.PI);

      const actionBarLocalY = gs.start || gs.actionBarY || 0;
      const yOffset = viewportH / 2 - actionBarLocalY;

      if (!this.orbitModeActive) {
        cam.setViewOffset(viewportW, viewportH, 0, yOffset, viewportW, viewportH);
        cam.fov = Math.max(1, fov);
        cam.near = 1;
        cam.far = Math.max(basePerspective, effectivePerspective) + 5000;
        cam.aspect = viewportW / viewportH;
        cam.position.set(0, 0, effectivePerspective);
        cam.lookAt(0, 0, 0);
        cam.updateProjectionMatrix();
      } else {
        cam.aspect = viewportW / viewportH;
        cam.updateProjectionMatrix();
      }

      const wWidth = this.dimensions.whiteKeyWidth || 1.12;
      const gap = this.dimensions.keyGap || 0.04;
      const step = wWidth + gap;

      let whiteCount = 0;
      for (let mc = newMinMidi; mc <= newMaxMidi; mc++) {
        const mod = ((mc % 12) + 12) % 12;
        if (
          mod === 0 || mod === 2 || mod === 4 || mod === 5 ||
          mod === 7 || mod === 9 || mod === 11
        ) {
          whiteCount++;
        }
      }

      const total3DWidth = whiteCount > 0 ? whiteCount * step - gap : step;
      const stretch = (gs.keyStretch || 100) / 100;
      const baseWidthPx = gs.w || viewportW;
      const targetWidthPx = baseWidthPx * stretch;
      const scale = targetWidthPx / total3DWidth;

      const fineX = gs.fineX || 0;
      const center2D_X = fineX + targetWidthPx / 2;
      
      // Link 2D horizontal xShift directly into the 3D calculation
      const objectPixelX = center2D_X - viewportW / 2 + (gs.xShift || 0);

      const pivotX = objectPixelX / scale;
      const pivotY = 0;

      if (!this.orbitModeActive && this.app.controls) {
        this.app.controls.target.set(pivotX, pivotY, 0);
        this.app.controls.update();
      }

      const cssTiltRad = THREE.MathUtils.degToRad(gs.rotation || 0);
      const baseLength = this.dimensions.baseLength ?? 4.0;

      const applyTransform = (group) => {
        group.position.set(pivotX, pivotY, 0);
        group.rotation.set(0, 0, 0);
        group.scale.set(1, 1, 1);

        const sx = this.leftHanded ? -scale : scale;
        group.scale.set(sx, scale, scale);

        const cssRotYRad = THREE.MathUtils.degToRad(gs.rotationY || 0);
        const cssRotZRad = THREE.MathUtils.degToRad(gs.rotationZ || 0);

        const eulerOuter = new THREE.Euler(
          -cssTiltRad,
          cssRotYRad,
          -cssRotZRad,
          'XYZ'
        );
        const quatOuter = new THREE.Quaternion().setFromEuler(eulerOuter);

        const eulerInner = new THREE.Euler(Math.PI / 2, 0, 0, 'XYZ');
        const quatInner = new THREE.Quaternion().setFromEuler(eulerInner);

        const finalQuat = new THREE.Quaternion().multiplyQuaternions(
          quatOuter,
          quatInner
        );

        group.quaternion.copy(finalQuat);
        group.translateY(gs.zShift || 0);
        group.translateZ(baseLength / 2);
      };

      if (this.visuals) {
        Object.values(this.visuals.groups).forEach(applyTransform);
      }
    }

  turnOffAllNotes() {
    if (this.visuals) this.visuals.turnOffAllNotes();
  }

  _build3DDialogContent(container) {
    const app = this.blackKeyApp;

    const btnRow = makeElement('div', {
      style: 'display:flex; gap:5px; margin-bottom:10px;',
    });
    btnRow.append(
      makeElement(
        'button',
        {
          className: 'dialog-button',
          style: 'flex:1',
          onclick: () => {
            app._resetToDefaults();
            container.innerHTML = '';
            this._build3DDialogContent(container);
          },
        },
        'Reset Defaults'
      ),
      makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style: 'flex:1',
          onclick: () => app._copySettingsJSON(),
        },
        'Copy JSON'
      )
    );
    container.appendChild(btnRow);

    const toggles = [
      {
        label: 'Orbit Mode',
        prop: 'orbitModeActive',
        updateFn: () => {
          if (app.app) app.app.enableOrbit(app.orbitModeActive);
          if (window.projectApp?.gt?.pianoVisuals?.geometrySettings) {
            app.alignTo2D(window.projectApp.gt.pianoVisuals.geometrySettings);
          }
        },
      },
      { label: 'Single Key Mode', prop: 'singleKeyMode' },
      { label: 'Wireframe', prop: 'showOuterShape' },
      { label: 'Surface', prop: 'showSurface' },
      { label: 'Triangles', prop: 'showTriangles' },
      { label: 'Multi-Color', prop: 'coloredSurfaces' },
      {
        label: 'Grid',
        prop: 'showGrid',
        updateFn: () => {
          app.grid.visible = app.showGrid;
        },
      },
      { label: 'ID Tool', prop: 'showVertexMarkers' },
      { label: 'Hover Effect', prop: 'enableKeyHover' },
    ];

    const toggleCont = makeElement('div', {
      style:
        'display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #333;',
    });

    toggles.forEach((t) => {
      const lbl = makeElement('label', {
        style:
          'display:flex; align-items:center; font-size:10px; color:#ccc; cursor:pointer;',
      });
      const chk = makeElement('input', {
        type: 'checkbox',
        checked: !!app[t.prop],
      });
      chk.onchange = () => {
        app[t.prop] = chk.checked;
        if (t.updateFn) t.updateFn();
        else app._updateKeyGeometry();
      };
      lbl.append(
        chk,
        makeElement('span', { style: 'margin-left:5px' }, t.label)
      );
      toggleCont.append(lbl);
    });
    container.append(toggleCont);

    const swatchContainer = makeElement('div', {
      style:
        'margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #333; display:flex; gap:15px; justify-content:center;',
    });

    const mkSwatch = (label, getVal, setVal) => {
      const val = getVal();
      const wrapper = makeElement('div', {
        style: 'display:flex; align-items:center; gap:8px;',
      });
      wrapper.append(
        makeElement('span', { style: 'font-size:10px; color:#888' }, label)
      );
      const swatch = makeElement('div', {
        style: `width:20px; height:20px; background:${
          val || 'transparent'
        }; border:1px solid #555; border-radius:3px; cursor:pointer; box-shadow:0 0 4px rgba(0,0,0,0.5);`,
      });
      swatch.onclick = (e) => {
        Promise.resolve({ ColorPicker: (typeof ColorPicker !== "undefined" ? ColorPicker : null) }).then(({ ColorPicker }) => {
          if (!ColorPicker) { console.warn("ColorPicker not loaded"); return; }
          new ColorPicker().openSmartPicker(e.target, getVal(), (newHex) => {
            swatch.style.background = newHex;
            setVal(newHex);
          });
        }).catch(e => console.warn(e));
      };
      wrapper.append(swatch);
      return wrapper;
    };

    swatchContainer.append(
      mkSwatch(
        'Key:',
        () => app.keyColor || '#000000',
        (c) => {
          app.keyColor = c;
          app.coloredSurfaces = false;
          app.visuals.setKeyColor(c);
          app._updateKeyGeometry();
        }
      )
    );
    swatchContainer.append(
      mkSwatch(
        'Background:',
        () => app.backgroundColor || '#1a0505',
        (c) => {
          app.backgroundColor = c;
          app._updateBackground();
        }
      )
    );
    container.appendChild(swatchContainer);

    const mkGroup = (l) =>
      container.appendChild(
        makeElement(
          'div',
          {
            style:
              'color:#4a90e2; font-size:9px; font-weight:700; margin:10px 0 4px 0; letter-spacing:1px;',
          },
          l
        )
      );

    const mkSet = (l, prop, min, max, step, def) => {
      return this._mkDialogSlider(
        l,
        () =>
          app?.dimensions && app.dimensions[prop] !== undefined
            ? app.dimensions[prop]
            : def,
        (v) => {
          if (app) app.setDimension(prop, v);
        },
        min,
        max,
        step
      );
    };

    mkGroup('KEYBOARD LAYOUT');
    container.append(
      mkSet('Octaves', 'octaves', 1, 4, 1, 2),
      mkSet('W Width', 'whiteKeyWidth', 0.1, 2.0, 0.01, 1.12),
      mkSet('W Front Ext', 'whiteKeyLengthExtension', 0, 5.0, 0.01, 2.0),
      mkSet('W Height', 'whiteKeyHeight', 0.01, 1.5, 0.01, 0.14),
      mkSet('Key Gap', 'keyGap', 0, 0.2, 0.001, 0.04),
      mkSet('W Corner R', 'whiteCornerRadius', 0, 0.5, 0.01, 0.1),
      mkSet('W Bevel R', 'whiteBevelRadius', 0, 0.1, 0.001, 0.063),
      mkSet('B Y-Offset', 'blackKeyYOffset', -0.5, 1.0, 0.01, 0.0),
      mkSet('2-Clust Spr', 'cluster2Spread', -0.5, 0.5, 0.001, 0.112),
      mkSet('3-Clust Spr', 'cluster3Spread', -0.5, 0.5, 0.001, 0.173)
    );

    mkGroup('DIMENSIONS');
    container.append(
      mkSet('Base Width', 'baseWidth', 0.3, 1.5, 0.01, 0.66),
      mkSet('Base Length', 'baseLength', 2.0, 6.0, 0.01, 4.0),
      mkSet('Height', 'height', 0.2, 1.5, 0.01, 0.52)
    );

    mkGroup('TAPERS & RADII');
    container.append(
      mkSet('Front Taper', 'frontTaper', 0, 1.0, 0.001, 0.34),
      mkSet('Side Taper', 'sideTaper', 0, 0.5, 0.001, 0.1),
      mkSet('FrontBase R', 'frontBaseRadius', 0, 0.5, 0.001, 0.04),
      mkSet('TopSide R', 'topSideRadius', 0, 0.5, 0.001, 0.034),
      mkSet('FrontTop R', 'frontTopRadius', 0, 0.5, 0.001, 0.07),
      mkSet('TopCorner R', 'topCornerRadius', 0.01, 0.5, 0.001, 0.17),
      mkSet('SideCorner R', 'sideCornerRadius', 0.01, 0.5, 0.001, 0.27),
      mkSet('FrCorner R', 'frontCornerRadius', 0.01, 0.5, 0.001, 0.22)
    );

    mkGroup('SURFACE BULGE');
    container.append(
      mkSet('Top Inner', 'topBulgeInner', 0.1, 1.0, 0.001, 0.464),
      mkSet('Top Outer', 'topBulgeOuter', 0.1, 1.5, 0.001, 0.81),
      mkSet('Side Inner', 'sideBulgeInner', 0.1, 1.0, 0.001, 0.29),
      mkSet('Side Outer', 'sideBulgeOuter', 0.1, 1.5, 0.001, 0.6),
      mkSet('Front Inner', 'frontBulgeInner', 0.1, 1.0, 0.001, 0.53),
      mkSet('Front Outer', 'frontBulgeOuter', 0.1, 1.5, 0.001, 0.59)
    );

    mkGroup('TRIANGLE DETAIL');
    container.append(
      mkSet('Tri Bulge', 'triCenterBulge', -0.05, 0.1, 0.001, 0.035),
      mkSet('Shift X', 'triShiftX', -0.5, 0.5, 0.001, -0.007),
      mkSet('Shift Y', 'triShiftY', -0.5, 0.5, 0.001, -0.012),
      mkSet('Shift Z', 'triShiftZ', -0.5, 0.5, 0.001, -0.005)
    );
  }

  _doDimUpdate() {
    if (this.geometry && this.visuals) {
      this._updateKeyGeometry();
    }
    this._saveSettings();

    // Recalibrate the 3D object to the 2D layout constraints after rebuild
    if (window.projectApp?.gt?.pianoVisuals?.geometrySettings) {
      this.alignTo2D(window.projectApp.gt.pianoVisuals.geometrySettings);
    }
  }

  destroy() {
    if (this.app) {
      // ThreeJSApp uses 'destroy()', not 'dispose()'. We check for both for safety.
      if (typeof this.app.destroy === 'function') this.app.destroy();
      else if (typeof this.app.dispose === 'function') this.app.dispose();
      this.app = null;
    }
    if (this.visuals) {
      this.visuals.clear();
      this.visuals = null;
    }
    this.geometry = null;
    if (this._dimUpdateTimer) {
      clearTimeout(this._dimUpdateTimer);
    }
  }

  // Override the legacy metadata getter so it is cleanly ignored
    static get metadata() {
      return undefined;
    }

}

