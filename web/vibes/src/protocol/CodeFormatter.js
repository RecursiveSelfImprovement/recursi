class CodeFormatter {
  static async format(code) {
    if (
      typeof window.prettier === 'undefined' ||
      typeof window.prettierPlugins === 'undefined'
    ) {
      console.warn('Prettier library not loaded. Skipping formatting.');
      return code;
    }

    const opts = {
      parser: 'babel',
      plugins: window.prettierPlugins,
      tabWidth: 2,
      semi: true,
      singleQuote: true,
    };

    try {
      // Format the code using Prettier's browser API
      return window.prettier.format(code, opts);
    } catch (error) {
      // If there's a syntax error, it might be a naked method (e.g. from PasteReviewDialog comparing changes).
      // We wrap it exactly like we do for Acorn parsing, including 'extends Object' for super() calls.
      if (error.message && error.message.includes('SyntaxError')) {
        try {
          const wrappedCode = `class _WRAPPER_ extends Object {\n${code}\n}`;
          const formattedWrapped = window.prettier.format(wrappedCode, opts);

          const startIdx = formattedWrapped.indexOf('{');
          const endIdx = formattedWrapped.lastIndexOf('}');

          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            let inner = formattedWrapped.substring(startIdx + 1, endIdx);

            // Clean up leading/trailing blank lines from the wrapper and un-indent
            const lines = inner.split('\n');
            if (lines.length > 0 && lines[0].trim() === '') lines.shift();
            if (lines.length > 0 && lines[lines.length - 1].trim() === '')
              lines.pop();

            return lines
              .map((line) => (line.startsWith('  ') ? line.substring(2) : line))
              .join('\n');
          }
        } catch (wrapError) {
          // Wrapping didn't help, fall through
        }
      }

      // Log gracefully instead of throwing a massive red stack trace
      console.warn('Prettier formatting failed:', error.message.split('\n')[0]);

      // If formatting fails, return the original code to avoid breaking the update/diff check.
      return code;
    }
  }

  static _doc_CodeFormatter() {
    return {
      generatedBy: 'MigrateOwnedSidecarDocsToCapsulesV2',
      migratedAt: '2026-04-29T05:02:29.409Z',
      sourcePath: '/vibes/src/protocol/CodeFormatter_js.md',
      ownerPath: '/vibes/src/protocol/CodeFormatter.js',
      ownerClass: 'CodeFormatter',
      migrationStatus: 'sidecar-embedded-sidecar-deleted',
      visibilityRole: 'documentation',
      note: 'Migrated from legacy *_js.md sidecar into the managed JS capsule. This method is documentation payload, not runtime code. Prompt visibility docsLevel should control inclusion.',
      content:
        '# CodeFormatter\n\n## Summary\n\nCodeFormatter is a lightweight, fault-tolerant wrapper around the browser-based Prettier library. Its sole responsibility is taking raw Javascript strings—often mangled by manual user edits or inconsistent LLM outputs—and enforcing a strict, readable, uniform indentation and style before the code is injected into the editor or written to disk.\n\nThe philosophy is graceful degradation. LLMs frequently output "surgical updates" that consist of naked class methods (e.g., `render() { ... }`). Standard Prettier expects a complete, valid JS file and will throw a fatal `SyntaxError` if asked to format a naked method. This class intercepts that failure, uses string manipulation to trick Prettier into formatting the snippet, and returns pristine code without crashing the application.\n\n## Core Logic & Philosophy\n\n**The Wrapper Trick.** The core magic of `format()` occurs inside the `catch` block. If Prettier throws a SyntaxError, the formatter assumes the input is a naked method snippet. It dynamically constructs a string: `class _WRAPPER_ extends Object {\\n${code}\\n}`. It passes this perfectly valid class to Prettier. Once Prettier formats the entire class block, the formatter uses `indexOf` to slice off the `class` header and footer, un-indents the inner lines, and returns the beautifully formatted naked method.\n\n**Absolute fallback.** If Prettier is not loaded on the page (e.g., the CDN failed or it\'s a minimal offline build), or if the code is so fundamentally broken that even the wrapper trick fails, the method simply catches the error, logs a warning, and returns the original `code` string unmodified. It guarantees that the formatting step will never break the update pipeline.\n\n## Public API\n\n### Execution\n- `static async format(code)` — Accepts a raw JavaScript string. Attempts standard formatting, falls back to wrapper-based snippet formatting if a syntax error occurs, and returns the sanitized string (or the original string on total failure).',
    };
  }

  static _doc_overview() {
    return [
      '# CodeFormatter',
      '',
      'The `CodeFormatter` is a lightweight, fault-tolerant browser wrapper around the Prettier library.',
      'It cleans and sanitizes indentation and style before code is committed to disk.',
    ].join('\n');
  }

  static _doc_snippets() {
    return [
      '## Surgical Snippet Formatting',
      '',
      'Standard Prettier expects complete, valid JS files and will throw syntax errors on naked class methods (e.g. `render() { ... }`) generated by surgical updates.',
      'CodeFormatter solves this via a fallback wrapper trick:',
      '- If Prettier fails, the formatter wraps the method inside a dummy class: `class _WRAPPER_ extends Object { ... }`.',
      '- It runs Prettier on the wrapped class, then slices off the class header/footer and returns the perfectly formatted method snippet.',
    ].join('\n');
  }

  static _doc() {
    const docObj = CodeFormatter._doc_CodeFormatter();
    return docObj && typeof docObj === 'object' ? docObj.content || '' : '';
  }

}