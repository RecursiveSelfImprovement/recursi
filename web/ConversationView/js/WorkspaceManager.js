class WorkspaceManager {
  constructor() {
      this.rootHandle = null;
      this.isReady = false;
    }

  async chooseFolder() {
      try {
        this.rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        this.isReady = true;
        return true;
      } catch (e) {
        if (e.name !== 'AbortError') throw e;
        return false;
      }
    }

  async ensureDir(relativePath) {
      const parts = relativePath.split('/').filter(Boolean);
      let dir = this.rootHandle;
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part, { create: true });
      }
      return dir;
    }

  async writeFile(relativePath, content) {
      const parts = relativePath.split('/').filter(Boolean);
      const fileName = parts.pop();
      const dir = parts.length > 0
        ? await this.ensureDir(parts.join('/'))
        : this.rootHandle;
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    }

  async readFile(relativePath) {
      try {
        const parts = relativePath.split('/').filter(Boolean);
        const fileName = parts.pop();
        let dir = this.rootHandle;
        for (const part of parts) {
          dir = await dir.getDirectoryHandle(part);
        }
        const fileHandle = await dir.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return await file.text();
      } catch {
        return null;
      }
    }

  async readDir(relativePath) {
      try {
        const parts = relativePath.split('/').filter(Boolean);
        let dir = this.rootHandle;
        for (const part of parts) {
          dir = await dir.getDirectoryHandle(part, { create: true });
        }
        const entries = [];
        for await (const entry of dir.values()) {
          entries.push({ name: entry.name, kind: entry.kind });
        }
        return entries;
      } catch {
        return [];
      }
    }

  async deleteFile(relativePath) {
      try {
        const parts = relativePath.split('/').filter(Boolean);
        const fileName = parts.pop();
        let dir = this.rootHandle;
        for (const part of parts) {
          dir = await dir.getDirectoryHandle(part);
        }
        await dir.removeEntry(fileName);
        return true;
      } catch {
        return false;
      }
    }

  get folderName() {
      return this.rootHandle?.name ?? null;
    }

  async bootstrap(runnerSource) {
      const dirs = [
        'queue/incoming', 'queue/running', 'queue/done', 'queue/failed',
        'messages/to-llm', 'messages/from-web',
        'logs', 'state',
        'generated/scripts', 'generated/patches', 'generated/tools',
        'temp',
      ];
      for (const d of dirs) await this.ensureDir(d);

      await this.writeFile('runner.mjs', runnerSource);

      const config = {
        version: '0.1.0',
        created: new Date().toISOString(),
        capabilities: {
          writeFiles: true,
          runScripts: true,
          runCommands: false,
          installDeps: false,
        },
      };
      await this.writeFile('config.json', JSON.stringify(config, null, 2));
      await this.writeFile('capabilities.json', JSON.stringify(config.capabilities, null, 2));
      await this.writeFile('state/status.json', JSON.stringify({
        runnerActive: false,
        lastSeen: null,
        tasksProcessed: 0,
      }, null, 2));
    }

}

