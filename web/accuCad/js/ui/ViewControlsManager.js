
class ViewControlsManager {
  static initStatics() {
    if (this._staticsInitialized) return;
    this.instance = null;
    this._staticsInitialized = true;
  }

  static init(baseController, threeDView) {
    this.initStatics();
    if (!this.instance) {
      this.instance = new ViewControls(baseController, threeDView);
      this.instance.show();
    }
  }

  static toggle() {
    if (this.instance) {
      this.instance.toggle();
    } else {
      console.error('ViewControlsManager not initialized. Cannot toggle UI.');
    }
  }


  static destroy() {
      if (this.instance) {
        if (typeof this.instance.destroy === 'function') {
          try { this.instance.destroy(); } catch (e) {}
        }
        this.instance = null;
      }
    }
}

