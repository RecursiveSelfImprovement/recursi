
class GameEngine {
  constructor(container, equationFactory, interactionHandler, debug) {
    this.container = container;
    this.equationFactory = equationFactory;
    this.interactionHandler = interactionHandler;
    this.debug = debug;

    this.pieces = [];
    this.gameLoopId = null;
    this.neededPieces = [];

    this.lastEquationSpawn = 0;
    // Spawning a little faster
    this.baseEquationSpawnInterval = 7000;
    this.equationSpawnInterval = this.baseEquationSpawnInterval;

    this.lastNeededPieceScan = 0;
    this.baseNeededPieceScanInterval = 10000;
    this.neededPieceScanInterval = this.baseNeededPieceScanInterval;

    this.lastNeededPieceSpawn = 0;
    this.baseNeededPieceSpawnInterval = 4000;
    this.neededPieceSpawnInterval = this.baseNeededPieceSpawnInterval;

    this.speedMultiplier = 1;

    // Initialize solved group manager
    this.solvedGroupManager = new SolvedGroupManager(this, debug);
  }

  start() {
    const now = performance.now();
    this.lastEquationSpawn = now;
    this.lastNeededPieceScan = now;
    this.lastNeededPieceSpawn = now;

    // Initialize game area width
    this.updateGameArea();

    this.spawnEquation();
    const extra = this.equationFactory.createProblem();
    const bounds = this.getGameBounds();
    extra
      .slice(0, 2)
      .forEach((pd) => this.spawnSinglePiece(pd, bounds.width, bounds.height));

    this.loop();
  }

  stop() {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
  }

  loop(currentTime) {
    if (!currentTime) currentTime = performance.now();

    if (currentTime - this.lastEquationSpawn > this.equationSpawnInterval) {
      this.spawnEquation();
      this.lastEquationSpawn = currentTime;
    }
    if (currentTime - this.lastNeededPieceScan > this.neededPieceScanInterval) {
      this.scanForNeededPieces();
      this.lastNeededPieceScan = currentTime;
    }
    if (
      currentTime - this.lastNeededPieceSpawn >
      this.neededPieceSpawnInterval
    ) {
      if (this.neededPieces.length > 0) this.spawnNeededPiece();
      this.lastNeededPieceSpawn = currentTime;
    }

    const bounds = this.getGameBounds();
    const itemsToRemove = [];

    // Update positions (including solved groups moving to stack)
    for (const item of this.pieces) {
      if (item.update) item.update(this.speedMultiplier);
      if (this.isOffScreen(item, bounds)) itemsToRemove.push(item);
    }

    // Update solved groups movement
    this.solvedGroupManager.update();

    // Handle collisions (excluding solved groups as movable objects)
    this.handleCollisions();

    // Draw everything
    for (const item of this.pieces) {
      if (item.draw) item.draw();
    }

    // Remove off-screen items
    for (const item of itemsToRemove) this.removePiece(item);

    this.gameLoopId = requestAnimationFrame((time) => this.loop(time));
  }

  spawnEquation() {
    const problemParts = this.equationFactory.createProblem();
    this.debug.log(
      `Queueing problem: ${problemParts.map((p) => p.value).join(' ')}`
    );

    const piecesToSpawn = problemParts
      .sort(() => 0.5 - Math.random())
      .slice(0, 3 + Math.floor(Math.random() * 3));

    const bounds = this.getGameBounds();

    piecesToSpawn.forEach((pieceData) => {
      const spawnDelay = Math.random() * 1500;
      setTimeout(
        () => this.spawnSinglePiece(pieceData, bounds.width, bounds.height),
        spawnDelay
      );
    });
  }

  scanForNeededPieces() {
    this.debug.log('Scanning for needed pieces...');
    for (const item of this.pieces) {
      if (
        item.constructor.name === 'PieceGroup' &&
        !item.isSolved &&
        item.children.length === 4
      ) {
        const seq = item.children;
        // Check for a valid [num, op, num, =] sequence
        if (PieceGroup.validateSequence(seq)) {
          const a = Number(seq[0].value);
          const b = Number(seq[2].value);
          const op = seq[1].value;
          let result;
          let isValidResult = true; // Flag to check conditions

          switch (op) {
            case '×':
              result = a * b;
              break;
            case '+':
              result = a + b;
              break;
            case '−':
              result = a - b;
              // FIX: Ensure result is not negative
              if (result < 0) isValidResult = false;
              break;
            case '÷':
              result = a / b;
              // FIX: Ensure result is an integer
              if (!Number.isInteger(result)) isValidResult = false;
              break;
            default:
              continue;
          }

          if (isValidResult && !this.neededPieces.includes(result)) {
            this.debug.log(
              `Found needed piece: ${result}. Adding to spawn queue.`
            );
            this.neededPieces.push(result);
          }
        }
      }
    }
  }

  spawnNeededPiece() {
    if (this.neededPieces.length === 0) return;

    const pieceValue = this.neededPieces.shift();
    this.debug.log(`Spawning needed piece from queue: ${pieceValue}`);

    const pieceData = { value: pieceValue, type: 'number' };
    const bounds = this.getGameBounds();
    this.spawnSinglePiece(pieceData, bounds.width, bounds.height);
  }

  spawnSinglePiece(pieceData, viewWidth, viewHeight) {
    const startSide = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    // Pieces will move slower by default
    const baseSpeed = viewWidth / 3000 + Math.random() * 0.05;

    switch (startSide) {
      case 0:
        x = Math.random() * viewWidth;
        y = -80;
        vx = (Math.random() - 0.5) * 0.2;
        vy = baseSpeed;
        break;
      case 1:
        x = viewWidth + 80;
        y = Math.random() * viewHeight;
        vx = -baseSpeed;
        vy = (Math.random() - 0.5) * 0.2;
        break;
      case 2:
        x = Math.random() * viewWidth;
        y = viewHeight + 80;
        vx = (Math.random() - 0.5) * 0.2;
        vy = -baseSpeed;
        break;
      case 3:
        x = -80;
        y = Math.random() * viewHeight;
        vx = baseSpeed;
        vy = (Math.random() - 0.5) * 0.2;
        break;
    }

    const piece = new GamePiece({ ...pieceData, x, y, vx, vy });
    this.pieces.push(piece);
    this.container.appendChild(piece.element);

    // ** CRITICAL FIX **
    // Measure the piece's dimensions once and cache them forever.
    piece.cacheDimensions();

    this.interactionHandler.makePieceDraggable(piece);
  }

  removePiece(item) {
    this.debug.log(`Removing item: ${this.debug.formatItem(item)}`);
    item.remove();
    const index = this.pieces.indexOf(item);
    if (index > -1) {
      this.pieces.splice(index, 1);
    }
  }

  subsumePiece(piece) {
    this.debug.log(
      `Subsuming piece into group: ${this.debug.formatItem(piece)}`
    );
    const index = this.pieces.indexOf(piece);
    if (index > -1) {
      this.pieces.splice(index, 1);
    }
  }

  isOffScreen(piece, bounds) {
    if (this.interactionHandler.draggedItem === piece) return false;
    if (piece.isSolved) return false; // Solved groups don't get removed

    const buffer = 100;
    return (
      piece.x < -buffer ||
      piece.x > bounds.width + buffer ||
      piece.y < -buffer ||
      piece.y > bounds.height + buffer
    );
  }

  formNewGroup(draggedPiece, targetPiece, initialVelocity, side) {
    const groupVelocity = {
      vx: (initialVelocity.vx + targetPiece.vx) * 0.5,
      vy: (initialVelocity.vy + targetPiece.vy) * 0.5,
    };

    const groupPosition = { x: targetPiece.x, y: targetPiece.y };
    const newGroup = new PieceGroup(groupPosition, groupVelocity);

    // Pass reference to game engine
    newGroup.gameEngine = this;

    this.debug.log(
      `Forming new group from ${this.debug.formatItem(
        draggedPiece
      )} and ${this.debug.formatItem(targetPiece)}`
    );

    this.pieces.push(newGroup);
    this.container.appendChild(newGroup.element);
    this.interactionHandler.makeGroupDraggable(newGroup);

    newGroup.addPiece(targetPiece, 'right');
    newGroup.addPiece(draggedPiece, side);

    this.subsumePiece(draggedPiece);
    this.subsumePiece(targetPiece);
  }

  dissolveGroup(group) {
    this.debug.log(`Dissolving group: ${this.debug.formatItem(group)}`);

    // Get group's current position for reference
    const groupRect = group.element.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    // Make a copy since removePiece mutates group.children
    const children = group.children.slice();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      // Calculate a reasonable position based on group position and child index
      const childRect = child.element.getBoundingClientRect();
      const relativeX = childRect.left - containerRect.left;
      const relativeY = childRect.top - containerRect.top;

      // Detach from the group container
      group.removePiece(child);

      // Set position to current screen position
      child.x = relativeX;
      child.y = relativeY;

      // Give it the group's velocity plus a small random component
      child.vx = (group.vx || 0) + (Math.random() - 0.5) * 0.1;
      child.vy = (group.vy || 0) + (Math.random() - 0.5) * 0.1;

      // Store as last free velocity
      child.lastFreeVelocity = { vx: child.vx, vy: child.vy };

      // Re-register as a free piece
      this.pieces.push(child);
      this.container.appendChild(child.element);

      // Make sure it's draggable
      this.interactionHandler.makePieceDraggable(child);
    }

    // Finally, remove the empty group
    group.remove();
    const idx = this.pieces.indexOf(group);
    if (idx !== -1) {
      this.pieces.splice(idx, 1);
    }
  }

  setSpeed(mult) {
    // 0..3 allowed; 0 freezes all movement (updates multiply by 0)
    const newMult = Math.max(0, mult);
    this.speedMultiplier = newMult;

    if (newMult > 0.01) {
      // Use a small threshold to avoid division by zero
      this.equationSpawnInterval = this.baseEquationSpawnInterval / newMult;
      this.neededPieceScanInterval = this.baseNeededPieceScanInterval / newMult;
      this.neededPieceSpawnInterval =
        this.baseNeededPieceSpawnInterval / newMult;
    } else {
      // At zero or near-zero speed, effectively stop spawning
      this.equationSpawnInterval = Infinity;
      this.neededPieceScanInterval = Infinity;
      this.neededPieceSpawnInterval = Infinity;
    }

    if (this.debug) this.debug.log(`Speed set to ${newMult.toFixed(2)}x`);
  }

  clearBoard() {
    const toRemove = this.pieces.slice();
    for (const item of toRemove) this.removePiece(item);
    this.pieces.length = 0;
    this.neededPieces.length = 0;

    // Also reset the solved group manager's state
    if (this.solvedGroupManager) {
      this.solvedGroupManager.reset();
    }

    if (this.debug) this.debug.log('Board cleared.');
  }

  applyBouncePhysics(item1, item2, nx, ny) {
    // Get current velocities
    const v1x = item1.vx || 0;
    const v1y = item1.vy || 0;
    const v2x = item2.vx || 0;
    const v2y = item2.vy || 0;

    // Project velocities onto the collision normal.
    // The normal (nx, ny) is defined as pointing from item1 to item2.
    const v1n = v1x * nx + v1y * ny;
    const v2n = v2x * nx + v2y * ny;

    // Calculate the velocity of approach along the normal.
    // If this value is positive, item1 is moving towards item2 faster than item2 is moving away from item1.
    // In other words, they are colliding.
    const approachSpeed = v1n - v2n;

    // If they are not approaching each other (i.e., they are separating or moving parallel),
    // there is no need to apply a bounce. This is the corrected logic.
    if (approachSpeed <= 0) {
      return;
    }

    // Calculate tangential velocities (perpendicular to collision)
    const v1tx = v1x - v1n * nx;
    const v1ty = v1y - v1n * ny;
    const v2tx = v2x - v2n * nx;
    const v2ty = v2y - v2n * ny;

    // For an elastic collision with equal masses, the normal velocities simply swap.
    // We add a restitution coefficient for bounciness (value < 1 loses some energy).
    const restitution = 0.85;
    const newV1n = v2n * restitution;
    const newV2n = v1n * restitution;

    // Combine the new normal velocities with the (slightly dampened) tangential velocities
    // to get the final velocity vectors.
    item1.vx = newV1n * nx + v1tx * 0.95; // using 0.95 for less tangential damping
    item1.vy = newV1n * ny + v1ty * 0.95;
    item2.vx = newV2n * nx + v2tx * 0.95;
    item2.vy = newV2n * ny + v2ty * 0.95;

    // Add some minimum speed to prevent pieces from getting stuck
    const minSpeed = 0.05;
    const speed1 = Math.sqrt(item1.vx * item1.vx + item1.vy * item1.vy);
    const speed2 = Math.sqrt(item2.vx * item2.vx + item2.vy * item2.vy);

    // If an item is moving but too slowly, boost its speed to the minimum
    // while preserving its direction. This is more robust than the old method.
    if (speed1 > 0 && speed1 < minSpeed) {
      const scale = minSpeed / speed1;
      item1.vx *= scale;
      item1.vy *= scale;
    }

    if (speed2 > 0 && speed2 < minSpeed) {
      const scale = minSpeed / speed2;
      item2.vx *= scale;
      item2.vy *= scale;
    }

    // Update last free velocity for pieces so they remember their bounce
    if (item1.lastFreeVelocity !== undefined) {
      item1.lastFreeVelocity = { vx: item1.vx, vy: item1.vy };
    }
    if (item2.lastFreeVelocity !== undefined) {
      item2.lastFreeVelocity = { vx: item2.vx, vy: item2.vy };
    }

    // Add visual feedback for the collision
    this.addCollisionFlash(item1);
    this.addCollisionFlash(item2);

    this.debug.log(
      `Bounce: ${this.debug.formatItem(item1)} ↔ ${this.debug.formatItem(
        item2
      )}`
    );
  }

  addCollisionFlash(item) {
    item.element.classList.add('collision-flash');
    setTimeout(() => {
      item.element.classList.remove('collision-flash');
    }, 150);
  }

  handleCollisions() {
    const draggedItem = this.interactionHandler.draggedItem;
    const collidableItems = this.pieces.filter(
      (item) => item !== draggedItem && !item.isSolved
    );
    const solvedGroups = this.pieces.filter((item) => item.isSolved);

    // Normal collisions between non-solved items
    for (let i = 0; i < collidableItems.length; i++) {
      for (let j = i + 1; j < collidableItems.length; j++) {
        const item1 = collidableItems[i];
        const item2 = collidableItems[j];

        if (this.checkCollision(item1, item2)) {
          this.resolveCollision(item1, item2);
        }
      }
    }

    // Collisions with solved groups (bounce off only)
    for (const movingItem of collidableItems) {
      for (const solvedGroup of solvedGroups) {
        if (this.checkCollision(movingItem, solvedGroup)) {
          this.bounceOffSolvedGroup(movingItem, solvedGroup);
        }
      }
    }
  }

  checkCollision(item1, item2) {
    const bounds1 = this.getItemBounds(item1);
    const bounds2 = this.getItemBounds(item2);

    return (
      bounds1.left < bounds2.right &&
      bounds1.right > bounds2.left &&
      bounds1.top < bounds2.bottom &&
      bounds1.bottom > bounds2.top
    );
  }

  getItemBounds(item) {
    // **PERFORMANCE FIX**: Use cached dimensions instead of reading from the DOM.
    // This avoids forcing a browser layout recalculation in the middle of the game loop.
    // The fallbacks (80, 60) are kept as a safeguard for uninitialized items,
    // though in practice, item.width and item.height should always be populated.
    const width = item.width || 80;
    const height = item.height || 60;
    return {
      left: item.x,
      top: item.y,
      right: item.x + width,
      bottom: item.y + height,
      width: width,
      height: height,
      centerX: item.x + width / 2,
      centerY: item.y + height / 2,
    };
  }

  resolveCollision(item1, item2) {
    const bounds1 = this.getItemBounds(item1);
    const bounds2 = this.getItemBounds(item2);

    // Vector from center of 1 to center of 2
    const dx = bounds2.centerX - bounds1.centerX;
    const dy = bounds2.centerY - bounds1.centerY;

    // Overlap on each axis
    const overlapX = bounds1.width / 2 + bounds2.width / 2 - Math.abs(dx);
    const overlapY = bounds1.height / 2 + bounds2.height / 2 - Math.abs(dy);

    // This check is important, as floating point errors might mean no overlap here
    // even if checkCollision passed.
    if (overlapX <= 0 || overlapY <= 0) {
      return;
    }

    let nx, ny;

    // The collision is on the axis with the smallest overlap
    if (overlapX < overlapY) {
      // Horizontal collision
      nx = dx > 0 ? 1 : -1;
      ny = 0;
      // Correct positions to remove overlap, with a small buffer
      const correction = nx * (overlapX / 2 + 0.1);
      item1.x -= correction;
      item2.x += correction;
    } else {
      // Vertical collision
      nx = 0;
      ny = dy > 0 ? 1 : -1;
      // Correct positions to remove overlap, with a small buffer
      const correction = ny * (overlapY / 2 + 0.1);
      item1.y -= correction;
      item2.y += correction;
    }

    // Apply bounce physics using the calculated collision normal
    this.applyBouncePhysics(item1, item2, nx, ny);
  }

  ensureMinimumVelocity(item) {
    const minVel = 0.03;

    // Calculate current speed
    const currentSpeed = Math.sqrt((item.vx || 0) ** 2 + (item.vy || 0) ** 2);

    // If moving too slowly, give it a random direction with minimum speed
    if (currentSpeed < minVel) {
      const angle = Math.random() * Math.PI * 2;
      item.vx = Math.cos(angle) * minVel;
      item.vy = Math.sin(angle) * minVel;
    }
  }

  updateGameArea() {
    // Called when debug panel toggles to update game bounds
    this.gameAreaWidth = this.debug.getGameAreaWidth();
  }

  getGameBounds() {
      // Don't leak outside container dimensions
      return {
        width: this.debug && this.debug.isVisible ? this.container.clientWidth - 400 : this.container.clientWidth,
        height: this.container.clientHeight,
      };
    }

  bounceOffSolvedGroup(movingItem, solvedGroup) {
    const bounds1 = this.getItemBounds(movingItem);
    const bounds2 = this.getItemBounds(solvedGroup);

    // Vector from solved group center to moving item center
    const dx = bounds1.centerX - bounds2.centerX;
    const dy = bounds1.centerY - bounds2.centerY;

    // Overlap calculation
    const overlapX = bounds1.width / 2 + bounds2.width / 2 - Math.abs(dx);
    const overlapY = bounds1.height / 2 + bounds2.height / 2 - Math.abs(dy);

    if (overlapX <= 0 || overlapY <= 0) return;

    let nx, ny;
    if (overlapX < overlapY) {
      nx = dx > 0 ? 1 : -1;
      ny = 0;
      movingItem.x += nx * (overlapX + 1);
    } else {
      nx = 0;
      ny = dy > 0 ? 1 : -1;
      movingItem.y += ny * (overlapY + 1);
    }

    // Reflect velocity off the solved group
    const v1n = (movingItem.vx || 0) * nx + (movingItem.vy || 0) * ny;
    if (v1n < 0) {
      // Only reflect if approaching
      const restitution = 0.8;
      movingItem.vx = (movingItem.vx || 0) - 2 * v1n * nx * restitution;
      movingItem.vy = (movingItem.vy || 0) - 2 * v1n * ny * restitution;
    }

    this.addCollisionFlash(movingItem);
    this.debug.log(
      `${this.debug.formatItem(movingItem)} bounced off solved group`
    );
  }

  onGroupSolved(group) {
    this.debug.log(`Group solved: ${this.debug.formatItem(group)}`);
    this.solvedGroupManager.addSolvedGroup(group);
  }
}

