
class RawPatchProcessor {
  constructor() {
    this._patchManager = new PatchManager();
  }

  process(text, projectData) {
    const patchBlock = this._extractPatchBlock(text);
    if (patchBlock) {
      return this._patchManager.applyPatches(projectData, patchBlock);
    }

    const jsonBlock = this._extractJsonBlock(text);
    if (jsonBlock) {
      try {
        const parsed = JSON.parse(jsonBlock);
        if (parsed.targets && Array.isArray(parsed.targets)) {
          return {
            projectData: parsed,
            log: ['Full project.json replaced from LLM response.'],
            applied: 1,
            errors: 0,
            fullReplace: true,
          };
        }
        if (parsed.patches && Array.isArray(parsed.patches)) {
          return this._patchManager.applyPatches(projectData, parsed);
        }
      } catch (e) {}
    }

    try {
      const parsed = JSON.parse(text.trim());
      if (parsed.targets && Array.isArray(parsed.targets)) {
        return {
          projectData: parsed,
          log: ['Full project.json replaced from pasted JSON.'],
          applied: 1,
          errors: 0,
          fullReplace: true,
        };
      }
      if (parsed.patches && Array.isArray(parsed.patches)) {
        return this._patchManager.applyPatches(projectData, parsed);
      }
    } catch (e) {}

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const substring = text.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(substring);
        if (parsed.patches && Array.isArray(parsed.patches)) {
          return this._patchManager.applyPatches(projectData, parsed);
        }
        if (parsed.targets && Array.isArray(parsed.targets)) {
          return {
            projectData: parsed,
            log: ['Full project.json replaced from text substring.'],
            applied: 1,
            errors: 0,
            fullReplace: true,
          };
        }
      } catch (e) {}
    }

    throw new Error(
      'Could not find valid JSON or patch data in the pasted text.'
    );
  }

  _extractPatchBlock(text) {
    const match = text.match(/```scratchy-patch\s*\n([\s\S]*?)```/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      throw new Error(`Patch block found but JSON is invalid: ${e.message}`);
    }
  }

  _extractJsonBlock(text) {
    const match = text.match(/```json\s*\n([\s\S]*?)```/);
    return match ? match[1] : null;
  }
}

