
class ElementOperations {
  static initStatics() {
    if (this._staticsInitialized) return;
    this.materialSettings = { materialType: 'physical', metalness: 0.0, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1, removeTextures: true, color: null, scope: 'all' };
    this._staticsInitialized = true;
  }
  
  static deleteElement(element, cadElements) {
    if (!element || !element.threejsObject) {
      console.warn('No valid element provided for deletion');
      return;
    }
    const threejsObject = element.threejsObject;
    if (threejsObject.parent) {
      threejsObject.parent.remove(threejsObject);
    }
    if (cadElements) {
      const index = cadElements.indexOf(element);
      if (index !== -1) cadElements.splice(index, 1);
    }
  }

  static wireframeElement(element, options = {}) {
    const defaultOptions = {
      showEdgesOnly: true,
      lineColor: 0xffffff,
      lineWidth: 1,
      preserveOriginal: false,
      opacity: 1.0,
    };
    const settings = { ...defaultOptions, ...options };

    if (!element || !element.threejsObject) {
      console.warn('No valid element provided for wireframe conversion');
      return;
    }

    const object = element.threejsObject;
    let wireframeCreated = false;

    function processObject(obj) {
      if (obj.type === 'Group' || obj.type === 'Object3D') {
        obj.children.forEach((child) => processObject(child));
      } else if (obj.type === 'Mesh') {
        if (settings.showEdgesOnly) {
          try {
            const edges = new THREE.EdgesGeometry(obj.geometry);
            const wireMaterial = new THREE.LineBasicMaterial({
              color: settings.lineColor,
              linewidth: settings.lineWidth,
              opacity: settings.opacity,
              transparent: settings.opacity < 1.0,
            });
            const line = new THREE.LineSegments(edges, wireMaterial);
            const parent = obj.parent;
            obj.updateWorldMatrix(true, false);
            const worldTransform = obj.matrixWorld.clone();

            if (parent) {
              parent.add(line);
              const parentWorldInverse = new THREE.Matrix4();
              parent.updateWorldMatrix(true, false);
              parentWorldInverse.copy(parent.matrixWorld).invert();
              const localMatrix = worldTransform
                .clone()
                .premultiply(parentWorldInverse);
              line.matrix.copy(localMatrix);
              line.matrix.decompose(line.position, line.quaternion, line.scale);
            } else {
              object.parent.add(line);
              line.matrix.copy(worldTransform);
              line.matrix.decompose(line.position, line.quaternion, line.scale);
            }

            line.matrixAutoUpdate = true;
            if (settings.preserveOriginal) {
              obj.visible = false;
            } else if (obj.parent) {
              obj.parent.remove(obj);
            }
            wireframeCreated = true;
          } catch (e) {
            console.error('Error creating wireframe:', e);
          }
        } else {
          try {
            obj.userData.originalMaterial = obj.material;
            obj.material = new THREE.MeshBasicMaterial({
              wireframe: true,
              color: settings.lineColor,
              opacity: settings.opacity,
              transparent: settings.opacity < 1.0,
            });
            wireframeCreated = true;
          } catch (e) {
            console.error('Error applying wireframe material:', e);
          }
        }
      }
    }

    try {
      processObject(object);
      if (!wireframeCreated) {
        console.warn('No meshes found to convert to wireframe');
      }
    } catch (e) {
      console.error('Error in wireframe conversion:', e);
    }
  }

  static applyMaterials(element, settings = {}) {
    this.initStatics();
    const mergedSettings = {
      ...ElementOperations.materialSettings,
      ...settings,
    };
    if (!element || !element.threejsObject) {
      console.warn('No valid element provided for material application');
      return;
    }

    const object = element.threejsObject;
    const color = mergedSettings.color
      ? new THREE.Color(parseInt(mergedSettings.color.replace('#', ''), 16))
      : new THREE.Color().setHSL(Math.random(), 1.0, 0.5);

    let targets = [];
    if (mergedSettings.scope === 'single') {
      if (object.isMesh) {
        targets = [object];
      } else {
        console.warn('Selected element is not a mesh for single scope');
        return;
      }
    } else {
      targets = [];
      object.traverse((child) => {
        if (child.isMesh) targets.push(child);
      });
    }

    targets.forEach((mesh) => {
      if (mesh.material) {
        let newMaterial;
        if (mergedSettings.materialType === 'physical') {
          newMaterial = new THREE.MeshPhysicalMaterial({});
        } else {
          newMaterial = new THREE.MeshStandardMaterial({});
        }

        const oldMaterial = mesh.material;
        mesh.material = newMaterial;
        if (oldMaterial.dispose) oldMaterial.dispose();

        if (mergedSettings.removeTextures) {
          for (let prop in newMaterial) {
            if (newMaterial[prop] instanceof THREE.Texture) {
              newMaterial[prop].dispose();
              newMaterial[prop] = null;
            }
          }
          newMaterial.envMap = null;
        }

        if (newMaterial.color) newMaterial.color.copy(color);
        if ('metalness' in newMaterial)
          newMaterial.metalness = mergedSettings.metalness;
        if ('roughness' in newMaterial)
          newMaterial.roughness = mergedSettings.roughness;
        if ('clearcoat' in newMaterial)
          newMaterial.clearcoat = mergedSettings.clearcoat || 0;
        if ('clearcoatRoughness' in newMaterial)
          newMaterial.clearcoatRoughness =
            mergedSettings.clearcoatRoughness || 0;
        newMaterial.needsUpdate = true;
      }
    });

    return targets.length > 0;
  }

  static bisectElement(element, a) {
    if (!element || !element.threejsObject) {
      console.warn('bisectElement: No valid element provided for bisecting');
      return null;
    }

    const threejsObject = element.threejsObject;

    if (!(threejsObject instanceof THREE.Mesh)) {
      console.error('bisectElement: threejsObject is not a THREE.Mesh');
      return null;
    }

    const originalGeometry = threejsObject.geometry;
    if (!(originalGeometry instanceof THREE.BufferGeometry)) {
      console.error('bisectElement: Expected a BufferGeometry');
      return null;
    }

    const positions = originalGeometry.attributes.position.array;
    const indices = originalGeometry.index
      ? originalGeometry.index.array
      : null;

    if (!indices) {
      console.error('bisectElement: Non-indexed BufferGeometry not supported');
      return null;
    }

    let newPositions = [];
    let newIndices = [];
    let vertexIndex = 0;
    const positionMap = new Map();

    for (let i = 0; i < originalGeometry.attributes.position.count; i++) {
      const x = positions[i * 3];
      if (x >= a) {
        positionMap.set(i, vertexIndex);
        newPositions.push(x, positions[i * 3 + 1], positions[i * 3 + 2]);
        vertexIndex++;
      }
    }

    for (let t = 0; t < indices.length / 3; t++) {
      const i0 = indices[t * 3];
      const i1 = indices[t * 3 + 1];
      const i2 = indices[t * 3 + 2];

      const p0 = [
        positions[i0 * 3],
        positions[i0 * 3 + 1],
        positions[i0 * 3 + 2],
      ];
      const p1 = [
        positions[i1 * 3],
        positions[i1 * 3 + 1],
        positions[i1 * 3 + 2],
      ];
      const p2 = [
        positions[i2 * 3],
        positions[i2 * 3 + 1],
        positions[i2 * 3 + 2],
      ];

      const onRight = [p0[0] >= a, p1[0] >= a, p2[0] >= a];
      const countOnRight = onRight.filter((b) => b).length;

      if (countOnRight === 3) {
        newIndices.push(
          positionMap.get(i0),
          positionMap.get(i1),
          positionMap.get(i2)
        );
      } else if (countOnRight === 2) {
        let leftIndex, rightIndex1, rightIndex2;
        let pLeft, pRight1, pRight2;
        if (!onRight[0]) {
          leftIndex = i0;
          rightIndex1 = i1;
          rightIndex2 = i2;
          pLeft = p0;
          pRight1 = p1;
          pRight2 = p2;
        } else if (!onRight[1]) {
          leftIndex = i1;
          rightIndex1 = i0;
          rightIndex2 = i2;
          pLeft = p1;
          pRight1 = p0;
          pRight2 = p2;
        } else {
          leftIndex = i2;
          rightIndex1 = i0;
          rightIndex2 = i1;
          pLeft = p2;
          pRight1 = p0;
          pRight2 = p1;
        }

        const p01 = [a, pLeft[1], pLeft[2]];
        const p02 = [a, pLeft[1], pLeft[2]];

        const p01Index = vertexIndex++;
        newPositions.push(...p01);
        const p02Index = vertexIndex++;
        newPositions.push(...p02);

        newIndices.push(
          p01Index,
          positionMap.get(rightIndex1),
          positionMap.get(rightIndex2)
        );
        newIndices.push(p01Index, positionMap.get(rightIndex2), p02Index);
      } else if (countOnRight === 1) {
        let rightIndex, leftIndex1, leftIndex2;
        let pRight, pLeft1, pLeft2;
        if (onRight[0]) {
          rightIndex = i0;
          leftIndex1 = i1;
          leftIndex2 = i2;
          pRight = p0;
          pLeft1 = p1;
          pLeft2 = p2;
        } else if (onRight[1]) {
          rightIndex = i1;
          leftIndex1 = i0;
          leftIndex2 = i2;
          pRight = p1;
          pLeft1 = p0;
          pLeft2 = p2;
        } else {
          rightIndex = i2;
          leftIndex1 = i0;
          leftIndex2 = i1;
          pRight = p2;
          pLeft1 = p0;
          pLeft2 = p1;
        }

        const p01 = [a, pRight[1], pRight[2]];
        const p02 = [a, pRight[1], pRight[2]];

        const p01Index = vertexIndex++;
        newPositions.push(...p01);
        const p02Index = vertexIndex++;
        newPositions.push(...p02);

        newIndices.push(p01Index, positionMap.get(rightIndex), p02Index);
      }
    }

    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(newPositions, 3)
    );
    if (newIndices.length > 0) {
      newGeometry.setIndex(
        new THREE.BufferAttribute(new Uint32Array(newIndices), 1)
      );
    }
    newGeometry.computeVertexNormals();

    const newMesh = new THREE.Mesh(newGeometry, threejsObject.material);

    newMesh.position.copy(threejsObject.position);
    newMesh.rotation.copy(threejsObject.rotation);
    newMesh.scale.copy(threejsObject.scale);
    newMesh.updateMatrix();

    const newElement = {
      threejsObject: newMesh,
    };

    return newElement;
  }

}

