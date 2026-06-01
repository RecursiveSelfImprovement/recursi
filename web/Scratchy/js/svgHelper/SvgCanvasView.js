
class SvgCanvasView {
  constructor(container) {
    this.container = container;
    this.viewport = null;
    this.checkerBg = null;
    this.svgContainer = null;
    this.viewBoxOutline = null;
    this.coordDisplay = null;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.showViewBox = true;
    this.showControlPoints = false;
    this.animateBackground = false;
    this.svgElement = null;
    this.onZoomChange = null;
    this.onViewChange = null; // New Callback
    this.onMouseCoords = null;
    this.gridColor1 = '#2a2d42';
    this.gridColor2 = '#1a1d2e';
    this._animFrame = null;
    this._animStart = null;
    this.cpOverlay = null;
  }

  init() {
    this.viewport = makeElement('div', { className: 'svgh-canvas-viewport' });
    this.checkerBg = makeElement('div', { className: 'svgh-checker-bg' });
    this.svgContainer = makeElement('div', { className: 'svgh-svg-container' });
    this.cpOverlay = makeElement('svg:svg', {
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '15',
        overflow: 'visible',
      },
    });
    this.viewBoxOutline = makeElement(
      'div',
      { className: 'svgh-viewbox-outline' },
      makeElement('span', { className: 'svgh-viewbox-label' })
    );
    this.coordDisplay = makeElement(
      'div',
      {
        style: {
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          padding: '3px 8px',
          borderRadius: '4px',
          background: 'rgba(0,0,0,0.7)',
          color: '#4fd1c5',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          pointerEvents: 'none',
          zIndex: '10',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(79,209,197,0.2)',
        },
      },
      'x: — y: —'
    );

    this.viewport.appendChild(this.checkerBg);
    this.viewport.appendChild(this.svgContainer);
    this.viewport.appendChild(this.cpOverlay);
    this.viewport.appendChild(this.viewBoxOutline);
    this.viewport.appendChild(this.coordDisplay);
    this.container.appendChild(this.viewport);

    this._setupEvents();
    this._updateTransform();
  }

  _setupEvents() {
    this.viewport.addEventListener(
      'wheel',
      (e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = this.viewport.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldX = (mx - this.panX) / this.zoom;
        const worldY = (my - this.panY) / this.zoom;
        this.zoom = Math.max(0.05, Math.min(50, this.zoom * delta));
        this.panX = mx - worldX * this.zoom;
        this.panY = my - worldY * this.zoom;
        this._updateTransform();
        if (this.onZoomChange) this.onZoomChange(this.zoom);
      },
      { passive: false }
    );

    this.viewport.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
        this.viewport.classList.add('panning');
      }
    });

    this.viewport.addEventListener('mousemove', (e) => {
      const rect = this.viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const svgX = (mx - this.panX) / this.zoom;
      const svgY = (my - this.panY) / this.zoom;
      this.coordDisplay.textContent = `x: ${svgX.toFixed(1)}  y: ${svgY.toFixed(
        1
      )}`;
      if (this.onMouseCoords) this.onMouseCoords(svgX, svgY);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.panStart.x;
      this.panY = e.clientY - this.panStart.y;
      this._updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewport.classList.remove('panning');
      }
    });
  }

  _updateTransform() {
    this.svgContainer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    this._updateViewBoxOutline();

    // Notify external tools that the view matrix changed
    if (this.onViewChange) this.onViewChange();

    // Internal simple control points (View only)
    if (this.showControlPoints) this._renderControlPoints();
  }

  _updateViewBoxOutline() {
    if (!this.svgElement || !this.showViewBox) {
      this.viewBoxOutline.classList.add('hidden');
      return;
    }
    const vb = this.svgElement.getAttribute('viewBox');
    if (!vb) {
      this.viewBoxOutline.classList.add('hidden');
      return;
    }
    this.viewBoxOutline.classList.remove('hidden');
    const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number);
    const label = this.viewBoxOutline.querySelector('.svgh-viewbox-label');
    if (label) label.textContent = `viewBox: ${vx} ${vy} ${vw} ${vh}`;

    this.viewBoxOutline.style.left = `${this.panX + vx * this.zoom}px`;
    this.viewBoxOutline.style.top = `${this.panY + vy * this.zoom}px`;
    this.viewBoxOutline.style.width = `${vw * this.zoom}px`;
    this.viewBoxOutline.style.height = `${vh * this.zoom}px`;
  }

  setSvg(svgElement) {
    this.svgElement = svgElement;
    this.svgContainer.innerHTML = '';

    // We create a wrapper for the user content so we can append overlays siblings inside the transformed container
    this.contentWrapper = makeElement('div', {
      className: 'svgh-content-wrapper',
    });
    this.svgContainer.appendChild(this.contentWrapper);

    if (svgElement) {
      const display = svgElement.cloneNode(true);
      display.removeAttribute('width');
      display.removeAttribute('height');
      display.style.overflow = 'visible';
      const vb = display.getAttribute('viewBox');
      if (vb) {
        const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number);
        display.setAttribute('width', vw);
        display.setAttribute('height', vh);
        display.style.display = 'block';
        display.style.position = 'absolute';
        display.style.left = `${vx}px`;
        display.style.top = `${vy}px`;
      } else {
        display.setAttribute('width', 100);
        display.setAttribute('height', 100);
        display.style.display = 'block';
      }
      this.contentWrapper.appendChild(display);
    }

    this._updateViewBoxOutline();

    // Notify tool to re-bind if needed
    if (this.onViewChange) this.onViewChange();
  }

  fitToView() {
    if (!this.svgElement) return;
    const vb = this.svgElement.getAttribute('viewBox');
    if (!vb) return;
    const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number);
    const rect = this.viewport.getBoundingClientRect();
    const margin = 60;
    const availW = rect.width - margin * 2;
    const availH = rect.height - margin * 2;
    this.zoom = Math.min(availW / vw, availH / vh, 5);
    this.panX = (rect.width - vw * this.zoom) / 2 - vx * this.zoom;
    this.panY = (rect.height - vh * this.zoom) / 2 - vy * this.zoom;
    this._updateTransform();
    if (this.onZoomChange) this.onZoomChange(this.zoom);
  }

  setZoom(z) {
    const rect = this.viewport.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const worldX = (cx - this.panX) / this.zoom;
    const worldY = (cy - this.panY) / this.zoom;
    this.zoom = Math.max(0.05, Math.min(50, z));
    this.panX = cx - worldX * this.zoom;
    this.panY = cy - worldY * this.zoom;
    this._updateTransform();
    if (this.onZoomChange) this.onZoomChange(this.zoom);
  }

  toggleViewBox(show) {
    this.showViewBox = show;
    this._updateViewBoxOutline();
  }

  toggleAnimateBackground(animate) {
    this.animateBackground = animate;
    if (animate) {
      this.checkerBg.classList.remove('animated');
      this._startCircularAnimation();
    } else {
      this._stopCircularAnimation();
    }
  }

  getZoom() {
    return this.zoom;
  }

  setGridColors(color1, color2) {
    this.gridColor1 = color1;
    this.gridColor2 = color2;
    this._updateCheckerColors();
  }

  _updateCheckerColors() {
    const c1 = this.gridColor1;
    const c2 = this.gridColor2;
    this.checkerBg.style.backgroundImage =
      `linear-gradient(45deg, ${c1} 25%, transparent 25%),` +
      `linear-gradient(-45deg, ${c1} 25%, transparent 25%),` +
      `linear-gradient(45deg, transparent 75%, ${c1} 75%),` +
      `linear-gradient(-45deg, transparent 75%, ${c1} 75%)`;
    this.checkerBg.style.backgroundColor = c2;
  }

  _startCircularAnimation() {
    this._stopCircularAnimation();
    this._animStart = performance.now();
    const radius = 15;
    const speed = 0.003;
    const tick = (now) => {
      const t = (now - this._animStart) * speed;
      const offX = Math.cos(t) * radius;
      const offY = Math.sin(t) * radius;
      this.checkerBg.style.backgroundPosition = `${offX}px ${offY}px, ${offX}px ${
        offY + 10
      }px, ${offX + 10}px ${offY - 10}px, ${offX - 10}px ${offY}px`;
      this._animFrame = requestAnimationFrame(tick);
    };
    this._animFrame = requestAnimationFrame(tick);
  }

  _stopCircularAnimation() {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
    this.checkerBg.style.backgroundPosition = '';
  }

  toggleControlPoints(show) {
    this.showControlPoints = show;
    this._renderControlPoints();
  }

  _renderControlPoints() {
    this.cpOverlay.innerHTML = '';
    if (!this.showControlPoints || !this.svgElement) return;

    const displaySvg = this.svgContainer.querySelector('svg');
    if (!displaySvg) return;

    const anchorColor = '#f6ad55';
    const cpColor = '#9f7aea';
    const lineColor = 'rgba(159,122,234,0.4)';
    const anchorR = 3.5;
    const cpR = 2;

    const zoom = this.zoom;
    const panX = this.panX;
    const panY = this.panY;

    const toScreen = (x, y) => {
      return { sx: panX + x * zoom, sy: panY + y * zoom };
    };

    const addCircle = (x, y, r, color) => {
      const { sx, sy } = toScreen(x, y);
      this.cpOverlay.appendChild(
        makeElement('svg:circle', {
          cx: String(sx),
          cy: String(sy),
          r: String(r),
          fill: color,
          opacity: '0.85',
        })
      );
    };

    const addLine = (x1, y1, x2, y2) => {
      const s1 = toScreen(x1, y1);
      const s2 = toScreen(x2, y2);
      this.cpOverlay.appendChild(
        makeElement('svg:line', {
          x1: String(s1.sx),
          y1: String(s1.sy),
          x2: String(s2.sx),
          y2: String(s2.sy),
          stroke: lineColor,
          'stroke-width': '1',
          'stroke-dasharray': '3 2',
        })
      );
    };

    const processPath = (pathEl) => {
      const d = pathEl.getAttribute('d');
      if (!d) return;
      const segments = SvgTransformResolver.parsePathToAbsolute(d);

      let prevX = 0,
        prevY = 0;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];

        if (seg.type === 'Z') continue;

        if (seg.type === 'C') {
          addLine(prevX, prevY, seg.x1, seg.y1);
          addCircle(seg.x1, seg.y1, cpR, cpColor);

          addLine(seg.x, seg.y, seg.x2, seg.y2);
          addCircle(seg.x2, seg.y2, cpR, cpColor);

          addCircle(seg.x, seg.y, anchorR, anchorColor);
          prevX = seg.x;
          prevY = seg.y;
        } else if (seg.type === 'Q') {
          addLine(prevX, prevY, seg.x1, seg.y1);
          addLine(seg.x, seg.y, seg.x1, seg.y1);
          addCircle(seg.x1, seg.y1, cpR, cpColor);

          addCircle(seg.x, seg.y, anchorR, anchorColor);
          prevX = seg.x;
          prevY = seg.y;
        } else if (seg.type === 'S') {
          addLine(seg.x, seg.y, seg.x2, seg.y2);
          addCircle(seg.x2, seg.y2, cpR, cpColor);

          addCircle(seg.x, seg.y, anchorR, anchorColor);
          prevX = seg.x;
          prevY = seg.y;
        } else if (seg.x !== undefined && seg.y !== undefined) {
          addCircle(seg.x, seg.y, anchorR, anchorColor);
          prevX = seg.x;
          prevY = seg.y;
        }
      }
    };

    const processCircles = (rootEl) => {
      rootEl.querySelectorAll('circle').forEach((el) => {
        const cx = parseFloat(el.getAttribute('cx')) || 0;
        const cy = parseFloat(el.getAttribute('cy')) || 0;
        addCircle(cx, cy, anchorR, anchorColor);
      });
    };

    const processEllipses = (rootEl) => {
      rootEl.querySelectorAll('ellipse').forEach((el) => {
        const cx = parseFloat(el.getAttribute('cx')) || 0;
        const cy = parseFloat(el.getAttribute('cy')) || 0;
        addCircle(cx, cy, anchorR, anchorColor);
      });
    };

    const processLines = (rootEl) => {
      rootEl.querySelectorAll('line').forEach((el) => {
        const x1 = parseFloat(el.getAttribute('x1')) || 0;
        const y1 = parseFloat(el.getAttribute('y1')) || 0;
        const x2 = parseFloat(el.getAttribute('x2')) || 0;
        const y2 = parseFloat(el.getAttribute('y2')) || 0;
        addCircle(x1, y1, anchorR, anchorColor);
        addCircle(x2, y2, anchorR, anchorColor);
      });
    };

    const processPolys = (rootEl) => {
      rootEl.querySelectorAll('polyline, polygon').forEach((el) => {
        const pts = (el.getAttribute('points') || '')
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        for (let j = 0; j < pts.length - 1; j += 2) {
          addCircle(pts[j], pts[j + 1], anchorR, anchorColor);
        }
      });
    };

    const processRects = (rootEl) => {
      rootEl.querySelectorAll('rect').forEach((el) => {
        const x = parseFloat(el.getAttribute('x')) || 0;
        const y = parseFloat(el.getAttribute('y')) || 0;
        const w = parseFloat(el.getAttribute('width')) || 0;
        const h = parseFloat(el.getAttribute('height')) || 0;
        addCircle(x, y, anchorR, anchorColor);
        addCircle(x + w, y, anchorR, anchorColor);
        addCircle(x + w, y + h, anchorR, anchorColor);
        addCircle(x, y + h, anchorR, anchorColor);
      });
    };

    displaySvg.querySelectorAll('path').forEach(processPath);
    processCircles(displaySvg);
    processEllipses(displaySvg);
    processLines(displaySvg);
    processPolys(displaySvg);
    processRects(displaySvg);
  }
}

