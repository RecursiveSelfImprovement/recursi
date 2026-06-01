# Aardvark

The `Aardvark` class acts as the central hub and orchestrator for the Aardvark DOM inspection and manipulation tool. It binds together user input, visual feedback, and DOM actions.

## Key Responsibilities

1. **State Management:** Tracks the `currentElement` being hovered over and manages the active/dormant lifecycle of the tool.
2. **Sub-module Initialization:** Instantiates and coordinates the `AardvarkOverlay`, `AardvarkActions`, `AardvarkStyleEditor`, and `AardvarkRadialMenu`.
3. **Input Handling:** Uses the `KeystrokeHandler` to bind keyboard commands (like 'w' for wider, 'r' for remove) and intercepts the native browser `contextmenu` event to display the custom radial menu instead.
4. **DPC Scraper:** Contains an integrated automation tool (`runDpcScraper`) designed to randomly sample, click, and scrape specific map marker elements and their corresponding iframes.

## Core Methods

- **`init()` / `wakeUp()` / `quit()`**: Manages the attachment and detachment of global mouse and keyboard listeners, ensuring Aardvark only interferes with the page when actively needed.
- **`elementMouseHandler(event)`**: The core mouse-move listener. Identifies the element under the cursor, skips excluded UI elements, and triggers the overlay to highlight it.
- **`lockElements()`**: Freezes the current selection by temporarily removing the mouse-move listener, allowing the user to move the mouse without losing their target element.