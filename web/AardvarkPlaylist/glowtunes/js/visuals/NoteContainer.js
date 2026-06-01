
class NoteContainer {
  geometrySettings = null;

  startTime = 0;

  duration = 0;

  bottom = 0;

  index = -1;

  elems = [];

  isVisible = false;

  hasSetTime = false;

  constructor(startTime, duration, index, geometrySettings) {
    this.startTime = startTime;
    this.duration = duration;
    this.index = index;
    this.geometrySettings = geometrySettings;
    const gs = this.geometrySettings;

    this.bottom = gs.scale <= 0 ? 0 : duration * gs.scale;

    this.elems = [];
    for (let i = 0; i < 2; i++) {
      this.elems[i] = makeElement('div', {
        className: 'gt-note-container',
        style: {
          position: 'absolute',
          display: 'none',
          left: '0',
          width: '100%',
          height: '2px',
          willChange: 'transform',
          // THE FIX: Lower Z-index than Action Bar
          zIndex: i === 1 ? '110' : '100',
          pointerEvents: 'none',
          boxSizing: 'border-box',
        },
      });
    }
  }

  setTime(currentTimeMs, timeToAnimate, force) {
      if (!this.geometrySettings) return;
      const gs = this.geometrySettings;

      // currentTimeMs is the ALREADY-FUTURE target position from GlowTunesPlayer.
      const targetTimeMs = currentTimeMs + (gs.timeShift || 0);
      const y =
        gs.start - this.bottom + (targetTimeMs - this.startTime) * gs.scale;

      if (y < -9000 || y > 3500) {
        if (this.isVisible) this.hide();
        return;
      } else {
        if (!this.isVisible) this.show();
      }

      if (!this.isVisible) return;

      const durationSec = force ? 0 : timeToAnimate / 1000;
      const transition =
        force || durationSec < 0.001
          ? 'none'
          : `transform ${durationSec.toFixed(3)}s linear`;

      const originStyle = `50% ${gs.start}px`;

      const debugBorder = gs.debugMode ? '1px solid green' : 'none';

      const rotTransform =
        `perspective(${gs.perspective}px) ` +
        `rotateX(${gs.rotation}deg) ` +
        `rotateY(${gs.rotationY || 0}deg) ` +
        `rotateZ(${gs.rotationZ || 0}deg) `;

      // Multiply horizontal scale by abWhiteSpread and abBlackSpread to stretch lines in sync with action keys
      const transformW =
        rotTransform +
        `translateX(${gs.xShift || 0}px) ` +
        `translateY(${y.toFixed(2)}px) ` +
        `scale3d(${(gs.scaleX || 1) * (gs.whiteWidth || 1) * (gs.abWhiteSpread || 1.0)}, 1, 1) ` +
        `translateZ(${(gs.zShift || 0) + (gs.whiteKeyHeight || 0)}px)`;

      const transformB =
        rotTransform +
        `translateX(${gs.xShift || 0}px) ` +
        `translateY(${y.toFixed(2)}px) ` +
        `scale3d(${(gs.scaleX || 1) * (gs.blackWidth || 1) * (gs.abBlackSpread || 1.0)}, 1, 1) ` +
        `translateZ(${
          (gs.zShift || 0) + (gs.blackNoteOffset || 10) + (gs.blackKeyHeight || 0)
        }px)`;

      [this.elems[0], this.elems[1]].forEach((el, i) => {
        if (!el) return;
        el.style.transition = transition;
        el.style.transformOrigin = originStyle;
        el.style.transform = i === 0 ? transformW : transformB;
        el.style.border = debugBorder;
      });
    }

  show() {
    if (!this.isVisible) {
      const visuals = AppContext.get()?.pianoVisuals;
      if (!visuals) return;

      const viewport = visuals._createViewport();
      this.elems.forEach((elem) => {
        if (elem && !elem.parentNode) {
          viewport.appendChild(elem);
        }
        if (elem) elem.style.display = 'block';
      });
      this.isVisible = true;
    }
  }

  hide() {
    if (this.isVisible) {
      this.elems.forEach((elem) => {
        if (elem) elem.style.display = 'none';
      });
      this.isVisible = false;
    }
  }

  deleteNotes() {
    this.elems.forEach((elem) => {
      if (elem) elem.innerHTML = '';
    });
  }

  setClickability(clickable) {
    const pointerEvents = clickable ? 'auto' : 'none';
    this.elems.forEach((elem) => {
      if (elem) elem.style.pointerEvents = pointerEvents;
    });
    // Legacy NoteContainer didn't handle individual note clicks, FlyingBars did.
  }

  destroy() {
    this.elems.forEach((elem) => {
      if (elem) elem.remove();
    });
    this.elems = [];
  }

}

