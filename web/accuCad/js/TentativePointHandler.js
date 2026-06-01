
class TentativePointHandler {
  static initStatics() {
    if (this._staticsInitialized) return;
    this._nonCadMeshEdgeGeometries = new Map();
    this._staticsInitialized = true;
  }

  static handleTentativePoint(controller, event) {
    this.initStatics();
    const canvas = controller.domElement;
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) return;

    const mouse = new THREE.Vector2(
      ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
      -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1
    );

    const camera = controller.view.camera;
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.2;
    raycaster.setFromCamera(mouse, camera);

    // 1. Standard Raycast (Works great for Meshes/Solids)
    const candidateObjects = this._getSnappableThreeObjects(controller);
    const intersections = raycaster.intersectObjects(candidateObjects, true);

    let ownerElement = null;

    if (intersections.length > 0) {
      // We hit something standard (likely a mesh)
      const hitObject = intersections[0].object;
      ownerElement = this._findOwnerElement(controller, hitObject);
    }

    // 2. Fallback: Screen-Space Wireframe Check
    // If standard raycast failed (common for thin lines/paths), check if we are visually
    // close to the line segments on screen. This is a "Thick Pick".
    if (!ownerElement) {
      ownerElement = this._findClosestElementByScreenSegments(
        controller,
        event.clientX,
        event.clientY,
        10 // 10 pixel tolerance for "touching" the line
      );
    }

    // 3. Resolve Snap Point
    let snapPoint = null;

    if (ownerElement) {
      // Highlighting logic: Cyan for "Found Element"
      this._updateHighlighting(controller, ownerElement, 0x00ffff);

      // Find closest vertex on THIS element only
      const result = this._findClosestVertexScreenSpace(
        controller,
        ownerElement,
        event.clientX,
        event.clientY
      );

      if (result) {
        snapPoint = result.point;
      } else if (
        intersections.length > 0 &&
        ownerElement ===
          this._findOwnerElement(controller, intersections[0].object)
      ) {
        // If we had a real intersection on a mesh but no vertex close, snap to surface
        snapPoint = intersections[0].point;
      }
    }

    // 4. Apply Result
    if (ownerElement && snapPoint) {
      controller._tentativeOriginalPoint = snapPoint;
    } else {
      this._updateHighlighting(controller, null);
      controller._tentativeOriginalPoint = null;
    }

    this._updateTentativeMarker(controller, controller._tentativeOriginalPoint);
    controller.refreshMousePosition();
  }

  // NEW: Helper to find elements by checking distance to their line segments in 2D

  static _collectCandidateObjects(controller) {
    const candidateObjects = [];
    const activeCommand = controller.activeCommand;

    controller.view.scene.traverse((child) => {
      // Basic visibility and pickability check
      if (
        (child.isMesh || child.isLine) &&
        child.userData.isPickable !== false
      ) {
        // --- NEW LOGIC for Self-Snapping ---
        // Check if this child belongs to the tempElement of the active command.
        if (
          activeCommand &&
          activeCommand.tempElement &&
          activeCommand.tempElement.threejsObject
        ) {
          let isPartOfTempElement = false;
          activeCommand.tempElement.threejsObject.traverse((c) => {
            if (c === child) isPartOfTempElement = true;
          });

          // If it is part of the temp element and self-snapping is disallowed, skip it.
          if (isPartOfTempElement && activeCommand.allowSelfSnap === false) {
            return; // Skips this child, doesn't add it to candidates.
          }
        }
        candidateObjects.push(child);
      }
    });
    return candidateObjects;
  }

  static _processIntersection(controller, intersection, pickedObject) {
    let pickedElement = null;
    let tentativePoint = null;

    const cadElements = controller.cadElements || [];

    for (const el of cadElements) {
      if (!el.threejsObject) continue;

      let found = false;
      el.threejsObject.traverse((child) => {
        if (child === pickedObject) found = true;
      });
      if (found) {
        pickedElement = el;
        break;
      }
    }

    if (
      pickedElement &&
      pickedElement.points &&
      pickedElement.points.length > 0
    ) {
      let closestDistance = Infinity;
      const closestVertex = new THREE.Vector3();
      const tempVertex = new THREE.Vector3();

      pickedElement.points.forEach((pt) => {
        tempVertex.set(pt[0], pt[1], pt[2]);
        const distance = tempVertex.distanceTo(intersection.point);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestVertex.copy(tempVertex);
        }
      });

      tentativePoint = [closestVertex.x, closestVertex.y, closestVertex.z];
    } else {
      pickedElement = {
        threejsObject: pickedObject,
        type: pickedObject.type.toLowerCase(),
      };

      if (pickedObject.isLine) {
        const geometry = pickedObject.geometry;
        if (
          geometry &&
          geometry.isBufferGeometry &&
          geometry.attributes.position
        ) {
          const positions = geometry.attributes.position.array;
          let closestDistance = Infinity;
          const closestVertex = new THREE.Vector3();
          const tempVertex = new THREE.Vector3();

          for (let i = 0; i < positions.length; i += 3) {
            tempVertex.set(positions[i], positions[i + 1], positions[i + 2]);
            tempVertex.applyMatrix4(pickedObject.matrixWorld);
            const distance = tempVertex.distanceTo(intersection.point);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestVertex.copy(tempVertex);
            }
          }
          tentativePoint = [closestVertex.x, closestVertex.y, closestVertex.z];
        } else {
          tentativePoint = [
            intersection.point.x,
            intersection.point.y,
            intersection.point.z,
          ];
        }
      } else if (pickedObject.isMesh) {
        tentativePoint = null;
      } else {
        tentativePoint = [
          intersection.point.x,
          intersection.point.y,
          intersection.point.z,
        ];
      }
    }

    return [pickedElement, tentativePoint];
  }

  static _findClosestPointOnLineGeometry(lineGeometry, point) {
    if (!lineGeometry || !lineGeometry.attributes.position) return null;

    const positions = lineGeometry.attributes.position.array;
    let minDistance = Infinity;
    let closestPoint = null;

    for (let i = 0; i < positions.length - 3; i += 6) {
      const p1 = new THREE.Vector3(
        positions[i],
        positions[i + 1],
        positions[i + 2]
      );
      const p2 = new THREE.Vector3(
        positions[i + 3],
        positions[i + 4],
        positions[i + 5]
      );

      const v = p2.clone().sub(p1);
      const w = point.clone().sub(p1);
      const vLengthSquared = v.dot(v);
      if (vLengthSquared === 0) continue;

      const t = Math.max(0, Math.min(1, w.dot(v) / vLengthSquared));
      const projPoint = p1.clone().add(v.clone().multiplyScalar(t));
      const distance = point.distanceTo(projPoint);

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = projPoint;
      }
    }

    return closestPoint;
  }

  static _updateHighlighting(controller, pickedElement, color = 0xffff00) {
    if (
      controller._highlightedElement &&
      controller._highlightedElement !== pickedElement
    ) {
      HighlightUtilities.removeHighlight(controller._highlightedElement);
    }

    if (pickedElement) {
      // Re-apply highlight if element changed OR color changed
      // (Simple way: just always re-apply if picked)
      HighlightUtilities.applyHighlight(pickedElement, color);
    }

    controller._highlightedElement = pickedElement;
  }

  static _updateTentativeMarker(controller, tentativePoint) {
    if (controller.tentativeMarker) {
      controller.view.scene.remove(controller.tentativeMarker);
      controller.tentativeMarker = null;
    }
    if (controller.tentativeProjectionLine) {
      controller.view.scene.remove(controller.tentativeProjectionLine);
      controller.tentativeProjectionLine = null;
    }

    if (!tentativePoint) {
      if (!controller._tentativeTimeout) {
        controller._tentativeTimeout = setTimeout(
          () => this._clearTentativePoint(controller),
          2000
        );
      }
      return;
    }

    if (controller._tentativeTimeout) {
      clearTimeout(controller._tentativeTimeout);
      controller._tentativeTimeout = null;
    }

    controller.tentativeMarker = this._createTentativeMarker(
      controller,
      tentativePoint
    );
    controller.view.scene.add(controller.tentativeMarker);

    // This is where the Z-lock projection happens, AFTER the 3D snap.
    if (controller.zPlaneLocked) {
      const planeNormal = controller.rotationMatrix[2];
      const projectedPoint = this._projectPointOntoPlane(
        tentativePoint,
        controller.origin,
        planeNormal
      );
      controller._tentativeProjectedPoint = projectedPoint; // Store the projected point
      controller.tentativeProjectionLine = this._createProjectionLine(
        tentativePoint,
        projectedPoint
      );
      controller.view.scene.add(controller.tentativeProjectionLine);
    } else {
      controller._tentativeProjectedPoint = null;
    }
  }

  static _createTentativeMarker(controller, position) {
    try {
      // 1. Determine Dimensions
      const compass = controller.originMarker || controller.accuDraw;
      let compassSize = compass?.options?.size || 1.0;
      if (compassSize < 0.001) compassSize = 1.0;

      const refDiameter = compassSize / 5;
      const unit = 0.75 * refDiameter;
      const length = unit;

      // Outer/Inner distances
      const outerDist = 1.5 * unit;
      const innerDist = length / 2 + unit * 0.1;

      const radius = compassSize / 120;
      const safeRadius = Math.max(radius, 0.001);
      const safeLength = Math.max(length, 0.001);

      // 2. Create Group
      const group = new THREE.Group();
      if (position) {
        if (typeof position.x === 'number') group.position.copy(position);
        else if (Array.isArray(position)) group.position.set(...position);
      }
      group.userData.isPickable = false;
      // Mark as active for animation loop safety
      group.userData.isActive = true;

      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const geometry = new THREE.CylinderGeometry(
        safeRadius,
        safeRadius,
        safeLength,
        8,
        1
      );

      const arms = [];

      const createArm = (axis, sign) => {
        const arm = new THREE.Mesh(geometry, material);
        arm.userData.isPickable = false;
        arm.userData.axis = axis;
        arm.userData.sign = sign;

        if (axis === 'y') {
          arm.position.y = outerDist * sign;
        } else if (axis === 'x') {
          arm.rotation.z = -Math.PI / 2;
          arm.position.x = outerDist * sign;
        } else if (axis === 'z') {
          arm.rotation.x = Math.PI / 2;
          arm.position.z = outerDist * sign;
        }
        arms.push(arm);
        return arm;
      };

      group.add(createArm('x', 1));
      group.add(createArm('x', -1));
      group.add(createArm('y', 1));
      group.add(createArm('y', -1));
      group.add(createArm('z', 1));
      group.add(createArm('z', -1));

      // 3. Orientation
      if (
        controller.rotationMatrix &&
        Array.isArray(controller.rotationMatrix)
      ) {
        const rm = controller.rotationMatrix;
        if (rm.length === 3) {
          const m = new THREE.Matrix4();
          m.makeBasis(
            new THREE.Vector3(...rm[0]),
            new THREE.Vector3(...rm[1]),
            new THREE.Vector3(...rm[2])
          );
          group.setRotationFromMatrix(m);
        }
      }

      // 4. Animation Loop
      const startTime = performance.now();

      const animate = () => {
        // Stop if group was removed from scene or marked inactive
        // Note: In first frame group.parent is null, so rely on userData.isActive
        if (!group.userData.isActive) return;
        if (group.parent === null && performance.now() - startTime > 100) {
          // If it's been 100ms and still no parent, kill it (safety)
          return;
        }

        const now = performance.now();
        const elapsed = (now - startTime) / 1000;

        // Cycle 1..0..1 (Starts Outer, goes Inner, returns Outer)
        // Cosine: 1 at 0. -1 at PI.
        // (Cos + 1) / 2 -> 1 at 0, 0 at PI.
        const cycle = (Math.cos(elapsed * 3 * Math.PI) + 1) / 2;

        // Lerp between inner and outer
        const currentDist = innerDist + (outerDist - innerDist) * cycle;

        // Uncomment to debug:
        // console.log(`[Tentative Anim] cycle: ${cycle.toFixed(2)} dist: ${currentDist.toFixed(2)}`);

        arms.forEach((arm) => {
          const axis = arm.userData.axis;
          const sign = arm.userData.sign;

          if (axis === 'x') arm.position.x = currentDist * sign;
          if (axis === 'y') arm.position.y = currentDist * sign;
          if (axis === 'z') arm.position.z = currentDist * sign;
        });

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);

      return group;
    } catch (err) {
      console.error('[TentativeMarker Error]', err);
      return new THREE.Mesh(
        new THREE.SphereGeometry(0.2),
        new THREE.MeshBasicMaterial({ color: 0xff00ff })
      );
    }
  }

  static _projectPointOntoPlane(point, planeOrigin, planeNormal) {
    const toPoint = [
      point[0] - planeOrigin[0],
      point[1] - planeOrigin[1],
      point[2] - planeOrigin[2],
    ];
    const dist =
      toPoint[0] * planeNormal[0] +
      toPoint[1] * planeNormal[1] +
      toPoint[2] * planeNormal[2];
    return [
      point[0] - dist * planeNormal[0],
      point[1] - dist * planeNormal[1],
      point[2] - dist * planeNormal[2],
    ];
  }

  static _createProjectionLine(originalPoint, projectedPoint) {
    const material = new THREE.LineBasicMaterial({
      color: 0xcccccc,
      linewidth: 1,
      opacity: 0.7,
      transparent: true,
    });
    const points = [
      new THREE.Vector3(...originalPoint),
      new THREE.Vector3(...projectedPoint),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.userData.isPickable = false;
    return line;
  }

  static _clearTentativePoint(controller, suppressRefresh = false) {
    if (controller.tentativeMarker) {
      // Stop animation
      controller.tentativeMarker.userData.isActive = false;
      controller.view.scene.remove(controller.tentativeMarker);
      controller.tentativeMarker = null;
    }
    if (controller.tentativeProjectionLine) {
      controller.view.scene.remove(controller.tentativeProjectionLine);
      controller.tentativeProjectionLine = null;
    }
    if (controller._highlightedElement) {
      HighlightUtilities.removeHighlight(controller._highlightedElement);
      controller._highlightedElement = null;
    }
    controller._tentativeOriginalPoint = null;
    controller._tentativeProjectedPoint = null;
    if (controller._tentativeTimeout) {
      clearTimeout(controller._tentativeTimeout);
      controller._tentativeTimeout = null;
    }
    if (!suppressRefresh) {
      controller.refreshMousePosition();
    }
  }

  static _findOwnerElement(controller, hitObject) {
    // Iterate through CAD elements to find which one owns the visual object
    for (const el of controller.cadElements) {
      if (!el.threejsObject) continue;

      // Direct match check
      if (el.threejsObject === hitObject) return el;

      // Descendant check (if threejsObject is a Group)
      let isDescendant = false;
      el.threejsObject.traverse((child) => {
        if (child === hitObject) {
          isDescendant = true;
        }
      });

      if (isDescendant) {
        return el;
      }
    }
    return null;
  }

  static _findSnapPointOnElement(element, intersectionPoint) {
    if (element.points && element.points.length > 0) {
      let closestDistance = Infinity;
      const closestVertex = new THREE.Vector3();
      const tempVertex = new THREE.Vector3();

      element.points.forEach((pt) => {
        tempVertex.set(pt[0], pt[1], pt[2]);
        // If the element's three.js object is transformed, we must apply that transform to its points
        if (element.threejsObject && element.threejsObject.matrixWorld) {
          tempVertex.applyMatrix4(element.threejsObject.matrixWorld);
        }
        const distance = tempVertex.distanceTo(intersectionPoint);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestVertex.copy(tempVertex);
        }
      });

      return [closestVertex.x, closestVertex.y, closestVertex.z];
    }
    return null; // No snap points on this element
  }

  static _getSnappableThreeObjects(controller) {
    const snappableObjects = [];
    const activeCommand = controller.activeCommand;
    const tempElement = activeCommand ? activeCommand.tempElement : null;

    console.log(
      '   [Filter] Active command is:',
      activeCommand ? activeCommand.constructor.name : 'none'
    );

    controller.cadElements.forEach((element) => {
      // Per your instruction: it is correct to not snap to the thing we are drawing.
      // This check ensures we skip the currently active temporary element.
      if (element === tempElement) {
        return;
      }

      if (element.threejsObject) {
        // We only want to consider permanent, visible elements for snapping.
        if (!element.isTemporary && element.threejsObject.visible) {
          snappableObjects.push(element.threejsObject);
        }
      }
    });

    return snappableObjects;
  }

  static _findClosestSnapPoint(controller, intersectionPoint) {
    let closestDistanceSq = Infinity;
    let bestSnap = null;

    // Using a world-space threshold that scales with the compass size. This is a simple but effective approach.
    const snapRadius = (controller.originMarker?.options.size || 1.0) * 0.25;
    const snapRadiusSq = snapRadius * snapRadius;

    const activeCommand = controller.activeCommand;
    const tempElement = activeCommand ? activeCommand.tempElement : null;

    for (const element of controller.cadElements) {
      if (element === tempElement && !activeCommand.allowSelfSnap) {
        continue;
      }

      if (element.points && element.points.length > 0) {
        for (let i = 0; i < element.points.length; i++) {
          const pt3D = element.points[i];
          const dx = pt3D[0] - intersectionPoint.x;
          const dy = pt3D[1] - intersectionPoint.y;
          const dz = pt3D[2] - intersectionPoint.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < closestDistanceSq) {
            closestDistanceSq = distSq;
            if (distSq < snapRadiusSq) {
              // Check if it's within our snap radius
              bestSnap = {
                point: pt3D,
                ownerElement: element,
                index: i,
                worldDist: Math.sqrt(distSq),
              };
            }
          }
        }
      }
    }
    return bestSnap;
  }

  static _findClosestVertexOnElement(element, intersectionPoint) {
    if (!element.points || element.points.length === 0) {
      return null;
    }

    let closestDistSq = Infinity;
    let closestVertex = null;
    let closestIndex = -1;

    const intersectionVec3 = new THREE.Vector3(
      intersectionPoint.x,
      intersectionPoint.y,
      intersectionPoint.z
    );
    const tempVertexVec3 = new THREE.Vector3();

    for (let i = 0; i < element.points.length; i++) {
      const pt = element.points[i];
      // Ensure point is valid
      if (!Array.isArray(pt) || pt.length < 3) continue;

      tempVertexVec3.set(pt[0], pt[1], pt[2]);

      // We calculate distance from the *Intersection Point* on the element surface
      // to the *Control Vertex* (which might be floating if rounded).
      const distSq = intersectionVec3.distanceToSquared(tempVertexVec3);

      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestVertex = pt;
        closestIndex = i;
      }
    }

    if (closestVertex) {
      return {
        point: closestVertex,
        index: closestIndex,
        distance: Math.sqrt(closestDistSq),
      };
    }
    return null;
  }

  static _findClosestVertexGlobal(controller, raycaster, threshold) {
    let bestDist = threshold;
    let bestResult = null;

    const activeCommand = controller.activeCommand;
    const tempElement = activeCommand ? activeCommand.tempElement : null;

    for (const el of controller.cadElements) {
      // Skip invisible or unselectable or missing points
      if (!el.points || !el.threejsObject || !el.threejsObject.visible)
        continue;

      // Skip self-snap if disabled
      if (el === tempElement && !activeCommand.allowSelfSnap) continue;

      for (const pt of el.points) {
        if (!Array.isArray(pt)) continue;
        const vec = new THREE.Vector3(pt[0], pt[1], pt[2]);

        // Distance from the ray (infinite line) to the point
        const dist = raycaster.ray.distanceToPoint(vec);

        // Ensure point is in front of camera
        const vecToPoint = vec.clone().sub(raycaster.ray.origin);
        const dot = vecToPoint.dot(raycaster.ray.direction);

        if (dot > 0 && dist < bestDist) {
          bestDist = dist;
          bestResult = { element: el, point: pt, dist: dist };
        }
      }
    }
    return bestResult;
  }

  static _findClosestVertexScreenSpace(controller, element, clientX, clientY) {
    if (!element.points || element.points.length === 0) return null;

    const camera = controller.view.camera;
    const canvas = controller.domElement;
    const rect = canvas.getBoundingClientRect();

    let closestDistSq = Infinity;
    let closestPt = null;

    const vec = new THREE.Vector3();

    for (const pt of element.points) {
      if (!Array.isArray(pt)) continue;

      vec.set(pt[0], pt[1], pt[2]);
      // Project 3D point to NDC
      vec.project(camera);

      // Convert NDC to Client Coordinates
      const screenX = (vec.x * 0.5 + 0.5) * rect.width + rect.left;
      const screenY = (1 - (vec.y * 0.5 + 0.5)) * rect.height + rect.top;

      const dx = screenX - clientX;
      const dy = screenY - clientY;
      const dSq = dx * dx + dy * dy;

      // Check visibility (NDC z must be -1 to 1)
      if (vec.z >= -1 && vec.z <= 1) {
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          closestPt = pt;
        }
      }
    }

    return closestPt ? { point: closestPt, distSq: closestDistSq } : null;
  }

  static _findClosestElementVertexScreenSpaceGlobal(
    controller,
    clientX,
    clientY,
    thresholdPx
  ) {
    const activeCommand = controller.activeCommand;
    const tempElement = activeCommand ? activeCommand.tempElement : null;

    let globalBestDistSq = thresholdPx * thresholdPx;
    let globalBest = null;

    for (const el of controller.cadElements) {
      // Filter: Must have visible object
      if (!el.threejsObject || !el.threejsObject.visible) continue;
      // Filter: Self-snap check
      if (el === tempElement && !activeCommand.allowSelfSnap) continue;

      const result = this._findClosestVertexScreenSpace(
        controller,
        el,
        clientX,
        clientY
      );

      if (result && result.distSq < globalBestDistSq) {
        globalBestDistSq = result.distSq;
        globalBest = { element: el, point: result.point };
      }
    }

    return globalBest;
  }

  static _findClosestElementByScreenSegments(
    controller,
    clientX,
    clientY,
    threshold
  ) {
    const camera = controller.view.camera;
    const canvas = controller.domElement;
    const rect = canvas.getBoundingClientRect();
    const activeCommand = controller.activeCommand;
    const tempElement = activeCommand ? activeCommand.tempElement : null;

    let bestElement = null;
    let bestDistSq = threshold * threshold; // Start within tolerance

    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();

    // Helper to project 3D -> Screen
    const toScreen = (vec) => {
      vec.project(camera);
      return {
        x: (vec.x * 0.5 + 0.5) * rect.width + rect.left,
        y: (1 - (vec.y * 0.5 + 0.5)) * rect.height + rect.top,
        z: vec.z, // Keep Z for clipping check
      };
    };

    // Distance from point (p) to line segment (v-w)
    const distToSegmentSq = (px, py, vx, vy, wx, wy) => {
      const l2 = (vx - wx) ** 2 + (vy - wy) ** 2;
      if (l2 === 0) return (px - vx) ** 2 + (py - vy) ** 2;
      let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
      t = Math.max(0, Math.min(1, t));
      return (
        (px - (vx + t * (wx - vx))) ** 2 + (py - (vy + t * (wy - vy))) ** 2
      );
    };

    for (const el of controller.cadElements) {
      // Filter: Must be visible and linear-ish (has points)
      if (
        !el.threejsObject ||
        !el.threejsObject.visible ||
        !el.points ||
        el.points.length < 2
      )
        continue;
      if (el === tempElement && !activeCommand.allowSelfSnap) continue;

      // Skip closed shapes like Rectangles if they are filled (Mesh check handled by Raycast)
      // But for Paths/Arcs, this is critical.

      const pts = el.points;
      for (let i = 0; i < pts.length - 1; i++) {
        v1.set(pts[i][0], pts[i][1], pts[i][2]);
        v2.set(pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]);

        const s1 = toScreen(v1);
        const s2 = toScreen(v2);

        // Clip if behind camera
        if (s1.z > 1 || s2.z > 1 || s1.z < -1 || s2.z < -1) continue;

        const dSq = distToSegmentSq(clientX, clientY, s1.x, s1.y, s2.x, s2.y);

        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestElement = el;
        }
      }

      // For closed paths/loops, check last segment
      if (el.closed || el.type === 'rectangle' || el.type === 'circle') {
        // simplified check
        v1.set(
          pts[pts.length - 1][0],
          pts[pts.length - 1][1],
          pts[pts.length - 1][2]
        );
        v2.set(pts[0][0], pts[0][1], pts[0][2]);
        const s1 = toScreen(v1);
        const s2 = toScreen(v2);
        if (s1.z <= 1 && s2.z <= 1 && s1.z >= -1 && s2.z >= -1) {
          const dSq = distToSegmentSq(clientX, clientY, s1.x, s1.y, s2.x, s2.y);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestElement = el;
          }
        }
      }
    }

    return bestElement;
  }

}

