class BaseDrawCommand {
  constructor(baseController) {
    this.base = baseController;
    this.tempElement = null;
    this.previewShape = null;
    this.allowSelfSnap = false; // --- NEW: Default behavior is to prevent self-snapping.
  }

  onPoint(data) {
    if (!data) return; // Guard against missing data

    if (data.mode === 'click') {
      if (this.onMouseDown) {
        this.onMouseDown(data);
      }
    } else if (data.mode === 'hover') {
      if (this.onMouseMove) {
        this.onMouseMove(data);
      }
    }
  }

  disposeObject(object) {
    if (!object) return;
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  reset() {
    if (this.previewShape) {
      this.base.view.scene.remove(this.previewShape);
      this.disposeObject(this.previewShape);
      this.previewShape = null;
    }
    // A basic reset. Child classes can add more logic.
    this.tempElement = null;
  }

  dispose() {
    this.reset();
  }

}

