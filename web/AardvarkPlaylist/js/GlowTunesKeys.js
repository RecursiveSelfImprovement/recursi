
class GlowTunesKeys {

  static initialize(player) {
    const kch = KeyCommandHandler;
    kch.clear();
    kch.init();
    const ctx = GlowTunesKeys._makeCtx(player, kch);

    GlowTunesKeys._registerVideoCommands(ctx);
    GlowTunesKeys._registerInstrumentCommands(ctx);
    GlowTunesKeys._registerTrackMenu(ctx, '&treble', 0, 'Treble');
    GlowTunesKeys._registerTrackMenu(ctx, '&bass', 1, 'Bass');
    GlowTunesKeys._registerArpCommands(ctx);
    GlowTunesKeys._registerDisplayCommands(ctx);
    GlowTunesKeys._registerOptionsCommands(ctx);
    GlowTunesKeys._registerJumpCommands(ctx);
    GlowTunesKeys._registerSpeedCommands(ctx);
    GlowTunesKeys._registerPianoRollCommands(ctx);
    GlowTunesKeys._registerEditCommands(ctx);
    GlowTunesKeys._registerDirectKeys(ctx);
  }

  static _makeCtx(player, kch) {
      const formatTime = (t) => {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      };

      const saveAndRebuild = () => {
        player._saveSettings();
        if (player.headerControlsUI) player.headerControlsUI.build();
      };

      const updateTracks = () => {
        if (player.gt?.instruments?.tracks)
          player._updateSongSettings({ tracks: player.gt.instruments.tracks });
      };

      const cmd = (fn) => (type, keys) => {
        if (type === 'queryactive') return true;
        return fn(type, keys);
      };

      const addCmd = (menu, key, desc, fn) =>
        kch.addKeyCommand(menu, key, desc, cmd(fn));

      const syncInstVolume = (volPct) => {
        const tracks = player.gt?.instruments?.tracks;
        const veq = window.VideoEventQueueClass?.current;
        const hasTrack1 =
          veq &&
          veq.timedEvents &&
          veq.timedEvents.some((e) => e.type === 'note' && e.tr === 1);
        const splitMethod = player.currentPlayItem?.songSettings?.splitMethod;
        const splitActive = hasTrack1 || window.arpEnabled || !!splitMethod;

        const v = volPct / 10;
        if (splitActive) {
          player.gt?.instruments?.setTrackVolume(0, v);
          player.gt?.instruments?.setTrackVolume(1, v);
          if (tracks) {
            if (!tracks[0]) tracks[0] = {};
            tracks[0].volume = v;
            if (!tracks[1]) tracks[1] = {};
            tracks[1].volume = v;
            player._updateSongSettings({ tracks });
          }
        } else {
          player.gt?.instruments?.setTrackVolume(0, v);
          if (tracks) {
            if (!tracks[0]) tracks[0] = {};
            tracks[0].volume = v;
            player._updateSongSettings({ tracks });
          }
        }
        saveAndRebuild();
      };

      const addInstVolume = (delta) => {
        const tracks = player.gt?.instruments?.tracks;
        let v = tracks?.[0]?.volume !== undefined ? tracks[0].volume * 10 : 50;
        v = Math.max(0, Math.min(100, v + delta));
        syncInstVolume(v);
        return v;
      };

      const ensureSplit = () => {
        const veq = window.VideoEventQueueClass?.current;
        if (!veq || !veq.timedEvents) return false;
        const hasTrack1 = veq.timedEvents.some(
          (e) => e.type === 'note' && e.tr === 1
        );
        const splitMethod = player.currentPlayItem?.songSettings?.splitMethod;
        const isSplitActive = hasTrack1 || window.arpEnabled || !!splitMethod;

        if (!isSplitActive) {
          if (player.gt?.instruments) {
            const t0 = player.gt.instruments.tracks[0] || {
              instrument: 'Piano',
              volume: 5.0,
              octaveShift: 0,
            };
            player.gt.instruments.tracks[1] = {
              instrument: t0.instrument,
              volume: 3.0, // Aligned with the curated backing track volume standard
              octaveShift: t0.octaveShift,
            };
            player._updateSongSettings({ tracks: player.gt.instruments.tracks });
          }
          player.pianoLogic.splitTracks(
            'smart',
            player.state.settings.splitPitch || 60
          );
          player._updateSongSettings({
            arpEnabled: true,
            arpSpread: 30,
            arpPattern: [0, 1, 2],
            splitMethod: 'smart',
          });
          return true;
        }
        return false;
      };

      return {
        player,
        kch,
        formatTime,
        saveAndRebuild,
        updateTracks,
        cmd,
        addCmd,
        syncInstVolume,
        addInstVolume,
        ensureSplit,
        instrumentMap: GlowTunesKeys._instrumentMap(),
      };
    }

  static _instrumentMap() {
    return {
      '&piano': 'Piano',
      '&vibes': 'Vibes',
      '&guitar': 'Electric Guitar',
      '&wurlitzer': 'Wurlitzer EP',
      '&marimba': 'Marimba',
      '&steel drum': 'Steel Drum',
      '&harp': 'Harp',
      'music bo&x': 'Music Box',
      '&choir': 'Choir Aahs',
      'c&elesta': 'Celesta',
      'chi&mes': 'Chimes',
      '&blocks': 'Blocks',
      's&ynth': 'Synth',
    };
  }

  static _registerVideoCommands(ctx) {
        const { player, addCmd } = ctx;

        addCmd('&keyboard', null, 'Show Keyboard Shortcuts', (type) => {
          if (type === 'command') {
            GlowTunesKeys.showHelpDialog(player);
            return null;
          }
        });

        addCmd('&video', '&fullscreen', 'Toggle True Full Screen', (type) => {
          if (type === 'command') {
            player.toggleFullscreen();
            return 'Fullscreen Toggled';
          }
        });

        addCmd('&video', '&zoom', 'Toggle Video Zoom', (type) => {
          if (type === 'querystate') return player._videoZoomed ? 1 : 0;
          if (type === 'command') {
            player._videoZoomed = !player._videoZoomed;
            const wrapper = player.videoContainerWrapper;
            if (!wrapper) return 'No video';
            const container = wrapper.querySelector('div');
            if (!container) return 'No container';
            if (player._videoZoomed) {
              wrapper.style.overflow = 'hidden';
              container.style.transform = 'scale(1.5)';
              container.style.transformOrigin = 'center center';
              return 'Zoom: ON';
            } else {
              container.style.transform = '';
              container.style.transformOrigin = '';
              return 'Zoom: OFF';
            }
          }
        });

        addCmd('&video', 'volume #0-9', 'Set Video Volume', (type, keys) => {
          if (type === 'querystate') {
            const vol = player.state.settings.videoVolume ?? 100;
            return Math.round(vol / 10);
          }
          if (type === 'command') {
            const v = parseInt(keys[1]) * 10;
            
            // Set programmatic change lock
            player._volumeChangingLock = Date.now();

            if (player.gt) {
              player.gt.setVideoVolume(v);
            }
            
            player.state.settings.videoVolume = v;
            player._saveSettings();
            
            window.smartLog?.('Volume', `[Hotkey (V0-9)] User set volume to ${v}`);

            document.querySelectorAll('.gt-video-vol-slider').forEach(sl => {
              sl.value = v;
            });

            return `Video Vol: ${v}`;
          }
        });
      }

  static _registerInstrumentCommands(ctx) {
    const {
      player,
      addCmd,
      syncInstVolume,
      saveAndRebuild,
      updateTracks,
      instrumentMap,
    } = ctx;

    addCmd(
      '&instrument',
      'volume #0-9',
      'Set Master Inst Volume',
      (type, keys) => {
        const veq = window.VideoEventQueueClass?.current;
        const hasTrack1 =
          veq &&
          veq.timedEvents &&
          veq.timedEvents.some((e) => e.type === 'note' && e.tr === 1);
        const splitMethod = player.currentPlayItem?.songSettings?.splitMethod;
        const splitActive = hasTrack1 || window.arpEnabled || !!splitMethod;

        if (type === 'querystate') {
          if (splitActive) {
            const volTreble = Math.round(
              player.gt?.instruments?.tracks?.[0]?.volume ?? 5.0
            );
            const volBass = Math.round(
              player.gt?.instruments?.tracks?.[1]?.volume ?? 5.0
            );
            return `𝄢 ${volBass} 𝄞 ${volTreble}`;
          } else {
            const vol = player.gt?.instruments?.tracks?.[0]?.volume ?? 5.0;
            return Math.round(vol);
          }
        }
        if (type === 'command') {
          const v = parseInt(keys[1]);
          syncInstVolume(v * 10);
          if (splitActive) {
            return `𝄢 ${v} 𝄞 ${v}`;
          }
          return `Inst Vol: ${v}`;
        }
      }
    );

    Object.entries(instrumentMap).forEach(([shortcut, instName]) => {
      addCmd('&instrument', shortcut, `Set All to ${instName}`, (type) => {
        if (type === 'querystate') {
          const cur =
            player.gt?.instruments?.tracks?.[0]?.instrument || 'Piano';
          return cur === instName ? true : null;
        }
        if (type === 'command') {
          player.gt?.instruments?.setTrackInstrument(0, instName);
          if (player.gt?.instruments?.tracks?.[1])
            player.gt.instruments.setTrackInstrument(1, instName);
          updateTracks();
          saveAndRebuild();
          return `Inst: ${instName}`;
        }
      });
    });
  }

  static _registerTrackMenu(ctx, menuKey, trackId, trackName) {
    const {
      player,
      addCmd,
      ensureSplit,
      updateTracks,
      saveAndRebuild,
      instrumentMap,
    } = ctx;
    const defaultInst = trackId === 0 ? 'Piano' : 'Vibes';
    const defaultVol = trackId === 0 ? 8.0 : 4.0;

    addCmd(menuKey, 'volume #0-9', `${trackName} Vol`, (type, keys) => {
      if (type === 'querystate')
        return Math.round(
          player.gt?.instruments?.tracks?.[trackId]?.volume ?? defaultVol
        );
      if (type === 'command') {
        ensureSplit();
        const v = parseFloat(parseInt(keys[1]));
        player.gt?.instruments?.setTrackVolume(trackId, v);
        updateTracks();
        saveAndRebuild();
        return `${trackName} Vol: ${v}`;
      }
    });

    const addOctaveCmd = (key, delta, label) => {
      addCmd(menuKey, key, `${trackName} Octave ${label}`, (type) => {
        const getShift = () =>
          player.gt?.instruments?.tracks?.[trackId]?.octaveShift || 0;
        if (type === 'querystate') {
          const s = getShift();
          return s > 0 ? '+' + s : s;
        }
        if (type === 'command') {
          ensureSplit();
          const s = getShift() + delta;
          player.gt?.instruments?.setTrackOctave(trackId, s);
          updateTracks();
          saveAndRebuild();
          return `${trackName} Oct: ${s > 0 ? '+' : ''}${s}`;
        }
      });
    };
    addOctaveCmd('octave &up', +1, '+1');
    addOctaveCmd('octave &down', -1, '-1');

    Object.entries(instrumentMap).forEach(([shortcut, instName]) => {
      addCmd(menuKey, shortcut, `Set to ${instName}`, (type) => {
        if (type === 'querystate') {
          const cur =
            player.gt?.instruments?.tracks?.[trackId]?.instrument ||
            defaultInst;
          return cur === instName ? true : null;
        }
        if (type === 'command') {
          ensureSplit();
          player.gt?.instruments?.setTrackInstrument(trackId, instName);
          updateTracks();
          saveAndRebuild();
          return `${trackName}: ${instName}`;
        }
      });
    });
  }

  static _registerArpCommands(ctx) {
    const { player, addCmd, ensureSplit } = ctx;

    const syncArp = () => {
      player._updateSongSettings({
        arpEnabled: window.arpEnabled,
        arpSpread: window.arpGlobalSpread,
        arpPattern: window.arpPattern,
        arpAnchor: window.arpAnchor,
        arpLen: window.arpGlobalLenFactor,
      });
      player._applyArpVisuals();
      if (player.headerControlsUI) player.headerControlsUI.build();
    };

    const enableArpIfOff = () => {
      if (!window.arpEnabled) {
        window.arpEnabled = true;
        window.VideoEventQueueClass?.findChords(false);
      }
    };

    addCmd('&arpeggiator', '&toggle', 'Toggle Arpeggiator', (type) => {
      if (type === 'querystate') return window.arpEnabled ? true : null;
      if (type === 'command') {
        const didSplit = ensureSplit();
        if (!didSplit) {
          if (window.arpEnabled) {
            window.arpEnabled = false;
          } else {
            window.arpEnabled = true;
            window.VideoEventQueueClass?.findChords(false);
          }
        }
        syncArp();
        return `Arpeggiator ${window.arpEnabled ? 'ON' : 'OFF'}`;
      }
    });

    addCmd(
      '&arpeggiator',
      'spread (#0-9)',
      'Set Spread (0=0ms, 9=400ms)',
      (type, keys) => {
        if (type === 'querystate') return (window.arpGlobalSpread || 0) + 'ms';
        if (type === 'command') {
          const val = parseInt(keys[1]);
          if (!isNaN(val)) {
            window.arpGlobalSpread = Math.round((val / 9) * 400);
          }
          ensureSplit();
          enableArpIfOff();
          syncArp();
          return `Arp Spread: ${window.arpGlobalSpread}ms`;
        }
      }
    );

    addCmd('&arpeggiator', '&direction', 'Cycle Pattern', (type) => {
      const getLabel = (pat) => (pat || [0, 1, 2]).map((x) => x + 1).join(' ');
      if (type === 'querystate') return getLabel(window.arpPattern);
      if (type === 'command') {
        ensureSplit();
        const patterns = [
          [0, 1, 2],
          [2, 1, 0],
          [0, 2, 1],
          [1, 0, 2],
        ];
        const cur = JSON.stringify(window.arpPattern || [0, 1, 2]);
        const idx = patterns.findIndex((p) => JSON.stringify(p) === cur);
        window.arpPattern = patterns[(idx + 1) % patterns.length];
        enableArpIfOff();
        syncArp();
        return `Arp Pattern: ${getLabel(window.arpPattern)}`;
      }
    });

    addCmd('&arpeggiator', '&anchor', 'Cycle Anchor', (type) => {
      const getLabel = (val) => (val === 0 ? '1' : val === 1 ? '3' : '2');
      const curAnchor = window.arpAnchor !== undefined ? window.arpAnchor : 1.0;
      if (type === 'querystate') return getLabel(curAnchor);
      if (type === 'command') {
        ensureSplit();
        const anchors = [0, 0.5, 1];
        const idx = anchors.indexOf(curAnchor);
        window.arpAnchor = anchors[(idx + 1) % anchors.length];
        enableArpIfOff();
        syncArp();
        return `Arp Anchor: ${getLabel(window.arpAnchor)}`;
      }
    });
  }

  static _registerDisplayCommands(ctx) {
    // Intentionally left blank. Display cycle command was moved 
    // to _registerOptionsCommands to consolidate into the Options menu.
  }

  static _registerOptionsCommands(ctx) {
    const { player, addCmd, saveAndRebuild } = ctx;

    const addToggle = (key, desc, label, getSetting, apply) => {
      addCmd('&options', key, desc, (type) => {
        if (type === 'querystate') return getSetting() ? true : null;
        if (type === 'command') {
          const on = !getSetting();
          apply(on);
          saveAndRebuild();
          return `${label} ${on ? 'ON' : 'OFF'}`;
        }
      });
    };

    addToggle(
      '&autoplay',
      'Toggle Autoplay',
      'Autoplay',
      () => player.state.settings.autoplay !== false,
      (on) => {
        player.state.settings.autoplay = on;
        player.gt?.setAutoplay(on);
        if (!on) player.gt?.instruments?.stopAllNotes();
      }
    );
    addToggle(
      '&note names',
      'Toggle Note Names',
      'Note Names',
      () => player.state.settings.showNoteNames,
      (on) => {
        player.state.settings.showNoteNames = on;
        player.gt?.setShowNoteNames(on);
      }
    );
    addToggle(
      '&edit mode',
      'Toggle Edit Mode',
      'Edit Mode',
      () => player.state.settings.editMode,
      (on) => {
        player.state.settings.editMode = on;
        player.gt?.setEditMode?.(on);
      }
    );

    // --- Cycle Piano Style Command ---
    addCmd('&options', '&piano style', 'Cycle Piano Style', (type) => {
      if (type === 'querystate') {
         const mode = player.state.settings.keyboardStyle || '3d';
         if (mode === '3d') return '3D';
         if (mode === '2d') return 'Minimal';
         if (mode === 'none') return 'Off';
         return mode;
      }
      if (type === 'command') {
        const modes = ['3d', '2d', 'none'];
        const current = player.state.settings.keyboardStyle || '3d';
        let idx = modes.indexOf(current);
        idx = (idx + 1) % modes.length;
        const newMode = modes[idx];
        
        player.setDisplayMode(newMode);
        
        if (player.leftPanelUI && typeof player.leftPanelUI.refreshGeometryUI === 'function') {
          player.leftPanelUI.refreshGeometryUI();
        }
        if (player.headerControlsUI) player.headerControlsUI.build();
        
        const labels = { '3d': '3D Piano', '2d': 'Minimal Piano', 'none': 'No Piano' };
        return `Style: ${labels[newMode]}`;
      }
    });
  }

  static _registerJumpCommands(ctx) {
    const { player, kch, formatTime } = ctx;
    const isVideoReady = () => !!player.gt?.videoPlayer;

    kch.addKeyCommand(
      '&jump',
      'to percent (#0-9)',
      'Jump to %',
      (type, keys) => {
        if (type === 'queryactive') return isVideoReady();
        if (type === 'command') {
          const v = parseInt(keys[1]);
          const pct = v === 0 ? 0 : v * 10;
          const dur = player.gt?.videoPlayer?.getDuration() || 0;
          if (dur > 0) {
            const t = dur * (pct / 100);
            player.gt.seekTo(t);
            return { newKey: pct + '%', followup: formatTime(t) };
          }
          return 'Video not ready';
        }
      }
    );

    const addSeek = (key, desc, getDelta) => {
      kch.addKeyCommand('&jump', key, desc, (type) => {
        if (type === 'queryactive') return isVideoReady();
        if (type === 'command') {
          const curr = player.gt?.videoPlayer?.getCurrentRawTime() || 0;
          const t = Math.max(0, curr + getDelta());
          player.gt?.seekTo(t);
          return `Jumped to ${formatTime(t)}`;
        }
      });
    };
    addSeek('&forward', 'Jump +10s', () => 10);
    addSeek('&backwards', 'Jump -10s', () => -10);
  }

  static _registerSpeedCommands(ctx) {
    const { player, addCmd } = ctx;

    const addSpeed = (key, rate, label) => {
      addCmd('&speed', key, `${label} (${rate}x)`, (type) => {
        if (type === 'querystate')
          return (player.gt?.videoPlayer?.getPlaybackRate() ?? 1) === rate
            ? true
            : null;
        if (type === 'command') {
          player.gt?.videoPlayer?.setPlaybackRate(rate);
          return label;
        }
      });
    };
    addSpeed('&full', 1, 'Full Speed');
    addSpeed('&3/4', 0.75, '3/4 Speed');
    addSpeed('&half', 0.5, 'Half Speed');
    addSpeed('&quarter', 0.25, 'Quarter Speed');
  }

  static _registerPianoRollCommands(ctx) {
    const { player, addCmd, saveAndRebuild } = ctx;

    const addTranspose = (key, desc, delta) => {
      addCmd('&pianoroll', key, desc, (type) => {
        if (type === 'command') {
          const tr = (player.gt?.transposeOffset || 0) + delta;
          player.state.settings.transpose = tr;
          player.gt?.setTranspose(tr);
          player._updateSongSettings({ transpose: tr });
          saveAndRebuild();
          return `Transposed ${tr > 0 ? '+' : ''}${tr}`;
        }
      });
    };
    addTranspose('transpose &up', 'Transpose +1', +1);
    addTranspose('transpose &down', 'Transpose -1', -1);

    addCmd('&pianoroll', '&export', 'Export VEQ', (type) => {
      if (type === 'command') {
        player._exportVEQ();
        return 'Exporting...';
      }
    });
    addCmd('&pianoroll', '&import', 'Import VEQ', (type) => {
      if (type === 'command') {
        player._importVEQ();
        return 'Select file...';
      }
    });
  }

  static _registerEditCommands(ctx) {
    const { player, addCmd } = ctx;

    const addAction = (key, desc, fn, result) => {
      addCmd('&edit', key, desc, (type) => {
        if (type === 'command') {
          fn();
          return result;
        }
      });
    };
    addAction(
      '&sync note',
      'Sync Selected Note',
      () => player._triggerSync(),
      'Note Synced'
    );
    addAction(
      '&delete selected',
      'Delete Selected Note',
      () => player._triggerDelete(),
      'Note Deleted'
    );
    addAction(
      '&undo last edit',
      'Undo',
      () => player._triggerUndo(),
      'Undo Executed'
    );
    addAction(
      'change &pitch...',
      'Change Pitch',
      () => player.pianoLogic.promptChangePitch(),
      'Pitch Dialog Opened'
    );
    addAction(
      'shift &time...',
      'Shift Time',
      () => player.pianoLogic.promptShiftTime(),
      'Time Dialog Opened'
    );
    addAction(
      '&insert marker',
      'Insert Section Marker',
      () => player.pianoLogic.insertMarkerAtCurrentTime(),
      'Marker Inserted'
    );
    addAction(
      '&mute video...',
      'Insert Timed Video Mute',
      () => player.pianoLogic.promptInsertMute(),
      'Mute Dialog Opened'
    );
  }

  static _registerDirectKeys(ctx) {
        const { player, kch, addInstVolume } = ctx;
        const showBox = (msg) =>
          kch.showFollowupBox(
            msg,
            window.innerWidth / 2,
            window.innerHeight / 2 + 80
          );

        kch.addCommand(32, () => {
          if (player.gt?.videoPlayer?.isPlaying()) {
            player.gt.pause();
            showBox('Pause');
          } else {
            player.gt?.play();
            showBox('Play');
          }
        });

        kch.addCommand(8, () => {
          player._triggerDelete();
          showBox('Deleted');
        });
        kch.addCommand(46, () => {
          player._triggerDelete();
          showBox('Deleted');
        });

        const changeVideoVol = (delta) => {
          let v = player.gt?.videoPlayer?.getVolume() ?? 100;
          v = Math.max(0, Math.min(100, v + delta));
          
          // Set programmatic change lock
          player._volumeChangingLock = Date.now();
          
          if (player.gt) {
            player.gt.setVideoVolume(v);
          }
          
          player.state.settings.videoVolume = v;
          player._saveSettings();
          
          window.smartLog?.('Volume', `[Hotkey (Ctrl+Arrows)] User set volume to ${v}`);

          document.querySelectorAll('.gt-video-vol-slider').forEach(sl => {
            sl.value = v;
          });

          showBox(`Video Vol: ${Math.round(v)}%`);
        };

        kch.addCommand(39, (e) => {
          if (e.ctrlKey || e.metaKey) changeVideoVol(+10);
          else
            player.gt?.seekTo(
              (player.gt?.videoPlayer?.getCurrentRawTime() || 0) + 2
            );
        });
        kch.addCommand(37, (e) => {
          if (e.ctrlKey || e.metaKey) changeVideoVol(-10);
          else
            player.gt?.seekTo(
              Math.max(0, (player.gt?.videoPlayer?.getCurrentRawTime() || 0) - 2)
            );
        });

        kch.addCommand(38, () => {
          const veq = window.VideoEventQueueClass?.current;
          const hasTrack1 =
            veq &&
            veq.timedEvents &&
            veq.timedEvents.some((e) => e.type === 'note' && e.tr === 1);
          const splitMethod = player.currentPlayItem?.songSettings?.splitMethod;
          const splitActive = hasTrack1 || window.arpEnabled || !!splitMethod;

          const v = Math.round(addInstVolume(+10) / 10);
          if (splitActive) {
            showBox(`𝄢 ${v} 𝄞 ${v}`);
          } else {
            showBox(`Inst Vol: ${v}`);
          }
        });
        kch.addCommand(40, () => {
          const veq = window.VideoEventQueueClass?.current;
          const hasTrack1 =
            veq &&
            veq.timedEvents &&
            veq.timedEvents.some((e) => e.type === 'note' && e.tr === 1);
          const splitMethod = player.currentPlayItem?.songSettings?.splitMethod;
          const splitActive = hasTrack1 || window.arpEnabled || !!splitMethod;

          const v = Math.round(addInstVolume(-10) / 10);
          if (splitActive) {
            showBox(`𝄢 ${v} 𝄞 ${v}`);
          } else {
            showBox(`Inst Vol: ${v}`);
          }
        });
      }

  static showHelpDialog(player) {
    if (typeof UITools === 'undefined') return;

    const container = makeElement('div', {
      style:
        'display:flex; flex-direction:column; gap:15px; max-height:75vh; overflow-y:auto; padding:5px 10px; font-family:-apple-system, system-ui, sans-serif; font-size:12px; color:#ddd;',
    });

    const kch = KeyCommandHandler;

    const formatCmd = (cmd) => {
      const pre = `<span style="color:#666">${cmd.pre}</span>`;
      const key = `<strong style="color:#4a90e2; font-size:1.2em; margin:0 1px;">${
        cmd.key || (cmd.numRange ? `${cmd.numRange[0]}-${cmd.numRange[1]}` : '')
      }</strong>`;
      const post = `<span style="color:#666">${cmd.post}</span>`;
      return `${pre}${key}${post}`;
    };

    const createSection = (title, items, isFutureSection = false) => {
      const sec = makeElement('div', {
        style: `border:1px solid ${
          isFutureSection ? '#533' : '#333'
        }; background:rgba(20,20,20,0.8); border-radius:8px; padding:12px; box-shadow:0 4px 6px rgba(0,0,0,0.2);`,
      });
      const h = makeElement(
        'div',
        {
          style: `font-weight:800; color:${
            isFutureSection ? '#c66' : '#4a90e2'
          }; border-bottom:1px solid ${
            isFutureSection ? '#533' : '#444'
          }; padding-bottom:6px; margin-bottom:10px; text-transform:uppercase; font-size:11px; letter-spacing:1px;`,
        },
        title
      );
      sec.appendChild(h);

      const grid = makeElement('div', {
        style:
          'display:grid; grid-template-columns:auto 1fr; gap:8px 15px; align-items:center;',
      });
      items.forEach((i) => {
        const kWrap = makeElement('div', {
          style: 'font-family:monospace; white-space:nowrap; text-align:right;',
        });
        kWrap.innerHTML = i.keyStr;
        const desc = makeElement(
          'div',
          {
            style: `color:${
              i.isFuture || isFutureSection ? '#a77' : '#bbb'
            }; line-height:1.3;`,
          },
          i.desc
        );
        grid.appendChild(kWrap);
        grid.appendChild(desc);
      });
      sec.appendChild(grid);
      return sec;
    };

    kch.commands.forEach((cmd) => {
      if (cmd.children && cmd.children.length > 0) {
        const isFuture = cmd.key === 'E';
        const items = cmd.children.map((child) => ({
          keyStr: `${formatCmd(
            cmd
          )} <span style="color:#555; margin:0 4px">›</span> ${formatCmd(
            child
          )}`,
          desc: child.desc,
        }));
        container.appendChild(
          createSection(
            `${cmd.pre}${cmd.key}${cmd.post} Menu${
              isFuture ? ' (Future UI)' : ''
            }`,
            items,
            isFuture
          )
        );
      } else {
        container.appendChild(
          createSection('Standalone Letters', [
            { keyStr: formatCmd(cmd), desc: cmd.desc },
          ])
        );
      }
    });

    container.appendChild(
      createSection('Direct Hotkeys', [
        {
          keyStr:
            '<strong style="color:#4a90e2; font-size:1.1em;">Space</strong>',
          desc: 'Play / Pause Video',
        },
        {
          keyStr:
            '<strong style="color:#4a90e2; font-size:1.1em;">Left / Right</strong>',
          desc: 'Seek Video Back/Forward 2s',
        },
        {
          keyStr:
            '<strong style="color:#4a90e2; font-size:1.1em;">Ctrl + Left/Right</strong>',
          desc: 'Decrease/Increase Video Volume',
        },
        {
          keyStr:
            '<strong style="color:#4a90e2; font-size:1.1em;">Up / Down</strong>',
          desc: 'Decrease/Increase Master Instrument Volume',
        },
        {
          keyStr:
            '<strong style="color:#c66; font-size:1.1em;">Delete / Backspace</strong>',
          desc: 'Delete Selected Note (Future UI)',
          isFuture: true,
        },
      ])
    );

    UITools.makeDialog({
      title: 'Keyboard Shortcuts',
      content: container,
      width: '550px',
      buttons: [{ label: 'Close', className: 'primary' }],
    });
  }

}

