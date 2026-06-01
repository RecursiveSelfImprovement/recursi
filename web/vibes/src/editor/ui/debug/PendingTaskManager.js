// phase2-managed-migration: internal imports/exports stripped
// phase1-global-rewrite: internal imports/exports stripped
class PendingTaskManager {
  constructor(storageKey = 'recursi_pendingTasks') {
    this.storageKey = storageKey;
  }

  enqueue(type, payload) {
    const tasks = this.getTasks();
    tasks.push({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save pending task to localStorage:', e);
    }
  }

  getTasks() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to load pending tasks from localStorage:', e);
      return [];
    }
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }

    


  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### PendingTaskManager\n\nSerializes and queues critical commands (like project loads or restarts) to survive page reloads and run immediately upon boot.";
    }
}

