class DrawPathCommand {
  constructor(baseController) {
    this.initBase(baseController);
    this.allowSelfSnap = true; // --- NEW: Override to allow snapping to previous vertices.
    console.log(
      'DrawPathCommand initialized. Left-click to add points. Right-click (or Escape) to finalize.'
    );
  }
  onMouseDown(data) {
    const { point, event } = data;
    if (event.button !== 0 || !point) return;

    if (this.base.floatingOrigin) this.base.setOrigin(point);

    if (!this.tempElement) {
      this.tempElement = new PathElement();
      this.tempElement.isTemporary = true;
      this.tempElement.color = this.base.currentColor
        ? parseInt(this.base.currentColor.replace('#', ''), 16)
        : 0xff0000;
      this.tempElement.lineWidth = this.base.lineWidth || 4;
      this.base.cadElements.push(this.tempElement);
    }

    const newVertex = {
      point: [...point],
      radius: this.base.commandControlValue || 0,
      tentative: false,
    };

    if (this.tempElement.vertices.length >= 2) {
      const firstVertex = this.tempElement.vertices[0];
      const dx = point[0] - firstVertex.point[0];
      const dy = point[1] - firstVertex.point[1];
      const dz = (point[2] || 0) - (firstVertex.point[2] || 0);
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= 0.05) {
        this.tempElement.closed = true;
        this.updatePermanentGeometry();
        this.reset();
        return;
      }
    }

    this.tempElement.vertices.push(newVertex);
    this.tempElement.points.push([...point]);
    this.tempElement.color = this.base.currentColor
      ? parseInt(this.base.currentColor.replace('#', ''), 16)
      : 0xff0000;
    this.tempElement.lineWidth = this.base.lineWidth || 4;
    this.updatePermanentGeometry();

    if (this.previewShape) {
      this.base.view.scene.remove(this.previewShape);
      this.disposeObject(this.previewShape);
      this.previewShape = null;
    }
  }

  onMouseMove(data) {
    const { point } = data;
    if (point && this.tempElement?.vertices.length)
      this.updatePreviewShape(point);
  }

  onRightClick() {
    this.reset();
  }

  createLineMaterial(color, thickness) {
    return new LineMaterial({
      color: color,
      linewidth: thickness,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }

  createLineGeometry(pointsArray) {
    const geometry = new LineGeometry();
    geometry.setPositions(pointsArray.flat());
    return geometry;
  }

  updatePermanentGeometry() {
    if (!this.tempElement || this.tempElement.points.length < 2) return;

    if (this.tempElement.threejsObject) {
      this.base.view.scene.remove(this.tempElement.threejsObject);
      this.disposeObject(this.tempElement.threejsObject);
    }

    const finalPoints = this.generateFinalPoints(
      this.tempElement.vertices,
      this.tempElement.closed
    );
    if (finalPoints.length < 2) return;

    if (this.tempElement.closed) {
      const group = new THREE.Group();
      if (finalPoints.length >= 3) {
        const shape = new THREE.Shape();
        shape.moveTo(finalPoints[0][0], finalPoints[0][1]);
        for (let i = 1; i < finalPoints.length; i++) {
          shape.lineTo(finalPoints[i][0], finalPoints[i][1]);
        }
        shape.closePath();

        const fillGeometry = new THREE.ShapeGeometry(shape);
        const fillMaterial = new THREE.MeshPhongMaterial({
          color: this.tempElement.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
          emissive: this.tempElement.color,
          emissiveIntensity: 0.2,
        });
        group.add(new THREE.Mesh(fillGeometry, fillMaterial));
      }
      const outlineGeometry = this.createLineGeometry(finalPoints);
      const outlineMaterial = this.createLineMaterial(
        this.tempElement.color,
        this.tempElement.lineWidth || this.base.lineWidth || 4
      );
      const outline = new Line2(outlineGeometry, outlineMaterial);
      group.add(outline);
      this.tempElement.threejsObject = group;
    } else {
      const geometry = this.createLineGeometry(finalPoints);
      const material = this.createLineMaterial(
        this.tempElement.color,
        this.tempElement.lineWidth || this.base.lineWidth || 4
      );
      this.tempElement.threejsObject = new Line2(geometry, material);
    }
    this.base.view.scene.add(this.tempElement.threejsObject);
  }

  updatePreviewShape(previewPoint) {
      if (!this.tempElement?.vertices.length) return;
      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        this.disposeObject(this.previewShape);
      }
      this.tempElement.color = this.base.currentColor
        ? parseInt(this.base.currentColor.replace('#', ''), 16)
        : 0xff0000;
      this.tempElement.lineWidth = this.base.lineWidth || 4;
      
      // Temporarily hide the sharp permanent segments while drawing rounded previews
      if (this.tempElement.threejsObject) {
        this.tempElement.threejsObject.visible = false;
      }

      const vertices = [...this.tempElement.vertices];
      const firstVertex = vertices[0];
      const previewVertex = {
        point: [...previewPoint],
        radius: this.base.commandControlValue || 0,
        tentative: true,
      };
      const distance = Math.sqrt(
        Math.pow(previewPoint[0] - firstVertex.point[0], 2) +
          Math.pow(previewPoint[1] - firstVertex.point[1], 2) +
          Math.pow((previewPoint[2] || 0) - (firstVertex.point[2] || 0), 2)
      );
      const shouldClose = distance <= 0.05 && vertices.length >= 2;
      if (vertices.length >= 1 && this.tempElement.isTemporary) {
        vertices[vertices.length - 1].radius = this.base.commandControlValue || 0;
      }

      let finalPoints;
      if (shouldClose) {
        const tempVertices = [...vertices, { ...firstVertex, radius: 0 }];
        finalPoints = this.generateFinalPoints(tempVertices, true);
        const group = new THREE.Group();
        if (finalPoints.length >= 3) {
          const shape = new THREE.Shape(
            finalPoints.map((p) => new THREE.Vector2(p[0], p[1]))
          );
          const fillGeometry = new THREE.ShapeGeometry(shape);
          const fillMaterial = new THREE.MeshPhongMaterial({
            color: this.tempElement.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3,
            emissive: this.tempElement.color,
            emissiveIntensity: 0.1,
          });
          group.add(new THREE.Mesh(fillGeometry, fillMaterial));
        }
        const outlineGeometry = this.createLineGeometry(finalPoints);
        const outlineMaterial = this.createLineMaterial(
          this.tempElement.color,
          this.tempElement.lineWidth
        );
        group.add(new Line2(outlineGeometry, outlineMaterial));
        this.previewShape = group;
      } else {
        const tempVertices = [...vertices, previewVertex];
        finalPoints = this.generateFinalPoints(tempVertices, false);
        const geometry = this.createLineGeometry(finalPoints);
        const material = this.createLineMaterial(
          this.tempElement.color,
          this.tempElement.lineWidth
        );
        this.previewShape = new Line2(geometry, material);
      }
      this.base.view.scene.add(this.previewShape);
    }

  generateFinalPoints(vertices, closed) {
    if (vertices.length < 2) return [];

    const finalPoints = [];
    finalPoints.push([...vertices[0].point]);

    for (let i = 1; i < vertices.length - 1; i++) {
      const v1 = vertices[i - 1],
        v2 = vertices[i],
        v3 = vertices[i + 1];
      if (v2.radius > 1e-8) {
        const roundData = RoundingUtils3D.getRoundingData(v1, v2, v3);
        if (roundData) {
          finalPoints.push(
            ...RoundingUtils3D.createArcPoints(
              roundData.tangentPoint1,
              roundData.tangentPoint2,
              roundData.circleCenter,
              roundData.radius,
              roundData.sweepFlag,
              32
            )
          );
        } else {
          finalPoints.push([...v2.point]);
        }
      } else {
        finalPoints.push([...v2.point]);
      }
    }

    finalPoints.push([...vertices[vertices.length - 1].point]);

    return finalPoints;
  }

  reset() {
      // Clear and dispose of the dynamic preview shape immediately on reset/finalize
      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        this.disposeObject(this.previewShape);
        this.previewShape = null;
      }

      if (this.tempElement) {
        if (this.tempElement.vertices.length >= 2) {
          this.tempElement.isTemporary = false;
          this.updatePermanentGeometry();
          // Restore visibility when finalizing or resetting the drawing action
          if (this.tempElement.threejsObject) {
            this.tempElement.threejsObject.visible = true;
          }
        } else {
          if (this.tempElement.threejsObject)
            this.base.view.scene.remove(this.tempElement.threejsObject);
          const idx = this.base.cadElements.indexOf(this.tempElement);
          if (idx !== -1) this.base.cadElements.splice(idx, 1);
        }
      }
      this.tempElement = null;
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


  // Injected method to safely release geometry and material memory in ThreeJS
    disposeObject(object) {
      if (!object) return;
      object.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 283,
  "provides": [
    "DrawPathCommand"
  ],
  "deps": []
}
recursi-meta */
