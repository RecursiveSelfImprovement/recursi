
class EventHandlers {
  
  static note(event) {
      const app = AppContext.get();
      if (!app) return;

      const style = window.projectApp?.state?.settings?.keyboardStyle;
      if (app.autoplay === false || style === 'none') return;

      const instruments = app.instruments;
      const pianoVisuals = app.pianoVisuals;

      // Enforce complete exclusivity. If split is disabled, all note events Route to Track 0.
      const splitMethod = window.projectApp?.currentPlayItem?.songSettings?.splitMethod;
      const hasTrack1 = window.VideoEventQueueClass?.current?.timedEvents?.some(
        (e) => e.type === 'note' && e.tr === 1
      );
      const isSplitActive = window.arpEnabled || !!splitMethod || !!hasTrack1;

      const trackId = (isSplitActive && event.tr === 1) ? 1 : 0;
      event.playedTrackId = trackId; // Store the exact track ID used to trigger this note on
      let vol = 3.0;

      try {
        if (instruments && instruments.tracks && instruments.tracks[trackId]) {
          vol = instruments.tracks[trackId].volume ?? 3.0;
        }
      } catch (e) {}

      if (instruments && instruments.noteOn && vol > 0.01) {
        try {
          event.audioHandle = instruments.noteOn(
            event.mc,
            event.v || 100,
            trackId,
            {
              cId: event.chordId,
              cRank: event.chordRank,
            }
          );
        } catch (e) {
          console.error('EventHandlers.note: Audio Error', e);
        }
      }

      if (pianoVisuals && pianoVisuals.toggleNoteDisplay) {
        if (vol > 0.1) {
          try {
            pianoVisuals.toggleNoteDisplay(event.mc, true);
          } catch (e) {
            console.error('EventHandlers.note: Visual Error', e);
          }
        }
      }
    }

  static note_off(event) {
      const app = AppContext.get();
      if (!app) return;

      const style = window.projectApp?.state?.settings?.keyboardStyle;
      if (app.autoplay === false || style === 'none') return;

      const instruments = app.instruments;
      const pianoVisuals = app.pianoVisuals;

      if (instruments) {
        try {
          // Retrieve the track ID that was actually used to trigger this note, falling back safely
          const trackId = event.playedTrackId !== undefined ? event.playedTrackId : (event.tr || 0);
          instruments.noteOff(event.mc, trackId, event.audioHandle);
          event.audioHandle = null;
        } catch (e) {
          console.error('EventHandlers.note_off: Audio Error', e);
        }
      }

      if (pianoVisuals && pianoVisuals.toggleNoteDisplay) {
        try {
          pianoVisuals.toggleNoteDisplay(event.mc, false);
        } catch (e) {
          console.error('EventHandlers.note_off: Visual Error', e);
        }
      }
    }

  static textbox(event) {
      const boxId = `textbox_${event._eventId}`;
      const existingBox = document.getElementById(boxId);
      if (!existingBox) {
        try {
          const boxElem = makeElement(
            'div',
            {
              id: boxId,
              style: {
                position: 'fixed',
                left: `${(event.dims?.[0] ?? 0.1) * 100}%`,
                top: `${(event.dims?.[1] ?? 0.1) * 100}%`,
                width: `${(event.dims?.[2] ?? 0.8) * 100}%`,
                padding: '10px',
                background: `rgba(${event.dims?.[3] ?? 0}, ${
                  event.dims?.[4] ?? 0
                }, ${event.dims?.[5] ?? 0}, 0.8)`,
                color: '#fff',
                border: '1px solid #fff',
                borderRadius: '5px',
                zIndex: 1000,
                opacity: 1,
                transition: 'opacity 0.5s ease',
                pointerEvents: 'none',
                boxSizing: 'border-box',
              },
            },
            event.msg || ''
          );
          const notesContainer = AppContext.getNotesContainer();
          notesContainer.appendChild(boxElem);
        } catch (e) {}
      }
    }

  static textbox_off(event) {
      const boxId = `textbox_${event._eventId}`;
      const boxElem = document.getElementById(boxId);
      if (boxElem) {
        boxElem.style.opacity = '0';
        setTimeout(() => boxElem.remove(), 550);
      }
    }

  static karaoke(event) {}

  static karaoke_off(event) {}

  static jump(event) {
      const app = AppContext.get();
      const synchronizer = app?.synchronizer;
      if (synchronizer?.videoPlayer && event.dims?.[0] !== undefined) {
        synchronizer.videoPlayer.seekTo(event.dims[0] / 1000.0);
      }
    }

  static setting(event) {
      // Intentionally ignore 'videovolume' to rely entirely on YouTube's native volume preference.
    }

  

  

  static info(event) {}

  static warn(event) {}

  static error(event) {}

  static event_off(event) {}

  static _safeLog(message, type) {
      if (typeof window.logToPage === 'function') {
        window.logToPage(message, type);
      }
    }

  static karaokebox(event) {}

  static karaokebox_off(event) {}

  mute(event) {
      const app = AppContext.get();
      if (!app || !app.videoPlayer) return;
      
      const currentVol = app.videoPlayer.getVolume();
      window.smartLog('Volume', `[Mute Event] Triggered. Captured YT Vol: ${currentVol}`);
      
      app._scriptMuted = true;
      app._preMuteVolume = currentVol;
      app.videoPlayer.setVolume(0);
    }

  mute_off(event) {
      const app = AppContext.get();
      if (!app || !app.videoPlayer) return;
      
      app._scriptMuted = false;
      let desiredVol = window.projectApp?.state?.settings?.videoVolume ?? app._preMuteVolume ?? 100;
      
      window.smartLog('Volume', `[Mute_Off Event] Triggered. Restoring to: ${desiredVol}`);
      app.videoPlayer.setVolume(desiredVol);
    }


  static mute(event) {
      const app = AppContext.get();
      if (!app || !app.videoPlayer) return;
      
      const currentVol = app.videoPlayer.getVolume();
      window.smartLog('Volume', `[Mute Event] Triggered. Captured YT Vol: ${currentVol}`);
      
      app._scriptMuted = true;
      app._preMuteVolume = currentVol;
      app.videoPlayer.setVolume(0);
    }

  static mute_off(event) {
      const app = AppContext.get();
      if (!app || !app.videoPlayer) return;
      
      app._scriptMuted = false;
      let desiredVol = window.projectApp?.state?.settings?.videoVolume ?? app._preMuteVolume ?? 100;
      
      window.smartLog('Volume', `[Mute_Off Event] Triggered. Restoring to: ${desiredVol}`);
      app.videoPlayer.setVolume(desiredVol);
    }
}

