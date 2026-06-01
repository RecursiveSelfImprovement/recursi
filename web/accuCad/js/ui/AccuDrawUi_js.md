# AccuDrawUi (Floating Interface)

`js/ui/AccuDrawUi.js` implements the floating, draggable DOM interface for AccuDraw. It displays the coordinate fields (X, Y, Z) and manages user interaction with them.

## Core Responsibilities

1.  **DOM Construction**:
    *   Dynamically builds the HTML structure for the AccuDraw widget, including the dragger handle (icon) and the input container.
    *   Injects necessary CSS styles (`_injectStyles`) to render the widget without external stylesheets.

2.  **Window Management**:
    *   **Draggable**: The widget can be moved around the screen using the icon handle.
    *   **Sticky/Clickable Mode**: Toggles between a compact "icon-only" mode (non-interactive inputs) and a full "expanded" mode where inputs are clickable and editable. This prevents the UI from blocking clicks to the canvas during drawing.

3.  **Input Management**:
    *   Creates `AccuDrawInput` instances for X, Y, and Z fields.
    *   `updateValues(values)`: A public method to programmatically update the displayed numbers in the fields.
    *   `setFocus(activeInput)`: Manages visual focus states, bringing the active input to the foreground.

## Key Methods

*   **`updateValues({x, y, z})`**: Updates the text in the input fields. Called by `AccuDraw.js` or external controllers.
*   **`toggleClickable()`**: Switches the `pointer-events` style of the container to allow or prevent mouse interaction with the inputs.
*   **`setPosition(x, y)`**: Moves the widget to a specific screen coordinate.

## Relationship with Legacy Code

This class appears to be a modern re-implementation or variation of `AccuDrawDialog.js`, specifically tailored for the `AccuDraw.js` visual manager. It focuses on the specific "floating icon" interaction model distinct from a standard dialog box.