# SegmentManager

The `SegmentManager` tracks and organizes A-B loop segments for the Video Looper. It integrates tightly with the `VideoController` and `TimelineUI` to enable continuous, isolated playback of specific video sections.

## Key Responsibilities

1. **Segment Creation:** Allows users to mark a point in time, creating a looped segment (defaulting to +/- 2 seconds around the current timestamp).
2. **Loop Iterations:** Manages the `repeatCount` for segments, tracking how many times a specific section has played before allowing the video to advance to the next segment.
3. **Overlap Resolution:** Automatically sorts and merges overlapping segments (`cleanupSegments`) to prevent playback stuttering or infinite recursive loops.
4. **Duration Modification:** Allows segments to be dynamically widened or narrowed on the fly without deleting and recreating them.

## Core Methods

- **`addSegment(repeatCount)`**: Captures the current video time, generates a new `VideoSegment`, adds it to the queue, and immediately seeks/plays the new loop.
- **`cleanupSegments(callback)`**: Sorts all segments chronologically. If any two segments overlap, it merges them into a single, wider segment to ensure smooth, continuous playback.
- **`modifyCurrentDuration(factor)`**: Multiplies the width of the active segment by the given factor (e.g., 1.5 to widen, 0.66 to narrow), recalculating its start and end times around its center point.
- **`clearCurrent()`**: Deletes the currently active segment and resumes standard video playback if no other segments remain.