class RecursiTestRunner {
  run(env) {
      this.env = env; // Save environment securely
      this.targetElement = env.container;
      
    this.initStyles();
    this.render();
  }

  getTests() {
      return [
        {
          num: 1,
          type: 'autorun',
          title: 'Create File (env.saveClass)',
          description: 'Creates a brand new file using type: "new". Automatically manages metadata.',
          code: `async function run(env) {\n  await env.saveClass({\n    type: 'new',\n    path: '/vibes/aaProtocolTest/NewComponent.js',\n    dependencies: ['MathLib']\n  }, class NewComponent {\n    hello() { return 'world'; }\n  });\n  env.log('✅ Created file securely via saveClass');\n}`
        },
        {
          num: 2,
          type: 'autorun',
          title: 'Create Non-JS File',
          description: 'Creates an HTML file using standard env.writeFile().',
          code: `async function run(env) {\n  env.writeFile('/vibes/aaProtocolTest/index.html', '<div>Hello V3</div>');\n  env.log('✅ Created HTML file');\n}`
        },
        {
          num: 3,
          type: 'autorun',
          title: 'Surgical Modification',
          description: 'Surgically updates existing files via AST diff. Target inferred from class name.',
          code: `async function run(env) {\n  await env.saveClass({\n    type: 'modify',\n    name: 'NewComponent'\n  }, class NewComponent {\n    newMethod() { return 'added'; }\n    hello() { return 'modified'; }\n  });\n  env.log('✅ Updated file using surgical AST-diff');\n}`
        },
        {
          num: 4,
          type: 'autorun',
          title: 'Modify Dependencies',
          description: 'Mutates the managed getMetadata() block without destroying code context.',
          code: `async function run(env) {\n  await env.saveClass({\n    name: 'NewComponent',\n    addDependencies: ['NewUIComponent'],\n    deleteDependencies: ['MathLib']\n  });\n  env.log('✅ Injected dependencies transparently');\n}`
        },
        {
          num: 5,
          type: 'autorun',
          title: 'Move File',
          description: 'Renames/moves a file using env.moveFile(). This correctly renames the class inside the AST.',
          code: `async function run(env) {\n  const path = env.findFile('NewComponent');\n  if (path) {\n    env.moveFile(path, '/vibes/aaProtocolTest/RenamedComponent.js');\n    env.log('✅ File moved and class renamed');\n  }\n}`
        },
        {
          num: 6,
          type: 'paste',
          title: 'Syntax Error Diagnostics',
          description: 'Throws an interactive fallback dialog exactly like V1 if syntax fails in the protocol block.',
          code: `async function run(env) {\n  const a = ; // Intentional syntax error\n}`
        },
        {
          num: 7,
          type: 'paste',
          title: 'JS File Replace Blocked',
          description: 'Attempts to use the discouraged whole-file paste for a JS file without explicitly marking it as (replace). The parser blocks this.',
          code: `// /vibes/aaProtocolTest/RenamedComponent.js\nclass RenamedComponent {\n  hello() { return 'blocked'; }\n}`
        },
        {
          num: 8,
          type: 'paste',
          title: 'JS File Replace Explicit',
          description: 'Uses the (replace) suffix to explicitly authorize a whole-file JavaScript paste. This should succeed.',
          code: `// /vibes/aaProtocolTest/RenamedComponent.js (replace)\nexport default class RenamedComponent {\n  hello() { return 'replaced explicitly'; }\n}`
        },
        {
          num: 9,
          type: 'cleanup',
          title: 'Delete Files',
          description: 'Deletes the test files created during this run.',
          code: `async function run(env) {\n  const jsPath = env.findFile('RenamedComponent');\n  if (jsPath) env.deleteFile(jsPath);\n  const htmlPath = env.findFile('index.html');\n  if (htmlPath) env.deleteFile(htmlPath);\n  env.log('✅ Cleaned up V3 bare function tests.');\n}`
        }
      ];
    }

  initStyles() {
    applyCss(`
      .tr-root { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; padding: 30px 16px 48px; box-sizing: border-box; }
      .tr-header { text-align: center; margin-bottom: 36px; max-width: 640px; margin: 0 auto 36px; }
      .tr-header h1 { margin: 0 0 10px; color: #a78bfa; font-size: clamp(1.6rem, 4vw, 2.4rem); }
      .tr-header p { color: #94a3b8; font-size: 1rem; margin: 0; line-height: 1.5; }
      .tr-grid { display: grid; grid-template-columns: 1fr; gap: 24px; max-width: 860px; margin: 0 auto; }
      .tr-card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; box-sizing: border-box; }
      .tr-card-header { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
      .tr-card-num { font-size: 11px; color: #475569; font-family: monospace; padding-top: 4px; white-space: nowrap; }
      .tr-card h3 { margin: 0; flex: 1; color: #e2e8f0; font-size: 1.05rem; line-height: 1.3; min-width: 0; }
      .tr-badge { font-size: 10px; padding: 3px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; font-family: monospace; flex-shrink: 0; }
      .tr-badge-autorun { background: #047857; color: #d1fae5; }
      .tr-badge-cleanup { background: #991b1b; color: #fee2e2; }
      .tr-badge-paste { background: #5b21b6; color: #ede9fe; }
      .tr-description { color: #94a3b8; font-size: 0.9rem; line-height: 1.6; margin: 0 0 14px; }
      .tr-code-wrap { position: relative; }
      .tr-textarea { width: 100%; box-sizing: border-box; background: #020617; border: 1px solid #1e293b; border-radius: 8px; color: #a5b4fc; font-family: ui-monospace, monospace; font-size: 0.85rem; line-height: 1.5; padding: 12px 14px 12px 14px; resize: vertical; outline: none; white-space: pre; overflow-x: auto; min-height: 120px; }
      .tr-copy-btn { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); color: white; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 600; transition: background 0.15s; }
      .tr-copy-btn:hover { background: rgba(255,255,255,0.14); }
      .tr-copy-btn.copied { background: #059669; border-color: #059669; }
    `, 'recursi-test-runner-styles');
  }

  createCard(test) {
    const badgeClass = 'tr-badge tr-badge-' + test.type;
    const textarea = makeElement('textarea', { className: 'tr-textarea', spellcheck: 'false' }, test.code.trim());
    setTimeout(() => { textarea.style.height = textarea.scrollHeight + 'px'; }, 0);
    textarea.addEventListener('input', () => { textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px'; });

    const copyBtn = makeElement('button', { className: 'tr-copy-btn' }, 'Copy');
    copyBtn.onclick = () => {
      let codeToCopy = textarea.value.trim();
      if (!codeToCopy.startsWith('//') && test.type !== 'paste') {
        codeToCopy = '' + codeToCopy + '';
      }
      navigator.clipboard.writeText(codeToCopy);
      copyBtn.textContent = 'Copied!'; copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
    };

    return makeElement('div', { className: 'tr-card' },
      makeElement('div', { className: 'tr-card-header' },
        makeElement('span', { className: 'tr-card-num' }, '#' + test.num),
        makeElement('h3', {}, test.title),
        makeElement('span', { className: badgeClass }, test.type)
      ),
      makeElement('p', { className: 'tr-description' }, test.description),
      makeElement('div', { className: 'tr-code-wrap' }, copyBtn, textarea)
    );
  }

  render() {
      this.targetElement.innerHTML = '';
      //this.targetElement.classList.add('tr-root');
      const header = makeElement('div', { className: 'tr-header' },
        makeElement('h1', {}, 'Vibes Protocol V3 Tests'),
        makeElement('p', {}, 'A comprehensive suite verifying AST extraction, file operations, and safe metadata handling using the new async run(env) protocol.')
      );
      const grid = makeElement('div', { className: 'tr-grid' });
      for (const test of this.getTests()) grid.appendChild(this.createCard(test));
      this.targetElement.append(header, grid);
    }

}