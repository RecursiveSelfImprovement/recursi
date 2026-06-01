# js/lib/DialogBox.js

## Overview

`DialogBox` is a feature-rich, standalone UI component for creating draggable, resizable, and closeable dialog windows. It is used by the `Debug` panel to create the group inspector windows. It has no dependencies on the rest of the game's logic.

## Features

- **Draggable and Resizable:** Users can move the dialog by its title bar and resize it from any corner.
- **Window Management:** Manages z-index to ensure the most recently interacted-with dialog appears on top.
- **Iframe Handling:** Includes a clever mechanism (`showIframeCovers`) to place transparent overlays over iframes during drag/resize operations, preventing the mouse from losing capture.
- **Customization:** Can be instantiated with options for title, size, position, content, and colors.
- **Controls:** Comes with built-in buttons for closing the dialog, toggling transparency, and moving the title bar to the bottom.