# ElementOperations.js (Modification Toolkit)

`js/ElementOperations.js` provides static methods for modifying existing elements in the scene.

## Key Functions

1.  **Destructive Actions**:
    *   **`deleteElement`**: Removes the element from both the `cadElements` array (data model) and the Three.js scene (visual model).

2.  **Visual Modifications**:
    *   **`wireframeElement`**: Converts a solid mesh into a wireframe or edges-only view. This uses `THREE.EdgesGeometry` for clean CAD-like outlines.
    *   **`applyMaterials`**: Replaces the material of an object (e.g., imported GLB) with standard CAD materials.

3.  **Geometric Operations**:
    *   **`bisectElement`**: A complex algorithm that slices a mesh along a plane. This is a prototype for boolean operations.

## Future AccuDraw Integration

Currently, these operations are triggered via keyboard commands on selected objects. In the future, AccuDraw could provide the inputs for these operations (e.g., defining the cut plane for `bisectElement` using the compass orientation).