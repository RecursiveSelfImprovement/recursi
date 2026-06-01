# LlmHelper

The `LlmHelper` is a content script feature injected directly into AI chat interfaces (like ChatGPT, Claude, and Google AI Studio). It modifies the DOM of the LLM interface to add custom UI "shims" around code blocks and prompts, and establishes a bridge to send code directly back to the Aardvark YOLO system.

## Key Responsibilities

1. **DOM Scanning & Modification:** Uses `MutationObserver` and periodic intervals (`scan()`) to detect newly generated code blocks (`<pre>`) and user prompts. It wraps these in custom HTML "shims" that provide copy buttons, line counts, and collapsible toggles.
2. **YOLO Bridge Communication:** Communicates over `window.postMessage` to the extension background script (`_initExtensionBridge`), allowing the LLM tab to seamlessly pair with an active Aardvark YOLO tab.
3. **Teleportation:** Provides UI buttons (like the "r" magic button or "Paste All") that send extracted code block text directly to the paired YOLO tab for immediate execution or rendering.
4. **State Preservation:** Saves the expanded/collapsed state of individual code shims to `localStorage` so the UI remains consistent if the user refreshes the chat page.

## Core Methods

- **`scan()`**: Triggers `scanUserPrompts()`, `scanResponseGroups()`, and general `<pre>` tag detection, tagging elements with unique signatures (`dataset.recursiCcSig`).
- **`createShim(container, sourceElement, type)`**: Injects the customized header UI above a code block or prompt, hooking up the copy/teleport logic and CSS visibility toggles.
- **`_handleYoloCommand(payload)`**: Listens for RPC requests coming *from* the Aardvark YOLO app (e.g., `GET_BLOCKS`, `QUERY_DOM`, `PASTE_ALL_RESPONSE`) and executes them within the context of the LLM's DOM.
- **`copyResponseGroupCode(el, mode)`**: Extracts all raw code from a specific assistant response group and either copies it to the user's clipboard or "teleports" it via the extension bridge.