
class CommentThreadView {
  _createBaseStructure() {
    this.treeElement = makeElement('div', { className: 'comment-thread' });
    this.container.appendChild(this.treeElement);
    this.svgLayer = makeElement('svg:svg', {
      className: 'comment-thread-svg-layer',
    });
    // Prepend svg layer so comments are on top
    this.treeElement.insertBefore(this.svgLayer, this.treeElement.firstChild);
  }

  setData(commentDataArray) {
    this.clear();
    this.rootNodes = commentDataArray.map((data) => {
      const root = new CommentNode(data, this);
      this._registerNodeAndChildren(root);
      return root;
    });

    this.nodesMap.forEach((node) => {
      if (!node.domElement) {
        node.render();
        this.treeElement.appendChild(node.domElement);
        node.domElement.style.opacity = 0;
      }
    });

    setTimeout(() => {
      this.currentLayout = this.calculateLayout();
      this._updateAllNodeDebugInfo();
      this._renderNodesFromLayout(this.currentLayout, true);
      this._drawLinesInternal();
    }, 0);
  }

  clear() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.rootNodes.forEach((node) => this._unregisterNode(node));
    this.nodesMap.clear();
    this.rootNodes = [];
    this.currentLayout = {};
    if (this.svgLayer) this.svgLayer.innerHTML = '';
    if (this.treeElement) {
      this.treeElement.innerHTML = '';
      this.treeElement.style.height = '0px';
      this.treeElement.appendChild(this.svgLayer);
    }
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
    node.children.forEach((child) => this._unregisterNode(child));
  }

  calculateLayout() {
    this._sortAllChildren();

    if (this.app && this.app.isDebugMode) {
      console.log(
        '%c[Layout] Starting new layout calculation...',
        'color: #4CAF50; font-weight: bold;'
      );
    }
    const layout = {};
    let currentY = this.options.verticalPadding;
    const indent = this.options.indentation;

    const traverse = (node, currentX, level, visible) => {
      if (!node) return;

      // FIX: Force a width update before measuring height to prevent overlap.
      // Absolutely positioned elements need their width set explicitly
      // so text wrapping is calculated correctly for offsetHeight.
      if (node.domElement) {
        node.domElement.style.width = `calc(100% - ${currentX}px)`;
      }

      const nodeHeight = node.domElement ? node.domElement.offsetHeight : 50;
      node.indentLeveL = level;

      layout[node.id] = {
        x: currentX,
        y: currentY,
        height: nodeHeight,
        isVisible: visible,
        nodeInstance: node,
      };

      if (visible) {
        currentY += nodeHeight + this.options.verticalPadding;
      }

      const showKids = visible && node.isExpanded;

      node.children.forEach((child) => {
        const nextX = currentX + indent;

        if (this.app && this.app.isDebugMode) {
          const decision = `INDENT from parent`;
          console.log(
            `[Layout] Parent: ${node.shortId} (NC:${node.children.length}) -> Child: ${child.shortId}. DECISION: ${decision}`
          );
        }

        traverse(child, nextX, level + 1, showKids);
      });
    };

    this.rootNodes.forEach((rootNode) => {
      traverse(rootNode, 0, 0, true);
    });

    if (currentY > this.options.verticalPadding) {
      currentY -= this.options.verticalPadding;
    }

    this.treeElement.style.height = `${currentY}px`;
    if (this.app && this.app.isDebugMode) {
      console.log(
        '%c[Layout] Calculation complete.',
        'color: #4CAF50; font-weight: bold;'
      );
    }
    return layout;
  }

  _renderNodesFromLayout(layoutData, immediate = false) {
    for (const nodeId in layoutData) {
      const { x, y, isVisible, nodeInstance: node } = layoutData[nodeId];
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
    }
  }

  refreshLayout(onComplete) {
    this.handleExpansionChange(null, onComplete);
  }

  handleExpansionChange(nodeInstance, onComplete) {
    if (this.isAnimating) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationStartLayout = this._captureCurrentAnimationState();
    } else {
      this.animationStartLayout = this.currentLayout;
    }
    this.animationEndLayout = this.calculateLayout();
    this._updateAllNodeDebugInfo();
    this._startAnimation(onComplete);
  }

  _startAnimation(onCompleteCallback = null) {
    if (this.isAnimating) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationStartTime = performance.now();
    this.isAnimating = true;
    this.onAnimationComplete = onCompleteCallback;

    this._ensureNodesAreRenderedForAnimation();

    this.animationFrameId = requestAnimationFrame(this._animationTick);
  }

  _animationTick(timestamp) {
    if (!this.isAnimating) return;

    const elapsedTime = timestamp - this.animationStartTime;
    const duration = this.options.animationDuration;
    let progress = Math.min(elapsedTime / duration, 1);
    progress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

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
        const parentStart = node.parent
          ? this.animationStartLayout[node.parent.id]
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
        const parentEnd = node.parent
          ? this.animationEndLayout[node.parent.id]
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

    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(this._animationTick);
    } else {
      this.isAnimating = false;
      this.animationFrameId = null;
      this.currentLayout = this.animationEndLayout;
      this._renderNodesFromLayout(this.currentLayout, true); // Snap to final positions
      this._drawLinesInternal();
      if (typeof this.onAnimationComplete === 'function') {
        this.onAnimationComplete();
      }
    }
  }

  _captureCurrentAnimationState() {
    const capturedLayout = {};
    for (const [nodeId, node] of this.nodesMap.entries()) {
      capturedLayout[nodeId] = {
        x: node.currentX,
        y: node.currentY,
        height: node.domElement.offsetHeight,
        isVisible: node.currentOpacity > 0.01,
        nodeInstance: node,
      };
    }
    return capturedLayout;
  }

  _ensureNodesAreRenderedForAnimation() {
    const involvedNodeIds = new Set([
      ...Object.keys(this.animationStartLayout || {}),
      ...Object.keys(this.animationEndLayout || {}),
    ]);

    involvedNodeIds.forEach((nodeId) => {
      const node = this.nodesMap.get(nodeId);
      if (node && !node.domElement) {
        node.render();
        // Hide it initially, animation will fade it in
        node.currentOpacity = 0;
        node.updateStyle();
        this.treeElement.appendChild(node.domElement);
      }
    });
  }

  _drawLinesInternal() {
    if (!this.svgLayer) return;
    this.svgLayer.innerHTML = '';

    let maxY = 0;
    this.nodesMap.forEach((node) => {
      if (node.currentOpacity > 0.01) {
        maxY = Math.max(maxY, node.currentY + node.domElement.offsetHeight);
      }
    });

    this.svgLayer.setAttribute('width', this.treeElement.clientWidth);
    this.svgLayer.setAttribute('height', maxY);

    this.nodesMap.forEach((node) => {
      if (
        node.isExpanded &&
        node.children.length > 0 &&
        node.currentOpacity > 0.1
      ) {
        this._drawLinesForNode(node);
      }
    });
  }

  _drawLinesForNode(parentNode) {
    const parentPoint = parentNode.getConnectionPoint();
    if (!parentPoint) return;

    const radius = this.options.lineRadius;

    if (this.app && this.app.isDebugMode) {
      console.log(
        `%c[Draw Lines] Processing parent: ${parentNode.shortId}`,
        'color: #2196F3; font-weight: bold;',
        { parentNode, parentPoint }
      );
    }

    parentNode.children.forEach((childNode, index) => {
      if (childNode.currentOpacity < 0.01) return;
      const childPoint = childNode.getConnectionPoint();
      if (!childPoint) return;

      let d;
      if (childPoint.x === parentPoint.x) {
        d = `M ${parentPoint.x} ${parentPoint.y} V ${childPoint.y}`;
      } else {
        d =
          `M ${parentPoint.x} ${parentPoint.y}` +
          ` V ${childPoint.y - radius}` +
          ` Q ${parentPoint.x} ${childPoint.y} ${parentPoint.x + radius} ${
            childPoint.y
          }` +
          ` H ${childPoint.x - this.options.lineEndpointOffset}`;
      }

      if (this.app && this.app.isDebugMode) {
        const logMessage = `[Line] P: ${parentNode.shortId} -> C: ${childNode.shortId}`;
        console.log(logMessage, {
          isLastChild: index === parentNode.children.length - 1,
          parentPoint,
          childPoint,
          path: d,
        });
      }

      const path = makeElement('svg:path', {
        d,
        fill: 'none',
        stroke: this.options.lineColor,
        'stroke-width': this.options.lineWidth,
        style: {
          opacity: Math.min(
            parentNode.currentOpacity,
            childNode.currentOpacity
          ),
        },
      });
      this.svgLayer.appendChild(path);
    });
  }

  addComment(data, parentId) {
    let parentNode = null;
    if (parentId) {
      parentNode = this.nodesMap.get(parentId);
    }

    const newNode = new CommentNode(data, this, parentNode);
    this._registerNodeAndChildren(newNode);

    if (parentNode) {
      parentNode.children.push(newNode);
      parentNode.updateVisualState();
      parentNode.updateToggleIcon();
    } else {
      this.rootNodes.push(newNode);
    }

    newNode.render();
    newNode.currentOpacity = 0;

    if (parentNode) {
      // When adding a new node, we check if it's now part of a multi-child group
      // or if it's the very first reply.
      const isNowMultiChild = parentNode.children.length > 1;
      const isFirstReply = parentNode.children.length === 1;

      // A new node is either the first reply (not indented) or the latest part
      // of a branch (indented).
      newNode.currentX = isFirstReply
        ? parentNode.currentX
        : parentNode.currentX + this.options.indentation;
      newNode.currentY =
        parentNode.currentY + parentNode.domElement.offsetHeight;
    } else {
      newNode.currentX = 0;
      newNode.currentY = parseFloat(this.treeElement.style.height) || 0;
    }

    newNode.updateStyle();
    this.treeElement.appendChild(newNode.domElement);

    // Refreshing the layout will correctly re-indent the previous children
    // if this new comment created a branch.
    this.refreshLayout();
  }

  registerPopup(nodeInstance) {
    this.nodeWithOpenPopup = nodeInstance;
  }

  closeAllPopups() {
    if (this.nodeWithOpenPopup && this.nodeWithOpenPopup.ratingPanel) {
      this.nodeWithOpenPopup.ratingPanel.hide();
      this.nodeWithOpenPopup.ratingPanel = null;
    }
    this.nodeWithOpenPopup = null;
  }

  _updateAllNodeDebugInfo() {
    const isDebug = this.app ? this.app.isDebugMode : false;
    this.nodesMap.forEach((node) => {
      if (node.debugInfoElement) {
        node.debugInfoElement.textContent = isDebug
          ? `ID:${node.shortId} IL:${node.indentLeveL} NC:${node.children.length}`
          : '';
      }
    });
  }

  _sortAllChildren() {
    if (!this.app) return;
    const sortOrder = this.app.globalSortOrder;
    if (!sortOrder) return;

    // This corrected sorter ensures "Newest First" shows the most recent comments at the top.
    const sorter = (a, b) => {
      return sortOrder === 'newest'
        ? new Date(b.timestamp) - new Date(a.timestamp)
        : new Date(a.timestamp) - new Date(b.timestamp);
    };

    const traverse = (node) => {
      if (node.children && node.children.length > 1) {
        node.children.sort(sorter);
      }
      // Recurse through the now-sorted children
      node.children.forEach(traverse);
    };

    // Sort the root-level comments first
    if (this.rootNodes.length > 1) {
      this.rootNodes.sort(sorter);
    }
    // Then recursively sort all their descendants
    this.rootNodes.forEach(traverse);
  }

  removeRootNode(nodeId) {
    const nodeIndex = this.rootNodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex > -1) {
      const [removedNode] = this.rootNodes.splice(nodeIndex, 1);
      this._unregisterNode(removedNode);
    }
  }

  setApp(appInstance) {
    this.app = appInstance;
    // FIX: This ensures the app instance is also available to child
    // CommentNode objects, which was the cause of the crash.
    this.options.app = appInstance;
  }

  collapseByRecency(percentile) {
    if (this.nodesMap.size === 0) return;

    // Get all valid nodes and sort them by timestamp, newest first.
    const allNodes = Array.from(this.nodesMap.values());
    const sortedNodes = allNodes
      .filter((node) => !node.isTemporary && !node.isDeleted)
      .sort((a, b) => b.timestamp - a.timestamp);

    const totalNodes = sortedNodes.length;
    if (totalNodes === 0) return;

    // Calculate the number of newest comments to keep expanded.
    // 100% = all expanded, 0% = all collapsed
    const countToKeepExpanded = Math.round(totalNodes * (percentile / 100));

    // Apply collapsed state based on position in the sorted list.
    sortedNodes.forEach((node, index) => {
      // If index is within the "keep" range, do not collapse.
      // Otherwise, collapse it.
      const shouldBeCollapsed = index >= countToKeepExpanded;
      node.setCollapsed(shouldBeCollapsed);
    });

    this.refreshLayout();
  }

  constructor(container, options = {}) {
    this.container = container;
    this.app = null;

    // NO HARDCODED DEFAULTS HERE.
    // We expect the 'options' object to be fully populated by the App (Comments.js)
    // using the defaults from CommentStyles.js.
    this.options = options;

    this.rootNodes = [];
    this.nodesMap = new Map();
    this.currentLayout = {};
    this.isAnimating = false;
    this.animationFrameId = null;
    this.nodeWithOpenPopup = null;

    this._animationTick = this._animationTick.bind(this);
    this._createBaseStructure();
  }

}

