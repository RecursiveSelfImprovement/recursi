
class ConvertPianoroll {

  async init(targetElement) {
    this.container = targetElement;
    this.container.innerHTML = '';
    this._injectStyles();

    this.container.append(
      this._createHotkeyGuide(), // Moved to top for visibility
      this._createFileSection(),
      this._createSelectionSection(), // Removed Sync Button
      this._createLiveArpSection(),
      this._createFooter()
    );

    if (window.VideoEventQueueClass) {
      window.VideoEventQueueClass.subscribe(() => this.updateSelectionInfo());
    }
    this.updateSelectionInfo();
  }

  _getMusicalStructure(notes) {
    const melodyIndices = [];
    const chordGroups = [];
    const unaffectedIndices = [];

    // This is the known-good logic from the original version, but with the
    // "separate melody" behavior hardcoded to TRUE, as requested.
    const separateMelody = true;

    const timeSlices = new Map();
    notes.forEach((note, index) => {
      const startTime = note[0];
      if (!timeSlices.has(startTime)) timeSlices.set(startTime, []);
      timeSlices.get(startTime).push({note, index});
    });

    for (const slice of timeSlices.values()) {
      if (separateMelody && slice.length > 3) {
        slice.sort((a, b) => a.note[2] - b.note[2]);
        melodyIndices.push(slice.pop().index);
        chordGroups.push(slice.map((item) => item.index));
      } else if (slice.length >= 3) {
        chordGroups.push(slice.map((item) => item.index));
      } else {
        unaffectedIndices.push(...slice.map((item) => item.index));
      }
    }
    return {melodyIndices, chordGroups, unaffectedIndices};
  }

  stripMelody() {
    this._pushHistory('absolute');
    this.updateStatus('Isolating chords...');
    let notes;
    try {
      notes = JSON.parse(this.absoluteTextArea.value);
      if (!notes || notes.length === 0) throw new Error('Input is empty.');
    } catch (e) {
      this.updateStatus(`Error: Invalid JSON.`);
      return;
    }

    const structure = this._getMusicalStructure(notes);
    const chordNotes = [];
    for (const group of structure.chordGroups) {
      for (const index of group) {
        chordNotes.push(notes[index]);
      }
    }

    this.absoluteTextArea.value = JSON.stringify(chordNotes, null, 2);
    this.updateStatus(`Isolated ${chordNotes.length} chord notes.`);
  }

  stripChords() {
    this._pushHistory('absolute');
    this.updateStatus('Isolating melody...');
    let notes;
    try {
      notes = JSON.parse(this.absoluteTextArea.value);
      if (!notes || notes.length === 0) throw new Error('Input is empty.');
    } catch (e) {
      this.updateStatus(`Error: Invalid JSON.`);
      return;
    }

    const structure = this._getMusicalStructure(notes);

    const nonChordNotes = [];
    for (const index of structure.melodyIndices) {
      nonChordNotes.push(notes[index]);
    }
    for (const index of structure.unaffectedIndices) {
      nonChordNotes.push(notes[index]);
    }

    nonChordNotes.sort((a, b) => a[0] - b[0]);
    this.absoluteTextArea.value = JSON.stringify(nonChordNotes, null, 2);
    this.updateStatus(
      `Isolated ${nonChordNotes.length} non-chord (melody) notes.`
    );
  }

  swapMelodyAndChords() {
    this._pushHistory('absolute');
    this.updateStatus('Performing swap...');
    let notes;
    try {
      notes = JSON.parse(this.absoluteTextArea.value);
      if (!notes || !Array.isArray(notes) || notes.length === 0) {
        throw new Error('Input is empty or not a valid note array.');
      }
    } catch (e) {
      this.updateStatus(`Error: Invalid JSON. ${e.message}`);
      return;
    }

    const structure = this._getMusicalStructure(notes);
    const chordNoteIndices = new Set(structure.chordGroups.flat());

    if (chordNoteIndices.size === 0) {
      this.updateStatus('No chords found to swap.');
      return;
    }

    let melodyNotesCount = 0;
    let chordNotesCount = 0;

    for (let i = 0; i < notes.length; i++) {
      if (chordNoteIndices.has(i)) {
        notes[i][2] += 12;
        chordNotesCount++;
      } else {
        notes[i][2] -= 12;
        melodyNotesCount++;
      }
    }

    let maxMelodyPitch = -Infinity;
    let minChordPitch = Infinity;
    for (let i = 0; i < notes.length; i++) {
      if (chordNoteIndices.has(i)) {
        minChordPitch = Math.min(minChordPitch, notes[i][2]);
      } else {
        maxMelodyPitch = Math.max(maxMelodyPitch, notes[i][2]);
      }
    }

    let extraOctaveShifts = 0;
    while (maxMelodyPitch >= minChordPitch) {
      extraOctaveShifts++;
      for (let i = 0; i < notes.length; i++) {
        if (!chordNoteIndices.has(i)) {
          notes[i][2] -= 12;
        }
      }
      maxMelodyPitch -= 12;
    }

    let statusMessage = `Swap complete. Moved ${melodyNotesCount} melody notes and ${chordNotesCount} chord notes.`;
    if (extraOctaveShifts > 0) {
      statusMessage += ` Melody moved down an extra ${extraOctaveShifts} octave(s) to resolve overlap.`;
    }

    this.absoluteTextArea.value = JSON.stringify(notes, null, 2);
    this.updateStatus(statusMessage);
  }

  arpeggiateAbsolute() {
    this._pushHistory('absolute');
    this.updateStatus('Arpeggiating...');
    let notes;
    try {
      notes = JSON.parse(this.absoluteTextArea.value);
    } catch (e) {
      this.updateStatus(`Error: Invalid JSON.`);
      return;
    }

    // Sort by start time, then by pitch for a fully deterministic order.
    notes.sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0];
      return a[2] - b[2];
    });

    const structure = this._getMusicalStructure(notes);

    const performanceDurationPercent = parseInt(
      this.arpPerformanceDurationSlider.value,
      10
    );
    const startOffsetMs = parseInt(this.arpStartOffsetInput.value, 10) || 0;
    const startOffsetSec = startOffsetMs / 1000.0;

    let pattern;
    if (this.arpPatternSelect.value === 'custom') {
      try {
        pattern = JSON.parse(this.arpCustomPatternInput.value);
      } catch (e) {
        this.updateStatus(`Error: Invalid custom pattern.`);
        return;
      }
    } else {
      const patterns = {
        up: [0, 1, 2],
        down: [2, 1, 0],
        'up-down': [0, 1, 2, 1],
        'down-up': [2, 1, 0, 1],
      };
      pattern = patterns[this.arpPatternSelect.value];
    }
    if (!pattern || pattern.length === 0) {
      this.updateStatus('Invalid or empty pattern selected.');
      return;
    }

    const chordStartTimes = structure.chordGroups.map(
      (group) => notes[group[0]][0]
    );

    let typicalChordInterval = 1.0;
    if (chordStartTimes.length > 1) {
      const intervals = chordStartTimes
        .slice(1)
        .map((time, i) => time - chordStartTimes[i]);
      intervals.sort((a, b) => a - b);
      const mid = Math.floor(intervals.length / 2);
      typicalChordInterval =
        intervals.length % 2 !== 0
          ? intervals[mid]
          : (intervals[mid - 1] + intervals[mid]) / 2;
    }

    const finalNotes = [];
    structure.melodyIndices.forEach((index) => finalNotes.push(notes[index]));
    structure.unaffectedIndices.forEach((index) =>
      finalNotes.push(notes[index])
    );

    structure.chordGroups.forEach((group, i) => {
      const chordNotes = group.map((index) => notes[index]);
      const currentTime = chordNotes[0][0];

      const nextChordTime =
        i < chordStartTimes.length - 1 ? chordStartTimes[i + 1] : null;
      const availableDuration = nextChordTime
        ? nextChordTime - currentTime
        : typicalChordInterval;

      const performanceDuration =
        availableDuration * (performanceDurationPercent / 100);
      const timingStepDuration = performanceDuration / pattern.length;
      const baseNoteLength = availableDuration / pattern.length;

      if (baseNoteLength <= 0.001) {
        finalNotes.push(...chordNotes);
        return;
      }

      const arpeggioBaseTime = currentTime + startOffsetSec;

      const pitchOccurrences = new Map();
      for (let k = 0; k < pattern.length; k++) {
        const noteIndexInChord = pattern[k] % chordNotes.length;
        const pitch = chordNotes[noteIndexInChord][2];
        if (!pitchOccurrences.has(pitch)) pitchOccurrences.set(pitch, []);
        pitchOccurrences.get(pitch).push(k);
      }

      for (let k = 0; k < pattern.length; k++) {
        const noteIndexInChord = pattern[k] % chordNotes.length;
        const noteToPlay = chordNotes[noteIndexInChord];
        const pitch = noteToPlay[2];
        const newStartTime = arpeggioBaseTime + k * timingStepDuration;

        if (newStartTime < 0) continue;

        let finalNoteLength = baseNoteLength;
        const occurrences = pitchOccurrences.get(pitch);
        const myOccurrenceIndex = occurrences.indexOf(k);

        if (myOccurrenceIndex < occurrences.length - 1) {
          const nextK = occurrences[myOccurrenceIndex + 1];
          const nextNoteStartTime =
            arpeggioBaseTime + nextK * timingStepDuration;
          const maxAllowedDuration = nextNoteStartTime - newStartTime - 0.02;
          finalNoteLength = Math.min(baseNoteLength, maxAllowedDuration);
        }

        if (finalNoteLength < 0.01) finalNoteLength = 0.01;

        finalNotes.push([
          parseFloat(newStartTime.toFixed(3)),
          parseFloat(finalNoteLength.toFixed(3)),
          pitch,
        ]);
      }
    });

    finalNotes.sort((a, b) => a[0] - b[0]);
    this.absoluteTextArea.value = JSON.stringify(finalNotes, null, 2);
    this.updateStatus(
      `Arpeggiation complete. Processed ${structure.chordGroups.length} chords.`
    );
  }

  _hasTimePitchCollisions(notes) {
    const pitchMap = new Map();
    for (const note of notes) {
      const [startTime, duration, pitch] = note;
      const endTime = startTime + duration;
      if (!pitchMap.has(pitch)) {
        pitchMap.set(pitch, []);
      }
      const intervals = pitchMap.get(pitch);
      for (const existing of intervals) {
        if (startTime < existing.end && endTime > existing.start) {
          return true;
        }
      }
      intervals.push({start: startTime, end: endTime});
    }
    return false;
  }

  _pushHistory(field) {
    const history =
      field === 'delta' ? this.deltaHistory : this.absoluteHistory;
    const content = (
      field === 'delta' ? this.deltaTextArea : this.absoluteTextArea
    ).value;
    if (history.length > 0 && history[history.length - 1] === content) return;
    history.push(content);
    if (history.length > 5) history.shift();
  }

  undo(field) {
    const history =
      field === 'delta' ? this.deltaHistory : this.absoluteHistory;
    const textArea =
      field === 'delta' ? this.deltaTextArea : this.absoluteTextArea;
    if (history.length > 0) {
      textArea.value = history.pop();
      this.updateStatus(`Undo successful. History size: ${history.length}`);
    } else {
      this.updateStatus(`No more undo history.`);
    }
  }

  convertDeltaToAbsolute() {
    this._pushHistory('delta');
    this._pushHistory('absolute');
    this.fileHeaders = {};
    const text = this.deltaTextArea.value;
    if (!text.trim()) {
      this.updateStatus('Input is empty.');
      return;
    }
    const lines = text.split(/[\r\n]+/);
    const notes = [];
    let currentTimeMs = 0;
    let currentChunkName = 'timedEvents';
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      if (trimmedLine.startsWith('----')) {
        currentChunkName =
          trimmedLine.substring(4).trim().toLowerCase() || 'unknown';
        if (currentChunkName !== 'timedevents')
          this.fileHeaders[currentChunkName] = [];
        continue;
      }
      if (currentChunkName === 'timedevents') {
        const timeMatch = trimmedLine.match(/^(\d+)/);
        if (!timeMatch) continue;
        currentTimeMs += parseInt(timeMatch[1], 10);
        const noteMatch = trimmedLine.match(/m(\d+)/);
        const durationMatch = trimmedLine.match(/d(\d+)/);
        if (noteMatch && durationMatch) {
          notes.push([
            parseFloat((currentTimeMs / 1000).toFixed(3)),
            parseFloat((parseInt(durationMatch[1], 10) / 1000).toFixed(3)),
            parseInt(noteMatch[1], 10),
          ]);
        }
      } else {
        if (this.fileHeaders[currentChunkName])
          this.fileHeaders[currentChunkName].push(line);
      }
    }
    this.absoluteTextArea.value = JSON.stringify(notes, null, 2);
    this.updateStatus(
      `Converted ${notes.length} notes. Preserved ${Object.keys(this.fileHeaders).length
      } headers.`
    );
  }

  convertAbsoluteToDelta() {
    this._pushHistory('absolute');
    this._pushHistory('delta');
    let notes;
    try {
      notes = JSON.parse(this.absoluteTextArea.value);
      if (!Array.isArray(notes)) throw new Error('Input is not a JSON array.');
    } catch (e) {
      this.updateStatus(`Error: Invalid JSON.`);
      return;
    }
    notes.sort((a, b) => a[0] - b[0]);
    const deltaLines = [];
    let lastTimeMs = 0;
    for (const note of notes) {
      const startTimeMs = Math.round(note[0] * 1000);
      const durationMs = Math.round(note[1] * 1000);
      const deltaTimeMs = startTimeMs - lastTimeMs;
      deltaLines.push(`${deltaTimeMs}m${note[2]}d${durationMs}`);
      lastTimeMs = startTimeMs;
    }
    let outputString = '';
    for (const key in this.fileHeaders) {
      outputString += `---- ${key}\n${this.fileHeaders[key].join('\n')}\n`;
    }
    outputString += '---- timedEvents\n' + deltaLines.join('\n');
    this.deltaTextArea.value = outputString;
    this.updateStatus(`Converted ${notes.length} notes to delta format.`);
  }

  async loadInitialData() {
    try {
      const response = await fetch('./goodLuckBabe.txt');
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const text = await response.text();
      this.deltaTextArea.value = text;
      this.updateStatus('Loaded example data from taylor_swift_fortnight.txt');
    } catch (e) {
      console.error('Failed to load initial data:', e);
      this.updateStatus('Error: Could not load example data.');
      this.deltaTextArea.value = `7344m40d648\n314m47d316`;
    }
  }

  updateStatus(msg) {
    if (this.statusDiv) this.statusDiv.textContent = msg;
  }

  async copyFrom(textArea) {
    if (!textArea.value) {
      this.updateStatus('Nothing to copy.');
      return;
    }
    try {
      await navigator.clipboard.writeText(textArea.value);
      this.updateStatus('Copied to clipboard.');
      textArea.select();
    } catch (err) {
      this.updateStatus('Failed to copy text.');
    }
  }

  async pasteTo(textArea) {
    try {
      const text = await navigator.clipboard.readText();
      textArea.value = text;
      this.updateStatus('Pasted from clipboard.');
    } catch (err) {
      this.updateStatus('Failed to read from clipboard.');
    }
  }

  strumChords() {
    this._pushHistory('absolute');
    this.updateStatus('Strumming...');
    let notes;
    try {
      notes = JSON.parse(this.absoluteTextArea.value);
      if (!Array.isArray(notes)) throw new Error('Invalid JSON array');
    } catch (e) {
      this.updateStatus('Error: Invalid JSON in Absolute text area.');
      return;
    }

    // Group by start time (with small tolerance e.g. 5ms to catch roughly simultaneous notes)
    const groups = [];
    const tolerance = 0.005;

    // Sort first
    notes.sort((a, b) => a[0] - b[0]);

    let currentGroup = [notes[0]];
    for (let i = 1; i < notes.length; i++) {
      const prev = currentGroup[0];
      const curr = notes[i];
      if (Math.abs(curr[0] - prev[0]) <= tolerance) {
        currentGroup.push(curr);
      } else {
        groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    const spreadMs = parseInt(this.strumSpreadInput.value, 10) || 20;
    const spreadSec = spreadMs / 1000.0;

    let count = 0;

    groups.forEach((group) => {
      if (group.length < 2) return;

      // Sort chord by pitch ascending (low notes start first)
      group.sort((a, b) => a[2] - b[2]);

      // Apply offsets
      const step = spreadSec / Math.max(1, group.length - 1);

      group.forEach((note, i) => {
        if (i > 0) {
          // Apply cumulative delay
          const delay = i * step;
          note[0] = parseFloat((note[0] + delay).toFixed(3));
        }
      });
      count++;
    });

    // Re-sort entire list by new start times
    notes.sort((a, b) => a[0] - b[0]);

    this.absoluteTextArea.value = JSON.stringify(notes, null, 2);
    this.updateStatus(
      `Applied strum to ${count} chords with max spread ${spreadMs}ms.`
    );
  }

  _createSection(title) {
    const fieldset = makeElement('fieldset', {
      style:
        'border:1px solid #444; padding:8px; margin-bottom:8px; border-radius:4px;',
    });
    fieldset.append(
      makeElement(
        'legend',
        {style: 'color:#888; font-size:11px; padding:0 5px;'},
        title
      )
    );
    return fieldset;
  }

  _createRow(label, slider, display) {
    return makeElement(
      'div',
      {
        style:
          'display:flex; align-items:center; gap:8px; margin-bottom:4px; font-size:12px; color:#ccc;',
      },
      [makeElement('label', {style: 'width:70px;'}, label), slider, display]
    );
  }

  updateSelectionInfo() {
    if (!window.VideoEventQueueClass) return;
    const count = window.VideoEventQueueClass.getSelectedEvents().length;
    if (this.selectionInfo) {
      this.selectionInfo.textContent = `${count} note(s) selected`;
      this.selectionInfo.style.color = count > 0 ? '#4f4' : '#888';
    }
  }

  getNodesToProcess() {
    const veq = window.VideoEventQueueClass?.current;
    if (!veq || !veq.timedEvents) return null;

    // Filter notes only
    let notes = veq.timedEvents.filter((e) => e.type === 'note');

    // Check selection
    const selected = notes.filter((e) => e.selected);

    // If specific notes are selected, only process those. Otherwise process everything.
    const targetNotes = selected.length > 0 ? selected : notes;

    // Sort by time, then pitch
    targetNotes.sort((a, b) => {
      if (Math.abs(a.t - b.t) > 5) return a.t - b.t;
      return a.mc - b.mc;
    });

    return targetNotes;
  }

  applyStrum() {
    const notes = this.getNodesToProcess();
    if (!notes || notes.length === 0) {
      this.updateStatus('No notes found.');
      return;
    }

    window.VideoEventQueueClass.pushUndoState();

    const spreadMs = parseInt(this.strumSpreadInput.value, 10);
    let chordsFound = 0;

    // Group chords (notes starting within 15ms of each other)
    const groups = this._groupNotesByTime(notes, 15);

    groups.forEach((group) => {
      if (group.length < 2) return;

      // Sort low to high pitch
      group.sort((a, b) => a.mc - b.mc);

      const step = spreadMs / Math.max(1, group.length - 1);

      group.forEach((note, i) => {
        if (i > 0) {
          note.t += i * step;
        }
      });
      chordsFound++;
    });

    this._finalizeAction(`Strummed ${chordsFound} chords.`);
  }

  applyArpeggio() {
    const notes = this.getNodesToProcess();
    if (!notes || notes.length === 0) {
      this.updateStatus('No notes found to arpeggiate.');
      return;
    }

    window.VideoEventQueueClass.pushUndoState();

    const patternStr = this.arpPatternSelect.value;
    const pattern = patternStr.split(',').map((s) => parseInt(s.trim()));
    const durationPct = parseInt(this.arpDurationSlider.value, 10) / 100;

    const groups = this._groupNotesByTime(notes, 25);
    let chordsFound = 0;

    groups.forEach((group) => {
      if (group.length < 2) return;
      chordsFound++;

      // Sort by pitch
      group.sort((a, b) => a.mc - b.mc);

      const startTime = group[0].t;
      // Guess duration based on current spread or 500ms default
      const currentSpread = group[group.length - 1].t - group[0].t;
      const baseDuration = currentSpread > 50 ? currentSpread : 500;
      const activeDuration = baseDuration * durationPct;

      const timePerStep = activeDuration / pattern.length;

      group.forEach((note, i) => {
        // Find where this note fits in the numeric pattern
        const patternIndex = pattern.indexOf(i);
        if (patternIndex !== -1) {
          note.t = startTime + patternIndex * timePerStep;
          note.d = Math.max(50, timePerStep * 0.8);
        }
      });
    });

    // Notify system of changes
    if (window.basicsWithDialogBoxInstance) {
      window.basicsWithDialogBoxInstance.loadImportedVeq();
    }
    this.updateStatus(
      `Arpeggiated ${chordsFound} chords using pattern [${patternStr}]`
    );
  }

  _groupNotesByTime(notes, toleranceMs) {
    const groups = [];
    if (notes.length === 0) return groups;

    let currentGroup = [notes[0]];

    for (let i = 1; i < notes.length; i++) {
      const prev = currentGroup[0];
      const curr = notes[i];
      if (Math.abs(curr.t - prev.t) <= toleranceMs) {
        currentGroup.push(curr);
      } else {
        groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
  }

  _finalizeAction(msg) {
    // 1. Re-sort the master queue because times changed
    if (window.VideoEventQueueClass) {
      window.VideoEventQueueClass.sort(
        window.VideoEventQueueClass.current.timedEvents
      );
      // 2. Notify to redraw visuals
      window.VideoEventQueueClass.notifySubscribers();
    }
    this.updateStatus(msg);
  }

  performUndo() {
      if (window.projectApp) {
        window.projectApp._triggerUndo();
      }
    }

  _analyzeAndSplit() {
      if (window.VideoEventQueueClass) {
        const count = window.VideoEventQueueClass.analyzeAndTagChords();
        this.updateStatus(`Found ${count} chords.`);
        
        const app = window.projectApp;
        if (app && app.gt) {
          app.gt.pianoVisuals?.loadVeq(window.VideoEventQueueClass.current);
          app._refreshVisuals(true);
        }
      }
    }

  async _handleFileImport(e) {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        if (window.VideoEventQueueClass) {
          const parsed = window.VideoEventQueueClass.parse(text);

          if (!parsed || !parsed.timedEvents || parsed.timedEvents.length === 0) {
            throw new Error('File contains no valid piano roll data.');
          }

          window.VideoEventQueueClass.load(parsed);

          const app = window.projectApp;
          if (app && app.gt) {
            app.gt.originalVeqData = parsed;
            app.gt.pianoVisuals?.loadVeq(parsed);
            app.gt.synchronizer?.loadVEQ(parsed);
            app._refreshVisuals(true);
            this.updateStatus(`Successfully imported: ${file.name}`);
          } else {
            this.updateStatus('Player instance not found.');
          }
        }
      } catch (err) {
        console.error('Import Error:', err);
        this.updateStatus(`Error: ${err.message}`);
        alert(`Failed to import: ${err.message}`);
      } finally {
        e.target.value = ''; // Reset input
      }
    }

  _handleExport() {
      window.projectApp?._exportVEQ();
    }

  _injectStyles() {
    applyCss(
      `
    .action-button { border: 1px solid #555; border-radius: 4px; padding: 8px; cursor: pointer; font-size: 13px; }
    .action-button.primary { background: #007acc; color: #fff; }
    .action-button.secondary { background: #444; color: #ccc; }
    .action-button:hover { filter: brightness(1.2); }
  `,
      'converter-ui-styles'
    );
  }

  _createFileSection() {
      const section = this._createSection('📂 File');
      const btnRow = makeElement('div', {style: 'display:flex; gap:5px;'}, [
        makeElement(
          'button',
          {
            className: 'action-button primary',
            style: 'flex:1; height:35px;',
            onclick: () => window.projectApp?._importVEQ(),
          },
          '📤 Import .txt'
        ),
        makeElement(
          'button',
          {
            className: 'action-button secondary',
            style: 'flex:1;',
            onclick: () => window.projectApp?._exportVEQ(),
          },
          '📥 Export .txt'
        ),
      ]);
      section.append(btnRow);
      return section;
    }

  _createSyncSection() {
      const section = this._createSection('⏱ Selection & Chords');
      this.selectionInfo = makeElement(
        'div',
        {
          style:
            'background:#111; padding:6px; border-radius:4px; margin-bottom:8px; font-size:11px; color:#4f4; border:1px solid #333;',
        },
        '0 notes selected'
      );

      const btnSync = makeElement(
        'button',
        {
          className: 'action-button primary',
          style: 'width:100%; margin-bottom:5px; height:40px; font-weight:bold;',
          onclick: () => window.projectApp?._triggerSync(),
        },
        'Synchronize Selection (S)'
      );

      const btnFindChords = makeElement(
        'button',
        {
          className: 'action-button',
          style: 'width:100%; background:#6622aa; color:#fff;',
          onclick: () => this._analyzeAndSplit(),
        },
        'Detect Chords (Lowest 3 RGB)'
      );

      section.append(this.selectionInfo, btnSync, btnFindChords);
      return section;
    }

  _createLiveArpSection() {
    const section = this._createSection('🎹 Smart Arpeggiator');

    const topRow = makeElement(
      'div',
      {style: 'display:flex; gap:10px; margin-bottom:12px;'},
      [
        this._createCheckbox('Enable Arp', window.arpEnabled || false, (v) => {
          window.arpEnabled = v;
          if (v) window.VideoEventQueueClass?.findChords(false);
          window.projectApp?._refreshVisuals();
          if (window.projectApp?.gt?.synchronizer)
            window.projectApp.gt.synchronizer.resyncScheduler();
        }),
        this._createCheckbox(
          'Show Chord RGB',
          window.showChordColors || false,
          (v) => {
            window.showChordColors = v;
            if (v) window.VideoEventQueueClass?.findChords(false);
            window.projectApp?._refreshVisuals();
          }
        ),
      ]
    );

    this.patternSelect = makeElement(
      'select',
      {
        style:
          'width:100%; padding:6px; background:#222; color:#fff; border:1px solid #444; margin-bottom:10px;',
        onchange: (e) => {
          window.arpPattern = JSON.parse(e.target.value);
          window.projectApp?._refreshVisuals();
          if (window.projectApp?.gt?.synchronizer)
            window.projectApp.gt.synchronizer.resyncScheduler();
        },
      },
      [
        makeElement('option', {value: '[0,1,2]'}, 'Pattern: Up (0-1-2)'),
        makeElement('option', {value: '[2,1,0]'}, 'Pattern: Down (2-1-0)'),
        makeElement(
          'option',
          {value: '[0,2,1]'},
          'Pattern: Alternate (0-2-1)'
        ),
        makeElement(
          'option',
          {value: '[1,0,2]'},
          'Pattern: Inside-Out (1-0-2)'
        ),
      ]
    );

    this.liveSpreadSlider =
      this.liveSpreadSlider ||
      makeElement('input', {
        type: 'range',
        min: '0',
        max: '400',
        value: window.arpGlobalSpread || 0,
      });
    this.anchorSlider =
      this.anchorSlider ||
      makeElement('input', {
        type: 'range',
        min: '0',
        max: '1',
        step: '0.1',
        value: window.arpAnchor || 0,
      });
    this.liveLenSlider =
      this.liveLenSlider ||
      makeElement('input', {
        type: 'range',
        min: '0.1',
        max: '1.5',
        step: '0.05',
        value: window.arpGlobalLenFactor || 1.0,
      });

    section.append(
      topRow,
      this.patternSelect,
      this._createRow(
        'Spread:',
        this.liveSpreadSlider,
        makeElement(
          'span',
          {className: 'val-disp'},
          `${window.arpGlobalSpread || 0}ms`
        )
      ),
      this._createRow(
        'Anchor:',
        this.anchorSlider,
        makeElement('span', {className: 'val-disp'}, 'Start')
      ),
      this._createRow(
        'Note Len:',
        this.liveLenSlider,
        makeElement(
          'span',
          {className: 'val-disp'},
          `${window.arpGlobalLenFactor || 1}x`
        )
      )
    );

    this.liveSpreadSlider.oninput = (e) => {
      window.arpGlobalSpread = parseInt(e.target.value);
      e.target.nextSibling.textContent = `${window.arpGlobalSpread}ms`;
      window.projectApp?._refreshVisuals();
      if (window.projectApp?.gt?.synchronizer)
        window.projectApp.gt.synchronizer.resyncScheduler();
    };
    this.anchorSlider.oninput = (e) => {
      window.arpAnchor = parseFloat(e.target.value);
      e.target.nextSibling.textContent =
        window.arpAnchor === 0
          ? 'Start'
          : window.arpAnchor === 1
            ? 'End'
            : 'Mid';
      window.projectApp?._refreshVisuals();
      if (window.projectApp?.gt?.synchronizer)
        window.projectApp.gt.synchronizer.resyncScheduler();
    };
    this.liveLenSlider.oninput = (e) => {
      window.arpGlobalLenFactor = parseFloat(e.target.value);
      e.target.nextSibling.textContent = `${window.arpGlobalLenFactor}x`;
      window.projectApp?._refreshVisuals();
      if (window.projectApp?.gt?.synchronizer)
        window.projectApp.gt.synchronizer.resyncScheduler();
    };

    return section;
  }

  _createStrumSection() {
      const section = this._createSection('🎸 Strum');
      const slider = makeElement('input', {
        type: 'range',
        min: '0',
        max: '200',
        value: '25',
        style: 'flex:1',
      });
      const disp = makeElement(
        'span',
        {style: 'width:40px; text-align:right; font-size:11px;'},
        '25ms'
      );
      slider.oninput = () => (disp.textContent = `${slider.value}ms`);

      const btn = makeElement(
        'button',
        {
          className: 'action-button secondary',
          style: 'width:100%; margin-top:5px;',
          onclick: () =>
            window.projectApp?.pianoLogic?.applyStrum(
              parseInt(slider.value)
            ),
        },
        'Apply Static Strum'
      );

      section.append(this._createRow('Width:', slider, disp), btn);
      return section;
    }

  _createTrackSection() {
      const section = this._createSection('🔀 Track Management');

      const pitchInputRow = makeElement(
        'div',
        {
          style: 'display:flex; align-items:center; gap:8px; margin-bottom:8px;',
        },
        [
          makeElement(
            'label',
            {style: 'font-size:12px; color:#888;'},
            'Split Pitch:'
          ),
          makeElement('input', {
            type: 'number',
            id: 'split-pitch-val',
            value: '60',
            style:
              'width:50px; background:#111; color:#4a90e2; border:1px solid #444; padding:3px;',
          }),
          makeElement(
            'span',
            {style: 'font-size:11px; color:#555;'},
            '(60 = C4)'
          ),
        ]
      );

      const btnRow = makeElement(
        'div',
        {style: 'display:flex; flex-direction:column; gap:5px;'},
        [
          makeElement(
            'button',
            {
              className: 'action-button secondary',
              onclick: () => {
                const pitch = parseInt(
                  document.getElementById('split-pitch-val').value
                );
                window.projectApp?.pianoLogic?.splitTracks(
                  'pitch',
                  pitch
                );
              },
            },
            'Split Track 0/1 by Pitch'
          ),
          makeElement(
            'button',
            {
              className: 'action-button secondary',
              onclick: () =>
                window.projectApp?.pianoLogic?.splitTracks('chord'),
            },
            'Split Track 0/1 by Chords vs Melody'
          ),
          makeElement(
            'button',
            {
              className: 'action-button secondary',
              onclick: () => window.projectApp?.pianoLogic?.swapTracks(),
            },
            'Swap Track 0 ↔ 1'
          ),
        ]
      );

      section.append(pitchInputRow, btnRow);
      return section;
    }

  _createFooter() {
    const footer = makeElement('div', {style: 'margin-top:10px;'});
    this.statusDiv = makeElement(
      'div',
      {style: 'margin-bottom:8px; font-size:11px; color:#888;'},
      'Ready.'
    );
    const btnUndo = makeElement(
      'button',
      {
        className: 'action-button secondary',
        style: 'width:100%; height:30px;',
        onclick: () => this.performUndo(),
      },
      'Undo (Z)'
    );
    footer.append(this.statusDiv, btnUndo);
    return footer;
  }

  _createCheckbox(label, checked, cb) {
    const lbl = makeElement('label', {
      style:
        'display:flex; align-items:center; cursor:pointer; color:#ccc; font-size:12px;',
    });
    const chk = makeElement('input', {
      type: 'checkbox',
      checked: checked,
      style: 'margin-right:8px;',
    });
    chk.onchange = () => cb(chk.checked);
    lbl.append(chk, label);
    return lbl;
  }

  _createSelectionSection() {
    const section = this._createSection('⏱ Selection Info');
    this.selectionInfo = makeElement(
      'div',
      {
        style:
          'background:#111; padding:8px; border-radius:4px; font-size:11px; color:#4f4; border:1px solid #333; text-align:center;',
      },
      '0 notes selected'
    );
    // Removed Button. Hotkeys are primary.
    section.append(this.selectionInfo);
    return section;
  }

  _createHotkeyGuide() {
    const section = this._createSection('⌨️ Hotkeys');
    const style =
      'display:grid; grid-template-columns: 1fr 2fr; gap:4px; font-size:10px; color:#aaa;';
    section.append(
      makeElement('div', {style}, [
        makeElement('b', {style: 'color:#4f4'}, 'S'),
        makeElement('span', 'Sync Selected Note'),
        makeElement('b', 'Z'),
        makeElement('span', 'Undo'),
        makeElement('b', 'P'),
        makeElement('span', 'Play / Pause'),
        makeElement('b', 'B'),
        makeElement('span', 'Back 10 Seconds'),
        makeElement('b', '0-9'),
        makeElement('span', 'Seek to %'),
        makeElement('b', 'Del'),
        makeElement('span', 'Delete Selected'),
      ])
    );
    return section;
  }

  constructor() {
    this._state = {
      deltaTextArea: null, absoluteTextArea: null, statusDiv: null,
      fileHeaders: {}, deltaHistory: [], absoluteHistory: [],
      arpPatternSelect: null, arpCustomPatternInput: null,
      arpPerformanceDurationSlider: null, arpDurationDisplay: null,
      arpStartOffsetInput: null
    };
    Object.defineProperties(this, {
      deltaTextArea: { get: () => this._state.deltaTextArea, set: v => this._state.deltaTextArea = v, configurable: true },
      absoluteTextArea: { get: () => this._state.absoluteTextArea, set: v => this._state.absoluteTextArea = v, configurable: true },
      statusDiv: { get: () => this._state.statusDiv, set: v => this._state.statusDiv = v, configurable: true },
      fileHeaders: { get: () => this._state.fileHeaders, set: v => this._state.fileHeaders = v, configurable: true },
      deltaHistory: { get: () => this._state.deltaHistory, set: v => this._state.deltaHistory = v, configurable: true },
      absoluteHistory: { get: () => this._state.absoluteHistory, set: v => this._state.absoluteHistory = v, configurable: true },
      arpPatternSelect: { get: () => this._state.arpPatternSelect, set: v => this._state.arpPatternSelect = v, configurable: true },
      arpCustomPatternInput: { get: () => this._state.arpCustomPatternInput, set: v => this._state.arpCustomPatternInput = v, configurable: true },
      arpPerformanceDurationSlider: { get: () => this._state.arpPerformanceDurationSlider, set: v => this._state.arpPerformanceDurationSlider = v, configurable: true },
      arpDurationDisplay: { get: () => this._state.arpDurationDisplay, set: v => this._state.arpDurationDisplay = v, configurable: true },
      arpStartOffsetInput: { get: () => this._state.arpStartOffsetInput, set: v => this._state.arpStartOffsetInput = v, configurable: true }
    });

    this.container = null;
    this.statusDiv = null;
  }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 1178,
  "provides": [
    "ConvertPianoroll"
  ],
  "deps": [
    "applyCss",
    "makeElement"
  ]
}
recursi-meta */

globalThis.ConvertPianoroll = ConvertPianoroll;
