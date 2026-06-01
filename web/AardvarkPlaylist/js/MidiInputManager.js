class MidiInputManager {
  constructor(player) {
    this.player = player;
    this.midiAccess = null;
    this._activeMidiNotes = {};
  }

  setupMidi(forcePrompt = false) {
    if (!forcePrompt && !this.player.state.settings.midiEnabled) return;

    // Explicit opt-in activated, persist the choice
    if (forcePrompt) {
      this.player.state.settings.midiEnabled = true;
      if (this.player._saveSettings) this.player._saveSettings();
    }

    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        (midiAccess) => {
          this.midiAccess = midiAccess;
          for (let input of midiAccess.inputs.values()) {
            input.onmidimessage = this.onMidiMessage.bind(this);
          }
          midiAccess.onstatechange = (e) => {
            if (e.port.type === 'input') {
              e.port.onmidimessage = this.onMidiMessage.bind(this);
            }
          };
        },
        () => console.warn('MIDI not supported or denied')
      );
    }
  }

  onMidiMessage(message) {
    if (!this.player.gt || !this.player.gt.instruments) return;
    const [command, note, velocity] = message.data;
    const type = command & 0xf0;

    let logicalNote = note;
    if (
      this.player.gt.pianoVisuals &&
      this.player.gt.pianoVisuals.geometrySettings &&
      this.player.gt.pianoVisuals.geometrySettings.leftHanded
    ) {
      logicalNote = 124 - note;
    }

    if (!this._activeMidiNotes) this._activeMidiNotes = {};

    if (type === 144 && velocity > 0) {
      let trackId = 0;
      const veq = window.VideoEventQueueClass?.current;

      const isSplit =
        veq &&
        veq.timedEvents &&
        veq.timedEvents.some((e) => e.type === 'note' && e.tr === 1);

      if (isSplit) {
        const splitMethod = this.player.state.settings.splitMethod || 'pitch';
        if (splitMethod === 'pitch') {
          const splitPitch = this.player.state.settings.splitPitch || 60;
          if (logicalNote < splitPitch) trackId = 1;
        } else {
          if (logicalNote < 60) trackId = 1;
        }
      }

      // Log the state at the moment of keypress for diagnosis
      if (window.midiDiagnostics) {
        const inst = this.player.gt.instruments;
        const track = inst.tracks[trackId];
        const expectedFinalMidi =
          logicalNote + inst.globalTranspose + (track?.octaveShift || 0) * 12;
        window.midiDiagnostics.logSetting(
          'MIDI keypress',
          `note=${logicalNote} gTr=${inst.globalTranspose} octShift=${
            track?.octaveShift || 0
          } → final=${expectedFinalMidi} offset=${
            this.player.gt.transposeOffset
          }`
        );
      }

      let handle = null;
      try {
        handle = this.player.gt.instruments.noteOn(
          logicalNote,
          velocity,
          trackId,
          {
            source: 'U',
          }
        );
      } catch (e) {
        console.error('MIDI noteOn Error:', e);
      }

      this._activeMidiNotes[logicalNote] = { handle, trackId };

      if (this.player.gt.pianoVisuals) {
        try {
          this.player.gt.pianoVisuals.toggleNoteDisplay(logicalNote, true);
        } catch (e) {
          console.error('Visual Toggle Error (On):', e);
        }
      }
    } else if (type === 128 || (type === 144 && velocity === 0)) {
      const noteInfo = this._activeMidiNotes[logicalNote];
      if (noteInfo) {
        try {
          this.player.gt.instruments.noteOff(
            logicalNote,
            noteInfo.trackId,
            noteInfo.handle
          );
        } catch (e) {
          console.error('MIDI noteOff Error:', e);
        }
        delete this._activeMidiNotes[logicalNote];
      }

      if (this.player.gt.pianoVisuals) {
        try {
          this.player.gt.pianoVisuals.toggleNoteDisplay(logicalNote, false);
        } catch (e) {
          console.error('Visual Toggle Error (Off):', e);
        }
      }
    }
  }

}

