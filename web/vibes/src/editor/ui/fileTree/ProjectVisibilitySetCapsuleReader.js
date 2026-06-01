class ProjectVisibilitySetCapsuleReader {
  
  constructor(options = {}) {
    this.app = options.app || null;
    this.manager = options.manager || null;
    this.acorn = options.acorn || null;
  }

  async readStoredVisibilitySetByName(name, options = {}) {
    const requested = String(name || "").trim();

    if (!requested) {
      return null;
    }

    const source = await this.readVisibilitySetsCapsuleSource(options);

    if (!source) {
      return null;
    }

    const methodSource = this.findVisibilitySetMethodSource(source, requested);

    if (!methodSource) {
      return null;
    }

    const rawSet = this.pruneInactiveVisibilitySetEntries(
      this.evaluateVisibilitySetMethodSource(methodSource)
    );

    if (typeof options.normalizeVisibilitySet === "function") {
      return options.normalizeVisibilitySet(rawSet, {
        name: rawSet && rawSet.name ? rawSet.name : requested
      });
    }

    if (
      this.manager &&
      typeof this.manager.normalizeVisibilitySet === "function"
    ) {
      return this.manager.normalizeVisibilitySet(rawSet, {
        name: rawSet && rawSet.name ? rawSet.name : requested
      });
    }

    return rawSet;
  }

  async listStoredVisibilitySetSummaries(options = {}) {
    const source = await this.readVisibilitySetsCapsuleSource(options);

    if (!source) {
      return [];
    }

    const acornInstance = this.getAcorn();

    if (!acornInstance || typeof acornInstance.parse !== "function") {
      throw new Error("Acorn is required to list VisibilitySetsCapsule.js.");
    }

    const ast = acornInstance.parse(source, {
      ecmaVersion: "latest",
      sourceType: "script"
    });

    const classNode = this.findClassNode(ast, "VisibilitySetsCapsule");

    if (!classNode || !classNode.body || !Array.isArray(classNode.body.body)) {
      return [];
    }

    const summaries = [];

    for (const member of classNode.body.body) {
      const methodName = this.visibilitySetMethodName(member);

      if (!methodName.startsWith("_set_")) {
        continue;
      }

      try {
        const methodSource = source.slice(member.start, member.end);
        const set = this.evaluateVisibilitySetMethodSource(methodSource);
        const normalized = this.normalizeVisibilitySetForSummary(set, methodName);
        const files = normalized && normalized.files ? normalized.files : {};
        const patterns = Array.isArray(normalized?.patterns) ? normalized.patterns : [];
        const treeRoots = this.visibilitySetRootsFromFiles(files);

        summaries.push({
          name: normalized && normalized.name ? normalized.name : methodName,
          id: normalized && normalized.id ? normalized.id : "",
          methodName,
          description:
            normalized && normalized.description ? normalized.description : "",
          fileCount: Object.keys(files).length,
          patternCount: patterns.length,
          treeRoot: normalized && normalized.treeRoot ? normalized.treeRoot : null,
          treeLabel: normalized && normalized.treeLabel ? normalized.treeLabel : null,
          treeRoots,
          resetFirst: normalized ? normalized.resetFirst !== false : true,
          scope: normalized && normalized.scope ? normalized.scope : "workspace"
        });
      } catch (error) {
        summaries.push({
          name: this.visibilitySetFriendlyNameFromMethodName(methodName),
          id: "",
          methodName,
          description: "",
          fileCount: 0,
          patternCount: 0,
          treeRoot: null,
          treeLabel: null,
          treeRoots: [],
          error: error && error.message ? error.message : String(error)
        });
      }
    }

    summaries.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return summaries;
  }

  async readVisibilitySetsCapsuleSource(options = {}) {
    const capsulePath = options.capsulePath || '/vibes/VisibilitySetsCapsule.js';
    const manager = options.manager || this.manager || null;
    const app = options.app || this.app || manager?.app || null;

    if (typeof options.readFile === 'function') {
      const content = await options.readFile(capsulePath);
      if (typeof content === 'string') return content;
    }

    if (app && typeof app.refreshVirtualFileSystemStores === 'function') {
      try {
        const vfs = await app.refreshVirtualFileSystemStores();
        if (vfs && typeof vfs.readFile === 'function') {
          const content = await vfs.readFile(capsulePath, { nullOnMissing: true });
          if (typeof content === 'string') return content;
        }
      } catch (error) {
        console.warn('[ProjectVisibilitySetCapsuleReader] VFS read failed:', error);
      }
    }

    if (app?.vfs && typeof app.vfs.readFile === 'function') {
      try {
        const content = await app.vfs.readFile(capsulePath, { nullOnMissing: true });
        if (typeof content === 'string') return content;
      } catch (error) {
        console.warn('[ProjectVisibilitySetCapsuleReader] app.vfs read failed:', error);
      }
    }

    if (app?.inMemoryFileStore && typeof app.inMemoryFileStore.get === 'function') {
      const content = app.inMemoryFileStore.get(capsulePath);
      if (typeof content === 'string') return content;
    }

    if (app?.fileStore && typeof app.fileStore.get === 'function') {
      const content = app.fileStore.get(capsulePath);
      if (typeof content === 'string') return content;
    }

    if (manager && typeof manager.getFileContent === 'function') {
      const content = await manager.getFileContent(capsulePath);
      if (typeof content === 'string') return content;
    }

    return null;
  }

  findVisibilitySetMethodSource(source, name) {
    const acornInstance = this.getAcorn();

    if (!acornInstance || typeof acornInstance.parse !== "function") {
      throw new Error("Acorn is required to read VisibilitySetsCapsule.js.");
    }

    const ast = acornInstance.parse(source, {
      ecmaVersion: "latest",
      sourceType: "script"
    });

    const classNode = this.findClassNode(ast, "VisibilitySetsCapsule");

    if (!classNode || !classNode.body || !Array.isArray(classNode.body.body)) {
      return null;
    }

    const requested = String(name || "").trim();
    const requestedSlug = this.visibilitySetSlug(requested);
    const canonicalMethod = this.visibilitySetMethodNameForName(requested);
    const candidates = [];

    for (const member of classNode.body.body) {
      const methodName = this.visibilitySetMethodName(member);

      if (!methodName.startsWith("_set_")) {
        continue;
      }

      const friendly = this.visibilitySetFriendlyNameFromMethodName(methodName);
      const methodSlug = this.visibilitySetSlug(friendly);

      if (
        methodName === requested ||
        methodName === canonicalMethod ||
        friendly === requested ||
        methodSlug === requestedSlug
      ) {
        candidates.push({
          methodName,
          friendly,
          source: source.slice(member.start, member.end),
          score: methodName === canonicalMethod ? 100 : 0
        });
      }
    }

    if (!candidates.length) {
      return null;
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].source;
  }

  evaluateVisibilitySetMethodSource(methodSource) {
    const methodName = this.visibilitySetMethodNameFromSource(methodSource);
    const wrapper = [
      "class __VisibilitySetEvalWrapper {",
      methodSource,
      "}",
      "return __VisibilitySetEvalWrapper." + methodName + "();"
    ].join("\n");

    return Function(wrapper)();
  }

  normalizeVisibilitySetForSummary(set, methodName) {
    const cleanSet = this.pruneInactiveVisibilitySetEntries(
      set || {
        name: this.visibilitySetFriendlyNameFromMethodName(methodName),
        files: {},
        patterns: []
      }
    );

    let normalized = cleanSet;

    if (
      this.manager &&
      typeof this.manager.normalizeVisibilitySet === "function"
    ) {
      normalized = this.manager.normalizeVisibilitySet(cleanSet, {
        name: cleanSet && cleanSet.name ? cleanSet.name : methodName
      });
    }

    const treeRoot =
      normalized.treeRoot ||
      cleanSet.treeRoot ||
      this.visibilitySetSingleRootFromFiles(normalized.files || cleanSet.files || {});

    const treeLabel =
      normalized.treeLabel ||
      cleanSet.treeLabel ||
      this.visibilitySetRootLabel(treeRoot);

    return {
      ...normalized,
      treeRoot: treeRoot || null,
      treeLabel: treeRoot ? treeLabel : null
    };
  }

  findClassNode(ast, className) {
    const body = ast && Array.isArray(ast.body) ? ast.body : [];

    for (const node of body) {
      if (
        node.type === "ClassDeclaration" &&
        node.id &&
        node.id.name === className
      ) {
        return node;
      }
    }

    return null;
  }

  visibilitySetMethodNameForName(name) {
    const slug = this.visibilitySetSlug(name);
    const parts = slug.split("-");
    let suffix = "";

    for (const part of parts) {
      if (!part) continue;
      suffix += part.charAt(0).toUpperCase() + part.slice(1);
    }

    return "_set_" + (suffix || "Unnamed");
  }

  visibilitySetFriendlyNameFromMethodName(methodName) {
    const raw = String(methodName || "");

    if (!raw.startsWith("_set_")) {
      return raw || "Unnamed";
    }

    const suffix = raw.slice(5);
    let out = "";

    for (let i = 0; i < suffix.length; i += 1) {
      const ch = suffix.charAt(i);

      if (ch === "_") {
        out += " ";
        continue;
      }

      const code = ch.charCodeAt(0);
      const isUpper = code >= 65 && code <= 90;

      if (i > 0 && isUpper && out.charAt(out.length - 1) !== " ") {
        out += " ";
      }

      out += ch;
    }

    return out.replaceAll("  ", " ").trim() || "Unnamed";
  }

  visibilitySetSlug(value) {
    const text = String(value || "unnamed").trim().toLowerCase();
    let out = "";
    let previousDash = false;

    for (const ch of text) {
      const code = ch.charCodeAt(0);
      const isDigit = code >= 48 && code <= 57;
      const isLower = code >= 97 && code <= 122;
      const isUpper = code >= 65 && code <= 90;

      if (isDigit || isLower || isUpper) {
        out += ch.toLowerCase();
        previousDash = false;
      } else if (!previousDash) {
        out += "-";
        previousDash = true;
      }
    }

    while (out.startsWith("-")) out = out.slice(1);
    while (out.endsWith("-")) out = out.slice(0, -1);

    return out || "unnamed";
  }

  visibilitySetMethodName(methodNode) {
    if (!methodNode || !methodNode.key) return "";

    if (methodNode.key.type === "Identifier") {
      return methodNode.key.name || "";
    }

    if (methodNode.key.type === "Literal") {
      return String(methodNode.key.value || "");
    }

    return "";
  }

  visibilitySetMethodNameFromSource(methodSource) {
    const acornInstance = this.getAcorn();

    if (!acornInstance || typeof acornInstance.parse !== "function") {
      throw new Error("Acorn is required to parse visibility set method source.");
    }

    const ast = acornInstance.parse(
      "class X {\n" + methodSource + "\n}",
      {
        ecmaVersion: "latest",
        sourceType: "script"
      }
    );

    const classNode = ast.body && ast.body.length ? ast.body[0] : null;

    if (
      !classNode ||
      !classNode.body ||
      !Array.isArray(classNode.body.body) ||
      !classNode.body.body.length
    ) {
      throw new Error("Could not parse visibility set method source.");
    }

    return this.visibilitySetMethodName(classNode.body.body[0]);
  }

  getAcorn() {
    return (
      this.acorn ||
      this.app?.codeParser?.acorn ||
      this.manager?.app?.codeParser?.acorn ||
      (typeof window !== "undefined" ? window.acorn : null) ||
      (typeof globalThis !== "undefined" ? globalThis.acorn : null)
    );
  }

  pruneInactiveVisibilitySetEntries(set) {
    const input = set && typeof set === 'object' ? set : {};

    // Resolve source files from any legacy key - priority: files > settings > visibility
    const sourceFiles =
      (input.files && typeof input.files === 'object' && !Array.isArray(input.files))
        ? input.files
        : (input.settings && typeof input.settings === 'object')
        ? input.settings
        : (input.visibility && typeof input.visibility === 'object')
        ? input.visibility
        : {};

    const files = {};

    for (const path of Object.keys(sourceFiles)) {
      const state = sourceFiles[path];
      if (this.isVisibilityStateActive(state)) {
        files[path] = state;
      }
    }

    // EXPLICIT return - no spread. Every legacy key dies here by omission.
    return {
      name:        typeof input.name === 'string'        ? input.name        : '',
      id:          typeof input.id === 'string'          ? input.id          : '',
      description: typeof input.description === 'string' ? input.description : '',
      scope:       typeof input.scope === 'string'       ? input.scope       : 'workspace',
      treeRoot:    input.treeRoot  || null,
      treeLabel:   input.treeLabel || null,
      resetFirst:  input.resetFirst !== false,
      createdAt:   typeof input.createdAt === 'string'   ? input.createdAt   : '',
      updatedAt:   typeof input.updatedAt === 'string'   ? input.updatedAt   : '',
      files,
      fileCount:   Object.keys(files).length,
      patterns:    Array.isArray(input.patterns) ? input.patterns : []
    };
  }

  isVisibilityStateActive(state) {
    if (!state || typeof state !== 'object') return false;

    const codeLevel = Number(state.codeLevel || 0);
    const docsLevel = Number(state.docsLevel || 0);

    return (
      codeLevel > 0 ||
      docsLevel > 0 ||
      state.sig === true ||
      state.signatures === true ||
      state.code === true ||
      state.docs === true
    );
  }

  visibilitySetSingleRootFromFiles(files) {
    const roots = new Set();

    if (!files || typeof files !== "object") {
      return null;
    }

    for (const path of Object.keys(files)) {
      const root = this.visibilitySetRootForPath(path);

      if (root) {
        roots.add(root);
      }

      if (roots.size > 1) {
        return null;
      }
    }

    return roots.size === 1 ? Array.from(roots)[0] : null;
  }

  visibilitySetRootForPath(path) {
    if (typeof path !== "string") {
      return null;
    }

    const first = path.split("/").filter(Boolean)[0];

    return first ? "/" + first : null;
  }

  visibilitySetRootLabel(root) {
    if (typeof root !== "string") {
      return null;
    }

    const first = root.split("/").filter(Boolean)[0];

    return first || null;
  }

  visibilitySetRootsFromFiles(files) {
    if (!files || typeof files !== "object") {
      return [];
    }

    const roots = new Set();

    for (const path of Object.keys(files)) {
      const root = this.visibilitySetRootForPath(path);

      if (root) {
        roots.add(root);
      }
    }

    return Array.from(roots).sort();
  }

}