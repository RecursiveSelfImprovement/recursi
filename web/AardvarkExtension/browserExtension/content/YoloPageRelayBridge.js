class YoloPageRelayBridge {
  static init() {
    if (window.__yoloPageRelayBridgeInstalled) return;

    const runtime = (typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null;
    if (!runtime || !runtime.sendMessage) {
      console.warn("[YoloPageRelayBridge] chrome.runtime unavailable");
      return;
    }

    window.addEventListener("message", (event) => {
      if (!event || event.source !== window) return;
      const msg = event.data;
      if (!msg || !msg.type) return;

      const isBridgeWrapped = !!msg.__YOLO_RELAY_BRIDGE;
      const isTargetRelayHello = msg.type === "YOLO_AGENT_HELLO";
      const isTargetRelayResponse = msg.type === "YOLO_RPC_RES_RELAY";

      if (!isBridgeWrapped && !isTargetRelayHello && !isTargetRelayResponse) return;

      const requestId = msg.requestId || ("relay_" + Date.now() + "_" + Math.random().toString(36).slice(2));
      let outbound = { type: msg.type, ...(msg.payload || {}) };

      if (msg.type === "YOLO_RPC_RES_RELAY" && msg.payload) {
        outbound = { type: "YOLO_RPC_RES_RELAY", payload: msg.payload };
      }

      try {
        runtime.sendMessage(outbound, (response) => {
          const err = runtime.lastError ? runtime.lastError.message : null;
          try {
            window.postMessage({
              __YOLO_RELAY_BRIDGE: true,
              type: "YOLO_RELAY_BRIDGE_CALLBACK",
              requestId: requestId,
              response: response,
              error: err
            }, "*");
          } catch (postErr) {
            console.warn("[YoloPageRelayBridge] callback post failed:", postErr);
          }
        });
      } catch (e) {
        console.warn("[YoloPageRelayBridge] runtime.sendMessage failed:", e);
        try {
          window.postMessage({
            __YOLO_RELAY_BRIDGE: true,
            type: "YOLO_RELAY_BRIDGE_CALLBACK",
            requestId: requestId,
            error: e.message
          }, "*");
        } catch (_) {}
      }
    });

    if (runtime.onMessage && runtime.onMessage.addListener) {
      runtime.onMessage.addListener((msg) => {
        if (!msg || !msg.type) return;
        if (
          msg.type === "YOLO_RELAY_READY" ||
          msg.type === "YOLO_RPC_RES_DELIVERY" ||
          msg.type === "YOLO_RPC_REQ_RELAY"
        ) {
          try {
            window.postMessage({ __YOLO_RELAY_BRIDGE: true, ...msg }, "*");
          } catch (e) {
            console.warn("[YoloPageRelayBridge] inbound post failed:", e);
          }
        }
      });
    }

    console.log("[YoloPageRelayBridge] installed");
  }

}

YoloPageRelayBridge.init();
