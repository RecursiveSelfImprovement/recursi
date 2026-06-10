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
        throw new Error(
          '[accuCad] run() requires an environment object with a valid container.'
        );
      }

      const parentElement = env.container;
      this.rootElement = parentElement;

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

      this._scrollResetHandler = resetScroll;

      const layoutWrapper = document.createElement('div');
      layoutWrapper.id = 'accucad-layout-wrapper';
      layoutWrapper.style.cssText =
        'display: flex; flex-direction: row; width: 100%; height: 100%; overflow: hidden; position: relative;';
      parentElement.appendChild(layoutWrapper);
      this.layoutWrapper = layoutWrapper;

      const canvasId = 'accucad-canvas-' + Math.random().toString(36).slice(2);
      const canvasContainer = document.createElement('div');
      canvasContainer.id = canvasId;
      canvasContainer.style.cssText =
        'flex-grow: 1; height: 100%; position: relative; overflow: hidden;';
      layoutWrapper.appendChild(canvasContainer);
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
        ro.observe(canvasContainer);
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
        onUpdate: () => this._onUpdate(),
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

      // Setup SidePanel UI structure using the new, generic constructor
      if (typeof SidePanel !== 'undefined') {
        const sidePanelEnv = { container: layoutWrapper };
        this.sidePanel = new SidePanel('left', 260, sidePanelEnv);

        // Populate the specific CAD sections from here
        this.sidePanel.toolSettingsSection = this.sidePanel.addSection(
          'setup',
          'Tool Settings',
          true
        );
        this.sidePanel.compassSection = this.sidePanel.addSection(
          'compass',
          'Compass Controls',
          true
        );
        this.sidePanel.p2pSection = this.sidePanel.addSection(
          'p2p',
          'Controller',
          false
        );

        this.baseController.sidePanel = this.sidePanel;

        layoutWrapper.insertBefore(this.sidePanel.element, canvasContainer);
        this._setupToolSettingsWatcher();

        // Instantiate and load database manager UI inside sidePanel
        if (typeof CadStorageManager !== 'undefined') {
          this.storageManager = new CadStorageManager(this.baseController);
          this.storageManager.renderUI();
        }

        // Explicitly open the sidebar on startup for accuCad
        this.sidePanel.open();
      }

      // Initialize P2PConnector (pointing to our shared library module)
      if (typeof P2PConnector !== 'undefined') {
        this.baseController.p2pConnector = new P2PConnector(this.baseController);
        if (this.sidePanel) {
          this.baseController.p2pConnector.renderControls(
            this.sidePanel.p2pSection
          );
        }
      }

      if (typeof ViewControlsManager !== 'undefined') {
        const compassContainer = this.sidePanel
          ? this.sidePanel.compassSection
          : null;
        ViewControlsManager.init(
          this.baseController,
          this.threeDView,
          compassContainer
        );
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

      // Prevent automatic requests for MIDI access unless the option has been persistently enabled by the user
      if (
        localStorage.getItem('midi-controller-enabled') === 'true' &&
        typeof MidiInputHandler !== 'undefined' &&
        typeof MidiInputHandler.init === 'function'
      ) {
        MidiInputHandler.init((status) => {});
      }

      if (typeof CameraOrbitAnimator !== 'undefined') {
        CameraOrbitAnimator.setDependencies(this.threeDView);
      }

      if (typeof DebugConfig !== 'undefined') {
        if (DebugConfig.exposeThreeDView) globalThis.threeDView = this.threeDView;
        if (DebugConfig.exposeBaseController)
          globalThis.baseController = this.baseController;
      }

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

      // Close the P2P connection and dialog
      if (this.baseController && this.baseController.p2pConnector) {
        try {
          this.baseController.p2pConnector.destroy();
        } catch (e) {}
      }

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

      if (this.layoutWrapper) {
        this.layoutWrapper.remove();
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

      this.storageManager = null;
      this.rootElement = null;
      this.canvasContainer = null;
      this.layoutWrapper = null;
      this.app = null;
      this.baseController = null;
      this.threeDView = null;
    }

  _setupToolSettingsWatcher() {
      this.toolSliders = {};
      const render = () => {
        if (!this.sidePanel || !this.sidePanel.toolSettingsSection) return;
        this.sidePanel.toolSettingsSection.innerHTML = '';
        this.toolSliders = {};

        const controller = this.baseController;
        if (!controller) return;

        const activeCmd = controller.activeCommand;
        const cmdName = activeCmd
          ? activeCmd.constructor
            ? activeCmd.constructor.name
            : 'Unknown'
          : 'None';

        const friendlyNames = {
          DrawRectangleCommand: 'Rectangle Tool',
          DrawArcCommand: 'Arc Tool',
          DrawPathCommand: 'Rounding Tool',
          DrawCurveCommand: 'Bezier Curve Tool',
          DrawCircleCommand: 'Circle Tool',
          DrawCapsuleCommand: 'Capsule Tool',
          DeleteElementCommand: 'Delete Tool',
          MoveElementCommand: 'Move Element Tool',
          RotateElementCommand: 'Rotate Element Tool',
          ScaleElementCommand: 'Scale Element Tool'
        };
        const displayName =
          friendlyNames[cmdName] || cmdName.replace('Command', ' Tool');

        if (
          this.sidePanel.sectionObjects &&
          this.sidePanel.sectionObjects['setup']
        ) {
          this.sidePanel.sectionObjects['setup'].header.textContent = displayName;
        }

        const colorContainer = document.createElement('div');
        colorContainer.style.cssText =
          'display: flex; align-items: center; justify-content: space-between; padding: 4px 0; margin-bottom: 8px;';

        const colorLabel = document.createElement('div');
        colorLabel.style.cssText =
          'font-size: 11px; color: #aaa; text-transform: uppercase; font-weight: bold;';
        colorLabel.textContent = 'Drawing Color';

        const swatch = document.createElement('div');
        swatch.className = 'drawing-color-swatch-picker';
        swatch.style.cssText = `width: 42px; height: 20px; border-radius: 4px; background-color: ${
          controller.currentColor || '#00ff00'
        }; border: 1px solid #555; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.5);`;

        controller.colorSwatchPicker = swatch;

        swatch.onclick = (e) => {
          e.stopPropagation();
          const picker = new ColorPicker();
          picker.openSmartPicker(
            swatch,
            controller.currentColor || '#00ff00',
            (newColor) => {
              swatch.style.backgroundColor = newColor;
              controller.setColor(newColor);
              controller.refreshMousePosition();
            }
          );
        };

        colorContainer.appendChild(colorLabel);
        colorContainer.appendChild(swatch);
        this.sidePanel.toolSettingsSection.appendChild(colorContainer);

        const widthSlider = new SliderControl({
          label: 'line thickness',
          min: 1,
          max: 20,
          initialValue: controller.lineWidth || 2,
          showValue: true,
          callback: (val) => {
            controller.setLineWidth(Math.round(val));
            controller.refreshMousePosition();
          },
        });
        this.sidePanel.toolSettingsSection.appendChild(widthSlider.container);
        this.toolSliders['lineWidth'] = widthSlider;

        const supportsControlValue = [
          'DrawPathCommand',
          'DrawCapsuleCommand',
        ].includes(cmdName);

        if (supportsControlValue) {
          let label = 'tool custom parameter';
          let minVal = 0.05,
            maxVal = 2.0;
          if (cmdName === 'DrawPathCommand') {
            label = 'rounding radius';
            minVal = 0;
            maxVal = 1.0;
          } else if (cmdName === 'DrawCapsuleCommand') {
            label = 'capsule radius';
            minVal = 0.1;
            maxVal = 1.5;
          }

          const controlValueSlider = new SliderControl({
            label: label,
            min: minVal,
            max: maxVal,
            initialValue: controller.commandControlValue || 0.25,
            showValue: true,
            directEntry: true,
            callback: (val) => {
              controller.commandControlValue = val;
              controller.refreshMousePosition();
            },
          });
          this.sidePanel.toolSettingsSection.appendChild(
            controlValueSlider.container
          );
          this.toolSliders['commandControlValue'] = controlValueSlider;
        }

        // Render custom checkboxes specifically for the Move Element command
        if (cmdName === 'MoveElementCommand') {
          const createCheckbox = (labelText, checkedValue, callback) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 6px 0; margin-bottom: 4px;';
            
            const label = document.createElement('div');
            label.style.cssText = 'font-size: 11px; color: #aaa; text-transform: uppercase; font-weight: bold;';
            label.textContent = labelText;

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = checkedValue;
            input.setAttribute('tabindex', '-1');
            input.style.cssText = 'cursor: pointer; width: 16px; height: 16px; accent-color: #00e676;';
            input.onchange = (e) => callback(e.target.checked);

            input.addEventListener('focus', () => {
              input.blur();
              controller.domElement.focus();
            });

            row.appendChild(label);
            row.appendChild(input);
            return row;
          };

          const copyCb = createCheckbox('Make Copy', activeCmd.makeCopy, (checked) => {
            activeCmd.makeCopy = checked;
          });
          const anchorCb = createCheckbox('Arbitrary Anchor', activeCmd.useDifferentStartPoint, (checked) => {
            activeCmd.useDifferentStartPoint = checked;
            activeCmd.reset(); // Reset command states on mode switches
          });

          this.sidePanel.toolSettingsSection.appendChild(copyCb);
          this.sidePanel.toolSettingsSection.appendChild(anchorCb);
        }

        controller.toolSliders = this.toolSliders;

        if (
          window.ViewControlsManager &&
          window.ViewControlsManager.instance &&
          typeof window.ViewControlsManager.instance
            ._updateSlidersHighlighting === 'function'
        ) {
          window.ViewControlsManager.instance._updateSlidersHighlighting();
        }
      };

      window.addEventListener('accucad-tool-changed', () => {
        render();
      });

      render();
    }
}