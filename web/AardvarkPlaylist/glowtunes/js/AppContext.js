class AppContext {

    static register(appInstance) {
    this.state().currentApp = appInstance;
  }

  static get() {
    return this.state().currentApp;
  }

  static unregister() {
    this.state().currentApp = null;
  }

  static setNotesContainer(element) {
    this.state().notesContainer = element || null;
  }

  static getNotesContainer() {
    return this.state().notesContainer || document.body;
  }

  static setTargetDocument(doc) {
    this.state().targetDocument = doc;
  }

  /**
   * Gets the target document for DOM manipulations. Defaults to the current window's document.
   * @returns {Document} The target document.
   */

  static getTargetDocument() {
    return this.state().targetDocument || window.document;
  }

  /**
   * Gets the target window, which is useful for dimension calculations (innerWidth, etc.).
   * @returns {Window} The target window object.
   */

  static getTargetWindow() {
    return this.getTargetDocument().defaultView || window;
  }

  /**
   * Gets the body element of the target document, which is the primary container for visuals.
   * @returns {HTMLElement} The body of the target document.
   */

  static getTargetBody() {
    return this.getTargetDocument().body;
  }

  static state() {
    if (!this._state) {
      this._state = {
        currentApp: null,
        notesContainer: null,
        targetDocument: null
      };
    }
    return this._state;
  }

  

  

  

  
}

