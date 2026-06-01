
class DrawBlackKeyCommand {
  
  constructor(baseController) {
    this.initBase(baseController);
    this.currentPoints = [];
  }

  onPoint(data) {
    if (!data) return;
    if (data.mode === 'click') {
      if (this.onMouseDown) this.onMouseDown(data);
    } else if (data.mode === 'hover') {
      if (this.onMouseMove) this.onMouseMove(data);
    }
  }

  onMouseDown(data) {
    const { point } = data;
    if (!point) return;

    if (this.base.floatingOrigin) {
      this.base.setOrigin(point);
    }

    if (this.currentPoints.length === 0) {
      this.currentPoints.push(point);
      this.tempElement = new RectangleElement(point, point);
      this.tempElement.isTemporary = true;
      this.tempElement.color = this.base.currentColor || '#ff0000';
      this.tempElement.isBlackKey = true;
      this.base.cadElements.push(this.tempElement);
    } else if (this.currentPoints.length === 1) {
      this.currentPoints.push(point);
      this.tempElement.end = point.slice();
      this.tempElement.updateDimensions();
      this.finalizeBlackKey();
      this.reset();
    }
  }

  onMouseMove(data) {
    const { point } = data;
    if (!point) return;

    if (this.currentPoints.length === 1 && this.tempElement) {
      this.updatePreview(point);
    }
  }

  onRightClick() {
    this.reset();
  }

  updatePreview(endPoint) {
    this.tempElement.end = endPoint.slice();
    this.tempElement.updateDimensions();
    this.tempElement.color = this.base.currentColor || '#ff0000';

    if (this.previewShape) {
      this.base.view.scene.remove(this.previewShape);
      this.disposeObject(this.previewShape);
      this.previewShape = null;
    }

    this.previewShape = this.renderVisual(this.tempElement, true);
    this.base.view.scene.add(this.previewShape);
  }

  finalizeBlackKey() {
    if (!this.tempElement) return;

    this.tempElement.updateDimensions();
    this.tempElement.isTemporary = false;
    this.tempElement.color = this.base.currentColor || '#ff0000';

    if (this.previewShape) {
      this.base.view.scene.remove(this.previewShape);
      this.disposeObject(this.previewShape);
      this.previewShape = null;
    }

    const finalShape = this.renderVisual(this.tempElement, false);
    this.tempElement.threejsObject = finalShape;
    this.base.view.scene.add(finalShape);
  }

  reset() {
    this.resetBase();
    this.currentPoints = [];
    if (this.tempElement && this.tempElement.isTemporary) {
      const idx = this.base.cadElements.indexOf(this.tempElement);
      if (idx !== -1) this.base.cadElements.splice(idx, 1);
    }
    this.tempElement = null;
  }

  isFlatElement(element) {
    const epsilon = 0.0001;
    const size = element.size || [0, 0, 0];
    return size[0] < epsilon || size[1] < epsilon || size[2] < epsilon;
  }

  renderVisual(element, isPreview) {
    if (this.isFlatElement(element)) {
      return this.fallbackCreateRectangle(element, isPreview);
    } else {
      return this.createBlackKey(element, isPreview);
    }
  }

  createBlackKey(element, isPreview) {
    const min = new THREE.Vector3().fromArray(element.min);
    const max = new THREE.Vector3().fromArray(element.max);

    const width = max.x - min.x;
    const insetLeft = width * 0.18;
    const insetRight = width * 0.18;
    const insetFront = width * 0.36;

    const geometry = new THREE.BufferGeometry();

    const vertices = [
      min.x,
      min.y,
      max.z,
      max.x,
      min.y,
      max.z,
      max.x,
      min.y,
      min.z,
      min.x,
      min.y,
      min.z,
      min.x + insetLeft,
      max.y,
      max.z - insetFront,
      max.x - insetRight,
      max.y,
      max.z - insetFront,
      max.x - insetRight,
      max.y,
      min.z,
      min.x + insetLeft,
      max.y,
      min.z,
    ];

    const indices = [
      0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 6, 2,
      6, 3, 3, 6, 7, 3, 7, 0, 0, 7, 4,
    ];

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: element.color,
      emissive: element.color,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isPreview ? 0.3 : 0.6,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: element.color });
    const outline = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(outline);

    const group = new THREE.Group();
    group.add(mesh);
    return group;
  }

  fallbackCreateRectangle(element, isPreview) {
    const geoData = DrawRectangleCommand.computeGeometry(element);

    const material = new THREE.MeshPhongMaterial({
      color: element.color,
      emissive: element.color,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isPreview ? 0.3 : 0.6,
    });

    const mesh = new THREE.Mesh(geoData.geometry, material);
    mesh.position.copy(geoData.position);
    mesh.rotation.copy(geoData.rotation);

    const edges = new THREE.EdgesGeometry(geoData.geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: element.color });
    const outline = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(outline);

    const group = new THREE.Group();
    group.add(mesh);
    return group;
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