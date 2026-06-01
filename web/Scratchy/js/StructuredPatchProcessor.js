
class StructuredPatchProcessor {
  constructor() {
    this._patchManager = new PatchManager();
    this._exporter = null;
  }

  setExporter(exporter) {
    this._exporter = exporter;
  }

  process(text, projectData) {
    let parsed = null;
    let sourceLog = '';

    const patchBlock = this._extractPatchBlock(text);
    if (patchBlock) {
      parsed = patchBlock;
      sourceLog = 'scratchy-patch block';
    } else {
      const jsonBlock = this._extractJsonBlock(text);
      if (jsonBlock) {
        try {
          parsed = JSON.parse(jsonBlock);
          sourceLog = 'json block';
        } catch (e) {}
      }
      if (!parsed) {
        try {
          parsed = JSON.parse(text.trim());
          sourceLog = 'raw json';
        } catch (e) {}
      }
      if (!parsed) {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          try {
            const substring = text.substring(firstBrace, lastBrace + 1);
            parsed = JSON.parse(substring);
            sourceLog = 'json substring';
          } catch (e) {}
        }
      }
    }

    if (!parsed) {
      throw new Error(
        'Could not find valid JSON or patch data in the pasted text.'
      );
    }

    if (parsed.targets && Array.isArray(parsed.targets)) {
      return {
        projectData: parsed,
        log: [`Full project.json replaced from ${sourceLog}.`],
        applied: 1,
        errors: 0,
        fullReplace: true,
      };
    }

    if (parsed.patches && Array.isArray(parsed.patches)) {
      this._resolvePatches(parsed.patches);
      return this._patchManager.applyPatches(projectData, parsed);
    }

    throw new Error(
      'Parsed JSON does not contain a "patches" array or "targets" array.'
    );
  }

  _resolvePatches(patches) {
    const reverseMap = this._exporter ? this._exporter.getReverseIdMap() : {};
    const newIdMap = {};

    const resolveId = (id) => {
      if (typeof id !== 'string') return id;
      if (reverseMap[id]) return reverseMap[id];
      if (newIdMap[id]) return newIdMap[id];
      return id;
    };

    // Pass 1: Identify genuinely new block IDs and generate Scratch-compatible IDs for them
    for (const patch of patches) {
      let blocksObj = null;
      if (patch.op === 'add_blocks') {
        blocksObj = patch.blocks || patch.value || patch.data;
      } else if (
        patch.op === 'replace' &&
        patch.path &&
        patch.path[0] === 'blocks' &&
        patch.path.length === 1
      ) {
        blocksObj = patch.value;
      }

      if (
        blocksObj &&
        typeof blocksObj === 'object' &&
        !Array.isArray(blocksObj)
      ) {
        for (const key of Object.keys(blocksObj)) {
          if (!reverseMap[key] && !newIdMap[key]) {
            newIdMap[key] = this._generateId();
          }
        }
      }
    }

    // Deep String Resolver: Replaces values and object keys that exist in our ID maps
    const deepResolve = (obj) => {
      if (typeof obj === 'string') {
        if (reverseMap[obj] || newIdMap[obj]) return resolveId(obj);
        return obj;
      }
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          obj[i] = deepResolve(obj[i]);
        }
        return obj;
      }
      if (typeof obj === 'object' && obj !== null) {
        const keys = Object.keys(obj);
        for (const key of keys) {
          const val = obj[key];
          obj[key] = deepResolve(val);

          if (reverseMap[key] || newIdMap[key]) {
            const resolvedKey = resolveId(key);
            if (resolvedKey !== key) {
              obj[resolvedKey] = obj[key];
              delete obj[key];
            }
          }
        }
        return obj;
      }
      return obj;
    };

    // Pass 2: Rewrite all IDs within the patches
    for (const patch of patches) {
      // 1. Resolve path array strings
      if (patch.path && Array.isArray(patch.path)) {
        patch.path = patch.path.map(resolveId);
      }

      // 2. Resolve delete_blocks targeted arrays
      if (patch.op === 'delete_blocks') {
        if (patch.blockIds) patch.blockIds = patch.blockIds.map(resolveId);
        if (patch.ids) patch.ids = patch.ids.map(resolveId);
        if (patch.value) {
          if (Array.isArray(patch.value))
            patch.value = patch.value.map(resolveId);
          else if (typeof patch.value === 'string')
            patch.value = resolveId(patch.value);
        }
        if (patch.data) {
          if (Array.isArray(patch.data)) patch.data = patch.data.map(resolveId);
          else if (typeof patch.data === 'string')
            patch.data = resolveId(patch.data);
        }
      }

      // 3. Resolve deeply within objects carrying block/variable references
      if (patch.op === 'add_blocks') {
        if (patch.blocks) deepResolve(patch.blocks);
        if (patch.value) deepResolve(patch.value);
        if (patch.data) deepResolve(patch.data);
      } else if (patch.op === 'replace') {
        if (patch.value !== undefined) {
          patch.value = deepResolve(patch.value);
        }
      }
    }
  }

  _generateId() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#%()*+,-./:;=?@[]^_`{|}~';
    let id = '';
    for (let i = 0; i < 20; i++)
      id += chars[Math.floor(Math.random() * chars.length)];
    return id;
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

