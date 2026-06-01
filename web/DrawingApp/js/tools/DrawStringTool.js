class DrawStringTool {
  constructor(app) {
    this.app = app;
    this.isActive = false;

    // Physics State
    this.offsetVector = [0, 0]; // Stores the "string" vector (length = R)
    this.lastPoint = null; // The actual "pen" position {x,y}
    this.currentPoints = []; // Recorded raw points

    // Interaction State
    this.isDrawing = false;
    this.isAdjustingString = false;
    this.ctrlDown = false;

    // Visuals
    this.stringLine = null; // The visual string
    this.penCursor = null; // The visual pen tip
    this.tempPath = null; // The rough line being drawn
  }

  activate() {
    this.isActive = true;

    // Initialize Visuals
    this.stringLine = makeElement('svg:line', {
      stroke: 'rgba(255, 255, 255, 0.5)',
      'stroke-width': 1,
      'stroke-dasharray': '4 4',
      style: { pointerEvents: 'none', display: 'none' },
    });

    this.penCursor = makeElement('svg:circle', {
      r: 3,
      fill: this.app.settings.strokeColor,
      stroke: 'white',
      'stroke-width': 1,
      style: { pointerEvents: 'none', display: 'none' },
    });

    this.app.uiGroup.appendChild(this.stringLine);
    this.app.uiGroup.appendChild(this.penCursor);

    console.log('DrawString Tool Activated');
  }

  deactivate() {
    this.isActive = false;
    if (this.stringLine) this.stringLine.remove();
    if (this.penCursor) this.penCursor.remove();
    if (this.tempPath) this.tempPath.remove();
    this.stringLine = null;
    this.penCursor = null;
    this.tempPath = null;
    this.isDrawing = false;
  }

  onMouseDown(pt, e) {
    this.isDrawing = true;

    // Initialize pen position at mouse position if first click
    this.lastPoint = [pt.x, pt.y];
    this.currentPoints = [{ x: pt.x, y: pt.y }];

    // Start visual path
    this.tempPath = makeElement('svg:path', {
      fill: 'none',
      stroke: this.app.settings.strokeColor,
      'stroke-width': this.app.settings.strokeWidth,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: 0.7,
    });
    this.app.tempGroup.appendChild(this.tempPath);

    // If Control is held on start, we are defining the string vector immediately
    if (this.ctrlDown) {
      this.isAdjustingString = true;
    }
  }

  onMouseMove(pt, e) {
    if (!this.lastPoint) this.lastPoint = [pt.x, pt.y];

    // 1. Handle String Adjustment (Control Key)
    if (this.ctrlDown) {
      // If we are adjusting, we redefine the string length/vector based on Mouse vs Pen
      const dx = pt.x - this.lastPoint[0];
      const dy = pt.y - this.lastPoint[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Update string vector (prevent tiny zero-length glitch)
      if (dist > 1) {
        this.offsetVector = [dx, dy];
      } else {
        this.offsetVector = [0, 0];
      }

      this._updateVisuals(pt);
      return; // Don't draw while adjusting string
    }

    // 2. Handle Drawing Logic (DrawString Physics)
    const effectivePt = this._computeEffectivePoint([pt.x, pt.y]);

    // Update Pen Position
    this.lastPoint = effectivePt;

    // Record point if drawing
    if (this.isDrawing) {
      // Simple distance filter to reduce points
      const lastRec = this.currentPoints[this.currentPoints.length - 1];
      const d = Math.hypot(
        effectivePt[0] - lastRec.x,
        effectivePt[1] - lastRec.y
      );

      if (d > 2) {
        this.currentPoints.push({ x: effectivePt[0], y: effectivePt[1] });
        this._renderTempPath();
      }
    }

    this._updateVisuals({ x: pt.x, y: pt.y });
  }

  onMouseUp(pt, e) {
    // If we were just adjusting string length, we don't finish the stroke, just stop adjusting
    if (this.isAdjustingString) {
      this.isAdjustingString = false;
    } else if (this.isDrawing) {
      this.finishStroke();
    }
    this.isDrawing = false;
  }

  onKeyDown(e) {
    if (e.key === 'Control' || e.key === 'Meta') {
      this.ctrlDown = true;
      this.app.svgElement.style.cursor = 'crosshair';
      // Force visual update to show string in red
      if (this.lastPoint && this.app.currentMousePt) {
        this._updateVisuals(this.app.currentMousePt);
      }
    }
  }

  onKeyUp(e) {
    if (e.key === 'Control' || e.key === 'Meta') {
      this.ctrlDown = false;
      this.isAdjustingString = false;
      this.app.svgElement.style.cursor = 'default';
      // Force visual update to revert string color
      if (this.lastPoint && this.app.currentMousePt) {
        this._updateVisuals(this.app.currentMousePt);
      }
    }
  }

  finishStroke() {
    // Basic rough line implementation for Step 1
    // (Smoothing with CurveFitter comes in a later step)
    if (this.currentPoints.length > 1) {
      const d = this.currentPoints
        .map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`)
        .join(' ');

      const path = makeElement('svg:path', {
        d: d,
        fill: 'none',
        stroke: this.app.settings.strokeColor,
        'stroke-width': this.app.settings.strokeWidth,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      });

      this.app.pathsGroup.appendChild(path);

      // Add to history
      const pathObj = {
        element: path,
        type: 'polyarc',
        points: [...this.currentPoints],
      };
      this.app.drawnPaths.push(pathObj);
      this.app.pushCreateAction(pathObj);
    }

    if (this.tempPath) {
      this.tempPath.remove();
      this.tempPath = null;
    }
    this.currentPoints = [];
  }

  _computeEffectivePoint(mousePt) {
    const R = Math.hypot(this.offsetVector[0], this.offsetVector[1]);

    // If string length is effectively 0, pen is at mouse
    if (R < 1) return mousePt;

    const dx = mousePt[0] - this.lastPoint[0];
    const dy = mousePt[1] - this.lastPoint[1];
    const d = Math.sqrt(dx * dx + dy * dy);

    // If mouse is within string radius, pen doesn't move
    if (d < R) return this.lastPoint;

    // If mouse pulls string taut, pen moves towards mouse maintaining distance R
    const ux = dx / d;
    const uy = dy / d;

    // New Pen Position
    const newX = mousePt[0] - ux * R;
    const newY = mousePt[1] - uy * R;

    return [newX, newY];
  }

  _updateVisuals(mousePt) {
    if (!this.lastPoint || !this.stringLine) return;

    // Update String Line
    this.stringLine.style.display = 'block';
    this.stringLine.setAttribute('x1', this.lastPoint[0]);
    this.stringLine.setAttribute('y1', this.lastPoint[1]);
    this.stringLine.setAttribute('x2', mousePt.x);
    this.stringLine.setAttribute('y2', mousePt.y);

    if (this.ctrlDown) {
      this.stringLine.setAttribute('stroke', '#ff0000');
      this.stringLine.style.opacity = '1';
    } else {
      this.stringLine.setAttribute('stroke', 'rgba(255,255,255,0.5)');
    }

    // Update Pen Cursor
    this.penCursor.style.display = 'block';
    this.penCursor.setAttribute('cx', this.lastPoint[0]);
    this.penCursor.setAttribute('cy', this.lastPoint[1]);
  }

  _renderTempPath() {
    if (!this.tempPath || this.currentPoints.length < 1) return;
    const d = this.currentPoints
      .map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`)
      .join(' ');
    this.tempPath.setAttribute('d', d);
  }

}

