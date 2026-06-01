
class MidiScraperUI {
  constructor(app) {
    this.app = app;
  }

  installStyles() {
    applyCss(
      `
      body { background-color: #121212; color: #e0e0e0; padding-bottom: 150px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      .app-title { color: #bb86fc; margin-bottom: 10px; font-weight: 600; letter-spacing: 0.5px; }
      .status-message { font-style: italic; color: #a0a0a0; margin-top: 5px; min-height: 1.2em; font-size: 14px; }
      .yt-controls { margin-top: 20px; padding: 20px; border: 1px solid #333; background-color: #1e1e1e; border-radius: 8px; max-width: 650px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
      .yt-controls label { display: block; margin-bottom: 6px; font-weight: 500; color: #cfcfcf; font-size: 13px; }
      .yt-controls input[type="text"], .yt-controls input[type="number"], .yt-controls select { padding: 8px 12px; font-size: 14px; background: #2c2c2c; color: #fff; border: 1px solid #444; border-radius: 6px; transition: border-color 0.2s; }
      .yt-controls input[type="text"]:focus, .yt-controls select:focus { border-color: #bb86fc; outline: none; }
      .yt-controls button { padding: 8px 16px; margin-right: 8px; margin-top: 8px; background: #03dac6; color: #000; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; transition: background-color 0.2s, transform 0.1s; }
      .yt-controls button:hover { background: #01b8a5; }
      .yt-controls button:active { transform: scale(0.98); }
      .yt-controls button:disabled { background: #444; color: #888; cursor: not-allowed; }
      .yt-output { margin-top: 15px; padding: 12px; background: #252525; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; color: #03dac6; border: 1px solid #333; }
      .yt-output div { margin: 4px 0; }
      .yt-output .label { color: #888; display: inline-block; width: 90px; }
      .yt-output .value { color: #bb86fc; font-weight: bold; }
      .yt-video-wrapper { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden; }
      .yt-video-inner { background: #000; }
      .yt-video-inner iframe { width: 100% !important; height: 100% !important; border: 0; display: block; }
      .midi-overlay-root { width: 100%; height: 100%; position: relative; background: transparent; box-sizing: border-box; overflow: hidden; }
      .advanced-btn { background: #333 !important; color: #ccc !important; padding: 6px 12px !important; font-size: 12px !important; font-weight: 500 !important; border: 1px solid #555 !important; }
      .advanced-btn:hover { background: #444 !important; color: #fff !important; }
    `,
      'midi-scraper-yt-styles'
    );
  }

  buildMainControls(targetElement) {
      const app = this.app;

      this._buildTopCenterCaptureButton(targetElement);

      app.titleElement = makeElement(
        'h1',
        { className: 'app-title' },
        'Midi Scraper'
      );
      app.statusDiv = makeElement(
        'div',
        { className: 'status-message' },
        'Loading YouTube API...'
      );

      targetElement.appendChild(app.titleElement);
      targetElement.appendChild(app.statusDiv);

      const controls = makeElement('div', { className: 'yt-controls' });
      const label = makeElement(
        'label',
        { htmlFor: 'yt-input' },
        'YouTube Video ID or URL:'
      );

      // Row 1: Source & Overlay grouped
      const loadRow = makeElement('div', {
        style: { display: 'flex', gap: '8px', marginBottom: '10px' },
      });
      app.inputField = makeElement('input', {
        type: 'text',
        id: 'yt-input',
        placeholder: 'e.g. dQw4w9WgXcQ',
        value: app.overlayPrefs.lastVideoId || 'xKYhqo0GKqE',
        style: { margin: '0', flexGrow: '1' },
      });

      app.loadButton = makeElement(
        'button',
        { onclick: () => app.loadVideoFromInput(), style: { margin: '0' } },
        'Load Video'
      );
      app.pianoButton = makeElement(
        'button',
        { onclick: () => this.showPianoOverlay(), style: { margin: '0' } },
        'Piano Overlay'
      );

      loadRow.appendChild(app.inputField);
      loadRow.appendChild(app.loadButton);
      loadRow.appendChild(app.pianoButton);

      // Row 2: Playback Controls Toggle
      const playbackRow = makeElement('div', {
        style: { display: 'flex', gap: '8px' },
      });
      app.playPauseButton = makeElement(
        'button',
        { onclick: () => app.togglePlayPause(), style: { minWidth: '120px' } },
        'Play / Pause'
      );
      app.seekBackButton = makeElement(
        'button',
        { onclick: () => app.seekRelative(-10) },
        '« -10s'
      );
      app.seekForwardButton = makeElement(
        'button',
        { onclick: () => app.seekRelative(10) },
        '+10s »'
      );

      playbackRow.appendChild(app.playPauseButton);
      playbackRow.appendChild(app.seekBackButton);
      playbackRow.appendChild(app.seekForwardButton);

      app.positionDisplay = makeElement(
        'div',
        {},
        makeElement('span', { className: 'label' }, 'Position:'),
        makeElement('span', { className: 'value' }, '-')
      );
      app.durationDisplay = makeElement(
        'div',
        {},
        makeElement('span', { className: 'label' }, 'Duration:'),
        makeElement('span', { className: 'value' }, '-')
      );
      const stateDisplay = makeElement(
        'div',
        {},
        makeElement('span', { className: 'label' }, 'State:'),
        makeElement('span', { className: 'value', id: 'yt-state-value' }, 'idle')
      );

      const output = makeElement('div', { className: 'yt-output' });
      output.appendChild(app.positionDisplay);
      output.appendChild(app.durationDisplay);
      output.appendChild(stateDisplay);

      controls.appendChild(label);
      controls.appendChild(loadRow);
      controls.appendChild(playbackRow);
      controls.appendChild(output);

      targetElement.appendChild(controls);
    }

  _buildTopCenterCaptureButton(targetElement) {
      if (this.topBar) return;
      this.topBar = makeElement('div', {
        style: {
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          padding: '10px 0',
          pointerEvents: 'auto',
          flexShrink: '0'
        },
      });

      this.enableCaptureFeedButton = makeElement(
        'button',
        {
          style: {
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            background: '#ff5722',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'background 0.3s',
          },
          onclick: () => this.app.enableCaptureFeed(),
        },
        'Enable Capture Feed'
      );

      this.topBar.appendChild(this.enableCaptureFeedButton);
      if (targetElement) {
        targetElement.insertBefore(this.topBar, targetElement.firstChild);
      }
    }

  makeSliderRow(labelText, min, max, value, onInput) {
    const row = makeElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '110px 1fr 56px',
        gap: '8px',
        alignItems: 'center',
        marginBottom: '6px',
      },
    });

    const labelEl = makeElement(
      'label',
      { style: { margin: '0', fontWeight: 'normal', color: '#ccc' } },
      labelText
    );
    const inputEl = makeElement('input', {
      type: 'range',
      min: String(min),
      max: String(max),
      step: '1',
      value: String(value),
      oninput: (e) => {
        const n = parseInt(e.target.value, 10) || 0;
        valueEl.textContent = `${n}%`;
        onInput(n);
      },
    });
    const valueEl = makeElement(
      'div',
      {
        style: {
          textAlign: 'right',
          color: '#9dd7ff',
          fontFamily: 'monospace',
        },
      },
      `${value}%`
    );

    row.appendChild(labelEl);
    row.appendChild(inputEl);
    row.appendChild(valueEl);
    return { row, inputEl, valueEl };
  }

  buildCaptureControls() {
    const section = makeElement('div', {
      className: 'yt-controls',
      style: { marginTop: '15px' },
    });

    const headerRow = makeElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        paddingBottom: '10px',
        borderBottom: '1px solid #333',
      },
    });
    headerRow.appendChild(
      makeElement(
        'label',
        { style: { margin: 0, fontSize: '15px', color: '#fff' } },
        'Capture & Scrape'
      )
    );

    const advBtn = makeElement(
      'button',
      {
        className: 'advanced-btn',
        onclick: () => this.showAdvancedSettingsDialog(),
      },
      'Advanced / Lane Scraping'
    );
    headerRow.appendChild(advBtn);

    section.appendChild(headerRow);
    section.appendChild(this._buildMainSettings());
    section.appendChild(this._buildQueueActions());
    section.appendChild(this._buildScraperActions());
    section.appendChild(this._buildOverlayTuning());

    this.app.captureStatusEl = makeElement(
      'div',
      {
        className: 'yt-output',
        style: { marginTop: '15px', fontWeight: 'bold' },
      },
      'Capture idle.'
    );
    section.appendChild(this.app.captureStatusEl);
    return section;
  }

  _buildScraperActions() {
    const container = makeElement('div', {
      style: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap',
      },
    });

    this.startStopScraperButton = makeElement(
      'button',
      {
        onclick: () => this.app.toggleScraper(),
        disabled: true,
        style: {
          margin: '0',
          minWidth: '150px',
          padding: '12px 20px',
          fontSize: '15px',
        },
      },
      'Start Scraper'
    );

    container.appendChild(this.startStopScraperButton);
    return container;
  }

  _buildOverlayTuning() {
    const app = this.app;
    const tuningWrap = makeElement('div', {
      style: {
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #444',
      },
    });
    const tuningTitle = makeElement(
      'div',
      { style: { fontWeight: 'bold', color: '#9dd7ff', marginBottom: '8px' } },
      'Overlay Tuning'
    );

    const barsRow = this.makeSliderRow(
      'Bars height',
      0,
      100,
      app.overlayBarsPercent,
      (n) => {
        app.overlayBarsPercent = n;
        app.saveOverlayPrefs();
        if (app.pianoDialog && app.pianoSvg) app.redrawPianoOverlay();
      }
    );

    const pianoRow = this.makeSliderRow(
      'Piano height',
      0,
      100,
      app.overlayPianoPercent,
      (n) => {
        app.overlayPianoPercent = n;
        app.saveOverlayPrefs();
        if (app.pianoDialog && app.pianoSvg) app.redrawPianoOverlay();
      }
    );

    const whiteLaneRow = this.makeSliderRow(
      'White lanes',
      25,
      200,
      Math.round((app.whiteLaneWidthScale || 1) * 100),
      (n) => {
        app.whiteLaneWidthScale = n / 100;
        app.saveOverlayPrefs();
        if (app.pianoDialog && app.pianoSvg) app.redrawPianoOverlay();
      }
    );

    const blackLaneRow = this.makeSliderRow(
      'Black lanes',
      25,
      200,
      Math.round((app.blackLaneWidthScale || 1) * 100),
      (n) => {
        app.blackLaneWidthScale = n / 100;
        app.saveOverlayPrefs();
        if (app.pianoDialog && app.pianoSvg) app.redrawPianoOverlay();
      }
    );

    app.overlayBarsPercentSlider = barsRow.inputEl;
    app.overlayBarsPercentValue = barsRow.valueEl;
    app.overlayPianoPercentSlider = pianoRow.inputEl;
    app.overlayPianoPercentValue = pianoRow.valueEl;
    app.whiteLaneWidthScaleSlider = whiteLaneRow.inputEl;
    app.whiteLaneWidthScaleValue = whiteLaneRow.valueEl;
    app.blackLaneWidthScaleSlider = blackLaneRow.inputEl;
    app.blackLaneWidthScaleValue = blackLaneRow.valueEl;

    tuningWrap.appendChild(tuningTitle);
    tuningWrap.appendChild(barsRow.row);
    tuningWrap.appendChild(pianoRow.row);
    tuningWrap.appendChild(whiteLaneRow.row);
    tuningWrap.appendChild(blackLaneRow.row);

    return tuningWrap;
  }

  _buildColorCalibrationRow() {
    const app = this.app;
    const colorWrap = makeElement('div', {
      style: {
        padding: '10px',
        background: '#252525',
        borderRadius: '6px',
      },
    });

    const colorTitle = makeElement(
      'div',
      {
        style: {
          fontWeight: 'bold',
          color: '#bb86fc',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      'Color Calibration',
      makeElement(
        'button',
        {
          onclick: () => app.startColorCalibration(),
          style: { padding: '4px 8px', fontSize: '11px', margin: '0' },
        },
        'Calibrate via Snapshot'
      )
    );

    this.swatchEls = {};
    const swatches = [
      { id: 'bg', label: 'Background' },
      { id: 'wn1', label: 'White Note 1' },
      { id: 'wn2', label: 'White Note 2' },
      { id: 'bn1', label: 'Black Note 1' },
      { id: 'bn2', label: 'Black Note 2' },
    ];

    const swatchContainer = makeElement('div', {
      style: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
    });

    swatches.forEach((s) => {
      const initialColor =
        app.colorCalibration && app.colorCalibration[s.id]
          ? app.colorCalibration[s.id]
          : '#000000';
      const box = makeElement('div', {
        style: {
          width: '32px',
          height: '32px',
          border: '1px solid #555',
          borderRadius: '4px',
          background: initialColor,
        },
      });
      this.swatchEls[s.id] = box;
      const wrap = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          },
        },
        makeElement(
          'span',
          { style: { fontSize: '10px', color: '#ccc' } },
          s.label
        ),
        box
      );
      swatchContainer.appendChild(wrap);
    });

    colorWrap.appendChild(colorTitle);
    colorWrap.appendChild(swatchContainer);
    return colorWrap;
  }

  ensureDialog() {
      const app = this.app;
      if (
        app.videoDialog &&
        app.videoDialog.element &&
        document.body.contains(app.videoDialog.element)
      )
        return;

      const targetId = 'yt-player-target-' + Date.now();
      app.playerHost = makeElement(
        'div',
        { className: 'yt-video-inner' },
        makeElement('div', { id: targetId })
      );
      app._playerTargetId = targetId;

      app.videoContainer = makeElement('div', { className: 'yt-video-wrapper' });
      app.videoContainer.appendChild(app.playerHost);

      app.videoDialog = UITools.makeDialog({
        env: app.env,
        title: 'YouTube Video',
        contentElement: app.videoContainer,
        size: [640, 400],
        position: [80, 120],
        stateId: 'midi_scraper_video_dialog',
        noPadding: true,
        buttons: [],
        onGeometryChange: () => app.resizeVideoToFit(),
        onClose: () => {
          app.videoDialog = null;
          app.videoContainer = null;
          app.playerHost = null;
          app.ytPlayer = null;
          app.ytReady = false;
          if (app.positionTimer) {
            clearInterval(app.positionTimer);
            app.positionTimer = null;
          }
        },
      });
      setTimeout(() => app.resizeVideoToFit(), 0);
    }

  showPianoOverlay() {
      const app = this.app;
      if (
        app.pianoDialog &&
        app.pianoDialog.element &&
        document.body.contains(app.pianoDialog.element)
      ) {
        app.pianoDialog.setZOnTop();
        return;
      }

      const svgNS = 'http://www.w3.org/2000/svg';
      const wrapper = makeElement('div', {
        className: 'midi-overlay-root',
        style: {
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: 'transparent',
        },
      });

      app.pianoBaseSvg = document.createElementNS(svgNS, 'svg');
      app.pianoBaseSvg.setAttribute('xmlns', svgNS);
      app.pianoBaseSvg.style.position = 'absolute';
      app.pianoBaseSvg.style.left = '0';
      app.pianoBaseSvg.style.width = '100%';
      app.pianoBaseSvg.style.pointerEvents = 'none';
      app.pianoBaseSvg.style.overflow = 'visible';

      app.pianoSvg = document.createElementNS(svgNS, 'svg');
      app.pianoSvg.setAttribute('xmlns', svgNS);
      app.pianoSvg.style.position = 'absolute';
      app.pianoSvg.style.left = '0';
      app.pianoSvg.style.top = '0';
      app.pianoSvg.style.width = '100%';
      app.pianoSvg.style.height = '100%';
      app.pianoSvg.style.pointerEvents = 'none';
      app.pianoSvg.style.overflow = 'visible';

      wrapper.appendChild(app.pianoBaseSvg);
      wrapper.appendChild(app.pianoSvg);

      app.graphicPiano = new GraphicPiano(app.pianoBaseSvg, {
        startMidi: 36,
        endMidi: 83,
        padding: [10, 10],
        keySpacing: 1,
        cornerRadius: 2,
        blackKeyHeightRatio: 0.62,
      });

      app.pianoSvg.addEventListener('mousedown', (e) => {
        if (app.activeColorSwatch) app.handleOverlayClick(e);
      });

      app.pianoDialog = UITools.makeDialog({
        env: app.env,
        title: 'Piano Overlay',
        contentElement: wrapper,
        size: [820, 260],
        position: [80, 540],
        stateId: 'midi_scraper_overlay_dialog',
        noPadding: true,
        transparent: true,
        allowTransparency: true,
        buttons: [],
        onGeometryChange: () => app.redrawPianoOverlay(),
        onClose: () => {
          app.pianoDialog = null;
          app.pianoSvg = null;
          app.pianoBaseSvg = null;
          app.graphicPiano = null;
          app.registrationMarks = [];
          app.overlayControls = null;
          app.sampleMarkers = null;
          app.fallingLaneMarkers = null;
        },
      });

      setTimeout(() => app.redrawPianoOverlay(), 0);
    }

  getOverlayPrefsKey() {
    return 'MidiScraper.pianoOverlayPrefs.v1';
  }

  loadOverlayPrefs() {
    const app = this.app;
    let prefs = {};
    try {
      prefs =
        JSON.parse(localStorage.getItem(this.getOverlayPrefsKey()) || '{}') ||
        {};
    } catch (e) {
      prefs = {};
    }

    app.overlayPrefs = prefs;
    app.overlayBarsPercent =
      typeof prefs.overlayBarsPercent === 'number'
        ? prefs.overlayBarsPercent
        : app.overlayBarsPercent || 50;
    app.overlayPianoPercent =
      typeof prefs.overlayPianoPercent === 'number'
        ? prefs.overlayPianoPercent
        : app.overlayPianoPercent || 30;
    app.whiteLaneWidthScale =
      typeof prefs.whiteLaneWidthScale === 'number'
        ? prefs.whiteLaneWidthScale
        : app.whiteLaneWidthScale || 1;
    app.blackLaneWidthScale =
      typeof prefs.blackLaneWidthScale === 'number'
        ? prefs.blackLaneWidthScale
        : app.blackLaneWidthScale || 1;
    app.colorTolerance =
      typeof prefs.colorTolerance === 'number' ? prefs.colorTolerance : 45;
    app.minNoteSaturation =
      typeof prefs.minNoteSaturation === 'number'
        ? prefs.minNoteSaturation
        : 0.05;
    app.gapTolerancePx =
      typeof prefs.gapTolerancePx === 'number' ? prefs.gapTolerancePx : 40;
    app.maxNotesToScrape =
      typeof prefs.maxNotesToScrape === 'number' ? prefs.maxNotesToScrape : 0;
    app.fallingBarSampleRate =
      typeof prefs.fallingBarSampleRate === 'number'
        ? prefs.fallingBarSampleRate
        : 66;

    app.laneScrapingEnabled =
      typeof prefs.laneScrapingEnabled === 'boolean'
        ? prefs.laneScrapingEnabled
        : false;
    app.pianoStartKey = prefs.pianoStartKey || 'C';
    const map = { C: 36, D: 38, E: 40, F: 41, G: 31, A: 33, B: 35 };
    app.pianoStartMidi = map[app.pianoStartKey] || 36;
    app.selectedPlaybackRate =
      typeof prefs.selectedPlaybackRate === 'number'
        ? prefs.selectedPlaybackRate
        : 0.5;
    app.stopOffsetSeconds =
      typeof prefs.stopOffsetSeconds === 'number' ? prefs.stopOffsetSeconds : 3;

    app.colorCalibration = prefs.colorCalibration || {
      bg: '#000000',
      wn1: '#ffffff',
      wn2: '#dddddd',
      bn1: '#ff0000',
      bn2: '#00ff00',
    };
  }

  saveOverlayPrefs() {
    const app = this.app;
    const prefs = {
      lastVideoId: app.overlayPrefs ? app.overlayPrefs.lastVideoId : null,
      overlayBarsPercent: app.overlayBarsPercent,
      overlayPianoPercent: app.overlayPianoPercent,
      whiteLaneWidthScale: app.whiteLaneWidthScale || 1,
      blackLaneWidthScale: app.blackLaneWidthScale || 1,
      colorTolerance: app.colorTolerance,
      minNoteSaturation: app.minNoteSaturation,
      gapTolerancePx: app.gapTolerancePx,
      maxNotesToScrape: app.maxNotesToScrape,
      fallingBarSampleRate: app.fallingBarSampleRate,
      laneScrapingEnabled: app.laneScrapingEnabled !== false,
      pianoStartKey: app.pianoStartKey,
      selectedPlaybackRate: app.selectedPlaybackRate,
      stopOffsetSeconds: app.stopOffsetSeconds,
      colorCalibration: app.colorCalibration,
    };
    try {
      localStorage.setItem(this.getOverlayPrefsKey(), JSON.stringify(prefs));
    } catch (e) {}
  }

  showLaneInspectorDialog() {
      const app = this.app;
      if (
        app.laneInspectorDialog &&
        app.laneInspectorDialog.element &&
        document.body.contains(app.laneInspectorDialog.element)
      ) {
        app.laneInspectorDialog.setZOnTop();
        return;
      }

      const content = makeElement('div', {
        style: {
          width: '100%',
          minWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        },
      });
      const intro = makeElement(
        'div',
        { style: { color: '#bbb', fontSize: '13px', lineHeight: '1.4' } },
        'Enable Capture Feed once, then pause the video anywhere you want and analyze frames repeatedly without reopening the browser permission dialog. You can also type a Y coordinate to draw a horizontal guide line across the overlay.'
      );

      const row = makeElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        },
      });
      const midiLabel = makeElement(
        'label',
        { style: { margin: '0', color: '#ccc', fontWeight: 'normal' } },
        'MIDI code:'
      );
      const noteNameDisplay = makeElement(
        'span',
        {
          id: 'lane-inspect-note-name',
          style: {
            marginLeft: '8px',
            color: '#ffb7f1',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            width: '30px',
            display: 'inline-block',
          },
        },
        app.midiToNoteName(66)
      );

      app.laneInspectorMidiInput = makeElement('input', {
        type: 'number',
        value: '66',
        min: '0',
        max: '127',
        style: {
          width: '60px',
          padding: '6px',
          background: '#1a1a1a',
          color: '#eee',
          border: '1px solid #555',
          borderRadius: '4px',
        },
        oninput: (e) => {
          const midi = parseInt(e.target.value, 10);
          noteNameDisplay.textContent = app.midiToNoteName(midi);
          if (app.highlightLane) app.highlightLane(midi);
        },
        onkeydown: (e) => {
          if (e.key === 'Enter') {
            const midi = parseInt(app.laneInspectorMidiInput.value, 10);
            app.inspectLaneForMidi(midi);
          }
        },
      });

      const analyzeButton = makeElement(
        'button',
        {
          onclick: () => {
            const midi = parseInt(app.laneInspectorMidiInput.value, 10);
            app.inspectLaneForMidi(midi);
          },
        },
        'Analyze Paused Frame'
      );

      const copyInfoBtn = makeElement(
        'button',
        {
          style: { marginLeft: 'auto', background: '#007acc' },
          onclick: async () => {
            const midi = parseInt(app.laneInspectorMidiInput.value, 10);
            if (!app.lastLaneInspection || app.lastLaneInspection.midi !== midi) {
              await app.inspectLaneForMidi(midi);
            }
            const res = app.lastLaneInspection;
            if (!res) return;
            const concise = {
              midi: res.midi,
              isBlack: res.isBlack,
              laneWidth: res.laneWidth,
              sampleYTop: res.sampleYTop,
              sampleYBottom: res.sampleYBottom,
              strikeY: res.strikeY,
              leftRuns: res.left.runs.map((r) => ({
                topY: r.topY,
                bottomY: r.bottomY,
              })),
              rightRuns: res.right.runs.map((r) => ({
                topY: r.topY,
                bottomY: r.bottomY,
              })),
              sharedRuns: res.sharedRuns.map((r) => ({
                topY: r.topY,
                bottomY: r.bottomY,
              })),
            };
            await app.copyTextToClipboard(JSON.stringify(concise, null, 2));
            copyInfoBtn.textContent = 'Copied!';
            setTimeout(
              () => (copyInfoBtn.textContent = 'Copy Concise Info'),
              1500
            );
          },
        },
        'Copy Concise Info'
      );

      const copyScrapeDiagBtn = makeElement(
        'button',
        {
          style: { marginLeft: '8px', background: '#8e24aa' },
          onclick: async () => {
            const midi = parseInt(app.laneInspectorMidiInput.value, 10);
            const report = app.generateLaneDiagnosticReport(midi);
            const ok = await app.copyTextToClipboard(report);
            copyScrapeDiagBtn.textContent = ok ? 'Copied!' : 'Failed';
            setTimeout(
              () => (copyScrapeDiagBtn.textContent = 'Copy Scrape Diagnostics'),
              1500
            );
          },
        },
        'Copy Scrape Diagnostics'
      );

      const yLabel = makeElement(
        'label',
        { style: { margin: '0 0 0 10px', color: '#ccc', fontWeight: 'normal' } },
        'Guide Y:'
      );
      app.laneInspectorGuideYInput = makeElement('input', {
        type: 'number',
        step: '0.1',
        placeholder: 'e.g. 142.5',
        style: {
          width: '90px',
          padding: '6px',
          background: '#1a1a1a',
          color: '#eee',
          border: '1px solid #555',
          borderRadius: '4px',
        },
        oninput: () => {
          const raw = app.laneInspectorGuideYInput.value.trim();
          if (!raw) {
            app.clearGuideLine();
            return;
          }
          app.setGuideLineY(raw);
        },
      });

      row.appendChild(midiLabel);
      row.appendChild(app.laneInspectorMidiInput);
      row.appendChild(noteNameDisplay);
      row.appendChild(analyzeButton);
      row.appendChild(yLabel);
      row.appendChild(app.laneInspectorGuideYInput);
      row.appendChild(copyInfoBtn);
      row.appendChild(copyScrapeDiagBtn);

      app.laneInspectorOutput = makeElement('textarea', {
        style: {
          width: '100%',
          minHeight: '360px',
          background: '#111',
          color: '#9dd7ff',
          border: '1px solid #555',
          borderRadius: '4px',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.35',
          boxSizing: 'border-box',
          resize: 'vertical',
        },
      });

      const captureActive = app.hasSharedCapture();
      app.laneInspectorOutput.value = captureActive
        ? 'Capture feed is ON.\n\nPause the video on a frame you care about, then click Analyze Paused Frame as many times as you want.'
        : 'Capture feed is OFF.\n\nClick "Enable Capture Feed" first, then pause the video on a frame you care about and click Analyze Paused Frame.';

      content.appendChild(intro);
      content.appendChild(row);
      content.appendChild(app.laneInspectorOutput);

      app.laneInspectorDialog = UITools.makeDialog({
        env: app.env,
        title: 'Lane Inspector',
        contentElement: content,
        size: [950, 520],
        position: [740, 120],
        stateId: 'midi_scraper_lane_inspector_dialog',
        buttons: [],
        onClose: () => {
          app.clearGuideLine();
          if (app.highlightLane) app.highlightLane(null);
          app.laneInspectorDialog = null;
          app.laneInspectorMidiInput = null;
          app.laneInspectorGuideYInput = null;
          app.laneInspectorOutput = null;
        },
      });

      setTimeout(() => {
        const midi = parseInt(app.laneInspectorMidiInput.value, 10);
        if (app.highlightLane) app.highlightLane(midi);
      }, 0);
    }

  showColorCalibrationDialog(snapCanvas) {
      const app = this.app;
      const sequence = [
        { id: 'bg', label: 'Background' },
        { id: 'wn1', label: 'White Note 1' },
        { id: 'wn2', label: 'White Note 2' },
        { id: 'bn1', label: 'Black Note 1' },
        { id: 'bn2', label: 'Black Note 2' },
      ];
      let currentIndex = 0;

      const dialogSwatches = {};
      const instructionsEl = makeElement('div', {
        style: { color: '#ffb7f1', fontWeight: 'bold', marginBottom: '10px' },
      });

      const updateHighlight = () => {
        if (currentIndex >= sequence.length) return;
        const currentId = sequence[currentIndex].id;
        instructionsEl.textContent = `Please click on the image to pick a color for: ${sequence[currentIndex].label}`;
        Object.keys(dialogSwatches).forEach((id) => {
          dialogSwatches[id].style.borderColor =
            id === currentId ? '#fff' : '#444';
          dialogSwatches[id].style.transform =
            id === currentId ? 'scale(1.1)' : 'scale(1)';
          dialogSwatches[id].style.boxShadow =
            id === currentId ? '0 0 8px rgba(255,255,255,0.5)' : 'none';
        });
      };

      const header = makeElement('div', {
        style: {
          display: 'flex',
          gap: '15px',
          marginBottom: '15px',
          padding: '10px',
          background: '#1a1a1a',
          borderRadius: '4px',
        },
      });

      sequence.forEach((s, idx) => {
        const initialColor = app.colorCalibration[s.id] || '#000000';
        const box = makeElement('div', {
          style: {
            width: '28px',
            height: '28px',
            border: '2px solid #444',
            borderRadius: '4px',
            cursor: 'pointer',
            background: initialColor,
            transition: 'all 0.2s',
          },
          onclick: () => {
            currentIndex = idx;
            updateHighlight();
          },
        });
        dialogSwatches[s.id] = box;
        const wrap = makeElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            },
          },
          makeElement(
            'span',
            { style: { fontSize: '10px', color: '#ccc' } },
            s.label
          ),
          box
        );
        header.appendChild(wrap);
      });

      snapCanvas.style.width = '100%';
      snapCanvas.style.height = 'auto';
      snapCanvas.style.cursor = 'crosshair';
      snapCanvas.style.display = 'block';
      snapCanvas.style.border = '1px solid #555';

      const snapCtx = snapCanvas.getContext('2d', { willReadFrequently: true });

      snapCanvas.onclick = (e) => {
        if (currentIndex >= sequence.length) return;
        const rect = snapCanvas.getBoundingClientRect();
        const scaleX = snapCanvas.width / rect.width;
        const scaleY = snapCanvas.height / rect.height;
        const x = Math.round((e.clientX - rect.left) * scaleX);
        const y = Math.round((e.clientY - rect.top) * scaleY);

        if (x < 0 || y < 0 || x >= snapCanvas.width || y >= snapCanvas.height)
          return;

        const p = snapCtx.getImageData(x, y, 1, 1).data;
        const hex =
          '#' +
          ((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2])
            .toString(16)
            .slice(1)
            .toUpperCase();

        const currentId = sequence[currentIndex].id;
        app.colorCalibration[currentId] = hex;
        app.saveOverlayPrefs();

        dialogSwatches[currentId].style.background = hex;
        if (this.swatchEls && this.swatchEls[currentId])
          this.swatchEls[currentId].style.background = hex;

        currentIndex++;
        if (currentIndex >= sequence.length) {
          if (app.colorCalibrationDialog) app.colorCalibrationDialog.close();
        } else {
          updateHighlight();
        }
      };

      const container = makeElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        instructionsEl,
        header,
        makeElement(
          'div',
          { style: { flexGrow: '1', overflow: 'auto', background: '#000' } },
          snapCanvas
        )
      );

      app.colorCalibrationDialog = UITools.makeDialog({
        env: app.env,
        title: 'Color Calibration',
        contentElement: container,
        size: [800, 600],
        position: [150, 100],
        stateId: 'midi_scraper_color_calibration',
        buttons: [
          {
            label: 'Done',
            onClick: () => {
              app.colorCalibrationDialog.close();
            },
          },
        ],
        onClose: () => {
          app.colorCalibrationDialog = null;
        },
      });

      updateHighlight();
    }

  showScrapeResultsDialog(notes) {
    const app = this.app;
    const safeNotes = Array.isArray(notes) ? notes : [];
    const rawExportText = app.formatTimedEventsExport(safeNotes, 'raw');
    const adjustedExportText = app.formatTimedEventsExport(
      safeNotes,
      'adjusted'
    );
    const diagnosticsText = app.formatTimedEventsDiagnostics(safeNotes);
    const rawNotesListText =
      app.exporters.formatRawKeyboardNotesList(safeNotes);

    const existing = document.getElementById('midi-scraper-export-panel');
    if (existing) existing.remove();

    const panel = makeElement('div', {
      id: 'midi-scraper-export-panel',
      style: {
        position: 'fixed',
        left: '20px',
        top: '20px',
        width: '900px',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        background: '#1b1b1b',
        border: '1px solid #666',
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        padding: '12px',
        zIndex: '2147483647',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      },
    });

    const titleRow = makeElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      },
    });
    const title = makeElement(
      'div',
      { style: { color: '#9dd7ff', fontWeight: 'bold', fontSize: '16px' } },
      `Timed Events Export (${safeNotes.length} notes)`
    );
    const closeButton = makeElement(
      'button',
      {
        onclick: () => {
          panel.remove();
        },
      },
      'Close'
    );

    titleRow.appendChild(title);
    titleRow.appendChild(closeButton);

    const modeRow = makeElement('div', {
      style: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
      },
    });
    const modeLabel = makeElement(
      'div',
      { style: { color: '#bbb', fontSize: '12px', minWidth: '110px' } },
      'View:'
    );
    const rawModeButton = makeElement(
      'button',
      {
        onclick: () => {
          setMode('raw');
        },
      },
      'Keyboard Raw'
    );
    const rawListModeButton = makeElement(
      'button',
      {
        onclick: () => {
          setMode('rawList');
        },
      },
      'Raw Notes List'
    );
    const adjustedModeButton = makeElement(
      'button',
      {
        onclick: () => {
          setMode('adjusted');
        },
      },
      'Baseline Adjusted'
    );
    const diagnosticsModeButton = makeElement(
      'button',
      {
        onclick: () => {
          setMode('diagnostics');
        },
      },
      'Diagnostics'
    );

    modeRow.appendChild(modeLabel);
    modeRow.appendChild(rawModeButton);
    modeRow.appendChild(rawListModeButton);
    modeRow.appendChild(adjustedModeButton);
    modeRow.appendChild(diagnosticsModeButton);

    const info = makeElement('div', {
      style: { color: '#bbb', fontSize: '12px', lineHeight: '1.45' },
    });
    const buttonRow = makeElement('div', {
      style: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
      },
    });

    const copyButton = makeElement(
      'button',
      {
        onclick: async () => {
          const ok = await app.copyTextToClipboard(ta.value);
          copyButton.textContent = ok ? 'Copied!' : 'Copy Failed';
          setTimeout(() => {
            copyButton.textContent =
              currentMode === 'raw'
                ? 'Copy Raw'
                : currentMode === 'rawList'
                ? 'Copy Raw Notes List'
                : currentMode === 'adjusted'
                ? 'Copy Adjusted'
                : 'Copy Diagnostics';
          }, 1200);
        },
      },
      'Copy Adjusted'
    );

    const selectButton = makeElement(
      'button',
      {
        onclick: () => {
          ta.focus();
          ta.select();
          ta.setSelectionRange(0, ta.value.length);
        },
      },
      'Select All'
    );

    buttonRow.appendChild(copyButton);
    buttonRow.appendChild(selectButton);

    const traceWrap = makeElement('div', {
      style: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        marginLeft: 'auto',
        background: '#252525',
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid #444',
      },
    });
    const traceLabel = makeElement(
      'span',
      { style: { color: '#ffb7f1', fontSize: '12px', fontWeight: 'bold' } },
      'Lane Scrape Trace:'
    );
    const traceMidiInput = makeElement('input', {
      type: 'number',
      placeholder: 'MIDI',
      style: {
        width: '50px',
        padding: '4px',
        background: '#101010',
        color: '#eee',
        border: '1px solid #555',
        borderRadius: '4px',
      },
    });
    const copyTraceBtn = makeElement(
      'button',
      {
        style: { background: '#2d7d46' },
        onclick: async () => {
          const midi = parseInt(traceMidiInput.value, 10);
          if (isNaN(midi)) return;
          const trace = app.generateLaneScrapeTrace(midi);
          if (
            trace &&
            (trace.rawFallingBlocksDetected.length > 0 ||
              trace.keyboardEventsAndMatching.length > 0)
          ) {
            const ok = await app.copyTextToClipboard(
              JSON.stringify(trace, null, 2)
            );
            copyTraceBtn.textContent = ok ? 'Copied!' : 'Failed';
          } else {
            copyTraceBtn.textContent = 'No Data';
          }
          setTimeout(() => (copyTraceBtn.textContent = 'Copy Trace'), 1500);
        },
      },
      'Copy Trace'
    );

    traceWrap.appendChild(traceLabel);
    traceWrap.appendChild(traceMidiInput);
    traceWrap.appendChild(copyTraceBtn);
    buttonRow.appendChild(traceWrap);

    const ta = makeElement('textarea', {
      style: {
        width: '100%',
        minHeight: '420px',
        maxHeight: 'calc(100vh - 220px)',
        background: '#101010',
        color: '#ffffff',
        border: '1px solid #555',
        borderRadius: '4px',
        padding: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        boxSizing: 'border-box',
        resize: 'vertical',
        whiteSpace: 'pre',
        tabSize: '4',
      },
      readOnly: true,
    });

    let currentMode = app.laneScrapingEnabled ? 'adjusted' : 'rawList';
    const setMode = (mode) => {
      currentMode =
        mode === 'raw' || mode === 'rawList' || mode === 'diagnostics'
          ? mode
          : 'adjusted';

      ta.value =
        currentMode === 'raw'
          ? rawExportText
          : currentMode === 'rawList'
          ? rawNotesListText
          : currentMode === 'diagnostics'
          ? diagnosticsText
          : adjustedExportText;

      rawModeButton.style.background =
        currentMode === 'raw' ? '#2d7d46' : '#03dac6';
      rawListModeButton.style.background =
        currentMode === 'rawList' ? '#2d7d46' : '#03dac6';
      adjustedModeButton.style.background =
        currentMode === 'adjusted' ? '#2d7d46' : '#03dac6';
      diagnosticsModeButton.style.background =
        currentMode === 'diagnostics' ? '#2d7d46' : '#03dac6';

      copyButton.textContent =
        currentMode === 'raw'
          ? 'Copy Raw'
          : currentMode === 'rawList'
          ? 'Copy Raw Notes List'
          : currentMode === 'diagnostics'
          ? 'Copy Diagnostics'
          : 'Copy Adjusted';

      if (currentMode === 'raw') {
        info.textContent =
          'Keyboard Raw: same note list, but exported using the unadjusted keyboard start/end timing.';
      } else if (currentMode === 'rawList') {
        info.textContent =
          'Raw Notes List: plain piano-scraper note list with kbStart, kbEnd, and kbDur for easy comparison when repeated notes seem merged.';
      } else if (currentMode === 'diagnostics') {
        info.textContent =
          'Diagnostics: one row per note showing keyboard timing, refined timing, final adjusted timing, the applied start correction, and whether refined start/duration were accepted.';
      } else {
        info.textContent =
          'Baseline Adjusted: first note stays raw. Simultaneous chord notes stay locked together. Large or suspicious start/duration corrections are rejected and fall back to keyboard timing.';
      }
    };

    panel.appendChild(titleRow);
    panel.appendChild(modeRow);
    panel.appendChild(info);
    panel.appendChild(buttonRow);
    panel.appendChild(ta);

    document.body.appendChild(panel);
    setMode(app.laneScrapingEnabled ? 'adjusted' : 'rawList');

    if (app && typeof app.updateStatus === 'function')
      app.updateStatus(`Export ready: ${safeNotes.length} notes.`);
    if (app && typeof app.setCaptureStatus === 'function')
      app.setCaptureStatus(`Export ready: ${safeNotes.length} notes.`);
  }

  showLaneDebugDialog(midi) {
      const app = this.app;
      const parsedMidi = Number(midi);
      const name = app.midiToNoteName(parsedMidi);
      const counts = app.laneScraper.laneSampleCounts
        ? app.laneScraper.laneSampleCounts.get(parsedMidi) || 0
        : 0;
      let maxLoops = 0;
      if (app.laneScraper.laneSampleCounts) {
        for (const val of app.laneScraper.laneSampleCounts.values()) {
          if (val > maxLoops) maxLoops = val;
        }
      }
      const logs =
        app.laneScraper.laneDebugLogs.get(parsedMidi) ||
        app.laneScraper.laneDebugLogs.get(String(parsedMidi)) ||
        [];
      const keysAvailable = Array.from(app.laneScraper.laneDebugLogs.keys()).join(
        ', '
      );
      const finishedRuns = app.laneScraper.finishedTrackedRuns.filter(
        (r) => r.midi === parsedMidi
      );

      let header = `=== DEBUG STATS ===\nTotal global sampling cycles: ${maxLoops}\nTimes THIS lane (MIDI ${parsedMidi}) was sampled: ${counts}\nMap keys in memory: ${
        keysAvailable || 'None'
      }\n\n=== FINALIZED TRACKED RUNS (${finishedRuns.length}) ===\n`;
      if (finishedRuns.length === 0) header += `None.\n`;
      else {
        finishedRuns.forEach((run, i) => {
          header += `#${i + 1} | Predicted Start: ${(run.startMs / 1000).toFixed(
            3
          )}s | End: ${(run.endMs / 1000).toFixed(3)}s | Dur: ${Math.round(
            run.durationMs
          )}ms | Obs: ${run.observations.length}\n`;
        });
      }
      header += `===================\n\n`;

      const textData =
        logs.length > 0
          ? logs.join('\n\n')
          : 'No falling bar data was collected for this lane during the scrape.';

      const ta = makeElement('textarea', {
        style: {
          width: '100%',
          height: '100%',
          backgroundColor: '#111111',
          color: '#ffffff',
          border: 'none',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '12px',
          boxSizing: 'border-box',
          resize: 'none',
        },
        readOnly: true,
      });
      ta.value = header + textData;

      UITools.makeDialog({
        env: app.env,
        title: `Raw Lane History: ${name} (MIDI ${parsedMidi})`,
        contentElement: ta,
        size: [700, 500],
        position: [150, 150],
        noPadding: true,
        buttons: [{ label: 'Close', onClick: (btn, dBox) => dBox.close() }],
      });
    }

  showFirstNoteFailureDialog(reportText) {
      const app = this.app;

      const ta = makeElement('textarea', {
        style: {
          width: '100%',
          height: '100%',
          backgroundColor: '#2a0a0a',
          color: '#ff9d9d',
          border: '1px solid #ff4444',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '13px',
          boxSizing: 'border-box',
          resize: 'none',
        },
        readOnly: true,
      });
      ta.value = reportText;

      UITools.makeDialog({
        env: app.env,
        title: 'Critical Scrape Failure',
        contentElement: ta,
        size: [750, 500],
        position: [100, 100],
        noPadding: true,
        buttons: [{ label: 'Acknowledge', onClick: (btn, dBox) => dBox.close() }],
      });
    }

  _buildDebugMidiRow() {
    const app = this.app;

    const row = makeElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px',
        background: '#252525',
        borderRadius: '6px',
      },
    });

    const cb = makeElement('input', {
      type: 'checkbox',
      id: 'debug-midi-only-cb',
    });

    const lbl = makeElement(
      'label',
      {
        htmlFor: 'debug-midi-only-cb',
        style: {
          color: '#ccc',
          fontSize: '12px',
          cursor: 'pointer',
          userSelect: 'none',
          margin: '0',
        },
      },
      'Debug single MIDI:'
    );

    const numInput = makeElement('input', {
      type: 'number',
      id: 'debug-midi-only-input',
      value: '60',
      min: '0',
      max: '127',
      style: {
        width: '52px',
        background: '#222',
        color: '#f5a623',
        border: '1px solid #555',
        borderRadius: '3px',
        padding: '4px 6px',
        fontSize: '12px',
      },
    });

    const noteName = makeElement(
      'span',
      {
        id: 'debug-midi-note-name',
        style: { color: '#f5a623', fontSize: '12px', minWidth: '32px' },
      },
      app.midiToNoteName(60)
    );

    const update = () => {
      const midi = parseInt(numInput.value, 10);
      if (cb.checked && Number.isFinite(midi) && midi >= 0 && midi <= 127) {
        app.debugMidiOnly = midi;
        noteName.textContent = app.midiToNoteName(midi);
        noteName.style.color = '#7dff8c';
        lbl.style.color = '#7dff8c';
      } else {
        app.debugMidiOnly = null;
        noteName.style.color = '#f5a623';
        lbl.style.color = '#ccc';
      }
    };

    cb.addEventListener('change', update);
    numInput.addEventListener('input', () => {
      noteName.textContent = app.midiToNoteName(parseInt(numInput.value, 10));
      if (cb.checked) update();
    });

    row.appendChild(cb);
    row.appendChild(lbl);
    row.appendChild(numInput);
    row.appendChild(noteName);
    return row;
  }

  _buildMainSettings() {
    const row = makeElement('div', {
      style: {
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap',
        marginBottom: '15px',
      },
    });

    const speedWrap = makeElement('div');
    speedWrap.appendChild(makeElement('label', 'Scrape Speed:'));
    this.app.captureRateSelect = makeElement(
      'select',
      {
        onchange: () => {
          const r = parseFloat(this.app.captureRateSelect.value) || 0.5;
          this.app.selectedPlaybackRate = r;
          this.app.saveOverlayPrefs();
          if (this.app.ytPlayer && this.app.ytPlayer.setPlaybackRate) {
            try {
              this.app.ytPlayer.setPlaybackRate(r);
              this.app.playbackRate = r;
            } catch (e) {}
          }
        },
      },
      makeElement('option', { value: '1' }, '100% speed'),
      makeElement('option', { value: '0.75' }, '75% speed'),
      makeElement('option', { value: '0.5' }, '50% speed'),
      makeElement('option', { value: '0.25' }, '25% speed')
    );
    this.app.captureRateSelect.value = String(
      this.app.selectedPlaybackRate || 0.5
    );
    speedWrap.appendChild(this.app.captureRateSelect);

    const keyWrap = makeElement('div');
    keyWrap.appendChild(makeElement('label', 'Piano Start Key:'));
    this.app.pianoStartKeySelect = makeElement(
      'select',
      {
        onchange: () => {
          this.app.pianoStartKey = this.app.pianoStartKeySelect.value;
          this.app.saveOverlayPrefs();
          const map = { C: 36, D: 38, E: 40, F: 41, G: 31, A: 33, B: 35 };
          this.app.pianoStartMidi = map[this.app.pianoStartKey] || 36;
          if (this.app.graphicPiano) {
            this.app.graphicPiano.updateSettings({
              startMidi: this.app.pianoStartMidi,
              endMidi: this.app.pianoStartMidi + 48,
            });
            this.app.graphicPiano.initialize();
            if (this.app.pianoDialog && this.app.pianoSvg)
              this.app.redrawPianoOverlay();
          }
        },
      },
      ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((k) =>
        makeElement('option', { value: k }, k)
      )
    );
    this.app.pianoStartKeySelect.value = this.app.pianoStartKey || 'C';
    keyWrap.appendChild(this.app.pianoStartKeySelect);

    const notesWrap = makeElement('div');
    notesWrap.appendChild(makeElement('label', 'Max Notes (0=All):'));
    notesWrap.appendChild(
      makeElement('input', {
        type: 'number',
        min: '0',
        step: '1',
        value: String(this.app.maxNotesToScrape || 0),
        style: { width: '60px' },
        onchange: (e) => {
          this.app.maxNotesToScrape = parseInt(e.target.value, 10) || 0;
          this.app.saveOverlayPrefs();
        },
      })
    );

    const stopWrap = makeElement('div');
    stopWrap.appendChild(makeElement('label', 'Stop Sec Before End:'));
    stopWrap.appendChild(
      makeElement('input', {
        type: 'number',
        min: '0',
        step: '0.5',
        value: String(
          this.app.stopOffsetSeconds !== undefined
            ? this.app.stopOffsetSeconds
            : 3
        ),
        style: { width: '60px' },
        onchange: (e) => {
          this.app.stopOffsetSeconds = parseFloat(e.target.value) || 0;
          this.app.saveOverlayPrefs();
        },
      })
    );

    row.appendChild(speedWrap);
    row.appendChild(keyWrap);
    row.appendChild(notesWrap);
    row.appendChild(stopWrap);
    return row;
  }

  showAdvancedSettingsDialog() {
      const app = this.app;
      if (app.advancedDialog) {
        app.advancedDialog.setZOnTop();
        return;
      }

      const content = makeElement('div', {
        style: {
          padding: '15px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          background: '#1e1e1e',
          color: '#eee',
        },
      });

      const laneScrapeWrap = makeElement('div', {
        style: {
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          background: '#2c2c2c',
          padding: '10px',
          borderRadius: '6px',
        },
      });
      const cb = makeElement('input', {
        type: 'checkbox',
        checked: app.laneScrapingEnabled,
      });
      cb.onchange = () => {
        app.laneScrapingEnabled = cb.checked;
        app.saveOverlayPrefs();
      };
      laneScrapeWrap.appendChild(cb);
      laneScrapeWrap.appendChild(
        makeElement(
          'label',
          { style: { color: '#03dac6', fontWeight: 'bold' } },
          'Enable Lane Scraping (Experimental)'
        )
      );
      content.appendChild(laneScrapeWrap);

      const settingsWrap = this._buildAdvancedSettingsRows();
      content.appendChild(settingsWrap);

      const colorCalibWrap = this._buildColorCalibrationRow();
      content.appendChild(colorCalibWrap);

      const debugMidiWrap = this._buildDebugMidiRow();
      content.appendChild(debugMidiWrap);

      const inspectBtn = makeElement(
        'button',
        {
          onclick: () => this.showLaneInspectorDialog(),
          style: {
            alignSelf: 'flex-start',
            background: '#bb86fc',
            color: '#000',
            fontWeight: 'bold',
          },
        },
        'Inspect Lane'
      );
      content.appendChild(inspectBtn);

      this.captureFpsStatusEl = makeElement(
        'div',
        { style: { color: '#888', fontFamily: 'monospace', marginTop: '10px' } },
        'fps: n/a'
      );
      content.appendChild(this.captureFpsStatusEl);

      app.advancedDialog = UITools.makeDialog({
        env: app.env,
        title: 'Advanced / Lane Scraping',
        contentElement: content,
        size: [500, 550],
        position: [100, 100],
        buttons: [],
        onClose: () => {
          app.advancedDialog = null;
          this.captureFpsStatusEl = null;
        },
      });
    }

  _buildAdvancedSettingsRows() {
    const app = this.app;
    const inputsRow = makeElement('div', {
      style: {
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap',
        padding: '10px',
        background: '#252525',
        borderRadius: '6px',
      },
    });

    const tolWrap = makeElement('div');
    tolWrap.appendChild(
      makeElement(
        'label',
        {
          style: {
            fontWeight: 'normal',
            fontSize: '12px',
            display: 'block',
            marginBottom: '4px',
          },
        },
        'Color Tolerance: '
      )
    );
    tolWrap.appendChild(
      makeElement('input', {
        type: 'number',
        min: '0',
        max: '255',
        step: '1',
        value: String(app.colorTolerance || 45),
        style: { width: '60px' },
        onchange: (e) => {
          app.colorTolerance = parseInt(e.target.value, 10) || 45;
          app.saveOverlayPrefs();
        },
      })
    );

    const satWrap = makeElement('div');
    satWrap.appendChild(
      makeElement(
        'label',
        {
          style: {
            fontWeight: 'normal',
            fontSize: '12px',
            display: 'block',
            marginBottom: '4px',
          },
        },
        'Min Saturation: '
      )
    );
    satWrap.appendChild(
      makeElement('input', {
        type: 'number',
        min: '0',
        max: '1',
        step: '0.01',
        value: String(
          app.minNoteSaturation !== undefined ? app.minNoteSaturation : 0.05
        ),
        style: { width: '60px' },
        onchange: (e) => {
          app.minNoteSaturation = parseFloat(e.target.value) || 0.05;
          app.saveOverlayPrefs();
        },
      })
    );

    const gapWrap = makeElement('div');
    gapWrap.appendChild(
      makeElement(
        'label',
        {
          style: {
            fontWeight: 'normal',
            fontSize: '12px',
            display: 'block',
            marginBottom: '4px',
          },
        },
        'Gap Bridge (px): '
      )
    );
    gapWrap.appendChild(
      makeElement('input', {
        type: 'number',
        min: '0',
        max: '200',
        step: '1',
        value: String(
          app.gapTolerancePx !== undefined ? app.gapTolerancePx : 40
        ),
        style: { width: '60px' },
        onchange: (e) => {
          app.gapTolerancePx = parseInt(e.target.value, 10) || 40;
          app.saveOverlayPrefs();
        },
      })
    );

    const rateWrap = makeElement('div');
    rateWrap.appendChild(
      makeElement(
        'label',
        {
          style: {
            fontWeight: 'normal',
            fontSize: '12px',
            display: 'block',
            marginBottom: '4px',
          },
        },
        'Falling Rate (ms): '
      )
    );
    rateWrap.appendChild(
      makeElement('input', {
        type: 'number',
        min: '16',
        max: '200',
        step: '1',
        value: String(app.fallingBarSampleRate || 66),
        style: { width: '60px' },
        onchange: (e) => {
          app.fallingBarSampleRate = parseInt(e.target.value, 10) || 66;
          app.saveOverlayPrefs();
        },
      })
    );

    inputsRow.appendChild(tolWrap);
    inputsRow.appendChild(satWrap);
    inputsRow.appendChild(gapWrap);
    inputsRow.appendChild(rateWrap);
    return inputsRow;
  }

  _buildQueueActions() {
    const qWrap = makeElement('div', {
      style: {
        marginTop: '15px',
        marginBottom: '15px',
        padding: '15px',
        background: '#252525',
        border: '1px solid #333',
        borderRadius: '6px',
      },
    });
    qWrap.appendChild(
      makeElement(
        'div',
        {
          style: { fontWeight: 'bold', color: '#03dac6', marginBottom: '10px' },
        },
        'Batch Queue'
      )
    );

    const row = makeElement('div', {
      style: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap',
      },
    });

    const inputWrap = makeElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '4px' },
    });
    inputWrap.appendChild(
      makeElement(
        'label',
        { style: { margin: 0, fontSize: '12px' } },
        'Target Music Video ID (Filename):'
      )
    );
    this.app.targetMusicVideoIdInput = makeElement('input', {
      type: 'text',
      placeholder: 'e.g. xKYhqo0GKqE',
    });
    inputWrap.appendChild(this.app.targetMusicVideoIdInput);

    const btnWrap = makeElement('div', {
      style: {
        display: 'flex',
        gap: '6px',
        alignItems: 'flex-end',
        height: '100%',
      },
    });

    const addBtn = makeElement(
      'button',
      {
        style: { margin: 0, height: '36px' },
        onclick: () => this.app.addCurrentToQueue(),
      },
      'Add to Queue'
    );

    const runBtn = makeElement(
      'button',
      {
        style: {
          margin: 0,
          height: '36px',
          background: '#bb86fc',
          color: '#000',
        },
        onclick: () => this.app.startQueue(),
      },
      'Start Queue'
    );

    const clearBtn = makeElement(
      'button',
      {
        style: {
          margin: 0,
          height: '36px',
          background: '#cf6679',
          color: '#000',
        },
        onclick: () => this.app.clearQueue(),
      },
      'Clear'
    );

    btnWrap.appendChild(addBtn);
    btnWrap.appendChild(runBtn);
    btnWrap.appendChild(clearBtn);

    row.appendChild(inputWrap);
    row.appendChild(btnWrap);

    this.app.queueStatusDiv = makeElement(
      'div',
      {
        style: {
          marginTop: '15px',
          fontSize: '12px',
          color: '#aaa',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          maxHeight: '100px',
          overflowY: 'auto',
        },
      },
      'Queue is empty.'
    );

    qWrap.appendChild(row);
    qWrap.appendChild(this.app.queueStatusDiv);
    return qWrap;
  }

  

  
}



