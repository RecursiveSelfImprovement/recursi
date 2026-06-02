class BackgroundEffects {
    constructor(containerElement) {
      this.container = containerElement;
      this.activeMode = 'none';
      this.currentColor = 'transparent';
      this.psychSpeed = 1;
      this.psychScale = 70;
      this.psychComplexity = 30;
      this.psychChaos = 50;
      this.psychShowSparkles = false;
      this.psychTime = 0;
      this.psychShapes = [];
      this.psychRafId = null;
      this.gridRafId = null;
      this.gridTime = 0;
      this._initElements();
    }

    _initElements() {
      if (this.container) {
        this.container.style.position = 'relative';
      }

      this.gridBg = makeElement('div', {
        className: 'grid-bg-anim',
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '0',
          display: 'none',
          backgroundImage:
            'linear-gradient(45deg, #cccccc 25%, transparent 25%), linear-gradient(-45deg, #cccccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cccccc 75%), linear-gradient(-45deg, transparent 75%, #cccccc 75%)',
          backgroundSize: '20px 20px',
          backgroundColor: '#999999',
          pointerEvents: 'none',
        },
      });

      this.psychSvg = makeElement('svg:svg', {
        className: 'psych-svg-bg',
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '1',
          pointerEvents: 'none',
          display: 'none',
          backgroundColor: '#000000',
        },
      });

      const defs = makeElement('svg:defs', {}, [
        makeElement(
          'svg:filter',
          { id: 'psych-strong-blur' },
          makeElement('svg:feGaussianBlur', {
            in: 'SourceGraphic',
            stdDeviation: '15',
          })
        ),
        makeElement(
          'svg:filter',
          { id: 'psych-soft-blur' },
          makeElement('svg:feGaussianBlur', {
            in: 'SourceGraphic',
            stdDeviation: '8',
          })
        ),
      ]);
      this.psychSvg.appendChild(defs);

      this.psychLayerBg = makeElement('svg:g', {
        filter: 'url(#psych-soft-blur)',
        opacity: '0.7',
      });
      this.psychLayerWorms = makeElement('svg:g', {
        filter: 'url(#psych-strong-blur)',
        opacity: '0.9',
      });
      this.psychLayerSparks = makeElement('svg:g', {
        style: { mixBlendMode: 'screen' },
      });

      this.psychSvg.appendChild(this.psychLayerBg);
      this.psychSvg.appendChild(this.psychLayerWorms);
      this.psychSvg.appendChild(this.psychLayerSparks);

      if (this.container) {
        this.container.appendChild(this.gridBg);
        this.container.appendChild(this.psychSvg);
      }
    }

    setMode(mode) {
      this._stopPsychedelicLoop();
      this._stopGridLoop();

      this.gridBg.style.display = 'none';
      this.psychSvg.style.display = 'none';
      this.container.style.backgroundColor = 'transparent';

      this.activeMode = mode;

      if (mode === 'none') {
        this.container.style.backgroundColor = 'transparent';
      } else if (mode === 'color') {
        this.container.style.backgroundColor = this.currentColor;
      } else if (mode === 'grid') {
        this.gridBg.style.display = 'block';
        this._startGridLoop();
      } else if (mode === 'psych') {
        this.psychSvg.style.display = 'block';
        this.resize();
        this._rebuildPsychedelicShapes();
        this._startPsychedelicLoop();
      }
    }

    setColor(hexColor) {
      this.currentColor = hexColor;
      if (this.activeMode === 'color') {
        this.container.style.backgroundColor = hexColor;
      }
    }

    updatePsychParams(params = {}) {
      let rebuild = false;
      if (params.speed !== undefined) this.psychSpeed = params.speed;
      if (params.chaos !== undefined) this.psychChaos = params.chaos;
      if (params.scale !== undefined) {
        this.psychScale = params.scale;
        rebuild = true;
      }
      if (params.complexity !== undefined) {
        this.psychComplexity = params.complexity;
        rebuild = true;
      }
      if (params.sparkles !== undefined) {
        this.psychShowSparkles = params.sparkles;
        rebuild = true;
      }
      if (this.activeMode === 'psych' && rebuild) {
        this._rebuildPsychedelicShapes();
      }
    }

    resize() {
      if (this.activeMode === 'psych' && this.container) {
        const rect = this.container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.psychSvg.setAttribute(
            'viewBox',
            `0 0 ${rect.width} ${rect.height}`
          );
        }
      }
    }

    destroy() {
      this._stopGridLoop();
      this._stopPsychedelicLoop();
      if (this.gridBg && this.gridBg.parentNode) {
        this.gridBg.remove();
      }
      if (this.psychSvg && this.psychSvg.parentNode) {
        this.psychSvg.remove();
      }
    }

    _startGridLoop() {
      if (this.gridRafId) cancelAnimationFrame(this.gridRafId);
      const loop = () => {
        if (this.activeMode !== 'grid') return;
        this.gridTime += 0.02;
        const radius = 10;
        const x = Math.cos(this.gridTime) * radius;
        const y = Math.sin(this.gridTime) * radius;
        this.gridBg.style.backgroundPosition = `${x}px ${y}px`;
        this.gridRafId = requestAnimationFrame(loop);
      };
      loop();
    }

    _stopGridLoop() {
      if (this.gridRafId) {
        cancelAnimationFrame(this.gridRafId);
        this.gridRafId = null;
      }
    }

    _startPsychedelicLoop() {
      if (this.psychRafId) cancelAnimationFrame(this.psychRafId);
      const loop = () => {
        if (this.activeMode !== 'psych') return;
        const w = this.container.offsetWidth || 800;
        const h = this.container.offsetHeight || 600;
        const speed = this.psychSpeed * 0.5;
        this.psychTime += 0.05 * speed;

        this.psychShapes.forEach((s) => {
          if (s.type === 'worm') {
            let d = '';
            s.points.forEach((p, idx) => {
              p.x += p.vx * speed;
              p.y += p.vy * speed;
              if (p.x < -50 || p.x > w + 50) p.vx *= -1;
              if (p.y < -50 || p.y > h + 50) p.vy *= -1;
              if (idx === 0) d += `M ${p.x} ${p.y}`;
              else d += idx === 1 ? ` C ${p.x} ${p.y}` : `, ${p.x} ${p.y}`;
            });
            s.el.setAttribute('d', d);
          } else if (s.type === 'spark') {
            s.x += s.vx * speed;
            s.y += s.vy * speed;
            s.rot += s.rotSpeed * speed;
            if (s.x > w) s.x = 0;
            if (s.x < 0) s.x = w;
            if (s.y > h) s.y = 0;
            if (s.y < 0) s.y = h;
            s.el.setAttribute('fill', s.color);
            s.el.setAttribute(
              'transform',
              `translate(${s.x}, ${s.y}) rotate(${s.rot})`
            );
          } else if (s.type === 'orb') {
            s.x += s.vx * speed * 0.5;
            s.y += s.vy * speed * 0.5;
            if (s.x > w + 100) s.x = -100;
            if (s.x < -100) s.x = w + 100;
            if (s.y > h + 100) s.y = -100;
            if (s.y < -100) s.y = h + 100;
            s.el.setAttribute('cx', s.x);
            s.el.setAttribute('cy', s.y);
          }
        });
        this.psychRafId = requestAnimationFrame(loop);
      };
      loop();
    }

    _stopPsychedelicLoop() {
      if (this.psychRafId) {
        cancelAnimationFrame(this.psychRafId);
        this.psychRafId = null;
      }
    }

    _rebuildPsychedelicShapes() {
      this.psychLayerBg.innerHTML = '';
      this.psychLayerWorms.innerHTML = '';
      this.psychLayerSparks.innerHTML = '';
      this.psychShapes = [];
      const w = this.container.offsetWidth || 800;
      const h = this.container.offsetHeight || 600;
      const count = Math.max(8, Math.floor(this.psychComplexity));
      const colors = [
        '#FF0000',
        '#FF00AA',
        '#AA00FF',
        '#0044FF',
        '#00AAFF',
        '#00FF00',
        '#FFFF00',
        '#FF8800',
      ];
      const getCol = () => colors[Math.floor(Math.random() * colors.length)];

      const wormCount = Math.floor(count / 2);
      for (let i = 0; i < wormCount; i++) {
        const pathEl = makeElement('svg:path', {
          fill: 'none',
          stroke: getCol(),
          'stroke-width': 20 + Math.random() * 30,
          'stroke-linecap': 'round',
          opacity: 0.7 + Math.random() * 0.3,
        });
        this.psychLayerWorms.appendChild(pathEl);
        this.psychShapes.push({
          type: 'worm',
          el: pathEl,
          points: this._generateWorm(w, h),
        });
      }

      if (this.psychShowSparkles) {
        const sparkCount = Math.floor(count * 1.5);
        for (let i = 0; i < sparkCount; i++) {
          const len = 5 + Math.random() * 15;
          const rect = makeElement('svg:rect', {
            width: len,
            height: 2,
            fill: '#FFFFFF',
            opacity: 0.8,
          });
          this.psychLayerSparks.appendChild(rect);
          this.psychShapes.push({
            type: 'spark',
            el: rect,
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            rot: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 20,
            color: getCol(),
          });
        }
      }

      for (let i = 0; i < 5; i++) {
        const circle = makeElement('svg:circle', {
          r: 50 + Math.random() * 100,
          fill: getCol(),
          opacity: 0.4,
        });
        this.psychLayerBg.appendChild(circle);
        this.psychShapes.push({
          type: 'orb',
          el: circle,
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.random() - 0.5,
          vy: Math.random() - 0.5,
        });
      }
    }

    _generateWorm(w, h) {
      const points = [];
      for (let i = 0; i < 4; i++) {
        points.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          phase: Math.random() * Math.PI * 2,
        });
      }
      return points;
    }
  }