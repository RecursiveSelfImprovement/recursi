class VisualsDebug {
  pianoVisuals = null;

  parentContainer = null;

  debugLayer = null;

  isVisible = false;

  constructor(parentId, pianoVisualsInstance) {
    this.parentContainer = document.getElementById(parentId);
    this.pianoVisuals = pianoVisualsInstance;
    if (!this.parentContainer || !this.pianoVisuals) {
      console.error(
        'VisualsDebug: Missing parent container or PianoVisuals instance.'
      );
      return;
    }
    console.log(`VisualsDebug: Initialized for parent #${parentId}.`);
    // Create a layer, but keep it hidden initially
    this._createLayer();
  }

  _createLayer() {
    this.debugLayer = document.createElement('div');
    this.debugLayer.style.position = 'absolute';
    this.debugLayer.style.top = '0';
    this.debugLayer.style.left = '0';
    this.debugLayer.style.width = '100%';
    this.debugLayer.style.height = '100%';
    this.debugLayer.style.pointerEvents = 'none';
    this.debugLayer.style.zIndex = '99999'; // Above most other things
    this.debugLayer.style.display = 'none'; // Hidden by default
    this.debugLayer.style.border = '1px dotted magenta';
    try {
      this.parentContainer.appendChild(this.debugLayer);
    } catch (e) {
      console.error('VisualsDebug: Failed to append debug layer:', e);
      this.debugLayer = null;
    }
  }

  show() {
    if (!this.debugLayer) return;
    console.log('VisualsDebug: Showing debug overlay.');
    this.debugLayer.style.display = 'block';
    this.isVisible = true;
    this.update(); // Update content when shown
  }

  hide() {
    if (!this.debugLayer) return;
    console.log('VisualsDebug: Hiding debug overlay.');
    this.debugLayer.style.display = 'none';
    this.isVisible = false;
  }

  update() {
    if (!this.isVisible || !this.debugLayer) return;
    this.debugLayer.innerHTML = '';

    const abContainer = this.pianoVisuals?.actionBar?.containerW;
    if (abContainer) {
      const rect = abContainer.getBoundingClientRect();
      const parentRect = this.parentContainer.getBoundingClientRect();
      const dbgBox = document.createElement('div');
      dbgBox.style.position = 'absolute';
      dbgBox.style.left = `${rect.left - parentRect.left}px`;
      dbgBox.style.top = `${rect.top - parentRect.top}px`;
      dbgBox.style.width = `${rect.width}px`;
      dbgBox.style.height = `${rect.height}px`;
      dbgBox.style.border = '1px solid cyan';
      dbgBox.style.color = 'cyan';
      dbgBox.textContent = `Action Bar (${this.pianoVisuals.config.mode})`;
      this.debugLayer.appendChild(dbgBox);
    }
  }

  destroy() {
    this.debugLayer?.remove();
    this.debugLayer = null;
    this.parentContainer = null;
    this.pianoVisuals = null;
    this.isVisible = false;
  }

}

