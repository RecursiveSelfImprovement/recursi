class ManagedSeedAgentMigrationNotes {

  static _run(env) {
    return {
      ok: true,
      phase1Targets: [
        '/web/vibes/SeedAgent/js/PromptBuilder.js',
        '/web/vibes/SeedAgent/js/TaskParser.js',
        '/web/vibes/SeedAgent/js/SeedAgent.js',
        '/web/vibes/SeedAgent/index.html'
      ]
    };
  }

}

/* recursi-meta
{
  "schema": 1,
  "lines": 22,
  "provides": [],
  "deps": []
}
recursi-meta */
