class ProjectFloatingExternalEditor {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  floatingEditorLanguageForPath(path) {
    const ext = String(path || "").split(".").pop().toLowerCase();

    if (["js", "mjs", "cjs", "ts", "tsx", "jsx"].includes(ext)) {
      return "javascript";
    }

    if (["html", "htm"].includes(ext)) return "html";
    if (ext === "css") return "css";
    if (ext === "json") return "json";
    if (["md", "markdown"].includes(ext)) return "markdown";

    return "text";
  }

  makeFloatingSignatureForContent(path, content) {
    if (typeof content !== "string") return "(binary file)";

    const ext = String(path || "").split(".").pop().toLowerCase();

    if (!["js", "mjs", "cjs", "ts", "tsx", "jsx"].includes(ext)) {
      return [
        `File: ${path}`,
        `Type: .${ext || "unknown"}`,
        `Lines: ${content.split("\n").length}`,
        `Characters: ${content.length}`
      ].join("\n");
    }

    const lines = [];
    const classMatches = [
      ...content.matchAll(/^\s*class\s+([A-Za-z_$][\w$]*)/gm)
    ];
    const functionMatches = [
      ...content.matchAll(
        /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm
      )
    ];
    const methodMatches = [
      ...content.matchAll(
        /^\s{2,}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm
      )
    ];

    lines.push(`File: ${path}`);
    lines.push(`Lines: ${content.split("\n").length}`);
    lines.push("");

    if (classMatches.length) {
      lines.push("Classes:");
      for (const match of classMatches) {
        lines.push("  class " + match[1]);
      }
      lines.push("");
    }

    if (functionMatches.length) {
      lines.push("Functions:");
      for (const match of functionMatches) {
        lines.push("  function " + match[1] + "()");
      }
      lines.push("");
    }

    if (methodMatches.length) {
      lines.push("Methods:");
      for (const match of methodMatches.slice(0, 80)) {
        lines.push("  " + match[1] + "()");
      }

      if (methodMatches.length > 80) {
        lines.push(`  ...${methodMatches.length - 80} more`);
      }
    }

    if (lines.length <= 3) {
      lines.push("(No JS classes/functions found.)");
    }

    return lines.join("\n");
  }

  docsPathForExternalPath(path) {
    const withoutSlash = String(path || "").replace(/^\//, "");
    const safe = withoutSlash.replace(/[\/.]/g, "_");
    const root = "/" + withoutSlash.split("/")[0];

    return `${root}/.vibes/docs/${safe}.md`;
  }

  async openFloatingExternalEditorWindow(manager, path, store) {
      const state =
        typeof manager?._ensureFloatingFileTreeState === "function"
          ? manager._ensureFloatingFileTreeState()
          : this.ensureFallbackFloatingState(manager);

      if (!state.editors) state.editors = new Map();

      const existing = state.editors.get(path);

      if (existing?.window?.contentElement?.isConnected) {
        existing.window.bringToFront?.();
        return existing.window;
      }

      const ext = String(path || "").split(".").pop().toLowerCase();
      const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg", "ico", "bmp"].includes(ext);

      // Redirect image files to the floating image viewer dialog
      if (isImage && manager.app?.tabOrchestrator?._openImageViewerTab) {
        const win = manager.app.tabOrchestrator._openImageViewerTab(path, path, path.split('/').pop(), '.' + ext);
        state.editors.set(path, { window: win, path, store });
        return win;
      }

      if (typeof FloatingEditorWindow === "undefined") {
        return this.openFloatingExternalFileWindow(manager, path, store);
      }

      const win = new FloatingEditorWindow({
        app: manager.app,
        path,
        store,
        rootId: "/" + String(path).split("/").filter(Boolean)[0]
      });

      await win.open();

      state.editors.set(path, { window: win, path, store });
      return win;
    }

  openFloatingExternalFileWindow(manager, path, store) {
    const content = store?.get?.(path);
    const isText = typeof content === "string";

    const status = makeElement(
      "div",
      {
        style: {
          color: "#7f8caf",
          fontSize: "11px",
          marginLeft: "auto"
        }
      },
      isText ? "text file" : "binary / unavailable"
    );

    const saveBtn = this.makeExternalEditorButton("💾 Save", null, {
      background: "rgba(45,90,60,0.85)"
    });

    const closeBtn = this.makeExternalEditorButton("✕ Close", null, {
      background: "rgba(80,45,55,0.85)"
    });

    const toolbar = makeElement("div", {
      style: {
        display: "flex",
        gap: "7px",
        alignItems: "center",
        padding: "7px",
        background: "rgba(18, 22, 34, 0.98)",
        borderBottom: "1px solid rgba(255,255,255,0.08)"
      }
    });

    const pathLabel = makeElement(
      "div",
      {
        style: {
          flex: "1",
          color: "#b8c9ff",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "ui-monospace, Menlo, Consolas, monospace",
          fontSize: "11px"
        },
        title: path
      },
      path
    );

    toolbar.append(pathLabel, status, saveBtn, closeBtn);

    const editor = makeElement("textarea", {
      style: {
        flex: "1",
        width: "100%",
        resize: "none",
        boxSizing: "border-box",
        border: "none",
        outline: "none",
        padding: "10px",
        background: "#080b12",
        color: "#dce6ff",
        fontFamily: "ui-monospace, Menlo, Consolas, monospace",
        fontSize: "12px",
        lineHeight: "1.45"
      },
      spellcheck: "false",
      value: isText ? content : "[Binary or unavailable file]",
      readOnly: !isText
    });

    const contentElement = makeElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "#080b12"
        }
      },
      toolbar,
      editor
    );

    const dialog = UITools.makeDialog({
      title: "📄 " + String(path || "").split("/").pop(),
      contentElement,
      size: [760, 620],
      position: [140 + Math.random() * 80, 90 + Math.random() * 80]
    });

    saveBtn.onclick = async () => {
      if (!isText) return;

      try {
        status.textContent = "saving…";
        await store.set(path, editor.value);
        status.textContent = "saved " + new Date().toLocaleTimeString();

        if (manager?.app?.workspaceFileStores) {
          manager.app.workspaceFileStores.set(
            path.split("/").slice(0, 2).join("/"),
            store
          );
        }

        if (typeof manager?._refreshFloatingTreeForPath === "function") {
          manager._refreshFloatingTreeForPath(path);
        }
      } catch (error) {
        status.textContent = "save failed";
        console.error("[External Folder Editor] save failed:", error);
      }
    };

    closeBtn.onclick = () => {
      try {
        dialog.close?.();
      } catch (error) {
        contentElement.closest(".dialog-box")?.remove?.();
      }
    };

    return dialog;
  }

  refreshFloatingTreeForPath(manager, path) {
    const rootId = "/" + String(path || "").split("/").filter(Boolean)[0];
    const state =
      typeof manager?._ensureFloatingFileTreeState === "function"
        ? manager._ensureFloatingFileTreeState()
        : manager?.floatingFileTreeState;

    const treeInfo = state?.trees?.get?.(rootId);
    const store = manager?.app?.workspaceFileStores?.get?.(rootId);

    if (!treeInfo || !store) return false;

    if (typeof manager?._externalStoreToFileTreeData !== "function") {
      return false;
    }

    const rebuilt = manager._externalStoreToFileTreeData(rootId, store);

    treeInfo.metadata = rebuilt.metadata;
    treeInfo.treeData = rebuilt.treeData;
    treeInfo.treeView?.setData?.([rebuilt.treeData], rebuilt.metadata);

    return true;
  }

  makeExternalEditorButton(label, onClick, extraStyle = {}) {
    return makeElement(
      "button",
      {
        style: {
          padding: "5px 9px",
          fontSize: "12px",
          borderRadius: "6px",
          border: "1px solid rgba(130,160,255,0.45)",
          background: "rgba(45,65,120,0.85)",
          color: "#dfe8ff",
          cursor: "pointer",
          ...extraStyle
        },
        onclick: onClick
      },
      label
    );
  }

  ensureFallbackFloatingState(manager) {
    if (!manager.floatingFileTreeState) {
      manager.floatingFileTreeState = {
        launcherDialog: null,
        launcherContent: null,
        rootsList: null,
        status: null,
        trees: new Map(),
        editors: new Map()
      };
    }

    if (!manager.floatingFileTreeState.editors) {
      manager.floatingFileTreeState.editors = new Map();
    }

    return manager.floatingFileTreeState;
  }

}