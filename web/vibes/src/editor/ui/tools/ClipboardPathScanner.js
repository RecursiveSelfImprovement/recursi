class ClipboardPathScanner {
  async execute(app) {
      try {
        app.uiManager?.setStatus("Reading clipboard...", false);
        const text = await navigator.clipboard.readText();
        if (!text || !text.trim()) {
          app.uiManager?.setStatus("Clipboard is empty.", true);
          return;
        }

        // 1. Normalize clipboard text (Windows backslashes to forward slashes)
        const normalizedText = text.replace(/\\/g, '/');
        const lowerText = normalizedText.toLowerCase();

        // Query the VFS directly
        const availablePaths = new Set();
        if (app.vfs && typeof app.vfs.listFiles === 'function') {
          try {
            const vfsPaths = await app.vfs.listFiles({ includeStatic: false });
            vfsPaths.forEach(p => availablePaths.add(p));
          } catch (e) {
            console.warn('[ClipboardPathScanner] VFS scan failed', e);
          }
        }

        // Fallback: If VFS is empty, grab files from EVERY registered tree without filtering
        if (availablePaths.size === 0 && app.projectFilesManager?.fileTreeViews) {
          for (const tree of app.projectFilesManager.fileTreeViews) {
            if (!tree || !tree.nodesMap) continue;
            for (const path of tree.nodesMap.keys()) {
              availablePaths.add(path);
            }
          }
        }

        const foundPaths = new Set();
        
        for (const path of availablePaths) {
          const lowerPath = path.toLowerCase();
          
          // Check 1: Exact Golden Path match
          if (lowerText.includes(lowerPath)) {
            foundPaths.add(path);
            continue;
          }
          
          // Check 2: Suffix/Relative path match
          const parts = path.split('/').filter(Boolean);
          let matched = false;
          
          for (let i = 1; i < parts.length - 1; i++) {
            const suffix1 = '/' + parts.slice(i).join('/');
            const suffix2 = parts.slice(i).join('/');
            
            if (lowerText.includes(suffix1.toLowerCase()) || lowerText.includes(suffix2.toLowerCase())) {
              foundPaths.add(path);
              matched = true;
              break;
            }
          }
          
          if (matched) continue;
          
          // Check 3: Filename match (basename)
          const basename = parts[parts.length - 1];
          if (basename && basename.includes('.')) {
            const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?:^|\\s|['"\\\`/,])(${escaped})(?:\\s|['"\\\`.,;:]|$)`, 'i');
            if (regex.test(normalizedText)) {
              foundPaths.add(path);
            }
          }
        }

        if (foundPaths.size === 0) {
          app.uiManager?.setStatus("No matching file paths found in clipboard.", true);
          return;
        }

        this._showConfirmationDialog(app, Array.from(foundPaths).sort());

      } catch (e) {
        app.uiManager?.setStatus(`Clipboard Scanner Error: ${e.message}`, true);
        console.error(e);
      }
    }

  _showConfirmationDialog(app, paths) {
      const content = document.createElement('div');
      content.style.cssText = 'display: flex; flex-direction: column; gap: 12px; max-height: 500px; overflow-y: auto; padding: 6px; font-family: system-ui, sans-serif; color: #dce6ff;';

      // Section 1: Extraction Actions Setup
      const actionsGroup = document.createElement('div');
      actionsGroup.style.cssText = 'display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);';
      
      const titleActions = document.createElement('div');
      titleActions.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #8ab4f8; font-weight: bold; margin-bottom: 4px;';
      titleActions.textContent = 'Extraction Actions';
      actionsGroup.appendChild(titleActions);

      const cbExtract = document.createElement('input');
      cbExtract.type = 'checkbox';
      cbExtract.checked = true;
      const labelExtract = document.createElement('label');
      labelExtract.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px;';
      labelExtract.appendChild(cbExtract);
      labelExtract.appendChild(document.createTextNode('📖 Concatenate content into the Output Tab'));
      actionsGroup.appendChild(labelExtract);

      const cbApplyVis = document.createElement('input');
      cbApplyVis.type = 'checkbox';
      cbApplyVis.checked = true;
      const labelApplyVis = document.createElement('label');
      labelApplyVis.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px;';
      labelApplyVis.appendChild(cbApplyVis);
      labelApplyVis.appendChild(document.createTextNode('👁️ Set visibility on active file trees'));
      actionsGroup.appendChild(labelApplyVis);

      // Section 2: Default Visibility Parameters
      const visStateGroup = document.createElement('div');
      visStateGroup.style.cssText = 'display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);';

      const titleVis = document.createElement('div');
      titleVis.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #d98e48; font-weight: bold; margin-bottom: 4px;';
      titleVis.textContent = 'Default Visibility Target Levels';
      visStateGroup.appendChild(titleVis);

      const visCode = document.createElement('input');
      visCode.type = 'checkbox';
      visCode.checked = true;
      const labelVisCode = document.createElement('label');
      labelVisCode.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px;';
      labelVisCode.appendChild(visCode);
      labelVisCode.appendChild(document.createTextNode('💻 Include Code (Level 4 - Full Content)'));
      visStateGroup.appendChild(labelVisCode);

      const visSig = document.createElement('input');
      visSig.type = 'checkbox';
      visSig.checked = true;
      const labelVisSig = document.createElement('label');
      labelVisSig.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px;';
      labelVisSig.appendChild(visSig);
      labelVisSig.appendChild(document.createTextNode('⚡ Include Signatures (API surface)'));
      visStateGroup.appendChild(labelVisSig);

      const visDocs = document.createElement('input');
      visDocs.type = 'checkbox';
      visDocs.checked = false;
      const labelVisDocs = document.createElement('label');
      labelVisDocs.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px;';
      labelVisDocs.appendChild(visDocs);
      labelVisDocs.appendChild(document.createTextNode('📖 Include Documentation (Level 4 - Full Docs)'));
      visStateGroup.appendChild(labelVisDocs);

      cbApplyVis.addEventListener('change', () => {
        visStateGroup.style.display = cbApplyVis.checked ? 'flex' : 'none';
      });

      // Section 3: File Checkboxes List
      const filesGroup = document.createElement('div');
      filesGroup.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
      
      const titleFiles = document.createElement('div');
      titleFiles.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #aeb3c7; font-weight: bold; margin-top: 4px;';
      titleFiles.textContent = `Matched Files (${paths.length})`;
      filesGroup.appendChild(titleFiles);

      const filesContainer = document.createElement('div');
      filesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; padding: 2px;';
      filesGroup.appendChild(filesContainer);

      const checkboxes = new Map();

      for (const path of paths) {
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; gap: 10px; cursor: pointer; color: #dce6ff; font-family: ui-monospace, monospace; font-size: 11px; background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); transition: background 0.15s; justify-content: space-between;';
        
        label.onmouseenter = () => label.style.background = 'rgba(255,255,255,0.1)';
        label.onmouseleave = () => label.style.background = 'rgba(255,255,255,0.05)';

        const leftPart = document.createElement('div');
        leftPart.style.cssText = 'display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.style.cursor = 'pointer';
        
        leftPart.appendChild(cb);
        leftPart.appendChild(document.createTextNode(path));
        label.appendChild(leftPart);
        
        const rightPart = document.createElement('div');
        rightPart.style.cssText = 'font-size: 10px; color: #8a9fc4; opacity: 0.8;';
        const meta = app.inMemoryFileMetadata?.[path] || {};
        const codeSize = meta.codeSize || 0;
        if (codeSize > 0) {
          rightPart.textContent = `${codeSize} lines`;
        }
        label.appendChild(rightPart);

        filesContainer.appendChild(label);
        checkboxes.set(path, cb);
      }

      content.appendChild(actionsGroup);
      content.appendChild(visStateGroup);
      content.appendChild(filesGroup);

      const DialogClass = typeof UITools !== 'undefined' ? UITools : window.UITools;
      
      DialogClass.makeDialog({
        title: '📋 Clipboard Extractor & Visibility Options',
        contentElement: content,
        width: '560px',
        buttons: [
          { label: 'Cancel' },
          { 
            label: 'Apply Selection', 
            className: 'primary',
            onClick: async (e, dialog) => {
              const selectedPaths = [];
              for (const [path, cb] of checkboxes.entries()) {
                if (cb.checked) selectedPaths.push(path);
              }
              
              if (selectedPaths.length === 0) {
                app.uiManager?.setStatus('No files selected. Action cancelled.', true);
                dialog.close();
                return;
              }
              
              dialog.close();

              try {
                const hasExtract = cbExtract.checked;
                const hasApplyVis = cbApplyVis.checked;

                const settingsMap = {};
                const state = {
                  code: visCode.checked,
                  codeLevel: visCode.checked ? 4 : 0,
                  signatures: visSig.checked,
                  sig: visSig.checked,
                  docs: visDocs.checked,
                  docsLevel: visDocs.checked ? 4 : 0
                };

                for (const path of selectedPaths) {
                  settingsMap[path] = { ...state };
                }

                if (hasApplyVis) {
                  app.uiManager?.setStatus('Applying visibility states to workspace...');
                  app.projectFilesManager?.applyVisibilitySet(settingsMap, null);
                }

                if (hasExtract) {
                  await this._extractToOutputTab(app, selectedPaths);
                }

                app.uiManager?.setStatus('Extraction and visibility updates applied.', false, 4000);

              } catch (err) {
                console.error(err);
                app.uiManager?.setStatus(`Failed to apply updates: ${err.message}`, true);
              }
            }
          }
        ]
      });
    }

  async _extractToOutputTab(app, paths) {
      app.uiManager?.setStatus(`Extracting ${paths.length} file(s)...`);
      
      let output = `// 📋 Clipboard Path Scanner Results\n// Extracted ${paths.length} file(s)\n\n`;

      for (const path of paths) {
        let content = null;
        
        if (app.vfs) {
          try { content = await app.vfs.readFile(path, { nullOnMissing: true }); } catch (e) {}
        }
        if (!content && app.inMemoryFileStore?.has(path)) {
          content = app.inMemoryFileStore.get(path);
        }
        if (!content) {
           const rootId = "/" + path.split("/").filter(Boolean)[0];
           const store = app.workspaceFileStores?.get(rootId);
           if (store && typeof store.get === 'function') {
             content = store.get(path);
             if (typeof content !== 'string' && content?.content) content = content.content;
           }
        }

        output += `// --- ${path} ---\n`;
        if (typeof content === 'string') {
          const ext = path.split('.').pop().toLowerCase();
          let lang = 'javascript';
          if (ext === 'css') lang = 'css';
          else if (ext === 'html') lang = 'html';
          else if (ext === 'json') lang = 'json';
          else if (ext === 'md') lang = 'markdown';
          
          output += `\`\`\`${lang}\n`;
          output += content.trim();
          output += `\n\`\`\`\n\n`;
        } else {
          output += `// (Could not read file content)\n\n`;
        }
      }

      if (app.uiManager?.showInOutputTab) {
        app.uiManager.showInOutputTab(output);
      }
      app.uiManager?.setStatus(`Extracted ${paths.length} file(s) to Output Tab.`);
    }
}