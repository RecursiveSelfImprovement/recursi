class DrawingTool {
  constructor(targetElement = document.body, options = {}) {
    this.targetElement = targetElement;
    this.options = options;
    this.colors = [
      'rgb(255,0,0)',
      'rgb(255,80,0)',
      'rgb(255,255,0)',
      'rgb(0,233,0)',
      'rgb(0,80,255)',
      'rgb(100,0,255)',
      'rgb(255,30,255)',
    ];
    this.colorIndex = 3;
    this.options.color = this.colors[3];
    this.svg = null;
    this.isDrawing = false;
    this.lastPoint = [0, 0];
    this.drawnCurves = [];
    this.currentPoints = [];
    this.pencilSprite = null;

    this.controlPressed = false;
    this.inControlMode = false;
    this.offsetVector = [0, 0];
    this.controlLine = null;
    this.anchorPoint = null;
    this.lastControlPos = null;
    this.shiftPressed = false;
    this.lastMousePos = null;
    this.usedControl = false;

    this.createSvgOverlay();
    this.addEventListeners();
    this.setupKeystrokes();
  }

  distance(pt1, pt2) {
    const dx = pt1[0] - pt2[0];
    const dy = pt1[1] - pt2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  createSvgOverlay() {
    this.svg = makeElement('svg:svg', {
      style: {
        position: 'fixed',
        zIndex: '2147483646',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto',
        cursor: 'crosshair',
      },
    });
    this.targetElement.appendChild(this.svg);
  }

  removeSvgOverlay() {
    if (this.svg) this.svg.remove();
    if (this.pencilSprite) this.pencilSprite.element.remove();
    this.removeKeystrokes();
  }

  setColor(colorIndex) {
    this.colorIndex = colorIndex;
    this.options.color = this.colors[colorIndex];
    if (this.pencilSprite) {
      this.pencilSprite.setColor(this.options.color);
    }
  }

  showPencilImage(x, y) {
    if (!this.pencilSprite) {
      this.pencilSprite = this.createPencilSprite();
      document.body.appendChild(this.pencilSprite.element);
      this.setColor(this.colorIndex);
    } else {
      this.setColor(this.colorIndex);
    }
    Object.assign(this.pencilSprite.element.style, {
      left: `${x - 6}px`,
      top: `${y - 12}px`,
      display: 'block',
    });
    this.svg.style.cursor = 'none';
  }

  createPencilSprite() {
    const defs = makeElement('svg:defs', {}, [
      makeElement(
        'svg:radialGradient',
        {
          id: 'palmGrad',
          cx: '50%',
          cy: '50%',
          r: '75%',
          fx: '30%',
          fy: '30%',
        },
        [
          makeElement('svg:stop', {
            offset: '0%',
            'stop-color': '#ffffff',
            'stop-opacity': '1',
          }),
          makeElement('svg:stop', {
            offset: '100%',
            'stop-color': '#ffffff',
            'stop-opacity': '0',
          }),
        ]
      ),
      makeElement(
        'svg:linearGradient',
        {
          id: 'skinGrad',
          x1: '64.59',
          y1: '114.21',
          x2: '64.58',
          y2: '186.04',
          gradientUnits: 'userSpaceOnUse',
          gradientTransform:
            'matrix(0.2557,-0.0835,0.0831,0.2570,-10.033,-1.663)',
        },
        [
          makeElement('svg:stop', {
            offset: '0%',
            'stop-color': '#f1e6cd',
            'stop-opacity': '1',
          }),
          makeElement('svg:stop', {
            offset: '100%',
            'stop-color': '#f1e6cb',
            'stop-opacity': '0',
          }),
        ]
      ),
      makeElement(
        'svg:linearGradient',
        {
          id: 'highlightGrad',
          x1: '75.00',
          y1: '167.54',
          x2: '75.08',
          y2: '215.72',
          gradientUnits: 'userSpaceOnUse',
          gradientTransform:
            'matrix(0.2557,-0.0835,0.0831,0.2570,-10.033,-1.663)',
        },
        [
          makeElement('svg:stop', {
            offset: '0%',
            'stop-color': '#ffffff',
            'stop-opacity': '0.53',
          }),
          makeElement('svg:stop', {
            offset: '100%',
            'stop-color': '#ffffff',
            'stop-opacity': '0',
          }),
        ]
      ),
      makeElement(
        'svg:radialGradient',
        {
          id: 'tipGlow',
          cx: '50%',
          cy: '50%',
          r: '50%',
        },
        [
          makeElement('svg:stop', {
            offset: '0%',
            'stop-color': '#ffffff',
            'stop-opacity': '1',
          }),
          makeElement('svg:stop', {
            offset: '40%',
            'stop-color': '#ffffff',
            'stop-opacity': '0.6',
          }),
          makeElement('svg:stop', {
            offset: '100%',
            'stop-color': '#ffffff',
            'stop-opacity': '0',
          }),
        ]
      ),
    ]);

    const pencilColorPath = makeElement('svg:path', {
      d: 'M39.16 7.55L24.98 7.42L27.05 14.76L39.17 14.85Z',
      fill: this.options.color,
    });

    const pencilColorPath2 = makeElement('svg:path', {
      d: 'M12.56 7.55L18.37 7.4C18.39 7.9 18.47 8.4 18.53 8.9L19.64 14.91L12.52 14.77C12.71 14.63 13.83 12.95 13.7 10.83C13.61 9.39 12.56 7.55 12.56 7.55Z',
      fill: this.options.color,
    });

    const pencilColorPath3 = makeElement('svg:path', {
      d: 'M8.91 12.96L5.08 11.07L8.86 9.3C8.86 9.3 9.49 10.18 9.49 11.24C9.5 11.83 9.29 12.35 8.91 12.95Z',
      fill: this.options.color,
    });

    const glowCircle = makeElement('svg:circle', {
      cx: '5.05',
      cy: '11.07',
      r: '3',
      fill: 'url(#tipGlow)',
    });

    const handSvg = makeElement(
      'svg:svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 50 50',
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
        },
      },
      [
        defs,
        makeElement('svg:path', {
          d: 'M12.75 7.01C12.75 7.01 12.27 5.56 12.85 4.74C13.43 3.92 21.97 2.41 21.97 2.41C21.97 2.41 25.77 2.91 27.41 4.07C29.05 5.23 31.54 7.23 31.54 7.23L25.18 7.45L27.19 14.8L37.56 14.81C37.56 14.81 38.67 16.56 38.83 17.36C38.98 18.16 38.92 28.73 38.78 29.78C38.65 30.83 32.55 33.81 32.55 33.81L26.73 37.54L25.74 37.2C25.74 37.2 22.08 33.91 21.12 30.93C20.16 27.96 20.09 25.28 20.09 25.28C20.09 25.28 17.15 25.02 16.74 23.57C16.32 22.11 16.57 20.66 17.76 20.05C18.25 19.8 14.96 20.4 14.75 18.39C14.63 17.26 15.23 15.16 15.95 14.92C16.66 14.69 19.48 14.93 19.48 14.93L18.46 7.85L18 7.41Z',
          fill: 'url(#skinGrad)',
          stroke: 'none',
        }),
        makeElement('svg:ellipse', {
          cx: '6.05',
          cy: '10.94',
          rx: '6.05',
          ry: '6.14',
          fill: 'url(#palmGrad)',
          stroke: 'none',
        }),
        makeElement('svg:path', {
          d: 'M25.18 38.44C24.83 38.68 24.72 39.33 24.95 39.71C25.18 40.08 30.08 47.91 30.27 48.16C30.45 48.41 31.23 48.73 31.72 48.43C32.21 48.12 46.45 39.17 46.76 38.96C47.07 38.75 47.2 37.93 46.87 37.46C46.54 36.99 42.03 29.67 41.74 29.33C41.45 28.99 40.66 28.83 40.15 29.18C39.63 29.53 25.18 38.44 25.18 38.44Z',
          fill: 'url(#highlightGrad)',
          'fill-opacity': '0.47',
          stroke: 'none',
        }),
        pencilColorPath,
        pencilColorPath2,
        pencilColorPath3,
        makeElement('svg:path', {
          d: 'M29.34 22.6C28.41 19.4 25.7 9.92 24.93 7.21C24.21 4.7 22.7 4.29 21.22 4.49C20.1 4.65 18.13 5.71 18.43 7.85C18.72 9.87 20.12 17.75 20.69 20.44C20.77 20.85 20.61 21.41 20.61 21.41C20.61 21.41 19.98 25.29 20.17 26.93C20.36 28.65 21.04 31.14 22.19 33.03C23.34 34.93 26.26 37.68 26.26 37.68',
          fill: 'none',
          stroke: '#000000',
          'stroke-width': '0.73',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
        makeElement('svg:path', {
          d: 'M12.86 7.5C12.53 6.99 11.87 4.45 14.52 3.83C17.02 3.24 20.96 2.58 21.47 2.51C21.99 2.44 23.54 2.53 24.26 2.79C24.99 3.04 28.27 4.09 31.73 7.51',
          fill: 'none',
          stroke: '#000000',
          'stroke-width': '0.73',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
        makeElement('svg:path', {
          d: 'M16.87 14.85C15.58 15.18 14.96 16.34 14.78 17.17C14.63 17.88 14.71 19.46 16.03 19.99C16.93 20.35 17.82 20.17 20.41 19.16',
          fill: 'none',
          stroke: '#000000',
          'stroke-width': '0.73',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
        makeElement('svg:path', {
          d: 'M20.07 25.33C20.07 25.33 17.62 25.32 16.89 23.62C16.32 22.31 16.85 21.35 17.32 20.72C17.88 19.97 19.36 19.57 20.38 19.21',
          fill: 'none',
          stroke: '#000000',
          'stroke-width': '0.73',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
        makeElement('svg:path', {
          d: 'M37.74 14.88C37.74 14.88 38.85 16.47 39.01 18.15C39.18 19.82 39.05 27.76 38.83 29.9',
          fill: 'none',
          stroke: '#000000',
          'stroke-width': '0.73',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
        makeElement('svg:line', {
          x1: '40.6',
          y1: '9',
          x2: '42.55',
          y2: '9',
          stroke: '#000',
          'stroke-width': '0.73',
        }),
        makeElement('svg:line', {
          x1: '40.62',
          y1: '10.49',
          x2: '42.57',
          y2: '10.49',
          stroke: '#000',
          'stroke-width': '0.73',
        }),
        makeElement('svg:line', {
          x1: '40.58',
          y1: '11.97',
          x2: '42.53',
          y2: '11.97',
          stroke: '#000',
          'stroke-width': '0.73',
        }),
        makeElement('svg:line', {
          x1: '40.6',
          y1: '13.49',
          x2: '42.55',
          y2: '13.49',
          stroke: '#000',
          'stroke-width': '0.73',
        }),
        makeElement('svg:path', {
          d: 'M43.85 7.72C43.85 7.72 46.67 7.66 47.55 7.72C48.32 7.79 49.2 8.64 49.36 9.52C49.57 10.64 49.68 11.71 49.44 13.04C49.25 14.04 48.76 14.44 47.91 14.67C47.04 14.9 43.95 14.8 43.95 14.8Z',
          fill: '#ff8484',
          stroke: '#000000',
          'stroke-width': '0.73',
        }),
        makeElement('svg:path', {
          d: 'M39.69 7.15C40.14 7.17 43.32 7.18 43.51 7.19C43.7 7.2 43.84 7.37 43.85 7.56C43.86 7.8 43.95 14.71 43.94 14.97C43.94 15.18 43.76 15.31 43.56 15.32C43.33 15.34 39.76 15.41 39.55 15.4C39.36 15.38 39.17 15.08 39.17 14.85L39.14 7.65C39.14 7.65 39.24 7.14 39.69 7.15Z',
          fill: '#ffffad',
          stroke: '#000000',
          'stroke-width': '0.73',
        }),
        makeElement('svg:path', {
          d: 'M12.56 7.55L8.85 9.3C9.07 9.68 9.52 10.39 9.49 11.27C9.46 12.25 8.91 12.96 8.91 12.96L12.53 14.76C13.04 14.42 13.87 12.81 13.73 10.94C13.57 8.89 12.56 7.55 12.56 7.55Z',
          fill: '#ffdca1',
          stroke: '#000000',
          'stroke-width': '0.73',
        }),
        glowCircle,
      ]
    );

    const element = makeElement(
      'div',
      {
        style: {
          width: '65px',
          zIndex: '2147483647',
          position: 'fixed',
          pointerEvents: 'none',
        },
      },
      handSvg
    );

    return {
      element,
      setColor: (color) => {
        pencilColorPath.setAttribute('fill', color);
        pencilColorPath2.setAttribute('fill', color);
        pencilColorPath3.setAttribute('fill', color);
      },
    };
  }

  hidePencilImage() {
    if (this.pencilSprite) {
      this.pencilSprite.element.style.display = 'none';
    }
    if (this.svg) this.svg.style.cursor = 'crosshair';
  }

  addEventListeners() {
    this.boundStart = this.startDrawing.bind(this);
    this.boundDraw = this.draw.bind(this);
    this.boundStop = this.stopDrawing.bind(this);
    this.boundHide = this.hidePencilImage.bind(this);

    ['mousedown', 'touchstart'].forEach((e) =>
      this.svg.addEventListener(e, this.boundStart)
    );
    ['mousemove', 'touchmove'].forEach((e) =>
      this.svg.addEventListener(e, this.boundDraw)
    );
    ['mouseup', 'touchend'].forEach((e) =>
      this.svg.addEventListener(e, this.boundStop)
    );
    this.svg.addEventListener('mouseleave', this.boundHide);

    this.boundKeyDown = (e) => {
      if (e.key === 'Control' || e.key === 'Meta') this.controlPressed = true;
      if (e.key === 'Shift') this.shiftPressed = true;
      if (e.key === 'd' || e.key === 'D') this.logControlLineDetails();
    };
    this.boundKeyUp = (e) => {
      if (e.key === 'Control' || e.key === 'Meta') this.controlPressed = false;
      if (e.key === 'Shift') {
        this.shiftPressed = false;
        if (
          this.isDrawing &&
          this.lastMousePos &&
          this.currentPoints.length > 0
        ) {
          const lastPoint = this.currentPoints[this.currentPoints.length - 1];
          this.offsetVector = [
            this.lastMousePos[0] - lastPoint[0],
            this.lastMousePos[1] - lastPoint[1],
          ];
        }
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  setupKeystrokes() {
    this.ksHandlers = [
      { key: 'red', fn: () => this.setColor(0) },
      { key: 'orange', fn: () => this.setColor(1) },
      { key: 'yellow', fn: () => this.setColor(2) },
      { key: 'green', fn: () => this.setColor(3) },
      { key: 'blue', fn: () => this.setColor(4) },
      { key: 'purple', fn: () => this.setColor(5) },
      { key: 'magenta', fn: () => this.setColor(6) },
      { key: 'clear', fn: () => this.clear() },
      { key: 'toggle', fn: () => KeystrokeHandler.toggleShowCommand() },
      { key: 'undo', fn: () => this.undoLast() },
      { key: 'zlog', fn: () => this.logControlLineDetails() },
      { key: 'e&xit', fn: () => this.quit() },
      {
        key: { name: 'quit', key: 'escape', showPopup: true },
        fn: () => this.quit(),
      },
    ];
    this.ksHandlers.forEach((h) => KeystrokeHandler.addHandler(h.key, h.fn));
  }

  removeKeystrokes() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);

    if (this.ksHandlers) {
      this.ksHandlers.forEach((h) => {
        if (typeof h.key === 'string') {
          KeystrokeHandler.removeHandler(h.key.replace('&', ''));
        } else if (h.key && h.key.name) {
          KeystrokeHandler.removeHandler(h.key.name);
        }
      });
    }
  }

  quit() {
    if (this.svg) {
      ['mousedown', 'touchstart'].forEach((e) =>
        this.svg.removeEventListener(e, this.boundStart)
      );
      ['mousemove', 'touchmove'].forEach((e) =>
        this.svg.removeEventListener(e, this.boundDraw)
      );
      ['mouseup', 'touchend'].forEach((e) =>
        this.svg.removeEventListener(e, this.boundStop)
      );
      this.svg.removeEventListener('mouseleave', this.boundHide);
    }

    this.removeSvgOverlay();

    if (window.drawingToolInstance === this) {
    }
  }

  startDrawing(e) {
    const svgRect = this.svg.getBoundingClientRect();
    this.isDrawing = true;
    const x =
      (e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX) -
      svgRect.left;
    const y =
      (e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY) -
      svgRect.top;

    this.lastPoint = [x, y];
    this.currentPoints = [this.lastPoint];
    this.lastMousePos = [x, y];
    this.offsetVector = [0, 0];
    this.anchorPoint = null;
    this.inControlMode = false;
    this.lastControlPos = [x, y];
    this.usedControl = false;

    this.createSvgPath(this.currentPoints);

    if (this.controlPressed) {
      this.inControlMode = true;
      this.anchorPoint = [...this.lastPoint];
      this.createControlLine(x, y);
      this.usedControl = true;
    }
    e.preventDefault();
  }

  draw(e) {
    const svgRect = this.svg.getBoundingClientRect();
    const x =
      (e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX) -
      svgRect.left;
    const y =
      (e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY) -
      svgRect.top;
    this.showPencilImage(x, y);
    this.lastMousePos = [x, y];

    if (!this.isDrawing) return;

    if (this.controlPressed) {
      if (!this.inControlMode) {
        this.inControlMode = true;
        this.anchorPoint = [
          ...this.currentPoints[this.currentPoints.length - 1],
        ];
        this.createControlLine(x, y);
        this.usedControl = true;
      }
      this.lastControlPos = [x, y];
      this.updateControlLine(x, y);
      return;
    } else if (this.inControlMode) {
      const dx = this.lastControlPos[0] - this.anchorPoint[0];
      const dy = this.lastControlPos[1] - this.anchorPoint[1];
      const d = Math.sqrt(dx * dx + dy * dy);
      this.offsetVector = d < 4 ? [0, 0] : [dx, dy];
      this.removeControlLine();
      this.inControlMode = false;
    }

    if (
      this.shiftPressed &&
      (this.offsetVector[0] !== 0 || this.offsetVector[1] !== 0)
    ) {
      this.backtrackIfCloser([x, y]);
      this.updateControlLine(x, y, true);
      this.currentSegmentPath.main.setAttribute(
        'd',
        this.pointsToPath(this.currentPoints)
      );
      this.currentSegmentPath.shadow.setAttribute(
        'd',
        this.pointsToPath(this.currentPoints, 3, 3)
      );
      return;
    }

    const effectivePoint = this.computeEffectivePoint([x, y]);
    if (
      this.distance(
        this.currentPoints[this.currentPoints.length - 1],
        effectivePoint
      ) >= 3
    ) {
      this.currentPoints.push(effectivePoint);
    }

    if (this.offsetVector[0] !== 0 || this.offsetVector[1] !== 0) {
      this.updateControlLine(x, y);
    }

    this.currentSegmentPath.main.setAttribute(
      'd',
      this.pointsToPath(this.currentPoints)
    );
    this.currentSegmentPath.shadow.setAttribute(
      'd',
      this.pointsToPath(this.currentPoints, 3, 3)
    );
    e.preventDefault();
  }

  stopDrawing(e) {
    if (this.inControlMode && this.lastControlPos) {
      const dx = this.lastControlPos[0] - this.anchorPoint[0];
      const dy = this.lastControlPos[1] - this.anchorPoint[1];
      const d = Math.sqrt(dx * dx + dy * dy);
      this.offsetVector = d < 4 ? [0, 0] : [dx, dy];
      this.inControlMode = false;
    }

    this.removeControlLine();
    this.isDrawing = false;

    const error = this.usedControl ? 1 : 8;
    // USE THE IMPORTED CURVE FITTER CLASS
    const bezierCurves = CurveFitter.fit(this.currentPoints, error);

    if (this.currentSegmentPath) {
      this.currentSegmentPath.main.remove();
      this.currentSegmentPath.shadow.remove();
    }

    if (!bezierCurves || bezierCurves.length === 0) {
      this.currentPoints = [];
      this.currentSegmentPath = null;
      return;
    }

    const finalPaths = this.appendBezierPathsToSvg(bezierCurves, {
      offset: [3, 3],
      thickness: 6,
    });
    this.svg.insertBefore(finalPaths.shadow, this.svg.firstChild);
    this.svg.appendChild(finalPaths.main);
    this.drawnCurves.push(finalPaths);

    this.currentPoints = [];
    this.currentSegmentPath = null;
  }

  createSvgPath(points, shadowOffset = { x: 3, y: 3 }) {
    const shadowPath = makeElement('svg:path', {
      fill: 'none',
      stroke: 'black',
      'stroke-width': '6',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      filter: 'blur(4px)',
      d: this.pointsToPath(points, shadowOffset.x, shadowOffset.y),
    });

    const path = makeElement('svg:path', {
      fill: 'none',
      stroke: this.options.color,
      'stroke-width': '7',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      filter: 'blur(2px)',
      d: this.pointsToPath(points),
    });

    this.currentSegmentPath = { main: path, shadow: shadowPath };
    this.svg.insertBefore(this.currentSegmentPath.shadow, this.svg.firstChild);
    this.svg.appendChild(this.currentSegmentPath.main);
  }

  pointsToPath(points, offsetX = 0, offsetY = 0) {
    return points
      .map((point, i) => {
        let command = i === 0 ? 'M' : 'L';
        return `${command}${point[0] + offsetX},${point[1] + offsetY}`;
      })
      .join(' ');
  }

  createControlLine(x, y) {
    if (this.controlLine) return;
    this.controlLine = makeElement('svg:line', {
      stroke: 'white',
      'stroke-width': '4',
      'stroke-opacity': '0.9',
      'stroke-dasharray': '5,5',
    });
    const animate = makeElement('svg:animate', {
      attributeName: 'stroke-dashoffset',
      from: '0',
      to: '-10',
      dur: '1s',
      repeatCount: 'indefinite',
    });
    this.controlLine.appendChild(animate);
    this.svg.appendChild(this.controlLine);
    this.updateControlLine(x, y);
  }

  updateControlLine(x, y, isShift = false) {
    if (!this.controlLine) {
      this.createControlLine(x, y);
      return;
    }
    const lastPoint = this.currentPoints[this.currentPoints.length - 1];
    Object.assign(this.controlLine.style, { display: 'block' }); // Ensure visible
    this.controlLine.setAttribute('x1', lastPoint[0]);
    this.controlLine.setAttribute('y1', lastPoint[1]);
    this.controlLine.setAttribute('x2', x);
    this.controlLine.setAttribute('y2', y);

    if (isShift) {
      this.controlLine.setAttribute('stroke', 'red');
      this.controlLine.setAttribute('stroke-opacity', '1');
    } else {
      this.controlLine.setAttribute('stroke', 'white');
      this.controlLine.setAttribute('stroke-opacity', '0.9');
    }
  }

  removeControlLine() {
    if (this.controlLine) {
      this.controlLine.remove();
      this.controlLine = null;
    }
  }

  computeEffectivePoint(pt) {
    if (this.offsetVector[0] === 0 && this.offsetVector[1] === 0) return pt;
    const last = this.currentPoints[this.currentPoints.length - 1];
    const R = this.distance([0, 0], this.offsetVector);
    const d = this.distance(last, pt);
    if (d < R) return [...last];
    const dx = last[0] - pt[0];
    const dy = last[1] - pt[1];
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return [...last];
    const ux = dx / mag;
    const uy = dy / mag;
    return [pt[0] + ux * R, pt[1] + uy * R];
  }

  logControlLineDetails() {
    if (this.controlLine) console.log('Control Line exists');
    else console.log('No Control Line');
  }

  backtrackIfCloser(mousePt) {
    if (this.currentPoints.length < 2) return;
    const R = this.distance([0, 0], this.offsetVector);
    const last = this.currentPoints[this.currentPoints.length - 1];
    let currentError = Math.abs(this.distance(last, mousePt) - R);
    if (this.distance(last, mousePt) >= R) return;

    while (this.currentPoints.length > 1) {
      const prev = this.currentPoints[this.currentPoints.length - 2];
      const errorPrev = Math.abs(this.distance(prev, mousePt) - R);
      if (errorPrev < currentError) {
        this.currentPoints.pop();
        currentError = errorPrev;
      } else break;
    }
  }

  offsetBezierCurve(bezierData, offset) {
    const result = [];
    for (let i = 0; i < bezierData.length; i++) {
      const [start, cp1, cp2, end] = bezierData[i];
      result.push([
        [start[0] + offset[0], start[1] + offset[1]],
        [cp1[0] + offset[0], cp1[1] + offset[1]],
        [cp2[0] + offset[0], cp2[1] + offset[1]],
        [end[0] + offset[0], end[1] + offset[1]],
      ]);
    }
    return result;
  }

  createPathString(cubicBezierData) {
    let pathString = 'M' + cubicBezierData[0][0].join(' ');
    for (let i = 0; i < cubicBezierData.length; i++) {
      const [start, cp1, cp2, end] = cubicBezierData[i];
      pathString += ` C ${cp1.join(' ')} ${cp2.join(' ')} ${end.join(' ')}`;
    }
    return pathString;
  }

  appendBezierPathsToSvg(bezierData, options) {
    const shadowPath = makeElement('svg:path', {
      stroke: 'black',
      'stroke-width': '6',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: 'none',
      filter: `blur(${
        options && options.shadowBlur ? options.shadowBlur : 4
      }px)`,
      d: this.createPathString(
        this.offsetBezierCurve(
          bezierData,
          options && options.offset ? options.offset : [6, 6]
        )
      ),
    });

    const coloredPath = makeElement('svg:path', {
      'stroke-width': options && options.thickness ? options.thickness : 3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: 'none',
      filter: 'blur(1px)',
      stroke: this.options.color,
      d: this.createPathString(bezierData),
    });

    return { shadow: shadowPath, main: coloredPath };
  }

  undoLast() {
    if (this.drawnCurves.length === 0) return false;
    const lastCurve = this.drawnCurves.pop();
    lastCurve.main.remove();
    lastCurve.shadow.remove();
    return true;
  }

  clear() {
    while (this.undoLast()) {}
  }

}

