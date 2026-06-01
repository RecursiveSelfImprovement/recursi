class ModelLoader {
    static loadGLB(file, app, feedbackElement, onParsed) {
      const THREE = app.THREE;
      const reader = new FileReader();
      reader.onload = (event) => {
        const contents = event.target.result;
        feedbackElement.textContent = 'Loading...';
        app.loaders.gltf.parse(
          contents,
          '',
          (gltf) => {
            const loadedModel = gltf.scene;
            const box = new THREE.Box3().setFromObject(loadedModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z);
            const scale = 1.5 / maxSize;

            loadedModel.scale.set(scale, scale, scale);
            box.setFromObject(loadedModel);
            box.getCenter(center);
            loadedModel.position.sub(center);

            if (onParsed) onParsed(loadedModel);
            feedbackElement.textContent = file.name + ' loaded.';
          },
          (error) => {
            console.error('Error parsing GLB', error);
            feedbackElement.textContent = 'Error loading GLB.';
          }
        );
      };
      reader.onerror = (error) => {
        console.error('Error reading file', error);
        feedbackElement.textContent = 'Error reading file.';
      };
      reader.readAsArrayBuffer(file);
    }

    static clearSceneGeometry(app, meshes, loadedModel) {
      if (loadedModel) {
        app.remove(loadedModel);
      }
      meshes.forEach((mesh) => {
        app.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      meshes.length = 0;
    }

  
}