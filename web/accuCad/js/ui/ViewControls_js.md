# ViewControls (Global UI Panels)

`js/ui/ViewControls.js` manages the visibility and creation of the floating settings panels that are *not* the specific AccuDraw input widget.

## Components

1.  **Compass Controls** (`_createCompassControls`):
    *   A `DialogBox` containing sliders to tweak the **visual parameters** of the AccuDraw compass.
    *   Controls: Size, Opacity, Shape (Square/Circle), Color, Background Color.
    *   **Integration**: It directly calls methods on `baseController.originMarker` (the `AccuDraw` instance) like `setSizeAnimated` or `update({ opacity })`.

2.  **View Spinners** (`_createSpinnerControls`):
    *   A `DialogBox` containing `SpinnerWidget` instances for manipulating the camera.
    *   Controls: Spin, Tilt, Pan X/Y/Z, Perspective (FOV), Lights.
    *   **Integration**: Calls `TransformView.transform` to apply camera deltas.

## Relevance to "Global Project"

This file demonstrates how the UI layer talks to the Logic layer (`BaseController`, `TransformView`). It proves that the infrastructure for updating the compass appearance is already in place; the missing piece is connecting the *logic* (locking, snapping) to these visual updates.