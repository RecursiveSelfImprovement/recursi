<!-- 25% -->
# DrawCircleCommand

This class implements the drawing tool for creating circles. The user defines the circle with two clicks: the first sets the center point, and the second sets a point on its radius.

### Core Philosophy

This command follows the standard two-point drawing pattern. It demonstrates how to create planar 2D shapes within the 3D environment by correctly orienting the geometry. A key aspect of its implementation is using the `baseController.rotationMatrix` to align the `THREE.CircleGeometry` with the active AccuDraw plane, ensuring the circle is drawn on the intended surface.

<!-- 50% -->

### User Interaction Flow

-   `onMouseDown(data)`: On the first click, it establishes the circle's center point. On the second click, it establishes the radius and calls `finalizeCircle()`.
-   `onMouseMove(data)`: Between the first and second clicks, it calls `updatePreviewShape` with the current cursor position to provide live feedback of the circle being drawn.
-   `createCircleVisual(centerArr, edgeArr, isPreview)`: This is the core rendering method. It calculates the radius from the center and edge points, creates a `THREE.CircleGeometry`, and crucially, uses a Quaternion to rotate it to match the orientation of the current drawing plane. It creates both a semi-transparent mesh and a solid outline.

<!-- 75% -->

### Implementation Notes

-   **Plane Alignment**: The most important piece of logic is the rotation calculation in `createCircleVisual`. It takes the Z-axis vector from the `baseController.rotationMatrix` (which is the normal of the AccuDraw plane) and creates a quaternion to rotate the default XY-plane circle geometry to match this normal. This ensures the circle is always drawn flat on the active compass plane.
-   **Data Model**: Unlike other commands, this one doesn't create a dedicated `CircleElement`. It uses a generic `Element` and stores the center point in the `points` array. The radius is implicitly defined by the geometry of the `threejsObject`.