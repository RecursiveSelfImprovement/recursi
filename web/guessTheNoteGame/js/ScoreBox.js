
// --- START OF FILE ScoreBox.js ---

class ScoreBox {
  constructor(rootElement) {
      this.totalGuesses = 0;
      this.correctGuesses = 0;
      this.emojiHistory = [];

      this.div = makeElement("div", {
        style: {
          textAlign: 'center', padding: '0', background: '#3F0000', color: 'white',
          zIndex: '10', position: 'absolute', // MUST BE ABSOLUTE
          overflow: 'hidden', fontFamily: '"Architects Daughter", Arial, sans-serif', boxSizing: 'border-box'
        }
      });
      // MUST APPEND TO ROOT ELEMENT
      if (rootElement) rootElement.appendChild(this.div);

      this.positioner = new SmartElementPositioner(this.div, {
        container: rootElement, // BIND TO SANDBOX
        position: [0, 0], size: [100, 6],
        sizeCallback: (self, pixelDims) => {
          const scoreFontSize = Math.max(14, pixelDims.height * 0.4);
          const emojiFontSize = Math.max(12, pixelDims.height * 0.35);
          const resetButtonSize = pixelDims.width * 0.06;

          this.scoreText.style.fontSize = `${scoreFontSize}px`;
          this.scoreText.style.lineHeight = `${pixelDims.height}px`;

          this.emojiLayer.style.fontSize = `${emojiFontSize}px`;
          this.emojiLayer.style.lineHeight = `${pixelDims.height}px`;
          this.emojiLayer.style.paddingRight = `${resetButtonSize + 10}px`;

          this.resetButton.style.width = `${resetButtonSize}px`;
          this.resetButton.style.height = `${resetButtonSize}px`;
          this.resetButton.style.fontSize = `${resetButtonSize * 0.6}px`;
          this.resetButton.style.lineHeight = `${resetButtonSize * 0.95}px`;
          const padding = Math.max(2, pixelDims.height * 0.1);
          this.resetButton.style.top = `${padding}px`;
          this.resetButton.style.right = `${padding}px`;

          this.updateEmojiDisplayContent();
        }
      });

      this.div.style.padding = '0';

      this.emojiLayer = makeElement("div", {
        className: 'emoji-background',
        style: {
          position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
          zIndex: '1', opacity: '0.3', whiteSpace: 'nowrap', textAlign: 'left',
          overflow: 'hidden', userSelect: 'none', pointerEvents: 'none'
        }
      });
      this.div.appendChild(this.emojiLayer);

      this.scoreText = makeElement("div", {
        className: 'score-text', textContent: 'Score: 0 out of 0',
        style: {
          position: 'relative', zIndex: '2', width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', textShadow: '1px 1px 2px black, -1px -1px 2px black',
          pointerEvents: 'none'
        }
      });
      this.div.appendChild(this.scoreText);

      this.resetButton = makeElement("button", {
        textContent: '🔄', title: 'Reset Score',
        style: {
          position: 'absolute', zIndex: '3', background: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.5)', color: 'white', borderRadius: '50%',
          textAlign: 'center', cursor: 'pointer', padding: '0', boxShadow: '0 0 5px rgba(0,0,0,0.5)',
          fontFamily: 'Arial, sans-serif'
        }
      });
      this.resetButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.reset();
      });
      this.div.appendChild(this.resetButton);

      this.positioner.update();
    }

  recordGuess(isCorrect) {
    this.totalGuesses++;
    const emoji = isCorrect ? '👍' : '👎';
    if (isCorrect) {
      this.correctGuesses++;
    }
    this.emojiHistory.push(emoji); // Add to end
    this.updateDisplay();
  }

  reset() {
    this.totalGuesses = 0;
    this.correctGuesses = 0;
    this.emojiHistory = [];
    this.updateDisplay();
    console.log("Score reset");
  }

  updateDisplay() {
    this.scoreText.textContent = `${this.correctGuesses} out of ${this.totalGuesses}`;
    this.updateEmojiDisplayContent();
  }

  updateEmojiDisplayContent() {
    this.emojiLayer.textContent = this.emojiHistory.join('');
  }

  start() {
    this.reset();
    this.positioner.update();
  }

}
// --- END OF FILE ScoreBox.js ---

