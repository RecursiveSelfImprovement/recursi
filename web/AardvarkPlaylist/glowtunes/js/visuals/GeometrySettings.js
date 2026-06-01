class GeometrySettings {
  constructor() {
    this.actionBarYRatio = 0.66;
    this.actionBarY =
      Math.round(window.innerHeight * this.actionBarYRatio) || 600;
    this.start = this.actionBarY;
    this.fineX = 10;
    this.keyStretch = 98.9;
    this.customWidth = 100;
    this.scale = 0.36; // Scaled down by half for better default viewing
    this.rotation = 64;
    this.perspective = 2100;
    this.yOrg = this.actionBarY;

    this.abWhiteSpread = 1.0;
    this.abBlackSpread = 1.0;
    this.abBlackYOffset = -15;

    this.w = 1000;
    this.containerTimeSpan = 5000;
    this.blackNoteOffset = 10;
    this.actionBarX = 0;
    this.minMidi = 36;
    this.maxMidi = 84;
    this.scaleX = 1;
    this.rotationY = 0;
    this.rotationZ = 0;
    this.zShift = 0;
    this.debugMode = false;
    this.leftHanded = false;

    // Independent Flying Bar Adjustments
    this.xShift = 0;
    this.timeShift = 0;
    this.whiteWidth = 1;
    this.blackWidth = 1;
    this.whiteKeyHeight = 0;
    this.blackKeyHeight = 0;

    this.variations = [];
    console.log(
      'GeometrySettings: Initialized with perspective=2100, actionBarYRatio=0.66'
    );
  }

  setBest(targetY) {
    let minDiff = Infinity;
    let bestVariation = this.variations[4];

    for (const v of this.variations) {
      const diff = Math.abs(v.actionBarY - targetY);
      if (diff < minDiff) {
        minDiff = diff;
        bestVariation = v;
      }
    }
    Object.assign(this, bestVariation);
    console.log(
      `GeometrySettings: setBest selected Y=${this.actionBarY} for target ${targetY}`
    );
  }

  setMidiRange(minMidi, maxMidi) {
    minMidi = Math.max(0, Math.min(127, parseInt(minMidi) || this.minMidi));
    maxMidi = Math.max(
      minMidi,
      Math.min(127, parseInt(maxMidi) || this.maxMidi)
    );
    if (minMidi !== this.minMidi || maxMidi !== this.maxMidi) {
      this.minMidi = minMidi;
      this.maxMidi = maxMidi;
      return true;
    }
    return false;
  }

}

