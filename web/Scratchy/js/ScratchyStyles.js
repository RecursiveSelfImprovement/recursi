
class ScratchyStyles {
  constructor() {
    this.currentTheme = 'default';
  }

  getDefaultTheme() {
    return {
      '--bg-app': '#f0ece3',
      '--text-main': '#3d3929',
      '--bg-header':
        'linear-gradient(135deg, #fefae0 0%, #e9edc9 50%, #d4e09b 100%)',
      '--border-header': '#c4b99a',
      '--bg-sidebar': '#e8ddc4',
      '--border-sidebar': '#c4b68f',
      '--bg-content': '#eae5d8',
      '--text-muted': '#7a6e5e',
      '--bg-tab-active': '#eae5d8',
      '--color-tab-active': '#5f6b2d',
      '--bg-tab-inactive': 'rgba(255,255,255,0.4)',
      '--border-tab': '#c4b99a',
      '--color-tab-inactive': '#7c7560',
      '--btn-open-bg': '#ccd5ae',
      '--btn-open-text': '#3d3929',
      '--btn-prompt-bg': '#d8b4fe',
      '--btn-prompt-text': '#3b1e5f',
      '--btn-paste-bg': '#b5e48c',
      '--btn-paste-text': '#2b5f1e',
      '--btn-save-bg': '#ffd6a5',
      '--btn-save-text': '#5f3a1e',
      '--btn-viewer-bg': '#ffb5a7',
      '--btn-viewer-text': '#5f1e1e',
      '--bg-dropzone': 'rgba(255,255,255,0.4)',
      '--border-dropzone': '#c4b99a',
      '--text-dropzone-inner': '#8a7f6b',
      '--text-dropzone-sub': '#a19a88',
      '--bg-json-banner': 'linear-gradient(135deg, #f7f4ec 0%, #ede8da 100%)',
      '--bg-json-left': 'linear-gradient(180deg, #ddd5c4 0%, #c9c0ac 100%)',
      '--border-json': '#c4b99a',
      '--border-json-left': '#b8af9a',
      '--text-json-label': '#5f5640',
      '--text-json-stat': '#6b6350',
      '--bg-json-btn': '#f5f0e6',
      '--bg-json-btn-hover': '#e9e1cf',
      '--border-json-btn': '#a89e88',
      '--bg-asset-card': '#f5f0e6',
      '--bg-asset-thumb': '#ece8dd',
      '--bg-asset-checker': '#d8d3c8',
      '--text-asset-name': '#5f5640',
      '--border-asset': '#d5cfc0',
      '--bg-asset-overlay': 'rgba(40, 36, 28, 0.7)',
      '--color-section-header': '#5f6b2d',
      '--border-section': '#d5cfc0',
      '--logo-filter': 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
      '--mascot-filter': 'none',
      '--btn-hover-transform': 'scale(1.05) translateY(-2px)',
      '--logo-hover-transform': 'scale(1.08) rotate(-2deg)',
      '--callout-open-border': '#739e23',
      '--callout-open-bg': '#f4f7e9',
      '--callout-prompt-border': '#8e3de8',
      '--callout-prompt-bg': '#f7f1fe',
      '--callout-paste-border': '#59ab1a',
      '--callout-paste-bg': '#f2faeb',
      '--callout-save-border': '#e08412',
      '--callout-save-bg': '#fff5eb',
      '--callout-viewer-border': '#e34f3b',
      '--callout-viewer-bg': '#ffefec',
      '--font-main':
        "'Architects Daughter', cursive, 'Segoe UI', system-ui, sans-serif",
    };
  }

  getBoringTheme() {
    return {
      '--bg-app': '#f0f0f0',
      '--text-main': '#333333',
      '--bg-header': '#ffffff',
      '--border-header': '#cccccc',
      '--bg-sidebar': '#e0e0e0',
      '--border-sidebar': '#cccccc',
      '--bg-content': '#f8f8f8',
      '--text-muted': '#666666',
      '--bg-tab-active': '#f8f8f8',
      '--color-tab-active': '#333333',
      '--bg-tab-inactive': '#e0e0e0',
      '--border-tab': '#cccccc',
      '--color-tab-inactive': '#666666',
      '--btn-open-bg': '#e0e0e0',
      '--btn-open-text': '#333333',
      '--btn-prompt-bg': '#e0e0e0',
      '--btn-prompt-text': '#333333',
      '--btn-paste-bg': '#e0e0e0',
      '--btn-paste-text': '#333333',
      '--btn-save-bg': '#e0e0e0',
      '--btn-save-text': '#333333',
      '--btn-viewer-bg': '#e0e0e0',
      '--btn-viewer-text': '#333333',
      '--bg-dropzone': '#ffffff',
      '--border-dropzone': '#cccccc',
      '--text-dropzone-inner': '#333333',
      '--text-dropzone-sub': '#666666',
      '--bg-json-banner': '#ffffff',
      '--bg-json-left': '#f0f0f0',
      '--border-json': '#cccccc',
      '--border-json-left': '#cccccc',
      '--text-json-label': '#333333',
      '--text-json-stat': '#666666',
      '--bg-json-btn': '#e0e0e0',
      '--bg-json-btn-hover': '#cccccc',
      '--border-json-btn': '#999999',
      '--bg-asset-card': '#ffffff',
      '--bg-asset-thumb': '#f0f0f0',
      '--bg-asset-checker': '#e0e0e0',
      '--text-asset-name': '#333333',
      '--border-asset': '#cccccc',
      '--bg-asset-overlay': 'rgba(255, 255, 255, 0.9)',
      '--color-section-header': '#333333',
      '--border-section': '#cccccc',
      '--logo-filter': 'grayscale(100%) opacity(0.7)',
      '--mascot-filter': 'grayscale(100%) opacity(0.7)',
      '--btn-hover-transform': 'scale(1.01) translateY(-1px)',
      '--logo-hover-transform': 'scale(1.02)',
      '--callout-open-border': '#999999',
      '--callout-open-bg': '#f8f8f8',
      '--callout-prompt-border': '#999999',
      '--callout-prompt-bg': '#f8f8f8',
      '--callout-paste-border': '#999999',
      '--callout-paste-bg': '#f8f8f8',
      '--callout-save-border': '#999999',
      '--callout-save-bg': '#f8f8f8',
      '--callout-viewer-border': '#999999',
      '--callout-viewer-bg': '#f8f8f8',
      '--font-main': 'Arial, Helvetica, sans-serif',
    };
  }

  getWeirdTheme() {
    return {
      '--bg-app': '#220022',
      '--text-main': '#00ffcc',
      '--bg-header': 'linear-gradient(45deg, #000000, #440044)',
      '--border-header': '#00ffcc',
      '--bg-sidebar': '#110011',
      '--border-sidebar': '#00ffcc',
      '--bg-content': '#220022',
      '--text-muted': '#ff00aa',
      '--bg-tab-active': '#220022',
      '--color-tab-active': '#00ffcc',
      '--bg-tab-inactive': '#000000',
      '--border-tab': '#ff00aa',
      '--color-tab-inactive': '#880088',
      '--btn-open-bg': '#440044',
      '--btn-open-text': '#00ffcc',
      '--btn-prompt-bg': '#440044',
      '--btn-prompt-text': '#00ffcc',
      '--btn-paste-bg': '#440044',
      '--btn-paste-text': '#00ffcc',
      '--btn-save-bg': '#440044',
      '--btn-save-text': '#00ffcc',
      '--btn-viewer-bg': '#440044',
      '--btn-viewer-text': '#00ffcc',
      '--bg-dropzone': '#110011',
      '--border-dropzone': '#00ffcc',
      '--text-dropzone-inner': '#ff00aa',
      '--text-dropzone-sub': '#00ffcc',
      '--bg-json-banner': 'linear-gradient(180deg, #110011, #330033)',
      '--bg-json-left': 'linear-gradient(180deg, #330033, #110011)',
      '--border-json': '#00ffcc',
      '--border-json-left': '#00ffcc',
      '--text-json-label': '#ff00aa',
      '--text-json-stat': '#00ffcc',
      '--bg-json-btn': '#440044',
      '--bg-json-btn-hover': '#660066',
      '--border-json-btn': '#00ffcc',
      '--bg-asset-card': '#110011',
      '--bg-asset-thumb': '#220022',
      '--bg-asset-checker': '#440044',
      '--text-asset-name': '#00ffcc',
      '--border-asset': '#ff00aa',
      '--bg-asset-overlay': 'rgba(0, 255, 204, 0.4)',
      '--color-section-header': '#ff00aa',
      '--border-section': '#00ffcc',
      '--logo-filter': 'invert(1) sepia(100%) saturate(5) hue-rotate(100deg)',
      '--mascot-filter': 'sepia(100%) saturate(10) hue-rotate(250deg)',
      '--btn-hover-transform': 'scale(1.1) translateY(-3px) rotate(1deg)',
      '--logo-hover-transform': 'scale(1.15) rotate(5deg) skewX(5deg)',
      '--callout-open-border': '#00ffcc',
      '--callout-open-bg': '#002211',
      '--callout-prompt-border': '#ff00aa',
      '--callout-prompt-bg': '#220011',
      '--callout-paste-border': '#ffff00',
      '--callout-paste-bg': '#222200',
      '--callout-save-border': '#ff6600',
      '--callout-save-bg': '#221100',
      '--callout-viewer-border': '#00ccff',
      '--callout-viewer-bg': '#001122',
      '--font-main': "'Courier New', Courier, monospace",
    };
  }

  applyTheme(themeName) {
    this.currentTheme = themeName || 'default';
    const theme = this.getTheme(this.currentTheme);
    let rootVars = ':root {\n';
    for (const [k, v] of Object.entries(theme)) {
      rootVars += `  ${k}: ${v};\n`;
    }
    rootVars += '}\n';
    applyCss(rootVars, 'scratchy-theme-vars');
  }

  injectFontLink() {
    const fontLink = document.createElement('link');
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }

  injectAppShellStyles() {
    applyCss(
      `
.scratchy-app {
  display: flex; flex-direction: column; height: 100vh;
  background: var(--bg-app); color: var(--text-main);
  font-family: var(--font-main);
  font-size: 16px;
  overflow-x: hidden;
}

.scratchy-header-bar {
  display: flex; align-items: stretch; gap: 16px;
  background: var(--bg-header);
  border-bottom: 2px solid var(--border-header);
  padding: 12px 20px 0 20px; 
  flex-shrink: 0; position: relative; z-index: 10;
  overflow: visible; 
}

.scratchy-header-left { 
  flex-shrink: 0; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  width: 200px; 
  padding-bottom: 8px;
}

.scratchy-header-center { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 4px; min-width: 0; }
.scratchy-header-right { flex-shrink: 0; display: flex; align-items: flex-end; justify-content: flex-end; width: 160px; position: relative; }

.scratchy-logo-img { 
  width: 100%; 
  height: auto; 
  object-fit: contain; 
  filter: var(--logo-filter);
  margin-bottom: 4px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.scratchy-header-left:hover .scratchy-logo-img {
  transform: var(--logo-hover-transform, scale(1.08) rotate(-2deg));
}

.scratchy-logo-subtitle {
  font-size: 18px;
  color: var(--text-muted);
  font-weight: 700;
  text-align: center;
  line-height: 1.2;
  opacity: 0.95;
}

.scratchy-settings-gear {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: none;
  border: 1px solid var(--border-tab);
  border-radius: 50%;
  width: 24px; height: 24px;
  cursor: pointer;
  font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted);
  transition: all 0.2s;
  opacity: 0.5;
  z-index: 20;
}
.scratchy-settings-gear:hover {
  background: var(--bg-tab-inactive);
  opacity: 1;
  transform: rotate(30deg);
}
`,
      'scratchy-shell-styles'
    );
  }

  injectMascotStyles() {
    applyCss(
      `
.scratchy-mascot-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: max-content;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 50;
}

.scratchy-mascot-img {
  width: 185px; 
  height: auto;
  cursor: pointer;
  display: block;
  filter: var(--mascot-filter);
}

.scratchy-mascot-img.sleeping { 
  width: 220px; 
}

/* 
   Link Wrapper: 
   top: 100% ensures it starts exactly at the bottom edge of the image.
   This guarantees it never overlaps the dog.
*/
.scratchy-mascot-link-wrapper {
  position: absolute;
  top: 100%; 
  right: 10px;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  pointer-events: none;
  margin-top: 4px; /* Tiny gap between dog feet and button */
}

.scratchy-mascot-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: var(--font-main);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 12px;
  background: var(--bg-tab-inactive);
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
  transition: all 0.2s;
  pointer-events: auto;
  cursor: pointer;
  border: 1px solid var(--color-section-header);
  line-height: 1.1;
  min-width: 90px;
  /* Ensure link stays crisp */
  backface-visibility: hidden;
}

.scratchy-mascot-link span.line1 {
  font-size: 13px;
  color: var(--color-section-header);
  font-weight: 700;
}
.scratchy-mascot-link span.line2 {
  font-size: 13px;
  color: var(--color-section-header);
  font-weight: 700;
}

.scratchy-mascot-link:hover {
  background: var(--color-section-header);
  border-color: var(--color-section-header);
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0,0,0,0.2);
}

.scratchy-mascot-link:hover span.line1,
.scratchy-mascot-link:hover span.line2 {
  color: var(--bg-app);
}
`,
      'scratchy-mascot-styles'
    );
  }

  injectButtonStyles() {
    applyCss(
      `
.scratchy-buttons-row { display: flex; align-items: flex-start; justify-content: space-around; gap: 12px; flex-wrap: wrap; margin-bottom: 5px; padding-top: 4px; }
.scratchy-btn-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 100px; }

.scratchy-action-btn {
  width: 100%; padding: 12px 16px; border: none; border-radius: 10px;
  cursor: pointer; font-size: 18px; font-weight: 700;
  transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  font-family: var(--font-main);
  display: flex; align-items: center; justify-content: center; gap: 6px;
  white-space: normal; text-align: center; flex-wrap: wrap; line-height: 1.1;
  min-height: 48px;
  position: relative;
}
.scratchy-action-btn:hover { 
  transform: var(--btn-hover-transform, scale(1.05) translateY(-2px));
  z-index: 10;
  box-shadow: 0 8px 12px rgba(0,0,0,0.15);
}
.scratchy-action-btn.open { background: var(--btn-open-bg); color: var(--btn-open-text); }
.scratchy-action-btn.buildprompt { background: var(--btn-prompt-bg); color: var(--btn-prompt-text); }
.scratchy-action-btn.paste { background: var(--btn-paste-bg); color: var(--btn-paste-text); }
.scratchy-action-btn.save { background: var(--btn-save-bg); color: var(--btn-save-text); }
.scratchy-action-btn.viewer { background: var(--btn-viewer-bg); color: var(--btn-viewer-text); }
`,
      'scratchy-button-styles'
    );
  }

  injectTabAndStatusStyles() {
    applyCss(
      `
.scratchy-header-bottom-row { display: flex; align-items: flex-end; gap: 12px; height: 38px; }
.scratchy-tabs { display: flex; gap: 6px; position: relative; bottom: -2px; z-index: 12; }
.scratchy-tab { padding: 7px 18px 7px; background: var(--bg-tab-inactive); border: 1px solid var(--border-tab); border-bottom: 1px solid var(--border-tab); color: var(--color-tab-inactive); border-radius: 8px 8px 0 0; cursor: pointer; font-size: 17px; font-weight: 700; font-family: var(--font-main); }
.scratchy-tab.active { background: var(--bg-tab-active); color: var(--color-tab-active); padding-bottom: 9px; border-bottom: 1px solid var(--bg-tab-active); z-index: 15; box-shadow: 0 -2px 3px rgba(0,0,0,0.05); }
.scratchy-status { font-size: 15px; color: var(--text-muted); font-style: italic; flex: 1; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-main); font-weight: 600; }
`,
      'scratchy-tab-status-styles'
    );
  }

  injectDropzoneStyles() {
    applyCss(
      `
.scratchy-dropzone { margin: 40px auto; padding: 60px 80px; border: 3px dashed var(--border-dropzone); border-radius: 20px; text-align: center; cursor: pointer; background: var(--bg-dropzone); }
.scratchy-dropzone-inner { font-size: 32px; color: var(--text-dropzone-inner); font-family: var(--font-main); margin-bottom: 10px; font-weight: 700; }
.scratchy-dropzone-sub { font-size: 18px; color: var(--text-dropzone-sub); font-family: var(--font-main); }
`,
      'scratchy-dropzone-styles'
    );
  }

  injectContentLayoutStyles() {
    applyCss(
      `
.scratchy-main { display: flex; flex: 1; min-height: 0; overflow: hidden; border-top: 1px solid var(--border-header); position: relative; z-index: 5; background: var(--bg-content); }
.scratchy-content { flex: 1; overflow-y: auto; padding: 20px; background: var(--bg-content); }

.scratchy-sort-bar {
  display: flex; justify-content: flex-start; align-items: center; gap: 10px;
  margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border-section);
}
.scratchy-sort-select {
  padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-tab); background: var(--bg-asset-card);
  font-family: var(--font-main); font-size: 14px; color: var(--text-main);
}

.scratchy-section { margin-bottom: 30px; }
.scratchy-section-header {
  font-size: 20px; font-weight: 700; color: var(--color-section-header);
  border-bottom: 2px solid var(--border-section); margin-bottom: 12px; padding-bottom: 4px;
  font-family: var(--font-main); display: flex; align-items: center; gap: 8px;
}
.scratchy-section-count { font-size: 14px; color: var(--text-muted); font-weight: 400; }
`,
      'scratchy-content-layout-styles'
    );
  }

  injectJsonBannerStyles() {
    applyCss(
      `
    .scratchy-json-banner {
      background: var(--bg-json-banner);
      border: 1px solid var(--border-json); border-radius: 12px;
      display: flex; align-items: stretch;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      height: var(--json-card-height, 280px);
      overflow: hidden;
    }
    .scratchy-json-col-left {
      width: var(--json-left-width, 150px);
      flex-shrink: 0;
      background: var(--bg-json-left);
      padding: 18px 12px;
      display: flex; flex-direction: column; align-items: flex-start;
      border-right: 1px solid var(--border-json-left);
      text-align: left;
      overflow-y: auto;
      line-height: 1.42;
      font-size: 13px;
    }
    .scratchy-json-col-right {
      width: var(--json-right-width, 140px); 
      flex-shrink: 0;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 9px;
      justify-content: center;
    }
    .scratchy-json-stat-label {
      font-size: 13px; font-weight: 700; color: var(--text-json-label);
      font-family: var(--font-main);
      margin-bottom: 6px;
    }
    .scratchy-json-stat {
      font-size: 12.5px; color: var(--text-json-stat);
      margin-bottom: 3px;
    }
    .scratchy-json-strip-btn {
      padding: 5px 10px; border: 1px solid var(--border-json-btn); border-radius: 6px;
      background: var(--bg-json-btn); color: var(--text-json-label); font-size: 12px; cursor: pointer;
      font-family: var(--font-main); font-weight: 600;
      transition: background 0.15s;
      width: 100%; text-align: center;
    }
    .scratchy-json-strip-btn:hover { background: var(--bg-json-btn-hover); }
    .scratchy-json-editor-host {
      flex: 1; min-width: 0;
      overflow: hidden;
      border-radius: 0 12px 12px 0;
    }
    .scratchy-json-editor-host .cm-editor {
      height: 100%;
      overflow: auto;
    }
    .scratchy-json-editor-host .cm-scroller {
      overflow: auto !important;
    }
    `,
      'scratchy-json-banner-styles'
    );
  }

  injectAssetCardStyles() {
    applyCss(
      `
.scratchy-asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--asset-grid-min, 150px), 1fr));
  gap: 14px;
}

.scratchy-asset-card {
  background: var(--bg-asset-card); border: 1px solid var(--border-asset); border-radius: var(--asset-radius, 10px);
  padding: 8px; display: flex; flex-direction: column;
  height: var(--asset-card-height, 200px); position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.scratchy-asset-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
  border-color: var(--color-section-header);
  z-index: 2;
}

.scratchy-card-thumb {
  flex: 1;
  background-image:
    linear-gradient(45deg, var(--bg-asset-checker) 25%, transparent 25%),
    linear-gradient(-45deg, var(--bg-asset-checker) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--bg-asset-checker) 75%),
    linear-gradient(-45deg, transparent 75%, var(--bg-asset-checker) 75%);
  background-size: var(--chk-size, 12px) var(--chk-size, 12px);
  background-position: 0 0, 0 var(--chk-half, 6px), var(--chk-half, 6px) var(--chk-neg-half, -6px), var(--chk-neg-half, -6px) 0;
  background-color: var(--bg-asset-thumb);
  border: 1px solid var(--border-asset); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; margin-bottom: 8px; position: relative;
}
.scratchy-card-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
.scratchy-card-type-icon { font-size: 32px; opacity: 0.6; }

.scratchy-card-details { height: 42px; display: flex; flex-direction: column; justify-content: space-between; }
.scratchy-card-name {
  font-size: 12px; font-weight: 700; color: var(--text-asset-name);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: sans-serif; cursor: default;
}
.scratchy-card-meta { font-size: 10px; color: var(--text-muted); display: flex; justify-content: space-between; font-family: sans-serif; }

.scratchy-card-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: var(--bg-asset-overlay); border-radius: 6px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  opacity: 0; transition: opacity 0.2s;
}
.scratchy-asset-card:hover .scratchy-card-overlay { opacity: 1; }

.scratchy-overlay-btn {
  padding: 6px 14px; background: var(--bg-asset-card); color: var(--text-main); font-weight: 700;
  border: none; border-radius: 20px; font-size: 12px; cursor: pointer;
  font-family: var(--font-main); box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  transition: transform 0.1s, background 0.1s;
}
.scratchy-overlay-btn:hover { background: var(--bg-json-btn-hover); transform: scale(1.05); }
`,
      'scratchy-asset-card-styles'
    );
  }

  injectMiscStyles() {
    applyCss(
      `
.scratchy-intro-layer { 
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
  z-index: 99999; 
  background: var(--bg-app); 
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: opacity 0.5s ease;
}

.scratchy-intro-element { 
  position: absolute; 
  filter: drop-shadow(0 15px 40px rgba(0,0,0,0.2)); 
  will-change: transform, opacity; 
}

.scratchy-btn {
  padding: 6px 14px; border: 1px solid var(--border-tab); border-radius: 6px;
  background: var(--bg-asset-card); color: var(--text-main); font-size: 13px; cursor: pointer;
  font-family: var(--font-main); font-weight: 600;
  transition: background 0.15s;
}
.scratchy-btn:hover { background: var(--bg-json-btn-hover); }

/* Make sure user-injected elements match the theme */
.scratchy-instructions-area { background: var(--bg-content); }

/* Theme Widget */
.scratchy-theme-widget {
  position: fixed;
  bottom: 0;
  right: 20px;
  background: var(--bg-header);
  border: 2px solid var(--border-header);
  border-bottom: none;
  padding: 6px 12px 4px 12px;
  border-radius: 12px 12px 0 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-main);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  box-shadow: 0 -2px 10px rgba(0,0,0,0.15);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.scratchy-theme-widget:hover {
  transform: translateY(-2px);
}
.scratchy-theme-select {
  background: var(--bg-content);
  color: var(--text-main);
  border: 1px solid var(--border-tab);
  border-radius: 6px;
  padding: 2px 6px;
  font-family: var(--font-main);
  font-weight: 600;
  cursor: pointer;
  outline: none;
}
`,
      'scratchy-misc-styles'
    );
  }

  injectLayoutStyles() {
    applyCss(
      `
.scratchy-main { width: 100%; }
`,
      'scratchy-layout-styles'
    );
  }

  injectAll() {
    this.applyTheme('default');
    this.injectFontLink();
    this.injectAppShellStyles();
    this.injectMascotStyles();
    this.injectButtonStyles();
    this.injectTabAndStatusStyles();
    this.injectDropzoneStyles();
    this.injectContentLayoutStyles();
    this.injectJsonBannerStyles();
    this.injectAssetCardStyles();
    this.injectMiscStyles();
    this.injectLayoutStyles();
  }

  getTheme(themeName) {
    switch (themeName) {
      case 'dark':
        return this.getDarkTheme();
      case 'garish':
        return this.getGarishTheme();
      case 'boring':
        return this.getBoringTheme();
      case 'weird':
        return this.getWeirdTheme();
      case 'cool':
        return this.getCoolTheme();
      case 'warm':
        return this.getWarmTheme();
      case 'default':
      default:
        return this.getDefaultTheme();
    }
  }

  getDarkTheme() {
    return {
      '--bg-app': '#1e1e2e',
      '--text-main': '#cdd6f4',
      '--bg-header': '#181825',
      '--border-header': '#313244',
      '--bg-sidebar': '#11111b',
      '--border-sidebar': '#313244',
      '--bg-content': '#1e1e2e',
      '--text-muted': '#a6adc8',
      '--bg-tab-active': '#1e1e2e',
      '--color-tab-active': '#89b4fa',
      '--bg-tab-inactive': '#181825',
      '--border-tab': '#313244',
      '--color-tab-inactive': '#6c7086',
      '--btn-open-bg': '#a6e3a1',
      '--btn-open-text': '#11111b',
      '--btn-prompt-bg': '#cba6f7',
      '--btn-prompt-text': '#11111b',
      '--btn-paste-bg': '#89dceb',
      '--btn-paste-text': '#11111b',
      '--btn-save-bg': '#f9e2af',
      '--btn-save-text': '#11111b',
      '--btn-viewer-bg': '#f38ba8',
      '--btn-viewer-text': '#11111b',
      '--bg-dropzone': '#181825',
      '--border-dropzone': '#45475a',
      '--text-dropzone-inner': '#cdd6f4',
      '--text-dropzone-sub': '#a6adc8',
      '--bg-json-banner': '#181825',
      '--bg-json-left': '#11111b',
      '--border-json': '#313244',
      '--border-json-left': '#45475a',
      '--text-json-label': '#cdd6f4',
      '--text-json-stat': '#bac2de',
      '--bg-json-btn': '#313244',
      '--bg-json-btn-hover': '#45475a',
      '--border-json-btn': '#585b70',
      '--bg-asset-card': '#181825',
      '--bg-asset-thumb': '#2e3040',
      '--bg-asset-checker': '#43465e',
      '--text-asset-name': '#cdd6f4',
      '--border-asset': '#313244',
      '--bg-asset-overlay': 'rgba(17, 17, 27, 0.8)',
      '--color-section-header': '#89b4fa',
      '--border-section': '#313244',
      '--logo-filter':
        'drop-shadow(0 0 8px rgba(137, 180, 250, 0.4)) brightness(0.9)',
      '--mascot-filter':
        'drop-shadow(0 0 10px rgba(166, 227, 161, 0.3)) brightness(0.8)',
      '--btn-hover-transform': 'scale(1.05) translateY(-2px)',
      '--logo-hover-transform': 'scale(1.08) rotate(-2deg)',
      '--callout-open-border': '#40a02b',
      '--callout-open-bg': '#1b291d',
      '--callout-prompt-border': '#8839ef',
      '--callout-prompt-bg': '#241a33',
      '--callout-paste-border': '#04a5e5',
      '--callout-paste-bg': '#192b33',
      '--callout-save-border': '#df8e1d',
      '--callout-save-bg': '#30281b',
      '--callout-viewer-border': '#d20f39',
      '--callout-viewer-bg': '#301d22',
      '--font-main':
        "'Architects Daughter', cursive, 'Segoe UI', system-ui, sans-serif",
    };
  }

  getGarishTheme() {
    return {
      '--bg-app': '#ffebf0',
      '--text-main': '#4a004a',
      '--bg-header':
        'linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #ffff00 100%)',
      '--border-header': '#ff00aa',
      '--bg-sidebar': '#ccffff',
      '--border-sidebar': '#00ccff',
      '--bg-content': '#ffccff',
      '--text-muted': '#aa00aa',
      '--bg-tab-active': '#ffccff',
      '--color-tab-active': '#ff00aa',
      '--bg-tab-inactive': '#e6ccff',
      '--border-tab': '#ff00aa',
      '--color-tab-inactive': '#8800ff',
      '--btn-open-bg': '#00ffcc',
      '--btn-open-text': '#004444',
      '--btn-prompt-bg': '#ff00aa',
      '--btn-prompt-text': '#ffffff',
      '--btn-paste-bg': '#ffff00',
      '--btn-paste-text': '#aa0000',
      '--btn-save-bg': '#ff6600',
      '--btn-save-text': '#ffffff',
      '--btn-viewer-bg': '#00ccff',
      '--btn-viewer-text': '#000044',
      '--bg-dropzone': '#ffffff',
      '--border-dropzone': '#ff00ff',
      '--text-dropzone-inner': '#ff00aa',
      '--text-dropzone-sub': '#00ccff',
      '--bg-json-banner': 'linear-gradient(135deg, #ffff00 0%, #ff00aa 100%)',
      '--bg-json-left': 'linear-gradient(180deg, #00ffff 0%, #ccffff 100%)',
      '--border-json': '#ff00ff',
      '--border-json-left': '#ff00aa',
      '--text-json-label': '#4a004a',
      '--text-json-stat': '#004444',
      '--bg-json-btn': '#ffffff',
      '--bg-json-btn-hover': '#ffff00',
      '--border-json-btn': '#ff00aa',
      '--bg-asset-card': '#ffffff',
      '--bg-asset-thumb': '#ccffff',
      '--bg-asset-checker': '#ffccff',
      '--text-asset-name': '#ff00aa',
      '--border-asset': '#00ccff',
      '--bg-asset-overlay': 'rgba(255, 0, 255, 0.8)',
      '--color-section-header': '#ff00aa',
      '--border-section': '#00ccff',
      '--logo-filter':
        'hue-rotate(90deg) saturate(3) drop-shadow(0 0 10px #ff00ff)',
      '--mascot-filter': 'saturate(2) hue-rotate(45deg)',
      '--btn-hover-transform': 'scale(1.08) translateY(-4px) rotate(-1deg)',
      '--logo-hover-transform': 'scale(1.12) rotate(10deg)',
      '--callout-open-border': '#009999',
      '--callout-open-bg': '#ccffff',
      '--callout-prompt-border': '#990066',
      '--callout-prompt-bg': '#ffccff',
      '--callout-paste-border': '#999900',
      '--callout-paste-bg': '#ffffcc',
      '--callout-save-border': '#cc4400',
      '--callout-save-bg': '#ffddcc',
      '--callout-viewer-border': '#000099',
      '--callout-viewer-bg': '#cceeff',
      '--font-main': "'Comic Sans MS', 'Chalkboard SE', sans-serif",
    };
  }

  getCoolTheme() {
    return {
      '--bg-app': '#f0f8ff',
      '--text-main': '#003049',
      '--bg-header':
        'linear-gradient(135deg, #caf0f8 0%, #90e0ef 50%, #00b4d8 100%)',
      '--border-header': '#0077b6',
      '--bg-sidebar': '#e0fbfc',
      '--border-sidebar': '#90e0ef',
      '--bg-content': '#f0f8ff',
      '--text-muted': '#0077b6',
      '--bg-tab-active': '#f0f8ff',
      '--color-tab-active': '#03045e',
      '--bg-tab-inactive': '#caf0f8',
      '--border-tab': '#0096c7',
      '--color-tab-inactive': '#0077b6',
      '--btn-open-bg': '#90e0ef',
      '--btn-open-text': '#03045e',
      '--btn-prompt-bg': '#00b4d8',
      '--btn-prompt-text': '#ffffff',
      '--btn-paste-bg': '#48cae4',
      '--btn-paste-text': '#03045e',
      '--btn-save-bg': '#0096c7',
      '--btn-save-text': '#ffffff',
      '--btn-viewer-bg': '#0077b6',
      '--btn-viewer-text': '#ffffff',
      '--bg-dropzone': '#caf0f8',
      '--border-dropzone': '#00b4d8',
      '--text-dropzone-inner': '#0077b6',
      '--text-dropzone-sub': '#0096c7',
      '--bg-json-banner': 'linear-gradient(135deg, #e0fbfc 0%, #caf0f8 100%)',
      '--bg-json-left': 'linear-gradient(180deg, #90e0ef 0%, #48cae4 100%)',
      '--border-json': '#00b4d8',
      '--border-json-left': '#0077b6',
      '--text-json-label': '#03045e',
      '--text-json-stat': '#003049',
      '--bg-json-btn': '#f0f8ff',
      '--bg-json-btn-hover': '#caf0f8',
      '--border-json-btn': '#00b4d8',
      '--bg-asset-card': '#ffffff',
      '--bg-asset-thumb': '#e0fbfc',
      '--bg-asset-checker': '#caf0f8',
      '--text-asset-name': '#0077b6',
      '--border-asset': '#90e0ef',
      '--bg-asset-overlay': 'rgba(0, 119, 182, 0.8)',
      '--color-section-header': '#023e8a',
      '--border-section': '#90e0ef',
      '--logo-filter': 'hue-rotate(180deg) saturate(1.5)',
      '--mascot-filter': 'hue-rotate(180deg) saturate(1.5)',
      '--btn-hover-transform': 'scale(1.04) translateY(-2px)',
      '--logo-hover-transform': 'scale(1.06) rotate(-1deg)',
      '--callout-open-border': '#0096c7',
      '--callout-open-bg': '#e8f7fa',
      '--callout-prompt-border': '#0077b6',
      '--callout-prompt-bg': '#e0eff7',
      '--callout-paste-border': '#00b4d8',
      '--callout-paste-bg': '#e6f8fb',
      '--callout-save-border': '#023e8a',
      '--callout-save-bg': '#dceaf4',
      '--callout-viewer-border': '#03045e',
      '--callout-viewer-bg': '#d5d6e2',
      '--font-main':
        "'Architects Daughter', cursive, 'Segoe UI', system-ui, sans-serif",
    };
  }

  getWarmTheme() {
    return {
      '--bg-app': '#fff5e6',
      '--text-main': '#401f00',
      '--bg-header':
        'linear-gradient(135deg, #ffb703 0%, #fb8500 50%, #e63946 100%)',
      '--border-header': '#9e0059',
      '--bg-sidebar': '#ffead6',
      '--border-sidebar': '#fb8500',
      '--bg-content': '#fff5e6',
      '--text-muted': '#9e0059',
      '--bg-tab-active': '#fff5e6',
      '--color-tab-active': '#e63946',
      '--bg-tab-inactive': '#ffead6',
      '--border-tab': '#fb8500',
      '--color-tab-inactive': '#fb8500',
      '--btn-open-bg': '#ffb703',
      '--btn-open-text': '#331800',
      '--btn-prompt-bg': '#fb8500',
      '--btn-prompt-text': '#ffffff',
      '--btn-paste-bg': '#ff0054',
      '--btn-paste-text': '#ffffff',
      '--btn-save-bg': '#9e0059',
      '--btn-save-text': '#ffffff',
      '--btn-viewer-bg': '#390099',
      '--btn-viewer-text': '#ffffff',
      '--bg-dropzone': '#ffead6',
      '--border-dropzone': '#e63946',
      '--text-dropzone-inner': '#fb8500',
      '--text-dropzone-sub': '#e63946',
      '--bg-json-banner': 'linear-gradient(135deg, #ffead6 0%, #ffd6ba 100%)',
      '--bg-json-left': 'linear-gradient(180deg, #ffb703 0%, #fb8500 100%)',
      '--border-json': '#e63946',
      '--border-json-left': '#9e0059',
      '--text-json-label': '#401f00',
      '--text-json-stat': '#6b2d00',
      '--bg-json-btn': '#fff5e6',
      '--bg-json-btn-hover': '#ffe3c2',
      '--border-json-btn': '#fb8500',
      '--bg-asset-card': '#ffffff',
      '--bg-asset-thumb': '#ffead6',
      '--bg-asset-checker': '#ffd6ba',
      '--text-asset-name': '#d66a00',
      '--border-asset': '#fb8500',
      '--bg-asset-overlay': 'rgba(230, 57, 70, 0.85)',
      '--color-section-header': '#e63946',
      '--border-section': '#fb8500',
      '--logo-filter': 'sepia(0.6) hue-rotate(-15deg) saturate(2.5)',
      '--mascot-filter': 'sepia(0.4) saturate(1.8)',
      '--btn-hover-transform': 'scale(1.06) translateY(-3px)',
      '--logo-hover-transform': 'scale(1.08) rotate(1deg)',
      '--callout-open-border': '#b37c00',
      '--callout-open-bg': '#fff5db',
      '--callout-prompt-border': '#b35d00',
      '--callout-prompt-bg': '#ffe9d6',
      '--callout-paste-border': '#b3003b',
      '--callout-paste-bg': '#ffd6e4',
      '--callout-save-border': '#660039',
      '--callout-save-bg': '#fae0ee',
      '--callout-viewer-border': '#21005c',
      '--callout-viewer-bg': '#dfccfc',
      '--font-main':
        "'Architects Daughter', cursive, 'Segoe UI', system-ui, sans-serif",
    };
  }
}

