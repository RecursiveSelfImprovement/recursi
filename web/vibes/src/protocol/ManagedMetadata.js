class ManagedMetadata {
  static parseFrontmatter(text) {
    const src = String(text || "");
    const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!m) return null;
    return this.parseLooseYamlLike(m[1]);
  }

  static parseLooseYamlLike(text) {
    const out = {};
    const lines = String(text || "").split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      out[key] = this.coerce(value);
    }
    return out;
  }

  static coerce(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
    if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
      try { return JSON.parse(value); } catch (error) {}
    }
    return value;
  }

}
