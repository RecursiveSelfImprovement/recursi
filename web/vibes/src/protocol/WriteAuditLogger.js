class WriteAuditLogger {
  
  static set enabled(v) { this._enabled = v; }
  static set directoryHandle(v) { this._directoryHandle = v; }
  static set sequence(v) { this._sequence = v; }
  static set sessionId(v) { this._sessionId = v; }
  static async chooseLogDirectory() {
    if (!window.showDirectoryPicker) {
      throw new Error("File System Access API is not available in this browser.");
    }
    this.directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    this.enabled = true;
    await this.log({ type: "audit-session-started", message: "Write audit logging enabled." });
    return { ok: true, sessionId: this.sessionId };
  }

  static disable() {
    this.enabled = false;
  }

  static _safeName(value) {
    return String(value || "")
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "event";
  }

  static stats(text) {
    const value = String(text ?? "");
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return {
      chars: value.length,
      lines: value ? value.split("\\n").length : 0,
      hash: (h >>> 0).toString(16).padStart(8, "0"),
    };
  }

  static methodStats(source) {
    return {
      ...this.stats(source),
      firstLine: String(source || "").split("\\n")[0] || "",
    };
  }

  static async log(event = {}) {
    if (!this.enabled || !this.directoryHandle) {
      return { ok: false, skipped: true, reason: "audit logging disabled" };
    }
    const now = new Date().toISOString();
    const seq = String(++this.sequence).padStart(5, "0");
    const type = this._safeName(event.type || "write-event");
    const fileName = `${now.replace(/[:.]/g, "-")}_${seq}_${type}.json`;
    const payload = {
      schema: 1,
      auditMarker: "WRITE_AUDIT_LOG_V1",
      sessionId: this.sessionId,
      sequence: this.sequence,
      time: now,
      location: window.location.href,
      ...event,
    };
    const handle = await this.directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    return { ok: true, fileName, sequence: this.sequence };
  }

  static async logWrite(options = {}) {
    const beforeText = options.beforeText ?? "";
    const afterText = options.afterText ?? "";
    const readbackText = options.readbackText ?? "";
    return this.log({
      type: "write-operation",
      mode: options.mode || null,
      operation: options.operation || null,
      path: options.path || null,
      fileStats: {
        before: this.stats(beforeText),
        intendedAfter: this.stats(afterText),
        readback: this.stats(readbackText),
        changed: String(beforeText) !== String(afterText),
        exactReadback: String(readbackText) === String(afterText),
      },
      methodStats: {
        before: options.methodBefore ? this.methodStats(options.methodBefore) : null,
        intendedAfter: options.methodAfter ? this.methodStats(options.methodAfter) : null,
        readback: options.methodReadback ? this.methodStats(options.methodReadback) : null,
      },
      metadata: {
        before: options.metadataBefore || null,
        after: options.metadataAfter || null,
      },
      result: options.result || null,
      notes: options.notes || null,
    });
  }

}
