class VideoSegment {
  constructor(start, end, repeatCount) {
    this.times = [start, end];
    this.repeatCount = repeatCount || 1; // Default to 1 if not specified
  }

  contains(time) {
    return time >= this.times[0] && time < this.times[1];
  }

  adjustDuration(factor, videoDuration) {
    const mid = (this.times[0] + this.times[1]) / 2;
    const newDuration =
      Math.max(0.5, (this.times[1] - this.times[0]) * factor) / 2;
    this.times[0] = Math.max(0, mid - newDuration);
    this.times[1] = Math.min(videoDuration, mid + newDuration);
  }

}

