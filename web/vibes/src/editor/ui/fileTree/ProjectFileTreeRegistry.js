class ProjectFileTreeRegistry {

  constructor(options = {}) {
      this.manager = options.manager || null;
      this.treeViews = new Set();
    }

  

  

  registerFileTreeView(treeView) {
      if (!treeView) return false;
      this.treeViews.add(treeView);
      this.manager?.app?.emit?.('file-tree:registered', treeView);
      return true;
    }

  unregisterFileTreeView(treeView) {
      if (!treeView) return false;
      this.treeViews.delete(treeView);
      this.manager?.app?.emit?.('file-tree:unregistered', treeView);
      return true;
    }

  getFileTreeViews(options = {}) {
      return Array.from(this.treeViews).filter(Boolean);
    }

  forEachFileTreeView(callback, options = {}) {
      if (typeof callback !== "function") return 0;
      const views = this.getFileTreeViews(options);
      for (const treeView of views) {
        try {
          callback(treeView);
        } catch (error) {
          if (options.throwOnError) throw error;
        }
      }
      return views.length;
    }

  describeFileTreeViews(options = {}) {
    const views = this.getFileTreeViews(options);
    const describeOne =
      typeof options.describeOne === "function"
        ? options.describeOne
        : (treeView, index) => this.defaultTreeDescription(treeView, index);

    return views.map((treeView, index) => {
      return describeOne(treeView, index);
    });
  }

  defaultTreeDescription(treeView, index = 0) {
      const roots = this.rootIdsForTreeView(treeView);
      const nodeCount = treeView?.nodesMap?.size || 0;
      const widgetCount =
        typeof treeView?.getAllVisibilityWidgets === "function"
          ? treeView.getAllVisibilityWidgets().length
          : this.countVisibilityWidgetsFromNodes(treeView);

      return {
        index,
        rootId: roots[0] || "",
        roots,
        nodeCount,
        widgetCount,
        className: treeView?.constructor?.name || "FileTreeView",
        isMainTree: false
      };
    }

  rootIdsForTreeView(treeView) {
    if (!treeView?.nodesMap) return [];

    const roots = [];

    for (const path of treeView.nodesMap.keys()) {
      const parts = String(path || "").split("/").filter(Boolean);

      if (parts.length === 1) {
        const root = "/" + parts[0];

        if (!roots.includes(root)) {
          roots.push(root);
        }
      }
    }

    roots.sort();
    return roots;
  }

  countVisibilityWidgetsFromNodes(treeView) {
    if (!treeView?.nodesMap) return 0;

    let count = 0;

    for (const node of treeView.nodesMap.values()) {
      if (node?.visibilityWidget) {
        count += 1;
      }
    }

    return count;
  }

  clear() {
      this.treeViews.clear();
      return true;
    }

}