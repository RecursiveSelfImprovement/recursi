# BookMarksOrganizerUI

The `BookMarksOrganizerUI` class is responsible for all DOM manipulation, CSS injection, and event binding for the Bookmarks Organizer interface. It acts as the presentation layer, completely separated from the data management and Chrome API logic.

## Core Responsibilities
- **Application Shell**: Constructs the main layout, including the top bar, theme selector, search inputs, and the scrolling container for the bookmark tree.
- **Tree Rendering**: Dynamically generates DOM elements for folders and bookmarks based on the current state, handling indentation, icons, and nested structures.
- **Theming & Styling**: Injects the base CSS required for the application and applies CSS variables for dynamic theme switching (e.g., Slate, Paper, Midnight).
- **Context Menus & Interactivity**: Creates and positions custom right-click context menus, handles inline renaming inputs, and manages click-to-copy functionality for bookmarklet code.

## Key Methods
- `renderShell()`: Builds the static HTML scaffolding for the application and appends it to the root element.
- `renderTree()`: Clears the current tree container and recursively renders the visible nodes based on search filters and folder states.
- `makeNode(node, ctx)`: Generates the specific DOM element (a `<details>` summary for folders, or a stylized row for bookmarks) representing a single node in the tree.
- `showContextMenu(e, node, parentRef)`: Calculates the mouse position and displays a custom floating menu with actions like Rename, Move, and Delete.
- `applyThemeVars()`: Maps the selected theme name to specific color hex codes and updates the CSS custom properties on the document root.