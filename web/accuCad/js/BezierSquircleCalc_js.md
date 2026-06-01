<!-- 25% -->
# BezierSquircleCalc

`BezierSquircleCalc` is an alternative mathematical utility for generating a squircle shape. This implementation uses a series of eight cubic Bézier curves to approximate the shape, interpolating between a square and a circle.

### Core Philosophy

Like `ArcSquircleCalc`, this class is a pure, stateless calculator completely decoupled from any rendering logic. It encapsulates a different mathematical approach to generating the squircle. Instead of using true arcs, it leverages the well-known method of approximating a circle with Bézier curves, which provides a different aesthetic and can be simpler to represent as a single, continuous path.

<!-- 50% -->

### Primary API Usage

This class is instantiated by `Squircle3D` when its `mode` is set to 'bezier'.

-   `getPathData(t)`: The primary method. It takes the interpolation factor `t` (from 0 for a square to 1 for a circle) and returns a single, complete SVG path data string (`d="..."`) that can be parsed by `THREE.SVGLoader`.

<!-- 75% -->

### How It Works

1.  **Base Segment**: The calculation is based on defining a single 45-degree segment of the squircle using one cubic Bézier curve, and a second curve for the adjacent 45-degree segment.
2.  **Control Point Interpolation**: The positions of the four control points for each Bézier curve are defined mathematically. The interpolation factor `t` is used to move these control points between the positions that would form a sharp square corner and the positions that approximate a circular arc.
3.  **Rotation and Assembly**: The algorithm computes the transformed control points for the first two segments. It then programmatically rotates these segments by -90, -180, and -270 degrees to generate the other six segments needed to complete the full squircle.
4.  **Path String Construction**: It assembles the `M` (moveto) and `C` (curveto) commands and coordinates into a single SVG path string, which is then returned.