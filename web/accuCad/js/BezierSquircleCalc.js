class BezierSquircleCalc {
  constructor(center = [0, 0], size = 1, outlineThickness = 2) {
    this.center = center;
    this.size = size;
    this.D = this.size * 0.27;
    this.outlineThickness = outlineThickness;
  }

  setCenter(center) {
    this.center = center;
  }

  setSize(size) {
    this.size = size;
    this.D = this.size * 0.27;
  }

  rotatePoint(point, angle) {
    const [x, y] = point;
    const cosA = Math.cos(angle),
      sinA = Math.sin(angle);
    return [x * cosA - y * sinA, x * sinA + y * cosA];
  }

  computeSegments(t) {
    const R = this.size,
      D = this.D;
    const p4Val = R * (1 - t + t / Math.SQRT2);
    const P1 = [0, R];
    const P2 = [D, R];
    const P3 = [p4Val - t * (D / Math.SQRT2), p4Val + t * (D / Math.SQRT2)];
    const P4 = [p4Val, p4Val];
    const segmentA = [P1, P2, P3, P4];
    const Q1 = [P4[1], P4[0]];
    const Q2 = [P3[1], P3[0]];
    const Q3 = [P2[1], P2[0]];
    const Q4 = [P1[1], P1[0]];
    const segmentB = [Q1, Q2, Q3, Q4];
    const segments = [];
    const rotations = [0, -Math.PI / 2, -Math.PI, (-3 * Math.PI) / 2];
    for (let i = 0; i < 4; i++) {
      const angle = rotations[i];
      const segA_rot = segmentA.map((pt) => {
        const rPt = this.rotatePoint(pt, angle);
        return [rPt[0] + this.center[0], rPt[1] + this.center[1]];
      });
      const segB_rot = segmentB.map((pt) => {
        const rPt = this.rotatePoint(pt, angle);
        return [rPt[0] + this.center[0], rPt[1] + this.center[1]];
      });
      segments.push(segA_rot, segB_rot);
    }
    return segments;
  }

  getPathData(t) {
    const segments = this.computeSegments(t);
    let d = `M ${segments[0][0][0]} ${segments[0][0][1]}`;
    for (const seg of segments) {
      d += ` C ${seg[1][0]} ${seg[1][1]}, ${seg[2][0]} ${seg[2][1]}, ${seg[3][0]} ${seg[3][1]}`;
    }
    return this.outlineThickness > 0 ? d : d + ' Z';
  }

  getUniquePoints(t) {
    if (this.outlineThickness <= 0) return [];
    const segments = this.computeSegments(t);
    const allPoints = [];
    allPoints.push(segments[0][0]);
    for (const seg of segments) {
      allPoints.push(seg[1], seg[2], seg[3]);
    }
    const uniquePoints = [];
    const seen = new Set();
    for (const pt of allPoints) {
      const key = `${pt[0].toFixed(3)},${pt[1].toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePoints.push(pt);
      }
    }
    return uniquePoints;
  }

}

