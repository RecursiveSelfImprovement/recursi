// phase2-managed-migration: internal imports/exports stripped
class ClientStateManager {
  constructor(app, messenger) {
      this.app = app;
      this.messenger = messenger;
      this.backupQueue = [];
      this.jsModuleParser = new JsModuleParser(window.acorn);
    }

  init() {
      console.log(
        'ClientStateManager initialized.'
      );
    }

  pushCodeToRunner() {
      console.log(
        '[ClientStateManager] pushCodeToRunner called. projectName:',
        this.app.projectName,
        'sourceProjectName:',
        this.app.sourceProjectName
      );

      const projectName = this.app.sourceProjectName || this.app.projectName;
      console.log(
        '[ClientStateManager] Resolved projectName for self-check:',
        projectName
      );
      if (projectName === 'vibes') {
        console.log(
          '[ClientStateManager] 🧠 Self-detection HIT - aborting pushCodeToRunner. Vibes does not run itself in the runner.'
        );
        this.app.uiManager.setStatus(
          'Vibes does not preview itself - use 🔥 Hot Patch or reload.',
          false,
          6000
        );
        return;
      }

      console.log(
        '[ClientStateManager] Self-detection PASSED - proceeding with push to runner.'
      );
      this.app.uiManager.setStatus('Syncing changes and pushing to preview...');

      // OBSOLETE CONCEPT: Memory mode (where actual JavaScript text was loaded in memory
      // to fork/live work) is obsolete and dead. We load from server/disk or patch IndexedDB.
      if (!this.app.inMemoryFileStore) {
        this.app.uiManager.setStatus(
          'Live Preview is only available for forked (in-memory) projects.',
          true
        );
        return;
      }

      const dirtyControllers = Array.from(
        this.app.editorControllers.values()
      ).filter(
        (c) =>
          c.isLoaded && c.isDirty && typeof c.getReconstructedCode === 'function'
      );

      const doThePush = async () => {
        for (const ctl of dirtyControllers) {
          const fullCode = await ctl.getReconstructedCode('module');
          const pathObj = this.app.createPath(ctl.filePath);
          this.app.inMemoryFileStore.set(pathObj.toString(), fullCode);
          ctl.markClean();
        }

        if (this.app.uiManager?.uiMode === 'localdir') {
          await this._pushToLocalDirRunner();
        } else {
          await this.app.runnerManager.buildAndSendMessage();
        }
      };

      doThePush();
    }

  async _pushToLocalDirRunner() {
    const sm = this.app.localDirSessionManager;
    if (!sm) {
      console.error(
        '[ClientStateManager] localdir mode but no session manager found on app.'
      );
      this.app.uiManager.setStatus(
        'Local directory session not initialized.',
        'error'
      );
      return;
    }

    this.app.uiManager.setStatus('Pushing files to local preview...');

    try {
      await sm.pushFiles(this.app.inMemoryFileStore, this.app.projectName);

      const tabOrch = this.app.tabOrchestrator;
      const runnerUrl = sm.getRunnerUrl();
      // Cache-bust the iframe src so the browser re-fetches from the SW.
      // The SW only routes on pathname so the query param is safe to add.
      const bustUrl = runnerUrl + '?_t=' + Date.now();

      if (
        tabOrch.runnerTabId &&
        this.app.tabManager?.tabs.has(tabOrch.runnerTabId) &&
        tabOrch.runnerTabIframe
      ) {
        // Force reload by reassigning src — more reliable than location.reload()
        // on sandboxed iframes.
        tabOrch.runnerTabIframe.src = bustUrl;
        this.app.tabManager.setActiveTab(tabOrch.runnerTabId);
        this.app.uiManager.setStatus('Local preview updated.');
      } else {
        // No runner tab yet — createRunnerTab with the SW URL.
        tabOrch.createRunnerTab(bustUrl);
        this.app.uiManager.setStatus('Local preview started.');
      }
    } catch (e) {
      console.error('[ClientStateManager] Local runner push failed:', e);
      this.app.uiManager.setStatus(
        `Local preview error: ${e.message}`,
        'error'
      );
    }
  }

  backupDiff(filePath, newContent) {
      const diff = {
        type: 'TextDiff',
        path: filePath,
        content: newContent,
        timestamp: Date.now(),
      };

      if (this.messenger && typeof this.messenger.sendMessage === 'function') {
        this.messenger.sendMessage(diff);
      }
    }

async prepareRunnerPayload() {
      const pfm = this.app.projectFilesManager;
      if (!pfm) return null;
      const trees = typeof pfm.getFileTreeViews === 'function' ? pfm.getFileTreeViews() : [];
      if (trees.length === 0) return null;
      const fileMap = new Map();

      if (this.app.vfs) {
        try {
          const paths = await this.app.vfs.listFiles({ includeStatic: true });
          const fetchPromises = paths.map(async (path) => {
            const content = await this.app.vfs.readFile(path, { noIdbPatch: true, nullOnMissing: true });
            if (typeof content === 'string') fileMap.set(path, content);
          });
          await Promise.all(fetchPromises);
        } catch (e) {
          if (this.app.inMemoryFileStore) {
            for (const [k, v] of this.app.inMemoryFileStore.entries()) fileMap.set(k, v);
          }
        }
      } else if (this.app.inMemoryFileStore) {
        for (const [k, v] of this.app.inMemoryFileStore.entries()) fileMap.set(k, v);
      }

      const dirtyControllers = Array.from(this.app.editorControllers.values()).filter((c) => c.isLoaded && c.isDirty);
      for (const ctl of dirtyControllers) {
        if (typeof ctl.getReconstructedCode === 'function') {
          fileMap.set(ctl.filePath, await ctl.getReconstructedCode('module'));
        } else if (typeof ctl.getCode === 'function') {
          fileMap.set(ctl.filePath, ctl.getCode());
        }
      }

      return await this.app.runnerManager.buildPayload(fileMap);
    }

}