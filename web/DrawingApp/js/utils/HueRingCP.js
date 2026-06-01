class HueRingCP {
  constructor(size = 300) {
    this.size = size;
    this.rotation = 0;
    this.hue = 0;

    this.onHueChange = null;
    this.onColorChange = null;

    this.container = makeElement('div', {
      className: 'hue-ring-component',
      style: {
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        cursor: 'crosshair',
        display: 'block',
        userSelect: 'none',
        boxSizing: 'border-box',
      },
    });

    this.canvas = makeElement('canvas', {
      width: size,
      height: size,
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      },
    });

    this.svgLayer = makeElement('svg:svg', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      },
    });

    this.thumb = makeElement('svg:rect', {
      fill: '#f00',
      stroke: 'white',
      'stroke-width': 2,
      rx: 4,
      ry: 4,
      style: {
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
        transition: 'fill 0.1s',
      },
    });
    this.svgLayer.appendChild(this.thumb);

    this.container.appendChild(this.canvas);
    this.container.appendChild(this.svgLayer);

    this.drawCanvas();
    this.updateThumbPosition();
    this._addEventListeners();
  }

  getElement() {
    return this.container;
  }

  setRotation(deg) {
    this.rotation = deg;
    this.container.style.transform = `rotate(${deg}deg)`;
  }

  setHue(deg) {
    this.hue = deg % 360;
    if (this.hue < 0) this.hue += 360;
    this.updateThumbPosition();
  }

  getHue() {
    return this.hue;
  }

  getColor() {
    const rgb = this.getRGBFromAngle(this.hue);
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  resize(w, h) {
    const size = Math.min(w, h);
    if (size < 10) return;
    this.size = size;
    this.container.style.width = `${size}px`;
    this.container.style.height = `${size}px`;
    this.canvas.width = size;
    this.canvas.height = size;
    this.drawCanvas();
    this.updateThumbPosition();
  }

  drawCanvas() {
    const context = this.canvas.getContext('2d');
    const width = this.canvas.width;
    const height = this.canvas.height;
    context.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY);
    const outerRadius = maxRadius * 0.9;
    const innerRadius = maxRadius * 0.55;
    const paleCenterRadius = (outerRadius + innerRadius) / 2;
    const paleWidth = maxRadius * 0.025;
    const fadeWidth = maxRadius * 0.1;

    const imgData = context.createImageData(width, height);
    const data = imgData.data;

    const interpolateColor = (t, c1, c2) => [
      Math.round(c1[0] + t * (c2[0] - c1[0])),
      Math.round(c1[1] + t * (c2[1] - c1[1])),
      Math.round(c1[2] + t * (c2[2] - c1[2])),
    ];

    const colors = [
      [255, 0, 0],
      [255, 120, 0],
      [255, 255, 0],
      [0, 220, 0],
      [30, 100, 255],
      [200, 0, 255],
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < outerRadius && distance > innerRadius) {
          let angle = Math.atan2(dy, dx);
          let angleDeg = (angle * 180) / Math.PI + 90;
          if (angleDeg < 0) angleDeg += 360;

          const segment = Math.floor(angleDeg / 60);
          const t = (angleDeg % 60) / 60;
          let color = interpolateColor(
            t,
            colors[segment % 6],
            colors[(segment + 1) % 6]
          );

          let alpha = 1;
          if (distance > outerRadius - fadeWidth)
            alpha = (outerRadius - distance) / fadeWidth;
          else if (distance < innerRadius + fadeWidth)
            alpha = (distance - innerRadius) / fadeWidth;

          let glowFactor = 0;
          const distFromPale = Math.abs(distance - paleCenterRadius);
          if (distFromPale < paleWidth / 2) glowFactor = 0.5;
          else if (distFromPale < paleWidth / 2 + fadeWidth)
            glowFactor = 0.5 * (1 - (distFromPale - paleWidth / 2) / fadeWidth);

          if (glowFactor > 0) {
            color = [
              Math.min(
                255,
                Math.round(color[0] + glowFactor * (255 - color[0]))
              ),
              Math.min(
                255,
                Math.round(color[1] + glowFactor * (255 - color[1]))
              ),
              Math.min(
                255,
                Math.round(color[2] + glowFactor * (255 - color[2]))
              ),
            ];
          }

          const index = (y * width + x) * 4;
          data[index] = color[0];
          data[index + 1] = color[1];
          data[index + 2] = color[2];
          data[index + 3] = Math.round(255 * alpha);
        }
      }
    }
    context.putImageData(imgData, 0, 0);
  }

  getRGBFromAngle(angleDeg) {
    angleDeg = angleDeg % 360;
    if (angleDeg < 0) angleDeg += 360;
    const segment = Math.floor(angleDeg / 60);
    const t = (angleDeg % 60) / 60;
    const colors = [
      [255, 0, 0],
      [255, 120, 0],
      [255, 255, 0],
      [0, 220, 0],
      [30, 100, 255],
      [200, 0, 255],
    ];
    const c1 = colors[segment % 6];
    const c2 = colors[(segment + 1) % 6];
    return [
      Math.round(c1[0] + t * (c2[0] - c1[0])),
      Math.round(c1[1] + t * (c2[1] - c1[1])),
      Math.round(c1[2] + t * (c2[2] - c1[2])),
    ];
  }

  updateThumbPosition() {
    const size = this.canvas.width;
    const center = size / 2;
    const outerRadius = (size / 2) * 0.9;
    const innerRadius = (size / 2) * 0.55;
    const ringCenterRadius = (outerRadius + innerRadius) / 2;

    const referenceSize = 250;
    const scaleFactor = Math.sqrt(size / referenceSize);

    const baseHeight = 26;
    const baseWidth = 14;
    const baseStroke = 2.5;

    const thumbH = baseHeight * scaleFactor;
    const thumbW = baseWidth * scaleFactor;
    const strokeW = baseStroke * scaleFactor;

    this.thumb.setAttribute('width', thumbW);
    this.thumb.setAttribute('height', thumbH);
    this.thumb.setAttribute('rx', thumbW * 0.4);
    this.thumb.setAttribute('ry', thumbW * 0.4);
    this.thumb.setAttribute('stroke-width', strokeW);

    const rad = ((this.hue - 90) * Math.PI) / 180;
    const x = center + Math.cos(rad) * ringCenterRadius;
    const y = center + Math.sin(rad) * ringCenterRadius;

    this.thumb.setAttribute('x', x - thumbW / 2);
    this.thumb.setAttribute('y', y - thumbH / 2);
    this.thumb.setAttribute('transform', `rotate(${this.hue}, ${x}, ${y})`);

    if (!this.externalColorOverride) {
      const rgb = this.getRGBFromAngle(this.hue);
      this.thumb.setAttribute('fill', `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
    }
  }

  _addEventListeners() {
    const handleInput = (e) => {
      // Internal listener still useful for standalone usage
      const rect = this.container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      this.processInput(e.clientX - cx, e.clientY - cy);
    };

    this.container.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleInput(e);
      const move = (ev) => handleInput(ev);
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
  }

  setThumbColor(rgbString) {
    // Remove any transition - we're dragging!
    this.thumb.style.transition = 'none';
    this.thumb.setAttribute('fill', rgbString);
  }

  processInput(dx, dy) {
    const radRot = (-this.rotation * Math.PI) / 180;
    const rx = dx * Math.cos(radRot) - dy * Math.sin(radRot);
    const ry = dx * Math.sin(radRot) + dy * Math.cos(radRot);

    let angle = (Math.atan2(ry, rx) * 180) / Math.PI;
    let hue = angle + 90;
    if (hue < 0) hue += 360;

    this.hue = hue;
    this.externalColorOverride = false;
    this.updateThumbPosition();

    if (this.onHueChange) this.onHueChange(this.hue);
    const rgb = this.getRGBFromAngle(this.hue);
    if (this.onColorChange)
      this.onColorChange(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
  }

}

