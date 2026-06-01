# GeneratePoint (Coordinate Projection Engine)

`js/GeneratePoint.js` contains the fundamental geometric engine for AccuDraw: calculating exactly where in 3D space the cursor is pointing, given the current constraints.

## Core Responsibilities

1.  **Ray-Plane Intersection**:
    *   It casts a ray from the camera through the mouse coordinates.
    *   It intersects this ray with the **AccuDraw Plane**, defined by the `origin` and `planeNormal` (Z-axis of `rotationMatrix`).
    *   This logic corresponds to the user's description: *"normally projects visually onto it [the drawing plane]"*.

2.  **Axis Indexing (Smart Locking)**:
    *   **`indexEnabled`**: When true, the function transforms the projected point into the *local coordinate system* of the compass.
    *   It checks if the point is within `indexTolerance` of the local X or Y axes.
    *   If close enough, it "snaps" the coordinate to 0 on that local axis and transforms back to world space. This provides the "magnetic" feel of axis locking.

3.  **Output Data**:
    *   Returns `indexedPoint` (the final constrained 3D point) and `indexedToAxis` (flags indicating if X or Y was locked).

## Role in the Porting Process

This function currently implements the "Soft Plane" logic described in the prompt. To fully implement the Bentley reference logic:
*   It needs to handle **Distance Locking** (constraining the point to a specific radius from the origin).
*   It needs to integrate with the "Smart Lock" system (where hitting Enter locks an axis permanently until unlocked).
*   The distinction between "Soft" and "Hard" construction planes will likely be implemented here by conditionally bypassing the plane projection if a "Hard" snap (like a 3D object snap) occurs elsewhere.