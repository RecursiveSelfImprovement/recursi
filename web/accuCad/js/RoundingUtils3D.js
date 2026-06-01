class RoundingUtils3D {
  static getRoundingData(v1, v2, v3) {
    const p1 = v1.point;
    const p2 = v2.point;
    const p3 = v3.point;
    const radius = v2.radius;

    if (radius < 0.00000001) return null;

    const uv1 = GeometryUtils3D.makeUnitVector(p1, p2);
    const uv2 = GeometryUtils3D.makeUnitVector(p3, p2);

    if (!uv1 || !uv2) return null;

    const bisector = [
      (uv1[0] + uv2[0]) / 2,
      (uv1[1] + uv2[1]) / 2,
      (uv1[2] + uv2[2]) / 2,
    ];

    const bisectorMagnitude = GeometryUtils3D.getMagnitude(bisector);
    if (bisectorMagnitude === 0) return null;

    const normalizedBisector = [
      bisector[0] / bisectorMagnitude,
      bisector[1] / bisectorMagnitude,
      bisector[2] / bisectorMagnitude,
    ];

    const angleBetween = Math.acos(GeometryUtils3D.dotProduct(uv1, uv2));
    if (Math.sin(angleBetween / 2) === 0) return null;

    const distance = radius / Math.sin(angleBetween / 2);

    const circleCenter = [
      p2[0] + normalizedBisector[0] * distance,
      p2[1] + normalizedBisector[1] * distance,
      p2[2] + normalizedBisector[2] * distance,
    ];

    const circleToVertex = [
      circleCenter[0] - p2[0],
      circleCenter[1] - p2[1],
      circleCenter[2] - p2[2],
    ];

    const dot1 = GeometryUtils3D.dotProduct(circleToVertex, uv1);
    const dot2 = GeometryUtils3D.dotProduct(circleToVertex, uv2);

    const tangentPoint1 = [
      p2[0] + uv1[0] * dot1,
      p2[1] + uv1[1] * dot1,
      p2[2] + uv1[2] * dot1,
    ];

    const tangentPoint2 = [
      p2[0] + uv2[0] * dot2,
      p2[1] + uv2[1] * dot2,
      p2[2] + uv2[2] * dot2,
    ];

    if (
      !this.isPointOnLineSegment3D(p1, p2, tangentPoint1) ||
      !this.isPointOnLineSegment3D(p2, p3, tangentPoint2)
    ) {
      return null;
    }

    const cross = GeometryUtils3D.crossProduct(uv1, uv2);
    const sweepFlag = GeometryUtils3D.dotProduct(cross, normalizedBisector) > 0 ? 0 : 1;

    return {
      tangentPoint1: tangentPoint1,
      tangentPoint2: tangentPoint2,
      sweepFlag: sweepFlag,
      circleCenter: circleCenter,
      radius: radius,
    };
  }

  static isPointOnLineSegment3D(p1, p2, p) {
    const v = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    const w = [p[0] - p1[0], p[1] - p1[1], p[2] - p1[2]];
    const cross = GeometryUtils3D.crossProduct(v, w);
    const crossMagnitude = GeometryUtils3D.getMagnitude(cross);
    if (crossMagnitude > 0.00001) return false;
    const dotProduct = GeometryUtils3D.dotProduct(w, v);
    if (dotProduct < 0) return false;
    const squaredLengthV = GeometryUtils3D.dotProduct(v, v);
    if (dotProduct > squaredLengthV) return false;
    return true;
  }

  static createArcPoints(p1, p2, center, radius, sweepFlag, segments = 32) {
    const toP1 = [p1[0] - center[0], p1[1] - center[1], p1[2] - center[2]];
    const uMag = GeometryUtils3D.getMagnitude(toP1);
    const uNorm = [toP1[0] / uMag, toP1[1] / uMag, toP1[2] / uMag];
    const toP2 = [p2[0] - center[0], p2[1] - center[1], p2[2] - center[2]];
    const normal = GeometryUtils3D.crossProduct(toP1, toP2);
    const normalMag = GeometryUtils3D.getMagnitude(normal);

    if (normalMag < 0.00001) {
      return [p1, p2];
    }

    const normalNorm = [
      normal[0] / normalMag,
      normal[1] / normalMag,
      normal[2] / normalMag,
    ];
    const v = GeometryUtils3D.crossProduct(normalNorm, uNorm);

    const startAngle = Math.atan2(
      GeometryUtils3D.dotProduct(toP1, v),
      GeometryUtils3D.dotProduct(toP1, uNorm)
    );
    const endAngle = Math.atan2(
      GeometryUtils3D.dotProduct(toP2, v),
      GeometryUtils3D.dotProduct(toP2, uNorm)
    );

    let deltaAngle = endAngle - startAngle;
    deltaAngle = ((deltaAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
    if (deltaAngle === -Math.PI) deltaAngle = Math.PI;

    const clockwise = deltaAngle < 0;
    let finalEndAngle = endAngle;
    if (Math.abs(deltaAngle) > Math.PI) {
      finalEndAngle =
        startAngle +
        (clockwise ? deltaAngle + 2 * Math.PI : deltaAngle - 2 * Math.PI);
    }

    const arcCurve = new window.THREE.ArcCurve(
      0,
      0,
      radius,
      startAngle,
      finalEndAngle,
      clockwise
    );

    const points2D = arcCurve.getPoints(segments);

    const points3D = points2D.map(function (pt) {
      const x = center[0] + uNorm[0] * pt.x + v[0] * pt.y;
      const y = center[1] + uNorm[1] * pt.x + v[1] * pt.y;
      const z = center[2] + uNorm[2] * pt.x + v[2] * pt.y;
      return [x, y, z];
    });

    return points3D;
  }
}