# AardvarkActions

The `AardvarkActions` class executes the structural and developmental operations on the DOM elements selected by the Aardvark tool.

## Key Responsibilities

1. **DOM Manipulation:** Provides commands to remove elements, edit text content directly (`contentEditable`), or isolate an element by stripping away all siblings and custom body styles.
2. **Traversal:** Allows users to select the parent element (`wider`) or return to the previously selected child (`narrower`).
3. **LLM Integration:** Captures elements and generates precise CSS selectors, formatting them into a JSON payload that can be copied to the clipboard or sent to the `WebDiag` system for LLM analysis.
4. **Source Code Extraction:** Generates a custom, formatted "View Source" dialog that displays the HTML structure of the selected element, complete with a "snip" mode that intelligently truncates massive base64 image strings or SVG paths to keep the code readable.

## Core Methods

- **`isolateElement()` & `undo()`**: Clones the current element, clears the `document.body`, and appends the clone. Pushes the original body state into an `undoBuffer` so it can be perfectly restored later.
- **`generateSelector(element)`**: Traverses up the DOM tree to construct a highly specific, unique CSS selector path for the target element.
- **`toggleBigBlocks()`**: A heuristic scanner that analyzes the page layout and outlines major structural containers (blocks) in distinct rainbow colors, helping developers quickly identify the page's skeleton.