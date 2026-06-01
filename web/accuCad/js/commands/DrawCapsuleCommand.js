
class DrawCapsuleCommand {
  
  constructor(baseController) {
    this.initBase(baseController);
    this.currentPoints = [];
  }

  onMouseDown(data) {
    const { point } = data;
    if (!point) return;

    if (this.base.floatingOrigin) {
      this.base.setOrigin(point);
    }

    if (this.currentPoints.length === 0) {
      this.currentPoints.push(point);
      this.tempElement = new CapsuleElement(point, point);
      this.tempElement.isTemporary = true;
      this.tempElement.color = this.base.currentColor || '#ff0000';
      this.tempElement.radius = this.base.commandControlValue || 0.3;
      this.base.cadElements.push(this.tempElement);
    } else if (this.currentPoints.length === 1) {
      this.currentPoints.push(point);
      this.tempElement.end = point.slice();
      this.tempElement.points[1] = point.slice();
      this.tempElement.updateDimensions();
      this.finalizeCapsule();
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
    this.tempElement.points[1] = endPoint.slice();
    if (this.tempElement.isTemporary) {
      this.tempElement.radius = this.base.commandControlValue || 0.3;
      this.tempElement.color = this.base.currentColor || '#ff0000';
    }
    this.tempElement.updateDimensions();

    if (this.previewShape) {
      this.base.view.scene.remove(this.previewShape);
      this.disposeObject(this.previewShape);
      this.previewShape = null;
    }

    this.previewShape = this.renderVisual(this.tempElement, true);
    this.base.view.scene.add(this.previewShape);
  }

  finalizeCapsule() {
    if (!this.tempElement) return;

    this.tempElement.updateDimensions();
    this.tempElement.isTemporary = false;

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

  renderVisual(element, isPreview) {
    const geoData = DrawCapsuleCommand.computeGeometry(element);
    if (!geoData || !geoData.geometry) return null;

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

    const outline = DrawCapsuleCommand.createCapsuleOutline(
      geoData.cylinderHeight,
      geoData.radius,
      16,
      element.color
    );
    mesh.add(outline);

    const group = new THREE.Group();
    group.add(mesh);
    return group;
  }

  static computeGeometry(element) {
    const radius = element.radius;
    const start = element.start,
      end = element.end;
    const vStart = new THREE.Vector3().fromArray(start);
    const vEnd = new THREE.Vector3().fromArray(end);

    const axis = new THREE.Vector3().subVectors(vEnd, vStart);
    const cylinderHeight = axis.length();

    let geometry;
    if (THREE.CapsuleGeometry) {
      geometry = new THREE.CapsuleGeometry(radius, cylinderHeight, 16, 32);
    } else {
      const geometries = [];
      if (cylinderHeight > 0.001) {
        geometries.push(
          new THREE.CylinderGeometry(
            radius,
            radius,
            cylinderHeight,
            32,
            1,
            false
          )
        );
      }
      const sphereGeom = new THREE.SphereGeometry(radius, 32, 16);
      const topHemi = sphereGeom.clone().translate(0, cylinderHeight / 2, 0);
      const bottomHemi = sphereGeom
        .clone()
        .translate(0, -cylinderHeight / 2, 0);
      geometries.push(topHemi, bottomHemi);
      geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
    }

    const midpoint = new THREE.Vector3()
      .addVectors(vStart, vEnd)
      .multiplyScalar(0.5);
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      up,
      axis.clone().normalize()
    );
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      geometry: geometry,
      position: midpoint,
      rotation: rotation,
      cylinderHeight: cylinderHeight,
      radius: radius,
    };
  }

  static createCapsuleOutline(
    cylinderHeight,
    radius,
    arcSegments,
    outlineColor
  ) {
    const outlineGroup = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
      color: outlineColor,
      linewidth: 2,
    });

    const createLine = (points) =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        material
      );

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      outlineGroup.add(
        createLine([
          new THREE.Vector3(x, -cylinderHeight / 2, z),
          new THREE.Vector3(x, cylinderHeight / 2, z),
        ])
      );
    }

    if (cylinderHeight > 0) {
      const createCircle = (yPos) => {
        const circle = new THREE.LineLoop(
          new THREE.RingGeometry(radius, radius, 64),
          material
        );
        circle.position.y = yPos;
        circle.rotation.x = -Math.PI / 2;
        return circle;
      };
      outlineGroup.add(createCircle(cylinderHeight / 2));
      outlineGroup.add(createCircle(-cylinderHeight / 2));
    }

    return outlineGroup;
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