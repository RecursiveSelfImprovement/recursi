class ClientJSClassPatcher {
  
  static _getAcorn() {
    return typeof window !== 'undefined' && window.acorn ? window.acorn : null;
  }

  static _cleanMethodName(methodName) {
    if (!methodName) return '';
    return methodName.replace(/\s*\(.*/, '').trim();
  }

  static _findClassBody(src, className) {
    const acorn = ClientJSClassPatcher._getAcorn();
    if (!acorn) throw new Error('Acorn AST parser not available.');

    const { ast, error } = AstUtils.parseCode(acorn, src);
    if (error || !ast) throw new Error(`AST Parse Error: ${error}`);

    for (const node of ast.body) {
      let classNode = null;
      if (node.type === 'ClassDeclaration' && node.id?.name === className) {
        classNode = node;
      } else if (
        node.type === 'ExportNamedDeclaration' &&
        node.declaration?.type === 'ClassDeclaration' &&
        node.declaration.id?.name === className
      ) {
        classNode = node.declaration;
      } else if (
        node.type === 'ExportDefaultDeclaration' &&
        node.declaration?.type === 'ClassDeclaration' &&
        node.declaration.id?.name === className
      ) {
        classNode = node.declaration;
      }
      if (classNode) {
        const start = classNode.body.start;
        const end = classNode.body.end;
        return { start, end, bodyStart: start + 1, bodyEnd: end - 1 };
      }
    }
    return null;
  }

  static _findMethodInSource(src, methodName, options = {}) {
    let cleanMethodName = ClientJSClassPatcher._cleanMethodName(methodName);
    
    let targetKind = options.kind;
    let targetStatic = options.isStatic;

    // Detect prefixed signatures
    if (cleanMethodName.startsWith('static ')) {
      targetStatic = true;
      cleanMethodName = cleanMethodName.substring(7).trim();
    }
    if (cleanMethodName.startsWith('get ')) {
      targetKind = 'get';
      cleanMethodName = cleanMethodName.substring(4).trim();
    } else if (cleanMethodName.startsWith('set ')) {
      targetKind = 'set';
      cleanMethodName = cleanMethodName.substring(4).trim();
    }

    const acorn = ClientJSClassPatcher._getAcorn();
    if (!acorn) throw new Error('Acorn AST parser not available.');

    const matchMethod = (member, offset = 0, comments = [], codeText = '') => {
      if (AstUtils.getClassMemberName(member) === cleanMethodName) {
        if (targetStatic !== undefined && member.static !== targetStatic) return null;
        if (targetKind !== undefined && member.kind !== targetKind) return null;

        let start = member.start;
        
        // Shift the effective range backwards if JSDoc comments should be swept up with the block
        if (options.includeComments && comments.length > 0 && codeText) {
          start = AstUtils.findEffectiveStart(member, comments, codeText, 0);
        }

        const absStart = start - offset;
        const absEnd = member.end - offset;
        let keyStart, keyEnd;
        if (member.key) {
          keyStart = member.key.start - offset;
          keyEnd = member.key.end - offset;
        }

        // CRITICAL FIX: Source slicing must be based on the raw `src` string using `start`
        // without subtracting `offset`, because `src` is what we are slicing! 
        // We only return `absStart` relative for the caller.
        let source = src.slice(start, member.end);
        
        if (!options.includeComments) {
          source = source.trim();
        }

        return {
          source,
          start: Math.max(0, absStart),
          end: absEnd,
          keyStart,
          keyEnd,
          isStatic: member.static,
          kind: member.kind,
        };
      }
      return null;
    };

    // 1. Try treating it as a raw class body (for partial method donor snippets)
    if (!options.className) {
      try {
        const prefix = 'class _D_ extends Object {\n';
        const wrapped = prefix + src + '\n}';
        const offset = prefix.length;
        const { ast, error, comments } = AstUtils.parseCode(acorn, wrapped);
        if (!error && ast && ast.body[0]?.type === 'ClassDeclaration') {
          for (const member of ast.body[0].body.body) {
            const match = matchMethod(member, offset, comments, wrapped);
            if (match) return match;
          }
        }
      } catch (e) {}
    }

    // 2. Try treating it as a full file source
    const { ast, error, comments } = AstUtils.parseCode(acorn, src);
    if (!error && ast) {
      for (const node of ast.body) {
        let classNode = null;
        if (node.type === 'ClassDeclaration') classNode = node;
        else if (node.declaration?.type === 'ClassDeclaration')
          classNode = node.declaration;
        else if (
          node.type === 'ExportDefaultDeclaration' &&
          node.declaration?.type === 'ClassDeclaration'
        )
          classNode = node.declaration;

        if (classNode) {
          // Narrow class scope to prevent multi-class cross-contamination 
          if (options.className && classNode.id?.name !== options.className) {
            continue;
          }
          for (const member of classNode.body.body) {
            const match = matchMethod(member, 0, comments, src);
            if (match) return match;
          }
        }
      }
    }

    return null;
  }

  

  static deleteMethod(env, options) {
      const {
        targetFile, targetClass, methodName, isStatic, kind,
        allowComplianceDowngrade = false, managed = true,
        skipManagedWritePipeline = false, threadId = null, commentId = null
      } = options;

      const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher || ClientJSClassPatcher;
      const destMethod = CJCP._cleanMethodName(methodName);

      const targetContent = env.readFile(targetFile);
      if (!targetContent) return { ok: false, error: 'Target file not found: ' + targetFile };

      const classBody = CJCP._findClassBody(targetContent, targetClass);
      if (!classBody) return { ok: false, error: 'Target class not found: ' + targetClass };

      const innerContent = targetContent.slice(classBody.bodyStart, classBody.bodyEnd);
      const existing = CJCP._findMethodInSource(innerContent, destMethod, { isStatic, kind });

      if (!existing) return { ok: false, error: 'Method not found to delete: ' + destMethod };

      const absStart = classBody.bodyStart + existing.start;
      const absEnd = classBody.bodyStart + existing.end;
      const newContent = targetContent.slice(0, absStart) + targetContent.slice(absEnd);

      const prepared = CJCP._prepareManagedWrite(env, {
        targetFile, before: targetContent, candidateText: newContent,
        operation: "ClientJSClassPatcher.deleteMethod", allowComplianceDowngrade, managed, skipManagedWritePipeline, threadId, commentId
      });

      if (!prepared.ok) return { ok: false, error: prepared.error || prepared.reason || "Managed write blocked.", managed: prepared };

      const finalContent = prepared.finalText || newContent;

      if (env.appRef?.historyManager) {
          env.appRef.historyManager.recordMethodChange({
              path: targetFile,
              className: targetClass,
              methodName: destMethod,
              content: existing.source,
              oldContent: existing.source,
              fullContent: finalContent,
              fullOldContent: targetContent,
              action: 'delete'
          });
      }

      env.writeFile(targetFile, finalContent);
      return {
        ok: true, method: destMethod, action: 'deleted', targetFile, targetClass,
        managed: { ok: true, bypassed: !!prepared.bypassed, compliance: prepared.afterReport && prepared.afterReport.compliance, warnings: prepared.warnings || [] }
      };
    }

  

  static readMethod(env, options) {
    const { targetFile, targetClass, methodName, isStatic, kind } = options;
    const cleanMethodName = ClientJSClassPatcher._cleanMethodName(methodName);
    const content = env.readFile(targetFile);
    if (!content) return null;
    const classBody = ClientJSClassPatcher._findClassBody(content, targetClass);
    if (!classBody) return null;
    const found = ClientJSClassPatcher._findMethodInSource(
      content.slice(classBody.bodyStart, classBody.bodyEnd),
      cleanMethodName,
      { isStatic, kind }
    );
    return found ? { source: found.source } : null;
  }

  static _listAllClasses(src) {
    const acorn = ClientJSClassPatcher._getAcorn();
    if (!acorn) return [];
    try {
      const { ast, error } = AstUtils.parseCode(acorn, src);
      if (!error && ast) {
        const classes = [];
        for (const node of ast.body) {
          if (node.type === 'ClassDeclaration' && node.id?.name)
            classes.push(node.id.name);
          else if (
            node.type === 'ExportNamedDeclaration' &&
            node.declaration?.type === 'ClassDeclaration' &&
            node.declaration.id?.name
          )
            classes.push(node.declaration.id.name);
          else if (
            node.type === 'ExportDefaultDeclaration' &&
            node.declaration?.type === 'ClassDeclaration' &&
            node.declaration.id?.name
          )
            classes.push(node.declaration.id.name);
        }
        return classes;
      }
    } catch (e) {}
    return [];
  }

  static _listClassMethods(src, className) {
    const classBody = ClientJSClassPatcher._findClassBody(src, className);
    if (!classBody) return [];
    const acorn = ClientJSClassPatcher._getAcorn();
    if (!acorn) return [];
    try {
      const body = src.slice(classBody.bodyStart, classBody.bodyEnd);
      const wrapped = 'class _D_ {' + body + '}';
      const { ast, error } = AstUtils.parseCode(acorn, wrapped);
      if (!error && ast) {
        const classNode = ast.body[0];
        if (classNode?.type === 'ClassDeclaration') {
          return classNode.body.body
            .map((m) => {
              const name = AstUtils.getClassMemberName(m);
              if (!name || name.startsWith('#')) return null;
              let sig = name;
              if (m.kind === 'get' || m.kind === 'set') sig = `${m.kind} ${sig}`;
              if (m.static) sig = `static ${sig}`;
              return sig;
            })
            .filter(Boolean);
        }
      }
    } catch (e) {}
    return [];
  }

  static _prepareManagedWrite(env, options = {}) {
    const targetFile = options.targetFile || options.filePath || "";
    const before = String(options.before || "");
    const candidate = String(options.candidateText || options.after || "");

    if (!targetFile.endsWith(".js")) {
      return {
        ok: true,
        bypassed: true,
        finalText: candidate,
        reason: "not-a-js-file"
      };
    }

    if (options.managed === false || options.skipManagedWritePipeline === true) {
      return {
        ok: true,
        bypassed: true,
        finalText: candidate,
        reason: "managed-pipeline-disabled"
      };
    }

    const pipeline =
      typeof ManagedWritePipeline !== "undefined"
        ? ManagedWritePipeline
        : (typeof globalThis !== "undefined" ? globalThis.ManagedWritePipeline : null);

    const acornInstance =
      typeof window !== "undefined" && window.acorn
        ? window.acorn
        : (typeof acorn !== "undefined" ? acorn : null);

    if (!pipeline || typeof pipeline.prepareWrite !== "function") {
      return {
        ok: false,
        blocked: true,
        error: "ManagedWritePipeline is not loaded in browser globals.",
        reason: "managed-pipeline-unavailable"
      };
    }

    if (!acornInstance) {
      return {
        ok: false,
        blocked: true,
        error: "Acorn is not loaded in browser globals.",
        reason: "acorn-unavailable"
      };
    }

    const prepared = pipeline.prepareWrite({
      oldText: before,
      newText: candidate,
      filePath: ClientJSClassPatcher._normalizeManagedFilePath(targetFile),
      acorn: acornInstance,
      incomingMetadata: options.incomingMetadata || null,
      system: "vibes",
      actor: "llm",
      operation: options.operation || "ClientJSClassPatcher.write",
      threadId: options.threadId || null,
      commentId: options.commentId || null,
      allowComplianceDowngrade: !!options.allowComplianceDowngrade
    });

    if (!prepared || !prepared.ok) {
      return {
        ok: false,
        blocked: true,
        error: prepared && prepared.reason ? prepared.reason : "Managed write blocked.",
        reason: prepared && prepared.reason ? prepared.reason : "managed-write-blocked",
        managedResult: prepared
      };
    }

    if (prepared.ok && acornInstance && typeof AstUtils !== 'undefined' && typeof AstUtils.checkStrictCodeRules === 'function') {
      const violations = AstUtils.checkStrictCodeRules(candidate, acornInstance);
      const metaMatch = candidate.match(/static\s+getMetadata\s*\(\s*\)\s*\{[\s\S]*?return\s*(\{[\s\S]*?\});\s*\}/);
      let allowedRules = [];
      if (metaMatch) {
        try {
          const metaObj = new Function(`return ${metaMatch[1]}`)();
          allowedRules = metaObj.permissions || [];
        } catch(e) {}
      }
      
      const activeViolations = violations.filter(v => !allowedRules.includes(v.rule));
      if (activeViolations.length > 0) {
        if (!prepared.warnings) prepared.warnings = [];
        activeViolations.forEach(v => {
          const msg = `[STRICT_VIOLATION:${v.rule}] ${v.message}`;
          if (!prepared.warnings.includes(msg)) prepared.warnings.push(msg);
        });
      }
    }

    if (env && typeof env.log === "function") {
      env.log("[ClientJSClassPatcher] managed write prepared", {
        targetFile,
        operation: options.operation || "ClientJSClassPatcher.write",
        compliance: prepared.afterReport && prepared.afterReport.compliance,
        warnings: prepared.warnings || [],
        incomingMetadata: !!options.incomingMetadata
      });
    } else if (env && Array.isArray(env.logs)) {
      env.logs.push(
        "[ClientJSClassPatcher] managed write prepared: " +
          targetFile +
          " / " +
          (prepared.afterReport && prepared.afterReport.compliance)
      );
    }

    return prepared;
  }

  static _normalizeManagedFilePath(path) {
    const raw = String(path || "").replace(/\\/g, "/");
    if (raw.startsWith("/")) return raw.slice(1);
    return raw;
  }

  

}