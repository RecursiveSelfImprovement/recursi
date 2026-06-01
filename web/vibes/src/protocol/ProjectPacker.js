
class ProjectPacker {
  
  constructor(projectName) {
    if (!projectName) {
      throw new Error('ProjectPacker requires a project name.');
    }
    this.projectName = projectName;
    this.jsModuleParser = new JsModuleParser(window.acorn);
    this.codeParser = new CodeParser(window.acorn);
  }

  async packFromMemoryAndDownload(fileMap, fileMetadata, filename) {
    try {
      // Always recalculate metadata from the file map to ensure it's fresh for packing.
      const freshMetadata = await this._calculateMetadata(fileMap);
      const finalHtml = await this._buildHtml(fileMap, freshMetadata);
      const downloadFilename = filename || `${this.projectName}.html`;
      this._triggerDownload(finalHtml, downloadFilename);
    } catch (error) {
      console.error(
        '[ProjectPacker] Failed to build and pack the project:',
        error
      );
      alert(`Packing failed: ${error.message}`);
    }
  }

  _processAndCleanHtmlShell(htmlContent) {
    let initiatorScriptContent = '';
    let importMapContent = '';
    let originalInitiatorScriptForBlueprint = '';

    const initiatorRegex =
      /(<script\s+type\s*=\s*["']module["'][^>]*>)([\s\S]*?)(<\/script>)/i;

    let cleaned = htmlContent.replace(
      /<script\s+type=["']importmap["']>([\s\S]*?)<\/script>/i,
      (match, content) => {
        importMapContent = content.replace(
          /"(\/)?library\//g,
          '"https://recursi.dev/library/'
        );
        return '<!-- [Recusi Packer] Import map extracted. -->';
      }
    );

    cleaned = cleaned.replace(
      initiatorRegex,
      (match, openTag, content, closeTag) => {
        if (/\ssrc\s*=\s*['"]/.test(openTag)) {
          return match;
        }

        originalInitiatorScriptForBlueprint = content.trim();

        initiatorScriptContent = originalInitiatorScriptForBlueprint.replace(
          /import\s+.*?\s+from\s+['"]\..*?['"];?\s*/gs,
          ''
        );

        return '<!-- [Recusi Packer] Initiator script extracted and cleaned. -->';
      }
    );

    cleaned = cleaned.replace(
      /<link\s+rel=["']stylesheet["']\s+href=["']((?!https?:\/\/)[^"']+)["'][^>]*>/gi,
      '<!-- [Recusi Packer] Removed local stylesheet. -->'
    );

    return {
      cleanedHtml: cleaned,
      initiatorScriptContent: originalInitiatorScriptForBlueprint,
      importMapContent,
    };
  }

  _getDefaultHtmlShell() {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Packed Project: ${this.projectName}</title></head><body></body></html>`;
  }

  _triggerDownload(text, filename) {
    const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _isProjectRelative(path) {
    return !path.startsWith('/');
  }

  _getDocPathForSource(sourcePath) {
    // Only handle project-local files for doc association.
    if (!sourcePath.startsWith(`/${this.projectName}/`)) {
      return null;
    }

    const projectRelativePath = sourcePath.substring(
      this.projectName.length + 2
    ); // +2 for the slashes
    const extIndex = projectRelativePath.lastIndexOf('.');
    if (extIndex === -1) {
      return null;
    }

    const ext = projectRelativePath.substring(extIndex + 1);
    const pathWithoutExt = projectRelativePath.substring(0, extIndex);

    // This logic mirrors how documentation paths are generated.
    return `/documentation/${this.projectName}/${pathWithoutExt}_${ext}.md`;
  }

  async _calculateMetadata(fileMap) {
    const metadata = {};
    const docPathMap = new Map();

    // First pass: Calculate code sizes and identify all documentation files.
    for (const [goldenPath, content] of fileMap.entries()) {
      if (goldenPath.startsWith('/documentation/')) {
        docPathMap.set(goldenPath, content);
        continue;
      }
      metadata[goldenPath] = {
        codeSize: content ? content.split('\n').length : 0,
        docSize: 0,
      };
    }

    // Second pass: Associate docs with their source files.
    for (const sourceGoldenPath in metadata) {
      const docGoldenPath = this._getDocPathForSource(sourceGoldenPath);
      if (docGoldenPath && docPathMap.has(docGoldenPath)) {
        const docContent = docPathMap.get(docGoldenPath);
        metadata[sourceGoldenPath].docSize = docContent
          ? docContent.split('\n').length
          : 0;
      }
    }
    return metadata;
  }

  async _buildHtml(fileMap, fileMetadata) {
    let shellHtmlContent;
    let initiatorScriptForHtml = '';
    let initiatorScriptForBlueprint = '';
    let importMapContent = '';
    let importMap = null;

    const assets = [];
    const jsSnippets = [];
    const libraryImports = new Map();

    const blueprint = {
      projectName: this.projectName,
      files: {},
      fileMetadata: fileMetadata || {},
      initiatorScript: '',
    };

    const fileKeys = Array.from(fileMap.keys());
    let htmlPathKey = fileKeys.find(
      (p) => p === `/${this.projectName}/index.html`
    );
    if (!htmlPathKey)
      htmlPathKey = fileKeys.find(
        (p) =>
          p.startsWith(`/${this.projectName}/`) &&
          p.endsWith('.html') &&
          p.split('/').length === 3
      );
    if (!htmlPathKey) htmlPathKey = fileKeys.find((p) => p.endsWith('.html'));

    let originalHtml = htmlPathKey ? fileMap.get(htmlPathKey) : null;

    if (originalHtml) {
      originalHtml = this.codeParser.extractAndStripFooterMetadata(
        originalHtml,
        htmlPathKey
      ).code;
      const processed = this._processAndCleanHtmlShell(originalHtml);
      shellHtmlContent = processed.cleanedHtml;
      initiatorScriptForBlueprint = processed.initiatorScriptContent;
      initiatorScriptForHtml = initiatorScriptForBlueprint.replace(
        /import\s+.*?\s+from\s+['"]\..*?['"];?\s*/gs,
        ''
      );
      importMapContent = processed.importMapContent;
      blueprint.initiatorScript = initiatorScriptForBlueprint;
    } else {
      shellHtmlContent = this._getDefaultHtmlShell();
    }

    if (importMapContent) {
      try {
        const tempMap = JSON.parse(importMapContent);
        if (tempMap.imports) {
          importMap = tempMap.imports;
        }
      } catch (e) {
        console.error('Failed to parse import map:', e);
      }
    }

    const finalScriptProcessingOrder =
      this.jsModuleParser.getTopologicallySortedPaths(fileMap);

    // === TEMPORARY DEBUG LOGGING ===
    console.log(
      '[PACKER DEBUG] finalScriptProcessingOrder:',
      finalScriptProcessingOrder
    );
    console.log('[PACKER DEBUG] fileMap keys:', Array.from(fileMap.keys()));
    // === END TEMPORARY DEBUG LOGGING ===

    for (const goldenPath of finalScriptProcessingOrder) {
      let rawContent = fileMap.get(goldenPath);
      if (!rawContent) continue;

      const content = this.codeParser.extractAndStripFooterMetadata(
        rawContent,
        goldenPath
      ).code;

      const parseResult = this.jsModuleParser.parseForMetadata(
        content,
        goldenPath
      );

      // === TEMPORARY DEBUG LOGGING ===
      console.log(
        '[PACKER DEBUG] File:',
        goldenPath,
        'imports:',
        parseResult.imports,
        'error:',
        parseResult.error
      );
      // === END TEMPORARY DEBUG LOGGING ===

      if (parseResult.imports) {
        parseResult.imports.forEach((imp) => {
          let source = imp.source;
          let resolvedGoldenPath = source;

          if (source.startsWith('.')) {
            const baseUrl = 'file://' + goldenPath;
            const resolvedUrl = new URL(source, baseUrl);
            resolvedGoldenPath = resolvedUrl.pathname;
          }

          // --- THE FIX ---
          // Explicitly treat hosted library imports as external so they are added to the bridge script,
          // even if they are currently loaded in the in-memory fileMap.
          const isLocal =
            fileMap.has(resolvedGoldenPath) &&
            !resolvedGoldenPath.startsWith('/library/');

          if (!isLocal) {
            let bridgeSource = source;

            if (resolvedGoldenPath.startsWith('/library/')) {
              bridgeSource = 'https://sniplets.org' + resolvedGoldenPath;
            } else if (source.startsWith('.')) {
              bridgeSource = resolvedGoldenPath;
            }

            if (!libraryImports.has(bridgeSource)) {
              libraryImports.set(bridgeSource, {
                named: new Set(),
                namespace: new Set(),
                default: new Set(),
              });
            }
            const libImports = libraryImports.get(bridgeSource);
            if (imp.kind === 'namespace') libImports.namespace.add(imp.local);
            else if (imp.kind === 'named') {
              const specifier =
                imp.local !== imp.imported
                  ? `${imp.imported} as ${imp.local}`
                  : imp.imported;
              libImports.named.add(specifier);
            } else if (imp.kind === 'default')
              libImports.default.add(imp.local);
          }
        });
      }

      blueprint.files[goldenPath] = {
        imports: parseResult.imports || [],
        exports: parseResult.exports || [],
      };

      const cleanBody = this.jsModuleParser.generateCleanBody(
        content,
        parseResult,
        { stripExports: true, stripImports: true }
      );

      const finalContent = cleanBody.replace(
        /"\/library\//g,
        '"https://recursi.dev/library/'
      );

      jsSnippets.push(
        `<script data-path="${goldenPath}">${finalContent}<\/script>`
      );
    }

    const finalScriptSet = new Set(finalScriptProcessingOrder);
    for (const [goldenPath, rawContent] of fileMap.entries()) {
      if (
        finalScriptSet.has(goldenPath) ||
        goldenPath === htmlPathKey ||
        goldenPath.startsWith('/library/')
      ) {
        continue;
      }

      // Binary assets (images, fonts) — encode to base64 and skip text pipeline
      if (rawContent instanceof Uint8Array) {
        const mime = this._getMimeType(goldenPath);
        const b64 = this._uint8ToBase64(rawContent);
        assets.push(
          `<textarea data-path="${goldenPath}" data-encoding="base64" data-mime="${mime}" style="display:none;">${b64}<\/textarea>`
        );
        continue;
      }

      const content = this.codeParser.extractAndStripFooterMetadata(
        rawContent,
        goldenPath
      ).code;

      if (goldenPath.endsWith('.css')) {
        assets.push(`<style data-path="${goldenPath}">${content}</style>`);
      } else {
        const safeContent = (content || '').replace(
          /<\/textarea>/gi,
          '<\\/textarea>'
        );
        assets.push(
          `<textarea data-path="${goldenPath}" style="display:none;">${safeContent}</textarea>`
        );
      }
    }

    let finalHtml = shellHtmlContent;
    const importMapTag = importMapContent
      ? `<script type="importmap">${importMapContent}<\/script>`
      : '';
    const headEnd = finalHtml.lastIndexOf('</head>');
    if (headEnd !== -1 && importMapTag) {
      finalHtml =
        finalHtml.slice(0, headEnd) +
        importMapTag +
        '\n' +
        finalHtml.slice(headEnd);
    }

    const bridgeImportStatements = [];
    const allSymbolsToAssign = new Set();

    // === TEMPORARY DEBUG LOGGING ===
    console.log('[PACKER DEBUG] hostedLibraryImports size:', libraryImports.size);
    console.log(
      '[PACKER DEBUG] hostedLibraryImports entries:',
      [...libraryImports.entries()].map(([k, v]) => ({
        src: k,
        named: [...v.named],
        ns: [...v.namespace],
        def: [...v.default],
      }))
    );
    // === END TEMPORARY DEBUG LOGGING ===
    for (const [bridgeSource, imports] of libraryImports.entries()) {
      const cdnPath = bridgeSource;

      imports.namespace.forEach((alias) => {
        bridgeImportStatements.push(`import * as ${alias} from '${cdnPath}';`);
        allSymbolsToAssign.add(alias);
      });

      const namedImports = Array.from(imports.named);
      const defaultImport =
        imports.default.size > 0 ? imports.default.values().next().value : null;

      if (defaultImport || namedImports.length > 0) {
        let importClause = '';
        if (defaultImport) {
          importClause += defaultImport;
          allSymbolsToAssign.add(defaultImport);
        }
        if (defaultImport && namedImports.length > 0) importClause += ', ';
        if (namedImports.length > 0) {
          importClause += `{ ${namedImports.join(', ')} }`;
          namedImports.forEach((nameSpec) => {
            const localName = nameSpec.includes(' as ')
              ? nameSpec.split(' as ')[1].trim()
              : nameSpec.trim();
            allSymbolsToAssign.add(localName);
          });
        }
        bridgeImportStatements.push(
          `import ${importClause} from '${cdnPath}';`
        );
      }
    }

    const bridgeScript = `<script id="recursi-bridge-script" type="module">
${bridgeImportStatements.join('\n    ')}
Object.assign(window, { ${Array.from(allSymbolsToAssign).join(', ')} });
dispatchEvent(new Event('dependencies-ready'));
<\/script>`;

    const initiatorScriptTag = `<script id="recursi-initiator-script">
addEventListener('dependencies-ready', () => {
${initiatorScriptForHtml}
});
<\/script>`;

    const metadataTag = `<textarea id="recursi-metadata" style="display:none;">${JSON.stringify(
      blueprint,
      null,
      2
    )}</textarea>`;

    const bodyEnd = finalHtml.lastIndexOf('</body>');
    if (bodyEnd !== -1) {
      const bodyInjection = [
        metadataTag,
        ...assets,
        ...jsSnippets,
        bridgeScript,
        initiatorScriptTag,
      ].join('\n\n');
      finalHtml =
        finalHtml.slice(0, bodyEnd) +
        '\n' +
        bodyInjection +
        '\n\n' +
        finalHtml.slice(bodyEnd);
    }
    return finalHtml;
  }

  _getMimeType(goldenPath) {
    const ext = goldenPath.slice(goldenPath.lastIndexOf('.')).toLowerCase();
    const MAP = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.bmp': 'image/bmp',
      '.avif': 'image/avif',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };
    return MAP[ext] || 'application/octet-stream';
  }

  _uint8ToBase64(uint8) {
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_standalone_html(),
        this._doc_metadata_handling()
      ].join('\n\n');
    }

  static _doc_overview() {
      return `# ProjectPacker

The \`ProjectPacker\` class is responsible for bundling an entire Vibes project into a single, standalone HTML file.
This enables exporting the project as a self-contained application (sometimes referred to as a "Recursi-Ball") that can be executed in any browser without needing a backend server.`;
    }

  static _doc_standalone_html() {
      return `## Standalone HTML Generation

During the packing process, the system uses a default HTML shell. It then parses the project's file map and embeds the resources directly into the HTML:
- **CSS files** are injected into \`<style>\` tags within the \`<head>\`.
- **JavaScript files** are topologically sorted based on their import/export dependencies to ensure they execute in the correct order, and are injected into \`<script>\` tags.
- **Assets** (images, binary files) are converted to Base64 strings and embedded as \`data:\` URIs.`;
    }

  static _doc_metadata_handling() {
      return `## Asset and Layout Packaging

The packer compiles the active project assets, inline stylesheets, and sorted script payloads, embedding them directly into a single file. It structures them so that the final HTML file runs out-of-the-box on any static hosting environment, requiring no external file loading or network roundtrips.`;
    }


  static _doc_ProjectPacker() {
      return `# ProjectPacker

## Summary

ProjectPacker bundles an entire Vibes project into a single, standalone HTML file. This enables exporting the project as a self-contained application (sometimes referred to as a "Recursi-Ball") that can be executed in any browser without needing a backend server or external build steps.`;
    }
}

