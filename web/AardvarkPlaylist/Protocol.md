# Chrome Extension <-> Player App Protocol

This document defines the communication flow between the Browser Extension and the Recursi Player App (GlowTunes).

## Architecture

1.  **Background Service (`YouTubeService.js`)**: Central hub. Manages tab discovery and command queuing.
2.  **Content Bridge (`PlayerBridge.js`)**: Injected script acting as a relay between the Chrome Extension Context and the Web Page Context.
3.  **Web App (`YouTubePlayer.js`)**: The actual application logic running in the page.

---

## 1. Discovery & Handshake (The Startup Sequence)

To prevent command loss, the "Ready" state is strict.

1.  **Tab Open**: Extension opens `http://localhost:2500/...` or `https://sniplets.org/...`.
2.  **Bridge Load**: `PlayerBridge.js` runs. It generates a unique `sessionId`.
    *   It sends `BRIDGE_HEARTBEAT` to Background.
    *   *Note: Background sees this but DOES NOT flush commands yet.*
3.  **App Load**: `YouTubePlayer.js` initializes.
    *   It sets up `window.addEventListener('message')`.
    *   It posts `{ type: 'PLAYER_READY' }` to `window`.
4.  **Relay**: `PlayerBridge` catches `PLAYER_READY`, attaches `sessionId`, and forwards to Background.
5.  **Connection**: Background receives `PLAYER_READY`.
    *   Marks state as `CONNECTED`.
    *   Flushes queued commands (e.g., `ADD_VIDEO`).

---

## 2. Message Formats

### Extension to App (Command)
**Channel**: `chrome.tabs.sendMessage` -> `PlayerBridge` -> `window.postMessage`

```json
{
  "type": "YT_BRIDGE_TO_PAGE",
  "payload": {
    "type": "ADD_VIDEO",
    "videoId": "abc12345",
    "title": "Song Name",
    "playOnce": true,
    "msgId": "unique-id-for-ack"
  }
}