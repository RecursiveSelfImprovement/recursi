# BookMarksOrganizer

The `BookMarksOrganizer` class serves as the main orchestrator for the bookmark management application. It acts as the central hub that initializes the UI and delegates domain-specific logic to its sub-modules.

## Core Responsibilities
- **Application Bootstrapping**: Attaches the application to the DOM and sets up global event listeners (e.g., global delete key handling).
- **State Management**: Maintains the global application state, including the search query, active node selections, folder open/close states, and the current UI theme.
- **Data Loading**: Interfaces directly with the Chrome Bookmarks API to fetch the live bookmark tree and trigger renders.
- **Module Delegation**: Instantiates and delegates tasks to specialized sub-modules (`BookMarksOrganizerIO`, `BookMarksOrganizerTreeOps`, `BookMarksOrganizerMutations`, `BookMarksOrganizerActiveItem`, and `BookMarksOrganizerUI`).

## Key Methods
- `init(targetElement)`: Mounts the application to the given DOM element, loads persistence data from `chrome.storage.local`, applies the theme, and requests the initial Chrome bookmarks fetch.
- `_loadFromChromeBookmarks()`: Fetches the raw tree from Chrome, maps it to the internal data structure, and triggers a full tree and statistics render.
- `_refreshFromChrome()`: Reloads the bookmarks from Chrome and cleans up stale folder states (removing toggle states for folders that no longer exist).
- `updateStatus(message, kind)`: Proxies status bar updates to the UI layer.