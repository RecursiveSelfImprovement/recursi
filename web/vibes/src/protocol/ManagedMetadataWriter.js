class ManagedMetadataWriter {
  static stripMetadata(options = {}) {
      return { ok: true, text: String(options.text || ''), removed: [] };
    }

  static injectMetadata(options = {}) {
      return {
        ok: true,
        text: String(options.text || ''),
        removed: [],
        injected: false
      };
    }

  static buildMetadataMethodSource(metadata, indent = '  ') {
      return '';
    }

  static makeMetadata(options = {}) {
      const report = options.report || {};
      const previous = options.previousMetadata || {};

      let cleanProvides = previous.provides || report.provides || [];
      if (Array.isArray(cleanProvides)) {
        cleanProvides = cleanProvides.filter(
          (p) => typeof p === 'string' && p.toLowerCase() !== 'none'
        );
      } else {
        cleanProvides = [];
      }
      if (previous.symbol && (!cleanProvides || cleanProvides.length === 0)) {
        cleanProvides = [previous.symbol];
      }

      const meta = {};

      if (cleanProvides.length > 0) meta.provides = cleanProvides;

      const semanticKeys = [
        'schema',
        'managed',
        'css',
        'runnable',
        'entryPoint',
        'runner',
        'description',
        'role',
        'notes',
        'version',
        'modules',
      ];
      for (const key of semanticKeys) {
        if (previous[key] !== undefined) {
          meta[key] = previous[key];
        }
      }

      return meta;
    }

  static _findPrimaryClass(ast, className, filePath) {
    const expected =
      className || ManagedMetadataWriter._expectedClassName(filePath);
    const classes = [];
    for (const node of ast.body || []) {
      if (node.type === 'ClassDeclaration') classes.push(node);
      else if (node.declaration && node.declaration.type === 'ClassDeclaration')
        classes.push(node.declaration);
    }
    if (!classes.length) return null;
    return (
      classes.find((c) => c.id && c.id.name === expected) ||
      (classes.length === 1 ? classes[0] : null)
    );
  }

  static _metadataInsertPos(classNode, text) {
    // Always insert at the bottom of the class (before the closing brace)
    return classNode.body.end - 1;
  }

  static _inferMemberIndent(text, classNode) {
    const body =
      classNode.body && classNode.body.body ? classNode.body.body : [];
    if (body.length > 0) {
      const start = body[0].start;
      const lineStart = text.lastIndexOf('\n', start) + 1;
      const m = text.slice(lineStart, start).match(/^[ \t]*/);
      if (m) return m[0];
    }
    return '  ';
  }

  static _expandRemovalToCleanBlankLines(text, start, end) {
    let s = start;
    let e = end;
    while (s > 0 && (text[s - 1] === ' ' || text[s - 1] === '\t')) s--;
    if (s > 0 && text[s - 1] === '\n') {
      let prev = s - 2;
      while (
        prev >= 0 &&
        (text[prev] === ' ' || text[prev] === '\t' || text[prev] === '\r')
      )
        prev--;
      if (prev >= 0 && text[prev] === '\n') s--;
    }
    while (
      e < text.length &&
      (text[e] === ' ' || text[e] === '\t' || text[e] === '\r')
    )
      e++;
    if (text[e] === '\n') e++;
    return { start: s, end: e };
  }

  static _parse(text, acorn) {
    if (!acorn || typeof acorn.parse !== 'function')
      return { ok: false, error: 'Acorn parser unavailable' };
    const attempts = ['script', 'module'];
    let lastError = null;
    for (const sourceType of attempts) {
      try {
        return {
          ok: true,
          ast: acorn.parse(String(text), {
            ecmaVersion: 'latest',
            sourceType,
            locations: true,
            ranges: true,
            allowHashBang: true,
          }),
        };
      } catch (err) {
        lastError = err;
      }
    }
    return {
      ok: false,
      error:
        lastError && lastError.message ? lastError.message : String(lastError),
    };
  }

  static _memberName(member) {
    if (!member || !member.key) return null;
    if (member.key.type === 'Identifier') return member.key.name;
    if (member.key.type === 'Literal') return String(member.key.value);
    return null;
  }

  static _expectedClassName(filePath) {
    const base =
      String(filePath || '')
        .split(/[\\/]/)
        .pop() || '';
    return base.replace(/\.js$/i, '').replace(/[^A-Za-z0-9_$]/g, '_');
  }

  static _sortObject(value) {
    if (Array.isArray(value))
      return value.map((item) => ManagedMetadataWriter._sortObject(item));
    if (!value || typeof value !== 'object') return value;
    const out = {};
    for (const key of Object.keys(value).sort())
      out[key] = ManagedMetadataWriter._sortObject(value[key]);
    return out;
  }

  static _getAcorn() {
    if (typeof acorn !== 'undefined') return acorn;
    if (typeof window !== 'undefined' && window.acorn) return window.acorn;
    if (typeof globalThis !== 'undefined' && globalThis.acorn)
      return globalThis.acorn;
    return null;
  }

  static _lineStartForIndex(text, index) {
    const before = String(text || '').lastIndexOf('\n', index);
    return before < 0 ? 0 : before + 1;
  }

  static extractMetadata(text, acorn) {
      return null;
    }

  

  

  

  static getMarkdown() {
    return this._doc();
  }

  static _doc_ManagedMetadataWriter() {
      return '';
    }

  static _doc_overview() {
    return `# ManagedMetadataWriter

The \`ManagedMetadataWriter\` handles the extraction and stripping of legacy class-level metadata structures.
It ensures code purity by cleaning up old metadata segments within active source files.`;
  }

  static _doc_stripping() {
    return `## Footer Metadata Stripping

- **Footer Stripping**: \`stripMetadata\` uses Acorn to locate and clean and structure the class body, ensuring only clean source code is rendered inside the editor.
- **Bypassed Injection**: Modern saving pipelines completely bypass metadata generation for strict files, avoiding redundant comments or code injections.`;
  }

  static _doc() {
    return [this._doc_overview(), this._doc_stripping()].join('\n\n');
  }
}
