# RotaryEncoders (Hardware Input)

`js/RotaryEncoders.js` bridges the physical world (MIDI controllers) with the application's logical state.

## Functionality

1.  **Hardware Mapping**:
    *   Listens for specific MIDI Control Change (CC) messages (IDs 16, 17, 18, 19).
    *   Interprets relative knob turns (values 65 vs 63) as delta increments/decrements.

2.  **State Injection**:
    *   **Line Width**: Directly modifies `baseController.lineWidth`.
    *   **Color**: Modifies `baseController.currentColor` by cycling through Hue space.
    *   **Command Value**: Modifies `baseController.commandControlValue`. This is a generic "input slot" used by active commands (e.g., to set a fillet radius or capsule thickness dynamically while drawing).

3.  **Global UI Control**:
    *   Maps one encoder to `SpinnerWidget`, allowing physical hardware to drive on-screen UI widgets.

## Integration with Global Project

AccuDraw is designed for rapid, keyboard-centric input. Adding rotary encoders provides a parallel "analog" input method. Future AccuDraw implementations could map an encoder to the Compass Orientation (rotating the axes) or the Z-height, providing a tactile way to manipulate the drawing plane.