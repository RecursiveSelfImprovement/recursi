
class CodeParser {
  
  constructor(acornInstance) {
    this.acorn = acornInstance;
    this.jsModuleParser = new JsModuleParser(acornInstance);
  }

  parseRecursiUpdate(protocolCode, context) {
    return this.surgicalUpdateParser.parse(protocolCode, context);
  }

  _parseQuotedNames(commentValue) {
    const names = [];
    const regex = /"([^"]+)"/g;
    let match;
    while ((match = regex.exec(commentValue)) !== null) {
      names.push(match[1]);
    }
    return names;
  }

  parseAndSegmentCode(codeToParse) {
    const result = { metadata: null, body: codeToParse, error: null };
    const metadataResult = this._extractMetadataBlock(codeToParse);
    if (metadataResult.error) {
      result.metadata = { note: 'No metadata block found or parsed.' };
      return result;
    }
    result.metadata = {
      dependencies: metadataResult.dependencies,
      exports: metadataResult.exports,
      file: metadataResult.file,
    };
    result.body = codeToParse.substring(metadataResult.metadataEnd).trim();
    return result;
  }

  parseAndExtractPastedMembers(
    wrapperCode,
    expectedStructureName,
    structureType
  ) {
    const parseResult = this._parseCode(wrapperCode);
    if (parseResult.error)
      return {
        members: [],
        error: `Pasted code parsing error: ${parseResult.error}`,
      };
    const { ast, comments } = parseResult;
    const declarationInfo = this._findTopLevelDeclaration(ast);
    if (!declarationInfo)
      return {
        members: [],
        error:
          'Internal Error: Could not re-parse class structure after paste.',
      };
    const extractedMembers = this._extractMemberDataFromPaste(
      declarationInfo.node,
      structureType,
      comments,
      wrapperCode,
      expectedStructureName
    );
    return { members: extractedMembers, error: null };
  }

  parseAndExtractMembers(bodyCode, structureType) {
    const wrapper =
      structureType === 'Class'
        ? `class A extends Object { ${bodyCode} }`
        : `const o = { ${bodyCode} };`;
    const { ast, error } = AstUtils.parseCode(this.acorn, wrapper);
    if (error) return [];
    const structureNode = AstUtils.findTopLevelDeclaration(ast);
    if (!structureNode) return [];
    const memberNodes =
      structureType === 'Class'
        ? structureNode.node.body.body
        : structureNode.node.properties;
    const members = [];
    for (const node of memberNodes) {
      const name =
        structureType === 'Class'
          ? AstUtils.getClassMemberName(node)
          : AstUtils.getPropertyName(node);
      if (name !== 'unknown')
        members.push({ name, code: wrapper.substring(node.start, node.end) });
    }
    return members;
  }

  _parseCode(codeText) {
    let comments = [];
    try {
      const ast = this.acorn.parse(codeText, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        locations: true,
        ranges: true,
        onComment: comments,
      });
      return { ast, comments, error: null };
    } catch (parseError) {
      return {
        ast: null,
        comments: [],
        error: `${parseError.message}\nAt line ${
          parseError.loc?.line || '?'
        }, column ${parseError.loc?.column || '?'}`,
      };
    }
  }

  _findTopLevelDeclaration(ast) {
    if (!ast || !ast.body) return null;
    for (const node of ast.body) {
      if (node.type === 'ExportDefaultDeclaration') {
        if (node.declaration.type === 'ClassDeclaration')
          return {
            node: node.declaration,
            type: 'Class',
            name: node.declaration.id?.name || 'DefaultExportedClass',
          };
        if (node.declaration.type === 'ObjectExpression')
          return {
            node: node.declaration,
            type: 'Object',
            name: 'DefaultExportedObject',
          };
      }
      if (node.type === 'ExportNamedDeclaration' && node.declaration) {
        if (node.declaration.type === 'ClassDeclaration')
          return {
            node: node.declaration,
            type: 'Class',
            name: node.declaration.id?.name || 'ExportedClass',
          };
        if (node.declaration.type === 'VariableDeclaration') {
          for (const declarator of node.declaration.declarations) {
            if (declarator.init && declarator.init.type === 'ObjectExpression')
              return {
                node: declarator.init,
                type: 'Object',
                name: declarator.id?.name || 'ExportedObject',
              };
          }
        }
      }
      if (node.type === 'ClassDeclaration')
        return {
          node,
          type: 'Class',
          name: node.id ? node.id.name : 'AnonymousClass',
        };
      if (node.type === 'VariableDeclaration') {
        for (const declarator of node.declarations) {
          if (declarator.init && declarator.init.type === 'ObjectExpression')
            return {
              node: declarator.init,
              type: 'Object',
              name: declarator.id?.name || 'AnonymousObject',
            };
        }
      }
    }
    return null;
  }

  _extractMemberDataFromPaste(
    declarationNode,
    structureType,
    comments,
    wrapperCode,
    expectedStructureName
  ) {
    const pastedMembersData = [];
    let memberNodes = [];
    let baseNodeForRange = declarationNode;

    if (structureType === 'Class' && declarationNode.body) {
      memberNodes = (declarationNode.body.body || [])
        .filter(
          (node) =>
            node.type === 'MethodDefinition' ||
            node.type === 'PropertyDefinition'
        )
        .sort((a, b) => a.start - b.start);
      baseNodeForRange = declarationNode.body;
    } else if (structureType === 'Object') {
      memberNodes = (declarationNode.properties || [])
        .filter((prop) => prop.type === 'Property')
        .sort((a, b) => a.start - b.start);
      baseNodeForRange = declarationNode;
    } else return [];

    let previousMemberEffectiveEnd = baseNodeForRange.start;
    for (const memberNode of memberNodes) {
      const memberName =
        structureType === 'Class'
          ? AstUtils.getClassMemberName(memberNode)
          : this.getPropertyName(memberNode);
      if (
        !memberName ||
        memberName === 'unknown' ||
        memberName === '[computed]'
      )
        continue;

      const targetSegmentKey = `${expectedStructureName}::${memberName}`;
      const effectiveStart = this.findEffectiveStart(
        memberNode,
        comments,
        wrapperCode,
        previousMemberEffectiveEnd
      );
      const effectiveEnd = this.findEffectiveEnd(
        memberNode,
        comments,
        wrapperCode
      );

      if (
        effectiveStart >= 0 &&
        effectiveEnd >= effectiveStart &&
        effectiveEnd <= wrapperCode.length
      ) {
        pastedMembersData.push({
          targetSegmentKey,
          codeWithComments: wrapperCode.slice(effectiveStart, effectiveEnd),
        });
        previousMemberEffectiveEnd = effectiveEnd;
      }
    }
    return pastedMembersData;
  }

  getPropertyName(propertyNode) {
    if (!propertyNode || !propertyNode.key) return 'unknown';
    if (propertyNode.key.type === 'Identifier') return propertyNode.key.name;
    if (propertyNode.key.type === 'Literal')
      return String(propertyNode.key.value);
    if (propertyNode.key.type === 'PrivateIdentifier')
      return '#' + propertyNode.key.name;
    if (propertyNode.computed) return '[computed]';
    return 'unknown';
  }

  findEffectiveStart(node, allComments, codeText, previousNodeEffectiveEnd) {
    if (!node) return previousNodeEffectiveEnd;
    let currentEffectiveStart = node.start;
    const relevantComments = allComments
      .filter((c) => c.end > previousNodeEffectiveEnd && c.start < node.start)
      .sort((a, b) => b.start - a.start);
    for (const comment of relevantComments) {
      if (comment.value.trim().toLowerCase().startsWith('recursi ')) continue;
      const interveningText = codeText.slice(
        comment.end,
        currentEffectiveStart
      );
      if (interveningText.trim() === '') {
        const interveningBeforeComment = codeText.slice(
          previousNodeEffectiveEnd,
          comment.start
        );
        if (
          interveningBeforeComment.trim() === '' ||
          comment.start >= previousNodeEffectiveEnd
        ) {
          currentEffectiveStart = comment.start;
        } else break;
      } else break;
    }
    return Math.max(currentEffectiveStart, previousNodeEffectiveEnd);
  }

  findEffectiveEnd(node, allComments, codeText) {
    if (!node) return 0;
    let effectiveEnd = node.end;
    const potentialTrailingComments = allComments
      .filter((c) => c.start >= node.end)
      .sort((a, b) => a.start - b.start);
    for (const comment of potentialTrailingComments) {
      if (comment.value.trim().toLowerCase().startsWith('recursi ')) break;
      const interveningText = codeText.slice(effectiveEnd, comment.start);
      if (interveningText.trim() === '')
        effectiveEnd = Math.max(effectiveEnd, comment.end);
      else break;
    }
    return effectiveEnd;
  }

  _extractMetadataBlock(code) {
    const metadata = {
      dependencies: {},
      exports: null,
      file: {},
      error: null,
      metadataEnd: 0,
    };
    const sig = 'recursi_metadata({';
    const callStart = code.indexOf(sig);
    if (callStart === -1) {
      metadata.error = "No 'recursi_metadata({' call found.";
      return metadata;
    }

    let openBraces = 1,
      jsonEnd = -1;
    for (let i = callStart + sig.length; i < code.length; i++) {
      if (code[i] === '{') openBraces++;
      if (code[i] === '}') openBraces--;
      if (openBraces === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
    if (jsonEnd === -1) {
      metadata.error = 'Missing closing brace.';
      return metadata;
    }

    const callEnd = code.indexOf(')', jsonEnd);
    if (callEnd === -1) {
      metadata.error = 'Missing parenthesis.';
      return metadata;
    }

    metadata.metadataEnd = callEnd + 1;
    try {
      const metadataObject = JSON.parse(
        code.substring(callStart + 17, jsonEnd)
      );
      metadata.dependencies = metadataObject.dependencies || {};
      metadata.exports = metadataObject.exports || null;
      metadata.file = metadataObject.file || {};
      return metadata;
    } catch (e) {
      metadata.error = `JSON parse failed: ${e.message}`;
      return metadata;
    }
  }

  reconstructFile(metadata, body) {
    if (!metadata || !metadata.file || !metadata.file.path)
      return `// Error: No metadata.file.path\n${body}`;

    const ownPath = metadata.file.path;
    const imports = [];
    if (metadata.dependencies) {
      for (const [symbol, path] of Object.entries(metadata.dependencies)) {
        const relativePath = this._resolveImportPath(ownPath, path);
        imports.push(`import { ${symbol} } from '${relativePath}';`);
      }
    }

    let finalBody = body;

    const missingImports = imports.filter((imp) => !finalBody.includes(imp));
    const importBlock = missingImports.join('\n');

    // Completely removed the RegExp block that forcefully prepended `export`
    // onto the target class declaration during reconstruction.

    return importBlock ? `${importBlock}\n\n${finalBody}` : finalBody;
  }

  parseForMetadata(code, filePath) {
    return this.jsModuleParser.parseForMetadata(code, filePath);
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

  getImports(code, filePath) {
    return this.jsModuleParser.getImports(code, filePath);
  }

  getMemberDetails(code) {
    return this.jsModuleParser.getMemberDetails(code);
  }

  extractFullMethodSource(code, methodName) {
    return this.jsModuleParser.extractFullMethodSource(code, methodName);
  }

  generateCleanBody(originalCode, parseResult, options) {
    return this.jsModuleParser.generateCleanBody(
      originalCode,
      parseResult,
      options
    );
  }

  extractAndStripFooterMetadata(code, fileName) {
    if (!code || typeof code !== 'string') return { code, metadata: null };
    const ext = fileName.split('.').pop().toLowerCase();

    if (ext === 'json') {
      try {
        const obj = JSON.parse(code);
        if (obj['@recursi-meta']) {
          const meta = obj['@recursi-meta'];
          delete obj['@recursi-meta'];
          return { code: JSON.stringify(obj, null, 2), metadata: meta };
        }
      } catch (e) {}
      return { code, metadata: null };
    }

    const tag = 'recursi' + '-meta';
    const lastIndex = code.lastIndexOf(tag);
    if (lastIndex === -1) return { code, metadata: null };

    const regex =
      ext === 'html' || ext === 'svg' || ext === 'md'
        ? new RegExp(`<!--\\s*${tag}\\s*([\\s\\S]*?)\\s*${tag}\\s*-->`, 'g')
        : new RegExp(`/\\*\\s*${tag}\\s*([\\s\\S]*?)\\s*${tag}\\s*\\*/`, 'g');

    let match,
      lastMatch = null;
    while ((match = regex.exec(code)) !== null) lastMatch = match;

    if (lastMatch) {
      try {
        const strippedCode =
          code.substring(0, lastMatch.index) +
          code.substring(lastMatch.index + lastMatch[0].length);
        return {
          code: strippedCode.trimEnd(),
          metadata: JSON.parse(lastMatch[1].trim()),
        };
      } catch (e) {}
    }
    return { code, metadata: null };
  }

  appendFooterMetadata(code, fileName, metadataObj) {
    const stripped = this.extractAndStripFooterMetadata(code, fileName).code;
    const payload = JSON.stringify(metadataObj, null, 2);
    const ext = fileName.split('.').pop().toLowerCase();
    const tag = 'recursi' + '-meta';

    if (ext === 'json') {
      try {
        const obj = JSON.parse(stripped);
        obj['@recursi-meta'] = metadataObj;
        return JSON.stringify(obj, null, 2);
      } catch (e) {
        return code;
      }
    }

    if (ext === 'svg') {
      const closingTagIndex = stripped.lastIndexOf('</svg>');
      if (closingTagIndex !== -1) {
        return (
          stripped.substring(0, closingTagIndex) +
          `\n<!-- ${tag}\n${payload}\n${tag} -->\n` +
          stripped.substring(closingTagIndex)
        );
      }
    }

    if (ext === 'html' || ext === 'svg' || ext === 'md')
      return `${stripped}\n\n<!-- ${tag}\n${payload}\n${tag} -->\n`;
    return `${stripped}\n\n/* ${tag}\n${payload}\n${tag} */\n`;
  }

    static _doc_CodeParser() {
    return {
      "generatedBy": "MigrateOwnedSidecarDocsToCapsulesV2",
      "migratedAt": "2026-04-29T05:02:29.410Z",
      "sourcePath": "/vibes/src/protocol/CodeParser_js.md",
      "ownerPath": "/vibes/src/protocol/CodeParser.js",
      "ownerClass": "CodeParser",
      "migrationStatus": "sidecar-embedded-sidecar-deleted",
      "visibilityRole": "documentation",
      "note": "Migrated from legacy *_js.md sidecar into the managed JS capsule. This method is documentation payload, not runtime code. Prompt visibility docsLevel should control inclusion.",
      "content": "# CodeParser\n\n## Summary\n\nCodeParser is the central facade for all AST (Abstract Syntax Tree) operations in Vibes. Rather than scattering raw Acorn parsing logic throughout the application, this class exposes clean, high-level methods for analyzing and manipulating JavaScript. It delegates specialized tasks to its sub-parsers (`JsModuleParser` and `SurgicalUpdateParser`) while handling universal tasks like metadata extraction.\n\nThe design philosophy is resilient abstraction. LLM-generated code and in-progress human edits are frequently syntactically invalid. CodeParser and its submodules are built to aggressively fallback, wrap, and sanitize code until it parses, ensuring the editor rarely crashes just because a user forgot a closing brace.\n\n## Core Logic & Philosophy\n\n**Footer metadata management.** Vibes stores vital file intelligence (like line counts, dependency lists, and provided exports) directly inside the source files as commented footers (e.g., `/* recursi-meta {...} */`). `extractAndStripFooterMetadata` uses regex to locate and remove these blocks before the code is displayed in the CodeMirror editor. `appendFooterMetadata` cleanly injects them back before saving to disk. This ensures the editor UI remains clean while preserving portable file intelligence.\n\n**Unified delegation.** If a subsystem needs to know what a file exports, it calls `parseForMetadata`, which routes to `JsModuleParser`. If the system needs to interpret an LLM command block, it calls `parseRecursiUpdate`, which routes to `SurgicalUpdateParser`. This centralizes the Acorn dependency.\n\n**Paste extraction.** `parseAndExtractPastedMembers` is used during Paste Review. If the LLM provides naked methods in a surgical update, this method wraps them in a dummy class, parses the AST, and extracts the individual method strings (including their preceding comments) so they can be diffed and applied cleanly to the target file.\n\n## Public API\n\n### Parsing & Routing\n- `constructor(acornInstance)` — Initializes the parser and its sub-modules, passing the shared Acorn reference.\n- `parseRecursiUpdate(protocolCode, context)` — Delegates LLM payload interpretation to the `SurgicalUpdateParser`.\n- `parseForMetadata(code, filePath)` — Returns the structured imports, exports, and syntax errors of a full JS file.\n- `getImports(code, filePath)` / `getMemberDetails(code)` — Facades for `JsModuleParser` AST analysis.\n- `generateCleanBody(originalCode, parseResult, options)` — Strips imports/exports from a JS string based on its AST.\n\n### Sub-String Extraction\n- `extractFullMethodSource(code, methodName)` — Isolates the raw string of a specific method from a larger class.\n- `parseAndExtractMembers(bodyCode, structureType)` — Takes a string of naked methods, wraps them, and returns an array of named code blocks.\n\n### File Metadata\n- `extractAndStripFooterMetadata(code, fileName)` — Removes and parses the `recursi-meta` footer block from a file.\n- `appendFooterMetadata(code, fileName, metadataObj)` — Injects a JSON payload into a comment block at the bottom of a file."
};
  }

  extractStaticMetadata(code) {
      return null;
    }


  static _doc_overview() {
      return [
        "# CodeParser",
        "",
        "The `CodeParser` is the primary facade for Abstract Syntax Tree (AST) parsing, comment association, and ES6 module analysis.",
        "It leverages the browser-based Acorn parser and delegates module-specific operations to `JsModuleParser`."
      ].join('\n');
    }

  static _doc_footer_metadata() {
      return [
        "## Portable Metadata Footers",
        "",
        "To keep files light for LLM context windows, Vibes keeps documentation, dependency arrays, and export lists out of inline code blocks.",
        "Instead, `CodeParser` handles a dual-mode footer serialization:",
        "- **Strip**: `extractAndStripFooterMetadata` uses exact regex patterns to slice the `recursi-meta` comment block off the file on load.",
        "- **Append**: `appendFooterMetadata` compiles fresh stats and writes them back as a clean footer before file commits.",
        "This ensures files remain 100% parseable, lightweight, and carry their own portable metadata."
      ].join('\n');
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_footer_metadata()
      ].join('\n\n');
    }

  static getMarkdown() {
      return this._doc();
    }
}

