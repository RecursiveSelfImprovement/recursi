class SvgHelperStyles {
  static getAll() {
    return [
      SvgHelperStyles.fonts(),
      SvgHelperStyles.variables(),
      SvgHelperStyles.reset(),
      SvgHelperStyles.scrollbars(),
      SvgHelperStyles.app(),
      SvgHelperStyles.topbar(),
      SvgHelperStyles.buttons(),
      SvgHelperStyles.panels(),
      SvgHelperStyles.elementTree(),
      SvgHelperStyles.canvas(),
      SvgHelperStyles.checkerboard(),
      SvgHelperStyles.viewBoxOutline(),
      SvgHelperStyles.infoBar(),
      SvgHelperStyles.sections(),
      SvgHelperStyles.fields(),
      SvgHelperStyles.codeArea(),
      SvgHelperStyles.dropzone(),
      SvgHelperStyles.mergeDialog(),
      SvgHelperStyles.toast(),
      SvgHelperStyles.emptyState(),
      SvgHelperStyles.tagBadges(),
      SvgHelperStyles.statPill(),
      SvgHelperStyles.filterInput(),
    ].join('\n');
  }

  static fonts() {
    return `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');`;
  }

  static variables() {
    return `
:root {
  --bg-deep: #0c0e14;
  --bg-surface: #141620;
  --bg-panel: #1a1d2e;
  --bg-input: #10121c;
  --bg-hover: rgba(255,255,255,0.04);
  --bg-active: rgba(99,179,237,0.08);
  --border-subtle: rgba(255,255,255,0.06);
  --border-medium: rgba(255,255,255,0.1);
  --border-bright: rgba(99,179,237,0.3);
  --text-primary: #e2e8f0;
  --text-secondary: #8892a8;
  --text-muted: #4a5568;
  --text-bright: #f7fafc;
  --accent-blue: #63b3ed;
  --accent-cyan: #4fd1c5;
  --accent-violet: #9f7aea;
  --accent-rose: #fc8181;
  --accent-amber: #f6ad55;
  --accent-green: #68d391;
  --glow-blue: rgba(99,179,237,0.15);
  --glow-cyan: rgba(79,209,197,0.12);
  --glow-violet: rgba(159,122,234,0.12);
  --font-ui: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-soft: 0 2px 8px rgba(0,0,0,0.3);
  --shadow-medium: 0 4px 20px rgba(0,0,0,0.4);
  --shadow-glow: 0 0 20px rgba(99,179,237,0.1);
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
}`;
  }

  static reset() {
    return `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  height: 100%; width: 100%;
  overflow: hidden;
  background: var(--bg-deep);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}`;
  }

  static scrollbars() {
    return `
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }`;
  }

  static app() {
    return `
.svgh-app {
  display: flex; flex-direction: column;
  height: 100vh; width: 100vw;
  background: var(--bg-deep);
}
.svgh-body {
  display: flex; flex: 1;
  overflow: hidden;
}`;
  }

  static topbar() {
    return `
.svgh-topbar {
  display: flex; align-items: center; justify-content: space-between;
  height: 44px; min-height: 44px;
  padding: 0 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 100;
  gap: 12px;
}
.svgh-topbar-logo {
  display: flex; align-items: center; gap: 8px;
  font-weight: 700; font-size: 14px;
  color: var(--accent-cyan);
  letter-spacing: -0.3px;
  white-space: nowrap;
  user-select: none;
}
.svgh-topbar-logo svg { width: 20px; height: 20px; }
.svgh-topbar-actions {
  display: flex; align-items: center; gap: 6px;
}`;
  }

  static buttons() {
    return `
.svgh-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; height: 30px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: var(--font-ui);
  font-size: 12px; font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.svgh-btn:hover {
  background: rgba(255,255,255,0.08);
  color: var(--text-primary);
  border-color: var(--border-medium);
}
.svgh-btn:active { transform: scale(0.98); }
.svgh-btn-primary {
  background: rgba(99,179,237,0.12);
  border-color: rgba(99,179,237,0.25);
  color: var(--accent-blue);
}
.svgh-btn-primary:hover {
  background: rgba(99,179,237,0.2);
  border-color: rgba(99,179,237,0.4);
}
.svgh-btn-accent {
  background: rgba(79,209,197,0.12);
  border-color: rgba(79,209,197,0.25);
  color: var(--accent-cyan);
}
.svgh-btn-accent:hover {
  background: rgba(79,209,197,0.2);
  border-color: rgba(79,209,197,0.4);
}
.svgh-btn-danger {
  background: rgba(252,129,129,0.08);
  border-color: rgba(252,129,129,0.2);
  color: var(--accent-rose);
}
.svgh-btn-danger:hover {
  background: rgba(252,129,129,0.15);
  border-color: rgba(252,129,129,0.35);
}
.svgh-btn-icon {
  padding: 5px 7px; min-width: 30px;
  justify-content: center;
}
.svgh-btn svg { width: 14px; height: 14px; flex-shrink: 0; }`;
  }

  static panels() {
    return `
.svgh-left-panel {
  display: flex; flex-direction: column;
  width: 280px; min-width: 220px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  overflow: hidden;
}
.svgh-panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle);
  user-select: none;
}
.svgh-right-panel {
  display: flex; flex-direction: column;
  width: 320px; min-width: 260px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-subtle);
  overflow: hidden;
}
.svgh-right-panel-scroll {
  flex: 1; overflow-y: auto;
  padding: 12px;
}`;
  }

  static elementTree() {
    return `
.svgh-element-tree {
  flex: 1; overflow-y: auto;
  padding: 6px;
}
.svgh-tree-item {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 12px; font-family: var(--font-mono);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
}
.svgh-tree-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.svgh-tree-item.active { background: var(--bg-active); color: var(--accent-blue); }
.svgh-tree-item .id-attr { color: var(--accent-amber); font-size: 11px; }
.svgh-tree-item .class-attr { color: var(--accent-green); font-size: 11px; }
.svgh-tree-indent { width: 14px; flex-shrink: 0; }
.svgh-tree-toggle {
  width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); cursor: pointer; flex-shrink: 0;
}
.svgh-tree-toggle:hover { color: var(--text-primary); }
.svgh-tree-toggle svg { width: 10px; height: 10px; transition: transform var(--transition-fast); }
.svgh-tree-toggle.collapsed svg { transform: rotate(-90deg); }`;
  }

  static canvas() {
    return `
.svgh-canvas-area {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; position: relative;
}
.svgh-canvas-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  min-height: 36px;
  flex-wrap: wrap;
}
.svgh-canvas-toolbar .separator {
  width: 1px; height: 18px;
  background: var(--border-subtle);
  margin: 0 4px;
}
.svgh-canvas-viewport {
  flex: 1; position: relative;
  overflow: hidden;
  cursor: grab;
}
.svgh-canvas-viewport.panning { cursor: grabbing; }
.svgh-svg-container {
  position: absolute;
  transform-origin: 0 0;
  transition: none;
}`;
  }

  static checkerboard() {
    return `
.svgh-checker-bg {
  position: absolute; inset: 0;
  background-size: 20px 20px;
  background-image:
    linear-gradient(45deg, #2a2d42 25%, transparent 25%),
    linear-gradient(-45deg, #2a2d42 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2a2d42 75%),
    linear-gradient(-45deg, transparent 75%, #2a2d42 75%);
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  opacity: 0.6;
  pointer-events: none;
}`;
  }

  static viewBoxOutline() {
    return `
.svgh-viewbox-outline {
  position: absolute;
  border: 2px dashed rgba(99,179,237,0.5);
  pointer-events: none;
  z-index: 5;
  border-radius: 1px;
}
.svgh-viewbox-outline.hidden { display: none; }
.svgh-viewbox-label {
  position: absolute;
  top: -20px; left: 0;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--accent-blue);
  opacity: 0.7;
  white-space: nowrap;
}`;
  }

  static infoBar() {
    return `
.svgh-canvas-infobar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 12px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  font-size: 11px; font-family: var(--font-mono);
  color: var(--text-muted);
  min-height: 26px;
}
.svgh-infobar-group { display: flex; align-items: center; gap: 12px; }
.svgh-infobar-item { display: flex; align-items: center; gap: 4px; }
.svgh-infobar-label { color: var(--text-muted); }
.svgh-infobar-value { color: var(--text-secondary); }`;
  }

  static sections() {
    return `
.svgh-section {
  margin-bottom: 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.svgh-section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
}
.svgh-section-header:hover { color: var(--text-secondary); }
.svgh-section-header svg { width: 10px; height: 10px; transition: transform var(--transition-fast); }
.svgh-section-header.collapsed svg { transform: rotate(-90deg); }
.svgh-section-body { padding: 10px 12px; }
.svgh-section-body.collapsed { display: none; }`;
  }

  static fields() {
    return `
.svgh-field {
  display: flex; flex-direction: column; gap: 4px;
  margin-bottom: 10px;
}
.svgh-field:last-child { margin-bottom: 0; }
.svgh-field-label {
  font-size: 11px; font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.svgh-field-row { display: flex; gap: 6px; align-items: center; }
.svgh-input {
  width: 100%; padding: 5px 8px; height: 28px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
  transition: border-color var(--transition-fast);
}
.svgh-input:focus { border-color: var(--accent-blue); }
.svgh-input::placeholder { color: var(--text-muted); }
.svgh-input-sm { width: 70px; text-align: center; }
.svgh-select {
  width: 100%; padding: 5px 8px; height: 28px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
  cursor: pointer;
}
.svgh-checkbox-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 0;
  cursor: pointer;
  user-select: none;
}
.svgh-checkbox-row input { accent-color: var(--accent-blue); cursor: pointer; }
.svgh-checkbox-row label { font-size: 12px; color: var(--text-secondary); cursor: pointer; }`;
  }

  static codeArea() {
    return `
.svgh-code-area {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  background: var(--bg-deep);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--accent-cyan);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  tab-size: 2;
}
.svgh-code-area:focus { border-color: var(--accent-blue); }`;
  }

  static dropzone() {
    return `
.svgh-dropzone-overlay {
  position: fixed; inset: 0;
  background: rgba(12,14,20,0.85);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  opacity: 0; pointer-events: none;
  transition: opacity var(--transition-normal);
  backdrop-filter: blur(8px);
}
.svgh-dropzone-overlay.active { opacity: 1; pointer-events: all; }
.svgh-dropzone-box {
  width: 400px; height: 260px;
  border: 2px dashed var(--accent-cyan);
  border-radius: var(--radius-lg);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px;
  background: rgba(79,209,197,0.04);
  box-shadow: 0 0 60px rgba(79,209,197,0.1);
  transition: all var(--transition-normal);
}
.svgh-dropzone-box svg { width: 48px; height: 48px; color: var(--accent-cyan); opacity: 0.6; }
.svgh-dropzone-box span {
  font-size: 16px; font-weight: 600;
  color: var(--accent-cyan); opacity: 0.8;
}`;
  }

  static mergeDialog() {
    return `
.svgh-merge-dialog {
  background: var(--bg-panel);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 360px;
  box-shadow: var(--shadow-medium);
}
.svgh-merge-dialog h3 {
  font-size: 15px; font-weight: 600;
  color: var(--text-bright);
  margin-bottom: 12px;
}
.svgh-merge-dialog p {
  font-size: 13px; color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.6;
}
.svgh-merge-dialog-buttons {
  display: flex; gap: 8px; justify-content: flex-end;
}`;
  }

  static toast() {
    return `
.svgh-toast {
  position: fixed;
  bottom: 40px; left: 50%;
  transform: translateX(-50%) translateY(20px);
  padding: 8px 18px;
  background: var(--bg-panel);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--text-primary);
  box-shadow: var(--shadow-medium);
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 10000;
  pointer-events: none;
}
.svgh-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.svgh-toast.success { border-color: rgba(104,211,145,0.4); color: var(--accent-green); }
.svgh-toast.error { border-color: rgba(252,129,129,0.4); color: var(--accent-rose); }`;
  }

  static emptyState() {
    return `
.svgh-empty-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 100%; gap: 16px;
  color: var(--text-muted);
  user-select: none;
}
.svgh-empty-state svg { width: 64px; height: 64px; opacity: 0.2; }
.svgh-empty-state .title { font-size: 18px; font-weight: 600; color: var(--text-secondary); opacity: 0.5; }
.svgh-empty-state .subtitle { font-size: 13px; opacity: 0.5; }`;
  }

  static tagBadges() {
    return `
.svgh-tag-badge {
  display: inline-flex; align-items: center;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px; font-family: var(--font-mono);
  font-weight: 500;
}
.svgh-tag-badge.path { background: rgba(159,122,234,0.12); color: var(--accent-violet); }
.svgh-tag-badge.rect { background: rgba(99,179,237,0.12); color: var(--accent-blue); }
.svgh-tag-badge.circle { background: rgba(79,209,197,0.12); color: var(--accent-cyan); }
.svgh-tag-badge.ellipse { background: rgba(246,173,85,0.12); color: var(--accent-amber); }
.svgh-tag-badge.line { background: rgba(252,129,129,0.12); color: var(--accent-rose); }
.svgh-tag-badge.g { background: rgba(104,211,145,0.12); color: var(--accent-green); }
.svgh-tag-badge.text { background: rgba(255,255,255,0.06); color: var(--text-secondary); }
.svgh-tag-badge.default { background: rgba(255,255,255,0.04); color: var(--text-muted); }`;
  }

  static statPill() {
    return `
.svgh-stat-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  font-size: 11px;
  color: var(--text-secondary);
}
.svgh-stat-pill .num { color: var(--accent-blue); font-family: var(--font-mono); font-weight: 600; }`;
  }

  static filterInput() {
    return `
.svgh-filter-input {
  width: 100%; padding: 5px 8px;
  height: 26px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 11px;
  font-family: var(--font-mono);
  outline: none;
  margin-bottom: 6px;
}
.svgh-filter-input:focus { border-color: var(--accent-blue); }
.svgh-filter-input::placeholder { color: var(--text-muted); }`;
  }
}

