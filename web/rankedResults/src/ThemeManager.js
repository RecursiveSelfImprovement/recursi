/** Central place to register & apply UI themes */
class ThemeManager {
  static palettes = {
    light: `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Montserrat:wght@700&display=swap');
      body{background:#f4f7f6;color:#2c3e50;font-family:'Inter',sans-serif;}
      .container{background:#ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.08);border-radius:12px;}
      .widget-area{background:#e8edec;border-radius:8px;}
      .theme-light .app-title{font-family:'Montserrat',sans-serif;color:#34495e;font-size:22px;line-height:1.15;}
      select,button,textarea{border:1px solid #dcdfe2;background:#fff;color:#2c3e50;}
      button{background-color:#3498db;color:#fff;border:none;cursor:pointer;transition:background-color .3s, transform .15s ease-out;}
      button:hover:not(:disabled){background-color:#2980b9;transform:translateY(-1px);}
      button:disabled{background-color:#cccccc;}
      .theme-light .pmwScoreBar{background-color: #5dade2;}
      .theme-light .pmwHost{background:#fdfdfd; border-color: #e1e5e8;}
      .theme-light .pmwRowLabel, .theme-light .pmwColLabelInner span, .theme-light .pmwRightColTitle, .theme-light .pmwRadioGroup legend {color:#34495e;}
      .theme-light .pmwRightColCell {color:#566573;}
      .theme-light .sankey-wrapper{background-color: #fdfdfd; border: 1px solid #e1e5e8;}
      .theme-light .sankey-dom-candidate-label{background-color: rgba(255, 255, 255, 0.7); color:#2c3e50;}
      .theme-light .sankey-dom-round-label{color:#2c3e50;}
      .theme-light .tabulation-controls legend{color:#2c3e50;}
    `,
    sublime: `
      @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@400;600&family=Playfair+Display:wght@700&display=swap');
      body{background:linear-gradient(120deg,#e0f7ff 0%,#f6e9ff 100%);color:#3a3c5a;font-family:'Raleway',sans-serif;}
      .container{background:rgba(255,255,255,0.85);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.6);box-shadow:0 8px 32px rgba(90,90,120,0.15);border-radius:16px;}
      .widget-area{background:rgba(255,255,255,0.7);backdrop-filter:blur(12px);border-radius:12px;box-shadow:inset 0 0 12px rgba(0,0,0,0.06);}
      .theme-sublime .app-title{font-family:'Playfair Display',serif;font-size:24px;line-height:1.15;background:linear-gradient(90deg,#a88bff 0%,#6dd5fa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent; text-shadow: 0 1px 2px rgba(255,255,255,0.5);}
      button{background:#a88bff;color:#ffffff;border:none;transition:all .2s;box-shadow:0 3px 8px rgba(168,139,255,0.3);}
      button:hover:not(:disabled){background:#b49cff;transform:translateY(-2px);box-shadow:0 6px 15px rgba(168,139,255,0.4), 0 0 10px rgba(170, 140, 255, 0.5);}
      button:disabled{opacity:.55;box-shadow:none;transform:none;}
      select,textarea{background:rgba(255,255,255,0.75);border:1px solid rgba(0,0,0,0.1);color:#3a3c5a;backdrop-filter:blur(8px);}
      textarea{background:rgba(255,255,255,0.65);}
      .theme-sublime .pmwHost{background:rgba(255,255,255,0.6);backdrop-filter:blur(10px);}
      .theme-sublime .pmwScoreBar{background: linear-gradient(90deg, #a88bff, #82baff);}
      .theme-sublime .pmwRowLabel,.theme-sublime .pmwColLabelInner span,.theme-sublime .pmwRightColTitle,.theme-sublime .pmwRightColCell,.theme-sublime .pmwRadioGroup legend,.theme-sublime .pmwRadioGroup label, .theme-sublime .tabulation-controls legend {color:#3a3c5a;}
      .theme-sublime .sankey-wrapper, .theme-sublime .sankey-diagram-svg rect[fill="#ffffff"]{fill:rgba(255,255,255,0.65)!important;backdrop-filter:blur(6px);}
      .theme-sublime .sankey-dom-candidate-label{background:rgba(255,255,255,0.8);color:#3a3c5a;box-shadow:0 1px 5px rgba(90,90,120,0.1);backdrop-filter:blur(4px);}
      .theme-sublime .sankey-dom-round-label{color:#3a3c5a;}
    `,
    dark: `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Montserrat:wght@700&display=swap');
      body{background:#1a1c20;color:#c8d0d8;font-family:'Inter',sans-serif;}
      .container{background:#23272d;box-shadow:0 0 25px rgba(0,0,0,.5);}
      .widget-area{background:#2c3138;}
      select,button,textarea{background:#3a414b;color:#c8d0d8;border:1px solid #5a636f;}
      button{background-color:#008cff;color:#fff;border:none;transition:all .2s ease; box-shadow: 0 0 8px rgba(0, 140, 255, 0);}
      button:hover:not(:disabled){background-color:#3aa8ff; box-shadow: 0 0 10px rgba(60, 170, 255, 0.7); transform:translateY(-1px);}
      button:disabled{background-color:#4a515a; color:#8d96a1;}
      .theme-dark .app-title{font-family:'Montserrat',sans-serif;color:#e1e8f0;font-size:22px;line-height:1.15;}
      .theme-dark .pmwHost{background:#202328;}
      .theme-dark .pmwScoreBar{background-color: #008cff;}
      .theme-dark .pmwRowLabel, .theme-dark .pmwColLabelInner span, .theme-dark .pmwRightColTitle, .theme-dark .pmwRadioGroup legend, .theme-dark .tabulation-controls legend {color:#c8d0d8;}
      .theme-dark .pmwRightColCell {color:#98a2ac;}
      .theme-dark .pmwWorstLossMargin{color:#ff8a80;}
      .theme-dark .sankey-wrapper, .theme-dark .sankey-diagram-svg rect[fill="#ffffff"]{fill:#202328!important;}
      .theme-dark .sankey-dom-candidate-label{background:rgba(20,22,26,0.8);color:#c8d0d8;backdrop-filter:blur(3px);}
      .theme-dark .sankey-dom-round-label{color:#c8d0d8; text-shadow: 0 0 3px rgba(200, 210, 220, 0.3);}
    `,
    warm: `
      @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Cinzel+Decorative:wght@700&display=swap');
      body{background:radial-gradient(circle at 15% 20%,rgba(255,94,147,.25) 0%,transparent 35%),radial-gradient(circle at 85% 85%,rgba(255,174,62,.25) 0%,transparent 40%),#1a0c10;color:#fce8f0;font-family:'Lora',serif;}
      .container{background:rgba(20,0,20,0.7);box-shadow:0 0 30px rgba(255,94,147,.25),0 0 40px rgba(255,174,62,.18);border:1px solid rgba(255,94,147,.3);backdrop-filter:blur(10px);border-radius:12px;}
      .widget-area{background:rgba(26,10,20,0.8);box-shadow:inset 0 0 10px rgba(255,94,147,.2),inset 0 0 14px rgba(255,174,62,.15);border-radius:8px;}
      .theme-warm .app-title{font-family:'Cinzel Decorative',serif;font-size:26px;line-height:1.2;background:linear-gradient(90deg,#ff6aa2 0%,#ffae3d 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 10px rgba(255,106,162,.6),0 0 15px rgba(255,174,62,.5);}
      select,button,textarea{background:rgba(28,14,22,0.9);border:1px solid rgba(255,94,147,.4);color:#fce8f0;font-family:'Lora',serif;}
      textarea{background:#120a10;}
      button{background:#ff5f99;color:#fff;text-shadow:0 0 6px #fff;border:1px solid #ff5f99;transition:all .2s ease-out;box-shadow:0 0 8px #ff5f99, 0 0 12px #ff5f99, inset 0 0 5px rgba(255,255,255,0.3);}
      button:hover:not(:disabled){transform:translateY(-2px) scale(1.05);box-shadow:0 0 15px #ff8fba, 0 0 25px #ff8fba, inset 0 0 8px rgba(255,255,255,0.4);}
      button:disabled{opacity:.5;box-shadow:none;text-shadow:none;transform:none;}
      .theme-warm .pmwHost{background:rgba(17,6,15,0.8);box-shadow:inset 0 0 10px rgba(255,94,147,.2),inset 0 0 14px rgba(255,174,62,.18);backdrop-filter:blur(5px);}
      .theme-warm .pmwScoreBar{background:linear-gradient(90deg, #d44e7f, #ff6aa2, #ff8cb8); box-shadow: 0 0 5px #ff6aa2;}
      .theme-warm .pmwRowLabel,.theme-warm .pmwColLabelInner span,.theme-warm .pmwRightColTitle,.theme-warm .pmwRadioGroup legend, .theme-warm .tabulation-controls legend {color:#fce8f0;text-shadow: 0 0 3px rgba(255,106,162,0.4);}
      .theme-warm .pmwRightColCell{color:#fadddd;}
      .theme-warm .pmwWorstLossMargin{color:#ff9ec5;}
      .theme-warm .sankey-wrapper, .theme-warm .sankey-diagram-svg rect[fill="#ffffff"]{fill:rgba(17,6,15,0.85)!important;}
      .theme-warm .sankey-dom-candidate-label{background:rgba(30,12,20,.85);color:#fce8f0;box-shadow:0 0 8px rgba(255,94,147,.3);backdrop-filter:blur(4px);border:1px solid rgba(255,94,147,.2);}
      .theme-warm .sankey-dom-round-label{color:#fce8f0; text-shadow: 0 0 4px rgba(255,106,162,0.5);}
    `,
    neon: `
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Jura:wght@400;600&display=swap');
      body{background:radial-gradient(circle at 20% 15%,rgba(0,212,255,.2) 0%,transparent 30%),radial-gradient(circle at 80% 85%,rgba(190,60,255,.2) 0%,transparent 35%),#020018;color:#e0f8ff;font-family:'Jura',sans-serif;}
      .container{background:rgba(1,6,33,0.7);box-shadow:0 0 25px rgba(0,255,255,.25),0 0 35px rgba(190,60,255,.18);border:1px solid rgba(85,234,255,.3);backdrop-filter:blur(10px);border-radius:12px;}
      .widget-area{background:rgba(0,20,51,0.8);box-shadow:inset 0 0 8px rgba(85,234,255,.25),inset 0 0 12px rgba(190,60,255,.18);border-radius:8px;}
      .theme-neon .app-title{font-family:'Orbitron',sans-serif;font-size:26px;line-height:1.2;background:linear-gradient(160deg,#55eaff 0%,#ae55ff 50%,#55eaff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 10px rgba(85,234,255,.7),0 0 15px rgba(174,85,255,.5);}
      select,button,textarea{border:1px solid rgba(85,234,255,.4);background:rgba(0,19,36,0.9);color:#e0f8ff;font-family:'Jura',sans-serif;}
      textarea{background:#000f26;}
      button{background:#00c3ff;color:#000;font-weight:bold;text-shadow:0 0 4px #fff;border:1px solid #00c3ff;transition:all .2s ease-out;box-shadow:0 0 8px #00c3ff, 0 0 12px #00c3ff, 0 0 18px #ae55ff, inset 0 0 5px rgba(255,255,255,0.4);}
      button:hover:not(:disabled){transform:translateY(-2px) scale(1.05);box-shadow:0 0 15px #87faff, 0 0 25px #87faff, 0 0 35px #c38fff, inset 0 0 8px rgba(255,255,255,0.5);}
      button:disabled{opacity:.5;box-shadow:none;text-shadow:none;transform:none;background:#555b;}
      .theme-neon .pmwHost{background:rgba(0,14,42,0.8);box-shadow:inset 0 0 10px rgba(85,234,255,.2),inset 0 0 15px rgba(174,85,255,.18);backdrop-filter:blur(5px);}
      .theme-neon .pmwScoreBar{background:linear-gradient(90deg, #00c3ff, #55eaff); box-shadow: 0 0 5px #55eaff;}
      .theme-neon .pmwRowLabel, .theme-neon .pmwColLabelInner span, .theme-neon .pmwRightColTitle, .theme-neon .pmwRadioGroup legend, .theme-neon .tabulation-controls legend {color:#e0f8ff; text-shadow: 0 0 3px rgba(85, 234, 255, 0.5);}
      .theme-neon .pmwRightColCell{color:#cceeff;}
      .theme-neon .pmwWorstLossMargin{color:#ff9dce;}
      .theme-neon .sankey-wrapper, .theme-neon .sankey-diagram-svg rect[fill="#ffffff"]{fill:rgba(0,14,42,0.85)!important;}
      .theme-neon .sankey-dom-candidate-label{background:rgba(0,20,40,.85);color:#e0f8ff;box-shadow:0 0 8px rgba(85,234,255,.3);backdrop-filter:blur(4px);border:1px solid rgba(85,234,255,.2);}
      .theme-neon .sankey-dom-round-label{color:#e0f8ff; text-shadow: 0 0 5px rgba(85,234,255,0.6);}
    `,
  };

  static apply(mode = 'light') {
    /* 1 ▸ flip body class ---------------------------- */
    document.body.classList.remove(
      'theme-light',
      'theme-dark',
      'theme-neon',
      'theme-warm',
      'theme-sublime'
    );
    document.body.classList.add(
      mode === 'dark'
        ? 'theme-dark'
        : mode === 'neon'
        ? 'theme-neon'
        : mode === 'warm'
        ? 'theme-warm'
        : mode === 'sublime'
        ? 'theme-sublime'
        : 'theme-light'
    );

    /* 2 ▸ wipe previous injected block --------------- */
    applyCss('', 'appTheme');

    /* 3 ▸ look up requested palette ------------------ */
    const css = ThemeManager.palettes[mode] || ThemeManager.palettes.light;

    /* 4 ▸ always append shared picker rule ----------- */
    const shared = `.theme-select{background:inherit;color:inherit;border-color:inherit;}`;

    applyCss(css + shared, 'appTheme');
  }

  static addTheme(id, cssString) {
    ThemeManager.palettes[id] = cssString;
  }
}