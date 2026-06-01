
class ScratchyLLMBridge {
  constructor(app) {
    this._app = app;
    this._patchManager = null;
    this._structuredExporter = new StructuredExporter();
    this._structuredPatchProcessor = new StructuredPatchProcessor();
    this._structuredPatchProcessor.setExporter(this._structuredExporter);
    this._cachedRawInstructions = null;
    this._cachedStructuredInstructions = null;
    this._hatchy = new Hatchy();
    this._useStructuredMode = true;
    this._hatchyStarted = false;
  }

  exportForLLM() {
    const app = this._app;
    if (!app.projectData) {
      app.statusDiv.textContent = 'Load an .sb3 file first.';
      return;
    }
    this.openPromptBuilderDialog();
  }

  async getDefaultInstructions() {
    if (this._useStructuredMode) {
      return this._getStructuredInstructions();
    }
    return this._getRawInstructions();
  }

  async _getRawInstructions() {
    if (this._cachedRawInstructions) return this._cachedRawInstructions;
    try {
      const resp = await fetch('./prompt_scratch_app_raw_json.md');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this._cachedRawInstructions = await resp.text();
    } catch (e) {
      console.warn('Failed to fetch raw instructions markdown:', e);
      this._cachedRawInstructions =
        '# Scratchy Instructions\n\n(Could not load prompt_scratch_app_raw_json.md)';
    }
    return this._cachedRawInstructions;
  }

  async _getStructuredInstructions() {
    if (this._cachedStructuredInstructions)
      return this._cachedStructuredInstructions;
    try {
      const resp = await fetch('./prompt_scratch_app_structured.md');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this._cachedStructuredInstructions = await resp.text();
    } catch (e) {
      console.warn('Failed to fetch structured instructions markdown:', e);
      this._cachedStructuredInstructions =
        '# Scratchy Instructions\n\n(Could not load prompt_scratch_app_structured.md)';
    }
    return this._cachedStructuredInstructions;
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

  isStructuredMode() {
    return this._useStructuredMode;
  }

  setStructuredMode(enabled) {
    this._useStructuredMode = enabled;
  }

  startEasterEgg() {
    if (this._hatchyStarted) return;
    this._hatchyStarted = true;
    this._hatchy.startEasterEgg();
  }

  showHatchyDialog() {
    this._hatchy.showFoundDialog();
  }

  async handlePasteFromLLM() {
    const app = this._app;
    app.intro.wiggleMascot();

    if (!this._hatchyStarted) {
      this.startEasterEgg();
    }

    let clipText;
    try {
      clipText = await navigator.clipboard.readText();
    } catch (e) {
      app.statusDiv.textContent =
        'Clipboard access denied — try the manual paste dialog.';
      this._openManualPasteDialog();
      return;
    }

    if (!clipText || !clipText.trim()) {
      app.statusDiv.textContent = 'Clipboard is empty.';
      return;
    }

    this._applyLLMResponse(clipText);
  }

  _openManualPasteDialog() {
      const app = this._app;
      const textarea = makeElement('textarea', {
        style: {
          width: '100%',
          height: '100%',
          background: '#1e1e2e',
          color: '#cdd6f4',
          border: 'none',
          fontFamily: 'monospace',
          fontSize: '12px',
          resize: 'none',
          padding: '10px',
          boxSizing: 'border-box',
        },
        placeholder: 'Paste the LLM response here...',
      });

      UITools.makeDialog({
        env: app.env,
        title: 'Paste LLM Response',
        size: [700, 500],
        contentElement: textarea,
        noPadding: true,
        buttons: [
          {
            label: 'Apply',
            className: 'primary',
            onClick: (btn, dlgInstance) => {
              this._applyLLMResponse(textarea.value);
              dlgInstance.close();
              return true;
            },
          },
          { label: 'Cancel' },
        ],
      });
      setTimeout(() => textarea.focus(), 50);
    }

  _applyLLMResponse(text) {
    const app = this._app;
    if (!app.projectData) {
      app.statusDiv.textContent =
        'Load an .sb3 file first before pasting changes.';
      return;
    }

    if (this._useStructuredMode) {
      this._applyStructuredResponse(text);
    } else {
      this._applyRawResponse(text);
    }
  }

  _applyStructuredResponse(text) {
    const app = this._app;
    try {
      const result = this._structuredPatchProcessor.process(
        text,
        app.projectData
      );
      const { projectData, log, applied, errors, fullReplace } = result;

      if (fullReplace) {
        app.projectData = projectData;
        app.fileBlobs['project.json'].data = app.projectData;
        app.fileBlobs['project.json'].raw = JSON.stringify(
          app.projectData,
          null,
          2
        );
        app.editorManager.refreshInlineEditor('project.json');
        app.statusDiv.textContent =
          'Full project.json replaced from LLM response.';
        this._showPatchLog(log);
        return;
      }

      app.projectData = projectData;
      app.fileBlobs['project.json'].data = app.projectData;
      app.fileBlobs['project.json'].raw = JSON.stringify(
        app.projectData,
        null,
        2
      );
      app.editorManager.refreshInlineEditor('project.json');

      if (applied > 0) {
        app.hasReceivedPatch = true;
        if (app.currentViewer) {
          app.currentViewer.refresh();
        }
      }

      app.statusDiv.textContent = `Applied ${applied} patch(es)${
        errors ? `, ${errors} failed` : ''
      }. See log for details.`;
      this._showPatchLog(log);
    } catch (e) {
      app.statusDiv.textContent = 'Patch Error: ' + e.message;
      console.error(e);
      this._showPatchLog([`CRITICAL ERROR: ${e.message}`]);
    }
  }

  _applyRawResponse(text) {
    const app = this._app;

    const patchBlock = this._extractPatchBlock(text);
    if (patchBlock) {
      this._applyPatches(patchBlock);
      return;
    }

    const jsonBlock = this._extractJsonBlock(text);
    if (jsonBlock) {
      try {
        const parsed = JSON.parse(jsonBlock);
        if (parsed.targets && Array.isArray(parsed.targets)) {
          this._replaceProjectJson(parsed);
          app.statusDiv.textContent =
            'Full project.json replaced from LLM response.';
          return;
        }
        if (parsed.patches && Array.isArray(parsed.patches)) {
          this._applyPatches(parsed);
          return;
        }
      } catch (e) {}
    }

    try {
      const parsed = JSON.parse(text.trim());
      if (parsed.targets && Array.isArray(parsed.targets)) {
        this._replaceProjectJson(parsed);
        app.statusDiv.textContent =
          'Full project.json replaced from pasted JSON.';
        return;
      }
      if (parsed.patches && Array.isArray(parsed.patches)) {
        this._applyPatches(parsed);
        return;
      }
    } catch (e) {}

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const substring = text.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(substring);
        if (parsed.patches && Array.isArray(parsed.patches)) {
          this._applyPatches(parsed);
          return;
        }
        if (parsed.targets && Array.isArray(parsed.targets)) {
          this._replaceProjectJson(parsed);
          app.statusDiv.textContent =
            'Full project.json replaced from text substring.';
          return;
        }
      } catch (e) {}
    }

    app.statusDiv.textContent =
      'Could not find valid JSON or patch data in the pasted text.';
  }

  _extractPatchBlock(text) {
    const app = this._app;
    const match = text.match(/```scratchy-patch\s*\n([\s\S]*?)```/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      app.statusDiv.textContent = `Patch block found but JSON is invalid: ${e.message}`;
      return null;
    }
  }

  _extractJsonBlock(text) {
    const match = text.match(/```json\s*\n([\s\S]*?)```/);
    return match ? match[1] : null;
  }

  _replaceProjectJson(newData) {
    const app = this._app;
    app.projectData = newData;
    app.fileBlobs['project.json'].data = newData;
    app.fileBlobs['project.json'].raw = JSON.stringify(newData, null, 2);
    app.editorManager.refreshInlineEditor('project.json');
  }

  _applyPatches(patchData) {
    const app = this._app;
    if (!this._patchManager) this._patchManager = new PatchManager();
    try {
      const result = this._patchManager.applyPatches(
        app.projectData,
        patchData
      );
      const { projectData, log, applied, errors } = result;
      app.projectData = projectData;
      app.fileBlobs['project.json'].data = app.projectData;
      app.fileBlobs['project.json'].raw = JSON.stringify(
        app.projectData,
        null,
        2
      );
      app.editorManager.refreshInlineEditor('project.json');
      if (applied > 0) {
        app.hasReceivedPatch = true;
        if (app.currentViewer) {
          app.currentViewer.refresh();
        }
      }
      app.statusDiv.textContent = `Applied ${applied} patch(es)${
        errors ? `, ${errors} failed` : ''
      }. See log for details.`;
      this._showPatchLog(log);
    } catch (e) {
      app.statusDiv.textContent = 'Patch Error: ' + e.message;
      console.error(e);
      this._showPatchLog([`CRITICAL ERROR: ${e.message}`]);
    }
  }

  _showPatchLog(logLines) {
      const logContent = makeElement('div', {
        style: {
          background: '#1e1e2e',
          color: '#a6accd',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          height: '100%',
          overflowY: 'auto',
        },
        textContent: logLines.join('\n'),
      });

      UITools.makeDialog({
        env: this._app.env,
        title: 'Patch Log',
        size: [600, 400],
        contentElement: logContent,
        noPadding: true,
        buttons: [{ label: 'Close' }],
      });
    }

  async openPromptBuilderDialog() {
      const app = this._app;

      if (!app.projectData) {
        app.statusDiv.textContent =
          'Load an .sb3 file first, then build your prompt.';
        return;
      }

      const shouldIncludeInstructions = !app.hasReceivedPatch;
      const shouldIncludeCode = !app.hasReceivedPatch;

      const includeInstructionsCheckbox = makeElement('input', {
        type: 'checkbox',
        checked: shouldIncludeInstructions,
        id: 'pb-include-instructions-' + Date.now(),
      });

      const includeCodeCheckbox = makeElement('input', {
        type: 'checkbox',
        checked: shouldIncludeCode,
        id: 'pb-include-code-' + Date.now(),
      });

      const structuredModeCheckbox = makeElement('input', {
        type: 'checkbox',
        checked: this._useStructuredMode,
        id: 'pb-structured-mode-' + Date.now(),
      });
      structuredModeCheckbox.addEventListener('change', () => {
        this._useStructuredMode = structuredModeCheckbox.checked;
        this._cachedStructuredInstructions = null;
        this._cachedRawInstructions = null;
        reloadAndRefresh();
      });

      const stepNumberStyle =
        'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;font-size:15px;font-weight:800;flex-shrink:0;';

      const stepHeader = (num, text, color, bgColor) => {
        return makeElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
              fontFamily: "'Architects Daughter', cursive",
              fontSize: '19px',
              fontWeight: '700',
              color: '#ddd',
            },
          },
          [
            makeElement('span', {
              style:
                stepNumberStyle +
                'background:' +
                bgColor +
                ';color:' +
                color +
                ';',
              textContent: String(num),
            }),
            makeElement('span', {}, text),
          ]
        );
      };

      const sectionBox = (children) => {
        return makeElement(
          'div',
          {
            style: {
              background: '#2a2a3e',
              borderRadius: '10px',
              padding: '14px 16px',
              border: '1px solid #444',
              marginBottom: '10px',
            },
          },
          children
        );
      };

      const step1 = sectionBox([
        stepHeader(1, 'What do you want to change?', '#fff', '#9c27b0'),
        makeElement('div', {
          style: {
            fontSize: '14px',
            color: '#aaa',
            marginBottom: '10px',
            fontFamily: "'Architects Daughter', cursive",
            fontStyle: 'italic',
            lineHeight: '1.5',
          },
          textContent:
            'Type below, or click "Start Listening" to dictate with your voice. Leave blank and the AI will ask you what to do!',
        }),
      ]);

      const dictWidget = new DictationWidget();
      dictWidget.init();
      const dictElement = dictWidget.getElement();
      dictElement.style.height = '180px';
      dictElement.style.borderRadius = '8px';
      dictElement.style.overflow = 'hidden';
      dictElement.style.border = '1px solid #555';
      step1.appendChild(dictElement);

      const firstTimeHint = makeElement('div', {
        style: {
          fontSize: '13px',
          color: app.hasReceivedPatch ? '#8a8' : '#fb8',
          fontStyle: 'italic',
          marginTop: '6px',
          fontFamily: "'Architects Daughter', cursive",
          lineHeight: '1.4',
        },
        textContent: app.hasReceivedPatch
          ? "✅ You've already sent patches this session - instructions & code unchecked to save space. Re-check them if starting a new chat."
          : '💡 First prompt this session - instructions & code are included so the AI knows your project.',
      });

      const step2 = sectionBox([
        stepHeader(2, 'What to include', '#fff', '#2196f3'),
        makeElement(
          'div',
          {
            style: {
              display: 'flex',
              gap: '24px',
              alignItems: 'center',
              flexWrap: 'wrap',
            },
          },
          [
            makeElement(
              'label',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Architects Daughter', cursive",
                  fontSize: '16px',
                  color: '#bde0fe',
                  fontWeight: '600',
                },
              },
              [includeInstructionsCheckbox, ' System Prompt (how-to for AI)']
            ),
            makeElement(
              'label',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Architects Daughter', cursive",
                  fontSize: '16px',
                  color: '#bde0fe',
                  fontWeight: '600',
                },
              },
              [includeCodeCheckbox, ' Project Code (project.json)']
            ),
            makeElement(
              'label',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Architects Daughter', cursive",
                  fontSize: '16px',
                  color: '#ffd6a5',
                  fontWeight: '600',
                },
              },
              [structuredModeCheckbox, ' Structured Mode (readable IDs)']
            ),
          ]
        ),
        firstTimeHint,
      ]);

      const previewLabel = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        },
        [stepHeader(3, 'Preview - what gets copied', '#fff', '#4caf50')]
      );

      const previewArea = makeElement('textarea', {
        style: {
          width: '100%',
          flex: '1',
          background: '#1a1a2e',
          color: '#c0c8e8',
          border: '1px solid #444',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '13px',
          padding: '12px',
          boxSizing: 'border-box',
          resize: 'none',
          lineHeight: '1.5',
        },
      });

      const statusLine = makeElement('div', {
        style: {
          fontFamily: "'Architects Daughter', cursive",
          fontSize: '14px',
          color: '#8a8',
          marginTop: '6px',
          minHeight: '22px',
        },
      });

      const step3 = sectionBox([previewLabel, previewArea, statusLine]);
      step3.style.display = 'flex';
      step3.style.flexDirection = 'column';
      step3.style.flex = '1';
      step3.style.minHeight = '0';
      previewArea.style.flex = '1';

      let cachedInstructionsText = await this.getDefaultInstructions();
      const emptyPromptText = this.getEmptyPromptInstructions();

      const buildOutput = () => {
        const currentDictText = dictWidget.getText().trim();
        const currentInstr = includeInstructionsCheckbox.checked;
        const currentCode = includeCodeCheckbox.checked;

        if (this._useStructuredMode) {
          return this._structuredExporter.buildPrompt(
            app.projectData,
            app.fileBlobs,
            app.loadedFileName || 'project.sb3',
            currentDictText,
            currentInstr,
            currentCode,
            cachedInstructionsText,
            app.fileList.getAssetLabel
              ? app.fileList.getAssetLabel.bind(app.fileList)
              : null
          );
        }

        let output = '';
        if (currentInstr) {
          output += cachedInstructionsText + '\\n\\n---\\n\\n';
        }
        if (currentDictText) {
          output += '## User Request\\n\\n' + currentDictText + '\\n\\n---\\n\\n';
        } else {
          output += emptyPromptText + '\\n\\n---\\n\\n';
        }
        if (currentCode) {
          const cachedProjectJson = JSON.stringify(app.projectData, null, 2);
          const filenames = Object.keys(app.fileBlobs).sort();
          let assetList = '';
          for (const fn of filenames) {
            if (fn === 'project.json') continue;
            const label = app.fileList.getAssetLabel
              ? app.fileList.getAssetLabel(fn)
              : fn;
            const ext = fn.split('.').pop();
            assetList += '- **' + label + '** - `' + fn + '` (' + ext + ')\\n';
          }
          let targetsSummary = '';
          for (const target of app.projectData.targets) {
            const blockCount = Object.keys(target.blocks || {}).length;
            const varCount = Object.keys(target.variables || {}).length;
            const costumeNames = (target.costumes || [])
              .map((c) => c.name)
              .join(', ');
            const stageStr = target.isStage ? ' (Stage)' : '';
            targetsSummary += '- **' + target.name + '**' + stageStr + ': ' + blockCount + ' blocks, ' + varCount + ' variables, costumes: [' + costumeNames + ']\\n';
          }
          output += '# Current Scratch Project\\n\\n';
          const fileDisplayName = app.loadedFileName || 'project.sb3';
          output += '**File:** ' + fileDisplayName + '\\n\\n';
          output += '## Assets\\n\\n' + assetList;
          output += '\\n## Targets Summary\\n\\n' + targetsSummary;
          output += '\\n## project.json\\n\\n\`\`\`json\\n' + cachedProjectJson + '\\n\`\`\`\\n';
        }
        return output;
      };

      const reloadAndRefresh = async () => {
        cachedInstructionsText = await this.getDefaultInstructions();
        refreshPreview();
      };

      let debounceTimer = null;
      const refreshPreview = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          previewArea.value = buildOutput();
        }, 50);
      };

      dictWidget.subscribe(() => refreshPreview());
      includeInstructionsCheckbox.addEventListener('change', () =>
        refreshPreview()
      );
      includeCodeCheckbox.addEventListener('change', () => refreshPreview());

      refreshPreview();

      const copyToClipboard = (text) => {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            statusLine.textContent =
              '✅ Copied to clipboard! Paste it into your AI chat.';
            statusLine.style.color = '#8a8';
            setTimeout(() => {
              statusLine.textContent = '';
            }, 4000);
          })
          .catch(() => {
            statusLine.textContent =
              '❌ Clipboard copy failed - select the preview text and copy manually.';
            statusLine.style.color = '#f88';
            previewArea.select();
          });
      };

      const wrapper = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '14px',
            boxSizing: 'border-box',
            gap: '0px',
            background: '#252526',
            overflow: 'auto',
          },
        },
        [step1, step2, step3]
      );

      const dlgW = Math.min(Math.round(window.innerWidth * 0.75), 900);
      const dlgH = Math.min(Math.round(window.innerHeight * 0.85), 800);

      UITools.makeDialog({
        env: app.env,
        title: '🎙️ Build Prompt',
        size: [dlgW, dlgH],
        contentElement: wrapper,
        noPadding: true,
        buttons: [
          {
            label: '📋 Copy & Close',
            className: 'primary',
            onClick: (btn, dlgInstance) => {
              const finalText = previewArea.value || buildOutput();
              copyToClipboard(finalText);
              app.statusDiv.textContent =
                'Prompt copied to clipboard - paste into your AI conversation.';
              dlgInstance.close();
              return true;
            },
          },
          {
            label: '📋 Copy (stay open)',
            onClick: () => {
              const finalText = previewArea.value || buildOutput();
              copyToClipboard(finalText);
              return false;
            },
          },
          { label: 'Cancel' },
        ],
        onClose: () => {
          dictWidget.destroy();
        },
      });
    }

  

  
}

