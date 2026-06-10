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
        this.tempElement = new RectangleElement(point, point, this.base.rotationMatrix);
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
        // Dynamically update the final block matrix on click
        this.tempElement.rotationMatrix = this.base.rotationMatrix.map(row => [...row]);
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
        // Dynamically update the rotation matrix to follow the live AccuDraw plane during dynamics
        this.tempElement.rotationMatrix = this.base.rotationMatrix.map(row => [...row]);
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
      
      if (!element.rotationMatrix) {
        element.rotationMatrix = [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1]
        ];
      }

      if (!element.size || !element.center) {
        element.updateDimensions();
      }

      var size = element.size;
      var geometry;

      if (size[0] < epsilon || size[1] < epsilon || size[2] < epsilon) {
        if (size[0] < epsilon) {
          geometry = new THREE.PlaneGeometry(size[2], size[1]);
          geometry.rotateY(Math.PI / 2);
        } else if (size[1] < epsilon) {
          geometry = new THREE.PlaneGeometry(size[0], size[2]);
          geometry.rotateX(-Math.PI / 2);
        } else {
          geometry = new THREE.PlaneGeometry(size[0], size[1]);
        }
      } else {
        geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
      }

      const xAxis = new THREE.Vector3(...element.rotationMatrix[0]);
      const yAxis = new THREE.Vector3(...element.rotationMatrix[1]);
      const zAxis = new THREE.Vector3(...element.rotationMatrix[2]);
      const matrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
      const rotation = new THREE.Euler().setFromRotationMatrix(matrix);
      const position = new THREE.Vector3(...element.center);

      return {
        geometry: geometry,
        position: position,
        rotation: rotation,
        isFlat: size[0] < epsilon || size[1] < epsilon || size[2] < epsilon,
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