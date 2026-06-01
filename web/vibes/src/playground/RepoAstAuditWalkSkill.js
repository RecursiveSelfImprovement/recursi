class RepoAstAuditWalkSkill {

      async onDir(dirPath, env, walker) {
        const blocked = [
          "/node_modules",
          "/.git",
          "/dist",
          "/build",
          "/coverage",
          "/recursi-backups",
          "/.vibes/reports",
          "/VibesNodeRunner",
        ];

        if (blocked.some((part) => String(dirPath).includes(part))) {
          env.log("⏭ skip noisy directory: " + dirPath);
          return { skip: true };
        }
      }

      async onFile(node, env, walker) {
        const audit = this._auditState(walker);
        const path = node.path;
        const content = node.content || "";
        const ext = (path.split(".").pop() || "").toLowerCase();
        const lines = content ? content.split("\n").length : 0;
        const chars = content.length;

        const fileInfo = {
          path,
          ext,
          lines,
          chars,
          kind: "other",
          warnings: [],
          parseOk: null,
          classCount: 0,
          methodCount: 0,
          functionCount: 0,
          importCount: 0,
          exportCount: 0,
          pureClass: null,
        };

        audit.totals.files++;

        const mark = (state, label, detail, duration = 700) => {
          env.highlightNode?.(path, state, { label, title: detail, duration });
        };

        mark("reading", "read", "Reading " + path, 350);

        try {
          if (["js", "mjs", "cjs", "jsx", "ts", "tsx"].includes(ext)) {
            fileInfo.kind = "js";
            audit.totals.jsFiles++;
            mark("analyzing", "ast", "Parsing JS AST: " + path, 600);
            this._parseJs(path, content, fileInfo, audit, env);
          } else if (["html", "htm"].includes(ext)) {
            fileInfo.kind = "html";
            audit.totals.htmlFiles++;
            this._parseHtml(path, content, audit, fileInfo);
          } else if (ext === "css") {
            fileInfo.kind = "css";
            audit.totals.cssFiles++;
          } else {
            audit.totals.otherFiles++;
          }
        } catch (error) {
          fileInfo.parseOk = false;
          fileInfo.warnings.push(error.message || String(error));
          audit.parseErrors.push({
            path,
            error: error.stack || error.message || String(error),
          });
          mark("error", "ERR", "Parse/analyze failed: " + error.message, 0);
        }

        audit.totals.methods = audit.methods.length;
        audit.files.push(fileInfo);

        if (fileInfo.lines > 1000 || fileInfo.methodCount > 40 || fileInfo.warnings.length) {
          mark(
            fileInfo.warnings.length ? "error" : "current",
            fileInfo.warnings.length ? "WARN" : "BIG",
            path + " · " + fileInfo.lines + " lines · " + fileInfo.methodCount + " methods",
            fileInfo.warnings.length ? 0 : 1200
          );
        }

        if (audit.totals.files % 25 === 0) {
          env.log(
            "🧬 audited " +
              audit.totals.files +
              " files · methods " +
              audit.methods.length +
              " · parse errors " +
              audit.parseErrors.length
          );
        }
      }

      async onPause(node, env, walker) {
        const audit = walker.__repoAstAudit;

        if (!audit) {
          env.log("No repo audit state yet.");
          return;
        }

        env.log("Paused at: " + (node?.path || walker.currentNode || "?"));
        env.log("Files audited: " + audit.totals.files);
        env.log("Methods found: " + audit.methods.length);

        const currentPath = node?.path || walker.currentNode;
        const methods = audit.methods.filter((m) => m.file === currentPath);

        if (methods.length) {
          env.log(
            methods
              .slice()
              .sort((a, b) => b.lines - a.lines)
              .slice(0, 12)
              .map((m) => `${m.owner ? m.owner + "." : ""}${m.name} - ${m.lines} lines`)
              .join("\n")
          );
        }
      }

      async onExport(results, env, walker) {
        const audit = walker.__repoAstAudit;

        if (!audit) {
          env.log("No repo audit state to export.");
          return;
        }

        const cleanRoot = String(walker.rootPath || walker._launchPath || "/").replace(/\/+$/, "") || "/";
        const reportRoot = cleanRoot === "/" ? "/.vibes/reports" : cleanRoot + "/.vibes/reports";
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const jsonPath = reportRoot + "/repo-ast-audit-" + stamp + ".json";
        const mdPath = reportRoot + "/repo-ast-audit-" + stamp + ".md";

        audit.inferredEdges = this._inferDependencyEdges(audit);
        audit.finishedAt = new Date().toISOString();

        const md = this._buildMarkdownReport(audit, cleanRoot);

        env.writeFile(jsonPath, JSON.stringify(audit, null, 2) + "\n", {
          reason: "programmaticWrite",
        });

        env.writeFile(mdPath, md, {
          reason: "programmaticWrite",
        });

        env.log("✅ Repo AST audit exported:");
        env.log(mdPath);
        env.log(jsonPath);

        try {
          await navigator.clipboard.writeText(md);
          env.log("📋 Markdown report copied to clipboard.");
        } catch (error) {
          env.log("Clipboard copy skipped/blocked.");
        }
      }

      _auditState(walker) {
        if (walker.__repoAstAudit) return walker.__repoAstAudit;

        walker.__repoAstAudit = {
          startedAt: new Date().toISOString(),
          files: [],
          methods: [],
          symbolsByFile: {},
          refsByFile: {},
          importsByFile: {},
          htmlDepsByFile: {},
          parseErrors: [],
          totals: {
            files: 0,
            jsFiles: 0,
            htmlFiles: 0,
            cssFiles: 0,
            otherFiles: 0,
            methods: 0,
            classes: 0,
            functions: 0,
            imports: 0,
            exports: 0,
            pureClassOk: 0,
            pureClassViolations: 0,
          },
        };

        return walker.__repoAstAudit;
      }

      _parseJs(path, content, fileInfo, audit, env) {
        const acorn = env.acorn || window.acorn;

        if (!acorn) {
          fileInfo.parseOk = false;
          fileInfo.warnings.push("Acorn unavailable");
          audit.parseErrors.push({ path, error: "Acorn unavailable" });
          return;
        }

        let ast;
        let sourceType = "script";

        try {
          ast = acorn.parse(content, {
            ecmaVersion: "latest",
            sourceType: "script",
            allowHashBang: true,
          });
        } catch (scriptError) {
          sourceType = "module";
          ast = acorn.parse(content, {
            ecmaVersion: "latest",
            sourceType: "module",
            allowHashBang: true,
          });
        }

        fileInfo.parseOk = true;
        fileInfo.sourceType = sourceType;

        const symbols = new Set();
        const refs = new Set();
        const imports = [];

        const topClasses = [];
        const topImports = [];
        const topExports = [];
        const looseTopLevel = [];

        for (const child of ast.body || []) {
          if (child.type === "ClassDeclaration") {
            topClasses.push(child);
            if (child.id?.name) symbols.add(child.id.name);
          } else if (child.type === "ImportDeclaration") {
            topImports.push(child);
            imports.push(child.source?.value);
          } else if (
            child.type === "ExportNamedDeclaration" ||
            child.type === "ExportDefaultDeclaration" ||
            child.type === "ExportAllDeclaration"
          ) {
            topExports.push(child);
          } else if (child.type === "FunctionDeclaration") {
            if (child.id?.name) symbols.add(child.id.name);
            looseTopLevel.push(child.type);
          } else if (child.type === "VariableDeclaration") {
            looseTopLevel.push(child.type);
          } else if (child.type !== "EmptyStatement") {
            looseTopLevel.push(child.type);
          }
        }

        fileInfo.classCount = topClasses.length;
        fileInfo.importCount = topImports.length;
        fileInfo.exportCount = topExports.length;

        audit.totals.classes += topClasses.length;
        audit.totals.imports += topImports.length;
        audit.totals.exports += topExports.length;

        fileInfo.pureClass =
          topClasses.length === 1 &&
          topImports.length === 0 &&
          topExports.length === 0 &&
          looseTopLevel.length === 0 &&
          topClasses[0].id?.name &&
          path.endsWith(topClasses[0].id.name + ".js");

        if (fileInfo.pureClass) {
          audit.totals.pureClassOk++;
        } else {
          audit.totals.pureClassViolations++;
          fileInfo.warnings.push(
            [
              topClasses.length !== 1 ? "not exactly one top-level class" : null,
              topImports.length ? "has imports" : null,
              topExports.length ? "has exports" : null,
              looseTopLevel.length ? "has loose top-level nodes: " + looseTopLevel.join(", ") : null,
              topClasses[0]?.id?.name && !path.endsWith(topClasses[0].id.name + ".js")
                ? "class/file name mismatch"
                : null,
            ]
              .filter(Boolean)
              .join("; ")
          );
        }

        const collectMethod = (name, kind, astNode, owner = null) => {
          const source = content.slice(astNode.start, astNode.end);
          const method = {
            file: path,
            name: name || "(anonymous)",
            owner,
            kind,
            startLine: this._lineOf(content, astNode.start),
            endLine: this._lineOf(content, astNode.end),
            lines: source.split("\n").length,
            chars: source.length,
          };

          audit.methods.push(method);
          fileInfo.methodCount++;
        };

        this._walkAst(ast, (item) => {
          if (item.type === "Identifier" && item.name) {
            refs.add(item.name);
          }

          if (item.type === "FunctionDeclaration") {
            audit.totals.functions++;
            fileInfo.functionCount++;
            collectMethod(item.id?.name, "function", item, null);
          }

          if (item.type === "VariableDeclarator" && item.id?.name) {
            if (
              item.init?.type === "ArrowFunctionExpression" ||
              item.init?.type === "FunctionExpression"
            ) {
              symbols.add(item.id.name);
              audit.totals.functions++;
              fileInfo.functionCount++;
              collectMethod(item.id.name, "variable-function", item.init, null);
            }
          }
        });

        for (const cls of topClasses) {
          const className = cls.id?.name || "(anonymous-class)";

          for (const member of cls.body?.body || []) {
            if (member.type !== "MethodDefinition" && member.type !== "PropertyDefinition") {
              continue;
            }

            const key = member.key;
            const name =
              key?.name ||
              key?.value ||
              (key?.type === "PrivateIdentifier" ? "#" + key.name : "(computed)");

            if (member.start != null && member.end != null) {
              collectMethod(name, member.kind || "method", member, className);
            }
          }
        }

        audit.symbolsByFile[path] = Array.from(symbols).sort();
        audit.refsByFile[path] = Array.from(refs).sort();
        audit.importsByFile[path] = imports.filter(Boolean).sort();
      }

      _parseHtml(path, content, audit, fileInfo) {
        const deps = [];

        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, "text/html");

          for (const el of Array.from(doc.querySelectorAll("script[src]"))) {
            deps.push({
              tag: "script",
              attr: "src",
              value: el.getAttribute("src"),
              type: el.getAttribute("type") || "",
            });
          }

          for (const el of Array.from(doc.querySelectorAll("link[href]"))) {
            deps.push({
              tag: "link",
              attr: "href",
              value: el.getAttribute("href"),
              rel: el.getAttribute("rel") || "",
            });
          }

          for (const el of Array.from(doc.querySelectorAll("img[src]"))) {
            deps.push({
              tag: "img",
              attr: "src",
              value: el.getAttribute("src"),
            });
          }
        } catch (error) {
          fileInfo.warnings.push("HTML dependency parse failed: " + error.message);
        }

        audit.htmlDepsByFile[path] = deps;
      }

      _walkAst(root, visit) {
        const seen = new Set();

        const walk = (value, parent = null) => {
          if (!value || typeof value !== "object") return;
          if (seen.has(value)) return;
          seen.add(value);

          if (value.type) visit(value, parent);

          for (const key of Object.keys(value)) {
            if (
              key === "parent" ||
              key === "start" ||
              key === "end" ||
              key === "loc" ||
              key === "range"
            ) {
              continue;
            }

            const child = value[key];

            if (Array.isArray(child)) {
              for (const item of child) walk(item, value);
            } else if (child && typeof child === "object") {
              walk(child, value);
            }
          }
        };

        walk(root, null);
      }

      _lineOf(content, index) {
        return content.slice(0, index).split("\n").length;
      }

      _inferDependencyEdges(audit) {
        const symbolOwners = {};

        for (const [file, symbols] of Object.entries(audit.symbolsByFile)) {
          for (const symbol of symbols || []) {
            if (!symbolOwners[symbol]) symbolOwners[symbol] = [];
            symbolOwners[symbol].push(file);
          }
        }

        const edges = [];

        for (const [file, refs] of Object.entries(audit.refsByFile)) {
          const targets = new Set();

          for (const ref of refs || []) {
            const owners = symbolOwners[ref] || [];
            for (const owner of owners) {
              if (owner !== file) targets.add(owner);
            }
          }

          for (const target of targets) {
            edges.push({ from: file, to: target, kind: "identifier-symbol" });
          }
        }

        return edges;
      }

      _table(rows, columns) {
        const header = "| " + columns.join(" | ") + " |";
        const sep = "| " + columns.map(() => "---").join(" | ") + " |";
        const body = rows.map((row) => {
          return (
            "| " +
            columns
              .map((col) => {
                const value = row[col] ?? "";
                return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
              })
              .join(" | ") +
            " |"
          );
        });

        return [header, sep, ...body].join("\n");
      }

      _buildMarkdownReport(audit, cleanRoot) {
        const longestFiles = audit.files
          .slice()
          .sort((a, b) => b.lines - a.lines)
          .slice(0, 30);

        const largestMethodFiles = audit.files
          .slice()
          .sort((a, b) => b.methodCount - a.methodCount)
          .slice(0, 30);

        const longestMethods = audit.methods
          .slice()
          .sort((a, b) => b.lines - a.lines)
          .slice(0, 50);

        const conformanceProblems = audit.files
          .filter((f) => f.kind === "js" && !f.pureClass)
          .sort((a, b) => b.lines - a.lines)
          .slice(0, 80);

        const htmlDeps = Object.entries(audit.htmlDepsByFile)
          .filter(([, deps]) => deps && deps.length)
          .sort((a, b) => a[0].localeCompare(b[0]));

        return [
          "# Repo AST Audit",
          "",
          "Generated: `" + audit.finishedAt + "`",
          "",
          "Root: `" + cleanRoot + "`",
          "",
          "## Totals",
          "",
          "```json",
          JSON.stringify(audit.totals, null, 2),
          "```",
          "",
          "## Longest files",
          "",
          this._table(
            longestFiles.map((f) => ({
              path: f.path,
              kind: f.kind,
              lines: f.lines,
              chars: f.chars,
              methods: f.methodCount,
              warnings: f.warnings.join("; "),
            })),
            ["path", "kind", "lines", "chars", "methods", "warnings"]
          ),
          "",
          "## Files with the most methods",
          "",
          this._table(
            largestMethodFiles.map((f) => ({
              path: f.path,
              methods: f.methodCount,
              lines: f.lines,
              classes: f.classCount,
              functions: f.functionCount,
            })),
            ["path", "methods", "lines", "classes", "functions"]
          ),
          "",
          "## Longest methods / functions",
          "",
          this._table(
            longestMethods.map((m) => ({
              file: m.file,
              owner: m.owner || "",
              name: m.name,
              kind: m.kind,
              startLine: m.startLine,
              lines: m.lines,
              chars: m.chars,
            })),
            ["file", "owner", "name", "kind", "startLine", "lines", "chars"]
          ),
          "",
          "## Vibes pure-class conformance issues",
          "",
          conformanceProblems.length
            ? this._table(
                conformanceProblems.map((f) => ({
                  path: f.path,
                  lines: f.lines,
                  classes: f.classCount,
                  imports: f.importCount,
                  exports: f.exportCount,
                  warnings: f.warnings.join("; "),
                })),
                ["path", "lines", "classes", "imports", "exports", "warnings"]
              )
            : "_No JS conformance problems found._",
          "",
          "## HTML dependencies",
          "",
          htmlDeps.length
            ? htmlDeps
                .map(([file, deps]) => {
                  return [
                    "### `" + file + "`",
                    "",
                    this._table(
                      deps.map((d) => ({
                        tag: d.tag,
                        attr: d.attr,
                        value: d.value,
                        rel: d.rel || d.type || "",
                      })),
                      ["tag", "attr", "value", "rel"]
                    ),
                  ].join("\n");
                })
                .join("\n\n")
            : "_No HTML dependencies found. Clear the TreeWalker extension filter if HTML files were skipped._",
          "",
          "## Inferred dependency edges",
          "",
          audit.inferredEdges.length
            ? this._table(audit.inferredEdges.slice(0, 200), ["from", "to", "kind"])
            : "_No inferred symbol edges found._",
          "",
          audit.inferredEdges.length > 200
            ? "_Only first 200 dependency edges shown here. Full data is in the JSON report._"
            : "",
          "",
          "## Parse errors",
          "",
          audit.parseErrors.length
            ? this._table(audit.parseErrors, ["path", "error"])
            : "_No parse errors._",
          "",
        ].join("\n");
      }

}
