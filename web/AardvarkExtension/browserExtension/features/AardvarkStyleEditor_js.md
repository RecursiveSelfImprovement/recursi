# AardvarkStyleEditor

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


The `AardvarkStyleEditor` provides a real-time, in-page CSS manipulation interface for elements selected via the Aardvark tool. It extracts an element's inline styles, presents them in an editable grid, and displays computed styles as placeholders to guide the user.

## Key Responsibilities

1. **State Isolation:** Temporarily pauses Aardvark's mouse-tracking and keyboard listeners (`_pauseForDialog`) so the user can type property names and values without accidentally triggering shortcuts or selecting new elements.
2. **Live Editing:** Applies CSS changes instantly as the user types (with a 60ms debounce) and allows for the removal of properties.
3. **Session Memory:** Tracks changes (`sessionChanges` and `lastAppliedChanges`) so users can revert to the element's original state, or apply a "Previous" set of styles to a newly selected element.
OBSOLETE / DO NOT USE for Vibes app files: 4. **Import/Export:** Allows users to save the current style map as a downloaded JSON file, or load a previously saved JSON file to instantly apply a complex set of styles.

## Core Methods

- **`openStyleEditor()`**: Triggers the creation of the editor dialog, calculates a smart on-screen position (avoiding the target element), and parses the target's current `style` attribute.
- **`_buildStyleEditorUI()`**: Constructs the dynamic DOM grid of property/value inputs. Wires up listeners to fetch `window.getComputedStyle` dynamically as property names are typed.
- **`_normalizeCssPropName(prop)`**: Converts camelCase (e.g., `borderRadius`) or spaced strings into standard CSS kebab-case (`border-radius`) to ensure properties are applied correctly via the DOM `style` API.