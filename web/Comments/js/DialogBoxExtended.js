class DialogBoxExtended {
  constructor(options = {}) {
    this.options = options;
    const content = options.content;
    
    const footer = makeElement('div', { 
      className: 'uw-footer', 
      style: 'display: flex; justify-content: flex-end; gap: 8px; padding: 8px 14px; background: rgba(0,0,0,0.15); border-top: 1px solid var(--border-color); border-radius: 0 0 12px 12px;' 
    });

    const buttons = (options.buttons || []).map(btn => {
      if (btn.instance) {
        const el = btn.instance;
        el.classList.add('uw-btn');
        el.onclick = (e) => {
          e.preventDefault();
          if (btn.onClick) btn.onClick(e, () => this.close());
        };
        return el;
      }
      
      const el = makeElement('button', { 
        className: 'uw-btn',
        textContent: btn.label || 'OK',
        onclick: (e) => {
          e.preventDefault();
          if (btn.isCloseButton) {
            this.close();
          } else if (btn.onClick) {
            btn.onClick(e, () => this.close());
          } else {
            this.close();
          }
        }
      });
      return el;
    });
    
    buttons.forEach(b => footer.appendChild(b));

    const wrapper = makeElement('div', { style: 'display: flex; flex-direction: column; height: 100%;' }, [
      content,
      footer
    ]);

    this.dialog = UITools.makeDialog({
      env: options.env || window.commentsApp?.env || null,
      title: options.title || 'Dialog',
      contentElement: wrapper,
      width: options.width || '450px',
      onClose: () => {
        if (options.onClose) options.onClose();
      }
    });
  }

  close() {
    if (this.dialog) {
      this.dialog.close();
      this.dialog = null;
    }
  }
}
globalThis.DialogBoxExtended = DialogBoxExtended;
