class ProjectVisibilityToolbarTools {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  showVisibilitySetToolbarTools(manager = this.manager, options = {}) {
    if (
      manager.visibilitySetToolbarToolsDialog &&
      manager.visibilitySetToolbarToolsDialog.root &&
      manager.visibilitySetToolbarToolsDialog.root.isConnected
    ) {
      this.visibilityToolbarToolsRefresh(manager);
      return manager.visibilitySetToolbarToolsDialog;
    }

    const root = document.createElement("div");
    root.className = "visibility-set-toolbar-tools-dialog";
    root.style.position = "fixed";
    root.style.right = "22px";
    root.style.top = "88px";
    root.style.width = "520px";
    root.style.maxWidth = "calc(100vw - 44px)";
    root.style.maxHeight = "calc(100vh - 120px)";
    root.style.overflow = "auto";
    root.style.zIndex = "99999";
    root.style.padding = "14px";
    root.style.borderRadius = "16px";
    root.style.border = "1px solid rgba(130,170,255,0.45)";
    root.style.background = "rgba(14,18,32,0.94)";
    root.style.color = "#eef3ff";
    root.style.boxShadow =
      "0 16px 50px rgba(0,0,0,0.55), 0 0 30px rgba(80,130,255,0.18)";
    root.style.backdropFilter = "blur(10px)";
    root.style.fontFamily = "system-ui, sans-serif";
    root.style.fontSize = "13px";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "10px";
    header.style.marginBottom = "10px";

    const title = document.createElement("div");
    title.textContent = "Visibility Set Tools";
    title.style.fontSize = "16px";
    title.style.fontWeight = "700";

    const closeButton = this.visibilityToolbarToolsMakeButton(
      manager,
      "Close",
      () => {
        root.remove();
      }
    );

    header.appendChild(title);
    header.appendChild(closeButton);

    const body = document.createElement("div");
    body.className = "visibility-set-toolbar-tools-body";

    const status = document.createElement("div");
    status.className = "visibility-set-toolbar-tools-status";
    status.style.marginTop = "10px";
    status.style.padding = "8px";
    status.style.borderRadius = "10px";
    status.style.background = "rgba(255,255,255,0.06)";
    status.style.whiteSpace = "pre-wrap";
    status.style.lineHeight = "1.35";
    status.style.color = "#dbe6ff";
    status.textContent = "Loading...";

    root.appendChild(header);
    root.appendChild(body);
    root.appendChild(status);
    document.body.appendChild(root);

    manager.visibilitySetToolbarToolsDialog = {
      root,
      body,
      status,
      options,
      renderPromise: null,
      renderError: null
    };

    manager.visibilitySetToolbarToolsDialog.renderPromise =
      this.renderVisibilitySetToolbarTools(manager).catch((error) => {
        manager.visibilitySetToolbarToolsDialog.renderError = error;
        this.visibilityToolbarToolsSetStatus(
          manager,
          error && error.message ? error.message : String(error)
        );
        return null;
      });

    return manager.visibilitySetToolbarToolsDialog;
  }

  async renderVisibilitySetToolbarTools(manager = this.manager) {
    const dialog = manager.visibilitySetToolbarToolsDialog;

    if (!dialog || !dialog.body) {
      return null;
    }

    const body = dialog.body;
    body.innerHTML = "";

    const intro = document.createElement("div");
    intro.textContent =
      "Manual controls only. This does not hook lifecycle methods or auto-install anything.";
    intro.style.opacity = "0.82";
    intro.style.lineHeight = "1.35";
    intro.style.marginBottom = "12px";

    const buttonRow = document.createElement("div");
    buttonRow.style.display = "flex";
    buttonRow.style.flexWrap = "wrap";
    buttonRow.style.gap = "8px";
    buttonRow.style.marginBottom = "12px";

    const installButton = this.visibilityToolbarToolsMakeButton(
      manager,
      "Install or refresh toolbars on open trees",
      async () => {
        this.visibilityToolbarToolsSetStatus(manager, "Installing toolbars...");

        if (
          typeof manager.installVisibilitySetToolbarsOnOpenTrees !== "function"
        ) {
          this.visibilityToolbarToolsSetStatus(
            manager,
            "installVisibilitySetToolbarsOnOpenTrees is not available."
          );
          return;
        }

        const result = await manager.installVisibilitySetToolbarsOnOpenTrees({
          reason: "manual visibility tools dialog"
        });

        this.visibilityToolbarToolsSetStatus(
          manager,
          JSON.stringify(result, null, 2)
        );
        this.visibilityToolbarToolsRefresh(manager);
      }
    );

    const refreshButton = this.visibilityToolbarToolsMakeButton(
      manager,
      "Refresh dialog",
      () => {
        this.visibilityToolbarToolsRefresh(manager);
      }
    );

    const listButton = this.visibilityToolbarToolsMakeButton(
      manager,
      "List open trees",
      () => {
        const trees =
          typeof manager.describeFileTreeViews === "function"
            ? manager.describeFileTreeViews()
            : [];
        this.visibilityToolbarToolsSetStatus(
          manager,
          JSON.stringify(trees, null, 2)
        );
      }
    );

    buttonRow.appendChild(installButton);
    buttonRow.appendChild(refreshButton);
    buttonRow.appendChild(listButton);

    const setsTitle = document.createElement("div");
    setsTitle.textContent = "Saved visibility sets";
    setsTitle.style.fontWeight = "700";
    setsTitle.style.margin = "12px 0 6px";

    const setsBox = document.createElement("div");
    setsBox.style.border = "1px solid rgba(130,170,255,0.22)";
    setsBox.style.borderRadius = "12px";
    setsBox.style.padding = "8px";
    setsBox.style.background = "rgba(255,255,255,0.035)";
    setsBox.style.marginBottom = "12px";

    let sets = [];

    if (typeof manager.listStoredVisibilitySetSummaries === "function") {
      sets = await manager.listStoredVisibilitySetSummaries();
    }

    this.renderVisibilitySetRows(manager, setsBox, sets);

    const treesTitle = document.createElement("div");
    treesTitle.textContent = "Open trees";
    treesTitle.style.fontWeight = "700";
    treesTitle.style.margin = "12px 0 6px";

    const treesBox = document.createElement("div");
    treesBox.style.border = "1px solid rgba(130,170,255,0.22)";
    treesBox.style.borderRadius = "12px";
    treesBox.style.padding = "8px";
    treesBox.style.background = "rgba(255,255,255,0.035)";

    this.renderVisibilityTreeRows(manager, treesBox, sets);

    body.appendChild(intro);
    body.appendChild(buttonRow);
    body.appendChild(setsTitle);
    body.appendChild(setsBox);
    body.appendChild(treesTitle);
    body.appendChild(treesBox);

    this.visibilityToolbarToolsSetStatus(manager, "Ready.");
    return dialog;
  }

  renderVisibilitySetRows(manager = this.manager, setsBox, sets = []) {
    if (!sets.length) {
      const empty = document.createElement("div");
      empty.textContent = "No saved visibility sets found.";
      empty.style.opacity = "0.72";
      setsBox.appendChild(empty);
      return;
    }

    for (const set of sets) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.gap = "8px";
      row.style.padding = "6px 4px";
      row.style.borderBottom = "1px solid rgba(255,255,255,0.06)";

      const name = document.createElement("div");
      name.textContent =
        (set.name || "(unnamed)") +
        " - " +
        Number(set.fileCount || 0) +
        " files";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";
      name.style.whiteSpace = "nowrap";

      const applyAll = this.visibilityToolbarToolsMakeButton(
        manager,
        "Apply all trees",
        async () => {
          this.visibilityToolbarToolsSetStatus(
            manager,
            "Applying " + set.name + " to all open trees..."
          );

          if (typeof manager.applyStoredVisibilitySetToAllTrees !== "function") {
            this.visibilityToolbarToolsSetStatus(
              manager,
              "applyStoredVisibilitySetToAllTrees is not available."
            );
            return;
          }

          const result = await manager.applyStoredVisibilitySetToAllTrees(
            set.name,
            {
              reason: "manual visibility tools dialog"
            }
          );

          this.visibilityToolbarToolsSetStatus(
            manager,
            JSON.stringify(result, null, 2)
          );
        }
      );

      row.appendChild(name);
      row.appendChild(applyAll);
      setsBox.appendChild(row);
    }
  }

  renderVisibilityTreeRows(manager = this.manager, treesBox, sets = []) {
    const trees =
      typeof manager.describeFileTreeViews === "function"
        ? manager.describeFileTreeViews()
        : [];
    const views =
      typeof manager.getFileTreeViews === "function"
        ? manager.getFileTreeViews()
        : [];

    if (!trees.length) {
      const empty = document.createElement("div");
      empty.textContent = "No open trees found.";
      empty.style.opacity = "0.72";
      treesBox.appendChild(empty);
      return;
    }

    for (const tree of trees) {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr auto";
      row.style.gap = "8px";
      row.style.alignItems = "center";
      row.style.padding = "8px 4px";
      row.style.borderBottom = "1px solid rgba(255,255,255,0.06)";

      const info = document.createElement("div");
      info.textContent =
        tree.displayName +
        " - " +
        tree.rootId +
        " - " +
        tree.widgetCount +
        " widgets";
      info.style.overflow = "hidden";
      info.style.textOverflow = "ellipsis";
      info.style.whiteSpace = "nowrap";

      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.gap = "6px";
      controls.style.alignItems = "center";

      const select = this.makeVisibilitySetSelect(sets);

      const apply = this.visibilityToolbarToolsMakeButton(
        manager,
        "Apply to tree",
        async () => {
          const view = views[tree.index];

          if (!view) {
            this.visibilityToolbarToolsSetStatus(
              manager,
              "Could not resolve tree: " + tree.displayName
            );
            return;
          }

          const setName = select.value;

          if (!setName) {
            this.visibilityToolbarToolsSetStatus(
              manager,
              "Choose a visibility set first."
            );
            return;
          }

          this.visibilityToolbarToolsSetStatus(
            manager,
            "Applying " + setName + " to " + tree.displayName + "..."
          );

          const result = await manager.applyStoredVisibilitySetToTree(
            setName,
            view,
            {
              reason: "manual visibility tools dialog"
            }
          );

          this.visibilityToolbarToolsSetStatus(
            manager,
            JSON.stringify(result, null, 2)
          );
        }
      );

      controls.appendChild(select);
      controls.appendChild(apply);

      row.appendChild(info);
      row.appendChild(controls);
      treesBox.appendChild(row);
    }
  }

  makeVisibilitySetSelect(sets = []) {
    const select = document.createElement("select");
    select.style.maxWidth = "210px";
    select.style.background = "rgba(8,12,24,0.92)";
    select.style.color = "#eef3ff";
    select.style.border = "1px solid rgba(140,170,255,0.45)";
    select.style.borderRadius = "7px";
    select.style.padding = "4px 6px";
    select.style.fontSize = "12px";

    for (const set of sets) {
      const option = document.createElement("option");
      option.value = set.name || "";
      option.textContent = set.name || "(unnamed)";
      select.appendChild(option);
    }

    return select;
  }

  visibilityToolbarToolsMakeButton(manager = this.manager, text, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.style.border = "1px solid rgba(140,170,255,0.45)";
    button.style.borderRadius = "8px";
    button.style.background = "rgba(60,80,130,0.65)";
    button.style.color = "#eef3ff";
    button.style.padding = "5px 9px";
    button.style.fontSize = "12px";
    button.style.cursor = "pointer";
    button.style.whiteSpace = "nowrap";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        const result = onClick(event);

        if (result && typeof result.catch === "function") {
          result.catch((error) => {
            this.visibilityToolbarToolsSetStatus(
              manager,
              error && error.message ? error.message : String(error)
            );
          });
        }
      } catch (error) {
        this.visibilityToolbarToolsSetStatus(
          manager,
          error && error.message ? error.message : String(error)
        );
      }
    });

    return button;
  }

  visibilityToolbarToolsSetStatus(manager = this.manager, message) {
    const dialog = manager.visibilitySetToolbarToolsDialog;

    if (!dialog || !dialog.status) {
      return;
    }

    dialog.status.textContent = String(message || "");
  }

  async visibilityToolbarToolsRefresh(manager = this.manager) {
    if (!manager.visibilitySetToolbarToolsDialog) {
      return null;
    }

    manager.visibilitySetToolbarToolsDialog.renderError = null;
    manager.visibilitySetToolbarToolsDialog.renderPromise =
      this.renderVisibilitySetToolbarTools(manager).catch((error) => {
        manager.visibilitySetToolbarToolsDialog.renderError = error;
        this.visibilityToolbarToolsSetStatus(
          manager,
          error && error.message ? error.message : String(error)
        );
        return null;
      });

    return manager.visibilitySetToolbarToolsDialog.renderPromise;
  }


  _workspaceTreesManagerDialogClass() {
      if (typeof UITools !== "undefined") return UITools;
      if (window.UITools) return window.UITools;
      return null;
    }
}