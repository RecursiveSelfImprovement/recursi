# BookMarksOrganizerMutations

The `BookMarksOrganizerMutations` class handles all operations that modify the actual Chrome bookmarks tree. It acts as the bridge between user intentions in the UI and the asynchronous `chrome.bookmarks` API.

## Core Responsibilities
- **CRUD Operations**: Manages the creation, renaming, moving, and deletion of individual bookmarks and entire folders.
- **Duplicate Management**: Scans the bookmark tree to identify duplicates (either exact URL matches globally, or exact name matches within the same folder) and provides automated cleanup routines.
- **State Synchronization**: After mutating the Chrome bookmarks, it ensures the application's internal state is refreshed so the UI stays in sync.
- **Bulk Actions**: Provides support for processing arrays of IDs to perform bulk deletions efficiently.

## Key Methods
- `deleteBookmark(node, parentFolderNode)`: Determines if a node is a folder or a bookmark, calls the appropriate Chrome removal API (`removeTree` or `remove`), and triggers a state refresh.
- `saveRename(node, newName)`: Updates the title of a bookmark in Chrome and exits the UI's inline editing mode.
- `completeMove(targetFolderNode)`: Takes the currently "moving" node and reparents it to the top index of the selected target folder.
- `scanForReview(mode)`: Performs a deep scan of the bookmark tree (by URL, name, or strict matching) to group duplicates together and returns them for the review UI.
- `deleteBookmarksBulk(ids)`: Accepts an array of bookmark IDs and executes concurrent removal operations, handling fallbacks if an ID points to a folder versus a single item.