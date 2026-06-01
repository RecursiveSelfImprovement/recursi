# LlmHelperUI

The `LlmHelperUI` manages the visual interface injected into LLM chat pages (e.g., ChatGPT, Claude) by the `LlmHelper`. It provides the floating "recurs" widget, connection pairing controls, and the "Block Manager" dialog.

## Key Responsibilities

1. **Floating Widget:** Creates a draggable, persistent on-screen widget that displays the connection status to the Aardvark YOLO system. It animates when data is transferring.
2. **WebRTC/WebSocket Pairing:** Manages the UI for the pairing handshake, allowing users to input a 3-character code to link their LLM tab to a specific YOLO development environment.
3. **Block Manager:** Provides a dialog ("Manager") that lists all captured code blocks and prompts currently in the chat, allowing the user to quickly scroll to them, copy them, or toggle their inclusion in telemetry.
4. **Output Mirroring:** Displays the `YOLO` dialog, which mirrors console output, execution results, and errors sent back from the connected Aardvark environment.

## Core Methods

- **`createWidget()`**: Injects the floating draggable logo, "Manager" button, "Paste" button, and the connection pairing input fields into the DOM.
- **`refreshManagerContent()`**: Rebuilds the Block Manager list by iterating over the `LlmHelper`'s document map, categorizing blocks by "User" or "Assistant", and rendering them with line counts and copy buttons.
- **`updatePairingState(state)`**: Updates the visual indicators (dots, colors, error messages) on the widget based on the current YOLO bridge connection status.
- **`_showOutputMirror(...)`**: Opens a dedicated dialog box to stream and format remote execution logs and responses coming back from the YOLO bridge.