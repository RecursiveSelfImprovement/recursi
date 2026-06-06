
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
          // Right Single Click Timer
          clearTimeout(controller.pendingClickTimer);
          controller.pendingClickTimer = setTimeout(() => {
            if (
              controller.rightDownTime !== null &&
              controller.leftDownTime === null
            ) {
              this._processSingleRightClick(controller, event);
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
      if (controller.isKeystrokeCaptureActive === false) {
        return;
      }

      const target = event.target;
      const isTextInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTextInput) {
        return;
      }

      if (event.key === 'Alt' || event.key === 'Meta') {
        controller._ctrlDown = true;
      }
      if (event.key === 'Shift') {
        controller._shiftDown = true;
      }

      const logic = controller.accuDrawLogic;
      const activeInput = controller.accuDraw?.ui?.inputs?.find(i => i.name === logic?.currentAxis);
      const diag = controller.accuDrawDiagnostics;

      if (logic && activeInput) {
        // --- 1. NUMERICAL & DECIMAL INSETS ---
        if (/[0-9.\-+]/.test(event.key) && event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          event.stopPropagation();

          if (!logic.inputActive) {
            logic.inputActive = true;
            logic.stickyFocus = true;
            logic.inputBuffer = '';
            activeInput.caretIndex = 0;
            if (!logic.typingMouseAnchor) {
              logic.typingMouseAnchor = { ...logic.lastLocalDelta };
            }
          }

          const buffer = logic.inputBuffer || '';
          const idx = activeInput.caretIndex;
          const newBuffer = buffer.slice(0, idx) + event.key + buffer.slice(idx);

          logic.inputBuffer = newBuffer;
          activeInput.caretIndex = idx + 1;
          logic.isLocked[logic.currentAxis] = true;
          controller.accuDraw.ui.setLocked(logic.currentAxis, true);

          // LOG EVENT: keystroke tracking
          if (diag) {
            diag.logEvent('key:insert', `char="${event.key}" buffer="${newBuffer}" caret=${activeInput.caretIndex}`);
          }

          logic.onUiValueChange(logic.currentAxis, newBuffer);
          activeInput.renderText();
          return;
        }

        // --- 2. THE CAD SMART BACKSPACE ---
        if (event.key === 'Backspace') {
          event.preventDefault();
          event.stopPropagation();

          if (logic.inputActive) {
            const buffer = logic.inputBuffer || '';
            const idx = activeInput.caretIndex;
            if (idx > 0) {
              const newBuffer = buffer.slice(0, idx - 1) + buffer.slice(idx);
              logic.inputBuffer = newBuffer;
              activeInput.caretIndex = idx - 1;

              // LOG EVENT: backspace tracking
              if (diag) {
                diag.logEvent('key:backspace', `buffer="${newBuffer}" caret=${activeInput.caretIndex}`);
              }

              if (newBuffer.length === 0) {
                logic.inputActive = false;
                logic.stickyFocus = false;
                logic.isLocked[logic.currentAxis] = false;
                controller.accuDraw.ui.setLocked(logic.currentAxis, false);
                controller.refreshMousePosition();
              } else {
                logic.onUiValueChange(logic.currentAxis, newBuffer);
              }
              activeInput.renderText();
            }
          } else {
            // Initiate Smart Edit from dynamic coordinate tracking
            const currentVal = parseFloat(activeInput.currentValueStr);
            if (!isNaN(currentVal)) {
              let valStr = currentVal.toFixed(4);
              if (valStr.endsWith('.0000')) {
                valStr = Math.floor(currentVal).toString();
              }
              const truncatedStr = valStr.slice(0, -1);

              logic.inputActive = true;
              logic.stickyFocus = true;
              logic.inputBuffer = truncatedStr;
              activeInput.caretIndex = truncatedStr.length;
              logic.isLocked[logic.currentAxis] = true;
              controller.accuDraw.ui.setLocked(logic.currentAxis, true);

              // LOG EVENT: smart edit tracking
              if (diag) {
                diag.logEvent('key:smart-backspace', `from="${valStr}" to="${truncatedStr}"`);
              }

              logic.onUiValueChange(logic.currentAxis, truncatedStr);
              activeInput.renderText();
            }
          }
          return;
        }

        // --- 3. DELETE CHARACTER ---
        if (event.key === 'Delete') {
          event.preventDefault();
          event.stopPropagation();

          if (logic.inputActive) {
            const buffer = logic.inputBuffer || '';
            const idx = activeInput.caretIndex;
            if (idx < buffer.length) {
              const newBuffer = buffer.slice(0, idx) + buffer.slice(idx + 1);
              logic.inputBuffer = newBuffer;

              // LOG EVENT: delete key
              if (diag) {
                diag.logEvent('key:delete', `buffer="${newBuffer}" caret=${activeInput.caretIndex}`);
              }

              if (newBuffer.length === 0) {
                logic.inputActive = false;
                logic.stickyFocus = false;
                logic.isLocked[logic.currentAxis] = false;
                controller.accuDraw.ui.setLocked(logic.currentAxis, false);
                controller.refreshMousePosition();
              } else {
                logic.onUiValueChange(logic.currentAxis, newBuffer);
              }
              activeInput.renderText();
            }
          }
          return;
        }

        // --- 4. NAVIGATION KEYS (Caret & Tab shifts) ---
        if (event.key === 'ArrowLeft') {
          if (logic.inputActive) {
            event.preventDefault();
            event.stopPropagation();
            activeInput.caretIndex = Math.max(0, activeInput.caretIndex - 1);
            
            // LOG EVENT: caret navigation
            if (diag) {
              diag.logEvent('key:arrow-left', `caret=${activeInput.caretIndex}`);
            }
            
            activeInput.renderText();
          }
          return;
        }

        if (event.key === 'ArrowRight') {
          if (logic.inputActive) {
            event.preventDefault();
            event.stopPropagation();
            const buffer = logic.inputBuffer || '';
            activeInput.caretIndex = Math.min(buffer.length, activeInput.caretIndex + 1);
            
            // LOG EVENT: caret navigation
            if (diag) {
              diag.logEvent('key:arrow-right', `caret=${activeInput.caretIndex}`);
            }

            activeInput.renderText();
          }
          return;
        }

        if (event.key === 'Home') {
          if (logic.inputActive) {
            event.preventDefault();
            event.stopPropagation();
            activeInput.caretIndex = 0;
            activeInput.renderText();
          }
          return;
        }

        if (event.key === 'End') {
          if (logic.inputActive) {
            event.preventDefault();
            event.stopPropagation();
            activeInput.caretIndex = (logic.inputBuffer || '').length;
            activeInput.renderText();
          }
          return;
        }

        if (event.key === 'Enter') {
          if (logic.inputActive) {
            event.preventDefault();
            event.stopPropagation();
            
            // LOG EVENT: enter confirmation
            if (diag) {
              diag.logEvent('key:enter', `confirmed="${logic.inputBuffer}" on ${logic.currentAxis}`);
            }

            logic.confirmInput();
          }
          return;
        }
      }

      // --- GLOBAL FIELD NAVIGATION (Tab) ---
      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        const dir = event.shiftKey ? 'prev' : 'next';
        
        // LOG EVENT: field shift
        if (diag) {
          diag.logEvent('key:tab', `dir="${dir}"`);
        }

        if (controller.accuDraw?.ui && typeof controller.accuDraw.ui.navigateField === 'function') {
          controller.accuDraw.ui.navigateField(dir);
        }
        return;
      }

      // --- THE ACCUDRAW ESCAPE HIERARCHY ---
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        // Priority 1: Clear active typing and restore dynamic tracking
        if (logic && logic.inputActive) {
          // LOG EVENT: cancel typing
          if (diag) {
            diag.logEvent('lock:escape', `canceled typing on ${logic.currentAxis}`);
          }

          logic.inputActive = false;
          logic.inputBuffer = '';
          logic.stickyFocus = false;
          logic.typingMouseAnchor = null;

          const currentAxis = logic.currentAxis;
          logic.isLocked[currentAxis] = false;
          if (controller.accuDraw?.ui) {
            controller.accuDraw.ui.setLocked(currentAxis, false);
            controller.accuDraw.ui.focusField(currentAxis);
          }
          controller.refreshMousePosition();
          return;
        }

        // Priority 2: Unlock ONLY the currently active/focused field
        if (logic) {
          const currentAxis = logic.currentAxis;
          if (logic.isLocked[currentAxis]) {
            // LOG EVENT: unlock field
            if (diag) {
              diag.logEvent('lock:escape', `unlocked ${currentAxis}`);
            }

            logic.isLocked[currentAxis] = false;
            logic.stickyFocus = false;
            if (controller.accuDraw?.ui) {
              controller.accuDraw.ui.setLocked(currentAxis, false);
              controller.accuDraw.ui.focusField(currentAxis);
            }
            controller.refreshMousePosition();
            return;
          }
        }

        // Priority 3: Close active key command popups
        if (controller._helpDialog) {
          controller._helpDialog.close();
          controller._helpDialog = null;
          return;
        }

        // Priority 4: Reset active drawing tool
        if (controller.activeCommand?.reset) {
          controller.activeCommand.reset();
        }
        return;
      }

      // Pass input to AccuDraw Logic (Alphabetical Shortcuts, etc)
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
        // Process Left single click instantly on release if chord timer is still active
        if (
          controller.pendingClickTimer &&
          controller.leftDownTime !== null &&
          controller.rightDownTime === null
        ) {
          clearTimeout(controller.pendingClickTimer);
          controller.pendingClickTimer = null;
          this._processSingleLeftClick(controller, event);
        }
        controller.leftDownTime = null;
      } else if (event.button === 2) {
        // Process Right single click instantly on release if chord timer is still active
        if (
          controller.pendingClickTimer &&
          controller.rightDownTime !== null &&
          controller.leftDownTime === null
        ) {
          clearTimeout(controller.pendingClickTimer);
          controller.pendingClickTimer = null;
          this._processSingleRightClick(controller, event);
        }
        controller.rightDownTime = null;
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

  static _processSingleRightClick(controller, event) {
      // 1. Release Tentative Point (Force Clear)
      if (controller._tentativeOriginalPoint) {
        console.log(
          '%cRight Click: Released Tentative Point',
          'color: yellow'
        );
        TentativePointHandler._clearTentativePoint(controller);
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
    }
}

