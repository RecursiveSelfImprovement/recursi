
class EditorDataHandler {
  constructor(controller, app) {
    this.controller = controller;
    this.app = app;
  }

  async getReconstructedCode(format = 'module') {
    const currentCode = this.controller.getCode();
    if (currentCode === null) {
      return null;
    }
    if (!this.controller.isStructuredJs) {
      return currentCode;
    }

    if (format === 'packed') {
      return currentCode;
    }

    // Strip existing imports from the editor code before reconstructing with the managed ones
    const metadataResult = this.controller.codeParser.parseForMetadata(
      currentCode,
      this.controller.filePath
    );

    if (
      metadataResult.error &&
      (!metadataResult.imports || metadataResult.imports.length === 0)
    ) {
      return currentCode;
    }

    // FIX: Capture the fresh imports and exports currently visible in the editor
    // so manual edits are preserved during reconstruction and sync with the controller.
    this.controller.imports = metadataResult.imports || [];
    if (metadataResult.exports && metadataResult.exports.length > 0) {
      this.controller.exports = metadataResult.exports;
    }

    const cleanBody = this.controller.codeParser.generateCleanBody(
      currentCode,
      metadataResult,
      { stripExports: false, stripImports: true }
    );

    return this._reconstructModuleFromMetadata(
      cleanBody,
      this.controller.imports
    );
  }

  async applyRecursiUpdate(plan) {
    const { controller } = this;

    // FIX: Get the reconstructed code FIRST. This forces getReconstructedCode
    // to run, which parses the live editor text and updates `controller.imports`
    // to match reality before we begin manipulating them.
    const originalCode = await controller.getReconstructedCode('module');

    let currentImports = [...controller.imports];
    let finalCode;

    if (plan.importAdditions?.length || plan.importDeletions?.length) {
      const importMap = new Map(currentImports.map((imp) => [imp.symbol, imp]));
      for (const add of plan.importAdditions || []) {
        if (!importMap.has(add.symbol)) {
          importMap.set(add.symbol, {
            symbol: add.symbol,
            source: add.path,
            kind: add.kind || 'named',
            local: add.local || add.symbol,
            imported: add.imported || add.symbol,
          });
        }
      }
      (plan.importDeletions || []).forEach((del) => {
        importMap.delete(del.symbol);
      });
      currentImports = Array.from(importMap.values());
    }

    const hasMemberChanges =
      plan.replacements?.length ||
      plan.additions?.length ||
      plan.deletions?.length;

    if (!hasMemberChanges) {
      if (originalCode === null) {
        throw new Error(
          'Surgical update failed: Could not get current code for import-only update.'
        );
      }
      const metadataResult = this.controller.codeParser.parseForMetadata(
        originalCode,
        controller.filePath
      );
      const cleanBody = this.controller.codeParser.generateCleanBody(
        originalCode,
        metadataResult,
        { stripExports: false, stripImports: true }
      );

      currentImports = this._autoResolveImports(cleanBody, currentImports);
      this.controller.imports = currentImports;

      finalCode = this._reconstructModuleFromMetadata(
        cleanBody,
        currentImports
      );
    } else {
      if (!originalCode || originalCode.trim() === '') {
        throw new Error(
          'Surgical update failed: The file content appears to be empty or is not loaded correctly.'
        );
      }

      let targetStructureName = plan.targetStructureName;
      if (!targetStructureName) {
        const pathObj = this.controller.app.createPath(controller.filePath);
        const fileName = pathObj.name;

        if (controller.exports.find((e) => e.name === fileName)) {
          targetStructureName = fileName;
        } else if (
          controller.exports.some((e) => e.type === 'ExportDefaultDeclaration')
        ) {
          const def = controller.exports.find(
            (e) => e.type === 'ExportDefaultDeclaration'
          );
          targetStructureName = def.name;
        } else {
          const classes = controller.exports.filter(
            (e) => e.kind === 'ClassDeclaration'
          );
          if (classes.length === 1) {
            targetStructureName = classes[0].name;
          } else {
            const objects = controller.exports.filter(
              (e) =>
                e.kind === 'VariableDeclaration' ||
                e.kind === 'ObjectExpression'
            );
            if (objects.length === 1) {
              targetStructureName = objects[0].name;
            }
          }
        }
      }

      const { ast, error } = AstUtils.parseCode(
        this.controller.codeParser.acorn,
        originalCode
      );
      if (error) {
        throw new Error(
          `Surgical update failed: Could not parse file. ${error}`
        );
      }

      if (!targetStructureName) {
        const topDecl = AstUtils.findTopLevelDeclaration(ast);
        if (topDecl && topDecl.name && !topDecl.name.startsWith('Anonymous')) {
          targetStructureName = topDecl.name;
        }
      }

      if (!targetStructureName) {
        throw new Error(
          `Surgical update failed: Could not automatically determine which class or object to update.`
        );
      }

      const structureInfo = AstUtils.findDeclarationByName(
        ast,
        targetStructureName
      );
      if (!structureInfo) {
        throw new Error(
          `Surgical update failed: Could not find target class/object '${targetStructureName}'.`
        );
      }
      const bodyNode =
        structureInfo.type === 'Class'
          ? structureInfo.node.body
          : structureInfo.node;
      const members = this.controller.codeParser.parseAndExtractMembers(
        originalCode.substring(bodyNode.start + 1, bodyNode.end - 1),
        structureInfo.type
      );
      const memberMap = new Map(members.map((m) => [m.name, m.code]));
      const deletionSet = new Set(plan.deletions || []);
      deletionSet.forEach((name) => memberMap.delete(name));
      const upserts = [...(plan.replacements || []), ...(plan.additions || [])];
      upserts.forEach((member) => {
        memberMap.set(member.name, member.code.trim());
      });
      const newBody = Array.from(memberMap.values()).join(
        structureInfo.type === 'Object' ? ',\n\n' : '\n\n'
      );
      const header = originalCode.substring(0, bodyNode.start + 1);
      const footer = originalCode.substring(bodyNode.end - 1);
      const codeWithNewMembers = header + '\n' + newBody + '\n' + footer;

      const newMetadataResult = this.controller.codeParser.parseForMetadata(
        codeWithNewMembers,
        controller.filePath
      );
      const cleanBodyAfterUpdate = this.controller.codeParser.generateCleanBody(
        codeWithNewMembers,
        newMetadataResult,
        { stripExports: false, stripImports: true }
      );

      currentImports = this._autoResolveImports(
        cleanBodyAfterUpdate,
        currentImports
      );
      this.controller.imports = currentImports;

      finalCode = this._reconstructModuleFromMetadata(
        cleanBodyAfterUpdate,
        currentImports
      );
    }

    try {
      finalCode = await CodeFormatter.format(finalCode);
    } catch (e) {
      console.warn('Formatting failed, proceeding with unformatted code.', e);
    }
    controller.appContext.onStatusUpdate(
      `Surgical Update applied to ${controller.filePath}.`,
      false
    );
    await controller.updateCodeAndMetadata(finalCode);
    if (controller.viewManager.activeView === 'structured') {
      controller.viewManager.renderStructuredView();
    }
  }

  async applyImportUpdate(newImports) {
    const { controller } = this;
    controller.appContext.onStatusUpdate(
      `Updating imports for ${controller.filePath}...`
    );
    const normalize = (list) => {
      return (Array.isArray(list) ? list : [])
        .map((imp) => {
          const symbol = imp?.symbol || imp?.local || '';
          const sourceDir = imp?.sourceDir || '';
          return symbol ? `${symbol}@@${sourceDir}` : null;
        })
        .filter(Boolean)
        .sort();
    };
    const currentSig = normalize(controller.imports);
    const incomingSig = normalize(newImports);
    if (
      currentSig.length === incomingSig.length &&
      currentSig.every((val, i) => val === incomingSig[i])
    ) {
      controller.appContext.onStatusUpdate(
        `No import changes were necessary for ${controller.filePath}.`
      );
      return;
    }
    const currentCode = controller.getCode();
    if (currentCode === null) {
      controller.appContext.onStatusUpdate(
        'Could not get current code to apply imports.',
        true
      );
      return;
    }

    const metadataResult = this.controller.codeParser.parseForMetadata(
      currentCode,
      this.controller.filePath
    );
    const cleanBody = this.controller.codeParser.generateCleanBody(
      currentCode,
      metadataResult,
      { stripExports: false, stripImports: true }
    );

    const reconstructedCode = this._reconstructModuleFromMetadata(
      cleanBody,
      newImports
    );

    let finalCode = reconstructedCode;
    try {
      finalCode = await CodeFormatter.format(reconstructedCode);
    } catch (e) {
      console.warn('Formatting failed after import update.', e);
    }
    await controller.updateCodeAndMetadata(finalCode);
    if (controller.viewManager.activeView === 'structured') {
      controller.viewManager.renderStructuredView();
    }
  }

  autoHealFullFile(content) {
    const metadataResult = this.controller.codeParser.parseForMetadata(
      content,
      this.controller.filePath
    );

    if (
      metadataResult.error &&
      (!metadataResult.exports || metadataResult.exports.length === 0)
    ) {
      return content;
    }

    let cleanBody = this.controller.codeParser.generateCleanBody(
      content,
      metadataResult,
      { stripExports: false, stripImports: true }
    );
    let currentImports = metadataResult.imports || [];

    const prevExports = this.controller.exports;

    // Completely removed the `exportPrefix` string injection that was forcing 
    // `export default class` back into the AST upon rebuild.

    this.controller.exports =
      metadataResult.exports && metadataResult.exports.length > 0
        ? metadataResult.exports
        : prevExports;

    currentImports = this._autoResolveImports(cleanBody, currentImports);

    const finalCode = this._reconstructModuleFromMetadata(
      cleanBody,
      currentImports
    );

    this.controller.exports = prevExports;

    return finalCode;
  }

  _autoResolveImports(cleanCodeBody, currentImports) {
    const usedIdentifiers = AstUtils.getReferencedIdentifiers(
      cleanCodeBody,
      this.controller.codeParser.acorn
    );
    const importMap = new Map(currentImports.map((imp) => [imp.symbol, imp]));
    const app = this.controller.app;

    // Determine the class name being exported so we don't import ourselves
    let myExportName = null;
    if (this.controller.exports && this.controller.exports.length > 0) {
      myExportName = this.controller.exports[0].name;
    }

    // 1. Remove unused managed imports
    for (const [sym, imp] of importMap.entries()) {
      if (!usedIdentifiers.has(sym) && app.symbolMap.has(sym)) {
        importMap.delete(sym);
        console.log(`[AutoImport] Removed unused import: ${sym}`);
      }
    }

    // 2. Add missing required imports
    for (const symbol of usedIdentifiers) {
      if (symbol === myExportName) continue;

      if (!importMap.has(symbol) && app.symbolMap.has(symbol)) {
        const sourceDir = app.symbolMap.get(symbol);
        const relativePath = this._calculateRelativePath(
          this.controller.filePath,
          sourceDir,
          symbol
        );

        importMap.set(symbol, {
          symbol: symbol,
          local: symbol,
          imported: symbol,
          kind: 'named',
          source: relativePath,
        });
        console.log(
          `[AutoImport] Added missing import: ${symbol} from ${relativePath}`
        );
      }
    }

    return Array.from(importMap.values());
  }

  _reconstructModuleFromMetadata(cleanCodeBody, importsToUse) {
    const importsBySource = new Map();

    (importsToUse || []).forEach((imp) => {
      if (!imp.source) return;
      if (!importsBySource.has(imp.source)) {
        importsBySource.set(imp.source, {
          default: null,
          namespace: null,
          named: [],
        });
      }
      const group = importsBySource.get(imp.source);
      if (imp.kind === 'default') group.default = imp.local;
      else if (imp.kind === 'namespace') group.namespace = imp.local;
      else if (imp.kind === 'named') {
        const specifier =
          imp.local === imp.imported
            ? imp.local
            : `${imp.imported} as ${imp.local}`;
        if (!group.named.includes(specifier)) group.named.push(specifier);
      }
    });

    const importStrings = [];
    const sortedSources = Array.from(importsBySource.keys()).sort();

    for (const source of sortedSources) {
      const group = importsBySource.get(source);
      if (group.namespace) {
        importStrings.push(`import * as ${group.namespace} from '${source}';`);
      }
      const otherParts = [];
      if (group.default) {
        otherParts.push(group.default);
      }
      if (group.named.length > 0) {
        group.named.sort();
        otherParts.push(`{ ${group.named.join(', ')} }`);
      }
      if (otherParts.length > 0) {
        importStrings.push(`import ${otherParts.join(', ')} from '${source}';`);
      }
    }
    const importBlock = importStrings.join('\n');

    const separator = importBlock && cleanCodeBody.trim() ? '\n\n' : '';
    return `${importBlock}${separator}${cleanCodeBody.trim()}`;
  }

  _calculateRelativePath(fromFilePath, toDirPath, symbol) {
    // Library shortcut
    if (toDirPath.startsWith('/library') || toDirPath === 'library') {
      return `/library/${symbol}.js`;
    }

    // Isolate directory paths
    let srcDir = (typeof fromFilePath === 'string' ? fromFilePath : '').trim();
    const lastSlash = srcDir.lastIndexOf('/');
    if (lastSlash >= 0) srcDir = srcDir.substring(0, lastSlash);

    const dstDir = (typeof toDirPath === 'string' ? toDirPath : '').trim();
    const fileName = `${symbol}.js`;

    if (srcDir === dstDir) return `./${fileName}`;

    try {
      const fromParts = srcDir.split('/').filter(Boolean);
      const toParts = dstDir.split('/').filter(Boolean);

      let common = 0;
      while (
        common < fromParts.length &&
        common < toParts.length &&
        fromParts[common] === toParts[common]
      ) {
        common++;
      }

      const upCount = fromParts.length - common;
      let rel = upCount > 0 ? '../'.repeat(upCount) : './';

      const remainingTo = toParts.slice(common);
      if (remainingTo.length > 0) {
        rel += remainingTo.join('/') + '/';
      }

      return rel + fileName;
    } catch {
      return `./${fileName}`;
    }
  }

    


  static _doc_overview() {
      return "### EditorDataHandler\n\nManages the AST reconstruction and surgical updates for a specific editor tab. Handles import auto-healing and code formatting.";
    }

  static _doc_synthesis() {
      return `## Code Reconstruction and Surgical Updates

- **Reconstruction**: Extracts imports and exports, leaving a clean class body. When saving, it merges the clean body back with the managed imports and exports to rebuild a perfect ES6 module.
- **Surgical Method Transplant**: Interprets LLM surgical plans. It locates the target class body in the AST, maps existing member ranges, and swaps/inserts/deletes specific methods cleanly without touching unrelated code in the file.
- **Auto-Import Healing**: Traverses the updated code block to find referenced identifiers. It checks them against the global \`symbolMap\` to automatically generate correct relative imports for missing dependencies and strip unused ones.`;
    }

  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  
}

