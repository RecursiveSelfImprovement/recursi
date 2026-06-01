
class SolverController {
  constructor(game) {
    this.game = game;
    this.autoPlayBox = null;
    this.thrashingMeter = null;
    this.autoPlayRandomness = 0;
    this.thrashingThreshold = 10;
    this.isAutoStrategy = true;
    this.lastSolverScore = -1;
    this.stagnantMoveCount = 0;
    this.isAutoPlaying = false;
  }

  get board() {
    return this.game.board;
  }

  get solver() {
    return this.game.solver;
  }

  get animationController() {
    return this.game.animationController;
  }

  stopSolverLoop() {
    this.isAutoPlaying = false;
    this.lastSolverScore = -1;
    this.stagnantMoveCount = 0;
    if (this.thrashingMeter) {
      this.thrashingMeter.style.width = '0%';
      this.thrashingMeter.textContent = '0';
    }
    console.log('Solver loop stopped by user.');
  }

  startSolverLoop() {
    if (this.isAutoPlaying) {
      console.log('Solver loop is already running.');
      return;
    }
    this.isAutoPlaying = true;
    this.lastSolverScore = this.board.completionScore;
    this.stagnantMoveCount = 0;
    console.log(`Starting self-tuning solver loop.`);

    const performNextMove = async () => {
      if (!this.isAutoPlaying) return;
      if (this.board.completionScore === 100) {
        console.log('Game solved!');
        this.stopSolverLoop();
        return;
      }

      if (this.board.completionScore > this.lastSolverScore) {
        this.stagnantMoveCount = 0;
      } else {
        this.stagnantMoveCount++;
      }
      this.lastSolverScore = this.board.completionScore;

      if (this.isAutoStrategy) {
        const newRandomness = Math.min(
          100,
          (this.stagnantMoveCount / this.thrashingThreshold) * 100
        );
        this.autoPlayRandomness = newRandomness;
        if (this.autoPlayBox && this.autoPlayBox.element.isConnected) {
          this.autoPlayBox.element.querySelector('#auto-play-slider').value =
            newRandomness;
        }
      }

      if (this.thrashingMeter) {
        const meterPercent = Math.min(
          100,
          (this.stagnantMoveCount / this.thrashingThreshold) * 100
        );
        this.thrashingMeter.style.width = `${meterPercent}%`;
        this.thrashingMeter.textContent = this.stagnantMoveCount;
      }

      let move;
      if (Math.random() < this.autoPlayRandomness / 100.0) {
        move = this.solver.findRandomMove();
      } else {
        move = this.solver.findBestMove();
      }

      if (move) {
        await this.animationController.animateMove(
          move.fromIndex,
          move.toIndex
        );
        setTimeout(performNextMove, 50);
      } else {
        console.log('No moves possible.');
        this.stopSolverLoop();
      }
    };
    performNextMove();
  }

  async setupScrambledGame() {
      this.stopSolverLoop();

      const rawInput = await UIFactory.showInputDialog(
        'Scramble Board',
        'This will start from a solved state and make N random moves.\n\nHow many moves to scramble?',
        '25',
        this.game.env
      );

      if (rawInput === null) return;
      const scrambleCount = parseInt(rawInput, 10);

      if (isNaN(scrambleCount) || scrambleCount < 0) {
        alert('Please enter a valid non-negative number.');
        return;
      }

      this.animationController.resetWinAnimationState();
      this.solver.scramble(scrambleCount);
      this.game.renderer.renderBoard(this.board);

      return `--- Scramble Operation ---\nBoard has been scrambled with ${scrambleCount} moves.`;
    }

  setupNearlySolvedGame() {
    const promptMessage =
      'Set board to a nearly solved state.\n\nThis will displace a few letters by swapping them with others that are nearby, then scatter the empty spaces.\n\nHow many letters should be displaced?';
    const rawInput = prompt(promptMessage, '2');
    if (rawInput === null) return;
    const jumbleCount = parseInt(rawInput, 10);

    if (isNaN(jumbleCount) || jumbleCount < 0) {
      alert('Please enter a valid non-negative number.');
      return;
    }

    this.animationController.resetWinAnimationState();
    const report = this.board.shuffleNearlySolved(jumbleCount);
    this.game.renderer.renderBoard(this.board);
    return report;
  }

  toggleAutoPlayControls() {
      if (this.autoPlayBox && this.autoPlayBox.element.isConnected) {
        this.autoPlayBox.setZOnTop();
        return;
      }

      const autoAdjustCheckbox = makeElement('input', {
        type: 'checkbox',
        id: 'auto-adjust-strategy',
        checked: this.isAutoStrategy,
        onchange: (e) => { this.isAutoStrategy = e.target.checked; },
      });
      const slider = makeElement('input', {
        id: 'auto-play-slider',
        type: 'range',
        min: 0,
        max: 100,
        value: this.autoPlayRandomness,
        style: { flexGrow: 1 },
        oninput: (e) => {
          this.autoPlayRandomness = parseInt(e.target.value, 10);
          this.isAutoStrategy = false;
          autoAdjustCheckbox.checked = false;
        },
      });

      const thresholdInput = makeElement('input', {
        type: 'number',
        min: 1,
        max: 100,
        value: this.thrashingThreshold,
        style: { width: '50px' },
        onchange: (e) => {
          this.thrashingThreshold = Math.max(1, parseInt(e.target.value, 10) || 10);
        },
      });

      const meterContainer = makeElement('div', {
        style: {
          border: '1px solid #ccc',
          background: '#e0e0e0',
          borderRadius: '4px',
          padding: '2px',
          height: '20px',
        },
      });
      this.thrashingMeter = makeElement(
        'div',
        {
          style: {
            width: '0%',
            background: '#f39c12',
            color: 'white',
            textAlign: 'center',
            borderRadius: '2px',
            transition: 'width 0.2s ease-out',
            height: '100%',
            lineHeight: '20px',
          },
        },
        '0'
      );
      meterContainer.appendChild(this.thrashingMeter);

      const startButton = makeElement('button', { onclick: () => this.startSolverLoop() }, 'Start');
      const stopButton = makeElement('button', { style: { backgroundColor: '#e74c3c' }, onclick: () => this.stopSolverLoop() }, 'Stop');

      const content = makeElement('div', {
          style: { display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px', fontSize: '0.9em' },
        },
        [
          makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '5px' } }, [autoAdjustCheckbox, makeElement('label', { htmlFor: 'auto-adjust-strategy' }, 'Auto-Adjust Strategy')]),
          makeElement('div', null, [
            makeElement('label', { style: { display: 'flex', justifyContent: 'space-between' } }, [makeElement('span', null, 'Best Move'), makeElement('span', null, 'Random Move')]),
            makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, ['0%', slider, '100%']),
          ]),
          makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '5px' } }, [makeElement('label', null, 'Thrashing Threshold:'), thresholdInput, makeElement('span', null, '(stagnant moves)')]),
          makeElement('div', null, [makeElement('label', null, 'Current Thrashing Level:'), meterContainer]),
          makeElement('div', { style: { display: 'flex', gap: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' } }, [startButton, stopButton]),
        ]
      );

      this.autoPlayBox = UITools.makeDialog({
        env: this.game.env,
        title: 'Auto-Play Controls',
        contentElement: content,
        size: [400, 300],
      });
    }

}

