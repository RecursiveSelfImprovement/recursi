
class SettingsDialogUI {
  
  
  constructor(player) {
    this.player = player;
    this._qsBackdrop = null;
    this._quickSettingsDropdown = null;
    this._qsOutsideClickHandler = null;
    this._3dSettingsDialog = null;
  }

  closeQuickSettingsDropdown() {
    if (this._qsBackdrop) {
      this._qsBackdrop.remove();
      this._qsBackdrop = null;
    }
    if (this._quickSettingsDropdown) {
      this._quickSettingsDropdown.remove();
      this._quickSettingsDropdown = null;
    }
    if (this._qsOutsideClickHandler) {
      document.removeEventListener('mousedown', this._qsOutsideClickHandler);
      this._qsOutsideClickHandler = null;
    }
  }

  toggleQuickSettingsDropdown(btnEl) {
      if (this._quickSettingsDropdown) {
        this.closeQuickSettingsDropdown();
        return;
      }

      this._qsBackdrop = makeElement('div', {
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '99998',
          cursor: 'default',
        },
        onmousedown: (e) => {
          e.stopPropagation();
          this.closeQuickSettingsDropdown();
        },
      });
      this.player.rootElement.appendChild(this._qsBackdrop);

      const container = makeElement('div', {
        className: 'qs-dropdown',
        style: {
          position: 'absolute',
          zIndex: '99999',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '15px',
          background: 'rgba(25, 25, 25, 0.98)',
          border: '1px solid #444',
          borderRadius: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          width: '280px',
        },
      });

      const rect = btnEl.getBoundingClientRect();
      const parentRect = this.player.rootElement.getBoundingClientRect();
      
      container.style.top = `${rect.bottom - parentRect.top + 5}px`;
      container.style.left = `${Math.max(10, rect.right - parentRect.left - 280)}px`;

      const getGeoVal = (prop, fallback) => {
        const gs =
          this.player.gt?.pianoVisuals?.geometrySettings ||
          this.player.state.geometry ||
          {};
        return gs[prop] !== undefined ? gs[prop] : fallback;
      };

      const refreshGeo = () => {
        if (this.player._saveGeometry) this.player._saveGeometry();
        const gs =
          this.player.gt?.pianoVisuals?.geometrySettings ||
          this.player.state.geometry;

        const pv = this.player.gt?.pianoVisuals;
        if (pv) {
          pv.updateLayout();

          if (pv.actionBar && pv.actionBar.recalculateLayout) {
            const wPct = (gs.customWidth || 100) / 100;
            pv.actionBar.recalculateLayout(gs.w || window.innerWidth * wPct);
          }

          if (this.player.gt.videoPlayer && this.player.gt.videoPlayer.isReady) {
            const accTime = this.player.gt.videoPlayer.getAccurateTime();
            if (accTime) {
              pv.setTime(accTime.time * 1000, 0, true);
            }
          }
        }
        if (this.player.piano3DApp && this.player.piano3DApp.app) {
          this.player.piano3DApp.alignTo2D(gs);
        }
      };

      const setGeoVal = (prop, v) => {
        if (this.player.gt?.pianoVisuals?.geometrySettings) {
          this.player.gt.pianoVisuals.geometrySettings[prop] = v;
        }
        if (this.player.state.geometry) {
          this.player.state.geometry[prop] = v;
        } else {
          this.player.state.geometry = { [prop]: v };
        }
        refreshGeo();
      };

      const mkSlider = (label, getVal, setVal, min, max, step) => {
        const row = makeElement('div', {
          style: 'display:flex; align-items:center; gap:8px;',
        });
        const lbl = makeElement(
          'div',
          {
            style: 'flex:0 0 80px; font-size:10px; color:#ccc; font-weight:bold;',
          },
          label
        );
        const sl = makeElement('input', {
          type: 'range',
          min,
          max,
          step,
          value: getVal(),
          style: 'flex:1; cursor:pointer; height:4px;',
        });

        const is2d = this.player.state.settings.keyboardStyle === '2d';
        if (is2d && (label === 'Rotate Y' || label === 'Rotate Z')) {
            sl.disabled = true;
            sl.style.opacity = '0.3';
            sl.style.cursor = 'not-allowed';
        }

        const valEl = makeElement(
          'div',
          {
            style:
              'flex:0 0 35px; font-size:10px; color:#4a90e2; text-align:right; font-family:monospace;',
          },
          Number(getVal()).toFixed(step < 1 ? 2 : 0)
        );

        sl.oninput = () => {
          const v = parseFloat(sl.value);
          setVal(v);
          valEl.textContent = v.toFixed(step < 1 ? 2 : 0);
        };
        
        const poll = () => {
            if (!sl.isConnected) return;
            const actual = getVal();
            if (actual !== undefined && Math.abs(actual - parseFloat(sl.value)) > 0.001) {
                sl.value = actual;
                valEl.textContent = actual.toFixed(step < 1 ? 2 : 0);
            }
            setTimeout(poll, 250);
        };
        setTimeout(poll, 250);
        
        row.append(lbl, sl, valEl);
        return row;
      };

      container.append(
        mkSlider(
          'Bar Height %',
          () => getGeoVal('actionBarYRatio', 0.66) * 100,
          (v) => setGeoVal('actionBarYRatio', v / 100),
          0,
          100,
          1
        ),
        mkSlider(
          'Time Scale',
          () => getGeoVal('scale', 0.36),
          (v) => setGeoVal('scale', v),
          0.1,
          2.0,
          0.01
        ),
        makeElement('div', {
          style: 'height:1px; background:#444; margin:4px 0;',
        }),
        mkSlider(
          'Rotate X',
          () => getGeoVal('rotation', 64),
          (v) => setGeoVal('rotation', v),
          -90,
          90,
          1
        ),
        mkSlider(
          'Rotate Y',
          () => getGeoVal('rotationY', 0),
          (v) => setGeoVal('rotationY', v),
          -90,
          90,
          1
        ),
        mkSlider(
          'Rotate Z',
          () => getGeoVal('rotationZ', 0),
          (v) => setGeoVal('rotationZ', v),
          -90,
          90,
          1
        ),
        mkSlider(
          'Depth',
          () => getGeoVal('perspective', 2100),
          (v) => setGeoVal('perspective', v),
          100,
          3000,
          10
        )
      );

      const lhWrap = makeElement('label', {
        style:
          'display:flex; align-items:center; gap:6px; margin-top:5px; font-size:10px; color:#ccc; cursor:pointer; font-weight:bold;',
      });
      const lhChk = makeElement('input', {
        type: 'checkbox',
        checked: !!getGeoVal('leftHanded', false),
        style: 'cursor:pointer; margin:0;',
      });
      lhChk.onchange = (e) => {
        setGeoVal('leftHanded', e.target.checked);
      };
      lhWrap.append(lhChk, makeElement('span', {}, 'Left-Handed Mode'));
      container.append(lhWrap);

      this.player.rootElement.appendChild(container);
      this._quickSettingsDropdown = container;
    }

  open3DSettingsDialog() {
      if (
        this._3dSettingsDialog &&
        this._3dSettingsDialog.element &&
        this._3dSettingsDialog.element.isConnected
      ) {
        this._3dSettingsDialog.setZOnTop();
        return;
      }
  
      const container = makeElement('div', {
        style:
          'display:flex; flex-direction:column; gap:10px; max-height:70vh; overflow-y:auto; padding:5px;',
      });
  
      if (!this.player.piano3DApp) {
        container.appendChild(
          makeElement(
            'div',
            { style: 'padding:20px; color:#fa0; text-align:center;' },
            '3D Engine not loaded. Select "3D Canvas" or "Both" display mode first.'
          )
        );
      } else {
        this.build3DDialogContent(container);
      }
  
      const parentW = this.player.getAppWidth();
      this._3dSettingsDialog = UITools.makeDialog({
        env: this.player.env, // Bind to player environment
        title: '3D Piano Settings',
        width: '480px',
        position: [Math.max(20, parentW - 520), 60],
        content: container,
        appendTo: this.player.rootElement,
        onClose: () => {
          this._3dSettingsDialog = null;
        },
      });
    }

  build3DDialogContent(container) {
    const app = this.player.piano3DApp;

    const btnRow = makeElement('div', {
      style: 'display:flex; gap:5px; margin-bottom:10px;',
    });
    btnRow.append(
      makeElement(
        'button',
        {
          className: 'dialog-button',
          style: 'flex:1',
          onclick: () => {
            app._resetToDefaults();
            container.innerHTML = '';
            this.build3DDialogContent(container);
          },
        },
        'Reset Defaults'
      ),
      makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style: 'flex:1',
          onclick: () => app._copySettingsJSON(),
        },
        'Copy JSON'
      ),
      makeElement(
        'button',
        {
          className: 'dialog-button',
          style: 'flex:1',
          onclick: () => {
            const gs = this.player.gt?.pianoVisuals?.geometrySettings;
            if (app && gs) app.openAlignmentDialog(gs);
          },
        },
        '3D Align'
      )
    );
    container.appendChild(btnRow);

    const toggles = [
      {
        label: 'Orbit Mode',
        prop: 'orbitModeActive',
        updateFn: () => {
          if (app.app) app.app.enableOrbit(app.orbitModeActive);
          const pv = this.player.gt?.pianoVisuals;
          if (app.orbitModeActive) {
            // Entering orbit: hide flying bars, disable 2D alignment
            if (pv?.flyingBars) pv.flyingBars.hide();
          } else {
            // Exiting orbit: reset pivot controls, restore camera, show bars
            if (app.pivotControls) app.pivotControls.reset();
            if (pv?.flyingBars && !app.stealthMode) pv.flyingBars.show();
            // Force camera back to 2D alignment
            if (app.app && app.app.camera) {
              app.app.camera.clearViewOffset();
            }
          }
          if (window.projectApp?.gt?.pianoVisuals?.geometrySettings) {
            app.alignTo2D(window.projectApp.gt.pianoVisuals.geometrySettings);
          }
        },
      },
      {
        label: 'Stealth Demo',
        prop: 'stealthMode',
        updateFn: () => {
          const pv = this.player.gt?.pianoVisuals;
          if (app.stealthMode) {
            // Hide flying bars visually without setting isVisible=false
            // so time updates keep flowing for note events
            if (pv?.flyingBars) {
              Object.values(pv.flyingBars.containerList).forEach((nc) => {
                if (nc?.elems)
                  nc.elems.forEach((el) => {
                    if (el) el.style.display = 'none';
                  });
              });
            }
            if (app.visuals) app.visuals.turnOffAllNotes();
          } else {
            if (
              pv?.flyingBars &&
              !app.orbitModeActive &&
              this.player.state.settings.keyboardStyle !== 'none'
            ) {
              pv.flyingBars.show();
            }
            // Don't turn off notes here - let playback resume coloring naturally
          }
        },
      },
      { label: 'Single Key Mode', prop: 'singleKeyMode' },
      { label: 'Neon Glow Mode', prop: 'glowMode' },
      { label: 'Wireframe', prop: 'showOuterShape' },
      { label: 'Surface', prop: 'showSurface' },
      { label: 'Triangles', prop: 'showTriangles' },
      { label: 'Multi-Color', prop: 'coloredSurfaces' },
      {
        label: 'Grid',
        prop: 'showGrid',
        updateFn: () => {
          app.grid.visible = app.showGrid;
        },
      },
      { label: 'ID Tool', prop: 'showVertexMarkers' },
      { label: 'Hover Effect', prop: 'enableKeyHover' },
    ];

    const toggleCont = makeElement('div', {
      style:
        'display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #333;',
    });

    toggles.forEach((t) => {
      const lbl = makeElement('label', {
        style:
          'display:flex; align-items:center; font-size:10px; color:#ccc; cursor:pointer;',
      });
      const chk = makeElement('input', {
        type: 'checkbox',
        checked: !!app[t.prop],
      });
      chk.onchange = () => {
        app[t.prop] = chk.checked;
        if (t.updateFn) t.updateFn();
        else app._updateKeyGeometry();
      };
      lbl.append(
        chk,
        makeElement('span', { style: 'margin-left:5px' }, t.label)
      );
      toggleCont.append(lbl);
    });
    container.append(toggleCont);

    const swatchContainer = makeElement('div', {
      style:
        'margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #333; display:flex; gap:15px; justify-content:center;',
    });

    const mkSwatch = (label, getVal, setVal) => {
      const val = getVal();
      const wrapper = makeElement('div', {
        style: 'display:flex; align-items:center; gap:8px;',
      });
      wrapper.append(
        makeElement('span', { style: 'font-size:10px; color:#888' }, label)
      );
      const swatch = makeElement('div', {
        style: `width:20px; height:20px; background:${
          val || 'transparent'
        }; border:1px solid #555; border-radius:3px; cursor:pointer; box-shadow:0 0 4px rgba(0,0,0,0.5);`,
      });
      swatch.onclick = (e) => {
        Promise.resolve({ ColorPicker: (typeof ColorPicker !== "undefined" ? ColorPicker : null) })
          .then(({ ColorPicker }) => {
            new ColorPicker().openSmartPicker(e.target, getVal(), (newHex) => {
              swatch.style.background = newHex;
              setVal(newHex);
            });
          })
          .catch((err) => {
            console.error(err);
          });
      };
      wrapper.append(swatch);
      return wrapper;
    };

    swatchContainer.append(
      mkSwatch(
        'Key:',
        () => app.keyColor || '#000000',
        (c) => {
          app.keyColor = c;
          app.coloredSurfaces = false;
          app.visuals.setKeyColor(c);
          app._updateKeyGeometry();
        }
      )
    );
    swatchContainer.append(
      mkSwatch(
        'Background:',
        () => app.backgroundColor || '#1a0505',
        (c) => {
          app.backgroundColor = c;
          app._updateBackground();
        }
      )
    );
    container.appendChild(swatchContainer);

    const mkGroup = (l) =>
      container.appendChild(
        makeElement(
          'div',
          {
            style:
              'color:#4a90e2; font-size:9px; font-weight:700; margin:10px 0 4px 0; letter-spacing:1px;',
          },
          l
        )
      );

    const mkSet = (l, prop, min, max, step, def) => {
      return this._mkDialogSlider(
        l,
        () =>
          app?.dimensions && app.dimensions[prop] !== undefined
            ? app.dimensions[prop]
            : def,
        (v) => {
          if (app) app.setDimension(prop, v);
        },
        min,
        max,
        step
      );
    };

    mkGroup('KEYBOARD LAYOUT');
    container.append(
      mkSet('Octaves', 'octaves', 1, 4, 1, 2),
      mkSet('W Width', 'whiteKeyWidth', 0.1, 2.0, 0.01, 1.12),
      mkSet('W Front Ext', 'whiteKeyLengthExtension', 0, 5.0, 0.01, 2.0),
      mkSet('W Height', 'whiteKeyHeight', 0.01, 1.5, 0.01, 0.14),
      mkSet('Key Gap', 'keyGap', 0, 0.2, 0.001, 0.04),
      mkSet('W Corner R', 'whiteCornerRadius', 0, 0.5, 0.01, 0.1),
      mkSet('W Bevel R', 'whiteBevelRadius', 0, 0.1, 0.001, 0.063),
      mkSet('B Y-Offset', 'blackKeyYOffset', -0.5, 1.0, 0.01, 0.0),
      mkSet('2-Clust Spr', 'cluster2Spread', -0.5, 0.5, 0.001, 0.112),
      mkSet('3-Clust Spr', 'cluster3Spread', -0.5, 0.5, 0.001, 0.173)
    );

    mkGroup('DIMENSIONS');
    container.append(
      mkSet('Base Width', 'baseWidth', 0.3, 1.5, 0.01, 0.66),
      mkSet('Base Length', 'baseLength', 2.0, 6.0, 0.01, 4.0),
      mkSet('Height', 'height', 0.2, 1.5, 0.01, 0.52)
    );

    mkGroup('TAPERS & RADII');
    container.append(
      mkSet('Front Taper', 'frontTaper', 0, 1.0, 0.001, 0.34),
      mkSet('Side Taper', 'sideTaper', 0, 0.5, 0.001, 0.1),
      mkSet('FrontBase R', 'frontBaseRadius', 0, 0.5, 0.001, 0.04),
      mkSet('TopSide R', 'topSideRadius', 0, 0.5, 0.001, 0.034),
      mkSet('FrontTop R', 'frontTopRadius', 0, 0.5, 0.001, 0.07),
      mkSet('TopCorner R', 'topCornerRadius', 0.01, 0.5, 0.001, 0.17),
      mkSet('SideCorner R', 'sideCornerRadius', 0.01, 0.5, 0.001, 0.27),
      mkSet('FrCorner R', 'frontCornerRadius', 0.01, 0.5, 0.001, 0.22)
    );

    mkGroup('SURFACE BULGE');
    container.append(
      mkSet('Top Inner', 'topBulgeInner', 0.1, 1.0, 0.001, 0.464),
      mkSet('Top Outer', 'topBulgeOuter', 0.1, 1.5, 0.001, 0.81),
      mkSet('Side Inner', 'sideBulgeInner', 0.1, 1.0, 0.001, 0.29),
      mkSet('Side Outer', 'sideBulgeOuter', 0.1, 1.5, 0.001, 0.6),
      mkSet('Front Inner', 'frontBulgeInner', 0.1, 1.0, 0.001, 0.53),
      mkSet('Front Outer', 'frontBulgeOuter', 0.1, 1.5, 0.001, 0.59)
    );

    mkGroup('TRIANGLE DETAIL');
    container.append(
      mkSet('Tri Bulge', 'triCenterBulge', -0.05, 0.1, 0.001, 0.035),
      mkSet('Shift X', 'triShiftX', -0.5, 0.5, 0.001, -0.007),
      mkSet('Shift Y', 'triShiftY', -0.5, 0.5, 0.001, -0.012),
      mkSet('Shift Z', 'triShiftZ', -0.5, 0.5, 0.001, -0.005)
    );
  }

  _mkDialogSlider(labelText, getVal, setVal, min, max, step) {
    const row = makeElement('div', {
      style: 'display:flex; align-items:center; gap:8px; margin-bottom:4px;',
    });
    const labelEl = makeElement(
      'div',
      {
        style:
          'flex:0 0 75px; font-size:9px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color 0.1s;',
      },
      labelText
    );

    const sl = makeElement('input', {
      type: 'range',
      min,
      max,
      step,
      value: getVal(),
      style: 'flex:1; height:4px; margin:0; cursor:pointer;',
    });

    const decimals = step < 1 ? (step < 0.01 ? 3 : 2) : 0;

    const updateDisplay = (val) => {
      labelEl.textContent = val.toFixed(decimals);
      labelEl.style.color = '#4a90e2';
      labelEl.style.fontWeight = 'bold';
    };
    const resetDisplay = () => {
      labelEl.textContent = labelText;
      labelEl.style.color = '#aaa';
      labelEl.style.fontWeight = 'normal';
    };

    let isDragging = false;

    sl.onmousedown = () => {
      isDragging = true;
      updateDisplay(parseFloat(sl.value));
    };
    sl.onmouseup = () => {
      isDragging = false;
      resetDisplay();
    };
    sl.onmouseleave = () => {
      if (!isDragging) resetDisplay();
    };

    sl.addEventListener(
      'touchstart',
      () => {
        isDragging = true;
        updateDisplay(parseFloat(sl.value));
      },
      { passive: true }
    );
    sl.addEventListener('touchend', () => {
      isDragging = false;
      resetDisplay();
    });

    sl.oninput = () => {
      const v = parseFloat(sl.value);
      setVal(v);
      if (isDragging) updateDisplay(v);
    };

    const poll = () => {
      if (!sl.isConnected) return;
      const actual = getVal();
      if (
        actual !== undefined &&
        Math.abs(actual - parseFloat(sl.value)) > 0.001
      ) {
        sl.value = actual;
      }
      setTimeout(poll, 250);
    };
    setTimeout(poll, 250);

    row.append(labelEl, sl);
    return row;
  }

  makeDraggable(el, persistenceKey) {
    const constrainToScreen = () => {
      const r = el.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let newLeft = parseFloat(el.style.left) || r.left;
      let newTop = parseFloat(el.style.top) || r.top;
      let changed = false;

      if (newLeft > winW - r.width / 2) {
        newLeft = winW - r.width / 2;
        changed = true;
      }
      if (newLeft < -r.width / 2) {
        newLeft = -r.width / 2;
        changed = true;
      }

      if (newTop > winH - r.height / 2) {
        newTop = winH - r.height / 2;
        changed = true;
      }
      if (newTop < 0) {
        newTop = 0;
        changed = true;
      }

      if (changed) {
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
        if (persistenceKey) {
          localStorage.setItem(
            persistenceKey,
            JSON.stringify({ left: el.style.left, top: el.style.top })
          );
        }
      }
    };

    setTimeout(constrainToScreen, 100);

    el.addEventListener('mousedown', (e) => {
      if (
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'INPUT' ||
        e.target.closest('.dock-btn')
      )
        return;
      e.preventDefault();

      if (typeof UITools !== 'undefined' && UITools._showCovers) {
        UITools._showCovers();
      }

      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      el.style.transform = 'none';
      el.style.bottom = 'auto';
      el.style.right = 'auto';

      const onMove = (mv) => {
        const x = mv.clientX - offsetX;
        const y = mv.clientY - offsetY;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);

        if (typeof UITools !== 'undefined' && UITools._hideCovers) {
          UITools._hideCovers();
        }

        constrainToScreen();
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  createFullscreenToolbar() {
    this.destroyFullscreenToolbar();

    const saved = localStorage.getItem('gt-fs-toolbar-pos');
    let startLeft = 50,
      startTop = 20;
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        startLeft = pos.left;
        startTop = pos.top;
      } catch (e) {}
    }

    const toolbar = makeElement('div', {
      className: 'gt-fullscreen-toolbar',
      style: {
        left: startLeft + 'px',
        top: startTop + 'px',
      },
    });

    if (this.player.headerControlsUI) {
      this.player.headerControlsUI.buildFullscreenToolbar(toolbar);
    }

    const exitBtn = makeElement('button', {
      style:
        'padding:2px 4px; background:transparent; border:1px solid #555; border-radius:3px; cursor:pointer; margin-left:4px; display:flex; align-items:center;',
      title: 'Exit Fullscreen (Esc)',
      onclick: () => document.exitFullscreen(),
    });
    const exitSvg = makeElement('svg:svg', { width: 14, height: 14 });
    const d = [
      'M 1 5 L 1 1 L 5 1',
      'M 9 1 L 13 1 L 13 5',
      'M 13 9 L 13 13 L 9 13',
      'M 5 13 L 1 13 L 1 9',
    ].join(' ');
    exitSvg.appendChild(
      makeElement('svg:path', {
        d: d,
        stroke: '#999',
        'stroke-width': '1.5',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        fill: 'none',
      })
    );
    exitBtn.appendChild(exitSvg);
    toolbar.appendChild(exitBtn);

    document.body.appendChild(toolbar);
    this._fsToolbar = toolbar;

    let dragOffsetX,
      dragOffsetY,
      isDragging = false;
    toolbar.addEventListener('mousedown', (e) => {
      if (
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'LABEL' ||
        e.target.closest('label')
      )
        return;
      e.preventDefault();
      isDragging = true;
      if (typeof UITools !== 'undefined' && UITools._showCovers) UITools._showCovers();
      const rect = toolbar.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
    });

    this._fsDragMove = (e) => {
      if (!isDragging) return;
      let newX = e.clientX - dragOffsetX;
      let newY = e.clientY - dragOffsetY;
      const r = toolbar.getBoundingClientRect();
      newX = Math.max(0, Math.min(newX, window.innerWidth - r.width));
      newY = Math.max(0, Math.min(newY, window.innerHeight - r.height));
      toolbar.style.left = newX + 'px';
      toolbar.style.top = newY + 'px';
    };

    this._fsDragUp = () => {
      if (!isDragging) return;
      isDragging = false;
      if (typeof UITools !== 'undefined' && UITools._hideCovers) UITools._hideCovers();
      localStorage.setItem(
        'gt-fs-toolbar-pos',
        JSON.stringify({
          left: parseInt(toolbar.style.left),
          top: parseInt(toolbar.style.top),
        })
      );
    };

    document.addEventListener('mousemove', this._fsDragMove);
    document.addEventListener('mouseup', this._fsDragUp);

    requestAnimationFrame(() => {
      const r = toolbar.getBoundingClientRect();
      let x = parseInt(toolbar.style.left);
      let y = parseInt(toolbar.style.top);
      x = Math.max(0, Math.min(x, window.innerWidth - r.width));
      y = Math.max(0, Math.min(y, window.innerHeight - r.height));
      toolbar.style.left = x + 'px';
      toolbar.style.top = y + 'px';
    });
  }

}

