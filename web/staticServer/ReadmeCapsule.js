class ReadmeCapsule {
static _doc_vibesStaticCapsuleServer() {
    return '# Vibes Static Capsule Server\n\nThis folder contains a clean static-only test server for the Vibes static-server migration.\n';
  }

  static _doc_whyThisExists() {
    return '## Why this exists\n\nThe normal development server historically exposed dynamic Node API routes under `/api/*`.\n\nThis server intentionally does not implement those routes. Any request to `/api/*` returns HTTP 410.\n\nThat makes it useful for proving that Vibes can load, read, edit, preview, and build prompts through browser-side stores and the VirtualFileSystem instead of the old backend.\n';
  }

  static _doc_files() {
    return '## Files\n\n- `server.js` is intentionally tiny and non-capsule-compliant. Node needs one file where `require()` happens.\n- `StaticServerCapsule.js` is the pure class capsule that owns the server behavior.\n';
  }

  static _doc_runFromTheRepoWebRoot() {
    return '## Run from the repo web root\n\nFrom the directory that contains `vibes/`:\n\n```bash\nnode vibes/staticServer/server.js --port 7103\n```\n\nThen open:\n\n```text\nhttp://127.0.0.1:7103/vibes/\n```\n';
  }

  static _doc_runFromAnywhere() {
    return '## Run from anywhere\n\n```bash\nnode /path/to/web/vibes/staticServer/server.js --webRoot /path/to/web --port 7103\n```\n';
  }

  static _doc_expectedBehavior() {
    return '## Expected behavior\n\n- `/vibes/` loads Vibes.\n- static files under `/vibes/`, `/library/`, and other web-root folders are served normally.\n- `/api/*` returns 410.\n- blocked folders such as `.git` and `node_modules` are not served.\n';
  }

  static _doc_migrationTestLoop() {
    return '## Migration test loop\n\n1. Start this server.\n2. Open Vibes from this server.\n3. Open the browser web root using the File System Access API.\n4. Run the runtime API trap test.\n5. Fix any goblins, gremlins, or raccoons that still try to call `/api/*`.\n';
  }

  static getMarkdown() {
    return [
      this._doc_vibesStaticCapsuleServer(),
      this._doc_whyThisExists(),
      this._doc_files(),
      this._doc_runFromTheRepoWebRoot(),
      this._doc_runFromAnywhere(),
      this._doc_expectedBehavior(),
      this._doc_migrationTestLoop(),
    ].join('\n\n');
  }
}