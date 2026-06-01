# AccuDrawTestHarness (Development Tool)

`js/ui/AccuDrawTestHarness.js` is a standalone utility designed to verify the behavior of the `AccuDrawUi` without needing to fully integrate it with the complex 3D scene events.

## Purpose

As described in the user instruction (*"...get it all working the dialog box right now has the basic behavior but it's not hooked into the drawing tool at all"*), this harness allows us to simulate that "hooking in" manually. It proves that the UI *can* receive updates, focus fields, and lock inputs.

## Features

1.  **Input Simulation**: 
    *   Buttons to programmatically inject values into X, Y, and Z fields.
    *   Demonstrates the `ui.updateValues()` API.

2.  **State Testing**:
    *   **Focus Control**: Buttons to force focus to X or Y, simulating the behavior where typing "X" on the keyboard jumps to the X field.
    *   **Lock Toggling**: Simulates the logic of the "Smart Lock" (Enter key) by programmatically toggling the lock state on specific inputs.

3.  **DOM Integration**:
    *   Creates a floating overlay in the DOM.
    *   Directly accesses the `baseController.accuDraw.ui` instance, bypassing the event bus for direct testing.

## Usage

Activated via `SmartDrawKeys.js` with the key sequence `AccuDraw -> Test Harness`.