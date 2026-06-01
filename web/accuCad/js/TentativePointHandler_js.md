# TentativePointHandler (Snap System)

`js/TentativePointHandler.js` implements the "Tentative Point" logic, which allows the user to snap to existing geometry, effectively overriding the default AccuDraw plane.

## Core Responsibilities

1.  **Snap/Tentative Logic**:
    *   Activated via Modifier Keys (currently Shift).
    *   Performs a raycast against scene objects (meshes, lines).
    *   Finds the closest vertex or edge to the cursor.

2.  **Z-Lock Interaction**:
    *   The user prompt states: *"that's something that we use in accudraw to indicate that they explicitly chose a 3d depth... so that will pull it off the accudraw plane"*.
    *   This handler implements that behavior. When a snap is found (`_tentativeOriginalPoint`), it is a true 3D point on the target object.
    *   However, if `zPlaneLocked` is active in `BaseController`, this handler *also* calculates a projection back onto the AccuDraw plane (`_tentativeProjectedPoint`) and draws a guideline (`tentativeProjectionLine`) connecting the two.

3.  **Visual Feedback**:
    *   Creates a temporary marker (yellow sphere) at the snap location.
    *   Highlights the target element.

## Future Porting Goals

*   **Chord Input**: The user mentioned *"hold down two buttons in a cord and that will do a tentative point"*. Currently, this is triggered by Shift. The input handling in `EventHandlers.js` needs to detect the Left+Right mouse button chord and trigger this handler.
*   **Snap Modes**: The current implementation finds the closest vertex. The full AccuDraw system likely supports Nearest, Midpoint, Intersection, etc. This logic would reside here.