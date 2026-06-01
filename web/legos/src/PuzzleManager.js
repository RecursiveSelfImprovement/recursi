class PuzzleManager {
  constructor({
    legoFactory,
    supportAnalyzer,
    buildConfig,
    diffConfig,
    colorPool,
    weightedSizePool,
  }) {
    this.legoFactory = legoFactory;
    this.supportAnalyzer = supportAnalyzer;
    this.buildConfig = buildConfig;
    this.diffConfig = diffConfig;
    this.colorPool = colorPool;
    this.weightedSizePool = weightedSizePool;

    // State for the current puzzle
    this.groupA = null;
    this.groupB = null;
    this.builderA = null;
    this.gridB = null;
    this._cloneById = new Map();
    this.diffInfo = null;
    this.diffMeshes = [];
  }
  buildNewPuzzle(difficulty) {
    this._cloneById.clear();
    this.diffInfo = null;
    this.diffMeshes = [];

    const targetBricks = Math.round(
      THREE.MathUtils.lerp(
        this.buildConfig.minBrickCount,
        this.buildConfig.maxBrickCount,
        difficulty
      )
    );
    const w = THREE.MathUtils.randInt(
      this.buildConfig.minBaseplateDim,
      this.buildConfig.maxBaseplateDim
    );
    const l = THREE.MathUtils.randInt(
      this.buildConfig.minBaseplateDim,
      this.buildConfig.maxBaseplateDim
    );

    this.groupA = new THREE.Group();
    this.groupB = new THREE.Group();
    const plateA = this.legoFactory.createLego(w, l, true);
    const plateB = this.legoFactory.createLego(w, l, true);
    plateA.traverse((m) => m.isMesh && m.material.color.setHex(0xa0a5a9));
    plateB.traverse((m) => m.isMesh && m.material.color.setHex(0xa0a5a9));
    this.groupA.add(plateA);
    this.groupB.add(plateB);

    const gridA = new StudGrid(32);
    gridA.markBaseplateRect(w, l, 0);
    this.gridB = new StudGrid(32);
    this.gridB.markBaseplateRect(w, l, 0);

    this.builderA = new StructureBuilder({
      studGrid: gridA,
      legoFactory: this.legoFactory,
      supportAnalyzer: this.supportAnalyzer,
      parentGroup: this.groupA,
      config: { cantileverMargin: 4 },
    });

    const bounds = { x: 0, z: 0, width: w, length: l };
    this._buildFullStructure(bounds, targetBricks);

    if (this.builderA.bricks.length === 0) {
      console.warn('Failed to build any bricks, returning null puzzle.');
      return null;
    }

    for (const rec of this.builderA.bricks) {
      rec.mesh.userData.recId = rec.id;
      rec.mesh.userData.isInteractive = true;
      const clone = rec.mesh.clone(true);
      clone.userData.recId = rec.id;
      clone.userData.isInteractive = true;
      this.groupB.add(clone);
      this._cloneById.set(rec.id, clone);
      const recB = { ...rec, id: 100000 + rec.id };
      this.gridB.markStuds(recB);
    }

    this._chooseAndApplyDifference(bounds);

    return {
      groupA: this.groupA,
      groupB: this.groupB,
      builderA: this.builderA,
      gridB: this.gridB,
      cloneById: this._cloneById,
      diffInfo: this.diffInfo,
      diffMeshes: this.diffMeshes,
    };
  }
  _buildFullStructure(bounds, target) {
    let placed = 0;
    let fails = 0;
    const maxFails = target * 30;

    while (placed < target && fails < maxFails) {
      const rec = this.builderA.placeRandomBrick(
        bounds,
        this.weightedSizePool,
        this.colorPool
      );
      if (rec) placed++;
      else fails++;
    }
  }
  _chooseAndApplyDifference(bounds) {
    const candidates = [];
    for (const rec of this.builderA.bricks) {
      if (rec.width * rec.length < 2) continue;
      const isBuried = this._hasAbove(this.builderA.grid, rec);
      if (
        isBuried &&
        Math.random() > this.diffConfig.allowBuriedDifferenceChance
      ) {
        continue;
      }
      candidates.push({ rec, area: rec.width * rec.length });
    }

    if (candidates.length === 0) {
      console.warn('No valid candidates for creating a difference.');
      this.diffMeshes = [];
      return;
    }

    let success = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!success && attempts < maxAttempts) {
      attempts++;
      let chosenRec;
      if (Math.random() < 0.3) {
        chosenRec =
          candidates[Math.floor(Math.random() * candidates.length)].rec;
      } else {
        let totalW = 0;
        const weights = candidates.map(({ rec, area }) => {
          let w = Math.pow(area, 0.8);
          const [w_, l_] = [rec.width, rec.length].sort((a, b) => a - b);
          if (w_ === 2 && l_ === 4) w *= 2.0;
          else if (w_ === 2 && l_ === 3) w *= 1.5;
          else if (w_ === 2 && l_ === 2) w *= 1.2;
          totalW += w;
          return w;
        });
        let r = Math.random() * totalW;
        for (let i = 0; i < candidates.length; i++) {
          r -= weights[i];
          if (r <= 0) {
            chosenRec = candidates[i].rec;
            break;
          }
        }
        if (!chosenRec) chosenRec = candidates[candidates.length - 1].rec;
      }
      if (!chosenRec) continue;

      const rec = chosenRec;
      const clone = this._cloneById.get(rec.id);
      if (!clone) continue;

      let type = 'move';
      if (
        rec.width !== rec.length &&
        Math.random() < this.diffConfig.chanceToRotate
      ) {
        type = 'rotate';
      } else if (
        rec.width * rec.length <= 9 &&
        rec.baseLayer > 1 &&
        Math.random() < this.diffConfig.chanceToMakeMissing
      ) {
        type = 'missing';
      }

      const res = this._applyDiffToClone(type, rec, clone, bounds);
      if (res && this._isActuallyDifferent(rec.mesh, res.meshes)) {
        this.diffInfo = { type: res.type, recId: rec.id };
        this.diffMeshes = res.meshes;
        success = true;
      }
    }

    if (!success) {
      console.error(
        'Failed to create a valid difference. Highlighting first available candidate.'
      );
      const firstCand = candidates[0]?.rec;
      if (firstCand) {
        this.diffMeshes = [firstCand.mesh, this._cloneById.get(firstCand.id)];
      } else {
        this.diffMeshes = [];
      }
    }
  }
  _applyDiffToClone(type, recA, clone, bounds) {
    // FIX: Reset clone's transform to match the original's. This prevents
    // transform accumulation if this function is called multiple times on the same
    // piece in a single difference-finding attempt, which could lead to non-visual
    // differences like a 180-degree rotation.
    clone.position.copy(recA.mesh.position);
    clone.rotation.copy(recA.mesh.rotation);

    const spacing = this.builderA.config.studSpacingMM;
    const gridB = this.gridB;
    const analyzer = new SupportAnalyzer({});

    const setPosFromAnchor = (mesh, ax, az, w, l, baseLayer) => {
      const localCenterX = ax - bounds.x + w / 2;
      const localCenterZ = az - bounds.z + l / 2;
      const worldX = (localCenterX - bounds.width / 2) * spacing;
      const worldZ = (localCenterZ - bounds.length / 2) * spacing;
      const baseY = this.builderA._worldYForLayer(baseLayer);
      mesh.position.set(worldX, baseY, worldZ);
    };

    const recB = {
      id: 100000 + recA.id,
      anchorX: recA.anchorX,
      anchorZ: recA.anchorZ,
      baseLayer: recA.baseLayer,
      width: recA.width,
      length: recA.length,
      heightUnits: recA.heightUnits,
    };

    gridB.unmarkStuds(recB);

    if (type === 'missing') {
      this.groupB.remove(clone);
      return { type: 'missing', meshes: [recA.mesh] };
    }

    if (type === 'move') {
      const tries = [];
      for (let d = 1; d <= this.diffConfig.maxMoveDistance; d++) {
        tries.push([d, 0], [-d, 0], [0, d], [0, -d]);
        tries.push([d, d], [d, -d], [-d, d], [-d, -d]);
      }

      for (const [dx, dz] of tries) {
        const ax = recA.anchorX + dx;
        const az = recA.anchorZ + dz;
        if (
          ax < bounds.x ||
          az < bounds.z ||
          ax + recA.width > bounds.x + bounds.width ||
          az + recA.length > bounds.z + bounds.length
        ) {
          continue;
        }
        if (
          !gridB.studsAreFree(
            ax,
            az,
            recA.baseLayer,
            recA.width,
            recA.length,
            recA.heightUnits
          )
        )
          continue;
        if (recA.baseLayer > 1) {
          const sup = gridB.getSupportedStuds(
            ax,
            az,
            recA.baseLayer,
            recA.width,
            recA.length
          );
          if (
            !analyzer.evaluateSupport({
              width: recA.width,
              length: recA.length,
              supportedCoords: sup.coords,
              anchorX: ax,
              anchorZ: az,
            }).ok
          )
            continue;
        }
        setPosFromAnchor(
          clone,
          ax,
          az,
          recA.width,
          recA.length,
          recA.baseLayer
        );
        const newRecB = { ...recB, anchorX: ax, anchorZ: az };
        gridB.markStuds(newRecB);
        return { type: 'move', meshes: [recA.mesh, clone] };
      }
      gridB.markStuds(recB);
      return null;
    }

    if (type === 'rotate' && recA.width !== recA.length) {
      const newW = recA.length;
      const newL = recA.width;
      const centerX = recA.anchorX + recA.width / 2;
      const centerZ = recA.anchorZ + recA.length / 2;
      let ax = Math.round(centerX - newW / 2);
      let az = Math.round(centerZ - newL / 2);
      ax = Math.max(bounds.x, Math.min(bounds.x + bounds.width - newW, ax));
      az = Math.max(bounds.z, Math.min(bounds.z + bounds.length - newL, az));

      if (
        gridB.studsAreFree(ax, az, recA.baseLayer, newW, newL, recA.heightUnits)
      ) {
        if (recA.baseLayer > 1) {
          const sup = gridB.getSupportedStuds(
            ax,
            az,
            recA.baseLayer,
            newW,
            newL
          );
          if (
            !analyzer.evaluateSupport({
              width: newW,
              length: newL,
              supportedCoords: sup.coords,
              anchorX: ax,
              anchorZ: az,
            }).ok
          ) {
            gridB.markStuds(recB);
            return null;
          }
        }
        clone.rotation.y += Math.PI / 2;
        setPosFromAnchor(clone, ax, az, newW, newL, recA.baseLayer);
        const newRecB = {
          ...recB,
          anchorX: ax,
          anchorZ: az,
          width: newW,
          length: newL,
        };
        gridB.markStuds(newRecB);
        return { type: 'rotate', meshes: [recA.mesh, clone] };
      }
      gridB.markStuds(recB);
      return null;
    }

    gridB.markStuds(recB);
    return null;
  }
  _hasAbove(grid, rec) {
    const topLayer = rec.baseLayer + rec.heightUnits - 1;
    for (let w = 0; w < rec.width; w++) {
      for (let l = 0; l < rec.length; l++) {
        const x = rec.anchorX + w;
        const z = rec.anchorZ + l;
        const col = grid.occupied?.[x]?.[z];
        if (!col) continue;
        for (let lay = topLayer + 1; lay < col.length; lay++) {
          if (col[lay]) return true;
        }
      }
    }
    return false;
  }
  _isActuallyDifferent(meshA, meshesToCheck) {
    const epsPos = 0.001,
      epsRot = 0.001;
    if (meshesToCheck.length === 1) {
      return true; // "missing" case
    }
    const [mA, mB] = meshesToCheck;
    if (!mA || !mB) return true;
    const posDiff = mA.position.distanceTo(mB.position) > epsPos;
    const rotDiff =
      Math.abs((mA.rotation.y - mB.rotation.y) % (Math.PI * 2)) > epsRot;
    return posDiff || rotDiff;
  }

}