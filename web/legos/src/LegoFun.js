class LegoFun {
  constructor() {
    this.app = null;
    this.legoFactory = null;
    this.gridSize = 32;
    this.studSpacing = 8;
    this.raycaster = null;
    this.studGrid = null;
    this.supportAnalyzer = null;
    this.structureBuilder = null;
    this.visibilityTester = null;
    this.gameUI = null;
    this.gameController = null;
  }

  onResize(width, height) {
    if (this.app && typeof this.app.resize === 'function') {
      this.app.resize(width, height);
    }
  }

  _createBaseplate() {
    const { scene } = this.app;
    const plateSize = this.gridSize;
    const physicalSize = plateSize * this.studSpacing;

    const baseplate = this.legoFactory.createLego(plateSize, plateSize, true);
    baseplate.traverse((child) => {
      if (child.isMesh) child.material.color.set(0xa0a5a9);
    });
    baseplate.position.set(0, 0, 0);
    scene.add(baseplate);

    const grid = new THREE.GridHelper(
      physicalSize,
      plateSize,
      0x888888,
      0x666666
    );
    grid.position.y = 0.1;
    grid.visible = true;
    scene.add(grid);

    this.app.setCameraTarget(new THREE.Vector3(0, 0, 0));
  }

  onCanvasClick(event) {
    event.preventDefault();
    if (!this.app || !this.app.renderer || !this.app.camera) return;

    const THREE = this.app.THREE;
    const mouse = new THREE.Vector2();
    const rect = this.app.renderer.domElement.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.app.camera);

    const intersects = this.raycaster.intersectObjects(
      [this.gameController.groupA, this.gameController.groupB].filter(Boolean),
      true
    );

    if (intersects.length > 0) {
      this.gameController.handlePick(intersects[0].object);
    }
  }

  async run(env) {
    if (this.rootElement) this.destroy();

    this.env = env;
    const parentElement = env.container;

    // Fix standalone screen fill constraint
    if (parentElement === document.body) {
      document.documentElement.style.height = '100%';
      document.documentElement.style.width = '100%';
      document.documentElement.style.margin = '0';
      document.body.style.height = '100%';
      document.body.style.width = '100%';
      document.body.style.margin = '0';
    }

    parentElement.style.position = 'relative';
    parentElement.style.width = '100%';
    parentElement.style.height = '100%';
    parentElement.style.margin = '0';
    parentElement.style.padding = '0';
    parentElement.style.overflow = 'hidden';
    parentElement.style.background = '#222';

    const canvasId = 'canvas-container';
    const canvasContainer = makeElement('div', {
      id: canvasId,
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        overflow: 'hidden',
        background: '#222',
      },
    });
    parentElement.appendChild(canvasContainer);
    this.rootElement = canvasContainer;

    if (
      !parentElement._vibesAppResizeObserver &&
      typeof ResizeObserver !== 'undefined'
    ) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (typeof this.onResize === 'function') {
            this.onResize(entry.contentRect.width, entry.contentRect.height);
          }
        }
      });
      ro.observe(parentElement);
      parentElement._vibesAppResizeObserver = ro;
    }

    this.app = new ThreeJSLoader(canvasId, {
      cameraPos: { x: 150, y: 200, z: 250 },
      enableControls: true,
      hdrPath:
        'https://recursi.dev/thirdparty/three-js-r153/assets/textures/venice_sunset_1k.hdr',
    });

    await this.app.init(canvasContainer);

    if (this.app.scene) {
      this.app.scene.background = null;
    }

    this.legoFactory = new LegoFactory();
    this.raycaster = new this.app.THREE.Raycaster();

    if (this.app.controls) {
      this.app.controls.maxDistance = 5000;
      this.app.controls.minDistance = 5;
    }
    if (this.app.camera) {
      this.app.camera.far = 5000;
      this.app.camera.updateProjectionMatrix();
    }
    if (this.app.renderer) {
      this.app.renderer.toneMappingExposure = 0.8;
    }

    this.gameUI = new GameUI(parentElement, this.env);
    this.gameController = new GameController({
      scene: this.app.scene,
      legoFactory: this.legoFactory,
      ui: this.gameUI,
      app: this.app,
    });

    this.gameController.init();
    this.app.onUpdateCallback = () => this.gameController.update();

    this._onResizeBound = () => this.onResize();
    window.addEventListener('resize', this._onResizeBound, false);
    this.onResize();

    this._onCanvasClickBound = this.onCanvasClick.bind(this);
    this.app.renderer.domElement.addEventListener(
      'mousedown',
      this._onCanvasClickBound,
      false
    );

    return this;
  }

  destroy() {
    if (this._onResizeBound) {
      window.removeEventListener('resize', this._onResizeBound, false);
      this._onResizeBound = null;
    }
    if (
      this.app &&
      this.app.renderer &&
      this.app.renderer.domElement &&
      this._onCanvasClickBound
    ) {
      this.app.renderer.domElement.removeEventListener(
        'mousedown',
        this._onCanvasClickBound,
        false
      );
    }
    if (this.app && typeof this.app.destroy === 'function') {
      this.app.destroy();
    }
    this.app = null;

    if (this.gameUI) {
      if (this.gameUI.dialog) this.gameUI.dialog.close();
      if (this.gameUI.overlayFeedbackNode)
        this.gameUI.overlayFeedbackNode.remove();
      this.gameUI = null;
    }

    const instructions = this.rootElement?.querySelector(
      '.instructions-overlay'
    );
    if (instructions) instructions.remove();

    if (this.canvasContainer) {
      this.canvasContainer.remove();
      this.canvasContainer = null;
    }
    this.rootElement = null;
  }
}