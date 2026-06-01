
class CommentStyles {
  getAppContainerStyles() {
    return `
            .comments-app-container {
                max-width: 800px;
                margin: 40px auto;
                padding: 20px 30px;
                background-color: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
            }

            .app-title {
                font-size: 24px;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 15px;
                margin-bottom: 15px;
                font-weight: 500;
            }
        `;
  }

  getCommentThreadStyles() {
    return `
            .comment-thread {
                position: relative;
                user-select: none;
            }

            .comment-thread-svg-layer {
                position: absolute;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 0;
                overflow: visible;
            }
        `;
  }

  getPostBoxStyles() {
    return `
        /* CHANGED: Selector from ID to class */
        .top-level-post-container {
            margin-bottom: 25px;
        }

        .post-comment-button {
            width: 100%;
            padding: 12px;
            font-size: 15px;
            font-weight: 500;
            text-align: left;
            background-color: var(--bg-primary);
            color: var(--text-tertiary);
            border: 1px dashed var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .post-comment-button:hover {
            color: var(--text-primary);
            border-color: var(--accent-blue);
            background-color: var(--bg-tertiary);
        }

        .comment-post-box {
            display: flex;
            flex-direction: column;
            gap: 10px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 15px;
            background-color: var(--bg-primary);
        }

        .comment-post-box.reply-box {
            margin-top: 5px; 
            margin-bottom: 0;
            padding: 12px;
        }
        
        .post-box-header {
            font-size: 13px;
            color: var(--text-tertiary);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px; 
        }
        
        .post-box-header > span {
            display: inline-flex;
            align-items: baseline;
            flex-shrink: 1;
            min-width: 0;
        }
        .post-box-header .rendered-name {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .account-button {
            background: none;
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            font-size: 12px;
            padding: 3px 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0; 
        }
        .account-button:hover {
            background-color: var(--bg-tertiary);
            color: var(--text-primary);
            border-color: var(--text-tertiary);
        }

        .username-input {
            border: 1px solid var(--border-color);
            background-color: var(--bg-tertiary);
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
            color: var(--text-primary);
            transition: border-color 0.2s;
        }
        .username-input:focus {
            outline: none;
            border-color: var(--accent-blue);
        }

        .comment-input {
            border: 1px solid var(--border-color);
            background-color: var(--bg-tertiary);
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 15px;
            resize: vertical;
            min-height: 70px;
            font-family: inherit;
            color: var(--text-primary);
            transition: border-color 0.2s;
        }

        .comment-input:focus {
            outline: none;
            border-color: var(--accent-blue);
        }

        .post-box-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            align-items: center;
        }

        .post-button, .cancel-button {
            border: none;
            border-radius: 5px;
            padding: 9px 18px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .post-button {
            background-color: var(--accent-blue);
            color: var(--h-button-text-color, white);
        }
        .post-button:hover {
            background-color: var(--accent-blue-hover);
        }
        
        .cancel-button {
            background-color: var(--bg-tertiary);
            color: var(--text-secondary);
        }
        .cancel-button:hover {
            background-color: #3f3f41;
            color: var(--text-primary);
        }
    `;
  }

  getUserSwitcherStyles() {
    return `
        .user-switcher-bar {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 8px;
            padding: 5px 0;
            margin-bottom: 10px;
            font-size: 13px;
            color: var(--text-tertiary);
        }
        .user-switcher-bar button {
            font-size: 12px;
            padding: 4px 8px;
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
        }
        .user-switcher-bar button:hover {
            background-color: #3f3f41;
            color: var(--text-primary);
        }
        .user-switcher-bar button.rebuild-button {
            border-style: dashed;
            color: var(--accent-gold);
        }
        .user-switcher-bar button.rebuild-button:hover {
            background-color: rgba(205, 164, 52, 0.1);
            border-color: var(--accent-gold);
        }

        .debug-toggle-button.active {
            background-color: var(--accent-gold);
            color: var(--bg-primary);
            border-color: var(--accent-gold);
        }
        .debug-toggle-button.active:hover {
            background-color: #f0c45a;
        }
        
        #user-dialog-content { display: flex; flex-direction: column; gap: 15px; }
        #user-dialog-content .user-list { display: flex; flex-wrap: wrap; gap: 8px; }
        #user-dialog-content .user-list button { padding: 5px 10px; background-color: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; border-radius: 4px; }
        #user-dialog-content .create-user-form { display: flex; gap: 10px; margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px; }
        #user-dialog-content input { flex-grow: 1; border: 1px solid var(--border-color); background-color: var(--bg-primary); border-radius: 4px; padding: 8px 12px; font-size: 14px; color: var(--text-primary); }
        #user-dialog-content input:focus { outline: none; border-color: var(--accent-blue); }
    `;
  }

  getRatingPanelStyles() {
    return `
        .rating-panel {
            position: absolute;
            background-color: var(--h-rating-panel-bg-color, var(--bg-primary));
            border: 1px solid var(--h-rating-panel-border-color, var(--border-color));
            border-radius: 6px;
            padding: 12px;
            z-index: 100;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 280px;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.2s ease-out;
            pointer-events: none;
        }
        .rating-panel.is-visible {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
            border-color: var(--h-rating-glow-color, rgba(255, 0, 220, 0.4));
            box-shadow: 0 0 15px 2px var(--h-rating-glow-color, rgba(255, 0, 220, 0.6)), 0 5px 15px rgba(0,0,0,0.3);
        }

        .sliders-container {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .rating-slider-container {
            display: grid;
            grid-template-columns: 80px 1fr;
            align-items: center;
            gap: 8px;
        }
        .rating-slider-label {
            font-size: 12px;
            color: var(--text-secondary);
            text-align: right;
        }
        .rating-slider-svg {
            cursor: pointer;
        }
        .feedback-header {
            font-size: 11px;
            font-weight: bold;
            color: var(--text-tertiary);
            text-transform: uppercase;
            border-top: 1px solid var(--border-color);
            padding-top: 10px;
            margin-top: 2px;
        }
        .rating-feedback-textarea {
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            color: var(--text-primary);
            font-family: inherit;
            font-size: 13px;
            padding: 8px;
            resize: none;
            min-height: 40px;
            transition: min-height 0.2s ease-out;
            outline: none;
        }
        .rating-panel.is-expanded .rating-feedback-textarea {
            min-height: 80px;
        }
    `;
  }

  getDialogStyles() {
    return `
        .user-account-dialog {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .user-account-dialog .username-input {
            width: 100%;
            box-sizing: border-box;
        }
        .name-preview {
            padding: 10px;
            background-color: var(--bg-primary);
            border-radius: 4px;
            border: 1px solid var(--border-color);
            min-height: 20px;
        }
        .info-text {
            font-size: 12px;
            color: var(--text-tertiary);
        }
        .info-text.error {
            color: #ff8a8a;
            font-weight: 600;
        }
    `;
  }

  getToolbarStyles() {
    return `
        .comment-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-bottom: none; /* Merges with container below usually, or distinct */
            border-radius: 8px 8px 0 0;
            margin-bottom: 0;
            font-size: 13px;
            user-select: none;
        }

        /* Fix the main container border radius when toolbar is present */
        .comment-toolbar + .comment-view-container {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
            border-top: none;
        }

        .toolbar-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .toolbar-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 13px;
            transition: background 0.2s, color 0.2s;
        }
        .toolbar-btn:hover {
            background-color: rgba(255,255,255,0.05);
            color: var(--text-primary);
        }
        .toolbar-btn svg { opacity: 0.8; }

        .toolbar-slider-group {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-tertiary);
        }
        
        .compact-slider {
            -webkit-appearance: none;
            width: 80px;
            height: 4px;
            background: var(--border-color);
            border-radius: 2px;
            outline: none;
        }
        .compact-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--accent-blue);
            cursor: pointer;
            transition: transform 0.1s;
        }
        .compact-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }

        .user-section {
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .user-section:hover {
            background-color: rgba(255,255,255,0.05);
        }
        
        .toolbar-avatar {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            object-fit: cover;
        }
        
        .toolbar-username {
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .toolbar-login-text {
            color: var(--accent-blue);
            font-weight: 600;
        }
    `;
  }

  applyAllStyles() {
    this.ensureGoogleFontLoaded(
      'Patrick Hand SC',
      'https://fonts.googleapis.com/css2?family=Patrick+Hand+SC&display=swap'
    );
    this.ensureGoogleFontLoaded(
      'Architects Daughter',
      'https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap'
    );

    const fullCss = `
        ${this.getGlobalStyles()}
        ${this.getAppContainerStyles()}
        ${this.getCommentThreadStyles()}
        ${this.getCommentNodeStyles()}
        ${this.getPostBoxStyles()}
        ${this.getUserSwitcherStyles()}
        ${this.getRatingPanelStyles()}
        ${this.getDialogStyles()}
        ${this.getToolbarStyles()}
        ${this.getDemoBannerStyles()}
    `;
    applyCss(fullCss, 'comment-system-styles');
  }

  _hexToRgba(hex, alpha) {
    if (!hex) return 'transparent';
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return (
        'rgba(' +
        [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') +
        ',' +
        alpha +
        ')'
      );
    }
    return hex;
  }

  getCommentNodeStyles() {
    return `
        .comment-node { position: absolute; display: flex; align-items: flex-start; transition: opacity 250ms linear; z-index: 1; }
        .comment-node:not(.has-children) > .node-toggle { visibility: hidden; }
        
        .comment-node.is-expanded > .node-toggle { transform: translateY(calc(var(--h-arrow-vertical-offset, 0px) + 2px)) rotate(90deg); }
        
        .node-toggle { 
            width: 32px; 
            height: 32px; 
            color: var(--accent-gold); 
            flex-shrink: 0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            cursor: pointer; 
            transition: transform 0.15s ease-in-out; 
            margin-left: -8px; 
            transform: translateY(var(--h-arrow-vertical-offset, 0px)); 
            overflow: visible; 
        }
        
        .node-toggle:hover { color: #f0c45a; }
        .node-toggle svg { width: var(--h-arrow-size, 20px); height: var(--h-arrow-size, 20px); overflow: visible; }
        
        .node-toggle svg path:first-child {
            stroke-width: var(--h-arrow-shadow-width, 7px) !important;
            stroke: var(--h-arrow-shadow-color, var(--bg-secondary)) !important;
        }

        .comment-content-wrapper { 
            flex-grow: 1; 
            padding: 6px 8px; 
            margin-left: var(--h-content-margin-left, 4px); 
            border-radius: 6px; 
            transition: box-shadow 0.3s ease-out, background-color 0.3s ease-out, padding 0.2s ease-out; 
            position: relative; 
            overflow: hidden; 
            background-color: var(--h-comment-bg-color, transparent); 
        }
        
        .comment-avatar { 
            float: left; 
            width: 45px; 
            height: 45px; 
            border-radius: 6px; 
            margin-right: var(--h-avatar-margin-right, 12px); 
            margin-top: var(--h-avatar-margin-top, 2px); 
            cursor: pointer; 
            background-color: var(--bg-tertiary); 
            transition: transform 0.2s ease-out, box-shadow 0.2s ease-out; 
            position: relative; 
            z-index: 1; 
            transform-origin: top left; 
        }
        .comment-avatar:hover { transform: scale(1.55); z-index: 10; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
        
        .comment-node.is-own-comment > .comment-content-wrapper { background-color: var(--h-own-comment-bg-color, rgba(0, 122, 204, 0.1)); }
        
        .comment-node.is-temporary-reply .comment-content-wrapper { padding: 0; margin-left: -9px; }
        .comment-node.is-deleted > .comment-content-wrapper .comment-text { color: var(--text-tertiary); font-style: italic; }
        .comment-node.is-deleted.is-own-comment > .comment-content-wrapper { background-color: transparent; }
        .comment-node.is-rating .comment-content-wrapper { background-color: rgba(255, 0, 220, 0.05); box-shadow: 0 0 12px 1px var(--h-rating-glow-color, rgba(255, 0, 220, 0.5)), inset 0 0 8px rgba(255, 0, 220, 0.2); z-index: 5; }

        .comment-header {
            font-weight: 600;
            font-size: var(--h-font-size-header, 14px);
            color: var(--text-primary);
            display: flex;
            justify-content: space-between;
            gap: 8px;
            align-items: baseline;
        }
        
        .header-connector {
            flex-grow: 1;
            border-bottom: var(--h-header-line-width, 1px) dotted var(--h-header-line-color, #4dd0e1);
            margin: 0 10px;
            transform: translateY(var(--h-header-line-vertical-offset, -4px));
        }

        .comment-header-content { display: flex; align-items: baseline; gap: 8px; flex-wrap: nowrap; flex-shrink: 1; min-width: 0; }
        
        /* USERNAME COLOR OVERRIDE LOGIC */
        /* If the variable is set, it overrides inline styles (rainbows) using !important. */
        /* If the variable is NOT set (or 'inherit'), inline styles on children will persist. */
        .user-name { 
            display: inline-flex; 
            align-items: baseline; 
            flex-shrink: 0; 
            color: var(--h-username-color, inherit) !important;
        }
        
        /* We also target the inner spans to force the color down if set */
        .user-name span {
             color: var(--h-username-color, inherit) !important;
        }

        .user-name-suffix { font-size: 0.75em; color: var(--text-tertiary) !important; font-weight: 400; vertical-align: sub; margin-left: 3px; }
        .comment-timestamp { font-size: var(--h-font-size-timestamp, 12px); font-weight: 400; color: var(--text-tertiary); flex-shrink: 0; }
        .comment-debug-info { display: none; font-family: var(--font-mono); font-size: 10px; font-weight: 400; color: var(--accent-gold); background-color: rgba(205, 164, 52, 0.1); padding: 2px 5px; border-radius: 3px; margin-left: 4px; flex-shrink: 0; }
        .debug-mode-active .comment-debug-info { display: inline-block; }
        
        .comment-text-preview {
            display: none;
            margin-left: 4px;
            color: var(--text-secondary);
            font-size: var(--h-font-size-comment, 15px);
            font-weight: 400;
            font-style: normal;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 20px;
        }

        .comment-text { font-size: var(--h-font-size-comment, 15px); line-height: 1.45; margin-top: 6px; color: var(--text-secondary); word-wrap: break-word; white-space: pre-wrap; }
        .comment-actions { margin-top: 0; font-size: 13px; display: flex; gap: 8px; flex-shrink: 0; background-color: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; }
        .comment-actions button { background: none; border: none; color: var(--text-tertiary); font-weight: 600; cursor: pointer; padding: 2px 4px; border-radius: 3px; }
        .comment-actions button:hover { color: var(--accent-blue-hover); background-color: rgba(0, 122, 204, 0.15); }
        .comment-actions .delete-button:hover { color: #ff6b6b; background-color: rgba(255, 107, 107, 0.15); }
        
        .comment-node.is-collapsed .comment-text,
        .comment-node.is-collapsed .comment-actions,
        .comment-node.is-collapsed .header-connector {
            display: none;
        }

        .comment-node.is-collapsed .comment-text-preview {
            display: inline;
        }

        .comment-node.is-collapsed .comment-content-wrapper {
            padding-bottom: 6px;
        }
    `;
  }

  static get defaultSettings() {
    return {
      // --- API & Behavior ---
      apiMode: 'mock',
      timestampFormat: 'full',

      // --- Fonts ---
      fontFamily: "'Segoe UI', sans-serif",
      fontSizeComment: 15,
      fontSizeHeader: 15,
      fontSizeTimestamp: 12,

      // --- Colors (Text) ---
      textColorPrimary: '#d1d4d7',
      textColorSecondary: '#adb5bd',
      textColorTertiary: '#8e949b',
      usernameColor: '#51a6c8',
      buttonTextColor: '#ffffff',
      accentColor: '#008deb',

      // --- Backgrounds (RED & BLACK DEFAULTS) ---
      bodyPostBoxBgHex: '#1e1e1e',
      bodyPostBoxBgOpacity: 1,

      mainPanelBgHex: '#1f0000', // Dark Red
      mainPanelBgOpacity: 0.7,

      inputsAvatarsBgHex: '#2a2a2a',
      inputsAvatarsBgOpacity: 1,

      ratingPanelBgHex: '#1e1e1e',
      ratingPanelBgOpacity: 0.85,

      harnessBgHex: '#1e1e1e',
      harnessBgOpacity: 0.95,
      harnessBorderColor: '#4a4a4a',

      ratingPanelBorderColor: '#4a4a4a',
      ratingPanelGlowColor: '#615400',

      myCommentBgHex: '#007acc',
      myCommentBgOpacity: 0.1,

      genericCommentBgHex: '#000000', // Black
      genericCommentBgOpacity: 0.65,

      // --- Layout ---
      indentation: 35,
      verticalPadding: 15,
      commentContentMarginLeft: 4,
      avatarMarginTop: 2,
      avatarMarginRight: 12,

      // --- Lines ---
      lineColor: '#5a5a5a',
      lineWidth: 4.5,
      lineRadius: 8,
      lineEndpointOffset: -20,
      lineConnectionPointXOffset: 8,
      lineConnectionPointYOffset: 16,
      arrowSize: 20,
      arrowVerticalOffset: 0,
      arrowShadowWidth: 7,
      arrowShadowColor: '#252526',
      headerLineColor: '#4dd0e1',
      headerLineWidth: 1,
      headerLineVerticalOffset: -4,
      animationDuration: 250,
    };
  }

  getGlobalStyles() {
    // 1. SAFE MERGE: Combine defaults with any instance overrides
    const defaults = this.constructor.defaultSettings || {};
    const overrides = this.settings || {};
    const s = { ...defaults, ...overrides };

    // 2. Helper: Convert Hex + Opacity to RGBA
    const toRgba = (hex, opacity) => {
      if (!hex) return 'transparent';
      let c = hex.substring(1).split('');
      if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      c = '0x' + c.join('');
      return (
        'rgba(' +
        [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') +
        ',' +
        (opacity !== undefined ? opacity : 1) +
        ')'
      );
    };

    // 3. GENERATE CSS
    // We map the specific settings to the EXACT css variables used in your other getter methods.
    return `
        :root {
            /* --- Fonts --- */
            --font-sans: ${s.fontFamily || 'sans-serif'};
            --h-font-family: ${s.fontFamily || 'sans-serif'};

            /* --- Text Colors --- */
            --text-primary: ${s.textColorPrimary};
            --text-secondary: ${s.textColorSecondary};
            --text-tertiary: ${s.textColorTertiary};
            
            --h-text-color-primary: ${s.textColorPrimary};
            --h-text-color-secondary: ${s.textColorSecondary};
            --h-text-color-tertiary: ${s.textColorTertiary};
            
            --h-username-color: ${s.usernameColor};
            --h-button-text-color: ${s.buttonTextColor};
            
            --accent-blue: ${s.accentColor}; 
            --accent-blue-hover: ${s.accentColor};
            --h-accent-color: ${s.accentColor};

            /* --- BACKGROUNDS --- */
            
            /* Page Background */
            --bg-primary: ${toRgba(s.bodyPostBoxBgHex, s.bodyPostBoxBgOpacity)};
            --h-bg-color-primary: ${toRgba(
              s.bodyPostBoxBgHex,
              s.bodyPostBoxBgOpacity
            )};
            
            /* MAIN PANEL (The Red Box) */
            /* We map the Red setting to --bg-secondary because that is what .comments-app-container uses */
            --bg-secondary: ${toRgba(s.mainPanelBgHex, s.mainPanelBgOpacity)};
            --h-bg-color-secondary: ${toRgba(
              s.mainPanelBgHex,
              s.mainPanelBgOpacity
            )};
            
            /* GENERIC COMMENT (The Black Box) */
            /* We map the Black setting to --h-comment-bg-color because that is what .comment-content-wrapper uses */
            --h-comment-bg-color: ${toRgba(
              s.genericCommentBgHex,
              s.genericCommentBgOpacity
            )};
            
            /* MY COMMENT (The Blue Box) */
            --h-own-comment-bg-color: ${toRgba(
              s.myCommentBgHex,
              s.myCommentBgOpacity
            )};
            
            /* Inputs & Avatars */
            --bg-tertiary: ${toRgba(
              s.inputsAvatarsBgHex,
              s.inputsAvatarsBgOpacity
            )};
            --h-bg-color-tertiary: ${toRgba(
              s.inputsAvatarsBgHex,
              s.inputsAvatarsBgOpacity
            )};

            /* --- Harness & Ratings --- */
            --h-harness-bg-color: ${toRgba(s.harnessBgHex, s.harnessBgOpacity)};
            --h-harness-border-color: ${s.harnessBorderColor};
            
            --h-rating-panel-bg-color: ${toRgba(
              s.ratingPanelBgHex,
              s.ratingPanelBgOpacity
            )};
            --h-rating-panel-border-color: ${s.ratingPanelBorderColor};
            --h-rating-glow-color: ${s.ratingPanelGlowColor};
            
            /* --- Layout & Lines --- */
            --indentation: ${s.indentation}px;
            --line-color: ${s.lineColor};
            
            --h-font-size-comment: ${s.fontSizeComment}px;
            --h-font-size-header: ${s.fontSizeHeader}px;
            --h-font-size-timestamp: ${s.fontSizeTimestamp}px;
            
            --h-arrow-size: ${s.arrowSize}px;
            --h-arrow-vertical-offset: ${s.arrowVerticalOffset}px;
            --h-arrow-shadow-width: ${s.arrowShadowWidth}px;
            --h-arrow-shadow-color: ${s.arrowShadowColor};
            
            --h-header-line-color: ${s.headerLineColor};
            --h-header-line-width: ${s.headerLineWidth}px;
            --h-header-line-vertical-offset: ${s.headerLineVerticalOffset}px;
            
            --h-avatar-margin-top: ${s.avatarMarginTop}px;
            --h-avatar-margin-right: ${s.avatarMarginRight}px;
            --h-content-margin-left: ${s.commentContentMarginLeft}px;
        }

        body.comments-active {
            font-family: var(--font-sans);
            background-color: var(--bg-primary);
            color: var(--text-primary);
        }
    `;
  }

  _mapSettingsToVariables(settings) {
    // Helper: Only convert if the Hex exists. Otherwise return null.
    // This prevents overwriting defaults with 'transparent' when passing partial/empty config.
    const getRgbaOrNull = (hex, opacity) => {
      if (!hex) return null;
      return this._hexToRgba(hex, opacity ?? 1);
    };

    return {
      '--h-font-family': settings.fontFamily || null,
      '--h-font-size-comment': settings.fontSizeComment
        ? `${settings.fontSizeComment}px`
        : null,
      '--h-font-size-header': settings.fontSizeHeader
        ? `${settings.fontSizeHeader}px`
        : null,
      '--h-font-size-timestamp': settings.fontSizeTimestamp
        ? `${settings.fontSizeTimestamp}px`
        : null,

      '--h-text-color-primary': settings.textColorPrimary || null,
      '--h-text-color-secondary': settings.textColorSecondary || null,
      '--h-text-color-tertiary': settings.textColorTertiary || null,
      '--h-username-color': settings.usernameColor || null,
      '--h-accent-color': settings.accentColor || null,

      // --- CRITICAL FIX: Use getRgbaOrNull ---
      // If settings.bodyPostBoxBgHex is undefined, this returns null.
      // The updateTheme method filters out nulls, so the Default Red/Black styles stay active.
      '--h-bg-color-primary': getRgbaOrNull(
        settings.bodyPostBoxBgHex,
        settings.bodyPostBoxBgOpacity
      ),
      '--h-bg-color-secondary': getRgbaOrNull(
        settings.mainPanelBgHex,
        settings.mainPanelBgOpacity
      ),
      '--h-bg-color-tertiary': getRgbaOrNull(
        settings.inputsAvatarsBgHex,
        settings.inputsAvatarsBgOpacity
      ),

      '--h-rating-panel-bg-color': getRgbaOrNull(
        settings.ratingPanelBgHex,
        settings.ratingPanelBgOpacity
      ),
      '--h-own-comment-bg-color': getRgbaOrNull(
        settings.myCommentBgHex,
        settings.myCommentBgOpacity
      ),
      '--h-comment-bg-color': getRgbaOrNull(
        settings.genericCommentBgHex,
        settings.genericCommentBgOpacity
      ),
      '--h-harness-bg-color': getRgbaOrNull(
        settings.harnessBgHex,
        settings.harnessBgOpacity
      ),

      '--h-rating-glow-color': settings.ratingPanelGlowColor || null,
      '--h-arrow-size': settings.arrowSize ? `${settings.arrowSize}px` : null,
      '--h-avatar-margin-top': settings.avatarMarginTop
        ? `${settings.avatarMarginTop}px`
        : null,
      '--h-avatar-margin-right': settings.avatarMarginRight
        ? `${settings.avatarMarginRight}px`
        : null,
      '--h-rating-panel-border-color': settings.ratingPanelBorderColor || null,
      '--h-button-text-color': settings.buttonTextColor || null,
      '--h-harness-border-color': settings.harnessBorderColor || null,

      '--h-arrow-vertical-offset': settings.arrowVerticalOffset
        ? `${settings.arrowVerticalOffset}px`
        : null,
      '--h-header-line-color': settings.headerLineColor || null,
      '--h-header-line-width': settings.headerLineWidth
        ? `${settings.headerLineWidth}px`
        : null,
      '--h-header-line-vertical-offset': settings.headerLineVerticalOffset
        ? `${settings.headerLineVerticalOffset}px`
        : null,
      '--h-arrow-shadow-color': settings.arrowShadowColor || null,
      '--h-arrow-shadow-width': settings.arrowShadowWidth
        ? `${settings.arrowShadowWidth}px`
        : null,
      '--h-content-margin-left': settings.commentContentMarginLeft
        ? `${settings.commentContentMarginLeft}px`
        : null,
    };
  }

  updateTheme(settings) {
    const variables = this._mapSettingsToVariables(settings);

    const cssRules = Object.entries(variables)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${value};`)
      .join(' ');

    const cssString = `:root { ${cssRules} }`;
    applyCss(cssString, 'comments-theme-overrides');

    const geometryKeys = [
      'indentation',
      'verticalPadding',
      'animationDuration',
      'lineColor',
      'lineWidth',
      'lineRadius',
      'timestampFormat',
      'lineConnectionPointXOffset',
      'lineConnectionPointYOffset',
      'lineEndpointOffset',
    ];
    const geometrySettings = {};
    geometryKeys.forEach((key) => {
      if (settings[key] !== undefined) geometrySettings[key] = settings[key];
    });

    return geometrySettings;
  }

  getDemoBannerStyles() {
    return `
        .demo-mode-banner-wrapper {
            margin-bottom: 18px;
        }

        .demo-mode-banner {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 14px 16px;
            border-radius: 16px;
            overflow: hidden;
            transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .demo-mode-banner:hover {
            transform: translateY(-1px);
        }

        .demo-mode-banner-content {
            min-width: 0;
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .demo-mode-banner-side {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .demo-mode-banner-kicker {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            opacity: 0.82;
        }

        .demo-mode-banner-message {
            min-width: 0;
        }

        .demo-mode-banner-text {
            margin: 0;
            font-size: 14px;
            line-height: 1.45;
        }

        .demo-mode-banner-text strong {
            font-weight: 800;
        }

        .demo-mode-inline-link {
            color: inherit;
            font-weight: 900;
            text-decoration: underline;
            text-decoration-thickness: 2px;
            text-underline-offset: 2px;
        }

        .demo-mode-inline-link:hover {
            opacity: 0.88;
        }

        .demo-mode-banner-toggle {
            border: none;
            background: transparent;
            padding: 0;
            cursor: pointer;
            transition: transform 0.15s ease;
        }

        .demo-mode-banner-toggle:hover {
            transform: translateY(-1px);
        }

        .demo-mode-banner-toggle:disabled {
            opacity: 0.65;
            cursor: progress;
            transform: none;
        }

        .demo-mode-toggle-track {
            position: relative;
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: center;
            min-width: 170px;
            padding: 6px;
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(18,22,28,0.55);
            box-shadow:
                inset 0 1px 0 rgba(255,255,255,0.06),
                0 6px 18px rgba(0,0,0,0.18);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            overflow: hidden;
        }

        .demo-mode-toggle-fill {
            position: absolute;
            top: 6px;
            left: 6px;
            width: calc(50% - 6px);
            height: calc(100% - 12px);
            border-radius: 18px;
            transition: transform 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
            z-index: 1;
        }

        .demo-mode-banner-toggle.is-demo-mode .demo-mode-toggle-fill {
            transform: translateX(100%);
        }

        .demo-mode-banner-toggle.is-real-mode .demo-mode-toggle-fill {
            transform: translateX(0%);
        }

        .demo-mode-toggle-label {
            position: relative;
            z-index: 2;
            padding: 12px 18px;
            font-size: 12px;
            font-weight: 800;
            text-align: center;
            white-space: nowrap;
            user-select: none;
        }

        .demo-mode-popup-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .demo-mode-popup-card {
            width: min(920px, calc(100vw - 40px));
            max-height: calc(100vh - 40px);
            overflow: auto;
            border-radius: 18px;
            background: linear-gradient(180deg, rgba(30,30,34,0.98), rgba(18,18,21,0.98));
            border: 1px solid rgba(255,255,255,0.14);
            box-shadow: 0 18px 60px rgba(0,0,0,0.45);
            color: var(--text-primary);
        }

        .demo-mode-popup-header {
            position: sticky;
            top: 0;
            z-index: 2;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            padding: 16px 18px;
            background: rgba(20,20,24,0.9);
            border-bottom: 1px solid rgba(255,255,255,0.08);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .demo-mode-popup-title {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 0.01em;
        }

        .demo-mode-popup-close {
            border: none;
            background: rgba(255,255,255,0.08);
            color: var(--text-primary);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            font-size: 24px;
            line-height: 1;
            cursor: pointer;
        }

        .demo-mode-popup-close:hover {
            background: rgba(255,255,255,0.14);
        }

        .demo-mode-popup-body {
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .demo-mode-popup-body p {
            margin: 0;
            color: var(--text-secondary);
            line-height: 1.6;
        }

        .demo-mode-popup-list-title {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-tertiary);
            margin-top: 4px;
        }

        .demo-mode-popup-list {
            margin: 0;
            padding-left: 20px;
            color: var(--text-secondary);
            line-height: 1.6;
        }

        .demo-mode-popup-image-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-top: 4px;
            align-items: stretch;
        }

        .demo-mode-popup-image {
            width: 100%;
            height: 260px;
            display: block;
            object-fit: contain;
            object-position: center center;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.12);
            box-shadow: 0 10px 30px rgba(0,0,0,0.35);
            background:
                linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)),
                rgba(10,10,12,0.95);
            padding: 8px;
            box-sizing: border-box;
        }

        .demo-mode-popup-footer-note {
            margin-top: 4px;
            font-size: 13px;
            color: var(--text-tertiary);
            font-style: italic;
        }

        .demo-mode-banner.theme-sticky-note {
            border: 1px solid rgba(120, 92, 16, 0.28);
            background:
                linear-gradient(180deg, rgba(255, 248, 173, 0.96), rgba(250, 231, 123, 0.96));
            color: #4a3b08;
            box-shadow:
                0 10px 24px rgba(0,0,0,0.18),
                0 2px 0 rgba(255,255,255,0.4) inset;
            font-family: "Architects Daughter", "Segoe Print", "Comic Sans MS", cursive;
            transform: rotate(-0.4deg);
        }

        .demo-mode-banner.theme-sticky-note:hover {
            transform: rotate(-0.4deg) translateY(-1px);
        }

        .demo-mode-banner.theme-sticky-note .demo-mode-banner-kicker {
            font-family: "Architects Daughter", "Segoe Print", "Comic Sans MS", cursive;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: none;
            opacity: 0.9;
        }

        .demo-mode-banner.theme-sticky-note .demo-mode-banner-text {
            font-family: "Architects Daughter", "Segoe Print", "Comic Sans MS", cursive;
            font-size: 15px;
            line-height: 1.28;
            letter-spacing: 0;
            text-transform: none;
        }

        .demo-mode-banner.theme-sticky-note .demo-mode-inline-link {
            color: #7b2f00;
            text-decoration-color: #7b2f00;
        }

        .demo-mode-banner.theme-sticky-note .demo-mode-toggle-track {
            border-color: rgba(74, 59, 8, 0.22);
            background: rgba(255,255,255,0.42);
            box-shadow: none;
        }

        .demo-mode-banner.theme-sticky-note .demo-mode-toggle-label {
            font-family: "Architects Daughter", "Segoe Print", "Comic Sans MS", cursive;
            font-size: 13px;
            letter-spacing: 0;
            text-transform: none;
            color: #4a3b08;
            padding: 9px 13px;
        }

        .demo-mode-banner.theme-sticky-note .demo-mode-toggle-fill {
            background: rgba(255,255,255,0.75);
            box-shadow: none;
        }

        .demo-mode-banner.theme-blueprint {
            border: 1px solid rgba(163, 214, 255, 0.26);
            background:
                linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(180deg, rgba(15, 45, 84, 0.95), rgba(8, 28, 54, 0.95));
            background-size: 20px 20px, 20px 20px, auto;
            color: #dbeeff;
            box-shadow: 0 10px 24px rgba(0,0,0,0.18);
            font-family: "Patrick Hand SC", "Segoe UI", sans-serif;
            padding: 10px 12px;
            border-radius: 10px;
            gap: 12px;
        }

        .demo-mode-banner.theme-blueprint .demo-mode-banner-content {
            gap: 1px;
        }

        .demo-mode-banner.theme-blueprint .demo-mode-banner-kicker {
            color: #d7f0ff;
            font-family: "Patrick Hand SC", "Segoe UI", sans-serif;
            font-size: 10px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            opacity: 0.95;
            transform: rotate(-0.8deg);
            transform-origin: left center;
        }

        .demo-mode-banner.theme-blueprint .demo-mode-banner-text {
            font-family: "Patrick Hand SC", "Segoe UI", sans-serif;
            font-size: 14px;
            line-height: 1.18;
            letter-spacing: 0.015em;
            text-transform: uppercase;
            transform: rotate(-0.35deg);
            transform-origin: left center;
        }

        .demo-mode-banner.theme-blueprint .demo-mode-inline-link {
            color: #fff799;
            text-decoration-color: #fff799;
            text-decoration-thickness: 2px;
        }

        .demo-mode-banner.theme-blueprint .demo-mode-banner-side {
            align-self: center;
        }

        .demo-mode-banner.theme-blueprint .demo-mode-toggle-track {
            min-width: 128px;
            padding: 4px;
            border-radius: 15px;
            border-color: rgba(163, 214, 255, 0.26);
            background: rgba(7, 25, 48, 0.48);
            box-shadow:
                inset 0 1px 0 rgba(255,255,255,0.04),
                0 3px 10px rgba(0,0,0,0.14);
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
        }

        .demo-mode-banner.theme-blueprint .demo-mode-toggle-label {
            font-family: "Patrick Hand SC", "Segoe UI", sans-serif;
            font-size: 12px;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            color: #eefaff;
            transform: rotate(-0.25deg);
            padding: 7px 10px;
        }

        .demo-mode-banner.theme-blueprint .demo-mode-toggle-fill {
            top: 4px;
            left: 4px;
            width: calc(50% - 4px);
            height: calc(100% - 8px);
            border-radius: 12px;
            background: linear-gradient(180deg, rgba(76,116,192,0.96), rgba(50,88,162,0.96));
            box-shadow:
                0 3px 8px rgba(16,32,67,0.26),
                inset 0 1px 0 rgba(255,255,255,0.14);
        }

        @media (max-width: 780px) {
            .demo-mode-banner {
                flex-direction: column;
                align-items: stretch;
            }

            .demo-mode-banner-side {
                justify-content: flex-start;
            }

            .demo-mode-popup-image-row {
                grid-template-columns: 1fr;
            }
        }
    `;
  }

  ensureGoogleFontLoaded(fontFamily, href) {
    if (!fontFamily || !href) return;

    const existing = document.querySelector(
      `link[data-comments-google-font="${fontFamily}"]`
    );
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-comments-google-font', fontFamily);
    document.head.appendChild(link);
  }

}

