class TriangleCP {
  
  constructor(initialWidth, initialHue = 0) {
    this.hue = initialHue;
    this.rotation = 0;
    this.weights = { wA: 1, wB: 0, wC: 0 };

    this.padding = 20;
    this.currentBorderRadius = 12; // Renamed property
    this.outlineWidth = 2;

    this.width = initialWidth || 250;
    this.height = Math.round(this.width * 0.866);

    this.container = makeElement('div', {
      style: {
        width: `${this.width}px`,
        height: `${this.height}px`,
        position: 'relative',
        overflow: 'visible',
        cursor: 'crosshair',
        userSelect: 'none',
        boxSizing: 'border-box',
        transformOrigin: 'center center',
      },
    });

    this.bgSvgLayer = makeElement('svg:svg', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      },
    });

    this.bgPath = makeElement('svg:path', { fill: 'red', stroke: 'none' });
    this.bgSvgLayer.appendChild(this.bgPath);

    this.canvas = makeElement('canvas', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      },
    });

    this.svgLayer = makeElement('svg:svg', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      },
    });

    this.outlinePath = makeElement('svg:path', {
      fill: 'none',
      stroke: 'black',
      'stroke-width': this.outlineWidth,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    });

    this.cursorCircle = makeElement('svg:circle', {
      r: this.currentBorderRadius,
      fill: 'transparent',
      stroke: 'white',
      'stroke-width': 3,
      style: { filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' },
    });

    this.svgLayer.appendChild(this.outlinePath);
    this.svgLayer.appendChild(this.cursorCircle);

    this.container.appendChild(this.bgSvgLayer);
    this.container.appendChild(this.canvas);
    this.container.appendChild(this.svgLayer);

    this.addEventListeners();

    // Initial size
    this.resize(this.width, this.height);

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (
          w > 0 &&
          h > 0 &&
          (Math.abs(w - this.width) > 1 || Math.abs(h - this.height) > 1)
        ) {
          this.resize(w, h);
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  getElement() {
    return this.container;
  }

  resize(w, h) {
    if (!w || !h || w < 10 || h < 10) return;

    this.width = w;
    this.height = h;

    this.container.style.width = `${w}px`;
    this.container.style.height = `${h}px`;
    this.canvas.width = w;
    this.canvas.height = h;

    const viewBox = `0 0 ${w} ${h}`;
    this.svgLayer.setAttribute('viewBox', viewBox);
    this.svgLayer.setAttribute('preserveAspectRatio', 'none');
    this.bgSvgLayer.setAttribute('viewBox', viewBox);
    this.bgSvgLayer.setAttribute('preserveAspectRatio', 'none');

    const referenceSize = 250;
    const scaleFactor = Math.sqrt(w / referenceSize);

    const baseRadius = 13;
    const baseStroke = 2.5;

    this.currentBorderRadius = baseRadius * scaleFactor;
    this.outlineWidth = 2;
    this.thumbStrokeWidth = baseStroke * scaleFactor;

    if (this.cursorCircle) {
      this.cursorCircle.setAttribute('stroke-width', this.thumbStrokeWidth);
      this.cursorCircle.style.filter = 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))';
    }

    const side = Math.min(w, h) - this.padding * 2;
    if (side < 1) return;

    const triHeight = (side * Math.sqrt(3)) / 2;
    const cx = w / 2;
    const cy = h / 2;

    // Calculate proper triangle vertices centered at the centroid
    this.triGeometry = {
      A: { x: cx, y: cy - (2 / 3) * triHeight },
      B: { x: cx - side / 2, y: cy + (1 / 3) * triHeight },
      C: { x: cx + side / 2, y: cy + (1 / 3) * triHeight },
    };

    // Calculate and store the centroid (geometric center)
    this.centroid = {
      x:
        (this.triGeometry.A.x + this.triGeometry.B.x + this.triGeometry.C.x) /
        3,
      y:
        (this.triGeometry.A.y + this.triGeometry.B.y + this.triGeometry.C.y) /
        3,
    };

    this.draw();
    this.updateCursorFromWeights();
  }

  draw() {
    if (!this.triGeometry) return;

    this.updateSVG();

    const ctx = this.canvas.getContext('2d');
    const { width, height } = this;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    const pureHue = AppColorUtils.hsvToRgbArray(this.hue / 360, 1, 1);
    this.bgPath.setAttribute(
      'fill',
      `rgb(${pureHue[0]}, ${pureHue[1]}, ${pureHue[2]})`
    );

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const { A, B, C } = this.triGeometry;

    const getBarycentric = (px, py) => {
      const det = (B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y);
      const wA = ((B.y - C.y) * (px - C.x) + (C.x - B.x) * (py - C.y)) / det;
      const wB = ((C.y - A.y) * (px - C.x) + (A.x - C.x) * (py - C.y)) / det;
      const wC = 1 - wA - wB;
      return { wA, wB, wC };
    };

    const distToSegment = (P, V, W) => {
      const l2 = (V.x - W.x) ** 2 + (V.y - W.y) ** 2;
      if (l2 === 0) return Math.sqrt((P.x - V.x) ** 2 + (P.y - V.y) ** 2);
      let t = ((P.x - V.x) * (W.x - V.x) + (P.y - V.y) * (W.y - V.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = V.x + t * (W.x - V.x);
      const projY = V.y + t * (W.y - V.y);
      return Math.sqrt((P.x - projX) ** 2 + (P.y - projY) ** 2);
    };

    const paintRadius = this.currentBorderRadius + 0.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const weights = getBarycentric(x, y);
        let { wA, wB, wC } = weights;

        let isInside = wA >= 0 && wB >= 0 && wC >= 0;
        let dist = 0;

        if (!isInside) {
          const dA = distToSegment({ x, y }, A, B);
          const dB = distToSegment({ x, y }, B, C);
          const dC = distToSegment({ x, y }, C, A);
          dist = Math.min(dA, dB, dC);
        }

        if (dist <= paintRadius) {
          if (!isInside) {
            wA = Math.max(0, wA);
            wB = Math.max(0, wB);
            wC = Math.max(0, wC);
            const sum = wA + wB + wC;
            if (sum > 0) {
              wA /= sum;
              wB /= sum;
              wC /= sum;
            }
          }

          let alphaFactor = 1 - wA;
          if (alphaFactor < 0) alphaFactor = 0;
          if (alphaFactor > 1) alphaFactor = 1;

          let gray = 0;
          if (alphaFactor > 0.0001) {
            gray = (wC / alphaFactor) * 255;
          }

          if (gray < 0) gray = 0;
          if (gray > 255) gray = 255;
          gray = Math.round(gray);

          let finalAlpha = Math.round(alphaFactor * 255);

          if (dist > paintRadius - 1) {
            finalAlpha = Math.round(finalAlpha * (paintRadius - dist));
          }

          const idx = (y * width + x) * 4;
          data[idx] = gray;
          data[idx + 1] = gray;
          data[idx + 2] = gray;
          data[idx + 3] = finalAlpha;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  updateSVG() {
    if (!this.triGeometry) return;
    const { A, B, C } = this.triGeometry;
    const r = this.currentBorderRadius;

    this.cursorCircle.setAttribute('r', r);
    // Use the dynamic stroke width calculated in resize
    this.cursorCircle.setAttribute(
      'stroke-width',
      this.thumbStrokeWidth || 2.5
    );

    this.outlinePath.setAttribute('stroke-width', this.outlineWidth);
    this.outlinePath.setAttribute('shape-rendering', 'geometricPrecision');

    const getOutwardNormal = (P1, P2) => {
      const dx = P2.x - P1.x;
      const dy = P2.y - P1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return { x: 0, y: 0 };
      return { x: -dy / len, y: dx / len };
    };

    const nAB = getOutwardNormal(A, B);
    const nBC = getOutwardNormal(B, C);
    const nCA = getOutwardNormal(C, A);

    const fmt = (n) => n.toFixed(2);

    const d = [
      `M ${fmt(A.x + nCA.x * r)} ${fmt(A.y + nCA.y * r)}`,
      `A ${r} ${r} 0 0 0 ${fmt(A.x + nAB.x * r)} ${fmt(A.y + nAB.y * r)}`,
      `L ${fmt(B.x + nAB.x * r)} ${fmt(B.y + nAB.y * r)}`,
      `A ${r} ${r} 0 0 0 ${fmt(B.x + nBC.x * r)} ${fmt(B.y + nBC.y * r)}`,
      `L ${fmt(C.x + nBC.x * r)} ${fmt(C.y + nBC.y * r)}`,
      `A ${r} ${r} 0 0 0 ${fmt(C.x + nCA.x * r)} ${fmt(C.y + nCA.y * r)}`,
      'Z',
    ].join(' ');

    this.outlinePath.setAttribute('d', d);
    if (this.bgPath) {
      this.bgPath.setAttribute('d', d);
      this.bgPath.setAttribute('shape-rendering', 'geometricPrecision');
    }
  }

  updateCursorPosition(x, y, color) {
    this.cursorCircle.setAttribute('cx', x);
    this.cursorCircle.setAttribute('cy', y);
    if (color) {
      this.cursorCircle.setAttribute('fill', color);
    }
  }

  updateCursorFromWeights() {
    if (!this.triGeometry) return;
    const { A, B, C } = this.triGeometry;
    const { wA, wB, wC } = this.weights;

    const x = wA * A.x + wB * B.x + wC * C.x;
    const y = wA * A.y + wB * B.y + wC * C.y;

    const pureHue = AppColorUtils.hsvToRgbArray(this.hue / 360, 1, 1);
    const r = Math.round(wA * pureHue[0] + wC * 255);
    const g = Math.round(wA * pureHue[1] + wC * 255);
    const b = Math.round(wA * pureHue[2] + wC * 255);

    this.updateCursorPosition(x, y, `rgb(${r}, ${g}, ${b})`);
  }

  setHue(hue) {
    this.hue = hue;
    this.draw();
    this.updateCursorFromWeights();
  }

  setColor(rgbString) {
    const rgb = AppColorUtils.rgbStringToRgbArray(rgbString);
    if (!rgb) return;

    const hsv = AppColorUtils.rgbToHsv(rgb[0], rgb[1], rgb[2]);
    this.hue = hsv.h;

    const wB = 1 - hsv.v;
    const wA = hsv.s * hsv.v;
    const wC = 1 - wA - wB;

    this.weights = { wA, wB, wC };

    if (this.triGeometry) {
      this.updateCursorFromWeights();
    }

    this.draw();
  }

  addEventListeners() {
    const handleMove = (e) => {
      const rect = this.container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // 1. Find center of the element in screen space
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // 2. Vector from center to mouse
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // 3. Counter-rotate the vector to find position in local element space
      const rad = (-this.rotation * Math.PI) / 180;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

      // 4. Map back to 0..width/height coordinates (assuming center is w/2, h/2)
      // Note: This assumes the internal canvas content is centered in the container.
      const x = lx + this.width / 2;
      const y = ly + this.height / 2;

      this.processInput(x, y);
    };

    this.container.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleMove(e);
      const onMove = (ev) => handleMove(ev);
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  processInput(x, y) {
    const { A, B, C } = this.triGeometry;
    const det = (B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y);
    let wA = ((B.y - C.y) * (x - C.x) + (C.x - B.x) * (y - C.y)) / det;
    let wB = ((C.y - A.y) * (x - C.x) + (A.x - C.x) * (y - C.y)) / det;
    let wC = 1 - wA - wB;

    if (wA < 0 || wB < 0 || wC < 0) {
      wA = Math.max(0, wA);
      wB = Math.max(0, wB);
      wC = Math.max(0, wC);
      const sum = wA + wB + wC;
      if (sum > 0) {
        wA /= sum;
        wB /= sum;
        wC /= sum;
      }
    }

    this.weights = { wA, wB, wC };

    const cx = wA * A.x + wB * B.x + wC * C.x;
    const cy = wA * A.y + wB * B.y + wC * C.y;

    const pureHue = AppColorUtils.hsvToRgbArray(this.hue / 360, 1, 1);
    const r = Math.round(wA * pureHue[0] + wC * 255);
    const g = Math.round(wA * pureHue[1] + wC * 255);
    const b = Math.round(wA * pureHue[2] + wC * 255);
    const colorString = `rgb(${r}, ${g}, ${b})`;

    this.updateCursorPosition(cx, cy, colorString);

    if (this.onColorUpdate) this.onColorUpdate(colorString);
    if (this.onColorSelect) this.onColorSelect(colorString);
  }

  setRotation(angle) {
    this.rotation = angle;
    // DON'T set transform here - let the parent control it
    // Just set the transform-origin
    this.container.style.transformOrigin = `${this.width / 2}px ${
      this.height / 2
    }px`;
    // The parent (ColorPicker) will set the full transform including rotation AND scale
  }

  setBorderRadius(val) {
    this.currentBorderRadius = val;
    if (this.cursorCircle) {
      this.cursorCircle.setAttribute('r', val);
    }
    this.draw();
  }

  getWeights() {
    return this.weights; // Returns { wA, wB, wC }
  }

  processInputFromWeights(weights) {
    // Helper to allow external (MIDI) control of triangle position via weights
    this.weights = weights;
    this.updateCursorFromWeights();
    if (this.onColorUpdate) this.onColorUpdate(this.getColorString());
  }

  getColorString() {
    const pureHue = AppColorUtils.hsvToRgbArray(this.hue / 360, 1, 1);
    const r = Math.round(this.weights.wA * pureHue[0] + this.weights.wC * 255);
    const g = Math.round(this.weights.wA * pureHue[1] + this.weights.wC * 255);
    const b = Math.round(this.weights.wA * pureHue[2] + this.weights.wC * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  

  _hsvToRgb(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
}

