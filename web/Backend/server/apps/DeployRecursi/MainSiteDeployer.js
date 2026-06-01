class MainSiteDeployer {
    static async deploy(body = {}, options = {}, deps = {}) {
      const { DeployLogger } = deps;
      const logger = DeployLogger.create('MainSiteDeployer', deps);
      try {
        const request = this._normalizeRequest(body, deps);
        const context = await this._buildContext(request, options, logger, deps);
        const allFiles = await this._collectAllFiles(context, options, logger, deps);
        const toUpload = this._filterChangedFiles(allFiles, context, deps);

        logger.log(`Files: ${toUpload.length} changed / ${allFiles.length} total`);

        if (!toUpload.length) {
          logger.log('Nothing to deploy.');
          return { success: true, logs: logger.logs };
        }

        if (context.isTest) {
          this._logPlan(toUpload, context, logger, deps);
          return { success: true, logs: logger.logs };
        }

        const uploadedCount = await this._uploadFiles(toUpload, context, logger, deps);
        await this._saveLastRun(context, uploadedCount, logger, deps);
        logger.log('');
        logger.log(`=== Done: ${uploadedCount} files uploaded ===`);
        return { success: true, logs: logger.logs };
      } catch (error) {
        logger.log('FATAL: ' + error.message);
        console.error('[MainSiteDeployer ERROR]', error);
        return { success: false, error: error.message, logs: logger.logs };
      }
    }

    static _normalizeRequest(body = {}, deps = {}) {
      return {
        isTest: !!body.isTest,
        isForce: !!body.isForce,
        siteName: body.site || 'recursi',
        configPath: body.configPath || null,
      };
    }

    static async _buildContext(request, options = {}, logger, deps = {}) {
      const { path, DeployConfig } = deps;
      const site = await DeployConfig.getSite(request.siteName, request, options, deps);
      const localWwwRoot = options.webProjectsRoot || path.resolve(options.projectRoot || process.cwd(), 'web');
      const lastRunMs = await this._readLastRunMs(site.lastRunFile, deps);
      const nowMs = Date.now();

      logger.log(`=== Deploy to ${request.siteName} ===`);
      logger.log(`Mode: ${request.isTest ? 'TEST' : request.isForce ? 'FORCE' : 'LIVE'}`);
      logger.log(`Config: ${site.configPath}`);
      logger.log(`Local: ${localWwwRoot}`);
      logger.log(`Remote: ${site.remoteRoot}`);
      logger.log(`Last run: ${lastRunMs ? new Date(lastRunMs).toLocaleString() : '(never)'}`);
      logger.log('');

      return {
        isTest: request.isTest,
        isForce: request.isForce,
        siteName: request.siteName,
        site,
        localWwwRoot,
        lastRunMs,
        nowMs,
      };
    }

    static async _readLastRunMs(lastRunFile, deps = {}) {
      const { fs } = deps;
      try {
        const raw = await fs.readFile(lastRunFile, 'utf8');
        const obj = JSON.parse(raw);
        return obj.lastRunMs || 0;
      } catch (error) {
        return 0;
      }
    }

    // Collects files from projects, extras, and external directories, including top-level root configurations
    static async _collectAllFiles(context, options, logger, deps = {}) {
      const { DeployCatalog } = deps;
      const allFiles = [];
      const projectEntries = await DeployCatalog.getProjectEntries(context.site, options, deps);
      logger.log(`Projects: ${projectEntries.map((x) => x.name).join(', ')}`);
      await this._collectProjectFiles(projectEntries, context, allFiles, logger, deps);
      await this._collectExtraFiles(context, options, allFiles, logger, deps);
      await this._collectExternalFiles(context, allFiles, logger, deps);
      
      // Fixed: Passing 'logger' in the 3rd parameter position to align with _collectTopLevelFiles signature
      await this._collectTopLevelFiles(context, allFiles, logger, deps);
      return allFiles;
    }

    static async _collectProjectFiles(projectEntries, context, allFiles, logger, deps = {}) {
      const { fs, FileWalker } = deps;
      for (const entry of projectEntries) {
        try {
          const stat = await fs.stat(entry.localDir);
          if (!stat.isDirectory()) {
            throw new Error('Path exists but is not a directory: ' + entry.localDir);
          }
          const files = await FileWalker.walkDirectory(entry.localDir, {}, deps);
          for (const file of files) {
            allFiles.push({
              local: file.local,
              remoteAbs: `${context.site.remoteRoot}/${entry.remoteSubdir}/${file.rel}`,
              mtimeMs: file.mtimeMs,
            });
          }
        } catch (error) {
          throw new Error(`Required project directory is missing or inaccessible: "${entry.name}" at ${entry.localDir} (${error.message})`);
        }
      }
    }

    static async _collectExtraFiles(context, options, allFiles, logger, deps = {}) {
      const { fs, FileWalker, DeployCatalog } = deps;
      const extras = await DeployCatalog.getExtraEntries(context.site, options, deps);
      if (!extras.length) return;
      logger.log(`Extras: ${extras.map((x) => x.name).join(', ')}`);
      for (const entry of extras) {
        try {
          if (entry.kind === 'extraDir') {
            const stat = await fs.stat(entry.localDir);
            if (!stat.isDirectory()) {
              throw new Error('Path exists but is not a directory: ' + entry.localDir);
            }
            const files = await FileWalker.walkDirectory(entry.localDir, {}, deps);
            for (const file of files) {
              allFiles.push({
                local: file.local,
                remoteAbs: `${context.site.remoteRoot}/${entry.remoteSubdir}/${file.rel}`,
                mtimeMs: file.mtimeMs,
              });
            }
            continue;
          }

          if (entry.kind === 'extraFile') {
            await fs.access(entry.localFile);
            const stat = await fs.stat(entry.localFile);
            allFiles.push({
              local: entry.localFile,
              remoteAbs: `${context.site.remoteRoot}/${entry.remoteFile}`,
              mtimeMs: stat.mtimeMs,
            });
          }
        } catch (error) {
          const where = entry.kind === 'extraDir' ? entry.localDir : entry.localFile;
          throw new Error(`Required extra directory or file is missing or inaccessible: "${entry.name}" at ${where} (${error.message})`);
        }
      }
    }

    static async _collectExternalFiles(context, allFiles, logger, deps = {}) {
      const { fs, FileWalker } = deps;
      if (!context.site.externalDirs || !context.site.externalDirs.length) return;
      for (const externalDir of context.site.externalDirs) {
        try {
          await fs.access(externalDir.localDir);
          const files = await FileWalker.walkDirectory(externalDir.localDir, {}, deps);
          for (const file of files) {
            allFiles.push({
              local: file.local,
              remoteAbs: `${context.site.remoteRoot}/${externalDir.remoteSubdir}/${file.rel}`,
              mtimeMs: file.mtimeMs,
            });
          }
        } catch (error) {
          throw new Error(`Required external directory is missing or inaccessible: ${externalDir.localDir} (${error.message})`);
        }
      }
    }

    // Handles replication of top-level files on local disk and schedules remote root deployment
    static async _collectTopLevelFiles(context, allFiles, logger, deps = {}) {
      const { fs, path, FileWalker } = deps;
      const deployTop = context.site.deployTopLevel !== false;
      if (!deployTop) return;

      const frontPageHtml = path.join(context.localWwwRoot, 'frontPage/index.html');
      const rootHtml = path.join(context.localWwwRoot, 'index.html');

      // Replicate index.html from /frontPage/ to parent root on local disk (master copy pattern)
      try {
        await fs.access(frontPageHtml);
        
        logger.log(`[MainSiteDeployer] Syncing local disk: Copying ${frontPageHtml} -> ${rootHtml}`);
        await fs.copyFile(frontPageHtml, rootHtml);
        logger.log(`[MainSiteDeployer] Replicated index.html to parent root web projects directory.`);

        const stat = await fs.stat(rootHtml);
        allFiles.push({
          local: rootHtml,
          remoteAbs: `${context.site.remoteRoot}/index.html`,
          mtimeMs: stat.mtimeMs,
        });
        logger.log(`[MainSiteDeployer] Queued root index.html for deployment to remote hosted root.`);
      } catch (e) {
        logger.log(`[MainSiteDeployer] Diagnostics: Could not auto-replicate top-level index.html: ${e.message}`);
      }

      // Collect any other root-level files that exist directly inside web/
      try {
        const entries = await fs.readdir(context.localWwwRoot, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          if (FileWalker._shouldIgnoreName(entry.name, {}, deps)) continue;
          
          // Skip index.html from direct root mapping because we generated it dynamically above
          if (entry.name === 'index.html') continue;

          const abs = path.join(context.localWwwRoot, entry.name);
          const stat = await fs.stat(abs);
          allFiles.push({
            local: abs,
            remoteAbs: `${context.site.remoteRoot}/${entry.name}`,
            mtimeMs: stat.mtimeMs,
          });
        }
      } catch (e) {
        logger.log(`[MainSiteDeployer] Diagnostics: Failed collecting other root-level files: ${e.message}`);
      }
    }

    static _filterChangedFiles(allFiles, context, deps = {}) {
      return allFiles.filter((file) => context.isForce || file.mtimeMs > context.lastRunMs);
    }

    static _logPlan(toUpload, context, logger, deps = {}) {
      const { PathUtils } = deps;
      logger.log('');
      logger.log('--- PLAN ---');
      for (const file of toUpload) {
        logger.log(`  ${PathUtils.formatLocalForLog(file.local, context.localWwwRoot, deps)}  ->  ${file.remoteAbs}`);
      }
      logger.log('');
      logger.log(`${toUpload.length} files would be uploaded.`);
    }

    static async _uploadFiles(toUpload, context, logger, deps = {}) {
      const { SftpHelper, PathUtils } = deps;
      return await SftpHelper.withConnection(context.site, async (sftp, sftpDeps) => {
        let upCount = 0;
        logger.log('Connected.');
        logger.log('');
        for (const file of toUpload) {
          const remoteDir = PathUtils.getRemoteDir(file.remoteAbs, sftpDeps);
          await SftpHelper.ensureDir(sftp, remoteDir, sftpDeps);
          await SftpHelper.uploadFile(sftp, file.local, file.remoteAbs, sftpDeps);
          logger.log(`UP  ${PathUtils.formatLocalForLog(file.local, context.localWwwRoot, sftpDeps)}  ->  ${file.remoteAbs}`);
          upCount++;
        }
        return upCount;
      }, deps);
    }

    static async _saveLastRun(context, uploadedCount, logger, deps = {}) {
      const { fs } = deps;
      if (!uploadedCount) return;
      await fs.writeFile(context.site.lastRunFile, JSON.stringify({ lastRunMs: context.nowMs }, null, 2));
      logger.log('Saved last-run timestamp.');
    }

  
}