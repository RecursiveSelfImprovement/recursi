# DrawRectangleCommand (Primitive Tool)

`js/commands/DrawRectangleCommand.js` implements the standard Box/Rectangle tool.

## Logic Flow

1.  **State Management**:
    *   **Click 1**: Creates a temporary `RectangleElement` starting at the cursor.
    *   **Hover**: Updates the `end` point of the temporary element. Calls `renderVisual` to show a semi-transparent preview.
    *   **Click 2**: Finalizes the element. It checks `isFlatElement` to decide whether to create a 2D Plane or a 3D Box.

2.  **Geometry Generation**:
    *   **`computeGeometry`**: A static helper that calculates the Position, Rotation, and Size of the box based on the start/end points.
    *   **Orientation**: It intelligently rotates planes to match the drawing axes if the shape has zero thickness in one dimension.

## AccuDraw Context

This command relies heavily on `baseController.zPlaneLocked` (via `EventHandlers`). If Z-lock is on, the rectangle is drawn perfectly flat on the AccuDraw plane. If Z-lock is off and the user snaps to a 3D point, the rectangle becomes a 3D volume spanning that depth.