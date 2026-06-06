class Main {
  constructor() {
      this.app = null;
      this.baseController = null;
      this.threeDView = null;
    }

  

  

  _exposeGlobals(threeDView, baseController) {
      if (DebugConfig.exposeThreeDView) globalThis.threeDView = threeDView;
      if (DebugConfig.exposeBaseController)
        globalThis.baseController = baseController;
    }

  async run(env) {
      console.log('[accuCad] run() invoked.');
      if (this.rootElement) this.destroy();

      if (!env || !env.container) {
        throw new Error('[accuCad] run() requires an environment object with a valid container.');
      }

      const parentElement = env.container;
      this.rootElement = parentElement;

      // Reset any accidental focus-induced scrolling to keep the layout snapped to (0,0)
      const resetScroll = () => {
        if (this.rootElement) {
          this.rootElement.scrollLeft = 0;
          this.rootElement.scrollTop = 0;
        }
        window.scrollTo(0, 0);
        document.body.scrollLeft = 0;
        document.body.scrollTop = 0;
      };

      this.rootElement.addEventListener('scroll', resetScroll);
      window.addEventListener('scroll', resetScroll);
      document.body.addEventListener('scroll', resetScroll);

      // Store handler reference for proper destruction later
      this._scrollResetHandler = resetScroll;

      const canvasId = 'accucad-canvas-' + Math.random().toString(36).slice(2);
      const canvasContainer = document.createElement('div');
      canvasContainer.id = canvasId;
      canvasContainer.style.cssText =
        'width:100%; height:100%; position:absolute; inset:0; overflow:hidden;';
      parentElement.appendChild(canvasContainer);
      this.canvasContainer = canvasContainer;

      if (
        !parentElement._vibesAppResizeObserver &&
        typeof ResizeObserver !== 'undefined'
      ) {
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (this.app && typeof this.app.resize === 'function') {
              this.app.resize(entry.contentRect.width, entry.contentRect.height);
            }
          }
        });
        ro.observe(parentElement);
        parentElement._vibesAppResizeObserver = ro;
      }

      const staticClasses = [
        'CameraOrbitAnimator',
        'DebugConfig',
        'ElementOperations',
        'ModelLoader',
        'TentativePointHandler',
        'ViewControlsManager',
        'ViewManipulator',
      ];
      for (const clsName of staticClasses) {
        const cls = window[clsName] || globalThis[clsName];
        if (cls && typeof cls.initStatics === 'function') cls.initStatics();
      }

      if (typeof PopupBox !== 'undefined' && typeof PopupBox.init === 'function')
        PopupBox.init();

      this.app = new ThreeJSLoader(canvasId, {
        cameraPos: { x: 5, y: 5, z: 8 },
        enableControls: false,
        useThickLines: true,
        commonLoaders: true,
        hdrPath:
          'https://recursi.dev/thirdparty/three-js-r153/assets/textures/venice_sunset_1k.hdr',
      });

      await this.app.init(canvasContainer);

      globalThis.Line2 = this.app.modules.Line2;
      globalThis.LineGeometry = this.app.modules.LineGeometry;
      globalThis.LineMaterial = this.app.modules.LineMaterial;
      globalThis.GLTFLoader = this.app.modules.GLTFLoader;
      
      this.THREE = this.app.THREE;

      if (this.app.scene) {
        this.app.scene.background = new this.THREE.Color(0xbbbbbb);
      }

      const ADDONS = 'https://recursi.dev/thirdparty/three-js-r153/examples/jsm';
      const THREE_URL =
        'https://recursi.dev/thirdparty/three-js-r153/build/three.module.js';

      const loadExtraAddon = async (path, exportName) => {
        try {
          const blobUrl = await this.app._fetchAndRewrite(
            ADDONS + path,
            THREE_URL,
            1
          );
          const mod = await import(blobUrl);
          globalThis[exportName] = mod[exportName];
        } catch (e) {
          console.warn(`Failed to load addon ${exportName}`, e);
        }
      };

      // FIX: pointed BufferGeometryUtils to '/utils/' instead of '/loaders/'
      await Promise.all([
        loadExtraAddon('/loaders/DRACOLoader.js', 'DRACOLoader'),
        loadExtraAddon('/loaders/SVGLoader.js', 'SVGLoader'),
        loadExtraAddon('/utils/BufferGeometryUtils.js', 'BufferGeometryUtils'),
      ]);

      const target = new this.THREE.Vector3(0, 0.6, 0);
      this.app.camera.lookAt(target);

      this.threeDView = {
        scene: this.app.scene,
        camera: this.app.camera,
        renderer: this.app.renderer,
        target: target,
        envRotation: 0,
      };

      this.baseController = new BaseController(
        this.threeDView,
        this.app.renderer.domElement
      );
      ControllerSetup.initializeController(
        this.baseController,
        this.threeDView.scene
      );

      if (typeof ViewControlsManager !== 'undefined') {
        ViewControlsManager.init(this.baseController, this.threeDView);
      }

      if (typeof KeyCommandHandler !== 'undefined') {
        KeyCommandHandler.init();
        if (typeof SmartDrawKeys !== 'undefined') {
          SmartDrawKeys.initializeKeyCommands(
            KeyCommandHandler,
            this.baseController
          );
        }
      }

      if (typeof RotaryEncoders !== 'undefined') {
        RotaryEncoders.initialize(this.baseController);
      }

      if (
        typeof MidiInputHandler !== 'undefined' &&
        typeof MidiInputHandler.init === 'function'
      ) {
        MidiInputHandler.init((status) => console.log('MIDI Status:', status));
      }

      if (typeof CameraOrbitAnimator !== 'undefined') {
        CameraOrbitAnimator.setDependencies(this.threeDView);
      }

      if (typeof DebugConfig !== 'undefined') {
        if (DebugConfig.exposeThreeDView) globalThis.threeDView = this.threeDView;
        if (DebugConfig.exposeBaseController)
          globalThis.baseController = this.baseController;
      }

      // Safe environment-based handshake
      if (env && typeof env.requestKeystrokeControl === 'function') {
        env.requestKeystrokeControl((active) => {
          if (this.baseController) {
            this.baseController.isKeystrokeCaptureActive = active;
          }
          if (typeof KeyCommandHandler !== 'undefined') {
            KeyCommandHandler.setPaused(!active);
          }
        });
      } else {
        if (this.baseController) {
          this.baseController.isKeystrokeCaptureActive = true;
        }
      }

      const initialRect = parentElement.getBoundingClientRect();
      if (initialRect.width > 0 && initialRect.height > 0) {
        this.app.resize(initialRect.width, initialRect.height);
      }

      console.log('[accuCad] Application initialized successfully.');
      return this;
    }

  

  destroy() {
      console.log('[accuCad] destroy() called.');

      // Surgically close the active keyboard shortcut help dialog if present
      if (this.baseController && this.baseController._helpDialog) {
        try {
          this.baseController._helpDialog.close();
        } catch (e) {}
        this.baseController._helpDialog = null;
      }

      // Surgically close camera oscillation dialog
      if (typeof CameraOrbitAnimator !== 'undefined') {
        try {
          CameraOrbitAnimator.stop(); 
        } catch (e) {}
      }

      if (this.app && typeof this.app.destroy === 'function') {
        this.app.destroy();
      }
      if (this.canvasContainer) {
        this.canvasContainer.remove();
      }

      if (
        typeof KeyCommandHandler !== 'undefined' &&
        typeof KeyCommandHandler.destroy === 'function'
      ) {
        KeyCommandHandler.destroy();
      }

      // Surgically clean up View Controls
      if (typeof ViewControlsManager !== 'undefined') {
        try {
          ViewControlsManager.destroy();
        } catch (e) {}
      }

      if (this.baseController) {
        if (
          this.baseController.accuDrawDiagnostics &&
          this.baseController.accuDrawDiagnostics.dialog
        ) {
          try {
            this.baseController.accuDrawDiagnostics.dialog.close();
          } catch (e) {}
        }
        if (
          this.baseController.accuDrawTestHarness &&
          typeof this.baseController.accuDrawTestHarness.destroy === 'function'
        ) {
          try {
            this.baseController.accuDrawTestHarness.destroy();
          } catch (e) {}
        }
        if (this.baseController.accuDraw && this.baseController.accuDraw.ui) {
          if (typeof this.baseController.accuDraw.ui.destroy === 'function') {
            try {
              this.baseController.accuDraw.ui.destroy();
            } catch (e) {}
          } else {
            try {
              this.baseController.accuDraw.ui.hide();
            } catch (e) {}
          }
        }
      }

      this.rootElement = null;
      this.canvasContainer = null;
      this.app = null;
      this.baseController = null;
      this.threeDView = null;
    }
}