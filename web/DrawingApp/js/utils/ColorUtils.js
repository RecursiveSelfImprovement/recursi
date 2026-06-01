class ColorUtils {
  /**
   * Converts an HSV color value to an array of RGB values.
   * @param {number} h - Hue (0-1)
   * @param {number} s - Saturation (0-1)
   * @param {number} v - Value (0-1)
   * @returns {number[]} - Array of [r, g, b] values (0-255)
   */
  static hsvToRgbArray(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Converts an RGB color value to HSV. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
   * @param   {number}  r       The red color value
   * @param   {number}  g       The green color value
   * @param   {number}  b       The blue color value
   * @return  {Object}          The HSV representation {h, s, v}
   */
  static rgbToHsv(r, g, b) {
    (r /= 255), (g /= 255), (b /= 255);

    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      v = max;

    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0; // achromatic
    } else {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s, v: v };
  }

  /**
   * Parses an "rgb(r, g, b)" string into an array of numbers.
   * @param {string} rgbString
   * @returns {number[] | null}
   */
  static rgbStringToRgbArray(rgbString) {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3], 10),
      ];
    }
    return null;
  }

}

