class AstUtils {
  
  static parseCode(acornInstance, codeText) {
    let comments = [];
    const acornOptions = {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      ranges: true,
      onComment: (isBlock, text, start, end) =>
        comments.push({ isBlock, value: text, start, end }),
    };

    try {
      if (!acornInstance || typeof acornInstance.parse !== 'function') {
        throw new Error('Acorn instance is invalid or missing.');
      }
      const ast = acornInstance.parse(codeText, acornOptions);
      return {
        ast,
        comments,
        error: null,
        rewrittenCode: null,
        usedPrivate: new Set(),
      };
    } catch (err) {
      try {
        const sanitizedCode = codeText.replace(
          /(\})\s*,\s*(?=\n|$|\s*\/\/|\s*\/\*)/g,
          '$1'
        );

        if (sanitizedCode !== codeText) {
          comments = [];
          const ast = acornInstance.parse(sanitizedCode, acornOptions);
          return {
            ast,
            comments,
            error: null,
            rewrittenCode: null,
            usedPrivate: new Set(),
          };
        }
      } catch (sanitizeErr) {
        // Fall through
      }

      const message = `${err.message}\nAt line ${
        err.loc?.line || '?'
      }, column ${err.loc?.column || '?'}`;
      return {
        ast: null,
        comments: [],
        error: message,
        rewrittenCode: null,
        usedPrivate: new Set(),
      };
    }
  }

  static getClassMemberName(memberNode) {
    if (!memberNode || !memberNode.key) return 'unknown';
    // This logic works for both MethodDefinition and PropertyDefinition
    if (memberNode.key.type === 'Identifier') return memberNode.key.name;
    if (memberNode.key.type === 'PrivateIdentifier')
      return '#' + memberNode.key.name;
    // Specific to methods
    if (memberNode.kind === 'constructor') return 'constructor';
    if (memberNode.key.type === 'Literal') return String(memberNode.key.value);
    if (memberNode.key.name && memberNode.key.name.startsWith('__PRV__'))
      return '#' + memberNode.key.name.substring(7);
    return 'unknown';
  }

  static getPropertyName(propertyNode) {
    if (!propertyNode || !propertyNode.key) return 'unknown';
    if (propertyNode.key.type === 'Identifier') return propertyNode.key.name;
    if (propertyNode.key.type === 'Literal')
      return String(propertyNode.key.value);
    if (propertyNode.key.type === 'PrivateIdentifier')
      return '#' + propertyNode.key.name;
    if (propertyNode.key.name && propertyNode.key.name.startsWith('__PRV__'))
      return '#' + propertyNode.key.name.substring(7);
    if (propertyNode.computed) return '[computed]';
    return 'unknown';
  }

  static findEffectiveStart(
    node,
    allComments,
    codeText,
    previousNodeEffectiveEnd
  ) {
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
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return Math.max(currentEffectiveStart, previousNodeEffectiveEnd);
  }

  static findEffectiveEnd(node, allComments, codeText) {
    if (!node) return 0;
    let effectiveEnd = node.end;
    const potentialTrailingComments = allComments
      .filter((c) => c.start >= node.end)
      .sort((a, b) => a.start - b.start);
    for (const comment of potentialTrailingComments) {
      if (comment.value.trim().toLowerCase().startsWith('recursi ')) break;
      const interveningText = codeText.slice(effectiveEnd, comment.start);
      if (interveningText.trim() === '') {
        effectiveEnd = Math.max(effectiveEnd, comment.end);
      } else {
        break;
      }
    }
    return effectiveEnd;
  }

  static getReferencedIdentifiers(codeText, acornInstance) {
    const { ast, error } = AstUtils.parseCode(acornInstance, codeText);
    const identifiers = new Set();
    if (error || !ast) return identifiers;

    function walk(node) {
      if (!node || typeof node !== 'object') return;

      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }

      switch (node.type) {
        case 'Identifier':
          identifiers.add(node.name);
          break;
        case 'MemberExpression':
          walk(node.object);
          if (node.computed) walk(node.property);
          break;
        case 'Property':
        case 'MethodDefinition':
        case 'PropertyDefinition':
          if (node.computed) walk(node.key);
          walk(node.value);
          break;
        case 'ExportSpecifier':
        case 'ImportSpecifier':
        case 'ImportDefaultSpecifier':
        case 'ImportNamespaceSpecifier':
          // Do not treat import/export declarations as body references
          break;
        default:
          for (const key in node) {
            if (
              key === 'type' ||
              key === 'start' ||
              key === 'end' ||
              key === 'loc'
            )
              continue;
            walk(node[key]);
          }
      }
    }

    walk(ast);
    return identifiers;
  }

  static findTopLevelDeclaration(ast) {
    if (!ast || !ast.body) return null;
    for (const node of ast.body) {
      if (
        node.type === 'ExportDefaultDeclaration' ||
        (node.type === 'ExportNamedDeclaration' && node.declaration)
      ) {
        const declaration = node.declaration;
        if (declaration.type === 'ClassDeclaration')
          return {
            node: declaration,
            type: 'Class',
            name: declaration.id?.name || 'DefaultExportedClass',
          };
        if (declaration.type === 'ObjectExpression')
          return {
            node: declaration,
            type: 'Object',
            name: 'DefaultExportedObject',
          };
        if (declaration.type === 'VariableDeclaration') {
          for (const declarator of declaration.declarations) {
            if (declarator.init) {
              if (declarator.init.type === 'ObjectExpression')
                return {
                  node: declarator.init,
                  type: 'Object',
                  name: declarator.id?.name || 'ExportedObject',
                };
              if (declarator.init.type === 'ClassExpression')
                return {
                  node: declarator.init,
                  type: 'Class',
                  name: declarator.id?.name || 'ExportedClass',
                };
            }
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
          if (declarator.init) {
            if (declarator.init.type === 'ObjectExpression')
              return {
                node: declarator.init,
                type: 'Object',
                name: declarator.id?.name || 'AnonymousObject',
              };
            if (declarator.init.type === 'ClassExpression')
              return {
                node: declarator.init,
                type: 'Class',
                name: declarator.id?.name || 'AnonymousClass',
              };
          }
        }
      }
      if (
        node.type === 'ExpressionStatement' &&
        node.expression.type === 'AssignmentExpression'
      ) {
        const expr = node.expression;
        let targetName = null;
        if (
          expr.left.type === 'MemberExpression' &&
          expr.left.property.type === 'Identifier'
        ) {
          targetName = expr.left.property.name;
        } else if (expr.left.type === 'Identifier') {
          targetName = expr.left.name;
        }
        if (targetName) {
          if (expr.right.type === 'ClassExpression')
            return { node: expr.right, type: 'Class', name: targetName };
          if (expr.right.type === 'ObjectExpression')
            return { node: expr.right, type: 'Object', name: targetName };
        }
      }
    }
    return null;
  }

  static findDeclarationByName(ast, name) {
    if (!ast || !ast.body || !name) return null;
    for (const node of ast.body) {
      if (
        (node.type === 'ExportNamedDeclaration' ||
          node.type === 'ExportDefaultDeclaration') &&
        node.declaration
      ) {
        const decl = node.declaration;
        if (decl.type === 'ClassDeclaration' && decl.id?.name === name) {
          return { node: decl, type: 'Class', name: decl.id.name };
        }
        if (decl.type === 'VariableDeclaration') {
          for (const declarator of decl.declarations) {
            if (declarator.id?.name === name && declarator.init) {
              if (declarator.init.type === 'ObjectExpression')
                return {
                  node: declarator.init,
                  type: 'Object',
                  name: declarator.id.name,
                };
              if (declarator.init.type === 'ClassExpression')
                return {
                  node: declarator.init,
                  type: 'Class',
                  name: declarator.id.name,
                };
            }
          }
        }
      }
      if (node.type === 'ClassDeclaration' && node.id?.name === name) {
        return { node, type: 'Class', name: node.id.name };
      }
      if (node.type === 'VariableDeclaration') {
        for (const declarator of node.declarations) {
          if (declarator.id?.name === name && declarator.init) {
            if (declarator.init.type === 'ObjectExpression')
              return {
                node: declarator.init,
                type: 'Object',
                name: declarator.id.name,
              };
            if (declarator.init.type === 'ClassExpression')
              return {
                node: declarator.init,
                type: 'Class',
                name: declarator.id.name,
              };
          }
        }
      }
      if (
        node.type === 'ExpressionStatement' &&
        node.expression.type === 'AssignmentExpression'
      ) {
        const expr = node.expression;
        let targetName = null;
        if (
          expr.left.type === 'MemberExpression' &&
          expr.left.property.type === 'Identifier'
        ) {
          targetName = expr.left.property.name;
        } else if (expr.left.type === 'Identifier') {
          targetName = expr.left.name;
        }
        if (targetName === name) {
          if (expr.right.type === 'ClassExpression')
            return { node: expr.right, type: 'Class', name: targetName };
          if (expr.right.type === 'ObjectExpression')
            return { node: expr.right, type: 'Object', name: targetName };
        }
      }
    }
    return null;
  }

  static checkStrictCodeRules(codeText, acornInstance) {
    const { ast, error } = this.parseCode(acornInstance, codeText);
    if (error || !ast) return [];
    
    const violations = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      
      if (node.type === 'Literal') {
        if (node.regex) {
          violations.push({ rule: 'allowRegex', message: 'Regular expression literal detected.' });
        } else if (typeof node.value === 'string') {
          checkStr(node.value, node.raw);
        }
      } else if (node.type === 'TemplateElement') {
        checkStr(node.value.cooked, node.value.raw);
      }
      
      for (const key in node) {
        if (key !== 'type' && key !== 'start' && key !== 'end' && key !== 'loc' && key !== 'parent') {
          walk(node[key]);
        }
      }
    };
    
    const checkStr = (str, raw) => {
      if (typeof str !== 'string') return;
      const openC = (str.match(/\{/g) || []).length;
      const closeC = (str.match(/\}/g) || []).length;
      if (openC !== closeC) {
        violations.push({ rule: 'allowUnmatchedBraces', message: 'String contains unmatched braces.' });
      }
      // Heuristic: string > 80 chars with an escape character
      if (raw && raw.length > 80 && raw.includes('\\')) {
        violations.push({ rule: 'allowComplexStrings', message: 'Long string with escapes detected.' });
      }
    };
    
    walk(ast);
    return violations;
  }

    static _doc_AstUtils() {
      return `# AstUtils

## Summary

AstUtils is a collection of low-level, static heuristic methods designed to support the Acorn AST parser. Because Vibes relies heavily on AST traversal for UI features and LLM surgical updates, the parser must not crash on incomplete human edits.

The philosophy is resilient parsing. It uses robust string manipulation, comment range scanning, and helper methods to ensure that even incomplete classes can yield a usable syntax tree for the editor to analyze.

## Core Logic & Philosophy

**Top-level discovery.** \`findTopLevelDeclaration\` aggressively searches the AST body to figure out what the file is actually exporting. It checks \`ExportDefaultDeclaration\`, \`ExportNamedDeclaration\`, and standalone \`ClassDeclaration\`s to confidently return the primary node (Class or Object) that the LLM is attempting to surgically update.

**Comment bounding.** \`findEffectiveStart\` and \`findEffectiveEnd\` are crucial for the Paste Review dialog. When extracting a method's source code, Acorn's node boundaries only cover the code itself. These methods scan the Acorn comment array to associate preceding JSDoc blocks and trailing comments with the specific method, ensuring they aren't lost when the LLM updates the function body.

**Reference scanning.** \`getReferencedIdentifiers\` walks the entire AST of a code block, harvesting every variable and function name utilized. This powers the \`EditorDataHandler\`'s auto-healing capabilities-allowing it to determine exactly which imports are actually used in the file, and automatically add or remove dependencies as needed.

## Public API

### AST Parsing & Extraction
- \`parseCode(acornInstance, codeText)\` - A highly resilient wrapper around Acorn's \`parse\` method.
- \`findTopLevelDeclaration(ast)\` - Locates the primary structural node (Class or Object) of a file.
- \`findDeclarationByName(ast, name)\` - Locates a specific class or object definition by its identifier.

### Node Intelligence
- \`getClassMemberName(memberNode)\` / \`getPropertyName(propertyNode)\` - Safely extracts the string name of an AST method or property node, handling computed keys and private fields.
- \`findEffectiveStart(node, allComments, codeText, previousEnd)\` / \`findEffectiveEnd(...)\` - Expands an AST node's string boundaries to include its associated comments.
- \`getReferencedIdentifiers(codeText, acornInstance)\` - Returns a Set of all variable/function names referenced within a block of code.`;
    }


  static _doc_overview() {
      return `# AstUtils

The \`AstUtils\` class is a collection of static utility functions for parsing, traversing, and extracting coordinates from JavaScript ASTs.
It acts as the low-level helper for all custom parsing and slicing operations in the editor.`;
    }

  static _doc_boundaries() {
      return `## Resilient Parsing and Comment Bounding

- **Resilient Parsing**: \`parseCode\` wraps Acorn's parse method, automatically retrying with different source-type configurations if a syntax error is encountered.
- **Comment Bounding**: \`findEffectiveStart\` and \`findEffectiveEnd\` scan Acorn's comment array to associate JSDoc and trailing comment ranges with their class members. This prevents comments from being lost during surgical transplants.
- **Strict Code Checking**: \`checkStrictCodeRules\` scans code bodies for violations (unmatched brackets, regexes, complex strings), feeding the warning system.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_boundaries()
      ].join('\n\n');
    }

  
}

