class DirectApiWriteAuditor {
  
  static async readFile(path) {
    return {
      ok: false,
      status: 0,
      content: "",
      rawText: "",
      json: null,
      disabled: true,
      reason: "DirectApiWriteAuditor is disabled during static/VFS migration.",
      path
    };
  }

  static async saveFile(path, content) {
    return {
      ok: false,
      status: 0,
      text: "",
      json: null,
      disabled: true,
      reason: "DirectApiWriteAuditor.saveFile is disabled during static/VFS migration.",
      path,
      contentLength: typeof content === "string" ? content.length : null
    };
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

  static async writeFile(options = {}) {
    return {
      ok: false,
      disabled: true,
      reason: "DirectApiWriteAuditor.writeFile is disabled during static/VFS migration.",
      path: options.path || null
    };
  }

}
