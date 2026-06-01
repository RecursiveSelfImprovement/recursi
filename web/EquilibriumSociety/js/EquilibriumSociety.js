class EquilibriumSociety {
  async run(env) {
      this.env = env;
      this.targetElement = env.container;
      this.isDirty = false; // Tracks if modifications have occurred
      this.activeTheme = 'dark';
      this.documentStructure = [];
      this.activeDialogs = [];

      this.targetElement.innerHTML = '';
      
      // Inject structural style and apply active theme variables
      this.applyBaseStyles();
      this.applyTheme(this.activeTheme);

      // Build main UI framework
      this.buildWorkspaceLayout();

      // Read model from orig.html template file
      await this.loadDocumentModel();

      this.renderSidebar();
      this.renderWorkspace();
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
      this.statusDiv.textContent = `DialogBox "${
        options.title || 'Untitled'
      }" created successfully. Count: ${this.configuredBoxes.length}`;
    } catch (error) {
      console.error('Error parsing JSON config:', error);
      this.statusDiv.textContent = `Error: Invalid JSON configuration. ${error.message}`;
      alert(
        `Invalid JSON configuration:\n${error.message}\nPlease check the text area.`
      );
    }
  }

  getLastConfiguredBox() {
    return this.configuredBoxes.length > 0
      ? this.configuredBoxes[this.configuredBoxes.length - 1]
      : null;
  }

  destroy() {
      this.activeDialogs.forEach(dialog => {
        if (dialog && typeof dialog.close === 'function') {
          dialog.close();
        }
      });
      this.targetElement.innerHTML = '';
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

  

  

  buildWorkspaceLayout() {
      this.workspaceElement = makeElement('div', { className: 'eq-workspace' });
      this.sidebarElement = makeElement('aside', { className: 'eq-sidebar' });
      this.contentPaneElement = makeElement('div', { className: 'eq-content-pane' });

      this.workspaceElement.appendChild(this.sidebarElement);
      this.workspaceElement.appendChild(this.contentPaneElement);
      this.targetElement.appendChild(this.workspaceElement);

      this.toastElement = makeElement('div', { className: 'eq-toast-box' }, 'Update Saved');
      this.targetElement.appendChild(this.toastElement);
    }

  renderSidebar() {
      this.sidebarElement.innerHTML = '';
      
      const brand = makeElement('div', { className: 'eq-sidebar-brand' }, 'EQUILIBRIUM COLONY');
      const sectionsList = makeElement('ul', { className: 'eq-sidebar-sections' });

      this.documentStructure.forEach(sec => {
        const item = makeElement('li', {
          className: 'eq-side-item',
          onclick: () => this.scrollToSection(sec.id)
        }, [
          makeElement('span', { className: 'eq-side-id' }, sec.id),
          makeElement('span', { style: { fontWeight: '600', color: '#f1f5f9' } }, sec.title),
          makeElement('span', {
            className: `eq-side-badge ${sec.type === 'indepth' ? 'eq-badge-indepth' : 'eq-badge-std'}`
          }, sec.type === 'indepth' ? 'In-Depth' : 'Continuous')
        ]);
        sectionsList.appendChild(item);
      });

      this.sidebarElement.appendChild(brand);
      this.sidebarElement.appendChild(sectionsList);
    }

  

  buildLLMPanel() {
      const panel = makeElement('div', { className: 'eq-llm-panel' });
      const header = makeElement('div', { className: 'eq-llm-header' }, '🤖 Surgical Element Replacer (Human & LLM Sync)');
      const desc = makeElement('p', { className: 'eq-llm-desc' }, 
        'Directly replace the content of any individual block or paragraph by pasting its target ID. This keeps updates lightweight and immediate.');

      const selectLabel = makeElement('label', { style: { fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' } }, 'Select Target Block ID:');
      const select = makeElement('select', { className: 'eq-llm-input', style: { width: '100%', marginBottom: '12px' } });

      this.documentStructure.forEach(sec => {
        sec.elements.forEach(el => {
          const option = makeElement('option', { value: `${sec.id}:${el.id}` }, `[${sec.id}] -> [${el.id}] (${el.textContent.substring(0, 45)}...)`);
          select.appendChild(option);
        });
      });

      const textarea = makeElement('textarea', {
        className: 'eq-llm-textarea',
        placeholder: 'Insert raw text or custom HTML here...',
        style: { width: '100%', minHeight: '80px' }
      });

      const applyBtn = makeElement('button', {
        className: 'eq-btn eq-btn-primary',
        style: { width: '100%', justifyContent: 'center' },
        onclick: () => {
          const [secId, elId] = select.value.split(':');
          const val = textarea.value.trim();
          if (!val) return;
          this.handleElementBlur(secId, elId, val);
          textarea.value = '';
          this.renderWorkspace();
          this.showToast(`Surgically updated block #${elId}`);
        }
      }, 'Apply Targeted Block Update');

      panel.appendChild(header);
      panel.appendChild(desc);
      panel.appendChild(selectLabel);
      panel.appendChild(select);
      panel.appendChild(textarea);
      panel.appendChild(applyBtn);

      return panel;
    }

  handleElementBlur(sectionId, elementId, newHtml) {
      const section = this.documentStructure.find(s => s.id === sectionId);
      if (section) {
        const el = section.elements.find(e => e.id === elementId);
        if (el) {
          el.innerHTML = newHtml;
          const temp = document.createElement('div');
          temp.innerHTML = newHtml;
          el.textContent = temp.textContent || temp.innerText || "";
          
          if (el.tag.match(/^h[1-4]$/i)) {
            section.title = el.textContent.replace(/^\[In-Depth:\s*|\]$/g, '').trim();
            this.renderSidebar();
          }
        }
      }
    }

  openInDepthPopup(section) {
      const dialogInner = makeElement('div', { className: 'eq-dialog-inner' });
      this.activeInDepthDialogInner = dialogInner; // Hold reference for nested re-rendering

      // Render every element inside the pop-up with edit pencils enabled!
      section.elements.forEach(el => {
        const blockDiv = makeElement('div', { className: 'eq-element-block' });
        
        const item = makeElement(el.tag, { id: el.id });
        item.innerHTML = el.innerHTML;
        blockDiv.appendChild(item);

        const editMarker = makeElement('div', {
          className: 'eq-edit-marker',
          title: `Edit #${el.id}`,
          onclick: () => this.openElementEditor(section.id, el, true) // Pass flag indicating nested pop-up trigger
        }, '✏️');
        blockDiv.appendChild(editMarker);

        dialogInner.appendChild(blockDiv);
      });

      const dialog = UITools.makeDialog({
        env: this.env,
        title: `${section.title}`,
        size: [700, 500],
        position: [240, 120]
      });

      // Avoid double scrollbars by keeping the wrapper unscrollable, allowing dialogInner to manage the viewport
      if (dialog.contentElement) {
        dialog.contentElement.style.overflow = 'hidden';
      }

      dialog.contentElement.appendChild(dialogInner);
      this.activeDialogs.push(dialog);
    }

  scrollToSection(sectionId) {
      const el = this.contentPaneElement.querySelector(`#render-${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

  

  generateHtmlString() {
      let documentNodesStr = '';
      this.documentStructure.forEach(sec => {
        let innerElements = '';
        sec.elements.forEach(el => {
          innerElements += `\n      <${el.tag} id="${el.id}">${el.innerHTML}</${el.tag}>`;
        });
        documentNodesStr += `\n    <section id="${sec.id}" class="colony-section" data-type="${sec.type}" data-title="${sec.title.replace(/"/g, '&quot;')}">${innerElements}\n    </section>\n`;
      });

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Equilibrium Colony</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #131416;
      color: #e0e0e0;
      line-height: 1.65;
      padding: 40px 20px 80px;
    }
    .nb-container {
      max-width: 860px;
      margin: 0 auto;
    }
    .colony-section {
      background: #1e1f23;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.08);
      overflow: hidden;
      margin-bottom: 24px;
      padding: 24px;
    }
    .colony-section h2, .colony-section h3 {
      color: #ffffff;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding-bottom: 8px;
    }
    .colony-section p {
      margin-bottom: 14px;
    }
    .colony-section ul, .colony-section ol {
      padding-left: 20px;
      margin-bottom: 14px;
    }
    .colony-section li {
      margin-bottom: 6px;
    }
    pre {
      background: #25262b;
      padding: 14px;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      margin: 14px 0;
    }
    code {
      font-family: 'Consolas', monospace;
      color: #f0a0c0;
    }
  </style>
</head>
<body>
  <div class="nb-container" id="colony-document">${documentNodesStr}  </div>
</body>
</html>`;
    }

  showToast(message) {
      if (this.toastElement) {
        this.toastElement.textContent = message;
        this.toastElement.classList.add('show');
        setTimeout(() => {
          if (this.toastElement) {
            this.toastElement.classList.remove('show');
          }
        }, 3000);
      } else {
        console.log("Toast notification:", message);
      }
    }

  

  

  triggerFileDownload(content) {
      try {
        const fileBlob = new Blob([content], { type: 'text/html' });
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(fileBlob);
        elem.download = 'orig.html';
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
        this.showToast("Workspace block save fell back to local file export download.");
      } catch (err) {
        console.error("Local download fallback failed:", err);
      }
    }

  

  

  

  

  

  

  

  updateElementModel(sectionId, elementId, markupContent) {
      const section = this.documentStructure.find(s => s.id === sectionId);
      if (section) {
        const el = section.elements.find(e => e.id === elementId);
        if (el) {
          el.innerHTML = markupContent;
          this.isDirty = true; // Dirty state triggers save visibility update
        }
      }
    }

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  applyStyles() {
      applyCss(`
        :root {
          --eq-bg-dark: #0f1115;
          --eq-bg-panel: #161920;
          --eq-bg-card: #1f232d;
          --eq-border: rgba(255, 255, 255, 0.08);
          --eq-blue: #3b82f6;
          --eq-purple: #8b5cf6;
          --eq-cyan: #06b6d4;
          --eq-emerald: #10b981;
          --eq-text: #f1f5f9;
          --eq-text-muted: #94a3b8;
          --eq-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.7);
        }

        .eq-workspace {
          display: flex;
          background-color: var(--eq-bg-dark);
          color: var(--eq-text);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
        }

        /* Navigation menu on the left */
        .eq-sidebar {
          width: 300px;
          background: var(--eq-bg-panel);
          border-right: 1px solid var(--eq-border);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          flex-shrink: 0;
        }

        .eq-sidebar-brand {
          padding: 24px 20px;
          border-bottom: 1px solid var(--eq-border);
          font-weight: 700;
          font-size: 1.05rem;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, var(--eq-blue), var(--eq-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .eq-sidebar-sections {
          list-style: none;
          padding: 15px 10px;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .eq-side-item {
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          color: var(--eq-text-muted);
          transition: all 0.2s ease;
          border: 1px solid transparent;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .eq-side-item:hover {
          background: var(--eq-bg-card);
          color: var(--eq-text);
        }

        .eq-side-item.active {
          background: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.25);
          color: var(--eq-text);
        }

        .eq-side-id {
          font-size: 0.7rem;
          font-family: monospace;
          color: var(--eq-cyan);
        }

        .eq-side-badge {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          align-self: flex-start;
          margin-top: 4px;
          font-weight: 600;
        }

        .eq-badge-std { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .eq-badge-indepth { background: rgba(139, 92, 246, 0.15); color: #c084fc; }

        /* Document Pane */
        .eq-content-pane {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow-y: auto;
        }

        .eq-toolbar {
          background: var(--eq-bg-panel);
          border-bottom: 1px solid var(--eq-border);
          padding: 16px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .eq-title-info {
          display: flex;
          flex-direction: column;
        }

        .eq-title-info h3 { margin: 0; font-size: 1rem; }
        .eq-title-info span { font-size: 0.75rem; color: var(--eq-text-muted); }

        .eq-btn-group {
          display: flex;
          gap: 10px;
        }

        .eq-btn {
          padding: 8px 16px;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid var(--eq-border);
          background: var(--eq-bg-card);
          color: var(--eq-text);
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .eq-btn:hover {
          background: #272d3a;
          border-color: var(--eq-text-muted);
        }

        .eq-btn-primary {
          background: var(--eq-blue);
          border-color: var(--eq-blue);
        }
        .eq-btn-primary:hover { background: #2563eb; }

        .eq-btn-accent {
          background: var(--eq-purple);
          border-color: var(--eq-purple);
        }
        .eq-btn-accent:hover { background: #7c3aed; }

        /* Reading Column Layout */
        .eq-document-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          width: 100%;
        }

        .eq-section-wrapper {
          margin-bottom: 40px;
          background: var(--eq-bg-panel);
          border: 1px solid var(--eq-border);
          border-radius: 12px;
          padding: 30px;
          position: relative;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .eq-section-wrapper:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        /* Hoverable structural block wrappers */
        .eq-element-block {
          position: relative;
          padding-right: 44px;
          margin-bottom: 16px;
        }

        .eq-edit-marker {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          background: var(--eq-bg-card);
          border: 1px solid var(--eq-border);
          color: var(--eq-text-muted);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: none; /* revealed on container hover */
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.15s ease;
          z-index: 10;
        }

        .eq-element-block:hover .eq-edit-marker {
          display: flex;
        }

        .eq-edit-marker:hover {
          background: var(--eq-blue);
          color: #ffffff;
          border-color: var(--eq-blue);
          transform: translateY(-50%) scale(1.15);
        }

        /* In-depth dialog exploration launcher */
        .eq-indepth-teaser {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(6, 182, 212, 0.06));
          border: 1px dashed rgba(139, 92, 246, 0.4);
          border-radius: 10px;
          padding: 24px;
          margin: 20px 0;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .eq-indepth-teaser:hover {
          border-color: var(--eq-purple);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1));
          transform: translateY(-2px);
        }

        .eq-indepth-teaser-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .eq-indepth-icon {
          font-size: 1.5rem;
          width: 48px;
          height: 48px;
          background: rgba(139, 92, 246, 0.15);
          color: #c084fc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .eq-indepth-meta h4 {
          margin: 0;
          font-size: 1rem;
          color: #ffffff;
        }

        .eq-indepth-meta span {
          font-size: 0.8rem;
          color: var(--eq-text-muted);
        }

        /* General Typography layout */
        .eq-section-wrapper h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 20px; color: #ffffff; }
        .eq-section-wrapper h2 { font-size: 1.5rem; font-weight: 700; margin-top: 10px; margin-bottom: 15px; color: #ffffff; border-bottom: 1px solid var(--eq-border); padding-bottom: 8px; }
        .eq-section-wrapper h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 12px; color: #c084fc; }
        .eq-section-wrapper h4 { font-size: 1.1rem; font-weight: 600; margin-top: 24px; margin-bottom: 10px; color: #e2e8f0; }
        .eq-section-wrapper p { font-size: 0.98rem; line-height: 1.75; margin-bottom: 16px; color: #cbd5e1; }
        .eq-section-wrapper ul, .eq-section-wrapper ol { margin-left: 24px; margin-bottom: 16px; color: #cbd5e1; }
        .eq-section-wrapper li { margin-bottom: 8px; line-height: 1.6; }
        .eq-section-wrapper pre { background: #1a1d24; border: 1px solid var(--eq-border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 20px 0; }
        .eq-section-wrapper code { font-family: 'Consolas', monospace; color: #f0a0c0; background: rgba(240, 160, 192, 0.1); padding: 3px 6px; border-radius: 4px; font-size: 0.9em; }
        .eq-section-wrapper pre code { background: none; padding: 0; color: #e2e8f0; font-size: 0.88em; }

        /* Dialog clean scroll settings & prevent double scrollbars */
        .eq-dialog-inner {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
          box-sizing: border-box;
        }

        /* Toast feedback alerts */
        .eq-toast-box {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: var(--eq-emerald);
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          box-shadow: var(--eq-shadow);
          z-index: 10000;
          transform: translateY(80px);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .eq-toast-box.show {
          transform: translateY(0);
          opacity: 1;
        }

        /* Editor adjustments */
        .eq-editor-area {
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
          box-sizing: border-box;
          padding: 5px;
        }

        .eq-editor-textarea {
          background: #111317;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e2e8f0;
          padding: 14px;
          border-radius: 8px;
          font-family: 'Consolas', 'Fira Code', monospace;
          font-size: 0.95rem;
          line-height: 1.5;
          flex-grow: 1;
          resize: none;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }

        .eq-editor-textarea:focus {
          border-color: var(--eq-blue);
        }

        .eq-editor-badge {
          font-size: 0.75rem;
          color: var(--eq-cyan);
          font-family: monospace;
          background: rgba(6, 182, 212, 0.15);
          padding: 4px 8px;
          border-radius: 4px;
          align-self: flex-start;
        }

        /* Dynamic CodeMirror theme adjustments */
        .CodeMirror {
          height: 240px !important;
          border-radius: 8px;
          border: 1px solid var(--eq-border);
          font-size: 0.92rem;
          font-family: 'Consolas', 'Fira Code', monospace !important;
        }
      `, 'eq-system-theme');
    }

  async readOrigHtml() {
      const globalEnv = window.__vibes_env;
      if (globalEnv && typeof globalEnv.readFile === 'function') {
        try {
          return globalEnv.readFile('/EquilibriumSociety/orig.html');
        } catch (e) {
          console.warn("Direct workspace read failed, trying secondary path.", e);
        }
      }
      
      if (this.env && typeof this.env.readFile === 'function') {
        try {
          return this.env.readFile('/EquilibriumSociety/orig.html');
        } catch (e) {
          console.warn("Loader standard filesystem read failed.", e);
        }
      }

      const response = await fetch('/EquilibriumSociety/orig.html');
      return await response.text();
    }

  async writeOrigHtml(content) {
      const globalEnv = window.__vibes_env;
      if (globalEnv && typeof globalEnv.writeFile === 'function') {
        try {
          globalEnv.writeFile('/EquilibriumSociety/orig.html', content);
          return true;
        } catch (e) {
          console.error("Workspace filesystem write error:", e);
        }
      }
      return false;
    }

  async loadDocumentModel() {
      try {
        const rawHtml = await this.readOrigHtml();
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');
        const container = doc.getElementById('colony-document');

        if (!container) {
          this.showToast("Structure container #colony-document not found in orig.html.");
          return;
        }

        const sections = container.querySelectorAll('section');
        this.documentStructure = [];

        sections.forEach(section => {
          const sectionId = section.getAttribute('id') || `sec-${Math.random().toString(36).substr(2, 9)}`;
          const sectionType = section.getAttribute('data-type') || 'standard';
          const sectionTitle = section.getAttribute('data-title') || 'Untitled Section';

          const elements = [];
          Array.from(section.children).forEach(child => {
            const tag = child.tagName.toLowerCase();
            const elementId = child.getAttribute('id') || `${tag}-${Math.random().toString(36).substr(2, 9)}`;
            
            elements.push({
              id: elementId,
              tag: tag,
              innerHTML: child.innerHTML.trim()
            });
          });

          this.documentStructure.push({
            id: sectionId,
            type: sectionType,
            title: sectionTitle,
            elements: elements
          });
        });

      } catch (err) {
        console.error("Failed loading baseline model", err);
        this.showToast("Error loading document elements.");
      }
    }

  renderWorkspace() {
      this.contentPaneElement.innerHTML = '';

      // Toolbar Header
      const toolbar = makeElement('div', { className: 'eq-toolbar' });
      const info = makeElement('div', { className: 'eq-title-info' }, [
        makeElement('h3', {}, 'Post-Scarcity Interactive Charter'),
        makeElement('span', {}, 'Real-time collaborative editing layer enabled')
      ]);

      const btnGroup = makeElement('div', { className: 'eq-btn-group' });

      // Theme Picker Dropdown
      const themeSelect = makeElement('select', {
        className: 'eq-btn',
        style: { padding: '8px', fontSize: '0.85rem' },
        onchange: (e) => {
          this.applyTheme(e.target.value);
          this.renderWorkspace();
        }
      }, [
        makeElement('option', { value: 'dark', selected: this.activeTheme === 'dark' }, 'Dark Theme'),
        makeElement('option', { value: 'warm', selected: this.activeTheme === 'warm' }, 'Warm Sepia'),
        makeElement('option', { value: 'light', selected: this.activeTheme === 'light' }, 'Light Theme')
      ]);
      btnGroup.appendChild(themeSelect);

      // 📋 Paste & Sync Button
      const pasteBtn = makeElement('button', {
        className: 'eq-btn',
        onclick: () => this.applyClipboardPatch()
      }, '📋 Paste & Sync');
      btnGroup.appendChild(pasteBtn);

      // Only display the save workspace button when edits have occurred (dirty state)
      if (this.isDirty) {
        const saveWorkspaceBtn = makeElement('button', {
          className: 'eq-btn eq-btn-primary',
          onclick: () => this.saveToWorkspaceFile()
        }, '💾 Save HTML file');
        btnGroup.appendChild(saveWorkspaceBtn);
      }

      toolbar.appendChild(info);
      toolbar.appendChild(btnGroup);
      this.contentPaneElement.appendChild(toolbar);

      const scroller = makeElement('div', { style: { flexGrow: '1', overflowY: 'auto', paddingBottom: '100px' } });
      const container = makeElement('div', { className: 'eq-document-container' });

      this.documentStructure.forEach(sec => {
        const secWrapper = makeElement('div', {
          id: `render-${sec.id}`,
          className: 'eq-section-wrapper'
        });

        if (sec.type === 'indepth') {
          // Teaser format Launcher
          const teaser = makeElement('div', {
            className: 'eq-indepth-teaser',
            onclick: () => this.openInDepthPopup(sec)
          }, [
            makeElement('div', { className: 'eq-indepth-teaser-left' }, [
              makeElement('div', { className: 'eq-indepth-icon' }, '💡'),
              makeElement('div', { className: 'eq-indepth-meta' }, [
                makeElement('h4', {}, sec.title),
                makeElement('span', {}, 'Deep Exploration Module (Click to view)')
              ])
            ]),
            makeElement('span', { style: { color: 'var(--eq-purple)', fontWeight: 'bold' } }, 'Expand ➔')
          ]);
          secWrapper.appendChild(teaser);
        } else {
          // Standard full-view paragraphs with persistent editing pencil icons on hover
          sec.elements.forEach(el => {
            const blockDiv = makeElement('div', { className: 'eq-element-block' });
            
            const domEl = makeElement(el.tag, { id: el.id });
            domEl.innerHTML = el.innerHTML;
            blockDiv.appendChild(domEl);

            const editMarker = makeElement('div', {
              className: 'eq-edit-marker',
              title: `Edit #${el.id}`,
              onclick: () => this.openElementEditor(sec.id, el)
            }, '✏️');
            blockDiv.appendChild(editMarker);

            secWrapper.appendChild(blockDiv);
          });
        }

        container.appendChild(secWrapper);
      });

      scroller.appendChild(container);
      this.contentPaneElement.appendChild(scroller);
    }

  openElementEditor(sectionId, element, isFromPopup = false) {
      const wrapper = makeElement('div', { className: 'eq-editor-area' });
      const badge = makeElement('span', { className: 'eq-editor-badge' }, `Element ID: #${element.id} (<${element.tag}>)`);
      wrapper.appendChild(badge);

      const textContainer = makeElement('div', { 
        style: { flexGrow: '1', display: 'flex', flexDirection: 'column', minHeight: '250px' } 
      });
      wrapper.appendChild(textContainer);

      let editorInstance = null;

      // Safe asynchronous delay initialization of CodeMirror
      setTimeout(async () => {
        editorInstance = await this.initCodeMirror(textContainer, element.innerHTML);
      }, 50);

      const actionRow = makeElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' } });
      
      const cancelBtn = makeElement('button', {
        className: 'eq-btn',
        onclick: () => dialog.close()
      }, 'Cancel');

      const saveBtn = makeElement('button', {
        className: 'eq-btn eq-btn-primary',
        onclick: () => {
          const finalMarkup = editorInstance ? editorInstance.getValue() : '';
          this.updateElementModel(sectionId, element.id, finalMarkup);
          dialog.close();
          this.renderWorkspace();

          // If triggered from inside the In-Depth dialogue popup, refresh its internal layout
          if (isFromPopup && this.activeInDepthDialogInner) {
            const parentSection = this.documentStructure.find(s => s.id === sectionId);
            if (parentSection) {
              this.refreshInDepthPopup(parentSection);
            }
          }

          this.showToast(`Updated element #${element.id}`);
        }
      }, 'Apply Modifications');

      actionRow.appendChild(cancelBtn);
      actionRow.appendChild(saveBtn);
      wrapper.appendChild(actionRow);

      const dialog = UITools.makeDialog({
        env: this.env,
        title: `Editing Markup Target`,
        size: [600, 420],
        position: [280, 150] // Offset slightly below the main popup for clean visibility layering
      });

      if (dialog.contentElement) {
        dialog.contentElement.style.overflow = 'hidden';
      }

      dialog.contentElement.appendChild(wrapper);
      this.activeDialogs.push(dialog);
    }

  async loadCodeMirrorCDN() {
      if (window.CodeMirror) return window.CodeMirror;

      // Load Stylesheets from reliable Cloudflare CDNJS
      if (!document.getElementById('cm-core-css')) {
        const link = document.createElement('link');
        link.id = 'cm-core-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.css';
        document.head.appendChild(link);

        const darkTheme = document.createElement('link');
        darkTheme.id = 'cm-theme-css';
        darkTheme.rel = 'stylesheet';
        darkTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/material-darker.min.css';
        document.head.appendChild(darkTheme);
      }

      // Script injection helper
      const loadScript = (url) => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error(`Failed to load: ${url}`));
          document.head.appendChild(script);
        });
      };

      try {
        // Load Core CodeMirror engine
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.js');
        // Load markup modes
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/xml/xml.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/javascript/javascript.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/css/css.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/htmlmixed/htmlmixed.min.js');

        return window.CodeMirror;
      } catch (err) {
        console.warn("CDNJS dynamic load failed, falling back to local fallback components.", err);
        return null;
      }
    }

  async initCodeMirror(container, initialContent) {
      container.innerHTML = "<div style='color: var(--eq-cyan); font-family: monospace; padding: 20px;'>Initializing CodeMirror...</div>";

      // 1. Load highly reliable CDNJS fallback (completely bypassing esm.sh DNS/Closed Connection blocks)
      const cmEngine = await this.loadCodeMirrorCDN();
      if (cmEngine) {
        container.innerHTML = "";
        const editor = cmEngine(container, {
          value: initialContent,
          mode: 'htmlmixed',
          theme: 'material-darker',
          lineNumbers: true,
          lineWrapping: true,
          tabSize: 2
        });
        return {
          getValue: () => editor.getValue()
        };
      }

      // 2. Fallback to standard CodeMirrorWidget if available in other environments
      if (window.CodeMirrorWidget) {
        try {
          container.innerHTML = "";
          const widget = new window.CodeMirrorWidget({
            target: container,
            value: initialContent,
            mode: 'htmlmixed'
          });
          return {
            getValue: () => widget.getValue ? widget.getValue() : widget.value
          };
        } catch (e) {
          console.warn("CodeMirrorWidget initialization failed.", e);
        }
      }

      // 3. Fallback to beautiful dark styled textarea
      container.innerHTML = "";
      const fallbackTextarea = makeElement('textarea', {
        className: 'eq-editor-textarea',
        style: { width: '100%', height: '240px' }
      });
      fallbackTextarea.value = initialContent;
      container.appendChild(fallbackTextarea);
      return {
        getValue: () => fallbackTextarea.value
      };
    }

  async saveToWorkspaceFile() {
      try {
        // Read current HTML standard base from local workspace
        const baselineHtml = await this.readOrigHtml();
        const parser = new DOMParser();
        const doc = parser.parseFromString(baselineHtml, 'text/html');
        const container = doc.getElementById('colony-document');

        if (!container) {
          this.showToast("Structure element #colony-document not resolved in orig.html template.");
          return;
        }

        // Clear children and reconstruct sections programmatically to bypass manual hardcoded HTML escape problems
        container.innerHTML = '';

        this.documentStructure.forEach(sec => {
          const sectionNode = doc.createElement('section');
          sectionNode.setAttribute('id', sec.id);
          sectionNode.setAttribute('class', 'colony-section');
          sectionNode.setAttribute('data-type', sec.type);
          sectionNode.setAttribute('data-title', sec.title);

          sec.elements.forEach(el => {
            const childNode = doc.createElement(el.tag);
            childNode.setAttribute('id', el.id);
            childNode.innerHTML = el.innerHTML;
            sectionNode.appendChild(childNode);
          });

          container.appendChild(sectionNode);
        });

        // Save complete compiled outer HTML safely
        const updatedHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        const success = await this.writeOrigHtml(updatedHtml);
        if (success) {
          this.showToast("Saved directly to orig.html!");
        } else {
          this.triggerFileDownload(updatedHtml);
        }
      } catch (err) {
        console.error("Workspace save crashed:", err);
        this.showToast("Critical: Error writing document structure.");
      }
    }

  applyBaseStyles() {
      applyCss(`
        /* Gutter layout and structure style rules */
        .eq-workspace {
          display: flex;
          background-color: var(--eq-bg-dark);
          color: var(--eq-text);
          font-family: 'Lora', Georgia, serif;
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Pure black elegant scrollbar configuration */
        .eq-workspace ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .eq-workspace ::-webkit-scrollbar-track {
          background: var(--eq-bg-dark);
        }
        .eq-workspace ::-webkit-scrollbar-thumb {
          background: var(--eq-border-scroll);
          border-radius: 4px;
        }
        .eq-workspace ::-webkit-scrollbar-thumb:hover {
          background: var(--eq-border-scroll-hover);
        }

        .eq-sidebar {
          width: 300px;
          background: var(--eq-bg-panel);
          border-right: 1px solid var(--eq-border);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          flex-shrink: 0;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .eq-sidebar-brand {
          padding: 24px 20px;
          border-bottom: 1px solid var(--eq-border);
          font-weight: 700;
          font-size: 1.05rem;
          color: var(--eq-cyan);
          letter-spacing: 0.5px;
        }

        .eq-sidebar-sections {
          list-style: none;
          padding: 15px 10px;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .eq-side-item {
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          color: var(--eq-text-muted);
          transition: all 0.2s ease;
          border: 1px solid transparent;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .eq-side-item:hover {
          background: var(--eq-bg-card);
          color: var(--eq-text);
        }

        .eq-side-item.active {
          background: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.25);
          color: var(--eq-text);
        }

        .eq-side-id {
          font-size: 0.7rem;
          font-family: monospace;
          color: var(--eq-cyan);
        }

        .eq-side-badge {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          align-self: flex-start;
          margin-top: 4px;
          font-weight: 600;
        }

        .eq-badge-std { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .eq-badge-indepth { background: rgba(139, 92, 246, 0.15); color: #c084fc; }

        .eq-content-pane {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow-y: auto;
        }

        .eq-toolbar {
          background: var(--eq-bg-panel);
          border-bottom: 1px solid var(--eq-border);
          padding: 16px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 10;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .eq-title-info {
          display: flex;
          flex-direction: column;
        }

        .eq-title-info h3 { margin: 0; font-size: 1rem; color: var(--eq-text); }
        .eq-title-info span { font-size: 0.75rem; color: var(--eq-text-muted); }

        .eq-btn-group {
          display: flex;
          gap: 10px;
        }

        .eq-btn {
          padding: 8px 16px;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid var(--eq-border);
          background: var(--eq-bg-card);
          color: var(--eq-text);
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .eq-btn:hover {
          background: var(--eq-bg-hover);
          border-color: var(--eq-text-muted);
        }

        .eq-btn-primary {
          background: var(--eq-blue);
          border-color: var(--eq-blue);
          color: #ffffff;
        }
        .eq-btn-primary:hover { background: #2563eb; }

        .eq-document-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          width: 100%;
        }

        .eq-section-wrapper {
          margin-bottom: 40px;
          background: var(--eq-bg-panel);
          border: 1px solid var(--eq-border);
          border-radius: 12px;
          padding: 30px;
          position: relative;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        /* Paragraph Hover Pencil Trigger (Always On) */
        .eq-element-block {
          position: relative;
          padding-right: 44px;
          margin-bottom: 16px;
        }

        .eq-edit-marker {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          background: var(--eq-bg-card);
          border: 1px solid var(--eq-border);
          color: var(--eq-text-muted);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.15s ease;
          z-index: 10;
        }

        .eq-element-block:hover .eq-edit-marker {
          display: flex;
        }

        .eq-edit-marker:hover {
          background: var(--eq-blue);
          color: #ffffff;
          border-color: var(--eq-blue);
          transform: translateY(-50%) scale(1.15);
        }

        .eq-indepth-teaser {
          background: var(--eq-bg-teaser);
          border: 1px dashed var(--eq-border-teaser);
          border-radius: 10px;
          padding: 24px;
          margin: 20px 0;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .eq-indepth-teaser-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .eq-indepth-icon {
          font-size: 1.5rem;
          width: 48px;
          height: 48px;
          background: var(--eq-bg-teaser-icon);
          color: var(--eq-purple);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .eq-indepth-meta h4 {
          margin: 0;
          font-size: 1rem;
          color: var(--eq-text);
        }

        .eq-indepth-meta span {
          font-size: 0.8rem;
          color: var(--eq-text-muted);
        }

        .eq-section-wrapper h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 20px; color: var(--eq-text); }
        .eq-section-wrapper h2 { font-size: 1.5rem; font-weight: 700; margin-top: 10px; margin-bottom: 15px; color: var(--eq-text); border-bottom: 1px solid var(--eq-border); padding-bottom: 8px; }
        .eq-section-wrapper h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 12px; color: var(--eq-purple); }
        .eq-section-wrapper h4 { font-size: 1.1rem; font-weight: 600; margin-top: 24px; margin-bottom: 10px; color: var(--eq-text); }
        .eq-section-wrapper p { font-size: 0.98rem; line-height: 1.75; margin-bottom: 16px; color: var(--eq-text-body); }
        .eq-section-wrapper ul, .eq-section-wrapper ol { margin-left: 24px; margin-bottom: 16px; color: var(--eq-text-body); }
        .eq-section-wrapper li { margin-bottom: 8px; line-height: 1.6; }
        .eq-section-wrapper pre { background: var(--eq-bg-code); border: 1px solid var(--eq-border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 20px 0; }
        .eq-section-wrapper code { font-family: 'Consolas', monospace; color: var(--eq-pink); background: var(--eq-bg-code-inline); padding: 3px 6px; border-radius: 4px; font-size: 0.9em; }
        .eq-section-wrapper pre code { background: none; padding: 0; color: var(--eq-text-body); font-size: 0.88em; }

        .eq-dialog-inner {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
          box-sizing: border-box;
          background: var(--eq-bg-panel);
          color: var(--eq-text);
        }

        .eq-editor-area {
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
          box-sizing: border-box;
          padding: 5px;
          background: var(--eq-bg-panel);
        }

        .eq-editor-textarea {
          background: var(--eq-bg-code);
          border: 1px solid var(--eq-border);
          color: var(--eq-text);
          padding: 14px;
          border-radius: 8px;
          font-family: 'Consolas', monospace;
          font-size: 0.95rem;
          line-height: 1.5;
          flex-grow: 1;
          resize: none;
          box-sizing: border-box;
          outline: none;
        }

        .eq-editor-badge {
          font-size: 0.75rem;
          color: var(--eq-cyan);
          font-family: monospace;
          background: rgba(6, 182, 212, 0.15);
          padding: 4px 8px;
          border-radius: 4px;
          align-self: flex-start;
        }
      `, 'eq-base-styles');
    }

  applyTheme(themeName) {
      this.activeTheme = themeName;
      
      const themes = {
        // Pristine pitch black theme
        dark: `
          --eq-bg-dark: #000000;
          --eq-bg-panel: #0a0b0d;
          --eq-bg-card: #12141a;
          --eq-bg-hover: #181b24;
          --eq-border: rgba(255, 255, 255, 0.08);
          --eq-border-scroll: rgba(255, 255, 255, 0.1);
          --eq-border-scroll-hover: rgba(255, 255, 255, 0.25);
          --eq-blue: #3b82f6;
          --eq-purple: #c084fc;
          --eq-cyan: #06b6d4;
          --eq-pink: #f0a0c0;
          --eq-text: #f8fafc;
          --eq-text-body: #cbd5e1;
          --eq-text-muted: #64748b;
          --eq-bg-teaser: rgba(139, 92, 246, 0.04);
          --eq-border-teaser: rgba(139, 92, 246, 0.3);
          --eq-bg-teaser-icon: rgba(139, 92, 246, 0.12);
          --eq-bg-code: #12141a;
          --eq-bg-code-inline: rgba(240, 160, 192, 0.08);
        `,
        // Sepia reading theme
        warm: `
          --eq-bg-dark: #1f1b16;
          --eq-bg-panel: #2d261e;
          --eq-bg-card: #3a3227;
          --eq-bg-hover: #483e31;
          --eq-border: rgba(217, 119, 6, 0.15);
          --eq-border-scroll: rgba(217, 119, 6, 0.2);
          --eq-border-scroll-hover: rgba(217, 119, 6, 0.4);
          --eq-blue: #f59e0b;
          --eq-purple: #fbbf24;
          --eq-cyan: #fb923c;
          --eq-pink: #f43f5e;
          --eq-text: #fefefe;
          --eq-text-body: #f3e8ff;
          --eq-text-muted: #a16207;
          --eq-bg-teaser: rgba(245, 158, 11, 0.04);
          --eq-border-teaser: rgba(245, 158, 11, 0.3);
          --eq-bg-teaser-icon: rgba(245, 158, 11, 0.12);
          --eq-bg-code: #1b1611;
          --eq-bg-code-inline: rgba(244, 63, 94, 0.08);
        `,
        // Clean white theme
        light: `
          --eq-bg-dark: #f8fafc;
          --eq-bg-panel: #ffffff;
          --eq-bg-card: #f1f5f9;
          --eq-bg-hover: #e2e8f0;
          --eq-border: rgba(15, 23, 42, 0.08);
          --eq-border-scroll: rgba(15, 23, 42, 0.15);
          --eq-border-scroll-hover: rgba(15, 23, 42, 0.3);
          --eq-blue: #312e81;
          --eq-purple: #4f46e5;
          --eq-cyan: #0891b2;
          --eq-pink: #db2777;
          --eq-text: #0f172a;
          --eq-text-body: #334155;
          --eq-text-muted: #94a3b8;
          --eq-bg-teaser: rgba(79, 70, 229, 0.04);
          --eq-border-teaser: rgba(79, 70, 229, 0.2);
          --eq-bg-teaser-icon: rgba(79, 70, 229, 0.08);
          --eq-bg-code: #f1f5f9;
          --eq-bg-code-inline: rgba(219, 39, 119, 0.08);
        `
      };

      const variables = themes[themeName] || themes.dark;
      
      applyCss(`
        :root {
          ${variables}
        }
      `, 'eq-theme-variables');

      // Update sidebar tracking class
      const items = this.targetElement.querySelectorAll('.eq-side-item');
      items.forEach(el => {
        el.classList.remove('active');
      });
    }

  refreshInDepthPopup(section) {
      if (!this.activeInDepthDialogInner) return;
      this.activeInDepthDialogInner.innerHTML = '';

      section.elements.forEach(el => {
        const blockDiv = makeElement('div', { className: 'eq-element-block' });
        
        const item = makeElement(el.tag, { id: el.id });
        item.innerHTML = el.innerHTML;
        blockDiv.appendChild(item);

        const editMarker = makeElement('div', {
          className: 'eq-edit-marker',
          title: `Edit #${el.id}`,
          onclick: () => this.openElementEditor(section.id, el, true)
        }, '✏️');
        blockDiv.appendChild(editMarker);

        this.activeInDepthDialogInner.appendChild(blockDiv);
      });
    }

  async applyClipboardPatch() {
      let clipboardText = "";
      try {
        clipboardText = await navigator.clipboard.readText();
      } catch (err) {
        // Fallback for sandboxes or browsers blocking silent clipboard reading
        clipboardText = prompt("Clipboard reading permission missing. Please paste your HTML update payload block below:");
      }

      if (!clipboardText || !clipboardText.trim()) {
        this.showToast("Paste cancelled or clipboard is empty.");
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(clipboardText, 'text/html');
      
      // Look for elements with data-target or data-target-id
      const patches = doc.querySelectorAll('[data-target], [data-target-id]');
      
      if (patches.length === 0) {
        // Fallback: If no explicit data attributes are present, try finding matching element tags with IDs
        const identifiedElements = doc.querySelectorAll('[id]');
        if (identifiedElements.length > 0) {
          let updatedCount = 0;
          identifiedElements.forEach(item => {
            const targetId = item.getAttribute('id');
            this.documentStructure.forEach(sec => {
              const el = sec.elements.find(e => e.id === targetId);
              if (el) {
                el.innerHTML = item.innerHTML.trim();
                updatedCount++;
                this.isDirty = true;
              }
            });
          });

          if (updatedCount > 0) {
            this.renderWorkspace();
            this.showToast(`Applied ${updatedCount} element updates via ID matching!`);
            return;
          }
        }

        this.showToast("No matchable target nodes or element IDs detected inside pasted HTML.");
        return;
      }

      let patchCount = 0;
      patches.forEach(patch => {
        const targetId = patch.getAttribute('data-target') || patch.getAttribute('data-target-id');
        if (targetId) {
          this.documentStructure.forEach(sec => {
            const el = sec.elements.find(e => e.id === targetId);
            if (el) {
              el.innerHTML = patch.innerHTML.trim();
              patchCount++;
              this.isDirty = true;
            }
          });
        }
      });

      if (patchCount > 0) {
        this.renderWorkspace();
        this.showToast(`Successfully applied ${patchCount} updates from clipboard!`);
      } else {
        this.showToast("Failed to match target IDs to any existing document nodes.");
      }
    }
}