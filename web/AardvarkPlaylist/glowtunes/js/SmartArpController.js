class SmartArpController {
  static get smartArpDefaults() {
      return {
        trebleInstrument: 'Vibes',
        trebleVolume: 5.0, // Curator: Lowered from 8.0 for a softer volume out-of-the-box
        bassInstrument: 'Chimes',
        bassVolume: 3.0, // Curator: Lowered from 5.0
        arpSpread: 89,
        arpPattern: [0, 1, 2],
        arpAnchor: 0.8,
        arpLenFactor: 1.0,
      };
    }

  static getSmartArpDefaults() {
      return this.smartArpDefaults;
    }

  static extractTrueChords(timedEvents) {
      const notes = timedEvents.filter((e) => e.type === 'note');
      const sortedNotes = [...notes].sort((a, b) => a.t - b.t);
      const clusters = [];
      if (sortedNotes.length > 0) {
        let currentCluster = [sortedNotes[0]];
        for (let i = 1; i < sortedNotes.length; i++) {
          const n = sortedNotes[i];
          const first = currentCluster[0];
          // Chords must start at exactly the same time (10ms tolerance)
          if (Math.abs(n.t - first.t) <= 10) {
            currentCluster.push(n);
          } else {
            clusters.push(currentCluster);
            currentCluster = [n];
          }
        }
        if (currentCluster.length > 0) {
          currentCluster.sort((a, b) => a.mc - b.mc);
          clusters.push(currentCluster);
        }
      }

      const trueChords = [];
      clusters.forEach((c) => {
        // STRICTLY look for exactly 3-note chords
        if (c.length < 3) return;

        // Sort by pitch ascending
        c.sort((a, b) => a.mc - b.mc);

        // Scan consecutive subsets of exactly 3 notes
        for (let i = 0; i <= c.length - 3; i++) {
          const sub = c.slice(i, i + 3);

          const d1 = sub[0].d || 500;
          const d2 = sub[1].d || 500;
          const d3 = sub[2].d || 500;

          // Strict duration/end-time equality (within 10ms tolerance)
          const sameDuration = Math.abs(d1 - d2) <= 10 && Math.abs(d2 - d3) <= 10;

          // Key proximity check: chord notes should not have massive gaps (gaps <= 12 semitones)
          let closePitches = true;
          for (let j = 0; j < sub.length - 1; j++) {
            const gap = sub[j + 1].mc - sub[j].mc;
            if (gap > 12) closePitches = false;
          }

          if (sameDuration && closePitches) {
            trueChords.push(sub);
            return; // Found the true 3-note chord for this simultaneous cluster
          }
        }
      });

      return trueChords;
    }

  static detectOptimalSplitAndChords(veqData, verbose) {
      try {
        if (!veqData || !Array.isArray(veqData.timedEvents)) {
          console.error('[SmartArp] Error: No valid VEQ data loaded.');
          return null;
        }

        const notes = veqData.timedEvents.filter((e) => e.type === 'note');
        if (notes.length < 15) {
          console.log(
            `[SmartArp] Info: Note density too low (${notes.length} notes < 15 minimum). Auto-split skipped.`
          );
          return null;
        }

        // Extract true, structurally verified 3-note bass chords
        const bassChords = this.extractTrueChords(notes);

        if (bassChords.length < 3) {
          console.log(
            `[SmartArp] Info: Too few bass chords found (${bassChords.length} < 3 minimum). Auto-split skipped.`
          );
          return null;
        }

        let maxChordNotePitch = -Infinity;
        let maxChordNoteTimeMs = 0;
        bassChords.forEach((c) => {
          const maxPitch = Math.max(...c.map((n) => n.mc));
          if (maxPitch > maxChordNotePitch) {
            maxChordNotePitch = maxPitch;
            const matchNote = c.find((n) => n.mc === maxPitch);
            if (matchNote) maxChordNoteTimeMs = matchNote.t;
          }
        });

        // Split point should be strictly no higher than one above the highest note in a chord that it's found
        const maxAllowedSplit = Math.max(42, Math.min(72, maxChordNotePitch + 1));
        const minAllowedSplit = Math.max(36, Math.min(60, maxChordNotePitch - 6));

        const m = Math.floor(maxChordNoteTimeMs / 60000);
        const s = Math.floor((maxChordNoteTimeMs % 60000) / 1000);
        const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

        console.log(
          `[SmartArp] Found ${
            bassChords.length
          } bass chord clusters. Highest note in chords: ${VideoEventQueue.midiToNoteName(
            maxChordNotePitch
          )} (${maxChordNotePitch}) at ${timeStr}. Search range: ${VideoEventQueue.midiToNoteName(
            minAllowedSplit
          )} (${minAllowedSplit}) to ${VideoEventQueue.midiToNoteName(
            maxAllowedSplit
          )} (${maxAllowedSplit}).`
        );

        let bestSplit = maxAllowedSplit;
        let maxScore = -Infinity;

        for (let P = minAllowedSplit; P <= maxAllowedSplit; P++) {
          // Prefer split points close to the top of the range (just above highest chord note)
          const distToTarget = Math.abs(P - maxAllowedSplit);
          let score = 100 - distToTarget * 6;

          const distTo60 = Math.abs(P - 60);
          score -= distTo60 * 2;

          let intactCount = 0;
          let cutCount = 0;

          bassChords.forEach((chord) => {
            const pitches = chord.map((n) => n.mc);
            const minPitch = Math.min(...pitches);
            const maxPitch = Math.max(...pitches);

            if (maxPitch < P) {
              // Chord is fully below the split point (intact in bass)
              score += 20;
              intactCount++;
            } else if (minPitch < P && maxPitch >= P) {
              // Split point cuts through the chord
              score -= 15;
              cutCount++;
            }
          });

          // Balance penalty
          const bassNoteCount = notes.filter((n) => n.mc < P).length;
          const trebleNoteCount = notes.filter((n) => n.mc >= P).length;
          const balanceFactor =
            Math.abs(bassNoteCount - trebleNoteCount) / (notes.length || 1);
          score -= balanceFactor * 30;

          if (verbose) {
            console.log(
              `[SmartArp - Scoring] Candidate Split ${P} (${VideoEventQueue.midiToNoteName(
                P
              )}): Score = ${score.toFixed(
                1
              )} (Intact = ${intactCount}, Cuts = ${cutCount})`
            );
          }

          if (score > maxScore) {
            maxScore = score;
            bestSplit = P;
          }
        }

        // Count of intact chords under the selected optimal split
        let finalIntactChords = 0;
        bassChords.forEach((chord) => {
          const maxPitch = Math.max(...chord.map((n) => n.mc));
          if (maxPitch < bestSplit) {
            finalIntactChords++;
          }
        });

        const percentage = (finalIntactChords / bassChords.length) * 100;
        console.log(
          `[SmartArp] Best split point found at MIDI ${bestSplit} (${VideoEventQueue.midiToNoteName(
            bestSplit
          )}) with score ${maxScore.toFixed(1)}.`
        );
        console.log(
          `[SmartArp] Intact bass chords: ${finalIntactChords}/${
            bassChords.length
          } (${percentage.toFixed(1)}%).`
        );

        // Criteria: we need at least 3 intact bass chords, representing at least 15% of the total bass chords
        const isSignificant =
          finalIntactChords >= 3 && finalIntactChords / bassChords.length >= 0.15;
        if (isSignificant) {
          console.log(
            `[SmartArp] Decision: Criteria satisfied (Significant chords present). Applying automated split.`
          );
          return {
            splitPitch: bestSplit,
            bassChordsCount: finalIntactChords,
            totalChordsCount: bassChords.length,
            maxChordTimeMs: maxChordNoteTimeMs,
          };
        }

        console.log(
          '[SmartArp] Decision: Chords are not significant enough to justify splitting. Playing as single instrument.'
        );
        return null;
      } catch (err) {
        console.error('[SmartArp] Error during optimal split analysis:', err);
        return null;
      }
    }

  static applySmartRangeTransposition(player, veqData) {
      if (!veqData || !Array.isArray(veqData.timedEvents)) return;

      const notes = veqData.timedEvents.filter(e => e.type === 'note');
      if (notes.length === 0) return;

      // Filter out non-piano outlier/control notes (standard piano range is MIDI 21 to 108)
      const validNotes = notes.filter(n => n.mc >= 21 && n.mc <= 108);
      const targetNotes = validNotes.length > 0 ? validNotes : notes;

      const pitches = targetNotes.map(n => n.mc).sort((a, b) => a - b);
      
      // Calculate 95th and 5th percentiles to avoid outlier notes
      // dragging the entire visual layout into extreme registers
      const p95 = pitches[Math.floor(pitches.length * 0.95)] ?? 60;
      const p05 = pitches[Math.floor(pitches.length * 0.05)] ?? 60;

      let visualShift = 0;

      // Safe Visible keyboard range is MIDI 36 (C2) to 84 (C6)
      if (p95 > 84) {
        const overshot = p95 - 84;
        const octavesToShift = Math.ceil(overshot / 12);
        visualShift = -octavesToShift * 12;
      } else if (p05 < 36) {
        const undershot = 36 - p05;
        const octavesToShift = Math.ceil(undershot / 12);
        visualShift = octavesToShift * 12;
      }

      if (visualShift !== 0) {
        if (typeof window.curatorLog === 'function') {
          window.curatorLog('Transpose', `Smart Range Guard: Percentile range [5th: ${p05}, 95th: ${p95}] goes off-screen. Shifted visuals by ${visualShift > 0 ? '+' : ''}${visualShift} semitones.`);
        }
        
        // Shift visual tracks
        player.setTranspose(visualShift);
      } else {
        if (typeof window.curatorLog === 'function') {
          window.curatorLog('Transpose', `Smart Range Guard: Percentile range [5th: ${p05}, 95th: ${p95}] fits perfectly on-keyboard.`);
        }
      }
    }
}
