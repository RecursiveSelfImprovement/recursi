class ProjectFolderMetaCapsuleAttacher {

  constructor(options = {}) {
    this.app = options.app || null;
    this.getFileContent = options.getFileContent || null;
    this.acorn = options.acorn || null;
  }

  isFolderMetaCapsulePath(path) {
    return new RegExp("(^|/)_folder\\.js$", "i").test(String(path || ""));
  }

  extractFolderMetaCapsuleInfo(rootId, store) {
    const results = {};

    if (!store || typeof store.keys !== "function" || typeof store.get !== "function") {
      return results;
    }

    const prefix = String(rootId || "").replace(new RegExp("/+$"), "");
    const keys = Array.from(store.keys()).filter((path) => {
      return (
        typeof path === "string" &&
        path.startsWith(prefix + "/") &&
        this.isFolderMetaCapsulePath(path)
      );
    });

    for (const capsulePath of keys) {
      const source = store.get(capsulePath);
      if (typeof source !== "string") continue;

      const folderPath = capsulePath.replace(
        new RegExp("/_folder\\.js$", "i"),
        ""
      );

      const info = this.evaluateFolderMetaCapsuleSource(source);

      results[folderPath] = {
        capsulePath,
        folderPath,
        ok: !!info.ok,
        className: info.className || null,
        metadata: info.metadata || null,
        directoryInfo: info.directoryInfo || null,
        error: info.error || null
      };
    }

    return results;
  }

  evaluateFolderMetaCapsuleSource(source) {
      if (typeof source !== "string") {
        return {
          ok: false,
          error: "source is not a string"
        };
      }

      const className = this.findFirstClassName(source);

      if (!className) {
        return {
          ok: false,
          error: "class name not found"
        };
      }

      try {
        const Klass = new Function(source + "\nreturn " + className + ";")();

        if (Klass) {
          globalThis[className] = Klass;
          if (typeof window !== 'undefined') {
            window[className] = Klass;
          }
        }

        const directoryInfo =
          typeof Klass._meta_directoryInfo === "function"
            ? Klass._meta_directoryInfo()
            : null;

        return {
          ok: true,
          className,
          metadata: null,
          directoryInfo
        };
      } catch (error) {
        return {
          ok: false,
          className,
          error: error && error.message ? error.message : String(error)
        };
      }
    }

  findFirstClassName(source) {
    const acorn = this.getAcorn();

    if (!acorn) return null;

    try {
      const ast = acorn.parse(source, {
        ecmaVersion: "latest",
        sourceType: "script"
      });

      const classNode = ast.body.find((node) => {
        return node.type === "ClassDeclaration" && node.id && node.id.name;
      });

      return classNode && classNode.id ? classNode.id.name : null;
    } catch (error) {
      return null;
    }
  }

  attachFolderMetaCapsulesToTree(store, rootId, treeView) {
    const tree = treeView || null;

    if (!tree || !tree.nodesMap) {
      return {
        ok: false,
        reason: "tree.nodesMap missing"
      };
    }

    const folderMetaCapsules = this.extractFolderMetaCapsuleInfo(rootId, store);
    let attached = 0;
    let missingNodes = 0;
    let failed = 0;

    for (const [folderPath, info] of Object.entries(folderMetaCapsules)) {
      const node = tree.nodesMap.get(folderPath);

      if (!node) {
        missingNodes += 1;
        continue;
      }

      if (!info.ok) {
        failed += 1;
      }

      this.attachFolderMetaInfoToNode(node, info);
      attached += 1;
    }

    return {
      ok: true,
      attached,
      missingNodes,
      failed,
      total: Object.keys(folderMetaCapsules).length
    };
  }

  

  async attachFolderMetaCapsulesFromWorkspaceStores(stores, treeView) {
    if (!stores || typeof stores.entries !== "function") {
      return {
        ok: false,
        reason: "workspaceFileStores missing"
      };
    }

    if (!treeView || !treeView.nodesMap) {
      return {
        ok: false,
        reason: "fileTreeView.nodesMap missing"
      };
    }

    let attached = 0;
    let missingNodes = 0;
    let failed = 0;
    let total = 0;
    const roots = [];

    for (const [rootId, store] of stores.entries()) {
      if (!store || typeof store.keys !== "function" || typeof store.get !== "function") {
        continue;
      }

      const result = this.attachFolderMetaCapsulesToTree(store, rootId, treeView);

      roots.push({
        rootId,
        attached: Number(result && result.attached ? result.attached : 0),
        missingNodes: Number(result && result.missingNodes ? result.missingNodes : 0),
        failed: Number(result && result.failed ? result.failed : 0),
        total: Number(result && result.total ? result.total : 0)
      });

      attached += Number(result && result.attached ? result.attached : 0);
      missingNodes += Number(result && result.missingNodes ? result.missingNodes : 0);
      failed += Number(result && result.failed ? result.failed : 0);
      total += Number(result && result.total ? result.total : 0);
    }

    return {
      ok: true,
      attached,
      missingNodes,
      failed,
      total,
      storeCount: stores.size,
      roots
    };
  }

  attachFolderMetaInfoToNode(node, info) {
    node.folderMetaCapsule = info;

    node.folderMetadata = {
      ...(node.folderMetadata || {}),
      source: "folder-meta-capsule",
      capsulePath: info.capsulePath,
      folderPath: info.folderPath,
      metadata: info.metadata || null,
      directoryInfo: info.directoryInfo || null,
      error: info.error || null
    };

    if (!node.metadata) node.metadata = {};

    node.metadata.folderMetaCapsule = {
      capsulePath: info.capsulePath,
      ok: !!info.ok,
      capsuleCount: Array.isArray(info.directoryInfo && info.directoryInfo.capsules)
        ? info.directoryInfo.capsules.length
        : 0
    };

    return node;
  }

  async readFileContent(path) {
    if (typeof this.getFileContent === "function") {
      return await this.getFileContent(path);
    }

    if (
      this.app &&
      this.app.inMemoryFileStore &&
      typeof this.app.inMemoryFileStore.get === "function" &&
      this.app.inMemoryFileStore.has(path)
    ) {
      return this.app.inMemoryFileStore.get(path);
    }

    try {
      const response = await fetch(path);
      if (!response.ok) return null;
      return await response.text();
    } catch (error) {
      return null;
    }
  }

  getAcorn() {
    return (
      this.acorn ||
      (this.app && this.app.codeParser && this.app.codeParser.acorn) ||
      (typeof window !== "undefined" ? window.acorn : null) ||
      (typeof globalThis !== "undefined" ? globalThis.acorn : null)
    );
  }

}