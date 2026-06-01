class ArcElement {
  
  constructor(startPt, center, endPt) {
    this.initCadElement();
    this.type = 'arc';
    this.startPt = startPt ? startPt.slice() : [0, 0, 0];
    this.center = center ? center.slice() : [0, 0, 0];
    this.endPt = endPt ? endPt.slice() : [0, 0, 0];
    // Snappable points: Start, End, and Center
    this.points = [this.startPt, this.endPt, this.center];
    this.updateDimensions();
  }

  updateDimensions() {
    if (!this.startPt || !this.center || !this.endPt) return;

    const xs = [this.startPt[0], this.center[0], this.endPt[0]];
    const ys = [this.startPt[1], this.center[1], this.endPt[1]];
    const zs = [this.startPt[2], this.center[2], this.endPt[2]];
    this.min = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
    this.max = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
    this.centerPoint = [
      (this.min[0] + this.max[0]) / 2,
      (this.min[1] + this.max[1]) / 2,
      (this.min[2] + this.max[2]) / 2,
    ];
    this.points = [this.startPt, this.endPt, this.center];
  }

  toJSON() {
    const base = this.toJSONBase();
    return {
      ...base,
      type: 'arc',
      startPt: [...this.startPt],
      center: [...this.center],
      endPt: [...this.endPt],
    };
  }

  static fromJSON(data) {
    const element = new ArcElement(data.startPt, data.center, data.endPt);
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

