
class KaraokeDisplay {
  constructor(container) {
      this.container = window.projectApp ? window.projectApp.rootElement : AppContext.getTargetBody();
  
      if (!document.getElementById('gt-font-architects')) {
        const link = makeElement('link', {
          id: 'gt-font-architects',
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap',
        });
        document.head.appendChild(link);
      }
  
      this.element = makeElement('div', { className: 'gt-karaoke-overlay' });
      this.scrollContainer = makeElement('div', {
        className: 'gt-k-scroll-container',
      });
      this.element.appendChild(this.scrollContainer);
      this.container.appendChild(this.element);
  
      this.lines = [];
  
      this._fontFamily = "'Architects Daughter', cursive, sans-serif";
      this._fontSize = 3.5;
      this._color = 'rgba(255, 255, 255, 0.85)';
      this._litColor = '#fff200';
      this._litGlow1 = '#ffae00';
      this._litGlow2 = '#ff4800';
  
      this._safeLeft = 0;
      this._safeRight = 0;
  
      this._boundSafeAreaHandler = (e) => {
        const d = e.detail || {};
        this._safeLeft = d.left || 0;
        this._safeRight = d.right || 0;
        this._applySafeArea();
      };
      window.addEventListener(
        'layout-safe-area-change',
        this._boundSafeAreaHandler
      );
  
      this._initSafeArea();
  
      this.applyStyles();
  
      this._activeIndex = -1;
      this._lineHeight = 110;
      this._entryLookahead = 5000;
  
      this._boundVeqSubscriber = () => {
        if (window.VideoEventQueueClass && window.VideoEventQueueClass.current) {
          this.loadVeq(window.VideoEventQueueClass.current);
        }
      };
      if (window.VideoEventQueueClass && typeof window.VideoEventQueueClass.subscribe === 'function') {
        window.VideoEventQueueClass.subscribe(this._boundVeqSubscriber);
      }
    }

  _initSafeArea() {
    try {
      const leftPanel = document.querySelector('.yt-side-panel.left');
      const rightPanel = document.querySelector('.yt-side-panel.right');
      if (leftPanel) {
        const rect = leftPanel.getBoundingClientRect();
        if (rect.right > 0 && leftPanel.style.transform === 'translateX(0px)') {
          this._safeLeft = Math.max(0, rect.right);
        }
      }
      if (rightPanel) {
        const rect = rightPanel.getBoundingClientRect();
        if (
          rect.left < window.innerWidth &&
          rightPanel.style.transform === 'translateX(0px)'
        ) {
          this._safeRight = Math.max(0, window.innerWidth - rect.left);
        }
      }
    } catch (e) {}
    this._applySafeArea();
  }

  _applySafeArea() {
    if (!this.element) return;
    if (document.fullscreenElement) {
      this.element.style.left = '0px';
      this.element.style.right = '0px';
      this.element.style.width = '100%';
    } else {
      this.element.style.left = this._safeLeft + 'px';
      this.element.style.right = this._safeRight + 'px';
      this.element.style.width = 'auto';
    }
  }

  applyStyles() {
      applyCss(
        `
          .gt-karaoke-overlay {
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              pointer-events: none;
              z-index: 2147483640;
              font-family: ${this._fontFamily};
              overflow: hidden;
              mask-image: linear-gradient(to bottom, transparent 5%, black 25%, black 80%, transparent 100%);
              -webkit-mask-image: linear-gradient(to bottom, transparent 5%, black 25%, black 80%, transparent 100%);
              display: flex;
              flex-direction: column;
              justify-content: center;
          }
  
          .gt-k-scroll-container {
              position: absolute;
              top: 40%;
              left: 0;
              right: 0;
              will-change: transform;
          }
  
          .gt-k-line {
              height: 110px;
              min-height: 110px;
              max-height: 110px;
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${this._fontSize}rem;
              white-space: nowrap;
              text-align: center;
              padding: 0 2%;
              box-sizing: border-box;
              transform-origin: center center;
              transition: opacity 1.2s ease, filter 0.8s ease;
              opacity: 0;
              overflow: hidden;
          }
  
          .gt-k-line-inner {
              display: inline-block;
              text-align: center;
              line-height: 1.3;
              white-space: nowrap;
          }
  
          .gt-k-line.finished {
              opacity: 0;
              filter: blur(4px);
          }
  
          .gt-k-line.lingering {
              opacity: 0.55;
          }
  
          .gt-k-line.active {
              opacity: 1;
              z-index: 10;
          }
  
          .gt-k-line.upcoming {
              opacity: 0.85;
          }
  
          .gt-k-line.waiting {
              opacity: 0;
          }
  
          .gt-k-line.stale {
              opacity: 0;
              visibility: hidden;
          }
  
          .gt-k-spacer { display: inline-block; width: 0.6em; }
  
          .gt-k-syllable {
              display: inline;
              color: var(--gt-k-color, rgba(255, 255, 255, 0.85));
              text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
              padding: 0 1px;
          }
  
          .gt-k-char {
              display: inline;
              transition: color 1.0s ease-out, text-shadow 1.0s ease-out;
          }
  
          .gt-k-char.lit {
              color: var(--gt-k-lit-color, #fff200);
              text-shadow:
                  0 0 15px var(--gt-k-lit-glow1, #ffae00),
                  0 0 30px var(--gt-k-lit-glow2, #ff4800);
              transition: color 0.05s linear, text-shadow 0.05s linear;
          }
      `,
        'gt-karaoke-styles'
      );
      this._applyCustomColors();
    }

  _applyCustomColors() {
    if (!this.element) return;
    this.element.style.setProperty('--gt-k-color', this._color);
    this.element.style.setProperty('--gt-k-lit-color', this._litColor);
    this.element.style.setProperty('--gt-k-lit-glow1', this._litGlow1);
    this.element.style.setProperty('--gt-k-lit-glow2', this._litGlow2);
    this.element.style.fontFamily = this._fontFamily;
  }

  setStyle(opts) {
    if (!opts) return;
    if (opts.fontFamily !== undefined) this._fontFamily = opts.fontFamily;
    if (opts.fontSize !== undefined)
      this._fontSize = parseFloat(opts.fontSize) || 3.5;
    if (opts.color !== undefined) this._color = opts.color;
    if (opts.litColor !== undefined) this._litColor = opts.litColor;
    if (opts.litGlow1 !== undefined) this._litGlow1 = opts.litGlow1;
    if (opts.litGlow2 !== undefined) this._litGlow2 = opts.litGlow2;

    // Re-apply CSS with new values
    this.applyStyles();

    // Update existing line elements font-size directly (CSS class won't re-cascade)
    this.lines.forEach((line) => {
      if (line.domElement) {
        line.domElement.style.fontSize = this._fontSize + 'rem';
      }
    });
  }

  loadVeq(veqData) {
    this.lines = [];
    this.scrollContainer.innerHTML = '';
    this._activeIndex = -1;
    this._layoutReady = false;

    if (!veqData || !veqData.timedEvents) return;

    const events = veqData.timedEvents.filter((e) => e.type === 'karaokebox');
    if (events.length === 0) return;

    this.lines = events
      .map((e) => this._parseEvent(e))
      .sort((a, b) => a.startTime - b.startTime);

    this.lines.forEach((line, index) => {
      const lineEl = makeElement('div', {
        className: 'gt-k-line waiting',
        'data-index': index,
      });

      const innerWrap = makeElement('span', { className: 'gt-k-line-inner' });

      line.parts.forEach((part) => {
        if (part.type === 'spacer') {
          innerWrap.appendChild(
            makeElement('span', { className: 'gt-k-spacer' })
          );
        } else if (part.type === 'syllable') {
          const sylEl = makeElement('span', { className: 'gt-k-syllable' });
          const chars = part.text.split('');
          chars.forEach((char) => {
            sylEl.appendChild(
              makeElement('span', { className: 'gt-k-char' }, char)
            );
          });
          innerWrap.appendChild(sylEl);
          part.element = sylEl;
        }
      });

      lineEl.appendChild(innerWrap);
      this.scrollContainer.appendChild(lineEl);
      line.domElement = lineEl;
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._measureLineLayout();
      });
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        this._measureLineLayout();
      });
    }
  }

  _parseEvent(e) {
    const rawText = e.msg || '';
    const parts = rawText.split(/([ |])/).filter((s) => s.length > 0);
    const timingOffset = 6;
    const timings = (e.dims || []).slice(timingOffset);

    const renderableParts = [];
    let sylIndex = 0;

    if (timings.length === 0) {
      return {
        startTime: e.t,
        endTime: e.t + (e.d || 2000),
        parts: [
          {
            type: 'syllable',
            text: rawText,
            startTime: e.t,
            endTime: e.t + (e.d || 2000),
            duration: e.d || 2000,
          },
        ],
        rawText: rawText,
      };
    }

    parts.forEach((part) => {
      if (part === ' ') {
        renderableParts.push({ type: 'spacer' });
      } else if (part === '|') {
        // Skip
      } else {
        if (sylIndex < timings.length) {
          const startRel = timings[sylIndex];
          const endRel =
            sylIndex + 1 < timings.length
              ? timings[sylIndex + 1]
              : e.d
              ? e.d
              : startRel + 300;
          renderableParts.push({
            type: 'syllable',
            text: part,
            startTime: e.t + startRel,
            endTime: e.t + endRel,
            duration: Math.max(1, endRel - startRel),
          });
          sylIndex++;
        }
      }
    });

    const lineStart = e.t + (timings[0] || 0);
    const lastSyl = renderableParts.filter((p) => p.type === 'syllable').pop();
    const lineEnd = lastSyl ? lastSyl.endTime : e.t + (e.d || 2000);

    return {
      startTime: lineStart,
      endTime: lineEnd,
      parts: renderableParts,
      rawText: rawText,
    };
  }

  setTime(timeMs, isReset) {
      if (this.lines.length === 0) return;

      const PRE_ROLL = 2500;
      const POST_HOLD = 800;
      const STALE_THRESHOLD = 4000;
      const GLIDE_LEAD = 600;

      if (!this._layoutReady) {
        this._measureLineLayout();
      }

      let singingIndex = -1;
      for (let i = 0; i < this.lines.length; i++) {
        const line = this.lines[i];
        if (timeMs >= line.startTime && timeMs < line.endTime) {
          singingIndex = i;
          break;
        }
        if (timeMs < line.startTime) {
          singingIndex = i - 1;
          break;
        }
      }
      if (
        singingIndex === -1 &&
        timeMs >= this.lines[this.lines.length - 1].endTime
      ) {
        singingIndex = this.lines.length;
      }
      if (singingIndex === -1) singingIndex = 0;

      const SEEK_THRESHOLD = 3;
      if (this._activeIndex === -1) {
        this._activeIndex = singingIndex;
      } else if (singingIndex > this._activeIndex) {
        this._activeIndex = singingIndex;
      } else if (this._activeIndex - singingIndex >= SEEK_THRESHOLD) {
        this._activeIndex = singingIndex;
      }

      let offsetY;
      if (this._activeIndex >= this.lines.length) {
        offsetY = this._scrollOffsetForLine(this.lines.length - 1);
      } else if (this._activeIndex < 0) {
        offsetY = this._scrollOffsetForLine(0);
      } else {
        const curIdx = this._activeIndex;
        const nextLine = this.lines[curIdx + 1];
        const curOffset = this._scrollOffsetForLine(curIdx);

        if (nextLine) {
          const glideStart = nextLine.startTime - GLIDE_LEAD;
          const glideEnd = nextLine.startTime;
          const nextOffset = this._scrollOffsetForLine(curIdx + 1);

          if (timeMs <= glideStart) {
            offsetY = curOffset;
          } else if (timeMs >= glideEnd) {
            offsetY = nextOffset;
          } else {
            const t = (timeMs - glideStart) / (glideEnd - glideStart);
            const eased = t * t * (3 - 2 * t);
            offsetY = curOffset + (nextOffset - curOffset) * eased;
          }
        } else {
          offsetY = curOffset;
        }
      }

      // Smooth out the 100ms discrete tick updates using a 120ms linear transition.
      // This bridges the timeline updates and provides fluid 60fps vertical scrolling.
      const durationSec = isReset ? 0 : 0.12;
      this.scrollContainer.style.transition = durationSec === 0 ? 'none' : `transform ${durationSec}s linear`;
      this.scrollContainer.style.transform = `translateY(${offsetY}px)`;

      this.lines.forEach((line, idx) => {
        if (!line.domElement) return;
        const el = line.domElement;
        el.className = 'gt-k-line';

        const timeToStart = line.startTime - timeMs;
        const timeSinceEnd = timeMs - line.endTime;
        const isSinging = timeMs >= line.startTime && timeMs < line.endTime;
        const inPreRoll = timeToStart > 0 && timeToStart <= PRE_ROLL;
        const inPostHold = timeSinceEnd >= 0 && timeSinceEnd <= POST_HOLD;

        if (timeSinceEnd > STALE_THRESHOLD) {
          el.classList.add('stale');
          this._clearLineHighlights(line);
          return;
        }

        if (timeToStart > PRE_ROLL) {
          el.classList.add('waiting');
          this._clearLineHighlights(line);
          return;
        }

        if (timeSinceEnd > POST_HOLD) {
          el.classList.add('finished');
          this._clearLineHighlights(line);
          return;
        }

        if (isSinging) {
          el.classList.add('active');
          this._updateSyllables(line, timeMs);
        } else if (inPreRoll) {
          el.classList.add('upcoming');
          this._clearLineHighlights(line);
        } else if (inPostHold) {
          el.classList.add('lingering');
        } else {
          el.classList.add('waiting');
          this._clearLineHighlights(line);
        }
      });
    }

  _updateSyllables(line, timeMs) {
    line._cleared = false;

    const checkTime = timeMs + 250;

    line.parts.forEach((part) => {
      if (part.type !== 'syllable' || !part.element) return;
      const chars = part.element.children;
      const len = chars.length;

      if (checkTime >= part.endTime) {
        for (let i = 0; i < len; i++)
          if (chars[i].className !== 'gt-k-char lit')
            chars[i].className = 'gt-k-char lit';
      } else if (checkTime < part.startTime) {
        for (let i = 0; i < len; i++)
          if (chars[i].className !== 'gt-k-char')
            chars[i].className = 'gt-k-char';
      } else {
        const elapsed = checkTime - part.startTime;
        const progress = elapsed / part.duration;
        const litThreshold = progress * len;
        for (let i = 0; i < len; i++) {
          const cls = i < litThreshold ? 'gt-k-char lit' : 'gt-k-char';
          if (chars[i].className !== cls) chars[i].className = cls;
        }
      }
    });
  }

  destroy() {
    window.removeEventListener(
      'layout-safe-area-change',
      this._boundSafeAreaHandler
    );
    this.element.remove();
    this.lines = [];
  }

  _clearLineHighlights(line) {
    if (line._cleared) return;

    let foundLit = false;
    line.parts.forEach((part) => {
      if (part.type === 'syllable' && part.element) {
        for (let char of part.element.children) {
          if (char.classList.contains('lit')) {
            char.classList.remove('lit');
            foundLit = true;
          }
        }
      }
    });

    if (!foundLit) {
      line._cleared = true;
    } else {
      line._cleared = false;
    }
  }

  _measureLineLayout() {
    if (!this.lines.length) return;
    // Fixed-height lines: no DOM measurement needed.
    const H = this._lineHeight;
    this.lines.forEach((line, idx) => {
      line._layoutTop = idx * H;
      line._layoutHeight = H;
    });
    this._layoutReady = true;
    console.log(
      `[Karaoke] Fixed layout: ${this.lines.length} lines at ${H}px each`
    );
  }

  _scrollOffsetForLine(idx) {
    const clamped = Math.max(0, Math.min(idx, this.lines.length - 1));
    return -(clamped * this._lineHeight + this._lineHeight / 2);
  }

}

