class TinySynth {
    constructor(audioContext) {
      this.ctx = audioContext;
      this.masterVolume = 0.5;
      this.out = this.ctx.createGain();
      this.out.connect(this.ctx.destination);
      this.out.gain.value = this.masterVolume;
      this.voices = [];
      this.polyphony = 64;

      this.instruments = {
        Celesta: [{ w: 'sine', d: 0.3, r: 0.3 }, { w: 'sine', v: 7, t: 11, d: 0.03, g: 1 }],
        Chimes: [{ w: 'sine', v: 0.3, d: 0.5, r: 0.5 }, { w: 'sine', v: 7, t: 2, f: 2, d: 1, r: 1, g: 1 }],
        Blocks: [{ w: 'sine', v: 0.8, d: 0.08, r: 0.08, t: 1 }, { w: 'triangle', v: 2, t: 2.5, d: 0.02, r: 0.02, g: 1 }],
        Synth: [{ w: 'triangle', d: 0.7 }, { w: 'square', v: 0.4, t: 0.5, f: 1, d: 0.2, s: 10, g: 1 }],
      };

      const defp = { g: 0, w: 'sine', t: 1, f: 0, v: 0.5, a: 0, h: 0.01, d: 0.01, s: 0, r: 0.05, p: 1, q: 1, k: 0 };
      for (let name in this.instruments) {
        this.instruments[name] = this.instruments[name].map((p) => ({ ...defp, ...p }));
      }
    }

    setMasterVolume(vol) {
      this.masterVolume = Math.max(0, vol);
      if (this.out) this.out.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }

    _setParamTarget(p, v, t, d) {
      if (d !== 0) p.setTargetAtTime(v, t, d);
      else p.setValueAtTime(v, t);
    }

    noteOn(midiNote, velocity, instrumentName) {
      if (this.ctx.state === 'suspended') return null;
      const p = this.instruments[instrumentName];
      if (!p) return null;

      this._limitVoices();

      const t = this.ctx.currentTime;
      const f = 440 * Math.pow(2, (midiNote - 69) / 12);
      const v = velocity / 127;

      const o = [], g = [], vp = [], fp = [], r = [];

      for (let i = 0; i < p.length; ++i) {
        const pn = p[i];
        const dt = t + pn.a + pn.h;
        let out, sc;

        if (pn.g === 0) {
          out = this.out; sc = v * v; fp[i] = f * pn.t + pn.f;
        } else if (pn.g > 10) {
          out = g[pn.g - 11].gain; sc = 1; fp[i] = fp[pn.g - 11] * pn.t + pn.f;
        } else if (o[pn.g - 1] && o[pn.g - 1].frequency) {
          out = o[pn.g - 1].frequency; sc = fp[pn.g - 1]; fp[i] = fp[pn.g - 1] * pn.t + pn.f;
        } else {
          out = this.out; sc = v * v; fp[i] = f * pn.t + pn.f;
        }

        o[i] = this.ctx.createOscillator();
        o[i].frequency.value = fp[i];
        if (pn.p !== 1) this._setParamTarget(o[i].frequency, fp[i] * pn.p, t, pn.q);
        o[i].type = pn.w;

        g[i] = this.ctx.createGain();
        r[i] = pn.r;

        o[i].connect(g[i]);
        g[i].connect(out);

        vp[i] = sc * pn.v;
        if (pn.k) vp[i] *= Math.pow(2, ((midiNote - 60) / 12) * pn.k);

        if (pn.a) {
          g[i].gain.value = 0;
          g[i].gain.setValueAtTime(0, t);
          g[i].gain.linearRampToValueAtTime(vp[i], t + pn.a);
        } else {
          g[i].gain.setValueAtTime(vp[i], t);
        }

        this._setParamTarget(g[i].gain, pn.s * vp[i], dt, pn.d);
        o[i].start(t);
      }

      const noteObj = { t: t, e: 99999, n: midiNote, o: o, g: g, t2: t + p[0].a, v: vp, r: r, f: 0 };
      this.voices.push(noteObj);
      return noteObj;
    }

    noteOff(midiNote, specificNoteObj = null) {
      const t = this.ctx.currentTime;
      for (let i = this.voices.length - 1; i >= 0; --i) {
        const nt = this.voices[i];
        if (nt.f === 0 && (specificNoteObj === nt || (!specificNoteObj && nt.n === midiNote))) {
          nt.f = 1;
          this._releaseNote(nt, t);
        }
      }
    }

    offAllNotes() {
      const t = this.ctx.currentTime;
      for (let i = this.voices.length - 1; i >= 0; --i) {
        const nt = this.voices[i];
        if (nt.f === 0) {
          nt.f = 1;
          this._releaseNote(nt, t);
        }
      }
    }

    _releaseNote(nt, t) {
      for (let k = nt.g.length - 1; k >= 0; --k) {
        nt.g[k].gain.cancelScheduledValues(t);
        if (t === nt.t2) nt.g[k].gain.setValueAtTime(nt.v[k], t);
        else if (t < nt.t2) nt.g[k].gain.setValueAtTime((nt.v[k] * (t - nt.t)) / (nt.t2 - nt.t), t);
        this._setParamTarget(nt.g[k].gain, 0, t, nt.r[k]);
      }
      nt.e = t + nt.r[0] * 3.5;
      setTimeout(() => this._pruneNoteObj(nt), (nt.r[0] * 3.5 + 0.1) * 1000);
    }

    _pruneNoteObj(nt) {
      for (let k = nt.o.length - 1; k >= 0; --k) {
        try {
          nt.o[k].frequency.cancelScheduledValues(0);
          nt.g[k].gain.cancelScheduledValues(0);
          nt.o[k].stop();
          nt.g[k].gain.value = 0;
          nt.o[k].disconnect();
          nt.g[k].disconnect();
        } catch (e) {}
      }
      const idx = this.voices.indexOf(nt);
      if (idx !== -1) this.voices.splice(idx, 1);
    }

    _limitVoices() {
      if (this.voices.length >= this.polyphony) {
        this.voices.sort((n1, n2) => {
          if (n1.f !== n2.f) return n2.f - n1.f;
          return n1.t - n2.t;
        });
        const toKill = this.voices.shift();
        if (toKill) this._pruneNoteObj(toKill);
      }
    }

  
}