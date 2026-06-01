class DragController {
  constructor(game) {
    this.game = game;
    this.dragState = null;
    this.tappedTileState = null;
    this._onDragMove = null;
    this._onLostPointerCapture = null;
    this._onTapDragMove = (event) => this.handleTapDragMove(event);
  }

  get board() {
    return this.game.board;
  }

  get boardElements() {
    return this.game.renderer.boardElements;
  }

  get gridContainer() {
    return this.game.gridContainer;
  }

  get animationController() {
    return this.game.animationController;
  }

  get scoreManager() {
    return this.game.scoreManager;
  }

  attachGridListener() {
    this.gridContainer.addEventListener('pointerdown', (event) => {
      if (this.tappedTileState) {
        event.preventDefault();
        event.stopPropagation();

        document.body.removeEventListener('pointermove', this._onTapDragMove);
        this.scoreManager.completionPreviewDisplay.style.display = 'none';

        const {
          tile,
          startIndex,
          targets,
          activeTargetIndex,
          activeTargetDistance,
          startRect,
        } = this.tappedTileState;

        const isValidDrop =
          activeTargetIndex !== -1 &&
          activeTargetDistance < startRect.width / 1.5;

        if (isValidDrop) {
          this.animationController.commitMove(startIndex, activeTargetIndex);
        } else {
          tile.style.transition = 'transform 0.2s ease-out';
          tile.style.transform = '';
          tile.addEventListener(
            'transitionend',
            () => {
              this.cleanupDragVisuals(tile);
            },
            { once: true }
          );
        }

        this.cleanupDragVisuals(null, targets);
        this.tappedTileState = null;
        return;
      }

      const tile = event.target.closest('.game-tile.letter');
      if (tile) {
        const index = this.boardElements.indexOf(tile);
        if (index !== -1) {
          this.initDrag(event, index);
        }
      }
    });

    document.addEventListener('pointerdown', (event) => {
      if (this.tappedTileState && !this.gridContainer.contains(event.target)) {
        const { tile, targets } = this.tappedTileState;
        document.body.removeEventListener('pointermove', this._onTapDragMove);
        this.scoreManager.completionPreviewDisplay.style.display = 'none';

        tile.style.transition = 'transform 0.2s ease-out';
        tile.style.transform = '';
        tile.addEventListener(
          'transitionend',
          () => {
            this.cleanupDragVisuals(tile);
          },
          { once: true }
        );

        this.cleanupDragVisuals(null, targets);
        this.tappedTileState = null;
      }
    });
  }

  initDrag(event, index) {
    if (this.animationController.isAnimating || this.dragState) return;
    if (event.button !== 0) return;
    event.preventDefault();

    const tile = this.boardElements[index];

    const reachableEmptySquares = this.board.findAllReachableEmpty(index);
    if (reachableEmptySquares.length === 0) {
      this.animationController.showJiggleAnimation(tile);
      return;
    }

    this.dragState = {
      lastPreviewIndex: -1,
      tile,
      isConfirmed: false,
      threshold: 10,
      pointerId: event.pointerId,
      startIndex: index,
      startRect: tile.getBoundingClientRect(),
      startX: event.clientX,
      startY: event.clientY,
      targets: [],
      paths: null,
    };

    try {
      tile.setPointerCapture(event.pointerId);
    } catch (e) {
      this.dragState = null;
      return;
    }

    this._onDragMove = (ev) => this.dragMove(ev);
    this._onLostPointerCapture = (ev) => this.handleLostPointerCapture(ev);
    tile.addEventListener('pointermove', this._onDragMove);
    tile.addEventListener('lostpointercapture', this._onLostPointerCapture, {
      once: true,
    });
  }

  dragMove(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

    if (!this.dragState.isConfirmed) {
      const dx = event.clientX - this.dragState.startX;
      const dy = event.clientY - this.dragState.startY;
      if (Math.hypot(dx, dy) > this.dragState.threshold) {
        this.dragState.isConfirmed = true;
        const { tile, startIndex } = this.dragState;
        const paths = this.board.findReachablePaths(startIndex);
        if (paths.size === 0) {
          tile.releasePointerCapture(event.pointerId);
          return;
        }
        this.dragState.paths = paths;
        this.dragState.targets = this.setupDragVisuals(tile, paths);
      } else {
        return;
      }
    }

    if (!this.dragState.paths) return;

    const { tile, startRect, paths, targets } = this.dragState;

    const { closestTargetIndex, minDistance } = this.findClosestTarget(
      event.clientX,
      event.clientY,
      targets,
      startRect
    );

    this.dragState.activeTargetIndex = closestTargetIndex;

    const { finalDx, finalDy } = this.calculateConstrainedPosition(
      event.clientX,
      event.clientY,
      startRect,
      paths,
      closestTargetIndex
    );

    this.dragState.currentTranslateX = finalDx;
    this.dragState.currentTranslateY = finalDy;
    tile.style.transform = `translate(${finalDx}px, ${finalDy}px) scale(1.05)`;
    tile.style.transition = 'none';

    this.updateTargetHighlighting(
      targets,
      closestTargetIndex,
      minDistance,
      startRect
    );

    if (
      this.scoreManager.showScorePreview &&
      this.dragState.lastPreviewIndex !== closestTargetIndex
    ) {
      this.dragState.lastPreviewIndex = closestTargetIndex;
      this.scoreManager.updateScorePreview(
        this.board,
        this.dragState.startIndex,
        closestTargetIndex
      );
    }
  }

  handleLostPointerCapture(event) {
    this.scoreManager.completionPreviewDisplay.style.display = 'none';
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

    if (!this.dragState.isConfirmed) {
      this.dragState.tile.removeEventListener('pointermove', this._onDragMove);

      const { tile, startIndex } = this.dragState;

      const paths = this.board.findReachablePaths(startIndex);
      if (paths.size === 0) {
        this.animationController.showJiggleAnimation(tile);
        this.dragState = null;
        return;
      }

      this.tappedTileState = {
        tile,
        startIndex,
        startRect: tile.getBoundingClientRect(),
        paths: paths,
        targets: this.setupDragVisuals(tile, paths),
        lastPreviewIndex: -1,
        activeTargetIndex: -1,
        activeTargetDistance: Infinity,
      };

      document.body.addEventListener('pointermove', this._onTapDragMove);
      this.handleTapDragMove(event);

      this.dragState = null;
      return;
    }

    const { tile, startIndex, targets, startRect, activeTargetIndex } =
      this.dragState;
    tile.removeEventListener('pointermove', this._onDragMove);

    let isMoving = false,
      finalIndex = startIndex;
    if (activeTargetIndex !== -1) {
      const targetRect =
        this.boardElements[activeTargetIndex].getBoundingClientRect();
      const tileRect = tile.getBoundingClientRect();
      if (
        Math.hypot(
          tileRect.left - targetRect.left,
          tileRect.top - targetRect.top
        ) <
        startRect.width / 1.5
      ) {
        isMoving = true;
        finalIndex = activeTargetIndex;
      }
    }

    this.cleanupDragVisuals(tile, targets);
    this.animationController.isAnimating = true;

    const toRect = this.boardElements[finalIndex].getBoundingClientRect();
    const finalTranslateX = toRect.left - startRect.left;
    const finalTranslateY = toRect.top - startRect.top;
    const distanceToFinal = Math.hypot(
      finalTranslateX - (this.dragState.currentTranslateX || 0),
      finalTranslateY - (this.dragState.currentTranslateY || 0)
    );

    let cleanupHasRun = false;
    const completeDragAction = () => {
      if (cleanupHasRun) return;
      cleanupHasRun = true;
      if (isMoving) this.animationController.commitMove(startIndex, finalIndex);
      else this.cleanupDragVisuals(tile);
      this.dragState = null;
      this.animationController.isAnimating = false;
    };

    if (distanceToFinal < 1) {
      completeDragAction();
      return;
    }

    const duration = Math.max(0.1, Math.min(0.25, distanceToFinal / 500));
    const durationMs = duration * 1000;
    const safetyTimeout = setTimeout(() => {
      console.warn('TransitionEnd safety net triggered.');
      completeDragAction();
    }, durationMs + 50);

    tile.addEventListener(
      'transitionend',
      () => {
        clearTimeout(safetyTimeout);
        completeDragAction();
      },
      { once: true }
    );

    tile.style.transition = `transform ${duration.toFixed(2)}s ease-out`;
    tile.style.transform = `translate(${finalTranslateX}px, ${finalTranslateY}px) scale(1.05)`;
  }

  handleTapDragMove(event) {
    if (!this.tappedTileState) return;

    const { tile, startIndex, startRect, paths, targets } =
      this.tappedTileState;

    const { closestTargetIndex, minDistance } = this.findClosestTarget(
      event.clientX,
      event.clientY,
      targets,
      startRect
    );

    this.updateTargetHighlighting(
      targets,
      closestTargetIndex,
      minDistance,
      startRect
    );

    const { finalDx, finalDy } = this.calculateConstrainedPosition(
      event.clientX,
      event.clientY,
      startRect,
      paths,
      closestTargetIndex
    );

    tile.style.transform = `translate(${finalDx}px, ${finalDy}px) scale(1.05)`;
    tile.style.transition = 'none';

    this.tappedTileState.activeTargetIndex = closestTargetIndex;
    this.tappedTileState.activeTargetDistance = minDistance;

    if (
      this.scoreManager.showScorePreview &&
      this.tappedTileState.lastPreviewIndex !== closestTargetIndex
    ) {
      this.tappedTileState.lastPreviewIndex = closestTargetIndex;
      this.scoreManager.updateScorePreview(
        this.board,
        startIndex,
        closestTargetIndex
      );
    }
  }

  findClosestTarget(mouseX, mouseY, targets, startRect) {
    let closestTargetIndex = -1;
    let minDistance = Infinity;

    for (const target of targets) {
      const targetRect = target.element.getBoundingClientRect();
      const centerX = targetRect.left + targetRect.width / 2;
      const centerY = targetRect.top + targetRect.height / 2;
      const dist = Math.hypot(mouseX - centerX, mouseY - centerY);
      if (dist < minDistance) {
        minDistance = dist;
        closestTargetIndex = target.index;
      }
    }

    return { closestTargetIndex, minDistance };
  }

  calculateConstrainedPosition(
    mouseX,
    mouseY,
    startRect,
    paths,
    closestTargetIndex
  ) {
    const pathToTarget = paths.get(closestTargetIndex) || [];
    const waypoints = [
      startRect,
      ...pathToTarget.map((i) => this.boardElements[i].getBoundingClientRect()),
    ];

    const mouseDx = mouseX - startRect.left - startRect.width / 2;
    const mouseDy = mouseY - startRect.top - startRect.height / 2;

    const endPoint = waypoints[waypoints.length - 1];
    const totalPathVectorDx = endPoint.left - startRect.left;
    const totalPathVectorDy = endPoint.top - startRect.top;
    const totalPathVectorLength = Math.hypot(
      totalPathVectorDx,
      totalPathVectorDy
    );

    let projection =
      totalPathVectorLength > 0
        ? (mouseDx * totalPathVectorDx + mouseDy * totalPathVectorDy) /
          (totalPathVectorLength * totalPathVectorLength)
        : 0;
    projection = Math.max(0, Math.min(1, projection));

    let totalSegmentedPathLength = 0;
    const segmentLengths = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segLen = Math.hypot(
        waypoints[i + 1].left - waypoints[i].left,
        waypoints[i + 1].top - waypoints[i].top
      );
      segmentLengths.push(segLen);
      totalSegmentedPathLength += segLen;
    }

    const travelDistance = projection * totalSegmentedPathLength;
    let finalDx = 0,
      finalDy = 0,
      distanceCovered = 0;

    if (totalSegmentedPathLength > 0) {
      for (let i = 0; i < waypoints.length - 1; i++) {
        if (travelDistance <= distanceCovered + segmentLengths[i] + 0.01) {
          const p =
            segmentLengths[i] > 0
              ? (travelDistance - distanceCovered) / segmentLengths[i]
              : 0;
          finalDx =
            waypoints[i].left -
            startRect.left +
            (waypoints[i + 1].left - waypoints[i].left) * p;
          finalDy =
            waypoints[i].top -
            startRect.top +
            (waypoints[i + 1].top - waypoints[i].top) * p;
          break;
        }
        distanceCovered += segmentLengths[i];
      }
    }

    if (projection >= 1) {
      finalDx = totalPathVectorDx;
      finalDy = totalPathVectorDy;
    }

    return { finalDx, finalDy };
  }

  updateTargetHighlighting(
    targets,
    closestTargetIndex,
    minDistance,
    startRect
  ) {
    targets.forEach((t) => {
      const isActive =
        t.index === closestTargetIndex && minDistance < startRect.width / 1.5;
      t.element.classList.toggle('drop-target-active', isActive);
    });
  }

  setupDragVisuals(tile, paths) {
    document.querySelector('.game-container').classList.add('is-dragging');
    tile.classList.add('dragging');
    tile.style.zIndex = 1000;

    const targets = [];
    for (const targetIndex of paths.keys()) {
      const targetElement = this.boardElements[targetIndex];
      targetElement.classList.add('drop-target');
      targets.push({
        index: targetIndex,
        element: targetElement,
      });
    }
    return targets;
  }

  cleanupDragVisuals(tile, targets) {
    document.querySelector('.game-container').classList.remove('is-dragging');
    if (targets) {
      targets.forEach((t) =>
        t.element.classList.remove('drop-target', 'drop-target-active')
      );
    }
    if (tile) {
      tile.classList.remove('dragging');
      tile.style.transform = '';
      tile.style.transition = '';
      tile.style.zIndex = '';
    }
  }

  forceResetDragState() {
    console.warn('Forcibly resetting drag state.');
    let didRelease = false;
    if (this.dragState && this.dragState.tile && this.dragState.pointerId) {
      try {
        if (this.dragState.tile.hasPointerCapture(this.dragState.pointerId)) {
          this.dragState.tile.releasePointerCapture(this.dragState.pointerId);
          console.log(
            'Released stray pointer capture for pointerId:',
            this.dragState.pointerId
          );
          didRelease = true;
        }
      } catch (e) {
        console.log(
          'Pointer release failed, likely already released:',
          e.message
        );
      }
    }

    this.dragState = null;
    this.animationController.isAnimating = false;

    document.querySelector('.game-container').classList.remove('is-dragging');
    this.boardElements.forEach((el) => {
      el.classList.remove('dragging', 'drop-target', 'drop-target-active');
      if (el.style.transform) {
        el.style.transform = '';
      }
      if (el.style.transition) {
        el.style.transition = '';
      }
    });

    console.log('Drag state has been reset.');

    const message = didRelease
      ? 'Successfully released pointer and reset state.'
      : 'Reset state. No active pointer capture was found.';
    return `--- RESET COMPLETE ---\n${message}\n\nClick "Run Diagnostics" to see the new state.`;
  }

}

