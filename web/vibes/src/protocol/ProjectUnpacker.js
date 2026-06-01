class ProjectUnpacker {
  
  constructor() {
    this.domParser = new DOMParser();
  }

  _report(step, message, data = {}) {
    // Only report if the logLevel is high enough. Level 1 is for basic flow.
    if (this.logLevel < 1) return;

    if (window.__sanity_check_report) {
      const payload = { unpackId: this.unpackId, ...data };
      // Use chatteriness level 9 for these debug logs.
      window.__sanity_check_report(`unpacker:v2:${step}`, message, payload, 9);
    }
  }

  _reconstructModule(cleanBody, metadata) {
    const importStrings = (metadata.imports || [])
      .map((imp) => {
        // FIX: No resolution is needed here anymore. The packer now provides
        // absolute golden paths in imp.source, so we use them directly.
        if (imp.kind === 'named') {
          const specifier =
            imp.local === imp.imported
              ? imp.local
              : `${imp.imported} as ${imp.local}`;
          return `import { ${specifier} } from '${imp.source}';`;
        }
        if (imp.kind === 'default') {
          return `import ${imp.local} from '${imp.source}';`;
        }
        if (imp.kind === 'namespace') {
          return `import * as ${imp.local} from '${imp.source}';`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n');

    let codeWithExports = cleanBody;

    if (Array.isArray(metadata.exports)) {
      metadata.exports.forEach((exp) => {
        const isDefault = exp.type === 'ExportDefaultDeclaration';
        const exportPrefix = isDefault ? 'export default ' : 'export ';
        const declarationWithName = new RegExp(
          `(class|function)\\s+${exp.name}`
        );

        if (isDefault && !declarationWithName.test(codeWithExports)) {
          const declarationWithoutName = /(class|function)/;
          if (!codeWithExports.trim().startsWith('export default')) {
            codeWithExports = codeWithExports.replace(
              declarationWithoutName,
              `export default $1`
            );
          }
          return;
        }
        const regex = new RegExp(
          `((?:async\\s+)?(class|function|const|let|var))(\\s+${exp.name})`
        );
        if (regex.test(codeWithExports)) {
          codeWithExports = codeWithExports.replace(
            regex,
            `${exportPrefix}$1$3`
          );
        }
      });
    }
    const separator = importStrings && codeWithExports.trim() ? '\n\n' : '';
    return `${importStrings}${separator}${codeWithExports}`;
  }

  unpack(htmlContent) {
    const fileMap = new Map();
    const doc = this.domParser.parseFromString(htmlContent, 'text/html');
    const metadataNode = doc.getElementById('recursi-metadata');
    if (!metadataNode || !metadataNode.value) {
      return { error: 'Missing recursi-metadata.' };
    }

    let blueprint;
    try {
      blueprint = JSON.parse(metadataNode.value);
    } catch (e) {
      return { error: 'Invalid metadata JSON.' };
    }

    const projectName = blueprint.projectName || 'unpacked-project';

    doc
      .querySelectorAll(
        'style[data-path], textarea[data-path], script[data-path]'
      )
      .forEach((node) => {
        const path = node.dataset.path; // This is already a Golden Path
        if (!path) return;

        if (node.tagName.toLowerCase() === 'script') {
          const cleanBody = node.textContent;
          const metadata = blueprint.files[path];
          fileMap.set(
            path,
            metadata ? this._reconstructModule(cleanBody, metadata) : cleanBody
          );
        } else {
          if (
            node.tagName.toLowerCase() === 'textarea' &&
            node.dataset.encoding === 'base64'
          ) {
            // Binary asset packed by ProjectPacker — decode back to Uint8Array
            const b64 = node.value;
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            fileMap.set(path, bytes);
          } else {
            fileMap.set(
              path,
              node.tagName.toLowerCase() === 'textarea'
                ? node.value
                : node.textContent
            );
          }
        }
      });

    // Clean up the HTML shell to prepare it for becoming index.html
    doc.getElementById('recursi-metadata')?.remove();
    doc.querySelectorAll('[data-path]')?.forEach((n) => n.remove());
    doc.getElementById('recursi-bridge-script')?.remove();
    doc.getElementById('recursi-initiator-script')?.remove();

    // Find and replace the initiator script placeholder
    const treeWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
    let placeholderNode;
    while ((placeholderNode = treeWalker.nextNode())) {
      if (
        placeholderNode.nodeValue.includes(
          '[Recusi Packer] Initiator script extracted'
        )
      ) {
        break;
      }
    }

    if (placeholderNode && blueprint.initiatorScript) {
      const originalScript = document.createElement('script');
      originalScript.type = 'module';
      originalScript.textContent = blueprint.initiatorScript;
      placeholderNode.parentNode.replaceChild(originalScript, placeholderNode);
    }

    const cleanHtmlShell = doc.documentElement.outerHTML;
    const indexPath = `/${projectName}/index.html`;
    fileMap.set(indexPath, `<!DOCTYPE html>\n${cleanHtmlShell}`);

    return {
      fileMap, // Keys are Golden Paths
      fileMetadata: blueprint.fileMetadata || null,
      projectName: projectName,
      error: null,
    };
  }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_extraction(),
        this._doc_reconstruction()
      ].join('\n\n');
    }

  static _doc_overview() {
      return `# ProjectUnpacker

The \`ProjectUnpacker\` is the counterpart to \`ProjectPacker\`.
It takes a single, self-contained HTML file (a "Recursi-Ball") and unpacks it back into a fully structured, multi-file project workspace that can be edited in Vibes.`;
    }

  static _doc_extraction() {
      return `## Resource Extraction

When unpacking, the class parses the incoming HTML string. It looks for embedded \`<style>\` tags, \`<script>\` blocks, and other inline resources, splitting them back out into individual virtual files (e.g. \`.css\` and \`.js\` files) mapped to their original paths.`;
    }

  static _doc_reconstruction() {
      return `## Workspace Reconstruction

The unpacker reads the injected resource payloads. It decodes base64-encoded assets (like images or fonts) back into binary Uint8Arrays, reconstructs the files, and restores the original clean class topology directly into the virtual workspace.`;
    }


  static _doc_ProjectUnpacker() {
      return `# ProjectUnpacker

## Summary

ProjectUnpacker is the counterpart to ProjectPacker. It takes a single, self-contained HTML file (a "Recursi-Ball") and unpacks it back into a fully structured, multi-file project workspace (HTML, CSS, JS, and asset maps) that can be instantly edited and run in Vibes.`;
    }
}

