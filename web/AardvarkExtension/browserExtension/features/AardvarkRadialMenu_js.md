# AardvarkRadialMenu

The `AardvarkRadialMenu` is a custom, animated, circular context menu that replaces the browser's default right-click menu when the Aardvark tool is active.

## Key Responsibilities

1. **Ergonomic Access:** Displays the most common Aardvark commands (Wider, Narrower, Isolate, Remove, Edit) in a ring around the cursor, minimizing mouse travel.
2. **Animation & Styling:** Uses CSS transforms and transitions to create a "dramatic" swooping entry animation on its first launch, and smooth scaling on subsequent opens.
3. **Selection Freezing:** Temporarily unhooks Aardvark's mouse-move listeners while the menu is open, ensuring the user doesn't accidentally change their selected element while trying to click a menu button.

## Core Methods

- **`openAt(clientX, clientY, items)`**: Injects the necessary CSS, freezes the current DOM selection, builds the menu nodes, clamps the center coordinates to ensure the menu doesn't clip outside the viewport, and triggers the opening animation.
- **`_renderItemsIntoRoot(root)`**: Mathematically distributes the requested action buttons around a circle (360 degrees / N items). It applies specific rotational transforms to ensure the text remains legible and faces the correct direction depending on which side of the circle it falls on.
- **`_buildHotLabel(item)`**: Parses the action label to highlight the keyboard shortcut letter (e.g., the 'R' in Remove), making it large and gold, while keeping the rest of the text small.