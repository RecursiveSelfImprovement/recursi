class InWindowScriptInjector {

      constructor(app, options = {}) {
    this.app = app;
    this.options = options;
    this.projectName = options.projectName
      || app?.sourceProjectName
      || app?.projectName
      || 'project';
    this.container = null;
    this.dialog = null;
    this._dialog = null;
    this._status = null;
    this._loadedClassicScripts = new Set();
    this._styleEls = [];
    this._errors = [];
    this._installed = [];
    this._patched = [];
  }

      async launch(options = {}) {
      console.log("[InWindowScriptInjector-Trace] 🚀 launch() initiated. Project:", this.projectName);
      
      const isAlreadyChild = window._dev_projectEditorInstance && this.app !== window._dev_projectEditorInstance;
      if (isAlreadyChild) {
        console.warn("[InWindowScriptInjector] Nested launch blocked to prevent deep recursion.");
        this._setStatus("Preview runner is disabled within nested editor instances.", true);
        return;
      }

      try {
        const fileMap = await this._buildFileMap();
        console.log("[InWindowScriptInjector-Trace] 📁 File map parsed. Elements:", fileMap.size);
        if (fileMap.size === 0) {
          this._setStatus("Failed to launch: Empty file map.", true);
          return;
        }

        let htmlInfo;
        if (this.options.filesJsonPath) {
          console.log("[InWindowScriptInjector-Trace] 📄 Bypassing HTML, loading from manifest:", this.options.filesJsonPath);
          htmlInfo = await this._analyzeManifest(this.options.filesJsonPath, fileMap);
        } else {
          htmlInfo = await this._analyzeHtml(fileMap);
        }

        console.log("[InWindowScriptInjector-Trace] 🌐 HTML structure analyzed:", {
          hasHtmlPath: !!htmlInfo?.htmlPath,
          externalScriptsCount: htmlInfo?.externalClassicScripts?.length || 0,
          projectScriptsCount: htmlInfo?.projectScriptPaths?.length || 0,
          initiatorLength: htmlInfo?.inlineInitiator?.length || 0
        });
        
        if (!htmlInfo?.htmlPath) {
          htmlInfo.htmlPath = null;
          htmlInfo.html = '';
        }

        if (!this._dialog) {
          console.log("[InWindowScriptInjector-Trace] 🪟 Instantiating fresh dialog container...");
          this._createContainer(htmlInfo);
        } else {
          console.log("[InWindowScriptInjector-Trace] 🔄 Cleaning up existing runner instance...");
          this._cleanupRun();
        }

        window.__vibesInWindowDocumentProxy = this._proxy;

        console.log("[InWindowScriptInjector-Trace] 📦 Loading classic dependencies...");
        await this._loadClassicDependencies(htmlInfo);
        
        console.log("[InWindowScriptInjector-Trace] 🔌 Checking if Three.js is needed...");
        const threeLoaded = await this._loadThreeIfNeeded(fileMap);
        console.log("[InWindowScriptInjector-Trace] 🔌 Three.js check completed. Loaded:", threeLoaded);
        
        console.log("[InWindowScriptInjector-Trace] 🎨 Injecting stylesheet maps...");
        this._injectStyles(fileMap, htmlInfo);

        const scriptOrder = this._buildScriptOrder(fileMap, htmlInfo);
        console.log("[InWindowScriptInjector-Trace] 📜 Script order topological layout resolved:", scriptOrder);

        let installedCount = 0;
        let skippedCount = 0;
        for (const path of scriptOrder) {
          const content = fileMap.get(path);
          if (content) {
            const result = this._installOrPatchScript(path, content);
            if (result?.action === 'installed') installedCount++;
            if (result?.action === 'skipped-already-loaded') skippedCount++;
          } else {
            console.warn(`[InWindowScriptInjector-Trace] Missing content for ${path}! Skipping.`);
          }
        }
        console.log(`[InWindowScriptInjector-Trace] ⚙️ Scripts applied: installed=${installedCount}, skipped-already-loaded=${skippedCount}`);

        console.log("[InWindowScriptInjector-Trace] ▶️ Invoking initiator hook...");
        const initResult = await this._runInitiator(htmlInfo, this.container || this._container, fileMap);
        console.log("[InWindowScriptInjector-Trace] 🎉 Initiator sequence complete. Result:", initResult);
      } catch(e) {
        console.error('[InWindowScriptInjector-Trace] ❌ launch() FAILED:', e);
        this._setStatus("Launch failed: " + e.message, true);
      } finally {
        delete window.__vibesInWindowDocumentProxy;
      }
    }

      _controller(extra = {}) {
        const self = this;
        return {
          ok: true,
          ...extra,
          injector: self,
          container: self._container,
          dialog: self._dialog,
          installed: self._installed,
          patched: self._patched,
          errors: self._errors,
          bringToFront() {
            if (self._dialog && typeof self._dialog.setZOnTop === "function") {
              self._dialog.setZOnTop();
            }
          },
          destroy() {
            self.destroy();
          },
        };
      }

      destroy() {
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
      }
      if (this.renderer) {
        this.renderer.setAnimationLoop(null);
        if (this.renderer.domElement && this.renderer.domElement.parentElement) {
          this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
      }
      if (this.app && this.app.activeInjector === this) {
        this.app.activeInjector = null;
      }
      if (this._dialog && typeof this._dialog.close === 'function') {
        this._dialog.close();
      }
      window.removeEventListener('resize', this._onResizeBound);

      // Clean up global class bindings on destruction to keep global namespace pristine
      this._cleanupGlobals();
    }

      async _buildFileMap() {
      const fileMap = new Map();
      const vfs = await this._injectorGetVfs();

      console.log("[InWindowScriptInjector-Trace] _buildFileMap starting. Project:", this.projectName, "app Class:", this.app?.constructor?.name, "VFS Present:", !!vfs);

      if (this.projectName && vfs) {
        const prefix = '/' + this.projectName;
        let allPaths = [];
        try {
          const all = await vfs.listFiles({ includeStatic: true });
          console.log("[InWindowScriptInjector-Trace] Raw VFS listFiles count:", all?.length || 0);
          
          allPaths = all.filter(p =>
            p.startsWith(prefix + '/') || p.startsWith('/library/')
          );
          console.log("[InWindowScriptInjector-Trace] Filtered paths count:", allPaths.length, "for prefix:", prefix);
        } catch(e) {
          console.error("[InWindowScriptInjector-Trace] listFiles failed:", e);
          this._setStatus('Could not list files for ' + prefix + ': ' + e.message, true);
          return fileMap;
        }

        // Only return if we successfully mapped files via VFS
        if (allPaths.length > 0) {
          for (const path of allPaths) {
            try {
              const content = await vfs.readFile(path, { nullOnMissing: true });
              if (typeof content === 'string') {
                fileMap.set(path, content);
              }
            } catch(e) {
              console.warn('[InWindowScriptInjector-Trace] skip ' + path + ': ' + e.message);
            }
          }
          return fileMap;
        }
      }

      // Fallback 1: Use the in-memory store
      const store = this.app?.inMemoryFileStore;
      if (store && store.size > 0) {
        console.log("[InWindowScriptInjector-Trace] VFS empty, using fallback inMemoryFileStore. Elements:", store.size);
        for (const [path, content] of store.entries()) {
          if (typeof content === 'string') fileMap.set(path, content);
        }
        return fileMap;
      }

      // Fallback 2: Scan the active project tree structure (original behavior)
      const paths = this._listProjectTreeFilePaths();
      console.log("[InWindowScriptInjector-Trace] VFS & Store empty, using tree node path list. Elements:", paths.length);
      for (const path of paths) {
        const content = await this._readProjectFile(path);
        if (typeof content === 'string') fileMap.set(path, content);
      }
      return fileMap;
    }

      _listProjectTreeFilePaths() {
        const out = [];
        const seen = new Set();

        const addFromTree = (treeView) => {
          if (!treeView || !treeView.nodesMap) return;

          for (const pair of treeView.nodesMap) {
            const path = pair[0];
            const node = pair[1];

            if (!node || node.type !== "file") continue;
            if (seen.has(path)) continue;
            if (String(path).startsWith("/library/")) continue;

            seen.add(path);
            out.push(path);
          }
        };

        const pfm = this.app?.projectFilesManager;
        addFromTree(pfm?.fileTreeView);

        if (pfm?.fileTreeViews) {
          pfm.fileTreeViews.forEach((treeView) => addFromTree(treeView));
        }

        return out.sort();
      }

      async _readProjectFile(path) {
    const vfs = await this._injectorGetVfs();
    if (vfs) {
      try {
        const content = await vfs.readFile(path, { nullOnMissing: true });
        if (typeof content === 'string') return content;
      } catch (e) {
        // fall through to direct store
      }
    }

    // Original direct-store fallback
    const store = this._storeForPath(path);
    if (!store) return null;
    try {
      if (typeof store.get === 'function') {
        const val = await store.get(path);
        if (typeof val === 'string') return val;
        if (val && typeof val.content === 'string') return val.content;
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

      _storeForPath(path) {
        const parts = String(path || "")
          .split("/")
          .filter(Boolean);

        if (parts.length === 0) return null;

        const rootId = "/" + parts[0];
        return this.app?.workspaceFileStores?.get?.(rootId) || null;
      }

      async _analyzeHtml(fileMap) {
      const htmlPath = this._findHtmlPath(fileMap);
      const html = htmlPath ? fileMap.get(htmlPath) : "";
      const info = {
        htmlPath,
        html,
        externalClassicScripts: [],
        projectScriptPaths: [],
        inlineInitiator: "",
        importMapText: "",
        linkedStylesheets: [],
      };

      if (!html || typeof DOMParser === "undefined") {
        return info;
      }

      const doc = new DOMParser().parseFromString(html, "text/html");

      for (const script of Array.from(doc.querySelectorAll("script"))) {
        const type = (script.getAttribute("type") || "").trim().toLowerCase();
        const src = script.getAttribute("src");
        const dataFiles = script.getAttribute("data-files");

        if (type === "importmap") {
          info.importMapText = script.textContent || "";
          continue;
        }

        if (dataFiles) {
          let dfPath = this._resolveProjectPath(dataFiles, htmlPath, fileMap) || dataFiles;
          if (!dfPath.startsWith('/')) dfPath = '/' + dfPath;
          
          let dfContent = fileMap.get(dfPath);
          if (!dfContent) {
            try {
              const res = await fetch(dfPath);
              if (res.ok) {
                dfContent = await res.text();
                fileMap.set(dfPath, dfContent);
                if (this.app && this.app.inMemoryFileStore) this.app.inMemoryFileStore.set(dfPath, dfContent);
              }
            } catch(e) { console.warn("Fetch failed for JSON:", dfPath); }
          }

          if (dfContent) {
            try {
              const dfStr = typeof dfContent === 'string' ? dfContent : new TextDecoder().decode(dfContent);
              const dfJson = JSON.parse(dfStr);
              await this._parseManifestIntoInfo(dfJson, dfPath, fileMap, info);
            } catch(e) {
              console.warn('[InWindowScriptInjector] Failed to parse data-files', e);
            }
          }
        }

        if (src) {
          const cleanSrc = this._cleanUrl(src);
          if (this._isExternalClassicScript(cleanSrc)) {
            info.externalClassicScripts.push({ src: cleanSrc, type });
          } else {
            const resolved = this._resolveProjectPath(cleanSrc, htmlPath, fileMap);
            if (resolved && !info.projectScriptPaths.includes(resolved)) {
              info.projectScriptPaths.push(resolved);
            }
          }
          continue;
        }

        const text = script.textContent || "";
        if (!text.trim()) continue;

        if (type === "module") {
          info.inlineInitiator += "\n" + this._stripTopLevelImports(text).trim() + "\n";
        } else if (!type || type === "text/javascript" || type === "application/javascript") {
          info.inlineInitiator += "\n" + text.trim() + "\n";
        }
      }

      for (const link of Array.from(doc.querySelectorAll("link"))) {
        const rel = (link.getAttribute("rel") || "").toLowerCase();
        const href = link.getAttribute("href");
        if (rel === "stylesheet" && href) {
          info.linkedStylesheets.push(this._cleanUrl(href));
        }
      }

      return info;
    }

      _findHtmlPath(fileMap) {
        const keys = Array.from(fileMap.keys());

        const preferred =
          keys.find((path) => String(path).toLowerCase().endsWith("/index.html")) ||
          keys.find((path) => String(path).toLowerCase() === "index.html") ||
          keys.find((path) => String(path).toLowerCase().endsWith(".html"));

        return preferred || null;
      }

      _cleanUrl(url) {
        return String(url || "").split("#")[0].split("?")[0];
      }

      _isExternalClassicScript(src) {
        if (!src) return false;
        if (src.startsWith("http://")) return true;
        if (src.startsWith("https://")) return true;
        if (src.startsWith("/library/")) return true;
        if (src.startsWith("/thirdparty/")) return true;
        if (src.startsWith("library/")) return true;
        if (src.startsWith("thirdparty/")) return true;
        return false;
      }

      _resolveProjectPath(src, htmlPath, fileMap) {
        if (!src) return null;

        const candidates = [];
        const add = (value) => {
          if (value && !candidates.includes(value)) candidates.push(value);
        };

        add(src);

        if (src.startsWith("./")) add(src.slice(2));
        if (src.startsWith("/")) add(src.slice(1));
        if (!src.startsWith("/")) add("/" + src);

        const projectName = this.projectName;
        if (projectName && !src.startsWith("/")) {
          add("/" + projectName + "/" + src.replace(new RegExp("^\\./"), ""));
        }

        if (htmlPath) {
          const slash = htmlPath.lastIndexOf("/");
          const dir = slash >= 0 ? htmlPath.slice(0, slash + 1) : "/";
          try {
            const resolved = new URL(src, "https://vibes.local" + dir).pathname;
            add(resolved);
          } catch (error) {}
        }

        for (const candidate of candidates) {
          if (fileMap.has(candidate)) return candidate;
        }

        const normalized = src.replace(new RegExp("^\\./"), "").replace(new RegExp("^/"), "");
        const matches = Array.from(fileMap.keys()).filter((path) => {
          const p = String(path).replace(new RegExp("^/"), "");
          return p === normalized || p.endsWith("/" + normalized);
        });

        if (matches.length === 1) return matches[0];
        if (matches.length > 1) {
          matches.sort((a, b) => String(a).length - String(b).length);
          return matches[0];
        }

        return null;
      }

      _createContainer(htmlInfo) {
      const rootWrapper = document.createElement("div");
      rootWrapper.style.cssText = "display:flex; flex-direction:column; width:100%; height:100%; background:#10131c;";

      const headerControls = document.createElement("div");
      headerControls.style.cssText = "display:flex; align-items:center;";

      // Add "⌨ Capture Keys" checkbox
      const toggleLabel = document.createElement("label");
      toggleLabel.id = "vibes-keystroke-capture-label";
      toggleLabel.style.cssText = "display:none; align-items:center; color:#aaa; font-size:11px; margin-right:15px; user-select:none; cursor:pointer; font-family:sans-serif;";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true; // Enabled by default
      checkbox.style.marginRight = "4px";
      checkbox.onchange = () => {
        if (this._keystrokeCallback) {
          this._keystrokeCallback(checkbox.checked);
        }
      };

      toggleLabel.appendChild(checkbox);
      toggleLabel.appendChild(document.createTextNode("⌨ Capture Keys"));
      headerControls.appendChild(toggleLabel);

      const reloadBtn = document.createElement("button");
      reloadBtn.textContent = "↻ Restart App";
      reloadBtn.title = "Reload Runner from current file state";
      reloadBtn.style.cssText = "padding:3px 10px; border-radius:4px; border:1px solid rgba(255,255,255,0.3); background:rgba(60,110,240,0.7); color:#fff; cursor:pointer; font-size:11px; font-weight:bold; transition:all 0.15s ease; user-select:none;";
      reloadBtn.onmouseover = () => { reloadBtn.style.background = 'rgba(60,110,240,0.9)'; };
      reloadBtn.onmouseout = () => { reloadBtn.style.background = 'rgba(60,110,240,0.7)'; };
      reloadBtn.onclick = (e) => {
        e.stopPropagation(); 
        this.launch();
      };
      headerControls.appendChild(reloadBtn);

      const container = document.createElement("div");
      container.className = "vibes-in-window-runner-container";
      container.style.cssText = "width:100%; flex:1; position:relative; overflow:auto; background:#10131c; color:#eaf2ff;";

      rootWrapper.appendChild(container);

      const title =
        "▶ In-Window: " +
        (this.projectName || "App") +
        (htmlInfo.htmlPath ? " · " + htmlInfo.htmlPath.split("/").pop() : "");

      if (typeof UITools !== "undefined" && UITools.makeDialog) {
        this._dialog = UITools.makeDialog({
          title,
          contentElement: rootWrapper,
          customHeaderControls: headerControls,
          width: "940px",
          height: "720px",
          resizable: true,
          onClose: () => this.destroy(),
          onGeometryChange: (box, geom) => {
            window.dispatchEvent(new Event('resize'));
          }
        });
      } else {
        const shell = document.createElement("div");
        shell.style.cssText = "position:fixed; z-index:999999; inset:40px; background:#10131c; border:1px solid rgba(160,200,255,.35); box-shadow:0 20px 80px rgba(0,0,0,.45); display:flex; flex-direction:column;";
        
        const header = document.createElement('div');
        header.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:5px 10px; background:#222; border-bottom:1px solid #444;";
        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        header.appendChild(titleSpan);
        header.appendChild(headerControls);
        
        shell.appendChild(header);
        rootWrapper.style.flex = "1";
        shell.appendChild(rootWrapper);
        document.body.appendChild(shell);
        this._dialog = { close: () => shell.remove(), setZOnTop: () => { shell.style.zIndex = "1000000"; } };
      }

      this.container = container;
      this._container = container;
      
      if (this.app) {
        this.app.activeInjector = this;
      }

      this._proxy = new Proxy(window.document, {
        get: (target, prop) => {
          if (prop === 'body') return this._container;
          if (prop === 'getElementById') return (id) => {
             const el = this._container.querySelector('#' + CSS.escape(id));
             if (el) return el;
             return target.getElementById(id);
          };
          if (prop === 'querySelector') return (sel) => {
             if (sel === 'body') return this._container;
             const el = this._container.querySelector(sel);
             if (el) return el;
             return target.querySelector(sel);
          };
          let val = target[prop];
          if (typeof val === 'function') return val.bind(target);
          return val;
        },
        set: (target, prop, value) => {
          try {
            target[prop] = value;
          } catch(e) {
            window.document[prop] = value;
          }
          return true;
        }
      });

      this._runEnv = {
        container: container,
        requestKeystrokeControl: (callback) => {
          this._keystrokeCallback = callback;
          toggleLabel.style.display = "flex"; // Show the checkbox in the header
          callback(checkbox.checked); // Send the initial state
        }
      };

      return container;
    }

      async _loadClassicDependencies(htmlInfo) {
    for (const scriptInfo of htmlInfo.externalClassicScripts || []) {
      const url = typeof scriptInfo === 'string' ? scriptInfo : scriptInfo.src;
      const type = typeof scriptInfo === 'string' ? '' : scriptInfo.type;
      await this._loadClassicScript(url, type);
    }
  }

      _loadClassicScript(url, type = '') {
      return new Promise((resolve) => {
        if (!url) {
          resolve(false);
          return;
        }

        const normalized = url.startsWith("library/")
          ? "/" + url
          : url.startsWith("thirdparty/")
            ? "/" + url
            : url;

        if (this._loadedClassicScripts.has(normalized)) {
          resolve(true);
          return;
        }

        // Safe pre-flight: check if this classic script was already appended to the head
        const absolute = new URL(normalized, document.baseURI).href;
        const alreadyInDom = Array.from(document.scripts).some((s) => {
          return s.src === absolute || s.src.endsWith(normalized);
        });

        // Check if the global constructor is already loaded to prevent duplicate declaration syntax errors
        const className = normalized.split('/').pop().replace(/\.js$/i, '');
        const alreadyOnGlobal = typeof window[className] === 'function' || typeof globalThis[className] === 'function';

        if (alreadyInDom || alreadyOnGlobal) {
          this._loadedClassicScripts.add(normalized);
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = normalized;
        if (type === 'module') script.type = 'module';
        script.dataset.vibesInWindowDependency = this.projectName;
        script.onload = () => {
          this._loadedClassicScripts.add(normalized);
          resolve(true);
        };
        script.onerror = () => {
          this._errors.push({
            ok: false,
            path: normalized,
            error: "classic script load failed",
          });
          resolve(false);
        };
        document.head.appendChild(script);
      });
    }

      async _loadThreeIfNeeded(fileMap) {
      const usesThree = this._projectUsesToken(fileMap, "THREE");
      console.log("[InWindowScriptInjector-Trace] _loadThreeIfNeeded: Project uses THREE token:", usesThree);
      
      if (!usesThree) return false;

      if (typeof THREE !== "undefined") {
        console.log("[InWindowScriptInjector-Trace] _loadThreeIfNeeded: THREE is already defined globally.");
        return true;
      }

      if (typeof ThreeJSLoader === "undefined") {
        console.log("[InWindowScriptInjector-Trace] _loadThreeIfNeeded: ThreeJSLoader is undefined. Loading /library/ThreeJSLoader.js...");
        await this._loadClassicScript("/library/ThreeJSLoader.js");
      }

      if (typeof ThreeJSLoader !== "undefined") {
        if (typeof ThreeJSLoader.load === "function") {
          console.log("[InWindowScriptInjector-Trace] _loadThreeIfNeeded: Invoking ThreeJSLoader.load()...");
          await ThreeJSLoader.load();
          return true;
        } else if (typeof ThreeJSLoader.ensureThreeLoaded === "function") {
          console.log("[InWindowScriptInjector-Trace] _loadThreeIfNeeded: Invoking ThreeJSLoader.ensureThreeLoaded()...");
          await ThreeJSLoader.ensureThreeLoaded();
          return true;
        }
      }

      if (typeof THREE !== "undefined") {
        console.log("[InWindowScriptInjector-Trace] _loadThreeIfNeeded: THREE is defined globally after loading ThreeJSLoader.");
        return true;
      }

      console.warn("[InWindowScriptInjector-Trace] _loadThreeIfNeeded: THREE could not be resolved.");
      return false;
    }

      _projectUsesToken(fileMap, token) {
        const acorn = this._getAcorn();

        for (const pair of fileMap) {
          const path = pair[0];
          const content = pair[1];

          if (!String(path).endsWith(".js")) continue;
          if (typeof content !== "string") continue;

          if (acorn && typeof AstUtils !== "undefined" && typeof AstUtils.getReferencedIdentifiers === "function") {
            try {
              const identifiers = AstUtils.getReferencedIdentifiers(content, acorn);
              if (identifiers && identifiers.has && identifiers.has(token)) {
                return true;
              }
            } catch (error) {}
          }

          if (content.includes(token + ".")) return true;
          if (content.includes("new " + token)) return true;
        }

        return false;
      }

      _injectStyles(fileMap, htmlInfo) {
    for (const pair of fileMap) {
      const path = pair[0];
      const content = pair[1];

      if (!String(path).endsWith(".css")) continue;
      if (typeof content !== "string") continue;

      const style = document.createElement("style");
      style.dataset.vibesInWindowStyle = this.projectName;
      style.dataset.path = path;
      style.textContent = this._scopeCssForMount(content, this.container || this._container);
      document.head.appendChild(style);
      this._styleEls.push(style);
    }

    for (const href of htmlInfo.linkedStylesheets || []) {
      if (!href) continue;
      if (!this._isExternalClassicScript(href)) continue;

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href.startsWith("library/") || href.startsWith("thirdparty/")
        ? "/" + href
        : href;
      link.dataset.vibesInWindowStyle = this.projectName;
      document.head.appendChild(link);
      this._styleEls.push(link);
    }
  }

      _buildScriptOrder(fileMap, htmlInfo) {
      const jsPaths = Array.from(fileMap.keys())
        .filter((path) => String(path).endsWith(".js"))
        .filter((path) => !this._shouldSkipScriptPath(path));

      const htmlFirst = [];
      for (const path of htmlInfo.projectScriptPaths || []) {
        if (fileMap.has(path) && !htmlFirst.includes(path)) {
          htmlFirst.push(path);
        }
      }

      const sorted = jsPaths.sort((a, b) => a.localeCompare(b));
      const out = [];

      for (const path of htmlFirst) {
        if (!out.includes(path)) out.push(path);
      }

      for (const path of sorted) {
        if (!out.includes(path)) out.push(path);
      }

      return out;
    }

      _shouldSkipScriptPath(path) {
        const p = String(path || "");
        if (p.startsWith("/library/")) return true;
        if (p.startsWith("/thirdparty/")) return true;
        if (p.includes("/node_modules/")) return true;
        if (p.includes("/.git/")) return true;
        return false;
      }

      

      

      _installOrPatchScript(path, content) {
      const ast = this._parseAst(content);
      if (!ast) {
        return { ok: false, path, error: "AST parse failed" };
      }

      const classNodes = [];
      for (const node of ast.body || []) {
        const classNode = this._classNodeFromTopLevel(node);
        if (classNode) classNodes.push(classNode);
      }

      if (classNodes.length === 0) {
        return { ok: true, path, action: "skipped-no-class" };
      }

      // Standardizing live reload: we never bypass project files based on global namespace presence.
      // The IIFE wrapper protects against "already declared" errors and safely updates global pointers.
      return this._installWholeScript(path, content, ast, classNodes);
    }

      _installWholeScript(path, content, ast, classNodes) {
      const cleaned = this._stripImportsAndExports(content, ast);
      const classNames = classNodes
        .map((node) => node.id && node.id.name)
        .filter(Boolean);

      const trailer = this._globalAssignmentTrailer(classNames, path);
      
      const source = `(function(document) {\n${cleaned}\n${trailer}\n})(window.__vibesInWindowDocumentProxy || document);\n//# sourceURL=${path}`;

      try {
        const fn = new Function(source);
        fn();

        for (const className of classNames) {
          if (typeof globalThis[className] === "function") {
            this._installed.push({ path, className });
          }
        }

        return {
          ok: true,
          path,
          action: "installed",
          classes: classNames,
        };
      } catch (error) {
        return {
          ok: false,
          path,
          action: "install-failed",
          error: error.message,
        };
      }
    }

      _patchClassMethods(className, classNode, content, path) {
    console.log('[HOTPATCH TRACE] InWindowScriptInjector._patchClassMethods called for', className);
    const TargetClass = globalThis[className];
    if (typeof TargetClass !== "function") {
      console.log('[HOTPATCH TRACE] Target class missing in globalThis:', className);
      return { ok: false, path, className, error: "target class missing" };
    }

    let count = 0;
    const methods = [];

    for (const member of classNode.body?.body || []) {
      if (member.type !== "MethodDefinition") continue;
      if (member.key && member.key.type === "PrivateIdentifier") continue;

      const methodName = this._memberName(member);
      if (!methodName) continue;

      const methodSource = content.slice(member.start, member.end);
      const result = this._patchOneMethod(TargetClass, className, methodName, member, methodSource);

      if (result.ok) {
        count++;
        methods.push(result.label);
      } else {
        console.error('[HOTPATCH TRACE] _patchOneMethod failed:', result.error);
        this._errors.push({
          ok: false,
          path,
          className,
          methodName,
          error: result.error || result.reason,
        });
      }
    }

    console.log('[HOTPATCH TRACE] Patched', count, 'methods for', className);
    this._patched.push({ path, className, count, methods });

    return {
      ok: true,
      path,
      className,
      count,
      methods,
    };
  }

      _patchOneMethod(TargetClass, className, methodName, member, methodSource) {
        try {
          const TempClass = new Function(
            "return (class __VibesHotPatch__ { " + methodSource + "\n})"
          )();

          if (member.static) {
            const desc = Object.getOwnPropertyDescriptor(TempClass, methodName);
            if (!desc) {
              return { ok: false, error: "static descriptor missing" };
            }

            Object.defineProperty(TargetClass, methodName, desc);
            return {
              ok: true,
              label: "static " + methodName,
            };
          }

          const desc = Object.getOwnPropertyDescriptor(TempClass.prototype, methodName);
          if (!desc) {
            return { ok: false, error: "prototype descriptor missing" };
          }

          Object.defineProperty(TargetClass.prototype, methodName, desc);

          const prefix =
            member.kind === "get" || member.kind === "set"
              ? member.kind + " "
              : "";

          return {
            ok: true,
            label: prefix + methodName,
          };
        } catch (error) {
          return {
            ok: false,
            error: error.message,
            className,
            methodName,
          };
        }
      }

      _memberName(member) {
        if (!member || !member.key) return null;
        if (member.key.type === "Identifier") return member.key.name;
        if (member.key.type === "Literal") return String(member.key.value);
        return null;
      }

      _classNodeFromTopLevel(node) {
        if (!node) return null;

        if (node.type === "ClassDeclaration") return node;

        if (
          (node.type === "ExportNamedDeclaration" ||
            node.type === "ExportDefaultDeclaration") &&
          node.declaration &&
          node.declaration.type === "ClassDeclaration"
        ) {
          return node.declaration;
        }

        return null;
      }

      _stripImportsAndExports(content, ast) {
        const removals = [];

        for (const node of ast.body || []) {
          if (node.type === "ImportDeclaration") {
            removals.push({ start: node.start, end: node.end });
            continue;
          }

          if (
            (node.type === "ExportNamedDeclaration" ||
              node.type === "ExportDefaultDeclaration") &&
            node.declaration
          ) {
            removals.push({ start: node.start, end: node.declaration.start });
            continue;
          }

          if (
            (node.type === "ExportNamedDeclaration" ||
              node.type === "ExportDefaultDeclaration") &&
            !node.declaration
          ) {
            removals.push({ start: node.start, end: node.end });
          }
        }

        return this._removeRanges(content, removals).trim();
      }

      _stripTopLevelImports(moduleText) {
        const ast = this._parseAst(moduleText, "module");
        if (!ast) return moduleText;

        const removals = [];
        for (const node of ast.body || []) {
          if (node.type === "ImportDeclaration") {
            removals.push({ start: node.start, end: node.end });
          }
        }

        return this._removeRanges(moduleText, removals);
      }

      _removeRanges(content, ranges) {
        if (!ranges || ranges.length === 0) return content;

        const sorted = ranges
          .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end))
          .sort((a, b) => a.start - b.start);

        let out = "";
        let cursor = 0;

        for (const range of sorted) {
          if (range.start > cursor) out += content.slice(cursor, range.start);
          cursor = Math.max(cursor, range.end);
        }

        if (cursor < content.length) out += content.slice(cursor);
        return out;
      }

      _globalAssignmentTrailer(classNames, path) {
      const lines = [];
      const fileClass = String(path.split('/').pop() || '').replace(/\.js$/i, '');
      for (const className of classNames) {
        lines.push(
          `if (typeof ${className} !== "undefined") { ` +
          `globalThis.${className} = ${className}; ` +
          `window.${className} = ${className}; ` +
          `if (typeof ${fileClass} !== "undefined" && ${fileClass} !== ${className}) { ` +
          `globalThis.${fileClass} = ${className}; ` +
          `window.${fileClass} = ${className}; ` +
          `} }`
        );
      }
      return lines.join("\n");
    }

      async _runInitiator(htmlInfo, container, fileMap) {
      let initiator = htmlInfo.inlineInitiator || "";
      initiator = initiator.replace(/recursi\.loadApp\s*\([^)]+\)\s*;?/g, '');

      if (!initiator.trim()) {
        const err = new Error("No data-main or inline initiator found in index.html to serve as entry point.");
        this._setStatus(err.message, true);
        return { ok: false, error: err.message };
      }

      try {
        // Evaluate the initiator script and pass our enriched environment
        const fn = new Function("document", "__container__", "runEnv",
          `return (async () => {\n${initiator}\n})();`
        );
        this._activeAppInstance = await fn(this._proxy || document, container, this._runEnv);
        return { ok: true, mode: "initiator" };
      } catch (error) {
        this._errors.push({
          ok: false,
          action: "initiator-failed",
          error: error.message,
        });
        this._setStatus("Initiator failed: " + error.message, true);
        return {
          ok: false,
          mode: "initiator",
          error: error.message,
        };
      }
    }

      _parseAst(content, preferredSourceType = null) {
        const acorn = this._getAcorn();
        if (!acorn) return null;

        const options = {
          ecmaVersion: "latest",
          allowHashBang: true,
          ranges: true,
        };

        const sourceTypes = preferredSourceType
          ? [preferredSourceType]
          : ["script", "module"];

        for (const sourceType of sourceTypes) {
          try {
            return acorn.parse(content || "", {
              ...options,
              sourceType,
            });
          } catch (error) {}
        }

        return null;
      }

      _getAcorn() {
        if (this.app?.codeParser?.acorn) return this.app.codeParser.acorn;
        if (typeof window !== "undefined" && window.acorn) return window.acorn;
        if (typeof acorn !== "undefined") return acorn;
        return null;
      }

      _setStatus(message, isError = false) {
        if (this.app?.uiManager?.setStatus) {
          this.app.uiManager.setStatus(message, !!isError);
        }
      }

      _fail(error) {
        this._setStatus(error, true);
        return {
          ok: false,
          error,
          installed: this._installed,
          patched: this._patched,
          errors: this._errors,
        };
      }
    
  _scopeCssForMount(cssText, mount) {
    const scope = ".vibes-external-preview-app-root";
    if (mount && mount.classList) {
      mount.classList.add("vibes-external-preview-app-root");
    }

    // Safely replace html, body, and :root without breaking classes like "html-container"
    return String(cssText || "")
      .replace(/(?:\bhtml\b|\bbody\b|:root)(?![a-zA-Z0-9\-_])/g, scope);
  }

  _findProjectCapsule(fileMap) {
    for (const [path, content] of fileMap.entries()) {
      if (path.endsWith('Capsule.js') || path.endsWith('Manifest.js')) {
        // Find parser based on context (RunnerManager has this.app.codeParser, Injector has this.app?.codeParser)
        const parser = this.app?.codeParser || (this.jsModuleParser ? { extractStaticMetadata: (c) => this.codeParser.extractStaticMetadata(c) } : null);
        let meta = null;
        if (parser && typeof parser.extractStaticMetadata === 'function') {
           meta = parser.extractStaticMetadata(typeof content === 'string' ? content : '');
        } else {
           // Fallback regex
           const match = (typeof content === 'string' ? content : '').match(/static\s+getMetadata\s*\(\s*\)\s*\{[\s\S]*?return\s*(\{[\s\S]*?\});\s*\}/);
           if (match) {
             try { meta = new Function(`return ${match[1]}`)(); } catch (e) {}
           }
        }

        if (meta && (meta.kind === 'project-capsule' || meta.kind === 'project-manifest')) {
          return { path, meta };
        }
      }
    }
    return null;
  }

  async _injectorGetVfs() {
      const app = this.app;
      if (!app) return null;
      if (typeof app.refreshVirtualFileSystemStores === 'function') {
        try { 
          return await app.refreshVirtualFileSystemStores(); 
        } catch (e) {
          // Expose any hidden exceptions thrown during VFS mounting
          console.error("[VibesInVibes V3-Diagnostic-Active] _injectorGetVfs: refreshVirtualFileSystemStores failed:", e);
        }
      }
      return app.vfs || null;
    }

  _cleanupRun() {
      if (this._activeAppInstance && typeof this._activeAppInstance.destroy === 'function') {
        try { this._activeAppInstance.destroy(); } catch (e) { console.warn('App destroy error:', e); }
      }
      this._activeAppInstance = null;

      for (const styleEl of this._styleEls) {
        try { styleEl.remove(); } catch (error) {}
      }
      this._styleEls = [];
      
      // Clean up previously registered workspace globals
      this._cleanupGlobals();

      if (this._container) {
        if (this._container._vibesAppResizeObserver) {
          this._container._vibesAppResizeObserver.disconnect();
          this._container._vibesAppResizeObserver = null;
        }
        try { this._container.innerHTML = ""; } catch (error) {}
      }
    }


  _findGlobalClass(name) {
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

  _runAppCapsuleResolveLoadedGlobal(name) {
      if (!name || typeof name !== 'string') {
        return null;
      }
      try {
        return Function(
          'name',
          "try { return eval('typeof ' + name) !== 'undefined' ? eval(name) : null; } catch (error) { return null; }"
        )(name);
      } catch (error) {
        return null;
      }
    }

  async _analyzeManifest(filesJsonPath, fileMap) {
      const info = {
        htmlPath: null,
        html: '',
        externalClassicScripts: [],
        projectScriptPaths: [],
        inlineInitiator: "",
        importMapText: "",
        linkedStylesheets: [],
      };

      let dfContent = fileMap.get(filesJsonPath);
      if (!dfContent) {
        const vfs = await this._injectorGetVfs();
        if (vfs) {
          dfContent = await vfs.readFile(filesJsonPath, { nullOnMissing: true });
          if (dfContent) fileMap.set(filesJsonPath, dfContent);
        }
      }

      if (!dfContent) {
        throw new Error("Could not read manifest: " + filesJsonPath);
      }

      const dfStr = typeof dfContent === 'string' ? dfContent : new TextDecoder().decode(dfContent);
      const dfJson = JSON.parse(dfStr);
      await this._parseManifestIntoInfo(dfJson, filesJsonPath, fileMap, info);
      return info;
    }

  async _parseManifestIntoInfo(dfJson, dfPath, fileMap, info) {
      for (const lib of (dfJson.library || [])) {
        let libUrl = lib;
        if (!libUrl.startsWith('/')) libUrl = '/library/' + libUrl;
        if (libUrl.endsWith('.css')) info.linkedStylesheets.push(libUrl);
        else {
          if (!libUrl.endsWith('.js')) libUrl += '.js';
          info.externalClassicScripts.push({ src: libUrl, type: '' });
        }
      }

      for (const tp of (dfJson.thirdParty || [])) {
        if (tp.endsWith('.css')) info.linkedStylesheets.push(tp);
        else info.externalClassicScripts.push({ src: tp, type: '' });
      }

      const localFilesToFetch = [...(dfJson.local || [])];
      if (dfJson.main) {
        const mainFile = Array.isArray(dfJson.main) ? dfJson.main[0] : dfJson.main;
        if (typeof mainFile === 'string') localFilesToFetch.push(mainFile);
      }

      for (const loc of localFilesToFetch) {
        let locPath = this._resolveProjectPath(loc, dfPath, fileMap);
        if (!locPath) {
          const dir = dfPath.substring(0, dfPath.lastIndexOf('/') + 1);
          locPath = dir + loc.replace(/^\.\//, '');
        }
        
        if (!fileMap.has(locPath)) {
          try {
            const vfs = await this._injectorGetVfs();
            if (vfs) {
              const content = await vfs.readFile(locPath, { nullOnMissing: true });
              if (content) {
                fileMap.set(locPath, content);
                if (this.app && this.app.inMemoryFileStore) {
                  this.app.inMemoryFileStore.set(locPath, content);
                }
              }
            } else {
              const res = await fetch(locPath);
              if (res.ok) {
                const content = await res.text();
                fileMap.set(locPath, content);
                if (this.app && this.app.inMemoryFileStore) this.app.inMemoryFileStore.set(locPath, content);
              }
            }
          } catch(e) {}
        }
        if (!info.projectScriptPaths.includes(locPath)) info.projectScriptPaths.push(locPath);
      }

      if (dfJson.main) {
        let mainf = Array.isArray(dfJson.main) ? dfJson.main[0] : dfJson.main;
        if (typeof mainf === 'string') {
          const className = mainf.split('/').pop().replace(/\.js$/i, '');
          
          // Enforce passing our structured runEnv parameter into run() / init()
          info.inlineInitiator += `\nif (typeof ${className} !== 'undefined') {\n  const app = new ${className}();\n  if (typeof app.run === 'function') await app.run(runEnv);\n  else if (typeof app.init === 'function') await app.init(runEnv);\n  \n  if (typeof app.onResize === 'function') {\n    const ro = new ResizeObserver(entries => {\n      for (const entry of entries) {\n        app.onResize(entry.contentRect.width, entry.contentRect.height);\n      }\n    });\n    ro.observe(__container__);\n    __container__._vibesAppResizeObserver = ro;\n  }\n  return app;\n} else {\n  console.error("Entry class '${className}' not found (from files.json). Ensure the file is loaded and the class is spelled correctly.");\n  throw new Error("Entry class '${className}' not found");\n}\n`;
        }
      }
    }

  _cleanupGlobals() {
      // console.log('[InWindowScriptInjector] Cleaning up...');
      if (Array.isArray(this._installed)) {
        for (const item of this._installed) {
          const name = item.className;
          if (name) {
            delete globalThis[name];
            delete window[name];
          }
        }
      }
      this._installed = [];
      this._patched = [];
    }
}