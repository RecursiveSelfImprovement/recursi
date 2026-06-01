/**
 * PlayerBridge.js
 * Injected into http://localhost:7002/* or https://recursi.dev/*
 * Acts as a bridge between the Extension Background and the Web Page's window.postMessage
 */

class PlayerBridge {
  constructor() {
    this.sessionId = this._generateSessionId();
    this.init();
  }

  _generateSessionId() {
    return (
      'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
    );
  }

  init(...args) {
      console.log("BMO Bridge: STARTUP");
      if (!this._isContextValid()) return;

      this._sendHandshake("INIT");

      var self = this;
      window.addEventListener("message", function(event) {
        if (!event.data || !event.data.type) return;
        var t = event.data.type;

        if (t === "PLAYER_READY" || t === "SYNC_PLAYLIST" || t === "HANDSHAKE") {
          PlayerBridge.isAppReadyOnPage = true;
          if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
            try {
              chrome.runtime.sendMessage({ type: "YT_Player_Status", data: event.data },
                function() { if (chrome.runtime.lastError) {} });
            } catch(e) {}
          }
        }

        // TRANSACTIONAL HANDSHAKE: Catch ACK from page context, relay up to Background
        if (t === "APP_ACK" && event.data.msgId) {
          if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
            try {
              chrome.runtime.sendMessage({
                type: "YT_Player_Status",
                data: {
                  type: "APP_ACK",
                  msgId: event.data.msgId,
                  sessionId: self.sessionId
                }
              }, function() { if (chrome.runtime.lastError) {} });
            } catch(e) {}
          }
        }

        if (t === "YOLO_SEND_TO_LLM") {
          if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
            try {
              chrome.runtime.sendMessage({
                type: "YOLO_TO_LLM",
                targetTabId: event.data.targetTabId,
                payload: event.data.payload
              }, function() { if (chrome.runtime.lastError) {} });
            } catch(e) {}
          }
        }
      });

      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function(req, sender, sendResp) {
          if (req.type === 'PING_BRIDGE') {
            if (sendResp) sendResp({ success: true, appReady: PlayerBridge.isAppReadyOnPage });
            return;
          }
          if (req.type === "YT_BRIDGE_TO_PAGE") {
            window.postMessage(req.payload, "*");
            if (sendResp) sendResp({ success: true });
          }
          if (req.type === "LLM_CODE_DELIVERY") {
            var payload = req.payload || {};
            var action = payload.action || null;
            if (action && action !== "CODE_DELIVERY") {
              window.postMessage({
                type: "LLM_COMMAND_RESPONSE", action: action, data: payload,
                sourceSite: req.sourceSite || "unknown",
                sourceTabId: req.sourceTabId || null, timestamp: Date.now()
              }, "*");
            } else {
              window.postMessage({
                type: "INCOMING_LLM_CODE",
                code: payload.code || "", blocks: payload.blocks || null,
                meta: payload.meta || payload,
                sourceSite: req.sourceSite || "unknown",
                sourceTabId: req.sourceTabId || null, timestamp: Date.now()
              }, "*");
            }
            if (sendResp) sendResp({ success: true });
          }
          if (req.type === "EXT_TO_PAGE") {
            window.postMessage(req.payload, "*");
            if (sendResp) sendResp({ success: true });
          }
          if (req.type === "YOLO_PAIR_CODE" || req.type === "LLM_PAIRED" || req.type === "LLM_DISCONNECTED") {
            window.postMessage(req, "*");
            if (sendResp) sendResp({ success: true });
          }
        });
      }

      window.postMessage({ type: "AARDVARK_BRIDGE_READY" }, "*");

      var requestCode = function() {
        try {
          if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: "YOLO_GET_CODE" }, function(resp) {
              if (chrome.runtime.lastError) return;
              if (resp && resp.code) {
                window.postMessage({ type: "YOLO_PAIR_CODE", code: resp.code }, "*");
              } else {
                setTimeout(requestCode, 2000);
              }
            });
          }
        } catch(e) {}
      };
      setTimeout(requestCode, 1000);
    }

  _sendHandshake(source) {
    this._sendToBg({
      type: 'YT_Player_Status',
      data: {
        type: 'PLAYER_CONNECTED',
        sessionId: this.sessionId,
        url: window.location.href,
        source: source || 'TIMER',
      },
    });
  }

  _isContextValid() {
    try {
      return (
        typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id
      );
    } catch (e) {
      return false;
    }
  }

  _sendToBg(msg) {
    if (!this._isContextValid()) return;
    try {
      chrome.runtime.sendMessage(msg, (resp) => {
        if (chrome.runtime.lastError) {
          /* ignore */
        }
      });
    } catch (e) {
      /* ignore */
    }
  }


  static isAppReadyOnPage = false;
}

new PlayerBridge();

