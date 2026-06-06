class StaticServerCapsule {
static createServer(options = {}) {
    const modules = options.modules || {};
    const http = modules.http;
    const fs = modules.fs;
    const path = modules.path;
    const url = modules.url;

    if (!http || !fs || !path || !url) {
      throw new Error("StaticServerCapsule.createServer requires http, fs, path, and url modules.");
    }

    const config = this.normalizeConfig(options, modules);
    const server = http.createServer((request, response) => {
      this.handleRequest({
        request,
        response,
        config,
        modules
      });
    });

    return {
      server,
      config
    };
  }

  static normalizeConfig(options = {}, modules = {}) {
    const path = modules.path;
    const processObject = modules.process || process;

    const webRoot = options.webRoot
      ? path.resolve(options.webRoot)
      : path.resolve(__dirname, "..", "..");

    const port = Number(options.port || processObject.env.VIBES_STATIC_PORT || 7103);

    return {
      webRoot,
      port,
      host: options.host || processObject.env.VIBES_STATIC_HOST || "127.0.0.1",
      defaultDocument: options.defaultDocument || "/vibes/index.html",
      indexNames: ["index.html"],
      blockedSegments: new Set([
        ".git",
        ".hg",
        ".svn",
        "node_modules",
        ".DS_Store",
        ".vscode",
        ".idea",
        "__pycache__",
        ".cache"
      ]),
      noApi: true,
      cacheControl: options.cacheControl || "no-store"
    };
  }

  static handleRequest(context = {}) {
      const request = context.request;
      const response = context.response;
      const config = context.config;
      const modules = context.modules || {};
      const fs = modules.fs;
      const path = modules.path;
      const url = modules.url;

      try {
        if (!request || !response) throw new Error('Missing request or response.');

        const parsed = url.parse(request.url || '/');
        const pathname = this.decodePathname(parsed.pathname || '/');

        // CORS headers for all requests so phone can reach computer across LAN
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

        if (request.method === 'OPTIONS') {
          response.writeHead(204);
          response.end();
          return;
        }

        // Signal corkboard: POST /signal/:topic  →  store message
        //                    GET  /signal/:topic  →  retrieve message
        if (pathname.startsWith('/signal/')) {
          this._handleSignal(request, response, pathname, config);
          return;
        }

        if (this.isApiPath(pathname)) {
          this.sendText(response, 410, 'Node API disabled on Vibes static test server.\n', 'text/plain');
          return;
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
          this.sendText(response, 405, 'Method not allowed.\n', 'text/plain');
          return;
        }

        const resolved = this.resolveRequestPath(pathname, config, modules);
        if (!resolved.ok) {
          this.sendText(response, resolved.status || 403, resolved.message || 'Forbidden.\n', 'text/plain');
          return;
        }

        let filePath = resolved.filePath;
        if (!fs.existsSync(filePath)) {
          if (pathname === '/' || pathname === '') {
            filePath = path.join(config.webRoot, config.defaultDocument);
          }
        }

        if (!fs.existsSync(filePath)) {
          this.sendText(response, 404, 'Not found: ' + pathname + '\n', 'text/plain');
          return;
        }

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          const indexPath = this.findIndexFile(filePath, config, modules);
          if (!indexPath) {
            this.sendText(response, 403, 'Directory listing disabled.\n', 'text/plain');
            return;
          }
          filePath = indexPath;
        }

        this.sendFile({ request, response, filePath, config, modules });

      } catch (error) {
        this.sendText(response, 500, 'Static server error: ' + error.message + '\n', 'text/plain');
      }
    }

  static decodePathname(pathname) {
    try {
      return decodeURIComponent(String(pathname || "/"));
    } catch (error) {
      return "/";
    }
  }

  static isApiPath(pathname) {
    const text = String(pathname || "");
    return text === "/api" || text.startsWith("/api/");
  }

  static resolveRequestPath(pathname, config, modules) {
    const path = modules.path;

    let clean = String(pathname || "/").split("?")[0].split("#")[0];

    while (clean.includes("//")) {
      clean = clean.split("//").join("/");
    }

    if (!clean.startsWith("/")) {
      clean = "/" + clean;
    }

    const pieces = clean.split("/").filter(Boolean);

    for (const piece of pieces) {
      if (piece === ".." || piece === ".") {
        return {
          ok: false,
          status: 403,
          message: "Forbidden path segment.\n"
        };
      }

      if (config.blockedSegments.has(piece)) {
        return {
          ok: false,
          status: 403,
          message: "Blocked static path segment: " + piece + "\n"
        };
      }
    }

    const filePath = path.resolve(config.webRoot, "." + clean);
    const rootWithSeparator = config.webRoot.endsWith(path.sep)
      ? config.webRoot
      : config.webRoot + path.sep;

    if (filePath !== config.webRoot && !filePath.startsWith(rootWithSeparator)) {
      return {
        ok: false,
        status: 403,
        message: "Path escapes web root.\n"
      };
    }

    return {
      ok: true,
      filePath
    };
  }

  static findIndexFile(directoryPath, config, modules) {
    const fs = modules.fs;
    const path = modules.path;

    for (const name of config.indexNames) {
      const candidate = path.join(directoryPath, name);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }

    return null;
  }

  static sendFile(context = {}) {
    const request = context.request;
    const response = context.response;
    const filePath = context.filePath;
    const config = context.config;
    const modules = context.modules || {};
    const fs = modules.fs;

    const stat = fs.statSync(filePath);
    const mime = this.getMimeType(filePath);

    response.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": stat.size,
      "Cache-Control": config.cacheControl,
      "X-Vibes-Static-Server": "capsule",
      "X-Vibes-No-Api": "true"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(filePath).pipe(response);
  }

  static sendText(response, status, text, mime) {
    const body = String(text || "");
    response.writeHead(status, {
      "Content-Type": mime || "text/plain",
      "Content-Length": Buffer.byteLength(body),
      "Cache-Control": "no-store",
      "X-Vibes-Static-Server": "capsule",
      "X-Vibes-No-Api": "true"
    });
    response.end(body);
  }

  static getMimeType(filePath) {
    const lower = String(filePath || "").toLowerCase();

    if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
    if (lower.endsWith(".js")) return "text/javascript; charset=utf-8";
    if (lower.endsWith(".mjs")) return "text/javascript; charset=utf-8";
    if (lower.endsWith(".css")) return "text/css; charset=utf-8";
    if (lower.endsWith(".json")) return "application/json; charset=utf-8";
    if (lower.endsWith(".md")) return "text/markdown; charset=utf-8";
    if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
    if (lower.endsWith(".svg")) return "image/svg+xml";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg")) return "image/jpeg";
    if (lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".ico")) return "image/x-icon";
    if (lower.endsWith(".wasm")) return "application/wasm";

    return "application/octet-stream";
  }

  static printStartup(result = {}, modules = {}) {
    const processObject = modules.process || process;
    const config = result.config || {};
    const lines = [
      "",
      "Vibes static capsule server",
      "───────────────────────────",
      "webRoot: " + config.webRoot,
      "url:     http://" + config.host + ":" + config.port + "/vibes/",
      "api:     disabled; /api/* returns 410",
      ""
    ];

    processObject.stdout.write(lines.join("\n"));
  }

  static _handleSignal(request, response, pathname, config) {
      // Lazy-init the in-memory store on the config object
      if (!config._signalStore) config._signalStore = {};

      const topic = pathname.replace('/signal/', '').split('?')[0];
      if (!topic) {
        this.sendText(response, 400, 'No topic.\n', 'text/plain');
        return;
      }

      if (request.method === 'POST') {
        let body = '';
        request.on('data', chunk => { body += chunk; });
        request.on('end', () => {
          config._signalStore[topic] = { body, ts: Date.now() };
          this.sendText(response, 200, 'ok', 'text/plain');
        });
      } else if (request.method === 'GET') {
        const entry = config._signalStore[topic];
        if (!entry) {
          this.sendText(response, 200, '', 'text/plain');
        } else {
          this.sendText(response, 200, entry.body, 'text/plain');
        }
      } else {
        this.sendText(response, 405, 'Method not allowed.\n', 'text/plain');
      }
    }
}
