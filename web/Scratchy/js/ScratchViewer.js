
class ScratchViewer {
  constructor(options = {}) {
    this.vm = null;
    this.vmReady = false;
    this.canvas = null;
    this.statusEl = null;
    this.root = null;
    this.embedded = options.embedded || false;
    this.projectBuffer = null;
  }

  init(container) {
    this.injectStyles();
    if (!this.embedded) {
      this.statusEl = makeElement('span', { className: 'sv-status' }, 'Ready');
      const btnFlag = makeElement(
        'button',
        {
          className: 'sv-btn sv-green',
          onclick: () => this.vm && this.vm.greenFlag(),
        },
        '🟢'
      );
      const btnStop = makeElement(
        'button',
        {
          className: 'sv-btn sv-red',
          onclick: () => this.vm && this.vm.stopAll(),
        },
        '🔴'
      );
      const toolbar = makeElement('div', { className: 'sv-toolbar' }, [
        btnFlag,
        btnStop,
        this.statusEl,
      ]);
      this.root = makeElement('div', { className: 'sv-container' }, [toolbar]);
    } else {
      this.root = makeElement('div', { className: 'sv-container' });
    }
    this.canvas = makeElement('canvas', { className: 'sv-stage' });
    const stageWrapper = makeElement('div', { className: 'sv-stage-wrap' }, [
      this.canvas,
    ]);
    this.root.appendChild(stageWrapper);
    container.appendChild(this.root);
    this.initVM();
  }

  initVM() {
    // Check if globals are present
    const VM = window.VirtualMachine;
    const ScratchRender = window.ScratchRender;
    const ScratchStorage = window.ScratchStorage;

    if (!VM || !ScratchRender || !ScratchStorage) {
      console.warn(
        'Scratch globals missing during initVM. They might load later.'
      );
      if (this.statusEl)
        this.statusEl.textContent = 'Engine scripts loading...';
      return; // Soft fail, allow loadProject to try again
    }

    try {
      if (this.vm) return; // Already initialized

      this.vm = new VM();
      const renderer = new ScratchRender(this.canvas);
      this.vm.attachRenderer(renderer);
      const storage = new ScratchStorage();
      this.vm.attachStorage(storage);

      this.vm.setCompatibilityMode(true);
      this.vm.setTurboMode(false);

      this.vm.start();

      if (this.statusEl) this.statusEl.textContent = 'Ready';
    } catch (e) {
      if (this.statusEl)
        this.statusEl.textContent = 'VM Init Failed: ' + e.message;
      console.error(e);
    }
  }

  async loadProject(arrayBuffer) {
    if (!this.vm) {
      this.initVM();
      if (!this.vm) return;
    }
    this.projectBuffer = arrayBuffer;
    try {
      if (this.statusEl) this.statusEl.textContent = 'Loading project...';
      this.vm.stopAll();
      await this.vm.loadProject(new Uint8Array(arrayBuffer));
      if (this.statusEl) this.statusEl.textContent = 'Project loaded.';
      this.vm.greenFlag();
      this.resize();
    } catch (e) {
      if (this.statusEl)
        this.statusEl.textContent = 'Load Failed: ' + e.message;
      console.error(e);
    }
  }

  destroy() {
    if (this.vm) {
      this.vm.stopAll();
      // Clean up VM listeners if needed
      this.vm = null;
    }
    if (this.root) {
      this.root.remove();
    }
  }

  injectStyles() {
    applyCss(
      `
    .sv-container {
      display: flex; flex-direction: column; height: 100%;
      background: #000; color: #eee; font-family: sans-serif;
    }
    .sv-toolbar {
      display: flex; gap: 10px; padding: 8px 12px;
      background: #222; border-bottom: 1px solid #333;
      align-items: center; flex-shrink: 0;
    }
    .sv-btn {
      border: 1px solid #444; background: #333; color: #fff;
      border-radius: 4px; padding: 4px 12px; cursor: pointer;
      font-size: 20px;
    }
    .sv-btn:hover { background: #444; }
    .sv-green { color: #4f4; }
    .sv-red { color: #f44; }
    .sv-status { font-size: 12px; color: #888; margin-left: auto; }
    .sv-stage-wrap {
      flex: 1; display: flex; align-items: center; justify-content: center;
      background: #000; overflow: hidden;
    }
    .sv-stage {
      image-rendering: pixelated;
      max-width: 100%;
      max-height: 100%;
      margin: auto;
    }
    `,
      'scratch-viewer-styles'
    );
  }

  resize() {
    if (!this.canvas || !this.vm || !this.vm.renderer) return;
    const wrap = this.canvas.parentElement;
    const availW = wrap.clientWidth;
    const availH = wrap.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const ratio = Math.min(availW / 480, availH / 360);
    const displayW = Math.floor(480 * ratio);
    const displayH = Math.floor(360 * ratio);
    this.canvas.style.width = `${displayW}px`;
    this.canvas.style.height = `${displayH}px`;
    this.canvas.style.margin = 'auto';
    this.canvas.width = displayW * dpr;
    this.canvas.height = displayH * dpr;
    this.vm.renderer.resize(displayW * dpr, displayH * dpr);
  }

  refresh() {
    if (this.projectBuffer) this.loadProject(this.projectBuffer);
  }
}

