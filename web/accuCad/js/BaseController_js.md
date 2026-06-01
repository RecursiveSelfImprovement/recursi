# BaseController (Application State)

`js/BaseController.js` is the central state machine for AccuCad. Regarding AccuDraw, it acts as the "Logic Core" that maintains the drawing context.

## AccuDraw Logic & State

1.  **Coordinate System**:
    *   **`origin`**: A `[x, y, z]` array defining the center of the AccuDraw compass.
    *   **`rotationMatrix`**: A 3x3 matrix defining the orientation (X, Y, Z axes) of the drawing plane.

2.  **Constraints**:
    *   **`zPlaneLocked`**: A boolean flag. When true, user input is forced onto the plane defined by the origin and rotation matrix Z-axis. This is critical for maintaining 2D planar drawing within 3D space.

3.  **Integration Points**:
    *   **`setDrawingPlane(type)`**: Rotates the compass to standard views (Top, Front, Side).
    *   **`setOrigin(newOrigin)`**: Moves the compass to a new location. This often triggers animations in the `AccuDraw` visual instance.
    *   **`refreshMousePosition()`**: A utility to re-run the `EventHandlers` logic. This is vital when the drawing context (origin/rotation) changes via keyboard command, ensuring the cursor's projected position is updated immediately without moving the mouse.

## Interaction with EventHandlers

The `BaseController` does *not* perform the raycasting or point projection itself. Instead, it holds the configuration (`origin`, `rotationMatrix`, `indexEnabled`) that `EventHandlers` and `GeneratePoint` use to calculate the 3D cursor position.

## Future Porting Goals

To integrate the full AccuDraw logic from the typescript reference:
*   The state management for "Smart Locks" (X/Y axis locking, distance locking) will likely need to reside here or in a new dedicated `AccuDrawLogic` class that `BaseController` delegates to.
*   The logic for "Soft" vs "Hard" construction planes mentioned in the user prompt will need to interface with the `zPlaneLocked` property and `GeneratePoint` logic managed here.