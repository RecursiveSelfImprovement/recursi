class OrganicIdeManifestoCapsule {

  static _doc_manifestoV1() {
      return `# The Organic IDE: Vibes Manifesto

Welcome to the **Vibes Architecture**. We are dismantling the traditional, spatial IDE (static file trees, rigid grids, fixed tabs) and replacing it with an organic, temporal, conversational interface.

Currently, our interface relies heavily on **floating windows**. This is not the endgame; it is a deliberate liberation from the restrictive grid. Floating windows give us an infinite canvas where elements can overlap without running out of space, allowing us to interact with the codebase loosely and freely. Eventually, these elements will fold into a **linear, conversational timeline** where code expands and contracts directly within the chat feed.

To achieve this, the underlying architecture must be mathematically pristine, strictly managed, and absolutely bulletproof.

As an AI agent operating within this system, you must adhere to the following core philosophies and strict rules.

---

## RULE 1: The Prime Directive (Reliability > Speed)

**We do not \"move fast and break things.\" We build unbreakable foundations.**

If an operation fails - specifically anything related to file I/O, saving, or workspace synchronization - **STOP EVERYTHING**.

- Do not attempt to \"work around\" the problem.
- Do not ignore a failed write or a mismatched readback.
- Our immediate, exclusive priority shifts entirely to diagnosing why the failure occurred.

There must never be a scenario where the workspace state is ambiguous, where the client is reading stale cache, or where a file is silently corrupted. The save/sync pipeline must remain bulletproof.

---

## RULE 2: The Pure Class Constraint

JavaScript modules, imports, exports, and top-level variables are legacy concepts that break AST predictability. **They are forbidden.**

- **1 File = 1 Class = Exact Same Name.** Example: \`MyClass.js\` contains only \`class MyClass { … }\`.
- **No Top-Level Junk:** No \`const\`, \`let\`, IIFEs, or configuration objects outside the class.
- **No Migration Leftovers:** Do not leave commented-out ES6 exports or old require statements. Keep the file pristine.

---

## RULE 3: Method Topology (Hide the Ugly)

The class is the transport unit; the method is the mutation unit. We structure methods to optimize for human readability and LLM token limits.

- **Public Methods:** Clean, highly explanatory, and easily scannable. They tell the story of what the class does.
- **Private Methods:** Bulky, complex implementation details go in underscore-prefixed methods such as \`_measureLayout()\`, \`_renderInternal()\`, or \`_buildDom()\`.

This allows the UI to compress files down to public signatures. The LLM gets a good understanding of the API surface without wasting tokens on internal DOM math.

---

## RULE 4: Anti-Hallucination (Read Before Write)

You cannot modify a method you cannot see.

If you are operating on a file where you only have the \"Signature\" view, you must use \`env.readMethod()\` to fetch the existing implementation before issuing \`env.transplantMethod()\` or \`env.writeFile()\`.

Blindly overwriting methods based on assumptions is prohibited.

---

## RULE 5: Execution as Validation (The Future)

Currently, we validate files by ensuring they parse cleanly via the Acorn AST. Moving forward, the ultimate validation is **execution**.

Before a file is permanently committed, the system will validate that it parses cleanly and complies with modular encapsulation.

- If it contains a syntax error, it fails.
- If it violates modular encapsulation, it warning-flags or halts.

Therefore, every class should be syntactically complete, self-contained, and capable of passing a live runtime sanity check.

---

## Current Architectural Direction

Vibes is moving away from one rigid IDE layout and toward reusable floating/contextual work surfaces:

- Floating FileTreeView windows for external local folders.
- Floating editor windows that reuse the same editor machinery as the main tabs.
- External folders treated as first-class roots with intuitive paths such as \`/MyFolder/file.js\`.
- Local folder stores can write to disk when permission exists via the browser File System Access API.
- **Memory Mode** has been completely trashed and removed. We now strictly use direct VFS disk mounting (\`localdir\`) and browser IndexedDB patch routing (\`indexeddb\`).
- The floating-window phase is not clutter for its own sake. It is the transitional canvas where components become independent, composable, testable, and ready to later fold into a richer organic interface.`;
    }

  static _doc_manifestoV2() {
      return "";
    }
  
  

  static _doc() {
      return [
        this._doc_manifestoV1(),
        this._doc_manifestoV2()
      ].join('\n\n---\n\n');
    }

}