# BookMarksOrganizerTreeOps

The `BookMarksOrganizerTreeOps` class is a pure utility module dedicated to traversing, querying, and transforming bookmark tree data structures. It does not mutate Chrome bookmarks or handle UI rendering directly.

## Core Responsibilities
- **Data Normalization**: Converts the raw nested objects returned by `chrome.bookmarks.getTree()` into the cleaner, standard format used by the application.
- **Tree Traversal**: Provides generic methods for recursively walking through the bookmark tree arrays.
- **Statistics Generation**: Scans the loaded tree to count total folders, total bookmarks, disabled items, literal URLs, and occurrences of duplicate names or URLs.
- **Search Filtering**: Determines if a specific node or its descendants match the user's current search query, helping the UI decide which folders to auto-expand or hide.
- **Node Identification**: Generates unique signature keys for nodes to safely track their UI state (like open/closed folder status) even if their Chrome IDs shift.

## Key Methods
- `fromChromeTreeToData(treeArr)`: Takes the raw Chrome tree, normalizes properties (like ensuring `enabled` flags and resolving `url`), and returns a mapped structure.
- `computeStats(data)`: Walks the entire tree and returns a statistics object detailing counts and duplicate metrics.
- `walk(rootArray, fn)`: A recursive utility that executes a callback function `fn` on every node and folder in the provided tree array.
- `isMatch(node)`: Evaluates whether a given bookmark node matches the global search query based on its name (and optionally its URL).
- `subtreeHasMatch(node)`: Recursively checks if a folder contains any children that match the search query, which is used for auto-expanding folders during a search.