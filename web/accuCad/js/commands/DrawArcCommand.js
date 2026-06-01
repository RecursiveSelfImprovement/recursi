
class DrawArcCommand {

  constructor(baseController) {
    this.initBase(baseController);
    this.points = []; // Will store [start, center, end]
  }

  onMouseDown(data) {
    const {point} = data;
    if (!point) return;

    if (this.base.floatingOrigin) {
      this.base.setOrigin(point);
    }

    this.points.push(point.slice());

    if (this.points.length === 3) {
      this.finalizeArc();
      this.reset();
    }
  }

  onMouseMove(data) {
    const {point} = data;
    if (!point) return;

    if (this.points.length === 1) {
      // After start point is set, preview line to center
      this.updatePreviewLine(this.points[0], point);
    } else if (this.points.length === 2) {
      // After center is set, preview the arc
      this.updatePreviewArc(this.points[0], this.points[1], point);
    }
  }

  reset() {
    this.resetBase();
    this.points = [];
  }

  updatePreviewLine(start, end) {
    if (this.previewShape) this.base.view.scene.remove(this.previewShape);
    const geometry = new LineGeometry();
    geometry.setPositions([...start, ...end]);
    const material = new LineMaterial({
      color: this.base.currentColor
        ? parseInt(this.base.currentColor.replace('#', ''), 16)
        : 0xff0000,
      linewidth: this.base.lineWidth || 4,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    this.previewShape = new Line2(geometry, material);
    this.base.view.scene.add(this.previewShape);
  }

  updatePreviewArc(edge1, center, currentEdge) {
    if (this.previewShape) this.base.view.scene.remove(this.previewShape);

    // Using your original computeArcData logic
    const arcData = this.computeArcData(edge1, center, currentEdge);
    if (!arcData) return;

    const arcCurve = new THREE.ArcCurve(
      0,
      0,
      arcData.radius,
      arcData.startAngle,
      arcData.endAngle,
      arcData.clockwise
    );
    const points2D = arcCurve.getPoints(50);
    const points3D = points2D.map((pt) => {
      const vec = new THREE.Vector3().addVectors(
        arcData.u.clone().multiplyScalar(pt.x),
        arcData.v.clone().multiplyScalar(pt.y)
      );
      vec.add(new THREE.Vector3(...center));
      return vec;
    });

    const positions = points3D.flatMap((v) => [v.x, v.y, v.z]);
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    const material = new LineMaterial({
      color: this.base.currentColor
        ? parseInt(this.base.currentColor.replace('#', ''), 16)
        : 0xff0000,
      linewidth: this.base.lineWidth || 4,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    this.previewShape = new Line2(geometry, material);
    this.base.view.scene.add(this.previewShape);
  }

  finalizeArc() {
    const [edge1, center, edge2] = this.points;

    const pCenter = new THREE.Vector3(...center);
    const pEdge1 = new THREE.Vector3(...edge1);
    const pEdge2 = new THREE.Vector3(...edge2);

    // This is your key logic: radius is set by the 3rd click (end point).
    const radius = pCenter.distanceTo(pEdge2);
    if (radius < 1e-6) return;

    // And the first click is projected onto that radius to get the true start.
    const projectedStart = pCenter
      .clone()
      .add(pEdge1.clone().sub(pCenter).normalize().multiplyScalar(radius));
    const projectedEnd = pCenter
      .clone()
      .add(pEdge2.clone().sub(pCenter).normalize().multiplyScalar(radius));

    const arcData = this.computeArcData(
      projectedStart.toArray(),
      center,
      edge2
    );
    if (!arcData) return;

    const arcCurve = new THREE.ArcCurve(
      0,
      0,
      arcData.radius,
      arcData.startAngle,
      arcData.endAngle,
      arcData.clockwise
    );
    const points2D = arcCurve.getPoints(50);
    const points3D = points2D.map((pt) => {
      const vec = new THREE.Vector3().addVectors(
        arcData.u.clone().multiplyScalar(pt.x),
        arcData.v.clone().multiplyScalar(pt.y)
      );
      vec.add(pCenter);
      return vec;
    });

    const positions = points3D.flatMap((v) => [v.x, v.y, v.z]);
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    const material = new LineMaterial({
      color: this.base.currentColor
        ? parseInt(this.base.currentColor.replace('#', ''), 16)
        : 0xff0000,
      linewidth: this.base.lineWidth || 4,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const line = new Line2(geometry, material);

    const arcElement = new ArcElement(
      projectedStart.toArray(),
      center,
      projectedEnd.toArray()
    );
    arcElement.threejsObject = line;

    this.base.cadElements.push(arcElement);
    this.base.view.scene.add(line);
  }

  computeArcData(edge1, center, edge2) {
    const p1 = new THREE.Vector3(...edge1);
    const pCenter = new THREE.Vector3(...center);
    const p2 = new THREE.Vector3(...edge2);

    const v1 = p1.clone().sub(pCenter);
    const v2 = p2.clone().sub(pCenter);

    // Per your old code: radius is determined by the end point.
    const radius = v2.length();
    if (radius < 1e-6) return null;
    if (v1.length() < 1e-6) return null;

    // 'u' is the direction of the start point, which defines the zero-angle.
    const u = v1.clone().normalize();

    const planeNormal = v1.clone().cross(v2);
    if (planeNormal.length() < 1e-6) return null; // Collinear
    planeNormal.normalize();

    // 'v' is perpendicular to 'u' in the plane.
    const v = new THREE.Vector3().crossVectors(planeNormal, u).normalize();

    const localX = v2.dot(u);
    const localY = v2.dot(v);

    const startAngle = 0;
    const endAngle = Math.atan2(localY, localX);

    return {
      radius: radius,
      startAngle: startAngle,
      endAngle: endAngle,
      clockwise: localY < 0,
      u: u,
      v: v,
    };
  }

  onPoint(data) {
    if (!data) return;
    if (data.mode === 'click') {
      if (this.onMouseDown) this.onMouseDown(data);
    } else if (data.mode === 'hover') {
      if (this.onMouseMove) this.onMouseMove(data);
    }
  }

  disposeObject(object) {
    if (!object) return;
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose());
        else child.material.dispose();
      }
    });
  }

  resetBase() {
    if (this.previewShape) {
      this.base.view.scene.remove(this.previewShape);
      this.disposeObject(this.previewShape);
      this.previewShape = null;
    }
    this.tempElement = null;
  }

  dispose() {
    if (this.reset) this.reset();
  }

  initBase(baseController) {
    this.base = baseController;
    this.tempElement = null;
    this.previewShape = null;
    this.allowSelfSnap = false;
  }

}