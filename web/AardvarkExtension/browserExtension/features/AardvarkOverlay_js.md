# AardvarkOverlay

The `AardvarkOverlay` class manages the visual feedback layer of the Aardvark tool. It creates and positions non-interfering UI elements to communicate state and selection to the user.

## Key Responsibilities

1. **Element Highlighting:** Draws a red bounding box (`aardvark_highlight`) around the currently hovered element and displays a yellow tooltip (`aardvark_infoElement`) containing its tag name, ID, and primary class.
2. **Status & Help UI:** Creates the floating status panel (with the Aardvark mascot) and the keyboard shortcut cheat sheet (`showHelp`).
3. **Toast Notifications:** Provides a non-blocking, auto-fading toast system (`showToast`) for rapid feedback (e.g., "Copied", "Selection Locked").
4. **Dormant State:** Manages the small, semi-transparent icon (`showDormantIcon`) that lingers in the corner of the screen when Aardvark is quit, allowing the user to easily wake it back up.

## Core Methods

- **`highlightElement(element)`**: Calculates the bounding client rect of the target and overlays an absolute-positioned div. Inherits the target's `borderRadius` for a seamless fit.
- **`positionInfoElement(element)`**: Smartly positions the yellow info tab above or below the bounding box to ensure it never renders off-screen, applying specific border-radius tweaks to make it look physically attached to the highlight box.
- **`setDataStyleExclude(element)`**: A utility method that flags Aardvark's own UI elements with a specific attribute, ensuring the mouse tracker ignores them and prevents recursive selection loops.