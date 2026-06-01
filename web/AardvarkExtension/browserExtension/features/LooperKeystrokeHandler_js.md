# LooperKeystrokeHandler

The `LooperKeystrokeHandler` is a specialized keyboard event manager designed specifically for the Video Looper application. It handles routing keystrokes to specific commands, managing input modes, and displaying visual feedback.

## Key Responsibilities

1. **Key Binding & Routing:** Maps single keys or key ranges (e.g., `0-9`) to specific callback functions, automatically preventing default browser behavior.
2. **Mode Management:** Supports "Modes" (like a volume adjustment mode). When a mode is active, only keystrokes registered to that mode are processed, allowing keys to be temporarily repurposed.
3. **Visual Feedback:** Renders a centered, transient, styled popup (`keystroke-popup`) that flashes the name of the command and the key pressed whenever an action is triggered.
4. **Input Sanitization:** Includes logic to ignore key presses if the user is typing inside an input field or content-editable area.

## Core Methods

- **`addHandler(command, callback)`**: Registers a new command. Can accept a simple string (with `&` indicating the hotkey, e.g., `P&lay`) or an object defining key ranges and popup suppression.
- **`enterMode(modeName)` & `exitMode()`**: Switches the handler into a specific context, intercepting keystrokes exclusively for that mode until exited (often via the `Escape` key).
- **`showPopup(displayText)`**: Constructs and animates the transient on-screen notification showing which command was just executed.