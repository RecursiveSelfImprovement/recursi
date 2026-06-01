# ContentController

The `ContentController` operates within the content script context of the target webpage, acting as a crucial event bus between the isolated page environment and the extension's background worker.

## Key Responsibilities

1. **Window Message Forwarding:** Listens for `window.postMessage` events emitted by the webpage (e.g., `LLM_TO_YOLO`, `SET_GREEN_CIRCLE_BOOKMARK`) and safely forwards them to the background service worker using `chrome.runtime.sendMessage`.
2. **Runtime Message Handling:** Catches messages sent down from the background script (e.g., `YOLO_RESPONSE`) and posts them back into the window context so the page's JavaScript can react.
3. **Transient Notifications:** Provides a lightweight, auto-fading on-screen notification system (`showNotification`) to give users immediate feedback without needing complex UI libraries.

## Core Methods

- **`listenForRuntimeMessages()`**: Attaches a listener to the Chrome runtime to intercept commands directed at the content script.
- **`listenForWindowMessages()`**: Adds an event listener to the `window` object to capture specific application commands and bridge them to the extension backend.
- **`showNotification(text)`**: Creates, displays, and automatically fades out a simple DOM element to show brief alerts to the user.