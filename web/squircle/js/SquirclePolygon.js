class SquirclePolygon {
  constructor() {
    this.pathData = [];
    this.arcParams = [];
  }

  generatePolygon(sides, scale) {
    const radius = 1 * scale;
    const sideLength = 2 * radius;
    const points = [];

    if (sides === 4) {
      const halfSide = sideLength / 2;
      points.push(`${-halfSide} ${-halfSide}`);
      points.push(`${halfSide} ${-halfSide}`);
      points.push(`${halfSide} ${halfSide}`);
      points.push(`${-halfSide} ${halfSide}`);
    } else {
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        points.push(`${radius * Math.cos(angle)} ${radius * Math.sin(angle)}`);
      }
    }

    const path = `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;
    this.pathData = [path];
    this.arcParams = Array(sides).fill(null);
    return this.pathData;
  }

  getPaths(t, scale) {
    this.pathData = [];
    this.arcParams = [];
    const steps = [
      { t: 0.0, sides: 4 },
      { t: 0.25, sides: 5 },
      { t: 0.5, sides: 6 },
      { t: 0.75, sides: 7 },
      { t: 1.0, sides: 100 },
    ];
    let sides = 4;
    for (const step of steps) {
      if (t <= step.t) {
        sides = step.sides;
        break;
      }
      sides = step.sides;
    }
    return this.generatePolygon(sides, scale);
  }

  getArcParameters() {
    return this.arcParams;
  }

  // Path validation test added on: [CHANGE ME: Test at 2024-05-16 15:30]
  _pathValidationTest() {
    return true;
  }
}