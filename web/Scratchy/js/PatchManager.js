class PatchManager {
  constructor() {}

  applyPatches(projectData, patchData) {
    const patches = patchData.patches;
    if (!patches || !Array.isArray(patches)) {
      throw new Error('Invalid patch format — expected { patches: [...] }');
    }

    // Clone data to avoid mutating if something fails halfway?
    // For now we mutate in place as per original design, but return log.
    const log = [];
    let applied = 0;
    let errors = 0;

    log.push(`=== Patch Session: ${patches.length} patch(es) received ===`);
    log.push(
      `Project has ${projectData.targets.length} targets: ${projectData.targets
        .map((t) => t.name)
        .join(', ')}`
    );
    log.push('');

    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i];
      log.push(`--- Patch ${i + 1}/${patches.length} ---`);
      log.push(`  op: "${patch.op}"`);
      log.push(`  target: ${JSON.stringify(patch.target)}`);

      try {
        this.applySinglePatch(projectData, patch, log);
        applied++;
        log.push(`  ✅ SUCCESS`);
      } catch (e) {
        errors++;
        log.push(`  ❌ FAILED: ${e.message}`);
        console.error('Patch failed:', patch, e);
      }
      log.push('');
    }

    // Validation
    log.push(`=== Post-Patch Validation ===`);
    const touchedTargets = new Set();
    for (const patch of patches) {
      if (patch.target && patch.target.name)
        touchedTargets.add(patch.target.name);
    }
    for (const targetName of touchedTargets) {
      const target = projectData.targets.find((t) => t.name === targetName);
      if (target) {
        log.push(
          `Validating "${targetName}" (${
            Object.keys(target.blocks || {}).length
          } blocks):`
        );
        this.validateBlockReferences(target, log);
      }
    }

    log.push('');
    log.push(`=== Result: ${applied} applied, ${errors} failed ===`);

    return { projectData, log, applied, errors };
  }

  applySinglePatch(projectData, patch, log) {
    const op = patch.op;

    if (op === 'replace') {
      const obj = this.resolveTarget(projectData, patch.target, log);
      const path = patch.path;

      if (!path || path.length === 0) {
        throw new Error('Replace patch has no path');
      }

      let current = obj;
      for (let i = 0; i < path.length - 1; i++) {
        current = this.resolvePathStep(current, path[i], log);
      }

      const lastKey = path[path.length - 1];
      const existed = current.hasOwnProperty
        ? current.hasOwnProperty(lastKey)
        : lastKey in current;
      const value = patch.value !== undefined ? patch.value : patch.data;

      if (existed) {
        const oldSize = this.sizeDesc(current[lastKey]);
        const newSize = this.sizeDesc(value);
        log.push(
          `  ✓ Replaced "${path.join(' → ')}" — was ${oldSize}, now ${newSize}`
        );
      } else {
        log.push(`  ✓ Created "${path.join(' → ')}" — ${this.sizeDesc(value)}`);
      }
      current[lastKey] = value;
      return;
    }

    if (op === 'add_blocks') {
      const target = this.resolveTarget(projectData, patch.target, log);
      if (!target.blocks) {
        target.blocks = {};
      }

      let blocksToAdd = patch.blocks || patch.value || patch.data;
      if (!blocksToAdd) {
        throw new Error('add_blocks patch has no blocks/value/data field');
      }

      if (Array.isArray(blocksToAdd)) {
        log.push(
          `  Converting ${blocksToAdd.length} blocks from array to object`
        );
        const converted = {};
        for (const block of blocksToAdd) {
          const id = block.id || block.blockId;
          if (id) {
            const blockCopy = Object.assign({}, block);
            delete blockCopy.id;
            delete blockCopy.blockId;
            converted[id] = blockCopy;
          } else {
            const genId = 'llm_' + Math.random().toString(36).substring(2, 10);
            converted[genId] = block;
            log.push(
              `  ⚠️ No id on block (opcode="${block.opcode}") — generated "${genId}"`
            );
          }
        }
        blocksToAdd = converted;
      }

      const needsRemap = Object.keys(blocksToAdd).some(
        (id) =>
          id.startsWith('new_') ||
          id.startsWith('llm_') ||
          id.startsWith('block_') ||
          id.length < 8
      );

      if (needsRemap) {
        log.push(`  Remapping placeholder IDs to Scratch-style IDs`);
        const { remapped } = this.remapBlockIds(blocksToAdd, log);
        blocksToAdd = remapped;
      }

      const existingCount = Object.keys(target.blocks).length;
      let added = 0;
      let overwritten = 0;
      for (const [blockId, blockData] of Object.entries(blocksToAdd)) {
        if (blockId in target.blocks) {
          overwritten++;
        } else {
          added++;
        }
        target.blocks[blockId] = blockData;
      }
      const newCount = Object.keys(target.blocks).length;
      log.push(
        `  ✓ Added ${added} block(s), overwrote ${overwritten} — target "${target.name}" now has ${newCount} blocks (was ${existingCount})`
      );
      return;
    }

    if (op === 'delete_blocks') {
      const target = this.resolveTarget(projectData, patch.target, log);

      let idsToDelete =
        patch.blockIds || patch.value || patch.ids || patch.data;

      if (!idsToDelete) throw new Error('delete_blocks missing ids');
      if (typeof idsToDelete === 'string') idsToDelete = [idsToDelete];

      const beforeCount = Object.keys(target.blocks || {}).length;
      let deleted = 0;
      let notFound = 0;

      for (const blockId of idsToDelete) {
        if (target.blocks && blockId in target.blocks) {
          delete target.blocks[blockId];
          deleted++;
        } else {
          notFound++;
        }
      }

      // Cleanup dangling
      let cleaned = 0;
      for (const [bId, block] of Object.entries(target.blocks || {})) {
        if (block.next && idsToDelete.includes(block.next)) {
          block.next = null;
          cleaned++;
        }
        if (block.parent && idsToDelete.includes(block.parent)) {
          block.parent = null;
          block.topLevel = true;
          cleaned++;
        }
      }

      log.push(
        `  ✓ Deleted ${deleted} block(s) from "${
          target.name
        }" — was ${beforeCount}, now ${Object.keys(target.blocks).length}`
      );
      if (cleaned > 0) log.push(`    Fixed ${cleaned} dangling references`);
      return;
    }

    if (op === 'set_variable') {
      const target = this.resolveTarget(projectData, patch.target, log);
      const varName = patch.variableName || patch.name;
      const varValue = patch.value !== undefined ? patch.value : patch.data;

      for (const [varId, varEntry] of Object.entries(target.variables || {})) {
        if (varEntry[0] === varName) {
          varEntry[1] = varValue;
          log.push(
            `  ✓ Set "${varName}" on "${target.name}" to ${JSON.stringify(
              varValue
            )}`
          );
          return;
        }
      }
      throw new Error(
        `Variable "${varName}" not found on target "${target.name}"`
      );
    }

    throw new Error(`Unknown patch op: "${op}"`);
  }

  resolveTarget(projectData, targetSpec, log) {
    if (!targetSpec) {
      if (log) log.push(`  [resolveTarget] No target spec — using root`);
      return projectData;
    }
    if (targetSpec.name) {
      const found = projectData.targets.find((t) => t.name === targetSpec.name);
      if (!found) throw new Error(`Target "${targetSpec.name}" not found.`);
      return found;
    }
    if (typeof targetSpec.index === 'number') {
      const t = projectData.targets[targetSpec.index];
      if (!t) throw new Error(`Target index ${targetSpec.index} out of range`);
      return t;
    }
    // Fallback
    return projectData;
  }

  resolvePathStep(obj, step, log) {
    if (typeof step === 'string') {
      if (obj && typeof obj === 'object' && step in obj) return obj[step];
      throw new Error(`Key "${step}" not found in object.`);
    }
    if (typeof step === 'number') {
      if (Array.isArray(obj)) return obj[step];
      throw new Error(`Numeric path step ${step} but not an array.`);
    }
    if (typeof step === 'object' && step !== null && Array.isArray(obj)) {
      // Find matching item in array
      for (const item of obj) {
        let match = true;
        for (const [k, v] of Object.entries(step)) {
          if (item[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) return item;
      }
      throw new Error(`No array element matching ${JSON.stringify(step)}`);
    }
    throw new Error(`Cannot resolve path step: ${JSON.stringify(step)}`);
  }

  validateBlockReferences(target, log) {
    if (!target.blocks) return;
    const allIds = new Set(Object.keys(target.blocks));
    let danglingCount = 0;

    for (const [blockId, block] of Object.entries(target.blocks)) {
      if (block.next && !allIds.has(block.next)) {
        log.push(
          `  ⚠️ DANGLING REF: Block "${blockId}" next="${block.next}" missing`
        );
        danglingCount++;
      }
      if (block.parent && !allIds.has(block.parent)) {
        log.push(
          `  ⚠️ DANGLING REF: Block "${blockId}" parent="${block.parent}" missing`
        );
        danglingCount++;
      }
    }
  }

  remapBlockIds(blocks, log) {
    const idMap = {};
    const remapped = {};

    for (const oldId of Object.keys(blocks)) {
      const newId = this.generateBlockId();
      idMap[oldId] = newId;
      log.push(`    ID remap: "${oldId}" → "${newId}"`);
    }

    for (const [oldId, block] of Object.entries(blocks)) {
      const newBlock = JSON.parse(JSON.stringify(block));
      if (newBlock.next && idMap[newBlock.next])
        newBlock.next = idMap[newBlock.next];
      if (newBlock.parent && idMap[newBlock.parent])
        newBlock.parent = idMap[newBlock.parent];
      this.remapInputRefs(newBlock.inputs, idMap);
      remapped[idMap[oldId]] = newBlock;
    }
    return { remapped, idMap };
  }

  remapInputRefs(inputs, idMap) {
    if (!inputs || typeof inputs !== 'object') return;
    for (const key of Object.keys(inputs)) {
      const val = inputs[key];
      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          if (typeof val[i] === 'string' && idMap[val[i]])
            val[i] = idMap[val[i]];
          if (Array.isArray(val[i])) {
            for (let j = 0; j < val[i].length; j++) {
              if (typeof val[i][j] === 'string' && idMap[val[i][j]])
                val[i][j] = idMap[val[i][j]];
            }
          }
        }
      }
    }
  }

  generateBlockId() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#%()*+,-./:;=?@[]^_`{|}~';
    let id = '';
    for (let i = 0; i < 20; i++)
      id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  sizeDesc(value) {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return `array[${value.length}]`;
    if (typeof value === 'object')
      return `object{${Object.keys(value).length}}`;
    return `${typeof value}(${String(value).length})`;
  }
}

