class GameUI {
  constructor(container, env) {
      this.container = container || document.body;
      this.env = env; // Save environment
      this._injectStyles();
      this._overlayTimeout = null;

      this.mascotClickCount = 0;
      this.mascotClickTimeout = null;
      this.disguiseIndex = -1;
      
      this.disguises = [
        '/legos/disguises/groucho.png',
        '/legos/disguises/monocle.png',
        '/legos/disguises/vampire.png',
        '/legos/disguises/super-sleuth.png',
      ];

      this.panelMascot = makeElement('img', {
        src: '/legos/detective.png',
        className: 'detective-panel-mascot mascot-splash-mode',
      });

      const savedDifficulty = localStorage.getItem('legoDetectiveDifficulty');
      const initialDifficulty = savedDifficulty !== null ? parseFloat(savedDifficulty) : 0.5;
      this.scoreNode = makeElement('span', { id: 'score-value' }, '0');
      const scoreContainer = makeElement('div', { className: 'score-container', style: { marginRight: '10px', display: 'flex', alignItems: 'center', gap: '5px' } }, 'Score: ', this.scoreNode);

      this.feedbackNode = makeElement('div', { className: 'message-area' });
      this.instructionsBtn = makeElement('button', { className: 'instructions-btn', title: 'How to Play' }, '?');

      const feedbackWrapper = makeElement('div', { className: 'feedback-wrapper' }, this.feedbackNode, this.instructionsBtn);

      this.spinBtn = makeElement('button', {}, 'Stop Spin');
      this.revealBtn = makeElement('button', {}, 'Give Up?');
      const buttonGroup = makeElement('div', { className: 'button-group' }, this.spinBtn, this.revealBtn);
      
      this.difficultyLabel = makeElement('span', {});
      this.difficultySlider = makeElement('input', { type: 'range', min: '0', max: '1', step: '0.01', value: initialDifficulty });
      
      const difficultyContainer = makeElement('div', { className: 'difficulty-container' }, this.difficultyLabel, this.difficultySlider);

      // We remove absolute positioning and fixed sizes from here, let UITools handle it
      this.uiContainer = makeElement('div', { id: 'game-ui' }, this.panelMascot, feedbackWrapper, difficultyContainer, buttonGroup);
      
      // FIX: Encapsulate UI in a standard dialog
      this.dialog = UITools.makeDialog({
         env: this.env,
         title: 'Lego Detective',
         customHeaderControls: scoreContainer,
         contentElement: this.uiContainer,
         width: '350px',
         position: [20, 20],
         allowMaximize: false
      });

      this.overlayFeedbackNode = makeElement('div', { className: 'overlay-feedback' });
      this.container.appendChild(this.overlayFeedbackNode);
    }

  init(newPairCb, toggleSpinCb, revealCb) {
    this.spinBtn.onclick = () => toggleSpinCb?.();
    this.revealBtn.onclick = () => revealCb?.();
    this.panelMascot.onclick = () => this.handleMascotClick();
    this.instructionsBtn.onclick = () => this.showInstructions();

    const isFirstVisit = !localStorage.getItem('legoDetectiveFirstVisit');
    if (isFirstVisit) {
      setTimeout(() => {
        this.showInstructions(() => {
          if (this._isPhoneLikeScreen()) {
            this._scheduleAutoCollapse();
          }
        });
        localStorage.setItem('legoDetectiveFirstVisit', 'false');
      }, 2200);
    } else {
      if (this._isPhoneLikeScreen()) {
        this._scheduleAutoCollapse();
      }
    }

    this.updateDifficultyLabel();
    this.difficultySlider.addEventListener('change', () => {
      const value = this.getDifficulty();
      localStorage.setItem('legoDetectiveDifficulty', value);
      newPairCb?.();
    });
    this.difficultySlider.addEventListener('input', () =>
      this.updateDifficultyLabel()
    );
    this.setMessage('Find and click the one different brick.');
    this.setSpinButtonLabel('Stop Spin');
    this.enableReveal(false);

    setTimeout(() => {
      this.uiContainer.style.opacity = '1';
      this.uiContainer.style.transform = 'translateY(0)';
    }, 100);
  }

  handleMascotClick() {
    clearTimeout(this.mascotClickTimeout);
    this.mascotClickCount++;

    if (this.mascotClickCount >= 3) {
      this.cycleDisguise();
      this.mascotClickCount = 0;
    } else {
      this.mascotClickTimeout = setTimeout(() => {
        if (this.mascotClickCount === 1) {
          this.toggleCollapse();
        }
        this.mascotClickCount = 0;
      }, 250); // 250ms window for multi-click
    }
  }

  cycleDisguise() {
      this.disguiseIndex++;
      if (this.disguiseIndex >= this.disguises.length) {
        this.disguiseIndex = -1; // Back to original
      }

      if (this.disguiseIndex === -1) {
        // FIX: Replaced relative './detective.png' with absolute path
        this.panelMascot.src = '/legos/detective.png'; 
      } else {
        this.panelMascot.src = this.disguises[this.disguiseIndex];
      }

      // Add a little animation to give feedback on the change
      this.panelMascot.classList.remove('disguise-change');
      void this.panelMascot.offsetWidth; // Trigger reflow
      this.panelMascot.classList.add('disguise-change');
      this.panelMascot.addEventListener(
        'animationend',
        () => {
          this.panelMascot.classList.remove('disguise-change');
        },
        { once: true }
      );
    }

  toggleCollapse() {
      if (this.dialog) {
        this.dialog.toggleMinimize();
      }
    }

  updateDifficultyLabel() {
    const value = parseFloat(this.difficultySlider.value);
    let label = 'Difficulty: ';
    if (value < 0.2) label += 'Easiest';
    else if (value < 0.4) label += 'Easy';
    else if (value < 0.6) label += 'Medium';
    else if (value < 0.8) label += 'Hard';
    else label += 'Expert';
    this.difficultyLabel.textContent = label;
  }

  getDifficulty() {
    return parseFloat(this.difficultySlider.value);
  }

  enableDifficultySlider(flag) {
    if (this.difficultySlider) this.difficultySlider.disabled = !flag;
  }

  setMessage(msg) {
      if (this.feedbackNode) this.feedbackNode.textContent = msg;

      // Handle displaying a status overlay if the dialogue is minimized
      if (this.dialog && this.dialog._minimized) {
        if (this._overlayTimeout) {
          clearTimeout(this._overlayTimeout);
        }
        this.overlayFeedbackNode.textContent = msg;
        requestAnimationFrame(() => {
          this.overlayFeedbackNode.classList.add('visible');
        });
        this._overlayTimeout = setTimeout(() => {
          this.overlayFeedbackNode.classList.remove('visible');
        }, 2500);
      }
    }

  setScore(score) {
    if (this.scoreNode) this.scoreNode.textContent = score;
    if (this.collapsedScoreNode) this.collapsedScoreNode.textContent = score;
  }

  setSpinButtonLabel(txt) {
    if (this.spinBtn) this.spinBtn.textContent = txt;
  }

  enableReveal(flag) {
    if (this.revealBtn) this.revealBtn.disabled = !flag;
  }

  enableAllButtons(flag) {
    if (this.spinBtn) this.spinBtn.disabled = !flag;
    this.enableDifficultySlider(flag);
  }

  disableAllButtons(flag) {
    if (this.spinBtn) this.spinBtn.disabled = flag;
    if (this.revealBtn) this.revealBtn.disabled = flag;
    this.enableDifficultySlider(!flag);
  }

  showInstructions(onCloseCallback = null) {
      if (this.container.querySelector('.instructions-overlay')) return;
      const template = document.getElementById('instructions-template');
      
      let content;
      if (template) {
        content = template.content.cloneNode(true);
      } else {
        // Fallback DOM creation if HTML template hasn't loaded yet
        content = makeElement('div', { className: 'instructions-panel' }, 
          makeElement('button', { className: 'instructions-close-btn' }, '×'),
          makeElement('h2', {}, 'How to Play Lego Detective'),
          makeElement('ul', {}, 
            makeElement('li', {}, makeElement('strong', {}, 'Control the View:'), ' Drag with your mouse or finger to rotate the models. Use the scroll wheel or pinch to zoom.'),
            makeElement('li', {}, makeElement('strong', {}, 'Find the Difference:'), ' Your goal is to find the one brick that has been moved, rotated, or is missing.'),
            makeElement('li', {}, makeElement('strong', {}, 'Scoring:'), ' You get points for correct guesses but lose points for incorrect ones.'),
            makeElement('li', {}, makeElement('strong', {}, 'Chain Reactions:'), ' Clicking the wrong brick can cause others to fall.'),
            makeElement('li', {}, makeElement('strong', {}, 'Collapse the UI:'), ' Tap the detective mascot to collapse and expand this control panel.')
          )
        );
      }

      const overlay = makeElement(
        'div',
        { className: 'instructions-overlay' },
        content
      );

      const closePopup = () => {
        overlay.classList.remove('visible');
        overlay.addEventListener(
          'transitionend',
          () => {
            overlay.remove();
            if (onCloseCallback) onCloseCallback();
          },
          { once: true }
        );
      };

      const closeBtn = overlay.querySelector('.instructions-close-btn');
      if (closeBtn) closeBtn.onclick = closePopup;
      
      overlay.onclick = (e) => {
        if (e.target === overlay) closePopup();
      };

      this.container.appendChild(overlay);

      requestAnimationFrame(() => {
        setTimeout(() => overlay.classList.add('visible'), 10);
      });
    }

  showSplash() {
    this.panelMascot.classList.add('visible');
  }

  animateSplashToPanel() {
    setTimeout(() => {
      this.panelMascot.classList.remove('mascot-splash-mode');
    }, 1000);
  }

  _isPhoneLikeScreen() {
    const isVertical = window.innerHeight > window.innerWidth;
    if (!this.uiContainer) return false;
    const panelWidthRatio = this.uiContainer.offsetWidth / window.innerWidth;
    return isVertical && panelWidthRatio > 0.6;
  }

  _scheduleAutoCollapse() {
    setTimeout(() => {
      if (this.isCollapsed) return;

      this.toggleCollapse();
      this.setMessage('Click Sherlock to bring the panel back.');
    }, 3000);
  }

  _injectStyles() {
    const css = `
      ${this._getBaseStyles()}
      ${this._getInstructionsStyles()}
      ${this._getOverlayFeedbackStyles()}
    `;
    applyCss(css, 'game-ui-styles');
  }

  _getBaseStyles() {
      // Stripped out all hardcoded absolute/fixed transforms. UITools manages position and visibility now.
      return `
        @keyframes disguise-shake {
          10%, 90% { transform: translate3d(-1px, 0, 0) scale(1.1) rotate(-5deg); }
          20%, 80% { transform: translate3d(2px, 0, 0) scale(1.1) rotate(5deg); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0) scale(1.1) rotate(-5deg); }
          40%, 60% { transform: translate3d(4px, 0, 0) scale(1.1) rotate(5deg); }
        }
        .disguise-change {
          animation: disguise-shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        }
        #game-ui {
          display: flex; flex-direction: column; gap: 16px; position: relative;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          width: 100%;
        }
        .detective-panel-mascot {
          position: absolute;
          top: -35px; left: -15px; width: 75px; height: auto;
          cursor: pointer; z-index: 20;
          transition: transform 0.2s ease;
        }
        .detective-panel-mascot.mascot-splash-mode {
          position: fixed;
          top: 50%; left: 50%;
          width: 300px;
          transform: translate(-50%, -50%) scale(1);
          opacity: 0;
          pointer-events: none;
          z-index: 99999;
        }
        .detective-panel-mascot.visible { opacity: 1; }
        .detective-panel-mascot:not(.mascot-splash-mode):hover { transform: scale(1.1) rotate(-5deg); }
        
        .feedback-wrapper { position: relative; flex-shrink: 0; margin-top: 10px; }
        .score-container { font-size: 14px; font-weight: 500; color: #a0a0a0; }
        #score-value { font-weight: 700; color: #4ec9b0; font-size: 16px; margin-left: 5px; }
        .message-area { min-height: 44px; padding: 10px 12px; padding-right: 30px; background-color: rgba(0,0,0,0.2); border-radius: 6px; text-align: center; display: flex; align-items: center; justify-content: center; }
        .button-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .difficulty-container { display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: #c0c0c0; }
        #game-ui button { font-family: inherit; font-size: 14px; font-weight: 500; padding: 10px; border: none; border-radius: 6px; cursor: pointer; transition: background-color 0.2s ease, transform 0.1s ease; background-color: rgba(255, 255, 255, 0.1); color: #f0f0f0; border: 1px solid rgba(255, 255, 255, 0.2); }
        #game-ui button:hover { background-color: rgba(255, 255, 255, 0.2); }
        #game-ui button:active { transform: scale(0.97); }
        #game-ui button:disabled { background-color: rgba(50, 50, 50, 0.5); color: #888; cursor: not-allowed; border-color: rgba(100, 100, 100, 0.5); }
        .instructions-btn {
          position: absolute; top: 50%; right: 8px;
          transform: translateY(-50%);
          width: auto; height: auto; padding: 4px 6px;
          font-size: 18px; font-weight: bold; color: #999;
          background: none; border: none; z-index: 1;
        }
        .instructions-btn:hover { color: #fff; }
      `;
    }

  _getInstructionsStyles() {
      return `
        .instructions-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; opacity: 0; transition: opacity 0.3s ease-in-out; cursor: pointer; }
        .instructions-overlay.visible { opacity: 1; }
        .instructions-panel { background: #282c34; color: #abb2bf; padding: 2rem 2.5rem; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.5); max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative; cursor: default; transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .instructions-overlay.visible .instructions-panel { transform: scale(1); }
        .instructions-panel h2 { margin-top: 0; color: #61afef; text-align: center; margin-bottom: 1.5rem; }
        .instructions-panel ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1.2rem; }
        .instructions-panel li { line-height: 1.6; }
        .instructions-panel strong { color: #98c379; font-weight: 600; }
        .instructions-close-btn { position: absolute; top: 15px; right: 15px; background: transparent; border: none; color: #666; font-size: 2rem; font-weight: 200; line-height: 1; cursor: pointer; padding: 5px; transition: color 0.2s, transform 0.2s; }
        .instructions-close-btn:hover { color: #fff; transform: rotate(90deg); }
      `;
    }

  _getOverlayFeedbackStyles() {
      return `
        .overlay-feedback {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          background-color: rgba(25, 28, 32, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #f0f0f0;
          font-size: 18px;
          font-weight: 500;
          z-index: 2000;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.4s ease-in-out, top 0.4s ease-in-out;
        }
        .overlay-feedback.visible { opacity: 1; top: 40px; }
      `;
    }

}
