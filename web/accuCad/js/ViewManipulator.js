
class ViewManipulator {
  static initStatics() {
    if (this._staticsInitialized) return;
    this._threeDView = null;
    this.SPIN_PER_PIXEL = 0.3;
    this.TILT_PER_PIXEL = 0.3;
    this.ZOOM_FACTOR = 0.05;
    this._staticsInitialized = true;
  }

  static setDependencies(threeDView) {
    this._threeDView = threeDView;
  }

  static computePanningTransform(controller, event) {
    // This function's logic is being reverted to match the older, smoother implementation.
    // The key difference is that the delta is calculated from a fixed anchor point
    // set at the beginning of the pan, rather than frame-to-frame, which prevents jitter.

    const camera = controller.view.camera;
    const target = controller.view.target;
    const viewNormalVec = new THREE.Vector3();
    viewNormalVec.subVectors(camera.position, target).normalize();
    const viewNormalArray = [viewNormalVec.x, viewNormalVec.y, viewNormalVec.z];
    const targetArray = [target.x, target.y, target.z];

    const pointData = GeneratePoint.generate({
      clientPoint: [event.clientX, event.clientY],
      domElement: controller.domElement,
      size: [
        controller.domElement.clientWidth,
        controller.domElement.clientHeight,
      ],
      camera: camera,
      origin: targetArray,
      planeNormal: viewNormalArray,
    });
    const currentWorldPoint = pointData.targetProjectedPoint;

    // If this is the first frame of the pan, set the anchor point and exit.
    if (!controller._lastMetaWorldPoint) {
      controller._lastMetaWorldPoint = currentWorldPoint;
      return { dx: 0, dy: 0, dz: 0 };
    }

    // Calculate the delta from the *original* anchor point of the pan.
    const delta = [
      controller._lastMetaWorldPoint[0] - currentWorldPoint[0],
      controller._lastMetaWorldPoint[1] - currentWorldPoint[1],
      controller._lastMetaWorldPoint[2] - currentWorldPoint[2],
    ];

    // NOTE: We do NOT update controller._lastMetaWorldPoint here. It remains fixed
    // for the duration of the pan gesture and is cleared on keyup. This matches
    // the logic from the older, smoother implementation.

    const distance = camera.position.distanceTo(target);
    const scaledDelta = [
      (delta[0] * 300) / distance,
      (delta[1] * 300) / distance,
      (delta[2] * 300) / distance,
    ];

    return { dx: scaledDelta[0], dy: scaledDelta[1], dz: scaledDelta[2] };
  }

  static computeRotatingTransform(controller, event) {
    if (!controller._lastControlMousePos) {
      controller._lastControlMousePos = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      return { spin: 0, tilt: 0 };
    }

    const deltaX = event.clientX - controller._lastControlMousePos.clientX;
    const deltaY = event.clientY - controller._lastControlMousePos.clientY;

    const spinMultiplier = window.SPIN_PER_PIXEL || this.SPIN_PER_PIXEL;
    const tiltMultiplier = window.TILT_PER_PIXEL || this.TILT_PER_PIXEL;

    const spinAmount = deltaX * spinMultiplier * 4;
    const tiltAmount = -deltaY * tiltMultiplier * 4;

    controller._lastControlMousePos = {
      clientX: event.clientX,
      clientY: event.clientY,
    };

    return { spin: spinAmount, tilt: tiltAmount };
  }

  static handleControlMouseMove(controller, event, { keys }) {
    this.initStatics();
    // Instead of stop(), we pause to allow resuming after interaction
    if (CameraOrbitAnimator._running) {
      CameraOrbitAnimator.pauseForInteraction();
    }
    controller._manualControlActive = true;

    const transform = { keys };
    let hasTransform = false;

    // If Ctrl/Alt/Meta is pressed, compute rotation (orbit).
    if (keys.ctrl) {
      const rotateTransform = this.computeRotatingTransform(controller, event);
      Object.assign(transform, rotateTransform);
      hasTransform = true;
    }

    // If Shift is pressed, compute panning.
    if (keys.shift) {
      const panTransform = this.computePanningTransform(controller, event);
      Object.assign(transform, panTransform);
      hasTransform = true;
    }

    // Apply the combined transformations if any were computed.
    if (hasTransform) {
      TransformView.transform(transform, controller.view);
    }

    // Reset state if a key is released, for safety.
    if (!keys.ctrl) {
      controller._lastControlMousePos = null;
    }
    if (!keys.shift) {
      controller._lastMetaWorldPoint = null;
    }
  }

  static handleControlMouseWheel(controller, event) {
    this.initStatics();
    event.preventDefault();

    // Pause instead of stop
    if (CameraOrbitAnimator._running) {
      CameraOrbitAnimator.pauseForInteraction();
    }

    const zoomMultiplier = window.ZOOM_FACTOR || this.ZOOM_FACTOR;
    const ddiagAmount = event.deltaY * zoomMultiplier;

    // Update keys to reflect new standard (Ctrl/Cmd for view manipulation)
    const transformObj = {
      ddiag: ddiagAmount,
      keys: { ctrl: event.ctrlKey || event.metaKey, shift: event.shiftKey },
    };
    TransformView.transform(transformObj, controller.view);
  }

}

