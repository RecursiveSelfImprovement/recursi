class DeployCatalog {
    static async getProjectNames(options = {}, deps = {}) {
      const { fs, path } = deps;
      const webRoot = this._getWebRoot(options, deps);
      const entries = await fs.readdir(webRoot, { withFileTypes: true });
      const names = [];
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;
        if (this._shouldIgnoreProjectName(entry.name, options, deps)) continue;
        if (!(await this._looksLikeProject(path.join(webRoot, entry.name), entry.name, deps))) continue;
        names.push(entry.name);
      }
      
      names.sort((a, b) => a.localeCompare(b));
      return names;
    }

    static async getProjectEntries(site, options = {}, deps = {}) {
      const { path } = deps;
      const webRoot = this._getWebRoot(options, deps);
      const projectNames = await this.getProjectNames(options, deps);
      
      console.log('[DeployCatalog] DEBUG getProjectEntries webRoot=' + webRoot);
      console.log('[DeployCatalog] DEBUG getProjectEntries projectNames=' + projectNames.join(', '));
      
      return projectNames.map((name) => ({
        kind: 'project',
        name,
        localDir: path.join(webRoot, name),
        remoteSubdir: name,
      }));
    }

    static async getExtraEntries(site, options = {}, deps = {}) {
      const { fs, path } = deps;
      const webRoot = this._getWebRoot(options, deps);
      const extrasConfig = await this._readExtrasConfig(webRoot, deps);
      
      console.log('[DeployCatalog] DEBUG getExtraEntries webRoot=' + webRoot);
      console.log('[DeployCatalog] DEBUG getExtraEntries count=' + extrasConfig.length);
      
      const entries = [];
      const seen = new Set();

      for (const item of extrasConfig) {
        const localRel = item.local || '';
        seen.add(localRel);
        const localAbs = path.resolve(webRoot, localRel);
        const type = item.type || 'dir';
        if (type === 'dir') {
          entries.push({
            kind: 'extraDir',
            name: item.name || localRel,
            localDir: localAbs,
            remoteSubdir: item.remote || localRel,
          });
          continue;
        }
        if (type === 'file') {
          entries.push({
            kind: 'extraFile',
            name: item.name || localRel,
            localFile: localAbs,
            remoteFile: item.remote || localRel,
          });
        }
      }

      // Added 'projectBrowserThumbnails' and 'accudraw' to enable automatic deployment of assets
      const defaultDirs = ['frontPage', 'sharedLib', 'recursi', 'modules', 'library', 'projectBrowserThumbnails', 'accudraw'];
      for (const dir of defaultDirs) {
        if (seen.has(dir)) continue;
        const localAbs = path.resolve(webRoot, dir);
        try {
          const stat = await fs.stat(localAbs);
          if (stat.isDirectory()) {
            entries.push({
              kind: 'extraDir',
              name: dir,
              localDir: localAbs,
              remoteSubdir: dir,
            });
          }
        } catch (error) {}
      }

      return entries;
    }

    static _getWebRoot(options = {}, deps = {}) {
      if (options.webProjectsRoot) return options.webProjectsRoot;
      if (options.webRoot) return deps.path.resolve(options.webRoot, '..');
      return process.cwd();
    }

    static _shouldIgnoreProjectName(name, options = {}, deps = {}) {
      const { DeployConfig } = deps;
      const cfg = DeployConfig.getCatalogConfig(deps);
      if (cfg.excludeNames.includes(name)) return true;
      if (/-\d+$/.test(name)) return true;
      return false;
    }

    static async _looksLikeProject(projectDir, projectName, deps = {}) {
      const { fs, path } = deps;
      const checks = ['index.html', `${projectName}.html`, 'install.html'];
      for (const file of checks) {
        try {
          await fs.access(path.join(projectDir, file));
          return true;
        } catch (error) {}
      }
      return false;
    }

    static async _readExtrasConfig(webRoot, deps = {}) {
      const { fs, path } = deps;
      const filePath = path.join(webRoot, 'deployExtras.json');
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

  
}