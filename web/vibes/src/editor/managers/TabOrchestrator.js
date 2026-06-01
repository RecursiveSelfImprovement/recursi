
class TabOrchestrator {
  
  constructor(app) {
    this.app = app;
    this.runnerTabId = null;
    this.runnerTabIframe = null;
    this.previewTabId = null;
    this.previewTabIframe = null;
  }

  removeTab(tabId) {
      if (this.app.tabManager) {
        this.app.tabManager.removeTab(tabId);
      }
      this.app.editorControllers.delete(tabId);

      // Replaced legacy syncAllFileStates() with modern parameterless syncFileStates()
      if (this.app.projectFilesManager) {
        this.app.projectFilesManager.syncFileStates();
      }
    }

  createRunnerTab(src = null) {
      console.warn('🚨 [TabOrchestrator] createRunnerTab is deprecated. Routing to Native In-Window Runner.');
      if (this.app.actionHandler) {
        this.app.actionHandler.handlePushToRunner();
      }
    }

  async createProjectBrowserTab() {
      if (this.app.tabManager.tabs.has('project-browser-tab')) {
        this.app.tabManager.setActiveTab('project-browser-tab');
        return;
      }

      this.app.uiManager?.setStatus('Loading Project Browser...');

      if (typeof NativeProjectBrowser === 'undefined') {
        try {
          await this.app._loadClassicScriptOnce('/vibes/src/tools/browser/NativeProjectBrowser.js');
        } catch (e) {
          console.warn('[TabOrchestrator] Failed to load NativeProjectBrowser.', e);
        }
      }

      if (typeof NativeProjectBrowser !== 'undefined') {
        try {
          const browser = new NativeProjectBrowser(this.app);
          await browser.init();
          
          const tabId = this.app.tabManager.addTabAtStart(
            '🚀 Project Browser',
            browser.getElement(),
            true, // closable
            'project-browser-tab'
          );
          
          this.app.tabManager.setActiveTab(tabId);
          this.app.uiManager?.setStatus('Project Browser loaded natively.', false, 2000);
        } catch(err) {
          console.error('[TabOrchestrator] Native browser failed.', err);
          this.app.uiManager?.setStatus('Native browser failed to load.', true);
        }
      } else {
        this.app.uiManager?.setStatus('NativeProjectBrowser class not found.', true);
      }
    }

  createUrlPreviewTab(url, projectName) {
    if (!url) {
      this.app.uiManager.setStatus(
        `No preview URL available for ${projectName}.`,
        true
      );
      return;
    }

    if (this.previewTabId && this.app.tabManager.tabs.has(this.previewTabId)) {
      if (this.previewTabIframe) {
        this.app.uiManager.setStatus(`Updating preview for ${projectName}...`);
        this.previewTabIframe.src = url;
        this.app.tabManager.setActiveTab(this.previewTabId);
      }
      return;
    }

    this.app.uiManager.setStatus(`Opening preview for ${projectName}...`);
    const iframe = makeElement('iframe', {
      src: url,
      style: { width: '100%', height: '100%', border: 'none' },
      sandbox:
        'allow-scripts allow-same-origin allow-forms allow-popups allow-modals',
    });

    this.previewTabIframe = iframe;
    this.previewTabId = this.app.tabManager.addTab(
      `🌎 ${projectName}`,
      iframe,
      true,
      `url-preview-tab-${projectName}`
    );
    this.app.tabManager.setActiveTab(this.previewTabId);
  }

  ensureBuildPromptTabExists() {
      if (
        !this.app.tabManager ||
        this.app.tabManager.tabs.has('build-prompt-tab')
      ) {
        return;
      }
      if (!this.app.buildPromptTab) {
        this.app.buildPromptTab = new this.app.BuildPromptTab(this.app);
      }
      this.app.tabManager.addTabAtStart(
        'Build Prompt',
        this.app.buildPromptTab.getElement(),
        true,
        'build-prompt-tab'
      );
    }

  ensureOutputTabExists() {
    if (!this.app.tabManager || this.app.tabManager.tabs.has('output-tab')) {
      return;
    }
    if (!this.app.outputTab) {
      this.app.outputTab = new this.app.OutputTab(this.app);
    }

    if (this.app.tabManager.tabs.has('build-prompt-tab')) {
      this.app.tabManager.addTabAfter(
        'Prompt Output',
        this.app.outputTab.getElement(),
        true,
        'output-tab',
        'build-prompt-tab'
      );
    } else {
      this.app.tabManager.addTabAtStart(
        'Prompt Output',
        this.app.outputTab.getElement(),
        true,
        'output-tab'
      );
    }
  }

  

  

  refreshUrlPreviewTab(projectName = null) {
    if (
      !this.previewTabId ||
      !this.app.tabManager ||
      !this.app.tabManager.tabs.has(this.previewTabId) ||
      !this.previewTabIframe
    ) {
      return false;
    }

    const effectiveProjectName = projectName || this.app.projectName;
    if (!effectiveProjectName) {
      return false;
    }

    const baseUrl = new URL(
      `/${effectiveProjectName}/`,
      window.location.origin
    );
    baseUrl.searchParams.set('_previewBust', Date.now().toString());

    this.app.uiManager.setStatus(
      `Refreshing preview for ${effectiveProjectName}...`
    );
    this.previewTabIframe.src = baseUrl.href;
    this.app.tabManager.setActiveTab(this.previewTabId);
    return true;
  }

  _openImageViewerTab(goldenPath, tabId, title, ext) {
      try {
        const raw = this.app.inMemoryFileStore?.get(goldenPath);
        let imgSrc = goldenPath;

        if (raw instanceof Uint8Array) {
          const mimes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.ico': 'image/x-icon',
            '.bmp': 'image/bmp',
            '.avif': 'image/avif',
          };
          const mime = mimes[ext] || 'application/octet-stream';
          const blob = new Blob([raw], { type: mime });
          imgSrc = URL.createObjectURL(blob);
        } else if (typeof raw === 'string' && ext === '.svg') {
          imgSrc = `data:image/svg+xml,${encodeURIComponent(raw)}`;
        }

        const panel = makeElement('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '14px',
            background: 'var(--bg-primary, #1e1e1e)',
            padding: '24px',
            boxSizing: 'border-box',
          },
        });

        const img = makeElement('img', {
          src: imgSrc,
          alt: title,
          style: {
            maxWidth: '100%',
            maxHeight: 'calc(100% - 72px)',
            objectFit: 'contain',
            borderRadius: '4px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          },
        });

        const meta = makeElement('div', {
          style: {
            color: 'var(--text-secondary, #888)',
            fontSize: '12px',
            fontFamily: 'var(--font-monospace)',
            textAlign: 'center',
          },
          textContent: title,
        });

        img.onload = () => {
          const dims =
            img.naturalWidth && img.naturalHeight
              ? `${img.naturalWidth} × ${img.naturalHeight}  •  `
              : '';
          const size =
            raw instanceof Uint8Array
              ? `${(raw.length / 1024).toFixed(1)} KB  •  `
              : '';
          meta.textContent = `${dims}${size}${ext.slice(1).toUpperCase()}`;
        };
        img.onerror = () => {
          meta.textContent = '⚠ Could not load image';
        };

        panel.append(img, meta);

        // Render as a beautiful floating dialog rather than a workspace tab
        const dialog = UITools.makeDialog({
          title: '🖼️ ' + title,
          contentElement: panel,
          size: [600, 500],
        });

        const pseudo = {
          filePath: goldenPath,
          isDirty: false,
          isAutoOpened: false,
          viewManager: null,
          dialog: dialog
        };
        this.app.editorControllers.set(goldenPath, pseudo);
        return pseudo;
      } catch (err) {
        console.error('[TabOrchestrator] Error displaying image:', err);
        this.app.uiManager?.setStatus(
          `Failed to display image: ${err.message}`,
          true
        );
        return null;
      }
    }



  refreshRunnerTab() {
    if (
      this.runnerTabId &&
      this.app.tabManager &&
      this.app.tabManager.tabs.has(this.runnerTabId) &&
      this.runnerTabIframe
    ) {
      const url = new URL(this.runnerTabIframe.src);
      url.searchParams.set('_t', Date.now());
      this.runnerTabIframe.src = url.href;
      return true;
    }
    return false;
  }

    static _doc_TabOrchestrator() {
      return `# TabOrchestrator

## Summary

TabOrchestrator is the central coordinator for all tab lifecycles in the editor. While \`TabManager\` handles the raw DOM elements (the physical buttons and containers) and \`EditorTabController\` handles the smart file contents, the Orchestrator sits between them. It ensures that tabs are spawned correctly, deduplicated, properly wired with application context, and cleaned up when closed.

The philosophy here is centralized instantiation. If any part of the app needs to open a file, launch the Live Preview, or show the Project Browser, it asks the Orchestrator. This prevents scattered logic from accidentally opening duplicate tabs or initializing controllers with missing dependencies.

## Core Logic & Philosophy

**Idempotent file opening.** \`openFileInTab\` takes a \`nodeInfo\` object (usually from the file tree). If a tab for that golden path already exists, it simply focuses it and passes along any search terms. If it doesn't exist, it fetches the content (from memory or workspace), instantiates the \`EditorTabController\`, creates the physical tab via \`TabManager\`, and registers the controller in the app's global state.

**Specialty tab management.** The Orchestrator handles the creation of unique, non-file tabs. \`createProjectBrowserTab\` launches the template catalog. \`ensureBuildPromptTabExists\` guarantees the prompt workflow UI is available. It tracks the IDs and iframe references for these special tabs so they can be communicated with via \`postMessage\`.

**Import resolution.** \`openFileByImport\` allows users to alt-click (or use the navigator) on an import statement to open the corresponding file. It resolves the relative import path against the current file's golden path to figure out exactly which file in the project tree needs to be opened.

## Public API

### Tab Management
- \`async openFileInTab(nodeInfo, options)\` - Opens a file in a new tab or focuses an existing one. Returns the \`EditorTabController\`.
- \`removeTab(tabId)\` - Destroys a tab, cleans up its controller, and clears any specialized iframe references (like the runner or preview tabs).
- \`getControllerForPath(path)\` - Convenience method to retrieve the active controller for a given golden path.

### Specialty Tabs
- \`createProjectBrowserTab()\` - Spawns or focuses the project catalog.
- \`createUrlPreviewTab(url, projectName)\` - Spawns an iframe pointing to an external URL for deployed project previews.
- \`ensureBuildPromptTabExists()\` / \`ensureOutputTabExists()\` - Bootstraps the prompt generation workflow tabs if they don't already exist.
- \`async openFileByImport(importInfo, currentFilePath)\` - Resolves a relative import path and opens the target file.`;
    }

  


  static _doc_overview() {
      return `# TabOrchestrator

The \`TabOrchestrator\` is the central creator and coordinator for tab lifecycles.
It prevents disparate parts of the app from spawning duplicate controllers, ensuring all file editors and preview blocks are managed from a single registry.`;
    }

  static _doc_coordinates() {
      return `## Tab Lifecycle and Import Resolution

- **Deduplication**: \`openFileInTab\` resolves requests. If a tab for the golden path is open, it focuses it; otherwise, it loads the content and instantiates the \`EditorTabController\`.
- **Specialty Tabs**: Coordinates and manages unique, non-file panels like \`NativeProjectBrowser\`, \`BuildPromptTab\`, and sandboxed iframe preview tabs.
- **Import Navigation**: \`openFileByImport\` parses relative ES6 import paths against the active file and automatically resolves and opens the target file on double-click or navigation request.`;
    }

  static _doc() {
      return [
        this._doc_TabOrchestrator(),
        this._doc_overview(),
        this._doc_coordinates()
      ].join('\n\n');
    }

  
}

