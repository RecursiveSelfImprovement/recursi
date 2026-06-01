class VisibilityStripperDemo {

  constructor() {
    this.element = this.render();
  }

  getElement() {
    return this.element;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'card-content';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 10px; height: 100%; min-height: 450px;';

    const defaultCode = `class DemoClass {
  constructor() {
    this.value = 1;
  }

  // Public method
  publicAction() {
    this._privateAction();
    return this.value;
  }

  // Private method - should strip at Level 2
  _privateAction() {
    this.value += 1;
    console.log("Internal logic that LLMs don't need to read");
    for(let i=0; i<100; i++) { Math.random(); }
  }

  // Leftover Hot-Patch - should strip at Level 2 AND Level 3
  publicAction__patch_1734500000_abc12() {
    return "broken legacy logic";
  }
}`;

    const inputLabel = document.createElement('label');
    inputLabel.textContent = "Raw Code Input:";
    inputLabel.style.color = "#00bfa5";
    inputLabel.style.fontWeight = "bold";

    const textarea = document.createElement('textarea');
    textarea.value = defaultCode;
    textarea.style.cssText = 'flex: 1; min-height: 150px; padding: 10px; background: #1e1e1e; color: #d4d4d4; border: 1px solid #444; border-radius: 4px; font-family: monospace; resize: none; outline: none;';

    const outputLabel = document.createElement('label');
    outputLabel.textContent = "Stripped Output:";
    outputLabel.style.color = "#8433ff";
    outputLabel.style.fontWeight = "bold";
    outputLabel.style.marginTop = "10px";

    const outputArea = document.createElement('pre');
    outputArea.style.cssText = 'flex: 1; min-height: 150px; padding: 10px; background: #000; color: #fff; border: 1px solid #555; border-radius: 4px; font-family: monospace; overflow: auto; margin: 0;';

    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; gap: 10px; margin-top: 5px;';

    const process = (level) => {
      let code = textarea.value;
      const acorn = window.acorn;
      if (!acorn) {
        outputArea.textContent = "Error: Acorn AST parser not available in global scope.";
        return;
      }
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
            
            if (level <= 3 && isPatch) {
              toRemove.push({ node: m, stripCompletely: true });
            } else if (level <= 2 && isPrivate && !isPatch) {
              toRemove.push({ node: m, stripBody: true });
            }
          }

          for (let i = toRemove.length - 1; i >= 0; i--) {
            const { node: m, stripBody, stripCompletely } = toRemove[i];
            if (stripCompletely) {
              code = code.slice(0, m.start) + code.slice(m.end);
            } else if (stripBody && m.value && m.value.body && m.value.body.type === 'BlockStatement') {
              const start = m.value.body.start + 1;
              const end = m.value.body.end - 1;
              code = code.slice(0, start) + '\n    // body removed. do not guess.\n  ' + code.slice(end);
            }
          }
        }
        outputArea.textContent = code.trim();
      } catch (e) {
        outputArea.textContent = "Parse Error: " + e.message;
      }
    };

    const makeBtn = (text, level, color) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.style.cssText = `padding: 8px 12px; background: ${color}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;`;
      b.onclick = () => process(level);
      return b;
    };

    controls.append(
      makeBtn('Level 2 (Strip Private & Patches)', 2, '#d32f2f'),
      makeBtn('Level 3 (Strip Patches Only)', 3, '#f57c00'),
      makeBtn('Level 4 (Full Source)', 4, '#1976d2')
    );

    textarea.addEventListener('input', () => process(2)); // Auto-process on default level 2

    container.append(inputLabel, textarea, controls, outputLabel, outputArea);
    
    // Initial run
    setTimeout(() => process(2), 100);

    return container;
  }

}
if (typeof window !== 'undefined') window.VisibilityStripperDemo = VisibilityStripperDemo;
