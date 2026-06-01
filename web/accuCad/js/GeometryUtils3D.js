
class GeometryUtils3D {
  static makeVector(p1, p2) {
    return [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  }

  static makeUnitVector(p1, p2) {
    const v = this.makeVector(p1, p2);
    const mag = this.getMagnitude(v);
    if (mag < 1e-10) {
      return null;
    }
    return [v[0] / mag, v[1] / mag, v[2] / mag];
  }

  static dotProduct(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  }

  static projectPoint(p, uv, d) {
    return [p[0] + uv[0] * d, p[1] + uv[1] * d, p[2] + uv[2] * d];
  }

  static getDistance(p1, p2) {
    return Math.sqrt(
      (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2
    );
  }

  static getMagnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }

  static crossProduct(v1, v2) {
    return [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0],
    ];
  }

  static intersectRayPlane(rayStart, rayDir, planePoint, planeNormal) {
    if (Math.abs(this.getMagnitude(planeNormal) - 1) > 0.001) {
      console.error('Plane normal not unit length:', planeNormal);
      return null;
    }
    const denom = this.dotProduct(planeNormal, rayDir);
    if (Math.abs(denom) < 1e-10) {
      return null;
    }
    const diff = this.makeVector(rayStart, planePoint);
    const numer = -this.dotProduct(planeNormal, diff);
    const t = numer / denom;
    if (t < 0) {
      return null;
    }
    return this.projectPoint(rayStart, rayDir, t);
  }

  static rotatePointAroundPointByThreePoints(
    originalPoint,
    rotationCenterPoint,
    angleStartPoint,
    angleVertexPoint,
    angleEndPoint
  ) {
    const translatedPoint = this.makeVector(originalPoint, rotationCenterPoint);
    const u = this.makeUnitVector(angleStartPoint, angleVertexPoint);
    const v = this.makeUnitVector(angleEndPoint, angleVertexPoint);

    if (!u || !v) {
      console.error(
        'Could not compute valid unit vectors from the angle points.'
      );
      return originalPoint;
    }

    let dot = this.dotProduct(u, v);
    dot = Math.max(-1, Math.min(1, dot));
    const theta = Math.acos(dot);

    let axis = this.crossProduct(u, v);
    let axisMagnitude = this.getMagnitude(axis);

    if (axisMagnitude < 1e-10) {
      if (theta < 1e-10) return originalPoint;
      const helper = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      axis = this.crossProduct(u, helper);
      axisMagnitude = this.getMagnitude(axis);
    }

    const normalizedAxis = [
      axis[0] / axisMagnitude,
      axis[1] / axisMagnitude,
      axis[2] / axisMagnitude,
    ];

    const rotated = this.rotateVectorAroundAxis(
      translatedPoint,
      normalizedAxis,
      theta
    );

    return [
      rotated[0] + rotationCenterPoint[0],
      rotated[1] + rotationCenterPoint[1],
      rotated[2] + rotationCenterPoint[2],
    ];
  }

  static rotateVectorAroundAxis(vector, axis, angleRad) {
    const cosTheta = Math.cos(angleRad);
    const sinTheta = Math.sin(angleRad);
    const cross = this.crossProduct(axis, vector);
    const dot = this.dotProduct(axis, vector);

    return [
      vector[0] * cosTheta +
        cross[0] * sinTheta +
        axis[0] * dot * (1 - cosTheta),
      vector[1] * cosTheta +
        cross[1] * sinTheta +
        axis[1] * dot * (1 - cosTheta),
      vector[2] * cosTheta +
        cross[2] * sinTheta +
        axis[2] * dot * (1 - cosTheta),
    ];
  }

  static correctRotationMatrix(matrix) {
    let xAxis = [matrix[0][0], matrix[0][1], matrix[0][2]];
    const xMag = this.getMagnitude(xAxis);

    xAxis =
      xMag < 1e-10
        ? [1, 0, 0]
        : [xAxis[0] / xMag, xAxis[1] / xMag, xAxis[2] / xMag];

    let origYAxis = [matrix[1][0], matrix[1][1], matrix[1][2]];
    let zAxis = this.crossProduct(xAxis, origYAxis);
    let zMag = this.getMagnitude(zAxis);

    if (zMag < 1e-10) {
      zAxis = this.crossProduct(xAxis, [0, 0, 1]);
      const zMag2 = this.getMagnitude(zAxis);
      if (zMag2 < 1e-10) {
        zAxis = this.crossProduct(xAxis, [0, 1, 0]);
      }
      zMag = this.getMagnitude(zAxis);
    }
    zAxis = [zAxis[0] / zMag, zAxis[1] / zMag, zAxis[2] / zMag];

    const yAxis = this.crossProduct(zAxis, xAxis);

    return [xAxis, yAxis, zAxis];
  }

  static multiplyMatrices(a, b) {
    const result = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        result[i][j] =
          a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
      }
    }
    return result;
  }

  static makeRotationMatrix(axis, angleRad) {
    const xAxis = [1, 0, 0];
    const yAxis = [0, 1, 0];
    const zAxis = [0, 0, 1];

    const rotatedX = this.rotateVectorAroundAxis(xAxis, axis, angleRad);
    const rotatedY = this.rotateVectorAroundAxis(yAxis, axis, angleRad);
    const rotatedZ = this.rotateVectorAroundAxis(zAxis, axis, angleRad);

    return [
      [rotatedX[0], rotatedY[0], rotatedZ[0]],
      [rotatedX[1], rotatedY[1], rotatedZ[1]],
      [rotatedX[2], rotatedY[2], rotatedZ[2]],
    ];
  }

  static rotateMatrixAroundAxis(currentMatrix, axisName, angleDeg) {
    const xAxis = [
      currentMatrix[0][0],
      currentMatrix[0][1],
      currentMatrix[0][2],
    ];
    const yAxis = [
      currentMatrix[1][0],
      currentMatrix[1][1],
      currentMatrix[1][2],
    ];
    const zAxis = [
      currentMatrix[2][0],
      currentMatrix[2][1],
      currentMatrix[2][2],
    ];

    let rotationAxis;
    switch (axisName.toLowerCase()) {
      case 'x':
        rotationAxis = xAxis;
        break;
      case 'y':
        rotationAxis = yAxis;
        break;
      case 'z':
        rotationAxis = zAxis;
        break;
      default:
        console.error('Invalid axis name:', axisName);
        return currentMatrix;
    }

    const angleRad = (angleDeg * Math.PI) / 180;

    const rotateVector = (v) =>
      this.rotateVectorAroundAxis(v, rotationAxis, angleRad);

    const newXAxis = axisName === 'x' ? xAxis : rotateVector(xAxis);
    const newYAxis = axisName === 'y' ? yAxis : rotateVector(yAxis);
    const newZAxis = axisName === 'z' ? zAxis : rotateVector(zAxis);

    return this.correctRotationMatrix([newXAxis, newYAxis, newZAxis]);
  }

}

