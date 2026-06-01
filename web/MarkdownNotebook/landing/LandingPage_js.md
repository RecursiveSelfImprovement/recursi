## File: landing/LandingPage.js

`LandingPage` is the main controller for the **marketing / explanatory landing layout**. It handles the hero section, feature cards, documentation block, and Mindful Vibe Coding branding.

### Overview
- Uses `StyleManager` to inject all the CSS for the landing view.
- Constructs the landing DOM using the shared `makeElement` helper.
- Provides a single CTA (Launch Editor) that navigates to `blank.html`.
- Adds a persistent Mindful Vibe thumbnail and full-screen modal for branding and context.

### Key Responsibilities
1. **Initialize the page**
   - `init(targetElement)` stores a container reference, calls `StyleManager.init()`, and then calls `renderLayout()`.

2. **Build the main layout** – `renderLayout()`
   - Clears any existing content in the container.
   - Creates:
     - A fixed **background image** (`.app-background`).
     - A dark **overlay** (`.app-overlay`) to ensure text contrast.
     - A **hero section** with:
       - Title: "Markdown Notebook".
       - Subtitle explaining the tool.
       - Primary button: **Launch Editor**.
     - A **features grid** with cards describing:
       - Pasting from ChatGPT / Gemini / the web.
       - Saving as a reusable HTML notebook.
       - Round-tripping between Markdown and formatted view.
   - Adds a **documentation section** at the bottom that explains how the notebook works, how pasting HTML behaves, and what is (and isn’t) stored locally vs on the server.
   - Renders Mindful Vibe branding elements:
     - A fixed thumbnail in the bottom-right corner.
     - A full-screen modal opened by clicking the thumbnail.

3. **Navigation into the app** – `launchApp()`
   - Simple navigation method:
     ```javascript
     window.location.href = './blank.html';
     ```
   - This is the bridge from **landing marketing page** → **live notebook workspace**.

4. **Branding helpers**
   - `createMvgThumbnail()` builds a small, fixed-position image in the corner that opens the branding modal.
   - `createMvgModal()` builds the full-screen modal with:
     - The main Mindful Vibe image.
     - Title and subtitle row (Structured / Scalable / Intentional).
     - A paragraph explaining the philosophy: your work lives in plain files; the JavaScript lives on the server.

5. **Documentation section** – `createDocumentationSection()`
   - Uses `applyCss` to inject layout/styles for a contained docs panel (`.docs-section`).
   - Provides structured explanation for:
     - What "paste HTML" means in this context.
     - A typical workflow from opening the editor to saving HTML.
     - What is saved in your `.html` file vs what is loaded from the server.
     - A note about offline behavior and the possibility of a future fully-embedded/offline export.

### Interactions
- Depends on:
  - `StyleManager` for all CSS.
  - `makeElement` for DOM creation.
- Hands off to:
  - `MultiWidgetPage` indirectly, by redirecting the browser to `blank.html` where the notebook is initialized.

### Mental Model
Think of `LandingPage` as the **storyteller and router**:
- It explains what Markdown Notebook is.
- It sets up a pretty, branded, glassy landing UI.
- Then it sends the user to the actual editor when they are ready to work.
