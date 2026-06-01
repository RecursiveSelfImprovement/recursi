# AccuDraw (Visual Compass Manager)

`js/AccuDraw.js` is responsible for the **visual representation** and **animation** of the AccuDraw compass in the 3D scene. It does *not* handle the core logical state (like calculating snaps or constraining points); that logic currently resides partly in `BaseController` and `GeneratePoint`.

## Core Responsibilities

1.  **Visual Composition**:
    *   Manages the `Squircle3D` instance, which draws the filled, varying-shape plane.
    *   Creates and manages "decorations" (tick marks, center sphere) to indicate the coordinate axes (X=Red, Y=Green).
    *   Manages the `indexIndicator`, a thick white line used to visualize axis locking/indexing.

2.  **Animation**:
    *   Provides methods to smoothly animate the compass's properties (`setCenterAnimated`, `setRotationAnimated`, `setSizeAnimated`, `setSquircleAnimated`).
    *   Uses a custom animation loop with `requestAnimationFrame` to interpolate values over time.

3.  **UI Integration**:
    *   Instantiates the `AccuDrawUi` class (`js/ui/AccuDrawUi.js`), linking the 3D marker to the DOM-based input fields.
    *   Feeds data to the UI via `updateIndexIndicator` (currently sends delta values when indexing).

## Key Components

*   **`marker3D`**: An instance of `Squircle3D` representing the drawing plane.
*   **`decorationsGroup`**: A `THREE.Group` containing the colored axis tick marks and center point.
*   **`indexIndicator`**: A `Line2` (thick line) object used to visually connect the origin to the cursor when locked to an axis.
*   **`ui`**: Reference to the `AccuDrawUi` instance.

## Usage

Initialized in `ControllerSetup.js`:

```javascript
baseController.accuDraw = new AccuDraw(baseController.view, { ...options });
scene.add(baseController.accuDraw.getObject3D());
```

## Current Limitations

*   The class is primarily a "view" component. It reacts to state changes triggered by the `BaseController`.
*   The connection between the 3D movement and the `AccuDrawUi` values is currently limited to axis-indexing events in `updateIndexIndicator`. A tighter loop is needed to update X/Y fields continuously during mouse movement.