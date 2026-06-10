class SidePanel {
    constructor(side, width = 360, env = null) {
      this.side = side;
      this.width = width;
      this.isOpen = false;
      this.sections = {};
      this.env = env;
  
      // Strictly resolve the container from the environment object, falling back to document.body
      this.container = (env && env.container) ? env.container : document.body;
  
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
        justify: side === 'left' ? 'flex-end' : 'flex-start',
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
      closeBtn.textContent = '✖';
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

      this._injectStyles();
    }

    _injectGenericStyles() {
      const css = `
        /* Generic Reusable SidePanel Styles */
        .generic-side-panel {
          position: fixed;
          top: 0;
          height: 100%;
          background: rgba(18, 18, 18, 0.95);
          transition: transform 0.25s cubic-bezier(0.2, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          z-index: 9999;
          box-shadow: 0 0 15px rgba(0,0,0,0.5);
        }
        
        .generic-side-panel.left {
          left: 0;
          transform: translateX(-100%);
        }
        .generic-side-panel.right {
          right: 0;
          transform: translateX(100%);
        }
        .generic-side-panel.open-panel {
          transform: translateX(0) !important;
        }

        /* Flex Margin Pushing Mode */
        .generic-side-panel-margin {
          position: relative;
          height: 100%;
          background: #16161a;
          color: #ddd;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #2e2e38;
          transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
          flex-shrink: 0;
          z-index: 1000;
          font-family: sans-serif;
          overflow: hidden;
          box-sizing: border-box;
          opacity: 1;
        }
        .generic-side-panel-margin.closed-panel {
          opacity: 0;
          pointer-events: none;
        }

        .generic-side-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #0d0d11;
          border-bottom: 1px solid #2e2e38;
        }
        .generic-side-panel-title {
          font-family: 'Architects Daughter', sans-serif;
          font-size: 15px;
          font-weight: bold;
          color: #00ff66;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .generic-side-panel-close-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 15px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.15s, color 0.15s;
        }
        .generic-side-panel-close-btn:hover {
          background: #2a2a35;
          color: #fff;
        }

        .generic-side-panel-content {
          flex-grow: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .generic-side-panel-content::-webkit-scrollbar {
          width: 6px;
        }
        .generic-side-panel-content::-webkit-scrollbar-track {
          background: #0d0d11;
        }
        .generic-side-panel-content::-webkit-scrollbar-thumb {
          background: #2e2e38;
          border-radius: 3px;
        }
        .generic-side-panel-content::-webkit-scrollbar-thumb:hover {
          background: #00ff66;
        }

        /* Generic Expandable Section (details/summary) */
        .generic-sidebar-section {
          border: 1px solid #2e2e38;
          background: #0d0d11;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .generic-sidebar-section summary {
          padding: 10px 14px;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #00ff66;
          cursor: pointer;
          user-select: none;
          background: #16161a;
          border-bottom: 1px solid #2e2e38;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .generic-sidebar-section summary::-webkit-details-marker {
          display: none;
        }
        .generic-sidebar-section summary::after {
          content: '▼';
          font-size: 9px;
          color: #888;
          transition: transform 0.2s;
        }
        .generic-sidebar-section[open] summary::after {
          transform: rotate(-180deg);
        }
        .generic-sidebar-section-body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: visible;
          height: auto;
        }

        /* Generic Nested Subsection / Subcategory */
        .generic-sidebar-subsection {
          border: 1px solid #222;
          background: #121216;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 6px;
          margin-left: 8px;
        }
        .generic-sidebar-subsection summary {
          padding: 8px 12px;
          font-weight: 600;
          font-size: 10px;
          text-transform: capitalize;
          letter-spacing: 0.3px;
          color: #88ffaa;
          cursor: pointer;
          user-select: none;
          background: #1a1a20;
          border-bottom: 1px solid #222;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .generic-sidebar-subsection summary::-webkit-details-marker {
          display: none;
        }
        .generic-sidebar-subsection summary::after {
          content: '▼';
          font-size: 8px;
          color: #666;
          transition: transform 0.2s;
        }
        .generic-sidebar-subsection[open] summary::after {
          transform: rotate(-180deg);
        }
        .generic-sidebar-subsection-body {
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow: visible;
          height: auto;
        }

        .generic-side-panel-show-btn {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 1001;
          background: #0d0d11;
          color: #00ff66;
          border: 1px solid #2e2e38;
          border-radius: 4px;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          transition: background 0.15s, color 0.15s;
          display: none;
        }
        .generic-side-panel-show-btn:hover {
          background: #2a2a35;
          color: #fff;
        }
      `;
      applyCss(css, 'generic-sidepanel-styles');
    }

    _createElements() {
      this.element = document.createElement('div');
      this.element.style.width = `${this.width}px`;

      if (this.transitionMode === 'transform') {
        this.element.className = `generic-side-panel ${this.side}`;
        
        this.header = document.createElement('div');
        Object.assign(this.header.style, {
          display: 'flex',
          justifyContent: this.side === 'left' ? 'flex-end' : 'flex-start',
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
        closeBtn.onclick = () => this.close();
        this.header.appendChild(closeBtn);

        this.contentContainer = document.createElement('div');
        this.contentContainer.style.cssText = 'flex:1; overflow-y:auto; overflow-x:hidden; padding:10px;';

        this.element.appendChild(this.header);
        this.element.appendChild(this.contentContainer);
        this.container.appendChild(this.element);
      } else {
        // Margin / Pushing Mode
        this.element.className = 'generic-side-panel-margin';
        
        this.header = document.createElement('div');
        this.header.className = 'generic-side-panel-header';
        
        const titleEl = document.createElement('h2');
        titleEl.className = 'generic-side-panel-title';
        titleEl.textContent = 'Control Panel';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'generic-side-panel-close-btn';
        closeBtn.textContent = '◀';
        closeBtn.onclick = () => this.toggle(false);

        this.header.appendChild(titleEl);
        this.header.appendChild(closeBtn);

        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'generic-side-panel-content';

        this.element.appendChild(this.header);
        this.element.appendChild(this.contentContainer);

        this.showButton = document.createElement('button');
        this.showButton.className = 'generic-side-panel-show-btn';
        this.showButton.textContent = '▶ Menu';
        this.showButton.onclick = () => this.toggle(true);

        this.container.appendChild(this.showButton);
        this.container.appendChild(this.element);
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

    addSubSection(parentSectionId, id, title, defaultOpen = false) {
      const parent = this.sections[parentSectionId];
      if (!parent) return null;

      const content = document.createElement('div');
      content.className = 'generic-sidebar-subsection-body';

      const summary = document.createElement('summary');
      summary.textContent = title;

      const lsKey = `panel_sub_${id}`;
      const stored = localStorage.getItem(lsKey);
      const isOpen = stored !== null ? stored === 'true' : defaultOpen;

      const det = document.createElement('details');
      det.className = 'generic-sidebar-subsection';
      det.open = isOpen;
      det.appendChild(summary);
      det.appendChild(content);

      det.addEventListener('toggle', (e) => {
        e.stopPropagation();
        localStorage.setItem(lsKey, det.open);
        window.dispatchEvent(new CustomEvent('panel-toggle-complete'));
      });

      parent.appendChild(det);
      this.sections[id] = content;
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

    toggle(open) {
      this.isOpen = open;
      if (this.transitionMode === 'transform') {
        if (open) this.open();
        else this.close();
      } else {
        if (open) {
          this.element.classList.remove('closed-panel');
          this.element.style.marginLeft = '0';
          this.showButton.style.display = 'none';
        } else {
          this.element.classList.add('closed-panel');
          this.element.style.marginLeft = `-${this.width}px`;
          this.showButton.style.display = 'block';
        }
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('panel-toggle-complete'));
        }, 300);
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
  
  _injectStyles() {
      const css = `
        /* Generic Reusable SidePanel Styles */
        .generic-side-panel {
          position: absolute;
          top: 0;
          height: 100%;
          transition: transform 0.25s cubic-bezier(0.2, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          z-index: 9999;
          box-sizing: border-box;
        }
        
        .generic-side-panel.left {
          left: 0;
          transform: translateX(-100%);
        }
        
        .generic-side-panel.right {
          right: 0;
          transform: translateX(100%);
        }
        
        .generic-side-panel.open {
          transform: translateX(0) !important;
        }

        .generic-side-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .generic-side-panel-sections {
          flex-grow: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Custom scrollbar for the yt-side-panel and generic-side-panel scrollable containers */
        .yt-side-panel div::-webkit-scrollbar,
        .generic-side-panel div::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .yt-side-panel div::-webkit-scrollbar-track,
        .generic-side-panel div::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.15);
        }
        .yt-side-panel div::-webkit-scrollbar-thumb,
        .generic-side-panel div::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 3px;
          transition: background 0.15s ease;
        }
        .yt-side-panel div::-webkit-scrollbar-thumb:hover,
        .generic-side-panel div::-webkit-scrollbar-thumb:hover {
          background: #00e676;
        }
      `;
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
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
}