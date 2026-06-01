# BookMarksOrganizerActiveItem

The `BookMarksOrganizerActiveItem` class manages a specialized "Active Bookmark" feature. This feature creates a dynamic, animated bookmark on the Chrome Bookmarks Bar that acts as a visual status indicator or a quick-access target.

## Core Responsibilities
- **Dynamic Bookmark Creation**: Ensures a specific, identifiable bookmark exists at the very top of the user's Bookmarks Bar.
- **Title Animation**: Runs an interval loop to update the title of the active bookmark with shifting emoji patterns (e.g., 🔴🟢🔵), creating a visual animation effect directly in the Chrome UI.
- **State Preservation**: Remembers the original name and parent folder of a bookmark if the user promotes an existing bookmark to be the "Active" one, allowing it to be safely restored later.
- **Cleanup**: Sweeps the Bookmarks Bar for orphaned or duplicated animated bookmarks and removes them to prevent clutter.

## Key Methods
- `activateBookmark(node)`: Promotes a specific bookmark to the active slot, moving it to index 0 of the Bookmarks Bar, saving its original state, and kicking off the animation.
- `restoreBookmark(id, originalName, originalParentId)`: Halts the animation for a given bookmark, restores its original text title, and moves it back to its original folder.
- `tickActiveBookmark()`: The core animation frame function that calculates the current emoji frame based on the system clock and updates the Chrome bookmark title.
- `ensureToolbarId()`: A utility method that reliably determines the internal ID of the "Bookmarks Bar" across different Chrome profiles and operating systems.