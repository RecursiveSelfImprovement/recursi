class ProjectFloatingTreeLauncher {
  
  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  ensureFloatingFileTreeState(manager = this.manager) {
    if (!manager?.app) {
      return {
        launcherDialog: null,
        launcherContent: null,
        rootsList: null,
        status: null,
        trees: new Map(),
        editors: new Map()
      };
    }

    if (!manager.app.workspaceFileStores) {
      manager.app.workspaceFileStores = new Map();
    }

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

    if (!manager.floatingFileTreeState.trees) {
      manager.floatingFileTreeState.trees = new Map();
    }

    if (!manager.floatingFileTreeState.editors) {
      manager.floatingFileTreeState.editors = new Map();
    }

    return manager.floatingFileTreeState;
  }

  floatingTreeSafeRootName(manager, name) {
    const base =
      String(name || "ExternalFolder")
        .trim()
        .replace(/[^\w.\- ]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/^-+|-+$/g, "") || "ExternalFolder";

    const stores = manager?.app?.workspaceFileStores || new Map();

    if (!stores.has("/" + base)) return base;

    let i = 2;
    while (stores.has("/" + base + "-" + i)) i++;

    return base + "-" + i;
  }

  makeFloatingTreeButton(label, onClick, extraStyle = {}) {
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
          whiteSpace: "nowrap",
          ...extraStyle
        },
        onclick: onClick
      },
      label
    );
  }

  openFloatingExternalFileTreeLauncher(manager = this.manager) {
    const state = this.ensureFloatingFileTreeState(manager);

    if (state.launcherContent?.isConnected) {
      try {
        state.launcherDialog?.bringToFront?.();
      } catch (error) {}

      this.renderFloatingFileTreeLauncher(manager);
      return state.launcherDialog;
    }

    this.renderFloatingFileTreeLauncher(manager);
    return state.launcherDialog;
  }

  renderFloatingFileTreeLauncher(manager = this.manager) {
      const state = this.ensureFloatingFileTreeState(manager);

      if (!state.launcherDialog || !state.launcherContent?.isConnected) {
        this.installOpenDirectoriesStyles();

        const addDirBtn = makeElement(
          "button",
          {
            className: "od-add-btn",
            title: "Open a directory",
            onclick: async (e) => {
              e.stopPropagation();
              if (typeof this._handleAddDirectoryClick === 'function') {
                this._handleAddDirectoryClick(manager, addDirBtn);
              } else {
                addDirBtn.disabled = true;
                addDirBtn.textContent = "…";
                try {
                  await this.pickExternalFolderAndOpenFileTreeDialog(manager);
                } finally {
                  addDirBtn.disabled = false;
                  addDirBtn.textContent = "＋";
                  this.renderFloatingFileTreeLauncher(manager);
                }
              }
            }
          },
          "＋"
        );

        addDirBtn.addEventListener('mouseover', (e) => {
          if (window.GlowingTooltip) {
            GlowingTooltip.show(e.currentTarget, "Open and mount a new project directory from your computer's local storage.", { color: [0, 191, 165] });
          }
        });
        addDirBtn.addEventListener('mouseout', () => {
          if (window.GlowingTooltip) GlowingTooltip.hide();
        });

        state.status = makeElement(
          "div",
          { className: "od-status" },
          "No directories open yet."
        );

        const header = makeElement("div", { className: "od-header" }, addDirBtn);
        
        state.rootsList = makeElement("div", { className: "od-list", style: { maxHeight: '50vh', overflowY: 'auto' } });

        state.launcherContent = makeElement(
          "div",
          { className: "od-root" },
          header,
          state.status,
          state.rootsList
        );

        state.launcherDialog = UITools.makeDialog({
          title: "📂 Open Directories",
          contentElement: state.launcherContent,
          size: [315, "auto"],
          position: [20, Math.max(20, window.innerHeight - 440)], 
          noPadding: false,
          allowMaximize: false,
          stateId: 'vibes-directories-launcher' 
        });
      }

      const stores = manager?.app?.workspaceFileStores;

      if (!state.rootsList) {
        this._repositionLauncher(state);
        return state;
      }

      state.rootsList.innerHTML = "";

      if (!stores?.size) {
        state.status.textContent = "No directories open yet.";
        state.status.style.display = "block";
        this._repositionLauncher(state);
        return state;
      }

      state.status.style.display = "none";

      for (const [rootId, store] of stores.entries()) {
        state.rootsList.appendChild(
          this.buildOpenDirectoryRow(manager, state, rootId, store)
        );
      }

      this._repositionLauncher(state);
      return state;
    }

  buildOpenDirectoryRow(manager, state, rootId, store) {
      const rootName = rootId.replace(/^\//, "");
      const fileCount =
        typeof store.keys === "function"
          ? Array.from(store.keys()).filter((p) => p.startsWith(rootId + "/"))
              .length
          : 0;

      const findTreeHost = () => {
        const ts = manager?.floatingFileTreeState;
        if (!ts?.trees) return null;
        const rec = ts.trees.get(rootId);
        return rec?.host || null;
      };

      const isTreeOpen = () => {
        const host = findTreeHost();
        if (!host) return false;

        const el =
          host.element ||
          host.dialog?.element ||
          host._floatEl ||
          host.contentElement;

        return !!(el && el.isConnected);
      };

      const flashRow = (row) => {
        row.classList.remove("od-row--flash");
        void row.offsetWidth;
        row.classList.add("od-row--flash");
        setTimeout(() => row.classList.remove("od-row--flash"), 900);
      };

      const bringTreeToFront = (row) => {
        const host = findTreeHost();
        if (!host) return false;

        if (typeof host.bringToFront === "function") {
          host.bringToFront();
        } else if (typeof host.setZOnTop === "function") {
          host.setZOnTop();
        }

        const el = host.element || host.dialog?.element;

        if (el) {
          el.style.transition = "box-shadow 0.15s";
          el.style.boxShadow =
            "0 0 0 2px rgba(100,210,255,0.95), 0 0 28px rgba(80,180,255,0.5)";

          setTimeout(() => {
            if (el) el.style.boxShadow = "";
          }, 1600);
        }

        flashRow(row);
        return true;
      };

      const row = makeElement("div", {
        className: "od-row" + (isTreeOpen() ? " od-row--open" : ""),
        title: rootId
      });

      const icon = makeElement(
        "span",
        { className: "od-row-icon" },
        isTreeOpen() ? "📂" : "🗂️"
      );

      const counts = manager.getVisibilityWidgetsForStore ? manager.getVisibilityWidgetsForStore(rootId) : { active: 0, total: 0 };
      
      const ratioStr = counts.total > 0 ? ` · ${counts.active}/${counts.total}` : '';

      const info = makeElement(
        "div",
        { className: "od-row-info" },
        makeElement("div", { className: "od-row-name" }, rootName),
        makeElement(
          "div",
          { className: "od-row-meta" },
          fileCount + " files" + ratioStr
        )
      );

      const runBtnContainer = makeElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
          marginRight: '5px',
          flexShrink: '0'
        }
      });

      const runWindowBtn = makeElement('button', {
          className: 'od-run-window-btn',
          title: 'Run in Window',
          style: {
             background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '0', margin: '0', lineContent: '1'
          },
          onclick: (e) => {
             e.stopPropagation();
             const isRunning = manager.app.activeRunnerProject === store._projectName;
             if (isRunning) {
                 if (manager.app.activeRunnerInjector) manager.app.activeRunnerInjector.destroy();
                 manager.app.activeRunnerProject = null;
                 if (manager.app.emit) manager.app.emit('runner:stopped', store._projectName);
             } else {
                 if (manager.app && manager.app.actionHandler) {
                     manager.app.actionHandler.handleRunAppFromDisk({ id: rootId + '/files.json', name: store._projectName });
                 }
             }
          },
          onmouseover: (e) => {
             const isRunning = manager.app.activeRunnerProject === store._projectName;
             const text = isRunning
               ? 'Stop execution of this active preview application.'
               : 'Execute and preview this application project inside a dedicated overlay window.';
             if (window.GlowingTooltip) {
               GlowingTooltip.show(e.currentTarget, text, { color: isRunning ? [255, 50, 50] : [50, 255, 100] });
             }
          },
          onmouseout: () => {
             if (window.GlowingTooltip) GlowingTooltip.hide();
          }
      }, '📺');

      const runTabBtn = makeElement('button', {
          className: 'od-run-tab-btn',
          title: 'Run in separate Tab',
          style: {
             background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '0', margin: '0', lineContent: '1'
          },
          onclick: (e) => {
             e.stopPropagation();
             window.open('/' + store._projectName + '/', '_blank');
          },
          onmouseover: (e) => {
             if (window.GlowingTooltip) {
               GlowingTooltip.show(e.currentTarget, 'Launch and test this application project inside a separate web browser tab.', { color: [100, 150, 255] });
             }
          },
          onmouseout: () => {
             if (window.GlowingTooltip) GlowingTooltip.hide();
          }
      }, '🌐');

      runBtnContainer.append(runWindowBtn, runTabBtn);

      const toggleBtn = makeElement(
        "button",
        {
          className: isTreeOpen() ? "od-close-btn" : "od-open-btn",
          title: isTreeOpen() ? "Close this tree" : "Open tree",
          onclick: async (e) => {
            e.stopPropagation();

            if (isTreeOpen()) {
              const host = findTreeHost();

              if (host) {
                if (typeof host.close === "function") {
                  host.close();
                } else if (typeof host.dialog?.close === "function") {
                  host.dialog.close();
                }
              }

              manager?.floatingFileTreeState?.trees?.delete(rootId);
              setTimeout(() => this.renderFloatingFileTreeLauncher(manager), 350);
            } else {
              toggleBtn.disabled = true;
              toggleBtn.textContent = "…";

              await this.openWorkspaceTreeBestEffort(manager, rootId, store);

              setTimeout(() => {
                this.renderFloatingFileTreeLauncher(manager);
                setTimeout(() => state.launcherDialog?.setZOnTop?.(), 200);
              }, 300);
            }

            flashRow(row);
          }
        },
        isTreeOpen() ? "Close" : "Open"
      );

      toggleBtn.addEventListener('mouseover', (e) => {
        if (window.GlowingTooltip) {
          const open = isTreeOpen();
          GlowingTooltip.show(e.currentTarget, open ? "Unmount and close this directory tree view from your active workspace." : "Mount and open this folder tree view in a new floating workspace window.", {
            color: open ? [255, 100, 100] : [100, 160, 255],
          });
        }
      });
      toggleBtn.addEventListener('mouseout', () => {
        if (window.GlowingTooltip) GlowingTooltip.hide();
      });

      const syncRunBtn = () => {
         const isRunning = manager.app.activeRunnerProject === store._projectName;
         runWindowBtn.textContent = isRunning ? '⏹️' : '📺';
      };
      if (manager.app && manager.app.on) {
          manager.app.on('runner:started', syncRunBtn);
          manager.app.on('runner:stopped', syncRunBtn);
      }
      syncRunBtn();

      row.addEventListener("click", (e) => {
        if (e.target === toggleBtn || e.target === runWindowBtn || e.target === runTabBtn) return;

        if (isTreeOpen()) {
          bringTreeToFront(row);
        } else {
          toggleBtn.click();
        }
      });

      row.append(icon, info, runBtnContainer, toggleBtn);
      return row;
    }

  async pickExternalFolderAndOpenFileTreeDialog(manager = this.manager) {
    const state = this.ensureFloatingFileTreeState(manager);

    if (!window.showDirectoryPicker) {
      state.status.textContent =
        "Directory picker not available in this browser.";
      return {
        ok: false,
        reason: "Directory picker not available in this browser."
      };
    }

    if (typeof LocalDirectoryStore === "undefined") {
      state.status.textContent = "LocalDirectoryStore is not loaded.";
      return {
        ok: false,
        reason: "LocalDirectoryStore is not loaded."
      };
    }

    try {
      state.status.textContent = "Waiting for folder picker…";

      const dirHandle = await window.showDirectoryPicker({
        mode: "readwrite",
        id: "vibes-floating-file-tree-root"
      });

      const rootName = this.floatingTreeSafeRootName(manager, dirHandle.name);
      const rootId = "/" + rootName;

      state.status.textContent = `Scanning ${rootName}…`;

      const store = await LocalDirectoryStore.open(dirHandle, rootName);

      if (!manager.app.workspaceFileStores) {
        manager.app.workspaceFileStores = new Map();
      }

      manager.app.workspaceFileStores.set(rootId, store);

      this.renderFloatingFileTreeLauncher(manager);

      if (typeof manager.openFloatingTreeForStore === "function") {
        manager.openFloatingTreeForStore(rootId, store);
      }

      state.status.textContent = `${rootId}: ${store.size} entries cached.`;

      return {
        ok: true,
        rootId,
        entries: store.size || 0
      };
    } catch (error) {
      state.status.textContent =
        error?.name === "AbortError"
          ? "Folder picker cancelled."
          : "Open failed: " + (error?.message || String(error));

      console.error("[Floating FileTreeView] open failed:", error);

      return {
        ok: false,
        cancelled: error?.name === "AbortError",
        reason: error?.message || String(error)
      };
    }
  }

  openWorkspaceTreeBestEffort(manager, rootId, store) {
    if (typeof manager?._openFloatingTreeForWorkspaceRoot === "function") {
      return manager._openFloatingTreeForWorkspaceRoot(rootId, store);
    }

    if (typeof manager?.openFloatingTreeForStore === "function") {
      return manager.openFloatingTreeForStore(rootId, store);
    }

    if (typeof manager?._openFloatingFileTreeDialogForStore === "function") {
      return manager._openFloatingFileTreeDialogForStore(rootId, store);
    }

    if (typeof manager?._showFloatingExternalTrees === "function") {
      return manager._showFloatingExternalTrees();
    }

    const content = makeElement(
      "div",
      {
        style: {
          color: "#dce6ff",
          fontFamily: "system-ui, sans-serif",
          minWidth: "360px"
        }
      },
      makeElement(
        "div",
        {},
        `Workspace tree opener is not wired yet for ${rootId}.`
      ),
      makeElement(
        "div",
        {
          style: { marginTop: "8px", color: "#8aa0cc" }
        },
        "The workspace is still connected and writable; runner buttons will work."
      )
    );

    UITools.makeDialog({
      title: "Workspace Tree",
      contentElement: content,
      size: [420, 200],
      position: [120, 120]
    });

    return null;
  }

  installOpenDirectoriesStyles() {
    if (document.getElementById("od-styles")) return;

    const style = document.createElement("style");
    style.id = "od-styles";
    style.textContent = `
      .od-root {
        padding: 4px 0 8px;
        min-width: 240px;
        user-select: none;
      }

      .od-header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 2px 10px 6px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        margin-bottom: 4px;
      }

      .od-add-btn {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        border: 1px solid rgba(100,160,255,0.4);
        background: rgba(50,90,200,0.22);
        color: #aac8ff;
        font-size: 17px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, border-color 0.15s, transform 0.1s;
        padding: 0;
      }

      .od-add-btn:hover {
        background: rgba(60,120,255,0.45);
        border-color: rgba(140,190,255,0.7);
        color: #fff;
        transform: scale(1.08);
      }

      .od-add-btn:disabled { opacity: 0.4; }

      .od-status {
        font-size: 11px;
        color: rgba(150,170,210,0.55);
        padding: 6px 12px;
        font-style: italic;
      }

      .od-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 0 6px;
      }

      .od-row {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px 8px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.12s, border-color 0.12s;
        border: 1px solid transparent;
      }

      .od-row:hover {
        background: rgba(100,150,255,0.1);
        border-color: rgba(100,160,255,0.18);
      }

      .od-row--open {
        background: rgba(40,100,200,0.14);
        border-color: rgba(80,150,255,0.22);
      }

      .od-row--open:hover {
        background: rgba(60,120,240,0.22);
        border-color: rgba(100,170,255,0.4);
      }

      @keyframes od-flash {
        0%   { background: rgba(100,210,255,0.35); border-color: rgba(100,210,255,0.8); }
        60%  { background: rgba(60,150,255,0.22); border-color: rgba(100,180,255,0.4); }
        100% { }
      }

      .od-row--flash {
        animation: od-flash 0.85s ease-out forwards;
      }

      .od-row-icon {
        font-size: 15px;
        flex-shrink: 0;
        opacity: 0.9;
      }

      .od-row-info {
        flex: 1;
        min-width: 0;
      }

      .od-row-name {
        font-size: 12px;
        font-weight: 600;
        color: #dce9ff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .od-row-meta {
        font-size: 10px;
        color: rgba(150,175,215,0.5);
        margin-top: 1px;
        font-family: ui-monospace, Menlo, monospace;
      }

      .od-row--open .od-row-meta {
        color: rgba(100,200,255,0.65);
      }

      .od-open-btn, .od-close-btn {
        flex-shrink: 0;
        padding: 3px 9px;
        border-radius: 5px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.12s, color 0.12s;
      }

      .od-open-btn {
        border: 1px solid rgba(100,160,255,0.3);
        background: rgba(50,90,180,0.25);
        color: #aac8ff;
      }

      .od-open-btn:hover {
        background: rgba(70,120,255,0.5);
        color: #fff;
        border-color: rgba(130,180,255,0.6);
      }

      .od-close-btn {
        border: 1px solid rgba(255,100,100,0.3);
        background: rgba(180,50,50,0.18);
        color: rgba(255,160,160,0.85);
      }

      .od-close-btn:hover {
        background: rgba(220,60,60,0.38);
        color: #fff;
        border-color: rgba(255,120,120,0.6);
      }
    `;

    document.head.appendChild(style);
  }

  async _handleAddDirectoryClick(manager, addDirBtn) {
    const webHandle = manager?.app?.browserWebRootHandle;
    
    if (!webHandle) {
      addDirBtn.disabled = true;
      addDirBtn.textContent = "…";
      try {
        await this.pickExternalFolderAndOpenFileTreeDialog(manager);
      } finally {
        addDirBtn.disabled = false;
        addDirBtn.textContent = "＋";
        this.renderFloatingFileTreeLauncher(manager);
      }
      return;
    }

    // We have a web root handle, list subdirectories
    const folders = await manager._listBrowserWebRootSubfolders(webHandle);
    const openFolders = Array.from(manager.app.workspaceFileStores?.keys() || []).map(k => k.replace(/^\//, ''));

    const content = document.createElement('div');
    content.style.cssText = 'display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;padding:10px;background:#141824;color:#eee;font-family:system-ui,sans-serif;';

    const osBtn = document.createElement('button');
    osBtn.textContent = '📁 Pick New OS Folder...';
    osBtn.style.cssText = 'padding:10px;background:#2a3f5f;color:white;border:1px solid #4a6fa5;border-radius:6px;cursor:pointer;font-weight:bold;';
    osBtn.onmouseover = () => osBtn.style.background = '#36507a';
    osBtn.onmouseout = () => osBtn.style.background = '#2a3f5f';
    
    const hr = document.createElement('hr');
    hr.style.cssText = 'border:none;border-top:1px solid rgba(255,255,255,0.1);width:100%;margin:4px 0;';

    const dialogRef = { dialog: null };
    
    osBtn.onclick = async () => {
      if (dialogRef.dialog) dialogRef.dialog.close();
      addDirBtn.disabled = true;
      addDirBtn.textContent = "…";
      try {
        await this.pickExternalFolderAndOpenFileTreeDialog(manager);
      } finally {
        addDirBtn.disabled = false;
        addDirBtn.textContent = "＋";
        this.renderFloatingFileTreeLauncher(manager);
      }
    };

    content.appendChild(osBtn);
    content.appendChild(hr);

    const subTitle = document.createElement('div');
    subTitle.textContent = `Subfolders of /${webHandle.name}`;
    subTitle.style.cssText = 'font-size:11px;color:#88a;text-transform:uppercase;letter-spacing:0.5px;margin:4px 0;';
    content.appendChild(subTitle);

    for (const folder of folders) {
      const isOpened = openFolders.includes(folder.name);
      const btn = document.createElement('button');
      btn.textContent = `📄 ${folder.name}` + (isOpened ? ' (Opened)' : '');
      btn.disabled = isOpened;
      btn.style.cssText = `padding:8px;background:#1e2230;color:${isOpened ? '#667' : '#cce'};border:1px solid #2a3040;border-radius:6px;cursor:${isOpened ? 'default' : 'pointer'};text-align:left;display:flex;justify-content:space-between;`;
      
      if (!isOpened) {
        btn.onmouseover = () => btn.style.background = '#2a3044';
        btn.onmouseout = () => btn.style.background = '#1e2230';
        btn.onclick = async () => {
          if (dialogRef.dialog) dialogRef.dialog.close();
          addDirBtn.disabled = true;
          addDirBtn.textContent = "…";
          try {
            await manager._openBrowserWebRootSubtree(webHandle, folder.name, { manager });
          } catch (e) {
            console.error("Failed to open subtree", e);
          } finally {
            addDirBtn.disabled = false;
            addDirBtn.textContent = "＋";
            this.renderFloatingFileTreeLauncher(manager);
          }
        };
      }
      content.appendChild(btn);
    }

    dialogRef.dialog = UITools.makeDialog({
      title: 'Add Workspace Directory',
      contentElement: content,
      width: '320px'
    });
  }


  _repositionLauncher(state) {
      if (!state || !state.launcherDialog || !state.launcherDialog.element) return;
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = state.launcherDialog.element;
          if (!el || !el.isConnected) return;
          
          const h = el.offsetHeight;
          const targetTop = Math.max(45, window.innerHeight - h - 20);
          el.style.top = `${targetTop}px`;
        });
      });
    }
}