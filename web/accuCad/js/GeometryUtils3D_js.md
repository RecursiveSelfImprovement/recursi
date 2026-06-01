<!-- 25% -->
# GeometryUtils3D

`GeometryUtils3D` is a static library of pure, stateless 3D vector and matrix math functions. It serves as the foundational mathematics engine for the entire AccuCad application, providing reliable and efficient implementations of common geometric calculations.

### Core Philosophy

This class is designed to be completely independent of the Three.js library. All operations are performed on plain JavaScript arrays representing vectors (`[x, y, z]`) and matrices (`[[...], [...], [...]]`). This approach has two key benefits:
1.  **Decoupling**: It keeps the core application logic separate from the rendering library. The math is portable and not tied to `THREE.Vector3` or `THREE.Matrix4` objects.
2.  **Performance**: It avoids the overhead of creating and garbage-collecting numerous Three.js objects in performance-critical loops, such as during mouse movement or animations.

<!-- 50% -->

### API Usage

As a static class, its methods are called directly.

```javascript
const p1 = [1, 0, 0];
const p2 = [5, 0, 0];
const p3 = [5, 3, 0];

// Create a unit vector from p2 to p1
const uv1 = GeometryUtils3D.makeUnitVector(p1, p2); // [-1, 0, 0]

// Create a unit vector from p2 to p3
const uv2 = GeometryUtils3D.makeUnitVector(p3, p2); // [0, 1, 0]

// Calculate the dot product
const dot = GeometryUtils3D.dotProduct(uv1, uv2); // 0

// Calculate the cross product
const cross = GeometryUtils3D.crossProduct(uv1, uv2); // [0, 0, -1]
```

<!-- 75% -->

### Key Method Categories

-   **Vector Operations**: Includes fundamental functions like `makeVector` (p1 - p2), `makeUnitVector` (normalizes a vector), `dotProduct`, `crossProduct`, `getMagnitude`, and `getDistance`.
-   **Matrix Operations**: Provides functions for `multiplyMatrices` and `makeRotationMatrix` (creates a 3x3 rotation matrix from an axis and an angle). It also includes `correctRotationMatrix`, a crucial utility to re-orthogonalize a matrix that may have accumulated floating-point errors, ensuring the X, Y, and Z axes remain perpendicular.
-   **Geometric Calculations**: Contains higher-level functions like `intersectRayPlane` for raycasting and `rotateVectorAroundAxis` (implements the Rodrigues' rotation formula) for arbitrary 3D rotations.