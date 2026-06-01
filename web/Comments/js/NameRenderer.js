class NameRenderer {
  /**
   * Renders a display name string into an HTML string with colored spans.
   * @param {string} name - The display name.
   * @returns {string} The resulting HTML.
   */
  static render(name) {
    if (!name) return '';

    const DEFAULT_COLOR = 'rgb(3, 174, 192)';
    const colors = [
      [255, 0, 0],
      [255, 125, 0],
      [239, 255, 0],
      [0, 235, 0],
      [0, 120, 255],
      [150, 50, 255],
      [255, 0, 255],
      [255, 0, 0],
    ];

    let html = '';
    let currentColor = DEFAULT_COLOR;
    const segments = name.split('@');

    html += `<span style='color:${currentColor}'>${segments[0]}</span>`;

    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      let hueValue = '';
      let textIndex = 0;

      while (
        textIndex < segment.length &&
        '.1234567890'.includes(segment[textIndex])
      ) {
        hueValue += segment[textIndex];
        textIndex++;
      }

      if (hueValue) {
        currentColor = this._getColorFromHue(parseFloat(hueValue), colors);
      } else {
        currentColor = DEFAULT_COLOR;
      }

      const textPart = segment.substring(textIndex);
      if (textPart) {
        html += `<span style='color:${currentColor}'>${textPart}</span>`;
      }
    }

    return html;
  }

  /**
   * Helper to calculate an RGB color string from a numeric hue.
   * @private
   */
  static _getColorFromHue(hue, colors) {
    const h = hue % 7;
    const baseHue = Math.floor(h);
    const nextHue = (baseHue + 1) % 7;
    const ratio = h - baseHue;
    const c1 = colors[baseHue];
    const c2 = colors[nextHue];
    return `rgb(${Math.round(c2[0] * ratio + c1[0] * (1 - ratio))},${Math.round(
      c2[1] * ratio + c1[1] * (1 - ratio)
    )},${Math.round(c2[2] * ratio + c1[2] * (1 - ratio))})`;
  }

  /**
   * Normalizes a name for uniqueness checks.
   */
  static normalize(name) {
    if (!name) return '';
    const noColor = name.replace(/@([0-9\.]*)?/g, '');
    return noColor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

}

