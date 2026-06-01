class FileLogDialog {
  constructor(logger) {
    if (!logger) {
      throw new Error('FileLogDialog requires a FileOperationLogger instance.');
    }
    this.logger = logger;
    this.dialog = null;
    this.logContainer = null;
  }

  show() {
    if (this.dialog && this.dialog.element.isConnected) {
      this.dialog.setZOnTop();
      return;
    }

    const controls = this._createControls();
    this.logContainer = makeElement('div', { className: 'file-log-container' });

    const content = makeElement('div', {}, [
      controls,
      this.logContainer,
      this._getStyles(),
    ]);

    this.dialog = UITools.makeDialog({
      title: 'File Operation Log',
      content: content,
      width: '70vw',
      height: '60vh',
      onClose: () => {
        this.dialog = null;
        this.logContainer = null;
      },
    });

    this.redrawLogs();
  }

  isVisible() {
    return this.dialog && this.dialog.element.isConnected;
  }

  addLogEntry(entry) {
    if (!this.logContainer) return;
    const entryHtml = FileOperationLogger.formatEntry(entry);
    this.logContainer.insertAdjacentHTML('beforeend', entryHtml);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  redrawLogs() {
    if (!this.logContainer) return;
    this.logContainer.innerHTML = '';
    const entries = this.logger.getLogs(this.logger.logLevel);
    const allHtml = entries.map(FileOperationLogger.formatEntry).join('');
    this.logContainer.innerHTML = allHtml;
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  clearLogs() {
    if (this.logContainer) {
      this.logContainer.innerHTML = '';
    }
  }

  _createControls() {
    const levelSelector = makeElement(
      'select',
      {
        id: 'log-level-selector',
        onchange: (e) => this.logger.setLogLevel(e.target.value),
      },
      [
        makeElement('option', { value: 10 }, 'Level 10 (All)'),
        makeElement('option', { value: 8 }, 'Level 8 (Verbose)'),
        makeElement('option', { value: 6 }, 'Level 6 (Info)'),
        makeElement('option', { value: 3 }, 'Level 3 (Important)'),
        makeElement('option', { value: 1 }, 'Level 1 (Critical)'),
      ]
    );
    levelSelector.value = this.logger.logLevel;

    const clearButton = makeElement('button', {
      textContent: 'Clear',
      onclick: () => this.logger.clear(),
    });

    const copyButton = makeElement('button', {
      textContent: 'Copy',
      onclick: () => this._copyLogsToClipboard(),
    });

    return makeElement('div', { className: 'file-log-controls' }, [
      makeElement('label', { htmlFor: 'log-level-selector' }, 'Log Level:'),
      levelSelector,
      copyButton,
      clearButton,
    ]);
  }

  _copyLogsToClipboard() {
    const textToCopy = this.logger
      .getLogs(10)
      .map((entry) => {
        const time = entry.timestamp.toLocaleTimeString('en-US', {
          hour12: false,
        });
        let details = '';
        if (entry.details.path) details += ` | Path: ${entry.details.path}`;
        if (entry.details.source)
          details += ` | Source: ${entry.details.source}`;
        if (entry.details.size)
          details += ` | Size: ${entry.details.size} bytes`;
        return `[${time}] P${entry.priority} - ${entry.message}${details}`;
      })
      .join('\n');

    // Attempt to find the button in the DOM for feedback since it isn't passed directly
    let btn = null;
    if (this.dialog && this.dialog.element) {
      // Heuristic: The copy button is usually the second button in the controls div
      btn = this.dialog.element.querySelector(
        '.file-log-controls button:nth-of-type(1)'
      );
    }

    if (this.dialog && this.dialog.app && this.dialog.app.actionHandler) {
      this.dialog.app.actionHandler.handleTextExport(textToCopy, btn);
    } else {
      navigator.clipboard.writeText(textToCopy);
    }
  }

  _getStyles() {
    return makeElement(
      'style',
      `
            .file-log-controls {
                display: flex;
                align-items: center;
                gap: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--border-color);
                margin-bottom: 10px;
            }
            .file-log-controls label {
                font-weight: bold;
            }
            .file-log-controls select, .file-log-controls button {
                padding: 5px 10px;
            }
             .file-log-controls button:last-child {
                margin-left: auto;
            }
            .file-log-container {
                height: calc(100% - 50px);
                overflow-y: auto;
                font-family: monospace;
                font-size: 0.9em;
                background-color: var(--bg-primary);
                padding: 5px;
            }
            .log-entry {
                padding: 4px 8px;
                margin-bottom: 2px;
                border-radius: 2px;
                display: flex;
                gap: 12px;
                align-items: center;
            }
            .log-time {
                color: var(--text-secondary);
            }
        `
    );
  }

    


  static _doc_overview() {
      return "### FileLogDialog\n\nA scrollable diagnostics overlay for displaying logged file operations. Allows developers to monitor real-time file access, caching, and VFS activity.";
    }

  static _doc_controls() {
      return `## Priority Filtering and Clipboard Formatting\n\n- **Log Redrawing**: Spawns the dialog and triggers a full redraw of the logged history in one pass, formatting entries dynamically based on the active priority threshold.\n- **Clipboard Extraction**: Formats logs into clean, plain-text strings (stripping HTML tags) and copies them to the clipboard.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_features()
      ].join('\n\n');
    }

  

  static _doc_features() {
      return "### Features\n\n- **Dynamic Redraw**: Automatically filters and displays logs according to the chosen log level.\n- **Export capability**: Supports copying processed text logs to the clipboard.";
    }
}

