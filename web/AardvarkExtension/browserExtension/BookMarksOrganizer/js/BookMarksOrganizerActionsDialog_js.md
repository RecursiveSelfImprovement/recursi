# BookMarksOrganizerActionsDialog

The `BookMarksOrganizerActionsDialog` class manages the modal interface for the "Advanced Tools" and "Cleanup Wizard". It provides a focused environment for bulk operations and reviewing duplicate items.

## Core Responsibilities
- **Modal Management**: Instantiates and controls the lifecycle of a `DialogBox` overlay, preventing interaction with the main tree while advanced tasks are performed.
- **Cleanup Wizard UI**: Provides a landing page with distinct cards for different scan modes (Duplicate URLs, Strict Match, Name Duplicates).
- **Review Interface**: Renders a list of detected duplicate groups, allowing users to selectively uncheck items they wish to keep before executing a bulk delete.
- **Progress Indication**: Displays loading states and updates button counts dynamically as users select or deselect items for deletion.

## Key Methods
- `open(app)`: Initializes the dialog, injects the necessary strict-layout CSS, and mounts the initial landing UI.
- `_runScan(mode)`: Triggers the mutation layer to find duplicates based on the selected mode, swapping the UI to a loading state and then to the review list upon completion.
- `_renderReviewUi(groups, mode)`: Constructs the scrollable list of duplicate groups, generating checkboxes, icons, and path breadcrumbs for each affected bookmark.
- `_executeDelete(checkboxes)`: Collects the IDs from all checked items in the review list, passes them to the bulk deletion API, and closes the dialog upon success.