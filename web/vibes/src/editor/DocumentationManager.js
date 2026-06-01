
class DocumentationManager {
  
  constructor(app) {
    this.app = app;
    this.fileMetadataPath = 'file_metadata.json';
  }

    getDocPath(sourcePathString) {
    return null;
  }

    async ensureDocExists(sourcePathString) {
    const hasDocs = await this.hasCapsuleDocsForSourcePath(sourcePathString);
    this.app?.projectFilesManager?.setNodeDocStatus?.(sourcePathString, hasDocs);
    return hasDocs;
  }

    async appendToDoc(sourcePathString, content) {
    console.warn(
      '[DocumentationManager] appendToDoc is disabled: documentation is capsule-owned now.',
      sourcePathString
    );
    return false;
  }

    async generateInitialDocs(sourcePathString, summaryContent) {
    const docPath = this.getDocPath(sourcePathString);
    if (!docPath) return false;

    const title = String(sourcePathString || '').split('/').pop() || 'Untitled';
    const content = summaryContent || [
      '# ' + title,
      '',
      'Source: `' + sourcePathString + '`',
      '',
      '## Summary',
      '',
      '',
      '## Notes',
      '',
      ''
    ].join('\n');

    const ok = await this._writePath(docPath, content);
    if (ok) this.app?.projectFilesManager?.setNodeDocStatus?.(sourcePathString, true);
    return !!ok;
  }

    async replaceDocContent(sourcePathString, newContent) {
    console.warn(
      '[DocumentationManager] replaceDocContent is disabled: documentation is capsule-owned now.',
      sourcePathString
    );
    return false;
  }

  isContentPlaceholder(content) {
    if (!content) return true;
    return content.includes(
      'This section will contain code snippets demonstrating how to use this component effectively.'
    );
  }

  async getFileMetadata() {
      // Retain as clean empty no-op
      return {};
    }

async saveFileMetadata(metadata) {
      // Discard metadata saving permanently
      return true;
    }

  async _updateMetadataForDocChange(sourcePathObj, docContent) {
    const metadataKey = sourcePathObj.asMetadataKey();
    const lineCount = (docContent.match(/\n/g) || []).length + 1;
    const fileMetadata = await this.getFileMetadata();
    if (!fileMetadata[metadataKey]) fileMetadata[metadataKey] = { codeSize: 0 };
    fileMetadata[metadataKey].docSize = lineCount;
    await this.saveFileMetadata(fileMetadata);
    this.app.projectFilesManager?.updateNodeMetadata(
      metadataKey,
      fileMetadata[metadataKey]
    );
  }

  async recordCondensation() {}

  async getDocStatus() {}

  async _readPathIfExists(path) {
    const key = String(path || "").trim();
    if (!key) {
      return null;
    }

    const vfs =
      typeof this._docGetVfs === "function"
        ? await this._docGetVfs()
        : this.app?.vfs || null;

    if (vfs && typeof vfs.readFile === "function") {
      try {
        const text = await vfs.readFile(key, {
          nullOnMissing: true
        });

        if (typeof text === "string") {
          return text;
        }
      } catch (error) {
        this._docLogReadFallback?.("vfs.readFile", key, error);
      }
    }

    const rootId = "/" + key.split("/").filter(Boolean)[0];
    const workspaceStore = this.app?.workspaceFileStores?.get?.(rootId);

    if (workspaceStore && typeof workspaceStore.get === "function") {
      try {
        const value = await workspaceStore.get(key);
        if (typeof value === "string") {
          return value;
        }
        if (value && typeof value.content === "string") {
          return value.content;
        }
      } catch (error) {
        this._docLogReadFallback?.("workspaceStore.get", key, error);
      }
    }

    const memoryStore = this.app?.inMemoryFileStore;
    if (memoryStore && typeof memoryStore.get === "function") {
      try {
        if (typeof memoryStore.has !== "function" || memoryStore.has(key)) {
          const value = memoryStore.get(key);
          if (typeof value === "string") {
            return value;
          }
          if (value && typeof value.content === "string") {
            return value.content;
          }
        }
      } catch (error) {
        this._docLogReadFallback?.("memoryStore.get", key, error);
      }
    }

    if (this.app?.commands && typeof this.app.commands.fetchFileContentForApp === "function") {
      try {
        const value = await this.app.commands.fetchFileContentForApp(key);
        if (typeof value === "string") {
          return value;
        }
        if (value && typeof value.content === "string") {
          return value.content;
        }
      } catch (error) {
        this._docLogReadFallback?.("commands.fetchFileContentForApp", key, error);
      }
    }

    return null;
  }

  async _writePath(path, content) {
    const key = String(path || "").trim();
    if (!key) {
      throw new Error("DocumentationManager._writePath requires a path.");
    }

    if (typeof content !== "string") {
      throw new Error("DocumentationManager._writePath content must be a string.");
    }

    const vfs =
      typeof this._docGetVfs === "function"
        ? await this._docGetVfs()
        : this.app?.vfs || null;

    if (vfs && typeof vfs.writeFile === "function") {
      const result = await vfs.writeFile(key, content);
      const readback =
        typeof vfs.readFile === "function"
          ? await vfs.readFile(key, {
              nullOnMissing: true,
              noStaticFetch: true
            })
          : content;

      if (readback !== content) {
        throw new Error(
          "DocumentationManager._writePath VFS readback mismatch for " + key
        );
      }

      return {
        ok: true,
        path: key,
        backend: result?.backend || "vfs"
      };
    }

    const rootId = "/" + key.split("/").filter(Boolean)[0];
    const workspaceStore = this.app?.workspaceFileStores?.get?.(rootId);

    if (workspaceStore && typeof workspaceStore.set === "function") {
      await workspaceStore.set(key, content);

      if (typeof workspaceStore.get === "function") {
        const readback = await workspaceStore.get(key);
        const text =
          typeof readback === "string"
            ? readback
            : readback && typeof readback.content === "string"
              ? readback.content
              : null;

        if (text !== content) {
          throw new Error(
            "DocumentationManager._writePath workspace readback mismatch for " + key
          );
        }
      }

      return {
        ok: true,
        path: key,
        backend: "workspace"
      };
    }

    const memoryStore = this.app?.inMemoryFileStore;
    if (memoryStore && typeof memoryStore.set === "function") {
      memoryStore.set(key, content);

      if (typeof memoryStore.get === "function") {
        const readback = memoryStore.get(key);
        const text =
          typeof readback === "string"
            ? readback
            : readback && typeof readback.content === "string"
              ? readback.content
              : null;

        if (text !== content) {
          throw new Error(
            "DocumentationManager._writePath memory readback mismatch for " + key
          );
        }
      }

      return {
        ok: true,
        path: key,
        backend: "memory-fork"
      };
    }

    throw new Error(
      "DocumentationManager._writePath has no writable browser target for " +
        key +
        ". Dynamic /api/save-file fallback is disabled."
    );
  }

    

  async getCapsuleDocPayloadsForSourcePath(sourcePathString, sourceContent = null) {
    const sourcePath = String(sourcePathString || '');
    if (!sourcePath || !/\.js$/i.test(sourcePath)) return [];

    let content = sourceContent;
    if (typeof content !== 'string') {
      content = await this._readPathIfExists(sourcePath);
    }

    if (typeof content !== 'string' || !content.trim()) return [];

    if (this.app?.codeParser?.extractAndStripFooterMetadata) {
      try {
        const stripped = this.app.codeParser.extractAndStripFooterMetadata(
          content,
          sourcePath
        );
        if (stripped && typeof stripped.code === 'string') {
          content = stripped.code;
        }
      } catch (error) {}
    }

    return this._extractCapsuleDocPayloadsFromSource(content, sourcePath);
  }

  async getCapsuleDocContentForSourcePath(sourcePathString, sourceContent = null, docsLevel = 4) {
    if (!sourceContent) {
      sourceContent = await this._readPathIfExists(sourcePathString);
    }
    if (!sourceContent) return null;

    // No more eval/getMarkdown fallback. Rely strictly on static _doc payloads.
    const payloads = this._extractCapsuleDocPayloadsFromSource(sourceContent, sourcePathString);
    if (!payloads || payloads.length === 0) return null;

    let combined = '';
    for (const payload of payloads) {
      if (payload && typeof payload.content === 'string') {
        combined += payload.content + '\n\n';
      } else if (typeof payload === 'string') {
        combined += payload + '\n\n';
      }
    }

    if (!combined.trim()) return null;
    return this._trimDocsContentForLevel(combined.trim(), docsLevel);
  }

  async hasCapsuleDocsForSourcePath(sourcePathString, sourceContent = null) {
    const content = await this.getCapsuleDocContentForSourcePath(
      sourcePathString,
      sourceContent,
      1
    );
    return typeof content === 'string' && content.trim().length > 0;
  }

  _extractCapsuleDocPayloadsFromSource(sourceContent, sourcePathString = '') {
    const source = String(sourceContent || '');
    const className = this._extractPrimaryClassNameFromSource(source, sourcePathString);
    if (!className) return [];

    const methodNames = this._extractStaticDocMethodNamesFromSource(source);
    if (!methodNames.length) return [];

    const payloads = [];

    for (const methodName of methodNames) {
      const payload = this._evaluateCapsuleDocMethod(source, className, methodName);
      if (payload !== null && payload !== undefined) {
        payloads.push(payload);
      }
    }

    return payloads;
  }

  _extractPrimaryClassNameFromSource(sourceContent, sourcePathString = '') {
    const source = String(sourceContent || '');

    try {
      const acorn = typeof window !== 'undefined' ? window.acorn : null;
      if (acorn) {
        const ast = acorn.parse(source, {
          ecmaVersion: 'latest',
          sourceType: 'script'
        });

        for (const node of ast.body || []) {
          if (node.type === 'ClassDeclaration' && node.id?.name) {
            return node.id.name;
          }
        }
      }
    } catch (error) {}

    const match = source.match(/\bclass\s+([A-Za-z_$][\w$]*)\b/);
    if (match) return match[1];

    const fileName = String(sourcePathString || '').split('/').pop() || '';
    return fileName.replace(/\.js$/i, '') || null;
  }

  _extractStaticDocMethodNamesFromSource(sourceContent) {
      const source = String(sourceContent || '');
      const names = [];

      try {
        const acorn = typeof window !== 'undefined' ? window.acorn : null;
        if (acorn) {
          const ast = acorn.parse(source, {
            ecmaVersion: 'latest',
            sourceType: 'script'
          });

          for (const node of ast.body || []) {
            if (node.type !== 'ClassDeclaration') continue;

            for (const member of node.body?.body || []) {
              const keyName =
                member.key?.type === 'Identifier'
                  ? member.key.name
                  : member.key?.type === 'Literal'
                  ? String(member.key.value)
                  : '';

              if (
                member.static === true &&
                member.kind === 'method' &&
                (keyName === '_doc' || keyName.startsWith('_doc_'))
              ) {
                names.push(keyName);
              }
            }

            break;
          }

          return names;
        }
      } catch (error) {}

      const pattern = new RegExp('static\\s+(_doc(?:_[A-Za-z0-9_$]*)?)\\s*\\(', 'g');
      let match = pattern.exec(source);
      while (match) {
        names.push(match[1]);
        match = pattern.exec(source);
      }

      return names;
    }

  _evaluateCapsuleDocMethod(sourceContent, className, methodName) {
    const source = String(sourceContent || '');

    try {
      const factory = new Function(
        source +
          '\n; return typeof ' +
          className +
          ' !== "undefined" ? ' +
          className +
          ' : null;'
      );

      const ctor = factory();
      if (!ctor || typeof ctor[methodName] !== 'function') return null;

      return ctor[methodName]();
    } catch (error) {
      console.warn(
        '[DocumentationManager] Failed to evaluate capsule doc method:',
        className + '.' + methodName,
        error
      );
      return null;
    }
  }

  _trimDocsContentForLevel(content, docsLevel = 4) {
    const text = String(content || '').trim();
    if (!text) return null;

    const level = this._normalizeDocsLevel(docsLevel);
    if (level >= 4) return text;

    const lines = text.split('\n');
    if (level <= 1) return lines.slice(0, 24).join('\n').trim();
    if (level === 2) return lines.slice(0, 80).join('\n').trim();
    if (level === 3) return lines.slice(0, 180).join('\n').trim();

    return text;
  }

  _normalizeDocsLevel(docsLevel = 4) {
    if (docsLevel === true || docsLevel === 'full') return 4;
    if (docsLevel === 'summary') return 2;
    if (docsLevel === 'none' || docsLevel === false) return 0;

    const n = Number(docsLevel);
    if (!Number.isFinite(n)) return 4;
    return Math.max(0, Math.min(4, Math.round(n)));
  }

  _docMetadataCandidatePaths() {    const projectName = this.app?.projectName || "";    const candidates = [      "/vibes/file_metadata.json",      "/file_metadata.json"    ];    if (projectName) {      candidates.unshift("/" + projectName + "/file_metadata.json");    }    if (this.app?.projectRoot) {      let root = String(this.app.projectRoot);      while (root.endsWith("/") && root.length > 1) {        root = root.slice(0, -1);      }      candidates.unshift(root + "/file_metadata.json");    }    return Array.from(new Set(candidates.filter(Boolean)));  }

  async _docGetVfs() {    if (!this.app) {      return null;    }    if (typeof this.app.refreshVirtualFileSystemStores === "function") {      return await this.app.refreshVirtualFileSystemStores();    }    return this.app.vfs || null;  }

  async _docReadMetadataText(vfs, path) {    if (vfs && typeof vfs.readFile === "function") {      try {        const text = await vfs.readFile(path, {          nullOnMissing: true        });        if (typeof text === "string") {          return text;        }      } catch (error) {        this._docLogReadFallback("vfs.readFile", path, error);      }    }    if (this.app?.commands && typeof this.app.commands.fetchFileContentForApp === "function") {      try {        const text = await this.app.commands.fetchFileContentForApp(path);        if (typeof text === "string") {          return text;        }      } catch (error) {        this._docLogReadFallback("commands.fetchFileContentForApp", path, error);      }    }    if (this.app?.projectFilesManager && typeof this.app.projectFilesManager.getFileContent === "function") {      try {        const text = await this.app.projectFilesManager.getFileContent(path);        if (typeof text === "string") {          return text;        }      } catch (error) {        this._docLogReadFallback("projectFilesManager.getFileContent", path, error);      }    }    return null;  }

  _docLogReadFallback(operation, path, error) {    const message = error && error.message ? error.message : String(error);    if (this.app && typeof this.app.logFileOp === "function") {      this.app.logFileOp("debug", "DocumentationManager metadata read fallback", {        operation,        path,        error: message      });      return;    }    if (this.app?.fileLogger && typeof this.app.fileLogger.log === "function") {      this.app.fileLogger.log("debug", "DocumentationManager metadata read fallback", {        operation,        path,        error: message      });    }  }


  static _doc() {
      return [
        this._doc_overview(),
        this._doc_capsuleTracking()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### DocumentationManager\n\nManages inline capsule documentation. It scans classes for static `_doc` or `_doc_` prefixed methods returning strings, extracts payloads, and serves documentation content at various levels of detail.";
    }

  static _doc_capsuleTracking() {
      return "### Capsule-Owned Docs\n\nIn the current V3 architecture, documentation is stored directly inside JS files as static class methods rather than external markdown files. The manager automatically reads, parses, and evaluates these documentation methods in a safe sandbox.";
    }
}

