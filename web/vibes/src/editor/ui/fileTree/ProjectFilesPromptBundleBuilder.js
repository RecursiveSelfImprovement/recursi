class ProjectFilesPromptBundleBuilder {
  
  constructor(options = {}) {
    this.app = options.app || null;
    this.manager = options.manager || null;
  }

  collectPromptFilesAcrossOpenTrees(options = {}) {
    const results = [];
    const seen = new Map();
    const trees = this.describePromptBundleTrees(options);

    for (const tree of trees) {
      const partial = this.collectPromptFilesFromTreeView(
        tree.treeView,
        tree,
        options
      );

      for (const item of partial) {
        const existing = seen.get(item.path);

        if (!existing) {
          seen.set(item.path, item);
          results.push(item);
          continue;
        }

        this.mergePromptBundleDuplicate(existing, item);
      }
    }

    results.sort((a, b) => a.path.localeCompare(b.path));
    return results;
  }

  describePromptBundleTrees(options = {}) {
      const trees = [];
      const manager = options.manager || this.manager || null;

      const treeViews =
        options.treeViews ||
        (typeof manager?.getFileTreeViews === "function"
          ? manager.getFileTreeViews()
          : []);

      let index = 0;

      for (const treeView of treeViews || []) {
        if (!treeView) continue;

        const rootNames = this.rootNamesForTreeView(treeView)
          .slice(0, 3)
          .map((path) => String(path).replace(new RegExp("^/+"), ""));

        trees.push({
          label: rootNames.join(", ") || "tree-" + index,
          treeView,
          // OBSOLETE: The "main tree" concept is obsolete. Every tree is a sibling "floating" tree.
          // This is scheduled to be completely trashed on the next pass.
          kind: "floating",
          index
        });

        index += 1;
      }

      return trees;
    }

  rootNamesForTreeView(treeView) {
    if (!treeView || !treeView.nodesMap) return [];

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

  collectPromptFilesFromTreeView(treeView, treeInfo = {}, options = {}) {
    const out = [];

    if (!treeView || !treeView.nodesMap) {
      return out;
    }

    for (const pair of treeView.nodesMap) {
      const path = pair[0];
      const node = pair[1];

      if (!node || node.type !== "file") continue;

      const state = this.promptBundleWidgetState(node);
      if (!this.promptBundleStateIsSelected(state)) continue;

      const content = this.readPromptBundleFileContent(path, options);

      out.push({
        path,
        treeLabel: treeInfo.label || "tree",
        treeKind: treeInfo.kind || "unknown",
        state,
        content,
        hasContent: typeof content === "string",
        contentLength: typeof content === "string" ? content.length : 0
      });
    }

    return out;
  }

  mergePromptBundleDuplicate(existing, item) {
    existing.sources = existing.sources || [existing.treeLabel];

    if (!existing.sources.includes(item.treeLabel)) {
      existing.sources.push(item.treeLabel);
    }

    existing.duplicateCount = (existing.duplicateCount || 1) + 1;

    existing.state = {
      ...(existing.state || {}),
      ...(item.state || {}),
      code: !!(existing.state?.code || item.state?.code),
      signatures: !!(existing.state?.signatures || item.state?.signatures),
      docs: !!(existing.state?.docs || item.state?.docs),
      docsLevel: Math.max(
        Number(existing.state?.docsLevel || 0),
        Number(item.state?.docsLevel || 0)
      ),
      codeLevel: Math.max(
        Number(existing.state?.codeLevel || 0),
        Number(item.state?.codeLevel || 0)
      )
    };

    return existing;
  }

  promptBundleWidgetState(node) {
    const widget =
      node?.visibilityWidget || node?.widget || node?.visibility || null;

    const raw =
      widget?.state ||
      widget?.getState?.() ||
      node?.visibilityState ||
      node?.state ||
      null;

    if (!raw) {
      return {
        code: false,
        signatures: false,
        docs: false,
        docsLevel: 0,
        codeLevel: 0
      };
    }

    return {
      ...raw,
      code: !!raw.code,
      signatures: !!(raw.signatures || raw.sig),
      docs: !!raw.docs || Number(raw.docsLevel || 0) > 0,
      docsLevel: Number(raw.docsLevel || 0),
      codeLevel: Number(raw.codeLevel || (raw.code ? 4 : 0))
    };
  }

  promptBundleStateIsSelected(state) {
    if (!state) return false;

    return !!(
      state.code ||
      state.signatures ||
      state.sig ||
      state.docs ||
      Number(state.docsLevel || 0) > 0
    );
  }

  readPromptBundleFileContent(path) {
    const key = String(path || "").trim();

    if (!key) {
      return null;
    }

    const manager = this.manager || this.app?.projectFilesManager || null;

    if (manager && typeof manager.getFileContent === "function") {
      return manager.getFileContent(key);
    }

    const rootId = "/" + key.split("/").filter(Boolean)[0];
    const store = this.app?.workspaceFileStores?.get?.(rootId);
    const fromStore = this.readPromptBundleFileFromStore(store, key);

    if (typeof fromStore === "string") {
      return fromStore;
    }

    const memoryStore = this.app?.inMemoryFileStore;
    const fromMemory = this.readPromptBundleFileFromStore(memoryStore, key);

    if (typeof fromMemory === "string") {
      return fromMemory;
    }

    return null;
  }

  readPromptBundleFileFromStore(store, path) {
    return this._readPromptBundleFileFromStore(store, path);
  }

  readPromptBundleFileFromApiSync(path) {
    return null;
  }

  async buildPromptBundleAcrossOpenTrees(options = {}) {
      const trees = Array.isArray(options.treeViews)
        ? options.treeViews
        : (this.manager && typeof this.manager.getFileTreeViews === 'function')
          ? this.manager.getFileTreeViews()
          : [];

      const generatedAt = new Date().toISOString();
      const projectName = this.manager?.app?.projectName || "";
      const sourceProjectName = this.manager?.app?.sourceProjectName || "";

      const fileMap = new Map();
      const filesInfo = [];

      for (const treeView of trees) {
        if (!treeView) continue;
        const treeInfo = this.manager?.getTreeIdentity
          ? this.manager.getTreeIdentity(treeView)
          : { label: treeView.constructor.name };

        const items = this.collectPromptFilesFromTreeView(treeView, treeInfo, options);
        for (const item of items) {
          this.mergePromptBundleDuplicate(fileMap, item);
        }
      }

      const list = Array.from(fileMap.values()).sort((a, b) => {
        return String(a.path).localeCompare(String(b.path));
      });

      const processed = [];
      const failed = [];

      for (const item of list) {
        try {
          const content = await this.readPromptBundleFileContent(item.path);
          if (typeof content === "string") {
            item.content = content;
            processed.push(item);
          } else {
            failed.push(item.path);
          }
        } catch (error) {
          failed.push(item.path);
        }
      }

      const outputText = this.getCurrentPromptOutputTextForBundle(options);
      const buildPromptText = await this.getCurrentBuildPromptTextForBundle(options);

      const bundle = {
        generatedAt,
        projectName,
        sourceProjectName,
        buildPromptText,
        outputText,
        files: processed,
        failed,
        text: ""
      };

      bundle.text = this.formatPromptBundleAcrossOpenTrees(bundle);
      return bundle;
    }

  async getCurrentBuildPromptTextForBundle(options = {}) {
    const app = options.app || this.app || this.manager?.app || null;
    const tab = options.buildPromptTab || app?.buildPromptTab || null;

    if (!tab) return "";

    try {
      if (typeof tab._generatePrompt === "function") {
        const value = await tab._generatePrompt();
        if (typeof value === "string") return value;
      }
    } catch (error) {}

    try {
      if (typeof tab._buildPromptString === "function") {
        const value = tab._buildPromptString();
        if (typeof value === "string") return value;
      }
    } catch (error) {}

    const el = tab.getElement?.();
    if (!el) return "";

    const textarea = el.querySelector?.("textarea");
    if (textarea && textarea.value) return textarea.value;

    return "";
  }

  getCurrentPromptOutputTextForBundle(options = {}) {
    const app = options.app || this.app || this.manager?.app || null;
    const tab = options.outputTab || app?.outputTab || null;

    if (!tab) return "";

    const candidates = [
      tab.outputText,
      tab.content,
      tab.text,
      tab.currentText,
      tab.lastContent
    ];

    for (const value of candidates) {
      if (typeof value === "string" && value.trim()) return value;
    }

    const el = tab.getElement?.();
    if (!el) return "";

    const textareas = Array.from(el.querySelectorAll?.("textarea") || []);
    const textareaText = textareas
      .map((item) => item.value || "")
      .filter(Boolean)
      .join("\n\n");

    if (textareaText.trim()) return textareaText;

    const preText = Array.from(el.querySelectorAll?.("pre, code") || [])
      .map((item) => item.textContent || "")
      .filter(Boolean)
      .join("\n\n");

    if (preText.trim()) return preText;

    return el.innerText || el.textContent || "";
  }

  formatPromptBundleAcrossOpenTrees(bundle = {}) {
    const lines = [];

    lines.push("// Project: " + (this.app?.projectName || "unknown"));
    lines.push("// Prompt Bundle Generated: " + new Date().toISOString());
    lines.push("");

    if (bundle.buildPromptText && bundle.buildPromptText.trim()) {
      lines.push("// Build Prompt");
      lines.push(bundle.buildPromptText.trim());
      lines.push("");
    }

    if (bundle.outputText && bundle.outputText.trim()) {
      lines.push("// Prompt Output / Prior Assistant Output");
      lines.push("```text");
      lines.push(bundle.outputText.trim());
      lines.push("```");
      lines.push("");
    }

    const files = bundle.files || [];

    if (files.length) {
      lines.push("// Selected Files Across Open Trees");
      lines.push("// Count: " + files.length);
      lines.push("");

      for (const file of files) {
        lines.push("// " + file.path);
        lines.push(
          "// Tree: " +
            file.treeLabel +
            (file.duplicateCount ? " · duplicates: " + file.duplicateCount : "")
        );
        lines.push("// Visibility: " + JSON.stringify(file.state || {}));

        if (typeof file.content === "string") {
          const fence = this.fenceForPath(file.path);
          lines.push("```" + fence);
          lines.push(file.content);
          lines.push("```");
        } else {
          lines.push("/* content not readable */");
        }

        lines.push("");
      }
    } else {
      lines.push("// No selected files found across open trees.");
      lines.push("");
    }

    return lines.join("\n");
  }

  fenceForPath(path) {
    const lower = String(path || "").toLowerCase();

    if (lower.endsWith(".js")) return "javascript";
    if (lower.endsWith(".mjs")) return "javascript";
    if (lower.endsWith(".cjs")) return "javascript";
    if (lower.endsWith(".ts")) return "typescript";
    if (lower.endsWith(".tsx")) return "tsx";
    if (lower.endsWith(".jsx")) return "jsx";
    if (lower.endsWith(".html")) return "html";
    if (lower.endsWith(".htm")) return "html";
    if (lower.endsWith(".css")) return "css";
    if (lower.endsWith(".json")) return "json";
    if (lower.endsWith(".md")) return "markdown";

    return "";
  }

  async copyPromptBundleAcrossOpenTrees(options = {}) {
      const bundle = await this.buildPromptBundleAcrossOpenTrees(options);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(bundle.text);
      }

      return bundle;
    }

  _staticMigrationPathVariants(path) {
    const normalized = String(path || "").startsWith("/") ? String(path) : "/" + String(path || "");
    const withoutSlash = normalized.startsWith("/") ? normalized.slice(1) : normalized;
    const variants = [normalized, withoutSlash];

    if (normalized.startsWith("/vibes/")) {
      variants.push(normalized.slice("/vibes".length));
      variants.push(normalized.slice("/vibes/".length));
    }

    return Array.from(new Set(variants.filter(Boolean)));
  }

}