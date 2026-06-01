
class ScratchyFileList {
  constructor(app) {
    this._app = app;
    this._currentSort = 'name';
    this._currentAudio = null;
  }

  getAssetLabel(filename) {
    const app = this._app;
    if (filename === 'project.json') return 'project.json';
    if (!app.projectData) return filename;
    const baseName = filename.replace(/\.\w+$/, '');
    for (const target of app.projectData.targets) {
      for (const costume of target.costumes || []) {
        if (costume.assetId === baseName)
          return `${target.name} / ${costume.name}`;
      }
      for (const sound of target.sounds || []) {
        if (sound.assetId === baseName) return `${target.name} / ${sound.name}`;
      }
    }
    return filename;
  }

  buildFileList() {
    const app = this._app;
    app.contentArea.innerHTML = '';
    app.editorManager.clearInlineEditors();
    if (!app.fileBlobs || Object.keys(app.fileBlobs).length === 0) {
      app.contentArea.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;color:#999;font-family:\'Architects Daughter\',cursive;">' +
        '<div style="font-size:48px;margin-bottom:10px;">📂</div>' +
        '<div style="font-size:24px;">No files loaded</div>' +
        '<div style="font-size:16px;margin-top:8px;">Click <b>"Open File"</b> above to start!</div>' +
        '</div>';
      return;
    }
    const sortBar = makeElement('div', { className: 'scratchy-sort-bar' });
    const sortSelect = makeElement(
      'select',
      {
        className: 'scratchy-sort-select',
        onchange: (e) => {
          this._currentSort = e.target.value;
          this.buildFileList();
        },
      },
      [
        makeElement('option', { value: 'name' }, 'Sort by Name'),
        makeElement('option', { value: 'size' }, 'Sort by Size'),
        makeElement('option', { value: 'type' }, 'Sort by Type'),
      ]
    );
    sortSelect.value = this._currentSort;
    const sortControls = makeElement('div', {
      style: 'display:flex;align-items:center;gap:8px;',
    });
    sortControls.appendChild(
      makeElement(
        'span',
        { style: 'font-size:14px;color:#777;white-space:nowrap;' },
        'Sort: '
      )
    );
    sortControls.appendChild(sortSelect);
    sortBar.appendChild(sortControls);

    const projectTitleRow = makeElement('div', {
      style:
        'display:flex;align-items:center;gap:8px;flex:1;justify-content:center;min-width:0;',
    });

    const cleanName = app.loadedFileName
      ? app.loadedFileName.replace(/\.sb3$/i, '')
      : 'Untitled';

    const projectTitle = makeElement('div', {
      className: 'scratchy-project-title-editable',
      contentEditable: 'true',
      spellcheck: false,
      textContent: cleanName,
      onblur: () => {
        const newName = projectTitle.textContent.trim() || 'Untitled';
        projectTitle.textContent = newName;
        app.loadedFileName = newName.endsWith('.sb3')
          ? newName
          : newName + '.sb3';
        if (app.templateSelector) {
          app.templateSelector.syncName(newName);
        }
      },
      onkeydown: (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          projectTitle.blur();
        }
      },
    });

    this._projectTitleEl = projectTitle;
    projectTitleRow.appendChild(projectTitle);

    if (app.templateSelector) {
      const widget = app.templateSelector.render();
      projectTitleRow.appendChild(widget);
    }

    sortBar.appendChild(projectTitleRow);

    const spacer = makeElement('div', { style: 'width:60px;flex-shrink:0;' });
    sortBar.appendChild(spacer);
    app.contentArea.appendChild(sortBar);
    const groups = { json: [], images: [], vectors: [], sounds: [], other: [] };
    const filenames = Object.keys(app.fileBlobs);
    filenames.sort((a, b) => {
      const entryA = app.fileBlobs[a];
      const entryB = app.fileBlobs[b];
      if (this._currentSort === 'size') {
        return entryB.data.size - entryA.data.size;
      } else if (this._currentSort === 'type') {
        return a.split('.').pop().localeCompare(b.split('.').pop());
      }
      return a.localeCompare(b);
    });
    for (const fn of filenames) {
      if (fn === 'project.json') {
        groups.json.push(fn);
        continue;
      }
      const ext = fn.split('.').pop().toLowerCase();
      if (['png', 'jpg', 'jpeg', 'bmp', 'webp'].includes(ext))
        groups.images.push(fn);
      else if (['svg'].includes(ext)) groups.vectors.push(fn);
      else if (['wav', 'mp3', 'ogg'].includes(ext)) groups.sounds.push(fn);
      else groups.other.push(fn);
    }
    if (groups.json.length > 0)
      this._renderSection('Project Data', groups.json, 'json');
    if (groups.images.length > 0)
      this._renderSection('Images', groups.images, 'grid');
    if (groups.vectors.length > 0)
      this._renderSection('Vectors (SVG)', groups.vectors, 'grid');
    if (groups.sounds.length > 0)
      this._renderSection('Sounds', groups.sounds, 'grid');
    if (groups.other.length > 0)
      this._renderSection('Other Files', groups.other, 'grid');
  }

  _renderSection(title, filenames, layoutType) {
    const app = this._app;
    const section = makeElement('div', { className: 'scratchy-section' });
    const header = makeElement(
      'div',
      { className: 'scratchy-section-header' },
      [
        title,
        makeElement(
          'span',
          { className: 'scratchy-section-count' },
          `(${filenames.length})`
        ),
      ]
    );
    section.appendChild(header);
    if (layoutType === 'json') {
      filenames.forEach((fn) => {
        section.appendChild(this._renderProjectJsonCard(fn, app.fileBlobs[fn]));
      });
    } else {
      const grid = makeElement('div', { className: 'scratchy-asset-grid' });
      filenames.forEach((fn) => {
        grid.appendChild(this._renderAssetCard(fn, app.fileBlobs[fn]));
      });
      section.appendChild(grid);
    }
    app.contentArea.appendChild(section);
  }

  _renderProjectJsonCard(filename, entry) {
      const app = this._app;
      const isOpen = !!app.editorManager.getOpenDialogs()['project.json'];
      const sizeKB = (new Blob([JSON.stringify(entry.data)]).size / 1024).toFixed(
        1
      );
      let targets = 0;
      let targetNames = [];
      if (entry.data && entry.data.targets) {
        targets = entry.data.targets.length;
        targetNames = entry.data.targets.map((t) => t.name);
      }
      const blockCount =
        entry.data && entry.data.targets
          ? entry.data.targets.reduce(
              (sum, t) => sum + Object.keys(t.blocks || {}).length,
              0
            )
          : 0;
      const card = makeElement('div', {
        className: 'scratchy-json-banner',
        id: `scratchy-block-${CSS.escape(filename)}`,
      });
      const leftCol = makeElement(
        'div',
        {
          className: 'scratchy-json-col scratchy-json-col-left',
          style: {
            width: '150px',
            minWidth: '140px',
            flexShrink: '0',
          },
        },
        [
          makeElement(
            'div',
            { className: 'scratchy-json-stat-label' },
            'project.json'
          ),
          makeElement(
            'div',
            { className: 'scratchy-json-stat' },
            `Size: ${sizeKB} KB`
          ),
          makeElement(
            'div',
            { className: 'scratchy-json-stat' },
            `Targets: ${targets}`
          ),
          makeElement(
            'div',
            { className: 'scratchy-json-stat' },
            `Blocks: ${blockCount}`
          ),
          makeElement(
            'div',
            { className: 'scratchy-json-stat', style: { marginTop: '6px' } },
            'Sprites:'
          ),
          ...targetNames.map((n) =>
            makeElement('div', {
              className: 'scratchy-json-stat',
              style: { fontSize: '11px', color: '#7a7260', paddingLeft: '4px' },
              textContent: n,
            })
          ),
        ]
      );
      const editorHost = makeElement('div', {
        className: 'scratchy-json-editor-host',
      });
      const rightCol = makeElement(
        'div',
        { className: 'scratchy-json-col scratchy-json-col-right' },
        []
      );
      if (isOpen) {
        rightCol.appendChild(
          makeElement('div', {
            style:
              'padding: 10px; color: #888; font-style: italic; font-size: 13px;',
            textContent: 'Editor opened in window',
          })
        );
      } else {
        rightCol.appendChild(
          makeElement('button', {
            className: 'scratchy-json-strip-btn',
            onclick: () => app.editorManager.openOrFocusWindow(filename),
            textContent: '↗ Open Editor',
          })
        );
        rightCol.appendChild(
          makeElement('button', {
            className: 'scratchy-json-strip-btn',
            onclick: () => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(entry.data)], {
                  type: 'application/json',
                })
              );
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            },
            textContent: '💾 Download',
          })
        );
      }
      card.appendChild(leftCol);
      card.appendChild(editorHost);
      card.appendChild(rightCol);
      requestAnimationFrame(() => {
        const text = JSON.stringify(entry.data, null, 2);
        const widget = new CodeMirrorWidget({
          host: editorHost,
          content: text,
          mode: 'json',
          readOnly: false,
          onChange: (newText) => {
            try {
              const parsed = JSON.parse(newText);
              app.projectData = parsed;
              app.fileBlobs[filename].data = parsed;
              app.fileBlobs[filename].raw = newText;
            } catch (e) {}
          }
        });
        app.editorManager.registerInlineEditor(filename, widget, editorHost);
      });
      return card;
    }

  _renderAssetCard(filename, entry) {
    const app = this._app;
    const card = makeElement('div', {
      className: 'scratchy-asset-card',
      id: `scratchy-block-${CSS.escape(filename)}`,
      title: filename,
    });
    const thumbBox = makeElement('div', { className: 'scratchy-card-thumb' });
    const metaSpan = makeElement('span', {}, '');
    if (entry.type === 'image') {
      const url = URL.createObjectURL(entry.data);
      const img = makeElement('img', { src: url });
      img.onload = () => {
        metaSpan.textContent = `${img.naturalWidth} x ${img.naturalHeight}`;
      };
      thumbBox.appendChild(img);
    } else if (entry.type === 'audio') {
      thumbBox.appendChild(
        makeElement('div', { className: 'scratchy-card-type-icon' }, '🔊')
      );
    } else {
      thumbBox.appendChild(
        makeElement('div', { className: 'scratchy-card-type-icon' }, '📦')
      );
    }
    const sizeKB = (entry.data.size / 1024).toFixed(1) + ' KB';
    const label = this.getAssetLabel(filename);
    const infoBox = makeElement('div', { className: 'scratchy-card-details' }, [
      makeElement('div', {
        className: 'scratchy-card-name',
        title: filename + (label !== filename ? '\n' + label : ''),
        textContent: label,
      }),
      makeElement('div', { className: 'scratchy-card-meta' }, [
        metaSpan,
        makeElement('span', {}, sizeKB),
      ]),
    ]);
    const overlay = makeElement('div', { className: 'scratchy-card-overlay' });

    // --- BUTTONS ---

    // 1. Download
    overlay.appendChild(
      makeElement('button', {
        className: 'scratchy-overlay-btn',
        onclick: (e) => {
          e.stopPropagation();
          const url = URL.createObjectURL(entry.data);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        textContent: '💾 Save',
      })
    );

    // 2. Replace (New)
    overlay.appendChild(
      makeElement('button', {
        className: 'scratchy-overlay-btn',
        style: { background: '#fff3cd', color: '#856404' },
        onclick: (e) => {
          e.stopPropagation();
          app.dropHandler.handleReplaceAsset(filename);
        },
        textContent: '🔄 Replace',
      })
    );

    // 3. Edit (SVG Only)
    if (filename.toLowerCase().endsWith('.svg')) {
      overlay.appendChild(
        makeElement('button', {
          className: 'scratchy-overlay-btn',
          style: { background: '#d8b4fe', color: '#3b1e5f' },
          onclick: (e) => {
            e.stopPropagation();
            this._openSvgHelper(filename, entry);
          },
          textContent: '✏️ Edit',
        })
      );
    }

    // 4. Delete
    overlay.appendChild(
      makeElement('button', {
        className: 'scratchy-overlay-btn',
        style: { background: '#ffe0e0', color: '#c62828' },
        onclick: (e) => {
          e.stopPropagation();
          this._confirmDeleteAsset(filename);
        },
        textContent: '🗑 Delete',
      })
    );

    // 5. Play (Audio Only)
    if (entry.type === 'audio') {
      overlay.appendChild(
        makeElement('button', {
          className: 'scratchy-overlay-btn',
          onclick: (e) => {
            e.stopPropagation();
            if (this._currentAudio) {
              this._currentAudio.pause();
              this._currentAudio = null;
            }
            const audio = new Audio(URL.createObjectURL(entry.data));
            audio.play();
            this._currentAudio = audio;
          },
          textContent: '▶ Play',
        })
      );
    }
    thumbBox.appendChild(overlay);
    card.appendChild(thumbBox);
    card.appendChild(infoBox);
    return card;
  }

  _confirmDeleteAsset(filename) {
      const app = this._app;
      const label = this.getAssetLabel(filename);
      const msgEl = makeElement(
        'div',
        {
          style: {
            padding: '20px',
            fontFamily: "'Architects Daughter', cursive",
            fontSize: '16px',
            color: '#d4d4d4',
            textAlign: 'center',
          },
        },
        [
          makeElement('div', {
            style: { fontSize: '36px', marginBottom: '12px' },
            textContent: '🗑️',
          }),
          makeElement('div', {
            style: { marginBottom: '8px', fontWeight: '700', fontSize: '18px' },
            textContent: 'Delete this asset?',
          }),
          makeElement('div', {
            style: { color: '#aaa', fontSize: '14px', wordBreak: 'break-all' },
            textContent: '"' + label + '" (' + filename + ')',
          }),
          makeElement('div', {
            style: { color: '#f88', marginTop: '12px', fontSize: '13px' },
            textContent: 'This cannot be undone.',
          }),
        ]
      );
      UITools.makeDialog({
        env: app.env,
        title: 'Confirm Delete',
        size: [380, 260],
        contentElement: msgEl,
        noPadding: false,
        buttons: [
          {
            label: '🗑 Delete',
            className: 'primary',
            onClick: () => {
              delete app.fileBlobs[filename];
              this.buildFileList();
              app.statusDiv.textContent = 'Deleted "' + label + '".';
              return true;
            },
          },
          { label: 'Cancel' },
        ],
      });
    }

  _openSvgHelper(filename, entry) {
    const app = this._app;
    const reader = new FileReader();
    reader.onload = () => {
      const svgText = reader.result;
      this._launchSvgBridge(filename, svgText);
    };
    reader.readAsText(entry.data);
  }

  _launchSvgBridge(filename, initialSvgText) {
      const app = this._app;
      let currentSvgText = initialSvgText;
      let popupWin = null;

      const wrapper = makeElement('div', {
        style: {
          width: '100%',
          height: '100%',
          background: '#1e1e2e',
          display: 'flex',
          flexDirection: 'column',
        },
      });

      const iframe = makeElement('iframe', {
        src: '/Scratchy/svgHelper.html',
        style: { flex: '1', border: 'none', width: '100%' },
      });

      wrapper.appendChild(iframe);

      const dlgW = Math.min(Math.round(window.innerWidth * 0.95), 1300);
      const dlgH = Math.min(Math.round(window.innerHeight * 0.9), 850);

      let svgDialog = null;

      const messageHandler = (e) => {
        if (!e.data || typeof e.data.type !== 'string') return;

        if (e.data.type === 'SVG_HELPER_READY') {
          if (e.source === iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              { type: 'SVG_HELPER_LOAD', svg: currentSvgText, filename },
              '*'
            );
          } else if (popupWin && e.source === popupWin) {
            popupWin.postMessage(
              { type: 'SVG_HELPER_LOAD', svg: currentSvgText, filename },
              '*'
            );
          }
        }

        if (e.data.type === 'SVG_HELPER_EXPORT') {
          if (
            e.source === iframe.contentWindow ||
            (popupWin && e.source === popupWin)
          ) {
            const newSvg = e.data.svg;
            if (typeof newSvg === 'string') {
              const blob = new Blob([newSvg], { type: 'image/svg+xml' });

              app.fileBlobs[filename] = { type: 'image', data: blob };
              currentSvgText = newSvg;

              this._updateCostumeMetaData(filename, newSvg);

              app.statusDiv.textContent = 'SVG "' + filename + '" updated from editor.';
              this.buildFileList();
            }
          }
        }
      };

      window.addEventListener('message', messageHandler);

      const titleBarLink = makeElement(
        'button',
        {
          className: 'dialog-util-btn',
          title: 'Pop Out to New Window',
          style: {
            fontSize: '12px',
            color: '#aaa',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
          },
          onclick: (e) => {
            e.stopPropagation();
            popupWin = window.open(
              '/Scratchy/svgHelper.html',
              '_blank',
              'width=1100,height=750'
            );
            if (!popupWin) {
              alert('Pop-up blocked. Please allow popups.');
            }
          },
        },
        '↗'
      );

      svgDialog = UITools.makeDialog({
        env: app.env,
        title: 'SVG Editor - ' + filename,
        size: [dlgW, dlgH],
        contentElement: wrapper,
        noPadding: true,
        buttons: [
          {
            label: 'Close',
            onClick: (btn, dlgInstance) => {
              window.removeEventListener('message', messageHandler);
              dlgInstance.close();
              return true;
            },
          },
        ],
        onClose: () => {
          window.removeEventListener('message', messageHandler);
        },
      });

      const controls = svgDialog.header.querySelector('.uw-controls');
      if (controls) {
        controls.insertBefore(titleBarLink, controls.firstChild);
      }
    }

  _updateCostumeMetaData(filename, svgContent) {
    const app = this._app;
    if (!app.projectData) return;

    // 1. Parse SVG to find its center
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return;

    let centerX = 0;
    let centerY = 0;

    const vb = svg.getAttribute('viewBox');
    if (vb) {
      const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number);
      // Scratch rotation center is relative to the top-left of the SVG coordinate space?
      // Actually, Scratch rotation centers are coordinates in the SVG space.
      // Ideally, we want the visual center.
      centerX = vx + vw / 2;
      centerY = vy + vh / 2;
    } else {
      const w = parseFloat(svg.getAttribute('width')) || 0;
      const h = parseFloat(svg.getAttribute('height')) || 0;
      centerX = w / 2;
      centerY = h / 2;
    }

    // 2. Find matching costumes in project.json
    const assetId = filename.replace(/\.[^/.]+$/, ''); // remove extension
    let updatedCount = 0;

    for (const target of app.projectData.targets) {
      if (target.costumes) {
        for (const costume of target.costumes) {
          if (costume.assetId === assetId) {
            // Found it! Update rotation center to keep it centered.
            costume.rotationCenterX = centerX;
            costume.rotationCenterY = centerY;
            updatedCount++;
          }
        }
      }
    }

    if (updatedCount > 0) {
      // 3. Save updated JSON back to blob
      app.fileBlobs['project.json'].data = app.projectData;
      app.fileBlobs['project.json'].raw = JSON.stringify(
        app.projectData,
        null,
        2
      );

      // Refresh the JSON editor if open
      app.editorManager.refreshInlineEditor('project.json');

      console.log(
        `Updated rotation center for ${filename} to (${centerX}, ${centerY}) in ${updatedCount} costume(s).`
      );
    }
  }

  
}

