# SvgOverlay

The `SvgOverlay` acts as a transparent, full-screen canvas injected over the webpage to support freehand drawing and annotation. It functions identically to the `DrawingTool` but explicitly handles SVG namespace creation.

## Key Responsibilities

1. **Canvas Injection:** Creates an SVG overlay with a maximum `z-index` to intercept pointer events across the entire visible viewport.
2. **Stroke Capture & Smoothing:** Records raw mouse coordinates during a drag and delegates to `CurveFitter` upon release to convert the jagged array of points into smooth, optimized Bezier curves.
3. **Modifier Constraints:** Implements `Control` (to set an anchor) and `Shift` (to lock radius/distance) modifiers to help users draw perfect straight lines or arcs.
4. **Pencil Sprite:** Hides the default system cursor and replaces it with an animated, stylized SVG pencil/hand graphic that follows the user's pointer.

## Core Methods

- **`createSvgOverlay()`**: Constructs the base SVG DOM element with `http://www.w3.org/2000/svg` namespace and fixed full-screen positioning.
- **`startDrawing(e)` / `draw(e)` / `stopDrawing(e)`**: The primary event handlers that track the mouse, draw the temporary rough path, and finalize the smoothed Bezier path.
- **`appendBezierPathsToSvg(bezierData, options)`**: Takes the output from the `CurveFitter` and generates `<path>` elements, including a main colored stroke and an underlying blurred shadow for contrast.