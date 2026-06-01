
class SliderPanel {
  constructor() {
      this.sliders = this._defaultSliders();
      this.onChange = null;
      this.el = null;
    }

  _defaultSliders() {
      return [
        { id:'trust',      label:'Trust Level',  value:40, min:0, max:100, step:1, priority:1, locked:true,  expiry:'session', enabled:true, group:'llm',   desc:'Agent autonomy' },
        { id:'depth',      label:'Context Depth',value:100,min:0, max:100, step:1, priority:4, locked:true,  expiry:'session', enabled:true, group:'llm',   desc:'History window' },
        { id:'autoexec',   label:'Auto-execute', value:0,  min:0, max:1,   step:1, priority:1, locked:false, expiry:'session', enabled:true, group:'local', desc:'Run without confirm' },
        { id:'safety',     label:'Safety Mode',  value:1,  min:0, max:1,   step:1, priority:1, locked:false, expiry:null,      enabled:true, group:'local', desc:'Safety checks on all tasks' },
        { id:'pollrate',   label:'Poll Rate',    value:3,  min:1, max:10,  step:1, priority:3, locked:false, expiry:null,      enabled:true, group:'local', desc:'Workspace poll speed' },
      ];
    }

  get(id)        { return this.sliders.find(s => s.id === id); }
  snapshotLLM()  { const o = {}; this.sliders.filter(s => s.locked).forEach(s => { o[s.id] = s.value; }); return o; }
  getLLMContext() { return this.sliders.filter(s => s.locked && s.enabled).sort((a,b) => a.priority-b.priority).map(s => s.label + ': ' + this._disp(s)).join('\n'); }

  set(id, value) {
      const s = this.get(id);
      if (!s) return;
      s.value = value;
      this._updateRow(id);
      this.onChange?.(id, value, s);
    }

  render() {
      this._css();
      this.el = makeElement('div', { className: 'sp-panel' });
      this.el.appendChild(this._renderGroup('llm',   '🔒 LLM Context'));
      this.el.appendChild(this._renderGroup('local', '⚙ Local'));
      return this.el;
    }

  _renderGroup(group, title) {
      const w = makeElement('div', { className: 'sp-group' });
      w.appendChild(makeElement('div', { className: 'sp-group-title' }, title));
      this.sliders.filter(s => s.group === group).forEach(s => w.appendChild(this._renderRow(s)));
      return w;
    }

  _renderRow(s) {
      const row = makeElement('div', { className: 'sp-row', id: 'sp-row-' + s.id });
      const lr  = makeElement('div', { className: 'sp-label-row' });
      lr.appendChild(makeElement('span', { className: 'sp-pri sp-pri--' + s.priority }));
      lr.appendChild(makeElement('span', { className: 'sp-label', title: s.desc }, s.label));
      const badges = makeElement('span', { className: 'sp-badges' });
      if (s.locked) badges.appendChild(makeElement('span', { className: 'sp-badge', title: 'Sent to LLM' }, '🔒'));
      lr.appendChild(badges);
      lr.appendChild(makeElement('span', { className: 'sp-val', id: 'sp-val-' + s.id }, this._disp(s)));
      
      let input;
      if (s.max === 1 && s.min === 0 && s.step === 1) {
        input = makeElement('div', { className: 'sp-toggle' + (s.value ? ' sp-toggle--on' : ''), id: 'sp-input-' + s.id });
        input.addEventListener('click', () => this.set(s.id, s.value ? 0 : 1));
      } else {
        input = this._makeSvgSlider(s);
      }
      row.append(lr, input);
      return row;
    }

  _makeSvgSlider(s) {
      const w = 180, h = 16;
      const container = makeElement('div', { className: 'sp-svg-slider-wrap', id: 'sp-input-' + s.id });
      
      const colors = { 1: '#f87171', 2: '#fbbf24', 3: '#34d399', 4: '#60a5fa', 5: '#c084fc' };
      const color = colors[s.priority] || '#60a5fa';

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      
      const trackBg = document.createElementNS(svgNS, 'rect');
      trackBg.setAttribute('x', '0'); trackBg.setAttribute('y', '6');
      trackBg.setAttribute('width', w); trackBg.setAttribute('height', '4');
      trackBg.setAttribute('rx', '2'); trackBg.setAttribute('fill', '#1e293b');
      
      const trackFill = document.createElementNS(svgNS, 'rect');
      trackFill.setAttribute('x', '0'); trackFill.setAttribute('y', '6');
      trackFill.setAttribute('height', '4'); trackFill.setAttribute('rx', '2');
      trackFill.setAttribute('fill', color);
      trackFill.setAttribute('filter', `drop-shadow(0 0 3px ${color})`);

      const thumb = document.createElementNS(svgNS, 'circle');
      thumb.setAttribute('cy', '8'); thumb.setAttribute('r', '6');
      thumb.setAttribute('fill', '#ffffff'); thumb.setAttribute('stroke', color);
      thumb.setAttribute('stroke-width', '2');

      svg.append(trackBg, trackFill, thumb);
      container.appendChild(svg);

      const updateVisuals = (val) => {
        const pct = (val - s.min) / (s.max - s.min);
        const cx = Math.max(6, Math.min(w - 6, pct * w));
        trackFill.setAttribute('width', String(cx));
        thumb.setAttribute('cx', String(cx));
      };
      updateVisuals(s.value);
      container._updateVisuals = updateVisuals;

      let isDragging = false;
      const setValFromEv = (e) => {
        const rect = container.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const pct = x / rect.width;
        let val = s.min + pct * (s.max - s.min);
        val = Math.max(s.min, Math.min(s.max, Math.round(val / s.step) * s.step));
        if (val !== s.value) {
          s.value = val;
          updateVisuals(val);
          const valEl = document.getElementById('sp-val-' + s.id);
          if (valEl) valEl.textContent = this._disp(s);
          this.onChange?.(s.id, val, s);
        }
      };

      container.addEventListener('mousedown', (e) => {
        isDragging = true;
        setValFromEv(e);
        const onMove = (em) => { if (isDragging) setValFromEv(em); };
        const onUp = () => { isDragging = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      return container;
    }

  _updateRow(id) {
      const s = this.get(id);
      if (!s) return;
      const valEl = document.getElementById('sp-val-' + id);
      if (valEl) valEl.textContent = this._disp(s);
      const inp = document.getElementById('sp-input-' + id);
      if (inp) {
        if (s.max === 1 && s.min === 0) {
          inp.className = 'sp-toggle' + (s.value ? ' sp-toggle--on' : '');
        } else if (inp._updateVisuals) {
          inp._updateVisuals(s.value);
        }
      }
      const row = document.getElementById('sp-row-' + id);
      if (row) { row.classList.add('sp-row--flash'); setTimeout(() => row.classList.remove('sp-row--flash'), 700); }
    }

  _disp(s) {
      if (s.max === 1 && s.min === 0) return s.value ? 'ON' : 'OFF';
      if (s.id === 'pollrate') return (s.value * 0.5).toFixed(1) + 's';
      return String(s.value);
    }

  _css() {
      applyCss(`
        .sp-panel { display:flex; flex-direction:column; overflow-y:auto; height:100%; background:#0f172a; border-left: 1px solid #1e293b; }
        .sp-group { padding:8px 0 2px; }
        .sp-group-title { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; padding:6px 12px 8px; border-top:1px solid #1e293b; }
        .sp-group:first-child .sp-group-title { border-top:none; }
        .sp-row { padding:3px 12px 6px; transition:background 0.4s; }
        .sp-row--flash { background:rgba(96,165,250,0.15) !important; }
        .sp-label-row { display:flex; align-items:center; gap:5px; margin-bottom:4px; }
        .sp-label { flex:1; font-size:12px; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sp-val { font-size:11px; color:#cbd5e1; font-family:monospace; min-width:30px; text-align:right; font-weight:bold; }
        .sp-badges { display:flex; gap:2px; }
        .sp-badge { font-size:9px; padding:0 3px; border-radius:2px; line-height:1.6; opacity:0.7; }
        .sp-pri { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .sp-pri--1 { background:#f87171; box-shadow: 0 0 3px #f87171; }
        .sp-pri--2 { background:#fbbf24; box-shadow: 0 0 3px #fbbf24; }
        .sp-pri--3 { background:#34d399; box-shadow: 0 0 3px #34d399; }
        .sp-pri--4 { background:#60a5fa; box-shadow: 0 0 3px #60a5fa; }
        .sp-pri--5 { background:#c084fc; box-shadow: 0 0 3px #c084fc; }
        .sp-svg-slider-wrap { height: 16px; width: 100%; cursor: pointer; display: flex; align-items: center; }
        .sp-toggle { width:26px; height:14px; border-radius:7px; background:#334155; border:1px solid #475569; cursor:pointer; position:relative; transition:all 0.2s; }
        .sp-toggle::after { content:''; position:absolute; width:10px; height:10px; border-radius:50%; background:#94a3b8; top:1px; left:1px; transition:all 0.2s; }
        .sp-toggle--on { background:#064e3b; border-color:#059669; }
        .sp-toggle--on::after { background:#34d399; left:13px; filter: drop-shadow(0 0 3px #34d399); }
      `, 'sp-styles');
    }

}

