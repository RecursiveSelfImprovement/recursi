class SegmentManager {
  constructor(app) {
    this.app = app;
    this.segments = [];
    this.currentIndex = 0;
  }

  addSegment(repeatCount) {
    this.app.video.getVideo((video) => {
      if (video) {
        const currentTime = video.currentTime;
        const duration = video.duration;
        const start = Math.max(0, currentTime - 2);
        const end = Math.min(duration, currentTime + 2);
        const seg = new VideoSegment(start, end, repeatCount);
        this.segments.push(seg);
        this.cleanupSegments();

        this.currentIndex = this.segments.findIndex((s) =>
          s.contains(currentTime)
        );
        if (this.currentIndex === -1 && this.segments.length > 0) {
          this.currentIndex = this.segments.length - 1;
        }

        this.app.video.isLoopPaused = false;
        this.app.video.currentPlayCount = 0;

        if (video.paused) {
          video.play();
        }

        this.app.timeline.update();
        this.app.timeline.show(false);
      }
    });
  }

  setRepeatCount(count) {
    this.app.video.getVideo((video) => {
      if (!video) return;
      const currentTime = video.currentTime;
      const idx = this.segments.findIndex((s) => s.contains(currentTime));

      if (idx !== -1) {
        this.segments[idx].repeatCount = count;
      } else {
        this.addSegment(count);
      }
      this.app.video.currentPlayCount = 0;
      this.app.timeline.update();
      this.app.timeline.show(false);
    });
  }

  cleanupSegments(callback) {
    if (this.segments.length < 2) {
      if (callback) callback();
      return;
    }

    this.segments.sort((a, b) => a.times[0] - b.times[0]);
    const cleaned = [this.segments[0]];

    for (let i = 1; i < this.segments.length; i++) {
      const last = cleaned[cleaned.length - 1];
      const curr = this.segments[i];
      if (curr.times[0] <= last.times[1]) {
        last.times[1] = Math.max(last.times[1], curr.times[1]);
        last.repeatCount = Math.max(last.repeatCount, curr.repeatCount);
      } else {
        cleaned.push(curr);
      }
    }
    this.segments = cleaned;

    const currentTime = this.app.video.currentVideo
      ? this.app.video.currentVideo.currentTime
      : 0;
    this.currentIndex = this.segments.findIndex((s) => s.contains(currentTime));
    if (this.currentIndex !== -1) {
      this.app.video.currentPlayCount = 0;
    }
    if (callback) callback();
  }

  modifyCurrentDuration(factor) {
    if (
      this.segments.length > 0 &&
      this.currentIndex >= 0 &&
      this.currentIndex < this.segments.length
    ) {
      const video = this.app.video.currentVideo;
      if (video) {
        const seg = this.segments[this.currentIndex];
        seg.adjustDuration(factor, video.duration);

        if (!seg.contains(video.currentTime)) {
          video.currentTime = seg.times[0];
        }

        if (this.app.video.isLoopPaused) {
          video.currentTime = seg.times[0];
        }
        this.cleanupSegments();
        this.app.timeline.update();
        this.app.timeline.show(false);
      }
    }
  }

  clearCurrent() {
    if (
      this.segments.length > 0 &&
      this.currentIndex !== -1 &&
      this.segments[this.currentIndex]
    ) {
      this.segments.splice(this.currentIndex, 1);
      if (this.currentIndex >= this.segments.length) {
        this.currentIndex = this.segments.length - 1;
      }

      if (this.segments.length === 0 && this.app.video.currentVideo) {
        this.app.video.isLoopPaused = true;
      }

      this.cleanupSegments();
      this.app.timeline.update();
      this.app.timeline.show(false);
    }
  }

  jumpToNext() {
    if (this.segments.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.segments.length;
      const video = this.app.video.currentVideo;
      if (video) {
        video.currentTime = this.segments[this.currentIndex].times[0];
      }
      this.app.video.currentPlayCount = 0;
    }
  }

}

