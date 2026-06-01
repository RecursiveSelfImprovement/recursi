class GuessTheNoteGame {
  constructor() {
    // Empty constructor to overwrite legacy
  }

  start() {
      this.scoreBox = new ScoreBox(this.rootElement);
      this.scoreBox.start();

      this.gameBox = new GameBox();
      this.gameBox.start(this.rootElement);

      this.addEventListeners();

      this.pianoDivElement = makeElement('div', {
        style: { overflow: 'hidden', position: 'absolute' }, // MUST BE ABSOLUTE
      });
      this.rootElement.appendChild(this.pianoDivElement); // MUST APPEND FIRST

      this.pianoPositioner = new SmartElementPositioner(this.pianoDivElement, {
        container: this.rootElement, // BIND TO SANDBOX
        position: [0, 40],
        size: [100, 40],
        sizeCallback: (self, pixelDims) => {
          if (this.piano && pixelDims.width > 0 && pixelDims.height > 0) {
            this.piano.setSizeAndPosition(pixelDims.width, pixelDims.height);
          }
        },
      });

      this.piano = new Piano();
      this.pianoDivElement.appendChild(this.piano.getContainer());
      this.piano.setGameInstance(this);
      this.pianoPositioner.update();

      this.instrumentSelector = new InstrumentSelector(this);
      this.instrumentSelector.start();

      this.keySelector = new KeySignatureSelector(this);
      this.keySelector.start();

      this.createSecretButton();
      this.updateUI();
    }

  addEventListeners() {
      this.gameBox.getStartButton().addEventListener('click', async () => {
        // <-- FIXED: Explicitly unlock the AudioContext on user interaction
        if (window.instruments && typeof window.instruments.resumeContext === 'function') {
           await window.instruments.resumeContext();
        }
        this.startNewRound();
      });
      
      this.gameBox.getPlayAgainButton().addEventListener('click', () => {
        if (
          this.state === this.States.GUESSING ||
          (this.state === this.States.FEEDBACK &&
            !this.gameBox.getPromptDiv().classList.contains('correct'))
        ) {
          this.playSequence();
        }
      });
    }

  updateUI() {
    this.gameBox.updateUI(this.state);
  }

  stopRound() {
    this.overlays.forEach((overlay) =>
      this.piano.removeOverlayElement(overlay)
    );
    this.overlays = [];
    this.state = this.States.IDLE;
    this.currentSequence = [];
    this.gameBox.getPromptDiv().classList.remove('correct', 'incorrect');
    this.gameBox.setFeedbackText('');
    this.gameBox
      .getNoteSpans()
      .forEach((span) => (span.style.visibility = 'hidden'));
    this.gameBox.getPlayAgainButton().style.visibility = 'visible';
    const fullStartMidi = this.piano.settings.fullStartMidi;
    const fullEndMidi = this.piano.settings.fullEndMidi;
    for (let midi = fullStartMidi; midi <= fullEndMidi; midi++) {
      this.piano.glowPiano.setKeySemiActive(midi, false);
    }
    if (window.instruments) {
      window.instruments.stopAllNotes();
    }
    this.updateUI();
  }

  startNewRound() {
    if (this.state !== this.States.IDLE) return;

    this.overlays.forEach((overlay) =>
      this.piano.removeOverlayElement(overlay)
    );
    this.overlays = [];
    if (window.instruments) window.instruments.stopAllNotes();

    this.state = this.States.PLAYING;
    this.currentSequence = [];
    const fullStartMidi = this.piano.settings.fullStartMidi;
    const fullEndMidi = this.piano.settings.fullEndMidi;

    if (Math.random() < 0.2) {
      const newStartMidi =
        Math.floor(Math.random() * (fullEndMidi - 11 - fullStartMidi + 1)) +
        fullStartMidi;
      this.piano.setGameRange(newStartMidi, newStartMidi + 11);
    } else {
      this.piano.setGameRange(
        this.piano.gameRange.startMidi,
        this.piano.gameRange.endMidi
      );
    }

    const { startMidi, endMidi } = this.piano.gameRange;
    let availableNotes = this.keySelector.getAvailableNotes();
    if (availableNotes.length < 3) {
      availableNotes = Array.from(
        { length: endMidi - startMidi + 1 },
        (_, i) => startMidi + i
      );
    }

    this.currentSequence = [];
    while (this.currentSequence.length < 3) {
      const randomIndex = Math.floor(Math.random() * availableNotes.length);
      const selectedNote = availableNotes[randomIndex];
      if (!this.currentSequence.includes(selectedNote)) {
        this.currentSequence.push(selectedNote);
      }
    }
    this.currentSequence = this.currentSequence.filter(
      (midi) => midi >= startMidi && midi <= endMidi
    );

    for (
      let midi = this.piano.settings.fullStartMidi;
      midi <= this.piano.settings.fullEndMidi;
      midi++
    ) {
      this.piano.glowPiano.setKeySemiActive(midi, false);
    }

    this.gameBox.getPromptDiv().classList.remove('correct', 'incorrect');
    this.gameBox.displayNotes(this.currentSequence);
    this.gameBox.setFeedbackText('guess the third note');
    this.updateUI();
    setTimeout(() => this.playSequence(), this.startDelay);
  }

  playSequence() {
    if (
      this.state !== this.States.PLAYING &&
      this.state !== this.States.GUESSING &&
      !(
        this.state === this.States.FEEDBACK &&
        !this.gameBox.getPromptDiv().classList.contains('correct')
      )
    ) {
      return;
    }

    if (this.state === this.States.PLAYING) {
      this.gameBox
        .getNoteSpans()
        .forEach((span) => (span.style.visibility = 'hidden'));
    }

    const playNoteWithDelay = (index) => {
      if (index >= this.currentSequence.length) {
        if (this.state === this.States.PLAYING) {
          this.state = this.States.GUESSING;
          this.updateUI();
        }
        return;
      }
      const midiCode = this.currentSequence[index];
      const span = this.gameBox.getNoteSpans()[index];
      const visualDuration = 1000;
      const suppressDisplay = index === 2;

      if (index < 2) {
        let numberElement = this.overlays.find(
          (el) =>
            el.dataset.sequenceIndex === `${index + 1}` &&
            el.dataset.midi === `${midiCode}`
        );
        if (!numberElement) {
          numberElement = document.createElement('div');
          numberElement.textContent = `${index + 1}`;
          numberElement.dataset.sequenceIndex = `${index + 1}`;
          numberElement.dataset.midi = `${midiCode}`;
          const keyInfo = this.piano.graphicPiano.getKeyByMidi(midiCode);
          const isBlack = keyInfo?.bbox.isBlack ?? false;
          numberElement.style.color = isBlack ? 'white' : 'black';
          numberElement.style.fontSize = '48px';
          numberElement.style.textShadow = isBlack
            ? '2px 2px 0 black'
            : '-2px -2px 0 white';
          numberElement.style.display = 'none';
          numberElement.style.textAlign = 'center';
          this.piano.addOverlayElement(midiCode, numberElement, {
            bottomOffset: 5,
          });
          this.overlays.push(numberElement);
        }
        setTimeout(() => {
          numberElement.style.display = 'block';
          numberElement.classList.add('pulse-overlay');
          setTimeout(() => {
            if (numberElement.parentNode)
              numberElement.classList.remove('pulse-overlay');
          }, 500);
        }, 10);
        this.piano.glowPiano.setKeySemiActive(midiCode, true);
      } else {
        this.piano.glowPiano.setKeySemiActive(midiCode, false);
      }

      this.piano.glowPiano.playNote(midiCode, visualDuration, suppressDisplay, {
        sequenceIndex: index,
      });
      if (span && !suppressDisplay) {
        span.style.visibility = 'visible';
        span.classList.add('pulse');
        setTimeout(() => span.classList.remove('pulse'), 500);
      } else if (span && suppressDisplay) {
        span.style.visibility = 'visible';
      }
      setTimeout(() => playNoteWithDelay(index + 1), visualDuration + 50);
    };

    window.instruments.stopAllNotes();
    playNoteWithDelay(0);
  }

  handleNoteEvent(midi, eventType, customData) {
    if (eventType === 'start') window.instruments.noteOn(midi);
    else if (eventType === 'stop') window.instruments.noteOff(midi);

    if (customData?.sequenceIndex !== undefined) return;
    if (this.state === this.States.PLAYING) return;
    if (
      this.state !== this.States.GUESSING &&
      !(
        this.state === this.States.FEEDBACK &&
        !this.gameBox.getPromptDiv().classList.contains('correct')
      )
    )
      return;

    if (eventType === 'start') {
      const sequenceIndex = this.currentSequence.indexOf(midi);
      if (sequenceIndex !== -1 && sequenceIndex < 2) {
        const span = this.gameBox.getNoteSpans()[sequenceIndex];
        span.classList.add('pulse');
        setTimeout(() => span.classList.remove('pulse'), 500);
        return;
      }

      this.state = this.States.FEEDBACK;
      const isCorrect = midi === this.currentSequence[2];
      this.scoreBox.recordGuess(isCorrect);
      this.displayFeedback(midi, isCorrect);
    }
  }

  displayFeedback(guessedMidi, isCorrect) {
    const guessedNote = GameBox.midiToNote(guessedMidi);
    const [baseNote, modifier] = PianoUtils.parseNote(guessedNote);
    const displayNote = modifier
      ? `${baseNote.toLowerCase()}♯`
      : baseNote.toLowerCase();
    const promptDiv = this.gameBox.getPromptDiv();
    promptDiv.classList.remove('pulse-green', 'pulse-red');

    if (isCorrect) {
      promptDiv.classList.add('pulse-green');
      this.gameBox.updateNoteDisplay(2, guessedMidi, true);
      const thirdSpan = this.gameBox.getNoteSpans()[2];
      thirdSpan.style.visibility = 'visible';
      thirdSpan.classList.add('pulse');
      setTimeout(() => thirdSpan.classList.remove('pulse'), 500);
      this.gameBox.setFeedbackText('good job!');
      promptDiv.classList.add('correct');
      this.gameBox.getPlayAgainButton().style.visibility = 'hidden';

      const number3 = document.createElement('div');
      number3.textContent = '3';
      number3.dataset.midi = `${guessedMidi}`;
      const keyInfo = this.piano.graphicPiano.getKeyByMidi(guessedMidi);
      const isBlack = keyInfo?.bbox.isBlack ?? false;
      number3.style.color = isBlack ? 'white' : 'black';
      number3.style.fontSize = '48px';
      number3.style.textShadow = isBlack
        ? '2px 2px 0 black'
        : '-2px -2px 0 white';
      number3.style.display = 'none';
      this.piano.addOverlayElement(guessedMidi, number3, { bottomOffset: 5 });
      this.overlays.push(number3);

      setTimeout(() => {
        number3.style.display = 'block';
        number3.classList.add('pulse-overlay');
        setTimeout(() => {
          if (number3.parentNode) number3.classList.remove('pulse-overlay');
        }, 500);
      }, 10);
      this.piano.glowPiano.setKeySemiActive(guessedMidi, true);

      setTimeout(() => {
        promptDiv.classList.remove('pulse-green', 'correct');
        this.state = this.States.IDLE;
        this.overlays.forEach((overlay) =>
          this.piano.removeOverlayElement(overlay)
        );
        this.overlays = [];
        this.currentSequence.forEach((midi) => {
          if (midi) this.piano.glowPiano.setKeySemiActive(midi, false);
        });

        if (Math.random() < 0.8) {
          const fullStartMidi = this.piano.settings.fullStartMidi;
          const maxStartMidi = this.piano.settings.fullEndMidi - 11;
          const newStartMidi =
            Math.floor(Math.random() * (maxStartMidi - fullStartMidi + 1)) +
            fullStartMidi;
          this.piano.setGameRange(newStartMidi, newStartMidi + 11);
        }
        setTimeout(() => this.startNewRound(), this.newRoundDelay);
      }, this.correctFeedbackDelay);
    } else {
      promptDiv.classList.add('pulse-red');
      this.gameBox.setFeedbackText(`${displayNote} is incorrect`);
      promptDiv.classList.add('incorrect');
      this.gameBox.getPlayAgainButton().style.visibility = 'visible';

      const noSymbolSVG = makeElement(
        'svg:svg',
        { width: 50, height: 50, viewBox: '0 0 100 100' },
        [
          makeElement('svg:circle', {
            cx: 50,
            cy: 50,
            r: 40,
            fill: 'none',
            stroke: '#ff6666',
            'stroke-width': 15,
          }),
          makeElement('svg:line', {
            x1: 20,
            y1: 80,
            x2: 80,
            y2: 20,
            stroke: '#ff6666',
            'stroke-width': 15,
          }),
        ]
      );
      noSymbolSVG.style.display = 'none';
      this.piano.addOverlayElement(guessedMidi, noSymbolSVG, {
        bottomOffset: 5,
      });
      this.overlays.push(noSymbolSVG);
      setTimeout(() => (noSymbolSVG.style.display = 'block'), 10);

      setTimeout(() => {
        this.piano.removeOverlayElement(noSymbolSVG);
        this.overlays = this.overlays.filter((o) => o !== noSymbolSVG);
        if (this.state === this.States.FEEDBACK) {
          promptDiv.classList.remove('pulse-red', 'incorrect');
          this.gameBox.setFeedbackText('guess the third note');
          this.state = this.States.GUESSING;
          this.updateUI();
        }
      }, 1000);
    }
  }

  setGameRange(startMidi, endMidi) {
    this.piano.setGameRange(startMidi, endMidi);
  }

  resizePiano(widthPercent, heightPercent) {
    if (!this.pianoDivElement) return;
    this.pianoDivElement.setPercentDimensions(
      0,
      40,
      widthPercent,
      heightPercent
    );
    const dims = this.pianoDivElement.getPixelDimensions();
    this.piano.setPianoSize(dims.width, dims.height);
  }

  createSecretButton() {
      const secretButton = makeElement('div', {
        title: 'Cycle Piano Render Mode',
        style: {
          position: 'absolute', // MUST BE ABSOLUTE
          top: '1vh',
          right: '1vw',
          width: '2vw',
          height: '2vw',
          zIndex: '1001',
          cursor: 'pointer',
          opacity: '0.05',
          transition: 'opacity 0.2s ease-in-out',
        },
      });

      secretButton.addEventListener('mouseenter', () => (secretButton.style.opacity = '0.2'));
      secretButton.addEventListener('mouseleave', () => (secretButton.style.opacity = '0.05'));

      secretButton.addEventListener('click', () => {
        this.currentModeIndex = (this.currentModeIndex + 1) % this.pianoRenderModes.length;
        const newMode = this.pianoRenderModes[this.currentModeIndex];
        if (this.piano && this.piano.graphicPiano) {
          this.piano.graphicPiano.setGeometryMode(newMode);
        }
      });

      this.rootElement.appendChild(secretButton); // MUST APPEND TO CONTAINER
    }

  async run(env) {
      if (this.rootElement) this.destroy();
      this.env = env;
      this.rootElement = env.container;

      if (this.rootElement === document.body) {
        document.documentElement.style.height = '100%';
        document.documentElement.style.margin = '0';
        document.body.style.height = '100%';
        document.body.style.margin = '0';
      }

      this.rootElement.classList.add('guess-the-note-wrapper');
      this.injectStyles();

      this.pianoSettings = {};
      this.instruments = new InstrumentSounds();
      window.instruments = this.instruments;

      this.States = {
        IDLE: 'IDLE',
        PLAYING: 'PLAYING',
        GUESSING: 'GUESSING',
        FEEDBACK: 'FEEDBACK',
      };
      this.state = this.States.IDLE;
      this.currentSequence = [];
      this.overlays = [];
      this.startDelay = 1000;
      this.correctFeedbackDelay = 3000;
      this.newRoundDelay = 700;

      this.pianoRenderModes = ['fractions', 'midpoints', 'twelfths'];
      this.currentModeIndex = 0;

      this.start();

      // Add ResizeObserver to force UI layout updates when the IDE tab resizes or mounts!
      this.resizeObserver = new ResizeObserver(() => {
        if (this.scoreBox && this.scoreBox.positioner) this.scoreBox.positioner.update();
        if (this.gameBox && this.gameBox.positioner) this.gameBox.positioner.update();
        if (this.pianoPositioner) this.pianoPositioner.update();
        if (this.instrumentSelector && this.instrumentSelector.positioner) {
           this.instrumentSelector.positioner.update();
           this.instrumentSelector.popupPositioner.update();
        }
        if (this.keySelector && this.keySelector.buttonPositioner) {
           this.keySelector.buttonPositioner.update();
           this.keySelector.popupPositioner.update();
        }
      });
      this.resizeObserver.observe(this.rootElement);
    }

  destroy() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this.rootElement) {
        this.rootElement.innerHTML = '';
      }
      if (window.instruments) {
        window.instruments.stopAllNotes();
      }
    }

  injectStyles() {
      // <-- FIXED: Added @import for the font so it renders correctly in the tab
      // <-- FIXED: Removed `transform: translateX(-50%)` from `.piano-svg` to stop fighting with JS left offsets
      applyCss(`
        @import url('https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap');
        
        .guess-the-note-wrapper {
          background-color: #a0a0a0;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
          transition: background-color 0.5s ease-in-out;
        }
        .guess-the-note-wrapper svg.piano-svg {
          display: block;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0; 
        }
        .guess-the-note-wrapper .prompt-div {
          text-align: center;
          padding: 1vh;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          z-index: 10;
          border-radius: 12px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: 'Architects Daughter', Arial, sans-serif !important;
        }
        .guess-the-note-wrapper .prompt-div * {
          font-family: 'Architects Daughter', Arial, sans-serif !important;
        }
        .guess-the-note-wrapper .white-key, .guess-the-note-wrapper .black-key {
          transition: fill 0.2s ease, stroke 0.2s ease;
          pointer-events: all;
        }
        .guess-the-note-wrapper .white-key-base, .guess-the-note-wrapper .black-key-left-rect, .guess-the-note-wrapper .black-key-right-rect {
          pointer-events: all;
        }
        .guess-the-note-wrapper .pulse { animation: pulse 0.5s ease-out; }
        @keyframes pulse { 0% { transform: scale(1); } 20% { transform: scale(1.6); } 100% { transform: scale(1); } }
        .guess-the-note-wrapper .feedbackText { margin: 0.5vh; font-size: 24px; color: #fff; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); }
        .guess-the-note-wrapper .noteDisplay { display: flex; justify-content: center; gap: 20px; margin: 0.5vh; }
        .guess-the-note-wrapper .noteDisplay span { width: 100px; text-align: center; visibility: hidden; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); display: inline-block; white-space: nowrap; }
        .guess-the-note-wrapper #startButton, .guess-the-note-wrapper #playAgainButton {
          height: 40px; min-width: 120px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.1); border: 1px solid #000; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); color: #fff; font-size: 18px; cursor: pointer; transition: background 0.2s;
        }
        .guess-the-note-wrapper #startButton:hover, .guess-the-note-wrapper #playAgainButton:hover { background: rgba(255, 255, 255, 0.2); }
        .guess-the-note-wrapper .instrument-display { width: 100%; height: 100%; background-image: url('https://recursi.dev/resources/instruments.png'); background-size: 300% 300%; background-position: 0 0; transition: transform 0.2s ease; }
        .guess-the-note-wrapper .instrument-display:hover { transform: scale(1.1); }
        .guess-the-note-wrapper .instrument-popup { background-color: rgba(0, 0, 0, 0.95); border: 4px solid black; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); z-index: 100; display: none; }
        @keyframes pulseHighlight { 0% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 0.5; } }
        @keyframes pulseGreenPrompt { 0% { background-color: rgba(0, 0, 0, 0.7); } 6% { background-color: rgba(33, 190, 33, 0.9); } 100% { background-color: rgba(0, 0, 0, 0.7); } }
        @keyframes pulseRedPrompt { 0% { background-color: rgba(0, 0, 0, 0.7); } 20% { background-color: rgba(150, 33, 33, 0.9); } 100% { background-color: rgba(0, 0, 0, 0.7); } }
        .guess-the-note-wrapper .game-box.pulse-green { animation: pulseGreenPrompt 2.8s ease-out 1 !important; }
        .guess-the-note-wrapper .game-box.pulse-red { animation: pulseRedPrompt 0.8s ease-out 1 !important; }
        @keyframes pulseOverlay { 0% { transform: scale(1) translateX(-50%); opacity: 1; } 50% { transform: scale(1.6) translateX(-50%); opacity: 0.8; } 100% { transform: scale(1) translateX(-50%); opacity: 1; } }
        .guess-the-note-wrapper .pulse-overlay { animation: pulseOverlay 0.5s ease-out; transform-origin: center center; }
      `, 'guess-the-note-styles');
    }

}