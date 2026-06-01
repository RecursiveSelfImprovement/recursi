// js/utils/GeometryUtils3d.js
class GeometryUtils3D {
  /**
   * Creates a vector from p2 to p1.
   * @param {Array<number>} p1 - End point [x, y, z].
   * @param {Array<number>} p2 - Start point [x, y, z].
   * @returns {Array<number>} The vector [dx, dy, dz].
   */
  static makeVector(p1, p2) {
    return [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  }

  /**
   * Calculates the magnitude (length) of a 3D vector.
   * @param {Array<number>} v - The vector [x, y, z].
   * @returns {number} The magnitude.
   */
  static getMagnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }

  /**
   * Creates a unit vector pointing from p2 to p1.
   * @param {Array<number>} p1 - End point [x, y, z].
   * @param {Array<number>} p2 - Start point [x, y, z].
   * @returns {Array<number> | null} The unit vector [dx, dy, dz] or null if magnitude is near zero.
   */
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

  /**
   * Calculates the dot product of two 3D vectors.
   * @param {Array<number>} v1 - First vector [x, y, z].
   * @param {Array<number>} v2 - Second vector [x, y, z].
   * @returns {number} The dot product.
   */
  static dotProduct(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  }

  /**
   * Calculates the cross product of two 3D vectors (v1 x v2).
   * @param {Array<number>} v1 - First vector [x, y, z].
   * @param {Array<number>} v2 - Second vector [x, y, z].
   * @returns {Array<number>} The cross product vector [x, y, z].
   */
  static crossProduct(v1, v2) {
    return [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0],
    ];
  }

  /**
   * Rotates a 3D vector first around the global X-axis, then the global Y-axis.
   * @param {Array<number>} v - The vector [x, y, z] to rotate.
   * @param {number} angleXDeg - Rotation angle around X-axis in degrees.
   * @param {number} angleYDeg - Rotation angle around Y-axis in degrees.
   * @returns {Array<number>} The rotated vector [x, y, z].
   */
  static rotateVector(v, angleXDeg, angleYDeg) {
    const rx = (angleXDeg * Math.PI) / 180;
    const ry = (angleYDeg * Math.PI) / 180;

    // Rotate around X-axis
    let cosx = Math.cos(rx),
      sinx = Math.sin(rx);
    let y1 = v[1] * cosx - v[2] * sinx;
    let z1 = v[1] * sinx + v[2] * cosx;

    // Rotate around Y-axis (using the intermediate results)
    let cosy = Math.cos(ry),
      siny = Math.sin(ry);
    let x1 = v[0] * cosy + z1 * siny;
    let z2 = -v[0] * siny + z1 * cosy;

    return [x1, y1, z2];
  }

  /**
   * Projects a point along a direction unit vector by a distance.
   * @param {Array<number>} p - The starting point [x, y, z].
   * @param {Array<number>} uv - The unit direction vector [dx, dy, dz].
   * @param {number} d - The distance to project.
   * @returns {Array<number>} The projected point [x, y, z].
   */
  static projectPoint(p, uv, d) {
    // Ensure uv is a valid vector before proceeding
    if (!uv || uv.length !== 3) {
      console.error('projectPoint: Invalid unit vector provided.', uv);
      return p; // Return original point if direction is invalid
    }
    return [p[0] + uv[0] * d, p[1] + uv[1] * d, p[2] + uv[2] * d];
  }

  /**
   * Calculates the Euclidean distance between two 3D points.
   * @param {Array<number>} p1 - First point [x, y, z].
   * @param {Array<number>} p2 - Second point [x, y, z].
   * @returns {number} The distance.
   */
  static getDistance(p1, p2) {
    return Math.sqrt(
      (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2 
    );
  }

  /**
   * Intersects a ray with a plane.
   * @param {Array<number>} rayStart - Ray origin [x, y, z].
   * @param {Array<number>} rayDir - Ray direction (unit vector) [dx, dy, dz].
   * @param {Array<number>} planePoint - A point on the plane [px, py, pz].
   * @param {Array<number>} planeNormal - Plane normal (unit vector) [nx, ny, nz].
   * @returns {Array<number> | null} Intersection point [x, y, z] or null if no intersection in front.
   */
  static intersectRayPlane(rayStart, rayDir, planePoint, planeNormal) {
    // Check if plane normal is normalized (optional sanity check)
    if (Math.abs(GeometryUtils3D.getMagnitude(planeNormal) - 1) > 1e-6) {
      console.error(
        'intersectRayPlane: Plane normal must be a unit vector.',
        planeNormal
      );
      // Attempt to normalize it? Or just fail? Let's fail for now.
      return null;
    }
    const denom = GeometryUtils3D.dotProduct(planeNormal, rayDir);

    if (Math.abs(denom) < 1e-10) {
      // Ray is parallel to the plane
      return null;
    }

    const diff = GeometryUtils3D.makeVector(rayStart, planePoint);
    const numer = -GeometryUtils3D.dotProduct(planeNormal, diff);
    const t = numer / denom;

    // Intersection is behind the ray origin (allow for tiny floating point errors)
    if (t < -1e-10) {
      return null;
    }

    return GeometryUtils3D.projectPoint(rayStart, rayDir, t);
  }

  /**
   * Rotates a vector around an arbitrary axis using Rodrigues' rotation formula.
   * @param {Array<number>} vector - The vector [x, y, z] to rotate.
   * @param {Array<number>} axis - The axis of rotation (unit vector) [ax, ay, az].
   * @param {number} angleRad - The angle of rotation in radians.
   * @returns {Array<number>} The rotated vector [x, y, z].
   */
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

  /**
   * Rotates a point around another point, defining the rotation angle by three other points.
   * @param {Array<number>} originalPoint - Point to rotate.
   * @param {Array<number>} rotationCenterPoint - Center of rotation.
   * @param {Array<number>} angleStartPoint - Point defining the start of the angle.
   * @param {Array<number>} angleVertexPoint - Vertex of the angle.
   * @param {Array<number>} angleEndPoint - Point defining the end of the angle.
   * @returns {Array<number>} The rotated point.
   */
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
      return originalPoint; // No rotation
    }

    let axis = GeometryUtils3D.crossProduct(u, v);
    let axisMagnitude = GeometryUtils3D.getMagnitude(axis);

    if (axisMagnitude < 1e-10) {
      if (Math.abs(theta - Math.PI) < 1e-6) {
        // 180 degrees
        const helper = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
        axis = GeometryUtils3D.crossProduct(u, helper);
        axisMagnitude = GeometryUtils3D.getMagnitude(axis);
        if (axisMagnitude < 1e-10)
          axis = GeometryUtils3D.crossProduct(u, [0, 0, 1]); // Fallback axis
        axisMagnitude = GeometryUtils3D.getMagnitude(axis);
        if (axisMagnitude < 1e-10) return originalPoint; // Cannot determine axis
        axis = [
          axis[0] / axisMagnitude,
          axis[1] / axisMagnitude,
          axis[2] / axisMagnitude,
        ];
      } else {
        return originalPoint; // Angle is 0
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

  /**
   * Corrects a 3x3 matrix to be closer to a proper rotation matrix (orthogonal, unit vectors).
   * Uses a modified Gram-Schmidt process. Assumes input matrix rows are the basis vectors.
   * @param {Array<Array<number>>} matrix - The 3x3 matrix (array of row vectors).
   * @returns {Array<Array<number>>} The corrected 3x3 matrix.
   */
  static correctRotationMatrix(matrix) {
    let xAxis = [matrix[0][0], matrix[0][1], matrix[0][2]];
    let yAxis = [matrix[1][0], matrix[1][1], matrix[1][2]];
    // We derive Z from X and Y

    // Normalize X axis
    let xMag = GeometryUtils3D.getMagnitude(xAxis);
    if (xMag < 1e-10) {
      console.warn(
        'Correcting matrix: X axis has zero length. Resetting to [1,0,0].'
      );
      xAxis = [1, 0, 0];
    } else {
      xAxis = [xAxis[0] / xMag, xAxis[1] / xMag, xAxis[2] / xMag];
    }

    // Make Y orthogonal to X
    let yDotX = GeometryUtils3D.dotProduct(yAxis, xAxis);
    yAxis = [
      yAxis[0] - yDotX * xAxis[0],
      yAxis[1] - yDotX * xAxis[1],
      yAxis[2] - yDotX * xAxis[2],
    ];

    // Normalize Y axis
    let yMag = GeometryUtils3D.getMagnitude(yAxis);
    if (yMag < 1e-10) {
      // Y was parallel to X. Need to pick a new perpendicular direction.
      // Cross product with Z-axis is usually safe, unless X is Z-axis.
      console.warn('Correcting matrix: Y axis parallel to X. Regenerating Y.');
      const zLike = Math.abs(xAxis[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]; // Choose vector not parallel to X
      yAxis = GeometryUtils3D.crossProduct(zLike, xAxis); // Z x X = Y
      yMag = GeometryUtils3D.getMagnitude(yAxis);
      if (yMag < 1e-10) yAxis = GeometryUtils3D.crossProduct([1, 0, 0], xAxis); // Fallback if X was Z-like
      yMag = GeometryUtils3D.getMagnitude(yAxis);
      if (yMag < 1e-10) {
        yAxis = [0, 1, 0];
        console.error('Absolute fallback for Y axis!');
      } // Absolute fallback
      else yAxis = [yAxis[0] / yMag, yAxis[1] / yMag, yAxis[2] / yMag];
    } else {
      yAxis = [yAxis[0] / yMag, yAxis[1] / yMag, yAxis[2] / yMag];
    }

    // Z = X x Y (ensures right-handed system)
    const zAxis = GeometryUtils3D.crossProduct(xAxis, yAxis);
    // Z should already be normalized since X and Y are orthonormal.

    return [xAxis, yAxis, zAxis];
  }

  /**
   * Multiplies two 3x3 matrices (a * b).
   * @param {Array<Array<number>>} a - First 3x3 matrix.
   * @param {Array<Array<number>>} b - Second 3x3 matrix.
   * @returns {Array<Array<number>>} The resulting 3x3 matrix.
   */
  static multiplyMatrices(a, b) {
    const result = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        // Accumulate dot product of row i from 'a' and column j from 'b'
        result[i][j] =
          a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
      }
    }
    return result;
  }

  /**
   * Creates a rotation matrix representing a rotation around an arbitrary axis.
   * @param {Array<number>} axis - The axis of rotation (unit vector) [ax, ay, az].
   * @param {number} angleRad - The angle of rotation in radians.
   * @returns {Array<Array<number>>} The 3x3 rotation matrix (rows are basis vectors).
   */
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

    // Return matrix with rotated basis vectors as rows
    return [rotatedX, rotatedY, rotatedZ];
  }

  /**
   * Rotates an existing rotation matrix around one of its own local axes.
   * @param {Array<Array<number>>} currentMatrix - The current 3x3 rotation matrix (rows are basis vectors).
   * @param {'x' | 'y' | 'z'} axisName - The name ('x', 'y', or 'z') of the local axis to rotate around.
   * @param {number} angleDeg - The rotation angle in degrees.
   * @returns {Array<Array<number>>} The updated, corrected rotation matrix.
   */
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

    // Create the rotation matrix representing the desired rotation *around the chosen local axis*
    const deltaRotationMatrix = GeometryUtils3D.makeRotationMatrix(
      rotationAxis,
      angleRad
    );

    // Apply the rotation: Multiply the delta rotation by the current matrix.
    // Order matters: deltaRotation * currentMatrix applies the delta in the local frame defined by currentMatrix.
    const updatedMatrix = GeometryUtils3D.multiplyMatrices(
      deltaRotationMatrix,
      currentMatrix
    );

    // Correct the resulting matrix to ensure it remains a valid rotation matrix
    return GeometryUtils3D.correctRotationMatrix(updatedMatrix);
  }

  /**
   * Builds a rotation matrix from Euler angles (applied in Z, Y, X order - typical convention).
   * @param {number} xAngleDeg - Rotation around X-axis in degrees.
   * @param {number} yAngleDeg - Rotation around Y-axis in degrees.
   * @param {number} zAngleDeg - Rotation around Z-axis in degrees.
   * @returns {Array<Array<number>>} The resulting 3x3 rotation matrix (rows are basis vectors).
   */
  static buildRotationMatrix(xAngleDeg, yAngleDeg, zAngleDeg) {
    const xRad = (xAngleDeg * Math.PI) / 180;
    const yRad = (yAngleDeg * Math.PI) / 180;
    const zRad = (zAngleDeg * Math.PI) / 180;

    // Using standard ZYX Euler angle rotation matrix construction
    const c1 = Math.cos(xRad),
      s1 = Math.sin(xRad); // X rotation
    const c2 = Math.cos(yRad),
      s2 = Math.sin(yRad); // Y rotation
    const c3 = Math.cos(zRad),
      s3 = Math.sin(zRad); // Z rotation

    // Matrix elements for ZYX order
    const r11 = c2 * c3;
    const r12 = c3 * s1 * s2 - c1 * s3;
    const r13 = c1 * c3 * s2 + s1 * s3;

    const r21 = c2 * s3;
    const r22 = c1 * c3 + s1 * s2 * s3;
    const r23 = -c3 * s1 + c1 * s2 * s3;

    const r31 = -s2;
    const r32 = c2 * s1;
    const r33 = c1 * c2;

    // Return matrix with basis vectors as rows
    return [
      [r11, r12, r13], // New X axis
      [r21, r22, r23], // New Y axis
      [r31, r32, r33], // New Z axis
    ];
    // No need to correct this matrix usually, as it's constructed directly from angles.
  }
} // End of class GeometryUtils3D