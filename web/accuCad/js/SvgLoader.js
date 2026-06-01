
class SvgLoader {
  static async loadSVGFromFile(scene, filePath, options = {}) {
    const {
      extrudeDepth = 10,
      material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      }),
      scale = 0.005,
      position = { x: 0, y: 0, z: 0 },
    } = options;

    try {
      const response = await fetch(filePath);
      if (!response.ok)
        throw new Error(`Failed to load SVG: ${response.status}`);
      const svgString = await response.text();

      const loader = new SVGLoader();
      const svgData = loader.parse(svgString);
      const objectGroups = [];

      svgData.paths.forEach((path) => {
        const shapes = SVGLoader.createShapes(path);
        shapes.forEach((shape) => {
          const extrudeSettings = {
            depth: extrudeDepth,
            bevelEnabled: false,
            steps: 1,
          };

          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const capGeometryFront = new THREE.ShapeGeometry(shape);
          const capGeometryBack = new THREE.ShapeGeometry(shape);
          capGeometryBack.translate(0, 0, extrudeDepth);

          const extrudedMesh = new THREE.Mesh(geometry, material);
          const frontCap = new THREE.Mesh(capGeometryFront, material);
          const backCap = new THREE.Mesh(capGeometryBack, material);
          frontCap.scale.set(1, 1, -1);

          const objectGroup = new THREE.Group();
          objectGroup.add(extrudedMesh, frontCap, backCap);

          objectGroup.scale.set(scale, scale, scale);
          objectGroup.rotation.x = Math.PI / 2;
          objectGroup.position.set(position.x, position.y, position.z);

          objectGroups.push(objectGroup);
          scene.add(objectGroup);
        });
      });

      return objectGroups;
    } catch (error) {
      console.error('Error loading SVG:', error);
      return [];
    }
  }

}

