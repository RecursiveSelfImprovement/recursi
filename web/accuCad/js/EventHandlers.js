
class EventHandlers {
  static setupEventListeners(controller) {
      controller.domElement.addEventListener('mousedown', (e) =>
        this.handleMouseDown(controller, e)
      );
      controller.domElement.addEventListener('mouseup', (e) =>
        this.handleMouseUp(controller, e)
      );
      controller.domElement.addEventListener('mousemove', (e) =>
        this.handleMouseMove(controller, e)
      );
      controller.domElement.addEventListener('wheel', (e) =>
        this.handleMouseWheel(controller, e)
      );
      
      controller.domElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
      
      document.addEventListener('keydown', (e) =>
        this.handleKeyDown(controller, e)
      );
      document.addEventListener('keyup', (e) => this.handleKeyUp(controller, e));
    }

  static handleMouseDown(controller, event) {
    const now = performance.now();

    if (event.button === 0) {
      // Left Button (Data Button)
      controller.leftDownTime = now;

      if (
        controller.rightDownTime !== null &&
        now - controller.rightDownTime < controller.chordThreshold
      ) {
        // Chord detected (R -> L)
        event.preventDefault();
        clearTimeout(controller.pendingClickTimer);
        controller.pendingClickTimer = null;

        TentativePointHandler._clearTentativePoint(controller, true);
        TentativePointHandler.handleTentativePoint(controller, event);

        controller.leftDownTime = null;
        controller.rightDownTime = null;
      } else {
        // Left Single Click Timer
        clearTimeout(controller.pendingClickTimer);
        controller.pendingClickTimer = setTimeout(() => {
          if (
            controller.leftDownTime !== null &&
            controller.rightDownTime === null
          ) {
            // SAFETY CHECK: If we have a tentative point, ensure we process the click
            // even if something else state-wise is weird.
            this._processSingleLeftClick(controller, event);
            controller.leftDownTime = null;
          }
          controller.pendingClickTimer = null;
        }, controller.chordThreshold);
      }
    } else if (event.button === 2) {
      // Right Button (Reset Button)
      controller.rightDownTime = now;

      if (
        controller.leftDownTime !== null &&
        now - controller.leftDownTime < controller.chordThreshold
      ) {
        // Chord detected (L -> R)
        event.preventDefault();
        clearTimeout(controller.pendingClickTimer);
        controller.pendingClickTimer = null;

        TentativePointHandler._clearTentativePoint(controller, true);
        TentativePointHandler.handleTentativePoint(controller, event);

        controller.leftDownTime = null;
        controller.rightDownTime = null;
      } else {
        // Right Single Click Timer (Reset Hierarchy)
        clearTimeout(controller.pendingClickTimer);
        controller.pendingClickTimer = setTimeout(() => {
          if (
            controller.rightDownTime !== null &&
            controller.leftDownTime === null
          ) {
            // --- HIERARCHY START ---

            // 1. Release Tentative Point (Force Clear)
            if (controller._tentativeOriginalPoint) {
              console.log(
                '%cRight Click: Released Tentative Point',
                'color: yellow'
              );
              TentativePointHandler._clearTentativePoint(controller);
              controller.rightDownTime = null;
              controller.pendingClickTimer = null;
              // Ensure mouse position is refreshed to update cursor
              controller.refreshMousePosition();
              return;
            }

            // 2. Unlock AccuDraw / Clear Input
            let consumed = false;
            if (controller.accuDrawLogic) {
              consumed = controller.accuDrawLogic.handleInput('Escape');
            }

            // 3. Reset Command
            if (!consumed) {
              console.log('%cRight Click: Resetting Command', 'color: orange');
              if (controller.activeCommand?.reset) {
                controller.activeCommand.reset();
              }
            } else {
              console.log('%cRight Click: Unlocked AccuDraw', 'color: cyan');
            }
            // --- HIERARCHY END ---

            controller.rightDownTime = null;
          }
          controller.pendingClickTimer = null;
        }, controller.chordThreshold);
      }
    }
  }

  static handleMouseWheel(controller, event) {
    if (event.altKey || event.metaKey) {
      ViewManipulator.handleControlMouseWheel(controller, event);
    }
  }

  static handleMouseMove(controller, event) {
    const screenSize = [
      controller.domElement.clientWidth,
      controller.domElement.clientHeight,
    ];
    controller._lastMousePosition = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
    controller._ctrlDown = event.altKey;
    controller._shiftDown = event.shiftKey;

    // 1. Handle View Manipulation
    if (event.altKey || event.metaKey || event.shiftKey) {
      ViewManipulator.handleControlMouseMove(controller, event, {
        keys: { ctrl: event.altKey || event.metaKey, shift: event.shiftKey },
      });
      return;
    }

    // 2. Standard Drawing Logic
    const markerSize = controller.originMarker
      ? controller.originMarker.options.size
      : 1;

    const livePointData = GeneratePoint.generate({
      clientPoint: [event.clientX, event.clientY],
      domElement: controller.domElement,
      size: screenSize,
      camera: controller.view.camera,
      origin: controller.origin,
      planeNormal: controller.rotationMatrix[2],
      indexEnabled: controller.indexEnabled,
      indexTolerance: controller.indexTolerance,
      rotationMatrix: controller.rotationMatrix,
      markerSize: markerSize,
    });

    // Determine Raw Input (Snap > Index > Plane)
    let rawInputPoint = livePointData.originProjectedPoint;

    // Tentative point takes precedence as the "raw" source
    const hasTentative = !!controller._tentativeOriginalPoint;

    if (hasTentative) {
      rawInputPoint = controller._tentativeOriginalPoint;
    } else if (livePointData.indexedToAxis && livePointData.indexedPoint) {
      rawInputPoint = livePointData.indexedPoint;
    }

    let finalConstrainedPoint = rawInputPoint;
    let isConstrained = false;

    // 3. AccuDraw Constraints
    if (controller.accuDrawLogic) {
      controller.accuDrawLogic.onMotion(
        rawInputPoint,
        controller._tentativeOriginalPoint,
        livePointData.indexedToAxis
      );

      finalConstrainedPoint = controller.accuDrawLogic.getConstrainedPoint(
        rawInputPoint,
        controller._tentativeOriginalPoint
      );

      let dx = 0, dy = 0, dz = 0, distSq = 0;
      if (finalConstrainedPoint && rawInputPoint) {
        dx = finalConstrainedPoint[0] - rawInputPoint[0];
        dy = finalConstrainedPoint[1] - rawInputPoint[1];
        dz = finalConstrainedPoint[2] - rawInputPoint[2];
        distSq = dx * dx + dy * dy + dz * dz;
      } else {
        finalConstrainedPoint = rawInputPoint; // Fallback to avoid breaking later code
      }

      if (distSq > 0.000001 || controller.zPlaneLocked || hasTentative) {
        isConstrained = true;
      }
    }

    // 4. Update Controller State
    controller._lastWorldPoint = finalConstrainedPoint;

    // 5. Visual Feedback — Index Line & Axis Animation
    //
    // HIERARCHY for the index line display:
    //   Hard Lock > Tentative Point > Soft Index
    //
    // Rules:
    //   - Tentative active + no hard locks => suppress ALL soft indexing
    //   - Hard lock on axis A to NON-ZERO => suppress the index for axis B
    //     (because indexing to B implies A=0, which contradicts the lock)
    //   - Hard lock on axis A to ~ZERO => show axis B index line
    //     (lock to zero IS the same as indexing, it's consistent)
    //   - No locks, no tentative => normal geometric proximity indexing

    if (controller.accuDraw) {
      const logic = controller.accuDrawLogic;
      const EPSILON = 0.0001;

      // Start with the geometric proximity index from GeneratePoint
      let geometricIndex = livePointData.indexedToAxis;

      // Determine what the visual axis indicator should be
      let visualAxis = null;

      if (logic) {
        const xLocked = logic.isLocked.x;
        const yLocked = logic.isLocked.y;
        const xLockedToZero =
          xLocked && Math.abs(logic.lockedValues.x) < EPSILON;
        const yLockedToZero =
          yLocked && Math.abs(logic.lockedValues.y) < EPSILON;
        const xLockedToNonZero = xLocked && !xLockedToZero;
        const yLockedToNonZero = yLocked && !yLockedToZero;

        // --- HARD LOCK cases (highest priority) ---
        if (xLockedToZero && yLockedToZero) {
          // Both locked to zero = origin snap, show both axes pulsing
          visualAxis = 'xy';
          isConstrained = true;
        } else if (yLockedToZero) {
          // Y locked to 0 => cursor is on X-axis. Show X index.
          visualAxis = 'x';
          isConstrained = true;
        } else if (xLockedToZero) {
          // X locked to 0 => cursor is on Y-axis. Show Y index.
          visualAxis = 'y';
          isConstrained = true;
        } else if (xLockedToNonZero && yLockedToNonZero) {
          // Both locked to non-zero: fully constrained point, no axis line needed
          visualAxis = null;
          isConstrained = true;
        } else if (xLockedToNonZero) {
          // X is locked to non-zero. The Y-axis index (which implies X=0) is WRONG.
          // Only show X-axis index if cursor happens to be near it (Y near zero geometrically).
          // But actually: X is constrained, cursor moves in Y only.
          // Suppress the Y-axis index line (indexing to Y implies X=0, contradicts lock).
          // The X-axis index (Y=0) is still valid as a soft snap target.
          if (geometricIndex === 'x') {
            visualAxis = 'x'; // Y near zero — valid, consistent with free Y movement
          } else {
            visualAxis = null; // Y-axis index would imply X=0, suppress it
          }
          isConstrained = true;
        } else if (yLockedToNonZero) {
          // Y is locked to non-zero. The X-axis index (which implies Y=0) is WRONG.
          // Only show Y-axis index if cursor is near it (X near zero geometrically).
          if (geometricIndex === 'y') {
            visualAxis = 'y'; // X near zero — valid, consistent with free X movement
          } else {
            visualAxis = null; // X-axis index would imply Y=0, suppress it
          }
          isConstrained = true;
        } else if (hasTentative) {
          // --- TENTATIVE cases (second priority) ---
          // Tentative point active, no hard locks.
          // Suppress ALL soft indexing — the snap point is the authority.
          visualAxis = null;
          isConstrained = true;
        } else {
          // --- NO LOCKS, NO TENTATIVE (lowest priority) ---
          // Normal free cursor: use geometric proximity index
          visualAxis = geometricIndex;
        }
      } else {
        // No AccuDraw logic at all — just use raw geometric index
        visualAxis = hasTentative ? null : geometricIndex;
      }

      // Apply the visual feedback
      controller.accuDraw.updateIndexIndicator(
        controller.origin,
        finalConstrainedPoint,
        rawInputPoint,
        visualAxis,
        isConstrained,
        hasTentative
      );

      if (controller.accuDraw.setAxisAnimation) {
        controller.accuDraw.setAxisAnimation(visualAxis);
      }
    }

    // 6. Send to Command
    if (controller.activeCommand?.onPoint) {
      controller.activeCommand.onPoint({
        mode: 'hover',
        event: event,
        screenPoint: livePointData.screenPoint,
        rawPoint: rawInputPoint,
        point: finalConstrainedPoint,
        screenSize: screenSize,
        keys: { ctrl: event.altKey, shift: event.shiftKey },
        view: controller.view.transformData,
        indexedToAxis: livePointData.indexedToAxis,
      });
    }
  }

  static handleKeyDown(controller, event) {
      // 1. Absolute Release: Bypass completely if capturing is disabled
      if (controller.isKeystrokeCaptureActive === false) {
        return;
      }

      const target = event.target;
      const isTextInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      
      if (isTextInput) {
        // 2. Absolute Grab: Actively prevent characters from writing to external text containers
        if (!target.classList || !target.classList.contains('accudrawInput')) {
          event.preventDefault();
          event.stopPropagation();
        }
      }

      if (event.key === 'Alt' || event.key === 'Meta') {
        controller._ctrlDown = true;
      }
      if (event.key === 'Shift') {
        controller._shiftDown = true;
      }

      // Escape Hierarchy
      if (event.key === 'Escape') {
        // 1. Release Tentative Point
        if (controller._tentativeOriginalPoint) {
          TentativePointHandler._clearTentativePoint(controller);
          return;
        }

        // 2. Unlock AccuDraw
        if (
          controller.accuDrawLogic &&
          controller.accuDrawLogic.handleInput('Escape')
        ) {
          return;
        }

        // 3. Reset Command
        if (controller.activeCommand?.reset) {
          controller.activeCommand.reset();
        }
      }

      // Pass input to AccuDraw Logic (Numbers)
      if (controller.accuDrawLogic) {
        const handled = controller.accuDrawLogic.handleInput(event.key);
        if (handled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }

  static handleKeyUp(controller, event) {
      // Absolute Release: Bypass completely if capturing is disabled
      if (controller.isKeystrokeCaptureActive === false) {
        return;
      }

      if (event.key === 'Alt' || event.key === 'Meta') {
        controller._ctrlDown = false;
        controller._lastControlMousePos = null;
        controller._lastMetaWorldPoint = null;
      }
      if (event.key === 'Shift') {
        controller._shiftDown = false;
        controller._lastMetaWorldPoint = null;
      }
    }

  static _processSingleLeftClick(controller, event) {
    const screenSize = [
      controller.domElement.clientWidth,
      controller.domElement.clientHeight,
    ];

    // 1. Establish the "Raw" point (before AccuDraw constraints)
    let rawPointToUse = null;

    if (controller._tentativeOriginalPoint) {
      // If we have a tentative point, THAT is our raw input.
      // (Ignoring the Z-lock projection for a moment, as we want the
      // AccuDrawLogic to be the single source of truth for constraints)
      rawPointToUse = controller._tentativeOriginalPoint;
    } else {
      // Fallback: Calculate from Mouse Ray
      const markerSize = controller.originMarker
        ? controller.originMarker.options.size
        : 1;
      const livePointData = GeneratePoint.generate({
        clientPoint: [event.clientX, event.clientY],
        domElement: controller.domElement,
        size: screenSize,
        camera: controller.view.camera,
        origin: controller.origin,
        planeNormal: controller.rotationMatrix[2],
        indexEnabled: controller.indexEnabled,
        indexTolerance: controller.indexTolerance,
        rotationMatrix: controller.rotationMatrix,
        markerSize: markerSize,
      });

      rawPointToUse = livePointData.originProjectedPoint;

      // Apply soft snap logic if index is active
      if (
        livePointData.indexedToAxis &&
        livePointData.indexedPoint &&
        !controller.accuDrawLogic?.isLocked.x && // Don't use soft snap if hard locked
        !controller.accuDrawLogic?.isLocked.y
      ) {
        rawPointToUse = livePointData.indexedPoint;
      }
    }

    // 2. Apply AccuDraw Constraints
    // This ensures the point we click is EXACTLY the point shown by the Mini-Jack.
    let finalPoint = rawPointToUse;

    if (controller.accuDrawLogic) {
      // We pass the raw point as both arguments or just the second?
      // getConstrainedPoint(mouse, tentative).
      // If we came from tentative, we pass it as 2nd arg to ensure priority inside the logic.
      // If we came from mouse, we pass it as 1st arg.
      if (controller._tentativeOriginalPoint) {
        finalPoint = controller.accuDrawLogic.getConstrainedPoint(
          null,
          rawPointToUse
        );
      } else {
        finalPoint = controller.accuDrawLogic.getConstrainedPoint(
          rawPointToUse,
          null
        );
      }
    }

    // 3. Dispatch to Command
    if (controller.activeCommand?.onPoint) {
      controller.activeCommand.onPoint({
        mode: 'click',
        event: event,
        screenPoint: [event.clientX, event.clientY],
        rawPoint: rawPointToUse,
        point: finalPoint,
        screenSize: screenSize,
        keys: { ctrl: event.altKey, shift: event.shiftKey },
        view: controller.view.transformData,
        indexedToAxis: null,
      });

      controller._storePoint({
        pointData: {
          targetProjectedPoint: finalPoint,
          originProjectedPoint: finalPoint,
          indexedPoint: finalPoint,
          indexedToAxis: null,
        },
        view: controller.view.transformData,
        screenSize: screenSize,
        keys: { ctrl: event.altKey, shift: event.shiftKey },
      });
    }

    // --- RESET LOGIC ---
    // ALWAYS clear tentative point on click.
    TentativePointHandler._clearTentativePoint(controller);

    if (controller.accuDrawLogic) {
      controller.accuDrawLogic.reset();
    }
  }

  static handleMouseUp(controller, event) {
    if (event.button === 0) {
      controller.leftDownTime = null;
    } else if (event.button === 2) {
      controller.rightDownTime = null;
    }

    // If both buttons are now up, ensure no lingering timer can fire.
    // This is mainly for cases where a chord was started but one button was released
    // before the other was pressed, aborting the chord.
    if (controller.leftDownTime === null && controller.rightDownTime === null) {
      if (controller.pendingClickTimer) {
        clearTimeout(controller.pendingClickTimer);
        controller.pendingClickTimer = null;
      }
    }
  }


  static removeEventListeners(controller) {
      if (!controller || !controller._listeners) return;

      controller.domElement.removeEventListener('mousedown', controller._listeners.mousedown);
      controller.domElement.removeEventListener('mouseup', controller._listeners.mouseup);
      controller.domElement.removeEventListener('mousemove', controller._listeners.mousemove);
      controller.domElement.removeEventListener('wheel', controller._listeners.wheel);
      controller.domElement.removeEventListener('contextmenu', controller._listeners.contextmenu);

      document.removeEventListener('keydown', controller._listeners.keydown);
      document.removeEventListener('keyup', controller._listeners.keyup);

      delete controller._listeners;
    }
}

