class TimelineUI {
  constructor(app) {
    this.app = app;
    this.element = null;
    this.currentTimeIndicator = null;
    this.isShown = false;
    this.isPermanent = false;
    this.isDragging = false;
    this.timeout = null;
    this.wereControlsVisible = false;
    this.initialWidth = 0;
    this.timelineWidth = 0;
    this.padding = 0;
    this.lastDragTime = 0;
    this.updateInterval = null;
    this.boundMouseMove = null;
    this.boundMouseUp = null;
  }

  show(permanent, callback) {
    this.app.video.getVideo((video) => {
      if (!video) {
        console.log('No video element found to show timeline');
        return;
      }
      if (!this.boundMouseMove) {
        this.setupEventListeners();
      }

      this.wereControlsVisible = video.controls;
      if (this.wereControlsVisible) video.controls = false;

      if (permanent) {
        this.isPermanent = true;
      } else {
        if (this.isPermanent) return;
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(this.hide.bind(this), 3000);
      }

      if (this.element) this.element.remove();
      this.createTimelineDOM(video);

      this.isShown = true;

      // Indicator Loop (Smoothness)
      if (this.updateInterval) clearInterval(this.updateInterval);
      this.updateInterval = setInterval(
        () => this.updateIndicatorPosition(),
        50
      );

      // Layout Watchdog (Robustness)
      if (this.layoutInterval) clearInterval(this.layoutInterval);
      this.layoutInterval = setInterval(() => {
        if (this.isShown && this.app.video.currentVideo) {
          this.checkLayoutShift(this.app.video.currentVideo);
        }
      }, 500);

      if (callback) callback();
    });
  }

  hide() {
    this.hideElement();

    this.isShown = false;
    this.isPermanent = false;

    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = null;

    if (this.layoutInterval) clearInterval(this.layoutInterval);
    this.layoutInterval = null;

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.wereControlsVisible && this.app.video.currentVideo) {
      this.app.video.currentVideo.controls = true;
    }
  }

  update(callback) {
    if (this.isShown && this.element) {
      const video = this.app.video.currentVideo;
      if (!video) return;

      // TrustedHTML Fix: Clear children without innerHTML
      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }

      this.createSvgContents(
        video,
        this.app.segments.segments,
        [10, 40, 5],
        [
          this.app.video.isLoopPaused
            ? 'rgba(100, 100, 100, 0.6)'
            : 'rgba(0, 255, 255, 0.7)',
          'rgba(255, 255, 255, 0.2)',
        ],
        this.element
      );
    }

    if (callback) callback();
  }

  createTimeline(video, segments, dims, colors) {
    const domVideo = video._realElement || video;
    const videoRect = domVideo.getBoundingClientRect();
    const barHeight = dims[1];
    this.padding = dims[0];

    const availableWidth = window.innerWidth;
    const leftPosition = Math.max(0, videoRect.left);

    // Ensure we don't go off-screen
    this.initialWidth = Math.min(
      videoRect.width,
      availableWidth - leftPosition
    );

    this.timelineWidth = this.initialWidth - this.padding * 2;

    const bottomMargin = 15;
    let topPos;

    const roomBelow = window.innerHeight - videoRect.bottom;

    if (roomBelow >= barHeight + bottomMargin) {
      topPos = videoRect.bottom + 5;
    } else {
      // Place inside, near bottom edge of visible content
      const contentBottom = Math.min(videoRect.bottom, window.innerHeight);
      topPos = contentBottom - barHeight - bottomMargin;
    }

    const container = makeElement('div', {
      className: 'recursi-ui timeline-container',
      style: {
        position: 'fixed',
        width: this.initialWidth + 'px',
        height: barHeight + 'px',
        left: leftPosition + 'px',
        top: topPos + 'px',
        background: 'transparent',
        zIndex: '2147483647',
        pointerEvents: 'none', // Allow click-through on empty parts
      },
    });

    this.createSvgContents(video, segments, dims, colors, container);
    return container;
  }

  createSvgContents(video, segments, dims, colors, container) {
    const width = this.initialWidth;
    const barHeight = dims[1];
    const timelineStart = this.padding;
    const timelineWidth = this.timelineWidth;

    const svg = makeElement('svg:svg', {
      width,
      height: barHeight,
      style: {
        pointerEvents: 'none',
      },
    });
    container.appendChild(svg);

    const defs = makeElement('svg:defs');
    const gradient = makeElement('svg:linearGradient', {
      id: 'progGradient',
      x1: '0%',
      y1: '0%',
      x2: '0%', // Changed to vertical gradient for 3D bar look
      y2: '100%',
    });

    // FIX: Much darker colors for visibility on white backgrounds (YouTube)
    gradient.appendChild(
      makeElement('svg:stop', {
        offset: '0%',
        'stop-color': '#444', // Dark Grey
      })
    );
    gradient.appendChild(
      makeElement('svg:stop', {
        offset: '100%',
        'stop-color': '#222', // Near Black
      })
    );
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const progressBar = makeElement('svg:rect', {
      x: timelineStart,
      y: barHeight / 4,
      width: timelineWidth,
      height: barHeight / 2,
      rx: 8,
      fill: 'url(#progGradient)',
      stroke: '#666', // Visible border
      'stroke-width': 1,
      style: {
        pointerEvents: 'auto',
        cursor: 'pointer',
      },
    });
    svg.appendChild(progressBar);

    segments.forEach((seg, i) => {
      const startPos =
        timelineStart + (seg.times[0] / video.duration) * timelineWidth;
      const endPos =
        timelineStart + (seg.times[1] / video.duration) * timelineWidth;
      const segWidth = Math.max(0, endPos - startPos);

      const rect = makeElement('svg:rect', {
        x: startPos,
        y: 0,
        width: segWidth,
        height: barHeight,
        rx: 6,
        fill: colors[0],
        stroke: this.app.video.isLoopPaused
          ? 'rgba(150, 150, 150, 0.5)'
          : 'rgba(0, 255, 255, 0.8)',
        'stroke-width': 1.5,
        style: {
          pointerEvents: 'none',
        },
      });
      svg.appendChild(rect);

      if (
        !this.app.video.isLoopPaused &&
        i === this.app.segments.currentIndex
      ) {
        const glow = makeElement('svg:rect', {
          x: startPos,
          y: 0,
          width: segWidth,
          height: barHeight,
          rx: 6,
          fill: 'none',
          stroke: 'rgba(0, 255, 255, 0.3)',
          'stroke-width': 4,
          style: {
            filter: 'blur(4px)',
            pointerEvents: 'none',
          },
        });
        svg.appendChild(glow);
      }

      if (seg.repeatCount > 1) {
        const text = makeElement(
          'div',
          {
            style: {
              position: 'absolute',
              left: startPos + segWidth / 2 - 10 + 'px',
              top: barHeight / 2 - 10 + 'px',
              width: '20px',
              height: '20px',
              textAlign: 'center',
              color: 'white',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              textShadow: '0 0 3px rgba(0, 0, 0, 0.7)',
              pointerEvents: 'none',
              zIndex: '999999999999999',
            },
          },
          seg.repeatCount.toString()
        );
        container.appendChild(text);
      }
    });

    this.currentTimeIndicator = makeElement('svg:rect', {
      x: timelineStart + (video.currentTime / video.duration) * timelineWidth,
      y: 0,
      width: 6,
      height: barHeight,
      rx: 3,
      fill: 'rgba(255, 50, 50, 0.9)',
      stroke: 'rgba(255, 255, 255, 0.5)',
      'stroke-width': 1.5,
      style: {
        pointerEvents: 'none',
      },
    });
    svg.appendChild(this.currentTimeIndicator);

    container.addEventListener('mousedown', (event) => {
      this.isDragging = true;
      this.handleInteraction(event);
      event.preventDefault();
    });
  }

  handleInteraction(event) {
    const video = this.app.video.currentVideo;
    if (!video || !this.element) return;

    const containerRect = this.element.getBoundingClientRect();
    const clickX = event.clientX - containerRect.left - this.padding;
    const clickRatio = clickX / this.timelineWidth;
    let clickTime = clickRatio * video.duration;

    clickTime = Math.max(0, Math.min(clickTime, video.duration));

    const clickedOnSegment = this.app.segments.segments.some((s) =>
      s.contains(clickTime)
    );

    if (!clickedOnSegment) {
      if (!this.app.video.isLoopPaused) {
        this.app.video.isLoopPaused = true;
        this.update();
      }
    }

    video.currentTime = clickTime;
    this.updateIndicatorPosition();
  }

  updateIndicatorPosition() {
    if (
      this.isShown &&
      this.app.video.currentVideo &&
      this.element &&
      this.currentTimeIndicator
    ) {
      const video = this.app.video.currentVideo;
      const pos =
        this.padding +
        (video.currentTime / video.duration) * this.timelineWidth;
      this.currentTimeIndicator.setAttribute('x', pos);
    }
  }

  toggleShow() {
    if (this.isShown) this.hide();
    else this.show(true);
  }

  setupEventListeners() {
    this.boundMouseMove = (event) => {
      if (this.isDragging) {
        const now = Date.now();
        if (now - this.lastDragTime >= 30) {
          this.handleInteraction(event);
          this.lastDragTime = now;
        }
      }
    };
    this.boundMouseUp = () => {
      if (this.isDragging) {
        this.isDragging = false;
      }
    };
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  destroy() {
    this.hide();
    if (this.boundMouseMove) {
      document.removeEventListener('mousemove', this.boundMouseMove);
      document.removeEventListener('mouseup', this.boundMouseUp);
      this.boundMouseMove = null;
      this.boundMouseUp = null;
    }
    if (this.boundResize) {
      window.removeEventListener('resize', this.boundResize);
      this.boundResize = null;
    }
  }

  createTimelineDOM(video) {
    this.element = this.createTimeline(
      video,
      this.app.segments.segments,
      [10, 40, 5],
      [
        this.app.video.isLoopPaused
          ? 'rgba(100, 100, 100, 0.6)'
          : 'rgba(0, 255, 255, 0.7)',
        'rgba(255, 255, 255, 0.2)',
      ]
    );
    document.body.appendChild(this.element);
  }

  hideElement() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }

  checkLayoutShift(video) {
    if (!this.element) return;
    const domVideo = video._realElement || video;
    const rect = domVideo.getBoundingClientRect();

    if (!this._lastRect) {
      this._lastRect = rect;
      return;
    }

    // Detect if video size or position has drifted significantly
    const deltaW = Math.abs(rect.width - this._lastRect.width);
    const deltaH = Math.abs(rect.height - this._lastRect.height);
    const deltaX = Math.abs(rect.left - this._lastRect.left);
    const deltaY = Math.abs(rect.top - this._lastRect.top);

    if (deltaW > 5 || deltaH > 5 || deltaX > 5 || deltaY > 5) {
      this._lastRect = rect;
      this.reposition();
    }
  }

  reposition() {
    if (!this.isShown || !this.app.video.currentVideo) return;
    this.hideElement();
    this.createTimelineDOM(this.app.video.currentVideo);
    this.update();
  }

}

