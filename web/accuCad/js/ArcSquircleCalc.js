class ArcSquircleCalc {
  constructor(outlineThickness = 2) {
    this.pathData = [];
    this.arcParams = [];
    this.outlineThickness = outlineThickness;
  }

  interpolate(start, end, t) {
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
  }

  createAngleArcPath(p1, p2, angleDeg, cornerIndex) {
    const angleRad = (angleDeg * Math.PI) / 180;
    const radius =
      Math.hypot(p2.x - p1.x, p2.y - p1.y) / (2 * Math.sin(angleRad / 2));
    let sweepFlag;
    switch (cornerIndex) {
      case 1:
        sweepFlag = p1.x < p2.x && p1.y > p2.y ? 0 : 1;
        break;
      case 3:
        sweepFlag = p1.x < p2.x && p1.y < p2.y ? 0 : 1;
        break;
      case 5:
        sweepFlag = p1.x > p2.x && p1.y < p2.y ? 0 : 1;
        break;
      case 7:
        sweepFlag = p1.x > p2.x && p1.y > p2.y ? 0 : 1;
        break;
      default:
        sweepFlag = 0;
    }
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const offset = Math.sqrt(radius * radius - (dist / 2) * (dist / 2));
    const dirX = dy / dist;
    const dirY = -dx / dist;
    const centerX1 = midX + offset * dirX;
    const centerY1 = midY + offset * dirY;
    const centerX2 = midX - offset * dirX;
    const centerY2 = midY - offset * dirY;
    const dist1 = Math.hypot(centerX1, centerY1);
    const dist2 = Math.hypot(centerX2, centerY2);
    const centerX = dist1 < dist2 ? centerX1 : centerX2;
    const centerY = dist1 < dist2 ? centerY1 : centerY2;
    const startAngle = Math.atan2(p1.y - centerY, p1.x - centerX);
    const endAngle = Math.atan2(p2.y - centerY, p2.x - centerX);
    const params = {
      center: { x: centerX, y: centerY },
      radius: radius,
      startAngle: startAngle,
      endAngle: endAngle,
      sweepFlag: sweepFlag,
    };
    const path = `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${p2.x} ${p2.y}`;
    return { path, params };
  }

  createArcPath(p1, p2, p3) {
    function computeCircleCenter(A, B, C) {
      let D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
      if (Math.abs(D) < 1e-6) return null;
      let Ux =
        ((A.x ** 2 + A.y ** 2) * (B.y - C.y) +
          (B.x ** 2 + B.y ** 2) * (C.y - A.y) +
          (C.x ** 2 + C.y ** 2) * (A.y - B.y)) /
        D;
      let Uy =
        ((A.x ** 2 + A.y ** 2) * (C.x - B.x) +
          (B.x ** 2 + B.y ** 2) * (A.x - C.x) +
          (C.x ** 2 + C.y ** 2) * (B.x - A.x)) /
        D;
      return { x: Ux, y: Uy };
    }
    let center = computeCircleCenter(p1, p2, p3);
    if (!center) return { path: '', params: null };
    let r = Math.hypot(center.x - p1.x, center.y - p1.y);
    let r2 = Math.hypot(center.x - p2.x, center.y - p2.y);
    if (Math.abs(r - r2) > 1e-6) r = (r + r2) / 2;
    function normalizedAngle(p) {
      return Math.atan2(p.y - center.y, p.x - center.x);
    }
    let a1 = normalizedAngle(p1);
    let a2 = normalizedAngle(p2);
    let a3 = normalizedAngle(p3);
    function isAngleBetween(angle, start, end) {
      let normStart = start,
        normEnd = end,
        normAngle = angle;
      if (normEnd < normStart) normEnd += 2 * Math.PI;
      if (normAngle < normStart) normAngle += 2 * Math.PI;
      return normAngle >= normStart && normAngle <= normEnd;
    }
    let sweepClockwise = isAngleBetween(a2, a1, a3);
    let sweepFlag = sweepClockwise ? 1 : 0;
    let span = Math.abs(a3 - a1);
    if (
      span > Math.PI &&
      ((sweepFlag === 1 && a3 < a1) || (sweepFlag === 0 && a3 > a1))
    )
      span = 2 * Math.PI - span;
    let largeArcFlag = span > Math.PI ? 1 : 0;
    const params = {
      center: { x: center.x, y: center.y },
      radius: r,
      startAngle: a1,
      endAngle: a3,
      sweepFlag: sweepFlag,
      largeArcFlag: largeArcFlag,
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
        .join(' ') + (this.outlineThickness > 0 ? '' : ' Z');
    this.pathData = [combinedPath];
    this.arcParams = lines.map(() => null);
    return this.pathData;
  }

  generateInterpolatedShapes(t, combine, scale, blend) {
    const radius = 1 * scale;
    const halfSize = 1 * scale;
    const tDistorted = (1 - blend) * t + blend * t * t;
    const cornerAngle = 90 - (90 - 45) * tDistorted;
    const squareCorners = [
      { x: 1 * scale, y: -1 * scale },
      { x: 1 * scale, y: 1 * scale },
      { x: -1 * scale, y: 1 * scale },
      { x: -1 * scale, y: -1 * scale },
    ];
    const paths = [];
    this.arcParams = [];
    for (let i = 0; i < 8; i++) {
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
      let squareP1, squareP2, squareP3;
      if (i % 2 === 0) {
        const startCorner = Math.floor(i / 2) % 4;
        const endCorner = (startCorner + 1) % 4;
        squareP1 = squareCorners[startCorner];
        squareP3 = squareCorners[endCorner];
        squareP2 = {
          x: (squareP1.x + squareP3.x) / 2,
          y: (squareP1.y + squareP3.y) / 2,
        };
      } else {
        let cornerIndex;
        switch (i) {
          case 1:
            cornerIndex = 1;
            break;
          case 3:
            cornerIndex = 2;
            break;
          case 5:
            cornerIndex = 3;
            break;
          case 7:
            cornerIndex = 0;
            break;
        }
        squareP1 = squareCorners[cornerIndex];
        squareP2 = squareCorners[cornerIndex];
        squareP3 = squareCorners[cornerIndex];
      }
      const p1 = this.interpolate(squareP1, circleP1, t);
      const p2 = this.interpolate(squareP2, circleP2, t);
      const p3 = this.interpolate(squareP3, circleP3, t);
      let arcResult =
        i % 2 === 0
          ? this.createArcPath(p1, p2, p3)
          : this.createAngleArcPath(p1, p3, cornerAngle, i);
      paths.push(arcResult.path);
      this.arcParams.push(arcResult.params);
    }
    if (combine) {
      const combinedPathSegments = paths.map((p, i) => {
        if (i === 0) return p;
        const match = p.match(
          /A\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([0-1])\s+([0-1])\s+([\d\.-]+)\s+([\d\.-]+)/
        );
        return match
          ? `A ${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]} ${match[6]} ${match[7]}`
          : '';
      });
      this.pathData = [
        combinedPathSegments.join(' ') +
          (this.outlineThickness > 0 ? '' : ' Z'),
      ];
    } else {
      this.pathData = paths;
    }
    return this.pathData;
  }

  getPaths(t, combine, scale, blend) {
    this.pathData = [];
    this.arcParams = [];
    return t === 0
      ? combine
        ? this.generateCombinedSquare(scale)
        : this.generateSquare(scale)
      : this.generateInterpolatedShapes(t, combine, scale, blend);
  }

  getArcSegments(t, scale, blend) {
    this.pathData = [];
    this.arcParams = [];
    if (t === 0) {
      const size = 1 * scale;
      return [
        { type: 'line', start: [-size, -size], end: [size, -size] },
        { type: 'line', start: [size, -size], end: [size, size] },
        { type: 'line', start: [size, size], end: [-size, size] },
        { type: 'line', start: [-size, size], end: [-size, -size] },
      ];
    }
    const radius = 1 * scale;
    const tDistorted = (1 - blend) * t + blend * t * t;
    const cornerAngle = 90 - (90 - 45) * tDistorted;
    const squareCorners = [
      { x: 1 * scale, y: -1 * scale },
      { x: 1 * scale, y: 1 * scale },
      { x: -1 * scale, y: 1 * scale },
      { x: -1 * scale, y: -1 * scale },
    ];
    const segments = [];
    this.arcParams = [];
    for (let i = 0; i < 8; i++) {
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
      let squareP1, squareP2, squareP3;
      if (i % 2 === 0) {
        const startCorner = Math.floor(i / 2) % 4;
        const endCorner = (startCorner + 1) % 4;
        squareP1 = squareCorners[startCorner];
        squareP3 = squareCorners[endCorner];
        squareP2 = {
          x: (squareP1.x + squareP3.x) / 2,
          y: (squareP1.y + squareP3.y) / 2,
        };
      } else {
        let cornerIndex;
        switch (i) {
          case 1:
            cornerIndex = 1;
            break;
          case 3:
            cornerIndex = 2;
            break;
          case 5:
            cornerIndex = 3;
            break;
          case 7:
            cornerIndex = 0;
            break;
        }
        squareP1 = squareCorners[cornerIndex];
        squareP2 = squareCorners[cornerIndex];
        squareP3 = squareCorners[cornerIndex];
      }
      const p1 = this.interpolate(squareP1, circleP1, t);
      const p2 = this.interpolate(squareP2, circleP2, t);
      const p3 = this.interpolate(squareP3, circleP3, t);
      let arcResult =
        i % 2 === 0
          ? this.createArcPath(p1, p2, p3)
          : this.createAngleArcPath(p1, p3, cornerAngle, i);
      if (arcResult.params) {
        const { center, radius, startAngle, endAngle, sweepFlag } =
          arcResult.params;
        segments.push({
          type: 'arc',
          center: [center.x, center.y],
          radius: radius,
          startAngle: startAngle,
          endAngle: endAngle,
          clockwise: sweepFlag === 1,
        });
      }
      this.arcParams.push(arcResult.params);
    }
    return segments;
  }

}

