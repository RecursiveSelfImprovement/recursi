
class DevPanel {
  constructor(game) {
    this.game = game;
    this.diagnosticsBox = null;
    this.diagnosticsOutput = null;
  }

  get board() {
    return this.game.board;
  }

  get boardElements() {
    return this.game.renderer.boardElements;
  }

  get scoreManager() {
    return this.game.scoreManager;
  }

  get dragController() {
    return this.game.dragController;
  }

  get solverController() {
    return this.game.solverController;
  }

  get animationController() {
    return this.game.animationController;
  }

  get atlasManager() {
    return this.game.atlasManager;
  }

  toggleDiagnostics() {
      if (this.diagnosticsBox && this.diagnosticsBox.element.isConnected) {
        this.diagnosticsBox.setZOnTop();
        return;
      }

      // Rebuilding panel content exactly as before...
      const nearlySolveButton = makeElement('button', { className: 'dev-button', onclick: () => { const report = this.solverController.setupNearlySolvedGame(); if (report && this.diagnosticsOutput) this.diagnosticsOutput.textContent = report; } }, '✨ Nearly Solve');
      const scrambleButton = makeElement('button', { className: 'dev-button', onclick: async () => { const report = await this.solverController.setupScrambledGame(); if (report && this.diagnosticsOutput) this.diagnosticsOutput.textContent = report; } }, '🎲 Scramble');
      const autoPlayButton = makeElement('button', { className: 'dev-button', onclick: () => this.solverController.toggleAutoPlayControls() }, '▶️ Auto-Play');
      const playWinAnimButton = makeElement('button', { className: 'dev-button', onclick: () => this.animationController.triggerWinAnimation() }, '🎉 Play Win Anim');
      const atlasButton = makeElement('button', { className: 'dev-button', onclick: () => this.atlasManager.generateImageAtlas() }, '🖼️ Gen Atlas');
      const runButton = makeElement('button', { className: 'dev-button', onclick: () => this.runDiagnostics() }, '🔎 Run Diagnostics');
      const copyButton = makeElement('button', { className: 'dev-button', onclick: (e) => this.copyDiagnosticsToClipboard(e.target) }, '📋 Copy Report');
      const resetButton = makeElement('button', { className: 'dev-button danger', onclick: () => { const report = this.dragController.forceResetDragState(); if (this.diagnosticsOutput) this.diagnosticsOutput.textContent = report; } }, '⚠️ Force Reset');

      const previewToggle = makeElement('input', { type: 'checkbox', id: 'preview-toggle', checked: this.scoreManager.showScorePreview, onchange: (e) => { this.scoreManager.showScorePreview = e.target.checked; if (!e.target.checked) this.scoreManager.completionPreviewDisplay.style.display = 'none'; } });
      const previewLabel = makeElement('label', { htmlFor: 'preview-toggle' }, [previewToggle, 'Show Live Score Preview']);

      this.diagnosticsOutput = makeElement('pre', { className: 'diagnostics-output' }, 'Click a button to begin.');

      const content = makeElement('div', { className: 'dev-panel-container' }, [
        makeElement('div', { className: 'dev-panel-grid' }, [
          makeElement('div', { className: 'dev-panel-section' }, [makeElement('h3', {}, 'Board Setup'), makeElement('div', { className: 'dev-button-group' }, [nearlySolveButton, scrambleButton])]),
          makeElement('div', { className: 'dev-panel-section' }, [makeElement('h3', {}, 'Automation & Fun'), makeElement('div', { className: 'dev-button-group' }, [autoPlayButton, playWinAnimButton])]),
          makeElement('div', { className: 'dev-panel-section' }, [makeElement('h3', {}, 'Debugging'), makeElement('div', { className: 'dev-button-group' }, [runButton, copyButton, resetButton])]),
          makeElement('div', { className: 'dev-panel-section' }, [makeElement('h3', {}, 'Tools & Options'), makeElement('div', { className: 'dev-button-group vertical' }, [atlasButton, makeElement('div', { className: 'dev-checkbox-group' }, [previewLabel])])]),
        ]),
        makeElement('div', { className: 'dev-output-section' }, [makeElement('h3', {}, 'Diagnostics Log'), this.diagnosticsOutput]),
      ]);

      // FIX: Use UITools.makeDialog bound to env instead of standard DialogBox
      this.diagnosticsBox = UITools.makeDialog({
        env: this.game.env,
        title: 'Developer Panel',
        size: [850, 600],
        position: [50, 60],
        contentElement: content,
      });
    }

  runDiagnostics() {
    if (!this.diagnosticsOutput) {
      console.error('Diagnostics panel not initialized.');
      return;
    }
    console.log('Running diagnostics...');
    let report = `--- Game State Diagnostics ---\n`;
    report += `Moves: ${this.board.moves}, Score: ${this.board.score}, Completion: ${this.board.completionScore}%\n`;
    report += `Drag State: ${
      this.dragController.dragState
        ? `Dragging tile at index ${this.dragController.dragState.startIndex}`
        : 'Inactive'
    }\n\n`;

    let gridReport = '';
    if (this.board.state.length === this.boardElements.length) {
      for (let i = 0; i < this.board.state.length; i++) {
        const data = this.board.state[i];
        const element = this.boardElements[i];

        const key = `[${(data.key || ' ').padEnd(5, ' ')}]`;
        const classes = `Classes: .${Array.from(element.classList).join(
          ' .'
        )}`.padEnd(40, ' ');
        const transform = `Transform: ${element.style.transform || 'none'}`;

        gridReport += `${key} ${classes} ${transform}\n`;

        if (
          (i + 1) % this.board.cols === 0 &&
          i < this.board.state.length - 1
        ) {
          gridReport += `------------------------------------------------------------------------------------------------\n`;
        }
      }
    } else {
      gridReport =
        'Error: Mismatch between board state and board elements arrays.';
    }

    this.diagnosticsOutput.textContent = report + gridReport;
  }

  copyDiagnosticsToClipboard(buttonElement) {
    if (this.diagnosticsOutput) {
      navigator.clipboard
        .writeText(this.diagnosticsOutput.textContent)
        .then(() => {
          const originalText = buttonElement.textContent;
          buttonElement.textContent = 'Copied!';
          setTimeout(() => (buttonElement.textContent = originalText), 2000);
        })
        .catch((err) => console.error('Failed to copy diagnostics:', err));
    }
  }

}

