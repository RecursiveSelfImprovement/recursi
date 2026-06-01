class VibesLoader {
  static loaded = new Set();

  static getClassNameFromUrl(url) {
    const clean = String(url || '').split('?')[0].split('#')[0];
    const fileName = clean.split('/').pop() || '';
    return fileName.replace(/\.js$/i, '');
  }

  static async fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' while fetching ' + url);
    return await res.text();
  }

  static async loadClassFile(url) {
      const className = this.getClassNameFromUrl(url);
      
      if (this.loaded.has(className)) return globalThis[className];
      this.loaded.add(className);
      if (globalThis[className]) return globalThis[className];

      const code = await this.fetchText(url);
      
      // Ensure we don't inject syntax errors for dashed filenames like "runner-client.js"
      const isIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(className);
      const exposureTrailer = isIdentifier ? `\n;if (typeof ${className} !== "undefined") { globalThis.${className} = ${className}; }` : '';
      
      const script = document.createElement('script');
      script.dataset.vibesSrc = url;
      script.textContent = code + exposureTrailer + '\n//# sourceURL=' + url;
      document.head.appendChild(script);

      // Prevent IDE double-loading by mimicking the src attribute it queries for
      const fakeScript = document.createElement('script');
      fakeScript.type = 'vibes/loaded';
      fakeScript.setAttribute('src', new URL(url, document.baseURI).pathname);
      document.head.appendChild(fakeScript);

      return globalThis[className];
    }

  static async run(appUrl, depsUrl, basePath) {
    if (!document.body) {
      await new Promise(r => window.addEventListener('DOMContentLoaded', r, { once: true }));
    }

    try {
      // 1. Ensure DomBasics are loaded
      const domBasicsUrl = (basePath || '') + 'DomBasics.js';
      const DomBasicsClass = await this.loadClassFile(domBasicsUrl);
      if (DomBasicsClass && typeof DomBasicsClass.run === 'function') {
        DomBasicsClass.run();
      }

      // 2. Fetch dependencies list
      const depsText = await this.fetchText(depsUrl);
      let depsList = [];
      try {
        depsList = JSON.parse(depsText);
      } catch (e) {
        console.warn('[VibesLoader] Dependencies file is not strict JSON, falling back to evaluation.');
        depsList = new Function('return ' + depsText)();
      }

      if (!Array.isArray(depsList)) {
        throw new Error('[VibesLoader] Dependencies file did not return an array.');
      }

      // Load all dependencies sequentially
      for (const dep of depsList) {
        if (dep.includes('recursi.js') || dep.includes('VibesLoader.js')) continue;
        
        try {
          await this.loadClassFile(dep);
        } catch (err) {
          console.warn('[VibesLoader] Gracefully continuing after failing to load dependency:', dep, err);
        }
      }

      // 3. Load Vibes Main App
      const AppClass = await this.loadClassFile(appUrl);
      if (!AppClass) {
        throw new Error('Failed to load main application class from ' + appUrl);
      }

      const className = AppClass.name || this.getClassNameFromUrl(appUrl);
      const rootElement = document.getElementById('app-container') || document.body;

      if (typeof AppClass.run === 'function') {
        await AppClass.run({ container: rootElement });
        return;
      }

      const instance = new AppClass(rootElement);
      globalThis[className.charAt(0).toLowerCase() + className.slice(1) + 'Instance'] = instance;

      if (typeof instance.run === 'function') {
        await instance.run({ container: rootElement });
      } else if (typeof instance.init === 'function') {
        await instance.init({ container: rootElement });
      } else {
        throw new Error('No static run(), instance run(), or instance init() found for ' + className + '.');
      }

    } catch (error) {
      console.error('[VibesLoader] Boot failure:', error);
      const pre = document.createElement('pre');
      pre.style.cssText = 'white-space:pre-wrap;color:#f88;background:#200;padding:16px;font:13px monospace;';
      pre.textContent = '[VibesLoader] Boot failure\n\n' + (error.stack || String(error));
      document.body.appendChild(pre);
    }
  }

  
}

globalThis.VibesLoader = VibesLoader;