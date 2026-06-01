
class ConversationView {
  constructor() {
      this.el = null;
    }

  render() {
      this._css();
      this.el = makeElement('div', { className: 'cv-feed' });
      return this.el;
    }

  addMessage({ id, role, name, content, method, blocks, timestamp }) {
      if (role === 'user') this.lockAllFeedback();

      const charName =
        name || (role === 'user' ? 'Rob' : role === 'seed' ? 'LLM' : 'System');
      const safeCharClass = charName.toLowerCase().replace(/[^a-z]/g, '');

      const wrap = makeElement('div', {
        className: `cv-msg cv-msg--${role} cv-msg--char-${safeCharClass}`,
        id: 'cv-msg-' + id,
      });

      const hdr = makeElement('div', { className: 'cv-hdr' });
      const roleEl = makeElement('span', { className: 'cv-role' });

      if (role === 'user')
        roleEl.textContent =
          method === 'dictation' ? `🎤 ${charName}` : `⌨ ${charName}`;
      else if (role === 'seed') roleEl.textContent = `⬡ ${charName}`;
      else roleEl.textContent = `· ${charName}`;

      hdr.appendChild(roleEl);
      if (method && role !== 'system') {
        hdr.appendChild(
          makeElement(
            'span',
            { className: 'cv-method cv-method--' + method },
            method
          )
        );
      }
      hdr.appendChild(
        makeElement(
          'span',
          { className: 'cv-ts' },
          new Date(timestamp || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )
      );
      const contentEl = makeElement('div', { className: 'cv-content' });
      contentEl.textContent = content || '';
      wrap.append(hdr, contentEl);

      if (blocks && blocks.length) {
        const bw = makeElement('div', { className: 'cv-blocks' });
        blocks.forEach((b) => {
          const icons = {
            'write-file': '📄',
            'run-script': '⚡',
            'run-command': '▸',
            'return-message': '↩',
          };
          const block = makeElement('div', {
            className: 'cv-block cv-block--' + b.type,
          });
          block.appendChild(
            makeElement(
              'div',
              { className: 'cv-block-label' },
              (icons[b.type] || '▸') + ' ' + b.type
            )
          );
          const pre = makeElement('pre', { className: 'cv-block-pre' });
          pre.textContent = (b.summary || b.content || '').slice(0, 400);
          block.appendChild(pre);
          bw.appendChild(block);
        });
        wrap.appendChild(bw);
      }

      if (role === 'seed') {
        const fbBox = this._buildFeedbackBox(id);
        wrap.appendChild(fbBox);
      }

      this.el.appendChild(wrap);
      requestAnimationFrame(() =>
        wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      );
      return wrap;
    }

  _buildFeedbackBox(msgId) {
      const box = makeElement('div', { className: 'cv-fb' });
      box.innerHTML = `<div class="cv-fb-title">↳ MESSAGE FEEDBACK (Sent with next prompt)</div>`;
      const grid = makeElement('div', { className: 'cv-fb-grid' });

      const addSlider = (id, labelL, labelR, color, initVal) => {
        const row = makeElement('div', {
          className: 'cv-fb-row',
          id: `msg-slider-${msgId}-${id}`,
        });
        row.dataset.val = initVal;
        const w = 110;
        const pct = initVal / 100;
        const cx = pct * w;

        row.innerHTML = `
          <span class="cv-fb-label left">${labelL}</span>
          <svg width="${w}" height="14" viewBox="0 0 ${w} 14" class="cv-fb-svg">
            <rect x="0" y="5" width="${w}" height="4" rx="2" fill="#1e293b"/>
            <rect class="msg-slider-fill" x="0" y="5" width="${cx}" height="4" rx="2" fill="${color}"/>
            <circle class="msg-slider-thumb" cx="${cx}" cy="7" r="5" fill="#fff" stroke="${color}" stroke-width="2"/>
          </svg>
          <span class="cv-fb-label right">${labelR}</span>
          <span class="msg-slider-val cv-fb-val">${initVal}</span>
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
          isDragging = true;
          update(e);
          const onMove = (em) => {
            if (isDragging) update(em);
          };
          const onUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
        grid.appendChild(row);
      };

      addSlider('quality', 'Bad', 'Good', '#34d399', 50); 
      addSlider('length', 'Shorter', 'Longer', '#60a5fa', 50); 
      addSlider('style', 'Dry', 'Wild', '#c084fc', 50); 

      box.appendChild(grid);
      return box;
    }

  lockAllFeedback() {
      const active = this.el.querySelectorAll('.cv-fb:not(.locked)');
      active.forEach((fb) => {
        fb.classList.add('locked');
        const title = fb.querySelector('.cv-fb-title');
        if (title)
          title.innerHTML = `🔒 LOCKED FEEDBACK <span style="opacity:0.5">(sent to server)</span>`;
      });
    }

  showTyping(role) {
      this.clearTyping();
      const el = makeElement('div', {
        className: 'cv-typing cv-typing--' + role,
        id: 'cv-typing',
      });
      for (let i = 0; i < 3; i++)
        el.appendChild(makeElement('span', { className: 'cv-dot' }));
      this.el.appendChild(el);
      requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      );
    }

  clearTyping() {
      document.getElementById('cv-typing')?.remove();
    }

  setDepth(pct) {
      const msgs = Array.from(
        this.el.querySelectorAll('.cv-msg:not(.cv-msg--system)')
      );
      if (msgs.length <= 1) return;
      const pool = msgs.length - 1;
      const visibleCount = Math.ceil(pct * pool);
      const cutoffIdx = pool - visibleCount;

      msgs.forEach((m, idx) => {
        if (idx === msgs.length - 1) {
          m.classList.remove('cv-msg--collapsed');
          return;
        }
        if (idx < cutoffIdx) m.classList.add('cv-msg--collapsed');
        else m.classList.remove('cv-msg--collapsed');
      });
    }

  _css() {
      applyCss(`
        .cv-feed { flex:1; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:10px; background:#0f172a; }
        
        .cv-msg { 
          padding:12px 14px; border-radius:6px; border:1px solid transparent; 
          animation:cv-in 0.25s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease, padding 0.4s ease;
          max-height: 1200px;
          overflow: hidden;
        }
        
        .cv-msg--collapsed { max-height: 28px !important; padding-top: 6px !important; padding-bottom: 6px !important; opacity: 0.35 !important; cursor: pointer; }
        .cv-msg--collapsed:hover { opacity: 0.6 !important; }
        .cv-msg--collapsed .cv-content, .cv-msg--collapsed .cv-blocks, .cv-msg--collapsed .cv-fb { opacity: 0; pointer-events: none; transition: opacity 0.2s; }

        @keyframes cv-in { from { opacity:0; transform:translateY(5px); } to { opacity:1; } }
        .cv-msg--user   { background:#1e293b; border-color:#334155; margin-left:32px; }
        .cv-msg--seed   { background:#17163b; border-color:#312e81; margin-right:32px; }
        .cv-msg--system { background:#0f172a; border-color:#1e293b; opacity:0.8; box-shadow: none; }
        
        .cv-hdr { display:flex; align-items:center; gap:7px; margin-bottom:7px; }
        .cv-role { font-size:11px; font-weight:800; letter-spacing:0.07em; text-transform: uppercase; }
        
        .cv-msg--char-rob .cv-role { color: #10b981; }
        .cv-msg--char-chatgpt { background: #0f2922 !important; border-color: #10a37f !important; }
        .cv-msg--char-chatgpt .cv-role { color: #10a37f; }
        .cv-msg--char-gemini { background: #1a163b !important; border-color: #6d28d9 !important; }
        .cv-msg--char-gemini .cv-role { color: #8b5cf6; }
        .cv-msg--char-claude { background: #2a1610 !important; border-color: #9a3412 !important; }
        .cv-msg--char-claude .cv-role { color: #f97316; }
        .cv-msg--system .cv-role { color:#64748b; }
        
        .cv-ts { font-size:9px; color:#64748b; margin-left:auto; font-family:monospace; }
        .cv-method { font-size:9px; padding:2px 6px; border-radius:3px; }
        .cv-method--dictation { background:#064e3b; color:#34d399; }
        .cv-method--paste     { background:#312e81; color:#818cf8; }
        .cv-content { font-size:13px; color:#e2e8f0; line-height:1.65; white-space:pre-wrap; word-break:break-word; }
        .cv-msg--system .cv-content { font-family:monospace; font-size:11px; color:#94a3b8; }
        .cv-blocks { margin-top:9px; display:flex; flex-direction:column; gap:5px; }
        .cv-block { border:1px solid #334155; border-radius:4px; overflow:hidden; }
        .cv-block-label { padding:4px 8px; font-size:10px; font-weight:700; background:#1e293b; color:#94a3b8; }
        .cv-block--run-script   .cv-block-label { color:#60a5fa; border-left:2px solid #60a5fa; }
        .cv-block--write-file   .cv-block-label { color:#34d399; border-left:2px solid #34d399; }
        .cv-block--return-message .cv-block-label { color:#c084fc; border-left:2px solid #c084fc; }
        .cv-block-pre { margin:0; padding:8px 10px; font-size:11px; color:#cbd5e1; background:#0f172a; overflow-x:auto; max-height:150px; font-family:monospace; }
        
        .cv-fb { margin-top:12px; background: #0b0f19; border-radius: 6px; border: 1px solid #1e293b; overflow: hidden; transition: opacity 0.3s; }
        .cv-fb.locked { opacity: 0.6; pointer-events: none; border-style: dashed; }
        .cv-fb.locked .cv-fb-svg { filter: grayscale(0.8) brightness(0.8); }
        .cv-fb-title { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #475569; background: #0f172a; padding: 4px 10px; border-bottom: 1px solid #1e293b; }
        .cv-fb-grid { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 8px 10px; }
        .cv-fb-row { display:flex; align-items:center; gap:8px; flex: 1; min-width: 200px; }
        .cv-fb-label { font-size:9px; color:#64748b; white-space: nowrap; text-transform:uppercase; letter-spacing:0.05em; flex: 1; }
        .cv-fb-label.right { text-align: right; }
        .cv-fb-svg { cursor: pointer; flex-shrink: 0; }
        .cv-fb-val { font-size:11px; color:#cbd5e1; font-family:monospace; font-weight:bold; width: 22px; text-align:right; }
        
        .cv-typing { display:flex; gap:5px; align-items:center; padding:10px 14px; opacity:0.5; }
        .cv-dot { width:5px; height:5px; border-radius:50%; background:#60a5fa; animation:cv-bounce 1.1s infinite ease-in-out; }
        .cv-dot:nth-child(2) { animation-delay:0.18s; }
        .cv-dot:nth-child(3) { animation-delay:0.36s; }
        @keyframes cv-bounce { 0%,80%,100% { transform:scale(0.7); opacity:0.3; } 40% { transform:scale(1.2); opacity:1; } }
      `, 'cv-styles');
    }

}

