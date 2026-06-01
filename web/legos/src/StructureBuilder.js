class StructureBuilder {
  constructor({
    studGrid,
    legoFactory,
    supportAnalyzer,
    parentGroup,
    config = {},
  }) {
    this.grid = studGrid;
    this.legoFactory = legoFactory;
    this.supportAnalyzer = supportAnalyzer;
    this.parentGroup = parentGroup;

    this.config = Object.assign(
      {
        studSpacingMM: 8,
        plateHeightUnits: 1,
        brickHeightUnits: 3,
        cantileverMargin: 4,
      },
      config
    );

    this.bricks = [];
    this.nextBrickId = 1;
  }

  placeRandomBrick(bounds, weightedSizePool, colorPool) {
    // 1. Separate the pool into preferred (2-wide) and fallback (1-wide) bricks.
    const twoWideBricks = [];
    const oneWideBricks = [];
    for (const poolItem of weightedSizePool) {
      const [w, l] = poolItem.item;
      if (w === 2 || l === 2) {
        twoWideBricks.push(poolItem.item);
      } else {
        oneWideBricks.push(poolItem.item);
      }
    }

    // --- Helper to shuffle an array in place ---
    const shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // 2. Decide placement order. Usually try 2-wide first.
    const attemptOrder =
      Math.random() < 0.8
        ? [shuffle(twoWideBricks), shuffle(oneWideBricks)]
        : [shuffle(oneWideBricks), shuffle(twoWideBricks)];

    // 3. Iterate through the prioritized list and try to place a brick.
    for (const brickList of attemptOrder) {
      for (const [w, l] of brickList) {
        // Attempt to place this brick. If successful, this function will return a value.
        const result = this._tryPlaceSpecificBrick(bounds, w, l, colorPool);
        if (result) {
          return result; // Success! Exit early.
        }
      }
    }

    // 4. If no brick from any list could be placed, return null.
    return null;
  }

  // --- NEW HELPER METHOD: Tries to place a brick of a specific size ---
  _tryPlaceSpecificBrick(bounds, w, l, colorPool) {
    const [studW, studL] = Math.random() < 0.5 || w === l ? [w, l] : [l, w];

    const ext = {
      x: Math.max(0, bounds.x - this.config.cantileverMargin),
      z: Math.max(0, bounds.z - this.config.cantileverMargin),
      width: Math.min(
        this.grid.gridSize,
        bounds.width + this.config.cantileverMargin * 2
      ),
      length: Math.min(
        this.grid.gridSize,
        bounds.length + this.config.cantileverMargin * 2
      ),
    };

    const validPlacements = [];
    const isPlate = Math.random() < 0.5;
    const heightUnits = isPlate
      ? this.config.plateHeightUnits
      : this.config.brickHeightUnits;

    const maxX = ext.x + ext.width - studW;
    const maxZ = ext.z + ext.length - studL;
    for (let ax = ext.x; ax <= maxX; ax++) {
      for (let az = ext.z; az <= maxZ; az++) {
        const baseLayer = this.grid.calcBaseLayerForFootprint(
          ax,
          az,
          studW,
          studL
        );

        if (
          !this.grid.studsAreFree(ax, az, baseLayer, studW, studL, heightUnits)
        ) {
          continue;
        }

        const sup = this.grid.getSupportedStuds(
          ax,
          az,
          baseLayer,
          studW,
          studL
        );
        const evalRes = this.supportAnalyzer.evaluateSupport({
          width: studW,
          length: studL,
          supportedCoords: sup.coords,
          anchorX: ax,
          anchorZ: az,
        });

        if (evalRes.ok) {
          validPlacements.push({ anchorX: ax, anchorZ: az, baseLayer });
        }
      }
    }

    if (validPlacements.length === 0) {
      return null; // This specific size can't be placed.
    }

    const placement =
      validPlacements[Math.floor(Math.random() * validPlacements.length)];
    const { anchorX, anchorZ, baseLayer } = placement;

    const meshGroup = this.legoFactory.createLego(studW, studL, isPlate);
    const color = colorPool[Math.floor(Math.random() * colorPool.length)];
    meshGroup.traverse((ch) => {
      if (ch.isMesh) ch.material.color.setHex(color);
    });

    const spacing = this.config.studSpacingMM;
    const localCenterX = anchorX - bounds.x + studW / 2;
    const localCenterZ = anchorZ - bounds.z + studL / 2;
    const worldX = (localCenterX - bounds.width / 2) * spacing;
    const worldZ = (localCenterZ - bounds.length / 2) * spacing;
    const baseY = this._worldYForLayer(baseLayer);
    meshGroup.position.set(worldX, baseY, worldZ);

    this.parentGroup.add(meshGroup);

    const rec = {
      id: this.nextBrickId++,
      mesh: meshGroup,
      anchorX,
      anchorZ,
      baseLayer,
      width: studW,
      length: studL,
      heightUnits,
      isPlate,
      color,
    };
    this.bricks.push(rec);
    this.grid.markStuds(rec);

    return rec;
  }

  //------ _worldYForLayer
  _worldYForLayer(baseLayer) {
    const unitH = this.legoFactory.PLATE_THICKNESS;
    return this.legoFactory.PLATE_THICKNESS + (baseLayer - 1) * unitH;
  }

  //------ getBrickByMesh
  getBrickByMesh(mesh) {
    return this.bricks.find((b) => b.mesh === mesh) || null;
  }

  getBrickById(id) {
    return this.bricks.find((b) => b.id === id) || null;
  }

  _worldPosFor(anchorX, anchorZ, width, length) {
    const spacing = this.config.studSpacingMM;
    const centerX = anchorX + width / 2;
    const centerZ = anchorZ + length / 2;
    const worldX = (centerX - this.grid.gridSize / 2) * spacing;
    const worldZ = (centerZ - this.grid.gridSize / 2) * spacing;
    return { x: worldX, z: worldZ };
  }

  _findBricksDirectlyOnTop(record) {
    const bricksOnTop = [];
    if (!record) return bricksOnTop;
    const targetLayer = record.baseLayer + record.heightUnits;
    const ax1 = record.anchorX;
    const az1 = record.anchorZ;
    const ax2 = ax1 + record.width;
    const az2 = az1 + record.length;

    for (const otherBrick of this.bricks) {
      if (otherBrick.id === record.id) continue;
      if (otherBrick.baseLayer === targetLayer) {
        const bx1 = otherBrick.anchorX;
        const bz1 = otherBrick.anchorZ;
        const bx2 = bx1 + otherBrick.width;
        const bz2 = bz1 + otherBrick.length;
        const overlaps = ax1 < bx2 && bx1 < ax2 && az1 < bz2 && bz1 < az2;
        if (overlaps) {
          bricksOnTop.push(otherBrick);
        }
      }
    }
    return bricksOnTop;
  }

} //----- end class StructureBuilder

