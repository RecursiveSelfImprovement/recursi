# VideoController

The `VideoController` acts as a high-level wrapper around the page's active `<video>` element or YouTube player. It specifically manages the custom A-B looping logic, ensuring that playback stays within the bounds defined by the user.

## Key Responsibilities

1. **Video Discovery:** Automatically scans the DOM to find the largest, actively playing, visible video element on the page if one is not explicitly provided (`getVideo`).
2. **Loop Enforcement:** Hooks into the video's `timeupdate` event. If the video's current time exceeds the end boundary of the active segment, it seamlessly seeks back to the start.
3. **Repeat Tracking:** Tracks how many times the current segment has looped (`currentPlayCount`). Once the target repeat count is reached, it seamlessly releases the video to flow into the next segment in the sequence.
4. **Scrubbing:** Provides frame-accurate scrubbing forward and backward, triggering the loop logic immediately to prevent escaping the active segment during manual seeks.

## Core Methods

- **`init(videoElement)`**: Bootstraps the controller, either attaching to the given video element or auto-discovering the best candidate on the page.
- **`handleLoop(callback)`**: The core boundary-checking mechanism. Compares the video's `currentTime` against the active `VideoSegment` and executes jumps or advances the segment index when limits are hit.
- **`toggleLoopPause()`**: Temporarily disables the boundary enforcement, allowing the video to play normally without deleting the user's defined segments.