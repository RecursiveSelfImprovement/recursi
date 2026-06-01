class CommentsDeployer {
    static async deploy(body = {}, options = {}, deps = {}) {
      const { DeployLogger } = deps;
      const logger = DeployLogger.create('CommentsDeployer', deps);
      try {
        const context = await this._buildContext(body, options, logger, deps);
        await this._verifyLocalDirectory(context, logger, deps);

        if (context.isTest) {
          this._logPlan(context, logger, deps);
          return { success: true, logs: logger.logs };
        }

        await this._uploadDirectory(context, logger, deps);
        logger.logs.push('\nDone.');
        return { success: true, logs: logger.logs };
      } catch (error) {
        logger.tagged('✖FATAL', error.message);
        console.error('[CommentsDeployer ERROR]', error);
        return { success: false, error: error.message, logs: logger.logs };
      }
    }

    static async _buildContext(body = {}, options = {}, logger, deps = {}) {
      const { DeployConfig } = deps;
      const config = await DeployConfig.getCommentsConfig(body, options, deps);
      const isTest = !!body.isTest;
      const host = body.sftpHost || config.host;
      const remotePath = body.remotePath || config.remotePath;
      const remoteServerDir = remotePath.startsWith('/')
        ? remotePath
        : `/home/${config.user}/${remotePath}`;
      const remoteDataDir = `${remoteServerDir}/data`;

      logger.tagged('===', 'Deploy Comments API Directory');
      logger.tagged('Mode', isTest ? 'TEST (dry-run)' : 'LIVE');
      logger.tagged('Config', config.configPath);
      logger.tagged('Host', host);
      logger.tagged('Dest', remoteServerDir);

      return {
        isTest,
        host,
        port: config.port,
        user: config.user,
        password: config.password,
        localDir:
          config.localDir ||
          (options.projectRoot || process.cwd()) + '/web/Comments/server',
        remoteServerDir,
        remoteDataDir,
      };
    }

    static async _verifyLocalDirectory(context, logger, deps = {}) {
      const { fs } = deps;
      await fs.access(context.localDir);
      logger.tagged('INFO', `Local directory found: ${context.localDir}`);
    }

    static _logPlan(context, logger, deps = {}) {
      logger.logs.push('\n--- PLAN ---');
      logger.logs.push(`- Connect to: ${context.host}`);
      logger.logs.push(`- Upload Directory: ${context.localDir}`);
      logger.logs.push(`- To Remote Path: ${context.remoteServerDir}`);
      logger.logs.push('- Ignore local /data/ directory (protect production DB)');
      logger.logs.push(
        `- Ensure remote data directory exists: ${context.remoteDataDir}`
      );
    }

    static async _uploadDirectory(context, logger, deps = {}) {
      const { SftpHelper } = deps;
      logger.tagged(
        'CONN',
        `About to connect to ${context.host}:${context.port} as ${context.user}`
      );
      logger.tagged('SYNC', `Local source: ${context.localDir}`);
      logger.tagged('SYNC', `Remote target: ${context.remoteServerDir}`);
      logger.tagged('SYNC', `Remote data dir: ${context.remoteDataDir}`);

      await SftpHelper.withConnection(
        {
          host: context.host,
          port: context.port,
          user: context.user,
          password: context.password,
          readyTimeout: 15000,
        },
        async (sftp) => {
          logger.tagged('OK', `Connected to ${context.host}:${context.port}`);
          await sftp.mkdir(context.remoteServerDir, true);
          logger.tagged(
            'SYNC',
            `Uploading directory to ${context.remoteServerDir}...`
          );

          await sftp.uploadDir(
            context.localDir,
            context.remoteServerDir,
            (pathName) => this._filterLocalData(pathName, deps)
          );
          logger.tagged('UP', 'Uploaded server directory successfully.');

          await sftp.mkdir(context.remoteDataDir, true);
          logger.tagged('OK', 'Ensured remote data directory exists.');
        }, deps
      );
    }

    static _filterLocalData(pathName, deps = {}) {
      if (pathName.includes('/data/')) return false;
      if (pathName.includes('\\data\\')) return false;
      if (pathName.endsWith('/data')) return false;
      if (pathName.endsWith('\\data')) return false;
      return true;
    }
}