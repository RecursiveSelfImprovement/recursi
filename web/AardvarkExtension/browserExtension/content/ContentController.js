class ContentController {
  constructor() {
    this.notificationId = 'bookmarkExtensionNotification';
  }

  init() {
    this.listenForRuntimeMessages();
    this.listenForWindowMessages();
  }

  listenForRuntimeMessages(...args) {
    try {
      if (!this._isValid()) return;
      chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.type === "showNotification") {
          this.showNotification(request.text);
        }
        if (request.type === "YOLO_RESPONSE") {
          window.postMessage({
            type: "YOLO_RESPONSE",
            payload: request.payload
          }, "*");
        }
        if (request.type === "YOLO_RPC_REQ") {
          // Relay an RPC from YOLO into the target MAIN world
          window.postMessage({
            type: "YOLO_RPC_REQ_RELAY",
            payload: request.payload
          }, "*");
        }
      });
    } catch(e) {}
  }

  listenForWindowMessages(...args) {
    var self = this;
    window.addEventListener("message", function(event) {
      if (event.source !== window || !event.data || !event.data.type) return;
      var t = event.data.type;

      if (t === "SET_GREEN_CIRCLE_BOOKMARK") {
        if (!self._isValid()) return;
        chrome.runtime.sendMessage({
          action: "updateGreenCircleBookmark",
          url: event.data.url
        });
      }

      if (t === "YOLO_RPC_RES_RELAY") {
        // MAIN world (YoloTargetAgent) is answering. Forward to background for delivery to YOLO tab.
        if (!self._isValid()) return;
        try {
          chrome.runtime.sendMessage({
            type: "YOLO_RPC_RES",
            payload: event.data.payload
          }, function() { if (chrome.runtime.lastError) {} });
        } catch(e) {}
        return;
      }
      if (t === "YOLO_AGENT_HELLO") {
        // MAIN world YoloTargetAgent is announcing itself. Tell background so it can route to this tab.
        if (!self._isValid()) return;
        try {
          chrome.runtime.sendMessage({
            type: "YOLO_AGENT_REGISTER",
            href: location.href
          }, function() { if (chrome.runtime.lastError) {} });
        } catch(e) {}
        return;
      }

      if (t === "LLM_TO_YOLO" || t === "YOLO_STATUS_QUERY" || t === "LLM_PAIR_REQUEST") {
        if (!self._isValid()) return;
        try {
          chrome.runtime.sendMessage(event.data, function(resp) {
            if (chrome.runtime.lastError) return;
            window.postMessage({
              type: t + "_RESPONSE",
              requestId: event.data.requestId || null,
              response: resp
            }, "*");
          });
        } catch(e) {}
      }
    }, false);
  }

  showNotification(text) {
    // Remove existing if present
    const existing = document.getElementById(this.notificationId);
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = this.notificationId;
    notification.textContent = text;
    document.body.appendChild(notification);

    // Show and then hide
    setTimeout(() => {
      notification.style.opacity = 0;
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  _isValid(...args) {
      try {
        return typeof chrome !== "undefined" && chrome.runtime && !!chrome.runtime.id;
      } catch(e) {
        return false;
      }
    }

}
