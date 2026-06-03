
class BaseController {
  constructor(threeDView, domElem) {
      this.view = threeDView;
      this.domElement = domElem || threeDView.renderer.domElement;
      this.cadElements = [];

      this.currentColor = '#0088FF';
      this.lineWidth = 4;
      this.origin = [0, 0, 0];
      this.basePlaneMatrix = [
        [1, 0, 0],
        [0, 0, -1],
        [0, 1, 0]
      ];
      this.rotationMatrix = [
        [1, 0, 0],
        [0, 0, -1],
        [0, 1, 0]
      ];
      this.originVisible = true;
      this.floatingOrigin = true;
      this.zPlaneLocked = false;
      this.activeCommand = null;
      this.commands = {};
      this.previousPoints = [];
      this.gridHelper = new THREE.GridHelper(20, 20);
      this.gridHelper.userData.isPickable = false;
      this.view.scene.add(this.gridHelper);
      this.tentativeMarker = null;
      this.tentativeProjectionLine = null;
      this._highlightedElement = null;
      this._tentativeTimeout = null;
      this._lastMousePosition = null;
      this._lastWorldPoint = null;
      this._lastControlMousePos = null;
      this._ctrlDown = false;
      this._lockedHoverPoint = null;
      this._lastMetaWorldPoint = null;
      this.indexEnabled = true;
      this.indexTolerance = 0.2;
      this._shiftDown = false;

      this.commandControlValue = 0.25;

      this.chordThreshold = 50;
      this.leftDownTime = null;
      this.rightDownTime = null;
      this.pendingClickTimer = null;

      this.accuDrawLogic = new AccuDrawLogic(this);

      EventHandlers.setupEventListeners(this);
    }

  _storePoint(pointData) {
    this.previousPoints.push(pointData);
    if (this.previousPoints.length > 10) {
      this.previousPoints.shift();
    }
  }

  registerCommand(name, command) {
    this.commands[name] = command;
  }

  setCommand(newCommand) {
    if (this.activeCommand && typeof this.activeCommand.reset === 'function') {
      this.activeCommand.reset();
    }
    this.activeCommand = newCommand;
  }

  setCommandByName(name) {
    if (this.commands[name]) {
      this.setCommand(this.commands[name]);
    } else {
      console.warn(`Command "${name}" not found.`);
    }
  }

  setDrawingPlane(planeType) {
      const PLANE_ROTATION_MATRICES = {
        front: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        top: [
          [1, 0, 0],
          [0, 0, -1],
          [0, 1, 0],
        ],
        side: [
          [0, 0, 1],
          [0, 1, 0],
          [-1, 0, 0],
        ],
      };
      this.basePlaneMatrix =
        PLANE_ROTATION_MATRICES[planeType] || PLANE_ROTATION_MATRICES.front;
      this.rotationMatrix = this.basePlaneMatrix;

      if (this.accuDraw) {
        this.accuDraw.setRotationAnimated(this.rotationMatrix, 0.3);
      }

      if (this.accuDrawLogic) {
        this.accuDrawLogic.setRotation(this.rotationMatrix);
      }

      if (typeof ViewControlsManager !== 'undefined' && ViewControlsManager.instance) {
        ViewControlsManager.instance.resetRotationSliders();
      }

      this.refreshMousePosition();
    }

  setOrigin(newOrigin) {
    if (Array.isArray(newOrigin) && newOrigin.length === 3) {
      this.origin = newOrigin.slice();
      if (this.accuDraw) {
        this.accuDraw.setCenterAnimated(newOrigin, 0.3);
      }
      if (this.accuDrawLogic) {
        this.accuDrawLogic.setOrigin(newOrigin);
      }
    }
  }

  refreshMousePosition() {
    if (!this._lastMousePosition || !this.activeCommand) return;

    // This logic should be handled by EventHandlers.handleMouseMove
    // For now, we'll leave a placeholder so things don't break.
    // A better refactor would have the handler call a method on the controller.
    const fakeEvent = {
      clientX: this._lastMousePosition.clientX,
      clientY: this._lastMousePosition.clientY,
      altKey: this._ctrlDown,
      shiftKey: this._shiftDown,
    };
    EventHandlers.handleMouseMove(this, fakeEvent);
  }

  getLastWorldPoint() {
    return this._lastWorldPoint;
  }

  setColor(colorHex) {
    this.currentColor = colorHex;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

}

