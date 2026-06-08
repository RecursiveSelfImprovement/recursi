
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

      // Dispatch high-performance custom event to trigger side panel redraw only when tool actually changes
      window.dispatchEvent(new CustomEvent('accucad-tool-changed', { detail: newCommand }));
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
        // Pass planeType directly so sliders update dynamically to match orientation
        ViewControlsManager.instance.resetRotationSliders(planeType);
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

  setColor(colorInput) {
      if (!colorInput) {
        this.currentColor = '#00ff00';
        return;
      }
      let colorStr = String(colorInput).trim();
      if (colorStr.startsWith('#')) {
        this.currentColor = colorStr;
        return;
      }
      // Parse rgb(r, g, b) format
      const rgbMatch = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (rgbMatch) {
        const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1])));
        const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2])));
        const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3])));
        const toHex = (x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };
        this.currentColor = '#' + toHex(r) + toHex(g) + toHex(b);
        return;
      }
      this.currentColor = colorStr;
    }

  setLineWidth(width) {
    this.lineWidth = width;
  }


  handleRemoteDrag(dx, dy, mode) {
      if (!this.view || !this.view.camera) return;
      const camera = this.view.camera;
      
      if (mode === 'rotate') {
        const sensitivity = 0.5;
        TransformView.transform({
          spin: dx * sensitivity,
          tilt: -dy * sensitivity
        }, this.view);
      } else if (mode === 'pan') {
        const vX = new THREE.Vector3();
        const vY = new THREE.Vector3();
        camera.matrix.extractBasis(vX, vY, new THREE.Vector3());

        const distance = camera.position.distanceTo(this.view.target);
        const panSpeed = 0.003 * (distance / 3);
        const translation = new THREE.Vector3()
          .addScaledVector(vX, -dx * panSpeed)
          .addScaledVector(vY, dy * panSpeed);

        const tx = (translation.x * 300) / distance;
        const ty = (translation.y * 300) / distance;
        const tz = (translation.z * 300) / distance;

        TransformView.transform({ dx: tx, dy: ty, dz: tz }, this.view);
      }
    }

  handleRemoteZoom(ratio) {
      if (!this.view) return;
      const factor = 1 / ratio;
      let ddiag;
      if (factor > 1) {
        ddiag = (factor - 1) * 100;
      } else {
        ddiag = (1 - 1 / factor) * 100;
      }
      ddiag = Math.max(-50, Math.min(50, ddiag));
      TransformView.transform({ ddiag }, this.view);
    }

  handleRemotePerspective(dy) {
      if (!this.view) return;
      const sensitivity = 0.15;
      TransformView.transform({ dfov: dy * sensitivity }, this.view)
        .then((finalValues) => {
          if (window.tableDialog) {
            window.tableDialog.updateValues({
              perspective: finalValues.fov
            });
          }
        })
        .catch((err) => console.error(err));
    }

  getP2PCapabilities() {
      return {
        leftTrackpad: {
          title: "Navigation",
          modes: {
            rotate: { label: "Rotate View", type: "drag" },
            pan: { label: "Pan View", type: "drag" }
          }
        },
        rightTrackpad: {
          title: "Controls",
          modes: {
            sliders: { label: "Compass Sliders", type: "sliders" },
            tool: { label: "Tool Sliders", type: "sliders" }
          }
        }
      };
    }
}

