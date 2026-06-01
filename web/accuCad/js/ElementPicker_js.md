<!-- 25% -->
# ElementPickCommand

`ElementPickCommand` is a special-purpose command that does not draw anything. Instead, it handles hover-based selection of elements in the scene. When active, it continuously tracks the object under the mouse cursor, provides visual feedback by highlighting it, and makes it available for other operations (like deletion or modification).

### Core Philosophy

This command implements the "select" mode of the application. Its philosophy is to use non-intrusive, hover-based interaction to determine the user's object of interest. It encapsulates the logic of raycasting, finding the corresponding high-level `Element` from a low-level `THREE.Mesh`, and managing the highlight state. A key feature is the timeout that automatically removes the highlight, preventing a cluttered interface.

<!-- 50% -->

### User Interaction Flow

1.  The user activates this command (e.g., via a 'select' key command).
2.  `onMouseMove` is triggered continuously. It performs a raycast from the camera through the mouse cursor.
3.  If the ray intersects an object, `findPickedElement` is called to map the low-level mesh back to its high-level `Element` data model.
4.  `applyHighlight` is called to change the visual appearance of the selected element (e.g., making it glow or showing a wireframe).
5.  A timer is reset. If the user stops moving the mouse over the object for a few seconds, `removeHighlight` is called automatically.
6.  Other parts of the system (like `SmartDrawKeys`) can then call `getSelectedElement()` to retrieve the currently highlighted element to operate on it.

<!-- 75% -->

### Key Methods

-   `onMouseMove(data)`: The main entry point, which orchestrates the raycasting and selection process on every mouse movement.
-   `buildCandidateObjects()`: Gathers all scene objects that are eligible for picking into a list for the raycaster.
-   `findPickedElement(pickedObject)`: The crucial logic that traverses the `threejsObject` hierarchy to map a specific mesh that was hit by the raycaster back to the parent `Element` object stored in `baseController.cadElements`.
-   `applyHighlight(element, color)` / `removeHighlight()`: These methods manage the visual state of the selection. `applyHighlight` stores the original materials of the object and replaces them with a highlight version. `removeHighlight` restores the original materials.
-   `getSelectedElement(retainSelection)`: The primary public interface for this command. It returns the currently selected element. The `retainSelection` flag can prevent the highlight from being cleared after retrieval.
-   `dumpElementInfo()`: A powerful debugging utility that logs detailed information about the selected object's hierarchy, geometry, and materials to the console.