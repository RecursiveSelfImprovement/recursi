class AccuDrawValuation {
  async run(env) {
      if (!env || !env.container) {
        throw new Error("run() requires an environment object with a valid container.");
      }
      this.env = env;
      this.targetElement = env.container;

      // Add active marker class to the body element
      document.body.classList.add('js-active');

      // Initialize theme from storage defaulting to light mode
      this.currentTheme = localStorage.getItem('accudraw-valuation-theme') || 'light';

      // 1. Load the Google Font Comfortaa
      this.loadGoogleFont();

      // 2. Gather raw content from index.html
      const data = this.parseRawContent();

      // 3. Setup state variables
      this.setupState(data);

      // 4. Inject CAD engineering theme styles with softened light theme variables
      this.applyPremiumStyles();

      // Preload drumroll resource proactively if class is available
      if (window.SnareDrumAnimation) {
        try {
          SnareDrumAnimation.preload('/LogoExperiments/drumroll.mp4');
        } catch (e) {
          console.warn("Drumroll preloading fallback:", e);
        }
      }

      // 5. Draw the application layout
      this.renderApp();
    }

  onResize(width, height) {
      if (this.containerSizeDisplay) {
        this.containerSizeDisplay.textContent = `Container size: ${Math.round(
          width
        )}W x ${Math.round(height)}H`;
      }
    }

  createConfigurableBox() {
      if (!this.configTextarea || !this.statusDiv) {
        console.error('Required elements not initialized.');
        return;
      }

      const jsonString = this.configTextarea.value;
      let options;

      try {
        options = JSON.parse(jsonString);
        options.env = this.env; // ENSURE DIALOG IS BOUND TO ENVIRONMENT
        this.statusDiv.textContent = 'Creating box with provided config...';

        const configuredBox = UITools.makeDialog(options);

        if (!options.contentHTML && !options.contentElement) {
          configuredBox.contentElement.appendChild(
            makeElement(
              'p',
              { style: { marginTop: 0 } },
              `Box created with title: "${options.title || 'Untitled'}"`
            )
          );
          configuredBox.contentElement.appendChild(
            makeElement(
              'p',
              `Size: ${options.size ? options.size.join('x') : 'Default'}`
            )
          );
        }

        this.configuredBoxes.push(configuredBox);
        this.statusDiv.textContent = `DialogBox "${options.title || 'Untitled'}" created successfully. Count: ${this.configuredBoxes.length}`;
      } catch (error) {
        console.error('Error parsing JSON config:', error);
        this.statusDiv.textContent = `Error: Invalid JSON configuration. ${error.message}`;
        alert(`Invalid JSON configuration:\n${error.message}\nPlease check the text area.`);
      }
    }

  getLastConfiguredBox() {
      return this.configuredBoxes.length > 0
        ? this.configuredBoxes[this.configuredBoxes.length - 1]
        : null;
    }

  destroy() {
      if (this.valueEmberLogo) {
        this.valueEmberLogo.destroy();
      }
      if (this._currentKeydownHandler) {
        window.removeEventListener('keydown', this._currentKeydownHandler);
      }
    }


  parseRawContent() {
      const rawElement = document.getElementById('raw-content');
      
      const fallback = {
        title: "AccuDraw & SmartLine Value Valuation",
        prompts: [
          { id: "1", text: "tell me everything you know about accudraw and smartline in microstation" },
          { id: "2", text: "how important are they to the success of microstation and bentley systems?" },
          { id: "3", text: "assume they were both developed by a single person, who had received a sole inventor patent for similar idea at a different company (Intergraph, which at the time owned 50% of Bentley systems), then arrived at bentley systems in 1994 and quickly implemented them while working around the previous patent which was assigned to Intergraph, receiving the sole patent again (bentley's first patent). what is your rough estimate as to how much value they brought bentley in terms of profit and/or contribution to market cap?" }
        ],
        models: [
          {
            key: "claude",
            name: "Claude 3.5 Sonnet",
            min: "2.0B",
            max: "5.0B",
            pct: 33,
            color: "#f59e0b",
            url: "https://claude.ai/share/d86cd05e-18b6-48a9-8c75-c55d32457756",
            quotes: [
              "My rough estimate: $2-5 billion in enterprise value contribution, with the most defensible point estimate around $3 billion - roughly 30% of Bentley's current market cap, reflecting the fact that AccuDraw and SmartLine weren't just features but the competitive foundation that let MicroStation win and hold the professional infrastructure CAD market during the decade that mattered most.",
              "The sole inventor of both, arriving in 1994 and immediately delivering Bentley's first patent, would have an extremely strong argument that this contribution is among the highest-leverage individual technical contributions in the history of infrastructure software."
            ]
          },
          {
            key: "gemini",
            name: "Gemini 1.5/3.5 Pro",
            min: "1.5B",
            max: "3.5B",
            pct: 27,
            color: "#3b82f6",
            url: "https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221KauHXifVO0ic-dTm5xabfotN7HnsE8ew%22%5D,%22action%22:%22open%22,%22userId%22:%22110615187007890782355%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing",
            quotes: [
              "In CAD, muscle memory is a powerful lock-in mechanism. By introducing a highly efficient, hotkey-driven drafting system, Bentley built a user base that was highly resistant to switching to other platforms.",
              "AccuDraw solved the 3D input problem for Bentley years before many competitors had an elegant solution.",
              "A reasonable estimate suggests that the development and patenting of AccuDraw and SmartLine contributed between $1.5 billion and $3.5 billion to Bentley Systems' current market capitalization, primarily by serving as the core usability engine that prevented customer churn to Autodesk during the peak years of CAD adoption."
            ]
          },
          {
            key: "chatgpt",
            name: "ChatGPT-4o",
            min: "1.0B",
            max: "3.0B",
            pct: 22,
            color: "#10b981",
            url: "https://chatgpt.com/share/6a31433e-680c-83e8-8afc-2fcb21db36c7",
            quotes: [
              "Around $1-3 billion as a plausible range for their contribution to Bentley's long-term enterprise value.",
              "If someone claimed that AccuDraw and SmartLine, together, ultimately created around a billion dollars or more of value for Bentley over several decades, I would consider that a defensible hypothesis."
            ]
          },
          {
            key: "grok",
            name: "Grok 2",
            min: "500M",
            max: "2.0B+",
            pct: 14,
            color: "#a855f7",
            url: "https://x.com/i/grok/share/5a2a97e1efb345dab63242bcf423e62b",
            quotes: [
              "These could easily account for 20-40% (or more) of Bentley's valuation premium during key periods-hundreds of millions to low billions in attributed enterprise value today, as they underpin user productivity claims that support the entire product line.",
              "Overall ballpark: $500 million to $2+ billion in total economic value (profits + valuation uplift) across Bentley's history.",
              "Under this scenario, one person's patented ideas would rank among the highest-ROI contributions in Bentley's history - a true 'company-making' innovation that paid dividends for decades."
            ]
          }
        ]
      };

      if (!rawElement) return fallback;

      try {
        const title = rawElement.querySelector('header h1')?.textContent || fallback.title;

        const prompts = [];
        rawElement.querySelectorAll('#raw-prompts .prompt-item').forEach(el => {
          prompts.push({
            id: el.getAttribute('data-id') || "1",
            text: el.querySelector('p')?.textContent || ""
          });
        });

        const models = [];
        rawElement.querySelectorAll('#raw-models .model-data').forEach(el => {
          const quotes = [];
          el.querySelectorAll('.quotes .quote').forEach(q => {
            quotes.push(q.textContent.trim());
          });

          models.push({
            key: el.getAttribute('data-key') || "unknown",
            name: el.getAttribute('data-name') || "Model",
            min: el.getAttribute('data-min') || "0",
            max: el.getAttribute('data-max') || "0",
            pct: parseInt(el.getAttribute('data-pct') || "10"),
            color: el.getAttribute('data-color') || "#3b82f6",
            url: el.getAttribute('data-url') || "#",
            quotes: quotes
          });
        });

        const mergedModels = fallback.models.map(m => {
          const parsed = models.find(pm => pm.key === m.key);
          if (parsed) {
            return {
              ...m,
              quotes: parsed.quotes.length ? parsed.quotes : m.quotes,
              url: parsed.url || m.url,
              min: parsed.min || m.min,
              max: parsed.max || m.max,
              pct: parsed.pct || m.pct
            };
          }
          return m;
        });

        return {
          title,
          prompts: prompts.length ? prompts : fallback.prompts,
          models: mergedModels
        };
      } catch (err) {
        console.warn("Parsing raw HTML data failed, using default values.", err);
        return fallback;
      }
    }

  setupState(data) {
      this.data = data;
      this.activeTab = 'all';
      this.resultsRevealed = false;
      this.isTransitioning = false;
      this.revealMode = localStorage.getItem('accudraw-reveal-mode') || 'drum-roll';
      this.wrongAnswerStage = 0;
      this.justCorrected = false;
    }

  applyPremiumStyles() {
      applyCss(`
        /* Deep global viewport reset to prevent white borders at outer edges */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          min-height: 100vh;
          width: 100%;
          background-color: #070a12;
        }

        html:has(.theme-light), body:has(.theme-light) {
          background-color: #f1f5f9;
        }

        .cad-container, .cad-container * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Base Typography & Background Grid */
        .cad-container {
          --bg-primary: #070a12;
          --bg-grid: rgba(255, 255, 255, 0.02);
          --bg-panel: #0c111d;
          --bg-panel-inner: #05070a;
          --text-primary: #cbd5e1;
          --text-secondary: #94a3b8;
          --text-title: #ffffff;
          --border-color: #1e293b;
          --border-hover: #334155;
          --btn-bg: #1e293b;
          --btn-hover: #334155;
          --btn-text: #e2e8f0;
          --accent-story-from: rgba(59, 130, 246, 0.06);
          --accent-story-to: rgba(168, 85, 247, 0.06);
          
          background-color: var(--bg-primary);
          color: var(--text-primary);
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          min-height: 100vh;
          width: 100%;
          transition: background-color 0.3s ease, color 0.3s ease;
          padding: 48px 16px;
        }

        .cad-container.theme-light {
          --bg-primary: #f1f5f9;
          --bg-grid: rgba(100, 116, 139, 0.06);
          --bg-panel: #ffffff;
          --bg-panel-inner: #f8fafc;
          --text-primary: #334155;
          --text-secondary: #64748b;
          --text-title: #0f172a;
          --border-color: #cbd5e1;
          --border-hover: #94a3b8;
          --btn-bg: #e2e8f0;
          --btn-hover: #cbd5e1;
          --btn-text: #0f172a;
          --accent-story-from: rgba(59, 130, 246, 0.04);
          --accent-story-to: rgba(168, 85, 247, 0.04);
        }

        .cad-grid-bg {
          background-size: 32px 32px;
          background-image: 
            linear-gradient(to right, var(--bg-grid) 1px, transparent 1px),
            linear-gradient(to bottom, var(--bg-grid) 1px, transparent 1px);
        }

        .cad-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 48px;
        }

        /* Panel & Container Styling */
        .cad-panel {
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 32px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease;
        }
        .cad-panel:hover {
          border-color: var(--border-hover);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }

        /* Minimal Header */
        .minimal-header {
          display: flex;
          flex-direction: column;
          gap: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 24px;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .tags-wrapper {
          display: flex;
          gap: 8px;
        }
        .tag-pill {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 4px;
        }
        .tag-pill-blue {
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .tag-pill-slate {
          background-color: rgba(148, 163, 184, 0.1);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .title-group h1 {
          font-size: 32px;
          font-weight: 800;
          color: var(--text-title);
          letter-spacing: -0.02em;
          margin-bottom: 8px;
          line-height: 1.1;
        }
        @media (min-width: 768px) {
          .title-group h1 { font-size: 44px; }
        }
        .title-subtitle {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-family: ui-monospace, monospace;
          color: var(--text-secondary);
          font-weight: 600;
        }

        /* Theme Switcher */
        .theme-switcher {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          background-color: var(--btn-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .theme-switcher button {
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 4px;
          outline: none;
        }
        .theme-switcher button.active {
          background-color: #3b82f6;
          color: #ffffff;
        }

        /* Reveal Mode Select (subtle, tucked below the theme switcher) */
        .reveal-mode-row {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
        }
        .reveal-mode-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 10.5px;
          font-family: ui-monospace, monospace;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 2px 4px;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.2s ease, color 0.2s ease;
          outline: none;
        }
        .reveal-mode-select:hover,
        .reveal-mode-select:focus {
          opacity: 0.9;
          color: var(--text-primary);
        }
        .reveal-mode-select option {
          background: var(--bg-panel);
          color: var(--text-primary);
        }

        /* Backstory Block Styles */
        .backstory-gradient-card {
          padding: 32px;
          border: 1px solid var(--border-color);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: linear-gradient(135deg, var(--accent-story-from), var(--accent-story-to));
        }
        .backstory-paragraph-highlight {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.6;
        }
        @media (min-width: 768px) {
          .backstory-paragraph-highlight { font-size: 18px; }
        }
        .backstory-paragraph {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        @media (min-width: 768px) {
          .backstory-paragraph { font-size: 15px; }
        }
        .backstory-paragraph-bold {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 16px;
        }

        /* Clean Local Inline Link Style */
        .inline-link-highlight {
          color: #2563eb;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: color 0.15s ease;
          display: inline;
        }
        .cad-container:not(.theme-light) .inline-link-highlight {
          color: #60a5fa;
        }
        .inline-link-highlight:hover {
          color: #3b82f6;
        }

        /* Prompts Section Styles */
        .prompts-header-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 6px;
        }
        .prompts-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 24px;
        }
        .prompt-card {
          padding: 20px;
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          transition: border-color 0.2s;
        }
        @media (min-width: 768px) {
          .prompt-card {
            flex-direction: row;
            align-items: center;
          }
        }
        .prompt-card:hover {
          border-color: var(--border-hover);
        }
        .prompt-content-wrapper {
          flex: 1;
        }
        .prompt-tag {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-family: ui-monospace, monospace;
          color: #3b82f6;
          font-weight: 600;
          display: block;
          margin-bottom: 6px;
        }
        .prompt-body {
          font-size: 14px;
          color: var(--text-primary);
          font-family: ui-monospace, monospace;
          font-style: italic;
          line-height: 1.6;
        }
        .copy-prompt-btn {
          padding: 10px 18px;
          background-color: var(--btn-bg);
          border: 1px solid var(--border-color);
          color: var(--btn-text);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .copy-prompt-btn:hover {
          background-color: var(--btn-hover);
          color: var(--text-title);
        }

        /* Reveal CTA Section */
        .reveal-cta-row {
          display: flex;
          justify-content: center;
          padding: 32px 0;
        }
        .reveal-main-button {
          width: 100%;
          max-width: 480px;
          padding: 24px;
          background: linear-gradient(135deg, #1d4ed8, #4338ca);
          border: none;
          color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.15);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .reveal-main-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(59, 130, 246, 0.25);
          background: linear-gradient(135deg, #2563eb, #4f46e5);
        }
        .reveal-main-button:active {
          transform: translateY(0);
        }
        .reveal-title-large {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        @media (min-width: 768px) {
          .reveal-title-large { font-size: 24px; }
        }
        .reveal-subtitle-small {
          font-size: 11px;
          color: #c7d2fe;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
          font-family: ui-monospace, monospace;
        }

        /* Consensus Block & Value Logo Styles */
        /* ALWAYS STYLED AS DARK (even in light theme) so the Glowing Ember stands out */
        .consensus-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 36px;
          border: 2px solid rgba(99, 102, 241, 0.25) !important;
          border-radius: 16px;
          background: linear-gradient(135deg, #090d16, #0c111d) !important;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.45) !important;
          color: #cbd5e1 !important;
        }
        @media (min-width: 768px) {
          .consensus-container {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .consensus-container .consensus-headline {
          color: #ffffff !important;
        }
        .consensus-container .consensus-description {
          color: #94a3b8 !important;
        }
        .consensus-container .consensus-badge {
          background-color: rgba(99, 102, 241, 0.15) !important;
          color: #a5b4fc !important;
          border: 1px solid rgba(99, 102, 241, 0.2) !important;
        }
        .consensus-container .consensus-figure-subtext {
          color: #94a3b8 !important;
        }
        
        /* Consensus Figure Pane styled perfectly with stable size and high spacing gap */
        .consensus-figure-pane {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        @media (min-width: 768px) {
          .consensus-figure-pane {
            align-items: flex-end;
            text-align: right;
          }
        }

        .glowing-consensus-value {
          font-family: 'Comfortaa', cursive, sans-serif !important;
          font-weight: 700;
          font-size: 38px;
          letter-spacing: -0.02em;
          color: #ffebd2 !important;
          cursor: pointer;
          user-select: none;
          position: relative;
          display: inline-flex;
          align-items: baseline;
          white-space: nowrap;
          overflow: visible !important;
        }
        @media (min-width: 768px) {
          .glowing-consensus-value { font-size: 48px; }
        }

        /* Wrong Answers Mode */
        .glowing-consensus-value.is-wrong {
          color: #fca5a5 !important;
          text-shadow: none !important;
        }
        .cad-container.theme-light .glowing-consensus-value.is-wrong {
          color: #dc2626 !important;
        }

        @keyframes wrongAnswerPulse {
          0%   { transform: scale(0.9); opacity: 0.25; filter: blur(2px); }
          55%  { transform: scale(1.05); opacity: 1; filter: blur(0); }
          100% { transform: scale(1); opacity: 1; filter: blur(0); }
        }
        .value-pulse {
          animation: wrongAnswerPulse 0.32s ease-out;
        }

        @keyframes recalcAppear {
          0%   { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .recalculate-btn {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 11px;
          font-weight: 700;
          font-family: ui-monospace, monospace;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          animation: recalcAppear 0.3s ease-out;
          transition: background-color 0.2s ease, transform 0.15s ease;
        }
        .recalculate-btn:hover {
          background: rgba(239, 68, 68, 0.18);
          transform: translateY(-1px);
        }
        .recalculate-btn:active {
          transform: translateY(0);
        }
        .recalculate-icon {
          font-size: 12px;
        }

        @keyframes correctFlash {
          0%   { opacity: 0; transform: scale(0.9); }
          15%  { opacity: 1; transform: scale(1.08); }
          30%  { opacity: 1; transform: scale(1); }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .consensus-figure-subtext.flash-correct {
          color: #34d399 !important;
          font-weight: 800;
          animation: correctFlash 1.4s ease-out forwards;
        }

        .consensus-figure-subtext {
          white-space: nowrap;
          margin-top: 16px; /* Plenty of room below the $2.3 Billion */
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
          font-weight: 700;
          font-family: ui-monospace, monospace;
        }

        /* Summary Dashboard Grid */
        .dashboard-header-group {
          margin-bottom: 24px;
        }
        .dashboard-header-group h3 {
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-title);
          letter-spacing: 0.05em;
          font-family: ui-monospace, monospace;
          margin-bottom: 6px;
        }
        .dashboard-header-group p {
          font-size: 14px;
          color: var(--text-secondary);
        }
        .dashboard-cards-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .dashboard-cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .dashboard-cards-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .model-metric-card {
          padding: 24px;
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 20px;
          text-align: center;
          transition: all 0.2s;
        }
        @media (min-width: 768px) {
          .model-metric-card { text-align: left; }
        }
        .model-metric-card:hover {
          border-color: var(--border-hover);
        }
        .metric-model-name {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: var(--text-secondary);
          font-family: ui-monospace, monospace;
        }
        .metric-model-value {
          font-size: 24px;
          font-weight: 700;
          font-family: 'Comfortaa', cursive, sans-serif;
          margin-top: 8px;
        }
        .metric-footer-label {
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
          font-size: 11px;
          font-family: ui-monospace, monospace;
          color: var(--text-secondary);
        }

        /* Highlight classes */
        .highlight-range {
          background-color: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: inline-block;
        }

        .highlight-percent {
          background-color: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          display: inline-block;
        }

        .cad-container.theme-light .highlight-percent {
          color: #1d4ed8;
          background-color: rgba(59, 130, 246, 0.08);
          border-color: rgba(59, 130, 246, 0.2);
        }

        .highlight-asymmetry {
          background-color: rgba(239, 68, 68, 0.12);
          color: #f87171;
          font-weight: 600;
          border-bottom: 2px dotted #ef4444;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .cad-container.theme-light .highlight-asymmetry {
          background-color: rgba(220, 38, 38, 0.06);
          color: #dc2626;
        }

        .highlight-merit {
          background-color: rgba(168, 85, 247, 0.08);
          color: #c084fc;
          font-weight: 600;
          border-bottom: 1.5px solid #a855f7;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .cad-container.theme-light .highlight-merit {
          background-color: rgba(147, 51, 234, 0.05);
          color: #7e22ce;
        }

        .highlight-value {
          color: #2dd4bf;
          font-weight: 700;
          border-bottom: 2px solid #0d9488;
          padding: 2px 6px;
          border-radius: 4px;
          background-color: rgba(45, 212, 191, 0.08);
          transition: all 0.2s ease;
        }
        .cad-container.theme-light .highlight-value {
          color: #0d9488;
          border-bottom-color: #0f766e;
          background-color: rgba(13, 148, 136, 0.05);
        }

        /* Transcripts Container */
        .transcripts-bar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .transcripts-bar {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
        .transcripts-bar-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-title);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-family: ui-monospace, monospace;
        }
        .tab-filters {
          display: flex;
          gap: 4px;
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          padding: 4px;
          border-radius: 8px;
        }
        .tab-filter-btn {
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .tab-filter-btn:hover {
          color: var(--text-title);
          background-color: var(--btn-bg);
        }
        .tab-filter-btn.active {
          background-color: #3b82f6;
          color: #ffffff;
        }
        .transcripts-card-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .transcript-detail-card {
          position: relative;
          overflow: hidden;
        }
        .transcript-card-stripe {
          height: 6px;
          width: 100%;
        }
        .transcript-card-inner {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .transcript-card-inner {
            flex-direction: row;
            justify-content: space-between;
          }
        }
        .transcript-card-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .transcript-author-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .transcript-author-circle {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .transcript-author-header {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-title);
        }
        .transcript-quote-box {
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          padding: 20px;
          border-radius: 8px;
          font-family: ui-monospace, monospace;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .transcript-bullet-quote {
          position: relative;
          padding-left: 16px;
        }
        .transcript-bullet-symbol {
          position: absolute;
          left: 0;
          color: #475569;
          user-select: none;
        }
        .transcript-card-sidebar {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .transcript-card-sidebar {
            width: 220px;
            align-items: flex-end;
          }
        }
        .sidebar-model-totals {
          text-align: left;
        }
        @media (min-width: 768px) {
          .sidebar-model-totals { text-align: right; }
        }
        .sidebar-total-label {
          font-size: 10px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          font-family: ui-monospace, monospace;
        }
        .sidebar-total-number {
          font-size: 24px;
          font-weight: 700;
          font-family: 'Comfortaa', cursive, sans-serif;
          margin-top: 4px;
          display: block;
        }
        .sidebar-total-percent {
          font-size: 11px;
          color: var(--text-secondary);
          display: block;
          margin-top: 2px;
        }
        .sidebar-link-btn {
          width: 100%;
          text-align: center;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid;
          border-radius: 4px;
          text-decoration: none;
          transition: background-color 0.2s, color 0.2s;
          font-family: ui-monospace, monospace;
          display: block;
        }

        /* Footer */
        .dashboard-footer {
          border-top: 1px solid var(--border-color);
          background-color: var(--bg-panel);
          padding: 32px 16px;
          border-radius: 8px;
          margin-top: 48px;
        }
        .footer-content {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        @media (min-width: 768px) {
          .footer-content {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
        .footer-left {
          text-align: left;
          max-width: 700px;
        }
        .footer-right {
          text-align: right;
          font-weight: 600;
          font-family: ui-monospace, monospace;
          white-space: nowrap;
        }
      `, 'accudraw-premium-styles');
    }

  highlightKeyPhrases(text) {
      if (!text) return "";
      let res = text;
      
      const mappings = [
        // Claude Mappings
        {
          search: "competitive foundation that let MicroStation win and hold the professional infrastructure CAD market during the decade that mattered most",
          replace: "<span class=\"highlight-merit\">competitive foundation that let MicroStation win and hold the professional infrastructure CAD market during the decade that mattered most</span>"
        },
        {
          search: "among the highest-leverage individual technical contributions in the history of infrastructure software",
          replace: "<span class=\"highlight-merit\">among the highest-leverage individual technical contributions in the history of infrastructure software</span>"
        },
        // ChatGPT Mappings
        {
          search: "ultimately created around a billion dollars or more of value for Bentley over several decades",
          replace: "<span class=\"highlight-value\">ultimately created around a billion dollars or more of value for Bentley over several decades</span>"
        },
        {
          search: "plausible range for their contribution to Bentley's long-term enterprise value",
          replace: "<span class=\"highlight-value\">plausible range for their contribution to Bentley's long-term enterprise value</span>"
        },
        // Gemini Mappings
        {
          search: "muscle memory is a powerful lock-in mechanism",
          replace: "<span class=\"highlight-merit\">muscle memory is a powerful lock-in mechanism</span>"
        },
        {
          search: "highly efficient, hotkey-driven drafting system",
          replace: "<span class=\"highlight-merit\">highly efficient, hotkey-driven drafting system</span>"
        },
        {
          search: "solved the 3D input problem for Bentley years before many competitors had an elegant solution",
          replace: "<span class=\"highlight-merit\">solved the 3D input problem for Bentley years before many competitors had an elegant solution</span>"
        },
        {
          search: "serving as the core usability engine that prevented customer churn to Autodesk during the peak years of CAD adoption",
          replace: "<span class=\"highlight-value\">serving as the core usability engine that prevented customer churn to Autodesk during the peak years of CAD adoption</span>"
        },
        // Grok Mappings
        {
          search: "underpin user productivity claims that support the entire product line",
          replace: "<span class=\"highlight-merit\">underpin user productivity claims that support the entire product line</span>"
        },
        {
          search: "true 'company-making' innovation that paid dividends for decades",
          replace: "<span class=\"highlight-merit\">true 'company-making' innovation that paid dividends for decades</span>"
        }
      ];

      mappings.forEach(item => {
        if (res.includes(item.search)) {
          res = res.replace(item.search, item.replace);
        }
      });

      // Highlight value ranges, millions, billions and percentages
      res = res.replace(/(\$[0-9.]+\s*(?:billion|million|B|M)?\s*(?:and|to|-|-)\s*\$[0-9.]+\+?\s*(?:billion|million|B|M)?)/gi, "<span class=\"highlight-range\">$1</span>");
      res = res.replace(/(\d+%\s*to\s*\d+%)/gi, "<span class=\"highlight-percent\">$1</span>");
      res = res.replace(/(\d+%\s*of\s*Bentley)/gi, "<span class=\"highlight-percent\">$1</span>");

      return res;
    }

  copyPromptText(text, btnElement) {
      navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = `
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="text-emerald-400 font-bold">Copied!</span>
        `;
        btnElement.classList.add('border-emerald-500/40', 'bg-emerald-950/20');
        
        setTimeout(() => {
          btnElement.innerHTML = originalHtml;
          btnElement.classList.remove('border-emerald-500/40', 'bg-emerald-950/20');
        }, 1800);
      }).catch(err => {
        console.error('Copy failed: ', err);
      });
    }

  renderApp() {
      this.targetElement.innerHTML = "";
      
      const themeClass = this.currentTheme === 'light' ? 'cad-container cad-grid-bg theme-light' : 'cad-container cad-grid-bg';
      
      const appContainer = makeElement("div", { className: themeClass });
      const innerWrapper = makeElement("div", { className: "cad-wrapper" });

      innerWrapper.appendChild(this.buildMinimalHeader());
      innerWrapper.appendChild(this.buildBackstoryBlock());
      innerWrapper.appendChild(this.buildPromptsSection());

      if (this.resultsRevealed) {
        innerWrapper.appendChild(this.buildConsensusBlock());
        innerWrapper.appendChild(this.buildInteractiveSummaryGrid());
        innerWrapper.appendChild(this.buildTranscriptsBlock());
      } else {
        innerWrapper.appendChild(this.buildRevealCTA());
      }

      innerWrapper.appendChild(this.buildFooter());

      appContainer.appendChild(innerWrapper);
      this.targetElement.appendChild(appContainer);

      // Skip the ember/fire ignition while "Wrong Answers" mode is still cycling
      // through incorrect figures - it only lights up once the real number lands.
      if (this.resultsRevealed && !this._isAwaitingRecalculation()) {
        const emberValText = this.targetElement.querySelector('.glowing-consensus-value');
        if (emberValText) {
          if (this.valueEmberLogo) {
            this.valueEmberLogo.destroy();
          }
          this.valueEmberLogo = new ValueEmberLogo(emberValText, {
            isAwake: true,
            emberCountMultiplier: 0.4,
            emberSpeedMultiplier: 0.3,
            emberSizeMultiplier: 0.4
          });
        }
      } else if (this.valueEmberLogo) {
        this.valueEmberLogo.destroy();
        this.valueEmberLogo = null;
      }
    }

  buildHeader() {
      // Toggle button for light/dark theme
      const themeToggle = makeElement('div', { className: 'flex items-center gap-1.5 p-1 bg-[var(--btn-bg)] border border-[var(--border-color)] rounded-lg shrink-0' }, [
        makeElement('button', {
          className: `px-2.5 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1 ${this.currentTheme === 'light' ? 'bg-[#3b82f6] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`,
          onclick: () => this.setTheme('light')
        }, [
          makeElement('span', { innerHTML: '☀️' }),
          makeElement('span', {}, 'Light')
        ]),
        makeElement('button', {
          className: `px-2.5 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1 ${this.currentTheme === 'dark' ? 'bg-[#3b82f6] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`,
          onclick: () => this.setTheme('dark')
        }, [
          makeElement('span', { innerHTML: '🌙' }),
          makeElement('span', {}, 'Dark')
        ])
      ]);

      return makeElement('header', { className: 'pb-4 space-y-6' }, [
        makeElement('div', { className: 'flex flex-row items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4' }, [
          makeElement('div', { className: 'flex items-center gap-2' }, [
            makeElement('span', { className: 'px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30 rounded' }, 'Historical Assessment'),
            makeElement('span', { className: 'px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded' }, 'Est. 1994 CAD IP')
          ]),
          themeToggle
        ]),
        
        makeElement('div', { className: 'space-y-4' }, [
          makeElement('h1', { className: 'text-3xl md:text-5xl font-extrabold text-[var(--text-title)] tracking-tight leading-none' }, 'AccuDraw & SmartLine Value Valuation'),
          makeElement('p', { className: 'text-[var(--text-secondary)] text-sm uppercase tracking-widest cad-mono font-semibold' }, 'A comparative analysis of enterprise value contribution')
        ]),

        // Beautiful personal backstory block
        this.buildBackstoryBlock()
      ]);
    }

  buildPromptsSection() {
      const promptsWrapper = makeElement('div', { className: 'prompts-list' });

      this.data.prompts.forEach(p => {
        const item = makeElement('div', { className: 'prompt-card' }, [
          makeElement('div', { className: 'prompt-content-wrapper' }, [
            makeElement('span', { className: 'prompt-tag' }, `Prompt #${p.id}`),
            makeElement('p', { className: 'prompt-body' }, `"${p.text}"`)
          ]),
          makeElement('button', {
            className: 'copy-prompt-btn',
            onclick: (e) => this.copyPromptText(p.text, e.currentTarget)
          }, [
            makeElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', strokeWidth: '2', viewBox: '0 0 24 24' }, [
              makeElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' })
            ]),
            makeElement('span', {}, 'Copy Prompt')
          ])
        ]);
        promptsWrapper.appendChild(item);
      });

      return makeElement('section', { className: 'cad-panel' }, [
        makeElement('h2', { className: 'text-xl font-bold text-[var(--text-title)]' }, 'Run the Experiment Yourself'),
        makeElement('p', { className: 'prompts-header-desc' }, 
          'To show the objectivity of these evaluations, you can copy the exact historical prompts used to query the LLMs. Paste these into any AI chat application to see results generated without prior bias or context memory.'
        ),
        promptsWrapper
      ]);
    }

  buildInteractiveSummaryGrid() {
      const container = makeElement('div', { className: 'cad-panel' }, [
        makeElement('div', { className: 'dashboard-header-group' }, [
          makeElement('h3', {}, 'Estimated Enterprise Value Contribution'),
          makeElement('p', {}, 'A comparative projection of objective historical estimates across language models relative to Bentley Systems market valuation.')
        ])
      ]);

      const modelsGrid = makeElement('div', { className: 'dashboard-cards-grid' });

      const abbreviatedValuations = {
        claude: "$2.0B - $5.0B",
        gemini: "$1.5B - $3.5B",
        chatgpt: "$1.0B - $3.0B",
        grok: "$500M - $2.0B+"
      };

      this.data.models.forEach(model => {
        const displayValuation = abbreviatedValuations[model.key] || `${model.min} - ${model.max}`;

        const item = makeElement('div', { className: 'model-metric-card' }, [
          makeElement('div', {}, [
            makeElement('span', { className: 'metric-model-name' }, model.name),
            makeElement('div', { 
              className: 'metric-model-value', 
              style: { color: model.color } 
            }, displayValuation)
          ]),
          makeElement('div', { className: 'metric-footer-label' }, 'Value Contribution Estimate')
        ]);
        modelsGrid.appendChild(item);
      });

      container.appendChild(modelsGrid);
      return container;
    }

  

  buildDashboardPanel() {
      const container = makeElement('div', { className: 'w-full cad-panel p-8 space-y-8' }, [
        makeElement('div', { className: 'space-y-1.5' }, [
          makeElement('h3', { className: 'text-lg font-bold text-[var(--text-title)] uppercase tracking-wider cad-mono' }, 'Estimated Enterprise Value Contribution'),
          makeElement('p', { className: 'text-sm text-[var(--text-secondary)]' }, 
            'A comparative projection of objective historical estimates across language models relative to Bentley Systems market valuation.'
          )
        ])
      ]);

      const modelsGrid = makeElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' });

      const spelledOutValuations = {
        claude: "$2.0 Billion - $5.0 Billion",
        gemini: "$1.5 Billion - $3.5 Billion",
        chatgpt: "$1.0 Billion - $3.0 Billion",
        grok: "$500 Million - $2.0 Billion+"
      };

      this.data.models.forEach(model => {
        const displayValuation = spelledOutValuations[model.key] || `${model.min} - ${model.max}`;

        const item = makeElement('div', { 
          className: 'p-6 bg-[var(--bg-panel-inner)] border border-[var(--border-color)] rounded-lg hover:border-[var(--border-hover)] transition flex flex-col justify-between space-y-4 text-center md:text-left'
        }, [
          makeElement('div', { className: 'space-y-1' }, [
            makeElement('span', { className: 'text-xs uppercase tracking-wider font-bold text-[var(--text-secondary)] cad-mono' }, model.name),
            makeElement('div', { 
              className: 'text-2xl md:text-3xl font-black tracking-tight mt-2 cad-mono', 
              style: { color: model.color } 
            }, displayValuation)
          ]),
          makeElement('div', { className: 'pt-2 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] cad-mono' }, 
            'Value Contribution Estimate'
          )
        ]);
        modelsGrid.appendChild(item);
      });

      container.appendChild(modelsGrid);
      return container;
    }

  buildTranscriptsBlock() {
      const container = makeElement('section', { className: 'space-y-6' }, [
        makeElement('div', { className: 'transcripts-bar' }, [
          makeElement('h2', { className: 'transcripts-bar-title' }, 'Detailed Model Transcripts'),
          
          makeElement('div', { className: 'tab-filters' }, [
            this.buildFilterButton('all', 'Show All'),
            this.buildFilterButton('claude', 'Claude'),
            this.buildFilterButton('gemini', 'Gemini'),
            this.buildFilterButton('chatgpt', 'ChatGPT'),
            this.buildFilterButton('grok', 'Grok')
          ])
        ])
      ]);

      const transcriptsList = makeElement('div', { className: 'transcripts-card-list' });

      this.data.models.forEach(model => {
        if (this.activeTab !== 'all' && this.activeTab !== model.key) return;

        const card = makeElement('article', { className: 'cad-panel transcript-detail-card' }, [
          makeElement('div', { className: 'transcript-card-stripe', style: { backgroundColor: model.color } }),

          makeElement('div', { className: 'transcript-card-inner' }, [
            makeElement('div', { className: 'transcript-card-main' }, [
              makeElement('div', { className: 'transcript-author-group' }, [
                makeElement('span', { className: 'transcript-author-circle', style: { backgroundColor: model.color } }),
                makeElement('h3', { className: 'transcript-author-header' }, model.name)
              ]),
              
              makeElement('div', { className: 'transcript-quote-box' }, 
                model.quotes.map(q => {
                  const highlightedHTML = this.highlightKeyPhrases(q);
                  return makeElement('p', { className: 'transcript-bullet-quote' }, [
                    makeElement('span', { className: 'transcript-bullet-symbol' }, '•'),
                    makeElement('span', { innerHTML: highlightedHTML })
                  ]);
                })
              )
            ]),

            makeElement('div', { className: 'transcript-card-sidebar' }, [
              makeElement('div', { className: 'sidebar-model-totals' }, [
                makeElement('span', { className: 'sidebar-total-label' }, 'Identified Valuation'),
                makeElement('span', { className: 'sidebar-total-number', style: { color: model.color } }, `${model.min} - ${model.max}`),
                makeElement('span', { className: 'sidebar-total-percent' }, `${model.pct}% Contribution of Bentley Cap`)
              ]),
              makeElement('a', {
                href: model.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'sidebar-link-btn',
                style: {
                  color: model.color,
                  borderColor: `${model.color}33`,
                  backgroundColor: `${model.color}0a`
                }
              }, 'Verify Original Transcript ↗')
            ])
          ])
        ]);

        transcriptsList.appendChild(card);
      });

      container.appendChild(transcriptsList);
      return container;
    }

  buildFilterButton(filterId, labelText) {
      const isActive = this.activeTab === filterId;
      return makeElement('button', {
        className: `tab-filter-btn ${isActive ? 'active' : ''}`,
        onclick: () => {
          this.activeTab = filterId;
          this.renderApp();
        }
      }, labelText);
    }

  buildFooter() {
      return makeElement('footer', { className: 'dashboard-footer' }, [
        makeElement('div', { className: 'footer-content' }, [
          makeElement('p', { className: 'footer-left' }, 
            'This comparative data serves as an analytical mapping of historical public model calculations conducted in 2026 concerning MicroStation IP development.'
          ),
          makeElement('p', { className: 'footer-right' }, 
            'AccuDraw & SmartLine • 1994 - 2026'
          )
        ])
      ]);
    }

  

  

  

  

  setTheme(themeName) {
      this.currentTheme = themeName;
      localStorage.setItem('accudraw-valuation-theme', themeName);
      
      const container = this.targetElement.querySelector('.cad-container');
      if (container) {
        if (themeName === 'light') {
          container.classList.add('theme-light');
        } else {
          container.classList.remove('theme-light');
        }
      }
      
      this.renderApp();
    }

  buildStoryBlock() {
      return makeElement('div', { 
        className: 'p-6 md:p-8 rounded-xl border border-[var(--border-color)] space-y-4 transition-colors',
        style: {
          background: 'linear-gradient(135deg, var(--accent-story-from), var(--accent-story-to))'
        }
      }, [
        makeElement('div', { className: 'flex items-center gap-2' }, [
          makeElement('span', { className: 'w-2 h-2 rounded-full bg-blue-500' }),
          makeElement('h3', { className: 'text-xs font-bold uppercase tracking-wider text-blue-400 cad-mono' }, 'The Origin Story & Human Capital Return')
        ]),
        makeElement('p', { className: 'text-sm text-[var(--text-primary)] leading-relaxed' }, 
          `In 1994, the CAD market was locked in a fierce battle. Bentley Systems sought a definitive edge to hold MicroStation's niche in major engineering and infrastructure. That advantage arrived when a dedicated spatial developer brought key insights on coordinate precision to Bentley, leading to the rapid development of AccuDraw and SmartLine.`
        ),
        makeElement('p', { className: 'text-sm text-[var(--text-primary)] leading-relaxed' }, 
          `AccuDraw-an elegant, dynamic coordinate-locking compass-and SmartLine-a unified smart geometry creation tool-bypassed rigid command-line inputs. Draftspersons could lock axes and key in distances instantly. This innovation earned Bentley Systems its first-ever software patent, creating a high-leverage user-retention moat that secure its survival and compounded value over three decades.`
        ),
        makeElement('div', { className: 'pt-2 border-t border-[var(--border-color)]/30 flex flex-wrap gap-4 text-xs text-[var(--text-secondary)] cad-mono' }, [
          makeElement('span', {}, '🔧 Innovation: Axis & Distance Dynamics'),
          makeElement('span', {}, '🛡️ Moat: Three Decades of User Retention'),
          makeElement('span', {}, '🏢 Valuation Leverage: Multi-Million Compound Effect')
        ])
      ]);
    }

  buildBackstoryBlock() {
      return makeElement('div', { className: 'backstory-gradient-card' }, [
        makeElement('div', { className: 'space-y-4' }, [
          makeElement('p', { className: 'backstory-paragraph-highlight' }, [
            "In 1994, I joined Bentley Systems and implemented two features - AccuDraw and SmartLine - that became the signature of their flagship product, MicroStation. Users still cite them thirty years later as the primary reason they stay on the platform. Bentley is now a $9 billion company. ",
            makeElement('a', {
              href: '#accudraw-innovations',
              className: 'inline-link-highlight',
              onclick: (e) => {
                e.preventDefault();
                const hashElement = document.getElementById('raw-prompts') || document.body;
                hashElement.scrollIntoView({ behavior: 'smooth' });
              }
            }, "Learn more about AccuDraw: see it in motion, see my new version with all its Innovations, and see accolades from over the years ↗")
          ])
        ]),

        makeElement('p', { className: 'backstory-paragraph' }, 
          "The story behind them matters: I had originally conceived and patented a similar idea at Intergraph - which at the time owned fifty percent of Bentley. When it became clear Intergraph wasn't going to act on it, I went directly to Bentley and rebuilt the concept from scratch, earning their first ever patent in the process."
        ),
        makeElement('p', { className: 'backstory-paragraph' }, 
          "I've always believed this contribution was significant. But \"significant\" is easy to dismiss."
        ),
        makeElement('p', { className: 'backstory-paragraph' }, 
          "So I asked four leading AI systems - Claude, Gemini, ChatGPT, and Grok - to assess the value independently. I didn't tell them it was me. I gave them the neutral facts and asked them to do the math. They arrived at a consensus midpoint of roughly $2.3 billion in contributed value."
        ),
        makeElement('p', { className: 'backstory-paragraph-bold' }, 
          "You don't have to take my word for it. The prompts are right here. Paste them into any chatbot yourself."
        )
      ]);
    }

  buildConsensusBlock() {
      const wrongSequence = ['$2.3 Million', '$23 Million', '$230 Million'];
      const finalValue = '$2.3 Billion';
      const stage = this.wrongAnswerStage || 0;
      const showWrongUI = this.revealMode === 'wrong-answers' && stage < wrongSequence.length;
      const displayValue = showWrongUI ? wrongSequence[stage] : finalValue;
      const valueClassName = `glowing-consensus-value${showWrongUI ? ' is-wrong' : ''}${this.revealMode === 'wrong-answers' ? ' value-pulse' : ''}`;

      const figureChildren = [
        makeElement('div', { className: valueClassName }, displayValue)
      ];

      if (showWrongUI) {
        figureChildren.push(
          makeElement('button', {
            className: 'recalculate-btn',
            onclick: () => this.advanceWrongAnswer()
          }, [
            makeElement('span', { className: 'recalculate-icon' }, '✕'),
            makeElement('span', {}, 'Incorrect answer - Recalculate')
          ])
        );
      } else {
        figureChildren.push(
          makeElement('span', {
            className: `consensus-figure-subtext${this.justCorrected ? ' flash-correct' : ''}`
          }, this.justCorrected ? '✓ Correct answer' : 'Consensus Contributed Midpoint')
        );
      }

      return makeElement('div', { className: 'consensus-container' }, [
        makeElement('div', { className: 'consensus-info-pane' }, [
          makeElement('span', { className: 'consensus-badge' }, 'Consensus Composite Estimate'),
          makeElement('h2', { className: 'consensus-headline' }, 'The Consolidated Valuation Footprint'),
          makeElement('p', { className: 'consensus-description' }, 
            'By calculating the midpoint of each AI model\'s calculated range (Claude, Gemini, ChatGPT, and Grok), we arrive at a unified composite average of Bentley Systems enterprise valuation directly tied to the AccuDraw and SmartLine IP.'
          )
        ]),
        makeElement('div', { className: 'consensus-figure-pane' }, figureChildren)
      ]);
    }

  buildMinimalHeader() {
      const revealModeSelect = makeElement('select', {
        className: 'reveal-mode-select',
        onchange: (e) => {
          this.revealMode = e.target.value;
          localStorage.setItem('accudraw-reveal-mode', this.revealMode);
        }
      }, [
        makeElement('option', { value: 'drum-roll' }, 'Drum Roll'),
        makeElement('option', { value: 'no-drama' }, 'No Drama'),
        makeElement('option', { value: 'wrong-answers' }, 'Wrong Answers')
      ]);
      revealModeSelect.value = this.revealMode;

      const themeToggle = makeElement('div', { className: 'theme-switcher' }, [
        makeElement('button', {
          className: this.currentTheme === 'light' ? 'active' : '',
          onclick: () => this.setTheme('light')
        }, [
          makeElement('span', { innerHTML: '☀️' }),
          makeElement('span', {}, 'Light')
        ]),
        makeElement('button', {
          className: this.currentTheme === 'dark' ? 'active' : '',
          onclick: () => this.setTheme('dark')
        }, [
          makeElement('span', { innerHTML: '🌙' }),
          makeElement('span', {}, 'Dark')
        ])
      ]);

      const controlsGroup = makeElement('div', {
        className: 'flex flex-col items-end'
      }, [
        themeToggle,
        makeElement('div', { className: 'reveal-mode-row' }, [
          revealModeSelect
        ])
      ]);

      return makeElement('header', { className: 'minimal-header' }, [
        makeElement('div', { className: 'header-top' }, [
          makeElement('div', { className: 'tags-wrapper' }, [
            makeElement('span', { className: 'tag-pill tag-pill-blue' }, 'Historical Assessment'),
            makeElement('span', { className: 'tag-pill tag-pill-slate' }, 'Est. 1994 CAD IP')
          ]),
          controlsGroup
        ]),
        
        makeElement('div', { className: 'title-group' }, [
          makeElement('h1', {}, 'AccuDraw & SmartLine Value Assessment'),
          makeElement('p', { className: 'title-subtitle' }, 'A comparative analysis of enterprise value contribution')
        ])
      ]);
    }

  buildRevealCTA() {
      const button = makeElement('button', {
        className: 'reveal-main-button',
        onclick: (e) => {
          this.triggerReveal(e.currentTarget);
        }
      }, [
        makeElement('span', { className: 'reveal-title-large' }, 'Show Estimated Valuation'),
        makeElement('span', { className: 'reveal-subtitle-small' }, 'of AccuDraw and SmartLine')
      ]);

      return makeElement('div', { className: 'reveal-cta-row' }, button);
    }

  

  startValueEmberSimulation(containerElement) {
      if (this.emberInterval) {
        clearInterval(this.emberInterval);
      }

      // Smoothly transition glow in over 3 seconds
      setTimeout(() => {
        containerElement.style.transition = 'text-shadow 3s ease, color 3s ease';
        containerElement.style.textShadow = '0 0 14px rgba(255,107,53,0.9), 0 0 28px rgba(255,107,53,0.55), 0 0 42px rgba(255,60,0,0.2)';
        containerElement.style.color = '#ffebd2';
      }, 150);

      // Simple, high-fidelity spark loop modeling EmberLogo mechanics
      this.emberInterval = setInterval(() => {
        if (!document.body.contains(containerElement)) {
          clearInterval(this.emberInterval);
          return;
        }

        const size = Math.random() * 2 + 1.5;
        const colors = ['#ff6b35', '#ffaa00', '#ff8844', '#ffffff', '#ffeedd'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const spark = makeElement('div', {
          style: {
            position: 'absolute',
            width: size + 'px',
            height: size + 'px',
            backgroundColor: color,
            borderRadius: '50%',
            pointerEvents: 'none',
            opacity: String(Math.random() * 0.7 + 0.3),
            boxShadow: `0 0 ${size * 3.5}px ${color}`,
            left: (Math.random() * containerElement.offsetWidth) + 'px',
            top: (containerElement.offsetHeight - 6) + 'px',
            zIndex: '10'
          }
        });

        containerElement.appendChild(spark);

        const dx = (Math.random() - 0.5) * 44;
        const dy = -(Math.random() * 45 + 25);
        const duration = Math.random() * 1200 + 1000;

        spark.animate([
          { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 0.95 },
          { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.2)`, opacity: 0 }
        ], {
          duration: duration,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          fill: 'forwards'
        });

        setTimeout(() => spark.remove(), duration);
      }, 200);
    }

  loadGoogleFont() {
      const fontId = 'GoogleFontComfortaa';
      if (!document.getElementById(fontId)) {
        const link = makeElement('link', {
          id: fontId,
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700;900&display=swap',
        });
        document.head.appendChild(link);
      }
    }

  triggerReveal(buttonElement) {
      if (this.isTransitioning) return;

      // Fresh reveal - reset any leftover wrong-answer cycle state
      this.wrongAnswerStage = 0;
      this.justCorrected = false;

      if (this.revealMode === 'no-drama' || this.revealMode === 'wrong-answers') {
        this.resultsRevealed = true;
        this.renderApp();
        this._scrollToConsensusBlock();
        return;
      }

      // Default: 'drum-roll'
      this.isTransitioning = true;

      buttonElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
      buttonElement.style.opacity = '0.85';
      buttonElement.style.pointerEvents = 'none';

      setTimeout(() => {
        if (window.SnareDrumAnimation) {
          const snare = new SnareDrumAnimation({
            duration: 3000,
            soundUrl: '/LogoExperiments/drumroll.mp4',
            accentColor: '#3b82f6',
            onComplete: () => {
              this.resultsRevealed = true;
              this.isTransitioning = false;
              this.renderApp();
              this._scrollToConsensusBlock(100);
            }
          });
          snare.trigger(buttonElement);
        } else {
          setTimeout(() => {
            this.resultsRevealed = true;
            this.isTransitioning = false;
            this.renderApp();
          }, 1500);
        }
      }, 350);
    }

  _scrollToConsensusBlock(delay = 80) {
      setTimeout(() => {
        const consensusBlock = this.targetElement.querySelector('.consensus-container');
        if (consensusBlock) {
          consensusBlock.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, delay);
    }

  _isAwaitingRecalculation() {
      return this.revealMode === 'wrong-answers' && (this.wrongAnswerStage || 0) < 3;
    }

  advanceWrongAnswer() {
      if (this.wrongAnswerStage >= 3) return;

      this.wrongAnswerStage++;
      if (this.wrongAnswerStage === 3) {
        this.justCorrected = true;
      }

      this.renderApp();

      if (this.wrongAnswerStage === 3) {
        setTimeout(() => {
          this.justCorrected = false;
          const subtext = this.targetElement.querySelector('.consensus-figure-subtext');
          if (subtext) {
            subtext.classList.remove('flash-correct');
            subtext.textContent = 'Consensus Contributed Midpoint';
          }
        }, 1400);
      }
    }
}