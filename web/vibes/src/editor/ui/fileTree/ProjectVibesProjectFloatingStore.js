class ProjectVibesProjectFloatingStore {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  openMainProjectAsFloatingTree(manager = this.manager) {
    return {
      ok: true,
      suppressed: true,
      reason:
        "Main project floating tree disabled at startup. Use browser web root mode."
    };
  }

  openVibesProjectTreeDialog(manager = this.manager) {
    return {
      ok: true,
      suppressed: true,
      reason:
        "Vibes project tree must come from browser-opened web/vibes, not startup server tree."
    };
  }

  makeVibesProjectFloatingTreeStore(manager = this.manager, options = {}) {
    const facade = this;
    const rootId = options.rootId || "/vibes";
    const projectName =
      options.projectName || rootId.replace(/^\/+/, "") || "vibes";
    const pathSet = new Set(options.paths || []);

    return {
      _projectName: projectName,
      name: projectName,
      rootId,
      readOnly: false,
      sourceKind: "server-backed-vibes-project-deprecated",

      keys() {
        return Array.from(pathSet).sort();
      },

      entries() {
        return this.keys().map((path) => [path, this.get(path)]);
      },

      has(path) {
        return pathSet.has(path);
      },

      get(path) {
        return facade.readVibesProjectPathForFloatingTree(manager, path);
      },

      async readFile(path) {
        return facade.readVibesProjectPathForFloatingTree(manager, path);
      },

      async set(path, content) {
        const ok = facade.writeVibesProjectPathForFloatingTree(
          manager,
          path,
          content
        );

        if (ok) {
          pathSet.add(path);
        }

        return ok;
      },

      async delete(path) {
        const ok = facade.deleteVibesProjectPathForFloatingTree(manager, path);

        if (ok) {
          pathSet.delete(path);
        }

        return ok;
      }
    };
  }

  listVibesProjectPathsForFloatingTree(manager = this.manager, rootId = null) {
      const projectName = manager?.app?.projectName || manager?.app?.sourceProjectName || "vibes";
      const prefix = rootId || "/" + String(projectName).replace(/^\/+/, "");
      const paths = new Set();

      const add = (path) => {
        if (typeof path !== "string") return;
        if (path === prefix || path.startsWith(prefix + "/")) {
          paths.add(path);
        }
      };

      const addTree = (treeView) => {
        if (!treeView?.nodesMap) return;
        for (const pair of treeView.nodesMap) {
          const path = pair[0];
          const node = pair[1];
          if (node && node.type === "file") {
            add(path);
          }
        }
      };

      if (manager && typeof manager._forEachFileTreeView === 'function') {
        manager._forEachFileTreeView((treeView) => addTree(treeView));
      }

      const memory = manager?.app?.inMemoryFileStore;
      if (memory?.keys) {
        try {
          for (const path of memory.keys()) {
            add(path);
          }
        } catch (error) {}
      }

      try {
        const listed = manager?.app?.commands?.fileList || manager?.app?.fileList || null;
        if (Array.isArray(listed)) {
          listed.forEach((item) => {
            add(typeof item === "string" ? item : item.path);
          });
        }
      } catch (error) {}

      return Array.from(paths).sort();
    }

  readVibesProjectPathForFloatingTree(manager = this.manager, path) {
      if (!path) return null;

      const memory = manager?.app?.inMemoryFileStore;
      if (memory?.has?.(path)) {
        return memory.get(path);
      }

      let directFromTree = null;
      if (manager && typeof manager._forEachFileTreeView === 'function') {
        manager._forEachFileTreeView((treeView) => {
          if (!directFromTree && treeView.nodesMap?.has(path)) {
            directFromTree = treeView.nodesMap.get(path);
          }
        });
      }

      if (directFromTree && typeof directFromTree.content === "string") {
        return directFromTree.content;
      }

      if (typeof manager?._apiReadFileSyncForFloatingTree === "function") {
        return manager._apiReadFileSyncForFloatingTree(path);
      }

      return null;
    }

  writeVibesProjectPathForFloatingTree(manager = this.manager, path, content) {
    if (!path || typeof content !== "string") {
      return false;
    }

    const memory = manager?.app?.inMemoryFileStore;

    if (memory?.set) {
      memory.set(path, content);
    }

    const ok =
      typeof manager?._apiWriteFileSyncForFloatingTree === "function"
        ? manager._apiWriteFileSyncForFloatingTree(path, content)
        : false;

    if (ok) {
      try {
        manager.addInMemoryFileNode?.(path);
        manager.onVisibilityChange?.({ id: path }, "same-tree-dialog-write", null);
      } catch (error) {}
    }

    return ok;
  }

  deleteVibesProjectPathForFloatingTree(manager = this.manager, path) {
    if (!path) {
      return false;
    }

    const memory = manager?.app?.inMemoryFileStore;

    if (memory?.delete) {
      memory.delete(path);
    }

    const ok =
      typeof manager?._apiDeleteFileSyncForFloatingTree === "function"
        ? manager._apiDeleteFileSyncForFloatingTree(path)
        : false;

    if (ok) {
      try {
        manager.fileTreeView?.removeNode?.(path);
      } catch (error) {}
    }

    return ok;
  }

}