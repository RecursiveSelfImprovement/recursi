# ArcSquircleCalc (Geometry Generator)

`js/ArcSquircleCalc.js` is the mathematical backend for the `Squircle3D` visual component. It is responsible for generating the precise path of the AccuDraw compass shape.

## Core Logic

1.  **Squircle Interpolation**:
    *   It doesn't just draw a circle or a square; it calculates a shape that morphs between them based on the `t` parameter (0 to 1).
    *   This relates to the AccuDraw feature where the compass shape changes (Rectangular = Box, Polar = Circle) to visually indicate the current input mode.

2.  **Pure Math Implementation**:
    *   It calculates tangent points and arc centers to create a continuous, smooth curve.
    *   **`getArcSegments`**: Returns a structured list of lines and arcs. This is critical for `Squircle3D` to build the geometry using `THREE.Shape`.

3.  **Independence**:
    *   This class has zero dependencies on Three.js or the DOM. It is a pure logic class, making it robust and easy to test in isolation.

## Relevance to Porting

While the AccuDraw logic port focuses on state and constraints, this file ensures the *visual feedback* matches the high quality of the reference system. The smooth transition between shapes is a key subtle cue for the user.