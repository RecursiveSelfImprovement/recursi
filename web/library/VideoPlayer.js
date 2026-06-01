class VideoPlayer {
  
  static allPlayers = [];

  constructor(options, callback) {
    this.options = options; // { container, containerId, playerType, ... }
    this.callback = callback || (() => {});
    this.player = null; // YT.Player or HTMLVideoElement

    // THE FIX: Prioritize direct element reference, fall back to ID
    if (options.container && options.container instanceof HTMLElement) {
      this.container = options.container;
    } else if (options.containerId) {
      this.container = document.getElementById(options.containerId);
    } else {
      this.container = null;
    }

    this.sacrificialElement = null; // For YouTube
    this.isReady = false;

    // Accurate Time State
    this.lastRealTime = 0;
    this.lastSysTime = 0;
    this.smoothingFactor =
      options.smoothingFactor !== undefined ? options.smoothingFactor : 8;
    this.playbackRate = 1;
    this.resetTimeNextTick = false; // Flag to signal reset on next getAccurateTime

    VideoPlayer.allPlayers.push(this); // Keep track if needed
    this.initPlayer();
  }

  initPlayer() {
    if (!this.container) {
      const id = this.options.containerId || '[No ID provided]';
      this.callback({
        type: 'error',
        player: this,
        data: { message: `Container element not found (ID: "${id}")` },
      });
      return;
    }
    this.container.innerHTML = '';

    if (this.options.playerType === 'youtube') {
      VideoPlayer.ensureYouTubeApiReadyHandler();

      if (!window.YT || !window.YT.Player) {
        window._ytApiReadyCallbacks.push(this.initYoutubePlayer.bind(this));

        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const tag = makeElement('script', { src: 'https://www.youtube.com/iframe_api' });
          document.body.appendChild(tag);
        }
      } else {
        this.initYoutubePlayer();
      }
    } else {
      this.initHtml5Player();
    }
  }

  static ensureYouTubeApiReadyHandler() {
    if (!window._ytApiReadyCallbacks) {
      window._ytApiReadyCallbacks = [];
    }

    // Return if we've already set up our custom wrapper
    if (
      window.onYouTubeIframeAPIReady &&
      window.onYouTubeIframeAPIReady._wrappedForVideoPlayer
    ) {
      return;
    }

    const existingReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      console.log('onYouTubeIframeAPIReady triggered (VideoPlayer wrapper)');

      // Call original if it exists
      if (
        existingReady &&
        typeof existingReady === 'function' &&
        !existingReady._wrappedForVideoPlayer
      ) {
        try {
          existingReady();
        } catch (e) {
          console.error('Error calling original onYouTubeIframeAPIReady:', e);
        }
      }

      // Process our internal queue
      if (window._ytApiReadyCallbacks) {
        // Create a copy to iterate, allowing the array to be cleared immediately
        // This prevents double-execution if a callback recursively adds another player
        const callbacksToRun = [...window._ytApiReadyCallbacks];
        window._ytApiReadyCallbacks = [];

        callbacksToRun.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error('Error in YT ready callback:', e);
          }
        });
      }
    };
    window.onYouTubeIframeAPIReady._wrappedForVideoPlayer = true;
  }

  initHtml5Player() {
    const video = makeElement('video', {
      src: this.options.videoId,
      style: { width: '100%', height: '100%', objectFit: 'contain', background: '#000' },
      autoplay: this.options.autoplay,
      controls: this.options.controls,
      preload: 'metadata',
    });
    this.container.appendChild(video);
    this.player = video;

    this._html5Listeners = [];
    const addListener = (event, handler) => {
      const boundHandler = handler.bind(this);
      this.player.addEventListener(event, boundHandler);
      this._html5Listeners.push({ event, handler: boundHandler });
    };

    if (this.options.startTime) {
      addListener('loadedmetadata', () => {
        if (this.player) this.player.currentTime = this.options.startTime;
      }, { once: true });
    }
    if (this.options.endTime) {
      addListener('timeupdate', () => {
        if (this.player && this.player.currentTime >= this.options.endTime) {
          this.player.pause();
          this.onPlayerStateChange({ data: YT?.PlayerState?.ENDED ?? 0, originalEvent: null, simulatedEnd: true });
        }
      });
    }

    addListener('loadedmetadata', (event) => {
      this.isReady = true;
      this.playbackRate = this.player?.playbackRate ?? 1;
      this._emitState({ type: 'ready', player: this, data: event });
    });
    var YT = YT || {};
    addListener('ended', (event) => this.onPlayerStateChange({ data: YT?.PlayerState?.ENDED ?? 0, originalEvent: event }));
    addListener('pause', (event) => this.onPlayerStateChange({ data: YT?.PlayerState?.PAUSED ?? 2, originalEvent: event }));
    addListener('play', (event) => this.onPlayerStateChange({ data: YT?.PlayerState?.PLAYING ?? 1, originalEvent: event }));
    addListener('playing', (event) => this.onPlayerStateChange({ data: YT?.PlayerState?.PLAYING ?? 1, originalEvent: event }));
    addListener('waiting', (event) => this.onPlayerStateChange({ data: YT?.PlayerState?.BUFFERING ?? 3, originalEvent: event }));

    addListener('seeking', (event) => {
      this.resetTimeNextTick = true;
    });
    addListener('seeked', (event) => {
      this.resetTimeNextTick = true;
      this._emitState({ type: 'seek', player: this, data: event });
    });
    addListener('ratechange', (event) => this.onPlayerPlaybackRateChange({ data: this.player?.playbackRate, originalEvent: event }));
    addListener('error', (event) => this.onPlayerError({ data: this.player?.error, originalEvent: event }));
  }

  onPlayerReady(event) {
    this.isReady = true;
    if (this.options.playerType === 'youtube' && event.target) {
      this.playbackRate = event.target.getPlaybackRate();
    } else if (this.options.playerType === 'html5' && this.player) {
      this.playbackRate = this.player.playbackRate;
    }
    this._startVolumeTracker();
    this._emitState({ type: 'ready', player: this, data: event });
  }

  onPlayerStateChange(event) {
    if (!this.player) return;

    const state = event.data;
    let stateType = '';
    let isPauseEvent = false;

    var YT = YT || {};
    const YT_PLAYING = YT?.PlayerState?.PLAYING ?? 1;
    const YT_PAUSED = YT?.PlayerState?.PAUSED ?? 2;
    const YT_ENDED = YT?.PlayerState?.ENDED ?? 0;
    const YT_BUFFERING = YT?.PlayerState?.BUFFERING ?? 3;
    const YT_CUED = YT?.PlayerState?.CUED ?? 5;

    switch (state) {
      case YT_PLAYING: stateType = 'play'; break;
      case YT_PAUSED: stateType = 'pause'; isPauseEvent = true; break;
      case YT_ENDED: stateType = 'end'; isPauseEvent = true; break;
      case YT_BUFFERING: stateType = 'buffering'; isPauseEvent = true; break;
      case YT_CUED: stateType = 'cue'; isPauseEvent = true; break;
      case 'ended_manual':
      case event.simulatedEnd ? YT_ENDED : -99:
        stateType = 'end'; isPauseEvent = true; break;
      default: stateType = 'unknown'; break;
    }

    if (stateType === 'unknown') return;

    if (stateType === 'end' && this.options.playerType === 'youtube') {
      if (this.player && typeof this.player.stopVideo === 'function') {
        this.player.stopVideo();
      }
    }

    if (isPauseEvent) {
      this.resetTimeNextTick = true;
    }

    this._emitState({ type: stateType, player: this, data: event });
  }

  onPlayerPlaybackRateChange(event) {
    if (!this.player) return;
    const newRate = this.options.playerType === 'youtube' ? event.data : this.player.playbackRate;
    if (newRate !== this.playbackRate) {
      this.playbackRate = newRate;
      this.resetTimeNextTick = true;
      this._emitState({ type: 'ratechange', player: this, data: { rate: newRate } });
    }
  }

  onPlayerError(event) {
    this._emitState({ type: 'error', player: this, data: event.data });
  }

  getCurrentRawTime() {
    if (!this.player || !this.isReady) return 0;
    try {
      if (this.options.playerType === 'youtube') {
        // Check if player object and method exist
        return this.player && typeof this.player.getCurrentTime === 'function'
          ? this.player.getCurrentTime() || 0
          : 0;
      } else {
        return this.player.currentTime || 0;
      }
    } catch (e) {
      // Player might be destroyed or in a bad state
      // Avoid logging excessively if destroyed
      if (this.player) {
        console.warn('VideoPlayer: Error getting raw time', e);
      }
      return this.lastRealTime || 0; // Return last known good time
    }
  }

  getAccurateTime() {
    let out = { time: 0, isReset: false };
    // Return early if player is gone or not ready
    if (!this.player || !this.isReady) {
      // If player is gone, use last known time but signal reset?
      if (!this.player && this.lastRealTime > 0) {
        out.time = this.lastRealTime;
        out.isReset = true; // Signal reset as state is invalid
        return out;
      }
      return out; // Otherwise return 0
    }

    const apiTime = this.getCurrentRawTime();
    const sysTime = performance.now(); // Use performance.now() for higher resolution
    let realTime;

    if (this.resetTimeNextTick) {
      realTime = apiTime;
      out.isReset = true;
      this.resetTimeNextTick = false; // Consume the flag
      // console.log("AccurateTime: Resetting to API time", apiTime.toFixed(3));
    } else if (this.lastRealTime !== 0 && this.lastSysTime !== 0) {
      // Ensure we have previous values
      const elapsedSys = (sysTime - this.lastSysTime) / 1000.0; // seconds
      // If system time jumped backward or forward significantly, reset
      if (elapsedSys < -0.5 || elapsedSys > 5.0) {
        realTime = apiTime;
        out.isReset = true;
        console.log(
          `AccurateTime: Resetting due to system time jump: ${elapsedSys.toFixed(
            3
          )}s`
        );
      } else {
        const elapsedVideoExpected = elapsedSys * this.playbackRate; // Rate applied correctly here
        const estimatedTime = this.lastRealTime + elapsedVideoExpected;

        // Check for large discrepancies (seek, buffer, pause/resume lag)
        const apiDiff = Math.abs(apiTime - estimatedTime);
        const tolerance = 0.5; // seconds tolerance - adjust if needed

        // Reset if API time differs too much from prediction OR if API time jumped significantly on its own
        const apiJump = Math.abs(apiTime - this.lastRealTime);
        // Reset if diff > tolerance OR (api jumped significantly AND prediction is lagging)
        // This helps catch up after buffering/lag where prediction might be slow
        if (
          apiDiff > tolerance ||
          (apiJump > tolerance * 1.5 && apiTime > estimatedTime)
        ) {
          realTime = apiTime;
          out.isReset = true;
          // console.log(`AccurateTime: Resetting - Discrepancy. apiDiff=${apiDiff.toFixed(3)}, apiJump=${apiJump.toFixed(3)}, api=${apiTime.toFixed(3)}, est=${estimatedTime.toFixed(3)}`);
        } else {
          // Smooth: Weighted average
          realTime =
            (estimatedTime * this.smoothingFactor + apiTime) /
            (this.smoothingFactor + 1);

          // Clamp time to known duration if available? Maybe not, can cause issues near end.
          // const duration = this.getDuration();
          // if (duration && realTime > duration) realTime = duration;
          if (realTime < 0) realTime = 0; // Ensure non-negative time
        }
      }
    } else {
      // First time called or after a manual reset
      realTime = apiTime;
      out.isReset = true;
      // console.log("AccurateTime: Initializing time", apiTime.toFixed(3));
    }

    // Update state for next call
    this.lastSysTime = sysTime;
    this.lastRealTime = realTime;
    out.time = realTime;

    // Debug logging (optional)
    // if (!out.isReset) {
    //     console.log(`AccurateTime: api=${apiTime.toFixed(3)}, est=${(this.lastRealTime + ((performance.now() - this.lastSysTime)/1000.0*this.playbackRate)).toFixed(3)}, real=${realTime.toFixed(3)}`);
    // }

    return out;
  }

  resetAccurateTime() {
    this.lastRealTime = 0;
    this.lastSysTime = 0;
    this.resetTimeNextTick = true;
  }

  loadVideo(videoId, startTime = 0) {
    if (!this.isReady && this.options.playerType === 'youtube' && (!window.YT || !window.YT.Player)) {
      window._ytApiReadyCallbacks.push(() => this.loadVideo(videoId, startTime));
      VideoPlayer.ensureYouTubeApiReadyHandler();
      return;
    }
    if (this.options.playerType === 'html5' && this.player && !this.isReady) {
      const loadHandler = () => { this.loadVideo(videoId, startTime); };
      this.player.addEventListener('loadedmetadata', loadHandler, { once: true });
      return;
    }
    if (!this.player && !this.sacrificialElement) return;
    if (this.options.playerType === 'youtube' && !this.player) {
      window._ytApiReadyCallbacks.push(() => this.loadVideo(videoId, startTime));
      VideoPlayer.ensureYouTubeApiReadyHandler();
      return;
    }

    this.options.videoId = videoId;
    this.options.startTime = startTime;
    this.resetAccurateTime();

    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.loadVideoById === 'function') {
          this.player.loadVideoById({ videoId: videoId, startSeconds: startTime });
        }
      } else {
        if (this.player) {
          this.player.src = videoId;
          this.player.load();
          const metaListener = () => { if (this.player) this.player.currentTime = startTime; };
          this.player.addEventListener('loadedmetadata', metaListener, { once: true });
          this.player.pause();
          this.onPlayerStateChange({ data: YT?.PlayerState?.PAUSED ?? 2, originalEvent: null });
        }
      }
    } catch (e) {
      this.callback({ type: 'error', player: this, data: { message: 'Failed to load video', error: e } });
    }
  }

  play() {
    if (!this.player || !this.isReady) return;
    this.resetAccurateTime();
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.playVideo === 'function') {
          this.player.playVideo();
        }
      } else {
        this.player.play().catch((error) => {
          this.callback({ type: 'error', player: this, data: { message: 'Autoplay likely blocked', error: error } });
          this.onPlayerStateChange({ data: YT?.PlayerState?.PAUSED ?? 2, originalEvent: null });
        });
      }
    } catch (e) {}
  }

  pause() {
    if (!this.player || !this.isReady) return;
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.pauseVideo === 'function') {
          this.player.pauseVideo();
        }
      } else {
        this.player.pause();
      }
    } catch (e) {}
  }

  stop() {
    if (!this.player || !this.isReady) return;
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.pauseVideo === 'function' && typeof this.player.seekTo === 'function') {
          this.player.pauseVideo();
          this.player.seekTo(this.options.startTime || 0, true);
        }
      } else {
        this.player.pause();
        this.player.currentTime = this.options.startTime || 0;
      }
    } catch (e) {}
    this.resetAccurateTime();
  }

  seekTo(time) {
    if (!this.player || !this.isReady) return;
    this.resetAccurateTime();
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.seekTo === 'function') {
          this.player.seekTo(time, true);
        }
      } else {
        this.player.currentTime = time;
      }
    } catch (e) {}
  }

  setPlaybackRate(rate) {
    if (!this.player || !this.isReady) return;
    const clampedRate = Math.max(0.25, Math.min(rate, 4));
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.setPlaybackRate === 'function') {
          this.player.setPlaybackRate(clampedRate);
        }
      } else {
        this.player.playbackRate = clampedRate;
        this.onPlayerPlaybackRateChange({ data: clampedRate });
      }
    } catch (e) {}
  }

  getPlaybackRate() {
    // Return internal tracked rate for consistency, updated by events/calls
    return this.playbackRate;
  }

  setVolume(level) {
    if (!this.player || !this.isReady) return;
    const clampedLevel = Math.max(0, Math.min(level, 100));
    
    console.log(`[Volume] User intentionally set volume to ${clampedLevel}`);
    this.expectedVolume = clampedLevel;

    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.setVolume === 'function') {
          this.player.setVolume(clampedLevel);
        }
      } else {
        this.player.volume = clampedLevel / 100.0;
      }
    } catch (e) {}
  }

  getVolume() {
    // Return level 0-100
    if (!this.player || !this.isReady) return 100;
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.getVolume === 'function') {
          return this.player.getVolume();
        } else {
          console.error(
            'VideoPlayer: YT player missing or getVolume not ready.'
          );
          return 100;
        }
      } else {
        // HTML5
        return Math.round(this.player.volume * 100);
      }
    } catch (e) {
      console.error('VideoPlayer: Error getting volume', e);
      return 100;
    }
  }

  mute() {
    if (!this.player || !this.isReady) return;
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.mute === 'function') this.player.mute();
      } else this.player.muted = true;
    } catch (e) {}
  }

  unMute() {
    if (!this.player || !this.isReady) return;
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.unMute === 'function') this.player.unMute();
      } else this.player.muted = false;
    } catch (e) {}
  }

  isMuted() {
    if (!this.player || !this.isReady) return false;
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.isMuted === 'function')
          return this.player.isMuted();
        else {
          console.error('VideoPlayer: YT player missing or isMuted not ready.');
          return false;
        }
      } else return this.player.muted;
    } catch (e) {
      console.error('VideoPlayer: Error checking if muted', e);
      return false;
    }
  }

  getDuration() {
    if (!this.player || !this.isReady) return 0;
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.getDuration === 'function') {
          return this.player.getDuration() || 0;
        } else {
          console.error(
            'VideoPlayer: YT player missing or getDuration not ready.'
          );
          return 0;
        }
      } else {
        // HTML5
        // duration can be NaN or Infinity before loadedmetadata
        return Number.isFinite(this.player.duration) ? this.player.duration : 0;
      }
    } catch (e) {
      console.error('VideoPlayer: Error getting duration', e);
      return 0;
    }
  }

  isPlaying() {
    if (!this.player || !this.isReady) return false;
    try {
      if (this.options.playerType === 'youtube') {
        if (this.player && typeof this.player.getPlayerState === 'function') {
          const state = this.player.getPlayerState();
          const YT_PLAYING = YT?.PlayerState?.PLAYING ?? 1;
          return state === YT_PLAYING;
        } else {
          console.error(
            'VideoPlayer: YT player missing or getPlayerState not ready.'
          );
          return false;
        }
      } else {
        // HTML5
        // Check both paused and ended states
        return !(this.player.paused || this.player.ended);
      }
    } catch (e) {
      console.error('VideoPlayer: Error getting playing state', e);
      return false;
    }
  }

  getVideoDimensions() {
    if (!this.container) return { width: 0, height: 0, top: 0, left: 0 };
    const rect = this.container.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
    };
  }

  setSize(width, height) {
    if (!this.container) return;
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;
    if (this.options.playerType === 'youtube' && this.player && typeof this.player.setSize === 'function') {
      try { this.player.setSize(width, height); } catch (e) {}
    }
  }

  destroy() {
    this._stopPausedPolling?.();
    if (this._volPoller) {
      clearInterval(this._volPoller);
      this._volPoller = null;
    }
    VideoPlayer.allPlayers = VideoPlayer.allPlayers.filter((p) => p !== this);
    if (this.options.playerType === 'html5' && this.player && this._html5Listeners) {
      this._html5Listeners.forEach(({ event, handler }) => {
        this.player.removeEventListener(event, handler);
      });
      this._html5Listeners = [];
    }
    if (this.player && typeof this.player.destroy === 'function') {
      try { this.player.destroy(); } catch (e) {}
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.player = null;
    this.container = null;
    this.callback = () => {};
    this.isReady = false;
    this.sacrificialElement = null;
  }


  initYoutubePlayer() {
    if (!this.container) return;
    if (this.player) return;

    this.sacrificialElement = makeElement('div');
    this.container.appendChild(this.sacrificialElement);

    const playerVars = {
      autoplay: this.options.autoplay ? 1 : 0,
      controls: this.options.controls ? 1 : 0,
      start: this.options.startTime,
      end: this.options.endTime,
      rel: 0,
      showinfo: 0,
      playsinline: 1,
      iv_load_policy: 3,
      disablekb: 1,
    };

    try {
      this.player = new YT.Player(this.sacrificialElement, {
        width: this.options.width || '100%',
        height: this.options.height || '100%',
        videoId: this.options.videoId,
        playerVars: playerVars,
        events: {
          onReady: (event) => this.onPlayerReady(event),
          onStateChange: (event) => this.onPlayerStateChange(event),
          onPlaybackRateChange: (event) => this.onPlayerPlaybackRateChange(event),
          onError: (event) => this.onPlayerError(event),
        },
      });
    } catch (error) {
      this.callback({
        type: 'error',
        player: this,
        data: { message: 'Failed to create YT Player', error: error },
      });
    }
  }

  _startPausedPolling() {
    this._stopPausedPolling();
    this._pausedPollerLastSec = this.getCurrentRawTime();

    this._pausedPoller = setInterval(() => {
      try {
        if (!this.player || !this.isReady) {
          return this._stopPausedPolling();
        }
        const YT_PLAYING = window.YT?.PlayerState?.PLAYING ?? 1;
        if (this.player.getPlayerState && this.player.getPlayerState() === YT_PLAYING) {
          return this._stopPausedPolling();
        }
        const nowSec = this.getCurrentRawTime();
        if (Math.abs(nowSec - this._pausedPollerLastSec) > 0.15) {
          this.lastRealTime = nowSec;
          this.lastSysTime = performance.now();
          this.resetTimeNextTick = true;
          this._pausedPollerLastSec = nowSec;
          try {
            this._emitState?.({ type: 'seeked', player: this });
          } catch {}
        }
      } catch (e) {
        this._stopPausedPolling();
      }
    }, 150);
  }

  _stopPausedPolling() {
    if (this._pausedPoller) {
      clearInterval(this._pausedPoller);
      this._pausedPoller = null;
    }
  }

  _emitState(evt) {
    const t = (evt?.type || '').toLowerCase();
    this._lastKnownState = t;
    if (
      t === 'paused' ||
      t === 'pause' ||
      t === 'unstarted' ||
      t === 'cue' ||
      t === 'ready' ||
      t === 'end' ||
      t === 'buffering'
    ) {
      this._startPausedPolling();
    }
    if (t === 'play' || t === 'playing') {
      this._stopPausedPolling();
    }
    try {
      this.callback?.(evt);
    } catch (e) {
      console.error('VideoPlayer _emitState handler error:', e);
    }
  }

  _startVolumeTracker() {
    if (this._volPoller) return;
    this.expectedVolume = this.getVolume();
    this._volPoller = setInterval(() => {
      if (!this.isReady || !this.player) return;
      const currentVol = this.getVolume();
      if (currentVol !== undefined && currentVol !== this.expectedVolume) {
        console.log(`[Volume] Volume was changed externally (e.g. by YouTube control) from ${this.expectedVolume} to ${currentVol}`);
        this.expectedVolume = currentVol;
      }
    }, 1000);
  }
}