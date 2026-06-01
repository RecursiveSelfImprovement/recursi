class ProjectFilesPromptSizeEstimator {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  updatePromptSizeEstimate(manager = this.manager) {
      if (!manager || !manager.promptSizeIndicator) {
        return {
          ok: false,
          reason: "missing manager.promptSizeIndicator"
        };
      }
      const trees = typeof manager.getFileTreeViews === "function" ? manager.getFileTreeViews() : [];
      if (trees.length === 0) {
        return {
          ok: false,
          reason: "no active tree views"
        };
      }

      const totalChars = this.estimatePromptCharacters(manager);
      const estimatedTokens = totalChars / 4;

      let displayValue;
      if (estimatedTokens > 1000) {
        displayValue = `${(estimatedTokens / 1000).toFixed(1)}k`;
      } else {
        displayValue = Math.round(estimatedTokens).toString();
      }

      manager.promptSizeIndicator.innerHTML = `~${displayValue} tokens`;

      return {
        ok: true,
        totalChars,
        estimatedTokens,
        displayValue
      };
    }

  estimatePromptCharacters(manager = this.manager) {
      const protocolCharsEstimate = 8000;
      const charsPerLineEstimate = 45;
      let totalChars = 0;

      const treeViews = manager && typeof manager.getFileTreeViews === "function" ? manager.getFileTreeViews() : [];

      for (const treeView of treeViews) {
        if (!treeView?.nodesMap) continue;
        for (const node of treeView.nodesMap.values()) {
          if (!node || node.type !== "file" || !node.visibilityWidget) {
            continue;
          }

          const state = node.visibilityWidget.state || {};
          const level = this.calculateLevelFromState(state);

          if (level === 0) {
            continue;
          }

          const metadata = node.metadata || {};
          const codeLines = Number(metadata.codeSize || 0) || 0;
          const docLines = Number(metadata.docSize || 0) || 0;

          if (level === 2) {
            totalChars += codeLines * charsPerLineEstimate * 0.2;
            continue;
          }

          if (level === 5) {
            totalChars += codeLines * charsPerLineEstimate;
            continue;
          }

          totalChars += codeLines * charsPerLineEstimate;

          if (docLines > 0 && level > 5) {
            const docPortion = (level - 5) * 0.25;
            totalChars += docLines * charsPerLineEstimate * Math.min(1, docPortion);
          }
        }
      }

      totalChars += protocolCharsEstimate;
      return totalChars;
    }

  calculateLevelFromState(state) {
    const input = state && typeof state === "object" ? state : {};
    const docsLevel = Number(input.docsLevel || 0);

    if (!input.code && !input.signatures && docsLevel === 0) {
      return 0;
    }

    if (input.code && docsLevel > 0) {
      return 6 + (docsLevel - 1);
    }

    if (input.code) {
      return 5;
    }

    if (input.signatures || input.sig) {
      return 2;
    }

    return 0;
  }

  calculateWidgetMaxSizes(manager = this.manager) {
      let maxCodeLength = 42;
      let maxDocsLength = 24;

      const treeViews = manager && typeof manager.getFileTreeViews === "function" ? manager.getFileTreeViews() : [];

      for (const treeView of treeViews) {
        if (!treeView?.nodesMap) continue;
        const nodes = Array.from(treeView.nodesMap.values());

        for (const node of nodes) {
          if (!node || node.type !== "file") {
            continue;
          }

          const metadata = node.metadata || {};
          const codeSize = Number(metadata.codeSize ?? metadata.code ?? metadata.lines ?? 0) || 0;
          const docSize = Number(metadata.docSize ?? metadata.docs ?? 0) || (node.hasDocs || metadata.hasDocs ? 1 : 0);

          if (codeSize > 0) {
            maxCodeLength = Math.max(
              maxCodeLength,
              this.scaleVisibilityValue(codeSize, 14, 1.34, 92)
            );
          }

          if (docSize > 0) {
            maxDocsLength = Math.max(
              maxDocsLength,
              this.scaleVisibilityValue(docSize, 12, 1.28, 56)
            );
          }
        }
      }

      const maxSizes = {
        maxCodeLength: Math.max(42, Math.min(92, maxCodeLength)),
        maxDocsLength: Math.max(24, Math.min(56, maxDocsLength))
      };

      maxSizes.code = maxSizes.maxCodeLength;
      maxSizes.docs = maxSizes.maxDocsLength;
      maxSizes.maxCode = maxSizes.maxCodeLength;
      maxSizes.maxDocs = maxSizes.maxDocsLength;
      maxSizes.codeSize = maxSizes.maxCodeLength;
      maxSizes.docSize = maxSizes.maxDocsLength;

      if (manager) {
        manager.widgetMaxSizes = maxSizes;
      }

      for (const treeView of treeViews) {
        treeView.widgetMaxSizes = maxSizes;
      }

      return maxSizes;
    }

  scaleVisibilityValue(value, min = 12, power = 1.25, cap = 180) {
    const n = Number(value) || 0;

    if (n <= 0) {
      return 0;
    }

    const scaled = min + Math.sqrt(n) * power;
    return Math.max(min, Math.min(cap, scaled));
  }

}