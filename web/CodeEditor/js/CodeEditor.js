
// (export removed)

// FIX: Alias 'history' to 'cmHistory' to avoid collision with window.history

class CodeEditor {
  constructor() {
      this.titleElement = null;
      this.statusDiv = null;
      this.configSection = null;
      this.configTextarea = null;
      this.createBoxButton = null;
      this.configuredBoxes = [];
    }

  init(targetElement) {
      this.injectStyles();

      this.titleElement = makeElement(
        'h1',
        { className: 'app-title' },
        'CodeMirror 6 Demo'
      );
      this.statusDiv = makeElement(
        'div',
        { className: 'status-message' },
        'Ready.'
      );

      targetElement.appendChild(this.titleElement);
      targetElement.appendChild(this.statusDiv);

      const defaultDemoConfig = {
        title: 'CodeMirror 6',
        size: [720, 520],
        position: [50, 120],
        language: 'javascript',
        wrap: true,
        readOnly: false,
        fontSize: 13,
        initialText:
          '// Welcome to CodeMirror 6 running in Recursi!\n' +
          'function helloWorld() {\n' +
          '  console.log("It works! No duplicate instances.");\n' +
          '}\n',
      };

      this.configSection = makeElement('div', { className: 'config-section' });

      this.configTextarea = makeElement(
        'textarea',
        { id: 'cm6ConfigInput' },
        JSON.stringify(defaultDemoConfig, null, 2)
      );

      const actionsRow = makeElement('div', { className: 'config-actions' });
      this.createBoxButton = makeElement(
        'button',
        { className: 'primary' },
        'Open CodeMirror'
      );
      this.createBoxButton.onclick = () => this.openCodeMirrorConfigDialog();

      actionsRow.appendChild(this.createBoxButton);

      this.configSection.appendChild(makeElement('label', {}, 'Config (JSON):'));
      this.configSection.appendChild(this.configTextarea);
      this.configSection.appendChild(actionsRow);
      targetElement.appendChild(this.configSection);
    }

  injectStyles() {
      applyCss(
        `
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          background-color: #eef;
          padding-bottom: 80px;
        }
        :root {
          --panel-padding: 20px;
        }
        .app-title { color: #223; margin: 18px 0 6px 0; }
        .status-message { font-style: italic; color: #556; margin: 0 0 14px 0; min-height: 1.2em; }
        .config-section { margin-top: 14px; padding: 14px; background: #fff; border-radius: 10px; max-width: 560px; }
        .config-section textarea { width: 100%; min-height: 170px; font-family: monospace; }
        .config-actions button { padding: 9px 14px; cursor: pointer; }
        .cm6-dialog-root { display: flex; flex-direction: column; height: 100%; width: 100%; background: #1e1e1e; }
        .cm6-editor-host { flex: 1 1 auto; min-height: 0; padding: 10px; }
        .cm-editor { height: 100%; }
      `,
        'codeEditor-app-styles'
      );
    }

  _createCodeMirrorEditor(hostEl, initialText, options = {}) {
      const widget = new CodeMirrorWidget({
        host: hostEl,
        content: initialText,
        mode: options.language,
        wrap: options.wrap,
        readOnly: options.readOnly,
        onChange: options.onChange,
        fontSize: options.fontSize
      });
      return widget;
    }

  openCodeMirrorConfigDialog() {
      let cfg;
      try {
        cfg = JSON.parse(this.configTextarea.value || '{}');
      } catch (e) {
        alert(`Invalid JSON config: ${e.message}`);
        return;
      }

      const root = makeElement('div', { className: 'cm6-dialog-root' });
      const editorHost = makeElement('div', { className: 'cm6-editor-host' });
      root.appendChild(editorHost);

      let editorView = null;

      const dialog = UITools.makeDialog({
        env: this.env,
        title: cfg.title || 'CodeMirror 6',
        size: cfg.size || [600, 400],
        position: cfg.position || [50, 50],
        contentElement: root,
        onGeometryChange: () => {
          if (editorView) editorView.requestMeasure();
        },
      });

      requestAnimationFrame(() => {
        editorView = this._createCodeMirrorEditor(editorHost, cfg.initialText, {
          language: cfg.language,
          wrap: cfg.wrap,
          readOnly: cfg.readOnly,
          fontSize: cfg.fontSize,
        });
        this.statusDiv.textContent = 'CodeMirror instance active.';
      });
    }

  

  async run(env) {
      this.env = env;
      this.rootElement = env.container;
      this.rootElement.innerHTML = '';
      this.init(this.rootElement);
      return this;
    }

  destroy() {
      if (this.rootElement) {
        this.rootElement.innerHTML = '';
      }
    }
}

