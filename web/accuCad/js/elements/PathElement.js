class PathElement {
  
  constructor(points) {
    this.initCadElement();
    this.type = 'path';
    // Initialize arrays to ensure no undefined errors.
    // 'points' stores the sharp corners/control points for snapping.
    this.points = points ? points.map((pt) => pt.slice()) : [];
    // 'vertices' stores the corner attributes (radius, etc).
    this.vertices = points
      ? points.map((pt) => ({ point: pt.slice(), radius: 0 }))
      : [];
    this.threejsObject = null;
    this.isTemporary = false;
    this.color = 0xff0000;
    this.closed = false;
    this.lineWidth = 1;

    this.updateDimensions();
  }

  toJSON() {
    const base = this.toJSONBase();
    return {
      ...base,
      type: 'path',
      vertices: this.vertices.map((v) => ({
        point: [...v.point],
        radius: v.radius,
      })),
      closed: this.closed,
      lineWidth: this.lineWidth,
    };
  }

  static fromJSON(data) {
    const element = new PathElement();
    element.id = data.id;
    element.type = data.type;
    element.color = data.color;
    element.isTemporary = data.isTemporary;
    element.vertices = data.vertices.map((v) => ({
      point: [...v.point],
      radius: v.radius,
    }));
    element.points = element.vertices.map((v) => [...v.point]);
    element.closed = data.closed;
    element.lineWidth = data.lineWidth || 1;
    element.updateDimensions();
    return element;
  }

  updateDimensions() {
    if (!this.points || this.points.length === 0) return;

    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    this.points.forEach((pt) => {
      min[0] = Math.min(min[0], pt[0]);
      min[1] = Math.min(min[1], pt[1]);
      min[2] = Math.min(min[2], pt[2]);
      max[0] = Math.max(max[0], pt[0]);
      max[1] = Math.max(max[1], pt[1]);
      max[2] = Math.max(max[2], pt[2]);
    });
    this.min = min;
    this.max = max;
    this.center = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];
    this.size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  }

  initCadElement() {
    this.id = Math.random().toString(36).substr(2, 9);
    this.color = 0x000000;
    this.opacity = 1.0;
    this.lineWidth = 1;
    this.isSelected = false;
    this.isTemporary = false;
    this.points = [];
  }

  toJSONBase() {
    return { id: this.id, type: this.type, color: this.color, isTemporary: this.isTemporary };
  }

}

