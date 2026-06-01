class GamePiece {
  constructor({ value, type, x = 0, y = 0, vx = 0, vy = 0 }) {
    this.value = value;
    this.type = type; // 'number' or 'operator'
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.scale = 1.0;
    // Remember the last free (non-grouped) velocity so pull-offs resume it
    this.lastFreeVelocity = { vx, vy };

    // New: Properties for cached dimensions, initialized to 0
    this.width = 0;
    this.height = 0;

    this.element = makeElement(
      'div',
      { className: 'game-piece' },
      String(this.value)
    );
    this.draw();
  }

  update(speedMult = 1) {
    this.x += (this.vx || 0) * speedMult;
    this.y += (this.vy || 0) * speedMult;
  }

  draw() {
    // Now applies both position and scale in one go
    this.element.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
  }

  remove() {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }

  cacheDimensions() {
    // This method is called once after the element is added to the DOM
    // to get its real, final dimensions.
    this.width = this.element.offsetWidth;
    this.height = this.element.offsetHeight;
  }
} // end class GamePiece

