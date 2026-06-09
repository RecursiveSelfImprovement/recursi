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
          this.originalState = this.backupState(target);

          if (this.useDifferentStartPoint) {
            // Transition to State 3: Wait for user to define custom anchor
            this.state = 3;
          } else {
            // Direct Move: Use current click/snap as anchor
            this.anchorPoint = anchor;
            this.state = 2;

            if (!this.makeCopy) {
              this.ghostOriginal(this.selectedElement);
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
            this.ghostOriginal(this.selectedElement);
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
              this.rebuildPermanentVisual(clone);

              // UPDATE SELECTOR REFERENCE: Subsequent copies/moves offset from this newly dropped copy
              this.selectedElement = clone;
            }
          } else {
            // Restore original styles before permanent translation update
            this.restoreOriginal(this.selectedElement);
            
            // Apply vector displacement permanently
            this.applyTranslation(this.selectedElement, offset);
            this.rebuildPermanentVisual(this.selectedElement);
          }

          // Set AccuDraw origin to final destination point
          this.base.setOrigin(data.point.slice());

          // CONTINUOUS ACCEPTS: Prepare the element for the next move relative to this new point
          this.anchorPoint = data.point.slice();
          this.originalState = this.backupState(this.selectedElement);

          if (!this.makeCopy) {
            this.ghostOriginal(this.selectedElement);
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
      const event = data.event;
      if (!event) return;

      const canvasRect = this.base.domElement.getBoundingClientRect();
      if (canvasRect.width <= 0 || canvasRect.height <= 0) return;

      const mouse = new THREE.Vector2(
        ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
        -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1
      );

      const camera = this.base.view.camera;
      const raycaster = new THREE.Raycaster();
      raycaster.params.Line.threshold = 0.15;
      raycaster.setFromCamera(mouse, camera);

      const candidates = [];
      this.base.cadElements.forEach((el) => {
        if (el.threejsObject && el.threejsObject.visible) {
          candidates.push(el.threejsObject);
        }
      });

      const intersections = raycaster.intersectObjects(candidates, true);
      let pickedElement = null;

      if (intersections.length > 0) {
        const hitObj = intersections[0].object;
        pickedElement = this.base.cadElements.find(el => {
          let matches = false;
          if (el.threejsObject) {
            el.threejsObject.traverse(child => {
              if (child === hitObj) matches = true;
            });
          }
          return matches;
        });
      }

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

    backupState(el) {
      if (el.type === 'path') {
        return {
          vertices: el.vertices.map(v => ({ point: [...v.point], radius: v.radius })),
          closed: el.closed
        };
      } else if (el.type === 'capsule') {
        return {
          start: [...el.start],
          end: [...el.end],
          radius: el.radius
        };
      } else if (el.type === 'rectangle') {
        return {
          start: [...el.start],
          end: [...el.end]
        };
      } else if (el.type === 'arc') {
        return {
          startPt: [...el.startPt],
          center: [...el.center],
          endPt: [...el.endPt]
        };
      } else if (el.type === 'curve') {
        return {
          controlPoints: el.controlPoints.map(p => [...p])
        };
      } else if (el.type === 'circle') {
        return {
          points: el.points.map(p => [...p])
        };
      }
      return null;
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

    rebuildPermanentVisual(el) {
      const bc = this.base;
      if (el.threejsObject) {
        bc.view.scene.remove(el.threejsObject);
        el.threejsObject.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
      }

      if (el.type === 'path') {
        const cmd = new DrawPathCommand(bc);
        cmd.tempElement = el;
        cmd.updatePermanentGeometry();
      } else if (el.type === 'capsule') {
        const cmd = new DrawCapsuleCommand(bc);
        cmd.tempElement = el;
        cmd.finalizeCapsule();
      } else if (el.type === 'rectangle') {
        const cmd = new DrawRectangleCommand(bc);
        cmd.tempElement = el;
        cmd.finalizeRectangle();
      } else if (el.type === 'arc') {
        this.buildVisualArc(el);
      } else if (el.type === 'curve') {
        this.buildVisualCurve(el);
      } else if (el.type === 'circle') {
        this.buildVisualCircle(el);
      }
    }

    buildVisualArc(el) {
      const bc = this.base;
      const cmd = new DrawArcCommand(bc);
      const arcData = cmd.computeArcData(el.startPt, el.center, el.endPt);
      if (!arcData) return;

      const arcCurve = new THREE.ArcCurve(
        0,
        0,
        arcData.radius,
        arcData.startAngle,
        arcData.endAngle,
        arcData.clockwise
      );
      const points2D = arcCurve.getPoints(50);
      const points3D = points2D.map((pt) => {
        const vec = new THREE.Vector3().addVectors(
          arcData.u.clone().multiplyScalar(pt.x),
          arcData.v.clone().multiplyScalar(pt.y)
        );
        vec.add(new THREE.Vector3(...el.center));
        return vec;
      });

      const positions = points3D.flatMap((v) => [v.x, v.y, v.z]);
      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      const material = new LineMaterial({
        color: el.color ? (typeof el.color === 'string' ? parseInt(el.color.replace('#', ''), 16) : el.color) : 0xff0000,
        linewidth: el.lineWidth || bc.lineWidth || 4,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      });
      const line = new Line2(geometry, material);
      el.threejsObject = line;
      bc.view.scene.add(line);
    }

    buildVisualCurve(el) {
      const bc = this.base;
      const [cp0, cp1, cp2, cp3] = el.controlPoints.map(
        (p) => new THREE.Vector3(...p)
      );
      const curve = new THREE.CubicBezierCurve3(cp0, cp1, cp2, cp3);
      const curvePoints = curve.getPoints(50);
      const positions = curvePoints.flatMap((p) => [p.x, p.y, p.z]);

      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      const material = new LineMaterial({
        color: el.color ? (typeof el.color === 'string' ? parseInt(el.color.replace('#', ''), 16) : el.color) : 0xff0000,
        linewidth: el.lineWidth || bc.lineWidth || 4,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      });
      const curveLine = new Line2(geometry, material);
      el.threejsObject = curveLine;
      bc.view.scene.add(curveLine);
    }

    buildVisualCircle(el) {
      const bc = this.base;
      const cmd = new DrawCircleCommand(bc);
      const center = el.points[0];
      const edge = el.points[1] || [center[0] + 1, center[1], center[2]];
      const line = cmd.createCircleVisual(center, edge, false);
      if (line) {
        el.threejsObject = line;
        bc.view.scene.add(line);
      }
    }

    updatePreview(offset) {
      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        this.disposeObject(this.previewShape);
        this.previewShape = null;
      }

      const clone = this.cloneElementWithOffset(this.selectedElement, offset);
      if (!clone) return;

      this.previewShape = this.renderPreviewObject(clone);
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

    renderPreviewObject(el) {
      const bc = this.base;
      let obj = null;

      if (el.type === 'path') {
        const cmd = new DrawPathCommand(bc);
        cmd.tempElement = el;
        cmd.updatePermanentGeometry();
        obj = el.threejsObject;
        el.threejsObject = null;
      } else if (el.type === 'capsule') {
        const cmd = new DrawCapsuleCommand(bc);
        obj = cmd.renderVisual(el, true);
      } else if (el.type === 'rectangle') {
        const cmd = new DrawRectangleCommand(bc);
        obj = cmd.renderVisual(el, true);
      } else if (el.type === 'arc') {
        this.buildVisualArc(el);
        obj = el.threejsObject;
        el.threejsObject = null;
      } else if (el.type === 'curve') {
        this.buildVisualCurve(el);
        obj = el.threejsObject;
        el.threejsObject = null;
      } else if (el.type === 'circle') {
        const cmd = new DrawCircleCommand(bc);
        obj = cmd.createCircleVisual(el.points[0], el.points[1] || [el.points[0][0] + 1, el.points[0][1], el.points[0][2]], true);
      }

      if (obj) {
        obj.traverse(child => {
          if (child.material) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.45;
            if (child.material.color) {
              child.material.color.setHex(0xffff00); // Dynamic Yellow move preview
            }
          }
        });
      }

      return obj;
    }

    reset() {
      if (this.selectedElement) {
        this.restoreOriginal(this.selectedElement);
      }

      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        this.disposeObject(this.previewShape);
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

    disposeObject(object) {
      if (!object) return;
      object.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
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
        input.style.cssText = 'cursor: pointer; width: 16px; height: 16px; accent-color: #00e676;';
        input.onchange = (e) => callback(e.target.checked);

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
            this.restoreOriginal(this.selectedElement);
          } else if (!checked && oldCopy) {
            // Switched to Move mode -> ghost original visual
            this.ghostOriginal(this.selectedElement);
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

  ghostOriginal(el) {
      if (!el || !el.threejsObject) return;
      el.threejsObject.traverse(child => {
        if (child.material) {
          if (!child.userData.originalMaterial) {
            child.userData.originalMaterial = child.material;
          }
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.25;
          if (child.material.color) {
            child.material.color.setHex(0x888888); // Translucent Grey Ghost
          }
        }
      });
    }

  restoreOriginal(el) {
      if (!el || !el.threejsObject) return;
      el.threejsObject.traverse(child => {
        if (child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial;
          delete child.userData.originalMaterial;
        }
      });
      el.threejsObject.visible = true;
    }
}