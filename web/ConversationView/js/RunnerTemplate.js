class RunnerTemplate {
    static getSource() {
      return `
const __dirname = dirname(fileURLToPath(import.meta.url));
const W = __dirname;
const IN   = join(W, 'queue', 'incoming');
const RUN  = join(W, 'queue', 'running');
const DONE = join(W, 'queue', 'done');
const FAIL = join(W, 'queue', 'failed');
const STATE  = join(W, 'state', 'status.json');
const LOGF   = join(W, 'logs', 'runner.log');
const TO_LLM = join(W, 'messages', 'to-llm');
const TEMP   = join(W, 'temp');

let tasksProcessed = 0;

function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }

function log(msg) {
  const line = \`[\${new Date().toISOString()}] \${msg}\\n\`;
  process.stdout.write(line);
  ensureDir(join(W, 'logs'));
  let prev = ''; try { prev = readFileSync(LOGF, 'utf8'); } catch {}
  writeFileSync(LOGF, (prev.length > 48000 ? prev.slice(-40000) : prev) + line);
}

function updateStatus(extra = {}) {
  ensureDir(join(W, 'state'));
  writeFileSync(STATE, JSON.stringify({ runnerActive: true, lastSeen: new Date().toISOString(), tasksProcessed, pid: process.pid, ...extra }, null, 2));
}

function exec(cmd, args, cwd, timeoutMs = 30000) {
  return new Promise(resolve => {
    let out = '', err = '';
    const proc = spawn(cmd, args, { cwd, shell: true });
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    proc.on('close', code => resolve({ code, stdout: out, stderr: err }));
    proc.on('error', e => resolve({ code: -1, stdout: out, stderr: e.message }));
    const t = setTimeout(() => { proc.kill(); resolve({ code: -1, stdout: out, stderr: 'timeout' }); }, timeoutMs);
    proc.on('close', () => clearTimeout(t));
  });
}

async function processTask(filename) {
  const inPath  = join(IN,  filename);
  const runPath = join(RUN, filename);
  try { renameSync(inPath, runPath); } catch { return; }
  let task;
  try { task = JSON.parse(readFileSync(runPath, 'utf8')); }
  catch (e) {
    writeFileSync(runPath, JSON.stringify({ id: filename, error: 'parse: ' + e.message, failed: true }, null, 2));
    renameSync(runPath, join(FAIL, filename)); return;
  }
  log(\`task \${task.type} [\${task.id}]\`);
  const result = { id: task.id, type: task.type };
  try {
    if (task.type === 'write-file') {
      const abs = resolve(W, task.path.replace(/^\\//, ''));
      ensureDir(dirname(abs));
      writeFileSync(abs, task.content);
      result.summary = \`wrote \${task.path}\`;
    } else if (task.type === 'run-script') {
      ensureDir(TEMP);
      const sp = join(TEMP, \`\${task.id}.mjs\`);
      writeFileSync(sp, task.script);
      const r = await exec('node', [sp], W);
      result.summary = \`exit \${r.code}\`;
      result.output = (r.stdout + r.stderr).slice(0, 4000);
      try { unlinkSync(sp); } catch {}
    } else if (task.type === 'run-command') {
      const r = await exec(task.command, [], W);
      result.summary = \`exit \${r.code}\`;
      result.output = (r.stdout + r.stderr).slice(0, 4000);
    } else if (task.type === 'return-message') {
      ensureDir(TO_LLM);
      writeFileSync(join(TO_LLM, \`\${task.id}.txt\`), task.content);
      result.summary = 'message written';
      result.returnMessage = task.content;
    } else {
      result.error = \`unknown type: \${task.type}\`;
    }
    writeFileSync(runPath, JSON.stringify(result, null, 2));
    renameSync(runPath, join(DONE, filename));
  } catch (e) {
    result.error = e.message; result.failed = true;
    writeFileSync(runPath, JSON.stringify(result, null, 2));
    renameSync(runPath, join(FAIL, filename));
    log(\`failed: \${e.message}\`);
  }
  tasksProcessed++;
  updateStatus();
}

async function poll() {
  [IN, RUN, DONE, FAIL].forEach(ensureDir);
  let files; try { files = readdirSync(IN).filter(f => f.endsWith('.json')); } catch { return; }
  for (const f of files) await processTask(f);
}

log('Seed Agent Runner starting...');
updateStatus();
log(\`watching: \${IN}\`);

setInterval(async () => { updateStatus(); await poll(); }, 1200);

process.on('SIGINT', () => {
  log('stopping.');
  try { writeFileSync(STATE, JSON.stringify({ runnerActive: false, lastSeen: new Date().toISOString(), tasksProcessed }, null, 2)); } catch {}
  process.exit(0);
});
`.trim();
    }

}