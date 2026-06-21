class ValuationPage {
  render(app) {
      this.applyStyles();
      const wrapper = makeElement('div', {
        className: 'valuation-page-view space-y-8',
      });
      wrapper.appendChild(this.buildBackstoryBlock(app));

      // Fixed prompts section directly before the results/reveal block
      wrapper.appendChild(this.buildPromptsSection(app));

      if (app.resultsRevealed) {
        wrapper.appendChild(this.buildConsensusBlock(app));
        wrapper.appendChild(this.buildInteractiveSummaryGrid(app));
        wrapper.appendChild(this.buildTranscriptsBlock(app));
        wrapper.appendChild(this.buildExtendedQueriesSection(app));
        // Only show this alternative Gemini section *after* the results have been revealed
        wrapper.appendChild(this.buildGeminiHigherEstimateSection(app));
      } else {
        wrapper.appendChild(this.buildRevealCTA(app));
      }

      return wrapper;
    }

  buildBackstoryBlock(app) {
    const p1 = [
      'In 1994, I joined Bentley Systems and implemented two features ',
      '- AccuDraw and SmartLine - that became the signature of their ',
      'flagship product, MicroStation. Users still cite them thirty years ',
      'later as the primary reason they stay on the platform. Bentley is ',
      'now a $9 billion company. ',
    ].join('');

    const p2 = [
      'I had originally conceived and patented ',
      'a similar idea at Intergraph - which at the time owned fifty percent of ',
      "Bentley. When it became clear Intergraph wasn't going to act on it, I went ",
      'directly to Bentley and rebuilt the concept from scratch, earning their ',
      'first ever patent in the process.',   // todo: link to patent
    ].join('');

    const p3 = [
      "I've always believed this contribution was significant. But 'significant' ",
      'is easy to dismiss.',
    ].join('');

    const p4 = [
      'So I asked four leading AI systems - Claude, Gemini, ChatGPT, and Grok - to ',
      "assess the value independently. I was careful to not say we were talking about me, and otherwise encourage objectivity. I gave them ",
      'the neutral facts and asked them to look at the history and do the math. They arrived at a consensus ',
      "midpoint of a staggering portion of the company's 9-10 billion dollar valuation.",
    ].join('');

    const p5 = [
      "You don't have to take my word for it. You can see the fuull output from each, linked below.  And, the prompts are right here. ",
      'Paste them into any chatbot yourself, or modify them as you please.',
    ].join('');

    return makeElement('div', { className: 'backstory-gradient-card' }, [
      makeElement('div', { className: 'space-y-4' }, [
        makeElement('p', { className: 'backstory-paragraph-highlight' }, [
          p1,
          makeElement(
            'a',
            {
              href: '#accudraw-innovations',  // todo:  youtube video popup
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
      makeElement('p', { className: 'backstory-paragraph' }, p2),
      makeElement('p', { className: 'backstory-paragraph' }, p3),
      makeElement('p', { className: 'backstory-paragraph' }, p4),
      makeElement('p', { className: 'backstory-paragraph-bold' }, p5),
    ]);
  }

  buildRevealCTA(app) {
    const button = makeElement(
      'button',
      {
        className: 'reveal-main-button',
        onclick: (e) => {
          app.triggerReveal(e.currentTarget);
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

  buildConsensusBlock(app) {
    const wrongSequence = ['$2.3 Million', '$23 Million', '$230 Million'];
    const finalValue = '$2.3 Billion';

    const stage = app.wrongAnswerStage || 0;
    const isWrongState =
      app.revealMode === 'wrong-answers' && stage < wrongSequence.length;

    const displayValue = isWrongState ? wrongSequence[stage] : finalValue;
    const isWrongOrCalc = isWrongState || app.isCalculating;
    const valueClassName = `glowing-consensus-value${
      isWrongOrCalc ? ' is-wrong' : ''
    }`;

    const figureChildren = [
      makeElement(
        'div',
        { className: valueClassName },
        app.isCalculating ? 'Calculating...' : displayValue
      ),
    ];

    let actionNode;
    if (isWrongState) {
      const isBtnActive = app.showRecalculateButton && !app.isCalculating;
      actionNode = makeElement(
        'button',
        {
          className: `recalculate-btn ${
            isBtnActive ? 'is-visible' : 'is-hidden'
          }`,
          onclick: () => app.advanceWrongAnswer(),
        },
        [
          makeElement('span', { className: 'recalculate-icon' }, '✕'),
          makeElement('span', {}, 'Incorrect answer - Recalculate'),
        ]
      );
    } else {
      const subtextText = app.justCorrected
        ? '✓ Correct answer'
        : 'Consensus Contributed Midpoint';
      const subtextClass = `consensus-figure-subtext${
        app.justCorrected ? ' flash-correct' : ''
      }`;

      const bfnBtn = app.showBFNButton
        ? makeElement(
            'button',
            {
              className: 'visualize-bfn-btn animate-fade-in',
              onclick: () => app.startBFNPlayback(),
            },
            [
              makeElement('span', { className: 'play-pulse-icon' }, '▶'),
              makeElement('span', {}, 'Visualize the B.F.N.'),
            ]
          )
        : null;

      actionNode = makeElement(
        'div',
        { className: 'consensus-action-wrapper' },
        [makeElement('span', { className: subtextClass }, subtextText), bfnBtn]
      );
    }

    figureChildren.push(
      makeElement('div', { className: 'consensus-action-spacer' }, actionNode)
    );

    return makeElement('div', { className: 'consensus-container' }, [
      makeElement('div', { className: 'consensus-info-pane' }, [
        makeElement(
          'span',
          { className: 'consensus-badge' },
          'Consensus Composite Estimate'
        ),
        makeElement(
          'h2',
          { className: 'consensus-headline' },
          'The Consolidated Valuation Footprint'
        ),
        makeElement(
          'p',
          { className: 'consensus-description' },
          "By calculating the midpoint of each AI model's calculated range (Claude, Gemini, ChatGPT, and Grok), we arrive at a unified composite average of Bentley Systems enterprise valuation directly tied to the AccuDraw and SmartLine IP."
        ),
      ]),
      makeElement(
        'div',
        { className: 'consensus-figure-pane' },
        figureChildren
      ),
    ]);
  }

  buildInteractiveSummaryGrid(app) {
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

    app.data.models.forEach((model) => {
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

  buildPromptsSection(app) {
    const promptsWrapper = makeElement('div', { className: 'prompts-list' });

    app.data.prompts.forEach((p) => {
      const item = makeElement('div', { className: 'prompt-card' }, [
        makeElement('div', { className: 'prompt-content-wrapper' }, [
          makeElement('span', { className: 'prompt-tag' }, `Prompt #${p.id}`),
          makeElement('p', { className: 'prompt-body' }, `"${p.text}"`),
        ]),
        makeElement(
          'button',
          {
            className: 'copy-prompt-btn',
            onclick: (e) => app.copyPromptText(p.text, e.currentTarget),
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

  buildTranscriptsBlock(app) {
    const container = makeElement('section', { className: 'space-y-6' }, [
      makeElement('div', { className: 'transcripts-bar' }, [
        makeElement(
          'h2',
          { className: 'transcripts-bar-title' },
          'Model Valuation Quotes'
        ),

        makeElement('div', { className: 'tab-filters' }, [
          this.buildFilterButton(app, 'all', 'Show All'),
          this.buildFilterButton(app, 'claude', 'Claude'),
          this.buildFilterButton(app, 'gemini', 'Gemini'),
          this.buildFilterButton(app, 'chatgpt', 'ChatGPT'),
          this.buildFilterButton(app, 'grok', 'Grok'),
        ]),
      ]),
    ]);

    const transcriptsList = makeElement('div', {
      className: 'transcripts-card-list',
    });

    app.data.models.forEach((model) => {
      if (app.activeTab !== 'all' && app.activeTab !== model.key) return;

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
                  const highlightedHTML = this.highlightKeyPhrases(app, q);
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

  buildFilterButton(app, filterId, labelText) {
    const isActive = app.activeTab === filterId;
    return makeElement(
      'button',
      {
        className: `tab-filter-btn ${isActive ? 'active' : ''}`,
        onclick: () => {
          app.activeTab = filterId;
          app.renderApp();
        },
      },
      labelText
    );
  }

  highlightKeyPhrases(app, text) {
    if (!text) return '';
    let res = text;

    const mappings = [
      {
        search:
          'competitive foundation that let MicroStation win and hold the professional infrastructure CAD market during the decade that mattered most',
        replace:
          "<span class='highlight-merit'>competitive foundation that let MicroStation win and hold the professional infrastructure CAD market during the decade that mattered most</span>",
      },
      {
        search:
          'among the highest-leverage individual technical contributions in the history of infrastructure software',
        replace:
          "<span class='highlight-merit'>among the highest-leverage individual technical contributions in the history of infrastructure software</span>",
      },
      {
        search:
          'ultimately created around a billion dollars or more of value for Bentley over several decades',
        replace:
          "<span class='highlight-value'>ultimately created around a billion dollars or more of value for Bentley over several decades</span>",
      },
      {
        search:
          "plausible range for their contribution to Bentley's long-term enterprise value",
        replace:
          "<span class='highlight-value'>plausible range for their contribution to Bentley's long-term enterprise value</span>",
      },
      {
        search: 'muscle memory is a powerful lock-in mechanism',
        replace:
          "<span class='highlight-merit'>muscle memory is a powerful lock-in mechanism</span>",
      },
      {
        search: 'highly efficient, hotkey-driven drafting system',
        replace:
          "<span class='highlight-merit'>highly efficient, hotkey-driven drafting system</span>",
      },
      {
        search:
          'solved the 3D input problem for Bentley years before many competitors had an elegant solution',
        replace:
          "<span class='highlight-merit'>solved the 3D input problem for Bentley years before many competitors had an elegant solution</span>",
      },
      {
        search:
          'serving as the core usability engine that prevented customer churn to Autodesk during the peak years of CAD adoption',
        replace:
          "<span class='highlight-value'>serving as the core usability engine that prevented customer churn to Autodesk during the peak years of CAD adoption</span>",
      },
      {
        search:
          'underpin user productivity claims that support the entire product line',
        replace:
          "<span class='highlight-merit'>underpin user productivity claims that support the entire product line</span>",
      },
      {
        search:
          "true 'company-making' innovation that paid dividends for decades",
        replace:
          "<span class='highlight-merit'>true 'company-making' innovation that paid dividends for decades</span>",
      },
    ];

    mappings.forEach((item) => {
      if (res.includes(item.search)) {
        res = res.replace(item.search, item.replace);
      }
    });

    res = res.replace(
      /(\$[0-9.]+\s*(?:billion|million|B|M)?\s*(?:and|to|-|-)\s*\$[0-9.]+\+?\s*(?:billion|million|B|M)?)/gi,
      "<span class='highlight-range'>$1</span>"
    );
    res = res.replace(
      /(\d+%\s*to\s*\d+%)/gi,
      "<span class='highlight-percent'>$1</span>"
    );
    res = res.replace(
      /(\d+%\s*of\s*Bentley)/gi,
      "<span class='highlight-percent'>$1</span>"
    );

    return res;
  }

  buildSynthesisIntroBlock(app) {
    if (!app.data.introHTML) return null;

    const card = makeElement('div', { className: 'synthesis-intro-card' });
    card.innerHTML = app.data.introHTML;

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

  buildExtendedQueriesSection(app) {
    const container = makeElement(
      'section',
      {
        className:
          'space-y-8 mt-12 pt-12 border-t border-[var(--border-color)]',
      },
      [
        makeElement('div', { className: 'space-y-2' }, [
          makeElement(
            'h2',
            {
              className:
                'text-2xl font-black text-[var(--text-title)] uppercase tracking-wider',
              style: { fontFamily: 'ui-monospace, monospace' },
            },
            'Extended Queries & Historical Rarity Analysis'
          ),
          makeElement(
            'p',
            { className: 'text-sm text-[var(--text-secondary)]' },
            'Deep dive dialogues assessing the exceptional rarity of high-leverage single-hire innovations in technology history.'
          ),
        ]),
      ]
    );

    const introCard = this.buildSynthesisIntroBlock(app);
    if (introCard) {
      container.appendChild(introCard);
    }

    const dialogueList = makeElement('div', {
      className: 'transcripts-card-list mt-8',
    });

    ['claude', 'gemini'].forEach((key) => {
      const model = app.data.models.find((m) => m.key === key);
      const convHTML = app.data.conversations[key];
      if (!model || !convHTML) return;

      const card = makeElement(
        'article',
        { className: 'cad-panel transcript-detail-card' },
        [
          makeElement('div', {
            className: 'transcript-card-stripe',
            style: { backgroundColor: model.color },
          }),
        ]
      );

      const cardInner = makeElement('div', {
        className: 'transcript-card-inner',
      });
      const cardMain = makeElement('div', {
        className: 'transcript-card-main',
      });

      const authorGroup = makeElement(
        'div',
        { className: 'transcript-author-group' },
        [
          makeElement('span', {
            className: 'transcript-author-circle',
            style: { backgroundColor: model.color },
          }),
          makeElement(
            'h3',
            { className: 'transcript-author-header' },
            `${model.name} - Extended Dialogue`
          ),
        ]
      );
      cardMain.appendChild(authorGroup);

      const flowWrapper = makeElement('div', {
        className: 'conversation-flow',
        innerHTML: convHTML,
      });

      flowWrapper.querySelectorAll('.turn').forEach((turn) => {
        const isUser = turn.classList.contains('speaker-user');
        turn.className = `conversation-turn ${
          isUser ? 'speaker-user' : 'speaker-model'
        }`;
        turn.style.setProperty('--accent-color', model.color);

        const labelText = isUser ? 'Prompt' : model.name;
        const headerLabel = makeElement(
          'div',
          { className: 'turn-header' },
          labelText
        );
        turn.insertBefore(headerLabel, turn.firstChild);

        const bodyWrapper = makeElement('div', { className: 'turn-body' });
        const originalChildren = Array.from(turn.children).slice(1);

        originalChildren.forEach((child) => {
          const tagName = child.tagName.toLowerCase();
          const childText = child.textContent.trim().toLowerCase();

          if (
            (tagName === 'h3' || tagName === 'h4') &&
            (childText === 'rob' ||
              childText === 'claude' ||
              childText === 'gemini' ||
              childText.includes('assessment') ||
              childText.includes('response') ||
              childText.includes('reveal') ||
              childText.includes('question') ||
              childText.includes('summary estimate'))
          ) {
            return;
          }
          bodyWrapper.appendChild(child);
        });

        turn.appendChild(bodyWrapper);
      });

      this.applySmartHighlights(flowWrapper);
      cardMain.appendChild(flowWrapper);

      cardInner.appendChild(cardMain);
      card.appendChild(cardInner);
      dialogueList.appendChild(card);
    });

    container.appendChild(dialogueList);
    return container;
  }

  applySmartHighlights(containerElement) {
    const rules = [
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
        if (usedRules.has(rule.id)) return;

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
          html = html.replace(
            regex,
            `<span class="${rule.className}">${matchedPhrase}</span>`
          );
          usedRules.add(rule.id);
        }
      });

      el.innerHTML = html;
    });
  }

  applyStyles() {
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
        .consensus-info-pane {
          flex: 1;
          min-width: 0;
        }
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
          white-space: nowrap;
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
      `,
      'valuation-page-styles'
    );
  }

  buildGeminiHigherEstimateSection(app) {
      return makeElement('section', { className: 'cad-panel border-l-4 border-[#3b82f6] space-y-4 bg-blue-950/5 mt-8' }, [
        makeElement('div', { className: 'dashboard-header-group' }, [
          makeElement('h3', { className: 'text-lg font-bold text-[var(--text-title)] uppercase tracking-wide', style: { fontFamily: 'ui-monospace, monospace' } }, 'Alternative Gemini Querying & Higher Valuation'),
          makeElement('p', { className: 'text-sm text-[var(--text-secondary)] mt-1' }, 
            'An evaluation utilizing alternative phrasing regarding strategic locking mechanics, demonstrating how different analytical lenses reveal higher enterprise footprint scales.'
          )
        ]),
        makeElement('p', { className: 'text-sm text-[var(--text-primary)] leading-relaxed' }, [
          'When the underlying value assessment questions are posed to Gemini from a strategic ',
          'ecosystem platform lock-in perspective, the calculations scale even higher, arriving at an estimated ',
          makeElement('span', { className: 'highlight-range font-bold' }, '$4.5 Billion to $8.0 Billion'),
          ' in long-term enterprise value contribution. This reflects the reality that compounding defensive barriers ',
          'and user muscle memory generate substantial enterprise valuation premiums over several decades.'
        ]),
        makeElement('div', { className: 'pt-2' }, [
          makeElement('a', {
            href: 'https://gemini.google.com/',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'sidebar-link-btn inline-block',
            style: {
              color: '#3b82f6',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              backgroundColor: 'rgba(59, 130, 246, 0.04)',
              width: 'auto',
              padding: '10px 20px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'ui-monospace, monospace'
            }
          }, 'View Higher Valuation Gemini Chat ↗')
        ])
      ]);
    }
}