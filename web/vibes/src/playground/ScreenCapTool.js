
class ScreenCapTool {
  LS_KEY = 'screenCapToolSettings_v2';

  controlDialog = null;

  previewDialog = null;

  settings = {};

  explicitlySetFields = new Set();

  mediaStream = null;

  videoElement = null;

  previewCanvas = null;

  captureCanvas = null;

  outputTab = null;

  isCapturing = false;

  animationFrameId = null;

  snapTimeoutId = null;

  startButton = null;

  stopButton = null;

  statusDiv = null;

  inputs = {};

  applyStyles() {
      applyCss(
        `
        body { background-color: #334; color: #eee; }
        .screencap-controls .input-grid { display: grid; grid-template-columns: auto 1fr 1fr; gap: 12px 8px; align-items: center; margin-bottom: 15px; }
        .screencap-controls label { font-size: 1.1em; text-align: right; }
        .screencap-controls input[type="number"] { width: 100%; box-sizing: border-box; padding: 5px; background-color: #1e1e1e; border: 1px solid #555; color: #eee; border-radius: 3px; text-align: center; }
        .screencap-controls .actions-grid { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
        .screencap-controls .control-buttons { display: flex; gap: 10px; }
        .screencap-controls .control-buttons button { flex-grow: 1; padding: 8px; font-size: 1em; }
        .screencap-controls .snap-controls { display: flex; gap: 8px; }
        .screencap-controls .snap-controls button { font-size: 1.2em; padding: 8px 12px; }
        .status-message { margin-top: 15px; padding: 8px; background-color: rgba(0,0,0,0.2); border-radius: 4px; min-height: 1.5em; font-family: monospace; text-align: center; }
        .status-error { color: #ffdddd; background-color: #802020; }
        .screencap-controls .radio-group { display: flex; gap: 15px; margin-bottom: 5px; }
        .screencap-controls .radio-group label { display: flex; align-items: center; gap: 5px; cursor: pointer; text-align: left; }
        .screencap-controls input[type="radio"] { margin: 0; }
        .screencap-controls #thumb-index:disabled { background-color: #333; color: #888; }
        .upload-section button { width: 100%; padding: 8px; font-size: 1.1em; background-color: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .upload-section button:disabled { background-color: #555; cursor: not-allowed; }
        .upload-section .resume-btn { background-color: #f39c12; margin-top: 8px; }
        .upload-section .resume-btn:disabled { background-color: #555; }
        .live-preview-canvas { width: 160px; height: 240px; border: 1px solid #555; background-color: #111; box-sizing: border-box; }
        .canvas-flash { box-shadow: 0 0 15px 5px #00ffaa !important; transition: box-shadow 0.1s ease-in-out; }
    `,
        'screen-cap-tool-styles'
      );
    }

  createControlDialog() {
      const createInput = (id, value) => {
        const input = makeElement('input', { type: 'number', id, value, min: 0 });
        input.addEventListener('input', (e) => this.handleInputChange(e));
        this.inputs[id] = input;
        return input;
      };

      this.replaceRadio = makeElement('input', {
        type: 'radio',
        name: 'upload-mode',
        id: 'mode-replace',
      });
      this.addRadio = makeElement('input', {
        type: 'radio',
        name: 'upload-mode',
        id: 'mode-add',
        checked: true,
      });

      this.handleRadioChange = () => {
        const numThumbs =
          this.currentProject && this.currentProject.thumbnails
            ? this.currentProject.thumbnails.length
            : 0;

        if (this.addRadio.checked || numThumbs === 0) {
          this.addRadio.checked = true;
          this.thumbIndexInput.value = numThumbs + 1;
          this.thumbIndexInput.disabled = true;
          this.uploadButton.textContent = `Save as Image #${numThumbs + 1}`;
        } else {
          this.thumbIndexInput.disabled = false;
          let val = parseInt(this.thumbIndexInput.value, 10) || 1;
          if (val > numThumbs) val = numThumbs;
          if (val < 1) val = 1;
          this.thumbIndexInput.value = val;
          this.uploadButton.textContent = `Save as Image #${val}`;
        }
      };

      this.replaceRadio.onchange = this.handleRadioChange;
      this.addRadio.onchange = this.handleRadioChange;

      this.previewCanvas = makeElement('canvas', {
        className: 'live-preview-canvas',
      });

      this.uploadButton = makeElement('button', {
        textContent: 'Save to Disk',
        disabled: true,
        onclick: () => this.uploadThumbnail(),
      });

      this.resumeButton = makeElement('button', {
        className: 'resume-btn',
        textContent: 'Resume Feed',
        style: { display: 'none' },
        onclick: () => this.resumeFeed(),
      });

      const uploadSection = makeElement(
        'div',
        {
          className: 'upload-section',
          style: {
            borderTop: '1px solid #555',
            marginTop: '15px',
            paddingTop: '15px',
          },
        },
        [
          makeElement(
            'div',
            { style: { display: 'flex', gap: '15px', alignItems: 'flex-start' } },
            [
              this.previewCanvas,
              makeElement(
                'div',
                {
                  style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  },
                },
                [
                  makeElement('div', { className: 'radio-group' }, [
                    makeElement('label', {}, [this.replaceRadio, 'Replace']),
                    makeElement('label', {}, [this.addRadio, 'Add New']),
                  ]),
                  makeElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      },
                    },
                    [
                      makeElement(
                        'label',
                        { htmlFor: 'thumb-index' },
                        'Image #:'
                      ),
                      (this.thumbIndexInput = makeElement('input', {
                        type: 'number',
                        id: 'thumb-index',
                        value: 1,
                        min: 1,
                        style: { width: '60px' },
                        oninput: (e) => {
                          if (this.replaceRadio.checked) {
                            const numThumbs =
                              this.currentProject &&
                              this.currentProject.thumbnails
                                ? this.currentProject.thumbnails.length
                                : 0;
                            let val = parseInt(e.target.value, 10) || 1;
                            if (val > numThumbs) val = numThumbs;
                            if (val < 1) val = 1;
                            e.target.value = val;
                            this.uploadButton.textContent = `Save as Image #${val}`;
                          }
                        },
                      })),
                    ]
                  ),
                  this.uploadButton,
                  this.resumeButton,
                ]
              ),
            ]
          ),
        ]
      );

      this.projectNameDisplay = makeElement(
        'div',
        {
          style: {
            fontSize: '1.2em',
            fontWeight: 'bold',
            color: '#00bfa5',
            textAlign: 'center',
            marginBottom: '15px',
            padding: '8px',
            backgroundColor: 'rgba(0, 191, 165, 0.1)',
            border: '1px solid #00bfa5',
            borderRadius: '4px',
          },
        },
        'No Project Selected'
      );

      this.projectSelect = makeElement('select', {
        style: {
          width: '100%',
          fontSize: '1.1em',
          fontWeight: 'bold',
          color: '#00bfa5',
          backgroundColor: 'rgba(0, 191, 165, 0.1)',
          border: '1px solid #00bfa5',
          borderRadius: '4px',
          padding: '8px',
          marginBottom: '15px',
          outline: 'none',
          cursor: 'pointer',
        },
        onchange: (e) => this._onProjectSelected(e.target.value),
      });
      this.projectSelect.appendChild(
        makeElement('option', { value: '' }, '-- Select Target Project --')
      );

      if (this.allProjects && this.allProjects.length > 0) {
        this.allProjects.forEach((p) => {
          this.projectSelect.appendChild(
            makeElement('option', { value: p.name }, p.name)
          );
        });
      }

      const outWInput = createInput('outW', this.settings.outW);
      const outHInput = createInput('outH', this.settings.outH);
      outWInput.disabled = true;
      outHInput.disabled = true;
      outWInput.title = 'Output width is locked to thumbnail ratio';
      outHInput.title = 'Output height is locked to thumbnail ratio';

      const controlPanel = makeElement(
        'div',
        { className: 'screencap-controls' },
        [
          this.projectSelect,
          this.projectNameDisplay,
          makeElement('div', { className: 'input-grid' }, [
            makeElement('label', '📍 Pos'),
            createInput('capX', this.settings.capX),
            createInput('capY', this.settings.capY),
            makeElement('label', '📏 Capture'),
            createInput('capW', this.settings.capW),
            createInput('capH', this.settings.capH),
            makeElement('label', '📐 Output'),
            outWInput,
            outHInput,
          ]),
          makeElement('div', { className: 'actions-grid' }, [
            makeElement('div', { className: 'snap-controls' }, [
              makeElement(
                'button',
                { onclick: () => this.snapPicture() },
                '📸 Snap'
              ),
              createInput('delay', this.settings.delay),
              makeElement('label', { htmlFor: 'delay' }, 's'),
            ]),
          ]),
          makeElement(
            'div',
            { className: 'control-buttons', style: { marginTop: '15px' } },
            [
              (this.startButton = makeElement(
                'button',
                { onclick: () => this.startCapture() },
                'Start Stream'
              )),
              (this.stopButton = makeElement(
                'button',
                { onclick: () => this.stopCapture(), disabled: true },
                'Stop Stream'
              )),
            ]
          ),
          uploadSection,
          (this.statusDiv = makeElement('div', { className: 'status-message' })),
        ]
      );

      this.controlDialog = UITools.makeDialog({
        title: 'Screen Capture Tool',
        contentElement: controlPanel,
        size: [420, 600],
        position: [50, 50],
        isModal: false,
        onClose: () => {
          this.stopCapture();
          this.controlDialog = null;
          if (this.browser) {
            this.browser._exitEditMode();
          }
        },
      });
    }

  loadSettings() {
      this.LS_KEY = 'screenCapToolSettings_v3';
      const defaults = {
        capX: 0,
        capY: 0,
        capW: 320,
        capH: 480,
        outW: 160,
        outH: 240,
        delay: 3,
      };
      try {
        const saved = localStorage.getItem(this.LS_KEY);
        this.settings = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        this.settings.outW = 160;
        this.settings.outH = 240;
      } catch (e) {
        this.settings = defaults;
      }
    }

  saveSettings() {
      localStorage.setItem(this.LS_KEY, JSON.stringify(this.settings));
    }

  handleInputChange(e) {
      const input = e.target;
      const id = input.id;
      const value = parseInt(input.value, 10) || 0;

      this.settings[id] = value;

      let masterAspectRatio = 0;
      if (this.settings.outW > 0 && this.settings.outH > 0) {
        masterAspectRatio = this.settings.outW / this.settings.outH;
      } else {
        this.saveSettings();
        return;
      }

      if (id.startsWith('cap')) {
        if (id === 'capW') {
          this.settings.capH = Math.round(value / masterAspectRatio);
        } else if (id === 'capH') {
          this.settings.capW = Math.round(value * masterAspectRatio);
        }
      } else if (id.startsWith('out')) {
        this.settings.capH = Math.round(this.settings.capW / masterAspectRatio);
      }

      this.updateInputDisplays();
      this.saveSettings();
    }

  updateInputDisplays() {
      for (const key in this.inputs) {
        if (this.inputs[key].value != this.settings[key]) {
          this.inputs[key].value = this.settings[key];
        }
      }
    }

  async startCapture() {
      try {
        this.updateStatus('Requesting screen capture...');
        this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
        });
        
        this.videoElement = makeElement('video', {
          autoplay: true,
          muted: true,
          playsinline: true,
          style: {
            position: 'absolute',
            width: '1px',
            height: '1px',
            opacity: '0.01',
            pointerEvents: 'none'
          }
        });
        this.videoElement.srcObject = this.mediaStream;
        document.body.appendChild(this.videoElement);

        if (!this.captureCanvas) {
          this.captureCanvas = makeElement('canvas');
        }

        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play(); 
          this.isCapturing = true;
          this.isFrozen = false;
          this.startButton.disabled = true;
          this.stopButton.disabled = false;
          this.refreshSaveButtonState();
          if (this.resumeButton) this.resumeButton.style.display = 'none';

          this.previewLoop();
          this.updateStatus('Capture started. Adjust framing, then Snap.');
        };

        this.mediaStream.getVideoTracks()[0].onended = () =>
          this.stopCapture('by browser UI');

        this._hotkeyListener = (e) => {
          if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            this.snapPicture();
          }
        };
        window.addEventListener('keydown', this._hotkeyListener);
      } catch (err) {
        this.updateStatus(`Error: ${err.message}`, true);
      }
    }

  stopCapture(reason = 'by user') {
      if (!this.isCapturing && !this.mediaStream) return;
      if (this.snapTimeoutId) clearTimeout(this.snapTimeoutId);
      if (this.mediaStream)
        this.mediaStream.getTracks().forEach((track) => track.stop());
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

      if (this._hotkeyListener) {
        window.removeEventListener('keydown', this._hotkeyListener);
        this._hotkeyListener = null;
      }

      this.isCapturing = false;
      this.isFrozen = false;
      this.mediaStream = null;
      if (this.videoElement) {
        this.videoElement.remove();
        this.videoElement = null;
      }
      this.animationFrameId = null;
      this.snapTimeoutId = null;
      this._currentCountdown = null;

      if (this.startButton) this.startButton.disabled = false;
      if (this.stopButton) this.stopButton.disabled = true;
      this.refreshSaveButtonState();
      if (this.resumeButton) this.resumeButton.style.display = 'none';

      if (this.previewCanvas) {
        const ctx = this.previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      }

      this.updateStatus(`Capture stopped ${reason}.`);
    }

  snapPicture() {
      if (!this.isCapturing) {
        this.updateStatus('Must start stream first!', true);
        return;
      }
      if (this.isFrozen) {
        this.resumeFeed();
        return;
      }
      if (this.snapTimeoutId) {
        this.updateStatus('Snapshot already in progress.', true);
        return;
      }
      const delay = this.settings.delay || 0;
      this.countdown(delay);
    }

  countdown(seconds) {
      this._currentCountdown = seconds;
      if (seconds > 0) {
        this.updateStatus(`📸 Snapping in ${seconds}...`);
        this.snapTimeoutId = setTimeout(() => this.countdown(seconds - 1), 1000);
      } else {
        this._currentCountdown = null;
        this.performCapture();
      }
    }

  performCapture() {
      this.snapTimeoutId = null;
      if (!this.isCapturing) return;

      this.isFrozen = true;
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

      this._currentCountdown = null;
      this.drawPreviewFrame();

      const dataUrl = this.previewCanvas.toDataURL('image/jpeg', 0.9);
      this.lastSnapDataUrl = dataUrl;

      this.refreshSaveButtonState();
      if (this.resumeButton) this.resumeButton.style.display = 'block';

      this.previewCanvas.classList.add('canvas-flash');
      this.updateStatus('📸 SNAP! Review framing, then Upload or Resume.');

      setTimeout(() => {
        this.previewCanvas.classList.remove('canvas-flash');
      }, 400);
    }

  drawPreviewFrame() {
      if (!this.videoElement || !this.videoElement.videoWidth) return;
      if (!this.settings.capW || !this.settings.capH) return;

      if (this.captureCanvas.width !== this.settings.capW)
        this.captureCanvas.width = this.settings.capW;
      if (this.captureCanvas.height !== this.settings.capH)
        this.captureCanvas.height = this.settings.capH;

      if (this.previewCanvas.width !== this.settings.outW)
        this.previewCanvas.width = this.settings.outW;
      if (this.previewCanvas.height !== this.settings.outH)
        this.previewCanvas.height = this.settings.outH;

      const capCtx = this.captureCanvas.getContext('2d');
      const prevCtx = this.previewCanvas.getContext('2d');

      capCtx.drawImage(
        this.videoElement,
        this.settings.capX,
        this.settings.capY,
        this.settings.capW,
        this.settings.capH,
        0,
        0,
        this.settings.capW,
        this.settings.capH
      );

      prevCtx.clearRect(
        0,
        0,
        this.previewCanvas.width,
        this.previewCanvas.height
      );
      prevCtx.drawImage(
        this.captureCanvas,
        0,
        0,
        this.previewCanvas.width,
        this.previewCanvas.height
      );

      if (this._currentCountdown > 0) {
        prevCtx.save();
        prevCtx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        const fontSize = Math.floor(this.previewCanvas.height * 0.5);
        prevCtx.font = `bold ${fontSize}px sans-serif`;
        prevCtx.textAlign = 'center';
        prevCtx.textBaseline = 'middle';
        prevCtx.shadowColor = 'black';
        prevCtx.shadowBlur = 10;
        prevCtx.fillText(
          this._currentCountdown,
          this.previewCanvas.width / 2,
          this.previewCanvas.height / 2
        );
        prevCtx.restore();
      }
    }

  previewLoop() {
      if (!this.isCapturing || this.isFrozen) return;
      this.drawPreviewFrame();
      this.animationFrameId = requestAnimationFrame(() => this.previewLoop());
    }

  updateStatus(message, isError = false) {
      if (this.statusDiv) {
        this.statusDiv.textContent = message;
        this.statusDiv.classList.toggle('status-error', isError);
      }
    }

  constructor(browserInstance) {
      console.log('Initializing ScreenCapTool...');
      this.browser = browserInstance; // Reference to ProjectBrowser
      this.applyStyles();
      this.loadSettings();

      this.currentProject = null;
      this.currentThumbnailIndex = 0; // 0-based index
      this.lastSnapDataUrl = null;
      this.allProjects = [];

      this.app = window.vibesApp || window.projectApp || window._dev_projectEditorInstance || window.parent?.vibesApp || window.parent?.projectApp || window.parent?._dev_projectEditorInstance;

      this._fetchProjects();
    }

  showForProject(project, clickedIndex = 0) {
      this.currentProject = project;
      this.currentThumbnailIndex = clickedIndex;

      this.showDialog();
      this.controlDialog.setTitle(`Capture for: ${project.name}`);

      if (this.projectSelect && this.projectSelect.value !== project.name) {
        this.projectSelect.value = project.name;
      }

      if (this.projectNameDisplay) {
        this.projectNameDisplay.textContent = `📸 Target: ${project.name}`;
      }

      this.updateUploadUI();
      this.refreshSaveButtonState();
      this.updateStatus(
        `Targeting ${project.name}. Adjust size/position, then start stream.`
      );
    }

  async uploadThumbnail() {
      const logs = [];
      const addLog = (msg) => {
        logs.push(msg);
        console.log(`[ScreenCapTool] ${msg}`);
        this.updateStatus(msg);
      };

      addLog('Starting thumbnail upload process...');

      if (!this.currentProject) {
        const errorMsg = 'No target project selected. Please select a project from the dropdown first.';
        addLog(`❌ Error: ${errorMsg}`);
        this._showDiagnosticDialog('Target Project Missing', errorMsg, logs);
        return;
      }

      if (!this.lastSnapDataUrl) {
        const errorMsg = 'No snapshot captured yet. Please click the 📸 Snap button first.';
        addLog(`❌ Error: ${errorMsg}`);
        this._showDiagnosticDialog('Snapshot Missing', errorMsg, logs);
        return;
      }

      let app = window.vibesApp || window.projectApp || window._dev_projectEditorInstance || window.parent?.vibesApp || window.parent?.projectApp || window.parent?._dev_projectEditorInstance;
      addLog(`Resolved main application instance: ${app ? app.constructor.name : 'Not Found'}`);

      const webRootHandle = this._findWebRootHandle();
      if (!webRootHandle) {
        const errorMsg = [
          'No active File System Handle for the web root directory was found.',
          '',
          'To resolve this:',
          '1. Click the 📂 Open Folder button in the top Vibes toolbar.',
          '2. Select the parent web/ directory of your project repository (the folder that contains vibes/, projectBrowserThumbnails/, legos/, etc.).',
          '3. This provides Vibes the permissions to read/write across all your sibling project directories.'
        ].join('\n');
        addLog('❌ Error: Web Root Directory Handle Missing.');
        this._showDiagnosticDialog('Web Root Folder Not Open', errorMsg, logs);
        return;
      }

      addLog(`✓ Found Web Root Handle: '${webRootHandle.name}' (kind: ${webRootHandle.kind})`);
      this.uploadButton.disabled = true;

      try {
        if (!this.currentProject.thumbnails) {
          this.currentProject.thumbnails = [];
        }

        addLog(`Accessing subdirectory 'projectBrowserThumbnails' inside '${webRootHandle.name}'...`);
        const thumbnailsDir = await webRootHandle.getDirectoryHandle('projectBrowserThumbnails', { create: true });
        addLog(`✓ Subdirectory 'projectBrowserThumbnails' obtained.`);

        const indexValue = parseInt(this.thumbIndexInput.value, 10) || 1;
        const filename = `${this.currentProject.name}-${indexValue}.jpg`;
        addLog(`Creating file handle for '${filename}'...`);
        const fileHandle = await thumbnailsDir.getFileHandle(filename, { create: true });
        
        addLog(`Opening writable stream for '${filename}'...`);
        const writable = await fileHandle.createWritable();
        
        addLog('Fetching image blob from snapped data URL...');
        const response = await fetch(this.lastSnapDataUrl);
        const blob = await response.blob();
        
        addLog(`Writing blob (${Math.round(blob.size / 1024)} KB) to disk...`);
        await writable.write(blob);
        await writable.close();
        addLog(`✓ File written and closed successfully: projectBrowserThumbnails/${filename}`);

        const path = `/projectBrowserThumbnails/${filename}`;

        let catalogUpdated = false;
        const capsule = window.ProjectCatalogCapsule || window.parent?.ProjectCatalogCapsule || window.parent?.parent?.ProjectCatalogCapsule;
        if (capsule && typeof capsule.getCatalog === 'function') {
          addLog('Accessing ProjectCatalogCapsule in memory...');
          const catalog = capsule.getCatalog();
          let targetProjectObj = null;
          for (const category of Object.values(catalog)) {
            const found = category.find(p => p.name === this.currentProject.name);
            if (found) {
              targetProjectObj = found;
              break;
            }
          }
          if (targetProjectObj) {
            if (!targetProjectObj.thumbnails) targetProjectObj.thumbnails = [];
            const arrayIndex = indexValue - 1;
            if (arrayIndex >= targetProjectObj.thumbnails.length) {
              targetProjectObj.thumbnails.push(path);
            } else {
              targetProjectObj.thumbnails[arrayIndex] = path;
            }
            
            capsule._data_catalog = () => catalog;
            catalogUpdated = true;
            addLog(`✓ Updated ProjectCatalogCapsule in-memory state for '${this.currentProject.name}'`);

            let vfs = app?.vfs;
            if (!vfs && app && typeof app.refreshVirtualFileSystemStores === 'function') {
              vfs = await app.refreshVirtualFileSystemStores();
            }

            if (vfs && typeof vfs.writeFile === 'function') {
              addLog('Saving updated project-catalog.json to disk...');
              const catalogJsonPath = '/vibes/src/tools/browser/project-catalog.json';
              await vfs.writeFile(catalogJsonPath, JSON.stringify(catalog, null, 2));
              addLog(`✓ Saved: ${catalogJsonPath}`);

              addLog('Saving updated ProjectCatalogCapsule.js to disk...');
              const capsulePath = '/vibes/src/tools/browser/ProjectCatalogCapsule.js';
              const capsuleCode = this._generateCapsuleCode(catalog);
              await vfs.writeFile(capsulePath, capsuleCode);
              addLog(`✓ Saved: ${capsulePath}`);
            } else {
              addLog('⚠️ Virtual File System (VFS) is not available to persist catalog files permanently.');
            }
          } else {
            addLog(`⚠️ Could not locate project '${this.currentProject.name}' in catalog categories.`);
          }
        } else {
          addLog('⚠️ ProjectCatalogCapsule class is not loaded in window scope.');
        }

        const arrayIndex = indexValue - 1;
        if (arrayIndex >= this.currentProject.thumbnails.length) {
          this.currentProject.thumbnails.push(path);
        } else {
          this.currentProject.thumbnails[arrayIndex] = path;
        }

        if (this.browser && typeof this.browser.updateThumbnailDisplay === 'function') {
          this.browser.updateThumbnailDisplay(this.currentProject.name, path, indexValue);
        }

        const browserTabInstance = app?.nativeProjectBrowserInstance || window.parent?.vibesApp?.nativeProjectBrowserInstance;
        if (browserTabInstance && typeof browserTabInstance.init === 'function') {
          addLog('Refreshing active Project Browser tab UI...');
          await browserTabInstance.init();
        }

        if (this.addRadio.checked) {
          this.currentThumbnailIndex = this.currentProject.thumbnails.length;
        }

        this._showSuccessDialog(filename, logs);
        this.resumeFeed();
        this.updateUploadUI();

      } catch (error) {
        addLog(`❌ Critical error during save: ${error.message}`);
        this._showDiagnosticDialog('Save Action Failed', error.stack || error.message || String(error), logs);
        this.refreshSaveButtonState();
      }
    }

  updateUploadUI() {
      const numThumbs =
        this.currentProject && this.currentProject.thumbnails
          ? this.currentProject.thumbnails.length
          : 0;

      if (this.currentThumbnailIndex < numThumbs) {
        this.replaceRadio.checked = true;
        this.thumbIndexInput.value = this.currentThumbnailIndex + 1;
      } else {
        this.addRadio.checked = true;
      }

      this.handleRadioChange();
    }

  resumeFeed() {
      if (!this.isCapturing) return;
      this.isFrozen = false;
      this.lastSnapDataUrl = null;
      this.refreshSaveButtonState();
      if (this.resumeButton) this.resumeButton.style.display = 'none';

      this.updateStatus('Feed resumed. Adjust framing, then Snap.');
      this.previewLoop();
    }

  async _fetchProjects() {
      try {
        if (typeof ProjectCatalogCapsule === 'undefined') {
          await this.app._loadClassicScriptOnce('/vibes/src/tools/browser/ProjectCatalogCapsule.js');
        }
        const catalogData = ProjectCatalogCapsule.getCatalog();
        this.allProjects = [];

        for (const cat in catalogData) {
          if (Array.isArray(catalogData[cat])) {
            catalogData[cat].forEach((p) => {
              const name = p.directory || p.name;
              if (!name.endsWith('.js')) {
                this.allProjects.push(p);
                const opt = makeElement('option', { value: name }, p.name);
                this.projectSelect.appendChild(opt);
              }
            });
          }
        }
      } catch (e) {
        console.error('[ScreenCapTool] Failed to load catalog', e);
        this.updateStatus('Failed to load project catalog.', true);
      }
    }

  _onProjectSelected(projectName) {
      if (!projectName) {
        this.currentProject = null;
        this.refreshSaveButtonState();
        this.updateStatus('Ready. Select a target project to begin.');
        return;
      }

      const proj = this.allProjects.find((p) => p.name === projectName);
      if (proj) {
        const nextIndex =
          proj.thumbnails && proj.thumbnails.length > 0
            ? proj.thumbnails.length
            : 0;
        this.showForProject(proj, nextIndex);
      }
    }

  showDialog() {
      if (!this.controlDialog || !this.controlDialog.element.isConnected) {
        this.createControlDialog();
      } else {
        this.controlDialog.setZOnTop();
      }
      this.updateStatus('Ready. Select a target project to begin.');
    }


  static _doc() {
      return "### Screen Capture Tool\\n\\nCaptures selected screen coordinates and downsamples them into project browser thumbnails.\\nSave operations write directly to local disk (under \`/projectBrowserThumbnails/\`) via browser File System Access API.";
    }

  _findWebRootHandle() {
      const candidates = [
        this.app?.browserWebRootHandle,
        this.app?.browserWebRootHandles?.get('web'),
        this.app?.workspaceFileStores?.get('/web')?._handle,
        this.app?.workspaceFileStores?.get('web')?._handle,
        window.vibesApp?.browserWebRootHandle,
        window.projectApp?.browserWebRootHandle,
        window._dev_projectEditorInstance?.browserWebRootHandle,
        window.parent?.vibesApp?.browserWebRootHandle,
        window.parent?.projectApp?.browserWebRootHandle,
        window.parent?._dev_projectEditorInstance?.browserWebRootHandle,
        window.parent?.projectApp?.workspaceFileStores?.get('/web')?._handle,
      ];

      for (const h of candidates) {
        if (h && h.kind === 'directory') {
          return h;
        }
      }
      return null;
    }

  refreshSaveButtonState() {
      if (!this.uploadButton) return;
      const hasProject = !!this.currentProject;
      const hasSnap = !!this.lastSnapDataUrl;
      this.uploadButton.disabled = !(hasProject && hasSnap);
    }

  _showDiagnosticDialog(title, errorText, logs) {
      const content = makeElement('div', {
        style: {
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          lineHeight: '1.5',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '10px'
        }
      });

      const errorBox = makeElement('div', {
        style: {
          backgroundColor: 'rgba(239, 83, 80, 0.12)',
          border: '1px solid rgba(239, 83, 80, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          color: '#fca5a5'
        }
      });
      errorBox.innerHTML = `<strong>⚠️ ${title}</strong><br><pre style="white-space: pre-wrap; font-size: 11px; margin-top: 6px; font-family: monospace;">${errorText}</pre>`;
      content.appendChild(errorBox);

      if (logs && logs.length > 0) {
        const logPre = makeElement('pre', {
          style: {
            background: '#090d16',
            color: '#34d399',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            maxHeight: '150px',
            overflowY: 'auto',
            border: '1px solid #1e293b',
            margin: '0',
            textAlign: 'left'
          }
        }, logs.join('\n'));

        content.appendChild(makeElement('p', { style: { fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' } }, 'Execution Logs:'));
        content.appendChild(logPre);

        const copyBtn = makeElement('button', {
          className: 'start-server-btn-compact',
          textContent: '📋 Copy Diagnostics for LLM',
          style: { width: 'fit-content', padding: '6px 12px' },
          onclick: () => {
            const textToCopy = `[ScreenCapTool Diagnostics]\nTitle: ${title}\nError:\n${errorText}\n\nLogs:\n${logs.join('\n')}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
              copyBtn.textContent = '✓ Copied!';
              setTimeout(() => { copyBtn.textContent = '📋 Copy Diagnostics for LLM'; }, 1500);
            });
          }
        });
        content.appendChild(copyBtn);
      }

      UITools.makeDialog({
        title: '⚠️ Screen Capture Trouble',
        contentElement: content,
        width: '500px'
      });
    }

  _showSuccessDialog(filename, logs) {
      const content = makeElement('div', {
        style: {
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          lineHeight: '1.5',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '10px'
        }
      });

      const successBox = makeElement('div', {
        style: {
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          color: '#a7f3d0'
        }
      }, `✓ Successfully saved image as <strong>${filename}</strong> to local disk!`);
      content.appendChild(successBox);

      if (logs && logs.length > 0) {
        const logPre = makeElement('pre', {
          style: {
            background: '#090d16',
            color: '#cbd5e1',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            maxHeight: '150px',
            overflowY: 'auto',
            border: '1px solid #1e293b',
            margin: '0',
            textAlign: 'left'
          }
        }, logs.join('\n'));
        content.appendChild(logPre);
      }

      UITools.makeDialog({
        title: '📸 Thumbnail Saved',
        contentElement: content,
        width: '500px'
      });
    }

  _generateCapsuleCode(catalog) {
      const formatCategory = (catName) => {
        const list = catalog[catName] || [];
        return JSON.stringify(list, null, 2).split('\n').map(line => '      ' + line).join('\n').trim();
      };

      return `class ProjectCatalogCapsule {
  static starterTemplates() {
    return ${formatCategory("Starter Templates")};
  }

  static gamesAndInteractive() {
    return ${formatCategory("Games & Interactive")};
  }

  static toolsAndApps() {
    return ${formatCategory("Tools & Apps")};
  }

  static experiments() {
    return ${formatCategory("Experiments")};
  }

  static meta() {
    return ${formatCategory("meta")};
  }

  static sharedLibraryFiles() {
    return ${formatCategory("Shared Library Files")};
  }

  static _data_catalog() {
    return {
      "Starter Templates": this.starterTemplates(),
      "Games & Interactive": this.gamesAndInteractive(),
      "Tools & Apps": this.toolsAndApps(),
      "Experiments": this.experiments(),
      "meta": this.meta(),
      "Shared Library Files": this.sharedLibraryFiles()
    };
  }

  static getCatalog() {
    return this._data_catalog();
  }

  static getCategories() {
    return Object.keys(this._data_catalog());
  }

  static getProjectsInCategory(categoryName) {
    const catalog = this._data_catalog();
    const projects = catalog[String(categoryName || "")];
    return Array.from(projects).slice();
  }

  static findProject(projectName) {
    const wanted = String(projectName || "").trim().toLowerCase();
    if (!wanted) return null;

    const catalog = this._data_catalog();
    for (const categoryName of Object.keys(catalog)) {
      const projects = Array.isArray(catalog[categoryName]) ? catalog[categoryName] : [];
      for (const project of projects) {
        const dir = project.directory || project.name;
        if (String(dir).toLowerCase() === wanted || String(project.name).toLowerCase() === wanted) {
          return {
            categoryName,
            project: { ...project }
          };
        }
      }
    }

    return null;
  }

  static listProjectNames() {
    const names = [];
    const catalog = this._data_catalog();

    for (const categoryName of Object.keys(catalog)) {
      const projects = Array.isArray(catalog[categoryName]) ? catalog[categoryName] : [];
      for (const project of projects) {
        if (project?.name) names.push(project.name);
      }
    }

    return names;
  }
}`;
    }
}

