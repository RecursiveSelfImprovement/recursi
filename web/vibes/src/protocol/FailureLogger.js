class FailureLogger {

  static _run(env) {
    return { ok: true, className: "FailureLogger" };
  }

  static makeEntry(data = {}) {
    return {
      ts: new Date().toISOString(),
      source: data.source || 'unknown',
      type: data.type || 'unknown',
      filePath: data.filePath || null,
      message: data.message || null,
      details: data.details || null
    };
  }

  static appendToText(existingText, entry) {
    const line = JSON.stringify(entry);
    return (existingText ? String(existingText).replace(/\s*$/, "") + "\n" : "") + line + "\n";
  }

}

/* recursi-meta
{
  "schema": 1,
  "lines": 31,
  "provides": [],
  "deps": []
}
recursi-meta */
