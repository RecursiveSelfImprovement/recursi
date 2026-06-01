class VibesProtocolCapsule {

  static _doc_intro() {
      return `
# Vibes Protocol (V3)

You are connected to **Vibes**, a browser-based development environment for building JavaScript applications.

Vibes evaluates your code, performs AST-based diffs, shows a change summary, and applies updates after approval.

All JavaScript updates must be written inside standard run(env) execution contexts.

All JavaScript logic is now written inside a single entry point:

> **async function run(env) { ... }**

This function is the only supported execution surface for JavaScript updates.
`;
    }

  static _doc_runProtocol() {
      return `
## The run(env) Protocol

All operations are performed inside:

\`\`\`javascript
async function run(env) {
  // your logic here
}
\`\`\`

You define any helper or donor classes inside the function scope.

The primary mechanism for code changes is:

> **env.saveClass(options, classExpression)**

This performs AST-diffing and safely applies modifications to existing files.
`;
    }

  static _doc_saveClassDeepDive() {
      return `
## env.saveClass(options, classExpression)

This is the core mutation API for JavaScript files.

It performs:
- AST diffing
- Method-level patching
- Method-level deletion
- Safe file routing

### Signature

\`\`\`javascript
await env.saveClass(options, classExpression);
\`\`\`

---

## Behavior

- **new** → creates a file
- **modify** → surgically updates an existing class via AST diff (add, replace, or delete methods).

No manual file writing is required for JavaScript files.

---
`;
    }

  static _doc_optionsObject() {
      return `
## saveClass Options Object

### Required / Core Fields

- **type** (string)
  - "new" | "modify"
  - Defaults to "modify"

- **name** (string)
  - Target class name
  - Used for lookup if path is omitted

- **path** (string)
  - Required when creating new files
  - Full canonical file path

### Method Deletion Fields

- **deleteMethods** (array of strings)
  - Optional. List of class method names to surgically delete from the file using AST-range stripping.

---

### Resolution Rules

If \`path\` is omitted during modification:
- Vibes uses \`env.findFile(name)\`
- Must resolve to exactly one file
- Otherwise operation fails safely
`;
    }

  static _doc_formations() {
      return `
## Formations & Use Cases

---

### 1. Creating a New File

\`\`\`javascript
async function run(env) {
  await env.saveClass({
    type: 'new',
    path: '/vibes/MyProject/NewComponent.js'
  }, class NewComponent {
    render() {
      return 'Hello World';
    }
  });

  env.log('Created new component');
}
\`\`\`

---

### 2. Surgical Modification (AST Diff)

\`\`\`javascript
async function run(env) {
  await env.saveClass({
    type: 'modify',
    name: 'ExistingComponent'
  }, class ExistingComponent {

    render() {
      return 'Updated Render';
    }

    newFeature() {
      return true;
    }

  });

  env.log('Modified component');
}
\`\`\`

Only provided methods are touched. Everything else is preserved.

---

### 3. Surgical Method Deletion

To delete methods from a class, pass the list of method names in the \`deleteMethods\` option:

\`\`\`javascript
async function run(env) {
  await env.saveClass({
    type: 'modify',
    name: 'ExistingComponent',
    deleteMethods: ['newFeature']
  });

  env.log('Surgically deleted newFeature method');
}
\`\`\`
`;
    }

  static _doc_dependencies() {
      return `
## Project Dependency Management (files.json)

All project dependencies and script topologies are managed cleanly and directly inside each project's \`files.json\` manifest. The order of entries inside \`files.json\` does not matter; on startup, the loader automatically and topologically sorts all scripts based on their class declarations.

When creating a new class or deleting an existing class, you must update the project's dependency manifest. Do NOT manually read, parse, or write \`files.json\` using \`env.readFile\` or \`env.writeFile\`. Instead, use the built-in, first-class dependency management methods available on the \`env\` object:

### env.addDependency(path, manifestPath = null)
Intelligently categorizes and appends a file path to the correct section of the project's \`files.json\` manifest.

- **path** (string): The golden path of the file to add as a dependency (e.g. \`"/MyProject/src/NewComponent.js"\`).
- **manifestPath** (string, optional): The path to the specific \`files.json\` manifest. If omitted, the system automatically locates the appropriate \`files.json\` based on the target path root.

#### Behavior:
- Paths beginning with \`http://\` or \`https://\` are placed in \`"thirdParty"\`.
- Paths under \`/library/\` are placed in \`"library"\` (and simplified to their filename or library sub-path).
- Other local project paths (including sibling directory references, such as \`"/LogoExperiments/js/EmberLogo.js"\` used by other projects) are resolved and placed in the \`"local"\` array.
- All lists are automatically sorted alphabetically and deduplicated.

\`\`\`javascript
async function run(env) {
  const newClassPath = '/MyProject/src/NewComponent.js';

  // 1. Create the new class
  await env.saveClass({
    type: 'new',
    path: newClassPath
  }, class NewComponent {
    render() {
      return 'Hello World';
    }
  });

  // 2. Register the dependency automatically in files.json
  await env.addDependency(newClassPath);
  env.log('Created NewComponent and registered its dependency.');
}
\`\`\`

### env.removeDependency(path, manifestPath = null)
Removes a dependency path from the project's \`files.json\` manifest.

\`\`\`javascript
async function run(env) {
  const oldClassPath = '/MyProject/src/OldComponent.js';

  // 1. Delete the file
  env.deleteFile(oldClassPath);

  // 2. Unregister the dependency automatically
  await env.removeDependency(oldClassPath);
  env.log('Deleted OldComponent and removed its dependency.');
}
\`\`\`
`;
    }

  static _doc_deletion() {
      return `
## File Deletion

Deletion is handled outside saveClass.

\`\`\`javascript
async function run(env) {
  const path = env.findFile('OldComponent');
  if (path) {
    env.deleteFile(path);
    env.log('Deleted:', path);
  }
}
\`\`\`

Always resolve paths first using \`env.findFile()\`.
`;
    }

  static _doc_fallbacksNonJS() {
      return `
## Fallbacks & Non-JavaScript Files

env.saveClass only applies to JavaScript AST-managed files.

For non-JS assets (CSS, HTML, JSON), use direct file writes:

\`\`\`javascript
async function run(env) {
  env.writeFile('/vibes/MyProject/styles.css', \`
body {
  background: black;
}
\`);
}
\`\`\`

Or use path-comment syntax:

\`\`\`css
// /vibes/MyProject/styles.css (replace)
body { background: #000; }
\`\`\`

Note: JavaScript files MUST use saveClass. Direct overwrite patterns are not allowed for .js files.
`;
    }

  static _doc_envObject() {
      return `
## The env Object

### File System

\`\`\`javascript
env.readFile(path)
env.writeFile(path, content)
env.deleteFile(path)
env.moveFile(source, dest)
env.listFiles()
env.findFile(pattern)
\`\`\`

---

### Execution & Output

\`\`\`javascript
env.log(...args)
env.clearOutput()
env.searchCode(query, options)
\`\`\`

---

### JavaScript Mutation (V3 Core)

\`\`\`javascript
env.saveClass(options, classExpression)
\`\`\`

---

### Visibility System

\`\`\`javascript
env.setVisibility(spec)
env.saveVisibilitySet(name, spec)
env.loadVisibilitySet(name)
env.listVisibilitySets()
\`\`\`
`;
    }

  static _doc_globalHelpers() {
      return `
## Global Helper Functions

These are available globally in all Vibes environments.

---

### makeElement(tag, options, ...children)

Creates DOM elements in an idiomatic way.

\`\`\`javascript
const btn = makeElement('button', {
  className: 'primary',
  onclick: () => this.save()
}, 'Save');

document.body.appendChild(btn);
\`\`\`

---

### applyCss(cssString, id)

Injects or replaces a style block.

\`\`\`javascript
applyCss(\`
.primary {
  background: blue;
  color: white;
}
\`, 'theme');
\`\`\`
`;
    }

  static _doc_fileOperations() {
      return `
## Common File Operations

---

### Read File

\`\`\`javascript
async function run(env) {
  const path = env.findFile('Config');
  const content = env.readFile(path);
  env.log(content);
}
\`\`\`

---

### Update File (non-JS only)

For non-JS files, use direct write:

\`\`\`javascript
env.writeFile('/vibes/file.txt', 'hello world');
\`\`\`

---

### Move File

\`\`\`javascript
env.moveFile('/old/path.js', '/new/path.js');
\`\`\`
`;
    }

  static _doc_projectStructure() {
      return `
## Project Structure

- /library/ - shared runtime utilities
- /yourproject/ - application source code

Rules:
- One class per JS file
- Class name must match file name
- No imports/exports in app files
- No global side effects in class files
`;
    }

  static _doc_visibilitySets() {
      return `
## Visibility Sets

Visibility sets control what is shown in the Build Prompt UI.

---

### Save Set

\`\`\`javascript
await env.saveVisibilitySet('feature', {
  resetFirst: true,
  files: {
    '/vibes/src/App.js': { codeLevel: 4 }
  }
});
\`\`\`

---

### Load Set

\`\`\`javascript
await env.loadVisibilitySet('feature');
\`\`\`

---

### Direct Visibility

\`\`\`javascript
env.setVisibility({
  resetFirst: true,
  files: {
    '/vibes/src/App.js': { signatures: true }
  }
});
\`\`\`
`;
    }

  static _doc_afterApproving() {
      return `
## After Approving

Once approved:

1. All staged AST diffs are applied
2. Files are saved automatically
3. Live preview updates instantly

No manual save step is required.
`;
    }

  static _doc() {
      return [
        this._doc_intro(),
        this._doc_runProtocol(),
        this._doc_saveClassDeepDive(),
        this._doc_optionsObject(),
        this._doc_formations(),
        this._doc_dependencies(), // Registered into the main stitched documentation array
        this._doc_deletion(),
        this._doc_fallbacksNonJS(),
        this._doc_envObject(),
        this._doc_globalHelpers(),
        this._doc_fileOperations(),
        this._doc_projectStructure(),
        this._doc_visibilitySets(),
        this._doc_afterApproving(),
      ].join('\n\n');
    }

  

}