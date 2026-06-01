class VideoAdapter {
  constructor(source, onTimeUpdate) {
    this.source = source;
    this.isIframe = source && source.tagName === 'IFRAME';
    this.isCustom = source && typeof source.getCurrentRawTime === 'function';
    this.isNative = !this.isIframe && !this.isCustom;

    this.ytPlayer = null;
    this.ytReady = false;
    this.ytPaused = true;
    this.ytDuration = 0;

    this._timeupdateCb = onTimeUpdate;
    this._timer = null;

    if (this.isIframe) {
      this._initYT();
    } else if (this.isNative) {
      this.source.addEventListener('timeupdate', () => {
        if (this._timeupdateCb) this._timeupdateCb();
      });
    } else if (this.isCustom) {
      this._timer = setInterval(() => {
        if (!this.paused && this._timeupdateCb) this._timeupdateCb();
      }, 50);
    }
  }

  set ontimeupdate(cb) {
    this._timeupdateCb = cb;
  }

  _initYT() {
    if (!this.source.src.includes('enablejsapi=1')) {
      this.source.src +=
        (this.source.src.includes('?') ? '&' : '?') + 'enablejsapi=1';
    }
    const init = () => {
      this.ytPlayer = new window.YT.Player(this.source, {
        events: {
          onReady: () => {
            this.ytReady = true;
            this.ytDuration = this.ytPlayer.getDuration();
            this._timer = setInterval(() => {
              if (!this.paused && this._timeupdateCb) this._timeupdateCb();
            }, 50);
          },
          onStateChange: (e) => {
            this.ytPaused = e.data !== window.YT.PlayerState.PLAYING;
          },
        },
      });
    };
    if (window.YT && window.YT.Player) init();
    else {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(s);
      const old = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (old) old();
        init();
      };
    }
  }

  get currentTime() {
    if (this.isNative) return this.source.currentTime;
    if (this.isIframe)
      return this.ytReady ? this.ytPlayer.getCurrentTime() || 0 : 0;
    if (this.isCustom)
      return this.source.getAccurateTime
        ? this.source.getAccurateTime().time
        : this.source.getCurrentRawTime();
    return 0;
  }

  set currentTime(val) {
    if (this.isNative) this.source.currentTime = val;
    else if (this.isIframe) {
      if (this.ytReady) this.ytPlayer.seekTo(val, true);
    } else if (this.isCustom) this.source.seekTo(val);
  }

  get duration() {
    if (this.isNative) return this.source.duration;
    if (this.isIframe)
      return this.ytReady ? this.ytPlayer.getDuration() || 0 : 0;
    if (this.isCustom) return this.source.getDuration();
    return 0;
  }

  get paused() {
    if (this.isNative) return this.source.paused;
    if (this.isIframe) return this.ytPaused;
    if (this.isCustom) return !this.source.isPlaying();
    return true;
  }

  play() {
    if (this.isNative) this.source.play();
    else if (this.isIframe) {
      if (this.ytReady) this.ytPlayer.playVideo();
    } else if (this.isCustom) this.source.play();
  }

  pause() {
    if (this.isNative) this.source.pause();
    else if (this.isIframe) {
      if (this.ytReady) this.ytPlayer.pauseVideo();
    } else if (this.isCustom) this.source.pause();
  }

  get volume() {
    if (this.isCustom) return this.source.getVolume() / 100;
    if (this.isIframe && this.ytReady) return this.ytPlayer.getVolume() / 100;
    return this.source.volume;
  }

  set volume(val) {
    if (this.isCustom) this.source.setVolume(val * 100);
    else if (this.isIframe && this.ytReady) this.ytPlayer.setVolume(val * 100);
    else if (this.isNative) this.source.volume = val;
  }

  get controls() {
    if (this.isCustom) return !!this.source.options?.controls;
    return this.source.controls;
  }

  set controls(val) {
    if (this.isNative) this.source.controls = val;
  }

  getBoundingClientRect() {
    return this.isCustom && this.source.container
      ? this.source.container.getBoundingClientRect()
      : this.source.getBoundingClientRect();
  }

  get style() {
    return this.isCustom && this.source.container
      ? this.source.container.style
      : this.source.style;
  }

  get _realElement() {
    return this.isCustom && this.source.container
      ? this.source.container
      : this.source;
  }

  addEventListener(e, cb, opts) {
    this._realElement.addEventListener(e, cb, opts);
  }
  removeEventListener(e, cb, opts) {
    this._realElement.removeEventListener(e, cb, opts);
  }
  setAttribute(k, v) {
    this._realElement.setAttribute(k, v);
  }
  removeAttribute(k) {
    this._realElement.removeAttribute(k);
  }

  destroy() {
    if (this._timer) clearInterval(this._timer);
  }
}

class VideoController {
  constructor(app) {
    this.app = app;
    this.currentVideo = null; // This will hold the adapter
    this.currentAdapter = null;
    this.isLoopPaused = true;
    this.currentPlayCount = 0;
  }

  init(videoElement = null) {
    if (videoElement) {
      this.setCurrentVideo(videoElement);
    } else {
      this.getVideo((video) => {
        if (video) {
          this.setCurrentVideo(video); // Passes adapter
        }
      });
    }
  }

  setCurrentVideo(videoElement) {
    if (this.currentAdapter) {
      this.currentAdapter.destroy();
    }

    // Check if it's already an adapter
    const source = videoElement._realElement
      ? videoElement.source
      : videoElement;

    this.currentAdapter = new VideoAdapter(source);
    this.currentVideo = this.currentAdapter;

    this.app.timeline.show(true);
    this.currentVideo.ontimeupdate = this.handleLoop.bind(this);

    if (this.app && typeof this.app.onVideoReady === 'function') {
      try {
        this.app.onVideoReady(this.currentVideo);
      } catch (e) {
        console.warn('VideoController: onVideoReady callback failed', e);
      }
    }
  }

  scrub(amount, callback) {
    if (this.currentVideo) {
      this.currentVideo.currentTime += amount;
      this.handleLoop(callback);
    }
  }

  handleLoop(callback) {
    if (
      this.isLoopPaused ||
      !this.currentVideo ||
      this.app.segments.segments.length === 0
    ) {
      if (typeof callback === 'function') callback();
      return;
    }

    const currentTime = this.currentVideo.currentTime;
    const segments = this.app.segments.segments;

    const activeIndex = segments.findIndex((s) => s.contains(currentTime));

    if (activeIndex !== -1 && activeIndex !== this.app.segments.currentIndex) {
      this.app.segments.currentIndex = activeIndex;
      this.currentPlayCount = 0;
      if (typeof callback === 'function') callback();
      return;
    }

    const currentIndex = this.app.segments.currentIndex;
    if (currentIndex >= segments.length) {
      this.app.segments.currentIndex = 0;
      return;
    }

    const currentSegment = segments[currentIndex];

    if (currentTime >= currentSegment.times[1]) {
      if (this.currentPlayCount < currentSegment.repeatCount - 1) {
        this.currentPlayCount++;
        this.currentVideo.currentTime = currentSegment.times[0];
      } else {
        this.currentPlayCount = 0;
        const nextIndex = (currentIndex + 1) % segments.length;
        this.app.segments.currentIndex = nextIndex;
        this.currentVideo.currentTime = segments[nextIndex].times[0];
      }
    } else if (currentTime < currentSegment.times[0] && activeIndex === -1) {
      const nextSegmentIndex = segments.findIndex(
        (s) => s.times[0] > currentTime
      );

      if (nextSegmentIndex !== -1) {
        this.app.segments.currentIndex = nextSegmentIndex;
        this.currentVideo.currentTime = segments[nextSegmentIndex].times[0];
      } else if (segments.length > 0) {
        this.app.segments.currentIndex = 0;
        this.currentVideo.currentTime = segments[0].times[0];
      }
    }

    if (typeof callback === 'function') callback();
  }

  toggleLoopPause() {
    this.isLoopPaused = !this.isLoopPaused;
    this.getVideo((videoAdapter) => {
      if (!this.isLoopPaused && videoAdapter && videoAdapter.paused) {
        videoAdapter.play();
      }
    });
    this.app.timeline.update();
    this.app.dumpState('Toggle Loop Pause');
  }

  getVideo(callback) {
    const isVisible = (v) => {
      if (!v) return false;
      const el = v._realElement || v;
      if (!el.getBoundingClientRect) return true; // Custom wrappers might not have it exposed directly here
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        window.getComputedStyle(el).display !== 'none' &&
        window.getComputedStyle(el).visibility !== 'hidden'
      );
    };

    if (!this.currentVideo || !isVisible(this.currentVideo)) {
      let bestSource = null;

      if (this.app && typeof this.app.findBestVideoElement === 'function') {
        bestSource = this.app.findBestVideoElement();
      }

      if (!bestSource) {
        if (
          window.projectApp &&
          window.projectApp.gt &&
          window.projectApp.gt.videoPlayer
        ) {
          bestSource = window.projectApp.gt.videoPlayer;
        } else if (
          window.VideoPlayer &&
          window.VideoPlayer.allPlayers &&
          window.VideoPlayer.allPlayers.length > 0
        ) {
          bestSource = window.VideoPlayer.allPlayers[0];
        }
      }

      if (!bestSource) {
        const all = Array.from(document.querySelectorAll('video'));
        bestSource =
          all.find((v) => isVisible(v) && !v.paused) ||
          all.find((v) => isVisible(v));
      }

      if (bestSource) {
        if (!this.currentAdapter || this.currentAdapter.source !== bestSource) {
          console.log(
            '[VideoController] Auto-switching to visible video source'
          );
          this.setCurrentVideo(bestSource);
        }
      }
    }

    callback(this.currentVideo);
  }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 348,
  "provides": [
    "VideoAdapter"
  ],
  "deps": []
}
recursi-meta */
