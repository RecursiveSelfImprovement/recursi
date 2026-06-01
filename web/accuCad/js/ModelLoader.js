
class ModelLoader {
  static initStatics() {
    if (this._staticsInitialized) return;
    this.currentModel = null;
    this._staticsInitialized = true;
  }

  static loadGLBModel(scene, bounds = {min: {x: -4, y: 0, z: -4}, max: {x: 4, y: 7, z: 4}}, preserveExisting) {
    this.initStatics();
    if (!scene) {
      console.error('loadGLBModel: A valid scene object must be provided.');
      return;
    }

    // Lazy load the DRACO and GLTF loaders using the globally exposed classes
    // This prevents "THREE/DRACOLoader is not defined" at parsing time.
    if (!this.dracoLoader) {
      this.dracoLoader = new globalThis.DRACOLoader().setDecoderPath(
        'https://recursi.dev/thirdparty/three-js-r153/examples/jsm/libs/draco/gltf/'
      );
    }
    if (!this.gltfLoader) {
      this.gltfLoader = new globalThis.GLTFLoader().setDRACOLoader(this.dracoLoader);
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.glb';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.click();

    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) {
        document.body.removeChild(fileInput);
        return;
      }

      const fileURL = URL.createObjectURL(file);

      this.gltfLoader.load(
        fileURL,
        (gltf) => {
          if (this.currentModel && !preserveExisting) {
            scene.remove(this.currentModel);
          }

          const model = gltf.scene;
          this.currentModel = model;

          const boundingBox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          boundingBox.getSize(size);

          const targetSize = {
            x: bounds.max.x - bounds.min.x,
            y: bounds.max.y - bounds.min.y,
            z: bounds.max.z - bounds.min.z,
          };

          const scale = Math.min(
            targetSize.x / size.x,
            targetSize.y / size.y,
            targetSize.z / size.z
          );

          model.scale.set(scale, scale, scale);
          const scaledBox = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          scaledBox.getCenter(center);

          const targetCenter = new THREE.Vector3(
            (bounds.min.x + bounds.max.x) / 2,
            bounds.min.y,
            (bounds.min.z + bounds.max.z) / 2
          );

          model.position.set(
            targetCenter.x - center.x,
            targetCenter.y - (scaledBox.min.y - model.position.y),
            targetCenter.z - center.z
          );

          scene.add(model);
          console.log(`Model "${file.name}" loaded and scaled to fit bounds`);

          URL.revokeObjectURL(fileURL);
          document.body.removeChild(fileInput);
        },
        (xhr) => {
          console.log(`${((xhr.loaded / xhr.total) * 100).toFixed(2)}% loaded`);
        },
        (error) => {
          console.error('Error loading model:', error);
          URL.revokeObjectURL(fileURL);
          document.body.removeChild(fileInput);
        }
      );
    });

    fileInput.addEventListener('cancel', () => {
      document.body.removeChild(fileInput);
    });
  }

  static removeGLBModel(scene) {
    if (!scene) {
      console.error(
        'removeGLBModel: A valid scene object must be provided.'
      );
      return false;
    }
    if (this.currentModel) {
      scene.remove(this.currentModel);
      this.currentModel = null;
      return true;
    }
    return false;
  }

}

