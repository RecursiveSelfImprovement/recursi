
class MidiScraper {
  titleElement = null;

  statusDiv = null;

  inputField = null;

  loadButton = null;

  playButton = null;

  pauseButton = null;

  seekBackButton = null;

  seekForwardButton = null;

  positionDisplay = null;

  durationDisplay = null;

  videoDialog = null;

  videoContainer = null;

  playerHost = null;

  ytPlayer = null;

  ytReady = false;

  pendingVideoId = null;

  positionTimer = null;

  init(targetElement) {
    console.log('Initializing YouTube Player App...');

    this.laneScraper = new LaneScraper(this);
    this.pianoScraper = new PianoScraper(this);
    this.exporters = new MidiScraperExporters(this);

    this.ui = new MidiScraperUI(this);
    this.ui.installStyles();

    this.initFallingSampleDefaults();
    this.ui.loadOverlayPrefs();

    if (typeof this.laneScrapingEnabled !== 'boolean') {
      this.laneScrapingEnabled = false;
    }
    this.captureObservedFps = 0;
    this._fpsSamplePrevTime = 0;
    this._fpsSamplePrevFrames = 0;
    this._fpsStatusLastUiUpdate = 0;

    this.ui.buildMainControls(targetElement);
    targetElement.appendChild(this.ui.buildCaptureControls());

    this.loadYouTubeAPI();
    this.updateStatus('Enter a video ID or URL and click Load Video.');
  }

  loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      this.onYouTubeAPIReady();
      return;
    }

    const existing = document.getElementById('youtube-iframe-api');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevCallback === 'function') prevCallback();
      this.onYouTubeAPIReady();
    };
  }

  onYouTubeAPIReady() {
    this.updateStatus('YouTube API ready.');
    if (this.pendingVideoId && this._playerTargetId && !this.ytPlayer) {
      const id = this.pendingVideoId;
      this.pendingVideoId = null;
      this.createPlayer(id);
    }
  }

  onPlayerStateChange(event) {
    const YT = window.YT;
    const states = {
      [-1]: 'unstarted',
      [YT.PlayerState.ENDED]: 'ended',
      [YT.PlayerState.PLAYING]: 'playing',
      [YT.PlayerState.PAUSED]: 'paused',
      [YT.PlayerState.BUFFERING]: 'buffering',
      [YT.PlayerState.CUED]: 'cued',
    };
    const stateEl = document.getElementById('yt-state-value');
    if (stateEl) stateEl.textContent = states[event.data] || 'unknown';

    // Any state change other than plain playing invalidates our prediction
    if (event.data !== YT.PlayerState.PLAYING) {
      this.resetTimeNextTick = true;
    }

    // Keep playback rate in sync
    try {
      if (this.ytPlayer && this.ytPlayer.getPlaybackRate) {
        this.playbackRate = this.ytPlayer.getPlaybackRate() || 1;
      }
    } catch (e) {}

    if (this.ytPlayer && this.durationDisplay) {
      const dur = this.ytPlayer.getDuration();
      const valEl = this.durationDisplay.querySelector('.value');
      if (valEl) valEl.textContent = dur ? `${dur.toFixed(2)}s` : '—';
    }
  }

  startPositionTimer() {
    if (this.positionTimer) clearInterval(this.positionTimer);
    // Reset smoothing state
    this.lastRealTime = 0;
    this.lastSysTime = 0;
    this.smoothingFactor = 8;
    this.playbackRate = this.selectedPlaybackRate || 0.5;
    this.resetTimeNextTick = true;

    this.positionTimer = setInterval(() => {
      if (this.ytReady && this.ytPlayer && this.ytPlayer.getCurrentTime) {
        const t = this.getAccurateTime();
        const dur = this.ytPlayer.getDuration();
        const valEl = this.positionDisplay.querySelector('.value');
        if (valEl) valEl.textContent = `${t.toFixed(3)}s`;

        if (
          this.captureActive &&
          dur > 0 &&
          this.stopOffsetSeconds !== undefined
        ) {
          if (t >= dur - this.stopOffsetSeconds) {
            this.updateStatus(
              `Reached ${this.stopOffsetSeconds}s from end. Stopping.`
            );
            this.stopScraping();
          }
        }
      }
    }, 50);
  }

  parseVideoId(input) {
    if (!input) return null;
    const trimmed = input.trim();
    // Already looks like an ID (11 chars, alphanumeric + _-)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    try {
      const url = new URL(trimmed);
      if (url.hostname.includes('youtu.be')) {
        return url.pathname.slice(1).split('/')[0] || null;
      }
      if (url.hostname.includes('youtube.com')) {
        if (url.searchParams.get('v')) return url.searchParams.get('v');
        // /embed/ID or /shorts/ID
        const parts = url.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex(
          (p) => p === 'embed' || p === 'shorts' || p === 'v'
        );
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      }
    } catch (e) {
      // Not a URL — try to extract an 11-char token
      const match = trimmed.match(/([a-zA-Z0-9_-]{11})/);
      if (match) return match[1];
    }
    return null;
  }

  loadVideoFromInput() {
    const raw = this.inputField.value;
    const id = this.parseVideoId(raw);
    if (!id) {
      this.updateStatus(`Could not parse a video ID from: "${raw}"`);
      return;
    }
    this.updateStatus(`Loading video: ${id}`);
    this.currentLoadedVideoId = id;

    // Save to prefs immediately
    this.overlayPrefs = this.overlayPrefs || {};
    this.overlayPrefs.lastVideoId = id;
    this.saveOverlayPrefs();

    this.ensureDialog();

    if (this.ytReady && this.ytPlayer) {
      this.ytPlayer.loadVideoById(id);
      return;
    }

    this.pendingVideoId = id;
    if (window.YT && window.YT.Player) {
      this.createPlayer(id);
    }
  }

  seekRelative(seconds) {
    if (!this.ytReady || !this.ytPlayer) return;
    const cur = this.ytPlayer.getCurrentTime();
    this.ytPlayer.seekTo(Math.max(0, cur + seconds), true);
    this.resetTimeNextTick = true;
  }

  resizeVideoToFit() {
      if (!this.videoDialog || !this.videoContainer || !this.playerHost) return;
      
      // Read the width and height directly from the dialog content element
      const width = this.videoDialog.contentElement.clientWidth;
      const height = this.videoDialog.contentElement.clientHeight;

      if (width <= 0 || height <= 0) {
        // Retry shortly if the dialog container layout is still warming up
        setTimeout(() => this.resizeVideoToFit(), 50);
        return;
      }

      // Explicitly size the video wrapper container to match the dialog
      this.videoContainer.style.width = `${width}px`;
      this.videoContainer.style.height = `${height}px`;

      const aspect = 16 / 9;
      let w = width;
      let h = w / aspect;
      if (h > height) {
        h = height;
        w = h * aspect;
      }

      this.playerHost.style.width = `${w}px`;
      this.playerHost.style.height = `${h}px`;

      if (this.ytPlayer) {
        if (typeof this.ytPlayer.setSize === 'function') {
          try { 
            this.ytPlayer.setSize(w, h); 
          } catch (e) {}
        }
        try {
          const iframe = this.ytPlayer.getIframe();
          if (iframe) {
            iframe.style.width = w + 'px';
            iframe.style.height = h + 'px';
          }
        } catch (e) {}
      }
    }

  updateStatus(message) {
    if (this.statusDiv) this.statusDiv.textContent = message;
  }

  ensureDialog() {
    if (!this.ui) this.ui = new MidiScraperUI(this);
    this.ui.ensureDialog();
  }

  createPlayer(videoId) {
    if (!this._playerTargetId) return;
    this.ytPlayer = new window.YT.Player(this._playerTargetId, {
      width: '100%',
      height: '100%',
      videoId: videoId,
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          this.ytReady = true;
          this.updateStatus('Player ready.');
          this.resizeVideoToFit();
          this.startPositionTimer();
        },
        onStateChange: (e) => this.onPlayerStateChange(e),
      },
    });
  }

  getAccurateTime() {
    if (!this.ytReady || !this.ytPlayer) return this.lastRealTime || 0;

    let apiTime = 0;
    try {
      apiTime = this.ytPlayer.getCurrentTime() || 0;
    } catch (e) {
      return this.lastRealTime || 0;
    }

    const sysTime = performance.now();
    let realTime;

    if (
      this.resetTimeNextTick ||
      this.lastRealTime === 0 ||
      this.lastSysTime === 0
    ) {
      realTime = apiTime;
      this.resetTimeNextTick = false;
    } else {
      const elapsedSys = (sysTime - this.lastSysTime) / 1000.0;
      if (elapsedSys < -0.5 || elapsedSys > 5.0) {
        realTime = apiTime;
      } else {
        const estimatedTime =
          this.lastRealTime + elapsedSys * this.playbackRate;
        const apiDiff = Math.abs(apiTime - estimatedTime);
        const apiJump = Math.abs(apiTime - this.lastRealTime);
        const tolerance = 0.5;

        if (
          apiDiff > tolerance ||
          (apiJump > tolerance * 1.5 && apiTime > estimatedTime)
        ) {
          realTime = apiTime;
        } else {
          // Weighted average: prediction dominates, API nudges it back to truth
          realTime =
            (estimatedTime * this.smoothingFactor + apiTime) /
            (this.smoothingFactor + 1);
          if (realTime < 0) realTime = 0;
        }
      }
    }

    this.lastSysTime = sysTime;
    this.lastRealTime = realTime;
    return realTime;
  }

  pianoDialog = null;

  pianoSvg = null;

  graphicPiano = null;

  registrationMarks = [];

  redrawPianoOverlay() {
    if (!this.pianoSvg || !this.pianoBaseSvg || !this.graphicPiano) return;

    const layout = this.getOverlayLayoutMetrics();
    const w = layout.width;
    const h = layout.height;

    if (w <= 10 || h <= 10) {
      setTimeout(() => this.redrawPianoOverlay(), 50);
      return;
    }

    this.pianoSvg.setAttribute('width', `${w}px`);
    this.pianoSvg.setAttribute('height', `${h}px`);
    this.pianoSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    this.pianoBaseSvg.style.top = `${layout.pianoTop}px`;
    this.pianoBaseSvg.style.height = `${Math.max(1, layout.pianoHeight)}px`;
    this.pianoBaseSvg.setAttribute('width', `${w}px`);
    this.pianoBaseSvg.setAttribute(
      'height',
      `${Math.max(1, layout.pianoHeight)}px`
    );

    this.graphicPiano.updateSize(w, Math.max(1, layout.pianoHeight));

    this.makeKeysOutlineOnly();
    this.addSamplePointMarkers();
    this.renderFallingSampleRegions();
    this.renderGuideLine();
  }

  addRegistrationMarks(w, h) {
    if (!this.pianoSvg || !this.graphicPiano) return;

    // Put the registration marks at the CORNERS OF THE KEYBED (inside the
    // 10px padding), not the SVG edges. This way the corner-to-corner region
    // defined by the marks is exactly the piano area a screenshot algorithm
    // needs to extract.
    const pad = 10;
    const x0 = pad;
    const y0 = pad;
    const x1 = w - pad;
    const y1 = h - pad;

    const corners = [
      { x: x0, y: y0, color: '#ff2020', id: 'reg-tl' },
      { x: x1, y: y0, color: '#20ff20', id: 'reg-tr' },
      { x: x0, y: y1, color: '#ffff20', id: 'reg-bl' },
      { x: x1, y: y1, color: '#2080ff', id: 'reg-br' },
    ];

    const armLength = 10;
    const stroke = 3;

    this.registrationMarks.forEach((m) => m.remove());
    this.registrationMarks = [];

    corners.forEach(({ x, y, color, id }) => {
      const group = makeElement('svg:g', {
        id,
        'data-registration-color': color,
      });

      const haloH = makeElement('svg:line', {
        x1: x - armLength,
        y1: y,
        x2: x + armLength,
        y2: y,
        stroke: '#ffffff',
        'stroke-width': stroke + 3,
        'stroke-linecap': 'round',
      });
      const haloV = makeElement('svg:line', {
        x1: x,
        y1: y - armLength,
        x2: x,
        y2: y + armLength,
        stroke: '#ffffff',
        'stroke-width': stroke + 3,
        'stroke-linecap': 'round',
      });
      const horz = makeElement('svg:line', {
        x1: x - armLength,
        y1: y,
        x2: x + armLength,
        y2: y,
        stroke: color,
        'stroke-width': stroke,
        'stroke-linecap': 'round',
      });
      const vert = makeElement('svg:line', {
        x1: x,
        y1: y - armLength,
        x2: x,
        y2: y + armLength,
        stroke: color,
        'stroke-width': stroke,
        'stroke-linecap': 'round',
      });
      const dot = makeElement('svg:circle', {
        cx: x,
        cy: y,
        r: 2,
        fill: color,
        stroke: '#ffffff',
        'stroke-width': 1,
      });

      group.appendChild(haloH);
      group.appendChild(haloV);
      group.appendChild(horz);
      group.appendChild(vert);
      group.appendChild(dot);

      this.pianoSvg.appendChild(group);
      this.registrationMarks.push(group);
    });
  }

  makeKeysOutlineOnly() {
    if (!this.graphicPiano) return;

    const keys = this.graphicPiano.getKeysData();
    keys.forEach((key) => {
      if (!key.element) return;
      key.element.removeAttribute('transform');
      key.element.setAttribute('fill', 'none');
      if (key.isBlack) {
        key.element.setAttribute('stroke', '#ffffff');
        key.element.setAttribute('stroke-width', '1.2');
      } else {
        key.element.setAttribute('stroke', '#000000');
        key.element.setAttribute('stroke-width', '1');
      }
    });
  }

  addSamplePointMarkers() {
    if (!this.pianoSvg || !this.pianoBaseSvg || !this.graphicPiano) return;

    if (this.sampleMarkers) {
      this.sampleMarkers.forEach((m) => m.remove());
    }
    this.sampleMarkers = [];
    this.sampleMarkersMap = new Map();

    const overlayRect = this.pianoSvg.getBoundingClientRect();
    const pianoRect = this.pianoBaseSvg.getBoundingClientRect();
    const keys = this.graphicPiano.getKeysData();

    // Doubled box size to help prevent boundary blur artifacts
    const boxSize = 14;

    keys.forEach((key) => {
      if (!key.bbox) return;

      const [bx, by] = key.bbox.position;
      const [bw, bh] = key.bbox.size;

      const cx = pianoRect.left - overlayRect.left + bx + bw / 2;
      const cy =
        pianoRect.top -
        overlayRect.top +
        (key.isBlack ? by + bh * 0.55 : by + bh * 0.75);

      const noteName = this.midiToNoteName(key.midiCode);

      const rectEl = makeElement('svg:rect', {
        x: cx - boxSize / 2,
        y: cy - boxSize / 2,
        width: boxSize,
        height: boxSize,
        fill: 'none',
        stroke: key.isBlack ? '#ff7373' : '#ff3030',
        'stroke-width': 1.5,
        'data-midi': key.midiCode,
        'data-note': noteName,
        'data-sample-x': cx.toFixed(2),
        'data-sample-y': cy.toFixed(2),
        className: 'sample-point-marker',
      });

      const titleEl = makeElement(
        'svg:title',
        {},
        `${noteName} (MIDI ${key.midiCode})`
      );
      rectEl.appendChild(titleEl);

      this.pianoSvg.appendChild(rectEl);
      this.sampleMarkers.push(rectEl);
      this.sampleMarkersMap.set(key.midiCode, rectEl);
    });
  }

  captureStream = null;

  captureVideo = null;

  captureCanvas = null;

  captureCtx = null;

  captureRAF = null;

  captureActive = false;

  captureStartButton = null;

  captureStopButton = null;

  captureStatusEl = null;

  captureRateSelect = null;

  noteStates = null;

  recordedNotes = [];

  saturationThreshold = 0.35;

  sampleLoop() {
    if (!this.captureActive) return;

    this.captureCtx.drawImage(
      this.captureVideo,
      0,
      0,
      this.captureCanvas.width,
      this.captureCanvas.height
    );

    const nowSec = this.getAccurateTime();
    const nowMs = Math.round(nowSec * 1000);
    const scaleX = this.captureCanvas.width / window.innerWidth;
    const scaleY = this.captureCanvas.height / window.innerHeight;
    const cW = this.captureCanvas.width;
    const cH = this.captureCanvas.height;

    let fullFrameData = null;
    try {
      fullFrameData = this.captureCtx.getImageData(0, 0, cW, cH).data;
    } catch (e) {
      this.captureRAF = requestAnimationFrame(() => this.sampleLoop());
      return;
    }

    const videoQuality =
      this.captureVideo &&
      typeof this.captureVideo.getVideoPlaybackQuality === 'function'
        ? this.captureVideo.getVideoPlaybackQuality()
        : null;

    if (videoQuality && Number.isFinite(videoQuality.totalVideoFrames)) {
      const perfNow = performance.now();

      if (!this._fpsSamplePrevTime) {
        this._fpsSamplePrevTime = perfNow;
        this._fpsSamplePrevFrames = videoQuality.totalVideoFrames;
      } else {
        const dt = perfNow - this._fpsSamplePrevTime;
        const df = videoQuality.totalVideoFrames - this._fpsSamplePrevFrames;

        if (dt >= 400 && df >= 0) {
          this.captureObservedFps = df / (dt / 1000);
          this._fpsSamplePrevTime = perfNow;
          this._fpsSamplePrevFrames = videoQuality.totalVideoFrames;
        }
      }

      if (
        this.ui &&
        this.ui.captureFpsStatusEl &&
        (!this._fpsStatusLastUiUpdate ||
          performance.now() - this._fpsStatusLastUiUpdate > 500)
      ) {
        const fpsText =
          this.captureObservedFps > 0
            ? `${this.captureObservedFps.toFixed(1)} fps observed`
            : 'observed fps: warming up';
        this.ui.captureFpsStatusEl.textContent = fpsText;
        this._fpsStatusLastUiUpdate = performance.now();
      }
    }

    const targetSampleRateMs = this.fallingBarSampleRate || 66;

    if (
      this.laneScrapingEnabled &&
      (!this.lastFallingSampleTime ||
        nowMs - this.lastFallingSampleTime >= targetSampleRateMs)
    ) {
      const dtMs = this.lastFallingSampleTime
        ? nowMs - this.lastFallingSampleTime
        : targetSampleRateMs;
      this.lastFallingSampleTime = nowMs;
      const lanes = this.computeFallingLaneGeometry();
      this.laneScraper.updateTrackedRuns(
        lanes,
        nowMs,
        dtMs,
        scaleX,
        scaleY,
        fullFrameData,
        cW,
        cH
      );
    }

    this.pianoScraper.sampleFrame(fullFrameData, cW, cH, scaleX, scaleY, nowMs);

    if (
      this.laneScrapingEnabled &&
      this.laneScraper.fallingSampleLog.length % 50 === 0 &&
      this.laneScraper.fallingSampleLog.length > 0
    ) {
      const limitStr = this.maxNotesToScrape > 0 ? this.maxNotesToScrape : '∞';
      this.setCaptureStatus(
        `Recording… ${
          this.pianoScraper.recordedNotes.length
        }/${limitStr} notes, v=${Math.round(
          this.laneScraper.currentVelocity * 1000
        )}px/s, t=${nowSec.toFixed(2)}s`
      );
    }

    this.captureRAF = requestAnimationFrame(() => this.sampleLoop());
  }

  setCaptureStatus(msg) {
    if (this.captureStatusEl) this.captureStatusEl.textContent = msg;
  }

  fallingSampleOffsetAbove = 50;

  fallingSampleHeight = 250;

  fallingGapBridgeRows = 8;

  fallingMinRunRows = 3;

  fallingSatThreshold = 0.25;

  fallingSampleLog = [];

  computeFallingLaneGeometry() {
    if (!this.pianoSvg || !this.pianoBaseSvg || !this.graphicPiano) return [];

    const overlayRect = this.pianoSvg.getBoundingClientRect();
    const pianoRect = this.pianoBaseSvg.getBoundingClientRect();
    const keys = this.graphicPiano.getKeysData();
    const layout = this.getOverlayLayoutMetrics();

    let whiteKeyW = 12;
    for (const k of keys) {
      if (!k.isBlack && k.bbox) {
        whiteKeyW = k.bbox.size[0];
        break;
      }
    }
    const stemShift = whiteKeyW * 0.25;
    const baseLaneWidth = this.getBaseLaneWidthPx();

    const sampleYTop = layout.topPad;
    const sampleYBottom = layout.barsBottom;
    const strikeY = pianoRect.top - overlayRect.top + 10;

    const result = [];
    for (const key of keys) {
      if (!key.bbox) continue;

      const [bx] = key.bbox.position;
      const [bw] = key.bbox.size;
      let localX = bx + bw / 2;

      if (!key.isBlack) {
        const pc = ((key.midiCode % 12) + 12) % 12;
        if (pc === 0 || pc === 5) localX -= stemShift;
        else if (pc === 4 || pc === 11) localX += stemShift;
      }

      const sampleX = pianoRect.left - overlayRect.left + localX;
      const laneWidth = Math.max(
        2,
        baseLaneWidth *
          (key.isBlack
            ? this.blackLaneWidthScale || 1
            : this.whiteLaneWidthScale || 1)
      );

      result.push({
        midi: key.midiCode,
        isBlack: key.isBlack,
        sampleX,
        sampleYTop,
        sampleYBottom,
        strikeY,
        laneWidth,
      });
    }

    return result;
  }

  showFallingSampleLog() {
    if (!this.fallingSampleLog || this.fallingSampleLog.length === 0) return;
    const lines = this.fallingSampleLog.map((entry) => {
      const tSec = (entry.t / 1000).toFixed(3);
      const h = entry.bottom - entry.top;
      const dist = entry.strike - entry.bottom;
      const flags =
        (entry.clampedTop ? 'T' : '-') + (entry.clampedBottom ? 'B' : '-');
      return `t=${tSec}  midi=${entry.midi}  top=${entry.top}  bot=${
        entry.bottom
      }  h=${h}  dist=${dist}  sat=${entry.sat.toFixed(2)}  ${flags}`;
    });
    const header = `# ${this.fallingSampleLog.length} falling-bar run observations\n`;
    const text = header + lines.join('\n');
    let ta = document.getElementById('falling-sample-output');
    if (!ta) {
      ta = makeElement('textarea', {
        id: 'falling-sample-output',
        style: {
          width: '100%',
          minHeight: '200px',
          marginTop: '10px',
          background: '#1a1a1a',
          color: '#f5a623',
          border: '1px solid #555',
          borderRadius: '4px',
          padding: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          boxSizing: 'border-box',
        },
      });
      this.captureStatusEl.parentNode.appendChild(ta);
    }
    ta.value = text;
  }

  initFallingSampleDefaults() {
    this.fallingSampleOffsetAbove = 50;
    this.fallingSampleHeight = 250;
    this.fallingGapBridgeRows = 22;
    this.fallingMinRunRows = 10;
    this.fallingSatThreshold = 0.55;
    this.fallingClampedTopMinSat = 0.6;
    this.fallingSampleLog = [];
    this.overlayBarsPercent = 50;
    this.overlayPianoPercent = 30;
    this.whiteLaneWidthScale = 1;
    this.blackLaneWidthScale = 1;
  }

  renderFallingSampleRegions() {
    if (!this.pianoSvg || !this.graphicPiano) return;

    if (this.fallingLaneMarkers) {
      this.fallingLaneMarkers.forEach((m) => m.remove());
    }
    this.fallingLaneMarkers = [];

    const lanes = this.computeFallingLaneGeometry();

    lanes.forEach((lane) => {
      const localX = lane.sampleX;
      const localTop = lane.sampleYTop;
      const localBottom = lane.sampleYBottom;
      const localStrike = lane.strikeY;
      const laneWidth = lane.laneWidth || 10;
      const height = Math.max(1, localBottom - localTop);

      const group = makeElement('svg:g', {
        className: 'falling-lane-marker',
        'data-midi': lane.midi,
        'data-is-black': lane.isBlack ? 'true' : 'false',
      });

      const region = makeElement('svg:rect', {
        x: localX - laneWidth / 2,
        y: localTop,
        width: laneWidth,
        height: height,
        fill: 'none',
        stroke: lane.isBlack ? '#ffb300' : '#1fd6ff',
        'stroke-width': 1,
        'stroke-opacity': 0.45,
        rx: 1,
        ry: 1,
      });

      const strike = makeElement('svg:line', {
        x1: localX - laneWidth / 2 - 2,
        y1: localStrike,
        x2: localX + laneWidth / 2 + 2,
        y2: localStrike,
        stroke: '#7dff8c',
        'stroke-width': 1,
        'stroke-opacity': 0.45,
      });

      group.appendChild(region);
      group.appendChild(strike);
      this.pianoSvg.appendChild(group);
      this.fallingLaneMarkers.push(group);
    });

    if (this.laneInspectorMidiInput && this.laneInspectorMidiInput.value) {
      this.highlightLane(parseInt(this.laneInspectorMidiInput.value, 10));
    }
  }

  getPianoVerticalOffset() {
    const pm = this.pianoPlacementMetrics || this.getPianoPlacementMetrics();
    return pm.translateY;
  }

  getOverlayLayoutMetrics() {
    if (!this.pianoSvg) {
      return {
        width: 0,
        height: 0,
        topPad: 4,
        bottomPad: 4,
        usableHeight: 0,
        barsPercent: this.overlayBarsPercent || 50,
        pianoPercent: this.overlayPianoPercent || 30,
        barsTop: 4,
        barsBottom: 4,
        barsHeight: 0,
        pianoTop: 4,
        pianoBottom: 4,
        pianoHeight: 0,
        gapTop: 4,
        gapBottom: 4,
        gapHeight: 0,
      };
    }

    const rect = this.pianoSvg.getBoundingClientRect();
    const width = Math.max(10, rect.width);
    const height = Math.max(10, rect.height);

    const topPad = 4;
    const bottomPad = 4;
    const usableHeight = Math.max(1, height - topPad - bottomPad);

    const barsPercent = Math.max(
      0,
      Math.min(100, this.overlayBarsPercent || 0)
    );
    const pianoPercent = Math.max(
      0,
      Math.min(100, this.overlayPianoPercent || 0)
    );

    const barsHeight = Math.round((usableHeight * barsPercent) / 100);
    const pianoHeight = Math.round((usableHeight * pianoPercent) / 100);

    const barsTop = topPad;
    const barsBottom = barsTop + barsHeight;

    const pianoBottom = height - bottomPad;
    const pianoTop = pianoBottom - pianoHeight;

    const gapTop = barsBottom;
    const gapBottom = pianoTop;
    const gapHeight = Math.max(0, gapBottom - gapTop);

    return {
      width,
      height,
      topPad,
      bottomPad,
      usableHeight,
      barsPercent,
      pianoPercent,
      barsTop,
      barsBottom,
      barsHeight,
      pianoTop,
      pianoBottom,
      pianoHeight,
      gapTop,
      gapBottom,
      gapHeight,
    };
  }

  getPianoPlacementMetrics() {
    const layout = this.getOverlayLayoutMetrics();
    const keys =
      this.graphicPiano && this.graphicPiano.getKeysData
        ? this.graphicPiano.getKeysData()
        : [];

    let sourceTop = Infinity;
    let sourceBottom = -Infinity;

    keys.forEach((key) => {
      if (!key || !key.bbox) return;
      const [, by] = key.bbox.position;
      const [, bh] = key.bbox.size;
      sourceTop = Math.min(sourceTop, by);
      sourceBottom = Math.max(sourceBottom, by + bh);
    });

    if (!isFinite(sourceTop) || !isFinite(sourceBottom)) {
      return {
        sourceTop: 0,
        sourceBottom: 0,
        translateY: layout.pianoTop,
        strikeYLocal: layout.pianoTop,
      };
    }

    const translateY = layout.pianoBottom - sourceBottom;
    const strikeYLocal = sourceTop + translateY;

    return {
      sourceTop,
      sourceBottom,
      translateY,
      strikeYLocal,
    };
  }

  mapPianoYToOverlay(localY) {
    const pm = this.pianoPlacementMetrics || this.getPianoPlacementMetrics();
    return localY + pm.translateY;
  }

  getBaseLaneWidthPx() {
    if (!this.graphicPiano || !this.graphicPiano.getKeysData) return 10;
    const keys = this.graphicPiano.getKeysData();
    const firstWhite = keys.find((k) => k && !k.isBlack && k.bbox);
    if (!firstWhite) return 10;
    const whiteKeyWidth = firstWhite.bbox.size[0];
    const octaveWidth = whiteKeyWidth * 7;
    return Math.max(2, octaveWidth / 12);
  }

  showPianoOverlay() {
    if (!this.ui) this.ui = new MidiScraperUI(this);
    this.ui.showPianoOverlay();
  }

  buildCaptureControls() {
    if (!this.ui) this.ui = new MidiScraperUI(this);
    return this.ui.buildCaptureControls();
  }

  getOverlayPrefsKey() {
    if (!this.ui) this.ui = new MidiScraperUI(this);
    return this.ui.getOverlayPrefsKey();
  }

  loadOverlayPrefs() {
    if (!this.ui) this.ui = new MidiScraperUI(this);
    this.ui.loadOverlayPrefs();
  }

  saveOverlayPrefs() {
    if (!this.ui) this.ui = new MidiScraperUI(this);
    this.ui.saveOverlayPrefs();
  }

  async inspectLaneForMidi(midi) {
    const parsedMidi = Number.isFinite(midi) ? midi : parseInt(midi, 10);
    if (!Number.isFinite(parsedMidi)) {
      if (this.laneInspectorOutput)
        this.laneInspectorOutput.value = 'Please enter a valid MIDI code.';
      return;
    }

    if (!this.pianoSvg || !this.pianoBaseSvg || !this.graphicPiano) {
      if (this.laneInspectorOutput)
        this.laneInspectorOutput.value =
          'Open the Piano Overlay first so lane geometry exists.';
      return;
    }

    const lane = this.getLaneGeometryForMidi(parsedMidi);
    if (!lane) {
      if (this.laneInspectorOutput)
        this.laneInspectorOutput.value = `No lane found for ${this.midiToNoteName(
          parsedMidi
        )}.`;
      return;
    }

    if (!this.hasSharedCapture()) {
      const msg =
        'Shared capture is OFF.\n\nClick "Enable Capture Feed" first. After that, pause the video anywhere you want and Analyze Paused Frame will use the shared feed.';
      if (this.laneInspectorOutput) this.laneInspectorOutput.value = msg;
      this.updateStatus('Lane inspection needs shared capture enabled.');
      return;
    }

    try {
      const ready = await this.waitForSharedCaptureReady(2500);
      if (!ready) {
        const msg =
          'Shared capture is ON, but no readable frame is ready yet.\n\nWait a moment and try Analyze Paused Frame again.';
        if (this.laneInspectorOutput) this.laneInspectorOutput.value = msg;
        this.updateStatus('Shared capture enabled, but frame not ready yet.');
        return;
      }

      if (this.laneInspectorOutput)
        this.laneInspectorOutput.value = `Using shared capture for ${this.midiToNoteName(
          parsedMidi
        )}...\nSampling current frame now.`;
      this.updateStatus(
        `Inspecting frame for ${this.midiToNoteName(parsedMidi)}...`
      );

      const frame = await this.captureSingleInspectionFrame();
      const analysis = this.laneScraper.analyzeLaneOnCapturedFrame(lane, frame);
      const report = this.laneScraper.formatLaneInspectionReport(analysis);
      this.lastLaneInspection = analysis;

      if (this.laneInspectorOutput) this.laneInspectorOutput.value = report;

      this.updateStatus(
        `Lane inspection complete for ${this.midiToNoteName(
          parsedMidi
        )}. Left runs: ${analysis.left.runs.length}, right runs: ${
          analysis.right.runs.length
        }.`
      );
    } catch (err) {
      const message = `Lane inspection failed: ${
        err && err.message ? err.message : err
      }`;
      if (this.laneInspectorOutput) this.laneInspectorOutput.value = message;
      this.updateStatus(message);
    }
  }

  getLaneGeometryForMidi(midi) {
    const lanes = this.computeFallingLaneGeometry();
    for (const lane of lanes) {
      if (lane.midi === midi) return lane;
    }
    return null;
  }

  async captureSingleInspectionFrame() {
    if (!this.hasSharedCapture()) {
      throw new Error(
        'Shared capture is not enabled. Click Start Capture first.'
      );
    }

    const ready = await this.waitForSharedCaptureReady(2500);
    if (!ready) {
      throw new Error(
        'Shared capture is enabled, but the video feed is not ready.'
      );
    }

    if (!this.syncSharedCaptureCanvasToVideo()) {
      throw new Error('Could not size the shared capture canvas.');
    }

    this.captureCtx.drawImage(
      this.captureVideo,
      0,
      0,
      this.captureCanvas.width,
      this.captureCanvas.height
    );

    return {
      canvas: this.captureCanvas,
      ctx: this.captureCtx,
      width: this.captureCanvas.width,
      height: this.captureCanvas.height,
      scaleX: this.captureCanvas.width / window.innerWidth,
      scaleY: this.captureCanvas.height / window.innerHeight,
    };
  }

  mapVideoRowToOverlayY(rowIndex, localTop, localBottom, colHeight) {
    if (colHeight <= 1) return localTop;
    const t = rowIndex / (colHeight - 1);
    return localTop + t * (localBottom - localTop);
  }

  setGuideLineY(y) {
    if (y === '' || y === null || typeof y === 'undefined') {
      this.guideLineOverlayY = null;
      this.renderGuideLine();
      return;
    }

    const n = typeof y === 'number' ? y : parseFloat(y);
    if (!Number.isFinite(n)) return;

    this.guideLineOverlayY = n;
    this.renderGuideLine();
  }

  clearGuideLine() {
    this.guideLineOverlayY = null;
    this.renderGuideLine();
  }

  renderGuideLine() {
    if (!this.pianoSvg) return;

    if (this.guideLineEl && this.guideLineEl.parentNode) {
      this.guideLineEl.remove();
      this.guideLineEl = null;
    }

    if (!Number.isFinite(this.guideLineOverlayY)) return;

    const layout = this.getOverlayLayoutMetrics();
    const y = this.guideLineOverlayY;

    const group = makeElement('svg:g', {
      className: 'lane-guide-line-group',
    });

    const halo = makeElement('svg:line', {
      x1: 0,
      y1: y,
      x2: layout.width,
      y2: y,
      stroke: '#000000',
      'stroke-width': 3,
      'stroke-opacity': 0.75,
    });

    const line = makeElement('svg:line', {
      x1: 0,
      y1: y,
      x2: layout.width,
      y2: y,
      stroke: '#ff4fd8',
      'stroke-width': 1,
      'stroke-opacity': 0.95,
      'stroke-dasharray': '8 4',
    });

    const labelBg = makeElement('svg:rect', {
      x: 6,
      y: Math.max(0, y - 16),
      width: 84,
      height: 14,
      rx: 3,
      ry: 3,
      fill: '#000000',
      'fill-opacity': 0.72,
    });

    const label = makeElement(
      'svg:text',
      {
        x: 10,
        y: Math.max(11, y - 5),
        fill: '#ffb7f1',
        'font-size': 11,
        'font-family': 'monospace',
        'pointer-events': 'none',
      },
      `y=${y.toFixed(2)}`
    );

    group.appendChild(halo);
    group.appendChild(line);
    group.appendChild(labelBg);
    group.appendChild(label);

    this.pianoSvg.appendChild(group);
    this.guideLineEl = group;
  }

  async startInspectionCapture() {
    if (this.isInspectionCaptureEnabled()) {
      this.inspectionCaptureActive = true;
      this.updateInspectionCaptureUI();
      this.updateStatus('Inspect capture already enabled.');
      return;
    }

    const displayOpts = {
      video: { frameRate: 10 },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
    };

    let stream = null;
    let videoEl = null;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia(displayOpts);

      videoEl = makeElement('video', {
        autoplay: true,
        muted: true,
        playsInline: true,
        style: { display: 'none' },
      });
      videoEl.srcObject = stream;
      document.body.appendChild(videoEl);

      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {});
      }

      this.inspectionCaptureStream = stream;
      this.inspectionCaptureVideo = videoEl;

      const stopHandler = () => {
        this.stopInspectionCapture(true);
      };
      this.inspectionCaptureStopHandler = stopHandler;

      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', stopHandler, { once: true });
      });

      this.inspectionCaptureActive = this.isInspectionCaptureEnabled();
      this.updateInspectionCaptureUI();
      this.updateStatus('Inspect capture enabled. Waiting for frames...');

      const ready = await this.waitForInspectionCaptureReady(2500);
      this.updateInspectionCaptureUI();

      if (ready) {
        this.updateStatus(
          `Inspect capture ready (${videoEl.videoWidth || '?'}×${
            videoEl.videoHeight || '?'
          }).`
        );
        if (this.laneInspectorOutput) {
          this.laneInspectorOutput.value =
            'Inspect capture is ON and ready.\n\nPause the video wherever you want and click Analyze Paused Frame.';
        }
      } else {
        this.updateStatus(
          'Inspect capture enabled, but the video feed is not ready yet.'
        );
        if (this.laneInspectorOutput) {
          this.laneInspectorOutput.value =
            'Inspect capture is ON, but the hidden video feed is not ready yet.\n\nWait a moment, then try Analyze Paused Frame.';
        }
      }
    } catch (err) {
      if (videoEl) {
        try {
          videoEl.remove();
        } catch (e) {}
      }
      if (stream) {
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }

      this.inspectionCaptureStream = null;
      this.inspectionCaptureVideo = null;
      this.inspectionCaptureActive = false;
      this.updateInspectionCaptureUI();

      const message = `Failed to enable inspect capture: ${
        err && err.message ? err.message : err
      }`;
      this.updateStatus(message);
      if (this.laneInspectorOutput) this.laneInspectorOutput.value = message;
    }
  }

  stopInspectionCapture(fromTrackEnded = false) {
    const stream = this.inspectionCaptureStream;
    const videoEl = this.inspectionCaptureVideo;

    this.inspectionCaptureStream = null;
    this.inspectionCaptureVideo = null;
    this.inspectionCaptureActive = false;

    if (stream) {
      try {
        stream.getTracks().forEach((t) => {
          if (t.readyState === 'live') t.stop();
        });
      } catch (e) {}
    }

    if (videoEl) {
      try {
        videoEl.remove();
      } catch (e) {}
    }

    this.updateInspectionCaptureUI();

    if (fromTrackEnded) {
      this.updateStatus('Inspect capture ended.');
      if (this.laneInspectorOutput) {
        this.laneInspectorOutput.value =
          'Inspect capture ended.\n\nTurn on "Enable Inspect Capture" again to keep using paused-frame analysis.';
      }
    } else {
      this.updateStatus('Inspect capture disabled.');
    }
  }

  updateInspectionCaptureUI() {
    const enabled = this.isInspectionCaptureEnabled();
    const ready = this.isInspectionCaptureReady();
    this.inspectionCaptureActive = enabled;

    if (this.inspectCaptureToggleButton) {
      this.inspectCaptureToggleButton.textContent = enabled
        ? 'Disable Inspect Capture'
        : 'Enable Inspect Capture';
    }

    if (this.inspectCaptureStatusEl) {
      if (!enabled) {
        this.inspectCaptureStatusEl.textContent = 'Inspect capture: OFF';
        this.inspectCaptureStatusEl.style.color = '#ff9d9d';
      } else if (!ready) {
        this.inspectCaptureStatusEl.textContent =
          'Inspect capture: ON (warming up)';
        this.inspectCaptureStatusEl.style.color = '#ffd36b';
      } else {
        this.inspectCaptureStatusEl.textContent = 'Inspect capture: ON';
        this.inspectCaptureStatusEl.style.color = '#7dff8c';
      }
    }
  }

  isInspectionCaptureReallyActive() {
    const stream = this.inspectionCaptureStream;
    const videoEl = this.inspectionCaptureVideo;
    if (!stream || !videoEl) return false;

    const tracks =
      typeof stream.getVideoTracks === 'function'
        ? stream.getVideoTracks()
        : [];
    if (!tracks.length) return false;

    const liveTrack = tracks.find((t) => t && t.readyState === 'live');
    if (!liveTrack) return false;

    return !!(videoEl.videoWidth || videoEl.readyState >= 2);
  }

  isInspectionCaptureEnabled() {
    const stream = this.inspectionCaptureStream;
    const videoEl = this.inspectionCaptureVideo;
    if (!stream || !videoEl) return false;

    const tracks =
      typeof stream.getVideoTracks === 'function'
        ? stream.getVideoTracks()
        : [];
    if (!tracks.length) return false;

    return tracks.some((t) => t && t.readyState === 'live');
  }

  isInspectionCaptureReady() {
    if (!this.isInspectionCaptureEnabled()) return false;
    const videoEl = this.inspectionCaptureVideo;
    return !!(videoEl && (videoEl.videoWidth > 0 || videoEl.readyState >= 2));
  }

  async waitForInspectionCaptureReady(timeoutMs = 2500) {
    if (!this.isInspectionCaptureEnabled()) return false;
    if (this.isInspectionCaptureReady()) return true;

    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (!this.isInspectionCaptureEnabled()) return false;
      if (this.isInspectionCaptureReady()) return true;
    }
    return this.isInspectionCaptureReady();
  }

  hasSharedCapture() {
    const stream = this.captureStream;
    const videoEl = this.captureVideo;
    if (!stream || !videoEl) return false;

    const tracks =
      typeof stream.getVideoTracks === 'function'
        ? stream.getVideoTracks()
        : [];
    if (!tracks.length) return false;

    return tracks.some((t) => t && t.readyState === 'live');
  }

  async waitForSharedCaptureReady(timeoutMs = 2500) {
    if (!this.hasSharedCapture()) return false;
    if (this.captureVideo && this.captureVideo.videoWidth > 0) return true;

    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (!this.hasSharedCapture()) return false;
      if (this.captureVideo && this.captureVideo.videoWidth > 0) return true;
    }

    return !!(this.captureVideo && this.captureVideo.videoWidth > 0);
  }

  syncSharedCaptureCanvasToVideo() {
    if (!this.captureVideo) return false;

    const w = Math.max(1, this.captureVideo.videoWidth || 0);
    const h = Math.max(1, this.captureVideo.videoHeight || 0);
    if (!w || !h) return false;

    if (!this.captureCanvas) {
      this.captureCanvas = document.createElement('canvas');
    }
    if (this.captureCanvas.width !== w) this.captureCanvas.width = w;
    if (this.captureCanvas.height !== h) this.captureCanvas.height = h;

    if (!this.captureCtx) {
      this.captureCtx = this.captureCanvas.getContext('2d', {
        willReadFrequently: true,
      });
    }

    return true;
  }

  highlightLane(midi) {
    if (!this.fallingLaneMarkers) return;

    const parsedMidi = parseInt(midi, 10);

    this.fallingLaneMarkers.forEach((group) => {
      const rect = group.querySelector('rect');
      if (!rect) return;

      const groupMidi = parseInt(group.getAttribute('data-midi'), 10);
      const isTarget = groupMidi === parsedMidi && !isNaN(parsedMidi);

      if (isTarget) {
        // Highly visible color, strictly 1px thick, absolutely NO fill
        rect.setAttribute('stroke', '#ff00ff');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-opacity', '1');
        rect.setAttribute('fill', 'none');
      } else {
        const isBlack = group.getAttribute('data-is-black') === 'true';
        rect.setAttribute('stroke', isBlack ? '#ffb300' : '#1fd6ff');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-opacity', '0.45');
        rect.setAttribute('fill', 'none');
      }
    });
  }

  colorCalibration = {
    bg: '#000000',
    wn1: '#ffffff',
    wn2: '#dddddd',
    bn1: '#ff0000',
    bn2: '#00ff00',
  };

  activeColorSwatch = null;

  async startColorCalibration() {
    if (!this.hasSharedCapture()) {
      this.updateStatus('Please Start Capture before calibrating colors.');
      return;
    }

    const ready = await this.waitForSharedCaptureReady(2500);
    if (!ready) {
      this.updateStatus('Capture feed not ready for calibration.');
      return;
    }

    // Ensure our internal canvas matches the video size and grabs the latest frame
    this.syncSharedCaptureCanvasToVideo();
    this.captureCtx.drawImage(
      this.captureVideo,
      0,
      0,
      this.captureCanvas.width,
      this.captureCanvas.height
    );

    // Create an off-screen copy so the live loop doesn't overwrite it while the dialog is open
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = this.captureCanvas.width;
    snapCanvas.height = this.captureCanvas.height;
    const snapCtx = snapCanvas.getContext('2d');
    snapCtx.drawImage(this.captureCanvas, 0, 0);

    this.updateStatus('Snapshot taken. Opening calibration dialog...');

    if (!this.ui) this.ui = new MidiScraperUI(this);
    this.ui.showColorCalibrationDialog(snapCanvas);
  }

  async enableCaptureFeed() {
    if (this.hasSharedCapture()) {
      this.updateStatus('Shared screen capture is already enabled.');
      return;
    }

    let stream = null;
    let videoEl = null;

    try {
      const displayOpts = {
        video: {
          frameRate: {
            ideal: 60,
            max: 60,
          },
        },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
      };

      stream = await navigator.mediaDevices.getDisplayMedia(displayOpts);

      videoEl = makeElement('video', {
        autoplay: true,
        muted: true,
        playsInline: true,
        style: { display: 'none' },
      });
      videoEl.srcObject = stream;
      document.body.appendChild(videoEl);

      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {});
      }

      this.captureStream = stream;
      this.captureVideo = videoEl;

      await this.waitForSharedCaptureReady(2500);
      this.syncSharedCaptureCanvasToVideo();

      if (this.ui.enableCaptureFeedButton) {
        this.ui.enableCaptureFeedButton.textContent = 'Capture Feed Active';
        this.ui.enableCaptureFeedButton.style.background = '#4caf50';
      }
      if (this.ui.startStopScraperButton) {
        this.ui.startStopScraperButton.disabled = false;
      }

      const track =
        stream && typeof stream.getVideoTracks === 'function'
          ? stream.getVideoTracks()[0]
          : null;
      const settings =
        track && typeof track.getSettings === 'function'
          ? track.getSettings()
          : null;

      const dims =
        this.captureVideo && this.captureVideo.videoWidth > 0
          ? `${this.captureVideo.videoWidth}×${this.captureVideo.videoHeight}`
          : 'video feed warming up';

      const fpsText =
        settings && settings.frameRate
          ? ` @ ${Number(settings.frameRate).toFixed(1)}fps`
          : '';

      this.setCaptureStatus(`Capture feed ready (${dims}${fpsText}).`);
      this.updateStatus('Capture feed enabled.');
    } catch (err) {
      if (videoEl)
        try {
          videoEl.remove();
        } catch (e) {}
      if (stream)
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}

      this.captureStream = null;
      this.captureVideo = null;
      this.captureCanvas = null;
      this.captureCtx = null;

      this.setCaptureStatus(`Permission denied or failed: ${err.message}`);
    }
  }

  startScraping() {
    if (!this.hasSharedCapture()) {
      this.updateStatus('Enable Capture Feed first.');
      return;
    }

    const desiredRate =
      parseFloat(
        (this.captureRateSelect && this.captureRateSelect.value) || '1'
      ) || 1;
    this.selectedPlaybackRate = desiredRate;

    if (this.ytPlayer) {
      this.ytPlayer.seekTo(0, true);
      try {
        if (this.ytPlayer.setPlaybackRate) {
          this.ytPlayer.setPlaybackRate(desiredRate);
        }
        this.playbackRate = desiredRate;
      } catch (e) {}
      this.ytPlayer.playVideo();
    }

    this.captureActive = true;

    const preservedVelocity = this.laneScraper.currentVelocity || 0;

    this.laneScraper.reset();
    this.pianoScraper.reset();

    if (
      this.laneScrapingEnabled &&
      preservedVelocity > 0.05 &&
      preservedVelocity < 1.5
    ) {
      this.laneScraper.currentVelocity = preservedVelocity;
    }

    this.lastFallingSampleTime = 0;
    this.captureObservedFps = 0;
    this._fpsSamplePrevTime = 0;
    this._fpsSamplePrevFrames = 0;
    this._fpsStatusLastUiUpdate = 0;

    if (this.sampleMarkersMap) {
      this.sampleMarkersMap.forEach((marker, midi) => {
        const isBlack = this.graphicPiano.getKeyByMidi(midi)?.isBlack;
        marker.setAttribute('fill', 'none');
        marker.setAttribute('stroke', isBlack ? '#ff7373' : '#ff3030');
      });
    }

    if (this.ui.startStopScraperButton) {
      this.ui.startStopScraperButton.textContent = 'Stop Scraper';
      this.ui.startStopScraperButton.style.background = '#c42b1c';
    }

    const modeText = this.laneScrapingEnabled
      ? 'raw piano + lane scraping'
      : 'raw piano only';

    this.setCaptureStatus(
      `Scraper running at ${desiredRate}x (${modeText})... (Target: ${
        this.maxNotesToScrape > 0
          ? this.maxNotesToScrape + ' notes'
          : 'Infinite'
      }${
        this.debugMidiOnly != null ? ' | DEBUG MIDI ' + this.debugMidiOnly : ''
      })`
    );

    this.sampleLoop();
  }

  stopScraping() {
    if (this.captureRAF) cancelAnimationFrame(this.captureRAF);
    this.captureRAF = null;
    this.captureActive = false;

    if (this.ytPlayer) {
      this.ytPlayer.pauseVideo();
    }

    if (this.laneScrapingEnabled) {
      this.laneScraper.finalizeAll();
    }

    const nowMs = Math.round(this.getAccurateTime() * 1000);
    const rawKeyboardNotes = this.pianoScraper.finalize(nowMs);
    this.recordedNotes = rawKeyboardNotes;

    let finalNotes = [];

    if (!this.laneScrapingEnabled) {
      finalNotes = rawKeyboardNotes.map((note) => ({
        midi: note.midi,
        kbStartMs: note.kbStartMs,
        kbEndMs: note.kbEndMs,
        kbDurMs: note.kbEndMs - note.kbStartMs,
        refinedStartMs: note.kbStartMs,
        refinedDurationMs: note.kbEndMs - note.kbStartMs,
        matchedBlocks: [],
        ignoredBlocks: [],
        matchedArrivalCluster: null,
        alignmentOffsetMs: 0,
        firstNoteAnchor: false,
      }));
    } else {
      const kbByMidi = new Map();
      for (const note of rawKeyboardNotes) {
        if (!kbByMidi.has(note.midi)) kbByMidi.set(note.midi, []);
        kbByMidi.get(note.midi).push(note);
      }

      for (const [midi, notes] of kbByMidi) {
        const aligned = this.laneScraper.alignNotesForMidi(midi, notes);
        finalNotes.push(...aligned);
      }
    }

    finalNotes.sort((a, b) => a.kbStartMs - b.kbStartMs);

    this.lastScrapeResults = finalNotes;

    if (this.ui.startStopScraperButton && !this.isQueueRunning) {
      this.ui.startStopScraperButton.textContent = 'Start Scraper';
      this.ui.startStopScraperButton.style.background = '#03dac6';
    }

    if (
      this.laneScrapingEnabled &&
      this.debugMidiOnly !== undefined &&
      this.debugMidiOnly !== null
    ) {
      const report = this.laneScraper.dumpMidiDiagnostic(this.debugMidiOnly);
      const noteName = this.midiToNoteName(this.debugMidiOnly);
      this.setCaptureStatus(
        `Debug dump ready for ${noteName} (MIDI ${this.debugMidiOnly})`
      );

      let ta = document.getElementById('falling-sample-output');
      if (!ta) {
        ta = document.createElement('textarea');
        ta.id = 'falling-sample-output';
        ta.style.cssText =
          'width:100%;min-height:200px;margin-top:10px;background:#1a1a1a;color:#f5a623;border:1px solid #555;border-radius:4px;padding:8px;font-family:monospace;font-size:12px;box-sizing:border-box;';
        if (this.captureStatusEl) {
          this.captureStatusEl.parentNode.appendChild(ta);
        }
      }
      ta.value = report;
    } else {
      if (this.isQueueRunning) {
        this.setCaptureStatus(
          `Saving results for queue item ${this.currentQueueIndex + 1}...`
        );
        this.saveQueueItemToFile(finalNotes).then(() => {
          this.currentQueueIndex++;
          setTimeout(() => this.processNextQueueItem(), 2000);
        });
      } else {
        this.setCaptureStatus(
          this.laneScrapingEnabled
            ? 'Scraping stopped. Building report...'
            : 'Raw piano scraping stopped. Building report...'
        );
        this.ui.showScrapeResultsDialog(finalNotes);
      }
    }
  }

  midiToNoteName(midi) {
    const notes = [
      'C',
      'Db',
      'D',
      'Eb',
      'E',
      'F',
      'Gb',
      'G',
      'Ab',
      'A',
      'Bb',
      'B',
    ];
    const n = parseInt(midi, 10);
    if (isNaN(n)) return 'Unknown';
    const octave = Math.floor(n / 12) - 1;
    const name = notes[n % 12];
    return `${name}${octave}`;
  }

  formatTimedEventNumber(value) {
    return this.exporters.formatTimedEventNumber(value);
  }

  formatTimedEventsExport(notes, mode = 'adjusted') {
    return this.exporters.formatTimedEventsExport(notes, mode);
  }

  async copyTextToClipboard(text) {
    const value = String(text ?? '');
    if (!value) return false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (e) {}

    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', 'readonly');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }

    ta.remove();
    return ok;
  }

  buildTimedEventsData(notes, mode = 'adjusted') {
    return this.exporters.buildTimedEventsData(notes, mode);
  }

  formatTimedEventsDiagnostics(notes) {
    return this.exporters.formatTimedEventsDiagnostics(notes);
  }

  togglePlayPause() {
    if (!this.ytPlayer) return;
    const state = this.ytPlayer.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      this.ytPlayer.pauseVideo();
    } else {
      this.ytPlayer.playVideo();
    }
  }

  toggleScraper() {
    if (this.captureActive) {
      this.stopScraping();
    } else {
      this.startScraping();
    }
  }

  generateLaneDiagnosticReport(midi) {
    return this.exporters.generateLaneDiagnosticReport(midi);
  }

  generateLaneScrapeTrace(midi) {
    return this.exporters.generateLaneScrapeTrace(midi);
  }

  handleFirstNoteFailure(firstChordNotes) {
    if (this.ui.startStopScraperButton) {
      this.ui.startStopScraperButton.textContent = 'Start Scraper';
      this.ui.startStopScraperButton.style.background = '#007acc';
    }

    this.setCaptureStatus(
      'ERROR: First note lacks falling bars! See diagnostic log.'
    );

    let report =
      '=== CRITICAL ERROR: FIRST NOTE(S) MISSING FALLING BARS ===\n\n';
    report +=
      'The scraper detected the first keyboard strike(s), but could not find matching falling bars in the mathematical prediction window.\n';
    report +=
      'This means either the lane scanner is completely blind to these notes, the velocity math is drastically wrong, or the strikeY target is misaligned.\n\n';

    report += `Global Estimated Velocity: ${this.laneScraper.currentVelocity.toFixed(
      4
    )} px/ms\n\n`;

    report += '--- FIRST KEYBOARD NOTES (CHORD) ---\n';
    firstChordNotes.forEach((n) => {
      report += `MIDI ${n.midi} (${this.midiToNoteName(
        n.midi
      )}) | kbStart: ${Math.round(n.kbStartMs)}ms | kbEnd: ${Math.round(
        n.kbEndMs
      )}ms\n`;

      // Sort these chronologically so the output is readable
      const allBlocks = this.laneScraper.finishedTrackedRuns
        .filter((r) => r.midi === n.midi)
        .sort((a, b) => a.startMs - b.startMs);

      report += `  -> Total falling blocks seen for this MIDI anywhere in song: ${allBlocks.length}\n`;
      allBlocks.forEach((b, i) => {
        const errMs = Math.round(b.startMs - n.kbStartMs);
        const sign = errMs > 0 ? '+' : '';
        report += `       Block ${i + 1}: predictedHit=${Math.round(
          b.startMs
        )}ms (Error: ${sign}${errMs}ms), obsCount=${b.observations.length}\n`;
      });

      const rawSamples = this.laneScraper.fallingSampleLog.filter(
        (s) => s.midi === n.midi
      );
      report += `  -> Total raw pixel samples finding color for this MIDI: ${rawSamples.length}\n\n`;
    });

    if (this.ui) this.ui.showFirstNoteFailureDialog(report);
  }

  addCurrentToQueue() {
    if (!this.scrapeQueue) this.scrapeQueue = [];

    const vidInput = this.inputField
      ? this.parseVideoId(this.inputField.value)
      : null;
    const curVid =
      this.currentLoadedVideoId ||
      vidInput ||
      this.pendingVideoId ||
      (this.ytPlayer ? this.parseVideoId(this.ytPlayer.getVideoUrl()) : null);

    if (!curVid) {
      this.updateStatus('Cannot add to queue: No video loaded.');
      return;
    }

    const targetId = this.targetMusicVideoIdInput
      ? this.targetMusicVideoIdInput.value.trim()
      : '';
    if (!targetId) {
      this.updateStatus(
        'Cannot add to queue: Please enter Target Music Video ID.'
      );
      return;
    }

    let overlayRect = {
      left: '80px',
      top: '540px',
      width: '820px',
      height: '260px',
    };
    if (this.pianoDialog && this.pianoDialog.element) {
      overlayRect = {
        left: this.pianoDialog.element.style.left,
        top: this.pianoDialog.element.style.top,
        width: this.pianoDialog.element.style.width,
        height: this.pianoDialog.element.style.height,
      };
    }

    let videoRect = {
      left: '80px',
      top: '120px',
      width: '640px',
      height: '400px',
    };
    if (this.videoDialog && this.videoDialog.element) {
      videoRect = {
        left: this.videoDialog.element.style.left,
        top: this.videoDialog.element.style.top,
        width: this.videoDialog.element.style.width,
        height: this.videoDialog.element.style.height,
      };
    }

    this.scrapeQueue.push({
      videoId: curVid,
      targetId: targetId,
      startKey: this.pianoStartKey || 'C',
      startMidi: this.pianoStartMidi || 36,
      speed: this.selectedPlaybackRate || 0.5,
      endOffset:
        this.stopOffsetSeconds !== undefined ? this.stopOffsetSeconds : 3,
      overlayRect: overlayRect,
      videoRect: videoRect,
    });

    this.updateQueueDisplay();
    this.updateStatus(
      `Added to queue. Total items: ${this.scrapeQueue.length}`
    );

    // Clear input for convenience
    if (this.targetMusicVideoIdInput) this.targetMusicVideoIdInput.value = '';
  }

  updateQueueDisplay() {
    if (this.queueStatusDiv) {
      if (!this.scrapeQueue || this.scrapeQueue.length === 0) {
        this.queueStatusDiv.textContent = 'Queue is empty.';
      } else {
        this.queueStatusDiv.textContent = this.scrapeQueue
          .map(
            (q, i) =>
              `${i + 1}. Vid: ${q.videoId} -> Target: ${q.targetId}.txt (Key: ${
                q.startKey
              })`
          )
          .join('\n');
      }
    }
  }

  clearQueue() {
    this.scrapeQueue = [];
    this.updateQueueDisplay();
    this.updateStatus('Queue cleared.');
  }

  async startQueue() {
    if (!this.scrapeQueue || this.scrapeQueue.length === 0) {
      this.updateStatus('Queue is empty.');
      return;
    }
    if (!this.hasSharedCapture()) {
      this.updateStatus('Please Enable Capture Feed before running the queue.');
      return;
    }

    try {
      this.outputDirectoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });
    } catch (e) {
      this.updateStatus('Directory selection cancelled or failed.');
      return;
    }

    this.isQueueRunning = true;
    this.currentQueueIndex = 0;

    if (this.ui.startStopScraperButton)
      this.ui.startStopScraperButton.disabled = true;

    this.processNextQueueItem();
  }

  async processNextQueueItem() {
    if (this.currentQueueIndex >= this.scrapeQueue.length) {
      this.isQueueRunning = false;
      this.updateStatus('Queue finished!');
      this.setCaptureStatus('Queue finished.');
      if (this.ui.startStopScraperButton)
        this.ui.startStopScraperButton.disabled = false;
      return;
    }

    const item = this.scrapeQueue[this.currentQueueIndex];
    this.updateStatus(
      `Queue [${this.currentQueueIndex + 1}/${
        this.scrapeQueue.length
      }]: Loading ${item.videoId}...`
    );

    // Restore Dialog Box positions
    if (this.pianoDialog && this.pianoDialog.element && item.overlayRect) {
      this.pianoDialog.element.style.left = item.overlayRect.left;
      this.pianoDialog.element.style.top = item.overlayRect.top;
      this.pianoDialog.element.style.width = item.overlayRect.width;
      this.pianoDialog.element.style.height = item.overlayRect.height;
      this.redrawPianoOverlay();
    }
    if (this.videoDialog && this.videoDialog.element && item.videoRect) {
      this.videoDialog.element.style.left = item.videoRect.left;
      this.videoDialog.element.style.top = item.videoRect.top;
      this.videoDialog.element.style.width = item.videoRect.width;
      this.videoDialog.element.style.height = item.videoRect.height;
      this.resizeVideoToFit();
    }

    // Apply settings
    this.pianoStartKey = item.startKey;
    this.pianoStartMidi = item.startMidi;
    if (this.ui && this.ui.app && this.ui.app.pianoStartKeySelect) {
      this.ui.app.pianoStartKeySelect.value = item.startKey;
    }
    if (this.graphicPiano) {
      this.graphicPiano.updateSettings({
        startMidi: item.startMidi,
        endMidi: item.startMidi + 48,
      });
      this.graphicPiano.initialize();
      if (this.pianoDialog && this.pianoSvg) this.redrawPianoOverlay();
    }

    this.selectedPlaybackRate = item.speed;
    if (this.captureRateSelect)
      this.captureRateSelect.value = String(item.speed);

    this.stopOffsetSeconds = item.endOffset;

    // Load Video
    if (this.ytPlayer) {
      this.ytPlayer.loadVideoById(item.videoId);
      let waitAttempts = 0;
      await new Promise((resolve) => {
        const check = setInterval(() => {
          waitAttempts++;
          if (this.ytPlayer && this.ytPlayer.getPlayerState) {
            const state = this.ytPlayer.getPlayerState();
            if (state === window.YT.PlayerState.PLAYING) {
              clearInterval(check);
              setTimeout(resolve, 2500); // stabilize buffer
            }
          }
          if (waitAttempts > 30) {
            clearInterval(check);
            resolve();
          }
        }, 500);
      });

      this.ytPlayer.pauseVideo();
      await new Promise((r) => setTimeout(r, 500));

      this.syncSharedCaptureCanvasToVideo();

      this.startScraping();
    } else {
      this.updateStatus('YouTube player not initialized. Aborting queue.');
      this.isQueueRunning = false;
      if (this.ui.startStopScraperButton)
        this.ui.startStopScraperButton.disabled = false;
    }
  }

  async saveQueueItemToFile(notes) {
    const item = this.scrapeQueue[this.currentQueueIndex];
    const cleanName = item.targetId.replace(/[-_]/g, '') + '.txt';

    let exportText = '';
    if (this.laneScrapingEnabled) {
      exportText = this.formatTimedEventsExport(notes, 'adjusted');
    } else {
      exportText = this.exporters.formatRawKeyboardNotesList(notes);
    }

    try {
      const fileHandle = await this.outputDirectoryHandle.getFileHandle(
        cleanName,
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(exportText);
      await writable.close();
      this.updateStatus(`Saved ${cleanName}`);
    } catch (e) {
      console.error('Save error:', e);
      this.updateStatus(`Failed to save ${cleanName}: ${e.message}`);
    }
  }

  

  async run(env) {
      if (!env || !env.container) {
        throw new Error("[MidiScraper] run() requires an environment object with a valid container.");
      }
      this.env = env; // Save environment securely
      this.init(env.container);
      return this;
    }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 2207,
  "provides": [
    "MidiScraper"
  ],
  "deps": [
    "LaneScraper",
    "MidiScraperExporters",
    "MidiScraperUI",
    "PianoScraper",
    "applyCss",
    "makeElement"
  ]
}
recursi-meta */

globalThis.MidiScraper = MidiScraper;
