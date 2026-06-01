
class PlaygroundController {
  
  constructor(mainPanel) {
    this.mainPanel = mainPanel;
    this.animationFrameId = null;
    this.balls = [];
    this.glowBoxes = [];
    this.render();
  }

  render() {
    this.mainPanel.innerHTML = '';
    this._applyStyles();
    const welcomeHeader = makeElement('h1', 'Welcome to the Playground! 🚀');
    const welcomeP = makeElement(
      'p',
      '...a general dumping ground for experimental or yet-to-have-a-better-home features or tests.'
    );
    const dashboard = makeElement('div', { className: 'dashboard-grid' });

    const playgroundActions =
      window._dev_projectEditorInstance.actionRegistry.getActionsByCategory('playground');

    playgroundActions.forEach(async (action) => {
      const card = await this._createWidgetCard(action);
      if (card) dashboard.appendChild(card);
    });

    this.mainPanel.append(welcomeHeader, welcomeP, dashboard);
  }

  _applyStyles() {
    const fullCss = `
          .playground-container {
            padding: 20px 30px; color: #d4d4d4; overflow-y: auto; height: 100%;
            box-sizing: border-box; background-color: #252526;
          }
          .playground-container h1 {
            font-weight: 300; border-bottom: 1px solid #4a4a4a; padding-bottom: 10px;
            margin-top: 0; color: #cccccc;
          }
          .playground-container p {
            line-height: 1.6; max-width: 800px; font-size: 0.95em; color: #b0b0b0;
          }
          .dashboard-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px; margin-top: 30px;
          }
          .dashboard-card {
            background-color: #2a2a2a; border: 1px solid #383838; border-radius: 8px;
            padding: 20px; display: flex; flex-direction: column;
          }
          .recursi-highlight {
            font-weight: bold;
            color: var(--accent-teal);
            font-style: normal;
          }
          .dashboard-card h3 { 
            margin: 0 0 10px 0; 
            font-weight: 500; 
            color: #00bfa5; 
          }
          .dashboard-card h3 .recursi-highlight { color: #80deea; }
    
          .dashboard-card p { font-size: 0.9em; margin: 0 0 15px 0; }
          .card-content { flex-grow: 1; display: flex; flex-direction: column; }
          .card-content.placeholder {
            align-items: center; justify-content: center; color: #666; border: 2px dashed #383838;
            border-radius: 4px; min-height: 100px;
          }
          .ball-container {
            flex-grow: 1; background-color: #1e1e1e; border-radius: 6px; border: 1px solid #111;
            box-shadow: inset 0 0 10px #000; margin-bottom: 15px; position: relative; overflow: hidden; min-height: 250px;
          }
          .bouncing-ball { position: absolute; border-radius: 50%; filter: blur(1px); opacity: 0.9; }
          .ball-controls { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            gap: 10px; 
            flex-wrap: wrap;
            padding-bottom: 10px;
          }
          .ball-controls button { padding: 8px 16px; font-size: 0.9em; font-weight: bold; background-color: #6a329f; }
          .command-center-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
          .command-btn {
            width: 100%; text-align: left; padding: 10px 12px; background-color: #3c3c3c;
            border: 1px solid #555; border-radius: 4px; font-family: 'Fira Code', monospace;
            font-size: 0.9em; color: #d4d4d4; cursor: pointer; transition: all 0.2s ease;
          }
          .command-btn:hover { background-color: #4f4f4f; border-color: #777; }
          .unpacker-drop-zone {
            border: 2px dashed #555;
            border-radius: 6px;
            padding: 30px;
            text-align: center;
            color: #888;
            transition: all 0.2s ease-in-out;
            cursor: pointer;
          }
          .unpacker-drop-zone.drag-over {
            background-color: rgba(0, 191, 165, 0.1);
            border-color: #00bfa5;
          }
          .card-content button.command-btn { text-align: center; }
        `;
    applyCss(fullCss, 'PlaygroundControllerStyles');
  }

  getElement() {
    return this.mainPanel;
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this._clearGlowBoxes();

    // Clean up specific widgets
    if (this.clipboardWidget && this.clipboardWidget.destroy) {
      this.clipboardWidget.destroy();
    }

    this.mainPanel.innerHTML = '';
  }

  _clearGlowBoxes() {
    if (this.glowBoxes && this.glowBoxes.length > 0) {
      this.glowBoxes.forEach((box) => box.destroy());
      this.glowBoxes = [];
    }
  }

  async _createWidgetCard(action) {
    const card = makeElement('div', {
      className: 'dashboard-card',
      'data-widget-id': action.id,
    });
    const title = makeElement('h3', { innerHTML: action.label });
    const description = makeElement('p', { innerHTML: action.description });
    card.append(title, description);

    const methodName = action.contentRendererMethod;
    if (methodName && typeof this[methodName] === 'function') {
      const content = await Promise.resolve(this[methodName]());
      if (content instanceof HTMLElement) {
        card.appendChild(content);
      }
    } else {
      card.appendChild(
        makeElement(
          'div',
          { className: 'card-content placeholder' },
          'No content renderer for this action.'
        )
      );
    }

    return card;
  }

  _createScreenCapCardContent() {
    const container = makeElement('div', {
      className: 'card-content',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    const launchBtn = makeElement('button', {
      className: 'command-btn',
      textContent: 'Launch Capture Tool',
      style: {
        backgroundColor: '#007acc',
        color: 'white',
        padding: '10px 20px',
      },
      onclick: () => {
        const mockBrowser = {
          updateThumbnailDisplay: (name, path) => {
            console.log(`[ScreenCap] Captured for ${name}: ${path}`);
            window._dev_projectEditorInstance.uiManager.setStatus(`Snapshot saved: ${path}`);
          },
          _exitEditMode: () => {},
        };

        if (!this.screenCapToolInstance) {
          this.screenCapToolInstance = new ScreenCapTool(mockBrowser);
        }
        this.screenCapToolInstance.showDialog();
      },
    });

    container.appendChild(launchBtn);
    return container;
  }

  _createFileSearchCardContent() {
    const widget = new FileSearchWidget(this.app);
    return widget.getElement();
  }

  _createLlmInputCardContent() {
      const container = makeElement('div', {
        className: 'card-content',
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minHeight: '250px',
        },
      });

      const textarea = makeElement('textarea', {
        placeholder: 'Paste or type Recursi protocol code here...',
        style: {
          flex: 1,
          width: '100%',
          padding: '10px',
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          border: '1px solid #444',
          borderRadius: '4px',
          fontFamily: 'monospace',
          resize: 'none',
          boxSizing: 'border-box',
        },
      });

      textarea.value = `async function run(env) {
  await env.saveClass({
    type: 'new',
    path: '/vibes/src/test/SimulatorCreated.js'
  }, class SimulatorCreated {
    constructor() {
      env.log("I was born in the playground!");
    }
  });
}`;

      const sendBtn = makeElement('button', {
        className: 'command-btn',
        textContent: 'Inject Text into System',
        style: {
          backgroundColor: '#2e7d32',
          color: 'white',
          fontWeight: 'bold',
          textAlign: 'center',
        },
        onclick: () => {
          const text = textarea.value.trim();
          if (!text) return;

          window._dev_projectEditorInstance.llmQueueManager.receive(text, 'simulator');

          const oldText = sendBtn.textContent;
          sendBtn.textContent = 'Sent!';
          sendBtn.disabled = true;
          setTimeout(() => {
            sendBtn.textContent = oldText;
            sendBtn.disabled = false;
          }, 1000);
        },
      });

      container.append(textarea, sendBtn);
      return container;
    }

  _createClipboardCatcherCardContent() {
    const widget = new ClipboardCatcherWidget(this.app);
    this.clipboardWidget = widget;
    return widget.getElement();
  }

    

  _createVisStripperCardContent() {
    class VisibilityStripperDemo {
      constructor() { this.element = this.render(); }
      getElement() { return this.element; }
      render() {
        const container = makeElement('div', { className: 'card-content', style: { display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', minHeight: '450px' } });
        const defaultCode = `class DemoClass {\n  constructor() { this.value = 1; }\n\n  // Public method\n  publicAction() { this._privateAction(); return this.value; }\n\n  // Private method - strips at Level 2\n  _privateAction() { console.log("Internal logic"); }\n\n  // Hot-Patch - strips at Level 2 AND Level 3\n  publicAction__patch_123() { return "broken"; }\n}`;
        const inputLabel = makeElement('label', { style: { color: '#00bfa5', fontWeight: 'bold' } }, 'Raw Code Input:');
        const textarea = makeElement('textarea', { value: defaultCode, style: { flex: 1, minHeight: '150px', padding: '10px', background: '#1e1e1e', color: '#d4d4d4', border: '1px solid #444', borderRadius: '4px', fontFamily: 'monospace', resize: 'none', outline: 'none' } });
        const outputLabel = makeElement('label', { style: { color: '#8433ff', fontWeight: 'bold', marginTop: '10px' } }, 'Stripped Output:');
        const outputArea = makeElement('pre', { style: { flex: 1, minHeight: '150px', padding: '10px', background: '#000', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontFamily: 'monospace', overflow: 'auto', margin: '0' } });
        const controls = makeElement('div', { style: { display: 'flex', gap: '10px', marginTop: '5px' } });

        const process = (level) => {
          let code = textarea.value;
          const acorn = window.acorn;
          if (!acorn) { outputArea.textContent = "Error: Acorn AST parser not available."; return; }
          try {
            const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
            const cls = ast.body.find(n => n.type === 'ClassDeclaration');
            if (cls) {
              const methods = cls.body.body.filter(m => m.type === 'MethodDefinition');
              const toRemove = [];
              for (const m of methods) {
                const name = m.key?.name || m.key?.value || '';
                const isPrivate = name.startsWith('_') || name.startsWith('#');
                const isPatch = name.includes('__patch_') || name.includes('__broken_');
                if (level <= 3 && isPatch) toRemove.push({ node: m, stripCompletely: true });
                else if (level <= 2 && isPrivate && !isPatch) toRemove.push({ node: m, stripBody: true });
              }
              for (let i = toRemove.length - 1; i >= 0; i--) {
                const { node: m, stripBody, stripCompletely } = toRemove[i];
                if (stripCompletely) { code = code.slice(0, m.start) + code.slice(m.end); }
                else if (stripBody && m.value && m.value.body && m.value.body.type === 'BlockStatement') {
                  const start = m.value.body.start + 1;
                  const end = m.value.body.end - 1;
                  code = code.slice(0, start) + '\n    // body removed. do not guess.\n  ' + code.slice(end);
                }
              }
            }
            outputArea.textContent = code.trim();
          } catch (e) { outputArea.textContent = "Parse Error: " + e.message; }
        };

        const makeBtn = (text, level, color) => makeElement('button', { textContent: text, style: { padding: '8px 12px', background: color, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }, onclick: () => process(level) });
        controls.append(makeBtn('Level 2 (Strip Private & Patches)', 2, '#d32f2f'), makeBtn('Level 3 (Strip Patches Only)', 3, '#f57c00'), makeBtn('Level 4 (Full Source)', 4, '#1976d2'));
        textarea.addEventListener('input', () => process(2));
        container.append(inputLabel, textarea, controls, outputLabel, outputArea);
        setTimeout(() => process(2), 100);
        return container;
      }
    }
    
    const widget = new VisibilityStripperDemo();
    return widget.getElement();
  }


  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### PlaygroundController\n\nOrchestrates the general testing environment inside the playground tab.";
    }

  _createHiliterCardContent() {
      const container = makeElement('div', {
        className: 'card-content',
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'center',
        },
      });

      const launchBtn = makeElement('button', {
        className: 'command-btn',
        textContent: 'Launch Highlighter',
        style: {
          backgroundColor: '#8433ff',
          color: 'white',
          padding: '10px 20px',
        },
        onclick: () => {
          if (!this.hiliterInstance) {
            const HiliterClass = window.Hiliter || globalThis.Hiliter;
            this.hiliterInstance = new HiliterClass();
          }
          this.hiliterInstance.start();
        },
      });

      container.appendChild(launchBtn);
      return container;
    }
}

