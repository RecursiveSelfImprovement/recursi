class Simple3dShapes {
    

  

  static buildHexagonalGrid(app, nx, ny, nz, radius, opacity = 0.4) {
      const THREE = app.THREE;
      const meshes = [];

      // Fixed center-to-center spacing for the neuron grid layout
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

      const bbox = new THREE.Box3();
      positions.forEach(pos => bbox.expandByPoint(pos));
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      // Saturated vibrant bright blue for standard state
      const vibrantBlue = new THREE.Color(0x0055ff);
      
      const sphereGeo = new THREE.SphereGeometry(radius, 10, 8);
      const sphereMat = new THREE.MeshPhysicalMaterial({
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
        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        mesh.position.copy(centeredPos);
        mesh.userData = {
          index: idx,
          gridCoords: {
            i: idx % nx,
            j: Math.floor(idx / nx) % ny,
            k: Math.floor(idx / (nx * ny))
          },
          originalColor: vibrantBlue.clone(),
          locked: false
        };
        app.scene.add(mesh);
        meshes.push(mesh);
      });

      return { meshes, bbox, sharedMaterial: sphereMat };
    }
}