class CompositeBuilder {
    constructor(options = {}) {
      this.env = options.env;
      this.width = options.width || 800;
      this.height = options.height || 600;
      this.onClose = options.onClose || null;

      this.pieces = [];
      this.pieceIdCounter = 0;
      this.selectedPiece = null;
      this.dragState = null;

      this.dialog = null;
      this.compositeCanvas = null;
      this.compositeCtx = null;
      this.overlayCanvas = null;
      this.overlayCtx = null;
      this.canvasContainer = null;
      this.controlPanel = null;
      this.pieceList = null;
      this.coordsDisplay = null;
      this.exportTextarea = null;
      this.widthInput = null;
      this.heightInput = null;

      this._boundMouseDown = (e) => this._onMouseDown(e);
      this._boundMouseMove = (e) => this._onMouseMove(e);
      this._boundMouseUp = (e) => this._onMouseUp(e);
      this._boundKeyDown = (e) => this._onKeyDown(e);

      this._applyStyles();
      this._createDialog();
    }

    _createDialog() {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const dialogW = Math.min(screenW * 0.9, this.width + 320);
      const dialogH = Math.min(screenH * 0.85, this.height + 80);
      const posX = (screenW - dialogW) / 2;
      const posY = (screenH - dialogH) / 2;

      this.dialog = UITools.makeDialog({
        env: this.env,
        title: `Composite Builder (${this.width}×${this.height})`,
        size: [Math.floor(dialogW), Math.floor(dialogH)],
        position: [posX, posY],
        noPadding: true,
      });

      const layout = makeElement('div', { class: 'comp-layout' });

      const canvasArea = makeElement('div', { class: 'comp-canvas-area' });
      this.canvasContainer = makeElement('div', {
        class: 'comp-canvas-container',
        style: {
          width: `${this.width}px`,
          height: `${this.height}px`,
          position: 'relative',
          flexShrink: '0',
        },
      });

      this.compositeCanvas = makeElement('canvas', {
        width: this.width,
        height: this.height,
        class: 'comp-canvas',
      });
      this.compositeCtx = this.compositeCanvas.getContext('2d');

      this.overlayCanvas = makeElement('canvas', {
        width: this.width,
        height: this.height,
        class: 'comp-overlay',
      });
      this.overlayCtx = this.overlayCanvas.getContext('2d');

      this.canvasContainer.appendChild(this.compositeCanvas);
      this.canvasContainer.appendChild(this.overlayCanvas);
      canvasArea.appendChild(this.canvasContainer);

      this.controlPanel = makeElement('div', { class: 'comp-control-panel' });

      this.widthInput = makeElement('input', {
        type: 'number',
        value: String(this.width),
        min: '100',
        max: '8192',
        style: {
          width: '70px',
          background: '#333',
          color: '#eee',
          border: '1px solid #555',
          borderRadius: '3px',
          padding: '3px 6px',
        },
      });

      this.heightInput = makeElement('input', {
        type: 'number',
        value: String(this.height),
        min: '100',
        max: '8192',
        style: {
          width: '70px',
          background: '#333',
          color: '#eee',
          border: '1px solid #555',
          borderRadius: '3px',
          padding: '3px 6px',
        },
      });

      const applySizeBtn = makeElement(
        'button',
        {
          class: 'comp-btn',
          style: { width: 'auto', padding: '3px 10px', marginBottom: '0' },
          onclick: () => this._resizeCanvas(),
        },
        'Apply'
      );

      const sizeRow = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            fontSize: '12px',
            color: '#aaa',
          },
        },
        'W:',
        this.widthInput,
        'H:',
        this.heightInput,
        applySizeBtn
      );

      const sizeSection = makeElement(
        'div',
        { class: 'comp-section' },
        makeElement('strong', 'Canvas Size'),
        sizeRow
      );
      this.controlPanel.appendChild(sizeSection);

      this.coordsDisplay = makeElement('div', {
        class: 'comp-coords',
        textContent: 'No piece selected',
      });

      this.pieceList = makeElement('div', { class: 'comp-piece-list' });

      const pieceSection = makeElement(
        'div',
        { class: 'comp-section' },
        makeElement('strong', 'Pieces'),
        this.pieceList,
        this.coordsDisplay
      );

      const zUpBtn = makeElement(
        'button',
        { class: 'comp-btn', onclick: () => this._moveSelectedZ(1) },
        '▲ Bring Forward'
      );
      const zDownBtn = makeElement(
        'button',
        { class: 'comp-btn', onclick: () => this._moveSelectedZ(-1) },
        '▼ Send Backward'
      );
      const deleteBtn = makeElement(
        'button',
        {
          class: 'comp-btn comp-btn-danger',
          onclick: () => this._deleteSelected(),
        },
        '✕ Delete Piece'
      );

      const actionSection = makeElement(
        'div',
        { class: 'comp-section' },
        makeElement('strong', 'Selected Piece'),
        makeElement('div', { class: 'comp-btn-row' }, zUpBtn, zDownBtn),
        deleteBtn
      );

      this.exportTextarea = makeElement('textarea', {
        class: 'comp-export-textarea',
        rows: '8',
        placeholder: 'JSON will appear here...',
      });

      const exportBtn = makeElement(
        'button',
        { class: 'comp-btn', onclick: () => this._exportJson() },
        '📋 Export JSON'
      );
      const importBtn = makeElement(
        'button',
        { class: 'comp-btn', onclick: () => this._importJson() },
        '📥 Import JSON'
      );
      const copyBtn = makeElement(
        'button',
        { class: 'comp-btn', onclick: () => this._copyJsonToClipboard() },
        '📄 Copy to Clipboard'
      );

      const ioSection = makeElement(
        'div',
        { class: 'comp-section' },
        makeElement('strong', 'Export / Import'),
        makeElement('div', { class: 'comp-btn-row' }, exportBtn, copyBtn),
        importBtn,
        this.exportTextarea
      );

      this.controlPanel.appendChild(pieceSection);
      this.controlPanel.appendChild(actionSection);
      this.controlPanel.appendChild(ioSection);

      layout.appendChild(canvasArea);
      layout.appendChild(this.controlPanel);
      this.dialog.contentElement.appendChild(layout);

      this.overlayCanvas.addEventListener('mousedown', this._boundMouseDown);
      window.addEventListener('mousemove', this._boundMouseMove);
      window.addEventListener('mouseup', this._boundMouseUp);
      window.addEventListener('keydown', this._boundKeyDown);

      this._render();
      this._renderOverlay();
    }

    _resizeCanvas() {
      const newW = parseInt(this.widthInput.value, 10);
      const newH = parseInt(this.heightInput.value, 10);

      if (
        !newW ||
        !newH ||
        newW < 100 ||
        newH < 100 ||
        newW > 8192 ||
        newH > 8192
      ) {
        return;
      }

      this.width = newW;
      this.height = newH;

      this.compositeCanvas.width = this.width;
      this.compositeCanvas.height = this.height;
      this.overlayCanvas.width = this.width;
      this.overlayCanvas.height = this.height;
      this.canvasContainer.style.width = `${this.width}px`;
      this.canvasContainer.style.height = `${this.height}px`;

      this.compositeCtx = this.compositeCanvas.getContext('2d');
      this.overlayCtx = this.overlayCanvas.getContext('2d');

      if (this.dialog && typeof this.dialog.setTitle === 'function') {
        this.dialog.setTitle(`Composite Builder (${this.width}×${this.height})`);
      }

      this._render();
      this._renderOverlay();
    }

    addPiece(cropInfo, name) {
      this.pieceIdCounter++;

      let dataUrl = null;
      if (cropInfo.dataUrl) {
        dataUrl = cropInfo.dataUrl;
      } else if (cropInfo.canvas) {
        dataUrl = cropInfo.canvas.toDataURL('image/png');
      }

      if (!dataUrl) {
        console.error('CompositeBuilder.addPiece: No image data available.');
        return null;
      }

      const img = new Image();
      const displayName = name || this._getAutoName();

      const piece = {
        id: this.pieceIdCounter,
        name: displayName,
        x: 0,
        y: 0,
        width: cropInfo.width,
        height: cropInfo.height,
        sourceX: cropInfo.sourceX,
        sourceY: cropInfo.sourceY,
        zIndex: this.pieces.length,
        visible: true,
        image: img,
        _dataUrl: dataUrl,
      };

      this.pieces.push(piece);

      img.onload = () => {
        this._render();
        this._renderOverlay();
        this._rebuildPieceList();
      };

      img.onerror = (err) => {
        console.error('CompositeBuilder: image FAILED to load for piece', piece.name, err);
      };

      img.src = dataUrl;

      this._rebuildPieceList();
      this._selectPiece(piece);
      return piece;
    }

    _selectPiece(piece) {
      this.selectedPiece = piece;
      this._updateCoordsDisplay();
      this._renderOverlay();
      this._rebuildPieceList();
    }

    _updateCoordsDisplay() {
      if (!this.selectedPiece) {
        this.coordsDisplay.textContent = 'No piece selected';
        return;
      }
      const p = this.selectedPiece;
      this.coordsDisplay.textContent = `"${p.name}" | pos: (${p.x}, ${p.y}) | size: ${p.width}×${p.height} | z: ${p.zIndex}`;
    }

    _rebuildPieceList() {
      this.pieceList.innerHTML = '';
      const sorted = [...this.pieces].sort((a, b) => b.zIndex - a.zIndex);
      sorted.forEach((piece) => {
        const isSelected = this.selectedPiece === piece;
        const visIcon = piece.visible ? '👁' : '🚫';
        const item = makeElement(
          'div',
          {
            class: 'comp-piece-item' + (isSelected ? ' selected' : ''),
            onclick: () => this._selectPiece(piece),
          },
          [
            makeElement(
              'span',
              {
                class: 'comp-piece-vis',
                onclick: (e) => {
                  e.stopPropagation();
                  piece.visible = !piece.visible;
                  this._render();
                  this._renderOverlay();
                  this._rebuildPieceList();
                },
              },
              visIcon
            ),
            makeElement(
              'span',
              { class: 'comp-piece-label' },
              `${piece.name} (${piece.width}×${piece.height}) z:${piece.zIndex}`
            ),
          ]
        );
        item._piece = piece;
        this.pieceList.appendChild(item);
      });
    }

    _moveSelectedZ(direction) {
      if (!this.selectedPiece) return;
      const oldZ = this.selectedPiece.zIndex;
      const newZ = oldZ + direction;

      const swapTarget = this.pieces.find(
        (p) => p !== this.selectedPiece && p.zIndex === newZ
      );
      if (swapTarget) {
        swapTarget.zIndex = oldZ;
      }
      this.selectedPiece.zIndex = newZ;

      this._normalizeZIndices();
      this._render();
      this._renderOverlay();
      this._rebuildPieceList();
      this._updateCoordsDisplay();
    }

    _normalizeZIndices() {
      const sorted = [...this.pieces].sort((a, b) => a.zIndex - b.zIndex);
      sorted.forEach((p, i) => {
        p.zIndex = i;
      });
    }

    _deleteSelected() {
      if (!this.selectedPiece) return;
      this.pieces = this.pieces.filter((p) => p !== this.selectedPiece);
      this.selectedPiece = null;
      this._normalizeZIndices();
      this._render();
      this._renderOverlay();
      this._rebuildPieceList();
      this._updateCoordsDisplay();
    }

    _render() {
      const ctx = this.compositeCtx;
      ctx.clearRect(0, 0, this.width, this.height);

      const size = 12;
      for (let y = 0; y < this.height; y += size) {
        for (let x = 0; x < this.width; x += size) {
          ctx.fillStyle =
            (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0
              ? '#3a3a3a'
              : '#2a2a2a';
          ctx.fillRect(x, y, size, size);
        }
      }

      const sorted = [...this.pieces].sort((a, b) => a.zIndex - b.zIndex);
      sorted.forEach((piece) => {
        if (!piece.visible || !piece.image.complete) return;
        ctx.drawImage(piece.image, piece.x, piece.y, piece.width, piece.height);
      });
    }

    _renderOverlay() {
      const ctx = this.overlayCtx;
      ctx.clearRect(0, 0, this.width, this.height);

      if (!this.selectedPiece) return;
      const p = this.selectedPiece;

      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
      ctx.setLineDash([]);

      const handleSize = 6;
      ctx.fillStyle = '#00aaff';
      const corners = [
        [p.x, p.y],
        [p.x + p.width, p.y],
        [p.x, p.y + p.height],
        [p.x + p.width, p.y + p.height],
      ];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(
          cx - handleSize / 2,
          cy - handleSize / 2,
          handleSize,
          handleSize
        );
      });

      ctx.fillStyle = 'rgba(0, 170, 255, 0.85)';
      ctx.font = 'bold 12px monospace';
      const labelText = `${p.name} (${p.x},${p.y})`;
      const textW = ctx.measureText(labelText).width;
      ctx.fillRect(p.x, p.y - 18, textW + 8, 17);
      ctx.fillStyle = '#fff';
      ctx.fillText(labelText, p.x + 4, p.y - 4);
    }

    _getCanvasCoords(e) {
      const rect = this.overlayCanvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      return {
        x: Math.floor((e.clientX - rect.left) * scaleX),
        y: Math.floor((e.clientY - rect.top) * scaleY),
      };
    }

    _hitTest(mx, my) {
      const sorted = [...this.pieces].sort((a, b) => b.zIndex - a.zIndex);
      for (const piece of sorted) {
        if (!piece.visible) continue;
        if (
          mx >= piece.x &&
          mx <= piece.x + piece.width &&
          my >= piece.y &&
          my <= piece.y + piece.height
        ) {
          return piece;
        }
      }
      return null;
    }

    _onMouseDown(e) {
      if (e.button !== 0) return;
      const { x, y } = this._getCanvasCoords(e);
      const hit = this._hitTest(x, y);

      if (hit) {
        this._selectPiece(hit);
        this.dragState = {
          piece: hit,
          offsetX: x - hit.x,
          offsetY: y - hit.y,
        };
        e.preventDefault();
      } else {
        this.selectedPiece = null;
        this._updateCoordsDisplay();
        this._renderOverlay();
        this._rebuildPieceList();
      }
    }

    _onMouseMove(e) {
      if (!this.dragState) return;
      const { x, y } = this._getCanvasCoords(e);
      const piece = this.dragState.piece;
      piece.x = x - this.dragState.offsetX;
      piece.y = y - this.dragState.offsetY;

      this._render();
      this._renderOverlay();
      this._updateCoordsDisplay();
    }

    _onMouseUp(e) {
      if (this.dragState) {
        this.dragState = null;
      }
    }

    _onKeyDown(e) {
      if (!this.selectedPiece) return;
      const step = e.shiftKey ? 10 : 1;
      let handled = false;

      if (e.key === 'ArrowLeft') {
        this.selectedPiece.x -= step;
        handled = true;
      } else if (e.key === 'ArrowRight') {
        this.selectedPiece.x += step;
        handled = true;
      } else if (e.key === 'ArrowUp') {
        this.selectedPiece.y -= step;
        handled = true;
      } else if (e.key === 'ArrowDown') {
        this.selectedPiece.y += step;
        handled = true;
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        this._deleteSelected();
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        this._render();
        this._renderOverlay();
        this._updateCoordsDisplay();
      }
    }

    _exportJson() {
      const sourceW = this.sourceCanvas ? this.sourceCanvas.width : 0;
      const sourceH = this.sourceCanvas ? this.sourceCanvas.height : 0;

      const data = {
        version: 2,
        sourceImage: this.sourceImageName,
        sourceWidth: sourceW,
        sourceHeight: sourceH,
        canvasWidth: this.width,
        canvasHeight: this.height,
        pieces: this.pieces.map((p) => ({
          name: p.name,
          cropX: p.sourceX,
          cropY: p.sourceY,
          cropW: p.width,
          cropH: p.height,
          placeX: p.x,
          placeY: p.y,
          zIndex: p.zIndex,
          visible: p.visible,
        })),
      };

      const json = JSON.stringify(data, null, 2);
      this.exportTextarea.value = json;
    }

    _importJson() {
      const raw = this.exportTextarea.value.trim();
      if (!raw) return;

      let data;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
        return;
      }

      if (!data.pieces || !Array.isArray(data.pieces)) {
        alert('Invalid format: missing pieces array');
        return;
      }

      if (!this.sourceCanvas) {
        alert('No source image loaded. Please open an image first, then import.');
        return;
      }

      this.pieces = [];
      this.selectedPiece = null;
      this.pieceIdCounter = 0;

      if (data.canvasWidth && data.canvasHeight) {
        this.width = data.canvasWidth;
        this.height = data.canvasHeight;
        this.compositeCanvas.width = this.width;
        this.compositeCanvas.height = this.height;
        this.overlayCanvas.width = this.width;
        this.overlayCanvas.height = this.height;
        this.canvasContainer.style.width = `${this.width}px`;
        this.canvasContainer.style.height = `${this.height}px`;
        if (this.dialog && typeof this.dialog.setTitle === 'function') {
          this.dialog.setTitle(`Composite Builder (${this.width}×${this.height})`);
        }
        this.widthInput.value = String(this.width);
        this.heightInput.value = String(this.height);
      }

      if (data.sourceImage) {
        this.sourceImageName = data.sourceImage;
      }

      const srcCtx = this.sourceCanvas.getContext('2d');

      data.pieces.forEach((pd) => {
        this.pieceIdCounter++;

        const cropW = pd.cropW || 1;
        const cropH = pd.cropH || 1;
        const cropX = pd.cropX || 0;
        const cropY = pd.cropY || 0;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');

        try {
          const imageData = srcCtx.getImageData(cropX, cropY, cropW, cropH);
          cropCtx.putImageData(imageData, 0, 0);
        } catch (err) {
          console.warn(`Failed to crop piece "${pd.name}" from source:`, err);
        }

        const dataUrl = cropCanvas.toDataURL('image/png');
        const img = new Image();
        img.src = dataUrl;

        const piece = {
          id: this.pieceIdCounter,
          name: pd.name || this._getAutoName(),
          x: pd.placeX || 0,
          y: pd.placeY || 0,
          width: cropW,
          height: cropH,
          sourceX: cropX,
          sourceY: cropY,
          zIndex: pd.zIndex || 0,
          visible: pd.visible !== false,
          image: img,
          _dataUrl: dataUrl,
        };

        this.pieces.push(piece);

        img.onload = () => {
          this._render();
          this._renderOverlay();
        };
      });

      this._normalizeZIndices();
      this._rebuildPieceList();
      this._render();
      this._renderOverlay();
    }

    destroy() {
      this.overlayCanvas.removeEventListener('mousedown', this._boundMouseDown);
      window.removeEventListener('mousemove', this._boundMouseMove);
      window.removeEventListener('mouseup', this._boundMouseUp);
      window.removeEventListener('keydown', this._boundKeyDown);
      if (this.dialog && this.dialog.element) {
        this.dialog.element.remove();
      }
    }

    _applyStyles() {
      const css = `
        .comp-layout {
          display: flex; flex-direction: row; width: 100%; height: 100%;
          background: #1a1a1a; color: #ddd; overflow: hidden;
        }
        .comp-canvas-area {
          flex: 1; display: flex; justify-content: center; align-items: center;
          overflow: auto; padding: 10px; min-width: 0;
          background: #111;
        }
        .comp-canvas-container {
          position: relative; flex-shrink: 0;
          box-shadow: 0 0 20px rgba(0,0,0,0.6);
        }
        .comp-canvas {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          image-rendering: auto;
        }
        .comp-overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          cursor: default; z-index: 10;
        }
        .comp-control-panel {
          flex: 0 0 280px; background: #222; border-left: 1px solid #444;
          overflow-y: auto; padding: 12px; font-size: 0.85em;
        }
        .comp-section {
          padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #444;
        }
        .comp-section:last-child { border-bottom: none; }
        .comp-section strong { display: block; color: #aaa; margin-bottom: 8px; font-size: 1.05em; }
        .comp-piece-list { max-height: 250px; overflow-y: auto; margin-bottom: 6px; }
        .comp-piece-item {
          display: flex; align-items: center; gap: 6px; padding: 5px 8px;
          background: #2a2a2a; margin-bottom: 3px; border-radius: 3px;
          cursor: pointer; border: 1px solid transparent; font-size: 0.9em;
        }
        .comp-piece-item:hover { background: #333; }
        .comp-piece-item.selected { border-color: #00aaff; background: #1a2a3a; }
        .comp-piece-vis { cursor: pointer; font-size: 1em; user-select: none; }
        .comp-piece-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .comp-coords {
          font-family: monospace; font-size: 0.8em; color: #888;
          padding: 4px 0; min-height: 1.2em;
        }
        .comp-btn {
          padding: 5px 10px; background: #333; border: 1px solid #555; color: #ccc;
          border-radius: 4px; cursor: pointer; font-size: 0.85em; width: 100%;
          margin-bottom: 4px;
        }
        .comp-btn:hover { background: #444; color: #fff; }
        .comp-btn-danger { background: #5a1a1a; border-color: #833; }
        .comp-btn-danger:hover { background: #7a2a2a; }
        .comp-btn-row { display: flex; gap: 4px; margin-bottom: 4px; }
        .comp-btn-row .comp-btn { flex: 1; }
        .comp-export-textarea {
          width: 100%; background: #1a1a1a; color: #0f0; border: 1px solid #444;
          border-radius: 4px; padding: 6px; font-family: monospace; font-size: 0.8em;
          resize: vertical; margin-top: 6px; box-sizing: border-box;
        }
        .comp-rename-input {
          background: #111; color: #fff; border: 1px solid #00aaff;
          border-radius: 3px; padding: 2px 5px; font-size: 0.9em;
          width: 100%; outline: none;
        }
      `;
      applyCss(css, 'composite-builder-styles');
    }

    _getAutoName() {
      const index = this.pieceIdCounter;
      let name = '';
      let n = index;
      do {
        name = String.fromCharCode(97 + (n % 26)) + name;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return name;
    }

    renamePieces(oldName, newName) {
      let count = 0;
      this.pieces.forEach((p) => {
        if (p.name === oldName || p.name.startsWith(oldName + '(')) {
          if (p.name === oldName) {
            p.name = newName;
          } else {
            const suffix = p.name.substring(oldName.length);
            p.name = newName + suffix;
          }
          count++;
        }
      });
      if (count > 0) {
        this._rebuildPieceList();
        this._updateCoordsDisplay();
        this._renderOverlay();
      }
    }

    setSourceCanvas(canvas, imageName) {
      this.sourceCanvas = canvas;
      if (imageName) this.sourceImageName = imageName;
    }
  }