<!-- 25% -->
# DebugConfig

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


`DebugConfig` is a simple, static class that centralizes configuration flags for debugging purposes.

### Core Philosophy

This class provides a single, clear location to enable or disable features that are useful during development but should be turned off in a production environment. Its primary use is to control which core application components are exposed on the global `window` object, making them accessible from the browser's developer console.

<!-- 50% -->

### Primary API Usage

This class is imported by `Main.js` during the application startup to decide whether to expose globals.

```javascript
// In Main.js
OBSOLETE / DO NOT USE for Vibes app files: import { DebugConfig } from './DebugConfig.js';
// ...
_exposeGlobals(threeDView, baseController) {
    if (DebugConfig.exposeThreeDView) window.threeDView = threeDView;
    if (DebugConfig.exposeBaseController) window.baseController = baseController;
}
```

<!-- 75% -->

### Configuration Properties

-   `static exposeThreeDView`: If `true`, the main `threeDView` object (containing the scene, camera, and renderer) will be available as `window.threeDView`.
-   `static exposeBaseController`: If `true`, the main `baseController` instance will be available as `window.baseController`.