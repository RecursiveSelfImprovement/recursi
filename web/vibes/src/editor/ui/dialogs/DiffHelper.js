class DiffHelper {
    
    // Core line difference calculator
    static computeLineDiff(oldStr, newStr) {
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

    // Shared diff DOM tree generator
    static renderUnifiedDiff(beforeText, afterText) {
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
        empty.textContent = 'No changes or empty content.';
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
  
  // NEW SHARED COMPONENT: Generates the green/red stats pills consistently
    static createStatsPills(removed, added) {
      const statsSpan = document.createElement('span');
      statsSpan.style.cssText = 'display: inline-flex; gap: 4px;';
      if (added > 0) {
        const addPill = document.createElement('span');
        addPill.className = 'review-stats-pill add';
        addPill.textContent = `+${added}`;
        addPill.style.cssText = 'font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; background: rgba(16, 185, 129, 0.15); color: #34d399; margin-left: 6px; display: inline-block;';
        statsSpan.appendChild(addPill);
      }
      if (removed > 0) {
        const remPill = document.createElement('span');
        remPill.className = 'review-stats-pill rem';
        remPill.textContent = `-${removed}`;
        remPill.style.cssText = 'font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; background: rgba(239, 68, 68, 0.15); color: #f87171; margin-left: 6px; display: inline-block;';
        statsSpan.appendChild(remPill);
      }
      return statsSpan;
    }

  // NEW SHARED COMPONENT: Generates a fully styled interactive item row
    static renderRow(options = {}) {
      const { labelText, removed, added, isActive, onClick, onRemove } = options;

      const row = document.createElement('div');
      row.className = 'review-card-item' + (isActive ? ' active' : '');
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 6px;
        font-size: 11px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.12s;
        background: ${isActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent'};
        color: ${isActive ? '#fff' : 'inherit'};
      `;

      row.addEventListener('mouseenter', () => {
        if (!row.classList.contains('active')) {
          row.style.background = 'rgba(255, 255, 255, 0.06)';
        }
      });
      row.addEventListener('mouseleave', () => {
        if (!row.classList.contains('active')) {
          row.style.background = 'transparent';
        }
      });

      row.addEventListener('click', (e) => {
        if (onRemove && e.target.closest('.review-item-remove-btn')) return;
        onClick(e);
      });

      const textNode = document.createElement('span');
      textNode.textContent = labelText;
      textNode.style.fontFamily = labelText.startsWith('.') ? 'monospace' : 'inherit';
      row.appendChild(textNode);

      const rightArea = document.createElement('div');
      rightArea.style.cssText = 'display: flex; alignItems: center; gap: 4px;';

      const pills = DiffHelper.createStatsPills(removed, added);
      rightArea.appendChild(pills);

      if (onRemove) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'review-item-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.style.cssText = 'background: none; border: none; color: #ef5350; cursor: pointer; padding: 0 4px; font-size: 11px; opacity: 0.6; transition: opacity 0.15s; margin-left: 6px;';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onRemove();
        });
        rightArea.appendChild(removeBtn);
      }

      row.appendChild(rightArea);
      return row;
    }
}