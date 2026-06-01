class SmartElementPositioner {
  constructor(element, options = {}) {
      if (!(element instanceof HTMLElement)) throw new Error('Invalid element');
      const defaults = {
        position: [0, 0],
        size: [100, 100],
        aspectRatio: null,
        parent: null,
        sizeCallback: null,
        autoUpdate: false
      };
      this.config = { ...defaults, ...options };
      this.element = element;
      this.parent = this.config.parent;
      this.children = [];
      this.position = this.config.position;
      this.size = this.config.size;
      this.aspectRatio = this.config.aspectRatio;
      this.sizeCallback = this.config.sizeCallback;

      // FIX: Use absolute positioning when a container boundary is explicitly assigned
      this.element.style.position = (this.parent || this.config.container) ? 'absolute' : 'fixed';

      if (!window.SmartElementPositionerData) {
        window.SmartElementPositionerData = { elements: [], initialized: false };
      }
      window.SmartElementPositionerData.elements.push(this);
      if (this.parent) this.parent.children.push(this);
      if (!window.SmartElementPositionerData.initialized) this.setupPage();

      if (this.config.autoUpdate) {
        this.update();
      }
    }

  setupPage() {
    window.addEventListener('resize', () => {
      const roots = window.SmartElementPositionerData.elements.filter(e => !e.parent);
      roots.forEach(root => root.update());
    });
  }

  getParentDimensions() {
      if (this.parent) {
        const parentDims = this.parent.getPixelDimensions();
        return { left: 0, top: 0, width: parentDims.width, height: parentDims.height };
      }
      
      if (this.config.container && this.config.container instanceof HTMLElement) {
        // FIX: Provide local container sizes instead of window viewport bounds 
        return { left: 0, top: 0, width: this.config.container.clientWidth, height: this.config.container.clientHeight };
      }
      
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }

  getPixelDimensions() {
    const parent = this.getParentDimensions();
    const [leftPercent, topPercent] = this.position;
    const [widthPercent, heightPercent] = this.size;

    let left = (leftPercent / 100) * parent.width;
    let top = (topPercent / 100) * parent.height;
    let width = (widthPercent / 100) * parent.width;
    let height = (heightPercent / 100) * parent.height;

    if (this.aspectRatio) {
      const maxWidth = width;
      const maxHeight = height;
      const targetWidth = maxHeight * this.aspectRatio;
      const targetHeight = maxWidth / this.aspectRatio;
      if (targetWidth <= maxWidth) {
        left += (maxWidth - targetWidth) / 2;
        width = targetWidth;
        height = maxHeight;
      } else {
        top += (maxHeight - targetHeight) / 2;
        width = maxWidth;
        height = targetHeight;
      }
    }

    return { left, top, width, height };
  }

  update() {
      if (!this.element.parentNode) {
        if (this.parent) {
          this.parent.element.appendChild(this.element);
        } else if (this.config.container && this.config.container instanceof HTMLElement) {
          // Append to the sandbox container, not document.body
          this.config.container.appendChild(this.element);
        } else {
          document.body.appendChild(this.element);
        }
      }

      const pixelDims = this.getPixelDimensions();
      this.element.style.left = `${pixelDims.left}px`;
      this.element.style.top = `${pixelDims.top}px`;
      this.element.style.width = `${pixelDims.width}px`;
      this.element.style.height = `${pixelDims.height}px`;

      if (this.sizeCallback) {
        const percentSpecs = { position: this.position, size: this.size };
        this.sizeCallback(this, pixelDims, percentSpecs);
      }

      this.children.forEach(child => child.update());
    }

  setDimensions({ position, size }) {
    if (position) {
      if (position[0] !== null && position[0] !== undefined) this.position[0] = position[0];
      if (position[1] !== null && position[1] !== undefined) this.position[1] = position[1];
    }
    if (size) {
      if (size[0] !== null && size[0] !== undefined) this.size[0] = size[0];
      if (size[1] !== null && size[1] !== undefined) this.size[1] = size[1];
    }
  }
  
  remove() {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    if (window.SmartElementPositionerData && window.SmartElementPositionerData.elements) {
      const index = window.SmartElementPositionerData.elements.indexOf(this);
      if (index !== -1) {
        window.SmartElementPositionerData.elements.splice(index, 1);
      }
    }

    if (this.parent && this.parent.children) {
      const childIndex = this.parent.children.indexOf(this);
      if (childIndex !== -1) {
        this.parent.children.splice(childIndex, 1);
      }
    }
  }

  
}
