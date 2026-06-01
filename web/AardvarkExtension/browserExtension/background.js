// --- START OF SERVICE BOOTSTRAP ---
try {
  importScripts('services/YouTubeService.js', 'services/BookmarkService.js');

  const ytService = new YouTubeService();
  ytService.init();

  const bmService = new BookmarkService();
  bmService.init();

  console.log('BMO Background Services Initialized');
} catch (e) {
  console.error('BMO Background Bootstrap Failed:', e);
}
// --- END OF SERVICE BOOTSTRAP ---

const classBundles = {
  Aardvark: [
    'utils/applyCss.js',
    'utils/makeElement.js',
    'utils/DialogBox.js',
    'utils/KeystrokeHandler.js',
    'features/AardvarkOverlay.js',
    'features/AardvarkActions.js',
    'features/AardvarkStyleEditor.js',
    'features/AardvarkRadialMenu.js',
    'features/Aardvark.js',
  ],
  LlmHelper: [
    'utils/applyCss.js',
    'utils/makeElement.js',
    'utils/DialogBox.js',
    'utils/WindowMessenger.js',
    'features/LlmHelperUI.js',
    'features/LlmHelper.js',
  ],
  VideoLooper: [
    'utils/applyCss.js',
    'utils/makeElement.js',
    'features/VideoSegment.js',
    'features/SegmentManager.js',
    'features/TimelineUI.js',
    'features/VideoController.js',
    'features/LooperKeystrokeHandler.js',
    'features/VideoLooper.js',
  ],
  DrawingTool: [
    'utils/applyCss.js',
    'utils/makeElement.js',
    'utils/KeystrokeHandler.js',
    'features/CurveFitter.js',
    'features/DrawingTool.js',
  ],
  YoloAgent: [
    'utils/applyCss.js',
    'utils/makeElement.js',
    'utils/DialogBox.js',
    'utils/KeystrokeHandler.js',
    'utils/WindowMessenger.js',
    'features/AardvarkOverlay.js',
    'features/AardvarkActions.js',
    'features/AardvarkStyleEditor.js',
    'features/AardvarkRadialMenu.js',
    'features/Aardvark.js',
    'content/YoloTargetAgent.js',
  ],
  Dictation: [
    'utils/applyCss.js',
    'utils/makeElement.js',
    'utils/DialogBox.js',
    'features/AardvarkDictation.js',
  ],
};

const llmAutoInjectMap = [
  { host: 'chatgpt.com', key: 'llm_auto_chatgpt', className: 'LlmHelper' },
  { host: 'claude.ai', key: 'llm_auto_claude', className: 'LlmHelper' },
  {
    host: 'aistudio.google.com',
    key: 'llm_auto_studio',
    className: 'LlmHelper',
  },
  {
    host: 'x.com',
    key: 'llm_auto_grok',
    className: 'LlmHelper',
    subpath: '/grok',
  },
];

function performInjection(tabId, className) {
  const files = classBundles[className];
  if (!files) return Promise.reject(new Error('Unknown class'));

  return chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        return {
          applyCss: typeof applyCss !== 'undefined',
          makeElement: typeof makeElement !== 'undefined',
          DialogBox: typeof DialogBox !== 'undefined',
          WindowMessenger: typeof WindowMessenger !== 'undefined',
          LlmHelper: typeof LlmHelper !== 'undefined',
          LlmHelperUI: typeof LlmHelperUI !== 'undefined',
          Aardvark: typeof Aardvark !== 'undefined',
          VideoLooper: typeof VideoLooper !== 'undefined',
          YoloTargetAgent: typeof YoloTargetAgent !== 'undefined',
          AardvarkDictation: typeof AardvarkDictation !== 'undefined',
          CurveFitter: typeof CurveFitter !== 'undefined',
          DrawingTool: typeof DrawingTool !== 'undefined',
          KeystrokeHandler: typeof KeystrokeHandler !== 'undefined'
        };
      },
    })
    .then((results) => {
      const existing =
        results && results[0] && results[0].result ? results[0].result : {};

      const fileToClassMap = {
        'utils/applyCss.js': 'applyCss',
        'utils/makeElement.js': 'makeElement',
        'utils/DialogBox.js': 'DialogBox',
        'utils/WindowMessenger.js': 'WindowMessenger',
        'features/LlmHelper.js': 'LlmHelper',
        'features/LlmHelperUI.js': 'LlmHelperUI',
        'features/Aardvark.js': 'Aardvark',
        'features/VideoLooper.js': 'VideoLooper',
        'content/YoloTargetAgent.js': 'YoloTargetAgent',
        'features/AardvarkDictation.js': 'AardvarkDictation',
        'features/CurveFitter.js': 'CurveFitter',
        'features/DrawingTool.js': 'DrawingTool',
        'utils/KeystrokeHandler.js': 'KeystrokeHandler'
      };

      const filesToInject = files.filter((f) => {
        const checkClass = fileToClassMap[f];
        return !(checkClass && existing[checkClass]);
      });

      let injectPromise = Promise.resolve();
      if (filesToInject.length > 0) {
        injectPromise = chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: filesToInject,
          world: 'MAIN',
        });
      }

      return injectPromise.then(() => {
        return chrome.scripting.executeScript({
          target: { tabId: tabId },
          world: 'MAIN',
          func: (cls, dictationUrl) => {
            console.log('[Extension] Booting ' + cls + '...');

            if (cls === 'LlmHelper') {
              if (!window.llmHelperInstance) {
                window.llmHelperInstance = new LlmHelper();
                const ui = new LlmHelperUI(window.llmHelperInstance);
                window.llmHelperInstance.setUI(ui);
                window.llmHelperInstance.init();
              }
              return;
            }

            if (cls === 'Aardvark') {
              if (!window.aardvarkInstance) {
                window.aardvarkInstance = new Aardvark();
                window.aardvarkInstance.init();
              } else {
                window.aardvarkInstance.wakeUp();
              }
              return;
            }

            if (cls === 'Dictation') {
              if (typeof AardvarkDictation !== 'undefined') {
                AardvarkDictation.launchAt(dictationUrl);
              }
              return;
            }

            if (cls === 'DrawingTool') {
              if (window.drawingToolInstance) {
                window.drawingToolInstance.quit();
              } else {
                window.drawingToolInstance = new DrawingTool();
              }
              return;
            }

            if (cls === 'VideoLooper') {
              if (window.videoLooperInstance)
                window.videoLooperInstance.destroy();
              window.videoLooperInstance = new VideoLooper();
              window.videoLooperInstance.init();
            }
            if (cls === 'YoloAgent') {
              if (!window.yoloAgent) {
                window.yoloAgent = new YoloTargetAgent();
                window.yoloAgent.init();
                console.log('[Extension] YoloTargetAgent initialized. href=' + location.href);
console.log('[Extension] typeof WindowMessenger=' + typeof WindowMessenger + ', typeof YoloTargetAgent=' + typeof YoloTargetAgent);
              }
              return;
            }
          },
          args: [className, chrome.runtime.getURL('dictation.html')],
        });
      });
    });
}

// Monitor for LLM pages to auto-inject the helper
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  try {
    const url = new URL(tab.url);

    // YOLO RPC Agent: inject when URL has #yolo_rpc_agent
    if (url.hash && url.hash.includes('yolo_rpc_agent')) {
      console.log('[Extension] YOLO RPC Agent trigger detected for tab ' + tabId + ' url=' + tab.url);
console.log('[Extension] About to inject YoloAgent into Quora/target page');
      performInjection(tabId, 'YoloAgent').catch((err) => {
        console.warn('[Extension] YOLO Agent injection failed:', err);
      });
      return;
    }
    const match = llmAutoInjectMap.find((item) => {
      const hostMatch = url.host.includes(item.host);
      const pathMatch = !item.subpath || url.pathname.startsWith(item.subpath);
      return hostMatch && pathMatch;
    });

    if (match) {
      chrome.storage.local.get([match.key], (res) => {
        if (res[match.key]) {
          console.log(
            '[Extension] Auto-injecting ' + match.className + ' for ' + url.host
          );
          performInjection(tabId, match.className).catch((err) => {
            console.warn('[Extension] Auto-injection failed:', err);
          });
        }
      });
    }
  } catch (e) {}
});

// --- CONTEXT MENUS ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "aardvark-parent",
      title: "Aardvark",
      contexts: ["all"],
    });
    chrome.contextMenus.create({
      id: "start-aardvark",
      parentId: "aardvark-parent",
      title: "\uD83D\uDD0D DOM Tool",
      contexts: ["all"],
    });
    chrome.contextMenus.create({
      id: "start-looper",
      parentId: "aardvark-parent",
      title: "\uD83D\uDD01 Video Looper",
      contexts: ["all"],
    });
    chrome.contextMenus.create({
      id: "start-dictation",
      parentId: "aardvark-parent",
      title: "\uD83C\uDF99\uFE0F Dictation",
      contexts: ["all"],
    });
    chrome.contextMenus.create({
      id: "start-draw",
      parentId: "aardvark-parent",
      title: "\u270F\uFE0F Draw",
      contexts: ["all"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "start-aardvark") {
    performInjection(tab.id, "Aardvark").catch((e) =>
      console.log("Aardvark inject failed:", e.message)
    );
  }
  if (info.menuItemId === "start-looper") {
    performInjection(tab.id, "VideoLooper").catch((e) =>
      console.log("Looper inject failed:", e.message)
    );
  }
  if (info.menuItemId === "start-dictation") {
    performInjection(tab.id, "Dictation").catch((e) =>
      console.log("Dictation inject failed:", e.message)
    );
  }
  if (info.menuItemId === "start-draw") {
    performInjection(tab.id, "DrawingTool").catch((e) =>
      console.log("Draw inject failed:", e.message)
    );
  }
});
// --- END CONTEXT MENUS ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'injectScript') {
    performInjection(request.tabId, request.className)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// --- YOLO SCRAPER RELAY (for COOP sites like Quora) ---
// Maps target href -> { tabId, yoloTabId, pendingRpcs: Map<id, yoloTabId> }
const _yoloRelayTargets = new Map();  // href -> { tabId, yoloTabId }

// Track which YOLO tab is the "active" one for an RPC. Simple: last YOLO tab that
// opened a target. If multiple YOLO tabs scrape in parallel we can key by tabId later.
let _yoloRelayLastYoloTabId = null;

// --- END YOLO SCRAPER RELAY STATE ---

// --- LLM-TO-YOLO BRIDGE ---
// Explicit pairing between YOLO tabs and LLM tabs.
// Each YOLO tab gets a short code. LLM tabs connect by entering the code.

const _yoloTabs = new Map();   // tabId -> { url, code }
const _pairings = new Map();   // code -> { yoloTabId, llmTabId, createdAt }

function _generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Track YOLO tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    try {
      const url = new URL(tab.url);
      if (url.hostname === "localhost" && url.port === "7002") {
        if (!_yoloTabs.has(tabId)) {
          const code = _generateCode();
          _yoloTabs.set(tabId, { url: tab.url, code: code });
          _pairings.set(code, { yoloTabId: tabId, llmTabId: null, createdAt: Date.now() });
          console.log("[Aardvark] YOLO tab", tabId, "assigned code:", code);
          // Notify the YOLO tab of its code
          chrome.tabs.sendMessage(tabId, {
            type: "YOLO_PAIR_CODE",
            code: code
          }, () => { if (chrome.runtime.lastError) {} });
        }
      }
    } catch(e) {}
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  // Clean up YOLO tab
  if (_yoloTabs.has(tabId)) {
    const info = _yoloTabs.get(tabId);
    _pairings.delete(info.code);
    _yoloTabs.delete(tabId);
    console.log("[Aardvark] YOLO tab closed:", tabId);
  }
  // Clean up LLM tab from any pairing
  _pairings.forEach((pair, code) => {
    if (pair.llmTabId === tabId) {
      pair.llmTabId = null;
      console.log("[Aardvark] LLM tab disconnected from pairing:", code);
      // Notify YOLO tab that LLM disconnected
      if (pair.yoloTabId) {
        chrome.tabs.sendMessage(pair.yoloTabId, {
          type: "LLM_DISCONNECTED",
          code: code
        }, () => { if (chrome.runtime.lastError) {} });
      }
    }
  });
});

// Find YOLO tabs on startup
chrome.tabs.query({ url: "http://localhost:7002/*" }, (tabs) => {
  if (tabs) {
    tabs.forEach((tab) => {
      if (!_yoloTabs.has(tab.id)) {
        const code = _generateCode();
        _yoloTabs.set(tab.id, { url: tab.url, code: code });
        _pairings.set(code, { yoloTabId: tab.id, llmTabId: null, createdAt: Date.now() });
        console.log("[Aardvark] YOLO tab found on startup:", tab.id, "code:", code);
        chrome.tabs.sendMessage(tab.id, {
          type: "YOLO_PAIR_CODE",
          code: code
        }, () => { if (chrome.runtime.lastError) {} });
      }
    });
  }
});

// Find pairing by LLM tab ID
function _findPairingForLlm(llmTabId) {
  for (const [code, pair] of _pairings) {
    if (pair.llmTabId === llmTabId) return { code, pair };
  }
  return null;
}

// Find pairing by YOLO tab ID
function _findPairingForYolo(yoloTabId) {
  for (const [code, pair] of _pairings) {
    if (pair.yoloTabId === yoloTabId) return { code, pair };
  }
  return null;
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // LLM tab wants to pair with a YOLO tab using a code
  if (request.type === "LLM_PAIR_REQUEST") {
    const code = (request.code || "").toUpperCase().trim();
    const pair = _pairings.get(code);
    if (!pair) {
      sendResponse({ success: false, error: "invalid_code" });
      return true;
    }
    // Unpair from any previous pairing
    const senderTabId = sender.tab ? sender.tab.id : null;
    if (senderTabId) {
      const oldPair = _findPairingForLlm(senderTabId);
      if (oldPair) oldPair.pair.llmTabId = null;
    }
    pair.llmTabId = senderTabId;
    console.log("[Aardvark] Paired LLM tab", senderTabId, "with YOLO code:", code);
    // Notify YOLO tab
    chrome.tabs.sendMessage(pair.yoloTabId, {
      type: "LLM_PAIRED",
      code: code,
      llmTabId: senderTabId,
      llmSite: sender.tab ? new URL(sender.tab.url).hostname : "unknown"
    }, () => { if (chrome.runtime.lastError) {} });
    sendResponse({ success: true, code: code, yoloTabId: pair.yoloTabId });
    return true;
  }

  // LLM sends message to its paired YOLO
  if (request.type === "LLM_TO_YOLO") {
    const senderTabId = sender.tab ? sender.tab.id : null;
    const found = _findPairingForLlm(senderTabId);
    if (!found) {
      sendResponse({ success: false, error: "not_paired" });
      return true;
    }

    // YOLO sends a visual RPC command back to its paired LLM
    if (request.payload && request.payload.action === "YOLO_TO_LLM") {
      const yoloFound = _findPairingForYolo(senderTabId);
      if (!yoloFound || !yoloFound.pair.llmTabId) {
        sendResponse({ success: false, error: "not_paired_or_llm_missing" });
        return true;
      }
      console.log("[Aardvark] Routing YOLO_TO_LLM to tab:", yoloFound.pair.llmTabId);
      chrome.tabs.sendMessage(yoloFound.pair.llmTabId, {
        type: "YOLO_RPC_CMD",
        payload: request.payload
      }, () => { if (chrome.runtime.lastError) {} });
      sendResponse({ success: true });
      return true;
    }

    chrome.tabs.sendMessage(found.pair.yoloTabId, {
      type: "LLM_CODE_DELIVERY",
      payload: request.payload,
      sourceSite: sender.tab ? new URL(sender.tab.url).hostname : "unknown",
      sourceTabId: senderTabId,
      pairCode: found.code
    }, (resp) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: "delivery_failed" });
      } else {
        sendResponse({ success: true, resp: resp });
      }
    });
    return true;
  }

  // LLM tab checks its pairing status
  if (request.type === "YOLO_STATUS_QUERY") {
    const senderTabId = sender.tab ? sender.tab.id : null;
    const found = _findPairingForLlm(senderTabId);
    // Also list unpaired YOLO tabs so LLM can offer to connect
    const unpaired = [];
    _pairings.forEach((pair, code) => {
      if (!pair.llmTabId) unpaired.push({ code: code, yoloTabId: pair.yoloTabId });
    });
    sendResponse({
      connected: found !== null,
      code: found ? found.code : null,
      tabId: found ? found.pair.yoloTabId : null,
      unpairedYoloTabs: unpaired
    });
    return true;
  }

  // YOLO tab sends message back to its paired LLM
  if (request.type === "YOLO_TO_LLM") {
    const targetTabId = request.targetTabId;
    if (targetTabId) {
      chrome.tabs.sendMessage(targetTabId, {
        type: "YOLO_RESPONSE",
        payload: request.payload
      }, (resp) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      });
      return true;
    }
    sendResponse({ success: false, error: "no_target_tab" });
    return true;
  }

  // YOLO tab requests its code
  if (request.type === "YOLO_GET_CODE") {
    const senderTabId = sender.tab ? sender.tab.id : null;
    const info = _yoloTabs.get(senderTabId);
    sendResponse({ code: info ? info.code : null });
    return true;
  }

  // YOLO SCRAPER RELAY

  // Target page content script: "hi, I just came up on href X, my tabId is sender.tab.id"
  // Accept both the original registration name and the page-side hello alias.
  if (request.type === "YOLO_AGENT_REGISTER" || request.type === "YOLO_AGENT_HELLO") {
    const tabId = sender.tab ? sender.tab.id : null;
    const href = request.href || (sender.tab ? sender.tab.url : null);
    if (tabId && href) {
      // Strip fragment for matching: YOLO asks for the base URL
      const base = href.split("#")[0];
      const entry = { tabId: tabId, yoloTabId: _yoloRelayLastYoloTabId };
      _yoloRelayTargets.set(base, entry);
      console.log("[YoloRelay] target registered: base=" + base + " tabId=" + tabId + " yoloTabId=" + entry.yoloTabId);
      // Notify the YOLO tab if we know which one
      if (entry.yoloTabId) {
        chrome.tabs.sendMessage(entry.yoloTabId, {
          type: "YOLO_RELAY_READY",
          targetHref: base,
          targetTabId: tabId
        }, function() { if (chrome.runtime.lastError) {} });
      }
    }
    sendResponse({ ok: true });
    return true;
  }

  // YOLO tab: "remember that I am about to open this URL; route its registration to me"
  if (request.type === "YOLO_RELAY_CLAIM") {
    const yoloTabId = sender.tab ? sender.tab.id : null;
    _yoloRelayLastYoloTabId = yoloTabId;
    console.log("[YoloRelay] YOLO tab claim: yoloTabId=" + yoloTabId);
    sendResponse({ ok: true, yoloTabId: yoloTabId });
    return true;
  }

  // YOLO tab: "send this RPC to target with href X"
  if (request.type === "YOLO_RPC_REQ_RELAY") {
    const base = (request.targetHref || "").split("#")[0];
    const entry = _yoloRelayTargets.get(base);
    if (!entry) {
      sendResponse({ ok: false, error: "target_not_registered" });
      return true;
    }
    // Remember which YOLO tab this req came from so YOLO_RPC_RES can be routed back.
    entry.yoloTabId = sender.tab ? sender.tab.id : entry.yoloTabId;
    chrome.tabs.sendMessage(entry.tabId, {
      type: "YOLO_RPC_REQ_RELAY",
      payload: request.payload
    }, function() { if (chrome.runtime.lastError) {} });
    sendResponse({ ok: true });
    return true;
  }

  // Target tab: "here is my RPC response, forward to the YOLO tab that asked"
  // Accept both the original response name and the relay-page alias.
  if (request.type === "YOLO_RPC_RES" || request.type === "YOLO_RPC_RES_RELAY") {
    const targetTabId = sender.tab ? sender.tab.id : null;
    // Find the YOLO tab that registered for this target
    let yoloTabId = null;
    _yoloRelayTargets.forEach(function(entry) {
      if (entry.tabId === targetTabId) yoloTabId = entry.yoloTabId;
    });
    if (!yoloTabId) {
      sendResponse({ ok: false, error: "no_yolo_tab_for_target" });
      return true;
    }
    chrome.tabs.sendMessage(yoloTabId, {
      type: "YOLO_RPC_RES_DELIVERY",
      payload: request.payload
    }, function() { if (chrome.runtime.lastError) {} });
    sendResponse({ ok: true });
    return true;
  }

  // --- END YOLO SCRAPER RELAY ---
});
// --- END LLM-TO-YOLO BRIDGE ---

