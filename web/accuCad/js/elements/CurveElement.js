class CurveElement {
  
  constructor(controlPoints) {
    this.initCadElement();
    this.type = 'curve';
    this.controlPoints = controlPoints
      ? controlPoints.map((pt) => pt.slice())
      : [];
    this.points = this.controlPoints; // Use control points for snapping
    this.updateDimensions();
  }

  updateDimensions() {
    if (!this.controlPoints || this.controlPoints.length === 0) return;

    const xs = this.controlPoints.map((pt) => pt[0]);
    const ys = this.controlPoints.map((pt) => pt[1]);
    const zs = this.controlPoints.map((pt) => pt[2]);
    this.min = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
    this.max = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
    this.center = [
      (this.min[0] + this.max[0]) / 2,
      (this.min[1] + this.max[1]) / 2,
      (this.min[2] + this.max[2]) / 2,
    ];
  }

  toJSON() {
    const base = this.toJSONBase();
    return {
      ...base,
      type: 'curve',
      controlPoints: this.controlPoints.map((pt) => [...pt]),
    };
  }

  static fromJSON(data) {
    const element = new CurveElement(data.controlPoints);
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

