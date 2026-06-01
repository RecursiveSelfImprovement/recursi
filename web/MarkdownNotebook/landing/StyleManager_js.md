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

## File: landing/StyleManager.js

`StyleManager` centralizes all CSS for the landing page. It uses the shared `applyCss` helper to inject named `<style>` blocks into the document.

### Overview
- Provides a **static API** (`StyleManager.init()`) so no instances are needed.
- Groups styles into logical buckets: variables, base styles, background, typography, layout, components, and Mindful Vibe branding.
- Each bucket writes a separate `<style>` tag with a stable ID, making updates idempotent.

### Public API
- **`StyleManager.init()`**
  - Entry point called from `LandingPage.init()`.
  - Applies all style groups in a deterministic order:
    1. `applyVariables()`
    2. `applyBaseStyles()`
    3. `applyBackgroundStyles()`
    4. `applyTypography()`
    5. `applyLayoutStyles()`
    6. `applyComponentStyles()`
    7. `applyMvgStyles()`

### Style Groups
1. **CSS Variables** – `applyVariables()`
   - Defines design tokens under `:root`, such as:
     - `--accent-color`, `--accent-hover` for buttons.
     - `--glass-bg`, `--glass-border` for glassmorphism panels.
     - `--text-main`, `--text-muted` for text colors.

2. **Base Styles** – `applyBaseStyles()`
   - Sets the global font (`Inter`), page margin, min height, and horizontal overflow rules.
   - Applies custom scrollbar styling for a more polished feel.

3. **Background** – `applyBackgroundStyles()`
   - `.app-background`: a fixed, full-viewport background image using the Mindful Vibe graphic.
   - `.app-overlay`: a semi-transparent dark overlay to improve text contrast.

4. **Typography** – `applyTypography()`
   - Styles the main `<h1>` hero title with:
     - Large size, tight tracking, gradient text, and drop shadow.
   - Styles `.hero-subtitle` for readability and width.

5. **Layout** – `applyLayoutStyles()`
   - `.landing-layout`: centers content, constrains max width, adds padding, and sets up flex layout.
   - `.hero-section` and `.features-grid` animations (`fadeInDown`, `fadeInUp`) for a subtle on-load motion.

6. **Components** – `applyComponentStyles()`
   - `.feature-card`: glass panel with hover elevation and subtle background shift.
   - `.btn-large`: primary CTA styling with gradient, rounded pill, shadow, and hover scaling.

7. **Mindful Vibe Branding** – `applyMvgStyles()`
   - `.mvg-thumbnail`: fixed corner thumbnail, hover scale, and border treatment.
   - `.mvg-modal` and `.mvg-modal-content`: full-screen overlay with blur, centered content, and zoom-in animation.
   - `.mvg-full-img`, `.mvg-text`, `.mvg-title`, `.mvg-subtitle`: styling for the full branding card.

### Interactions
- This module:
  - **Depends on**: `applyCss` from `library`.
  - **Is used by**: `LandingPage`, which calls `StyleManager.init()` once and then focuses purely on DOM structure.

### Mental Model
`StyleManager` is the **CSS orchestration layer** for the landing page. It keeps all styling logic in one place so that `LandingPage` reads like an HTML structure builder rather than a pile of style strings.
