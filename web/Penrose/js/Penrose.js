class Penrose {
  init(targetElement) {
      targetElement.innerHTML = '';
      targetElement.id = 'app-container';

      const dim = Math.min(window.innerWidth, window.innerHeight);
      const startScale = dim / 1.5;

      this.settings = {
        iterations: 4,
        scale: startScale,
        rotation: -90,
        xOffset: 0,
        yOffset: 0,
        colorAcute: '#D62828',
        colorObtuse: '#003049',
        strokeColor: '#FCBF49',
        strokeWidth: 1.5,
        fillOpacity: 1.0,
        colorMode: 'type',
      };

      this.sidebar = makeElement('div', { id: 'sidebar', style: { width: '100%', height: '100%', overflowY: 'auto' } });
      this.mainView = makeElement('div', { id: 'main-view', style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } });

      this.svgContentGroup = makeElement('svg:g');
      this.svgContainer = makeElement(
        'svg:svg',
        {
          id: 'svg-container',
          style: { width: '100%', height: '100%', display: 'block', background: '#000' },
        },
        this.svgContentGroup
      );

      this.statusDiv = makeElement('div', { className: 'status-bar' }, 'Ready');

      this.mainView.appendChild(this.svgContainer);
      this.mainView.appendChild(this.statusDiv);
      targetElement.appendChild(this.mainView);

      // FIX: Wrap the control sidebar in a native dialog
      this.dialog = UITools.makeDialog({
        env: this.env,
        title: 'Penrose Controls',
        contentElement: this.sidebar,
        size: [320, 500],
        position: [20, 20]
      });

      this.setupSidebar();
      requestAnimationFrame(() => this.generateAndDraw());

      // Use a bound listener so we can unbind it properly if needed
      this._onResize = () => this.generateAndDraw();
      window.addEventListener('resize', this._onResize);
    }

  setupSidebar() {
    this.sidebar.innerHTML = '';
    this.sidebar.appendChild(makeElement('h1', 'Penrose P2'));

    // Helper for sliders
    const addSlider = (label, prop, min, max, step, fn) => {
      const row = makeElement('div', { className: 'control-group' });
      const lbl = makeElement('label', `${label}: ${this.settings[prop]}`);
      const input = makeElement('input', {
        type: 'range',
        min,
        max,
        step,
        value: this.settings[prop],
        oninput: (e) => {
          this.settings[prop] = parseFloat(e.target.value);
          lbl.textContent = `${label}: ${this.settings[prop]}`;
          if (fn) fn();
          else this.generateAndDraw();
        },
      });
      row.append(lbl, input);
      this.sidebar.appendChild(row);
    };

    addSlider('Iterations', 'iterations', 0, 7, 1);
    addSlider('Zoom', 'scale', 100, 3000, 50);
    addSlider('Pan X', 'xOffset', -1000, 1000, 10);
    addSlider('Pan Y', 'yOffset', -1000, 1000, 10);
    addSlider('Rotation', 'rotation', -360, 360, 5);

    // Colors (used primarily in "type" mode)
    const colorGroup = makeElement('div', { className: 'control-group' });
    colorGroup.append(makeElement('label', 'Tile Colors (Type Mode)'));
    const c1 = makeElement('input', {
      type: 'color',
      value: this.settings.colorAcute,
      oninput: (e) => {
        this.settings.colorAcute = e.target.value;
        this.generateAndDraw();
      },
    });
    const c2 = makeElement('input', {
      type: 'color',
      value: this.settings.colorObtuse,
      oninput: (e) => {
        this.settings.colorObtuse = e.target.value;
        this.generateAndDraw();
      },
    });
    const cRow = makeElement('div', { className: 'color-picker-row' });
    cRow.append(c1, c2);
    colorGroup.append(cRow);
    this.sidebar.appendChild(colorGroup);

    // NEW: Color mode selector
    const modeGroup = makeElement('div', { className: 'control-group' });
    modeGroup.append(makeElement('label', 'Color Mode'));

    const select = makeElement(
      'select',
      {
        onchange: (e) => {
          this.settings.colorMode = e.target.value;
          this.generateAndDraw();
        },
      },
      [
        [
          'option',
          { value: 'type', selected: this.settings.colorMode === 'type' },
          'By tile type',
        ],
        [
          'option',
          {
            value: 'orientation',
            selected: this.settings.colorMode === 'orientation',
          },
          'By orientation',
        ],
        [
          'option',
          { value: 'radius', selected: this.settings.colorMode === 'radius' },
          'By radius',
        ],
      ]
    );

    modeGroup.append(select);
    this.sidebar.appendChild(modeGroup);

    // Reset
    const btn = makeElement(
      'button',
      {
        onclick: () => {
          this.settings.xOffset = 0;
          this.settings.yOffset = 0;
          this.settings.rotation = -90;
          this.settings.scale =
            Math.min(window.innerWidth, window.innerHeight) / 1.5;
          this.settings.colorMode = 'type';
          this.setupSidebar(); // refresh UI
          this.generateAndDraw();
        },
      },
      'Recenter'
    );
    this.sidebar.appendChild(btn);
  }

  generateAndDraw() {
    const tris = this.computeTiling();

    // Prepare SVG
    this.svgContentGroup.innerHTML = '';

    // Viewport Center
    const cx = this.mainView.clientWidth / 2 + this.settings.xOffset;
    const cy = this.mainView.clientHeight / 2 + this.settings.yOffset;

    // Apply Transform
    this.svgContentGroup.setAttribute(
      'transform',
      `translate(${cx}, ${cy}) rotate(${this.settings.rotation}) scale(${this.settings.scale})`
    );

    // Precompute centroids + radii so we can do radius/orientation-based color
    let maxR = 0;
    for (const t of tris) {
      const mx = (t.A.x + t.B.x + t.C.x) / 3;
      const my = (t.A.y + t.B.y + t.C.y) / 3;
      const r = Math.hypot(mx, my);
      t._cx = mx;
      t._cy = my;
      t._r = r;
      if (r > maxR) maxR = r;
    }

    const frag = document.createDocumentFragment();

    for (const t of tris) {
      let color;

      if (this.settings.colorMode === 'type') {
        // Original behavior: acute vs obtuse
        color =
          t.type === 'acute'
            ? this.settings.colorAcute
            : this.settings.colorObtuse;
      } else if (this.settings.colorMode === 'orientation') {
        // Hue based on angle from center
        const angle = Math.atan2(t._cy, t._cx); // -π..π
        const hue = ((angle + Math.PI) / (2 * Math.PI)) * 360; // 0..360
        color = `hsl(${hue}, 70%, 55%)`;
      } else if (this.settings.colorMode === 'radius') {
        // Hue based on distance from center
        const rNorm = maxR > 0 ? t._r / maxR : 0;
        // Center-ish = blue, outer = red
        const hue = 240 - rNorm * 240; // 240 (blue) -> 0 (red)
        color = `hsl(${hue}, 80%, 55%)`;
      } else {
        // Fallback
        color =
          t.type === 'acute'
            ? this.settings.colorAcute
            : this.settings.colorObtuse;
      }

      const strokeW = this.settings.strokeWidth / this.settings.scale;

      const poly = makeElement('svg:polygon', {
        points: `${t.A.x},${t.A.y} ${t.B.x},${t.B.y} ${t.C.x},${t.C.y}`,
        fill: color,
        stroke: this.settings.strokeColor,
        'stroke-width': strokeW,
        'stroke-linejoin': 'round',
      });
      frag.appendChild(poly);
    }

    this.svgContentGroup.appendChild(frag);
    this.statusDiv.textContent = `Tiles: ${tris.length} | Iteration: ${this.settings.iterations} | Mode: ${this.settings.colorMode}`;
  }

  computeTiling() {
    const PHI = (1 + Math.sqrt(5)) / 2;
    let triangles = [];

    // --- 1. Initial "Sun" / 10-point star of acute triangles ---
    // Center at origin, radius = 1
    const center = { x: 0, y: 0 };
    const N = 10;

    for (let i = 0; i < N; i++) {
      const angle1 = (2 * Math.PI * i) / N;
      const angle2 = (2 * Math.PI * (i + 1)) / N;

      const p1 = { x: Math.cos(angle1), y: Math.sin(angle1) };
      const p2 = { x: Math.cos(angle2), y: Math.sin(angle2) };

      // All the same handedness: center -> p1 -> p2, CCW
      triangles.push({
        type: 'acute', // thin triangle (36°, 72°, 72°)
        A: center,
        B: p1,
        C: p2,
      });
    }

    // --- 2. Subdivision using Robinson / Penrose rules ---
    for (let iter = 0; iter < this.settings.iterations; iter++) {
      const nextGen = [];

      for (const t of triangles) {
        const { A, B, C } = t;

        if (t.type === 'acute') {
          // Acute Rule:
          // P = A + (B - A) / φ
          const P = {
            x: A.x + (B.x - A.x) / PHI,
            y: A.y + (B.y - A.y) / PHI,
          };

          // Children:
          // 1) acute:  (C, P, B)
          // 2) obtuse: (P, C, A)
          nextGen.push({ type: 'acute', A: C, B: P, C: B });
          nextGen.push({ type: 'obtuse', A: P, B: C, C: A });
        } else {
          // Obtuse Rule:
          // Q = B + (A - B) / φ
          // R = B + (C - B) / φ
          const Q = {
            x: B.x + (A.x - B.x) / PHI,
            y: B.y + (A.y - B.y) / PHI,
          };
          const R = {
            x: B.x + (C.x - B.x) / PHI,
            y: B.y + (C.y - B.y) / PHI,
          };

          // Children:
          // 1) obtuse: (R, C, A)
          // 2) obtuse: (Q, R, B)
          // 3) acute:  (R, Q, A)
          nextGen.push({ type: 'obtuse', A: R, B: C, C: A });
          nextGen.push({ type: 'obtuse', A: Q, B: R, C: B });
          nextGen.push({ type: 'acute', A: R, B: Q, C: A });
        }
      }

      triangles = nextGen;
    }

    return triangles;
  }

  updateStatus(message) {
    if (this.statusDiv) {
      this.statusDiv.textContent = message;
    }
  }

  updateControls() {
    // Updates inputs to match internal settings (used after reset)
    const inputs = this.sidebar.querySelectorAll('input');
    inputs.forEach((input) => {
      const key = input.dataset.setting;
      if (key && this.settings[key] !== undefined) {
        input.value = this.settings[key];
        if (input.previousSibling) {
          input.previousSibling.textContent = `${input.dataset.label}: ${this.settings[key]}`;
        }
      }
    });
  }

  

  

  async run(env) {
      this.env = env;
      this.rootElement = env.container;
      
      // Fix standalone screen fill constraint
      if (this.rootElement === document.body) {
        document.documentElement.style.height = '100%';
        document.documentElement.style.width = '100%';
        document.documentElement.style.margin = '0';
        document.body.style.height = '100%';
        document.body.style.width = '100%';
        document.body.style.margin = '0';
      }

      this.rootElement.style.cssText = "position: relative; width: 100%; height: 100%; overflow: hidden; background: #0d0d0d;";
      
      applyCss(`
        .penrose-app {
          --bg-color: #0d0d0d;
          --sidebar-bg: #252526;
          --text-color: #f0f0f0;
          --text-dim: #aaaaaa;
          --accent-color: #007acc;
          --input-bg: #3c3c3c;
          --border-color: #444;
          width: 100%;
          height: 100%;
          font-family: 'Segoe UI', system-ui, sans-serif;
          color: var(--text-color);
        }
        .penrose-app #sidebar {
          width: 100%;
          background-color: var(--sidebar-bg);
          display: flex; flex-direction: column;
          padding: 20px; box-sizing: border-box; overflow-y: auto;
        }
        .penrose-app #sidebar h1 {
          margin-top: 0; font-size: 1.8rem; color: var(--accent-color);
          text-transform: uppercase; letter-spacing: 2px;
          border-bottom: 2px solid var(--border-color); padding-bottom: 10px; margin-bottom: 25px;
        }
        .penrose-app .control-group {
          margin-bottom: 25px; background: rgba(255,255,255,0.03);
          padding: 15px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);
        }
        .penrose-app .control-group label {
          display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-dim); margin-bottom: 10px;
        }
        .penrose-app input[type="range"] {
          width: 100%; display: block; margin: 10px 0; accent-color: var(--accent-color);
        }
        .penrose-app .color-picker-row { display: flex; gap: 10px; margin-top: 5px; }
        .penrose-app input[type="color"] { flex-grow: 1; height: 40px; border: none; background: none; cursor: pointer; border-radius: 4px; }
        .penrose-app button {
          width: 100%; padding: 12px; background-color: var(--accent-color); color: white;
          border: none; border-radius: 4px; font-weight: bold; cursor: pointer; transition: background 0.2s; margin-top: 10px;
        }
        .penrose-app button:hover { background-color: #005f9e; }
        .penrose-app #main-view {
          flex-grow: 1; height: 100%; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at center, #1a1a1a 0%, #000 100%);
          overflow: hidden; display: flex; justify-content: center; align-items: center;
        }
        .penrose-app .status-bar {
          position: absolute; bottom: 20px; right: 20px; background: rgba(0,0,0,0.8);
          padding: 8px 15px; border-radius: 20px; font-family: monospace; font-size: 0.9rem;
          color: #ccc; border: 1px solid #333; pointer-events: none;
        }
      `, 'penrose-styles');

      this.rootElement.classList.add('penrose-app');
      this.init(this.rootElement);
      return this;
    }

  destroy() {
      if (this.dialog) {
        this.dialog.close();
        this.dialog = null;
      }
      if (this.rootElement) this.rootElement.innerHTML = "";
    }
}

