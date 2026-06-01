class SupportAnalyzer {
  constructor(opts = {}) {
    this.requiredRatio = opts.requiredRatio ?? 0.25;
    this.requireTwoCols = opts.requireTwoCols ?? true;
    this.requireTwoRows = opts.requireTwoRows ?? true;
    this.useCOMInsideHull = opts.useCOMInsideHull ?? true;
  }
  evaluateSupport(params) {
    // params: { width, length, supportedCoords: [[x,z],...], anchorX, anchorZ }
    const reasons = [];
    const totalStuds = params.width * params.length;
    const ratio = totalStuds ? params.supportedCoords.length / totalStuds : 0;

    if (ratio < this.requiredRatio) reasons.push('ratio');

    if (this.requireTwoCols) {
      const colSet = new Set(
        params.supportedCoords.map((c) => c[0] - params.anchorX)
      );
      // A brick can't be supported by more columns than it actually has.
      // FIX: The check now applies to all bricks wider than 1 stud, including 2x1.
      if (params.width > 1 && colSet.size < 2) reasons.push('cols');
    }

    if (this.requireTwoRows) {
      const rowSet = new Set(
        params.supportedCoords.map((c) => c[1] - params.anchorZ)
      );
      // A brick can't be supported by more rows than it actually has.
      // FIX: The check now applies to all bricks longer than 1 stud, including 1x2.
      if (params.length > 1 && rowSet.size < 2) reasons.push('rows');
    }

    if (this.useCOMInsideHull) {
      const com = [
        params.anchorX + params.width / 2,
        params.anchorZ + params.length / 2,
      ];
      const hull = this._convexHull(params.supportedCoords);
      if (hull.length >= 3) {
        if (!this._pointInPolygon([com[0], com[1]], hull))
          reasons.push('comOutside');
      }
    }

    const ok = reasons.length === 0;
    return { ok, ratio, reasons };
  }
  _pointInPolygon(point, polygon) {
    // polygon: [[x,z],...]
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1];
      const xj = polygon[j][0],
        yj = polygon[j][1];
      const intersect =
        yi > point[1] !== yj > point[1] &&
        point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
  _convexHull(points) {
    // Graham scan (x asc, then y asc)
    if (points.length <= 3) return points.slice();

    const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) =>
      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

    const lower = [];
    for (const p of pts) {
      while (
        lower.length >= 2 &&
        cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
      ) {
        lower.pop();
      }
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (
        upper.length >= 2 &&
        cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
      ) {
        upper.pop();
      }
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }

} //----- end class SupportAnalyzer

