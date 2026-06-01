class DemoPlayer {
  constructor() {
      this.beats = [];
      this.idx = 0;
      this.speed = 1;
      this.paused = false;
      this._running = false;
      this._resumeFn = null;
      this.onBeat     = null;
      this.onProgress = null;
      this.onDone     = null;
    }

  load(beats) { this.beats = beats; this.idx = 0; this._running = false; this.paused = false; }

  async play() {
      if (this._running) {
        if (this.paused) { this.paused = false; this._resumeFn?.(); }
        return;
      }
      this._running = true;
      this.paused = false;
      await this._loop();
    }

  pause() { if (!this._running) return; this.paused = true; this._notify(); }
  toggle() { (!this._running || this.paused) ? this.play() : this.pause(); }
  setSpeed(x) { this.speed = x; this._notify(); }

  reset() {
      this._resumeFn?.();
      this.paused = false;
      this._running = false;
      this.idx = 0;
      this._notify();
    }

  get isPlaying() { return this._running && !this.paused; }

  async sleep(ms) {
      const chunk = 40;
      let remaining = ms / this.speed;
      while (remaining > 0) {
        if (this.paused) { await new Promise(r => { this._resumeFn = r; }); this._resumeFn = null; }
        await new Promise(r => setTimeout(r, Math.min(chunk, remaining)));
        remaining -= chunk;
      }
    }

  async _loop() {
      while (this.idx < this.beats.length) {
        if (this.paused) { await new Promise(r => { this._resumeFn = r; }); this._resumeFn = null; }
        const beat = this.beats[this.idx];
        if ((beat.delay ?? 0) > 0) await this.sleep(beat.delay);
        await this.onBeat?.(beat, this);
        this.idx++;
        this._notify();
      }
      this._running = false;
      this._notify();
      this.onDone?.();
    }

  _notify() { this.onProgress?.(this.idx, this.beats.length, this.isPlaying, this.speed); }

}

