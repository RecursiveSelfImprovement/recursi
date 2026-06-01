class GeometryUtils {
  static makeVector(p1, p2) {
    return [p1[0] - p2[0], p1[1] - p2[1], (p1[2] || 0) - (p2[2] || 0)];
  }

  static getMagnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + (v[2] || 0) * (v[2] || 0));
  }

  static length(v) {
    return this.getMagnitude(v);
  }

  static normalize(v) {
    const mag = GeometryUtils.getMagnitude(v);
    if (mag < 1e-10) return [1, 0, 0]; // Default to avoid division by zero
    return [v[0] / mag, v[1] / mag, (v[2] || 0) / mag];
  }

  static makeUnitVector(p1, p2) {
    const v = this.makeVector(p1, p2);
    return this.normalize(v);
  }

  static dotProduct(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + (v1[2] || 0) * (v2[2] || 0);
  }

  static addVectors(v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1], (v1[2] || 0) + (v2[2] || 0)];
  }

  static getDistance(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = (p2[2] || 0) - (p1[2] || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  static projectPoint(p, uv, d) {
    return [p[0] + uv[0] * d, p[1] + uv[1] * d, (p[2] || 0) + (uv[2] || 0) * d];
  }

  static projectPointOntoLineSegment(p, lineStart, lineEnd) {
    const lineVec = this.makeVector(lineEnd, lineStart);
    const pointVec = this.makeVector(p, lineStart);
    const lineLenSq = lineVec[0] * lineVec[0] + lineVec[1] * lineVec[1];

    if (lineLenSq < 1e-10) {
      return { point: lineStart.slice(), t: 0 };
    }

    const t = this.dotProduct(pointVec, lineVec) / lineLenSq;
    const tClamped = Math.max(0, Math.min(1, t));

    const projectedPoint = [
      lineStart[0] + lineVec[0] * tClamped,
      lineStart[1] + lineVec[1] * tClamped,
    ];

    return { point: projectedPoint, t: tClamped };
  }

  static distanceToLineSegment(p, lineStart, lineEnd) {
    const { point: projectedPoint } = this.projectPointOntoLineSegment(
      p,
      lineStart,
      lineEnd
    );
    return this.getDistance(p, projectedPoint);
  }

  /**
   * Rotates a 2D vector by a given angle.
   * @param {number[]} v - The 2D vector [x, y].
   * @param {number} angleRad - The angle of rotation in radians.
   * @returns {number[]} The rotated 2D vector.
   */
  static rotateVector(v, angleRad) {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const [x, y] = v;
    return [x * cos - y * sin, x * sin + y * cos];
  }

}

