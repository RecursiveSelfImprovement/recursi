# EventHandlers (Input Interception Layer)

`js/EventHandlers.js` is the gateway for all user input. It is responsible for distinguishing between drawing commands, view manipulations, and special AccuDraw triggers like chords and tentative snaps.

## Core Responsibilities

1.  **Chord Detection (Tentative Snap)**:
    *   **Goal**: Implement the logic described by the user: *"hold down two buttons in a cord and that will do a tentative point"*.
    *   **Implementation**: The `handleMouseDown` method tracks `leftDownTime` and `rightDownTime`. If the second button is pressed within `chordThreshold` (50ms) of the first, it cancels the standard click action and triggers `TentativePointHandler.handleTentativePoint`.
    *   **Interaction**: This effectively overrides the standard "Left Click = Draw" and "Right Click = Reset" behavior when both are pressed simultaneously.

2.  **Modifier Key Handling**:
    *   **View Manipulation**: Detects `Alt` or `Meta` keys to delegate control to `ViewManipulator` (Orbit/Pan).
    *   **AccuDraw Snapping**: Detects `Shift` keys to trigger temporary snapping modes in `TentativePointHandler`.

3.  **Point Generation Integration**:
    *   On every `mousemove`, it calls `GeneratePoint.generate` to calculate the 3D world coordinate.
    *   It packages this 3D point, along with the raw event data, and passes it to the `ActiveCommand.onPoint` method. This ensures that drawing commands always receive "AccuDraw-corrected" coordinates (snapped to axes or planes) rather than raw screen pixels.

## Porting Notes

The current implementation uses a timer (`pendingClickTimer`) to wait for a potential chord. This adds a slight latency (50ms) to single clicks. As AccuDraw logic becomes more complex, this timing might need tuning to ensure responsiveness while reliably detecting chords.