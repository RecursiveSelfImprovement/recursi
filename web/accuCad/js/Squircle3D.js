
class Squircle3D {
  constructor(
    threeDView,
    {
      squircleAmount = 0.5,
      center = [0, 0, 0],
      rotationMatrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      color = 0x88ccff,
      outlineThickness = 2,
      opacity = 0.5,
      size = 1,
      depthTest = true,
      blend = 1.2,
      mode = 'arc',
      cameraOffset = 0.01,
    } = {}
  ) {
    this.threeDView = threeDView;
    this.squircleAmount = squircleAmount;
    this.center = center;
    this.rotationMatrix = rotationMatrix;
    this.color = color;
    this.outlineThickness = outlineThickness;
    this.opacity = opacity;
    this.size = size;
    this.depthTest = depthTest;
    this.blend = blend;
    this.mode = mode;
    this.cameraOffset = cameraOffset;
    this.group = new THREE.Group();
    this.group.userData.isPickable = false;
    this.fillMesh = null;
    this.outlineLine = null;
    this.geometryCalc =
      this.mode === 'bezier'
        ? new BezierSquircleCalc([0, 0], this.size, this.outlineThickness)
        : new ArcSquircleCalc(this.outlineThickness);
    this._createGeometry();
  }

  _computeTransformMatrix() {
    const xAxis = new THREE.Vector3(...this.rotationMatrix[0]);
    const yAxis = new THREE.Vector3(...this.rotationMatrix[1]);
    const zAxis = new THREE.Vector3(...this.rotationMatrix[2]);
    const T = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    let effectiveCenter = new THREE.Vector3(...this.center);
    if (
      this.threeDView &&
      this.threeDView.camera &&
      typeof this.cameraOffset === 'number'
    ) {
      const cameraPos = this.threeDView.camera.position;
      const offsetDir = new THREE.Vector3()
        .subVectors(cameraPos, effectiveCenter)
        .normalize();
      effectiveCenter.add(offsetDir.multiplyScalar(this.cameraOffset));
    }
    T.setPosition(effectiveCenter);
    return T;
  }

  _createGeometry() {
    if (this.fillMesh) {
      this.group.remove(this.fillMesh);
      this.fillMesh.geometry.dispose();
      this.fillMesh.material.dispose();
      this.fillMesh = null;
    }
    if (this.outlineLine) {
      this.group.remove(this.outlineLine);
      this.outlineLine.geometry.dispose();
      this.outlineLine.material.dispose();
      this.outlineLine = null;
    }

    const t = this.squircleAmount;
    const shape = new THREE.Shape();
    const T = this._computeTransformMatrix();

    if (this.mode === 'bezier') {
      this.geometryCalc.setSize(this.size);
      const pathData = this.geometryCalc.getPathData(t);
      const parser = new THREE.SVGLoader().parse(
        `<svg><path d="${pathData}"/></svg>`
      );
      parser.paths.forEach((path) =>
        shape.fromPoints(path.currentPath.getPoints())
      );
    } else {
      const segments = this.geometryCalc.getArcSegments(
        t,
        this.size,
        this.blend
      );
      const firstSegment = segments[0];
      let startX, startY;
      if (firstSegment.type === 'line') {
        startX = firstSegment.start[0];
        startY = firstSegment.start[1];
      } else {
        startX =
          firstSegment.center[0] +
          firstSegment.radius * Math.cos(firstSegment.startAngle);
        startY =
          firstSegment.center[1] +
          firstSegment.radius * Math.sin(firstSegment.startAngle);
      }
      shape.moveTo(startX, startY);
      segments.forEach((segment) => {
        if (segment.type === 'line') {
          shape.lineTo(segment.end[0], segment.end[1]);
        } else {
          const { center, radius, startAngle, endAngle, clockwise } = segment;
          shape.absarc(
            center[0],
            center[1],
            radius,
            startAngle,
            endAngle,
            !clockwise
          );
        }
      });
    }
    shape.closePath();

    const shapeGeometry = new THREE.ShapeGeometry(shape);
    shapeGeometry.applyMatrix4(T);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      opacity: this.opacity,
      depthTest: this.depthTest,
      transparent: this.opacity < 1,
      side: THREE.DoubleSide,
    });
    this.fillMesh = new THREE.Mesh(shapeGeometry, fillMaterial);
    this.fillMesh.userData.isPickable = false;
    this.group.add(this.fillMesh);

    if (this.outlineThickness > 0) {
      const outlinePoints2D = shape.getPoints(200);
      const outlinePoints3D = outlinePoints2D.map((pt) =>
        new THREE.Vector3(pt.x, pt.y, 0).applyMatrix4(T)
      );
      const positions = [];
      outlinePoints3D.forEach((pt) => positions.push(pt.x, pt.y, pt.z));
      const firstPt3D = outlinePoints3D[0];
      positions.push(firstPt3D.x, firstPt3D.y, firstPt3D.z);
      const lineGeometry = new LineGeometry();
      lineGeometry.setPositions(positions);
      const lineMaterial = new LineMaterial({
        color: this.color,
        linewidth: this.outlineThickness,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        dashed: false,
        depthTest: this.depthTest,
      });
      this.outlineLine = new Line2(lineGeometry, lineMaterial);
      this.outlineLine.userData.isPickable = false;
      this.group.add(this.outlineLine);
    }
  }

  update(params = {}) {
    if (params.squircleAmount !== undefined)
      this.squircleAmount = params.squircleAmount;
    if (params.center !== undefined) this.center = params.center;
    if (params.rotationMatrix !== undefined)
      this.rotationMatrix = params.rotationMatrix;
    if (params.color !== undefined) this.color = params.color;
    if (params.outlineThickness !== undefined) {
      this.outlineThickness = params.outlineThickness;
      this.geometryCalc.outlineThickness = params.outlineThickness;
    }
    if (params.opacity !== undefined) this.opacity = params.opacity;
    if (params.size !== undefined) this.size = params.size;
    if (params.depthTest !== undefined) this.depthTest = params.depthTest;
    if (params.blend !== undefined) this.blend = params.blend;
    if (params.mode !== undefined) {
      this.mode = params.mode;
      this.geometryCalc =
        this.mode === 'bezier'
          ? new BezierSquircleCalc([0, 0], this.size, this.outlineThickness)
          : new ArcSquircleCalc(this.outlineThickness);
    }
    if (params.cameraOffset !== undefined)
      this.cameraOffset = params.cameraOffset;
    this._createGeometry();
  }

  getObject3D() {
    return this.group;
  }

}

