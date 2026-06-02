class CanvasUtils {
    static getPixel(imageData, x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return [0,0,0,0];
      const index = (y * imageData.width + x) * 4;
      const d = imageData.data;
      return [d[index], d[index + 1], d[index + 2], d[index + 3]];
    }

    static putPixel(imageData, x, y, rgba) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return;
      const index = (y * imageData.width + x) * 4;
      const d = imageData.data;
      d[index] = rgba[0];
      d[index + 1] = rgba[1];
      d[index + 2] = rgba[2];
      d[index + 3] = rgba[3];
    }

    static getAlpha(imageData, x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return 0;
      const index = (y * imageData.width + x) * 4;
      return imageData.data[index + 3];
    }
  }