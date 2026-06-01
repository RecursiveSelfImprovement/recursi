class TaskParser {
  parse(text) {
      const tasks = [];
      const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g;
      let match;

      while ((match = codeBlockRe.exec(text)) !== null) {
        const lang = match[1];
        const body = match[2];
        const lines = body.split('\n');
        const firstLine = lines[0].trim();

        const seedMatch = firstLine.match(/^\/\/\s*SEED:(\S+)\s*(.*)/);
        if (seedMatch) {
          const directive = seedMatch[1];
          const arg = seedMatch[2].trim();
          const content = lines.slice(1).join('\n');

          if (directive === 'write-file') {
            tasks.push({ type: 'write-file', path: arg, content, id: this._id() });
          } else if (directive === 'run') {
            tasks.push({ type: 'run-command', command: arg, id: this._id() });
          } else if (directive === 'script') {
            tasks.push({ type: 'run-script', name: arg || 'inline', script: content, id: this._id() });
          } else if (directive === 'message') {
            tasks.push({ type: 'return-message', content: content || arg, id: this._id() });
          }
          continue;
        }

        const pathMatch = firstLine.match(/^\/\/\s+(\/[\w\/.\\-]+\.\w+)\s*(?:\(new\)|\(replace\))?/);
        if (pathMatch) {
          tasks.push({
            type: 'write-file',
            path: pathMatch[1],
            content: lines.slice(1).join('\n'),
            id: this._id(),
          });
          continue;
        }

        if (lang === 'json') {
          try {
            const obj = JSON.parse(body);
            if (obj.type) tasks.push({ ...obj, id: obj.id || this._id() });
          } catch {}
        }
      }

      return tasks;
    }

  _id() {
      return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }

  static getProtocol() {
      return `# Seed Agent Protocol

You are connected to Seed Agent - a local execution loop. Write actions as code blocks with SEED directives.

## Write a file
\`\`\`javascript
// SEED:write-file path/to/file.js
function hello() {
  return 'world';
}
\`\`\`

## Run an inline Node.js script
\`\`\`javascript
// SEED:script check-workspace
const files = readdirSync('.');
console.log(files.join('\\n'));
\`\`\`

## Run a shell command (if enabled)
\`\`\`
// SEED:run node --version
\`\`\`

## Return a message back to the LLM
\`\`\`
// SEED:message
Task complete. Here is the result summary.
\`\`\`

Multiple blocks in one paste are all queued and processed in order.
The runner processes tasks from queue/incoming/, writes results to queue/done/ or queue/failed/.
`;
    }

}

