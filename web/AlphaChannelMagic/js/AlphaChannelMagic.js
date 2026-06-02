class AlphaChannelMagic {
    async run(env) {
      if (!env || !env.container) {
        throw new Error("[AlphaChannelMagic] run() requires an environment object with a valid container.");
      }
      this.env = env;
      this.init(env.container);
    }
  
  constructor() {
      this.mainUiContainer = null;
      this.dropZone = null;
      this.mainInstance = null;
      this.dialogInstances = [];
      this.cropItems = [];
      this.cropCounter = 0;
      this.cropNameCounter = 0;
      this.compositeBuilder = null;
    }

  init(targetElement) {
      console.log('Initializing AlphaChannelMagic...');
      this._applyStyles();

      // --- Side Panel Init ---
      this.sidePanel = new SidePanel('right', 300);
      this.imageListSection = this.sidePanel.addSection(
        'open-images',
        'Open Images',
        true
      );
      this.cropListSection = this.sidePanel.addSection(
        'crops',
        'Cropped Regions',
        true
      );
      this.compositeSection = this.sidePanel.addSection(
        'composite',
        'Composite Builder',
        true
      );

      // Composite controls in side panel
      this._buildCompositeControls();

      // Start closed until needed
      this.sidePanel.close();

      const initialView = makeElement(
        'div',
        { className: 'initial-view-container' },
        makeElement(
          'div',
          { className: 'container' },
          makeElement('h1', 'Alpha Channel Magic'),
          makeElement(
            'div',
            { className: 'info-text' },
            makeElement('p', 'Drop an image anywhere to start.'),
            makeElement(
              'p',
              { style: { fontSize: '0.9em', color: '#888', marginTop: '10px' } },
              'You can drop more images at any time. Previous images stay loaded in the side list.'
            )
          )
        )
      );

      this.initialViewContainer = initialView;
      targetElement.appendChild(initialView);

      this.mainUiContainer = makeElement('div', { style: { display: 'none' } });
      targetElement.appendChild(this.mainUiContainer);

      this.lastDroppedDialog = null;

      this._initDragAndDrop();
      console.log('AlphaChannelMagic Initialized.');
    }

  _initDragAndDrop() {
      const dropTarget = document.body;
      const indicator = makeElement(
        'div',
        { className: 'drop-indicator' },
        'Drop Image to Open'
      );
      document.body.appendChild(indicator);

      let dragCounter = 0;

      dropTarget.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        indicator.classList.add('active');
      });

      dropTarget.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter <= 0) indicator.classList.remove('active');
      });

      dropTarget.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      dropTarget.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        indicator.classList.remove('active');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const imageFile = Array.from(files).find((f) =>
            f.type.startsWith('image/')
          );
          if (imageFile) this._handleImageDrop(imageFile);
        }
      });
    }

  _handleImageDrop(imageFile) {
      if (
        this.lastDroppedDialog &&
        this.lastDroppedDialog.element.style.display !== 'none'
      ) {
        this.lastDroppedDialog.element.style.display = 'none';
      }

      this._createInDialog(imageFile);
    }

  _applyStyles() {
      applyCss(
        `
          .initial-view-container {
              display: flex; justify-content: center; align-items: center; min-height: 100vh; width: 100%;
              pointer-events: none;
          }
          .container {
              pointer-events: auto;
              background-color: #333; padding: 30px 40px; border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.3); text-align: center;
              max-width: 600px; width: 100%; border: 1px solid #444;
          }
          .container h1 { color: #66b3ff; margin: 0 0 15px 0; font-size: 1.8em; font-weight: 600; }
          .info-text {
              font-size: 0.95em; text-align: left; margin-bottom: 25px; padding: 15px;
              background-color: #2a2a2a; border-left: 4px solid #007bff; border-radius: 4px;
          }
          
          .drop-indicator {
              position: fixed; top: 0; left: 0; width: 100%; height: 100%;
              background-color: rgba(0, 123, 255, 0.4);
              border: 8px dashed rgba(255, 255, 255, 0.8);
              display: flex; justify-content: center; align-items: center;
              font-size: 3em; font-weight: bold; color: white;
              text-shadow: 0 2px 10px rgba(0,0,0,0.5);
              pointer-events: none; opacity: 0; transition: opacity 0.2s;
              z-index: 999999; box-sizing: border-box;
          }
          .drop-indicator.active { opacity: 1; }

          .panel-list-item {
              padding: 8px 12px; background: #2a2a2a; margin-bottom: 4px; border-radius: 4px;
              cursor: pointer; display: flex; justify-content: space-between; align-items: center;
              font-size: 13px; color: #ccc; border: 1px solid transparent;
          }
          .panel-list-item:hover { background-color: #383838; color: #fff; }
          .panel-item-text {
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;
          }
          .panel-item-close {
              background: none; border: none; color: inherit; opacity: 0.5;
              cursor: pointer; font-weight: bold; padding: 2px 6px;
          }
          .panel-item-close:hover { opacity: 1; background-color: #c42b1c; border-radius: 4px; }

          .panel-crop-name {
              font-weight: 600; color: #eee; font-size: 13px;
              cursor: text; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .panel-crop-name:hover { color: #4af; }
          .panel-crop-dims {
              font-size: 10px; color: #777; margin-top: 1px;
          }
      `,
        'alpha-channel-magic-styles'
      );
    }

  _createInDialog(imageFile) {
      const tempImg = new Image();
      tempImg.onload = () => {
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const uiW = 280; 
        const uiH = 60; 

        const availW = screenW * 0.9 - uiW;
        const availH = screenH * 0.9 - uiH;

        let w = tempImg.width;
        let h = tempImg.height;
        const aspect = w / h;

        if (w > availW) {
          w = availW;
          h = w / aspect;
        }
        if (h > availH) {
          h = availH;
          w = h * aspect;
        }

        if (w < 400 && h < 400) {
          const scale = Math.min(2, Math.min(availW / w, availH / h));
          w *= scale;
          h *= scale;
        }

        const finalW = Math.max(500, w + uiW);
        const finalH = Math.max(400, h + uiH);

        const posX = (screenW - finalW) / 2;
        const posY = (screenH - finalH) / 2;

        const dialog = UITools.makeDialog({
          env: this.env,
          title: imageFile.name,
          size: [Math.floor(finalW), Math.floor(finalH)],
          position: [posX, posY],
        });

        const originalClose = dialog.close;
        dialog.close = () => {
          dialog.element.style.display = 'none';
        };
        dialog._realDestroy = () => {
          if (typeof originalClose === 'function') {
            originalClose.call(dialog);
          } else {
            dialog.element.remove();
          }
        };

        const instance = new ImageProcessorUI(
          imageFile,
          dialog.contentElement,
          null,
          true
        );

        instance.onCropComplete = (cropInfo) => this._handleCrop(cropInfo);

        dialog._uiInstance = instance;
        this.dialogInstances.push(dialog);
        this.lastDroppedDialog = dialog;

        this._addDialogToList(dialog);
        this._checkSidePanelVisibility();

        if (typeof dialog.setZOnTop === 'function') {
          dialog.setZOnTop();
        }
      };
      tempImg.src = URL.createObjectURL(imageFile);
    }

  _addDialogToList(dialog) {
      if (!this.imageListSection) return;

      const item = makeElement(
        'div',
        {
          className: 'panel-list-item',
          title: dialog.options ? dialog.options.title : 'Image',
          onclick: () => {
            dialog.element.style.display = '';
            if (typeof dialog.setZOnTop === 'function') dialog.setZOnTop();
            if (this.lastDroppedDialog === dialog) {
              this.lastDroppedDialog = null;
            }
          },
        },
        [
          makeElement(
            'span',
            { className: 'panel-item-text' },
            dialog.options ? dialog.options.title : 'Image'
          ),
          makeElement('button', {
            className: 'panel-item-close',
            textContent: '✕',
            title: 'Delete',
            onclick: (e) => {
              e.stopPropagation();
              this._permanentlyDestroyDialog(dialog, item);
            },
          }),
        ]
      );

      dialog._listItem = item;
      this.imageListSection.appendChild(item);
    }

  _permanentlyDestroyDialog(dialog, item) {
      if (item) item.remove();

      if (typeof dialog._realDestroy === 'function') {
        dialog._realDestroy();
      } else {
        dialog.element.remove();
      }

      if (dialog._uiInstance) dialog._uiInstance.destroy();

      this.dialogInstances = this.dialogInstances.filter((d) => d !== dialog);
      if (this.lastDroppedDialog === dialog) this.lastDroppedDialog = null;

      this._checkSidePanelVisibility();
    }

  _checkSidePanelVisibility() {
      const imageCount = this.dialogInstances.length;
      const cropCount = this.cropItems.length;
      const anyHidden = this.dialogInstances.some(
        (d) => d.element.style.display === 'none'
      );

      if (imageCount > 1 || (imageCount > 0 && anyHidden) || cropCount > 0) {
        if (!this.sidePanel.isOpen) this.sidePanel.open();
      } else {
        if (this.sidePanel.isOpen) this.sidePanel.close();
      }
    }

  _handleCrop(cropInfo) {
      this.cropCounter++;
      const autoName = this._getNextCropName();

      if (!cropInfo.dataUrl && cropInfo.canvas) {
        cropInfo.dataUrl = cropInfo.canvas.toDataURL('image/png');
      }

      const entry = {
        id: this.cropCounter,
        name: autoName,
        cropInfo: cropInfo,
        dialog: null,
        listItem: null,
        _nameSpan: null,
        _dimsSpan: null,
      };

      const thumbCanvas = makeElement('canvas', {
        width: '40',
        height: '30',
        style: {
          borderRadius: '3px',
          border: '1px solid #555',
          flexShrink: '0',
          imageRendering: 'auto',
        },
      });
      const thumbCtx = thumbCanvas.getContext('2d');
      const aspect = cropInfo.width / cropInfo.height;
      let tw = 40;
      let th = 30;
      if (aspect > 40 / 30) {
        th = tw / aspect;
      } else {
        tw = th * aspect;
      }
      const tx = (40 - tw) / 2;
      const ty = (30 - th) / 2;
      thumbCtx.fillStyle = '#333';
      thumbCtx.fillRect(0, 0, 40, 30);
      thumbCtx.drawImage(cropInfo.canvas, tx, ty, tw, th);

      const nameSpan = makeElement(
        'span',
        {
          className: 'panel-crop-name',
          title: 'Double-click to rename',
        },
        autoName
      );

      const dimsSpan = makeElement(
        'span',
        {
          className: 'panel-crop-dims',
        },
        `${cropInfo.width}×${cropInfo.height}`
      );

      nameSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this._renameCropInline(entry, nameSpan);
      });

      entry._nameSpan = nameSpan;
      entry._dimsSpan = dimsSpan;

      const self = this;
      const addToCompBtn = makeElement('button', {
        className: 'panel-item-close',
        textContent: '+',
        title: 'Add to Composite',
        style: { color: '#0af', opacity: '0.7' },
        onclick: (e) => {
          e.stopPropagation();
          const builder = self._openCompositeBuilder();
          self._syncSourceToComposite();
          builder.addPiece(entry.cropInfo, entry.name);
        },
      });

      const item = makeElement(
        'div',
        {
          className: 'panel-list-item',
          title: `"${autoName}" - ${cropInfo.width}×${cropInfo.height} from [${cropInfo.sourceX}, ${cropInfo.sourceY}]`,
          onclick: () => {
            if (entry.dialog) {
              entry.dialog.element.style.display = '';
              if (typeof entry.dialog.setZOnTop === 'function') entry.dialog.setZOnTop();
            } else {
              this._openCropInDialog(entry);
            }
          },
        },
        [
          thumbCanvas,
          makeElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                marginLeft: '8px',
                overflow: 'hidden',
                flex: '1',
                minWidth: '0',
              },
            },
            nameSpan,
            dimsSpan
          ),
          addToCompBtn,
          makeElement('button', {
            className: 'panel-item-close',
            textContent: '✕',
            title: 'Delete crop',
            onclick: (e) => {
              e.stopPropagation();
              this._deleteCrop(entry);
            },
          }),
        ]
      );

      entry.listItem = item;
      this.cropItems.push(entry);
      this.cropListSection.appendChild(item);

      if (!this.sidePanel.isOpen) this.sidePanel.open();

      if (cropInfo.autoOpen) {
        this._openCropInDialog(entry);
      }
    }

  _openCropInDialog(entry) {
      const cropInfo = entry.cropInfo;
      const padding = 40;
      const dialogW = Math.max(200, cropInfo.width + padding);
      const dialogH = Math.max(180, cropInfo.height + padding + 40);

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const posX = (screenW - dialogW) / 2 + (this.cropCounter % 5) * 25;
      const posY = (screenH - dialogH) / 2 + (this.cropCounter % 5) * 25;

      const dialog = UITools.makeDialog({
        env: this.env,
        title: entry.name,
        size: [dialogW, dialogH],
        position: [posX, posY],
        noPadding: true,
      });

      const wrapper = makeElement('div', {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1a1a1a',
          backgroundImage:
            'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          overflow: 'hidden',
        },
      });

      const img = makeElement('img', {
        src: cropInfo.dataUrl,
        style: {
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          imageRendering: 'auto',
        },
      });

      wrapper.appendChild(img);
      dialog.contentElement.appendChild(wrapper);

      const originalClose = dialog.close;
      dialog.close = () => {
        dialog.element.style.display = 'none';
      };
      dialog._realDestroy = () => {
        if (typeof originalClose === 'function') {
          originalClose.call(dialog);
        } else {
          dialog.element.remove();
        }
      };

      entry.dialog = dialog;
      if (typeof dialog.setZOnTop === 'function') dialog.setZOnTop();
    }

  _deleteCrop(entry) {
      if (entry.listItem) entry.listItem.remove();
      if (entry.dialog) {
        if (typeof entry.dialog._realDestroy === 'function') {
          entry.dialog._realDestroy();
        } else {
          entry.dialog.element.remove();
        }
      }
      this.cropItems = this.cropItems.filter((c) => c !== entry);
    }

  _buildCompositeControls() {
      const openBtn = makeElement(
        'button',
        {
          style: {
            padding: '8px 14px',
            background: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
            fontWeight: '600',
            fontSize: '13px',
          },
          onclick: () => this._openCompositeBuilder(),
        },
        '🎨 Open Composite Builder'
      );

      const addAllCropsBtn = makeElement(
        'button',
        {
          style: {
            padding: '6px 10px',
            background: '#333',
            color: '#ccc',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
            marginTop: '6px',
            fontSize: '12px',
          },
          onclick: () => this._addAllCropsToComposite(),
        },
        '+ Add All Crops to Composite'
      );

      this.compositeSection.appendChild(openBtn);
      this.compositeSection.appendChild(addAllCropsBtn);
    }

  _openCompositeBuilder() {
      if (this.compositeBuilder) {
        this.compositeBuilder.dialog.element.style.display = '';
        if (typeof this.compositeBuilder.dialog.setZOnTop === 'function') {
          this.compositeBuilder.dialog.setZOnTop();
        }
        this._syncSourceToComposite();
        return this.compositeBuilder;
      }

      this.compositeBuilder = new CompositeBuilder({
        env: this.env,
        width: 800,
        height: 600,
      });

      this._syncSourceToComposite();

      const cbDialog = this.compositeBuilder.dialog;
      const originalClose = cbDialog.close;
      cbDialog.close = () => {
        cbDialog.element.style.display = 'none';
      };
      cbDialog._realDestroy = () => {
        if (typeof originalClose === 'function') {
          originalClose.call(cbDialog);
        } else {
          cbDialog.element.remove();
        }
      };

      return this.compositeBuilder;
    }

  _addAllCropsToComposite() {
      const builder = this._openCompositeBuilder();
      this._syncSourceToComposite();

      this.cropItems.forEach((entry) => {
        builder.addPiece(entry.cropInfo, entry.name);
      });
    }

  _renameCropInline(entry, spanEl) {
      const input = makeElement('input', {
        type: 'text',
        value: entry.name,
        style: {
          background: '#111',
          color: '#fff',
          border: '1px solid #00aaff',
          borderRadius: '3px',
          padding: '2px 5px',
          fontSize: '12px',
          width: '100%',
          outline: 'none',
          boxSizing: 'border-box',
        },
      });

      spanEl.textContent = '';
      spanEl.appendChild(input);
      input.focus();
      input.select();

      const commit = () => {
        const newName = input.value.trim();
        if (newName) {
          const oldName = entry.name;
          entry.name = newName;

          if (entry.dialog && typeof entry.dialog.setTitle === 'function') {
            entry.dialog.setTitle(newName);
          }

          if (this.compositeBuilder) {
            this.compositeBuilder.renamePieces(oldName, newName);
          }
        }
        spanEl.textContent = entry.name;
        if (entry.listItem) {
          entry.listItem.title = `"${entry.name}" - ${entry.cropInfo.width}×${entry.cropInfo.height} from [${entry.cropInfo.sourceX}, ${entry.cropInfo.sourceY}]`;
        }
      };

      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur();
        } else if (e.key === 'Escape') {
          input.value = entry.name;
          input.blur();
        }
        e.stopPropagation();
      });
    }

  _getNextCropName() {
      const index = this.cropNameCounter;
      this.cropNameCounter++;
      let name = '';
      let n = index;
      do {
        name = String.fromCharCode(97 + (n % 26)) + name;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return name;
    }

  _syncSourceToComposite() {
      if (!this.compositeBuilder) return;

      const topDialog = this._getTopVisibleDialog();
      if (topDialog && topDialog._uiInstance) {
        const ui = topDialog._uiInstance;
        if (ui.canvas) {
          this.compositeBuilder.setSourceCanvas(
            ui.canvas,
            (topDialog.options && topDialog.options.title) || 'image'
          );
        }
      }
    }

  _getTopVisibleDialog() {
      let best = null;
      let bestZ = -1;
      this.dialogInstances.forEach((d) => {
        if (d.element.style.display === 'none') return;
        const z = parseInt(d.element.style.zIndex, 10) || 0;
        if (z > bestZ) {
          bestZ = z;
          best = d;
        }
      });
      return best;
    }
}