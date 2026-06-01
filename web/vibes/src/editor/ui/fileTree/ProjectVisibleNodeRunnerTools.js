class ProjectVisibleNodeRunnerTools {

  constructor(options = {}) {
      this.manager = options.manager || null;
      this._polling = false;
    }

  visibleNodeRunnerSource(manager = this.manager) {
      const inlineRunner = `const fs = require('fs');
const path = require('path');

const QUEUE_DIR = path.join(__dirname, 'queue');
const OUTBOX_DIR = path.join(__dirname, 'outbox');
const RAN_DIR = path.join(__dirname, 'ran-programs');
const FAILED_DIR = path.join(__dirname, 'failed-programs');

[QUEUE_DIR, OUTBOX_DIR, RAN_DIR, FAILED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log('🚀 VibesNodeRunner started.');
console.log('📂 Watching queue: ' + QUEUE_DIR);

async function processQueue() {
  try {
    const files = fs.readdirSync(QUEUE_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const jobPath = path.join(QUEUE_DIR, file);
      console.log('\\n📦 Processing job: ' + file);
      
      let job;
      try {
        const content = fs.readFileSync(jobPath, 'utf-8');
        job = JSON.parse(content);
      } catch (e) {
        console.error('❌ Failed to parse ' + file + ':', e.message);
        fs.renameSync(jobPath, path.join(FAILED_DIR, file));
        continue;
      }

      const outboxPath = path.join(OUTBOX_DIR, file);
      const envObj = {
        rootDir: path.resolve(__dirname, '..'),
        log: (...args) => console.log('   [Job Log]', ...args),
        writeFile: (name, text) => fs.writeFileSync(path.join(__dirname, '..', name), text)
      };

      try {
        // Dynamically instantiate the class sent from the browser
        const scriptWrapper = job.code + '\\nreturn ' + job.className + ';';
        const Ctor = new Function(scriptWrapper)();
        const instance = new Ctor();
        
        if (typeof instance[job.method] !== 'function') {
          throw new Error('Method ' + job.method + ' not found on class ' + job.className);
        }

        // Execute the job
        const output = await instance[job.method](envObj, job.args || {});
        
        const result = {
          id: job.id,
          status: 'success',
          completedAt: new Date().toISOString(),
          output: output
        };
        
        fs.writeFileSync(outboxPath, JSON.stringify(result, null, 2));
        fs.renameSync(jobPath, path.join(RAN_DIR, file));
        console.log('✅ Job ' + job.id + ' completed successfully.');
      } catch (error) {
        console.error('❌ Job ' + job.id + ' failed:', error);
        const result = {
          id: job.id,
          status: 'error',
          completedAt: new Date().toISOString(),
          error: error.stack || error.message || String(error)
        };
        fs.writeFileSync(outboxPath, JSON.stringify(result, null, 2));
        fs.renameSync(jobPath, path.join(FAILED_DIR, file));
      }
    }
  } catch (err) {
    console.error('Error reading queue:', err);
  }
}

// Poll every 1000ms
setInterval(processQueue, 1000);
processQueue();
`;
      return Promise.resolve(inlineRunner);
    }

  visibleNodeRunnerSmokeJobSource() {
      return `class VibesNodeRunnerSmokeTest {
  async run(env, args = {}) {
    env.log('VibesNodeRunner smoke test is active.');
    env.writeFile('VibesNodeRunnerSmokeTest.md', '# Smoke Test\\n\\nGenerated at: ' + new Date().toISOString());
    return { message: 'hello from node!' };
  }
}`;
    }

  async installVisibleNodeRunnerForWorkspaceRoot(manager = this.manager, rootId, store) {
      // 1. The entry point (Non-conforming loader, as minimal as possible)
      const bootJs = `const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');

function loadClass(filename, className) {
  const code = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  return new Function(code + '\\nreturn ' + className + ';')();
}

console.log('[VibesNodeRunner] Loading pure classes...');
const RunnerCapsule = loadClass('RunnerCapsule.js', 'RunnerCapsule');

const runner = new RunnerCapsule();
// Pass native Node capabilities into the runner's environment
runner.run({ fs, path, os, child_process, baseDir: __dirname }).catch(console.error);
`;

      // 2. The Runner Capsule (Pure class)
      const runnerCapsuleJs = `class RunnerCapsule {
  async run(env) {
    this.fs = env.fs;
    this.path = env.path;
    this.baseDir = env.baseDir;
    this.nodeEnv = env; // Pass native modules down to jobs

    this.queueDir = this.path.join(this.baseDir, 'queue');
    this.outboxDir = this.path.join(this.baseDir, 'outbox');
    this.ranDir = this.path.join(this.baseDir, 'ran-programs');
    this.failedDir = this.path.join(this.baseDir, 'failed-programs');

    [this.queueDir, this.outboxDir, this.ranDir, this.failedDir].forEach(d => {
      if (!this.fs.existsSync(d)) this.fs.mkdirSync(d, { recursive: true });
    });

    console.log("RunnerCapsule booted. Polling for jobs...");
    setInterval(() => this.processQueue(), 1000);
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const files = this.fs.readdirSync(this.queueDir);
      for (const file of files) {
        if (file === 'KEEP.txt') continue;
        if (!file.endsWith('.js')) continue;
        await this.processJob(file);
      }
    } catch (e) {
      console.error("Queue error:", e);
    } finally {
      this.isProcessing = false;
    }
  }

  async processJob(filename) {
    const filePath = this.path.join(this.queueDir, filename);
    console.log('\\nLoading job capsule: ' + filename);

    let success = false;
    const className = filename.replace('.js', '');
    try {
      const code = this.fs.readFileSync(filePath, 'utf8');
      const JobClass = new Function(code + "\\nreturn typeof " + className + " !== 'undefined' ? " + className + " : null;")();

      if (!JobClass) {
        throw new Error("Class " + className + " not found in file.");
      }

      const jobEnv = {
        ...this.nodeEnv,
        jobId: filename,
        log: (...args) => console.log('[' + className + ']', ...args)
      };

      const instance = new JobClass();
      if (typeof instance.run !== 'function') {
        throw new Error("Job capsule missing run(env) method.");
      }

      // Execute the job
      const output = await instance.run(jobEnv);
      const result = { id: className, status: 'success', output };
      
      // Save data to outbox
      this.fs.writeFileSync(this.path.join(this.outboxDir, className + '.json'), JSON.stringify(result, null, 2));
      success = true;

    } catch (err) {
      console.error("Job failed: " + filename, err);
      const errorMsg = err.stack || err.message || String(err);
      const result = { id: className, status: 'error', error: errorMsg };
      this.fs.writeFileSync(this.path.join(this.outboxDir, className + '.json'), JSON.stringify(result, null, 2));
    } finally {
      const targetDir = success ? this.ranDir : this.failedDir;
      this.fs.renameSync(filePath, this.path.join(targetDir, filename));
      console.log('Moved ' + filename + ' to ' + (success ? 'ran-programs' : 'failed-programs') + '.');
    }
  }
}`;

      const files = {
        [`${rootId}/VibesNodeRunner/boot.js`]: bootJs,
        [`${rootId}/VibesNodeRunner/RunnerCapsule.js`]: runnerCapsuleJs,
        [`${rootId}/VibesNodeRunner/README.md`]: "# VibesNodeRunner\nRun this from the workspace root:\n\n```bash\nnode VibesNodeRunner/boot.js\n```\n",
        [`${rootId}/VibesNodeRunner/queue/KEEP.txt`]: "Queue folder for pending jobs.\n",
        [`${rootId}/VibesNodeRunner/outbox/KEEP.txt`]: "Outbox folder for job results.\n",
        [`${rootId}/VibesNodeRunner/ran-programs/KEEP.txt`]: "Completed jobs are archived here.\n",
        [`${rootId}/VibesNodeRunner/failed-programs/KEEP.txt`]: "Failed jobs are archived here.\n"
      };

      const result = { rootId, written: 0, failed: 0, errors: [] };

      for (const [path, content] of Object.entries(files)) {
        try {
          await store.set(path, content);
          result.written++;
        } catch (error) {
          result.failed++;
          result.errors.push(path + ": " + (error.message || error));
        }
      }
      
      this.startOutboxPolling(manager, rootId, store);
      return result;
    }

  async enqueueVisibleNodeRunnerSmokeJob(manager = this.manager, rootId, store) {
      const id = "SmokeTestCapsule_" + Date.now();
      const path = `${rootId}/VibesNodeRunner/queue/${id}.js`;

      const code = `class ${id} {
  async run(env) {
    env.log('VibesNodeRunner smoke test is active.');
    
    // Test native file system access by writing a file to the workspace root
    const rootPath = env.path.join(env.baseDir, '..', 'SmokeTestResult.md');
    env.fs.writeFileSync(rootPath, '# Smoke Test\\n\\nGenerated at: ' + new Date().toISOString() + '\\nBy: ' + env.jobId);
    
    return { message: 'hello from Node!', rootPathWritten: rootPath };
  }
}`;

      await store.set(path, code);
      this.startOutboxPolling(manager, rootId, store);
      return { ok: true, path, id };
    }

  showVisibleNodeRunnerOutbox(manager = this.manager, rootId, store) {
      const paths = Array.from(store.keys ? store.keys() : []).filter(p => p.startsWith(`${rootId}/VibesNodeRunner/outbox/`));
      if (paths.length === 0) {
        manager.app?.uiManager?.setStatus("Outbox is empty.", false, 3000);
        return;
      }
      const content = document.createElement("div");
      content.style.padding = "10px";
      paths.forEach(p => {
          const pre = document.createElement("pre");
          pre.style = "background: #111; color: #0f0; padding: 10px; margin-bottom: 10px; border-radius: 6px; overflow: auto; max-height: 300px;";
          pre.textContent = p + "\n\n" + store.get(p);
          content.appendChild(pre);
      });
      
      // OBSOLETE: The DialogBox class is obsolete and has been replaced by the functional UITools.makeDialog API.
      // This legacy architecture is scheduled to be completely trashed on the next pass.
      window.UITools.makeDialog({ title: "Node Runner Outbox", contentElement: content, width: '800px', height: '600px' });
    }

  workspaceLabelForStore(rootId, store) {
      return rootId + ' - Node Runner Supported';
    }


  async enqueueScreenshotOrganizerJob(manager = this.manager, rootId, store) {
      const id = "ScreenshotOrganizerCapsule";
      const path = `${rootId}/VibesNodeRunner/queue/${id}.js`;

      const code = `class ScreenshotOrganizerCapsule {
  async run(env) {
    const desktopPath = env.path.join(env.os.homedir(), 'Desktop');
    const targetFolder = env.path.join(desktopPath, 'Organized Screenshots');

    env.log('Scanning Desktop path: ' + desktopPath);

    if (!env.fs.existsSync(targetFolder)) {
      env.fs.mkdirSync(targetFolder);
      env.log('Created directory: ' + targetFolder);
    }

    const files = env.fs.readdirSync(desktopPath);
    let count = 0;

    for (const file of files) {
      if ((file.startsWith('Screen Shot') || file.startsWith('Screenshot')) && file.endsWith('.png')) {
        count++;
        const ext = env.path.extname(file);
        const newName = 'screenshot_' + String(count).padStart(3, '0') + ext;
        
        const oldPath = env.path.join(desktopPath, file);
        const newPath = env.path.join(targetFolder, newName);

        env.fs.renameSync(oldPath, newPath);
        env.log('Moved: ' + file + ' -> ' + newName);
      }
    }

    if (count > 0) {
      const command = process.platform === 'darwin' ? 'open "' + targetFolder + '"' : 'explorer "' + targetFolder + '"';
      env.child_process.exec(command);
    }

    return { organizedCount: count, targetFolder };
  }
}`;

      await store.set(path, code);
      this.startOutboxPolling(manager, rootId, store);
      return { ok: true, path, id };
    }

  startOutboxPolling(manager, rootId, store) {
      if (this._polling) return;
      this._polling = true;
      
      setInterval(async () => {
        if (!store || !store.keys) return;
        const paths = Array.from(store.keys()).filter(p => p.startsWith(`${rootId}/VibesNodeRunner/outbox/`) && p.endsWith('.json'));
        
        for (const p of paths) {
          try {
             const content = store.get(p);
             if (!content) continue;
             
             const result = JSON.parse(content);
             await store.delete(p);
             
             let outputText = `### Node Job Completed: ${result.id}\n\n`;
             if (result.status === 'error') {
               outputText += `**Status:** ❌ ERROR\n\n\`\`\`text\n${result.error}\n\`\`\``;
               manager.app?.uiManager?.setStatus(`Node job failed: ${result.id}`, true);
             } else {
               outputText += `**Status:** ✅ SUCCESS\n\n**Output:**\n\`\`\`json\n${JSON.stringify(result.output, null, 2)}\n\`\`\``;
               manager.app?.uiManager?.setStatus(`Node job completed: ${result.id}`, false, 3000);
             }
             
             if (manager.app?.uiManager?.showInOutputTab) {
               manager.app.uiManager.showInOutputTab(outputText);
             }
             if (manager.app?.tabManager?.setActiveTab) {
               manager.app.tabManager.setActiveTab('output-tab');
             }
          } catch (err) {}
        }
      }, 2000);
    }
}