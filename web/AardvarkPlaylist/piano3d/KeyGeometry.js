
class KeyGeometry {
  constructor(dimensions, pianoSettings) {
    this.dim = dimensions;
    this.settings = pianoSettings;
    this.points = {};
    this.curves = [];
    this.lineDefs = [];

    this.C = {
      RED: 0xff0000,
      ORANGE: 0xffa500,
      YELLOW: 0xffff00,
      GREEN: 0x00ff00,
      BLUE: 0x0088ff,
      PURPLE: 0x9400d3,
      WHITE: 0xffffff,
      GREY: 0x888888,
      CYAN: 0x00ffff,
      MAGENTA: 0xff00ff,
    };
  }

  addP(k, v, d) {
    this.points[k] = { pos: v, desc: d };
  }

  calculate(options = {}) {
    const {
      showOuterShape = true,
      showBeziers = true,
      showTrueArcs = true,
    } = options;

    this.points = {};
    this.curves = [];
    this.lineDefs = [];

    const {
      baseWidth,
      baseLength,
      height,
      frontTaper,
      sideTaper,
      frontBaseRadius,
      topSideRadius,
      frontTopRadius,
      topCornerRadius,
      sideCornerRadius,
      frontCornerRadius,

      // New independent bulge params
      topBulgeInner,
      topBulgeOuter,
      sideBulgeInner,
      sideBulgeOuter,
      frontBulgeInner,
      frontBulgeOuter,

      triCenterBulge,
      triShiftX,
      triShiftY,
      triShiftZ,
    } = this.dim;

    const hw_base = baseWidth / 2;
    const topWidth = Math.max(0.01, baseWidth - sideTaper * 2);
    const hw_top = topWidth / 2;
    const z_front_base = baseLength / 2;
    const z_back = -baseLength / 2;
    const z_front_top = Math.max(z_back + 0.01, z_front_base - frontTaper);

    // Wireframe Box
    const wirePts = [
      new THREE.Vector3(-hw_base, 0, z_front_base),
      new THREE.Vector3(hw_base, 0, z_front_base),
      new THREE.Vector3(hw_base, 0, z_back),
      new THREE.Vector3(-hw_base, 0, z_back),
      new THREE.Vector3(-hw_top, height, z_front_top),
      new THREE.Vector3(hw_top, height, z_front_top),
      new THREE.Vector3(hw_top, height, z_back),
      new THREE.Vector3(-hw_top, height, z_back),
    ];

    const wireIndices = [
      0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7,
    ];

    if (showOuterShape) {
      for (let i = 0; i < wireIndices.length; i += 2) {
        this.lineDefs.push({
          points: [wirePts[wireIndices[i]], wirePts[wireIndices[i + 1]]],
          color: this.C.CYAN,
          type: 'wireframe',
        });
      }
    }

    const getOff = (r, vec) => {
      const norm = vec.length();
      return norm < 1e-9 ? 0 : (r * (norm - Math.abs(vec.y))) / Math.abs(vec.x);
    };

    const d_side_off = getOff(
      topSideRadius,
      new THREE.Vector2(height, -sideTaper)
    );
    const d_front_off = getOff(
      frontTopRadius,
      new THREE.Vector2(height, -frontTaper)
    );

    const tan_p_top_side = new THREE.Vector2(hw_top - d_side_off, height);
    const tan_p_top_front = new THREE.Vector2(
      z_front_top - d_front_off,
      height
    );

    const top_corner_sharp = new THREE.Vector3(
      tan_p_top_side.x,
      height,
      tan_p_top_front.x
    );

    const corner_dir = new THREE.Vector3(
      -sideTaper,
      height,
      -frontTaper
    ).normalize();

    const s_front_R = new THREE.Vector3(
      hw_base - frontBaseRadius,
      0,
      z_front_base
    );
    const s_side_R = new THREE.Vector3(
      hw_base,
      0,
      z_front_base - frontBaseRadius
    );

    const tan_p_side = new THREE.Vector2(hw_top, height).add(
      new THREE.Vector2(sideTaper, -height)
        .normalize()
        .multiplyScalar(d_side_off)
    );
    const tan_p_front = new THREE.Vector2(z_front_top, height).add(
      new THREE.Vector2(frontTaper, -height)
        .normalize()
        .multiplyScalar(d_front_off)
    );

    const ray_front = new THREE.Ray(s_front_R, corner_dir);
    const plane_front_tan = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      -tan_p_front.x
    );
    const e_front_R = new THREE.Vector3();
    ray_front.intersectPlane(plane_front_tan, e_front_R);

    const ray_side = new THREE.Ray(s_side_R, corner_dir);
    const plane_side_tan = new THREE.Plane(
      new THREE.Vector3(1, 0, 0),
      -tan_p_side.x
    );
    const e_side_R = new THREE.Vector3();
    ray_side.intersectPlane(plane_side_tan, e_side_R);

    const vLeft = new THREE.Vector3(-1, 0, 0);
    const vBack = new THREE.Vector3(0, 0, -1);
    const vSideDown = new THREE.Vector3()
      .subVectors(s_side_R, e_side_R)
      .normalize();
    const vFrontDown = new THREE.Vector3()
      .subVectors(s_front_R, e_front_R)
      .normalize();

    // Arcs
    const arcTop = this.generateArcData(
      top_corner_sharp,
      vBack,
      vLeft,
      topCornerRadius
    );
    this.addP('M', arcTop.tan1, 'Top Side Tan');
    this.addP('N', arcTop.tan2, 'Top Front Tan');
    this.addP('Or_Mid', arcTop.midPoint, 'Top Corner Mid');

    const arcSide = this.generateArcData(
      e_side_R,
      vBack,
      vSideDown,
      sideCornerRadius
    );
    this.addP('K', arcSide.tan1, 'Side Vert Top');
    this.addP('I', arcSide.tan2, 'Side Vert Bottom');
    this.addP('Yel_Mid', arcSide.midPoint, 'Side Corner Mid');

    const arcFront = this.generateArcData(
      e_front_R,
      vLeft,
      vFrontDown,
      frontCornerRadius
    );
    this.addP('L', arcFront.tan1, 'Front Vert Top');
    this.addP('J', arcFront.tan2, 'Front Vert Bottom');
    this.addP('Grn_Mid', arcFront.midPoint, 'Front Corner Mid');

    if (showTrueArcs) {
      const pushTrue = (pts, col) => {
        if (!pts || !pts.length) return;
        this.lineDefs.push({ points: pts, color: col, type: 'arc' });
        const mPts = pts.map((p) => new THREE.Vector3(-p.x, p.y, p.z));
        this.lineDefs.push({ points: mPts, color: col, type: 'arc' });
      };
      pushTrue(arcTop.arcPoints, this.C.ORANGE);
      pushTrue(arcSide.arcPoints, this.C.YELLOW);
      pushTrue(arcFront.arcPoints, this.C.GREEN);
    }

    const createSplitBezier = (arcData, nameBase, color) => {
      const vStart = arcData.tan1.clone().sub(arcData.center);
      const vMid = arcData.midPoint.clone().sub(arcData.center);
      const halfSweep = vStart.angleTo(vMid);
      const handleLen = arcData.radius * (4 / 3) * Math.tan(halfSweep / 4);

      const t1 = arcData.tan1Dir;
      const tMid = arcData.midTanDir;
      const t2 = arcData.tan2Dir;

      const cp1_1 = arcData.tan1
        .clone()
        .add(t1.clone().multiplyScalar(handleLen));
      const cp1_2 = arcData.midPoint
        .clone()
        .sub(tMid.clone().multiplyScalar(handleLen));

      this.createBezier(
        arcData.tan1,
        cp1_1,
        cp1_2,
        arcData.midPoint,
        `${nameBase}_1`,
        color,
        showBeziers
      );
      arcData.cp1_1 = cp1_1;
      arcData.cp1_2 = cp1_2;

      const cp2_1 = arcData.midPoint
        .clone()
        .add(tMid.clone().multiplyScalar(handleLen));
      const cp2_2 = arcData.tan2
        .clone()
        .sub(t2.clone().multiplyScalar(handleLen));

      this.createBezier(
        arcData.midPoint,
        cp2_1,
        cp2_2,
        arcData.tan2,
        `${nameBase}_2`,
        color,
        showBeziers
      );
      arcData.cp2_1 = cp2_1;
      arcData.cp2_2 = cp2_2;
    };

    createSplitBezier(arcTop, 'Bez_TopCorner', this.C.ORANGE);
    createSplitBezier(arcSide, 'Bez_SideCorner', this.C.YELLOW);
    createSplitBezier(arcFront, 'Bez_FrontCorner', this.C.GREEN);

    const addInterior = (arc, prefix, innerBulgeVal, outerBulgeVal) => {
      if (arc.radius <= 0.001) return;
      const halfSweep = arc.sweepAngle / 2;
      const handleLen = arc.radius * (4 / 3) * Math.tan(halfSweep / 4);
      const radialOut = arc.midPoint.clone().sub(arc.center).normalize();

      // --- BULGE IN (Controls 3 points: Int_R/L) ---
      const innerBulge = innerBulgeVal !== undefined ? innerBulgeVal : 0.26;
      const innerDist = handleLen * innerBulge * 2.5;

      const intR = arc.midPoint
        .clone()
        .add(radialOut.clone().multiplyScalar(innerDist));

      this.addP(
        `Int_${prefix}_R`,
        intR,
        `Interior Radial Control Point ${prefix} Right`
      );
      const intL = intR.clone();
      intL.x = -intL.x;
      this.addP(
        `Int_${prefix}_L`,
        intL,
        `Interior Radial Control Point ${prefix} Left`
      );

      // --- BULGE OUT (Controls 6 points: CentralOut/In) ---
      const tan = arc.midTanDir.clone().normalize();
      const outerBulge = outerBulgeVal !== undefined ? outerBulgeVal : 0.83;

      const outerDist = handleLen * outerBulge;

      const baseOuter = arc.midPoint
        .clone()
        .add(radialOut.clone().multiplyScalar(outerDist));

      // cOut
      const cOut = baseOuter.clone().add(tan.clone().multiplyScalar(handleLen));

      this.addP(
        `CentralOut_${prefix}_R`,
        cOut,
        `Central Outgoing Control Point ${prefix} Right`
      );
      const cOutL = cOut.clone();
      cOutL.x = -cOutL.x;
      this.addP(
        `CentralOut_${prefix}_L`,
        cOutL,
        `Central Outgoing Control Point ${prefix} Left`
      );

      // cIn
      const cIn = baseOuter.clone().sub(tan.clone().multiplyScalar(handleLen));

      this.addP(
        `CentralIn_${prefix}_R`,
        cIn,
        `Central Incoming Control Point ${prefix} Right`
      );
      const cInL = cIn.clone();
      cInL.x = -cInL.x;
      this.addP(
        `CentralIn_${prefix}_L`,
        cInL,
        `Central Incoming Control Point ${prefix} Left`
      );
    };

    // Call with specific bulge params
    addInterior(arcTop, 'TopCorner', topBulgeInner, topBulgeOuter);
    addInterior(arcSide, 'SideCorner', sideBulgeInner, sideBulgeOuter);
    addInterior(arcFront, 'FrontCorner', frontBulgeInner, frontBulgeOuter);

    const chamferWeight = 0.3 + (this.settings.chamferBulge || 0.35) * 0.6;

    const mk_Sharp = new THREE.Vector3(
      hw_top,
      height,
      (this.points.M.pos.z + this.points.K.pos.z) / 2
    );
    const mk_CP1 = this.points.M.pos.clone().lerp(mk_Sharp, chamferWeight);
    const mk_CP2 = this.points.K.pos.clone().lerp(mk_Sharp, chamferWeight);
    this.createBezier(
      this.points.M.pos,
      mk_CP1,
      mk_CP2,
      this.points.K.pos,
      'Bez_Edge_TopSide',
      this.C.PURPLE,
      showBeziers
    );

    const nl_Sharp = new THREE.Vector3(
      (this.points.N.pos.x + this.points.L.pos.x) / 2,
      height,
      z_front_top
    );
    const nl_CP1 = this.points.N.pos.clone().lerp(nl_Sharp, chamferWeight);
    const nl_CP2 = this.points.L.pos.clone().lerp(nl_Sharp, chamferWeight);
    this.createBezier(
      this.points.N.pos,
      nl_CP1,
      nl_CP2,
      this.points.L.pos,
      'Bez_Edge_FrontTop',
      this.C.BLUE,
      showBeziers
    );

    const y_JI = (this.points.J.pos.y + this.points.I.pos.y) / 2;
    const ji_Sharp = new THREE.Vector3(
      hw_base - (y_JI / height) * sideTaper,
      y_JI,
      z_front_base - (y_JI / height) * frontTaper
    );
    const ji_CP1 = this.points.J.pos.clone().lerp(ji_Sharp, chamferWeight);
    const ji_CP2 = this.points.I.pos.clone().lerp(ji_Sharp, chamferWeight);
    this.createBezier(
      this.points.J.pos,
      ji_CP1,
      ji_CP2,
      this.points.I.pos,
      'Bez_Edge_FrontSide',
      this.C.RED,
      showBeziers
    );

    const Inner_M = mk_CP1
      .clone()
      .add(arcTop.cp1_1.clone().sub(this.points.M.pos));
    const Inner_N = nl_CP1
      .clone()
      .add(arcTop.cp2_2.clone().sub(this.points.N.pos));

    const Inner_K = mk_CP2
      .clone()
      .add(arcSide.cp1_1.clone().sub(this.points.K.pos));
    const Inner_I = ji_CP2
      .clone()
      .add(arcSide.cp2_2.clone().sub(this.points.I.pos));

    const Inner_L = nl_CP2
      .clone()
      .add(arcFront.cp1_1.clone().sub(this.points.L.pos));
    const Inner_J = ji_CP1
      .clone()
      .add(arcFront.cp2_2.clone().sub(this.points.J.pos));

    this.addP('Inner_M', Inner_M, 'Inner Ref M');
    this.addP('Inner_N', Inner_N, 'Inner Ref N');
    this.addP('Inner_K', Inner_K, 'Inner Ref K');
    this.addP('Inner_I', Inner_I, 'Inner Ref I');
    this.addP('Inner_L', Inner_L, 'Inner Ref L');
    this.addP('Inner_J', Inner_J, 'Inner Ref J');

    const projectToBase = (p) =>
      new THREE.Vector3(
        p.x + p.y * (sideTaper / height),
        0,
        p.z + p.y * (frontTaper / height)
      );
    this.createBezier(
      projectToBase(this.points.J.pos),
      projectToBase(ji_CP1),
      projectToBase(ji_CP2),
      projectToBase(this.points.I.pos),
      'Bez_Base_Corner',
      this.C.RED,
      showBeziers
    );

    const projectToCenter = (p) => new THREE.Vector3(0, p.y, p.z);
    this.createBezier(
      projectToCenter(this.points.N.pos),
      projectToCenter(nl_CP1),
      projectToCenter(nl_CP2),
      projectToCenter(this.points.L.pos),
      'Bez_Center_Front',
      this.C.BLUE,
      showBeziers
    );

    const projectToBack = (p) => new THREE.Vector3(p.x, p.y, z_back);
    this.createBezier(
      projectToBack(this.points.M.pos),
      projectToBack(mk_CP1),
      projectToBack(mk_CP2),
      projectToBack(this.points.K.pos),
      'Bez_Back_Top',
      this.C.PURPLE,
      showBeziers
    );

    const triCentroid = new THREE.Vector3()
      .add(this.points.Or_Mid.pos)
      .add(this.points.Yel_Mid.pos)
      .add(this.points.Grn_Mid.pos)
      .divideScalar(3);

    const vAB = this.points.Grn_Mid.pos.clone().sub(this.points.Or_Mid.pos);
    const vAC = this.points.Yel_Mid.pos.clone().sub(this.points.Or_Mid.pos);
    let triNormal = new THREE.Vector3().crossVectors(vAB, vAC).normalize();
    if (triNormal.dot(triCentroid) < 0) triNormal.negate();

    const tBulge = triCenterBulge !== undefined ? triCenterBulge : 0.016;
    const triCenterPos = triCentroid
      .clone()
      .add(triNormal.multiplyScalar(tBulge));

    // Add manual shifts
    triCenterPos.x += triShiftX || 0;
    triCenterPos.y += triShiftY || 0;
    triCenterPos.z += triShiftZ || 0;

    this.addP('Tri_Center', triCenterPos, 'Triangle Center');

    this.addP('Bez_Edge_FrontTop_CP1', nl_CP1);
    this.addP('Bez_Edge_FrontTop_CP2', nl_CP2);
    this.addP('Bez_Edge_TopSide_CP1', mk_CP1);
    this.addP('Bez_Edge_TopSide_CP2', mk_CP2);
    this.addP('Bez_Edge_FrontSide_CP1', ji_CP1);
    this.addP('Bez_Edge_FrontSide_CP2', ji_CP2);
    this.addP('Bez_TopCorner_1_CP1', arcTop.cp1_1);
    this.addP('Bez_TopCorner_1_CP2', arcTop.cp1_2);
    this.addP('Bez_TopCorner_2_CP1', arcTop.cp2_1);
    this.addP('Bez_TopCorner_2_CP2', arcTop.cp2_2);
    this.addP('Bez_SideCorner_1_CP1', arcSide.cp1_1);
    this.addP('Bez_SideCorner_1_CP2', arcSide.cp1_2);
    this.addP('Bez_SideCorner_2_CP1', arcSide.cp2_1);
    this.addP('Bez_SideCorner_2_CP2', arcSide.cp2_2);
    this.addP('Bez_FrontCorner_1_CP1', arcFront.cp1_1);
    this.addP('Bez_FrontCorner_1_CP2', arcFront.cp1_2);
    this.addP('Bez_FrontCorner_2_CP1', arcFront.cp2_1);
    this.addP('Bez_FrontCorner_2_CP2', arcFront.cp2_2);
    this.addP('Bez_Back_Top_CP1', projectToBack(mk_CP1));

    const getPos = (k) =>
      this.points[k] ? this.points[k].pos : new THREE.Vector3();

    // 1. Boundary Lines for Caps (Top, Side, Front)
    const boundaries = [];

    // Top Cap: Back -> M -> N -> Front -> Center
    // Center-Back
    const pCenterBack = new THREE.Vector3(0, height, z_back);
    // Back-Corner (Projected M)
    const pBackCorner = getPos('M').clone();
    pBackCorner.z = z_back;
    // Front-Center (Projected N)
    const pCenterFront = new THREE.Vector3(0, height, getPos('N').z);

    boundaries.push({ points: [pCenterBack, pBackCorner], layer: 'CAP_TOP' });
    boundaries.push({ points: [pBackCorner, getPos('M')], layer: 'CAP_TOP' });
    // M->N is the Arc (arcTop), handled separately
    boundaries.push({ points: [getPos('N'), pCenterFront], layer: 'CAP_TOP' });
    boundaries.push({ points: [pCenterFront, pCenterBack], layer: 'CAP_TOP' });

    // Side Cap: BackBase -> BackTop -> K -> I -> BaseEnd -> BackBase
    const pBackTopOut = getPos('K').clone();
    pBackTopOut.z = z_back;
    const pBaseBack = new THREE.Vector3(
      pBackTopOut.x - sideTaper * (pBackTopOut.y / height),
      0,
      z_back
    );
    const pI = getPos('I');
    const pBaseEnd = new THREE.Vector3(
      pI.x + pI.y * (sideTaper / height),
      0,
      pI.z + pI.y * (frontTaper / height)
    );

    boundaries.push({ points: [pBaseBack, pBackTopOut], layer: 'CAP_SIDE' });
    boundaries.push({ points: [pBackTopOut, getPos('K')], layer: 'CAP_SIDE' });
    // K->I is Arc (arcSide)
    boundaries.push({ points: [getPos('I'), pBaseEnd], layer: 'CAP_SIDE' });
    boundaries.push({ points: [pBaseEnd, pBaseBack], layer: 'CAP_SIDE' });

    // Front Cap: CenterBase -> CenterTop -> L -> J -> BaseFront -> CenterBase
    const pL = getPos('L');
    const pCenterTop = new THREE.Vector3(0, pL.y, pL.z);
    const pCenterBase = new THREE.Vector3(0, 0, z_front_base);
    const pJ = getPos('J');
    const pBaseFront = new THREE.Vector3(
      pJ.x + pJ.y * (sideTaper / height),
      0,
      pJ.z + pJ.y * (frontTaper / height)
    );

    boundaries.push({ points: [pCenterBase, pCenterTop], layer: 'CAP_FRONT' });
    boundaries.push({ points: [pCenterTop, getPos('L')], layer: 'CAP_FRONT' });
    // L->J is Arc (arcFront)
    boundaries.push({ points: [getPos('J'), pBaseFront], layer: 'CAP_FRONT' });
    boundaries.push({ points: [pBaseFront, pCenterBase], layer: 'CAP_FRONT' });

    const surf_TopFront = [
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

    const surf_TopSide = [
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

    const surf_FrontSide = [
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

    return {
      lineDefs: this.lineDefs,
      points: this.points,
      curves: this.curves,
      boundaries: boundaries,
      arcs: {
        top: arcTop,
        side: arcSide,
        front: arcFront,
      },
      surfaces: {
        topFront: surf_TopFront,
        topSide: surf_TopSide,
        frontSide: surf_FrontSide,
      },
    };
  }

  generateArcData(cornerPt, vec1, vec2, radius) {
    const result = {
      arcPoints: [],
      tan1: cornerPt.clone(),
      tan2: cornerPt.clone(),
      center: new THREE.Vector3(),
      axis: new THREE.Vector3(),
      startVec: new THREE.Vector3(),
      sweepAngle: 0,
      radius: radius,
    };
    if (radius <= 0.001) return result;
    const angle = vec1.angleTo(vec2);
    if (angle < 0.001 || Math.abs(angle - Math.PI) < 0.001) return result;

    const distToTangent = radius / Math.tan(angle / 2);
    result.tan1 = cornerPt
      .clone()
      .add(vec1.clone().multiplyScalar(distToTangent));
    result.tan2 = cornerPt
      .clone()
      .add(vec2.clone().multiplyScalar(distToTangent));

    result.axis = new THREE.Vector3().crossVectors(vec1, vec2).normalize();
    const normalInPlane = new THREE.Vector3()
      .crossVectors(result.axis, vec1)
      .normalize();
    result.center = result.tan1
      .clone()
      .add(normalInPlane.clone().multiplyScalar(radius));
    result.startVec = result.tan1.clone().sub(result.center);
    result.sweepAngle = Math.PI - angle;

    for (let i = 0; i <= 24; i++) {
      const pt = result.center
        .clone()
        .add(
          result.startVec
            .clone()
            .applyAxisAngle(result.axis, -result.sweepAngle * (i / 24))
        );
      result.arcPoints.push(pt);
    }

    const midVec = result.startVec
      .clone()
      .applyAxisAngle(result.axis, -result.sweepAngle / 2);
    result.midPoint = result.center.clone().add(midVec);

    const chord = result.tan2.clone().sub(result.tan1);
    let t1 = new THREE.Vector3()
      .crossVectors(result.axis, result.startVec.clone().normalize())
      .normalize();
    if (t1.dot(chord) < 0) t1.negate();
    result.tan1Dir = t1;

    let tMid = new THREE.Vector3()
      .crossVectors(result.axis, midVec.clone().normalize())
      .normalize();
    if (tMid.dot(chord) < 0) tMid.negate();
    result.midTanDir = tMid;

    let t2 = new THREE.Vector3()
      .crossVectors(
        result.axis,
        result.startVec
          .clone()
          .applyAxisAngle(result.axis, -result.sweepAngle)
          .normalize()
      )
      .normalize();
    if (t2.dot(chord) < 0) t2.negate();
    result.tan2Dir = t2;

    return result;
  }

  createBezier(p0, p1, p2, p3, id, color, showBeziers) {
    this.curves.push({ id, p0, p1, p2, p3, color });
    // Note: Control points are stored implicitly in this.curves for the visualizer to pick up,
    // but we can also store them in points map if needed (handled in calculate)

    if (showBeziers) {
      const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
      const points = curve.getPoints(12);
      this.lineDefs.push({ points, color, type: 'bezier' });

      // Mirror for visual feedback if requested by legacy behavior
      const mP0 = new THREE.Vector3(-p0.x, p0.y, p0.z);
      const mP1 = new THREE.Vector3(-p1.x, p1.y, p1.z);
      const mP2 = new THREE.Vector3(-p2.x, p2.y, p2.z);
      const mP3 = new THREE.Vector3(-p3.x, p3.y, p3.z);
      const mCurve = new THREE.CubicBezierCurve3(mP0, mP1, mP2, mP3);
      this.lineDefs.push({
        points: mCurve.getPoints(12),
        color,
        type: 'bezier',
      });
    }
  }

  createWhiteKeyGeometry(dim, leftCutout = 0, rightCutout = 0) {
    const shape = new THREE.Shape();
    const w = dim.whiteKeyWidth !== undefined ? dim.whiteKeyWidth : 1.0;
    const hw = w / 2;
    const cornerR =
      dim.whiteCornerRadius !== undefined ? dim.whiteCornerRadius : 0.1;
    const gap = dim.keyGap !== undefined ? dim.keyGap : 0.05;
    const bevelR =
      dim.whiteBevelRadius !== undefined ? dim.whiteBevelRadius : 0.02;

    const blackBaseLength = dim.baseLength !== undefined ? dim.baseLength : 4.0;
    const z_back = -blackBaseLength / 2;
    const z_front =
      z_back +
      blackBaseLength +
      (dim.whiteKeyLengthExtension !== undefined
        ? dim.whiteKeyLengthExtension
        : 2.0);

    // The cutout extends slightly past the black key by the gap amount
    const z_cut = z_back + blackBaseLength + gap;

    // Compensate for ExtrudeGeometry's outward bevel expansion by insetting the 2D shape
    const e_back = z_back + bevelR;
    const e_front = z_front - bevelR;
    const e_left = -hw + bevelR;
    const e_right = hw - bevelR;
    const e_cut = z_cut + bevelR;

    const e_leftCut = leftCutout > 0 ? -hw + leftCutout + bevelR : e_left;
    const e_rightCut = rightCutout > 0 ? hw - rightCutout - bevelR : e_right;

    const effCornerR = Math.max(0, cornerR - bevelR);

    // Back Left
    if (leftCutout > 0) {
      shape.moveTo(e_leftCut, e_back);
      shape.lineTo(e_leftCut, e_cut);
      shape.lineTo(e_left, e_cut);
    } else {
      shape.moveTo(e_left, e_back);
    }

    // Front Left with optional corner radius
    if (effCornerR > 0) {
      shape.lineTo(e_left, e_front - effCornerR);
      shape.quadraticCurveTo(e_left, e_front, e_left + effCornerR, e_front);
    } else {
      shape.lineTo(e_left, e_front);
    }

    // Front Right with optional corner radius
    if (effCornerR > 0) {
      shape.lineTo(e_right - effCornerR, e_front);
      shape.quadraticCurveTo(e_right, e_front, e_right, e_front - effCornerR);
    } else {
      shape.lineTo(e_right, e_front);
    }

    // Back Right
    if (rightCutout > 0) {
      shape.lineTo(e_right, e_cut);
      shape.lineTo(e_rightCut, e_cut);
      shape.lineTo(e_rightCut, e_back);
    } else {
      shape.lineTo(e_right, e_back);
    }

    // Close the shape
    if (leftCutout > 0) {
      shape.lineTo(e_leftCut, e_back);
    } else {
      shape.lineTo(e_left, e_back);
    }

    const height = dim.whiteKeyHeight !== undefined ? dim.whiteKeyHeight : 0.5;

    // Depth is reduced by 2*bevelR to maintain exact total height after top and bottom bevels are added
    const extGeo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, height - bevelR * 2),
      bevelEnabled: bevelR > 0,
      bevelSize: bevelR,
      bevelThickness: bevelR,
      bevelSegments: 3,
    });

    // Rotate to lie flat and shift down so top is exactly flush at Y=0
    extGeo.rotateX(Math.PI / 2);
    extGeo.translate(0, -bevelR, 0);

    return extGeo;
  }

}

