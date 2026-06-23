class FileSearcher {
    constructor() {
      this.searching = false;
      this.progress = 'Idle';
      this.results = [];
      this.filesSearchedCount = 0;
      this.matchesFoundCount = 0;
      this.abortRequested = false;

      this.queue = [];
      this.skipDirs = [];
      this.skipHidden = true;

      this.directory = '';
      this.searchType = 'name'; // 'name' | 'content' | 'both'
      this.namePattern = '*';
      this.contentPattern = '';
      this.caseSensitive = false;
    }

    startSearch(params) {
      if (this.searching) return;
      this.searching = true;
      this.abortRequested = false;
      this.results = [];
      this.filesSearchedCount = 0;
      this.matchesFoundCount = 0;
      this.progress = 'Starting search...';

      const path = require('path');
      this.directory = params.directory || '/Users/rob';
      this.searchType = params.searchType || 'name';
      this.namePattern = params.namePattern || '*';
      this.contentPattern = params.contentPattern || '';
      this.caseSensitive = !!params.caseSensitive;
      this.skipHidden = params.skipHidden !== false;

      this.skipDirs = (params.skipDirs || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);

      this.queue = [this.directory];

      // Convert name glob wildcard pattern safely to RegExp
      this.nameRegex = this.globToRegex(this.namePattern, this.caseSensitive);

      setImmediate(() => this.searchChunk());
    }

    globToRegex(pattern, caseSensitive) {
      if (!pattern || pattern === '*') {
        return /.*/;
      }
      // Escape regular expression special characters safely, leaving asterisks and question marks
      const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      const globbed = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
      return new RegExp('^' + globbed + '$', caseSensitive ? '' : 'i');
    }

    searchChunk() {
      if (this.abortRequested || this.queue.length === 0) {
        this.searching = false;
        this.progress = this.abortRequested ? 'Search stopped by user.' : 'Search complete.';
        return;
      }

      const fs = require('fs');
      const path = require('path');

      let processedThisTick = 0;
      // Process files in batches to keep Node event loop highly responsive
      while (this.queue.length > 0 && processedThisTick < 40) {
        if (this.abortRequested) break;

        const currentPath = this.queue.shift();
        processedThisTick++;

        let stats;
        try {
          stats = fs.statSync(currentPath);
        } catch (e) {
          continue;
        }

        if (stats.isDirectory()) {
          const dirName = path.basename(currentPath);
          if (this.skipDirs.includes(dirName.toLowerCase())) continue;
          if (this.skipHidden && dirName.startsWith('.')) continue;

          let files = [];
          try {
            files = fs.readdirSync(currentPath);
          } catch (e) {
            continue;
          }

          for (const file of files) {
            const fullPath = path.join(currentPath, file);
            this.queue.push(fullPath);
          }
        } else if (stats.isFile()) {
          const fileName = path.basename(currentPath);
          if (this.skipHidden && fileName.startsWith('.')) continue;

          this.filesSearchedCount++;
          this.progress = `Searching: ${fileName}`;

          const matchesName = this.nameRegex.test(fileName);
          let matchesContent = false;

          if (this.searchType === 'name') {
            if (matchesName) {
              this.addResult(currentPath, stats, 'Name Match');
            }
          } else if (this.searchType === 'content' || this.searchType === 'both') {
            // If searchType is both or content, and a name pattern is defined (e.g. *.json),
            // we should restrict file content searching to matches of that name pattern.
            if (matchesName) {
              // Read content safely (skip files > 5MB to prevent memory bloat)
              if (stats.size <= 5 * 1024 * 1024) {
                try {
                  const content = fs.readFileSync(currentPath, 'utf8');
                  // Quick check to avoid binary files
                  if (!content.includes('\0')) {
                    let index = -1;
                    if (this.caseSensitive) {
                      index = content.indexOf(this.contentPattern);
                    } else {
                      index = content.toLowerCase().indexOf(this.contentPattern.toLowerCase());
                    }

                    if (index !== -1) {
                      matchesContent = true;
                      // Extract snippet around match location
                      const start = Math.max(0, index - 30);
                      const end = Math.min(content.length, index + this.contentPattern.length + 50);
                      let snippet = content.substring(start, end).replace(/\r?\n/g, ' ');
                      if (start > 0) snippet = '...' + snippet;
                      if (end < content.length) snippet = snippet + '...';

                      this.addResult(currentPath, stats, 'Content Match', snippet);
                    }
                  }
                } catch (e) {
                  // Ignore read errors or encoding issues safely
                }
              }
            }
          }
        }
      }

      if (!this.abortRequested && this.queue.length > 0) {
        setImmediate(() => this.searchChunk());
      } else {
        this.searching = false;
        this.progress = this.abortRequested ? 'Search stopped by user.' : 'Search complete.';
      }
    }

    addResult(filePath, stats, matchType, snippet = '') {
      // Limit to 1000 matching results to stay performant
      if (this.results.length >= 1000) return;

      this.results.push({
        path: filePath,
        sizeBytes: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(3),
        modified: stats.mtime,
        matchType,
        snippet
      });
      this.matchesFoundCount = this.results.length;
    }
  }