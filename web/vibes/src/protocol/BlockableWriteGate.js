class BlockableWriteGate {
  
  static get requestPollMs() {
    return this._requestPollMs ?? 750;
  }

  static get defaultTimeoutMs() { 
    return this._defaultTimeoutMs ?? 10 * 60 * 1000; 
  }

  static _id() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rand = Math.random().toString(36).slice(2, 8);
    return `${stamp}-${rand}`;
  }

  static _stats(text) {
    if (window.DirectApiWriteAuditor) return window.DirectApiWriteAuditor.stats(text);
    if (window.WriteAuditLogger) return window.WriteAuditLogger.stats(text);
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

  static _snip(text, max = 8000) {
    const value = String(text ?? "");
    if (value.length <= max) return value;
    const half = Math.floor(max / 2);
    return value.slice(0, half) + `\\n\\n/* SNIPPED ${value.length - max} CHARS */\\n\\n` + value.slice(-half);
  }

  static async _ensureAuditFolder() {
    if (!window.WriteAuditLogger) {
      throw new Error("WriteAuditLogger is not loaded.");
    }

    if (!window.WriteAuditLogger.enabled || !window.WriteAuditLogger.directoryHandle) {
      await window.WriteAuditLogger.chooseLogDirectory();
    }

    return window.WriteAuditLogger.directoryHandle;
  }

  static async _dir(parent, name) {
    return parent.getDirectoryHandle(name, { create: true });
  }

  static async _writeJson(dirHandle, name, payload) {
    const fileHandle = await dirHandle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    return { ok: true, name };
  }

  static async _readJsonIfExists(dirHandle, name) {
    try {
      const fileHandle = await dirHandle.getFileHandle(name);
      const file = await fileHandle.getFile();
      return JSON.parse(await file.text());
    } catch (error) {
      return null;
    }
  }

  static async _waitForDecision(decisionsDir, fileName, timeoutMs) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const decision = await this._readJsonIfExists(decisionsDir, fileName);
      if (decision) return decision;
      await new Promise(resolve => setTimeout(resolve, this.requestPollMs));
    }

    return {
      decision: "timeout",
      approved: false,
      reason: `No decision received within ${timeoutMs}ms`,
    };
  }

  static async proposeDirectApiWrite({
    path,
    afterText,
    operation = "blockable-direct-api-write",
    block = true,
    timeoutMs = this.defaultTimeoutMs,
    notes = null,
    methodBefore = null,
    methodAfter = null,
    metadataBefore = null,
    metadataAfter = null,
  } = {}) {
    if (!path) throw new Error("proposeDirectApiWrite requires path.");
    if (afterText === undefined || afterText === null) throw new Error("proposeDirectApiWrite requires afterText.");
    if (!window.DirectApiWriteAuditor) throw new Error("DirectApiWriteAuditor is not loaded.");

    const root = await this._ensureAuditFolder();
    const requestsDir = await this._dir(root, "write-requests");
    const decisionsDir = await this._dir(root, "write-decisions");

    const beforeRead = await window.DirectApiWriteAuditor.readFile(path);
    const beforeText = beforeRead.content || "";
    const requestId = this._id();
    const fileName = `${requestId}.json`;

    const request = {
      schema: 1,
      auditMarker: "BLOCKABLE_WRITE_REQUEST_V1",
      requestId,
      time: new Date().toISOString(),
      path,
      operation,
      block,
      status: block ? "pending" : "audit-only",
      fileStats: {
        before: this._stats(beforeText),
        intendedAfter: this._stats(afterText),
        changed: String(beforeText) !== String(afterText),
      },
      methodStats: {
        before: methodBefore ? this._stats(methodBefore) : null,
        intendedAfter: methodAfter ? this._stats(methodAfter) : null,
      },
      metadata: {
        before: metadataBefore || null,
        after: metadataAfter || null,
      },
      content: {
        before: this._snip(beforeText),
        intendedAfter: this._snip(afterText),
        fullContentIncluded: beforeText.length <= 8000 && String(afterText).length <= 8000,
      },
      notes,
      decisionFile: `write-decisions/${fileName}`,
    };

    await this._writeJson(requestsDir, fileName, request);

    await window.WriteAuditLogger.log({
      type: "blockable-write-request-created",
      path,
      requestId,
      requestFile: `write-requests/${fileName}`,
      decisionFile: `write-decisions/${fileName}`,
      operation,
      block,
      fileStats: request.fileStats,
    });

    let decision = null;

    if (block) {
      decision = await this._waitForDecision(decisionsDir, fileName, timeoutMs);

      await window.WriteAuditLogger.log({
        type: "blockable-write-decision-received",
        path,
        requestId,
        decision,
      });

      if (!decision.approved) {
        return {
          ok: false,
          blocked: true,
          requestId,
          requestFile: `write-requests/${fileName}`,
          decisionFile: `write-decisions/${fileName}`,
          decision,
        };
      }
    }

    const writeResult = await window.DirectApiWriteAuditor.writeFile({
      path,
      afterText,
      operation,
      mode: block ? "blockable-server-api-direct" : "server-api-direct",
      methodBefore,
      methodAfter,
      metadataBefore,
      metadataAfter,
      notes: {
        ...(notes || {}),
        requestId,
        decision,
      },
    });

    return {
      ...writeResult,
      requestId,
      requestFile: `write-requests/${fileName}`,
      decisionFile: `write-decisions/${fileName}`,
      decision,
    };
  }

}
