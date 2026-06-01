<!-- 25% -->
# DrawBlackKeyCommand

`DrawBlackKeyCommand` is a specialized drawing tool that creates a shape resembling a black piano key. It's built on the same two-click, corner-to-corner interaction as the standard rectangle command, but produces a custom 3D geometry.

### Core Philosophy

This command demonstrates how a simple user interaction (defining a bounding box) can be used to create a complex, non-primitive shape. Its key design feature is its ability to adapt its output: if the user draws a flat 2D rectangle, it creates a simple plane; if they draw a 3D box, it generates the custom, tapered key geometry. This makes the tool flexible and context-aware.

<!-- 50% -->

### User Interaction Flow

The interaction is identical to `DrawRectangleCommand`: a first click sets a starting corner, and a second click sets the opposite corner, defining a bounding box.

### Key Methods

-   `isFlatElement(element)`: A utility that checks if the defined bounding box is essentially 2D (i.e., if its size on one of the axes is close to zero). This check determines which geometry to create.
-   `renderVisual(element, isPreview)`: This method acts as a router. It calls `isFlatElement` and then delegates to either `fallbackCreateRectangle` or `createBlackKey`.
-   `fallbackCreateRectangle(...)`: If the shape is flat, this method simply uses the standard `DrawRectangleCommand.computeGeometry` logic to create a simple plane.
-   `createBlackKey(element, isPreview)`: This is the core of the command. If the shape is 3D, this method manually constructs the custom key shape. It defines the 8 vertices of the tapered geometry and the 36 indices that form the 12 triangles of its mesh, creating a `THREE.BufferGeometry` from scratch.