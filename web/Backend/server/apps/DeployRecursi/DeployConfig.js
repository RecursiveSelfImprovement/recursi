class DeployConfig {
    static getDefaultRelativeConfigPath(deps = {}) {
      return '../recursiDeployConfig.js';
    }

    static getDefaultConfigPath(options = {}, deps = {}) {
      const { path } = deps;
      const projectRoot = options.projectRoot || process.cwd();
      return path.resolve(projectRoot, this.getDefaultRelativeConfigPath(deps));
    }

    static resolveConfigPath(requestedPath, options = {}, deps = {}) {
      const { path } = deps;
      const projectRoot = options.projectRoot || process.cwd();
      if (!requestedPath || !String(requestedPath).trim()) {
        return this.getDefaultConfigPath(options, deps);
      }
      if (path.isAbsolute(requestedPath)) {
        return requestedPath;
      }
      return path.resolve(projectRoot, requestedPath);
    }

    static async getConfigInfo(request = {}, options = {}, deps = {}) {
      const { fsSync } = deps;
      const configPath = this.resolveConfigPath(request.configPath, options, deps);
      const exists = fsSync.existsSync(configPath);
      return {
        success: true,
        configPath,
        exists,
        defaultRelativePath: this.getDefaultRelativeConfigPath(deps),
      };
    }

    static async loadConfig(request = {}, options = {}, deps = {}) {
      const { pathToFileURL, fsSync } = deps;
      const configPath = this.resolveConfigPath(request.configPath, options, deps);
      
      if (!fsSync.existsSync(configPath)) {
        fsSync.writeFileSync(configPath, this.getTemplateText(deps), 'utf8');
        throw new Error(`Deployment config file was missing! A template has been created at: ${configPath}. Please update it with your real server details and credentials, then run again.`);
      }
      
      const moduleUrl = pathToFileURL(configPath).href + '?t=' + Date.now();
      const mod = await import(moduleUrl);
      
      const config = mod.default || mod.recursiDeployConfig || mod.config;
      if (!config || typeof config !== 'object') {
        throw new Error('Deploy config file did not export a config object: ' + configPath);
      }
      return {
        configPath,
        createdTemplate: false,
        config,
      };
    }

    static ensureTemplateExists(configPath, deps = {}) {
      const { fsSync } = deps;
      if (fsSync.existsSync(configPath)) {
        return false;
      }
      fsSync.writeFileSync(configPath, this.getTemplateText(deps), 'utf8');
      return true;
    }

    static resolvePathFromConfigDir(filePath, configPath, deps = {}) {
      const { path } = deps;
      if (!filePath) return filePath;
      if (path.isAbsolute(filePath)) return filePath;
      return path.resolve(path.dirname(configPath), filePath);
    }

    static async getSite(siteName = 'recursi', request = {}, options = {}, deps = {}) {
      const loaded = await this.loadConfig(request, options, deps);
      const site = loaded.config?.mainDeploy?.sites?.[siteName];
      if (!site) {
        throw new Error('Unknown site in external deploy config: ' + siteName);
      }
      return {
        ...site,
        configPath: loaded.configPath,
        createdTemplate: loaded.createdTemplate,
        lastRunFile: this.resolvePathFromConfigDir(
          site.lastRunFile || './recursiDeployState.json',
          loaded.configPath,
          deps
        ),
      };
    }

    static getIgnoreDirs(deps = {}) {
      return ['.git', 'node_modules', 'oldVersions', '.backups'];
    }

    static getIgnoreNames(deps = {}) {
      return [
        '.DS_Store',
        'template.md',
        'deployExtras.json',
      ];
    }

    static getIgnorePatterns(deps = {}) {
      return [/\.bak/, /\.bak-/, /\.bak2$/, /\.xcf$/, /\.mjs$/];
    }

    static getCatalogConfig(deps = {}) {
      return {
        excludeNames: [
          'projectBrowserThumbnails',
          'video',
          'modules',
          'recursi',
          'sharedLib',
          'frontPage',
          'ImagePuzzle',
          'BlackKeys',
        ],
      };
    }

    static async getCommentsConfig(request = {}, options = {}, deps = {}) {
      const loaded = await this.loadConfig(request, options, deps);
      const commentsDeploy = loaded.config?.commentsDeploy;
      if (!commentsDeploy) {
        throw new Error('commentsDeploy missing from external config: ' + loaded.configPath);
      }
      return {
        ...commentsDeploy,
        configPath: loaded.configPath,
        createdTemplate: loaded.createdTemplate,
      };
    }

    static getTemplateText(deps = {}) {
      return `// recursiDeployConfig.js
// Put your real DreamHost / Apache / PHP deployment settings here.

export default {
  deploymentNotes: 'Recursi deploy config outside repo',
  serverType: 'Apache + PHP',
  hostingProvider: 'DreamHost',

  mainDeploy: {
    sites: {
      recursi: {
        host: 'pdx1-shared-a1-21.dreamhost.com',
        port: 22,
        user: 'dh_48i7rx',
        password: 'replaceMeWithRealPassword',
        remoteRoot: '/home/dh_48i7rx/recursi.dev',
        lastRunFile: './recursiDeployState.json',
      },
    },
  },

  commentsDeploy: {
    host: 'pdx1-shared-a1-21.dreamhost.com',
    port: 22,
    user: 'dh_48i7rx',
    password: 'replaceMeWithRealPassword',
    remotePath: 'recursi.dev/commentsApi',
  },
};
`;
    }

  
}