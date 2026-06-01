class PatchDashboard {
  constructor(app) {
    this.app = app;
    this.dialog = null;
    this.selectedFilePath = null;
    this.selectedPatchKey = null;
  }

  async show() {
    if (!this.app.patchStore) {
      this.app.uiManager?.setStatus('PatchStore is not available.', true);
      return;
    }

    const patches = await this.app.patchStore.getAllPatches();
    const content = await this._buildContent(patches);

    this.dialog = UITools.makeDialog({
      title: '🩹 Runtime Patches (IndexedDB)',
      content: content,
      width: '800px', 
      height: '520px',
      allowMinimize: true,
      allowMaximize: true
    });
  }

  computeLineDiff(oldStr, newStr) {
    const oldLines = oldStr ? oldStr.split('\n') : [];
    const newLines = newStr ? newStr.split('\n') : [];
    
    const dp = Array(oldLines.length + 1).fill(0).map(() => Array(newLines.length + 1).fill(0));
    for (let i = 1; i <= oldLines.length; i++) {
      for (let j = 1; j <= newLines.length; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    let added = 0;
    let removed = 0;
    let i = oldLines.length;
    let j = newLines.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        added++;
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        removed++;
        i--;
      }
    }
    return { added, removed };
  }

  renderUnifiedDiff(beforeText, afterText) {
    const beforeLines = beforeText ? beforeText.split('\n') : [];
    const afterLines = afterText ? afterText.split('\n') : [];
    
    const dp = Array(beforeLines.length + 1).fill(0).map(() => Array(afterLines.length + 1).fill(0));
    for (let i = 1; i <= beforeLines.length; i++) {
      for (let j = 1; j <= afterLines.length; j++) {
        if (beforeLines[i - 1] === afterLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    const diff = [];
    let i = beforeLines.length;
    let j = afterLines.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
        diff.unshift({ type: 'normal', text: beforeLines[i - 1], oldLine: i, newLine: j });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ type: 'add', text: afterLines[j - 1], oldLine: null, newLine: j });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        diff.unshift({ type: 'delete', text: beforeLines[i - 1], oldLine: i, newLine: null });
        i--;
      }
    }
    
    const container = document.createElement('div');
    container.style.cssText = `
      font-family: Consolas, Monaco, monospace;
      font-size: 11px;
      line-height: 1.4;
      background: #111216;
      color: #cbd5e1;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      overflow: auto;
      flex: 1;
      box-sizing: border-box;
      text-align: left;
    `;
    
    if (diff.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 20px; color: #64748b; text-align: center; font-style: italic;';
      empty.textContent = 'No changes detected.';
      container.appendChild(empty);
      return container;
    }
    
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse;';
    
    diff.forEach((line) => {
      const tr = document.createElement('tr');
      let bg = '';
      let indicator = ' ';
      let color = '';
      
      if (line.type === 'add') {
        bg = 'rgba(16, 185, 129, 0.12)';
        color = '#10b981';
        indicator = '+';
      } else if (line.type === 'delete') {
        bg = 'rgba(239, 68, 68, 0.12)';
        color = '#ef4444';
        indicator = '-';
      }
      
      tr.style.background = bg;
      
      const tdOld = document.createElement('td');
      tdOld.style.cssText = 'width: 30px; text-align: right; padding: 0 6px; color: #475569; border-right: 1px solid rgba(255,255,255,0.05); user-select: none; font-size: 10px;';
      tdOld.textContent = line.oldLine !== null ? line.oldLine : '';
      
      const tdNew = document.createElement('td');
      tdNew.style.cssText = 'width: 30px; text-align: right; padding: 0 6px; color: #475569; border-right: 1px solid rgba(255,255,255,0.05); user-select: none; font-size: 10px;';
      tdNew.textContent = line.newLine !== null ? line.newLine : '';
      
      const tdInd = document.createElement('td');
      tdInd.style.cssText = 'width: 15px; text-align: center; font-weight: bold; user-select: none; font-size: 11px;';
      tdInd.style.color = color;
      tdInd.textContent = indicator;
      
      const tdText = document.createElement('td');
      tdText.style.cssText = 'padding: 0 6px; white-space: pre-wrap; word-break: break-all; text-align: left;';
      tdText.textContent = line.text;
      if (color) tdText.style.color = color;
      
      tr.appendChild(tdOld);
      tr.appendChild(tdNew);
      tr.appendChild(tdInd);
      tr.appendChild(tdText);
      table.appendChild(tr);
    });
    
    container.appendChild(table);
    return container;
  }

  async _buildContent(patches) {
    applyCss(`
      .patch-dashboard-layout { display: flex; gap: 16px; width: 100%; height: 100%; box-sizing: border-box; font-family: system-ui, sans-serif; }
      .patch-left-panel { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-right: 4px; border-right: 1px solid rgba(255,255,255,0.08); }
      .patch-right-panel { flex: 1.3; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-left: 4px; }
      .patch-file-card { padding: 10px 12px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center; transition: all 0.15s ease; }
      .patch-file-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); }
      .patch-file-card.selected { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 0 10px rgba(16, 185, 129, 0.08); }
      .patch-badge { font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
      .patch-badge.whole { background: #10b981; color: #fff; }
      .patch-badge.method { background: #3b82f6; color: #fff; }
      .patch-file-name { font-size: 11px; font-family: monospace; color: #f1f5f9; word-break: break-all; text-align: left; }
      
      .patch-detail-section { display: flex; flex-direction: column; gap: 8px; }
      .patch-detail-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .patch-detail-title { font-size: 11px; font-family: monospace; color: #38bdf8; word-break: break-all; text-align: left; }
      .patch-detail-list { display: flex; flex-direction: column; gap: 4px; max-height: 140px; overflow-y: auto; padding: 4px; background: rgba(0,0,0,0.15); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); }
      .patch-detail-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 4px; cursor: pointer; transition: background 0.12s; font-size: 11px; }
      .patch-detail-item:hover { background: rgba(255,255,255,0.05); }
      .patch-detail-item.active { background: rgba(16, 185, 129, 0.15); color: #fff; }
    `, 'patch-dashboard-styles');

    const layout = document.createElement('div');
    layout.className = 'patch-dashboard-layout';

    const left = document.createElement('div');
    left.className = 'patch-left-panel';
    layout.appendChild(left);

    const right = document.createElement('div');
    right.className = 'patch-right-panel';
    layout.appendChild(right);

    if (!patches || patches.length === 0) {
      left.innerHTML = '<div style="padding:20px; color:#64748b; text-align:center; font-style:italic; font-size:12px;">No active patches.</div>';
      right.innerHTML = '<div style="flex:1; display:flex; justify-content:center; align-items:center; color:#64748b; font-style:italic; font-size:12px;">No details available.</div>';
      return layout;
    }

    const grouped = {};
    patches.forEach(p => {
      if (!grouped[p.filePath]) grouped[p.filePath] = [];
      grouped[p.filePath].push(p);
    });

    const filePaths = Object.keys(grouped).sort();
    if (this.selectedFilePath === null && filePaths.length > 0) {
      this.selectedFilePath = filePaths[0];
    }

    filePaths.forEach(path => {
      const card = document.createElement('div');
      card.className = 'patch-file-card' + (this.selectedFilePath === path ? ' selected' : '');
      
      const name = document.createElement('div');
      name.className = 'patch-file-name';
      name.textContent = path.split('/').pop() || path;
      
      const filePatches = grouped[path];
      const hasWholeFile = filePatches.some(p => !p.methodName);
      
      const badge = document.createElement('span');
      badge.className = 'patch-badge ' + (hasWholeFile ? 'whole' : 'method');
      badge.textContent = hasWholeFile ? 'File' : `Methods: ${filePatches.length}`;
      
      card.appendChild(name);
      card.appendChild(badge);
      
      card.onclick = () => {
        this.selectedFilePath = path;
        this.selectedPatchKey = null; 
        this._updateRightPanel(grouped[path]);
        Array.from(left.children).forEach(child => child.classList.remove('selected'));
        card.classList.add('selected');
      };
      
      left.appendChild(card);
    });

    if (this.selectedFilePath) {
      await this._updateRightPanel(grouped[this.selectedFilePath], right);
    }

    return layout;
  }

  async _updateRightPanel(filePatches, panel = this.dialog?.element?.querySelector('.patch-right-panel')) {
    if (!panel) return;
    panel.innerHTML = '';

    if (!filePatches || filePatches.length === 0) return;
    const filePath = filePatches[0].filePath;

    const header = document.createElement('div');
    header.className = 'patch-detail-header';
    
    const title = document.createElement('div');
    title.className = 'patch-detail-title';
    title.textContent = filePath;
    header.appendChild(title);

    const actionBtn = document.createElement('button');
    actionBtn.className = 'patch-btn danger';
    actionBtn.style.cssText = 'padding: 4px 8px; font-size: 11px; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; cursor: pointer;';
    actionBtn.textContent = 'Revert File Patches';
    actionBtn.onclick = async () => {
      if (confirm(`Are you sure you want to revert all patches for ${filePath}?`)) {
        await this.app.patchManager?.revertFilePatch(filePath);
        this.selectedFilePath = null;
        this.selectedPatchKey = null;
        this.dialog?.close();
        this.show();
      }
    };
    header.appendChild(actionBtn);
    panel.appendChild(header);

    const listTitle = document.createElement('div');
    listTitle.style.cssText = 'font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; text-align: left;';
    listTitle.textContent = 'Surgical Patches';
    panel.appendChild(listTitle);

    const list = document.createElement('div');
    list.className = 'patch-detail-list';

    let activePatch = null;

    filePatches.forEach(p => {
      const key = p.methodName ? `method::${p.methodName}` : 'file';
      if (this.selectedPatchKey === null) {
        this.selectedPatchKey = key;
      }
      if (this.selectedPatchKey === key) {
        activePatch = p;
      }

      const item = document.createElement('div');
      item.className = 'patch-detail-item' + (this.selectedPatchKey === key ? ' active' : '');
      item.textContent = p.methodName ? `${p.className || ''}::${p.methodName}()` : 'Whole File Patch';
      
      item.onclick = () => {
        this.selectedPatchKey = key;
        this._updateRightPanel(filePatches, panel);
      };

      list.appendChild(item);
    });
    panel.appendChild(list);

    const diffTitle = document.createElement('div');
    diffTitle.style.cssText = 'font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; text-align: left;';
    diffTitle.textContent = 'Interactive Patch Diff (Original vs. Patched)';
    panel.appendChild(diffTitle);

    if (activePatch) {
      const baseContent = await this.app.vfs._fetchStaticFile(filePath, { nullOnMissing: true });
      
      let beforeText = '';
      let afterText = '';

      if (activePatch.methodName) {
        if (baseContent && this.app.codeParser) {
          beforeText = this.app.codeParser.extractFullMethodSource(baseContent, activePatch.methodName) || '';
        }
        afterText = activePatch.source || '';
      } else {
        beforeText = baseContent || '';
        afterText = activePatch.source || '';
      }

      const diffContainer = this.renderUnifiedDiff(beforeText, afterText);
      panel.appendChild(diffContainer);
    }
  }
}