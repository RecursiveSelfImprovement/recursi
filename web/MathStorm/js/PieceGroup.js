class PieceGroup {
  static validateSequence(seq) {
    // 0) empty is ok
    if (seq.length === 0) return true;

    const isNum = (p) => p.type === 'number';
    const isOp = (p) => p.type === 'operator' && p.value !== '=';
    const isEq = (p) => p.type === 'operator' && p.value === '=';

    // 1) [ num ]
    if (seq.length === 1) return isNum(seq[0]);

    // 2) [ num , op ]      OR   [ num , '=' ]
    if (seq.length === 2) {
      return isNum(seq[0]) && (isOp(seq[1]) || isEq(seq[1]));
    }

    // 3) [ num , op , num ]
    if (seq.length === 3) {
      return isNum(seq[0]) && isOp(seq[1]) && isNum(seq[2]);
    }

    // 4) [ num , op , num , '=' ]
    if (seq.length === 4) {
      return isNum(seq[0]) && isOp(seq[1]) && isNum(seq[2]) && isEq(seq[3]);
    }

    // 5) [ num , op , num , '=' , num ]  → full expression
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
        console.log(
          'Length 5 sequence failed basic structure check:',
          seq.map((p) => `${p.value}(${p.type})`)
        );
        return false;
      }

      const a = Number(seq[0].value);
      const b = Number(seq[2].value);
      const c = Number(seq[4].value);
      const op = seq[1].value;
      let expect;
      switch (op) {
        case '×':
          expect = a * b;
          break;
        case '+':
          expect = a + b;
          break;
        case '−':
        case '-':
          expect = a - b;
          break;
        case '÷':
        case '/':
          expect = a / b;
          break;
        default:
          console.log('Unknown operator:', op);
          return false;
      }

      const isCorrect = expect === c;
      if (!isCorrect) {
        console.log(
          `Math validation failed: ${a} ${op} ${b} = ${c}, but expected ${expect}`
        );
      }
      return isCorrect;
    }

    console.log('Sequence too long:', seq.length);
    return false; // longer than 5
  }

  constructor(position, velocity) {
    this.children = [];
    this.x = position.x;
    this.y = position.y;
    this.vx = velocity.vx;
    this.vy = velocity.vy;
    this.scale = 1.0;
    this.isSolved = false;
    this.gameEngine = null; // To be set by GameEngine

    // --- NEW: Centralized Layout Definition ---
    this.layout = {
      paddingX: 8,
      paddingY: 6,
      grabBarHeight: 22,
      gap: 4,
      // This MUST match the CSS `border-width` for .piece-group
      borderWidth: 3,
    };

    this.width = 0;
    this.height = 0;

    this.element = makeElement('div', { className: 'piece-group' });
  }

  addPiece(piece, side) {
    if (this.isSolved) return false;

    // Validate first
    const test = [...this.children];
    if (side === 'left') test.unshift(piece);
    else test.push(piece);
    if (!PieceGroup.validateSequenceLoose(test)) return false;

    // --- Update the Model ---
    piece.parentGroup = this;
    piece.vx = 0;
    piece.vy = 0;
    if (side === 'left') this.children.unshift(piece);
    else this.children.push(piece);

    // Keep last free velocity for when it's pulled out again
    piece.lastFreeVelocity = { vx: piece.vx, vy: piece.vy };

    // --- Determine Anchor & Update Layout ---
    const anchorSide = side === 'left' ? 'right' : 'left';
    this.updateLayout(anchorSide);

    // --- Update the DOM ---
    // Reparent the DOM element after layout is calculated
    this.element.appendChild(piece.element);

    if (
      this.children.length === 5 &&
      PieceGroup.validateSequence(this.children)
    ) {
      this.onSolved();
    }
    return true;
  }

  removePiece(piece) {
    const index = this.children.indexOf(piece);
    if (index === -1) return;

    // Determine which side is the anchor *before* removing the piece
    const isFirstChild = index === 0;
    const anchorSide = isFirstChild ? 'right' : 'left';

    // --- Handle DOM Detachment ---
    // Ensure piece maintains its current screen position when reparented
    if (piece.element.parentElement === this.element) {
      const pieceRect = piece.element.getBoundingClientRect();
      const containerRect = document.body.getBoundingClientRect();

      piece.x = pieceRect.left - containerRect.left;
      piece.y = pieceRect.top - containerRect.top;

      // Add to main container BEFORE group resizes to avoid visual flash
      document.body.appendChild(piece.element);
      piece.draw(); // Draw it at its new absolute position
    }

    // --- Update the Model ---
    piece.parentGroup = null;
    this.children.splice(index, 1);

    // --- Update Layout ---
    this.updateLayout(anchorSide);
  }

  /**
   * The new, single source of truth for layout.
   * @param {'left' | 'right'} [anchorSide='left'] - Which side of the group should remain stationary.
   */

  recalculateLayout() {
    // This is now fully synchronous and programmatic, no CSS reading.
    const BORDER_WIDTH = 3; // From .piece-group border: 3px

    if (this.children.length === 0) {
      this.width = 20;
      this.height = 20;
      this.element.style.width = '20px';
      this.element.style.height = '20px';
      return;
    }

    let contentW = 0;
    let contentH = 0;

    // First pass: Calculate total content dimensions
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      contentW += child.width;
      if (i < this.children.length - 1) {
        contentW += this.GAP;
      }
      if (child.height > contentH) {
        contentH = child.height;
      }
    }

    // Second pass: Position children based on final dimensions
    let currentX = this.INTERNAL_PADDING_X;
    for (const child of this.children) {
      child.x = currentX;
      child.y = this.INTERNAL_PADDING_Y;
      child.draw(); // Update child transform
      currentX += child.width + this.GAP;
    }

    // Calculate final group box size
    const totalPaddingX = this.INTERNAL_PADDING_X * 2;
    const totalPaddingY = this.INTERNAL_PADDING_Y * 2;
    const grabBarSpace = this.isSolved ? 0 : this.GRAB_BAR_HEIGHT;

    // For border-box, the final size is content + padding + border
    const finalW = contentW + totalPaddingX + BORDER_WIDTH * 2;
    const finalH = contentH + totalPaddingY + grabBarSpace + BORDER_WIDTH * 2;

    this.element.style.width = `${finalW}px`;
    this.element.style.height = `${finalH}px`;
    this.width = finalW;
    this.height = finalH;

    this.draw();
  }

  update(speedMult = 1) {
    this.x += (this.vx || 0) * speedMult;
    this.y += (this.vy || 0) * speedMult;
  }

  draw() {
    this.element.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
  }

  shouldDissolve() {
    // Solved groups should never dissolve.
    if (this.isSolved) return false;
    return this.children.length <= 1;
  }

  remove() {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }

  onSolved() {
    this.isSolved = true;
    this.element.classList.add('solved');

    // The height will change because the grab bar is removed.
    // The width stays the same, so anchoring left is fine and won't cause a jump.
    this.updateLayout('left');

    // Notify the game engine.
    if (this.gameEngine) {
      this.gameEngine.onGroupSolved(this);
    }
  }

  static validateSequenceLoose(seq) {
    // Allow partials that could align to [N, OP, N, EQ, N]
    // Rules:
    //  - At most one '=' and if present it must land at slot 4 in some alignment.
    //  - Non '=' operator must land at slot 2.
    //  - Numbers can land only at slots 1,3,5.
    //  - Length > 5 is invalid. Length == 5 must use strict validateSequence.
    if (!Array.isArray(seq)) return false;
    if (seq.length === 0) return true;
    if (seq.length > 5) return false;
    // If full length, defer to strict
    if (seq.length === 5) return PieceGroup.validateSequence(seq);

    const eqCount = seq.filter(
      (p) => p.type === 'operator' && p.value === '='
    ).length;
    if (eqCount > 1) return false;

    const slotType = (slotIndex) => {
      // slots are 1..5: [1:N, 2:OP, 3:N, 4:=, 5:N]
      if (slotIndex === 2) return 'op';
      if (slotIndex === 4) return 'eq';
      return 'num';
    };

    // Try all start positions where seq could sit inside 1..5
    for (let start = 1; start <= 5 - seq.length + 1; start++) {
      let ok = true;
      for (let i = 0; i < seq.length; i++) {
        const piece = seq[i];
        const want = slotType(start + i);
        if (piece.type === 'number' && want !== 'num') {
          ok = false;
          break;
        }
        if (piece.type === 'operator') {
          if (piece.value === '=' && want !== 'eq') {
            ok = false;
            break;
          }
          if (piece.value !== '=' && want !== 'op') {
            ok = false;
            break;
          }
        }
      }
      if (ok) return true;
    }
    return false;
  }

  updateLayout(anchorSide = 'left') {
    // --- Phase 1: Capture the Anchor Point ---
    // The right edge of the group in screen coordinates. Use (this.width || 0) for the initial case.
    const oldRightEdge = this.x + (this.width || 0);

    // --- Phase 2: Calculate New Dimensions ---
    if (this.children.length === 0) {
      // Set to a minimum size for an empty group
      this.width = 20;
      this.height = 20;
    } else {
      let contentW = 0;
      let contentH = 0;
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        // Ensure child dimensions are cached.
        if (!child.width) child.cacheDimensions();

        contentW += child.width;
        if (i < this.children.length - 1) contentW += this.layout.gap;
        if (child.height > contentH) contentH = child.height;
      }

      const totalPaddingX = this.layout.paddingX * 2;
      const totalPaddingY = this.layout.paddingY * 2;
      const grabBarSpace = this.isSolved ? 0 : this.layout.grabBarHeight;

      // We set the full dimensions including padding (border is handled by CSS box-sizing)
      this.width = contentW + totalPaddingX;
      this.height = contentH + totalPaddingY + grabBarSpace;
    }

    // --- Phase 3: Apply New Position Based on Anchor ---
    if (anchorSide === 'right') {
      // The right edge should stay put. Calculate the new 'x' based on that.
      this.x = oldRightEdge - this.width;
    }
    // If anchorSide is 'left', this.x doesn't change, which is correct.

    // --- Phase 4: Apply All Visual Changes at Once ---
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;

    // Position children internally (their x/y are now relative to the group)
    let currentX = this.layout.paddingX;
    for (const child of this.children) {
      child.x = currentX;
      child.y = this.layout.paddingY;
      child.draw(); // Update child's transform
      currentX += child.width + this.layout.gap;
    }

    // Finally, update the group's own transform
    this.draw();
  }
}

