class SolvedGroupManager {
  constructor(gameEngine, debug) {
    this.gameEngine = gameEngine;
    this.debug = debug;
    this.solvedGroups = [];
    this.stackHeight = 0;
    this.STACK_MARGIN = 20;
    this.MOVE_SPEED = 2;
  }

  addSolvedGroup(group) {
    if (this.solvedGroups.includes(group)) return;

    this.solvedGroups.push(group);
    group.isMovingToStack = true;

    const targetX = this.STACK_MARGIN;
    const targetY =
      window.innerHeight - this.STACK_MARGIN - group.height - this.stackHeight;

    group.targetX = targetX;
    group.targetY = targetY;

    // Use a tighter spacing for a more compact stack, as requested.
    this.stackHeight += group.height + 2;

    this.debug.log(
      `Moving solved group to stack position (${targetX}, ${targetY})`
    );
  }

  update() {
    for (const group of this.solvedGroups) {
      if (group.isMovingToStack) {
        this.moveGroupToStack(group);
      }
    }
  }

  moveGroupToStack(group) {
    const dx = group.targetX - group.x;
    const dy = group.targetY - group.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      group.x = group.targetX;
      group.y = group.targetY;
      group.vx = 0;
      group.vy = 0;
      group.isMovingToStack = false;
      this.debug.log(`Solved group reached stack position`);
    } else {
      const moveX = (dx / distance) * this.MOVE_SPEED;
      const moveY = (dy / distance) * this.MOVE_SPEED;

      group.x += moveX;
      group.y += moveY;
      group.vx = 0;
      group.vy = 0;
    }
  }

  removeSolvedGroup(group) {
    const index = this.solvedGroups.indexOf(group);
    if (index > -1) {
      this.solvedGroups.splice(index, 1);
    }
  }

  reset() {
    this.solvedGroups = [];
    this.stackHeight = 0;
    this.debug.log('Solved group stack has been reset.');
  }
}

