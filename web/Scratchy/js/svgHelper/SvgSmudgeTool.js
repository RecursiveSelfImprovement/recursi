
class SvgSmudgeTool {
  constructor(canvasView) {
    this.canvasView = canvasView;
    this.active = false;
    this.enabled = false;

    this.brushEnabled = true; // Mode: Brush
    this.pointsMode = false; // Mode: Points (Edit)

    this.innerRadiusPct = 5;
    this.outerRadiusPct = 10;

    this.strength = 0.5;
    this.mouseSensitivity = 1.0;

    this.cursorOverlay = null;
    this.pointsOverlayGroup = null;

    this.lastSvgX = 0;
    this.lastSvgY = 0;

    this.heldPoint = null;
    this.hoveredPoint = null;

    this.geometryCache = new Map();
    this.visualsCache = [];

    this.onSmudgeStart = null;
    this.onSmudgeApplied = null;

    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundWheel = this._onWheel.bind(this);
    this._boundKeyDown = this._onKeyDown.bind(this);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;

    // 1. Hide Canvas View points immediately
    this._suppressCanvasPoints();

    // 2. AUTO-FLATTEN TRANSFORMS so logic works
    if (this.canvasView.svgElement) {
      // Check for transforms or shapes that need conversion
      const needsFlatten =
        this.canvasView.svgElement.querySelector('[transform]') ||
        this.canvasView.svgElement.querySelector(
          'rect, circle, ellipse, line, polyline, polygon'
        );

      if (needsFlatten) {
        // Resolve transforms
        const flattened = SvgTransformResolver.resolveAllTransforms(
          this.canvasView.svgElement
        );
        // Convert primitives (rect, circle) to paths
        flattened
          .querySelectorAll('rect, circle, ellipse, line, polyline, polygon')
          .forEach((el) => {
            const d = SvgTransformResolver.convertShapeToPath(el);
            if (d) SvgTransformResolver._replaceWithPath(el, d);
          });

        this.canvasView.setSvg(flattened);
        // We notify the parent tool that we modified the SVG so it can update state
        if (this.onSmudgeApplied) this.onSmudgeApplied();
      }
    }

    // 3. Prepare Cache
    this._rebuildCache();

    const vp = this.canvasView.viewport;
    vp.addEventListener('mousedown', this._boundMouseDown);
    vp.addEventListener('wheel', this._boundWheel, { passive: false });
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('mousemove', this._boundMouseMove);
    window.addEventListener('mouseup', this._boundMouseUp);

    this._createOverlays();

    // 4. Force render if Canvas points were on, or if in points mode
    if (this.canvasView.showControlPoints || this.pointsMode) {
      this._renderEditablePoints();
    }

    this._updateVisuals();
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.active = false;
    this.heldPoint = null;
    this.hoveredPoint = null;
    this.geometryCache.clear();
    this.visualsCache = [];

    const vp = this.canvasView.viewport;
    vp.removeEventListener('mousedown', this._boundMouseDown);
    vp.removeEventListener('wheel', this._boundWheel);
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('mousemove', this._boundMouseMove);
    window.removeEventListener('mouseup', this._boundMouseUp);

    vp.style.cursor = '';
    this._removeOverlays();

    this._restoreCanvasPoints();
  }

  setBrushEnabled(isBrush) {
    this.brushEnabled = isBrush;
    this.pointsMode = !isBrush;
    this._updateVisuals();
  }

  setShowPoints(isPoints) {
    this.pointsMode = isPoints;
    this.brushEnabled = !isPoints;
    if (isPoints) {
      this._rebuildCache();
      this._renderEditablePoints();
    }
    this._updateVisuals();
  }

  onGlobalPointsToggle(show) {
    this._updateVisuals();
    if (this.enabled) this.canvasView.cpOverlay.style.display = 'none';
  }

  onViewChanged() {
    if (this.enabled) {
      this._refreshCursorSize();
      if (this.pointsOverlayGroup && !this.pointsOverlayGroup.isConnected) {
        if (this.canvasView.svgContainer) {
          this.canvasView.svgContainer.appendChild(this.pointsOverlayGroup);
        }
      }
      this._updateHandleVisuals();
    }
  }

  setRadiusPct(inner, outer) {
    this.innerRadiusPct = inner;
    this.outerRadiusPct = outer;
    this._refreshCursorSize();
  }

  setStrength(s) {
    this.strength = Math.max(0.01, Math.min(1, s));
  }

  setMouseSensitivity(val) {
    this.mouseSensitivity = val;
  }

  _suppressCanvasPoints() {
    if (this.canvasView.cpOverlay) {
      this.canvasView.cpOverlay.style.display = 'none';
    }
  }

  _restoreCanvasPoints() {
    if (this.canvasView.cpOverlay) {
      this.canvasView.cpOverlay.style.display = this.canvasView
        .showControlPoints
        ? 'block'
        : 'none';
    }
    if (this.canvasView.showControlPoints) {
      this.canvasView._renderControlPoints();
    }
  }

  _getViewBoxMetric() {
    const svg = this.canvasView.svgElement;
    if (!svg) return 1000;
    const vb = svg.getAttribute('viewBox');
    if (!vb) return 1000;
    const [x, y, w, h] = vb.split(/[\s,]+/).map(Number);
    return Math.max(w, h) || 1000;
  }

  _rebuildCache() {
    this.geometryCache.clear();
    const displaySvg = this.canvasView.svgContainer
      ? this.canvasView.svgContainer.querySelector('svg')
      : null;
    if (!displaySvg) return;

    displaySvg.querySelectorAll('path').forEach((el) => {
      const d = el.getAttribute('d');
      if (d) {
        this.geometryCache.set(el, {
          segments: SvgTransformResolver.parsePathToAbsolute(d),
        });
      }
    });
  }

  _updateVisuals() {
    if (this.cursorOverlay) {
      this.cursorOverlay.style.display =
        this.brushEnabled && !this.heldPoint ? 'block' : 'none';
    }

    const shouldShowPoints =
      this.pointsMode || this.canvasView.showControlPoints;

    if (this.pointsOverlayGroup) {
      this.pointsOverlayGroup.style.display = shouldShowPoints
        ? 'block'
        : 'none';
      if (shouldShowPoints && this.visualsCache.length === 0) {
        this._rebuildCache();
        this._renderEditablePoints();
      }
    }

    // Safety check to keep static points hidden
    if (this.canvasView.cpOverlay)
      this.canvasView.cpOverlay.style.display = 'none';

    if (this.enabled && this.canvasView.viewport) {
      this.canvasView.viewport.style.cursor = this.brushEnabled
        ? 'crosshair'
        : 'default';
    }
  }

  _createOverlays() {
    if (this.cursorOverlay) return;

    this.pointsOverlayGroup = makeElement('svg:svg', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'visible',
        width: '1px',
        height: '1px',
        pointerEvents: 'none',
        zIndex: 100,
      },
    });
    if (this.canvasView.svgContainer) {
      this.canvasView.svgContainer.appendChild(this.pointsOverlayGroup);
    }

    this.cursorOverlay = makeElement('svg:svg', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 101,
        overflow: 'visible',
      },
    });

    this.cursorInnerCircle = makeElement('svg:circle', {
      cx: '-999',
      cy: '-999',
      r: '10',
      fill: 'none',
      stroke: 'rgba(79,209,197,0.8)',
      'stroke-width': '2',
      'stroke-dasharray': '4 3',
    });
    this.cursorOuterCircle = makeElement('svg:circle', {
      cx: '-999',
      cy: '-999',
      r: '20',
      fill: 'none',
      stroke: 'rgba(99,179,237,0.6)',
      'stroke-width': '1.5',
      'stroke-dasharray': '6 4',
    });

    this.cursorOverlay.appendChild(this.cursorOuterCircle);
    this.cursorOverlay.appendChild(this.cursorInnerCircle);
    this.canvasView.viewport.appendChild(this.cursorOverlay);

    this._refreshCursorSize();
  }

  _removeOverlays() {
    if (this.cursorOverlay) {
      this.cursorOverlay.remove();
      this.cursorOverlay = null;
    }
    if (this.pointsOverlayGroup) {
      this.pointsOverlayGroup.remove();
      this.pointsOverlayGroup = null;
    }
  }

  _renderEditablePoints() {
    if (!this.pointsOverlayGroup) return;
    this.pointsOverlayGroup.innerHTML = '';
    this.visualsCache = [];

    const anchorStyle = {
      fill: '#f6ad55',
      stroke: '#000',
      strokeWidth: 1,
      r: 4,
    };
    const handleStyle = {
      fill: '#9f7aea',
      stroke: '#000',
      strokeWidth: 1,
      r: 3,
    };
    const lineStyle = { stroke: '#6b46c1', strokeWidth: 1 };

    const zoom = this.canvasView.zoom || 1;
    const scale = 1 / zoom;

    // SCALED DASH ARRAY: Keep dashes readable at any zoom level
    const dashVal = `${3 * scale} ${2 * scale}`;

    const createDot = (x, y, style, context, isHandle = false) => {
      const el = makeElement('svg:circle', {
        cx: String(x),
        cy: String(y),
        r: String(style.r * scale),
        fill: style.fill,
        stroke: style.stroke,
        'stroke-width': String(style.strokeWidth * scale),
        style: { cursor: 'pointer', pointerEvents: 'all' },
      });
      el._toolContext = context;
      el._baseR = style.r;
      el._baseStroke = style.strokeWidth;

      el.addEventListener('mouseenter', () => (this.hoveredPoint = context));
      el.addEventListener('mouseleave', () => {
        if (this.hoveredPoint === context) this.hoveredPoint = null;
      });

      this.pointsOverlayGroup.appendChild(el);
      this.visualsCache.push({
        el,
        type: isHandle ? 'handle' : 'anchor',
        context,
      });
      return el;
    };

    const createLine = (x1, y1, x2, y2) => {
      const el = makeElement('svg:line', {
        x1: String(x1),
        y1: String(y1),
        x2: String(x2),
        y2: String(y2),
        stroke: lineStyle.stroke,
        'stroke-width': String(lineStyle.strokeWidth * scale),
        'stroke-dasharray': dashVal,
        style: { pointerEvents: 'none', opacity: '0.6' },
      });
      el._baseStroke = lineStyle.strokeWidth;
      this.pointsOverlayGroup.insertBefore(
        el,
        this.pointsOverlayGroup.firstChild
      );
      return el;
    };

    for (const [svgEl, data] of this.geometryCache) {
      const segments = data.segments;
      let lastX = 0,
        lastY = 0;

      segments.forEach((seg, i) => {
        if (i > 0) {
          const prev = segments[i - 1];
          if (prev.x !== undefined) {
            lastX = prev.x;
            lastY = prev.y;
          } else if (prev.type === 'Z') {
            for (let k = i - 1; k >= 0; k--)
              if (segments[k].type === 'M') {
                lastX = segments[k].x;
                lastY = segments[k].y;
                break;
              }
          }
        } else if (seg.type !== 'M') {
          lastX = 0;
          lastY = 0;
        }

        if (seg.x !== undefined && seg.y !== undefined) {
          createDot(seg.x, seg.y, anchorStyle, {
            el: svgEl,
            index: i,
            type: 'anchor',
          });
        }

        if (seg.type === 'C') {
          const l1 = createLine(lastX, lastY, seg.x1, seg.y1);
          const d1 = createDot(
            seg.x1,
            seg.y1,
            handleStyle,
            { el: svgEl, index: i, sub: 1, type: 'handle' },
            true
          );
          d1._lineRef = l1;

          const l2 = createLine(seg.x, seg.y, seg.x2, seg.y2);
          const d2 = createDot(
            seg.x2,
            seg.y2,
            handleStyle,
            { el: svgEl, index: i, sub: 2, type: 'handle' },
            true
          );
          d2._lineRef = l2;
        } else if (seg.type === 'Q') {
          const l1 = createLine(lastX, lastY, seg.x1, seg.y1);
          const d1 = createDot(
            seg.x1,
            seg.y1,
            handleStyle,
            { el: svgEl, index: i, sub: 1, type: 'handle' },
            true
          );
          d1._lineRef = l1;
          const l2 = createLine(seg.x1, seg.y1, seg.x, seg.y);
          d1._lineRef2 = l2;
        } else if (seg.type === 'S') {
          const l2 = createLine(seg.x, seg.y, seg.x2, seg.y2);
          const d2 = createDot(
            seg.x2,
            seg.y2,
            handleStyle,
            { el: svgEl, index: i, sub: 2, type: 'handle' },
            true
          );
          d2._lineRef = l2;
        }

        if (seg.x !== undefined) {
          lastX = seg.x;
          lastY = seg.y;
        }
      });
    }
  }

  _updateHandleVisuals() {
    if (!this.pointsOverlayGroup) return;
    const zoom = this.canvasView.zoom || 1;
    const scale = 1 / zoom;
    const dashVal = `${3 * scale} ${2 * scale}`;

    for (const item of this.visualsCache) {
      const el = item.el;
      if (el._baseR) {
        el.setAttribute('r', String(el._baseR * scale));
        el.setAttribute('stroke-width', String(el._baseStroke * scale));
      }
      if (el._lineRef) {
        el._lineRef.setAttribute(
          'stroke-width',
          String(el._lineRef._baseStroke * scale)
        );
        el._lineRef.setAttribute('stroke-dasharray', dashVal);
      }
      if (el._lineRef2) {
        el._lineRef2.setAttribute(
          'stroke-width',
          String(el._lineRef2._baseStroke * scale)
        );
        el._lineRef2.setAttribute('stroke-dasharray', dashVal);
      }
    }
  }

  _screenToSvg(clientX, clientY) {
    const rect = this.canvasView.viewport.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const svgX = (mx - this.canvasView.panX) / this.canvasView.zoom;
    const svgY = (my - this.canvasView.panY) / this.canvasView.zoom;
    return { x: svgX, y: svgY };
  }

  _refreshCursorSize() {
    if (!this.cursorInnerCircle) return;
    const metric = this._getViewBoxMetric();
    const zoom = this.canvasView.zoom;

    this.innerRadiusWorld = (this.innerRadiusPct / 100) * metric;
    this.outerRadiusWorld = (this.outerRadiusPct / 100) * metric;

    this.cursorInnerCircle.setAttribute('r', this.innerRadiusWorld * zoom);
    this.cursorOuterCircle.setAttribute('r', this.outerRadiusWorld * zoom);
  }

  _updateOverlayPositions() {
    for (const item of this.visualsCache) {
      const { el, context } = item;
      const data = this.geometryCache.get(context.el);
      if (!data) continue;
      const seg = data.segments[context.index];

      let x, y;
      if (context.type === 'anchor') {
        x = seg.x;
        y = seg.y;
      } else {
        if (context.sub === 1) {
          x = seg.x1;
          y = seg.y1;
        } else {
          x = seg.x2;
          y = seg.y2;
        }
      }

      el.setAttribute('cx', x);
      el.setAttribute('cy', y);

      if (context.type === 'handle') {
        if (el._lineRef) {
          el._lineRef.setAttribute('x2', x);
          el._lineRef.setAttribute('y2', y);

          let ax, ay;
          if (context.sub === 1) {
            const prevIndex = this._getPrevIndex(data.segments, context.index);
            if (prevIndex >= 0) {
              const prev = data.segments[prevIndex];
              ax = prev.x;
              ay = prev.y;
            } else if (data.segments[0].type === 'M') {
              ax = data.segments[0].x;
              ay = data.segments[0].y;
            }
          } else {
            ax = seg.x;
            ay = seg.y;
          }

          if (ax !== undefined) {
            el._lineRef.setAttribute('x1', ax);
            el._lineRef.setAttribute('y1', ay);
          }
        }
        if (el._lineRef2) {
          el._lineRef2.setAttribute('x1', x);
          el._lineRef2.setAttribute('y1', y);
          el._lineRef2.setAttribute('x2', seg.x);
          el._lineRef2.setAttribute('y2', seg.y);
        }
      }
    }
  }

  _getPrevIndex(segments, i) {
    if (i > 0) return i - 1;
    const last = segments[segments.length - 1];
    if (last.type === 'Z') return segments.length - 2;
    return -1;
  }

  _getNextIndex(segments, i) {
    if (i < segments.length - 1) {
      if (segments[i + 1].type === 'Z') return 0;
      return i + 1;
    }
    return -1;
  }

  _onMouseDown(e) {
    if (!this.enabled) return;

    // Force refresh cache on mouse down to ensure we are aligned with visual DOM
    // This fixes the "confused state" where points don't align with visuals.
    if (!this.heldPoint && !this.active) {
      this._rebuildCache();
    }

    if (this.heldPoint) {
      e.preventDefault();
      e.stopPropagation();
      this.heldPoint = null;
      this._commitChanges();
      return;
    }

    if (
      (this.pointsMode || this.canvasView.showControlPoints) &&
      this.hoveredPoint
    ) {
      e.preventDefault();
      e.stopPropagation();
      if (this.onSmudgeStart) this.onSmudgeStart();
      this.heldPoint = this.hoveredPoint;
      this.active = false;
      return;
    }

    if (this.brushEnabled) {
      if (e.altKey || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      if (this.onSmudgeStart) this.onSmudgeStart();
      this.active = true;
      const pos = this._screenToSvg(e.clientX, e.clientY);
      this.lastSvgX = pos.x;
      this.lastSvgY = pos.y;
    }
  }

  _onMouseMove(e) {
    this._positionCursor(e.clientX, e.clientY);

    if (this.heldPoint) {
      e.preventDefault();
      const pos = this._screenToSvg(e.clientX, e.clientY);
      if (this.heldPoint.type === 'handle' && (e.ctrlKey || e.metaKey)) {
        this._dragHandleConstrained(this.heldPoint, pos.x, pos.y);
      } else {
        this._dragPoint(this.heldPoint, pos.x, pos.y);
      }
      return;
    }

    if (this.active && this.brushEnabled) {
      e.preventDefault();
      const pos = this._screenToSvg(e.clientX, e.clientY);
      const dx = pos.x - this.lastSvgX;
      const dy = pos.y - this.lastSvgY;

      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        this._applySmudge(this.lastSvgX, this.lastSvgY, dx, dy);
        this.lastSvgX = pos.x;
        this.lastSvgY = pos.y;
      }
    }
  }

  _onMouseUp(e) {
    if (this.active) {
      this.active = false;
      this._commitChanges();
    }
  }

  _onWheel(e) {
    const target = this.heldPoint || this.hoveredPoint;
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();
    const sens = this.mouseSensitivity;

    let dir = 0;
    if (Math.abs(e.deltaY) > 0.1) dir = Math.sign(e.deltaY);
    else if (Math.abs(e.deltaX) > 0.1) dir = Math.sign(e.deltaX);
    dir *= sens;

    if (e.shiftKey) {
      this._transformPointCluster(target, 'rotate', dir * 5);
    } else if (e.ctrlKey || e.metaKey) {
      this._transformPointCluster(target, 'scale', dir * 0.1);
    }
  }

  _onKeyDown(e) {
    if (e.key === 'Escape' && this.heldPoint) {
      this.heldPoint = null;
      this._rebuildCache();
      this._renderEditablePoints();
    }
  }

  _dragPoint(ctx, x, y) {
    const data = this.geometryCache.get(ctx.el);
    if (!data) return;
    const seg = data.segments[ctx.index];

    const currentX =
      ctx.type === 'anchor' ? seg.x : ctx.sub === 1 ? seg.x1 : seg.x2;
    const currentY =
      ctx.type === 'anchor' ? seg.y : ctx.sub === 1 ? seg.y1 : seg.y2;
    const dx = x - currentX;
    const dy = y - currentY;

    if (ctx.type === 'anchor') {
      // Rigid move: Anchor + attached handles
      seg.x = x;
      seg.y = y;
      if (seg.x2 !== undefined) {
        seg.x2 += dx;
        seg.y2 += dy;
      }

      const nextIndex = this._getNextIndex(data.segments, ctx.index);
      if (nextIndex >= 0) {
        const next = data.segments[nextIndex];
        if (next.x1 !== undefined) {
          next.x1 += dx;
          next.y1 += dy;
        }
      }
    } else {
      if (ctx.sub === 1) {
        seg.x1 = x;
        seg.y1 = y;
      } else {
        seg.x2 = x;
        seg.y2 = y;
      }
    }

    ctx.el.setAttribute(
      'd',
      SvgTransformResolver.serializePath(data.segments, 4)
    );
    this._updateOverlayPositions();
  }

  _dragHandleConstrained(ctx, targetX, targetY) {
    const data = this.geometryCache.get(ctx.el);
    const seg = data.segments[ctx.index];

    let ax, ay;
    if (ctx.sub === 2) {
      ax = seg.x;
      ay = seg.y;
    } else {
      const prevIndex = this._getPrevIndex(data.segments, ctx.index);
      if (prevIndex >= 0) {
        ax = data.segments[prevIndex].x;
        ay = data.segments[prevIndex].y;
      } else if (data.segments[0].type === 'M') {
        ax = data.segments[0].x;
        ay = data.segments[0].y;
      }
    }

    if (ax === undefined) return;

    const hx = ctx.sub === 1 ? seg.x1 : seg.x2;
    const hy = ctx.sub === 1 ? seg.y1 : seg.y2;
    const ex = hx - ax;
    const ey = hy - ay;
    const dx = targetX - ax;
    const dy = targetY - ay;

    const lenSq = ex * ex + ey * ey;
    if (lenSq < 0.000001) {
      if (ctx.sub === 1) {
        seg.x1 = targetX;
        seg.y1 = targetY;
      } else {
        seg.x2 = targetX;
        seg.y2 = targetY;
      }
    } else {
      const dot = dx * ex + dy * ey;
      const scale = dot / lenSq;
      const nx = ax + ex * scale;
      const ny = ay + ey * scale;
      if (ctx.sub === 1) {
        seg.x1 = nx;
        seg.y1 = ny;
      } else {
        seg.x2 = nx;
        seg.y2 = ny;
      }
    }

    ctx.el.setAttribute(
      'd',
      SvgTransformResolver.serializePath(data.segments, 4)
    );
    this._updateOverlayPositions();
  }

  _transformPointCluster(ctx, mode, amount) {
    const data = this.geometryCache.get(ctx.el);
    const seg = data.segments[ctx.index];

    let anchorX, anchorY;
    const handles = [];

    if (ctx.type === 'anchor') {
      anchorX = seg.x;
      anchorY = seg.y;
      if (seg.x2 !== undefined) handles.push({ seg: seg, fx: 'x2', fy: 'y2' });
      const nextIndex = this._getNextIndex(data.segments, ctx.index);
      if (nextIndex >= 0) {
        const next = data.segments[nextIndex];
        if (next.x1 !== undefined)
          handles.push({ seg: next, fx: 'x1', fy: 'y1' });
      }
    } else {
      if (ctx.sub === 2) {
        anchorX = seg.x;
        anchorY = seg.y;
        handles.push({ seg: seg, fx: 'x2', fy: 'y2' });
        const nextIndex = this._getNextIndex(data.segments, ctx.index);
        if (nextIndex >= 0) {
          const next = data.segments[nextIndex];
          if (next.x1 !== undefined)
            handles.push({ seg: next, fx: 'x1', fy: 'y1' });
        }
      } else {
        const prevIndex = this._getPrevIndex(data.segments, ctx.index);
        if (prevIndex >= 0) {
          const prev = data.segments[prevIndex];
          anchorX = prev.x;
          anchorY = prev.y;
          if (prev.x2 !== undefined)
            handles.push({ seg: prev, fx: 'x2', fy: 'y2' });
        } else if (data.segments[0].type === 'M') {
          anchorX = data.segments[0].x;
          anchorY = data.segments[0].y;
        }
        handles.push({ seg: seg, fx: 'x1', fy: 'y1' });
      }
    }

    if (anchorX === undefined || handles.length === 0) return;

    for (const h of handles) {
      const hx = h.seg[h.fx];
      const hy = h.seg[h.fy];
      const dx = hx - anchorX;
      const dy = hy - anchorY;

      let nx, ny;
      if (mode === 'rotate') {
        const rad = amount * (Math.PI / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        nx = anchorX + (dx * cos - dy * sin);
        ny = anchorY + (dx * sin + dy * cos);
      } else {
        const factor = 1 + amount;
        nx = anchorX + dx * factor;
        ny = anchorY + dy * factor;
      }

      h.seg[h.fx] = nx;
      h.seg[h.fy] = ny;
    }

    ctx.el.setAttribute(
      'd',
      SvgTransformResolver.serializePath(data.segments, 4)
    );
    this._updateOverlayPositions();
  }

  _applySmudge(cx, cy, dx, dy) {
    const rSqInner = this.innerRadiusWorld * this.innerRadiusWorld;
    const rSqOuter = this.outerRadiusWorld * this.outerRadiusWorld;

    let anyChanged = false;

    for (const [el, data] of this.geometryCache) {
      let changed = false;

      // We must track original positions of anchors before moving them in this frame
      // to calculate scaling correctly.
      // But smudge is iterative. We can just move anchors, then fix handles.

      // 1. Identify Anchors to move and calculate their displacement
      const anchorMoves = new Map(); // index -> {dx, dy}

      // Helper to calc displacement weight
      const getMove = (px, py) => {
        const dxp = px - cx;
        const dyp = py - cy;
        const distSq = dxp * dxp + dyp * dyp;
        if (distSq > rSqOuter) return null;
        let factor = 1;
        if (distSq > rSqInner) {
          const dist = Math.sqrt(distSq);
          const t =
            (dist - this.innerRadiusWorld) /
            (this.outerRadiusWorld - this.innerRadiusWorld);
          factor = (1 - t) * (1 - t);
        }
        return {
          dx: dx * factor * this.strength,
          dy: dy * factor * this.strength,
        };
      };

      data.segments.forEach((seg, i) => {
        if (seg.x !== undefined) {
          const m = getMove(seg.x, seg.y);
          if (m) anchorMoves.set(i, m);
        }
      });

      // 2. Apply moves to Anchors AND attached handles (Rigid Translation)
      anchorMoves.forEach((move, i) => {
        const seg = data.segments[i];

        // Move Anchor
        seg.x += move.dx;
        seg.y += move.dy;

        // Move Handle 2 (Incoming to this anchor)
        if (seg.x2 !== undefined) {
          seg.x2 += move.dx;
          seg.y2 += move.dy;
        }

        // Move Handle 1 of Next Segment (Outgoing from this anchor)
        const nextIndex = this._getNextIndex(data.segments, i);
        if (nextIndex >= 0) {
          const next = data.segments[nextIndex];
          if (next.x1 !== undefined) {
            next.x1 += move.dx;
            next.y1 += move.dy;
          }
        }

        changed = true;
      });

      // 3. Scaling Logic (Distance change between anchors)
      // For every segment, check if Start or End moved.
      // If so, scale the handles relative to the anchors.

      // Iterate segments that are CURVES (C, S, Q)
      data.segments.forEach((seg, i) => {
        if (seg.type !== 'C' && seg.type !== 'Q' && seg.type !== 'S') return;

        const prevIndex = this._getPrevIndex(data.segments, i);
        if (prevIndex < 0 && data.segments[0].type !== 'M') return;

        // Start Anchor Index (prev)
        const idxStart = prevIndex >= 0 ? prevIndex : 0;
        const idxEnd = i;

        const moveStart = anchorMoves.get(idxStart) || { dx: 0, dy: 0 };
        const moveEnd = anchorMoves.get(idxEnd) || { dx: 0, dy: 0 };

        // If neither moved, nothing to scale
        if (
          moveStart.dx === 0 &&
          moveStart.dy === 0 &&
          moveEnd.dx === 0 &&
          moveEnd.dy === 0
        )
          return;

        // Positions AFTER translation (Current in seg)
        const pStartNew = {
          x:
            idxStart === 0 && prevIndex < 0
              ? data.segments[0].x
              : data.segments[idxStart].x,
          y:
            idxStart === 0 && prevIndex < 0
              ? data.segments[0].y
              : data.segments[idxStart].y,
        };
        const pEndNew = { x: seg.x, y: seg.y };

        // Positions BEFORE translation
        const pStartOld = {
          x: pStartNew.x - moveStart.dx,
          y: pStartNew.y - moveStart.dy,
        };
        const pEndOld = {
          x: pEndNew.x - moveEnd.dx,
          y: pEndNew.y - moveEnd.dy,
        };

        const distOld = Math.hypot(
          pEndOld.x - pStartOld.x,
          pEndOld.y - pStartOld.y
        );
        const distNew = Math.hypot(
          pEndNew.x - pStartNew.x,
          pEndNew.y - pStartNew.y
        );

        if (distOld < 0.0001) return;
        const scale = distNew / distOld;
        if (Math.abs(scale - 1) < 0.001) return;

        // Scale Handles relative to their Anchors

        // Handle 1 (near Start)
        if (seg.x1 !== undefined) {
          const hx = seg.x1;
          const hy = seg.y1;
          // Vector from Start Anchor
          const vx = hx - pStartNew.x;
          const vy = hy - pStartNew.y;
          // Apply scale
          seg.x1 = pStartNew.x + vx * scale;
          seg.y1 = pStartNew.y + vy * scale;
        }

        // Handle 2 (near End)
        if (seg.x2 !== undefined) {
          const hx = seg.x2;
          const hy = seg.y2;
          // Vector from End Anchor
          const vx = hx - pEndNew.x;
          const vy = hy - pEndNew.y;
          // Apply scale
          seg.x2 = pEndNew.x + vx * scale;
          seg.y2 = pEndNew.y + vy * scale;
        }

        changed = true;
      });

      if (changed) {
        el.setAttribute(
          'd',
          SvgTransformResolver.serializePath(data.segments, 4)
        );
        anyChanged = true;
      }
    }

    // Always update visuals
    if (anyChanged) {
      this._updateOverlayPositions();
    }
  }

  _positionCursor(clientX, clientY) {
    if (!this.cursorOverlay) return;
    this._refreshCursorSize();

    const rect = this.canvasView.viewport.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    this.cursorInnerCircle.setAttribute('cx', String(x));
    this.cursorInnerCircle.setAttribute('cy', String(y));
    this.cursorOuterCircle.setAttribute('cx', String(x));
    this.cursorOuterCircle.setAttribute('cy', String(y));
  }

  _commitChanges() {
    if (this.onSmudgeApplied) this.onSmudgeApplied();
  }
}

