
class CapsuleGeometryCreator {
  constructor(params = {}) {
    this.startPoint = params.startPoint || [0, 0, 0];
    this.endPoint = params.endPoint || [0, 1, 0];
    this.radius = params.radius || 0.5;
    this.radialSegments = params.radialSegments || 32;
    this.heightSegments = params.heightSegments || 1;
    this.capSegments = params.capSegments || 16;
    this.rotationMatrix = params.rotationMatrix || null;
    this.threshold = params.threshold || 0.0001;
    this.vertices = [];
    this.indices = [];
    this.baseVertices = [];
  }

  create() {
    const length = GeometryUtils3D.getDistance(this.startPoint, this.endPoint);
    if (length < this.threshold) {
      return this.makeSphere();
    }

    if (!this.baseVertices.length) {
      this.generateBaseCapsule(length);
    }

    this.vertices = this.baseVertices.map((v) => [...v]);
    this.applyTransformations(length);
    const geometry = this.toThreeJS();
    geometry.capsuleParams = {
      startPoint: this.startPoint,
      endPoint: this.endPoint,
      radius: this.radius,
    };
    return geometry;
  }

  applyTransformations(length) {
    const mid = [
      (this.startPoint[0] + this.endPoint[0]) / 2,
      (this.startPoint[1] + this.endPoint[1]) / 2,
      (this.startPoint[2] + this.endPoint[2]) / 2,
    ];
    const dir = GeometryUtils3D.makeUnitVector(this.endPoint, this.startPoint);

    let rotation;
    if (this.rotationMatrix) {
      rotation = this.adjustRotationMatrix(this.rotationMatrix, dir);
    } else {
      rotation = this.getDefaultRotation(dir);
    }

    this.vertices = this.vertices.map((vertex) => {
      let rotated = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        rotated[i] =
          vertex[0] * rotation[i][0] +
          vertex[1] * rotation[i][1] +
          vertex[2] * rotation[i][2];
      }
      return [rotated[0] + mid[0], rotated[1] + mid[1], rotated[2] + mid[2]];
    });
  }

  adjustRotationMatrix(matrix, dir) {
    const yAxis = [matrix[1][0], matrix[1][1], matrix[1][2]];
    const angle = Math.acos(GeometryUtils3D.dotProduct(yAxis, dir));
    if (Math.abs(angle) < 0.0001) return matrix;

    const axis = GeometryUtils3D.crossProduct(yAxis, dir);
    const mag = GeometryUtils3D.getMagnitude(axis);
    if (mag < 0.0001) {
      const temp = [1, 0, 0];
      if (Math.abs(GeometryUtils3D.dotProduct(temp, dir)) > 0.9)
        (temp[0] = 0), (temp[1] = 1);
      return GeometryUtils3D.multiplyMatrices(
        matrix,
        GeometryUtils3D.makeRotationMatrix(temp, Math.PI)
      );
    }
    const normAxis = [axis[0] / mag, axis[1] / mag, axis[2] / mag];
    return GeometryUtils3D.multiplyMatrices(
      matrix,
      GeometryUtils3D.makeRotationMatrix(normAxis, angle)
    );
  }

  getDefaultRotation(dir) {
    const up = [0, 1, 0];
    const angle = Math.acos(GeometryUtils3D.dotProduct(up, dir));
    if (Math.abs(angle) < 0.0001)
      return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
    if (Math.abs(angle - Math.PI) < 0.0001)
      return [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, -1],
      ];

    const axis = GeometryUtils3D.crossProduct(up, dir);
    const mag = GeometryUtils3D.getMagnitude(axis);
    const normAxis = [axis[0] / mag, axis[1] / mag, axis[2] / mag];
    return GeometryUtils3D.makeRotationMatrix(normAxis, angle);
  }

  makeSphere() {
    const vertices = [];
    const indices = [];
    for (let i = 0; i <= this.capSegments; i++) {
      const phi = (i / this.capSegments) * Math.PI;
      for (let j = 0; j < this.radialSegments; j++) {
        const theta = (j / this.radialSegments) * 2 * Math.PI;
        const x = this.radius * Math.sin(phi) * Math.cos(theta);
        const y = this.radius * Math.cos(phi);
        const z = this.radius * Math.sin(phi) * Math.sin(theta);
        vertices.push([
          x + this.startPoint[0],
          y + this.startPoint[1],
          z + this.startPoint[2],
        ]);
      }
    }
    for (let i = 0; i < this.capSegments; i++) {
      for (let j = 0; j < this.radialSegments; j++) {
        const a = i * this.radialSegments + j;
        const b = a + this.radialSegments;
        const c = ((j + 1) % this.radialSegments) + i * this.radialSegments;
        const d = c + this.radialSegments;
        indices.push([a, b, d]);
        indices.push([a, d, c]);
      }
    }
    this.vertices = vertices;
    this.indices = indices;
    const geometry = this.toThreeJS();
    geometry.capsuleParams = {
      startPoint: this.startPoint,
      endPoint: this.endPoint,
      radius: this.radius,
    };
    return geometry;
  }

  update(params = {}) {
    Object.assign(this, params);
    const length = GeometryUtils3D.getDistance(this.startPoint, this.endPoint);
    if (length < this.threshold) {
      return this.makeSphere();
    }
    if (
      !this.baseVertices.length ||
      params.radius ||
      params.radialSegments ||
      params.heightSegments ||
      params.capSegments
    ) {
      this.generateBaseCapsule(length);
    }
    this.vertices = this.baseVertices.map((v) => [...v]);
    this.applyTransformations(length);
    const geometry = this.toThreeJS();
    geometry.capsuleParams = {
      startPoint: this.startPoint,
      endPoint: this.endPoint,
      radius: this.radius,
    };
    return geometry;
  }

  toThreeJS() {
    const geometry = new THREE.BufferGeometry();
    const flatVertices = new Float32Array(this.vertices.length * 3);
    for (let i = 0; i < this.vertices.length; i++) {
      flatVertices[i * 3] = this.vertices[i][0];
      flatVertices[i * 3 + 1] = this.vertices[i][1];
      flatVertices[i * 3 + 2] = this.vertices[i][2];
    }
    const flatIndices = new Uint32Array(this.indices.length * 3);
    for (let i = 0; i < this.indices.length; i++) {
      flatIndices[i * 3] = this.indices[i][0];
      flatIndices[i * 3 + 1] = this.indices[i][1];
      flatIndices[i * 3 + 2] = this.indices[i][2];
    }
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(flatVertices, 3)
    );
    if (this.indices.length > 0) {
      geometry.setIndex(new THREE.BufferAttribute(flatIndices, 1));
    } else {
      console.warn('No indices generated for geometry!');
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  generateBaseCapsule(length) {
    this.vertices = [];
    this.indices = [];
    this.baseVertices = [];

    const halfLength = length / 2;

    for (let i = 0; i <= this.heightSegments; i++) {
      const t = i / this.heightSegments;
      const y = -halfLength + t * length;
      for (let j = 0; j < this.radialSegments; j++) {
        const theta = (j / this.radialSegments) * 2 * Math.PI;
        const x = this.radius * Math.cos(theta);
        const z = this.radius * Math.sin(theta);
        this.baseVertices.push([x, y, z]);
      }
    }

    const topStart = this.baseVertices.length;
    for (let i = 0; i <= this.capSegments; i++) {
      const phi = (i / this.capSegments) * Math.PI;
      const y = halfLength + this.radius * Math.cos(phi);
      const r = this.radius * Math.sin(phi);
      for (let j = 0; j < this.radialSegments; j++) {
        const theta = (j / this.radialSegments) * 2 * Math.PI;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        this.baseVertices.push([x, y, z]);
      }
    }
    const topCapVertex = this.baseVertices.length - 1;

    const bottomStart = this.baseVertices.length;
    for (let i = 0; i <= this.capSegments; i++) {
      const phi = (i / this.capSegments) * Math.PI;
      const y = -halfLength - this.radius * Math.cos(phi);
      const r = this.radius * Math.sin(phi);
      for (let j = 0; j < this.radialSegments; j++) {
        const theta = (j / this.radialSegments) * 2 * Math.PI;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        this.baseVertices.push([x, y, z]);
      }
    }
    const bottomCapVertex = this.baseVertices.length - 1;

    for (let i = 0; i < this.heightSegments; i++) {
      for (let j = 0; j < this.radialSegments; j++) {
        const a = i * this.radialSegments + j;
        const b = a + this.radialSegments;
        const c = ((j + 1) % this.radialSegments) + i * this.radialSegments;
        const d = c + this.radialSegments;
        this.indices.push([a, b, d]);
        this.indices.push([a, d, c]);
      }
    }

    for (let i = 0; i < this.capSegments; i++) {
      for (let j = 0; j < this.radialSegments; j++) {
        const a = topStart + i * this.radialSegments + j;
        const b = topStart + (i + 1) * this.radialSegments + j;
        const c =
          topStart + i * this.radialSegments + ((j + 1) % this.radialSegments);
        const d =
          topStart +
          (i + 1) * this.radialSegments +
          ((j + 1) % this.radialSegments);
        this.indices.push([a, b, d]);
        this.indices.push([a, d, c]);
      }
    }
    const lastTopRing = topStart + (this.capSegments - 1) * this.radialSegments;
    for (let j = 0; j < this.radialSegments; j++) {
      const a = lastTopRing + j;
      const b = topCapVertex;
      const c = lastTopRing + ((j + 1) % this.radialSegments);
      this.indices.push([a, b, c]);
    }

    for (let i = 0; i < this.capSegments; i++) {
      for (let j = 0; j < this.radialSegments; j++) {
        const a = bottomStart + i * this.radialSegments + j;
        const b = bottomStart + (i + 1) * this.radialSegments + j;
        const c =
          bottomStart +
          i * this.radialSegments +
          ((j + 1) % this.radialSegments);
        const d =
          bottomStart +
          (i + 1) * this.radialSegments +
          ((j + 1) % this.radialSegments);
        this.indices.push([a, d, b]);
        this.indices.push([a, c, d]);
      }
    }
    const lastBottomRing =
      bottomStart + (this.capSegments - 1) * this.radialSegments;
    for (let j = 0; j < this.radialSegments; j++) {
      const a = lastBottomRing + j;
      const b = bottomCapVertex;
      const c = lastBottomRing + ((j + 1) % this.radialSegments);
      this.indices.push([a, c, b]);
    }
  }

}

