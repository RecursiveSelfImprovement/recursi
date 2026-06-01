class ProjectsService {
    static async getProjects(options = {}, deps = {}) {
      const { DeployCatalog } = deps;
      return await DeployCatalog.getProjectNames(options, deps);
    }
}