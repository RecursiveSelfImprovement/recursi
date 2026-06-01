<!-- 25% -->
# BaseDrawCommand

`BaseDrawCommand` is the abstract base class for all drawing and interaction tools in the AccuCad application. It defines a standardized interface that the `BaseController` uses to communicate user input to the active tool.

### Core Philosophy

This class establishes a contract for what it means to be a "drawing command". By providing a common structure (`onPoint`, `reset`), it allows the `BaseController` to manage different tools (like drawing rectangles, paths, or capsules) in a uniform way, without needing to know the specific implementation details of each tool. It also provides shared utilities, such as for cleaning up temporary preview geometry, to reduce code duplication in subclasses.

<!-- 50% -->

### Key Properties and Methods

-   `base`: A reference to the `BaseController` instance. This gives the command access to the application's global state, such as the current color, line width, and the 3D scene.
-   `tempElement`: A placeholder for the data model of the element being created (e.g., an instance of `RectangleElement`).
-   `previewShape`: A placeholder for the temporary Three.js object used to give the user visual feedback as they draw.

-   `onPoint(data)`: The primary entry point for the command. The `BaseController` calls this method in response to mouse clicks and movements, passing a structured data object with the 3D point and event details. This method typically delegates to `onMouseDown` or `onMouseMove` handlers within the subclass.
-   `reset()`: A crucial method for cleaning up the command's state. It is responsible for removing any temporary preview geometry from the scene and resetting internal state (like the list of clicked points). The `BaseController` calls this whenever the user cancels the command (e.g., with a right-click) or switches to a new tool.

<!-- 75% -->

### Subclassing

A typical drawing command will extend `BaseDrawCommand` and implement the following:

1.  **`constructor(baseController)`**: Calls `super(baseController)` and initializes any command-specific state.
2.  **`onMouseDown(data)`**: Handles the logic for mouse clicks, such as storing points and finalizing geometry.
3.  **`onMouseMove(data)`**: Handles the logic for mouse movement, typically by updating a preview shape.
4.  **`reset()`**: Calls `super.reset()` and then resets its own specific state.