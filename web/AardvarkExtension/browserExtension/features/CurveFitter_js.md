# CurveFitter

The `CurveFitter` is a purely mathematical utility class used to convert a series of raw, jagged 2D points (e.g., a mouse drawing trail) into smooth, optimized cubic Bezier curves. It implements Philip J. Schneider's algorithm for fitting Bezier curves to digitized data.

## Key Responsibilities

1. **Path Smoothing:** Transforms raw pixel coordinate arrays into mathematically smooth cubic Bezier definitions (`[p0, cp1, cp2, p3]`).
2. **Error Tolerance:** Uses a recursive splitting mechanism. If a fitted curve deviates from the original points by more than `maxError`, the algorithm splits the points at the highest error location and fits two separate curves.
3. **Parameterization:** Uses chord-length parameterization and Newton-Raphson root finding to accurately map the raw input points onto the generated parametric curve `$q(t)$`.

## Core Methods

- **`fit(points, maxError)`**: The main public entry point. Filters out duplicate consecutive points, calculates the starting and ending tangents, and kicks off the recursive cubic fitting process.
- **`fitCubic(...)`**: The recursive heart of the algorithm. Generates a Bezier curve, evaluates its max error, and either returns the successful curve or splits the data array in half and recurses.
- **`generateBezier(...)`**: Uses least-squares fitting to calculate the optimal inner control points (`cp1` and `cp2`) for a given set of parameters and tangents.
- **Math Helpers**: Contains static implementations for vector math (`dot`, `normalize`, `subtract`) and Bezier evaluations (`bezier_q`, `bezier_qprimeprime`).