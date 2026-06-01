class SftpHelper {
    static async getPassword(config = {}, deps = {}) {
      const { fs } = deps;
      if (config.password && String(config.password).trim()) {
        return String(config.password).trim();
      }

      if (config.passwordFile) {
        const raw = await fs.readFile(config.passwordFile, 'utf8');
        const password = raw.split(/\r?\n/)[0].trim();
        if (!password) {
          throw new Error('Password file is empty: ' + config.passwordFile);
        }
        return password;
      }

      throw new Error('No password or passwordFile provided in deploy config.');
    }

    static async withConnection(config, callback, deps = {}) {
      const { SftpClient } = deps;
      const password = await this.getPassword(config, deps);
      const sftp = new SftpClient();
      
      const connectConfig = {
        host: config.host,
        port: config.port,
        username: config.user,
        password,
        readyTimeout: config.readyTimeout || 15000,
      };

      console.log('[SftpHelper] connect start', {
        host: connectConfig.host,
        port: connectConfig.port,
        username: connectConfig.username,
        readyTimeout: connectConfig.readyTimeout,
      });

      try {
        await sftp.connect(connectConfig);
        console.log('[SftpHelper] connect ok', {
          host: connectConfig.host,
          port: connectConfig.port,
          username: connectConfig.username,
        });
        return await callback(sftp, deps);
      } finally {
        try {
          await sftp.end();
        } catch (error) {}
      }
    }

    static async ensureDir(sftp, remoteDir, deps = {}) {
      await sftp.mkdir(remoteDir, true);
    }

    static async uploadFile(sftp, localPath, remotePath, deps = {}) {
      await sftp.fastPut(localPath, remotePath);
    }
}