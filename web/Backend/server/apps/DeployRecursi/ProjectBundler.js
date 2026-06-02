class ProjectBundler {
    static async bundleProject(projectName, webRoot, fs, path) {
      const projectDir = path.join(webRoot, projectName);
      const manifestPath = path.join(projectDir, "files.json");
      
      const manifestExists = await fs.stat(manifestPath).then(() => true).catch(() => false);
      if (!manifestExists) return null;

      const manifestContent = await fs.readFile(manifestPath, "utf8");
      const manifest = JSON.parse(manifestContent);
      
      if (!manifest.bundle) return null;

      const filesToCombine = [];

      for (const lib of (manifest.library || [])) {
        if (lib.endsWith(".css")) continue;
        let libRelPath = lib;
        if (!libRelPath.startsWith("/")) {
          libRelPath = "/library/" + libRelPath;
        }
        if (!libRelPath.endsWith(".js")) {
          libRelPath += ".js";
        }
        filesToCombine.push({
          name: lib,
          fullPath: path.join(webRoot, libRelPath)
        });
      }

      for (const loc of (manifest.local || [])) {
        if (loc.endsWith(".css")) continue;
        filesToCombine.push({
          name: loc,
          fullPath: path.join(projectDir, loc)
        });
      }

      for (const main of (manifest.main || [])) {
        filesToCombine.push({
          name: main,
          fullPath: path.join(projectDir, main)
        });
      }

      const bundleParts = [];

      for (const file of filesToCombine) {
        const exists = await fs.stat(file.fullPath).then(() => true).catch(() => false);
        if (exists) {
          const content = await fs.readFile(file.fullPath, "utf8");
          const className = file.name.split("/").pop().replace(/\.js$/i, "");
          const isIdentifier = /^[a-zA-Z_\$][a-zA-Z0-9_\$]*$/.test(className);
          
          // Copy class directly to globalThis and window + log registration
          const exposureTrailer = isIdentifier 
            ? "\n;if (typeof " + className + " !== \"undefined\") { " +
              "globalThis." + className + " = " + className + "; " +
              "if (typeof window !== \"undefined\") { window." + className + " = " + className + "; } " +
              "if (globalThis.__classRegistrationLogger && typeof globalThis.__classRegistrationLogger.log === 'function') { " +
              "globalThis.__classRegistrationLogger.log('" + className + "', 'bundle'); " +
              "} " +
              "}" 
            : "";
          
          bundleParts.push("// --- Start File: " + file.name + " ---");
          bundleParts.push(content + exposureTrailer);
          bundleParts.push("// --- End File: " + file.name + " ---\n");
        }
      }

      const finalBundleCode = bundleParts.join("\n");
      const destPath = path.resolve(projectDir, manifest.bundle);
      const destDir = path.dirname(destPath);

      await fs.mkdir(destDir, { recursive: true });
      await fs.writeFile(destPath, finalBundleCode, "utf8");

      return {
        destPath,
        sizeBytes: finalBundleCode.length,
        filesBundledCount: filesToCombine.length
      };
    }

    static async generateExternalBundle(projectName, webRoot, projectRoot, fs, path, os) {
      const projectDir = path.join(webRoot, projectName);
      const manifestPath = path.join(projectDir, "files.json");
      
      const manifestExists = await fs.stat(manifestPath).then(() => true).catch(() => false);
      if (!manifestExists) throw new Error("files.json not found in project: " + projectName);

      const manifestContent = await fs.readFile(manifestPath, "utf8");
      const manifest = JSON.parse(manifestContent);
      
      if (!manifest.bundle) throw new Error("No \"bundle\" target specified in files.json for project: " + projectName);

      const filesToCombine = [];

      for (const lib of (manifest.library || [])) {
        if (lib.endsWith(".css")) continue;
        let libRelPath = lib;
        if (!libRelPath.startsWith("/")) {
          libRelPath = "/library/" + libRelPath;
        }
        if (!libRelPath.endsWith(".js")) {
          libRelPath += ".js";
        }
        filesToCombine.push({
          name: lib,
          fullPath: path.join(webRoot, libRelPath)
        });
      }

      for (const loc of (manifest.local || [])) {
        if (loc.endsWith(".css")) continue;
        filesToCombine.push({
          name: loc,
          fullPath: path.join(projectDir, loc)
        });
      }

      for (const main of (manifest.main || [])) {
        filesToCombine.push({
          name: main,
          fullPath: path.join(projectDir, main)
        });
      }

      const bundleParts = [];

      for (const file of filesToCombine) {
        const exists = await fs.stat(file.fullPath).then(() => true).catch(() => false);
        if (exists) {
          const content = await fs.readFile(file.fullPath, "utf8");
          const className = file.name.split("/").pop().replace(/\.js$/i, "");
          const isIdentifier = /^[a-zA-Z_\$][a-zA-Z0-9_\$]*$/.test(className);
          
          // Copy class directly to globalThis and window + log registration
          const exposureTrailer = isIdentifier 
            ? "\n;if (typeof " + className + " !== \"undefined\") { " +
              "globalThis." + className + " = " + className + "; " +
              "if (typeof window !== \"undefined\") { window." + className + " = " + className + "; } " +
              "if (globalThis.__classRegistrationLogger && typeof globalThis.__classRegistrationLogger.log === 'function') { " +
              "globalThis.__classRegistrationLogger.log('" + className + "', 'bundle'); " +
              "} " +
              "}" 
            : "";
          
          bundleParts.push("// --- Start File: " + file.name + " ---");
          bundleParts.push(content + exposureTrailer);
          bundleParts.push("// --- End File: " + file.name + " ---\n");
        }
      }

      const finalBundleCode = bundleParts.join("\n");
      
      const externalBundlesDir = path.resolve(projectRoot, "..", "recursi_temp_bundles", projectName);
      const destPath = path.resolve(externalBundlesDir, manifest.bundle);
      const destDir = path.dirname(destPath);

      await fs.mkdir(destDir, { recursive: true });
      await fs.writeFile(destPath, finalBundleCode, "utf8");

      return {
        destPath,
        sizeBytes: finalBundleCode.length,
        filesBundledCount: filesToCombine.length,
        manifestBundlePath: manifest.bundle
      };
    }

    static async deployExternalBundle(projectName, webRoot, projectRoot, fs, path, deps) {
      const { DeployConfig, SftpHelper, SftpClient, pathToFileURL, fsSync } = deps;
      
      const projectDir = path.join(webRoot, projectName);
      const manifestPath = path.join(projectDir, "files.json");
      
      const manifestContent = await fs.readFile(manifestPath, "utf8");
      const manifest = JSON.parse(manifestContent);
      
      if (!manifest.bundle) throw new Error("No bundle target specified in manifest.");

      const externalBundlesDir = path.resolve(projectRoot, "..", "recursi_temp_bundles", projectName);
      const localSourcePath = path.resolve(externalBundlesDir, manifest.bundle);

      const exists = fsSync.existsSync(localSourcePath);
      if (!exists) {
        throw new Error("No compiled bundle found at " + localSourcePath + ". Please compile the bundle first.");
      }

      const site = await DeployConfig.getSite('recursi', {}, { projectRoot }, { path, pathToFileURL, fsSync });
      const remoteDestPath = site.remoteRoot + "/" + projectName + "/" + manifest.bundle;

      console.log(`[ProjectBundler] Initiating SFTP upload from external path ${localSourcePath} to remote ${remoteDestPath}...\n`);

      await SftpHelper.withConnection(site, async (sftp) => {
        const remoteDir = remoteDestPath.substring(0, remoteDestPath.lastIndexOf("/"));
        await sftp.mkdir(remoteDir, true);
        await sftp.fastPut(localSourcePath, remoteDestPath);
      }, { SftpClient, fs });

      return {
        localSourcePath,
        remoteDestPath,
        success: true
      };
    }
}