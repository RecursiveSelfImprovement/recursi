
/**
 * LibraryManagerDialog — Quick-add shared libraries without leaving the editor.
 * Opens as a modal, shows all available library files from the catalog,
 * marks which ones are already in the project, and lets you add with one click.
 */
class LibraryManagerDialog {
  
  constructor(app) {
    this.app = app;
    this.dialog = null;
    this.catalogLibs = [];
  }

  async show() {
    applyCss(LibraryManagerDialog.CSS, 'LibraryManagerDialogStyles');

    const content = makeElement('div', { className: 'lib-manager-content' }, [
      makeElement('div', { className: 'lib-manager-loading' }, 'Loading library catalog...')
    ]);

    this.dialog = UITools.makeDialog({
      title: 'Shared Libraries',
      content: content,
      width: '520px',
      buttons: [{ label: 'Done' }],
    });

    try {
      this.catalogLibs = await this._fetchCatalog();
      content.innerHTML = '';
      if (this.catalogLibs.length === 0) {
        content.appendChild(makeElement('p', { className: 'lib-manager-empty' }, 'No shared libraries found in catalog.'));
        return;
      }
      const list = this._buildList();
      content.appendChild(list);
    } catch (e) {
      console.error('[LibraryManager] Failed to load catalog:', e);
      content.innerHTML = '';
      content.appendChild(makeElement('p', { className: 'lib-manager-error' }, 'Failed to load library catalog. See console for details.'));
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
        return ProjectCatalogCapsule.sharedLibraryFiles();
      }
      return [];
    }

  _isInProject(libName) {
    const goldenPath = `/library/${libName}`;
    // Check file tree
    if (this.app.projectFilesManager?.fileTreeView?.nodesMap?.has(goldenPath)) return true;
    // Check in-memory store
    if (this.app.inMemoryFileStore?.has(goldenPath)) return true;
    return false;
  }

  _buildList() {
    const container = makeElement('div', { className: 'lib-manager-list' });

    for (const lib of this.catalogLibs) {
      const isAdded = this._isInProject(lib.name);
      const row = this._buildRow(lib, isAdded);
      container.appendChild(row);
    }

    return container;
  }

  _buildRow(lib, isAdded) {
      const addBtn = makeElement('button', {
        className: `lib-manager-add-btn ${isAdded ? 'added' : ''}`,
        textContent: isAdded ? '✓' : '+',
        title: isAdded ? 'Already in project' : `Add ${lib.name} to project`,
        disabled: isAdded,
      });

      if (!isAdded) {
        addBtn.onclick = (e) => {
          e.stopPropagation();
          this._addLibrary(lib.name, addBtn);
        };
      }

      const description = lib.description || '';

      // OBSOLETE: DialogBox.js and ThreeJSApp.js are obsolete catalog files.
      // DialogBox has been replaced by UITools, and ThreeJSApp has been replaced by ThreeJSLoader.
      const isCore = lib.name === 'recursi.js' || lib.name === 'DialogBox.js' || lib.name === 'ThreeJSApp.js';

      const row = makeElement('div', { className: `lib-manager-row ${isAdded ? 'is-added' : ''} ${isCore ? 'is-core' : ''}` }, [
        addBtn,
        makeElement('div', { className: 'lib-manager-info' }, [
          makeElement('span', { className: 'lib-manager-name' }, lib.name),
          makeElement('span', { className: 'lib-manager-desc' }, description),
        ]),
      ]);

      return row;
    }

  _addLibrary(libName, btn) {
    btn.disabled = true;
    btn.textContent = '...';
    btn.classList.add('adding');

    // Use the same postMessage mechanism as the Project Browser
    window.postMessage(
      { type: 'recursi:addSharedLibrary', payload: { fileName: libName } },
      '*'
    );

    // Update button after a short delay to let the process start
    setTimeout(() => {
      btn.textContent = '✓';
      btn.classList.remove('adding');
      btn.classList.add('added');
      btn.title = 'Added to project';
      btn.closest('.lib-manager-row')?.classList.add('is-added');
    }, 500);
  }

  static CSS = `
    .lib-manager-content {
      max-height: 60vh;
      overflow-y: auto;
    }
    .lib-manager-loading,
    .lib-manager-empty,
    .lib-manager-error {
      padding: 20px;
      text-align: center;
      color: var(--text-secondary, #aaa);
    }
    .lib-manager-error { color: var(--accent-red, #e55); }
    .lib-manager-list {
      display: flex;
      flex-direction: column;
    }
    .lib-manager-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color, #333);
      transition: background-color 0.15s;
    }
    .lib-manager-row:last-child { border-bottom: none; }
    .lib-manager-row:hover { background-color: var(--bg-tertiary, #2a2a2a); }
    .lib-manager-row.is-added { opacity: 0.6; }
    .lib-manager-row.is-core .lib-manager-name { color: var(--accent-teal, #00bfa5); }
    .lib-manager-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .lib-manager-name {
      font-weight: 600;
      color: var(--text-primary, #ddd);
      font-size: 0.95em;
    }
    .lib-manager-desc {
      color: var(--text-secondary, #999);
      font-size: 0.82em;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lib-manager-add-btn {
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 1px solid var(--accent-blue, #007acc);
      background: transparent;
      color: var(--accent-blue, #007acc);
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      padding: 0;
      line-height: 1;
    }
    .lib-manager-add-btn:hover:not(:disabled) {
      background-color: var(--accent-blue, #007acc);
      color: white;
    }
    .lib-manager-add-btn.added {
      border-color: var(--accent-green, #28a745);
      color: var(--accent-green, #28a745);
      cursor: default;
      font-size: 14px;
    }
    .lib-manager-add-btn.adding {
      border-color: var(--accent-orange, #f0a030);
      color: var(--accent-orange, #f0a030);
    }
  `;

  async _libraryDialogGetVfs() {    const app = this.app || window.projectApp || null;    if (!app) {      return null;    }    if (typeof app.refreshVirtualFileSystemStores === "function") {      return await app.refreshVirtualFileSystemStores();    }    return app.vfs || null;  }

  _libraryDialogParseCatalogText(text, path) {    if (typeof text !== "string" || !text.trim()) {      return null;    }    try {      const parsed = JSON.parse(text);      if (Array.isArray(parsed)) {        return parsed;      }      if (Array.isArray(parsed.projects)) {        return parsed.projects;      }      if (Array.isArray(parsed.items)) {        return parsed.items;      }      if (parsed && typeof parsed === "object") {        return parsed;      }      return null;    } catch (error) {      this._libraryDialogLogReadFallback("JSON.parse", path, error);      return null;    }  }

  _libraryDialogLogReadFallback(operation, path, error) {    const message = error && error.message ? error.message : String(error);    if (this.app && typeof this.app.logFileOp === "function") {      this.app.logFileOp("debug", "LibraryManagerDialog VFS read fallback", {        operation,        path,        error: message      });      return;    }    if (this.app?.fileLogger && typeof this.app.fileLogger.log === "function") {      this.app.fileLogger.log("debug", "LibraryManagerDialog VFS read fallback", {        operation,        path,        error: message      });    }  }

}

