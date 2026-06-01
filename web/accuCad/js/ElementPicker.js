
class ElementPickCommand {
  constructor(baseController) {
    this.base = baseController;
    this.loadedModelGroup = this.base.loadedModelGroup || null;
    this.resetTimeout = null;
    this.selectedElement = null;
    this.highlightOverlay = null; // Used for non-CAD highlights
    this.originalMaterials = null; // Stores original materials for restoration
    this.originalObject = null; // Reference to the object being highlighted
  }

  onPoint(data) {
    // This command is activated on hover, so we route to onMouseMove.
    this.onMouseMove(data);
  }

  onMouseMove(data) {
    const event = data.event;
    if (!event) return;

    const canvasRect = this.base.domElement.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) return;

    const mouse = new THREE.Vector2(
      ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
      -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1
    );

    const camera = this.base.view.camera;
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.1;
    raycaster.setFromCamera(mouse, camera);

    const candidateObjects = this.buildCandidateObjects();
    const intersections = raycaster.intersectObjects(candidateObjects, true); // true for recursive

    if (intersections.length === 0) {
      return; // Keep current selection if nothing new is hovered
    }

    const intersection = intersections[0];
    const pickedObject = intersection.object;

    // Avoid re-picking the same object unnecessarily
    if (this.originalObject === pickedObject) {
      this.resetHighlightTimeout();
      return;
    }

    let pickedElement = this.findPickedElement(pickedObject);
    if (!pickedElement && pickedObject) {
      pickedElement = { threejsObject: pickedObject, type: 'raw_mesh' };
    }

    if (pickedElement) {
      this.applyHighlight(pickedElement, 0xffff00);
      const newOrigin = this.calculateNewOrigin(pickedElement, intersection);
      if (newOrigin) {
        this.base.setOrigin(newOrigin);
      }
    }
  }

  buildCandidateObjects() {
    const candidates = [];
    if (this.base.cadElements) {
      this.base.cadElements.forEach((el) => {
        if (
          el.threejsObject &&
          el.threejsObject.userData.isPickable !== false
        ) {
          candidates.push(el.threejsObject);
        }
      });
    }
    if (this.loadedModelGroup) {
      this.loadedModelGroup.traverse((child) => {
        if (
          (child.isMesh || child.isLine) &&
          child.userData.isPickable !== false
        ) {
          candidates.push(child);
        }
      });
    }
    return candidates;
  }

  findPickedElement(pickedObject) {
    if (!this.base.cadElements) return null;
    return (
      this.base.cadElements.find((el) => {
        if (!el.threejsObject) return false;
        let found = false;
        el.threejsObject.traverse((child) => {
          if (child === pickedObject) found = true;
        });
        return found;
      }) || null
    );
  }

  calculateNewOrigin(pickedElement, intersection) {
    // Simplified logic: just use the intersection point
    return [intersection.point.x, intersection.point.y, intersection.point.z];
  }

  applyHighlight(element, highlightColor) {
    this.removeHighlight(); // Clear previous highlight

    this.selectedElement = element;
    this.originalObject = element.threejsObject;
    this.originalMaterials = [];

    this.originalObject.traverse((child) => {
      if (child.isMesh && child.material) {
        const originalMaterial = child.material;
        this.originalMaterials.push({
          object: child,
          material: originalMaterial,
        });

        const highlightMaterial = originalMaterial.clone();
        highlightMaterial.emissive = new THREE.Color(highlightColor);
        highlightMaterial.emissiveIntensity = 0.6;
        highlightMaterial.wireframe = true; // Simple wireframe highlight
        child.material = highlightMaterial;
      }
    });

    this.resetHighlightTimeout();
  }

  removeHighlight() {
    if (this.originalMaterials) {
      this.originalMaterials.forEach((item) => {
        item.object.material = item.material;
      });
    }
    this.originalMaterials = null;
    this.originalObject = null;
    this.selectedElement = null;
  }

  resetHighlightTimeout() {
    if (this.resetTimeout) clearTimeout(this.resetTimeout);
    this.resetTimeout = setTimeout(() => {
      this.removeHighlight();
    }, 5000); // Reset after 5 seconds of inactivity
  }

  getSelectedElement(retainSelection = false) {
    const element = this.selectedElement;
    if (!retainSelection) {
      if (this.resetTimeout) clearTimeout(this.resetTimeout);
      this.removeHighlight();
    }
    return element;
  }

  dumpElementInfo() {
    if (!this.selectedElement || !this.selectedElement.threejsObject) {
      console.log('No element selected to analyze');
      return;
    }

    const obj = this.selectedElement.threejsObject;
    console.log('=============== ELEMENT DIAGNOSTIC INFO ===============');
    console.log('Object name:', obj.name);
    console.log('Object type:', obj.type);
    console.log('UUID:', obj.uuid);

    // Basic object properties
    console.log('\n--- Basic Properties ---');
    console.log('Visible:', obj.visible);
    console.log('Renderable:', obj.visible && obj.material && obj.geometry);
    console.log('Matrix Auto Update:', obj.matrixAutoUpdate);
    console.log('Position:', obj.position);
    console.log('Rotation:', obj.rotation);
    console.log('Scale:', obj.scale);
    console.log('Matrix World:', obj.matrixWorld);

    // Hierarchy info
    console.log('\n--- Hierarchy Info ---');
    console.log('Has parent:', !!obj.parent);
    if (obj.parent) console.log('Parent type:', obj.parent.type);
    console.log('Child count:', obj.children.length);

    // Geometry info
    console.log('\n--- Geometry Info ---');
    if (obj.geometry) {
      console.log('Geometry type:', obj.geometry.type);
      console.log(
        'Vertex count:',
        obj.geometry.attributes.position
          ? obj.geometry.attributes.position.count
          : 'N/A'
      );
      console.log('Has indices:', !!obj.geometry.index);
      console.log('Geometry attributes:', Object.keys(obj.geometry.attributes));
      console.log('Bounding box:', obj.geometry.boundingBox);
    } else {
      console.log('No geometry found at top level');
    }

    // Material info
    console.log('\n--- Material Info ---');
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        console.log('Has multiple materials:', obj.material.length);
        obj.material.forEach((mat, i) => {
          console.log(`Material ${i} type:`, mat.type);
          console.log(
            `Material ${i} wireframe compatible:`,
            mat.isMeshBasicMaterial ||
              mat.isMeshLambertMaterial ||
              mat.isMeshPhongMaterial ||
              mat.isMeshStandardMaterial
          );
        });
      } else {
        console.log('Material type:', obj.material.type);
        console.log(
          'Wireframe compatible:',
          obj.material.isMeshBasicMaterial ||
            obj.material.isMeshLambertMaterial ||
            obj.material.isMeshPhongMaterial ||
            obj.material.isMeshStandardMaterial
        );
        console.log('Has vertex colors:', !!obj.material.vertexColors);
        console.log('Is transparent:', obj.material.transparent);
      }
    } else {
      console.log('No material found at top level');
    }

    // Children examination
    console.log('\n--- Child Objects Analysis ---');
    let hasRenderableMeshes = false;
    let meshCount = 0;
    obj.traverse((child) => {
      if (child.isMesh && child !== obj) {
        meshCount++;
        if (child.visible && child.material && child.geometry) {
          hasRenderableMeshes = true;
          console.log(`Child mesh ${meshCount}:`, child.name || child.uuid);
          console.log(`  - Geometry:`, child.geometry.type);
          console.log(
            `  - Vertices:`,
            child.geometry.attributes.position
              ? child.geometry.attributes.position.count
              : 'N/A'
          );
          console.log(
            `  - Material:`,
            Array.isArray(child.material)
              ? `Multiple (${child.material.length})`
              : child.material.type
          );
        }
      }
    });
    console.log('Total child meshes:', meshCount);
    console.log('Has renderable child meshes:', hasRenderableMeshes);

    // Additional diagnostics for problem detection
    console.log('\n--- Problem Detection ---');
    const potentialIssues = [];

    // Check for empty geometries
    let hasEmptyGeometry = false;
    obj.traverse((child) => {
      if (
        child.geometry &&
        (!child.geometry.attributes.position ||
          child.geometry.attributes.position.count === 0)
      ) {
        hasEmptyGeometry = true;
      }
    });
    if (hasEmptyGeometry) potentialIssues.push('Contains empty geometries');

    // Check for unusual scales
    let hasUnusualScale = false;
    obj.traverse((child) => {
      if (
        child.scale.x < 0.0001 ||
        child.scale.y < 0.0001 ||
        child.scale.z < 0.0001 ||
        child.scale.x > 10000 ||
        child.scale.y > 10000 ||
        child.scale.z > 10000
      ) {
        hasUnusualScale = true;
      }
    });
    if (hasUnusualScale)
      potentialIssues.push('Contains unusually large or small scales');

    // Check for unusual materials
    let hasUnusualMaterial = false;
    obj.traverse((child) => {
      if (
        child.material &&
        !(
          child.material.isMeshBasicMaterial ||
          child.material.isMeshLambertMaterial ||
          child.material.isMeshPhongMaterial ||
          child.material.isMeshStandardMaterial ||
          child.material.isLineBasicMaterial ||
          child.material.isPointsMaterial
        )
      ) {
        hasUnusualMaterial = true;
      }
    });
    if (hasUnusualMaterial)
      potentialIssues.push('Contains unusual materials (e.g., custom shaders)');

    if (potentialIssues.length === 0) {
      console.log('No obvious issues detected');
    } else {
      console.log('Potential issues found:', potentialIssues);
    }

    console.log('=============== END DIAGNOSTIC INFO ===============');
  }
}

