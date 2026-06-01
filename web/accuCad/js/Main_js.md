# Main.js (Application Bootstrapper)

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


`js/Main.js` is the single entry point for the AccuCad application. It orchestrates the startup sequence and dependency injection.

## Initialization Flow

1.  **Scene Setup (`setupScene`)**:
    *   Initializes the `ThreeJSApp` wrapper (from `library`).
    *   Configures the camera, renderer, and environment (HDR lighting).
    *   Creates a `threeDView` object acting as a lightweight interface to the scene, passed to other components.

2.  **Application Wiring (`initializeApplication`)**:
    *   **`BaseController`**: Instantiated here. This is the core instance that will be passed to almost every other system.
    *   **Command Registration**: Calls `ControllerSetup.initializeController` to populate the controller with tools.
    *   **Managers**: Initializes `ViewControlsManager`, `KeyCommandHandler`, `SmartDrawKeys`, and `RotaryEncoders`.
    *   **Globals**: Conditionally exposes variables to `window` based on `DebugConfig`.

## Architectural Role

`Main.js` ensures that no circular dependencies occur during startup. It builds the foundational layers (Scene) -> Logic Layers (Controller) -> UI Layers (KeyHandlers/Widgets) in the correct order.