# PlayerBridge

The `PlayerBridge` is a specialized content script injected into target web pages (like `localhost:7002` or `sniplets.org`). It acts as an essential communication relay between the isolated webpage environment and the secure Chrome Extension background worker.

## Key Responsibilities

1. **Context Bypassing:** Web pages cannot directly call `chrome.runtime.sendMessage`. The bridge listens for `window.postMessage` events emitted by the page's JavaScript and forwards them to the extension via the Chrome API.
2. **LLM to YOLO Routing:** Facilitates the RPC (Remote Procedure Call) pipeline. When an LLM helper needs to send code or commands to a YOLO development tab, this bridge catches the incoming extension message (`LLM_CODE_DELIVERY`) and posts it into the YOLO page DOM.
3. **Connection Handshakes:** Manages the pairing codes and session IDs used to uniquely link a specific AI chat tab to a specific local development tab.

## Core Methods

- **`init()`**: Sets up the bidirectional event listeners. It captures `PLAYER_READY` and `SYNC_PLAYLIST` from the page and passes them to the background, while simultaneously listening for `YT_BRIDGE_TO_PAGE` messages from the background to push into the page.
- **`_isContextValid()`**: A safety check to ensure the script is running within a valid extension context (preventing crashes if the extension was reloaded or disabled).
- **`_sendHandshake(source)`**: Dispatches the initial `PLAYER_CONNECTED` status to the background worker upon load, registering the page's session ID and URL.