class TreeWalkerPlaygroundScripts {

  static astMethodTourSlot() {
    return [
      "async function onFile(node, env, walker) {",
      "  if (!node.path.endsWith('.js')) return;",
      "  env.highlightNode(node.path, 'current', { label: 'AST', title: node.path });",
      "  const acorn = env.acorn || window.acorn;",
      "  if (!acorn) { env.log('No Acorn available'); return; }",
      "  const ast = acorn.parse(node.content || '', { ecmaVersion: 'latest', sourceType: 'script' });",
      "  for (const top of ast.body || []) {",
      "    if (top.type !== 'ClassDeclaration') continue;",
      "    const className = top.id && top.id.name || '(anonymous)';",
      "    for (const item of top.body.body || []) {",
      "      if (item.type !== 'MethodDefinition') continue;",
      "      const name = item.key.name || item.key.value || '(computed)';",
      "      env.highlightNode(node.path, 'paused', { label: name.slice(0, 6).toUpperCase(), title: className + '.' + name });",
      "      env.log(className + '.' + name + ' range ' + item.start + '..' + item.end);",
      "      await new Promise(resolve => setTimeout(resolve, 450));",
      "    }",
      "  }",
      "}",
    ].join("\n");
  }

  static htmlDependencyMetadataSlot() {
    return [
      "async function onFile(node, env, walker) {",
      "  if (!node.path.endsWith('.html')) return;",
      "  env.highlightNode(node.path, 'paused', { label: 'HTML', title: 'HTML dependency pause' });",
      "  const doc = new DOMParser().parseFromString(node.content || '', 'text/html');",
      "  const deps = [];",
      "  const dir = node.path.slice(0, node.path.lastIndexOf('/'));",
      "  const normalize = value => {",
      "    if (!value || /^(https?:)?\\/\\//i.test(value) || value.startsWith('data:')) return value;",
      "    const parts = (dir + '/' + value).split('/');",
      "    const out = [];",
      "    for (const part of parts) {",
      "      if (!part || part === '.') continue;",
      "      if (part === '..') out.pop();",
      "      else out.push(part);",
      "    }",
      "    return '/' + out.join('/');",
      "  };",
      "  for (const script of Array.from(doc.querySelectorAll('script[src]'))) {",
      "    deps.push({ kind: 'script', raw: script.getAttribute('src'), path: normalize(script.getAttribute('src')) });",
      "  }",
      "  for (const link of Array.from(doc.querySelectorAll('link[href]'))) {",
      "    const rel = String(link.getAttribute('rel') || '').toLowerCase();",
      "    deps.push({ kind: rel || 'link', raw: link.getAttribute('href'), path: normalize(link.getAttribute('href')) });",
      "  }",
      "  env.log(node.path + ' deps: ' + deps.map(d => d.path).join(', '));",
      "  const safe = node.path.slice(node.path.lastIndexOf('/') + 1).replace(/[^\\w.-]+/g, '_').replace(/\\./g, '_');",
      "  const metaPath = dir + '/' + safe + '.meta.json';",
      "  env.writeFile(metaPath, JSON.stringify({",
      "    schema: 2,",
      "    sourcePath: node.path,",
      "    generatedAt: new Date().toISOString(),",
      "    generatedBy: 'TreeWalkerPlaygroundScripts.htmlDependencyMetadataSlot',",
      "    dependencies: deps",
      "  }, null, 2) + '\\n', { reason: 'programmaticWrite' });",
      "  env.highlightNode(metaPath, 'programmaticWrite', { label: 'META', title: metaPath });",
      "}",
    ].join("\n");
  }

  static cleanupScratchSlot() {
    return [
      "async function onFile(node, env, walker) {",
      "  if (!node.path.includes('/scratch/') && !node.path.endsWith('.tmp')) return;",
      "  env.highlightNode(node.path, 'error', { label: 'DEL', title: 'scratch cleanup candidate' });",
      "  env.log('scratch cleanup candidate: ' + node.path);",
      "}",
    ].join("\n");
  }

}
