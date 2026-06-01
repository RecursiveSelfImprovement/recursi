class PianoLayout {

    

  static getNoteColors() {
      return [
        [255, 0, 0], null, [255, 125, 0], null, [239, 255, 0], [60, 235, 0], null, [0, 145, 255], null, [100, 0, 255], null, [255, 50, 255]
      ];
    }

  static getNoteColorsX() {
      return [
        [[200, 200, 200], [255, 0, 0]],
        [[255, 0, 0]],
        [[255, 0, 0], [255, 125, 0]],
        [[255, 125, 0]],
        [[255, 125, 0], [200, 200, 200]],
        [[200, 200, 200], [60, 235, 0]],
        [[60, 235, 0]],
        [[60, 235, 0], [0, 145, 255]],
        [[0, 145, 255]],
        [[0, 145, 255], [100, 0, 255]],
        [[160, 0, 255]],
        [[160, 0, 255], [200, 200, 200]]
      ];
    }

  static getNoteNames() {
      return ['c', null, 'd', null, 'e', 'f', null, 'g', null, 'a', null, 'b'];
    }

  static getNoteDims() {
      return [0, 30.3572, 50, 90.3572, 100, 150, 178.2143, 200, 235.3572, 250, 292.5, 300, 350];
    }

  

  

  

  

  

  static calculate(geometrySettings, width, tintFn) {
      const gs = geometrySettings;
      const minMidiCode = gs.minMidi;
      const maxMidiCode = gs.maxMidi;
      const fineX = gs.fineX || 0;
      const stretch = (gs.keyStretch || 100) / 100;

      const out = [];
      const map = {};
      const octaveWidth = PianoLayout.getNoteDims()[12];
      const minMod12 = minMidiCode % 12;
      const startDim = PianoLayout.getNoteDims()[minMod12];
      let firstNoteAbsoluteX = octaveWidth * Math.floor(minMidiCode / 12) + startDim;

      for (let i = minMidiCode; i <= maxMidiCode; i++) {
        const logicalNcIndex = i % 12;
        const physicalMidi = gs.leftHanded ? 124 - i : i;
        const physicalNcIndex = physicalMidi % 12;

        const octaveNum = Math.floor(i / 12);
        const absoluteX = octaveWidth * octaveNum + PianoLayout.getNoteDims()[logicalNcIndex];
        const relativeX = absoluteX - firstNoteAbsoluteX;

        const ncColor = PianoLayout.getNoteColors()[physicalNcIndex];
        const isBlack = !ncColor;

        let item = {
          left: relativeX,
          c1: ncColor || [128, 128, 128],
          mc: i,
          isBlack: isBlack,
          name: '',
        };

        if (isBlack) {
          const prevWhiteIndex = (physicalNcIndex - 1 + 12) % 12;
          const nextWhiteIndex = (physicalNcIndex + 1) % 12;
          let physC1 = PianoLayout.getNoteColors()[prevWhiteIndex] || [128, 128, 128];
          let physC2 = PianoLayout.getNoteColors()[nextWhiteIndex] || [128, 128, 128];

          if (gs.leftHanded) {
            item.c1 = physC2;
            item.c2 = physC1;
          } else {
            item.c1 = physC1;
            item.c2 = physC2;
          }
        }

        item.color = PianoLayout.getNoteColorsX()[logicalNcIndex] || [[128, 128, 128]];
        out.push(item);
        map[i] = item;
      }

      const lastItem = out[out.length - 1];
      const totalKeyUnits = lastItem.left + (lastItem.isBlack ? 30 : 50);
      const baseScale = width / totalKeyUnits;
      const finalScale = baseScale * stretch;

      const blackKeyWidth = Math.round(30 * finalScale);
      const whiteKeyWidth = Math.round(50 * finalScale);

      for (const key of out) {
        key.left = Math.round(key.left * finalScale) + fineX;
        key.width = key.isBlack ? blackKeyWidth : whiteKeyWidth;
      }

      if (gs.leftHanded) {
        const rightEdge = out[out.length - 1].left + out[out.length - 1].width;
        const leftEdge = out[0].left;
        for (const key of out) {
          key.left = rightEdge - (key.left - leftEdge) - key.width;
        }
      }

      return {map, array: out};
    }
}

