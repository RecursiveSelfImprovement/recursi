class LaneScraper {
  reset() {
    this.trackedRuns = [];
    this.finishedTrackedRuns = [];
    this.fallingSampleLog = [];
    this.laneDebugLogs = new Map();
    this.laneSampleCounts = new Map();
    this.currentVelocity = 0;
  }

  finalizeAll() {
    for (const tr of this.trackedRuns || []) {
      this.finalizeTrackedRun(tr);
    }
    this.trackedRuns = [];
  }

  hexToRgb(hex) {
    if (!hex) return [0, 0, 0];
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  colorDistance(c1, c2) {
    return Math.sqrt(
      (c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2
    );
  }

  classifyPixel(r, g, b, isBlack) {
    const px = [r, g, b];
    const bg = this.hexToRgb(this.app.colorCalibration.bg);
    const tol = this.app.colorTolerance || 45;

    const dBg = this.colorDistance(px, bg);

    const c1 = this.hexToRgb(
      isBlack ? this.app.colorCalibration.bn1 : this.app.colorCalibration.wn1
    );
    const c2 = this.hexToRgb(
      isBlack ? this.app.colorCalibration.bn2 : this.app.colorCalibration.wn2
    );

    const d1 = this.colorDistance(px, c1);
    const d2 = this.colorDistance(px, c2);
    const dNote = Math.min(d1, d2);

    const matchBg = dBg <= tol;
    const matchNote = dNote <= tol;

    if (matchBg && matchNote) {
      return dBg <= dNote ? 'BG' : 'NOTE';
    }

    if (matchBg) return 'BG';
    if (matchNote) return 'NOTE';

    return 'UNKNOWN';
  }

  extractLaneRuns(
    lane,
    scaleX,
    scaleY,
    nowMs,
    fullFrameData,
    frameWidth,
    frameHeight
  ) {
    if (!this.app.pianoSvg) return [];

    if (!this.laneSampleCounts) this.laneSampleCounts = new Map();
    this.laneSampleCounts.set(
      lane.midi,
      (this.laneSampleCounts.get(lane.midi) || 0) + 1
    );

    if (!this.laneDebugLogs.has(lane.midi)) {
      this.laneDebugLogs.set(lane.midi, []);
    }

    try {
      const frame = {
        ctx: this.app.captureCtx,
        scaleX: scaleX,
        scaleY: scaleY,
        width: Number.isFinite(frameWidth)
          ? frameWidth
          : this.app.captureCanvas
          ? this.app.captureCanvas.width
          : 0,
        height: Number.isFinite(frameHeight)
          ? frameHeight
          : this.app.captureCanvas
          ? this.app.captureCanvas.height
          : 0,
        fullFrameData: fullFrameData || null,
      };

      const analysis = this.analyzeLaneOnCapturedFrame(lane, frame);

      let runs = analysis.sharedRuns.map((r) => ({
        topY: r.stopY,
        bottomY: r.startY,
        clampedTop: r.clampedTop,
        clampedBottom: r.clampedBottom,
      }));

      runs.sort((a, b) => b.bottomY - a.bottomY);
      const mergedRuns = [];
      for (const r of runs) {
        if (mergedRuns.length === 0) {
          mergedRuns.push(r);
        } else {
          const last = mergedRuns[mergedRuns.length - 1];
          if (last.topY - r.bottomY <= 2) {
            last.topY = Math.min(last.topY, r.topY);
            last.clampedTop = last.clampedTop || r.clampedTop;
          } else {
            mergedRuns.push(r);
          }
        }
      }
      runs = mergedRuns;

      const runStr = runs
        .map((r) => `[Run: ${r.bottomY.toFixed(1)} to ${r.topY.toFixed(1)}]`)
        .join(' ');

      this.laneDebugLogs
        .get(lane.midi)
        .push(
          `T=${nowMs}ms | Left:${analysis.left.runs.length} Right:${
            analysis.right.runs.length
          } Shared:${analysis.sharedRuns.length} | Found: ${runStr || 'None'}`
        );

      return runs;
    } catch (e) {
      this.laneDebugLogs
        .get(lane.midi)
        .push(`T=${nowMs}ms | ERROR in extractLaneRuns: ${e.message}`);
      return [];
    }
  }

  updateTrackedRuns(
    lanes,
    nowMs,
    dtMs,
    scaleX,
    scaleY,
    fullFrameData,
    frameWidth,
    frameHeight
  ) {
    for (const tr of this.trackedRuns) {
      tr.matchedThisFrame = false;
    }

    const newTracked = [];
    let sumV = 0,
      countV = 0;

    const expectedV =
      this.currentVelocity > 0.05 && this.currentVelocity < 1.5
        ? this.currentVelocity
        : 0.15;

    const velocityForMatching =
      this.currentVelocity > 0.05 && this.currentVelocity < 1.5
        ? this.currentVelocity * 2.0
        : 0.25;

    const debugOnly = this.app.debugMidiOnly;

    for (const lane of lanes) {
      if (
        debugOnly !== undefined &&
        debugOnly !== null &&
        lane.midi !== debugOnly
      )
        continue;

      const runs = this.extractLaneRuns(
        lane,
        scaleX,
        scaleY,
        nowMs,
        fullFrameData,
        frameWidth,
        frameHeight
      );
      const laneTracked = this.trackedRuns.filter(
        (tr) => tr.midi === lane.midi
      );

      for (const run of runs) {
        this.fallingSampleLog.push({
          t: nowMs,
          midi: lane.midi,
          top: Math.round(run.topY),
          bottom: Math.round(run.bottomY),
          strike: Math.round(lane.strikeY),
          clampedTop: run.clampedTop,
          clampedBottom: run.clampedBottom,
        });

        let bestMatch = null;
        let bestDiff = Infinity;

        for (const tr of laneTracked) {
          if (tr.matchedThisFrame) continue;
          const lastObs = tr.observations[tr.observations.length - 1];
          const timeSinceLastSeen = nowMs - lastObs.t;
          if (timeSinceLastSeen <= 0) continue;

          const oldBarHitStrike = lastObs.bottomY >= lane.strikeY - 5;
          const newRunAtLaneTop = run.topY <= lane.sampleYTop + 20;
          if (oldBarHitStrike && newRunAtLaneTop) continue;

          const dyBot = run.bottomY - lastObs.bottomY;
          if (dyBot < -10) continue;

          const expectedDy = expectedV * timeSinceLastSeen;
          const maxForwardDist = velocityForMatching * timeSinceLastSeen;

          if (dyBot < maxForwardDist) {
            const diff = Math.abs(dyBot - expectedDy);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestMatch = tr;
            }
          }
        }

        const acceptThreshold = 80;
        if (bestMatch && bestDiff < acceptThreshold) {
          bestMatch.matchedThisFrame = true;
          bestMatch.observations.push({
            t: nowMs,
            topY: run.topY,
            bottomY: run.bottomY,
            clampedTop: run.clampedTop,
            clampedBottom: run.clampedBottom,
          });

          const lastObs =
            bestMatch.observations[bestMatch.observations.length - 2];
          const obsDt = nowMs - lastObs.t;
          const dy = run.bottomY - lastObs.bottomY;

          if (!run.clampedBottom && !lastObs.clampedBottom && obsDt > 0) {
            const frameV = dy / obsDt;
            const maxAcceptV = this.currentVelocity > 0.05 ? 1.5 : 0.4;
            if (frameV > 0.05 && frameV < maxAcceptV) {
              sumV += frameV;
              countV++;
            }
          }
        } else {
          const isNearTop = run.topY <= lane.sampleYTop + 40;
          const isTallEnough = run.bottomY - run.topY > 15;

          if (isNearTop || isTallEnough) {
            newTracked.push({
              midi: lane.midi,
              strikeY: lane.strikeY,
              missedFrames: 0,
              observations: [
                {
                  t: nowMs,
                  topY: run.topY,
                  bottomY: run.bottomY,
                  clampedTop: run.clampedTop,
                  clampedBottom: run.clampedBottom,
                },
              ],
              matchedThisFrame: true,
            });
          }
        }
      }
    }

    if (countV > 0) {
      const frameVel = sumV / countV;
      this.currentVelocity =
        this.currentVelocity === 0
          ? frameVel
          : this.currentVelocity * 0.8 + frameVel * 0.2;
    }

    const lanePixelHeight = lanes[0]
      ? lanes[0].strikeY - lanes[0].sampleYTop
      : 370;
    const maxBarLifetimeMs = (lanePixelHeight / expectedV) * 1.3;

    for (const tr of this.trackedRuns) {
      const firstObs = tr.observations[0];
      const trackAgeMs = nowMs - firstObs.t;

      if (trackAgeMs > maxBarLifetimeMs) {
        this.finalizeTrackedRun(tr);
        continue;
      }

      if (!tr.matchedThisFrame) {
        tr.missedFrames = (tr.missedFrames || 0) + 1;
        if (tr.missedFrames > 4) {
          this.finalizeTrackedRun(tr);
        } else {
          newTracked.push(tr);
        }
      } else {
        tr.missedFrames = 0;
        newTracked.push(tr);
      }
    }

    this.trackedRuns = newTracked;
  }

  finalizeTrackedRun(tr) {
    if (tr.observations.length < 4) return;

    const firstObs = tr.observations[0];
    const lastObs = tr.observations[tr.observations.length - 1];

    if (lastObs.bottomY - firstObs.bottomY < 10) return;

    const v =
      this.currentVelocity > 0.05 && this.currentVelocity < 1.5
        ? this.currentVelocity
        : 0.15;

    let sumStart = 0,
      countStart = 0;
    let sumEnd = 0,
      countEnd = 0;
    let clampedTopCount = 0;

    for (const obs of tr.observations) {
      if (obs.clampedTop) clampedTopCount++;
      if (!obs.clampedBottom) {
        sumStart += obs.t + (tr.strikeY - obs.bottomY) / v;
        countStart++;
      }
      if (!obs.clampedTop) {
        sumEnd += obs.t + (tr.strikeY - obs.topY) / v;
        countEnd++;
      }
    }

    if (countStart === 0) {
      sumStart = lastObs.t + (tr.strikeY - lastObs.bottomY) / v;
      countStart = 1;
    }
    if (countEnd === 0) {
      sumEnd = lastObs.t + (tr.strikeY - lastObs.topY) / v;
      countEnd = 1;
    }

    const predictedStartMs = sumStart / countStart;
    const predictedEndMs = sumEnd / countEnd;

    // Sanity cap: can't hit more than 4s after last observation
    const maxReasonableHit = lastObs.t + 4000;
    const cappedStartMs = Math.min(predictedStartMs, maxReasonableHit);
    const cappedEndMs = Math.min(predictedEndMs, maxReasonableHit);

    const clampedTopRatio = clampedTopCount / tr.observations.length;
    const endReliable = clampedTopRatio < 0.6 && countEnd >= 3;

    this.finishedTrackedRuns.push({
      midi: tr.midi,
      startMs: cappedStartMs,
      endMs: cappedEndMs,
      durationMs: cappedEndMs - cappedStartMs,
      observations: tr.observations,
      v: v,
      strikeY: tr.strikeY,
      endReliable,
      clampedTopRatio,
    });
  }

  analyzeLaneOnCapturedFrame(lane, frame) {
    const insetPx = Math.max(
      2,
      Math.min(4, Math.round((lane.laneWidth || 8) / 4))
    );
    const leftLocalX = lane.sampleX - lane.laneWidth / 2 + insetPx;
    const rightLocalX = lane.sampleX + lane.laneWidth / 2 - insetPx;

    const verticalInset = 2;
    const localTop = lane.sampleYTop + verticalInset;
    const localBottom = lane.sampleYBottom - verticalInset;

    const left = this.scanLaneColumnForInspection(
      lane,
      leftLocalX,
      localTop,
      localBottom,
      frame
    );
    const right = this.scanLaneColumnForInspection(
      lane,
      rightLocalX,
      localTop,
      localBottom,
      frame
    );
    const sharedRuns = this.buildSharedRunsFromColumns(
      left,
      right,
      localTop,
      localBottom
    );

    return {
      midi: lane.midi,
      isBlack: lane.isBlack,
      insetPx,
      laneWidth: lane.laneWidth,
      sampleYTop: lane.sampleYTop,
      sampleYBottom: lane.sampleYBottom,
      strikeY: lane.strikeY,
      left,
      right,
      sharedRuns,
      frameWidth: frame.width,
      frameHeight: frame.height,
      scaleX: frame.scaleX,
      scaleY: frame.scaleY,
    };
  }

  scanLaneColumnForInspection(lane, localX, localTop, localBottom, frame) {
    if (!this.app.pianoSvg) return { runs: [], samples: [] };

    const svgRect = this.app.pianoSvg.getBoundingClientRect();
    const videoX = Math.round((svgRect.left + localX) * frame.scaleX);
    const videoYTop = Math.round((svgRect.top + localTop) * frame.scaleY);
    const videoYBottom = Math.round((svgRect.top + localBottom) * frame.scaleY);
    const colHeight = videoYBottom - videoYTop;

    if (colHeight <= 0) return { runs: [], samples: [] };
    if (videoX < 0 || videoYTop < 0) return { runs: [], samples: [] };
    if (videoX >= frame.width || videoYBottom > frame.height) {
      return { runs: [], samples: [] };
    }

    const samples = new Array(colHeight);

    if (frame.fullFrameData && frame.width > 0 && frame.height > 0) {
      for (let i = 0; i < colHeight; i++) {
        const y = videoYTop + i;
        const pxIndex = (y * frame.width + videoX) * 4;
        const r = frame.fullFrameData[pxIndex];
        const g = frame.fullFrameData[pxIndex + 1];
        const b = frame.fullFrameData[pxIndex + 2];

        samples[i] = {
          row: i,
          localY: localTop + (i / (colHeight - 1)) * (localBottom - localTop),
          videoY: y,
          rgb: [r, g, b],
          cls: this.classifyPixel(r, g, b, lane.isBlack),
        };
      }
    } else {
      let imageData;
      try {
        imageData = frame.ctx.getImageData(videoX, videoYTop, 1, colHeight);
      } catch (e) {
        return { runs: [], samples: [] };
      }
      const data = imageData.data;

      for (let i = 0; i < colHeight; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        samples[i] = {
          row: i,
          localY: localTop + (i / (colHeight - 1)) * (localBottom - localTop),
          videoY: videoYTop + i,
          rgb: [r, g, b],
          cls: this.classifyPixel(r, g, b, lane.isBlack),
        };
      }
    }

    const runs = [];
    let currentRun = null;
    let gapCount = 0;

    for (let i = colHeight - 1; i >= 0; i--) {
      const smp = samples[i];
      if (smp.cls === 'UNKNOWN') continue;

      if (smp.cls === 'NOTE') {
        if (!currentRun) {
          currentRun = {
            startRow: i,
            bottomY: smp.localY,
            clampedBottom: i === colHeight - 1,
          };
        } else if (gapCount > 0) {
          gapCount = 0;
        }
      } else if (smp.cls === 'BG') {
        if (currentRun) {
          gapCount++;
          if (gapCount > this.gapTolerancePx) {
            const endRow = i + gapCount;
            const t = colHeight <= 1 ? 0 : endRow / (colHeight - 1);
            const endY = localTop + t * (localBottom - localTop);
            currentRun.endRow = endRow;
            currentRun.topY = endY;
            currentRun.clampedTop = false;
            runs.push(this.formatInspectionRun(currentRun, colHeight));
            currentRun = null;
            gapCount = 0;
          }
        }
      }
    }

    if (currentRun) {
      currentRun.endRow = 0;
      currentRun.topY = localTop;
      currentRun.clampedTop = true;
      runs.push(this.formatInspectionRun(currentRun, colHeight));
    }

    return {
      localX,
      videoX,
      localTop,
      localBottom,
      videoTop: videoYTop,
      videoBottom: videoYBottom,
      runs,
      samples,
    };
  }

  formatInspectionRun(run, colHeight) {
    return {
      startRow: run.startRow,
      endRow: run.endRow,
      topY: run.topY,
      bottomY: run.bottomY,
      startY: run.bottomY,
      stopY: run.topY,
      heightPx: run.startRow - run.endRow + 1,
      clampedTop: run.clampedTop,
      clampedBottom: run.clampedBottom,
      strongRows: run.strongRows || 0,
      weakRows: run.weakRows || 0,
      unknownRows: run.unknownRows || 0,
    };
  }

  intersectInspectionRuns(leftRuns, rightRuns) {
    const overlaps = [];
    for (const left of leftRuns) {
      for (const right of rightRuns) {
        const topY = Math.max(left.topY, right.topY);
        const bottomY = Math.min(left.bottomY, right.bottomY);
        if (bottomY >= topY) {
          overlaps.push({
            topY,
            bottomY,
            startY: bottomY,
            stopY: topY,
            leftHeightPx: left.heightPx,
            rightHeightPx: right.heightPx,
            clampedTop: left.clampedTop || right.clampedTop,
            clampedBottom: left.clampedBottom || right.clampedBottom,
          });
        }
      }
    }
    return overlaps;
  }

  formatLaneInspectionReport(result) {
    const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : 'NaN');
    const noteName = this.app.midiToNoteName(result.midi);

    const lines = [];
    lines.push(`=== LANE INSPECTOR FOR ${noteName} (MIDI ${result.midi}) ===`);

    if (result.sharedRuns.length) {
      lines.push('\n*** CONFIRMED RUNS (Row-wise shared analysis) ***');
      result.sharedRuns.forEach((run) => {
        lines.push(
          `  -> Y: ${fmt(run.stopY)} (top) to ${fmt(
            run.startY
          )} (bottom) | strong=${run.strongRows} weak=${run.weakRows} unknown=${
            run.unknownRows
          }`
        );
      });
    } else {
      lines.push('\n*** NO CONFIRMED RUNS ***');
    }

    lines.push('\n--- LEFT EDGE DETECTIONS ---');
    if (!result.left.runs.length) lines.push('  none');
    result.left.runs.forEach((run) => {
      lines.push(
        `  Y: ${fmt(run.stopY)} to ${fmt(run.startY)}  ${
          run.clampedTop ? '(Top Clamp) ' : ''
        }${run.clampedBottom ? '(Bottom Clamp)' : ''}`
      );
    });

    lines.push('\n--- RIGHT EDGE DETECTIONS ---');
    if (!result.right.runs.length) lines.push('  none');
    result.right.runs.forEach((run) => {
      lines.push(
        `  Y: ${fmt(run.stopY)} to ${fmt(run.startY)}  ${
          run.clampedTop ? '(Top Clamp) ' : ''
        }${run.clampedBottom ? '(Bottom Clamp)' : ''}`
      );
    });

    lines.push('\n--- DEBUG INFO ---');
    lines.push(
      `Color Tol: ${this.app.colorTolerance || 45}, Inset: ${
        result.insetPx
      }px, Width: ${fmt(result.laneWidth)}px`
    );
    lines.push(
      `Overlay Y Range: ${fmt(result.sampleYTop)} (top) to ${fmt(
        result.sampleYBottom
      )} (bottom), Strike: ${fmt(result.strikeY)}`
    );

    return lines.join('\n');
  }

  constructor(app) {
    this.app = app;
    this.trackedRuns = [];
    this.finishedTrackedRuns = [];
    this.fallingSampleLog = [];
    this.laneDebugLogs = new Map();
    this.laneSampleCounts = new Map();
    this.currentVelocity = 0;
  }

  classifySharedRow(leftCls, rightCls, isInsideRun) {
    const noteVotes =
      (leftCls === 'NOTE' ? 1 : 0) + (rightCls === 'NOTE' ? 1 : 0);
    const bgVotes = (leftCls === 'BG' ? 1 : 0) + (rightCls === 'BG' ? 1 : 0);
    const unknownVotes =
      (leftCls === 'UNKNOWN' ? 1 : 0) + (rightCls === 'UNKNOWN' ? 1 : 0);

    if (noteVotes === 2) return 'NOTE';
    if (noteVotes === 1 && unknownVotes === 1) return 'NOTE';

    if (isInsideRun) {
      if (noteVotes === 1 && bgVotes === 1) return 'NOTE';
      if (unknownVotes === 2) return 'SOFT_GAP';
      if (bgVotes === 1 && unknownVotes === 1) return 'SOFT_GAP';
    }

    if (bgVotes === 2) return 'BG';
    if (bgVotes === 1 && unknownVotes === 1) return 'BG';

    return 'UNKNOWN';
  }

  buildSharedRunsFromColumns(left, right, localTop, localBottom) {
    const leftSamples = left && left.samples ? left.samples : [];
    const rightSamples = right && right.samples ? right.samples : [];
    const rowCount = Math.min(leftSamples.length, rightSamples.length);

    if (rowCount <= 0) return [];

    const runs = [];
    let currentRun = null;
    let hardGapCount = 0;
    let softGapCount = 0;

    for (let i = rowCount - 1; i >= 0; i--) {
      const leftCls = leftSamples[i] ? leftSamples[i].cls : 'UNKNOWN';
      const rightCls = rightSamples[i] ? rightSamples[i].cls : 'UNKNOWN';
      const rowType = this.classifySharedRow(leftCls, rightCls, !!currentRun);

      if (rowType === 'NOTE') {
        if (!currentRun) {
          const sample = leftSamples[i] || rightSamples[i];
          currentRun = {
            startRow: i,
            bottomY: sample ? sample.localY : localBottom,
            clampedBottom: i === rowCount - 1,
            strongRows: 0,
            weakRows: 0,
            unknownRows: 0,
          };
        }

        if (leftCls === 'NOTE' && rightCls === 'NOTE') {
          currentRun.strongRows++;
        } else {
          currentRun.weakRows++;
        }

        hardGapCount = 0;
        softGapCount = 0;
        continue;
      }

      if (rowType === 'SOFT_GAP') {
        if (currentRun) {
          currentRun.unknownRows++;
          softGapCount++;
        }
        continue;
      }

      if (rowType === 'BG') {
        if (currentRun) {
          hardGapCount++;
          // Same logic as above: Bridge over Note Text labels drawn on the falling bars
          if (hardGapCount > this.gapTolerancePx) {
            const endRow = i + hardGapCount;
            const t = rowCount <= 1 ? 0 : endRow / (rowCount - 1);
            const endY = localTop + t * (localBottom - localTop);
            currentRun.endRow = endRow;
            currentRun.topY = endY;
            currentRun.clampedTop = false;
            runs.push(this.formatInspectionRun(currentRun, rowCount));
            currentRun = null;
            hardGapCount = 0;
            softGapCount = 0;
          }
        }
        continue;
      }
    }

    if (currentRun) {
      currentRun.endRow = 0;
      currentRun.topY = localTop;
      currentRun.clampedTop = true;
      runs.push(this.formatInspectionRun(currentRun, rowCount));
    }

    return runs;
  }

  get gapTolerancePx() {
    // OVERRIDE: The visual gap bridge is obsolete due to the new mathematical stitcher.
    // Force it to 2px so distinct rapid notes are never physically merged by the tracker.
    return 2;
  }

  isPianoKeyLit(r, g, b, isBlack) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    // User's exact formula: max difference between any two channels, normalized
    const sat = (max - min) / 255.0;

    const minSat =
      this.app.minNoteSaturation !== undefined
        ? this.app.minNoteSaturation
        : 0.05;

    // Strictly threshold-based. No fallback to color calibration.
    return sat >= minSat;
  }

  alignNotesForMidi(midi, kbNotes) {
    const notes = Array.isArray(kbNotes)
      ? [...kbNotes].sort((a, b) => a.kbStartMs - b.kbStartMs)
      : [];

    const trackedBlocks = this.finishedTrackedRuns
      .filter((r) => r.midi === midi)
      .sort((a, b) => a.startMs - b.startMs);

    const arrivalClusters = this.buildArrivalClustersForMidi(midi, notes);
    const anchorChoice = this.chooseAnchorTimeForFirstNote(
      midi,
      notes,
      arrivalClusters
    );

    const anchorOffsetMs =
      notes.length && anchorChoice
        ? notes[0].kbStartMs - anchorChoice.timeMs
        : 0;

    const correctedEvents = arrivalClusters.map((cluster, index) => ({
      index,
      midi,
      rawHitMs: cluster.predictedHitMs,
      hitMs: cluster.predictedHitMs + anchorOffsetMs,
      sampleCount: cluster.sampleCount,
      unclampedCount: cluster.unclampedCount,
      nonBottomClampedCount: cluster.nonBottomClampedCount,
      totalWeight: cluster.totalWeight,
      cluster,
    }));

    const correctedBlocks = trackedBlocks.map((block, index) => ({
      index,
      ...block,
      correctedStartMs: block.startMs + anchorOffsetMs,
      correctedEndMs: block.endMs + anchorOffsetMs,
    }));

    const usedEventIndexes = new Set();
    const usedBlockIndexes = new Set();
    const results = [];

    const findNearbyBlocks = (targetStartMs, kbDurMs) => {
      const out = [];

      for (const block of correctedBlocks) {
        if (usedBlockIndexes.has(block.index)) continue;

        const dt = Math.abs(block.correctedStartMs - targetStartMs);
        if (dt > 140) continue;

        const blockDur = Math.max(
          1,
          block.correctedEndMs - block.correctedStartMs
        );
        const durRatio =
          Math.max(blockDur, kbDurMs) /
          Math.max(1, Math.min(blockDur, kbDurMs));

        out.push({
          block,
          score:
            dt +
            Math.max(0, durRatio - 1.5) * 60 -
            (block.endReliable ? 18 : 0) -
            Math.min(20, block.observations.length * 1.2),
        });
      }

      out.sort((a, b) => a.score - b.score);
      return out;
    };

    const findDirectRefinementBlock = (kbStartMs, kbDurMs) => {
      const candidates = [];

      for (const block of correctedBlocks) {
        if (usedBlockIndexes.has(block.index)) continue;

        const delta = block.correctedStartMs - kbStartMs;
        const absDelta = Math.abs(delta);
        const obsCount = (block.observations || []).length;
        const strong = obsCount >= 22 || (obsCount >= 14 && block.endReliable);

        const maxAllowed = kbDurMs <= 230 ? 22 : 26;

        if (!strong) continue;
        if (absDelta > maxAllowed) continue;

        const blockDur = Math.max(
          1,
          block.correctedEndMs - block.correctedStartMs
        );
        const durRatio =
          Math.max(blockDur, kbDurMs) /
          Math.max(1, Math.min(blockDur, kbDurMs));

        candidates.push({
          block,
          delta,
          score:
            absDelta +
            Math.max(0, durRatio - 1.45) * 35 -
            (block.endReliable ? 8 : 0) -
            Math.min(10, obsCount * 0.25),
        });
      }

      candidates.sort((a, b) => a.score - b.score);
      return candidates.length ? candidates[0].block : null;
    };

    const hasStrongSupportForShift = (ev, kbStartMs, kbDurMs) => {
      if (!ev) return false;

      const delta = ev.hitMs - kbStartMs;
      const absDelta = Math.abs(delta);

      if (absDelta <= 18) return true;

      const nearbyBlocks = correctedBlocks.filter((block) => {
        const dt = Math.abs(block.correctedStartMs - ev.hitMs);
        return dt <= 45;
      });

      const bestBlock = nearbyBlocks.sort((a, b) => {
        const ad = Math.abs(a.correctedStartMs - ev.hitMs);
        const bd = Math.abs(b.correctedStartMs - ev.hitMs);
        return ad - bd;
      })[0];

      const strongEvent =
        ev.sampleCount >= 28 &&
        ev.unclampedCount >= 20 &&
        ev.nonBottomClampedCount >= 24;

      const strongBlock =
        !!bestBlock &&
        bestBlock.observations &&
        bestBlock.observations.length >= 20;

      if (kbDurMs <= 230) {
        return absDelta <= 28 && (strongEvent || strongBlock);
      }

      return absDelta <= 36 && (strongEvent || strongBlock);
    };

    for (let i = 0; i < notes.length; i++) {
      const kbNote = notes[i];
      const kbDurMs = kbNote.kbEndMs - kbNote.kbStartMs;
      const prevKbStart =
        i > 0 ? notes[i - 1].kbStartMs : Number.NEGATIVE_INFINITY;
      const nextKbStart =
        i + 1 < notes.length
          ? notes[i + 1].kbStartMs
          : Number.POSITIVE_INFINITY;

      const prevGap = Number.isFinite(prevKbStart)
        ? kbNote.kbStartMs - prevKbStart
        : Infinity;
      const nextGap = Number.isFinite(nextKbStart)
        ? nextKbStart - kbNote.kbStartMs
        : Infinity;
      const localGap = Math.min(prevGap, nextGap);

      const earlyToleranceMs =
        i === 0 ? 0 : Math.max(35, Math.min(140, Math.floor(localGap * 0.42)));

      const lateToleranceMs =
        i === 0
          ? 0
          : kbDurMs <= 240
          ? Math.max(14, Math.min(40, Math.floor(localGap * 0.1)))
          : Math.max(18, Math.min(55, Math.floor(localGap * 0.14)));

      let matchedEvent = null;
      let refinedStartMs = kbNote.kbStartMs;
      let refinedDurationMs = kbDurMs;

      if (i === 0) {
        if (anchorChoice) {
          matchedEvent = {
            index: -1,
            hitMs: kbNote.kbStartMs,
            rawHitMs: anchorChoice.timeMs,
            cluster:
              anchorChoice.source === 'cluster' ? anchorChoice.ref : null,
            sampleCount:
              anchorChoice.source === 'cluster'
                ? anchorChoice.ref.sampleCount
                : 0,
            unclampedCount:
              anchorChoice.source === 'cluster'
                ? anchorChoice.ref.unclampedCount
                : 0,
            nonBottomClampedCount:
              anchorChoice.source === 'cluster'
                ? anchorChoice.ref.nonBottomClampedCount
                : 0,
            totalWeight:
              anchorChoice.source === 'cluster'
                ? anchorChoice.ref.totalWeight
                : 0,
            anchorSource: anchorChoice.source,
          };
        }
      } else {
        let best = null;
        let bestScore = Infinity;

        for (const ev of correctedEvents) {
          if (usedEventIndexes.has(ev.index)) continue;

          const delta = ev.hitMs - kbNote.kbStartMs;

          if (delta < -earlyToleranceMs) continue;
          if (delta > lateToleranceMs) continue;

          const score =
            Math.abs(delta) +
            (delta > 0 ? delta * 1.6 : 0) -
            Math.min(10, ev.unclampedCount * 0.15) -
            Math.min(6, ev.sampleCount * 0.05);

          if (score < bestScore) {
            bestScore = score;
            best = ev;
          }
        }

        if (best && hasStrongSupportForShift(best, kbNote.kbStartMs, kbDurMs)) {
          matchedEvent = best;
          usedEventIndexes.add(best.index);
          refinedStartMs = best.hitMs;
        } else {
          const directBlock = findDirectRefinementBlock(
            kbNote.kbStartMs,
            kbDurMs
          );
          if (directBlock) {
            refinedStartMs = directBlock.correctedStartMs;
          }
        }
      }

      const matchedBlocks = [];
      const blockCandidates = findNearbyBlocks(refinedStartMs, kbDurMs);
      const maxBlocksToTake = kbDurMs >= 260 ? 2 : 1;

      for (const item of blockCandidates.slice(0, maxBlocksToTake)) {
        usedBlockIndexes.add(item.block.index);
        matchedBlocks.push(item.block);
      }

      matchedBlocks.sort((a, b) => a.correctedStartMs - b.correctedStartMs);

      if (matchedBlocks.length > 0) {
        const bestBlockStart = matchedBlocks[0].correctedStartMs;
        const blockDelta = Math.abs(bestBlockStart - kbNote.kbStartMs);
        const refinedDelta = Math.abs(refinedStartMs - kbNote.kbStartMs);

        if (
          blockDelta <= 20 &&
          blockDelta + 6 < refinedDelta &&
          (matchedBlocks[0].observations || []).length >= 12
        ) {
          refinedStartMs = bestBlockStart;
        }

        const reliableEndBlocks = matchedBlocks.filter((b) => b.endReliable);
        if (reliableEndBlocks.length > 0) {
          const lastReliable = reliableEndBlocks[reliableEndBlocks.length - 1];
          refinedDurationMs = Math.max(
            1,
            lastReliable.correctedEndMs - refinedStartMs
          );
        } else {
          const lastBlock = matchedBlocks[matchedBlocks.length - 1];
          refinedDurationMs = Math.max(
            1,
            Math.max(kbNote.kbEndMs, lastBlock.correctedEndMs) - refinedStartMs
          );
        }
      }

      results.push({
        midi: kbNote.midi,
        kbStartMs: kbNote.kbStartMs,
        kbEndMs: kbNote.kbEndMs,
        kbDurMs,
        refinedStartMs,
        refinedDurationMs,
        matchedBlocks,
        ignoredBlocks: [],
        matchedArrivalCluster: matchedEvent,
        alignmentOffsetMs: anchorOffsetMs,
        firstNoteAnchor: i === 0,
        earlyToleranceMs,
        lateToleranceMs,
      });
    }

    for (const ev of correctedEvents) {
      if (usedEventIndexes.has(ev.index)) continue;

      let nearest = null;
      let bestD = Infinity;
      for (const res of results) {
        const d = Math.abs(ev.hitMs - res.refinedStartMs);
        if (d < bestD) {
          bestD = d;
          nearest = res;
        }
      }

      if (nearest) nearest.ignoredBlocks.push(ev);
    }

    return results;
  }

  dumpMidiDiagnostic(midi) {
    const noteName = this.app.midiToNoteName(midi);
    const lines = [];
    lines.push(`=== MIDI ${midi} (${noteName}) DIAGNOSTIC DUMP ===\n`);

    const samples = (this.fallingSampleLog || []).filter(
      (s) => s.midi === midi
    );
    lines.push(`--- RAW FALLING-BAR SAMPLES (${samples.length} total) ---`);
    for (const s of samples) {
      const h = s.bottom - s.top;
      const dist = s.strike - s.bottom;
      lines.push(
        `  t=${(s.t / 1000).toFixed(3)}s  top=${s.top}  bot=${
          s.bottom
        }  h=${h}  dist=${dist}  ` +
          `CT=${s.clampedTop ? 'Y' : 'N'} CB=${s.clampedBottom ? 'Y' : 'N'}`
      );
    }

    const kbNotes = (this.app.pianoScraper.recordedNotes || []).filter(
      (n) => n.midi === midi
    );
    const clusters = this.buildArrivalClustersForMidi(midi, kbNotes);
    const calibration = this.buildStrikeCalibrationSummary(
      midi,
      kbNotes,
      clusters
    );

    lines.push(`\n--- ARRIVAL CLUSTERS (${clusters.length} total) ---`);
    for (const c of clusters) {
      lines.push(
        `  hit=${c.predictedHitMs.toFixed(1)}ms  samples=${
          c.sampleCount
        }  weight=${c.totalWeight.toFixed(2)}  unclamped=${
          c.unclampedCount
        }  nonBottom=${
          c.nonBottomClampedCount
        }  estHeight=${c.estimatedHeight.toFixed(1)}`
      );
    }

    lines.push(`\n--- STRIKE CALIBRATION ---`);
    lines.push(
      `  velocity=${calibration.velocityPxPerMs.toFixed(
        5
      )} px/ms  msPerPixel=${calibration.msPerPixel.toFixed(3)}`
    );
    lines.push(
      `  anchorOffset=${calibration.anchorOffsetMs.toFixed(
        1
      )}ms  firstKbStart=${
        calibration.firstKbStartMs == null
          ? 'n/a'
          : calibration.firstKbStartMs + 'ms'
      }  anchorCluster=${
        calibration.anchorCluster
          ? calibration.anchorCluster.predictedHitMs.toFixed(1) + 'ms'
          : 'none'
      }`
    );
    lines.push(
      `  strikeY=${
        Number.isFinite(calibration.strikeY)
          ? calibration.strikeY.toFixed(1)
          : 'n/a'
      }  topY=${
        Number.isFinite(calibration.topY) ? calibration.topY.toFixed(1) : 'n/a'
      }  bottomY=${
        Number.isFinite(calibration.bottomY)
          ? calibration.bottomY.toFixed(1)
          : 'n/a'
      }`
    );
    lines.push(
      `  lead(topY)=${
        Number.isFinite(calibration.topLeadMs)
          ? calibration.topLeadMs.toFixed(1) + 'ms'
          : 'n/a'
      }  lead(bottomY)=${
        Number.isFinite(calibration.bottomLeadMs)
          ? calibration.bottomLeadMs.toFixed(1) + 'ms'
          : 'n/a'
      }`
    );

    const blocks = (this.finishedTrackedRuns || []).filter(
      (r) => r.midi === midi
    );
    lines.push(`\n--- FINISHED TRACKED RUNS (${blocks.length} total) ---`);
    lines.push(`  Global velocity: ${this.currentVelocity.toFixed(4)} px/ms`);
    for (const b of blocks) {
      lines.push(
        `  predictedStart=${b.startMs.toFixed(
          1
        )}ms  predictedEnd=${b.endMs.toFixed(1)}ms  ` +
          `dur=${b.durationMs.toFixed(1)}ms  obs=${
            b.observations.length
          }  v=${b.v.toFixed(4)}`
      );
    }

    lines.push(`\n--- KEYBOARD NOTES (${kbNotes.length} total) ---`);
    for (const n of kbNotes) {
      lines.push(
        `  kbStart=${n.kbStartMs}ms  kbEnd=${n.kbEndMs}ms  kbDur=${
          n.kbEndMs - n.kbStartMs
        }ms`
      );
    }

    if (kbNotes.length > 0) {
      lines.push(`\n--- ALIGNMENT PREVIEW ---`);
      const aligned = this.alignNotesForMidi(midi, kbNotes);

      for (const r of aligned) {
        const delta = (r.refinedStartMs - r.kbStartMs).toFixed(1);

        let clusterLabel = 'none';
        if (r.matchedArrivalCluster) {
          const mac = r.matchedArrivalCluster;
          const clusterMs =
            mac.correctedHitMs ??
            mac.hitMs ??
            mac.predictedHitMs ??
            mac.rawHitMs;

          clusterLabel = Number.isFinite(clusterMs)
            ? `${clusterMs.toFixed(1)}ms`
            : 'present';
        }

        lines.push(
          `  kbStart=${r.kbStartMs}ms → refined=${r.refinedStartMs.toFixed(
            1
          )}ms  delta=${delta}ms  blocks=${r.matchedBlocks.length}  ignored=${
            r.ignoredBlocks.length
          }  cluster=${clusterLabel}  anchor=${r.firstNoteAnchor ? 'Y' : 'N'}`
        );
      }
    }

    return lines.join('\n');
  }

  buildArrivalClustersForMidi(midi, kbNotes = []) {
    const v =
      this.currentVelocity > 0.05 && this.currentVelocity < 1.5
        ? this.currentVelocity
        : 0.15;

    const rawSamples = (this.fallingSampleLog || [])
      .filter((s) => s.midi === midi)
      .map((s) => {
        const hitMs = s.t + (s.strike - s.bottom) / v;
        const height = Math.max(0, s.bottom - s.top);
        const unclampedScore =
          (s.clampedTop ? 0 : 1) +
          (s.clampedBottom ? 0 : 1) +
          Math.min(1.5, height / 40);

        return {
          midi,
          sampleTimeMs: s.t,
          predictedHitMs: hitMs,
          top: s.top,
          bottom: s.bottom,
          height,
          strike: s.strike,
          clampedTop: !!s.clampedTop,
          clampedBottom: !!s.clampedBottom,
          weight: unclampedScore,
        };
      })
      .filter((s) => Number.isFinite(s.predictedHitMs))
      .sort((a, b) => a.predictedHitMs - b.predictedHitMs);

    if (!rawSamples.length) return [];

    const kbMedianGap = (() => {
      if (!Array.isArray(kbNotes) || kbNotes.length < 2) return 140;
      const gaps = [];
      for (let i = 1; i < kbNotes.length; i++) {
        const g = kbNotes[i].kbStartMs - kbNotes[i - 1].kbStartMs;
        if (g > 0) gaps.push(g);
      }
      if (!gaps.length) return 140;
      gaps.sort((a, b) => a - b);
      return gaps[Math.floor(gaps.length / 2)];
    })();

    const clusterWindowMs = Math.max(28, Math.min(95, kbMedianGap * 0.45));
    const minClusterWeight = 2.2;

    const clusters = [];
    let current = null;

    const percentile = (values, p) => {
      const nums = values
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
      if (!nums.length) return null;
      const idx = Math.max(
        0,
        Math.min(nums.length - 1, Math.floor((nums.length - 1) * p))
      );
      return nums[idx];
    };

    const finalizeCurrent = () => {
      if (!current) return;

      const strongVotes = current.samples.filter(
        (s) => !s.clampedTop && !s.clampedBottom
      );
      const mediumVotes = current.samples.filter((s) => !s.clampedBottom);

      const votes =
        strongVotes.length >= 3
          ? strongVotes
          : mediumVotes.length >= 3
          ? mediumVotes
          : current.samples;

      const voteTimes = votes.map((s) => s.predictedHitMs);
      const onsetHitMs = percentile(voteTimes, 0.18);
      const centerHitMs = percentile(voteTimes, 0.5);

      const minTop = Math.min(...current.samples.map((s) => s.top));
      const maxBottom = Math.max(...current.samples.map((s) => s.bottom));
      const totalWeight = current.samples.reduce((a, s) => a + s.weight, 0);
      const unclampedCount = current.samples.filter(
        (s) => !s.clampedTop && !s.clampedBottom
      ).length;
      const nonBottomClampedCount = current.samples.filter(
        (s) => !s.clampedBottom
      ).length;

      if (totalWeight >= minClusterWeight && current.samples.length >= 2) {
        clusters.push({
          midi,
          predictedHitMs: onsetHitMs ?? centerHitMs,
          onsetHitMs: onsetHitMs ?? centerHitMs,
          centerHitMs: centerHitMs ?? onsetHitMs,
          startMs: onsetHitMs ?? centerHitMs,
          endMs: onsetHitMs ?? centerHitMs,
          durationMs: 0,
          minTop,
          maxBottom,
          estimatedHeight: Math.max(0, maxBottom - minTop),
          sampleCount: current.samples.length,
          totalWeight,
          unclampedCount,
          nonBottomClampedCount,
          samples: current.samples.slice(),
        });
      }

      current = null;
    };

    for (const sample of rawSamples) {
      if (!current) {
        current = {
          anchorMs: sample.predictedHitMs,
          samples: [sample],
        };
        continue;
      }

      const prev = current.samples[current.samples.length - 1];
      const closeToCluster =
        Math.abs(sample.predictedHitMs - current.anchorMs) <= clusterWindowMs;
      const closeToPrev =
        Math.abs(sample.predictedHitMs - prev.predictedHitMs) <=
        clusterWindowMs;

      if (closeToCluster || closeToPrev) {
        current.samples.push(sample);
        const recent = current.samples.slice(-8);
        current.anchorMs =
          recent.reduce((a, s) => a + s.predictedHitMs, 0) / recent.length;
      } else {
        finalizeCurrent();
        current = {
          anchorMs: sample.predictedHitMs,
          samples: [sample],
        };
      }
    }

    finalizeCurrent();

    const merged = [];
    const mergeWindowMs = Math.max(22, Math.min(70, clusterWindowMs * 0.75));

    for (const c of clusters) {
      const last = merged[merged.length - 1];
      if (
        last &&
        Math.abs(c.predictedHitMs - last.predictedHitMs) <= mergeWindowMs
      ) {
        const allSamples = [...last.samples, ...c.samples];
        const strongVotes = allSamples.filter(
          (s) => !s.clampedTop && !s.clampedBottom
        );
        const mediumVotes = allSamples.filter((s) => !s.clampedBottom);
        const votes =
          strongVotes.length >= 3
            ? strongVotes
            : mediumVotes.length >= 3
            ? mediumVotes
            : allSamples;
        const voteTimes = votes.map((s) => s.predictedHitMs);
        const onsetHitMs = percentile(voteTimes, 0.18);
        const centerHitMs = percentile(voteTimes, 0.5);

        last.samples = allSamples;
        last.predictedHitMs = onsetHitMs ?? centerHitMs;
        last.onsetHitMs = onsetHitMs ?? centerHitMs;
        last.centerHitMs = centerHitMs ?? onsetHitMs;
        last.startMs = last.predictedHitMs;
        last.endMs = last.predictedHitMs;
        last.totalWeight += c.totalWeight;
        last.sampleCount += c.sampleCount;
        last.unclampedCount += c.unclampedCount;
        last.nonBottomClampedCount += c.nonBottomClampedCount;
        last.minTop = Math.min(last.minTop, c.minTop);
        last.maxBottom = Math.max(last.maxBottom, c.maxBottom);
        last.estimatedHeight = Math.max(0, last.maxBottom - last.minTop);
      } else {
        merged.push({
          midi: c.midi,
          predictedHitMs: c.predictedHitMs,
          onsetHitMs: c.onsetHitMs,
          centerHitMs: c.centerHitMs,
          startMs: c.predictedHitMs,
          endMs: c.predictedHitMs,
          durationMs: 0,
          minTop: c.minTop,
          maxBottom: c.maxBottom,
          estimatedHeight: c.estimatedHeight,
          sampleCount: c.sampleCount,
          totalWeight: c.totalWeight,
          unclampedCount: c.unclampedCount,
          nonBottomClampedCount: c.nonBottomClampedCount,
          samples: c.samples.slice(),
        });
      }
    }

    return merged.sort((a, b) => a.predictedHitMs - b.predictedHitMs);
  }

  findAnchorClusterForFirstNote(midi, kbNotes, arrivalClusters) {
    const notes = Array.isArray(kbNotes)
      ? [...kbNotes].sort((a, b) => a.kbStartMs - b.kbStartMs)
      : [];
    const clusters = Array.isArray(arrivalClusters)
      ? arrivalClusters
      : this.buildArrivalClustersForMidi(midi, notes);

    if (!notes.length || !clusters.length) return null;

    const firstKb = notes[0];
    let best = null;
    let bestScore = Infinity;

    for (const cluster of clusters) {
      const delta = cluster.predictedHitMs - firstKb.kbStartMs;

      if (delta < -220 || delta > 260) continue;

      const score =
        Math.abs(delta) -
        cluster.unclampedCount * 6 -
        cluster.nonBottomClampedCount * 2 -
        Math.min(20, cluster.sampleCount);

      if (score < bestScore) {
        bestScore = score;
        best = cluster;
      }
    }

    return best;
  }

  buildStrikeCalibrationSummary(midi, kbNotes, arrivalClusters = null) {
    const notes = Array.isArray(kbNotes)
      ? [...kbNotes].sort((a, b) => a.kbStartMs - b.kbStartMs)
      : [];
    const clusters = Array.isArray(arrivalClusters)
      ? arrivalClusters
      : this.buildArrivalClustersForMidi(midi, notes);

    const v =
      this.currentVelocity > 0.05 && this.currentVelocity < 1.5
        ? this.currentVelocity
        : 0.15;

    const msPerPixel = 1 / v;
    const anchorChoice = this.chooseAnchorTimeForFirstNote(
      midi,
      notes,
      clusters
    );
    const firstKb = notes[0] || null;

    let anchorOffsetMs = 0;
    if (anchorChoice && firstKb) {
      anchorOffsetMs = firstKb.kbStartMs - anchorChoice.timeMs;
    }

    const strikeY = (() => {
      const lane = this.app.getLaneGeometryForMidi
        ? this.app.getLaneGeometryForMidi(midi)
        : null;
      if (lane && Number.isFinite(lane.strikeY)) return lane.strikeY;

      const anyBlock = (this.finishedTrackedRuns || []).find(
        (r) => r.midi === midi
      );
      if (anyBlock && Number.isFinite(anyBlock.strikeY))
        return anyBlock.strikeY;

      return null;
    })();

    let topY = null;
    let bottomY = null;

    if (this.app && this.app.getLaneGeometryForMidi) {
      const lane = this.app.getLaneGeometryForMidi(midi);
      if (lane) {
        topY = lane.sampleYTop;
        bottomY = lane.sampleYBottom;
      }
    }

    const correctedHitForY = (y) => {
      if (!Number.isFinite(strikeY) || !Number.isFinite(y)) return null;
      return anchorOffsetMs + (strikeY - y) * msPerPixel;
    };

    return {
      midi,
      velocityPxPerMs: v,
      msPerPixel,
      strikeY,
      topY,
      bottomY,
      topLeadMs: correctedHitForY(topY),
      bottomLeadMs: correctedHitForY(bottomY),
      anchorOffsetMs,
      anchorChoice,
      anchorCluster:
        anchorChoice && anchorChoice.source === 'cluster'
          ? anchorChoice.ref
          : null,
      firstKbStartMs: firstKb ? firstKb.kbStartMs : null,
    };
  }

  chooseAnchorTimeForFirstNote(midi, kbNotes, arrivalClusters = null) {
    const notes = Array.isArray(kbNotes)
      ? [...kbNotes].sort((a, b) => a.kbStartMs - b.kbStartMs)
      : [];

    if (!notes.length) return null;

    const firstKb = notes[0];
    const clusters = Array.isArray(arrivalClusters)
      ? arrivalClusters
      : this.buildArrivalClustersForMidi(midi, notes);

    const blocks = (this.finishedTrackedRuns || [])
      .filter((r) => r.midi === midi)
      .sort((a, b) => a.startMs - b.startMs);

    const candidates = [];

    for (const cluster of clusters) {
      const t = cluster.predictedHitMs;
      const delta = t - firstKb.kbStartMs;
      if (delta < -220 || delta > 260) continue;

      const score =
        Math.abs(delta) -
        Math.min(24, cluster.unclampedCount * 0.4) -
        Math.min(10, cluster.sampleCount * 0.08);

      candidates.push({
        source: 'cluster',
        timeMs: t,
        score,
        delta,
        strength:
          (cluster.unclampedCount || 0) +
          Math.min(12, (cluster.sampleCount || 0) * 0.2),
        ref: cluster,
      });
    }

    for (const block of blocks) {
      const t = block.startMs;
      const delta = t - firstKb.kbStartMs;
      if (delta < -220 || delta > 260) continue;

      const score =
        Math.abs(delta) -
        (block.endReliable ? 12 : 0) -
        Math.min(18, (block.observations || []).length * 0.5);

      candidates.push({
        source: 'block',
        timeMs: t,
        score,
        delta,
        strength:
          (block.endReliable ? 10 : 0) +
          Math.min(20, (block.observations || []).length * 0.6),
        ref: block,
      });
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (Math.abs(a.delta) !== Math.abs(b.delta)) {
        return Math.abs(a.delta) - Math.abs(b.delta);
      }
      return b.strength - a.strength;
    });

    return candidates[0];
  }
}



