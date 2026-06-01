class SidePanel {
    
    /**
     * @typedef {Object} VibesEnvironment
     * @property {HTMLElement} container
     */

    /**
     * @param {string} side - 'left' or 'right'
     * @param {number} width - width in pixels
     * @param {VibesEnvironment} env - The app environment containing the host container
     */
    constructor(side, width = 360, env = null) {
      this.side = side;
      this.width = width;
      this.isOpen = false;
      this.sections = {};
      this.env = env;
  
      let container = document.body;
      if (env && env.container) {
        container = env.container;
      } else if (env instanceof HTMLElement) {
        container = env;
      }
      this.container = container;
  
      this.element = document.createElement('div');
      this.element.className = `yt-side-panel ${side}`;
      
      const isAbsolute = this.container !== document.body;
      
      Object.assign(this.element.style, {
        position: isAbsolute ? 'absolute' : 'fixed',
        top: '0',
        [side]: '0',
        width: `${this.width}px`,
        height: '100%',
        background: 'rgba(18, 18, 18, 0.95)',
        borderLeft: side === 'right' ? '1px solid #333' : 'none',
        borderRight: side === 'left' ? '1px solid #333' : 'none',
        transition: 'transform 0.25s cubic-bezier(0.2, 0.0, 0.2, 1)',
        transform: side === 'left' ? 'translateX(-100%)' : 'translateX(100%)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999
      });
  
      this.header = document.createElement('div');
      Object.assign(this.header.style, {
        display: 'flex',
        justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
        padding: '8px 10px',
        borderBottom: '1px solid #333',
        background: 'rgba(0,0,0,0.2)'
      });
  
      const closeBtn = document.createElement('button');
      Object.assign(closeBtn.style, {
        background: 'transparent',
        border: 'none',
        color: '#888',
        fontSize: '18px',
        cursor: 'pointer',
        padding: '0 5px',
        lineHeight: '1',
        borderRadius: '4px'
      });
      closeBtn.textContent = '✕';
      closeBtn.onmouseenter = (e) => (e.target.style.color = '#fff');
      closeBtn.onmouseleave = (e) => (e.target.style.color = '#888');
      closeBtn.onclick = () => {
        this.close();
        window.dispatchEvent(new CustomEvent('panel-toggle-complete'));
      };
  
      this.header.appendChild(closeBtn);
  
      this.contentContainer = document.createElement('div');
      this.contentContainer.style.cssText = 'flex:1; overflow-y:auto; overflow-x:hidden; padding:10px;';
  
      this.element.appendChild(this.header);
      this.element.appendChild(this.contentContainer);
      this.container.appendChild(this.element);
  
      SidePanel.getInstances()[side] = this;
      
      // Auto-destroy lifecycle
      if (this.env && this.env.container) {
        this._lifecycleObserver = new MutationObserver(() => {
          if (!document.body.contains(this.env.container)) {
            this.destroy();
          }
        });
        this._lifecycleObserver.observe(document.body, { childList: true, subtree: true });
      }
    }

    addSection(id, title, defaultOpen) {
      const content = document.createElement('div');
      content.style.padding = '10px';
  
      const summary = document.createElement('summary');
      Object.assign(summary.style, {
        padding: '10px',
        cursor: 'pointer',
        fontWeight: '700',
        color: '#bbb',
        fontSize: '11px',
        textTransform: 'uppercase'
      });
      summary.textContent = title;
  
      const lsKey = `yt_panel_sec_${id}`;
      const stored = localStorage.getItem(lsKey);
      const isOpen = stored !== null ? stored === 'true' : defaultOpen;
  
      const det = document.createElement('details');
      det.open = isOpen;
      Object.assign(det.style, {
        marginBottom: '8px',
        border: '1px solid #333',
        background: '#222',
        borderRadius: '4px'
      });
      det.appendChild(summary);
      det.appendChild(content);
  
      det.addEventListener('toggle', () => {
        localStorage.setItem(lsKey, det.open);
        window.dispatchEvent(new CustomEvent('panel-toggle-complete'));
      });
  
      this.contentContainer.appendChild(det);
      this.sections[id] = { element: det, content: content };
      return content;
    }

    _animateLayoutUpdate() {
      const start = performance.now();
      const animate = (time) => {
        SidePanel.updateGlobalSafeArea();
        if (time - start < 300) {
          requestAnimationFrame(animate);
        } else {
          SidePanel.updateGlobalSafeArea();
          window.dispatchEvent(new CustomEvent('panel-toggle-complete'));
        }
      };
      requestAnimationFrame(animate);
    }

    open(sectionId) {
      this.isOpen = true;
      this.element.style.transform = 'translateX(0)';

      if (sectionId && this.sections[sectionId]) {
        this.sections[sectionId].element.open = true;
      }

      this._animateLayoutUpdate();

      if (this.side === 'left' && window.player && window.player.floatingMenuBtn) {
        window.player.floatingMenuBtn.style.display = 'none';
      }
    }

    close() {
      this.isOpen = false;
      this.element.style.transform =
        this.side === 'left' ? 'translateX(-100%)' : 'translateX(100%)';

      this._animateLayoutUpdate();

      if (this.side === 'left' && window.player && window.player.floatingMenuBtn) {
        window.player.floatingMenuBtn.style.display = 'block';
      }
    }
    
    destroy() {
      this._lifecycleObserver?.disconnect();
      if (this.element && this.element.parentElement) {
        this.element.remove();
      }
      SidePanel.getInstances()[this.side] = null;
    }

    static updateGlobalSafeArea() {
      if (typeof SidePanel._lastSafeAreaKey === 'undefined') {
        SidePanel._lastSafeAreaKey = null;
      }
  
      let l = 0;
      let r = 0;
  
      if (!document.fullscreenElement) {
        const leftPanel = SidePanel.getInstances().left;
        if (leftPanel && leftPanel.element && leftPanel.isOpen) {
          l = leftPanel.element.offsetWidth;
        }
  
        const rightPanel = SidePanel.getInstances().right;
        if (rightPanel && rightPanel.element && rightPanel.isOpen) {
          r = rightPanel.element.offsetWidth;
        }
      }
  
      if (
        typeof UITools !== 'undefined' &&
        typeof UITools.setSafeArea === 'function'
      ) {
        UITools.setSafeArea({ left: l, right: r, top: 0, bottom: 0 });
      }
  
      const currentKey = l + '-' + r + '-safearea';
      if (SidePanel._lastSafeAreaKey === currentKey) {
        return; 
      }
      SidePanel._lastSafeAreaKey = currentKey;
  
      const evt = new CustomEvent('layout-safe-area-change', {
        detail: { left: l, right: r },
      });
      window.dispatchEvent(evt);
    }

    toggleSection(id) {
      const section = this.sections[id];
      if (!section) return;
  
      if (!this.isOpen) {
        section.element.open = true;
        this.open();
      } else {
        if (section.element.open) {
          this.close();
        } else {
          section.element.open = true;
          this._animateLayoutUpdate();
        }
      }
    }

    toggleGroup(mainId, others = []) {
      const main = this.sections[mainId];
      if (!main) return;
  
      if (!this.isOpen) {
        main.element.open = true;
        others.forEach((id) => {
          if (this.sections[id]) this.sections[id].element.open = true;
        });
        this.open();
      } else {
        if (main.element.open) {
          this.close();
        } else {
          main.element.open = true;
          others.forEach((id) => {
            if (this.sections[id]) this.sections[id].element.open = true;
          });
          this._animateLayoutUpdate();
        }
      }
    }

    static sp_state() {
      if (!this._state) this._state = { instances: { left: null, right: null } };
      return this._state;
    }

    static getInstances() {
      if (!this._instances) {
        this._instances = { left: null, right: null };
      }
      return this._instances;
    }

  
}