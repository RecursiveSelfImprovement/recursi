class RepoMethodSearchWalkSkill {

      async onDir(dirPath, env, walker) {
        const blocked = ["/node_modules", "/.git", "/dist", "/build", "/coverage", "/.vibes/reports"];

        if (blocked.some((part) => String(dirPath).includes(part))) {
          return { skip: true };
        }
      }

      async onFile(node, env, walker) {
        const path = node.path;
        const content = node.content || "";

        if (!/\.(js|mjs|cjs|jsx|ts|tsx)$/i.test(path)) return;

        const state = this._state(walker, env);
        state.scanned++;

        if (!state.query) return;

        const acorn = env.acorn || window.acorn;

        if (!acorn) {
          state.parseErrors.push({ path, error: "Acorn unavailable" });
          return;
        }

        try {
          let ast;

          try {
            ast = acorn.parse(content, {
              ecmaVersion: "latest",
              sourceType: "script",
              allowHashBang: true,
            });
          } catch (scriptError) {
            ast = acorn.parse(content, {
              ecmaVersion: "latest",
              sourceType: "module",
              allowHashBang: true,
            });
          }

          const addCandidate = (name, kind, astNode, owner = "") => {
            if (astNode.start == null || astNode.end == null) return;

            const source = content.slice(astNode.start, astNode.end);
            const haystack = (name + "\n" + source).toLowerCase();

            if (!haystack.includes(state.query.toLowerCase())) return;

            state.matches.push({
              file: path,
              owner,
              name,
              kind,
              startLine: this._lineOf(content, astNode.start),
              endLine: this._lineOf(content, astNode.end),
              lines: source.split("\n").length,
              chars: source.length,
              source,
            });

            env.highlightNode?.(path, "current", {
              label: "HIT",
              title: "Method search hit: " + name,
              duration: 1600,
            });
          };

          for (const top of ast.body || []) {
            if (top.type === "ClassDeclaration") {
              const owner = top.id?.name || "";

              for (const member of top.body?.body || []) {
                if (member.type !== "MethodDefinition" && member.type !== "PropertyDefinition") {
                  continue;
                }

                const name =
                  member.key?.name ||
                  member.key?.value ||
                  (member.key?.type === "PrivateIdentifier" ? "#" + member.key.name : "(computed)");

                addCandidate(name, member.kind || "method", member, owner);
              }
            }
          }

          this._walkAst(ast, (item) => {
            if (item.type === "FunctionDeclaration") {
              addCandidate(item.id?.name || "(anonymous)", "function", item, "");
            }

            if (
              item.type === "VariableDeclarator" &&
              item.id?.name &&
              (item.init?.type === "ArrowFunctionExpression" ||
                item.init?.type === "FunctionExpression")
            ) {
              addCandidate(item.id.name, "variable-function", item.init, "");
            }
          });
        } catch (error) {
          state.parseErrors.push({
            path,
            error: error.message || String(error),
          });

          env.highlightNode?.(path, "error", {
            label: "ERR",
            title: "Parse failed: " + error.message,
            duration: 0,
          });
        }
      }

      async onPause(node, env, walker) {
        const state = walker.__repoMethodSearch;

        if (!state) {
          env.log("No method search state yet.");
          return;
        }

        env.log("Query: " + state.query);
        env.log("Scanned files: " + state.scanned);
        env.log("Matches: " + state.matches.length);

        for (const match of state.matches.slice(-8)) {
          env.log(
            `${match.file}:${match.startLine} ${match.owner ? match.owner + "." : ""}${match.name} (${match.lines} lines)`
          );
        }
      }

      async onExport(results, env, walker) {
        const state = walker.__repoMethodSearch;

        if (!state) {
          env.log("No method search state to export.");
          return;
        }

        const cleanRoot = String(walker.rootPath || walker._launchPath || "/").replace(/\/+$/, "") || "/";
        const reportRoot = cleanRoot === "/" ? "/.vibes/reports" : cleanRoot + "/.vibes/reports";
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const mdPath = reportRoot + "/method-search-" + stamp + ".md";
        const jsonPath = reportRoot + "/method-search-" + stamp + ".json";

        const md = [
          "# Method Search Report",
          "",
          "Generated: `" + new Date().toISOString() + "`",
          "",
          "Root: `" + cleanRoot + "`",
          "",
          "Query: `" + state.query.replace(/`/g, "\\`") + "`",
          "",
          "Scanned JS files: `" + state.scanned + "`",
          "",
          "Matches: `" + state.matches.length + "`",
          "",
          ...state.matches.map((match, index) => {
            return [
              "## " +
                (index + 1) +
                ". `" +
                match.file +
                ":" +
                match.startLine +
                "` - `" +
                (match.owner ? match.owner + "." : "") +
                match.name +
                "`",
              "",
              "- kind: `" + match.kind + "`",
              "- lines: `" + match.lines + "`",
              "",
              "```javascript",
              match.source,
              "```",
              "",
            ].join("\n");
          }),
          "",
          "## Parse errors",
          "",
          state.parseErrors.length
            ? state.parseErrors.map((e) => "- `" + e.path + "` - " + e.error).join("\n")
            : "_No parse errors._",
          "",
        ].join("\n");

        env.writeFile(mdPath, md, { reason: "programmaticWrite" });
        env.writeFile(jsonPath, JSON.stringify(state, null, 2) + "\n", {
          reason: "programmaticWrite",
        });

        env.log("✅ Method search exported:");
        env.log(mdPath);
        env.log(jsonPath);

        try {
          await navigator.clipboard.writeText(md);
          env.log("📋 Method search markdown copied to clipboard.");
        } catch (error) {}
      }

      _state(walker, env) {
        if (walker.__repoMethodSearch) return walker.__repoMethodSearch;

        let query =
          walker.methodSearchQuery ||
          localStorage.getItem("vibes.repoMethodSearch.query") ||
          "";

        if (!query && typeof prompt === "function") {
          query = prompt("Search methods/functions for:", "metadata") || "";
        }

        query = String(query || "").trim();
        localStorage.setItem("vibes.repoMethodSearch.query", query);

        walker.__repoMethodSearch = {
          query,
          startedAt: new Date().toISOString(),
          scanned: 0,
          parseErrors: [],
          matches: [],
        };

        env.log("🔎 Method search query: " + (query || "(empty)"));
        return walker.__repoMethodSearch;
      }

      _lineOf(content, index) {
        return content.slice(0, index).split("\n").length;
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

}
