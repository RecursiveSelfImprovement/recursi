class StructuredExporter {
  constructor() {
    this._idMap = {};
    this._reverseIdMap = {};
  }

  async getInstructions() {
    try {
      const response = await fetch('./prompt_scratch_app_structured.md');
      if (!response.ok)
        throw new Error('Failed to load structured instructions markdown');
      return await response.text();
    } catch (e) {
      console.error(e);
      return '# Error loading instructions\n\nPlease check that prompt_scratch_app_structured.md exists.';
    }
  }

  getEmptyPromptInstructions() {
    return `

---

## SPECIAL: No user prompt was provided

The user exported their project but didn't write a specific request. This probably means they're just getting started or want to explore.

**Your job right now is to be friendly, curious, and helpful.** Remember you're likely talking to a kid (12–16 years old).

Please do the following:
1. **Look at the project** they sent you. Briefly describe what you see — the sprites, the scripts, what it seems like the project does.
2. **Ask them what they'd like to do!** Give them a few fun ideas based on what's already in the project.
3. **Be encouraging.** Tell them you can do a lot of stuff and you're ready to help.
4. **Keep it short and fun.** Don't overwhelm them — just get the conversation going.

Think of yourself as a friendly coding buddy who's excited to help them build something awesome.
`;
  }

  buildPrompt(
    projectData,
    fileBlobs,
    fileName,
    userText,
    includeInstructions,
    includeCode,
    currentInstructions,
    getAssetLabel
  ) {
    let output = '';

    if (includeInstructions) {
      output += currentInstructions + '\n\n---\n\n';
    }

    if (userText) {
      output += '## User Request\n\n' + userText + '\n\n---\n\n';
    } else {
      output += this.getEmptyPromptInstructions() + '\n\n---\n\n';
    }

    if (includeCode) {
      this._generateIdMap(projectData);
      const pseudocode = this._generatePseudocode(projectData);
      const rewrittenJson = this._rewriteProjectJson(projectData);

      output += '# Current Scratch Project\n\n';
      output += `**File:** ${fileName}\n\n`;

      output += '## Assets\n\n';
      const filenames = Object.keys(fileBlobs).sort();
      for (const fn of filenames) {
        if (fn === 'project.json') continue;
        const label = getAssetLabel ? getAssetLabel(fn) : fn;
        const ext = fn.split('.').pop();
        output += `- **${label}** — \`${fn}\` (${ext})\n`;
      }

      output += '\n## Targets Summary\n\n';
      for (const target of projectData.targets) {
        const blockCount = Object.keys(target.blocks || {}).length;
        const varCount = Object.keys(target.variables || {}).length;
        const costumeNames = (target.costumes || [])
          .map((c) => c.name)
          .join(', ');
        output += `- **${target.name}**${
          target.isStage ? ' (Stage)' : ''
        }: ${blockCount} blocks, ${varCount} variables, costumes: [${costumeNames}]\n`;
      }

      output += '\n## Pseudocode Summary\n\n```text\n' + pseudocode + '\n```\n';

      const cachedProjectJson = JSON.stringify(rewrittenJson, null, 2);
      output +=
        '\n## project.json\n\n```json\n' + cachedProjectJson + '\n```\n';
    }

    return output;
  }

  _generateIdMap(projectData) {
    this._idMap = {};
    this._reverseIdMap = {};

    for (const target of projectData.targets) {
      const safeTargetName =
        target.name.replace(/[^a-zA-Z0-9]/g, '_') || 'target';
      const nameCounts = {};

      const mapGlobals = (obj, type) => {
        if (!obj) return;
        for (const [vId, vData] of Object.entries(obj)) {
          let safeName = vData[0].replace(/[^a-zA-Z0-9]/g, '_') || 'unnamed';
          if (nameCounts[safeName]) {
            safeName = `${safeName}_${nameCounts[safeName]++}`;
          } else {
            nameCounts[safeName] = 1;
          }
          const rId = `${safeTargetName}.${type}.${safeName}`;
          this._idMap[vId] = rId;
          this._reverseIdMap[rId] = vId;
        }
      };

      mapGlobals(target.variables, 'var');
      mapGlobals(target.lists, 'list');
      mapGlobals(target.broadcasts, 'broadcast');

      if (!target.blocks) continue;

      const blocks = target.blocks;
      const topLevelIds = Object.keys(blocks).filter(
        (id) => blocks[id].topLevel && blocks[id].parent === null
      );
      const visited = new Set();

      for (const hatId of topLevelIds) {
        let baseName = this._getHatName(blocks[hatId]);
        if (nameCounts[baseName]) {
          let count = nameCounts[baseName]++;
          baseName = `${baseName}_${count}`;
        } else {
          nameCounts[baseName] = 1;
        }

        const prefix = `${safeTargetName}.${baseName}`;
        this._mapBlockChain(safeTargetName, hatId, blocks, prefix, 0, visited);
      }

      // Map any orphans or nested reporters that weren't caught in the main chain traversal
      let orphanCount = 1;
      for (const bId of Object.keys(blocks)) {
        if (!this._idMap[bId]) {
          const shortOp = this._shortOpcode(blocks[bId].opcode);
          const rId = `${safeTargetName}.orphan.${shortOp}_${orphanCount++}`;
          this._idMap[bId] = rId;
          this._reverseIdMap[rId] = bId;
        }
      }
    }
  }

  _mapBlockChain(targetName, blockId, blocks, prefix, index, visited) {
    if (!blockId || !blocks[blockId] || visited.has(blockId)) return;
    visited.add(blockId);

    const block = blocks[blockId];
    let readableId = prefix;

    if (index > 0) {
      readableId = `${prefix}.${this._shortOpcode(block.opcode)}_${index}`;
    }

    this._idMap[blockId] = readableId;
    this._reverseIdMap[readableId] = blockId;

    if (block.inputs) {
      for (const [inputName, inputData] of Object.entries(block.inputs)) {
        const inputBlockId = this._getBlockIdFromInput(inputData);
        if (
          inputBlockId &&
          blocks[inputBlockId] &&
          !visited.has(inputBlockId)
        ) {
          if (inputName === 'SUBSTACK') {
            this._mapBlockChain(
              targetName,
              inputBlockId,
              blocks,
              `${readableId}.if`,
              1,
              visited
            );
          } else if (inputName === 'SUBSTACK2') {
            this._mapBlockChain(
              targetName,
              inputBlockId,
              blocks,
              `${readableId}.else`,
              1,
              visited
            );
          } else {
            const safeInputName = inputName.toLowerCase();
            this._mapBlockChain(
              targetName,
              inputBlockId,
              blocks,
              `${readableId}.arg_${safeInputName}`,
              1,
              visited
            );
          }
        }
      }
    }

    if (block.next) {
      this._mapBlockChain(
        targetName,
        block.next,
        blocks,
        prefix,
        index + 1,
        visited
      );
    }
  }

  _getHatName(block) {
    const op = block.opcode;
    const f = block.fields || {};
    if (op === 'event_whenflagclicked') return 'whenFlag';
    if (op === 'event_whenkeypressed')
      return 'whenKey_' + this._getFieldValue(f.KEY_OPTION);
    if (op === 'event_whenthisspriteclicked') return 'whenClicked';
    if (op === 'event_whenbroadcastreceived')
      return 'whenRecv_' + this._getFieldValue(f.BROADCAST_OPTION);
    if (op === 'event_whengreaterthan')
      return 'whenGT_' + this._getFieldValue(f.WHENGREATERTHANMENU);
    if (op === 'control_start_as_clone') return 'whenClone';
    if (op === 'event_whenbackdropswitchesto')
      return 'whenBackdrop_' + this._getFieldValue(f.BACKDROP);
    return this._shortOpcode(op);
  }

  _shortOpcode(opcode) {
    if (!opcode) return 'unknown';
    const parts = opcode.split('_');
    if (parts.length === 1) return parts[0];
    parts.shift(); // remove category
    return parts
      .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join('');
  }

  _getFieldValue(fieldArray) {
    if (Array.isArray(fieldArray) && fieldArray.length > 0) {
      return String(fieldArray[0]).replace(/[^a-zA-Z0-9]/g, '');
    }
    return '';
  }

  _getBlockIdFromInput(inputData) {
    if (!Array.isArray(inputData)) return null;
    if (typeof inputData[1] === 'string' && inputData[1].length > 10)
      return inputData[1];
    if (
      inputData.length > 2 &&
      typeof inputData[2] === 'string' &&
      inputData[2].length > 10
    )
      return inputData[2];
    return null;
  }

  _generatePseudocode(projectData) {
    let out = '';
    for (const target of projectData.targets) {
      const vars = [];
      if (target.variables) {
        for (const v of Object.values(target.variables))
          vars.push(`${v[0]} = ${v[1]}`);
      }
      out += `Sprite "${target.name}"${
        vars.length > 0 ? ` (variables: ${vars.join(', ')})` : ''
      }\n`;

      const blocks = target.blocks || {};
      const hats = Object.keys(blocks).filter(
        (id) => blocks[id].topLevel && blocks[id].parent === null
      );

      const visited = new Set();
      for (const hatId of hats) {
        out += `  script [${this._idMap[hatId] || hatId}]:\n`;
        out += this._traversePseudocode(hatId, blocks, 2, visited);
      }
      out += '\n';
    }
    return out.trim();
  }

  _traversePseudocode(blockId, blocks, indentLevel, visited) {
    if (!blockId || !blocks[blockId] || visited.has(blockId)) return '';
    visited.add(blockId);

    const block = blocks[blockId];
    const indent = '  '.repeat(indentLevel);
    let out = indent + this._blockToPseudocode(block, blocks) + '\n';

    if (block.inputs && block.inputs.SUBSTACK) {
      const subId = this._getBlockIdFromInput(block.inputs.SUBSTACK);
      if (subId)
        out += this._traversePseudocode(
          subId,
          blocks,
          indentLevel + 1,
          visited
        );
    }
    if (block.inputs && block.inputs.SUBSTACK2) {
      out += indent + 'else:\n';
      const subId = this._getBlockIdFromInput(block.inputs.SUBSTACK2);
      if (subId)
        out += this._traversePseudocode(
          subId,
          blocks,
          indentLevel + 1,
          visited
        );
    }

    if (block.next) {
      out += this._traversePseudocode(block.next, blocks, indentLevel, visited);
    }
    return out;
  }

  _blockToPseudocode(block, blocks) {
    const op = block.opcode;
    const inputs = block.inputs || {};
    const fields = block.fields || {};

    const getInp = (name) => this._formatInputValue(inputs[name], blocks);
    const getFld = (name) => {
      const f = fields[name];
      return f && f.length > 0 ? f[0] : '';
    };

    switch (op) {
      case 'motion_gotoxy':
        return `go to x: ${getInp('X')} y: ${getInp('Y')}`;
      case 'motion_movesteps':
        return `move ${getInp('STEPS')} steps`;
      case 'looks_say':
        return `say ${getInp('MESSAGE')}`;
      case 'looks_sayforsecs':
        return `say ${getInp('MESSAGE')} for ${getInp('SECS')} secs`;
      case 'control_forever':
        return `forever:`;
      case 'control_repeat':
        return `repeat ${getInp('TIMES')}:`;
      case 'control_if':
        return `if ${getInp('CONDITION')}:`;
      case 'control_if_else':
        return `if ${getInp('CONDITION')}:`;
      case 'data_setvariableto':
        return `set [${getFld('VARIABLE')}] to ${getInp('VALUE')}`;
      case 'data_changevariableby':
        return `change [${getFld('VARIABLE')}] by ${getInp('VALUE')}`;
      case 'event_whenflagclicked':
        return `when flag clicked`;
      case 'event_whenkeypressed':
        return `when [${getFld('KEY_OPTION')}] key pressed`;
      case 'event_whenthisspriteclicked':
        return `when this sprite clicked`;
      case 'event_whenbroadcastreceived':
        return `when I receive [${getFld('BROADCAST_OPTION')}]`;
      default: {
        let args = [];
        for (const [k, v] of Object.entries(inputs)) {
          if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue;
          args.push(`${k}: ${this._formatInputValue(v, blocks)}`);
        }
        for (const [k, v] of Object.entries(fields)) {
          args.push(`[${v[0]}]`);
        }
        const shortOp = this._shortOpcode(op);
        return args.length > 0 ? `${shortOp} ${args.join(' ')}` : shortOp;
      }
    }
  }

  _formatInputValue(inputData, blocks) {
    if (!inputData) return 'null';
    const id = this._getBlockIdFromInput(inputData);

    if (id && blocks[id]) {
      const rep = blocks[id];
      if (rep.opcode === 'data_variable')
        return `(${this._getFieldValue(rep.fields && rep.fields.VARIABLE)})`;
      if (rep.opcode === 'data_listcontents')
        return `(${this._getFieldValue(rep.fields && rep.fields.LIST)})`;
      return `(${this._shortOpcode(rep.opcode)}...)`;
    }

    if (Array.isArray(inputData) && Array.isArray(inputData[1])) {
      return inputData[1][inputData[1].length - 1];
    }

    if (
      Array.isArray(inputData) &&
      typeof inputData[1] === 'string' &&
      inputData[1].length < 8
    ) {
      return inputData[1];
    }
    return '?';
  }

  _rewriteProjectJson(projectData) {
    const clone = JSON.parse(JSON.stringify(projectData));

    for (const target of clone.targets) {
      if (target.variables) {
        const newVars = {};
        for (const [k, v] of Object.entries(target.variables))
          newVars[this._mapId(k)] = v;
        target.variables = newVars;
      }
      if (target.lists) {
        const newLists = {};
        for (const [k, v] of Object.entries(target.lists))
          newLists[this._mapId(k)] = v;
        target.lists = newLists;
      }
      if (target.broadcasts) {
        const newBroadcasts = {};
        for (const [k, v] of Object.entries(target.broadcasts))
          newBroadcasts[this._mapId(k)] = v;
        target.broadcasts = newBroadcasts;
      }

      if (target.blocks) {
        const newBlocks = {};
        for (const [oldId, block] of Object.entries(target.blocks)) {
          const newId = this._mapId(oldId);
          if (block.next) block.next = this._mapId(block.next);
          if (block.parent) block.parent = this._mapId(block.parent);

          if (block.inputs) {
            for (const input of Object.values(block.inputs)) {
              if (Array.isArray(input)) {
                if (typeof input[1] === 'string' && input[1].length > 8) {
                  input[1] = this._mapId(input[1]);
                }
                if (
                  input.length > 2 &&
                  typeof input[2] === 'string' &&
                  input[2].length > 8
                ) {
                  input[2] = this._mapId(input[2]);
                }
              }
            }
          }

          if (block.fields) {
            for (const field of Object.values(block.fields)) {
              if (
                Array.isArray(field) &&
                field.length > 1 &&
                typeof field[1] === 'string'
              ) {
                field[1] = this._mapId(field[1]);
              }
            }
          }

          newBlocks[newId] = block;
        }
        target.blocks = newBlocks;
      }
    }
    return clone;
  }

  _mapId(id) {
    return this._idMap[id] || id;
  }

  getReverseIdMap() {
    return this._reverseIdMap || {};
  }
}

