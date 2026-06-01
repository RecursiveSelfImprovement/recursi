class FloatingPanelHost {
  constructor(options = {}) {
      this.options = options || {};
      this.app = this.options.app || window._dev_projectEditorInstance || window.app || null;
      this.mode = this.options.mode || 'tree';
      this.title = this.options.title || 'Floating Panel';
      this.rootId = this.options.rootId || null;
      this.store = this.options.store || null;
      this.projectName =
        this.options.projectName ||
        (this.rootId ? this.rootId.replace(/^\//, '') : 'floating');
      this.projectFilesManager =
        this.options.projectFilesManager || this.app?.projectFilesManager || null;
      
      // Auto-assign deterministic state ID based on the folder name so it remembers its position!
      const safeId = (this.rootId || 'unknown').replace(/[^a-zA-Z0-9]/g, '-');
      this.stateId = this.options.stateId || ('vibes-tree-' + safeId);

      this.dialog = null;
      this.wrapper = null;
      this.contentElement = null;
      this.toolbarElement = null;
      this.statusElement = null;
      this.treeContainer = null;
      this.treeView = null;
      this.treeData = null;
      this.metadata = null;
      this.isInitialized = false;
    }

  open() {
      if (this.isOpen()) {
        this.bringToFront();
        this._ensureTreeContainerVisible();
        this.onResize();
        return this;
      }

      this.init(); 

      const openTrees = document.querySelectorAll('.floating-panel-host').length;
      const startX = Math.floor(window.innerWidth * 0.55); 
      const startY = 80;
      const cascadeX = startX + openTrees * 35;
      const cascadeY = startY + openTrees * 35;

      this.dialog = UITools.makeDialog({
        title: this.title,
        contentElement: this.wrapper,
        customHeaderControls: this.searchWrapper,
        size: this.options.size || [480, 600],
        position: this.options.position || [cascadeX, cascadeY],
        noPadding: true,
        stateId: this.stateId,
        onResize: (width, height) => {
          this.onResize(width, height);
        },
        onClose: () => {
          this.close(false);
        },
      });

      let subtitle = 'Local Directory';
      if (!this.store) subtitle = 'Memory';
      if (this.dialog.setSubtitle) this.dialog.setSubtitle(subtitle);

      this._ensureTreeContainerVisible();
      this.onResize();

      requestAnimationFrame(() => {
        this._ensureTreeContainerVisible();
        this.treeView?.calculateLayout?.();
        this.treeView?.redrawLines?.();
        this.onResize();
        this._saveWorkspaceState();
      });

      return this;
    }

  init() {
    if (this.isInitialized) return this;

    this._validateDependencies();
    this._installStyles();
    this._installFloatingPanelLayoutStyles?.();

    this.wrapper = this._buildWrapper();

    if (this.mode === 'tree') {
      this._buildTreeContent();
    } else {
      throw new Error('FloatingPanelHost unsupported mode: ' + this.mode);
    }

    this.isInitialized = true;
    return this;
  }

  close(closeDialog = true) {
      if (this.treeView && this.projectFilesManager?.unregisterFileTreeView) {
        this.projectFilesManager.unregisterFileTreeView(this.treeView);
      }

      if (this.treeView?.hideContextMenu) {
        try {
          this.treeView.hideContextMenu();
        } catch (error) {}
      }

      if (closeDialog && this.dialog?.close) {
        const dialog = this.dialog;
        this.dialog = null;
        dialog.close();
      } else {
        this.dialog = null;
      }

      this.options.onClose?.(this);
      setTimeout(() => this._saveWorkspaceState(), 100); // ADDED STATE SAVE (delayed to let map update)
      return true;
    }

  bringToFront() {
    if (this.dialog?.setZOnTop) {
      this.dialog.setZOnTop();
    }
    return this;
  }

  isOpen() {
    return !!(
      this.dialog &&
      (this.dialog.element?.isConnected ||
        this.wrapper?.isConnected ||
        this.contentElement?.isConnected)
    );
  }

  async refresh() {
    this._ensureTreeContainerVisible();
    this._setStatus('Refreshing...');

    if (this.store) {
      if (typeof this.store.scan === 'function') {
        try {
          await this.store.scan();
        } catch (e) {}
      } else if (
        typeof this.store._scanDirectory === 'function' &&
        this.store._handle
      ) {
        try {
          if (this.store._cache) this.store._cache.clear();
          await this.store._scanDirectory(
            this.store._handle,
            `/${this.store._projectName}`
          );
        } catch (e) {}
      }

      if (typeof this.store.refresh === 'function') {
        try {
          await this.store.refresh();
        } catch (e) {}
      }
    }

    if (this.projectFilesManager?.reloadMetadata) {
      try {
        await this.projectFilesManager.reloadMetadata();
      } catch (e) {}
    }

    if (
      this.projectFilesManager &&
      typeof this.projectFilesManager._externalStoreToFileTreeData ===
        'function'
    ) {
      const rebuilt = this.projectFilesManager._externalStoreToFileTreeData(
        this.rootId,
        this.store
      );
      this.treeData = rebuilt.treeData;
      this.metadata = rebuilt.metadata;
    }

    return this._renderTree();
  }

  onResize(width = null, height = null) {
    this._ensureTreeContainerVisible();

    if (this.treeView?.redrawLines) {
      this.treeView.redrawLines();
    }

    if (this.treeView?.checkActiveNodeVisibility) {
      this.treeView.checkActiveNodeVisibility();
    }

    if (this.app?.visibilityManager?.notify) {
      this.app.visibilityManager.notify();
    }

    return { width, height };
  }

  _validateDependencies() {
    if (typeof UITools === 'undefined') {
      throw new Error('FloatingPanelHost requires UITools.');
    }

    if (this.mode === 'tree' && typeof FileTreeView !== 'function') {
      throw new Error('FloatingPanelHost tree mode requires FileTreeView.');
    }

    if (this.mode === 'tree' && !this.projectFilesManager) {
      throw new Error(
        'FloatingPanelHost tree mode requires projectFilesManager.'
      );
    }

    if (this.mode === 'tree' && !this.rootId) {
      throw new Error('FloatingPanelHost tree mode requires rootId.');
    }

    if (this.mode === 'tree' && !this.store) {
      throw new Error('FloatingPanelHost tree mode requires store.');
    }
  }

  _buildWrapper() {
    return makeElement('div', {
      className: 'floating-panel-host floating-panel-host-' + this.mode,
      style: {
        height: '100%',
        minHeight: '0',
        width: '100%',
        minWidth: '0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0d1117',
        color: '#c9d1d9',
      },
    });
  }

  _buildTreeContent() {
    this.toolbarElement = this._buildTreeToolbar();

    this.treeContainer = makeElement('div', {
      className: 'tree-view-container floating-panel-tree-container',
      style: {
        display: 'block',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        flex: '1 1 auto',
        minHeight: '120px',
        width: '100%',
        background: 'rgba(5, 8, 16, 0.62)',
      },
    });

    const parent = this.contentElement || this.wrapper;

    if (!parent || typeof parent.appendChild !== 'function') {
      throw new Error(
        'FloatingPanelHost._buildTreeContent requires wrapper/contentElement before building tree content.'
      );
    }

    parent.appendChild(this.toolbarElement);
    parent.appendChild(this.treeContainer);

    this._createTreeView();
    this._refreshTree();

    return this.treeContainer;
  }

  _buildTreeToolbar() {
      this.visExpanded = false;
      this.paintMode = false;
      this.paintAction = null;
      this.paintSegments = { code: true, sig: true, docs: true };
      this.currentVisSet = null;
      this.visSetModified = false;

      this.searchInput = this._createTreeSearchInput();
      Object.assign(this.searchInput.style, {
        margin: '0',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: '11px',
        height: '22px',
        width: '100%',
        minWidth: '120px',
        maxWidth: '200px',
      });

      this.searchInput.addEventListener('mousedown', (e) => e.stopPropagation());
      this.searchInput.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      this.searchInput.addEventListener('dblclick', (e) => e.stopPropagation());

      this.searchWrapper = document.createElement('div');
      
      this.searchWrapper.className = 'fp-search-wrapper';
      Object.assign(this.searchWrapper.style, {
        display: 'flex',
        alignItems: 'center',
        margin: '0 8px 0 auto',
        flex: '0 1 auto', 
        justifyContent: 'flex-end',
      });
      this.searchWrapper.appendChild(this.searchInput);

      const toolbar = document.createElement('div');
      toolbar.className = 'floating-panel-tree-toolbar';
      Object.assign(toolbar.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '6px 8px',
        borderBottom: '1px solid rgba(130, 180, 255, 0.15)',
        background: 'rgba(10, 14, 22, 0.95)',
        flex: '0 0 auto',
      });

      this.topRow = document.createElement('div');
      Object.assign(this.topRow.style, {
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
        width: '100%',
        flexWrap: 'nowrap',
      });

      this.expandedRow = document.createElement('div');
      Object.assign(this.expandedRow.style, {
        display: 'none',
        gap: '6px',
        alignItems: 'center',
        width: '100%',
        flexWrap: 'wrap',
        paddingTop: '6px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      });

      const btnRefresh = this._makeCompactBtn('↻', 'Refresh Tree', () => this.refresh());
      const btnWalker = this._makeCompactBtn('🌲', 'Walker', () => {
        if (typeof this._openAttachedTreeWalker === 'function') {
          this._openAttachedTreeWalker();
        } else if (typeof TreeWalkerDialog !== 'undefined') {
          const walker = new TreeWalkerDialog(this.app);
          walker.attachToSourceTree({
            sourceTreeView: this.treeView,
            rootPath: this.rootId,
            launchPath: this.rootId,
          });
          walker.show();
        }
      });

      const spacer = document.createElement('div');
      spacer.style.flex = '1';

      this.visSetSelect = document.createElement('select');
      Object.assign(this.visSetSelect.style, {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#eef3ff',
        borderRadius: '6px',
        padding: '3px 6px',
        fontSize: '11px',
        outline: 'none',
        flex: '0 1 auto',
        minWidth: '120px',
        maxWidth: '250px',
        cursor: 'pointer',
        textOverflow: 'ellipsis',
        display: 'none',
      });
      this.visSetSelect.onchange = () => this._onVisSetChange();

      this.btnSaveSet = this._makeCompactBtn('💾', 'Save Set', () => this._saveVisSet());
      this.btnSaveSet.style.display = 'none';

      this.btnDeleteSet = this._makeCompactBtn('🗑️', 'Delete Set', () => this._deleteVisSet());
      this.btnDeleteSet.style.display = 'none';

      this.btnConvertLocal = this._makeCompactBtn('📁⬇️', 'Convert to Local Directory', () => {
        this.app.actionHandler.handleConvertToLocalDirectory(this.projectName);
      });
      this.btnConvertLocal.style.display = this.app.uiManager.uiMode === 'indexeddb' ? 'inline-flex' : 'none';

      this.btnVisToggle = this._makeCompactBtn('👁️', 'Toggle Visibility Tools', () => this._toggleVisExpanded());

      this.statusElement = document.createElement('div');
      Object.assign(this.statusElement.style, { display: 'none' });

      this.topRow.append(
        btnRefresh,
        btnWalker,
        spacer,
        this.visSetSelect,
        this.btnSaveSet,
        this.btnDeleteSet,
        this.btnConvertLocal,
        this.btnVisToggle,
        this.statusElement
      );

      const paintWrap = document.createElement('div');
      Object.assign(paintWrap.style, { display: 'flex', gap: '4px', alignItems: 'center' });

      const paintLabel = document.createElement('span');
      paintLabel.textContent = 'Paint:';
      paintLabel.style.cssText = 'font-size: 11px; opacity: 0.6; font-weight: bold; margin-right: 2px;';

      this.btnPaintAdd = this._makeCompactBtn('🖌️', 'Paint Add', () => this._setPaintAction('add'));
      this.btnPaintSub = this._makeCompactBtn('🧽', 'Paint Remove', () => this._setPaintAction('subtract'));
      this.btnPaintStop = this._makeCompactBtn('🛑', 'Stop Painting', () => this._setPaintAction(null));

      const makeDot = (color) => `<div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}80;display:inline-block;margin-right:3px;vertical-align:middle;"></div>`;

      this.btnPaintCode = this._makeCompactBtn(makeDot('#0088ff') + 'C', 'Toggle Code Painting', () => this._togglePaintSegment('code'), true);
      this.btnPaintSig = this._makeCompactBtn(makeDot('#d98e48') + 'S', 'Toggle Signature Painting', () => this._togglePaintSegment('sig'), true);
      this.btnPaintDocs = this._makeCompactBtn(makeDot('#8433ff') + 'D', 'Toggle Docs Painting', () => this._togglePaintSegment('docs'), true);

      const makeDiv = () => {
        const d = document.createElement('div');
        d.style.cssText = 'width: 1px; height: 14px; background: rgba(255,255,255,0.1); margin: 0 2px;';
        return d;
      };

      paintWrap.append(paintLabel, this.btnPaintAdd, this.btnPaintSub, this.btnPaintStop, makeDiv(), this.btnPaintCode, this.btnPaintSig, this.btnPaintDocs);

      const bulkWrap = document.createElement('div');
      Object.assign(bulkWrap.style, { display: 'flex', gap: '4px', alignItems: 'center', marginLeft: 'auto' });

      const bulkLabel = document.createElement('span');
      bulkLabel.textContent = 'Bulk:';
      bulkLabel.style.cssText = 'font-size: 11px; opacity: 0.6; font-weight: bold; margin-right: 2px;';

      const btnBulkCode = this._makeCompactBtn('+C', 'Select All Code', () => this.treeView?._handleTreeBulk(true, 'code'));
      btnBulkCode.style.color = '#88ccff';
      const btnBulkSig = this._makeCompactBtn('+S', 'Select All Signatures', () => this.treeView?._handleTreeBulk(true, 'signatures'));
      btnBulkSig.style.color = '#ffcc88';
      const btnBulkDocs = this._makeCompactBtn('+D', 'Select All Docs', () => this.treeView?._handleTreeBulk(true, 'docs'));
      btnBulkDocs.style.color = '#cc88ff';
      const btnBulkClear = this._makeCompactBtn('✕', 'Clear All Visibility', () => this.treeView?._handleTreeBulk(false, 'all'));
      btnBulkClear.style.color = '#ff8888';

      bulkWrap.append(bulkLabel, btnBulkCode, btnBulkSig, btnBulkDocs, makeDiv(), btnBulkClear);

      this.expandedRow.append(paintWrap, bulkWrap);
      toolbar.append(this.topRow, this.expandedRow);

      this.treeWalkerToolbarStatus = document.createElement('div');
      this.treeWalkerToolbarStatus.className = 'floating-panel-treewalker-status';
      Object.assign(this.treeWalkerToolbarStatus.style, { width: '100%', display: 'none', color: '#9fb2d9', fontSize: '10px', padding: '2px', opacity: '0.8' });
      toolbar.appendChild(this.treeWalkerToolbarStatus);

      this._updateToolbarUI();
      setTimeout(() => this._loadVisSets(), 500);

      return toolbar;
    }

  _createTreeSearchInput() {
    return makeElement('input', {
      type: 'text',
      placeholder: '🔍 Filter files...',
      spellcheck: 'false',
      className: 'floating-panel-tree-search',
      style: {
        background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#E3F2FD',
        borderRadius: '6px',
        padding: '5px 10px',
        fontSize: '12px',
        outline: 'none',
        marginLeft: 'auto',
        width: '130px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
      },
      onfocus: (event) => {
        event.target.style.width = '180px';
        event.target.style.borderColor = '#64B5F6';
        event.target.style.background = 'rgba(0, 0, 0, 0.4)';
      },
      onblur: (event) => {
        if (!event.target.value) {
          event.target.style.width = '130px';
          event.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          event.target.style.background = 'rgba(0, 0, 0, 0.25)';
        }
      },
      oninput: (event) => {
        this._applyTreeFilter(event.target.value);
      },
    });
  }

  _createTreeView() {
    this.treeView = new FileTreeView(this.treeContainer, {
      app: this.app,
      projectName: this.projectName,
      appearanceManager: this.app?.appearanceManager,
      onFileSelect: (nodeInfo) => {
        const path = this._pathFromTreeNodeInfo(nodeInfo);
        if (typeof this.options.onFileSelect === 'function') {
          this.options.onFileSelect(path, nodeInfo, this);
        }
      },
      onRunHtmlFile: (path) => {
        if (typeof this.options.onRunHtmlFile === 'function') {
          this.options.onRunHtmlFile(path, this);
        }
      },
      onVisibilityChange: (node, reason) => {
        if (this.projectFilesManager?.onVisibilityChange) {
          this.projectFilesManager.onVisibilityChange(
            node,
            reason || 'floating-panel-tree',
            this.treeView
          );
        }
      },
      onNodeVisibilityChange: (node, isVisible) => {
        if (typeof this.options.onNodeVisibilityChange === 'function') {
          this.options.onNodeVisibilityChange(node, isVisible, this);
        }
      },
    });

    this.treeView.store = this.store;
    this.treeView.fileStore = this.store;
    this.treeView.rootId = this.rootId;
    this.treeView.workspaceRootId = this.rootId;
    this.treeView.browserBacked = !!this.store;
    this.treeView.projectFilesManager = this.projectFilesManager;
    this.treeView.floatingPanelHost = this;

    return this.treeView;
  }

  async _refreshTree() {
      this._ensureTreeContainerVisible();

      const rebuilt = this.projectFilesManager._externalStoreToFileTreeData(
        this.rootId,
        this.store
      );

      this.treeData = rebuilt.treeData;
      this.metadata = rebuilt.metadata;

      this._ensureTreeContainerVisible();

      const maybePromise = this.treeView.setData([this.treeData], this.metadata);

      const finishRefresh = () => {
        this._ensureTreeContainerVisible();
        this._setStatus(
          this.rootId + ' - ' + Object.keys(this.metadata || {}).length + ' files'
        );
        this.onResize();

        requestAnimationFrame(() => {
          this._ensureTreeContainerVisible();
          this.treeView?.calculateLayout?.();
          this.treeView?.redrawLines?.();
        });
        
        this._checkFilesJsonAndInjectRun();
      };

      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise
          .then(() => finishRefresh())
          .catch((error) => {
            this._ensureTreeContainerVisible();
            this._setStatus('refresh failed');
            console.error('[FloatingPanelHost] tree refresh failed:', error);
          });
      } else {
        finishRefresh();
      }

      return true;
    }

  _applyTreeFilter(value) {
    if (!this.treeView) return false;
    const term = String(value || '')
      .toLowerCase()
      .trim();
    this.treeView.applyFilter(term);
    return true;
  }

  _pathFromTreeNodeInfo(nodeInfo) {
    if (!nodeInfo) return null;
    if (typeof nodeInfo === 'string') return nodeInfo;

    return (
      nodeInfo.id ||
      nodeInfo.path ||
      nodeInfo.filePath ||
      nodeInfo.goldenPath ||
      nodeInfo.node?.id ||
      nodeInfo.node?.path ||
      nodeInfo.data?.id ||
      nodeInfo.data?.path ||
      null
    );
  }

  _makeToolbarButton(options = {}) {
    const button = makeElement('button', {
      title: options.title || '',
      className: 'floating-panel-toolbar-button',
      style: {
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid color-mix(in srgb, currentColor 34%, transparent)',
        color: options.color || '#dfe8ff',
        cursor: 'pointer',
        padding: '5px 8px',
        minHeight: '28px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '9px',
        transition:
          'background-color 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, transform 0.16s ease',
        boxShadow: '0 0 12px rgba(120, 180, 255, 0.08)',
        fontWeight: '700',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        lineHeight: '1',
      },
      onmouseover: (event) => {
        event.currentTarget.style.background = 'rgba(255,255,255,0.085)';
        event.currentTarget.style.borderColor =
          'color-mix(in srgb, currentColor 58%, transparent)';
        event.currentTarget.style.boxShadow =
          '0 0 18px color-mix(in srgb, currentColor 28%, transparent)';
        event.currentTarget.style.transform = 'translateY(-1px)';
      },
      onmouseout: (event) => {
        event.currentTarget.style.background = 'rgba(255,255,255,0.045)';
        event.currentTarget.style.borderColor =
          'color-mix(in srgb, currentColor 34%, transparent)';
        event.currentTarget.style.boxShadow =
          '0 0 12px rgba(120, 180, 255, 0.08)';
        event.currentTarget.style.transform = 'translateY(0)';
      },
      onclick: options.onclick || (() => {}),
    });

    if (options.html) {
      button.innerHTML = options.html;
    } else {
      button.textContent = options.label || '?';
    }

    return button;
  }

  _setStatus(text) {
    if (this.statusElement) {
      this.statusElement.textContent = text;
      this.statusElement.title = text;
    }
  }

  _installStyles() {
    const cssId = 'FloatingPanelHostStyles';
    const old = document.getElementById(cssId);
    if (old) old.remove();

    const style = document.createElement('style');
    style.id = cssId;
    document.head.appendChild(style);

    style.textContent = `
      .floating-panel-host {
        box-sizing: border-box;
        height: 100%;
        min-height: 0;
        width: 100%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: rgba(9, 12, 20, 0.94);
      }

      .floating-panel-host * {
        box-sizing: border-box;
      }

      .floating-panel-host .dialog-content {
        padding: 0 !important;
      }

      .floating-panel-tree-content {
        height: 100%;
        min-height: 0;
        width: 100%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .floating-panel-host .floating-panel-tree-container {
        min-height: 0 !important;
        min-width: 0 !important;
        overflow-x: clip !important;
        overflow-y: auto !important;
        padding: 10px 4px 24px 4px !important;
        box-sizing: border-box !important;
        background: rgba(7, 10, 16, 0.46) !important;
      }

      .floating-panel-host .floating-panel-tree-container .file-tree {
        width: 100% !important;
        min-width: 0 !important;
        overflow: visible !important;
      }

      .floating-panel-host .floating-panel-tree-container .tree-node {
        padding-right: 6px !important;
        min-width: 0 !important;
        overflow: visible !important;
        box-sizing: border-box !important;
      }

      .floating-panel-host .floating-panel-tree-container .node-toggle {
        flex: 0 0 auto !important;
      }

      .floating-panel-host .floating-panel-tree-container .tree-node-content {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        flex: 1 1 auto !important;
        border: 1px solid transparent !important;
      }

      .floating-panel-host .floating-panel-tree-container .node-icon {
        margin-left: 2px !important;
        margin-right: 6px !important;
        flex: 0 0 auto !important;
      }

      .floating-panel-host .floating-panel-tree-container .node-name {
        flex: 1 1 auto !important;
        min-width: 40px !important;
        max-width: none !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .floating-panel-host .floating-panel-tree-container .node-actions {
        flex: 0 0 auto !important;
        width: auto !important;
        min-width: 0 !important;
        margin-left: 6px !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 4px !important;
        overflow: visible !important;
      }

      .floating-panel-host .floating-panel-tree-container .visibility-widget-container {
        flex: 0 0 auto !important;
        width: auto !important;
        min-width: 0 !important;
        display: flex !important;
        align-items: center !important;
        overflow: visible !important;
      }

      .floating-panel-host .floating-panel-tree-container .visibility-widget-container svg,
      .floating-panel-host .floating-panel-tree-container .visibility-widget-svg {
        flex: 0 0 auto !important;
        display: block !important;
        overflow: visible !important;
      }

      .floating-panel-host .file-tree,
      .floating-panel-host .tree-node,
      .floating-panel-host .tree-node-content,
      .floating-panel-host .node-actions,
      .floating-panel-host .visibility-widget-container {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }

      .floating-panel-host .tree-node-content:hover {
        background-color: rgba(255,255,255,0.055) !important;
        border-color: rgba(160, 200, 255, 0.12) !important;
      }

      .floating-panel-tree-search {
        justify-self: stretch;
      }

      .treewalker-breakpoint-pick-active .floating-panel-tree-container {
        outline: 1px solid rgba(255, 183, 239, 0.40);
        box-shadow: inset 0 0 24px rgba(255, 120, 220, 0.06);
      }
    `;
  }

  _installFloatingPanelLayoutStyles() {
    // Consolidated into _installStyles — remove old block
    const old = document.getElementById('vibes-floating-panel-host-layout-fix');
    if (old) old.remove();
    return true;
  }

  async _copySelectedContext() {
    if (!this.treeView) return;

    this._setStatus('Gathering files...');
    const selectedFiles = [];
    const nodes = Array.from(this.treeView.nodesMap.values());

    for (const node of nodes) {
      if (node.type !== 'file' || !node.visibilityWidget) continue;
      const state = node.visibilityWidget.state;
      if (state.code || state.signatures || state.docsLevel > 0) {
        selectedFiles.push({ path: node.id, state });
      }
    }

    if (selectedFiles.length === 0) {
      this._setStatus('Nothing selected to copy.');
      return;
    }

    let promptText = '// Context from ' + this.projectName + '\n\n';

    const fetchContent = async (f) => {
      let codeContent = null;
      let docContent = null;
      const isExternal = !!this.store;

      if (f.state.code || f.state.signatures) {
        if (isExternal && typeof this.store.get === 'function') {
          codeContent = await Promise.resolve(this.store.get(f.path));
        } else if (this.app?.commands?.fetchFileContentForApp) {
          try {
            const res = await this.app.commands.fetchFileContentForApp(
              this.app.createPath(f.path),
              ['code']
            );
            codeContent = res.code;
          } catch (e) {}
        }
      }

      if (f.state.docsLevel > 0) {
        let docPath = null;
        if (this.app?.projectFilesManager?._getDocPathForSource) {
          docPath = this.app.projectFilesManager._getDocPathForSource(
            f.path,
            this.projectName
          );
        }
        if (!docPath) {
          const slashIdx = f.path.lastIndexOf('/');
          const dir = slashIdx >= 0 ? f.path.slice(0, slashIdx) : '';
          const name = slashIdx >= 0 ? f.path.slice(slashIdx + 1) : f.path;
          docPath = dir + '/' + name.replace(/\./g, '_') + '.md';
        }

        if (isExternal && typeof this.store.get === 'function') {
          docContent = await Promise.resolve(this.store.get(docPath));
        } else if (this.app?.commands?.fetchFileContentForApp) {
          try {
            const res = await this.app.commands.fetchFileContentForApp(
              this.app.createPath(docPath),
              ['code']
            );
            docContent = res.code;
          } catch (e) {}
        }
      }

      return { codeContent, docContent };
    };

    const processFiles = async () => {
      for (const f of selectedFiles.sort((a, b) =>
        a.path.localeCompare(b.path)
      )) {
        const { codeContent, docContent } = await fetchContent(f);
        const parts = [];

        if (f.state.signatures && codeContent) {
          let sigText = '';
          if (this.app?.codeParser?.parseForMetadata) {
            try {
              const meta = this.app.codeParser.parseForMetadata(
                codeContent,
                f.path
              );
              const members = this.app.codeParser
                .getMemberDetails(codeContent)
                .filter((m) => m.isPublic)
                .map((m) => m.signature);

              sigText += '// --- IMPORTS ---\n';
              if (meta.imports && meta.imports.length > 0) {
                sigText += meta.imports
                  .map((imp) => {
                    const symbol =
                      imp.kind === 'default'
                        ? imp.local
                        : '{ ' + imp.imported + ' }';
                    return 'import ' + symbol + " from '" + imp.source + "';";
                  })
                  .join('\n');
              } else {
                sigText += '// (No imports)';
              }
              sigText += '\n\n// --- EXPORT ---\n';
              if (meta.mainExport)
                sigText += 'export class ' + meta.mainExport.name;
              else sigText += '// (No main export found)';
              sigText += '\n\n// --- MEMBERS ---\n';
              sigText +=
                members.length > 0
                  ? members.join('\n')
                  : '// (No public members found)';

              if (f.state.code) {
                const cleanBody = this.app.codeParser.generateCleanBody(
                  codeContent,
                  meta
                );
                parts.push(
                  '// Condensed View\n' +
                    '`' +
                    '`' +
                    '`javascript\n' +
                    sigText +
                    '\n' +
                    '`' +
                    '`' +
                    '`'
                );
                parts.push(
                  '// Code (Body Only)\n' +
                    '`' +
                    '`' +
                    '`javascript\n' +
                    cleanBody.trim() +
                    '\n' +
                    '`' +
                    '`' +
                    '`'
                );
              } else {
                parts.push(
                  '// Condensed View\n' +
                    '`' +
                    '`' +
                    '`javascript\n' +
                    sigText +
                    '\n' +
                    '`' +
                    '`' +
                    '`'
                );
              }
            } catch (e) {}
          }
          if (parts.length === 0) {
            parts.push(
              '// Signatures\n' +
                '`' +
                '`' +
                '`javascript\n// (AST Parsing unavailable)\n' +
                '`' +
                '`' +
                '`'
            );
          }
        } else if (f.state.code && codeContent) {
          parts.push(
            '// Full File\n' +
              '`' +
              '`' +
              '`javascript\n' +
              codeContent.trim() +
              '\n' +
              '`' +
              '`' +
              '`'
          );
        }

        if (f.state.docsLevel > 0 && docContent) {
          const pct = f.state.docsLevel * 25;
          const lines = (docContent || '').split('\n');
          const truncated = lines
            .slice(0, Math.ceil(lines.length * (pct / 100)))
            .join('\n')
            .trim();
          if (truncated)
            parts.push(
              '// Documentation (' +
                pct +
                '%)\n' +
                '`' +
                '`' +
                '`markdown\n' +
                truncated +
                '\n' +
                '`' +
                '`' +
                '`'
            );
        }

        if (parts.length > 0) {
          promptText += '// ' + f.path + '\n' + parts.join('\n\n') + '\n\n';
        }
      }
    };

    await processFiles();

    try {
      if (this.app?.clipboardSink?.receive) {
        this.app.clipboardSink.receive(promptText.trim());
        this._setStatus(
          'Pushed ' + selectedFiles.length + ' file(s) to AI agent!'
        );
      } else {
        await navigator.clipboard.writeText(promptText.trim());
        this._setStatus(
          'Copied ' + selectedFiles.length + ' file(s) to clipboard.'
        );
      }
    } catch (e) {
      this._setStatus('Copy failed: ' + e.message);
    }
  }

  _openAttachedTreeWalker() {
      if (typeof TreeWalkerDialog !== 'undefined') {
        const rootPath = this.rootId || '/';
        const walker = new TreeWalkerDialog(this.app);
        walker.attachToSourceTree({
          sourceTreeView: this.treeView,
          rootPath: rootPath,
          launchPath: rootPath
        });
        walker.show();
        if (typeof this._setTreeWalkerToolbarStatus === 'function') {
          this._setTreeWalkerToolbarStatus('Walker opened.');
        }
      } else {
        this.app?.uiManager?.setStatus('TreeWalkerDialog not loaded.', true);
      }
    }

  _setTreeWalkerToolbarStatus(text) {
    if (!this.treeWalkerToolbarStatus) return false;

    this.treeWalkerToolbarStatus.textContent = String(text || '');
    this.treeWalkerToolbarStatus.style.display = text ? 'block' : 'none';

    clearTimeout(this._treeWalkerToolbarStatusTimer);
    if (text) {
      this._treeWalkerToolbarStatusTimer = setTimeout(() => {
        if (this.treeWalkerToolbarStatus) {
          this.treeWalkerToolbarStatus.style.display = 'none';
        }
      }, 2400);
    }

    return true;
  }

  _closeAttachedTreeWalker() {
    if (this.walkerPaneElement) {
      this.walkerPaneElement.style.display = 'none';
      this.walkerPaneElement.textContent = '';
    }

    if (this._attachedTreeWalkerDialog) {
      this._attachedTreeWalkerDialog._handleStop?.();
      this._attachedTreeWalkerDialog._mountHost = null;
    }

    this._resizeJoinedTreeWalker();
    this._setTreeWalkerToolbarStatus('Walker hidden');
    return true;
  }

  _resizeJoinedTreeWalker() {
    if (this.treeView?.redrawLines) {
      setTimeout(() => this.treeView.redrawLines(), 40);
    }

    if (this.app?.visibilityManager?.notify) {
      this.app.visibilityManager.notify();
    }

    return true;
  }

  _renderTree() {
    this._ensureTreeContainerVisible();

    if (!this.treeView) {
      return { ok: false, reason: 'missing treeView' };
    }

    if (this.treeData) {
      const dataArray = Array.isArray(this.treeData)
        ? this.treeData
        : [this.treeData];
      const maybePromise = this.treeView.setData(dataArray, this.metadata);

      const finishRefresh = () => {
        this._ensureTreeContainerVisible();
        this._setStatus(
          this.rootId +
            ' - ' +
            Object.keys(this.metadata || {}).length +
            ' files'
        );
        this.onResize();

        requestAnimationFrame(() => {
          this._ensureTreeContainerVisible();
          this.treeView?.calculateLayout?.();
          this.treeView?.redrawLines?.();
        });
      };

      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise
          .then(() => finishRefresh())
          .catch((e) => {
            console.error('[FloatingPanelHost] tree render failed:', e);
            this._ensureTreeContainerVisible();
          });
      } else {
        finishRefresh();
      }
    }

    return { ok: true, rootId: this.rootId || null };
  }

  _ensureTreeContainerVisible() {
    const container =
      this.treeContainer ||
      this.treeElement ||
      this.contentElement?.querySelector?.('.floating-panel-tree-container') ||
      this.contentElement?.querySelector?.('.tree-view-container');

    if (!container) {
      return {
        ok: false,
        reason: 'no tree container',
      };
    }

    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.position = container.style.position || 'relative';
    container.style.overflowX = 'hidden';
    container.style.overflowY = 'auto';
    container.style.minHeight = container.style.minHeight || '120px';
    container.style.flex = container.style.flex || '1 1 auto';

    const parent = container.parentElement;
    if (parent) {
      const parentStyle = getComputedStyle(parent);
      if (parentStyle.display === 'none') {
        parent.style.display = 'flex';
      }
      if (!parent.style.minHeight) {
        parent.style.minHeight = '0';
      }
    }

    return {
      ok: true,
      display: container.style.display,
      className: container.className,
    };
  }

  _toggleVisExpanded() {
    this.visExpanded = !this.visExpanded;
    this._updateToolbarUI();
    this.onResize();
  }

  _updateToolbarUI() {
    const activeBg = 'rgba(100, 150, 255, 0.25)';
    const activeBorder = 'rgba(100, 180, 255, 0.5)';
    const inactiveBg = 'rgba(255,255,255,0.06)';
    const inactiveBorder = 'rgba(255,255,255,0.1)';

    const setBtnState = (btn, active) => {
      if (!btn) return;
      btn.dataset.active = active ? 'true' : 'false';
      btn.style.background = active ? activeBg : inactiveBg;
      btn.style.borderColor = active ? activeBorder : inactiveBorder;
    };

    // Handle visibility of items tied to the toggle
    if (this.visExpanded) {
      this.expandedRow.style.display = 'flex';
      this.visSetSelect.style.display = 'inline-flex';
      this.btnSaveSet.style.display = 'inline-flex';
      this.btnDeleteSet.style.display = this.currentVisSet
        ? 'inline-flex'
        : 'none';
      setBtnState(this.btnVisToggle, true);
    } else {
      this.expandedRow.style.display = 'none';
      this.visSetSelect.style.display = 'none';
      this.btnSaveSet.style.display = 'none';
      this.btnDeleteSet.style.display = 'none';
      setBtnState(this.btnVisToggle, false);

      // Auto stop painting if we collapse
      if (this.paintAction !== null) {
        this._setPaintAction(null);
      }
    }

    setBtnState(this.btnPaintAdd, this.paintAction === 'add');
    setBtnState(this.btnPaintSub, this.paintAction === 'subtract');
    setBtnState(this.btnPaintStop, this.paintAction === null);

    setBtnState(this.btnPaintCode, this.paintSegments.code);
    setBtnState(this.btnPaintSig, this.paintSegments.sig);
    setBtnState(this.btnPaintDocs, this.paintSegments.docs);

    if (this.btnSaveSet && this.visExpanded) {
      if (this.currentVisSet && this.visSetModified) {
        this.btnSaveSet.style.background = 'rgba(255, 150, 50, 0.25)';
        this.btnSaveSet.style.borderColor = 'rgba(255, 150, 50, 0.6)';
        this.btnSaveSet.style.boxShadow = '0 0 8px rgba(255, 150, 50, 0.4)';
      } else {
        this.btnSaveSet.style.background = inactiveBg;
        this.btnSaveSet.style.borderColor = inactiveBorder;
        this.btnSaveSet.style.boxShadow = 'none';
      }
    }
  }

  _makeCompactBtn(content, tooltip, onClick, isHtml = false) {
    const btn = document.createElement('button');
    btn.className = 'fp-compact-btn';
    Object.assign(btn.style, {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#eef3ff',
      borderRadius: '6px',
      padding: '2px 6px',
      minHeight: '24px',
      minWidth: '26px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      transition: 'all 0.15s ease',
      flexShrink: '0',
    });

    if (isHtml) btn.innerHTML = content;
    else btn.textContent = content;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });

    btn.addEventListener('mouseenter', () => {
      if (btn.dataset.active !== 'true') {
        btn.style.background = 'rgba(255,255,255,0.12)';
        btn.style.borderColor = 'rgba(255,255,255,0.2)';
      }
      if (typeof window.GlowingTooltip !== 'undefined') {
        window.GlowingTooltip.show(btn, tooltip, {
          color: [150, 180, 255],
          pointerHeight: 15,
        });
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (btn.dataset.active !== 'true') {
        btn.style.background = 'rgba(255,255,255,0.06)';
        btn.style.borderColor = 'rgba(255,255,255,0.1)';
      }
      if (typeof window.GlowingTooltip !== 'undefined') {
        window.GlowingTooltip.hide();
      }
    });

    return btn;
  }

  _setPaintAction(action) {
    this.paintAction = action;
    this.paintMode = action !== null;
    if (
      this.treeView &&
      typeof this.treeView._setTreePaintMode === 'function'
    ) {
      if (this.paintMode) {
        this.treeView._setTreePaintMode(this.paintAction);
        if (this.treeView._treeGlowDrawer) {
          this.treeView._treeGlowDrawer.setSegments(this.paintSegments);
        }
      } else {
        if (typeof this.treeView._deactivateTreeGlowDrawer === 'function') {
          this.treeView._deactivateTreeGlowDrawer();
        }
      }
    }
    this._updateToolbarUI();
  }

  _togglePaintSegment(seg) {
    this.paintSegments[seg] = !this.paintSegments[seg];
    if (this.paintMode && this.treeView && this.treeView._treeGlowDrawer) {
      this.treeView._treeGlowDrawer.setSegments(this.paintSegments);
    }
    this._updateToolbarUI();
  }

  async _loadVisSets() {
    if (!this.treeView || !this.visSetSelect) return;
    const summaries = this.treeView._getVisibilitySetSummaries
      ? this.treeView._getVisibilitySetSummaries()
      : [];
    const root = this.treeView.rootId || this.treeView.rootPath;
    const relevant = summaries.filter(
      (s) => !s.treeRoot || s.treeRoot === root
    );

    this.visSetSelect.innerHTML = '<option value="">-- Vis Sets --</option>';
    for (const s of relevant) {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      this.visSetSelect.appendChild(opt);
    }
    if (this.currentVisSet) {
      this.visSetSelect.value = this.currentVisSet;
    }
  }

  async _onVisSetChange() {
      if (!this.visSetSelect) return;
      const val = this.visSetSelect.value;

      if (!val) {
        this.currentVisSet = null;
        this.visSetModified = false;
        this._updateToolbarUI();
        this._saveWorkspaceState(); // ADDED STATE SAVE
        return;
      }

      if (
        this.treeView &&
        typeof this.treeView._loadVisibilitySetFromPickerValue === 'function'
      ) {
        const res = await this.treeView._loadVisibilitySetFromPickerValue(val);
        if (res && res.ok) {
          this.currentVisSet = val;
          this.visSetModified = false;
        } else {
          this.currentVisSet = null;
          this.visSetModified = false;
        }
      }
      this._updateToolbarUI();
      this._saveWorkspaceState(); // ADDED STATE SAVE
    }

  async _saveVisSet() {
    if (this.currentVisSet && !this.visSetModified) return;

    let nameToSave = this.currentVisSet;
    if (!nameToSave) {
      nameToSave = prompt('Enter a name for this visibility set:');
      if (!nameToSave) return;
    }

    if (!this.treeView) return;

    const settings = {};
    for (const node of this.treeView.nodesMap.values()) {
      if (node.type !== 'file' || !node.visibilityWidget?.state) continue;
      const state = this.treeView._normalizeVisibilityState(
        node.visibilityWidget.state
      );
      const active =
        state.codeLevel > 0 ||
        state.docsLevel > 0 ||
        state.sig ||
        state.signatures ||
        state.code ||
        state.docs;
      if (active) settings[node.id] = state;
    }

    try {
      if (typeof this.treeView._saveVisibilitySetToCapsule === 'function') {
        await this.treeView._saveVisibilitySetToCapsule(nameToSave, settings);
      }
      this.currentVisSet = nameToSave;
      this.visSetModified = false;
      await this._loadVisSets();
      this._updateToolbarUI();
    } catch (e) {
      console.error('[FloatingPanelHost] Save set failed', e);
    }
  }

  async _deleteVisSet() {
    if (!this.currentVisSet) return;
    if (!confirm('Delete visibility set: ' + this.currentVisSet + '?')) return;

    try {
      if (this.app?.commands?.deleteVisibilitySet) {
        await this.app.commands.deleteVisibilitySet({
          name: this.currentVisSet,
        });
      }
      this.currentVisSet = null;
      this.visSetModified = false;
      await this._loadVisSets();
      this._updateToolbarUI();
    } catch (e) {
      console.error('[FloatingPanelHost] Delete set failed', e);
    }
  }

  _saveWorkspaceState() {
      if (!this.projectFilesManager) return;
      const stateObj = this.projectFilesManager._ensureFloatingFileTreeState?.();
      if (!stateObj || !stateObj.trees) return;
      
      const saved = [];
      for (const [rootId, info] of stateObj.trees.entries()) {
        const host = info.host;
        saved.push({
          rootId,
          visSet: host.currentVisSet || null
        });
      }
      localStorage.setItem('vibes_workspace_state', JSON.stringify(saved));
    }


  async _checkFilesJsonAndInjectRun() {
       if (this.store && typeof this.store.has === 'function') {
          const hasFilesJson = await this.store.has(`/${this.projectName}/files.json`) || await this.store.has(`/${this.projectName}/filelist.json`);
          if (hasFilesJson) {
             this._addTitleBarRunButton();
          }
       }
    }

  _addTitleBarRunButton() {
       if (this.titleBarRunBtn) return;
       this.titleBarRunBtn = makeElement('button', {
          className: 'title-run-btn',
          title: 'Run Project',
          style: {
             background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', marginLeft: '8px'
          },
          onclick: (e) => {
             e.stopPropagation();
             if (this.app.actionHandler) {
                 this.app.actionHandler.handleRunAppFromDisk({ id: this.rootId + '/files.json', name: this.projectName });
             }
          },
          onmouseover: (e) => {
             if (window.GlowingTooltip) GlowingTooltip.show(e.currentTarget, 'Run Project', { color: [50, 255, 100] });
          },
          onmouseout: () => {
             if (window.GlowingTooltip) GlowingTooltip.hide();
          }
       }, '▶️');

       if (this.dialog && this.dialog.header) {
          const controls = this.dialog.header.querySelector('.uw-controls');
          if (controls) {
             controls.insertBefore(this.titleBarRunBtn, controls.firstChild);
          }
       }
    }
}