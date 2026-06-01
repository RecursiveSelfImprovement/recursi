class GeometryUtils3D {
  static makeVector(p1, p2) {
    return [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  }

  static getMagnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }

  static makeUnitVector(p1, p2) {
    const v = GeometryUtils3D.makeVector(p1, p2);
    const mag = GeometryUtils3D.getMagnitude(v);
    if (mag < 1e-10) {
      console.warn(
        'makeUnitVector: Degenerate vector (magnitude near zero), returning null.'
      );
      return null;
    }
    return [v[0] / mag, v[1] / mag, v[2] / mag];
  }

  static dotProduct(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  }

  static crossProduct(v1, v2) {
    return [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0],
    ];
  }

  static rotateVector(v, angleXDeg, angleYDeg) {
    const rx = (angleXDeg * Math.PI) / 180;
    const ry = (angleYDeg * Math.PI) / 180;

    let cosx = Math.cos(rx),
      sinx = Math.sin(rx);
    let y1 = v[1] * cosx - v[2] * sinx;
    let z1 = v[1] * sinx + v[2] * cosx;

    let cosy = Math.cos(ry),
      siny = Math.sin(ry);
    let x1 = v[0] * cosy + z1 * siny;
    let z2 = -v[0] * siny + z1 * cosy;

    return [x1, y1, z2];
  }

  static projectPoint(p, uv, d) {
    if (!uv || uv.length !== 3) {
      console.error('projectPoint: Invalid unit vector provided.', uv);
      return p;
    }
    return [p[0] + uv[0] * d, p[1] + uv[1] * d, p[2] + uv[2] * d];
  }

  static getDistance(p1, p2) {
    return Math.sqrt(
      (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2
    );
  }

  static intersectRayPlane(rayStart, rayDir, planePoint, planeNormal) {
    if (Math.abs(GeometryUtils3D.getMagnitude(planeNormal) - 1) > 1e-6) {
      console.error(
        'intersectRayPlane: Plane normal must be a unit vector.',
        planeNormal
      );
      return null;
    }
    const denom = GeometryUtils3D.dotProduct(planeNormal, rayDir);

    if (Math.abs(denom) < 1e-10) {
      return null;
    }

    const diff = GeometryUtils3D.makeVector(rayStart, planePoint);
    const numer = -GeometryUtils3D.dotProduct(planeNormal, diff);
    const t = numer / denom;

    if (t < -1e-10) {
      return null;
    }

    return GeometryUtils3D.projectPoint(rayStart, rayDir, t);
  }

  static rotateVectorAroundAxis(vector, axis, angleRad) {
    const cosTheta = Math.cos(angleRad);
    const sinTheta = Math.sin(angleRad);
    const cross = GeometryUtils3D.crossProduct(axis, vector);
    const dot = GeometryUtils3D.dotProduct(axis, vector);

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

  static rotatePointAroundPointByThreePoints(
    originalPoint,
    rotationCenterPoint,
    angleStartPoint,
    angleVertexPoint,
    angleEndPoint
  ) {
    const translatedPoint = GeometryUtils3D.makeVector(
      originalPoint,
      rotationCenterPoint
    );
    const u = GeometryUtils3D.makeUnitVector(angleStartPoint, angleVertexPoint);
    const v = GeometryUtils3D.makeUnitVector(angleEndPoint, angleVertexPoint);

    if (!u || !v) {
      console.error('Could not compute valid unit vectors for rotation angle.');
      return originalPoint;
    }

    let dot = GeometryUtils3D.dotProduct(u, v);
    dot = Math.max(-1, Math.min(1, dot));
    const theta = Math.acos(dot);

    if (Math.abs(theta) < 1e-10) {
      return originalPoint;
    }

    let axis = GeometryUtils3D.crossProduct(u, v);
    let axisMagnitude = GeometryUtils3D.getMagnitude(axis);

    if (axisMagnitude < 1e-10) {
      if (Math.abs(theta - Math.PI) < 1e-6) {
        const helper = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
        axis = GeometryUtils3D.crossProduct(u, helper);
        axisMagnitude = GeometryUtils3D.getMagnitude(axis);
        if (axisMagnitude < 1e-10)
          axis = GeometryUtils3D.crossProduct(u, [0, 0, 1]);
        axisMagnitude = GeometryUtils3D.getMagnitude(axis);
        if (axisMagnitude < 1e-10) return originalPoint;
        axis = [
          axis[0] / axisMagnitude,
          axis[1] / axisMagnitude,
          axis[2] / axisMagnitude,
        ];
      } else {
        return originalPoint;
      }
    } else {
      axis = [
        axis[0] / axisMagnitude,
        axis[1] / axisMagnitude,
        axis[2] / axisMagnitude,
      ];
    }

    const rotatedTranslated = GeometryUtils3D.rotateVectorAroundAxis(
      translatedPoint,
      axis,
      theta
    );

    return [
      rotatedTranslated[0] + rotationCenterPoint[0],
      rotatedTranslated[1] + rotationCenterPoint[1],
      rotatedTranslated[2] + rotationCenterPoint[2],
    ];
  }

  static correctRotationMatrix(matrix) {
    let xAxis = [matrix[0][0], matrix[0][1], matrix[0][2]];
    let yAxis = [matrix[1][0], matrix[1][1], matrix[1][2]];

    let xMag = GeometryUtils3D.getMagnitude(xAxis);
    if (xMag < 1e-10) {
      console.warn(
        'Correcting matrix: X axis has zero length. Resetting to [1,0,0].'
      );
      xAxis = [1, 0, 0];
    } else {
      xAxis = [xAxis[0] / xMag, xAxis[1] / xMag, xAxis[2] / xMag];
    }

    let yDotX = GeometryUtils3D.dotProduct(yAxis, xAxis);
    yAxis = [
      yAxis[0] - yDotX * xAxis[0],
      yAxis[1] - yDotX * xAxis[1],
      yAxis[2] - yDotX * xAxis[2],
    ];

    let yMag = GeometryUtils3D.getMagnitude(yAxis);
    if (yMag < 1e-10) {
      console.warn('Correcting matrix: Y axis parallel to X. Regenerating Y.');
      const zLike = Math.abs(xAxis[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
      yAxis = GeometryUtils3D.crossProduct(zLike, xAxis);
      yMag = GeometryUtils3D.getMagnitude(yAxis);
      if (yMag < 1e-10) yAxis = GeometryUtils3D.crossProduct([1, 0, 0], xAxis);
      yMag = GeometryUtils3D.getMagnitude(yAxis);
      if (yMag < 1e-10) {
        yAxis = [0, 1, 0];
        console.error('Absolute fallback for Y axis!');
      } else yAxis = [yAxis[0] / yMag, yAxis[1] / yMag, yAxis[2] / yMag];
    } else {
      yAxis = [yAxis[0] / yMag, yAxis[1] / yMag, yAxis[2] / yMag];
    }

    const zAxis = GeometryUtils3D.crossProduct(xAxis, yAxis);

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

    const rotatedX = GeometryUtils3D.rotateVectorAroundAxis(
      xAxis,
      axis,
      angleRad
    );
    const rotatedY = GeometryUtils3D.rotateVectorAroundAxis(
      yAxis,
      axis,
      angleRad
    );
    const rotatedZ = GeometryUtils3D.rotateVectorAroundAxis(
      zAxis,
      axis,
      angleRad
    );

    return [rotatedX, rotatedY, rotatedZ];
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
        console.error('Invalid local axis name for rotation:', axisName);
        return currentMatrix;
    }

    const angleRad = (angleDeg * Math.PI) / 180;
    const deltaRotationMatrix = GeometryUtils3D.makeRotationMatrix(
      rotationAxis,
      angleRad
    );
    const updatedMatrix = GeometryUtils3D.multiplyMatrices(
      deltaRotationMatrix,
      currentMatrix
    );
    return GeometryUtils3D.correctRotationMatrix(updatedMatrix);
  }

  static buildRotationMatrix(xAngleDeg, yAngleDeg, zAngleDeg) {
    const xRad = (xAngleDeg * Math.PI) / 180;
    const yRad = (yAngleDeg * Math.PI) / 180;
    const zRad = (zAngleDeg * Math.PI) / 180;

    const c1 = Math.cos(xRad),
      s1 = Math.sin(xRad);
    const c2 = Math.cos(yRad),
      s2 = Math.sin(yRad);
    const c3 = Math.cos(zRad),
      s3 = Math.sin(zRad);

    const r11 = c2 * c3;
    const r12 = c3 * s1 * s2 - c1 * s3;
    const r13 = c1 * c3 * s2 + s1 * s3;

    const r21 = c2 * s3;
    const r22 = c1 * c3 + s1 * s2 * s3;
    const r23 = -c3 * s1 + c1 * s2 * s3;

    const r31 = -s2;
    const r32 = c2 * s1;
    const r33 = c1 * c2;

    return [
      [r11, r12, r13],
      [r21, r22, r23],
      [r31, r32, r33],
    ];
  }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 333,
  "provides": [
    "GeometryUtils3D"
  ],
  "deps": []
}
recursi-meta */

globalThis.GeometryUtils3D = GeometryUtils3D;
