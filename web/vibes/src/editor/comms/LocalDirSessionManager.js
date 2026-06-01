/**
 * LocalDirSessionManager
 *
 * Bridges the LocalDirectoryStore (or any Map-like file store) with the
 * runner-sw.js service worker. Responsibilities:
 *
 *  - Lazy SW registration (only when the user first enters localdir mode)
 *  - Converting golden-path file maps to SW-relative paths and sending them
 *  - Handling SW restarts: listens for 'sw-ready' and re-sends the last
 *    known file map so the runner iframe keeps working after a SW kill
 *  - Generating the stable runner URL for the current session
 *
 * One instance lives on app.localDirSessionManager for the lifetime of the
 * page. The sessionId is regenerated if the user opens a different folder.
 */

class LocalDirSessionManager {
  constructor(app) {
    this.app = app;

    // Random per-page-load ID — prevents multiple tabs from clobbering each other.
    // Fallback for non-HTTPS (e.g. Windows local network testing) where crypto.randomUUID is undefined.
    this.sessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2);

    this._registration = null;
    this._lastFileMap = null;
    this._lastProjectName = null;
    this._restartListenerAttached = false;
  }

  getRunnerUrl() {
    return `/vibes/local-project/${this.sessionId}/`;
  }

  newSession() {
    if (this._lastFileMap) {
      this._sendToSW({ type: 'CLEAR_SESSION', sessionId: this.sessionId });
    }
    this.sessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    this._lastFileMap = null;
    this._lastProjectName = null;
  }

  async register() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers are not supported in this browser.');
    }
    if (this._registration) return this._registration;

    this._registration = await navigator.serviceWorker.register(
      SW_SCRIPT_PATH,
      {
        scope: SW_SCOPE,
      }
    );
    console.log(
      '[LocalDirSM] Service worker registered.',
      this._registration.scope
    );

    // If there's a SW waiting to activate, tell it to skip waiting.
    if (this._registration.waiting) {
      this._registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    this._attachRestartListener();
    return this._registration;
  }

  async pushFiles(fileMap, projectName) {
    await this.register();
    await this._waitForController();

    this._lastFileMap = fileMap;
    this._lastProjectName = projectName;

    const { files, transferList } = this._serializeFileMap(
      fileMap,
      projectName
    );

    return new Promise((resolve, reject) => {
      const sw = navigator.serviceWorker.controller;
      if (!sw) {
        reject(
          new Error('[LocalDirSM] No active SW controller after waiting')
        );
        return;
      }

      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        reject(
          new Error(
            '[LocalDirSM] Timed out waiting for FILES_ACK from service worker.'
          )
        );
      }, 15_000);

      channel.port1.onmessage = (e) => {
        if (
          e.data?.type === 'FILES_ACK' &&
          e.data.sessionId === this.sessionId
        ) {
          clearTimeout(timer);
          resolve();
        }
      };

      sw.postMessage({ type: 'SET_FILES', sessionId: this.sessionId, files }, [
        channel.port2,
        ...transferList,
      ]);
    });
  }

  clearSession() {
    this._sendToSW({ type: 'CLEAR_SESSION', sessionId: this.sessionId });
    this._lastFileMap = null;
    this._lastProjectName = null;
  }

  _serializeFileMap(fileMap, projectName) {
    const prefix = `/${projectName}`;
    const files = {};
    const transferList = [];

    for (const [goldenPath, content] of fileMap.entries()) {
      // Compute the SW-relative path by stripping /ProjectName prefix.
      let swPath = goldenPath;
      if (goldenPath === prefix) {
        swPath = '/';
      } else if (goldenPath.startsWith(prefix + '/')) {
        swPath = goldenPath.slice(prefix.length);
      }
      // Paths that don't start with /ProjectName (e.g. /library/*) are kept
      // as-is; the browser will resolve those against the real origin and the
      // SW won't intercept them, which is fine — they're served by the server.

      if (content instanceof Uint8Array) {
        // Slice to get a fresh ArrayBuffer we can safely transfer without
        // detaching the Uint8Array that lives in the in-memory cache.
        const buf = content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength
        );
        files[swPath] = { content: new Uint8Array(buf) };
        transferList.push(buf);
      } else if (typeof content === 'string') {
        files[swPath] = { content };
      }
      // null / undefined entries are skipped
    }

    return { files, transferList };
  }

  _waitForController() {
    if (navigator.serviceWorker.controller) return Promise.resolve();

    return new Promise((resolve, reject) => {
      // Double-check immediately in case it changed between the outer check
      // and attaching the listener.
      if (navigator.serviceWorker.controller) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        navigator.serviceWorker.removeEventListener(
          'controllerchange',
          handler
        );
        reject(
          new Error(
            'Service worker did not take control of this page within 10s. ' +
              'Please refresh and try again.'
          )
        );
      }, 10_000);

      function handler() {
        if (navigator.serviceWorker.controller) {
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener(
            'controllerchange',
            handler
          );
          resolve();
        }
      }
      navigator.serviceWorker.addEventListener('controllerchange', handler);
    });
  }

  _attachRestartListener() {
    if (this._restartListenerAttached) return;
    this._restartListenerAttached = true;

    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data?.type !== 'sw-ready') return;
      if (!this._lastFileMap || !this._lastProjectName) return;

      console.log(
        '[LocalDirSM] SW restarted — re-pushing files for session',
        this.sessionId
      );
      try {
        await this.pushFiles(this._lastFileMap, this._lastProjectName);
        console.log(
          '[LocalDirSM] Files re-sent successfully after SW restart.'
        );
        this.app?.uiManager?.setStatus(
          'Live preview reconnected after SW restart.'
        );
      } catch (e) {
        console.error(
          '[LocalDirSM] Failed to re-push files after SW restart:',
          e
        );
        this.app?.uiManager?.setStatus(
          'Live preview lost connection — try Sync again.',
          'error'
        );
      }
    });
  }

  _sendToSW(message, transferList = []) {
    const sw = navigator.serviceWorker?.controller;
    if (sw) sw.postMessage(message, transferList);
  }

  updateFile(goldenPath, content, projectName) {
    if (!this._lastFileMap) return;
    const prefix = `/${projectName}`;
    let swPath = goldenPath;
    if (goldenPath === prefix) {
      swPath = '/';
    } else if (goldenPath.startsWith(prefix + '/')) {
      swPath = goldenPath.slice(prefix.length);
    }
    this._lastFileMap.set(goldenPath, content);

    let contentToSend = content;
    const transferList = [];
    if (content instanceof Uint8Array) {
      const buf = content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength
      );
      contentToSend = new Uint8Array(buf);
      transferList.push(buf);
    }

    this._sendToSW(
      {
        type: 'UPDATE_FILE',
        sessionId: this.sessionId,
        swPath,
        content: contentToSend,
      },
      transferList
    );
  }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 272,
  "provides": [
    "LocalDirSessionManager"
  ],
  "deps": []
}
recursi-meta */
