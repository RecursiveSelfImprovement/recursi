class VideoLooper {
  constructor() {
    this.video = null;
    this.segments = null;
    this.timeline = null;
    this.infoBox = null;
    this.infoTimeout = null;
    this.volumeKeyListener = null;

    this._theater = {
      active: false,
      hiddenElements: null,
      prevBodyTransform: '',
      prevBodyTransformOrigin: '',
      prevBodyOverflow: '',
    };

    this._expandedState = null;
    this._videoClickListener = null;
    this._currentVideoForClick = null;
  }

  init(videoElement = null) {
    console.log(
      '%cVideoLooper: Init started',
      'background: #222; color: #bada55'
    );

    this.video = new VideoController(this);
    this.segments = new SegmentManager(this);
    this.timeline = new TimelineUI(this);

    this.setupStyles();

    const host = window.location.hostname;
    const isYouTube = host.includes('youtube.com') || host.includes('youtu.be');

    if (isYouTube) {
      try {
        this.createControlPanel();
      } catch (e) {}
    } else {
      this.setupKeystrokes();
    }

    this.video.init(videoElement);
  }

  setupStyles() {
    applyCss(
      `
      .info-box {
        position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.6);
        padding: 8px 12px; border-radius: 5px; font-family: monospace; font-size: 14px;
        opacity: 0; transition: opacity 0.5s; pointer-events: none; z-index: 9999999999999999;
      }
    `,
      'video-looper-styles'
    );
  }

  showInfo(text, duration = 3000) {
    if (!this.infoBox || !document.body.contains(this.infoBox)) {
      this.infoBox = makeElement('div', { className: 'info-box' });
      document.body.appendChild(this.infoBox);
    }
    this.infoBox.textContent = text;
    this.infoBox.style.opacity = '1';
    if (this.infoTimeout) clearTimeout(this.infoTimeout);
    this.infoTimeout = setTimeout(() => {
      if (this.infoBox) this.infoBox.style.opacity = '0';
    }, duration);
  }

  setupKeystrokes() {
    LooperKeystrokeHandler.addHandler('loop', () => this.segments.addSegment());
    LooperKeystrokeHandler.addHandler('pause', () =>
      this.video.toggleLoopPause()
    );
    LooperKeystrokeHandler.addHandler({ name: 'Play/Pause', key: ' ' }, () => {
      const vid = this.video.currentVideo;
      if (vid) {
        if (vid.paused) vid.play();
        else vid.pause();
      }
    });
    LooperKeystrokeHandler.addHandler(
      { name: 'Full Screen (Theater)', key: 'f' },
      () => this.toggleTheaterMode()
    );
    LooperKeystrokeHandler.addHandler({ name: 'Expand', key: 'e' }, () =>
      this.toggleExpandVideo()
    );
    LooperKeystrokeHandler.addHandler(
      { name: 'Volume Up', key: 'arrowup', suppressPopup: true },
      () => this.nudgeVolume(+1)
    );
    LooperKeystrokeHandler.addHandler(
      { name: 'Volume Down', key: 'arrowdown', suppressPopup: true },
      () => this.nudgeVolume(-1)
    );
    LooperKeystrokeHandler.addHandler(
      { name: 'Frame Back', key: 'arrowleft', suppressPopup: true },
      () => this.stepFrame(-1)
    );
    LooperKeystrokeHandler.addHandler(
      { name: 'Frame Fwd', key: 'arrowright', suppressPopup: true },
      () => this.stepFrame(+1)
    );
    LooperKeystrokeHandler.addHandler({ name: 'Volume', key: 'v' }, () =>
      this.enterVolumeMode()
    );
    LooperKeystrokeHandler.addHandler({ name: 'Trim Loop', key: 't' }, () =>
      this.trimSegment()
    );
    LooperKeystrokeHandler.addHandler(
      { name: 'Scrub Back <<', key: 'q', suppressPopup: true },
      () => this.video.scrub(-2 / 30)
    );
    LooperKeystrokeHandler.addHandler(
      { name: 'Scrub Fwd >', key: 'r', suppressPopup: true },
      () => this.video.scrub(1 / 30)
    );
    LooperKeystrokeHandler.addHandler(
      { name: 'Kill (End & Mute)', key: 'k' },
      () => this.jumpToEndAndMute()
    );
    LooperKeystrokeHandler.addHandler('wider', () =>
      this.segments.modifyCurrentDuration(1.5)
    );
    LooperKeystrokeHandler.addHandler('narrower', () =>
      this.segments.modifyCurrentDuration(1 / 1.5)
    );
    LooperKeystrokeHandler.addHandler('clear', () =>
      this.segments.clearCurrent()
    );
    LooperKeystrokeHandler.addHandler('show', () => this.timeline.toggleShow());
    LooperKeystrokeHandler.addHandler('jump', () => this.segments.jumpToNext());
    LooperKeystrokeHandler.addHandler('dump', () =>
      this.dumpState('Manual Dump')
    );
    LooperKeystrokeHandler.addHandler(
      { name: 'Set Repeat Count', key: '0-9' },
      (event) => {
        let count = parseInt(event.key);
        if (count === 0) count = 10;
        this.segments.setRepeatCount(count);
      }
    );
  }

  enterVolumeMode() {
    if (!this.video.currentVideo) {
      this.showInfo('No video loaded.', 2000);
      return;
    }
    LooperKeystrokeHandler.pause();
    this.showInfo('Enter Volume (0-9) or ESC', 4000);
    this.volumeKeyListener = (event) => {
      const key = event.key;
      if ((key >= '0' && key <= '9') || key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (key !== 'Escape') {
          const vid = this.video.currentVideo;
          const volumeLevel = parseInt(key) / 10;
          vid.volume = volumeLevel;
          this.showInfo(`Volume: ${Math.round(volumeLevel * 100)}%`, 1500);
        } else {
          this.showInfo('Volume entry cancelled', 1500);
        }
        this.exitVolumeMode();
      }
    };
    document.addEventListener('keydown', this.volumeKeyListener, true);
  }

  exitVolumeMode() {
    if (this.volumeKeyListener) {
      document.removeEventListener('keydown', this.volumeKeyListener, true);
      this.volumeKeyListener = null;
    }
    LooperKeystrokeHandler.resume();
  }

  trimSegment() {
    const video = this.video.currentVideo;
    if (!video || this.segments.segments.length === 0) {
      this.showInfo('No loop to trim.', 2000);
      return;
    }
    const currentTime = video.currentTime;
    const activeSegmentIndex = this.segments.segments.findIndex((s) =>
      s.contains(currentTime)
    );
    if (activeSegmentIndex !== -1) {
      const segment = this.segments.segments[activeSegmentIndex];
      const distToStart = Math.abs(currentTime - segment.times[0]);
      const distToEnd = Math.abs(currentTime - segment.times[1]);
      if (distToStart < distToEnd) {
        segment.times[0] = currentTime;
        this.showInfo(`Trimmed start of loop ${activeSegmentIndex + 1}.`, 2000);
      } else {
        segment.times[1] = currentTime;
        this.showInfo(`Trimmed end of loop ${activeSegmentIndex + 1}.`, 2000);
      }
    } else {
      let nearestSegment = null;
      let minDistance = Infinity;
      this.segments.segments.forEach((seg) => {
        const dist = Math.min(
          Math.abs(currentTime - seg.times[0]),
          Math.abs(currentTime - seg.times[1])
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestSegment = seg;
        }
      });
      if (nearestSegment) {
        if (currentTime < nearestSegment.times[0]) {
          nearestSegment.times[0] = currentTime;
          this.showInfo(`Extended start of nearest loop.`, 2000);
        } else {
          nearestSegment.times[1] = currentTime;
          this.showInfo(`Extended end of nearest loop.`, 2000);
        }
      }
    }
    this.segments.cleanupSegments();
    this.timeline.update();
  }

  dumpState(label) {
    const video = this.video.currentVideo;
    const isPlaying = video && !video.paused;
    const currentTime = video ? video.currentTime.toFixed(2) : 'N/A';
    const videoDuration = video ? video.duration.toFixed(2) : 'N/A';
    let stateString =
      `--- ${label} @ ${new Date().toLocaleTimeString()} ---\n` +
      `Video State: Playing: ${isPlaying} Time: ${currentTime} Dur: ${videoDuration}\n`;
    console.log(stateString);
    this.showInfo('State dumped to console.');
  }

  destroy() {
    if (this.timeline) this.timeline.destroy();
    if (this._theater && this._theater.active) {
      try {
        this.exitTheaterMode();
      } catch (_) {}
    }
    this.detachVideoClickHandler();
    if (this.controlBox && this.controlBox.parentNode) {
      this.controlBox.parentNode.removeChild(this.controlBox);
    }
    LooperKeystrokeHandler.destroy();
    if (this.infoBox) this.infoBox.remove();
    this.exitVolumeMode();
    console.log('VideoLooper destroyed.');
  }

  createControlPanel() {
    const buttons = [
      { text: 'L', title: 'Loop', cb: () => this.segments.addSegment() },
      { text: 'P', title: 'Pause', cb: () => this.video.toggleLoopPause() },
      { text: 'T', title: 'Trim', cb: () => this.trimSegment() },
      { text: 'F', title: 'Theater', cb: () => this.toggleTheaterMode() },
      { text: 'C', title: 'Clear', cb: () => this.segments.clearCurrent() },
      { text: '«', title: 'Frame Back', cb: () => this.stepFrame(-1) },
      { text: '»', title: 'Frame Fwd', cb: () => this.stepFrame(+1) },
      { text: '▲', title: 'Vol +', cb: () => this.nudgeVolume(+1) },
      { text: '▼', title: 'Vol -', cb: () => this.nudgeVolume(-1) },
      {
        text: '+',
        title: 'Expand',
        cb: () => this.segments.modifyCurrentDuration(1.5),
      },
      {
        text: '-',
        title: 'Shrink',
        cb: () => this.segments.modifyCurrentDuration(1 / 1.5),
      },
      { text: 'S', title: 'Timeline', cb: () => this.timeline.toggleShow() },
      { text: 'N', title: 'Next Loop', cb: () => this.segments.jumpToNext() },
    ];

    this.controlBox = makeElement('div', {
      id: 'video-looper-panel',
      style: {
        position: 'fixed',
        top: '0px',
        left: '200px',
        zIndex: '2147483647',
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        border: '1px solid #444',
        borderTop: 'none',
        borderRadius: '0 0 5px 5px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
        padding: '3px 5px',
        display: 'grid',
        gridTemplateColumns: 'repeat(13, 1fr)',
        gap: '3px',
        width: '420px',
        height: 'auto',
        cursor: 'move',
        fontFamily: 'sans-serif',
        userSelect: 'none',
      },
      title: 'Drag to move',
    });

    let isDragging = false;
    let offsetX, offsetY;

    this.controlBox.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('looper-btn')) return;
      e.preventDefault();
      isDragging = true;
      const rect = this.controlBox.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      const onMove = (em) => {
        if (!isDragging) return;
        this.controlBox.style.left = em.clientX - offsetX + 'px';
        this.controlBox.style.top = em.clientY - offsetY + 'px';
      };
      const onUp = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    buttons.forEach((btn) => {
      const b = makeElement(
        'div',
        {
          className: 'looper-btn',
          title: btn.title,
          style: {
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '0',
            width: '100%',
            height: '24px',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: '1px solid transparent',
            color: '#ddd',
            borderRadius: '3px',
            textAlign: 'center',
            lineHeight: '22px',
            transition: 'all 0.1s',
            userSelect: 'none',
          },
        },
        btn.text
      );

      b.addEventListener('mouseenter', () => {
        b.style.backgroundColor = '#444';
        b.style.color = '#fff';
      });
      b.addEventListener('mouseleave', () => {
        b.style.backgroundColor = 'transparent';
        b.style.color = '#ddd';
      });

      b.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (!this.video.currentVideo) {
          this.video.getVideo((v) => {
            if (v) {
              btn.cb();
              LooperKeystrokeHandler.showPopup(btn.title);
            } else alert('No video found.');
          });
        } else {
          btn.cb();
          LooperKeystrokeHandler.showPopup(btn.title);
        }
      });
      this.controlBox.appendChild(b);
    });

    if (document.body) document.body.appendChild(this.controlBox);
    else document.documentElement.appendChild(this.controlBox);
  }

  onVideoReady(videoAdapter) {
    if (!videoAdapter) return;
    const domElement = videoAdapter._realElement;
    if (this._currentVideoForClick === domElement && this._videoClickListener)
      return;
    this.detachVideoClickHandler();

    if (domElement.tagName === 'IFRAME') return;

    this._currentVideoForClick = domElement;
    this._videoClickListener = (e) => {
      if (e.target.tagName !== 'VIDEO') return;
      const vid =
        this.video && this.video.currentVideo
          ? this.video.currentVideo
          : videoAdapter;
      if (!vid) return;
      if (vid.paused) vid.play();
      else vid.pause();
    };

    if (domElement.addEventListener) {
      domElement.addEventListener('click', this._videoClickListener, false);
    }
  }

  detachVideoClickHandler() {
    if (this._currentVideoForClick && this._videoClickListener) {
      try {
        this._currentVideoForClick.removeEventListener(
          'click',
          this._videoClickListener,
          false
        );
      } catch (_) {}
    }
    this._currentVideoForClick = null;
    this._videoClickListener = null;
  }

  stepFrame(direction) {
    const vid = this.video ? this.video.currentVideo : null;
    if (!vid) {
      this.showInfo('No video loaded.', 1500);
      return;
    }
    if (!vid.paused) vid.pause();
    this.video.scrub((direction >= 0 ? 1 : -1) * (1 / 30));
    this.showInfo(`Frame: ${vid.currentTime.toFixed(3)}s`, 700);
  }

  nudgeVolume(direction) {
    const vid = this.video ? this.video.currentVideo : null;
    if (!vid) {
      this.showInfo('No video loaded.', 1500);
      return;
    }
    const delta = 0.05 * (direction >= 0 ? 1 : -1);
    let v = vid.volume + delta;
    if (v < 0) v = 0;
    if (v > 1) v = 1;
    vid.volume = v;
    this.showInfo(`Volume: ${Math.round(v * 100)}%`, 700);
  }

  findBestVideoElement() {
    if (
      window.projectApp &&
      window.projectApp.gt &&
      window.projectApp.gt.videoPlayer
    )
      return window.projectApp.gt.videoPlayer;
    if (
      window.VideoPlayer &&
      window.VideoPlayer.allPlayers &&
      window.VideoPlayer.allPlayers.length > 0
    )
      return window.VideoPlayer.allPlayers[0];

    const checkVisible = (el) => {
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      );
    };

    let videos = Array.from(document.querySelectorAll('video')).filter(
      checkVisible
    );
    if (videos.length > 0) {
      const playing = videos.find(
        (v) => !v.paused && !v.ended && v.readyState > 2
      );
      if (playing) return playing;
      let best = videos[0],
        bestArea = 0;
      for (let i = 0; i < videos.length; i++) {
        const area =
          videos[i].getBoundingClientRect().width *
          videos[i].getBoundingClientRect().height;
        if (area > bestArea) {
          bestArea = area;
          best = videos[i];
        }
      }
      return best;
    }

    let iframes = Array.from(
      document.querySelectorAll('iframe[src*="youtube.com"]')
    ).filter(checkVisible);
    if (iframes.length > 0) {
      let bestIframe = iframes[0],
        bestArea = 0;
      for (let i = 0; i < iframes.length; i++) {
        const area =
          iframes[i].getBoundingClientRect().width *
          iframes[i].getBoundingClientRect().height;
        if (area > bestArea) {
          bestArea = area;
          bestIframe = iframes[i];
        }
      }
      return bestIframe;
    }
    return null;
  }

  hideSiblingsAndTrack(element, hiddenElements) {
    if (!element || !element.style || this.isRecursiUI(element)) return;
    if (element.style.display !== 'none') {
      hiddenElements.push({ el: element, display: element.style.display });
      element.style.display = 'none';
    }
  }

  isolateAndHideSiblings(element, hiddenElements) {
    let current = element;
    while (current && current.parentNode && current !== document.body) {
      const parent = current.parentNode;
      const kids = Array.from(parent.children || []);
      for (let i = 0; i < kids.length; i++) {
        if (kids[i] !== current)
          this.hideSiblingsAndTrack(kids[i], hiddenElements);
      }
      current = parent;
    }
    if (current === document.body) {
      const bodyKids = Array.from(document.body.children || []);
      for (let i = 0; i < bodyKids.length; i++) {
        if (bodyKids[i] !== element && !bodyKids[i].contains(element))
          this.hideSiblingsAndTrack(bodyKids[i], hiddenElements);
      }
    }
  }

  scaleAndTranslateBodyToVideo(videoElement) {
    const viewportH = window.innerHeight;
    const videoRect = videoElement.getBoundingClientRect();
    if (!videoRect || !videoRect.height) return;
    const scaleFactor = viewportH / videoRect.height;
    const translateY = -videoRect.top;
    document.body.style.transform = `scale(${scaleFactor}) translateY(${translateY}px)`;
    document.body.style.transformOrigin = 'top center';
    document.body.style.overflow = 'hidden';
  }

  toggleTheaterMode() {
    if (this._theater && this._theater.active) this.exitTheaterMode();
    else this.enterTheaterMode();
  }

  enterTheaterMode() {
    const vidAdapter =
      this.video && this.video.currentVideo ? this.video.currentVideo : null;
    if (!vidAdapter) {
      this.showInfo('No video found for theater mode.', 2000);
      return;
    }
    const domEl = vidAdapter._realElement;
    if (!this._theater) {
      this._theater = {
        active: false,
        hiddenElements: null,
        prevBodyTransform: '',
        prevBodyTransformOrigin: '',
        prevBodyOverflow: '',
      };
    }
    if (this._theater.active) return;
    this._theater.prevBodyTransform = document.body.style.transform || '';
    this._theater.prevBodyTransformOrigin =
      document.body.style.transformOrigin || '';
    this._theater.prevBodyOverflow = document.body.style.overflow || '';
    this._theater.hiddenElements = [];
    this.isolateAndHideSiblings(domEl, this._theater.hiddenElements);
    this.scaleAndTranslateBodyToVideo(domEl);
    this._theater.active = true;
    this.showInfo('Theater mode ON', 1200);
    try {
      this.timeline.show(true);
    } catch (_) {}
  }

  exitTheaterMode() {
    if (!this._theater || !this._theater.active) return;
    document.body.style.transform = this._theater.prevBodyTransform || '';
    document.body.style.transformOrigin =
      this._theater.prevBodyTransformOrigin || '';
    document.body.style.overflow = this._theater.prevBodyOverflow || '';
    const arr = this._theater.hiddenElements;
    if (arr && arr.length) {
      for (let i = 0; i < arr.length; i++) {
        try {
          if (arr[i].el && arr[i].el.style)
            arr[i].el.style.display = arr[i].display;
        } catch (_) {}
      }
    }
    this._theater.hiddenElements = null;
    this._theater.active = false;
    this.showInfo('Theater mode OFF', 1200);
    try {
      this.timeline.show(true);
    } catch (_) {}
  }

  toggleExpandVideo() {
    if (this._expandedState) this.unexpandVideo();
    else this.expandVideo();
  }

  expandVideo() {
    const videoAdapter = this.video.currentVideo;
    if (!videoAdapter) {
      this.showInfo('No video to expand.');
      return;
    }
    if (this.controlBox) this.controlBox.classList.add('recursi-ui');
    if (this.infoBox) this.infoBox.classList.add('recursi-ui');
    const dom = videoAdapter._realElement;
    const state = {
      elements: [],
      hiddenSiblings: [],
      wasControlsEnabled: videoAdapter.controls,
    };
    const saveStyle = (el) => ({ el: el, style: el.getAttribute('style') });

    state.videoRecord = saveStyle(dom);
    dom.style.setProperty('position', 'fixed', 'important');
    dom.style.setProperty('top', '0', 'important');
    dom.style.setProperty('left', '0', 'important');
    dom.style.setProperty('width', '100vw', 'important');
    dom.style.setProperty('height', '100vh', 'important');
    dom.style.setProperty('max-width', 'none', 'important');
    dom.style.setProperty('max-height', 'none', 'important');
    dom.style.setProperty('margin', '0', 'important');
    dom.style.setProperty('padding', '0', 'important');
    if (dom.tagName === 'VIDEO')
      dom.style.setProperty('object-fit', 'contain', 'important');
    dom.style.setProperty('z-index', '2147483640', 'important');
    dom.style.setProperty('background-color', '#000', 'important');
    videoAdapter.controls = true;
    this.isolateAndHideSiblings(dom, state.hiddenSiblings);
    this._expandedState = state;
    this.showInfo('Expanded Video');
    if (this.timeline) {
      this.timeline.reposition();
      setTimeout(() => this.timeline.reposition(), 250);
    }
  }

  unexpandVideo() {
    if (!this._expandedState) return;
    const state = this._expandedState;
    if (state.videoRecord) {
      const rec = state.videoRecord;
      if (rec.style === null) rec.el.removeAttribute('style');
      else rec.el.setAttribute('style', rec.style);
      if (this.video && this.video.currentVideo) {
        this.video.currentVideo.controls = state.wasControlsEnabled;
      }
    }
    state.hiddenSiblings.forEach((rec) => {
      if (rec.el) rec.el.style.display = rec.display;
    });
    this._expandedState = null;
    this.showInfo('Unexpanded Video');
    if (this.timeline) this.timeline.reposition();
  }

  jumpToEndAndMute() {
    const video = this.video.currentVideo;
    if (!video) {
      this.showInfo('No video active.', 1500);
      return;
    }
    video.currentTime = Math.max(0, video.duration - 1);
    if (video.paused) video.play();
    this.showInfo('Jumped to End', 1500);
  }

  isRecursiUI(element) {
    if (!element) return false;
    if (
      element.classList &&
      (element.classList.contains('recursi-ui') ||
        element.classList.contains('keystroke-popup') ||
        element.classList.contains('info-box') ||
        element.id === 'video-looper-panel')
    )
      return true;
    if (
      this.timeline &&
      this.timeline.element &&
      element.contains(this.timeline.element)
    )
      return true;
    return false;
  }

}

