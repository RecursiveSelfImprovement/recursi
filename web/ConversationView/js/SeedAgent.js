class SeedAgent {
    constructor() {
      this.workspace = new WorkspaceManager();
      this.parser    = new TaskParser();
      this.bridge    = null;
      this.pending   = [];
      this._runnerEverOnline = false;
      this.sliders      = new SliderPanel();
      this.conversation = new ConversationView();
      this.player       = new DemoPlayer();
      
      this.pasteBtn = null;
      this.copyBtn  = null;
      this.talkBtn  = null;
      this.talkActive = false;
      
      this._demoPlayBtn = null;
      this._demoFill    = null;
      this._demoCount   = null;
      this._speedBtns   = {};
      this.statusEl = null;
      this.runnerEl = null;
      
      this.cursorEl = null;
      this._reviewEl = null;
      this._dictationMsg = null;
    }

    init(target) {
      this._css();
      const app = makeElement('div', { className: 'sa-app' });
      app.append(this._buildHdr(), this._buildDemoBar(), this._buildMain(), this._buildBar());
      target.appendChild(app);
      this._initPlayer();
      
      this.sliders.onChange = (id, val, s) => {
        if (id === 'depth') {
          const pct = (val - s.min) / (s.max - s.min);
          this.conversation.setDepth(pct);
        }
      };
    }

    _buildHdr() {
      const h = makeElement('div', { className: 'sa-hdr' });
      this.statusEl = makeElement('span', { className: 'sa-folder' }, '⬡ no workspace');
      this.runnerEl = makeElement('span', { className: 'sa-runner sa-runner--off' }, '● offline');
      h.append(this.statusEl, this.runnerEl);
      return h;
    }

    _buildDemoBar() {
      const bar = makeElement('div', { className: 'sa-demo-bar' });
      this._demoPlayBtn = makeElement('button', { className: 'sa-demo-btn sa-demo-play', onclick: () => this.player.toggle() }, '▶');
      const rst = makeElement('button', { className: 'sa-demo-btn', title: 'Restart', onclick: () => this._resetDemo() }, '↺');
      const speeds = makeElement('div', { className: 'sa-demo-speeds' });
      [1, 2, 4].forEach(x => {
        const b = makeElement('button', {
          className: 'sa-speed' + (x === 1 ? ' sa-speed--on' : ''),
          onclick: () => {
            this.player.setSpeed(x);
            Object.entries(this._speedBtns).forEach(([s, el]) => el.classList.toggle('sa-speed--on', Number(s) === x));
          }
        }, x + 'x');
        this._speedBtns[x] = b;
        speeds.appendChild(b);
      });
      const track = makeElement('div', { className: 'sa-demo-track' });
      this._demoFill  = makeElement('div', { className: 'sa-demo-fill' });
      track.appendChild(this._demoFill);
      this._demoCount = makeElement('span', { className: 'sa-demo-count' }, '0 / ' + DemoScript.getBeats().length);
      bar.append(this._demoPlayBtn, rst, speeds, track, this._demoCount);
      return bar;
    }

    _buildMain() {
      const m = makeElement('div', { className: 'sa-main' });
      const c = makeElement('div', { className: 'sa-conv' });
      c.appendChild(this.conversation.render());
      const s = makeElement('div', { className: 'sa-sliders' });
      s.appendChild(this.sliders.render());
      m.append(c, s);
      return m;
    }

    _buildBar() {
      const bar = makeElement('div', { className: 'sa-bar' });
      const folder = this._btn('📁 Folder', 'primary', () => this._chooseFolder());
      this.talkBtn  = this._btn('🎤 Talk', 'talk', () => this._talk());
      this.talkBtn.id = 'talkBtn';
      this.pasteBtn = this._btn('Paste', '', () => this._paste(), true);
      this.copyBtn  = this._btn('Copy',  '', () => this._copy(),  true);
      const cont  = this._btn('Continue', '',     () => this._continue());
      const stat  = this._btn('Status',   'muted', () => this._showStatus());
      bar.append(folder, this.talkBtn, this.pasteBtn, this.copyBtn, cont, stat);
      return bar;
    }

    _initPlayer() {
      this.player.load(DemoScript.getBeats());
      this.player.onBeat     = (beat, player) => this._execBeat(beat, player);
      this.player.onProgress = (idx, total, playing, speed) => this._updateDemoBar(idx, total, playing, speed);
      this.player.onDone     = () => { this._demoPlayBtn.textContent = '↺'; };
      this._updateDemoBar(0, DemoScript.getBeats().length, false, 1);
    }

    _resetDemo() {
      this.player.reset();
      this.conversation.el.innerHTML = '';
      if (this._reviewEl) { this._reviewEl.remove(); this._reviewEl = null; }
      if (this._dictationMsg) { this._dictationMsg = null; }
      if (this.cursorEl) { this.cursorEl.style.opacity = '0'; }
      const defaults = this.sliders._defaultSliders();
      this.sliders.sliders.forEach(s => {
        const d = defaults.find(x => x.id === s.id);
        if (d) { s.value = d.value; this.sliders._updateRow(s.id); }
      });
      this._updateDemoBar(0, DemoScript.getBeats().length, false, 1);
    }

    async _execBeat(beat, player) {
      const mkId = () => 'd' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      switch (beat.type) {
        case 'sys':
          this._sysMsg(beat.text);
          break;
        case 'runner':
          this._setRunner(beat.active);
          break;
        
        // Dictation & Typing
        case 'dictation-start':
          this.talkBtn.textContent = '🔴 Stop';
          this.talkBtn.classList.add('sa-btn--talk-active');
          this.conversation.showTyping('user');
          this._dictationId = mkId();
          this._dictationMsg = this.conversation.addMessage({ id: this._dictationId, role: 'user', name: 'Rob', content: '...', method: 'dictation', timestamp: Date.now() });
          break;
        case 'dictation-text':
          if (this._dictationMsg) {
            const el = this._dictationMsg.querySelector('.cv-content');
            if (el) el.textContent = beat.text;
          }
          break;
        case 'dictation-end':
          this.talkBtn.textContent = '🎤 Talk';
          this.talkBtn.classList.remove('sa-btn--talk-active');
          this.conversation.clearTyping();
          break;
        
        case 'user':
          this.conversation.addMessage({ id: beat.id || mkId(), role: 'user', name: beat.name, content: beat.text, method: beat.method, timestamp: Date.now() });
          break;
        case 'seed':
        case 'llm':
          this.conversation.showTyping('seed');
          await player.sleep(beat.thinkMs || 1500);
          this.conversation.clearTyping();
          this.conversation.addMessage({ id: beat.id || mkId(), role: 'seed', name: beat.name, content: beat.text, method: 'paste', blocks: beat.blocks, timestamp: Date.now() });
          break;
        
        // Sliders (Global)
        case 'slide': {
          const s = this.sliders.get(beat.id);
          if (!s) break;
          const from = s.value, to = beat.to, steps = 15;
          this._ensureCursor();
          const inp = document.getElementById('sp-input-' + beat.id);
          if (inp) {
            const rect = inp.getBoundingClientRect();
            for (let i = 1; i <= steps; i++) {
              const val = from + (to - from) * i / steps;
              this.sliders.set(beat.id, Math.round(val));
              const pct = (val - s.min) / (s.max - s.min);
              this.cursorEl.style.transition = 'none';
              this._moveCursor(rect.left + pct * rect.width, rect.top + rect.height / 2);
              await player.sleep(30);
            }
            this.cursorEl.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
          } else {
            for (let i = 1; i <= steps; i++) {
              this.sliders.set(beat.id, Math.round(from + (to - from) * i / steps));
              await player.sleep(30);
            }
          }
          break;
        }
        
        // Sliders (In-Message Feedback)
        case 'msg-slide': {
          const w = 110; 
          const steps = 15;
          const targetEl = document.getElementById(`msg-slider-${beat.msgId}-${beat.sliderId}`);
          if (!targetEl) break;
          const track = targetEl.querySelector('.msg-slider-fill');
          const thumb = targetEl.querySelector('.msg-slider-thumb');
          const valEl = targetEl.querySelector('.msg-slider-val');
          
          let currentVal = parseFloat(targetEl.dataset.val || 50);
          const from = currentVal;
          const to = beat.to;
          
          this._ensureCursor();
          const svg = targetEl.querySelector('svg');
          const rect = svg.getBoundingClientRect();
          
          for (let i = 1; i <= steps; i++) {
            const val = from + (to - from) * i / steps;
            targetEl.dataset.val = val;
            const cx = (val / 100) * w;
            
            if (track) track.setAttribute('width', String(cx));
            if (thumb) thumb.setAttribute('cx', String(cx));
            if (valEl) valEl.textContent = Math.round(val);
            
            this.cursorEl.style.transition = 'none';
            this._moveCursor(rect.left + cx, rect.top + rect.height / 2);
            await player.sleep(30);
          }
          this.cursorEl.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
          break;
        }

        case 'toggle':
          this.sliders.set(beat.id, beat.val);
          break;

        // Cursor Navigation
        case 'cursor-move': {
          this._ensureCursor();
          const targetEl = document.getElementById(beat.target);
          if (targetEl) {
            if (beat.target.startsWith('msg-slider-')) {
              const svg = targetEl.querySelector('svg');
              const rect = svg.getBoundingClientRect();
              const val = parseFloat(targetEl.dataset.val || 50);
              const x = rect.left + (val / 100) * rect.width;
              const y = rect.top + rect.height / 2;
              this._moveCursor(x, y);
            } else {
              const rect = targetEl.getBoundingClientRect();
              let x = rect.left + rect.width / 2;
              let y = rect.top + rect.height / 2;
              
              if (beat.target.startsWith('sp-input-')) {
                const id = beat.target.replace('sp-input-', '');
                const s = this.sliders.get(id);
                if (s && s.max > 1) {
                  const pct = (s.value - s.min) / (s.max - s.min);
                  x = rect.left + Math.max(6, Math.min(rect.width - 6, pct * rect.width));
                }
              }
              this._moveCursor(x, y);
            }
          }
          break;
        }
        case 'cursor-click':
          this._cursorClick();
          break;
        case 'cursor-scroll': {
          const targetEl = document.getElementById(beat.target);
          if (targetEl) {
            targetEl.scrollBy({ top: beat.amount, behavior: 'smooth' });
          }
          break;
        }

        // Review Popups
        case 'review-show':
          this._showReview(beat);
          break;
        case 'review-expand':
          this._reviewEl?.classList.add('sa-review--expanded');
          break;
        case 'review-compact':
          this._reviewEl?.classList.remove('sa-review--expanded');
          break;
        case 'review-accept':
          if (this._reviewEl) {
            this._reviewEl.remove();
            this._reviewEl = null;
          }
          break;
      }
    }

    _ensureCursor() {
      if (!this.cursorEl) {
        this.cursorEl = makeElement('div', { className: 'sa-demo-cursor' });
        this.cursorEl.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L5.5 3.21z" fill="white" stroke="black" stroke-width="1"/>
        </svg>`;
        document.body.appendChild(this.cursorEl);
        this.cursorX = window.innerWidth / 2;
        this.cursorY = window.innerHeight / 2;
        this.cursorEl.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px)`;
      }
      this.cursorEl.style.opacity = '1';
    }

    _moveCursor(x, y) {
      this.cursorX = x;
      this.cursorY = y;
      if (this.cursorEl) {
        this.cursorEl.style.transform = `translate(${x}px, ${y}px)`;
      }
    }

    _cursorClick() {
      if (!this.cursorEl) return;
      this.cursorEl.classList.remove('sa-demo-cursor--click');
      void this.cursorEl.offsetWidth; 
      this.cursorEl.classList.add('sa-demo-cursor--click');
      setTimeout(() => this.cursorEl.classList.remove('sa-demo-cursor--click'), 150);
    }

    _showReview(beat) {
      if (this._reviewEl) this._reviewEl.remove();
      this._reviewEl = makeElement('div', { className: 'sa-review', id: 'sa-review-box' });
      
      const hdr = makeElement('div', { className: 'sa-review-hdr' });
      hdr.appendChild(makeElement('span', { className: 'sa-review-title' }, beat.title));
      const btnBox = makeElement('div', { className: 'sa-review-btns' });
      
      const btnExpand = makeElement('button', { id: 'rv-expand', className: 'sa-review-btn' }, '⛶');
      const btnCompact = makeElement('button', { id: 'rv-compact', className: 'sa-review-btn' }, '‒');
      const btnAccept = makeElement('button', { id: 'rv-accept', className: 'sa-review-btn sa-review-btn--accept' }, 'Accept');
      
      btnBox.append(btnExpand, btnCompact, btnAccept);
      hdr.appendChild(btnBox);

      const code = makeElement('pre', { id: 'rv-code', className: 'sa-review-code' });
      code.textContent = beat.code;

      this._reviewEl.append(hdr, code);
      document.querySelector('.sa-app').appendChild(this._reviewEl);
    }

    _updateDemoBar(idx, total, playing, speed) {
      const pct = total > 0 ? (idx / total) * 100 : 0;
      this._demoFill.style.width = pct + '%';
      this._demoCount.textContent = idx + ' / ' + total;
      this._demoPlayBtn.textContent = playing ? '⏸' : '▶';
      Object.entries(this._speedBtns).forEach(([s, btn]) => btn.classList.toggle('sa-speed--on', Number(s) === speed));
    }

    async _chooseFolder() {
      const ok = await this.workspace.chooseFolder();
      if (!ok) return;
      this.statusEl.textContent = '⬡ ' + this.workspace.folderName;
      this._sysMsg('Workspace: ' + this.workspace.folderName);
      this._sysMsg('Bootstrapping...');
      await this.workspace.bootstrap(RunnerTemplate.getSource());
      this._sysMsg('Ready.  cd ' + this.workspace.folderName + ' && node runner.mjs');
      this.pasteBtn.disabled = false;
      this.bridge = new RunnerBridge(this.workspace);
      this.bridge.onResult       = r => this._onResult(r);
      this.bridge.onMessage      = m => this._onMsg(m);
      this.bridge.onStatusChange = s => this._onStatusChange(s);
      this.bridge.startPolling();
    }

    async _paste() {
      let text;
      try { text = await navigator.clipboard.readText(); } catch { this._sysMsg('Clipboard read failed.'); return; }
      if (!text?.trim()) { this._sysMsg('Clipboard empty.'); return; }
      const tasks = this.parser.parse(text);
      if (!tasks.length) { this._sysMsg('No SEED tasks found (' + text.length + ' chars). Use Continue to send the protocol.'); return; }
      this.conversation.addMessage({ id: 'p' + Date.now(), role: 'seed', content: text.slice(0, 400) + (text.length > 400 ? '…' : ''), method: 'paste', timestamp: Date.now() });
      this._sysMsg('Parsed ' + tasks.length + ' task(s) - queuing...');
      await this.bridge.queueTasks(tasks);
      this._sysMsg('Tasks queued.');
    }

    async _copy() {
      if (!this.pending.length) { this._sysMsg('Nothing to copy.'); return; }
      await navigator.clipboard.writeText(this.pending.map(m => m.content).join('\n\n---\n\n'));
      this.pending = [];
      this._updateCopyBtn();
      this._sysMsg('Copied to clipboard.');
    }

    async _continue() {
      const text = TaskParser.getProtocol() + '\n\n## Active Preferences\n```\n' + this.sliders.getLLMContext() + '\n```\n';
      await navigator.clipboard.writeText(text);
      this._sysMsg('Protocol + context copied.');
    }

    async _showStatus() { this._sysMsg(await this._statusText()); }

    async _statusText() {
      if (!this.workspace.isReady) return 'No workspace chosen.';
      const raw = await this.workspace.readFile('state/status.json');
      const s = raw ? JSON.parse(raw) : {};
      const [inc, run, done, fail] = await Promise.all([
        this.workspace.readDir('queue/incoming'), this.workspace.readDir('queue/running'),
        this.workspace.readDir('queue/done'),     this.workspace.readDir('queue/failed'),
      ]);
      return 'workspace: ' + this.workspace.folderName + '\nrunner: ' + (s.runnerActive ? 'active (pid ' + s.pid + ')' : 'offline') + '\ntasks: ' + (s.tasksProcessed || 0) + ' processed\nqueue: ' + inc.length + ' in / ' + run.length + ' running / ' + done.length + ' done / ' + fail.length + ' failed';
    }

    _talk() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { this._sysMsg('Speech API not available.'); return; }
      if (this.talkActive) { this._recognition?.stop(); return; }
      this._recognition = new SR();
      this._recognition.continuous = false;
      this._recognition.lang = 'en-US';
      this.talkActive = true;
      this.talkBtn.textContent = '🔴 Stop';
      this.talkBtn.classList.add('sa-btn--talk-active');
      this._recognition.onresult = e => this.conversation.addMessage({ id: 't' + Date.now(), role: 'user', name: 'Rob', content: e.results[0][0].transcript, method: 'dictation', timestamp: Date.now() });
      this._recognition.onend = () => { this.talkActive = false; this.talkBtn.textContent = '🎤 Talk'; this.talkBtn.classList.remove('sa-btn--talk-active'); };
      this._recognition.onerror = () => this._recognition.onend();
      this._recognition.start();
    }

    _onResult(r) {
      this._sysMsg((r.failed ? '✗' : '✓') + ' [' + r.id + '] ' + (r.error || r.summary || (r.failed ? 'failed' : 'done')));
      if (r.output?.trim()) this._sysMsg(r.output.trim().slice(0, 600));
      if (r.returnMessage) { this.pending.push({ content: r.returnMessage }); this._updateCopyBtn(); }
    }

    _onMsg(m) { this._sysMsg('↩ message ready'); this.pending.push(m); this._updateCopyBtn(); }

    _onStatusChange(s) {
      if (!this._runnerEverOnline && !s.runnerActive) return;
      if (s.runnerActive) this._runnerEverOnline = true;
      this._setRunner(s.runnerActive);
      this._sysMsg(s.runnerActive ? 'Runner connected.' : 'Runner went offline.');
    }

    _setRunner(active) {
      this.runnerEl.textContent = active ? '● online' : '● offline';
      this.runnerEl.className = 'sa-runner sa-runner--' + (active ? 'on' : 'off');
    }

    _updateCopyBtn() {
      const n = this.pending.length;
      this.copyBtn.disabled = n === 0;
      this.copyBtn.textContent = n > 0 ? 'Copy (' + n + ')' : 'Copy';
    }

    _sysMsg(text) {
      this.conversation.addMessage({ id: 's' + Date.now() + '-' + Math.random(), role: 'system', content: text, timestamp: Date.now() });
    }

    _btn(label, variant, handler, disabled) {
      const el = makeElement('button', { className: 'sa-btn' + (variant ? ' sa-btn--' + variant : ''), onclick: handler }, label);
      if (disabled) el.disabled = true;
      return el;
    }

    async run(env) {
      this.env = env;
      this.rootElement = env.container;
      this.rootElement.style.cssText = "position: relative; width: 100%; height: 100%; overflow: hidden; background: #020617;";
      this.init(this.rootElement);
      return this;
    }

    _css() {
      applyCss(`
        .sa-app { display:flex; flex-direction:column; height:100vh; overflow:hidden; background:#020617; position:relative; }
        .sa-hdr { display:flex; align-items:center; justify-content:space-between; padding:6px 16px; background:#0f172a; border-bottom:1px solid #1e293b; flex-shrink:0; }
        .sa-folder { font-size:12px; color:#94a3b8; font-family:monospace; }
        .sa-runner { font-size:11px; font-family:monospace; font-weight:bold; }
        .sa-runner--on  { color:#34d399; text-shadow: 0 0 5px rgba(52,211,153,0.5); }
        .sa-runner--off { color:#64748b; }
        .sa-demo-bar { display:flex; align-items:center; gap:10px; padding:6px 16px; background:#020617; border-bottom:1px solid #1e293b; flex-shrink:0; }
        .sa-demo-btn { width:30px; height:24px; background:#1e293b; border:1px solid #334155; color:#94a3b8; border-radius:4px; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; transition:all 0.1s; }
        .sa-demo-btn:hover { background:#334155; color:#cbd5e1; }
        .sa-demo-play { color:#c084fc; border-color:#581c87; background:#3b0764; min-width:36px; }
        .sa-demo-play:hover { background:#4c1d95 !important; color:#d8b4fe; }
        .sa-demo-speeds { display:flex; gap:3px; }
        .sa-speed { padding:3px 8px; font-size:11px; background:#0f172a; border:1px solid #1e293b; color:#64748b; border-radius:3px; cursor:pointer; font-weight:bold; }
        .sa-speed--on { background:#1e3a8a; border-color:#1e40af; color:#60a5fa; }
        .sa-demo-track { flex:1; height:4px; background:#1e293b; border-radius:2px; overflow:hidden; }
        .sa-demo-fill { height:100%; width:0%; background:linear-gradient(to right,#7e22ce,#c084fc); border-radius:2px; transition:width 0.25s ease; box-shadow: 0 0 8px #c084fc; }
        .sa-demo-count { font-size:11px; color:#94a3b8; font-family:monospace; min-width:48px; text-align:right; font-weight:bold; }
        .sa-main { display:flex; flex:1; overflow:hidden; }
        .sa-conv { flex:1; display:flex; flex-direction:column; overflow:hidden; border-right:1px solid #1e293b; }
        .sa-sliders { width:240px; flex-shrink:0; overflow:hidden; background:#0f172a; border-left:1px solid #1e293b; }
        .sa-bar { display:flex; flex-wrap:wrap; gap:6px; padding:8px 14px; background:#0f172a; border-top:1px solid #1e293b; flex-shrink:0; }
        .sa-btn { padding:6px 14px; background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; transition:all 0.1s; }
        .sa-btn:hover:not(:disabled) { background:#334155; color:#cbd5e1; }
        .sa-btn--primary { background:#1e3a8a; border-color:#1e40af; color:#60a5fa; }
        .sa-btn--primary:hover:not(:disabled) { background:#1e40af !important; }
        .sa-btn--talk { background:#064e3b; border-color:#047857; color:#34d399; }
        .sa-btn--talk-active { background:#7f1d1d !important; border-color:#991b1b !important; color:#f87171 !important; box-shadow: 0 0 10px rgba(248,113,113,0.3); }
        .sa-btn--muted { color:#64748b; border-color:#1e293b; }
        
        .sa-demo-cursor {
          position: fixed;
          top: 0; left: 0;
          pointer-events: none;
          z-index: 9999;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));
        }
        .sa-demo-cursor svg {
          transition: transform 0.1s;
          transform-origin: top left;
        }
        .sa-demo-cursor--click svg {
          transform: scale(0.85);
        }
        
        .sa-review {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 450px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.8), 0 0 20px rgba(96,165,250,0.1);
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
          max-height: 180px;
          transition: max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .sa-review--expanded {
          max-height: 500px;
        }
        .sa-review-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
        }
        .sa-review-title {
          font-size: 12px;
          color: #60a5fa;
          font-family: monospace;
          font-weight: bold;
        }
        .sa-review-btns { display: flex; gap: 6px; }
        .sa-review-btn {
          background: #334155;
          border: 1px solid #475569;
          color: #cbd5e1;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          padding: 4px 8px;
          font-weight: bold;
        }
        .sa-review-btn--accept { background: #059669; border-color: #047857; color: #fff; box-shadow: 0 0 8px rgba(5,150,105,0.4); }
        .sa-review-code {
          margin: 0; padding: 12px;
          font-size: 12px; color: #e2e8f0;
          font-family: monospace;
          overflow-y: auto;
          line-height: 1.6;
          background: #020617;
        }
      `, 'sa-styles');
    }

}