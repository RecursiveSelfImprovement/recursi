class GlowTunesPlayer {

      initCoreComponents() {
    if (!VideoEventScheduler.isInitialized) {
      VideoEventScheduler.init(EventHandlers);
    }
    this.synchronizer = new Synchronizer();
    this.synchronizer.registerTimeUpdateCallback(
      this.handleTimeUpdate.bind(this)
    );
    this.instruments = new InstrumentSounds({basePath: this.basePath});
    this.instruments.load().catch((err) => console.error(err));

    this.pianoVisuals = new PianoVisuals({
      mode: this.config.visualsMode,
      basePath: this.basePath,
    });
    this.karaokeDisplay = new KaraokeDisplay(this.notesContainer);
  }

  handlePlayerStateUpdate(state) {
      if (!this.videoPlayer || state.player !== this.videoPlayer) return;
      const type = (state.type || '').toLowerCase();

      if (this.onStateChange) this.onStateChange(state);

      if (['play', 'playing'].includes(type)) {
        this.instruments?.resumeContext();
      }

      const snapOnce = () => {
        try {
          const accurateTime = this.videoPlayer?.getAccurateTime?.();
          if (!accurateTime) return;
          const nowMs = (accurateTime.time ?? 0) * 1000;

          // Primary: tell pianoVisuals to set time with forcePosition=true.
          this.pianoVisuals?.setTime?.(nowMs, 0, true);
          this.karaokeDisplay?.setTime(nowMs, true); // Snap immediately after seeking or pausing

          // Backup: force-refresh every FlyingBars container regardless of visibility state.
          if (this.pianoVisuals?.forceRefreshFlyingBars) {
            this.pianoVisuals.forceRefreshFlyingBars(nowMs);
          } else {
            const fb = this.pianoVisuals?.flyingBars;
            if (fb && fb.containerList) {
              Object.values(fb.containerList).forEach((nc) => {
                if (nc) {
                  try {
                    nc.setTime(nowMs, 0, true);
                  } catch (e) {}
                }
              });
            }
          }
        } catch (e) {}
      };

      switch (type) {
        case 'ready': {
          if (this._pendingSeekTime !== undefined) {
            this.seekTo(this._pendingSeekTime);
            this._pendingSeekTime = undefined;
          }

          if (this.initialSettings) {
            this.syncSettings(this.initialSettings).then(() => {
              if (this.onStateChange) {
                this.onStateChange({
                  type: 'settings-restored',
                  player: this.videoPlayer,
                });
              }
            });
            this.initialSettings = null;
          }

          if (this.pianoVisuals?.updateLayout()) {
            this.pianoVisuals.init(this.videoPlayer);

            const veqData = window.VideoEventQueueClass?.current;
            const hasNotes =
              veqData &&
              veqData.timedEvents &&
              veqData.timedEvents.length > 0 &&
              veqData.timedEvents.some((e) => e.type === 'note');

            if (hasNotes) {
              this.pianoVisuals.loadVeq(veqData);
              this.pianoVisuals.show();
              this.karaokeDisplay?.loadVeq(veqData);
              this.synchronizer.loadVEQ(veqData);
            } else {
              this.pianoVisuals.hide();
              this.pianoVisuals.loadVeq(null);
              this.karaokeDisplay?.loadVeq(null);
              this.synchronizer.unloadVEQ();
            }
            snapOnce();
          }
          break;
        }
        case 'pause':
        case 'paused':
        case 'end':
        case 'buffering':
        case 'seek':
        case 'seeking':
        case 'seeked':
          this.handleTransportCleanup();
          snapOnce();
          // Double-snap after a frame to catch YT's delayed time update.
          requestAnimationFrame(() => snapOnce());
          break;
      }
      this.synchronizer?.handlePlayerStateChange(state);
    }

  handleTimeUpdate(time, isPlaying, isReset) {
      if (isPlaying || isReset) {
        const timeMs = Math.max(0, time * 1000);

        // SMOOTH SCROLL FIX:
        // We animate toward the position the bar should occupy exactly TRANSITION_MS
        // from now. Because the transition duration equals the lookahead, the bar's
        // velocity matches real-time velocity, and it arrives at the action bar
        // precisely when the note should play. Retargeting every tick keeps it
        // locked on without backwards jitter.
        const TRANSITION_MS = 1500;

        let targetTimeMs;
        let animationDurationMs;

        if (isReset) {
          targetTimeMs = timeMs;
          animationDurationMs = 0;
        } else {
          targetTimeMs = timeMs + TRANSITION_MS;
          animationDurationMs = TRANSITION_MS;
        }

        this.pianoVisuals?.setTime?.(targetTimeMs, animationDurationMs, isReset);
        this.karaokeDisplay?.setTime(timeMs, isReset); // Propagate isReset for tick smoothing
      }

      for (const callback of this._timeUpdateCallbacks) {
        try {
          callback(time, isPlaying, isReset);
        } catch (e) {
          console.error('Error in external time update callback:', e);
        }
      }
    }

  _determinePlayerOptions(source) {
    let playerType = 'youtube';
    let videoId = source;
    source = source.trim();
    const ytUrlRegex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*?[?&]v=)|youtu\.be\/)([^"&?\/ \s]{11})/;
    const ytMatch = source.match(ytUrlRegex);
    const ytIdRegex = /^[a-zA-Z0-9_-]{11}$/;
    const videoFileRegex = /\.(mp4|webm|ogg|mov)($|\?)/i;

    if (
      videoFileRegex.test(source) ||
      (source.startsWith('http') && !ytMatch)
    ) {
      playerType = 'html5';
    } else if (ytMatch && ytMatch[1]) {
      videoId = ytMatch[1];
    }

    return {playerType, videoId};
  }

  play() {
    this.videoPlayer?.play();
  }

  pause() {
    this.videoPlayer?.pause();
  }

  seekTo(timeInSeconds) {
    if (this.videoPlayer && this.videoPlayer.isReady) {
      this.videoPlayer.seekTo(timeInSeconds);
    } else {
      this._pendingSeekTime = timeInSeconds;
    }
  }

  setInstrumentVolume(level) {
    this.instruments?.setVolume(level);
  }

  async setInstrument(instrumentName) {
    this.handleTransportCleanup();
    if (this.instruments)
      await this.instruments.setActiveInstrument(instrumentName);
  }

  getAvailableInstruments() {
    return this.instruments?.getAvailableInstruments() || [];
  }

  destroy() {
    this.handleTransportCleanup();
    if (this._boundResizeHandler) {
      AppContext.getTargetWindow().removeEventListener(
        'resize',
        this._boundResizeHandler
      );
    }
    this.videoPlayer?.destroy();
    this.synchronizer?.destroy();
    this.pianoVisuals?.destroy();
    this.karaokeDisplay?.destroy();
    AppContext.unregister();
    this.videoPlayer = null;
    this.synchronizer = null;
    this.instruments = null;
    this.pianoVisuals = null;
    this.karaokeDisplay = null;
    this.videoContainer.innerHTML = '';
  }

  _timeUpdateCallbacks = [];

  registerTimeUpdateCallback(callback) {
    if (typeof callback === 'function') {
      this._timeUpdateCallbacks.push(callback);
    }
  }

  setTranspose(semitones) {
    if (!this.instruments || !this.pianoVisuals) return;

    this.handleTransportCleanup();

    const newTranspose = parseInt(semitones, 10) || 0;
    const oldTranspose = this.transposeOffset || 0;
    const deltaTranspose = newTranspose - oldTranspose;

    this.transposeOffset = newTranspose;

    this.instruments.setTranspose(-this.transposeOffset);

    const VEQ = window.VideoEventQueueClass;
    const veqReady =
      VEQ &&
      VEQ.current &&
      Array.isArray(VEQ.current.timedEvents) &&
      VEQ.current.timedEvents.length > 0;

    if (deltaTranspose !== 0 && veqReady) {
      VEQ.current.timedEvents.forEach((e) => {
        if (e.type === 'note' && typeof e.mc === 'number') {
          e.mc += deltaTranspose;
        }
      });

      const app = window.projectApp;
      if (
        app &&
        app.state &&
        app.state.settings &&
        app.state.settings.splitPitch !== undefined
      ) {
        app.state.settings.splitPitch += deltaTranspose;
        if (
          app.pianoLogic &&
          typeof app.pianoLogic.splitTracks === 'function'
        ) {
          try {
            app.pianoLogic.splitTracks(
              app.state.settings.splitMethod || 'smart',
              app.state.settings.splitPitch,
              true
            );
          } catch (e) {}
        }
      }
    }

    if (this.pianoVisuals && veqReady) {
      this.pianoVisuals.loadVeq(VEQ.current);
    }
    if (this.karaokeDisplay && veqReady) {
      this.karaokeDisplay.loadVeq(VEQ.current);
    }

    if (this.synchronizer && veqReady && VEQ.current.timedEvents.length > 0) {
      this.synchronizer.loadVEQ(VEQ.current);
    }

    if (this.videoPlayer && this.videoPlayer.isReady) {
      const accurateTime = this.videoPlayer.getAccurateTime();
      const nowMs = (accurateTime.time ?? 0) * 1000;

      this.pianoVisuals?.setTime?.(nowMs, 0, true);
      this.karaokeDisplay?.setTime(nowMs);

      if (this.videoPlayer.isPlaying()) {
        this.seekTo(accurateTime.time);
      }
    }

    if (window.midiDiagnostics) {
      const fileTr = window.VideoEventQueueClass?.current?.metadata?.transpose || 0;
      window.midiDiagnostics.logSetting(
        'setTranspose',
        `offset=${this.transposeOffset} globalTranspose=${this.instruments.globalTranspose} delta=${deltaTranspose}`
      );
      window.midiDiagnostics.logTransposeState('after setTranspose');
    }
  }

  setShowNoteNames(show) {
    if (!this.pianoVisuals) return;
    this.pianoVisuals.config.showNoteNames = !!show;
    // Reload the current VEQ data to redraw the notes with or without names
    this.pianoVisuals.loadVeq(VideoEventQueue.current);
    // Force a redraw by briefly pausing and playing (if playing)
    if (this.videoPlayer?.isPlaying()) {
      this.videoPlayer.pause();
      this.videoPlayer.play();
    }
  }

  setAutoplay(enabled) {
    this.autoplay = !!enabled;
  }

  userTranspose = 0;

  fileTranspose = 0;

  handleTransportCleanup() {
    if (this.instruments) this.instruments.stopAllNotes();
    if (this.pianoVisuals) this.pianoVisuals.turnOffAllNotes();
  }

  setVisualsMode(mode) {
    if (!this.pianoVisuals || this.pianoVisuals.config.mode === mode) return;
    if (mode !== 'min' && mode !== 'realistic') return;

    this.pianoVisuals.setMode(mode);

    const currentVeq = window.VideoEventQueueClass?.current;
    if (currentVeq && currentVeq.timedEvents?.length) {
      this.pianoVisuals.loadVeq(currentVeq);
      this.karaokeDisplay?.loadVeq(currentVeq);
    }

    this.handleTransportCleanup();
  }

  setEditMode(enabled) {
    if (this.pianoVisuals) {
      this.pianoVisuals.setEditMode(enabled);
    }
  }

  setVideoVolume(level) {
    this.videoPlayer?.setVolume(level);
  }

  updateLayout() {
    this.pianoVisuals?.updateLayout();
  }

  async syncSettings(settings) {
    if (!settings) return;

    const hasSongTracks =
      Array.isArray(settings.tracks) && settings.tracks.length > 0;
    if (
      !hasSongTracks &&
      settings.instrumentVolume !== undefined &&
      this.instruments
    ) {
      this.instruments.setVolume(settings.instrumentVolume / 100);
    } else if (hasSongTracks && this.instruments) {
      this.instruments.setVolume(1.0);
    }

    if (settings.transpose !== undefined) {
      this.setTranspose(settings.transpose);
    }

    if (settings.tracks && this.instruments) {
      await this.instruments.restoreTrackState(settings.tracks);
    }

    if (settings.autoplay !== undefined) {
      this.setAutoplay(settings.autoplay);
    }
  }

  async load(videoId, veqSourceUrl) {
    this.handleTransportCleanup();

    if (window.VideoEventQueueClass) window.VideoEventQueueClass.clear();
    this.originalVeqData = null;
    this.transposeOffset = 0;

    if (this.synchronizer) this.synchronizer.unloadVEQ();
    if (window.VideoEventScheduler) window.VideoEventScheduler.stopAndClearQueue();

    if (this.pianoVisuals) {
      this.pianoVisuals.hide();
      this.pianoVisuals.loadVeq(null);
    }
    if (this.karaokeDisplay) {
      this.karaokeDisplay.loadVeq(null);
    }

    const playerOptions = this._determinePlayerOptions(videoId);

    this.videoPlayer?.destroy();
    this.videoPlayer = null;

    this.videoContainer.innerHTML = '';

    if (this.options.startTime > 0) {
      this._pendingSeekTime = this.options.startTime;
    }

    try {
      this.videoPlayer = new VideoPlayer(
        {
          container: this.videoContainer,
          ...playerOptions,
          autoplay:
            this.options.autoplay !== undefined ? this.options.autoplay : true,
          controls:
            this.options.controls !== undefined ? this.options.controls : true,
          startTime: this.options.startTime,
          endTime: this.options.endTime,
        },
        this.handlePlayerStateUpdate.bind(this)
      );

      if (
        this.karaokeDisplay &&
        this.karaokeDisplay.element &&
        !this.karaokeDisplay.element.isConnected
      ) {
        this.notesContainer.appendChild(this.karaokeDisplay.element);
      }

      this.synchronizer.init(this.videoPlayer);
    } catch (playerError) {
      this.videoPlayer = null;
      this.videoContainer.innerHTML =
        '<p style="color: red; padding: 20px;">Error creating video player.</p>';
      throw playerError;
    }

    try {
      let veqText;
      let finalVeqUrl = veqSourceUrl;

      if (finalVeqUrl === 'SKIP') {
        throw new Error('Skipping VEQ fetch (Globally Disabled)');
      }

      if (!finalVeqUrl) {
        const cleanVideoId = (videoId || '').replace(/[^a-zA-Z0-9]/g, '');
        finalVeqUrl = `/pianorolls/${cleanVideoId}.txt`;
      }

      const response = await fetch(finalVeqUrl);
      if (!response.ok) {
        throw new Error(`VEQ not found (${response.status})`);
      }
      veqText = await response.text();

      const VEQ = window.VideoEventQueueClass;
      const parsedData = VEQ ? VEQ.parse(veqText) : null;

      if (
        !parsedData ||
        !parsedData.timedEvents ||
        parsedData.timedEvents.length === 0
      ) {
        throw new Error('Parsed VEQ contains no events');
      }

      if (VEQ) VEQ.load(parsedData);

      this.originalVeqData = JSON.parse(JSON.stringify(parsedData));

      this.transposeOffset = 0;
      this.instruments.setTranspose(0);

      this.setAutoplay(this.autoplay);

      if (window.midiDiagnostics) {
        const fileTr = parsedData.metadata?.transpose || 0;
        window.midiDiagnostics.logSetting(
          'fileLoaded',
          `mc=real pitch. fileTranspose=${fileTr} (ignored). transposeOffset=0, globalTranspose=0`
        );
        window.midiDiagnostics.logTransposeState('after file load');
      }

      if (parsedData.metadata?.start !== undefined && !this.options.startTime) {
        this.options.startTime = parsedData.metadata.start / 1000;
        if (this.videoPlayer && this.videoPlayer.isReady) {
          this.videoPlayer.seekTo(this.options.startTime);
        } else {
          this._pendingSeekTime = this.options.startTime;
        }
      }

      if (this.pianoVisuals) {
        this.pianoVisuals.updateLayout();
        if (VEQ) this.pianoVisuals.loadVeq(VEQ.current);
        if (
          this.options.initialSettings &&
          this.options.initialSettings.showPianoRoll !== false
        ) {
          this.pianoVisuals.show();
        }
      }
      if (this.karaokeDisplay && VEQ) {
        this.karaokeDisplay.loadVeq(VEQ.current);
      }
    } catch (e) {
      this.synchronizer.unloadVEQ();
      if (window.VideoEventScheduler) window.VideoEventScheduler.stopAndClearQueue();

      this.originalVeqData = null;
      this.transposeOffset = 0;

      if (window.VideoEventQueueClass) window.VideoEventQueueClass.clear();

      if (this.pianoVisuals) {
        this.pianoVisuals.hide();
        this.pianoVisuals.loadVeq(null);
      }
      if (this.karaokeDisplay) {
        this.karaokeDisplay.loadVeq(null);
      }
    }
  }

  constructor(videoContainer, notesContainer, options = {}) {
    this._state = {
      videoPlayer: null, synchronizer: null, instruments: null,
      originalVeqData: null, transposeOffset: 0, pianoVisuals: null,
      config: { visualsMode: 'min' }
    };
    Object.defineProperties(this, {
      videoPlayer: { get: () => this._state.videoPlayer, set: v => this._state.videoPlayer = v, configurable: true },
      synchronizer: { get: () => this._state.synchronizer, set: v => this._state.synchronizer = v, configurable: true },
      instruments: { get: () => this._state.instruments, set: v => this._state.instruments = v, configurable: true },
      originalVeqData: { get: () => this._state.originalVeqData, set: v => this._state.originalVeqData = v, configurable: true },
      transposeOffset: { get: () => this._state.transposeOffset, set: v => this._state.transposeOffset = v, configurable: true },
      pianoVisuals: { get: () => this._state.pianoVisuals, set: v => this._state.pianoVisuals = v, configurable: true },
      config: { get: () => this._state.config, set: v => this._state.config = v, configurable: true }
    });

    if (!videoContainer || !(videoContainer instanceof HTMLElement)) {
      throw new Error(
        'GlowTunesPlayer requires a valid videoContainer element.'
      );
    }

    let targetDocument = window.document;
    if (options.targetParent) {
      try {
        if (window.self !== window.top && window.parent.document?.body) {
          targetDocument = window.parent.document;
        }
      } catch (e) {}
    }
    AppContext.setTargetDocument(targetDocument);

    this.videoContainer = videoContainer;
    this.notesContainer = notesContainer || videoContainer;
    this.options = options;
    this.basePath = options.basePath || './';

    this.initialSettings = options.initialSettings || {};

    AppContext.register(this);
    AppContext.setNotesContainer(this.notesContainer);
    this.autoplay = true;

    this._boundResizeHandler = () => {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = setTimeout(() => {
        this.pianoVisuals?.updateLayout();
      }, 250);
    };
    AppContext.getTargetWindow().addEventListener(
      'resize',
      this._boundResizeHandler
    );

    this.initCoreComponents();
  }
}

