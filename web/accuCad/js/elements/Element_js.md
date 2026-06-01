<!-- 25% -->
# Element

`Element` is the abstract base class for all geometric entities within the AccuCad application. It establishes a common data structure and interface for objects that can be drawn, selected, and manipulated in the 3D scene.

### Core Philosophy

This class is designed to be a pure data container, free from any Three.js or rendering-specific logic. It holds the fundamental properties that all CAD elements share, such as a unique ID, color, and a set of defining geometric points. By standardizing these properties, the rest of the application (like selection handlers and file serializers) can interact with different types of elements in a uniform way.

<!-- 50% -->

### Key Properties

-   `id`: A randomly generated unique identifier for the element.
-   `color`: The color assigned to the element. Note that the drawing commands are responsible for translating this value into a material color for the `threejsObject`.
-   `isTemporary`: A boolean flag used by drawing commands to track elements that are part of an in-progress operation (e.g., the preview of a rectangle before the second click).
-   `points`: A crucial array of `[x, y, z]` coordinates that represent the key geometric vertices of the element. This array is the primary target for the `TentativePointHandler`'s snapping logic.

<!-- 75% -->

### API and Usage

This class is not typically instantiated directly. Instead, more specific element classes like `RectangleElement` or `PathElement` extend it.

-   `constructor()`: Initializes the default properties. Subclasses call this via `super()`.
-   `toJSON()` / `static fromJSON(data)`: These methods provide a basic serialization and deserialization mechanism. Subclasses should override these to include their own specific properties (e.g., `start` and `end` points for a rectangle).