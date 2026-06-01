class ManagedRegistry {
  static _items = new Map();
  static _providers = new Map();

  static register(name, value, info = {}) {
    if (!name || typeof name !== "string") {
      throw new Error("ManagedRegistry.register requires a string name");
    }
    const existing = this._items.get(name);
    if (existing && existing.value !== value) {
      console.warn(`[ManagedRegistry] Duplicate registration for ${name}`, { existing, incoming: info });
    }
    this._items.set(name, { value, info });
    if (!this._providers.has(name)) this._providers.set(name, []);
    this._providers.get(name).push(info);
    return value;
  }

  static get(name) {
    return this._items.get(name)?.value;
  }

  static getInfo(name) {
    return this._items.get(name)?.info || null;
  }

  static getProviders(name) {
    return this._providers.get(name) || [];
  }

  static has(name) {
    return this._items.has(name);
  }

  static list() {
    return Array.from(this._items.keys()).sort();
  }

  static snapshot() {
    const out = {};
    for (const [key, value] of this._items.entries()) {
      out[key] = value.info || null;
    }
    return out;
  }

}
