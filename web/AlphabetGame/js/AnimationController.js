
class AnimationController {
  constructor(game) {
    this.game = game;
    this.isAnimating = false;
  }

  get gridContainer() {
    return this.game.gridContainer;
  }

  get boardElements() {
    return this.game.renderer.boardElements;
  }

  get board() {
    return this.game.board;
  }

  commitMove(startIndex, finalIndex) {
    const fromTile = this.boardElements[startIndex];
    this.board.moveTile(startIndex, finalIndex);
    [this.boardElements[startIndex], this.boardElements[finalIndex]] = [
      this.boardElements[finalIndex],
      fromTile,
    ];
    this.gridContainer.append(...this.boardElements);

    fromTile.classList.remove('dragging');
    fromTile.style.transform = '';
    fromTile.style.transition = '';
    fromTile.style.zIndex = '';

    this.game.scoreManager.updateDisplay(this.board, this.boardElements);

    if (
      this.board.completionScore === 100 &&
      !this.gridContainer.classList.contains('game-won')
    ) {
      this.triggerWinAnimation();
    }
  }

  animateMove(fromIndex, toIndex) {
    return new Promise((resolve) => {
      if (this.isAnimating) {
        console.warn('Animation already in progress, move skipped.');
        resolve();
        return;
      }

      this.isAnimating = true;
      const tile = this.boardElements[fromIndex];
      const startRect = tile.getBoundingClientRect();
      const toRect = this.boardElements[toIndex].getBoundingClientRect();

      const finalTranslateX = toRect.left - startRect.left;
      const finalTranslateY = toRect.top - startRect.top;
      const distance = Math.hypot(finalTranslateX, finalTranslateY);

      tile.style.zIndex = '1000';
      tile.classList.add('dragging');

      let cleanupHasRun = false;
      const completeMoveAction = () => {
        if (cleanupHasRun) return;
        cleanupHasRun = true;
        this.commitMove(fromIndex, toIndex);
        this.isAnimating = false;
        resolve();
      };

      if (distance < 1) {
        completeMoveAction();
        return;
      }

      const duration = Math.max(0.1, Math.min(0.25, distance / 800));
      const durationMs = duration * 1000;

      const safetyTimeout = setTimeout(() => {
        console.warn('Animation transitionEnd safety net triggered.');
        completeMoveAction();
      }, durationMs + 50);

      tile.addEventListener(
        'transitionend',
        () => {
          clearTimeout(safetyTimeout);
          completeMoveAction();
        },
        { once: true }
      );

      tile.style.transition = `transform ${duration.toFixed(2)}s ease-out`;
      tile.style.transform = `translate(${finalTranslateX}px, ${finalTranslateY}px) scale(1.05)`;
    });
  }

  triggerWinAnimation() {
    console.log('Triggering win celebration animation...');
    this.resetWinAnimationState();

    requestAnimationFrame(() => {
      this.gridContainer.classList.add('game-won');

      const letterTiles = this.boardElements.filter((el) =>
        el.classList.contains('letter')
      );
      letterTiles.forEach((tile, i) => {
        const delay = (i * 0.04).toFixed(2);
        tile.style.setProperty('--delay', `${delay}s`);
      });

      setTimeout(() => {
        this.game.winMovesDisplay.textContent = this.board.moves;
        this.game.winOverlay.classList.add('visible');
      }, letterTiles.length * 40 + 1000);
    });
  }

  resetWinAnimationState() {
    if (this.gridContainer) {
      this.gridContainer.classList.remove('game-won');
    }

    if (this.boardElements && this.boardElements.length > 0) {
      this.boardElements.forEach((tile) => {
        if (tile.style.getPropertyValue('--delay')) {
          tile.style.removeProperty('--delay');
        }
      });
    }
  }

  showJiggleAnimation(tile) {
    tile.classList.add('jiggle');
    tile.addEventListener(
      'animationend',
      () => {
        tile.classList.remove('jiggle');
      },
      { once: true }
    );
  }

}

