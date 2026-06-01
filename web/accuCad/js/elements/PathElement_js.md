# PathElement (Data Model)

`js/elements/PathElement.js` defines the data structure for multi-segment lines and polygons.

## Data Structure

1.  **Vertices vs Points**:
    *   **`points`**: A flat array of `[x, y, z]` coordinates. Used for bounding box calculations and standard snapping.
    *   **`vertices`**: A richer array of objects: `{ point: [x, y, z], radius: number }`. This stores the **fillet radius** for each corner specific to that vertex.

2.  **Persistence**:
    *   Implements `toJSON` and `fromJSON`. This is critical for the `FileUtilities` save/load system, ensuring that complex shapes with specific corner radii are preserved between sessions.

3.  **Geometric Metadata**:
    *   **`closed`**: Boolean flag indicating if the path forms a loop.
    *   **`updateDimensions`**: Calculates the Axis-Aligned Bounding Box (AABB). This is used by `ElementPickCommand` to optimize raycasting (though strictly speaking, raycasting currently checks all objects; AABB could be an optimization step).

## AccuDraw Context

The `points` array in this element is exactly what `TentativePointHandler` iterates over to find snap targets. The precision of AccuDraw directly populates these coordinates.