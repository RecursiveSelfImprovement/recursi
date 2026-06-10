class ScaleElementCommand {
    constructor(baseController) {
      this.base = baseController;
      this.selectedElement = null;
      
      this.pivotPoint = null;        // Point 1 (Pivot)
      this.startReferencePoint = null; // Point 2 (Reference Start)
      
      this.originalState = null;
      this.previewShape = null;
      this.scaleGuidesGroup = null;
      
      this.state = 1; // 1 = Identify Element, 4 = Define Pivot, 3 = Define Start Reference, 2 = Define End Target (Scaling)
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
      if (event && event.button !== 0) return; // Only left clicks

      if (this.state === 1) {
        let target = null;
        let anchor = null;

        // Capture tentative point if active
        if (this.base._tentativeOriginalPoint) {
          target = this.base._highlightedElement;
          anchor = this.base._tentativeOriginalPoint.slice();
        } else {
          target = this.hoveredElement;
          anchor = data.point ? data.point.slice() : null;
        }

        if (target && anchor) {
          this.selectedElement = target;
          this.originalState = ElementOperations.backupState(target);

          if (this.useDifferentStartPoint) {
            this.state = 4; // Define custom Pivot Point
          } else {
            this.pivotPoint = anchor;
            this.state = 3; // Wait for reference start point
            this.base.setOrigin(this.pivotPoint.slice());
          }

          if (typeof TentativePointHandler !== 'undefined') {
            TentativePointHandler._clearTentativePoint(this.base);
          }
        }
      } else if (this.state === 4) {
        this.pivotPoint = data.point ? data.point.slice() : null;
        if (this.pivotPoint) {
          this.state = 3; // Now define reference start Point
          this.base.setOrigin(this.pivotPoint.slice());
        }
      } else if (this.state === 3) {
        this.startReferencePoint = data.point ? data.point.slice() : null;
        if (this.startReferencePoint) {
          this.state = 2; // Begin scaling

          if (!this.makeCopy) {
            ElementOperations.ghostOriginal(this.selectedElement);
          }

          // Keep compass at pivotPoint
          this.base.setOrigin(this.pivotPoint.slice());
        }
      } else if (this.state === 2) {
        if (this.selectedElement && this.pivotPoint && this.startReferencePoint && data.point) {
          const endTargetPoint = data.point.slice();

          if (this.makeCopy) {
            const clone = this.cloneElementWithScale(
              this.selectedElement,
              this.pivotPoint,
              this.startReferencePoint,
              endTargetPoint
            );
            if (clone) {
              clone.id = Math.random().toString(36).substr(2, 9);
              clone.isTemporary = false;
              this.base.cadElements.push(clone);
              ElementOperations.rebuildPermanentVisual(this.base, clone);
              this.selectedElement = clone;
            }
          } else {
            ElementOperations.restoreOriginal(this.selectedElement);
            this.applyScale(
              this.selectedElement,
              this.pivotPoint,
              this.startReferencePoint,
              endTargetPoint
            );
            ElementOperations.rebuildPermanentVisual(this.base, this.selectedElement);
          }

          // Set AccuDraw origin back to pivot
          this.base.setOrigin(this.pivotPoint.slice());

          // Reset to state 3 with the new scaled element
          this.startReferencePoint = endTargetPoint;
          this.originalState = ElementOperations.backupState(this.selectedElement);

          if (!this.makeCopy) {
            ElementOperations.ghostOriginal(this.selectedElement);
          }
        }
      }
    }

    onMouseMove(data) {
      if (this.state === 1 || this.state === 4) {
        this.handleHover(data);
      } else if (this.state === 3) {
        this.handleHover(data);
        if (this.pivotPoint && data.point) {
          this.updateState3Guides(data.point);
        }
      } else if (this.state === 2) {
        if (this.selectedElement && this.pivotPoint && this.startReferencePoint && data.point) {
          this.updatePreview(data.point.slice());
        }
      }
    }

    updateState3Guides(mousePoint) {
      if (this.scaleGuidesGroup) {
        this.base.view.scene.remove(this.scaleGuidesGroup);
        ElementOperations.disposeObject(this.scaleGuidesGroup);
        this.scaleGuidesGroup = null;
      }

      const guides = new THREE.Group();
      guides.userData.isPickable = false;
      this.scaleGuidesGroup = guides;

      const compassSize = this.base.accuDraw?.options?.size || 1.0;
      const ballRadius = compassSize * 0.05;

      // Pivot Ball (Blue)
      const pivotGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
      const pivotMat = new THREE.MeshBasicMaterial({ color: 0x0088ff, depthTest: false });
      const pivotMesh = new THREE.Mesh(pivotGeo, pivotMat);
      pivotMesh.position.fromArray(this.pivotPoint);
      pivotMesh.renderOrder = 99999;
      guides.add(pivotMesh);

      // Line from pivot to mouse
      const pVec = new THREE.Vector3(...this.pivotPoint);
      const mVec = new THREE.Vector3(...mousePoint);
      const rPoints = [pVec.x, pVec.y, pVec.z, mVec.x, mVec.y, mVec.z];
      const rGeometry = new LineGeometry();
      rGeometry.setPositions(rPoints);
      const rMaterial = new LineMaterial({
        color: 0x00ff66,
        linewidth: 2,
        dashed: true,
        dashScale: 5,
        dashSize: 0.1,
        gapSize: 0.08,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        depthTest: false
      });
      const rLine = new Line2(rGeometry, rMaterial);
      rLine.computeLineDistances();
      rLine.renderOrder = 99999;
      guides.add(rLine);

      // Start Reference Ball (Green)
      const startGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
      const startMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, depthTest: false });
      const startMesh = new THREE.Mesh(startGeo, startMat);
      startMesh.position.copy(mVec);
      startMesh.renderOrder = 99999;
      guides.add(startMesh);

      this.base.view.scene.add(guides);
    }

    updatePreview(endPoint) {
      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        ElementOperations.disposeObject(this.previewShape);
        this.previewShape = null;
      }

      if (this.scaleGuidesGroup) {
        this.base.view.scene.remove(this.scaleGuidesGroup);
        ElementOperations.disposeObject(this.scaleGuidesGroup);
        this.scaleGuidesGroup = null;
      }

      const clone = this.cloneElementWithScale(
        this.selectedElement,
        this.pivotPoint,
        this.startReferencePoint,
        endPoint
      );
      if (!clone) return;

      this.previewShape = ElementOperations.renderPreviewObject(this.base, clone);
      if (this.previewShape) {
        this.base.view.scene.add(this.previewShape);
      }

      // Draw active scale guides
      const guides = new THREE.Group();
      guides.userData.isPickable = false;
      this.scaleGuidesGroup = guides;

      const compassSize = this.base.accuDraw?.options?.size || 1.0;
      const ballRadius = compassSize * 0.05;

      const pVec = new THREE.Vector3(...this.pivotPoint);
      const sVec = new THREE.Vector3(...this.startReferencePoint);
      const eVec = new THREE.Vector3(...endPoint);

      // Pivot Ball (Blue)
      const pivotGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
      const pivotMat = new THREE.MeshBasicMaterial({ color: 0x0088ff, depthTest: false });
      const pivotMesh = new THREE.Mesh(pivotGeo, pivotMat);
      pivotMesh.position.copy(pVec);
      pivotMesh.renderOrder = 99999;
      guides.add(pivotMesh);

      // Reference start ball (Green)
      const startGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
      const startMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, depthTest: false });
      const startMesh = new THREE.Mesh(startGeo, startMat);
      startMesh.position.copy(sVec);
      startMesh.renderOrder = 99999;
      guides.add(startMesh);

      // Scale target ball (Yellow)
      const endGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
      const endMat = new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false });
      const endMesh = new THREE.Mesh(endGeo, endMat);
      endMesh.position.copy(eVec);
      endMesh.renderOrder = 99999;
      guides.add(endMesh);

      // Dashed Line 1: Pivot to reference start
      const r1Points = [pVec.x, pVec.y, pVec.z, sVec.x, sVec.y, sVec.z];
      const r1Geometry = new LineGeometry();
      r1Geometry.setPositions(r1Points);
      const r1Material = new LineMaterial({
        color: 0x00ff66,
        linewidth: 2,
        dashed: true,
        dashScale: 5,
        dashSize: 0.1,
        gapSize: 0.08,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        depthTest: false
      });
      const r1Line = new Line2(r1Geometry, r1Material);
      r1Line.computeLineDistances();
      r1Line.renderOrder = 99999;
      guides.add(r1Line);

      // Dashed Line 2: Pivot to target scale point
      const r2Points = [pVec.x, pVec.y, pVec.z, eVec.x, eVec.y, eVec.z];
      const r2Geometry = new LineGeometry();
      r2Geometry.setPositions(r2Points);
      const r2Material = new LineMaterial({
        color: 0xffff00,
        linewidth: 2,
        dashed: true,
        dashScale: 5,
        dashSize: 0.1,
        gapSize: 0.08,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        depthTest: false
      });
      const r2Line = new Line2(r2Geometry, r2Material);
      r2Line.computeLineDistances();
      r2Line.renderOrder = 99999;
      guides.add(r2Line);

      this.base.view.scene.add(guides);
    }

    cloneElementWithScale(el, pivot, start, end) {
      let cl = null;
      if (el.type === 'path') {
        cl = PathElement.fromJSON(el.toJSON());
      } else if (el.type === 'capsule') {
        cl = CapsuleElement.fromJSON(el.toJSON());
      } else if (el.type === 'rectangle') {
        cl = RectangleElement.fromJSON(el.toJSON());
      } else if (el.type === 'arc') {
        cl = ArcElement.fromJSON(el.toJSON());
      } else if (el.type === 'curve') {
        cl = CurveElement.fromJSON(el.toJSON());
      } else if (el.type === 'circle') {
        cl = {
          type: 'circle',
          id: el.id,
          color: el.color,
          points: el.points.map(p => [...p])
        };
      }
      if (cl) {
        this.applyScale(cl, pivot, start, end);
      }
      return cl;
    }

    applyScale(el, pivot, start, end) {
      const pVec = new THREE.Vector3(...pivot);
      const sVec = new THREE.Vector3(...start);
      const eVec = new THREE.Vector3(...end);

      const dStart = pVec.distanceTo(sVec);
      const dEnd = pVec.distanceTo(eVec);

      if (dStart < 1e-6) return;
      const s = dEnd / dStart;

      const localX = new THREE.Vector3(...this.base.rotationMatrix[0]);
      const localY = new THREE.Vector3(...this.base.rotationMatrix[1]);
      const localZ = new THREE.Vector3(...this.base.rotationMatrix[2]);

      const scalePt = (pt) => {
        const q = new THREE.Vector3(...pt);
        const offset = q.clone().sub(pVec);

        const px = offset.dot(localX);
        const py = offset.dot(localY);
        const pz = offset.dot(localZ);

        const scaledOffset = new THREE.Vector3()
          .addScaledVector(localX, px * s)
          .addScaledVector(localY, py * s)
          .addScaledVector(localZ, pz * s);

        return pVec.clone().add(scaledOffset).toArray();
      };

      if (el.type === 'path') {
        el.vertices.forEach(v => {
          v.point = scalePt(v.point);
        });
        el.points = el.vertices.map(v => [...v.point]);
        el.updateDimensions();
      } else if (el.type === 'capsule') {
        el.start = scalePt(el.start);
        el.end = scalePt(el.end);
        el.radius *= s;
        el.points = [el.start.slice(), el.end.slice()];
        el.updateDimensions();
      } else if (el.type === 'rectangle') {
        el.start = scalePt(el.start);
        el.end = scalePt(el.end);
        el.updateDimensions();
      } else if (el.type === 'arc') {
        el.startPt = scalePt(el.startPt);
        el.center = scalePt(el.center);
        el.endPt = scalePt(el.endPt);
        el.updateDimensions();
      } else if (el.type === 'curve') {
        el.controlPoints.forEach((p, idx) => {
          el.controlPoints[idx] = scalePt(p);
        });
        el.points = el.controlPoints;
        el.updateDimensions();
      } else if (el.type === 'circle') {
        el.points.forEach((p, idx) => {
          el.points[idx] = scalePt(p);
        });
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

    reset() {
      if (this.selectedElement) {
        ElementOperations.restoreOriginal(this.selectedElement);
      }

      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        ElementOperations.disposeObject(this.previewShape);
        this.previewShape = null;
      }

      if (this.scaleGuidesGroup) {
        this.base.view.scene.remove(this.scaleGuidesGroup);
        ElementOperations.disposeObject(this.scaleGuidesGroup);
        this.scaleGuidesGroup = null;
      }

      if (this.hoveredElement) {
        HighlightUtilities.removeHighlight(this.hoveredElement);
        this.hoveredElement = null;
      }

      this.selectedElement = null;
      this.pivotPoint = null;
      this.startReferencePoint = null;
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

        if (this.state === 2 && this.selectedElement) {
          if (checked && !oldCopy) {
            ElementOperations.restoreOriginal(this.selectedElement);
          } else if (!checked && oldCopy) {
            ElementOperations.ghostOriginal(this.selectedElement);
          }
        }
      });

      const anchorCb = createCheckbox('Arbitrary Pivot', this.useDifferentStartPoint, (checked) => {
        this.useDifferentStartPoint = checked;
        this.reset();
      });

      container.appendChild(copyCb);
      container.appendChild(anchorCb);
    }
  }