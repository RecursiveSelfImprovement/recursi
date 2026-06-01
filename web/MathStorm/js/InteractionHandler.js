
class InteractionHandler {
  constructor(gameEngine, debug) {
    this.gameEngine = gameEngine;
    this.container = gameEngine.container;
    this.debug = debug;

    this.draggedItem = null;
    this.offsetX = this.offsetY = 0;

    // Simplified settings
    this.SNAP_DISTANCE = 120;
    this.DRAG_OUT_DISTANCE = 100;
    this.MIN_VELOCITY = 0.02; // Minimum drift velocity

    this.savedVelocity = { vx: 0, vy: 0 };
    this.originalParentGroup = null;
    this.currentHoverTarget = null;

    this.handleDragMove = this.handleDragMove.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    // Throttling is no longer needed with cached dimensions.
  }

  makePieceDraggable(gamePiece) {
    const handleStart = (e) => {
      e.stopPropagation();
      this.handlePieceDragStart(e, gamePiece);
    };
    gamePiece.element.addEventListener('mousedown', handleStart);
    gamePiece.element.addEventListener('touchstart', handleStart);
  }

  makeGroupDraggable(pieceGroup) {
    const handleStart = (e) => this.handleGroupDragStart(e, pieceGroup);
    pieceGroup.element.addEventListener('mousedown', handleStart);
    pieceGroup.element.addEventListener('touchstart', handleStart);
  }

  handlePieceDragStart(e, gamePiece) {
    if (gamePiece.parentGroup && gamePiece.parentGroup.isSolved) {
      this.debug.log(`Cannot drag piece from solved group`);
      return;
    }
    // Prevent default actions like text selection or page scrolling
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    this.debug.log(`Drag Start: ${this.debug.formatItem(gamePiece)}`);

    this.draggedItem = gamePiece;
    this.currentHoverTarget = null;
    this.originalParentGroup = null;

    const startEvent = e.touches ? e.touches[0] : e;

    const preRect = gamePiece.element.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const boardX = preRect.left - containerRect.left;
    const boardY = preRect.top - containerRect.top;

    if (gamePiece.parentGroup) {
      this.originalParentGroup = gamePiece.parentGroup;
      gamePiece.x = boardX;
      gamePiece.y = boardY;
      this.originalParentGroup.removePiece(gamePiece);
      const lf = gamePiece.lastFreeVelocity || { vx: 0.02, vy: 0.02 };
      this.savedVelocity = { vx: lf.vx, vy: lf.vy };
      if (this.originalParentGroup.children.length === 1) {
        this.debug.log('Auto-dissolving group left with a single item');
        this.gameEngine.dissolveGroup(this.originalParentGroup);
        this.originalParentGroup = null;
      }
    } else {
      gamePiece.x = boardX;
      gamePiece.y = boardY;
      this.savedVelocity = { vx: gamePiece.vx, vy: gamePiece.vy };
    }

    if (!this.gameEngine.pieces.includes(gamePiece)) {
      this.gameEngine.pieces.push(gamePiece);
    }
    this.ensureMinimumVelocity(this.savedVelocity);

    gamePiece.vx = 0;
    gamePiece.vy = 0;
    gamePiece.scale = 1.15;
    gamePiece.element.classList.add('dragging');

    this.offsetX = startEvent.clientX - preRect.left;
    this.offsetY = startEvent.clientY - preRect.top;
    gamePiece.draw();

    window.addEventListener('mousemove', this.handleDragMove);
    window.addEventListener('touchmove', this.handleDragMove, {
      passive: false,
    });
    window.addEventListener('mouseup', this.handleDragEnd, { once: true });
    window.addEventListener('touchend', this.handleDragEnd, { once: true });
  }

  handleGroupDragStart(e, pieceGroup) {
    if (pieceGroup.isSolved) {
      this.debug.log(`Cannot drag solved group`);
      return;
    }
    if (e.cancelable) e.preventDefault();
    this.debug.log(`Drag Start: ${this.debug.formatItem(pieceGroup)}`);

    this.draggedItem = pieceGroup;
    this.currentHoverTarget = null;

    const startEvent = e.touches ? e.touches[0] : e;

    this.savedVelocity = { vx: pieceGroup.vx, vy: pieceGroup.vy };
    this.ensureMinimumVelocity(pieceGroup);
    pieceGroup.vx = 0;
    pieceGroup.vy = 0;
    pieceGroup.element.classList.add('dragging');

    const rect = pieceGroup.element.getBoundingClientRect();
    this.offsetX = startEvent.clientX - rect.left;
    this.offsetY = startEvent.clientY - rect.top;

    window.addEventListener('mousemove', this.handleDragMove);
    window.addEventListener('touchmove', this.handleDragMove, {
      passive: false,
    });
    window.addEventListener('mouseup', this.handleDragEnd, { once: true });
    window.addEventListener('touchend', this.handleDragEnd, { once: true });
  }

  handleDragMove(e) {
      if (!this.draggedItem) return;
      if (e.cancelable) e.preventDefault();

      const moveEvent = e.touches ? e.touches[0] : e;
      
      // FIX: Account for the container's screen position
      const containerRect = this.container.getBoundingClientRect();

      this.draggedItem.x = moveEvent.clientX - containerRect.left - this.offsetX;
      this.draggedItem.y = moveEvent.clientY - containerRect.top - this.offsetY;
      
      if (this.draggedItem.draw) {
        this.draggedItem.draw();
      }

      const dRect = {
        left: this.draggedItem.x,
        top: this.draggedItem.y,
        right: this.draggedItem.x + this.draggedItem.width,
        bottom: this.draggedItem.y + this.draggedItem.height,
        width: this.draggedItem.width,
        height: this.draggedItem.height,
      };
      const snapInfo = this.findBestSnapTarget(dRect);

      this.clearAllHighlights();
      if (snapInfo) {
        this.showSnapPreview(snapInfo);
      }

      this.currentHoverTarget = snapInfo;
      this.updateDebugStatus(snapInfo);
    }

  handleDragEnd(e) {
    if (!this.draggedItem) return;

    this.debug.log(`Drag End: ${this.debug.formatItem(this.draggedItem)}`);
    this.clearAllHighlights();

    // For touchend, coordinates are in changedTouches
    const endEvent = e.changedTouches ? e.changedTouches[0] : e;

    const snapInfo = this.findSnapCandidateAtRelease();

    let snapped = false;
    if (snapInfo && snapInfo.isValid) {
      snapped = this.attemptSnap(snapInfo);
    }

    if (!snapped) {
      const velocity = { vx: this.savedVelocity.vx, vy: this.savedVelocity.vy };
      this.ensureMinimumVelocity(velocity);
      this.draggedItem.vx = velocity.vx;
      this.draggedItem.vy = velocity.vy;
      this.draggedItem.lastFreeVelocity = { vx: velocity.vx, vy: velocity.vy };

      if (
        this.originalParentGroup &&
        this.isDroppedOnGroup(endEvent, this.originalParentGroup)
      ) {
        const side = this.getDropSideOnGroup(
          endEvent,
          this.originalParentGroup
        );
        if (this.canAttachToGroup(this.originalParentGroup, side)) {
          this.debug.log(`Dropped on original group — reattaching on ${side}.`);
          if (this.originalParentGroup.addPiece(this.draggedItem, side)) {
            const index = this.gameEngine.pieces.indexOf(this.draggedItem);
            if (index > -1) this.gameEngine.pieces.splice(index, 1);
            snapped = true;
          }
        }
      }

      if (!snapped) {
        this.debug.log('Piece remains free.');
      }
    }

    this.cleanup();
  }

  findSnapCandidate() {
    if (!this.draggedItem) return null;

    const dRect = this.draggedItem.element.getBoundingClientRect();
    const dCenter = {
      x: dRect.left + dRect.width / 2,
      y: dRect.top + dRect.height / 2,
    };

    let best = null;
    let bestDist = Infinity;

    for (const t of this.gameEngine.pieces) {
      if (t === this.draggedItem) continue;
      // Do not snap to solved groups
      if (t.isSolved) continue;

      const tr = t.element.getBoundingClientRect();
      const tCenter = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
      const dist = Math.hypot(dCenter.x - tCenter.x, dCenter.y - tCenter.y);
      if (dist > this.SNAP_DISTANCE) continue;

      const canSnapLeft = this.validatePotentialSnap(t, 'left');
      const canSnapRight = this.validatePotentialSnap(t, 'right');

      if (!canSnapLeft && !canSnapRight) continue;

      const side = dCenter.x < tCenter.x ? 'left' : 'right';

      if (
        (side === 'left' && canSnapLeft) ||
        (side === 'right' && canSnapRight)
      ) {
        if (dist < bestDist) {
          bestDist = dist;
          best = { target: t, side };
        }
      } else if (canSnapLeft) {
        if (dist < bestDist) {
          bestDist = dist;
          best = { target: t, side: 'left' };
        }
      } else if (canSnapRight) {
        if (dist < bestDist) {
          bestDist = dist;
          best = { target: t, side: 'right' };
        }
      }
    }
    return best;
  }

  validatePotentialSnap(target, side) {
    // This is a redundant check as it's also in findSnapCandidate, but it's safe.
    if (target.isSolved) return false;

    const list = (it) =>
      it.constructor.name === 'PieceGroup' ? it.children : [it];

    const seq =
      side === 'left'
        ? [...list(this.draggedItem), ...list(target)]
        : [...list(target), ...list(this.draggedItem)];

    // Basic validation - no more than one equals, and equals can't be first
    const eqCount = seq.filter(
      (p) => p.type === 'operator' && p.value === '='
    ).length;
    if (eqCount > 1) return false;
    if (seq.length > 0 && seq[0].type === 'operator' && seq[0].value === '=')
      return false;

    // Special case: if we're trying to attach a number to a group that ends with '='
    // This should always be allowed (completing the equation)
    const draggedIsGroup = this.draggedItem.constructor.name === 'PieceGroup';
    const targetIsGroup = target.constructor.name === 'PieceGroup';

    if (!draggedIsGroup && targetIsGroup && side === 'right') {
      if (
        target.children.length > 0 &&
        target.children[target.children.length - 1].value === '=' &&
        this.draggedItem.type === 'number'
      ) {
        this.debug.log(
          `Allowing number ${this.draggedItem.value} to attach to group ending with '='`
        );
        return true; // Always allow completing an equation
      }
    }

    // For all other cases, use the standard validation
    const isValid = PieceGroup.validateSequence(seq);

    if (!isValid) {
      this.debug.log(
        `Sequence validation failed for: ${seq.map((p) => p.value).join(' ')}`
      );
    }

    return isValid;
  }

  showSnapPreview(snapInfo) {
    // Only VISUAL PREVIEW — do not reposition the dragged item during move.
    const { target, isValid } = snapInfo;
    if (isValid) {
      target.element.classList.add('snap-target');
    } else {
      target.element.classList.add('snap-target-invalid');
    }
  }

  findSnapCandidateAtRelease() {
    if (!this.draggedItem) return null;

    const dRect = this.draggedItem.element.getBoundingClientRect();
    const dCenter = {
      x: dRect.left + dRect.width / 2,
      y: dRect.top + dRect.height / 2,
    };

    let best = null;
    let bestScore = Infinity;

    for (const target of this.gameEngine.pieces) {
      if (target === this.draggedItem || target.isSolved) continue;

      const tRect = target.element.getBoundingClientRect();
      const isOverlapping = this.checkOverlap(dRect, tRect);

      const tCenter = {
        x: tRect.left + tRect.width / 2,
        y: tRect.top + tRect.height / 2,
      };
      const distCenter = Math.hypot(
        dCenter.x - tCenter.x,
        dCenter.y - tCenter.y
      );

      // If it's not overlapping and it's too far away, skip it.
      if (!isOverlapping && distCenter > this.SNAP_DISTANCE) continue;

      // Determine the best side based on proximity and validity, passing pre-calculated rects
      const side = this.closestValidSide(target, dRect, tRect);

      // Now, we must confirm this side is actually a valid connection for the final drop
      const isValid = this.validateConnection(target, side);

      if (!isValid) continue; // Don't consider invalid snaps at release time.

      // We have a valid potential snap. Score it.
      // Overlapping gets a huge bonus. Otherwise, closer center-to-center is better.
      const score = isOverlapping ? distCenter - 1000 : distCenter;

      if (score < bestScore) {
        best = { target, side, distance: distCenter, isValid: true };
        bestScore = score;
      }
    }

    return best;
  }

  findBestSnapTarget(dRect) {
    if (!this.draggedItem) return null;

    const dCenter = {
      x: dRect.left + dRect.width / 2,
      y: dRect.top + dRect.height / 2,
    };

    let best = null;
    let bestScore = Infinity; // Lower score is better

    for (const target of this.gameEngine.pieces) {
      if (target === this.draggedItem || target.isSolved) continue;

      // --- THE FIX: Use cached properties instead of getBoundingClientRect() ---
      const tRect = {
        left: target.x,
        top: target.y,
        right: target.x + target.width,
        bottom: target.y + target.height,
        width: target.width,
        height: target.height,
      };

      const isOverlapping = this.checkOverlap(dRect, tRect);
      const distCenter = Math.hypot(
        dCenter.x - (tRect.left + tRect.width / 2),
        dCenter.y - (tRect.top + tRect.height / 2)
      );

      if (!isOverlapping && distCenter > this.SNAP_DISTANCE) continue;

      const side = this.closestValidSide(target, dRect, tRect);
      const isValid = this.validateConnection(target, side);

      let score = distCenter;
      if (!isOverlapping) score += 1000;
      if (!isValid) score += 500;

      if (score < bestScore) {
        best = { target, side, distance: distCenter, isValid };
        bestScore = score;
      }
    }
    return best;
  }

  validateConnection(target, side) {
    const draggedList =
      this.draggedItem.constructor.name === 'PieceGroup'
        ? this.draggedItem.children
        : [this.draggedItem];

    const targetList =
      target.constructor.name === 'PieceGroup' ? target.children : [target];

    const sequence =
      side === 'left'
        ? [...draggedList, ...targetList]
        : [...targetList, ...draggedList];

    // Use appropriate validation based on sequence length
    if (sequence.length === 5) {
      return PieceGroup.validateSequence(sequence);
    } else {
      return PieceGroup.validateSequenceLoose(sequence);
    }
  }

  isCompletingEquation(target, side, sequence) {
    if (
      this.draggedItem.constructor.name !== 'GamePiece' ||
      target.constructor.name !== 'PieceGroup' ||
      side !== 'right'
    ) {
      return false;
    }

    // Check if target group ends with '=' and dragged item is a number
    const targetChildren = target.children;
    return (
      targetChildren.length === 4 &&
      targetChildren[3].value === '=' &&
      this.draggedItem.type === 'number'
    );
  }

  validateEquationCompletion(sequence) {
    if (sequence.length !== 5) return false;

    const [a, op, b, eq, result] = sequence;
    if (eq.value !== '=' || result.type !== 'number') return false;

    const numA = Number(a.value);
    const numB = Number(b.value);
    const numResult = Number(result.value);

    let expectedResult;
    switch (op.value) {
      case '×':
        expectedResult = numA * numB;
        break;
      case '+':
        expectedResult = numA + numB;
        break;
      case '−':
        expectedResult = numA - numB;
        break;
      case '÷':
        expectedResult = numA / numB;
        break;
      default:
        return false;
    }

    return expectedResult === numResult;
  }

  attemptSnap(snapInfo) {
    const { target, side } = snapInfo;

    this.debug.log(
      `Attempting snap: ${this.debug.formatItem(
        this.draggedItem
      )} to ${this.debug.formatItem(target)} on ${side}`
    );

    const newVx = (this.savedVelocity.vx + (target.vx || 0)) * 0.5;
    const newVy = (this.savedVelocity.vy + (target.vy || 0)) * 0.5;

    const draggedIsGroup = this.draggedItem.constructor.name === 'PieceGroup';
    const targetIsGroup = target.constructor.name === 'PieceGroup';

    try {
      if (!draggedIsGroup && !targetIsGroup) {
        this.gameEngine.formNewGroup(
          this.draggedItem,
          target,
          this.savedVelocity,
          side
        );
        return true;
      } else if (!draggedIsGroup && targetIsGroup) {
        // No pre-shift; rely on group layout to set width exactly
        if (target.addPiece(this.draggedItem, side)) {
          target.vx = newVx;
          target.vy = newVy;
          this.gameEngine.subsumePiece(this.draggedItem);
          return true;
        }
      } else if (draggedIsGroup && !targetIsGroup) {
        const attachSide = side === 'left' ? 'right' : 'left';
        if (this.draggedItem.addPiece(target, attachSide)) {
          this.draggedItem.vx = newVx;
          this.draggedItem.vy = newVy;
          this.gameEngine.subsumePiece(target);
          return true;
        }
      } else if (draggedIsGroup && targetIsGroup) {
        // Merge groups without positional nudge
        const leftGroup = side === 'left' ? this.draggedItem : target;
        const rightGroup = side === 'left' ? target : this.draggedItem;

        const leftChildren = leftGroup.children.slice();
        for (const child of leftChildren) {
          leftGroup.removePiece(child);
          if (!rightGroup.addPiece(child, side === 'left' ? 'left' : 'right')) {
            this.debug.log('Group merge failed - could not add all pieces');
            return false;
          }
        }

        rightGroup.vx = newVx;
        rightGroup.vy = newVy;
        this.gameEngine.removePiece(leftGroup);
        return true;
      }
    } catch (err) {
      this.debug.log(`Snap failed: ${err.message}`);
    }
    return false;
  }

  ensureMinimumVelocity(velocityObj) {
    const minVel = 0.02;

    if (Math.abs(velocityObj.vx) < minVel) {
      velocityObj.vx = (Math.random() - 0.5) * minVel * 4;
    }
    if (Math.abs(velocityObj.vy) < minVel) {
      velocityObj.vy = (Math.random() - 0.5) * minVel * 4;
    }
  }

  getDistanceFromOriginalGroup(event) {
    if (!this.originalParentGroup) return Infinity;

    const groupRect = this.originalParentGroup.element.getBoundingClientRect();
    const groupCenter = {
      x: groupRect.left + groupRect.width / 2,
      y: groupRect.top + groupRect.height / 2,
    };

    return Math.hypot(
      event.clientX - groupCenter.x,
      event.clientY - groupCenter.y
    );
  }

  clearAllHighlights() {
    document
      .querySelectorAll('.snap-target, .snap-target-invalid')
      .forEach((el) => {
        el.classList.remove('snap-target', 'snap-target-invalid');
      });
  }

  updateDebugStatus(snapInfo) {
    const status = {
      Dragging: this.debug.formatItem(this.draggedItem),
    };

    if (snapInfo) {
      status.HoverTarget = this.debug.formatItem(snapInfo.target);
      status.Side = snapInfo.side;
      status.Valid = snapInfo.isValid ? 'YES' : 'NO';
      status.Distance = Math.round(snapInfo.distance);
    }

    this.debug.updateStatus(status);
  }

  cleanup() {
    if (this.draggedItem) {
      this.draggedItem.element.classList.remove('dragging');
      if (this.draggedItem.scale) {
        this.draggedItem.scale = 1.0;
      }
      if (this.draggedItem.draw) {
        this.draggedItem.draw();
      }
    }

    this.draggedItem = null;
    this.currentHoverTarget = null;
    this.originalParentGroup = null;
    this.debug.updateStatus({ State: 'Idle' });

    window.removeEventListener('mousemove', this.handleDragMove);
    window.removeEventListener('touchmove', this.handleDragMove);
  }

  basicValidateSequence(seq) {
    // Basic validation as fallback if we can't access PieceGroup.validateSequence
    if (seq.length === 0) return true;

    const isNum = (p) => p.type === 'number';
    const isOp = (p) => p.type === 'operator' && p.value !== '=';
    const isEq = (p) => p.type === 'operator' && p.value === '=';

    // Allow these patterns:
    // [num] - single number
    // [num, op] - number followed by operator
    // [num, op, num] - two numbers with operator
    // [num, op, num, =] - equation without result
    // [num, op, num, =, num] - complete equation (must be mathematically correct)

    if (seq.length === 1) return isNum(seq[0]);
    if (seq.length === 2)
      return isNum(seq[0]) && (isOp(seq[1]) || isEq(seq[1]));
    if (seq.length === 3) return isNum(seq[0]) && isOp(seq[1]) && isNum(seq[2]);
    if (seq.length === 4)
      return isNum(seq[0]) && isOp(seq[1]) && isNum(seq[2]) && isEq(seq[3]);

    if (seq.length === 5) {
      if (
        !(
          isNum(seq[0]) &&
          isOp(seq[1]) &&
          isNum(seq[2]) &&
          isEq(seq[3]) &&
          isNum(seq[4])
        )
      ) {
        return false;
      }

      // Check if the math is correct
      const a = Number(seq[0].value);
      const b = Number(seq[2].value);
      const c = Number(seq[4].value);
      const op = seq[1].value;

      let expected;
      switch (op) {
        case '×':
          expected = a * b;
          break;
        case '+':
          expected = a + b;
          break;
        case '−':
        case '-':
          expected = a - b;
          break;
        case '÷':
        case '/':
          expected = a / b;
          break;
        default:
          return false;
      }

      return expected === c;
    }

    return false; // sequences longer than 5 are invalid
  }

  pointInRect(x, y, rect, pad = 0) {
    return (
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad
    );
  }

  closestValidSide(target, dRect, tRect) {
    // Decide which side (left/right) is both valid and closest to the dragged center.
    // NOTE: dRect and tRect are passed in to prevent repeated getBoundingClientRect calls.
    const dragCenterX = dRect.left + dRect.width / 2;

    const distLeft = Math.abs(dragCenterX - tRect.left);
    const distRight = Math.abs(dragCenterX - tRect.right);

    const leftValid = this.validateConnection(target, 'left');
    const rightValid = this.validateConnection(target, 'right');

    if (leftValid && rightValid) {
      return distLeft <= distRight ? 'left' : 'right';
    } else if (leftValid) {
      return 'left';
    } else if (rightValid) {
      return 'right';
    }
    // neither valid; return whichever is closer (caller may mark invalid preview)
    return distLeft <= distRight ? 'left' : 'right';
  }

  isDroppedOnGroup(event, group) {
    const rect = group.element.getBoundingClientRect();
    const padding = 20; // Allow some margin around the group
    return (
      event.clientX >= rect.left - padding &&
      event.clientX <= rect.right + padding &&
      event.clientY >= rect.top - padding &&
      event.clientY <= rect.bottom + padding
    );
  }

  getDropSideOnGroup(event, group) {
    const rect = group.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    return event.clientX < centerX ? 'left' : 'right';
  }

  canAttachToGroup(group, side) {
    return this.validateConnection(group, side);
  }

  checkOverlap(rect1, rect2) {
    return (
      rect1.left < rect2.right &&
      rect1.right > rect2.left &&
      rect1.top < rect2.bottom &&
      rect1.bottom > rect2.top
    );
  }
}

