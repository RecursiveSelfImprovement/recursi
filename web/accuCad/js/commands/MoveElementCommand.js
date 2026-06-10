class MoveElementCommand {
    constructor(baseController) {
      this.base = baseController;
      this.selectedElement = null;
      this.anchorPoint = null;
      this.originalState = null;
      this.previewShape = null;
      this.state = 1; // 1 = Identify Element, 2 = Define Destination, 3 = Define Custom Anchor
      this.allowSelfSnap = false;
      this.hoveredElement = null;

      // Settings toggles
      this.makeCopy = false;
      this.useDifferentStartPoint = false;
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

      if (this.state === 1) {
        let target = null;
        let anchor = null;

        // Capture tentative point if active
        if (this.base._tentativeOriginalPoint) {
          target = this.base._highlightedElement;
          anchor = this.base._tentativeOriginalPoint.slice();
        } else {
          // Fallback to currently hovered/highlighted element
          target = this.hoveredElement;
          anchor = data.point ? data.point.slice() : null;
        }

        if (target) {
          this.selectedElement = target;
          this.originalState = ElementOperations.backupState(target);

          if (this.useDifferentStartPoint) {
            // Transition to State 3: Wait for user to define custom anchor
            this.state = 3;
          } else {
            // Direct Move: Use current click/snap as anchor
            this.anchorPoint = anchor;
            this.state = 2;

            if (!this.makeCopy) {
              ElementOperations.ghostOriginal(this.selectedElement);
            }

            // IMMEDIATELY update AccuDraw origin to start point
            if (this.anchorPoint) {
              this.base.setOrigin(this.anchorPoint.slice());
            }
          }

          // Force clear active tentative marker
          if (typeof TentativePointHandler !== 'undefined') {
            TentativePointHandler._clearTentativePoint(this.base);
          }
        }
      } else if (this.state === 3) {
        // Defining custom anchor
        this.anchorPoint = data.point ? data.point.slice() : null;
        if (this.anchorPoint) {
          this.state = 2; // Transition to moving

          if (!this.makeCopy) {
            ElementOperations.ghostOriginal(this.selectedElement);
          }

          // IMMEDIATELY update AccuDraw origin to custom start point
          this.base.setOrigin(this.anchorPoint.slice());
        }
      } else if (this.state === 2) {
        if (this.selectedElement && this.anchorPoint) {
          const offset = [
            data.point[0] - this.anchorPoint[0],
            data.point[1] - this.anchorPoint[1],
            data.point[2] - this.anchorPoint[2]
          ];

          if (this.makeCopy) {
            const clone = this.cloneElementWithOffset(this.selectedElement, offset);
            if (clone) {
              clone.id = Math.random().toString(36).substr(2, 9);
              clone.isTemporary = false;
              this.base.cadElements.push(clone);
              ElementOperations.rebuildPermanentVisual(this.base, clone);

              // UPDATE SELECTOR REFERENCE: Subsequent copies/moves offset from this newly dropped copy
              this.selectedElement = clone;
            }
          } else {
            // Restore original styles before permanent translation update
            ElementOperations.restoreOriginal(this.selectedElement);
            
            // Apply vector displacement permanently
            this.applyTranslation(this.selectedElement, offset);
            ElementOperations.rebuildPermanentVisual(this.base, this.selectedElement);
          }

          // Set AccuDraw origin to final destination point
          this.base.setOrigin(data.point.slice());

          // CONTINUOUS ACCEPTS: Prepare the element for the next move relative to this new point
          this.anchorPoint = data.point.slice();
          this.originalState = ElementOperations.backupState(this.selectedElement);

          if (!this.makeCopy) {
            ElementOperations.ghostOriginal(this.selectedElement);
          }
        }
      }
    }

    onMouseMove(data) {
      if (this.state === 1) {
        this.handleHover(data);
      } else if (this.state === 3) {
        // Defining anchor reference: Hover behaves normally
        this.handleHover(data);
      } else if (this.state === 2) {
        if (this.selectedElement && this.anchorPoint && data.point) {
          const offset = [
            data.point[0] - this.anchorPoint[0],
            data.point[1] - this.anchorPoint[1],
            data.point[2] - this.anchorPoint[2]
          ];
          this.updatePreview(offset);
        }
      }
    }

    handleHover(data) {
      const pickedElement = ElementOperations.handleHover(this.base, data);
      if (pickedElement !== this.hoveredElement) {
        if (this.hoveredElement && this.hoveredElement !== this.base._highlightedElement) {
          HighlightUtilities.removeHighlight(this.hoveredElement);
        }
        if (pickedElement && pickedElement !== this.base._highlightedElement) {
          HighlightUtilities.applyHighlight(pickedElement, 0xffff00); // Yellow hover glow
        }
        this.hoveredElement = pickedElement;
      }
    }

    

    applyTranslation(el, offset) {
      if (el.type === 'path') {
        el.vertices.forEach(v => {
          v.point[0] += offset[0];
          v.point[1] += offset[1];
          v.point[2] += offset[2];
        });
        el.points = el.vertices.map(v => [...v.point]);
        el.updateDimensions();
      } else if (el.type === 'capsule') {
        el.start[0] += offset[0];
        el.start[1] += offset[1];
        el.start[2] += offset[2];
        el.end[0] += offset[0];
        el.end[1] += offset[1];
        el.end[2] += offset[2];
        el.points = [el.start.slice(), el.end.slice()];
        el.updateDimensions();
      } else if (el.type === 'rectangle') {
        el.start[0] += offset[0];
        el.start[1] += offset[1];
        el.start[2] += offset[2];
        el.end[0] += offset[0];
        el.end[1] += offset[1];
        el.end[2] += offset[2];
        el.updateDimensions();
      } else if (el.type === 'arc') {
        el.startPt[0] += offset[0];
        el.startPt[1] += offset[1];
        el.startPt[2] += offset[2];
        el.center[0] += offset[0];
        el.center[1] += offset[1];
        el.center[2] += offset[2];
        el.endPt[0] += offset[0];
        el.endPt[1] += offset[1];
        el.endPt[2] += offset[2];
        el.updateDimensions();
      } else if (el.type === 'curve') {
        el.controlPoints.forEach(p => {
          p[0] += offset[0];
          p[1] += offset[1];
          p[2] += offset[2];
        });
        el.points = el.controlPoints;
        el.updateDimensions();
      } else if (el.type === 'circle') {
        el.points.forEach(p => {
          p[0] += offset[0];
          p[1] += offset[1];
          p[2] += offset[2];
        });
      }
    }

    

    

    

    

    updatePreview(offset) {
      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        ElementOperations.disposeObject(this.previewShape);
        this.previewShape = null;
      }

      const clone = this.cloneElementWithOffset(this.selectedElement, offset);
      if (!clone) return;

      this.previewShape = ElementOperations.renderPreviewObject(this.base, clone);
      if (this.previewShape) {
        this.base.view.scene.add(this.previewShape);
      }
    }

    cloneElementWithOffset(el, offset) {
      if (el.type === 'path') {
        const cl = PathElement.fromJSON(el.toJSON());
        this.applyTranslation(cl, offset);
        return cl;
      } else if (el.type === 'capsule') {
        const cl = CapsuleElement.fromJSON(el.toJSON());
        this.applyTranslation(cl, offset);
        return cl;
      } else if (el.type === 'rectangle') {
        const cl = RectangleElement.fromJSON(el.toJSON());
        this.applyTranslation(cl, offset);
        return cl;
      } else if (el.type === 'arc') {
        const cl = ArcElement.fromJSON(el.toJSON());
        this.applyTranslation(cl, offset);
        return cl;
      } else if (el.type === 'curve') {
        const cl = CurveElement.fromJSON(el.toJSON());
        this.applyTranslation(cl, offset);
        return cl;
      } else if (el.type === 'circle') {
        const cl = {
          type: 'circle',
          id: el.id,
          color: el.color,
          points: el.points.map(p => [...p])
        };
        this.applyTranslation(cl, offset);
        return cl;
      }
      return null;
    }

    

    reset() {
      if (this.selectedElement) {
        ElementOperations.restoreOriginal(this.selectedElement);
      }

      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        ElementOperations.disposeObject(this.previewShape);
        this.previewShape = null;
      }

      if (this.hoveredElement) {
        HighlightUtilities.removeHighlight(this.hoveredElement);
        this.hoveredElement = null;
      }

      this.selectedElement = null;
      this.anchorPoint = null;
      this.originalState = null;
      this.state = 1;
    }

    dispose() {
      this.reset();
    }

    
  
  renderToolSettings(container) {
      container.innerHTML = '';

      const createCheckbox = (labelText, checkedValue, callback) => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 6px 0; margin-bottom: 4px;';
        
        const label = document.createElement('div');
        label.style.cssText = 'font-size: 11px; color: #aaa; text-transform: uppercase; font-weight: bold;';
        label.textContent = labelText;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checkedValue;
        input.setAttribute('tabindex', '-1');
        input.style.cssText = 'cursor: pointer; width: 16px; height: 16px; accent-color: #00e676;';
        input.onchange = (e) => callback(e.target.checked);

        // Instantly redirect focus back to main drawing canvas on click/focus
        input.addEventListener('focus', () => {
          input.blur();
          this.base.domElement.focus();
        });

        row.appendChild(label);
        row.appendChild(input);
        return row;
      };

      const copyCb = createCheckbox('Make Copy', this.makeCopy, (checked) => {
        const oldCopy = this.makeCopy;
        this.makeCopy = checked;

        // Dynamic visual update mid-command
        if (this.state === 2 && this.selectedElement) {
          if (checked && !oldCopy) {
            // Switched to Copy mode -> restore original visual
            ElementOperations.restoreOriginal(this.selectedElement);
          } else if (!checked && oldCopy) {
            // Switched to Move mode -> ghost original visual
            ElementOperations.ghostOriginal(this.selectedElement);
          }
        }
      });

      const anchorCb = createCheckbox('Arbitrary Anchor', this.useDifferentStartPoint, (checked) => {
        this.useDifferentStartPoint = checked;
        this.reset(); // Reset command states on mode switches
      });

      container.appendChild(copyCb);
      container.appendChild(anchorCb);
    }

  

  
}