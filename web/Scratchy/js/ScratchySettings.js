
class ScratchySettings {
  constructor(app) {
    this._app = app;
    this._settingsDialog = null;
  }

  getDefaultLiveSettings() {
    return {
      theme: 'default',
      logoWidth: 89,
      logoDropShadowBlur: 1,
      logoDropShadowOpacity: 0.15,
      mascotWidth: 215,
      mascotHoverScale: 1.5,
      mascotMarginBottom: -15,
      mascotMarginTop: -10,
      mascotSleepingWidth: 200,
      mascotSleepingMarginBottom: -15,
      mascotSleepingMarginTop: -67,
      mascotLinkOffsetX: 0,
      mascotLinkOffsetY: 12,
      mascotLinkFontSize: 13,
      headerPaddingH: 16,
      headerPaddingTop: 11,
      headerLeftWidth: 195,
      headerRightWidth: 185,
      buttonFontSize: 22,
      buttonPaddingV: 11,
      buttonPaddingH: 16,
      buttonBorderRadius: 10,
      buttonMinHeight: 46,
      lessScratchyOffsetX: 21,
      lessScratchyOffsetY: 0,
      introDelayMs: 1800,
      introMoveDurationMs: 1100,
      jsonCardHeight: 270,
      jsonLeftColWidth: 130,
      jsonRightColWidth: 120,
      assetCardHeight: 190,
      assetGridMinWidth: 150,
      assetCardBorderRadius: 10,
      checkerSize: 12,
    };
  }

  applyLiveSettings() {
    const app = this._app;
    const s = app.liveSettings;

    if (app.styles) {
      app.styles.applyTheme(s.theme || 'default');
    }

    const root = document.documentElement;
    root.style.setProperty('--json-card-height', s.jsonCardHeight + 'px');
    root.style.setProperty('--json-left-width', s.jsonLeftColWidth + 'px');
    root.style.setProperty('--json-right-width', s.jsonRightColWidth + 'px');
    root.style.setProperty('--asset-card-height', s.assetCardHeight + 'px');
    root.style.setProperty('--asset-grid-min', s.assetGridMinWidth + 'px');
    root.style.setProperty('--asset-radius', s.assetCardBorderRadius + 'px');
    root.style.setProperty('--chk-size', s.checkerSize + 'px');
    root.style.setProperty('--chk-half', s.checkerSize / 2 + 'px');
    root.style.setProperty('--chk-neg-half', -s.checkerSize / 2 + 'px');

    if (app.logoImg) {
      app.logoImg.style.width = s.logoWidth + '%';
      app.logoImg.style.filter = `var(--logo-filter, drop-shadow(0 2px ${s.logoDropShadowBlur}px rgba(0,0,0,${s.logoDropShadowOpacity})))`;
    }

    if (app.mascotImg && app.mascotContainer) {
      if (!app.isLessScratchy) {
        app.mascotImg.style.width = s.mascotWidth + 'px';
        app.mascotImg.style.marginBottom = s.mascotMarginBottom + '%';
        app.mascotImg.style.marginTop = s.mascotMarginTop + 'px';
        app.mascotContainer.style.transformOrigin = '100% 0%';
      } else {
        app.mascotImg.style.width = s.mascotSleepingWidth + 'px';
        app.mascotImg.style.marginBottom = s.mascotSleepingMarginBottom + '%';
        app.mascotImg.style.marginTop = s.mascotSleepingMarginTop + 'px';
        app.mascotContainer.style.transformOrigin = '100% 50%';
      }
      app.mascotImg.style.filter = 'var(--mascot-filter, none)';
    }

    if (app.mascotLink) {
      app.mascotLink.style.transform = `translate(${s.mascotLinkOffsetX}px, ${s.mascotLinkOffsetY}px)`;
      app.mascotLink.style.fontSize = s.mascotLinkFontSize + 'px';
    }

    const headerBar = app.appRoot.querySelector('.scratchy-header-bar');
    if (headerBar) {
      headerBar.style.padding = `${s.headerPaddingTop}px ${s.headerPaddingH}px 0 ${s.headerPaddingH}px`;
    }
    const headerLeft = app.appRoot.querySelector('.scratchy-header-left');
    if (headerLeft) headerLeft.style.width = s.headerLeftWidth + 'px';
    const headerRight = app.appRoot.querySelector('.scratchy-header-right');
    if (headerRight) headerRight.style.width = s.headerRightWidth + 'px';

    const btns = app.appRoot.querySelectorAll('.scratchy-action-btn');
    btns.forEach((btn) => {
      btn.style.fontSize = s.buttonFontSize + 'px';
      btn.style.padding = `${s.buttonPaddingV}px ${s.buttonPaddingH}px`;
      btn.style.borderRadius = s.buttonBorderRadius + 'px';
      btn.style.minHeight = s.buttonMinHeight + 'px';
    });

    if (app.lessScratchyLabel) {
      app.lessScratchyLabel.style.transform = `translate(${s.lessScratchyOffsetX}px, ${s.lessScratchyOffsetY}px)`;
    }

    applyCss(
      `.scratchy-mascot-container:hover { transform: scale(${s.mascotHoverScale}) !important; z-index: 60; }`,
      'scratchy-live-hover'
    );
  }

  openSettingsPanel() {
      const app = this._app;
      if (this._settingsDialog) {
        this._settingsDialog.setZOnTop();
        return;
      }

      const categories = [
        {
          label: '🖼 Logo',
          settings: [
            ['logoWidth', 'Width (%)', 40, 100, 1, '%'],
            ['logoDropShadowBlur', 'Shadow Blur', 0, 20, 1, 'px'],
            ['logoDropShadowOpacity', 'Shadow Opacity', 0, 0.5, 0.01, ''],
          ],
        },
        {
          label: '🐕 Mascot',
          settings: [
            ['mascotWidth', 'Width', 80, 350, 5, 'px'],
            ['mascotHoverScale', 'Hover Scale', 1, 3, 0.1, 'x'],
            ['mascotMarginBottom', 'Margin Bottom', -50, 20, 1, '%'],
            ['mascotMarginTop', 'Margin Top', -100, 50, 1, 'px'],
            ['mascotSleepingWidth', 'Sleeping Width', 100, 400, 5, 'px'],
            ['mascotSleepingMarginBottom', 'Sleep Margin Btm', -50, 20, 1, '%'],
            ['mascotSleepingMarginTop', 'Sleep Margin Top', -100, 50, 1, 'px'],
          ],
        },
        {
          label: "🔗 \"Scratchy's story\" Link",
          settings: [
            ['mascotLinkOffsetX', 'Offset X', -60, 60, 1, 'px'],
            ['mascotLinkOffsetY', 'Offset Y', -20, 40, 1, 'px'],
            ['mascotLinkFontSize', 'Font Size', 8, 20, 1, 'px'],
          ],
        },
        {
          label: '📐 Header Layout',
          settings: [
            ['headerPaddingH', 'Horiz Padding', 0, 60, 2, 'px'],
            ['headerPaddingTop', 'Top Padding', 0, 30, 1, 'px'],
            ['headerLeftWidth', 'Left Col Width', 80, 350, 5, 'px'],
            ['headerRightWidth', 'Right Col Width', 80, 300, 5, 'px'],
          ],
        },
        {
          label: '🔘 Action Buttons',
          settings: [
            ['buttonFontSize', 'Font Size', 10, 28, 1, 'px'],
            ['buttonPaddingV', 'Pad Vertical', 4, 24, 1, 'px'],
            ['buttonPaddingH', 'Pad Horizontal', 4, 30, 1, 'px'],
            ['buttonBorderRadius', 'Border Radius', 0, 24, 1, 'px'],
            ['buttonMinHeight', 'Min Height', 24, 80, 2, 'px'],
          ],
        },
        {
          label: '☑ Less Scratchy Toggle',
          settings: [
            ['lessScratchyOffsetX', 'Offset X', -40, 40, 1, 'px'],
            ['lessScratchyOffsetY', 'Offset Y', -20, 20, 1, 'px'],
          ],
        },
        {
          label: '🎬 Intro Animation',
          settings: [
            ['introDelayMs', 'Start Delay', 0, 5000, 100, 'ms'],
            ['introMoveDurationMs', 'Move Duration', 200, 3000, 50, 'ms'],
          ],
        },
        {
          label: '📄 JSON Card',
          settings: [
            ['jsonCardHeight', 'Card Height', 150, 500, 10, 'px'],
            ['jsonLeftColWidth', 'Left Col Width', 60, 200, 5, 'px'],
            ['jsonRightColWidth', 'Right Col Width', 60, 200, 5, 'px'],
          ],
        },
        {
          label: '🖼 Asset Cards',
          settings: [
            ['assetCardHeight', 'Card Height', 120, 350, 10, 'px'],
            ['assetGridMinWidth', 'Grid Min Width', 80, 250, 5, 'px'],
            ['assetCardBorderRadius', 'Border Radius', 0, 24, 1, 'px'],
            ['checkerSize', 'Checker Size', 4, 30, 1, 'px'],
          ],
        },
      ];

      const container = makeElement('div', {
        style: {
          overflowY: 'auto',
          height: '100%',
          padding: '8px',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#ccc',
          background: '#1e1e2e',
        },
      });

      container.appendChild(
        makeElement(
          'div',
          {
            style: {
              padding: '10px',
              background: '#252526',
              marginBottom: '10px',
              borderRadius: '6px',
            },
          },
          [
            makeElement('button', {
              textContent: '🎬 Reset Intro Animation (Slow)',
              style: {
                width: '100%',
                padding: '8px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
              },
              onclick: () => {
                localStorage.removeItem('scratchy_intro_done');
                if (confirm('Intro reset! Reload the page now?')) {
                  window.location.reload();
                }
              },
            }),
          ]
        )
      );

      const expandedState = {};

      for (const cat of categories) {
        expandedState[cat.label] = true;

        const contentDiv = makeElement('div', {
          style: { padding: '4px 0 8px 0' },
        });

        const chevron = makeElement('span', {
          style: {
            display: 'inline-block',
            transition: 'transform 0.2s',
            marginRight: '6px',
          },
          textContent: '▼',
        });

        const headerBtn = makeElement(
          'div',
          {
            style: {
              cursor: 'pointer',
              padding: '6px 8px',
              background: '#2a2a3a',
              borderRadius: '6px',
              marginBottom: '2px',
              fontWeight: '700',
              fontSize: '13px',
              color: '#a2d2ff',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
            },
            onclick: () => {
              expandedState[cat.label] = !expandedState[cat.label];
              contentDiv.style.display = expandedState[cat.label] ? '' : 'none';
              chevron.style.transform = expandedState[cat.label]
                ? ''
                : 'rotate(-90deg)';
            },
          },
          [chevron, cat.label]
        );

        for (const item of cat.settings) {
          if (item[3] === 'select') {
            const [key, label, optionsArray] = item;
            const select = makeElement('select', {
              style: {
                flex: '1',
                minWidth: '100px',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                padding: '4px',
                outline: 'none',
              },
              onchange: (e) => {
                app.liveSettings[key] = e.target.value;
                this.applyLiveSettings();
              },
            });
            optionsArray.forEach((opt) => {
              select.appendChild(makeElement('option', { value: opt }, opt));
            });
            select.value = app.liveSettings[key] || 'default';

            contentDiv.appendChild(
              makeElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '4px 0',
                    paddingLeft: '12px',
                  },
                },
                [
                  makeElement('span', {
                    style: {
                      width: '100px',
                      textAlign: 'right',
                      color: '#aaa',
                      fontSize: '11px',
                      flexShrink: '0',
                    },
                    textContent: label,
                  }),
                  select,
                ]
              )
            );
          } else {
            const [key, label, min, max, step, unit] = item;
            const valSpan = makeElement('span', {
              style: {
                width: '55px',
                textAlign: 'right',
                color: '#888',
                fontFamily: 'monospace',
                fontSize: '11px',
                flexShrink: '0',
              },
              textContent: String(app.liveSettings[key]) + (unit || ''),
            });

            const slider = makeElement('input', {
              type: 'range',
              min: String(min),
              max: String(max),
              step: String(step),
              value: String(app.liveSettings[key]),
              style: {
                flex: '1',
                height: '14px',
                accentColor: '#a2d2ff',
                cursor: 'pointer',
                minWidth: '60px',
              },
              oninput: (e) => {
                app.liveSettings[key] = parseFloat(e.target.value);
                valSpan.textContent =
                  String(app.liveSettings[key]) + (unit || '');
                this.applyLiveSettings();
              },
            });

            contentDiv.appendChild(
              makeElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '2px 0',
                    paddingLeft: '12px',
                  },
                },
                [
                  makeElement('span', {
                    style: {
                      width: '100px',
                      textAlign: 'right',
                      color: '#aaa',
                      fontSize: '11px',
                      flexShrink: '0',
                    },
                    textContent: label,
                  }),
                  slider,
                  valSpan,
                ]
              )
            );
          }
        }

        container.appendChild(headerBtn);
        container.appendChild(contentDiv);
      }

      container.appendChild(
        makeElement('button', {
          style: {
            margin: '12px 8px',
            padding: '6px 14px',
            background: '#c62828',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
          },
          textContent: '🔄 Reset All to Defaults',
          onclick: () => {
            app.liveSettings = this.getDefaultLiveSettings();
            this.applyLiveSettings();
            this._settingsDialog.close();
            this._settingsDialog = null;
            this.openSettingsPanel();
          },
        })
      );

      container.appendChild(
        makeElement('button', {
          style: {
            margin: '0 8px 12px',
            padding: '6px 14px',
            background: '#2a5f8a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
          },
          textContent: '📋 Copy Settings JSON',
          onclick: () => {
            navigator.clipboard
              .writeText(JSON.stringify(app.liveSettings, null, 2))
              .catch(() => {});
          },
        })
      );

      this._settingsDialog = UITools.makeDialog({
        env: app.env,
        title: '⚙️ Layout Settings',
        size: [420, 600],
        contentElement: container,
        noPadding: true,
        buttons: [{ label: 'Close' }],
        onClose: () => {
          this._settingsDialog = null;
        },
      });
    }

  

  
}

