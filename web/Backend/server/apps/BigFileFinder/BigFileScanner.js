class BigFileScanner {
    constructor() {
      this.scanning = false;
      this.progress = 'Idle';
      this.results = [];
      this.filesScannedCount = 0;
      this.filesFoundCount = 0;
      this.abortRequested = false;

      this.queue = [];
      this.minSizeBytes = 0;
      this.skipDirs = [];
      this.skipHidden = true;
      this.resolvedTargetDir = null;
    }

    startServer(port = 8000) {
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const { exec } = require('child_process');
      const os = require('os');

      const copyFolderSync = (src, dest) => {
        fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            copyFolderSync(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };

      const server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = new URL(req.url, `http://${req.headers.host}`);

        // Route: /scan (POST)
        if (url.pathname === '/scan' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const params = JSON.parse(body);
              const startDir = params.directory || '.';
              const minSizeMB = parseFloat(params.minSizeMB) || 50;
              const skipDirs = (params.skipDirs || '')
                .split(',')
                .map(s => s.trim().toLowerCase())
                .filter(s => s.length > 0);
              const skipHidden = !!params.skipHidden;
              const targetDir = params.targetDir || '';

              this.startScan(startDir, minSizeMB, skipDirs, skipHidden, targetDir);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'started' }));
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } 
        // Route: /stop (POST)
        else if (url.pathname === '/stop' && req.method === 'POST') {
          this.abortRequested = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'aborting' }));
        }
        // Route: /status (GET)
        else if (url.pathname === '/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            scanning: this.scanning,
            progress: this.progress,
            filesScannedCount: this.filesScannedCount,
            filesFoundCount: this.filesFoundCount,
            results: this.results
          }));
        } 
        // Route: /video (GET)
        else if (url.pathname === '/video' && req.method === 'GET') {
          const targetPath = url.searchParams.get('path');
          if (!targetPath || !fs.existsSync(targetPath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Video file not found');
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
              const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
              };
              res.writeHead(206, head);
              fileStream.pipe(res);
            } else {
              const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
              };
              res.writeHead(200, head);
              fs.createReadStream(targetPath).pipe(res);
            }
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(e.message);
          }
        }
        // Route: /reveal (POST)
        else if (url.pathname === '/reveal' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const params = JSON.parse(body);
              const targetPath = params.filePath;
              if (!targetPath || !fs.existsSync(targetPath)) {
                throw new Error('File does not exist on disk.');
              }

              const platform = os.platform();
              let cmd = '';

              if (platform === 'win32') {
                cmd = `explorer.exe /select,"${targetPath.replace(/"/g, '\\"')}"`;
              } else if (platform === 'darwin') {
                cmd = `open -R "${targetPath.replace(/"/g, '\\"')}"`;
              } else {
                cmd = `xdg-open "${path.dirname(targetPath).replace(/"/g, '\\"')}"`;
              }

              exec(cmd, (error) => {
                if (error) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: error.message }));
                } else {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true }));
                }
              });
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        }
        // Route: /delete (POST)
        else if (url.pathname === '/delete' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const params = JSON.parse(body);
              const targetPath = params.filePath;
              if (!targetPath) {
                throw new Error('File path not specified.');
              }

              if (fs.existsSync(targetPath)) {
                const stat = fs.statSync(targetPath);
                if (stat.isDirectory()) {
                  fs.rmSync(targetPath, { recursive: true, force: true });
                } else {
                  fs.unlinkSync(targetPath);
                }
              }

              this.results = this.results.filter(r => r.path !== targetPath);
              this.filesFoundCount = this.results.length;

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        }
        // Route: /move (POST)
        else if (url.pathname === '/move' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const params = JSON.parse(body);
              const sourcePath = params.filePath;
              const targetDir = params.targetDir;

              if (!sourcePath || !fs.existsSync(sourcePath)) {
                throw new Error('Source file does not exist.');
              }
              if (!targetDir) {
                throw new Error('Destination directory is not specified.');
              }

              if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
              }

              const destPath = path.join(targetDir, path.basename(sourcePath));

              try {
                fs.renameSync(sourcePath, destPath);
              } catch (renameErr) {
                if (renameErr.code === 'EXDEV' || renameErr.code === 'EACCES') {
                  const stat = fs.statSync(sourcePath);
                  if (stat.isDirectory()) {
                    copyFolderSync(sourcePath, destPath);
                    fs.rmSync(sourcePath, { recursive: true, force: true });
                  } else {
                    fs.copyFileSync(sourcePath, destPath);
                    fs.unlinkSync(sourcePath);
                  }
                } else {
                  throw renameErr;
                }
              }

              this.results = this.results.filter(r => r.path !== sourcePath);
              this.filesFoundCount = this.results.length;

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        }
        else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });

      server.listen(port, () => {
        console.log(`[BigFileScanner] Server listening on port ${port}`);
      });

      this.server = server;
    }

    startScan(directory, minSizeMB, skipDirs, skipHidden, targetDir) {
      if (this.scanning) return;
      this.scanning = true;
      this.abortRequested = false;
      this.results = [];
      this.filesScannedCount = 0;
      this.filesFoundCount = 0;
      this.progress = `Starting scanner at: ${directory}...`;

      const path = require('path');
      this.queue = [directory];
      this.minSizeBytes = minSizeMB * 1024 * 1024;
      this.skipDirs = skipDirs;
      this.skipHidden = skipHidden;
      
      this.resolvedTargetDir = targetDir ? path.resolve(targetDir) : null;

      setImmediate(() => this.scanChunk());
    }

    scanChunk() {
      if (this.abortRequested || this.queue.length === 0) {
        this.scanning = false;
        this.progress = this.abortRequested ? 'Scan stopped by user.' : 'Scan complete.';
        return;
      }

      const fs = require('fs');
      const path = require('path');

      let processedThisTick = 0;
      while (this.queue.length > 0 && processedThisTick < 50) {
        if (this.abortRequested) break;

        const currentPath = this.queue.shift();
        processedThisTick++;

        let absoluteCurrent;
        try {
          absoluteCurrent = path.resolve(currentPath);
        } catch (e) {
          continue;
        }

        if (this.resolvedTargetDir && absoluteCurrent === this.resolvedTargetDir) {
          continue;
        }

        let stats;
        try {
          stats = fs.statSync(currentPath);
        } catch (e) {
          continue; 
        }

        if (stats.isDirectory()) {
          const dirName = path.basename(currentPath);
          const ext = path.extname(currentPath).toLowerCase();

          const isPackage = ['.screenflow', '.photolibrary', '.migratedphotolibrary', '.app'].includes(ext);

          if (isPackage) {
            this.progress = `Evaluating bundle package: ${dirName}`;
            const pkgSize = this.getPackageSize(currentPath);
            this.filesScannedCount++;

            if (pkgSize >= this.minSizeBytes) {
              this.results.push({
                path: currentPath,
                sizeBytes: pkgSize,
                sizeMB: (pkgSize / (1024 * 1024)).toFixed(2),
                modified: stats.mtime,
                isPackage: true
              });
              this.results.sort((a, b) => b.sizeBytes - a.sizeBytes);
              this.filesFoundCount = this.results.length;
            }
            continue; 
          }

          let files = [];
          try {
            files = fs.readdirSync(currentPath);
          } catch (e) {
            continue; 
          }

          for (const file of files) {
            const fileLower = file.toLowerCase();
            if (this.skipDirs.includes(fileLower)) continue;
            if (this.skipHidden && file.startsWith('.')) continue;

            const fullPath = path.join(currentPath, file);
            this.queue.push(fullPath);
          }
        } else if (stats.isFile()) {
          this.filesScannedCount++;
          if (stats.size >= this.minSizeBytes) {
            this.results.push({
              path: currentPath,
              sizeBytes: stats.size,
              sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
              modified: stats.mtime,
              isPackage: false
            });
            this.results.sort((a, b) => b.sizeBytes - a.sizeBytes);
            this.filesFoundCount = this.results.length;
          }
        }
      }

      if (!this.abortRequested && this.queue.length > 0) {
        setImmediate(() => this.scanChunk());
      } else {
        this.scanning = false;
        this.progress = this.abortRequested ? 'Scan stopped by user.' : 'Scan complete.';
      }
    }

    getPackageSize(dirPath) {
      const fs = require('fs');
      const path = require('path');
      let totalSize = 0;
      let stack = [dirPath];

      while (stack.length > 0) {
        const current = stack.pop();
        let files = [];
        try {
          files = fs.readdirSync(current);
        } catch (e) {
          continue;
        }
        for (const file of files) {
          const full = path.join(current, file);
          try {
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
              stack.push(full);
            } else if (stat.isFile()) {
              totalSize += stat.size;
            }
          } catch (e) {}
        }
      }
      return totalSize;
    }

    

    

    

    

    

    

    
}