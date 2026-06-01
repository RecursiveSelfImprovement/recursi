/**
 * PianoScraper
 *
 * Strictly responsible for observing the static piano keyboard overlay
 * (the keys mapped at the bottom of the video feed).
 *
 * It checks predefined bounding boxes for pixel saturation changes to
 * detect if a key is visually "pressed" or "unpressed".
 *
 * This gives us a raw, somewhat rough timestamp (kbStartMs / kbEndMs)
 * for when notes trigger. The system later pairs these timestamps with
 * the high-fidelity LaneScraper physics data to get the final result.
 */
class PianoScraper {
  constructor(app) {
    this.app = app;
    this.reset();
  }

  reset() {
    this.noteStates = new Map();
    this.recordedNotes = [];
    this.ignoreUntilOff = new Set();
    this.isFirstScrapeFrame = true;
  }

  sampleFrame(fullFrameData, cW, cH, scaleX, scaleY, nowMs) {
    const pianoRect = this.app.pianoBaseSvg.getBoundingClientRect();
    const keys = this.app.graphicPiano.getKeysData();

    for (const key of keys) {
      if (!key.bbox) continue;

      const [bx, by] = key.bbox.position;
      const [bw, bh] = key.bbox.size;

      const svgX = bx + bw / 2;
      const svgY = key.isBlack ? by + bh * 0.55 : by + bh * 0.75;

      const clientX = pianoRect.left + svgX;
      const clientY = pianoRect.top + svgY;

      const videoX = Math.round(clientX * scaleX);
      const videoY = Math.round(clientY * scaleY);

      if (videoX < 0 || videoY < 0 || videoX >= cW || videoY >= cH) continue;

      const pxIndex = (videoY * cW + videoX) * 4;
      const r = fullFrameData[pxIndex];
      const g = fullFrameData[pxIndex + 1];
      const b = fullFrameData[pxIndex + 2];

      const isOn = this.app.laneScraper.isPianoKeyLit(r, g, b, key.isBlack);

      if (this.isFirstScrapeFrame) {
        if (isOn) this.ignoreUntilOff.add(key.midiCode);
        continue;
      }

      if (this.ignoreUntilOff.has(key.midiCode)) {
        if (!isOn) this.ignoreUntilOff.delete(key.midiCode);
        continue;
      }

      const existing = this.noteStates.get(key.midiCode);
      const marker = this.app.sampleMarkersMap
        ? this.app.sampleMarkersMap.get(key.midiCode)
        : null;

      if (isOn && !existing) {
        this.noteStates.set(key.midiCode, { onMs: nowMs });
        if (marker) {
          marker.setAttribute('fill', 'none');
          marker.setAttribute('stroke', '#00ff00');
        }
      } else if (!isOn && existing) {
        const kbDurationMs = nowMs - existing.onMs;
        if (marker) {
          marker.setAttribute('fill', 'none');
          marker.setAttribute('stroke', key.isBlack ? '#ff7373' : '#ff3030');
          marker.setAttribute('stroke-width', '1.5');
        }

        if (kbDurationMs > 40) {
          this.recordedNotes.push({
            midi: key.midiCode,
            kbStartMs: existing.onMs,
            kbEndMs: nowMs,
          });

          if (this.app.setCaptureStatus) {
            const limitStr =
              this.app.maxNotesToScrape > 0 ? this.app.maxNotesToScrape : '∞';
            this.app.setCaptureStatus(
              `Scraping piano... ${this.recordedNotes.length} / ${limitStr} notes recorded.`
            );
          }

          if (
            this.app.maxNotesToScrape > 0 &&
            this.recordedNotes.length >= this.app.maxNotesToScrape
          ) {
            this.app.stopScraping();
            return;
          }
        }
        this.noteStates.delete(key.midiCode);
      }
    }

    if (this.isFirstScrapeFrame) {
      this.isFirstScrapeFrame = false;
    }
  }

  finalize(nowMs) {
    for (const [midi, state] of this.noteStates || []) {
      const kbDurationMs = nowMs - state.onMs;
      if (kbDurationMs > 10) {
        this.recordedNotes.push({
          midi,
          kbStartMs: state.onMs,
          kbEndMs: nowMs,
        });
      }
    }
    this.noteStates.clear();

    this.recordedNotes.sort(
      (a, b) => a.kbStartMs - b.kbStartMs || a.midi - b.midi
    );

    return this.recordedNotes;
  }
}



