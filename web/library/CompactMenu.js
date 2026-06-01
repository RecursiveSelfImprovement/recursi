class CompactMenu {
  constructor() {
    this.element = null;
    this._onClickOutside = this._onClickOutside.bind(this);
    this._ensureStyles();
  }

  show(x, y, content, onHide = null) {
    // If we are just updating the content of an already visible menu,
    // we don't want to destroy and recreate it (flicker/state loss).
    if (this.element && this.element.isConnected) {
      // Clear existing content
      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }
      // Append new content
      if (Array.isArray(content)) {
        content.forEach((el) => this.element.appendChild(el));
      } else {
        this.element.appendChild(content);
      }
      // Update position (in case it changed)
      this._position(x, y);

      // Update the hide callback
      this.onHideCallback = onHide;
      return;
    }

    this.hide();

    this.onHideCallback = onHide;

    this.element = makeElement('div', { className: 'compact-menu' });

    if (Array.isArray(content)) {
      content.forEach((el) => this.element.appendChild(el));
    } else {
      this.element.appendChild(content);
    }

    document.body.appendChild(this.element);

    this._position(x, y);

    // Animate in
    requestAnimationFrame(() => {
      if (this.element) this.element.classList.add('visible');
    });

    // Delay listener to prevent immediate closing from the click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', this._onClickOutside);
    }, 50);
  }

  hide() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    document.removeEventListener('mousedown', this._onClickOutside);

    if (this.onHideCallback) {
      this.onHideCallback();
      this.onHideCallback = null;
    }
  }

  _onClickOutside(e) {
    if (this.element && !this.element.contains(e.target)) {
      this.hide();
    }
  }

  _ensureStyles() {
    const css = `
        .compact-menu {
            position: fixed;
            z-index: 2147483647;
            background: #181818;
            border: 1px solid #555;
            box-shadow: 0 6px 24px rgba(0,0,0,0.9);
            border-radius: 6px;
            padding: 6px 0;
            min-width: 140px; /* Made compact as requested */
            color: #eee;
            font-family: 'Segoe UI', sans-serif;
            font-size: 13px;
            opacity: 0;
            transform: translateY(-5px);
            transition: opacity 0.1s ease-out, transform 0.1s ease-out;
            display: flex; flex-direction: column;
        }
        .compact-menu.visible { opacity: 1; transform: translateY(0); }
        
        /* --- Standard Items --- */
        .compact-menu-item {
            padding: 6px 12px; /* Reduced padding for compactness */
            cursor: pointer;
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            transition: background 0.1s;
            user-select: none;
        }
        .compact-menu-item:hover {
            background: #007acc;
            color: white;
        }
        .compact-menu-item .shortcut {
            font-size: 11px; color: #888;
        }
        .compact-menu-item:hover .shortcut { color: rgba(255,255,255,0.8); }

        .compact-menu-separator {
            height: 1px;
            background: #444;
            margin: 4px 0;
        }
        
        .compact-menu-header {
            padding: 4px 12px;
            font-weight: 700;
            color: #888;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
        }

        /* --- Widget / Tool Styles --- */
        .cm-section { padding: 4px 12px; display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
        
        .cm-paint-toggle {
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 8px; border-radius: 4px; cursor: pointer;
            background: #333; border: 1px solid #555;
            font-weight: 600; color: #ddd;
            transition: all 0.1s;
        }
        .cm-paint-toggle:hover { background: #444; border-color: #777; }
        
        /* YELLOW for Paint Active */
        .cm-paint-toggle.active { 
            background: #fbc02d; border-color: #f9a825; color: #111; 
            box-shadow: 0 0 8px rgba(251, 192, 45, 0.4);
        }

        .cm-tool-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .cm-label { color: #ccc; font-size: 12px; }

        .cm-btn-group {
            display: flex; background: #252526; border-radius: 4px; padding: 2px; border: 1px solid #444;
        }
        .cm-btn {
            background: transparent; border: none; color: #aaa;
            padding: 3px 10px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: 500;
        }
        .cm-btn:hover { background: #444; color: #fff; }
        
        /* GREEN for Add */
        .cm-btn.selected { background: #2e7d32; color: #fff; }
        
        /* RED for Subtract */
        .cm-btn.selected-sub { background: #c62828; color: #fff; }
    `;
    applyCss(css, 'CompactMenuStyles');
  }

  _position(x, y) {
    if (!this.element) return;

    const rect = this.element.getBoundingClientRect();
    const pad = 10;

    let finalX = x;
    let finalY = y;

    // Prevent going off right edge
    if (finalX + rect.width > window.innerWidth - pad) {
      finalX = window.innerWidth - rect.width - pad;
    }

    // Prevent going off bottom edge
    if (finalY + rect.height > window.innerHeight - pad) {
      finalY = y - rect.height; // Flip upwards
    }

    this.element.style.left = `${finalX}px`;
    this.element.style.top = `${finalY}px`;
  }


  

  
}
