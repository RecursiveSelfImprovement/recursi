class ProjectFileTreeDataBuilder {

  constructor(options = {}) {
    this.projectName = options.projectName || "";
    this.metadataAnalyzer = options.metadataAnalyzer || null;
  }

  transformFilesToTreeData(filesData) {
    if (!filesData) return null;

    const allFiles = [
      ...(filesData.js || []),
      ...(filesData.html || []),
      ...(filesData.css || []),
      ...(filesData.other || [])
    ];

    if (allFiles.length === 0) return null;

    const allPathSet = new Set(
      allFiles
        .map((fileInfo) => fileInfo && fileInfo.path)
        .filter((path) => typeof path === "string" && path)
    );

    const roots = {};
    const nodeMap = new Map();

    for (const fileInfo of allFiles) {
      const goldenPath = fileInfo && fileInfo.path;
      if (!this._shouldIncludeProjectFilePath(goldenPath)) continue;

      const sidecarDocPath = this.getDocPathForSource(goldenPath);
      const hasDocs = !!fileInfo.hasDocs || allPathSet.has(sidecarDocPath);
      const canHaveDocs = this.canHaveDocs(goldenPath);
      const pathSegments = String(goldenPath).substring(1).split("/");

      if (pathSegments.length === 0 || pathSegments[0] === "") continue;

      const rootName = pathSegments[0];

      if (rootName === "Project Browser") {
        continue;
      }

      const rootId = "/" + rootName;

      if (!roots[rootId]) {
        const isRootFile = pathSegments.length === 1;
        roots[rootId] = {
          id: rootId,
          name: rootName,
          type: isRootFile ? "file" : "directory",
          children: isRootFile ? undefined : [],
          isExpanded: !isRootFile,
          readOnly: false,
          hasDocs: isRootFile ? hasDocs : undefined,
          canHaveDocs: isRootFile ? canHaveDocs : undefined
        };
        nodeMap.set(rootId, roots[rootId]);
      }

      if (pathSegments.length === 1) {
        if (roots[rootId].type === "file") {
          roots[rootId].hasDocs = hasDocs;
          roots[rootId].canHaveDocs = canHaveDocs;
        }
        continue;
      }

      this._insertPathSegments({
        nodeMap,
        rootNode: roots[rootId],
        rootId,
        pathSegments,
        hasDocs,
        canHaveDocs
      });
    }

    const finalRoots = Object.values(roots);
    this.sortRootNodes(finalRoots);
    finalRoots.forEach((node) => this.sortChildrenDeep(node));
    return finalRoots;
  }

  buildWorkspaceTreeDataFromPaths(paths, rootId, rootName) {
    const root = {
      id: rootId,
      name: rootName,
      type: "directory",
      children: [],
      isExpanded: true,
      readOnly: false,
      workspaceRoot: true,
      workspaceRootId: rootId
    };

    const nodeMap = new Map([[rootId, root]]);

    for (const fullPath of Array.from(paths || []).sort()) {
      if (typeof fullPath !== "string") continue;
      if (fullPath === rootId) continue;
      if (!fullPath.startsWith(rootId + "/")) continue;
      if (this.isSidecarOrMetadataFile(fullPath)) continue;
      if (this.isHiddenImplementationCapsulePath(fullPath)) continue;

      const relParts = fullPath
        .slice(rootId.length + 1)
        .split("/")
        .filter(Boolean);

      let parent = root;
      let built = rootId;

      for (let i = 0; i < relParts.length; i += 1) {
        const part = relParts[i];
        built += "/" + part;

        let node = nodeMap.get(built);
        const isLast = i === relParts.length - 1;

        if (!node) {
          node = {
            id: built,
            name: part,
            type: isLast ? "file" : "directory",
            children: isLast ? undefined : [],
            isExpanded: !isLast,
            readOnly: false,
            workspaceRoot: true,
            workspaceRootId: rootId
          };

          if (!parent.children) parent.children = [];
          parent.children.push(node);
          nodeMap.set(built, node);
        }

        parent = node;
      }
    }

    this.sortChildrenDeep(root);
    return root;
  }

  externalStoreToFileTreeData(rootId, store) {
    const root = {
      id: rootId,
      name: String(rootId || "").replace(new RegExp("^/+"), ""),
      path: rootId,
      type: "directory",
      children: [],
      isExpanded: true
    };

    const byPath = new Map([[rootId, root]]);
    const metadata = {};
    const paths = Array.from(store && store.keys ? store.keys() : [])
      .filter((path) => typeof path === "string" && path.startsWith(rootId + "/"))
      .sort();

    for (const fullPath of paths) {
      if (this.isSidecarOrMetadataFile(fullPath)) continue;
      if (this.isHiddenImplementationCapsulePath(fullPath)) continue;

      const content = store.get(fullPath);
      const isText = typeof content === "string";
      const docsPath = this.getDocPathForSource(fullPath);
      const docsContent = store.get(docsPath);

      metadata[fullPath] = this.analyzePromptMetadataForFile(
        fullPath,
        isText ? content : "",
        docsContent
      );

      const hasDocsContent = !!metadata[fullPath].hasDocs;
      const rel = fullPath.slice(rootId.length + 1);
      const parts = rel.split("/").filter(Boolean);

      let current = root;
      let built = rootId;

      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i];
        built += "/" + part;
        const isFile = i === parts.length - 1;

        let node = byPath.get(built);

        if (!node) {
          node = {
            id: built,
            name: part,
            path: built,
            type: isFile ? "file" : "directory",
            children: isFile ? null : [],
            isExpanded: !isFile,
            hasDocs: isFile ? hasDocsContent : undefined,
            readOnly: false
          };

          if (current.children) current.children.push(node);
          byPath.set(built, node);
        } else if (isFile) {
          node.hasDocs = hasDocsContent;
        }

        current = node;
      }
    }

    this.sortChildrenDeep(root);
    return { treeData: root, metadata };
  }

  analyzePromptMetadataForFile(path, content, docsContent) {
    if (
      this.metadataAnalyzer &&
      typeof this.metadataAnalyzer.analyzePromptMetadataForFile === "function"
    ) {
      return this.metadataAnalyzer.analyzePromptMetadataForFile(
        path,
        content,
        docsContent
      );
    }

    const text = typeof content === "string" ? content : "";
    const sidecarText = typeof docsContent === "string" ? docsContent : "";
    const totalLines = this.countLines(text);
    const docSize = sidecarText.length > 0 ? this.countLines(sidecarText) : 0;

    return {
      codeSize: totalLines,
      docSize,
      metadataSize: 0,
      totalLines,
      sidecarDocSize: docSize,
      capsuleDocSize: 0,
      isStructured: this.isJavaScriptLikePath(path),
      hasDocs: docSize > 0,
      hasCapsuleDocs: false,
      hasRuntimeMetadata: false,
      isStrictCapsule: false,
      isPureDocCapsule: false
    };
  }

  getDocPathForSource(sourceGoldenPath) {
    if (!sourceGoldenPath || !String(sourceGoldenPath).includes(".")) {
      return null;
    }

    if (
      typeof SidecarDocumentation !== "undefined" &&
      typeof SidecarDocumentation.docsPathForFile === "function"
    ) {
      return SidecarDocumentation.docsPathForFile(sourceGoldenPath);
    }

    const parts = String(sourceGoldenPath).split("/");
    const filename = parts.pop();
    if (!filename) return null;

    const docFilename =
      filename.replace(new RegExp("[^\\w.-]+", "g"), "_").replaceAll(".", "_") +
      ".md";

    parts.push(docFilename);
    return parts.join("/");
  }

  canHaveDocs(path) {
    const lower = String(path || "").toLowerCase();
    const binarySuffixes = [
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
      ".svg",
      ".ico",
      ".bmp"
    ];

    return !binarySuffixes.some((suffix) => lower.endsWith(suffix));
  }

  sortRootNodes(nodes) {
    nodes.sort((a, b) => {
      if (this.projectName && a.name === this.projectName) return -1;
      if (this.projectName && b.name === this.projectName) return 1;
      if (a.name === "@ext") return 1;
      if (b.name === "@ext") return -1;
      if (a.name === "library") return 1;
      if (b.name === "library") return -1;
      return a.name.localeCompare(b.name);
    });
  }

  sortChildrenDeep(node) {
    if (!node || !node.children || !node.children.length) return;

    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    node.children.forEach((child) => this.sortChildrenDeep(child));
  }

  isSidecarOrMetadataFile(goldenPath) {
    const filename =
      String(goldenPath || "")
        .split("/")
        .pop() || "";

    const exactNames = [
      "_folder.meta.yaml",
      "file_metadata.json",
      "project_metadata.json",
      "clone-metadata.json"
    ];

    if (exactNames.includes(filename)) return true;

    const sidecarMd = new RegExp(
      "_(js|mjs|cjs|ts|tsx|jsx|html|htm|css|json|yaml|yml|txt|md)\\.md$",
      "i"
    );

    const sidecarYaml = new RegExp(
      "_(js|mjs|cjs|ts|tsx|jsx|html|htm|css|json|yaml|yml|txt|md)\\.ya?ml$",
      "i"
    );

    return sidecarMd.test(filename) || sidecarYaml.test(filename);
  }

  isFolderMetaCapsulePath(path) {
    return new RegExp("(^|/)_folder\\.js$", "i").test(String(path || ""));
  }

  isHiddenImplementationCapsulePath(path) {
    return this.isFolderMetaCapsulePath(path);
  }

  isJavaScriptLikePath(path) {
    const lower = String(path || "").toLowerCase();
    return [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"].some((suffix) =>
      lower.endsWith(suffix)
    );
  }

  countLines(text) {
    if (typeof text !== "string" || text.length === 0) return 0;
    return text.split("\n").length;
  }

  _shouldIncludeProjectFilePath(goldenPath) {
      if (!goldenPath) return false;
      if (goldenPath.includes("/reports/")) return false;
      if (goldenPath.includes("/visibilitySets/")) return false;
      if (this.isSidecarOrMetadataFile(goldenPath)) return false;
      return true;
    }

  _insertPathSegments(options) {
    const nodeMap = options.nodeMap;
    const pathSegments = options.pathSegments;
    let currentParentNode = options.rootNode;
    let builtPath = options.rootId;

    for (let i = 1; i < pathSegments.length; i += 1) {
      const partName = pathSegments[i];
      builtPath += "/" + partName;

      let childNode = nodeMap.get(builtPath);
      const isLastSegment = i === pathSegments.length - 1;

      if (!childNode) {
        childNode = {
          id: builtPath,
          name: partName,
          type: isLastSegment ? "file" : "directory",
          readOnly: false,
          hasDocs: isLastSegment ? options.hasDocs : undefined,
          canHaveDocs: isLastSegment ? options.canHaveDocs : undefined,
          children: isLastSegment ? undefined : [],
          isExpanded: !isLastSegment
        };

        currentParentNode.children.push(childNode);
        nodeMap.set(builtPath, childNode);
      } else if (isLastSegment) {
        childNode.hasDocs = options.hasDocs;
        childNode.canHaveDocs = options.canHaveDocs;
      }

      currentParentNode = childNode;
    }
  }

}