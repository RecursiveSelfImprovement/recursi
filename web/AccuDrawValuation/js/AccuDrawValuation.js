class AccuDrawValuation {
  // Highly modular entrance routing context
    async run(env) {
      if (!env || !env.container) {
        throw new Error("run() requires an environment object with a valid container.");
      }
      this.env = env;
      this.targetElement = env.container;

      this.initializeTheme();
      this.loadGoogleFont();
      this.setupState(this.parseRawContent());
      this.loadAppStyles();
      this.preloadResources();
      this.setupKeyboardListeners();
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

  // Upgraded destroy method to clear video playback fallbacks and players
    destroy() {
      if (this.valueEmberLogo) {
        this.valueEmberLogo.destroy();
      }
      if (this.bfnPlayer) {
        this.bfnPlayer.destroy();
        this.bfnPlayer = null;
      }
      if (this.fallbackTimeout) {
        clearTimeout(this.fallbackTimeout);
      }
      if (this.fallbackTriggerTimeout) {
        clearTimeout(this.fallbackTriggerTimeout);
      }
      const overlay = document.getElementById('bfn-overlay');
      if (overlay) {
        overlay.remove();
      }
      if (this._currentKeydownHandler) {
        window.removeEventListener('keydown', this._currentKeydownHandler);
      }
    }


  parseRawContent() {
      const rawElement = document.getElementById('raw-content');
      
      const fallback = {
        title: "AccuDraw & SmartLine Value Assessment",
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
            quotes: []
          },
          {
            key: "gemini",
            name: "Gemini 3.5 Pro",
            min: "1.5B",
            max: "3.5B",
            pct: 27,
            color: "#3b82f6",
            url: "https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221KauHXifVO0ic-dTm5xabfotN7HnsE8ew%22%5D,%22action%22:%22open%22,%22userId%22:%22110615187007890782355%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing",
            quotes: []
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
        ],
        introHTML: "",
        conversations: {}
      };

      if (!rawElement) return fallback;

      try {
        const title = rawElement.querySelector('header h1')?.textContent || fallback.title;

        // Parse Prompts
        const prompts = [];
        rawElement.querySelectorAll('#raw-prompts .prompt-item').forEach(el => {
          prompts.push({
            id: el.getAttribute('data-id') || "1",
            text: el.querySelector('p')?.textContent || ""
          });
        });

        // Parse Intro/Synthesis text
        const introEl = rawElement.querySelector('#dialogue-intro');
        const introHTML = introEl ? introEl.innerHTML : "";

        // Parse models metadata
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

        // Parse conversations
        const conversations = {};
        rawElement.querySelectorAll('.raw-conversation').forEach(convEl => {
          const modelKey = convEl.getAttribute('data-model');
          if (modelKey) {
            conversations[modelKey] = convEl.innerHTML;
          }
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
          models: mergedModels,
          introHTML,
          conversations
        };
      } catch (err) {
        console.warn("Parsing raw HTML data failed, fallback to defaults.", err);
        return fallback;
      }
    }

  // Refactored setup state initialization with stored motion scale settings
    setupState(data) {
      this.data = data;
      this.activeTab = 'all';
      this.resultsRevealed = false;
      this.isTransitioning = false;
      this.revealMode = localStorage.getItem('accudraw-reveal-mode') || 'drum-roll';
      this.wrongAnswerStage = 0;
      this.justCorrected = false;
      this.isCalculating = false;
      this.showRecalculateButton = false;
      this.showBFNButton = false;
      this.motionValue = parseFloat(localStorage.getItem('accudraw-motion-val') || '1.0');
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

  // Render configuration with live motion properties
    renderApp() {
      this.targetElement.innerHTML = "";
      
      const themeClass = this.currentTheme === 'light' ? 'cad-container cad-grid-bg theme-light' : 'cad-container cad-grid-bg';
      
      const appContainer = makeElement("div", { className: themeClass });
      appContainer.style.setProperty('--motion-scale', String(this.motionValue));

      const innerWrapper = makeElement("div", { className: "cad-wrapper" });

      innerWrapper.appendChild(this.buildMinimalHeader());
      innerWrapper.appendChild(this.buildBackstoryBlock());
      innerWrapper.appendChild(this.buildPromptsSection());

      if (this.resultsRevealed) {
        innerWrapper.appendChild(this.buildConsensusBlock());
        innerWrapper.appendChild(this.buildInteractiveSummaryGrid());
        innerWrapper.appendChild(this.buildTranscriptsBlock());
        innerWrapper.appendChild(this.buildExtendedQueriesSection());
      } else {
        innerWrapper.appendChild(this.buildRevealCTA());
      }

      innerWrapper.appendChild(this.buildFooter());

      appContainer.appendChild(innerWrapper);
      this.targetElement.appendChild(appContainer);

      if (this.resultsRevealed && !this._isAwaitingRecalculation()) {
        const emberValText = this.targetElement.querySelector('.glowing-consensus-value');
        if (emberValText) {
          if (this.valueEmberLogo) {
            this.valueEmberLogo.destroy();
          }
          this.valueEmberLogo = new ValueEmberLogo(emberValText, {
            isAwake: true,
            emberCountMultiplier: 0.4 * this.motionValue,
            emberSpeedMultiplier: 0.3 * this.motionValue,
            emberSizeMultiplier: 0.4 * this.motionValue
          });
        }
      } else if (this.valueEmberLogo) {
        this.valueEmberLogo.destroy();
        this.valueEmberLogo = null;
      }
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

  

  

  // Displays the original primary, short valuation quotes for all 4 models untouched
    buildTranscriptsBlock() {
      const container = makeElement('section', { className: 'space-y-6' }, [
        makeElement('div', { className: 'transcripts-bar' }, [
          makeElement('h2', { className: 'transcripts-bar-title' }, 'Model Valuation Quotes'),
          
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
          "So I asked four leading AI systems - Claude, Gemini, ChatGPT, and Grok - to assess the value independently. I didn't tell them it was me. I gave them the neutral facts and asked them to do the math. They arrived at a consensus midpoint of a staggering portion of the industry's overall valuation."
        ),
        makeElement('p', { className: 'backstory-paragraph-bold' }, 
          "You don't have to take my word for it. The prompts are right here. Paste them into any chatbot yourself."
        )
      ]);
    }

  // Upgraded Consensus block builder that allocates a stable structural action spacer below the digits
    // and keeps the left information panel isolated so that width changes and button fades cause zero layout movement.
    buildConsensusBlock() {
      const wrongSequence = ['$2.3 Million', '$23 Million', '$230 Million'];
      const finalValue = '$2.3 Billion';
      
      const stage = this.wrongAnswerStage || 0;
      const isWrongState = this.revealMode === 'wrong-answers' && stage < wrongSequence.length;
      
      const displayValue = isWrongState ? wrongSequence[stage] : finalValue;
      const isWrongOrCalc = isWrongState || this.isCalculating;
      const valueClassName = `glowing-consensus-value${isWrongOrCalc ? ' is-wrong' : ''}`;

      const figureChildren = [
        makeElement('div', { className: valueClassName }, this.isCalculating ? 'Calculating...' : displayValue)
      ];

      // Action node structurally rendered inside the stable spacer
      let actionNode;
      if (isWrongState) {
        const isBtnActive = this.showRecalculateButton && !this.isCalculating;
        actionNode = makeElement('button', {
          className: `recalculate-btn ${isBtnActive ? 'is-visible' : 'is-hidden'}`,
          onclick: () => this.advanceWrongAnswer()
        }, [
          makeElement('span', { className: 'recalculate-icon' }, '✕'),
          makeElement('span', {}, 'Incorrect answer - Recalculate')
        ]);
      } else {
        const subtextText = this.justCorrected ? '✓ Correct answer' : 'Consensus Contributed Midpoint';
        const subtextClass = `consensus-figure-subtext${this.justCorrected ? ' flash-correct' : ''}`;
        
        const bfnBtn = this.showBFNButton ? makeElement('button', {
          className: 'visualize-bfn-btn animate-fade-in',
          onclick: () => this.startBFNPlayback()
        }, [
          makeElement('span', { className: 'play-pulse-icon' }, '▶'),
          makeElement('span', {}, 'Visualize the B.F.N.')
        ]) : null;

        actionNode = makeElement('div', { className: 'consensus-action-wrapper' }, [
          makeElement('span', { className: subtextClass }, subtextText),
          bfnBtn
        ]);
      }

      // Stable structural spacer that occupies space at all times to prevent height shifting
      figureChildren.push(makeElement('div', { className: 'consensus-action-spacer' }, actionNode));

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

  // Refactored minimal header builder that maps extracted toggle widgets and motion sliders
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

      const controlsGroup = makeElement('div', {
        className: 'flex flex-col items-end'
      }, [
        this.buildThemeToggle(),
        makeElement('div', { className: 'reveal-mode-row' }, [
          revealModeSelect
        ]),
        this.buildMotionSlider()
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

  // Handles the initial reveal timing and starts the delay for stage 0 if wrong-answers mode is selected
    triggerReveal(buttonElement) {
      if (this.isTransitioning) return;

      // Reset any active states
      this.wrongAnswerStage = 0;
      this.justCorrected = false;
      this.isCalculating = false;
      this.showRecalculateButton = false;
      this.showBFNButton = false;

      if (this.revealMode === 'no-drama' || this.revealMode === 'wrong-answers') {
        this.resultsRevealed = true;
        this.renderApp();
        this._scrollToConsensusBlock();

        if (this.revealMode === 'wrong-answers') {
          // Prime the 1-second delayed slide-in for the "recalculate" warning button on stage 0
          setTimeout(() => {
            this.showRecalculateButton = true;
            this.renderApp();
          }, 1000);
        } else {
          this.triggerBFNButtonDelay();
        }
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
              this.triggerBFNButtonDelay();
            }
          });
          snare.trigger(buttonElement);
        } else {
          setTimeout(() => {
            this.resultsRevealed = true;
            this.isTransitioning = false;
            this.renderApp();
            this.triggerBFNButtonDelay();
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

  // Interactive recalculation step: transitions through rapid random valuations over 1.5 seconds,
    // and slide-shows the warning indicator strictly 1 second after the new digit resolves.
    advanceWrongAnswer() {
      if (this.wrongAnswerStage >= 3 || this.isCalculating) return;

      // Clear the warning button and launch calculation animation
      this.isCalculating = true;
      this.showRecalculateButton = false;
      this.renderApp();

      const tickerPool = [
        '$145K', '$2.8 Million', '$38 Million', '$620K', '$84.1 Million',
        '$5.4 Million', '$115 Million', '$430K', '$1.8 Billion', '$72 Million',
        '$9.1 Million', '$280K', '$2.4B', '$81.5M', '$4.2 Million', '$19.3 Million'
      ];

      // Spin numbers at high-speed every 90ms for a playful active calculation aesthetic
      const tickInterval = setInterval(() => {
        const valueNode = this.targetElement.querySelector('.glowing-consensus-value');
        if (valueNode) {
          valueNode.textContent = tickerPool[Math.floor(Math.random() * tickerPool.length)];
        }
      }, 90);

      // Resolve the calculation sequence after 1.5 seconds
      setTimeout(() => {
        clearInterval(tickInterval);
        this.isCalculating = false;
        
        this.wrongAnswerStage++;
        if (this.wrongAnswerStage === 3) {
          this.justCorrected = true;
          this.triggerBFNButtonDelay();
        }

        this.renderApp();

        if (this.wrongAnswerStage === 3) {
          // Landing on correct Billions figure
          setTimeout(() => {
            this.justCorrected = false;
            const subtext = this.targetElement.querySelector('.consensus-figure-subtext');
            if (subtext) {
              subtext.classList.remove('flash-correct');
              subtext.textContent = 'Consensus Contributed Midpoint';
            }
          }, 1800);
        } else {
          // Wrong answer resolved, delay slide-in of the warning button by exactly 1.0 seconds
          setTimeout(() => {
            this.showRecalculateButton = true;
            this.renderApp();
          }, 1000);
        }
      }, 1500);
    }

  // Upgraded smart highlighter that fully covers the Claude transcript phrases
    // and guarantees that each highlight rule fires strictly on its first occurrence.
    applySmartHighlights(containerElement) {
      const rules = [
        // --- Claude's Transcript Highlights ---
        {
          id: "claude_valuation",
          start: "directly contributed",
          end: "between $1.5B and $3B",
          className: "slick-glow-highlight"
        },
        {
          id: "claude_trajectory",
          start: "one of the highest individual contributions",
          end: "trajectory",
          className: "slick-glow-highlight"
        },
        {
          id: "claude_rarity",
          start: "extremely rare",
          end: "few dozen plausible cases",
          className: "slick-glow-highlight"
        },
        {
          id: "claude_productivity_tool",
          start: "A productivity/workflow tool",
          end: "retention and differentiation",
          className: "slick-glow-highlight"
        },

        // --- Gemini's Transcript Highlights ---
        {
          id: "gemini_pivotal_figure",
          start: "He was a pivotal figure in the UX and drafting history",
          end: "quietly shaped the modern tech landscape",
          className: "slick-glow-highlight"
        },
        {
          id: "gemini_astronomical",
          start: "contribution to Bentley Systems yielded",
          end: "astronomical return on investment",
          className: "slick-glow-highlight"
        },
        {
          id: "gemini_disproportionate",
          start: "An individual hire bringing",
          end: "extraordinarily rare",
          className: "slick-glow-highlight"
        },
        {
          id: "gemini_inspect_element",
          start: "Inspect Element",
          end: "developer console used by millions of web developers",
          className: "slick-glow-highlight"
        },
        {
          id: "gemini_most_successful",
          start: "this represents one of the most successful product-design returns",
          end: "CAD industry",
          className: "slick-glow-highlight"
        },
        {
          id: "gemini_most_profitable",
          start: "highly reasonable and defensible to argue",
          end: "hires in tech history",
          className: "slick-glow-highlight"
        },
        {
          id: "gemini_multiplier",
          start: "return of",
          end: "3,000x on the initial cost of employment",
          className: "slick-glow-highlight"
        }
      ];

      const usedRules = new Set();

      const elements = containerElement.querySelectorAll('p, li, blockquote, td');
      elements.forEach(el => {
        let html = el.innerHTML;
        let text = el.textContent || "";

        rules.forEach(rule => {
          if (usedRules.has(rule.id)) return; // Strictly enforce first-occurrence-only

          const startIdx = text.indexOf(rule.start);
          const endIdx = text.indexOf(rule.end, startIdx);
          
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            const matchedPhrase = text.substring(startIdx, endIdx + rule.end.length);
            const escapedPhrase = matchedPhrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedPhrase, 'g');
            html = html.replace(regex, `<span class="${rule.className}">${matchedPhrase}</span>`);
            usedRules.add(rule.id);
          }
        });

        el.innerHTML = html;
      });
    }

  buildSynthesisIntroBlock() {
      if (!this.data.introHTML) return null;

      const card = makeElement('div', { className: 'synthesis-intro-card' });
      card.innerHTML = this.data.introHTML;

      const title = card.querySelector('h2');
      if (title) title.className = 'synthesis-intro-title';

      card.querySelectorAll('p').forEach(p => {
        p.className = 'synthesis-intro-p';
      });

      const badgeRow = makeElement('div', { className: 'synthesis-badge-row' }, [
        makeElement('span', { className: 'synthesis-badge' }, '🔍 Extended Dialogue Analysis'),
        makeElement('span', { className: 'synthesis-badge synthesis-badge-purple' }, '⚖️ Historical Uniqueness')
      ]);
      card.appendChild(badgeRow);

      return card;
    }

  // --- Modular CSS Injection Functions ---
    // Splitting CSS styling to support simple modifications of individual components

    applyBaseStyles() {
      applyCss(`
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
      `, 'cad-base-styles');
    }

  applyHeaderThemeStyles() {
      applyCss(`
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
      `, 'cad-header-theme-styles');
    }

  applyBackstoryStoryStyles() {
      applyCss(`
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
      `, 'cad-backstory-styles');
    }

  applyPromptCardStyles() {
      applyCss(`
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
      `, 'cad-prompt-styles');
    }

  // Upgraded styling that allocates stable grid column widths, isolates the left-side text wrapper,
    // and adds a highly attractive, playful incorrect scale & glow breathing pulse to error states.
    applyConsensusStyles() {
      applyCss(`
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
          transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
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

        /* Prevent left information pane wrapping or bouncing during calculations */
        .consensus-info-pane {
          flex: 1;
          min-width: 0;
        }

        /* Stable, fixed column width for numbers pane to avoid squishing of adjacent text */
        .consensus-figure-pane {
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        @media (min-width: 768px) {
          .consensus-figure-pane {
            width: 320px;
            align-items: flex-end;
            text-align: right;
          }
        }

        /* Playful breathing error animation for incorrect steps */
        @keyframes playfulIncorrectPulse {
          0% {
            transform: scale(1);
            filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.25));
          }
          50% {
            transform: scale(1.04);
            filter: drop-shadow(0 0 18px rgba(239, 68, 68, 0.7));
          }
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.25));
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
          transition: transform 0.2s ease;
        }
        @media (min-width: 768px) {
          .glowing-consensus-value { font-size: 48px; }
        }
        .glowing-consensus-value.is-wrong {
          color: #fca5a5 !important;
          animation: playfulIncorrectPulse 1.6s infinite ease-in-out;
          display: inline-block;
        }

        /* Action spacer keeps layout position perfectly stable when button is hidden vs shown */
        .consensus-action-spacer {
          height: auto;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
          margin-top: 12px;
        }
        @media (min-width: 768px) {
          .consensus-action-spacer {
            justify-content: flex-end;
          }
        }

        .recalculate-btn {
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #f87171;
          font-size: 11px;
          font-weight: 700;
          font-family: ui-monospace, monospace;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          outline: none;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, visibility 0.3s;
        }
        .recalculate-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-1px);
        }
        .recalculate-btn.is-hidden {
          opacity: 0;
          visibility: hidden;
          transform: translateY(8px);
          pointer-events: none;
        }
        .recalculate-btn.is-visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          pointer-events: auto;
        }

        .consensus-figure-subtext {
          white-space: nowrap;
          margin-top: 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
          font-weight: 700;
          font-family: ui-monospace, monospace;
        }
      `, 'cad-consensus-styles');
    }

  applyDashboardGridStyles() {
      applyCss(`
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
      `, 'cad-dashboard-styles');
    }

  applySynthesisIntroStyles() {
      applyCss(`
        .synthesis-intro-card {
          padding: 32px;
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          line-height: 1.6;
        }
        .synthesis-intro-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-title);
          font-family: ui-monospace, monospace;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        .synthesis-intro-p {
          font-size: 15px;
          color: var(--text-primary);
        }
        .synthesis-badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }
        .synthesis-badge {
          font-size: 11px;
          font-family: ui-monospace, monospace;
          font-weight: 700;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 4px;
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .synthesis-badge-purple {
          background-color: rgba(168, 85, 247, 0.1);
          color: #a855f7;
          border: 1px solid rgba(168, 85, 247, 0.2);
        }
      `, 'cad-synthesis-styles');
    }

  applyTranscriptsStyles() {
      applyCss(`
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
          gap: 32px;
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
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .transcript-card-main {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .transcript-author-group {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        .transcript-author-circle {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .transcript-author-header {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-title);
        }
        
        .conversation-flow {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-top: 12px;
        }
        .conversation-turn {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 20px;
          border-radius: 8px;
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
        }
        .conversation-turn.speaker-user {
          border-left: 3px solid #3b82f6;
          background-color: rgba(59, 130, 246, 0.02);
        }
        .conversation-turn.speaker-model {
          border-left: 3px solid var(--accent-color, #10b981);
          background-color: rgba(16, 185, 129, 0.02);
        }
        .turn-header {
          font-size: 11px;
          font-family: ui-monospace, monospace;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .conversation-turn.speaker-user .turn-header {
          color: #3b82f6;
        }
        .conversation-turn.speaker-model .turn-header {
          color: var(--accent-color, #10b981);
        }
        
        .turn-body {
          font-size: 14.5px;
          line-height: 1.6;
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .turn-body h3, .turn-body h4 {
          color: var(--text-title);
          margin-top: 8px;
          font-size: 16px;
          font-weight: 700;
        }
        .turn-body p strong {
          color: var(--text-title);
        }
        .turn-body ul, .turn-body ol {
          margin-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .turn-body li::marker {
          color: var(--text-secondary);
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
      `, 'cad-transcripts-styles');
    }

  // Upgraded animation styling that introduces a vivid breathing background glow,
    // rich premium coloration, and smooth ambient expanding shadow ripples instead of generic underlines.
    applyHighlightAnimationStyles() {
      applyCss(`
        .highlight-range {
          background-color: rgba(245, 158, 11, 0.08);
          color: #f59e0b;
          font-weight: 600;
          padding: 2px 4px;
          border-radius: 4px;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .highlight-percent {
          background-color: rgba(59, 130, 246, 0.08);
          color: #3b82f6;
          font-weight: 600;
          padding: 2px 4px;
          border-radius: 4px;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .cad-container.theme-light .highlight-percent {
          color: #1d4ed8;
        }
        .highlight-asymmetry {
          background-color: rgba(239, 68, 68, 0.08);
          color: #f87171;
          font-weight: 600;
          border-bottom: 2px dotted #ef4444;
          padding: 2px 4px;
          border-radius: 4px;
        }
        .cad-container.theme-light .highlight-asymmetry {
          color: #dc2626;
        }
        .highlight-merit {
          background-color: rgba(168, 85, 247, 0.08);
          color: #c084fc;
          font-weight: 600;
          border-bottom: 1.5px solid #a855f7;
          padding: 2px 4px;
          border-radius: 4px;
        }
        .cad-container.theme-light .highlight-merit {
          color: #7e22ce;
        }
        .highlight-value {
          color: #2dd4bf;
          font-weight: 600;
          border-bottom: 2px solid #0d9488;
          padding: 2px 4px;
          border-radius: 4px;
          background-color: rgba(45, 212, 191, 0.08);
        }
        .cad-container.theme-light .highlight-value {
          color: #0d9488;
        }

        /* Highly polished gradient background ripple & color breath animation (no underline) */
        .slick-glow-highlight {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(236, 72, 153, 0.12) 50%, rgba(59, 130, 246, 0.16) 100%);
          background-size: 200% 100%;
          color: #ffb74d !important;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid rgba(245, 158, 11, 0.25);
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.15);
          animation: highEndGlowBreath 4.5s infinite ease-in-out;
          display: inline;
          transition: all 0.3s ease;
        }

        .cad-container.theme-light .slick-glow-highlight {
          color: #b45309 !important;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(236, 72, 153, 0.06) 50%, rgba(59, 130, 246, 0.08) 100%);
          border-color: rgba(245, 158, 11, 0.22);
        }

        @keyframes highEndGlowBreath {
          0% {
            background-position: 0% 50%;
            box-shadow: 0 0 6px rgba(245, 158, 11, 0.15), 0 0 0 0px rgba(245, 158, 11, 0.0);
            filter: saturate(0.96);
          }
          50% {
            background-position: 50% 50%;
            box-shadow: 0 0 18px rgba(245, 158, 11, 0.35), 0 0 0 6px rgba(236, 72, 153, 0.08);
            filter: saturate(1.12);
          }
          100% {
            background-position: 100% 50%;
            box-shadow: 0 0 6px rgba(59, 130, 246, 0.15), 0 0 0 0px rgba(59, 130, 246, 0.0);
            filter: saturate(0.96);
          }
        }
      `, 'cad-highlight-animation-styles');
    }

  // New dedicated bottom section holding the narrative introduction and the extended transcript queries
    buildExtendedQueriesSection() {
      const container = makeElement('section', { className: 'space-y-8 mt-12 pt-12 border-t border-[var(--border-color)]' }, [
        makeElement('div', { className: 'space-y-2' }, [
          makeElement('h2', { 
            className: 'text-2xl font-black text-[var(--text-title)] uppercase tracking-wider',
            style: { fontFamily: "ui-monospace, monospace" }
          }, 'Extended Queries & Historical Rarity Analysis'),
          makeElement('p', { className: 'text-sm text-[var(--text-secondary)]' }, 
            'Deep dive dialogues assessing the exceptional rarity of high-leverage single-hire innovations in technology history.'
          )
        ])
      ]);

      // 1. Narrative Introduction Card
      const introCard = this.buildSynthesisIntroBlock();
      if (introCard) {
        container.appendChild(introCard);
      }

      // 2. Full stacked transcripts list for the extended Claude and Gemini conversations
      const dialogueList = makeElement('div', { className: 'transcripts-card-list mt-8' });

      ['claude', 'gemini'].forEach(key => {
        const model = this.data.models.find(m => m.key === key);
        const convHTML = this.data.conversations[key];
        if (!model || !convHTML) return;

        const card = makeElement('article', { className: 'cad-panel transcript-detail-card' }, [
          makeElement('div', { className: 'transcript-card-stripe', style: { backgroundColor: model.color } })
        ]);

        const cardInner = makeElement('div', { className: 'transcript-card-inner' });
        const cardMain = makeElement('div', { className: 'transcript-card-main' });

        const authorGroup = makeElement('div', { className: 'transcript-author-group' }, [
          makeElement('span', { className: 'transcript-author-circle', style: { backgroundColor: model.color } }),
          makeElement('h3', { className: 'transcript-author-header' }, `${model.name} - Extended Dialogue`)
        ]);
        cardMain.appendChild(authorGroup);

        const flowWrapper = makeElement('div', { className: 'conversation-flow', innerHTML: convHTML });
        
        flowWrapper.querySelectorAll('.turn').forEach(turn => {
          const isUser = turn.classList.contains('speaker-user');
          turn.className = `conversation-turn ${isUser ? 'speaker-user' : 'speaker-model'}`;
          turn.style.setProperty('--accent-color', model.color);

          // Prompt header label matches the user turns cleanly, or identifies the model name
          const labelText = isUser ? 'Prompt' : model.name;
          const headerLabel = makeElement('div', { className: 'turn-header' }, labelText);
          turn.insertBefore(headerLabel, turn.firstChild);

          // Process and filter redundant heads or duplicate speaker titles inside the body
          const bodyWrapper = makeElement('div', { className: 'turn-body' });
          const originalChildren = Array.from(turn.children).slice(1);
          
          originalChildren.forEach(child => {
            const tagName = child.tagName.toLowerCase();
            const childText = child.textContent.trim().toLowerCase();

            // Strip redundant big headings like <h3>Rob</h3> or <h3>Claude's Assessment</h3> inside dialog turns
            if ((tagName === 'h3' || tagName === 'h4') && 
                (childText === 'rob' || 
                 childText === 'claude' || 
                 childText === 'gemini' || 
                 childText.includes('assessment') || 
                 childText.includes('response') || 
                 childText.includes('reveal') || 
                 childText.includes('question') || 
                 childText.includes('summary estimate'))) {
              return;
            }
            bodyWrapper.appendChild(child);
          });

          turn.appendChild(bodyWrapper);
        });

        // Apply smart anchor highlights programmatically to the detailed transcripts (strictly first occurrence)
        this.applySmartHighlights(flowWrapper);
        cardMain.appendChild(flowWrapper);

        cardInner.appendChild(cardMain);
        card.appendChild(cardInner);
        dialogueList.appendChild(card);
      });

      container.appendChild(dialogueList);
      return container;
    }

  applyRevealCtaStyles() {
      applyCss(`
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
      `, 'cad-reveal-cta-styles');
    }

  // BFN Video Preloading Logic with self-healing fallback listener and play state observer
    preloadBFNPlayer() {
      if (this.bfnPlayer) return;

      this.buildBFNOverlay();

      const videoFrame = document.getElementById('bfn-video-frame');
      if (!videoFrame) return;

      try {
        this.bfnPlayer = new VideoPlayer({
          container: videoFrame,
          containerId: 'bfn-video-frame',
          playerType: 'youtube',
          videoId: 'ply26G4DdcM',
          autoplay: false,
          controls: false,
          startTime: 0,
          endTime: 22
        }, (evt) => {
          if (evt.type === 'ready') {
            if (this.playPending) {
              this.playPending = false;
              this.executeBFNPlay();
            }
          }
          if (evt.type === 'play') {
            // Once YouTube transitions to playing, safely fade in the container to hide initial black flashes or thumbnails
            const activeFrame = document.getElementById('bfn-video-frame');
            if (activeFrame) {
              activeFrame.style.opacity = '1';
            }
          }
          if (evt.type === 'end') {
            this.fadeAndCloseBFN();
          }
        });
      } catch (e) {
        console.warn("Failed to init VideoPlayer, direct fallback will be used", e);
      }
    }

  // Centered theatrical background video overlay frame starting completely transparent
    buildBFNOverlay() {
      if (document.getElementById('bfn-overlay')) return;

      const overlay = makeElement('div', {
        id: 'bfn-overlay',
        style: {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(5, 7, 18, 0.95)',
          zIndex: '9990',
          opacity: '0',
          pointerEvents: 'none',
          transition: 'opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }
      }, [
        makeElement('button', {
          className: 'bfn-close-btn',
          onclick: () => this.fadeAndCloseBFN(),
          style: {
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10001',
            transition: 'all 0.2s'
          }
        }, '✕'),
        
        makeElement('div', {
          id: 'bfn-video-frame',
          style: {
            width: '85vw',
            height: '47.8vw',
            maxWidth: '1200px',
            maxHeight: '675px',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            overflow: 'hidden',
            backgroundColor: '#000000',
            transition: 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease-in-out',
            transform: 'scale(0.9) translateY(20px)',
            opacity: '0' // Start transparent to block initial thumbnail flashes
          }
        })
      ]);

      document.body.appendChild(overlay);
    }

  // Begins dramatic background drone playback, showing overlay first and deferring video frame opacity
    startBFNPlayback() {
      this.buildBFNOverlay();
      this.preloadBFNPlayer();

      const overlay = document.getElementById('bfn-overlay');
      const videoFrame = document.getElementById('bfn-video-frame');
      const consensusContainer = this.targetElement.querySelector('.consensus-container');

      if (consensusContainer) {
        consensusContainer.scrollIntoView({ block: 'center', behavior: 'smooth' });
        
        setTimeout(() => {
          consensusContainer.classList.add('bfn-highlighted');
          document.body.classList.add('bfn-active');
          
          if (overlay) {
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
          }
          if (videoFrame) {
            videoFrame.style.transform = 'scale(1) translateY(0)';
          }

          if (this.bfnPlayer && this.bfnPlayer.isReady) {
            this.executeBFNPlay();
          } else {
            this.playPending = true;
            // Fallback safety timeout: if player ready event never triggers, run direct fallback in 1.2s
            if (this.fallbackTriggerTimeout) clearTimeout(this.fallbackTriggerTimeout);
            this.fallbackTriggerTimeout = setTimeout(() => {
              if (this.playPending) {
                this.playPending = false;
                this.executeBFNPlay();
              }
            }, 1200);
          }
        }, 500);
      }
    }

  // Smoothly closes the BFN theatrical overlay after fading the video frame out to avoid flash stutters
    fadeAndCloseBFN() {
      const overlay = document.getElementById('bfn-overlay');
      const videoFrame = document.getElementById('bfn-video-frame');
      const consensusContainer = this.targetElement.querySelector('.consensus-container');

      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }
      if (videoFrame) {
        videoFrame.style.opacity = '0'; // Immediately fade the frame out
        videoFrame.style.transform = 'scale(0.9) translateY(20px)';
      }

      if (this.fallbackTimeout) {
        clearTimeout(this.fallbackTimeout);
      }

      // Defer video state changes/pause commands until the frame is fully transparent to conceal closing artifacts
      setTimeout(() => {
        if (this.bfnPlayer) {
          try {
            this.bfnPlayer.pause();
          } catch (e) {}
        }
        document.body.classList.remove('bfn-active');
        if (consensusContainer) {
          consensusContainer.classList.remove('bfn-highlighted');
        }
      }, 800);
    }

  // Handles the delayed presentation of the BFN CTA shortly after revealing the number
    triggerBFNButtonDelay() {
      this.showBFNButton = false;
      this.preloadBFNPlayer();
      setTimeout(() => {
        this.showBFNButton = true;
        this.renderApp();
      }, 1200);
    }

  // Upgraded BFN Style configurations that isolate ONLY the 2.3B figure on top, fading everything else
    applyBFNStyles() {
      applyCss(`
        .consensus-action-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        @media (min-width: 768px) {
          .consensus-action-wrapper {
            align-items: flex-end;
          }
        }

        .visualize-bfn-btn {
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          border: none;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          font-family: ui-monospace, monospace;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          outline: none;
        }
        .visualize-bfn-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 6px 18px rgba(239, 68, 68, 0.45);
        }
        .visualize-bfn-btn:active {
          transform: translateY(0);
        }
        .play-pulse-icon {
          font-size: 9px;
          display: inline-block;
          animation: bfnPlayPulse 1.5s infinite;
        }
        @keyframes bfnPlayPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }

        .bfn-close-btn:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: scale(1.05);
        }

        .animate-fade-in {
          animation: bfnBtnFadeIn 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes bfnBtnFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Elevate only the 2.3 Billion figure on top of everything, hiding consensus box styling */
        body.bfn-active .consensus-container {
          position: relative !important;
          z-index: 10000 !important;
          background: transparent !important;
          border-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        body.bfn-active .consensus-info-pane {
          opacity: 0 !important;
          pointer-events: none !important;
          transition: opacity 0.5s ease !important;
        }

        body.bfn-active .consensus-action-spacer {
          opacity: 0 !important;
          pointer-events: none !important;
          transition: opacity 0.5s ease !important;
        }

        body.bfn-active .glowing-consensus-value {
          position: relative !important;
          z-index: 10001 !important;
        }

        body.bfn-active {
          overflow: hidden !important;
        }
      `, 'bfn-styles');
    }

  // Execution routine that verifies iframe availability or runs custom fast embed fallback
    executeBFNPlay() {
      const videoFrame = document.getElementById('bfn-video-frame');
      if (!videoFrame) return;

      const hasIframe = videoFrame.querySelector('iframe');
      
      if (this.bfnPlayer && this.bfnPlayer.isReady && hasIframe) {
        try {
          this.bfnPlayer.seekTo(0);
          this.bfnPlayer.unMute();
          this.bfnPlayer.setVolume(80);
          this.bfnPlayer.play();
        } catch (e) {
          console.warn("Playback error, triggering direct fallback", e);
          this.useDirectIframeFallback(videoFrame);
        }
      } else {
        this.useDirectIframeFallback(videoFrame);
      }
    }

  // Safe direct iframe embed helper with smooth delayed fade-in to bypass YouTube load flashes
    useDirectIframeFallback(videoFrame) {
      videoFrame.innerHTML = '';
      const iframe = makeElement('iframe', {
        src: 'https://www.youtube.com/embed/ply26G4DdcM?autoplay=1&controls=0&start=0&end=22&enablejsapi=1&rel=0&showinfo=0',
        style: {
          width: '100%',
          height: '100%',
          border: 'none'
        },
        allow: 'autoplay; encrypted-media',
        allowfullscreen: 'true'
      });
      videoFrame.appendChild(iframe);

      // Smoothly fade in the iframe after 1.5 seconds, bypassing loading flicker
      setTimeout(() => {
        const activeFrame = document.getElementById('bfn-video-frame');
        if (activeFrame) {
          activeFrame.style.opacity = '1';
        }
      }, 1500);

      if (this.fallbackTimeout) clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = setTimeout(() => {
        this.fadeAndCloseBFN();
      }, 22000);
    }

  // Isolate context active theme variables
    initializeTheme() {
      document.body.classList.add('js-active');
      this.currentTheme = localStorage.getItem('accudraw-valuation-theme') || 'light';
    }

  // Isolate CSS injection chains
    loadAppStyles() {
      this.applyBaseStyles();
      this.applyHeaderThemeStyles();
      this.applyBackstoryStoryStyles();
      this.applyPromptCardStyles();
      this.applyConsensusStyles();
      this.applyDashboardGridStyles();
      this.applySynthesisIntroStyles();
      this.applyTranscriptsStyles();
      this.applyHighlightAnimationStyles();
      this.applyRevealCtaStyles();
      this.applyBFNStyles();
    }

  // Proactively preload media files and caches
    preloadResources() {
      if (window.SnareDrumAnimation) {
        try {
          SnareDrumAnimation.preload('/LogoExperiments/drumroll.mp4');
        } catch (e) {
          console.warn("Drumroll preloading fallback:", e);
        }
      }
      if (this.resultsRevealed) {
        this.preloadBFNPlayer();
      }
    }

  // Extracted light/dark mode header button render helper
    buildThemeToggle() {
      return makeElement('div', { className: 'theme-switcher' }, [
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
    }

  // Dynamic slider to adjust animation frequency on text highlights and value embers
    buildMotionSlider() {
      const slider = makeElement('input', {
        type: 'range',
        min: '0.1',
        max: '3.0',
        step: '0.1',
        value: String(this.motionValue || 1.0),
        className: 'motion-slider',
        oninput: (e) => {
          this.updateMotionValue(parseFloat(e.target.value));
        }
      });

      return makeElement('div', { className: 'motion-slider-row' }, [
        makeElement('span', { className: 'motion-slider-label' }, 'Motion'),
        slider
      ]);
    }

  // Dynamic motion values broadcaster to styles and active instances
    updateMotionValue(val) {
      this.motionValue = val;
      localStorage.setItem('accudraw-motion-val', String(val));
      
      const container = this.targetElement.querySelector('.cad-container');
      if (container) {
        container.style.setProperty('--motion-scale', String(val));
      }

      if (this.valueEmberLogo) {
        this.valueEmberLogo.options.emberCountMultiplier = 0.4 * val;
        this.valueEmberLogo.options.emberSpeedMultiplier = 0.3 * val;
        this.valueEmberLogo.options.emberSizeMultiplier = 0.4 * val;
      }
    }

  // Keyboard listener to dynamically capture selected text and generate clipboard highlight syntax
    setupKeyboardListeners() {
      if (this._currentKeydownHandler) {
        window.removeEventListener('keydown', this._currentKeydownHandler);
      }

      this._currentKeydownHandler = (e) => {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
          return;
        }

        if (e.key === 't' || e.key === 'T') {
          const selection = window.getSelection();
          const text = selection.toString().trim();
          if (text) {
            const config = this.generateHighlightConfig(text);
            if (config) {
              const codeString = `{\n  id: "${config.id}",\n  start: "${config.start}",\n  end: "${config.end}",\n  className: "slick-glow-highlight"\n},`;
              navigator.clipboard.writeText(codeString).then(() => {
                this.showToastMessage(`Copied highlight config for:\n"${config.start}"`);
              }).catch(err => {
                console.warn("Clipboard copy failed:", err);
              });
            }
          }
        }
      };

      window.addEventListener('keydown', this._currentKeydownHandler);
    }

  // Dynamic pattern generation for text selection bounds
    generateHighlightConfig(text) {
      if (!text) return null;
      const words = text.split(/\s+/).filter(w => w.trim().length > 0);
      if (words.length === 0) return null;

      let start = text;
      let end = text;

      if (words.length > 3) {
        start = words.slice(0, 2).join(' ');
        end = words.slice(-2).join(' ');
      }

      start = start.replace(/["']/g, '').trim();
      end = end.replace(/["']/g, '').trim();

      const cleanId = words.slice(0, 3)
        .join('_')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 20);

      return {
        id: `custom_${cleanId || 'highlight'}`,
        start: start,
        end: end
      };
    }

  // Dynamic, sleek status toast reporter
    showToastMessage(msg) {
      const existing = document.getElementById('bfn-toast');
      if (existing) existing.remove();

      const toast = makeElement('div', {
        id: 'bfn-toast',
        style: {
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%) translateY(20px)',
          background: '#0f172a',
          border: '1px solid #3b82f6',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: '100000',
          fontSize: '12px',
          fontFamily: 'ui-monospace, monospace',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
          opacity: '0',
          pointerEvents: 'none',
          whiteSpace: 'pre-line',
          textAlign: 'center'
        }
      }, msg);

      document.body.appendChild(toast);
      
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
}