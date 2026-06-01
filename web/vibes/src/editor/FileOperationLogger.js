// phase2-managed-migration: internal imports/exports stripped
class FileOperationLogger {
  constructor() {
    this.logLevel = 3; // Default to logging only high-priority items (1-3)
    this.logEntries = [];
    this.dialog = null; // Will be set by the main app
  }

  setDialog(dialog) {
    this.dialog = dialog;
  }

  setLogLevel(level) {
    this.logLevel = parseInt(level, 10);
    if (this.dialog) {
      this.dialog.redrawLogs();
    }
  }

  log(priority, message, details = {}) {
    const timestamp = new Date();
    const entry = { priority, message, details, timestamp };
    this.logEntries.push(entry);

    // Performance: Don't render anything if the dialog isn't visible.
    if (!this.dialog || !this.dialog.isVisible()) {
      return;
    }

    // Render immediately if the priority is high enough.
    if (priority <= this.logLevel) {
      this.dialog.addLogEntry(entry);
    }
  }

  clear() {
    this.logEntries = [];
    if (this.dialog) {
      this.dialog.clearLogs();
    }
  }

  getLogs(filterLevel = 10) {
    return this.logEntries.filter((entry) => entry.priority <= filterLevel);
  }

  // Static method for formatting entries into nice HTML.
  static formatEntry(entry) {
    const { priority, message, details, timestamp } = entry;
    const time = timestamp.toLocaleTimeString('en-US', { hour12: false });

    let color = '#9e9e9e'; // Default for low priority
    if (priority <= 1) color = '#f44336'; // Critical
    else if (priority <= 3) color = '#ff9800'; // Important
    else if (priority <= 6) color = '#2196f3'; // Info

    let detailHtml = '';
    if (details.path) {
      detailHtml += ` | <span style="color: #bdbdbd;">${details.path}</span>`;
    }
    if (details.source) {
      const sourceColor = details.source === 'memory' ? '#4caf50' : '#9c27b0';
      detailHtml += ` | <b style="color:${sourceColor};">${details.source}</b>`;
    }
    if (details.size) {
      detailHtml += ` | <i style="opacity: 0.7;">${details.size} bytes</i>`;
    }

    return `
            <div class="log-entry" style="border-left: 3px solid ${color};">
                <span class="log-time">${time}</span>
                <span class="log-message">${message}</span>
                <span class="log-details">${detailHtml}</span>
            </div>
        `;
  }

    


  static _doc_overview() {
      return "### FileOperationLogger\n\nChronologically logs file I/O operations (reads, writes, deletes, and directory scans) along with performance/size metrics. Connects with FileLogDialog to display diagnostics to the user.";
    }

  static _doc_auditing() {
      return `## Decoupled Log Processing\n\nTo maximize editor performance during rapid file mutations:\n- **Volatile Storage**: The logger simply pushes raw parameters into an internal array.\n- **Deferred Formatting**: It bypasses HTML creation and DOM manipulation unless the \`FileLogDialog\` is open, avoiding unnecessary layout thrashing while providing deep, on-demand observability of the file pipeline.`;
    }

  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  
}

