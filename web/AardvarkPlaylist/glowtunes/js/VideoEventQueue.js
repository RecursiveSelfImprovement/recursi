class VideoEventQueue {

    static load(veqData) {
    if (!veqData || !Array.isArray(veqData.timedEvents)) {
      console.warn(
        'VideoEventQueue: Invalid data loaded. Must have timedEvents array.',
        veqData
      );
      this.current = {timedEvents: [], sourceFormat: 'invalid'};
      this.isSorted = true;
      return;
    }
    this.current = {...veqData, timedEvents: [...veqData.timedEvents]};
    this.sort(this.current.timedEvents);
    this.isSorted = true;
    console.log(
      `VideoEventQueue: Loaded and sorted ${this.current.timedEvents.length} events.`
    );
    this.expose(); // Ensure it's available
  }

  static clear() {
    // Completely reset the static current object
    this.current = {timedEvents: [], sourceFormat: 'cleared', metadata: {}};
    this.isSorted = true;
    this._lastEventId = 0;
    console.log('VideoEventQueue: Database cleared.');
  }

  static getEventsInRange(startTimeMs, endTimeMs) {
    if (!this.isSorted) {
      console.warn(
        'VideoEventQueue: getEventsInRange called on potentially unsorted data. Sorting now.'
      );
      this.sort(this.current.timedEvents);
      this.isSorted = true;
    }
    const events = this.current.timedEvents;
    const results = [];
    let startIndex = -1;
    let low = 0,
      high = events.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (events[mid].t <= startTimeMs) {
        low = mid + 1;
      } else {
        startIndex = mid;
        high = mid - 1;
      }
    }
    if (startIndex === -1) startIndex = low;

    for (let i = startIndex; i < events.length; i++) {
      const event = events[i];
      if (event.t > startTimeMs && event.t <= endTimeMs) {
        if (event._eventId === undefined) {
          event._eventId = `evt_${VideoEventQueue._lastEventId++}`;
        }
        results.push(event);
      }
      if (event.t > endTimeMs) {
        break;
      }
    }
    return results;
  }

  static sort(timedEvents) {
    if (!timedEvents) return;
    timedEvents.sort((a, b) => {
      if (a.t < b.t) return -1;
      if (a.t > b.t) return 1;
      if (a.type?.endsWith('_off') && !b.type?.endsWith('_off')) return -1;
      if (!a.type?.endsWith('_off') && b.type?.endsWith('_off')) return 1;
      return 0;
    });
  }

  static parse(text) {
    if (!text || typeof text !== 'string') {
      return {timedEvents: [], sourceFormat: 'invalid-input', metadata: {}};
    }
    text = text.trim();

    // JSON Check
    if (text.startsWith('{')) {
      try {
        const jsonData = JSON.parse(text);
        if (
          typeof jsonData === 'object' &&
          jsonData !== null &&
          Array.isArray(jsonData.timedEvents)
        ) {
          jsonData.sourceFormat = 'json';
          jsonData.metadata = jsonData.metadata || {};
          return jsonData;
        }
      } catch (e) {
        /* Fall through */
      }
    }

    const lines = text.split(/[\r\n]+/);
    const dataChunks = {};

    let currentChunkName = 'timedevents';
    dataChunks[currentChunkName] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('----')) {
        const headerName = line.replace(/^-+/, '').trim().toLowerCase();
        currentChunkName = headerName || 'unknown';
        if (!dataChunks[currentChunkName]) dataChunks[currentChunkName] = [];
      } else if (dataChunks[currentChunkName]) {
        dataChunks[currentChunkName].push(line);
      }
    }

    const veq = {timedEvents: [], metadata: {}, sourceFormat: 'compact'};

    // Process timedEvents
    if (dataChunks.timedevents) {
      let lastTimeMs = 0;
      for (const line of dataChunks.timedevents) {
        const item = VideoEventQueue._parseEventLine(line);
        if (item) {
          lastTimeMs += item.t;
          item.t = lastTimeMs;
          veq.timedEvents.push(item);
        }
      }
    }

    // Process Metadata
    if (dataChunks.name && dataChunks.name.length > 0) {
      veq.metadata.name = dataChunks.name.join('\n').trim();
    }
    if (dataChunks.credit) {
      veq.metadata.credit = dataChunks.credit.join('\n');
      const ytIdRegex = /[a-zA-Z0-9_-]{11}/;
      const match = veq.metadata.credit.match(ytIdRegex);
      if (match) veq.videoId = match[0];
    }
    if (dataChunks.youtubeid) {
      veq.videoId = dataChunks.youtubeid[0]?.trim();
    }
    if (dataChunks.transpose && dataChunks.transpose[0]) {
      const transposeVal = parseInt(dataChunks.transpose[0].trim(), 10);
      if (!isNaN(transposeVal)) {
        veq.metadata.transpose = transposeVal;
      }
    }
    if (dataChunks.start && dataChunks.start[0]) {
      const startVal = parseFloat(dataChunks.start[0].trim());
      if (!isNaN(startVal)) {
        veq.metadata.start = startVal;
      }
    }

    return veq;
  }

  static _parseEventLine(s) {
    if (!s) return null;

    const match = s.match(/^(\d+)\s+(marker|mute|mute_off)(?:\s+(.*))?$/);
    if (match) {
      const event = {t: parseInt(match[1], 10), type: match[2]};
      if (match[2] === 'marker') event.label = match[3] || '';
      return event;
    }

    const getSubVal = (char, str) => {
      const i = str.indexOf(char);
      if (i === -1) return null;
      const val = parseInt(str.substring(i + 1));
      return isNaN(val) ? null : val;
    };

    const relativeTime = parseInt(s);
    if (isNaN(relativeTime)) return null;

    const event = {t: relativeTime}; // The time is already in milliseconds

    const specialIndex = s.indexOf('~');
    if (specialIndex > -1) {
      const eventStr = s.substring(specialIndex + 1);
      const typeIndex = eventStr.indexOf(':');
      if (typeIndex === -1) return null;

      event.type = eventStr.substring(0, typeIndex);
      let msg = eventStr.substring(typeIndex + 1);

      if (msg.startsWith('[')) {
        const dimsEndIndex = msg.indexOf(']');
        if (dimsEndIndex > -1) {
          const dimsStr = msg.substring(1, dimsEndIndex);
          event.dims = dimsStr.split(',').map((item) => {
            const num = parseFloat(item);
            return isNaN(num) ? item.trim() : num;
          });
          event.msg = msg.substring(dimsEndIndex + 1);
        }
      } else {
        event.msg = msg;
      }
      const duration = getSubVal('d', s.substring(0, specialIndex));
      if (duration !== null) {
        event.d = duration; // Duration is also in milliseconds
      }
      return event;
    }

    const midiCode = getSubVal('m', s);
    if (midiCode !== null) {
      event.type = 'note';
      event.mc = midiCode;
      event.d = getSubVal('d', s) || 1000; // Duration is in milliseconds
      event.v = getSubVal('v', s) || 100;
      return event;
    }

    return null;
  }

  static toggleEventSelection(event, keepOthers = false) {
    if (!event) return false;

    if (!keepOthers) {
      // Count currently selected notes.
      const currentlySelected = this.current.timedEvents.filter(
        (e) => e.selected
      );
      const isOnlyOneSelected =
        currentlySelected.length === 1 && currentlySelected[0] === event;

      if (isOnlyOneSelected) {
        // Clicked the only selected note — deselect it.
        event.selected = false;
        event._selectedAt = 0;
      } else {
        // Replace selection with just this note.
        this.current.timedEvents.forEach((e) => {
          if (e !== event) {
            e.selected = false;
            e._selectedAt = 0;
          }
        });
        event.selected = true;
        event._selectedAt = Date.now();
      }
    } else {
      event.selected = !event.selected;
      event._selectedAt = event.selected ? Date.now() : 0;
    }

    console.log('[VideoEventQueue] Selection toggled. Notifying...');
    this.notifySubscribers();
    return event.selected;
  }

  static getSelectedEvent() {
    return this.current.timedEvents.find((e) => e.selected);
  }

  static synchronizeSelectedToTime(targetTimeMs) {
    const selectedEvent = this.getPrimarySelection();
    if (!selectedEvent) return {success: false, msg: 'No note selected'};

    this.pushUndoState();

    const oldTime = selectedEvent.t;
    const newTime = targetTimeMs;

    // Pin the selected note
    selectedEvent.pinned = true;

    // Find segment boundaries based on markers
    const markers = this.current.timedEvents
      .filter((e) => e.type === 'marker')
      .map((e) => e.t)
      .sort((a, b) => a - b);

    const segmentStart = Math.max(
      0,
      ...markers.filter((t) => t <= oldTime).concat([0])
    );
    const segmentEnd = markers.find((t) => t > oldTime) ?? Infinity;

    const events = this.current.timedEvents;
    const pinnedIndices = [];
    events.forEach((e, i) => {
      if (
        e.pinned &&
        e.t >= segmentStart &&
        e.t < segmentEnd &&
        e.type !== 'marker'
      ) {
        pinnedIndices.push(i);
      }
    });

    if (pinnedIndices.length === 1) {
      const shiftAmount = newTime - oldTime;
      events.forEach((e) => {
        if (e.t >= segmentStart && e.t < segmentEnd && e.type !== 'marker') {
          e.t += shiftAmount;
        }
      });
      selectedEvent.t = newTime;
      console.log(
        `[Sync] Global shift in segment by ${shiftAmount.toFixed(2)}ms`
      );
      this.notifySubscribers();
      return {success: true};
    }

    const targetTimes = new Map();
    pinnedIndices.forEach((idx) => {
      const ev = events[idx];
      if (ev === selectedEvent) {
        targetTimes.set(idx, newTime);
      } else {
        targetTimes.set(idx, ev.t);
      }
    });

    const applyTransform = (
      startIndex,
      endIndex,
      tStartOld,
      tEndOld,
      tStartNew,
      tEndNew
    ) => {
      if (Math.abs(tEndOld - tStartOld) < 1) return 1.0;
      const ratio = (tEndNew - tStartNew) / (tEndOld - tStartOld);
      for (let i = startIndex; i <= endIndex; i++) {
        const ev = events[i];
        if (ev.t >= segmentStart && ev.t < segmentEnd && ev.type !== 'marker') {
          const dist = ev.t - tStartOld;
          ev.t = tStartNew + dist * ratio;
        }
      }
      return ratio;
    };

    let firstSegmentRatio = 1.0;
    let lastSegmentRatio = 1.0;

    for (let k = 0; k < pinnedIndices.length - 1; k++) {
      const idxA = pinnedIndices[k];
      const idxB = pinnedIndices[k + 1];
      const timeA_old =
        events[idxA] === selectedEvent ? oldTime : events[idxA].t;
      const timeB_old =
        events[idxB] === selectedEvent ? oldTime : events[idxB].t;
      const timeA_new = targetTimes.get(idxA);
      const timeB_new = targetTimes.get(idxB);
      const ratio = applyTransform(
        idxA,
        idxB,
        timeA_old,
        timeB_old,
        timeA_new,
        timeB_new
      );
      if (k === 0) firstSegmentRatio = ratio;
      if (k === pinnedIndices.length - 2) lastSegmentRatio = ratio;
    }

    if (pinnedIndices[0] > 0) {
      const firstPinIdx = pinnedIndices[0];
      const firstPin = events[firstPinIdx];
      const firstPinTime_new = targetTimes.get(firstPinIdx);
      const firstPinTime_old =
        firstPin === selectedEvent ? oldTime : firstPin.t;
      for (let i = 0; i < firstPinIdx; i++) {
        const ev = events[i];
        if (ev.t >= segmentStart && ev.t < segmentEnd && ev.type !== 'marker') {
          const dist = ev.t - firstPinTime_old;
          ev.t = firstPinTime_new + dist * firstSegmentRatio;
        }
      }
    }

    const lastPinIdx = pinnedIndices[pinnedIndices.length - 1];
    if (lastPinIdx < events.length - 1) {
      const lastPin = events[lastPinIdx];
      const lastPinTime_new = targetTimes.get(lastPinIdx);
      const lastPinTime_old = lastPin === selectedEvent ? oldTime : lastPin.t;
      for (let i = lastPinIdx + 1; i < events.length; i++) {
        const ev = events[i];
        if (ev.t >= segmentStart && ev.t < segmentEnd && ev.type !== 'marker') {
          const dist = ev.t - lastPinTime_old;
          ev.t = lastPinTime_new + dist * lastSegmentRatio;
        }
      }
    }

    selectedEvent.t = newTime;
    console.log(
      `[Sync] Stretched with ${pinnedIndices.length} pins in segment.`
    );
    this.notifySubscribers();
    return {success: true};
  }

  static expose() {
    this.veq_state(); // Initialize state and dynamic properties
    
    window.VideoEventQueueClass = this;
    window.HackerAPI = window.HackerAPI || {};
    window.HackerAPI.VideoEventQueue = this;
    
    window.splitKaraokeLines = (opts) => {
      return this.splitLongKaraokeLines(opts || {});
    };
    
    window.reloadKaraoke = () => {
      this.notifySubscribers();
      return {success: true};
    };
  }

  static undoStack = [];

  static pushUndoState() {
    if (!this.current || !this.current.timedEvents) return;
    // Deep copy
    const state = JSON.stringify(this.current.timedEvents);
    this.undoStack.push(state);
    // Keep memory sane
    if (this.undoStack.length > 50) this.undoStack.shift();
  }

  static undo() {
    if (this.undoStack.length === 0)
      return {success: false, msg: 'Nothing to undo'};
    const state = this.undoStack.pop();

    // Restore
    this.current.timedEvents = JSON.parse(state);

    // Re-sort just in case, though usually unnecessary if restoring valid state
    // this.sort(this.current.timedEvents);

    console.log(
      `[VideoEventQueue] Undo successful. Stack size: ${this.undoStack.length}`
    );
    return {success: true};
  }

  static deleteSelectedEvents() {
    const selected = this.getSelectedEvents().filter((e) => !e.pinned);
    if (selected.length === 0)
      return {success: false, msg: 'No unpinned notes selected'};

    this.pushUndoState();

    const initialCount = this.current.timedEvents.length;
    this.current.timedEvents = this.current.timedEvents.filter(
      (e) => !(e.selected && !e.pinned)
    );
    const deletedCount = initialCount - this.current.timedEvents.length;

    console.log(`[VideoEventQueue] Deleted ${deletedCount} events.`);
    this.notifySubscribers();
    return {success: true};
  }

  static subscribers = [];

  static subscribe(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
    }
  }

  static notifySubscribers() {
    this.subscribers.forEach((cb) => cb());
  }

  static getSelectedEvents() {
    if (!this.current || !this.current.timedEvents) return [];
    return this.current.timedEvents.filter((e) => e.selected);
  }

  static getPrimarySelection() {
    if (!this.current || !this.current.timedEvents) return null;
    const selected = this.current.timedEvents.filter(
      (e) => e.selected && e.type === 'note'
    );
    if (selected.length === 0) return null;

    // Most recently clicked wins. Fall back to queue order (last item)
    // for any events that predate the _selectedAt stamp.
    let best = selected[0];
    let bestStamp = best._selectedAt || 0;
    for (let i = 1; i < selected.length; i++) {
      const s = selected[i].selected ? selected[i] : null;
      if (!s) continue;
      const stamp = s._selectedAt || 0;
      // Prefer larger stamp; if both are zero prefer later in queue.
      if (stamp > bestStamp || (stamp === 0 && bestStamp === 0)) {
        best = s;
        bestStamp = stamp;
      }
    }
    return best;
  }

  static async copySelectionToClipboard() {
    const selected = this.getSelectedEvents();
    if (selected.length === 0)
      return {success: false, msg: 'No notes selected'};

    // Find the earliest time to use as a relative anchor
    const minTime = Math.min(...selected.map((e) => e.t));

    // Create a clean clipboard object
    const clipboardData = selected.map((e) => ({
      ...e,
      selected: false,
      pinned: false,
      t: e.t - minTime, // Store relative time
    }));

    const text = JSON.stringify(clipboardData);

    try {
      await navigator.clipboard.writeText(text);
      console.log(
        `[VideoEventQueue] Copied ${selected.length} events to clipboard.`
      );
      return {success: true, count: selected.length};
    } catch (err) {
      console.error('Failed to copy: ', err);
      return {success: false, msg: 'Clipboard write failed'};
    }
  }

  static async pasteFromClipboard(atTimeMs) {
    try {
      const text = await navigator.clipboard.readText();
      const clipEvents = JSON.parse(text);

      if (!Array.isArray(clipEvents) || clipEvents.length === 0) {
        return {success: false, msg: 'Invalid clipboard data'};
      }

      this.pushUndoState();

      // Deselect current
      this.current.timedEvents.forEach((e) => (e.selected = false));

      const newEvents = clipEvents.map((e) => {
        const newEvent = {...e};
        // Generate new ID
        newEvent._eventId = `evt_${this._lastEventId++}_paste`;
        // Apply time offset
        newEvent.t = atTimeMs + (e.t || 0);
        // Select the pasted notes
        newEvent.selected = true;
        return newEvent;
      });

      // Merge
      this.current.timedEvents.push(...newEvents);
      this.sort(this.current.timedEvents);

      this.notifySubscribers();
      return {success: true, count: newEvents.length};
    } catch (err) {
      console.error('Failed to paste: ', err);
      return {success: false, msg: 'Paste failed or invalid data'};
    }
  }

  static hasUndo() {
    return this.undoStack.length > 0;
  }

  static analyzeAndTagChords() {
    this.pushUndoState();

    const notes = this.current.timedEvents.filter((e) => e.type === 'note');
    let chordCount = 0;
    const splitPitch = window.projectApp?.state?.settings?.splitPitch || 60;

    // 1. CLEAN SLATE & INITIAL SPLIT
    // Move notes to Track 1 (Bass) only if they are below the split point
    notes.forEach((n) => {
      n.tr = n.mc < splitPitch ? 1 : 0;
      delete n.chordId;
      delete n.chordRank;
    });

    // 2. ROBUST TIME CLUSTERING (TRACK 1 ONLY)
    // We completely ignore Track 0 (Melody) so it never gets swept into a chord
    const bassNotes = notes.filter((n) => n.tr === 1);
    bassNotes.sort((a, b) => a.t - b.t);

    const clusters = [];
    if (bassNotes.length > 0) {
      let currentCluster = [bassNotes[0]];
      for (let i = 1; i < bassNotes.length; i++) {
        const n = bassNotes[i];
        const first = currentCluster[0];
        // Anchor tolerance to the start of the chord (30ms window)
        if (Math.abs(n.t - first.t) <= 30) {
          currentCluster.push(n);
        } else {
          clusters.push(currentCluster);
          currentCluster = [n];
        }
      }
      clusters.push(currentCluster);
    }

    // 3. APPLY LOGIC
    clusters.forEach((cluster) => {
      if (cluster.length >= 2) {
        chordCount++;
        const chordId = `ch_${cluster[0].t}_${chordCount}`;

        // Sort by Pitch (Low -> High)
        cluster.sort((a, b) => a.mc - b.mc);

        // Take up to 4 notes for the chord
        const chordNotes = cluster.slice(0, 4);

        chordNotes.forEach((n, rank) => {
          n.chordId = chordId;
          n.chordRank = rank;
        });
      }
    });

    console.log(
      `[VideoEventQueue] Smart Split Analysis Complete. Tagged ${chordCount} bass chord clusters.`
    );
    this.notifySubscribers();
    return chordCount;
  }

  static findChords(force = true) {
      const allNotes = this.current.timedEvents.filter((e) => e.type === 'note');
      if (force) {
        allNotes.forEach((n) => {
          delete n.chordId;
          delete n.chordRank;
        });
      }

      // Extract structurally verified 3-note chords using SmartArpController
      const trueChords = SmartArpController.extractTrueChords(allNotes);

      let count = 0;
      trueChords.forEach((g) => {
        count++;
        g.sort((a, b) => a.mc - b.mc);
        const chordId = `c_${Date.now()}_${count}`;

        g.forEach((n, rank) => {
          n.chordId = chordId;
          n.chordRank = rank;
          n.tr = 1; // Explicitly assign to Bass (Track 1)
        });
      });

      return count;
    }

  static resetChordTiming() {
    this.pushUndoState();
    let count = 0;
    this.current.timedEvents.forEach((e) => {
      if (e.selected && e.origT !== undefined) {
        e.t = e.origT;
        count++;
      }
    });
    this.sort(this.current.timedEvents);
    this.notifySubscribers();
    return count;
  }

  static collapseSelectedToChord() {
    const selected = this.getSelectedEvents().filter((e) => e.type === 'note');
    if (selected.length < 2)
      return {success: false, msg: 'Select at least 2 notes'};

    this.pushUndoState();

    // Sort by pitch - highest note becomes the "Primary"
    selected.sort((a, b) => b.mc - a.mc);
    const primary = selected[0];
    const others = selected.slice(1);

    // Store metadata on the primary note
    primary.subNotes = others.map((n) => ({
      mc: n.mc,
      v: n.v || 100,
      // We store relative offsets or properties here if needed,
      // but the actual timing is calculated live by the scheduler/sliders
    }));

    // Remove the other notes from the main queue
    this.current.timedEvents = this.current.timedEvents.filter(
      (e) => !others.includes(e)
    );

    // Mark primary as a chord for visual distinction
    primary.isChordLead = true;

    this.notifySubscribers();
    return {success: true, count: selected.length};
  }

  static splitLongKaraokeLines(opts = {}) {
    const maxChars = opts.maxChars || 28;
    const minChars = opts.minChars || 8;
    const preRoll = opts.preRoll || 700;

    if (!this.current || !this.current.timedEvents) {
      return {success: false, msg: 'No VEQ loaded'};
    }

    this.pushUndoState();

    const events = this.current.timedEvents;
    const newEvents = [];
    let splitCount = 0;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.type !== 'karaokebox') {
        newEvents.push(ev);
        continue;
      }

      const splits = this._splitKaraokeEvent(ev, maxChars, minChars, preRoll);
      if (splits.length > 1) {
        splitCount += splits.length - 1;
        newEvents.push(...splits);
      } else {
        newEvents.push(ev);
      }
    }

    this.current.timedEvents = newEvents;
    this.sort(this.current.timedEvents);
    this.isSorted = true;

    // Clear any in-flight scheduled events whose timings are now stale.
    // The synchronizer will reschedule from scratch on its next tick using
    // getEventsInRange against the mutated queue.
    try {
      if (window.HackerAPI?.VideoEventScheduler?.stopAndClearQueue) {
        window.HackerAPI.VideoEventScheduler.stopAndClearQueue();
      }
    } catch (e) {
      /* no-op */
    }

    console.log(
      `[VideoEventQueue] splitLongKaraokeLines: created ${splitCount} new karaoke lines ` +
      `(total karaoke events now: ${newEvents.filter((e) => e.type === 'karaokebox').length
      })`
    );

    // Notify subscribers — KaraokeDisplay is now subscribed and will refresh itself.
    this.notifySubscribers();
    return {success: true, splitCount};
  }

  static _splitKaraokeEvent(ev, maxChars, minChars, preRoll) {
    const msg = ev.msg || '';
    if (!msg || msg.length <= maxChars) return [ev];

    const dims = ev.dims || [];
    const metaDims = dims.slice(0, 6);
    const timings = dims.slice(6);
    if (timings.length === 0) return [ev];

    // Parse syllables the same way KaraokeDisplay._parseEvent does.
    // Split on both " " and "|", keeping the delimiters so we can
    // reconstruct msg substrings per half.
    const parts = msg.split(/([ |])/).filter((s) => s.length > 0);

    // Build a flat array of { kind, text, sylIndex? } entries and a
    // parallel list of syllable positions (indices into `parts`).
    // sylIndex counts only real syllables (not spacers / "|").
    const syllableInfo = []; // one entry per syllable: { partIdx, text, timingStart }
    let sylCount = 0;
    parts.forEach((p, idx) => {
      if (p === ' ' || p === '|') return;
      syllableInfo.push({
        partIdx: idx,
        text: p,
        timingStart: timings[sylCount] != null ? timings[sylCount] : null,
      });
      sylCount++;
    });

    if (syllableInfo.length < 2) return [ev];
    if (sylCount > timings.length) {
      // Malformed — more syllables than timings. Refuse to split.
      return [ev];
    }

    // Find a split point: we need to pick a syllable index `k` such that
    // the first half is syllables 0..k-1 and the second is k..end.
    // Preference order:
    //   1. Syllable whose text ends with "," and whose char count puts first half
    //      in the [minChars, maxChars] range (or as close as possible).
    //   2. Syllable at a word boundary (i.e. preceded by a space in parts) nearest
    //      the character midpoint of msg.
    //   3. Any word-boundary syllable (not inside a "|" pipe group).
    const splitIdx = this._chooseSplitIndex(
      parts,
      syllableInfo,
      msg,
      maxChars,
      minChars
    );
    if (splitIdx <= 0 || splitIdx >= syllableInfo.length) return [ev];

    // --- Build the two halves ---
    // First half: parts before syllableInfo[splitIdx].partIdx.
    // Trim trailing spacers.
    let firstEndPartIdx = syllableInfo[splitIdx].partIdx;
    while (
      firstEndPartIdx > 0 &&
      (parts[firstEndPartIdx - 1] === ' ' || parts[firstEndPartIdx - 1] === '|')
    ) {
      firstEndPartIdx--;
    }
    const firstParts = parts.slice(0, firstEndPartIdx);
    const secondParts = parts.slice(syllableInfo[splitIdx].partIdx);

    // Reconstruct msg strings
    const firstMsg = firstParts.join('');
    const secondMsg = secondParts.join('');

    // --- Timings ---
    // First half keeps original ev.t and the first `splitIdx` timings.
    // We also need an "end" timing for the last syllable of the first half.
    // In the original format the last timing is the end-of-final-syllable marker,
    // so firstHalf needs splitIdx + 1 timings total (splitIdx starts + 1 end).
    const firstTimings = timings.slice(0, splitIdx);
    // Use the start of the split syllable as the end of the last first-half syllable.
    const firstEndTiming = timings[splitIdx];
    firstTimings.push(firstEndTiming);

    // First half duration: end of last syllable relative to ev.t. Use the
    // last timing value directly (which is absolute offset from ev.t).
    const firstDuration = firstEndTiming;

    const firstEvent = {
      ...ev,
      t: ev.t,
      d: firstDuration,
      msg: firstMsg,
      dims: [...metaDims, ...firstTimings],
      _eventId: undefined, // regenerate on next use
    };
    delete firstEvent._eventId;

    // Second half: new ev.t positioned so that the first syllable lands at the
    // same absolute time it had in the original. We set the new ev.t so the
    // first syllable has a `preRoll` offset within the event.
    //
    // Original absolute start of syllable at splitIdx = ev.t + timings[splitIdx]
    // In the new event: newT + preRoll should equal that, so:
    const originalSecondFirstAbs = ev.t + timings[splitIdx];
    const secondT = originalSecondFirstAbs - preRoll;

    // Rebase remaining timings: each becomes (original_timing - timings[splitIdx] + preRoll).
    // Also include the original final end-timing as the new last entry.
    const secondTimings = [];
    for (let k = splitIdx; k < timings.length; k++) {
      secondTimings.push(timings[k] - timings[splitIdx] + preRoll);
    }

    // Second half duration = last timing (which is absolute from new ev.t)
    const secondDuration = secondTimings[secondTimings.length - 1];

    const secondEvent = {
      ...ev,
      t: secondT,
      d: secondDuration,
      msg: secondMsg,
      dims: [...metaDims, ...secondTimings],
      _eventId: undefined,
    };
    delete secondEvent._eventId;

    // Recurse in case the second half is still too long.
    const furtherSplits = this._splitKaraokeEvent(
      secondEvent,
      maxChars,
      minChars,
      preRoll
    );
    return [firstEvent, ...furtherSplits];
  }

  static _chooseSplitIndex(parts, syllableInfo, msg, maxChars, minChars) {
    // Compute cumulative char count of msg up to each syllable's start, using
    // the parts array so spaces are counted but "|" markers are not visible.
    // We build a map: syllableIndex -> char position in rendered msg (ignoring "|").
    const renderedCharAtSyl = [];
    let renderedPos = 0;
    let sylCounter = 0;
    for (let idx = 0; idx < parts.length; idx++) {
      const p = parts[idx];
      if (p === '|') continue; // invisible separator
      // For each syllable, record the renderedPos BEFORE it is added.
      // We need to match by partIdx.
      const matchingSyl = syllableInfo.find((s) => s.partIdx === idx);
      if (matchingSyl) {
        renderedCharAtSyl[sylCounter] = renderedPos;
        sylCounter++;
      }
      renderedPos += p.length;
    }
    const totalChars = renderedPos;

    // Determine whether each syllable is at a "clean word boundary"
    // (i.e. preceded by a space, not inside a pipe group).
    const isWordBoundary = [];
    syllableInfo.forEach((s, i) => {
      if (i === 0) {
        isWordBoundary.push(false);
        return;
      }
      // Walk backwards from partIdx through "|" markers and see if we hit a space.
      let j = s.partIdx - 1;
      let sawSpace = false;
      while (j >= 0 && parts[j] === '|') j--;
      if (j >= 0 && parts[j] === ' ') sawSpace = true;
      isWordBoundary.push(sawSpace);
    });

    // Does a syllable end with ","?
    const endsWithComma = syllableInfo.map((s) => /,$/.test(s.text));

    // Candidate 1: comma-ending syllable, where split goes AFTER that syllable.
    // "Split index k" means first half is 0..k-1, so for a comma at syllable c
    // we want k = c + 1 (and k must be a word boundary or end-of-string).
    let best = -1;
    let bestScore = Infinity;
    for (let c = 0; c < syllableInfo.length - 1; c++) {
      if (!endsWithComma[c]) continue;
      const k = c + 1;
      if (k >= syllableInfo.length) continue;
      if (!isWordBoundary[k]) continue;
      const firstChars = renderedCharAtSyl[k];
      if (firstChars < minChars) continue;
      if (firstChars > maxChars) continue;
      const score = Math.abs(firstChars - totalChars / 2);
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    if (best > 0) return best;

    // Candidate 2: word boundary closest to midpoint, first half in range.
    const mid = totalChars / 2;
    for (let k = 1; k < syllableInfo.length; k++) {
      if (!isWordBoundary[k]) continue;
      const firstChars = renderedCharAtSyl[k];
      if (firstChars < minChars) continue;
      if (firstChars > maxChars) continue;
      const score = Math.abs(firstChars - mid);
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    if (best > 0) return best;

    // Candidate 3: any word boundary that keeps first half under maxChars.
    bestScore = Infinity;
    for (let k = 1; k < syllableInfo.length; k++) {
      if (!isWordBoundary[k]) continue;
      const firstChars = renderedCharAtSyl[k];
      if (firstChars > maxChars) continue;
      // Prefer largest firstChars (fullest first half).
      const score = -firstChars;
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    return best;
  }

  static serialize() {
    if (!this.current || !this.current.timedEvents) return '';
    const veq = this.current;
    const meta = veq.metadata || {};
    const sections = [];

    let currentTranspose = 0;
    if (window.projectApp && window.projectApp.gt) {
      currentTranspose = window.projectApp.gt.transposeOffset || 0;
    }

    // Metadata headers — emit in a stable order.
    // `name` comes first so file-top scanning shows the song title.
    if (meta.name || veq.name) {
      sections.push('---- name');
      sections.push((meta.name || veq.name).trim());
    }

    if (veq.videoId) {
      sections.push('---- youtubeId');
      sections.push(String(veq.videoId).trim());
    }

    if (currentTranspose !== 0) {
      sections.push('---- transpose');
      sections.push(String(currentTranspose));
    } else if (meta.transpose !== undefined && meta.transpose !== null) {
      sections.push('---- transpose');
      sections.push(String(meta.transpose));
    }

    if (meta.start !== undefined && meta.start !== null) {
      sections.push('---- start');
      sections.push(String(meta.start));
    }

    if (meta.credit) {
      sections.push('---- credit');
      sections.push(String(meta.credit).trim());
    }

    // Timed events — delta-encoded
    sections.push('---- timedEvents');

    const events = [...veq.timedEvents].sort((a, b) => a.t - b.t);
    let lastT = 0;
    for (const e of events) {
      const dt = Math.round(e.t - lastT);
      lastT = e.t;

      let serializedEvent = e;
      if (
        e.type === 'note' &&
        currentTranspose !== 0 &&
        typeof e.mc === 'number'
      ) {
        // Reverse the transposition to store the original note (Middle C etc.)
        serializedEvent = {...e, mc: e.mc - currentTranspose};
      }
      sections.push(this._serializeEvent(serializedEvent, dt));
    }

    return sections.join('\n');
  }

  static _serializeEvent(e, dt) {
    if (e.type === 'marker') {
      return `${dt} marker${e.label ? ' ' + e.label : ''}`;
    }
    if (e.type === 'mute' || e.type === 'mute_off') {
      return `${dt} ${e.type}`;
    }
    if (e.type === 'note') {
      return `${dt}m${e.mc}d${Math.round(e.d || 0)}v${e.v || 100}`;
    }

    let prefix = String(dt);
    if (e.d !== undefined && e.d !== null) {
      prefix += `d${Math.round(e.d)}`;
    }

    let body = `~${e.type}:`;
    if (Array.isArray(e.dims) && e.dims.length > 0) {
      const dimsStr = e.dims
        .map((v) => (typeof v === 'number' ? this._formatDim(v) : v))
        .join(',');
      body += `[${dimsStr}]`;
    }
    body += e.msg || '';

    return prefix + body;
  }

  static _formatDim(n) {
    // Keep integers as integers; round floats to a sane precision.
    if (Number.isInteger(n)) return String(n);
    // Round to 4 decimals and strip trailing zeros.
    return parseFloat(n.toFixed(4)).toString();
  }

  static getExportFilename() {
    const veq = this.current || {};
    const meta = veq.metadata || {};
    // Prefer videoId (stripped of non-alphanumerics), then name, then fallback.
    if (veq.videoId) {
      const clean = String(veq.videoId).replace(/[^a-zA-Z0-9]/g, '');
      if (clean.length > 0) return `${clean}.txt`;
    }
    if (meta.name || veq.name) {
      const clean = (meta.name || veq.name)
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      if (clean.length > 0) return `${clean}.txt`;
    }
    return 'pianoroll.txt';
  }

  static insertMarker(timeMs) {
    this.pushUndoState();
    const event = {type: 'marker', t: timeMs, label: ''};
    this.current.timedEvents.push(event);
    this.sort(this.current.timedEvents);
    this.isSorted = true;
    this.notifySubscribers();
    return event;
  }

  static insertMute(timeMs, durationMs = 200) {
    this.pushUndoState();
    const muteOn = {type: 'mute', t: timeMs};
    const muteOff = {type: 'mute_off', t: timeMs + durationMs};
    this.current.timedEvents.push(muteOn, muteOff);
    this.sort(this.current.timedEvents);
    this.isSorted = true;
    this.notifySubscribers();
    return {muteOn, muteOff};
  }

  static state() {
    if (!this._state) {
      this._state = {
        current: {timedEvents: [], sourceFormat: 'unknown'},
        isSorted: false,
        _lastEventId: 0
      };
    }
    return this._state;
  }

  static veq_state() {
    if (!this._state) {
      this._state = {
        current: {timedEvents: [], sourceFormat: 'unknown'},
        isSorted: false,
        _lastEventId: 0
      };
      
      // Define properties dynamically to completely bypass AST getter/setter conflicts
      Object.defineProperties(this, {
        current: { get: () => this._state.current, set: v => this._state.current = v, configurable: true },
        isSorted: { get: () => this._state.isSorted, set: v => this._state.isSorted = v, configurable: true },
        _lastEventId: { get: () => this._state._lastEventId, set: v => this._state._lastEventId = v, configurable: true }
      });
    }
    return this._state;
  }

  static get smartArpDefaults() {
      return SmartArpController.smartArpDefaults;
    }

  static getSmartArpDefaults() {
      return SmartArpController.getSmartArpDefaults();
    }

  static midiToNoteName(mc) {
      const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const name = names[mc % 12];
      const octave = Math.floor(mc / 12) - 1;
      return name + octave;
    }

  static detectOptimalSplitAndChords(veqData, verbose) {
      return SmartArpController.detectOptimalSplitAndChords(veqData, verbose);
    }

  static extractTrueChords(timedEvents) {
      return SmartArpController.extractTrueChords(timedEvents);
    }
}

// Expose at module load so UI code can reach it before any VEQ is loaded.
VideoEventQueue.expose();

/* recursi-meta
{
  "schema": 1,
  "lines": 1180,
  "provides": [
    "VideoEventQueue"
  ],
  "deps": []
}
recursi-meta */

globalThis.VideoEventQueue = VideoEventQueue;
