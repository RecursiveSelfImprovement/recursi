class ProjectWorkspaceRootOperations {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  workspaceSafeRootName(manager = this.manager, name) {
      const base =
        String(name || "ExternalFolder")
          .trim()
          .replace(/[^\w.\- ]+/g, "-")
          .replace(/\s+/g, "-")
          .replace(/^-+|-+$/g, "") || "ExternalFolder";

      const views = manager && typeof manager.getFileTreeViews === 'function' ? manager.getFileTreeViews() : [];
      let exists = false;
      for (const tree of views) {
        if (tree.nodesMap?.has("/" + base)) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        return base;
      }

      let i = 2;
      while (true) {
        let currentExists = false;
        for (const tree of views) {
          if (tree.nodesMap?.has("/" + base + "-" + i)) {
            currentExists = true;
            break;
          }
        }
        if (!currentExists) return base + "-" + i;
        i++;
      }
    }

  cloneTreeNodeForWorkspaceRoots(node, seen = new Set()) {
    if (!node || seen.has(node.id)) {
      return null;
    }

    seen.add(node.id);

    const cloned = {
      id: node.id,
      name: node.name,
      type: node.type,
      readOnly: !!node.readOnly,
      isExpanded: !!node.isExpanded,
      children: undefined
    };

    if (node.children && node.children.length) {
      cloned.children = node.children
        .map((child) => this.cloneTreeNodeForWorkspaceRoots(child, seen))
        .filter(Boolean);
    } else if (node.type === "directory") {
      cloned.children = [];
    }

    return cloned;
  }

  getCurrentRootTreeDataForWorkspaceInsert(manager = this.manager) {
      const views = manager && typeof manager.getFileTreeViews === 'function' ? manager.getFileTreeViews() : [];
      const roots = [];
      const seen = new Set();

      for (const tree of views) {
        if (!tree.nodesMap) continue;
        for (const node of tree.nodesMap.values()) {
          if (!node || typeof node.id !== "string") {
            continue;
          }
          if (seen.has(node.id)) continue;

          const parts = node.id.split("/").filter(Boolean);
          if (parts.length !== 1) {
            continue;
          }

          const cloned = this.cloneTreeNodeForWorkspaceRoots(node);
          if (cloned) {
            seen.add(node.id);
            roots.push(cloned);
          }
        }
      }

      return roots;
    }

  async insertOrReplaceWorkspaceRootTree(manager = this.manager, rootData, metadataPatch = {}) {
      if (!manager) {
        throw new Error("insertOrReplaceWorkspaceRootTree requires manager");
      }

      if (!rootData || !rootData.id) {
        throw new Error("insertOrReplaceWorkspaceRootTree requires rootData.id");
      }

      const existingRoots = this.getCurrentRootTreeDataForWorkspaceInsert(manager)
        .filter((root) => root.id !== rootData.id);

      const roots = [...existingRoots, rootData];

      roots.sort((a, b) => {
        const projectName = manager.app && manager.app.projectName;
        if (projectName && a.name === projectName) {
          return -1;
        }
        if (projectName && b.name === projectName) {
          return 1;
        }
        if (a.name === "library") {
          return 1;
        }
        if (b.name === "library") {
          return -1;
        }
        return a.name.localeCompare(b.name);
      });

      manager.fileMetadata = {
        ...(manager.fileMetadata || {}),
        ...(metadataPatch || {})
      };

      await manager.setData(roots, manager.fileMetadata);

      try {
        await this.repairVisibilityWidgetsForAllNodes(manager);
      } catch (error) {
        console.warn(
          "[ProjectWorkspaceRootOperations] visibility widget repair after workspace insert failed:",
          error
        );
      }

      let rootNode = null;
      manager._forEachFileTreeView((treeView) => {
        if (!rootNode && treeView?.nodesMap?.has(rootData.id)) {
          rootNode = treeView.nodesMap.get(rootData.id);
        }
      });

      if (rootNode) {
        rootNode.isExpanded = true;
        try {
          if (
            rootNode.children &&
            rootNode.children.length &&
            typeof rootNode.render === "function"
          ) {
            rootNode.render();
          }
        } catch (error) {}
      }

      return rootNode || null;
    }

  async addWorkspaceRootFromFileStore(manager = this.manager, store, options = {}) {
      if (!manager) {
        throw new Error("addWorkspaceRootFromFileStore requires manager");
      }

      if (!store || typeof store.keys !== "function") {
        throw new Error(
          "addWorkspaceRootFromFileStore requires a Map-like store with keys()."
        );
      }

      const rootId =
        options.rootId ||
        "/" + (options.rootName || store._projectName || "ExternalFolder");

      const rootName = rootId.replace(/^\//, "");

      const paths = Array.from(store.keys()).filter((path) => {
        return (
          typeof path === "string" &&
          path.startsWith(rootId + "/") &&
          !manager._isHiddenImplementationCapsulePath(path)
        );
      });

      const metadata = {};

      for (const path of paths) {
        const content = store.get(path);

        if (typeof content === "string") {
          metadata[path] = manager._analyzePromptMetadataForFile(
            path,
            content,
            null
          );
        }
      }

      const rootData = manager._buildWorkspaceTreeDataFromPaths(
        paths,
        rootId,
        rootName
      );

      if (!manager.app.workspaceFileStores) {
        manager.app.workspaceFileStores = new Map();
      }

      manager.app.workspaceFileStores.set(rootId, store);

      await this.insertOrReplaceWorkspaceRootTree(manager, rootData, metadata);

      if (typeof manager._attachFolderMetaCapsulesToTree === "function") {
        const targetTree = manager.getFileTreeViews().find(tree => manager.getTreeRootId(tree) === rootId);
        if (targetTree) {
          manager._attachFolderMetaCapsulesToTree(store, rootId, targetTree);
        }
      }

      return {
        ok: true,
        rootId,
        rootName,
        files: paths.length
      };
    }

  async repairVisibilityWidgetsForAllNodes(manager = this.manager) {
      if (!manager) {
        return {
          ok: false,
          reason: "manager missing"
        };
      }

      const metadata = manager.fileMetadata || manager.app?.inMemoryFileMetadata || {};
      const maxSizes = typeof manager._calculateWidgetMaxSizes === "function" ? manager._calculateWidgetMaxSizes() : {};

      let repaired = 0;
      let missingWidgets = 0;
      let badAfter = 0;

      manager._forEachFileTreeView((treeView) => {
        if (!treeView?.nodesMap) return;
        for (const node of treeView.nodesMap.values()) {
          if (!node || node.type !== "file") {
            continue;
          }

          const meta = node.metadata || metadata[node.id] || {};
          const sizes = {
            code: Number(meta.codeSize ?? meta.code ?? 0) || 0,
            docs: Number(meta.docSize ?? meta.docs ?? 0) || (node.hasDocs || meta.hasDocs ? 1 : 0),
            isStructured: !!meta.isStructured,
            hasDocs: !!meta.docSize || !!meta.hasDocs || !!node.hasDocs
          };

          if (node.visibilityWidget) {
            try {
              node.visibilityWidget.updateSizes(sizes, maxSizes);
              repaired++;

              const svg = node.visibilityWidget.getElement?.() || node.visibilityWidget.svgElement;
              const width = Number(svg?.getAttribute?.("width"));
              if (!Number.isFinite(width) || width > 420) {
                badAfter++;
              }
            } catch (error) {}
          } else {
            missingWidgets++;
          }
        }
      });

      return {
        ok: true,
        repaired,
        missingWidgets,
        badAfter,
        maxSizes,
        metadataKeys: Object.keys(metadata).length
      };
    }

}