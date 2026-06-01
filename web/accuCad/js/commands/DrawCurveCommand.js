
class DrawCurveCommand {
  
  constructor(baseController) {
    this.initBase(baseController);
    this.controlPoints = [];
    this.previewLine = null;
    this.curvePreview = null;
    this.controlSpheres = [];
  }

  onMouseDown(data) {
    const { point, event } = data;
    if (event && event.button !== 0) return;
    if (!point) return;

    if (this.base.floatingOrigin) {
      this.base.setOrigin(point);
    }

    this.controlPoints.push(point.slice());

    const sphereGeometry = new THREE.SphereGeometry(0.025, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(...point);
    this.base.view.scene.add(sphere);
    this.controlSpheres.push(sphere);

    this.updatePreview();

    if (this.controlPoints.length === 4) {
      this.finalizeCurve();
      this.reset();
    }
  }

  onMouseMove(data) {
    const { point } = data;
    if (point && this.controlPoints.length > 0) {
      this.updatePreview(point);
    }
  }

  onRightClick() {
    this.reset();
  }

  updatePreview(mousePoint) {
    const points = this.controlPoints.slice();
    if (mousePoint) {
      points.push(mousePoint.slice());
    }

    if (this.previewLine) {
      this.base.view.scene.remove(this.previewLine);
      this.disposeObject(this.previewLine);
      this.previewLine = null;
    }

    if (points.length < 2) return;

    const flatPoints = points.flat();
    const geometry = new LineGeometry();
    geometry.setPositions(flatPoints);
    const material = new LineMaterial({
      color: 0x888888,
      linewidth: 1,
      transparent: true,
      opacity: 0.7,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    this.previewLine = new Line2(geometry, material);
    this.base.view.scene.add(this.previewLine);

    if (this.curvePreview) {
      this.base.view.scene.remove(this.curvePreview);
      this.disposeObject(this.curvePreview);
      this.curvePreview = null;
    }

    if (this.controlPoints.length === 3 && mousePoint) {
      const [cp0, cp1, cp2] = this.controlPoints.map(
        (p) => new THREE.Vector3(...p)
      );
      const cp3 = new THREE.Vector3(...mousePoint);
      const curve = new THREE.CubicBezierCurve3(cp0, cp1, cp2, cp3);
      const curvePoints = curve.getPoints(50);
      const curvePositions = curvePoints.flatMap((p) => [p.x, p.y, p.z]);

      const geom = new LineGeometry();
      geom.setPositions(curvePositions);
      const mat = new LineMaterial({
        color: this.base.currentColor
          ? parseInt(this.base.currentColor.replace('#', ''), 16)
          : 0xff0000,
        linewidth: this.base.lineWidth || 4,
        transparent: true,
        opacity: 0.7,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      });
      this.curvePreview = new Line2(geom, mat);
      this.base.view.scene.add(this.curvePreview);
    }
  }

  finalizeCurve() {
    const [cp0, cp1, cp2, cp3] = this.controlPoints.map(
      (p) => new THREE.Vector3(...p)
    );
    const curve = new THREE.CubicBezierCurve3(cp0, cp1, cp2, cp3);
    const curvePoints = curve.getPoints(50);
    const positions = curvePoints.flatMap((p) => [p.x, p.y, p.z]);

    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    const material = new LineMaterial({
      color: this.base.currentColor
        ? parseInt(this.base.currentColor.replace('#', ''), 16)
        : 0xff0000,
      linewidth: this.base.lineWidth || 4,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const curveLine = new Line2(geometry, material);

    const curveElement = new CurveElement(this.controlPoints);
    curveElement.threejsObject = curveLine;
    curveElement.points = this.controlPoints.map((pt) => pt.slice());

    this.base.cadElements.push(curveElement);
    this.base.view.scene.add(curveLine);
  }

  reset() {
    this.resetBase();
    if (this.previewLine) {
      this.base.view.scene.remove(this.previewLine);
      this.disposeObject(this.previewLine);
      this.previewLine = null;
    }
    this.controlSpheres.forEach((sphere) => {
      this.base.view.scene.remove(sphere);
      this.disposeObject(sphere);
    });
    this.controlSpheres = [];
    if (this.curvePreview) {
      this.base.view.scene.remove(this.curvePreview);
      this.disposeObject(this.curvePreview);
      this.curvePreview = null;
    }
    this.controlPoints = [];
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