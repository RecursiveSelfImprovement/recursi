class InstrumentSounds {
    constructor(options = {}) {
      this.basePath = options.basePath || './';
      this.audioContext = null;
      this.wafPlayer = null;
      this.pianoPlayer = null;
      this.tinySynth = null;
      this.isLoading = false;
      this._loadPromise = null;
      this.globalTranspose = 0;

      this.tracks = [
        { instrument: 'Piano', volume: 5.0, octaveShift: 0 },
        { instrument: 'Vibes', volume: 5.0, octaveShift: 0 },
      ];

      this.instrumentDefs = {
        Piano: { engine: 'piano' },
        Vibes: { engine: 'waf', key: '0110_FluidR3_GM_sf2_file' },
        'Electric Guitar': { engine: 'waf', key: '0260_JCLive_sf2_file' },
        'Wurlitzer EP': { engine: 'waf', key: '0051_FluidR3_GM_sf2_file' },
        Marimba: { engine: 'waf', key: '0120_FluidR3_GM_sf2_file' },
        'Steel Drum': { engine: 'waf', key: '1140_Chaos_sf2_file' },
        Harp: { engine: 'waf', key: '0460_GeneralUserGS_sf2_file' },
        'Music Box': { engine: 'waf', key: '0100_Chaos_sf2_file' },
        'Choir Aahs': { engine: 'waf', key: '0520_FluidR3_GM_sf2_file' },
        Celesta: { engine: 'tiny', key: 'Celesta' },
        Chimes: { engine: 'tiny', key: 'Chimes' },
        Blocks: { engine: 'tiny', key: 'Blocks' },
        Synth: { engine: 'tiny', key: 'Synth' },
      };

      this.availableInstruments = Object.keys(this.instrumentDefs);
      this.activeWafNotes = {};
      this.activeTinyNotes = {};

      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this._addResumeListeners();
        this.wafPlayer = new WafPlayer(this.audioContext);
        this.tinySynth = new TinySynth(this.audioContext);
      } catch (e) {
        console.error('InstrumentSounds: Failed to create AudioContext:', e);
      }
    }

    _addResumeListeners() {
      if (!this.audioContext) return;
      const resume = () => {
        this.resumeContext().finally(() => {
          document.body.removeEventListener('click', resume, { capture: true });
          document.body.removeEventListener('keydown', resume, { capture: true });
        });
      };
      document.body.addEventListener('click', resume, { once: true, capture: true });
      document.body.addEventListener('keydown', resume, { once: true, capture: true });
    }

    load() {
      if (this._loadPromise) return this._loadPromise;
      this.isLoading = true;
      this._loadPromise = new Promise(async (resolve) => {
        const url = 'https://recursi.dev/resources/acoustic_grand_piano-mp3.js';
        console.log(`[InstrumentSounds] 🎵 Fetching Piano Soundfont from: ${url}`);

        try {
          // Dynamic import handles files with 'export' tokens natively
          const mod = await import(url);
          console.log(`[InstrumentSounds] ✅ Piano module loaded successfully.`, mod);

          // Find the actual soundbank data
          let soundBankData = mod.grandPianoSound || mod.acoustic_grand_piano || mod.default || null;
          
          if (!soundBankData) {
            console.log(`[InstrumentSounds] 🔍 Searching module exports for soundbank data...`);
            for (const k of Object.keys(mod)) {
              if (mod[k] && typeof mod[k] === 'object') {
                soundBankData = mod[k];
                console.log(`[InstrumentSounds] 🎯 Found soundbank in export: '${k}'`);
                break;
              }
            }
          }

          if (!soundBankData) {
            console.error('[InstrumentSounds] ❌ Module loaded but no usable sound bank export found.');
            this.isLoading = false;
            resolve();
            return;
          }

          this.pianoPlayer = new PianoSamplePlayer(
            this.audioContext,
            soundBankData,
            async (err) => {
              if (err) {
                console.error('[InstrumentSounds] ❌ Piano Engine Decode Error:', err);
              } else {
                console.log('[InstrumentSounds] 🎹 Piano Engine Ready.');
                this.pianoPlayer.setMasterVolume(4.0);
              }

              for (let i = 0; i < this.tracks.length; i++) {
                const tr = this.tracks[i];
                if (tr && tr.instrument) {
                  const def = this.instrumentDefs[tr.instrument];
                  if (def && def.engine === 'waf') {
                    console.log(`[InstrumentSounds] 🔄 Restoring track ${i} instrument to ${tr.instrument}`);
                    await this.setTrackInstrument(i, tr.instrument);
                  }
                }
              }

              this.isLoading = false;
              resolve();
            }
          );
        } catch (e) {
          console.error('[InstrumentSounds] ❌ FAILED to import Piano Soundfont module:', e);
          this.isLoading = false;
          resolve();
        }
      });
      return this._loadPromise;
    }

    resumeContext() {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        return this.audioContext.resume();
      }
      return Promise.resolve();
    }

    getAvailableInstruments() { return [...this.availableInstruments]; }

    async setActiveInstrument(instrumentName) {
      if (!this.audioContext) throw new Error('AudioContext not available.');
      const def = this.instrumentDefs[instrumentName];
      if (!def) throw new Error(`Instrument "${instrumentName}" is not defined.`);

      await this.setTrackInstrument(0, instrumentName);

      if (def.engine === 'piano') {
        if (!this.pianoPlayer) await this.load();
        this.activeInstrument = instrumentName;
        this.activeEngine = 'piano';
        return;
      }

      if (def.engine === 'waf') {
        if (!this.wafPlayer) throw new Error('WAF player not initialized.');
        if (this.wafPlayer.activePresets[instrumentName]) {
          this.activeInstrument = instrumentName;
          this.activeEngine = 'waf';
          return;
        }
        const variableName = `_tone_${def.key}`;
        const url = `https://surikov.github.io/webaudiofontdata/sound/${def.key}.js`;
        await this.wafPlayer.loader.loadInstrument(instrumentName, url, variableName);
        this.activeInstrument = instrumentName;
        this.activeEngine = 'waf';
        return;
      }

      if (def.engine === 'tiny') {
        if (!this.tinySynth) this.tinySynth = new TinySynth(this.audioContext);
        this.activeInstrument = instrumentName;
        this.activeEngine = 'tiny';
        return;
      }
    }

    noteOn(midiCode, velocity = 100, trackId = 0, debugInfo = {}) {
      if (this.isLoading) return null;

      if (!this.tracks[trackId]) {
        this.tracks[trackId] = { instrument: trackId === 1 ? 'Vibes' : 'Piano', volume: 5.0, octaveShift: 0 };
      }
      const track = this.tracks[trackId];
      const instName = track.instrument;
      const def = this.instrumentDefs[instName];
      if (!def) return null;

      const finalMidi = midiCode + this.globalTranspose + (track.octaveShift || 0) * 12;
      const volMult = (track.volume !== undefined ? track.volume : 5.0) / 10.0;

      if (velocity <= 0) return null;

      const logId = `${trackId}_${midiCode}`;
      if (window.midiDiagnostics) {
        window.midiDiagnostics.logNoteOn(logId, {
          time: window.projectApp?.gt?.videoPlayer?.getCurrentRawTime() || 0,
          visualMidi: midiCode,
          playedMidi: finalMidi,
          velocity: velocity,
          instrument: instName,
          octaveShift: track.octaveShift || 0,
          trackId: trackId,
          source: debugInfo.source || 'A',
        });
      }

      if (def.engine === 'piano' && this.pianoPlayer) {
        return this.pianoPlayer.noteOn(finalMidi, velocity, 0, volMult);
      } else if (def.engine === 'waf' && this.wafPlayer) {
        const key = `${trackId}_${midiCode}`;
        if (this.activeWafNotes[key]) this.wafPlayer.cancel(this.activeWafNotes[key]);
        if (!this.wafPlayer.activePresets[instName]) return null;
        const envelope = this.wafPlayer.playNote(instName, finalMidi, velocity, volMult);
        if (envelope) this.activeWafNotes[key] = envelope;
        return envelope;
      } else if (def.engine === 'tiny' && this.tinySynth) {
        const key = `${trackId}_${midiCode}`;
        if (this.activeTinyNotes[key]) this.tinySynth.noteOff(0, this.activeTinyNotes[key]);
        const noteObj = this.tinySynth.noteOn(finalMidi, velocity * volMult, def.key);
        if (noteObj) this.activeTinyNotes[key] = noteObj;
        return noteObj;
      }
      return null;
    }

    noteOff(midiCode, trackId = 0, specificHandle = null) {
      const track = this.tracks[trackId] || this.tracks[0];
      const instName = track.instrument;
      const def = this.instrumentDefs[instName];
      const finalMidi = midiCode + this.globalTranspose + (track.octaveShift || 0) * 12;

      const logId = `${trackId}_${midiCode}`;
      if (window.midiDiagnostics) window.midiDiagnostics.logNoteOff(logId);

      if (def.engine === 'piano' && this.pianoPlayer) {
        this.pianoPlayer.noteOff(finalMidi, 0, specificHandle);
      } else if (def.engine === 'waf' && this.wafPlayer) {
        if (specificHandle) {
          this.wafPlayer.noteOff(specificHandle);
          const key = `${trackId}_${midiCode}`;
          if (this.activeWafNotes[key] === specificHandle) delete this.activeWafNotes[key];
        } else {
          const key = `${trackId}_${midiCode}`;
          const envelope = this.activeWafNotes[key];
          if (envelope) {
            this.wafPlayer.noteOff(envelope);
            delete this.activeWafNotes[key];
          }
        }
      } else if (def.engine === 'tiny' && this.tinySynth) {
        if (specificHandle) {
          this.tinySynth.noteOff(finalMidi, specificHandle);
          const key = `${trackId}_${midiCode}`;
          if (this.activeTinyNotes[key] === specificHandle) delete this.activeTinyNotes[key];
        } else {
          const key = `${trackId}_${midiCode}`;
          const noteObj = this.activeTinyNotes[key];
          if (noteObj) {
            this.tinySynth.noteOff(finalMidi, noteObj);
            delete this.activeTinyNotes[key];
          }
        }
      }
    }

    stopAllNotes() {
      if (this.pianoPlayer) this.pianoPlayer.offAllNotes();
      if (this.wafPlayer) {
        this.wafPlayer.stopAllNotes(this.activeWafNotes);
        this.activeWafNotes = {};
      }
      if (this.tinySynth) {
        this.tinySynth.offAllNotes();
        this.activeTinyNotes = {};
      }
    }

    setVolume(v) {
      if (this.pianoPlayer) this.pianoPlayer.setMasterVolume(v * 2.5);
      if (this.wafPlayer) this.wafPlayer.setMasterVolume(v * 0.45);
      if (this.tinySynth) this.tinySynth.setMasterVolume(v * 0.8);
    }

    setTranspose(semitones) { this.globalTranspose = parseInt(semitones) || 0; }

    async setTrackInstrument(trackId, instrumentName) {
      if (!this.tracks[trackId]) this.tracks[trackId] = { instrument: 'Piano', volume: 3.0, transpose: 0 };
      const def = this.instrumentDefs[instrumentName];
      if (!def) return;
      
      console.log(`[InstrumentSounds] 🎛️ Setting track ${trackId} to instrument: ${instrumentName} (Engine: ${def.engine})`);
      this.stopNotesForTrack(trackId);
      
      if (def.engine === 'waf' && this.wafPlayer) {
        if (!this.wafPlayer.activePresets[instrumentName]) {
          const varName = `_tone_${def.key}`;
          const url = `https://surikov.github.io/webaudiofontdata/sound/${def.key}.js`;
          console.log(`[InstrumentSounds] 📡 Fetching WebAudioFont preset from: ${url}`);
          try { 
            await this.wafPlayer.loader.loadInstrument(instrumentName, url, varName); 
            console.log(`[InstrumentSounds] ✅ Successfully loaded WAF preset: ${instrumentName}`);
          } 
          catch (e) { console.error(`[InstrumentSounds] ❌ Failed to load ${instrumentName}`, e); }
        } else {
          console.log(`[InstrumentSounds] ⚡ WAF preset ${instrumentName} already cached.`);
        }
      }
      this.tracks[trackId].instrument = instrumentName;
    }

    setInstrument(name) { this.setTrackInstrument(0, name); }
    setTrackVolume(trackId, volume) { if (this.tracks[trackId]) this.tracks[trackId].volume = volume; }
    setTrackTranspose(trackId, semitones) { if (this.tracks[trackId]) this.tracks[trackId].transpose = parseInt(semitones) || 0; }
    
    setTrackOctave(trackId, shift) {
      if (!this.tracks[trackId]) this.tracks[trackId] = { instrument: 'Piano', volume: 3.0, octaveShift: 0 };
      this.tracks[trackId].octaveShift = parseInt(shift) || 0;
    }

    async restoreTrackState(trackConfigs) {
      if (!Array.isArray(trackConfigs)) return;
      const promises = trackConfigs.map(async (cfg, index) => {
        if (!cfg) return;
        if (!this.tracks[index]) this.tracks[index] = { instrument: index === 1 ? 'Vibes' : 'Piano', volume: 5.0, octaveShift: 0 };
        if (cfg.volume !== undefined) this.tracks[index].volume = cfg.volume;
        if (cfg.octaveShift !== undefined) this.tracks[index].octaveShift = cfg.octaveShift;
        if (cfg.instrument && cfg.instrument !== this.tracks[index].instrument) await this.setTrackInstrument(index, cfg.instrument);
      });
      await Promise.all(promises);
    }

    stopNotesForTrack(trackId) {
      Object.keys(this.activeWafNotes).forEach((key) => {
        if (key.startsWith(`${trackId}_`)) {
          this.wafPlayer.cancel(this.activeWafNotes[key]);
          delete this.activeWafNotes[key];
        }
      });
      Object.keys(this.activeTinyNotes).forEach((key) => {
        if (key.startsWith(`${trackId}_`)) {
          this.tinySynth.noteOff(0, this.activeTinyNotes[key]);
          delete this.activeTinyNotes[key];
        }
      });
      if (trackId === 0 && this.pianoPlayer) this.pianoPlayer.offAllNotes();
    }

  
}