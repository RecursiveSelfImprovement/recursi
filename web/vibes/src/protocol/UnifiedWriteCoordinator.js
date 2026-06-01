class UnifiedWriteCoordinator {
  
  constructor(options = {}) {
    this.env = options.env || null;
    this.appRef = options.appRef || null;
    // Default backend: 'memory', 'server-api', or 'local-folder'
    this.defaultBackend = options.defaultBackend || 'memory';
  }

  /**
   * Computes exact stats for a given string content.
   */
  static async computeStats(content) {
    if (content === null || content === undefined) return null;
    const str = String(content);
    const chars = str.length;
    const lines = str.split('\n').length;
    
    let hash = 'unknown';
    // Generate an 8-character SHA-256 hash (like git)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const msgUint8 = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
      } catch (e) {
        console.warn('Failed to compute hash:', e);
      }
    }
    return { chars, lines, hash };
  }

  /**
   * Universal read file method.
   */
  async readFile(path, options = {}) {
    const key = this._normalizePath ? this._normalizePath(path) : String(path || "");
    if (!key) {
      return null;
    }

    const backend = options.backend || this.defaultBackend;
    const rootId = "/" + key.split("/").filter(Boolean)[0];

    const externalStore = this.appRef?.workspaceFileStores?.get?.(rootId);
    if (externalStore) {
      try {
        const entry = await externalStore.get(key);
        return typeof entry === "string" ? entry : entry?.content ?? null;
      } catch (error) {
        this.logs?.push?.(
          "[readFile] workspace read failed for " + key + ": " + error.message
        );
      }
    }

    const vfs = this.appRef?.vfs || null;
    if (vfs && typeof vfs.readFile === "function") {
      try {
        const content = await vfs.readFile(key, {
          nullOnMissing: true
        });
        if (typeof content === "string") {
          return content;
        }
      } catch (error) {
        this.logs?.push?.(
          "[readFile] VFS read failed for " + key + ": " + error.message
        );
      }
    }

    if (backend === "server-api") {
      this.logs?.push?.(
        "[readFile] blocked legacy server-api backend for " +
          key +
          "."
      );
    }

    if (this.env && typeof this.env.readFile === "function") {
      try {
        const content = this.env.readFile(key);
        if (typeof content === "string") {
          return content;
        }
      } catch (error) {
        this.logs?.push?.(
          "[readFile] env read failed for " + key + ": " + error.message
        );
      }
    }

    const memoryStore = this.appRef?.inMemoryFileStore;
    if (memoryStore && typeof memoryStore.get === "function") {
      try {
        const entry = memoryStore.get(key);
        if (typeof entry === "string") {
          return entry;
        }
        if (entry && typeof entry.content === "string") {
          return entry.content;
        }
      } catch (error) {
        this.logs?.push?.(
          "[readFile] memory fork read failed for " + key + ": " + error.message
        );
      }
    }

    if (this.appRef?.fileStore && typeof this.appRef.fileStore.get === "function") {
      try {
        const entry = await this.appRef.fileStore.get(key);
        return typeof entry === "string" ? entry : entry?.content ?? null;
      } catch (error) {
        this.logs?.push?.(
          "[readFile] fileStore read failed for " + key + ": " + error.message
        );
      }
    }

    return null;
  }

  writeFile(path, content) {
      const key = this._normalizePath(path);
      const rootId = '/' + key.split('/').filter(Boolean)[0];
      const isInsideProject = key.startsWith(this.projectRoot + '/') || key === this.projectRoot;
      const isSharedLib = key.startsWith('/library/');
      const isWorkspace = this.appRef?.workspaceFileStores?.has(rootId);

      if (!isInsideProject && !isSharedLib && !isWorkspace) {
        this.logs.push(
          `[writeFile] ❌ Cannot write outside project: ${key}\n` +
            `  Only files under ${this.projectRoot}/, /library/, or open workspace folders can be written from run(env) code.`
        );
        return;
      }

      let isNewFile = true;
      for (const fs of this._getStoreCandidates()) {
        if (fs.has ? fs.has(key) : fs[key] !== undefined) {
          isNewFile = false;
          break;
        }
      }

      let oldContent = null;
      if (!isNewFile) {
        const entry = this._storeGet(key);
        oldContent = typeof entry === 'string' ? entry : entry?.content ?? entry?.value ?? null;
      }

      this._changedFiles.set(key, { path: key, before: oldContent, after: content });
      this._virtualStore.set(key, content);
    }

  deleteFile(paths) {
      const pathArray = Array.isArray(paths) ? paths : [paths];
      let allOk = true;
      for (const path of pathArray) {
        const key = this._normalizePath(path);
        const rootId = '/' + key.split('/').filter(Boolean)[0];
        const isInsideProject = key.startsWith(this.projectRoot + '/') || key === this.projectRoot;
        const isSharedLib = key.startsWith('/library/');
        const isWorkspace = this.appRef?.workspaceFileStores?.has(rootId);

        if (!isInsideProject && !isSharedLib && !isWorkspace) {
          this.logs.push(
            `[deleteFile] ❌ Cannot delete outside project: ${key}\n` +
              `  Only files under ${this.projectRoot}/, /library/, or open workspaces can be deleted from run(env) code.`
          );
          allOk = false;
          continue;
        }

        const inVirtual = this._virtualStore.has(key) && this._virtualStore.get(key) !== null;
        let inStore = false;
        for (const fs of this._getStoreCandidates()) {
          if (fs.has ? fs.has(key) : fs[key] !== undefined) {
            inStore = true;
            break;
          }
        }

        if (!inVirtual && !inStore) {
          this.logs.push('[deleteFile] not found: ' + key);
          allOk = false;
          continue;
        }

        this._changedFiles.set(key, { path: key, before: this._storeGet(key), after: null });
        this._virtualStore.set(key, null);
        this.logs.push('[deleteFile] queued for deletion: ' + key);
      }
      return allOk;
    }

  async writeMethod({ file, className, methodName, source, ...options }) {
      const backend = options.backend || this.defaultBackend;
      const currentContent = await this.readFile(file, { backend });
      
      if (currentContent === null) {
        if (this.env?.log) this.env.log(`[ERROR] writeMethod: File not found: ${file}`);
        return { ok: false, status: 'failed', backend, error: 'File not found' };
      }

      try {
        const acorn = (typeof window !== 'undefined' && window.acorn) || (this.env?.codeParser?.acorn);
        if (!acorn) {
          throw new Error("AST parser (acorn) not available.");
        }

        const ast = acorn.parse(currentContent, { ecmaVersion: 'latest', sourceType: 'module', ranges: true, locations: true });
        
        let targetClassNode = null;
        for (const node of ast.body) {
          if (node.type === 'ClassDeclaration' && node.id?.name === className) {
            targetClassNode = node;
          } else if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'ClassDeclaration' && node.declaration.id?.name === className) {
            targetClassNode = node.declaration;
          } else if (node.type === 'ExportDefaultDeclaration' && node.declaration?.type === 'ClassDeclaration' && node.declaration.id?.name === className) {
            targetClassNode = node.declaration;
          }
        }

        if (!targetClassNode) {
          throw new Error(`Class ${className} not found in file ${file}`);
        }

        let targetMethodNode = null;
        for (const member of targetClassNode.body.body) {
          let memberName = null;
          if (member.key?.type === 'Identifier') memberName = member.key.name;
          if (member.key?.type === 'Literal') memberName = String(member.key.value);
          if (memberName === methodName) {
            targetMethodNode = member;
            break;
          }
        }

        let newContent = '';
        if (targetMethodNode) {
          newContent = currentContent.slice(0, targetMethodNode.start) + source + currentContent.slice(targetMethodNode.end);
        } else {
          const classEnd = targetClassNode.body.end - 1; 
          newContent = currentContent.slice(0, classEnd) + "\n  " + source + "\n" + currentContent.slice(classEnd);
        }

        try {
          acorn.parse(newContent, { ecmaVersion: 'latest', sourceType: 'module' });
        } catch (parseError) {
          throw new Error(`Syntax error in new file content: ${parseError.message}`);
        }

        return await this.writeFile(file, newContent, options);

      } catch (e) {
        console.error("[UnifiedWriteCoordinator] writeMethod failed:", e);
        if (this.env?.log) {
          this.env.log(`[ERROR] writeMethod failed for ${methodName} in ${className} (${file}): ${e.message}`);
        }
        return { ok: false, status: 'failed', backend, error: e.message };
      }
    }


  static _doc_UnifiedWriteCoordinator() {
      return `# UnifiedWriteCoordinator

## Summary

UnifiedWriteCoordinator is the low-level, unified file-writing coordinator. It abstracts write, read, and delete operations across different backends-including active workspace stores and in-memory caches-ensuring that programmatic writes are executed and verified with high reliability.`;
    }

  static _doc_overview() {
      return `# UnifiedWriteCoordinator

The \`UnifiedWriteCoordinator\` is the low-level, unified file-writing coordinator.
It abstracts write, read, and delete operations across different backends-including active workspace stores, memory maps, and VFS backends-ensuring that programmatic writes are executed with strict reliability.`;
    }

  static _doc_coordinator() {
      return `## Transactional Operations & Validation

- **Deferred Writing**: Queues up file-writes, deletes, and moves, allowing them to be executed in batches or reviewed before permanent commits.
- **AST Method Patching**: Leverages \`ClientJSClassPatcher\` to parse and surgically insert, replace, or delete methods inside the class body, validating the new content with Acorn before saving to prevent silent parse errors.`;
    }

  static _doc() {
      return [
        this._doc_UnifiedWriteCoordinator(),
        this._doc_overview(),
        this._doc_coordinator()
      ].join('\n\n');
    }
}