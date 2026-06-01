
class SidePanel {
    
    constructor(side, width = 360, container = document.body) {
      this.side = side;
      this.width = width;
      this.isOpen = false;
      this.sections = {};
  
      this.element = makeElement('div', {
        className: `yt-side-panel ${side}`,
        style: {
          position: 'absolute',
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
        },
      });
  
      this.header = makeElement('div', {
        style: {
          display: 'flex',
          justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
          padding: '8px 10px',
          borderBottom: '1px solid #333',
          background: 'rgba(0,0,0,0.2)',
        },
      });
  
      const closeBtn = makeElement(
        'button',
        {
          style: {
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0 5px',
            lineHeight: '1',
            borderRadius: '4px',
          },
          onmouseenter: (e) => (e.target.style.color = '#fff'),
          onmouseleave: (e) => (e.target.style.color = '#888'),
          onclick: () => {
            this.close();
            window.dispatchEvent(new CustomEvent('panel-toggle-complete'));
          },
        },
        '✕'
      );
  
      this.header.appendChild(closeBtn);
  
      this.contentContainer = makeElement('div', {
        style: 'flex:1; overflow-y:auto; overflow-x:hidden; padding:10px;',
      });
  
      this.element.appendChild(this.header);
      this.element.appendChild(this.contentContainer);
      container.appendChild(this.element);
  
      SidePanel.getInstances()[side] = this;
    }

  addSection(id, title, defaultOpen) {
    const content = makeElement('div', {
      style: { padding: '10px' },
    });

    const summary = makeElement(
      'summary',
      {
        style: {
          padding: '10px',
          cursor: 'pointer',
          fontWeight: '700',
          color: '#bbb',
          fontSize: '11px',
          textTransform: 'uppercase',
        },
      },
      title
    );

    // Read state from localStorage to remember what the user left open
    const lsKey = `yt_panel_sec_${id}`;
    const stored = localStorage.getItem(lsKey);
    const isOpen = stored !== null ? stored === 'true' : defaultOpen;

    const det = makeElement(
      'details',
      {
        open: isOpen,
        style: {
          marginBottom: '8px',
          border: '1px solid #333',
          background: '#222',
          borderRadius: '4px',
        },
      },
      [summary, content]
    );

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
        // 300ms allows the 250ms CSS transition to fully complete
        requestAnimationFrame(animate);
      } else {
        // Final snap
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

