
class GameController {
  puzzleManager;

  animationManager;

  layoutManager;

  builderA;

  gridB;

  _cloneById;

  diffInfo;

  diffMeshes;

  constructor({ scene, legoFactory, ui, app }) {
      this.scene = scene;
      this.legoFactory = legoFactory;
      this.ui = ui;
      this.app = app;
      this.animationManager = new AnimationManager({ scene, legoFactory });

      this.pivotA = null;
      this.pivotB = null;
      this._isFirstBuild = true;
      this.isSpinPausedByUser = false;

      this.layoutConfig = {
        verticalFov: 35,
        verticalModelYOffset: -100,
        verticalSeparation: 120,
        verticalCameraYOffsetFactor: 1.5,
        verticalCameraDistanceFactor: 1.3,
        horizontalFov: 50,
        horizontalSeparation: 16, // Reduced from 40 to 16 (exactly 2 studs of clearance) to bring models closer safely
      };
      this.diffConfig = {
        maxMoveDistance: 3,
        allowBuriedDifferenceChance: 0.15,
        chanceToRotate: 0.4,
        chanceToMakeMissing: 0.15,
      };
      this.buildConfig = {
        minBrickCount: 15,
        maxBrickCount: 60,
        minBaseplateDim: 6,
        maxBaseplateDim: 12,
      };

      window.gameConfig = {
        layout: this.layoutConfig,
        diff: this.diffConfig,
        build: this.buildConfig,
      };

      this.supportAnalyzer = new SupportAnalyzer({});

      this.weightedSizePool = [
        { item: [1, 1], weight: 5 },
        { item: [1, 2], weight: 8 },
        { item: [1, 3], weight: 4 },
        { item: [1, 4], weight: 6 },
        { item: [1, 6], weight: 3 },
        { item: [1, 8], weight: 2 },
        { item: [2, 2], weight: 15 },
        { item: [2, 3], weight: 15 },
        { item: [2, 4], weight: 20 },
        { item: [2, 6], weight: 5 },
        { item: [2, 8], weight: 4 },
        { item: [2, 10], weight: 1 },
        { item: [4, 6], weight: 1 },
      ];
      this.colorPool = [
        0xc91a09, 0x0055bf, 0xf2cd37, 0x237841, 0x00838f, 0xff800d, 0x6b3e18,
        0x05131d, 0xdf6695, 0x4b0082,
      ];

      this.puzzleManager = new PuzzleManager({
        legoFactory: this.legoFactory,
        supportAnalyzer: this.supportAnalyzer,
        buildConfig: this.buildConfig,
        diffConfig: this.diffConfig,
        colorPool: this.colorPool,
        weightedSizePool: this.weightedSizePool,
      });

      this.layoutManager = new LayoutManager({
        app: this.app,
        layoutConfig: this.layoutConfig,
      });

      this.groupA = null;
      this.groupB = null;

      this.spinMode = 'spinning';
      this.speedA = 0.12;
      this.speedB = -0.15;
      this.orbitalSpeedA = 0.05;
      this.orbitalSpeedB = 0.05;

      this.minAngle = THREE.MathUtils.degToRad(70);
      this.maxAngleEasy = THREE.MathUtils.degToRad(110);
      this.maxAngleHard = THREE.MathUtils.degToRad(180);
      this._turnaroundZoneWidth = THREE.MathUtils.degToRad(30);
      this._relativeSpinState = 'expanding';

      this._lastT = 0;
      this.score = 0;
      this._puzzleEnding = false;
      this._activeAnimations = 0;

      this.penalties = {
        incorrect: 1,
        reveal: 5,
        chainReactionDestroysCorrect: 10,
      };
      this.rewards = { correct: 10, chainReactionBonusThreshold: 2 };
    }

  init(newPairCb, toggleSpinCb, revealCb) {
    this.ui.init(
      () => this.createNewPair(),
      () => this.toggleSpin(),
      () => this.revealDifference()
    );
    this.createNewPair();
  }

  updateLayout(isVertical) {
    this.layoutManager.updateLayoutMode(isVertical, this.pivotA, this.pivotB);
  }

  createNewPair() {
    this._clearOldPair();
    this.ui.disableAllButtons(true);
    this.ui.enableReveal(false);
    this._puzzleEnding = false;
    if (this.score === 0) this.ui.setScore(0);

    this.ui.setMessage('Building...');
    // Increased delay to allow the exit animation to complete
    setTimeout(() => this._buildAndFinalizePair(), 600);
  }

  toggleSpin() {
    if (!this.groupA || !this.groupB) return;
    const minSeparation = this.minAngle;

    if (this.spinMode === 'spinning') {
      const diff = this._angleDiff(
        this.groupA.rotation.y,
        this.groupB.rotation.y
      );
      if (this.layoutManager.isVerticalMode || diff >= minSeparation) {
        this.spinMode = 'stopped';
      } else {
        this.spinMode = 'settling';
        this._settleDir = this._pickSettleDir();
        this._settleGoal = minSeparation;
      }
      this.ui.setSpinButtonLabel('Start Spin');
      this.isSpinPausedByUser = true;
    } else {
      this.spinMode = 'spinning';
      this.ui.setSpinButtonLabel('Stop Spin');
      this.isSpinPausedByUser = false;
    }
  }

  update() {
    const now = performance.now();
    const dt = this._lastT ? (now - this._lastT) / 1000 : 0;
    this._lastT = now;

    if (this.pivotA && this.pivotB) {
      if (this.spinMode === 'spinning') {
        if (this.layoutManager.isVerticalMode) {
          this.groupA.rotation.y += this.speedA * dt;
          this.groupB.rotation.y += this.speedB * dt;
        } else {
          const angleDiff = this._angleDiff(
            this.groupA.rotation.y,
            this.groupB.rotation.y
          );
          const difficulty = this.ui.getDifficulty();
          const maxAllowedAngle = THREE.MathUtils.lerp(
            this.maxAngleEasy,
            this.maxAngleHard,
            difficulty
          );
          let currentSpeedB = this.speedB;
          if (
            this._relativeSpinState === 'expanding' &&
            angleDiff >= maxAllowedAngle
          ) {
            this._relativeSpinState = 'contracting';
          } else if (
            this._relativeSpinState === 'contracting' &&
            angleDiff <= this.minAngle
          ) {
            this._relativeSpinState = 'expanding';
          }
          const turnaroundThreshold =
            maxAllowedAngle - this._turnaroundZoneWidth;
          if (
            this._relativeSpinState === 'expanding' &&
            angleDiff > turnaroundThreshold
          ) {
            const k =
              (angleDiff - turnaroundThreshold) / this._turnaroundZoneWidth;
            const easedK = (1 - Math.cos(Math.min(1, k) * Math.PI)) / 2;
            currentSpeedB = THREE.MathUtils.lerp(
              this.speedB,
              -this.speedB,
              easedK
            );
          } else if (this._relativeSpinState === 'contracting') {
            currentSpeedB = -this.speedB;
          }
          this.pivotA.rotation.y += this.orbitalSpeedA * dt;
          this.pivotB.rotation.y += this.orbitalSpeedB * dt;
          this.groupA.rotation.y += this.speedA * dt;
          this.groupB.rotation.y += currentSpeedB * dt;
        }
      } else if (
        this.spinMode === 'settling' &&
        !this.layoutManager.isVerticalMode
      ) {
        const diff = this._angleDiff(
          this.groupA.rotation.y,
          this.groupB.rotation.y
        );
        if (diff >= this._settleGoal) {
          this.spinMode = 'stopped';
        } else {
          this.groupB.rotation.y += this._settleDir * 0.25 * dt;
        }
      }
    }

    this.animationManager.update(dt);
  }

  handlePick(intersectedObject) {
    if (this._puzzleEnding || this._activeAnimations > 0) return;

    let rootBrickMesh = intersectedObject;
    while (rootBrickMesh.parent && !rootBrickMesh.userData.isLegoBrick) {
      rootBrickMesh = rootBrickMesh.parent;
    }
    if (
      !rootBrickMesh.userData.isLegoBrick ||
      !rootBrickMesh.userData.isInteractive
    )
      return;
    if (!this.diffInfo) return;

    const clickedRecId = rootBrickMesh.userData.recId;
    const clickedRec = this.builderA.getBrickById(clickedRecId);
    if (!clickedRec) return;

    if (clickedRecId === this.diffInfo.recId) {
      this._puzzleEnding = true;
      this.score += this.rewards.correct;
      this.ui.setScore(this.score);
      this.ui.setMessage(`Correct! +${this.rewards.correct} points.`);
      this.ui.disableAllButtons(true);
      this.diffInfo = null;

      this.animationManager.startFlash(this.diffMeshes, {
        duration: 2.0,
        lift: true,
        color: 0x00ff00,
        pulseCount: 4,
      });
      setTimeout(() => this.createNewPair(), 2500);
    } else {
      const { doomedBricks, targetWasHit } =
        this._getChainReactionTargets(clickedRec);
      this._activeAnimations = doomedBricks.length;

      if (targetWasHit) {
        this._puzzleEnding = true;
        this.score -= this.penalties.chainReactionDestroysCorrect;
        this.ui.setMessage(
          `KABOOM! You destroyed the target! -${this.penalties.chainReactionDestroysCorrect}`
        );
        this.ui.disableAllButtons(true);
      } else {
        const bonus = Math.max(
          0,
          doomedBricks.length - this.rewards.chainReactionBonusThreshold
        );

        if (bonus > 0) {
          // It's a real bonus, waive the penalty and add the bonus.
          this.score += bonus;
          this.ui.setMessage(`Chain Reaction! +${bonus} bonus points!`);
        } else {
          // Not enough for a bonus, so apply penalty.
          this.score -= this.penalties.incorrect;
          let message = `Incorrect. -${this.penalties.incorrect} point.`;
          if (doomedBricks.length > 1) {
            message = `Chain Reaction! ${doomedBricks.length} bricks destroyed.`;
          }
          this.ui.setMessage(message);
        }
      }

      this.ui.setScore(this.score);
      doomedBricks.forEach((brick, index) =>
        this._triggerChainReactionAnimation(brick, index * 120)
      );

      if (targetWasHit) {
        setTimeout(() => {
          this.diffInfo = null;
          this.createNewPair();
        }, 4000);
      }
    }
  }

  revealDifference() {
      if (!this.diffMeshes.length || !this.diffInfo) {
        this.ui.setMessage('Generation error! Starting a new puzzle.');
        setTimeout(() => this.createNewPair(), 1500);
        return;
      }

      const rec = this.builderA.getBrickById(this.diffInfo.recId);
      if (!rec) return;

      if (this.cheatCount === undefined) {
        this.cheatCount = 0;
      }
      this.cheatCount++;

      if (this.cheatCount === 1) {
        // Step 1: Temporarily change the button color to the target's color
        const hexColor = '#' + rec.color.toString(16).padStart(6, '0');
        const penalty = Math.min(1, this.penalties.reveal);
        this.score -= penalty;
        this.ui.setScore(this.score);
        this.ui.setMessage(`Cheat Stage 1: Target color active on button! -${penalty} point.`);
        
        this.ui.flashCheatButtonColor(hexColor, 2500);
      } else if (this.cheatCount === 2) {
        // Step 2: Show dimensions/height type on the button in small text
        const typeStr = rec.isPlate ? 'Plate' : 'Block';
        const desc = `${typeStr} ${rec.width}x${rec.length}`;
        const penalty = Math.min(1, this.penalties.reveal);
        this.score -= penalty;
        this.ui.setScore(this.score);
        this.ui.setMessage(`Cheat Stage 2: Target piece size info! -${penalty} point.`);
        
        this.ui.showCheatButtonText(desc, 3000);
      } else {
        // Step 3 (and onward): Show the brief 3D scene flash, then allow continuing play
        const penalty = Math.max(1, this.penalties.reveal - 2);
        this.score -= penalty;
        this.ui.setScore(this.score);
        this.ui.setMessage(`Cheat Stage 3: Target highlighted in scene! -${penalty} points.`);
        
        this.ui.disableAllButtons(true);

        this.animationManager.startFlash(this.diffMeshes, {
          duration: 1.5,
          lift: false,
          color: 0xff00ff, // Vibrant Magenta
          pulseCount: 5,
        });

        setTimeout(() => {
          this.ui.enableAllButtons(true);
          this.ui.enableReveal(true);
          this.ui.setMessage('Solve the puzzle now!');
        }, 1500);
      }
    }

  _clearOldPair() {
    if (this.pivotA && this.pivotB) {
      const isVertical = this.layoutManager.isVerticalMode;
      // Speeds are now determined here and passed to the animation manager
      const speed = isVertical ? 2000 : -2000;
      this.animationManager.startExitAnimation(this.pivotA, speed, isVertical);
      this.animationManager.startExitAnimation(this.pivotB, -speed, isVertical);
    }
    this.pivotA = null;
    this.pivotB = null;
    this.groupA = null;
    this.groupB = null;
    this.builderA = null;
    this._lastT = 0;
  }

  _buildAndFinalizePair() {
      const difficulty = this.ui.getDifficulty();
      const puzzle = this.puzzleManager.buildNewPuzzle(difficulty);

      if (!puzzle) {
        console.error('PuzzleManager failed to create a puzzle. Retrying...');
        this.createNewPair();
        return;
      }

      // Reset the cheat counter for this new puzzle
      this.cheatCount = 0;

      ({
        groupA: this.groupA,
        groupB: this.groupB,
        builderA: this.builderA,
        gridB: this.gridB,
        cloneById: this._cloneById,
        diffInfo: this.diffInfo,
        diffMeshes: this.diffMeshes,
      } = puzzle);

      this.pivotA = new THREE.Group();
      this.pivotB = new THREE.Group();
      this.pivotA.add(this.groupA);
      this.pivotB.add(this.groupB);
      this.scene.add(this.pivotA);
      this.scene.add(this.pivotB);

      this.groupA.rotation.y = 0;
      this.groupB.rotation.y = 0;

      if (this.isSpinPausedByUser) {
        this.spinMode = 'stopped';
        this.ui.setSpinButtonLabel('Start Spin');
      } else {
        this.spinMode = 'spinning';
        this.ui.setSpinButtonLabel('Stop Spin');
      }
      this._relativeSpinState = 'expanding';

      this.ui.showSplash();
      this.ui.animateSplashToPanel();

      this.layoutManager.positionModels(this.pivotA, this.pivotB);

      if (this._isFirstBuild) {
        this.layoutManager.centerCamera(this.pivotA, this.pivotB);
        this._isFirstBuild = false;
      }

      this._lastT = 0;
      this.animationManager.prepareDropAnimation(
        this.builderA.bricks,
        this._cloneById,
        120,
        0.45,
        0.7,
        0.03
      );

      this.ui.enableAllButtons(true);
      this.ui.enableReveal(true);
      this.ui.setMessage('Find and click the one different brick.');
    }

  _angleDiff(a, b) {
    let d = Math.abs(a - b) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  }

  _pickSettleDir() {
    const a = this.groupA.rotation.y;
    const b = this.groupB.rotation.y;
    const step = 0.02;
    const diffPlus = this._angleDiff(a, b + step);
    const diffMinus = this._angleDiff(a, b - step);
    return diffPlus > diffMinus ? 1 : -1;
  }

  _getChainReactionTargets(startRecord) {
    const doomed = new Set();
    const queue = [startRecord];
    const gridClone = this.builderA.grid.clone();
    let targetWasHit = false;

    while (queue.length > 0) {
      const current = queue.shift();
      if (doomed.has(current)) continue;

      doomed.add(current);
      if (this.diffInfo && current.id === this.diffInfo.recId)
        targetWasHit = true;

      gridClone.unmarkStuds(current);
      const orphans = this.builderA._findBricksDirectlyOnTop(current);

      for (const orphan of orphans) {
        if (doomed.has(orphan)) continue;
        const sup = gridClone.getSupportedStuds(
          orphan.anchorX,
          orphan.anchorZ,
          orphan.baseLayer,
          orphan.width,
          orphan.length
        );
        const evalRes = this.supportAnalyzer.evaluateSupport({
          width: orphan.width,
          length: orphan.length,
          supportedCoords: sup.coords,
          anchorX: orphan.anchorX,
          anchorZ: orphan.anchorZ,
        });
        if (!evalRes.ok) queue.push(orphan);
      }
    }
    return { doomedBricks: Array.from(doomed), targetWasHit };
  }

  _triggerChainReactionAnimation(recordToDestroy, delay) {
    setTimeout(() => {
      if (this._activeAnimations > 0) this._activeAnimations--;

      const recA = this.builderA.getBrickById(recordToDestroy.id);
      if (!recA) return;
      const cloneB = this._cloneById.get(recordToDestroy.id);

      let explosionOptions = {};
      if (this.diffInfo && recA.id === this.diffInfo.recId) {
        explosionOptions = {
          count: 150,
          sizeMultiplier: 1.8,
          color: 'rainbow',
        };
        this.animationManager.startFlash(this.diffMeshes, {
          duration: 0.4,
          color: 0xff0000,
          pulseCount: 2,
        });
      }

      this.animationManager.createExplosion(recA.mesh, recA, explosionOptions);
      // FIX: Only create an explosion for the clone if it actually exists in the scene (has a parent).
      // This prevents the double-explosion for 'missing' difference types.
      if (cloneB && cloneB.parent) {
        this.animationManager.createExplosion(cloneB, recA, explosionOptions);
      }

      this.groupA.remove(recA.mesh);
      if (cloneB) this.groupB.remove(cloneB);
      this.builderA.grid.unmarkStuds(recA);
      if (cloneB) {
        const recB = { ...recA, id: 100000 + recA.id };
        this.gridB.unmarkStuds(recB);
      }

      this.builderA.bricks = this.builderA.bricks.filter(
        (b) => b.id !== recA.id
      );
      this._cloneById.delete(recA.id);
    }, delay);
  }

}