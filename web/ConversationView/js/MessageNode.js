
class MessageNode {
  constructor(msg) {
      this.id = msg.id;
      this.role = msg.role;
      this.name = msg.name || (this.role === 'user' ? 'Rob' : this.role === 'seed' ? 'LLM' : 'System');
      this.content = msg.content || '';
      this.method = msg.method;
      this.blocks = msg.blocks || [];
      this.timestamp = msg.timestamp || Date.now();
      
      this.el = null;
      this.fbBox = null;
    }

  render() {
      this._css();
      const safeCharClass = this.name.toLowerCase().replace(/[^a-z]/g, '');
      this.el = makeElement('div', {
        className: `cv-msg cv-msg--${this.role} cv-msg--char-${safeCharClass}`,
        id: 'cv-msg-' + this.id,
      });

      this.el.append(this._buildHeader(), this._buildContent());
      
      if (this.blocks && this.blocks.length) {
        this.el.appendChild(this._buildBlocks());
      }

      if (this.role === 'seed') {
        this.el.appendChild(this._buildHandoff());
        this.fbBox = this._buildFeedbackBox();
        this.el.appendChild(this.fbBox);
      }

      return this.el;
    }

  updateContent(text) {
      this.content = text;
      const wrap = this.el.querySelector('.cv-body-wrap');
      if (wrap) {
        wrap.replaceWith(this._buildContent());
      }
    }

  _buildHeader() {
      const hdr = makeElement('div', { className: 'cv-hdr' });
      const roleEl = makeElement('span', { className: 'cv-role' });

      if (this.role === 'user') roleEl.textContent = this.method === 'dictation' ? `🎤 ${this.name}` : `⌨ ${this.name}`;
      else if (this.role === 'seed') roleEl.textContent = `⬡ ${this.name}`;
      else roleEl.textContent = `· ${this.name}`;

      hdr.appendChild(roleEl);

      if (this.method && this.role !== 'system') {
        hdr.appendChild(makeElement('span', { className: 'cv-method cv-method--' + this.method }, this.method));
      }

      const ts = new Date(this.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      hdr.appendChild(makeElement('span', { className: 'cv-ts' }, ts));

      return hdr;
    }

  _buildContent() {
      const wrap = makeElement('div', { className: 'cv-body-wrap' });
      
      const parts = this.content.split(/(```[\s\S]*?```)/g);
      
      parts.forEach(part => {
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const lang = lines[0].replace('```', '').trim() || 'code';
          const code = lines.slice(1, -1).join('\n');
          
          const codeWrap = makeElement('div', { className: 'cv-inline-code-wrap' });
          const codeHdr = makeElement('div', { className: 'cv-inline-code-hdr' });
          codeHdr.innerHTML = `<span>${lang}</span>`;
          
          const diffBtn = makeElement('button', { className: 'cv-diff-btn', id: `diff-btn-${this.id}` }, 'Compare & Diff');
          diffBtn.onclick = () => this._toggleDiff(codeWrap, code);
          codeHdr.appendChild(diffBtn);
          
          const pre = makeElement('pre', { className: 'cv-inline-code-pre' }, code);
          codeWrap.append(codeHdr, pre);
          
          const diffCont = makeElement('div', { className: 'cv-diff-cont', id: `diff-cont-${this.id}` });
          codeWrap.appendChild(diffCont);
          
          wrap.appendChild(codeWrap);
        } else if (part.trim() || part === '...') {
          const textNode = makeElement('span', {}, part);
          wrap.appendChild(textNode);
        }
      });

      return wrap;
    }

  _toggleDiff(codeWrap, code) {
      const diffCont = codeWrap.querySelector('.cv-diff-cont');
      const isExpanded = diffCont.classList.contains('expanded');
      
      if (!isExpanded) {
        diffCont.innerHTML = `
          <div class="cv-diff-row remove">- // old placeholder</div>
          <div class="cv-diff-row add">+ ${code.split('\n')[0] || '// new code'}</div>
          <div class="cv-diff-row context">  ... (rest of implementation)</div>
        `;
        diffCont.classList.add('expanded');
      } else {
        diffCont.classList.remove('expanded');
      }
    }

  _buildBlocks() {
      const bw = makeElement('div', { className: 'cv-blocks' });
      this.blocks.forEach(b => {
        const icons = { 'write-file': '📄', 'run-script': '⚡', 'run-command': '▸', 'return-message': '↩' };
        const block = makeElement('div', { className: 'cv-block cv-block--' + b.type });
        block.appendChild(makeElement('div', { className: 'cv-block-label' }, (icons[b.type] || '▸') + ' ' + b.type));
        const pre = makeElement('pre', { className: 'cv-block-pre' }, (b.summary || b.content || '').slice(0, 400));
        block.appendChild(pre);
        bw.appendChild(block);
      });
      return bw;
    }

  _buildHandoff() {
      const wrap = makeElement('div', { className: 'cv-handoff' });
      wrap.innerHTML = `<span class="cv-handoff-lbl">Hand off to:</span>`;
      
      const agents = ['ChatGPT', 'Gemini', 'Claude'].filter(a => a !== this.name);
      agents.forEach(a => {
        const btn = makeElement('button', { className: 'cv-handoff-btn', id: `handoff-${this.id}-${a}` }, `⬡ ${a}`);
        wrap.appendChild(btn);
      });
      
      return wrap;
    }

  _buildFeedbackBox() {
      const box = makeElement('div', { className: 'cv-fb' });
      box.innerHTML = `<div class="cv-fb-title">↳ MULTI-DIMENSIONAL FEEDBACK</div>`;
      const grid = makeElement('div', { className: 'cv-fb-grid' });

      const addSlider = (sid, title, left, right, color, initVal) => {
        const row = makeElement('div', { className: 'cv-fb-row', id: `msg-slider-${this.id}-${sid}` });
        row.dataset.val = initVal;
        const w = 140; 
        const pct = initVal / 100;
        const cx = pct * w;

        row.innerHTML = `
          <div class="cv-fb-col-lbl">${title}</div>
          <div class="cv-fb-col-slider">
            <span class="cv-fb-label left">${left}</span>
            <svg width="${w}" height="24" viewBox="0 0 ${w} 24" class="cv-fb-svg">
              <rect x="0" y="8" width="${w}" height="8" rx="4" fill="#1e293b"/>
              <rect class="msg-slider-fill" x="0" y="8" width="${cx}" height="8" rx="4" fill="${color}"/>
              <circle class="msg-slider-thumb" cx="${cx}" cy="12" r="8" fill="#fff" stroke="${color}" stroke-width="2"/>
            </svg>
            <span class="cv-fb-label right">${right}</span>
            <span class="msg-slider-val cv-fb-val">${initVal}</span>
          </div>
        `;

        const svg = row.querySelector('svg');
        let isDragging = false;
        const update = (e) => {
          if (box.classList.contains('locked')) return;
          const rect = svg.getBoundingClientRect();
          const x = Math.max(0, Math.min(w, e.clientX - rect.left));
          const val = Math.round((x / w) * 100);
          row.dataset.val = val;
          row.querySelector('.msg-slider-fill').setAttribute('width', x);
          row.querySelector('.msg-slider-thumb').setAttribute('cx', x);
          row.querySelector('.msg-slider-val').textContent = val;
        };
        
        svg.addEventListener('mousedown', (e) => {
          if (box.classList.contains('locked')) return;
          isDragging = true; update(e);
          const onMove = em => { if (isDragging) update(em); };
          const onUp = () => { isDragging = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
        grid.appendChild(row);
      };

      addSlider('text-length', 'Text Length', 'Short', 'Long', '#60a5fa', 50);
      addSlider('code-amt', 'Code Amount', 'Less', 'More', '#f472b6', 50);
      addSlider('code-qual', 'Code Quality', 'Bad', 'Good', '#34d399', 50);
      addSlider('ans-qual', 'Answer Qual', 'Bad', 'Good', '#fbbf24', 50);
      addSlider('style', 'Creativity', 'Dry', 'Wild', '#c084fc', 50);

      box.appendChild(grid);
      return box;
    }

  lockFeedback() {
      if (this.fbBox && !this.fbBox.classList.contains('locked')) {
        this.fbBox.classList.add('locked');
        const title = this.fbBox.querySelector('.cv-fb-title');
        if (title) title.innerHTML = `🔒 LOCKED FEEDBACK <span style="opacity:0.5">(captured in context)</span>`;
      }
    }

  _css() {
      applyCss(`
        .cv-msg { 
          padding:16px 20px; border-radius:10px; border:1px solid transparent; 
          animation:cv-in 0.3s cubic-bezier(0.25, 1, 0.5, 1); box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease, padding 0.4s ease;
          max-height: 2500px; overflow: hidden; margin-bottom: 12px;
        }
        .cv-msg--collapsed { max-height: 28px !important; padding-top: 6px !important; padding-bottom: 6px !important; opacity: 0.35 !important; cursor: pointer; }
        .cv-msg--collapsed:hover { opacity: 0.6 !important; }
        .cv-msg--collapsed .cv-body-wrap, .cv-msg--collapsed .cv-blocks, .cv-msg--collapsed .cv-fb, .cv-msg--collapsed .cv-handoff { opacity: 0; pointer-events: none; transition: opacity 0.2s; }

        @keyframes cv-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; } }
        .cv-msg--user   { background:#1e293b; border-color:#334155; margin-left:40px; }
        .cv-msg--seed   { background:#17163b; border-color:#312e81; margin-right:40px; }
        .cv-msg--system { background:#0f172a; border-color:#1e293b; opacity:0.8; box-shadow: none; padding: 10px 16px; margin: 6px 0; }
        
        .cv-hdr { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
        .cv-role { font-size:12px; font-weight:800; letter-spacing:0.08em; text-transform: uppercase; }
        
        .cv-msg--char-rob .cv-role { color: #10b981; }
        .cv-msg--char-chatgpt { background: #0f2922 !important; border-color: #10a37f !important; }
        .cv-msg--char-chatgpt .cv-role { color: #10a37f; }
        .cv-msg--char-gemini { background: #1a163b !important; border-color: #6d28d9 !important; }
        .cv-msg--char-gemini .cv-role { color: #8b5cf6; }
        .cv-msg--char-claude { background: #2a1610 !important; border-color: #9a3412 !important; }
        .cv-msg--char-claude .cv-role { color: #f97316; }
        .cv-msg--system .cv-role { color:#64748b; }
        
        .cv-ts { font-size:10px; color:#64748b; margin-left:auto; font-family:monospace; }
        .cv-method { font-size:10px; padding:2px 8px; border-radius:4px; text-transform:uppercase; font-weight:bold; }
        .cv-method--dictation { background:#064e3b; color:#34d399; }
        .cv-method--paste     { background:#312e81; color:#818cf8; }
        
        .cv-body-wrap { font-size:13.5px; color:#e2e8f0; line-height:1.7; white-space:pre-wrap; word-break:break-word; }
        .cv-msg--system .cv-body-wrap { font-family:monospace; font-size:11px; color:#94a3b8; }
        
        .cv-inline-code-wrap { background:#0b0f19; border:1px solid #1e293b; border-radius:6px; margin:10px 0; overflow:hidden; }
        .cv-inline-code-hdr { display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:6px 12px; font-size:11px; color:#94a3b8; font-family:monospace; font-weight:bold; text-transform:uppercase; }
        .cv-diff-btn { background:#334155; border:none; color:#cbd5e1; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer; font-weight:bold; transition: background 0.2s; }
        .cv-diff-btn:hover { background:#475569; color:#fff; }
        .cv-inline-code-pre { margin:0; padding:12px; font-family:monospace; font-size:12px; color:#cbd5e1; overflow-x:auto; }
        
        .cv-diff-cont { max-height: 0; overflow: hidden; transition: max-height 0.4s ease; background:#020617; }
        .cv-diff-cont.expanded { max-height: 500px; border-top:1px solid #1e293b; }
        .cv-diff-row { font-family:monospace; font-size:12px; padding:2px 12px; white-space:pre; }
        .cv-diff-row.remove { background:#450a0a; color:#fca5a5; }
        .cv-diff-row.add { background:#064e3b; color:#6ee7b7; }
        .cv-diff-row.context { color:#64748b; }
        
        .cv-handoff { margin-top:12px; display:flex; align-items:center; gap:8px; padding-top:12px; border-top:1px dashed #334155; }
        .cv-handoff-lbl { font-size:11px; color:#64748b; font-weight:bold; text-transform:uppercase; }
        .cv-handoff-btn { background:#1e293b; border:1px solid #334155; color:#cbd5e1; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer; font-weight:bold; transition:all 0.2s; }
        .cv-handoff-btn:hover { background:#334155; color:#fff; border-color:#475569; }
        .cv-handoff-btn.active-handoff { background:#059669; color:#fff; border-color:#34d399; }
        
        .cv-fb { margin-top:14px; background: #0b0f19; border-radius: 8px; border: 1px solid #1e293b; overflow: hidden; transition: opacity 0.3s; }
        .cv-fb.locked { opacity: 0.6; pointer-events: none; border-style: dashed; }
        .cv-fb.locked .cv-fb-svg { filter: grayscale(0.8) brightness(0.8); }
        .cv-fb-title { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #475569; background: #0f172a; padding: 6px 12px; border-bottom: 1px solid #1e293b; }
        .cv-fb-grid { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; }
        .cv-fb-row { display:flex; align-items:center; gap:12px; }
        .cv-fb-col-lbl { font-size:10px; color:#94a3b8; font-weight:bold; width:80px; text-transform:uppercase; letter-spacing:0.05em; }
        .cv-fb-col-slider { display:flex; align-items:center; gap:10px; flex:1; }
        .cv-fb-label { font-size:10px; color:#64748b; white-space: nowrap; text-transform:uppercase; letter-spacing:0.05em; width:45px; }
        .cv-fb-label.right { text-align: right; }
        .cv-fb-svg { cursor: pointer; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
        .cv-fb-val { font-size:12px; color:#cbd5e1; font-family:monospace; font-weight:bold; width: 28px; text-align:right; }
      `, 'msg-node-styles');
    }

}

