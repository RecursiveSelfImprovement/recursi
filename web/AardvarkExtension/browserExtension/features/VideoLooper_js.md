# VideoLooper

The `VideoLooper` is the main orchestrator for the Aardvark browser extension's video manipulation features. It brings together the timeline UI, the segment manager, and the video controller, binding them to keyboard shortcuts and on-screen controls.

## Key Responsibilities

1. **Feature Orchestration:** Initializes and connects the `VideoController`, `SegmentManager`, and `TimelineUI` into a cohesive feature set.
2. **Keyboard Integration:** Maps hotkeys for setting loops, adjusting volume, stepping frame-by-frame, and trimming segments using the `LooperKeystrokeHandler`.
3. **Theater & Expand Modes:** Modifies the page's CSS (using body transforms and fixed positioning) to isolate the target video, hiding distracting sidebars and comments to create an immersive, distraction-free viewing experience.
4. **Floating Control Panel:** If the user is on YouTube, it injects a draggable, condensed control palette into the page, allowing mouse-driven access to looping, volume, and timeline tools.

## Core Methods

- **`init(videoElement)`**: Wires up the sub-components, detects if the current page is YouTube, and sets up either the floating control panel or standard keystrokes accordingly.
- **`enterTheaterMode()` & `exitTheaterMode()`**: Climbs the DOM tree to hide all siblings of the video container, then mathematically scales and translates the `document.body` so the video fills the entire viewport.
- **`expandVideo()`**: A "nuclear" isolation mode that forcibly extracts the video element from its container using `position: fixed` and `100vw/100vh`, ensuring it breaks out of any restrictive parent `overflow: hidden` rules.
- **`trimSegment()`**: Dynamically adjusts the start or end time of the active loop segment to match the video's current playback time, shrinking the loop to be more precise.