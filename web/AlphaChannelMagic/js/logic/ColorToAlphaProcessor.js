class ColorToAlphaProcessor {
    constructor(inputImageData, outputCanvas, options = {}) {
      this.inputImageData = inputImageData;
      this.outputCanvas = outputCanvas;
      const defaults = {
        mode: 'hue', 
        targetHue: 120,
        targetRGB: null, 
        tolerance: 60,
        hsMap: null,
        chunkPixels: 5000,
        maskImageData: null,
        maskMap: null,
        onComplete: () => {},
        onProgress: () => {},
      };
      this.options = { ...defaults, ...options };

      this.targetHueNorm = (this.options.targetHue % 360) / 360;
      if (this.targetHueNorm < 0) this.targetHueNorm += 1;

      if (this.options.targetRGB) {
        this.targetR = this.options.targetRGB[0] / 255;
        this.targetG = this.options.targetRGB[1] / 255;
        this.targetB = this.options.targetRGB[2] / 255;
      }

      this.processor = new ChunkedCanvasProcessor(
        this.inputImageData,
        this.outputCanvas,
        {
          chunkPixels: this.options.chunkPixels,
          maskImageData: this.options.maskImageData,
          maskMap: this.options.maskMap,
          processPixel: (rgba, x, y) => this._processPixel(rgba, x, y),
          onComplete: this.options.onComplete,
          onProgress: this.options.onProgress,
        }
      );
    }

    start() {
      this.processor.start();
    }

    stop() {
      if (this.processor) {
        this.processor.stop();
      }
    }

    _processPixel(rgba, x, y) {
      if (this.options.mode === 'black') {
        return this._processPixelBlack(rgba);
      }
      if (this.options.mode === 'color') {
        return this._processPixelColor(rgba);
      }
      return this._processPixelHue(rgba);
    }

    _processPixelBlack(rgba) {
      if (rgba[3] === 0) return rgba;

      const r = rgba[0] / 255;
      const g = rgba[1] / 255;
      const b = rgba[2] / 255;
      const originalAlpha = rgba[3] / 255;

      const threshold = (this.options.tolerance || 0) / 255;

      const adjust = (v) =>
        v <= threshold ? 0 : (v - threshold) / (1 - threshold);

      const rA = adjust(r);
      const gA = adjust(g);
      const bA = adjust(b);

      let newAlpha = Math.max(rA, gA, bA);

      if (newAlpha <= 0) {
        return [0, 0, 0, 0];
      }

      const rPure = rA / newAlpha;
      const gPure = gA / newAlpha;
      const bPure = bA / newAlpha;

      const finalAlpha = newAlpha * originalAlpha;

      return [
        Math.round(rPure * 255),
        Math.round(gPure * 255),
        Math.round(bPure * 255),
        Math.round(finalAlpha * 255),
      ];
    }

    _processPixelHue(rgba) {
      if (rgba[3] === 0) return rgba;

      const r = rgba[0] / 255;
      const g = rgba[1] / 255;
      const b = rgba[2] / 255;
      const originalAlphaNorm = rgba[3] / 255;
      const rgbNorm = [r, g, b];

      let hsv = SimplifiedHSV.rgbToSHsv(rgbNorm); 

      let shiftedHue = (hsv[0] - this.targetHueNorm + 1) % 1;
      let diffNorm = shiftedHue > 0.5 ? 1 - shiftedHue : shiftedHue;
      let diffDegrees = diffNorm * 360;

      if (diffDegrees > this.options.tolerance) {
        return rgba;
      }

      if (this.options.hsMap) {
        diffDegrees = Interpolator.getValue(diffDegrees, this.options.hsMap);
        if (diffDegrees > this.options.tolerance) return rgba;
        diffNorm = Math.min(Math.max(diffDegrees / 360, 0), 0.5);
      }

      const toleranceDivisor = this.options.tolerance;
      const toleranceFactor =
        toleranceDivisor <= 0
          ? diffDegrees === 0
            ? 1.0
            : 0.0
          : 1.0 - Math.min(1.0, diffDegrees / toleranceDivisor);

      const saturation = typeof hsv[1] === 'number' ? hsv[1] : 0;

      let newAlphaNorm = 1.0 - saturation * toleranceFactor;
      newAlphaNorm = Math.min(Math.max(newAlphaNorm, 0), 1);

      let tempRGB = SimplifiedHSV.sHsvToRgb([shiftedHue, saturation, hsv[2]]);
      let newRGB = [0, 0, 0];
      const alphaEpsilon = 0.0001;

      if (newAlphaNorm < alphaEpsilon) {
        const v = hsv[2];
        newRGB = [v, v, v];
      } else {
        newRGB[0] = 1 - (1 - tempRGB[0]) / newAlphaNorm;
        newRGB[1] = tempRGB[1] / newAlphaNorm;
        newRGB[2] = tempRGB[2] / newAlphaNorm;
      }

      newRGB = newRGB.map((v) => Math.min(Math.max(v, 0), 1)); 

      let newHsv = SimplifiedHSV.rgbToSHsv(newRGB);
      newHsv[0] = (newHsv[0] + this.targetHueNorm) % 1; 

      let finalRGBNorm = SimplifiedHSV.sHsvToRgb(newHsv);

      const finalAlphaCombined = newAlphaNorm * originalAlphaNorm;

      let finalPixel = [
        Math.round(finalRGBNorm[0] * 255),
        Math.round(finalRGBNorm[1] * 255),
        Math.round(finalRGBNorm[2] * 255),
        Math.round(finalAlphaCombined * 255),
      ];

      return finalPixel;
    }

    _processPixelColor(rgba) {
      if (rgba[3] === 0) return rgba;

      const r = rgba[0] / 255;
      const g = rgba[1] / 255;
      const b = rgba[2] / 255;
      const originalAlpha = rgba[3] / 255;

      const tR = this.targetR;
      const tG = this.targetG;
      const tB = this.targetB;

      const channelAlpha = (p, t) => {
        const diff = p - t;
        if (Math.abs(diff) < 0.00001) return 0;
        if (diff > 0) {
          return t >= 1.0 ? 0 : diff / (1.0 - t);
        } else {
          return t <= 0.0 ? 0 : -diff / t;
        }
      };

      const aR = channelAlpha(r, tR);
      const aG = channelAlpha(g, tG);
      const aB = channelAlpha(b, tB);

      let rawAlpha = Math.max(aR, aG, aB);
      rawAlpha = Math.min(Math.max(rawAlpha, 0), 1);

      const tolNorm = Math.min(Math.max(this.options.tolerance / 255, 0), 1);

      if (tolNorm < 0.001) {
        const dist = Math.sqrt((r - tR) ** 2 + (g - tG) ** 2 + (b - tB) ** 2);
        if (dist > 0.01) return rgba;
      }

      const maxDist = Math.sqrt(3);
      const dist = Math.sqrt((r - tR) ** 2 + (g - tG) ** 2 + (b - tB) ** 2);
      const distNorm = dist / maxDist; 

      let effectFactor;
      if (distNorm >= tolNorm) {
        effectFactor = 0; 
      } else {
        const t = distNorm / tolNorm; 
        effectFactor = 1.0 - t * t * (3.0 - 2.0 * t);
      }

      if (effectFactor < 0.001) {
        return rgba; 
      }

      let newAlpha = rawAlpha * effectFactor + 1.0 * (1.0 - effectFactor);
      newAlpha = Math.min(Math.max(newAlpha, 0), 1);

      if (newAlpha < 0.001) {
        return [0, 0, 0, 0];
      }

      const reconstruct = (p, t, a) => {
        if (a < 0.001) return p;
        return (p - t * (1.0 - a)) / a;
      };

      let newR = reconstruct(r, tR, newAlpha);
      let newG = reconstruct(g, tG, newAlpha);
      let newB = reconstruct(b, tB, newAlpha);

      newR = Math.min(Math.max(newR, 0), 1);
      newG = Math.min(Math.max(newG, 0), 1);
      newB = Math.min(Math.max(newB, 0), 1);

      const finalAlpha = newAlpha * originalAlpha;

      return [
        Math.round(newR * 255),
        Math.round(newG * 255),
        Math.round(newB * 255),
        Math.round(finalAlpha * 255),
      ];
    }
  }