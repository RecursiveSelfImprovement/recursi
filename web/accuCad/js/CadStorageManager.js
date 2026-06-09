class CadStorageManager {
    constructor(baseController) {
      this.baseController = baseController;
      this.dbName = 'accuCad_Storage';
      this.storeName = 'drawings';
      this.db = null;
      this.currentProjectName = '';
      this.uiContainer = null;
    }

    async init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'name' });
          }
        };
        request.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        request.onerror = (e) => {
          reject(e.target.error);
        };
      });
    }

    async saveDrawing(name) {
      if (!this.db) await this.init();

      const elementsData = this.baseController.cadElements
        .filter(el => !el.isTemporary)
        .map(el => {
          if (typeof el.toJSON === 'function') {
            return el.toJSON();
          }
          return {
            type: el.type,
            id: el.id || Math.random().toString(36).substr(2, 9),
            color: el.color,
            points: el.points ? el.points.map(p => [...p]) : []
          };
        });

      const drawing = {
        name: name,
        timestamp: Date.now(),
        plane: this.baseController.planeType || 'top',
        elements: elementsData
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(drawing);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    }

    async loadDrawing(name) {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(name);
        request.onsuccess = (e) => {
          const drawing = e.target.result;
          if (drawing) {
            this.reconstructDrawing(drawing);
            resolve(drawing);
          } else {
            reject(new Error(`Drawing "${name}" not found.`));
          }
        };
        request.onerror = (e) => reject(e.target.error);
      });
    }

    async deleteDrawing(name) {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(name);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    }

    async listDrawings() {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        request.onsuccess = (e) => {
          const drawings = e.target.result || [];
          drawings.sort((a, b) => b.timestamp - a.timestamp);
          resolve(drawings);
        };
        request.onerror = (e) => reject(e.target.error);
      });
    }

    reconstructDrawing(drawing) {
      const bc = this.baseController;

      while (bc.cadElements.length > 0) {
        const el = bc.cadElements[0];
        if (el.threejsObject) {
          bc.view.scene.remove(el.threejsObject);
          el.threejsObject.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
              else child.material.dispose();
            }
          });
        }
        bc.cadElements.shift();
      }

      if (drawing.plane) {
        bc.setDrawingPlane(drawing.plane);
      }

      const elements = drawing.elements.map((item) => {
        let el = null;
        if (item.type === 'path') {
          el = PathElement.fromJSON(item);
        } else if (item.type === 'capsule') {
          el = CapsuleElement.fromJSON(item);
        } else if (item.type === 'rectangle') {
          el = RectangleElement.fromJSON(item);
        } else if (item.type === 'arc') {
          el = ArcElement.fromJSON(item);
        } else if (item.type === 'curve') {
          el = CurveElement.fromJSON(item);
        } else if (item.type === 'circle') {
          el = {
            type: 'circle',
            id: item.id || Math.random().toString(36).substr(2, 9),
            color: item.color,
            points: item.points.map(p => [...p]),
            isTemporary: false
          };
        }
        return el;
      }).filter(el => el !== null);

      elements.forEach((el) => {
        bc.cadElements.push(el);

        if (el.type === 'path') {
          const cmd = new DrawPathCommand(bc);
          cmd.tempElement = el;
          cmd.updatePermanentGeometry();
        } else if (el.type === 'capsule') {
          const cmd = new DrawCapsuleCommand(bc);
          cmd.tempElement = el;
          cmd.finalizeCapsule();
        } else if (el.type === 'rectangle') {
          const cmd = new DrawRectangleCommand(bc);
          cmd.tempElement = el;
          cmd.finalizeRectangle();
        } else if (el.type === 'arc') {
          this.buildArcVisual(el);
        } else if (el.type === 'curve') {
          this.buildCurveVisual(el);
        } else if (el.type === 'circle') {
          this.buildCircleVisual(el);
        }
      });
    }

    buildArcVisual(el) {
      const bc = this.baseController;
      const cmd = new DrawArcCommand(bc);
      const arcData = cmd.computeArcData(el.startPt, el.center, el.endPt);
      if (!arcData) return;

      const arcCurve = new THREE.ArcCurve(
        0,
        0,
        arcData.radius,
        arcData.startAngle,
        arcData.endAngle,
        arcData.clockwise
      );
      const points2D = arcCurve.getPoints(50);
      const points3D = points2D.map((pt) => {
        const vec = new THREE.Vector3().addVectors(
          arcData.u.clone().multiplyScalar(pt.x),
          arcData.v.clone().multiplyScalar(pt.y)
        );
        vec.add(new THREE.Vector3(...el.center));
        return vec;
      });

      const positions = points3D.flatMap((v) => [v.x, v.y, v.z]);
      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      const material = new LineMaterial({
        color: el.color ? (typeof el.color === 'string' ? parseInt(el.color.replace('#', ''), 16) : el.color) : 0xff0000,
        linewidth: el.lineWidth || bc.lineWidth || 4,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      });
      const line = new Line2(geometry, material);
      el.threejsObject = line;
      bc.view.scene.add(line);
    }

    buildCurveVisual(el) {
      const bc = this.baseController;
      const [cp0, cp1, cp2, cp3] = el.controlPoints.map(
        (p) => new THREE.Vector3(...p)
      );
      const curve = new THREE.CubicBezierCurve3(cp0, cp1, cp2, cp3);
      const curvePoints = curve.getPoints(50);
      const positions = curvePoints.flatMap((p) => [p.x, p.y, p.z]);

      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      const material = new LineMaterial({
        color: el.color ? (typeof el.color === 'string' ? parseInt(el.color.replace('#', ''), 16) : el.color) : 0xff0000,
        linewidth: el.lineWidth || bc.lineWidth || 4,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      });
      const curveLine = new Line2(geometry, material);
      el.threejsObject = curveLine;
      bc.view.scene.add(curveLine);
    }

    buildCircleVisual(el) {
      const bc = this.baseController;
      const cmd = new DrawCircleCommand(bc);
      const center = el.points[0];
      const edge = el.points[1] || [center[0] + 1, center[1], center[2]];
      const line = cmd.createCircleVisual(center, edge, false);
      if (line) {
        el.threejsObject = line;
        bc.view.scene.add(line);
      }
    }

    renderUI() {
      const sidePanel = this.baseController.sidePanel;
      if (!sidePanel) return;

      const section = sidePanel.addSection('drawings', 'Saved Projects', false);
      this.uiContainer = section;
      this.updateUI();
    }

    async updateUI() {
      if (!this.uiContainer) return;
      this.uiContainer.innerHTML = '';

      let drawings = [];
      try {
        drawings = await this.listDrawings();
      } catch (err) {
        console.error('Failed to list drawings', err);
      }

      const container = makeElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '4px 0'
        }
      });

      const nameRow = makeElement('div', {
        style: { display: 'flex', gap: '6px' }
      });
      const nameInput = makeElement('input', {
        type: 'text',
        placeholder: 'Project Name',
        value: this.currentProjectName || '',
        style: {
          flexGrow: 1,
          background: '#111',
          border: '1px solid #444',
          color: '#fff',
          padding: '4px 6px',
          borderRadius: '4px',
          fontSize: '12px'
        }
      });
      nameInput.oninput = (e) => {
        this.currentProjectName = e.target.value;
      };

      const saveBtn = makeElement('button', {
        style: {
          background: '#0088ff',
          border: 'none',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold'
        },
        onclick: async () => {
          const name = nameInput.value.trim();
          if (!name) {
            alert('Please enter a project name.');
            return;
          }
          await this.saveDrawing(name);
          this.currentProjectName = name;
          this.updateUI();
        }
      }, 'Save');

      nameRow.appendChild(nameInput);
      nameRow.appendChild(saveBtn);
      container.appendChild(nameRow);

      if (drawings.length > 0) {
        const listContainer = makeElement('div', {
          style: {
            maxHeight: '150px',
            overflowY: 'auto',
            border: '1px solid #333',
            borderRadius: '4px',
            background: '#151515',
            marginTop: '4px'
          }
        });

        drawings.forEach((drawing) => {
          const isCurrent = this.currentProjectName === drawing.name;
          const row = makeElement('div', {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 8px',
              borderBottom: '1px solid #222',
              fontSize: '12px',
              cursor: 'pointer',
              color: isCurrent ? '#00ff66' : '#ddd',
              background: isCurrent ? '#1a2a1a' : 'transparent'
            }
          });

          const label = makeElement('span', {
            style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 },
            onclick: async () => {
              if (confirm(`Open "${drawing.name}"? This will clear current elements.`)) {
                await this.loadDrawing(drawing.name);
                this.currentProjectName = drawing.name;
                this.updateUI();
              }
            }
          }, drawing.name);

          const actions = makeElement('div', {
            style: { display: 'flex', gap: '4px' }
          });

          const delBtn = makeElement('button', {
            style: {
              background: '#aa2222',
              border: 'none',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '10px'
            },
            onclick: async (e) => {
              e.stopPropagation();
              if (confirm(`Delete project "${drawing.name}"?`)) {
                await this.deleteDrawing(drawing.name);
                if (this.currentProjectName === drawing.name) {
                  this.currentProjectName = '';
                }
                this.updateUI();
              }
            }
          }, 'Del');

          const expBtn = makeElement('button', {
            style: {
              background: '#444',
              border: 'none',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '10px'
            },
            onclick: (e) => {
              e.stopPropagation();
              this.exportDrawing(drawing);
            }
          }, 'Exp');

          actions.appendChild(expBtn);
          actions.appendChild(delBtn);
          row.appendChild(label);
          row.appendChild(actions);
          listContainer.appendChild(row);
        });

        container.appendChild(listContainer);
      } else {
        const noProjects = makeElement('div', {
          style: { fontSize: '11px', color: '#666', textAlign: 'center', padding: '10px 0' }
        }, 'No saved projects.');
        container.appendChild(noProjects);
      }

      const importRow = makeElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
          borderTop: '1px solid #333',
          paddingTop: '8px'
        }
      });

      const importLabel = makeElement('span', {
        style: { fontSize: '11px', color: '#aaa' }
      }, 'Import Project:');

      const fileInput = makeElement('input', {
        type: 'file',
        accept: '.json',
        style: { display: 'none' }
      });
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (!data.name || !Array.isArray(data.elements)) {
              alert('Invalid file format. Must be a project JSON.');
              return;
            }
            await this.saveImportedDrawing(data);
            this.updateUI();
          } catch (err) {
            alert('Failed to parse file: ' + err.message);
          }
        };
        reader.readAsText(file);
      };

      const importBtn = makeElement('button', {
        style: {
          background: '#333',
          border: '1px solid #555',
          color: '#ccc',
          padding: '3px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px'
        },
        onclick: () => fileInput.click()
      }, 'Browse...');

      importRow.appendChild(importLabel);
      importRow.appendChild(importBtn);
      importRow.appendChild(fileInput);
      container.appendChild(importRow);

      this.uiContainer.appendChild(container);
    }

    exportDrawing(drawing) {
      const json = JSON.stringify(drawing, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = makeElement('a', {
        href: url,
        download: `${drawing.name}.json`
      });
      a.click();
      URL.revokeObjectURL(url);
    }

    async saveImportedDrawing(drawing) {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(drawing);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    }
  }