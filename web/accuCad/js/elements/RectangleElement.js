class RectangleElement {
  
  constructor(start, end, rotationMatrix) {
      this.initCadElement();
      this.type = 'rectangle';
      this.start = start ? start.slice() : [0, 0, 0];
      this.end = end ? end.slice() : [0, 0, 0];
      this.rotationMatrix = rotationMatrix ? rotationMatrix.map(row => [...row]) : [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      this.updateDimensions();
    }

  updateDimensions() {
      if (!this.start || !this.end) return;

      const localX = this.rotationMatrix[0];
      const localY = this.rotationMatrix[1];
      const localZ = this.rotationMatrix[2];

      const dx = this.end[0] - this.start[0];
      const dy = this.end[1] - this.start[1];
      const dz = this.end[2] - this.start[2];

      const lenX = dx * localX[0] + dy * localX[1] + dz * localX[2];
      const lenY = dx * localY[0] + dy * localY[1] + dz * localY[2];
      const lenZ = dx * localZ[0] + dy * localZ[1] + dz * localZ[2];

      this.size = [Math.abs(lenX), Math.abs(lenY), Math.abs(lenZ)];

      this.center = [
        this.start[0] + 0.5 * (lenX * localX[0] + lenY * localY[0] + lenZ * localZ[0]),
        this.start[1] + 0.5 * (lenX * localX[1] + lenY * localY[1] + lenZ * localZ[1]),
        this.start[2] + 0.5 * (lenX * localX[2] + lenY * localY[2] + lenZ * localZ[2]),
      ];

      const c0 = [this.start[0], this.start[1], this.start[2]];
      const c1 = [
        this.start[0] + lenX * localX[0],
        this.start[1] + lenX * localX[1],
        this.start[2] + lenX * localX[2]
      ];
      const c2 = [
        this.start[0] + lenX * localX[0] + lenY * localY[0],
        this.start[1] + lenX * localX[1] + lenY * localY[1],
        this.start[2] + lenX * localX[2] + lenY * localY[2]
      ];
      const c3 = [
        this.start[0] + lenY * localY[0],
        this.start[1] + lenY * localY[1],
        this.start[2] + lenY * localY[2]
      ];
      const c4 = [
        this.start[0] + lenZ * localZ[0],
        this.start[1] + lenZ * localZ[1],
        this.start[2] + lenZ * localZ[2]
      ];
      const c5 = [
        this.start[0] + lenX * localX[0] + lenZ * localZ[0],
        this.start[1] + lenX * localX[1] + lenZ * localZ[1],
        this.start[2] + lenX * localX[2] + lenZ * localZ[2]
      ];
      const c6 = [
        this.start[0] + lenX * localX[0] + lenY * localY[0] + lenZ * localZ[0],
        this.start[1] + lenX * localX[1] + lenY * localY[1] + lenZ * localZ[1],
        this.start[2] + lenX * localX[2] + lenY * localY[2] + lenZ * localZ[2]
      ];
      const c7 = [
        this.start[0] + lenY * localY[0] + lenZ * localZ[0],
        this.start[1] + lenY * localY[1] + lenZ * localZ[1],
        this.start[2] + lenY * localY[2] + lenZ * localZ[2]
      ];

      this.points = [c0, c1, c2, c3, c4, c5, c6, c7];

      const xs = this.points.map(p => p[0]);
      const ys = this.points.map(p => p[1]);
      const zs = this.points.map(p => p[2]);

      this.min = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
      this.max = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];

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
        rotationMatrix: this.rotationMatrix ? this.rotationMatrix.map(row => [...row]) : null,
      };
    }

  static fromJSON(data) {
      const element = new RectangleElement(data.start, data.end, data.rotationMatrix);
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

