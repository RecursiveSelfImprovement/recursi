
class AccuDraw {
  constructor(threeDView, options = {}) {
    this.threeDView = threeDView;
    this.options = Object.assign(
      {
        squircleAmount: 0.5,
        center: [0, 0, 0],
        rotationMatrix: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        color: 0x88ccff,
        outlineThickness: 2,
        opacity: 0.5,
        size: 1,
        depthTest: true,
        mode: 'arc',
        cameraOffset: 0.01,
      },
      options
    );

    // Store reference to baseController if provided, so UI children can reach accuDrawLogic
    this.baseController = options.baseController || null;

    this.group = new THREE.Group();
    this.group.userData.isPickable = false;

    this.marker3D = new Squircle3D(this.threeDView, this.options);
    this.marker3D.getObject3D().userData.isPickable = false;
    this.group.add(this.marker3D.getObject3D());

    // Initialize tick storage
    this.axisTicks = { x: [], y: [] };

    this._createDecorations();
    this.isAnimating = 0;

    // Index Line (The white constraint line)
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions([0, 0, 0, 0, 0, 0]);

    const lineMaterial = new LineMaterial({
      color: 0xffffff,
      linewidth: 4,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      depthTest: false,
      depthWrite: false,
      dashed: false,
      transparent: true,
      opacity: 1.0,
    });

    this.indexIndicator = new Line2(lineGeometry, lineMaterial);
    this.indexIndicator.userData.isPickable = false;
    this.indexIndicator.visible = false;
    this.indexIndicator.renderOrder = 99999;

    this.group.add(this.indexIndicator);

    // Projected Marker (The Mini-Jack)
    this.projectedMarker = this._createMiniJack();
    this.projectedMarker.visible = false;
    this.threeDView.scene.add(this.projectedMarker);

    // Initialize UI
    this.ui = new AccuDrawUi(this);
  }

  _createDecorations() {
    if (this.decorationsGroup) {
      this.group.remove(this.decorationsGroup);
      this.decorationsGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    this.decorationsGroup = new THREE.Group();
    this.decorationsGroup.userData.isPickable = false;
    this.axisTicks = { x: [], y: [] };

    const S = this.options.size;
    const scale = S / 0.5;
    // Define tick dimensions for logic use later
    this.tickDims = {
      start: 0.4 * scale,
      end: 0.6 * scale,
      radius: S / 60,
      sphereRadius: S / 60, // Same as cylinder radius
      length: (0.6 - 0.4) * scale,
    };

    const red = 0xff0000;
    const green = 0x00ff00;
    const gray = 0x808080;
    const dt = this.options.depthTest;
    const r = this.tickDims.radius;

    const createTick = (axis, sign, color) => {
      // Create geometry centered at origin
      const h = this.tickDims.length;
      const cylinderGeometry = new THREE.CylinderGeometry(r, r, h, 16, 1);
      if (axis === 'x') cylinderGeometry.rotateZ((sign * Math.PI) / 2);

      const sphereGeo = new THREE.SphereGeometry(r, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        depthTest: dt,
      });

      const cyl = new THREE.Mesh(cylinderGeometry, material);
      const s1 = new THREE.Mesh(sphereGeo, material);
      const s2 = new THREE.Mesh(sphereGeo, material);

      const grp = new THREE.Group();
      grp.add(cyl);
      grp.add(s1);
      grp.add(s2);

      // Position spheres relative to group center
      // Center of tick is at distance (start+end)/2
      if (axis === 'x') {
        s1.position.x = (-sign * h) / 2;
        s2.position.x = (sign * h) / 2;
      } else {
        s1.position.y = (-sign * h) / 2;
        s2.position.y = (sign * h) / 2;
      }

      // Position Group at resting place
      const baseDist = (this.tickDims.start + this.tickDims.end) / 2;
      if (axis === 'x') grp.position.x = sign * baseDist;
      else grp.position.y = sign * baseDist;

      grp.userData = { basePos: grp.position.clone(), axis, sign };
      return grp;
    };

    const tx = createTick('x', 1, red);
    const tnx = createTick('x', -1, gray);
    const ty = createTick('y', 1, green);
    const tny = createTick('y', -1, gray);

    this.axisTicks.x.push(tx, tnx);
    this.axisTicks.y.push(ty, tny);

    this.decorationsGroup.add(tx, tnx, ty, tny);

    // Center Dot
    const centerRadius = (2 / 3) * 0.05 * scale;
    const centerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(centerRadius, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: dt })
    );
    this.decorationsGroup.add(centerSphere);

    const T = this._computeTransformMatrix();
    this.decorationsGroup.matrixAutoUpdate = false;
    this.decorationsGroup.matrix.copy(T);
    this.decorationsGroup.updateMatrixWorld(true);

    this.group.add(this.decorationsGroup);

    // Restart animation if needed
    if (this.activeAnimationAxis) this._startAxisAnimation();
  }

  updateIndexIndicator(
    origin,
    constrainedPoint,
    rawPoint,
    indexedToAxis,
    isConstrained,
    isTentative
  ) {
    // If basic data missing, hide all
    if (!origin || !constrainedPoint) {
      this.indexIndicator.visible = false;
      this.projectedMarker.visible = false;
      this.currentIndexTarget = null;
      return;
    }

    // Transform World Point -> Local Point for logic
    const T = this._computeTransformMatrix();
    const invT = T.clone().invert();
    const worldVec = new THREE.Vector3(...constrainedPoint);
    const localVec = worldVec.clone().applyMatrix4(invT);

    // Determine if "pulled away"
    // We compare the final constrained point to the "raw" input.
    // If rawPoint is null (shouldn't be), fallback to constrainedPoint (dist=0).
    let isPulledAway = false;

    if (rawPoint) {
      const dx = constrainedPoint[0] - rawPoint[0];
      const dy = constrainedPoint[1] - rawPoint[1];
      const dz = constrainedPoint[2] - rawPoint[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      // Threshold for visual "pulling"
      isPulledAway = distSq > 0.000001;
    }

    this.currentIndexTarget = {
      world: worldVec,
      local: localVec,
      axis: indexedToAxis,
      isConstrained: isConstrained,
      isPulledAway: isPulledAway,
      isTentative: isTentative,
    };

    if (!this._isAnimatingAxes) {
      this._updateIndexLineGeometry();
    }
  }

  update(params = {}) {
    Object.assign(this.options, params);
    this.marker3D.update(params);
    this._createDecorations();
  }

  setPosition(x, y, z) {
    this.options.center = [x, y, z];
    this.marker3D.update({ center: [x, y, z] });
    this._createDecorations();
  }

  setCenterAnimated(newCenter, duration = 0) {
    this.isAnimating++;
    if (!duration) {
      this.update({ center: newCenter });
      this.isAnimating--;
      return;
    }
    const startCenter = this.options.center.slice();
    const startTime = Date.now();
    const durMs = duration * 1000;
    const animate = () => {
      const t = Math.min((Date.now() - startTime) / durMs, 1);
      const interpolated = startCenter.map(
        (v, i) => v + (newCenter[i] - v) * t
      );
      this.update({ center: interpolated });
      if (t < 1) requestAnimationFrame(animate);
      else this.isAnimating--;
    };
    animate();
  }

  setRotationAnimated(newRotationMatrix, duration = 0) {
    if (!duration) {
      this.update({ rotationMatrix: newRotationMatrix });
      return;
    }
    const currentRM = this.options.rotationMatrix;
    const mCurrent = new THREE.Matrix4().set(
      currentRM[0][0],
      currentRM[0][1],
      currentRM[0][2],
      0,
      currentRM[1][0],
      currentRM[1][1],
      currentRM[1][2],
      0,
      currentRM[2][0],
      currentRM[2][1],
      currentRM[2][2],
      0,
      0,
      0,
      0,
      1
    );
    const currentQuat = new THREE.Quaternion().setFromRotationMatrix(mCurrent);
    const mTarget = new THREE.Matrix4().set(
      newRotationMatrix[0][0],
      newRotationMatrix[0][1],
      newRotationMatrix[0][2],
      0,
      newRotationMatrix[1][0],
      newRotationMatrix[1][1],
      newRotationMatrix[1][2],
      0,
      newRotationMatrix[2][0],
      newRotationMatrix[2][1],
      newRotationMatrix[2][2],
      0,
      0,
      0,
      0,
      1
    );
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(mTarget);
    const startTime = Date.now();
    const durMs = duration * 1000;
    const animate = () => {
      const t = Math.min((Date.now() - startTime) / durMs, 1);
      const newQuat = currentQuat.clone().slerp(targetQuat, t);
      const m = new THREE.Matrix4().makeRotationFromQuaternion(newQuat);
      const e = m.elements;
      const newRM = [
        [e[0], e[4], e[8]],
        [e[1], e[5], e[9]],
        [e[2], e[6], e[10]],
      ];
      this.update({ rotationMatrix: newRM });
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  setColorAnimated(newColor, duration = 0) {
    const hexToHSL = (hex) => {
      const hexStr = hex.toString(16).padStart(6, '0');
      const r = parseInt(hexStr.substring(0, 2), 16) / 255;
      const g = parseInt(hexStr.substring(2, 4), 16) / 255;
      const b = parseInt(hexStr.substring(4, 6), 16) / 255;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      let h,
        s,
        l = (max + min) / 2;
      if (max === min) {
        h = 0;
        s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      return { h: h * 360, s, l };
    };
    const HSLToHex = (h, s, l) => {
      h /= 360;
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      const toHex = (x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      return parseInt(toHex(r) + toHex(g) + toHex(b), 16);
    };

    if (!duration) {
      this.update({ color: newColor });
      return;
    }
    const currentColor = this.options.color;
    const startHSL = hexToHSL(currentColor);
    const targetHSL = hexToHSL(newColor);
    const startTime = Date.now();
    const durMs = duration * 1000;
    const animate = () => {
      const t = Math.min((Date.now() - startTime) / durMs, 1);
      const newHue = startHSL.h + (targetHSL.h - startHSL.h) * t;
      const newColorVal = HSLToHex(newHue, startHSL.s, startHSL.l);
      this.update({ color: newColorVal });
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  setSquircleAnimated(newSquircle, duration = 0) {
    if (!duration) {
      this.update({ squircleAmount: newSquircle });
      return;
    }
    const startValue = this.options.squircleAmount;
    const startTime = Date.now();
    const durMs = duration * 1000;
    const animate = () => {
      const t = Math.min((Date.now() - startTime) / durMs, 1);
      const newValue = startValue + (newSquircle - startValue) * t;
      this.update({ squircleAmount: newValue });
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  setSizeAnimated(targetSize, duration = 0) {
    if (!duration) {
      this.update({ size: targetSize });
      return;
    }
    const startSize = this.options.size;
    const startTime = Date.now();
    const durMs = duration * 1000;
    const animate = () => {
      const t = Math.min((Date.now() - startTime) / durMs, 1);
      const newSizeValue = startSize + (targetSize - startSize) * t;
      this.update({ size: newSizeValue });
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  getObject3D() {
    return this.group;
  }

  _computeTransformMatrix() {
    const xAxis = new THREE.Vector3(...this.options.rotationMatrix[0]);
    const yAxis = new THREE.Vector3(...this.options.rotationMatrix[1]);
    const zAxis = new THREE.Vector3(...this.options.rotationMatrix[2]);
    const T = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    let effectiveCenter = new THREE.Vector3(...this.options.center);
    if (
      this.threeDView &&
      this.threeDView.camera &&
      typeof this.options.cameraOffset === 'number'
    ) {
      const cameraPos = this.threeDView.camera.position;
      const offsetDir = new THREE.Vector3()
        .subVectors(cameraPos, effectiveCenter)
        .normalize();
      effectiveCenter.add(offsetDir.multiplyScalar(this.options.cameraOffset));
    }
    T.setPosition(effectiveCenter);
    return T;
  }

  _startAxisAnimation() {
    if (this._isAnimatingAxes) return;
    this._isAnimatingAxes = true;
    this._animStartTime = performance.now();

    const animate = () => {
      if (!this._isAnimatingAxes) return;

      if (
        !this.activeAnimationAxis ||
        !this.decorationsGroup ||
        !this.decorationsGroup.parent
      ) {
        this._isAnimatingAxes = false;
        this._resetAxisPositions();
        this._updateIndexLineGeometry();
        return;
      }

      const now = performance.now();
      const elapsed = (now - this._animStartTime) / 1000;

      const tickLen = this.tickDims.length;
      const moveDist = tickLen * 0.4;
      const offset = Math.sin(elapsed * 4.0) * moveDist;

      // Support single ('x') or dual ('xy') axis animation
      const axesToAnimate = [];
      if (this.activeAnimationAxis.includes('x')) axesToAnimate.push('x');
      if (this.activeAnimationAxis.includes('y')) axesToAnimate.push('y');

      // Animate the requested axes
      axesToAnimate.forEach((axKey) => {
        const ticks = this.axisTicks[axKey];
        if (ticks) {
          ticks.forEach((grp) => {
            const base = grp.userData.basePos;
            const sign = grp.userData.sign;
            const axis = grp.userData.axis;

            const baseVal = base.getComponent(['x', 'y'].indexOf(axis));
            const currentPos = baseVal - sign * offset;

            if (axis === 'x') grp.position.x = currentPos;
            else grp.position.y = currentPos;
          });
        }
      });

      // Ensure non-animating axes stay at rest
      ['x', 'y'].forEach((axKey) => {
        if (!axesToAnimate.includes(axKey) && this.axisTicks[axKey]) {
          this.axisTicks[axKey].forEach((grp) => {
            if (grp.userData.basePos) {
              grp.position.copy(grp.userData.basePos);
            }
          });
        }
      });

      this._updateIndexLineGeometry();

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  _createMiniJack() {
    const size = this.options.size / 8;
    const geometry = new THREE.CylinderGeometry(
      size / 15,
      size / 15,
      size,
      4,
      1
    );

    // Fix Mini-Jack material to also be always-on-top
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      depthWrite: false,
    });

    const group = new THREE.Group();
    group.renderOrder = 99999; // Match the index line

    const addArm = (rotX, rotZ) => {
      const m = new THREE.Mesh(geometry, material);
      if (rotX) m.rotation.x = rotX;
      if (rotZ) m.rotation.z = rotZ;
      m.renderOrder = 99999; // Ensure individual meshes also inherit this conceptually
      group.add(m);
    };

    addArm(0, 0); // Y
    addArm(0, Math.PI / 2); // X
    addArm(Math.PI / 2, 0); // Z

    group.userData.isPickable = false;
    return group;
  }

  _updateIndexLineGeometry() {
    if (!this.currentIndexTarget) {
      this.indexIndicator.visible = false;
      this.projectedMarker.visible = false;
      return;
    }

    const { world, local, axis, isPulledAway } = this.currentIndexTarget;

    // --- Mini-Jack Visibility ---
    this.projectedMarker.visible = isPulledAway;
    if (isPulledAway) {
      this.projectedMarker.position.copy(world);
    }

    // --- Index Line Visibility ---
    // If no axis, or if it is 'xy' (Origin Snap), we don't draw a line,
    // we just rely on the pulsing ticks.
    if (!axis || axis === 'xy') {
      this.indexIndicator.visible = false;
      return;
    }

    // FIX: Removed the perpendicular distance check.
    // If 'axis' is set (e.g. 'x'), we assume we are conceptually on that axis,
    // even if a lock has forced the cursor position physically away from it.
    this.indexIndicator.visible = true;

    const val = axis === 'x' ? local.x : local.y;
    const sign = val >= 0 ? 1 : -1;

    // Line floats at Z-height of the constrained point
    const zHeight = local.z;

    const startLocal = new THREE.Vector3(0, 0, zHeight);
    const endLocal = new THREE.Vector3(0, 0, zHeight);

    // FIX: Force the line geometry to lie strictly ON the axis (0 for the other dimension).
    if (axis === 'x') {
      endLocal.x = local.x;
      endLocal.y = 0;
    } else {
      endLocal.x = 0;
      endLocal.y = local.y;
    }

    const tickIndex = sign === 1 ? 0 : 1;
    const tickObj = this.axisTicks[axis]
      ? this.axisTicks[axis][tickIndex]
      : null;

    if (tickObj) {
      const tickPos = tickObj.position;
      const halfLen = this.tickDims.length / 2;
      const sphereR = this.tickDims.sphereRadius;
      const centerDist =
        axis === 'x' ? Math.abs(tickPos.x) : Math.abs(tickPos.y);
      const innerBound = centerDist - halfLen - sphereR;
      const outerBound = centerDist + halfLen + sphereR;
      const cursorDist = Math.abs(val);
      const gap = this.tickDims.length * 0.5;

      if (cursorDist < innerBound) {
        // Inside ticks: draw from origin to cursor
      } else {
        // Outside ticks: draw from outside of ticks to cursor
        const startDist = outerBound + gap;
        if (cursorDist > startDist) {
          if (axis === 'x') startLocal.x = sign * startDist;
          else startLocal.y = sign * startDist;
        } else {
          // Dead zone (on top of ticks): hide line
          if (cursorDist > innerBound) {
            this.indexIndicator.visible = false;
          }
        }
      }
    }

    if (this.indexIndicator.visible) {
      const T = this._computeTransformMatrix();
      const startWorld = startLocal.clone().applyMatrix4(T);
      const endWorld = endLocal.applyMatrix4(T);

      const positions = [
        startWorld.x,
        startWorld.y,
        startWorld.z,
        endWorld.x,
        endWorld.y,
        endWorld.z,
      ];
      this.indexIndicator.geometry.setPositions(positions);

      if (this.threeDView && this.threeDView.renderer) {
        const canvas = this.threeDView.renderer.domElement;
        this.indexIndicator.material.resolution.set(
          canvas.clientWidth,
          canvas.clientHeight
        );
      }

      this.indexIndicator.renderOrder = 99999;
    }
  }

  setAxisAnimation(axis) {
    if (this.activeAnimationAxis === axis) return;

    this.activeAnimationAxis = axis;

    // Ensure this method exists before calling
    if (this._resetAxisPositions) {
      this._resetAxisPositions();
    }

    if (axis) {
      this._startAxisAnimation();
    } else {
      this._isAnimatingAxes = false;
      // Force one update to clear the line geometry if needed
      this._updateIndexLineGeometry();
    }
  }

  _resetAxisPositions() {
    if (!this.axisTicks) return;
    ['x', 'y'].forEach((ax) => {
      if (this.axisTicks[ax]) {
        this.axisTicks[ax].forEach((grp) => {
          if (grp.userData && grp.userData.basePos) {
            grp.position.copy(grp.userData.basePos);
          }
        });
      }
    });
  }

}

