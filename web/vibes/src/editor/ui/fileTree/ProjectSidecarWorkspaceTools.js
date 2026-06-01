class ProjectSidecarWorkspaceTools {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  migrateDocumentationDirectoryInStore(manager = this.manager, rootId, store) {
    const result = {
      rootId,
      moved: 0,
      skipped: 0,
      errors: [],
      moves: []
    };

    if (!store?.keys || !store?.get || !store?.set) {
      result.errors.push("store is not Map-like / writable");
      return result;
    }

    const paths = Array.from(store.keys()).filter((path) => {
      if (typeof SidecarDocumentation !== "undefined") {
        return SidecarDocumentation.isLegacyDocumentationPath(path);
      }

      return String(path || "").includes("/documentation/");
    });

    for (const docPath of paths) {
      try {
        const content = store.get(docPath);

        if (typeof content !== "string") {
          result.skipped++;
          continue;
        }

        const sidecarPath =
          typeof SidecarDocumentation !== "undefined"
            ? SidecarDocumentation.legacyDocsToSidecarPath(docPath)
            : null;

        if (!sidecarPath) {
          result.skipped++;
          continue;
        }

        if (store.get(sidecarPath) === content) {
          result.skipped++;
          continue;
        }

        store.set(sidecarPath, content);
        result.moved++;
        result.moves.push({ from: docPath, to: sidecarPath });
      } catch (error) {
        result.errors.push(`${docPath}: ${error.message || error}`);
      }
    }

    return result;
  }

  migrateDocumentationDirectoriesInWorkspaceStores(manager = this.manager) {
    const stores = manager?.app?.workspaceFileStores;
    const report = {
      roots: 0,
      moved: 0,
      skipped: 0,
      errors: [],
      moves: []
    };

    if (!stores?.size) return report;

    for (const [rootId, store] of stores.entries()) {
      const one = this.migrateDocumentationDirectoryInStore(
        manager,
        rootId,
        store
      );

      report.roots++;
      report.moved += one.moved;
      report.skipped += one.skipped;
      report.errors.push(...one.errors);
      report.moves.push(...one.moves);
    }

    return report;
  }

  installFloatingDocsMigrationButton(manager = this.manager) {
    const state = manager?._ensureFloatingFileTreeState?.();

    if (!state?.launcherContent) return false;

    if (
      state.launcherContent.querySelector("#vibes-migrate-sidecar-docs-button")
    ) {
      return false;
    }

    const toolbar = state.launcherContent.querySelector("div");

    if (!toolbar) return false;

    const button = manager._makeFloatingTreeButton?.(
      "📝 Migrate Docs",
      () => {
        const report =
          this.migrateDocumentationDirectoriesInWorkspaceStores(manager);

        if (state.status) {
          state.status.textContent = `docs migrated: ${report.moved}, skipped: ${report.skipped}`;
        }

        console.log("[Vibes] Sidecar docs migration report:", report);
        manager._renderFloatingFileTreeLauncher?.();
      },
      {
        background: "rgba(90,65,130,0.85)"
      }
    );

    if (!button) return false;

    button.id = "vibes-migrate-sidecar-docs-button";
    toolbar.appendChild(button);
    return true;
  }

  async runSidecarMetadataScannerCommand(manager = this.manager) {
    const state = manager?._ensureFloatingFileTreeState?.();

    if (state?.status) {
      state.status.textContent = "Scanning sidecars + AST metadata…";
    }

    if (typeof SidecarMetadataScanner === "undefined") {
      throw new Error(
        "SidecarMetadataScanner is not loaded. Reload Vibes after approving the patch."
      );
    }

    const scanner = new SidecarMetadataScanner({
      app: manager.app,
      maxRuntimeEvalChars: 180000
    });

    const report = await scanner.scanWorkspaceStores({
      writeReports: true,
      runtimeMetadata: true
    });

    manager.lastSidecarMetadataScan = report;
    manager.app.lastSidecarMetadataScan = report;

    console.log("[Vibes] Sidecar metadata scan report:", report);

    if (state?.status) {
      state.status.textContent =
        `metadata scan: ${report.totals.sourceFiles} files, ` +
        `${report.totals.weirdFiles} weird, ` +
        `${report.totals.dependencyEdges} deps`;
    }

    if (typeof DialogBox !== "undefined" && typeof makeElement !== "undefined") {
      this.showSidecarMetadataScanReport(manager, report);
    }

    return report;
  }

  installSidecarMetadataScannerButton(manager = this.manager) {
    const state = manager?._ensureFloatingFileTreeState?.();

    if (!state?.launcherContent) return false;

    if (
      state.launcherContent.querySelector("#vibes-sidecar-metadata-scan-button")
    ) {
      return false;
    }

    const toolbar = state.launcherContent.querySelector("div");

    if (!toolbar || !manager._makeFloatingTreeButton) return false;

    const button = manager._makeFloatingTreeButton(
      "🧬 Scan Metadata",
      async () => {
        try {
          await this.runSidecarMetadataScannerCommand(manager);
        } catch (error) {
          console.error("[Vibes] Sidecar metadata scan failed:", error);

          if (state.status) {
            state.status.textContent =
              "metadata scan failed: " + (error.message || error);
          }
        }
      },
      {
        background: "rgba(44,85,145,0.92)"
      }
    );

    button.id = "vibes-sidecar-metadata-scan-button";
    toolbar.appendChild(button);
    return true;
  }

  showSidecarMetadataScanReport(manager = this.manager, report) {
      const weird = report.weirdFiles || [];
      const summary = makeElement("div", {
        style: {
          fontFamily: "system-ui, sans-serif",
          color: "#dce6ff",
          fontSize: "12px",
          lineHeight: "1.45",
          minWidth: "620px",
          maxWidth: "820px"
        }
      });

      const header = makeElement(
        "div",
        {
          style: {
            fontSize: "15px",
            fontWeight: "700",
            color: "#9fc5ff",
            marginBottom: "8px"
          }
        },
        "🧬 Sidecar Metadata Scan"
      );

      const stats = makeElement(
        "pre",
        {
          style: {
            whiteSpace: "pre-wrap",
            margin: "0 0 10px",
            padding: "10px",
            borderRadius: "8px",
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(140,170,255,0.22)"
          }
        },
        this.formatSidecarMetadataStats(report)
      );

      const weirdBox = this.buildSidecarMetadataWeirdBox(weird);

      summary.appendChild(header);
      summary.appendChild(stats);
      summary.appendChild(weirdBox);

      // OBSOLETE: DialogBox is an obsolete class. It is replaced by UITools.makeDialog.
      // Re-routed to the functional UITools.makeDialog API.
      UITools.makeDialog({
        title: "Sidecar Metadata Scan",
        contentElement: summary,
        size: [760, 560],
        position: [180, 120]
      });
    }

  formatSidecarMetadataStats(report) {
    const totals = report?.totals || {};

    return [
      `roots: ${totals.roots}`,
      `files: ${totals.files}`,
      `sourceFiles: ${totals.sourceFiles}`,
      `docsSidecars: ${totals.docsSidecars}`,
      `yamlSidecars: ${totals.yamlSidecars}`,
      `jsFiles: ${totals.jsFiles}`,
      `pureClassFiles: ${totals.pureClassFiles}`,
      `weirdFiles: ${totals.weirdFiles}`,
      `dependencyEdges: ${totals.dependencyEdges}`,
      `writtenReports: ${totals.writtenReports}`,
      `writeFailures: ${totals.writeFailures}`
    ].join("\n");
  }

  buildSidecarMetadataWeirdBox(weird) {
    const weirdBox = makeElement("div", {
      style: {
        maxHeight: "360px",
        overflow: "auto",
        padding: "8px",
        borderRadius: "8px",
        background: "rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.08)"
      }
    });

    if (weird.length) {
      weird.slice(0, 200).forEach((item) => {
        weirdBox.appendChild(
          makeElement(
            "div",
            {
              style: {
                padding: "6px 4px",
                borderBottom: "1px solid rgba(255,255,255,0.06)"
              }
            },
            makeElement(
              "div",
              {
                style: {
                  color: "#ffd37a",
                  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                  fontSize: "11px"
                }
              },
              item.path
            ),
            makeElement(
              "div",
              {
                style: {
                  color: "#ffaaa0",
                  fontSize: "11px"
                }
              },
              [...(item.warnings || []), ...(item.errors || [])].join(", ")
            )
          )
        );
      });

      if (weird.length > 200) {
        weirdBox.appendChild(
          makeElement(
            "div",
            {
              style: { color: "#8899bb", padding: "8px" }
            },
            `… ${weird.length - 200} more weird files. See console/report JSON.`
          )
        );
      }

      return weirdBox;
    }

    weirdBox.appendChild(
      makeElement(
        "div",
        {
          style: { color: "#7dffa8", padding: "8px" }
        },
        "No weird files found."
      )
    );

    return weirdBox;
  }

}