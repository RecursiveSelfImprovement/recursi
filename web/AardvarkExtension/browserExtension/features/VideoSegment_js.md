# VideoSegment

The `VideoSegment` is a lightweight data model that represents a specific slice of time within a video that the user wants to loop or isolate.

## Key Responsibilities

1. **Boundary Storage:** Holds the chronological start and end times (in seconds) of the segment.
2. **Repetition Logic:** Stores the `repeatCount`, representing how many times the controller should play this specific segment before advancing.
3. **Dynamic Resizing:** Allows the segment boundaries to be expanded or contracted symmetrically around its midpoint.

## Core Methods

- **`contains(time)`**: A simple utility check that returns true if a given timestamp falls between the segment's start and end times.
- **`adjustDuration(factor, videoDuration)`**: Calculates the center point of the segment and scales the total duration by the provided `factor` (e.g., `1.5` to make the loop 50% wider, `0.66` to narrow it). It automatically clamps the new boundaries to ensure they do not fall below zero or exceed the video's total duration.