class BookMarksOrganizer {
  titleElement = null;

  statusDiv = null;

  configSection = null;

  configTextarea = null;

  createBoxButton = null;

  autoLoadedBox = null;

  autoLoadedBoxDimensionDisplay = null;

  configuredBoxes = [];

  init(targetElement) {
    this.rootEl = targetElement || document.body;

    this.data = null;
    this.longUrls = {};
    this._folderOpenState = new Map();
    this.timestampMap = {};

    // State
    this.searchQuery = '';
    this.searchIncludeUrl = false;
    this.editingId = null;
    this.movingNode = null;
    this.selectedNodeId = null;

    // Active Bookmark State
    this.activeBookmarkId = null;
    this.activeBookmarkOriginalName = null;
    this.activeBookmarkOriginalParentId = null;

    // Theme
    this.themes = ['Slate', 'Paper', 'Midnight', 'Terminal'];
    this.currentTheme = 'Slate';

    this._actionsDialog = new BookMarksOrganizerActionsDialog();

    // Load Persistence
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        [
          'bmo_theme',
          'bookmarkTimestamps',
          'bmo_folderState',
          'bmo_activeBookmark',
        ],
        (res) => {
          // Theme
          if (res.bmo_theme && this.themes.includes(res.bmo_theme)) {
            this.currentTheme = res.bmo_theme;
          }

          // Timestamps
          this.timestampMap = res.bookmarkTimestamps || {};

          // Folder State
          if (res.bmo_folderState) {
            try {
              const mapData = JSON.parse(res.bmo_folderState);
              this._folderOpenState = new Map(mapData);
            } catch (e) {
              console.warn('Failed to load folder state', e);
            }
          }

          // Active Bookmark Info
          if (res.bmo_activeBookmark) {
            this.activeBookmarkId = res.bmo_activeBookmark.id;
            this.activeBookmarkOriginalName =
              res.bmo_activeBookmark.originalName;
            this.activeBookmarkOriginalParentId =
              res.bmo_activeBookmark.originalParentId;
          }

          this._applyAppStyles();
          this._renderShell();
          this._enqueue(() => this._loadFromChromeBookmarks());
        }
      );
    } else {
      this._applyAppStyles();
      this._renderShell();
      this._enqueue(() => this._loadFromChromeBookmarks());
    }

    window.addEventListener('click', () => this._closeContextMenu());

    window.addEventListener('keydown', (e) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !this.editingId &&
        !this.movingNode
      ) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (this.selectedNodeId) {
            let targetNode = null;
            this._walk(this.data.bookmarks, (n) => {
              if (String(n.id) === String(this.selectedNodeId)) targetNode = n;
            });
            if (targetNode) {
              this._deleteBookmark(targetNode);
            }
          }
        }
      }
    });
  }

  updateStatus(message, kind = 'neutral') {
    return this.ui.updateStatus(message, kind);
  }

  _applyAppStyles() {
    return this.ui.applyAppStyles();
  }

  _renderTree() {
    return this.ui.renderTree();
  }

  _makeNode(node, ctx) {
    return this.ui.makeNode(node, ctx);
  }

  _resolveUrl(node) {
    return this.treeOps.resolveUrl(node);
  }

  _computeStats(data) {
    return this.treeOps.computeStats(data);
  }

  _renderStats(stats) {
    return this.ui.renderStats(stats);
  }

  _renderNode(node, depth, parentRef) {
    return this.ui.renderNode(node, depth, parentRef);
  }

  _toggleFolder(node) {
    const key = this._nodeKey(node);
    const cur = !!this._folderOpenState.get(key);
    this._folderOpenState.set(key, !cur);

    // Persist immediately
    this._saveFolderState();

    this._renderTree();
  }

  _walk(rootArray, fn) {
    return this.treeOps.walk(rootArray, fn);
  }

  _renderShell() {
    return this.ui.renderShell();
  }

  _primeOpenState() {
    this._folderOpenState.clear();
    const roots =
      this.data && Array.isArray(this.data.bookmarks)
        ? this.data.bookmarks
        : [];
    const walk = (node, depth) => {
      if (node && node.children && Array.isArray(node.children)) {
        const id = this._nodeKey(node);
        const openDefault = depth <= 2;
        this._folderOpenState.set(id, openDefault);
        node.children.forEach((c) => walk(c, depth + 1));
      }
    };
    roots.forEach((r) => walk(r, 0));
  }

  _deleteBookmark(node, parentFolderNode) {
    return this.mutations.deleteBookmark(node, parentFolderNode);
  }

  _deleteDuplicateUrlsKeepNewest() {
    return this.mutations.deleteDuplicateUrlsKeepNewest();
  }

  _deleteDuplicateNamesKeepNewestPerFolder() {
    return this.mutations.deleteDuplicateNamesKeepNewestPerFolder();
  }

  _looksLikeBookmarksBar(node) {
    if (!node || typeof node !== 'object') return false;
    const nm =
      typeof node.name === 'string' ? node.name.trim().toLowerCase() : '';
    const id = typeof node.id === 'string' ? node.id : '';
    // Typical Chrome: Bookmarks Bar id is often "1"
    return nm === 'bookmarks bar' || id === '1';
  }

  _nodeKey(node) {
    return this.treeOps.nodeKey(node);
  }

  async _copyTextToClipboard(text) {
    return this.io.copyTextToClipboard(text);
  }

  _getUiCss() {
    return this.ui.getUiCss();
  }

  _prettyBytes(bytes) {
    return this.ui.prettyBytes(bytes);
  }

  constructor() {
    this.io = new BookMarksOrganizerIO(this);
    this.treeOps = new BookMarksOrganizerTreeOps(this);
    this.mutations = new BookMarksOrganizerMutations(this);
    this.activeItem = new BookMarksOrganizerActiveItem(this);
    this.ui = new BookMarksOrganizerUI(this);

    this._actionsDialog = new BookMarksOrganizerActionsDialog();

    this._sourceMode = 'chrome';
    this._chromeAvailable =
      typeof chrome !== 'undefined' &&
      !!chrome &&
      !!chrome.bookmarks &&
      typeof chrome.bookmarks.getTree === 'function';

    this._opQueue = Promise.resolve();
    this._enqueue = (fn) => {
      this._opQueue = this._opQueue
        .then(() => fn())
        .catch((e) => {
          console.error(e);
          this.updateStatus?.(
            `Chrome op failed: ${e && e.message ? e.message : String(e)}`,
            'bad'
          );
        });
      return this._opQueue;
    };

    this._chrome = {
      getTree: () =>
        new Promise((resolve, reject) => {
          try {
            chrome.bookmarks.getTree((res) => {
              const err = chrome.runtime && chrome.runtime.lastError;
              if (err) reject(new Error(err.message || String(err)));
              else resolve(res);
            });
          } catch (e) {
            reject(e);
          }
        }),

      remove: (id) =>
        new Promise((resolve, reject) => {
          try {
            chrome.bookmarks.remove(String(id), () => {
              const err = chrome.runtime && chrome.runtime.lastError;
              if (err) reject(new Error(err.message || String(err)));
              else resolve(true);
            });
          } catch (e) {
            reject(e);
          }
        }),

      removeTree: (id) =>
        new Promise((resolve, reject) => {
          try {
            chrome.bookmarks.removeTree(String(id), () => {
              const err = chrome.runtime && chrome.runtime.lastError;
              if (err) reject(new Error(err.message || String(err)));
              else resolve(true);
            });
          } catch (e) {
            reject(e);
          }
        }),

      move: (id, dest) =>
        new Promise((resolve, reject) => {
          try {
            chrome.bookmarks.move(String(id), dest, (res) => {
              const err = chrome.runtime && chrome.runtime.lastError;
              if (err) reject(new Error(err.message || String(err)));
              else resolve(res);
            });
          } catch (e) {
            reject(e);
          }
        }),
    };

    this._loadFromChromeBookmarks = async () => {
      if (!this._chromeAvailable) {
        this.updateStatus?.(
          'Chrome bookmarks API not available in this context.',
          'bad'
        );
        return;
      }

      this.updateStatus?.('Loading live Chrome bookmarks…');
      try {
        const tree = await this._chrome.getTree();
        this.data = this._fromChromeTreeToData(tree);
        this.longUrls = {};

        this._primeOpenState?.();
        this._renderTree?.();

        const st = this._computeStats?.(this.data);
        this._renderStats?.(st);

        this.updateStatus?.('Loaded live Chrome bookmarks.', 'good');
      } catch (e) {
        console.error(e);
        this.updateStatus?.(
          `Failed to load Chrome bookmarks: ${
            e && e.message ? e.message : String(e)
          }`,
          'bad'
        );
      }
    };

    this._refreshFromChrome = async () => {
      return this._loadFromChromeBookmarks();
    };
  }

  _openAdvancedActions() {
    if (!this._actionsDialog)
      this._actionsDialog = new BookMarksOrganizerActionsDialog();
    try {
      this._actionsDialog.open(this);
    } catch (e) {
      console.error(e);
      this.updateStatus(
        `Could not open Advanced Actions: ${
          e && e.message ? e.message : String(e)
        }`,
        'bad'
      );
    }
  }

  _norm(s) {
    return this.treeOps.norm(s);
  }

  _isFolder(n) {
    return this.treeOps.isFolder(n);
  }

  _fromChromeTreeToData(treeArr) {
    return this.treeOps.fromChromeTreeToData(treeArr);
  }

  _applyThemeVars() {
    return this.ui.applyThemeVars();
  }

  _setTheme(name) {
    return this.ui.setTheme(name);
  }

  _isMatch(node) {
    return this.treeOps.isMatch(node);
  }

  _subtreeHasMatch(node) {
    return this.treeOps.subtreeHasMatch(node);
  }

  _showContextMenu(e, node, parentRef) {
    return this.ui.showContextMenu(e, node, parentRef);
  }

  _closeContextMenu() {
    return this.ui.closeContextMenu();
  }

  _startRename(node) {
    return this.mutations.startRename(node);
  }

  _cancelRename() {
    return this.mutations.cancelRename();
  }

  _saveRename(node, newName) {
    return this.mutations.saveRename(node, newName);
  }

  _startMove(node) {
    return this.mutations.startMove(node);
  }

  _cancelMove() {
    return this.mutations.cancelMove();
  }

  _completeMove(targetFolderNode) {
    return this.mutations.completeMove(targetFolderNode);
  }

  _scanDuplicates() {
    return this.mutations.scanDuplicates();
  }

  scanForReview(mode) {
    return this.mutations.scanForReview(mode);
  }

  _saveFolderState() {
    if (!chrome.storage || !chrome.storage.local) return;
    const json = JSON.stringify(Array.from(this._folderOpenState.entries()));
    chrome.storage.local.set({ bmo_folderState: json });
  }

  _cleanFolderState() {
    // Removes keys from _folderOpenState that no longer exist in this.data
    if (!this.data) return;

    const validKeys = new Set();
    const walk = (n) => {
      validKeys.add(this._nodeKey(n));
      if (n.children) n.children.forEach(walk);
    };
    (this.data.bookmarks || []).forEach(walk);

    let changed = false;
    for (const key of this._folderOpenState.keys()) {
      if (!validKeys.has(key)) {
        this._folderOpenState.delete(key);
        changed = true;
      }
    }

    if (changed) this._saveFolderState();
  }

  _refreshFromChrome() {
    // Overridden to include state cleanup
    return this._loadFromChromeBookmarks().then(() => {
      this._cleanFolderState();
    });
  }

  async _activateBookmark(node) {
    return this.activeItem.activateBookmark(node);
  }

  async _animateActiveBookmark(id) {
    return this.activeItem.animateActiveBookmark(id);
  }

  async ensureToolbarId() {
    return this.activeItem.ensureToolbarId();
  }

  deleteBookmarksBulk(ids) {
    return this.mutations.deleteBookmarksBulk(ids);
  }

  async _ensureSingleActiveBookmark() {
    return this.activeItem.ensureSingleActiveBookmark();
  }

  async _updateActiveBookmarkAnimation() {
    return this.activeItem.updateActiveBookmarkAnimation();
  }

  startActiveBookmarkAnimation() {
    return this.activeItem.startActiveBookmarkAnimation();
  }

  async _stabilizeActiveBookmark() {
    return this.activeItem.stabilizeActiveBookmark();
  }

  async _tickActiveBookmark() {
    return this.activeItem.tickActiveBookmark();
  }

  async _restoreBookmark(id, originalName, originalParentId) {
    return this.activeItem.restoreBookmark(id, originalName, originalParentId);
  }

  _toggleVault() {
    return this.io.toggleVault();
  }

  exportBookmarks() {
    return this.io.exportBookmarks();
  }

  importBookmarks() {
    return this.io.importBookmarks();
  }

}

