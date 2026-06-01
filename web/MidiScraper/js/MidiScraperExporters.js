/**
 * MidiScraperExporters
 *
 * Houses the massive diagnostic formatting logic and data transformation algorithms
 * used to evaluate Lane vs Keyboard timing accuracies.
 */
class MidiScraperExporters {
  constructor(app) {
    this.app = app;
  }

  formatTimedEventNumber(value) {
    const rounded = Math.round(Number(value) * 10) / 10;
    if (!Number.isFinite(rounded)) return '0';
    if (Math.abs(rounded - Math.round(rounded)) < 0.0000001) {
      return String(Math.round(rounded));
    }
    return rounded.toFixed(1);
  }

  formatTimedEventsExport(notes, mode = 'adjusted') {
    const events = this.buildTimedEventsData(notes, mode);
    const lines = ['---- timedEvents'];
    let previousRawStartMs = null;

    events.forEach((event) => {
      const deltaMs =
        previousRawStartMs === null
          ? event.startMs
          : event.startMs - previousRawStartMs;

      const rawStartDiff = event.startMs - event.kbStartMs;
      const rawDurDiff = event.durationMs - event.kbDurMs;

      const formatAdj = (val) => {
        if (Math.abs(val) < 0.005) return '0';
        const sign = val > 0 ? '+' : '';
        return sign + val.toFixed(2);
      };

      const startMsg = event.usedRefinedStart
        ? `adj:${formatAdj(rawStartDiff)}ms`
        : `rej:${event.startRejectReason || 'unknown'}`;

      const durMsg = event.usedRefinedDuration
        ? `adj:${formatAdj(rawDurDiff)}ms`
        : `rej:${event.durRejectReason || 'unknown'}`;

      const kbS = Math.round(event.kbStartMs);
      const refS = Math.round(event.refinedStartMs);

      const comment = ` # kbStart:${kbS} refStart:${refS} blocks:${event.blockCount} ign:${event.ignoredBlockCount} obs:${event.bestObsCount} | start: ${startMsg} | dur: ${durMsg}`;

      lines.push(
        `${this.formatTimedEventNumber(deltaMs)}m${
          event.midi
        }d${this.formatTimedEventNumber(event.durationMs)}${comment}`
      );

      previousRawStartMs = event.startMs;
    });

    return lines.join('\n');
  }

  buildTimedEventsData(notes, mode = 'adjusted') {
    const safeNotes = Array.isArray(notes) ? notes : [];
    const ordered = [...safeNotes].sort((a, b) => {
      return (
        (a.kbStartMs ?? 0) - (b.kbStartMs ?? 0) || (a.midi ?? 0) - (b.midi ?? 0)
      );
    });

    if (!ordered.length) return [];

    const chordThresholdMs = 1;
    const maxStartCorrectionMs = 140;
    const maxDurationCorrectionMs = 220;
    const maxDurationRatio = 1.5;
    const minDurationRatio = 0.67;

    const getMatchedBlockInfo = (note) => {
      const blocks = Array.isArray(note.matchedBlocks)
        ? note.matchedBlocks
        : [];
      const ignored = Array.isArray(note.ignoredBlocks)
        ? note.ignoredBlocks
        : [];
      if (!blocks.length) {
        return {
          blockCount: 0,
          ignoredBlockCount: ignored.length,
          bestObsCount: 0,
          startObsCount: 0,
          endObsCount: 0,
          reliableStart: false,
          reliableDuration: false,
        };
      }

      let bestObsCount = 0;
      let totalStartObs = 0;
      let totalEndObs = 0;

      for (const block of blocks) {
        const obsArray = Array.isArray(block.observations)
          ? block.observations
          : [];
        const obsCount = obsArray.length;
        if (obsCount > bestObsCount) bestObsCount = obsCount;

        for (const obs of obsArray) {
          if (!obs.clampedBottom) totalStartObs++;
          if (!obs.clampedTop) totalEndObs++;
        }
      }

      // Expanded tolerance: text labels heavily fragment the blocks.
      // Accept up to 4 blocks as long as we observed it clearly at least a couple of times.
      const reliableStart = blocks.length <= 4 && bestObsCount >= 2;
      const reliableDuration = blocks.length <= 4 && bestObsCount >= 2;

      return {
        blockCount: blocks.length,
        ignoredBlockCount: ignored.length,
        bestObsCount,
        startObsCount: totalStartObs,
        endObsCount: totalEndObs,
        reliableStart,
        reliableDuration,
      };
    };

    const groups = [];
    for (const note of ordered) {
      const kbStartMs = Number(note.kbStartMs ?? 0);
      const lastGroup = groups[groups.length - 1];
      if (
        !lastGroup ||
        Math.abs(kbStartMs - lastGroup.kbStartMs) > chordThresholdMs
      ) {
        groups.push({ kbStartMs, notes: [note] });
      } else {
        lastGroup.notes.push(note);
      }
    }

    // Find the first RELIABLE note to establish the global drift baseline
    // so we don't accidentally reject the whole song if Note 1 is missing blocks.
    let baselineShift = 0;
    for (const note of ordered) {
      const info = getMatchedBlockInfo(note);
      if (
        info.reliableStart &&
        note.refinedStartMs !== undefined &&
        note.kbStartMs !== undefined
      ) {
        baselineShift = Number(note.refinedStartMs) - Number(note.kbStartMs);
        break;
      }
    }

    const result = [];
    let runningIndex = 0;

    const getMedian = (values) => {
      const nums = values
        .filter((v) => Number.isFinite(v))
        .sort((a, b) => a - b);
      if (!nums.length) return null;
      const mid = Math.floor(nums.length / 2);
      if (nums.length % 2) return nums[mid];
      return (nums[mid - 1] + nums[mid]) / 2;
    };

    groups.forEach((group, groupIndex) => {
      const chordCandidates = [];

      group.notes.forEach((note) => {
        const kbStartMs = Number(note.kbStartMs ?? 0);
        const refinedStartMs = Number(note.refinedStartMs ?? kbStartMs);
        const info = getMatchedBlockInfo(note);
        const rawCorrection = refinedStartMs - kbStartMs - baselineShift;

        if (
          mode === 'adjusted' &&
          groupIndex > 0 &&
          info.reliableStart &&
          Number.isFinite(rawCorrection) &&
          Math.abs(rawCorrection) <= maxStartCorrectionMs
        ) {
          chordCandidates.push(rawCorrection);
        }
      });

      const groupCorrectionMs =
        mode === 'adjusted' && groupIndex > 0
          ? getMedian(chordCandidates) ?? 0
          : 0;

      group.notes.forEach((note) => {
        const kbStartMs = Number(note.kbStartMs ?? 0);
        const kbDurMs = Number(
          note.kbDurMs ?? (note.kbEndMs ?? 0) - (note.kbStartMs ?? 0)
        );
        const refinedStartMs = Number(note.refinedStartMs ?? kbStartMs);
        const refinedDurMs = Number(note.refinedDurationMs ?? kbDurMs);
        const midi = parseInt(note.midi, 10);
        const info = getMatchedBlockInfo(note);

        if (
          !Number.isFinite(kbStartMs) ||
          !Number.isFinite(kbDurMs) ||
          !Number.isFinite(refinedStartMs) ||
          !Number.isFinite(refinedDurMs) ||
          !Number.isFinite(midi)
        ) {
          return;
        }

        let startMs = kbStartMs;
        let durationMs = kbDurMs;
        let usedRefinedStart = false;
        let usedRefinedDuration = false;

        let startRejectReason = '';
        let durRejectReason = '';

        if (mode === 'adjusted' && groupIndex > 0) {
          const rawCorrection = refinedStartMs - kbStartMs - baselineShift;
          if (!info.reliableStart) {
            startRejectReason =
              info.blockCount === 0
                ? 'no_blocks'
                : `unreliable_blocks(${info.blockCount})`;
          } else if (
            !Number.isFinite(rawCorrection) ||
            Math.abs(rawCorrection) > maxStartCorrectionMs
          ) {
            startRejectReason = `exceeds_max_corr(${Math.round(
              rawCorrection
            )}ms)`;
          } else {
            startMs = kbStartMs + groupCorrectionMs;
            usedRefinedStart = groupCorrectionMs !== 0;
            if (groupCorrectionMs === 0) startRejectReason = '0ms_correction';
          }
        } else if (groupIndex === 0) {
          startRejectReason = 'first_note_anchor';
        }

        const durationDeltaMs = refinedDurMs - kbDurMs;
        const durationRatio = kbDurMs > 0 ? refinedDurMs / kbDurMs : 1;

        if (mode !== 'adjusted') {
          durRejectReason = 'mode_not_adjusted';
        } else if (!info.reliableDuration) {
          durRejectReason =
            info.blockCount === 0
              ? 'no_blocks'
              : `unreliable_blocks(${info.blockCount})`;
        } else if (!Number.isFinite(refinedDurMs)) {
          durRejectReason = 'invalid_refined_dur';
        } else if (Math.abs(durationDeltaMs) > maxDurationCorrectionMs) {
          durRejectReason = `exceeds_max_corr(${Math.round(
            durationDeltaMs
          )}ms)`;
        } else if (
          durationRatio < minDurationRatio ||
          durationRatio > maxDurationRatio
        ) {
          durRejectReason = `bad_ratio(${durationRatio.toFixed(2)})`;
        } else {
          durationMs = refinedDurMs;
          usedRefinedDuration = true;
        }

        result.push({
          index: runningIndex,
          midi,
          startMs,
          durationMs,
          kbStartMs,
          kbDurMs,
          refinedStartMs,
          refinedDurMs,
          correctionMs: groupCorrectionMs,
          usedRefinedStart,
          usedRefinedDuration,
          startRejectReason,
          durRejectReason,
          sameChordAsPrevious:
            runningIndex > 0 &&
            Math.abs(
              kbStartMs - Number(result[result.length - 1].kbStartMs ?? 0)
            ) <= chordThresholdMs,
          blockCount: info.blockCount,
          ignoredBlockCount: info.ignoredBlockCount,
          bestObsCount: info.bestObsCount,
          startObsCount: info.startObsCount,
          endObsCount: info.endObsCount,
          groupIndex,
          groupCandidateCount: chordCandidates.length,
        });

        runningIndex++;
      });
    });

    return result.sort((a, b) => a.index - b.index);
  }

  formatTimedEventsDiagnostics(notes) {
    const rawEvents = this.buildTimedEventsData(notes, 'raw');
    const adjustedEvents = this.buildTimedEventsData(notes, 'adjusted');

    const lines = [];

    const midiGroups = new Map();
    for (const note of Array.isArray(notes) ? notes : []) {
      if (!midiGroups.has(note.midi)) midiGroups.set(note.midi, []);
      midiGroups.get(note.midi).push(note);
    }

    lines.push('=== PER-MIDI STRIKE CALIBRATION ===');
    for (const [midi, midiNotes] of [...midiGroups.entries()].sort(
      (a, b) => a[0] - b[0]
    )) {
      const summary = this.app.laneScraper.buildStrikeCalibrationSummary(
        midi,
        midiNotes
      );
      lines.push(
        [
          `midi=${midi}`,
          `note=${this.app.midiToNoteName(midi)}`,
          `v=${summary.velocityPxPerMs.toFixed(5)}px/ms`,
          `msPerPx=${summary.msPerPixel.toFixed(3)}`,
          `anchorOffset=${summary.anchorOffsetMs.toFixed(1)}ms`,
          `topLead=${
            Number.isFinite(summary.topLeadMs)
              ? summary.topLeadMs.toFixed(1) + 'ms'
              : 'n/a'
          }`,
          `bottomLead=${
            Number.isFinite(summary.bottomLeadMs)
              ? summary.bottomLeadMs.toFixed(1) + 'ms'
              : 'n/a'
          }`,
        ].join('  ')
      );
    }

    lines.push('');
    lines.push(
      'idx\tgrp\tmidi\tkbStart\tkbDur\trefStart\trefDur\tadjStart\tadjDur\tgroupCorr\tcand\tblocks\tign\tbestObs\tusedStart\tusedDur\tsameChord'
    );

    for (
      let i = 0;
      i < Math.max(rawEvents.length, adjustedEvents.length);
      i++
    ) {
      const raw = rawEvents[i];
      const adj = adjustedEvents[i];
      if (!raw || !adj) continue;

      lines.push(
        [
          i + 1,
          adj.groupIndex,
          raw.midi,
          this.formatTimedEventNumber(raw.kbStartMs),
          this.formatTimedEventNumber(raw.kbDurMs),
          this.formatTimedEventNumber(raw.refinedStartMs),
          this.formatTimedEventNumber(raw.refinedDurMs),
          this.formatTimedEventNumber(adj.startMs),
          this.formatTimedEventNumber(adj.durationMs),
          this.formatTimedEventNumber(adj.correctionMs || 0),
          adj.groupCandidateCount,
          adj.blockCount,
          adj.ignoredBlockCount,
          adj.bestObsCount,
          adj.usedRefinedStart ? 'Y' : 'N',
          adj.usedRefinedDuration ? 'Y' : 'N',
          adj.sameChordAsPrevious ? 'Y' : 'N',
        ].join('\t')
      );
    }

    return lines.join('\n');
  }

  generateLaneDiagnosticReport(midi) {
    const parsedMidi = parseInt(midi, 10);
    if (isNaN(parsedMidi)) return 'Invalid MIDI code.';

    const noteName = this.app.midiToNoteName(parsedMidi);
    let report = `=== DIAGNOSTIC REPORT FOR ${noteName} (MIDI ${parsedMidi}) ===\n\n`;

    // 1. Keyboard Occurrences
    const kbNotes = (this.app.recordedNotes || []).filter(
      (n) => n.midi === parsedMidi
    );
    report += `--- KEYBOARD OCCURRENCES (${kbNotes.length}) ---\n`;
    kbNotes.forEach((n, i) => {
      const dur = n.kbEndMs - n.kbStartMs;
      report += `[${i + 1}] kbStart: ${n.kbStartMs}ms, kbEnd: ${
        n.kbEndMs
      }ms, duration: ${dur}ms\n`;
    });
    report += `\n`;

    // 2. Tracked Runs (Falling Blocks identified by LaneScraper)
    const finishedRuns = (
      this.app.laneScraper.finishedTrackedRuns || []
    ).filter((r) => r.midi === parsedMidi);
    report += `--- DETECTED FALLING RUNS (${finishedRuns.length}) ---\n`;
    finishedRuns.forEach((run, i) => {
      report += `[Run ${i + 1}] predictedStartMs: ${run.startMs.toFixed(
        1
      )}, predictedEndMs: ${run.endMs.toFixed(
        1
      )}, durationMs: ${run.durationMs.toFixed(1)}, v: ${run.v.toFixed(
        3
      )} px/ms\n`;
      report += `    Observations (${run.observations.length}):\n`;
      run.observations.forEach((obs) => {
        report += `      t=${obs.t}ms, topY=${obs.topY.toFixed(1)}${
          obs.clampedTop ? ' (Clamped)' : ''
        }, bottomY=${obs.bottomY.toFixed(1)}${
          obs.clampedBottom ? ' (Clamped)' : ''
        }\n`;
      });
    });
    report += `\n`;

    // 3. Match Analysis (How they factor in together using final results)
    report += `--- ALIGNMENT ANALYSIS ---\n`;
    kbNotes.forEach((n, i) => {
      const matchInfo = (this.app.lastScrapeResults || []).find(
        (r) => r.midi === parsedMidi && r.kbStartMs === n.kbStartMs
      );
      if (!matchInfo) {
        report += `[KB Note ${i + 1}] Not found in final alignment mapping!\n`;
        return;
      }

      report += `[KB Note ${i + 1}] (kbStart: ${n.kbStartMs}ms, kbEnd: ${
        n.kbEndMs
      }ms)\n`;
      report += `    Refined Start: ${matchInfo.refinedStartMs.toFixed(
        1
      )}ms, Refined Duration: ${matchInfo.refinedDurationMs.toFixed(1)}ms\n`;
      report += `    Matched Blocks (Fragments): ${matchInfo.matchedBlocks.length}\n`;
      matchInfo.matchedBlocks.forEach((mb, mbi) => {
        report += `      -> Block [predictedStartMs: ${mb.startMs.toFixed(
          1
        )}, predictedEndMs: ${mb.endMs.toFixed(1)}]\n`;
      });
      if (matchInfo.ignoredBlocks.length > 0) {
        report += `    Ignored/Orphaned Blocks mapped to this timeslot: ${matchInfo.ignoredBlocks.length}\n`;
        matchInfo.ignoredBlocks.forEach((ib, ibi) => {
          report += `      -> Block [predictedStartMs: ${ib.startMs.toFixed(
            1
          )}, predictedEndMs: ${ib.endMs.toFixed(1)}]\n`;
        });
      }
    });
    report += `\n`;

    // 4. Raw Falling Samples
    const rawSamples = (this.app.laneScraper.fallingSampleLog || []).filter(
      (s) => s.midi === parsedMidi
    );
    report += `--- RAW FALLING SAMPLES (${rawSamples.length}) ---\n`;
    report += `(Showing all frame captures for this lane to identify outline/text confusion. Multiple runs per timestamp 't' indicate visual fragmentation.)\n`;
    rawSamples.forEach((s) => {
      report += `t=${s.t}ms, topY=${Math.round(s.top)}, bottomY=${Math.round(
        s.bottom
      )}, strikeY=${Math.round(s.strike)}, clampedTop: ${
        s.clampedTop
      }, clampedBottom: ${s.clampedBottom}\n`;
    });

    return report;
  }

  generateLaneScrapeTrace(midi) {
    const parsedMidi = parseInt(midi, 10);
    if (isNaN(parsedMidi)) return null;

    const blocks = this.app.laneScraper.finishedTrackedRuns
      .filter((r) => r.midi === parsedMidi)
      .map((r, i) => ({
        blockIndex: i,
        velocityPxPerMs: Number(r.v.toFixed(3)),
        strikeYTarget: r.strikeY,
        predictedStartMs: Math.round(r.startMs),
        predictedEndMs: Math.round(r.endMs),
        durationMs: Math.round(r.durationMs),
        observations: r.observations.map((obs) => ({
          t: obs.t,
          topY: Number(obs.topY.toFixed(1)),
          bottomY: Number(obs.bottomY.toFixed(1)),
          clampedTop: obs.clampedTop,
          clampedBottom: obs.clampedBottom,
        })),
      }));

    const matchResults = (this.app.lastScrapeResults || [])
      .filter((n) => n.midi === parsedMidi)
      .map((n, i) => ({
        eventIndex: i,
        kbStartMs: n.kbStartMs,
        kbDurationMs: n.kbDurMs,
        refinedStartMs: n.refinedStartMs,
        refinedDurationMs: n.refinedDurationMs,
        startCorrectionMs: n.refinedStartMs - n.kbStartMs,
        matchedBlocks: n.matchedBlocks.map((b) => ({
          predictedStart: Math.round(b.startMs),
          predictedEnd: Math.round(b.endMs),
          obsCount: b.observations.length,
        })),
        ignoredBlocks: n.ignoredBlocks.map((b) => ({
          predictedStart: Math.round(b.startMs),
          predictedEnd: Math.round(b.endMs),
        })),
      }));

    return {
      midi: parsedMidi,
      noteName: this.app.midiToNoteName(parsedMidi),
      globalEstimatedVelocity: Number(
        this.app.laneScraper.currentVelocity.toFixed(3)
      ),
      rawFallingBlocksDetected: blocks,
      keyboardEventsAndMatching: matchResults,
    };
  }

  formatRawKeyboardNotesList(notes) {
    const safeNotes = Array.isArray(notes) ? notes : [];
    const ordered = [...safeNotes].sort((a, b) => {
      return (
        (a.kbStartMs ?? 0) - (b.kbStartMs ?? 0) || (a.midi ?? 0) - (b.midi ?? 0)
      );
    });

    const lines = ['--- rawKeyboardNotes'];
    ordered.forEach((note, index) => {
      const kbStartMs = Number(note.kbStartMs ?? 0);
      const kbEndMs = Number(note.kbEndMs ?? kbStartMs);
      const kbDurMs = Number(note.kbDurMs ?? kbEndMs - kbStartMs);
      const midi = parseInt(note.midi, 10);
      const name = this.app.midiToNoteName(midi);

      lines.push(
        [
          String(index + 1).padStart(3, '0'),
          `midi=${midi}`,
          `note=${name}`,
          `kbStart=${this.formatTimedEventNumber(kbStartMs)}`,
          `kbEnd=${this.formatTimedEventNumber(kbEndMs)}`,
          `kbDur=${this.formatTimedEventNumber(kbDurMs)}`,
        ].join('  ')
      );
    });

    return lines.join('\n');
  }
}



