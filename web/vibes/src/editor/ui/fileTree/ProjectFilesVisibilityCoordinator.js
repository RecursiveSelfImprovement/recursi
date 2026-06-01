class ProjectFilesVisibilityCoordinator {
  
  constructor(options = {}) {
    this.app = options.app || null;
  }

  normalizeVisibilityState(state) {
    const input = state && typeof state === "object" ? state : {};

    let codeLevel = Number(input.codeLevel);
    if (!Number.isFinite(codeLevel)) {
      codeLevel = input.code ? 4 : 0;
    }

    codeLevel = Math.max(0, Math.min(4, codeLevel));

    let docsLevel = Number(input.docsLevel);
    if (!Number.isFinite(docsLevel)) {
      docsLevel = input.docs ? 4 : 0;
    }

    docsLevel = Math.max(0, Math.min(4, docsLevel));

    const signatures = !!(input.signatures || input.sig);
    const code = !!input.code || codeLevel > 0;
    const docs = !!input.docs || docsLevel > 0;

    return {
      code,
      codeLevel: code ? codeLevel || 4 : 0,
      sig: signatures,
      signatures,
      docs,
      docsLevel: docs ? docsLevel || 4 : 0
    };
  }

  normalizeVisibilitySet(setOrSpec, options = {}) {
    const input = setOrSpec && typeof setOrSpec === "object" ? setOrSpec : {};
    const name = String(
      input.name || options.name || "Unnamed Visibility Set"
    ).trim();

    const normalized = {
      id: input.id || "",
      name,
      description: input.description || "",
      scope: input.scope || options.scope || "workspace",
      resetFirst: input.resetFirst !== false,
      treeRoot: input.treeRoot || null,
      treeLabel: input.treeLabel || null,
      files: {},
      patterns: Array.isArray(input.patterns) ? input.patterns.slice() : []
    };

    let files = input.files && typeof input.files === "object" ? input.files : null;
    if (!files && input.settings && typeof input.settings === "object") files = input.settings;
    if (!files) files = input;

    for (const path of Object.keys(files || {})) {
      if (path === "name" || path === "id" || path === "description") continue;
      if (path === "scope" || path === "resetFirst" || path === "patterns") continue;
      if (path === "treeRoot" || path === "treeLabel" || path === "settings") continue;
      if (path === "savedAt" || path === "fileCount" || path === "savedMs" || path === "items") continue;

      const value = files[path];

      if (value && typeof value === "object") {
        normalized.files[path] = this.normalizeVisibilityState(value);
      }
    }

    return normalized;
  }

  getVisibilityWidgetsForTree(treeView) {
    if (!treeView) return [];

    if (typeof treeView.getAllVisibilityWidgets === "function") {
      return treeView.getAllVisibilityWidgets();
    }

    const container =
      treeView.containerElement || treeView.container || treeView.element || null;

    if (!container || !container.querySelectorAll) {
      return [];
    }

    const nodes = Array.from(
      container.querySelectorAll("[data-visibility-widget], .visibility-widget")
    );

    const widgets = [];

    for (const node of nodes) {
      if (node.visibilityWidget) {
        widgets.push(node.visibilityWidget);
      } else if (node.__visibilityWidget) {
        widgets.push(node.__visibilityWidget);
      }
    }

    return widgets;
  }

  applyVisibilitySetToTree(treeView, setOrSpec, options = {}) {
    const tree = treeView || null;

    if (!tree) {
      return {
        ok: false,
        error: "No treeView supplied.",
        applied: 0,
        reset: 0,
        tree: null
      };
    }

    const set = this.normalizeVisibilitySet(setOrSpec, options);
    const resetFirst =
      options.resetFirst != null ? !!options.resetFirst : set.resetFirst !== false;

    const widgets = this.getVisibilityWidgetsForTree(tree);
    const identity = this.getTreeIdentity(tree);

    let reset = 0;
    let applied = 0;
    const matchedPaths = [];

    for (const widget of widgets) {
      if (!widget) continue;

      const path = this.visibilityWidgetPath(widget);

      if (resetFirst && typeof widget.setState === "function") {
        widget.setState(this.normalizeVisibilityState({}), true);
        reset += 1;
      }

      const state = this.visibilityPathMatchesSpec(path, set);

      if (state && typeof widget.setState === "function") {
        widget.setState(state, true);
        applied += 1;
        matchedPaths.push(path);
      }
    }

    this.notifyScopedVisibilityChange({
      treeView: tree,
      set,
      identity,
      applied,
      reset,
      matchedPaths,
      reason: options.reason || "ProjectFilesVisibilityCoordinator.applyVisibilitySetToTree"
    });

    return {
      ok: true,
      scope: "tree",
      setName: set.name,
      tree: identity,
      widgetCount: widgets.length,
      reset,
      applied,
      matchedPaths
    };
  }

  applyVisibilitySetToAllTrees(treeViews, setOrSpec, options = {}) {
    const set = this.normalizeVisibilitySet(setOrSpec, options);
    const unique = [];
    const seen = new Set();

    for (const view of treeViews || []) {
      if (!view || seen.has(view)) continue;
      seen.add(view);
      unique.push(view);
    }

    const results = [];

    for (const treeView of unique) {
      results.push(
        this.applyVisibilitySetToTree(treeView, set, {
          ...options,
          resetFirst: set.resetFirst !== false,
          reason:
            options.reason ||
            "ProjectFilesVisibilityCoordinator.applyVisibilitySetToAllTrees"
        })
      );
    }

    const applied = results.reduce(
      (sum, item) => sum + Number(item.applied || 0),
      0
    );

    const reset = results.reduce(
      (sum, item) => sum + Number(item.reset || 0),
      0
    );

    return {
      ok: true,
      scope: "all-trees",
      setName: set.name,
      treeCount: results.length,
      applied,
      reset,
      results
    };
  }

  visibilityPathMatchesSpec(path, set) {
    if (!path) return null;

    const files =
      set && set.files && typeof set.files === "object" ? set.files : {};

    if (Object.prototype.hasOwnProperty.call(files, path)) {
      return this.normalizeVisibilityState(files[path]);
    }

    const patterns = set && Array.isArray(set.patterns) ? set.patterns : [];

    for (const pattern of patterns) {
      if (!pattern) continue;

      let matched = false;

      if (typeof pattern.match === "string") {
        matched = path.includes(pattern.match);
      } else if (pattern.match && typeof pattern.match.test === "function") {
        matched = pattern.match.test(path);
      }

      if (matched) {
        return this.normalizeVisibilityState(pattern);
      }
    }

    return null;
  }

  visibilityWidgetPath(widget) {
    if (!widget) return "";

    const candidates = [
      widget.file && widget.file.path,
      widget.fileData && widget.fileData.path,
      widget.options && widget.options.fileData && widget.options.fileData.path,
      widget.path,
      widget.filePath,
      widget.goldenPath,
      widget.nodeId,
      widget.id,
      widget.options && widget.options.path,
      widget.options && widget.options.filePath,
      widget.options && widget.options.goldenPath,
      widget.node && widget.node.path,
      widget.node && widget.node.filePath,
      widget.node && widget.node.goldenPath,
      widget.node && widget.node.id,
      widget.treeNode && widget.treeNode.path,
      widget.treeNode && widget.treeNode.filePath,
      widget.treeNode && widget.treeNode.goldenPath,
      widget.treeNode && widget.treeNode.id,
      widget.data && widget.data.path,
      widget.data && widget.data.filePath,
      widget.data && widget.data.goldenPath,
      widget.data && widget.data.id
    ];

    for (const value of candidates) {
      if (value != null && String(value).trim()) {
        return String(value).trim();
      }
    }

    const element =
      typeof widget.getElement === "function" ? widget.getElement() : widget.element;

    if (element && element.closest) {
      const row = element.closest("[data-node-id], [data-path], [data-file-path]");

      if (row) {
        const value =
          row.getAttribute("data-path") ||
          row.getAttribute("data-file-path") ||
          row.getAttribute("data-node-id");

        if (value) return value;
      }
    }

    return "";
  }

  getTreeIdentity(treeView) {
      const tree = treeView || null;
      const options = tree && tree.options && typeof tree.options === "object" ? tree.options : {};
      const container = tree && tree.containerElement ? tree.containerElement : null;

      const rootId =
        options.rootId ||
        options.workspaceRootId ||
        options.storeRootId ||
        options.projectRootId ||
        tree.rootId ||
        tree.workspaceRootId ||
        tree.storeRootId ||
        "";

      const store = options.store || options.fileStore || tree.store || tree.fileStore || null;
      const storeName = options.storeName || options.workspaceName || options.projectName || (store && (store.name || store.rootName || store.folderName)) || "";

      const label = options.label || options.title || options.displayName || options.rootLabel || storeName || rootId || "Project tree";
      const elementId = container && container.id ? container.id : "";
      const className = tree && tree.constructor && tree.constructor.name ? tree.constructor.name : "FileTreeView";

      const widgetCount = tree && typeof tree.getAllVisibilityWidgets === "function" ? tree.getAllVisibilityWidgets().length : 0;

      const identity = {
        id: this.treeIdentityString({ rootId, label, elementId, className }),
        rootId: rootId || "",
        label: String(label || "Project tree"),
        displayName: "",
        className,
        elementId,
        widgetCount,
        hasStore: !!store,
        optionKeys: Object.keys(options).sort()
      };

      identity.displayName = this.getTreeDisplayName(tree);
      return identity;
    }

  getTreeDisplayName(treeView) {
    const tree = treeView || null;
    const options =
      tree && tree.options && typeof tree.options === "object" ? tree.options : {};
    const store =
      options.store || options.fileStore || (tree && (tree.store || tree.fileStore)) || null;

    const candidates = [
      options.displayName,
      options.label,
      options.title,
      options.rootLabel,
      options.workspaceName,
      options.storeName,
      options.projectName,
      tree && tree.displayName,
      tree && tree.label,
      tree && tree.title,
      store && store.displayName,
      store && store.name,
      store && store.rootName,
      store && store.folderName,
      options.rootId,
      tree && tree.rootId
    ];

    for (const value of candidates) {
      if (value != null && String(value).trim()) {
        return String(value).trim();
      }
    }

    return "File tree";
  }

  treeIdentityString(parts) {
    const input = parts && typeof parts === "object" ? parts : {};
    const raw = [
      input.rootId || "",
      input.label || "",
      input.elementId || "",
      input.className || ""
    ].join("|");

    let hash = 0;

    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }

    return "tree-" + Math.abs(hash).toString(36);
  }

  notifyScopedVisibilityChange(details = {}) {
    if (this.app && typeof this.app.notifyVisibilityChange === "function") {
      this.app.notifyVisibilityChange(details);
    }

    if (
      details.treeView &&
      typeof details.treeView.checkActiveNodeVisibility === "function"
    ) {
      details.treeView.checkActiveNodeVisibility();
    }

    return true;
  }

}