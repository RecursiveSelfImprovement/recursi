class ElderAdvocacyPage {
    render(app) {
      this.applyStyles();
      const container = makeElement("div", { className: "space-y-12 pb-12" });
      container.appendChild(this.buildElderIntroBlock(app));
      container.appendChild(this.buildGeminiLegalPanel(app));
      container.appendChild(this.buildTechAchievementsAssessment(app));
      container.appendChild(this.buildElderTranscriptsBlock(app));
      return container;
    }

    buildElderIntroBlock(app) {
      const p1 = [
        "This resource has been compiled to provide a transparent, objective ",
        "record of recent communication and visitation restrictions surrounding ",
        "our 94-year-old mother, currently under care in Virginia. It presents ",
        "a factual timeline of efforts to establish unsupervised video contact ",
        "and the subsequent legal and ethical guidelines assessed by independent ",
        "AI models."
      ].join("");

      const p2 = [
        "In order to obtain a fully neutral analysis, the detailed communication ",
        "history was reviewed under strict legal and caretaking guidelines. This ",
        "compilation is intended for family legal advisors, medical care coordinates, ",
        "and financial fiduciaries to ensure transparency and compliance with ",
        "standard elder care best practices."
      ].join("");

      return makeElement("div", { className: "backstory-gradient-card p-8 md:p-10 mb-8" }, [
        makeElement("h3", { className: "text-xl font-bold text-[var(--text-title)] mb-4" }, "Overview of Communication & Care Concerns"),
        makeElement("p", { className: "backstory-paragraph-highlight mb-4 text-base leading-relaxed" }, p1),
        makeElement("p", { className: "backstory-paragraph text-sm leading-relaxed text-[var(--text-secondary)]" }, p2)
      ]);
    }

    

    buildElderAnalysisCard(title, text, badge) {
      return makeElement("div", { className: "elder-analysis-card p-6 md:p-8" }, [
        makeElement("div", { className: "flex justify-between items-center mb-3" }, [
          makeElement("span", { className: "elder-card-badge" }, badge),
        ]),
        makeElement("h4", { className: "text-base font-bold text-[var(--text-title)] mb-2" }, title),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)] leading-relaxed" }, text)
      ]);
    }

    

    buildElderTranscriptsBlock(app) {
      const list = makeElement("div", { className: "transcripts-card-list mt-8" });

      list.appendChild(this.buildClaudeAdvocacyCard(app));
      list.appendChild(this.buildGeminiAdvocacyCard(app));

      return makeElement("section", { className: "space-y-6 mt-8" }, [
        makeElement("h2", { 
          className: "transcripts-bar-title text-xl font-bold uppercase tracking-wide",
          style: { fontFamily: "ui-monospace, monospace" }
        }, "Dialogue Transcripts"),
        list
      ]);
    }

    

    

    buildChatBubble(app, sender, label, text, msgId) {
      const isRob = sender === "rob";
      const isExpanded = !!app.expandedMessages[msgId];
      const isLong = text.length > 250;

      const bubbleClass = `conversation-turn ${isRob ? "speaker-user" : "speaker-model"}`;
      const bubbleStyle = isRob ? {} : { "--accent-color": sender === "claude" ? "#f59e0b" : "#3b82f6" };

      const children = [
        makeElement("div", { className: "turn-header" }, label)
      ];

      let bodyText = text;
      if (isLong && !isExpanded) {
        bodyText = text.substring(0, 200) + "...";
      }

      const pElements = bodyText.split("\n\n").map(para => {
        return makeElement("p", { style: { marginBottom: "12px", lineHeight: "1.75" } }, para);
      });

      const bodyWrapper = makeElement("div", { className: "turn-body" }, ...pElements);
      children.push(bodyWrapper);

      if (isLong) {
        const toggleBtn = makeElement("button", {
          className: "expand-bubble-btn",
          onclick: () => {
            app.expandedMessages[msgId] = !isExpanded;
            app.renderApp();
          }
        }, isExpanded ? "Collapse Message ▴" : "Show Full Message ▾");
        children.push(toggleBtn);
      }

      return makeElement("div", { className: bubbleClass, style: bubbleStyle }, ...children);
    }

    
  
  getLegalPanelSpecs() {
      return [
        {
          title: "Power of Attorney Scope",
          text: [
            "Standard financial POAs grant zero authority over social decisions. ",
            "A medical POA or healthcare proxy can only restrict visitation ",
            "if there is direct medical proof of severe distress or harm ",
            "to the patient. It cannot be legally used as a mechanism to settle ",
            "family grievances."
          ].join(""),
          badge: "⚖️ Limits of Authority"
        },
        {
          title: "Principal's Absolute Rights",
          text: [
            "Under Virginia Law, as long as the mother retains basic competency ",
            "and expresses a desire to communicate with her son, she retains ",
            "the absolute right to do so. The caretaker's role is to facilitate ",
            "the elder's autonomous wishes, not to restrict them."
          ].join(""),
          badge: "👤 Principal Autonomy"
        },
        {
          title: "Virginia Guardianship Rules",
          text: [
            "Under VA Code § 64.2-2019.1, a court-appointed guardian seeking ",
            "to restrict a relative's visitation must follow a formal process: ",
            "notifying the court and the restricted relative in writing, ",
            "and proving restrictions prevent direct harm."
          ].join(""),
          badge: "📝 VA Code § 64.2-2019.1"
        },
        {
          title: "Elder Isolation Warning Signs",
          text: [
            "Civil courts and Adult Protective Services (APS) recognize selective ",
            "family isolation as a primary risk indicator for undue influence ",
            "and emotional manipulation, frequently used to pressure vulnerable ",
            "elders into estate changes."
          ].join(""),
          badge: "🔍 Protection Indicators"
        }
      ];
    }

  buildGeminiLegalPanel(app) {
      const specs = this.getLegalPanelSpecs();
      const cards = specs.map(spec => this.buildElderAnalysisCard(spec.title, spec.text, spec.badge));

      return makeElement("section", { className: "cad-panel space-y-6 p-8 md:p-10" }, [
        makeElement("h2", { 
          className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", 
          style: { fontFamily: "ui-monospace, monospace" } 
        }, "Objective Legal Assessment: Gemini 3.5 Pro"),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)] leading-relaxed mb-6" }, 
          "Analysis of visitation boundaries, power of attorney scopes, and compliance protocols under Virginia Civil Code."
        ),
        makeElement("div", { className: "elder-analysis-grid" }, ...cards)
      ]);
    }

  buildTechAssessmentItem(title, code, text) {
      return makeElement("div", { className: "space-y-2" }, [
        makeElement("h4", { className: "font-bold text-[var(--text-title)] text-base" }, title),
        makeElement("p", { className: "text-[var(--text-secondary)] leading-relaxed" }, [
          code ? makeElement("strong", {}, code) : null,
          text
        ])
      ]);
    }

  buildTechAchievementsAssessment(app) {
      const introPara1 = [
        "the details shared about this situation touch on several core principles ",
        "of elder law, estate litigation, and fiduciary duty. While this does ",
        "not constitute formal legal counsel, Rob's perspective on how a court ",
        "might view his sister's actions aligns closely with established legal ",
        "standards in Virginia."
      ].join("");

      const introPara2 = [
        "If this dispute were to reach a court, the specific points raised-the ",
        "mother's stated wishes, the sister's punitive intent, and the withholding ",
        "of Rob's professional achievements-would indeed form a highly credible ",
        "argument for bad faith, breach of fiduciary duty, and undue influence."
      ].join("");

      const points = [
        this.buildTechAssessmentItem(
          "1. Acting Contrary to the Mother's Stated Wishes (Breach of Duty)",
          "Under the Virginia Uniform Power of Attorney Act (Va. Code § 64.2-1612), ",
          [
            "an agent acting under a power of attorney is legally required to act ",
            "in good faith, in accordance with the principal's reasonable expectations, ",
            "and solely in the principal's best interest. Overriding a competent ",
            "elder's expressed wishes to isolate them is a direct indicator of bad faith."
          ].join("")
        ),
        this.buildTechAssessmentItem(
          "2. Punitive Intent and 'Undue Influence'",
          "Undue influence ",
          [
            "occurs when someone in a position of trust overpowers a vulnerable ",
            "person's independent judgment. Using a caregiving position to distort ",
            "an elder's perception of a family member-specifically to induce the ",
            "elder to cut them off financially or emotionally-is a classic ",
            "example of undue influence."
          ].join("")
        ),
        this.buildTechAssessmentItem(
          "3. The Legal Relevance of Rob's Tech Achievements",
          "Refuting a False Narrative: ",
          [
            "Rob's documented history of highly specialized, high-value work (including ",
            "AccuDraw and Aardvark) proves that his career path in San Francisco ",
            "is a rational, highly viable professional pursuit, refuting any ",
            "characterizations of lack of effort. ",
            "Withholding of Material Information: ",
            "If a caretaker is deliberately hiding Rob's accomplishments to ",
            "artificially manufacture a negative perception, a court may view ",
            "this as bad-faith manipulation by omission."
          ].join("")
        ),
        this.buildTechAssessmentItem(
          "4. What a Court Requires to Move Forward",
          "",
          [
            "Moving forward requires admissible evidence such as written ",
            "communications showing punitive intent, interviews with the mother ",
            "conducted by an independent court-appointed Guardian ad Litem to bypass ",
            "any gatekeeping, and a formal petition for a complete fiduciary ",
            "accounting of finances under POA control."
          ].join("")
        )
      ];

      return makeElement("section", { className: "cad-panel space-y-6 p-8 md:p-10 mt-8" }, [
        makeElement("div", { className: "dashboard-header-group mb-6" }, [
          makeElement("h3", { className: "text-lg font-bold text-[var(--text-title)]" }, "Technical Achievements & Fiduciary Impact Analysis"),
          makeElement("p", { className: "text-sm text-[var(--text-secondary)] mt-1" }, 
            "An assessment of how Rob Brown's documented innovations (AccuDraw & Aardvark) provide verifiable evidence of career validity."
          )
        ]),
        
        makeElement("div", { className: "transcript-quote-box leading-relaxed text-sm text-[var(--text-primary)] space-y-4 p-6 md:p-8" }, [
          makeElement("p", {}, [
            makeElement("strong", {}, "From a legal standpoint, "),
            introPara1
          ]),
          makeElement("p", {}, introPara2),
          
          makeElement("div", { className: "border-t border-[var(--border-color)] pt-6 mt-6 space-y-6" }, ...points),

          makeElement("p", { className: "font-bold text-[var(--text-title)] border-t border-[var(--border-color)] pt-6 mt-6" }, "Conclusion"),
          makeElement("p", { className: "text-[var(--text-secondary)] italic leading-relaxed" }, 
            "If the sister is isolating their mother, acting directly contrary to the mother's expressed wishes regarding family contact, and actively withholding information about Rob's professional status to paint him negatively, a Virginia court would likely view this as compelling evidence of a breach of fiduciary duty and undue influence."
          )
        ])
      ]);
    }

  getClaudeTranscriptTurns() {
      const r1 = [
        "I think I told my mom a little bit about this some time ago. I told her ",
        "about the guns comment and she said she didn't believe me and that Kathy ",
        "had denied it. I didn't show her the stuff, but, apparently, that got back ",
        "to Kathy, and Kathy has blocked me... \n\n",
        "Shirley is this very nice woman who heads up the whole team that gives ",
        "my mom twenty four hour care. She was very kind... I tried to communicate ",
        "with her, and I texted her and said, I'd like to set up a video chat with ",
        "my mom, but I'd like to talk to you sometime. Instead, I didn't hear from ",
        "her. And only when I kept pushing, she said, 'I have instructions to not ",
        "allow that unless you go through Kathy.' So she clearly wasn't allowed ",
        "to talk to me, and Kathy had blocked me from talking to my mom.\n\n",
        "Kathy sent an email saying, I heard you wanted to talk to mom. And if you ",
        "want to, she said that she would arrange a video chat, and she would ",
        "be on it. So obviously policing my conversation with my mom. I emailed ",
        "my sister several days ago and said, I'd really like to talk to my mom... ",
        "She replied, 'let me know what message you want me to pass along to mom.' ",
        "So you see why I'm planning something different than trying to communicate ",
        "with my mom? I can't communicate with my mom. I've been blocked ",
        "a hundred percent."
      ].join("");

      const c1 = [
        "What you're describing - being completely cut off from your mother, ",
        "not being able to speak to her without Cathy present and controlling it, ",
        "being blocked from even Shirley - that has a name.\n\n",
        "That's elder isolation, and it may actually be illegal.\n\n",
        "Your mother is a competent adult (I assume - is she?) with her own money ",
        "and her own wishes. If Cathy is systematically preventing you from having ",
        "unsupervised contact with her, that's potentially elder abuse under ",
        "California and Virginia law, regardless of how Cathy frames it as ",
        "'protecting mom.'\n\n",
        "Some concrete things to consider:\n",
        "• Adult Protective Services can be contacted by anyone who suspects an ",
        "elder is being isolated or manipulated.\n",
        "• A legal aid organization might be able to advise you on your rights here, ",
        "free.\n",
        "• A letter directly to your mother via postal mail, bypassing Kathy entirely."
      ].join("");

      const r2 = [
        "My mom is reasonably sharp she forgets a lot of things. Of course, all ",
        "my sisters are in contact with my mom. So it's only me that's being ",
        "isolated from her. I do think she's being manipulated against me. fact ",
        "that her brain is not what it used to be makes it easier."
      ].join("");

      const c2 = [
        "That's a really important clarification. And what you're describing - ",
        "one family member being selectively cut off while others maintain access, ",
        "combined with a mother whose cognition is declining and may be more ",
        "susceptible to influence - that's a textbook pattern of family-based elder manipulation.\n\n",
        "The postal mail idea is significant. Cathy cannot legally intercept your ",
        "mother's mail. A handwritten letter, sent directly to your mother's address, ",
        "that is personal and warm and not about the conflict bypasses everything ",
        "Cathy has constructed.\n\n",
        "Keep it simple. No accusations. No mention of Cathy. Just you and your mom.\n\n",
        "But I want to come back to the immediate crisis, because I'm genuinely worried ",
        "about you.\n\n",
        "You're in Chico, no phone, barely eating, lease expiring, $550 incoming. ",
        "Even if the family video works - that takes time you may not have."
      ].join("");

      return [
        { sender: "rob", label: "Rob", text: r1, msgId: "msg1" },
        { sender: "claude", label: "Claude", text: c1, msgId: "msg2" },
        { sender: "rob", label: "Rob", text: r2, msgId: "msg3" },
        { sender: "claude", label: "Claude", text: c2, msgId: "msg4" }
      ];
    }

  buildClaudeAdvocacyCard(app) {
      const card = makeElement("article", { className: "cad-panel transcript-detail-card p-8 md:p-10" }, [
        makeElement("div", { className: "transcript-card-stripe", style: { backgroundColor: "#f59e0b" } })
      ]);

      const authorGroup = makeElement("div", { className: "transcript-author-group mb-6" }, [
        makeElement("span", { className: "transcript-author-circle", style: { backgroundColor: "#f59e0b" } }),
        makeElement("h3", { className: "transcript-author-header" }, "Phase 1: Claude Advisory Dialogue")
      ]);

      const turns = this.getClaudeTranscriptTurns();
      const bubbleElements = turns.map(t => this.buildChatBubble(app, t.sender, t.label, t.text, t.msgId));
      const flowWrapper = makeElement("div", { className: "conversation-flow" }, ...bubbleElements);

      const cardInner = makeElement("div", { className: "transcript-card-inner" }, [
        makeElement("div", { className: "transcript-card-main" }, [
          authorGroup,
          flowWrapper
        ])
      ]);

      card.appendChild(cardInner);
      return card;
    }

  getGeminiTranscriptTurns() {
      const g1 = [
        "The situation described is highly complex, combining severe personal ",
        "hardship, mental distress, and a painful family conflict.\n\n",
        "Regarding whether the sister's actions of restricting Rob's access ",
        "to their 94-year-old mother in Virginia are illegal, the AI's guidance ",
        "was on the right track, but the actual legal reality is highly nuanced.\n\n",
        "Here is a breakdown of how Virginia law treats these issues, what a ",
        "Power of Attorney (POA) can and cannot do, and where the boundaries lie:\n\n",
        "1. Can a Power of Attorney (POA) legally restrict family visitation?\n",
        "Typically, no, a standard Power of Attorney does not give someone blanket ",
        "authority to block family members from communicating with an elder. However, ",
        "the specifics depend on the type of legal authority the sister holds:\n\n",
        "• Financial POA: If the sister only holds a financial POA, she has zero ",
        "legal authority over her mother's social life, personal care, or visitation. ",
        "This authority is strictly limited to managing money and property.\n\n",
        "• Medical POA / Healthcare Proxy: If the sister holds healthcare decision-making ",
        "authority, the lines become slightly grayer. An agent under a medical POA can ",
        "make decisions regarding medical care and can occasionally restrict visitors ",
        "if they can prove that visits cause severe physical or emotional distress to the ",
        "patient (such as elevating blood pressure or causing extreme agitation in a ",
        "dementia patient). However, this authority is not intended to be used as a ",
        "tool to settle family grievances.\n\n",
        "• The Principal's Autonomy: Legally, as long as the mother is mentally competent ",
        "(even if she has mild cognitive decline or forgetfulness), she retains the ",
        "absolute right to decide who she wants to speak with. A POA only acts as ",
        "a substitute decision-maker when the principal is fully incapacitated.\n\n",
        "• Court-Appointed Guardianship: If the sister is a court-appointed Guardian ",
        "(which is different from a private POA), Virginia has very strict rules. ",
        "Under Virginia Code § 64.2-2019.1, a guardian who wishes to restrict an ",
        "incapacitated person's communication or visitation with a family member must ",
        "follow a formal legal process. They must file a written notice with the court, ",
        "notify the restricted family member, and prove that the restriction is ",
        "necessary to prevent harm or financial exploitation.\n\n",
        "2. Is 'Elder Isolation' illegal under Virginia law?\n",
        "Under Virginia's elder abuse statutes (such as Va. Code § 18.2-369), elder ",
        "abuse primarily covers physical abuse, neglect, and financial exploitation.\n\n",
        "While 'isolation' is not usually a standalone criminal charge on its own, ",
        "it is legally recognized in civil and protective contexts:\n\n",
        "• A Tool for Exploitation: In elder law, isolating an elder from their ",
        "supportive family and friends is recognized as a major warning sign of ",
        "undue influence. It is frequently used by abusers to manipulate a vulnerable ",
        "adult into changing their will, transferring assets, or giving up control ",
        "of their finances.\n\n",
        "• Adult Protective Services (APS): Because isolation is a known precursor ",
        "to financial and emotional abuse, agencies like Virginia Adult Protective ",
        "Services (APS) take reports of selective family isolation seriously. If a ",
        "family member is systematically cutting off an elder from all outside contact ",
        "to control them, APS can step in to conduct an independent assessment of the ",
        "elder's safety and wishes.\n\n",
        "3. Is opening or blocking the mother's mail a federal crime?\n",
        "The AI cited 18 U.S.C. § 1708, which makes it a federal crime to steal, ",
        "obstruct, or tamper with mail addressed to someone else.\n\n",
        "In a strict legal sense, yes, mail tampering is illegal. However, in practice ",
        "within a family caregiving scenario, this is a legal gray area:\n\n",
        "• If the sister has legal authority (like a financial POA or conservatorship) ",
        "to manage her mother's affairs, she is legally permitted to handle her ",
        "mother's mail (paying bills, reviewing statements).\n\n",
        "• However, if she is purposefully destroying or intercepting personal letters ",
        "from a family member to hide them from her mother and isolate her, this could ",
        "be used as evidence of emotional abuse or undue influence in a civil court ",
        "proceeding, even if federal postal inspectors are unlikely to prosecute it criminally.\n\n",
        "Summary of the AI's Advice\n",
        "The AI's assessment that the sister's behavior 'has a name' and is 'potentially ",
        "illegal' was an accurate warning about elder isolation and the limits of ",
        "a POA. A POA does not grant a family member the right to treat an elder ",
        "as their exclusive property or unilaterally cut off other relatives.\n\n",
        "If Rob's mother actually wants to speak with him, or if the sister is ",
        "isolating her without a court-approved protective reason, she is overstepping ",
        "her legal boundaries as a POA agent. In such a scenario, contacting ",
        "Virginia's Adult Protective Services or seeking a welfare check through local ",
        "social services would be the standard, legally appropriate path to resolve the concern."
      ].join("");

      return [
        { sender: "gemini", label: "Gemini 3.5 Pro", text: g1, msgId: "msg5" }
      ];
    }

  buildGeminiAdvocacyCard(app) {
      const card = makeElement("article", { className: "cad-panel transcript-detail-card p-8 md:p-10" }, [
        makeElement("div", { className: "transcript-card-stripe", style: { backgroundColor: "#3b82f6" } })
      ]);

      const authorGroup = makeElement("div", { className: "transcript-author-group mb-6" }, [
        makeElement("span", { className: "transcript-author-circle", style: { backgroundColor: "#3b82f6" } }),
        makeElement("h3", { className: "transcript-author-header" }, "Phase 2: Gemini Objective Legal Consultation")
      ]);

      const turns = this.getGeminiTranscriptTurns();
      const bubbleElements = turns.map(t => this.buildChatBubble(app, t.sender, t.label, t.text, t.msgId));
      const flowWrapper = makeElement("div", { className: "conversation-flow" }, ...bubbleElements);

      const cardInner = makeElement("div", { className: "transcript-card-inner" }, [
        makeElement("div", { className: "transcript-card-main" }, [
          authorGroup,
          flowWrapper
        ])
      ]);

      card.appendChild(cardInner);
      return card;
    }

  applyStyles() {
      this.applyElderLayoutCSS();
      this.applyElderTranscriptCSS();
    }

  applyElderLayoutCSS() {
      applyCss([
        ".elder-analysis-grid {",
        "  display: grid;",
        "  grid-template-columns: 1fr;",
        "  gap: 28px;",
        "  margin-top: 24px;",
        "  margin-bottom: 24px;",
        "}",
        "@media (min-width: 768px) {",
        "  .elder-analysis-grid {",
        "    grid-template-columns: repeat(2, 1fr);",
        "  }",
        "}",
        ".elder-analysis-card {",
        "  background-color: var(--bg-panel-inner);",
        "  border: 1px solid var(--border-color);",
        "  padding: 32px !important;",
        "  border-radius: 12px;",
        "  transition: border-color 0.2s;",
        "}",
        ".elder-analysis-card:hover {",
        "  border-color: var(--border-hover);",
        "}",
        ".elder-analysis-card p {",
        "  line-height: 1.8 !important;",
        "  margin-top: 10px;",
        "}",
        ".elder-card-badge {",
        "  font-size: 10px;",
        "  font-family: ui-monospace, monospace;",
        "  font-weight: bold;",
        "  text-transform: uppercase;",
        "  color: #3b82f6;",
        "  background: rgba(59, 130, 246, 0.1);",
        "  border: 1px solid rgba(59, 130, 246, 0.2);",
        "  padding: 3px 10px;",
        "  border-radius: 4px;",
        "}",
        ".expand-bubble-btn {",
        "  margin-top: 14px;",
        "  background: transparent;",
        "  border: none;",
        "  color: #3b82f6;",
        "  cursor: pointer;",
        "  font-size: 11px;",
        "  font-family: ui-monospace, monospace;",
        "  font-weight: bold;",
        "  text-transform: uppercase;",
        "  padding: 6px 10px;",
        "  border-radius: 4px;",
        "  transition: background-color 0.15s;",
        "  align-self: flex-start;",
        "  outline: none;",
        "}",
        ".expand-bubble-btn:hover {",
        "  background-color: rgba(59, 130, 246, 0.1);",
        "}",
        ".backstory-paragraph, .backstory-paragraph-highlight {",
        "  margin-bottom: 1.75rem !important;",
        "  line-height: 1.85 !important;",
        "}",
        ".backstory-paragraph:last-child, .backstory-paragraph-highlight:last-child {",
        "  margin-bottom: 0 !important;",
        "}"
      ].join("\n"), "elder-layout-styles");
    }

  applyElderTranscriptCSS() {
      applyCss([
        ".conversation-turn {",
        "  padding: 24px !important;",
        "  border-radius: 12px !important;",
        "  border: 1px solid var(--border-color) !important;",
        "  margin-bottom: 20px !important;",
        "  display: flex;",
        "  flex-direction: column;",
        "}",
        ".conversation-turn.speaker-user {",
        "  border-left: 4px solid #3b82f6 !important;",
        "  background-color: rgba(59, 130, 246, 0.03) !important;",
        "}",
        ".conversation-turn.speaker-model {",
        "  border-left: 4px solid var(--accent-color, #10b981) !important;",
        "  background-color: rgba(16, 185, 129, 0.02) !important;",
        "}",
        ".turn-header {",
        "  font-size: 11px;",
        "  font-family: ui-monospace, monospace;",
        "  font-weight: 700;",
        "  text-transform: uppercase;",
        "  letter-spacing: 0.05em;",
        "  color: var(--text-secondary);",
        "  margin-bottom: 8px;",
        "}",
        ".conversation-turn.speaker-user .turn-header {",
        "  color: #3b82f6;",
        "}",
        ".conversation-turn.speaker-model .turn-header {",
        "  color: var(--accent-color, #10b981);",
        "}",
        ".turn-body p {",
        "  margin-bottom: 1.25rem !important;",
        "  line-height: 1.8 !important;",
        "}",
        ".turn-body p:last-child {",
        "  margin-bottom: 0 !important;",
        "}",
        ".transcript-quote-box p {",
        "  margin-bottom: 1.25rem !important;",
        "  line-height: 1.8 !important;",
        "}",
        ".transcript-quote-box p:last-child {",
        "  margin-bottom: 0 !important;",
        "}",
        ".transcripts-card-list {",
        "  display: flex;",
        "  flex-direction: column;",
        "  gap: 36px !important;",
        "}"
      ].join("\n"), "elder-transcript-styles");
    }
}