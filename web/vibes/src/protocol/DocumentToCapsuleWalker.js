class DocumentToCapsuleWalker {
  
  constructor(options = {}) {
    this.options = {
      includeMarkdown: true,
      includeJson: true,
      includeYaml: true,
      excludeFolders: [
        "/node_modules/",
        "/thirdparty/",
        "/.git/",
        "/recursi-backups/",
        "/backups/",
        "/probable-garbage/",
      ],
      excludeExactFiles: [
        "/vibes/docs/DOCUMENT_TO_CAPSULE_WALKER_REPORT.md",
        "/vibes/docs/DOCUMENT_TO_CAPSULE_WALKER_VERIFIED_MIGRATION_REPORT.md",
        "/vibes/docs/CAPSULE_MIGRATION_CANDIDATES.md",
        "/vibes/docs/METHOD_LEVEL_AST_START_TODAY_RECON.md",
      ],
      docsFolder: "/vibes/docs/",
      reportPath: "/vibes/docs/DOCUMENT_TO_CAPSULE_WALKER_REPORT.md",
      ...options,
    };
  }

  runPlan(env, options = {}) {
    const effectiveOptions = {
      writeReport: true,
      ...options,
    };

    const files = env.listFiles();
    const jsCapsules = this.findStrictJsCapsules(env, files);
    const candidates = this.findDocumentCandidates(files);
    const plans = this.buildMigrationPlans(env, candidates, jsCapsules, files);
    const report = this.buildMarkdownReport(plans, jsCapsules, candidates);

    if (effectiveOptions.writeReport) {
      env.writeFile(this.options.reportPath, report);
    }

    return {
      ok: true,
      mode: "plan-only",
      reportPath: this.options.reportPath,
      candidateCount: candidates.length,
      strictCapsuleCount: jsCapsules.length,
      plans,
      report,
    };
  }

  findDocumentCandidates(files) {
    return files
      .filter((path) => this.isDocumentCandidate(path))
      .map((path) => this.describeDocumentCandidate(path))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  isDocumentCandidate(path) {
    if (this.isExcludedPath(path)) return false;
    if (this.options.excludeExactFiles.includes(path)) return false;

    if (this.options.includeMarkdown && path.endsWith(".md")) return true;
    if (this.options.includeJson && path.endsWith(".json")) return true;
    if (this.options.includeYaml && path.endsWith(".yaml")) return true;
    if (this.options.includeYaml && path.endsWith(".yml")) return true;

    return false;
  }

  isExcludedPath(path) {
    return this.options.excludeFolders.some((folder) => path.includes(folder));
  }

  describeDocumentCandidate(path) {
    const extension = this.getExtension(path);
    const kind = this.kindForExtension(extension);
    const basename = this.getBasename(path);
    const stem = this.getStem(path);

    return {
      path,
      extension,
      kind,
      directory: this.getDirectory(path),
      basename,
      stem,
      safeStem: this.toSafeMethodPart(stem),
      sidecarPattern: this.detectSidecarPattern(path),
    };
  }

  findStrictJsCapsules(env, files) {
    const acorn = this.getAcorn(env);
    const capsules = [];

    for (const path of files) {
      if (!path.endsWith(".js")) continue;
      if (this.isExcludedPath(path)) continue;

      const source = env.readFile(path);
      if (typeof source !== "string") continue;

      const analysis = this.analyzeJsFile(acorn, path, source);
      if (analysis.ok && analysis.strictCapsule) {
        capsules.push(analysis);
      }
    }

    return capsules.sort((a, b) => a.path.localeCompare(b.path));
  }

  analyzeJsFile(acorn, path, source) {
    if (!acorn) {
      return {
        ok: false,
        path,
        error: "Acorn unavailable",
      };
    }

    try {
      const ast = acorn.parse(source, {
        ecmaVersion: "latest",
        sourceType: "script",
        locations: true,
      });

      const body = ast.body.filter((node) => node.type !== "EmptyStatement");
      const classNodes = body.filter((node) => node.type === "ClassDeclaration");
      const imports = body.filter((node) => node.type === "ImportDeclaration");
      const exports = body.filter((node) => this.isExportNode(node));
      const loose = body.filter(
        (node) =>
          node.type !== "ClassDeclaration" &&
          node.type !== "ImportDeclaration" &&
          !this.isExportNode(node)
      );

      const classNode = classNodes[0] || null;
      const className = classNode && classNode.id ? classNode.id.name : null;
      const expectedFileName = className ? className + ".js" : null;

      return {
        ok: true,
        path,
        directory: this.getDirectory(path),
        basename: this.getBasename(path),
        stem: this.getStem(path),
        className,
        methodNames: classNode ? this.getClassMethodNames(classNode) : [],
        topLevelClassCount: classNodes.length,
        importCount: imports.length,
        exportCount: exports.length,
        looseTopLevelCount: loose.length,
        strictCapsule:
          classNodes.length === 1 &&
          imports.length === 0 &&
          exports.length === 0 &&
          loose.length === 0 &&
          expectedFileName === this.getBasename(path),
      };
    } catch (error) {
      return {
        ok: false,
        path,
        error: error.message,
      };
    }
  }

  getClassMethodNames(classNode) {
    const names = [];

    for (const item of classNode.body.body || []) {
      if (item.type !== "MethodDefinition") continue;
      names.push(this.getMethodName(item));
    }

    return names;
  }

  getMethodName(methodNode) {
    if (!methodNode.key) return "(unknown)";
    if (methodNode.key.type === "Identifier") return methodNode.key.name;
    if (methodNode.key.type === "Literal") return String(methodNode.key.value);
    return methodNode.key.type;
  }

  isExportNode(node) {
    return (
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration" ||
      node.type === "ExportAllDeclaration"
    );
  }

  buildMigrationPlans(env, candidates, jsCapsules, allFiles) {
    const rawPlans = candidates.map((candidate) =>
      this.buildMigrationPlan(env, candidate, jsCapsules, allFiles)
    );

    return this.resolvePlanMethodCollisions(rawPlans);
  }

  buildMigrationPlan(env, candidate, jsCapsules, allFiles) {
    const source = env.readFile(candidate.path);
    const size = typeof source === "string" ? source.length : null;
    const lineCount = typeof source === "string" ? source.split("\n").length : null;
    const owner = this.findLikelyOwner(candidate, jsCapsules, allFiles);
    const methodName = this.proposedMethodName(candidate, owner);
    const alreadyEmbedded =
      owner && Array.isArray(owner.methodNames) && owner.methodNames.includes(methodName);

    return {
      sourcePath: candidate.path,
      sourceKind: candidate.kind,
      extension: candidate.extension,
      size,
      lineCount,
      ownerPath: owner ? owner.path : null,
      ownerClassName: owner ? owner.className : null,
      migrationKind: owner ? "embed-in-owner-capsule" : "create-standalone-capsule",
      migrationStatus: alreadyEmbedded
        ? "embedded-original-retained"
        : "pending",
      alreadyEmbedded,
      proposedMethodName: methodName,
      proposedCapsulePath: owner
        ? owner.path
        : this.proposedStandaloneCapsulePath(candidate),
      notes: this.buildPlanNotes(candidate, owner, alreadyEmbedded),
    };
  }

  findLikelyOwner(candidate, jsCapsules, allFiles) {
    const sameDirectoryCapsules = jsCapsules.filter(
      (capsule) => capsule.directory === candidate.directory
    );

    if (candidate.basename.endsWith("_js.md")) {
      const ownerStem = candidate.basename.slice(0, -"_js.md".length);
      const ownerPath = candidate.directory + "/" + ownerStem + ".js";
      const owner = jsCapsules.find((capsule) => capsule.path === ownerPath);
      if (owner) return owner;
    }

    if (
      candidate.basename.endsWith(".meta.yaml") ||
      candidate.basename.endsWith(".meta.yml")
    ) {
      const ownerStem = candidate.stem;
      const ownerPath = candidate.directory + "/" + ownerStem + ".js";
      const owner = jsCapsules.find((capsule) => capsule.path === ownerPath);
      if (owner) return owner;
    }

    const exactStemOwner = sameDirectoryCapsules.find(
      (capsule) => capsule.stem === candidate.stem
    );
    if (exactStemOwner) return exactStemOwner;

    const withoutCommonDocSuffix = this.removeCommonDocSuffix(candidate.stem);
    if (withoutCommonDocSuffix !== candidate.stem) {
      const suffixOwner = sameDirectoryCapsules.find(
        (capsule) => capsule.stem === withoutCommonDocSuffix
      );
      if (suffixOwner) return suffixOwner;
    }

    const adjacentJsPath = candidate.directory + "/" + candidate.stem + ".js";
    if (allFiles.includes(adjacentJsPath)) {
      return jsCapsules.find((capsule) => capsule.path === adjacentJsPath) || null;
    }

    return null;
  }

  removeCommonDocSuffix(stem) {
    const suffixes = [
      ".docs",
      ".doc",
      ".readme",
      "-docs",
      "-doc",
      "-readme",
      "_docs",
      "_doc",
      "_readme",
    ];

    for (const suffix of suffixes) {
      if (stem.toLowerCase().endsWith(suffix)) {
        return stem.slice(0, stem.length - suffix.length);
      }
    }

    return stem;
  }

  proposedMethodName(candidate, owner) {
    const safeStem = candidate.safeStem || "document";

    if (candidate.kind === "markdown") {
      return "_doc_" + safeStem;
    }

    if (candidate.kind === "json") {
      return "_meta_" + safeStem + "Json";
    }

    if (candidate.kind === "yaml") {
      return "_meta_" + safeStem + "Yaml";
    }

    return owner ? "_doc_" + safeStem : "_meta_" + safeStem;
  }

  proposedStandaloneCapsulePath(candidate) {
    const baseParts = [];

    const relative = candidate.path
      .replace(/^\/vibes\//, "")
      .replace(/\.(md|json|yaml|yml)$/i, "")
      .replace(/_js$/i, "")
      .replace(/_md$/i, "")
      .replace(/\.meta$/i, " meta");

    for (const rawPart of relative.split("/")) {
      const safe = this.toPascalCase(rawPart);
      if (safe) baseParts.push(safe);
    }

    const capsuleName = baseParts.join("") + "Capsule";
    return this.options.docsFolder + capsuleName + ".js";
  }

  buildPlanNotes(candidate, owner, alreadyEmbedded = false) {
    const notes = [];

    if (alreadyEmbedded) {
      notes.push(
        "Already embedded in owner capsule. Original sidecar is retained for now and should not be migrated again unless replacement is explicitly requested."
      );
    }

    if (candidate.kind === "markdown") {
      notes.push(
        "Markdown should initially migrate into a _doc_ method. Long strings are allowed for _doc_ methods during migration."
      );
      notes.push(
        "Future passes should split this into smaller composable doc methods and move code samples into real example methods where possible."
      );
    }

    if (candidate.kind === "json") {
      notes.push(
        "JSON should migrate into a structured _meta_ or runtime data method, not remain a loose .json sidecar."
      );
    }

    if (candidate.kind === "yaml") {
      notes.push(
        "YAML should initially migrate with an auto-generated warning comment/note saying it was imported and should later be converted into structured metadata."
      );
    }

    if (owner) {
      notes.push("Likely owner found by basename/directory adjacency.");
    } else {
      notes.push(
        "No obvious owner capsule found. Plan is to create a standalone documentation/data capsule."
      );
    }

    return notes;
  }

  buildMarkdownReport(plans, jsCapsules, candidates) {
    const summary = this.buildMigrationReportSummary(plans);
    const lines = [];

    lines.push("# Document To Capsule Walker Report");
    lines.push("");
    lines.push("Generated: " + new Date().toISOString());
    lines.push("");
    lines.push("## Mode");
    lines.push("");
    lines.push("Plan only. No source documents were deleted. No owning capsules were modified.");
    lines.push("");
    lines.push("## Priority");
    lines.push("");
    lines.push("- Lowest priority: separate method editor.");
    lines.push("- High priority: signature/doc viewing, LLM AST transplant reliability, capsule migration walkers.");
    lines.push("");
    lines.push("## Counts");
    lines.push("");
    lines.push("- Strict JS capsules found: " + jsCapsules.length);
    lines.push("- Document/data candidates found: " + candidates.length);
    lines.push("- Planned migrations: " + plans.length);
    lines.push("- Embed in owner capsule: " + summary.embedInOwnerCount);
    lines.push("- Create standalone capsule: " + summary.standaloneCapsuleCount);
    lines.push("- Already embedded, original retained: " + summary.alreadyEmbeddedCount);
    lines.push("- Pending: " + summary.pendingCount);
    lines.push("- Duplicate target/method collisions: " + summary.duplicateTargetCount);
    lines.push("");

    if (summary.duplicateTargets.length) {
      lines.push("## Duplicate target collisions");
      lines.push("");
      for (const duplicate of summary.duplicateTargets) {
        lines.push("### `" + duplicate.key + "`");
        lines.push("");
        for (const source of duplicate.sources) {
          lines.push("- `" + source + "`");
        }
        lines.push("");
      }
    }

    lines.push("## Already embedded, original retained");
    lines.push("");

    const alreadyEmbeddedPlans = plans.filter((plan) => plan.alreadyEmbedded);
    if (!alreadyEmbeddedPlans.length) {
      lines.push("_None yet._");
      lines.push("");
    } else {
      for (const plan of alreadyEmbeddedPlans) {
        lines.push(
          "- `" +
            plan.sourcePath +
            "` → `" +
            plan.ownerPath +
            "` :: `" +
            plan.proposedMethodName +
            "`"
        );
      }
      lines.push("");
    }

    lines.push("## Planned migrations");
    lines.push("");

    for (const plan of plans) {
      lines.push("### `" + plan.sourcePath + "`");
      lines.push("");
      lines.push("- Kind: `" + plan.sourceKind + "`");
      lines.push("- Status: `" + plan.migrationStatus + "`");
      lines.push("- Size: " + (plan.size === null ? "unreadable" : plan.size + " chars"));
      lines.push("- Lines: " + (plan.lineCount === null ? "unreadable" : plan.lineCount));
      lines.push("- Migration: `" + plan.migrationKind + "`");
      lines.push("- Target capsule: `" + plan.proposedCapsulePath + "`");

      if (plan.ownerClassName) {
        lines.push("- Owner class: `" + plan.ownerClassName + "`");
      }

      lines.push("- Proposed method: `" + plan.proposedMethodName + "`");
      lines.push("- Notes:");

      for (const note of plan.notes) {
        lines.push("  - " + note);
      }

      lines.push("");
    }

    lines.push("## Next implementation step");
    lines.push("");
    lines.push(
      "After already-embedded detection is verified, migrate a tiny batch of 3-5 allowlisted _js.md sidecars into owner capsules. Keep originals retained."
    );
    lines.push("");
    lines.push("## Rules");
    lines.push("");
    lines.push("- No regex JavaScript surgery.");
    lines.push("- No brace counting.");
    lines.push("- No deletion of original sidecars until verified.");
    lines.push("- `_doc_` methods may contain long strings during migration.");
    lines.push("- Future documentation should become composable methods with real example code methods where practical.");
    lines.push("");

    return lines.join("\n");
  }

  getAcorn(env) {
    if (env && env.acorn) return env.acorn;
    if (window.acorn) return window.acorn;
    return null;
  }

  getExtension(path) {
    const slash = path.lastIndexOf("/");
    const dot = path.lastIndexOf(".");
    if (dot <= slash) return "";
    return path.slice(dot);
  }

  kindForExtension(extension) {
    if (extension === ".md") return "markdown";
    if (extension === ".json") return "json";
    if (extension === ".yaml" || extension === ".yml") return "yaml";
    return "unknown";
  }

  getDirectory(path) {
    const slash = path.lastIndexOf("/");
    if (slash < 0) return "";
    return path.slice(0, slash);
  }

  getBasename(path) {
    const slash = path.lastIndexOf("/");
    return slash < 0 ? path : path.slice(slash + 1);
  }

  getStem(path) {
    const basename = this.getBasename(path);

    if (basename.endsWith("_js.md")) {
      return basename.slice(0, -"_js.md".length);
    }

    if (basename.endsWith("_md.md")) {
      return basename.slice(0, -"_md.md".length);
    }

    if (basename.endsWith(".meta.yaml")) {
      return basename.slice(0, -".meta.yaml".length);
    }

    if (basename.endsWith(".meta.yml")) {
      return basename.slice(0, -".meta.yml".length);
    }

    const dot = basename.lastIndexOf(".");
    return dot < 0 ? basename : basename.slice(0, dot);
  }

  toSafeMethodPart(value) {
    const text = String(value || "document");
    let out = "";
    let capitalizeNext = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const isDigit = ch >= "0" && ch <= "9";
      const isLower = ch >= "a" && ch <= "z";
      const isUpper = ch >= "A" && ch <= "Z";

      if (isDigit || isLower || isUpper) {
        if (!out && isDigit) out += "n";
        if (capitalizeNext && isLower) {
          out += ch.toUpperCase();
        } else {
          out += ch;
        }
        capitalizeNext = false;
      } else {
        capitalizeNext = out.length > 0;
      }
    }

    return out || "document";
  }

  toPascalCase(value) {
    const safe = this.toSafeMethodPart(value);
    return safe.charAt(0).toUpperCase() + safe.slice(1);
  }

  detectSidecarPattern(path) {
    const basename = this.getBasename(path);

    if (basename.endsWith("_js.md")) return "generated-js-doc";
    if (basename.endsWith("_md.md")) return "generated-md-doc";
    if (basename.endsWith(".meta.yaml")) return "yaml-meta-sidecar";
    if (basename.endsWith(".meta.yml")) return "yaml-meta-sidecar";
    if (basename === "_folder.meta.yaml" || basename === "_folder.meta.yml") {
      return "folder-meta";
    }

    return "generic";
  }

  buildMigrationReportSummary(plans) {
    const embeds = plans.filter(
      (plan) => plan.migrationKind === "embed-in-owner-capsule"
    );
    const standalone = plans.filter(
      (plan) => plan.migrationKind === "create-standalone-capsule"
    );
    const alreadyEmbedded = plans.filter((plan) => plan.alreadyEmbedded);
    const pending = plans.filter((plan) => plan.migrationStatus === "pending");
    const duplicateTargets = this.findDuplicateTargets(
      plans.filter((plan) => !plan.alreadyEmbedded)
    );

    return {
      embedInOwnerCount: embeds.length,
      standaloneCapsuleCount: standalone.length,
      alreadyEmbeddedCount: alreadyEmbedded.length,
      pendingCount: pending.length,
      duplicateTargetCount: duplicateTargets.length,
      duplicateTargets,
    };
  }

  findDuplicateTargets(plans) {
    const byTarget = new Map();

    for (const plan of plans) {
      const key =
        plan.migrationKind +
        "::" +
        plan.proposedCapsulePath +
        "::" +
        plan.proposedMethodName;

      if (!byTarget.has(key)) byTarget.set(key, []);
      byTarget.get(key).push(plan.sourcePath);
    }

    return [...byTarget.entries()]
      .filter((entry) => entry[1].length > 1)
      .map((entry) => {
        return {
          key: entry[0],
          sources: entry[1],
        };
      });
  }

  resolvePlanMethodCollisions(plans) {
    const buckets = new Map();

    for (const plan of plans) {
      const key = plan.proposedCapsulePath + "::" + plan.proposedMethodName;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(plan);
    }

    for (const group of buckets.values()) {
      if (group.length <= 1) continue;

      for (const plan of group) {
        const suffix = this.methodSuffixForSourcePath(plan.sourcePath);
        const original = plan.proposedMethodName;

        if (!plan.proposedMethodName.endsWith(suffix)) {
          plan.proposedMethodName = plan.proposedMethodName + suffix;
        }

        plan.collisionResolved = true;
        plan.originalProposedMethodName = original;
        plan.notes = [
          ...plan.notes,
          "Method-name collision detected and resolved deterministically: `" +
            original +
            "` → `" +
            plan.proposedMethodName +
            "`.",
        ];
      }
    }

    return plans;
  }

  methodSuffixForSourcePath(path) {
    const basename = this.getBasename(path);

    if (basename.endsWith("_js.md")) return "JsDoc";
    if (basename.endsWith("_md.md")) return "MdDoc";
    if (basename.endsWith(".meta.yaml")) return "YamlMeta";
    if (basename.endsWith(".meta.yml")) return "YamlMeta";
    if (basename.endsWith(".json")) return "JsonData";
    if (basename.endsWith(".md")) return "MarkdownDoc";
    if (basename.endsWith(".yaml")) return "YamlData";
    if (basename.endsWith(".yml")) return "YamlData";

    return "Sidecar";
  }

  runVerifiedOwnerMigration(env, options = {}) {
    const allowlist = options.allowlist || [];
    const dryRun = options.dryRun !== false;
    const reportPath =
      options.reportPath ||
      "/vibes/docs/DOCUMENT_TO_CAPSULE_WALKER_VERIFIED_MIGRATION_REPORT.md";

    if (!allowlist.length) {
      return {
        ok: false,
        error: "runVerifiedOwnerMigration requires an explicit allowlist.",
      };
    }

    const planResult = this.runPlan(env, { writeReport: false });
    if (!planResult.ok) return planResult;

    const selectedPlans = planResult.plans.filter((plan) =>
      allowlist.includes(plan.sourcePath)
    );

    const lines = [];
    const results = [];

    lines.push("# Document To Capsule Walker Verified Migration Report");
    lines.push("");
    lines.push("Generated: " + new Date().toISOString());
    lines.push("");
    lines.push("Dry run: " + (dryRun ? "YES" : "NO"));
    lines.push("");
    lines.push("## Allowlist");
    lines.push("");
    for (const path of allowlist) lines.push("- `" + path + "`");
    lines.push("");

    if (selectedPlans.length !== allowlist.length) {
      const found = new Set(selectedPlans.map((plan) => plan.sourcePath));
      lines.push("## Missing allowlisted paths");
      lines.push("");
      for (const path of allowlist) {
        if (!found.has(path)) lines.push("- `" + path + "`");
      }
      lines.push("");
    }

    for (const plan of selectedPlans) {
      const result = this.migrateOneOwnerSidecar(env, plan, { dryRun });
      results.push(result);
      this.appendMigrationResult(lines, result);
    }

    const ok = results.every((result) => result.ok);
    lines.push("## Overall");
    lines.push("");
    lines.push("- OK: " + (ok ? "YES" : "NO"));
    lines.push("- Migrated/staged count: " + results.filter((r) => r.ok).length);
    lines.push("- Failed count: " + results.filter((r) => !r.ok).length);
    lines.push("");
    lines.push("## Safety");
    lines.push("");
    lines.push("- No sidecar files were deleted.");
    lines.push("- Owner source is parsed before and after modification.");
    lines.push("- Insert location comes from Acorn AST class-body coordinates.");
    lines.push("- Method source is generated only for `_doc_`/`_meta_` sidecar content.");
    lines.push("- This is intentionally allowlisted, not whole-tree migration.");
    lines.push("");

    const report = lines.join("\n");
    env.writeFile(reportPath, report);

    return {
      ok,
      dryRun,
      reportPath,
      results,
      report,
    };
  }

  migrateOneOwnerSidecar(env, plan, options = {}) {
    const dryRun = options.dryRun !== false;

    if (plan.migrationKind !== "embed-in-owner-capsule") {
      return {
        ok: false,
        sourcePath: plan.sourcePath,
        error: "Plan is not an embed-in-owner-capsule migration.",
        plan,
      };
    }

    const sourceDoc = env.readFile(plan.sourcePath);
    if (typeof sourceDoc !== "string") {
      return {
        ok: false,
        sourcePath: plan.sourcePath,
        error: "Could not read sidecar source.",
        plan,
      };
    }

    const ownerSource = env.readFile(plan.ownerPath);
    if (typeof ownerSource !== "string") {
      return {
        ok: false,
        sourcePath: plan.sourcePath,
        ownerPath: plan.ownerPath,
        error: "Could not read owner capsule.",
        plan,
      };
    }

    const acorn = this.getAcorn(env);
    const beforeAnalysis = this.analyzeJsFile(acorn, plan.ownerPath, ownerSource);
    if (!beforeAnalysis.ok || !beforeAnalysis.strictCapsule) {
      return {
        ok: false,
        sourcePath: plan.sourcePath,
        ownerPath: plan.ownerPath,
        error: "Owner is not a strict parseable capsule.",
        beforeAnalysis,
        plan,
      };
    }

    const patch = this.insertOrReplaceGeneratedDocMethod(
      acorn,
      ownerSource,
      beforeAnalysis.className,
      plan.proposedMethodName,
      this.buildGeneratedSidecarMethodSource(plan, sourceDoc)
    );

    if (!patch.ok) {
      return {
        ok: false,
        sourcePath: plan.sourcePath,
        ownerPath: plan.ownerPath,
        error: patch.error,
        plan,
      };
    }

    const afterAnalysis = this.analyzeJsFile(acorn, plan.ownerPath, patch.source);
    if (!afterAnalysis.ok || !afterAnalysis.strictCapsule) {
      return {
        ok: false,
        sourcePath: plan.sourcePath,
        ownerPath: plan.ownerPath,
        error: "Modified owner failed strict parse validation.",
        afterAnalysis,
        plan,
      };
    }

    if (!afterAnalysis.methodNames.includes(plan.proposedMethodName)) {
      return {
        ok: false,
        sourcePath: plan.sourcePath,
        ownerPath: plan.ownerPath,
        error: "Modified owner parsed, but expected method was not present.",
        methodName: plan.proposedMethodName,
        afterAnalysis,
        plan,
      };
    }

    if (!dryRun) {
      env.writeFile(plan.ownerPath, patch.source);
    }

    return {
      ok: true,
      dryRun,
      action: patch.action,
      sourcePath: plan.sourcePath,
      ownerPath: plan.ownerPath,
      ownerClassName: plan.ownerClassName,
      methodName: plan.proposedMethodName,
      beforeLength: ownerSource.length,
      afterLength: patch.source.length,
      delta: patch.source.length - ownerSource.length,
      sidecarLength: sourceDoc.length,
      sidecarLines: sourceDoc.split("\n").length,
      plan,
    };
  }

  insertOrReplaceGeneratedDocMethod(acorn, ownerSource, className, methodName, methodSource) {
    let ast;

    try {
      ast = acorn.parse(ownerSource, {
        ecmaVersion: "latest",
        sourceType: "script",
        locations: true,
        ranges: true,
      });
    } catch (error) {
      return {
        ok: false,
        error: "Owner parse failed: " + error.message,
      };
    }

    const classNode = ast.body.find(
      (node) =>
        node.type === "ClassDeclaration" &&
        node.id &&
        node.id.name === className
    );

    if (!classNode) {
      return {
        ok: false,
        error: "Class not found in owner source: " + className,
      };
    }

    const existingMethod = (classNode.body.body || []).find(
      (node) =>
        node.type === "MethodDefinition" &&
        this.getMethodName(node) === methodName
    );

    if (existingMethod) {
      const start = existingMethod.start;
      const end = existingMethod.end;
      const before = ownerSource.slice(0, start);
      const after = ownerSource.slice(end);
      return {
        ok: true,
        action: "replaced",
        source: before + methodSource + after,
      };
    }

    const insertAt = classNode.body.end - 1;
    const before = ownerSource.slice(0, insertAt).replace(/\s*$/, "");
    const after = ownerSource.slice(insertAt);

    return {
      ok: true,
      action: "inserted",
      source: before + "\n\n" + methodSource + "\n" + after,
    };
  }

  buildGeneratedSidecarMethodSource(plan, content) {
    const escaped = this.escapeForTemplateLiteral(content);
    const methodName = plan.proposedMethodName;
    const sourcePath = plan.sourcePath;
    const generatedAt = new Date().toISOString();

    return `  static ${methodName}() {
    return {
      generatedBy: "DocumentToCapsuleWalker",
      generatedAt: "${generatedAt}",
      sourcePath: "${sourcePath}",
      migrationStatus: "sidecar-embedded-original-retained",
      note: "Automatically embedded from a sidecar file. The original sidecar was intentionally retained. Future passes should convert this into structured/composable capsule documentation where useful.",
      content: \`${escaped}\`
    };
  }`;
  }

  escapeForTemplateLiteral(text) {
    return String(text)
      .replaceAll("\\", "\\\\")
      .replaceAll("`", "\\`")
      .replaceAll("${", "\\${");
  }

  appendMigrationResult(lines, result) {
    lines.push("## `" + result.sourcePath + "`");
    lines.push("");

    if (!result.ok) {
      lines.push("- OK: NO");
      lines.push("- Error: `" + result.error + "`");
      if (result.ownerPath) lines.push("- Owner: `" + result.ownerPath + "`");
      lines.push("");
      return;
    }

    lines.push("- OK: YES");
    lines.push("- Dry run: " + (result.dryRun ? "YES" : "NO"));
    lines.push("- Action: `" + result.action + "`");
    lines.push("- Owner: `" + result.ownerPath + "`");
    lines.push("- Owner class: `" + result.ownerClassName + "`");
    lines.push("- Method: `" + result.methodName + "`");
    lines.push("- Sidecar size: " + result.sidecarLength + " chars");
    lines.push("- Sidecar lines: " + result.sidecarLines);
    lines.push("- Owner size before: " + result.beforeLength);
    lines.push("- Owner size after: " + result.afterLength);
    lines.push("- Delta: " + result.delta);
    lines.push("");
  }

}