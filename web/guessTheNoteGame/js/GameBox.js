class GameBox {
  constructor() {
    this.noteSpans = [];
    this.config = {
      noteBaseFontSize: 400,
      feedbackBaseFontSize: 33,
      buttonBaseFontSize: 18,
      playAgainBaseFontSize: 16,
    };
  }

  start(rootElement) {
      this.div = makeElement('div', {
        style: {
          position: 'absolute', // MUST BE ABSOLUTE
          textAlign: 'center', background: 'rgba(0, 0, 0, 0.7)',
          color: 'white', zIndex: '10', borderRadius: '12px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          fontFamily: '"Architects Daughter", Arial, sans-serif', overflow: 'hidden', boxSizing: 'border-box',
        },
        className: 'game-box',
      });
      // MUST APPEND TO ROOT ELEMENT
      if (rootElement) rootElement.appendChild(this.div);

      this.positioner = new SmartElementPositioner(this.div, {
        container: rootElement, // BIND TO SANDBOX
        position: [7.5, 10], size: [85, 25], aspectRatio: null,
        sizeCallback: (self, pixelDims, percentSpecs) => {
          const fontScale = Math.min(pixelDims.width / 400, pixelDims.height / 200);
          const feedbackHeight = pixelDims.height * 0.25;
          const feedbackFontSize = Math.max(14, this.config.feedbackBaseFontSize * fontScale);
          this.feedbackText.style.height = `${feedbackHeight}px`;
          this.feedbackText.style.lineHeight = `${feedbackHeight}px`;
          this.feedbackText.style.fontSize = `${feedbackFontSize}px`;
          this.feedbackText.style.width = '100%';
          const noteDisplayHeightPixels = pixelDims.height * 0.5;
          this.noteDisplay.style.height = `${noteDisplayHeightPixels}px`;
          this.noteDisplay.style.width = '100%';
          this.noteDisplay.style.position = 'absolute';
          this.noteDisplay.style.top = `${pixelDims.height * 0.25}px`;
          const noteSpanWidthPixels = pixelDims.width / 3;
          const noteFontSize = Math.max(28, noteDisplayHeightPixels * 0.6);
          this.noteSpans.forEach((span) => {
            span.style.width = `${noteSpanWidthPixels}px`;
            span.style.height = `${noteDisplayHeightPixels}px`;
            span.style.lineHeight = `${noteDisplayHeightPixels}px`;
            span.style.fontSize = `${noteFontSize}px`;
            span.style.transformOrigin = 'center center';
          });
          const buttonSlotHeightPixels = pixelDims.height * 0.25;
          this.buttonSlot.style.height = `${buttonSlotHeightPixels}px`;
          this.buttonSlot.style.width = '100%';
          this.buttonSlot.style.justifyContent = 'center';
          const startButtonHeight = buttonSlotHeightPixels * 0.8;
          const startButtonFontSize = Math.max(12, this.config.buttonBaseFontSize * fontScale);
          const startButtonPadding = Math.max(3, startButtonHeight * 0.1);
          this.startButton.style.height = `${startButtonHeight}px`;
          this.startButton.style.fontSize = `${startButtonFontSize}px`;
          this.startButton.style.padding = `${startButtonPadding}px ${startButtonPadding * 2}px`;
          const playAgainButtonHeight = buttonSlotHeightPixels * 0.7;
          const playAgainButtonFontSize = Math.max(10, this.config.playAgainBaseFontSize * fontScale);
          const playAgainPaddingVertical = Math.max(2, playAgainButtonHeight * 0.1);
          const playAgainPaddingHorizontal = Math.max(5, playAgainButtonFontSize * 0.6);
          this.playAgainButton.style.height = `${playAgainButtonHeight}px`;
          this.playAgainButton.style.fontSize = `${playAgainButtonFontSize}px`;
          this.playAgainButton.style.width = 'auto';
          this.playAgainButton.style.padding = `${playAgainPaddingVertical}px ${playAgainPaddingHorizontal}px`;
          const cornerOffset = Math.max(5, pixelDims.height * 0.03);
          this.playAgainButton.style.bottom = `${cornerOffset}px`;
          this.playAgainButton.style.right = `${cornerOffset}px`;
        },
      });

      this.feedbackText = makeElement('p', {
        className: 'feedbackText', textContent: 'guess the note...',
        style: { visibility: 'visible', margin: '0', padding: '0 5px', boxSizing: 'border-box', fontFamily: 'inherit', flexShrink: '0' },
      });
      this.div.appendChild(this.feedbackText);

      this.noteDisplay = makeElement('div', {
        className: 'noteDisplay',
        style: { visibility: 'hidden', margin: '0', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%', flexGrow: '1' },
      });
      this.div.appendChild(this.noteDisplay);

      this.buttonSlot = makeElement('div', {
        id: 'button-slot',
        style: { boxSizing: 'border-box', display: 'flex', alignItems: 'center', width: '100%', flexShrink: '0' },
      });
      this.div.appendChild(this.buttonSlot);

      this.startButton = makeElement('button', {
        id: 'startButton', textContent: 'Start Game',
        style: { visibility: 'visible', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
      });
      this.buttonSlot.appendChild(this.startButton);

      this.playAgainButton = makeElement('button', {
        id: 'playAgainButton', textContent: 'Play Notes Again',
        style: { position: 'absolute', visibility: 'hidden', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' },
      });
      this.div.appendChild(this.playAgainButton);

      this.positioner.update();
    }

  displayNotes(midiSequence, showAll = false) {
    this.noteDisplay.innerHTML = '';
    this.noteSpans = [];

    midiSequence.forEach((midiCode, i) => {
      const keyIndex = (midiCode - 12) % 12;
      const key = PianoUtils.PianoKeys.dims[keyIndex];
      const prevKeyIndex = (keyIndex - 1 + 12) % 12;
      const prevKey = PianoUtils.PianoKeys.dims[prevKeyIndex];

      const baseSpan = makeElement('span', {
        style: {
          display: 'inline',
          verticalAlign: 'middle',
          fontFamily: 'inherit',
          visibility: 'inherit',
        },
      });
      const sharpSpan = makeElement('span', {
        textContent: '♯',
        style: {
          display: 'inline',
          verticalAlign: 'middle',
          fontFamily: 'inherit',
          textShadow: '-1px -1px 1px white, 2px 2px 4px black',
          visibility: 'inherit',
        },
      });
      sharpSpan.style.color = PianoUtils.rgbToHex(
        PianoUtils.toPastel(PianoUtils.getSharpColor(midiCode))
      );

      if (!key.black) {
        baseSpan.textContent = key.name;
        baseSpan.style.color = PianoUtils.rgbToHex(
          PianoUtils.toPastel(key.color)
        );
        baseSpan.style.textShadow =
          i < 2 ? '-1px -1px 1px white, 2px 2px 4px black' : '1px 1px 2px #666';
      } else {
        baseSpan.textContent = prevKey.name;
        baseSpan.style.color = PianoUtils.rgbToHex(
          PianoUtils.toPastel(prevKey.color)
        );
        baseSpan.style.textShadow =
          i < 2 ? '-1px -1px 1px white, 2px 2px 4px black' : '1px 1px 2px #666';
        baseSpan.appendChild(sharpSpan);
      }

      const wrapperSpan = makeElement('span', {
        style: {
          visibility: 'hidden',
          display: 'inline-block',
          textAlign: 'center',
          verticalAlign: 'middle',
          fontFamily: '"Architects Daughter", Arial, sans-serif',
          boxSizing: 'border-box',
          overflow: 'hidden',
        },
      });

      if (i < 2 || showAll) {
        wrapperSpan.appendChild(baseSpan);
      } else {
        const questionSpan = makeElement('span', {
          textContent: '?',
          style: {
            display: 'inline',
            verticalAlign: 'middle',
            fontFamily: 'inherit',
            visibility: 'inherit',
          },
        });
        wrapperSpan.appendChild(questionSpan);
        wrapperSpan.className = 'third-note';
        questionSpan.style.color = '#ccc';
        questionSpan.style.textShadow = '1px 1px 2px #333';
      }
      this.noteDisplay.appendChild(wrapperSpan);
      this.noteSpans.push(wrapperSpan);
    });
    this.noteDisplay.style.visibility = 'visible';
    this.playAgainButton.style.visibility = 'hidden';
    this.positioner.update();
  }

  updateNoteDisplay(index, midiCode, isCorrect = false) {
    if (index < 0 || index >= this.noteSpans.length) return;
    const keyIndex = (midiCode - 12) % 12;
    const key = PianoUtils.PianoKeys.dims[keyIndex];
    const prevKeyIndex = (keyIndex - 1 + 12) % 12;
    const prevKey = PianoUtils.PianoKeys.dims[prevKeyIndex];
    const span = this.noteSpans[index];
    span.innerHTML = '';
    const baseSpan = makeElement('span', {
      style: {
        display: 'inline',
        verticalAlign: 'middle',
        fontFamily: 'inherit',
        textShadow: '-1px -1px 1px white, 2px 2px 4px black',
        visibility: 'inherit',
      },
    });
    const sharpSpan = makeElement('span', {
      textContent: '♯',
      style: {
        display: 'inline',
        verticalAlign: 'middle',
        fontFamily: 'inherit',
        textShadow: '-1px -1px 1px white, 2px 2px 4px black',
        visibility: 'inherit',
      },
    });
    sharpSpan.style.color = PianoUtils.rgbToHex(
      PianoUtils.toPastel(PianoUtils.getSharpColor(midiCode))
    );

    if (!key.black) {
      baseSpan.textContent = key.name;
      baseSpan.style.color = PianoUtils.rgbToHex(
        PianoUtils.toPastel(key.color)
      );
    } else {
      baseSpan.textContent = prevKey.name;
      baseSpan.style.color = PianoUtils.rgbToHex(
        PianoUtils.toPastel(prevKey.color)
      );
      baseSpan.appendChild(sharpSpan);
    }
    span.appendChild(baseSpan);
    span.style.visibility = 'visible';
    span.className = '';
    span.style.color = 'inherit';
    span.style.textShadow = 'inherit';
    this.positioner.update();
  }

  updateUI(state) {
    this.startButton.style.visibility = state === 'IDLE' ? 'visible' : 'hidden';
    const promptDivHasCorrectClass =
      this.getPromptDiv()?.classList.contains('correct');
    this.playAgainButton.style.visibility =
      state === 'GUESSING' ||
      (state === 'FEEDBACK' && !promptDivHasCorrectClass)
        ? 'visible'
        : 'hidden';
    const notesGenerated = this.noteSpans.length > 0;
    this.noteDisplay.style.visibility =
      notesGenerated && ['PLAYING', 'GUESSING', 'FEEDBACK'].includes(state)
        ? 'visible'
        : 'hidden';
    this.feedbackText.style.visibility = 'visible';
    requestAnimationFrame(() => {
      if (this.positioner) {
        this.positioner.update();
      }
    });
  }

  static midiToNote(midi) {
    const noteNames = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    const octave = Math.floor((midi - 12) / 12);
    const noteIndex = (midi - 12) % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }

  getPromptDiv() {
    return this.div;
  }
  getStartButton() {
    return this.startButton;
  }
  getPlayAgainButton() {
    return this.playAgainButton;
  }
  setFeedbackText(text, visibility = 'visible') {
    this.feedbackText.textContent = text;
    this.feedbackText.style.visibility = visibility;
  }
  getNoteSpans() {
    return this.noteSpans;
  }

}

