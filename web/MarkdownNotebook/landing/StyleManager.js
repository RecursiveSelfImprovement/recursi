
class StyleManager {
  static init() {
    this.applyVariables();
    this.applyBaseStyles();
    this.applyBackgroundStyles();
    this.applyTypography();
    this.applyLayoutStyles();
    this.applyComponentStyles();
    this.applyMvgStyles();
  }

  static applyVariables() {
    const css = `
    :root {
      --accent-color: #3b82f6;
      --accent-hover: #2563eb;
      --glass-bg: rgba(0, 0, 0, 0.45);
      --glass-border: rgba(255, 255, 255, 0.1);
      --text-main: #ffffff;
      --text-muted: #cccccc;
    }
    `;
    applyCss(css, 'style-vars');
  }

  static applyBaseStyles() {
    const css = `
    body {
      font-family: 'Inter', system-ui, sans-serif;
      margin: 0;
      padding: 0;
      color: var(--text-main);
      min-height: 100vh;
      overflow-x: hidden;
    }
    * { box-sizing: border-box; }
    
    /* Scrollbar styling */
    ::-webkit-scrollbar { width: 10px; }
    ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 5px; }
    `;
    applyCss(css, 'style-base');
  }

  static applyBackgroundStyles() {
    const css = `
    .app-background {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      /* Using the same resource as your bookmarklet page for consistency */
      background-image: url('https://recursi.dev/SiteResources/frontPage/mainImage.png'); 
      background-size: cover;
      background-position: center;
      z-index: -2;
    }
    .app-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.75); /* Slightly darker for text readability */
      z-index: -1;
      pointer-events: none;
    }
    `;
    applyCss(css, 'style-bg');
  }

  static applyTypography() {
    const css = `
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 4.5rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1.1;
      margin: 0 0 20px 0;
      
      background: linear-gradient(135deg, #ffffff 30%, #a5f3fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
    }
    
    .hero-subtitle {
      font-size: 1.5rem;
      color: var(--text-muted);
      font-weight: 300;
      max-width: 600px;
      margin: 0 auto 40px auto;
      line-height: 1.5;
    }
    `;
    applyCss(css, 'style-type');
  }

  static applyLayoutStyles() {
    const css = `
    .landing-layout {
      max-width: 1200px;
      margin: 0 auto;
      padding: 80px 20px;
      text-align: center;
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 80vh;
      justify-content: center;
    }

    .hero-section {
      margin-bottom: 80px;
      animation: fadeInDown 0.8s ease-out;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      width: 100%;
      animation: fadeInUp 1s ease-out 0.2s backwards;
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    `;
    applyCss(css, 'style-layout');
  }

  static applyComponentStyles() {
    const css = `
    .feature-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      padding: 30px;
      border-radius: 16px;
      text-align: left;
      transition: transform 0.3s, background 0.3s;
    }
    .feature-card:hover {
      transform: translateY(-5px);
      background: rgba(40, 40, 40, 0.75);
    }
    .feature-card h3 {
      color: #fff;
      font-family: 'Outfit', sans-serif;
      font-size: 1.4rem;
      margin-top: 0;
    }
    .feature-card p {
      color: #aaa;
      line-height: 1.6;
      font-size: 1rem;
    }

    .btn-large {
      padding: 15px 40px;
      font-size: 1.2rem;
      border-radius: 50px;
      background: linear-gradient(135deg, var(--accent-color), var(--accent-hover));
      color: white;
      border: none;
      cursor: pointer;
      font-weight: 700;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
      transition: transform 0.2s, filter 0.2s, box-shadow 0.2s;
    }
    .btn-large:hover {
      transform: scale(1.05);
      filter: brightness(1.1);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
    }
    `;
    applyCss(css, 'style-components');
  }

  static applyMvgStyles() {
    // MVG branding removed — keeping empty method to avoid breaking init()
  }
}



