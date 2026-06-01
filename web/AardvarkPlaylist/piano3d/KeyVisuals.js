
class KeyVisuals {

  constructor(app) {
    this.app = app;
    this.meshes = {
      lines: [],
      solids: [],
      curves: [],
      vertices: [],
      fillets: [],
      highlights: [],
    };

    this.groups = {
      wireframe: new THREE.Group(),
      surface: new THREE.Group(),
      vertexTop: new THREE.Group(),
      vertexSide: new THREE.Group(),
      vertexFront: new THREE.Group(),
      vertexCenter: new THREE.Group(),
    };

    this.keysByMidi = new Map(); // High-performance lookup map for MIDI interaction

    Object.values(this.groups).forEach((g) => this.app.scene.add(g));

    this.keyColor = '#880000';
    this.interactiveMode = false;
    this.hoveredKeyMesh = null;
    this.splitTextureCache = {};

    this._initMaterials();
  }

  _initMaterials() {
    const plasticParams = {
      metalness: 0.1,
      roughness: 0.05, // Restored to 0.05 (shinier)
      clearcoat: 1.0, // Restored to 1.0 (maximum polish)
      clearcoatRoughness: 0.0,
      envMapIntensity: 1.0, // Ensure environment reflects strongly
      side: THREE.DoubleSide,
    };

    this.materials = {
      // Standard Surface: Opaque Glossy
      defaultSurface: new THREE.MeshPhysicalMaterial({
        ...plasticParams,
        color: this.keyColor,
      }),
    };
  }

  setKeyColor(color) {
    this.keyColor = color;
    // Update the actual material color so Single Key View updates immediately
    if (this.materials.defaultSurface) {
      this.materials.defaultSurface.color.set(color);
    }
  }

  clear() {
    const disposeList = (arr) => {
      arr.forEach((m) => {
        if (m.geometry) m.geometry.dispose();
        // DO NOT DISPOSE MATERIALS:
        // The default and press materials are shared across all keys and live
        // permanently to preserve WebGL context/programs.
        m.parent?.remove(m);
      });
      arr.length = 0;
    };

    disposeList(this.meshes.lines);
    disposeList(this.meshes.solids);
    disposeList(this.meshes.curves);
    disposeList(this.meshes.fillets);
    disposeList(this.meshes.highlights);
    disposeList(this.meshes.vertices);

    this.keysByMidi.clear(); // Clear the map on rebuild

    const clearGroup = (g) => {
      while (g.children.length > 0) {
        g.remove(g.children[0]);
      }
    };
    clearGroup(this.groups.surface);
    clearGroup(this.groups.wireframe);
  }

  update(geoData, options = {}, dimensions = null) {
    this.clear();
    this.dimensions = dimensions || this.dimensions;
    this._initPressMaterials(options);

    if (!this.materials.whiteSurface) {
      this.materials.whiteSurface = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.05,
        clearcoat: 0.5,
      });
    }

    if (options.glowMode) {
      this.materials.whiteSurface.color.setHex(0x111111);
      this.materials.defaultSurface.color.setHex(0x111111);
    } else {
      this.materials.whiteSurface.color.setHex(0xffffff);
      this.materials.defaultSurface.color.set(this.keyColor);
    }

    const originalSurfaceGroup = this.groups.surface;
    const originalWireframeGroup = this.groups.wireframe;

    const baseSurface = new THREE.Group();
    const baseWireframe = new THREE.Group();

    this.groups.surface = baseSurface;
    this.groups.wireframe = baseWireframe;

    this._updateSingleKeyVisuals(geoData, options);

    this.groups.surface = originalSurfaceGroup;
    this.groups.wireframe = originalWireframeGroup;

    if (options.leftHanded) {
      this.groups.surface.scale.set(-1, 1, 1);
      this.groups.wireframe.scale.set(-1, 1, 1);
    } else {
      this.groups.surface.scale.set(1, 1, 1);
      this.groups.wireframe.scale.set(1, 1, 1);
    }

    if (options.singleKeyMode) {
      baseSurface.children.forEach((child) => {
        child.userData = { ...child.userData };
        child.userData.defaultMat = child.material;
        child.userData.pressMat = this.pressMaterials.black[0];
        child.userData.keyParent = baseSurface;
      });
      this.groups.surface.add(baseSurface);
      this.groups.wireframe.add(baseWireframe);
      return;
    }

    this.meshes.solids = this.meshes.solids.filter(
      (m) => !baseSurface.children.includes(m)
    );
    this.meshes.lines = this.meshes.lines.filter(
      (m) => !baseWireframe.children.includes(m)
    );
    this.meshes.fillets = this.meshes.fillets.filter(
      (m) => !baseSurface.children.includes(m)
    );

    const keyGeo = new KeyGeometry(this.dimensions, this.dimensions);
    const whiteMat = this.materials.whiteSurface;
    const whiteWireMat = new THREE.LineBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.3,
    });

    const minMidi = options.minMidi ?? 36;
    const maxMidi = options.maxMidi ?? 84;

    const whiteWidth =
      this.dimensions.whiteKeyWidth !== undefined
        ? this.dimensions.whiteKeyWidth
        : 1.0;
    const gap =
      this.dimensions.keyGap !== undefined ? this.dimensions.keyGap : 0.05;
    const bw =
      this.dimensions.baseWidth !== undefined
        ? this.dimensions.baseWidth
        : 0.66;
    const step = whiteWidth + gap;

    const c2s =
      this.dimensions.cluster2Spread !== undefined
        ? this.dimensions.cluster2Spread
        : 0.0;
    const c3s =
      this.dimensions.cluster3Spread !== undefined
        ? this.dimensions.cluster3Spread
        : 0.0;

    const isWhiteMidi = (mc) => {
      const mod = ((mc % 12) + 12) % 12;
      return (
        mod === 0 ||
        mod === 2 ||
        mod === 4 ||
        mod === 5 ||
        mod === 7 ||
        mod === 9 ||
        mod === 11
      );
    };

    const whiteIndexInOctave = (mc) => {
      const mod = ((mc % 12) + 12) % 12;
      const map = {
        0: 0,
        2: 1,
        4: 2,
        5: 3,
        7: 4,
        9: 5,
        11: 6,
      };
      return map[mod];
    };

    const blackAnchorInfo = (mc) => {
      const mod = ((mc % 12) + 12) % 12;
      if (mod === 1) return { wkIdx: 0, spread: -c2s };
      if (mod === 3) return { wkIdx: 1, spread: c2s };
      if (mod === 6) return { wkIdx: 3, spread: -c3s };
      if (mod === 8) return { wkIdx: 4, spread: 0 };
      if (mod === 10) return { wkIdx: 5, spread: c3s };
      return null;
    };

    const baseCutout = bw / 2;
    const cutouts = [
      { L: 0, R: baseCutout + c2s },
      { L: baseCutout - c2s, R: baseCutout - c2s },
      { L: baseCutout + c2s, R: 0 },
      { L: 0, R: baseCutout + c3s },
      { L: baseCutout - c3s, R: baseCutout },
      { L: baseCutout, R: baseCutout - c3s },
      { L: baseCutout + c3s, R: 0 },
    ];

    const baseWhiteKeys = [];
    const baseWhiteWires = [];

    for (let i = 0; i < 7; i++) {
      const whiteGeo = keyGeo.createWhiteKeyGeometry(
        this.dimensions,
        cutouts[i].L,
        cutouts[i].R
      );
      baseWhiteKeys.push(new THREE.Mesh(whiteGeo, whiteMat));
      baseWhiteWires.push(
        new THREE.LineSegments(new THREE.EdgesGeometry(whiteGeo), whiteWireMat)
      );
    }

    const whiteMidiList = [];
    const blackMidiList = [];
    for (let mc = minMidi; mc <= maxMidi; mc++) {
      if (isWhiteMidi(mc)) whiteMidiList.push(mc);
      else blackMidiList.push(mc);
    }

    const totalWhiteKeys = whiteMidiList.length;
    const keyboardWidth = totalWhiteKeys * step - gap;
    const startX = -keyboardWidth / 2 + whiteWidth / 2;

    const whiteIndexByMidi = {};
    whiteMidiList.forEach((mc, i) => {
      whiteIndexByMidi[mc] = i;
    });

    const blackBaseLength =
      this.dimensions.baseLength !== undefined
        ? this.dimensions.baseLength
        : 4.0;

    const whiteFrontExt =
      this.dimensions.whiteKeyLengthExtension !== undefined
        ? this.dimensions.whiteKeyLengthExtension
        : 2.0;

    const whiteKeyDepth = blackBaseLength + whiteFrontExt;

    const whitePivotBehind =
      blackBaseLength * (this.dimensions.whitePivotBehindFactor ?? 0.5);
    const blackPivotBehind =
      blackBaseLength * (this.dimensions.blackPivotBehindFactor ?? 0.6667);

    const whitePivotZ = -(whiteKeyDepth / 2 + whitePivotBehind);
    const blackPivotZ = -(blackBaseLength / 2 + blackPivotBehind);

    // Initialize tracking map
    this.keysByMidi = new Map();

    for (const mc of whiteMidiList) {
      const i = whiteIndexInOctave(mc);
      const whiteIdx = whiteIndexByMidi[mc];
      const px = startX + whiteIdx * step;

      const pivot = new THREE.Group();
      pivot.position.set(px, 0, whitePivotZ + blackBaseLength / 2);

      const keyGroup = new THREE.Group();
      keyGroup.position.set(0, 0, -whitePivotZ);
      pivot.add(keyGroup);

      const wk = baseWhiteKeys[i].clone();
      const wkWire = baseWhiteWires[i].clone();

      wk.userData = {
        defaultMat: wk.material,
        pressMat: this.pressMaterials.white[i],
        keyParent: keyGroup,
        midiCode: mc,
      };

      if (options.showSurface) {
        keyGroup.add(wk);
        this.meshes.solids.push(wk);
      }
      if (options.showOuterShape || options.showTriangles) {
        keyGroup.add(wkWire);
        this.meshes.lines.push(wkWire);
      }
      this.groups.surface.add(pivot);

      // Save strictly formatted reference into our high-speed lookup map
      this.keysByMidi.set(Number(mc), {
        pivot: pivot,
        parts: [
          {
            mesh: wk,
            defaultMat: wk.material,
            pressMat: this.pressMaterials.white[i],
          },
        ],
      });
    }

    for (const mc of blackMidiList) {
      const info = blackAnchorInfo(mc);
      if (!info) continue;

      const mod = ((mc % 12) + 12) % 12;
      const octaveBase = mc - mod;

      let leftWhiteMidi = null;
      let rightWhiteMidi = null;
      if (mod === 1) {
        leftWhiteMidi = octaveBase + 0;
        rightWhiteMidi = octaveBase + 2;
      } else if (mod === 3) {
        leftWhiteMidi = octaveBase + 2;
        rightWhiteMidi = octaveBase + 4;
      } else if (mod === 6) {
        leftWhiteMidi = octaveBase + 5;
        rightWhiteMidi = octaveBase + 7;
      } else if (mod === 8) {
        leftWhiteMidi = octaveBase + 7;
        rightWhiteMidi = octaveBase + 9;
      } else if (mod === 10) {
        leftWhiteMidi = octaveBase + 9;
        rightWhiteMidi = octaveBase + 11;
      }

      if (
        whiteIndexByMidi[leftWhiteMidi] === undefined ||
        whiteIndexByMidi[rightWhiteMidi] === undefined
      ) {
        continue;
      }

      const xLeft = startX + whiteIndexByMidi[leftWhiteMidi] * step;
      const xRight = startX + whiteIndexByMidi[rightWhiteMidi] * step;
      const bx = (xLeft + xRight) / 2 + info.spread;

      const by =
        this.dimensions.blackKeyYOffset !== undefined
          ? this.dimensions.blackKeyYOffset
          : 0.0;

      const pivot = new THREE.Group();
      pivot.position.set(bx, by, blackPivotZ + blackBaseLength / 2);

      const keyGroup = new THREE.Group();
      keyGroup.position.set(0, 0, -blackPivotZ);
      pivot.add(keyGroup);

      const keyParts = [];

      baseSurface.children.forEach((child) => {
        const clone = child.clone();
        clone.userData = { ...child.userData };
        clone.userData.defaultMat = clone.material;
        clone.userData.pressMat = this.pressMaterials.black[info.wkIdx];
        clone.userData.keyParent = keyGroup;
        clone.userData.midiCode = mc;

        if (options.showSurface) {
          keyGroup.add(clone);
          this.meshes.solids.push(clone);
          this.meshes.fillets.push(clone);
          keyParts.push({
            mesh: clone,
            defaultMat: clone.material,
            pressMat: clone.userData.pressMat,
          });
        }
      });

      baseWireframe.children.forEach((child) => {
        const clone = child.clone();
        if (
          options.showOuterShape ||
          options.showTriangles ||
          options.showBeziers
        ) {
          keyGroup.add(clone);
          this.meshes.lines.push(clone);
        }
      });

      this.groups.surface.add(pivot);
      this.keysByMidi.set(Number(mc), { pivot: pivot, parts: keyParts });
    }
  }

  spawnVertexMarkers(points) {
    // Clear old markers
    const clearGroup = (g) => {
      while (g.children.length) {
        const m = g.children[0];
        m.geometry.dispose();
        m.material.dispose();
        g.remove(m);
      }
    };
    clearGroup(this.groups.vertexTop);
    clearGroup(this.groups.vertexSide);
    clearGroup(this.groups.vertexFront);
    clearGroup(this.groups.vertexCenter);
    this.meshes.vertices = [];

    // HALF SIZE SPHERE (0.0075 radius)
    const sphereGeo = new THREE.SphereGeometry(0.0075, 8, 8);

    // SHINY MATERIALS (MeshPhysicalMaterial)
    const baseMat = new THREE.MeshPhysicalMaterial({
      roughness: 0.2,
      metalness: 0.5,
      clearcoat: 1.0,
    });

    const matTop = baseMat.clone();
    matTop.color.set(0xff0000);
    const matSide = baseMat.clone();
    matSide.color.set(0xffff00);
    const matFront = baseMat.clone();
    matFront.color.set(0xff00ff);
    const matCenter = baseMat.clone();
    matCenter.color.set(0x00ff00);

    const counters = { Top: 1, Side: 1, Front: 1, Center: 1 };

    Object.entries(points).forEach(([id, p]) => {
      // Filter mirrored (negative X)
      if (p.pos.x < -0.001) return;

      const category = this._getVertexCategory(id);
      let group, mat;

      switch (category) {
        case 'Top':
          group = this.groups.vertexTop;
          mat = matTop;
          break;
        case 'Side':
          group = this.groups.vertexSide;
          mat = matSide;
          break;
        case 'Front':
          group = this.groups.vertexFront;
          mat = matFront;
          break;
        default:
          group = this.groups.vertexCenter;
          mat = matCenter;
          break;
      }

      const num = counters[category]++;
      const shortName = `${category} ${num}`;

      const mesh = new THREE.Mesh(sphereGeo, mat.clone());
      mesh.position.copy(p.pos);
      mesh.userData = { id, shortName, type: 'vertex' };
      mesh.renderOrder = 999;

      group.add(mesh);
      this.meshes.vertices.push(mesh);
    });
  }

  _generateFilletSurfaces(geoData, options) {
    const { showTriangles, showSurface, coloredSurfaces, colorSeed } = options;

    const addMesh = (geo, name) => {
      if (!geo) return;

      this._applyPlanarUVs(geo);

      if (showSurface) {
        let mat;
        if (coloredSurfaces) {
          // Pass Seed
          const col = this._getSaturatedColor(name, colorSeed);
          mat = this.materials.defaultSurface.clone();
          mat.color.set(col);
        } else {
          mat = this.materials.defaultSurface;
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { id: name, type: 'surface' };
        this.groups.surface.add(mesh);
        this.meshes.fillets.push(mesh);
        this.meshes.solids.push(mesh);
      }

      if (showTriangles) {
        const wireColor = showSurface ? 0x000000 : this.keyColor;
        const opacity = showSurface ? 0.2 : 1.0;

        const wireMat = new THREE.MeshBasicMaterial({
          color: wireColor,
          wireframe: true,
          transparent: true,
          opacity: opacity,
        });

        if (!showSurface) {
          // Pass Seed to wireframe too if colored
          wireMat.color = new THREE.Color(
            coloredSurfaces
              ? this._getSaturatedColor(name, colorSeed)
              : this.keyColor
          );
        }

        const wireMesh = new THREE.Mesh(geo, wireMat);
        wireMesh.userData = { id: name + '_wire', type: 'wireframe' };
        wireMesh.renderOrder = 1;
        this.groups.surface.add(wireMesh);
        this.meshes.fillets.push(wireMesh);
      }
    };

    // Re-declaring helpers for context
    const createPatch = (cp, name) => {
      const geo = this._createBezierPatch(cp);
      addMesh(geo, name);
    };
    const getPos = (k) =>
      geoData.points[k] ? geoData.points[k].pos : new THREE.Vector3();
    const mirror = (p) => {
      const m = p.clone();
      m.x = -m.x;
      return m;
    };
    const getCurveCPs = (id) => {
      const c = geoData.curves.find((x) => x.id === id);
      return c ? [c.p0, c.p1, c.p2, c.p3] : null;
    };
    const createRuledPatch = (idA, idB, name) => {
      const cA = getCurveCPs(idA);
      const cB = getCurveCPs(idB);
      if (!cA || !cB) return;
      const grid = [];
      for (let r = 0; r < 4; r++) {
        const row = [];
        const t = r / 3.0;
        for (let c = 0; c < 4; c++) row.push(cA[c].clone().lerp(cB[c], t));
        grid.push(row);
      }
      createPatch(grid, name);
      createPatch(
        grid.map((r) => r.map((p) => mirror(p))),
        name + '_Mir'
      );
    };

    // Geometry calls
    if (geoData.points['N']) {
      const cpTF = [
        [
          getPos('N'),
          getPos('Bez_Edge_FrontTop_CP1'),
          getPos('Bez_Edge_FrontTop_CP2'),
          getPos('L'),
        ],
        [
          getPos('Bez_TopCorner_2_CP2'),
          getPos('Inner_N'),
          getPos('Inner_L'),
          getPos('Bez_FrontCorner_1_CP1'),
        ],
        [
          getPos('Bez_TopCorner_2_CP1'),
          getPos('CentralOut_TopCorner_R'),
          getPos('CentralIn_FrontCorner_R'),
          getPos('Bez_FrontCorner_1_CP2'),
        ],
        [
          getPos('Or_Mid'),
          getPos('Int_TopCorner_R'),
          getPos('Int_FrontCorner_R'),
          getPos('Grn_Mid'),
        ],
      ];
      createPatch(cpTF, 'Corner_TopFront');
      createPatch(
        cpTF.map((r) => r.map((p) => mirror(p))),
        'Corner_TopFront_Mir'
      );
    }
    if (geoData.points['M']) {
      const cpTS = [
        [
          getPos('M'),
          getPos('Bez_Edge_TopSide_CP1'),
          getPos('Bez_Edge_TopSide_CP2'),
          getPos('K'),
        ],
        [
          getPos('Bez_TopCorner_1_CP1'),
          getPos('Inner_M'),
          getPos('Inner_K'),
          getPos('Bez_SideCorner_1_CP1'),
        ],
        [
          getPos('Bez_TopCorner_1_CP2'),
          getPos('CentralIn_TopCorner_R'),
          getPos('CentralIn_SideCorner_R'),
          getPos('Bez_SideCorner_1_CP2'),
        ],
        [
          getPos('Or_Mid'),
          getPos('Int_TopCorner_R'),
          getPos('Int_SideCorner_R'),
          getPos('Yel_Mid'),
        ],
      ];
      createPatch(cpTS, 'Corner_TopSide');
      createPatch(
        cpTS.map((r) => r.map((p) => mirror(p))),
        'Corner_TopSide_Mir'
      );
    }
    if (geoData.points['J']) {
      const cpFS = [
        [
          getPos('J'),
          getPos('Bez_Edge_FrontSide_CP1'),
          getPos('Bez_Edge_FrontSide_CP2'),
          getPos('I'),
        ],
        [
          getPos('Bez_FrontCorner_2_CP2'),
          getPos('Inner_J'),
          getPos('Inner_I'),
          getPos('Bez_SideCorner_2_CP2'),
        ],
        [
          getPos('Bez_FrontCorner_2_CP1'),
          getPos('CentralOut_FrontCorner_R'),
          getPos('CentralOut_SideCorner_R'),
          getPos('Bez_SideCorner_2_CP1'),
        ],
        [
          getPos('Grn_Mid'),
          getPos('Int_FrontCorner_R'),
          getPos('Int_SideCorner_R'),
          getPos('Yel_Mid'),
        ],
      ];
      createPatch(cpFS, 'Corner_FrontSide');
      createPatch(
        cpFS.map((r) => r.map((p) => mirror(p))),
        'Corner_FrontSide_Mir'
      );
    }

    if (geoData.points['Or_Mid']) {
      const triOpts = {
        A: getPos('Or_Mid'),
        B: getPos('Grn_Mid'),
        C: getPos('Yel_Mid'),
        A_to_B: getPos('Int_TopCorner_R'),
        B_to_A: getPos('Int_FrontCorner_R'),
        A_to_C: getPos('Int_TopCorner_R'),
        C_to_A: getPos('Int_SideCorner_R'),
        B_to_C: getPos('Int_FrontCorner_R'),
        C_to_B: getPos('Int_SideCorner_R'),
        segments: 32,
        center: getPos('Tri_Center'),
      };
      addMesh(this._createBezierTriangle(triOpts), 'Center_Tri');
      const mOpts = {
        ...triOpts,
        A: mirror(triOpts.A),
        B: mirror(triOpts.B),
        C: mirror(triOpts.C),
        A_to_B: mirror(triOpts.A_to_B),
        B_to_A: mirror(triOpts.B_to_A),
        A_to_C: mirror(triOpts.A_to_C),
        C_to_A: mirror(triOpts.C_to_A),
        B_to_C: mirror(triOpts.B_to_C),
        C_to_B: mirror(triOpts.C_to_B),
        center: mirror(triOpts.center),
      };
      addMesh(this._createBezierTriangle(mOpts), 'Center_Tri_Mir');
    }

    createRuledPatch('Bez_Back_Top', 'Bez_Edge_TopSide', 'Strip_BackTop');
    createRuledPatch(
      'Bez_Center_Front',
      'Bez_Edge_FrontTop',
      'Strip_CenterFront'
    );
    createRuledPatch('Bez_Base_Corner', 'Bez_Edge_FrontSide', 'Strip_BaseSide');
    this._generateCaps(geoData, addMesh);
  }

  _generateCaps(geoData, addMesh) {
    const { points, curves } = geoData;
    const dim = this.dimensions; // USE CORRECT DIMENSIONS

    if (!points.M || !points.N || !points.K) return;

    const sampleC = (id) => {
      const c = curves.find((x) => x.id === id);
      if (!c) return [];
      return new THREE.CubicBezierCurve3(c.p0, c.p1, c.p2, c.p3).getPoints(6);
    };
    const getPos = (k) => (points[k] ? points[k].pos : new THREE.Vector3());

    // Calc Z-Back from dimensions
    const z_Back_Calc = -dim.baseLength / 2;

    // --- 1. TOP CAP ---
    const pM = getPos('M');
    const pN = getPos('N');
    const cBackTop = curves.find((c) => c.id === 'Bez_Back_Top');
    // Use curve start if avail, else projection
    const pBackTopM = cBackTop
      ? cBackTop.p0
      : new THREE.Vector3(pM.x, pM.y, z_Back_Calc);

    const topPts = [
      new THREE.Vector3(0, pM.y, z_Back_Calc),
      pBackTopM,
      pM,
      ...sampleC('Bez_TopCorner_1'),
      ...sampleC('Bez_TopCorner_2'),
      new THREE.Vector3(0, pN.y, pN.z),
    ];
    this._createCapMesh(topPts, false, addMesh, 'Cap_Top_R', 'xz');
    this._createCapMesh(topPts, true, addMesh, 'Cap_Top_L', 'xz');

    // --- 2. SIDE CAP ---
    const pK = getPos('K');
    const pI = getPos('I');
    const pBackTopK = cBackTop
      ? cBackTop.p3
      : new THREE.Vector3(pK.x, pK.y, z_Back_Calc);

    // Taper math using actual dimensions
    const projectToBottom = (p) =>
      new THREE.Vector3(
        p.x + p.y * (dim.sideTaper / dim.height),
        0,
        p.z + p.y * (dim.frontTaper / dim.height)
      );

    const pK_Back = pBackTopK;
    // FIX: Add taper for back bottom point (Right side gets wider)
    const pBottom_Back = new THREE.Vector3(
      pK_Back.x + dim.sideTaper * (pK.y / dim.height),
      0,
      z_Back_Calc
    );

    // Check if Bez_Base_Corner exists to match exact bottom curve
    const cBase = curves.find((c) => c.id === 'Bez_Base_Corner');
    const pI_Bottom = cBase ? cBase.p3 : projectToBottom(pI);

    const sidePts = [
      pK_Back,
      pK,
      ...sampleC('Bez_SideCorner_1'),
      ...sampleC('Bez_SideCorner_2'),
      pI,
      pI_Bottom,
      pBottom_Back,
    ];
    this._createCapMesh(sidePts, false, addMesh, 'Cap_Side_R', 'yz');
    this._createCapMesh(sidePts, true, addMesh, 'Cap_Side_L', 'yz');

    // --- 3. FRONT CAP ---
    const pL = getPos('L');
    const pJ = getPos('J');
    const pJ_Bottom = cBase ? cBase.p0 : projectToBottom(pJ);

    const cCenterFront = curves.find((c) => c.id === 'Bez_Center_Front');
    const pL_Center = cCenterFront
      ? cCenterFront.p3
      : new THREE.Vector3(0, pL.y, pL.z);

    const zFrontBase = dim.baseLength / 2;
    const pCenter_Bottom = new THREE.Vector3(0, 0, zFrontBase);

    const frontPts = [
      pL_Center,
      pL,
      ...sampleC('Bez_FrontCorner_1'),
      ...sampleC('Bez_FrontCorner_2'),
      pJ,
      pJ_Bottom,
      pCenter_Bottom,
    ];
    this._createCapMesh(frontPts, false, addMesh, 'Cap_Front_R', 'xy');
    this._createCapMesh(frontPts, true, addMesh, 'Cap_Front_L', 'xy');
  }

  _bernstein(t) {
    const it = 1 - t;
    return [it * it * it, 3 * t * it * it, 3 * t * t * it, t * t * t];
  }

  _createBezierPatch(controlPoints, divisionsU = 14, divisionsV = 14) {
    const sizeU = divisionsU + 1;
    const sizeV = divisionsV + 1;
    const positions = new Float32Array(sizeU * sizeV * 3);
    const uvs = new Float32Array(sizeU * sizeV * 2);
    let idx = 0;
    for (let iv = 0; iv < sizeV; iv++) {
      const v = iv / divisionsV;
      const Bv = this._bernstein(v);
      for (let iu = 0; iu < sizeU; iu++) {
        const u = iu / divisionsU;
        const Bu = this._bernstein(u);
        const p = new THREE.Vector3();
        for (let j = 0; j < 4; j++) {
          let temp = new THREE.Vector3();
          for (let i = 0; i < 4; i++) {
            temp.add(controlPoints[j][i].clone().multiplyScalar(Bu[i]));
          }
          p.add(temp.multiplyScalar(Bv[j]));
        }
        positions[idx * 3 + 0] = p.x;
        positions[idx * 3 + 1] = p.y;
        positions[idx * 3 + 2] = p.z;
        uvs[idx * 2 + 0] = u;
        uvs[idx * 2 + 1] = v;
        idx++;
      }
    }
    const indices = [];
    for (let iv = 0; iv < divisionsV; iv++) {
      for (let iu = 0; iu < divisionsU; iu++) {
        const a = iv * sizeU + iu;
        const b = a + 1;
        const c = a + sizeU + 1;
        const d = a + sizeU;
        indices.push(a, b, c);
        indices.push(a, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  _createBezierTriangle(opts) {
    const toV3 = (p) => (p && p.isVector3 ? p : new THREE.Vector3());
    const P = {
      P300: toV3(opts.A),
      P030: toV3(opts.B),
      P003: toV3(opts.C),
      P210: toV3(opts.A_to_B),
      P120: toV3(opts.B_to_A),
      P201: toV3(opts.A_to_C),
      P102: toV3(opts.C_to_A),
      P021: toV3(opts.B_to_C),
      P012: toV3(opts.C_to_B),
      P111: toV3(opts.center),
    };

    const evalTri = (u, v, w) => {
      const u2 = u * u,
        v2 = v * v,
        w2 = w * w;
      const u3 = u * u2,
        v3 = v * v2,
        w3 = w * w2;
      const out = new THREE.Vector3();
      out.addScaledVector(P.P300, u3);
      out.addScaledVector(P.P030, v3);
      out.addScaledVector(P.P003, w3);
      out.addScaledVector(P.P210, 3 * u2 * v);
      out.addScaledVector(P.P120, 3 * u * v2);
      out.addScaledVector(P.P201, 3 * u2 * w);
      out.addScaledVector(P.P102, 3 * u * w2);
      out.addScaledVector(P.P021, 3 * v2 * w);
      out.addScaledVector(P.P012, 3 * v * w2);
      out.addScaledVector(P.P111, 6 * u * v * w);
      return out;
    };

    const N = 8;
    const positions = [];
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N - i; j++) {
        const k = N - i - j;
        const p = evalTri(i / N, j / N, k / N);
        positions.push(p.x, p.y, p.z);
      }
    }

    const indices = [];
    let vIdx = 0;
    const rowStart = [];
    for (let i = 0; i <= N; i++) {
      rowStart.push(vIdx);
      vIdx += N - i + 1;
    }

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N - i; j++) {
        const a = rowStart[i] + j;
        const b = rowStart[i + 1] + j;
        const c = rowStart[i] + j + 1;
        indices.push(a, b, c);
        if (j < N - i - 1) {
          const d = rowStart[i + 1] + j + 1;
          indices.push(b, d, c);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  _getSaturatedColor(seedStr, randomSeed) {
    let hash = 0;

    // Mix the string name with the random seed
    const combinedStr = seedStr + (randomSeed || 0);

    if (combinedStr) {
      for (let i = 0; i < combinedStr.length; i++) {
        hash = combinedStr.charCodeAt(i) + ((hash << 5) - hash);
      }
    } else {
      hash = Math.floor(Math.random() * 100000);
    }

    // Deterministic HSL based on hash
    const h = Math.abs((hash % 360) / 360);

    // Saturation: 0.85 to 1.0 (Very vivid, no pastels)
    const s = 0.85 + Math.abs((hash >> 8) % 15) / 100;

    // Lightness: 0.45 to 0.55 (Pure colors, avoiding white tints or dark shades)
    const l = 0.45 + Math.abs((hash >> 16) % 10) / 100;

    return new THREE.Color().setHSL(h, s, l);
  }

  _generateCapSurface(points, mirrorX, addMesh, name) {
    if (points.length < 3) return;

    // Create the contour points
    const contour = points.map((p) => {
      const v = p.clone();
      if (mirrorX) v.x = -v.x;
      return v;
    });

    // Close the loop if not closed
    if (contour[0].distanceTo(contour[contour.length - 1]) > 0.0001) {
      contour.push(contour[0]);
    }

    // Determine orientation for projection (avoid degenerate triangles)
    let shape;

    if (name.includes('Top')) {
      // Project to XZ plane
      shape = new THREE.Shape(contour.map((p) => new THREE.Vector2(p.x, p.z)));
      const geo = new THREE.ShapeGeometry(shape);
      // Restore Y height
      const pos = geo.attributes.position;
      const y = points[0].y;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i, pos.getX(i), y, pos.getY(i));
      }
      geo.computeVertexNormals();
      addMesh(geo, name);
    } else if (name.includes('Side')) {
      // Project to YZ (Side view) - This works well for the side of a key
      // Note: We use -Z for the Y axis of the shape to keep orientation sane
      shape = new THREE.Shape(contour.map((p) => new THREE.Vector2(p.z, p.y)));

      // However, ShapeGeometry generates 2D mesh. We need to map it back to the 3D tapered plane.
      // Since Side surface is roughly planar but tapered, simple ShapeGeometry flat mapping
      // will result in a flat mesh in the YZ plane (X=0). We need to restore the X values.

      // 1. Generate flat geometry
      const geo = new THREE.ShapeGeometry(shape);
      const pos = geo.attributes.position;

      // 2. Restore X values by interpolation or plane equation
      // Easier: Use the original contour and a triangulation algorithm that respects 3D vertices
      // But ShapeGeometry is robust. Let's try to map the Z,Y back to X.
      // X is a function of Y (sideTaper). X = hw_top + (y - height) * slope... roughly.

      // Better approach: Use my _createPolygonMesh which keeps 3D coordinates.
      this._createPolygonMesh(contour, addMesh, name);
    } else {
      // Front - Project to XY
      this._createPolygonMesh(contour, addMesh, name);
    }
  }

  _getVertexCategory(id) {
    // 1. Center / Tri
    if (id.includes('Tri_Center')) return 'Center';

    // 2. Edge Control Points (Directional Splitting)
    // TopSide Edge: CP1->Top(M), CP2->Side(K)
    if (id.includes('Bez_Edge_TopSide_CP1')) return 'Top';
    if (id.includes('Bez_Edge_TopSide_CP2')) return 'Side';

    // FrontTop Edge: CP1->Top(N), CP2->Front(L)
    if (id.includes('Bez_Edge_FrontTop_CP1')) return 'Top';
    if (id.includes('Bez_Edge_FrontTop_CP2')) return 'Front';

    // FrontSide Edge: CP1->Front(J), CP2->Side(I)
    if (id.includes('Bez_Edge_FrontSide_CP1')) return 'Front';
    if (id.includes('Bez_Edge_FrontSide_CP2')) return 'Side';

    // 3. Corners & Inner Refs (Grouped by name)
    if (
      id.includes('TopCorner') ||
      id.includes('Inner_M') ||
      id.includes('Inner_N')
    )
      return 'Top';
    if (
      id.includes('SideCorner') ||
      id.includes('Inner_K') ||
      id.includes('Inner_I')
    )
      return 'Side';
    if (
      id.includes('FrontCorner') ||
      id.includes('Inner_L') ||
      id.includes('Inner_J')
    )
      return 'Front';

    // 4. Profiles
    if (id.includes('Back_Top')) return 'Top';
    if (id.includes('Center_Front')) return 'Front';
    // Base Corner connects Front(J) and Side(I). Usually viewed as side profile/base.
    if (id.includes('Base_Corner')) return 'Side';

    // 5. Single Letter Anchors
    const topChars = ['M', 'N', 'Or_Mid'];
    if (topChars.includes(id)) return 'Top';

    const sideChars = ['K', 'I', 'Yel_Mid'];
    if (sideChars.includes(id)) return 'Side';

    const frontChars = ['L', 'J', 'Grn_Mid'];
    if (frontChars.includes(id)) return 'Front';

    // Fallback
    return 'Center';
  }

  _createPolygonMesh(vertices, addMesh, name) {
    // 1. Calculate best-fit normal for projection
    const p0 = vertices[0],
      p1 = vertices[Math.floor(vertices.length / 2)],
      p2 = vertices[vertices.length - 2];
    const v1 = new THREE.Vector3().subVectors(p1, p0);
    const v2 = new THREE.Vector3().subVectors(p2, p0);
    const n = new THREE.Vector3().crossVectors(v1, v2).normalize();

    // 2. Project to 2D
    let u = 'x',
      v = 'y';
    // Pick the dominant axes to avoid squashing
    if (Math.abs(n.y) > 0.9) {
      u = 'x';
      v = 'z';
    } // Top-like
    else if (Math.abs(n.x) > 0.9) {
      u = 'z';
      v = 'y';
    } // Side-like
    else {
      u = 'x';
      v = 'y';
    } // Front-like

    // Remove duplicate end point for triangulation if present
    const polyVerts = [...vertices];
    if (polyVerts[0].distanceTo(polyVerts[polyVerts.length - 1]) < 0.0001) {
      polyVerts.pop();
    }

    const flat = polyVerts.map((p) => new THREE.Vector2(p[u], p[v]));
    const triangles = THREE.ShapeUtils.triangulateShape(flat, []);

    const positions = [];
    triangles.forEach((face) => {
      // THREE.ShapeUtils returns indices [0, 1, 2]
      // We map these indices back to our 3D 'polyVerts'
      [0, 1, 2].forEach((i) => {
        const vert = polyVerts[face[i]];
        positions.push(vert.x, vert.y, vert.z);
      });
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geo.computeVertexNormals();

    // Ensure we handle double-sided rendering properly in the addMesh function
    addMesh(geo, name);
  }

  _createPolySurface(points, mirrorX, addMesh, name) {
    if (points.length < 3) return;

    // 1. Generate 3D Contour
    const contour = points.map((p) => {
      const v = p.clone();
      if (mirrorX) v.x = -v.x;
      return v;
    });

    // Close loop if needed
    if (contour[0].distanceTo(contour[contour.length - 1]) > 0.0001) {
      contour.push(contour[0]);
    }

    // 2. Compute Average Normal (Robust planar projection)
    // We sum the cross products of adjacent edges (Newell's method simplified)
    const normal = new THREE.Vector3();
    for (let i = 0; i < contour.length - 1; i++) {
      const curr = contour[i];
      const next = contour[i + 1];
      normal.x += (curr.y - next.y) * (curr.z + next.z);
      normal.y += (curr.z - next.z) * (curr.x + next.x);
      normal.z += (curr.x - next.x) * (curr.y + next.y);
    }
    normal.normalize();

    // 3. Create Rotation to Align Normal with Z-Axis (2D)
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(
      normal,
      new THREE.Vector3(0, 0, 1)
    );
    const invQuat = alignQuat.clone().invert();

    // 4. Flatten Points
    const flatPoints = contour.map((p) => {
      const pRot = p.clone().applyQuaternion(alignQuat);
      return new THREE.Vector2(pRot.x, pRot.y);
    });

    // 5. Triangulate
    const triangles = THREE.ShapeUtils.triangulateShape(flatPoints, []);

    if (!triangles || triangles.length === 0) {
      console.warn(`Triangulation failed for surface: ${name}`);
      return;
    }

    // 6. Build 3D Mesh from Triangles
    const positions = [];
    triangles.forEach((face) => {
      // Face is [idx0, idx1, idx2]
      // Push vertices in correct winding order
      // Note: ShapeUtils might return indices that imply CW or CCW.
      // We rely on double-sided material, but generally ShapeUtils is CCW.
      [0, 1, 2].forEach((i) => {
        const v = contour[face[i]];
        positions.push(v.x, v.y, v.z);
      });
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.computeVertexNormals();

    addMesh(geometry, name);
  }

  _createCapMesh(points, mirrorX, addMesh, name, planeMode) {
    if (points.length < 3) return;

    // 1. Generate 3D Contour & Filter Duplicates
    const contour = [];
    const epsilon = 0.0001;

    points.forEach((p, i) => {
      const v = p.clone();
      if (mirrorX) v.x = -v.x;

      // Skip if identical to previous point
      if (
        contour.length > 0 &&
        contour[contour.length - 1].distanceTo(v) < epsilon
      ) {
        return;
      }
      contour.push(v);
    });

    // Close the loop check (if last == first, remove last to let triangulation handle closure or keep unique)
    // ShapeUtils usually expects unique vertices.
    if (
      contour.length > 2 &&
      contour[0].distanceTo(contour[contour.length - 1]) < epsilon
    ) {
      contour.pop();
    }

    if (contour.length < 3) {
      console.warn(
        `Cap ${name}: Not enough points after filtering duplicates.`
      );
      return;
    }

    // 2. Project to 2D
    const flatPoints = contour.map((p) => {
      if (planeMode === 'xz') return new THREE.Vector2(p.x, p.z);
      if (planeMode === 'yz') return new THREE.Vector2(p.z, p.y);
      if (planeMode === 'xy') return new THREE.Vector2(p.x, p.y);
      return new THREE.Vector2(p.x, p.z);
    });

    // 3. Triangulate
    const triangles = THREE.ShapeUtils.triangulateShape(flatPoints, []);

    if (!triangles || triangles.length === 0) {
      console.error(
        `Triangulation failed for ${name}. Points: ${flatPoints.length}`
      );
      return;
    }

    //console.log(`Generated ${name}: ${triangles.length} triangles`);

    // 4. Build Mesh
    const positions = [];
    triangles.forEach((face) => {
      // ShapeUtils returns indices [0, 1, 2] corresponding to our contour array
      [0, 1, 2].forEach((k) => {
        const v = contour[face[k]];
        positions.push(v.x, v.y, v.z);
      });
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.computeVertexNormals();

    addMesh(geometry, name);
  }

  _updateSingleKeyVisuals(geoData, options) {
    const THREE = this.app.THREE || window.THREE;
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

    // Wireframes (Yellow outlines)
    if (options.showOuterShape) {
      geoData.lineDefs.forEach((def) => {
        if (def.points.length < 2) return;
        const positions = [];
        def.points.forEach((p) => positions.push(p.x, p.y, p.z));

        // Use the addon modules loaded correctly onto this.app rather than looking for global collisions
        if (this.app.modules.LineGeometry && this.app.modules.LineMaterial && this.app.modules.Line2) {
          const geometry = new this.app.modules.LineGeometry();
          geometry.setPositions(positions);
          const linewidth = def.type === 'bezier' ? 0.004 : 0.002;
          const material = new this.app.modules.LineMaterial({
            color: def.color,
            linewidth,
            worldUnits: true,
            resolution,
          });
          const mesh = new this.app.modules.Line2(geometry, material);
          this.groups.wireframe.add(mesh);
          this.meshes.lines.push(mesh);
        } else {
          // Fallback to basic lines if the thick lines addon isn't toggled
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          const material = new THREE.LineBasicMaterial({ color: def.color });
          const mesh = new THREE.Line(geometry, material);
          this.groups.wireframe.add(mesh);
          this.meshes.lines.push(mesh);
        }
      });
    }

    // Surfaces & Solid Wireframes
    // Call if either surface or triangles are requested
    if (options.showSurface || options.showTriangles) {
      this._generateFilletSurfaces(geoData, options);
    }

    // Debug Curves (Invisible tubes usually)
    if (geoData.curves && options.showBeziers) {
      geoData.curves.forEach((c) => {
        const path = new THREE.CubicBezierCurve3(c.p0, c.p1, c.p2, c.p3);
        const tubeGeo = new THREE.TubeGeometry(path, 10, 0.006, 4, false);
        const tubeMat = new THREE.MeshBasicMaterial({ visible: false }); 
        const mesh = new THREE.Mesh(tubeGeo, tubeMat);
        mesh.userData = { id: c.id, type: 'curve' };
        this.groups.wireframe.add(mesh);
        this.meshes.curves.push(mesh);
      });
    }
  }

  _applyPlanarUVs(geometry) {
    geometry.computeBoundingBox();
    const w = this.dimensions.baseWidth || 1.0;

    const posAttribute = geometry.attributes.position;
    const count = posAttribute.count;

    // Ensure UVs exist
    if (!geometry.attributes.uv) {
      geometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(count * 2), 2)
      );
    }
    const uvs = geometry.attributes.uv;

    for (let i = 0; i < count; i++) {
      const x = posAttribute.getX(i);
      const u = x / w + 0.5;
      // Map Z to V just to have valid coordinates, though texture is 1D horizontal
      const z = posAttribute.getZ(i);
      const v = z / this.dimensions.baseLength + 0.5;
      uvs.setXY(i, u, v);
    }
    uvs.needsUpdate = true;

    // Ensure normals are perfect for reflections
    geometry.computeVertexNormals();
  }

  _initPressMaterials(options) {
    if (
      this.pressMaterials &&
      this._lastGlowMode === options.glowMode &&
      this._lastLeftHanded === options.leftHanded
    )
      return;
    this._lastGlowMode = options.glowMode;
    this._lastLeftHanded = options.leftHanded;

    const plasticParams = {
      metalness: 0.1,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      side: THREE.DoubleSide,
    };

    const wColors = options.leftHanded
      ? [
          '#ffff00',
          '#ff8800',
          '#ff0000',
          '#ff00ff',
          '#6600ff',
          '#0088ff',
          '#00ff00',
        ]
      : [
          '#ff0000',
          '#ff8800',
          '#ffff00',
          '#00ff00',
          '#0088ff',
          '#6600ff',
          '#ff00ff',
        ];

    const isGlow = options.glowMode;

    this.pressMaterials = {
      white: wColors.map(
        (c) =>
          new THREE.MeshPhysicalMaterial({
            ...plasticParams,
            color: isGlow ? c : c,
            emissive: isGlow ? c : 0x000000,
            emissiveIntensity: isGlow ? 1.5 : 0.0,
            flatShading: false,
          })
      ),
      black: [],
    };

    const makeSplit = (c1, c2) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 4;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = c1;
      ctx.fillRect(0, 0, 128, 4);
      ctx.fillStyle = c2;
      ctx.fillRect(128, 0, 128, 4);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      return new THREE.MeshPhysicalMaterial({
        ...plasticParams,
        map: tex,
        color: isGlow ? 0x222222 : 0xffffff,
        emissiveMap: isGlow ? tex : null,
        emissive: isGlow ? 0xffffff : 0x000000,
        emissiveIntensity: isGlow ? 1.5 : 0.0,
        flatShading: false,
      });
    };

    if (options.leftHanded) {
      this.pressMaterials.black[0] = makeSplit(wColors[1], wColors[0]);
      this.pressMaterials.black[1] = makeSplit(wColors[2], wColors[1]);
      this.pressMaterials.black[3] = makeSplit(wColors[4], wColors[3]);
      this.pressMaterials.black[4] = makeSplit(wColors[5], wColors[4]);
      this.pressMaterials.black[5] = makeSplit(wColors[6], wColors[5]);
    } else {
      this.pressMaterials.black[0] = makeSplit(wColors[0], wColors[1]);
      this.pressMaterials.black[1] = makeSplit(wColors[1], wColors[2]);
      this.pressMaterials.black[3] = makeSplit(wColors[3], wColors[4]);
      this.pressMaterials.black[4] = makeSplit(wColors[4], wColors[5]);
      this.pressMaterials.black[5] = makeSplit(wColors[5], wColors[6]);
    }
  }

  toggleNoteDisplay(midiCode, turnOn) {
    const keyData = this.keysByMidi.get(Number(midiCode));
    if (!keyData) return;

    const mc = Number(midiCode);
    const isWhite = [0, 2, 4, 5, 7, 9, 11].includes(((mc % 12) + 12) % 12);
    const angle = isWhite ? 0.04 : 0.06;
    const stealthMode = window.projectApp?.piano3DApp?.stealthMode;

    if (turnOn) {
      keyData.parts.forEach((p) => {
        if (!stealthMode) p.mesh.material = p.pressMat;
      });
      keyData.pivot.rotation.x = angle;
    } else {
      keyData.parts.forEach((p) => {
        p.mesh.material = p.defaultMat;
      });
      keyData.pivot.rotation.x = 0;
    }
  }

  turnOffAllNotes() {
    this.keysByMidi.forEach((keyData) => {
      keyData.parts.forEach((p) => (p.mesh.material = p.defaultMat));
      keyData.pivot.rotation.x = 0;
    });
  }

}

