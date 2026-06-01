class ProjectFilesMetadataAnalyzer {
  
  constructor(options = {}) {
    this.app = options.app || null;
    this.acorn = options.acorn || null;
  }

  analyzePromptMetadataForFile(path, content, _legacyDocsContent) {
    const sourcePath = String(path || "");
    const source = typeof content === "string" ? content : "";
    const totalLines = this.countLines(source);

    const base = {
      codeSize: totalLines,
      docSize: 0,
      metadataSize: 0,
      lineCount: totalLines,
      totalLines,
      hasDocs: false,
      hasMetadata: false,
      isStructured: false,
      isCapsule: false
    };

    if (!source.trim()) {
      return {
        ...base,
        codeSize: 0,
        lineCount: 0,
        totalLines: 0
      };
    }

    if (!this.isJavaScriptLikePath(sourcePath)) {
      return base;
    }

    const roles = this.analyzeJavaScriptCapsuleLineRoles(source);

    return {
      ...base,
      codeSize: roles.codeSize,
      docSize: roles.docSize,
      metadataSize: roles.metadataSize,
      lineCount: totalLines,
      totalLines,
      hasDocs: roles.docSize > 0,
      hasMetadata: roles.metadataSize > 0,
      isStructured: roles.isStructured,
      isCapsule: roles.isCapsule,
      capsuleDocs: roles.docSize > 0,
      capsuleMetadata: roles.metadataSize > 0,
      parseOk: roles.parseOk,
      parseError: roles.parseError || null
    };
  }

  analyzeJavaScriptCapsuleLineRoles(source) {
      return this._analyzeJavaScriptCapsuleLineRoles(source);
    }

  methodName(methodNode) {
    const key = methodNode?.key;

    if (!key) {
      return "";
    }

    if (key.type === "Identifier") {
      return key.name || "";
    }

    if (key.type === "Literal") {
      return String(key.value || "");
    }

    if (key.type === "PrivateIdentifier") {
      return key.name || "";
    }

    return "";
  }

  getAcorn() {
    return (
      this.acorn ||
      (this.app && this.app.codeParser && this.app.codeParser.acorn) ||
      (typeof window !== "undefined" ? window.acorn : null) ||
      (typeof globalThis !== "undefined" ? globalThis.acorn : null)
    );
  }

  countLines(text) {
    if (typeof text !== "string" || text.length === 0) return 0;
    return text.split("\n").length;
  }

  isJavaScriptLikePath(path) {
    const lower = String(path || "").toLowerCase();
    return [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"].some((suffix) =>
      lower.endsWith(suffix)
    );
  }


  _analyzeJavaScriptCapsuleLineRoles(source) {
      const text = String(source || "");
      const lines = text.split("\n");
      const totalLines = lines.length;

      const roles = [];
      for (let i = 0; i < totalLines; i++) {
        roles.push("code");
      }

      const markRange = (startLineNumber, endLineNumber, role) => {
        const start = Math.max(0, Number(startLineNumber) - 1);
        const end = Math.min(totalLines - 1, Number(endLineNumber) - 1);

        for (let i = start; i <= end; i++) {
          roles[i] = role;
        }
      };

      const countRole = (role) => {
        let count = 0;

        for (let i = 0; i < lines.length; i++) {
          if (roles[i] !== role) continue;
          if (!String(lines[i] || "").trim()) continue;
          count++;
        }

        return count;
      };

      const result = {
        codeSize: 0,
        docSize: 0,
        metadataSize: 0,
        lineCount: totalLines,
        totalLines,
        isStructured: false,
        isCapsule: false,
        parseOk: false,
        parseError: null
      };

      try {
        const acorn = this.getAcorn();

        if (!acorn || typeof acorn.parse !== "function") {
          throw new Error("Acorn parser unavailable.");
        }

        const ast = acorn.parse(text, {
          ecmaVersion: "latest",
          sourceType: "script",
          locations: true
        });

        for (const node of ast.body || []) {
          if (!node || node.type !== "ClassDeclaration") continue;

          result.isStructured = true;

          for (const member of node.body?.body || []) {
            if (!member || !member.loc) continue;

            const name = this.methodName(member);
            const methodName = String(name || "");

            if (!methodName) continue;

            const isDocMethod =
              methodName.startsWith("_doc") ||
              methodName === "getMarkdown" ||
              methodName.startsWith("_sample_") ||
              methodName === "getSampleClasses" ||
              methodName === "sampleClassNames" ||
              methodName === "sampleByName";

            if (member.static && isDocMethod) {
              result.isCapsule = true;
              markRange(member.loc.start.line, member.loc.end.line, "docs");
            }
          }

          break;
        }

        result.parseOk = true;
      } catch (error) {
        result.parseOk = false;
        result.error = error && error.message ? error.message : String(error);
      }

      result.codeSize = countRole("code");
      result.docSize = countRole("docs");
      result.metadataSize = 0;

      return result;
    }
}