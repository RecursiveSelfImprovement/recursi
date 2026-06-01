class ProjectFilesEditorBridge {

  constructor(options = {}) {
      this.manager = options.manager || null;
    }

  normalizeEditorFilePath(path) {
      if (typeof path !== "string") {
        return "";
      }
      return path.replace(/^\/+/, "");
    }

  pathLooksLikeWorkspacePath(path) {
      if (typeof path !== "string") {
        return false;
      }
      return path.startsWith("/") && path.split("/").filter(Boolean).length >= 2;
    }

  storeForEditorPath(manager = this.manager, path) {
      if (!manager || !manager.app || !manager.app.workspaceFileStores) {
        return null;
      }

      let bestRootId = "";
      let bestStore = null;

      for (const [rootId, store] of manager.app.workspaceFileStores.entries()) {
        if (
          typeof rootId === "string" &&
          path.startsWith(rootId + "/") &&
          rootId.length > bestRootId.length
        ) {
          bestRootId = rootId;
          bestStore = store;
        }
      }

      return bestStore;
    }

  async readEditorPathContent(manager = this.manager, path) {
      if (!manager) {
        return "";
      }

      const store = this.storeForEditorPath(manager, path);

      if (store) {
        if (typeof store.get === "function") {
          const value = store.get(path);

          if (value && typeof value.then === "function") {
            const resolved = await value;
            return typeof resolved === "string" ? resolved : "";
          }

          return typeof value === "string" ? value : "";
        }

        if (typeof store.readFile === "function") {
          const value = await store.readFile(path);
          return typeof value === "string" ? value : "";
        }
      }

      if (
        manager.app &&
        manager.app.fileManager &&
        typeof manager.app.fileManager.getFileContent === "function"
      ) {
        const normalized = this.normalizeEditorFilePath(path);
        const value = await manager.app.fileManager.getFileContent(normalized);
        return typeof value === "string" ? value : "";
      }

      if (typeof manager.getFileContent === "function") {
        const value = await manager.getFileContent(path);
        return typeof value === "string" ? value : "";
      }

      return "";
    }

  async openEditorPath(manager = this.manager, path, options = {}) {
      if (!manager || !manager.app || !path) {
        return {
          ok: false,
          reason: "missing manager/app/path"
        };
      }

      const content =
        typeof options.content === "string"
          ? options.content
          : await this.readEditorPathContent(manager, path);

      const normalized = this.normalizeEditorFilePath(path);
      const title = options.title || path.split("/").filter(Boolean).pop() || path;

      if (
        manager.app.editorTabController &&
        typeof manager.app.editorTabController.openFile === "function"
      ) {
        const result = await manager.app.editorTabController.openFile(
          normalized,
          content
        );

        return {
          ok: true,
          mode: "editorTabController.openFile",
          path,
          normalized,
          title,
          result
        };
      }

      if (
        manager.app.tabManager &&
        typeof manager.app.tabManager.openFile === "function"
      ) {
        const result = await manager.app.tabManager.openFile(normalized, content);

        return {
          ok: true,
          mode: "tabManager.openFile",
          path,
          normalized,
          title,
          result
        };
      }

      if (
        manager.app.editor &&
        typeof manager.app.editor.setValue === "function"
      ) {
        manager.app.editor.setValue(content);

        return {
          ok: true,
          mode: "editor.setValue",
          path,
          normalized,
          title
        };
      }

      return {
        ok: false,
        reason: "no known editor target",
        path,
        normalized,
        title
      };
    }

  async openNodeInEditor(manager = this.manager, node, options = {}) {
      if (!node || node.type === "directory") {
        return {
          ok: false,
          reason: "node is missing or directory"
        };
      }

      return await this.openEditorPath(manager, node.id, {
        ...options,
        title: options.title || node.name
      });
    }

  markNodeAsActiveFile(manager = this.manager, path) {
      if (!manager) {
        return false;
      }

      let found = false;
      manager._forEachFileTreeView((treeView) => {
        if (treeView.nodesMap?.has(path)) {
          found = true;
        }
      });

      if (!found) {
        return false;
      }

      const oldActive = manager.activeNodeId || null;
      manager.activeNodeId = path;

      if (typeof manager.syncNodeSelection === "function") {
        manager.syncNodeSelection(path, oldActive);
      } else if (typeof manager.syncFileStates === "function") {
        manager.syncFileStates(path, []);
      }

      return true;
    }

}