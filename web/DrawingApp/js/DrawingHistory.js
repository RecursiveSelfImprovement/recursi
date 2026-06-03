class DrawingHistory {
    constructor() {
      this.stack = [];
    }

    push(action) {
      this.stack.push(action);
    }

    undo() {
      if (this.stack.length === 0) return;
      const action = this.stack.pop();
      if (action && typeof action.undo === 'function') {
        action.undo();
      }
    }

    clear() {
      this.stack = [];
    }
  }