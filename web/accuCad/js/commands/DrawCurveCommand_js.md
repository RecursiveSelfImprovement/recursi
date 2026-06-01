# DrawCurveCommand (Bezier Logic)

`js/commands/DrawCurveCommand.js` implements a 4-point cubic Bézier curve tool.

## Interaction Flow

1.  **Control Points**:
    *   Requires 4 sequential clicks: Start Anchor, Control Point 1, Control Point 2, End Anchor.
    *   **Visual Feedback**: Unlike the Path command, this command visualizes the *Control Polygon* (straight lines connecting the control points) differently from the *Curve* itself. This helps the user understand the underlying geometry.

2.  **Three.js Integration**:
    *   Uses `THREE.CubicBezierCurve3` to calculate the curve points.
    *   Uses `Line2` (fat lines) for rendering, consistent with the rest of the application.

3.  **AccuDraw Integration**:
    *   Like other commands, it consumes points from `onPoint`.
    *   *Future Enhancement*: A powerful AccuDraw feature is the ability to define control points relative to the anchor points using polar coordinates. Integrating AccuDraw's "distance/angle" locking would make drawing precise curves significantly easier.