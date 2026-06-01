# Squircle3D (The Visual Compass)

`js/Squircle3D.js` defines the actual geometry of the AccuDraw compass. It is a specialized view class that draws a shape blending between a square and a circle.

## Visual Logic

1.  **Shape Generation**:
    *   Uses `ArcSquircleCalc` (or `BezierSquircleCalc`) to mathematically generate the path of a "squircle".
    *   **`squircleAmount`**: A value from 0 (Square) to 1 (Circle). This corresponds to the AccuDraw feature where the compass shape changes to indicate mode (Rectangular vs Polar) or status.

2.  **Coordinate Frame**:
    *   **`_computeTransformMatrix`**: This method is critical. It takes the `center` (origin) and `rotationMatrix` from the controller and builds the `THREE.Matrix4` that positions the compass in the scene.
    *   **Camera Offset**: It applies a slight offset towards the camera to prevent Z-fighting (flickering) when the compass is coincident with drawn geometry.

3.  **Rendering**:
    *   Creates two distinct objects: a semi-transparent **Mesh** (the fill) and a **Line** (the outline).
    *   Updates dynamically via the `update()` method, allowing smooth animations of color, size, and shape as the AccuDraw state changes.

## Relation to AccuDraw.js

`AccuDraw.js` is the high-level manager that owns an instance of `Squircle3D`. `AccuDraw.js` handles the animations and state triggers, while `Squircle3D.js` handles the low-level Three.js geometry construction.