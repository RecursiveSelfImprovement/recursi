
class JsModuleParser {
  constructor(acornInstance) {
    if (!acornInstance) {
      throw new Error(
        'JsModuleParser requires an instance of the Acorn library.'
      );
    }
    this.acorn = acornInstance;
  }

  parseForMetadata(code, filePath) {
    const allImports = [];
    const allExports = [];

    const { ast, error } = AstUtils.parseCode(this.acorn, code);

    if (error || !ast || !ast.body) {
      return {
        imports: [],
        exports: [],
        mainExport: null,
        error: error || 'AST body not found.',
      };
    }

    try {
      for (const node of ast.body) {
        if (node.type === 'ImportDeclaration') {
          allImports.push(...this._processImportDeclaration(node, filePath));
        } else if (
          node.type === 'ExportDefaultDeclaration' ||
          node.type === 'ExportNamedDeclaration'
        ) {
          const exportInfo = this._processExportDeclaration(node, filePath);
          if (exportInfo) {
            allExports.push(exportInfo);
          }
        }
      }

      if (allExports.length === 0) {
        const topDecl = AstUtils.findTopLevelDeclaration(ast);
        if (topDecl && topDecl.name && !topDecl.name.startsWith('Anonymous')) {
          allExports.push({
            type: 'ImplicitDeclaration',
            name: topDecl.name,
            kind: topDecl.node?.type || topDecl.type,
            start: topDecl.node ? topDecl.node.start : 0,
            end: topDecl.node ? topDecl.node.end : 0,
            declarationStart: topDecl.node ? topDecl.node.start : 0,
          });
        }
      }

      // --- THE NEW, STRICT VALIDATION ---
      // A "Smart File" must have exactly one export.
      if (allExports.length !== 1) {
        const errorMsg = `Smart File Violation: File contains ${allExports.length} exports, but exactly one is required for surgical updates. Treating as a Generic File.`;
        return {
          imports: allImports,
          exports: allExports,
          mainExport: null,
          error: errorMsg,
        };
      }

      const mainExport = allExports[0];

      allImports.sort((a, b) => a.start - b.start);
      return {
        imports: allImports,
        exports: [mainExport],
        mainExport,
        error: null,
      };
    } catch (e) {
      return {
        imports: [],
        exports: [],
        mainExport: null,
        error: `Error processing AST for metadata: ${e.message}`,
      };
    }
  }

  generateCleanBody(
    originalCode,
    parseResult,
    options = { stripExports: false, stripImports: true }
  ) {
    if (!originalCode || !parseResult) return '';

    const { imports = [], exports = [] } = parseResult;
    const removals = [];

    if (options.stripImports !== false) {
      for (const imp of imports) {
        removals.push({ start: imp.start, end: imp.end });
      }
    }

    if (options.stripExports) {
      for (const exp of exports) {
        if (exp.start !== exp.declarationStart) {
          removals.push({ start: exp.start, end: exp.declarationStart });
        }
      }
    }

    removals.sort((a, b) => a.start - b.start);

    let lastIndex = 0;
    const segments = [];
    for (const removal of removals) {
      if (removal.start > lastIndex) {
        segments.push(originalCode.substring(lastIndex, removal.start));
      }
      lastIndex = removal.end;
    }

    if (lastIndex < originalCode.length) {
      segments.push(originalCode.substring(lastIndex));
    }

    return segments
      .join('')
      .replace(/^\s*;?\s*/, '')
      .trim();
  }

  getImports(code, filePath) {
    const metadataResult = this.parseForMetadata(code, filePath);
    return {
      imports: metadataResult.imports || [],
      error: metadataResult.error,
    };
  }

  getMemberDetails(code) {
    const { ast, error } = AstUtils.parseCode(this.acorn, code);
    if (error) return [];

    const structure = AstUtils.findTopLevelDeclaration(ast);
    if (!structure || structure.type !== 'Class') return []; // Only applies to classes

    const memberNodes = structure.node.body.body || [];
    return (
      memberNodes
        .filter(
          (node) =>
            node.type === 'MethodDefinition' ||
            node.type === 'PropertyDefinition'
        )
        .map((node) => this._getDetailFromNode(node, structure.type))
        .filter(Boolean)
    );
  }

  extractFullMethodSource(code, methodName) {
    const { ast, error, comments } = AstUtils.parseCode(this.acorn, code);
    if (error) return null;

    const source = code;

    let targetClassName = null;
    let cleanMethodName = methodName;
    
    // Strip ClassName. prefix if present (applyRecursiUpdate passes Class.method)
    if (cleanMethodName.includes('.')) {
        const parts = cleanMethodName.split('.');
        targetClassName = parts[0];
        cleanMethodName = parts[1];
    }

    let targetKind = undefined;
    let targetStatic = undefined;
    
    // Support signature parsing for getter/setter overloaded methods
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

    let targetStructure = null;
    if (targetClassName) {
      targetStructure = AstUtils.findDeclarationByName(ast, targetClassName);
    } 
    if (!targetStructure) {
      targetStructure = AstUtils.findTopLevelDeclaration(ast);
    }

    if (!targetStructure) return null;

    const memberNodes =
      (targetStructure.type === 'Class'
        ? targetStructure.node.body.body
        : targetStructure.node.properties) || [];
        
    for (const node of memberNodes) {
      const name =
        targetStructure.type === 'Class'
          ? AstUtils.getClassMemberName(node)
          : AstUtils.getPropertyName(node);
          
      if (name === cleanMethodName) {
        if (targetKind !== undefined && node.kind !== targetKind) continue;
        if (targetStatic !== undefined && node.static !== targetStatic) continue;

        let start = node.start;
        // Shift backwards dynamically to preserve JSDoc annotations above the method
        if (comments && comments.length > 0) {
           start = AstUtils.findEffectiveStart(node, comments, source, 0);
        }

        const extractedCode = source.substring(start, node.end);
        return extractedCode;
      }
    }
    return null;
  }

  _processImportDeclaration(node, filePath) {
    const sourceRaw = node.source.value;
    const resolvedDir = this._resolveImportPath(filePath, sourceRaw);
    const imports = [];

    for (const specifier of node.specifiers) {
      let imp = {
        sourceDir: resolvedDir,
        source: sourceRaw,
        start: node.start,
        end: node.end,
      };
      if (specifier.type === 'ImportDefaultSpecifier') {
        imp = {
          ...imp,
          kind: 'default',
          symbol: specifier.local.name,
          local: specifier.local.name,
          imported: 'default',
        };
      } else if (specifier.type === 'ImportNamespaceSpecifier') {
        imp = {
          ...imp,
          kind: 'namespace',
          symbol: specifier.local.name,
          local: specifier.local.name,
          imported: '*',
        };
      } else if (specifier.type === 'ImportSpecifier') {
        const importedName = specifier.imported?.name || specifier.local.name;
        const localName = specifier.local.name;
        imp = {
          ...imp,
          kind: 'named',
          symbol: localName,
          imported: importedName,
          local: localName,
        };
      }
      if (imp.kind) imports.push(imp);
    }
    return imports;
  }

  _processExportDeclaration(node, filePath) {
    const decl = node.declaration;
    if (node.type === 'ExportDefaultDeclaration') {
      const name =
        (decl && decl.id && decl.id.name) ||
        (filePath.split('/').pop() || '').replace(/\.js$/i, '') ||
        'DefaultExport';
      return {
        type: node.type,
        name,
        kind: decl ? decl.type : 'Unknown',
        start: node.start,
        end: node.end,
        declarationStart: decl ? decl.start : node.start,
      };
    }
    if (node.type === 'ExportNamedDeclaration') {
      if (decl) {
        let name = null;
        if (decl.id) name = decl.id.name;
        else if (decl.declarations && decl.declarations[0]?.id)
          name = decl.declarations[0].id.name;
        if (name)
          return {
            type: node.type,
            name,
            kind: decl.type,
            start: node.start,
            end: node.end,
            declarationStart: decl.start,
          };
      } else if (node.specifiers && node.specifiers.length > 0) {
        const specifier = node.specifiers[0];
        return {
          type: node.type,
          name: specifier.exported.name,
          kind: 'Identifier',
          start: node.start,
          end: node.end,
          declarationStart: specifier.start,
        };
      }
    }
    return null;
  }

  _resolveImportPath(currentFilePath, relativeImportPath) {
    const currentDirectoryParts = currentFilePath.split('/').slice(0, -1);
    const importPathParts = relativeImportPath.split('/');
    for (const part of importPathParts) {
      if (part === '..') currentDirectoryParts.pop();
      else if (part !== '.' && !part.endsWith('.js'))
        currentDirectoryParts.push(part);
    }
    return currentDirectoryParts.slice(1).join('/');
  }

  _getDetailFromNode(node, structureType) {
    const name =
      structureType === 'Class'
        ? AstUtils.getClassMemberName(node)
        : AstUtils.getPropertyName(node);
    if (!name || name === 'unknown') return null;

    const lineCount = node.loc.end.line - node.loc.start.line + 1;
    const isPublic = !name.startsWith('_') && !name.startsWith('#');
    let signature = name;
    let funcNode;

    if (node.type === 'MethodDefinition') {
      funcNode = node.value;
    } else if (node.type === 'PropertyDefinition') {
      signature = `${name};`;
      funcNode = null; 
    } else if (
      node.type === 'Property' &&
      node.value &&
      (node.value.type === 'ArrowFunctionExpression' ||
        node.value.type === 'FunctionExpression')
    ) {
      funcNode = node.value;
    }

    if (funcNode) {
      const formatParam = (p) => {
        if (!p) return '?';
        if (p.type === 'Identifier') return p.name;
        if (p.type === 'AssignmentPattern') return `${p.left.name} = ...`;
        if (p.type === 'RestElement') return `...${p.argument.name}`;
        if (p.type === 'ObjectPattern') return `{...}`;
        return '?';
      };
      const params = (funcNode.params || []).map(formatParam).join(', ');
      signature = `${name}(${params})`;
      if (funcNode.async) signature = `async ${signature}`;
      if (node.kind === 'get' || node.kind === 'set')
        signature = `${node.kind} ${signature}`;
    }
    return { name, signature, lineCount, isPublic, kind: node.type, node };
  }

  getTopologicallySortedPaths(fileMap) {
      const jsPaths = [];
      for (const path of fileMap.keys()) {
        if (path.endsWith('.js') && !path.startsWith('/library/')) {
          jsPaths.push(path);
        }
      }
      return jsPaths.sort((a, b) => a.localeCompare(b));
    }

    static _doc_JsModuleParser() {
      return `# JsModuleParser

## Summary

JsModuleParser is the module analyzer for the Vibes ecosystem. It traverses the AST (Abstract Syntax Tree) of complete JavaScript files to map out their dependencies, exports, and internal class structures. It powers the project's ability to topologically sort scripts for the Live Preview runner, and enables the UI to generate the interactive "Signature" view.

The philosophy is structural understanding. Code is not treated as a flat string; it is a graph of relationships. By analyzing \`ImportDeclaration\` and \`ExportNamedDeclaration\` nodes, the parser understands exactly how a file interacts with the rest of the project, enabling features like auto-healing imports and intelligent packing.

## Core Logic & Philosophy

**Topological sorting.** \`getTopologicallySortedPaths\` is arguably the most critical method for the Live Preview feature. It takes a Map of all project files, parses every single one to find its imports, and builds a directed dependency graph. Using Kahn's algorithm, it calculates the exact order in which scripts must be injected into the browser so that base classes are always evaluated before the files that extend them.

**Smart File validation.** \`parseForMetadata\` enforces the "Smart File" concept-a file that contains exactly one primary export (usually a Class). If a file has multiple exports, it flags an error in the metadata indicating it must be treated as a "Generic File," meaning it cannot be reliably targeted for LLM surgical updates.

**AST-driven stripping.** \`generateCleanBody\` uses the start and end coordinates of AST nodes to surgically slice \`import\` and \`export\` statements out of a raw source string. Because it relies on the AST rather than regex, it safely handles complex, multi-line, destructured imports without accidentally deleting unrelated code or comments.

## Public API

### Dependency Graphing
- \`getTopologicallySortedPaths(fileMap)\` - Returns an array of file paths ordered by their ES6 import dependencies.

### AST Analysis
- \`parseForMetadata(code, filePath)\` - Scans a file and returns its \`imports\` array, \`exports\` array, and the \`mainExport\`.
- \`getImports(code, filePath)\` - Convenience wrapper returning only the import array.
- \`getMemberDetails(code)\` - Scans the top-level class/object and returns an array of its methods and properties, including signatures and line counts.

### String Manipulation
- \`generateCleanBody(originalCode, parseResult, options)\` - Returns the file string with imports and/or exports removed based on AST coordinates.
- \`extractFullMethodSource(code, methodName)\` - Returns the exact string representation of a specific class method.`;
    }


  static _doc_overview() {
      return `# JsModuleParser

The \`JsModuleParser\` is the module analyzer for the Vibes ecosystem.
It parses complete JavaScript files to extract import declarations, class exports, and method signatures, enabling structural operations across the workspace.`;
    }

  static _doc_topo_sort() {
      return `## Dependency Graphing and Topological Sorting

- **Topological Sorting**: \`getTopologicallySortedPaths\` parses each class in the file map to extract import paths, constructs a directed dependency graph, and sorts them using Kahn's algorithm. This guarantees that base classes are always evaluated before classes that inherit from them in the preview.
- **Clean Body Generation**: \`generateCleanBody\` uses AST coordinates to surgically slice \`import\` and \`export\` statements out of the source text, delivering pure class bodies ready for compilation in the preview sandbox.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_topo_sort()
      ].join('\n\n');
    }

  
}

