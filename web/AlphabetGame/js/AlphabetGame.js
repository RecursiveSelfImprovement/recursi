class AlphabetGame {
  init(targetElement) {
      StylesModule.applyAllStyles(); // Re-wired to call static class method

      console.log('Initializing AlphabetGame View...');
      this.initialBoardState = [];

      this.scoreManager = new ScoreManager();
      this.atlasManager = new ImageAtlasManager();
      this.atlasManager.onAtlasChanged = () => this.renderer.renderBoard(this.board);
      this.themeManager = new ThemeManager(this.atlasManager);

      UIFactory.loadGoogleFont('Architects Daughter');
      targetElement.innerHTML = '';

      this.gridContainer = makeElement('div', { className: 'game-grid' });

      this.renderer = new BoardRenderer(this.gridContainer, this.atlasManager, this.scoreManager);
      this.animationController = new AnimationController(this);
      this.dragController = new DragController(this);
      this.solverController = new SolverController(this);
      this.devPanel = new DevPanel(this);

      const gameHeader = this.scoreManager.buildHeader();
      this.winMovesDisplay = makeElement('span', {}, '0');

      const playAgainButton = makeElement('button', { className: 'play-again-button', onclick: () => this.setupNewGame() }, 'New Board');
      const replaySameBoardButton = makeElement('button', { className: 'replay-same-button', onclick: () => this.replayLastGame() }, 'Replay Same Board');
      const winButtonContainer = makeElement('div', { className: 'win-overlay-buttons' }, [playAgainButton, replaySameBoardButton]);

      this.winOverlay = makeElement('div', { className: 'win-overlay' }, [
        makeElement('h2', {}, 'You Win!'),
        makeElement('p', {}, ['You solved the puzzle in ', this.winMovesDisplay, ' moves.']),
        winButtonContainer,
      ]);

      this.gridSizeSelector = UIFactory.createGridSizeSelector((size) => this.changeGridSize(size));
      const darkModeToggle = this.themeManager.createDarkModeToggle();
      const diagnosticsButton = makeElement('button', { className: 'diagnostics-toggle-button', onclick: () => this.devPanel.toggleDiagnostics() }, 'dev stuff...');

      const gameContainer = makeElement('div', { className: 'game-container' });
      gameContainer.appendChild(gameHeader);
      gameContainer.appendChild(this.gridContainer);
      gameContainer.appendChild(this.winOverlay);
      gameContainer.appendChild(this.gridSizeSelector);
      gameContainer.appendChild(diagnosticsButton);
      gameContainer.appendChild(darkModeToggle);
      
      targetElement.appendChild(gameContainer);

      this.dragController.attachGridListener();
      this.changeGridSize(6);
    }

  setupNewGame() {
    this.board.shuffleAndValidate();
    this.initialBoardState = [...this.board.state];
    this.animationController.resetWinAnimationState();
    this.winOverlay.classList.remove('visible');
    this.renderer.renderBoard(this.board);
  }

  changeGridSize(size) {
    console.log(`Setting up new game with grid size: ${size}x${size}`);

    if (this.solver && this.solverController.isAutoPlaying) {
      this.solverController.stopSolverLoop();
    }

    if (this.gridSizeSelector) {
      this.gridSizeSelector.querySelectorAll('button').forEach((btn) => {
        btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === size);
      });
    }

    this.gridContainer.style.setProperty('--grid-cols', size);

    this.board = new GameBoard(size, size);
    this.solver = new GameSolver(this.board);

    this.setupNewGame();
  }

  replayLastGame() {
    if (!this.initialBoardState || this.initialBoardState.length === 0) {
      console.error(
        'No initial board state saved. Starting a new game instead.'
      );
      this.setupNewGame();
      return;
    }

    this.animationController.resetWinAnimationState();
    this.winOverlay.classList.remove('visible');

    this.board.state = [...this.initialBoardState];
    this.board.moves = 0;
    this.board.updateScores();

    this.renderer.renderBoard(this.board);
  }

  async run(env) {
      this.env = env;
      this.rootElement = env.container;
      
      // Fix standalone screen fill constraint
      if (this.rootElement === document.body) {
        document.documentElement.style.height = '100%';
        document.documentElement.style.margin = '0';
        document.body.style.height = '100%';
        document.body.style.margin = '0';
      }

      this.rootElement.classList.add('alphabet-game-wrapper');
      this.init(this.rootElement);
      return this;
    }

  destroy() {
      if (this.solverController) this.solverController.stopSolverLoop();
      if (this.devPanel?.diagnosticsBox) this.devPanel.diagnosticsBox.close();
      if (this.gridSizeSelector?.dialog) this.gridSizeSelector.dialog.close();
      this.rootElement.innerHTML = "";
    }

}

