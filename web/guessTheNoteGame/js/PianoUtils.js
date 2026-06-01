class PianoUtils {
  static PianoKeys = {
    dims: [
      { color: [255, 0, 0], name: 'c' },
      { black: true },
      { color: [255, 128, 0], name: 'd' },
      { black: true },
      { color: [255, 255, 0], name: 'e' },
      { color: [0, 255, 0], name: 'f' },
      { black: true },
      { color: [0, 90, 255], name: 'g' },
      { black: true },
      { color: [128, 0, 255], name: 'a' },
      { black: true },
      { color: [255, 0, 255], name: 'b' },
    ],
  };

  static getNoteColor(midi) {
    const keyIndex = (midi - 12) % 12;
    const key = this.PianoKeys.dims[keyIndex];
    return key.color || [0, 255, 255];
  }

  static getSharpColor(midi) {
    return this.getBlackKeyColors(midi).rightColor;
  }

  static rgbToHex(rgb) {
    return (
      '#' +
      rgb
        .map((c) => {
          const hexValue = Math.max(0, Math.min(255, c)).toString(16);
          return hexValue.length === 1 ? '0' + hexValue : hexValue;
        })
        .join('')
    );
  }

  static toPastel(rgb) {
    return rgb.map((value) => Math.round((value * 2 + 255) / 3));
  }

  static getBlackKeyColors(midi) {
    const keyIndex = midi % 12;
    const key = this.PianoKeys.dims[keyIndex];
    if (!key.black)
      return { leftColor: [0, 255, 255], rightColor: [220, 0, 255] };
    let prevWhiteIndex = (keyIndex + 11) % 12;
    let nextWhiteIndex = (keyIndex + 13) % 12;
    const leftColor = this.PianoKeys.dims[prevWhiteIndex].color;
    const rightColor = this.PianoKeys.dims[nextWhiteIndex].color;
    return { leftColor, rightColor };
  }

  static parseNote(note) {
    if (!note || typeof note !== 'string') return ['C', ''];
    const baseNote = note.charAt(0).toUpperCase();
    const modifier = note.length > 1 ? note.charAt(1) : '';
    return [baseNote, modifier];
  }

  static midiToNoteName(midi) {
    const noteNames = [
      'C',
      'Db',
      'D',
      'Eb',
      'E',
      'F',
      'Gb',
      'G',
      'Ab',
      'A',
      'Bb',
      'B',
    ];
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }

}

