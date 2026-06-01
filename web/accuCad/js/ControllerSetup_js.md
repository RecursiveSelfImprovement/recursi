# ControllerSetup.js (Tool Registry)

`js/ControllerSetup.js` is a configuration file responsible for registering all available tools with the `BaseController`.

## Responsibilities

1.  **Command Factory**:
    *   It imports all command classes (`DrawRectangleCommand`, `DrawPathCommand`, etc.).
    *   It instantiates them, passing the `baseController` instance to their constructors. This connects the individual tools to the global application state.
    *   **`registerCommand`**: Maps string keys (e.g., "rectangle") to these command instances.

2.  **Initial State**:
    *   Sets the default tool (Rectangle).
    *   Sets initial attributes (Color, Line Width).
    *   **AccuDraw Initialization**: This is where the `AccuDraw` class is instantiated and its 3D object (`get3DObject()`) is added to the Three.js scene.

## Relevance to AccuDraw

This file establishes the relationship between the controller and the AccuDraw instance. If we want to swap out the current AccuDraw implementation for a new one based on the TypeScript port, this is where that substitution would happen.