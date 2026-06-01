// phase2-managed-migration: internal imports/exports stripped
class FeatureManager {
  
  constructor(app) {
    this.app = app;
    this.isDrawingModeActive = false;
    this.glowDrawer = null;
    this.lastGlowDrawerMode = 'add';
    this.colorCubeInstance = null;
    this.highlighter = null;
  }

  showPaintToolsDialog(targetElement) {
    if (!this.app.paintSelectionPanel && typeof PaintSelectionPanel !== 'undefined') {
      const container = this.app.rootContainer || document.body;
      this.app.paintSelectionPanel = new PaintSelectionPanel(this.app, container);
    }
    
    if (this.app.paintSelectionPanel) {
      this.app.paintSelectionPanel.show(targetElement);
    }
  }

  toggleDrawingMode(mode = null) {
    if (mode === null) {
      // Explicit request to turn OFF
      if (this.app.isDrawingModeActive) {
        this.app.isDrawingModeActive = false;

        if (this.app.glowDrawer) {
          this.app.glowDrawer.deactivate();
        }
      }
    } else {
      // Request to turn ON or SWITCH mode

      // If NOT active, we need to activate it first
      if (!this.app.isDrawingModeActive) {
        this.app.isDrawingModeActive = true;

        if (!this.app.glowDrawer) {
          this.app.glowDrawer = new (window.GlowDrawer || GlowDrawer)({
            target: this.app.rootContainer,
            targets: this.app.getAllVisibilityWidgets(),
            onDeactivate: () => {
              if (this.app.isDrawingModeActive) {
                this.toggleDrawingMode(null);
              }
              if (this.app.paintSelectionPanel) {
                this.app.paintSelectionPanel.updateButtonStates();
              }
            },
            onUndoStackChange: () => {
              if (this.app.paintSelectionPanel) {
                this.app.paintSelectionPanel.updateButtonStates();
              }
            },
          });
        }
        const drawContainer = this.app.projectFilesManager?.treeContainer;
        this.app.glowDrawer.activate(drawContainer);
      }

      // Apply the mode (whether we just started or were already running)
      if (this.app.glowDrawer) {
        this.app.glowDrawer.setMode(mode);
      }
      this.lastGlowDrawerMode = mode;
    }

    if (this.app.paintSelectionPanel) {
      this.app.paintSelectionPanel.updateButtonStates();
    }
  }

    


  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### FeatureManager\n\nManages high-level optional editor features. It coordinates the overlay canvas for the freehand painting tool (GlowDrawer) and the float selection toolbar panel.";
    }
}

