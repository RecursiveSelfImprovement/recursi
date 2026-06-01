
class PianoRollController {
  
  constructor(player) {
    this.player = player;
  }

  syncSelected() {
    if (
      !this.player.gt ||
      !this.player.gt.videoPlayer ||
      !window.VideoEventQueueClass
    )
      return;

    const timeObj = this.player.gt.videoPlayer.getAccurateTime();
    const res = window.VideoEventQueueClass.synchronizeSelectedToTime(
      timeObj.time * 1000
    );

    if (res.success) {
      this.player.gt.synchronizer?.loadVEQ(window.VideoEventQueueClass.current);
      this.player._refreshVisuals();
      this.player.setStatus('Pinned & Stretched.', '#ff4444');
    } else {
      this.player.setStatus(
        'Error: Select one note first (S to sync).',
        '#ff0000'
      );
    }
  }

  undo() {
    if (!window.VideoEventQueueClass) return;
    const result = window.VideoEventQueueClass.undo();
    if (result.success) {
      this.player.setStatus('Undo successful.', '#4f4');
      this.player._refreshVisuals();
    } else {
      this.player.setStatus('Nothing to undo.', '#fa0');
    }
  }

  deleteSelected() {
    if (!window.VideoEventQueueClass) return;
    const result = window.VideoEventQueueClass.deleteSelectedEvents();
    if (result.success) {
      this.player.setStatus('Note deleted.', '#f55');
      this.player._refreshVisuals();
    } else {
      this.player.setStatus('Nothing selected to delete.', '#fa0');
    }
  }

  splitTracks(method, param, skipSave = false) {
    if (!window.VideoEventQueueClass) return;
    window.VideoEventQueueClass.pushUndoState();

    const veq = window.VideoEventQueueClass.current;
    const notes = veq.timedEvents.filter((e) => e.type === 'note');
    let count = 0;

    if (method === 'chord') {
      count = window.VideoEventQueueClass.analyzeAndTagChords();
    } else if (method === 'pitch') {
      const splitPitch = param || 60;
      notes.forEach((n) => {
        if (n.mc < splitPitch) {
          n.tr = 1;
          n.chordRank = 0;
          count++;
        } else {
          n.tr = 0;
        }
      });
    } else if (method === 'smart') {
      count = window.VideoEventQueueClass.analyzeAndTagChords();
      const splitPitch = param || 60;
      notes.forEach((n) => {
        if (n.tr === 0 && n.mc < splitPitch) {
          n.tr = 1;
          delete n.chordId;
          delete n.chordRank;
          count++;
        }
      });
    }

    if (!skipSave) {
      this.player._updateSongSettings({
        splitMethod: method,
        splitPitch: param,
      });
      this.player.setStatus(
        `Split complete. ${count} notes/chords processed.`,
        '#4f4'
      );
    }

    if (this.player.gt && this.player.gt.instruments) {
      const instruments = this.player.gt.instruments;

      if (!instruments.tracks[1]) {
        instruments.tracks[1] = {
          instrument: 'Vibes',
          volume: 4.0,
          octaveShift: 0,
        };
      }

      instruments.setTrackInstrument(1, instruments.tracks[1].instrument);
    }

    this.player._refreshVisuals();

    if (this.player.headerControlsUI) {
      this.player.headerControlsUI.build();
    } else if (typeof this.player._buildHeaderControls === 'function') {
      this.player._buildHeaderControls();
    }

    if (this.player.gt && this.player.gt.synchronizer) {
      this.player.gt.synchronizer.resyncScheduler();
    }
  }

  swapTracks() {
    if (!window.VideoEventQueueClass) return;
    window.VideoEventQueueClass.pushUndoState();

    const veq = window.VideoEventQueueClass.current;
    veq.timedEvents.forEach((e) => {
      if (e.type === 'note') {
        e.tr = e.tr === 1 ? 0 : 1;
      }
    });
    this.player.setStatus(`Swapped Melody/Backing tracks.`, '#4f4');
    this.player._refreshVisuals();
  }

  tagChords() {
    if (!window.VideoEventQueueClass) return;
    const count = window.VideoEventQueueClass.analyzeAndTagChords();
    if (this.player.gt?.instruments) {
      this.player.gt.instruments.setTrackInstrument(1, 'Vibes');
    }
    this.player.setStatus(`Tagged ${count} chords.`, '#4f4');
    this.player._refreshVisuals();
  }

  applyStrum(spreadMs) {
    if (!window.VideoEventQueueClass) return;
    window.VideoEventQueueClass.pushUndoState();

    const veq = window.VideoEventQueueClass.current;
    let notes = veq.timedEvents.filter((e) => e.type === 'note');
    const selected = notes.filter((e) => e.selected);
    const targetNotes = selected.length > 0 ? selected : notes;

    targetNotes.sort((a, b) => {
      if (Math.abs(a.t - b.t) > 15) return a.t - b.t;
      return a.mc - b.mc;
    });

    const groups = [];
    if (targetNotes.length > 0) {
      let cur = [targetNotes[0]];
      for (let i = 1; i < targetNotes.length; i++) {
        if (Math.abs(targetNotes[i].t - cur[0].t) <= 15)
          cur.push(targetNotes[i]);
        else {
          groups.push(cur);
          cur = [targetNotes[i]];
        }
      }
      groups.push(cur);
    }

    let count = 0;
    groups.forEach((g) => {
      if (g.length < 2) return;
      g.sort((a, b) => a.mc - b.mc);
      const totalSpread = spreadMs;
      const step = g.length > 1 ? totalSpread / (g.length - 1) : 0;
      const startTime = g[0].t - totalSpread / 2.0;
      g.forEach((n, i) => {
        n.t = startTime + i * step;
        n._eventId = `strum_${Date.now()}_${count}_${i}_${Math.random()
          .toString(36)
          .substr(2, 5)}`;
      });
      count++;
    });

    window.VideoEventQueueClass.sort(veq.timedEvents);
    window.VideoEventQueueClass.notifySubscribers();
    this.player._refreshVisuals();
    console.log(`Strummed ${count} chords.`);
  }

  applyArp(patternString, durPct, gapMs) {
    if (!window.VideoEventQueueClass) return;
    window.VideoEventQueueClass.pushUndoState();

    window.VideoEventQueueClass.sort(veq.timedEvents);
    window.VideoEventQueueClass.notifySubscribers();
    this.player._refreshVisuals();

    if (this.player.gt && this.player.gt.synchronizer) {
      console.log('Arp applied: Forcing Scheduler Resync.');
      this.player.gt.synchronizer.resyncScheduler();
    }
  }

  promptChangePitch() {
      const container = makeElement('div', {
        style: 'padding:10px; display:flex; flex-direction:column; gap:10px;',
      });
      const label = makeElement(
        'div',
        { style: 'color:#ccc; font-size:12px; line-height:1.4;' },
        'Enter semitones to shift pitch (e.g., 12 for an octave up, -12 for down). ' +
          'This permanently moves the notes in the piano roll data without altering the playback transpose setting.'
      );
      const input = makeElement('input', {
        type: 'number',
        value: '12',
        style:
          'background:#111; color:#fff; padding:6px; border:1px solid #444; border-radius:4px; font-size:14px;',
      });
      container.append(label, input);
  
      const box = UITools.makeDialog({
        title: 'Change Pitch',
        content: container,
        width: '320px',
        appendTo: this.player.rootElement,
        buttons: [
          {
            label: 'Apply',
            className: 'primary',
            onClick: () => {
              const delta = parseInt(input.value, 10);
              if (!isNaN(delta) && delta !== 0) {
                if (window.VideoEventQueueClass) {
                  window.VideoEventQueueClass.pushUndoState();
  
                  window.VideoEventQueueClass.current.timedEvents.forEach((e) => {
                    if (e.type === 'note' && typeof e.mc === 'number') {
                      e.mc += delta;
                    }
                  });
  
                  window.VideoEventQueueClass.notifySubscribers();
                  this.player._refreshVisuals();
  
                  if (this.player.gt && this.player.gt.pianoVisuals) {
                    this.player.gt.pianoVisuals.loadVeq(
                      window.VideoEventQueueClass.current
                    );
  
                    if (
                      this.player.gt.videoPlayer &&
                      this.player.gt.videoPlayer.isReady
                    ) {
                      const nowMs =
                        this.player.gt.videoPlayer.getAccurateTime().time * 1000;
                      this.player.gt.pianoVisuals.setTime(nowMs, 0, true);
                      if (this.player.gt.pianoVisuals.forceRefreshFlyingBars) {
                        this.player.gt.pianoVisuals.forceRefreshFlyingBars(nowMs);
                      }
                    }
                  }
  
                  this.player.setStatus(
                    `Pitch of all notes shifted by ${delta} semitones`,
                    '#4f4'
                  );
                }
              }
              box.close();
            },
          },
          { label: 'Cancel', onClick: () => box.close() },
        ],
      });
      setTimeout(() => input.focus(), 100);
    }

  promptShiftTime() {
      const container = makeElement('div', {
        style: 'padding:10px; display:flex; flex-direction:column; gap:10px;',
      });
      const label = makeElement(
        'div',
        { style: 'color:#ccc; font-size:12px; line-height:1.4;' },
        'Enter seconds to shift ALL notes (e.g., 1.5 to delay, -0.5 to advance):'
      );
      const input = makeElement('input', {
        type: 'number',
        step: '0.1',
        value: '0',
        style:
          'background:#111; color:#fff; padding:6px; border:1px solid #444; border-radius:4px; font-size:14px;',
      });
      container.append(label, input);
  
      const box = UITools.makeDialog({
        title: 'Shift Time',
        content: container,
        width: '320px',
        appendTo: this.player.rootElement,
        buttons: [
          {
            label: 'Apply',
            className: 'primary',
            onClick: () => {
              const deltaSec = parseFloat(input.value);
              if (!isNaN(deltaSec) && deltaSec !== 0) {
                if (window.VideoEventQueueClass) {
                  window.VideoEventQueueClass.pushUndoState();
                  const deltaMs = deltaSec * 1000;
                  window.VideoEventQueueClass.current.timedEvents.forEach((e) => {
                    e.t = Math.max(0, e.t + deltaMs);
                  });
                  window.VideoEventQueueClass.sort(
                    window.VideoEventQueueClass.current.timedEvents
                  );
                  window.VideoEventQueueClass.notifySubscribers();
                  this.player._refreshVisuals();
                  if (this.player.gt?.synchronizer) {
                    this.player.gt.synchronizer.resyncScheduler();
                  }
                  this.player.setStatus(
                    `Time shifted by ${deltaSec} seconds`,
                    '#4f4'
                  );
                }
              }
              box.close();
            },
          },
          { label: 'Cancel', onClick: () => box.close() },
        ],
      });
      setTimeout(() => input.focus(), 100);
    }

  insertMarkerAtCurrentTime() {
    if (!window.VideoEventQueueClass) return;
    const player = this.player.gt;
    if (!player) return;
    const timeMs = (player.videoPlayer?.getCurrentRawTime() || 0) * 1000;
    window.VideoEventQueueClass.insertMarker(timeMs);
    this.player._refreshVisuals();
    this.player.setStatus(`Marker at ${(timeMs / 1000).toFixed(2)}s`, '#fff');
  }

  promptInsertMute() {
      const player = this.player.gt;
      if (!player) return;
      const capturedTimeMs =
        (player.videoPlayer?.getCurrentRawTime() || 0) * 1000;
      const wasPlaying = player.videoPlayer?.isPlaying();
  
      if (wasPlaying) player.pause();
  
      if (typeof UITools === 'undefined') return;
  
      const container = makeElement('div', {
        style: 'padding:10px; display:flex; flex-direction:column; gap:10px;',
      });
      const label = makeElement(
        'div',
        { style: 'color:#ccc; font-size:12px; line-height:1.4;' },
        `Mute the audio at ${(capturedTimeMs / 1000).toFixed(2)}s for how long?`
      );
      const input = makeElement('input', {
        type: 'number',
        step: '0.1',
        value: '0.2',
        style:
          'background:#111; color:#fff; padding:6px; border:1px solid #444; border-radius:4px; font-size:14px;',
      });
      const tip = makeElement(
        'div',
        { style: 'color:#888; font-size:11px; font-style:italic;' },
        'Tip: 0.2s is usually enough to silence one word.'
      );
  
      container.append(label, input, tip);
  
      const box = UITools.makeDialog({
        title: 'Insert Video Mute',
        content: container,
        width: '320px',
        appendTo: this.player.rootElement,
        buttons: [
          {
            label: 'Insert & Preview',
            className: 'primary',
            onClick: () => {
              const durationSec = parseFloat(input.value) || 0.2;
              if (window.VideoEventQueueClass) {
                window.VideoEventQueueClass.insertMute(
                  capturedTimeMs,
                  durationSec * 1000
                );
                if (player.synchronizer) player.synchronizer.resyncScheduler();
  
                player.seekTo(Math.max(0, capturedTimeMs / 1000 - 10));
                player.play();
  
                this.player._refreshVisuals();
                this.player.setStatus(
                  `Mute inserted at ${(capturedTimeMs / 1000).toFixed(2)}s`,
                  '#fa0'
                );
              }
              box.close();
            },
          },
          {
            label: 'Cancel',
            onClick: () => {
              if (wasPlaying) player.play();
              box.close();
            },
          },
        ],
      });
      setTimeout(() => input.focus(), 100);
    }

}

