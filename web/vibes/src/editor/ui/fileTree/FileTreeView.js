
class FileTreeView {
  
  _createBaseStructure() {
      this.container.style.display = 'flex';
      this.container.style.flexDirection = 'column';
      this.container.style.overflow = 'hidden';
      this.container.style.containerType = 'inline-size';
      this.container.style.containerName = 'filetreehost';

      // LEGACY TOOLBAR REMOVED ENTIRELY
      // The old green "Walker" and "Visibility Tools" buttons no longer exist.

      this.treeElement = makeElement('div', {
        className: 'file-tree',
        style: {
          flex: 1,
          overflowX: 'hidden',
          overflowY: 'auto',
          position: 'relative'
        }
      });

      this.svgLayer = makeElement('svg:svg', {
        className: 'file-tree-svg-layer'
      });

      this.treeElement.appendChild(this.svgLayer);
      this.container.appendChild(this.treeElement);
    }

  _getAvailableThemes() {
    return {
      'dark-default': {
        textColor: '#d1d4d7',
        hoverBg: '#3d444b',
        selectedBg: '#007acc40',
        folderColor: '#00bfa5',
        folderOpenColor: '#008a73',
        fileColor: '#adb5bd',
        toggleColor: '#adb5bd',
        contentBg: 'transparent',
      },
    };
  }

  _getCurrentThemeColors() {
    return {};
  }

  _applyBaseCSS() {
    const cssId = 'file-tree-view-styles-dynamic';
    const o = this.options;
    const fixedNodeHeight = o.nodeHeight;
    const animDuration = o.animationDuration;

    const componentCSS = `
      .file-tree {
        position: relative;
        user-select: none;
        color: ${o.textColor};
        overflow-x: hidden !important;
        background: transparent !important;
      }

      .tree-node {
        position: absolute;
        transition: opacity ${animDuration}ms linear;
        display: flex;
        align-items: center;
        min-width: 0;
        box-sizing: border-box;
        background: transparent !important;
      }

      .node-toggle {
        width: ${o.indentation}px;
        height: ${fixedNodeHeight}px;
        color: ${o.toggleColor};
        flex: 0 0 ${o.indentation}px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease-in-out;
        background: transparent !important;
      }

      .node-toggle svg {
        width: ${o.toggleSize}px;
        height: ${o.toggleSize}px;
      }

      .tree-node-content {
        display: flex !important;
        align-items: center;
        height: ${fixedNodeHeight}px;
        min-height: ${fixedNodeHeight}px;
        box-sizing: border-box;
        cursor: pointer;
        position: relative;
        z-index: 1;
        border-radius: 3px;
        transition: background-color 0.1s ease-in-out;
        padding: 0 4px;
        gap: 4px;
        flex: 1 1 auto;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        background: transparent !important;
      }

      .tree-node.file.is-open > .tree-node-content {
        background-color: ${o.openBg} !important;
      }

      .tree-node.file.selected > .tree-node-content {
        background-color: ${o.selectedBg} !important;
      }

      .tree-node > .tree-node-content:hover {
        background-color: ${o.hoverBg} !important;
      }

      .tree-node.is-expanded > .node-toggle {
        transform: rotate(90deg);
      }

      .node-icon {
        flex: 0 0 auto;
        margin-left: 4px;
        margin-right: 8px !important;
        background: transparent !important;
      }

      .node-name {
        flex: 1 1 auto !important;
        min-width: 42px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        line-height: ${fixedNodeHeight}px;
        background: transparent !important;
      }

      .node-actions {
        flex: 0 0 auto !important;
        margin-left: auto !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 4px !important;
        min-width: 0 !important;
        max-width: min(224px, 58%) !important;
        overflow: visible !important;
        background: transparent !important;
      }

      .visibility-widget-container {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
        max-width: 224px !important;
        overflow: visible !important;
        background: transparent !important;
      }

      .visibility-widget-container svg,
      .visibility-widget-svg {
        display: block !important;
        flex: 0 0 auto !important;
        max-width: 224px !important;
        overflow: visible !important;
        background: transparent !important;
      }

      .node-dirty-indicator {
        display: none;
        font-size: 1.4em;
        line-height: 1;
        color: #00bfa5;
        background: transparent !important;
      }

      .tree-node.dirty .node-dirty-indicator {
        display: inline-block;
      }

      .node-menu-btn {
        opacity: 0;
        cursor: pointer;
        color: ${o.toggleColor};
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 3px;
        transition: opacity 0.2s, background-color 0.2s, color 0.2s;
        background: transparent;
      }

      .tree-node-content:hover .node-menu-btn,
      .node-menu-btn:hover {
        opacity: 1;
      }

      .node-menu-btn:hover {
        background-color: rgba(255,255,255,0.1);
        color: #fff;
      }

      .node-copy-btn {
        opacity: 0.55;
        cursor: pointer;
        color: ${o.toggleColor};
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 3px;
        transition: opacity 0.2s, background-color 0.2s, color 0.2s;
        background: transparent;
        border: none;
        font-size: 13px;
        line-height: 1;
        padding: 0;
      }

      .tree-node-content:hover .node-copy-btn,
      .node-copy-btn:hover {
        opacity: 1;
      }

      .node-copy-btn:hover {
        background-color: rgba(255,255,255,0.1);
        color: #fff;
      }

      .context-menu {
        position: fixed;
        z-index: 10000;
        background: var(--bg-secondary, #252526);
        border: 1px solid var(--border-color, #333);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        border-radius: 4px;
        padding: 4px 0;
        min-width: 150px;
      }

      .context-menu-item {
        display: block;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        padding: 6px 12px;
        color: var(--text-primary, #ccc);
        cursor: pointer;
        font-size: 13px;
      }

      .context-menu-item:hover {
        background-color: var(--bg-hover, #383842);
        color: #fff;
      }

      .context-menu-divider {
        height: 1px;
        background: var(--border-color, #333);
        margin: 4px 0;
      }

      .node-doc-indicator {
        display: none;
      }

      .tree-node.has-docs .node-doc-indicator {
        display: inline-block;
      }

      .node-run-btn {
        display: none;
        padding: 0 6px;
        font-size: 0.9em;
        line-height: 16px;
        height: 16px;
        background-color: #008a73;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        opacity: 0.8;
      }

      .tree-node-content:hover .node-run-btn {
        display: block;
      }

      .node-run-btn:hover {
        opacity: 1;
        background-color: #00bfa5;
      }

      .node-huge-badge {
        font-size: 9px;
        font-weight: bold;
        color: #EF5350;
        border: 1px solid rgba(239, 83, 80, 0.4);
        background: rgba(239, 83, 80, 0.1);
        border-radius: 4px;
        padding: 1px 4px;
        user-select: none;
        white-space: nowrap;
        letter-spacing: 0.4px;
      }

      .tree-node:not(.has-children) > .node-toggle {
        visibility: hidden;
      }

      .file-tree-svg-layer {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 0;
        overflow: visible;
        background: transparent !important;
      }

      .file-tree-svg-layer path {
        fill: none;
        stroke: ${o.lineColor};
        stroke-width: ${o.lineWidth}px;
        transition: opacity ${animDuration * 0.8}ms linear;
      }

      .floating-panel-host .file-tree,
      .floating-real-editor-panel .file-tree,
      .dialog-box .file-tree {
        overflow-x: hidden !important;
      }

      .floating-panel-host .tree-view-container,
      .dialog-box .tree-view-container {
        overflow-x: hidden !important;
        padding-right: 30px !important;
        box-sizing: border-box !important;
      }

      .floating-panel-host .tree-node,
      .dialog-box .tree-node {
        padding-right: 20px !important;
        box-sizing: border-box !important;
      }

      .floating-panel-host .node-icon,
      .dialog-box .node-icon {
        margin-left: 8px !important;
        margin-right: 10px !important;
      }

      @media (max-width: 520px) {
        .node-actions {
          max-width: 150px !important;
        }

        .visibility-widget-container,
        .visibility-widget-container svg,
        .visibility-widget-svg {
          max-width: 150px !important;
        }

        .node-name {
          min-width: 28px !important;
        }
      }
    `;

    applyCss(componentCSS, cssId);
  }

  _registerNodeAndChildren(node) {
    if (!node || !node.id) return;
    this.nodesMap.set(node.id, node);
    node.children.forEach((child) => this._registerNodeAndChildren(child));
  }

  _unregisterNode(node) {
    if (!node || !node.id) return;
    node.domElement?.remove();
    this.nodesMap.delete(node.id);
    [...node.children].forEach((child) => this._unregisterNode(child));
  }

  clear() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.isAnimating = false;
      this.onAnimationComplete = null;
    }

    this.rootNodes.forEach((rootNode) => this._unregisterNode(rootNode));
    this.nodesMap.clear();
    this.rootNodes = [];
    this.selectedNode = null;
    this.currentLayout = {};
    if (this.svgLayer) this.svgLayer.innerHTML = '';
    if (this.treeElement) this.treeElement.style.height = '0px';
  }

  calculateLayout() {
    const layout = {};
    let currentY = this.options.verticalPadding;
    const rowHeight = this.options.nodeHeight + this.options.verticalPadding;
    const indent = this.options.indentation;

    const traverse = (node, level, visible) => {
      if (!node) return;

      if (node.isFilteredOut) {
        layout[node.id] = {x: 0, y: 0, isVisible: false, nodeInstance: node};
        return;
      }

      layout[node.id] = {
        x: level * indent,
        y: currentY,
        isVisible: visible,
        nodeInstance: node,
      };
      if (visible) currentY += rowHeight;

      if (node.type === 'directory' && node.children.length) {
        const showKids = visible && node.isExpanded;
        node.children.forEach((c) => traverse(c, level + 1, showKids));
      }
    };

    this.rootNodes.forEach((rootNode) => {
      traverse(rootNode, 0, true);
    });

    if (currentY > this.options.verticalPadding) {
      currentY -= this.options.verticalPadding;
    }

    this.treeElement.style.height = `${currentY}px`;
    return layout;
  }

  _renderNodesFromLayout(layoutData, immediate = true) {
    this.nodesMap.forEach((node) => {
      const layoutInfo = layoutData[node.id];

      if (!layoutInfo) {
        if (node.domElement) {
          node.currentOpacity = 0;
          node.targetOpacity = 0;
          node.updateStyle();
        }
        return;
      }

      const {x, y, isVisible} = layoutInfo;

      if (!node.domElement) {
        node.render();
        this.treeElement.appendChild(node.domElement);
      }

      node.targetX = x;
      node.targetY = y;
      node.targetOpacity = isVisible ? 1 : 0;

      if (immediate) {
        node.currentX = x;
        node.currentY = y;
        node.currentOpacity = isVisible ? 1 : 0;
        node.updateStyle();
      }
    });
  }

  handleExpansionChange(nodeInstance, onComplete) {
    if (this.isAnimating) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationStartLayout = this._captureCurrentAnimationState();
    } else {
      this.animationStartLayout = this.currentLayout;
    }
    this.animationEndLayout = this.calculateLayout();
    this._startAnimation(onComplete);
  }

  _captureCurrentAnimationState() {
    const capturedLayout = {};
    for (const [nodeId, node] of this.nodesMap.entries()) {
      capturedLayout[nodeId] = {
        x: node.currentX,
        y: node.currentY,
        isVisible: node.currentOpacity > 0.01,
        nodeInstance: node,
      };
    }
    return capturedLayout;
  }

  _ensureNodesAreRenderedForAnimation() {
    const involvedNodeIds = new Set([
      ...Object.keys(this.animationStartLayout),
      ...Object.keys(this.animationEndLayout),
    ]);

    involvedNodeIds.forEach((nodeId) => {
      const node = this.nodesMap.get(nodeId);
      if (node && !node.domElement) {
        const startLayout = this.animationStartLayout[nodeId];
        const endLayout = this.animationEndLayout[nodeId];
        const initialX = startLayout?.x ?? endLayout?.x ?? 0;
        const initialY = startLayout?.y ?? endLayout?.y ?? 0;
        const initialOpacity = startLayout?.isVisible ? 1 : 0;

        node.currentX = initialX;
        node.currentY = initialY;
        node.currentOpacity = initialOpacity;
        node.render();
        this.treeElement.appendChild(node.domElement);
        node.updateStyle();
      }
    });
  }

  _startAnimation(onCompleteCallback = null) {
    if (this.isAnimating) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationStartTime = performance.now();
    this.isAnimating = true;
    this.onAnimationComplete = onCompleteCallback;

    this._ensureNodesAreRenderedForAnimation();

    const activeNode = this.activeNodeId
      ? this.nodesMap.get(this.activeNodeId)
      : null;
    if (activeNode) {
      activeNode._lastKnownVisibility = activeNode.currentOpacity > 0.1;
    }

    this.animationFrameId = requestAnimationFrame(this._animationTick);
  }

  _animationTick(timestamp) {
    if (!this.isAnimating) return;

    const elapsedTime = timestamp - this.animationStartTime;
    const duration = this.options.animationDuration;
    let progress = Math.min(elapsedTime / duration, 1);
    progress = 1 - Math.pow(1 - progress, 3);

    const affectedNodeIds = new Set([
      ...Object.keys(this.animationStartLayout),
      ...Object.keys(this.animationEndLayout),
    ]);

    for (const nodeId of affectedNodeIds) {
      const node = this.nodesMap.get(nodeId);
      if (!node) continue;

      const startState = this.animationStartLayout[nodeId];
      const endState = this.animationEndLayout[nodeId];
      let startX, startY, startOpacity, endX, endY, endOpacity;
      if (startState) {
        startX = startState.x;
        startY = startState.y;
        startOpacity = startState.isVisible ? 1 : 0;
      } else {
        const parentStart = node.parentNode
          ? this.animationStartLayout[node.parentNode.id]
          : null;
        startX = endState.x;
        startY = parentStart ? parentStart.y : endState.y;
        startOpacity = 0;
      }
      if (endState) {
        endX = endState.x;
        endY = endState.y;
        endOpacity = endState.isVisible ? 1 : 0;
      } else {
        const parentEnd = node.parentNode
          ? this.animationEndLayout[node.parentNode.id]
          : null;
        endX = startX;
        endY = parentEnd ? parentEnd.y : startY;
        endOpacity = 0;
      }
      node.currentX = startX + (endX - startX) * progress;
      node.currentY = startY + (endY - startY) * progress;
      node.currentOpacity =
        startOpacity + (endOpacity - startOpacity) * progress;
      node.updateStyle();
    }

    this._drawLinesInternal();

    if (this.app && this.app.visibilityManager) {
      this.app.visibilityManager.notify();
    }

    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(this._animationTick);
    } else {
      this.isAnimating = false;
      this.animationFrameId = null;
      this.currentLayout = this.animationEndLayout;
      this._renderNodesFromLayout(this.currentLayout, true);
      this._drawLinesInternal();
      if (typeof this.onAnimationComplete === 'function') {
        this.onAnimationComplete();
        this.onAnimationComplete = null;
      }
      if (this.app && this.app.visibilityManager) {
        this.app.visibilityManager.notify();
      }
    }
  }

  _drawLinesForNode(parentNode) {
      const parentPoint = parentNode.getConnectionPoint();
      if (!parentPoint) return;

      const radius = this.options.lineRadius;
      const indentation = this.options.indentation;
      const endpointOffset = Math.max(
        Number(this.options.lineEndpointOffset || 0),
        22
      );

      parentNode.children.forEach((childNode) => {
        const childLayoutInfo = this.currentLayout[childNode.id];
        const isVisible = this.isAnimating
          ? childNode.currentOpacity > 0.01
          : childLayoutInfo && childLayoutInfo.isVisible;

        if (!isVisible) return;

        const parentVerticalLineX = parentNode.currentX + indentation / 2;
        const childHorizontalLineY =
          childNode.currentY + this.options.nodeHeight / 2;

        // Extend the horizontal line 18 pixels further to the right for files (since no directory toggle arrow is in the way)
        const offset = childNode.type === 'file'
          ? Math.max(0, endpointOffset - 18)
          : endpointOffset;

        const horizontalLineEndX =
          childNode.currentX + indentation - offset;

        const d =
          `M ${parentVerticalLineX} ${parentPoint.y}` +
          ` V ${childHorizontalLineY - radius}` +
          ` Q ${parentVerticalLineX} ${childHorizontalLineY} ${parentVerticalLineX + radius
          } ${childHorizontalLineY}` +
          ` H ${horizontalLineEndX}`;

        if (d.includes('NaN')) return;

        const path = makeElement('svg:path', {
          d,
          style: {
            opacity: childNode.currentOpacity,
          },
        });

        this.svgLayer.appendChild(path);
      });
    }

  addNode(newNodeData, parentId) {
    const parentNode = this.nodesMap.get(parentId);
    if (!parentNode || this.nodesMap.has(newNodeData.id)) return;

    const parentWasCollapsed = !parentNode.isExpanded;
    if (parentWasCollapsed) parentNode.isExpanded = true;

    const newNodeInstance = new TreeNode(newNodeData, this, parentNode);
    this.nodesMap.set(newNodeInstance.id, newNodeInstance);
    parentNode.children.push(newNodeInstance);
    parentNode.children.sort((a, b) =>
      a.type === b.type
        ? a.name.localeCompare(b.name)
        : a.type === 'directory'
          ? -1
          : 1
    );

    this.animationStartLayout = this.currentLayout;
    this.animationEndLayout = this.calculateLayout();

    const parentLayout = this.currentLayout[parentNode.id];
    newNodeInstance.currentX = parentLayout
      ? parentLayout.x + this.options.indentation
      : this.animationEndLayout[newNodeInstance.id].x;
    newNodeInstance.currentY = parentLayout
      ? parentLayout.y
      : this.animationEndLayout[newNodeInstance.id].y;
    newNodeInstance.currentOpacity = 0;
    newNodeInstance.render();
    this.treeElement.appendChild(newNodeInstance.domElement);

    this._startAnimation(() => {
      parentNode.updateVisualState();
    });
  }

  removeNode(nodeId) {
        const node = this.nodesMap.get(nodeId);
        if (!node) return;

        const parentNode = node.parentNode;

        this.animationStartLayout = this.currentLayout;
        if (parentNode) {
          parentNode.children = parentNode.children.filter((c) => c.id !== nodeId);
        } else {
          this.rootNodes = this.rootNodes.filter((r) => r.id !== nodeId);
        }
        this.animationEndLayout = this.calculateLayout();

        this._startAnimation(() => {
          this._unregisterNode(node);
          if (parentNode) {
            parentNode.updateVisualState();
          }
          if (this.selectedNode === node) this.selectedNode = null;
          this.redrawLines(); 
        });
      }

  setNodeOpenState(nodeId, isOpen) {
    const node = this.nodesMap.get(nodeId);
    if (node) node.setOpen(isOpen);
  }

  setNodeDirtyState(nodeId, isDirty) {
    const node = this.nodesMap.get(nodeId);
    if (node) node.setDirty(isDirty);
  }

  redrawLines() {
    setTimeout(() => this._drawLinesInternal(), 50);
  }

  constructor(containerElement, options = {}) {
    if (!containerElement)
      throw new Error('Container element is required for FileTreeView.');

    this.container = containerElement;
    this.app = options.app;

    const baselineDefaults = {
      lineWidth: 1.5,
      lineRadius: 6,
      indentation: 24,
      nodeHeight: 24,
      verticalPadding: 2,
      fontSize: 0.9,
      lineColor: '#5a5a5a',
      textColor: '#d1d4d7',
      toggleColor: '#adb5bd',
      hoverBg: '#3d444b',
      selectedBg: '#4a4a4a',
      openBg: 'rgba(0, 122, 204, 0.2)',
      activeBg: 'rgba(0,122,204,0.25)',
      animationDuration: 250,
      toggleSize: 16,
      lineEndpointOffset: 12,
      arrowShadowWidth: 5,
      arrowForegroundWidth: 1.5,
      onFileSelect: null,
      onRunHtmlFile: null,
      onVisibilityChange: null,
      onNodeVisibilityChange: null,
    };

    this.options = {...baselineDefaults, ...options};

    this.rootNodes = [];
    this.nodesMap = new Map();
    this.currentlySelectedNode = null;
    this.treeElement = null;
    this.svgLayer = null;
    this.contextMenuElement = null;
    this.currentLayout = {};
    this.animationFrameId = null;
    this.isAnimating = false;
    this._cachedSvgWidth = 0;
    this._cachedSvgHeight = 0;
    this.widgetMaxSizes = {maxCodeLength: 0, maxDocsLength: 0};
    this.activeNodeId = null;

    this.contextMenu = new CompactMenu();

    if (window.getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }

    this._createBaseStructure();
    this._installTreeWidgetLayoutStyles();
    this._animationTick = this._animationTick.bind(this);

    this.container.addEventListener('contextmenu', (e) => {
      this._handleContextMenu(e);
    });

    if (this.options.appearanceManager) {
      this.options.appearanceManager.subscribe(
        this.applyAppearanceSettings.bind(this)
      );
    } else {
      this._applyBaseCSS();
    }
  }

  _setSvgSize(width, height) {
    if (width === this._cachedSvgWidth && height === this._cachedSvgHeight) {
      return;
    }
    this.svgLayer.setAttribute('width', `${width}`);
    this.svgLayer.setAttribute('height', `${height}`);
    this._cachedSvgWidth = width;
    this._cachedSvgHeight = height;
  }

  _drawLinesInternal() {
    if (this.rootNodes.length === 0 || !this.svgLayer || !this.container)
      return;
    this.svgLayer.innerHTML = '';
    let maxX = 0,
      maxY = 0;
    const nodesToDrawFrom = [];
    for (const nodeId in this.currentLayout) {
      const node = this.nodesMap.get(nodeId);
      if (!node) continue;
      const visible = this.isAnimating
        ? node.currentOpacity > 0.01
        : this.currentLayout[nodeId]?.isVisible;
      if (visible && node.domElement) {
        maxX = Math.max(maxX, node.currentX + node.domElement.offsetWidth);
        maxY = Math.max(maxY, node.currentY + node.domElement.offsetHeight);
        if (
          node.type === 'directory' &&
          node.isExpanded &&
          node.children.length > 0
        ) {
          nodesToDrawFrom.push(node);
        }
      }
    }

    const svgWidth = this.container.clientWidth;
    const svgHeight = Math.max(this.container.clientHeight, maxY);

    this._setSvgSize(svgWidth, svgHeight);
    nodesToDrawFrom.forEach((n) => this._drawLinesForNode(n));
  }

  showContextMenu(node, event) {
    this._showNodeContextMenu(node, event.clientX, event.clientY);
  }

  hideContextMenu() {
    this.contextMenu.hide();
  }

  applyAppearanceSettings(allSettings) {
    const treeSettings = {
      lineWidth: allSettings['tree.lineWidth'],
      lineRadius: allSettings['tree.lineRadius'],
      indentation: allSettings['tree.indentation'],
      nodeHeight: allSettings['tree.nodeHeight'],
      fontSize: allSettings['tree.fontSize'],
      toggleSize: allSettings['tree.toggleSize'],
      arrowShadowWidth: allSettings['tree.arrowShadowWidth'],
      arrowForegroundWidth: allSettings['tree.arrowForegroundWidth'],
      lineEndpointOffset: allSettings['tree.lineEndpointOffset'],
      lineColor: allSettings['tree.lineColor'],
      textColor: allSettings['tree.textColor'],
      toggleColor: allSettings['tree.toggleColor'],
      hoverBg: allSettings['tree.hoverBg'],
      selectedBg: allSettings['tree.selectedBg'],
      activeBg: allSettings['tree.activeBg'],
      openBg: allSettings['tree.openBg'],
      animationDuration: this.options.animationDuration || 250,
    };

    this.options = {...this.options, ...treeSettings};

    this._applyBaseCSS();
    this.nodesMap.forEach((node) => {
      if (node.type === 'directory') {
        node.updateToggleIcon();
      }
    });
    this.redrawLines();
  }

  _handleFileOpen(node) {
    if (this.options.onFileSelect) {
      this.options.onFileSelect(node);
    }
  }

  _handleNodeSelection(node) {
    if (this.currentlySelectedNode && this.currentlySelectedNode !== node) {
      this.currentlySelectedNode.setSelected(false);
    }
    if (this.currentlySelectedNode === node) {
      node.setSelected(false);
      this.currentlySelectedNode = null;
    } else {
      node.setSelected(true);
      this.currentlySelectedNode = node;
    }
  }

  async applyFileMetadata(metadata) {
    if (!metadata) return;

    for (const [nodeId, node] of this.nodesMap.entries()) {
      if (node.type === 'file') {
        try {
          let metadataKey = nodeId;
          if (this.app && typeof this.app.createPath === 'function') {
            const pathObj = await this.app.createPath(nodeId);
            metadataKey = pathObj.asMetadataKey();
          }

          if (metadata.hasOwnProperty(metadataKey)) {
            node.updateMetadata(metadata[metadataKey]);
          } else if (metadata.hasOwnProperty(nodeId)) {
            node.updateMetadata(metadata[nodeId]);
          }
        } catch (e) {
          console.warn(
            `Could not process metadata for node ID '${nodeId}': ${e.message}`
          );
          if (metadata.hasOwnProperty(nodeId)) {
            node.updateMetadata(metadata[nodeId]);
          }
        }
      }
    }

    this._calculateWidgetMaxSizes();
    this.nodesMap.forEach((node) => {
      if (node.visibilityWidget) {
        node.visibilityWidget.updateSizes(node.metadata, this.widgetMaxSizes);
      }
    });
  }

  setNodeDocStatus(sourcePath, hasDocs) {
    const node = this.nodesMap.get(sourcePath);
    if (node && node.type === 'file') {
      if (!node.metadata) node.metadata = {};
      node.metadata.docSize = hasDocs ? node.metadata.docSize || 1 : 0;
      node.updateMetadata(node.metadata);
    }
  }

  _calculateWidgetMaxSizes() {
    let maxCode = 0;
    let maxDocs = 0;

    const tempWidget = {
      _scaleValue: (v, m, f) => (v <= 0 ? 0 : m + Math.sqrt(v) * f),
    };

    this.nodesMap.forEach((node) => {
      if (node.type === 'file' && node.metadata) {
        maxCode = Math.max(maxCode, node.metadata.codeSize || 0);
        maxDocs = Math.max(maxDocs, node.metadata.docSize || 0);
      }
    });

    this.widgetMaxSizes = {
      maxCodeLength: tempWidget._scaleValue(maxCode, 10, 1.2),
      maxDocsLength: tempWidget._scaleValue(maxDocs, 10, 1.2),
    };
  }

  checkActiveNodeVisibility() {
    if (!this.activeNodeId || !this.options.onNodeVisibilityChange) {
      return;
    }
    const node = this.nodesMap.get(this.activeNodeId);
    if (!node || !node.domElement) return;

    const widget = node.visibilityWidget?.getElement();
    if (!widget) {
      if (node._lastKnownVisibility === true) {
        node._lastKnownVisibility = false;
        this.options.onNodeVisibilityChange(node, false);
      }
      return;
    }
    const isFadedIn = node.currentOpacity > 0.1;
    const widgetContainerStyle = window.getComputedStyle(widget.parentElement);
    const isDisplayed = widgetContainerStyle.display !== 'none';
    const containerRect = this.container.getBoundingClientRect();
    const widgetRect = widget.getBoundingClientRect();
    const isInView =
      widgetRect.top >= containerRect.top &&
      widgetRect.bottom <= containerRect.bottom;
    const isNowVisible = isFadedIn && isDisplayed && isInView;
    if (isNowVisible !== node._lastKnownVisibility) {
      node._lastKnownVisibility = isNowVisible;
      this.options.onNodeVisibilityChange(node, isNowVisible);
    }
  }

  getAllVisibilityWidgets() {
    const widgets = [];
    for (const node of this.nodesMap.values()) {
      if (node.visibilityWidget) {
        widgets.push(node.visibilityWidget);
      }
    }
    return widgets;
  }

  ensureNodeVisible(nodeId, onVisibleCallback) {
    const node = this.nodesMap.get(nodeId);
    if (!node) {
      if (onVisibleCallback) onVisibleCallback();
      return;
    }

    const ancestorsToExpand = [];
    let parent = node.parentNode;
    while (parent) {
      if (parent.type === 'directory' && !parent.isExpanded) {
        ancestorsToExpand.push(parent);
      }
      parent = parent.parentNode;
    }

    if (ancestorsToExpand.length === 0) {
      if (onVisibleCallback) onVisibleCallback();
      return;
    }

    ancestorsToExpand.reverse();

    const expandNext = (index) => {
      if (index >= ancestorsToExpand.length) {
        if (onVisibleCallback) onVisibleCallback();
        return;
      }
      const nodeToExpand = ancestorsToExpand[index];
      nodeToExpand.toggleExpandCollapse(() => expandNext(index + 1));
    };

    expandNext(0);
  }

  syncAllFileStates(selectedNodeId, allOpenFileIds = new Set()) {
    this.nodesMap.forEach((node) => {
      const isSelected = node.id === selectedNodeId;
      const isOpenInTab = allOpenFileIds.has(node.id);
      node.setSelected(isSelected);
      node.setOpen(isOpenInTab && !isSelected);
      node.updateVisualState();
    });
    this.activeNodeId = selectedNodeId;
    this.checkActiveNodeVisibility();
  }

  addRootNode(rootNodeData, onComplete) {
    if (!rootNodeData) {
      if (onComplete) onComplete();
      return;
    }
    if (this.rootNodes.some((r) => r.id === rootNodeData.id)) {
      if (onComplete) onComplete();
      return;
    }

    this.animationStartLayout = this.currentLayout;
    const newRoot = new TreeNode(rootNodeData, this);
    this._registerNodeAndChildren(newRoot);
    this.rootNodes.push(newRoot);
    this.animationEndLayout = this.calculateLayout();
    this._startAnimation(onComplete);
  }

  async setData(treeDataArray, fileMetadata = {}) {
    this.clear();

    if (!Array.isArray(treeDataArray) || treeDataArray.length === 0) return;

    try {
      this.rootNodes = treeDataArray
        .map((treeData) => {
          if (!treeData || typeof treeData !== 'object' || !treeData.id)
            return null;
          const root = new TreeNode(treeData, this);
          this._registerNodeAndChildren(root);
          return root;
        })
        .filter(Boolean);

      await this.applyFileMetadata(fileMetadata);
      this._calculateWidgetMaxSizes();

      this.currentLayout = this.calculateLayout();
      this._renderNodesFromLayout(this.currentLayout, true);
      this._drawLinesInternal();
    } catch (e) {
      console.error('[FTV-LOG] CRITICAL ERROR during setData processing:', e);
    }
  }

  _showInputDialog(title, message, defaultValue, onConfirm) {
    const input = makeElement('input', {
      type: 'text',
      value: defaultValue,
      style: {
        width: '100%',
        marginTop: '10px',
        padding: '8px',
        backgroundColor: 'var(--bg-input, #3c3c3c)',
        color: 'var(--text-primary, #fff)',
        border: '1px solid var(--border-color, #555)',
        borderRadius: '3px',
      },
      onkeydown: (e) => {
        if (e.key === 'Enter') {
          onConfirm(input.value);
          this._activeDialog.close();
        }
      },
    });

    setTimeout(() => {
      input.focus();
      const lastDot = defaultValue.lastIndexOf('.');
      const lastSlash = defaultValue.lastIndexOf('/');
      if (lastDot > lastSlash) {
        input.setSelectionRange(lastSlash + 1, lastDot);
      } else {
        input.select();
      }
    }, 50);

    const content = makeElement('div', {}, [
      makeElement('p', {style: {marginBottom: '5px'}}, message),
      input,
    ]);

    this._activeDialog = UITools.makeDialog({
      title: title,
      content: content,
      width: '400px',
      buttons: [
        {label: 'Cancel'},
        {
          label: 'OK',
          className: 'primary',
          onClick: () => {
            onConfirm(input.value);
          },
        },
      ],
    });
  }

  _handleNewFile(parentNode) {
      let basePath = parentNode.id;
      if (!basePath.endsWith('/')) basePath += '/';

      this._showInputDialog(
        'Create New File',
        'Enter the full path for the new file:',
        basePath + 'NewFile.js',
        async (newPath) => {
          if (!newPath || newPath.trim() === basePath) return;
          
          const store = this.store || this.fileStore || this.app?.inMemoryFileStore;
          
          if (store) {
            try {
              await store.set(newPath, '');
            } catch (e) {
              console.warn('[New File] Store write failed:', e);
            }
          }

          if (this.app?.projectFilesManager) {
            this.app.projectFilesManager.addInMemoryFileNode(newPath);
            if (typeof this.app.projectFilesManager._openFloatingExternalEditorWindow === 'function') {
              await this.app.projectFilesManager._openFloatingExternalEditorWindow(newPath, store);
              return;
            }
          }

          await this.app.tabOrchestrator.openFileInTab(
            {id: newPath},
            {initialContent: ''}
          );
        }
      );
    }

  _handleNewFolder(parentNode) {
      let basePath = parentNode.id;
      if (!basePath.endsWith('/')) basePath += '/';

      this._showInputDialog(
        'Create New Folder',
        'Folder creation requires a placeholder file (e.g., .keep). Enter path:',
        basePath + 'NewFolder/.keep',
        async (newPath) => {
          if (!newPath) return;

          const store = this.store || this.fileStore || this.app?.inMemoryFileStore;
          
          if (store) {
            try {
              await store.set(newPath, '');
            } catch (e) {
              console.warn('[New Folder] Store write failed:', e);
            }
          }

          if (this.app?.projectFilesManager) {
            this.app.projectFilesManager.addInMemoryFileNode(newPath);
            if (typeof this.app.projectFilesManager._openFloatingExternalEditorWindow === 'function') {
              await this.app.projectFilesManager._openFloatingExternalEditorWindow(newPath, store);
              return;
            }
          }

          await this.app.tabOrchestrator.openFileInTab(
            {id: newPath},
            {initialContent: ''}
          );
        }
      );
    }

  _handleDelete(node) {
    const isDir = node.type === 'directory';

    const performDelete = async () => {
      try {
        if (isDir) {
          // 1. Gather all nested files and delete them via standard commands 
          // (This ensures tabs are closed and in-memory caches are cleared)
          const filesToDelete = [];
          const gatherFiles = (n) => {
            if (n.type === 'file') filesToDelete.push(n.id);
            else if (n.children) n.children.forEach(gatherFiles);
          };
          gatherFiles(node);

          for (const fileId of filesToDelete) {
            await this.app.commands.deleteFile({ path: fileId, skipConfirm: true });
          }

          // 2. Explicitly delete the directory from the disk backend
          const rootId = '/' + node.id.split('/').filter(Boolean)[0];
          const store = this.app.workspaceFileStores?.get(rootId);
          
          if (store && typeof store.deleteDirectory === 'function') {
            try {
              await store.deleteDirectory(node.id);
            } catch (e) {
              console.warn('Could not delete directory from disk backend:', e);
            }
          }
        } else {
          // Single file deletion
          await this.app.commands.deleteFile({ path: node.id, skipConfirm: true });
        }

        // 3. Remove the node from the UI
        this.removeNode(node.id);
        
        if (this.app.uiManager?.setStatus) {
          this.app.uiManager.setStatus(`Deleted ${node.name}`);
        }
      } catch (err) {
        if (this.app.uiManager?.setStatus) {
          this.app.uiManager.setStatus(`Error deleting: ${err.message}`, true);
        }
      }
    };

    const warning = isDir
      ? `Are you sure you want to delete the folder "${node.name}" and ALL its contents?`
      : `Are you sure you want to delete "${node.name}"?`;

    if (typeof UITools !== 'undefined' && UITools.makeDialog) {
      UITools.makeDialog({
        title: isDir ? 'Delete Folder' : 'Delete File',
        content: makeElement('div', {}, [
          makeElement('p', {}, warning),
          makeElement(
            'p',
            { style: { color: '#f48771', fontSize: '0.9em', marginTop: '10px' } },
            'This action cannot be undone.'
          ),
        ]),
        buttons: [
          { label: 'Cancel' },
          {
            label: 'Delete',
            className: 'danger',
            onClick: () => {
              performDelete();
            },
          },
        ],
      });
    }
  }

  _handleRename(node) {
    if (node.type === 'directory') {
      this.app.uiManager.setStatus(
        'Renaming folders is not yet supported. Please rename files individually.',
        true
      );
      return;
    }

    this._showInputDialog(
      'Move / Rename',
      'Enter the new path for this file:',
      node.id,
      async (newPath) => {
        if (!newPath || newPath === node.id) return;
        this.app.uiManager.setStatus('Moving file...');
        try {
          await this.app.commands.moveFile({
            source: node.id,
            destination: newPath,
          });
        } catch (e) {
          this.app.uiManager.setStatus(`Move failed: ${e.message}`, true);
        }
      }
    );
  }

  _handleBulkSelect(folderNode, isSelect) {
    if (!this.app || !this.app.buildPromptTab) return;

    const prefix = folderNode.id + '/';
    const allNodes = Array.from(this.nodesMap.values());
    const targetNodes = allNodes.filter(
      (n) => n.type === 'file' && n.id.startsWith(prefix)
    );

    targetNodes.forEach((n) => {
      if (n.visibilityWidget) {
        const newState = {...n.visibilityWidget.state};
        if (isSelect) {
          newState.code = true;
          newState.signatures = true;
          newState.docsLevel = 4;
        } else {
          newState.code = false;
          newState.signatures = false;
          newState.docsLevel = 0;
        }
        n.visibilityWidget.setState(newState, true);
      }
    });

    this.app.buildPromptTab._widgetStateChangeCallback();
    this.app.uiManager.setStatus(
      `${isSelect ? 'Selected' : 'Cleared'} ${targetNodes.length} files in ${folderNode.name
      }`
    );
  }

  _handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    const nodeEl = e.target.closest('.tree-node');
    if (nodeEl && nodeEl.dataset.nodeId) {
      const nodeId = nodeEl.dataset.nodeId;
      const node = this.nodesMap.get(nodeId);
      if (node) {
        this._showNodeContextMenu(node, e.clientX, e.clientY);
        return;
      }
    }

    this._showGlobalContextMenu(e.clientX, e.clientY);
  }

  _handleGlobalBulk(isSelect, type) {
    if (!this.app || !this.app.buildPromptTab) return;

    // Leverage the multi-tree query implementation instead of being localized to this specific FileTreeView.
    const allWidgets = typeof this.app.getAllVisibilityWidgets === 'function'
      ? this.app.getAllVisibilityWidgets()
      : this.getAllVisibilityWidgets();

    allWidgets.forEach((w) => {
      const newState = {...w.state};

      if (type === 'all' || type === 'code') {
        newState.code = isSelect;
        if (type === 'all') newState.signatures = isSelect;
      }
      if (type === 'signatures') {
        newState.signatures = isSelect;
      }
      if (type === 'all' || type === 'docs') {
        newState.docsLevel = isSelect ? 4 : 0;
      }

      w.setState(newState, true);
    });

    this.app.buildPromptTab._widgetStateChangeCallback();

    let msg = isSelect ? 'Selected ' : 'Cleared ';
    if (type === 'all') msg += 'all files.';
    else if (type === 'code') msg += 'code on all files.';
    else if (type === 'signatures') msg += 'signatures on all files.';
    else if (type === 'docs') msg += 'docs on all files.';

    this.app.uiManager.setStatus(msg);
  }

  async _openFileInMode(node, viewMode) {
    if (!this.app || !this.app.tabOrchestrator) return;
    const controller = await this.app.tabOrchestrator.openFileInTab({
      id: node.id,
      hasDocs: node.hasDocs,
    });
    if (controller && controller.viewManager) {
      controller.viewManager.setActiveView(viewMode);
    }
  }

  _createMenuItem(label, shortcut, onClick) {
    const el = makeElement('div', {className: 'compact-menu-item'});
    el.appendChild(makeElement('span', {}, label));
    if (shortcut) {
      el.appendChild(makeElement('span', {className: 'shortcut'}, shortcut));
    }
    el.onclick = (e) => {
      e.stopPropagation();
      this.contextMenu.hide();
      onClick();
    };
    return el;
  }

  _showNodeContextMenu(node, mouseX, mouseY) {
      if (node.type === 'file') this._handleNodeSelection(node);
      let targetX = mouseX;
      let targetY = mouseY;
      if (node.domElement) {
        const widgetContainer = node.domElement.querySelector('.visibility-widget-container');
        if (widgetContainer) {
          targetX = widgetContainer.getBoundingClientRect().left;
        } else {
          const nameEl = node.domElement.querySelector('.node-name');
          if (nameEl) {
            targetX = nameEl.getBoundingClientRect().right + 10;
          }
        }
        targetY = node.domElement.getBoundingClientRect().top;
      }

      const items = [];

      const launchTreeWalker = (rootPath) => {
        if (typeof TreeWalkerDialog === 'undefined') {
          this.app?.uiManager?.setStatus('TreeWalkerDialog not loaded.', true);
          return;
        }
        const walker = new TreeWalkerDialog(this.app);
        walker.attachToSourceTree({
          sourceTreeView: this,
          rootPath: rootPath,
          launchPath: rootPath,
        });
        walker.show();
      };

      const runAppCapsule = () => {
        const manager =
          this.manager ||
          this.projectFilesManager ||
          this.app?.projectFilesManager ||
          globalThis.__vibesProjectFilesManager ||
          null;

        if (manager && typeof manager.runAppCapsuleFromNode === 'function') {
          manager.runAppCapsuleFromNode(node, {
            sourceTreeView: this,
          });
          return;
        }

        if (this.app?.uiManager?.setStatus) {
          this.app.uiManager.setStatus('Run App is not available on ProjectFilesManager yet.', true);
        }
      };

      if (node.type === 'directory') {
        items.push(this._createMenuItem('New File', 'F', () => this._handleNewFile(node)));
        items.push(this._createMenuItem('New Folder', 'D', () => this._handleNewFolder(node)));

        if (this.app && this.app.osCapabilities && this.app.osCapabilities.hasExplorer) {
          items.push(makeElement('div', {className: 'compact-menu-separator'}));
          items.push(this._createMenuItem('Reveal in OS', null, () =>
            this.app.actionHandler.handleOpenInOs(node.id, 'explorer')
          ));
        }

        items.push(makeElement('div', {className: 'compact-menu-separator'}));
        items.push(this._createMenuItem('Rename', null, () => this._handleRename(node)));
        items.push(this._createMenuItem('Delete Folder', null, () => this._handleDelete(node)));
        items.push(makeElement('div', {className: 'compact-menu-separator'}));
        items.push(this._createMenuItem('Select All', null, () => this._handleBulkSelect(node, true)));
        items.push(this._createMenuItem('Clear All', null, () => this._handleBulkSelect(node, false)));

        items.push(makeElement('div', {className: 'compact-menu-separator'}));
        items.push(this._createMenuItem('🌲 Tree Walker here...', null, () => launchTreeWalker(node.id)));

      } else {
        items.push(this._createMenuItem('Open', null, () => this._handleNodeSelection(node)));

        if (String(node.id || '').endsWith('.js')) {
          items.push(this._createMenuItem('▶ Run App', null, () => runAppCapsule()));
        }

        if (node.name === 'files.json') {
          items.push(this._createMenuItem('▶ Run App from Disk', null, () => {
            if (this.app?.actionHandler?.handleRunAppFromDisk) {
              this.app.actionHandler.handleRunAppFromDisk(node);
            } else {
              this.app?.uiManager?.setStatus('handleRunAppFromDisk not implemented yet.', true);
            }
          }));
        }

        // Dependency management menu item
        if (node.id && !node.id.endsWith('files.json') && !node.id.endsWith('filelist.json')) {
          items.push(this._createMenuItem('➕ Add as Dependency...', null, () => this._handleAddAsDependencyPrompt(node)));
        }

        items.push(this._createMenuItem('Rename', null, () => this._handleRename(node)));
        items.push(this._createMenuItem('Delete', null, () => this._handleDelete(node)));

        if (this.app?.actionHandler?.handleOpenDocFor) {
          items.push(makeElement('div', {className: 'compact-menu-separator'}));
          items.push(this._createMenuItem('Open Docs', null, () =>
            this.app.actionHandler.handleOpenDocFor(node.id)
          ));
        }

        const parentDir = node.id.substring(0, node.id.lastIndexOf('/'));
        if (parentDir) {
          items.push(makeElement('div', {className: 'compact-menu-separator'}));
          items.push(this._createMenuItem('🌲 Walk this folder...', null, () => launchTreeWalker(parentDir)));
        }
      }

      this.contextMenu.show(targetX, targetY, items);
    }

  _showGlobalContextMenu(x, y) {
    const items = [];

    items.push(
      this._createMenuItem('Refresh Tree View', 'R', () => {
        this._refreshTreeViewOnly();
      })
    );

    items.push(makeElement('div', {className: 'compact-menu-separator'}));

    items.push(
      this._createMenuItem('Expand All', null, () => this._expandAll(true))
    );

    items.push(
      this._createMenuItem('Collapse All', null, () => this._expandAll(false))
    );

    items.push(makeElement('div', {className: 'compact-menu-separator'}));

    items.push(
      this._createMenuItem('Select All in This Tree', null, () =>
        this._handleTreeBulk(true, 'all')
      )
    );

    items.push(
      this._createMenuItem('Clear All in This Tree', null, () =>
        this._handleTreeBulk(false, 'all')
      )
    );

    this.contextMenu.show(x, y, items);
  }

  applyFilter(filterInput) {
    if (filterInput === null || filterInput === undefined || filterInput === '') {
      this.container.classList.remove('filtering');
      this.nodesMap.forEach((node) => {
        node.isFilteredOut = false;
      });
      this.currentLayout = this.calculateLayout();
      this._renderNodesFromLayout(this.currentLayout, true);
      this.redrawLines();
      if (this.app.visibilityManager) this.app.visibilityManager.notify();
      return;
    }

    this.container.classList.add('filtering');
    let idsToShow = new Set();

    if (typeof filterInput === 'string') {
      const term = filterInput.toLowerCase();
      this.nodesMap.forEach(node => {
        if (node.id.toLowerCase().includes(term) || node.name.toLowerCase().includes(term)) {
          idsToShow.add(node.id);
        }
      });
    } else {
      idsToShow = new Set(filterInput);
    }

    const ancestors = new Set();
    const descendants = new Set();

    idsToShow.forEach((id) => {
      let node = this.nodesMap.get(id);
      
      // If a folder matches, reveal all its descendants
      if (node && node.type === 'directory') {
        const addDescendants = (n) => {
          descendants.add(n.id);
          if (n.children) n.children.forEach(c => addDescendants(c));
        };
        addDescendants(node);
      }

      // Ensure parents are expanded so we can see the match
      while (node && node.parentNode) {
        node = node.parentNode;
        ancestors.add(node.id);
      }
    });

    this.nodesMap.forEach((node) => {
      const isMatch = idsToShow.has(node.id);
      const isAncestor = ancestors.has(node.id);
      const isDescendant = descendants.has(node.id);

      if (isMatch || isAncestor || isDescendant) {
        node.isFilteredOut = false;
        if (node.type === 'directory' && (isMatch || isAncestor)) {
          node.isExpanded = true;
          node.updateVisualState();
        }
      } else {
        node.isFilteredOut = true;
      }
    });

    this.currentLayout = this.calculateLayout();
    this._renderNodesFromLayout(this.currentLayout, true);
    this.redrawLines();

    if (this.app.visibilityManager) this.app.visibilityManager.notify();
  }

  _installTreeWidgetLayoutStyles() {
      const cssId = 'vibes-tree-widget-layout-final-fix';
      let style = document.getElementById(cssId);

      if (!style) {
        style = document.createElement('style');
        style.id = cssId;
        document.head.appendChild(style);
      }

      style.textContent = `
        .floating-panel-host,
        .floating-panel-host .tree-view-container,
        .floating-panel-host .file-tree {
          overflow-x: hidden !important;
        }

        .floating-panel-host .file-tree {
          width: 100% !important;
          min-width: 0 !important;
          overflow: visible !important;
          background: transparent !important;
        }

        .floating-panel-host .tree-node {
          box-sizing: border-box !important;
          max-width: 100% !important;
          min-width: 0 !important;
          background: transparent !important;
        }

        .floating-panel-host .tree-node-content {
          box-sizing: border-box !important;
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
          background-color: transparent !important;
          background-image: none !important;
        }

        .floating-panel-host .tree-node-content:hover {
          background-color: rgba(255,255,255,0.055) !important;
        }

        .floating-panel-host .tree-node.file.selected > .tree-node-content {
          background-color: rgba(0, 122, 204, 0.24) !important;
        }

        .floating-panel-host .tree-node.file.is-open > .tree-node-content {
          background-color: rgba(0, 122, 204, 0.14) !important;
        }

        .floating-panel-host .node-icon,
        .floating-panel-host .node-toggle {
          flex: 0 0 auto !important;
        }

        .floating-panel-host .node-name {
          flex: 1 1 auto !important;
          min-width: 80px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          background: transparent !important;
          position: relative !important;
          z-index: 1 !important;
        }

        .floating-panel-host .node-actions {
          flex: 0 0 auto !important;
          margin-left: auto !important;
          min-width: 0 !important;
          max-width: 210px !important;
          overflow: visible !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 4px !important;
          background: transparent !important;
          position: relative !important;
          z-index: 2 !important;
        }

        .floating-panel-host .visibility-widget-container {
          flex: 0 0 auto !important;
          width: auto !important;
          max-width: 205px !important;
          overflow: visible !important;
          background: transparent !important;
          position: relative !important;
          z-index: 3 !important;
        }

        .floating-panel-host .visibility-widget-container svg {
          display: block !important;
          max-width: 205px !important;
          overflow: visible !important;
          background: transparent !important;
        }

        .floating-panel-host .visibility-widget-container {
          display: block !important;
        }

        .floating-panel-host .file-tree-svg-layer {
          overflow: visible !important;
          pointer-events: none !important;
          background: transparent !important;
        }

        @container filetreehost (max-width: 380px) {
          .visibility-widget-container {
            display: none !important;
          }
          .node-actions {
            max-width: none !important;
          }
          .file-tree-toolbar .vis-tools-btn {
            display: none !important;
          }
        }
      `;

      return true;
    }

  _installWalkerHighlightStyles() {
    const cssId = "vibes-treewalker-node-highlight-styles";
    const css = `
      .tree-node.walker-current > .tree-node-content {
        outline: 1px solid rgba(110, 215, 255, 0.92) !important;
        border-color: rgba(110, 215, 255, 0.28) !important;
        background-color: rgba(35, 115, 210, 0.18) !important;
        box-shadow:
          inset 0 0 0 1px rgba(135, 210, 255, 0.25),
          0 0 18px rgba(55, 170, 255, 0.32) !important;
      }

      .tree-node.walker-pulse > .tree-node-content {
        animation: vibesTreeWalkerPulse 720ms ease-out 1;
      }

      .tree-node.walker-paused > .tree-node-content {
        outline: 2px solid rgba(255, 198, 122, 0.96) !important;
        border-color: rgba(255, 198, 122, 0.46) !important;
        background-color: rgba(130, 80, 24, 0.22) !important;
        box-shadow:
          0 0 20px rgba(255, 185, 105, 0.42),
          inset 0 0 0 1px rgba(255, 230, 160, 0.18) !important;
        animation: vibesTreeWalkerPausedBreath 1.35s ease-in-out infinite;
      }

      .tree-node.walker-breakpoint > .tree-node-content {
        outline: 1px solid rgba(255, 135, 230, 0.92) !important;
        border-color: rgba(255, 135, 230, 0.38) !important;
        background-color: rgba(130, 45, 115, 0.20) !important;
        box-shadow:
          0 0 16px rgba(255, 105, 220, 0.34),
          inset 3px 0 0 rgba(255, 135, 230, 0.92) !important;
      }

      .tree-node.walker-modified > .tree-node-content {
        border-left: 3px solid rgba(110, 255, 175, 0.95) !important;
        box-shadow:
          inset 3px 0 0 rgba(110, 255, 175, 0.92),
          0 0 14px rgba(80, 255, 165, 0.24) !important;
      }

      .tree-node.walker-program-write > .tree-node-content {
        box-shadow:
          inset 3px 0 0 rgba(0, 230, 118, 0.95),
          0 0 12px rgba(0, 230, 118, 0.25) !important;
      }

      .tree-node.walker-user-write > .tree-node-content {
        box-shadow:
          inset 3px 0 0 rgba(255, 210, 105, 0.95),
          0 0 12px rgba(255, 193, 7, 0.28) !important;
      }

      .tree-node.walker-skipped > .tree-node-content {
        opacity: 0.58 !important;
        filter: saturate(0.56) !important;
      }

      .tree-node.walker-error > .tree-node-content {
        outline: 1px solid rgba(255, 105, 125, 0.95) !important;
        border-color: rgba(255, 105, 125, 0.42) !important;
        background-color: rgba(140, 20, 35, 0.24) !important;
        box-shadow: 0 0 18px rgba(255, 90, 110, 0.38) !important;
      }

      .tree-node .walker-state-badge {
        flex: 0 0 auto;
        margin-left: 4px;
        padding: 1px 5px;
        border-radius: 999px;
        font-size: 9px;
        line-height: 13px;
        letter-spacing: 0.25px;
        font-weight: 800;
        color: #06111d;
        background: rgba(130, 210, 255, 0.94);
        box-shadow: 0 0 9px rgba(80, 180, 255, 0.32);
        pointer-events: none;
      }

      .tree-node.walker-paused .walker-state-badge {
        background: rgba(255, 198, 122, 0.96);
      }

      .tree-node.walker-breakpoint .walker-state-badge {
        background: rgba(255, 135, 230, 0.96);
      }

      .tree-node.walker-program-write .walker-state-badge,
      .tree-node.walker-modified .walker-state-badge {
        background: rgba(110, 255, 175, 0.94);
      }

      .tree-node.walker-user-write .walker-state-badge {
        background: rgba(255, 210, 105, 0.94);
      }

      .tree-node.walker-error .walker-state-badge {
        background: rgba(255, 105, 125, 0.96);
        color: #fff;
      }

      .tree-node.walker-skipped .walker-state-badge {
        background: rgba(150, 150, 150, 0.82);
        color: #111;
      }

      @keyframes vibesTreeWalkerPulse {
        0% {
          transform: translateX(0) scale(1);
          filter: brightness(1);
        }
        34% {
          transform: translateX(2px) scale(1.012);
          filter: brightness(1.38);
        }
        100% {
          transform: translateX(0) scale(1);
          filter: brightness(1);
        }
      }

      @keyframes vibesTreeWalkerPausedBreath {
        0%, 100% {
          box-shadow:
            0 0 14px rgba(255, 185, 105, 0.32),
            inset 0 0 0 1px rgba(255, 230, 160, 0.14) !important;
        }
        50% {
          box-shadow:
            0 0 25px rgba(255, 185, 105, 0.55),
            inset 0 0 0 1px rgba(255, 230, 160, 0.26) !important;
        }
      }
    `;

    if (typeof applyCss === "function") {
      applyCss(css, cssId);
      return true;
    }

    let style = document.getElementById(cssId);
    if (!style) {
      style = document.createElement("style");
      style.id = cssId;
      document.head.appendChild(style);
    }
    style.textContent = css;
    return true;
  }

  clearWalkerHighlights(options = {}) {
    this._installWalkerHighlightStyles?.();

    const classes = [
      "walker-current",
      "walker-pulse",
      "walker-paused",
      "walker-modified",
      "walker-program-write",
      "walker-user-write",
      "walker-skipped",
      "walker-error",
    ];

    if (options.keepBreakpoints === false) {
      classes.push("walker-breakpoint");
    }

    const keepModified = options.keepModified !== false;

    for (const node of this.nodesMap?.values?.() || []) {
      if (!node?.domElement) continue;

      const remove = keepModified
        ? classes.filter((name) => !["walker-modified", "walker-program-write", "walker-user-write"].includes(name))
        : classes;

      node.domElement.classList.remove(...remove);

      const badge = node.domElement.querySelector(".walker-state-badge");
      if (!badge) continue;

      const shouldKeepBadge =
        node.domElement.classList.contains("walker-breakpoint") ||
        node.domElement.classList.contains("walker-modified") ||
        node.domElement.classList.contains("walker-program-write") ||
        node.domElement.classList.contains("walker-user-write");

      if (!shouldKeepBadge || (!keepModified && options.keepBreakpoints === false)) {
        badge.remove();
      }
    }

    return true;
  }

  setNodeWalkerState(nodeId, state = "current", details = {}) {
    this._installWalkerHighlightStyles?.();

    const node = typeof nodeId === "string" ? this.nodesMap?.get?.(nodeId) : nodeId;
    if (!node) return {ok: false, reason: "node not found", nodeId};

    if (typeof node.render === "function" && !node.domElement) {
      try {
        node.render();
        if (this.treeElement && node.domElement && !node.domElement.parentElement) {
          this.treeElement.appendChild(node.domElement);
        }
      } catch (error) {}
    }

    const el = node.domElement;
    if (!el) return {ok: false, reason: "node has no domElement", nodeId: node.id};

    this._ensureWalkerNodeVisible?.(node.id);

    const stateClassByName = {
      current: "walker-current",
      visited: "walker-current",
      paused: "walker-paused",
      pause: "walker-paused",
      breakpoint: "walker-breakpoint",
      break: "walker-breakpoint",
      modified: "walker-modified",
      programmatic: "walker-program-write",
      programmaticWrite: "walker-program-write",
      programWrite: "walker-program-write",
      user: "walker-user-write",
      userWrite: "walker-user-write",
      skipped: "walker-skipped",
      error: "walker-error",
    };

    if (state === "clearBreakpoint") {
      el.classList.remove("walker-breakpoint");
      const badge = el.querySelector(".walker-state-badge");
      if (
        badge &&
        !el.classList.contains("walker-current") &&
        !el.classList.contains("walker-paused") &&
        !el.classList.contains("walker-modified") &&
        !el.classList.contains("walker-program-write") &&
        !el.classList.contains("walker-user-write") &&
        !el.classList.contains("walker-error")
      ) {
        badge.remove();
      }
      return {ok: true, nodeId: node.id, state};
    }

    if (details.clearCurrent !== false && ["current", "visited"].includes(state)) {
      for (const other of this.nodesMap?.values?.() || []) {
        if (other?.domElement && other !== node) {
          other.domElement.classList.remove("walker-current", "walker-pulse");
        }
      }
    }

    if (["paused", "pause"].includes(state)) {
      for (const other of this.nodesMap?.values?.() || []) {
        if (other?.domElement && other !== node) {
          other.domElement.classList.remove("walker-paused");
        }
      }
    }

    const className = stateClassByName[state] || stateClassByName.current;
    el.classList.add(className, "walker-pulse");

    clearTimeout(node._walkerPulseTimer);
    node._walkerPulseTimer = setTimeout(() => {
      try {
        el.classList.remove("walker-pulse");
      } catch (error) {}
    }, Number(details.pulseMs || 760));

    const label =
      details.label ||
      ({
        current: "WALK",
        visited: "WALK",
        paused: "PAUSE",
        pause: "PAUSE",
        breakpoint: "BREAK",
        break: "BREAK",
        modified: "MOD",
        programmatic: "PROG",
        programmaticWrite: "PROG",
        programWrite: "PROG",
        user: "USER",
        userWrite: "USER",
        skipped: "SKIP",
        error: "ERR",
      }[state] || String(state).toUpperCase().slice(0, 6));

    let badge = el.querySelector(".walker-state-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "walker-state-badge";
      const actions = el.querySelector(".node-actions");
      const name = el.querySelector(".node-name");

      if (actions) {
        actions.insertBefore(badge, actions.firstChild);
      } else if (name?.parentElement) {
        name.parentElement.appendChild(badge);
      } else {
        el.appendChild(badge);
      }
    }

    badge.textContent = label;
    badge.title = details.title || `${state}: ${node.id}`;

    if (details.flashOnly) {
      setTimeout(() => {
        try {
          el.classList.remove(className);
          if (badge && badge.parentElement) badge.remove();
        } catch (error) {}
      }, Number(details.flashMs || 1600));
    }

    return {ok: true, nodeId: node.id, state, className};
  }

  highlightNode(nodeId, options = {}) {
    this._installWalkerHighlightStyles?.();

    const node = this.nodesMap?.get?.(nodeId);
    if (!node) return {ok: false, reason: 'node not found', nodeId};

    const state = options.state || 'current';

    if (typeof this.ensureNodeVisible === 'function') {
      this.ensureNodeVisible(nodeId, () => {
        try {
          this.setNodeWalkerState(nodeId, state, options);
          this._scrollNodeIntoTreeView(nodeId, options);
        } catch (error) {}
      });
    } else {
      this.setNodeWalkerState(nodeId, state, options);
      this._scrollNodeIntoTreeView(nodeId, options);
    }

    return {ok: true, nodeId, state};
  }

  _ensureWalkerNodeVisible(nodeId) {
    const node = this.nodesMap?.get?.(nodeId);
    if (!node) return false;

    let parent = node.parentNode;
    const collapsed = [];

    while (parent) {
      if (parent.type === 'directory' && !parent.isExpanded) {
        collapsed.push(parent);
      }
      parent = parent.parentNode;
    }

    if (!collapsed.length) return true;

    collapsed.reverse();

    for (const dir of collapsed) {
      dir.isExpanded = true;
      try {
        dir.updateVisualState?.();
      } catch (error) {}
    }

    try {
      this.currentLayout = this.calculateLayout();
      this._renderNodesFromLayout(this.currentLayout, true);
      this._drawLinesInternal();
    } catch (error) {}

    return true;
  }

  _scrollNodeIntoTreeView(nodeId, options = {}) {
    const node = this.nodesMap?.get?.(nodeId);
    const el = node?.domElement;
    if (!el) return false;

    try {
      el.scrollIntoView({
        block: options.block || 'center',
        inline: 'nearest',
        behavior: options.behavior || 'smooth'
      });
      return true;
    } catch (error) {
      try {
        el.scrollIntoView();
        return true;
      } catch (inner) {
        return false;
      }
    }
  }

  

  _populateVisSetSelect() {
    if (!this.visSetOptGroup) return;

    // Remove old sets (keep the Save option)
    const toRemove = [];
    for (const child of this.visSetOptGroup.children) {
      if (child.value !== 'set:save') toRemove.push(child);
    }
    toRemove.forEach(c => c.remove());

    const names = this._getVisibilitySetNames();

    if (!names.length) {
      this.visSetOptGroup.appendChild(
        makeElement('option', {value: '', disabled: true}, '(No saved sets)')
      );
      return;
    }

    for (const name of names) {
      this.visSetOptGroup.appendChild(
        makeElement('option', {value: 'set:load:' + name}, 'Load: ' + name)
      );
    }
  }

  applyVisibilitySet(settings, setName) {
    const cleanSettings = this._normalizeVisibilitySetSettings(settings);
    let applied = 0;
    let missed = 0;

    // First reset all widgets that aren't in the set to match expected visibility set behavior
    for (const node of this.nodesMap.values()) {
      if (node.type === 'file' && node.visibilityWidget) {
        if (!cleanSettings[node.id]) {
          node.visibilityWidget.setState({
            code: false,
            codeLevel: 0,
            signatures: false,
            sig: false,
            docs: false,
            docsLevel: 0
          }, true);
        }
      }
    }

    for (const [path, state] of Object.entries(cleanSettings)) {
      const node = this.nodesMap.get(path);

      if (node && node.visibilityWidget) {
        node.visibilityWidget.setState(state, true);
        applied++;
      } else {
        missed++;
      }
    }

    this.redrawLines?.();

    if (this.app?.buildPromptTab?._widgetStateChangeCallback) {
      this.app.buildPromptTab._widgetStateChangeCallback();
    }

    if (this.app?.visibilityManager?.notify) {
      this.app.visibilityManager.notify();
    }

    if (this.app?.uiManager) {
      const label = setName ? `"${setName}"` : 'visibility set';
      this.app.uiManager.setStatus(
        `Applied ${label} to tree: ${applied} matched${missed ? `, ${missed} missed` : ''}.`
      );
    }

    return {
      ok: true,
      setName: setName || null,
      applied,
      missed
    };
  }

  _handleTreeBulk(isSelect, type) {
      if (!this.app || !this.app.buildPromptTab) return;

      const localWidgets = this.getAllVisibilityWidgets();

      localWidgets.forEach((w) => {
        const newState = {...w.state};

        if (type === 'all' || type === 'code') {
          newState.code = isSelect;
          newState.codeLevel = isSelect ? 4 : 0;
          if (type === 'all') newState.signatures = isSelect;
        }

        if (type === 'signatures') {
          newState.signatures = isSelect;
        }

        if (type === 'all' || type === 'docs') {
          newState.docsLevel = isSelect ? 4 : 0;
        }

        w.setState(newState, true); // Passed true (silent) to prevent re-entrant UI block
      });

      this.app.buildPromptTab._widgetStateChangeCallback?.();
      
      if (this.app?.visibilityManager?.notify) {
        this.app.visibilityManager.notify();
      }

      let msg = isSelect ? 'Selected ' : 'Cleared ';
      if (type === 'all') msg += 'all files in tree.';
      else if (type === 'code') msg += 'code on all files in tree.';
      else if (type === 'signatures') msg += 'signatures on all files in tree.';
      else if (type === 'docs') msg += 'docs on all files in tree.';

      this.app.uiManager?.setStatus?.(msg);
    }

  _getVisibilitySetNames() {
    return this._getVisibilitySetSummaries()
      .map((summary) => summary.name)
      .filter(Boolean);
  }

  _getVisibilitySetByName(name) {
    const wanted = String(name || '');
    const capsule = this._getVisibilitySetsCapsuleRuntime();

    if (!capsule || !wanted) return null;

    const summaries = this._getVisibilitySetSummaries();
    const summary = summaries.find((item) => {
      return item.name === wanted || item.methodName === wanted;
    });

    if (!summary) return null;

    if (summary.methodName && typeof capsule[summary.methodName] === 'function') {
      try {
        const set = capsule[summary.methodName]();
        if (set && typeof set === 'object') return set;
      } catch (error) {}
    }

    return {
      name: summary.name,
      savedAt: summary.savedAt,
      treeRoot: summary.treeRoot,
      treeLabel: summary.treeLabel,
      fileCount: summary.fileCount,
      settings: summary.settings || {},
    };
  }

  async _loadVisibilitySetFromPickerValue(name) {
    await this._ensureVisibilitySetsCapsuleRuntime();

    const setObj = this._getVisibilitySetByName(name);

    if (setObj) {
      const settings = this._normalizeVisibilitySetSettings(setObj);
      const count = Object.keys(settings).length;

      if (count > 0) {
        this.applyVisibilitySet(settings, setObj.name || name);
        return {
          ok: true,
          source: 'lazy-loaded /vibes/VisibilitySetsCapsule.js',
          name: setObj.name || name,
          count,
        };
      }

      return {
        ok: false,
        reason: 'Visibility set had no settings: ' + name,
        name,
      };
    }

    return {
      ok: false,
      reason: 'Visibility set not found: ' + name,
      name,
    };
  }

  _normalizeVisibilitySetSettings(setObj) {
    if (!setObj) return {};

    if (setObj.settings && typeof setObj.settings === 'object') {
      return this._normalizeVisibilityStateMap(setObj.settings);
    }

    if (setObj.data && setObj.data.settings && typeof setObj.data.settings === 'object') {
      return this._normalizeVisibilityStateMap(setObj.data.settings);
    }

    if (setObj.data && typeof setObj.data === 'object') {
      const fromData = this._normalizeVisibilityStateMap(setObj.data);
      if (Object.keys(fromData).length) return fromData;
    }

    if (Array.isArray(setObj.items)) {
      return this._normalizeVisibilityItems(setObj.items);
    }

    if (setObj.files && typeof setObj.files === 'object' && !Array.isArray(setObj.files)) {
      return this._normalizeVisibilityStateMap(setObj.files);
    }

    if (setObj.files && typeof setObj.files === 'object' && !Array.isArray(setObj.files)) {
      return this._normalizeVisibilityStateMap(setObj.files);
    }

    if (setObj.files && typeof setObj.files === 'object' && !Array.isArray(setObj.files)) {
      return this._normalizeVisibilityStateMap(setObj.files);
    }

    if (Array.isArray(setObj.files)) {
      return this._normalizeVisibilityItems(setObj.files);
    }

    if (Array.isArray(setObj.paths)) {
      return this._normalizeVisibilityItems(setObj.paths);
    }

    return this._normalizeVisibilityStateMap(setObj);
  }

  _normalizeVisibilityItems(items) {
    const settings = {};

    for (const item of items || []) {
      if (!item) continue;

      if (typeof item === 'string') {
        settings[item] = {
          code: true,
          codeLevel: 4,
          signatures: false,
          docsLevel: 0
        };
        continue;
      }

      const path = item.path || item.file || item.id || item.name;
      if (!path) continue;

      const rawState = item.state || item.visibility || item;
      settings[path] = this._normalizeVisibilityState(rawState);
    }

    return settings;
  }

  _normalizeVisibilityStateMap(map) {
    const settings = {};

    for (const [path, rawState] of Object.entries(map || {})) {
      if (!path || !String(path).startsWith('/')) continue;
      settings[path] = this._normalizeVisibilityState(rawState);
    }

    return settings;
  }

  _normalizeVisibilityState(rawState) {
    const state = rawState && typeof rawState === 'object' ? rawState : {};

    let codeLevel = Number(state.codeLevel);
    if (!Number.isFinite(codeLevel)) {
      codeLevel = state.code ? 4 : 0;
    }
    codeLevel = Math.max(0, Math.min(4, codeLevel));

    let docsLevel = Number(state.docsLevel);
    if (!Number.isFinite(docsLevel)) {
      docsLevel = state.docs ? 4 : 0;
    }
    docsLevel = Math.max(0, Math.min(4, docsLevel));

    const code = !!state.code || codeLevel > 0;
    const docs = !!state.docs || docsLevel > 0;
    const signatures = !!(state.signatures || state.sig);

    return {
      code,
      codeLevel: code ? codeLevel || 4 : 0,
      signatures,
      sig: signatures,
      docs,
      docsLevel: docs ? docsLevel || 4 : 0
    };
  }

  _refreshTreeViewOnly() {
    try {
      if (this.contextMenu && typeof this.contextMenu.hide === 'function') {
        this.contextMenu.hide();
      }

      if (typeof this.calculateLayout === 'function') {
        this.currentLayout = this.calculateLayout();
      }

      if (
        this.currentLayout &&
        typeof this._renderNodesFromLayout === 'function'
      ) {
        this._renderNodesFromLayout(this.currentLayout, true);
      }

      if (typeof this.redrawLines === 'function') {
        this.redrawLines();
      } else if (typeof this._drawLinesInternal === 'function') {
        this._drawLinesInternal();
      }

      if (this.app?.visibilityManager?.notify) {
        this.app.visibilityManager.notify();
      }

      if (this.app?.uiManager?.setStatus) {
        this.app.uiManager.setStatus('Tree view refreshed without reloading the page.');
      }

      return {
        ok: true,
        action: 'refresh-tree-view-only'
      };
    } catch (error) {
      if (this.app?.uiManager?.setStatus) {
        this.app.uiManager.setStatus(
          `Tree refresh failed: ${error.message}`,
          true
        );
      }

      return {
        ok: false,
        error: error.message
      };
    }
  }

  async _promptSaveVisibilitySet() {
    const name = prompt('Enter a name for this tree visibility set:');
    if (!name) return null;

    const settings = {};

    for (const node of this.nodesMap.values()) {
      if (node.type !== 'file' || !node.visibilityWidget?.state) continue;

      const state = this._normalizeVisibilityState(node.visibilityWidget.state);

      const active =
        Number(state.codeLevel || 0) > 0 ||
        Number(state.docsLevel || 0) > 0 ||
        state.sig === true ||
        state.signatures === true ||
        state.code === true ||
        state.docs === true;

      if (active) {
        settings[node.id] = state;
      }
    }

    try {
      const result = await this._saveVisibilitySetToCapsule(name, settings);
      this.app?.uiManager?.setStatus?.(
        'Saved tree visibility set "' +
        result.name +
        '" into /vibes/VisibilitySetsCapsule.js with ' +
        result.fileCount +
        ' active file(s).'
      );

      return result;
    } catch (error) {
      this.app?.uiManager?.setStatus?.(
        'Failed to save visibility set: ' + error.message,
        true
      );
      return null;
    }
  }

  // Neuter the legacy visibility tools dialog opener
    _showVisibilityToolsMenu() {
      console.log("Legacy visibility tools dialog has been permanently decommissioned.");
      return null;
    }

  ensureVisibilitySetToolbar(options = {}) {
    if (this.visibilitySetToolbar && this.visibilitySetToolbar.root && this.visibilitySetToolbar.root.isConnected) {
      if (options.refresh !== false) {
        this.refreshVisibilitySetToolbar();
      }

      return this.visibilitySetToolbar;
    }

    const toolbar = this._createVisibilitySetToolbarElement(options);
    const host = this._findVisibilitySetToolbarHost();

    if (!host) {
      return null;
    }

    if (host.firstChild) {
      host.insertBefore(toolbar.root, host.firstChild);
    } else {
      host.appendChild(toolbar.root);
    }

    this.visibilitySetToolbar = toolbar;
    this.refreshVisibilitySetToolbar();

    return toolbar;
  }

  async refreshVisibilitySetToolbar() {
    const toolbar = this.visibilitySetToolbar || this.ensureVisibilitySetToolbar({refresh: false});

    if (!toolbar || !toolbar.select) {
      return [];
    }

    const manager = this._getVisibilitySetToolbarManager();

    if (!manager || typeof manager.listStoredVisibilitySetSummaries !== "function") {
      toolbar.select.innerHTML = "";
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No visibility set manager";
      toolbar.select.appendChild(option);
      this._setVisibilitySetToolbarStatus("No manager");
      return [];
    }

    const currentValue = toolbar.select.value;
    const allSetsRaw = await manager.listStoredVisibilitySetSummaries();
    const allSets = await this._visibilityToolbarHydrateSetSummaries(allSetsRaw, manager);
    const treeIdentity = this._visibilityToolbarTreeIdentity();
    const sets = this._visibilityToolbarFilterSetsForTree(allSets, treeIdentity);

    toolbar.select.innerHTML = "";

    if (!sets.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = treeIdentity.rootId
        ? "No saved sets for " + treeIdentity.rootId
        : "No saved visibility sets";
      toolbar.select.appendChild(option);

      this._setVisibilitySetToolbarStatus(
        treeIdentity.rootId
          ? "No saved sets for " + treeIdentity.rootId
          : "No saved sets"
      );

      if (toolbar.applyButton) {
        toolbar.applyButton.disabled = true;
      }

      return [];
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = treeIdentity.rootId
      ? "Choose set for " + treeIdentity.rootId
      : "Choose visibility set";
    toolbar.select.appendChild(placeholder);

    for (const set of sets) {
      const option = document.createElement("option");
      option.value = set.name || "";
      option.textContent = this._visibilityToolbarFormatScopedSetLabel(set, treeIdentity);
      option.dataset.treeRoot = set.treeRoot || "";
      option.dataset.treeLabel = set.treeLabel || "";
      option.dataset.fileCount = String(set.fileCount || 0);
      toolbar.select.appendChild(option);
    }

    if (currentValue && sets.some(set => set.name === currentValue)) {
      toolbar.select.value = currentValue;
    } else {
      toolbar.select.value = "";
    }

    if (toolbar.applyButton) {
      toolbar.applyButton.disabled = !toolbar.select.value;
    }

    this._setVisibilitySetToolbarStatus(
      sets.length +
      " set(s)" +
      (treeIdentity.rootId ? " for " + treeIdentity.rootId : "")
    );

    return sets;
  }

  _createVisibilitySetToolbarElement(options = {}) {
    const root = document.createElement("div");
    root.className = "file-tree-visibility-set-toolbar";
    root.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:6px",
      "padding:6px 8px",
      "margin:0 0 6px 0",
      "border:1px solid rgba(120,160,255,0.35)",
      "border-radius:10px",
      "background:rgba(20,25,40,0.72)",
      "box-shadow:0 0 14px rgba(80,130,255,0.18)",
      "font-size:12px",
      "color:#dfe7ff",
      "position:sticky",
      "top:0",
      "z-index:5",
      "backdrop-filter:blur(8px)"
    ].join(";");

    const label = document.createElement("span");
    label.textContent = "Visibility Set:";
    label.style.cssText = [
      "white-space:nowrap",
      "opacity:0.9",
      "font-weight:600"
    ].join(";");

    const select = document.createElement("select");
    select.className = "file-tree-visibility-set-select";
    select.style.cssText = [
      "min-width:180px",
      "max-width:280px",
      "flex:1 1 auto",
      "background:rgba(8,12,24,0.92)",
      "color:#eef3ff",
      "border:1px solid rgba(140,170,255,0.45)",
      "border-radius:7px",
      "padding:4px 6px",
      "font-size:12px"
    ].join(";");

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.textContent = "↻";
    refreshButton.title = "Refresh saved visibility sets";
    refreshButton.style.cssText = [
      "border:1px solid rgba(140,170,255,0.45)",
      "border-radius:7px",
      "background:rgba(60,80,130,0.55)",
      "color:#eef3ff",
      "padding:4px 7px",
      "cursor:pointer"
    ].join(";");

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = "Apply to this tree";
    applyButton.title = "Apply selected saved visibility set only to this tree";
    applyButton.style.cssText = [
      "border:1px solid rgba(140,170,255,0.5)",
      "border-radius:7px",
      "background:linear-gradient(135deg, rgba(80,110,210,0.75), rgba(110,70,190,0.72))",
      "color:white",
      "padding:4px 9px",
      "cursor:pointer",
      "white-space:nowrap"
    ].join(";");

    const status = document.createElement("span");
    status.className = "file-tree-visibility-set-status";
    status.textContent = "";
    status.style.cssText = [
      "white-space:nowrap",
      "font-size:11px",
      "opacity:0.72",
      "min-width:70px"
    ].join(";");

    refreshButton.addEventListener("click", () => {
      this.refreshVisibilitySetToolbar();
    });

    select.addEventListener("change", () => {
      applyButton.disabled = !select.value;
      this._setVisibilitySetToolbarStatus(select.value ? "Ready" : "Choose set");
    });

    applyButton.addEventListener("click", () => {
      this._handleApplyVisibilitySetToThisTree();
    });

    root.appendChild(label);
    root.appendChild(select);
    root.appendChild(refreshButton);
    root.appendChild(applyButton);
    root.appendChild(status);

    return {
      root,
      label,
      select,
      refreshButton,
      applyButton,
      status,
      options
    };
  }

  _findVisibilitySetToolbarHost() {
    const candidates = [
      this.containerElement,
      this.container,
      this.element,
      this.rootElement
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.appendChild) {
        return candidate;
      }
    }

    return null;
  }

  _getVisibilitySetToolbarManager() {
    const app = this.options && this.options.app ? this.options.app : this.app;

    if (app && app.projectFilesManager) {
      return app.projectFilesManager;
    }

    if (this.projectFilesManager) {
      return this.projectFilesManager;
    }

    if (typeof projectFilesManager !== "undefined") {
      return projectFilesManager;
    }

    if (typeof pfm !== "undefined") {
      return pfm;
    }

    return null;
  }

  async _handleApplyVisibilitySetToThisTree() {
    const toolbar = this.visibilitySetToolbar;

    if (!toolbar || !toolbar.select) {
      return;
    }

    const name = toolbar.select.value;

    if (!name) {
      this._setVisibilitySetToolbarStatus("Choose set");
      return;
    }

    const manager = this._getVisibilitySetToolbarManager();

    if (!manager || typeof manager.applyStoredVisibilitySetToTree !== "function") {
      this._setVisibilitySetToolbarStatus("No scoped apply");
      return;
    }

    toolbar.applyButton.disabled = true;
    this._setVisibilitySetToolbarStatus("Applying…");

    try {
      const result = await manager.applyStoredVisibilitySetToTree(name, this, {
        reason: "FileTreeView visibility toolbar"
      });

      if (!result || !result.ok) {
        this._setVisibilitySetToolbarStatus(result && result.error ? result.error : "Apply failed");
        return;
      }

      this._setVisibilitySetToolbarStatus("Applied " + result.applied + "/" + result.widgetCount);
    } catch (error) {
      this._setVisibilitySetToolbarStatus(error && error.message ? error.message : String(error));
    } finally {
      toolbar.applyButton.disabled = !toolbar.select.value;
    }
  }

  _setVisibilitySetToolbarStatus(message) {
    const toolbar = this.visibilitySetToolbar;

    if (toolbar && toolbar.status) {
      toolbar.status.textContent = String(message || "");
    }
  }

  _getTreePaintSegments(contentRoot = null) {
    const root =
      contentRoot ||
      this._visibilityToolsDialog?.element ||
      document;

    const read = (key) => {
      const input = root.querySelector?.('input[data-paint-segment="' + key + '"]');
      return input ? input.checked : true;
    };

    return {
      code: read('code'),
      sig: read('sig'),
      docs: read('docs')
    };
  }

  _ensureTreeGlowDrawer(mode = 'add') {
    const widgets = this.getAllVisibilityWidgets();

    if (!this._treeGlowDrawer) {
      this._treeGlowDrawer = new GlowDrawer({
        target: document.body,
        targets: widgets,
        initialMode: mode,
        onDeactivate: () => {
          if (this._visibilityToolsDialog?.element) {
            const active = this._visibilityToolsDialog.element.querySelectorAll(
              '.tree-paint-active'
            );
            active.forEach((el) => el.classList.remove('tree-paint-active'));
          }
        }
      });
    }

    this._treeGlowDrawer.options.targets = widgets;
    this._treeGlowDrawer.setMode?.(mode);
    this._treeGlowDrawer.setSegments?.(this._getTreePaintSegments());

    return this._treeGlowDrawer;
  }

  _setTreePaintMode(mode, statusElement = null) {
    const drawer = this._ensureTreeGlowDrawer(mode);

    if (!drawer.overlay || !drawer.overlay.isConnected) {
      drawer.activate(this.treeElement || this.container);
    }

    drawer.setMode?.(mode);
    drawer.setSegments?.(this._getTreePaintSegments());

    if (statusElement) {
      statusElement.textContent =
        mode === 'subtract'
          ? 'Paint remove active for this tree.'
          : 'Paint add active for this tree.';
    }

    return true;
  }

  _deactivateTreeGlowDrawer() {
    if (this._treeGlowDrawer) {
      this._treeGlowDrawer.deactivate?.();
      this._treeGlowDrawer = null;
    }
    return true;
  }

  _getVisibilitySetsCapsulePath() {
    return '/vibes/VisibilitySetsCapsule.js';
  }

  async _saveVisibilitySetToCapsule(name, settings) {
    // Single canonical write path - AppCommands → ClientJSClassPatcher.transplant
    const app = this.app || this.options?.app;
    if (!app?.commands?.saveVisibilitySet) {
      throw new Error('AppCommands.saveVisibilitySet not available.');
    }

    const treeRoot =
      this.rootId ||
      this.storeRootId ||
      this.rootPath ||
      this.rootNodes?.[0]?.id ||
      null;

    const treeLabel =
      this.displayName ||
      this.name ||
      this.options?.displayName ||
      this.options?.title ||
      null;

    const cleanName = String(name || '').trim();
    if (!cleanName) throw new Error('Visibility set name was empty.');

    await app.commands.saveVisibilitySet({
      name: cleanName,
      files: settings || {},
      treeRoot,
      treeLabel,
      fileCount: Object.keys(settings || {}).length,
    });

    return {
      name: cleanName,
      treeRoot,
      treeLabel,
      fileCount: Object.keys(settings || {}).length,
      files: settings || {},
    };
  }

  _createVisibilitySetMethodSource(methodName, payload) {
    const json = JSON.stringify(payload, null, 2);
    const indented = json
      .split('\n')
      .map((line) => '    ' + line)
      .join('\n');

    return `  static ${methodName}() {
    return ${indented.trim()};
  }`;
  }

  _visibilitySetMethodName(name) {
    return '_set_' + this._sanitizeVisibilitySetMethodSuffix(name);
  }

  _sanitizeVisibilitySetMethodSuffix(name) {
    const raw = String(name || '').trim();
    let out = '';

    for (const ch of raw) {
      const code = ch.charCodeAt(0);
      const isUpper = code >= 65 && code <= 90;
      const isLower = code >= 97 && code <= 122;
      const isDigit = code >= 48 && code <= 57;

      if (isUpper || isLower || isDigit) {
        out += ch;
      } else {
        out += '_';
      }
    }

    while (out.includes('__')) {
      out = out.split('__').join('_');
    }

    out = out.replaceAll('_', ' ').trim().replaceAll(' ', '_');

    if (!out) out = 'Untitled';
    if (out.charCodeAt(0) >= 48 && out.charCodeAt(0) <= 57) {
      out = 'Set_' + out;
    }

    return out;
  }

  async _refreshVisibilitySetSelect(select, statusElement = null) {
    if (!select) return [];

    await this._ensureVisibilitySetsCapsuleRuntime();

    const allSummaries = this._getVisibilitySetSummaries();
    const treeRoot =
      this.rootId ||
      this.storeRootId ||
      this.rootPath ||
      this.rootNodes?.[0]?.id ||
      null;

    const summaries = allSummaries.filter((summary) => {
      if (!summary.treeRoot) return false;
      return summary.treeRoot === treeRoot;
    });

    select.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = summaries.length
      ? 'Load saved set into this tree...'
      : 'No saved sets for this tree';
    select.appendChild(defaultOption);

    for (const summary of summaries) {
      const option = document.createElement('option');
      option.value = summary.name || summary.methodName || '';
      option.textContent = this._formatVisibilitySetOptionLabel(summary);
      select.appendChild(option);
    }

    if (statusElement) {
      const capsule = this._getVisibilitySetsCapsuleRuntime();
      const methodCount = this._countRuntimeVisibilitySetMethods(capsule);

      statusElement.textContent =
        summaries.length +
        ' saved set(s) for ' +
        (treeRoot || 'this tree') +
        ' · ' +
        methodCount +
        ' total capsule _set_* method(s).';
    }

    return summaries;
  }

  _formatVisibilitySetOptionLabel(summary) {
    const parts = [];
    parts.push(summary.name || summary.methodName || '(unnamed)');

    if (summary.isRecent) parts.push('recent');
    if (summary.fileCount != null) parts.push(summary.fileCount + ' files');
    if (summary.treeRoot) parts.push(summary.treeRoot);

    return parts.join(' · ');
  }

  _getVisibilitySetSummaries() {
    const capsule = this._getVisibilitySetsCapsuleRuntime();

    if (!capsule) return [];

    const methodNames = Object.getOwnPropertyNames(capsule).filter((name) => {
      return name.startsWith('_set_') && typeof capsule[name] === 'function';
    });

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const summaries = [];

    for (const methodName of methodNames) {
      let set = null;

      try {
        set = capsule[methodName]();
      } catch (error) {
        set = null;
      }

      const derivedName = this._decodeVisibilitySetMethodName(methodName);
      const name =
        set && typeof set === 'object' && set.name
          ? String(set.name)
          : derivedName;

      const settings =
        set &&
          typeof set === 'object' &&
          set.settings &&
          typeof set.settings === 'object'
          ? set.settings
          : {};

      const savedAt =
        set && typeof set === 'object' && set.savedAt
          ? String(set.savedAt)
          : '';

      const savedMs = Date.parse(savedAt) || 0;

      summaries.push({
        name,
        methodName,
        savedAt,
        savedMs,
        isRecent: savedMs > 0 && now - savedMs <= oneHour,
        fileCount:
          set && typeof set === 'object' && set.fileCount != null
            ? set.fileCount
            : Object.keys(settings).length,
        treeRoot:
          set && typeof set === 'object' && set.treeRoot
            ? set.treeRoot
            : null,
        treeLabel:
          set && typeof set === 'object' && set.treeLabel
            ? set.treeLabel
            : null,
        settings,
      });
    }

    summaries.sort((a, b) => {
      if (a.isRecent !== b.isRecent) return a.isRecent ? -1 : 1;
      if (a.isRecent && b.isRecent) return b.savedMs - a.savedMs;
      return String(a.name).localeCompare(String(b.name));
    });

    return summaries;
  }

  _getVisibilitySetsCapsuleRuntime() {
    if (typeof window !== 'undefined' && window.VisibilitySetsCapsule) {
      return window.VisibilitySetsCapsule;
    }

    if (typeof globalThis !== 'undefined' && globalThis.VisibilitySetsCapsule) {
      return globalThis.VisibilitySetsCapsule;
    }

    return null;
  }

  _decodeVisibilitySetMethodName(methodName) {
    let suffix = String(methodName || '');

    if (suffix.startsWith('_set_')) {
      suffix = suffix.slice(5);
    }

    suffix = suffix.split('_').join(' ').trim();

    return suffix || methodName || '(unnamed)';
  }

  _countRuntimeVisibilitySetMethods(capsule) {
    if (!capsule) return 0;

    return Object.getOwnPropertyNames(capsule).filter((name) => {
      return name.startsWith('_set_') && typeof capsule[name] === 'function';
    }).length;
  }

  async _readVisibilitySetsCapsuleSource(capsulePath) {
    if (this.app?.projectFilesManager?.getFileContent) {
      try {
        const content = await this.app.projectFilesManager.getFileContent(capsulePath);
        if (typeof content === 'string' && content.trim()) return content;
      } catch (error) {}
    }

    if (this.app?.inMemoryFileStore?.has?.(capsulePath)) {
      const content = this.app.inMemoryFileStore.get(capsulePath);
      if (typeof content === 'string' && content.trim()) return content;
    }

    if (this.app?.workspaceFileStores) {
      const rootId = '/' + capsulePath.split('/').filter(Boolean)[0];
      const store = this.app.workspaceFileStores.get(rootId);
      if (store?.get) {
        try {
          const content = await store.get(capsulePath);
          if (typeof content === 'string' && content.trim()) return content;
        } catch (error) {}
      }
    }

    return null;
  }

  async _ensureVisibilitySetsCapsuleRuntime() {
    const existing = this._getVisibilitySetsCapsuleRuntime();

    if (this._countRuntimeVisibilitySetMethods(existing) > 0) {
      return existing;
    }

    const capsulePath =
      typeof this._getVisibilitySetsCapsulePath === 'function'
        ? this._getVisibilitySetsCapsulePath()
        : '/vibes/VisibilitySetsCapsule.js';

    const source = await this._readVisibilitySetsCapsuleSource(capsulePath);

    if (!source || !source.includes('class VisibilitySetsCapsule')) {
      return existing || null;
    }

    const Capsule = this._evaluateVisibilitySetsCapsuleSource(source);

    if (Capsule) {
      if (typeof window !== 'undefined') {
        window.VisibilitySetsCapsule = Capsule;
      }

      if (typeof globalThis !== 'undefined') {
        globalThis.VisibilitySetsCapsule = Capsule;
      }

      return Capsule;
    }

    return existing || null;
  }

  _evaluateVisibilitySetsCapsuleSource(source) {
    try {
      return new Function(source + '\nreturn VisibilitySetsCapsule;')();
    } catch (error) {
      this.app?.uiManager?.setStatus?.(
        'Could not evaluate VisibilitySetsCapsule.js: ' + error.message,
        true
      );
      return null;
    }
  }

  _visibilityToolbarTreeIdentity() {
    const manager = this._getVisibilitySetToolbarManager();

    if (manager && typeof manager.getTreeIdentity === "function") {
      try {
        const identity = manager.getTreeIdentity(this);
        if (identity && typeof identity === "object") {
          return {
            rootId: this._visibilityToolbarNormalizeRoot(
              identity.rootId || identity.root || identity.storeRootId || identity.projectRootId
            ),
            label:
              identity.label ||
              identity.displayName ||
              identity.name ||
              identity.rootLabel ||
              "",
            raw: identity
          };
        }
      } catch (error) {
        // Fall through to local inference.
      }
    }

    const options = this.options && typeof this.options === "object" ? this.options : {};
    const optionRoot = this._visibilityToolbarNormalizeRoot(
      options.rootId ||
      options.workspaceRootId ||
      options.storeRootId ||
      options.projectRootId
    );

    if (optionRoot) {
      return {
        rootId: optionRoot,
        label:
          options.label ||
          options.title ||
          options.displayName ||
          options.rootLabel ||
          optionRoot,
        raw: {source: "tree.options"}
      };
    }

    const inferred = this._visibilityToolbarInferRootFromNodes();

    return {
      rootId: inferred,
      label: inferred || "",
      raw: {source: "nodesMap"}
    };
  }

  _visibilityToolbarInferRootFromNodes() {
    if (!this.nodesMap || typeof this.nodesMap.keys !== "function") {
      return null;
    }

    const counts = new Map();

    for (const key of this.nodesMap.keys()) {
      if (typeof key !== "string" || !key.startsWith("/")) {
        continue;
      }

      const root = this._visibilityToolbarRootForPath(key);
      if (!root) {
        continue;
      }

      counts.set(root, (counts.get(root) || 0) + 1);
    }

    let bestRoot = null;
    let bestCount = 0;

    for (const [root, count] of counts.entries()) {
      if (count > bestCount) {
        bestRoot = root;
        bestCount = count;
      }
    }

    return bestRoot;
  }

  _visibilityToolbarFilterSetsForTree(allSets, treeIdentity = null) {
    const sets = Array.isArray(allSets) ? allSets : [];
    const treeRoot = this._visibilityToolbarNormalizeRoot(treeIdentity?.rootId);

    if (!treeRoot) {
      return sets.slice();
    }

    return sets.filter(set => {
      const setRoot = this._visibilityToolbarNormalizeRoot(set?.treeRoot);

      if (setRoot) {
        return setRoot === treeRoot;
      }

      const roots = this._visibilityToolbarRootsForSetSummary(set);

      if (roots.length > 0) {
        return roots.includes(treeRoot);
      }

      return true;
    });
  }

  _visibilityToolbarFormatScopedSetLabel(set, treeIdentity = null) {
    const baseName = set?.name || "(unnamed set)";
    const fileCount = Number(set?.fileCount);
    const setRoot = this._visibilityToolbarNormalizeRoot(set?.treeRoot);
    const roots = this._visibilityToolbarRootsForSetSummary(set);
    const treeRoot = this._visibilityToolbarNormalizeRoot(treeIdentity?.rootId);

    const parts = [baseName];

    if (Number.isFinite(fileCount)) {
      parts.push(fileCount + " files");
    }

    if (setRoot && treeRoot && setRoot !== treeRoot) {
      parts.push(setRoot);
    } else if (!setRoot && roots.length > 1) {
      parts.push(roots.join("+"));
    } else if (!setRoot && roots.length === 0) {
      parts.push("global");
    }

    return parts.join(" · ");
  }

  _visibilityToolbarNormalizeRoot(root) {
    if (typeof root !== "string") {
      return null;
    }

    const trimmed = root.trim();

    if (!trimmed) {
      return null;
    }

    const first = trimmed.split("/").filter(Boolean)[0];

    if (!first) {
      return null;
    }

    return "/" + first;
  }

  _visibilityToolbarRootForPath(path) {
    if (typeof path !== "string") {
      return null;
    }

    const first = path.split("/").filter(Boolean)[0];

    return first ? "/" + first : null;
  }

  _visibilityToolbarRootsForSetSummary(set) {
    const rawRoots = Array.isArray(set?.treeRoots) ? set.treeRoots : [];
    const roots = rawRoots
      .map(root => this._visibilityToolbarNormalizeRoot(root))
      .filter(Boolean);

    return Array.from(new Set(roots)).sort();
  }

  async _visibilityToolbarHydrateSetSummaries(allSets, manager) {
    const sets = Array.isArray(allSets) ? allSets : [];

    if (!manager || typeof manager.readStoredVisibilitySetByName !== "function") {
      return sets;
    }

    const hydrated = [];

    for (const item of sets) {
      if (!item || !item.name) {
        hydrated.push(item);
        continue;
      }

      const currentFileCount = Number(item.fileCount || 0);

      if (currentFileCount > 0 && item.treeRoot) {
        hydrated.push(item);
        continue;
      }

      try {
        const raw = await manager.readStoredVisibilitySetByName(item.name);
        const set =
          raw?.files ? raw :
            raw?.set?.files ? raw.set :
              raw?.visibilitySet?.files ? raw.visibilitySet :
                raw?.result?.files ? raw.result :
                  raw?.data?.files ? raw.data :
                    raw?.data?.set?.files ? raw.data.set :
                      null;

        if (set?.files) {
          const filePaths = Object.keys(set.files);
          const inferredRoot =
            set.treeRoot ||
            item.treeRoot ||
            (filePaths[0] ? "/" + String(filePaths[0]).split("/").filter(Boolean)[0] : "");

          hydrated.push({
            ...item,
            ...set,
            name: item.name || set.name,
            id: item.id || set.id,
            treeRoot: inferredRoot,
            treeRoots: set.treeRoots || item.treeRoots || (inferredRoot ? [inferredRoot] : []),
            fileCount: filePaths.length,
            patternCount: Array.isArray(set.patterns) ? set.patterns.length : Number(item.patternCount || 0)
          });
          continue;
        }
      } catch (error) {
        console.warn("[VisibilityToolbar] failed to hydrate visibility set summary", item.name, error);
      }

      hydrated.push(item);
    }

    return hydrated;
  }

  _installVisibilityToolsStyles() {
      const id = 'vis-tools-dialog-styles';
      if (document.getElementById(id)) return;

      const style = document.createElement('style');
      style.id = id;
      // Note: Zero linear-gradient or radial-gradient properties used here. Pure flat colors.
      style.textContent = `
        .vis-tools-menu {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          min-width: 390px;
          background: #181a20;
          color: #e2e8f0;
          font-family: system-ui, sans-serif;
        }
        
        .vis-tools-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px solid #2d3748;
          font-size: 14px;
        }

        .vis-tools-header span {
          opacity: 0.6;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .vis-tools-status {
          font-size: 12px;
          color: #94a3b8;
          min-height: 1.2em;
        }

        .vis-tools-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .vis-tools-btn-action {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #334155;
          background: #27303f;
          color: #f8fafc;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .vis-tools-btn-action:hover {
          background: #334155;
          border-color: #475569;
        }

        .vis-tools-btn-action:active {
          background: #1e293b;
        }

        .vis-tools-checkbox {
          display: flex;
          gap: 6px;
          align-items: center;
          font-size: 13px;
          color: #cbd5e1;
          cursor: pointer;
          user-select: none;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .vis-tools-checkbox:hover {
          background: #1e293b;
        }

        .vis-tools-section-title {
          font-size: 11px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-top: 8px;
        }

        .vis-tools-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .vis-tools-set-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .vis-tools-select {
          min-width: 0;
          padding: 8px;
          background: #0f172a;
          color: #e2e8f0;
          border: 1px solid #334155;
          border-radius: 6px;
          outline: none;
          font-size: 12px;
        }
        
        .vis-tools-select:focus {
          border-color: #3b82f6;
        }
      `;
      document.head.appendChild(style);
    }


  static _doc_overview() {
      return "### FileTreeView\n\nA flat, high-performance, absolute-positioned folder and file list, complete with dynamic SVG connecting lines and interactive visibility widgets.";
    }

  static _doc_rendering() {
      return `## Advanced Layout and SVG Connections

- **Absolute Layout**: \`calculateLayout\` traverses visible nodes, computing precise X and Y coordinates. Folder toggles trigger a cubic-eased \`requestAnimationFrame\` loop that interpolates positions smoothly.
- **SVG Connection Lines**: \`_drawLinesInternal\` dynamically generates SVG paths connecting parent directory toggle arrows to child files. These paths animate in sync with the nodes for a unified, modern look.
- **Fuzzy Search Filtering**: \`applyFilter\` hides non-matching nodes, identifies ancestors of matches, and expands them automatically to ensure search results are visible.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_rendering()
      ].join('\n\n');
    }

  

  async _handleAddAsDependencyPrompt(node) {
      if (!this.app || !this.app.vfs) return;

      this.app.uiManager?.setStatus('Locating workspace manifests...');
      let manifests = [];
      try {
        const allFiles = await this.app.vfs.listFiles({ includeStatic: false });
        manifests = allFiles.filter(p => p.endsWith('files.json'));
      } catch (err) {
        console.warn('[Add Dependency] VFS listFiles failed:', err);
      }

      if (manifests.length === 0) {
        this.app.uiManager?.setStatus('No files.json manifest found in open workspaces.', true);
        return;
      }

      if (manifests.length === 1) {
        // Automatically add if only one files.json is available
        await this.app.commands.addDependency({ path: node.id, manifestPath: manifests[0] });
        return;
      }

      // If multiple, prompt the user with a dropdown selection
      const projectRoot = '/' + node.id.split('/').filter(Boolean)[0];
      const preferredManifest = manifests.find(m => m.startsWith(projectRoot)) || manifests[0];

      const select = document.createElement('select');
      select.style.cssText = 'width: 100%; padding: 8px; margin-top: 10px; background: #2d3139; color: #fff; border: 1px solid #4f5b66; border-radius: 6px;';

      manifests.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        if (m === preferredManifest) opt.selected = true;
        select.appendChild(opt);
      });

      const container = makeElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, [
        makeElement('p', { style: { margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '13px' } }, `Select target files.json manifest for: "${node.name}"`),
        select
      ]);

      const dialog = UITools.makeDialog({
        title: '➕ Add as Dependency',
        content: container,
        width: '420px',
        buttons: [
          { label: 'Cancel' },
          {
            label: 'Add Dependency',
            className: 'primary',
            onClick: async () => {
              dialog.close();
              const chosenManifest = select.value;
              await this.app.commands.addDependency({ path: node.id, manifestPath: chosenManifest });
            }
          }
        ]
      });
    }
}

