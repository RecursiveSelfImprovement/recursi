# DrawingTool

The `DrawingTool` allows users to draw freehand SVG annotations directly over the active web page. It uses the `CurveFitter` to automatically smooth jagged mouse strokes into beautiful, clean Bezier paths.

## Key Responsibilities

1. **SVG Overlay Management:** Injects a full-screen, high-Z-index, transparent `<svg>` overlay (`createSvgOverlay`) to capture mouse/touch events.
2. **Real-time Rendering:** Draws a temporary, jagged polyline while the user is actively dragging the mouse. Upon mouse-up, it pipes the captured coordinates through `CurveFitter` and replaces the rough line with a smooth, styled SVG `<path>`.
3. **Control/Shift Modifiers:** Supports drawing modes where holding `Ctrl` establishes an anchor point, and holding `Shift` locks the drawing radius (distance from the anchor), enabling users to draw perfect arcs or straight lines.
4. **Pencil Cursor:** Replaces the standard mouse cursor with a custom "pencil holding hand" SVG sprite that tracks the mouse position.

## Core Methods

- **`startDrawing(e)` / `draw(e)` / `stopDrawing(e)`**: The core event loop for capturing coordinate arrays (`currentPoints`) and rendering the live temporary SVG path.
- **`setupKeystrokes()`**: Binds Aardvark global hotkeys to switch colors (e.g., 'red', 'blue'), undo the last stroke, clear the screen, or exit drawing mode.
- **`appendBezierPathsToSvg(...)`**: Converts the mathematical output of `CurveFitter` into a valid SVG path data string (`d="M... C..."`), generating both a primary colored stroke and a blurred drop-shadow stroke for visibility against any background.