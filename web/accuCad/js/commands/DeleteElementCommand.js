class DeleteElementCommand {
    constructor(baseController) {
      this.base = baseController;
      this.hoveredElement = null;
      this.allowSelfSnap = false;
    }

    onPoint(data) {
      if (!data) return;
      if (data.mode === 'click') {
        this.onMouseDown(data);
      } else if (data.mode === 'hover') {
        this.onMouseMove(data);
      }
    }

    onMouseDown(data) {
      const event = data.event;
      if (event && event.button !== 0) return; // Only process left click

      if (this.hoveredElement) {
        const toDelete = this.hoveredElement;
        
        // Clear hover highlights first
        if (this.hoveredElement) {
          HighlightUtilities.removeHighlight(this.hoveredElement);
          this.hoveredElement = null;
        }

        // Delete the element
        ElementOperations.deleteElement(toDelete, this.base.cadElements);
        this.base.refreshMousePosition();
      }
    }

    onMouseMove(data) {
      this.handleHover(data);
    }

    handleHover(data) {
      const pickedElement = ElementOperations.handleHover(this.base, data);

      if (pickedElement !== this.hoveredElement) {
        if (this.hoveredElement && this.hoveredElement !== this.base._highlightedElement) {
          HighlightUtilities.removeHighlight(this.hoveredElement);
        }
        if (pickedElement && pickedElement !== this.base._highlightedElement) {
          // Highlight candidates in distinct danger red for immediate deletion
          HighlightUtilities.applyHighlight(pickedElement, 0xff3333); 
        }
        this.hoveredElement = pickedElement;
      }
    }

    reset() {
      if (this.hoveredElement) {
        HighlightUtilities.removeHighlight(this.hoveredElement);
        this.hoveredElement = null;
      }
    }

    dispose() {
      this.reset();
    }
  }