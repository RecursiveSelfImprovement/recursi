// This file centralizes the decision to expose globals for debugging.
// To expose globals for use in the dev console or with bookmarklets, set the properties to true.
class DebugConfig {
  static initStatics() {
    if (this._staticsInitialized) return;
    this.exposeThreeDView = true;
    this.exposeBaseController = true;
    this._staticsInitialized = true;
  }
   // Exposes the main scene/camera/renderer object
   // Exposes the primary controller for commands

}

