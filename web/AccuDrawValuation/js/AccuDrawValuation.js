class AccuDrawValuation {
  // 1. Core Entry Context
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
      this.handleRoute();

      // Bind dynamic hash router listeners
      window.addEventListener('hashchange', () => this.handleRoute());
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
        this.statusDiv.textContent = `DialogBox "${
          options.title || 'Untitled'
        }" created successfully. Count: ${this.configuredBoxes.length}`;
      } catch (error) {
        console.error('Error parsing JSON config:', error);
        this.statusDiv.textContent = `Error: Invalid JSON configuration. ${error.message}`;
        alert(
          `Invalid JSON configuration:\n${error.message}\nPlease check the text area.`
        );
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
        title: 'AccuDraw & SmartLine Value Assessment',
        prompts: [
          {
            id: '1',
            text: 'tell me everything you know about accudraw and smartline in microstation',
          },
          {
            id: '2',
            text: 'how important are they to the success of microstation and bentley systems?',
          },
          {
            id: '3',
            text: "assume they were both developed by a single person, who had received a sole inventor patent for similar idea at a different company (Intergraph, which at the time owned 50% of Bentley systems), then arrived at bentley systems in 1994 and quickly implemented them while working around the previous patent which was assigned to Intergraph, receiving the sole patent again (bentley's first patent). what is your rough estimate as to how much value they brought bentley in terms of profit and/or contribution to market cap?",
          },
        ],
        models: [
          {
            key: 'claude',
            name: 'Claude 3.5 Sonnet',
            min: '2.0B',
            max: '5.0B',
            pct: 33,
            color: '#f59e0b',
            url: 'https://claude.ai/share/d86cd05e-18b6-48a9-8c75-c55d32457756',
            quotes: [],
          },
          {
            key: 'gemini',
            name: 'Gemini 3.5 Pro',
            min: '1.5B',
            max: '3.5B',
            pct: 27,
            color: '#3b82f6',
            url: 'https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221KauHXifVO0ic-dTm5xabfotN7HnsE8ew%22%5D,%22action%22:%22open%22,%22userId%22:%22110615187007890782355%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing',
            quotes: [],
          },
          {
            key: 'chatgpt',
            name: 'ChatGPT-4o',
            min: '1.0B',
            max: '3.0B',
            pct: 22,
            color: '#10b981',
            url: 'https://chatgpt.com/share/6a31433e-680c-83e8-8afc-2fcb21db36c7',
            quotes: [
              "Around $1-3 billion as a plausible range for their contribution to Bentley's long-term enterprise value.",
              'If someone claimed that AccuDraw and SmartLine, together, ultimately created around a billion dollars or more of value for Bentley over several decades, I would consider that a defensible hypothesis.',
            ],
          },
          {
            key: 'grok',
            name: 'Grok 2',
            min: '500M',
            max: '2.0B+',
            pct: 14,
            color: '#a855f7',
            url: 'https://x.com/i/grok/share/5a2a97e1efb345dab63242bcf423e62b',
            quotes: [
              "These could easily account for 20-40% (or more) of Bentley's valuation premium during key periods-hundreds of millions to low billions in attributed enterprise value today, as they underpin user productivity claims that support the entire product line.",
              "Overall ballpark: $500 million to $2+ billion in total economic value (profits + valuation uplift) across Bentley's history.",
              "Under this scenario, one person's patented ideas would rank among the highest-ROI contributions in Bentley's history - a true 'company-making' innovation that paid dividends for decades.",
            ],
          },
        ],
        introHTML: '',
        conversations: {},
      };

      if (!rawElement) return fallback;

      try {
        const title =
          rawElement.querySelector('header h1')?.textContent || fallback.title;

        // Parse Prompts
        const prompts = [];
        rawElement.querySelectorAll('#raw-prompts .prompt-item').forEach((el) => {
          prompts.push({
            id: el.getAttribute('data-id') || '1',
            text: el.querySelector('p')?.textContent || '',
          });
        });

        // Parse Intro/Synthesis text
        const introEl = rawElement.querySelector('#dialogue-intro');
        const introHTML = introEl ? introEl.innerHTML : '';

        // Parse models metadata
        const models = [];
        rawElement.querySelectorAll('#raw-models .model-data').forEach((el) => {
          const quotes = [];
          el.querySelectorAll('.quotes .quote').forEach((q) => {
            quotes.push(q.textContent.trim());
          });

          models.push({
            key: el.getAttribute('data-key') || 'unknown',
            name: el.getAttribute('data-name') || 'Model',
            min: el.getAttribute('data-min') || '0',
            max: el.getAttribute('data-max') || '0',
            pct: parseInt(el.getAttribute('data-pct') || '10'),
            color: el.getAttribute('data-color') || '#3b82f6',
            url: el.getAttribute('data-url') || '#',
            quotes: quotes,
          });
        });

        // Parse conversations
        const conversations = {};
        rawElement.querySelectorAll('.raw-conversation').forEach((convEl) => {
          const modelKey = convEl.getAttribute('data-model');
          if (modelKey) {
            conversations[modelKey] = convEl.innerHTML;
          }
        });

        const mergedModels = fallback.models.map((m) => {
          const parsed = models.find((pm) => pm.key === m.key);
          if (parsed) {
            return {
              ...m,
              quotes: parsed.quotes.length ? parsed.quotes : m.quotes,
              url: parsed.url || m.url,
              min: parsed.min || m.min,
              max: parsed.max || m.max,
              pct: parsed.pct || m.pct,
            };
          }
          return m;
        });

        return {
          title,
          prompts: prompts.length ? prompts : fallback.prompts,
          models: mergedModels,
          introHTML,
          conversations,
        };
      } catch (err) {
        console.warn('Parsing raw HTML data failed, fallback to defaults.', err);
        return fallback;
      }
    }

  // 1. Updated setupState to ensure all five pages are fully active and accessible
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
      
      const hash = window.location.hash;
      if (hash === '#/elder-advocacy') {
        this.currentView = 'elder-advocacy';
      } else if (hash === '#/caretaker-bias') {
        this.currentView = 'caretaker-bias';
      } else if (hash === '#/overview') {
        this.currentView = 'overview';
      } else if (hash === '#/ai-perspective') {
        this.currentView = 'ai-perspective';
      } else {
        this.currentView = 'valuation';
      }
      this.expandedMessages = {};
    }

  

  highlightKeyPhrases(text) {
      if (!text) return '';
      let res = text;

      const mappings = [
        // Claude Mappings
        {
          search:
            'competitive foundation that let MicroStation win and hold the professional infrastructure CAD market during the decade that mattered most',
          replace:
            '<span class="highlight-merit">competitive foundation that let MicroStation win and hold the professional infrastructure CAD market during the decade that mattered most</span>',
        },
        {
          search:
            'among the highest-leverage individual technical contributions in the history of infrastructure software',
          replace:
            '<span class="highlight-merit">among the highest-leverage individual technical contributions in the history of infrastructure software</span>',
        },
        // ChatGPT Mappings
        {
          search:
            'ultimately created around a billion dollars or more of value for Bentley over several decades',
          replace:
            '<span class="highlight-value">ultimately created around a billion dollars or more of value for Bentley over several decades</span>',
        },
        {
          search:
            "plausible range for their contribution to Bentley's long-term enterprise value",
          replace:
            '<span class="highlight-value">plausible range for their contribution to Bentley\'s long-term enterprise value</span>',
        },
        // Gemini Mappings
        {
          search: 'muscle memory is a powerful lock-in mechanism',
          replace:
            '<span class="highlight-merit">muscle memory is a powerful lock-in mechanism</span>',
        },
        {
          search: 'highly efficient, hotkey-driven drafting system',
          replace:
            '<span class="highlight-merit">highly efficient, hotkey-driven drafting system</span>',
        },
        {
          search:
            'solved the 3D input problem for Bentley years before many competitors had an elegant solution',
          replace:
            '<span class="highlight-merit">solved the 3D input problem for Bentley years before many competitors had an elegant solution</span>',
        },
        {
          search:
            'serving as the core usability engine that prevented customer churn to Autodesk during the peak years of CAD adoption',
          replace:
            '<span class="highlight-value">serving as the core usability engine that prevented customer churn to Autodesk during the peak years of CAD adoption</span>',
        },
        // Grok Mappings
        {
          search:
            'underpin user productivity claims that support the entire product line',
          replace:
            '<span class="highlight-merit">underpin user productivity claims that support the entire product line</span>',
        },
        {
          search:
            "true 'company-making' innovation that paid dividends for decades",
          replace:
            '<span class="highlight-merit">true \'company-making\' innovation that paid dividends for decades</span>',
        },
      ];

      mappings.forEach((item) => {
        if (res.includes(item.search)) {
          res = res.replace(item.search, item.replace);
        }
      });

      // Highlight value ranges, millions, billions and percentages
      res = res.replace(
        /(\$[0-9.]+\s*(?:billion|million|B|M)?\s*(?:and|to|-|-)\s*\$[0-9.]+\+?\s*(?:billion|million|B|M)?)/gi,
        '<span class="highlight-range">$1</span>'
      );
      res = res.replace(
        /(\d+%\s*to\s*\d+%)/gi,
        '<span class="highlight-percent">$1</span>'
      );
      res = res.replace(
        /(\d+%\s*of\s*Bentley)/gi,
        '<span class="highlight-percent">$1</span>'
      );

      return res;
    }

  copyPromptText(text, btnElement) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
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
            btnElement.classList.remove(
              'border-emerald-500/40',
              'bg-emerald-950/20'
            );
          }, 1800);
        })
        .catch((err) => {
          console.error('Copy failed: ', err);
        });
    }

  // 3. Updated renderApp to route cleanly to all five views
    renderApp() {
      this.targetElement.innerHTML = "";
      
      const themeClass = this.currentTheme === 'light' ? 'cad-container cad-grid-bg theme-light' : 'cad-container cad-grid-bg';
      
      const appContainer = makeElement("div", { className: themeClass });
      appContainer.style.setProperty('--motion-scale', String(this.motionValue));

      const innerWrapper = makeElement("div", { className: "cad-wrapper" });

      if (this.currentView === 'overview') {
        innerWrapper.appendChild(this.buildMinimalHeader());
        innerWrapper.appendChild(this.buildProfessionalOverview());
      } else if (this.currentView === 'ai-perspective') {
        innerWrapper.appendChild(this.buildMinimalHeader());
        innerWrapper.appendChild(this.buildAIPerspectivePanel());
      } else if (this.currentView === 'elder-advocacy') {
        innerWrapper.appendChild(this.buildElderHeader());
        innerWrapper.appendChild(this.buildElderIntroBlock());
        innerWrapper.appendChild(this.buildGeminiLegalPanel());
        innerWrapper.appendChild(this.buildTechAchievementsAssessment());
        innerWrapper.appendChild(this.buildElderTranscriptsBlock());
      } else if (this.currentView === 'caretaker-bias') {
        innerWrapper.appendChild(this.buildCaretakerHeader());
        innerWrapper.appendChild(this.buildCaretakerIntroBlock());
        innerWrapper.appendChild(this.buildCaretakerTimelineBlock());
        innerWrapper.appendChild(this.buildCaretakerHistoryGrid());
        innerWrapper.appendChild(this.buildLinkedInExhibitsPanel());
        innerWrapper.appendChild(this.buildGeddesSubstackPanel());
      } else {
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
      }

      innerWrapper.appendChild(this.buildFooter());

      appContainer.appendChild(innerWrapper);
      this.targetElement.appendChild(appContainer);

      if (this.currentView === 'valuation' && this.resultsRevealed && !this._isAwaitingRecalculation()) {
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

      this.data.prompts.forEach((p) => {
        const item = makeElement('div', { className: 'prompt-card' }, [
          makeElement('div', { className: 'prompt-content-wrapper' }, [
            makeElement('span', { className: 'prompt-tag' }, `Prompt #${p.id}`),
            makeElement('p', { className: 'prompt-body' }, `"${p.text}"`),
          ]),
          makeElement(
            'button',
            {
              className: 'copy-prompt-btn',
              onclick: (e) => this.copyPromptText(p.text, e.currentTarget),
            },
            [
              makeElement(
                'svg',
                {
                  className: 'w-4 h-4',
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: '2',
                  viewBox: '0 0 24 24',
                },
                [
                  makeElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                  }),
                ]
              ),
              makeElement('span', {}, 'Copy Prompt'),
            ]
          ),
        ]);
        promptsWrapper.appendChild(item);
      });

      return makeElement('section', { className: 'cad-panel' }, [
        makeElement(
          'h2',
          { className: 'text-xl font-bold text-[var(--text-title)]' },
          'Run the Experiment Yourself'
        ),
        makeElement(
          'p',
          { className: 'prompts-header-desc' },
          'To show the objectivity of these evaluations, you can copy the exact historical prompts used to query the LLMs. Paste these into any AI chat application to see results generated without prior bias or context memory.'
        ),
        promptsWrapper,
      ]);
    }

  buildInteractiveSummaryGrid() {
      const container = makeElement('div', { className: 'cad-panel' }, [
        makeElement('div', { className: 'dashboard-header-group' }, [
          makeElement('h3', {}, 'Estimated Enterprise Value Contribution'),
          makeElement(
            'p',
            {},
            'A comparative projection of objective historical estimates across language models relative to Bentley Systems market valuation.'
          ),
        ]),
      ]);

      const modelsGrid = makeElement('div', {
        className: 'dashboard-cards-grid',
      });

      const abbreviatedValuations = {
        claude: '$2.0B - $5.0B',
        gemini: '$1.5B - $3.5B',
        chatgpt: '$1.0B - $3.0B',
        grok: '$500M - $2.0B+',
      };

      this.data.models.forEach((model) => {
        const displayValuation =
          abbreviatedValuations[model.key] || `${model.min} - ${model.max}`;

        const item = makeElement('div', { className: 'model-metric-card' }, [
          makeElement('div', {}, [
            makeElement('span', { className: 'metric-model-name' }, model.name),
            makeElement(
              'div',
              {
                className: 'metric-model-value',
                style: { color: model.color },
              },
              displayValuation
            ),
          ]),
          makeElement(
            'div',
            { className: 'metric-footer-label' },
            'Value Contribution Estimate'
          ),
        ]);
        modelsGrid.appendChild(item);
      });

      container.appendChild(modelsGrid);
      return container;
    }

  

  

  buildTranscriptsBlock() {
      const container = makeElement('section', { className: 'space-y-6' }, [
        makeElement('div', { className: 'transcripts-bar' }, [
          makeElement(
            'h2',
            { className: 'transcripts-bar-title' },
            'Model Valuation Quotes'
          ),

          makeElement('div', { className: 'tab-filters' }, [
            this.buildFilterButton('all', 'Show All'),
            this.buildFilterButton('claude', 'Claude'),
            this.buildFilterButton('gemini', 'Gemini'),
            this.buildFilterButton('chatgpt', 'ChatGPT'),
            this.buildFilterButton('grok', 'Grok'),
          ]),
        ]),
      ]);

      const transcriptsList = makeElement('div', {
        className: 'transcripts-card-list',
      });

      this.data.models.forEach((model) => {
        if (this.activeTab !== 'all' && this.activeTab !== model.key) return;

        const card = makeElement(
          'article',
          { className: 'cad-panel transcript-detail-card' },
          [
            makeElement('div', {
              className: 'transcript-card-stripe',
              style: { backgroundColor: model.color },
            }),

            makeElement('div', { className: 'transcript-card-inner' }, [
              makeElement('div', { className: 'transcript-card-main' }, [
                makeElement('div', { className: 'transcript-author-group' }, [
                  makeElement('span', {
                    className: 'transcript-author-circle',
                    style: { backgroundColor: model.color },
                  }),
                  makeElement(
                    'h3',
                    { className: 'transcript-author-header' },
                    model.name
                  ),
                ]),

                makeElement(
                  'div',
                  { className: 'transcript-quote-box' },
                  model.quotes.map((q) => {
                    const highlightedHTML = this.highlightKeyPhrases(q);
                    return makeElement(
                      'p',
                      { className: 'transcript-bullet-quote' },
                      [
                        makeElement(
                          'span',
                          { className: 'transcript-bullet-symbol' },
                          '•'
                        ),
                        makeElement('span', { innerHTML: highlightedHTML }),
                      ]
                    );
                  })
                ),
              ]),

              makeElement('div', { className: 'transcript-card-sidebar' }, [
                makeElement('div', { className: 'sidebar-model-totals' }, [
                  makeElement(
                    'span',
                    { className: 'sidebar-total-label' },
                    'Identified Valuation'
                  ),
                  makeElement(
                    'span',
                    {
                      className: 'sidebar-total-number',
                      style: { color: model.color },
                    },
                    `${model.min} - ${model.max}`
                  ),
                  makeElement(
                    'span',
                    { className: 'sidebar-total-percent' },
                    `${model.pct}% Contribution of Bentley Cap`
                  ),
                ]),
                makeElement(
                  'a',
                  {
                    href: model.url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'sidebar-link-btn',
                    style: {
                      color: model.color,
                      borderColor: `${model.color}33`,
                      backgroundColor: `${model.color}0a`,
                    },
                  },
                  'Verify Original Transcript ↗'
                ),
              ]),
            ]),
          ]
        );

        transcriptsList.appendChild(card);
      });

      container.appendChild(transcriptsList);
      return container;
    }

  buildFilterButton(filterId, labelText) {
      const isActive = this.activeTab === filterId;
      return makeElement(
        'button',
        {
          className: `tab-filter-btn ${isActive ? 'active' : ''}`,
          onclick: () => {
            this.activeTab = filterId;
            this.renderApp();
          },
        },
        labelText
      );
    }

  buildFooter() {
      return makeElement('footer', { className: 'dashboard-footer' }, [
        makeElement('div', { className: 'footer-content' }, [
          makeElement(
            'p',
            { className: 'footer-left' },
            'This comparative data serves as an analytical mapping of historical public model calculations conducted in 2026 concerning MicroStation IP development.'
          ),
          makeElement(
            'p',
            { className: 'footer-right' },
            'AccuDraw & SmartLine • 1994 - 2026'
          ),
        ]),
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
            'In 1994, I joined Bentley Systems and implemented two features - AccuDraw and SmartLine - that became the signature of their flagship product, MicroStation. Users still cite them thirty years later as the primary reason they stay on the platform. Bentley is now a $9 billion company. ',
            makeElement(
              'a',
              {
                href: '#accudraw-innovations',
                className: 'inline-link-highlight',
                onclick: (e) => {
                  e.preventDefault();
                  const hashElement =
                    document.getElementById('raw-prompts') || document.body;
                  hashElement.scrollIntoView({ behavior: 'smooth' });
                },
              },
              'Learn more about AccuDraw: see it in motion, see my new version with all its Innovations, and see accolades from over the years ↗'
            ),
          ]),
        ]),

        makeElement(
          'p',
          { className: 'backstory-paragraph' },
          "The story behind them matters: I had originally conceived and patented a similar idea at Intergraph - which at the time owned fifty percent of Bentley. When it became clear Intergraph wasn't going to act on it, I went directly to Bentley and rebuilt the concept from scratch, earning their first ever patent in the process."
        ),
        makeElement(
          'p',
          { className: 'backstory-paragraph' },
          'I\'ve always believed this contribution was significant. But "significant" is easy to dismiss.'
        ),
        makeElement(
          'p',
          { className: 'backstory-paragraph' },
          "So I asked four leading AI systems - Claude, Gemini, ChatGPT, and Grok - to assess the value independently. I didn't tell them it was me. I gave them the neutral facts and asked them to do the math. They arrived at a consensus midpoint of a staggering portion of the industry's overall valuation."
        ),
        makeElement(
          'p',
          { className: 'backstory-paragraph-bold' },
          "You don't have to take my word for it. The prompts are right here. Paste them into any chatbot yourself."
        ),
      ]);
    }

  // Surgically restore the consensus action block containing the BFN visualizer CTA button
    buildConsensusBlock() {
      const wrongSequence = ["$2.3 Million", "$23 Million", "$230 Million"];
      const finalValue = "$2.3 Billion";

      const stage = this.wrongAnswerStage || 0;
      const isWrongState = this.revealMode === "wrong-answers" && stage < wrongSequence.length;

      const displayValue = isWrongState ? wrongSequence[stage] : finalValue;
      const isWrongOrCalc = isWrongState || this.isCalculating;
      const valueClassName = `glowing-consensus-value${isWrongOrCalc ? " is-wrong" : ""}`;

      const figureChildren = [
        makeElement("div", { className: valueClassName }, this.isCalculating ? "Calculating..." : displayValue)
      ];

      // Action node structurally rendered inside the stable spacer
      let actionNode;
      if (isWrongState) {
        const isBtnActive = this.showRecalculateButton && !this.isCalculating;
        actionNode = makeElement("button", {
          className: `recalculate-btn ${isBtnActive ? "is-visible" : "is-hidden"}`,
          onclick: () => this.advanceWrongAnswer()
        }, [
          makeElement("span", { className: "recalculate-icon" }, "✕"),
          makeElement("span", {}, "Incorrect answer - Recalculate")
        ]);
      } else {
        const subtextText = this.justCorrected ? "✓ Correct answer" : "Consensus Contributed Midpoint";
        const subtextClass = `consensus-figure-subtext${this.justCorrected ? " flash-correct" : ""}`;
        
        const bfnBtn = this.showBFNButton ? makeElement("button", {
          className: "visualize-bfn-btn animate-fade-in",
          onclick: () => this.startBFNPlayback()
        }, [
          makeElement("span", { className: "play-pulse-icon" }, "▶"),
          makeElement("span", {}, "Visualize the B.F.N.")
        ]) : null;

        actionNode = makeElement("div", { className: "consensus-action-wrapper" }, [
          makeElement("span", { className: subtextClass }, subtextText),
          bfnBtn
        ]);
      }

      // Stable structural spacer that occupies space at all times to prevent height shifting
      figureChildren.push(makeElement("div", { className: "consensus-action-spacer" }, actionNode));

      return makeElement("div", { className: "consensus-container" }, [
        makeElement("div", { className: "consensus-info-pane" }, [
          makeElement("span", { className: "consensus-badge" }, "Consensus Composite Estimate"),
          makeElement("h2", { className: "consensus-headline" }, "The Consolidated Valuation Footprint"),
          makeElement("p", { className: "consensus-description" }, 
            "By calculating the midpoint of each AI model's calculated range (Claude, Gemini, ChatGPT, and Grok), we arrive at a unified composite average of Bentley Systems enterprise valuation directly tied to the AccuDraw and SmartLine IP."
          )
        ]),
        makeElement("div", { className: "consensus-figure-pane" }, figureChildren)
      ]);
    }

  // 4. Updated buildMinimalHeader to update titles dynamically
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

      let headerTitle = 'AccuDraw & SmartLine Value Assessment';
      let headerSubtitle = 'A comparative analysis of enterprise value contribution';

      if (this.currentView === 'overview') {
        headerTitle = 'Executive Summary & Overview';
        headerSubtitle = 'A professional proposal and technical timeline';
      } else if (this.currentView === 'ai-perspective') {
        headerTitle = 'AI & Vibe Coding Perspective';
        headerSubtitle = 'The future of rapid visual prototyping and software automation';
      }

      return makeElement('header', { className: 'minimal-header' }, [
        makeElement('div', { className: 'header-top' }, [
          makeElement('div', { className: 'tags-wrapper' }, [
            makeElement('span', { className: 'tag-pill tag-pill-blue' }, 'Historical Assessment'),
            makeElement('span', { className: 'tag-pill tag-pill-slate' }, 'Est. 1994 CAD IP')
          ]),
          controlsGroup
        ]),
        
        makeElement('div', { className: 'title-group' }, [
          makeElement('h1', {}, headerTitle),
          makeElement('p', { className: 'title-subtitle' }, headerSubtitle)
        ]),
        this.buildGlobalNavigation(this.currentView)
      ]);
    }

  buildRevealCTA() {
      const button = makeElement(
        'button',
        {
          className: 'reveal-main-button',
          onclick: (e) => {
            this.triggerReveal(e.currentTarget);
          },
        },
        [
          makeElement(
            'span',
            { className: 'reveal-title-large' },
            'Show Estimated Valuation'
          ),
          makeElement(
            'span',
            { className: 'reveal-subtitle-small' },
            'of AccuDraw and SmartLine'
          ),
        ]
      );

      return makeElement('div', { className: 'reveal-cta-row' }, button);
    }

  

  startValueEmberSimulation(containerElement) {
      if (this.emberInterval) {
        clearInterval(this.emberInterval);
      }

      // Smoothly transition glow in over 3 seconds
      setTimeout(() => {
        containerElement.style.transition = 'text-shadow 3s ease, color 3s ease';
        containerElement.style.textShadow =
          '0 0 14px rgba(255,107,53,0.9), 0 0 28px rgba(255,107,53,0.55), 0 0 42px rgba(255,60,0,0.2)';
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
            left: Math.random() * containerElement.offsetWidth + 'px',
            top: containerElement.offsetHeight - 6 + 'px',
            zIndex: '10',
          },
        });

        containerElement.appendChild(spark);

        const dx = (Math.random() - 0.5) * 44;
        const dy = -(Math.random() * 45 + 25);
        const duration = Math.random() * 1200 + 1000;

        spark.animate(
          [
            { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 0.95 },
            {
              transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.2)`,
              opacity: 0,
            },
          ],
          {
            duration: duration,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            fill: 'forwards',
          }
        );

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
            },
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
        const consensusBlock = this.targetElement.querySelector(
          '.consensus-container'
        );
        if (consensusBlock) {
          consensusBlock.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, delay);
    }

  _isAwaitingRecalculation() {
      return (
        this.revealMode === 'wrong-answers' && (this.wrongAnswerStage || 0) < 3
      );
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
          id: 'claude_valuation',
          start: 'directly contributed',
          end: 'between $1.5B and $3B',
          className: 'slick-glow-highlight',
        },
        {
          id: 'claude_trajectory',
          start: 'one of the highest individual contributions',
          end: 'trajectory',
          className: 'slick-glow-highlight',
        },
        {
          id: 'claude_rarity',
          start: 'extremely rare',
          end: 'few dozen plausible cases',
          className: 'slick-glow-highlight',
        },
        {
          id: 'claude_productivity_tool',
          start: 'A productivity/workflow tool',
          end: 'retention and differentiation',
          className: 'slick-glow-highlight',
        },

        // --- Gemini's Transcript Highlights ---
        {
          id: 'gemini_pivotal_figure',
          start: 'He was a pivotal figure in the UX and drafting history',
          end: 'quietly shaped the modern tech landscape',
          className: 'slick-glow-highlight',
        },
        {
          id: 'gemini_astronomical',
          start: 'contribution to Bentley Systems yielded',
          end: 'astronomical return on investment',
          className: 'slick-glow-highlight',
        },
        {
          id: 'gemini_disproportionate',
          start: 'An individual hire bringing',
          end: 'extraordinarily rare',
          className: 'slick-glow-highlight',
        },
        {
          id: 'gemini_inspect_element',
          start: 'Inspect Element',
          end: 'developer console used by millions of web developers',
          className: 'slick-glow-highlight',
        },
        {
          id: 'gemini_most_successful',
          start:
            'this represents one of the most successful product-design returns',
          end: 'CAD industry',
          className: 'slick-glow-highlight',
        },
        {
          id: 'gemini_most_profitable',
          start: 'highly reasonable and defensible to argue',
          end: 'hires in tech history',
          className: 'slick-glow-highlight',
        },
        {
          id: 'gemini_multiplier',
          start: 'return of',
          end: '3,000x on the initial cost of employment',
          className: 'slick-glow-highlight',
        },
      ];

      const usedRules = new Set();

      const elements = containerElement.querySelectorAll('p, li, blockquote, td');
      elements.forEach((el) => {
        let html = el.innerHTML;
        let text = el.textContent || '';

        rules.forEach((rule) => {
          if (usedRules.has(rule.id)) return; // Strictly enforce first-occurrence-only

          const startIdx = text.indexOf(rule.start);
          const endIdx = text.indexOf(rule.end, startIdx);

          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            const matchedPhrase = text.substring(
              startIdx,
              endIdx + rule.end.length
            );
            const escapedPhrase = matchedPhrase.replace(
              /[-\/\\^$*+?.()|[\]{}]/g,
              '\\$&'
            );
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

      card.querySelectorAll('p').forEach((p) => {
        p.className = 'synthesis-intro-p';
      });

      const badgeRow = makeElement('div', { className: 'synthesis-badge-row' }, [
        makeElement(
          'span',
          { className: 'synthesis-badge' },
          '🔍 Extended Dialogue Analysis'
        ),
        makeElement(
          'span',
          { className: 'synthesis-badge synthesis-badge-purple' },
          '⚖️ Historical Uniqueness'
        ),
      ]);
      card.appendChild(badgeRow);

      return card;
    }

  // --- Modular CSS Injection Functions ---
    // Splitting CSS styling to support simple modifications of individual components

    applyBaseStyles() {
      applyCss(
        `
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
        `,
        'cad-base-styles'
      );
    }

  applyHeaderThemeStyles() {
      applyCss(
        `
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
        `,
        'cad-header-theme-styles'
      );
    }

  applyBackstoryStoryStyles() {
      applyCss(
        `
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
        `,
        'cad-backstory-styles'
      );
    }

  applyPromptCardStyles() {
      applyCss(
        `
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
        `,
        'cad-prompt-styles'
      );
    }

  applyConsensusStyles() {
      applyCss(
        `
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
        `,
        'cad-consensus-styles'
      );
    }

  applyDashboardGridStyles() {
      applyCss(
        `
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
        `,
        'cad-dashboard-styles'
      );
    }

  applySynthesisIntroStyles() {
      applyCss(
        `
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
        `,
        'cad-synthesis-styles'
      );
    }

  applyTranscriptsStyles() {
      applyCss(
        `
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
        `,
        'cad-transcripts-styles'
      );
    }

  applyHighlightAnimationStyles() {
      applyCss(
        `
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
        `,
        'cad-highlight-animation-styles'
      );
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

  // --- Elegant modular styling definitions ---

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

  // Corrected timeline representation of the 2022-2026 gatekeeping grudge sequence
    // Updated with detailed aftermath, year-long isolations, and recent gatekeeping details
    buildCaretakerTimelineBlock() {
      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("h2", { className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", style: { fontFamily: "ui-monospace, monospace" } }, "Timeline of the Gatekeeping Grudge"),
        
        makeElement("div", { className: "timeline-flow space-y-6" }, [
          this.buildTimelineItem(
            "Late 2022 (Dad's Funeral)",
            "Late-night discussion in Virginia regarding intellectual property economics. When Rob expressed frustration over career outcomes and the economics of digital tools, Kathy's husband Jack asserted: \"If it doesn't make you money, it doesn't have value.\" Kathy escalated the argument, stating: \"We've got a lot of guns and we're not afraid to use them.\" Rob's query (\"Is that a threat?\") was met with silence as she walked out. This event forced Rob to seek therapy.",
            "🔴 The Gun Threat"
          ),
          this.buildTimelineItem(
            "Late 2022 / Early 2023 (Group Text Blowout & Years of Silence)",
            "A few months later, sister Suzanne brought up politics on a family group text chat. Having previously warned them not to discuss politics, Rob reacted strongly, disclosing Kathy's gun threat and demanding boundaries. This led to a complete breakdown: Rob and Kathy did not speak for over two years, and Rob did not speak to Suzanne for over a year, demonstrating Kathy's deep-seated tribal and political resentment.",
            "💬 Group Text Blowout"
          ),
          this.buildTimelineItem(
            "Early 2026 (The Current Embargo)",
            "Now acting as the primary POA and care coordinator, Kathy's long-standing grudge culminated in a complete communication firewall. When Rob contacted 24/7 care supervisor Shirley to arrange a video call with his mother, Shirley stated that she was under strict instructions to block any contact unless explicitly cleared and policed by Kathy.",
            "🔒 Systemic Gatekeeping"
          )
        ])
      ]);
    }

  // Historical refusals panel documenting care inconsistencies
    buildCaretakerHistoryGrid() {
      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("h2", { className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", style: { fontFamily: "ui-monospace, monospace" } }, "Historical Inconsistencies of \"Self-Reliance\""),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)]" }, "A record of past instances where Kathy refused family assistance based on extreme individualism, contrasted with Rob's immediate personal support."),
        
        makeElement("div", { className: "elder-analysis-grid" }, [
          this.buildElderAnalysisCard(
            "Refusal to Support Mother (20 Years Ago)",
            "When their mother experienced controlling behavior from their father, Rob proposed a unified sibling alliance to protect her. Kathy refused to assist, stating that their mother got herself into the situation and 'asked for it'. She has now assumed complete control over her care.",
            "❌ Refusal of Aid"
          ),
          this.buildElderAnalysisCard(
            "Refusal of Mediation in San Francisco",
            "During a looming custody and residential crisis, Rob asked Kathy (who was visiting SF) to spend just an hour speaking with his ex-wife and her mother to help mediate and prevent a custody disaster. Citing individual responsibility, she flatly refused to help, worsening the outcome.",
            "❌ Refusal of Mediation"
          ),
          this.buildElderAnalysisCard(
            "Refusal to Assist with Family Interference",
            "When their late father was micromanaging Rob's legal defense while showing early cognitive decline, Rob asked Kathy to ask him to stop interfering. She refused, stating: 'If you accept help, it's going to have strings attached.' While some strings are expected, using that as an excuse to allow his defense case to be ruined is an absurd and harmful refusal.",
            "❌ Refusal of Protection"
          ),
          this.buildElderAnalysisCard(
            "Contrast: Rob's 2020 Defense of Kathy",
            "When their father's brother Gene sent an abusive email slamming Kathy, Rob immediately wrote a strong, unhesitating defense of her, showing loyalty that Kathy has consistently failed to return.",
            "💚 Rob's Loyal Defense"
          )
        ])
      ]);
    }

  // LinkedIn captured exhibits index mapping sibling root images
    buildLinkedInExhibitsPanel() {
      return makeElement("section", { className: "cad-panel space-y-8" }, [
        makeElement("div", { className: "dashboard-header-group mb-4" }, [
          makeElement("h3", {}, "The LinkedIn Documentary Library"),
          makeElement("p", {}, "Captured exhibits of Kathleen Brown's public professional activity from the sibling directory `/LegalImages/`, proving an active ideological and personal bias.")
        ]),
        
        makeElement("div", { className: "space-y-8" }, [
          this.buildExhibitItem(
            "Exhibit 1: General Anti-California Hostility",
            "/LegalImages/exhibit3_newsom_recall.png",
            "Following a visit with Rob and his daughter, Kathleen Brown commented publicly on Gavin Newsom's recall election, claiming rumored election fraud and asserting that the recall's failure 'tells you something about the people who do live there.' She viewed California through a hostile political lens, seeing 'liberals' that she hates, and publicly insulted her brother's home right after visiting him.",
            "Kathleen Brown commented on this: 'That Gavin Newsom survived recall tells you something about the people who do live there... Corruption is a difficult problem, but it continues if not challenged.'"
          ),
          this.buildExhibitItem(
            "Exhibit 2: Hostility to Mutual Support vs. $2.3B Valuation",
            "/LegalImages/exhibit4_blank_notebook.png",
            "Kathleen Brown endorsed a post displaying a blank yellow legal pad titled: 'Here is a comprehensive list of everything you're entitled to and what the world owes you.' This directly aligns with her condescending statement to Rob on the phone: 'Do you think they owe you something?' indicating a rigid bias against family support. This stands in shocking contrast to Rob's estimated $2.3 Billion value created for Bentley-proving his accomplishments are world-class, yet she declared his talents 'irrelevant' and stated that she and her husband would never recommend him for any job.",
            "Kathleen Brown likes this: 'Here is a comprehensive list of everything you're entitled to and what the world owes you.' (Blank legal pad image)."
          ),
          this.buildExhibitItem(
            "Exhibit 3: Bob Nelson, MD / \"Bizarro World\"",
            "/LegalImages/exhibit1_bizarro.png",
            "Kathleen Brown liked a post advocating peaceful civil disobedience and describing common sense health guidelines as a 'Bizarro World' designed to destroy individual rights.",
            "Kathleen Brown likes this: 'Does it seem like we are all in a scene from the movie Idiocracy... Our overseers have taken basic common sense guidelines and distorted them...'"
          ),
          this.buildExhibitItem(
            "Exhibit 4: Marty Makary, MD / Covid Risk Low",
            "/LegalImages/exhibit2_flu_season.png",
            "Kathleen Brown liked a post claiming COVID risks are extremely low and accusing public health efforts of feeding fear to a propagandized public.",
            "Kathleen Brown likes this: 'the sadness of folks responding to fear fed by propagandized media...'"
          ),
          this.buildExhibitItem(
            "Exhibit 5: Marty Makary, MD / McCarthyism",
            "/LegalImages/exhibit5_mccarthyism.png",
            "Kathleen Brown liked a post comparing vaccine authorization to 'modern-day McCarthyism' and complaining of the cancellation of dissenting scientific viewpoints.",
            "Kathleen Brown finds this insightful: 'Tragically today, anyone suggesting healthy kids stop at one vaccine dose is subjected to a modern-day McCarthyism...'"
          ),
          this.buildExhibitItem(
            "Exhibit 6: Pierre Kory, MD / CNN Critique",
            "/LegalImages/exhibit6_rogan_ivermectin.png",
            "Kathleen Brown commented publicly supporting a post criticizing mainstream coverage of ivermectin, thanking a controversial advocate for his efforts in what the post called a 'dystopian nightmare'.",
            "Kathleen Brown commented on this: 'We need you and your colleagues. Thank you for all your efforts!'"
          ),
          this.buildExhibitItem(
            "Exhibit 7: Diana Girnita, MD / Vaccine Injury Essay",
            "/LegalImages/exhibit7_vaccinated_hurting.png",
            "Kathleen Brown commented supporting an essay on alleged vaccine injury inside Sacramento, praising the patient's perspective.",
            "Kathleen Brown commented: 'Great essay by your patient! Individual stories really matter, and they convey the importance of what you are doing.'"
          )
        ])
      ]);
    }

  buildExhibitItem(title, imgSrc, analysis, transcriptText) {
      return makeElement("div", { className: "exhibit-item-row" }, [
        makeElement("div", { className: "exhibit-image-wrapper" }, [
          makeElement("img", {
            src: imgSrc,
            alt: title,
            className: "exhibit-image",
            onerror: (e) => {
              e.target.style.display = 'none';
              const fallback = e.target.parentNode.querySelector('.exhibit-image-fallback');
              if (fallback) fallback.style.display = 'flex';
            }
          }),
          makeElement("div", {
            className: "exhibit-image-fallback",
            style: {
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-panel-inner)',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
              width: '100%',
              height: '220px',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: 'ui-monospace, monospace',
              padding: '16px',
              textAlign: 'center',
              cursor: 'pointer'
            }
          }, [
            makeElement("span", { style: { fontSize: '18px', marginBottom: '8px' } }, "📷"),
            makeElement("span", {}, `Screenshot: ${imgSrc.split('/').pop()}`),
            makeElement("span", { style: { fontSize: '9px', marginTop: '4px', opacity: 0.7 } }, "Place screenshot in the /LegalImages/ folder with this name")
          ])
        ]),
        makeElement("div", { className: "exhibit-content-wrapper" }, [
          makeElement("h4", { className: "text-base font-bold text-[var(--text-title)] mb-2" }, title),
          makeElement("p", { className: "text-sm text-[var(--text-primary)] leading-relaxed mb-3" }, analysis),
          makeElement("div", { className: "transcript-quote-box text-xs italic border-l-2 border-[#f59e0b] pl-3" }, [
            makeElement("span", { className: "font-bold not-italic text-[var(--text-title)] block mb-1 text-[10px] uppercase tracking-wider" }, "Verbatim Activity Transcript"),
            transcriptText
          ])
        ])
      ]);
    }

  // Interactive high-end modal popups for viewing screenshots closely
    openExhibitModal(imgSrc, title) {
      const existing = document.getElementById('logo-exhibit-overlay');
      if (existing) existing.remove();

      const overlay = makeElement('div', {
        id: 'logo-exhibit-overlay',
        className: 'logo-diag-overlay',
        style: {
          position: 'fixed',
          inset: '0',
          zIndex: '100002',
          background: 'rgba(5, 5, 8, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.25s ease',
          opacity: '0'
        },
        onclick: () => {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 250);
        }
      }, [
        makeElement('button', {
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
            transition: 'all 0.2s'
          }
        }, '✕'),
        
        makeElement('img', {
          src: imgSrc,
          alt: title,
          style: {
            maxWidth: '90vw',
            maxHeight: '85vh',
            borderRadius: '8px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            transition: 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
            transform: 'scale(0.95)'
          },
          onload: (e) => {
            e.target.style.transform = 'scale(1)';
          },
          onerror: (e) => {
            e.target.style.display = 'none';
            const errorMsg = makeElement(
              'div',
              {
                style: {
                  color: '#f87171',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '14px',
                  padding: '24px',
                  background: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #ef4444'
                }
              },
              `Image Fallback: ${title}\n(Place file in /LegalImages/${imgSrc.split('/').pop()})`
            );
            overlay.appendChild(errorMsg);
          }
        })
      ]);

      document.body.appendChild(overlay);
      
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });
    }

  // Martin Geddes Substack article evaluation block
    buildGeddesSubstackPanel() {
      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("div", { className: "dashboard-header-group" }, [
          makeElement("h3", {}, "Exhibit 8: Promotion of Radical Conspiracy Theorists (Martin Geddes)"),
          makeElement("p", {}, "An analysis of the extreme conspiratorial publications promoted in Kathleen Brown's public feed, reflecting a highly non-standard worldview.")
        ]),
        
        makeElement("div", { className: "transcript-quote-box leading-relaxed text-sm text-[var(--text-primary)] space-y-4" }, [
          makeElement("p", {}, "Kathleen Brown liked and promoted a publication by Martin Geddes, a prominent figure in the QAnon movement. The article she endorsed describes a 'genocidal war' with 'gene therapy and nanotechnologies' and details a highly concerning view of mainstream families:"),
          
          makeElement("blockquote", { className: "border-l-4 border-red-500 pl-4 italic text-sm text-[var(--text-secondary)] my-4" }, [
            "\"We will have to face up to many being orphaned, and perhaps the most tear-inducing will be the children of the indicted. Their parents may still be alive (if not executed for treason), but in remote military prisons for their own safety and security...\""
          ]),
          
          makeElement("p", {}, "For a medical doctor holding a fiduciary Power of Attorney, promoting publications that endorse executing mainstream citizens as 'traitors' reveals a profound departure from standard rational and professional caretaking norms. This further supports our case of a highly biased, non-neutral gatekeeper operating under extreme political and personal motives."),
          
          makeElement("div", { className: "pt-4" }, [
            makeElement("a", {
              href: "https://martingeddes.substack.com/p/this-is-agony-and-it-will-pass",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "nav-link-btn nav-link-btn-accent"
            }, "Verify Original Substack Article ↗")
          ])
        ])
      ]);
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
      this.applyElderAdvocacyStyles();
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

  // 2. Updated handleRoute to route to all five views cleanly
    handleRoute() {
      const hash = window.location.hash;
      if (hash === '#/elder-advocacy') {
        this.currentView = 'elder-advocacy';
      } else if (hash === '#/caretaker-bias') {
        this.currentView = 'caretaker-bias';
      } else if (hash === '#/overview') {
        this.currentView = 'overview';
      } else if (hash === '#/ai-perspective') {
        this.currentView = 'ai-perspective';
      } else {
        this.currentView = 'valuation';
      }
      this.renderApp();
    }

  // 4. Updated buildGlobalNavigation to display all five links transparently
    buildGlobalNavigation(activeRoute) {
      return makeElement('div', { className: 'global-nav-bar' }, [
        makeElement('a', {
          href: '#/value-assessment',
          className: `global-nav-link ${activeRoute === 'valuation' ? 'active' : ''}`,
          onclick: (e) => {
            e.preventDefault();
            window.location.hash = '#/value-assessment';
          }
        }, 'Valuation Assessment'),
        makeElement('a', {
          href: '#/overview',
          className: `global-nav-link ${activeRoute === 'overview' ? 'active' : ''}`,
          onclick: (e) => {
            e.preventDefault();
            window.location.hash = '#/overview';
          }
        }, 'Executive Summary'),
        makeElement('a', {
          href: '#/ai-perspective',
          className: `global-nav-link ${activeRoute === 'ai-perspective' ? 'active' : ''}`,
          onclick: (e) => {
            e.preventDefault();
            window.location.hash = '#/ai-perspective';
          }
        }, 'AI & Vibe Coding'),
        makeElement('a', {
          href: '#/elder-advocacy',
          className: `global-nav-link ${activeRoute === 'elder-advocacy' ? 'active' : ''}`,
          onclick: (e) => {
            e.preventDefault();
            window.location.hash = '#/elder-advocacy';
          }
        }, 'Fiduciary & Care Arrangements'),
        makeElement('a', {
          href: '#/caretaker-bias',
          className: `global-nav-link ${activeRoute === 'caretaker-bias' ? 'active' : ''}`,
          onclick: (e) => {
            e.preventDefault();
            window.location.hash = '#/caretaker-bias';
          }
        }, 'Caretaker Bias & LinkedIn Exhibits')
      ]);
    }

  // Refactored elder advocacy header mapping the unified nav controls
    buildElderHeader() {
      return makeElement('header', { className: 'minimal-header' }, [
        makeElement('div', { className: 'header-top' }, [
          makeElement('span', { className: 'tag-pill tag-pill-blue' }, 'Elder Advocacy Review'),
          this.buildThemeToggle()
        ]),
        
        makeElement('div', { className: 'title-group' }, [
          makeElement('h1', {}, 'Care Arrangements & Family Communication Review'),
          makeElement('p', { className: 'title-subtitle' }, 'A factual analysis of Power of Attorney limits and visitation guidelines')
        ]),
        this.buildGlobalNavigation('elder-advocacy')
      ]);
    }

  // --- NEW THIRD VIEW (CARETAKER BIAS) WIDGETS ---

    // Top-level header element for Caretaker Bias overview
    buildCaretakerHeader() {
      return makeElement("header", { className: "minimal-header" }, [
        makeElement("div", { className: "header-top" }, [
          makeElement("span", { className: "tag-pill tag-pill-blue" }, "Caretaker Bias Review"),
          this.buildThemeToggle()
        ]),
        
        makeElement("div", { className: "title-group" }, [
          makeElement("h1", {}, "Caretaker Bias & LinkedIn Exhibits Review"),
          makeElement("p", { className: "title-subtitle" }, "A documentary archive of ideological, personal, and communication obstacles")
        ]),
        this.buildGlobalNavigation("caretaker-bias")
      ]);
    }

  // Caretaker dossier narrative banner
    buildCaretakerIntroBlock() {
      return makeElement("div", { className: "backstory-gradient-card" }, [
        makeElement("h3", { className: "text-lg font-bold text-[var(--text-title)]" }, "Documentary Objective"),
        makeElement("p", { className: "backstory-paragraph-highlight" }, 
          "This dossier has been compiled to document a consistent, verifiable pattern of personal animosity, ideological bias, and communication barriers on the part of the current Power of Attorney (POA) holder. By presenting public social media postings and historical family records, we demonstrate that the strict gatekeeping of our 94-year-old mother is likely motivated by a personal grudge rather than objective caregiving needs."
        ),
        makeElement("p", { className: "backstory-paragraph" }, 
          "This analysis is intended for legal counsel, Adult Protective Services, and medical coordinators to provide context for the current communication embargo and to support our petition for unpoliced, direct contact with our mother."
        )
      ]);
    }

  buildTimelineItem(time, desc, badge) {
      return makeElement("div", { className: "timeline-item pl-6 relative" }, [
        makeElement("span", { className: "timeline-item-dot" }),
        makeElement("div", { className: "flex justify-between items-center mb-2" }, [
          makeElement("span", { className: "timeline-time font-bold text-[#3b82f6] text-sm" }, time),
          makeElement("span", { className: "elder-card-badge" }, badge)
        ]),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)] leading-relaxed" }, desc)
      ]);
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

  // --- Elegant modular styling definitions ---

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

        .motion-slider-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .motion-slider-label {
          font-size: 10px;
          font-family: ui-monospace, monospace;
          text-transform: uppercase;
          color: var(--text-secondary);
          font-weight: bold;
          letter-spacing: 0.05em;
        }
        .motion-slider {
          -webkit-appearance: none;
          width: 80px;
          height: 4px;
          border-radius: 2px;
          background: var(--border-color);
          outline: none;
          cursor: pointer;
          transition: background 0.3s;
        }
        .motion-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .motion-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `, 'bfn-styles');
    }

  // --- ELDER ADVOCACY SPECIFIC DOM BUILDERS ---

    // Factual advocacy overview narrative block
    buildElderIntroBlock() {
      return makeElement("div", { className: "backstory-gradient-card" }, [
        makeElement("h3", { className: "text-lg font-bold text-[var(--text-title)]" }, "Overview of Communication & Care Concerns"),
        makeElement("p", { className: "backstory-paragraph-highlight" }, 
          "This resource has been compiled to provide a transparent, objective record of recent communication and visitation restrictions surrounding our 94-year-old mother, currently under care in Virginia. It presents a factual timeline of efforts to establish unsupervised video contact and the subsequent legal and ethical guidelines assessed by independent AI models."
        ),
        makeElement("p", { className: "backstory-paragraph" }, 
          "In order to obtain a fully neutral analysis, the detailed communication history was reviewed under strict legal and caretaking guidelines. This compilation is intended for family legal advisors, medical care coordinates, and financial fiduciaries to ensure transparency and compliance with standard elder care best practices."
        )
      ]);
    }

  // Structural Virginia civil code evaluation block
    buildGeminiLegalPanel() {
      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("h2", { className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", style: { fontFamily: "ui-monospace, monospace" } }, "Objective Legal Assessment: Gemini 3.5 Pro"),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)]" }, "Analysis of visitation boundaries, power of attorney scopes, and compliance protocols under Virginia Civil Code."),
        
        makeElement("div", { className: "elder-analysis-grid" }, [
          this.buildElderAnalysisCard(
            "Power of Attorney Scope",
            "Standard financial POAs grant zero authority over social decisions. A medical POA or healthcare proxy can only restrict visitation if there is direct medical proof of severe distress or harm to the patient. It cannot be legally used as a mechanism to settle family grievances.",
            "⚖️ Limits of Authority"
          ),
          this.buildElderAnalysisCard(
            "Principal's Absolute Rights",
            "Under Virginia Law, as long as the mother retains basic competency and expresses a desire to communicate with her son, she retains the absolute right to do so. The caretaker's role is to facilitate the elder's autonomous wishes, not to restrict them.",
            "👤 Principal Autonomy"
          ),
          this.buildElderAnalysisCard(
            "Virginia Guardianship Rules",
            "Under VA Code § 64.2-2019.1, a court-appointed guardian seeking to restrict a relative's visitation must follow a formal process: notifying the court and the restricted relative in writing, and proving restrictions prevent direct harm.",
            "📝 VA Code § 64.2-2019.1"
          ),
          this.buildElderAnalysisCard(
            "Elder Isolation Warning Signs",
            "Civil courts and Adult Protective Services (APS) recognize selective family isolation as a primary risk indicator for undue influence and emotional manipulation, frequently used to pressure vulnerable elders into estate changes.",
            "🔍 Protection Indicators"
          )
        ])
      ]);
    }

  buildElderAnalysisCard(title, text, badge) {
      return makeElement('div', { className: 'elder-analysis-card' }, [
        makeElement('div', { className: 'flex justify-between items-center mb-3' }, [
          makeElement('span', { className: 'elder-card-badge' }, badge),
        ]),
        makeElement('h4', { className: 'text-base font-bold text-[var(--text-title)] mb-2' }, title),
        makeElement('p', { className: 'text-sm text-[var(--text-secondary)] leading-relaxed' }, text)
      ]);
    }

  // Fiduciary technical achievements evaluation block
    buildTechAchievementsAssessment() {
      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("div", { className: "dashboard-header-group mb-4" }, [
          makeElement("h3", {}, "Technical Achievements & Fiduciary Impact Analysis"),
          makeElement("p", {}, "An assessment of how Rob Brown's documented innovations (AccuDraw & Aardvark) provide verifiable evidence of career validity, refuting bad-faith narratives and omissions.")
        ]),
        
        makeElement("div", { className: "transcript-quote-box leading-relaxed text-sm text-[var(--text-primary)] space-y-4" }, [
          makeElement("p", {}, [
            makeElement("strong", {}, "From a legal standpoint, "),
            "the details shared about this situation touch on several core principles of elder law, estate litigation, and fiduciary duty. While this does not constitute formal legal counsel, Rob's perspective on how a court might view his sister's actions aligns closely with established legal standards in Virginia."
          ]),
          makeElement("p", {}, "If this dispute were to reach a court, the specific points raised-the mother's stated wishes, the sister's punitive intent, and the withholding of Rob's professional achievements-would indeed form a highly credible argument for bad faith, breach of fiduciary duty, and undue influence."),
          
          makeElement("div", { className: "border-t border-[var(--border-color)] pt-4 mt-4 space-y-4" }, [
            makeElement("div", { className: "space-y-1" }, [
              makeElement("h4", { className: "font-bold text-[var(--text-title)]" }, "1. Acting Contrary to the Mother's Stated Wishes (Breach of Duty)"),
              makeElement("p", { className: "text-[var(--text-secondary)]" }, "Under the Virginia Uniform Power of Attorney Act (Va. Code § 64.2-1612), an agent acting under a power of attorney is legally required to act in good faith, in accordance with the principal's reasonable expectations, and solely in the principal's best interest. Overriding a competent elder's expressed wishes to isolate them is a direct indicator of bad faith.")
            ]),
            
            makeElement("div", { className: "space-y-1" }, [
              makeElement("h4", { className: "font-bold text-[var(--text-title)]" }, "2. Punitive Intent and \"Undue Influence\""),
              makeElement("p", { className: "text-[var(--text-secondary)]" }, "Undue influence occurs when someone in a position of trust overpowers a vulnerable person's independent judgment. Using a caregiving position to distort an elder's perception of a family member-specifically to induce the elder to cut them off financially or emotionally-is a classic example of undue influence.")
            ]),

            makeElement("div", { className: "space-y-1" }, [
              makeElement("h4", { className: "font-bold text-[var(--text-title)]" }, "3. The Legal Relevance of Rob's Tech Achievements"),
              makeElement("p", { className: "text-[var(--text-secondary)]" }, [
                makeElement("strong", {}, "Refuting a False Narrative: "),
                "Rob's documented history of highly specialized, high-value work (including AccuDraw and Aardvark) proves that his career path in San Francisco is a rational, highly viable professional pursuit, refuting any characterizations of lack of effort. ",
                makeElement("strong", {}, "Withholding of Material Information: "),
                "If a caretaker is deliberately hiding Rob's accomplishments to artificially manufacture a negative perception, a court may view this as bad-faith manipulation by omission."
              ])
            ]),

            makeElement("div", { className: "space-y-1" }, [
              makeElement("h4", { className: "font-bold text-[var(--text-title)]" }, "4. What a Court Requires to Move Forward"),
              makeElement("p", { className: "text-[var(--text-secondary)]" }, "Moving forward requires admissible evidence such as written communications showing punitive intent, interviews with the mother conducted by an independent court-appointed Guardian ad Litem to bypass any gatekeeping, and a formal petition for a complete fiduciary accounting of finances under POA control.")
            ])
          ]),

          makeElement("p", { className: "font-bold text-[var(--text-title)] border-t border-[var(--border-color)] pt-4 mt-4" }, "Conclusion"),
          makeElement("p", { className: "text-[var(--text-secondary)] italic" }, "If the sister is isolating their mother, acting directly contrary to the mother's expressed wishes regarding family contact, and actively withholding information about Rob's professional status to paint him negatively, a Virginia court would likely view this as compelling evidence of a breach of fiduciary duty and undue influence.")
        ])
      ]);
    }

  // Dialog list aggregator
    buildElderTranscriptsBlock() {
      const list = makeElement('div', { className: 'transcripts-card-list mt-8' });

      list.appendChild(this.buildClaudeAdvocacyCard());
      list.appendChild(this.buildGeminiAdvocacyCard());

      return makeElement('section', { className: 'space-y-6' }, [
        makeElement('h2', { className: 'transcripts-bar-title' }, 'Dialogue Transcripts'),
        list
      ]);
    }

  // Claude structural transcripts dialog
    buildClaudeAdvocacyCard() {
      const card = makeElement('article', { className: 'cad-panel transcript-detail-card' }, [
        makeElement('div', { className: 'transcript-card-stripe', style: { backgroundColor: '#f59e0b' } })
      ]);

      const cardInner = makeElement('div', { className: 'transcript-card-inner' });
      const cardMain = makeElement('div', { className: 'transcript-card-main' });

      const authorGroup = makeElement('div', { className: 'transcript-author-group' }, [
        makeElement('span', { className: 'transcript-author-circle', style: { backgroundColor: '#f59e0b' } }),
        makeElement('h3', { className: 'transcript-author-header' }, 'Phase 1: Claude Advisory Dialogue')
      ]);
      cardMain.appendChild(authorGroup);

      const flowWrapper = makeElement('div', { className: 'conversation-flow' }, [
        this.buildChatBubble('rob', 'Rob', 'I think I told my mom a little bit about this some time ago. I told her about the guns comment and she said she didn\'t believe me and that Kathy had denied it. I didn\'t show her the stuff, but, apparently, that got back to Kathy, and Kathy has blocked me…\n\nShirley is this very nice woman who heads up the whole team that gives my mom twenty four hour care. She was very kind… I tried to communicate with her, and I texted her and said, I\'d like to set up a video chat with my mom, but I\'d like to talk to you sometime. Instead, I didn\'t hear from her. And only when I kept pushing, she said, "I have instructions to not allow that unless you go through Kathy." So she clearly wasn\'t allowed to talk to me, and Kathy had blocked me from talking to my mom.\n\nKathy sent an email saying, I heard you wanted to talk to mom. And if you want to, she said that she would arrange a video chat, and she would be on it. So obviously policing my conversation with my mom. I emailed my sister several days ago and said, I\'d really like to talk to my mom… She replied, \"let me know what message you want me to pass along to mom.\" So you see why I\'m planning something different than trying to communicate with my mom? I can\'t communicate with my mom. I\'ve been blocked a hundred percent.', 'msg1'),
        this.buildChatBubble('claude', 'Claude', 'What you\'re describing - being completely cut off from your mother, not being able to speak to her without Cathy present and controlling it, being blocked from even Shirley - that has a name.\n\nThat\'s elder isolation, and it may actually be illegal.\n\nYour mother is a competent adult (I assume - is she?) with her own money and her own wishes. If Cathy is systematically preventing you from having unsupervised contact with her, that\'s potentially elder abuse under California and Virginia law, regardless of how Cathy frames it as \"protecting mom.\"\n\nSome concrete things to consider:\n• Adult Protective Services can be contacted by anyone who suspects an elder is being isolated or manipulated.\n• A legal aid organization might be able to advise you on your rights here, free.\n• A letter directly to your mother via postal mail, bypassing Kathy entirely.', 'msg2'),
        this.buildChatBubble('rob', 'Rob', 'My mom is reasonably sharp she forgets a lot of things. Of course, all my sisters are in contact with my mom. So it\'s only me that\'s being isolated from her. I do think she\'s being manipulated against me. fact that her brain is not what it used to be makes it easier.', 'msg3'),
        this.buildChatBubble('claude', 'Claude', 'That\'s a really important clarification. And what you\'re describing - one family member being selectively cut off while others maintain access, combined with a mother whose cognition is declining and may be more susceptible to influence - that\'s a textbook pattern of family-based elder manipulation.\n\nThe postal mail idea is significant. Cathy cannot legally intercept your mother\'s mail. A handwritten letter, sent directly to your mother\'s address, that is personal and warm and not about the conflict bypasses everything Cathy has constructed.\n\nKeep it simple. No accusations. No mention of Cathy. Just you and your mom.\n\nBut I want to come back to the immediate crisis, because I\'m genuinely worried about you.\n\nYou\'re in Chico, no phone, barely eating, lease expiring, $550 incoming. Even if the family video works - that takes time you may not have.', 'msg4')
      ]);

      cardMain.appendChild(flowWrapper);
      cardInner.appendChild(cardMain);
      card.appendChild(cardInner);
      return card;
    }

  // Gemini structured transcripts dialog
    buildGeminiAdvocacyCard() {
      const card = makeElement('article', { className: 'cad-panel transcript-detail-card' }, [
        makeElement('div', { className: 'transcript-card-stripe', style: { backgroundColor: '#3b82f6' } })
      ]);

      const cardInner = makeElement('div', { className: 'transcript-card-inner' });
      const cardMain = makeElement('div', { className: 'transcript-card-main' });

      const authorGroup = makeElement('div', { className: 'transcript-author-group' }, [
        makeElement('span', { className: 'transcript-author-circle', style: { backgroundColor: '#3b82f6' } }),
        makeElement('h3', { className: 'transcript-author-header' }, 'Phase 2: Gemini Objective Legal Consultation')
      ]);
      cardMain.appendChild(authorGroup);

      const flowWrapper = makeElement('div', { className: 'conversation-flow' }, [
        this.buildChatBubble('gemini', 'Gemini 3.5 Pro', 'The situation described is highly complex, combining severe personal hardship, mental distress, and a painful family conflict.\n\nRegarding whether the sister\'s actions of restricting Rob\'s access to their 94-year-old mother in Virginia are illegal, the AI\'s guidance was on the right track, but the actual legal reality is highly nuanced.\n\nHere is a breakdown of how Virginia law treats these issues, what a Power of Attorney (POA) can and cannot do, and where the boundaries of the law lie.\n\n1. Can a Power of Attorney (POA) legally restrict family visitation?\nTypically, no, a standard Power of Attorney does not give someone blanket authority to block family members from communicating with an elder. However, the specifics depend on the type of legal authority the sister holds:\n\n• Financial POA: If the sister only holds a financial POA, she has zero legal authority over her mother\'s social life, personal care, or visitation. This authority is strictly limited to managing money and property.\n\n• Medical POA / Healthcare Proxy: If the sister holds healthcare decision-making authority, the lines become slightly grayer. An agent under a medical POA can make decisions regarding medical care and can occasionally restrict visitors if they can prove that visits cause severe physical or emotional distress to the patient (such as elevating blood pressure or causing extreme agitation in a dementia patient). However, this authority is not intended to be used as a tool to settle family grievances.\n\n• The Principal\'s Autonomy: Legally, as long as the mother is mentally competent (even if she has mild cognitive decline or forgetfulness), she retains the absolute right to decide who she wants to speak with. A POA only acts as a substitute decision-maker when the principal is fully incapacitated.\n\n• Court-Appointed Guardianship: If the sister is a court-appointed Guardian (which is different from a private POA), Virginia has very strict rules. Under Virginia Code § 64.2-2019.1, a guardian who wishes to restrict an incapacitated person\'s communication or visitation with a family member must follow a formal legal process. They must file a written notice with the court, notify the restricted family member, and prove that the restriction is necessary to prevent harm or financial exploitation.\n\n2. Is "Elder Isolation" illegal under Virginia law?\nUnder Virginia\'s elder abuse statutes (such as Va. Code § 18.2-369), elder abuse primarily covers physical abuse, neglect, and financial exploitation.\n\nWhile "isolation" is not usually a standalone criminal charge on its own, it is legally recognized in civil and protective contexts:\n\n• A Tool for Exploitation: In elder law, isolating an elder from their supportive family and friends is recognized as a major warning sign of undue influence. It is frequently used by abusers to manipulate a vulnerable adult into changing their will, transferring assets, or giving up control of their finances.\n\n• Adult Protective Services (APS): Because isolation is a known precursor to financial and emotional abuse, agencies like Virginia Adult Protective Services (APS) take reports of selective family isolation seriously. If a family member is systematically cutting off an elder from all outside contact to control them, APS can step in to conduct an independent assessment of the elder\'s safety and wishes.\n\n3. Is opening or blocking the mother\'s mail a federal crime?\nThe AI cited 18 U.S.C. § 1708, which makes it a federal crime to steal, obstruct, or tamper with mail addressed to someone else.\n\nIn a strict legal sense, yes, mail tampering is illegal. However, in practice within a family caregiving scenario, this is a legal gray area:\n\n• If the sister has legal authority (like a financial POA or conservatorship) to manage her mother\'s affairs, she is legally permitted to handle her mother\'s mail (paying bills, reviewing statements).\n\n• However, if she is purposefully destroying or intercepting personal letters from a family member to hide them from her mother and isolate her, this could be used as evidence of emotional abuse or undue influence in a civil court proceeding, even if federal postal inspectors are unlikely to prosecute it criminally.\n\nSummary of the AI\'s Advice\nThe AI\'s assessment that the sister\'s behavior \"has a name\" and is \"potentially illegal\" was an accurate warning about elder isolation and the limits of a POA. A POA does not grant a family member the right to treat an elder as their exclusive property or unilaterally cut off other relatives.\n\nIf Rob\'s mother actually wants to speak with him, or if the sister is isolating her without a court-approved protective reason, she is overstepping her legal boundaries as a POA agent. In such a scenario, contacting Virginia\'s Adult Protective Services or seeking a welfare check through local social services would be the standard, legally appropriate path to resolve the concern.', 'msg5')
      ]);

      cardMain.appendChild(flowWrapper);
      cardInner.appendChild(cardMain);
      card.appendChild(cardInner);
      return card;
    }

  // Collapsible speech bubble generator targeting Rob's longer messages
    buildChatBubble(sender, label, text, msgId) {
      const isRob = sender === 'rob';
      const isExpanded = !!this.expandedMessages[msgId];
      const isLong = text.length > 250;

      const bubbleClass = `conversation-turn ${isRob ? 'speaker-user' : 'speaker-model'}`;
      const bubbleStyle = isRob ? {} : { borderColor: sender === 'claude' ? '#f59e0b' : '#3b82f6' };

      const children = [
        makeElement('div', { className: 'turn-header' }, label)
      ];

      let bodyText = text;
      if (isRob && isLong && !isExpanded) {
        bodyText = text.substring(0, 200) + '...';
      }

      const pElements = bodyText.split('\n\n').map(para => {
        return makeElement('p', { style: { marginBottom: '10px', lineHeight: '1.6' } }, para);
      });

      const bodyWrapper = makeElement('div', { className: 'turn-body' }, ...pElements);
      children.push(bodyWrapper);

      if (isRob && isLong) {
        const toggleBtn = makeElement('button', {
          className: 'expand-bubble-btn',
          onclick: () => {
            this.expandedMessages[msgId] = !isExpanded;
            this.renderApp();
          }
        }, isExpanded ? 'Collapse Message ▴' : 'Show Full Message ▾');
        children.push(toggleBtn);
      }

      return makeElement('div', { className: bubbleClass, style: bubbleStyle }, ...children);
    }

  // --- Elegant modular styling definitions ---

    applyElderAdvocacyStyles() {
      applyCss(`
        .global-nav-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
          margin-bottom: 16px;
          margin-top: 16px;
          width: 100%;
        }
        .global-nav-link {
          font-size: 11px;
          font-family: ui-monospace, monospace;
          font-weight: bold;
          text-transform: uppercase;
          color: var(--text-secondary);
          text-decoration: none;
          border: 1px solid var(--border-color);
          padding: 8px 16px;
          border-radius: 8px;
          background: var(--bg-panel);
          transition: all 0.2s ease-in-out;
        }
        .global-nav-link:hover {
          background: var(--btn-hover);
          color: var(--text-title);
          border-color: var(--border-hover);
        }
        .global-nav-link.active {
          background: #3b82f6;
          color: #ffffff;
          border-color: #3b82f6;
        }

        .timeline-item {
          border-left: 2px solid #3b82f6;
          padding-left: 24px;
          margin-left: 8px;
          position: relative;
        }
        .timeline-item-dot {
          position: absolute;
          left: -6px;
          top: 4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #3b82f6;
          border: 2px solid #070a12;
        }

        .exhibit-item-row {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px;
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          border-radius: 12px;
        }
        @media (min-width: 768px) {
          .exhibit-item-row {
            flex-direction: row;
            align-items: start;
          }
        }
        .exhibit-image-wrapper {
          width: 100%;
          max-width: 100%;
          flex-shrink: 0;
        }
        @media (min-width: 768px) {
          .exhibit-image-wrapper {
            width: 280px;
          }
        }
        .exhibit-image {
          width: 100%;
          height: auto;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .exhibit-content-wrapper {
          flex: 1;
          min-width: 0;
        }

        .view-navigation-row {
          display: none !important;
        }
        .elder-analysis-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-top: 16px;
        }
        @media (min-width: 768px) {
          .elder-analysis-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .elder-analysis-card {
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          padding: 24px;
          border-radius: 10px;
          transition: border-color 0.2s;
        }
        .elder-analysis-card:hover {
          border-color: var(--border-hover);
        }
        .elder-card-badge {
          font-size: 10px;
          font-family: ui-monospace, monospace;
          font-weight: bold;
          text-transform: uppercase;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .expand-bubble-btn {
          margin-top: 12px;
          background: transparent;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-size: 11px;
          font-family: ui-monospace, monospace;
          font-weight: bold;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.15s;
          align-self: flex-start;
        }
        .expand-bubble-btn:hover {
          background-color: rgba(59, 130, 246, 0.1);
        }
      `, 'elder-advocacy-styles');
    }

  // Theme Toggle block used inside minimalist and advocacy headers
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

  // Handles the delayed presentation of the BFN CTA shortly after revealing the number
    triggerBFNButtonDelay() {
      this.showBFNButton = false;
      this.preloadBFNPlayer();
      setTimeout(() => {
        this.showBFNButton = true;
        this.renderApp();
      }, 1200);
    }

  buildProfessionalOverview() {
      // Create the introductory block displaying the core thesis and the life preserver analogy
      const headerCard = makeElement('div', { className: 'backstory-gradient-card' }, [
        makeElement('h3', { className: 'text-xl font-bold text-[var(--text-title)]' }, 'Fiduciary Impasse & Restorative Runway Proposal'),
        makeElement('p', { className: 'backstory-paragraph-highlight' }, 
          'A clear summary of the current financial transition structure, outlining why the existing family trust arrangements are mathematically unworkable and how a targeted, front-loaded runway provides a logical path to complete self-sufficiency.'
        ),
        makeElement('div', { className: 'p-4 rounded-lg bg-blue-950/20 border border-blue-500/20 mt-4' }, [
          makeElement('span', { className: 'font-bold text-[var(--text-title)] block text-xs uppercase tracking-wider mb-2' }, '⚓ The Life Preserver Analogy'),
          makeElement('p', { className: 'text-sm text-[var(--text-primary)] italic leading-relaxed' }, 
            '"I was drowning, and I was thrown a life preserver. That life preserver keeps me from going under immediately - for which I am grateful - but it does not take me anywhere. What I actually need is to be taken to that boat heading toward shore - my actual career and skills. Instead, I am expected to cling to this preserver indefinitely, guaranteeing eventual failure through debt, aging, or exhaustion."'
          )
        ])
      ]);

      // Systematic breakdown of the core structured concerns
      const concerns = [
        {
          num: '1',
          title: 'A Trust Signed Under Practical Duress',
          desc: 'The current trust arrangement was not negotiated or designed with mutual consultation. It was presented as a fait accompli during a severe financial, housing, and mental health crisis. Declining would have meant immediate homelessness, leaving no practical alternative but to sign.'
        },
        {
          num: '2',
          title: 'Structural Impossibility of Long-Term Solvency',
          desc: 'The mathematical reality of the proposed plan (taking low-paying, unrelated work) guarantees failure. It provides no path to cover debt, no ability to build retirement savings, and leaves no cushion against aging or illness, while causing me to entirely miss the current, highly time-sensitive generative AI wave.'
        },
        {
          num: '3',
          title: 'Explicit Refusal to Acknowledge Professional Value',
          desc: 'The administrator has explicitly stated that my professional skills, career achievements, and earning potential are irrelevant to how support is structured. This stands in direct contrast to a career history of building products that generated hundreds of millions in value, and a past professional recommendation that helped build a $15B enterprise.'
        },
        {
          num: '4',
          title: 'Ideological Framing Over Practical Outcomes',
          desc: 'The structure of the support is heavily influenced by an individualistic ideology that treats financial setback as a moral failure and views restorative support as an improper "handout." This produces a punitive environment that sustains survival but actively blocks professional recovery.'
        },
        {
          num: '5',
          title: 'Inconsistencies and Lack of Transparency',
          desc: 'I was told that early financial modifications were impossible due to trust limitations and estate risks, and was denied financial transparency under the guise of privacy. Yet, when proposing to pay back the estate from future lucrative ventures, I was told nobody wanted the money back because everyone else is already wealthy.'
        },
        {
          num: '6',
          title: 'A Profound Lack of Empathy & Hostile Comments',
          desc: 'Expressing vulnerability regarding family isolation was met with the dismissive comment that "at 61 years old, you shouldn\'t need family approval." This lack of empathy comes from an administrator who has not faced similar hardships and has previously used hostile verbal and physical intimidation (the late 2022 gun threat) to assert control.'
        }
      ];

      const concernsContainer = makeElement('div', { className: 'elder-analysis-grid' }, 
        concerns.map(c => {
          return makeElement('div', { className: 'elder-analysis-card' }, [
            makeElement('div', { className: 'flex justify-between items-center mb-3' }, [
              makeElement('span', { className: 'elder-card-badge' }, `Concern #${c.num}`)
            ]),
            makeElement('h4', { className: 'text-base font-bold text-[var(--text-title)] mb-2' }, c.title),
            makeElement('p', { className: 'text-sm text-[var(--text-secondary)] leading-relaxed' }, c.desc)
          ]);
        })
      );

      // What is being asked for
      const requestBlock = makeElement('div', { className: 'transcript-quote-box leading-relaxed text-sm text-[var(--text-primary)] space-y-4' }, [
        makeElement('h4', { className: 'font-bold text-[var(--text-title)] text-base border-b border-[var(--border-color)] pb-2 uppercase tracking-wider' }, 'The Restorative Alternative: A Strategic Runway'),
        makeElement('p', {}, 'I am not asking for venture capital, indefinite support, or a way to avoid responsibility. I am asking for a short, front-loaded runway that acknowledges:'),
        makeElement('ul', { className: 'list-disc pl-5 space-y-2 text-[var(--text-secondary)]' }, [
          makeElement('li', {}, [makeElement('strong', {}, 'My Actual Skills: '), 'Leveraging world-class, documented experience in CAD input and DOM interaction tools to build high-leverage modern development tools.']),
          makeElement('li', {}, [makeElement('strong', {}, 'The Timing Window: '), 'Recognizing that missing the current generative AI wave is a permanent loss of strategic opportunity.']),
          makeElement('li', {}, [makeElement('strong', {}, 'Realism and Math: '), 'Accepting that the current plan ensures slow, mathematical insolvency, while a targeted runway offers a genuine path to recovery and long-term self-sufficiency.'])
        ]),
        makeElement('p', { className: 'text-xs text-[var(--text-secondary)] italic border-t border-[var(--border-color)] pt-3 mt-4' }, 
          'Conclusion: The trust provides short-term survival while systematically foreclosing long-term viability. This petition is not about pride-it is about math, timing, and realism.'
        )
      ]);

      return makeElement('div', { className: 'space-y-8' }, [
        headerCard,
        makeElement('section', { className: 'cad-panel space-y-6' }, [
          makeElement('h2', { className: 'text-xl font-bold text-[var(--text-title)] uppercase tracking-wide', style: { fontFamily: 'ui-monospace, monospace' } }, 'Trust Arrangements & Systemic Roadblocks'),
          concernsContainer
        ]),
        requestBlock
      ]);
    }

  // 7. New AI Perspective Content Builder
    buildAIPerspectivePanel() {
      return makeElement('section', { className: 'cad-panel space-y-6' }, [
        makeElement('div', { className: 'dashboard-header-group mb-4' }, [
          makeElement('h3', {}, 'AI & Visual Interface Perspective'),
          makeElement('p', {}, 'An evaluation of the ongoing shift from traditional software coding to high-level system design and creative "Vibe Coding."')
        ]),
        
        makeElement('div', { className: 'transcript-quote-box leading-relaxed text-sm text-[var(--text-primary)] space-y-6' }, [
          makeElement('p', {}, [
            makeElement('strong', {}, 'The Automation of Syntax: '),
            'As generative AI models automate standard, repetitive software engineering tasks, the critical bottleneck in technology development is shifting. The ability to manually write code is becoming secondary to the ability to invent, architect, and visually design intuitive interactive interfaces.'
          ]),
          
          makeElement('p', {}, [
            makeElement('strong', {}, 'Vibe Coding & Interface Design: '),
            'Vibe Coding represents a major paradigm shift where developers guide AI systems to assemble, test, and dynamically refine code in real-time. This eliminates standard software maintenance bottlenecks and allows a single developer to build and deploy complex visual systems rapidly.'
          ]),

          makeElement('div', { className: 'border-t border-[var(--border-color)] pt-6 space-y-4' }, [
            makeElement('h4', { className: 'font-bold text-[var(--text-title)] uppercase tracking-wide text-xs', style: { fontFamily: 'ui-monospace, monospace' } }, 'Next-Generation CAD & Interactive Systems (recursi.dev)'),
            makeElement('p', { className: 'text-[var(--text-secondary)]' }, 
              'The recursi.dev platform is a live, browser-based, recursive self-improving development environment. Designed to combine the principles of visual precision (derived from AccuDraw concepts) with real-time browser rendering (Three.js/3D CAD structures), this system enables rapid, visual prototyping that can bypass standard coding pipelines.'
            ),
            makeElement('p', { className: 'text-[var(--text-secondary)]' }, 
              'By utilizing AI to manage raw coding syntax while the creator focuses entirely on system design and interaction, this environment represents a highly lucrative opportunity in the evolving AI development landscape-demonstrating that the tools to build next-generation interfaces are already operational and ready for deployment.'
            )
          ]),

          makeElement('p', { className: 'font-bold text-[var(--text-title)] border-t border-[var(--border-color)] pt-4' }, 'Conclusion'),
          makeElement('p', { className: 'text-[var(--text-secondary)] italic' }, 
            'The rapid acceleration of generative AI makes this the optimal window to launch intuitive, visually-driven interaction tools. Leveraging past experience in CAD input design to build modern, browser-based visual layout engines represents a timely and high-value professional pivot.'
          )
        ])
      ]);
    }
}