class RunnerBridge {
  constructor(workspace) {
      this.workspace = workspace;
      this.pollInterval = null;
      this.pollMs = 1500;
      this.onResult = null;
      this.onStatusChange = null;
      this.onMessage = null;
      this.lastStatus = null;
      this._seen = new Set();
    }

  async queueTask(task) {
      await this.workspace.writeFile(
        `queue/incoming/${task.id}.json`,
        JSON.stringify(task, null, 2)
      );
    }

  async queueTasks(tasks) {
      for (const task of tasks) await this.queueTask(task);
    }

  startPolling() {
      if (this.pollInterval) return;
      this._poll();
      this.pollInterval = setInterval(() => this._poll(), this.pollMs);
    }

  stopPolling() {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

  async _poll() {
      await this._checkStatus();
      await this._checkResults('queue/done', false);
      await this._checkResults('queue/failed', true);
      await this._checkMessages();
    }

  async _checkStatus() {
      const raw = await this.workspace.readFile('state/status.json');
      if (!raw) return;
      try {
        const status = JSON.parse(raw);
        const wasActive = this.lastStatus?.runnerActive;
        this.lastStatus = status;
        if (status.runnerActive !== wasActive) {
          this.onStatusChange?.(status);
        }
      } catch {}
    }

  async _checkResults(dir, isFailed) {
      const entries = await this.workspace.readDir(dir);
      for (const entry of entries) {
        if (entry.kind !== 'file') continue;
        const key = `${dir}/${entry.name}`;
        if (this._seen.has(key)) continue;
        this._seen.add(key);
        const raw = await this.workspace.readFile(key);
        if (!raw) continue;
        try {
          const result = JSON.parse(raw);
          if (isFailed) result.failed = true;
          this.onResult?.(result);
        } catch {
          this.onResult?.({ raw, failed: isFailed, id: entry.name });
        }
      }
    }

  async _checkMessages() {
      const entries = await this.workspace.readDir('messages/to-llm');
      for (const entry of entries) {
        if (entry.kind !== 'file') continue;
        const key = `messages/to-llm/${entry.name}`;
        if (this._seen.has(key)) continue;
        this._seen.add(key);
        const content = await this.workspace.readFile(key);
        if (content) this.onMessage?.({ name: entry.name, content });
      }
    }

  get isRunnerActive() {
      return this.lastStatus?.runnerActive ?? false;
    }

}

