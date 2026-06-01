class RunInPageRunner {
  
  constructor(app) {
    this.app = app;
    this._activeInstance = null;
  }

  // Returns true if a child app is currently running in-page
  isRunning() {
    return !!this._activeInstance;
  }

  async launch() {
    try {
      const loaded = await this._ensureInWindowScriptInjectorLoaded();
      if (!loaded) {
        this.app.uiManager.setStatus(
          "In-window runner could not load InWindowScriptInjector.",
          true
        );
        return;
      }

      if (this._activeInstance && typeof this._activeInstance.bringToFront === "function") {
        this._activeInstance.bringToFront();
        return;
      }

      const injector = new InWindowScriptInjector(this.app);
      const controller = await injector.launch({
        existingController: this._activeInstance,
      });

      if (!controller || !controller.ok) {
        this.app.uiManager.setStatus(
          "In-window runner failed: " + (controller && controller.error ? controller.error : "unknown error"),
          true
        );
        return;
      }

      this._activeInstance = controller;

      const originalDestroy = controller.destroy;
      controller.destroy = () => {
        if (typeof originalDestroy === "function") {
          originalDestroy.call(controller);
        }
        this._activeInstance = null;
      };

      this.app.uiManager.setStatus(controller.status || "In-window runner active.");
    } catch (error) {
      this.app.uiManager.setStatus(
        "In-window runner launch failed: " + error.message,
        true
      );
    }
  }

  // Substitute document.body references in initiator with __container__
  _substituteContainer(initiator, container) {
    // Replace common patterns:
    //   init(document.body)  →  init(__container__)
    //   document.body.appendChild  →  __container__.appendChild
    //   document.body  →  __container__
    return initiator
      .replace(/\bdocument\.body\b/g, '__container__');
  }

  _loadScript(url) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => { console.warn('[RunInPageRunner] Could not load:', url); resolve(); };
      document.head.appendChild(s);
    });
  }

  async _ensureInWindowScriptInjectorLoaded() {
    if (typeof InWindowScriptInjector === "function") {
      return true;
    }

    const existing = document.querySelector(
      'script[data-vibes-runtime="InWindowScriptInjector"]'
    );

    if (existing) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      return typeof InWindowScriptInjector === "function";
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "/vibes/src/tools/runner/InWindowScriptInjector.js?_=" + Date.now();
      script.dataset.vibesRuntime = "InWindowScriptInjector";
      script.onload = resolve;
      script.onerror = () =>
        reject(new Error("Could not load InWindowScriptInjector.js"));
      document.head.appendChild(script);
    });

    return typeof InWindowScriptInjector === "function";
  }

}