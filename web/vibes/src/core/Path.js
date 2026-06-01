class Path {
  
  static set enableLogging(v) { 
    this._enableLogging = v; 
  }
  
  constructor(pathString, context = {}) {
    const originalPathString = pathString;
    if (!pathString || typeof pathString !== 'string') {
      throw new Error('Path constructor requires a non-empty string.');
    }

    this._projectName = context.projectName;
    const trimmedPath = pathString.trim();

    // Support for External Absolute Paths via virtual mount
    if (trimmedPath.startsWith('/@ext/')) {
      this._type = 'EXTERNAL';
      this._goldenPath = trimmedPath;
    }
    // Normalize hosted library paths first
    else if (
      trimmedPath.startsWith('../library/') ||
      trimmedPath.startsWith('/library/') ||
      trimmedPath.startsWith('library/') ||
      trimmedPath.startsWith('../library/') ||
      trimmedPath.startsWith('/library/') ||
      trimmedPath.startsWith('library/')
    ) {
      this._type = 'SHARED_LIB';
      if (trimmedPath.startsWith('../library/')) {
        this._goldenPath = '/' + trimmedPath.substring(3);
      } else if (trimmedPath.startsWith('../library/')) {
        this._goldenPath = '/library/' + trimmedPath.substring('../library/'.length);
      } else if (trimmedPath.startsWith('/library/')) {
        this._goldenPath = '/library/' + trimmedPath.substring('/library/'.length);
      } else if (trimmedPath.startsWith('library/')) {
        this._goldenPath = '/library/' + trimmedPath.substring('library/'.length);
      } else if (!trimmedPath.startsWith('/')) {
        this._goldenPath = '/' + trimmedPath;
      } else {
        this._goldenPath = trimmedPath;
      }
    } else {
      // Handle project files
      this._type = 'PROJECT_FILE';
      if (!this._projectName) {
        // Attempt to infer project name from an incoming golden path
        const parts = trimmedPath.split('/');
        if (trimmedPath.startsWith('/') && parts.length > 1 && parts[1]) {
          this._projectName = parts[1];
        } else {
          throw new Error(
            `Path requires a projectName in context to resolve project path: "${pathString}"`
          );
        }
      }

      const projectPrefix = `/${this._projectName}/`;
      const relativeProjectPrefix = `${this._projectName}/`;

      if (trimmedPath.startsWith(projectPrefix)) {
        // Case 1: Already a valid golden path (e.g. "/teacup/src/file.js")
        this._goldenPath = trimmedPath;
      } else if (trimmedPath.startsWith(relativeProjectPrefix)) {
        // Case 2: Starts with project name but no leading slash (e.g. "teacup/src/file.js")
        // FIX: Prevent double nesting by just adding the leading slash.
        this._goldenPath = `/${trimmedPath}`;
      } else if (trimmedPath.startsWith('/')) {
        // Case 3: Absolute path from webroot, missing project context (e.g. "/src/file.js")
        this._goldenPath = `/${this._projectName}${trimmedPath}`;
      } else {
        // Case 4: Relative path from project root (e.g. "src/file.js")
        this._goldenPath = `/${this._projectName}/${trimmedPath}`;
      }
    }

    // Final normalization to clean up any weirdness like double slashes
    try {
      const url = new URL(this._goldenPath, 'file:///');
      this._goldenPath = url.pathname;
    } catch (e) {
      // Fallback if URL construction fails (rare for simple paths)
      this._goldenPath = this._goldenPath.replace(/\/+/g, '/');
    }
  }

  _logOp(opName, result) {
    if (Path.enableLogging) {
      const resultString =
        result instanceof Path
          ? result._goldenPath
          : result === null
          ? 'null'
          : String(result);
      const logString = `[Path OP] | On: '${this._goldenPath}' | Op: '${opName}' | Result: '${resultString}'`;
      console.log(logString);
    }
    return result;
  }

  get parent() {
    const lastSlash = this._goldenPath.lastIndexOf('/');
    if (lastSlash <= 0)
      return this._logOp(
        'get parent',
        new Path('/', { projectName: this._projectName })
      );
    const parentPath = this._goldenPath.substring(0, lastSlash);
    return this._logOp(
      'get parent',
      new Path(parentPath || '/', { projectName: this._projectName })
    );
  }

  get base() {
    const lastSlash = this._goldenPath.lastIndexOf('/');
    return this._logOp('get base', this._goldenPath.substring(lastSlash + 1));
  }

  get name() {
    const base = this.base;
    const lastDot = base.lastIndexOf('.');
    return this._logOp(
      'get name',
      lastDot > 0 ? base.substring(0, lastDot) : base
    );
  }

  get ext() {
    const base = this.base;
    const lastDot = base.lastIndexOf('.');
    return this._logOp('get ext', lastDot >= 0 ? base.substring(lastDot) : '');
  }

  get isSharedLib() {
    return this._logOp('get isSharedLib', this._type === 'SHARED_LIB');
  }

  get documentationPath() {
    if (this._type === 'ABSOLUTE' || this._type === 'EXTERNAL') return null;

    const parts = this._goldenPath.split('/');
    const filename = parts.pop();

    if (!filename || !filename.includes('.')) return null;

    const docFilename = filename.replace(/\./g, '_') + '.md';
    
    parts.push(docFilename);
    const docGoldenPath = parts.join('/');

    return new Path(docGoldenPath, { projectName: this._projectName });
  }

  toString() {
    return this._goldenPath;
  }

  toJSON() {
    return this.toString();
  }

  asMetadataKey() {
    // The metadata key is now always the full, unambiguous golden path.
    return this._goldenPath;
  }

  sibling(siblingName) {
    const newPath = new Path(`${this.parent.toString()}/${siblingName}`, {
      projectName: this._projectName,
    });
    return this._logOp(`sibling('${siblingName}')`, newPath);
  }

  changeExtension(newExt) {
    const newPath = new Path(
      `${this.parent.toString()}/${this.name}${newExt}`,
      { projectName: this._projectName }
    );
    return this._logOp(`changeExtension('${newExt}')`, newPath);
  }

    

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_usage(),
        this._doc_properties()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### Path\n\nA core abstraction representing a file or directory path within a Vibes workspace.\nIt normalizes paths, ensures a \`golden path\` format (always starting with a slash and the proper project namespace), and differentiates between shared library files, external files, and local project files.";
    }

  static _doc_usage() {
      return "### Usage\n\n```javascript\nconst p = new Path('src/core/MyClass.js', { projectName: 'teacup' });\nconsole.log(p.toString()); // '/teacup/src/core/MyClass.js'\n```";
    }

  static _doc_properties() {
      return "### Properties\n\n- \`parent\`: Returns a new Path object representing the parent directory.\n- \`base\`: Returns the final segment.\n- \`name\`: Returns the base name without extension.\n- \`ext\`: Returns the file extension.\n- \`isSharedLib\`: Boolean indicating if the file lives under the \`/library/\` namespace.\n- \`documentationPath\`: Returns a Path representing the sidecar Markdown documentation file.";
    }

}

