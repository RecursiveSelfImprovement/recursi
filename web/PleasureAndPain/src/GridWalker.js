class GridWalker {
    constructor(app, mainApp) {
      this.app = app;
      this.mainApp = mainApp;
      this.walkerMesh = null;
      this.walkerLight = null;
      this.activeWalker = null;
      this.lastWalkerFrameTime = null;
    }

    ensureWalkerMesh() {
      if (!this.walkerMesh) {
        const THREE = this.app.THREE;
        const geo = new THREE.SphereGeometry(0.04, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffdd44,
          toneMapped: false,
        });
        this.walkerMesh = new THREE.Mesh(geo, mat);
        this.walkerLight = new THREE.PointLight(0xffdd44, 2.5, 1.2, 1.0);
        this.walkerMesh.add(this.walkerLight);
        this.app.scene.add(this.walkerMesh);
      }
    }

    destroy() {
      if (this.walkerMesh) {
        this.app.scene.remove(this.walkerMesh);
        this.walkerMesh = null;
      }
      this.activeWalker = null;
    }

    startFromButton(btn) {
      if (this.activeWalker) {
        this.activeWalker = null;
      }

      // Safeguard: Reset bulb states on each new walk cycle
      if (this.mainApp.bulbInstances) {
        this.mainApp.bulbInstances.forEach((b) => {
          b.isOn = false;
        });
      }

      // Find closest grid neuron to act as Entry Port
      let entryNeuron = null;
      let minDist = Infinity;
      this.mainApp.meshes.forEach((neuron) => {
        const d = neuron.position.distanceTo(btn.group.position);
        if (d < minDist) {
          minDist = d;
          entryNeuron = neuron;
        }
      });

      if (entryNeuron) {
        this.startFromNeuron(entryNeuron);
      }
    }

    startFromNeuron(startNeuron) {
      if (this.activeWalker) {
        this.activeWalker = null;
      }

      // Revert bulb states safely
      if (this.mainApp.bulbInstances) {
        this.mainApp.bulbInstances.forEach((b) => {
          b.isOn = false;
        });
      }

      this.ensureWalkerMesh();

      // Position particle at start position and make visible
      this.walkerMesh.position.copy(startNeuron.position);
      this.walkerMesh.visible = true;

      this.activeWalker = {
        currentNeuron: startNeuron,
        nextNeuron: null,
        history: [startNeuron],
        stepsRemaining: 150,
        lastDirection: null,
        progress: 0.0,
        isMoving: false,
      };

      this.lastWalkerFrameTime = performance.now();

      startNeuron.userData.warmth = 15;
      this.mainApp._applyStrengthAndOpacity();
    }

    rewardPunish(isReward) {
      let count = 0;

      this.mainApp.meshes.forEach((mesh) => {
        const warmth = mesh.userData.warmth || 0;
        if (warmth > 0) {
          count++;
          // High warmth neurons on the path receive the greatest reinforcing delta
          const delta = (warmth / 15.0) * 0.45;
          let strength =
            mesh.userData.strength !== undefined ? mesh.userData.strength : 1.0;

          if (isReward) {
            strength = Math.min(2.5, strength + delta);
          } else {
            strength = Math.max(0.1, strength - delta);
          }
          mesh.userData.strength = strength;
        }
      });

      this.mainApp._applyStrengthAndOpacity();
      return count;
    }

    update() {
      const THREE = this.app.THREE;
      if (!this.activeWalker) {
        this.lastWalkerFrameTime = null;
        return;
      }

      const walker = this.activeWalker;
      const clock = performance.now();
      if (!this.lastWalkerFrameTime) this.lastWalkerFrameTime = clock;
      const dt = clock - this.lastWalkerFrameTime;
      this.lastWalkerFrameTime = clock;

      if (!walker.isMoving) {
        const next = this._chooseNextNeuron(walker);
        if (!next) {
          // Signal died out or finished
          if (this.walkerMesh) this.walkerMesh.visible = false;
          this.activeWalker = null;
          return;
        } else {
          walker.nextNeuron = next;
          walker.progress = 0.0;
          walker.isMoving = true;
        }
      }

      if (this.activeWalker && walker.isMoving && walker.nextNeuron) {
        // Travel duration in milliseconds maps directly to Speed slider
        const duration = Math.max(10, this.mainApp.speed);
        walker.progress += dt / duration;

        if (walker.progress >= 1.0) {
          walker.progress = 1.0;
        }

        if (this.walkerMesh) {
          this.walkerMesh.position.lerpVectors(
            walker.currentNeuron.position,
            walker.nextNeuron.position,
            walker.progress
          );
        }

        if (walker.progress >= 1.0) {
          const completedNeuron = walker.nextNeuron;
          completedNeuron.userData.warmth = 15;
          walker.history.push(completedNeuron);
          this.mainApp._applyStrengthAndOpacity();

          // Check proximity to perimeter Bulb
          let reachedBulb = null;
          const closestBulbDist = 1.2;
          this.mainApp.bulbInstances.forEach((bulb) => {
            const dist = bulb.group.position.distanceTo(
              completedNeuron.position
            );
            if (dist < closestBulbDist) {
              reachedBulb = bulb;
            }
          });

          if (reachedBulb) {
            reachedBulb.isOn = true;
            this.mainApp._playSwitchSound(true);
            if (this.walkerMesh) this.walkerMesh.visible = false;
            this.activeWalker = null;
          } else {
            walker.lastDirection = completedNeuron.position
              .clone()
              .sub(walker.currentNeuron.position)
              .normalize();
            walker.currentNeuron = completedNeuron;
            walker.isMoving = false;
            walker.stepsRemaining--;
            walker.nextNeuron = null;
          }
        }
      }
    }

    _chooseNextNeuron(walker) {
      const current = walker.currentNeuron;
      let neighbors = this.mainApp.findAdjacentSpheres(current);

      // Anti-fizzle: if strict close-packed bounds find no neighbors, search slightly wider
      if (neighbors.length === 0) {
        const D = 0.16;
        const targetPos = current.position;
        this.mainApp.meshes.forEach((mesh) => {
          if (mesh !== current) {
            const dist = targetPos.distanceTo(mesh.position);
            if (dist > 0.02 && dist < D * 1.5) {
              neighbors.push(mesh);
            }
          }
        });
      }

      if (neighbors.length === 0 || walker.stepsRemaining <= 0) {
        return null;
      }

      let totalWeight = 0;
      const candidates = [];

      neighbors.forEach((neighbor) => {
        let strength =
          neighbor.userData.strength !== undefined
            ? neighbor.userData.strength
            : 1.0;
        const warmth = neighbor.userData.warmth || 0;

        // Self-avoidance penalty
        if (warmth > 10) {
          strength /= 2.0;
        }

        // Backtrack heading penalty
        if (walker.lastDirection) {
          const dirToNeighbor = neighbor.position
            .clone()
            .sub(current.position)
            .normalize();
          if (walker.lastDirection.dot(dirToNeighbor) < -0.5) {
            strength /= 1.7;
          }
        }

        const weight = Math.pow(strength, this.mainApp.weightPow);
        if (weight > 0) {
          totalWeight += weight;
          candidates.push({ mesh: neighbor, cumulative: totalWeight });
        }
      });

      // Anti-fizzle: if severe penalties sum weights to 0, fallback to raw strengths without penalties
      if (totalWeight === 0) {
        neighbors.forEach((neighbor) => {
          const strength =
            neighbor.userData.strength !== undefined
              ? neighbor.userData.strength
              : 1.0;
          const weight = Math.pow(strength, 2.0);
          totalWeight += weight;
          candidates.push({ mesh: neighbor, cumulative: totalWeight });
        });
      }

      if (totalWeight === 0) {
        return null;
      }

      const roll = Math.random() * totalWeight;
      let selected = candidates[0].mesh;
      for (const cand of candidates) {
        if (roll <= cand.cumulative) {
          selected = cand.mesh;
          break;
        }
      }

      return selected;
    }
  }