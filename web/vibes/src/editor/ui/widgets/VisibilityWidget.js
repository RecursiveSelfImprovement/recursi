class VisibilityWidget {
  
  constructor(options = {}) {
      this.options = {
        fileData: { name: 'unknown.js', code: 100, docs: 50, path: '' },
        maxSizes: { maxCodeLength: 100, maxDocsLength: 100 },
        initialState: { code: true, signatures: false, docsLevel: 0 },
        onChange: () => {},
        ...options,
      };

      this.file = { ...this.options.fileData };
      this.state = { ...this.options.initialState };

      this.lastClickTimestamp = 0;
      this.lastDirection = 'up';

      // OBSOLETE: activeGlowBoxes is obsolete and slated to be trashed on the next pass.
      // Button highlighting with GlowBox has been decommissioned.
      this.activeGlowBoxes = new Map();

      this.colors = {
        header: '#d98e48',
        code: '#0088ff',
        docs: '#8433ff',
        textLight: '#c0c0c0',
        textDark: '#1e1e1e',
      };

      this.TRANSPARENT_FILL = 'rgba(255,255,255,0.01)';
      this.svgElement = null;
      this.render();
    }

  getElement() {
    return this.svgElement;
  }

  setState(newState, silent = false) {
    const changed = JSON.stringify(this.state) !== JSON.stringify(newState);
    this.state = { ...this.state, ...newState };
    this.redraw();
    if (changed && !silent && this.options.onChange) {
      this.options.onChange(this.state);
    }
  }

  updateSizes(newSizes, newMaxSizes) {
    let needsRedraw = false;

    if (
      newSizes &&
      newSizes.code !== undefined &&
      this.file.code !== newSizes.code
    ) {
      this.file.code = Math.max(0, Number(newSizes.code) || 0);
      needsRedraw = true;
    }

    if (
      newSizes &&
      newSizes.docs !== undefined &&
      this.file.docs !== newSizes.docs
    ) {
      this.file.docs = Math.max(0, Number(newSizes.docs) || 0);
      needsRedraw = true;
    }

    if (
      newSizes &&
      newSizes.isStructured !== undefined &&
      this.file.isStructured !== !!newSizes.isStructured
    ) {
      this.file.isStructured = !!newSizes.isStructured;
      needsRedraw = true;
    }

    if (
      newSizes &&
      newSizes.hasDocs !== undefined &&
      this.file.hasDocs !== !!newSizes.hasDocs
    ) {
      this.file.hasDocs = !!newSizes.hasDocs;
      needsRedraw = true;
    }

    if (newMaxSizes) {
      const nextMaxSizes = { ...(this.options.maxSizes || {}), ...newMaxSizes };
      if (
        JSON.stringify(this.options.maxSizes || {}) !==
        JSON.stringify(nextMaxSizes)
      ) {
        this.options.maxSizes = nextMaxSizes;
        needsRedraw = true;
      }
    }

    if (needsRedraw) {
      this.redraw();
    }
  }

  render() {
    this.svgElement = this._createWidgetSvg();
    this._addEventListeners();
  }

  redraw() {
    const newSvg = this._createWidgetSvg();
    if (this.svgElement && this.svgElement.parentNode) {
      this.svgElement.parentNode.replaceChild(newSvg, this.svgElement);
    }
    this.svgElement = newSvg;
    this._addEventListeners();
  }

  _createWidgetSvg() {
    const maxSizes = this.options.maxSizes || {};

    const clamp = (value, fallback, min, max) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return fallback;
      return Math.max(min, Math.min(max, n));
    };

    const maxCodeLength = clamp(
      maxSizes.maxCodeLength ?? maxSizes.code ?? maxSizes.maxCode ?? maxSizes.codeSize,
      62,
      22,
      92
    );

    const maxDocsLength = clamp(
      maxSizes.maxDocsLength ?? maxSizes.docs ?? maxSizes.maxDocs ?? maxSizes.docSize,
      38,
      18,
      56
    );

    const height = 16;
    const strokeWidth = 1.5;
    const headerLength = 10;
    const labelPadding = 26;
    const minWidthForInternalText = 25;

    const codeLines = Math.max(0, Number(this.file.code || 0) || 0);
    const docsLines = Math.max(0, Number(this.file.docs || 0) || 0);
    const hasDocs = !!this.file.hasDocs || docsLines > 0;

    const codeLength =
      codeLines > 0
        ? Math.min(maxCodeLength, Math.max(10, this._scaleValue(codeLines, 10, 1.2)))
        : 0;

    const docsLength =
      hasDocs
        ? Math.min(maxDocsLength, Math.max(10, this._scaleValue(Math.max(1, docsLines), 10, 1.2)))
        : 0;

    const totalWidth =
      labelPadding +
      maxCodeLength +
      headerLength +
      (hasDocs ? maxDocsLength : 0) +
      labelPadding;

    const widgetKey = String(this.file.path || this.file.name || 'file');
    const glowFilterId = `glow-${widgetKey.replace(/[^a-zA-Z0-9]/g, '-')}`;

    const svg = makeElement('svg:svg', {
      height,
      width: totalWidth,
      viewBox: `0 0 ${totalWidth} ${height}`,
      'data-widget-path': this.file.path,
      class: 'visibility-widget-svg',
      style: {
        overflow: 'visible',
        cursor: 'pointer',
        verticalAlign: 'middle',
        display: 'block',
        flex: '0 0 auto',
        background: 'transparent',
      },
    });

    const defs = makeElement('svg:defs');
    defs.innerHTML = `
      <filter id="${glowFilterId}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="white" flood-opacity="0.6"/>
      </filter>
    `;
    svg.appendChild(defs);

    const drawingStartX = labelPadding;
    const headerStartX = drawingStartX + maxCodeLength;
    const docsStartX = headerStartX + headerLength;
    const fillLightness = 20;
    const commonPathAttrs = { 'data-filename': this.file.name };

    // --- CODE CAPSULE (Left side, grows middle-out to the left) ---
    if (codeLength > 0) {
      const codePath = this._getCapsulePath({
        x: headerStartX - codeLength,
        y: height / 2,
        length: codeLength,
        thickness: height,
        invertLeft: false,
        invertRight: true, // Anchor right edge to middle block
      });

      const isPartiallyFilled = this.state.codeLevel !== undefined && this.state.codeLevel > 0 && this.state.codeLevel < 4;

      if (isPartiallyFilled) {
        const innerFillHeight = height - strokeWidth;
        const codePortion = Math.max(0, Math.min(1, this.state.codeLevel / 4));
        const filledLength = Math.max(2, codeLength * codePortion);
        
        const filledPath = this._getCapsulePath({
          x: headerStartX - filledLength,
          y: height / 2,
          length: filledLength,
          thickness: innerFillHeight,
          invertLeft: false, // FIX: Allow left edge to draw a standard curve
          invertRight: true, // Right edge anchored flat against header
        });

        svg.appendChild(
          makeElement('svg:path', {
            d: codePath,
            stroke: 'none',
            fill: this.TRANSPARENT_FILL,
          })
        );

        svg.appendChild(
          makeElement('svg:path', {
            d: filledPath,
            fill: this._lightenColor(this.colors.code, fillLightness),
            stroke: 'none',
            style: 'pointer-events: none;',
          })
        );

        svg.appendChild(
          makeElement('svg:path', {
            ...commonPathAttrs,
            'data-segment': 'code',
            d: codePath,
            stroke: this.colors.code,
            'stroke-width': strokeWidth,
            fill: 'transparent',
          })
        );
      } else {
        svg.appendChild(
          makeElement('svg:path', {
            ...commonPathAttrs,
            'data-segment': 'code',
            d: codePath,
            stroke: this.colors.code,
            'stroke-width': strokeWidth,
            fill: this.state.code
              ? this._lightenColor(this.colors.code, fillLightness)
              : this.TRANSPARENT_FILL,
          })
        );
      }

      this._createTextLabel({
        svg,
        value: codeLines,
        segmentLength: codeLength,
        segmentX: headerStartX - codeLength,
        y: height / 2,
        isSelected: this.state.code,
        minWidthForInternal: minWidthForInternalText,
        position: 'left',
        isCodePartiallyFilled: isPartiallyFilled
      });
    }

    // --- DOCS CAPSULE (Right side, grows middle-out to the right) ---
    if (hasDocs && docsLength > 0) {
      const docsPath = this._getCapsulePath({
        x: docsStartX,
        y: height / 2,
        length: docsLength,
        thickness: height,
        invertLeft: true, // Anchor left edge to middle block
        invertRight: false,
      });

      if (this.state.docsLevel > 0 && this.state.docsLevel < 4) {
        const innerFillHeight = height - strokeWidth;
        const docPortion = Math.max(0, Math.min(1, this.state.docsLevel / 4));
        const filledPath = this._getCapsulePath({
          x: docsStartX,
          y: height / 2,
          length: Math.max(2, docsLength * docPortion),
          thickness: innerFillHeight,
          invertLeft: true, // Anchor left edge
          invertRight: false, // FIX: Allow right edge to draw a standard curve
        });

        svg.appendChild(
          makeElement('svg:path', {
            d: filledPath,
            fill: this._lightenColor(this.colors.docs, fillLightness),
            stroke: 'none',
            style: 'pointer-events: none;',
          })
        );
      }

      svg.appendChild(
        makeElement('svg:path', {
          ...commonPathAttrs,
          'data-segment': 'docs',
          d: docsPath,
          stroke: this.colors.docs,
          'stroke-width': strokeWidth,
          fill: this.state.docsLevel >= 4
              ? this._lightenColor(this.colors.docs, fillLightness)
              : this.TRANSPARENT_FILL,
        })
      );

      this._createTextLabel({
        svg,
        value: docsLines || 1,
        segmentLength: docsLength,
        segmentX: docsStartX,
        y: height / 2,
        isSelected: this.state.docsLevel > 0,
        minWidthForInternal: minWidthForInternalText,
        position: 'right',
        docsLevel: this.state.docsLevel,
      });
    }

    // --- SIGNATURES CAPSULE (Center) ---
    const isSignatureAvailable =
      !!this.file.isStructured ||
      /\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(String(this.file.name || ''));

    const headerPath = this._getCapsulePath({
      x: headerStartX,
      y: height / 2,
      length: headerLength,
      thickness: height,
      invertLeft: false,
      invertRight: false,
    });

    const headerAttrs = {
      ...commonPathAttrs,
      'data-segment': 'header',
      d: headerPath,
      'stroke-width': strokeWidth,
    };

    if (isSignatureAvailable) {
      headerAttrs.stroke = this.colors.header;
      headerAttrs.fill = this.state.signatures
        ? this._lightenColor(this.colors.header, fillLightness)
        : this.TRANSPARENT_FILL;
    } else {
      headerAttrs.stroke = '#666';
      headerAttrs.fill = '#444';
      headerAttrs['data-disabled'] = 'true';
      headerAttrs.style = { cursor: 'default' };
    }

    svg.appendChild(makeElement('svg:path', headerAttrs));

    return svg;
  }

  _addEventListeners() {
    this.svgElement.addEventListener('mouseover', (e) => {
      const path = e.target.closest('path[data-segment]');
      if (!path) return;

      const segment = path.dataset.segment;
      const isDisabled = path.getAttribute('data-disabled') === 'true';

      if (!isDisabled) {
        const glowFilterId = `glow-${path.dataset.filename.replace(
          /[^a-zA-Z0-9]/g,
          '-'
        )}`;
        path.style.filter = `url(#${glowFilterId})`;
      }

      const content = this._getTooltipContent(segment, isDisabled);
      const colorMap = {
        code: [0, 140, 255],
        header: isDisabled ? [100, 100, 100] : [255, 120, 0], // Gray for disabled
        docs: [132, 51, 255],
      };
      const options = { color: colorMap[segment] };
      GlowingTooltip.show(path, content, options);
    });

    this.svgElement.addEventListener('mouseout', (e) => {
      const path = e.target.closest('path[data-segment]');
      if (!path) return;

      path.style.filter = '';
      GlowingTooltip.hide();
    });

    this.svgElement.addEventListener('click', (e) => {
      const path = e.target.closest('path[data-segment]');
      if (!path || path.getAttribute('data-disabled') === 'true') return;

      GlowingTooltip.hide(true); // Instantly hide on click
      this.toggleSegment(path.dataset.segment);
    });
  }

  _scaleValue(value, minLength = 8, factor = 1.5) {
    const n = Number(value) || 0;
    if (n <= 0) return 0;

    // Smart compression: small files still show meaningful size differences,
    // giant files stop eating the entire tree row.
    return minLength + Math.sqrt(n) * factor;
  }

  _lightenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16),
      amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt,
      G = ((num >> 8) & 0x00ff) + amt,
      B = (num & 0x0000ff) + amt;
    const newHex = (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1);
    return `#${newHex}`;
  }

  _getCapsulePath(props) {
    const {
      x,
      y,
      length,
      thickness,
      invertLeft = false,
      invertRight = false,
    } = props;
    const radius = thickness / 2;
    if (radius <= 0) return '';
    const rightSweepFlag = invertRight ? 0 : 1;
    const leftSweepFlag = invertLeft ? 0 : 1;
    return `M ${x} ${y - radius} L ${x + length} ${
      y - radius
    } A ${radius} ${radius} 0 0 ${rightSweepFlag} ${x + length} ${
      y + radius
    } L ${x} ${y + radius} A ${radius} ${radius} 0 0 ${leftSweepFlag} ${x} ${
      y - radius
    } Z`;
  }

  _createTextLabel(data) {
    const {
      svg,
      value,
      segmentLength,
      segmentX,
      isSelected,
      minWidthForInternal,
      position,
      y,
      docsLevel,
    } = data;

    if (value === null || value === undefined || value === '') return;

    const valueText = String(value);

    const textProps = {
      y,
      'font-family': 'system-ui, sans-serif',
      'font-size': '10px',
      'font-weight': '500',
      'dominant-baseline': 'central',
      textContent: valueText,
      style: 'pointer-events: none;',
    };

    const height = 16;
    const radius = height / 2;
    const effectiveTextWidth = Math.max(0, segmentLength - radius);
    const estimatedTextWidth = valueText.length * 6;

    const isDocsPartiallyFilled =
      position === 'right' &&
      docsLevel !== undefined &&
      docsLevel > 0 &&
      docsLevel < 4;

    const isCodePartiallyFilled =
      position === 'left' && data.isCodePartiallyFilled;

    if (
      effectiveTextWidth >= estimatedTextWidth &&
      segmentLength >= minWidthForInternal &&
      !isDocsPartiallyFilled &&
      !isCodePartiallyFilled
    ) {
      const segmentCenter = segmentX + segmentLength / 2;
      const minimalOffset = segmentLength * 0.1;

      textProps.x =
        position === 'left'
          ? segmentCenter - minimalOffset
          : segmentCenter + minimalOffset;

      textProps['text-anchor'] = 'middle';
      textProps.fill = isSelected
        ? this.colors.textDark
        : this.colors.textLight;
    } else {
      const padding = 12;
      textProps.fill = this.colors.textLight;

      if (position === 'left') {
        textProps.x = segmentX - padding;
        textProps['text-anchor'] = 'end';
      } else {
        textProps.x = segmentX + segmentLength + padding;
        textProps['text-anchor'] = 'start';
      }
    }

    svg.appendChild(makeElement('svg:text', textProps));
  }

  _getTooltipContent(segment, isDisabled = false) {
    if (isDisabled && segment === 'header') {
      return 'Signatures not available for this file type.';
    }

    const hint = ' (Right-click for options)';

    switch (segment) {
      case 'code': {
        const isPureDoc =
          !!this.file.isPureDocCapsule ||
          (!this.file.isStructured &&
            !/\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(this.file.name));
        const isJS = /\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(this.file.name);
        let levelDesc = '';

        if (isPureDoc) {
          const pct =
            (this.state.codeLevel !== undefined
              ? this.state.codeLevel
              : this.state.code
              ? 4
              : 0) * 25;
          if (pct === 0) levelDesc = 'Exclude content from prompt (0%)';
          else if (pct === 100)
            levelDesc = 'Include full content in prompt (100%)';
          else levelDesc = `Include partial content (${pct}%)`;
        } else if (isJS) {
          const currentLevel =
            this.state.codeLevel !== undefined
              ? this.state.codeLevel
              : this.state.code
              ? 4
              : 0;
          if (currentLevel === 0) levelDesc = 'Exclude source code';
          else if (currentLevel === 2)
            levelDesc = 'Level 2: Strip private bodies and old patches';
          else if (currentLevel === 3)
            levelDesc = 'Level 3: Include private bodies, strip old patches';
          else levelDesc = 'Level 4: Include full source code (with patches)';
        } else {
          levelDesc = this.state.code
            ? 'Exclude full source code'
            : 'Include full source code';
        }

        return levelDesc + hint;
      }
      case 'header':
        return (
          (this.state.signatures
            ? 'Exclude function signatures from prompt'
            : 'Include function signatures in prompt') + hint
        );
      case 'docs': {
        const emptyPrefix =
          this.file.docs > 0 ? '' : 'Create/include documentation sidecar. ';
        const now = Date.now();
        const isFreshStart = now - this.lastClickTimestamp > 10000;
        const currentLevel = this.state.docsLevel;
        let nextLevel;

        if (isFreshStart) {
          if (currentLevel === 0) {
            nextLevel = 4;
          } else if (currentLevel === 4) {
            nextLevel = 0;
          } else {
            nextLevel = currentLevel + 1;
          }
        } else {
          if (this.lastDirectionDocs === 'up') {
            nextLevel = (currentLevel + 1) % 5;
          } else {
            nextLevel = (currentLevel - 1 + 5) % 5;
          }
        }

        const percentage = nextLevel * 25;
        if (nextLevel === 0) {
          return emptyPrefix + 'Exclude documentation from prompt (0%)' + hint;
        }
        if (nextLevel === 4 && (currentLevel === 0 || currentLevel === 3)) {
          return (
            emptyPrefix + 'Include full documentation in prompt (100%)' + hint
          );
        }

        return (
          emptyPrefix +
          `Set documentation level to ${percentage}% for prompt` +
          hint
        );
      }
    }
    return '';
  }

  getSegmentElement(segmentName) {
    if (!this.svgElement) return null;
    return this.svgElement.querySelector(`path[data-segment="${segmentName}"]`);
  }

  toggleSegment(segment) {
    const newState = { ...this.state };
    let changed = false;

    switch (segment) {
      case 'code': {
        const isPureDoc =
          !!this.file.isPureDocCapsule ||
          (!this.file.isStructured &&
            !/\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(this.file.name));

        const isJS = /\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(this.file.name);

        const now = Date.now();
        // Use an isolated timer so toggling Docs doesn't interrupt the cycle of Code
        const isFreshStart = now - (this.lastClickTimestampCode || 0) > 10000;

        if (isPureDoc) {
          const validLevels = [0, 1, 2, 3, 4];
          let currentLevel =
            this.state.codeLevel !== undefined
              ? this.state.codeLevel
              : this.state.code
              ? 4
              : 0;

          let idx = validLevels.indexOf(currentLevel);
          if (idx === -1) {
            idx = this.state.code ? validLevels.length - 1 : 0;
            currentLevel = validLevels[idx];
          }

          if (isFreshStart) {
            if (currentLevel === 0) {
              idx = validLevels.length - 1;
              this.lastDirectionCode = 'down';
            } else if (currentLevel === 4) {
              idx = 0;
              this.lastDirectionCode = 'up';
            } else {
              idx = Math.min(validLevels.length - 1, idx + 1);
              this.lastDirectionCode = 'up';
            }
          } else if (this.lastDirectionCode === 'down') {
            idx -= 1;
            if (idx < 0) idx = validLevels.length - 1;
          } else {
            idx += 1;
            if (idx >= validLevels.length) idx = 0;
          }

          newState.codeLevel = validLevels[idx];
          newState.code = newState.codeLevel > 0;
          this.lastClickTimestampCode = now;
          changed = true;
        } else if (isJS) {
          const validLevels = [0, 2, 3, 4];
          let currentLevel =
            this.state.codeLevel !== undefined
              ? this.state.codeLevel
              : this.state.code
              ? 4
              : 0;

          let idx = validLevels.indexOf(currentLevel);
          if (idx === -1) {
            idx = this.state.code ? validLevels.length - 1 : 0;
            currentLevel = validLevels[idx];
          }

          if (isFreshStart) {
            if (currentLevel === 0) {
              idx = validLevels.length - 1;
              this.lastDirectionCode = 'down';
            } else if (currentLevel === 4) {
              idx = 0;
              this.lastDirectionCode = 'up';
            } else {
              idx = Math.min(validLevels.length - 1, idx + 1);
              this.lastDirectionCode = 'up';
            }
          } else if (this.lastDirectionCode === 'down') {
            idx -= 1;
            if (idx < 0) idx = validLevels.length - 1;
          } else {
            idx += 1;
            if (idx >= validLevels.length) idx = 0;
          }

          newState.codeLevel = validLevels[idx];
          newState.code = newState.codeLevel > 0;
          this.lastClickTimestampCode = now;
          changed = true;
        } else {
          newState.code = !this.state.code;
          newState.codeLevel = newState.code ? 4 : 0;
          changed = true;
        }

        break;
      }

      case 'header':
        newState.signatures = !this.state.signatures;
        newState.sig = newState.signatures;
        changed = true;
        break;

      case 'docs': {
        const now = Date.now();
        const isFreshStart = now - (this.lastClickTimestampDocs || 0) > 10000;
        const currentLevel = this.state.docsLevel || 0;

        if (isFreshStart) {
          if (currentLevel === 0) {
            newState.docsLevel = 4;
            this.lastDirectionDocs = 'down';
          } else if (currentLevel === 4) {
            newState.docsLevel = 0;
            this.lastDirectionDocs = 'up';
          } else {
            newState.docsLevel = currentLevel + 1;
            this.lastDirectionDocs = 'up';
          }
        } else if (this.lastDirectionDocs === 'down') {
          newState.docsLevel = (currentLevel - 1 + 5) % 5;
        } else {
          newState.docsLevel = (currentLevel + 1) % 5;
        }

        newState.docs = newState.docsLevel > 0;
        this.lastClickTimestampDocs = now;
        changed = true;
        break;
      }
    }

    if (changed) {
      this.setState(newState);
    }
  }

  _showWidgetHelp() {
    UITools.makeDialog({
      title: 'Visibility Widget Help',
      contentHTML: `
            <h3>Control what the AI sees</h3>
            <p>Each file has three "capsules" you can toggle:</p>
            <ul>
                <li><strong style="color:#0088ff">Blue (Left): Code</strong> - Include the full source code.</li>
                <li><strong style="color:#d98e48">Orange (Center): Sig</strong> - Include only the "Signatures" (imports, exports, class methods) to give the AI context without the implementation details.</li>
                <li><strong style="color:#8433ff">Purple (Right): Docs</strong> - Include the documentation file. Click multiple times to cycle through partial amounts (25%, 50%, etc).</li>
            </ul>
            <p><strong>Right-Click</strong> anywhere on the widget to open a menu for <strong>Bulk Actions</strong> (e.g., "Select All Code").</p>
        `,
      width: '450px',
      dismissOnOverlayClick: true,
    });
  }

  


  static _doc_overview() {
      return "### VisibilityWidget\n\nAn interactive visual pill for toggle selection and line size estimation of a file's code, signatures, and documentation.";
    }

  static _doc_sparkline() {
      return `## Dynamic Sizing and Segment Cycling

- **Sparkline Sizing**: Scale-values the physical width of the Code (Blue) and Docs (Purple) segments relative to their actual line counts, creating a visual heat map of file size and documentation coverage.
- **Limit Cycling**: Clicking the Code segment cycles through multiple code-level filters (Level 2: strip private bodies, Level 3: strip patches, Level 4: full code).
- **Percentage Cycling**: Clicking the Docs segment cycles through partial document inclusion limits (0%, 25%, 50%, 75%, 100%), filling the capsule visually like a progress bar.`;
    }

  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  
}

/* recursi-meta
{
  "schema": 1,
  "lines": 854,
  "provides": [
    "VisibilityWidget"
  ],
  "deps": []
}
recursi-meta */
