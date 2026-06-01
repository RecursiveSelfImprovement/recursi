<!-- 25% -->
# DrawCapsuleCommand

This class implements the drawing tool for creating 3D capsule primitives. A capsule is a cylinder with hemispherical caps at each end, defined by a start point, an end point, and a radius.

### Core Philosophy

This command provides a simple and intuitive two-click workflow for creating a common 3D shape. It demonstrates how the interactive CAD system can be extended to 3D primitives. A key aspect of its philosophy is the decoupling of its main geometry (the start and end points) from a secondary parameter (the radius). The radius is controlled by `baseController.commandControlValue`, making it easy to adjust interactively with a MIDI controller's rotary encoder before the second click finalizes the shape.

### Primary API Usage

The command is activated by the `BaseController`. User interaction is a simple two-click process:

1.  **First Click**: Sets the start point of the capsule's central axis.
2.  **Second Click**: Sets the end point of the axis, finalizing the capsule's creation.

Between the first and second clicks, the capsule is rendered in a semi-transparent preview state that follows the mouse cursor.

<!-- 50% -->

### User Interaction Flow

-   `onMouseDown(data)`: Manages the two-click state. On the first click, it creates a temporary `CapsuleElement`, sets its start point, and reads the initial radius from `baseController.commandControlValue`. On the second click, it sets the final end point and calls `finalizeCapsule()` before resetting.
-   `onMouseMove(data)`: If one point has been placed, this method calls `updatePreview()` with the current cursor position as the tentative end point.
-   `updatePreview(endPoint)`: This is the core of the interactive feedback. It updates the `end` point of the `tempElement`, re-reads the `radius` from the controller, and calls `renderVisual()` to create and display the preview geometry (`this.previewShape`).
-   `finalizeCapsule()`: This method is called on the second click. It transitions the `tempElement` from a temporary state to a permanent one and calls `renderVisual()` to create the final, opaque version of the capsule's `threejsObject`.

<!-- 75% -->

### Method and Static Method Details

-   `renderVisual(element, isPreview)`: A helper method that takes a `CapsuleElement` and creates a corresponding `THREE.Mesh`. It sets the material's opacity based on the `isPreview` flag. It calls the static `computeGeometry` method to do the heavy lifting.

-   **`static computeGeometry(element)`**: This is a crucial static method that contains the core Three.js logic. It takes a `CapsuleElement` data object and returns the calculated `THREE.BufferGeometry`, along with the correct position and rotation for the final mesh.
    1.  It calculates the axis vector between the start and end points.
    2.  It determines the height of the cylinder portion from the length of this axis.
    3.  It creates a `THREE.CapsuleGeometry` (or a fallback combination of a Cylinder and two Spheres).
    4.  It calculates the midpoint, which will be the mesh's local origin.
    5.  Most importantly, it computes a `Quaternion` to rotate the default Y-up geometry so that it aligns perfectly with the axis vector defined by the user's clicks.

<!-- 100% -->

### Implementation Notes

-   **Data Model Separation**: The command works with a `CapsuleElement` object. This class is a pure data container, holding just the `start`, `end`, and `radius`. The `DrawCapsuleCommand` is responsible for translating this data into a visual `threejsObject`. This separation of data and view is a core architectural principle.
-   **Geometry Fallback**: The code checks for the existence of `THREE.CapsuleGeometry`. If it's not available (e.g., in an older Three.js version), it manually constructs the shape by merging a cylinder and two sphere geometries using `BufferGeometryUtils.mergeBufferGeometries`. This makes the code more robust.
-   **Outline Creation**: The `createCapsuleOutline` static method generates a simple wireframe-like outline for the capsule. This is added to the main mesh to provide clearer edges, which is often desirable in a CAD context. It intelligently creates lines along the cylinder's length and rings at the caps.
-   **Interactive Radius**: By repeatedly reading `this.base.commandControlValue` in the `updatePreview` loop, the command allows the user to adjust the capsule's radius in real-time before placing the second point, leading to a more dynamic and intuitive workflow.