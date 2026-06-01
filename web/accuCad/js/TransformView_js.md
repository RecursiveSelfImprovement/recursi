# TransformView.js (Camera Math Engine)

`js/TransformView.js` is a static utility library dedicated to calculating camera transformations. It powers the `ViewManipulator` and the `ViewControls` UI.

## Core Math Logic

1.  **Spherical Coordinates**:
    *   The `transform` method converts the Camera Position relative to the Target into Spherical Coordinates (Radius, Theta, Phi).
    *   **Spin/Tilt**: It modifies Theta and Phi to orbit the camera.
    *   **Zoom/Dolly**: It modifies the Radius or Field of View (FOV).

2.  **Animation Support**:
    *   **`animateTransformToPoint`**: Implements a smooth interpolation loop to fly the camera to a specific target. This is used by the "Center View" command in `SmartDrawKeys`.

3.  **View Depth**:
    *   **`setViewDepth`**: A specialized function to move the camera's *target point* along the view vector to a specific depth defined by a 3D point. This allows the camera to focus on an object without changing its visual perspective.

## Global Project Context

While AccuDraw handles the *drawing* plane, `TransformView` handles the *viewing* plane. In a robust CAD system, these often interact (e.g., "Rotate View to Element" sets the camera, while "Rotate AccuDraw to View" sets the compass).