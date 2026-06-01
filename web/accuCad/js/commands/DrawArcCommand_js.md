<!-- 25% -->
# DrawArcCommand

This class implements the drawing tool for creating circular arcs using a three-point method: start point, a point on the arc, and the end point.

### Core Philosophy

This command encapsulates the logic for a more complex, multi-click drawing operation. It demonstrates managing an ordered sequence of points and providing different types of visual feedback at each stage of the process (a line preview, then an arc preview). The core challenge it solves is calculating the 3D arc geometry from three arbitrary co-planar points.

<!-- 50% -->

### User Interaction Flow

1.  **First Click**: Sets the arc's start point (`edge1`).
2.  **Mouse Move**: A preview line is drawn from the start point to the cursor.
3.  **Second Click**: Sets a point that the arc will pass through (`center` in the code, though it's more of a mid-point on the curve).
4.  **Mouse Move**: An arc preview is now drawn, passing through the first two points and ending at the cursor.
5.  **Third Click**: Sets the arc's end point (`edge2`), finalizing the geometry.

<!-- 75% -->

### Method Details

-   `computeArcData(edge1, center, edge2)`: This is the core mathematical function. It takes the three 3D points and performs the following steps:
    1.  It defines a local 2D coordinate system on the plane created by the three points. The local X-axis (`u`) is the vector from the center to the first point. The local Y-axis (`v`) is perpendicular to both `u` and the plane's normal.
    2.  It projects the third point (`edge2`) onto this local 2D system.
    3.  In this 2D system, it's trivial to calculate the arc's `radius`, `startAngle` (which is 0), and `endAngle` (using `atan2`).
    4.  It returns these parameters along with the basis vectors (`u`, `v`) needed to reconstruct the arc in 3D space.
-   `updatePreviewArc(...)` / `finalizeArc()`: These methods use the data from `computeArcData` to generate the visual arc. They use `THREE.ArcCurve` with the calculated parameters to generate a set of 2D points, and then use the `u` and `v` basis vectors to transform these 2D points back into the correct 3D position and orientation.