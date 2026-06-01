<!-- 25% -->
# RoundingUtils3D

`RoundingUtils3D` is a static library of pure geometric functions for calculating 2D/3D fillets (rounded corners). It is a key component of the `DrawPathCommand`, enabling it to create paths with smooth, curved corners instead of sharp angles.

### Core Philosophy

Similar to `GeometryUtils3D`, this is a pure math library that is completely decoupled from Three.js. It operates on plain JavaScript arrays representing points and vectors. Its purpose is to encapsulate the complex trigonometry and vector math required to determine the precise geometry of an arc that can smoothly connect two line segments at a corner.

<!-- 50% -->

### Primary API Usage

This utility is used exclusively by the `DrawPathCommand`'s `generateFinalPoints` method.

1.  `getRoundingData(v1, v2, v3)`: This is the main calculation function. It takes three vertices, where `v2` is the corner to be rounded, and `v2.radius` specifies the desired fillet radius. It returns a data object containing everything needed to draw the arc: the `circleCenter`, the `tangentPoint1` (where the arc starts on the `v1-v2` segment), `tangentPoint2` (where the arc ends on the `v2-v3` segment), and the `radius`.

2.  `createArcPoints(...)`: This function takes the data object from `getRoundingData` and generates an array of 3D points that lie along the calculated arc, which can then be used to construct the final line geometry.

<!-- 75% -->

### How It Works

-   **`getRoundingData`**: The core of this function is a classic geometric construction:
    1.  It calculates the two unit vectors that form the corner (`p1-p2` and `p3-p2`).
    2.  It finds the angle bisector of these two vectors.
    3.  Using trigonometry (`radius / sin(halfAngle)`), it determines how far to travel along the bisector from the corner point (`p2`) to find the center of the fillet circle.
    4.  Once the circle center is known, it projects this center point back onto the original line segments to find the exact tangent points where the arc should begin and end.
    5.  It includes a crucial safety check (`isPointOnLineSegment3D`) to ensure the calculated arc fits within the existing line segments. If the radius is too large, it returns `null`, and a sharp corner is drawn instead.

-   **`createArcPoints`**: This function uses the `THREE.ArcCurve` helper to generate the points along the arc in a local 2D coordinate system defined by the arc's plane, and then transforms these 2D points back into 3D world space.