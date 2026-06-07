class BasicsWithDialogBox {
  async run(env) {
      if (!env || !env.container) {
        throw new Error("[BasicsWithDialogBox] run() requires an environment object with a valid container.");
      }
      this.env = env;
      const targetElement = env.container;

      this.titleElement = null;
      this.statusDiv = null;
      this.configSection = null;
      this.configTextarea = null;
      this.createBoxButton = null;
      this.autoLoadedBox = null;
      this.autoLoadedBoxDimensionDisplay = null;
      this.configuredBoxes = [];
      this.qrTool = null;

      this._handleResize = () => {
        if (typeof this.onResize === 'function') {
          this.onResize(targetElement.clientWidth, targetElement.clientHeight);
        }
      };
      window.addEventListener('resize', this._handleResize);

      applyCss(
        `
        .basics-app-container { 
            background-color: #f4f6f9; 
            color: #2c3e50;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            padding-bottom: 150px; 
            min-height: 100vh; 
            box-sizing: border-box; 
            width: 100%;
        }
        .app-title { color: #2c3e50; margin-top: 0; margin-bottom: 15px; }
        .status-message { font-style: italic; color: #555; margin-top: 10px; min-height: 1.2em; }
        .config-section {
            margin-top: 20px; padding: 15px; border: 1px solid #cbd5e1;
            background-color: #ffffff; border-radius: 8px; max-width: 450px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .config-section label { display: block; margin-bottom: 8px; font-weight: 600; color: #475569; }
        .config-section textarea {
            width: 100%; min-height: 100px; font-family: monospace; font-size: 0.9em;
            border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; margin-bottom: 10px; 
            resize: vertical; box-sizing: border-box; background: #f8fafc; color: #1e293b;
        }
        .config-section button { 
            padding: 8px 16px; background-color: #3b82f6; color: white; 
            border: none; border-radius: 4px; cursor: pointer; font-weight: 600; 
        }
        .config-section button:hover { background-color: #2563eb; }
        .dimension-display { font-size: 0.85em; color: #64748b; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        .svg-demo-container { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
        .qrgen-section {
            margin-top: 20px; padding: 15px; border: 1px solid #a78bfa;
            background-color: #faf5ff; border-radius: 8px; max-width: 450px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .qrgen-section-label { font-weight: 600; color: #6d28d9; margin-bottom: 6px; font-size: 0.95em; }
        .qrgen-section p { margin: 0 0 10px; font-size: 0.85em; color: #555; }
        .qrgen-open-btn {
            padding: 8px 16px; background: #7c3aed; color: white;
            border: none; border-radius: 4px; cursor: pointer; font-weight: 600;
        }
        .qrgen-open-btn:hover { background: #6d28d9; }
        `,
        'basicsWithDialogBox-app-styles'
      );

      targetElement.classList.add('basics-app-container');

      this.titleElement = makeElement('h1', { className: 'app-title' }, 'Basics With DialogBox');

      this.containerSizeDisplay = makeElement('div', {
        className: 'dimension-display',
        style: { fontWeight: 'bold', color: '#336', marginBottom: '10px', borderTop: 'none', paddingTop: 0 }
      }, 'Container size: W x H');

      this.statusDiv = makeElement('div', { className: 'status-message' }, 'App loaded.');

      targetElement.appendChild(this.titleElement);
      targetElement.appendChild(this.containerSizeDisplay);
      targetElement.appendChild(this.statusDiv);

      this.autoLoadedBoxDimensionDisplay = makeElement('div', { className: 'dimension-display' }, 'Inner size: W x H');

      this.autoLoadedBox = UITools.makeDialog({
        env: this.env,
        title: 'Auto-Loaded Box',
        size: [350, 250],
        position: [550, 80],
        onGeometryChange: (boxInstance, geometry) => {
          if (this.autoLoadedBoxDimensionDisplay) {
            this.autoLoadedBoxDimensionDisplay.textContent = `Inner Size: ${geometry.inner.width.toFixed(0)}W x ${geometry.inner.height.toFixed(0)}H`;
          }
        },
      });

      this.autoLoadedBox.contentElement.appendChild(
        makeElement('p', { style: { marginTop: 0 } }, 'This box appears automagically.')
      );
      this.autoLoadedBox.contentElement.appendChild(
        makeElement('button', {
          style: { padding: '6px 12px', cursor: 'pointer' },
          onclick: () => {
            this.autoLoadedBox.contentElement.querySelector('p').textContent = 'Box 1 button clicked!';
            this.statusDiv.textContent = 'Box 1 button clicked.';
          }
        }, 'Click Me (Box 1)')
      );
      this.autoLoadedBox.contentElement.appendChild(this.autoLoadedBoxDimensionDisplay);

      const svgDemoContainer = makeElement('div', { className: 'svg-demo-container' },
        makeElement('span', { style: { fontSize: '0.8em', color: '#666' } }, 'SVG Demo: '),
        makeElement('svg:svg', { width: 100, height: 30, style: { verticalAlign: 'middle', marginLeft: '5px' } }, [
          ['svg:rect', { x: 5, y: 5, width: 20, height: 20, fill: 'cornflowerblue', stroke: 'black', 'stroke-width': 1 }],
          ['svg:circle', { cx: 45, cy: 15, r: 10, fill: 'lightcoral' }],
          ['svg:line', { x1: 65, y1: 5, x2: 95, y2: 25, stroke: 'green', 'stroke-width': 2 }],
        ])
      );
      this.autoLoadedBox.contentElement.appendChild(svgDemoContainer);

      const arrayDemoElement = makeElement('p', {
        style: { fontSize: '0.8em', color: '#666', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '5px' }
      }, ['makeElement array demo: ', ['strong', 'bold text'], ' and regular text.']);
      this.autoLoadedBox.contentElement.appendChild(arrayDemoElement);

      const defaultBoxOptions = {
        title: 'Configured Box',
        size: [300, 180],
        position: [450, 280],
        transparent: false,
        titleBarAtBottom: false,
      };

      this.configSection = makeElement('div', { className: 'config-section' });
      const configLabel = makeElement('label', { htmlFor: 'boxConfigInput' }, 'Configure & Create New Box (JSON):');
      this.configTextarea = makeElement('textarea', { style: { height: '240px' }, id: 'boxConfigInput' }, JSON.stringify(defaultBoxOptions, null, 2));
      this.createBoxButton = makeElement('button', 'Create Box from Config');
      this.createBoxButton.onclick = () => this.createConfigurableBox();

      this.configSection.appendChild(configLabel);
      this.configSection.appendChild(this.configTextarea);
      this.configSection.appendChild(this.createBoxButton);
      targetElement.appendChild(this.configSection);

      // QR Generator section
      this._initQRSection(targetElement);

      this.statusDiv.textContent = 'App Initialized. Try resizing/moving the first box or creating new ones.';

      setTimeout(() => {
        this._handleResize();
        if (this.autoLoadedBox) {
          this.autoLoadedBox.triggerCallback();
        }
      }, 10);
    }

  onResize(width, height) {
    if (this.containerSizeDisplay) {
      this.containerSizeDisplay.textContent = `Container size: ${Math.round(
        width
      )}W x ${Math.round(height)}H`;
    }
  }

  createConfigurableBox() {
      if (!this.configTextarea || !this.statusDiv) {
        console.error('Required elements not initialized.');
        return;
      }

      const jsonString = this.configTextarea.value;
      let options;

      try {
        options = JSON.parse(jsonString);
        options.env = this.env; // ENSURE DIALOG IS BOUND TO ENVIRONMENT
        this.statusDiv.textContent = 'Creating box with provided config...';

        const configuredBox = UITools.makeDialog(options);

        if (!options.contentHTML && !options.contentElement) {
          configuredBox.contentElement.appendChild(
            makeElement(
              'p',
              { style: { marginTop: 0 } },
              `Box created with title: "${options.title || 'Untitled'}"`
            )
          );
          configuredBox.contentElement.appendChild(
            makeElement(
              'p',
              `Size: ${options.size ? options.size.join('x') : 'Default'}`
            )
          );
        }

        this.configuredBoxes.push(configuredBox);
        this.statusDiv.textContent = `DialogBox "${options.title || 'Untitled'}" created successfully. Count: ${this.configuredBoxes.length}`;
      } catch (error) {
        console.error('Error parsing JSON config:', error);
        this.statusDiv.textContent = `Error: Invalid JSON configuration. ${error.message}`;
        alert(`Invalid JSON configuration:\n${error.message}\nPlease check the text area.`);
      }
    }

  getLastConfiguredBox() {
    return this.configuredBoxes.length > 0
      ? this.configuredBoxes[this.configuredBoxes.length - 1]
      : null;
  }

  destroy() {
    window.removeEventListener('resize', this._handleResize);
    if (this.autoLoadedBox && typeof this.autoLoadedBox.close === 'function') {
      this.autoLoadedBox.close();
    }
    if (this.configuredBoxes) {
      this.configuredBoxes.forEach((box) => {
        if (box && typeof box.close === 'function') box.close();
      });
      this.configuredBoxes = [];
    }
  }

  static _doc_BasicsWithDialogBox() {
    return {
      generatedBy: 'MigrateOwnedSidecarDocsToCapsulesV2',
      migratedAt: '2026-04-29T05:02:29.319Z',
      sourcePath: '/BasicsWithDialogBox/js/BasicsWithDialogBox_js.md',
      ownerPath: '/BasicsWithDialogBox/js/BasicsWithDialogBox.js',
      ownerClass: 'BasicsWithDialogBox',
      migrationStatus: 'sidecar-embedded-sidecar-deleted',
      visibilityRole: 'documentation',
      note: 'Migrated from legacy *_js.md sidecar into the managed JS capsule. This method is documentation payload, not runtime code. Prompt visibility docsLevel should control inclusion.',
      content:
        '# `BasicsWithDialogBox.js`\n\nThis module exports the main application class, `BasicsWithDialogBox`. It serves as the central controller for the user interface, managing state and handling user interactions.\n\n## Class: `BasicsWithDialogBox`\n\n### Purpose\n\nThis class is responsible for initializing the application\'s UI, creating and managing `DialogBox` instances, and responding to user actions. It demonstrates how to use the `DialogBox`, `makeElement`, and `applyCss` utilities to build a functional web application.\n\n### Key Instance Properties\n\n-   **`titleElement`**: Reference to the main `<h1>` title of the application.\n-   **`statusDiv`**: Reference to the DOM element used for displaying status messages.\n-   **`configSection`**: The DOM element containing the configuration controls.\n-   **`configTextarea`**: The `<textarea>` where users can input JSON to configure a new `DialogBox`.\n-   **`createBoxButton`**: The button that triggers the creation of a new box from the config.\n-   **`autoLoadedBox`**: The first `DialogBox` instance that is created automatically on startup.\n-   **`autoLoadedBoxDimensionDisplay`**: A DOM element inside the auto-loaded box that shows its current inner dimensions.\n-   **`configuredBoxes`**: An array that stores references to all `DialogBox` instances created by the user via the configuration form.\n\n### Core Methods\n\n#### `init(targetElement)`\n\nThis is the main entry point for the application. It should be called once after the class is instantiated.\n\n-   **Purpose**: Builds the entire initial user interface, including the title, status area, and the configuration form. It also creates the first "auto-loaded" `DialogBox` and sets up all necessary event listeners.\n-   **Parameters**:\n    -   **`targetElement`** (Node): The DOM element into which the application\'s UI should be rendered (typically `document.body`).\n\n#### `createConfigurableBox()`\n\n-   **Purpose**: This method is called when the "Create Box from Config" button is clicked. It reads the JSON string from `this.configTextarea`, parses it, and uses the resulting object to instantiate a new `DialogBox`. It includes error handling for invalid JSON.\n\n#### `updateStatus(message)`\n\n-   **Purpose**: A simple helper method to update the text content of the status message display area.\n\n#### `getLastConfiguredBox()`\n\n-   **Purpose**: A utility method to retrieve the most recently created user-configured `DialogBox` instance.',
    };
  }


  _initQRSection(targetElement) {
      this.qrTool = new QRGeneratorTool();

      const section = makeElement('div', { className: 'qrgen-section' });
      const label = makeElement('div', { className: 'qrgen-section-label' }, '🔲 QR Code Generator');
      const desc = makeElement('p', {}, 'Generate a QR code from any URL or text, then download the PNG to test with an online scanner.');
      const openBtn = makeElement('button', {
        className: 'qrgen-open-btn',
        onclick: () => this.qrTool.open(this.env)
      }, 'Open QR Generator');

      section.appendChild(label);
      section.appendChild(desc);
      section.appendChild(openBtn);
      targetElement.appendChild(section);
    }
}