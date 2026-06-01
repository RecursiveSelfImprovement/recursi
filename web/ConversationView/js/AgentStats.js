
class AgentStats {
  constructor() {
      this.stats = {
        ChatGPT: { words: 0, msgs: 0, color: '#10a37f' },
        Gemini:  { words: 0, msgs: 0, color: '#8b5cf6' },
        Claude:  { words: 0, msgs: 0, color: '#f97316' },
        Rob:     { words: 0, msgs: 0, color: '#3b82f6' }
      };
      this.el = null;
    }

  record(name, text) {
      if (!this.stats[name]) {
        this.stats[name] = { words: 0, msgs: 0, color: '#60a5fa' };
      }
      const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
      this.stats[name].words += words;
      this.stats[name].msgs += 1;
      this.update();
    }

  update() {
      if (!this.el) return;
      Object.keys(this.stats).forEach(name => {
        const wEl = document.getElementById(`stat-w-${name}`);
        if (wEl) wEl.textContent = this.stats[name].words + 'w';
      });
    }

  render() {
      this._css();
      this.el = makeElement('div', { className: 'as-bar' });
      Object.entries(this.stats).forEach(([name, data]) => {
        const badge = makeElement('div', { className: 'as-badge' });
        badge.style.borderColor = data.color;
        
        const nameEl = makeElement('span', { className: 'as-name' }, name);
        nameEl.style.color = data.color;
        
        const wordsEl = makeElement('span', { className: 'as-words', id: `stat-w-${name}` }, data.words + 'w');
        
        badge.append(nameEl, wordsEl);
        this.el.appendChild(badge);
      });
      return this.el;
    }

  _css() {
      applyCss(`
        .as-bar { display:flex; gap:12px; padding:10px 16px; background:#0f172a; border-bottom:1px solid #1e293b; flex-shrink:0; align-items:center; }
        .as-badge { display:flex; gap:8px; align-items:center; padding:4px 10px; background:#1e293b; border-radius:20px; border-left:3px solid transparent; font-size:11px; font-weight:bold; letter-spacing:0.05em; text-transform:uppercase; box-shadow:0 2px 4px rgba(0,0,0,0.2); }
        .as-words { color:#cbd5e1; font-family:monospace; font-size:12px; }
      `, 'as-styles');
    }

}

