class AnimationManager {
  constructor({ scene, legoFactory }) {
    this.scene = scene;
    this.legoFactory = legoFactory;

    this._fallQueue = [];
    this._flashQueue = [];
    this._particleQueue = [];
    this._exitQueue = [];
  }

  update(dt) {
    if (this._fallQueue.length) this._animateFalls(dt);
    if (this._flashQueue.length) this._animateFlashes(dt);
    if (this._particleQueue.length) this._animateParticles(dt);
    if (this._exitQueue.length) this._animateExits(dt);
  }

  startFlash(meshes, config = {}) {
    const {
      duration: durationSec = 2.0,
      lift: liftAndScale = false,
      color: flashColor = 'rainbow',
      pulseCount = 6,
    } = config;

    meshes = meshes.filter(Boolean);
    if (meshes.length === 0) return;

    meshes.forEach((m) => {
      m.userData._origY = m.position.y;
      m.userData._origScale = m.scale.clone();
      m.traverse((ch) => {
        if (ch.isMesh) {
          ch.userData._origEm = ch.material.emissive
            ? ch.material.emissive.clone()
            : new THREE.Color(0x000000);
          if (!ch.material.emissive)
            ch.material.emissive = new THREE.Color(0x000000);
        }
      });
    });
    this._flashQueue.push({
      meshes,
      t: 0,
      dur: durationSec,
      lift: liftAndScale,
      color: flashColor,
      pulses: pulseCount,
    });
  }

  prepareDropAnimation(
    bricks,
    clonesById,
    dropH = 120,
    minDur = 0.45,
    maxDur = 0.7,
    staggerSec = 0.03
  ) {
    const sortedBricks = bricks
      .slice()
      .sort((a, b) => a.baseLayer - b.baseLayer);

    let idx = 0;
    const queueOne = (mesh) => {
      if (!mesh) return;
      mesh.visible = false;
      const targetY = mesh.position.y;
      mesh.position.y = targetY + dropH;
      this._fallQueue.push({
        mesh,
        startY: mesh.position.y,
        targetY,
        t: 0,
        dur: minDur + Math.random() * (maxDur - minDur),
        delay: idx * staggerSec,
      });
      idx++;
    };

    for (const rec of sortedBricks) {
      queueOne(rec.mesh);
      const clone = clonesById.get(rec.id);
      if (clone) queueOne(clone);
    }
  }

  createExplosion(mesh, record, options = {}) {
    const { count = 25, sizeMultiplier = 1.0, color = record.color } = options;

    const spacing = this.legoFactory.STUD_SPACING;
    const widthMM = record.width * spacing;
    const lengthMM = record.length * spacing;
    const heightMM = record.isPlate
      ? this.legoFactory.PLATE_THICKNESS
      : this.legoFactory.BRICK_HEIGHT;

    const worldPos = mesh.getWorldPosition(new THREE.Vector3());
    const worldRot = mesh.getWorldQuaternion(new THREE.Quaternion());

    let singleMaterial = null;
    if (color !== 'rainbow') {
      singleMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.4,
      });
    }

    const geoTypes = ['box', 'sphere', 'cone'];

    for (let i = 0; i < count; i++) {
      const baseSize = (1.5 + Math.random() * 2.0) * sizeMultiplier;
      let chunkGeo;

      const type = geoTypes[Math.floor(Math.random() * geoTypes.length)];
      switch (type) {
        case 'sphere':
          chunkGeo = new THREE.SphereGeometry(baseSize * 0.7, 8, 6);
          break;
        case 'cone':
          chunkGeo = new THREE.ConeGeometry(baseSize * 0.6, baseSize * 1.2, 16);
          break;
        default: // 'box'
          const w = baseSize;
          const h = baseSize * (1 + Math.random()); // Height up to 2x width
          const d = baseSize * (1 + Math.random()); // Depth up to 2x width
          chunkGeo = new THREE.BoxGeometry(w, h, d);
          break;
      }

      let chunkMat;
      if (singleMaterial) {
        chunkMat = singleMaterial;
      } else {
        chunkMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
          metalness: 0.1,
          roughness: 0.4,
        });
      }

      const chunk = new THREE.Mesh(chunkGeo, chunkMat);

      const localOffset = new THREE.Vector3(
        (Math.random() - 0.5) * widthMM,
        (Math.random() - 0.5) * heightMM,
        (Math.random() - 0.5) * lengthMM
      );
      localOffset.applyQuaternion(worldRot);
      chunk.position.copy(worldPos).add(localOffset);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 40 * sizeMultiplier,
        (Math.random() * 0.5 + 0.2) * 50 * sizeMultiplier,
        (Math.random() - 0.5) * 40 * sizeMultiplier
      );

      const rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );

      const life = (Math.random() * 1.5 + 0.5) * (1 + sizeMultiplier * 0.5);

      this.scene.add(chunk);
      this._particleQueue.push({
        mesh: chunk,
        velocity: velocity,
        rotationSpeed: rotationSpeed,
        lifespan: life,
        initialLifespan: life,
      });
    }
  } // end createExplosion

  startExitAnimation(pivot, speed, isVertical) {
    if (!pivot) return;

    const lifespan = 0.5;
    // This now correctly queues a single animation per pivot.
    this._exitQueue.push({
      pivot,
      speed,
      lifespan: lifespan,
      initialLifespan: lifespan,
      wasVertical: isVertical,
    });
  } // end startExitAnimation

  // --- Private Animation Implementations ---

  _animateFalls(dt) {
    for (let i = this._fallQueue.length - 1; i >= 0; i--) {
      const a = this._fallQueue[i];
      if (a.delay > 0) {
        a.delay -= dt;
        continue;
      }
      if (!a.mesh.visible) {
        a.mesh.visible = true;
      }
      a.t += dt / a.dur;
      const k = Math.min(1, a.t);
      const eased = 1 - Math.pow(1 - k, 3); // easeOutCubic
      a.mesh.position.y = a.startY + (a.targetY - a.startY) * eased;
      if (k === 1) {
        this._fallQueue.splice(i, 1);
      }
    }
  }

  _animateFlashes(dt) {
    for (let i = this._flashQueue.length - 1; i >= 0; i--) {
      const f = this._flashQueue[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      const pulse = Math.sin(k * Math.PI * f.pulses) * 0.5 + 0.5;

      let col;
      if (f.color === 'rainbow') {
        col = new THREE.Color().setHSL((f.t * 0.5) % 1, 1, 0.5);
      } else {
        col = new THREE.Color(f.color);
      }

      f.meshes.forEach((m) => {
        if (f.lift) {
          m.position.y = m.userData._origY + 10 * pulse;
          const s = 1 + 0.15 * pulse;
          m.scale.set(
            m.userData._origScale.x * s,
            m.userData._origScale.y * s,
            m.userData._origScale.z * s
          );
        }
        m.traverse((ch) => {
          if (ch.isMesh && ch.material.emissive) {
            ch.material.emissive.copy(ch.userData._origEm).lerp(col, pulse);
          }
        });
      });

      if (k >= 1) {
        f.meshes.forEach((m) => {
          m.position.y = m.userData._origY;
          m.scale.copy(m.userData._origScale);
          delete m.userData._origY;
          delete m.userData._origScale;
          m.traverse((ch) => {
            if (ch.isMesh && ch.userData._origEm) {
              ch.material.emissive.copy(ch.userData._origEm);
              delete ch.userData._origEm;
            }
          });
        });
        this._flashQueue.splice(i, 1);
      }
    }
  }

  _animateParticles(dt) {
    const gravity = new THREE.Vector3(0, -30.0, 0);
    for (let i = this._particleQueue.length - 1; i >= 0; i--) {
      const p = this._particleQueue[i];
      p.lifespan -= dt;

      if (p.lifespan <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        const material = p.mesh.material;
        // Only dispose material if it's the last particle using it (for non-rainbow explosions)
        const isLastUser = !this._particleQueue.some(
          (other, index) => index !== i && other.mesh.material === material
        );
        if (isLastUser) {
          material.dispose();
        }
        this._particleQueue.splice(i, 1);
      } else {
        // Apply physics
        p.velocity.add(gravity.clone().multiplyScalar(dt));
        p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));

        // Apply rotation
        p.mesh.rotation.x += p.rotationSpeed.x * dt;
        p.mesh.rotation.y += p.rotationSpeed.y * dt;
        p.mesh.rotation.z += p.rotationSpeed.z * dt;

        // Apply fade out
        if (p.mesh.material.transparent === false) {
          p.mesh.material.transparent = true;
        }
        p.mesh.material.opacity = Math.max(0, p.lifespan / p.initialLifespan);
      }
    }
  } // end _animateParticles

  _animateExits(dt) {
    for (let i = this._exitQueue.length - 1; i >= 0; i--) {
      const item = this._exitQueue[i];
      item.lifespan -= dt;

      if (item.lifespan <= 0) {
        // Animation finished, clean up the old objects.
        this.scene.remove(item.pivot);
        item.pivot.traverse((o) => {
          o.geometry?.dispose?.();
          if (o.material) {
            Array.isArray(o.material)
              ? o.material.forEach((m) => m.dispose())
              : o.material.dispose();
          }
        });
        this._exitQueue.splice(i, 1);
      } else {
        // Calculate progress from 0 to 1
        const k = 1.0 - item.lifespan / item.initialLifespan;
        // Use an easing function for smoother motion
        const easedK = k * k; // easeInQuad

        // Animate position
        const moveDelta = item.speed * dt;
        if (item.wasVertical) {
          item.pivot.position.y += moveDelta;
        } else {
          item.pivot.position.x += moveDelta;
        }

        // --- THE COOL PART ---
        // Animate scale to shrink the models as they exit
        const scale = 1.0 - easedK;
        item.pivot.scale.set(scale, scale, scale);
      }
    }
  }

}