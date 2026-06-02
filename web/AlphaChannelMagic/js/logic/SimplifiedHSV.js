class SimplifiedHSV {
    static sHsvToRgb([hue, saturation, value]) {
      const rgb = new Array(3);
      const hueMod = hue % 1;
      const segment = 1 / 6;
      const ratio = (segment === 0) ? 0 : (hueMod % segment) / segment;
      const whichPrimary = Math.floor(hueMod / (1 / 3));
      const increasing = (hueMod % (1 / 3)) < segment;
      rgb[0] = 0; rgb[1] = 0; rgb[2] = 0;
      if (increasing) {
        rgb[whichPrimary % 3] = 1;
        rgb[(whichPrimary + 1) % 3] = ratio;
        rgb[(whichPrimary + 2) % 3] = 0;
      } else {
        rgb[whichPrimary % 3] = 1 - ratio;
        rgb[(whichPrimary + 1) % 3] = 1;
        rgb[(whichPrimary + 2) % 3] = 0;
      }
      for (let i = 0; i < 3; i++) {
        const sat = typeof saturation === 'number' ? saturation : 0;
        const val = typeof value === 'number' ? value : 0;
        rgb[i] = (rgb[i] * sat) + (val * (1 - sat));
        rgb[i] = Math.min(Math.max(rgb[i], 0), 1);
      }
      return rgb;
    }

    static rgbToSHsv(rgb) {
      if (!Array.isArray(rgb) || rgb.length < 3 || rgb.some(isNaN)) {
          console.warn("Invalid input to rgbToSHsv:", rgb);
          return [0, 0, 0];
      }
      let maxIdx = 0, minIdx = 0;
      rgb.forEach((val, i) => {
        if (val > rgb[maxIdx]) maxIdx = i;
        if (val < rgb[minIdx]) minIdx = i;
      });
      const maxVal = rgb[maxIdx];
      const minVal = rgb[minIdx];
      const delta = maxVal - minVal;
      const midIndices = [0, 1, 2].filter(i => i !== maxIdx && i !== minIdx);
      const midIdx = (midIndices.length > 0) ? midIndices[0] : maxIdx;
      const midVal = rgb[midIdx];

      let scaledMid, saturation;
      if (delta === 0) {
        scaledMid = 0;
        saturation = 0;
      } else {
        scaledMid = (midVal - minVal) / delta;
        scaledMid = Math.min(Math.max(scaledMid, 0), 1);
        if (scaledMid < 0.5) {
            saturation = (scaledMid >= 1.0) ? 0 : (maxVal - midVal) / (1 - scaledMid);
        } else {
             saturation = (scaledMid <= 0.0) ? 0 : (midVal - minVal) / scaledMid;
         }
        saturation = Math.min(Math.max(saturation, 0), 1);
      }

      let hue = (1 / 6) * scaledMid;
      if ((maxIdx === 0 && midIdx === 2) || (maxIdx === 1 && midIdx === 0) || (maxIdx === 2 && midIdx === 1)) {
        hue = -hue;
      }
      hue += (1 / 3) * maxIdx;
      hue = (hue + 1) % 1;

      let value;
      if (minVal === 0) {
          value = 0;
      } else {
          value = (saturation >= 1.0) ? minVal : minVal / (1 - saturation);
      }
      
      value = Math.min(Math.max(value, 0), 1);

      return [hue, saturation, value];
    }
  }