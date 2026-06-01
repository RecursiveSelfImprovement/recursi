
class ScratchyEditorManager {
  constructor(app) {
    this._app = app;
    this._inlineEditors = {};
    this._openDialogs = {};
  }

  getInlineEditors() {
    return this._inlineEditors;
  }

  getOpenDialogs() {
    return this._openDialogs;
  }

  clearInlineEditors() {
    this._inlineEditors = {};
  }

  createCodeMirror(hostEl, initialText, options) {
    const langExt =
      options && options.language === 'json' ? jsonLang() : javascript();
    const opts = options || {};

    const extensions = [
      lineNumbers(),
      cmHistory(),
      drawSelection(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      oneDark,
      langExt,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && typeof opts.onChange === 'function') {
          opts.onChange(update.state.doc.toString());
        }
      }),
    ];

    if (opts.wrap !== false) {
      extensions.push(EditorView.lineWrapping);
    }
    if (opts.readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    }

    const state = EditorState.create({ doc: initialText || '', extensions });
    return new EditorView({ state, parent: hostEl });
  }

  refreshInlineEditor(filename) {
      const info = this._inlineEditors[filename];
      if (!info) return;
      const app = this._app;
      const freshText = JSON.stringify(app.fileBlobs[filename].data, null, 2);
      
      // Call setText instead of dispatching raw CM6 state updates
      info.view.setText(freshText);
    }

  registerInlineEditor(filename, view, host) {
    this._inlineEditors[filename] = { view, host };
  }

  focusFile(filename) {
    if (this._openDialogs[filename]) {
      this._openDialogs[filename].setZOnTop();
      return;
    }

    const blockId = `scratchy-block-${CSS.escape(filename)}`;
    const block = document.getElementById(blockId);
    if (block) {
      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
      block.style.transition = 'box-shadow 0.3s, transform 0.3s';
      block.style.boxShadow = '0 0 0 4px var(--color-section-header)';
      block.style.transform = 'scale(1.02)';
      setTimeout(() => {
        block.style.boxShadow = '';
        block.style.transform = '';
      }, 1000);
    }
  }

  openOrFocusWindow(filename) {
      if (this._openDialogs[filename]) {
        this._openDialogs[filename].setZOnTop();
        return;
      }

      const app = this._app;
      const entry = app.fileBlobs[filename];
      if (!entry || entry.type !== 'json') return;

      const inlineInfo = this._inlineEditors[filename];
      if (inlineInfo) {
        inlineInfo.host.style.display = 'none';
      }

      const text = JSON.stringify(entry.data, null, 2);
      const root = makeElement('div', { className: 'cm6-dialog-root' });
      const editorHost = makeElement('div', { className: 'cm6-editor-host' });
      root.appendChild(editorHost);

      let editorWidget = null;

      const dialog = UITools.makeDialog({
        env: app.env,
        title: app.fileList.getAssetLabel(filename),
        size: [900, 600],
        position: [80, 80],
        contentElement: root,
        noPadding: true,
        buttons: [],
        onResize: () => {
          if (editorWidget) editorWidget.requestMeasure();
        },
        onClose: () => {
          if (editorWidget) {
            const currentText = editorWidget.getText();
            try {
              const parsed = JSON.parse(currentText);
              app.projectData = parsed;
              app.fileBlobs[filename].data = parsed;
              app.fileBlobs[filename].raw = currentText;
            } catch (e) {}
          }
          delete this._openDialogs[filename];

          if (inlineInfo) {
            inlineInfo.host.style.display = '';
            const freshText = JSON.stringify(
              app.fileBlobs[filename].data,
              null,
              2
            );
            inlineInfo.view.setText(freshText);
          }
        },
      });

      this._openDialogs[filename] = dialog;

      requestAnimationFrame(() => {
        editorWidget = new CodeMirrorWidget({
          host: editorHost,
          content: text,
          mode: 'json',
          onChange: (newText) => {
            try {
              const parsed = JSON.parse(newText);
              app.projectData = parsed;
              app.fileBlobs[filename].data = parsed;
              app.fileBlobs[filename].raw = newText;
            } catch (e) {}
          }
        });
      });
    }

  
}

