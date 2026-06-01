class KeySignatureSelector {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.keys = [
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
      'Any',
    ];
    this.keySignatureRoots = {
      C: 0,
      'C#': 1,
      D: 2,
      'D#': 3,
      E: 4,
      F: 5,
      'F#': 6,
      G: 7,
      'G#': 8,
      A: 9,
      'A#': 10,
      B: 11,
      Any: null,
    };
    this.selectedKey = 'Any';
    this.isPopupVisible = false;
  }

  mixWithWhite(rgb, factor = 0.5) {
    return rgb.map((value) => Math.round(value + (255 - value) * factor));
  }

  start() {
      this.toggleButton = makeElement('div', {
        innerHTML: `<span style="font-size: 0.8em;">key:</span>\n${this.selectedKey}`,
        style: {
          position: 'absolute', // MUST BE ABSOLUTE
          background: this.getKeyColor('Any'), color: 'white', borderRadius: '8px', padding: '2px', fontFamily: '"Architects Daughter", Arial, sans-serif',
          cursor: 'pointer', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)', zIndex: '10', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden', boxSizing: 'border-box',
          whiteSpace: 'pre', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)', transition: 'opacity 0.2s ease, background 0.2s ease', lineHeight: '1.1',
        },
      });
      this.game.rootElement.appendChild(this.toggleButton);

      this.buttonPositioner = new SmartElementPositioner(this.toggleButton, {
        container: this.game.rootElement, // BIND TO SANDBOX
        position: [15, 80], size: [22, 22], aspectRatio: 1,
        sizeCallback: (self, pixelDims) => {
          const baseFontSize = Math.max(14, Math.min(24, pixelDims.height * 0.35));
          self.element.style.fontSize = `${baseFontSize}px`;
          const keySpan = self.element.querySelector('span');
          if (keySpan) keySpan.style.fontSize = `${baseFontSize * 0.8}px`;
        },
      });

      this.toggleButton.addEventListener('click', () => this.togglePopup());

      this.overlay = makeElement('div', {
        style: { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0)', zIndex: '99', opacity: '0', transition: 'opacity 0.4s ease', pointerEvents: 'none' },
      });
      this.game.rootElement.appendChild(this.overlay);

      this.popup = makeElement('div', {
        style: {
          position: 'absolute', // MUST BE ABSOLUTE
          background: 'rgba(0, 0, 0, 0.9)', borderRadius: '12px', padding: '15px', display: 'none', flexWrap: 'wrap',
          justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)', zIndex: '100', overflowY: 'auto',
          transform: 'translateY(100%)', opacity: '0', transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
        },
      });
      this.game.rootElement.appendChild(this.popup);

      this.popupPositioner = new SmartElementPositioner(this.popup, {
        container: this.game.rootElement, // BIND TO SANDBOX
        position: [15, 30], size: [70, 40], aspectRatio: null,
        sizeCallback: (self, pixelDims) => {
          const viewportHeight = this.game.rootElement.clientHeight;
          const viewportWidth = this.game.rootElement.clientWidth;
          const maxHeightPercent = ((viewportHeight * 0.8) / viewportHeight) * 100;
          let widthPercent = viewportWidth < 600 ? 70 : 50;
          let heightPercent = 40;
          let topPercent = 30;
          const pixelHeight = pixelDims.height;
          if (pixelHeight > viewportHeight * 0.8) {
            heightPercent = maxHeightPercent;
            topPercent = (100 - heightPercent) / 2;
          }
          self.element.style.width = `${(viewportWidth * widthPercent) / 100}px`;
          self.element.style.height = `${pixelHeight > viewportHeight * 0.8 ? viewportHeight * 0.8 : pixelHeight}px`;
          self.element.style.left = `${15}%`;
          self.element.style.top = `${topPercent}%`;
        },
      });

      this.keyButtons = {};
      this.keys.forEach((key) => {
        const btn = makeElement('div', {
          textContent: key,
          style: { width: '50px', height: '50px', background: this.getKeyColor(key), color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px', cursor: 'pointer', fontFamily: '"Architects Daughter", Arial, sans-serif', fontSize: '18px', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)', transition: 'transform 0.2s, opacity 0.4s ease' },
        });
        btn.addEventListener('mouseover', () => (btn.style.transform = 'scale(1.1)'));
        btn.addEventListener('mouseout', () => (btn.style.transform = 'scale(1)'));
        btn.addEventListener('click', () => this.selectKey(key));
        this.popup.appendChild(btn);
        this.keyButtons[key] = btn;
      });

      this.buttonPositioner.update();
      this.popupPositioner.update();
    }

  getKeyColor(key) {
    if (key === 'Any') return '#666';
    const midiOffset = this.keySignatureRoots[key];
    const midi = 60 + midiOffset;
    const isSharp = key.includes('#');
    if (!isSharp) {
      const color = PianoUtils.getNoteColor(midi);
      const pastel = this.mixWithWhite(color, 0.5);
      return PianoUtils.rgbToHex(pastel);
    } else {
      const { leftColor, rightColor } = PianoUtils.getBlackKeyColors(midi);
      const leftPastel = this.mixWithWhite(leftColor, 0.5);
      const rightPastel = this.mixWithWhite(rightColor, 0.5);
      const leftHex = PianoUtils.rgbToHex(leftPastel);
      const rightHex = PianoUtils.rgbToHex(rightPastel);
      return `linear-gradient(to right, ${leftHex} 48%, ${rightHex} 52%)`;
    }
  }

  togglePopup() {
    if (this.isPopupVisible) {
      this.hidePopup();
    } else {
      this.isPopupVisible = true;
      this.overlay.style.opacity = '0.7';
      this.overlay.style.pointerEvents = 'auto';
      this.popup.style.display = 'flex';
      this.popupPositioner.update();
      requestAnimationFrame(() => {
        this.popup.style.transform = 'translateY(0)';
        this.popup.style.opacity = '1';
      });
    }
  }

  selectKey(key, apply = true) {
      this.selectedKey = key;
      const selectedBtn = this.keyButtons[key];
      const others = Object.values(this.keyButtons).filter((btn) => btn !== selectedBtn);
      others.forEach((btn) => (btn.style.opacity = '0'));

      const buttonRect = this.toggleButton.getBoundingClientRect();
      const btnRect = selectedBtn.getBoundingClientRect();
      const rootRect = this.game.rootElement.getBoundingClientRect();

      const flyStartX = btnRect.left - rootRect.left;
      const flyStartY = btnRect.top - rootRect.top;
      const flyEndX = (buttonRect.left - rootRect.left) + buttonRect.width / 2 - btnRect.width / 2;
      const flyEndY = (buttonRect.top - rootRect.top) + buttonRect.height / 2 - btnRect.height / 2;

      const flyback = makeElement('div', {
        textContent: key,
        style: {
          position: 'absolute', left: `${flyStartX}px`, top: `${flyStartY}px`, width: '50px', height: '50px',
          background: this.getKeyColor(key), color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Architects Daughter", Arial, sans-serif', fontSize: '18px', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)', zIndex: '101', transition: 'all 0.5s ease-in',
        },
      });
      this.game.rootElement.appendChild(flyback);

      requestAnimationFrame(() => {
        flyback.style.transform = `translate(${flyEndX - flyStartX}px, ${flyEndY - flyStartY}px) scale(0.8)`;
      });

      setTimeout(() => {
        this.toggleButton.innerHTML = `<span style="font-size: 0.8em;">key:</span>\n${key}`;
        this.toggleButton.style.background = this.getKeyColor(key);
        this.hidePopup();
        flyback.remove();
        others.forEach((btn) => (btn.style.opacity = '1'));
      }, 500);

      if (apply) this.applyKeySignature();
    }

  hidePopup() {
    this.isPopupVisible = false;
    this.popup.style.transform = 'translateY(10%)';
    this.popup.style.opacity = '0';
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      this.popup.style.display = 'none';
      this.popup.style.transform = 'translateY(100%)';
    }, 400);
  }

  applyKeySignature() {
    const rootOffset = this.keySignatureRoots[this.selectedKey];
    if (this.selectedKey === 'Any') {
      this.game.setGameRange(60, 71);
      const fullStartMidi = this.game.piano.settings.fullStartMidi;
      const fullEndMidi = this.game.piano.settings.fullEndMidi;
      for (let midi = fullStartMidi; midi <= fullEndMidi; midi++) {
        this.game.piano.glowPiano.setKeyInactive(midi, false);
        this.game.piano.glowPiano.setKeySemiActive(midi, false);
      }
      if (this.game.state !== this.game.States.IDLE) this.game.stopRound();
    } else {
      let rootMidi = 60 + rootOffset;
      if (rootMidi > 64) rootMidi -= 12;
      const startMidi = rootMidi;
      const endMidi = rootMidi + 11;
      this.game.setGameRange(startMidi, endMidi);
      this.game.stopRound();
      this.playAndHighlightScale(rootMidi);
    }
  }

  playAndHighlightScale(rootMidi) {
    const scaleIntervals = [0, 2, 4, 5, 7, 9, 11, 12];
    const scaleNotes = scaleIntervals.map((interval) => rootMidi + interval);
    const fullStartMidi = this.game.piano.settings.fullStartMidi;
    const fullEndMidi = this.game.piano.settings.fullEndMidi;
    const allScaleNotesHighlight = new Set();
    const majorScaleIntervalsOnly = [0, 2, 4, 5, 7, 9, 11];
    for (let midi = fullStartMidi; midi <= fullEndMidi; midi++) {
      const interval = (midi - rootMidi + 1200) % 12;
      if (majorScaleIntervalsOnly.includes(interval)) {
        allScaleNotesHighlight.add(midi);
      }
    }
    for (let midi = fullStartMidi; midi <= fullEndMidi; midi++) {
      this.game.piano.glowPiano.setKeyInactive(midi, true);
      this.game.piano.glowPiano.setKeySemiActive(midi, false);
    }
    allScaleNotesHighlight.forEach((midi) => {
      this.game.piano.glowPiano.setKeyInactive(midi, false);
    });
    const pianoContainer = this.game.piano.getContainer();
    const parentContainer = pianoContainer.parentElement;
    if (!parentContainer) return;
    const containerWidth = parentContainer.offsetWidth;
    const svgWidth = parseFloat(pianoContainer.style.width);
    const rootKeyGraphic = this.game.piano.graphicPiano.getKeyByMidi(rootMidi);
    if (!rootKeyGraphic || !rootKeyGraphic.bbox) return;
    const rootKeyLeftEdge = rootKeyGraphic.bbox.position[0];
    const desiredPadding = 10;
    let leftOffset = -(rootKeyLeftEdge - desiredPadding);
    leftOffset = Math.min(0, leftOffset);
    leftOffset = Math.max(-(svgWidth - containerWidth), leftOffset);
    pianoContainer.style.transition = 'left 0.5s ease';
    pianoContainer.style.left = `${leftOffset}px`;
    let index = 0;
    const playNext = () => {
      if (index < scaleNotes.length) {
        const midi = scaleNotes[index];
        if (
          midi >= this.game.piano.settings.fullStartMidi &&
          midi <= this.game.piano.settings.fullEndMidi
        ) {
          this.game.piano.glowPiano.playNote(midi, 400, false, {
            sequenceIndex: -1,
          });
        }
        index++;
        if (index < scaleNotes.length) {
          setTimeout(playNext, 333);
        } else {
          setTimeout(() => {
            pianoContainer.style.transition = 'left 0.3s ease';
          }, 500);
        }
      }
    };
    window.instruments.ensureAudioReady().then(() => {
      window.instruments.stopAllNotes();
      playNext();
    });
  }

  getAvailableNotes() {
    const { startMidi, endMidi } = this.game.piano.gameRange;
    if (this.selectedKey === 'Any') {
      return Array.from(
        { length: endMidi - startMidi + 1 },
        (_, i) => startMidi + i
      );
    }
    const rootNoteInOctave4 = 60 + this.keySignatureRoots[this.selectedKey];
    const scaleIntervals = [0, 2, 4, 5, 7, 9, 11];
    const notesInScale = new Set();
    for (let octaveOffset = -2; octaveOffset <= 2; octaveOffset++) {
      scaleIntervals.forEach((interval) => {
        const currentNote = rootNoteInOctave4 + interval + octaveOffset * 12;
        if (currentNote >= startMidi && currentNote <= endMidi) {
          notesInScale.add(currentNote);
        }
      });
    }
    const availableNotes = Array.from(notesInScale).sort((a, b) => a - b);
    if (availableNotes.length === 0) {
      return Array.from(
        { length: endMidi - startMidi + 1 },
        (_, i) => startMidi + i
      );
    }
    return availableNotes;
  }

  getButtonPositioner() {
    return this.buttonPositioner;
  }

}

