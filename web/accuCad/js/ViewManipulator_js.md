# ViewManipulator (Camera Logic)

`js/ViewManipulator.js` handles the "View Rotation" logic, which is distinct from, but interacts with, AccuDraw.

## Interaction with AccuDraw

1.  **Compass Stability**:
    *   When the user Pans or Orbits the camera using `ViewManipulator`, the AccuDraw compass (`originMarker`) effectively stays at its world coordinates.
    *   However, its *screen alignment* changes. 
    *   **Future Goal**: Implement the AccuDraw "Rotate View" (V) command. This would read the camera's new basis vectors from `threeDView.camera` and apply them to the AccuDraw `rotationMatrix`, aligning the drawing plane with the screen.

2.  **Input Conflict Management**:
    *   `EventHandlers.js` checks for modifier keys (Alt/Meta) before calling `ViewManipulator`.
    *   This separation ensures that view manipulation takes precedence over drawing, preventing accidental AccuDraw inputs while moving the camera.

3.  **Animation Interruption**:
    *   Calls `CameraOrbitAnimator.stop()` when manual control begins. This ensures the view doesn't fight against the user's input.