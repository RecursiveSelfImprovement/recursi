class CropTool {
    constructor(options = {}) {
      this.canvas = options.canvas;
      this.canvasWrapper = options.canvasWrapper;
      this.onCropComplete = options.onCropComplete || null;
      this.autoOpenWindow =
        options.autoOpenWindow !== undefined ? options.autoOpenWindow : true;

      this.active = false;
      this.drawing = false;
      this.startPoint = null;
      this.currentPoint = null;

      this.svgOverlay = null;
      this.hLine = null;
      this.vLine = null;
      this.rectEl = null;

      this._boundMouseMove = (e) => this._onMouseMove(e);
      this._boundMouseDown = (e) => this._onMouseDown(e);
      this._boundMouseUp = (e) => this._onMouseUp(e);
      this._boundMouseLeave = (e) => this._onMouseLeave(e);

      this._applyStyles();
    }

    activate() {
      if (this.active) return;
      this.active = true;
      this._createOverlay();
      this.canvas.style.cursor = 'crosshair';
      this.canvas.addEventListener('mousemove', this._boundMouseMove);
      this.canvas.addEventListener('mousedown', this._boundMouseDown);
      window.addEventListener('mouseup', this._boundMouseUp);
      this.canvas.addEventListener('mouseleave', this._boundMouseLeave);
    }

    deactivate() {
      if (!this.active) return;
      this.active = false;
      this.drawing = false;
      this.startPoint = null;
      this.currentPoint = null;
      this._removeOverlay();
      this.canvas.style.cursor = 'crosshair';
      this.canvas.removeEventListener('mousemove', this._boundMouseMove);
      this.canvas.removeEventListener('mousedown', this._boundMouseDown);
      window.removeEventListener('mouseup', this._boundMouseUp);
      this.canvas.removeEventListener('mouseleave', this._boundMouseLeave);
    }

    isActive() {
      return this.active;
    }

    setAutoOpen(val) {
      this.autoOpenWindow = val;
    }

    _createOverlay() {
      const rect = this.canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      this.svgOverlay = makeElement('svg:svg', {
        class: 'crop-tool-overlay',
        width: w,
        height: h,
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '50',
          pointerEvents: 'none',
          overflow: 'visible',
        },
      });

      this.hLine = makeElement('svg:line', {
        x1: '0',
        y1: '0',
        x2: '100%',
        y2: '0',
        class: 'crop-crosshair-line',
      });

      this.vLine = makeElement('svg:line', {
        x1: '0',
        y1: '0',
        x2: '0',
        y2: '100%',
        class: 'crop-crosshair-line',
      });

      this.rectEl = makeElement('svg:rect', {
        x: '0',
        y: '0',
        width: '0',
        height: '0',
        class: 'crop-rect',
        style: { display: 'none' },
      });

      this.svgOverlay.appendChild(this.hLine);
      this.svgOverlay.appendChild(this.vLine);
      this.svgOverlay.appendChild(this.rectEl);

      this.canvasWrapper.appendChild(this.svgOverlay);
    }

    _removeOverlay() {
      if (this.svgOverlay && this.svgOverlay.parentNode) {
        this.svgOverlay.remove();
      }
      this.svgOverlay = null;
      this.hLine = null;
      this.vLine = null;
      this.rectEl = null;
    }

    _getCanvasCoords(e) {
      const canvasRect = this.canvas.getBoundingClientRect();
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;
      return { x, y, canvasRect };
    }

    _getPixelCoords(displayX, displayY) {
      const canvasRect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / canvasRect.width;
      const scaleY = this.canvas.height / canvasRect.height;
      return {
        px: Math.floor(displayX * scaleX),
        py: Math.floor(displayY * scaleY),
      };
    }

    _onMouseMove(e) {
      if (!this.active || !this.svgOverlay) return;

      const { x, y } = this._getCanvasCoords(e);
      const canvasRect = this.canvas.getBoundingClientRect();
      const w = canvasRect.width;
      const h = canvasRect.height;

      const clampedX = Math.max(0, Math.min(w, x));
      const clampedY = Math.max(0, Math.min(h, y));

      if (this.drawing && this.startPoint) {
        this.hLine.style.display = 'none';
        this.vLine.style.display = 'none';

        this.currentPoint = { x: clampedX, y: clampedY };
        this._updateRect();
      } else {
        this.hLine.style.display = '';
        this.vLine.style.display = '';

        this.hLine.setAttribute('x1', '0');
        this.hLine.setAttribute('y1', String(clampedY));
        this.hLine.setAttribute('x2', String(w));
        this.hLine.setAttribute('y2', String(clampedY));

        this.vLine.setAttribute('x1', String(clampedX));
        this.vLine.setAttribute('y1', '0');
        this.vLine.setAttribute('x2', String(clampedX));
        this.vLine.setAttribute('y2', String(h));
      }
    }

    _onMouseDown(e) {
      if (!this.active) return;
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const { x, y } = this._getCanvasCoords(e);
      const canvasRect = this.canvas.getBoundingClientRect();
      const clampedX = Math.max(0, Math.min(canvasRect.width, x));
      const clampedY = Math.max(0, Math.min(canvasRect.height, y));

      this.startPoint = { x: clampedX, y: clampedY };
      this.currentPoint = { x: clampedX, y: clampedY };
      this.drawing = true;

      this.rectEl.style.display = '';
      this._updateRect();
    }

    _onMouseUp(e) {
      if (!this.active || !this.drawing) return;

      this.drawing = false;

      if (this.hLine) this.hLine.style.display = '';
      if (this.vLine) this.vLine.style.display = '';

      if (!this.startPoint || !this.currentPoint) return;

      const canvasRect = this.canvas.getBoundingClientRect();
      const endX = Math.max(
        0,
        Math.min(canvasRect.width, e.clientX - canvasRect.left)
      );
      const endY = Math.max(
        0,
        Math.min(canvasRect.height, e.clientY - canvasRect.top)
      );
      this.currentPoint = { x: endX, y: endY };

      const displayX = Math.min(this.startPoint.x, this.currentPoint.x);
      const displayY = Math.min(this.startPoint.y, this.currentPoint.y);
      const displayW = Math.abs(this.currentPoint.x - this.startPoint.x);
      const displayH = Math.abs(this.currentPoint.y - this.startPoint.y);

      if (displayW < 3 || displayH < 3) {
        this.rectEl.style.display = 'none';
        this.startPoint = null;
        this.currentPoint = null;
        return;
      }

      const topLeft = this._getPixelCoords(displayX, displayY);
      const bottomRight = this._getPixelCoords(
        displayX + displayW,
        displayY + displayH
      );

      const px = Math.max(0, topLeft.px);
      const py = Math.max(0, topLeft.py);
      const pw = Math.min(this.canvas.width - px, bottomRight.px - topLeft.px);
      const ph = Math.min(this.canvas.height - py, bottomRight.py - topLeft.py);

      if (pw < 1 || ph < 1) {
        this.rectEl.style.display = 'none';
        this.startPoint = null;
        this.currentPoint = null;
        return;
      }

      this._extractCrop(px, py, pw, ph);

      this.rectEl.style.display = 'none';
      this.startPoint = null;
      this.currentPoint = null;
    }

    _onMouseLeave(e) {
      if (!this.active || !this.svgOverlay) return;
      if (!this.drawing) {
        this.hLine.setAttribute('y1', '-10');
        this.hLine.setAttribute('y2', '-10');
        this.vLine.setAttribute('x1', '-10');
        this.vLine.setAttribute('x2', '-10');
      }
    }

    _updateRect() {
      if (!this.startPoint || !this.currentPoint) return;
      const x = Math.min(this.startPoint.x, this.currentPoint.x);
      const y = Math.min(this.startPoint.y, this.currentPoint.y);
      const w = Math.abs(this.currentPoint.x - this.startPoint.x);
      const h = Math.abs(this.currentPoint.y - this.startPoint.y);
      this.rectEl.setAttribute('x', String(x));
      this.rectEl.setAttribute('y', String(y));
      this.rectEl.setAttribute('width', String(w));
      this.rectEl.setAttribute('height', String(h));
    }

    _extractCrop(px, py, pw, ph) {
      const ctx = this.canvas.getContext('2d');
      const imageData = ctx.getImageData(px, py, pw, ph);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = pw;
      cropCanvas.height = ph;
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.putImageData(imageData, 0, 0);

      const cropInfo = {
        sourceX: px,
        sourceY: py,
        width: pw,
        height: ph,
        canvas: cropCanvas,
        dataUrl: cropCanvas.toDataURL('image/png'),
        autoOpen: this.autoOpenWindow,
      };

      if (this.onCropComplete) {
        this.onCropComplete(cropInfo);
      }
    }

    _applyStyles() {
      const css = `
        .crop-tool-overlay {
          pointer-events: none;
        }
        .crop-crosshair-line {
          stroke: rgba(255, 255, 255, 0.8);
          stroke-width: 1;
          stroke-dasharray: 6 4;
          pointer-events: none;
        }
        .crop-rect {
          fill: rgba(0, 150, 255, 0.15);
          stroke: rgba(0, 180, 255, 0.9);
          stroke-width: 1.5;
          stroke-dasharray: 6 3;
          pointer-events: none;
        }
      `;
      applyCss(css, 'crop-tool-styles');
    }
  }