class ProjectFilesTreeOperations {

  constructor(options = {}) {
      this.manager = options.manager || null;
    }

  addInMemoryFileNode(manager = this.manager, goldenPath) {
      if (!manager || !goldenPath) return false;
      let anyAdded = false;

      manager._forEachFileTreeView((treeView) => {
        if (!treeView || treeView.nodesMap.has(goldenPath)) return;

        const treeRoot = manager.getTreeRootId ? manager.getTreeRootId(treeView) : null;
        if (treeRoot && treeRoot !== '' && !goldenPath.startsWith(treeRoot)) return;

        const pathParts = String(goldenPath || "").replace(/^\/+/, "").split("/");
        let currentParentId = "";
        let builtPath = "";
        let added = 0;

        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          builtPath += "/" + part;
          const isFile = i === pathParts.length - 1;

          if (!treeView.nodesMap.has(builtPath)) {
            const isRoot = currentParentId === "";
            const newNodeData = {
              id: builtPath, name: part, type: isFile ? "file" : "directory",
              isInMemory: true, children: isFile ? undefined : [], isExpanded: !isFile
            };
            const parentNode = isRoot ? null : treeView.nodesMap.get(currentParentId);
            
            const newNodeInstance = new TreeNode(newNodeData, treeView, parentNode);
            treeView.nodesMap.set(builtPath, newNodeInstance);

            if (isRoot) {
              treeView.rootNodes.push(newNodeInstance);
            } else if (parentNode) {
              parentNode.children.push(newNodeInstance);
              parentNode.children.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1);
              parentNode.isExpanded = true;
            }
            added++;
          }
          if (!isFile) currentParentId = builtPath;
        }

        if (added > 0) {
          treeView.currentLayout = treeView.calculateLayout();
          treeView._renderNodesFromLayout(treeView.currentLayout, true);
          if (typeof treeView.redrawLines === 'function') treeView.redrawLines();
          anyAdded = true;
        }
      });

      if (anyAdded && manager.app?.visibilityManager) manager.app.visibilityManager.notify();
      return anyAdded;
    }

  async updateNodeMetadata(manager = this.manager, metadataKey, newMetadataEntry) {
      if (!manager) return false;
      let anyUpdated = false;

      manager._forEachFileTreeView((treeView) => {
        if (treeView.nodesMap?.has(metadataKey)) {
          const node = treeView.nodesMap.get(metadataKey);
          if (node) {
            node.updateMetadata(newMetadataEntry);
            anyUpdated = true;
          }
        }
      });

      return anyUpdated;
    }

  async addSharedLibraryTree(manager = this.manager, sharedFilePaths, metadata = {}) {
      if (!manager || !sharedFilePaths || !sharedFilePaths.length) {
        return false;
      }

      const libraryRootId = "/library";
      let added = 0;
      let updated = 0;

      // Safely target the active floating library tree
      manager._forEachFileTreeView((treeView) => {
        const treeRoot = manager.getTreeRootId ? manager.getTreeRootId(treeView) : null;
        if (treeRoot !== libraryRootId) return;

        let libraryRootNode = treeView.nodesMap.get(libraryRootId);

        if (!libraryRootNode) {
          const rootNodeData = {
            id: libraryRootId,
            name: "library",
            type: "directory",
            children: [],
            isExpanded: true,
            readOnly: false
          };

          treeView.addRootNode(rootNodeData);
          libraryRootNode = treeView.nodesMap.get(libraryRootId);
        }

        for (const goldenPath of sharedFilePaths) {
          if (manager._isSidecarOrMetadataFile(goldenPath)) {
            continue;
          }

          if (treeView.nodesMap.has(goldenPath)) {
            if (metadata[goldenPath]) {
              const node = treeView.nodesMap.get(goldenPath);
              node.updateMetadata(metadata[goldenPath]);
              updated++;
            }

            continue;
          }

          const nodeName = goldenPath.split("/").pop();
          const nodeMeta = metadata[goldenPath] || {};

          const newNodeData = {
            id: goldenPath,
            name: nodeName,
            type: "file",
            readOnly: false,
            hasDocs: (nodeMeta.docSize || 0) > 0
          };

          treeView.addNode(newNodeData, libraryRootId);
          added++;

          const newNode = treeView.nodesMap.get(goldenPath);

          if (newNode) {
            newNode.updateMetadata(nodeMeta);
          }
        }
      });

      manager._calculateWidgetMaxSizes();

      // Recalculate sizes across all active floating tree views
      manager._forEachFileTreeView((treeView) => {
        treeView.nodesMap.forEach((node) => {
          if (node.visibilityWidget) {
            node.visibilityWidget.updateSizes(node.metadata, manager.widgetMaxSizes);
          }
        });
      });

      return {
        ok: true,
        added,
        updated
      };
    }

  setNodeDocStatus(manager = this.manager, sourcePath, hasDocs) {
    if (!manager) {
      return 0;
    }

    let touched = 0;

    manager._forEachFileTreeView((treeView) => {
      if (typeof treeView.setNodeDocStatus === "function") {
        treeView.setNodeDocStatus(sourcePath, hasDocs);
        touched++;
      }

      const node = treeView && treeView.nodesMap
        ? treeView.nodesMap.get(sourcePath)
        : null;

      if (node && node.type === "file") {
        if (!node.metadata) {
          node.metadata = {};
        }

        node.metadata.hasDocs = !!hasDocs;
        node.metadata.canHaveDocs = true;
        node.metadata.docSize = hasDocs ? node.metadata.docSize || 1 : 0;
        node.updateMetadata?.(node.metadata);
        touched++;
      }
    });

    return touched;
  }

  syncNodeSelection(manager = this.manager, newActiveId, oldActiveId) {
      if (!manager) return false;

      manager._forEachFileTreeView((treeView) => {
        if (oldActiveId && treeView.nodesMap?.has(oldActiveId)) {
          const oldNode = treeView.nodesMap.get(oldActiveId);
          if (oldNode) {
            oldNode.setSelected(false);
          }
        }

        if (newActiveId && treeView.nodesMap?.has(newActiveId)) {
          const newNode = treeView.nodesMap.get(newActiveId);
          if (newNode && newNode.type === "file") {
            newNode.setSelected(true);
            treeView.currentlySelectedNode = newNode;
          }
        }
      });

      return true;
    }

  syncFileStates(manager = this.manager, selectedFileId, openFileIds) {
    if (!manager) {
      return 0;
    }

    const openSet =
      openFileIds instanceof Set ? openFileIds : new Set(openFileIds || []);

    return manager._forEachFileTreeView((treeView) => {
      if (typeof treeView.syncAllFileStates === "function") {
        treeView.syncAllFileStates(selectedFileId, openSet);
      }
    });
  }

  getAllVisibilityWidgets(manager = this.manager) {
    if (!manager) {
      return [];
    }

    const widgets = [];

    manager._forEachFileTreeView((treeView) => {
      if (typeof treeView.getAllVisibilityWidgets === "function") {
        widgets.push(...treeView.getAllVisibilityWidgets());
        return;
      }

      if (treeView.nodesMap && typeof treeView.nodesMap.values === "function") {
        for (const node of treeView.nodesMap.values()) {
          if (node && node.visibilityWidget) {
            widgets.push(node.visibilityWidget);
          }
        }
      }
    });

    return widgets;
  }

  clear(manager = this.manager) {
      if (!manager) return false;
      manager.rootNodes = [];

      manager._forEachFileTreeView((treeView) => {
        if (typeof treeView.clear === "function") {
          treeView.clear();
        }
      });

      return true;
    }

}