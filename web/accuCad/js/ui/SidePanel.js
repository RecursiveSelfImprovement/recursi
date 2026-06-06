class SidePanel {
    constructor(baseController, parentElement, canvasContainer) {
      this.baseController = baseController;
      this.parentElement = parentElement;
      this.canvasContainer = canvasContainer;
      this.isOpen = true;

      this._injectStyles();
      this._createElements();
      this._populateContent();
    }

    _injectStyles() {
      const css = `
        .cad-sidebar {
          width: 320px;
          height: 100%;
          background: #16161a;
          color: #ddd;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #2e2e38;
          transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
          flex-shrink: 0;
          z-index: 1000;
          font-family: sans-serif;
          overflow: hidden;
          box-sizing: border-box;
        }
        .cad-sidebar.closed {
          margin-left: -320px;
          opacity: 0;
          pointer-events: none;
        }
        .cad-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #0d0d11;
          border-bottom: 1px solid #2e2e38;
        }
        .cad-sidebar-title {
          font-family: 'Architects Daughter', sans-serif;
          font-size: 16px;
          font-weight: bold;
          color: #00ff66;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .cad-sidebar-close-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 16px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.15s, color 0.15s;
        }
        .cad-sidebar-close-btn:hover {
          background: #2a2a35;
          color: #fff;
        }
        /* Custom scrollbar applied to the overall sidebar content only */
        .cad-sidebar-content {
          flex-grow: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cad-sidebar-content::-webkit-scrollbar {
          width: 6px;
        }
        .cad-sidebar-content::-webkit-scrollbar-track {
          background: #0d0d11;
        }
        .cad-sidebar-content::-webkit-scrollbar-thumb {
          background: #2e2e38;
          border-radius: 3px;
        }
        .cad-sidebar-content::-webkit-scrollbar-thumb:hover {
          background: #00ff66;
        }
        .cad-sidebar-section {
          border: 1px solid #2e2e38;
          background: #0d0d11;
          border-radius: 6px;
          overflow: hidden;
        }
        .cad-sidebar-section summary {
          padding: 10px 14px;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #00ff66;
          cursor: pointer;
          user-select: none;
          background: #16161a;
          border-bottom: 1px solid #2e2e38;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cad-sidebar-section summary::-webkit-details-marker {
          display: none;
        }
        .cad-sidebar-section summary::after {
          content: '▼';
          font-size: 10px;
          color: #888;
          transition: transform 0.2s;
        }
        .cad-sidebar-section[open] summary::after {
          transform: rotate(-180deg);
        }
        .cad-sidebar-section-body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: visible; /* Prevents nested scroll bars on panels */
          height: auto;
        }
        .cad-sidebar-show-btn {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 1001;
          background: #0d0d11;
          color: #00ff66;
          border: 1px solid #2e2e38;
          border-radius: 4px;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          transition: background 0.15s, color 0.15s;
          display: none;
        }
        .cad-sidebar-show-btn:hover {
          background: #2a2a35;
          color: #fff;
        }
        .cad-sidebar-content .slider-control-container {
          margin-bottom: 8px;
          background: transparent;
          border: none;
          padding: 0;
          box-shadow: none;
        }
        .cad-sidebar-content .slider-control-label {
          color: #aaa;
          font-size: 11px;
        }
      `;
      applyCss(css, 'cad-sidebar-styles');
    }

    _createElements() {
      this.element = makeElement('div', { className: 'cad-sidebar' },
        makeElement('div', { className: 'cad-sidebar-header' },
          makeElement('h2', { className: 'cad-sidebar-title' }, 'accuCad Panel'),
          makeElement('button', {
            className: 'cad-sidebar-close-btn',
            onclick: () => this.toggle(false)
          }, '◀')
        ),
        this.contentArea = makeElement('div', { className: 'cad-sidebar-content' })
      );

      this.showButton = makeElement('button', {
        className: 'cad-sidebar-show-btn',
        onclick: () => this.toggle(true)
      }, '▶ Menu');

      this.canvasContainer.appendChild(this.showButton);
    }

    toggle(open) {
      this.isOpen = open;
      if (open) {
        this.element.classList.remove('closed');
        this.showButton.style.display = 'none';
      } else {
        this.element.classList.add('closed');
        this.showButton.style.display = 'block';
      }
      setTimeout(() => {
        if (this.baseController && typeof this.baseController.refreshMousePosition === 'function') {
          this.baseController.refreshMousePosition();
        }
      }, 300);
    }

    _populateContent() {
      this.toolSettingsSection = this._createSection('Tool Settings', true);
      this.compassSection = this._createSection('Compass Controls', true);
      this.p2pSection = this._createSection('P2P Connection', false);

      this._setupToolSettingsWatcher();
    }

    _createSection(title, defaultOpen = true) {
      const body = makeElement('div', { className: 'cad-sidebar-section-body' });
      const section = makeElement('details', {
        className: 'cad-sidebar-section',
        open: defaultOpen ? 'open' : undefined
      },
        makeElement('summary', {}, title),
        body
      );
      this.contentArea.appendChild(section);
      return body;
    }

    _setupToolSettingsWatcher() {
      this.toolSliders = {};
      const render = () => {
        this.toolSettingsSection.innerHTML = '';
        this.toolSliders = {};

        const controller = this.baseController;
        if (!controller) return;

        const activeCmd = controller.activeCommand;
        const cmdName = activeCmd ? (activeCmd.constructor ? activeCmd.constructor.name : 'Unknown') : 'None';
        
        const friendlyNames = {
          'DrawRectangleCommand': 'Rectangle Tool',
          'DrawArcCommand': 'Arc Tool',
          'DrawPathCommand': 'Path/Rounding Tool',
          'DrawCurveCommand': 'Bezier Curve Tool',
          'DrawCircleCommand': 'Circle Tool',
          'DrawCapsuleCommand': 'Capsule Tool',
          'DrawBlackKeyCommand': 'Black Key Tool',
          'ElementPickCommand': 'Selection Tool'
        };
        const displayName = friendlyNames[cmdName] || cmdName.replace('Command', ' Tool');

        const toolHeader = makeElement('div', {
          style: {
            fontWeight: 'bold',
            color: '#00ff66',
            fontSize: '13px',
            borderBottom: '1px solid #333',
            paddingBottom: '6px',
            marginBottom: '10px'
          }
        }, 'Active: ' + displayName);
        this.toolSettingsSection.appendChild(toolHeader);

        const colorContainer = makeElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } });
        const colorLabel = makeElement('div', { style: { fontSize: '11px', color: '#888' } }, 'Drawing Color');
        const colorPicker = makeElement('input', {
          type: 'color',
          value: controller.currentColor || '#00ff00',
          style: {
            width: '100%',
            height: '30px',
            border: 'none',
            background: 'none',
            cursor: 'pointer'
          },
          onchange: (e) => {
            controller.setColor(e.target.value);
            controller.refreshMousePosition();
          }
        });
        colorContainer.appendChild(colorLabel);
        colorContainer.appendChild(colorPicker);
        this.toolSettingsSection.appendChild(colorContainer);

        const widthSlider = new SliderControl({
          label: 'line thickness',
          min: 1,
          max: 20,
          initialValue: controller.lineWidth || 2,
          showValue: true,
          callback: (val) => {
            controller.setLineWidth(Math.round(val));
            controller.refreshMousePosition();
          }
        });
        this.toolSettingsSection.appendChild(widthSlider.container);
        this.toolSliders['lineWidth'] = widthSlider;

        const supportsControlValue = [
          'DrawPathCommand',
          'DrawCapsuleCommand',
          'DrawBlackKeyCommand'
        ].includes(cmdName);

        if (supportsControlValue) {
          let label = 'tool custom parameter';
          let minVal = 0.05, maxVal = 2.0;
          if (cmdName === 'DrawPathCommand') {
            label = 'rounding radius';
            minVal = 0; maxVal = 1.0;
          } else if (cmdName === 'DrawCapsuleCommand') {
            label = 'capsule radius';
            minVal = 0.1; maxVal = 1.5;
          }

          const controlValueSlider = new SliderControl({
            label: label,
            min: minVal,
            max: maxVal,
            initialValue: controller.commandControlValue || 0.25,
            showValue: true,
            callback: (val) => {
              controller.commandControlValue = val;
              controller.refreshMousePosition();
            }
          });
          this.toolSettingsSection.appendChild(controlValueSlider.container);
          this.toolSliders['commandControlValue'] = controlValueSlider;
        }

        if (ViewControlsManager.instance && typeof ViewControlsManager.instance._updateSlidersHighlighting === 'function') {
          ViewControlsManager.instance._updateSlidersHighlighting();
        }
      };

      setInterval(() => {
        const currentCmd = this.baseController?.activeCommand;
        if (this._lastWatchedCommand !== currentCmd) {
          this._lastWatchedCommand = currentCmd;
          render();
        }
      }, 500);

      render();
    }
  }