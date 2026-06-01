
class CalloutArrow {
  constructor(options = {}) {
    this.targetElement = options.targetElement || null;
    this.parentContainer = options.parentContainer || document.body;
    this.onSettingsChange = options.onSettingsChange || null;

    // Default settings — tuned from user testing
    this.settings = {
      boxWidth: 405,
      boxHeight: 170,
      cornerRadius: 14,
      arrowHeadWidth: 60,
      arrowHeadHeight: 28,
      arrowShaftWidth: 20,
      arrowShaftHeight: 35,
      arrowPositionPct: 50,
      paddingTop: 18,
      paddingRight: 19,
      paddingBottom: 18,
      paddingLeft: 32,
      fillColor: '#ffa8a8',
      fillOpacity: 0.72,
      borderColor: '#ff0015',
      borderWidth: 5,
      borderOpacity: 0.75,
      titleText: 'Button Name',
      bodyText: 'This button does something useful.',
      titleFontSize: 22,
      bodyFontSize: 21,
      titleColor: '#212121',
      bodyColor: '#050505',
      fontFamily: "'Architects Daughter', cursive",
      offsetX: 27,
      offsetY: 48,
      shadowBlur: 12,
      shadowOpacity: 0.5,

      ...options.settings,
    };

    this.svgElement = null;
    this.rootElement = null;
    this.tuningDialog = null;
  }

  generatePath() {
    const s = this.settings;
    const w = s.boxWidth;
    const h = s.boxHeight;
    const r = Math.min(s.cornerRadius, Math.min(w, h) / 2);

    const ahw = s.arrowHeadWidth; // full width of the arrowhead triangle
    const ahh = s.arrowHeadHeight; // height of the arrowhead triangle
    const asw = s.arrowShaftWidth; // width of the shaft
    const ash = s.arrowShaftHeight; // height of the shaft

    const totalArrowH = ahh + ash;

    // Arrow center X position
    const cx = (s.arrowPositionPct / 100) * w;

    // Shaft edges
    const shaftLeft = cx - asw / 2;
    const shaftRight = cx + asw / 2;

    // Arrowhead edges
    const headLeft = cx - ahw / 2;
    const headRight = cx + ahw / 2;

    // Clamp shaft to not go past rounded corners
    const clampedShaftLeft = Math.max(r + 2, shaftLeft);
    const clampedShaftRight = Math.min(w - r - 2, shaftRight);

    // Y coordinates (box top = 0, arrow goes negative/upward)
    // Shaft bottom is at y=0 (box top edge)
    // Shaft top is at y = -ash
    // Arrowhead base is at y = -ash
    // Arrowhead tip is at y = -(ash + ahh) = -totalArrowH

    let d = '';

    // Start at top-left corner, after radius
    d += `M ${r} 0`;

    // Top edge to where shaft starts
    d += ` L ${clampedShaftLeft} 0`;

    // Go up the left side of the shaft
    d += ` L ${clampedShaftLeft} ${-ash}`;

    // Left wing of arrowhead (go out to the left)
    d += ` L ${Math.max(0, headLeft)} ${-ash}`;

    // Up to the tip
    d += ` L ${cx} ${-totalArrowH}`;

    // Down to right wing of arrowhead
    d += ` L ${Math.min(w, headRight)} ${-ash}`;

    // Down the right side of shaft
    d += ` L ${clampedShaftRight} ${-ash}`;
    d += ` L ${clampedShaftRight} 0`;

    // Continue top edge to top-right corner
    d += ` L ${w - r} 0`;

    // Top-right corner
    d += ` Q ${w} 0, ${w} ${r}`;

    // Right edge
    d += ` L ${w} ${h - r}`;

    // Bottom-right corner
    d += ` Q ${w} ${h}, ${w - r} ${h}`;

    // Bottom edge
    d += ` L ${r} ${h}`;

    // Bottom-left corner
    d += ` Q 0 ${h}, 0 ${h - r}`;

    // Left edge
    d += ` L 0 ${r}`;

    // Top-left corner
    d += ` Q 0 0, ${r} 0`;

    d += ' Z';

    return d;
  }

  render() {
    const s = this.settings;

    // --- 1. Auto-Measure Text Height ---
    // We need to know how tall the text is before we draw the SVG box.
    const measureContainer = makeElement(
      'div',
      {
        style: {
          position: 'absolute',
          visibility: 'hidden',
          width: `${
            s.boxWidth - s.borderWidth * 2 - s.paddingLeft - s.paddingRight
          }px`,
          fontFamily: s.fontFamily,
          lineHeight: '0', // Reset container line height
          left: '-9999px',
          top: '-9999px',
          pointerEvents: 'none',
        },
      },
      [
        makeElement('div', {
          style: {
            fontSize: `${s.titleFontSize}px`,
            fontWeight: '700',
            marginBottom: '6px',
            lineHeight: '1.2',
            whiteSpace: 'pre-wrap', // Ensure text wraps like the real one
          },
          textContent: s.titleText,
        }),
        makeElement('div', {
          style: {
            fontSize: `${s.bodyFontSize}px`,
            fontWeight: '500',
            lineHeight: '1.45',
            whiteSpace: 'pre-wrap',
          },
          textContent: s.bodyText,
        }),
      ]
    );

    document.body.appendChild(measureContainer);
    const measuredHeight = measureContainer.offsetHeight;
    measureContainer.remove();

    // Update box height to fit text + padding
    s.boxHeight = measuredHeight + s.paddingTop + s.paddingBottom;

    // --- 2. Generate Path & SVG ---
    const totalArrowH = s.arrowHeadHeight + s.arrowShaftHeight;

    const svgWidth = s.boxWidth + s.borderWidth * 2;
    const svgHeight = s.boxHeight + totalArrowH + s.borderWidth * 2;

    const translateX = s.borderWidth;
    const translateY = totalArrowH + s.borderWidth;

    if (this.rootElement) {
      this.rootElement.remove();
    }

    // Generate path with new height
    const pathD = this.generatePath();

    const shadowFilter = makeElement(
      'svg:filter',
      { id: 'callout-shadow-' + Math.random().toString(36).slice(2, 8) },
      [
        makeElement('svg:feDropShadow', {
          dx: '0',
          dy: '3',
          stdDeviation: String(s.shadowBlur / 2),
          'flood-color': '#000',
          'flood-opacity': String(s.shadowOpacity),
        }),
      ]
    );
    const filterId = shadowFilter.getAttribute('id');

    const defs = makeElement('svg:defs', {}, [shadowFilter]);

    const fillPath = makeElement('svg:path', {
      d: pathD,
      fill: s.fillColor,
      'fill-opacity': String(s.fillOpacity),
      stroke: 'none',
    });

    const strokePath = makeElement('svg:path', {
      d: pathD,
      fill: 'none',
      stroke: s.borderColor,
      'stroke-width': String(s.borderWidth),
      'stroke-opacity': String(s.borderOpacity),
      'stroke-linejoin': 'round',
      filter: `url(#${filterId})`,
    });

    const group = makeElement(
      'svg:g',
      {
        transform: `translate(${translateX}, ${translateY})`,
      },
      [fillPath, strokePath]
    );

    const svg = makeElement(
      'svg:svg',
      {
        width: String(svgWidth),
        height: String(svgHeight),
        viewBox: `0 0 ${svgWidth} ${svgHeight}`,
        style: 'overflow: visible; display: block;',
      },
      [defs, group]
    );

    const textContainer = makeElement(
      'div',
      {
        style: {
          position: 'absolute',
          top: `${totalArrowH + s.borderWidth + s.paddingTop}px`,
          left: `${s.borderWidth + s.paddingLeft}px`,
          right: `${s.borderWidth + s.paddingRight}px`,
          bottom: `${s.borderWidth + s.paddingBottom}px`,
          fontFamily: s.fontFamily,
          pointerEvents: 'none',
          overflow: 'hidden',
        },
      },
      [
        makeElement('div', {
          style: {
            fontSize: `${s.titleFontSize}px`,
            fontWeight: '700',
            color: s.titleColor,
            marginBottom: '6px',
            lineHeight: '1.2',
            whiteSpace: 'pre-wrap',
          },
          textContent: s.titleText,
        }),
        makeElement('div', {
          style: {
            fontSize: `${s.bodyFontSize}px`,
            fontWeight: '500',
            color: s.bodyColor,
            lineHeight: '1.45',
            whiteSpace: 'pre-wrap',
          },
          textContent: s.bodyText,
        }),
      ]
    );

    this.rootElement = makeElement(
      'div',
      {
        className: 'callout-arrow-root',
        style: {
          position: 'relative',
          display: 'inline-block',
          width: `${svgWidth}px`,
          height: `${svgHeight}px`,
        },
      },
      [svg, textContainer]
    );

    this.svgElement = svg;
    return this.rootElement;
  }

  openTuningDialog() {
      if (this.tuningDialog) {
        this.tuningDialog.setZOnTop();
        return;
      }

      const defs = [
        [
          'Box',
          [
            ['boxWidth', 'W', 100, 800, 5],
            ['boxHeight', 'H', 60, 500, 5],
            ['cornerRadius', 'Rad', 0, 40, 1],
          ],
        ],
        [
          'Arrow',
          [
            ['arrowHeadWidth', 'Head W', 10, 150, 2],
            ['arrowHeadHeight', 'Head H', 8, 80, 2],
            ['arrowShaftWidth', 'Shaft W', 4, 80, 2],
            ['arrowShaftHeight', 'Shaft H', 8, 100, 2],
            ['arrowPositionPct', 'Pos %', 5, 95, 1],
          ],
        ],
        [
          'Padding',
          [
            ['paddingTop', 'T', 0, 40, 1],
            ['paddingRight', 'R', 0, 40, 1],
            ['paddingBottom', 'B', 0, 40, 1],
            ['paddingLeft', 'L', 0, 40, 1],
          ],
        ],
        [
          'Fill',
          [
            ['fillOpacity', 'Opacity', 0, 1, 0.02],
            ['borderWidth', 'Bdr W', 0.5, 8, 0.5],
            ['borderOpacity', 'Bdr Op', 0, 1, 0.05],
          ],
        ],
        [
          'Shadow',
          [
            ['shadowBlur', 'Blur', 0, 30, 1],
            ['shadowOpacity', 'Op', 0, 0.5, 0.02],
          ],
        ],
        [
          'Text',
          [
            ['titleFontSize', 'Title Sz', 8, 32, 1],
            ['bodyFontSize', 'Body Sz', 8, 24, 1],
          ],
        ],
        [
          'Offset',
          [
            ['offsetX', 'X', -100, 100, 1],
            ['offsetY', 'Y', -50, 100, 1],
          ],
        ],
      ];

      const colors = [
        ['fillColor', 'Fill'],
        ['borderColor', 'Border'],
        ['titleColor', 'Title'],
        ['bodyColor', 'Body'],
      ];

      const texts = [
        ['titleText', 'Title'],
        ['bodyText', 'Body'],
      ];

      const previewBox = makeElement('div', {
        style: {
          background: 'transparent',
          border: '1px dashed #555',
          borderRadius: '6px',
          padding: '20px',
          minHeight: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
        },
      });

      const controls = makeElement('div', {
        style: {
          overflowY: 'auto',
          flex: '1',
          fontSize: '11px',
          fontFamily: 'monospace',
        },
      });

      const refresh = () => {
        previewBox.innerHTML = '';
        previewBox.appendChild(this.render());
      };

      for (const [section, items] of defs) {
        controls.appendChild(
          makeElement('div', {
            style:
              'color:#7bf;font-weight:700;margin:6px 0 2px;border-bottom:1px solid #333;padding-bottom:2px;',
            textContent: section,
          })
        );
        for (const [key, label, min, max, step] of items) {
          const valSpan = makeElement('span', {
            style: 'width:40px;text-align:right;color:#888;display:inline-block;',
            textContent: String(this.settings[key]),
          });
          const slider = makeElement('input', {
            type: 'range',
            min: String(min),
            max: String(max),
            step: String(step),
            value: String(this.settings[key]),
            style: 'flex:1;height:14px;accent-color:#7bf;cursor:pointer;',
            oninput: (e) => {
              this.settings[key] = parseFloat(e.target.value);
              valSpan.textContent = String(this.settings[key]);
              refresh();
            },
          });
          controls.appendChild(
            makeElement(
              'div',
              {
                style: 'display:flex;align-items:center;gap:4px;margin:1px 0;',
              },
              [
                makeElement('span', {
                  style: 'width:60px;text-align:right;color:#aaa;',
                  textContent: label,
                }),
                slider,
                valSpan,
              ]
            )
          );
        }
      }

      controls.appendChild(
        makeElement('div', {
          style:
            'color:#7bf;font-weight:700;margin:6px 0 2px;border-bottom:1px solid #333;padding-bottom:2px;',
          textContent: 'Colors',
        })
      );
      for (const [key, label] of colors) {
        controls.appendChild(
          makeElement(
            'div',
            {
              style: 'display:flex;align-items:center;gap:4px;margin:1px 0;',
            },
            [
              makeElement('span', {
                style: 'width:60px;text-align:right;color:#aaa;',
                textContent: label,
              }),
              makeElement('input', {
                type: 'color',
                value: this.settings[key],
                style:
                  'width:32px;height:20px;border:1px solid #555;cursor:pointer;padding:0;background:none;',
                oninput: (e) => {
                  this.settings[key] = e.target.value;
                  refresh();
                },
              }),
            ]
          )
        );
      }

      controls.appendChild(
        makeElement('div', {
          style:
            'color:#7bf;font-weight:700;margin:6px 0 2px;border-bottom:1px solid #333;padding-bottom:2px;',
          textContent: 'Content',
        })
      );
      for (const [key, label] of texts) {
        const inp = makeElement(key === 'bodyText' ? 'textarea' : 'input', {
          style:
            'flex:1;background:#333;color:#ddd;border:1px solid #555;border-radius:3px;padding:2px 4px;font:11px monospace;' +
            (key === 'bodyText' ? 'min-height:36px;resize:vertical;' : ''),
          oninput: (e) => {
            this.settings[key] = e.target.value;
            refresh();
          },
        });
        inp.value = this.settings[key];
        controls.appendChild(
          makeElement(
            'div',
            {
              style: 'display:flex;align-items:center;gap:4px;margin:1px 0;',
            },
            [
              makeElement('span', {
                style: 'width:60px;text-align:right;color:#aaa;',
                textContent: label,
              }),
              inp,
            ]
          )
        );
      }

      controls.appendChild(
        makeElement('button', {
          textContent: '📋 Dump JSON to console & clipboard',
          style:
            'margin:10px 0;padding:5px 10px;background:#2a5f8a;color:#fff;border:none;border-radius:4px;cursor:pointer;font:11px monospace;',
          onclick: () => {
            const json = JSON.stringify(this.settings, null, 2);
            console.log('CalloutArrow settings:', json);
            navigator.clipboard.writeText(json).catch(() => {});
          },
        })
      );

      const wrapper = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            gap: '4px',
            overflow: 'hidden',
          },
        },
        [previewBox, controls]
      );

      this.tuningDialog = UITools.makeDialog({
        env: this.env,
        title: '🎨 Callout Tuner',
        size: [480, 650],
        contentElement: wrapper,
        noPadding: false,
        transparent: true,
        buttons: [
          {
            label: 'Close',
            onClick: () => {
              this.tuningDialog = null;
              return true;
            },
          },
        ],
        onClose: () => {
          this.tuningDialog = null;
        },
      });

      refresh();
    }

  getSettings() {
    return { ...this.settings };
  }

  loadSettings(obj) {
    Object.assign(this.settings, obj);
  }

  _injectTuningStyles() {
    applyCss(
      `
      .callout-tuning-layout {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 12px;
        overflow: hidden;
      }
      .callout-tuning-preview {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #fefae0 0%, #e9edc9 50%, #d4e09b 100%);
        border: 1px solid #444;
        border-radius: 8px;
        padding: 20px;
        min-height: 160px;
        overflow: auto;
      }
      .callout-tuning-sliders {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-right: 8px;
      }
      .callout-tuning-section {
        font-size: 12px;
        font-weight: 700;
        color: #a2d2ff;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 8px;
        margin-bottom: 2px;
        border-bottom: 1px solid #333;
        padding-bottom: 3px;
      }
      .callout-tuning-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 26px;
      }
      .callout-tuning-row-wide {
        flex-wrap: wrap;
      }
      .callout-tuning-label {
        width: 110px;
        flex-shrink: 0;
        font-size: 12px;
        color: #bbb;
        text-align: right;
      }
      .callout-tuning-slider {
        flex: 1;
        min-width: 100px;
        accent-color: #a2d2ff;
        height: 16px;
        cursor: pointer;
      }
      .callout-tuning-value {
        width: 45px;
        text-align: right;
        font-size: 11px;
        color: #888;
        font-family: monospace;
      }
      .callout-tuning-color {
        width: 40px;
        height: 24px;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 0;
        cursor: pointer;
        background: none;
      }
      .callout-tuning-text {
        flex: 1;
        background: #333;
        color: #ddd;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        font-family: 'Architects Daughter', cursive;
      }
      .callout-tuning-textarea {
        flex: 1;
        min-width: 200px;
        background: #333;
        color: #ddd;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        font-family: 'Architects Daughter', cursive;
        min-height: 50px;
        resize: vertical;
      }
      .callout-tuning-export-btn {
        margin-top: 12px;
        padding: 8px 16px;
        background: #2a5f8a;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-family: 'Architects Daughter', cursive;
        align-self: flex-start;
      }
      .callout-tuning-export-btn:hover {
        background: #3a7fb5;
      }
    `,
      'callout-tuning-styles'
    );
  }

  

  
}

