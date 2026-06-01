class ClipboardCatcherWidget {
  
  constructor(app) {
    this.app = app || window._dev_projectEditorInstance;
    this.name = 'Clipboard Catcher';
    this.isActive = false;
    this.element = this.render();
  }

  getElement() {
    return this.element;
  }

  render() {
    const container = makeElement('div', {
      className: 'clipboard-catcher-widget',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        height: '300px',
      },
    });

    this.toggleBtn = makeElement('button', {
      className: 'command-btn',
      textContent: 'Activate Catch Mode',
      style: {
        backgroundColor: '#333',
        color: '#ccc',
        border: '1px solid #555',
        textAlign: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
      },
      onclick: () => this.toggleActive(),
    });

    this.outputArea = makeElement('textarea', {
      placeholder:
        'Captured text from other buttons will appear here when active...',
      style: {
        flex: 1,
        width: '100%',
        padding: '10px',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        border: '1px solid #444',
        borderRadius: '4px',
        fontFamily: 'monospace',
        resize: 'none',
        boxSizing: 'border-box',
      },
    });

    container.append(this.toggleBtn, this.outputArea);
    return container;
  }

  toggleActive() {
    this.isActive = !this.isActive;

    if (this.isActive) {
      this.toggleBtn.textContent = 'Catching... (Click to Stop)';
      this.toggleBtn.style.backgroundColor = '#2e7d32'; // Green
      this.toggleBtn.style.color = 'white';
      this.toggleBtn.style.borderColor = '#1b5e20';
      this.app.setClipboardSink(this);
    } else {
      this.toggleBtn.textContent = 'Activate Catch Mode';
      this.toggleBtn.style.backgroundColor = '#333';
      this.toggleBtn.style.color = '#ccc';
      this.toggleBtn.style.borderColor = '#555';
      this.app.setClipboardSink(null);
    }
  }

  receive(text) {
    const timestamp = new Date().toLocaleTimeString();
    const header = `--- Received at ${timestamp} ---\n`;

    // Prepend new content
    const separator = this.outputArea.value ? '\n\n' : '';
    this.outputArea.value = header + text + separator + this.outputArea.value;

    // Flash effect to indicate receipt
    this.outputArea.style.borderColor = '#00bfa5';
    this.outputArea.style.boxShadow = '0 0 10px rgba(0, 191, 165, 0.3)';
    setTimeout(() => {
      this.outputArea.style.borderColor = '#444';
      this.outputArea.style.boxShadow = 'none';
    }, 500);
  }

  // Cleanup if widget is removed
  destroy() {
    if (this.isActive) {
      this.app.setClipboardSink(null);
    }
  }

  static _doc() {
    return [
      this._doc_overview(),
      this._doc_redirection()
    ].join('\n\n---\n\n');
  }

  static _doc_overview() {
    return `# ClipboardCatcherWidget\n\nThe \`ClipboardCatcherWidget\` is a specialized playground tool designed to intercept text that would normally be copied to the operating system's clipboard.`;
  }

  static _doc_redirection() {
    return `## Redirection\n\nBy registering itself as the active \`clipboardSink\` on the main application, tools like the \`BuildPromptTab\` or \`OutputTab\` will route their text payloads directly to this widget. This is highly useful for debugging prompt generation or capturing LLM output streams without overwriting the user's actual clipboard.`;
  }

}

