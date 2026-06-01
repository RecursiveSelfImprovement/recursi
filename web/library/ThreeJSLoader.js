class ThreeJSLoader {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = Object.assign(
      {
        cameraPos: null,
        enableControls: false,
        useThickLines: false,
        useRaycaster: false,
        commonLoaders: false,
        hdrPath: null,
      },
      options
    );

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = null;
    this.modules = {};
    this.loaders = {};
    this.onUpdateCallback = null;
    this._onResizeBound = this._onResize.bind(this);
  }

  async init(containerElement) {
      console.log('[INSTRUMENT] ThreeJSLoader.init start');
      console.log('[ThreeJSLoader] init START');
      const THREE_URL =
        'https://recursi.dev/thirdparty/three-js-r153/build/three.module.js';
      const ADDONS = 'https://recursi.dev/thirdparty/three-js-r153/examples/jsm';

      try {
        if (window.THREE) {
          this.THREE = window.THREE;
        } else {
          this.THREE = await import(THREE_URL);
          window.THREE = this.THREE;
        }
      } catch (e) {
        console.error('[ThreeJSLoader] THREE import/reuse FAILED:', e);
        throw e;
      }

      const THREE = this.THREE;
      const loadAddon = async (path) => {
        const blobUrl = await this._fetchAndRewrite(ADDONS + path, THREE_URL, 1);
        return await import(blobUrl);
      };

      const jobs = [];
      if (this.options.enableControls)
        jobs.push(
          loadAddon('/controls/OrbitControls.js').then((m) => {
            this.modules.OrbitControls = m.OrbitControls;
          })
        );
      if (this.options.useThickLines) {
        jobs.push(
          loadAddon('/lines/Line2.js').then((m) => {
            this.modules.Line2 = m.Line2;
          })
        );
        jobs.push(
          loadAddon('/lines/LineGeometry.js').then((m) => {
            this.modules.LineGeometry = m.LineGeometry;
          })
        );
        jobs.push(
          loadAddon('/lines/LineMaterial.js').then((m) => {
            this.modules.LineMaterial = m.LineMaterial;
          })
        );
      }
      if (this.options.commonLoaders || this.options.hdrPath) {
        jobs.push(
          loadAddon('/loaders/GLTFLoader.js').then((m) => {
            this.modules.GLTFLoader = m.GLTFLoader;
          })
        );
        jobs.push(
          loadAddon('/loaders/RGBELoader.js').then((m) => {
            this.modules.RGBELoader = m.RGBELoader;
          })
        );
      }

      await Promise.all(jobs);

      const container =
        containerElement ||
        document.getElementById(this.containerId) ||
        document.body;

      this.scene = new THREE.Scene();

      const rect = container.getBoundingClientRect();
      const width = Math.max(1, rect.width || 640);
      const height = Math.max(1, rect.height || 360);

      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      if (this.options.cameraPos) {
        this.camera.position.set(
          this.options.cameraPos.x,
          this.options.cameraPos.y,
          this.options.cameraPos.z
        );
      } else {
        this.camera.position.z = 5;
      }

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;

      this.renderer.domElement.style.display = 'block';
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';

      this.renderer.setSize(width, height, false);
      container.appendChild(this.renderer.domElement);

      if (this.options.enableControls && this.modules.OrbitControls) {
        this.controls = new this.modules.OrbitControls(
          this.camera,
          this.renderer.domElement
        );
        this.controls.enableDamping = true;
      }
      if (this.options.useRaycaster) this.raycaster = new THREE.Raycaster();
      if (this.options.commonLoaders && this.modules.GLTFLoader)
        this.loaders.gltf = new this.modules.GLTFLoader();

      if (this.options.hdrPath && this.modules.RGBELoader) {
        await new Promise((resolve) => {
          new this.modules.RGBELoader().load(this.options.hdrPath, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = texture;
            this.scene.background = texture;
            resolve();
          });
        });
      }

      window.addEventListener('resize', this._onResizeBound, false);

      if (typeof ResizeObserver !== 'undefined') {
        this._resizeObserver = new ResizeObserver(() => {
          this._onResize();
        });
        this._resizeObserver.observe(container);
      }

      this.renderer.setAnimationLoop(() => {
        if (this.controls) this.controls.update();
        if (this.onUpdateCallback) this.onUpdateCallback();
        this.renderer.render(this.scene, this.camera);
      });
    }

  async start(containerElement) {
    return this.init(containerElement);
  }

  add(obj) {
    if (this.scene) this.scene.add(obj);
  }

  remove(obj) {
    if (this.scene) this.scene.remove(obj);
  }

  _onResize() {
    if (!this.renderer) return;
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // Resize the WebGL drawing buffer to match the container dimensions without overriding CSS
    this.renderer.setSize(w, h, false);
  }

  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(
          this.renderer.domElement
        );
      }
      this.renderer.dispose();
    }
    window.removeEventListener('resize', this._onResizeBound);
  }

  async _fetchAndRewrite(url, threeUrl, depth) {
    depth = depth || 0;
    const pad = '  '.repeat(depth);

    // Use a Promise cache to prevent duplicate processing and infinite recursion
    this._rewriteCache = this._rewriteCache || new Map();
    if (this._rewriteCache.has(url)) {
      return await this._rewriteCache.get(url);
    }

    let resolver, rejecter;
    const promise = new Promise((res, rej) => {
      resolver = res;
      rejecter = rej;
    });
    this._rewriteCache.set(url, promise);

    console.log(pad + '[THREE] fetching:', url);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      let code = await res.text();

      code = code.replace(/from ['"]three['"]/g, `from '${threeUrl}'`);

      const relRegex = /from ['"](\.\.?\/[^'"]+)['"]/g;
      const relatives = [];
      let m;
      while ((m = relRegex.exec(code)) !== null) {
        if (!relatives.includes(m[1])) relatives.push(m[1]);
      }

      for (const rel of relatives) {
        const absUrl = new URL(rel, url).href;
        const childBlobUrl = await this._fetchAndRewrite(
          absUrl,
          threeUrl,
          depth + 1
        );
        const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        code = code.replace(
          new RegExp(`from '${escaped}'`, 'g'),
          `from '${childBlobUrl}'`
        );
        code = code.replace(
          new RegExp(`from "${escaped}"`, 'g'),
          `from '${childBlobUrl}'`
        );
      }

      const blob = new Blob([code], { type: 'text/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      resolver(blobUrl);
      return blobUrl;
    } catch (err) {
      rejecter(err);
      throw err;
    }
  }

  resize(width, height) {
    if (!this.renderer || !this.camera) return false;

    const container =
      this.renderer.domElement?.parentElement ||
      document.getElementById(this.containerId) ||
      document.body;

    const w = Math.max(
      1,
      Number(width) ||
        container.clientWidth ||
        container.offsetWidth ||
        this.renderer.domElement.clientWidth ||
        640
    );

    const h = Math.max(
      1,
      Number(height) ||
        container.clientHeight ||
        container.offsetHeight ||
        this.renderer.domElement.clientHeight ||
        360
    );

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    return true;
  }

  enableOrbit(enabled = true) {
    if (!this.controls) return false;

    this.controls.enabled = !!enabled;

    if (typeof this.controls.update === 'function') {
      this.controls.update();
    }

    return true;
  }

  static async ensureThreeLoaded() {
      if (window.THREE) return window.THREE;
      const THREE_URL =
        'https://recursi.dev/thirdparty/three-js-r153/build/three.module.js';
      try {
        window.THREE = await import(THREE_URL);
        return window.THREE;
      } catch (e) {
        console.error('[ThreeJSLoader] ensureThreeLoaded failed', e);
        throw e;
      }
    }
}