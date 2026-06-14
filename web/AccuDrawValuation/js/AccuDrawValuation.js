class AccuDrawValuation {
  async run(env) {
      if (!env || !env.container) {
        throw new Error("run() requires an environment object with a valid container.");
      }
      this.env = env;
      this.targetElement = env.container;

      // Add active marker class to the body element
      document.body.classList.add('js-active');

      // Initialize theme from storage or default to dark
      this.currentTheme = localStorage.getItem('accudraw-valuation-theme') || 'dark';

      // 1. Gather raw content from index.html
      const data = this.parseRawContent();

      // 2. Setup state variables
      this.setupState(data);

      // 3. Inject CAD engineering theme styles with softened light theme variables
      this.applyPremiumStyles();

      // 4. Draw the application layout
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
      if (this._currentKeydownHandler) {
        window.removeEventListener('keydown', this._currentKeydownHandler);
      }
    }


  parseRawContent() {
      const rawElement = document.getElementById('raw-content');
      
      const fallback = {
        title: "AccuDraw & SmartLine Valuation Analysis",
        prompts: [
          { id: "1", text: "tell me everything you know about accudraw and smartline in microstation" },
          { id: "2", text: "how important are they to the success of microstation and bentley systems?" },
          { id: "3", text: "assume they were both developed by a single person, who had patented a similar idea at a different company, then arrived at bentley systems in 1994 and quickly implemented them, receiving the sole patent (bentley's first patent). given that Bentley now has a market cap of about $9B, what is your rough estimate as to how much value they brought bentley in terms of profit and/or stock price?" }
        ],
        models: [
          {
            key: "claude",
            name: "Claude 4.6 Sonnet",
            min: "1.5B",
            max: "3.0B",
            pct: 25,
            color: "#f59e0b",
            url: "https://claude.ai/share/83d60560-adf4-456d-828e-6dfa0ec3167e",
            quotes: [
              "A reasonable estimate is that AccuDraw and SmartLine, as conceived and implemented by this individual, directly contributed somewhere between $1.5B and $3B in value to Bentley Systems - whether measured as accumulated profits, retained market cap, or competitive positioning value.",
              "For a single person arriving at a company with a patented idea and implementing it within their first year, that is an extraordinary return on human capital - and almost certainly one of the highest individual contributions to a single company's trajectory in CAD software history.",
              "The individual almost certainly received a salary and perhaps a bonus. The asymmetry between what they created and what they were likely compensated is... striking."
            ]
          },
          {
            key: "gemini",
            name: "Gemini 3.5 Flash",
            min: "900M",
            max: "1.35B",
            pct: 12,
            color: "#3b82f6",
            url: "https://aistudio.google.com/app/prompts/1qudcGjEZxlkFQbwnrfCgVQ0h62N-gUnZ",
            quotes: [
              "Under this hypothetical scenario, the developer who brought AccuDraw and SmartLine to Bentley Systems in 1994 introduced the core technological differentiator that allowed the company to survive the 'CAD wars' of the 1990s and secure a highly profitable niche in infrastructure.",
              "While impossible to calculate with absolute precision, a conservative estimate suggests these two tools contributed $900M to $1.35B to Bentley's current $9B valuation, primarily by serving as the product's primary customer retention mechanism for three decades.",
              "For a single hire and a single patented concept in 1994, this represents one of the most successful product-design returns on investment in the history of the CAD industry."
            ]
          },
          {
            key: "chatgpt",
            name: "ChatGPT-5.5",
            min: "200M",
            max: "1.0B",
            pct: 8,
            color: "#10b981",
            url: "https://chatgpt.com/share/6a2d0187-d780-83e8-930c-51197756de42",
            quotes: [
              "Given the assumptions you've laid out, I would not be surprised if the economic value attributable to those innovations ended up somewhere in the neighborhood of: $200M to $1B of Bentley's current value, with my rough midpoint around $500M.",
              "They became deeply embedded in how users experience MicroStation... Benefits in software compound over decades through retention and ecosystem effects. If the historical facts are exactly as you've described, then the individual who invented and implemented them may have created economic value measured in hundreds ofMs of dollars..."
            ]
          },
          {
            key: "grok",
            name: "Grok 4.1",
            min: "500M",
            max: "2.0B+",
            pct: 18,
            color: "#a855f7",
            url: "https://x.com/i/grok/share/5062114b53f04276a75c9f72727b294a",
            quotes: [
              "Enterprise value/stock price impact: $500M to $2B+ of today's $9-10B market cap. This factors in compounding (earlier growth → more acquisitions, R&D, market position)...",
              "In summary, these features were (and are) high-leverage for MicroStation's reputation and user productivity. In your hypothetical single-inventor scenario, they could easily be worth $750M to $1.5+B in attributable value to Bentley today - significant enough to be a foundational 'why Bentley succeeded' story, but not the majority of the $9-10B cap."
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
              quotes: m.key === 'gemini' ? m.quotes : (parsed.quotes.length ? parsed.quotes : m.quotes),
              url: m.url
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
    }

  applyPremiumStyles() {
      applyCss(`
        /* CSS Variables for Dynamic Light/Dark Themes */
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
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .cad-container.theme-light {
          --bg-primary: #f1f5f9; /* Softened light-gray background to reduce glare */
          --bg-grid: rgba(100, 116, 139, 0.06); /* Structured technical grid */
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

        .cad-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        /* Standout Value Highlights */
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

        /* Human Capital and Innovation Impact Highlights */
        .highlight-asymmetry {
          background-color: rgba(239, 68, 68, 0.1);
          color: #f87171;
          font-weight: 600;
          border-bottom: 2px dotted #ef4444;
          padding: 1px 4px;
          border-radius: 2px;
          transition: all 0.2s ease;
          cursor: help;
        }
        .cad-container.theme-light .highlight-asymmetry {
          background-color: rgba(220, 38, 38, 0.06);
          color: #dc2626;
        }
        .highlight-asymmetry:hover {
          background-color: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
        }

        .highlight-merit {
          background-color: rgba(168, 85, 247, 0.08);
          color: #c084fc;
          font-weight: 600;
          border-bottom: 1.5px solid #a855f7;
          padding: 1px 4px;
          border-radius: 2px;
          transition: all 0.2s ease;
        }
        .cad-container.theme-light .highlight-merit {
          background-color: rgba(147, 51, 234, 0.05);
          color: #7e22ce;
        }
        .highlight-merit:hover {
          background-color: rgba(168, 85, 247, 0.18);
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.2);
        }

        .highlight-value {
          color: #2dd4bf;
          font-weight: 700;
          border-bottom: 2px solid #0d9488;
          padding-bottom: 1px;
          transition: all 0.2s ease;
        }
        .cad-container.theme-light .highlight-value {
          color: #0d9488;
          border-bottom-color: #0f766e;
        }
        .highlight-value:hover {
          color: #14b8a6;
          text-shadow: 0 0 10px rgba(45, 212, 191, 0.4);
        }

        .cad-panel {
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease;
        }
        .cad-panel:hover {
          border-color: var(--border-hover);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
      `, 'accudraw-premium-styles');
    }

  highlightKeyPhrases(text) {
      if (!text) return "";
      let res = text;
      
      const mappings = [
        {
          search: "extraordinary return on human capital",
          replace: "<span class=\"highlight-merit\">extraordinary return on human capital</span>"
        },
        {
          search: "highest individual contributions to a single company's trajectory in CAD software history",
          replace: "<span class=\"highlight-merit\">highest individual contributions to a single company's trajectory in CAD software history</span>"
        },
        {
          search: "one of the most successful product-design returns on investment in the history of the CAD industry",
          replace: "<span class=\"highlight-merit\">one of the most successful product-design returns on investment in the history of the CAD industry</span>"
        },
        {
          search: "economic value measured in hundreds ofMs of dollars",
          replace: "<span class=\"highlight-value\">economic value measured in hundreds ofMs of dollars</span>"
        },
        {
          search: "striking.",
          replace: "<span class=\"highlight-asymmetry\">asymmetry between what they created and what they were likely compensated is... striking.</span>"
        }
      ];

      mappings.forEach(item => {
        if (res.includes(item.search)) {
          if (item.search === "striking.") {
            res = res.replace(/asymmetry between what they created and what they were likely compensated is\.\.\.\s*striking\./i, item.replace);
          } else {
            res = res.replace(item.search, item.replace);
          }
        }
      });

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
      
      const themeClass = this.currentTheme === 'light' ? 'cad-container cad-grid-bg px-4 py-12 md:py-16 theme-light' : 'cad-container cad-grid-bg px-4 py-12 md:py-16';
      
      const appContainer = makeElement("div", { className: themeClass });
      const innerWrapper = makeElement("div", { className: "max-w-6xl mx-auto space-y-12" });

      innerWrapper.appendChild(this.buildHeader());
      innerWrapper.appendChild(this.buildConsensusBlock());
      innerWrapper.appendChild(this.buildInteractiveSummaryGrid());
      innerWrapper.appendChild(this.buildPromptsSection());
      innerWrapper.appendChild(this.buildTranscriptsBlock());
      innerWrapper.appendChild(this.buildFooter());

      appContainer.appendChild(innerWrapper);
      this.targetElement.appendChild(appContainer);
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
          makeElement('h1', { className: 'text-3xl md:text-5xl font-extrabold text-[var(--text-title)] tracking-tight leading-none' }, 'AccuDraw & SmartLine Valuation Analysis'),
          makeElement('p', { className: 'text-[var(--text-secondary)] text-sm uppercase tracking-widest cad-mono font-semibold' }, 'A comparative analysis of enterprise value contribution')
        ]),

        // Beautiful personal backstory block
        this.buildBackstoryBlock()
      ]);
    }

  buildPromptsSection() {
      const container = makeElement('section', { className: 'cad-panel p-6 md:p-8 space-y-6' }, [
        makeElement('div', { className: 'max-w-2xl space-y-2' }, [
          makeElement('h2', { className: 'text-xl font-bold text-[var(--text-title)]' }, 'Run the Experiment Yourself'),
          makeElement('p', { className: 'text-[var(--text-secondary)] text-sm' }, 
            'To show the objectivity of these evaluations, you can copy the exact historical prompts used to query the LLMs. Paste these into any AI chat application to see results generated without prior bias or context memory.'
          )
        ])
      ]);

      const promptsWrapper = makeElement('div', { className: 'space-y-4' });

      this.data.prompts.forEach(p => {
        const item = makeElement('div', { className: 'p-4 bg-[var(--bg-panel-inner)] border border-[var(--border-color)] rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-[var(--border-hover)] transition' }, [
          makeElement('div', { className: 'space-y-1 flex-1' }, [
            makeElement('span', { className: 'text-xs uppercase tracking-wider cad-mono text-[#3b82f6] font-semibold' }, `Prompt #${p.id}`),
            makeElement('p', { className: 'text-sm text-[var(--text-primary)] font-mono italic leading-relaxed' }, `"${p.text}"`)
          ]),
          makeElement('button', {
            className: 'shrink-0 flex items-center gap-2 bg-[var(--btn-bg)] hover:bg-[var(--btn-hover)] border border-[var(--border-color)] text-[var(--btn-text)] transition text-xs font-semibold px-4 py-2.5 rounded',
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

      container.appendChild(promptsWrapper);
      return container;
    }

  buildInteractiveSummaryGrid() {
      const grid = makeElement('section', { className: 'w-full' });
      grid.appendChild(this.buildDashboardPanel());
      return grid;
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
        claude: "$1.5B - $3.0B",
        gemini: "$900M - $1.35B",
        chatgpt: "$200M - $1.0B",
        grok: "$500M - $2.0B+"
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
        makeElement('div', { className: 'flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-color)] pb-3 gap-4' }, [
          makeElement('h2', { className: 'text-xl font-bold text-[var(--text-title)] uppercase tracking-wider cad-mono' }, 'Detailed Model Transcripts'),
          
          makeElement('div', { className: 'flex gap-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] p-1 rounded-lg text-xs font-semibold' }, [
            this.buildFilterButton('all', 'Show All'),
            this.buildFilterButton('claude', 'Claude'),
            this.buildFilterButton('gemini', 'Gemini'),
            this.buildFilterButton('chatgpt', 'ChatGPT'),
            this.buildFilterButton('grok', 'Grok')
          ])
        ])
      ]);

      const transcriptsList = makeElement('div', { className: 'space-y-6', id: 'transcripts-container' });

      this.data.models.forEach(model => {
        if (this.activeTab !== 'all' && this.activeTab !== model.key) return;

        const card = makeElement('article', { className: 'cad-panel overflow-hidden relative' }, [
          makeElement('div', { className: 'h-1.5 w-full', style: { backgroundColor: model.color } }),

          makeElement('div', { className: 'p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6' }, [
            makeElement('div', { className: 'space-y-4 flex-1' }, [
              makeElement('div', { className: 'flex items-center gap-2.5' }, [
                makeElement('span', { className: 'w-2.5 h-2.5 rounded-full', style: { backgroundColor: model.color } }),
                makeElement('h3', { className: 'text-lg font-bold text-[var(--text-title)]' }, model.name)
              ]),
              
              makeElement('div', { className: 'bg-[var(--bg-panel-inner)] border border-[var(--border-color)] p-5 rounded-lg font-mono text-xs leading-relaxed text-[var(--text-primary)] space-y-4' }, 
                model.quotes.map(q => {
                  const highlightedHTML = this.highlightKeyPhrases(q);
                  return makeElement('p', { className: 'relative pl-3' }, [
                    makeElement('span', { className: 'absolute left-0 text-slate-700 select-none' }, '•'),
                    makeElement('span', { innerHTML: highlightedHTML })
                  ]);
                })
              )
            ]),

            makeElement('div', { className: 'md:w-60 shrink-0 flex flex-col justify-between items-start md:items-end gap-6' }, [
              makeElement('div', { className: 'text-left md:text-right space-y-1' }, [
                makeElement('span', { className: 'text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block cad-mono' }, 'Identified Valuation'),
                makeElement('div', { className: 'text-2xl font-black tracking-tight cad-mono', style: { color: model.color } }, `${model.min} - ${model.max}`),
                makeElement('span', { className: 'text-[11px] text-[var(--text-secondary)] block' }, `${model.pct}% Contribution of Bentley Cap`)
              ]),
              makeElement('a', {
                href: model.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'w-full text-center py-2 px-3 rounded text-[11px] font-bold border hover:text-[var(--text-title)] transition-colors block cad-mono',
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
        className: `px-3 py-1.5 rounded transition ${isActive ? 'bg-[#3b82f6] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-title)] hover:bg-[var(--btn-bg)]'}`,
        onclick: () => {
          this.activeTab = filterId;
          this.renderApp();
        }
      }, labelText);
    }

  buildFooter() {
      return makeElement('footer', { className: 'border-t border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-secondary)] text-[11px] py-8 px-4 rounded-lg' }, [
        makeElement('div', { className: 'max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4' }, [
          makeElement('p', { className: 'text-left leading-relaxed' }, 
            'This comparative data serves as an analytical mapping of historical public model calculations conducted in 2024 concerning MicroStation IP development.'
          ),
          makeElement('p', { className: 'text-right shrink-0 font-semibold text-[var(--text-secondary)] cad-mono' }, 
            'AccuDraw & SmartLine • 1994'
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



  buildBackstoryBlock() {
      return makeElement('div', { 
        className: 'p-6 md:p-8 rounded-xl border border-[var(--border-color)] space-y-6 transition-colors',
        style: {
          background: 'linear-gradient(135deg, var(--accent-story-from), var(--accent-story-to))'
        }
      }, [
        makeElement('p', { className: 'text-base md:text-lg text-[var(--text-primary)] leading-relaxed font-medium' }, 
          "In 1994, I joined Bentley Systems and implemented two features - AccuDraw and SmartLine - that became the signature of their flagship product, MicroStation. Users still cite them thirty years later as the primary reason they stay on the platform. Bentley is now a $9B company."
        ),
        makeElement('p', { className: 'text-sm md:text-base text-[var(--text-secondary)] leading-relaxed' }, 
          "The story behind them matters: I had originally conceived and patented a similar idea at Intergraph - which at the time owned fifty percent of Bentley. When it became clear Intergraph wasn't going to act on it, I went directly to Bentley and rebuilt the concept from scratch, earning their first ever patent in the process."
        ),
        makeElement('p', { className: 'text-sm md:text-base text-[var(--text-secondary)] leading-relaxed' }, 
          "I've always believed this contribution was significant. But \"significant\" is easy to dismiss."
        ),
        makeElement('p', { className: 'text-sm md:text-base text-[var(--text-secondary)] leading-relaxed' }, 
          "So I asked four leading AI systems - Claude, Gemini, ChatGPT, and Grok - to assess the value independently. I didn't tell them it was me.I gave them almost nothing to work with — beyond a few basic historical circumstances in prompt 3. The models already knew what AccuDraw and SmartLine were, what they meant to MicroStation, and why users valued them. The valuation estimates came from that existing knowledge, not from anything I told them."
        ),
        makeElement('p', { className: 'text-sm md:text-base text-[var(--text-primary)] font-semibold border-t border-[var(--border-color)]/30 pt-4' }, 
          "You don't have to take my word for it. The prompts are right here. Paste them into any chatbot yourself."
        )
      ]);
    }

  buildConsensusBlock() {
      return makeElement('div', {
        className: 'cad-panel p-8 flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-2 border-indigo-500/20 rounded-2xl shadow-xl'
      }, [
        makeElement('div', { className: 'space-y-2 max-w-xl' }, [
          makeElement('span', { className: 'inline-block bg-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded cad-mono' }, 'Consensus Composite Estimate'),
          makeElement('h2', { className: 'text-xl font-bold text-[var(--text-title)]' }, 'The Consolidated Valuation footprint'),
          makeElement('p', { className: 'text-sm text-[var(--text-secondary)] leading-relaxed' }, 
            'By calculating the midpoint of each AI model\'s calculated range (Claude, Gemini, ChatGPT, and Grok), we arrive at a unified composite average of Bentley Systems enterprise valuation directly tied to the AccuDraw and SmartLine IP.'
          )
        ]),
        makeElement('div', { className: 'text-center md:text-right shrink-0 space-y-1' }, [
          makeElement('div', { className: 'text-5xl md:text-6xl font-black text-indigo-400 tracking-tight cad-mono' }, '$1.3 Billion'),
          makeElement('span', { className: 'text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold block' }, 'Consensus Contributed Midpoint')
        ])
      ]);
    }
}