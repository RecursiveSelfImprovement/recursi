class SquircleBezier {
  constructor() {
    this.center = [0, 0];
    this.radius = 1; // Unit radius for circle mode
    this.D = this.radius * 0.27; // Original control point ratio
    this.pathData = [];
    this.controlPoints = [];
  }

  setRadius(radius) {
    this.radius = radius;
    this.D = this.radius * 0.27; // Maintain original ratio
  }

  rotatePoint(pt, angle) {
    const [x, y] = pt;
    const cosA = Math.cos(angle),
      sinA = Math.sin(angle);
    return [x * cosA - y * sinA, x * sinA + y * cosA];
  }

  computeSegments(t, scale) {
    const R = this.radius * scale; // Final radius (scale applied)
    const D = this.D * scale; // Scale control points
    // Interpolate between square and circle endpoints
    const p4Val = R * (1 - t + t / Math.SQRT2);

    // First quadrant segment points
    const P1 = [0, R]; // Start at top (circle mode)
    const P2 = [D, R]; // First control point
    const P3 = [p4Val - t * (D / Math.SQRT2), p4Val + t * (D / Math.SQRT2)];
    const P4 = [p4Val, p4Val]; // Endpoint (square/circle interpolation)

    const segmentA = [P1, P2, P3, P4];
    // Mirrored segment for symmetric quadrant
    const Q1 = [P4[1], P4[0]];
    const Q2 = [P3[1], P3[0]];
    const Q3 = [P2[1], P2[0]];
    const Q4 = [P1[1], P1[0]];
    const segmentB = [Q1, Q2, Q3, Q4];

    // Generate all 8 segments via rotation
    const segments = [];
    const rotations = [0, -Math.PI / 2, -Math.PI, (-3 * Math.PI) / 2];
    for (let i = 0; i < 4; i++) {
      const angle = rotations[i];
      const rotateAndTranslate = (pt) => [
        this.rotatePoint(pt, angle)[0] + this.center[0],
        this.rotatePoint(pt, angle)[1] + this.center[1],
      ];

      segments.push(
        segmentA.map(rotateAndTranslate),
        segmentB.map(rotateAndTranslate)
      );
    }
    return segments;
  }

  getPaths(t, combine, scale) {
    const segments = this.computeSegments(t, scale);
    this.pathData = [];

    if (combine) {
      let d = `M ${segments[0][0][0]} ${segments[0][0][1]}`;
      segments.forEach((seg) => {
        d += ` C ${seg[1][0]} ${seg[1][1]}, ${seg[2][0]} ${seg[2][1]}, ${seg[3][0]} ${seg[3][1]}`;
      });
      this.pathData = [`${d} Z`];
    } else {
      this.pathData = segments.map(
        (seg) =>
          `M ${seg[0][0]} ${seg[0][1]} C ${seg[1][0]} ${seg[1][1]}, ${seg[2][0]} ${seg[2][1]}, ${seg[3][0]} ${seg[3][1]}`
      );
    }

    return this.pathData;
  }

  getControlPoints(t, scale) {
    const segments = this.computeSegments(t, scale);
    const allPoints = [];
    allPoints.push(segments[0][0]);
    for (let seg of segments) {
      allPoints.push(seg[1], seg[2], seg[3]);
    }
    const uniquePoints = [];
    const seen = new Set();
    for (let pt of allPoints) {
      let key = `${pt[0].toFixed(3)},${pt[1].toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePoints.push(pt);
      }
    }
    const controlLines = [];
    for (let seg of segments) {
      controlLines.push({
        start: seg[0],
        end: seg[1],
      });
      controlLines.push({
        start: seg[2],
        end: seg[3],
      });
    }
    return { points: uniquePoints, lines: controlLines };
  }
}