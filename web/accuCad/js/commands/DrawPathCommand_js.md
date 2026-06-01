# DrawPathCommand (Command Consumer)

`js/commands/DrawPathCommand.js` is a prime example of a "Consumer" of the AccuDraw system. It demonstrates how a tool interacts with the points provided by the controller.

## AccuDraw Interaction

1.  **Point Ingestion**:
    *   The command receives `data.point` in the `onPoint` method.
    *   Crucially, it **does not know** if this point came from a mouse raycast, a grid snap, an axis lock, or a tentative snap. It simply trusts the `BaseController` and `EventHandlers` to provide the "correct" 3D coordinate.
    *   This abstraction allows us to upgrade the AccuDraw logic (e.g., adding Smart Locks) without rewriting every single drawing command.

2.  **Self-Snapping (`allowSelfSnap`)**:
    *   The command sets `this.allowSelfSnap = true`. 
    *   This flag is read by `TentativePointHandler`. It allows the user to snap to previous vertices of the *current* line being drawn, enabling the creation of closed loops or specific geometric relations within the active tool.

3.  **Fillet Logic**:
    *   It uses `RoundingUtils3D` to generate corners. This is a separate geometric operation from AccuDraw, but it relies on the precision of the input points that AccuDraw provides.

## Integration Note

When porting the "Soft Lock" feature (where moving the mouse *near* an axis locks it), this command will remain unchanged. The logic resides entirely in the input pipeline (`GeneratePoint`), and `DrawPathCommand` will simply receive the locked coordinate.