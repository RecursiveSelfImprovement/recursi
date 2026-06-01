
class AppStyles {
  
  constructor() {
    // This class is currently stateless.
  }

  applyAll() {
    const fullCss = `
          ${this._getBaseStyles()}
          ${this._getLayoutStyles()}
          ${this._getGlobalControlsStyles()}
          ${this._getEditorViewStyles()}
          ${this._getNavigatorStyles()} 
          ${this._getUtilityAndDialogStyles()}
          ${this._getAutocompleteStyles()}
          ${this._getResizerStyles()} 
          ${this._getFileTreeDetailStyles()}
          ${this._getTabManagerExtensionStyles()}
          ${this._getDropdownMenuStyles()}
          ${this._getDocEditorStyles()}
          ${this._getSelectionStyles()}
          ${this._getScrollbarStyles()}
          ${this._getPaintPanelStyles()}
          ${this._getMobileStyles()}
        `;
    applyCss(fullCss, 'ProjectEditorAppBaseStyles');
  }

  _getBaseStyles() {
      return `
        /* THE FIX: Removed :root definitions. AppearanceManager now handles this. Added overflow-x: hidden. */
        body, html { height: 100%; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: var(--bg-primary); color: var(--text-primary); overflow-x: hidden; }
        #app-container { flex-grow: 1; display: flex; padding: 5px; box-sizing: border-box; height: 100%; position: relative; }
      `;
    }

  _getLayoutStyles() {
      return `
        .editor-layout { display: flex; flex-direction: column; width: 100%; height: 100%; }
        .tab-area { flex-grow: 1; display: flex; overflow: hidden; }
        .main-content-container { flex-grow: 1; display: flex; flex-direction: column; height: 100%; overflow: hidden; }
      `;
    }

  _getEditorViewStyles() {
    return `
      .editor-area-wrapper { display: flex; flex-grow: 1; overflow: hidden; }
      
      .editor-mode-sidebar { 
        flex-shrink: 0; 
        width: 28px;
        background-color: #2a2a2a; 
        border-right: 1px solid #4a4a4a; 
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        overflow: visible;
      }
      
      .editor-mode-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 40px;
        cursor: pointer;
        border: 1.5px solid var(--btn-color-border, #888);
        background-color: var(--btn-color-bg-inactive, #444);
        border-radius: 6px;
        box-sizing: border-box;
        transition: background-color 0.2s ease, border-color 0.2s ease, height 0.25s ease-out, color 0.2s ease;
        
        padding: 8px 0;
        
        writing-mode: vertical-rl;
        text-orientation: mixed;
        transform: rotate(180deg);
        font-size: 0.8em;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.65);
        user-select: none;
      }

      .editor-mode-btn.code-btn {
        --btn-color-border: #00b4ff; 
        --btn-color-bg-inactive: rgba(64, 196, 255, 0.1);
        --btn-color-bg-active: rgba(64, 196, 255, 0.4);
      }
      .editor-mode-btn.signature-btn {
        --btn-color-border: #f39c12; 
        --btn-color-bg-inactive: rgba(243, 156, 18, 0.1);
        --btn-color-bg-active: rgba(243, 156, 18, 0.4);
      }
      .editor-mode-btn.docs-btn {
        --btn-color-border: #b478ff; 
        --btn-color-bg-inactive: rgba(180, 120, 255, 0.1);
        --btn-color-bg-active: rgba(130, 90, 255, 0.4);
      }

      .editor-mode-btn:hover {
        background-color: var(--btn-color-bg-active);
        color: rgba(255, 255, 255, 0.9);
      }
      
      .editor-mode-btn.active {
        background-color: var(--btn-color-bg-active);
        border-color: var(--btn-color-border);
        color: white;
      }
      
      .project-files-content { height: 100%; display: flex; flex-direction: column; }
      
      .editor-tab-controller {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }

      .view-container { flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; }
      .editor-view-container, .doc-view-wrapper { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; position: relative; }
      .structured-view-container { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 20px; }
      .doc-view-container { padding: 20px; font-family: "Segoe UI", sans-serif; color: var(--text-primary); line-height: 1.6; }
      .doc-view-container h1, .doc-view-container h2, .doc-view-container h3 { color: var(--accent-teal); border-bottom: 1px solid #4a4a4a; padding-bottom: 5px; margin-top: 1.5em; margin-bottom: 0.8em; }
      .doc-view-container pre { background-color: #202020; padding: 12px; border-radius: 4px; white-space: pre-wrap; word-break: break-all; font-family: "Fira Code", monospace; }

      .doc-save-button {
        position: absolute;
        bottom: 20px;
        right: 20px;
        z-index: 100;
        padding: 10px 20px;
        font-size: 1em;
        font-weight: 500;
        background-color: var(--accent-blue);
        color: white;
        border: 1px solid #005f9e;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .doc-save-button.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .doc-save-button:hover {
        background-color: #008cff;
      }

      /* CodeMirror Contrast Enhancements */
      .cm-cursor {
        border-left-color: #00ff00 !important;
        border-left-width: 2px !important;
        opacity: 1 !important;
      }
      
      .cm-selectionBackground {
        background-color: rgba(0, 90, 255, 0.45) !important;
      }
      
      .cm-focused .cm-selectionBackground {
        background-color: rgba(0, 110, 255, 0.55) !important;
      }
      
      .cm-matchingBracket {
        background-color: rgba(0, 255, 0, 0.35) !important;
        color: #fff !important;
        font-weight: bold;
        border-bottom: 1px solid #00ff00;
      }
    `;
  }

  _getUtilityAndDialogStyles() {
      return `
        /* --- START OF FIX: Corrected styles for the new overlay structure --- */
        .dialog-overlay { 
          position: fixed; 
          top: 0; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          background-color: rgba(0,0,0,0.6); 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          z-index: 1000; /* This should match DialogBox.baseZIndex */
          opacity: 1;
          transition: opacity 0.25s ease;
        }
        
        /* Overriding sharedLib styles with !important to ensure theme takes precedence */
        .dialog-box {
          background-color: var(--dialog-bg-rgba, #2a2a2e) !important;
          border: 1px solid var(--dialog-border-color, var(--border-color)) !important;
          border-radius: 6px;
          box-shadow: var(--dialog-glow-shadow, 0 10px 30px rgba(0,0,0,0.5)) !important;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          max-width: 90vw;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          min-width: 200px;
          min-height: 150px;
          overflow: visible;
          position: relative;
          color: var(--text-primary);
          transition: transform 0.1s ease-out, opacity 0.1s ease-out, width 0.1s, height 0.1s;
        }
        
        .dialog-header { 
          padding: 6px 12px; /* Slimmer header */
          background-color: var(--dialog-header-bg-rgba, #3c3c3e) !important; 
          border-bottom: 1px solid var(--dialog-border-color, var(--border-color)) !important; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          border-radius: 6px 6px 0 0; 
          cursor: move;
          user-select: none;
          min-height: 32px;
          position: relative;
          z-index: 10; /* Prevents nested content from overlapping the header */
        }
        
        .dialog-title { margin: 0; font-size: 0.95em; font-weight: 600; color: var(--text-primary); letter-spacing: 0.02em; }
        
        .dialog-controls { display: flex; align-items: center; gap: 6px; }
        
        .dialog-close-btn { 
            background: none; border: none; font-size: 16px; color: var(--text-secondary); 
            cursor: pointer; line-height: 1; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; 
        }
        .dialog-close-btn:hover { background-color: #c42b1c; color: white; }
        
        .dialog-util-btn {
            background: transparent; border: none; color: var(--text-secondary);
            cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
            font-size: 12px;
        }
        .dialog-util-btn:hover { background-color: rgba(255,255,255,0.1); color: var(--text-primary); }

        .dialog-content { padding: 15px; overflow-y: auto; flex-grow: 1; position: relative; z-index: 1; }
        
        .dialog-footer { 
            padding: 8px 12px; 
            border-top: 1px solid var(--dialog-border-color, var(--border-color)) !important; 
            text-align: right; display: flex; justify-content: flex-end; gap: 10px; 
            background-color: rgba(0,0,0,0.2);
        }
        
        .dialog-footer button { margin-left: 0; padding: 6px 16px; border-radius: 4px; border: 1px solid #555; background-color: #3c3c3c; color: var(--text-primary); cursor: pointer; font-size: 0.9em; }
        .dialog-footer button.primary { background-color: var(--accent-blue); border-color: var(--accent-blue); color: white; }
        .dialog-footer button:hover { filter: brightness(1.1); }
        
        .dialog-content button { padding: 6px 14px; border-radius: 4px; border: 1px solid #555; background-color: #3c3c3c; color: var(--text-primary); cursor: pointer; font-weight: 500; transition: all 0.2s ease; }
        .dialog-content button:hover:not(:disabled) { border-color: #777; background-color: #4f4f4f; }
        .dialog-content button.primary { background-color: var(--accent-blue); border-color: #005f9e; }
        .dialog-content button.primary:hover:not(:disabled) { background-color: #008cff; border-color: #007acc; }
      `;
    }

  _getAutocompleteStyles() {
    return `
      .add-import-form {
        position: relative; /* Crucial for positioning the suggestions */
      }
      .autocomplete-suggestions {
        position: absolute;
        bottom: 100%; /* Position it above the input */
        left: 0;
        right: 0;
        max-height: 180px;
        overflow-y: auto;
        background: #3c3c3c;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        z-index: 100;
        list-style: none;
        padding: 4px 0;
        margin: 0 0 4px 0; /* Margin between dropdown and input */
        box-shadow: 0 -4px 12px rgba(0,0,0,0.3);
      }
      .autocomplete-suggestions li {
        padding: 8px 12px;
        cursor: pointer;
        font-family: 'Fira Code', monospace;
        font-size: 0.9em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .autocomplete-suggestions li:hover, .autocomplete-suggestions li.is-active {
        background-color: var(--accent-blue);
        color: white;
      }
    `;
  }

  applyDialogStyles(settings) {
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
            result[3],
            16
          )}`
        : '0, 0, 0';
    };

    const bgColor = settings['dialog.bgColor'] || '#2a2a2e';
    const headerBgColor = settings['dialog.headerBgColor'] || '#3c3c3e';
    const opacity = settings['dialog.opacity'] || 0.95;
    const glowColor = settings['dialog.glowColor'] || '#00bfa5';

    // FIX: Respect the checkbox for glow
    const hasGlow = settings['dialog.hasGlow'] !== false;
    const glowSize = hasGlow ? settings['dialog.glowSize'] || 8 : 0;

    // FIX: Include border color logic
    const borderColor =
      settings['dialog.borderColor'] || settings['--border-color'] || '#4a4a4a';

    const bgRgb = hexToRgb(bgColor);
    const headerRgb = hexToRgb(headerBgColor);
    const glowRgb = hexToRgb(glowColor);

    const glowOpacity = 0.7;

    const dynamicCss = `
          :root {
              --dialog-bg-rgba: rgba(${bgRgb}, ${opacity});
              --dialog-header-bg-rgba: rgba(${headerRgb}, ${opacity});
              --dialog-glow-shadow: 0 0 ${glowSize}px rgba(${glowRgb}, ${glowOpacity});
              --dialog-border-color: ${borderColor};
          }
      `;
    applyCss(dynamicCss, 'DynamicDialogStyles');
  }

  _getResizerStyles() {
      return '';
    }

  _getFileTreeDetailStyles() {
      return `
        .node-doc-indicator {
          display: none !important;
        }

        .visibility-widget-container, .file-size-indicator {
          display: none;
        }

        .floating-panel-host .visibility-widget-container {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .floating-panel-host .file-size-indicator {
          display: inline-block;
          font-family: 'Fira Code', monospace;
          font-size: 0.8em;
          padding: 1px 4px;
          border-radius: 3px;
          min-width: 12px;
          text-align: center;
        }

        .file-size-indicator.code {
          color: #66d9c8;
          background-color: rgba(102, 217, 200, 0.1);
        }

        .file-size-indicator.doc {
          color: #a999e6;
          background-color: rgba(169, 153, 230, 0.1);
        }

        .floating-panel-host .node-dirty-indicator {
          display: none;
        }
      `;
    }

  _getTabManagerExtensionStyles() {
    return `
      .tab-bar-wrapper {
        display: flex;
        position: relative;
        flex-shrink: 0;
        background-color: var(--bg-secondary);
      }

      .tab-buttons {
        flex: 1;
        min-width: 0;
        border-bottom: 1px solid var(--border-color);
        overflow-y: hidden;
      }
      
      .tab-button {
        gap: 6px;
      }

      .tab-dirty-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        /* --- FIX: Give the indicator a solid body to be the glow's source --- */
        background-color: #28a745; 
        position: relative;
        display: none;
        flex-shrink: 0;
        cursor: pointer;
        box-shadow: 0 0 2px rgba(0,0,0,0.5); /* Adds a little depth */
      }
      
      .tab-button.is-dirty .tab-dirty-indicator {
        display: block;
      }

      .tab-close-all-button {
        position: absolute;
        top: 6px; 
        right: 6px;
        width: 22px;
        height: 22px;
        z-index: 10;
        padding: 0;
        font-size: 0.9em;
        line-height: 1;
        display: none;
        align-items: center;
        justify-content: center;
        background-color: transparent;
        border: 1px solid transparent;
        color: var(--text-secondary);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .tab-close-all-button:hover {
        background-color: var(--accent-red);
        color: white;
        border-color: #ff5252;
        transform: scale(1.1);
      }
    `;
  }

  _getDropdownMenuStyles() {
    return `
      .dropdown-menu {
        position: fixed;
        z-index: 2147483647; /* MAXIMUM Z-INDEX */
        background-color: #313133;
        border: 1px solid #4a4a4a;
        border-radius: 6px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        list-style: none;
        padding: 6px;
        margin: 0;
        min-width: 240px;
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
        transform-origin: top left;
        transition: opacity 0.15s ease, transform 0.15s ease;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      }

      .dropdown-menu.open {
        opacity: 1;
        transform: scale(1) translateY(0);
      }

      .dropdown-menu-item {
        padding: 8px 12px;
        color: var(--text-primary);
        cursor: pointer;
        border-radius: 4px;
        font-size: 0.95em;
        white-space: nowrap;
      }
      
      .dropdown-menu-item:hover {
        background-color: var(--accent-blue);
        color: white;
      }

      .dropdown-menu-separator {
        height: 1px;
        background-color: var(--border-color);
        margin: 6px 0;
      }
    `;
  }

  _getDocEditorStyles() {
    return `
      /* Make the doc editor fill the available space */
      .doc-editor-container {
        flex-grow: 1;
        display: flex; /* Use flexbox to manage children */
        flex-direction: column;
        height: 100%; /* Ensure it tries to fill its parent */
      }

      .doc-editor-container .CodeMirror {
        flex-grow: 1;
        height: 100%; /* Make the CodeMirror instance itself fill the container */
      }
    `;
  }

  _getNavigatorStyles() {
    return `
          .structured-view-container { 
            display: flex;
            flex-wrap: wrap;
            gap: 20px; 
            background-color: var(--bg-secondary);
            align-content: flex-start;
          }
          .navigator-section {
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 12px 18px;
            flex: 1 1 400px; /* Grow and shrink from a 400px base */
            min-width: 0; /* Explicitly allow shrinking to prevent overflow */
          }
          .navigator-section h4 {
            margin: 0 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border-color);
            color: var(--accent-teal);
            font-size: 1.1em;
          }
          .navigator-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
          }
          .navigator-header span {
            font-size: 0.8em;
            color: var(--text-secondary);
            font-family: 'Fira Code', monospace;
          }
          .navigator-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .navigator-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            border-radius: 4px;
            transition: background-color 0.2s ease;
          }
          .navigator-item.member-item {
            cursor: pointer;
          }
          .navigator-item:hover {
            background-color: #3c3c3c;
          }
          .item-main {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex-grow: 1;
            overflow: hidden;
          }
          .item-signature, .item-main strong {
            font-family: 'Fira Code', monospace;
            font-size: 0.9em;
            color: #9cdcfe; /* Light blue for symbols/signatures */
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .item-meta {
            font-size: 0.8em;
            color: #ce9178; /* Orange/brown for paths/line counts */
            font-family: 'Fira Code', monospace;
          }
          .member-item.is-private .item-signature {
            color: #c586c0; /* Purple for private members */
            opacity: 0.75;
          }
          .remove-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 1.4em;
            cursor: pointer;
            padding: 0 8px;
            opacity: 0.7;
            transition: all 0.2s ease;
          }
          .remove-btn:hover {
            color: var(--accent-red);
            opacity: 1;
            transform: scale(1.1);
          }
          .add-import-form {
            display: flex;
            gap: 8px;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid var(--border-color);
          }
          .add-import-form input {
            flex-grow: 1;
            background-color: var(--bg-primary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 6px 10px;
            border-radius: 4px;
          }
          .add-import-form button {
            background-color: var(--accent-blue);
            border: none;
            color: white;
            padding: 6px 14px;
            border-radius: 4px;
            cursor: pointer;
          }
          .add-import-form button:hover {
            background-color: #008cff;
          }
        `;
  }

  _getSelectionStyles() {
    return `
    ::selection {
      background-color: rgba(0, 122, 204, 0.5); 
      color: white;
    }
    ::-moz-selection {
      background-color: rgba(0, 122, 204, 0.5); 
      color: white;
    }
    /* Specific override for CodeMirror */
    .CodeMirror-focused .CodeMirror-selected, 
    .CodeMirror-selected {
      background-color: rgba(0, 122, 204, 0.5) !important;
    }
    .cm-selectionBackground {
      background-color: rgba(0, 122, 204, 0.3) !important;
    }
  `;
  }

  _getScrollbarStyles() {
    return `
            /* Dark Mode Scrollbar Styles */
            ::-webkit-scrollbar {
                width: 12px;
                height: 12px;
            }

            ::-webkit-scrollbar-track {
                background: #2a2a2e;
                border-radius: 10px;
            }

            ::-webkit-scrollbar-thumb {
                background-color: #555;
                border-radius: 10px;
                border: 3px solid #2a2a2e;
            }

            ::-webkit-scrollbar-thumb:hover {
                background-color: #777;
            }

            ::-webkit-scrollbar-corner {
                background: transparent;
            }
        `;
  }

  _getPaintPanelStyles() {
    return `
      #paint-selection-panel {
        /* Position is 'fixed' and set by JS */
        width: 170px;
        background-color: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        z-index: 1000000000; /* Extremely high z-index to be on top of everything */
        padding: 10px;
        box-shadow: 3px 3px 12px rgba(0,0,0,0.4);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .paint-tool-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 12px;
      }
      .paint-tool-group:last-child { border-bottom: none; padding-bottom: 0; }
      
      /* THIS IS THE FIX: Remove the line between the buttons and toggles */
      .paint-tool-group .small-grid {
        border-top: none; 
        padding-top: 0;
        margin-top: 0;
      }

      .paint-tool-group.bottom { 
          margin-top: auto; 
          flex-direction: row; 
          justify-content: space-between; 
          align-items: center;
      }
      .paint-tool-sub-header { font-size: 0.8em; font-weight: bold; color: var(--text-secondary); margin-bottom: 4px; }
      
      .mode-selector { display: flex; }
      .mode-toggle-btn {
          flex-grow: 1;
          background: #333;
          border: 1px solid #555;
          color: var(--text-secondary);
          padding: 4px;
          font-size: 0.8em;
      }
      .mode-toggle-btn:first-child { border-radius: 4px 0 0 4px; border-right: none; }
      .mode-toggle-btn:last-child { border-radius: 0 4px 4px 0; }
      .mode-toggle-btn.active {
          background-color: #555;
          color: white;
          font-weight: bold;
      }
      
      .bulk-modifier-container { display: flex; justify-content: space-around; gap: 5px; margin-top: 8px; }
      .bulk-modifier-toggle {
        padding: 4px 8px;
        font-size: 0.8em;
        font-weight: 500;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
        border: 1px solid var(--border-color);
        background-color: transparent;
        color: var(--text-secondary);
        flex-grow: 1;
      }
      .bulk-modifier-toggle[aria-pressed="true"].code { background-color: var(--accent-blue); border-color: var(--accent-blue); color: white; }
      .bulk-modifier-toggle[aria-pressed="true"].signatures { background-color: #f39c12; border-color: #f39c12; color: white; }
      .bulk-modifier-toggle[aria-pressed="true"].docs { background-color: var(--accent-purple); border-color: var(--accent-purple); color: white; }

      .paint-tool-group.small-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      
      .paint-tool-btn { padding: 8px; font-size: 0.9em; font-weight: 500; border-radius: 4px; border: 1px solid #555; background-color: #3c3c3c; color: var(--text-primary); cursor: pointer; transition: all 0.2s ease; text-align: center; }
      .paint-tool-btn:hover:not(:disabled) { background-color: #4f4f4f; border-color: #777; }
      .paint-tool-btn:disabled { opacity: 0.4; cursor: not-allowed; background-color: #333; }
      
      .paint-tool-btn.active { background-color: var(--accent-red); border-color: #ff5252; color: white; }
      .paint-tool-btn.apply-btn { background-color: #2e7d32; border-color: #1b5e20; }
      .paint-tool-btn.clear-btn { background-color: #c62828; border-color: #b71c1c; }
      
      .paint-tool-btn.close-btn { background-color: transparent; border: none; color: var(--text-secondary); font-size: 1.4em; padding: 0; width: auto; height: auto; }
      .paint-tool-btn.close-btn:hover { color: var(--accent-red); background-color: transparent; }
    `;
  }

  _getGlobalControlsStyles() {
      return `
      .global-controls {
        flex-shrink: 0; 
        padding: 0 14px; 
        min-height: 52px;
        box-sizing: border-box;
        background-color: var(--bg-tertiary);
        border-bottom: 1px solid var(--border-color); 
        display: flex;
        justify-content: space-between; 
        align-items: center;
        gap: 16px;
        position: relative;
        z-index: 500;
      }
      .control-group.left, .control-group.right { 
        display: flex; 
        align-items: center; 
        gap: 10px;
        flex-shrink: 0;
      }

      .control-group.right {
        justify-content: flex-end;
      }

      .split-btn-group {
        display: flex;
        align-items: stretch;
        background-color: #6A1B9A; 
        border: 1px solid #7B1FA2;
        border-radius: 5px;
        transition: all 0.2s ease;
        padding: 0;
        overflow: hidden;
        height: 36px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      }
      
      .split-btn-group:hover {
        background-color: #7B1FA2;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
        transform: translateY(-1px);
      }
      
      .split-btn-group button {
        background: inherit !important; 
        border: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        transform: none !important;
        color: white !important;
        height: 100%;
        display: flex;
        align-items: center;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s;
        touch-action: manipulation;
      }
      
      .split-btn-group .main-btn:hover {
         background-color: #8E24AA !important; 
      }
      
      .split-btn-group .main-btn {
        padding: 0 16px;
        font-size: 1em;   
        border-right: 1px solid rgba(0,0,0,0.2) !important;
        white-space: nowrap;
      }
      
      .split-btn-group .options-btn {
        padding: 0 8px;
        font-size: 1.4em;
        width: auto;
        min-width: 36px;
        justify-content: center;
        line-height: 0.8;
      }
      
      .split-btn-group .options-btn:hover {
        background-color: rgba(0,0,0,0.2) !important;
      }

      .status-container {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-grow: 1;
          min-width: 0;
          height: 100%;
          overflow: visible; 
          position: relative;
      }

      .status-message {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin: 0;
        padding: 6px 12px;
        font-size: 0.9em;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        white-space: nowrap;
        z-index: 2000;
        pointer-events: none; 
        opacity: 0;
        transition: opacity 0.3s ease;
        background-color: rgba(40, 40, 45, 0.95);
        border: 1px solid #555;
        color: #e0e0e0;
        backdrop-filter: blur(4px);
      }
      
      .status-message.visible {
          opacity: 1;
      }

      /* logo-container CSS styles removed completely! */

      .global-controls > .control-group button:not(.main-btn):not(.options-btn) {
        padding: 8px 16px;
        color: var(--text-primary); 
        background-color: #3c3c3c;
        border: 1px solid #555; 
        border-radius: 5px; 
        cursor: pointer;
        font-size: 1em;
        font-weight: 500; 
        transition: all 0.2s ease;
        display: flex; 
        align-items: center; 
        gap: 6px;
        flex-shrink: 0;
        height: 36px;
        touch-action: manipulation;
      }
      .global-controls button:hover:not(:disabled) {
        border-color: #777; 
        background-color: #4f4f4f;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      .global-controls button:disabled { 
        background-color: #4a4a4a !important; 
        color: #888; 
        cursor: not-allowed; 
        opacity: 0.5; 
      }

      .global-controls button:focus-visible,
      .split-btn-group button:focus-visible {
        outline: 2px solid var(--accent-blue);
        outline-offset: 2px;
        z-index: 1;
        position: relative;
      }

      #saveAllBtn { background-color: #28a745 !important; border-color: #1f7c35 !important; }
      #buildContextBtn { background-color: #c51162 !important; border-color: #8e0038 !important; }
      #buildContextBtn:hover:not(:disabled) { background-color: #d81b60 !important; border-color: #ad1457 !important; }
      
      #projectBrowserBtn { 
        background-color: #e67e22 !important; 
        border-color: #d35400 !important; 
        color: white !important; 
      }
      #projectBrowserBtn:hover:not(:disabled) { background-color: #d35400 !important; border-color: #a04000 !important; }

      .report-btn.active {
        animation: pulse-orange-border 1.5s infinite;
      }
      
      @keyframes pulse-orange-border {
        0% { box-shadow: 0 0 0 0 rgba(230, 120, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(230, 120, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(230, 120, 0, 0); }
      }
    `;
    }

  _getMobileStyles() {
      return `
        @media (max-width: 768px) {
          .global-controls {
            padding: 0 6px;
            min-height: 48px;
            gap: 4px;
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .global-controls::-webkit-scrollbar { display: none; }

          .control-group.left, .control-group.right {
            gap: 4px;
            flex-shrink: 0;
          }

          .global-controls button,
          .split-btn-group {
            min-height: 44px !important;
          }

          .global-controls > .control-group button:not(.main-btn):not(.options-btn) {
            height: 44px;
            padding: 0 10px !important;
            font-size: 0.85em;
            white-space: nowrap;
          }

          .split-btn-group {
            height: 44px;
          }
          .split-btn-group .main-btn {
            padding: 0 10px !important;
            font-size: 0.85em !important;
          }
          .split-btn-group .options-btn {
            min-width: 44px !important;
            padding: 0 !important;
            font-size: 1.3em !important;
          }

          #timelineBtn,
          #packBtn {
            display: none !important;
          }

          .tab-area {
            position: relative;
          }

          .main-content-container {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          #openFolderBtn {
            display: none !important;
          }

          #projectBrowserBtn .btn-label {
            display: none;
          }

          .global-controls > .control-group button:not(.main-btn):not(.options-btn) {
            padding: 0 8px !important;
            font-size: 0.8em;
          }

          .split-btn-group .main-btn {
            padding: 0 8px !important;
          }
        }
      `;
    }

    

  applyThemeVariables(settings) {
    let rootVars = '';
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('--')) {
        rootVars += `  ${key}: ${value};\n`;
      }
    }
    
    const dynamicCss = `
      :root {
${rootVars}
      }
    `;
    applyCss(dynamicCss, 'DynamicThemeVariables');
    
    if (typeof this.applyDialogStyles === 'function') {
      this.applyDialogStyles(settings);
    }
  }

  

  static _doc_intro() {
    return '## AppStyles\n\nManages the injection of baseline and dynamic CSS styles for the Vibes IDE. It encapsulates massive template strings of CSS into logical groupings like layout, editor views, and dialogs.';
  }

  static _doc_dynamicTheming() {
    return '## Dynamic Theming\n\nAppStyles works closely with `AppearanceManager`. When the user modifies visual settings (like colors, paddings, and glow effects), `AppearanceManager` pushes those state changes to AppStyles, which regenerates and injects the updated CSS variables into the document `:root`.';
  }


  static _doc_overview() {
      return `# AppStyles\n\nThe \`AppStyles\` class is the baseline stylesheet injector for the Vibes workspace.\nIt aggregates and injects CSS rulesets dynamically at runtime, avoiding the need for compiled external CSS assets.`;
    }

  static _doc_styles() {
      return `## Modular Compilation and Component Portability\n\n- **Modular Styles**: Organizes styles into functional sub-methods (\`_getBaseStyles\`, \`_getLayoutStyles\`, \`_getDropdownMenuStyles\`). \`applyAll\` aggregates these and injects them into the document head via \`applyCss\`.\n- **Component Portability**: Keeping CSS rulesets encapsulated within JavaScript classes ensures absolute component portability-if a component is moved or refactored, its styling logic stays bundled with it.`;
    }

  static _doc() {
      return [
        this._doc_intro(),
        this._doc_dynamicTheming()
      ].join('\n\n');
    }
}

