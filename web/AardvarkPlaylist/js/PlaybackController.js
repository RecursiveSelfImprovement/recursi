class PlaybackController {
  
  constructor(player) {
    this.player = player;
    this.playEnforcer = null;
    this.isFadingOut = false;
    this.fadeInterval = null;
  }

  playVideo(item, index) {
      this.player._closeQuickSettingsDropdown();

      if (this.player.coopManager) {
        this.player.coopManager.broadcastPeerMessage({
          type: 'PLAY_VIDEO',
          item: item,
        });
      }

      const title = item.title || `Unknown Video`;
      try {
        document.title = title;
      } catch (e) {
        window.document.title = title;
      }

      this.player.currentPlayItem = item;
      this.player.activeSegments = item.segments && item.segments.length > 0 ? item.segments : null;
      this.player.currentSegmentIndex = 0;

      if (this.playEnforcer) {
        clearInterval(this.playEnforcer);
        this.playEnforcer = null;
      }

      if (this.fadeInterval) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        this.isFadingOut = false;
        if (this.fadeOriginalVidVol !== undefined && this.player.gt) {
          this.player.gt.setVideoVolume(this.fadeOriginalVidVol);
          this.fadeOriginalVidVol = undefined;
        }
      }

      if (this.player.gt) {
        this.player.gt.handleTransportCleanup();
        this.player.gt.destroy();
        this.player.gt = null;
      }

      if (this.player.subtleProgressBar) {
        this.player.subtleProgressBar.destroy();
        this.player.subtleProgressBar = null;
      }

      VideoEventQueue.clear();

      const canvas = this.player.rootElement.querySelector('#canvas-container');
      if (canvas) canvas.style.display = 'none';

      if (!this.player.videoDialog) {
        const safe = (typeof UITools !== 'undefined' ? UITools.safeArea : null) || { left: 0, right: 0, top: 0, bottom: 0 };
        
        const parentW = this.player.rootElement === document.body ? window.innerWidth : this.player.rootElement.clientWidth;
        const parentH = this.player.rootElement === document.body ? window.innerHeight : this.player.rootElement.clientHeight;
        
        const availW = parentW - safe.left - safe.right;
        const availH = parentH - safe.top - safe.bottom;
        let targetW = Math.max(600, Math.min(1000, availW - 40));
        let targetH = targetW * (9 / 16);
        let targetX = safe.left + (availW - targetW) / 2;
        let targetY = safe.top + (availH - targetH) / 2;
        if (targetY < 50) targetY = 50;
        if (targetX < safe.left) targetX = safe.left + 20;

        this.player.videoContainerWrapper = makeElement('div', {
          style: 'width:100%; height:100%; display:flex; flex-direction:column; background:#000; position:relative;',
        });

        this.player.videoContainer = makeElement('div', {
          style: 'flex:1; width:100%; position:relative;',
        });

        const spacer = makeElement('div', { className: 'video-dock-spacer' });

        this.player.videoContainerWrapper.appendChild(this.player.videoContainer);
        this.player.videoContainerWrapper.appendChild(spacer);

        this.player.videoDialog = UITools.makeDialog({
          title: title,
          width: `${Math.round(targetW)}px`,
          height: `${Math.round(targetH)}px`,
          position: [Math.round(targetX), Math.round(targetY)],
          appendTo: this.player.rootElement,
          minWidth: 400,
          minHeight: 225,
          contentElement: this.player.videoContainerWrapper,
          noPadding: true,
          allowMaximize: true,
          allowTransparency: false,
          stateId: 'yt_main_player_dialog',
          onClose: () => {
            try { document.title = 'Aardvark Playlist'; } catch(e) { window.document.title = 'Aardvark Playlist'; }
            if (this.playEnforcer) clearInterval(this.playEnforcer);
            if (this.fadeInterval) {
              clearInterval(this.fadeInterval);
              this.fadeInterval = null;
              this.isFadingOut = false;
            }
            if (this.player.subtleProgressBar) {
              this.player.subtleProgressBar.destroy();
              this.player.subtleProgressBar = null;
            }
            this.player.gt?.handleTransportCleanup();
            this.player.gt?.destroy();
            this.player.gt = null;
            VideoEventQueue.clear();
            this.player.videoDialog = null;
            this.player.viewportManager.destroy3DApp();
            this.player._closeQuickSettingsDropdown();
          },
        });

        if (typeof this.player.videoDialog._applyStyles === 'function') {
          this.player.videoDialog._applyStyles();
        }

        this.player.headerControls = makeElement('div', {
          className: 'gt-header-controls',
          style: 'display:flex; align-items:center; gap:10px; margin-right:15px; font-family:sans-serif;',
          onmousedown: (e) => e.stopPropagation(),
        });

        const controlsTarget = this.player.videoDialog.header.querySelector('.uw-controls');
        if (controlsTarget) {
          this.player.videoDialog.header.insertBefore(this.player.headerControls, controlsTarget);
        } else {
          this.player.videoDialog.header.appendChild(this.player.headerControls);
        }

        this.player.headerControlsUI.build();
        this.player.videoDialog.setZOnTop();
      } else {
        this.player.videoDialog.setTitle(title);
        this.player.videoDialog.setZOnTop();
        this.player.videoDialog.element.style.display = 'flex';
        this.player.videoContainer.innerHTML = '';
        this.player.headerControlsUI.build();
      }

      this.player.gt = new GlowTunesPlayer(
        this.player.videoContainer,
        this.player.rootElement,
        {
          basePath: this.player.basePath,
          initialSettings: this.player.state.settings,
          startTime: item.startTime,
          endTime: item.endTime,
        }
      );

      this.player.subtleProgressBar = new SubtleProgressBar(this.player);
      this.player.subtleProgressBar.mount(this.player.videoContainerWrapper);

      if (this.player.state.geometry && this.player.gt.pianoVisuals) {
        Object.assign(
          this.player.gt.pianoVisuals.geometrySettings,
          this.player.state.geometry
        );
      }

      this.player.gt.onStateChange = (s) => this.handlePlayerState(s);
      this.player.gt.registerTimeUpdateCallback((t, isPlaying, isReset) =>
        this.onGlobalTimeUpdate(t, isPlaying)
      );

      let startTime = item.startTime || 0;
      if (this.player.activeSegments) {
        this.player.activeSegments.sort((a, b) => a.start - b.start);
        startTime = this.player.activeSegments[0].start;
      }

      const skipVeq = this.player.state.settings.fetchPianoRolls === false;

      this.player.gt.load(item.id, skipVeq ? 'SKIP' : null).then(() => {
        if (startTime > 0) this.player.gt.seekTo(startTime);
        this.ensurePlaybackStart();

        const savedVol = this.player.state.settings.videoVolume;
        if (savedVol !== undefined) {
           window.smartLog?.('Volume', `[New Video Loaded] Applying saved volume: ${savedVol}`);
           this.player.gt.setVideoVolume(savedVol);
           
           let attempts = 0;
           if (this.player._volEnforcerInterval) clearInterval(this.player._volEnforcerInterval);
           
           this.player._volEnforcerInterval = setInterval(() => {
               if (this.player.gt && this.player.gt.videoPlayer && !this.player.gt._scriptMuted) {
                   const actual = Math.round(this.player.gt.videoPlayer.getVolume());
                   if (actual !== savedVol) {
                       window.smartLog?.('Volume', `[New Video Enforcer] YouTube drifted to ${actual}. Forcing back to ${savedVol}`);
                       this.player.gt.setVideoVolume(savedVol);
                       
                       document.querySelectorAll('.gt-video-vol-slider').forEach(sl => {
                           sl.value = savedVol;
                       });
                   }
               }
               attempts++;
               if (attempts > 12) {
                   clearInterval(this.player._volEnforcerInterval);
               }
           }, 500);
        }

        const veqData = window.VideoEventQueueClass?.current;
        const hasNotes =
          veqData &&
          veqData.timedEvents &&
          veqData.timedEvents.some((e) => e.type === 'note');

        if (hasNotes) {
          if (!item.hasPianoRoll) {
            item.hasPianoRoll = true;
            this.player._saveState();
            this.player.playlistManager?.renderItems();
          }

          if (!localStorage.getItem('aardvark_midi_prompted')) {
            localStorage.setItem('aardvark_midi_prompted', 'true');
            if (!this.player.state.settings.midiEnabled) {
              this.player._showMidiPrompt();
            }
          }

          const s = item.songSettings || {};

          // Curator: Apply Automated Range Transposition ONLY if there is no non-zero user curation
          if ((s.transpose === undefined || s.transpose === 0) && this.player.state.settings.smartAutoArp !== false) {
            SmartArpController.applySmartRangeTransposition(this.player.gt, veqData);
          }

          if (s.tracks && this.player.gt.instruments) {
            this.player.gt.instruments.setVolume(1.0);
            this.player.gt.instruments.restoreTrackState(s.tracks);
          }

          const userTranspose = s.transpose || 0;
          if (userTranspose !== 0) {
            this.player.gt.setTranspose(userTranspose);
          }
          this.player.state.settings.transpose = this.player.gt.transposeOffset;

          if (s.splitMethod) {
            this.player.state.settings.splitPitch = s.splitPitch || 60;
            this.player.pianoLogic.splitTracks(
              s.splitMethod,
              this.player.state.settings.splitPitch,
              true
            );
          } else if (this.player.state.settings.smartAutoArp !== false) {
            const autoResult = VideoEventQueue.detectOptimalSplitAndChords(veqData, this.player.state.settings.smartAutoArpVerbose);
            if (autoResult) {
              const defaults = VideoEventQueue.getSmartArpDefaults();
              window.arpEnabled = true;
              window.arpGlobalSpread = defaults.arpSpread;
              window.arpPattern = defaults.arpPattern;
              window.arpAnchor = defaults.arpAnchor;
              window.arpGlobalLenFactor = defaults.arpLenFactor;
              this.player.state.settings.splitPitch = autoResult.splitPitch;
              this.player.pianoLogic.splitTracks('smart', autoResult.splitPitch, true);
              if (this.player.gt?.instruments) {
                this.player.gt.instruments.setVolume(1.0);
                this.player.gt.instruments.restoreTrackState([
                  { instrument: defaults.trebleInstrument, volume: defaults.trebleVolume, octaveShift: 0 },
                  { instrument: defaults.bassInstrument, volume: defaults.bassVolume, octaveShift: 0 }
                ]);
              }
            } else {
              window.arpEnabled = false;
            }
          }

          if (window.arpEnabled && window.VideoEventQueueClass) {
            window.VideoEventQueueClass.findChords(false);
          }

          this.player._refreshVisuals();
          if (this.player.gt.synchronizer)
            this.player.gt.synchronizer.resyncScheduler();
        } else {
          if (this.player.state.settings.fetchPianoRolls !== false) {
            if (item.hasPianoRoll !== false) {
              item.hasPianoRoll = false;
              this.player._saveState();
              this.player.playlistManager?.renderItems();
            }
          }
          this.player.state.settings.transpose = 0;
        }

        this.player.headerControlsUI.build();

        const style = this.player.state.settings.keyboardStyle || 'both';
        this.player._applyDisplayModeAfterLoad(style);
      });
    }

  handlePlayerState(s) {
    const vp = this.player.gt?.videoPlayer;
    const ytVol = vp && vp.isReady ? Math.round(vp.getVolume()) : 'N/A';
    const savedVol = this.player.state.settings.videoVolume;
    
    window.smartLog('Volume', `[State] ${s.type}`, { ytReports: ytVol, weSaved: savedVol });

    if (s.type === 'play' || s.type === 'playing') {
      if (this.playEnforcer) {
        clearInterval(this.playEnforcer);
        this.playEnforcer = null;
      }

      // Diagnostic Enforcement
      if (vp && !this.player.gt._scriptMuted && !this.isFadingOut) {
        if (savedVol !== undefined) {
          window.smartLog('Volume', `[Command] Forcing volume to ${savedVol} on ${s.type}`);
          this.player.gt.setVideoVolume(savedVol);
          
          // VERIFY COMMAND
          setTimeout(() => {
            const checkVol = this.player.gt?.videoPlayer?.getVolume();
            window.smartLog('Volume', `[Verify] 500ms after ${s.type} command`, { 
              expected: savedVol, 
              actual: checkVol, 
              success: checkVol == savedVol 
            });
          }, 500);
          
          // DOUBLE VERIFY COMMAND
          setTimeout(() => {
            const checkVol = this.player.gt?.videoPlayer?.getVolume();
            window.smartLog('Volume', `[Verify] 1500ms after ${s.type} command`, { 
              expected: savedVol, 
              actual: checkVol, 
              success: checkVol == savedVol 
            });
          }, 1500);
        }
      }
    }

    if (s.type === 'pause' || s.type === 'paused') {
      if (this.playEnforcer) {
        clearInterval(this.playEnforcer);
        this.playEnforcer = null;
      }
    }

    if (s.type === 'seeked' || s.type === 'pause') {
      if (this.player.gt && this.player.gt.videoPlayer) {
        const nowMs = this.player.gt.videoPlayer.getAccurateTime().time * 1000;
        this.player.gt.pianoVisuals?.setTime(nowMs, 0, true);
        if (this.player.gt.pianoVisuals?.forceRefreshFlyingBars) {
          this.player.gt.pianoVisuals.forceRefreshFlyingBars(nowMs);
        }
      }
    }

    if (s.type === 'ready') {
      if (savedVol !== undefined && this.player.gt && !this.player.gt._scriptMuted) {
        window.smartLog('Volume', `[Command] Forcing volume to ${savedVol} on ready`);
        this.player.gt.setVideoVolume(savedVol);
      }

      const style = this.player.state.settings.keyboardStyle || '2d';
      this.player._applyDisplayModeAfterLoad(style);
      this.player.headerControlsUI.build();

      if (this.player.leftPanelUI && typeof this.player.leftPanelUI.refreshGeometryUI === 'function') {
        this.player.leftPanelUI.refreshGeometryUI();
      }
    }

    if (s.type === 'settings-restored') {
      const item = this.player.currentPlayItem;
      if (item && item.songSettings) {
        const songSet = item.songSettings;
        if (songSet.tracks && this.player.gt?.instruments) {
          this.player.gt.instruments.setVolume(1.0);
          this.player.gt.instruments.restoreTrackState(songSet.tracks);
        }
        if (songSet.transpose !== undefined && this.player.gt) {
          this.player.gt.setTranspose(songSet.transpose);
          this.player.state.settings.transpose = this.player.gt.transposeOffset;
        }
      }
      if (this.player.headerControlsUI) this.player.headerControlsUI.build();
    }

    if (s.type === 'end') {
      window.smartLog('Volume', `[State] Video ended. Ending YT vol: ${ytVol}`);
      
      if (this.player.gt) {
        this.player.gt.handleTransportCleanup();
      }

      const mode = this.player.state.settings.playbackMode || 'continuous';

      if (mode === 'stop_one') {
      } else if (mode === 'timer') {
        const stopTime = this.player.state.settings.playbackStopTime;
        if (stopTime && Date.now() >= stopTime) {
          this.player.state.settings.playbackStopTime = null;
          this.player._saveState();
        } else {
          this.player.playlistManager?.playNext();
        }
      } else {
        this.player.playlistManager?.playNext();
      }
    }
  }

  onGlobalTimeUpdate(time, isPlaying) {
    if (!isPlaying) return;

    const settings = this.player.state.settings;
    if (settings.playbackMode === 'timer' && settings.playbackStopTime) {
      if (Date.now() >= settings.playbackStopTime && !this.isFadingOut) {
        this.startFadeOutAndStop();
        return;
      }
    }

    if (
      this.player.currentPlayItem &&
      this.player.currentPlayItem.endTime &&
      this.player.currentPlayItem.endTime > 0
    ) {
      if (time >= this.player.currentPlayItem.endTime) {
        console.log(
          `[YouTubePlayer] Custom End Time reached: ${this.player.currentPlayItem.endTime}`
        );
        if (this.player.gt) this.player.gt.pause();
        this.handlePlayerState({ type: 'end' });
        return;
      }
    }

    if (this.player.activeSegments && this.player.gt) {
      const currentSeg =
        this.player.activeSegments[this.player.currentSegmentIndex];

      if (!currentSeg) return;

      if (time < currentSeg.start - 0.5) {
        this.player.gt.seekTo(currentSeg.start);
        return;
      }

      if (time >= currentSeg.end) {
        if (
          this.player.currentSegmentIndex <
          this.player.activeSegments.length - 1
        ) {
          this.player.currentSegmentIndex++;
          const nextSeg =
            this.player.activeSegments[this.player.currentSegmentIndex];
          console.log(
            `[YouTubePlayer] Segment complete. Jumping to next: ${nextSeg.start}`
          );
          this.player.gt.seekTo(nextSeg.start);
        } else {
          console.log('[YouTubePlayer] Final segment complete. Ending video.');
          this.handlePlayerState({ type: 'end' });
        }
      }
    }
  }

  ensurePlaybackStart() {
    if (this.playEnforcer) clearInterval(this.playEnforcer);

    let attempts = 0;
    const maxAttempts = 20;

    this.playEnforcer = setInterval(() => {
      attempts++;

      if (!this.player.gt || !this.player.gt.videoPlayer) {
        clearInterval(this.playEnforcer);
        return;
      }

      const vp = this.player.gt.videoPlayer;

      if (vp.isPlaying()) {
        clearInterval(this.playEnforcer);
        return;
      }

      if (attempts >= maxAttempts) {
        this.player.setStatus('Auto-play timed out. Click Play.', '#f55');
        clearInterval(this.playEnforcer);
        return;
      }

      if (vp.isReady) {
        let isBuffering = false;
        if (
          vp.options.playerType === 'youtube' &&
          vp.player &&
          typeof vp.player.getPlayerState === 'function'
        ) {
          const state = vp.player.getPlayerState();
          if (state === (window.YT?.PlayerState?.BUFFERING ?? 3)) {
            isBuffering = true;
          }
        }

        if (!isBuffering) {
          vp.play();
        }
      }
    }, 500);
  }

  startFadeOutAndStop() {
      if (this.isFadingOut) return;
      this.isFadingOut = true;

      const originalVidVol = this.player.gt && this.player.gt.videoPlayer ? this.player.gt.videoPlayer.getVolume() : 100;
      this.fadeOriginalVidVol = originalVidVol;
      
      // Normalize from 0-100 range to 0.0-1.0 range expected by the audio engine
      const originalInstVol =
        this.player.state.settings.instrumentVolume !== undefined
          ? this.player.state.settings.instrumentVolume / 100
          : 0.5;

      let steps = 100;
      let currentStep = 0;

      this.player.setStatus('Timer finished. Fading out...', '#4a90e2');

      this.player.state.settings.playbackStopTime = null;
      this.player._saveState();

      this.fadeInterval = setInterval(() => {
        currentStep++;
        const ratio = 1 - currentStep / steps;

        if (this.player.gt) {
          this.player.gt.setVideoVolume(originalVidVol * ratio);
          this.player.gt.setInstrumentVolume(originalInstVol * ratio);
        }

        if (currentStep >= steps) {
          clearInterval(this.fadeInterval);
          if (this.player.gt) {
            this.player.gt.pause();
            this.player.gt.setVideoVolume(originalVidVol);
            this.player.gt.setInstrumentVolume(originalInstVol);
          }
          this.isFadingOut = false;
          this.fadeOriginalVidVol = undefined;
        }
      }, 100);
    }

  handlePlayerState(s) {
    if (s.type === 'play' || s.type === 'playing') {
      if (this.playEnforcer) {
        console.log('[YouTubePlayer] Play state detected. Clearing Enforcer.');
        clearInterval(this.playEnforcer);
        this.playEnforcer = null;
      }
    }

    if (s.type === 'pause' || s.type === 'paused') {
      if (this.playEnforcer) {
        console.log('[YouTubePlayer] Pause detected. Cancelling enforcer.');
        clearInterval(this.playEnforcer);
        this.playEnforcer = null;
      }
    }

    if (s.type === 'seeked' || s.type === 'pause') {
      if (this.player.gt && this.player.gt.videoPlayer) {
        const nowMs = this.player.gt.videoPlayer.getAccurateTime().time * 1000;
        this.player.gt.pianoVisuals?.setTime(nowMs, 0, true);
        if (this.player.gt.pianoVisuals?.forceRefreshFlyingBars) {
          this.player.gt.pianoVisuals.forceRefreshFlyingBars(nowMs);
        }
      }
    }

    if (s.type === 'ready') {
      if (window._globalVideoVolume !== undefined && this.player.gt) {
      //  this.player.gt.setVideoVolume(window._globalVideoVolume);
      }

      const style = this.player.state.settings.keyboardStyle || '2d';
      this.player._applyDisplayModeAfterLoad(style);

      this.player.headerControlsUI.build();

      if (this.player.leftPanelUI) {
        if (typeof this.player.leftPanelUI.refreshGeometryUI === 'function') {
          this.player.leftPanelUI.refreshGeometryUI();
        }
      }
    }

    if (s.type === 'settings-restored') {
      const item = this.player.currentPlayItem;
      if (item && item.songSettings) {
        const songSet = item.songSettings;
        if (songSet.tracks && this.player.gt?.instruments) {
          this.player.gt.instruments.setVolume(1.0);
          this.player.gt.instruments.restoreTrackState(songSet.tracks);
        }
        if (songSet.transpose !== undefined && this.player.gt) {
          this.player.gt.setTranspose(songSet.transpose);
          this.player.state.settings.transpose = this.player.gt.transposeOffset;
        }
      }
      if (this.player.headerControlsUI) {
        this.player.headerControlsUI.build();
      }
    }

    if (s.type === 'end') {
      console.log('[YouTubePlayer] Video Ended. Checking playback mode...');

      if (this.player.gt) {
        this.player.gt.handleTransportCleanup();
      }

      const mode = this.player.state.settings.playbackMode || 'continuous';

      if (mode === 'stop_one') {
        console.log('[YouTubePlayer] Mode is Stop-One. Stopping.');
      } else if (mode === 'timer') {
        const stopTime = this.player.state.settings.playbackStopTime;
        if (stopTime && Date.now() >= stopTime) {
          console.log('[YouTubePlayer] Timer expired. Stopping.');
          this.player.state.settings.playbackStopTime = null;
          this.player._saveState();
        } else {
          console.log('[YouTubePlayer] Timer active. Playing next.');
          this.player.playlistManager?.playNext();
        }
      } else {
        console.log('[YouTubePlayer] Continuous mode. Playing next.');
        this.player.playlistManager?.playNext();
      }
    }
  }

  
}