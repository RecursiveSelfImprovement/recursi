# AccuDrawInput (Field Component)

`js/ui/AccuDrawInput.js` represents a single input field (e.g., for 'X' or 'Y') within the `AccuDrawUi`.

## Features

1.  **Visual Structure**:
    *   Composed of an `<input>` element and a visual "Lock" indicator (`lockElem`).
    *   Uses dynamically created DOM elements via `makeElement`.
    *   Supports custom background colors (Red for X, Green for Y) with transparency.

2.  **Locking UI**:
    *   **`toggleLock()` / `setLocked(bool)`**: Handles the visual transition between locked and unlocked states.
    *   **Animation**: It scales and fades the lock icon/background to provide clear feedback when a constraint is active.
    *   **Interaction**: Pressing 'Enter' in the field toggles the lock state.

3.  **Focus Handling**:
    *   **`setFocusState(isFocused)`**: Changes the Z-index and scale of the field to highlight it when active. This mimics the "pop-out" effect seen in the reference implementation.

## Usage

Instantiated by `AccuDrawUi`:

```javascript
const input = new AccuDrawInput('x', [255, 0, 0], this);
```

## Missing Functionality (vs Reference)

*   **Smart Parsing**: Currently acts as a simple text field. The reference implementation likely supports expression parsing (e.g., "10/2") or unit conversion.
*   **Icon Support**: The reference `AccuDrawInputField.tsx` supports arbitrary icons; this implementation uses a hardcoded image URL for the lock.