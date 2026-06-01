# ModelLoader (External Assets)

`js/ModelLoader.js` manages the importation of external 3D files (GLB/GLTF) into the drawing environment.

## Responsibilities

1.  **Compression Support**:
    *   Configures `DRACOLoader` to handle compressed geometry, which is standard for modern web 3D assets.
    *   This is a "Global Project" dependency that must be initialized correctly in `Main.js`.

2.  **Normalization**:
    *   **Auto-Scaling**: When a model is loaded, this class calculates its bounding box and automatically scales/translates it to fit within a standardized unit box (or a specific target volume).
    *   **Why**: Imported models often have wild scales (meters vs millimeters). This logic ensures they appear "on the table" and are immediately usable/snappable.

3.  **Snapping Integration**:
    *   The loaded models populate `baseController.loadedModelGroup`.
    *   `TentativePointHandler` is designed to traverse this group. Since imported meshes don't have structured `PathElement` data, the handler falls back to mesh-based raycasting to allow AccuDraw to snap to vertices on imported geometry.