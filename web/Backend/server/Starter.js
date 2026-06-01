import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { fileURLToPath, pathToFileURL } from 'url';
import SftpClient from 'ssh2-sftp-client';
import child_process from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '../..');
const projectRoot = path.resolve(webRoot, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.md': 'text/markdown'
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if ((url.pathname === '/run' || url.pathname === '/api/admin/run') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        let code = '';
        let params = {};

        try {
          const payload = JSON.parse(body);
          if (payload && payload.code) {
            code = payload.code;
            params = payload.params || {};
          } else {
            code = body;
          }
        } catch (e) {
          code = body;
        }

        const logs = [];

        const serverEnv = {
          params: params || {},
          fs: fs,
          fsSync: fs,
          fsPromises: fs.promises,
          path: path,
          os: os,
          http: http,
          child_process: child_process,
          SftpClient: SftpClient,
          options: {
            projectRoot,
            webRoot,
            webProjectsRoot: webRoot,
            sharedLibRoot: path.join(webRoot, 'sharedLib')
          },
          require: (name) => {
            if (name === 'fs') return fs;
            if (name === 'path') return path;
            if (name === 'os') return os;
            if (name === 'child_process') return child_process;
            if (name === 'ssh2-sftp-client') return SftpClient;
            if (name === 'http') return http;
            throw new Error(`Module ${name} is not pre-registered in Starter.js`);
          },
          log: (...args) => {
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
            logs.push(msg);
            console.log('[bridge-log]', msg);
          },
          pathToFileURL: pathToFileURL,
          getClass: async (className) => {
            const searchPaths = [
              path.join(__dirname, `${className}.js`),
              path.join(__dirname, 'utils', `${className}.js`),
              path.join(__dirname, 'apps/BigFileFinder', `${className}.js`),
              path.join(__dirname, 'apps/DeployRecursi', `${className}.js`)
            ];

            const filePath = searchPaths.find(p => fs.existsSync(p));
            if (!filePath) {
              throw new Error(`Class file not found: ${className}`);
            }

            const stat = fs.statSync(filePath);
            if (!global.classCache) global.classCache = {};

            if (!global.classCache[className] || global.classCache[className].mtime !== stat.mtimeMs) {
              console.log(`[Starter] Loading class: ${className}`);
              const fileCode = fs.readFileSync(filePath, 'utf8');
              const contextModule = { exports: {} };
              const wrapper = Function('module', 'exports', 'require', '__dirname', '__filename', `${fileCode}\nmodule.exports = ${className};`);
              wrapper(contextModule, contextModule.exports, (name) => serverEnv.require(name), path.dirname(filePath), filePath);
              global.classCache[className] = {
                Class: contextModule.exports,
                mtime: stat.mtimeMs
              };
            }
            return global.classCache[className].Class;
          },
          getScannerInstance: (ScannerClass) => {
            if (!global.scannerInstance || global.scannerInstance.constructor.name !== ScannerClass.name) {
              const oldInstance = global.scannerInstance;
              global.scannerInstance = new ScannerClass();
              if (oldInstance) {
                const fields = [
                  'scanning', 'progress', 'results', 'filesScannedCount',
                  'filesFoundCount', 'abortRequested', 'queue', 'minSizeBytes',
                  'skipDirs', 'skipHidden', 'resolvedTargetDir'
                ];
                fields.forEach(f => {
                  if (oldInstance[f] !== undefined) {
                    global.scannerInstance[f] = oldInstance[f];
                  }
                });
              }
            }
            return global.scannerInstance;
          }
        };

        let executeFn;
        if (code.trim().startsWith('async') || code.trim().startsWith('function')) {
          executeFn = new Function('env', `return (${code})(env);`);
        } else {
          executeFn = new Function('nodeEnv', `const fn = ${code}; return fn(nodeEnv);`);
        }

        const result = await executeFn(serverEnv);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, type: 'json', result, logs }));
      } catch (err) {
        console.error('[Starter] Runtime Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/video' && req.method === 'GET') {
    const targetPath = url.searchParams.get('path');
    if (!targetPath || !fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    try {
      const stat = fs.statSync(targetPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(targetPath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4'
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4'
        });
        fs.createReadStream(targetPath).pipe(res);
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(e.message);
    }
    return;
  }

  let urlPath = url.pathname;
  if (urlPath === '/') {
    urlPath = '/index.html';
  }

  let filePath = path.join(webRoot, urlPath);

  const relative = path.relative(webRoot, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const port = 8000;
server.listen(port, () => {
  console.log(`[Backend] Unified execution & static server listening on http://localhost:${port}`);
  console.log(`[Backend] Serving web folder at: ${webRoot}`);
});
