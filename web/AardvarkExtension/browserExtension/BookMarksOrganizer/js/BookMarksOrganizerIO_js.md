# BookMarksOrganizerIO

The `BookMarksOrganizerIO` class manages all file input/output operations, clipboard interactions, and special security features (the Incognito Vault) for the Bookmarks Organizer.

## Core Responsibilities
- **Exporting Data**: Triggers the background script to serialize and download the entire bookmark tree as a `.json` file.
- **Importing Data**: Provides a file picker interface for users to upload a `.json` backup. It reads the file and communicates with the background script to completely overwrite and restore the Chrome bookmark tree.
- **Incognito Vault**: Manages a special hidden bookmark folder named "Incognito". It communicates with the background script to lock (serialize to storage and delete from the tree) or unlock (require a password and restore to the tree) this vault.
- **Clipboard Management**: Provides a robust fallback mechanism for copying text (like bookmarklet JavaScript code) to the system clipboard.

## Key Methods
- `exportBookmarks()`: Sends a `saveBookmarks` message to the background service worker.
- `importBookmarks()`: Creates a hidden `<input type="file">`, reads the selected JSON file, and dispatches a `restoreBookmarks` message to apply the backup.
- `toggleVault()`: Checks if the "Incognito" vault is currently open in Chrome. If open, it locks it; if closed, it prompts for a password to unlock it.
- `copyTextToClipboard(text)`: Attempts to use the modern `navigator.clipboard` API, falling back to a hidden `<textarea>` and `document.execCommand('copy')` if necessary.