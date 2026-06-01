class Geometry {
  static distanceSq(p1, p2) {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
  }

  static distance(p1, p2) {
    return Math.sqrt(this.distanceSq(p1, p2));
  }

  static normalize(v) {
    const len = Math.hypot(v.x, v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  }

  static distanceToSegment(p, a, b) {
    const l2 = this.distanceSq(a, b);
    if (l2 === 0) return this.distance(p, a);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    return this.distance(p, proj);
  }

  static isNearArc(p, points, threshold) {
    if (points.length !== 3) return false;

    // Check if points form a valid arc
    const props = this.getArcProps(points[0], points[1], points[2]);

    if (!props) {
      // "PolyArc can actually do lines if you simply don't adjust the bend radius"
      // If props is null, the points are collinear (infinite radius).
      // We treat this as a line segment path: p1 -> p2 -> p3
      const d1 = this.distanceToSegment(p, points[0], points[1]);
      if (d1 < threshold) return true;
      const d2 = this.distanceToSegment(p, points[1], points[2]);
      return d2 < threshold;
    }

    // Standard Arc Distance Logic
    const d = this.distance(p, { x: props.cx, y: props.cy });
    if (Math.abs(d - props.r) > threshold) return false;

    const angle = Math.atan2(p.y - props.cy, p.x - props.cx);
    const norm = (a) => (a + Math.PI * 2) % (Math.PI * 2);
    const t = norm(angle);
    const t1 = norm(props.startAngle);
    const t2 = norm(props.endAngle);

    if (props.sweep === 1) {
      if (t1 < t2) return t > t1 && t < t2;
      else return t > t1 || t < t2;
    } else {
      if (t1 > t2) return t < t1 && t > t2;
      else return t < t1 || t > t2;
    }
  }

  static getArcProps(p1, p2, p3) {
    const val = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y);
    if (Math.abs(val) < 1e-4) return null;

    const m1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const m2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

    let k1 = (p2.y - p1.y) / (p2.x - p1.x);
    let k2 = (p3.y - p2.y) / (p3.x - p2.x);
    let cx, cy;

    if (!isFinite(k1)) {
      const m2k = -1 / k2;
      cx = (m1.y - m2.y + m2k * m2.x) / m2k;
      cy = m1.y;
    } else if (!isFinite(k2)) {
      const m1k = -1 / k1;
      cx = (m2.y - m1.y + m1k * m1.x) / m1k;
      cy = m2.y;
    } else {
      const m1k = -1 / k1;
      const m2k = -1 / k2;
      if (Math.abs(m1k - m2k) < 1e-5) return null;
      cx = (m1k * m1.x - m2k * m2.x + m2.y - m1.y) / (m1k - m2k);
      cy = m1k * (cx - m1.x) + m1.y;
    }

    const r = Math.sqrt(Math.pow(p1.x - cx, 2) + Math.pow(p1.y - cy, 2));
    const ang1 = Math.atan2(p1.y - cy, p1.x - cx);
    const ang2 = Math.atan2(p2.y - cy, p2.x - cx);
    // ang3 is calculated to determine sweep
    const ang3 = Math.atan2(p3.y - cy, p3.x - cx);

    const norm = (a) => (a + Math.PI * 2) % (Math.PI * 2);
    const t1 = norm(ang1);
    const t2 = norm(ang2);
    const t3 = norm(ang3);

    let sweepFlag = 0;
    if (t1 < t2) {
      if (t3 > t1 && t3 < t2) sweepFlag = 1;
    } else {
      if (t3 > t1 || t3 < t2) sweepFlag = 1;
    }

    return { cx, cy, r, startAngle: ang1, endAngle: ang2, sweep: sweepFlag };
  }

  static calculateArcPath(p1, p2, p3) {
    const props = this.getArcProps(p1, p2, p3);
    // If collinear, draw lines
    if (!props) return `M ${p1.x} ${p1.y} L ${p3.x} ${p3.y} L ${p2.x} ${p2.y}`;

    let diff =
      props.sweep === 1
        ? (props.endAngle - props.startAngle + Math.PI * 2) % (Math.PI * 2)
        : (props.startAngle - props.endAngle + Math.PI * 2) % (Math.PI * 2);

    const largeArcFlag = diff > Math.PI ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${props.r} ${props.r} 0 ${largeArcFlag} ${props.sweep} ${p2.x} ${p2.y}`;
  }

  static getArcMidpoint(p1, p2, p3) {
    const props = this.getArcProps(p1, p2, p3);
    if (!props) return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    const norm = (a) => (a + Math.PI * 2) % (Math.PI * 2);
    const t1 = norm(props.startAngle);
    const t2 = norm(props.endAngle);

    let midAngle;
    if (props.sweep === 1) {
      let diff = (t2 - t1 + Math.PI * 2) % (Math.PI * 2);
      midAngle = t1 + diff / 2;
    } else {
      let diff = (t1 - t2 + Math.PI * 2) % (Math.PI * 2);
      midAngle = t1 - diff / 2;
    }

    return {
      x: props.cx + props.r * Math.cos(midAngle),
      y: props.cy + props.r * Math.sin(midAngle),
    };
  }

  static refreshPathGeometry(pathObj) {
    if (pathObj.type === 'line') {
      const ptsStr = pathObj.points.map((p) => `${p.x},${p.y}`).join(' ');
      pathObj.element.setAttribute('points', ptsStr);
    } else if (pathObj.type === 'arc' && pathObj.points.length === 3) {
      const d = this.calculateArcPath(
        pathObj.points[0],
        pathObj.points[1],
        pathObj.points[2]
      );
      pathObj.element.setAttribute('d', d);
    }
  }

  static getArcCommand(p1, p2, angleDeg) {
    if (Math.abs(angleDeg) < 1) return `L ${p2.x} ${p2.y}`;
    const d = this.distance(p1, p2);
    if (d < 0.1) return `L ${p2.x} ${p2.y}`;

    const angleRad = (angleDeg * Math.PI) / 180;
    const r = Math.abs(d / (2 * Math.sin(angleRad / 2)));
    const largeArc = Math.abs(angleDeg) > 180 ? 1 : 0;
    const sweep = angleDeg > 0 ? 1 : 0;

    return `A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} ${sweep} ${p2.x} ${
      p2.y
    }`;
  }

  static getArcGeo(p1, p2, angleDeg) {
    if (Math.abs(angleDeg) < 0.1) return { type: 'line' };

    const d = this.distance(p1, p2);
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = Math.abs(d / (2 * Math.sin(angleRad / 2)));

    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const distToCenter = Math.sqrt(Math.max(0, r * r - (d / 2) ** 2));

    // Normal vector
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;

    // Angle sign determines side
    const sign = angleDeg > 0 ? 1 : -1;
    const cx = mx + nx * distToCenter * sign;
    const cy = my + ny * distToCenter * sign;
    const sweep = angleDeg > 0 ? 1 : 0;

    return { type: 'arc', cx, cy, r, sweep, sign };
  }

  static solveCorner(p1, p2, p3, angle1, angle2, r_corner) {
    if (r_corner <= 0) return null;

    const g1 = this.getArcGeo(p1, p2, angle1);
    const g2 = this.getArcGeo(p2, p3, angle2);

    const dot = (a, b) => a.x * b.x + a.y * b.y;
    const cross = (a, b) => a.x * b.y - a.y * b.x;
    const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
    const norm = (v) => {
      const l = Math.hypot(v.x, v.y);
      return l > 0 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 };
    };
    const len = (v) => Math.hypot(v.x, v.y);

    // Tangents at p2
    let t1, t2;

    if (g1.type === 'line') {
      t1 = norm(sub(p2, p1));
    } else {
      const v = sub(p2, { x: g1.cx, y: g1.cy });
      t1 =
        g1.sweep === 1 ? norm({ x: v.y, y: -v.x }) : norm({ x: -v.y, y: v.x });
    }

    if (g2.type === 'line') {
      t2 = norm(sub(p3, p2));
    } else {
      const v = sub(p2, { x: g2.cx, y: g2.cy });
      t2 =
        g2.sweep === 1 ? norm({ x: v.y, y: -v.x }) : norm({ x: -v.y, y: v.x });
    }

    // Ensure tangent directions follow actual segment flow
    if (dot(t1, sub(p2, p1)) < 0) t1 = { x: -t1.x, y: -t1.y };
    if (dot(t2, sub(p3, p2)) < 0) t2 = { x: -t2.x, y: -t2.y };

    const turn = cross(t1, t2);
    if (Math.abs(turn) < 1e-6) return null;
    const isRightTurn = turn > 0;

    const lineOffset = (a, b, right) => {
      const d = norm(sub(b, a));
      const n = right ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
      return {
        type: 'line',
        p: { x: a.x + n.x * r_corner, y: a.y + n.y * r_corner },
        dir: d,
      };
    };

    const arcOffset = (g, right) => {
      const r = right
        ? g.sweep === 1
          ? g.r - r_corner
          : g.r + r_corner
        : g.sweep === 1
        ? g.r + r_corner
        : g.r - r_corner;
      return { type: 'circle', cx: g.cx, cy: g.cy, r };
    };

    const intersect = (A, B) => {
      if (A.type === 'line' && B.type === 'line') {
        const det = cross(A.dir, B.dir);
        if (Math.abs(det) < 1e-6) return null;
        const d = sub(B.p, A.p);
        const t = cross(d, B.dir) / det;
        return { x: A.p.x + A.dir.x * t, y: A.p.y + A.dir.y * t };
      }

      if (A.type === 'circle' && B.type === 'circle') {
        const dx = B.cx - A.cx;
        const dy = B.cy - A.cy;
        const d = Math.hypot(dx, dy);
        if (d === 0) return null;

        const a = (A.r * A.r - B.r * B.r + d * d) / (2 * d);
        const h2 = A.r * A.r - a * a;
        if (h2 < 0) return null;

        const h = Math.sqrt(h2);
        const xm = A.cx + (a * dx) / d;
        const ym = A.cy + (a * dy) / d;

        const rx = -dy * (h / d);
        const ry = dx * (h / d);

        return [
          { x: xm + rx, y: ym + ry },
          { x: xm - rx, y: ym - ry },
        ];
      }

      const line = A.type === 'line' ? A : B;
      const circ = A.type === 'circle' ? A : B;

      const f = sub({ x: circ.cx, y: circ.cy }, line.p);
      const t = dot(f, line.dir);
      const q = {
        x: line.p.x + line.dir.x * t,
        y: line.p.y + line.dir.y * t,
      };

      const d2 = this.distanceSq(q, { x: circ.cx, y: circ.cy });
      if (d2 > circ.r * circ.r) return null;

      const h = Math.sqrt(circ.r * circ.r - d2);
      return [
        { x: q.x + line.dir.x * h, y: q.y + line.dir.y * h },
        { x: q.x - line.dir.x * h, y: q.y - line.dir.y * h },
      ];
    };

    const project = (g, c, a, b) => {
      if (g.type === 'line') {
        const ab = sub(b, a);
        const t = dot(sub(c, a), ab) / dot(ab, ab);
        return { x: a.x + ab.x * t, y: a.y + ab.y * t };
      }
      const v = sub(c, { x: g.cx, y: g.cy });
      const l = Math.hypot(v.x, v.y);
      return { x: g.cx + (v.x / l) * g.r, y: g.cy + (v.y / l) * g.r };
    };

    const sideOfLine = (a, b, p) => cross(sub(b, a), sub(p, a));

    const arcSideOK = (g, tangentAtVertex, vertex, otherVertex, fc) => {
      const vC = { x: g.cx - vertex.x, y: g.cy - vertex.y };
      const vF = { x: fc.x - vertex.x, y: fc.y - vertex.y };
      const vO = { x: otherVertex.x - vertex.x, y: otherVertex.y - vertex.y };

      const dCF = Math.hypot(fc.x - g.cx, fc.y - g.cy);
      const extTarget = g.r + r_corner;
      const intTarget = Math.abs(g.r - r_corner);
      const isExternal = Math.abs(dCF - extTarget) <= Math.abs(dCF - intTarget);

      const sC = cross(tangentAtVertex, vC);
      const sF = cross(tangentAtVertex, vF);

      if (Math.abs(sC) > 1e-9 && Math.abs(sF) > 1e-9) {
        if (isExternal) {
          if (sC * sF > 0) return false;
        } else {
          if (sC * sF < 0) return false;
        }
      }

      const dO = dot(vC, vO);
      const dF = dot(vC, vF);

      const lc = len(vC);
      const lo = len(vO);
      const lf = len(vF);

      const eps = 1e-6;
      const tolO = eps * lc * lo;
      const tolF = eps * lc * lf;

      if (Math.abs(dO) <= tolO || Math.abs(dF) <= tolF) return true;

      return dO * dF > 0;
    };

    const candidates = [];

    for (const lr of [true, false]) {
      for (const ar of [true, false]) {
        const L1 =
          g1.type === 'line' ? lineOffset(p1, p2, lr) : arcOffset(g1, ar);
        const L2 =
          g2.type === 'line' ? lineOffset(p2, p3, lr) : arcOffset(g2, ar);

        const sol = intersect(L1, L2);
        if (!sol) continue;

        const sols = Array.isArray(sol) ? sol : [sol];

        for (const c of sols) {
          const s = project(g1, c, p1, p2);
          const e = project(g2, c, p2, p3);

          if (g1.type === 'line') {
            if (sideOfLine(p1, p2, p3) * sideOfLine(p1, p2, c) < 0) continue;
          } else {
            if (!arcSideOK(g1, t1, p2, p3, c)) continue;
          }

          if (g2.type === 'line') {
            if (sideOfLine(p2, p3, p1) * sideOfLine(p2, p3, c) < 0) continue;
          } else {
            if (!arcSideOK(g2, t2, p2, p1, c)) continue;
          }

          candidates.push({
            center: c,
            startPt: s,
            endPt: e,
            score: this.distanceSq(s, p2) + this.distanceSq(e, p2),
          });
        }
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0];

    return {
      center: best.center,
      startPt: best.startPt,
      endPt: best.endPt,
      radius: r_corner,
      sweep: isRightTurn ? 1 : 0,
    };
  }

  static isNearPolyline(p, points, threshold) {
    for (let i = 0; i < points.length - 1; i++) {
      if (this.distanceToSegment(p, points[i], points[i + 1]) < threshold) {
        return true;
      }
    }
    return false;
  }

}

