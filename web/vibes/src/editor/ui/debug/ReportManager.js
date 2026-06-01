// phase2-managed-migration: internal imports/exports stripped
// phase1-global-rewrite: internal imports/exports stripped
class ReportManager {
  constructor(storageKey = 'recursi_reports_v1') {
    this.storageKey = storageKey;
    this.checks = [];
    this.suppressedIds = new Set();
    this.listeners = new Set();
    this.load();
  }

  log(id, key, value) {
    if (this.suppressedIds.has(id)) {
      return;
    }

    const newCheck = {
      id: id,
      key: key,
      value: value,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    if (window.projectApp && window.projectApp.settings.showSanityCheckPopups) {
      // This setting name can remain for now
      showDebugMessage(`Report Entry: ${key}`, newCheck);
    }

    this.checks.push(newCheck);

    // THE FIX: Only save and prune when we cross a larger threshold (250)
    const PRUNE_THRESHOLD = 250;
    if (this.checks.length > PRUNE_THRESHOLD) {
      this.save();
    }

    this.listeners.forEach((callback) => callback(newCheck));
  }

  save() {
    const MAX_REPORTS = 200; // The actual maximum we want to keep

    // Prune only if we are significantly over the limit to reduce save frequency
    if (this.checks.length > MAX_REPORTS) {
      // Prune down to MAX_REPORTS
      console.warn(
        `[ReportManager] Pruning old reports before saving. Log count (${this.checks.length}) exceeds maximum (${MAX_REPORTS}).`
      );
      this.checks = this.checks.slice(this.checks.length - MAX_REPORTS);
    }

    try {
      const dataToStore = {
        checks: this.checks,
        suppressedIds: Array.from(this.suppressedIds),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
    } catch (e) {
      console.error('Failed to save reports to localStorage:', e);
    }
  }

  load() {
    try {
      const MAX_REPORTS = 200; // The actual maximum we want to keep
      const stored = localStorage.getItem(this.storageKey);

      if (stored) {
        const data = JSON.parse(stored);
        this.checks = Array.isArray(data.checks) ? data.checks : [];
        this.suppressedIds = new Set(
          Array.isArray(data.suppressedIds) ? data.suppressedIds : []
        );

        // Prune on load if stored data is too big
        if (this.checks.length > MAX_REPORTS) {
          console.warn(
            `[ReportManager] Pruning old reports on load. Log count (${this.checks.length}) exceeds maximum (${MAX_REPORTS}).`
          );
          this.checks = this.checks.slice(this.checks.length - MAX_REPORTS);
          this.save(); // Immediately save the pruned list back to storage to fix the issue.
        }
      } else {
        const oldKey = 'mindfulVibe_reports_v1';
        const oldStored = localStorage.getItem(oldKey);
        if (oldStored) {
          console.log(`Migrating reports from old storage key '${oldKey}'.`);
          const data = JSON.parse(oldStored);
          this.checks = Array.isArray(data.checks) ? data.checks : [];
          this.suppressedIds = new Set(
            Array.isArray(data.suppressedIds) ? data.suppressedIds : []
          );
          this.save();
          localStorage.removeItem(oldKey);
        }
      }
    } catch (e) {
      console.error('Failed to load or parse reports from localStorage:', e);
      // Failsafe: If parsing fails, completely clear storage to recover.
      this.checks = [];
      this.suppressedIds = new Set();
      localStorage.removeItem(this.storageKey);
    }
  }

  suppress(id) {
    if (!this.suppressedIds.has(id)) {
      this.suppressedIds.add(id);
      this.save();
      console.log(`Report ID "${id}" suppressed.`);
    }
  }

  unsuppress(id) {
    if (this.suppressedIds.has(id)) {
      this.suppressedIds.delete(id);
      this.checks.forEach((check) => {
        if (check.id === id) {
          check.acknowledged = false;
        }
      });
      this.save();
      console.log(`Report ID "${id}" unsuppressed.`);
    }
  }

  acknowledge(timestamp) {
    let changed = false;
    this.checks.forEach((check) => {
      if (check.timestamp === timestamp && !check.acknowledged) {
        check.acknowledged = true;
        changed = true;
      }
    });
    if (changed) {
      this.save();
    }
  }

  getPendingChecks() {
    return this.checks.filter(
      (c) => !c.acknowledged && !this.suppressedIds.has(c.id)
    );
  }

  getAllChecks() {
    return this.checks;
  }

  getSuppressedIds() {
    return this.suppressedIds;
  }

  getReportPayload(projectName, checksToReport = null) {
    const pending = checksToReport || this.getPendingChecks();
    const instanceId = window.projectApp
      ? window.projectApp.instanceId
      : 'unknown';

    if (pending.length === 0) {
      return `## Report\n\n**Instance ID:** \`${instanceId}\`\n\n*No pending report items.*`;
    }

    let markdown = `## Report for ${projectName}\n\n`;
    markdown += `**Instance ID:** \`${instanceId}\`\n\n`;
    markdown += `*Generated at: ${new Date().toISOString()}*\n\n---\n\n`;

    pending.forEach((report) => {
      markdown += `### Report ID: \`${report.id}\`\n\n**Key:** ${report.key}\n\n`;
      let valueString;
      if (typeof report.value === 'object' && report.value !== null) {
        if (
          report.id.startsWith('query:response:getSource') &&
          report.value.source &&
          report.value.source.code
        ) {
          valueString = '```javascript\n' + report.value.source.code + '\n```';
        } else if (report.value.promptString) {
          valueString =
            '#### Generated Prompt:\n---\n' + report.value.promptString;
        } else {
          valueString =
            '```json\n' + JSON.stringify(report.value, null, 2) + '\n```';
        }
      } else {
        valueString = String(report.value);
      }
      markdown += '**Value:**\n' + valueString + '\n\n---\n\n';
    });
    return markdown;
  }

  clearChecks(maxAgeSeconds = null) {
    if (maxAgeSeconds === null) {
      this.checks = [];
    } else {
      const now = new Date();
      const cutoff = new Date(now.getTime() - maxAgeSeconds * 1000);
      this.checks = this.checks.filter(
        (check) => new Date(check.timestamp) >= cutoff
      );
    }
    this.save();
    this.listeners.forEach((callback) => callback(null)); // Signal a refresh
    console.log('[ReportManager] Checks cleared based on criteria.');
  }

  subscribe(callback) {
    this.listeners.add(callback);
  }

  unsubscribe(callback) {
    this.listeners.delete(callback);
  }

  clearAll() {
    this.checks = [];
    this.save();
    this.listeners.forEach((callback) => callback(null));
  }

  acknowledgeAllPendingOnLoad() {
    const pending = this.getPendingChecks();
    if (pending.length > 0) {
      pending.forEach((check) => {
        check.acknowledged = true;
      });
      this.save();
      console.log(
        `[ReportManager] Acknowledged ${pending.length} pre-existing reports.`
      );
    }
  }

  getReportAsText() {
    const pendingChecks = this.getPendingChecks();
    if (pendingChecks.length === 0) {
      return 'No pending reports.';
    }

    let reportText = `Report (${new Date().toISOString()})\n`;
    reportText += '================================================\n\n';

    pendingChecks.forEach((check) => {
      reportText += `ID: ${check.id}\n`;
      reportText += `Key: ${check.key}\n`;
      reportText += `Timestamp: ${new Date(
        check.timestamp
      ).toLocaleTimeString()}\n`;
      reportText += `Value:\n${JSON.stringify(check.value, null, 2)}\n`;
      reportText += '------------------------------------------------\n\n';
    });

    return reportText;
  }

    


  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### ReportManager\n\nAn audit log that stores execution telemetry and debug checks. Generates markdown payloads for LLM review.";
    }
}

