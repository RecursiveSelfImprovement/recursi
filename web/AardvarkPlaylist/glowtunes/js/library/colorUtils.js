class colorUtils {
  
  
  static tint(color, ratio) {
    if (!color || !Array.isArray(color) || color.length < 3) return '0,0,0';
    const out = [];
    for (let i = 0; i < 3; i++) {
      out[i] = Math.min(
        255,
        Math.max(0, Math.round(color[i] + (255 - color[i]) * ratio))
      );
    }
    return `\${out[0]},\${out[1]},\${out[2]}`;
  }
}

window.colorUtils = colorUtils;
