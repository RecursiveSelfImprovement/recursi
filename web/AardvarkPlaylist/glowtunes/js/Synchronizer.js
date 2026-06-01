
class Synchronizer {

  constructor() {
    this.videoPlayer = null;
    this.currentVEQ = null;
    this.timerHandle = null;
    this.isRunning = false;

    // CHANGED: Reduced from 6.0 to 2.0 for faster response time
    this.lookaheadTime = 2.0;

    this.tickInterval = 100;
    this.lastScheduledTime = -1;
    this.lastAccurateTimeResetState = false;

    this.onTimeUpdateCallback = (time, isPlaying, isReset) => {};
    this.onEventCallback = (event) => {};
  }

  init(videoPlayerInstance) {
    if (!(videoPlayerInstance instanceof VideoPlayer)) {
      console.error(
        'Synchronizer: Invalid VideoPlayer instance provided during init.',
        videoPlayerInstance
      );
      // Should we throw an error or just return? Let's log and return.
      return;
    }

    // If already initialized with a player, stop the old loop first.
    if (this.videoPlayer) {
      // console.log("Synchronizer: Re-initializing. Stopping previous sync loop.");
      this.pause(); // Stop loop
      // Remove old player callback? VideoPlayer callback is overwritten below.
    }

    this.videoPlayer = videoPlayerInstance;
    // console.log("Synchronizer: Initialized with VideoPlayer instance.");

    // Register *this* instance's handler for player state changes
    // Ensure the VideoPlayer instance uses this specific handler
    //this.videoPlayer.callback = this.handlePlayerStateChange.bind(this);

    // If player is already ready when init is called, handle its state immediately
    if (this.videoPlayer.isReady) {
      // console.log("Synchronizer: Player was already ready during init.");
      // Simulate a 'ready' event to trigger initial state handling
      this.handlePlayerStateChange({ type: 'ready', player: this.videoPlayer });
      // Also update time immediately
      const accurateTime = this.videoPlayer.getAccurateTime();
      this.onTimeUpdateCallback(
        accurateTime.time,
        this.videoPlayer.isPlaying(),
        accurateTime.isReset
      );
      this.lastAccurateTimeResetState = accurateTime.isReset;
    } else {
      // console.log("Synchronizer: Waiting for player 'ready' state.");
      // Reset state display until player is ready
      this.onTimeUpdateCallback(0, false, true); // Show 0 time, paused, reset=true
    }
  }

  loadVEQ(veqData) {
    if (!veqData || !Array.isArray(veqData.timedEvents)) {
      // console.warn("Synchronizer: Invalid VEQ data provided to loadVEQ.", veqData);
      this.unloadVEQ(); // Unload if invalid data provided
      return;
    }
    this.currentVEQ = veqData; // Store reference to the loaded data
    this.lastScheduledTime = -1; // Reset scheduling state for new VEQ
    VideoEventScheduler.stopAndClearQueue(); // Clear any old events from previous VEQ
    // console.log(`Synchronizer: Loaded VEQ data with ${this.currentVEQ.timedEvents.length} events. Ready to start.`);

    // If player exists and is already playing, immediately schedule events
    if (
      this.videoPlayer &&
      this.videoPlayer.isReady &&
      this.videoPlayer.isPlaying()
    ) {
      // console.log("Synchronizer: VEQ loaded while player running, attempting immediate sync.");
      const accurateTime = this.videoPlayer.getAccurateTime();
      // Schedule slightly behind current time to catch up immediately
      this.lastScheduledTime = accurateTime.time - this.lookaheadTime / 2.0;
      this.lastAccurateTimeResetState = accurateTime.isReset;
      // Ensure running state is true (it should be if player is playing)
      this.isRunning = true;
      // Schedule next tick without waiting for interval
      if (this.timerHandle) clearTimeout(this.timerHandle);
      // Use setTimeout 0 to run async after current call stack clears
      this.timerHandle = setTimeout(this.tick.bind(this), 0);
      // console.log("Synchronizer: Forced immediate tick after VEQ load while playing.");
    } else {
      // If not playing, just ensure the loop is stopped. State will be updated on next play/seek.
      this.pause(); // Ensure loop is off and scheduler cleared
      // If player is ready but paused, update time display
      if (this.videoPlayer && this.videoPlayer.isReady) {
        const accurateTime = this.videoPlayer.getAccurateTime();
        this.onTimeUpdateCallback(
          accurateTime.time,
          false,
          accurateTime.isReset
        );
        this.lastAccurateTimeResetState = accurateTime.isReset;
      }
    }
  }

  unloadVEQ() {
    this.pause(); // Stop the loop first
    this.currentVEQ = null;
    // Scheduler queue is cleared by pause()
    this.lastScheduledTime = -1;
    // console.log("Synchronizer: Unloaded VEQ data.");
    // Update UI state if needed (e.g., show 0 events)
  }

  registerTimeUpdateCallback(callbackFn) {
    if (typeof callbackFn === 'function') {
      this.onTimeUpdateCallback = callbackFn;
      // console.log("Synchronizer: TimeUpdate callback registered.");
    } else {
      console.error(
        'Synchronizer: Invalid TimeUpdate callback provided. Must be a function.'
      );
    }
  }

  registerEventCallback(callbackFn) {
    if (typeof callbackFn === 'function') {
      this.onEventCallback = callbackFn;
      // console.warn("Synchronizer: Event callback registered, but requires VideoEventScheduler modification to be triggered.");
    } else {
      console.error('Synchronizer: Invalid Event callback provided.');
    }
  }

  handlePlayerStateChange(state) {
    if (!this.videoPlayer || state.player !== this.videoPlayer) {
      return;
    }

    let forceTimeUpdate = false; 

    switch (state.type) {
      case 'play':
      case 'playing':
        this.start();
        forceTimeUpdate = true;
        break;
      case 'pause':
      case 'paused':
      case 'end':
      case 'buffering': 
      case 'error': 
      case 'cue': 
        this.pause(); 
        forceTimeUpdate = true;
        break;
      case 'seek': 
      case 'seeked': 
        this.resyncScheduler(); 

        let isPlayingAfterSeek = false;
        try {
          if (this.videoPlayer) {
            isPlayingAfterSeek = this.videoPlayer.isPlaying();
          }
        } catch (e) {
        }

        this.isRunning = isPlayingAfterSeek;

        forceTimeUpdate = true;
        break; 

      case 'ratechange':
        this.resyncScheduler(); 
        forceTimeUpdate = true;
        break;
      case 'ready':
        VideoEventScheduler.stopAndClearQueue();
        let initialTime = { time: 0, isReset: true };
        try {
          if (this.videoPlayer) {
            initialTime = this.videoPlayer.getAccurateTime();
          }
        } catch (e) {
        }
        this.lastScheduledTime = initialTime.time - 0.1; 
        this.lastAccurateTimeResetState = initialTime.isReset;
        this.isRunning = false; 
        forceTimeUpdate = true;
        if (
          this.currentVEQ &&
          this.videoPlayer &&
          this.videoPlayer.options.autoplay
        ) {
          this.start();
        } else if (this.currentVEQ) {
          this.onTimeUpdateCallback(
            initialTime.time,
            false,
            initialTime.isReset
          );
        }
        break;
      default:
        break;
    }

    if (forceTimeUpdate && this.videoPlayer) {
      try {
        const accurateTime = this.videoPlayer.getAccurateTime();
        this.onTimeUpdateCallback(
          accurateTime.time,
          this.isRunning,
          accurateTime.isReset
        );
        this.lastAccurateTimeResetState = accurateTime.isReset; 
      } catch (e) {
        this.onTimeUpdateCallback(
          this.videoPlayer?.lastRealTime ?? 0,
          false,
          true
        ); 
      }
    }
  }

  start() {
    if (!this.videoPlayer || !this.videoPlayer.isReady) {
      console.warn('Synchronizer: Cannot start - Player not ready or missing.');
      this.isRunning = false;
      return;
    }
    if (
      !this.currentVEQ ||
      !this.currentVEQ.timedEvents ||
      this.currentVEQ.timedEvents.length === 0
    ) {
      console.warn(
        `Synchronizer: Cannot start - VEQ not loaded into this synchronizer instance.`
      );
      this.isRunning = false;
      return;
    }
    if (this.isRunning) return;

    this.isRunning = true;
    const accurateTime = this.videoPlayer.getAccurateTime();
    this.lastScheduledTime = accurateTime.time - 0.1;
    this.lastAccurateTimeResetState = accurateTime.isReset;

    if (this.timerHandle) clearTimeout(this.timerHandle);
    this.timerHandle = setTimeout(this.tick.bind(this), 0);
    this.onTimeUpdateCallback(accurateTime.time, true, accurateTime.isReset);
  }

  pause() {
    if (!this.isRunning && !this.timerHandle) {
      return;
    }
    this.isRunning = false;
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    VideoEventScheduler.stopAndClearQueue();
    // this.onPauseOrResyncCallback(); // REMOVED - This was part of the loop

    if (this.videoPlayer && this.videoPlayer.isReady) {
      try {
        const accurateTime = this.videoPlayer.getAccurateTime();
        this.onTimeUpdateCallback(
          accurateTime.time,
          false,
          accurateTime.isReset
        );
        this.lastAccurateTimeResetState = accurateTime.isReset;
      } catch (e) {
        this.onTimeUpdateCallback(
          this.videoPlayer?.lastRealTime ?? 0,
          false,
          true
        );
      }
    } else {
      this.onTimeUpdateCallback(0, false, true);
    }
  }

  resyncScheduler() {
    if (!this.videoPlayer) {
      return;
    }

    VideoEventScheduler.stopAndClearQueue();
    // this.onResyncCallback(); // REMOVED - This was part of the loop

    let accurateTime;
    try {
      accurateTime = this.videoPlayer.getAccurateTime();
    } catch (e) {
      console.error('Synchronizer: Error getting time during resync.', e);
      this.pause();
      return;
    }

    this.lastScheduledTime = accurateTime.time - 0.1;
    this.lastAccurateTimeResetState = accurateTime.isReset;

    if (this.isRunning) {
      if (this.timerHandle) clearTimeout(this.timerHandle);
      this.timerHandle = setTimeout(this.tick.bind(this), 0);
    }

    this.onTimeUpdateCallback(
      accurateTime.time,
      this.isRunning,
      accurateTime.isReset
    );
  }

  tick() {
    if (!this.isRunning || !this.videoPlayer || !this.videoPlayer.isReady) {
      this.pause();
      return;
    }
    if (!this.currentVEQ || !this.currentVEQ.timedEvents) {
      console.warn(
        'Synchronizer: Tick stopping - VEQ data missing from instance.'
      );
      this.pause();
      return;
    }

    let accurateTime;
    try {
      accurateTime = this.videoPlayer.getAccurateTime();
    } catch (e) {
      console.error('Synchronizer: Error getting accurate time in tick.', e);
      this.pause();
      return;
    }
    const nowTime = accurateTime.time;

    // FIX: On reset, just update the scheduling window without triggering a full
    // resyncScheduler(). The seek/pause handler already called resyncScheduler()
    // which scheduled this tick. Calling it again creates a cascade that causes
    // flashing and double-clearing of the event queue.
    if (accurateTime.isReset) {
      this.lastScheduledTime = nowTime - 0.1;
      this.lastAccurateTimeResetState = true;
      // Don't return — fall through to schedule events from the new position
    }

    const scheduleUntilTime = nowTime + this.lookaheadTime;
    if (scheduleUntilTime > this.lastScheduledTime) {
      const eventsToSchedule = VideoEventQueue.getEventsInRange(
        this.lastScheduledTime * 1000,
        scheduleUntilTime * 1000
      );
      if (eventsToSchedule.length > 0) {
        VideoEventScheduler.scheduleEvents(
          eventsToSchedule,
          nowTime,
          this.videoPlayer.getPlaybackRate()
        );
      }
      this.lastScheduledTime = scheduleUntilTime;
    }

    this.onTimeUpdateCallback(nowTime, true, accurateTime.isReset);
    this.lastAccurateTimeResetState = accurateTime.isReset;

    if (this.timerHandle) clearTimeout(this.timerHandle);
    this.timerHandle = setTimeout(this.tick.bind(this), this.tickInterval);
  }

  destroy() {
    // console.log("Synchronizer: Destroying instance.");
    this.pause(); // Stop loop, clear scheduler
    this.unloadVEQ(); // Ensure VEQ reference is cleared
    // Remove reference to player - player should be destroyed separately
    this.videoPlayer = null;
    // Clear callbacks
    this.onTimeUpdateCallback = () => {};
    this.onEventCallback = () => {};
  }

}

// --- END OF FILE Synchronizer.js ---

