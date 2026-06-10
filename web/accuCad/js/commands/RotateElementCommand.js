class RotateElementCommand {
    constructor(baseController) {
      this.base = baseController;
      this.selectedElement = null;
      
      this.pivotPoint = null;        // Point 1 (Pivot)
      this.startReferencePoint = null; // Point 2 (Reference Start Angle)
      
      this.originalState = null;
      this.previewShape = null;
      this.rotationGuidesGroup = null;
      
      this.state = 1; // 1 = Identify Element, 4 = Define Pivot, 3 = Define Start Reference, 2 = Define End Target (Rotating)
      this.allowSelfSnap = false;
      this.hoveredElement = null;

      // Settings toggles
      this.makeCopy = false;
      this.useDifferentStartPoint = false;
      this.excludeGlobalSettings = true;
      this.hasPushedContextState = false;
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
            // Transition to State 4: User must define an arbitrary center of rotation (Pivot)
            this.state = 4;
          } else {
            // Default 1-click Rotate: Pivot is center of element, reference is picked point
            const center = target.center || target.centerPoint || anchor.slice();
            this.pivotPoint = Array.isArray(center) ? center.slice() : anchor.slice();
            this.startReferencePoint = anchor.slice();
            this.state = 2; // Begin rotating immediately

            if (this.base.accuDrawLogic) {
              this.base.accuDrawLogic.pushContextState();
              this.hasPushedContextState = true;

              // Compute custom stable 3D rotation plane from P1 and P2
              const P1 = new THREE.Vector3(...this.pivotPoint);
              const P2 = new THREE.Vector3(...this.startReferencePoint);

              const xAxis = P2.clone().sub(P1).normalize();
              const currentNormal = new THREE.Vector3(...this.base.rotationMatrix[2]);
              let zAxis = new THREE.Vector3().crossVectors(xAxis, currentNormal);
              if (zAxis.length() < 1e-6) {
                zAxis = currentNormal.clone();
              } else {
                zAxis.normalize();
              }
              const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

              const localRotationMatrix = [
                [xAxis.x, xAxis.y, xAxis.z],
                [yAxis.x, yAxis.y, yAxis.z],
                [zAxis.x, zAxis.y, zAxis.z]
              ];

              this.base.accuDrawLogic.setRotation(localRotationMatrix);
              this.base.accuDrawLogic.setMode('polar', 'angle'); // Direct preferred focus into 'angle' field
              
              if (this.base.accuDraw) {
                this.base.accuDraw.setRotationAnimated(localRotationMatrix, 0.3);
              }
            }

            if (!this.makeCopy) {
              ElementOperations.ghostOriginal(this.selectedElement);
            }

            // Set AccuDraw origin to Pivot Point
            this.base.setOrigin(this.pivotPoint.slice());
          }

          if (typeof TentativePointHandler !== 'undefined') {
            TentativePointHandler._clearTentativePoint(this.base);
          }
        }
      } else if (this.state === 4) {
        // Defining custom Pivot Point
        this.pivotPoint = data.point ? data.point.slice() : null;
        if (this.pivotPoint) {
          this.state = 3; // Now define reference start angle

          if (this.base.accuDrawLogic) {
            this.base.accuDrawLogic.pushContextState();
            this.hasPushedContextState = true;
            this.base.accuDrawLogic.setMode('polar', 'angle');
          }

          this.base.setOrigin(this.pivotPoint.slice());
        }
      } else if (this.state === 3) {
        // Defining reference start angle Point
        this.startReferencePoint = data.point ? data.point.slice() : null;
        if (this.startReferencePoint) {
          this.state = 2; // Begin rotating

          if (!this.makeCopy) {
            ElementOperations.ghostOriginal(this.selectedElement);
          }

          // Compute custom 3D rotation plane from P1 and P2
          const P1 = new THREE.Vector3(...this.pivotPoint);
          const P2 = new THREE.Vector3(...this.startReferencePoint);

          const xAxis = P2.clone().sub(P1).normalize();
          const currentNormal = new THREE.Vector3(...this.base.rotationMatrix[2]);
          let zAxis = new THREE.Vector3().crossVectors(xAxis, currentNormal);
          if (zAxis.length() < 1e-6) {
            zAxis = currentNormal.clone();
          } else {
            zAxis.normalize();
          }
          const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

          const localRotationMatrix = [
            [xAxis.x, xAxis.y, xAxis.z],
            [yAxis.x, yAxis.y, yAxis.z],
            [zAxis.x, zAxis.y, zAxis.z]
          ];

          if (this.base.accuDrawLogic) {
            this.base.accuDrawLogic.setRotation(localRotationMatrix);
            this.base.accuDrawLogic.setMode('polar', 'angle'); // Direct preferred focus into 'angle' field
          }
          if (this.base.accuDraw) {
            this.base.accuDraw.setRotationAnimated(localRotationMatrix, 0.3);
          }

          // Leave AccuDraw compass at the Pivot point
          this.base.setOrigin(this.pivotPoint.slice());
        }
      } else if (this.state === 2) {
        if (this.selectedElement && this.pivotPoint && this.startReferencePoint && data.point) {
          const endTargetPoint = data.point.slice();

          if (this.makeCopy) {
            const clone = this.cloneElementWithRotation(
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

              // UPDATE SELECTOR REFERENCE: Subsequent copies/rotations offset from this newly dropped clone
              this.selectedElement = clone;
            }
          } else {
            // Restore original styles before permanent rotation update
            ElementOperations.restoreOriginal(this.selectedElement);
            
            // Apply translation vector displacement permanently
            this.applyRotation(
              this.selectedElement,
              this.pivotPoint,
              this.startReferencePoint,
              endTargetPoint
            );
            ElementOperations.rebuildPermanentVisual(this.base, this.selectedElement);
          }

          // Set AccuDraw origin back to the pivot point
          this.base.setOrigin(this.pivotPoint.slice());

          // CONTINUOUS ACCEPTS: Prepare the element for the next rotation step
          // Last accepted angle becomes the reference start point
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

    

    applyRotation(el, pivot, start, end) {
      const P1 = new THREE.Vector3(...pivot);
      const P2 = new THREE.Vector3(...start);
      const P3 = new THREE.Vector3(...end);

      const xAxis = P2.clone().sub(P1).normalize();
      const currentNormal = new THREE.Vector3(...this.base.rotationMatrix[2]);
      let zAxis = new THREE.Vector3().crossVectors(xAxis, currentNormal);
      if (zAxis.length() < 1e-6) {
        zAxis = currentNormal.clone();
      } else {
        zAxis.normalize();
      }
      const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

      const v2 = P3.clone().sub(P1);
      const lx = v2.dot(xAxis);
      const ly = v2.dot(yAxis);
      const theta = Math.atan2(ly, lx);

      const rotatePt = (pt) => {
        const q = new THREE.Vector3(...pt);
        const offset = q.clone().sub(P1);
        const dx = offset.dot(xAxis);
        const dy = offset.dot(yAxis);
        const dz = offset.dot(zAxis);

        const dx_ = dx * Math.cos(theta) - dy * Math.sin(theta);
        const dy_ = dx * Math.sin(theta) + dy * Math.cos(theta);

        return new THREE.Vector3()
          .addScaledVector(xAxis, dx_)
          .addScaledVector(yAxis, dy_)
          .addScaledVector(zAxis, dz)
          .add(P1)
          .toArray();
      };

      if (el.type === 'path') {
        el.vertices.forEach(v => {
          v.point = rotatePt(v.point);
        });
        el.points = el.vertices.map(v => [...v.point]);
        el.updateDimensions();
      } else if (el.type === 'capsule') {
        el.start = rotatePt(el.start);
        el.end = rotatePt(el.end);
        el.points = [el.start.slice(), el.end.slice()];
        el.updateDimensions();
      } else if (el.type === 'rectangle') {
        el.start = rotatePt(el.start);
        el.end = rotatePt(el.end);
        
        if (!el.rotationMatrix) {
          el.rotationMatrix = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
          ];
        }
        
        const rotateVec = (v) => {
          const vec = new THREE.Vector3(...v);
          const dx = vec.dot(xAxis);
          const dy = vec.dot(yAxis);
          const dz = vec.dot(zAxis);
          const dx_ = dx * Math.cos(theta) - dy * Math.sin(theta);
          const dy_ = dx * Math.sin(theta) + dy * Math.cos(theta);
          return new THREE.Vector3()
            .addScaledVector(xAxis, dx_)
            .addScaledVector(yAxis, dy_)
            .addScaledVector(zAxis, dz)
            .toArray();
        };
        el.rotationMatrix = el.rotationMatrix.map(row => rotateVec(row));
        
        el.updateDimensions();
      } else if (el.type === 'arc') {
        el.startPt = rotatePt(el.startPt);
        el.center = rotatePt(el.center);
        el.endPt = rotatePt(el.endPt);
        el.updateDimensions();
      } else if (el.type === 'curve') {
        el.controlPoints.forEach((p, idx) => {
          el.controlPoints[idx] = rotatePt(p);
        });
        el.points = el.controlPoints;
        el.updateDimensions();
      } else if (el.type === 'circle') {
        el.points.forEach((p, idx) => {
          el.points[idx] = rotatePt(p);
        });
      }
    }

    

    

    

    

    updatePreview(endPoint) {
      if (this.previewShape) {
        this.base.view.scene.remove(this.previewShape);
        ElementOperations.disposeObject(this.previewShape);
        this.previewShape = null;
      }

      if (this.rotationGuidesGroup) {
        this.base.view.scene.remove(this.rotationGuidesGroup);
        ElementOperations.disposeObject(this.rotationGuidesGroup);
        this.rotationGuidesGroup = null;
      }

      const clone = this.cloneElementWithRotation(
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

      // Draw active rotation guides
      const guides = new THREE.Group();
      guides.userData.isPickable = false;
      this.rotationGuidesGroup = guides;

      const compassSize = this.base.accuDraw?.options?.size || 1.0;
      const ballRadius = compassSize * 0.05;

      const pVec = new THREE.Vector3(...this.pivotPoint);
      const sVec = new THREE.Vector3(...this.startReferencePoint);
      const eVec = new THREE.Vector3(...endPoint);

      const u = new THREE.Vector3().subVectors(sVec, pVec);
      const radius = u.length();

      if (radius > 1e-6) {
        u.normalize();

        const currentNormal = new THREE.Vector3(...this.base.rotationMatrix[2]);
        let zAxis = new THREE.Vector3().crossVectors(u, currentNormal);
        if (zAxis.length() < 1e-6) {
          zAxis = currentNormal.clone();
        } else {
          zAxis.normalize();
        }
        const v = new THREE.Vector3().crossVectors(zAxis, u).normalize();

        const offsetE = new THREE.Vector3().subVectors(eVec, pVec);
        const localX = offsetE.dot(u);
        const localY = offsetE.dot(v);

        const angle = Math.atan2(localY, localX);

        const projectedEnd = pVec.clone()
          .add(u.clone().multiplyScalar(Math.cos(angle) * radius))
          .add(v.clone().multiplyScalar(Math.sin(angle) * radius));

        // Pivot Ball (Blue)
        const pivotGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
        const pivotMat = new THREE.MeshBasicMaterial({ color: 0x0088ff, depthTest: false });
        const pivotMesh = new THREE.Mesh(pivotGeo, pivotMat);
        pivotMesh.position.copy(pVec);
        pivotMesh.renderOrder = 99999;
        guides.add(pivotMesh);

        // Start reference ball (Green)
        const startGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
        const startMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, depthTest: false });
        const startMesh = new THREE.Mesh(startGeo, startMat);
        startMesh.position.copy(sVec);
        startMesh.renderOrder = 99999;
        guides.add(startMesh);

        // Rotation target ball (Yellow)
        const endGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
        const endMat = new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false });
        const endMesh = new THREE.Mesh(endGeo, endMat);
        endMesh.position.copy(projectedEnd);
        endMesh.renderOrder = 99999;
        guides.add(endMesh);

        // Radial Line 1: Pivot to Start reference
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

        // Radial Line 2: Pivot to Projected end point
        const r2Points = [pVec.x, pVec.y, pVec.z, projectedEnd.x, projectedEnd.y, projectedEnd.z];
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

        // Dashed Arc: Path of rotation
        const arcPoints = [];
        const segments = 40;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const theta_val = angle * t;
          const pt = pVec.clone()
            .add(u.clone().multiplyScalar(Math.cos(theta_val) * radius))
            .add(v.clone().multiplyScalar(Math.sin(theta_val) * radius));
          arcPoints.push(pt.x, pt.y, pt.z);
        }

        const arcGeometry = new LineGeometry();
        arcGeometry.setPositions(arcPoints);
        const arcMaterial = new LineMaterial({
          color: 0xffff00,
          linewidth: 3,
          dashed: true,
          dashScale: 5,
          dashSize: 0.12,
          gapSize: 0.08,
          resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
          depthTest: false
        });
        const arcLine = new Line2(arcGeometry, arcMaterial);
        arcLine.computeLineDistances();
        arcLine.renderOrder = 99999;
        guides.add(arcLine);
      }

      this.base.view.scene.add(guides);
    }

    cloneElementWithRotation(el, pivot, start, end) {
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
        this.applyRotation(cl, pivot, start, end);
      }
      return cl;
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

      if (this.rotationGuidesGroup) {
        this.base.view.scene.remove(this.rotationGuidesGroup);
        ElementOperations.disposeObject(this.rotationGuidesGroup);
        this.rotationGuidesGroup = null;
      }

      if (this.hoveredElement) {
        HighlightUtilities.removeHighlight(this.hoveredElement);
        this.hoveredElement = null;
      }

      if (this.hasPushedContextState && this.base.accuDrawLogic) {
        this.base.accuDrawLogic.popContextState();
        this.hasPushedContextState = false;
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

    

    
  
  updateState3Guides(mousePoint) {
      if (this.rotationGuidesGroup) {
        this.base.view.scene.remove(this.rotationGuidesGroup);
        ElementOperations.disposeObject(this.rotationGuidesGroup);
        this.rotationGuidesGroup = null;
      }

      const guides = new THREE.Group();
      guides.userData.isPickable = false;
      this.rotationGuidesGroup = guides;

      const compassSize = this.base.accuDraw?.options?.size || 1.0;
      const ballRadius = compassSize * 0.05;

      // Pivot Ball (Blue)
      const pivotGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
      const pivotMat = new THREE.MeshBasicMaterial({ color: 0x0088ff, depthTest: false, transparent: true, opacity: 0.85 });
      const pivotMesh = new THREE.Mesh(pivotGeo, pivotMat);
      pivotMesh.position.fromArray(this.pivotPoint);
      pivotMesh.renderOrder = 99999;
      guides.add(pivotMesh);

      // Current dynamic guide line from pivot to mouse
      const pVec = new THREE.Vector3(...this.pivotPoint);
      const eVec = new THREE.Vector3(...mousePoint);
      const rPoints = [pVec.x, pVec.y, pVec.z, eVec.x, eVec.y, eVec.z];
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

      // Temporary cursor point ball (Green)
      const endGeo = new THREE.SphereGeometry(ballRadius, 16, 16);
      const endMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, depthTest: false });
      const endMesh = new THREE.Mesh(endGeo, endMat);
      endMesh.position.copy(eVec);
      endMesh.renderOrder = 99999;
      guides.add(endMesh);

      this.base.view.scene.add(guides);
    }

  getCommandSettings() {
      return [
        {
          id: 'makeCopy',
          label: 'Make Copy',
          type: 'checkbox',
          value: this.makeCopy,
          callback: (checked) => {
            const oldCopy = this.makeCopy;
            this.makeCopy = checked;

            if (this.state === 2 && this.selectedElement) {
              if (checked && !oldCopy) {
                ElementOperations.restoreOriginal(this.selectedElement);
              } else if (!checked && oldCopy) {
                ElementOperations.ghostOriginal(this.selectedElement);
              }
            }
          }
        },
        {
          id: 'useDifferentStartPoint',
          label: 'Arbitrary Pivot',
          type: 'checkbox',
          value: this.useDifferentStartPoint,
          callback: (checked) => {
            this.useDifferentStartPoint = checked;
            this.reset(); // Reset command states on mode switches
          }
        }
      ];
    }
}