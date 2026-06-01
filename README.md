# Vibes

A recursively self-improving vibe coding environment designed to make application development accessible to everyone-from kids and non-programmers to open-minded technical experts.

Vibes runs as a zero-setup, browser-based workspace. The system is designed to run entirely off a standard static web server (such as Apache, Nginx, or any simple HTTP server) without a dynamic backend database, while leveraging local filesystem access APIs for robust offline development.

---

## Architectural Principles

1. **Managed Single-Class Architecture**:
   - Every JavaScript file represents a single class matching the filename (e.g., `MyComponent.js` contains `class MyComponent { ... }`).
   - Standard import (`import`) and export (`export`) statements are omitted from application code to optimize readability and AI compatibility.
   - On startup, the loader automatically scans the files, resolves class relationships, and topologically sorts script execution.

2. **The `run(env)` Protocol**:
   - Code edits are executed dynamically using isolated `async function run(env)` blocks.
   - Surgical method replacement via AST-level diffing preserves existing code and updates only the targeted modifications, preventing regressions.
   - Dependencies and manifest configurations are automatically registered in the project's `files.json` using automated APIs rather than manual file operations.

3. **Ultra-Lightweight Static Local Serving**:
   - For local development, a trivial server built entirely on native Node.js APIs serves static assets without external npm modules.

---

## Getting Started

To run the Vibes development environment locally:

1. Launch the native static server:
   ```bash
   node web/staticServer/server.js
   ```

2. Open the URL printed on startup in your browser (defaults to `http://localhost:7102/vibes/`).

3. Select your workspace directory via the File System Access API in the browser to start building.
