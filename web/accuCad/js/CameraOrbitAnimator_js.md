<!-- 25% -->
# CameraOrbitAnimator

`CameraOrbitAnimator` is a static utility class that implements a continuous, gentle orbital animation for the camera. This effect, sometimes called a "wobble" or "oscillation," prevents the 3D scene from appearing static and adds a subtle, dynamic quality to the view.

### Core Philosophy

This class is designed as a simple, global, "fire-and-forget" animator. It's a static class because there should only ever be one such animation active at a time. It's built to be easily toggled on and off and to be configurable at runtime for easy debugging and tuning, often by modifying a global `window.cameraOscillationSettings` object.

<!-- 50% -->

### Primary API Usage

-   `setDependencies(threeDView, settings)`: Must be called once at application startup to provide the animator with access to the scene and camera.
-   `start()` / `stop()` / `toggle()`: These methods control the animation. `start()` begins the gentle orbit, `stop()` ends it, and `toggle()` switches between the two states.
-   `updateSettings()`: If the animation is running, this method can be called to stop and restart it with new parameters, which it reads from its internal settings (or the global window object if present).

<!-- 75% -->

### How It Works

1.  **Initialization (`start()`)**: When the animation starts, it records the camera's current position (`_initialCamPos`) and its target (`_initialTarget`). It then calculates two vectors, `_tangent` and `_bitangent`, which are perpendicular to the view direction and to each other. These two vectors define a 2D plane that is "flat" relative to the camera's view.
2.  **Animation Loop (`_animate()`)**: The animation is driven by `requestAnimationFrame`.
    a. In each frame, it calculates the elapsed time since the animation started.
    b. It uses the elapsed time to determine an angle (`(elapsed / duration) * 2 * PI`).
    c. It calculates a 2D point on a circle using `Math.cos(angle)` and `Math.sin(angle)`.
    d. It uses this 2D point to create a 3D offset from the initial camera position by scaling the `_tangent` and `_bitangent` vectors.
    e. It sets the camera's new position to `_initialCamPos + offset` and makes it look at the `_initialTarget`.
3.  **Ramp-Up**: The animation includes a `rampUpTime` to smoothly ease into the full orbital radius, preventing a sudden jump when the animation starts.