class PathUtils {
    static formatLocalForLog(localPath, localRoot, deps = {}) {
      const { path, os } = deps;
      if (localRoot && localPath.startsWith(localRoot)) {
        return "." + localPath.substring(localRoot.length);
      }
      const homeDir = path.resolve(os.homedir());
      if (localPath.startsWith(homeDir)) {
        return "~" + localPath.substring(homeDir.length);
      }
      return localPath;
    }

    static getRemoteDir(remoteAbs, deps = {}) {
      const index = remoteAbs.lastIndexOf("/");
      return index >= 0 ? remoteAbs.substring(0, index) : remoteAbs;
    }
}