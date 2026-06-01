class FileWalker {
    static async walkDirectory(rootDir, options = {}, deps = {}) {
      const results = [];
      await this._walk(rootDir, "", results, options, deps);
      return results;
    }

    static async _walk(dir, rel, results, options = {}, deps = {}) {
      const { fs, path, DeployConfig } = deps;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (this._shouldIgnoreName(entry.name, options, deps)) continue;
        const abs = path.join(dir, entry.name);
        const nextRel = rel ? rel + "/" + entry.name : entry.name;
        
        if (entry.isDirectory()) {
          if (!this._shouldIgnoreDirectory(entry.name, options, deps)) {
            await this._walk(abs, nextRel, results, options, deps);
          }
          continue;
        }
        
        if (!entry.isFile()) continue;
        const stat = await fs.stat(abs);
        results.push({
          local: abs,
          rel: nextRel,
          mtimeMs: stat.mtimeMs,
        });
      }
    }

    static _shouldIgnoreDirectory(name, options = {}, deps = {}) {
      const { DeployConfig } = deps;
      const ignoreDirs = options.ignoreDirs || DeployConfig.getIgnoreDirs(deps);
      return ignoreDirs.includes(name);
    }

    static _shouldIgnoreName(name, options = {}, deps = {}) {
      const { DeployConfig } = deps;
      const ignoreNames = options.ignoreNames || DeployConfig.getIgnoreNames(deps);
      const ignorePatterns = options.ignorePatterns || DeployConfig.getIgnorePatterns(deps);
      if (ignoreNames.includes(name)) return true;
      return ignorePatterns.some((pattern) => pattern.test(name));
    }
}