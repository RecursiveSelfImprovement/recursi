class DrawRectangleCommand {
  constructor(baseController) {
    this.initBase(baseController);
    this.currentPoints = [];
  }

  onMouseDown(data) {
    const {point} = data;
    if (!point) return;

    if (this.base.floatingOrigin) {
      this.base.setOrigin(point);
    }

    if (this.currentPoints.length === 0) {
      this.currentPoints.push(point);
      this.tempElement = new RectangleElement(point, point);
      this.tempElement.isTemporary = true;
      this.tempElement.color = this.base.currentColor || '#ff0000';
      if (!this.tempElement.renderOptions) {
        this.tempElement.renderOptions = {
          fillOpacity: 0.6,
          lineThickness: this.base.lineWidth || 4,
          darkenBorder: 0.3,
          borderColor: null,
          fillColor: this.tempElement.color,
        };
      }
      this.base.cadElements.push(this.tempElement);
    } else if (this.currentPoints.length === 1) {
      this.currentPoints.push(point);
      this.tempElement.end = point.slice();
      this.tempElement.updateDimensions();
      this.tempElement.isFlat = this.isFlatElement(this.tempElement);
      this.finalizeRectangle();
      this.reset();
    }
  }

  onMouseMove(data) {
    const {point} = data;
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
    this.tempElement.isFlat = this.isFlatElement(this.tempElement);
    this.tempElement.color = this.base.currentColor || '#ff0000';
    if (this.tempElement.renderOptions) {
      this.tempElement.renderOptions.fillColor = this.tempElement.color;
    }

    if (this.previewShape) {
      this.base.view.scene.remove(this.previewShape);
      this.disposeShape(this.previewShape);
      this.previewShape = null;
    }

    this.previewShape = this.renderVisual(this.tempElement, true);
    this.base.view.scene.add(this.previewShape);
  }

  finalizeRectangle() {
    if (!this.tempElement) return;

    this.tempElement.updateDimensions();
    this.tempElement.isFlat = this.isFlatElement(this.tempElement);
    this.tempElement.isTemporary = false;
    this.tempElement.color = this.base.currentColor || '#ff0000';
    if (this.tempElement.renderOptions) {
      this.tempElement.renderOptions.fillColor = this.tempElement.color;
    }

    if (this.previewShape) {
      this.base.view.scene.remove(this.previewShape);
      this.disposeShape(this.previewShape);
      this.previewShape = null;
    }

    var finalShape = this.renderVisual(this.tempElement, false);
    this.tempElement.threejsObject = finalShape;
    this.base.view.scene.add(finalShape);
  }

  reset() {
      this.currentPoints = [];

      // Clean up and dispose of preview mesh upon reset/right-click
      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        this.disposeShape(this.previewShape);
        this.previewShape = null;
      }

      if (this.tempElement && this.tempElement.isTemporary) {
        var idx = this.base.cadElements.indexOf(this.tempElement);
        if (idx !== -1) {
          this.base.cadElements.splice(idx, 1);
        }
      }
      this.tempElement = null;
    }

  isFlatElement(element) {
    var epsilon = 0.0001;
    var size = element.size || [0, 0, 0];
    return size[0] < epsilon || size[1] < epsilon || size[2] < epsilon;
  }

  disposeShape(shape) {
    shape.traverse(function (child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  renderVisual(element, isPreview) {
    return this.fallbackCreateRectangle(element, isPreview);
  }

  static computeGeometry(element) {
    var epsilon = 0.0001;
    var min, max;
    if (element.min && element.max) {
      min = new THREE.Vector3().fromArray(element.min);
      max = new THREE.Vector3().fromArray(element.max);
    } else {
      var start = element.start,
        end = element.end;
      min = new THREE.Vector3()
        .fromArray(start)
        .min(new THREE.Vector3().fromArray(end));
      max = new THREE.Vector3()
        .fromArray(start)
        .max(new THREE.Vector3().fromArray(end));
      element.min = [min.x, min.y, min.z];
      element.max = [max.x, max.y, max.z];
    }

    var sizeVec = new THREE.Vector3().subVectors(max, min);
    if (!element.size) {
      element.size = [sizeVec.x, sizeVec.y, sizeVec.z];
    }

    var geometry,
      rotation = new THREE.Euler(0, 0, 0);

    if (sizeVec.x < epsilon || sizeVec.y < epsilon || sizeVec.z < epsilon) {
      if (sizeVec.x < epsilon) {
        geometry = new THREE.PlaneGeometry(sizeVec.z, sizeVec.y);
        rotation.set(0, Math.PI / 2, 0);
      } else if (sizeVec.y < epsilon) {
        geometry = new THREE.PlaneGeometry(sizeVec.x, sizeVec.z);
        rotation.set(-Math.PI / 2, 0, 0);
      } else {
        geometry = new THREE.PlaneGeometry(sizeVec.x, sizeVec.y);
      }
    } else {
      geometry = new THREE.BoxGeometry(sizeVec.x, sizeVec.y, sizeVec.z);
    }

    var position = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    return {
      geometry: geometry,
      position: position,
      rotation: rotation,
      isFlat: sizeVec.x < epsilon || sizeVec.y < epsilon || sizeVec.z < epsilon,
    };
  }

  fallbackCreateRectangle(element, isPreview) {
    var geoData = DrawRectangleCommand.computeGeometry(element);

    var material = new THREE.MeshPhongMaterial({
      color: element.color,
      emissive: element.color,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isPreview ? 0.3 : 0.6,
    });

    var mesh = new THREE.Mesh(geoData.geometry, material);
    mesh.position.copy(geoData.position);
    mesh.rotation.copy(geoData.rotation);

    var edges = new THREE.EdgesGeometry(geoData.geometry);
    var lineMaterial = new THREE.LineBasicMaterial({color: element.color});
    var outline = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(outline);

    var group = new THREE.Group();
    group.add(mesh);

    group.raycast = function (raycaster, intersects) {
      group.updateMatrixWorld(true);
      group.children.forEach(function (child) {
        if (typeof child.raycast === 'function') {
          child.raycast(raycaster, intersects);
        }
      });
    };

    return group;
  }

  initBase(baseController) {
    this.base = baseController;
    this.tempElement = null;
    this.previewShape = null;
    this.allowSelfSnap = false;
  }

  onPoint(data) {
      if (!data) return;
      if (data.mode === 'click') {
        if (this.onMouseDown) this.onMouseDown(data);
      } else if (data.mode === 'hover') {
        if (this.onMouseMove) this.onMouseMove(data);
      }
    }

}