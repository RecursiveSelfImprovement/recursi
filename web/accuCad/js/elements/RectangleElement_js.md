<!-- 25% -->
# RectangleElement

This class is the data model for a rectangle or a 3D box (cuboid). It extends the base `Element` class and stores the geometric information required to define a rectangular shape.

### Core Philosophy

Following the application's data-driven design, `RectangleElement` is a pure data container. It holds only the essential information—the `start` and `end` corner points—and derives all other properties (`min`, `max`, `size`, `center`) from them. It knows nothing about how it will be rendered; that is the responsibility of the `DrawRectangleCommand`.

<!-- 50% -->

### Primary API Usage

The `DrawRectangleCommand` creates and manages instances of this class.

1.  On the first click, a `RectangleElement` is created with the same `start` and `end` point.
2.  As the mouse moves, the command updates the `end` point and calls `updateDimensions()` to refresh the derived properties.
3.  On the second click, the final `end` point is set, and the element's data is finalized.

<!-- 75% -->

### Key Properties and Methods

-   `start`: An `[x, y, z]` array representing the first corner point clicked by the user.
-   `end`: An `[x, y, z]` array representing the second corner point.
-   `min`, `max`: `[x, y, z]` arrays representing the minimum and maximum corners of the axis-aligned bounding box, calculated from `start` and `end`.
-   `size`: An `[x, y, z]` array holding the width, height, and depth.
-   `center`: The geometric center of the bounding box.
-   `updateDimensions()`: This core method recalculates the `min`, `max`, `size`, and `center` properties. It must be called whenever the `start` or `end` points are modified to keep the element's data consistent.