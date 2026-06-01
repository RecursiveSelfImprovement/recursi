class WafPlayer {
    constructor(audioContext) {
      this.audioContext = audioContext;
      this.loader = new WafLoader(this);
      this.activePresets = {};
      this.masterVolume = 1.0;
      this.afterTime = 0.4;
      this.nearZero = 0.00001;
      this.outputNode = audioContext.createGain();
      this.outputNode.connect(audioContext.destination);
      this.setMasterVolume(this.masterVolume);
    }

    async _cachePreset(instrumentName, presetData) {
      if (presetData && presetData.zones) {
        try {
          await this.adjustPreset(this.audioContext, presetData);
          this.activePresets[instrumentName] = presetData;
        } catch (e) {
          this.activePresets[instrumentName] = null;
        }
      } else {
        this.activePresets[instrumentName] = null;
      }
    }

    async adjustPreset(audioContext, preset) {
      if (!preset || !Array.isArray(preset.zones)) throw new Error('Invalid preset');
      const promises = preset.zones.map((zone) => this.adjustZone(audioContext, zone));
      await Promise.all(promises);
    }

    adjustZone(audioContext, zone) {
      return new Promise((resolve, reject) => {
        if (!zone || zone.buffer) return resolve();

        const finalizeZone = () => {
          zone.delay = this._numValue(zone.delay, 0);
          zone.loopStart = this._numValue(zone.loopStart, 0);
          zone.loopEnd = this._numValue(zone.loopEnd, 0);
          zone.coarseTune = this._numValue(zone.coarseTune, 0);
          zone.fineTune = this._numValue(zone.fineTune, 0);
          zone.originalPitch = this._numValue(zone.originalPitch, 6000);
          zone.sampleRate = this._numValue(zone.sampleRate, 44100);
          zone.sustain = this._numValue(zone.sustain, 0);
          if (!zone.ahdsr) zone.ahdsr = [{ duration: 0, volume: 1 }, { duration: 1, volume: 1 }];
        };

        const decodeBase64 = (base64) => {
          const bin = atob(base64);
          const len = bin.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
          return bytes.buffer;
        };

        if (zone.sample) {
          try {
            const decoded = atob(zone.sample);
            const len = decoded.length / 2;
            const sampleRate = this._numValue(zone.sampleRate, 44100);
            const audioBuffer = audioContext.createBuffer(1, len, sampleRate);
            const float32Array = audioBuffer.getChannelData(0);
            for (let i = 0; i < len; i++) {
              let n = decoded.charCodeAt(i * 2) | (decoded.charCodeAt(i * 2 + 1) << 8);
              if (n >= 32768) n -= 65536;
              float32Array[i] = n / 32768.0;
            }
            zone.buffer = audioBuffer;
            zone.sampleRate = sampleRate;
            finalizeZone();
            resolve();
          } catch (e) { reject(e); }
        } else if (zone.file) {
          try {
            let base64Data = zone.file;
            if (base64Data.includes(',')) base64Data = base64Data.split(',')[1];
            const arraybuffer = decodeBase64(base64Data);
            if (!arraybuffer || arraybuffer.byteLength < 10) throw new Error('Empty buffer');
            audioContext.decodeAudioData(arraybuffer)
              .then((audioBuffer) => {
                zone.buffer = audioBuffer;
                zone.sampleRate = this._numValue(zone.sampleRate, audioBuffer.sampleRate || 44100);
                finalizeZone();
                resolve();
              }).catch(reject);
          } catch (e) { reject(e); }
        } else {
          zone.buffer = null;
          finalizeZone();
          resolve();
        }
      });
    }

    _numValue = (v, d) => (typeof v === 'number' ? v : d);
    _noZero = (n) => Math.max(this.nearZero, n);

    _findZone(preset, pitch) {
      for (let i = preset.zones.length - 1; i >= 0; i--) {
        const z = preset.zones[i];
        if (z.keyRangeLow <= pitch && z.keyRangeHigh >= pitch) {
          if (z.buffer) return z;
        }
      }
      return null;
    }

    playNote(instrumentName, pitch, velocity = 80, trackVolMult = 1.0) {
      const preset = this.activePresets[instrumentName];
      if (!preset) return null;
      const zone = this._findZone(preset, pitch);
      if (!zone) return null;

      const envelope = this.audioContext.createGain();
      envelope.connect(this.outputNode);
      envelope.gain.value = this.nearZero;

      const source = this.audioContext.createBufferSource();
      source.buffer = zone.buffer;
      source.connect(envelope);

      const playbackRate = Math.pow(2, (100 * pitch - (zone.originalPitch - 100 * zone.coarseTune - zone.fineTune)) / 1200);
      source.playbackRate.setValueAtTime(playbackRate, 0);

      const noteDuration = 8;
      const startWhen = this.audioContext.currentTime + (zone.delay || 0);
      const targetVolume = (velocity / 127.0) * trackVolMult;

      this._setupEnvelope(envelope, zone, targetVolume, startWhen, noteDuration);

      if (zone.loopStart > 1 && zone.loopStart < zone.loopEnd) {
        source.loop = true;
        source.loopStart = zone.loopStart / zone.sampleRate + (zone.delay || 0);
        source.loopEnd = zone.loopEnd / zone.sampleRate + (zone.delay || 0);
      }

      source.start(startWhen);
      envelope._audioBufferSourceNode = source;

      const maxLifetime = 6.0;
      const maxEndTime = startWhen + maxLifetime;

      if (source.loop) {
        const decayStart = startWhen + 0.5;
        const decayEnd = maxEndTime;
        envelope.gain.linearRampToValueAtTime(targetVolume, decayStart);
        envelope.gain.linearRampToValueAtTime(this.nearZero, decayEnd);
        try { source.stop(maxEndTime + 0.1); } catch(e) {}
      } else {
        try { source.stop(maxEndTime + 0.1); } catch(e) {}
      }
      return envelope;
    }

    _setupEnvelope(envelope, zone, volume, when, noteDuration) {
      const gain = envelope.gain;
      gain.cancelScheduledValues(when);
      gain.setValueAtTime(this.nearZero, when);

      const ahdsr = Array.isArray(zone.ahdsr) && zone.ahdsr.length > 0
          ? zone.ahdsr
          : [{ duration: 0, volume: 1 }, { duration: noteDuration, volume: 1 }];

      let lastTime = when;
      let lastVolume = 0;

      for (const segment of ahdsr) {
        const segmentEndTime = lastTime + segment.duration;
        const segmentVolume = segment.volume * volume;

        if (segmentEndTime > when + noteDuration) {
          const timeInto = when + noteDuration - lastTime;
          if (segment.duration > 0) {
            const volAtEnd = lastVolume + (timeInto / segment.duration) * (segmentVolume - lastVolume);
            gain.linearRampToValueAtTime(this._noZero(volAtEnd), when + noteDuration);
          } else {
            gain.linearRampToValueAtTime(this._noZero(segmentVolume), when + noteDuration);
          }
          break;
        } else {
          gain.linearRampToValueAtTime(this._noZero(segmentVolume), segmentEndTime);
          lastTime = segmentEndTime;
          lastVolume = segmentVolume;
        }
      }
    }

    noteOff(envelope) {
      if (!envelope || !envelope.gain) return;
      const gain = envelope.gain;
      const now = this.audioContext.currentTime;
      const releaseTimeConstant = 0.2;

      try {
        gain.cancelScheduledValues(0);
        gain.setTargetAtTime(0, now, releaseTimeConstant);
        if (envelope._audioBufferSourceNode) {
          envelope._audioBufferSourceNode.stop(now + releaseTimeConstant * 5);
        }
      } catch (e) {}
    }

    stopAllNotes(activeWafNotes) {
      Object.values(activeWafNotes).forEach((env) => this.noteOff(env));
    }

    setMasterVolume(volume) {
      this.masterVolume = Math.max(0, volume);
      if (this.outputNode) {
        this.outputNode.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
      }
    }

    cancel(envelope) {
      if (!envelope) return;
      try {
        if (envelope.gain) {
          envelope.gain.cancelScheduledValues(0);
          envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
        if (envelope._audioBufferSourceNode) {
          envelope._audioBufferSourceNode.stop();
        }
      } catch (e) {}
    }

  
}