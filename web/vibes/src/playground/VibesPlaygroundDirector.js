class VibesPlaygroundDirector {

  constructor(options = {}) {
    this.app = options.app || window.projectApp || window.app || null;
    this.env = options.env || null;
    this.mode = options.mode || "replay";

    this.pfm = this.app?.projectFilesManager || null;
    this.rootId = null;
    this.store = null;
    this.playRoot = null;

    this.host = null;
    this.treeView = null;
    this.walker = null;

    this.stopRequested = false;
    this.pauseRequested = false;
    this.delayMs = 700;
    this.armedCleanup = false;
    this.currentStepIndex = 0;
    this.totalSteps = 0;
    this.history = [];
  }

  async open() {
    this._installStyles();
    this._publishControlGlobal();
    this._resolveWorkspace();
    this._buildPanel();

    if (!this.store) {
      this._setMainText(
        "No workspace folder is connected yet.",
        "Open Floating Trees, choose a local folder, then click Refresh Workspace."
      );
      return this;
    }

    this.playRoot = `${this.rootId}/_vibes_playground`;
    this._setMainText("Ready.", `Workspace: ${this.rootId}\nPlayground: ${this.playRoot}`);
    return this;
  }

  _publishControlGlobal() {
    globalThis.__vibesPlaygroundDirector = this;
  }

  _resolveWorkspace() {
    const stores = this.app?.workspaceFileStores;
    if (!stores || !stores.size) return null;

    const floatingState = this.pfm?._ensureFloatingFileTreeState?.();
    const openTrees = floatingState?.trees;

    if (openTrees?.size) {
      for (const [rootId, info] of openTrees.entries()) {
        const store = stores.get(rootId) || info?.store;
        if (store?.get && store?.set && store?.keys) {
          this.rootId = rootId;
          this.store = store;
          this.host = info?.host || null;
          this.treeView = info?.treeView || info?.host?.treeView || null;
          this.playRoot = `${rootId}/_vibes_playground`;
          return { rootId, store };
        }
      }
    }

    for (const [rootId, store] of stores.entries()) {
      if (store?.get && store?.set && store?.keys) {
        this.rootId = rootId;
        this.store = store;
        this.playRoot = `${rootId}/_vibes_playground`;
        return { rootId, store };
      }
    }

    return null;
  }

  _buildPanel() {
    // Clean up old hardcoded panel if it somehow exists
    const old = document.getElementById("vibes-playground-director-v2");
    if (old) old.remove();

    const content = document.createElement("div");
    content.style.cssText = "display: flex; flex-direction: column; gap: 10px; font-family: system-ui, sans-serif; color: #eef4ff;";

    const warning = document.createElement("div");
    warning.className = "vpd2-warning";
    warning.textContent = "Cleanup deletes only files under _vibes_playground. Arm cleanup before destructive demos.";

    const controls = document.createElement("div");
    controls.className = "vpd2-controls";

    const run = this._button("▶ Run Replay", () => this.runReplay());
    const cleanupReplay = this._button("🧹 Cleanup + Replay", () => this.cleanupAndReplay());
    const existing = this._button("🔁 Existing Folder Demo", () => this.runExistingFolderDemo());
    const walker = this._button("🌲 Attach Walker", () => this.attachWalker());
    const refresh = this._button("↻ Refresh Workspace", () => {
      this._resolveWorkspace();
      this._refreshTree();
      this._setMainText("Workspace refreshed.", this.playRoot || "No workspace.");
    });

    controls.append(run, cleanupReplay, existing, walker, refresh);

    const safetyRow = document.createElement("label");
    safetyRow.className = "vpd2-safety";
    safetyRow.style.cursor = "pointer";

    const arm = document.createElement("input");
    arm.type = "checkbox";
    arm.onchange = () => {
      this.armedCleanup = arm.checked;
      this._log("cleanup armed: " + this.armedCleanup);
    };

    safetyRow.append(arm, document.createTextNode(" Arm cleanup / delete playground files"));

    const speedRow = document.createElement("div");
    speedRow.className = "vpd2-speed";

    const pause = this._button("Pause", () => {
      this.pauseRequested = !this.pauseRequested;
      pause.textContent = this.pauseRequested ? "Resume" : "Pause";
      this._log(this.pauseRequested ? "paused" : "resumed");
    });

    const stop = this._button("Stop", () => {
      this.stopRequested = true;
      this._log("stop requested");
    });

    const faster = this._button("Faster", () => {
      this.delayMs = Math.max(40, Math.floor(this.delayMs * 0.65));
      this._updateStatus("delay " + this.delayMs + "ms");
    });

    const slower = this._button("Slower", () => {
      this.delayMs = Math.min(2500, Math.floor(this.delayMs * 1.35));
      this._updateStatus("delay " + this.delayMs + "ms");
    });

    this.statusEl = document.createElement("div");
    this.statusEl.className = "vpd2-status";
    this.statusEl.textContent = "Ready.";

    speedRow.append(pause, stop, faster, slower, this.statusEl);

    this.mainTitleEl = document.createElement("div");
    this.mainTitleEl.className = "vpd2-main-title";
    this.mainTitleEl.textContent = "Ready.";

    this.mainDetailEl = document.createElement("pre");
    this.mainDetailEl.className = "vpd2-main-detail";
    this.mainDetailEl.textContent = "";

    this.logEl = document.createElement("pre");
    this.logEl.className = "vpd2-log";
    this.logEl.textContent = "Director ready.\n";

    content.append(warning, controls, safetyRow, speedRow, this.mainTitleEl, this.mainDetailEl, this.logEl);

    this.panelDialog = UITools.makeDialog({
      title: "🌲 Vibes Playground Director",
      content: content,
      width: "560px",
      // Snap it nicely to the bottom right where it used to be
      position: [Math.max(20, window.innerWidth - 600), Math.max(20, window.innerHeight - 600)],
      onClose: () => {
        this.stopRequested = true;
        this.panelDialog = null;
      }
    });
    
    this.panelEl = content; // Keep reference for styling compatibility
  }

  _button(label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.onclick = async () => {
      try {
        await handler();
      } catch (error) {
        this._log("❌ " + (error.stack || error.message || error));
        this._updateStatus("error");
      }
    };
    return button;
  }

  _setMainText(title, detail = "") {
    if (this.mainTitleEl) this.mainTitleEl.textContent = title;
    if (this.mainDetailEl) this.mainDetailEl.textContent = detail;
  }

  _updateStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
    this.host?._setTreeWalkerToolbarStatus?.(text);
  }

  _log(text) {
    const line = `[${new Date().toLocaleTimeString()}] ${text}`;
    this.history.push(line);

    if (this.history.length > 1000) {
      this.history.splice(0, this.history.length - 1000);
    }

    if (this.logEl) {
      this.logEl.textContent += line + "\n";
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    this.env?.log?.(text);
  }

  async cleanupAndReplay() {
    this.stopRequested = false;
    this.pauseRequested = false;

    if (!this._resolveWorkspace()) {
      this._setMainText("No workspace.", "Open a floating tree/workspace first.");
      return;
    }

    if (!this.armedCleanup) {
      this._setMainText(
        "Cleanup is not armed.",
        "Check “Arm cleanup / delete playground files” first. This intentionally protects you from accidental deletion."
      );
      return;
    }

    await this.cleanupPlayground();
    await this.runReplay();
  }

  async runReplay() {
    this.stopRequested = false;
    this.pauseRequested = false;

    if (!this._resolveWorkspace()) {
      this._setMainText("No workspace.", "Open a floating tree/workspace first.");
      return;
    }

    await this._openTree();

    const steps = [
      ["Create playground intro", () => this._createIntro()],
      ["Create HTML demo", () => this._createHtmlDemo()],
      ["Create SparkToy class", () => this._createSparkToy()],
      ["Create ColorPulseMath class", () => this._createColorPulseMath()],
      ["Create docs sidecars", () => this._createDocs()],
      ["Open and inspect SparkToy", () => this._openAndInspectSparkToy()],
      ["Patch SparkToy.describe()", () => this._patchSparkToyDescribe()],
      ["Insert SparkToy.describeTempo()", () => this._insertSparkToyTempo()],
      ["Tour AST methods", () => this._tourAstMethods()],
      ["Pause on HTML dependencies", () => this._htmlDependencyDemo()],
      ["Attach compact TreeWalker", () => this.attachWalker()],
      ["Write demo report", () => this._writeReport()],
    ];

    await this._runSteps(steps);
  }

  async runExistingFolderDemo() {
    this.stopRequested = false;
    this.pauseRequested = false;

    if (!this._resolveWorkspace()) {
      this._setMainText("No workspace.", "Open a floating tree/workspace first.");
      return;
    }

    await this._openTree();

    const steps = [
      ["Scan existing playground", () => this._scanPlayground()],
      ["Move old report into archive", () => this._archiveOldReport()],
      ["Delete stale scratch files", () => this._deleteScratchFiles()],
      ["Create fresh scratch file", () => this._createScratchFile()],
      ["Patch existing SparkToy if present", () => this._patchSparkToyDescribe()],
      ["Re-run AST method tour", () => this._tourAstMethods()],
      ["Re-run HTML dependency metadata demo", () => this._htmlDependencyDemo()],
      ["Refresh and summarize", () => this._writeReport()],
    ];

    await this._runSteps(steps);
  }

  async cleanupPlayground() {
    if (!this.store || !this.playRoot) throw new Error("No playground store/root.");

    const paths = this._playgroundPaths().reverse();

    this._setMainText(
      "Cleaning playground…",
      `Deleting ${paths.length} file(s) under ${this.playRoot}`
    );

    for (const path of paths) {
      await this._waitIfPaused();
      if (this.stopRequested) return;

      this._highlight(path, "error", "DEL");
      await this._sleep(Math.max(45, this.delayMs * 0.18));

      if (typeof this.store.delete === "function") {
        await this.store.delete(path);
      } else {
        await this.store.set(path + ".deleted.txt", "Deleted marker for " + path + "\n");
      }

      this.app?.inMemoryFileStore?.delete?.(path);
      this._log("deleted " + path);
    }

    await this._refreshTree();
    this._setMainText("Cleanup complete.", this.playRoot);
  }

  async attachWalker() {
    if (!this._resolveWorkspace()) return false;
    await this._openTree();

    if (this.host && typeof this.host._openAttachedTreeWalker === "function") {
      const result = this.host._openAttachedTreeWalker();
      this.walker = result || this.host.treeWalker || this.walker;
      this._updateStatus("walker attached");
      return result;
    }

    if (typeof TreeWalkerDialog === "undefined") {
      this._setMainText("TreeWalkerDialog not loaded.", "Reload Vibes or include TreeWalkerDialog.js.");
      return false;
    }

    const walker = new TreeWalkerDialog(this.app);
    this.walker = walker;

    if (this.host?.contentElement && typeof walker.mountInto === "function") {
      let mount = this.host.contentElement.querySelector(".vpd2-attached-walker-mount");

      if (!mount) {
        mount = document.createElement("div");
        mount.className = "vpd2-attached-walker-mount";
        mount.style.cssText = [
          "flex:0 0 310px",
          "min-height:280px",
          "border-top:1px solid rgba(255,255,255,.08)",
          "background:rgba(10,14,22,.74)",
        ].join(";");
        this.host.contentElement.appendChild(mount);
      }

      walker.mountInto(mount, {
        sourceTreeView: this.treeView,
        store: this.store,
        rootPath: this.playRoot,
        launchPath: this.playRoot,
      });

      this._updateStatus("walker mounted into tree");
      return walker;
    }

    walker.attachToSourceTree?.({
      sourceTreeView: this.treeView,
      store: this.store,
      rootPath: this.playRoot,
      launchPath: this.playRoot,
    });
    walker.show();
    this._updateStatus("walker opened");
    return walker;
  }

  async _runSteps(steps) {
    this.currentStepIndex = 0;
    this.totalSteps = steps.length;

    for (const [title, fn] of steps) {
      if (this.stopRequested) return;

      this.currentStepIndex++;
      this._setMainText(title, `${this.currentStepIndex}/${this.totalSteps}`);
      this._updateStatus(`${this.currentStepIndex}/${this.totalSteps}`);
      this._log("▶ " + title);

      await this._sleep(Math.max(120, this.delayMs * 0.28));
      await this._waitIfPaused();

      if (this.stopRequested) return;

      try {
        await fn();
        this._log("✓ " + title);
      } catch (error) {
        this._log("❌ " + title + ": " + (error.stack || error.message || error));
        throw error;
      }

      await this._sleep(this.delayMs);
    }

    this._setMainText("Demo complete.", this.playRoot);
    this._updateStatus("complete");
  }

  async _waitIfPaused() {
    while (this.pauseRequested && !this.stopRequested) {
      await this._sleep(100);
    }
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async _openTree() {
    if (!this.pfm?.openFloatingTreeForStore) {
      throw new Error("ProjectFilesManager.openFloatingTreeForStore is missing.");
    }

    this.pfm.openFloatingTreeForStore(this.rootId, this.store);
    await this._sleep(250);

    const state = this.pfm._ensureFloatingFileTreeState?.();
    const info = state?.trees?.get(this.rootId);

    this.host = info?.host || this.host;
    this.treeView = info?.treeView || info?.host?.treeView || this.treeView;

    this.host?.bringToFront?.();

    if (!this.treeView) {
      throw new Error("Floating tree is open, but treeView was not found.");
    }

    this._updateStatus("tree ready");
  }

  async _refreshTree() {
    if (this.host?.refresh) {
      this.host.refresh();
      await this._sleep(180);
      return true;
    }

    if (this.rootId && this.store && this.pfm?.openFloatingTreeForStore) {
      await this._openTree();
      return true;
    }

    return false;
  }

  _highlight(path, state = "current", label = null) {
    if (!this.treeView) return false;

    if (typeof this.treeView.highlightNode === "function") {
      this.treeView.highlightNode(path, {
        state,
        label: label || String(state).toUpperCase().slice(0, 6),
        title: path,
        clearCurrent: state === "current",
        behavior: this.delayMs < 100 ? "auto" : "smooth",
      });
      return true;
    }

    if (typeof this.treeView.setNodeWalkerState === "function") {
      this.treeView.setNodeWalkerState(path, state, {
        label: label || String(state).toUpperCase().slice(0, 6),
        title: path,
      });
      return true;
    }

    return false;
  }

  _playgroundPaths() {
    if (!this.store?.keys || !this.playRoot) return [];
    return Array.from(this.store.keys())
      .filter((path) => String(path).startsWith(this.playRoot + "/"))
      .sort();
  }

  async _write(path, content) {
    await this.store.set(path, content);
    const readback = this.store.get(path);

    if (readback !== content) {
      throw new Error("Readback mismatch: " + path);
    }

    if (!this.app.inMemoryFileStore) this.app.inMemoryFileStore = new Map();
    this.app.inMemoryFileStore.set(path, content);

    this._highlight(path, "programmaticWrite", "WRITE");
    this._log("wrote " + path);
  }

  async _delete(path) {
    this._highlight(path, "error", "DEL");

    if (typeof this.store.delete === "function") {
      await this.store.delete(path);
    }

    this.app?.inMemoryFileStore?.delete?.(path);
    this._log("deleted " + path);
  }

  async _openEditor(path) {
    if (this.pfm?._openFloatingExternalEditorWindow) {
      await this.pfm._openFloatingExternalEditorWindow(path, this.store);
      return true;
    }

    if (this.pfm?._openFloatingExternalFileWindow) {
      this.pfm._openFloatingExternalFileWindow(path, this.store);
      return true;
    }

    if (this.app?.tabOrchestrator?.openFileInTab) {
      await this.app.tabOrchestrator.openFileInTab({ id: path, path });
      return true;
    }

    return false;
  }

  async _createIntro() {
    await this._write(
      `${this.playRoot}/README.md`,
      [
        "# Vibes Playground",
        "",
        "Reusable demo folder for TreeWalker, floating trees, AST patching, metadata, and dependency demos.",
        "",
        "This folder is safe to delete if you created it with VibesPlaygroundDirector.",
        "",
        "Generated: " + new Date().toISOString(),
        "",
      ].join("\n")
    );

    await this._write(`${this.playRoot}/scratch/delete-me.tmp`, "temporary scratch file\n");
    await this._refreshTree();
  }

  async _createHtmlDemo() {
    await this._write(
      `${this.playRoot}/web/demo.html`,
      [
        "<!doctype html>",
        "<html>",
        "<head>",
        "  <meta charset=\"utf-8\">",
        "  <title>Vibes Playground Demo</title>",
        "  <link rel=\"stylesheet\" href=\"./styles.css\">",
        "  <script src=\"../src/SparkToy.js\"></script>",
        "  <script src=\"../src/ColorPulseMath.js\"></script>",
        "</head>",
        "<body>",
        "  <main class=\"demo-root\">Vibes Playground Demo</main>",
        "  <script src=\"./demo-runtime.js\"></script>",
        "</body>",
        "</html>",
        "",
      ].join("\n")
    );

    await this._write(
      `${this.playRoot}/web/styles.css`,
      [
        ".demo-root {",
        "  padding: 20px;",
        "  border-radius: 16px;",
        "  background: rgba(30, 40, 60, 0.72);",
        "  color: white;",
        "}",
        "",
      ].join("\n")
    );

    await this._write(
      `${this.playRoot}/web/demo-runtime.js`,
      [
        "class PlaygroundRuntime {",
        "  static boot() {",
        "    return 'runtime booted';",
        "  }",
        "}",
        "",
      ].join("\n")
    );

    await this._refreshTree();
  }

  async _createSparkToy() {
    await this._write(`${this.playRoot}/src/SparkToy.js`, this._sparkToySource());
    await this._refreshTree();
  }

  async _createColorPulseMath() {
    await this._write(`${this.playRoot}/src/ColorPulseMath.js`, this._colorPulseMathSource());
    await this._refreshTree();
  }

  async _createDocs() {
    const sparkPath = `${this.playRoot}/src/SparkToy.js`;
    const mathPath = `${this.playRoot}/src/ColorPulseMath.js`;

    await this._write(
      this._docsPathFor(sparkPath),
      "# SparkToy\n\nSmall demo class used for AST method patching and method touring.\n"
    );

    await this._write(
      this._docsPathFor(mathPath),
      "# ColorPulseMath\n\nTiny helper class used by the HTML dependency demo.\n"
    );

    await this._refreshTree();
  }

  async _openAndInspectSparkToy() {
    const path = `${this.playRoot}/src/SparkToy.js`;
    await this._openEditor(path);
    this._highlight(path, "paused", "OPEN");

    const methods = this._listMethods(this.store.get(path));
    this._setMainText(
      "SparkToy AST methods",
      methods.map((m) => `${m.className}.${m.name} [${m.start}, ${m.end}]`).join("\n")
    );
  }

  async _patchSparkToyDescribe() {
    const path = `${this.playRoot}/src/SparkToy.js`;
    const source = this.store.get(path);

    if (typeof source !== "string") {
      this._log("SparkToy.js not found; skipping patch.");
      return;
    }

    const patched = this._upsertMethodAst({
      source,
      className: "SparkToy",
      methodName: "describe",
      methodSource: [
        "describe() {",
        "  return `${this.name}: ${this.sparks.length} sparks, glow=${this.glow}, reusableDemo=true`;",
        "}",
      ].join("\n"),
    });

    await this._write(path, patched.content);
    await this._openEditor(path);
    await this._refreshTree();

    this._highlight(path, "programmaticWrite", "PATCH");
    this._log(`SparkToy.describe ${patched.action}`);
  }

  async _insertSparkToyTempo() {
    const path = `${this.playRoot}/src/SparkToy.js`;
    const source = this.store.get(path);

    if (typeof source !== "string") return;

    const patched = this._upsertMethodAst({
      source,
      className: "SparkToy",
      methodName: "describeTempo",
      methodSource: [
        "describeTempo(bpm = 120) {",
        "  const beatMs = Math.round(60000 / Math.max(1, Number(bpm) || 120));",
        "  return `${this.name}: ${bpm} bpm, ${beatMs}ms per beat`;",
        "}",
      ].join("\n"),
    });

    await this._write(path, patched.content);
    await this._openEditor(path);
    await this._refreshTree();

    this._highlight(path, "programmaticWrite", "METHOD");
    this._log(`SparkToy.describeTempo ${patched.action}`);
  }

  async _tourAstMethods() {
    const jsPaths = this._playgroundPaths().filter((path) => path.endsWith(".js"));

    for (const path of jsPaths) {
      await this._waitIfPaused();
      if (this.stopRequested) return;

      const source = this.store.get(path);
      const methods = this._listMethods(source);

      this._highlight(path, "current", "AST");
      await this._openEditor(path);

      for (const method of methods) {
        await this._waitIfPaused();
        if (this.stopRequested) return;

        this._setMainText(
          "AST method tour",
          `${path}\n\n${method.className}.${method.name}\nrange: ${method.start}..${method.end}`
        );

        this._highlight(path, "paused", method.name.slice(0, 6).toUpperCase());
        await this._sleep(Math.max(120, this.delayMs * 0.62));
      }
    }
  }

  async _htmlDependencyDemo() {
    const htmlPaths = this._playgroundPaths().filter((path) => path.endsWith(".html"));

    for (const path of htmlPaths) {
      await this._waitIfPaused();
      if (this.stopRequested) return;

      const html = this.store.get(path);
      const deps = this._extractHtmlDependencies(html, path);

      this._highlight(path, "paused", "HTML");
      await this._openEditor(path);

      this._setMainText(
        "HTML dependency pause",
        [
          path,
          "",
          "Dependencies found:",
          ...deps.map((dep) => `- ${dep.kind}: ${dep.path}`),
          "",
          "Writing dependency metadata sidecar now…",
        ].join("\n")
      );

      await this._sleep(Math.max(650, this.delayMs));

      const metaPath = this._metadataPathFor(path);
      const meta = {
        schema: 2,
        sourcePath: path,
        generatedBy: "VibesPlaygroundDirector._htmlDependencyDemo",
        generatedAt: new Date().toISOString(),
        dependencies: deps,
      };

      await this._write(metaPath, JSON.stringify(meta, null, 2) + "\n");
      await this._refreshTree();

      this._highlight(metaPath, "programmaticWrite", "META");
    }
  }

  async _scanPlayground() {
    const paths = this._playgroundPaths();
    this._setMainText("Existing playground scan", paths.join("\n") || "(empty)");
    await this._visualWalk(paths, "SCAN");
  }

  async _archiveOldReport() {
    const report = `${this.playRoot}/DEMO_REPORT.md`;
    const content = this.store.get(report);

    if (typeof content !== "string") {
      this._log("No old DEMO_REPORT.md to archive.");
      return;
    }

    const archive = `${this.playRoot}/archive/DEMO_REPORT.${Date.now()}.md`;
    await this._write(archive, content);

    if (typeof this.store.delete === "function") {
      await this._delete(report);
    }

    await this._refreshTree();
    this._highlight(archive, "modified", "ARCH");
  }

  async _deleteScratchFiles() {
    const scratch = this._playgroundPaths().filter(
      (path) => path.includes("/scratch/") || path.endsWith(".tmp")
    );

    for (const path of scratch) {
      await this._waitIfPaused();
      if (this.stopRequested) return;
      await this._delete(path);
      await this._sleep(Math.max(60, this.delayMs * 0.22));
    }

    await this._refreshTree();
  }

  async _createScratchFile() {
    await this._write(
      `${this.playRoot}/scratch/fresh-scratch-${Date.now()}.txt`,
      "Fresh scratch file from existing-folder demo.\n"
    );

    await this._refreshTree();
  }

  async _writeReport() {
    const paths = this._playgroundPaths();

    const report = [
      "# Vibes Playground Demo Report",
      "",
      "Generated: " + new Date().toISOString(),
      "",
      "## Playground",
      "",
      "`" + this.playRoot + "`",
      "",
      "## Files",
      "",
      ...paths.map((path) => "- `" + path + "`"),
      "",
      "## What this demonstrates",
      "",
      "- Workspace-store file writes with readback verification.",
      "- Floating FileTreeView refresh and highlighting.",
      "- Cleanup/replay as a reusable demo mode.",
      "- AST method replacement and insertion.",
      "- HTML dependency extraction.",
      "- Dependency metadata sidecar generation.",
      "- Attached TreeWalker launch point.",
      "",
    ].join("\n");

    const path = `${this.playRoot}/DEMO_REPORT.md`;
    await this._write(path, report);
    await this._openEditor(path);
    await this._refreshTree();
    this._highlight(path, "modified", "DONE");
  }

  async _visualWalk(paths, label = "WALK") {
    for (const path of paths) {
      await this._waitIfPaused();
      if (this.stopRequested) return;
      this._highlight(path, "current", label);
      await this._sleep(Math.max(50, this.delayMs * 0.22));
    }
  }

  _docsPathFor(sourcePath) {
    if (
      typeof SidecarDocumentation !== "undefined" &&
      typeof SidecarDocumentation.docsPathForFile === "function"
    ) {
      try {
        return SidecarDocumentation.docsPathForFile(sourcePath);
      } catch (error) {}
    }

    const slashIndex = sourcePath.lastIndexOf("/");
    const dir = slashIndex >= 0 ? sourcePath.slice(0, slashIndex) : "";
    const name = slashIndex >= 0 ? sourcePath.slice(slashIndex + 1) : sourcePath;
    return `${dir}/${name.replace(/[^\w.-]+/g, "_").replace(/\./g, "_")}.md`;
  }

  _metadataPathFor(sourcePath) {
    const slashIndex = sourcePath.lastIndexOf("/");
    const dir = slashIndex >= 0 ? sourcePath.slice(0, slashIndex) : "";
    const name = slashIndex >= 0 ? sourcePath.slice(slashIndex + 1) : sourcePath;
    return `${dir}/${name.replace(/[^\w.-]+/g, "_").replace(/\./g, "_")}.meta.json`;
  }

  _extractHtmlDependencies(html, htmlPath) {
    if (typeof html !== "string") return [];

    const doc = new DOMParser().parseFromString(html, "text/html");
    const deps = [];

    const resolve = (value) => {
      if (!value || /^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
        return value;
      }

      const dir = htmlPath.slice(0, htmlPath.lastIndexOf("/"));
      const parts = (dir + "/" + value).split("/");
      const out = [];

      for (const part of parts) {
        if (!part || part === ".") continue;
        if (part === "..") out.pop();
        else out.push(part);
      }

      return "/" + out.join("/");
    };

    for (const script of Array.from(doc.querySelectorAll("script[src]"))) {
      deps.push({
        kind: "script",
        raw: script.getAttribute("src"),
        path: resolve(script.getAttribute("src")),
      });
    }

    for (const link of Array.from(doc.querySelectorAll("link[href]"))) {
      const rel = String(link.getAttribute("rel") || "").toLowerCase();
      deps.push({
        kind: rel || "link",
        raw: link.getAttribute("href"),
        path: resolve(link.getAttribute("href")),
      });
    }

    return deps;
  }

  _listMethods(source) {
    if (!globalThis.acorn || typeof source !== "string") return [];

    const ast = globalThis.acorn.parse(source, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowHashBang: true,
    });

    const methods = [];

    for (const top of ast.body || []) {
      if (top.type !== "ClassDeclaration") continue;

      const className = top.id?.name || "(anonymous)";

      for (const item of top.body?.body || []) {
        if (item.type !== "MethodDefinition") continue;

        methods.push({
          className,
          name: item.key?.name || item.key?.value || "(computed)",
          kind: item.kind,
          static: !!item.static,
          start: item.start,
          end: item.end,
        });
      }
    }

    return methods;
  }

  _upsertMethodAst(options = {}) {
    const { source, className, methodName, methodSource } = options;

    if (!globalThis.acorn) {
      throw new Error("Acorn is required for AST method upsert.");
    }

    const ast = globalThis.acorn.parse(source, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowHashBang: true,
    });

    const klass = (ast.body || []).find(
      (node) => node.type === "ClassDeclaration" && node.id?.name === className
    );

    if (!klass) throw new Error("Class not found: " + className);

    const existing = (klass.body?.body || []).find(
      (node) =>
        node.type === "MethodDefinition" &&
        (node.key?.name === methodName || node.key?.value === methodName)
    );

    const cleanMethod = this._indentMethod(methodSource.trim(), 2);

    if (existing) {
      return {
        action: "replaced",
        content: source.slice(0, existing.start) + cleanMethod + source.slice(existing.end),
      };
    }

    const insertAt = klass.body.end - 1;
    return {
      action: "inserted",
      content:
        source.slice(0, insertAt).replace(/\s*$/, "\n\n") +
        cleanMethod +
        "\n" +
        source.slice(insertAt),
    };
  }

  _indentMethod(methodSource, spaces) {
    const pad = " ".repeat(spaces);

    return methodSource
      .split("\n")
      .map((line) => (line.trim() ? pad + line : ""))
      .join("\n");
  }

  _sparkToySource() {
    return [
      "class SparkToy {",
      "
",
      "",
      "  constructor(options = {}) {",
      "    this.name = options.name || \"SparkToy\";",
      "    this.glow = options.glow !== false;",
      "    this.sparks = [];",
      "  }",
      "",
      "  addSpark(label, color = \"cyan\") {",
      "    const spark = { label, color, at: new Date().toISOString() };",
      "    this.sparks.push(spark);",
      "    return spark;",
      "  }",
      "",
      "  describe() {",
      "    return this.name + \": \" + this.sparks.length + \" sparks\";",
      "  }",
      "",
      "  renderText() {",
      "    return this.sparks.map((spark) => spark.label + \":\" + spark.color).join(\"\\n\");",
      "  }",
      "",
      "  clear() {",
      "    this.sparks.length = 0;",
      "    return this;",
      "  }",
      "}",
      "",
    ].join("\n");
  }

  _colorPulseMathSource() {
    return [
      "class ColorPulseMath {",
      "
",
      "",
      "  static pulse(t, speed = 1) {",
      "    return 0.5 + 0.5 * Math.sin(t * speed);",
      "  }",
      "",
      "  static clamp01(value) {",
      "    return Math.max(0, Math.min(1, Number(value) || 0));",
      "  }",
      "",
      "  static mix(a, b, t) {",
      "    const k = ColorPulseMath.clamp01(t);",
      "    return a + (b - a) * k;",
      "  }",
      "}",
      "",
    ].join("\n");
  }

  _installStyles() {
    if (document.getElementById("vibes-playground-director-v2-styles")) return;

    const style = document.createElement("style");
    style.id = "vibes-playground-director-v2-styles";
    style.textContent = `
      .vpd2-panel {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483000;
        width: min(520px, calc(100vw - 36px));
        max-height: min(720px, calc(100vh - 36px));
        display: flex;
        flex-direction: column;
        gap: 9px;
        padding: 14px;
        border-radius: 20px;
        color: #eef4ff;
        background: rgba(12, 16, 28, 0.78);
        border: 1px solid rgba(170, 205, 255, 0.22);
        box-shadow:
          0 18px 80px rgba(0, 0, 0, 0.48),
          0 0 34px rgba(100, 190, 255, 0.12),
          inset 0 0 0 1px rgba(255,255,255,0.035);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        font-family: system-ui, sans-serif;
      }

      .vpd2-header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: start;
      }

      .vpd2-title {
        font-size: 15px;
        font-weight: 850;
        letter-spacing: 0.2px;
      }

      .vpd2-subtitle {
        color: #9fb2d9;
        font-size: 11px;
        margin-top: 2px;
      }

      .vpd2-close {
        cursor: pointer;
        width: 28px;
        height: 28px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.055);
        color: #dce8ff;
        font-size: 20px;
        line-height: 20px;
      }

      .vpd2-close:hover {
        background: rgba(255, 110, 150, 0.16);
        border-color: rgba(255, 140, 170, 0.4);
      }

      .vpd2-warning {
        padding: 8px 10px;
        border-radius: 13px;
        color: #ffdca8;
        background: rgba(255, 180, 80, 0.08);
        border: 1px solid rgba(255, 190, 110, 0.18);
        font-size: 12px;
        line-height: 1.4;
      }

      .vpd2-controls,
      .vpd2-speed {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }

      .vpd2-controls button,
      .vpd2-speed button {
        cursor: pointer;
        border: 1px solid rgba(170, 205, 255, 0.24);
        background: rgba(255,255,255,0.055);
        color: #e6eeff;
        border-radius: 11px;
        padding: 6px 9px;
        font-size: 12px;
        font-weight: 750;
        box-shadow: 0 0 14px rgba(100, 170, 255, 0.06);
      }

      .vpd2-controls button:hover,
      .vpd2-speed button:hover {
        background: rgba(255,255,255,0.105);
        border-color: rgba(170, 205, 255, 0.42);
        box-shadow: 0 0 18px rgba(100, 170, 255, 0.15);
      }

      .vpd2-safety {
        display: flex;
        align-items: center;
        gap: 7px;
        color: #ccd8f2;
        font-size: 12px;
        user-select: none;
      }

      .vpd2-status {
        margin-left: auto;
        color: #8fc7ff;
        font: 11px ui-monospace, Menlo, Consolas, monospace;
      }

      .vpd2-main-title {
        padding: 8px 10px;
        border-radius: 13px;
        color: #e7fbff;
        background: rgba(90, 160, 255, 0.10);
        border: 1px solid rgba(130, 200, 255, 0.15);
        font-size: 13px;
        font-weight: 800;
      }

      .vpd2-main-detail {
        margin: 0;
        padding: 9px 10px;
        min-height: 64px;
        max-height: 190px;
        overflow: auto;
        border-radius: 13px;
        white-space: pre-wrap;
        color: #cbd8f4;
        background: rgba(0,0,0,0.20);
        border: 1px solid rgba(255,255,255,0.06);
        font: 11px/1.45 ui-monospace, Menlo, Consolas, monospace;
      }

      .vpd2-log {
        margin: 0;
        padding: 10px;
        min-height: 120px;
        max-height: 240px;
        overflow: auto;
        border-radius: 13px;
        white-space: pre-wrap;
        color: #cfe0ff;
        background: rgba(0,0,0,0.28);
        border: 1px solid rgba(255,255,255,0.07);
        font: 11px/1.45 ui-monospace, Menlo, Consolas, monospace;
      }
    `;

    document.head.appendChild(style);
  }

}
