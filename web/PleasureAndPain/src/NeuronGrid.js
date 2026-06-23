class NeuronGrid {
    constructor(app) {
      this.app = app;
      this.meshes = [];
      this.sharedMaterial = null;
      this.bbox = null;
      this.maxWarmth = 15;
      this.transitionColors = [];
      
      this.buildTransitionColors();
    }

    buildTransitionColors() {
      const THREE = this.app.THREE;
      const baseBlue = new THREE.Color(0x0055ff);
      const hotOrange = new THREE.Color(0xffaa00);
      
      this.transitionColors = [];
      for (let i = 0; i <= this.maxWarmth; i++) {
        const t = i / this.maxWarmth;
        const color = baseBlue.clone().lerp(hotOrange, t);
        this.transitionColors.push(color);
      }
    }

    build(nx, ny, nz, radius, transparency) {
      const THREE = this.app.THREE;
      this.clear();

      const opacity = 1.0 - transparency;
      const D = 0.16;
      const s_x = D;
      const s_y = D * Math.sqrt(3) / 2;
      const s_z = D * Math.sqrt(2 / 3);

      const positions = [];
      for (let k = 0; k < nz; k++) {
        const z = k * s_z;
        const x_shift = (k % 2 === 0) ? 0 : 0.5 * s_x;
        const y_shift = (k % 2 === 0) ? 0 : s_y / 3;

        for (let j = 0; j < ny; j++) {
          const y_base = j * s_y;
          const x_base = 0.5 * (j % 2) * s_x;

          for (let i = 0; i < nx; i++) {
            const x = (i * s_x) + x_base + x_shift;
            const y = y_base + y_shift;
            positions.push(new THREE.Vector3(x, y, z));
          }
        }
      }

      this.bbox = new THREE.Box3();
      positions.forEach(pos => this.bbox.expandByPoint(pos));
      const center = new THREE.Vector3();
      this.bbox.getCenter(center);

      const vibrantBlue = new THREE.Color(0x0055ff);
      const sphereGeo = new THREE.SphereGeometry(radius, 8, 6);
      
      this.sharedMaterial = new THREE.MeshPhysicalMaterial({
        color: vibrantBlue,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 0.5,
        clearcoatRoughness: 0.1,
        transparent: opacity < 1.0,
        opacity: opacity
      });

      positions.forEach((pos, idx) => {
        const centeredPos = pos.clone().sub(center);
        const mesh = new THREE.Mesh(sphereGeo, this.sharedMaterial);
        mesh.position.copy(centeredPos);
        
        mesh.userData = {
          index: idx,
          gridCoords: {
            i: idx % nx,
            j: Math.floor(idx / nx) % ny,
            k: Math.floor(idx / (nx * ny))
          },
          warmth: 0,
          strength: 1.0,
          originalColor: vibrantBlue.clone(),
          locked: false
        };
        
        this.app.scene.add(mesh);
        this.meshes.push(mesh);
      });
    }

    findAdjacentSpheres(targetMesh) {
      const D = 0.16;
      const minDistance = D * 0.85;
      const maxDistance = D * 1.15;
      const neighbors = [];
      const targetPos = targetMesh.position;

      this.meshes.forEach((mesh) => {
        if (mesh !== targetMesh) {
          const dist = targetPos.distanceTo(mesh.position);
          if (dist >= minDistance && dist <= maxDistance) {
            neighbors.push(mesh);
          }
        }
      });
      return neighbors;
    }

    cool(baseTransparency) {
      const baseOpacity = 1.0 - baseTransparency;
      this.meshes.forEach((mesh) => {
        if (mesh.userData.warmth > 0) {
          mesh.userData.warmth -= 1;
          this.updateNeuronAppearance(mesh, baseOpacity);
        }
      });
    }

    updateNeuronAppearance(mesh, baseOpacity) {
      const THREE = this.app.THREE;
      const warmth = mesh.userData.warmth || 0;
      const strength = mesh.userData.strength !== undefined ? mesh.userData.strength : 1.0;

      mesh.scale.setScalar(strength);

      if (warmth > 0) {
        const tColor = this.transitionColors[warmth];
        mesh.material.color.copy(tColor);
        
        const warmthRatio = warmth / this.maxWarmth;
        const targetOpacity = baseOpacity + (1.0 - baseOpacity) * warmthRatio;
        mesh.material.opacity = targetOpacity * strength;
        mesh.material.transparent = true;

        if (mesh.material.emissive) {
          mesh.material.emissive.copy(tColor);
          mesh.material.emissiveIntensity = warmthRatio * 1.5;
        }
      } else {
        mesh.material.color.copy(mesh.userData.originalColor || new THREE.Color(0x0055ff));
        mesh.material.opacity = baseOpacity * strength;
        mesh.material.transparent = true;

        if (mesh.material.emissive) {
          mesh.material.emissive.setHex(0x000000);
          mesh.material.emissiveIntensity = 0.0;
        }
      }
    }

    clear() {
      if (this.meshes && this.meshes.length > 0) {
        const uniqueGeometries = new Set();
        const uniqueMaterials = new Set();

        this.meshes.forEach((mesh) => {
          this.app.scene.remove(mesh);
          if (mesh.geometry) {
            uniqueGeometries.add(mesh.geometry);
          }
          if (mesh.material) {
            uniqueMaterials.add(mesh.material);
          }
        });

        // Dispose unique assets exactly once
        uniqueGeometries.forEach((geo) => geo.dispose());
        uniqueMaterials.forEach((mat) => {
          if (mat !== this.sharedMaterial) {
            mat.dispose();
          }
        });

        this.meshes = [];
      }

      if (this.sharedMaterial) {
        this.sharedMaterial.dispose();
        this.sharedMaterial = null;
      }
    }
  }