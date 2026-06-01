class HTMLDependencyScanner {

      static scan(htmlContent, basePath) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    
    const dependencies = {
      scripts: [],
      styles: []
    };

    const baseDir = basePath.substring(0, basePath.lastIndexOf('/'));

    const resolvePath = (src) => {
      if (!src) return null;
      if (src.startsWith('http') || src.startsWith('data:')) return src;
      if (src.startsWith('/')) return src;
      
      const parts = baseDir.split('/');
      const srcParts = src.split('/');
      for (const p of srcParts) {
        if (p === '.') continue;
        if (p === '..') {
          parts.pop();
        } else {
          parts.push(p);
        }
      }
      return parts.join('/');
    };

    const scripts = Array.from(doc.querySelectorAll('script'));
    for (const script of scripts) {
      const src = script.getAttribute('src');
      if (src) {
        const resolved = resolvePath(src);
        if (resolved) dependencies.scripts.push(resolved);
      } else if (script.textContent) {
        // Find legacy recursi.loadApp("...")
        const loadAppMatch = script.textContent.match(/recursi\.loadApp\s*\(\s*["']([^"']+)["']\s*\)/);
        if (loadAppMatch && loadAppMatch[1]) {
          const resolved = resolvePath(loadAppMatch[1]);
          if (resolved) dependencies.scripts.push(resolved);
        }
        // Find dynamic imports
        const importMatch = script.textContent.match(/import\s*\(\s*["']([^"']+)["']\s*\)/g);
        if (importMatch) {
          for (const m of importMatch) {
            const pathMatch = m.match(/import\s*\(\s*["']([^"']+)["']\s*\)/);
            if (pathMatch && pathMatch[1]) {
              const resolved = resolvePath(pathMatch[1]);
              if (resolved) dependencies.scripts.push(resolved);
            }
          }
        }
      }
    }

    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href) {
        const resolved = resolvePath(href);
        if (resolved) dependencies.styles.push(resolved);
      }
    }

    return dependencies;
  }


  static _doc_overview() {
      return `# HTMLDependencyScanner

The \`HTMLDependencyScanner\` is a static helper that parses HTML files to extract and resolve script, style, and asset dependencies.
It provides the primary parsing layer for building project indexes from raw \`index.html\` entry points.`;
    }

  static _doc_scanning() {
      return `## Dependency Scanning and Resolution

- **Tag Scanning**: Uses \`DOMParser\` to extract \`<script>\` and \`<link rel="stylesheet">\` tags from the HTML document.
- **Path Resolution**: Normalizes the raw paths against the file's current directory, translating relative links (e.g., \`./src/App.js\` or \`../library/DialogBox.js\`) into absolute, unambiguous Golden Paths.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_scanning()
      ].join('\n\n');
    }

  

  static _doc_HTMLDependencyScanner() {
      return `# HTMLDependencyScanner

## Summary

HTMLDependencyScanner is a static helper that parses HTML files to extract and resolve script, style, and asset dependencies. It provides the primary parsing layer for building project indexes from raw \`index.html\` entry points, extracting relative and absolute references and resolving them to Golden Paths.`;
    }
}