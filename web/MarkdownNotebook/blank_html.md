<!-- VIBES_CURRENT_APP_PROTOCOL_START -->
## Current Vibes App Protocol

This section supersedes older guidance that mentioned `/sharedLib`, ES module `import` / `export`, or `<script type="module">` for ordinary Vibes app files.

### Source paths

- Use `/library/...` for shared runtime helpers.
- Do **not** use `/sharedLib/...`; that name is obsolete.
- Third-party assets may still live under `/thirdparty/...`.

### JavaScript app files

- A normal app/source file should contain exactly one top-level class.
- The class name should match the app/file symbol after forking or renaming.
- Do not put loose top-level variables, startup calls, IIFEs, or global assignments in app class files.
- Do not use ES module `import` / `export` in ordinary Vibes app class files.
- Dependencies should be loaded by HTML script order, `/library` scripts, RunnerManager, or app initialization code.

### HTML bootstrap

- Use classic `<script src="...">` tags for `/library/...` and project files.
- Do not use `<script type="module">` for the app bootstrap unless a specific runner path explicitly supports it.
- Bootstrap should instantiate the app class, call `await app.init(...)` when init is async, and optionally expose the instance on `window` for debugging.

Example:

```html
<script src="/library/DialogBox.js"></script>
<script src="/library/makeElement.js"></script>
<script src="/library/ThreeJSApp.js"></script>
<script src="./src/MyApp.js"></script>
<script>
  (async () => {
    if (typeof ThreeJSApp !== "undefined") {
      await ThreeJSApp.ensureThreeLoaded();
    }

    const myApp = new MyApp();
    await myApp.init(document.body);
    window.myApp = myApp;
  })().catch(error => {
    console.error("MyApp bootstrap failed:", error);
  });
</script>
```

### Three.js apps

- Prefer the Basic3d pattern: store the Three.js module/object on `this.THREE`.
- Use `new this.THREE.Vector3(...)`, `new this.THREE.Mesh(...)`, etc.
- Avoid bare `THREE.*` inside app classes unless the app intentionally depends on a guaranteed global.
- `ThreeJSApp.ensureThreeLoaded()` is the preferred loading path.

### Forking

- Forking should rename the app class, constructor references, metadata symbol/provides, and project paths consistently.
- The runner should not guess or alias fork names at runtime.
- A forked app should provide the real forked class symbol before its initiator runs.

<!-- VIBES_CURRENT_APP_PROTOCOL_END -->

## File: blank.html

This file is the **runtime notebook page** used by Markdown Notebook. It is a full HTML document that bootstraps the `MultiWidgetPage` application when opened.

### Purpose
- Acts as the *live editing environment* where Markdown widgets are instantiated.
- Contains initial `<textarea>` blocks with Markdown content. Each textarea becomes a `MarkdownWidget` when the app loads.
- Loads Markdown parsing and conversion libraries (`markdown-it`, `turndown`, `turndown-plugin-gfm`).
- OBSOLETE / DO NOT USE for Vibes app files: Loads the main application entry point via ES module import:
  ```javascript
  OBSOLETE / DO NOT USE for Vibes app files: import { MultiWidgetPage } from './multiWidgetPage.js';
  new MultiWidgetPage();
  ```

### Key Elements
- **`<textarea class="md-content">` elements:** These store the initial notebook content and get converted into live widgets.
- **External libraries:** loaded via CDN using `<script defer>`.
- **Module bootstrap:** Creates the full notebook UI from JavaScript only — the HTML file itself contains no layout code beyond the starter textareas.

### Runtime Behavior
When opened:
1. The browser loads the global Markdown libraries.
2. The module script imports `MultiWidgetPage`.
3. The constructor scans for `.md-content` textareas.
4. Each textarea becomes a draggable, collapsible Markdown widget.

### Notes
- This file is also the one **exported** when the user clicks **Save HTML**, meaning saved notebooks will look structurally similar.
- No classes, exports, or JS logic live directly inside this file — everything is delegated to external modules.
