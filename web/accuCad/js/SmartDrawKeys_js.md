# SmartDrawKeys (Command Mapping)

`js/SmartDrawKeys.js` maps keyboard shortcuts to AccuDraw and Controller actions. It serves as the interface for the "Shortcut" system mentioned in the reference (e.g., `AccuDrawShortcuts` in `AccuDrawTool.ts`).

## AccuDraw Specific Commands

1.  **Plane Rotation**:
    *   `T` (Top), `F` (Front), `S` (Side): Calls `baseController.setDrawingPlane()`. This mimics the standard AccuDraw rotation shortcuts.
    *   **Missing**: `V` (View Rotation), `E` (Element Rotation), `RX` (Rotate Axis).

2.  **Origin Control**:
    *   `O` (Set Origin): Moves the compass to the cursor location. Supports snapping via `TentativePointHandler`.

3.  **Axis Locking**:
    *   `X`, `Y`, `Z`: Intended to lock axes. Currently, `Z` toggles `zPlaneLocked`. `X` and `Y` are placeholders returning status text.
    *   **Porting Goal**: Connect `X` and `Y` to the `AccuDrawUi` input fields to trigger the "Smart Lock" (soft lock by distance/direction) described in the prompt.

4.  **Compass Configuration**:
    *   `AccuDraw Size #0-9`: Scales the visual compass.

## Integration Logic

This file acts as the bridge between the user's keyboard and the `BaseController`. It does not contain the math, but it orchestrates the state changes that trigger the math in `GeneratePoint` or the animation in `AccuDraw.js`.