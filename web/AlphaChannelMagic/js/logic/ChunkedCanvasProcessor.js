class ChunkedCanvasProcessor {
    constructor(inputImageData, outputCanvas, options = {}) {
      this.inputImageData = inputImageData;
      this.outputCanvas = outputCanvas;
      this.ctx = outputCanvas.getContext('2d');
      this.width = inputImageData.width;
      this.height = inputImageData.height;

      this.chunkPixels = options.chunkPixels || 5000;
      this.linesPerChunk = Math.max(1, Math.round(this.chunkPixels / this.width));
      this.processPixel = options.processPixel;
      this.maskImageData = options.maskImageData || null;
      this.maskMap = options.maskMap || null;
      this.onComplete = options.onComplete || function () {};
      this.onProgress = options.onProgress || function () {};

      this.currentRow = 0;
      this.outputChunkData = null; 
      this.timeoutId = null;
    }

    start() {
      this.currentRow = 0;
      this._processChunk();
    }

    stop() {
       if(this.timeoutId) {
           clearTimeout(this.timeoutId);
           this.timeoutId = null;
       }
    }

    _processChunk() {
      const rows = Math.min(this.linesPerChunk, this.height - this.currentRow);
      if (!this.outputChunkData || this.outputChunkData.height !== rows) {
          this.outputChunkData = this.ctx.createImageData(this.width, rows);
      }

      for (let r = 0; r < rows; r++) {
        const actualRow = this.currentRow + r;
        for (let c = 0; c < this.width; c++) {
          const originalPixel = CanvasUtils.getPixel(this.inputImageData, c, actualRow);
          let processedPixel = this.processPixel(originalPixel, c, actualRow);
          if (this.maskImageData) {
            processedPixel = this._applyMask(originalPixel, processedPixel, c, actualRow);
          }
          CanvasUtils.putPixel(this.outputChunkData, c, r, processedPixel);
        }
      }

      this.ctx.putImageData(this.outputChunkData, 0, this.currentRow);
      this.currentRow += rows;
      this.onProgress(this.currentRow / this.height);

      if (this.currentRow < this.height) {
        this.timeoutId = setTimeout(() => this._processChunk(), 1);
      } else {
        this.timeoutId = null;
        this.onComplete();
      }
    }

    _applyMask(originalPixel, processedPixel, x, y) {
      const maskAlpha = CanvasUtils.getAlpha(this.maskImageData, x, y);
      let a = maskAlpha / 255;
      if (this.maskMap) {
        a = Interpolator.getValue(a, this.maskMap);
      }
      a = Math.min(Math.max(a, 0), 1);

      const blended = [];
      for (let i = 0; i < 4; i++) {
         blended[i] = Math.round(processedPixel[i] * (1 - a) + originalPixel[i] * a);
      }
      return blended;
    }
  }