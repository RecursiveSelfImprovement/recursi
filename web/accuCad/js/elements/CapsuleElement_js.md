<!-- 25% -->
# CapsuleElement

`CapsuleElement` is the data model for a 3D capsule primitive (a cylinder with hemispherical ends). It extends the base `Element` class.

### Core Philosophy

As with other element classes, `CapsuleElement` is a pure data container. It stores the minimal information required to define the capsule: a `start` point, an `end` point for its central axis, and a `radius`. All rendering logic is handled by the `DrawCapsuleCommand` and `CapsuleGeometryCreator`, keeping the data model clean and independent.

<!-- 50% -->

### Key Properties

-   `start`: An `[x, y, z]` array for the start point of the capsule's axis.
-   `end`: An `[x, y, z]` array for the end point of the capsule's axis.
-   `radius`: A number defining the radius of the cylinder and hemispherical caps.

<!-- 75% -->

### API and Usage

This class is created and managed by the `DrawCapsuleCommand`.

-   `constructor(start, end)`: Creates a new capsule element.
-   `updateDimensions()`: Calculates the axis-aligned bounding box (`min`, `max`) for the element.
-   `toJSON()` / `static fromJSON(data)`: Provides serialization/deserialization for saving and loading capsule elements to and from files.