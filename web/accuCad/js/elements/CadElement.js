class CadElement {
  constructor() {
    this.id = Math.random().toString(36).substr(2, 9);
    this.color = 0x000000; // Default black
    this.opacity = 1.0;
    this.lineWidth = 1;
    this.isSelected = false;
    this.isTemporary = false;
    this.points = []; // Standard property for raycasting: array of [x, y, z]
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      color: this.color,
      isTemporary: this.isTemporary,
    };
  }

  static fromJSON(data) {
    const element = new CadElement();
    element.id = data.id;
    element.type = data.type;
    element.color = data.color;
    element.isTemporary = data.isTemporary;
    return element;
  }

}

