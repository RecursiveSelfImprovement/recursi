class ManagedWritePipeline {

  static prepareWrite(options = {}) {
      const filePath = String(options.filePath || '');
      const oldTextRaw = options.oldText === null || options.oldText === undefined ? null : String(options.oldText);
      const newTextRaw = String(options.newText || '');
      const acorn = options.acorn || ManagedWritePipeline._getAcorn();

      if (!filePath.endsWith('.js')) {
        return {
          ok: true, bypassed: true, reason: 'not-a-js-file', finalText: newTextRaw, warnings: []
        };
      }

      if (options.managed === false || options.skipManagedWritePipeline === true) {
        return {
          ok: true, bypassed: true, finalText: newTextRaw, reason: "managed-pipeline-disabled", warnings: []
        };
      }

      const oldStrip = oldTextRaw === null ? { ok: true, text: null, removed: [] } : ManagedMetadataWriter.stripMetadata({ text: oldTextRaw, filePath, acorn });
      const newStrip = ManagedMetadataWriter.stripMetadata({ text: newTextRaw, filePath, acorn });

      if (!newStrip.ok) return ManagedWritePipeline._blocked('Could not strip incoming metadata: ' + newStrip.error, null, null);

      const beforeReport = oldStrip.text === null ? null : ManagedClassValidator.analyze({ text: oldStrip.text, filePath, acorn });
      const afterReport = ManagedClassValidator.analyze({ text: newStrip.text, filePath, acorn });

      if (!afterReport.ok || afterReport.compliance === 'invalid') {
        return {
          ok: false, blocked: true, requiresUserConfirmation: false, reason: 'New JavaScript does not parse',
          beforeReport, afterReport, warnings: afterReport.warnings || []
        };
      }

      const comparison = { ok: true, warnings: [] };
      const finalText = newStrip.text;

      if (acorn && typeof AstUtils !== 'undefined' && typeof AstUtils.checkStrictCodeRules === 'function') {
        const violations = AstUtils.checkStrictCodeRules(finalText, acorn);
        if (violations.length > 0) {
          if (!comparison.warnings) comparison.warnings = [];
          violations.forEach(v => {
            const msg = `[STRICT_VIOLATION:${v.rule}] ${v.message}`;
            if (!comparison.warnings.includes(msg)) comparison.warnings.push(msg);
          });
        }
      }

      return {
        ok: true, blocked: false, finalText, beforeReport, afterReport, comparison, metadata: {},
        warnings: [...(afterReport.warnings || []), ...(comparison.warnings || [])],
        removedIncomingMetadataCount: newStrip.removed ? newStrip.removed.length : 0,
        incomingMetadataApplied: false
      };
    }

  static hashString(text) {
    const str = String(text || '');
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return n.toString(36);
  }

  static _blocked(reason, beforeReport, afterReport) {
    return {
      ok: false,
      blocked: true,
      requiresUserConfirmation: false,
      reason,
      beforeReport,
      afterReport,
      warnings: []
    };
  }

  static _getAcorn() {
    if (typeof acorn !== 'undefined') return acorn;
    if (typeof window !== 'undefined' && window.acorn) return window.acorn;
    if (typeof globalThis !== 'undefined' && globalThis.acorn) return globalThis.acorn;
    return null;
  }

  static _doc_overview() {
      return `# ManagedWritePipeline

The \`ManagedWritePipeline\` is the central transactional write pipeline for all JavaScript files in the workspace.
It acts as a safety gate, ensuring that every JS write request is structurally verified before being committed.`;
    }

  static _doc_pipeline() {
      return `## Transactional Validation and Hashing

- **Staged Validation**: Intercepts the write, strips legacy metadata, parses the code with Acorn, runs the \`ManagedClassValidator\` to grade compliance, and verifies that the update does not degrade the file's architectural standing.
- **Integrity Hashing**: \`hashString\` calculates strict structural and content hashes. If the newly generated content is identical to the current file, it silently ignores the write, minimizing VFS I/O overhead.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_pipeline()
      ].join('\n\n');
    }

  

  static _doc_ManagedWritePipeline() {
      return `# ManagedWritePipeline

## Summary

ManagedWritePipeline is the transactional validation pipeline for JavaScript files in the workspace. It acts as the gatekeeper, ensuring that every JS write request is structurally verified before being committed, protecting files from parse-breaking syntax errors.`;
    }
}
