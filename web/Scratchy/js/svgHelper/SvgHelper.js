
class SvgHelper {
  constructor() {
    this.targetElement = null;
    this.svgElement = null;
    this.fileName = 'untitled.svg';
    this.undoStack = [];
    this.canvasView = null;
    this.fileHandler = null;
    this.treeView = null;
    this.toolsPanel = null;
    this.zoomDisplay = null;
    this.statsDisplay = null;
    this.fileNameDisplay = null;
  }

  init(targetElement) {
    this.targetElement = targetElement;
    applyCss(SvgHelperStyles.getAll(), 'svgHelperStyles');
    this._buildLayout();
    this._initSubsystems();
    this._wireEvents();
  }

  _buildLayout() {
    const app = makeElement('div', { className: 'svgh-app' });

    const topbar = this._buildTopBar();
    const body = makeElement('div', { className: 'svgh-body' });

    this.leftPanelContainer = makeElement(
      'div',
      { className: 'svgh-left-panel' },
      makeElement(
        'div',
        { className: 'svgh-panel-header' },
        makeElement('span', 'Elements'),
        makeElement(
          'span',
          { className: 'svgh-stat-pill', id: 'svgh-stats' },
          makeElement('span', { className: 'num' }, '0'),
          ' elements'
        )
      )
    );
    this.leftPanelBody = makeElement('div', {
      style: {
        flex: '1',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '6px',
      },
    });
    this.leftPanelContainer.appendChild(this.leftPanelBody);

    this.canvasArea = makeElement('div', { className: 'svgh-canvas-area' });
    this.canvasToolbar = this._buildCanvasToolbar();
    this.canvasViewContainer = makeElement('div', {
      style: {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      },
    });
    this.canvasInfoBar = this._buildInfoBar();

    this.canvasArea.appendChild(this.canvasToolbar);
    this.canvasArea.appendChild(this.canvasViewContainer);
    this.canvasArea.appendChild(this.canvasInfoBar);

    this.rightPanelContainer = makeElement(
      'div',
      { className: 'svgh-right-panel' },
      makeElement('div', { className: 'svgh-panel-header' }, 'Tools')
    );

    body.appendChild(this.leftPanelContainer);
    body.appendChild(this.canvasArea);
    body.appendChild(this.rightPanelContainer);

    app.appendChild(topbar);
    app.appendChild(body);
    this.targetElement.appendChild(app);

    this.toastEl = makeElement('div', { className: 'svgh-toast' });
    this.targetElement.appendChild(this.toastEl);
  }

  _buildTopBar() {
    const logo = makeElement(
      'div',
      { className: 'svgh-topbar-logo' },
      makeElement(
        'svg:svg',
        {
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
        },
        makeElement('svg:path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
        makeElement('svg:path', { d: 'M2 17l10 5 10-5' }),
        makeElement('svg:path', { d: 'M2 12l10 5 10-5' })
      ),
      'SVG Editor'
    );

    this.fileNameDisplay = makeElement(
      'span',
      {
        style: {
          color: 'var(--text-muted)',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
        },
      },
      'No file loaded'
    );

    this.sendBackBtn = makeElement(
      'button',
      {
        className: 'svgh-btn svgh-btn-accent',
        style: { display: 'none', fontWeight: 'bold' },
        onclick: () => this._sendBackToParent(),
      },
      '✅ Send to Scratchy'
    );

    const actions = makeElement(
      'div',
      { className: 'svgh-topbar-actions' },
      this.sendBackBtn,
      makeElement(
        'button',
        {
          className: 'svgh-btn svgh-btn-primary',
          onclick: () => this.fileHandler.openFileDialog(),
        },
        makeElement(
          'svg:svg',
          {
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2',
          },
          makeElement('svg:path', {
            d: 'M5 19V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2z',
          })
        ),
        'Open SVG'
      ),
      makeElement(
        'button',
        {
          className: 'svgh-btn',
          onclick: () => this._undo(),
        },
        makeElement(
          'svg:svg',
          {
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2',
          },
          makeElement('svg:path', {
            d: 'M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4',
          })
        ),
        'Undo'
      )
    );

    return makeElement(
      'div',
      { className: 'svgh-topbar' },
      logo,
      this.fileNameDisplay,
      actions
    );
  }

  _buildCanvasToolbar() {
    this.zoomDisplay = makeElement(
      'span',
      {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          minWidth: '50px',
        },
      },
      '100%'
    );

    return makeElement(
      'div',
      { className: 'svgh-canvas-toolbar' },
      makeElement(
        'button',
        {
          className: 'svgh-btn svgh-btn-icon',
          title: 'Zoom In',
          onclick: () => this._zoomIn(),
        },
        makeElement(
          'svg:svg',
          {
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2',
          },
          makeElement('svg:line', { x1: '12', y1: '5', x2: '12', y2: '19' }),
          makeElement('svg:line', { x1: '5', y1: '12', x2: '19', y2: '12' })
        )
      ),
      makeElement(
        'button',
        {
          className: 'svgh-btn svgh-btn-icon',
          title: 'Zoom Out',
          onclick: () => this._zoomOut(),
        },
        makeElement(
          'svg:svg',
          {
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2',
          },
          makeElement('svg:line', { x1: '5', y1: '12', x2: '19', y2: '12' })
        )
      ),
      this.zoomDisplay,
      makeElement(
        'button',
        { className: 'svgh-btn', onclick: () => this.canvasView.fitToView() },
        'Fit'
      ),
      makeElement(
        'button',
        { className: 'svgh-btn', onclick: () => this.canvasView.setZoom(1) },
        '1:1'
      ),
      makeElement('div', { className: 'separator' }),
      makeElement(
        'button',
        {
          className: 'svgh-btn svgh-btn-primary',
          onclick: () => this._showDebugInfo(),
        },
        '🔍 Debug Info'
      ),
      makeElement('div', { className: 'separator' }),
      makeElement(
        'span',
        { style: { fontSize: '11px', color: 'var(--text-muted)' } },
        'Alt+drag to pan · Scroll to zoom'
      )
    );
  }

  _buildInfoBar() {
    this.infoViewBox = makeElement(
      'span',
      { className: 'svgh-infobar-value' },
      '—'
    );
    this.infoElements = makeElement(
      'span',
      { className: 'svgh-infobar-value' },
      '0'
    );
    this.infoZoom = makeElement(
      'span',
      { className: 'svgh-infobar-value' },
      '100%'
    );

    return makeElement(
      'div',
      { className: 'svgh-canvas-infobar' },
      makeElement(
        'div',
        { className: 'svgh-infobar-group' },
        makeElement(
          'div',
          { className: 'svgh-infobar-item' },
          makeElement('span', { className: 'svgh-infobar-label' }, 'viewBox:'),
          this.infoViewBox
        ),
        makeElement(
          'div',
          { className: 'svgh-infobar-item' },
          makeElement('span', { className: 'svgh-infobar-label' }, 'elements:'),
          this.infoElements
        )
      ),
      makeElement(
        'div',
        { className: 'svgh-infobar-group' },
        makeElement(
          'div',
          { className: 'svgh-infobar-item' },
          makeElement('span', { className: 'svgh-infobar-label' }, 'zoom:'),
          this.infoZoom
        )
      )
    );
  }

  _initSubsystems() {
    this.canvasView = new SvgCanvasView(this.canvasViewContainer);
    this.canvasView.init();
    this.canvasView.onZoomChange = (z) => this._updateZoomDisplay(z);

    this.canvasView.viewport.addEventListener('mousemove', (e) => {
      // Only position cursor if tool exists and brush is enabled
      if (
        this.smudgeTool &&
        this.smudgeTool.enabled &&
        this.smudgeTool.brushEnabled &&
        !this.smudgeTool.active
      ) {
        this.smudgeTool._positionCursor(e.clientX, e.clientY);
      }
    });

    this.fileHandler = new SvgFileHandler();
    this.fileHandler.init(document.body);

    this.treeView = new SvgElementTreeView(this.leftPanelBody);
    this.treeView.init();

    this.toolsPanel = new SvgToolsPanel(this.rightPanelContainer);
    this.toolsPanel.init();

    this.smudgeTool = new SvgSmudgeTool(this.canvasView);

    // Save undo state BEFORE we start mangling the paths
    this.smudgeTool.onSmudgeStart = () => {
      this._pushUndo();
    };

    this.smudgeTool.onSmudgeApplied = () => {
      // The canvasView displays a CLONE of the SVG. SmudgeTool edits the clone.
      // We must sync the mutated paths back to the source-of-truth SVG.
      const displaySvg = this.canvasView.contentWrapper.querySelector('svg');
      if (displaySvg && this.svgElement) {
        const displayPaths = Array.from(displaySvg.querySelectorAll('path'));
        const originalPaths = Array.from(
          this.svgElement.querySelectorAll('path')
        );
        if (displayPaths.length === originalPaths.length) {
          for (let i = 0; i < displayPaths.length; i++) {
            originalPaths[i].setAttribute(
              'd',
              displayPaths[i].getAttribute('d')
            );
          }
        }
      }
      this.treeView.setSvg(this.svgElement);
      this._updateStats();
    };

    this._showEmptyState();
  }

  _showEmptyState() {
    if (this.emptyState) return;
    this.emptyState = makeElement(
      'div',
      { className: 'svgh-empty-state' },
      makeElement(
        'svg:svg',
        {
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '1',
        },
        makeElement('svg:path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
        makeElement('svg:path', { d: 'M2 17l10 5 10-5' }),
        makeElement('svg:path', { d: 'M2 12l10 5 10-5' })
      ),
      makeElement('div', { className: 'title' }, 'No SVG Loaded'),
      makeElement(
        'div',
        { className: 'subtitle' },
        'Drag & drop an SVG file or click Open SVG'
      )
    );
    this.canvasViewContainer
      .querySelector('.svgh-canvas-viewport')
      .appendChild(this.emptyState);
  }

  _removeEmptyState() {
    if (this.emptyState) {
      this.emptyState.remove();
      this.emptyState = null;
    }
  }

  _wireEvents() {
    this.fileHandler.onFileLoaded = (svgEl, name, rawContent) => {
      if (this.svgElement) {
        this._showMergeDialog(svgEl, name);
      } else {
        this._loadSvg(svgEl, name);
      }
    };

    this.fileHandler.onError = (msg) => this._toast(msg, 'error');

    this.treeView.onElementSelect = (info) => {
      console.log('Selected:', info.pathString, info.attributes);
    };

    this.toolsPanel.onApplyTransforms = () => {
      if (!this.svgElement) return;
      this._pushUndo();
      this.svgElement = SvgTransformResolver.resolveAllTransforms(
        this.svgElement
      );
      this._refreshAll();
      this._toast('Transforms flattened', 'success');
    };

    this.toolsPanel.onApplyRounding = (precision) => {
      if (!this.svgElement) return;
      this._pushUndo();
      this.svgElement = SvgTransformResolver.roundPathCoordinates(
        this.svgElement,
        precision
      );
      this._refreshAll();
      this._toast(`Rounded to ${precision} decimals`, 'success');
    };

    this.toolsPanel.onSetViewBox = (x, y, w, h) => {
      if (!this.svgElement) return;
      this._pushUndo();
      this.svgElement.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
      this._refreshAll();
      this.canvasView.fitToView();
      this._toast('ViewBox updated', 'success');
    };

    this.toolsPanel.onRescaleViewBox = (x, y, w, h) => {
      if (!this.svgElement) return;
      this._pushUndo();
      this.svgElement = SvgTransformResolver.rescaleViewBox(this.svgElement, [
        x,
        y,
        w,
        h,
      ]);
      this._refreshAll();
      this.canvasView.fitToView();
      this._toast('Rescaled to new ViewBox', 'success');
    };

    this.toolsPanel.onAutoFitViewBox = () => {
      if (!this.svgElement) return;
      this._pushUndo();
      const resolved = SvgTransformResolver.resolveAllTransforms(
        this.svgElement
      );
      resolved
        .querySelectorAll('rect, circle, ellipse, line, polyline, polygon')
        .forEach((el) => {
          const d = SvgTransformResolver.convertShapeToPath(el);
          if (d) SvgTransformResolver._replaceWithPath(el, d);
        });
      const bb = SvgTransformResolver.getBoundingBoxOfPaths(resolved);
      if (bb.width <= 0 || bb.height <= 0) {
        this._toast('Cannot auto-fit: no geometry found', 'error');
        return;
      }
      const pad = 2;
      const vx = Math.floor(bb.x - pad);
      const vy = Math.floor(bb.y - pad);
      const vw = Math.ceil(bb.width + pad * 2);
      const vh = Math.ceil(bb.height + pad * 2);
      this.svgElement.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
      this._refreshAll();
      this.canvasView.fitToView();
      this._toast(`ViewBox auto-fitted: ${vx} ${vy} ${vw} ${vh}`, 'success');
    };

    this.toolsPanel.onFitContentToViewBox = (x, y, w, h, padding) => {
      if (!this.svgElement) return;
      this._pushUndo();
      const result = SvgTransformResolver.fitContentToViewBox(
        this.svgElement,
        [x, y, w, h],
        padding
      );
      if (!result) {
        this._toast('Cannot fit: no geometry found in SVG', 'error');
        return;
      }
      this.svgElement = result;
      this._refreshAll();
      this.canvasView.fitToView();
      this._toast(
        `Content fitted into viewBox: ${x} ${y} ${w} ${h}`,
        'success'
      );
    };

    this.toolsPanel.onRunUserScript = (code) => {
      if (!this.svgElement) return;
      this._pushUndo();
      try {
        this.svgElement = SvgElementIterator.runUserScript(
          this.svgElement,
          code
        );
        this._refreshAll();
        this._toast('Script executed', 'success');
      } catch (e) {
        this._toast('Script error: ' + e.message, 'error');
      }
    };

    this.toolsPanel.onConvertToAbsolute = () => {
      if (!this.svgElement) return;
      this._pushUndo();
      const clone = this.svgElement.cloneNode(true);
      clone.querySelectorAll('path').forEach((path) => {
        const d = path.getAttribute('d');
        if (!d) return;
        const parsed = SvgTransformResolver.parsePathToAbsolute(d);
        path.setAttribute('d', SvgTransformResolver.serializePath(parsed, 4));
      });
      this.svgElement = clone;
      this._refreshAll();
      this._toast('Converted to absolute coordinates', 'success');
    };

    this.toolsPanel.onConvertToRelative = () => {
      if (!this.svgElement) return;
      this._pushUndo();
      const clone = this.svgElement.cloneNode(true);
      clone.querySelectorAll('path').forEach((path) => {
        const d = path.getAttribute('d');
        if (!d) return;
        const parsed = SvgTransformResolver.parsePathToAbsolute(d);
        path.setAttribute('d', SvgTransformResolver.pathToRelative(parsed, 4));
      });
      this.svgElement = clone;
      this._refreshAll();
      this._toast('Converted to relative coordinates', 'success');
    };

    this.toolsPanel.onExportSvg = (mode) => {
      if (!this.svgElement) return;
      const svgString = this._serializeSvg();
      if (mode === 'download') {
        const blob = new Blob([svgString], {
          type: 'image/svg+xml;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this._toast('SVG downloaded', 'success');
      } else if (mode === 'clipboard') {
        navigator.clipboard
          .writeText(svgString)
          .then(() => {
            this._toast('SVG copied to clipboard', 'success');
          })
          .catch(() => {
            this._toast('Failed to copy to clipboard', 'error');
          });
      }
    };

    this.toolsPanel.onToggleViewBox = (show) => {
      this.canvasView.toggleViewBox(show);
    };

    this.toolsPanel.onToggleAnimBg = (animate) => {
      this.canvasView.toggleAnimateBackground(animate);
    };

    this.toolsPanel.onGridColorsChange = (color1, color2) => {
      this.canvasView.setGridColors(color1, color2);
    };

    // --- TWEAKER TOOL HANDLERS ---

    this.toolsPanel.onTweakerToggle = (enabled) => {
      if (!this.svgElement) {
        this._toast('Load an SVG first', 'error');
        return;
      }
      if (enabled) {
        this._pushUndo();
        if (this.smudgeTool) this.smudgeTool.enable();
        this._toast('Tweaker Tool Enabled', 'success');
      } else {
        if (this.smudgeTool) this.smudgeTool.disable();
        this._refreshAll();
        this._toast('Tweaker Tool Disabled', 'success');
      }
    };

    this.toolsPanel.onTweakerModeChange = (mode, isActive) => {
      if (!this.smudgeTool) return;

      if (mode === 'brush') {
        this.smudgeTool.setBrushEnabled(isActive);
      } else if (mode === 'points') {
        this.smudgeTool.setShowPoints(isActive);
      }
    };

    this.toolsPanel.onSmudgeRadiusChange = (inner, outer) => {
      if (this.smudgeTool) {
        this.smudgeTool.setRadiusPct(inner, outer);
      }
    };

    this.toolsPanel.onSmudgeStrengthChange = (s) => {
      if (this.smudgeTool) {
        this.smudgeTool.setStrength(s);
      }
    };

    this.toolsPanel.onTangencyGranularityChange = (deg) => {
      // Tangency snap not fully implemented but plumbing is there
    };

    this.toolsPanel.onWheelSpeedChange = (val) => {
      if (this.smudgeTool) {
        this.smudgeTool.setMouseSensitivity(val);
      }
    };

    // Handle view toggle separately if needed, but tool overrides
    this.toolsPanel.onToggleControlPoints = (show) => {
      this.canvasView.toggleControlPoints(show);
    };

    this._applyStoredSettings();

    // --- PostMessage Bridge ---
    window.addEventListener('message', (e) => {
      if (!e.data || typeof e.data.type !== 'string') return;
      if (e.data.type === 'SVG_HELPER_LOAD') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(e.data.svg, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (svgEl) {
          this._loadSvg(svgEl, e.data.filename || 'edited.svg');
          this.parentSource = e.source;
          this.parentOrigin = e.origin || '*';
          this.isBridgeMode = true;
          this.sendBackBtn.style.display = 'inline-flex';
          this._toast('SVG loaded from Scratchy', 'success');
        } else {
          this._toast('Failed to parse SVG from Scratchy', 'error');
        }
      }
    });

    const notifyReady = () => {
      try {
        if (window.opener)
          window.opener.postMessage({ type: 'SVG_HELPER_READY' }, '*');
      } catch (e) {}
      try {
        if (window.parent && window.parent !== window)
          window.parent.postMessage({ type: 'SVG_HELPER_READY' }, '*');
      } catch (e) {}
    };
    notifyReady();
  }

  _loadSvg(svgEl, fileName) {
    this._removeEmptyState();
    this.svgElement = svgEl;
    this.fileName = fileName || 'untitled.svg';
    this.undoStack = [];
    this.fileNameDisplay.textContent = this.fileName;
    this._refreshAll();
    this.canvasView.fitToView();
    this._toast(`Loaded: ${this.fileName}`, 'success');
  }

  _showMergeDialog(incomingSvg, name) {
      const content = makeElement(
        'div',
        { className: 'svgh-merge-dialog' },
        makeElement('h3', 'Load "' + name + '"'),
        makeElement(
          'p',
          'An SVG is already open. Would you like to replace it or merge the new file into the existing one?'
        ),
        makeElement(
          'div',
          { className: 'svgh-merge-dialog-buttons' },
          makeElement(
            'button',
            {
              className: 'svgh-btn',
              onclick: () => {
                dialog.close();
              },
            },
            'Cancel'
          ),
          makeElement(
            'button',
            {
              className: 'svgh-btn svgh-btn-primary',
              onclick: () => {
                this._loadSvg(incomingSvg, name);
                dialog.close();
              },
            },
            'Replace'
          ),
          makeElement(
            'button',
            {
              className: 'svgh-btn svgh-btn-accent',
              onclick: () => {
                this._pushUndo();
                incomingSvg.setAttribute(
                  'data-name',
                  name.replace(/\\.svg$/i, '')
                );
                this.svgElement = SvgFileHandler.mergeSvgs(
                  this.svgElement,
                  incomingSvg
                );
                this._refreshAll();
                this._toast('Merged: ' + name, 'success');
                dialog.close();
              },
            },
            'Merge'
          )
        )
      );

      const dialog = UITools.makeDialog({
        env: this.env,
        title: 'Open SVG',
        contentElement: content,
        buttons: [],
        size: [420, 260],
        noPadding: true,
      });
    }

  _refreshAll() {
    this.canvasView.setSvg(this.svgElement);
    this.treeView.setSvg(this.svgElement);
    this.toolsPanel.setSvg(this.svgElement);
    this._updateStats();
    this._updateInfoBar();
  }

  _updateStats() {
    if (!this.svgElement) return;
    const stats = SvgElementIterator.getStats(this.svgElement);
    const pill = document.getElementById('svgh-stats');
    if (pill) {
      pill.innerHTML = '';
      pill.appendChild(
        makeElement('span', { className: 'num' }, String(stats.total))
      );
      pill.appendChild(document.createTextNode(' elements'));
    }
    this.infoElements.textContent = String(stats.total);
  }

  _updateInfoBar() {
    if (!this.svgElement) return;
    const vb = this.svgElement.getAttribute('viewBox') || '—';
    this.infoViewBox.textContent = vb;
  }

  _updateZoomDisplay(z) {
    const pct = Math.round(z * 100) + '%';
    if (this.zoomDisplay) this.zoomDisplay.textContent = pct;
    if (this.infoZoom) this.infoZoom.textContent = pct;
    // Notify tool
    if (this.smudgeTool) this.smudgeTool.onViewChanged();
  }

  _zoomIn() {
    this.canvasView.setZoom(this.canvasView.getZoom() * 1.25);
  }

  _zoomOut() {
    this.canvasView.setZoom(this.canvasView.getZoom() / 1.25);
  }

  _pushUndo() {
    if (!this.svgElement) return;
    this.undoStack.push(this.svgElement.cloneNode(true));
    if (this.undoStack.length > 30) this.undoStack.shift();
  }

  _undo() {
    if (this.undoStack.length === 0) {
      this._toast('Nothing to undo', 'error');
      return;
    }
    this.svgElement = this.undoStack.pop();
    this._refreshAll();
    this._toast('Undone', 'success');
  }

  _serializeSvg() {
    if (!this.svgElement) return '';

    // FORCE ATTRIBUTES: Scratch and browsers prefer having explicit width/height
    // that matches the viewBox aspect ratio.
    const vb = this.svgElement.getAttribute('viewBox');
    if (vb) {
      const [x, y, w, h] = vb.split(/[\s,]+/).map(Number);
      if (!isNaN(w) && !isNaN(h)) {
        this.svgElement.setAttribute('width', String(w));
        this.svgElement.setAttribute('height', String(h));
      }
    }

    const s = new XMLSerializer();
    let str = s.serializeToString(this.svgElement);

    // Ensure namespace exists
    if (!str.includes('xmlns="http://www.w3.org/2000/svg"')) {
      str = str.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    return str;
  }

  _toast(message, type = '') {
    this.toastEl.textContent = message;
    this.toastEl.className = 'svgh-toast visible ' + type;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, 2500);
  }

  _showDebugInfo() {
      if (!this.svgElement) {
        this._toast('No SVG loaded', 'error');
        return;
      }

      const lines = [];
      const ln = (s) => lines.push(s);

      ln('═══════════════════════════════════');
      ln('SVG HELPER DEBUG INFO');
      ln('═══════════════════════════════════');
      ln('');

      const vb = this.svgElement.getAttribute('viewBox');
      ln('Current viewBox attribute: "' + (vb || 'NONE') + '"');
      if (vb) {
        const [vx, vy, vw, vh] = vb.split(/[\\s,]+/).map(Number);
        ln('  origin: (' + vx + ', ' + vy + ')');
        ln('  size: ' + vw + ' × ' + vh);
        ln('  center: (' + (vx + vw / 2) + ', ' + (vy + vh / 2) + ')');
        ln('  x range: ' + vx + ' to ' + (vx + vw));
        ln('  y range: ' + vy + ' to ' + (vy + vh));
      }

      ln('');
      ln('── Raw Element Bounding Box (before transform resolution) ──');
      const rawBB = SvgTransformResolver.getBoundingBoxOfPaths(this.svgElement);
      ln('  x: ' + rawBB.x.toFixed(2) + ', y: ' + rawBB.y.toFixed(2));
      ln('  w: ' + rawBB.width.toFixed(2) + ', h: ' + rawBB.height.toFixed(2));
      ln(
        '  center: (' + (rawBB.x + rawBB.width / 2).toFixed(2) + ', ' + (
          rawBB.y +
          rawBB.height / 2
        ).toFixed(2) + ')'
      );
      ln(
        '  x range: ' + rawBB.x.toFixed(2) + ' to ' + (rawBB.x + rawBB.width).toFixed(
          2
        )
      );
      ln(
        '  y range: ' + rawBB.y.toFixed(2) + ' to ' + (rawBB.y + rawBB.height).toFixed(
          2
        )
      );

      ln('');
      ln(
        '── Resolved Bounding Box (after flattening transforms + converting shapes) ──'
      );
      const resolved = SvgTransformResolver.resolveAllTransforms(this.svgElement);
      resolved
        .querySelectorAll('rect, circle, ellipse, line, polyline, polygon')
        .forEach((el) => {
          const d = SvgTransformResolver.convertShapeToPath(el);
          if (d) SvgTransformResolver._replaceWithPath(el, d);
        });
      const resBB = SvgTransformResolver.getBoundingBoxOfPaths(resolved);
      ln('  x: ' + resBB.x.toFixed(2) + ', y: ' + resBB.y.toFixed(2));
      ln('  w: ' + resBB.width.toFixed(2) + ', h: ' + resBB.height.toFixed(2));
      ln(
        '  center: (' + (resBB.x + resBB.width / 2).toFixed(2) + ', ' + (
          resBB.y +
          resBB.height / 2
        ).toFixed(2) + ')'
      );
      ln(
        '  x range: ' + resBB.x.toFixed(2) + ' to ' + (resBB.x + resBB.width).toFixed(
          2
        )
      );
      ln(
        '  y range: ' + resBB.y.toFixed(2) + ' to ' + (resBB.y + resBB.height).toFixed(
          2
        )
      );

      ln('');
      ln('── Element Summary ──');
      const countByTag = {};
      let totalElements = 0;
      const walkCount = (node) => {
        if (node.nodeType !== 1) return;
        const tag = node.tagName ? node.tagName.toLowerCase() : '?';
        if (
          !['svg', 'defs', 'style', 'title', 'desc', 'metadata'].includes(tag)
        ) {
          countByTag[tag] = (countByTag[tag] || 0) + 1;
          totalElements++;
        }
        for (const c of Array.from(node.childNodes)) walkCount(c);
      };
      walkCount(this.svgElement);
      ln('  Total: ' + totalElements);
      for (const [tag, count] of Object.entries(countByTag).sort(
        (a, b) => b[1] - a[1]
      )) {
        ln('  <' + tag + '>: ' + count);
      }

      ln('');
      ln('── Transform Check ──');
      let transformCount = 0;
      const walkTransforms = (node) => {
        if (node.nodeType !== 1) return;
        if (node.getAttribute('transform')) {
          transformCount++;
          const tag = node.tagName ? node.tagName.toLowerCase() : '?';
          ln('  <' + tag + '> transform="' + node.getAttribute('transform') + '"');
        }
        for (const c of Array.from(node.childNodes)) walkTransforms(c);
      };
      walkTransforms(this.svgElement);
      if (transformCount === 0) ln('  No transforms found (already flat)');

      ln('');
      ln('── First 5 Path d-attributes (truncated) ──');
      let pathCount = 0;
      const walkPaths = (node) => {
        if (node.nodeType !== 1) return;
        if (
          node.tagName &&
          node.tagName.toLowerCase() === 'path' &&
          pathCount < 5
        ) {
          const d = node.getAttribute('d') || '';
          const preview = d.length > 120 ? d.substring(0, 120) + '...' : d;
          ln('  [' + pathCount + '] ' + preview);
          pathCount++;
        }
        for (const c of Array.from(node.childNodes)) walkPaths(c);
      };
      walkPaths(this.svgElement);

      ln('');
      ln('── Serialized SVG size ──');
      const serialized = this._serializeSvg();
      ln('  ' + serialized.length + ' characters');

      const textarea = makeElement('textarea', {
        style: {
          width: '100%',
          height: '100%',
          minHeight: '400px',
          background: '#0c0e14',
          color: '#4fd1c5',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          border: 'none',
          outline: 'none',
          resize: 'none',
          padding: '12px',
          lineHeight: '1.6',
        },
        readOnly: true,
        value: lines.join('\\n'),
      });

      const dialog = UITools.makeDialog({
        env: this.env,
        title: 'SVG Debug Info',
        contentElement: textarea,
        buttons: [
          {
            label: 'Copy to Clipboard',
            className: 'primary',
            onClick: (btn, dlgInstance) => {
              navigator.clipboard.writeText(lines.join('\\n'));
              this._toast('Copied debug info', 'success');
              return false;
            },
          },
          { label: 'Close' },
        ],
        size: [650, 550],
        noPadding: true,
      });
    }

  _applyStoredSettings() {
    const c1 = localStorage.getItem('svgh_grid_color1') || '#2a2d42';
    const c2 = localStorage.getItem('svgh_grid_color2') || '#1a1d2e';
    this.canvasView.setGridColors(c1, c2);

    const animBg = localStorage.getItem('svgh_anim_bg') === 'true';
    if (animBg) {
      this.canvasView.toggleAnimateBackground(true);
    }
  }

  _sendBackToParent() {
    if (!this.svgElement) return;
    const svgString = this._serializeSvg();
    if (this.parentSource) {
      this.parentSource.postMessage(
        { type: 'SVG_HELPER_EXPORT', svg: svgString },
        this.parentOrigin
      );
      this._toast('Sent back to Scratchy!', 'success');
    }
  }

  

  

  async run(env) {
      this.env = env;
      this.container = env.container;
      this.init(this.container);
      return this;
    }
}

