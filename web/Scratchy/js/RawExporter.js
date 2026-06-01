class RawExporter {
  async getInstructions() {
    try {
      const response = await fetch('./prompt_scratch_app_raw_json.md');
      if (!response.ok)
        throw new Error('Failed to load raw instructions markdown');
      return await response.text();
    } catch (e) {
      console.error(e);
      return '# Error loading instructions\n\nPlease check that prompt_scratch_app_raw_json.md exists.';
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

      const cachedProjectJson = JSON.stringify(projectData, null, 2);
      output +=
        '\n## project.json\n\n```json\n' + cachedProjectJson + '\n```\n';
    }

    return output;
  }
}

