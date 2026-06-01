// RecursiLoader.js
class RecursiLoader {
  static loaded = new Set();
  static loadedCss = new Set();

  static getClassNameFromUrl(url) {
      const clean = String(url || '').split('?')[0].split('#')[0];
      const fileName = clean.split('/').pop() || '';
      return fileName.replace(/\.js$/i, '');
    }

  static resolveDependencyUrl(dep, ownerUrl) {
      if (!dep || typeof dep !== 'string') throw new Error('Invalid dependency entry.');
      const clean = dep.trim();
      if (clean.includes('/') || clean.endsWith('.js') || clean.endsWith('.css') || clean.startsWith('.')) {
         const ownerBase = ownerUrl.substring(0, ownerUrl.lastIndexOf('/') + 1) || '/';
         const absoluteBase = document.baseURI ? new URL(ownerBase, document.baseURI).href : ownerBase;
         return new URL(clean, absoluteBase).href;
      }
      return '/library/' + clean + '.js'; 
    }

  static async fetchText(url) {
      this.state.activeUrl = url;
      const urlParams = new URLSearchParams(window.location.search);
      const useDevDB = urlParams.get('dev') === 'true' || urlParams.get('useDB') === 'true';

      if (useDevDB) {
        try {
          const urlObj = new URL(url, document.baseURI || location.href);
          let path = urlObj.pathname;
          if (!path.startsWith('/')) path = '/' + path;
          
          const allPatches = await this._readVibesPatches();
          const filePatch = allPatches.find(p => p.filePath === path && (!p.methodName || p.methodName === '__file__'));
          
          if (filePatch) {
            return filePatch.source;
          }
          
          const res = await fetch(url);
          if (!res.ok) throw new Error('HTTP ' + res.status + ' while fetching ' + url);
          let code = await res.text();
          
          const methodPatches = allPatches.filter(p => p.filePath === path && p.methodName && p.methodName !== '__file__');
          if (methodPatches.length > 0) {
            code = await this._applyAstPatches(code, methodPatches, path);
          }
          return code;
        } catch (e) {
          console.error('[RecursiLoader] Dev mode processing failed for', url, e);
        }
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} (${res.statusText}) while fetching ${url}`);
      return await res.text();
    }

  static async loadCss(url) {
      if (this.loadedCss.has(url)) return;
      this.loadedCss.add(url);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
    }

  static async loadClassFile(url) {
      const className = this.getClassNameFromUrl(url);
      
      if (this.loaded.has(className)) return this.findGlobalClass(className);
      this.loaded.add(className);
      
      const existingCtor = this.findGlobalClass(className);
      if (existingCtor) return existingCtor;

      this.state.activeUrl = url;
      this.state.phase = `Evaluating script: ${className}`;
      
      const code = await this.fetchText(url);
      
      const isIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(className);
      const exposureTrailer = isIdentifier ? `\n;if (typeof ${className} !== "undefined") { globalThis.${className} = ${className}; }` : '';
      
      const script = document.createElement('script');
      script.dataset.recursiSrc = url;
      script.textContent = code + exposureTrailer + '\n//# sourceURL=' + url;
      document.head.appendChild(script);

      const fakeScript = document.createElement('script');
      fakeScript.type = 'recursi/loaded';
      fakeScript.src = url;
      document.head.appendChild(fakeScript);

      const Ctor = this.findGlobalClass(className);
      
      if (!Ctor) {
        const parsedNames = this._extractClassNames(code);
        let nameMismatchHelp = '';
        if (parsedNames.length > 0) {
          nameMismatchHelp = `\n\n💡 System detected class declarations [${parsedNames.join(', ')}] inside the loaded code, but you requested "${className}". The physical class name must exactly match your filename (case-insensitive in loader, case-sensitive in engine).`;
        }
        
        let moduleHelp = '';
        if (code.includes('import ') || code.includes('export ')) {
          moduleHelp = `\n\n💡 System detected top-level "import" or "export" statements inside your class file. Standard loader environments evaluate classic scripts. Please ensure your Vibes JS files do not contain top-level ES6 import/export statements.`;
        }

        throw new Error(`Class "${className}" was not registered on the global scope after evaluating: ${url}.${nameMismatchHelp}${moduleHelp}`);
      }
      
      this.state.loadedList.push({ className, url });
      return Ctor;
    }

  static async run(appUrl, basePath, filesUrl) {
      if (!document.body) {
        await new Promise(r => window.addEventListener('DOMContentLoaded', r, { once: true }));
      }

      try {
        this.state.phase = 'Loading DomBasics';
        const domBasicsUrl = (basePath || '') + 'DomBasics.js';
        try {
          const DomBasicsClass = await this.loadClassFile(domBasicsUrl);
          if (DomBasicsClass && typeof DomBasicsClass.run === 'function') {
            DomBasicsClass.run();
          }
        } catch (e) {
          console.error(`[RecursiLoader] Failed to load optional DomBasics: ${domBasicsUrl}. Skipping over it.`, e);
        }

        if (filesUrl) {
          this.state.phase = `Fetching manifest: ${filesUrl}`;
          const absoluteBase = new URL(filesUrl.substring(0, filesUrl.lastIndexOf('/') + 1), document.baseURI || location.href).href;
          const filesText = await this.fetchText(filesUrl);
          const filesData = JSON.parse(filesText);
          this.state.filesJson = filesData;
          
          this.state.phase = 'Loading Library Dependencies';
          for (const lib of (filesData.library || [])) {
            try {
              let libUrl = lib;
              if (!libUrl.startsWith('/')) libUrl = '/library/' + libUrl;
              if (libUrl.endsWith('.css')) {
                await this.loadCss(new URL(libUrl, absoluteBase).href);
              } else {
                if (!libUrl.endsWith('.js')) libUrl += '.js';
                await this.loadClassFile(new URL(libUrl, absoluteBase).href);
              }
            } catch (e) {
              console.error(`[RecursiLoader] Failed to load library dependency: ${lib}. Skipping over it.`, e);
            }
          }

          this.state.phase = 'Loading Third Party Assets';
          for (const tp of (filesData.thirdParty || [])) {
            try {
              const url = new URL(tp, absoluteBase).href;
              if (url.endsWith('.css')) await this.loadCss(url);
              else await this.loadClassFile(url);
            } catch (e) {
              console.error(`[RecursiLoader] Failed to load third party asset: ${tp}. Skipping over it.`, e);
            }
          }

          this.state.phase = 'Loading Local Supporting Classes';
          for (const loc of (filesData.local || [])) {
            try {
              const url = new URL(loc, absoluteBase).href;
              if (url.endsWith('.css')) await this.loadCss(url);
              else await this.loadClassFile(url);
            } catch (e) {
              console.error(`[RecursiLoader] Failed to load local supporting class: ${loc}. Skipping over it.`, e);
            }
          }

          if (filesData.main && filesData.main.length > 0) {
            appUrl = new URL(filesData.main[0], absoluteBase).href;
          }
        }

        this.state.phase = `Loading main class: ${this.getClassNameFromUrl(appUrl)}`;
        let AppClass;
        try {
          AppClass = await this.loadClassFile(appUrl);
        } catch (e) {
          console.error(`[RecursiLoader] Failed to load main class: ${appUrl}.`, e);
        }
        if (!AppClass) {
          throw new Error('No class constructor could be resolved for main appUrl ' + appUrl);
        }

        const className = AppClass.name || this.getClassNameFromUrl(appUrl);
        const rootElement = document.getElementById('app-container') || document.body;

        this.state.phase = `Initializing runtime instance: ${className}`;
        
        // Clear out the dual static vs instance and constructor fallback paths:
        const instance = new AppClass();
        globalThis[className.charAt(0).toLowerCase() + className.slice(1) + 'Instance'] = instance;

        if (typeof instance.run === 'function') {
          await instance.run({ container: rootElement });
        } else if (typeof instance.init === 'function') {
          await instance.init({ container: rootElement });
        } else {
          throw new Error(`The class "${className}" was loaded, but has no run() or init() methods to start execution.`);
        }

      } catch (error) {
        this.renderDiagnosticScreen(error, appUrl, filesUrl);
      }
    }

  

  static _readFromIDB(dbName, storeName, key) {
      return new Promise((resolve) => {
        try {
          const req = indexedDB.open(dbName);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(storeName)) {
              db.close();
              return resolve(null);
            }
            const tx = db.transaction(storeName, 'readonly');
            const getReq = tx.objectStore(storeName).get(key);
            getReq.onsuccess = () => {
              db.close();
              resolve(getReq.result);
            };
            getReq.onerror = () => {
              db.close();
              resolve(null);
            };
          };
          req.onerror = () => resolve(null);
        } catch(e) {
          resolve(null);
        }
      });
    }

  

  // Direct query to the EXACT database and store defined in VibesPatchStore
    static _readVibesPatches() {
      return new Promise((resolve) => {
        try {
          const req = indexedDB.open('vibes-patch-store');
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('patches')) {
              db.close();
              return resolve([]);
            }
            const tx = db.transaction('patches', 'readonly');
            const getReq = tx.objectStore('patches').getAll();
            getReq.onsuccess = () => {
              db.close();
              resolve(getReq.result || []);
            };
            getReq.onerror = () => {
              console.error(`[RecursiLoader] Error reading from 'patches'.`);
              db.close();
              resolve([]);
            };
          };
          req.onerror = () => {
            console.error(`[RecursiLoader] Failed to open 'vibes-patch-store' IDB.`);
            resolve([]);
          };
        } catch(e) {
          console.error(`[RecursiLoader] Exception opening IDB:`, e);
          resolve([]);
        }
      });
    }

  static async _applyAstPatches(code, patches, path) {
      // 1. Ensure Acorn is loaded and globally bound
      if (typeof globalThis.acorn === 'undefined') {
        console.log('[RecursiLoader] DEV MODE: Lazy-loading Acorn parser...');
        await new Promise(r => { 
          const s = document.createElement('script'); 
          s.src = 'https://cdn.jsdelivr.net/npm/acorn@8.11.3/dist/acorn.min.js'; 
          s.onload = r; 
          document.head.appendChild(s); 
        });
      }

      // 2. Ensure AstUtils is loaded (Dependency for the Patcher)
      if (typeof globalThis.AstUtils === 'undefined') {
        console.log('[RecursiLoader] DEV MODE: Fetching AstUtils...');
        const res = await fetch('/vibes/src/protocol/parsers/AstUtils.js');
        const text = await res.text();
        const script = document.createElement('script');
        script.textContent = text + '\n;globalThis.AstUtils = AstUtils;';
        document.head.appendChild(script);
      }
      
      // 3. Ensure the Patcher is loaded AND explicitly bound to globalThis
      if (typeof globalThis.ClientJSClassPatcher === 'undefined') {
        console.log('[RecursiLoader] DEV MODE: Fetching ClientJSClassPatcher...');
        const res = await fetch('/vibes/src/protocol/ClientJSClassPatcher.js');
        const text = await res.text();
        
        const script = document.createElement('script');
        // This trailer guarantees we can read it off globalThis!
        script.textContent = text + '\n;globalThis.ClientJSClassPatcher = ClientJSClassPatcher;';
        document.head.appendChild(script);
      }
      
      let patchedCode = code;
      const Patcher = globalThis.ClientJSClassPatcher;

      for (const patch of patches) {
         let className = patch.className;
         if (!className) {
             const astClasses = Patcher._listAllClasses(patchedCode);
             if (astClasses.length > 0) className = astClasses[0];
             else className = path.split('/').pop().replace(/\.js$/i, '');
         }
         
         const classBody = Patcher._findClassBody(patchedCode, className);
         if (!classBody) {
             console.warn(`[RecursiLoader] DEV MODE: Class ${className} not found for patch: ${patch.methodName}`);
             continue;
         }
         
         const innerContent = patchedCode.slice(classBody.bodyStart, classBody.bodyEnd);
         const existing = Patcher._findMethodInSource(innerContent, patch.methodName);
         
         if (existing) {
             const absStart = classBody.bodyStart + existing.start;
             const absEnd = classBody.bodyStart + existing.end;
             patchedCode = patchedCode.slice(0, absStart) + patch.source.trim() + patchedCode.slice(absEnd);
             console.log(`[RecursiLoader] 🟢 DEV MODE: Replaced method -> ${className}.${patch.methodName}`);
         } else {
             patchedCode = patchedCode.slice(0, classBody.bodyEnd) + '\n  ' + patch.source.trim() + '\n' + patchedCode.slice(classBody.bodyEnd);
             console.log(`[RecursiLoader] 🟢 DEV MODE: Inserted method -> ${className}.${patch.methodName}`);
         }
      }
      
      return patchedCode;
    }

  

  static findGlobalClass(name) {
      if (!name) return null;
      if (globalThis[name]) return globalThis[name];
      
      const lower = name.toLowerCase().replace(/[-_]/g, '');
      for (const key of Object.getOwnPropertyNames(globalThis)) {
        if (key.toLowerCase().replace(/[-_]/g, '') === lower) {
          const val = globalThis[key];
          if (typeof val === 'function' || (val && typeof val === 'object')) {
            return val;
          }
        }
      }
      return null;
    }

  static _extractClassNames(code) {
      const names = [];
      const regex = /(?:^|\n)\s*(?:export\s+(?:default\s+)?)?class\s+([A-Za-z_$][\w$]*)/g;
      let match;
      while ((match = regex.exec(code)) !== null) {
        if (match[1]) names.push(match[1]);
      }
      return names;
    }

  // Shared state tracking to assist with diagnostics
    static state = {
      phase: 'Bootstrap',
      activeUrl: null,
      loadedList: [],
      filesJson: null
    };

  static renderDiagnosticScreen(error, appUrl, filesUrl) {
      console.error('[RecursiLoader] Diagnosed boot failure:', error);
      
      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 1000000;
        background: #0f1015;
        color: #e2e4f0;
        font-family: 'Segoe UI', system-ui, sans-serif;
        padding: 32px;
        overflow-y: auto;
        line-height: 1.6;
      `;

      const title = document.createElement('h1');
      title.style.cssText = 'color: #ff5555; font-size: 24px; margin-top: 0; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 12px;';
      title.textContent = '🛑 Application Loader Diagnostics';
      container.appendChild(title);

      const desc = document.createElement('p');
      desc.style.cssText = 'font-size: 15px; color: #a0a5c0; margin-bottom: 24px;';
      desc.innerHTML = `RecursiLoader encountered a critical failure. See the system telemetry and recommended solutions below.`;
      container.appendChild(desc);

      const sectionTitle = (txt) => {
        const h = document.createElement('h3');
        h.style.cssText = 'color: #55aaff; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 24px; margin-bottom: 8px;';
        h.textContent = txt;
        return h;
      };

      // Error message
      container.appendChild(sectionTitle('Diagnostic Message'));
      const errBox = document.createElement('div');
      errBox.style.cssText = 'background: rgba(255, 85, 85, 0.08); border-left: 4px solid #ff5555; padding: 16px; border-radius: 4px; font-family: monospace; font-size: 14px; white-space: pre-wrap; margin-bottom: 16px;';
      errBox.textContent = error.message || String(error);
      container.appendChild(errBox);

      // Current Phase & Active URL
      container.appendChild(sectionTitle('Loader Telemetry'));
      const telemetryTable = document.createElement('div');
      telemetryTable.style.cssText = 'display: grid; grid-template-columns: 140px 1fr; gap: 8px 16px; font-size: 13px; background: #181920; padding: 16px; border-radius: 6px; border: 1px solid #282a36;';
      telemetryTable.innerHTML = `
        <div style="color:#888;">Active Phase:</div><div>${this.state.phase}</div>
        <div style="color:#888;">Requested URL:</div><div style="font-family:monospace; color:#ffd59b;">${this.state.activeUrl || 'None'}</div>
        <div style="color:#888;">Main Class URL:</div><div style="font-family:monospace;">${appUrl || 'Not set'}</div>
        <div style="color:#888;">Manifest URL:</div><div style="font-family:monospace;">${filesUrl || 'None'}</div>
      `;
      container.appendChild(telemetryTable);

      // Load History Timeline
      container.appendChild(sectionTitle('Loading Execution Timeline'));
      const timelineBox = document.createElement('div');
      timelineBox.style.cssText = 'font-size: 13px; background: #12131a; padding: 12px 16px; border-radius: 6px; border: 1px solid #222; font-family: monospace;';
      
      const timelineHtml = [];
      if (this.state.loadedList.length === 0) {
        timelineHtml.push('<span style="color:#ff5555;">✖ Failed before any classes were loaded.</span>');
      } else {
        this.state.loadedList.forEach(item => {
          timelineHtml.push(`<span style="color:#50fa7b;">✔ Loaded class:</span> <b style="color:#fff;">${item.className}</b> (${item.url})`);
        });
      }
      timelineHtml.push(`<span style="color:#ffb86c; animation: blink 1s infinite;">▶ Current Step:</span> ${this.state.phase}`);
      timelineBox.innerHTML = timelineHtml.join('<br>');
      container.appendChild(timelineBox);

      // Full Stack Trace
      if (error.stack) {
        container.appendChild(sectionTitle('Debugger Stack Trace'));
        const stackBox = document.createElement('pre');
        stackBox.style.cssText = 'background: #090a0d; color: #8890b0; padding: 16px; border-radius: 6px; font-size: 12px; overflow: auto; border: 1px solid #1c1d24;';
        stackBox.textContent = error.stack;
        container.appendChild(stackBox);
      }

      document.body.appendChild(container);
    }
}

globalThis.RecursiLoader = RecursiLoader;