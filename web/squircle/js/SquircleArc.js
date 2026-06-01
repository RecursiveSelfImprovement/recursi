class SquircleArc {
  constructor() {
    this.pathData = [];
    this.arcParams = [];
  }

  interpolate(start, end, t) {
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
  }

  getArcParameters() {
    return this.arcParams;
  }

  createArcPath(p1, p2, p3) {
    function computeCircleCenter(A, B, C) {
      const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
      if (!isFinite(D) || Math.abs(D) < 1e-9) return null;

      const A2 = A.x * A.x + A.y * A.y;
      const B2 = B.x * B.x + B.y * B.y;
      const C2 = C.x * C.x + C.y * C.y;

      const Ux = (A2 * (B.y - C.y) + B2 * (C.y - A.y) + C2 * (A.y - B.y)) / D;
      const Uy = (A2 * (C.x - B.x) + B2 * (A.x - C.x) + C2 * (B.x - A.x)) / D;
      if (!isFinite(Ux) || !isFinite(Uy)) return null;
      return { x: Ux, y: Uy };
    }

    const center = computeCircleCenter(p1, p2, p3);
    if (!center) {
      return { path: `M ${p1.x} ${p1.y} L ${p3.x} ${p3.y}`, params: null };
    }

    const r = Math.hypot(center.x - p1.x, center.y - p1.y);
    if (!isFinite(r) || r < 1e-9) {
      return { path: `M ${p1.x} ${p1.y} L ${p3.x} ${p3.y}`, params: null };
    }

    // 🔒 always take the minor arc between the endpoints
    const { largeArcFlag, sweepFlag } = this.arcFlagsCWSmall(p1, p3, center);

    const params = {
      center: { x: center.x, y: center.y },
      radius: r,
      startAngle: Math.atan2(p1.y - center.y, p1.x - center.x),
      endAngle: Math.atan2(p3.y - center.y, p3.x - center.x),
      sweepFlag,
      largeArcFlag,
    };

    const path = `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${p3.x} ${p3.y}`;
    return { path, params };
  }

  generateSquare(scale) {
    const size = 1 * scale;
    const lines = [
      { x1: -size, y1: -size, x2: size, y2: -size },
      { x1: size, y1: -size, x2: size, y2: size },
      { x1: size, y1: size, x2: -size, y2: size },
      { x1: -size, y1: size, x2: -size, y2: -size },
    ];
    this.pathData = lines.map(
      (line) => `M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`
    );
    this.arcParams = lines.map(() => null);
    return this.pathData;
  }

  generateCombinedSquare(scale) {
    const size = 1 * scale;
    const lines = [
      { x1: -size, y1: -size, x2: size, y2: -size },
      { x1: size, y1: -size, x2: size, y2: size },
      { x1: size, y1: size, x2: -size, y2: size },
      { x1: -size, y1: size, x2: -size, y2: -size },
    ];
    const combinedPath =
      lines
        .map(
          (line, i) =>
            `${i === 0 ? 'M' : 'L'} ${line.x1} ${line.y1} L ${line.x2} ${
              line.y2
            }`
        )
        .join(' ') + ' Z';
    this.pathData = [combinedPath];
    this.arcParams = lines.map(() => null);
    return this.pathData;
  }

  /**
   * Build the 8-arc outline. FIX: pass (P,Q,C) into arcFlagsCWSmall so it
   * doesn’t read from undefined. Also keep “small-arc” choice consistently.
   */
  generateInterpolatedShapes(t, combine, scale) {
    const radius = 1 * scale;

    // Exact circle limit (emit 8 small arcs around the origin)
    if (t > 0.99999) {
      this.pathData = [];
      this.arcParams = [];
      for (let i = 0; i < 8; i++) {
        const angle1 = (i * 45 - 22.5) * (Math.PI / 180);
        const angle2 = ((i + 1) * 45 - 22.5) * (Math.PI / 180);
        const p1 = {
          x: radius * Math.cos(angle1),
          y: radius * Math.sin(angle1),
        };
        const p3 = {
          x: radius * Math.cos(angle2),
          y: radius * Math.sin(angle2),
        };
        const center = { x: 0, y: 0 };
        const r = radius;

        // ✅ pass endpoints + center
        const { largeArcFlag, sweepFlag } = this.arcFlagsCWSmall(
          p1,
          p3,
          center
        );

        const params = {
          center,
          radius: r,
          startAngle: Math.atan2(p1.y - center.y, p1.x - center.x),
          endAngle: Math.atan2(p3.y - center.y, p3.x - center.x),
          sweepFlag,
          largeArcFlag,
        };
        const path = `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${p3.x} ${p3.y}`;
        this.pathData.push(path);
        this.arcParams.push(params);
      }
      if (combine) this.pathData = this.combinePaths();
      return this.pathData;
    }

    const s = scale;
    const squareCorners = [
      { x: s, y: -s }, // 0: NE
      { x: s, y: s }, // 1: SE
      { x: -s, y: s }, // 2: SW
      { x: -s, y: -s }, // 3: NW
    ];

    const allArcData = new Array(8);

    // Pass 1: Edge arcs at indices 0,2,4,6 (Right, Bottom, Left, Top)
    for (let i = 0; i < 8; i += 2) {
      const angle1 = (i * 45 - 22.5) * (Math.PI / 180);
      const angle2 = ((i + 1) * 45 - 22.5) * (Math.PI / 180);
      const midAngle = (angle1 + angle2) / 2;

      const circleP1 = {
        x: radius * Math.cos(angle1),
        y: radius * Math.sin(angle1),
      };
      const circleP3 = {
        x: radius * Math.cos(angle2),
        y: radius * Math.sin(angle2),
      };
      const circleP2 = {
        x: radius * Math.cos(midAngle),
        y: radius * Math.sin(midAngle),
      };

      const startCornerIdx = (i / 2 + 3 + 1) % 4;
      const endCornerIdx = (i / 2 + 1) % 4;

      const squareP1 = squareCorners[startCornerIdx];
      const squareP3 = squareCorners[endCornerIdx];
      const squareP2 = {
        x: (squareP1.x + squareP3.x) / 2,
        y: (squareP1.y + squareP3.y) / 2,
      };

      const p1 = this.interpolate(squareP1, circleP1, t);
      const p2 = this.interpolate(squareP2, circleP2, t);
      const p3 = this.interpolate(squareP3, circleP3, t);

      const arcResult = this.createArcPath(p1, p2, p3); // small-arc flags handled inside
      allArcData[i] = { p1, p3, arcResult };
    }

    // Pass 2: Corner arcs (1,3,5,7) via intersection of edge-radius lines
    for (let i = 1; i < 8; i += 2) {
      const prevEdge = allArcData[i - 1];
      const nextEdge = allArcData[(i + 1) % 8];

      const p1 = prevEdge.p3;
      const p3 = nextEdge.p1;

      if (!prevEdge.arcResult?.params || !nextEdge.arcResult?.params) {
        allArcData[i] = {
          p1,
          p3,
          arcResult: {
            path: `M ${p1.x} ${p1.y} L ${p3.x} ${p3.y}`,
            params: null,
          },
        };
        continue;
      }

      const center_prev = prevEdge.arcResult.params.center;
      const center_next = nextEdge.arcResult.params.center;

      const cornerCenter = this.lineLineIntersection(
        center_prev,
        p1,
        center_next,
        p3
      );
      if (!cornerCenter) {
        allArcData[i] = {
          p1,
          p3,
          arcResult: {
            path: `M ${p1.x} ${p1.y} L ${p3.x} ${p3.y}`,
            params: null,
          },
        };
        continue;
      }

      const r = Math.hypot(p1.x - cornerCenter.x, p1.y - cornerCenter.y);
      if (!isFinite(r) || r < 1e-9) {
        allArcData[i] = {
          p1,
          p3,
          arcResult: {
            path: `M ${p1.x} ${p1.y} L ${p3.x} ${p3.y}`,
            params: null,
          },
        };
        continue;
      }

      // ✅ pass endpoints + corner center
      const { largeArcFlag, sweepFlag } = this.arcFlagsCWSmall(
        p1,
        p3,
        cornerCenter
      );

      const params = {
        center: cornerCenter,
        radius: r,
        startAngle: Math.atan2(p1.y - cornerCenter.y, p1.x - cornerCenter.x),
        endAngle: Math.atan2(p3.y - cornerCenter.y, p3.x - cornerCenter.x),
        sweepFlag,
        largeArcFlag,
      };
      const path = `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${p3.x} ${p3.y}`;
      allArcData[i] = { p1, p3, arcResult: { path, params } };
    }

    this.pathData = allArcData.map((d) =>
      d.arcResult ? d.arcResult.path : ''
    );
    this.arcParams = allArcData.map((d) =>
      d.arcResult ? d.arcResult.params : null
    );

    if (combine) this.pathData = this.combinePaths();
    return this.pathData;
  }

  getPaths(t, combine, scale, blend) {
    this.pathData = [];
    this.arcParams = [];
    if (t === 0) {
      return combine
        ? this.generateCombinedSquare(scale)
        : this.generateSquare(scale);
    }
    return this.generateInterpolatedShapes(t, combine, scale);
  }

  getArcSegments(t, scale, blend) {
    if (t === 0) {
      const size = 1 * scale;
      return [
        { type: 'line', start: [-size, -size], end: [size, -size] },
        { type: 'line', start: [size, -size], end: [size, size] },
        { type: 'line', start: [size, size], end: [-size, size] },
        { type: 'line', start: [-size, size], end: [-size, -size] },
      ];
    }
    this.generateInterpolatedShapes(t, false, scale);
    const segs = [];
    for (const p of this.arcParams) {
      if (!p) continue;
      segs.push({
        type: 'arc',
        center: [p.center.x, p.center.y],
        radius: p.radius,
        startAngle: p.startAngle,
        endAngle: p.endAngle,
        clockwise: p.sweepFlag === 0, // CW
      });
    }
    return segs;
  }

  lineLineIntersection(p1, p2, p3, p4) {
    const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (!isFinite(den) || Math.abs(den) < 1e-9) return null;
    const t =
      ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / den;
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  }

  arcFlags(P, Q, C, wantCW = true) {
    const a0 = Math.atan2(P.y - C.y, P.x - C.x);
    const a1 = Math.atan2(Q.y - C.y, Q.x - C.x);

    // CCW delta in [0, 2π)
    let d = a1 - a0;
    d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // If we want clockwise, take the complementary sweep.
    if (wantCW) d = 2 * Math.PI - d;

    const largeArcFlag = d > Math.PI ? 1 : 0;
    const sweepFlag = wantCW ? 0 : 1; // SVG: 0=CW, 1=CCW
    return { largeArcFlag, sweepFlag };
  }

  combinePaths() {
    if (!this.pathData || this.pathData.length === 0) return [''];
    const first = this.pathData[0];
    const mxy = first.match(/^M\s*([-\d.]+)\s+([-\d.]+)/);
    let d = mxy ? `M ${mxy[1]} ${mxy[2]}` : '';
    for (let i = 0; i < this.pathData.length; i++) {
      const seg = this.pathData[i];
      if (!seg) continue;
      const tail = seg.replace(/^M\s*[-\d.]+\s+[-\d.]+\s*/, '');
      d += ' ' + tail;
    }
    return [d.trim() + ' Z'];
  }

  arcFlagsCWSmall(P, Q, C) {
    const a0 = Math.atan2(P.y - C.y, P.x - C.x);
    const a1 = Math.atan2(Q.y - C.y, Q.x - C.x);

    // CCW delta in [0, 2π)
    let d = a1 - a0;
    d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // Choose the **minor** arc:
    // if CCW delta <= π, use CCW small arc; otherwise use CW small arc.
    if (d <= Math.PI) {
      return { largeArcFlag: 0, sweepFlag: 1 }; // small, CCW
    } else {
      return { largeArcFlag: 0, sweepFlag: 0 }; // small, CW
    }
  }
}