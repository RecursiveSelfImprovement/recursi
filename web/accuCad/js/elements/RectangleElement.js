class RectangleElement {
  
  constructor(start, end) {
    this.initCadElement();
    this.type = 'rectangle';
    this.start = start ? start.slice() : [0, 0, 0];
    this.end = end ? end.slice() : [0, 0, 0];
    this.updateDimensions();
  }

  updateDimensions() {
    if (!this.start || !this.end) return;

    this.min = [
      Math.min(this.start[0], this.end[0]),
      Math.min(this.start[1], this.end[1]),
      Math.min(this.start[2], this.end[2]),
    ];
    this.max = [
      Math.max(this.start[0], this.end[0]),
      Math.max(this.start[1], this.end[1]),
      Math.max(this.start[2], this.end[2]),
    ];
    this.size = [
      this.max[0] - this.min[0],
      this.max[1] - this.min[1],
      this.max[2] - this.min[2],
    ];
    this.center = [
      (this.min[0] + this.max[0]) / 2,
      (this.min[1] + this.max[1]) / 2,
      (this.min[2] + this.max[2]) / 2,
    ];

    // Populate 8 corners for snapping
    const [minX, minY, minZ] = this.min;
    const [maxX, maxY, maxZ] = this.max;
    this.points = [
      [minX, minY, minZ],
      [maxX, minY, minZ],
      [maxX, maxY, minZ],
      [minX, maxY, minZ],
      [minX, minY, maxZ],
      [maxX, minY, maxZ],
      [maxX, maxY, maxZ],
      [minX, maxY, maxZ],
    ];

    const epsilon = 0.0001;
    this.isFlat =
      this.size[0] < epsilon ||
      this.size[1] < epsilon ||
      this.size[2] < epsilon;
  }

  toJSON() {
    const base = this.toJSONBase();
    return {
      ...base,
      type: 'rectangle',
      start: [...this.start],
      end: [...this.end],
    };
  }

  static fromJSON(data) {
    const element = new RectangleElement(data.start, data.end);
    element.id = data.id;
    element.type = data.type;
    element.color = data.color;
    element.isTemporary = data.isTemporary;
    return element;
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

