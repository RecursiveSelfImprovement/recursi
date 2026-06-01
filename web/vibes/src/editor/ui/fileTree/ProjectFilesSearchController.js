class ProjectFilesSearchController {
  
  constructor(options = {}) {
    this.manager = options.manager || null;
    this._startObserver();
  }

  handleFileOpenRequest(manager = this.manager, node) {
    if (!manager || !node) {
      return false;
    }

    const fileInfo = {
      id: node.id,
      hasDocs: node.hasDocs,
      readOnly: node.readOnly || false
    };

    let searchTerm = null;

    if (manager.searchPanel && manager.searchPanel.style.display !== "none") {
      const value = manager.searchInput ? manager.searchInput.value.trim() : "";
      if (value) {
        searchTerm = value;
      }
    }

    manager.onFileSelect(fileInfo, {
      isAutoOpened: false,
      searchTerm
    });

    return true;
  }

  async getFileContent(manager = this.manager, filePath) {
    try {
      if (
        manager.app.inMemoryFileStore &&
        manager.app.inMemoryFileStore.has(filePath)
      ) {
        return manager.app.inMemoryFileStore.get(filePath);
      }

      const response = await fetch(filePath);

      if (!response.ok) {
        return null;
      }

      return await response.text();
    } catch (error) {
      return null;
    }
  }

  async handleSearchInput(manager = this.manager, query) {
      const term = String(query || "").trim().toLowerCase();

      const searchContent = !!manager.contentSearchToggle?.checked;
      const matchingIds = new Set();

      if (searchContent && manager.searchInput) {
        manager.searchInput.style.opacity = "0.5";
      }

      // Collect nodes across all active visible file trees
      const views = typeof manager.getFileTreeViews === 'function' ? manager.getFileTreeViews() : [];
      const allNodes = [];
      views.forEach(treeView => {
        if (treeView?.nodesMap) {
          allNodes.push(...treeView.nodesMap.values());
        }
      });

      const queryChars = term.replace(/[^a-z0-9]/gi, '');
      const fuzzyMatch = (str, q) => {
          if (!q) return false;
          let i = 0, j = 0;
          const s = str.toLowerCase();
          while (i < s.length && j < q.length) {
              if (s[i] === q[j]) j++;
              i++;
          }
          return j === q.length;
      };

      for (const node of allNodes) {
        const name = String(node.name || "");
        if (!term || name.toLowerCase().includes(term) || fuzzyMatch(name, queryChars)) {
          matchingIds.add(node.id);
        }
      }

      if (searchContent && term) {
        await this.addContentMatches(manager, allNodes, matchingIds, term);

        if (manager.searchInput) {
          manager.searchInput.style.opacity = "1";
        }
      }

      // Filter all active visible tree views simultaneously
      views.forEach(treeView => {
        if (typeof treeView.applyFilter === 'function') {
          treeView.applyFilter(term ? matchingIds : null);
        }
      });

      return true;
    }

  async addContentMatches(manager, allNodes, matchingIds, term) {
    const filesToCheck = allNodes.filter((node) => {
      return (
        node &&
        node.type === "file" &&
        !matchingIds.has(node.id)
      );
    });

    const chunkSize = 15;

    for (let i = 0; i < filesToCheck.length; i += chunkSize) {
      const chunk = filesToCheck.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (node) => {
          try {
            const content = await this.readSearchableFileContent(manager, node);

            if (
              typeof content === "string" &&
              content.toLowerCase().includes(term)
            ) {
              matchingIds.add(node.id);
            }
          } catch (error) {}
        })
      );
    }

    return matchingIds;
  }

  async readSearchableFileContent(manager, node) {
    if (!manager || !node || !node.id) {
      return null;
    }

    if (
      manager.app.inMemoryFileStore &&
      manager.app.inMemoryFileStore.has(node.id)
    ) {
      return manager.app.inMemoryFileStore.get(node.id);
    }

    if (
      manager.app.commands &&
      typeof manager.app.commands.fetchFileContentForApp === "function" &&
      typeof manager.app.createPath === "function"
    ) {
      const result = await manager.app.commands.fetchFileContentForApp(
        manager.app.createPath(node.id),
        ["code"]
      );

      return result ? result.code : null;
    }

    return await this.getFileContent(manager, node.id);
  }

  openAdvancedSearchDialog(manager = this.manager) {
    if (!manager || !manager.app) return;
    
    const uiToolsObj = typeof UITools !== 'undefined' ? UITools : (window._dev_projectEditorInstance?.uiManager?.uiTools || window.UITools);
    if (!uiToolsObj) return;

    const lastSearch = localStorage.getItem('last_adv_search_query') || '';
    const lastPath = localStorage.getItem('last_adv_search_path') || '';
    const lastMaxLines = localStorage.getItem('last_adv_search_max') || '10000';
    const lastDocs = localStorage.getItem('last_adv_search_docs') !== 'false';
    const lastMeta = localStorage.getItem('last_adv_search_meta') !== 'false';

    const queryInput = document.createElement('input');
    queryInput.type = 'text';
    queryInput.placeholder = 'Method name or code snippet...';
    queryInput.value = lastSearch;
    queryInput.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 10px; background: #111; color: #fff; border: 1px solid #444; border-radius: 4px; box-sizing: border-box;';
    
    const pathPrefixInput = document.createElement('input');
    pathPrefixInput.type = 'text';
    pathPrefixInput.placeholder = 'Optional folder path (e.g. /vibes/src/)';
    pathPrefixInput.value = lastPath;
    pathPrefixInput.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 10px; background: #111; color: #fff; border: 1px solid #444; border-radius: 4px; box-sizing: border-box;';
    
    const maxLinesInput = document.createElement('input');
    maxLinesInput.type = 'number';
    maxLinesInput.value = lastMaxLines;
    maxLinesInput.style.cssText = 'width: 100px; padding: 8px; background: #111; color: #fff; border: 1px solid #444; border-radius: 4px; box-sizing: border-box;';

    const docsCheck = document.createElement('input');
    docsCheck.type = 'checkbox';
    docsCheck.checked = lastDocs;
    
    const metaCheck = document.createElement('input');
    metaCheck.type = 'checkbox';
    metaCheck.checked = lastMeta;

    const content = document.createElement('div');
    
    const p1 = document.createElement('p'); p1.style.marginBottom = '5px'; p1.textContent = 'Search Query:';
    const p2 = document.createElement('p'); p2.style.marginBottom = '5px'; p2.textContent = 'Path Prefix:';
    
    const checksDiv = document.createElement('div');
    checksDiv.style.cssText = 'display: flex; gap: 20px; margin-bottom: 10px;';
    
    const lblDocs = document.createElement('label');
    lblDocs.style.cssText = 'display: flex; align-items: center; gap: 5px; cursor: pointer;';
    lblDocs.append(docsCheck, 'Include Docs (_doc*)');
    
    const lblMeta = document.createElement('label');
    lblMeta.style.cssText = 'display: flex; align-items: center; gap: 5px; cursor: pointer;';
    lblMeta.append(metaCheck, 'Include Meta (_meta*)');
    
    checksDiv.append(lblDocs, lblMeta);
    
    const p3 = document.createElement('p'); p3.style.marginBottom = '5px'; p3.textContent = 'Max Lines:';
    const p4 = document.createElement('p'); p4.style.cssText = 'font-size: 0.9em; color: #aaa; margin-top: 10px;'; p4.textContent = 'Results will stream into the Output Tab and appear in the Build Prompt tab.';

    content.append(p1, queryInput, p2, pathPrefixInput, checksDiv, p3, maxLinesInput, p4);

    const dialog = uiToolsObj.makeDialog({
      title: 'Advanced Method Search',
      content,
      width: '450px',
      buttons: [
        { label: 'Cancel' },
        { 
          label: 'Run Search', 
          className: 'primary',
          onClick: async () => {
            const query = queryInput.value.trim();
            if (!query) return;
            const pathPrefix = pathPrefixInput.value.trim();
            const maxLines = parseInt(maxLinesInput.value, 10) || 10000;
            const includeDocs = docsCheck.checked;
            const includeMeta = metaCheck.checked;

            localStorage.setItem('last_adv_search_query', query);
            localStorage.setItem('last_adv_search_path', pathPrefix);
            localStorage.setItem('last_adv_search_max', maxLines.toString());
            localStorage.setItem('last_adv_search_docs', includeDocs.toString());
            localStorage.setItem('last_adv_search_meta', includeMeta.toString());
            
            manager.app.commands.fuzzySearchMethods({
              query,
              pathPrefix,
              maxLines,
              includeDocs,
              includeMeta
            });
            
            dialog.close();
          }
        }
      ]
    });
    
    setTimeout(() => {
      queryInput.focus();
      queryInput.select();
    }, 50);
  }

  _startObserver() {
    if (ProjectFilesSearchController._observerStarted) return;
    ProjectFilesSearchController._observerStarted = true;
    
    const observer = new MutationObserver(() => {
      const inputs = document.querySelectorAll('.tree-search-input, .floating-panel-tree-search');
      inputs.forEach(input => {
        const parent = input.parentElement;
        if (!parent || parent.querySelector('.adv-search-btn')) return;
        
        const btn = document.createElement('button');
        btn.className = 'adv-search-btn';
        btn.title = 'Advanced Method Search';
        btn.innerHTML = '🕵️';
        btn.style.cssText = 'background: transparent; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer; font-size: 14px; padding: 2px 6px; margin-right: 5px; margin-left: auto;';
        
        btn.onclick = () => {
           const mgr = window._dev_projectEditorInstance?.projectFilesManager || this.manager;
           const ctrl = new ProjectFilesSearchController({ manager: mgr });
           ctrl.openAdvancedSearchDialog(mgr);
        };
        
        parent.insertBefore(btn, input);
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

}