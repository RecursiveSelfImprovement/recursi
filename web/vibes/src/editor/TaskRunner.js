// phase2-managed-migration: internal imports/exports stripped
class TaskRunner {
  constructor(app) {
    this.app = app;
    this.taskQueue = [];
    this.isProcessing = false;
  }

  enqueue(description, taskFunction) {
    this.taskQueue.push({ description, run: taskFunction });

    if (this.app.chatterinessLevel >= 5) {
      console.log(`[TaskRunner] Enqueued: ${description}`);
    }

    // If the queue isn't already being processed, start it.
    if (!this.isProcessing) {
      this._processQueue();
    }
  }

  async _processQueue() {
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      if (this.app.chatterinessLevel >= 5) {
        console.log('[TaskRunner] Queue empty. Processing finished.');
      }
      this.app.uiManager.setStatus('Ready.', false, 1500);
      return;
    }

    this.isProcessing = true;
    const task = this.taskQueue.shift();

    this.app.uiManager.setStatus(`Running: ${task.description}...`);

    if (this.app.chatterinessLevel >= 4) {
      console.log(`[TaskRunner] Running: ${task.description}`);
    }

    try {
      // Use a timeout to yield to the browser's event loop,
      // allowing UI updates to happen before the task runs.
      await new Promise((resolve) => setTimeout(resolve, 10));

      await task.run();

      if (this.app.chatterinessLevel >= 4) {
        console.log(`[TaskRunner] Completed: ${task.description}`);
      }
    } catch (error) {
      console.error(`[TaskRunner] Error in task "${task.description}":`, error);
      this.app.uiManager.setStatus(`Error in task: ${task.description}`, true);
      // Stop processing on error to prevent cascade failures.
      this.isProcessing = false;
      this.taskQueue = []; // Clear the queue
      return;
    }

    // Process the next item in the queue.
    // Using setTimeout ensures we don't create a deep, blocking call stack.
    setTimeout(() => this._processQueue(), 10);
  }

    


  static _doc_overview() {
      return "### TaskRunner\n\nSequentially processes heavy background tasks with short delays to keep the main thread responsive, avoiding browser freezes during bulk parsing or files generation.";
    }

  static _doc_queue() {
      return `## Non-Blocking Queuing and Cascade Prevention\n\n- **Non-Blocking Execution**: Enqueues functions and processes them in order. Right before running each task, it uses a 10ms \`setTimeout\` to yield control back to the browser. This allows the layout engine to paint status bar updates smoothly and prevents dropping animation frames.\n- **Cascade Prevention**: If any queued task throws an exception, the manager logs the error and immediately clears the entire remaining queue, preventing faulty scripts from continuing and corrupting subsequent files.`;
    }

  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  
}

