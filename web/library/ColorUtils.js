// js/utils/ColorUtils.js

/**
 * Utility functions for color conversions.
 */
const ColorUtils = {

  /**
   * Converts a hexadecimal color number to HSL object.
   * @param {number} hex - The hexadecimal color value (e.g., 0xff0000).
   * @returns {{h: number, s: number, l: number}} HSL values (h: 0-360, s/l: 0-1).
   */
  hexToHSL: (hex) => {
      const hexStr = hex.toString(16).padStart(6, "0");
      const r = parseInt(hexStr.substring(0, 2), 16) / 255;
      const g = parseInt(hexStr.substring(2, 4), 16) / 255;
      const b = parseInt(hexStr.substring(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
          h = s = 0; // achromatic
      } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
      }
      return { h: h * 360, s: s, l: l };
  },

  /**
   * Converts HSL values to a hexadecimal color number.
   * @param {number} h - Hue (0-360).
   * @param {number} s - Saturation (0-1).
   * @param {number} l - Lightness (0-1).
   * @returns {number} The hexadecimal color value (e.g., 0xff0000).
   */
  hslToHex: (h, s, l) => {
      h /= 360; // Normalize hue
      let r, g, b;

      if (s === 0) {
          r = g = b = l; // achromatic
      } else {
          const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1 / 6) return p + (q - p) * 6 * t;
              if (t < 1 / 2) return q;
              if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
              return p;
          };
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1 / 3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1 / 3);
      }

      const toHex = (x) => {
          const hex = Math.round(x * 255).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
      };

      const hexString = toHex(r) + toHex(g) + toHex(b);
      return parseInt(hexString, 16);
  }
};
