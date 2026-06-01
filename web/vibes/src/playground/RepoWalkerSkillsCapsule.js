class RepoWalkerSkillsCapsule {

  static _doc_repoWalkerSkills() {
    return "# Repo Walker Skills\n\nInstalled by `InstallRepoWalkerSkillsV2`.\n";
  }

  static _doc_skills() {
    return "## Skills\n";
  }

  static _doc_repoastauditwalkskill() {
    return "### RepoAstAuditWalkSkill\n\nWalks an existing source tree and reports:\n\n- longest files\n- files with most methods/functions\n- longest methods/functions\n- rough Vibes pure-class conformance\n- import/export counts\n- simple inferred symbol dependency edges\n- HTML script/link/image dependencies\n- parse errors\n\nReports write to:\n\n```text\n<selected-root>/.vibes/reports/repo-ast-audit-*.md\n<selected-root>/.vibes/reports/repo-ast-audit-*.json\n```\n\nClear the TreeWalker extension filter if you want HTML/CSS included.\n";
  }

  static _doc_repomethodsearchwalkskill() {
    return "### RepoMethodSearchWalkSkill\n\nSearches inside JS methods/functions using Acorn. Query is stored at:\n\n```text\nlocalStorage['vibes.repoMethodSearch.query']\n```\n\nReports write to:\n\n```text\n<selected-root>/.vibes/reports/method-search-*.md\n<selected-root>/.vibes/reports/method-search-*.json\n```\n";
  }

  


  static _doc() {
      return [
        this._doc_repoWalkerSkills(),
        this._doc_skills(),
        this._doc_repoastauditwalkskill(),
        this._doc_repomethodsearchwalkskill()
      ].join('\n\n');
    }
}
