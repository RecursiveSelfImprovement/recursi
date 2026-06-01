class ManagedManifestLoader {

  constructor(options = {}) {
    this.fetchImpl = options.fetchImpl || (typeof fetch === "function" ? fetch.bind(window) : null);
    this.manifest = null;
    this.sidecars = new Map();
  }

  async loadManifest(url = "/vibes/reports/managed-preload-manifest.json") {
    if (!this.fetchImpl) throw new Error("No fetch implementation available");
    const res = await this.fetchImpl(url);
    if (!res.ok) throw new Error(`Failed to load manifest: ${url}`);
    this.manifest = await res.json();
    return this.manifest;
  }

  async loadSidecarText(url) {
    if (!this.fetchImpl) throw new Error("No fetch implementation available");
    const res = await this.fetchImpl("/" + url.replace(/^\/+/, ""));
    if (!res.ok) throw new Error(`Failed to load sidecar: ${url}`);
    return await res.text();
  }

  async loadSidecarYaml(url) {
    const text = await this.loadSidecarText(url);
    if (typeof ManagedMetadata !== "undefined" && ManagedMetadata.parseLooseYamlLike) {
      return ManagedMetadata.parseLooseYamlLike(text);
    }
    return { raw: text };
  }

  async warmSidecars() {
    if (!this.manifest) throw new Error("Manifest not loaded");
    const entries = this.getAllEntries();
    for (const entry of entries) {
      if (!entry.sidecar) continue;
      if (this.sidecars.has(entry.sidecar)) continue;
      try {
        const parsed = await this.loadSidecarYaml(entry.sidecar);
        this.sidecars.set(entry.sidecar, parsed);
      } catch (error) {
        console.warn("Failed to warm sidecar", entry.sidecar, error);
      }
    }
  }

  getAllEntries() {
    if (!this.manifest || !Array.isArray(this.manifest.all)) return [];
    return this.manifest.all;
  }

  getGroup(groupName) {
    if (!this.manifest || !this.manifest.groups) return [];
    return this.manifest.groups[groupName] || [];
  }

  getEntryByClassName(className) {
    return this.getAllEntries().find(entry => entry.className === className) || null;
  }

  getEntryByPath(filePath) {
    return this.getAllEntries().find(entry => entry.path === filePath) || null;
  }

  getSidecarData(sidecarPath) {
    return this.sidecars.get(sidecarPath) || null;
  }

  async describeAll() {
    const out = [];
    for (const entry of this.getAllEntries()) {
      const sidecar = entry.sidecar ? (this.sidecars.get(entry.sidecar) || null) : null;
      out.push({ ...entry, sidecarData: sidecar });
    }
    return out;
  }

}

/* recursi-meta
{
  "schema": 1,
  "lines": 86,
  "provides": [],
  "deps": []
}
recursi-meta */
