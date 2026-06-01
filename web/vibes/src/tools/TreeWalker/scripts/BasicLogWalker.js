class BasicLogWalker {

    async onDir(dirPath, env, walker) {
      if (dirPath.includes('node_modules') || dirPath.includes('.git')) return { skip: true };
    }

    async onFile(node, env, walker) {
      if (node.path.endsWith('.js')) {
        env.highlightNode(node.path, 'visited', { label: 'JS', title: 'Found JS file' });
        env.log('Visited: ' + node.path);
        env.addResult({ path: node.path, lines: node.content ? node.content.split('\n').length : 0 });
      }
    }

    async onExport(results, env, walker) {
      env.log('Walk complete. Visited ' + results.length + ' JS files.');
      const totalLines = results.reduce((sum, r) => sum + r.lines, 0);
      env.log('Total lines: ' + totalLines);
    }

}