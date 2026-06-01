class Simple3dShapes {
    static buildPrimitives(app, scene) {
      const meshes = [];
      const THREE = app.THREE;
      const glossyMat = new THREE.MeshPhysicalMaterial({
        metalness: 0,
        roughness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0,
        envMapIntensity: 1,
      });

      const S = 0.8;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(S, S, S), glossyMat.clone());
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(S * 0.7, 64, 32), glossyMat.clone());
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.4, S * 0.4, S, 64), glossyMat.clone());

      [cube, sphere, cylinder].forEach((m) => {
        m.geometry.computeBoundingBox();
        const h = m.geometry.boundingBox.max.y - m.geometry.boundingBox.min.y;
        m.position.y = h * 0.5;
        m.userData.locked = false;
      });

      const r = 0.8;
      [cube, sphere, cylinder].forEach((m, i) => {
        const ang = i * ((2 * Math.PI) / 3);
        m.position.x = r * Math.cos(ang);
        m.position.z = r * Math.sin(ang);
        scene.add(m);
        meshes.push(m);
      });

      const grid = new THREE.GridHelper(6, 12, 0x444444, 0x222222);
      grid.visible = false;
      scene.add(grid);
      
      return { meshes, grid };
    }

  
}