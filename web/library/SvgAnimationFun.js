class SvgAnimationFun {
  constructor() {
    this.settings = {
      // Whale settings
      speed: 80,
      wagSpeed: 0.005,
      wagAmplitude: 12,
      color: '#4facfe',
      glow: 4,
      // Vibes settings
      vibeText1: '#ffffff',
      vibeText2: '#aeeeff',
      vibeGlow1: '#00f3ff',
      vibeGlow2: '#ff00ea',
      vibeGlowSpread: 8,
      vibeBurstFreq: 50,
      vibeIntensity: 25,
      // Recursi Data settings
      recursiColor: '#00ffcc',
      recursiEchoColor: '#7000ff',
      recursiFreq: 40,
      // Recursi Tunnel settings
      tunnelFreq: 40,
      tunnelDepth: 20,
      // YOLO Glitch settings
      yoloFreq: 50,
      yoloIntensity: 15,
      yoloColor: '#ffea00',
      yoloGlow1: '#ff0055',
      yoloGlow2: '#00e5ff',
      // YOLO Zen settings
      zenSpeed: 10,
      zenColor1: '#ff9a9e',
      zenColor2: '#fecfef',
      zenColor3: '#a18cd1',
    };

    this.animationId = null;
    this.whaleX = -250;
    this.lastTime = performance.now();
    this.pathElements = {};

    // Vibes State
    this.lastBurstTime = 0;
    this.burstActive = false;
    this.burstStartTime = 0;
    this.sparkles = [];

    // Recursi Data State
    this.recursiEchoes = [];
    this.recursiMain = null;
    this.recursiBrackets = [];
    this.recursiBurstActive = false;
    this.recursiLastBurstTime = 0;
    this.recursiBurstStartTime = 0;
    this.scrambleChars = '/>!_-<#\\01{}[]*+^?X';
    this.targetRecursiText = 'recursi';

    // Recursi Tunnel State
    this.tunnelLayers = [];
    this.tunnelBurstActive = false;
    this.tunnelLastBurstTime = 0;
    this.tunnelBurstStartTime = 0;

    // YOLO Glitch State
    this.yoloLayers = [];
    this.yoloGroup = null;
    this.yoloBurstActive = false;
    this.yoloLastBurstTime = 0;
    this.yoloBurstStartTime = 0;

    // YOLO Zen State
    this.zenGroup = null;
    this.zenGrad = null;
    this.zenBack = null;

    // Handcrafted bezier curves for a realistic whale profile
    this.basePaths = {
      body: [
        { t: 'M', p: [[20, 30]] },
        {
          t: 'C',
          p: [
            [40, 12],
            [100, 10],
            [140, 22],
          ],
        },
        {
          t: 'C',
          p: [
            [160, 28],
            [175, 29],
            [185, 29],
          ],
        },
        {
          t: 'C',
          p: [
            [192, 22],
            [195, 12],
            [198, 12],
          ],
        },
        {
          t: 'C',
          p: [
            [194, 18],
            [190, 27],
            [188, 30],
          ],
        },
        {
          t: 'C',
          p: [
            [190, 33],
            [194, 42],
            [198, 48],
          ],
        },
        {
          t: 'C',
          p: [
            [196, 44],
            [192, 35],
            [185, 31],
          ],
        },
        {
          t: 'C',
          p: [
            [175, 31],
            [160, 32],
            [140, 38],
          ],
        },
        {
          t: 'C',
          p: [
            [100, 50],
            [50, 48],
            [30, 38],
          ],
        },
        {
          t: 'C',
          p: [
            [25, 35],
            [20, 32],
            [20, 30],
          ],
        },
      ],
      fin: [
        { t: 'M', p: [[95, 38]] },
        {
          t: 'C',
          p: [
            [105, 52],
            [115, 55],
            [125, 48],
          ],
        },
        {
          t: 'C',
          p: [
            [115, 45],
            [105, 40],
            [95, 38],
          ],
        },
      ],
      dorsal: [
        { t: 'M', p: [[125, 16]] },
        {
          t: 'C',
          p: [
            [130, 10],
            [135, 8],
            [140, 18],
          ],
        },
        {
          t: 'C',
          p: [
            [135, 16],
            [130, 17],
            [125, 16],
          ],
        },
      ],
      belly1: [
        { t: 'M', p: [[35, 38]] },
        {
          t: 'C',
          p: [
            [50, 43],
            [80, 45],
            [110, 38],
          ],
        },
      ],
      belly2: [
        { t: 'M', p: [[40, 40]] },
        {
          t: 'C',
          p: [
            [55, 45],
            [85, 47],
            [105, 41],
          ],
        },
      ],
      eye: [
        { t: 'M', p: [[35, 26]] },
        {
          t: 'C',
          p: [
            [38, 28],
            [42, 28],
            [45, 26],
          ],
        },
      ],
    };

    this.animate = this.animate.bind(this);
  }

  init(targetElement) {
    this.injectStyles();

    // 1. Build the dark ocean strip container (Whale)
    this.strip = makeElement('div', { className: 'ocean-strip' });
    this.buildSVG();
    this.strip.appendChild(this.svg);
    targetElement.appendChild(this.strip);

    // 2. Build the glowing 'vibes' SVG
    this.vibesContainer = this.buildVibesSVG();
    targetElement.appendChild(this.vibesContainer);

    // 3. Build the futuristic 'recursi' SVG
    this.recursiContainer = this.buildRecursiSVG();
    targetElement.appendChild(this.recursiContainer);

    // 4. Build the dimensional tunnel 'recursi' SVG
    this.tunnelContainer = this.buildRecursiTunnelSVG();
    targetElement.appendChild(this.tunnelContainer);

    // 5. Build the glitch 'YOLO' SVG
    this.yoloContainer = this.buildYoloSVG();
    targetElement.appendChild(this.yoloContainer);

    // 6. Build the relaxed Zen 'YOLO' SVG
    this.zenContainer = this.buildYoloZenSVG();
    targetElement.appendChild(this.zenContainer);

    // 7. Build the floating settings window
    this.buildSettingsBox();

    // 8. Kick off the vertex-animation loop
    this.animationId = requestAnimationFrame(this.animate);
  }

  injectStyles() {
    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Orbitron:wght@500;700&family=Righteous&family=Bungee&family=Quicksand:wght@700&display=swap');
      
      body {
        background-color: #030308;
        margin: 0;
        overflow-x: hidden;
        color: #ddd;
        font-family: system-ui, sans-serif;
      }
      .ocean-strip {
        position: fixed;
        top: 10%;
        left: 0;
        width: 100vw;
        height: 60px;
        transform: translateY(-50%);
        background: linear-gradient(90deg, #020205 0%, #0a0a25 50%, #020205 100%);
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.9) inset, 0 5px 15px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      .whale-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 200px;
        height: 60px;
        overflow: visible;
        will-change: transform;
      }
      .whale-path {
        stroke-width: 1.5px;
        stroke-linecap: round;
        stroke-linejoin: round;
        transition: stroke 0.3s ease;
      }
      .whale-eye {
        fill: none;
        stroke-width: 1.5px;
        stroke-linecap: round;
        transition: stroke 0.3s ease;
      }
      
      /* Settings UI */
      .settings-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 13px;
      }
      .settings-row input[type="range"] {
        width: 120px;
        cursor: pointer;
      }
      .settings-row input[type="color"] {
        background: none;
        border: 1px solid #555;
        border-radius: 4px;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 24px;
      }
      
      /* Vibes Styles */
      .vibes-container {
        position: fixed;
        top: calc(10% + 80px);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .vibes-svg {
        width: 160px;
        height: 60px;
        overflow: visible;
        user-select: none;
      }
      .vibe-text-layer {
        font-family: 'Caveat', cursive;
        font-size: 46px;
        font-weight: 700;
        dominant-baseline: central;
        text-anchor: middle;
        opacity: 0.6;
        mix-blend-mode: screen;
      }
      .vibe-text-main {
        font-family: 'Caveat', cursive;
        font-size: 46px;
        font-weight: 700;
        dominant-baseline: central;
        text-anchor: middle;
        filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));
      }

      /* Recursi Data Styles */
      .recursi-container {
        position: fixed;
        top: calc(10% + 160px);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .recursi-svg {
        width: 240px;
        height: 60px;
        overflow: visible;
        user-select: none;
      }
      .recursi-text-main {
        font-family: 'Orbitron', sans-serif;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 4px;
        dominant-baseline: central;
        text-anchor: middle;
        fill: #fff;
        filter: drop-shadow(0px 0px 8px rgba(0, 255, 204, 0.6));
      }
      .recursi-text-echo {
        font-family: 'Orbitron', sans-serif;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 4px;
        dominant-baseline: central;
        text-anchor: middle;
        fill: transparent;
        stroke-width: 1px;
        mix-blend-mode: screen;
        pointer-events: none;
      }
      .recursi-bracket {
        font-family: 'Orbitron', sans-serif;
        font-size: 28px;
        font-weight: 500;
        dominant-baseline: central;
        text-anchor: middle;
        fill: rgba(255, 255, 255, 0.3);
      }

      /* Recursi Tunnel Styles */
      .tunnel-container {
        position: fixed;
        top: calc(10% + 240px);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .tunnel-svg {
        width: 240px;
        height: 60px;
        overflow: visible;
        user-select: none;
      }
      .tunnel-layer {
        font-family: 'Righteous', cursive;
        font-size: 34px;
        letter-spacing: 3px;
        dominant-baseline: central;
        text-anchor: middle;
        fill: none;
        stroke-width: 1.5px;
        mix-blend-mode: screen;
        pointer-events: none;
      }
      .tunnel-front {
        font-family: 'Righteous', cursive;
        font-size: 34px;
        letter-spacing: 3px;
        dominant-baseline: central;
        text-anchor: middle;
        fill: #ffffff;
        filter: drop-shadow(0px 2px 6px rgba(0,0,0,0.8));
      }

      /* YOLO Glitch Styles */
      .yolo-container {
        position: fixed;
        top: calc(10% + 320px);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .yolo-svg {
        width: 200px;
        height: 60px;
        overflow: visible;
        user-select: none;
      }
      .yolo-layer {
        font-family: 'Bungee', cursive;
        font-size: 42px;
        dominant-baseline: central;
        text-anchor: middle;
        mix-blend-mode: screen;
      }

      /* YOLO Zen Styles */
      .zen-container {
        position: fixed;
        top: calc(10% + 400px);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .zen-svg {
        width: 200px;
        height: 60px;
        overflow: visible;
        user-select: none;
      }
      .zen-layer {
        font-family: 'Quicksand', sans-serif;
        font-size: 36px;
        font-weight: 700;
        letter-spacing: 8px;
        dominant-baseline: central;
        text-anchor: middle;
      }
      .zen-glow {
        filter: blur(8px);
        mix-blend-mode: screen;
      }
    `;
    applyCss(css, 'whale-animation-styles');
  }

  buildSVG() {
    this.svg = makeElement('svg:svg', {
      className: 'whale-svg',
      viewBox: '0 0 200 60',
      preserveAspectRatio: 'xMidYMid meet',
    });

    this.blurFilter = makeElement('svg:feGaussianBlur', {
      stdDeviation: this.settings.glow,
      result: 'coloredBlur',
    });

    const defs = makeElement('svg:defs', {}, [
      makeElement(
        'svg:filter',
        {
          id: 'whaleGlow',
          x: '-50%',
          y: '-50%',
          width: '200%',
          height: '200%',
        },
        [
          this.blurFilter,
          makeElement('svg:feMerge', {}, [
            makeElement('svg:feMergeNode', { in: 'coloredBlur' }),
            makeElement('svg:feMergeNode', { in: 'SourceGraphic' }),
          ]),
        ]
      ),
    ]);

    this.svg.appendChild(defs);

    const group = makeElement('svg:g', { filter: 'url(#whaleGlow)' });

    // Create a path element for each part of the whale
    for (const [key, _] of Object.entries(this.basePaths)) {
      const isBody = key === 'body';
      const isEye = key === 'eye';

      const pathEl = makeElement('svg:path', {
        className: isEye ? 'whale-eye' : 'whale-path',
        stroke: this.settings.color,
        fill: isBody ? 'rgba(255, 255, 255, 0.02)' : 'none',
      });

      this.pathElements[key] = pathEl;
      group.appendChild(pathEl);
    }

    this.svg.appendChild(group);
  }

  buildSettingsBox() {
    const content = makeElement(
      'div',
      { style: { padding: '5px', maxHeight: '600px', overflowY: 'auto' } },
      [
        // Section: Whale
        makeElement(
          'h4',
          { style: { margin: '0 0 10px 0', color: '#fff' } },
          'Whale Controls'
        ),
        this.createControl(
          'Swim Speed',
          'range',
          20,
          300,
          this.settings.speed,
          1,
          (v) => (this.settings.speed = v)
        ),
        this.createControl(
          'Tail Speed',
          'range',
          0.001,
          0.015,
          this.settings.wagSpeed,
          0.001,
          (v) => (this.settings.wagSpeed = v)
        ),
        this.createControl(
          'Tail Amp',
          'range',
          0,
          30,
          this.settings.wagAmplitude,
          1,
          (v) => (this.settings.wagAmplitude = v)
        ),
        this.createControl(
          'Glow',
          'range',
          0,
          10,
          this.settings.glow,
          0.5,
          (v) => {
            this.settings.glow = v;
            this.blurFilter.setAttribute('stdDeviation', v);
          }
        ),
        this.createControl(
          'Color',
          'color',
          null,
          null,
          this.settings.color,
          null,
          (v) => {
            this.settings.color = v;
            Object.values(this.pathElements).forEach((el) =>
              el.setAttribute('stroke', v)
            );
          }
        ),

        makeElement('hr', { style: { borderColor: '#444', margin: '15px 0' } }),

        // Section: Vibes
        makeElement(
          'h4',
          { style: { margin: '0 0 10px 0', color: '#fff' } },
          'Vibes Controls'
        ),
        this.createControl(
          'Burst Freq',
          'range',
          1,
          100,
          this.settings.vibeBurstFreq,
          1,
          (v) => (this.settings.vibeBurstFreq = v)
        ),
        this.createControl(
          'Distortion',
          'range',
          1,
          50,
          this.settings.vibeIntensity,
          1,
          (v) => (this.settings.vibeIntensity = v)
        ),
        this.createControl(
          'Cyan',
          'color',
          null,
          null,
          this.settings.vibeGlow1,
          null,
          (v) => {
            this.settings.vibeGlow1 = v;
            if (this.vibeLayer1) this.vibeLayer1.setAttribute('fill', v);
          }
        ),
        this.createControl(
          'Magenta',
          'color',
          null,
          null,
          this.settings.vibeGlow2,
          null,
          (v) => {
            this.settings.vibeGlow2 = v;
            if (this.vibeLayer2) this.vibeLayer2.setAttribute('fill', v);
          }
        ),

        makeElement('hr', { style: { borderColor: '#444', margin: '15px 0' } }),

        // Section: Recursi Data
        makeElement(
          'h4',
          { style: { margin: '0 0 10px 0', color: '#fff' } },
          'Recursi Data Controls'
        ),
        this.createControl(
          'Data Freq',
          'range',
          1,
          100,
          this.settings.recursiFreq,
          1,
          (v) => (this.settings.recursiFreq = v)
        ),
        this.createControl(
          'Text Glow',
          'color',
          null,
          null,
          this.settings.recursiColor,
          null,
          (v) => {
            this.settings.recursiColor = v;
            if (this.recursiMain)
              this.recursiMain.style.filter = `drop-shadow(0px 0px 8px ${v})`;
          }
        ),
        this.createControl(
          'Echo Hue',
          'color',
          null,
          null,
          this.settings.recursiEchoColor,
          null,
          (v) => {
            this.settings.recursiEchoColor = v;
            this.recursiEchoes.forEach((e) => e.setAttribute('stroke', v));
          }
        ),

        makeElement('hr', { style: { borderColor: '#444', margin: '15px 0' } }),

        // Section: Recursi Tunnel
        makeElement(
          'h4',
          { style: { margin: '0 0 10px 0', color: '#fff' } },
          'Recursi Tunnel Controls'
        ),
        this.createControl(
          'Tunnel Freq',
          'range',
          1,
          100,
          this.settings.tunnelFreq,
          1,
          (v) => (this.settings.tunnelFreq = v)
        ),
        this.createControl(
          'Tunnel Depth',
          'range',
          5,
          50,
          this.settings.tunnelDepth,
          1,
          (v) => (this.settings.tunnelDepth = v)
        ),

        makeElement('hr', { style: { borderColor: '#444', margin: '15px 0' } }),

        // Section: YOLO Glitch
        makeElement(
          'h4',
          { style: { margin: '0 0 10px 0', color: '#fff' } },
          'YOLO Glitch Controls'
        ),
        this.createControl(
          'Glitch Freq',
          'range',
          1,
          100,
          this.settings.yoloFreq,
          1,
          (v) => (this.settings.yoloFreq = v)
        ),
        this.createControl(
          'Intensity',
          'range',
          5,
          50,
          this.settings.yoloIntensity,
          1,
          (v) => (this.settings.yoloIntensity = v)
        ),
        this.createControl(
          'Main Color',
          'color',
          null,
          null,
          this.settings.yoloColor,
          null,
          (v) => {
            this.settings.yoloColor = v;
            if (this.yoloLayers[2]) this.yoloLayers[2].setAttribute('fill', v);
          }
        ),
        this.createControl(
          'Split 1',
          'color',
          null,
          null,
          this.settings.yoloGlow1,
          null,
          (v) => {
            this.settings.yoloGlow1 = v;
            if (this.yoloLayers[0]) this.yoloLayers[0].setAttribute('fill', v);
          }
        ),
        this.createControl(
          'Split 2',
          'color',
          null,
          null,
          this.settings.yoloGlow2,
          null,
          (v) => {
            this.settings.yoloGlow2 = v;
            if (this.yoloLayers[1]) this.yoloLayers[1].setAttribute('fill', v);
          }
        ),

        makeElement('hr', { style: { borderColor: '#444', margin: '15px 0' } }),

        // Section: YOLO Zen
        makeElement(
          'h4',
          { style: { margin: '0 0 10px 0', color: '#fff' } },
          'YOLO Zen Controls'
        ),
        this.createControl(
          'Flow Speed',
          'range',
          1,
          50,
          this.settings.zenSpeed,
          1,
          (v) => (this.settings.zenSpeed = v)
        ),
        this.createControl(
          'Sunset Rose',
          'color',
          null,
          null,
          this.settings.zenColor1,
          null,
          (v) => {
            this.settings.zenColor1 = v;
            if (this.zenStop1) this.zenStop1.setAttribute('stop-color', v);
          }
        ),
        this.createControl(
          'Sunset Violet',
          'color',
          null,
          null,
          this.settings.zenColor3,
          null,
          (v) => {
            this.settings.zenColor3 = v;
            if (this.zenStop3) this.zenStop3.setAttribute('stop-color', v);
          }
        ),
        this.createControl(
          'Sunset Peach',
          'color',
          null,
          null,
          this.settings.zenColor2,
          null,
          (v) => {
            this.settings.zenColor2 = v;
            if (this.zenStop2) this.zenStop2.setAttribute('stop-color', v);
          }
        ),
      ]
    );

    this.dialog = UITools.makeDialog({
      title: 'Animation Controls',
      content: content,
      width: '320px',
      position: [20, 20],
      transparent: true,
      allowMaximize: false,
    });
  }

  createControl(label, type, min, max, val, step, onChange) {
    const inputOpts = {
      type,
      value: val,
      oninput: (e) =>
        onChange(
          type === 'color' ? e.target.value : parseFloat(e.target.value)
        ),
    };
    if (min !== null) inputOpts.min = min;
    if (max !== null) inputOpts.max = max;
    if (step !== null) inputOpts.step = step;

    return makeElement('div', { className: 'settings-row' }, [
      makeElement('label', label),
      makeElement('input', inputOpts),
    ]);
  }

  generatePathData(basePathArray, time) {
    let d = '';
    const wAmp = this.settings.wagAmplitude / 10;
    const waveFrequency = 6;

    basePathArray.forEach((cmd) => {
      d += cmd.t + ' ';
      cmd.p.forEach((pt) => {
        const x = pt[0];
        const y = pt[1];

        // Normalize X coordinate (0 is nose, 1 is tail tip)
        const nx = x / 200;

        // Exponential amplitude: nose barely moves, tail wags significantly
        const localAmp = wAmp * (0.15 + Math.pow(nx, 2.5) * 6);

        // Calculate phase based on time and horizontal position to create a traveling wave
        const phase = time * this.settings.wagSpeed - nx * waveFrequency;
        const yOffset = Math.sin(phase) * localAmp;

        // Overall vertical bobbing for the entire whale
        const swimOffset = Math.sin(time * this.settings.wagSpeed * 0.3) * 3;

        d += `${x},${(y + yOffset + swimOffset).toFixed(2)} `;
      });
    });

    return d.trim();
  }

  animate(time) {
    const delta = time - this.lastTime;
    this.lastTime = time;

    // ----- WHALE ANIMATION -----
    this.whaleX -= (delta * this.settings.speed) / 1000;
    if (this.whaleX < -300) {
      this.whaleX = window.innerWidth + 50;
    }
    if (this.svg) {
      this.svg.style.transform = `translateX(${this.whaleX}px)`;
    }

    for (const [key, basePath] of Object.entries(this.basePaths)) {
      if (this.pathElements[key]) {
        const newDString = this.generatePathData(basePath, time);
        this.pathElements[key].setAttribute('d', newDString);
      }
    }

    // ----- VIBES BURST LOGIC -----
    if (!this.lastBurstTime) this.lastBurstTime = time;
    const freqFactor = this.settings.vibeBurstFreq / 50;

    if (
      !this.burstActive &&
      time - this.lastBurstTime > 3000 &&
      Math.random() < 0.002 * freqFactor
    ) {
      this.burstActive = true;
      this.burstStartTime = time;
    }

    let distortion = 0.5;
    let layerOffset = 0;

    if (this.burstActive) {
      let burstT = time - this.burstStartTime;
      let duration = 2000;
      if (burstT < duration) {
        let env = Math.sin((burstT / duration) * Math.PI);
        distortion = 0.5 + env * this.settings.vibeIntensity;
        layerOffset = env * (this.settings.vibeIntensity / 3);
        if (this.vibeTurbulence)
          this.vibeTurbulence.setAttribute(
            'baseFrequency',
            (0.05 + env * 0.05).toString()
          );
      } else {
        this.burstActive = false;
        this.lastBurstTime = time;
        if (this.vibeTurbulence)
          this.vibeTurbulence.setAttribute('baseFrequency', '0.05');
      }
    }

    if (this.vibeDisplacementMap) {
      this.vibeDisplacementMap.setAttribute('scale', distortion.toString());
      if (this.vibeLayer1)
        this.vibeLayer1.setAttribute(
          'transform',
          `translate(${-layerOffset}, ${layerOffset})`
        );
      if (this.vibeLayer2)
        this.vibeLayer2.setAttribute(
          'transform',
          `translate(${layerOffset}, ${-layerOffset})`
        );
    }

    this.sparkles.forEach((s) => {
      const scale =
        Math.max(0, Math.sin(time * 0.003 + s.offset)) *
        (this.burstActive ? 1.5 : 0.8);
      s.el.setAttribute(
        'transform',
        `translate(${s.x}, ${s.y}) scale(${scale})`
      );
      s.el.setAttribute('fill', this.settings.vibeText1);
    });

    // ----- RECURSI DATA-ECHO LOGIC -----
    if (!this.recursiLastBurstTime) this.recursiLastBurstTime = time;
    const recFreqFactor = this.settings.recursiFreq / 50;

    if (
      !this.recursiBurstActive &&
      time - this.recursiLastBurstTime > 4000 &&
      Math.random() < 0.0015 * recFreqFactor
    ) {
      this.recursiBurstActive = true;
      this.recursiBurstStartTime = time;
    }

    if (this.recursiBurstActive) {
      let bTime = time - this.recursiBurstStartTime;
      let duration = 1800;

      if (bTime < duration) {
        let progress = bTime / duration;
        let easeOut = 1 - Math.pow(1 - progress, 3);
        let bellCurve = Math.sin(progress * Math.PI);

        if (progress > 0.1 && progress < 0.8 && Math.random() > 0.4) {
          let scrambled = '';
          for (let i = 0; i < this.targetRecursiText.length; i++) {
            scrambled +=
              Math.random() > 0.6
                ? this.targetRecursiText[i]
                : this.scrambleChars[
                    Math.floor(Math.random() * this.scrambleChars.length)
                  ];
          }
          this.recursiMain.textContent = scrambled;
          this.recursiMain.setAttribute('x', 120 + (Math.random() * 4 - 2));
        } else {
          this.recursiMain.textContent = this.targetRecursiText;
          this.recursiMain.setAttribute('x', 120);
        }

        this.recursiBrackets[0].setAttribute('x', 25 - bellCurve * 20);
        this.recursiBrackets[1].setAttribute('x', 215 + bellCurve * 20);

        this.recursiEchoes.forEach((echo, i) => {
          let echoProgress = Math.max(0, easeOut - i * 0.15);
          let scale = 1 + echoProgress * 0.5 * (i + 1);
          let opac = Math.max(0, (1 - echoProgress) * 0.6);

          echo.setAttribute(
            'transform',
            `translate(120, 32) scale(${scale}) translate(-120, -32)`
          );
          echo.setAttribute('opacity', opac.toString());
        });
      } else {
        this.recursiBurstActive = false;
        this.recursiLastBurstTime = time;
        this.recursiMain.textContent = this.targetRecursiText;
        this.recursiMain.setAttribute('x', 120);
        this.recursiBrackets[0].setAttribute('x', 25);
        this.recursiBrackets[1].setAttribute('x', 215);
        this.recursiEchoes.forEach((e) => {
          e.setAttribute('opacity', '0');
          e.setAttribute('transform', '');
        });
      }
    } else {
      let floatY = Math.sin(time * 0.001) * 2;
      this.recursiMain.setAttribute('y', 32 + floatY);
      this.recursiBrackets[0].setAttribute('y', 30 + floatY);
      this.recursiBrackets[1].setAttribute('y', 30 + floatY);
    }

    // ----- RECURSI DIMENSIONAL TUNNEL LOGIC -----
    if (!this.tunnelLastBurstTime) this.tunnelLastBurstTime = time;
    const tunnelFreqFactor = this.settings.tunnelFreq / 50;

    if (
      !this.tunnelBurstActive &&
      time - this.tunnelLastBurstTime > 4500 &&
      Math.random() < 0.001 * tunnelFreqFactor
    ) {
      this.tunnelBurstActive = true;
      this.tunnelBurstStartTime = time;
    }

    if (this.tunnelBurstActive) {
      let tTime = time - this.tunnelBurstStartTime;
      let duration = 2500;

      if (tTime < duration) {
        let env = Math.sin((tTime / duration) * Math.PI);
        let snapEnv = Math.pow(env, 1.5);
        let maxDepth = this.settings.tunnelDepth;

        this.tunnelLayers.forEach((layer, i) => {
          let j = 5 - i;
          let xShift = j * (maxDepth * 0.6) * snapEnv;
          let yShift = j * (maxDepth * 0.2) * snapEnv;
          let scale = 1 - j * 0.06 * snapEnv;
          let rotation = j * -3 * snapEnv;

          let transformStr = `translate(${xShift}, ${yShift}) translate(120, 30) scale(${scale}) rotate(${rotation}) translate(-120, -30)`;
          layer.setAttribute('transform', transformStr);

          if (i < 5) {
            layer.setAttribute('opacity', (0.1 + 0.9 * env).toString());
          }
        });
      } else {
        this.tunnelBurstActive = false;
        this.tunnelLastBurstTime = time;
        this.tunnelLayers.forEach((layer) => {
          layer.setAttribute('transform', '');
          layer.setAttribute('opacity', '1');
        });
      }
    }

    // ----- YOLO GLITCH LOGIC -----
    if (!this.yoloLastBurstTime) this.yoloLastBurstTime = time;
    const yoloFreqFactor = this.settings.yoloFreq / 50;

    if (
      !this.yoloBurstActive &&
      time - this.yoloLastBurstTime > 3000 &&
      Math.random() < 0.001 * yoloFreqFactor
    ) {
      this.yoloBurstActive = true;
      this.yoloBurstStartTime = time;
    }

    if (this.yoloBurstActive && this.yoloGroup) {
      let yTime = time - this.yoloBurstStartTime;
      let duration = 300;

      if (yTime < duration) {
        let intensity = this.settings.yoloIntensity;

        let x1 = (Math.random() - 0.5) * intensity * 2;
        let y1 = (Math.random() - 0.5) * intensity;
        let x2 = (Math.random() - 0.5) * intensity * 2;
        let y2 = (Math.random() - 0.5) * intensity;

        let skewX = (Math.random() - 0.5) * intensity;
        let scale = 1 + Math.random() * 0.2;

        this.yoloLayers[0].setAttribute('transform', `translate(${x1}, ${y1})`);
        this.yoloLayers[1].setAttribute('transform', `translate(${x2}, ${y2})`);
        this.yoloGroup.setAttribute(
          'transform',
          `translate(100, 30) skewX(${skewX}) scale(${scale}) translate(-100, -30)`
        );

        if (Math.random() > 0.6) {
          const garble = ['Y0L0', 'Y O L O', '>OLO', 'YOL<'];
          this.yoloLayers[2].textContent =
            garble[Math.floor(Math.random() * garble.length)];
        } else {
          this.yoloLayers[2].textContent = 'YOLO';
        }
      } else {
        this.yoloBurstActive = false;
        this.yoloLastBurstTime = time;
        this.yoloLayers[0].setAttribute('transform', '');
        this.yoloLayers[1].setAttribute('transform', '');
        this.yoloGroup.setAttribute('transform', '');
        this.yoloLayers[2].textContent = 'YOLO';
      }
    } else if (this.yoloGroup) {
      let heartbeat = 1 + Math.abs(Math.sin(time * 0.006)) * 0.03;
      this.yoloGroup.setAttribute(
        'transform',
        `translate(100, 30) scale(${heartbeat}) translate(-100, -30)`
      );
    }

    // ----- YOLO ZEN LOGIC -----
    if (this.zenGroup && this.zenGrad) {
      const zenTime = time * (this.settings.zenSpeed / 10000);

      // Gentle bobbing and breathing scale
      const zenFloatY = Math.sin(zenTime) * 3;
      const zenScale = 1 + Math.sin(zenTime * 0.5) * 0.05;

      // Rotating the gradient visually
      const gradAngle = zenTime * 2;
      const gx1 = 50 + Math.cos(gradAngle) * 50;
      const gy1 = 50 + Math.sin(gradAngle) * 50;
      const gx2 = 50 - Math.cos(gradAngle) * 50;
      const gy2 = 50 - Math.sin(gradAngle) * 50;

      this.zenGrad.setAttribute('x1', `${gx1}%`);
      this.zenGrad.setAttribute('y1', `${gy1}%`);
      this.zenGrad.setAttribute('x2', `${gx2}%`);
      this.zenGrad.setAttribute('y2', `${gy2}%`);

      this.zenGroup.setAttribute(
        'transform',
        `translate(100, 30) scale(${zenScale}) translate(-100, -30) translate(0, ${zenFloatY})`
      );

      // Pulsing glow opacity
      if (this.zenBack) {
        this.zenBack.setAttribute(
          'opacity',
          (0.4 + Math.sin(zenTime * 0.5) * 0.3).toString()
        );
      }
    }

    this.animationId = requestAnimationFrame(this.animate);
  }

  buildVibesSVG() {
    const container = makeElement('div', {
      className: 'vibes-container',
      style: { cursor: 'pointer', zIndex: '10' },
      title: 'Click to electrify!',
      onclick: () => {
        this.burstActive = true;
        this.burstStartTime = performance.now();
        this.lastBurstTime = this.burstStartTime;
      },
    });

    const svg = makeElement('svg:svg', {
      className: 'vibes-svg',
      viewBox: '0 0 160 60',
    });

    const defs = makeElement('svg:defs');

    // 1. Text fill gradient
    this.vibeGradStop1 = makeElement('svg:stop', {
      offset: '0%',
      'stop-color': this.settings.vibeText1,
    });
    this.vibeGradStop2 = makeElement('svg:stop', {
      offset: '100%',
      'stop-color': this.settings.vibeText2,
    });

    this.vibeGradient = makeElement(
      'svg:linearGradient',
      { id: 'vibeGrad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
      [this.vibeGradStop1, this.vibeGradStop2]
    );

    // 2. Diffuse aura glow filter
    this.vibeBlur = makeElement('svg:feGaussianBlur', {
      in: 'SourceGraphic',
      stdDeviation: this.settings.vibeGlowSpread,
      result: 'blur',
    });
    this.vibeGlowFilter = makeElement(
      'svg:filter',
      { id: 'vibeGlow', x: '-50%', y: '-50%', width: '200%', height: '200%' },
      [
        this.vibeBlur,
        makeElement('svg:feMerge', {}, [
          makeElement('svg:feMergeNode', { in: 'blur' }),
          makeElement('svg:feMergeNode', { in: 'SourceGraphic' }),
        ]),
      ]
    );

    // 3. Distortion / Electrify filter (connected to the math loop)
    this.vibeTurbulence = makeElement('svg:feTurbulence', {
      type: 'fractalNoise',
      baseFrequency: '0.05',
      numOctaves: '2',
      result: 'noise',
    });
    this.vibeDisplacementMap = makeElement('svg:feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'noise',
      scale: '0',
      xChannelSelector: 'R',
      yChannelSelector: 'G',
    });

    const distFilter = makeElement(
      'svg:filter',
      {
        id: 'vibeDistort',
        x: '-30%',
        y: '-30%',
        width: '160%',
        height: '160%',
      },
      [this.vibeTurbulence, this.vibeDisplacementMap]
    );

    defs.appendChild(this.vibeGradient);
    defs.appendChild(this.vibeGlowFilter);
    defs.appendChild(distFilter);
    svg.appendChild(defs);

    const mainGroup = makeElement('svg:g', { filter: 'url(#vibeDistort)' });

    // Chromatic aberration / aura layers
    this.vibeLayer1 = makeElement(
      'svg:text',
      {
        class: 'vibe-text-layer vibe-l1',
        x: '80',
        y: '32',
        fill: this.settings.vibeGlow1,
        filter: 'url(#vibeGlow)',
      },
      'vibes'
    );
    this.vibeLayer2 = makeElement(
      'svg:text',
      {
        class: 'vibe-text-layer vibe-l2',
        x: '80',
        y: '32',
        fill: this.settings.vibeGlow2,
        filter: 'url(#vibeGlow)',
      },
      'vibes'
    );

    // Crisp text layer
    this.vibeMainText = makeElement(
      'svg:text',
      { class: 'vibe-text-main', x: '80', y: '32', fill: 'url(#vibeGrad)' },
      'vibes'
    );

    mainGroup.appendChild(this.vibeLayer1);
    mainGroup.appendChild(this.vibeLayer2);
    mainGroup.appendChild(this.vibeMainText);

    // Add some dynamic SVG sparkles around the word
    this.sparkles = [];
    for (let i = 0; i < 4; i++) {
      let sp = makeElement('svg:path', {
        d: 'M 0 -5 Q 0 0 5 0 Q 0 0 0 5 Q 0 0 -5 0 Q 0 0 0 -5',
        fill: this.settings.vibeText1,
        class: 'vibe-sparkle',
      });
      this.sparkles.push({
        el: sp,
        x: 20 + Math.random() * 120,
        y: 10 + Math.random() * 40,
        offset: Math.random() * 100,
      });
      mainGroup.appendChild(sp);
    }

    svg.appendChild(mainGroup);
    container.appendChild(svg);
    return container;
  }

  buildRecursiSVG() {
    const container = makeElement('div', {
      className: 'recursi-container',
      style: { cursor: 'pointer', zIndex: '10' },
      title: 'Initialize Recursive Loop',
      onclick: () => {
        this.recursiBurstActive = true;
        this.recursiBurstStartTime = performance.now();
        this.recursiLastBurstTime = this.recursiBurstStartTime;
      },
    });

    const svg = makeElement('svg:svg', {
      className: 'recursi-svg',
      viewBox: '0 0 240 60',
    });

    const group = makeElement('svg:g');

    // Generate multiple empty echo text elements
    this.recursiEchoes = [];
    for (let i = 0; i < 4; i++) {
      const echo = makeElement(
        'svg:text',
        {
          class: 'recursi-text-echo',
          x: '120',
          y: '32',
          stroke: this.settings.recursiEchoColor,
          opacity: '0',
        },
        this.targetRecursiText
      );
      this.recursiEchoes.push(echo);
      group.appendChild(echo);
    }

    // Bracket Left
    const bLeft = makeElement(
      'svg:text',
      { class: 'recursi-bracket', x: '25', y: '30' },
      '['
    );
    // Bracket Right
    const bRight = makeElement(
      'svg:text',
      { class: 'recursi-bracket', x: '215', y: '30' },
      ']'
    );
    this.recursiBrackets = [bLeft, bRight];
    group.appendChild(bLeft);
    group.appendChild(bRight);

    // Main text
    this.recursiMain = makeElement(
      'svg:text',
      {
        class: 'recursi-text-main',
        x: '120',
        y: '32',
        style: {
          filter: `drop-shadow(0px 0px 8px ${this.settings.recursiColor})`,
        },
      },
      this.targetRecursiText
    );
    group.appendChild(this.recursiMain);

    svg.appendChild(group);
    container.appendChild(svg);
    return container;
  }

  buildRecursiTunnelSVG() {
    const container = makeElement('div', {
      className: 'tunnel-container',
      style: { cursor: 'pointer', zIndex: '10' },
      title: 'Click for Dimensional Split',
      onclick: () => {
        this.tunnelBurstActive = true;
        this.tunnelBurstStartTime = performance.now();
        this.tunnelLastBurstTime = this.tunnelBurstStartTime;
      },
    });

    const svg = makeElement('svg:svg', {
      className: 'tunnel-svg',
      viewBox: '0 0 240 60',
    });

    const group = makeElement('svg:g');

    // Vaporwave / Synthwave color palette for the deep layers
    const tunnelColors = [
      '#ff0055',
      '#cc00ff',
      '#0044ff',
      '#00ffcc',
      '#aaff00',
    ];

    this.tunnelLayers = [];

    // Create 5 background wireframe layers (0 is deepest, 4 is closest)
    tunnelColors.forEach((color, i) => {
      const layer = makeElement(
        'svg:text',
        {
          class: 'tunnel-layer',
          x: '120',
          y: '30',
          stroke: color,
        },
        'recursi'
      );

      this.tunnelLayers.push(layer);
      group.appendChild(layer);
    });

    // Create the solid front layer (index 5)
    const frontLayer = makeElement(
      'svg:text',
      {
        class: 'tunnel-front',
        x: '120',
        y: '30',
      },
      'recursi'
    );

    this.tunnelLayers.push(frontLayer);
    group.appendChild(frontLayer);

    svg.appendChild(group);
    container.appendChild(svg);
    return container;
  }

  buildYoloSVG() {
    const container = makeElement('div', {
      className: 'yolo-container',
      style: { cursor: 'pointer', zIndex: '10' },
      title: 'Click for YOLO Glitch',
      onclick: () => {
        this.yoloBurstActive = true;
        this.yoloBurstStartTime = performance.now();
        this.yoloLastBurstTime = this.yoloBurstStartTime;
      },
    });

    const svg = makeElement('svg:svg', {
      className: 'yolo-svg',
      viewBox: '0 0 200 60',
    });

    this.yoloGroup = makeElement('svg:g');

    // 0: Glow 1, 1: Glow 2, 2: Main Layer
    this.yoloLayers = [
      makeElement(
        'svg:text',
        {
          class: 'yolo-layer',
          x: '100',
          y: '34',
          fill: this.settings.yoloGlow1,
          opacity: '0.8',
        },
        'YOLO'
      ),
      makeElement(
        'svg:text',
        {
          class: 'yolo-layer',
          x: '100',
          y: '34',
          fill: this.settings.yoloGlow2,
          opacity: '0.8',
        },
        'YOLO'
      ),
      makeElement(
        'svg:text',
        {
          class: 'yolo-layer',
          x: '100',
          y: '34',
          fill: this.settings.yoloColor,
          opacity: '1',
        },
        'YOLO'
      ),
    ];

    this.yoloGroup.appendChild(this.yoloLayers[0]);
    this.yoloGroup.appendChild(this.yoloLayers[1]);
    this.yoloGroup.appendChild(this.yoloLayers[2]);
    svg.appendChild(this.yoloGroup);
    container.appendChild(svg);

    return container;
  }

  buildYoloZenSVG() {
    const container = makeElement('div', { className: 'zen-container' });

    const svg = makeElement('svg:svg', {
      className: 'zen-svg',
      viewBox: '0 0 200 60',
    });

    const defs = makeElement('svg:defs');

    // Smooth 3-color sunset gradient
    this.zenGrad = makeElement('svg:linearGradient', {
      id: 'zenGrad',
      x1: '0%',
      y1: '0%',
      x2: '100%',
      y2: '100%',
    });
    this.zenStop1 = makeElement('svg:stop', {
      offset: '0%',
      'stop-color': this.settings.zenColor1,
    });
    this.zenStop3 = makeElement('svg:stop', {
      offset: '50%',
      'stop-color': this.settings.zenColor3,
    });
    this.zenStop2 = makeElement('svg:stop', {
      offset: '100%',
      'stop-color': this.settings.zenColor2,
    });

    this.zenGrad.appendChild(this.zenStop1);
    this.zenGrad.appendChild(this.zenStop3);
    this.zenGrad.appendChild(this.zenStop2);
    defs.appendChild(this.zenGrad);
    svg.appendChild(defs);

    this.zenGroup = makeElement('svg:g');

    // Deep breathing glow background
    this.zenBack = makeElement(
      'svg:text',
      {
        class: 'zen-layer zen-glow',
        x: '100',
        y: '32',
        fill: 'url(#zenGrad)',
        opacity: '0.6',
      },
      'YOLO'
    );

    // Crisp foreground text
    this.zenFront = makeElement(
      'svg:text',
      {
        class: 'zen-layer',
        x: '100',
        y: '32',
        fill: 'url(#zenGrad)',
      },
      'YOLO'
    );

    this.zenGroup.appendChild(this.zenBack);
    this.zenGroup.appendChild(this.zenFront);
    svg.appendChild(this.zenGroup);
    container.appendChild(svg);

    return container;
  }


  

  
}


