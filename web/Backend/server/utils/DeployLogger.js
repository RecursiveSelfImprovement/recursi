class DeployLogger {
    static create(prefix, deps = {}) {
      const logs = [];
      return {
        logs,
        log(message) {
          console.log(`[${prefix}] ${message}`);
          logs.push(message);
        },
        tagged(tag, message) {
          const line = `${String(tag).padEnd(4)} ${message}`;
          console.log(`[${prefix}] ${line}`);
          logs.push(line);
        },
      };
    }
}