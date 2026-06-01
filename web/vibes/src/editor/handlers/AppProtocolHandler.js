
class AppProtocolHandler {
  
  constructor(app, commands) {
    this.app = app;
    this.commands = commands;
    this.commandMap = this._initializeCommandMap();
  }

  _initializeCommandMap() {
        return new Map([
          ['getRawFileList', this.commands.getRawFileList.bind(this.commands)],
          ['listFiles', this.commands.listFiles.bind(this.commands)],
          ['getDOM', this.commands.getDOM.bind(this.commands)],
          ['exec', this.commands.exec.bind(this.commands)],
          ['postRefresh', this.commands.postRefresh.bind(this.commands)],
          ['getImports', this.commands.getImports.bind(this.commands)],
          ['getImportMap', this.commands.getImportMap.bind(this.commands)],
          ['rebuildSymbolMap', this.commands.rebuildSymbolMap.bind(this.commands)],
          ['getReferenceMap', this.commands.getReferenceMap.bind(this.commands)],
          ['updateDoc', this.commands.updateDoc.bind(this.commands)],
          ['appendToDoc', this.commands.appendToDoc.bind(this.commands)],
          ['getFilesForConcept', this.commands.getFilesForConcept.bind(this.commands)],
          ['promptForReport', this.commands.promptForReport.bind(this.commands)],
          ['clearReports', this.commands.clearReports.bind(this.commands)],
          ['getFileContent', this.commands.getFileContent.bind(this.commands)],
          ['findPlaceholderDocs', this.commands.findPlaceholderDocs.bind(this.commands)],
          ['deleteFile', this.commands.deleteFile.bind(this.commands)],
          ['moveFile', this.commands.moveFile.bind(this.commands)],
          ['renameFile', this.commands.moveFile.bind(this.commands)],
          ['revertFile', this.commands.revertFile.bind(this.commands)],
          ['unsuppressReport', this.commands.unsuppressReport.bind(this.commands)],
          ['hotPatch', this.commands.hotPatch.bind(this.commands)],
          ['hotPatchModule', this.commands.hotPatchModule.bind(this.commands)],
          ['saveVisibilitySet', this.commands.saveVisibilitySet.bind(this.commands)],
          ['getAnalysisInDialog', this.commands.getAnalysisInDialog.bind(this.commands)],
          ['scanFileSizes', this.commands.scanFileSizes.bind(this.commands)],
          ['getDocIndex', this.commands.getDocIndex.bind(this.commands)],
          ['deletePlaceholderDocs', this.commands.deletePlaceholderDocs.bind(this.commands)],
          ['deleteVisibilitySet', this.commands.deleteVisibilitySet.bind(this.commands)],
          ['exportProjectAsJson', this.commands.exportProjectAsJson.bind(this.commands)],
          ['recalculateAllMetadata', this.commands.recalculateAllMetadata.bind(this.commands)],
          ['getTabLayout', this.commands.getTabLayout.bind(this.commands)],
          ['injectMetadataFooters', this.commands.injectMetadataFooters.bind(this.commands)],
          ['fuzzySearchMethods', this.commands.fuzzySearchMethods.bind(this.commands)],
        ]);
      }

  async handleCommand(command) {
    const commandName = command.command || command.action;

    if (!commandName) {
      const msg =
        "Received a command object without a 'command' or 'action' property.";
      this.app.uiManager.setStatus(msg, true);
      this.app._report('protocol:error:command:v1', msg, { command }, 10);
      return;
    }

    this.app.uiManager.setStatus(`Executing command: ${commandName}...`);
    const handler = this.commandMap.get(commandName);

    if (handler) {
      if (command.path && typeof command.path === 'string') {
        try {
          command.path = this.app.createPath(command.path);
        } catch (e) {
          this.app.uiManager.setStatus(
            `Invalid file path in command: "${command.path}". ${e.message}`,
            true
          );
          return;
        }
      }
      return await handler.call(this.commands, command);
    } else {
      this.app.uiManager.setStatus(`Unknown command: "${commandName}"`, true);
      this.app._report(
        'protocol:error:command:v1',
        'Unknown command action',
        { command },
        10
      );
    }
  }

  async handleDocUpdate(sourcePath, markdownContent) {
    let pathObj;
    try {
      pathObj = this.app.createPath(sourcePath);
    } catch (e) {
      this.app.uiManager.setStatus(
        `Invalid doc path provided: "${sourcePath}". ${e.message}`,
        true
      );
      return;
    }
    const goldenPath = pathObj.toString();
    this.app.uiManager.setStatus(`Updating documentation for ${goldenPath}...`);
    await this.app.documentationManager.replaceDocContent(
      goldenPath,
      markdownContent
    );
  }

  async handleDocAppend(sourcePath, markdownContent) {
    let pathObj;
    try {
      pathObj = this.app.createPath(sourcePath);
    } catch (e) {
      this.app.uiManager.setStatus(
        `Invalid doc path provided: "${sourcePath}". ${e.message}`,
        true
      );
      return;
    }
    const goldenPath = pathObj.toString();
    this.app.uiManager.setStatus(
      `Appending to documentation for ${goldenPath}...`
    );
    await this.app.documentationManager.appendToDoc(
      goldenPath,
      markdownContent
    );
  }

  _resolveTargetFile(input, hint = null) {
      if (!input) return null;
      const cleanInput = input.trim();
      if (cleanInput.startsWith('/@ext/')) return cleanInput;

      const projectName = this.app.projectName;
      const pfm = this.app.projectFilesManager;
      if (!pfm) return null;

      const trees = typeof pfm.getFileTreeViews === 'function' ? pfm.getFileTreeViews() : [];
      const allFiles = new Set();

      for (const tree of trees) {
        if (tree.nodesMap) {
          for (const key of tree.nodesMap.keys()) {
            const node = tree.nodesMap.get(key);
            if (node && node.type !== 'directory') {
              allFiles.add(key.startsWith('/') ? key : `/${projectName}/${key}`);
            }
          }
        }
      }

      const allFilesArr = Array.from(allFiles);

      // Filter by path hint if present
      if (hint && typeof hint === 'string') {
        const cleanHint = hint.toLowerCase().replace(/^\/+/, '');
        const filtered = allFilesArr.filter(p => p.toLowerCase().includes(cleanHint));
        if (filtered.length > 0) {
          return filtered[0];
        }
      }

      if (allFilesArr.includes(cleanInput)) return cleanInput;

      let normalized = cleanInput;
      if (normalized.startsWith(projectName + '/')) {
        normalized = '/' + normalized;
      }
      if (normalized.startsWith(`/${projectName}/`)) {
        if (allFilesArr.includes(normalized)) return normalized;
      } else {
        const candidate = normalized.startsWith('/')
          ? `/${projectName}${normalized}`
          : `/${projectName}/${normalized}`;
        if (allFilesArr.includes(candidate)) return candidate;
      }

      const searchSuffix = cleanInput.startsWith('/')
        ? cleanInput
        : '/' + cleanInput;
      const matches = allFilesArr.filter((path) => path.endsWith(searchSuffix));

      if (matches.length === 1) return matches[0];
      if (matches.length > 1) {
        const err = new Error(
          `Ambiguous path "${cleanInput}". Found ${matches.length} matches.`
        );
        err.matches = matches;
        throw err;
      }

      if (!cleanInput.endsWith('.js')) {
        const jsMatches = allFilesArr.filter((path) =>
          path.endsWith(searchSuffix + '.js')
        );
        if (jsMatches.length === 1) return jsMatches[0];
        if (jsMatches.length > 1) {
          const err = new Error(
            `Ambiguous path "${cleanInput}". Found ${jsMatches.length} matches (with .js).`
          );
          err.matches = jsMatches;
          throw err;
        }
      }

      return null;
    }

    


  static _doc_overview() {
      return "### AppProtocolHandler\n\nRoutes incoming commands and text blocks from the LLM or UI. Integrates directly with the AppCommands dispatcher.";
    }

  static _doc_diagnostics() {
      return `## Robust Path Resolution & Interactive Error Recovery\n\n- **Fuzzy Path Resolution**: Employs \`_resolveTargetFile\` to forgive AI file path hallucinations. If the LLM refers to \`Button.js\`, it searches the tree to find its unique matching path.\n- **Automatic Content Detection**: Analyzes incoming code blocks. If the code consists of naked class methods, it automatically diverts the execution to surgical transplant mode rather than replacing the whole file.\n- **Interactive Diagnostics**: If the LLM generates syntactically invalid code or broken protocol blocks, the handler spawns \`InteractivePasteDiagnosticDialog\`. This opens a CodeMirror modal highlighting the error line, allowing the user to manually correct the code and retry execution without breaking the workflow.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_routing()
      ].join('\n\n');
    }

  

  static _doc_routing() {
      return "### Routing and Dispatch\n\n- **Command Dispatch**: Matches the command name (e.g., 'revertFile') and forwards it to the associated method.\n- **Fuzzy Target Matching**: Resolves raw or relative file paths from the LLM into canonical golden paths.";
    }
}

