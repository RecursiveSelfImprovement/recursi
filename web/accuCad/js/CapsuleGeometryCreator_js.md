# CapsuleGeometryCreator (Geometry Engine)

`js/CapsuleGeometryCreator.js` is a dedicated geometry generator that constructs 3D capsule shapes (cylinders with hemispherical ends) oriented between two arbitrary points in space.

## Core Logic

1.  **Base Geometry**: 
    *   Generates a "canonical" capsule aligned along the Y-axis centered at the origin.
    *   Constructed efficiently using mathematical loops to generate vertices for the cylinder body and the spherical caps.

2.  **Transformation (The "Hard" Part)**:
    *   **`applyTransformations`**: Takes the start and end points provided by the user.
    *   Calculates the midpoint (translation) and the direction vector (rotation).
    *   **`adjustRotationMatrix`**: Uses vector math (cross products and dot products) to calculate a rotation matrix that aligns the canonical Y-axis capsule with the user's desired start/end vector. This is a manual implementation of "LookAt" logic or Quaternion rotation.

3.  **Independence**:
    *   Like `Squircle3D`, this class generates raw vertex data arrays. It converts them to `THREE.BufferGeometry` only at the very end (`toThreeJS`).
    *   This decoupling allows for easier testing and potential reuse in environments where a full Three.js scene graph isn't available immediately.

## Relevance to AccuDraw

This class exemplifies how to handle **oriented geometry**. AccuDraw is fundamentally about defining an oriented plane. The math used here to align a capsule (Cross Product for axis, Dot Product for angle) is the same math needed to implementing the `rotateToElement` (RE) AccuDraw command.