class CapsuleElement {
  
  constructor(start, end) {
    this.initCadElement();
    this.type = 'capsule';
    this.start = start ? start.slice() : [0, 0, 0];
    this.end = end ? end.slice() : [0, 0, 0];
    this.points = [this.start.slice(), this.end.slice()];
    this.radius = 0.3;
    this.updateDimensions();
  }

  toJSON() {
    const base = this.toJSONBase();
    return {
      ...base,
      type: 'capsule',
      start: [...this.start],
      end: [...this.end],
      radius: this.radius,
    };
  }

  static fromJSON(data) {
    const element = new CapsuleElement(data.start, data.end);
    element.id = data.id;
    element.type = data.type;
    element.color = data.color;
    element.isTemporary = data.isTemporary;
    element.radius = data.radius || 0.3;
    element.points = [element.start.slice(), element.end.slice()];
    return element;
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
    this.center = [
      (this.min[0] + this.max[0]) / 2,
      (this.min[1] + this.max[1]) / 2,
      (this.min[2] + this.max[2]) / 2,
    ];
    this.size = [
      this.max[0] - this.min[0],
      this.max[1] - this.min[1],
      this.max[2] - this.min[2],
    ];
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

