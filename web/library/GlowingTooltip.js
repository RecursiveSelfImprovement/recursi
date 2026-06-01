class GlowingTooltip {
    constructor(options = {}) {
      this.options = {
        pointerHeight: 70,
        pointerWidth: 8,
        radius: 10,
        targetOffsetY: 1,
      };
      this._createElements();
      document.body.appendChild(this.element);
      this.update(options);
    }

    _createElements() {
      this.element = makeElement('div', {
        style: {
          position: 'absolute',
          zIndex: 1000000001,
          pointerEvents: 'none',
          opacity: '0',
          transition: 'opacity 0.15s ease-out',
        },
      });
      this.textElement = makeElement('div', {
        style: {
          position: 'relative',
          zIndex: 1,
          textShadow: '0 0 3px black, 0 0 3px black, 0 0 3px black',
          textAlign: 'center',
        },
      });

      const glowFilterId = `glow-blur-${Math.random().toString(36).substr(2, 9)}`;
      const coreFilterId = `core-blur-${Math.random().toString(36).substr(2, 9)}`;
      this.glowBlurFilter = makeElement('svg:feGaussianBlur');
      this.coreBlurFilter = makeElement('svg:feGaussianBlur');

      this.path_bg = makeElement('svg:path');
      this.path_glow = makeElement('svg:path', {
        filter: `url(#${glowFilterId})`,
      });
      this.path_core = makeElement('svg:path', {
        filter: `url(#${coreFilterId})`,
      });

      this.pathGroup = makeElement(
        'svg:g',
        {},
        this.path_bg,
        this.path_glow,
        this.path_core
      );

      this.svgElement = makeElement(
        'svg:svg',
        { style: { position: 'absolute', top: 0, left: 0, overflow: 'visible' } },
        [
          makeElement('svg:defs', {}, [
            makeElement('svg:filter', { id: glowFilterId }, this.glowBlurFilter),
            makeElement('svg:filter', { id: coreFilterId }, this.coreBlurFilter),
          ]),
        ],
        this.pathGroup
      );

      this.element.appendChild(this.svgElement);
      this.element.appendChild(this.textElement);
    }

    update(options) {
      Object.assign(this.options, options);

      const {
        text = 'Tooltip Text',
        color = [0, 229, 255],
        maxWidth = 200,
        padding = 10,
        fontSize = 13,
        glowSize = 7.5,
        coreBlur = 1.4,
        glowThickness = 3,
        coreThickness = 0.3,
        pointerHeight,
        bgColorOpacity = 0.8,
        glowMargin = 30,
        pointerDown = false,
        allowHtml = false,
      } = this.options;

      const finalTextColor = this.options.textColor
        ? this._formatRgb(this.options.textColor)
        : this._formatRgb(this._mixColor(color, [255, 255, 255], 0.85));
      const finalBgColorRgb = this.options.bgColor
        ? this.options.bgColor
        : this._mixColor(color, [0, 0, 0], 0.9);
      const finalBgColor = this._formatRgb(finalBgColorRgb, bgColorOpacity);
      const finalGlowColor = this._formatRgb(color);

      if (allowHtml) {
        this.textElement.innerHTML = text;
      } else {
        this.textElement.textContent = text;
      }

      this.textElement.style.color = finalTextColor;

      this.textElement.style.maxWidth =
        typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

      this.textElement.style.padding = `${padding}px`;
      this.textElement.style.fontSize = `${fontSize}px`;
      this.textElement.style.transform = `translateY(${
        pointerDown ? 0 : pointerHeight
      }px)`;

      this.element.style.visibility = 'hidden';
      const textRect = this.textElement.getBoundingClientRect();
      const w = textRect.width,
        h = textRect.height;
      this.element.style.visibility = 'visible';

      const { finalLeft, pointerOffsetX } = this._calculateOnScreenPosition(w);
      this.options.pointerOffsetX = pointerOffsetX;

      this.svgElement.setAttribute('width', w + glowMargin * 2);
      this.svgElement.setAttribute('height', h + pointerHeight + glowMargin * 2);
      this.svgElement.style.left = `-${glowMargin}px`;
      this.svgElement.style.top = `-${glowMargin}px`;
      this.pathGroup.setAttribute(
        'transform',
        `translate(${glowMargin}, ${glowMargin})`
      );

      const { openPath, closedPath } = this._generatePaths(w, h);

      this.path_bg.setAttribute('d', closedPath);
      this.path_bg.setAttribute('fill', finalBgColor);
      this.path_bg.setAttribute('stroke', 'none');
      this.path_glow.setAttribute('d', openPath);
      this.path_glow.setAttribute('stroke', finalGlowColor);
      this.path_glow.setAttribute('stroke-width', glowThickness);
      this.path_glow.setAttribute('fill', 'none');
      this.path_core.setAttribute('d', openPath);
      this.path_core.setAttribute('stroke', 'white');
      this.path_core.setAttribute('stroke-width', coreThickness);
      this.path_core.setAttribute('fill', 'none');
      this.glowBlurFilter.setAttribute('stdDeviation', glowSize);
      this.coreBlurFilter.setAttribute('stdDeviation', coreBlur);

      this._position(finalLeft, h + pointerHeight);
    }

    _mixColor(color1, color2, weight) {
      const w1 = 1 - weight,
        w2 = weight;
      return [
        Math.round(color1[0] * w1 + color2[0] * w2),
        Math.round(color1[1] * w1 + color2[1] * w2),
        Math.round(color1[2] * w1 + color2[2] * w2),
      ];
    }

    _formatRgb(rgbArray, alpha = 1) {
      const [r, g, b] = rgbArray;
      return alpha < 1
        ? `rgba(${r}, ${g}, ${b}, ${alpha})`
        : `rgb(${r}, ${g}, ${b})`;
    }

    _generatePaths(w, h) {
      const {
        radius: r = 10,
        pointerWidth: pW = 8,
        pointerHeight: pH = 80,
        pointerOffsetX,
        pointerDown = false,
      } = this.options;

      const pR = 4,
        sweep = { convex: 1, concave: 0 };
      const x_left = 0,
        x_right = w;
      const max_offset = w / 2 - pW / 2 - r - pR;
      const clampedOffsetX = Math.max(
        -max_offset,
        Math.min(pointerOffsetX, max_offset)
      );
      const pX_center = w / 2 + clampedOffsetX;
      const p_tip_r_x = pX_center + pW / 2,
        p_tip_l_x = pX_center - pW / 2;

      let openPath;
      if (!pointerDown) {
        const y_box_edge = pH,
          y_far_edge = pH + h;
        openPath = `M ${p_tip_r_x} 0 L ${p_tip_r_x} ${
          y_box_edge - pR
        } A ${pR} ${pR} 0 0 ${sweep.concave} ${p_tip_r_x + pR} ${y_box_edge} L ${
          x_right - r
        } ${y_box_edge} A ${r} ${r} 0 0 ${sweep.convex} ${x_right} ${
          y_box_edge + r
        } L ${x_right} ${y_far_edge - r} A ${r} ${r} 0 0 ${sweep.convex} ${
          x_right - r
        } ${y_far_edge} L ${x_left + r} ${y_far_edge} A ${r} ${r} 0 0 ${
          sweep.convex
        } ${x_left} ${y_far_edge - r} L ${x_left} ${
          y_box_edge + r
        } A ${r} ${r} 0 0 ${sweep.convex} ${x_left + r} ${y_box_edge} L ${
          p_tip_l_x - pR
        } ${y_box_edge} A ${pR} ${pR} 0 0 ${sweep.concave} ${p_tip_l_x} ${
          y_box_edge - pR
        } L ${p_tip_l_x} 0`;
      } else {
        const y_box_edge = h,
          y_far_edge = 0,
          y_tip = h + pH;
        openPath = `M ${p_tip_l_x} ${y_tip} L ${p_tip_l_x} ${
          y_box_edge + pR
        } A ${pR} ${pR} 0 0 ${sweep.concave} ${p_tip_l_x - pR} ${y_box_edge} L ${
          x_left + r
        } ${y_box_edge} A ${r} ${r} 0 0 ${sweep.convex} ${x_left} ${
          y_box_edge - r
        } L ${x_left} ${y_far_edge + r} A ${r} ${r} 0 0 ${sweep.convex} ${
          x_left + r
        } ${y_far_edge} L ${x_right - r} ${y_far_edge} A ${r} ${r} 0 0 ${
          sweep.convex
        } ${x_right} ${y_far_edge + r} L ${x_right} ${
          y_box_edge - r
        } A ${r} ${r} 0 0 ${sweep.convex} ${x_right - r} ${y_box_edge} L ${
          p_tip_r_x + pR
        } ${y_box_edge} A ${pR} ${pR} 0 0 ${sweep.concave} ${p_tip_r_x} ${
          y_box_edge + pR
        } L ${p_tip_r_x} ${y_tip}`;
      }
      return { openPath, closedPath: `${openPath} Z` };
    }

    _position(finalLeft, totalTooltipHeight) {
      const { target, targetOffsetY, pointerDown = false } = this.options;
      const targetEl =
        typeof target === 'string' ? document.querySelector(target) : target;
      if (!targetEl || !targetEl.isConnected) {
        this.destroy();
        return;
      }

      const targetRect = targetEl.getBoundingClientRect();
      const top = pointerDown
        ? targetRect.top + window.scrollY - totalTooltipHeight - targetOffsetY
        : targetRect.bottom + window.scrollY + targetOffsetY;

      this.element.style.top = `${top}px`;
      this.element.style.left = `${finalLeft}px`;
    }

    destroy() {
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
    }

    static show(targetElement, text, options = {}) {
      clearTimeout(this.showTimeout);
      clearTimeout(this.hideTimeout);

      if (this.activeInstance) {
        this.activeInstance.fadeOutAndDestroy(true);
      }
      this.activeInstance = null;

      this.showTimeout = setTimeout(() => {
        if (!targetElement.isConnected) return;

        const rect = targetElement.getBoundingClientRect();
        const pointerHeight = options.pointerHeight || 80;
        const textHeightEstimate = 50;
        const totalHeightEstimate = textHeightEstimate + pointerHeight;
        const pointerDown =
          rect.bottom + totalHeightEstimate + 20 > window.innerHeight;

        const defaultOffsetY = 1;
        const targetOffsetY = pointerDown ? -defaultOffsetY : defaultOffsetY;

        const finalOptions = {
          target: targetElement,
          text,
          pointerDown,
          targetOffsetY,
          ...options,
        };

        const instance = new GlowingTooltip(finalOptions);
        instance.fadeIn();
        this.activeInstance = instance;
      }, 200);
    }

    static hide(fast = false) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;

      if (this.activeInstance) {
        this.hideTimeout = setTimeout(
          () => {
            if (this.activeInstance) {
              this.activeInstance.fadeOutAndDestroy(fast);
              this.activeInstance = null;
            }
          },
          fast ? 0 : 100
        );
      }
    }

    fadeIn() {
      requestAnimationFrame(() => {
        if (this.element) {
          this.element.style.opacity = '1';
        }
      });
    }

    fadeOutAndDestroy(fast = false) {
      if (!this.element) return;
      this.element.style.transitionDuration = fast ? '0.05s' : '0.15s';
      this.element.style.opacity = '0';
      setTimeout(() => this.destroy(), fast ? 50 : 150);
    }

    _calculateOnScreenPosition(tooltipWidth) {
      const { target, targetOffsetX = 0 } = this.options;
      const targetEl =
        typeof target === 'string' ? document.querySelector(target) : target;
      if (!targetEl) return { finalLeft: 0, pointerOffsetX: 0 };

      const targetRect = targetEl.getBoundingClientRect();

      let finalLeft =
        targetRect.left +
        window.scrollX +
        targetRect.width / 2 -
        tooltipWidth / 2 +
        targetOffsetX;
      let pointerOffsetX = 0;
      const padding = 5;

      const tooltipRightEdge = finalLeft + tooltipWidth;
      if (tooltipRightEdge > window.innerWidth - padding) {
        const overflow = tooltipRightEdge - (window.innerWidth - padding);
        finalLeft -= overflow;
        pointerOffsetX = overflow;
      }

      if (finalLeft < padding) {
        const underflow = padding - finalLeft;
        finalLeft += underflow;
        pointerOffsetX = -underflow;
      }

      return { finalLeft, pointerOffsetX };
    }
  }