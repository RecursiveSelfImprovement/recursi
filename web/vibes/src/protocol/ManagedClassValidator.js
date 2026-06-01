class ManagedClassValidator {
  static analyze(options = {}) {
      const text = String(options.text || '');
      const filePath = String(options.filePath || '');
      const acorn = options.acorn || ManagedClassValidator._getAcorn();
      const report = ManagedClassValidator._emptyReport(filePath, text);

      if (!filePath.endsWith('.js')) {
        report.compliance = 'generic';
        report.warnings.push('not-a-js-file');
        return report;
      }

      if (!acorn || typeof acorn.parse !== 'function') {
        report.ok = false;
        report.compliance = 'invalid';
        report.astHealth.parses = false;
        report.astHealth.parseError = 'Acorn parser unavailable';
        report.errors.push('acorn-unavailable');
        return report;
      }

      let parsed = ManagedClassValidator.parse(text, acorn);
      if (!parsed.ok) {
        report.ok = false;
        report.compliance = 'invalid';
        report.astHealth.parses = false;
        report.astHealth.parseError = parsed.error;
        report.errors.push('parse-error');
        return report;
      }

      const ast = parsed.ast;
      const topNodes = ast.body || [];
      report.importCount = topNodes.filter((n) => n.type === 'ImportDeclaration').length;
      report.exportCount = topNodes.filter((n) => /^Export/.test(n.type)).length;

      const classNodes = ManagedClassValidator._topLevelClassNodes(topNodes);
      report.classCount = classNodes.length;
      report.classNames = classNodes.map((c) => c.id && c.id.name).filter(Boolean);

      const expected = ManagedClassValidator.expectedClassName(filePath);
      report.expectedClassName = expected;
      const primary = ManagedClassValidator._choosePrimaryClass(classNodes, expected, options.previousMetadata);

      if (!primary) {
        report.compliance = 'generic';
        report.warnings.push('no-primary-class');
        return report;
      }

      report.primaryClassName = primary.id && primary.id.name ? primary.id.name : null;
      report.primaryClassRange = { start: primary.start, end: primary.end };
      report.methodCount = ManagedClassValidator._classMethodCount(primary);

      report.hasConstructor = ManagedClassValidator._classHasConstructor(primary);
      report.provides = report.primaryClassName ? [report.primaryClassName] : [];

      const topLevelLoose = [];
      const allowedTopLevel = [];

      for (const node of topNodes) {
        if (ManagedClassValidator._isWrapperForClass(node, primary)) continue;
        if (ManagedClassValidator._isIgnorableDirective(node)) continue;
        if (ManagedClassValidator._isAllowedPrimaryExportNode(node, report.primaryClassName)) {
          allowedTopLevel.push(node);
          continue;
        }
        topLevelLoose.push(node);
      }

      report.allowedTopLevelNodeCount = allowedTopLevel.length;
      report.allowedTopLevelKinds = [...new Set(allowedTopLevel.map((n) => n.type))];
      report.looseTopLevelNodeCount = topLevelLoose.length;
      report.looseTopLevelKinds = [...new Set(topLevelLoose.map((n) => n.type))];

      const classBodyProblems = ManagedClassValidator._classBodyProblems(primary);
      report.classBodyProblemCount = classBodyProblems.length;
      report.classBodyProblemKinds = [...new Set(classBodyProblems.map((n) => n.type))];

      if (report.primaryClassName !== expected) {
        report.warnings.push('class-name-does-not-match-file');
      }
      if (report.importCount > 0) report.warnings.push('has-import-statements');
      if (report.exportCount > 0) report.warnings.push('has-export-statements');
      if (report.looseTopLevelNodeCount > 0) report.warnings.push('has-loose-top-level-nodes');
      if (report.classBodyProblemCount > 0) report.warnings.push('class-body-has-non-method-members');
      if (classNodes.length !== 1) report.warnings.push('class-count-is-not-one');

      const isStrict =
        report.astHealth.parses &&
        classNodes.length === 1 &&
        report.primaryClassName === expected &&
        report.importCount === 0 &&
        report.exportCount === 0 &&
        report.looseTopLevelNodeCount === 0 &&
        report.classBodyProblemCount === 0;

      if (isStrict) report.compliance = 'strict';
      else if (report.primaryClassName) report.compliance = 'loose';
      else report.compliance = 'generic';

      return report;
    }

  static compareCompliance(options = {}) {
    const beforeReport = options.beforeReport || null;
    const afterReport = options.afterReport || null;
    const allowDowngrade = !!options.allowComplianceDowngrade;
    const beforeRank = ManagedClassValidator.complianceRank(beforeReport && beforeReport.compliance);
    const afterRank = ManagedClassValidator.complianceRank(afterReport && afterReport.compliance);
    const warnings = [];

    if (!beforeReport || !afterReport) {
      return { ok: true, downgrade: false, severity: 'none', warnings };
    }

    if (beforeReport.primaryClassName && afterReport.primaryClassName && beforeReport.primaryClassName !== afterReport.primaryClassName) {
      warnings.push('primary-class-renamed');
    }
    if (beforeReport.primaryClassName && !afterReport.primaryClassName) {
      warnings.push('primary-class-removed');
    }
    if (beforeReport.compliance === 'strict' && afterReport.importCount > 0) {
      warnings.push('strict-file-gained-imports');
    }
    if (beforeReport.compliance === 'strict' && afterReport.exportCount > 0) {
      warnings.push('strict-file-gained-exports');
    }
    if (beforeReport.compliance === 'strict' && afterReport.looseTopLevelNodeCount > 0) {
      warnings.push('strict-file-gained-loose-top-level-nodes');
    }

    const downgrade = afterRank < beforeRank;
    const severe = afterRank === 0 || warnings.includes('primary-class-removed');
    const dangerous = downgrade || warnings.includes('primary-class-renamed') || warnings.includes('primary-class-removed');

    if (dangerous && !allowDowngrade) {
      return {
        ok: false,
        downgrade,
        severity: severe ? 'error' : 'warning',
        from: beforeReport.compliance,
        to: afterReport.compliance,
        reason: downgrade
          ? 'Compliance downgrade ' + beforeReport.compliance + ' -> ' + afterReport.compliance
          : warnings[0],
        requiresUserConfirmation: true,
        warnings
      };
    }

    return {
      ok: true,
      downgrade,
      severity: downgrade ? 'warning' : 'none',
      from: beforeReport.compliance,
      to: afterReport.compliance,
      requiresUserConfirmation: false,
      warnings
    };
  }

  static complianceRank(value) {
    if (value === 'strict') return 3;
    if (value === 'loose') return 2;
    if (value === 'generic') return 1;
    return 0;
  }

  static parse(text, acorn) {
    const attempts = [
      { sourceType: 'script' },
      { sourceType: 'module' }
    ];
    let lastError = null;
    for (const attempt of attempts) {
      try {
        return {
          ok: true,
          ast: acorn.parse(String(text), {
            ecmaVersion: 'latest',
            sourceType: attempt.sourceType,
            locations: true,
            ranges: true,
            allowHashBang: true
          }),
          sourceType: attempt.sourceType
        };
      } catch (err) {
        lastError = err;
      }
    }
    return { ok: false, error: lastError && lastError.message ? lastError.message : String(lastError) };
  }

  static expectedClassName(filePath) {
    const base = String(filePath || '').split(/[\\/]/).pop() || '';
    return base.replace(/\.js$/i, '').replace(/[^A-Za-z0-9_$]/g, '_');
  }

  static _emptyReport(filePath, text) {
      return {
        ok: true,
        filePath,
        fileName: String(filePath || '').split(/[\\/]/).pop() || '',
        expectedClassName: ManagedClassValidator.expectedClassName(filePath),
        compliance: 'generic',
        primaryClassName: null,
        primaryClassRange: null,
        classCount: 0,
        classNames: [],
        importCount: 0,
        exportCount: 0,
        looseTopLevelNodeCount: 0,
        looseTopLevelKinds: [],
        classBodyProblemCount: 0,
        classBodyProblemKinds: [],
        methodCount: 0,
        hasConstructor: false,
        dependencies: [],
        provides: [],
        warnings: [],
        errors: [],
        astHealth: { parses: true, parseError: null },
        bytes: String(text || '').length,
        lineCount: String(text || '').length ? String(text || '').split(/\r?\n/).length : 0
      };
    }

  static _topLevelClassNodes(topNodes) {
    const classes = [];
    for (const node of topNodes || []) {
      if (node.type === 'ClassDeclaration') classes.push(node);
      else if (node.declaration && node.declaration.type === 'ClassDeclaration') classes.push(node.declaration);
    }
    return classes;
  }

  static _choosePrimaryClass(classNodes, expected, previousMetadata) {
    if (!classNodes.length) return null;
    const byExpected = classNodes.find((c) => c.id && c.id.name === expected);
    if (byExpected) return byExpected;
    const previousName = previousMetadata && (previousMetadata.primaryClassName || previousMetadata.symbol);
    if (previousName) {
      const byPrevious = classNodes.find((c) => c.id && c.id.name === previousName);
      if (byPrevious) return byPrevious;
    }
    if (classNodes.length === 1) return classNodes[0];
    return null;
  }

  static _isWrapperForClass(node, primary) {
    if (!node || !primary) return false;
    if (node === primary) return true;
    if (node.declaration === primary) return true;
    return false;
  }

  static _isIgnorableDirective(node) {
    return node && node.type === 'ExpressionStatement' && node.expression && node.expression.type === 'Literal' && typeof node.expression.value === 'string';
  }

  static _classMethodCount(classNode) {
    const body = classNode && classNode.body && classNode.body.body ? classNode.body.body : [];
    return body.filter((member) => ManagedClassValidator._isClassMethodLike(member)).length;
  }

  

  static _classHasConstructor(classNode) {
    const body = classNode && classNode.body && classNode.body.body ? classNode.body.body : [];
    return body.some((member) => ManagedClassValidator._memberName(member) === 'constructor');
  }

  static _classBodyProblems(classNode) {
    const body = classNode && classNode.body && classNode.body.body ? classNode.body.body : [];
    return body.filter((member) => !ManagedClassValidator._isClassMethodLike(member));
  }

  static _isClassMethodLike(member) {
    if (!member) return false;
    if (member.type === 'MethodDefinition') return true;
    if (member.type === 'PropertyDefinition' && member.value && (member.value.type === 'ArrowFunctionExpression' || member.value.type === 'FunctionExpression')) return true;
    return false;
  }

  static _memberName(member) {
    if (!member || !member.key) return null;
    if (member.key.type === 'Identifier') return member.key.name;
    if (member.key.type === 'Literal') return String(member.key.value);
    return null;
  }

  static _getAcorn() {
    if (typeof acorn !== 'undefined') return acorn;
    if (typeof window !== 'undefined' && window.acorn) return window.acorn;
    if (typeof globalThis !== 'undefined' && globalThis.acorn) return globalThis.acorn;
    return null;
  }


  static _isAllowedPrimaryExportNode(node, primaryClassName) {
    if (!node || !primaryClassName) return false;
    if (node.type !== 'ExpressionStatement') return false;

    const expr = node.expression;
    if (!expr || expr.type !== 'AssignmentExpression' || expr.operator !== '=') return false;

    const right = expr.right;
    if (!right || right.type !== 'Identifier' || right.name !== primaryClassName) return false;

    const left = expr.left;
    if (!left || left.type !== 'MemberExpression') return false;

    const leftText = ManagedClassValidator._memberExpressionPath(left).join('.');

    if (leftText === 'module.exports') return true;
    if (leftText === 'exports.' + primaryClassName) return true;
    if (leftText === 'window.' + primaryClassName) return true;
    if (leftText === 'globalThis.' + primaryClassName) return true;
    if (leftText === 'self.' + primaryClassName) return true;

    return false;
  }


  static _memberExpressionPath(node) {
    if (!node) return [];

    if (node.type === 'Identifier') return [node.name];
    if (node.type === 'ThisExpression') return ['this'];
    if (node.type === 'Literal') return [String(node.value)];

    if (node.type === 'MemberExpression') {
      const left = ManagedClassValidator._memberExpressionPath(node.object);
      let prop = null;

      if (node.property) {
        if (node.property.type === 'Identifier') prop = node.property.name;
        else if (node.property.type === 'Literal') prop = String(node.property.value);
      }

      if (prop === null) return left;
      return left.concat([prop]);
    }

    return [];
  }

  static _doc_overview() {
      return `# ManagedClassValidator

The \`ManagedClassValidator\` enforces the 'Pure Class Constraint' in Vibes (1 File = 1 Class = Exact Same Name, no top-level variables, no loose imports/exports).
It grades files based on their structural layouts to protect project integrity.`;
    }

  static _doc_validation() {
      return `## Compliance Grading and Downgrade Guarding

- **Compliance Grading**: Analyzes class ASTs and grades them as \`strict\`, \`loose\`, or \`generic\` depending on the presence of imports, exports, or non-method class members.
- **Downgrade Guarding**: \`compareCompliance\` compares a file's pre-save compliance report against its post-modification report. It identifies structural regressions (e.g. strict files gaining imports) and blocks the write unless explicitly authorized by the developer, preventing code rot.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_validation()
      ].join('\n\n');
    }

  

  static _doc_ManagedClassValidator() {
      return `# ManagedClassValidator

## Summary

ManagedClassValidator enforces the 'Pure Class Constraint' in Vibes (1 File = 1 Class = Exact Same Name, no top-level variables, no loose imports/exports). It grades files based on their structural layouts to protect project integrity, preventing structural regressions and code rot.`;
    }
}
