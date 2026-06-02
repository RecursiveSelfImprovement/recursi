class ImageProcessorUI {
    constructor(imageFile, containerElement, onPopOut, isDialog = false) {
      this.imageFile = imageFile;
      this.containerElement = containerElement;
      this.onPopOut = onPopOut;
      this.isDialog = isDialog;
      this.onCropComplete = null;

      this.originalImage = new Image();
      this.garbageMaskData = null;
      this.garbageMaskImage = null;
      this.garbageMaskCanvas = null;

      this.mode = 'hue';
      this.targetHue = null;
      this.targetRGB = null; 
      this.tolerance = 60;
      this.toleranceBlack = 10;
      this.toleranceColor = 128; 
      this.isBgVisible = true;

      this.uiElement = null;
      this.canvas = null;
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
      this.canvasContainer = null;
      this.imageArea = null;
      this.controlPanel = null;
      this.modeSwitch = null;
      this.targetSwatch = null;
      this.targetGroup = null;
      this.hueLabel = null;
      this.toleranceSlider = null;
      this.toleranceLabel = null;
      this.toleranceValueDisplay = null;
      this.bgColorPicker = null;
      this.bgToggle = null;
      this.maskDropArea = null;
      this.maskControlsActive = null;
      this.garbageToggle = null;
      this.removeMaskButton = null;
      this.popOutButton = null;
      this.processor = null;

      this.cropTool = null;
      this.cropToggleButton = null;
      this.cropAutoOpenCheck = null;

      this.bgEffects = null;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.originalImage.onload = () => {
          this._createUi();
          this._applyStyles();
          setTimeout(() => {
            if (this.bgEffects) this.bgEffects.resize();
          }, 100);
        };
        this.originalImage.onerror = () => {
          console.error('Error loading image.');
          alert('Error loading the image file.');
        };
        this.originalImage.src = e.target.result;
      };
      reader.onerror = () => {
        console.error('Error reading file.');
        alert('Error reading the image file.');
      };
      reader.readAsDataURL(this.imageFile);
    }

    _createUi() {
      try {
        this.uiElement = makeElement('div', { class: 'image-dialog-layout' });
        if (this.isDialog) {
          this.uiElement.classList.add('is-in-dialog');
        }

        this.imageArea = makeElement('div', { class: 'image-area' });
        this.canvasContainer = makeElement('div', { class: 'canvas-container' });

        this.canvasWrapper = makeElement('div', {
          class: 'canvas-wrapper',
          style: {
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minWidth: '1px',
            minHeight: '1px',
          },
        });

        this.bgEffects = new BackgroundEffects(this.canvasWrapper);
        this.bgEffects.setColor('#808080');
        this.bgEffects.setMode('color');

        this.canvas = makeElement('canvas', {
          width: this.originalImage.width,
          height: this.originalImage.height,
          class: 'main-canvas',
          style: { position: 'relative', zIndex: '10', display: 'block' },
        });

        this.canvasWrapper.appendChild(this.canvas);
        this.canvasContainer.appendChild(this.canvasWrapper);
        this.imageArea.appendChild(this.canvasContainer);

        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.originalImage.width;
        this.offscreenCanvas.height = this.originalImage.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
          willReadFrequently: true,
        });
        this.offscreenCtx.drawImage(this.originalImage, 0, 0);

        this.controlPanel = makeElement('div', { class: 'control-panel' });

        if (!this.isDialog) {
          this.popOutButton = makeElement(
            'button',
            { class: 'button-pop-out' },
            'Pop Out to Window ❐'
          );
          const topBar = makeElement(
            'div',
            { class: 'control-group top-bar' },
            this.popOutButton
          );
          this.controlPanel.appendChild(topBar);
        }

        this.cropToggleButton = makeElement(
          'button',
          { class: 'crop-toggle-btn' },
          '✂ Crop Mode'
        );

        this.cropAutoOpenCheck = makeElement('input', {
          type: 'checkbox',
          checked: true,
        });

        const cropAutoLabel = makeElement(
          'label',
          {
            class: 'crop-auto-label',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              fontSize: '0.85em',
              color: '#aaa',
            },
          },
          this.cropAutoOpenCheck,
          'Open in window'
        );

        const cropGroup = makeElement(
          'div',
          { class: 'control-group' },
          makeElement('strong', 'Crop Tool'),
          makeElement(
            'div',
            { class: 'control-row', style: { justifyContent: 'space-between' } },
            this.cropToggleButton,
            cropAutoLabel
          )
        );
        this.controlPanel.appendChild(cropGroup);

        const uniqueName = 'algMode_' + Date.now();
        const radioNone = makeElement('input', {
          type: 'radio',
          name: uniqueName,
          id: 'modeNone_' + uniqueName,
        });
        const radioHue = makeElement('input', {
          type: 'radio',
          name: uniqueName,
          id: 'modeHue_' + uniqueName,
          checked: true,
        });
        const radioColor = makeElement('input', {
          type: 'radio',
          name: uniqueName,
          id: 'modeColor_' + uniqueName,
        });
        const radioBlack = makeElement('input', {
          type: 'radio',
          name: uniqueName,
          id: 'modeBlack_' + uniqueName,
        });

        radioNone.addEventListener('change', () => this._setMode('none'));
        radioHue.addEventListener('change', () => this._setMode('hue'));
        radioColor.addEventListener('change', () => this._setMode('color'));
        radioBlack.addEventListener('change', () => this._setMode('black'));

        this.modeSwitchGroup = makeElement(
          'div',
          { class: 'control-group' },
          makeElement('strong', 'Extraction Mode'),
          makeElement(
            'div',
            { class: 'control-row mode-switch-row', style: { flexWrap: 'wrap' } },
            makeElement('label', { class: 'radio-label' }, radioNone, ' None'),
            makeElement('label', { class: 'radio-label' }, radioHue, ' Hue'),
            makeElement('label', { class: 'radio-label' }, radioColor, ' Color'),
            makeElement(
              'label',
              { class: 'radio-label' },
              radioBlack,
              ' Black BG'
            )
          )
        );
        this.controlPanel.appendChild(this.modeSwitchGroup);

        this.targetSwatch = makeElement('div', {
          class: 'control-swatch target-swatch',
        });
        this.hueLabel = makeElement('span', {
          class: 'control-label',
          textContent: 'Target: -',
        });
        this.targetGroup = makeElement(
          'div',
          { class: 'control-group' },
          makeElement('strong', { textContent: 'Target Color' }),
          makeElement(
            'div',
            { class: 'control-row' },
            this.targetSwatch,
            this.hueLabel
          ),
          makeElement('div', {
            class: 'control-hint',
            textContent: 'Click on the image to select',
          })
        );
        this.controlPanel.appendChild(this.targetGroup);

        this.toleranceSlider = makeElement('input', {
          type: 'range',
          min: '0',
          max: '180',
          value: this.tolerance,
        });
        this.toleranceValueDisplay = makeElement('output', {
          class: 'control-value',
          textContent: this.tolerance + '°',
        });
        this.toleranceLabel = makeElement('strong', { textContent: 'Tolerance' });

        this.toleranceGroup = makeElement(
          'div',
          { class: 'control-group' },
          this.toleranceLabel,
          makeElement(
            'div',
            { class: 'control-row tolerance-row' },
            this.toleranceSlider,
            this.toleranceValueDisplay
          )
        );
        this.controlPanel.appendChild(this.toleranceGroup);

        this.bgOffToggle = makeElement(
          'div',
          {
            class: 'control-toggle-button',
            title: 'No Background (Transparent)',
          },
          '⬚'
        );

        this.bgToggle = makeElement(
          'div',
          { class: 'control-toggle-button active', title: 'Solid Color' },
          '■'
        );

        this.bgColorPicker = makeElement('input', {
          type: 'color',
          value: '#808080',
          class: 'control-color-picker',
        });

        this.gridToggle = makeElement(
          'div',
          { class: 'control-toggle-button', title: 'Animated Grid' },
          '▦'
        );

        this.psychToggle = makeElement(
          'div',
          {
            class: 'control-toggle-button psych-toggle',
            title: 'Psychedelic Mode',
          },
          '🌀'
        );

        const createSlider = (label, min, max, val) => {
          const el = makeElement('input', {
            type: 'range',
            min,
            max,
            value: val,
            step: '1',
          });
          return {
            container: makeElement(
              'div',
              { class: 'sub-control-row' },
              makeElement('span', label),
              el
            ),
            input: el,
          };
        };

        const speedC = createSlider('Speed', 1, 10, this.bgEffects.psychSpeed);
        const scaleC = createSlider('Size', 10, 100, this.bgEffects.psychScale);
        const countC = createSlider(
          'Count',
          10,
          200,
          this.bgEffects.psychComplexity
        );
        const chaosC = createSlider('Chaos', 0, 100, this.bgEffects.psychChaos);

        this.sparkleCheck = makeElement('input', {
          type: 'checkbox',
          checked: this.bgEffects.psychShowSparkles,
        });
        const sparkleRow = makeElement(
          'div',
          { class: 'sub-control-row' },
          makeElement(
            'label',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              },
            },
            this.sparkleCheck,
            'Show Sparkles ✨'
          )
        );

        this.psychSpeedInput = speedC.input;
        this.psychScaleInput = scaleC.input;
        this.psychCountInput = countC.input;
        this.psychChaosInput = chaosC.input;

        this.psychControls = makeElement(
          'div',
          { class: 'psych-controls-panel', style: { display: 'none' } },
          sparkleRow,
          speedC.container,
          scaleC.container,
          countC.container,
          chaosC.container
        );

        const bgGroup = makeElement(
          'div',
          { class: 'control-group' },
          makeElement('strong', { textContent: 'Background' }),
          makeElement(
            'div',
            { class: 'control-row', style: { justifyContent: 'space-between' } },
            this.bgOffToggle,
            makeElement(
              'div',
              { style: { display: 'flex', gap: '5px', alignItems: 'center' } },
              this.bgToggle,
              this.bgColorPicker
            ),
            this.gridToggle,
            this.psychToggle
          ),
          this.psychControls
        );

        this.maskDropArea = makeElement(
          'div',
          { class: 'mask-drop-area' },
          makeElement('span', { class: 'drop-icon', textContent: '🖼️ ' }),
          makeElement('span', {
            class: 'drop-text',
            textContent: 'Drop Mask Image Here',
          })
        );
        this.garbageToggle = makeElement('input', {
          type: 'checkbox',
          id: 'maskToggle',
          checked: false,
        });
        this.removeMaskButton = makeElement('button', {
          class: 'button-small',
          textContent: 'Remove Mask',
        });
        this.maskControlsActive = makeElement(
          'div',
          { class: 'mask-controls-active', style: { display: 'none' } },
          makeElement(
            'div',
            { class: 'control-row' },
            makeElement('label', {
              htmlFor: 'maskToggle',
              textContent: 'Show Mask Overlay',
            }),
            this.garbageToggle
          ),
          this.removeMaskButton
        );
        const maskGroup = makeElement(
          'div',
          { class: 'control-group' },
          makeElement('strong', { textContent: 'Garbage Mask (Optional)' }),
          this.maskDropArea,
          this.maskControlsActive
        );

        this.controlPanel.appendChild(bgGroup);
        this.controlPanel.appendChild(maskGroup);

        this.uiElement.appendChild(this.imageArea);
        this.uiElement.appendChild(this.controlPanel);
        this.containerElement.appendChild(this.uiElement);

        if (typeof CropTool !== 'undefined') {
          this.cropTool = new CropTool({
            canvas: this.canvas,
            canvasWrapper: this.canvasWrapper,
            autoOpenWindow: true,
            onCropComplete: (cropInfo) => this._handleCropComplete(cropInfo),
          });
        } else {
          console.warn('CropTool class not available, crop feature disabled.');
          this.cropTool = null;
        }

        this._setupEventListeners();
        this._drawOriginalImage();

        this.psychResizeObserver = new ResizeObserver(() => {
          if (this.bgEffects) this.bgEffects.resize();
        });
        this.psychResizeObserver.observe(this.canvas);
      } catch (err) {
        console.error('Critical error building ImageProcessorUI:', err);
      }
    }

    _drawOriginalImage() {
      const ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(this.offscreenCanvas, 0, 0);
    }

    _handleCanvasClick(e) {
      if (this.cropTool && this.cropTool.isActive()) return;
      if (this.mode !== 'hue' && this.mode !== 'color') return;

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      const clampedX = Math.max(0, Math.min(this.offscreenCanvas.width - 1, x));
      const clampedY = Math.max(0, Math.min(this.offscreenCanvas.height - 1, y));

      const imgData = this.offscreenCtx.getImageData(
        0,
        0,
        this.offscreenCanvas.width,
        this.offscreenCanvas.height
      );
      const pixel = CanvasUtils.getPixel(imgData, clampedX, clampedY);

      if (pixel[3] < 10) {
        console.log('Clicked on a transparent area.');
        return;
      }

      if (this.mode === 'color') {
        this.targetRGB = [pixel[0], pixel[1], pixel[2]];
        const hex =
          '#' +
          [pixel[0], pixel[1], pixel[2]]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('');
        this.targetSwatch.style.backgroundColor = hex;
        this.hueLabel.textContent = `Target: ${hex} (${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
        this._processImage();
        return;
      }

      const rNorm = pixel[0] / 255;
      const gNorm = pixel[1] / 255;
      const bNorm = pixel[2] / 255;

      const hsv = SimplifiedHSV.rgbToSHsv([rNorm, gNorm, bNorm]);
      this.targetHue = Math.round(hsv[0] * 360) % 360;
      if (this.targetHue < 0) this.targetHue += 360;

      const swatchHex = ImageProcessorUI.hueToHex(this.targetHue);
      this.targetSwatch.style.backgroundColor = swatchHex;
      this.hueLabel.textContent = `Target: ${this.targetHue}°`;

      this._processImage();
    }

    _handleToleranceChange() {
      const val = parseInt(this.toleranceSlider.value, 10);

      if (this.mode === 'hue') {
        this.tolerance = val;
        this.toleranceValueDisplay.textContent = this.tolerance + '°';
        if (this.targetHue !== null) {
          this._processImage();
        }
      } else if (this.mode === 'color') {
        this.toleranceColor = val;
        this.toleranceValueDisplay.textContent = this.toleranceColor;
        if (this.targetRGB !== null) {
          this._processImage();
        }
      } else {
        this.toleranceBlack = val;
        this.toleranceValueDisplay.textContent = this.toleranceBlack;
        this._processImage();
      }
    }

    _handleMaskDrop(e) {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const maskImg = new Image();
            maskImg.onload = () => {
              if (maskImg.width === 0 || maskImg.height === 0) {
                alert('Error: Mask image has zero dimensions.');
                return;
              }
              this.garbageMaskImage = maskImg;
              const targetWidth = this.offscreenCanvas.width;
              const targetHeight = this.offscreenCanvas.height;
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = targetWidth;
              tempCanvas.height = targetHeight;
              const tempCtx = tempCanvas.getContext('2d', {
                willReadFrequently: true,
              });
              tempCtx.drawImage(maskImg, 0, 0, targetWidth, targetHeight);
              try {
                this.garbageMaskData = tempCtx.getImageData(
                  0,
                  0,
                  targetWidth,
                  targetHeight
                );
              } catch (error) {
                console.error('Error getting mask image data:', error);
                alert('Error processing mask image.');
                this._removeGarbageMask();
                return;
              }
              this._showGarbageMaskControls(true);
              this._createOrUpdateMaskOverlay();
              this._processImage();
            };
            maskImg.onerror = () => {
              alert('Error loading the dropped mask image.');
            };
            maskImg.src = ev.target.result;
          };
          reader.onerror = () => {
            alert('Error reading the dropped mask file.');
          };
          reader.readAsDataURL(file);
        } else {
          alert('Please drop an image file for the mask.');
        }
      }
    }

    _createOrUpdateMaskOverlay() {
      if (!this.garbageMaskImage) return;
      if (!this.garbageMaskCanvas) {
        this.garbageMaskCanvas = makeElement('canvas', {
          class: 'mask-overlay-canvas',
        });
        this.garbageMaskCanvas.width = this.canvas.width;
        this.garbageMaskCanvas.height = this.canvas.height;
        this.canvasContainer.appendChild(this.garbageMaskCanvas);
      }
      this.garbageMaskCanvas.style.display = this.garbageToggle.checked
        ? 'block'
        : 'none';
      const gCtx = this.garbageMaskCanvas.getContext('2d');
      gCtx.clearRect(
        0,
        0,
        this.garbageMaskCanvas.width,
        this.garbageMaskCanvas.height
      );
      gCtx.drawImage(
        this.garbageMaskImage,
        0,
        0,
        this.garbageMaskCanvas.width,
        this.garbageMaskCanvas.height
      );
    }

    _showGarbageMaskControls(isMaskLoaded) {
      this.maskDropArea.style.display = isMaskLoaded ? 'none' : 'flex';
      this.maskControlsActive.style.display = isMaskLoaded ? 'block' : 'none';
      this.garbageToggle.checked = isMaskLoaded;
      if (this.garbageMaskCanvas) {
        this.garbageMaskCanvas.style.display = isMaskLoaded ? 'block' : 'none';
      }
    }

    _removeGarbageMask() {
      this.garbageMaskData = null;
      this.garbageMaskImage = null;
      if (
        this.garbageMaskCanvas &&
        this.garbageMaskCanvas.parentNode === this.canvasContainer
      ) {
        this.canvasContainer.removeChild(this.garbageMaskCanvas);
      }
      this.garbageMaskCanvas = null;
      this._showGarbageMaskControls(false);
      this._processImage();
    }

    _processImage() {
      if (this.mode === 'none') {
        this._drawOriginalImage();
        return;
      }

      if (this.mode === 'hue' && this.targetHue === null) {
        this._drawOriginalImage();
        return;
      }

      if (this.mode === 'color' && this.targetRGB === null) {
        this._drawOriginalImage();
        return;
      }

      const inputImageData = this.offscreenCtx.getImageData(
        0,
        0,
        this.offscreenCanvas.width,
        this.offscreenCanvas.height
      );
      const outputCtx = this.canvas.getContext('2d');
      if (!outputCtx) {
        console.error('Could not get 2D context for the output canvas.');
        return;
      }

      if (this.processor) {
        this.processor.stop();
        this.processor = null;
      }

      let activeTolerance;
      if (this.mode === 'hue') {
        activeTolerance = this.tolerance;
      } else if (this.mode === 'color') {
        activeTolerance = this.toleranceColor;
      } else {
        activeTolerance = this.toleranceBlack;
      }

      this.processor = new ColorToAlphaProcessor(inputImageData, this.canvas, {
        mode: this.mode,
        targetHue: this.targetHue,
        targetRGB: this.targetRGB,
        tolerance: activeTolerance,
        chunkPixels: 50000,
        maskImageData: this.garbageMaskData,
        maskMap: null,
        hsMap: null,
        onProgress: (progress) => {},
        onComplete: () => {
          this.processor = null;
          if (this.garbageMaskCanvas) {
            this.garbageMaskCanvas.style.display = this.garbageToggle.checked
              ? 'block'
              : 'none';
          }
        },
      });
      this.processor.start();
    }

    destroy() {
      if (this.cropTool) {
        this.cropTool.deactivate();
      }
      if (this.bgEffects) {
        this.bgEffects.destroy();
      }
      if (this.psychResizeObserver) {
        this.psychResizeObserver.disconnect();
      }
      if (this.processor) {
        this.processor.stop();
      }
      if (this.uiElement && this.uiElement.parentNode) {
        this.uiElement.parentNode.removeChild(this.uiElement);
      }
    }

    getUiElement() {
      return this.uiElement;
    }

    getImageSize() {
      return {
        width: this.originalImage.width,
        height: this.originalImage.height,
      };
    }

    setContainer(newContainer, isNowInDialog) {
      this.containerElement = newContainer;
      if (isNowInDialog) {
        this.isDialog = true;
        if (this.popOutButton) {
          this.popOutButton.style.display = 'none';
        }
        this.uiElement.classList.add('is-in-dialog');
      }
    }

    static hueToHex(hue) {
      const hueNorm = (hue % 360) / 360.0;
      const rgbNorm = SimplifiedHSV.sHsvToRgb([hueNorm, 1.0, 1.0]);
      const r = Math.round(rgbNorm[0] * 255);
      const g = Math.round(rgbNorm[1] * 255);
      const b = Math.round(rgbNorm[2] * 255);
      return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    }

    _toggleBgMode(mode) {
      this.bgOffToggle.classList.remove('active');
      this.bgToggle.classList.remove('active');
      this.gridToggle.classList.remove('active');
      this.psychToggle.classList.remove('active');
      this.psychControls.style.display = 'none';

      if (mode === 'none') {
        this.bgOffToggle.classList.add('active');
      } else if (mode === 'color') {
        this.bgToggle.classList.add('active');
      } else if (mode === 'grid') {
        this.gridToggle.classList.add('active');
      } else if (mode === 'psych') {
        this.psychToggle.classList.add('active');
        this.psychControls.style.display = 'block';
      }

      if (this.bgEffects) {
        this.bgEffects.setMode(mode);
      }
    }

    _setMode(mode) {
      this.mode = mode;

      if (mode === 'none') {
        this.targetGroup.style.display = 'none';
        this.toleranceGroup.style.display = 'none';
        this._drawOriginalImage();
      } else if (mode === 'hue') {
        this.targetGroup.style.display = 'block';
        this.toleranceGroup.style.display = 'block';
        this.toleranceLabel.textContent = 'Tolerance';
        this.toleranceSlider.max = '180';
        this.toleranceSlider.value = this.tolerance;
        this.toleranceValueDisplay.textContent = this.tolerance + '°';
        this._processImage();
      } else if (mode === 'color') {
        this.targetGroup.style.display = 'block';
        this.toleranceGroup.style.display = 'block';
        this.toleranceLabel.textContent = 'Color Distance';
        this.toleranceSlider.max = '255';
        this.toleranceSlider.value = this.toleranceColor;
        this.toleranceValueDisplay.textContent = this.toleranceColor;
        if (this.targetRGB) {
          const hex =
            '#' +
            this.targetRGB.map((v) => v.toString(16).padStart(2, '0')).join('');
          this.targetSwatch.style.backgroundColor = hex;
          this.hueLabel.textContent = `Target: ${hex} (${this.targetRGB[0]}, ${this.targetRGB[1]}, ${this.targetRGB[2]})`;
        } else {
          this.targetSwatch.style.backgroundColor = '';
          this.hueLabel.textContent = 'Target: -';
        }
        this._processImage();
      } else {
        this.targetGroup.style.display = 'none';
        this.toleranceGroup.style.display = 'block';
        this.toleranceLabel.textContent = 'Black Threshold';
        this.toleranceSlider.max = '255';
        this.toleranceSlider.value = this.toleranceBlack;
        this.toleranceValueDisplay.textContent = this.toleranceBlack;
        this._processImage();
      }
    }

    _applyStyles() {
      const css = `
          .image-dialog-layout { 
              display: flex; flex-direction: row; width: 100%; height: 100%; 
              background-color: #222; color: #eee; box-sizing: border-box; 
              overflow: hidden; 
          }
          
          .image-area { 
              flex: 1; 
              display: flex; justify-content: center; align-items: center; 
              overflow: hidden; 
              background-color: #1e1e1e; 
              position: relative; 
              min-width: 0; min-height: 0;
              padding: 4px; 
          }
          
          .image-dialog-layout.is-in-dialog.image-area { background-color: transparent; }

          .canvas-container { 
              position: relative; 
              width: 100%; height: 100%; 
              display: flex; justify-content: center; align-items: center; 
          }

          .canvas-wrapper {
               position: relative;
               max-width: 100%; max-height: 100%;
               display: flex; justify-content: center; align-items: center;
               min-width: 1px; min-height: 1px;
          }

          .main-canvas { 
              display: block; 
              max-width: 100%; max-height: 100%;
              height: auto; width: auto;
              background-color: transparent; 
              box-shadow: 0 0 10px rgba(0,0,0,0.5); 
              cursor: crosshair; 
              position: relative; z-index: 10;
          }
          
          .psych-svg-bg, .grid-bg-anim, .mask-overlay-canvas {
              position: absolute; top: 0; left: 0; width: 100%; height: 100%;
              pointer-events: none;
          }
          .mask-overlay-canvas { z-index: 20; opacity: 0.7; image-rendering: pixelated; }

          .control-panel { 
              flex: 0 0 260px; 
              display: flex; flex-direction: column; 
              padding: 15px; 
              background-color: #2a2a2a; 
              border-left: 1px solid #444;
              overflow-y: auto; 
              font-size: 0.9em; box-sizing: border-box; z-index: 30; 
          }
          
          .control-group { padding-bottom: 15px; margin-bottom: 15px; border-bottom: 1px solid #444; }
          .control-group:last-child { border-bottom: none; }
          .control-group strong { display: block; margin-bottom: 10px; color: #ccc; }
          
          .control-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
          .control-swatch { width: 28px; height: 28px; border: 1px solid #555; border-radius: 4px; }
          .control-label { color: #aaa; }
          .control-value { font-weight: bold; color: #fff; min-width: 35px; text-align: right; }
          
          input[type="range"] { flex-grow: 1; accent-color: #007bff; background: #444; }
          .control-color-picker { border: 1px solid #555; background: none; }
          
          .mask-drop-area { 
              border: 2px dashed #555; border-radius: 6px; padding: 15px; 
              text-align: center; cursor: pointer; 
              background-color: #222; color: #888;
          }
          .mask-drop-area:hover { border-color: #007bff; color: #007bff; background-color: #252525; }

          .button-small { background-color: #c42b1c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
          .button-small:hover { background-color: #a01b0e; }
          
          .control-toggle-button {
              width: 30px; height: 30px; background: #333; border: 1px solid #555; color: #aaa;
              display: flex; justify-content: center; align-items: center; border-radius: 4px; cursor: pointer;
          }
          .control-toggle-button.active { background: #007bff; color: white; border-color: #0056b3; }
          
          .psych-controls-panel { background: #332033; border: 1px solid #553055; padding: 8px; border-radius: 4px; margin-top: 8px; }

          .crop-toggle-btn {
              padding: 6px 14px; background: #333; border: 1px solid #555; color: #ccc;
              border-radius: 4px; cursor: pointer; font-size: 0.9em; transition: all 0.15s;
          }
          .crop-toggle-btn:hover { background: #444; color: #fff; }
          .crop-toggle-btn.active { background: #d48800; color: #fff; border-color: #b37300; }
          
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: #222; }
          ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #555; }
        `;
      const styleId =
        'image-processor-styles-' +
        this.imageFile.name.replace(/[^a-zA-Z0-9]/g, '');
      applyCss(css, styleId);
    }

    _setupEventListeners() {
      this.canvas.addEventListener('click', (e) => this._handleCanvasClick(e));
      this.toleranceSlider.addEventListener('input', () =>
        this._handleToleranceChange()
      );

      this.cropToggleButton.addEventListener('click', () =>
        this._toggleCropMode()
      );
      this.cropAutoOpenCheck.addEventListener('change', () => {
        if (this.cropTool) {
          this.cropTool.setAutoOpen(this.cropAutoOpenCheck.checked);
        }
      });

      this.bgOffToggle.addEventListener('click', () =>
        this._toggleBgMode('none')
      );
      this.bgToggle.addEventListener('click', () => this._toggleBgMode('color'));
      this.gridToggle.addEventListener('click', () => this._toggleBgMode('grid'));
      this.psychToggle.addEventListener('click', () =>
        this._toggleBgMode('psych')
      );

      this.bgColorPicker.addEventListener('input', () => {
        this._toggleBgMode('color');
        if (this.bgEffects) this.bgEffects.setColor(this.bgColorPicker.value);
      });

      const updatePsych = (params) => {
        if (this.bgEffects) this.bgEffects.updatePsychParams(params);
      };

      this.sparkleCheck.addEventListener('change', () => {
        updatePsych({ sparkles: this.sparkleCheck.checked });
      });

      this.psychSpeedInput.addEventListener('input', () => {
        updatePsych({ speed: Number(this.psychSpeedInput.value) });
      });

      this.psychScaleInput.addEventListener('input', () => {
        updatePsych({ scale: Number(this.psychScaleInput.value) });
      });

      this.psychCountInput.addEventListener('input', () => {
        updatePsych({ complexity: Number(this.psychCountInput.value) });
      });

      this.psychChaosInput.addEventListener('input', () => {
        updatePsych({ chaos: Number(this.psychChaosInput.value) });
      });

      const stopFn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      };

      this.maskDropArea.addEventListener('dragenter', (e) => {
        stopFn(e);
        this.maskDropArea.classList.add('drag-over');
      });

      this.maskDropArea.addEventListener('dragover', (e) => {
        stopFn(e);
        this.maskDropArea.classList.add('drag-over');
      });

      this.maskDropArea.addEventListener('dragleave', (e) => {
        stopFn(e);
        if (e.relatedTarget && !this.maskDropArea.contains(e.relatedTarget)) {
          this.maskDropArea.classList.remove('drag-over');
        }
      });

      this.maskDropArea.addEventListener('drop', (e) => {
        stopFn(e);
        this.maskDropArea.classList.remove('drag-over');

        const globalIndicator = document.querySelector('.drop-indicator');
        if (globalIndicator) globalIndicator.classList.remove('active');

        this._handleMaskDrop(e);
      });

      this.garbageToggle.addEventListener('change', () => {
        if (this.garbageMaskCanvas)
          this.garbageMaskCanvas.style.display = this.garbageToggle.checked
            ? 'block'
            : 'none';
      });
      this.removeMaskButton.addEventListener('click', () =>
        this._removeGarbageMask()
      );

      if (this.popOutButton) {
        this.popOutButton.addEventListener('click', () => {
          if (this.onPopOut) this.onPopOut(this);
        });
      }
    }

    _handleCropComplete(cropInfo) {
      if (this.onCropComplete) {
        this.onCropComplete(cropInfo);
      }
    }

    _toggleCropMode() {
      if (!this.cropTool) return;

      if (this.cropTool.isActive()) {
        this.cropTool.deactivate();
        this.cropToggleButton.classList.remove('active');
        this.cropToggleButton.textContent = '✂ Crop Mode';
      } else {
        this.cropTool.activate();
        this.cropToggleButton.classList.add('active');
        this.cropToggleButton.textContent = '✂ Crop Mode (ON)';
      }
    }
  }