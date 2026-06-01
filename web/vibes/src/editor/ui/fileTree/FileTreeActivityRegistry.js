class FileTreeActivityRegistry {
  
  constructor(options = {}) {
    this.states = new Map();
    this.history = [];
    this.maxHistory = options.maxHistory || 800;
    this.document = options.document || document;
    this._installStyles();
  }

  static shared() {
    if (!globalThis.__fileTreeActivityRegistry) {
      globalThis.__fileTreeActivityRegistry = new FileTreeActivityRegistry();
    }

    return globalThis.__fileTreeActivityRegistry;
  }

  mark(path, state, options = {}) {
    if (!path) return false;

    const entry = {
      path,
      state: state || 'active',
      label: options.label || state || 'active',
      detail: options.detail || '',
      at: new Date().toISOString(),
      duration: options.duration || 900,
    };

    this.states.set(path, entry);
    this.history.push(entry);

    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }

    const el = this.findElement(path);
    if (!el) return false;

    this.decorateElement(el, entry);
    return true;
  }

  clear(path) {
    if (!path) return;

    const el = this.findElement(path);
    this.states.delete(path);

    if (!el) return;

    el.classList.remove(
      'file-tree-activity-reading',
      'file-tree-activity-analyzing',
      'file-tree-activity-running',
      'file-tree-activity-paused',
      'file-tree-activity-hotpatched',
      'file-tree-activity-dirty',
      'file-tree-activity-saved'
    );

    const badge = el.querySelector('.file-tree-activity-badge');
    if (badge) badge.remove();
  }

  decorateElement(el, entry) {
    const state = entry.state || 'active';

    el.classList.remove(
      'file-tree-activity-reading',
      'file-tree-activity-analyzing',
      'file-tree-activity-running',
      'file-tree-activity-paused',
      'file-tree-activity-hotpatched',
      'file-tree-activity-dirty',
      'file-tree-activity-saved'
    );

    el.classList.add('file-tree-activity-' + state);

    let badge = el.querySelector('.file-tree-activity-badge');
    if (!badge) {
      badge = this.document.createElement('span');
      badge.className = 'file-tree-activity-badge';
      el.append(badge);
    }

    badge.textContent = this.shortLabel(state);
    badge.title = entry.detail || entry.label || state;

    el.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });

    if (entry.duration > 0 && state !== 'paused' && state !== 'dirty' && state !== 'hotpatched') {
      setTimeout(() => {
        const current = this.states.get(entry.path);
        if (current === entry) this.clear(entry.path);
      }, entry.duration);
    }
  }

  shortLabel(state) {
    const map = {
      reading: 'read',
      analyzing: 'ast',
      running: 'run',
      paused: 'pause',
      hotpatched: 'mem',
      dirty: 'dirty',
      saved: 'save',
      active: 'act',
    };

    return map[state] || String(state).slice(0, 6);
  }

  findElement(path) {
    const roots = [
      this.document.querySelector('.file-tree'),
      this.document.querySelector('.tree-view-container'),
      this.document.querySelector('.project-files-content'),
      this.document,
    ].filter(Boolean);

    for (const root of roots) {
      const found = this.findElementInRoot(root, path);
      if (found) return found;
    }

    return null;
  }

  findElementInRoot(root, path) {
    const nodes = root.querySelectorAll?.('[data-path], [data-file-path], [data-full-path], [title]') || [];

    for (const el of nodes) {
      if (
        el.dataset?.path === path ||
        el.dataset?.filePath === path ||
        el.dataset?.fullPath === path ||
        el.getAttribute?.('title') === path
      ) {
        return el.closest?.('.tree-node, .tree-node-content') || el;
      }
    }

    return null;
  }

  _installStyles() {
    if (this.document.getElementById('file-tree-activity-registry-styles')) return;

    const style = this.document.createElement('style');
    style.id = 'file-tree-activity-registry-styles';
    style.textContent = `
      .file-tree-activity-reading,
      .file-tree-activity-analyzing,
      .file-tree-activity-running,
      .file-tree-activity-paused,
      .file-tree-activity-hotpatched,
      .file-tree-activity-dirty,
      .file-tree-activity-saved {
        position: relative;
        border-radius: 6px;
      }

      .file-tree-activity-reading {
        outline: 1px solid rgba(120,180,255,.75) !important;
        box-shadow: 0 0 8px rgba(120,180,255,.35) !important;
      }

      .file-tree-activity-analyzing {
        outline: 1px solid rgba(120,230,255,.85) !important;
        box-shadow: 0 0 10px rgba(120,230,255,.42) !important;
      }

      .file-tree-activity-running {
        outline: 1px solid rgba(150,255,170,.85) !important;
        box-shadow: 0 0 10px rgba(150,255,170,.42) !important;
      }

      .file-tree-activity-paused {
        outline: 2px solid rgba(255,210,110,.95) !important;
        box-shadow: 0 0 14px rgba(255,210,110,.58) !important;
      }

      .file-tree-activity-hotpatched {
        outline: 2px solid rgba(255,130,230,.95) !important;
        box-shadow: 0 0 14px rgba(255,130,230,.58) !important;
      }

      .file-tree-activity-dirty {
        outline: 1px solid rgba(255,160,90,.88) !important;
        box-shadow: 0 0 10px rgba(255,160,90,.45) !important;
      }

      .file-tree-activity-saved {
        outline: 1px solid rgba(110,255,170,.85) !important;
        box-shadow: 0 0 10px rgba(110,255,170,.45) !important;
      }

      .file-tree-activity-badge {
        display: inline-block;
        margin-left: 5px;
        padding: 1px 4px;
        border-radius: 999px;
        font-size: 9px;
        line-height: 1.2;
        color: white;
        background: rgba(60,90,130,.85);
        vertical-align: middle;
        pointer-events: none;
      }
    `;

    this.document.head.append(style);
  }

}