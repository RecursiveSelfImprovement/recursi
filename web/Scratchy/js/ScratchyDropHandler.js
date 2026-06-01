
class ScratchyDropHandler {
  constructor(app) {
    this._app = app;
  }

  createDropZone() {
    const app = this._app;
    app.dropZone = makeElement(
      'div',
      {
        className: 'scratchy-dropzone',
        onclick: () => app.fileInput.click(),
      },
      [
        makeElement(
          'div',
          { className: 'scratchy-dropzone-inner' },
          'Drop .sb3 file here'
        ),
        makeElement(
          'div',
          { className: 'scratchy-dropzone-sub' },
          'or use the "Open" button above'
        ),
      ]
    );
    return app.dropZone;
  }

  createFileInput() {
    const app = this._app;
    app.fileInput = makeElement('input', {
      type: 'file',
      accept: '.sb3',
      style: { display: 'none' },
      onchange: (e) => {
        if (e.target.files[0]) this.loadSb3File(e.target.files[0]);
      },
    });
    return app.fileInput;
  }

  setupDropHandlers() {
    const app = this._app;
    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    app.dropZone.addEventListener('dragover', (e) => {
      prevent(e);
      app.dropZone.classList.add('drag-over');
    });
    app.dropZone.addEventListener('dragleave', (e) => {
      prevent(e);
      app.dropZone.classList.remove('drag-over');
    });
    app.dropZone.addEventListener('drop', (e) => {
      prevent(e);
      app.dropZone.classList.remove('drag-over');
      this.handleSb3Drop(e);
    });

    document.body.addEventListener('dragover', prevent);
    document.body.addEventListener('drop', (e) => {
      prevent(e);
      this.handleSb3Drop(e);
    });
  }

  async handleSb3Drop(e) {
    const app = this._app;
    const files = Array.from(
      e.dataTransfer ? e.dataTransfer.files : e.target.files
    );
    if (files.length === 0) return;

    const sb3File = files.find((f) => f.name.endsWith('.sb3'));
    if (sb3File && (files.length === 1 || !app.projectData)) {
      this.loadSb3File(sb3File);
      return;
    }

    if (!app.projectData) {
      app.statusDiv.textContent = 'Please load an .sb3 file first.';
      return;
    }

    let addedCount = 0;
    for (const file of files) {
      if (file.name.endsWith('.sb3')) continue;

      try {
        const buffer = await file.arrayBuffer();
        let type = 'binary';
        let mimeType = 'application/octet-stream';

        if (
          file.type.startsWith('image/') ||
          /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(file.name)
        ) {
          type = 'image';
          mimeType = file.type || 'image/png';
        } else if (file.type.includes('svg') || /\.svg$/i.test(file.name)) {
          type = 'image';
          mimeType = 'image/svg+xml';
        } else if (
          file.type.startsWith('audio/') ||
          /\.(wav|mp3|ogg)$/i.test(file.name)
        ) {
          type = 'audio';
          mimeType = file.type || 'audio/wav';
        } else if (file.name === 'project.json') {
          type = 'json';
        }

        if (type === 'json') {
          const text = new TextDecoder().decode(buffer);
          try {
            app.projectData = JSON.parse(text);
            app.fileBlobs['project.json'] = {
              type: 'json',
              data: app.projectData,
              raw: text,
            };
            app.editorManager.refreshInlineEditor('project.json');
            addedCount++;
            continue;
          } catch (err) {
            console.error('Invalid JSON dropped', err);
          }
        }

        const blob = new Blob([buffer], { type: mimeType });

        // 1. Add file to memory
        app.fileBlobs[file.name] = { type, data: blob };

        // 2. AUTO-REGISTER in project.json
        if (type === 'image') {
          // Pass buffer explicitly for text decoding
          this._createSpriteFromImage(file.name, blob, buffer);
        } else if (type === 'audio') {
          this._addSoundToStage(file.name, blob);
        }

        addedCount++;
      } catch (err) {
        console.error('Error reading file:', file.name, err);
      }
    }

    if (addedCount > 0) {
      app.fileBlobs['project.json'].data = app.projectData;
      app.fileBlobs['project.json'].raw = JSON.stringify(
        app.projectData,
        null,
        2
      );
      app.editorManager.refreshInlineEditor('project.json');

      app.statusDiv.textContent = `Added ${addedCount} asset(s).`;
      app.fileList.buildFileList();
    }
  }

  async loadSb3File(file) {
    const app = this._app;
    if (!file || !file.name.endsWith('.sb3')) {
      app.statusDiv.textContent = 'Please select an .sb3 file.';
      return;
    }

    app.statusDiv.textContent = `Loading ${file.name}...`;
    if (!app.loadedFileName || app.loadedFileName === file.name) {
      app.loadedFileName = file.name;
    }

    const isUserFile =
      !app.templateSelector ||
      !app.templateSelector.getSelectedTemplate() ||
      app.templateSelector.getSelectedTemplate().file !== file.name;

    if (isUserFile && app.templateSelector && file.name !== 'empty.sb3') {
      const cleanName = (app.loadedFileName || file.name).replace(
        /\.sb3$/i,
        ''
      );
      app.templateSelector.setCustomProject(cleanName);
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      app.zipEntries = zip;
      app.fileBlobs = {};

      const projectJsonStr = await zip.file('project.json').async('string');
      app.projectData = JSON.parse(projectJsonStr);

      for (const [filename, entry] of Object.entries(zip.files)) {
        if (!entry.dir) {
          if (filename === 'project.json') {
            app.fileBlobs[filename] = {
              type: 'json',
              data: app.projectData,
              raw: projectJsonStr,
            };
          } else if (filename.endsWith('.png') || filename.endsWith('.svg')) {
            const blob = await entry.async('blob');
            const mimeType = filename.endsWith('.png')
              ? 'image/png'
              : 'image/svg+xml';
            app.fileBlobs[filename] = {
              type: 'image',
              data: new Blob([blob], { type: mimeType }),
            };
          } else if (filename.endsWith('.wav')) {
            const blob = await entry.async('blob');
            app.fileBlobs[filename] = {
              type: 'audio',
              data: new Blob([blob], { type: 'audio/wav' }),
            };
          } else {
            const blob = await entry.async('blob');
            app.fileBlobs[filename] = { type: 'binary', data: blob };
          }
        }
      }

      app.dropZone.style.display = 'none';
      app.statusDiv.textContent = `Loaded ${file.name} — ${
        Object.keys(app.fileBlobs).length
      } files`;
      app.fileList.buildFileList();
    } catch (err) {
      app.statusDiv.textContent = `Error: ${err.message}`;
      console.error(err);
    }
  }

  handleReplaceAsset(targetFilename) {
    const app = this._app;
    const input = makeElement('input', {
      type: 'file',
      style: { display: 'none' },
      onchange: (e) => {
        if (e.target.files.length > 0) {
          const newFile = e.target.files[0];
          // We swap the blob but keep the old filename (MD5) to preserve project links
          this._performReplacement(targetFilename, newFile);
        }
      },
    });
    input.click();
  }

  async _performReplacement(targetFilename, newFile) {
    const app = this._app;
    try {
      const buffer = await newFile.arrayBuffer();
      let type = 'binary';

      // Detect type
      if (
        newFile.type.startsWith('image/') ||
        /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(newFile.name)
      ) {
        type = 'image';
      } else if (newFile.type.includes('svg') || /\.svg$/i.test(newFile.name)) {
        type = 'image';
      } else if (
        newFile.type.startsWith('audio/') ||
        /\.(wav|mp3|ogg)$/i.test(newFile.name)
      ) {
        type = 'audio';
      }

      const oldExt = targetFilename.split('.').pop().toLowerCase();
      const newExt = newFile.name.split('.').pop().toLowerCase();

      if (oldExt !== newExt) {
        const proceed = confirm(
          `Extension mismatch! Replacing .${oldExt} with .${newExt}.\n\nScratch might not like this. Continue?`
        );
        if (!proceed) return;
      }

      const blob = new Blob([buffer], {
        type: newFile.type || 'application/octet-stream',
      });

      // Swap Data
      app.fileBlobs[targetFilename] = { type, data: blob };

      // FIX: If it's an SVG, update rotation centers automatically
      if (type === 'image' && newExt === 'svg') {
        const text = new TextDecoder().decode(buffer);
        app.fileList._updateCostumeMetaData(targetFilename, text);
      }

      app.statusDiv.textContent = `Replaced content of ${targetFilename}`;
      app.fileList.buildFileList();
    } catch (err) {
      console.error('Replacement failed:', err);
      app.statusDiv.textContent = 'Replacement failed: ' + err.message;
    }
  }

  _createSpriteFromImage(filename, blob, buffer) {
    const app = this._app;
    const name = filename.replace(/\.[^/.]+$/, ''); // strip extension
    const ext = filename.split('.').pop();
    const isSvg = ext.toLowerCase() === 'svg';

    let cx = 0,
      cy = 0;
    if (isSvg && buffer) {
      try {
        const text = new TextDecoder().decode(buffer);
        const vbMatch = text.match(
          /viewBox=["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/
        );
        if (vbMatch) {
          const x = parseFloat(vbMatch[1]);
          const y = parseFloat(vbMatch[2]);
          const w = parseFloat(vbMatch[3]);
          const h = parseFloat(vbMatch[4]);
          cx = x + w / 2;
          cy = y + h / 2;
        }
      } catch (e) {
        console.warn('Failed to parse SVG center from dropped file', e);
      }
    }

    let maxLayer = 0;
    app.projectData.targets.forEach((t) => {
      if (t.layerOrder > maxLayer) maxLayer = t.layerOrder;
    });

    const newSprite = {
      isStage: false,
      name: this._getUniqueName(name),
      variables: {},
      lists: {},
      broadcasts: {},
      blocks: {},
      comments: {},
      currentCostume: 0,
      costumes: [
        {
          name: name,
          bitmapResolution: 1,
          dataFormat: ext,
          assetId: name,
          md5ext: filename,
          rotationCenterX: cx,
          rotationCenterY: cy,
        },
      ],
      sounds: [],
      volume: 100,
      layerOrder: maxLayer + 1,
      visible: true,
      x: 0,
      y: 0,
      size: 100,
      direction: 90,
      draggable: false,
      rotationStyle: 'all around',
    };

    app.projectData.targets.push(newSprite);
  }

  _addSoundToStage(filename, blob) {
    const app = this._app;
    const name = filename.replace(/\.[^/.]+$/, '');
    const ext = filename.split('.').pop();

    // Find Stage
    const stage = app.projectData.targets.find((t) => t.isStage);
    if (!stage) return;

    if (!stage.sounds) stage.sounds = [];

    const newSound = {
      name: this._getUniqueName(name, true),
      assetId: name,
      dataFormat: ext,
      md5ext: filename,
      rate: 44100, // Guess
      sampleCount: 0, // Unknown without parsing
    };

    stage.sounds.push(newSound);
  }

  _getUniqueName(baseName, isSound = false) {
    const app = this._app;
    let name = baseName;
    let counter = 2;

    const exists = (n) => {
      if (isSound) {
        const stage = app.projectData.targets.find((t) => t.isStage);
        return stage && stage.sounds.some((s) => s.name === n);
      } else {
        return app.projectData.targets.some((t) => t.name === n);
      }
    };

    while (exists(name)) {
      name = `${baseName}${counter}`;
      counter++;
    }
    return name;
  }
}

