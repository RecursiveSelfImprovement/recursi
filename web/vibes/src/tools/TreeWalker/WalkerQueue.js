class WalkerQueue {

  constructor(env) {
    this.env = env;
    this.queue = [];
  }
  
  move(source, dest) {
    this.queue.push({ type: 'move', source, dest });
  }
  
  delete(path) {
    this.queue.push({ type: 'delete', path });
  }
  
  write(path, content, options = {}) {
    this.queue.push({ type: 'write', path, content, options });
  }
  
  async flush() {
    let processed = 0;
    for (const task of this.queue) {
      try {
        if (task.type === 'move') {
          if (this.env.moveFile) {
            await this.env.moveFile(task.source, task.dest);
            processed++;
          } else {
            this.env.log('[WalkerQueue] moveFile not supported in this env');
          }
        } else if (task.type === 'delete') {
          if (this.env.deleteFile) {
            await this.env.deleteFile(task.path);
            processed++;
          } else {
            this.env.log('[WalkerQueue] deleteFile not supported in this env');
          }
        } else if (task.type === 'write') {
          if (this.env.writeFile) {
            await this.env.writeFile(task.path, task.content, task.options);
            processed++;
          } else {
            this.env.log('[WalkerQueue] writeFile not supported in this env');
          }
        }
      } catch (e) {
        this.env.log(`[WalkerQueue] Error processing ${task.type} for ${task.path || task.source}: ${e.message}`);
      }
    }
    this.queue = [];
    return processed;
  }

}