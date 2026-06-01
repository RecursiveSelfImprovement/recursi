class GlowDrawer {

  constructor(options = {}) {
    this.options = {
      target: document.body,
      onDeactivate: () => {},
      targets: [],
      initialMode: 'add',
      // scrollTarget option is no longer needed
      ...options,
    };

    this.isDrawing = false;
    this.currentPoints = [];
    this.undoStack = [];
    this.currentUndoBatch = new Map();
    this.level = 5;
    this.baseColor = '#00e0b0';
    this.drawMode = this.options.initialMode;
    this.minMoveDistance = 1;
    this.currentGlowPath = null;
    this.currentCorePath = null;
    this.drawContainer = null;
    this.cursorFollower = null; // Our new fake cursor element

    this.mouseDownPos = null;
    this.clickThreshold = 5;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    // _onWheel is no longer needed and has been removed
    this._updateCursorFollower = this._updateCursorFollower.bind(this);
  }

  activate(drawContainer = null) {
      this.drawContainer = drawContainer;
      this._createOverlay();
      this._addEventListeners();
      this._createCursorFollower();
      this.overlay.style.visibility = 'visible';

      // Clean up the old aggressive global style if it exists
      const oldStyle = document.getElementById('glow-drawer-cursor-hide');
      if (oldStyle) oldStyle.remove();

      // Inject the new scoped style
      let style = document.getElementById('glow-drawer-cursor-styles');
      if (!style) {
        style = document.createElement('style');
        style.id = 'glow-drawer-cursor-styles';
        style.textContent = `
          /* Only hide the cursor when this specific class is active on the body */
          body.glow-drawer-hide-cursor * { 
            cursor: none !important; 
          }
          
          /* Exceptions for toolbars and dialog headers so they remain usable */
          body.glow-drawer-hide-cursor .vis-tools-menu, 
          body.glow-drawer-hide-cursor .vis-tools-menu *, 
          body.glow-drawer-hide-cursor .glow-drawer-active-indicator, 
          body.glow-drawer-hide-cursor .glow-drawer-active-indicator * { 
            cursor: auto !important; 
          }
          
          body.glow-drawer-hide-cursor .vis-tools-menu button, 
          body.glow-drawer-hide-cursor .glow-drawer-active-indicator button,
          body.glow-drawer-hide-cursor .vis-tools-menu input, 
          body.glow-drawer-hide-cursor .vis-tools-menu select, 
          body.glow-drawer-hide-cursor .ps-panel *,
          body.glow-drawer-hide-cursor .uw-header, 
          body.glow-drawer-hide-cursor .uw-header * { 
            cursor: pointer !important; 
          }
        `;
        document.head.appendChild(style);
      }
    }

  setSegments(segments) {
    this.activeSegments = { ...this.activeSegments, ...segments };
  }

  deactivate() {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      if (this.paintIndicator) {
        this.paintIndicator.style.display = 'none';
      }
      this._removeEventListeners();
      this._removeCursorFollower();
      
      // Remove the hiding class globally on deactivate
      document.body.classList.remove('glow-drawer-hide-cursor');
      
      this.options.onDeactivate();
    }

  setColor(hexColor) {
    this.baseColor = hexColor;
    this._updateCurrentPathStyles();
    this._updateCursorFollowerStyle();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const lastBatch = this.undoStack.pop();
    for (const [widget, originalState] of lastBatch.entries()) {
      widget.setState(originalState, true);
    }
    if (this.isDrawing && this.currentGlowPath) {
      this.currentGlowPath.remove();
      this.currentCorePath.remove();
      this.isDrawing = false;
    }
    if (this.options.onUndoStackChange) {
      this.options.onUndoStackChange();
    }
  }

  _generateCursorSvg(level) {
    const glowWidth = 8 + level * 4;
    const coreWidth = 2 + level * 1;
    const radius = glowWidth / 2;
    const size = glowWidth + 8; // Padding for blur
    const center = size / 2;
    const activeColor = this.drawMode === 'add' ? this.baseColor : '#ff3355';
    const coreColor = this._palerColor(activeColor, 0.7);
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-cursor-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          </filter>
        </defs>
        <circle cx="${center}" cy="${center}" r="${radius}" fill="${activeColor}" opacity="0.6" filter="url(#glow-cursor-filter)"/>
        <circle cx="${center}" cy="${center}" r="${
      coreWidth / 2
    }" fill="${coreColor}" />
      </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  _createCursorFollower() {
    if (this.cursorFollower) return;
    this.cursorFollower = makeElement('div', {
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: '1000000000',
        display: 'none',
      },
    });
    this._updateCursorFollowerStyle();
    document.body.appendChild(this.cursorFollower);

    // Floating Active Indicator for Paint Mode
    if (!this.paintIndicator) {
      this.paintIndicator = makeElement(
        'div',
        {
          className: 'glow-drawer-active-indicator',
          style: {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20, 20, 24, 0.95)',
            border: '1px solid rgba(150, 180, 255, 0.3)',
            padding: '8px 16px',
            borderRadius: '20px',
            color: '#eef4ff',
            fontSize: '13px',
            fontWeight: 'bold',
            zIndex: 1000000,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            fontFamily: 'system-ui, sans-serif',
          },
        },
        [
          makeElement('span', {}, '🖌️ Paint Mode Active'),
          makeElement(
            'button',
            {
              style: {
                background: 'rgba(255,100,100,0.2)',
                border: '1px solid rgba(255,100,100,0.4)',
                color: '#ffdddd',
                padding: '4px 10px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
              },
              onclick: () => this.deactivate(),
            },
            'Turn Off'
          ),
        ]
      );
      document.body.appendChild(this.paintIndicator);
    } else {
      this.paintIndicator.style.display = 'flex';
    }
  }

  _updateCursorFollowerStyle() {
    if (!this.cursorFollower) return;
    const size = 8 + this.level * 4 + 8;
    this.cursorFollower.style.width = `${size}px`;
    this.cursorFollower.style.height = `${size}px`;
    this.cursorFollower.style.backgroundImage = `url(${this._generateCursorSvg(
      this.level
    )})`;
    // Center the follower on the cursor
    this.cursorFollower.style.marginLeft = `-${size / 2}px`;
    this.cursorFollower.style.marginTop = `-${size / 2}px`;
  }

  _removeCursorFollower() {
    if (this.cursorFollower) {
      this.cursorFollower.remove();
      this.cursorFollower = null;
    }
    // THE FIX: Always restore the cursor on the draw container.
    if (this.drawContainer) this.drawContainer.style.cursor = '';
    // The overlay is destroyed, so no need to clear its cursor.
  }

  _updateCursorFollower(e) {
      if (!this.cursorFollower) return;

      let isOverDrawArea = false;
      
      // Check if mouse is physically within the bounds of the target container
      if (this.drawContainer && this.drawContainer !== document.body) {
        const rect = this.drawContainer.getBoundingClientRect();
        isOverDrawArea =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
      } else {
        isOverDrawArea = true; // Global fallback
      }

      this.cursorFollower.style.display = isOverDrawArea ? 'block' : 'none';
      this.cursorFollower.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;

      // Dynamically toggle the native cursor based on whether we are in the draw area
      if (isOverDrawArea) {
        document.body.classList.add('glow-drawer-hide-cursor');
      } else {
        document.body.classList.remove('glow-drawer-hide-cursor');
      }
    }

  _createOverlay() {
    this.overlay = makeElement('svg:svg', {
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '2147483645', // High Z-Index to sit above most dialogs but below panel
        // *** THE SILVER BULLET FIX ***
        // This makes the overlay invisible to mouse events, allowing clicks,
        // hovers, and scrolls to pass through to the elements underneath.
        pointerEvents: 'none',
        visibility: 'hidden',
        cursor: 'default',
      },
    });

    // Hide the real cursor over the draw container, as our follower will be visible there.
    if (this.drawContainer) this.drawContainer.style.cursor = 'none';

    this.options.target.appendChild(this.overlay);
  }

  _addEventListeners() {
      // Bind mousedown specifically to the container or body, without the aggressive 'true' capture flag
      const target = this.drawContainer || document.body;
      target.addEventListener('mousedown', this._onMouseDown);
      window.addEventListener('mousemove', this._updateCursorFollower);
    }

  _removeEventListeners() {
      const target = this.drawContainer || document.body;
      target.removeEventListener('mousedown', this._onMouseDown);
      window.removeEventListener('mousemove', this._updateCursorFollower);
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('mouseup', this._onMouseUp);
    }

  _onMouseDown(e) {
      if (this.drawContainer) {
        const rect = this.drawContainer.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        ) {
          return;
        }
      }

      // FIX: Removed `.uw-dialog` and `.dialog-box` from the exclusion list!
      // Those blocked painting on floating trees. Now we only ignore actual buttons/headers.
      if (e.target.closest('button, select, input, .visibility-tools-menu, .file-tree-toolbar, .uw-header, .ps-panel')) {
        return;
      }

      if (e.button !== 0) return;
      this.isDrawing = true;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
      this.currentUndoBatch = new Map();
      this.currentPoints = [[e.clientX, e.clientY]];
      
      this.currentGlowPath = makeElement('svg:path');
      this.currentCorePath = makeElement('svg:path');
      this._updateCurrentPathStyles();
      
      this.overlay.appendChild(this.currentGlowPath);
      this.overlay.appendChild(this.currentCorePath);
      this._updatePathData();
      
      window.addEventListener('mousemove', this._onMouseMove);
      window.addEventListener('mouseup', this._onMouseUp);
      
      e.preventDefault();
      e.stopPropagation();
    }

  _onMouseMove(e) {
      if (!this.isDrawing) return;
      const lastPoint = this.currentPoints[this.currentPoints.length - 1];
      const newPoint = [e.clientX, e.clientY];
      const dist = Math.hypot(
        newPoint[0] - lastPoint[0],
        newPoint[1] - lastPoint[1]
      );
      if (dist > this.minMoveDistance) {
        this.currentPoints.push(newPoint);
        this._updatePathData();
        this._handleInteraction(e.clientX, e.clientY);
      }
      e.preventDefault();
      e.stopPropagation();
    }

  _onMouseUp(e) {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      const dist = Math.hypot(
        e.clientX - this.mouseDownPos.x,
        e.clientY - this.mouseDownPos.y
      );
      if (this.currentGlowPath) {
        this.currentGlowPath.remove();
        this.currentCorePath.remove();
        this.currentGlowPath = null;
        this.currentCorePath = null;
      }
      if (dist < this.clickThreshold) {
        this._handleInteraction(e.clientX, e.clientY, true);
      }
      this._pushUndo();
      this.currentPoints = [];
      this.mouseDownPos = null;
      
      // Cleanup drag listeners
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('mouseup', this._onMouseUp);
      
      e.preventDefault();
      e.stopPropagation();
    }

  _updatePathData() {
    const pathString = this._pointsToPathString(this.currentPoints);
    if (this.currentGlowPath)
      this.currentGlowPath.setAttribute('d', pathString);
    if (this.currentCorePath)
      this.currentCorePath.setAttribute('d', pathString);
  }

  _updateCurrentPathStyles() {
    if (!this.currentGlowPath || !this.currentCorePath) return;
    const glowWidth = 8 + this.level * 4;
    const coreWidth = 2 + this.level * 1;
    const glowBlur = 4 + this.level * 1.5;
    const coreBlur = 1 + this.level * 0.25;
    const activeColor = this.drawMode === 'add' ? this.baseColor : '#ff3355';
    const coreColor = this._palerColor(activeColor, 0.7);
    const commonAttributes = {
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    };
    Object.assign(this.currentGlowPath.style, {
      filter: `blur(${glowBlur}px)`,
    });
    Object.assign(this.currentCorePath.style, {
      filter: `blur(${coreBlur}px)`,
    });
    this.currentGlowPath.setAttribute('stroke', activeColor);
    this.currentGlowPath.setAttribute('stroke-width', glowWidth);
    this.currentGlowPath.setAttribute('stroke-opacity', 0.6);
    this.currentCorePath.setAttribute('stroke', coreColor);
    this.currentCorePath.setAttribute('stroke-width', coreWidth);
    this.currentCorePath.setAttribute('stroke-opacity', 1.0);
    for (const [key, value] of Object.entries(commonAttributes)) {
      this.currentGlowPath.setAttribute(key, value);
      this.currentCorePath.setAttribute(key, value);
    }
  }

  _pointsToPathString(points) {
    if (points.length === 0) return '';
    if (points.length === 1)
      return `M ${points[0][0]} ${points[0][1]} L ${points[0][0]} ${points[0][1]}`;
    let path = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i][0]} ${points[i][1]}`;
    }
    return path;
  }

  _palerColor(hex, factor) {
    factor = Math.max(0, Math.min(1, factor));
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.round(r + (255 - r) * factor);
    g = Math.round(g + (255 - g) * factor);
    b = Math.round(b + (255 - b) * factor);
    const toHex = (c) => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  setLevel(level) {
    this.level = Math.max(1, Math.min(9, level));
    this._updateCurrentPathStyles();
    this._updateCursorFollowerStyle();
  }

  changeLevel(delta) {
    this.setLevel(this.level + delta);
  }

  setMode(mode) {
    if (mode !== 'add' && mode !== 'subtract') return;
    this.drawMode = mode;
    this._updateCurrentPathStyles();
    this._updateCursorFollowerStyle();
  }

  toggleMode() {
    this.setMode(this.drawMode === 'add' ? 'subtract' : 'add');
  }

  selectAll() {
    const batch = new Map();
    const selectAllState = { code: true, signatures: true, docsLevel: 4 };
    for (const widget of this.options.targets) {
      batch.set(widget, { ...widget.state });
      widget.setState(selectAllState, true);
    }
    if (batch.size > 0) {
      this.undoStack.push(batch);
      for (const widget of batch.keys()) {
        if (widget.options.onChange) widget.options.onChange(widget.state);
      }
      if (this.options.onUndoStackChange) this.options.onUndoStackChange();
    }
  }

  selectNone() {
    const batch = new Map();
    const selectNoneState = { code: false, signatures: false, docsLevel: 0 };
    for (const widget of this.options.targets) {
      batch.set(widget, { ...widget.state });
      widget.setState(selectNoneState, true);
    }
    if (batch.size > 0) {
      this.undoStack.push(batch);
      for (const widget of batch.keys()) {
        if (widget.options.onChange) widget.options.onChange(widget.state);
      }
      if (this.options.onUndoStackChange) this.options.onUndoStackChange();
    }
  }

  _onWheel(e) {
    if (this.options.scrollTarget) {
      this.options.scrollTarget.scrollTop += e.deltaY;
      this.options.scrollTarget.scrollLeft += e.deltaX;
      e.preventDefault();
    }
  }

  _pushUndo() {
    if (this.currentUndoBatch.size > 0) {
      for (const widget of this.currentUndoBatch.keys()) {
        if (widget.options.onChange) widget.options.onChange(widget.state);
      }
      this.undoStack.push(this.currentUndoBatch);
      if (this.options.onUndoStackChange) this.options.onUndoStackChange();
    }
    this.currentUndoBatch = new Map();
  }

  _handleInteraction(x, y, isClick) {
    const widgets = Array.isArray(this.options.targets)
      ? this.options.targets
      : [];

    if (!widgets.length) return;

    if (isClick) {
      const elements = document.elementsFromPoint(x, y);
      const path = elements.find((el) => {
        return (
          el &&
          el.matches &&
          el.matches('svg[data-widget-path] > path[data-segment]')
        );
      });

      if (!path) return;

      const svg = path.closest('svg[data-widget-path]');
      const widget = widgets.find(
        (w) => w.file.path === svg.dataset.widgetPath
      );
      if (!widget) return;

      if (!this.currentUndoBatch.has(widget)) {
        this.currentUndoBatch.set(widget, { ...widget.state });
      }

      widget.toggleSegment(path.dataset.segment);
      return;
    }

    const brushR = 6 + this.level * 5;
    const widgetSet = new Set(widgets);

    for (const widget of widgets) {
      const svg = widget.getElement?.();
      if (!svg || !svg.getBoundingClientRect) continue;

      const svgRect = svg.getBoundingClientRect();

      if (
        x < svgRect.left - brushR ||
        x > svgRect.right + brushR ||
        y < svgRect.top - brushR ||
        y > svgRect.bottom + brushR
      ) {
        continue;
      }

      if (!widgetSet.has(widget)) continue;

      if (!this.currentUndoBatch.has(widget)) {
        this.currentUndoBatch.set(widget, { ...widget.state });
      }

      const newState = { ...widget.state };
      let changed = false;
      const isAdd = this.drawMode === 'add';

      const segPaths = svg.querySelectorAll('path[data-segment]');

      for (const segPath of segPaths) {
        const seg = segPath.dataset.segment;
        if (segPath.dataset.disabled === 'true') continue;

        if (this.activeSegments) {
          const filterKey = seg === 'header' ? 'sig' : seg;
          if (this.activeSegments[filterKey] === false) continue;
        }

        const sr = segPath.getBoundingClientRect();
        if (sr.width < 1 || sr.height < 1) continue;

        const cx = Math.max(sr.left, Math.min(sr.right, x));
        const cy = Math.max(sr.top, Math.min(sr.bottom, y));
        const dist = Math.hypot(x - cx, y - cy);

        if (dist > brushR) continue;

        const fraction = Math.max(0, Math.min(1, 1 - dist / brushR));
        const level = isAdd ? Math.ceil(fraction * 4) : 0;

        if (seg === 'code') {
          if (isAdd) {
            if (level > (newState.codeLevel || (newState.code ? 4 : 0))) {
              newState.code = true;
              newState.codeLevel = level;
              changed = true;
            }
          } else if (newState.code || newState.codeLevel) {
            newState.code = false;
            newState.codeLevel = 0;
            changed = true;
          }
        }

        if (seg === 'header' && fraction > 0.3) {
          if (newState.signatures !== isAdd) {
            newState.signatures = isAdd;
            changed = true;
          }
        }

        if (seg === 'docs') {
          if (isAdd) {
            if (level > (newState.docsLevel || 0)) {
              newState.docsLevel = level;
              changed = true;
            }
          } else if (newState.docsLevel > 0) {
            newState.docsLevel = 0;
            changed = true;
          }
        }
      }

      if (changed) {
        widget.setState(newState, true);
      }
    }
  }

}