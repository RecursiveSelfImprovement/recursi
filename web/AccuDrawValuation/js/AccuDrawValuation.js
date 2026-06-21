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

  setupState(data) {
      this.data = data;
      this.activeTab = 'all';
      this.resultsRevealed = false;
      this.isTransitioning = false;
      this.revealMode = localStorage.getItem('accudraw-reveal-mode') || 'no-drama';
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
      } else if (hash === '#/current-work') {
        this.currentView = 'current-work';
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

  renderApp() {
      this.targetElement.innerHTML = "";
      
      const themeClass = this.currentTheme === "light" 
        ? "cad-container cad-grid-bg theme-light" 
        : "cad-container cad-grid-bg";
      
      const appContainer = makeElement("div", { className: themeClass });
      appContainer.style.setProperty("--motion-scale", String(this.motionValue));

      const innerWrapper = makeElement("div", { className: "cad-wrapper" });

      if (this.currentView === "elder-advocacy") {
        innerWrapper.appendChild(this.buildElderHeader());
      } else if (this.currentView === "caretaker-bias") {
        innerWrapper.appendChild(this.buildCaretakerHeader());
      } else {
        innerWrapper.appendChild(this.buildMinimalHeader());
      }

      // Delegate panel generation
      if (this.currentView === "overview") {
        const page = new OverviewPage();
        innerWrapper.appendChild(page.render(this));
      } else if (this.currentView === "ai-perspective") {
        const page = new AiPerspectivePage();
        innerWrapper.appendChild(page.render(this));
      } else if (this.currentView === "elder-advocacy") {
        const page = new ElderAdvocacyPage();
        innerWrapper.appendChild(page.render(this));
      } else if (this.currentView === "caretaker-bias") {
        const page = new CaretakerBiasPage();
        innerWrapper.appendChild(page.render(this));
      } else if (this.currentView === "current-work") {
        const page = new CurrentWorkPage();
        innerWrapper.appendChild(page.render(this));
      } else {
        const page = new ValuationPage();
        innerWrapper.appendChild(page.render(this));
      }

      innerWrapper.appendChild(this.buildFooter());
      appContainer.appendChild(innerWrapper);
      this.targetElement.appendChild(appContainer);

      if (this.currentView === "valuation" && this.resultsRevealed && !this._isAwaitingRecalculation()) {
        const emberValText = this.targetElement.querySelector(".glowing-consensus-value");
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

  

  

  

  

  

  

  

  buildFooter() {
      const isValuation = this.currentView === 'valuation';
      return makeElement('footer', { className: 'dashboard-footer' }, [
        makeElement('div', { className: 'footer-content' }, [
          isValuation ? makeElement(
            'p',
            { className: 'footer-left' },
            'This comparative data serves as an analytical mapping of historical public model calculations conducted in 2026 concerning MicroStation IP development.'
          ) : makeElement('p', { className: 'footer-left' }, ''),
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
        headerTitle = 'AI Automation & Urgent Career Timeline';
        headerSubtitle = 'The exponential pace of automation and professional time pressure';
      } else if (this.currentView === 'current-work') {
        headerTitle = 'Current Work & Vibe Coding Environment';
        headerSubtitle = 'Next-generation recursively self-improving visual code environments';
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

  advanceWrongAnswer() {
      if (this.wrongAnswerStage >= 3 || this.isCalculating) return;

      // Clear the warning button and launch calculation animation
      this.isCalculating = true;
      this.showRecalculateButton = false;
      this.renderApp();

      const tickerPool = [
        "$145K", "$2.8 Million", "$38 Million", "$620K", "$84.1 Million",
        "$5.4 Million", "$115 Million", "$430K", "$1.8 Billion", "$72 Million",
        "$9.1 Million", "$280K", "$2.4B", "$81.5M", "$4.2 Million", "$19.3 Million"
      ];

      // Spin numbers at high-speed every 90ms for a playful active calculation aesthetic
      const tickInterval = setInterval(() => {
        const valueNode = this.targetElement.querySelector(".glowing-consensus-value");
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
          this.triggerBFNButtonDelay();
          setTimeout(() => {
            this.justCorrected = false;
            const subtext = this.targetElement.querySelector(".consensus-figure-subtext");
            if (subtext) {
              subtext.classList.remove("flash-correct");
              subtext.textContent = "Consensus Contributed Midpoint";
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

  

  // High resolution modal popup to view screenshots closely with zoom toggle, scrollbars, click-off closer, and isolated drag-to-pan
    openExhibitModal(imgSrc, title, caption) {
      const existing = document.getElementById('logo-exhibit-overlay');
      if (existing) existing.remove();

      let isFullRes = false;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let scrollLeft = 0;
      let scrollTop = 0;
      let dragThresholdMet = false;

      const badge = makeElement('div', {
        style: {
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.9)',
          color: '#3b82f6',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '20px',
          padding: '6px 16px',
          fontSize: '11px',
          fontFamily: 'ui-monospace, monospace',
          pointerEvents: 'none',
          zIndex: '30',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }
      }, 'Click image for Full Resolution');

      const contentContainer = makeElement('div', {
        style: {
          flex: '1',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          position: 'relative',
          padding: '16px',
          background: '#020204',
          cursor: 'zoom-in',
          userSelect: 'none'
        }
      });

      // Implement mouse drag to pan on the container directly
      contentContainer.onmousedown = (e) => {
        if (!isFullRes) return;
        isDragging = true;
        dragThresholdMet = false;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeft = contentContainer.scrollLeft;
        scrollTop = contentContainer.scrollTop;
        contentContainer.style.cursor = 'grabbing';
      };

      contentContainer.onmousemove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragThresholdMet = true;
        }
        contentContainer.scrollLeft = scrollLeft - dx;
        contentContainer.scrollTop = scrollTop - dy;
      };

      contentContainer.onmouseup = () => {
        if (!isDragging) return;
        isDragging = false;
        contentContainer.style.cursor = isFullRes ? 'zoom-out' : 'zoom-in';
      };

      contentContainer.onmouseleave = () => {
        if (!isDragging) return;
        isDragging = false;
        contentContainer.style.cursor = isFullRes ? 'zoom-out' : 'zoom-in';
      };

      const img = makeElement('img', {
        src: imgSrc,
        alt: title,
        style: {
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: '4px',
          pointerEvents: 'auto', // Re-enable pointer events to distinguish off-image clicks
          display: 'block'
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
            `Image Fallback: ${title}\n(Place file in /images/${imgSrc.split('/').pop()})`
          );
          contentContainer.appendChild(errorMsg);
        }
      });

      // Toggle Zoom and Resolution using click event on the viewport
      contentContainer.onclick = (e) => {
        e.stopPropagation(); // Stop click from bubbling up to the outer overlay that closes the modal!

        // If the action was dragging, ignore toggle Zoom
        if (dragThresholdMet) {
          dragThresholdMet = false;
          return;
        }

        // If click was on the empty background (not on the image), close the modal entirely!
        if (e.target === contentContainer) {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 250);
          return;
        }

        isFullRes = !isFullRes;
        if (isFullRes) {
          contentContainer.style.display = 'block';
          img.style.width = 'auto';
          img.style.height = 'auto';
          img.style.maxWidth = 'none';
          img.style.maxHeight = 'none';
          img.style.objectFit = 'none';
          img.style.margin = '0 auto';
          contentContainer.style.cursor = 'zoom-out';
          badge.textContent = 'Click image to fit screen (Drag to pan)';
        } else {
          contentContainer.style.display = 'flex';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.maxWidth = '100%';
          img.style.maxHeight = '100%';
          img.style.objectFit = 'contain';
          img.style.margin = '0';
          contentContainer.style.cursor = 'zoom-in';
          badge.textContent = 'Click image for Full Resolution';
        }
      };

      contentContainer.appendChild(badge);
      contentContainer.appendChild(img);

      const topBar = makeElement('div', {
        style: {
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          background: 'rgba(10, 10, 15, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: '30'
        }
      }, [
        makeElement('span', {
          style: {
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '13px',
            fontFamily: 'ui-monospace, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }
        }, title),
        makeElement('button', {
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            marginRight: '8px'
          },
          onclick: (e) => {
            e.stopPropagation();
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 250);
          }
        }, '✕')
      ]);

      const captionBar = caption ? makeElement('div', {
        style: {
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '800px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '12px 20px',
          color: '#e2e8f0',
          fontSize: '13px',
          lineHeight: '1.5',
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: '30'
        },
        onclick: (e) => e.stopPropagation()
      }, caption) : null;

      const overlay = makeElement('div', {
        id: 'logo-exhibit-overlay',
        style: {
          position: 'fixed',
          inset: '0',
          zIndex: '100002',
          background: 'rgba(5, 5, 8, 0.98)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          transition: 'opacity 0.25s ease',
          opacity: '0',
          width: '100vw',
          height: '100vh',
          boxSizing: 'border-box',
          overflow: 'hidden'
        },
        onclick: () => {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 250);
        }
      }, [
        topBar,
        contentContainer,
        captionBar
      ]);

      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });
    }

  // Martin Geddes Substack article evaluation block
    

  // Isolate context active theme variables
    initializeTheme() {
      document.body.classList.add('js-active');
      this.currentTheme = localStorage.getItem('accudraw-valuation-theme') || 'light';
    }

  loadAppStyles() {
      this.applyBaseStyles();
      this.applyHeaderThemeStyles();
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
      } else if (hash === '#/current-work') {
        this.currentView = 'current-work';
      } else {
        this.currentView = 'valuation';
      }
      this.renderApp();
    }

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
        }, 'Caretaker Bias & LinkedIn Exhibits'),
        makeElement('a', {
          href: '#/ai-perspective',
          className: `global-nav-link ${activeRoute === 'ai-perspective' ? 'active' : ''}`,
          onclick: (e) => {
            e.preventDefault();
            window.location.hash = '#/ai-perspective';
          }
        }, 'AI & Urgent Timeline'),
        makeElement('a', {
          href: '#/current-work',
          className: `global-nav-link ${activeRoute === 'current-work' ? 'active' : ''}`,
          onclick: (e) => {
            e.preventDefault();
            window.location.hash = '#/current-work';
          }
        }, 'Current Work & Vibe Coding')
      ]);
    }

  // Header builder for Elder Advocacy panel
    buildElderHeader() {
      return makeElement("header", { className: "minimal-header" }, [
        makeElement("div", { className: "header-top" }, [
          makeElement("span", { className: "tag-pill tag-pill-blue" }, "Elder Advocacy Review"),
          this.buildThemeToggle()
        ]),
        
        makeElement("div", { className: "title-group" }, [
          makeElement("h1", {}, "Care Arrangements & Family Communication Review"),
          makeElement("p", { className: "title-subtitle" }, "A factual analysis of Power of Attorney limits and visitation guidelines")
        ]),
        this.buildGlobalNavigation("elder-advocacy")
      ]);
    }

  // --- NEW THIRD VIEW (CARETAKER BIAS) WIDGETS ---

    // Top-level header element for Caretaker Bias overview
    

  // Caretaker dossier narrative banner
    

  

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

  // Center theatrical background video overlay cleanup method
    fadeAndCloseBFN() {
      const overlay = document.getElementById('bfn-overlay');
      const videoFrame = document.getElementById('bfn-video-frame');
      const consensusContainer = this.targetElement.querySelector('.consensus-container');

      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }
      if (videoFrame) {
        videoFrame.style.opacity = '0';
        videoFrame.style.transform = 'scale(0.9) translateY(20px)';
      }

      if (this.fallbackTimeout) {
        clearTimeout(this.fallbackTimeout);
      }

      // Defer video state changes and clean up completely to prevent state pollution on next play
      setTimeout(() => {
        if (this.bfnPlayer) {
          try {
            this.bfnPlayer.destroy();
          } catch (e) {}
          this.bfnPlayer = null;
        }
        if (overlay) {
          overlay.remove();
        }
        document.body.classList.remove('bfn-active');
        if (consensusContainer) {
          consensusContainer.classList.remove('bfn-highlighted');
        }
      }, 800);
    }

  // --- Elegant modular styling definitions ---

    

  // --- ELDER ADVOCACY SPECIFIC DOM BUILDERS ---

    // Factual advocacy overview narrative block
    

  // Structural Virginia civil code evaluation block
    

  

  // Fiduciary technical achievements evaluation block
    

  // Dialog list aggregator
    

  // Claude structural transcripts dialog
    

  // Gemini structured transcripts dialog
    

  // Collapsible speech bubble generator targeting Rob's longer messages
    

  // --- Elegant modular styling definitions ---

    

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

  

  

  // Builder for visual AI media cards (supports fallback graphics neatly)
    

  // Builder for AI image frames (comparison blocks)
    

  

  // High fidelity, beautifully spaced visual row builder
    

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
      `, "cad-base-styles");
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
      `, "cad-header-theme-styles");
    }

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
      `, "bfn-styles");
    }

  // Header builder for Caretaker Bias panel
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
}