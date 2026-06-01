class YouTubeService {
  constructor() {
      this.playerTabId = null;
      this.connectionState = 'DISCONNECTED';
      this.currentSessionId = null;
      this.lastPlayerMessageTime = 0;
      this.isAppReady = false;

      // Initialize the missing transactions map to prevent runtime crashes upon APP_ACK receipt
      this.activeTransactions = new Map();

      // Set to dev as primary origin
      this.PROD_ORIGIN = 'https://recursi.dev';
      this.DEV_ORIGIN = 'http://localhost:7102';
      this.playerPath = '/AardvarkPlaylist/';

      this.isCreatingTab = false;
      this.lastTabCreateTime = 0;
    }

  init() {
      console.log('YouTubeService: Service Worker Initialized');

      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'YT_Video_Op') {
          this.forwardToPlayer(request.data)
            .then((res) => sendResponse(res))
            .catch((err) => sendResponse({ error: err.message }));
          return true;
        }

        if (request.type === 'YT_Player_Status') {
          const data = request.data;

          if (sender.tab && sender.tab.id) {
            this._updatePlayerTabRef(sender.tab.id);
          }

          if (data.type === 'PLAYER_READY' || data.type === 'HANDSHAKE') {
            this.isAppReady = true;
            if (data.type === 'PLAYER_READY') {
              console.log('YouTubeService: App UI confirmed ready.');
            }
          }

          if (data.type === 'APP_ACK' && data.msgId) {
            this.logAndBroadcast(`Received APP_ACK for transaction: ${data.msgId}`);
            const tx = this.activeTransactions.get(data.msgId);
            if (tx) {
              clearTimeout(tx.timeoutId);
              tx.resolve({ success: true });
              this.activeTransactions.delete(data.msgId);
            }
            this.broadcastStatus({
              type: 'YT_VIDEO_OP_ACK',
              msgId: data.msgId,
            });
          }

          if (data.type === 'ACK' && data.msgId) {
            this.pendingCommands.delete(data.msgId);
          }

          if (data.sessionId && this.currentSessionId !== data.sessionId) {
            this.currentSessionId = data.sessionId;
            this.broadcastStatus({
              type: 'PLAYER_CONNECTED',
              sessionId: this.currentSessionId,
            });
          }

          this.forwardToYouTubeTabs(data);

          sendResponse({ success: true });
          return false;
        }

        return false;
      });

      this.startTabListeners();
      
      // Auto-heal existing tabs on extension load/update
      this.reinjectExistingTabs();
    }

  startTabListeners() {
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      if (tabId === this.playerTabId) {
        console.log('YouTubeService: Player tab closed detected.');
        this.playerTabId = null;
        this.isAppReady = false;
        this.connectionState = 'DISCONNECTED';
        this.currentSessionId = null;
        this.broadcastStatus({
          type: 'PLAYER_DISCONNECTED',
          reason: 'Tab Closed',
        });
      }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tabId === this.playerTabId && changeInfo.status === 'loading') {
        console.log('YouTubeService: Player tab reloading/navigating...');
        this.isAppReady = false;
        this.broadcastStatus({
          type: 'PLAYER_CONNECTING',
          reason: 'Reloading',
        });
      }
    });
  }

  _updatePlayerTabRef(tabId) {
    if (this.playerTabId !== tabId) {
      console.log(`YouTubeService: Registered new Player Tab ID: ${tabId}`);
      this.playerTabId = tabId;
      this.isAppReady = false; // Reset readiness for new tabs
    }
    this.connectionState = 'CONNECTED';
  }

  async broadcastStatus(payload) {
    const fullPayload = { ...payload, timestamp: Date.now() };
    this.forwardToYouTubeTabs(fullPayload);
  }

  async forwardToPlayer(payload) {
      this.logAndBroadcast(`Received request to forward ${payload.type} for video: "${payload.title || 'Untitled'}" (${payload.videoId})`);

      if (payload.type === 'PING') {
        const tabId = await this.findPlayerTab();
        if (tabId) {
          this.playerTabId = tabId;
          this.logAndBroadcast(`PING: Found active player tab: ${tabId}`);
          return { success: true, found: true, tabId: tabId };
        }
        this.logAndBroadcast(`PING: No player tab found.`);
        return { success: true, found: false };
      }

      // If we are actively trying to add or play a video
      if (payload.type === 'ADD_VIDEO' || payload.type === 'PLAY_NOW') {
        // 1. Verify and ping the current known tab ID
        if (this.playerTabId) {
          this.logAndBroadcast(`Checking if known player tab ${this.playerTabId} is active...`);
          
          // Validate the origin to prevent mixing prod and dev instances
          let originValid = false;
          try {
            const tabInfo = await chrome.tabs.get(this.playerTabId);
            if (tabInfo && tabInfo.url) {
              const store = await chrome.storage.local.get(['bmo_dev_mode']);
              const expectedOrigin = store.bmo_dev_mode ? this.DEV_ORIGIN : this.PROD_ORIGIN;
              if (tabInfo.url.startsWith(expectedOrigin)) {
                originValid = true;
              }
            }
          } catch (e) {}

          if (!originValid) {
            this.logAndBroadcast(`Known player tab ${this.playerTabId} origin is invalid for current dev mode. Clearing memory.`, 'warn');
            this.playerTabId = null;
            this.isAppReady = false;
            this.connectionState = 'DISCONNECTED';
          } else {
            const isAlive = await this._waitForPlayerReady(this.playerTabId, 2500); // 2.5s quick ping
            if (!isAlive) {
              this.logAndBroadcast(`Known player tab ${this.playerTabId} did not respond. Clearing memory.`, 'warn');
              this.playerTabId = null;
              this.isAppReady = false;
              this.connectionState = 'DISCONNECTED';
            } else {
              this.logAndBroadcast(`Known player tab ${this.playerTabId} is alive and responsive.`);
            }
          }
        }

        // 2. If we don't have a tab, open or find one
        if (!this.playerTabId) {
          this.logAndBroadcast(`No responsive player tab found. Open/Ensuring tab...`);
          const newId = await this.ensurePlayerTab();
          if (!newId) {
            this.logAndBroadcast(`Failed to open/find Player Tab.`, 'error');
            return { error: 'Failed to open/find Player Tab' };
          }

          this.logAndBroadcast(`Opened/found player tab: ${newId}. Waiting for initial handshakes...`);
          const isReady = await this._waitForPlayerReady(newId, 15000);
          if (!isReady) {
            this.logAndBroadcast(`Player tab timed out during initialization.`, 'error');
            return { error: 'Player Tab timed out during initialization' };
          }
          this.logAndBroadcast(`Player tab and Web App confirmed ready.`);
        }

        // 3. Focus and bring the tab to the front only if focusPlayer is not explicitly set to false
        if (payload.focusPlayer !== false) {
          try {
            const targetTabId = this.playerTabId || (await this.findPlayerTab());
            if (targetTabId) {
              this.logAndBroadcast(`Bringing player tab ${targetTabId} to front.`);
              const tabInfo = await chrome.tabs.get(targetTabId);
              if (tabInfo && tabInfo.windowId) {
                await chrome.windows.update(tabInfo.windowId, {
                  focused: true,
                  drawAttention: true,
                });
                await chrome.tabs.update(targetTabId, { active: true });
              }
            }
          } catch (e) {
            this.logAndBroadcast(`Could not focus player tab: ${e.message}`, 'warn');
          }
        } else {
          this.logAndBroadcast(`Skipping player focus since focusPlayer is false.`);
        }
      }

      // Final dispatch to the page
      const tabId = await this.findPlayerTab();
      if (!tabId) {
        this.playerTabId = null;
        this.logAndBroadcast(`Final check: Player tab not found.`, 'error');
        return { error: 'Player Tab not found (is it open?)', found: false };
      }

      this.logAndBroadcast(`Dispatched ${payload.type} command to player tab ${tabId}.`);
      
      // Robust retry loop for transient load lag or sleep states
      let sentSuccessfully = false;
      let sendAttempts = 0;
      const maxSendAttempts = 3;

      while (!sentSuccessfully && sendAttempts < maxSendAttempts) {
        sendAttempts++;
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: 'YT_BRIDGE_TO_PAGE',
            payload: payload,
          });
          this.logAndBroadcast(`Successfully sent ${payload.type} to player tab.`);
          sentSuccessfully = true;
        } catch (e) {
          this.logAndBroadcast(`Attempt ${sendAttempts} failed to send message: ${e.message}.`, 'warn');
          if (sendAttempts < maxSendAttempts) {
            await new Promise(resolve => setTimeout(resolve, 300)); // wait 300ms before retrying
          }
        }
      }

      if (sentSuccessfully) {
        return { success: true };
      } else {
        this.logAndBroadcast(`Failed to send message after ${maxSendAttempts} attempts. Bridge might be unreachable.`, 'error');
        return { error: 'Bridge Unreachable', found: true };
      }
    }

  async forwardToYouTubeTabs(payload) {
    try {
      const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
      for (const tab of tabs) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: 'YT_BRIDGE_TO_EXTENSION_UI',
            payload: payload,
          })
          .catch(() => {});
      }
    } catch (e) {}
  }

  async ensurePlayerTab() {
    let targetOrigin = this.PROD_ORIGIN;

    try {
      const store = await chrome.storage.local.get(['bmo_dev_mode']);
      if (store.bmo_dev_mode) {
        targetOrigin = this.DEV_ORIGIN;
      }
    } catch (e) {}

    const existingTab = await this.findPlayerTab(targetOrigin);
    if (existingTab) {
      try {
        await chrome.tabs.update(existingTab, { active: true });
        this.playerTabId = existingTab;
        return existingTab;
      } catch (e) {
        this.playerTabId = null;
      }
    }

    if (this.isCreatingTab) return null;
    this.isCreatingTab = true;
    this.connectionState = 'CONNECTING';
    this.isAppReady = false;

    const finalUrl = targetOrigin + this.playerPath + 'index.html';

    try {
      const newTab = await chrome.tabs.create({ url: finalUrl, active: true });
      this.playerTabId = newTab.id;
      this.isCreatingTab = false;
      return newTab.id;
    } catch (e) {
      this.isCreatingTab = false;
      return null;
    }
  }

  async _waitForPlayerReady(tabId, timeout = 10000) {
      const startTime = Date.now();
      const checkInterval = 150; // Fast polling

      return new Promise((resolve) => {
        const check = setInterval(async () => {
          let bridgeAlive = false;
          let appReady = false;
          try {
            const resp = await chrome.tabs.sendMessage(tabId, {
              type: 'PING_BRIDGE',
            });
            if (resp && resp.success) {
              bridgeAlive = true;
              if (resp.appReady) {
                appReady = true;
              }
            }
          } catch (e) {
            // Bridge not loaded or ready yet
          }

          if (appReady) {
            this.isAppReady = true;
          }

          // Resolve only if the extension content bridge is alive AND the page Web App has finished loading
          if (bridgeAlive && this.isAppReady) {
            this.connectionState = 'CONNECTED';
            this.playerTabId = tabId;
            clearInterval(check);
            resolve(true);
            return;
          }

          if (Date.now() - startTime > timeout) {
            clearInterval(check);
            console.warn('YouTubeService: Player ready timeout');
            // Fallback: if bridge is alive but App didn't handshake yet, still resolve to prevent lock
            if (bridgeAlive) {
              this.connectionState = 'CONNECTED';
              this.playerTabId = tabId;
              resolve(true);
            } else {
              resolve(false);
            }
          }
        }, checkInterval);
      });
    }

  async findPlayerTab(preferredOriginOverride = null) {
      let preferred = preferredOriginOverride;
      if (!preferred) {
        try {
          const store = await chrome.storage.local.get(['bmo_dev_mode']);
          preferred = store.bmo_dev_mode ? this.DEV_ORIGIN : this.PROD_ORIGIN;
        } catch (e) {
          preferred = this.PROD_ORIGIN;
        }
      }

      const origins = [preferred];
      const matchingTabs = [];

      for (const origin of origins) {
        try {
          const tabs = await chrome.tabs.query({
            url: origin + '/*',
          });

          tabs.forEach((t) => {
            if (!t.url) return;
            try {
              const parsedUrl = new URL(t.url);
              // Perform a flexible, case-insensitive check for 'aardvarkplaylist' anywhere in the path
              const isMatch = parsedUrl.pathname.toLowerCase().includes('aardvarkplaylist');
              
              if (isMatch) {
                matchingTabs.push(t);
              }
            } catch (e) {}
          });
        } catch (e) {}
      }

      // Verify each matching tab by querying the content bridge directly
      let fallbackTabId = null;
      for (const tab of matchingTabs) {
        try {
          const resp = await chrome.tabs.sendMessage(tab.id, { type: 'PING_BRIDGE' });
          if (resp && resp.success) {
            if (resp.appReady) {
              this.logAndBroadcast(`Verified active player bridge (App Ready) on tab: ${tab.id} (URL: ${tab.url})`);
              return tab.id;
            } else {
              if (!fallbackTabId) fallbackTabId = tab.id;
            }
          }
        } catch (e) {
          // Content script not loaded/active on this matching tab
        }
      }

      // Fallback: If a tab responded to the PING but isn't marked ready yet
      if (fallbackTabId) {
        this.logAndBroadcast(`Tab responded to PING but app not ready yet. Returning fallback tab: ${fallbackTabId}`);
        return fallbackTabId;
      }

      // Final Fallback: if no tab responded to the message, return first matched tab to allow setup sequence to run
      if (matchingTabs.length > 0) {
        this.logAndBroadcast(`No tabs responded to PING_BRIDGE. Falling back to first matched tab: ${matchingTabs[0].id}`);
        return matchingTabs[0].id;
      }

      return null;
    }


  logAndBroadcast(message, type = 'info') {
      console.log(`[YouTubeService] ${message}`);
      this.broadcastStatus({
        type: 'BG_LOG',
        message: message,
        logType: type
      });
    }

  reinjectExistingTabs() {
      this.logAndBroadcast('Checking for existing tabs to programmatically re-inject content scripts...');

      // Re-inject YouTubeContent.js into active YouTube tabs
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
        if (tabs) {
          tabs.forEach((tab) => {
            if (tab.url && !tab.url.startsWith('chrome://')) {
              this.logAndBroadcast(`Re-injecting YouTubeContent into tab: ${tab.id}`);
              chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                files: ['content/YouTubeContent.js']
              }).catch((err) => {
                this.logAndBroadcast(`Auto-injection failed for YouTube tab ${tab.id}: ${err.message}`, 'warn');
              });
            }
          });
        }
      });

      // Re-inject PlayerBridge.js into active Player tabs
      const origins = [this.DEV_ORIGIN, this.PROD_ORIGIN];
      origins.forEach((origin) => {
        chrome.tabs.query({ url: origin + '/*' }, (tabs) => {
          if (tabs) {
            tabs.forEach((tab) => {
              if (tab.url && !tab.url.startsWith('chrome://') && (tab.url.includes('AardvarkPlaylist') || tab.url.includes('localhost:7102'))) {
                this.logAndBroadcast(`Re-injecting PlayerBridge into tab: ${tab.id}`);
                chrome.scripting.executeScript({
                  target: { tabId: tab.id, allFrames: true },
                  files: ['content/PlayerBridge.js']
                }).catch((err) => {
                  this.logAndBroadcast(`Auto-injection failed for Player tab ${tab.id}: ${err.message}`, 'warn');
                });
              }
            });
          }
        });
      });
    }
}