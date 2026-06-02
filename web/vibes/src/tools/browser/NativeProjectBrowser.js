class NativeProjectBrowser {
    
    constructor(app) {
      this.app = app;
      this.element = document.createElement('div');
      this.element.className = 'native-project-browser';
      this.projectData = null;
      this.thumbnailViewers = new Map();
      this.existingLibs = new Set();
      
      // Store active instance for immediate UI refresh triggers
      this.app.nativeProjectBrowserInstance = this;

      if (this.app?.projectFilesManager?.fileTreeView?.nodesMap) {
        for (const node of this.app.projectFilesManager.fileTreeView.nodesMap.values()) {
          if (node.id.startsWith('/library/') && node.type === 'file') {
            this.existingLibs.add(node.name);
          }
        }
      }
    }

    getElement() {
      return this.element;
    }

    async init() {
      this._applyStyles();
      this._renderLayout();

      this.thumbnailViewers.forEach(viewer => this._stopAutoCycling(viewer));
      this.thumbnailViewers.clear();

      try {
        this.app.uiManager?.setStatus('Loading Project Catalog...');
        this.projectData = await this._fetchCatalog();
        this._renderAllProjects();
        
        this.thumbnailViewers.forEach(viewer => this._startAutoCycling(viewer));
        this.app.uiManager?.setStatus('Project Catalog loaded.', false, 2000);
      } catch (error) {
        console.error('Failed to load project data:', error);
        this.contentArea.innerHTML = `<div style="padding: 20px; color: #ff6b6b;"><h2>Failed to Load Catalog</h2><p>${error.message}</p></div>`;
      }
    }

    async _fetchCatalog() {
      if (typeof ProjectCatalogCapsule === 'undefined') {
        const app = this.app || window.projectApp || window._dev_projectEditorInstance;
        if (app && typeof app._loadClassicScriptOnce === 'function') {
          await app._loadClassicScriptOnce('/vibes/src/tools/browser/ProjectCatalogCapsule.js');
        }
      }
      if (typeof ProjectCatalogCapsule !== 'undefined') {
        return ProjectCatalogCapsule.getCatalog();
      }
      return {};
    }

    _renderLayout() {
      this.element.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'header';
      header.innerHTML = '<h1>Project Browser</h1><p style="color: #aaa; margin-top: 5px;">Native V3 Implementation</p>';
      
      this.contentArea = document.createElement('div');
      this.contentArea.className = 'content-area';
      
      this.element.append(header, this.contentArea);
    }

    _renderAllProjects() {
      this.contentArea.innerHTML = '';
      if (!this.projectData) return;

      const categoryConfig = [
        { key: 'Starter Templates', description: 'Minimal project templates to fork and build on.' },
        { key: 'Games & Interactive', description: 'Playable games and interactive experiences.' },
        { key: 'Tools & Apps', description: 'Utility applications and productivity tools built with Recursi.' },
        { key: 'Experiments', description: 'Visual experiments, generative art, and geometry explorations.' },
        { key: 'meta', description: "Our own digital playground-a home for the Vibes editor, developer tests, and experimental tools to improve Vibes itself." }
      ];

      for (const cat of categoryConfig) {
        const projects = this.projectData[cat.key];
        if (Array.isArray(projects) && projects.length > 0) {
          this._renderProjectCategory(cat.key, projects, cat.description);
        }
      }
    }

    _renderProjectCategory(categoryName, projects, description) {
      const header = document.createElement('div');
      header.className = 'category-section';
      header.innerHTML = `<h2 class="category-header">${categoryName}</h2>`;
      if (description) {
        header.innerHTML += `<p class="category-description">${description}</p>`;
      }
      
      const grid = document.createElement('div');
      grid.className = 'project-grid';

      projects.forEach(proj => {
        const card = this._renderProjectCard(proj);
        grid.appendChild(card);
      });
      
      this.contentArea.append(header, grid);
    }

    _renderProjectCard(project) {
      const isSharedFile = project.name.endsWith('.js');
      const isViewOnly = !!project.viewOnly;
      const disableStatic = !!project.disableStaticOpen;
      const isSelfEditor = !!project.selfEditor;
      
      const card = document.createElement('div');
      card.className = 'project-card' + (isViewOnly ? ' view-only' : '') + (isSelfEditor ? ' self-editor' : '');

      const visibleArea = document.createElement('div');
      visibleArea.className = 'card-visible-area';

      const thumbContainer = document.createElement('div');
      thumbContainer.className = 'thumbnail-container';
      this._createThumbnailViewer(thumbContainer, project);

      const textContent = document.createElement('div');
      textContent.className = 'card-text-content';
      textContent.innerHTML = `<h3>${project.name}</h3><p>${project.description || ''}</p>`;

      const actions = document.createElement('div');
      actions.className = 'card-actions-modern';

      if (isSharedFile) {
        const isAdded = this.existingLibs.has(project.name);
        const addBtn = document.createElement('button');
        addBtn.className = `card-action-btn add ${isAdded ? 'added' : ''}`;
        addBtn.textContent = isAdded ? 'Added' : 'Add to Project';
        addBtn.disabled = isAdded;
        addBtn.onclick = (e) => {
          e.stopPropagation();
          this._handleAddSharedLib(project, addBtn);
        };
        actions.appendChild(addBtn);
      } else {
        const projectDir = project.directory || project.name;
        let target = disableStatic ? 'tab' : 'window'; 
        let hasEdits = false;

        const renderControls = () => {
          actions.innerHTML = '';
          
          if (isViewOnly) {
            const openBtn = document.createElement('button');
            openBtn.className = 'card-action-btn primary';
            openBtn.textContent = 'Preview';
            openBtn.onclick = (e) => {
              e.stopPropagation();
              window.open(`/${projectDir}/`, '_blank');
            };
            actions.appendChild(openBtn);
            return;
          }

          if (isSelfEditor) {
            const forkBtn = document.createElement('button');
            forkBtn.className = 'card-action-btn primary';
            forkBtn.textContent = 'Fork / Save to Disk';
            forkBtn.onclick = (e) => {
              e.stopPropagation();
              this._handleSelfEditorWarning(project);
            };
            actions.appendChild(forkBtn);
            return;
          }

          const openBtn = document.createElement('button');
          openBtn.className = 'card-action-btn primary action-main';
          openBtn.textContent = 'Open';
          openBtn.onclick = (e) => {
            e.stopPropagation();
            if (disableStatic || target === 'tab') {
              const url = `/${projectDir}/` + (hasEdits ? '?userEdits=true' : '');
              window.open(url, '_blank');
            } else {
              this._handleEditProject(projectDir);
            }
          };
          actions.appendChild(openBtn);

          const forkBtn = document.createElement('button');
          forkBtn.className = 'card-action-btn secondary action-fork';
          forkBtn.textContent = 'Fork / Save to Disk';
          forkBtn.style.marginTop = '4px';
          forkBtn.onclick = (e) => {
            e.stopPropagation();
            this.app.actionHandler.handleForkAndSaveToDisk(projectDir);
          };
          actions.appendChild(forkBtn);

          if (!disableStatic) {
            const locGroup = document.createElement('div');
            locGroup.className = 'toggle-group';
            locGroup.onclick = (e) => e.stopPropagation();

            const locWin = document.createElement('button');
            locWin.className = `toggle-btn ${target === 'window' ? 'active' : ''}`;
            locWin.textContent = 'Window';
            locWin.onclick = (e) => { e.stopPropagation(); target = 'window'; renderControls(); };
            
            const locTab = document.createElement('button');
            locTab.className = `toggle-btn ${target === 'tab' ? 'active' : ''}`;
            locTab.textContent = 'New Tab';
            locTab.onclick = (e) => { e.stopPropagation(); target = 'tab'; renderControls(); };

            locGroup.append(locWin, locTab);
            actions.appendChild(locGroup);
          }
        };

        renderControls();

        this._checkIfProjectHasEdits(projectDir).then(edits => {
          if (edits) hasEdits = true;
        });
      }

      textContent.appendChild(actions);
      visibleArea.append(thumbContainer, textContent);
      card.appendChild(visibleArea);

      if (isViewOnly) {
        const badge = document.createElement('span');
        badge.className = 'view-only-badge';
        badge.textContent = 'View Only';
        card.appendChild(badge);
      }

      card.onclick = () => {
        const projectDir = project.directory || project.name;
        if (isSharedFile && !this.existingLibs.has(project.name)) {
          this._handleAddSharedLib(project, actions.querySelector('.add'));
        } else if (isSelfEditor) {
          this._handleSelfEditorWarning(project);
        } else if (!isViewOnly && !isSharedFile) {
          if (disableStatic) {
            window.open(`/${projectDir}/`, '_blank');
          } else {
            this._handleEditProject(projectDir);
          }
        }
      };

      return card;
    }

    _handleEditProject(projectName) {
      this.app.uiManager?.setStatus(`Loading ${projectName} for editing...`);
      this.app.projectName = projectName;
      this.app.isStaticMode = true;
      if (this.app.uiManager && typeof this.app.uiManager.setUIMode === 'function') {
        this.app.uiManager.setUIMode('indexeddb');
      }
      
      // Let bootForStaticEdit handle the URL pushing to avoid duplication
      this.app.projectLoader.bootForStaticEdit(projectName);
    }

    _handleAddSharedLib(project, btn) {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Added';
        btn.classList.add('added');
      }
      this.existingLibs.add(project.name);
      this.app.pendingSharedLibs.add(project.name);
      if (typeof this.app._processPendingSharedLibs === 'function') {
        this.app._processPendingSharedLibs();
      }
    }

    _createThumbnailViewer(container, project) {
      const viewerState = {
        project: project,
        currentIndex: 0,
        timeoutId: null,
        container: container,
      };
      this.thumbnailViewers.set(container, viewerState);

      if (project.thumbnails && project.thumbnails.length > 0) {
        container.classList.add('has-thumbnail');
        this._cycleThumbnail(viewerState, 0);
      } else {
        container.classList.add('no-thumbnail');
        container.innerHTML = `<span>${project.name.endsWith('.js') ? '{...}' : '🚀'}</span>`;
      }
    }

    _startAutoCycling(viewer) {
      this._stopAutoCycling(viewer);
      if (viewer.project.thumbnails && viewer.project.thumbnails.length > 1) {
        const schedule = () => {
          const randomDelay = 4500 + Math.random() * 2000;
          viewer.timeoutId = setTimeout(() => {
            if (document.body.contains(viewer.container)) {
              this._cycleThumbnail(viewer);
              schedule(); 
            }
          }, randomDelay);
        };
        schedule();
      }
    }

    _stopAutoCycling(viewer) {
      if (viewer.timeoutId) {
        clearTimeout(viewer.timeoutId);
        viewer.timeoutId = null;
      }
    }

    _cycleThumbnail(viewer, direction = 1) {
      const { project, container } = viewer;
      if (!project.thumbnails || project.thumbnails.length === 0) return;

      viewer.currentIndex = (viewer.currentIndex + direction) % project.thumbnails.length;

      const newImg = document.createElement('img');
      newImg.src = project.thumbnails[viewer.currentIndex];
      newImg.style.cssText = 'opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 0.5s ease-in-out;';

      container.style.position = 'relative';
      if (container.classList.contains('no-thumbnail')) {
        container.innerHTML = '';
        container.classList.remove('no-thumbnail');
        container.classList.add('has-thumbnail');
      }

      container.appendChild(newImg);

      requestAnimationFrame(() => {
        newImg.style.opacity = 1;
      });

      setTimeout(() => {
        while (container.children.length > 1) {
          container.removeChild(container.firstChild);
        }
      }, 500);
    }

    _applyStyles() {
      const cssId = 'NativeProjectBrowserStyles';
      if (document.getElementById(cssId)) return;
      
      const css = `
        .native-project-browser {
          padding: 2em; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; overflow-y: auto;
          background-color: var(--bg-primary, #1e1e1e); color: var(--text-primary, #d4d4d4);
        }
        .native-project-browser .header { flex-shrink: 0; border-bottom: 1px solid var(--border-color); padding-bottom: 1em; margin-bottom: 1.5em; }
        .native-project-browser .header h1 { margin: 0; color: var(--text-primary); font-size: 1.8em; font-weight: 300; }
        .native-project-browser .content-area { overflow-y: auto; flex: 1; }
        .native-project-browser .category-description { color: var(--text-secondary, #aaa); font-size: 14px; margin: -8px 0 16px 0; max-width: 700px; line-height: 1.4; }
        .native-project-browser .category-section { margin-bottom: 8px; }
        .native-project-browser .category-header { color: var(--accent-teal, #00bfa5); font-size: 1.4em; margin: 0 0 1em 0; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5em; }
        .native-project-browser .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5em; margin-bottom: 2em; }
        .native-project-browser .project-card { 
            position: relative; border: 1px solid var(--border-color); border-radius: 8px; 
            transition: all 0.2s ease; cursor: pointer; overflow: hidden; background-color: var(--bg-secondary);
        }
        .native-project-browser .project-card:hover { transform: translateY(-3px); box-shadow: 0 4px 20px rgba(0,0,0,0.4); border-color: var(--accent-blue); }
        .native-project-browser .card-visible-area { display: flex; padding: 1em; }
        .native-project-browser .thumbnail-container { flex-shrink: 0; margin-right: 1em; position: relative; background-color: var(--bg-tertiary); border-radius: 4px; cursor: default; }
        .native-project-browser .thumbnail-container.has-thumbnail { width: 160px; height: 240px; border-radius: 4px; overflow: hidden; background-color: #000; }
        .native-project-browser .thumbnail-container.no-thumbnail { display: flex; align-items: center; justify-content: center; font-size: 2.5em; color: var(--text-secondary); font-family: monospace; width: 120px; height: 120px; }
        .native-project-browser .card-text-content { display: flex; flex-direction: column; flex-grow: 1; min-width: 0; }
        .native-project-browser .card-text-content h3 { margin: 0 0 0.5em 0; color: var(--accent-blue); font-size: 1.2em; }
        .native-project-browser .card-text-content p { margin: 0 0 1em 0; color: var(--text-secondary); font-size: 0.9em; line-height: 1.5; }
        
        /* Modern Streamlined Controls */
        .native-project-browser .card-actions-modern { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }
        .native-project-browser .card-action-btn { width: 100%; padding: 8px 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-secondary); font-weight: 500; cursor: pointer; transition: all 0.2s ease; text-align: center; font-size: 13px; }
        .native-project-browser .card-action-btn:hover:not(:disabled) { color: white; transform: translateY(-1px); }
        .native-project-browser .card-action-btn.primary { background-color: var(--accent-teal); color: white; border-color: var(--accent-teal); }
        .native-project-browser .card-action-btn.primary:hover:not(:disabled) { background-color: #00a088; border-color: #00a088; }
        
        .native-project-browser .toggle-group { display: flex; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color); }
        .native-project-browser .toggle-group.ver-group { border-color: #555; }
        .native-project-browser .toggle-btn { flex: 1; padding: 6px 8px; background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 11px; transition: all 0.15s ease; border-right: 1px solid var(--border-color); }
        .native-project-browser .toggle-btn:last-child { border-right: none; }
        .native-project-browser .toggle-btn.active { background: var(--accent-blue); color: #fff; }
        .native-project-browser .ver-group .toggle-btn.active { background: #5a5a5a; }

        .native-project-browser .view-only-badge { position: absolute; top: 10px; right: 10px; background: #e67e22; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
      `;
      const style = document.createElement('style');
      style.id = cssId;
      style.textContent = css;
      document.head.appendChild(style);
    }

  async _checkIfProjectHasEdits(projectName) {
      return new Promise((resolve) => {
        try {
          const req = indexedDB.open('vibes_dev_mirror');
          req.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('files')) return resolve(false);
            const tx = db.transaction('files', 'readonly');
            const store = tx.objectStore('files');
            const keysReq = store.getAllKeys();
            keysReq.onsuccess = () => {
              const keys = keysReq.result || [];
              resolve(keys.some(k => k.startsWith(`/${projectName}/`)));
            };
            keysReq.onerror = () => resolve(false);
          };
          req.onerror = () => resolve(false);
        } catch(err) { 
          resolve(false); 
        }
      });
    }


  _handleSelfEditorWarning(project) {
      const content = document.createElement('div');
      content.style.cssText = 'color: #cbd5e1; line-height: 1.6; font-size: 13px; font-family: system-ui, sans-serif;';
      content.innerHTML = `
        <p style="margin-bottom: 12px;"><strong>🌌 Recursion Detected!</strong></p>
        <p style="margin-bottom: 12px;">Running the <strong>Vibes editor</strong> inside the <strong>Vibes editor</strong> is like holding a mirror up to another mirror. It is incredibly meta and a great party trick, but it can easily trap your browser in an endless hall of reflections!</p>
        <p style="margin-bottom: 16px;">If you want to be seriously improving Vibes with Vibes, we highly recommend you clone the official repository directly to your computer:</p>
        <pre style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; font-family: monospace; font-size: 11px; color: #a5b4fc; margin-bottom: 16px; overflow-x: auto; white-space: pre;">git clone https://github.com/RecursiveSelfImprovement/recursi</pre>
        <p style="color: #ff9800; font-weight: bold;">Would you like to fork the Vibes code to your local disk instead?</p>
      `;

      UITools.makeDialog({
        title: '🌌 Into the Meta-Verse...',
        content,
        width: '460px',
        buttons: [
          {
            label: '📁 Fork Vibes to Disk',
            className: 'primary',
            onClick: (e, dialog) => {
              dialog.close();
              this.app.actionHandler.handleForkAndSaveToDisk(project.name);
            }
          },
          {
            label: 'Cancel'
          }
        ]
      });
    }
}