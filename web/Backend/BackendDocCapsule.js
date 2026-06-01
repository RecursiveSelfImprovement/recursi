class BackendDocCapsule {
    static getOverview() {
      return [
        '# Backend Console Overview',
        '',
        'The unified Backend Console is a lightweight, Port 8000 service designed to replace both',
        'the BigFileFinder server and the RecursiAdminTools server.',
        'It serves static projects, runs dynamic code blocks natively, and manages deployments.'
      ].join('\n');
    }

    static getArchitecture() {
      return [
        '## Architecture Layout',
        '',
        '- /Backend/ - Main application root directory',
        '- /Backend/browser/ - Contains Backend.js (the unified frontend control console)',
        '- /Backend/server/ - Home of Starter.js (minimal server entry point) and package.json',
        '- /Backend/server/utils/ - Generic backend helpers (FileWalker, PathUtils, etc.)',
        '- /Backend/server/apps/ - App specific backend helpers (BigFileScanner, MainSiteDeployer, etc.)'
      ].join('\n');
    }

    static getProtocol() {
      return [
        '## Dynamic Remote Execution Protocol',
        '',
        'The server exposes a unified execution endpoint at POST /run and POST /api/admin/run.',
        'It accepts serialized function strings from client frontends, executes them natively,',
        'and injects server parameters (fs, path, SftpClient, pathToFileURL, option configs) in a unified env context.'
      ].join('\n');
    }

    static getApiReference() {
      return [
        '## Server API Endpoints',
        '',
        '- POST /run - Dynamic code execution bridge (JSON body)',
        '- POST /api/admin/run - Dynamic code execution bridge (Raw text body)',
        '- GET /video - Byte-range multimedia streaming from local hard drive',
        '- GET / - Serves static files relative to the project web/ folder'
      ].join('\n');
    }
  }