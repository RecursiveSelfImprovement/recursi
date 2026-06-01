class PianoSamplePlayer {
    constructor(audioContext, soundBankData, loadCallback) {
      this.ctx = audioContext;
      this.soundBankData = soundBankData;
      this.loadCallback = loadCallback;
      this.noteNames = this.soundBankData ? Object.keys(this.soundBankData) : [];
      this.audioBuffers = {}; 
      this.sources = {};
      this.masterVolume = 1.0;
      this._loadError = null;

      if (!this.soundBankData || this.noteNames.length === 0) {
        console.error('PianoSamplePlayer: No soundfont data provided.');
        if (this.loadCallback) setTimeout(() => this.loadCallback(new Error('No data')), 0);
        return;
      }

      this._decodeSamples();
    }

    _guessMidi(key, index) {
      if (/^\d+$/.test(key)) return parseInt(key, 10);
      const notes = {
        C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
        G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
      };
      const match = key.match(/^([A-G][#b]?)(-?\d+)$/i);
      if (match) return (parseInt(match[2], 10) + 1) * 12 + notes[match[1]];
      return index + 21;
    }

    async _decodeSamples() {
      let successCount = 0;
      let failCount = 0;

      const decodeOne = (buffer) => {
        return new Promise((resolve, reject) => {
          let settled = false;
          try {
            const p = this.ctx.decodeAudioData(
              buffer,
              (decoded) => { if (settled) return; settled = true; resolve(decoded); },
              (err) => { if (settled) return; settled = true; reject(err || new Error('decodeAudioData failed')); }
            );
            if (p && typeof p.then === 'function') {
              p.then(
                (decoded) => { if (settled) return; settled = true; resolve(decoded); },
                (err) => { if (settled) return; settled = true; reject(err || new Error('decodeAudioData failed')); }
              );
            }
          } catch (e) {
            if (!settled) { settled = true; reject(e); }
          }
        });
      };

      // Native Base64 decoder to replace the missing audioUtils.js dependency
      const decodeBase64 = (base64) => {
        const bin = atob(base64);
        const len = bin.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
      };

      for (let i = 0; i < this.noteNames.length; i++) {
        const noteName = this.noteNames[i];
        const midiNote = this._guessMidi(noteName, i);

        try {
          let base64Data = this.soundBankData[noteName];
          if (base64Data.includes(',')) base64Data = base64Data.split(',')[1];
          const buffer = decodeBase64(base64Data);
          const bufferCopy = buffer.slice(0);
          const decodedBuffer = await decodeOne(bufferCopy);
          this.audioBuffers[midiNote] = decodedBuffer;
          successCount++;
        } catch (e) {
          failCount++;
          if (!this._loadError) this._loadError = e;
        }
      }
      
      if (this.loadCallback) {
        this.loadCallback(failCount === this.noteNames.length ? this._loadError : null);
      }
    }

    noteOn(midiNote, velocity = 80, delay = 0, trackVolMult = 1.0) {
      let buffer = this.audioBuffers[midiNote];
      let sourceMidi = midiNote;

      if (!buffer) {
        const available = Object.keys(this.audioBuffers).map(Number);
        if (available.length === 0) return null;

        let nearest = available[0];
        let bestDist = Math.abs(nearest - midiNote);
        for (let i = 1; i < available.length; i++) {
          const d = Math.abs(available[i] - midiNote);
          if (d < bestDist) {
            bestDist = d;
            nearest = available[i];
          }
        }
        buffer = this.audioBuffers[nearest];
        sourceMidi = nearest;
      }

      if (!buffer) return null;

      if (this.sources[midiNote]) {
        try { this.sources[midiNote].stop(); } catch (e) {}
        this.sources[midiNote] = null;
      }

      const sourceNode = this.ctx.createBufferSource();
      const filterNode = this.ctx.createBiquadFilter();
      const gainNode = this.ctx.createGain();

      sourceNode.buffer = buffer;

      const semitoneDelta = midiNote - sourceMidi;
      if (semitoneDelta !== 0) {
        sourceNode.playbackRate.value = Math.pow(2, semitoneDelta / 12);
      }

      const velNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
      
      // Dynamic low-pass mapping
      const minCutoff = 800;
      const maxCutoff = 12000;
      const cutoff = minCutoff + (maxCutoff - minCutoff) * (velNorm * velNorm);
      filterNode.type = "lowpass";
      filterNode.frequency.value = cutoff;
      filterNode.Q.value = 0.7;

      const vol = Math.max(0.001, velNorm * this.masterVolume * trackVolMult);
      gainNode.gain.value = vol;

      sourceNode.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      sourceNode._gainNode = gainNode;
      this.sources[midiNote] = sourceNode;

      sourceNode.start(this.ctx.currentTime + Math.max(0, delay));

      sourceNode.onended = () => {
        if (this.sources[midiNote] === sourceNode) this.sources[midiNote] = null;
      };

      return sourceNode;
    }

    noteOff(midiNote, delay = 0, specificNode = null) {
      const sourceNode = specificNode || this.sources[midiNote];
      if (sourceNode && sourceNode._gainNode) {
        const gain = sourceNode._gainNode.gain;
        const stopTime = this.ctx.currentTime + Math.max(0, delay);

        try {
          gain.cancelScheduledValues(stopTime);
          // Smooth, longer decay time constant of 0.35s
          gain.setTargetAtTime(0, stopTime, 0.35);
          // Let the source node stop after the fade has fully completed
          sourceNode.stop(stopTime + 1.8);
        } catch (e) {}

        if (!specificNode || this.sources[midiNote] === specificNode) {
          this.sources[midiNote] = null;
        }
      }
    }

    offAllNotes() {
      Object.keys(this.sources).forEach((note) => {
        if (this.sources[note]) this.noteOff(parseInt(note, 10));
      });
    }

    setMasterVolume(volume) {
      this.masterVolume = Math.max(0, volume);
    }

  
}