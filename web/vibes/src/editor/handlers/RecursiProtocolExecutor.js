class RecursiProtocolExecutor {

  constructor(app) {
      this.app = app;
    }

  static detect(text) {
      if (!text) return false;
      return /\b(?:async\s+)?function\s+run\s*\(/.test(text);
    }

  static _extractCodeBlock(text) {
      if (!text) return { error: new Error('Empty text') };

      text = text
        .replace(/\u00A0/g, ' ')
        .replace(/\u200B/g, '')
        .replace(/\u200C/g, '')
        .replace(/\u200D/g, '')
        .replace(/\uFEFF/g, '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2013|\u2014/g, '-');

      const acorn = typeof window !== 'undefined' && window.acorn ? window.acorn : null;
      if (!acorn) {
        console.error('[RecursiProtocol] acorn is not available');
        return { error: new Error('Acorn not available') };
      }

      let parseText = text.trim();
      let ast = null;
      let parseError = null;

      try {
        ast = acorn.parse(parseText, {
          ecmaVersion: 'latest',
          sourceType: 'module',
        });
      } catch (e) {
        parseError = e;
      }

      if (parseError) {
        return { error: parseError };
      }

      let hasRunFunction = false;

      for (const node of ast.body) {
        if (node.type === 'FunctionDeclaration' && node.id?.name === 'run') {
          hasRunFunction = true;
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration' && node.declaration.id?.name === 'run') {
          hasRunFunction = true;
        } else if (node.type === 'ExportDefaultDeclaration' && node.declaration?.type === 'FunctionDeclaration' && node.declaration.id?.name === 'run') {
          hasRunFunction = true;
        } else if (node.type === 'VariableDeclaration') {
          for (const decl of node.declarations) {
            if (decl.id?.name === 'run' && (decl.init?.type === 'ArrowFunctionExpression' || decl.init?.type === 'FunctionExpression')) {
              hasRunFunction = true;
            }
          }
        }
      }

      if (hasRunFunction) {
        return {
          code: parseText,
          hasRunFunction: true
        };
      }

      return { error: new Error('No top-level run function found by acorn') };
    }

  _appendOutput(text) {
      try {
        if (
          this.app && this.app.uiManager &&
          typeof this.app.uiManager.showInOutputTab === 'function'
        ) {
          this.app.uiManager.showInOutputTab(text);
          return;
        }
      } catch (e) {
        console.error('[RecursiProtocol] _appendOutput error:', e);
      }
      console.log(text);
    }

  async execute(text, options = {}) {
      const requireReview = options.review !== false;
      const block = RecursiProtocolExecutor._extractCodeBlock(text);

      if (!block || block.error) {
        this._appendOutput('[RecursiProtocol] No valid run function found: ' + (block?.error?.message || ''));
        return { ok: false, error: block?.error, reason: 'No valid run function found' };
      }

      const { code } = block;

      let fileStore = this.app.inMemoryFileStore;
      if (!fileStore) {
        fileStore = new Map();
      }

      const appRef = this.app;
      const projectName = this.app.projectName || 'project';
      const projectRoot = '/' + projectName;
      
      const EnvClass = typeof VibesEnv !== 'undefined' ? VibesEnv : window.VibesEnv;
      const env = new EnvClass({ appRef, fileStore, projectRoot, code });

      let executionError = null;

      try {
        let safeCode = code.replace(/\bexport\s+default\s+function\b/g, 'function')
                           .replace(/\bexport\s+function\b/g, 'function')
                           .replace(/\bexport\s+default\s+class\b/g, 'class')
                           .replace(/\bexport\s+class\b/g, 'class')
                           .replace(/\bexport\s+(const|let|var)\b/g, '$1');

        let functionBody = safeCode + '\n';
        functionBody += 'return (async function() {\n';
        functionBody += '  if (typeof run !== "function") throw new Error("run function is not defined after eval");\n';
        functionBody += '  var r_res = run(env);\n';
        functionBody += '  if (r_res && typeof r_res.then === "function") await r_res;\n';
        functionBody += '})();';

        const fn = new Function('env', functionBody);
        const result = fn(env);
        if (result && typeof result.then === 'function') await result;
      } catch (e) {
        env.log('[RecursiProtocol Error] ' + e.message);
        if (e.stack) env.log(e.stack);
        executionError = e;
      }

      const changedArray = env.changedFiles;
      const output = env.logs.length ? env.logs.join('\n') : '(ok - no output)';

      if (executionError) {
        this._appendOutput('[RecursiProtocol] ❌ EXECUTION FAILED in run()\n' + output);
        return { ok: false, executionError };
      }

      if (changedArray.length === 0) {
        this._appendOutput('[RecursiProtocol] run()\n' + output);
        return true;
      }

      const unifiedInstance = new UnifiedProtocolExecutor(this.app);
      const plans = unifiedInstance._generatePlansFromChanges(changedArray);

      const applyPlans = async (approvedPlans) => {
        const changeSummary = unifiedInstance._buildChangeSummary(changedArray);
        const outputWithChanges = changeSummary ? output + '\n\n' + changeSummary : output;
        this._appendOutput('[RecursiProtocol] run()\n' + outputWithChanges);

        const plansToDelegate = [];
        const filesToDelete = [];
        for (const p of approvedPlans) {
          if (p.action === 'delete') filesToDelete.push(p.file);
          else plansToDelegate.push(p);
        }
        if (plansToDelegate.length > 0) {
          await appRef.actionHandler.applyPastePlans(plansToDelegate);
        }
        for (const path of filesToDelete) {
          try {
            if (appRef.vfs) await appRef.vfs.deleteFile(path, { skipHistory: false });
            if (appRef.projectFilesManager?.removeNode) appRef.projectFilesManager.removeNode(path);
            this._appendOutput('[RecursiProtocol] ✅ Deleted file ' + path);
          } catch (err) {
            this._appendOutput('[RecursiProtocol] ❌ Error deleting file ' + path + ': ' + err.message);
          }
        }
        if (appRef.actionHandler && typeof appRef.actionHandler.handleSaveAllFiles === 'function') {
          await appRef.actionHandler.handleSaveAllFiles();
        }
      };

      if (requireReview) {
        return new Promise((resolve) => {
          new PasteReviewDialog(plans, this.app, async (approvedPlans) => {
            await applyPlans(approvedPlans);
            resolve(true);
          });
        });
      } else {
        await applyPlans(plans);
        return true;
      }
    }

}
