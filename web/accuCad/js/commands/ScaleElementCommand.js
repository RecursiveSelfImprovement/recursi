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
          this.originalState = this.backupState(target);

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
            this.ghostOriginal(this.selectedElement);
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
              this.rebuildPermanentVisual(clone);
              this.selectedElement = clone;
            }
          } else {
            this.restoreOriginal(this.selectedElement);
            this.applyScale(
              this.selectedElement,
              this.pivotPoint,
              this.startReferencePoint,
              endTargetPoint
            );
            this.rebuildPermanentVisual(this.selectedElement);
          }

          // Set AccuDraw origin back to pivot
          this.base.setOrigin(this.pivotPoint.slice());

          // Reset to state 3 with the new scaled element
          this.startReferencePoint = endTargetPoint;
          this.originalState = this.backupState(this.selectedElement);

          if (!this.makeCopy) {
            this.ghostOriginal(this.selectedElement);
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
        this.disposeObject(this.scaleGuidesGroup);
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
        this.disposeObject(this.previewShape);
        this.previewShape = null;
      }

      if (this.scaleGuidesGroup) {
        this.base.view.scene.remove(this.scaleGuidesGroup);
        this.disposeObject(this.scaleGuidesGroup);
        this.scaleGuidesGroup = null;
      }

      const clone = this.cloneElementWithScale(
        this.selectedElement,
        this.pivotPoint,
        this.startReferencePoint,
        endPoint
      );
      if (!clone) return;

      this.previewShape = this.renderPreviewObject(clone);
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
              child.material.color.setHex(0xffff00); // Dynamic Yellow scale preview
            }
          }
        });
      }

      return obj;
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

    reset() {
      if (this.selectedElement) {
        this.restoreOriginal(this.selectedElement);
      }

      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        this.disposeObject(this.previewShape);
        this.previewShape = null;
      }

      if (this.scaleGuidesGroup) {
        this.base.view.scene.remove(this.scaleGuidesGroup);
        this.disposeObject(this.scaleGuidesGroup);
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

        if (this.state === 2 && this.selectedElement) {
          if (checked && !oldCopy) {
            this.restoreOriginal(this.selectedElement);
          } else if (!checked && oldCopy) {
            this.ghostOriginal(this.selectedElement);
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