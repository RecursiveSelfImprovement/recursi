
class LayoutManager {
  constructor({ app, layoutConfig }) {
    this.app = app;
    this.config = layoutConfig;
    this.isVerticalMode = false;
  }

  updateLayoutMode(isVertical, pivotA, pivotB) {
    if (this.isVerticalMode === isVertical) return; // No change
    this.isVerticalMode = isVertical;

    if (isVertical) {
      this.app.camera.fov = this.config.verticalFov;
    } else {
      this.app.camera.fov = this.config.horizontalFov;
    }
    this.app.camera.updateProjectionMatrix();

    if (pivotA && pivotB) {
      this.positionModels(pivotA, pivotB);
      this.centerCamera(pivotA, pivotB);
    }
  }

  positionModels(pivotA, pivotB) {
    const groupA = pivotA.children[0];
    const groupB = pivotB.children[0];
    if (!groupA || !groupB) return;

    const circA = this._computeCircleXZ(groupA);
    const circB = this._computeCircleXZ(groupB);

    this._recenterGroupToCircle(groupA, circA);
    this._recenterGroupToCircle(groupB, circB);

    if (this.isVerticalMode) {
      this._positionModelsForVertical(pivotA, pivotB);
    } else {
      this._positionModelsForHorizontal(
        pivotA,
        pivotB,
        circA.radius,
        circB.radius
      );
    }
  }

  centerCamera(pivotA, pivotB) {
    if (this.isVerticalMode) {
      this._centerCameraForVertical(pivotA, pivotB);
    } else {
      this._centerCameraForHorizontal(pivotA, pivotB);
    }
  }

  _positionModelsForVertical(pivotA, pivotB) {
    const sep = this.config.verticalSeparation;
    const yOffset = this.config.verticalModelYOffset;
    pivotA.position.set(0, sep / 2 + yOffset, 0);
    pivotB.position.set(0, -sep / 2 + yOffset, 0);
  }

  _positionModelsForHorizontal(pivotA, pivotB, rA, rB) {
    const sep = rA + rB + this.config.horizontalSeparation;
    pivotA.position.set(-sep / 2, 0, 0);
    pivotB.position.set(sep / 2, 0, 0);
  }

  _centerCameraForVertical(pivotA, pivotB) {
    if (!pivotA || !pivotB) return;
    const cam = this.app.camera;
    const controls = this.app.controls;
    const combinedBox = new THREE.Box3();
    combinedBox.expandByObject(pivotA);
    combinedBox.expandByObject(pivotB);
    const totalHeight = combinedBox.max.y - combinedBox.min.y;
    const boxCenterY = (combinedBox.max.y + combinedBox.min.y) / 2;
    const target = new THREE.Vector3(0, boxCenterY, 0);
    const cameraY =
      target.y + totalHeight * this.config.verticalCameraYOffsetFactor;
    const fovInRad = THREE.MathUtils.degToRad(cam.fov);
    const distance = totalHeight / (2 * Math.tan(fovInRad / 2));
    const safeZ = distance * this.config.verticalCameraDistanceFactor;
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
    cam.position.set(0, cameraY, safeZ);
    cam.lookAt(target);
  }

  _centerCameraForHorizontal(pivotA, pivotB) {
    if (!pivotA || !pivotB) return;
    const target = new THREE.Vector3(0, 20, 0);
    const cam = this.app.camera;
    const controls = this.app.controls;
    const distX = Math.abs(pivotB.position.x - pivotA.position.x);
    let safeZ = 240 + distX * 0.15;
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
    cam.position.set(target.x, 280, safeZ);
    cam.lookAt(target);
  }

  _computeCircleXZ(group) {
    const pts = [];
    const tmp = new THREE.Vector3();
    const box = new THREE.Box3();
    group.updateMatrixWorld(true);
    group.traverse((obj) => {
      if (!obj.isMesh) return;
      box.setFromObject(obj);
      const corners = [
        new THREE.Vector3(box.min.x, 0, box.min.z),
        new THREE.Vector3(box.min.x, 0, box.max.z),
        new THREE.Vector3(box.max.x, 0, box.min.z),
        new THREE.Vector3(box.max.x, 0, box.max.z),
      ];
      for (const c of corners) {
        tmp.copy(c);
        group.worldToLocal(tmp);
        pts.push({ x: tmp.x, y: tmp.z });
      }
    });
    const circ = this._minEnclosingCircle(pts);
    return { center: new THREE.Vector2(circ.x, circ.y), radius: circ.r };
  }

  _recenterGroupToCircle(group, circ) {
    const cx = circ.center.x;
    const cz = circ.center.y;
    group.children.forEach((ch) => {
      ch.position.x -= cx;
      ch.position.z -= cz;
    });
  }

  _minEnclosingCircle(points) {
    const pts = points.slice();
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    let c = null;
    const isIn = (p, c) =>
      (p.x - c.x) ** 2 + (p.y - c.y) ** 2 <= c.r * c.r + 1e-6;
    const circle2 = (p1, p2) => ({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      r: Math.hypot(p1.x - p2.x, p1.y - p2.y) / 2,
    });
    const circle3 = (p1, p2, p3) => {
      const A = p2.x - p1.x,
        B = p2.y - p1.y;
      const C = p3.x - p1.x,
        D = p3.y - p1.y;
      const E = A * (p1.x + p2.x) + B * (p1.y + p2.y);
      const F = C * (p1.x + p3.x) + D * (p1.y + p3.y);
      const G = 2 * (A * (p3.y - p2.y) - B * (p3.x - p2.x));
      if (Math.abs(G) < 1e-12) {
        const c12 = circle2(p1, p2),
          c13 = circle2(p1, p3),
          c23 = circle2(p2, p3);
        return c12.r > c13.r
          ? c12.r > c23.r
            ? c12
            : c23
          : c13.r > c23.r
          ? c13
          : c23;
      }
      const cx = (D * E - B * F) / G;
      const cy = (A * F - C * E) / G;
      return { x: cx, y: cy, r: Math.hypot(p1.x - cx, p1.y - cy) };
    };
    c = { x: 0, y: 0, r: -1 };
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (c.r >= 0 && isIn(p, c)) continue;
      c = { x: p.x, y: p.y, r: 0 };
      for (let j = 0; j < i; j++) {
        const q = pts[j];
        if (isIn(q, c)) continue;
        c = circle2(p, q);
        for (let k = 0; k < j; k++) {
          const rPt = pts[k];
          if (isIn(rPt, c)) continue;
          c = circle3(p, q, rPt);
        }
      }
    }
    return c;
  }

}

