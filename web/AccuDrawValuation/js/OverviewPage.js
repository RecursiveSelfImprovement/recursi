class OverviewPage {
    render(app) {
      this.applyStyles();
      return this.buildProfessionalOverview(app);
    }

    buildProfessionalOverview(app) {
      const analogyText = [
        "\"I was drowning, and I was thrown a life preserver. ",
        "That life preserver keeps me from going under immediately ",
        "- for which I am grateful - but it does not take me anywhere. ",
        "What I actually need is to be taken to that boat heading ",
        "toward shore - my actual career and skills. Instead, I am ",
        "expected to cling to this preserver indefinitely, guaranteeing ",
        "eventual failure through debt, aging, or exhaustion.\""
      ].join("");

      const headerCard = makeElement("div", { className: "backstory-gradient-card" }, [
        makeElement("h3", { className: "text-xl font-bold text-[var(--text-title)]" }, "Fiduciary Impasse & Restorative Runway Proposal"),
        makeElement("p", { className: "backstory-paragraph-highlight" }, [
          "We are now well into the execution of the plan, and the second half of the fund allocation has been cut off because I did not take a low-level, low-wage job. This document is no longer a forward-looking proposal; rather, it is a retrospective explanation of why the unworkable trust terms and the subsequent funding cutoff constitute an unwarranted penalty, and why my decisions were based on absolute mathematical necessity. At 62 years of age and carrying significant debt, abandoning my extremely rare skills - which have historically generated billions of dollars in enterprise value (as detailed on the ",
          makeElement("a", {
            href: "#/value-assessment",
            className: "inline-link-highlight"
          }, "Valuation Assessment page"),
          " and supported by independent AI evaluations) - to take a survival-level job made no practical sense. Doing so would have guaranteed permanent debt with zero path to retirement, whereas a strategic runway focused on high-leverage software creation remained the only realistic path to long-term solvency and self-sufficiency."
        ]),
        makeElement("div", { className: "p-4 rounded-lg bg-blue-950/20 border border-blue-500/20 mt-4" }, [
          makeElement("span", { className: "font-bold text-[var(--text-title)] block text-xs uppercase tracking-wider mb-2" }, "⚓ The Life Preserver Analogy"),
          makeElement("p", { className: "text-sm text-[var(--text-primary)] italic leading-relaxed" }, analogyText)
        ])
      ]);

      const concerns = [
        {
          num: "1",
          title: "A Trust Signed Under Practical Duress",
          desc: [
            "The current trust arrangement was not negotiated or designed with ",
            "mutual consultation. It was presented as a fait accompli during ",
            "a severe financial, housing, and mental health crisis. Declining ",
            "would have meant immediate homelessness, leaving no practical ",
            "alternative but to sign."
          ].join("")
        },
        {
          num: "2",
          title: "Structural Impossibility of Long-Term Solvency",
          desc: [
            "The mathematical reality of the plan (which demanded that I take low-paying, ",
            "unrelated work) guaranteed failure. It provided no path to cover ",
            "debt, no ability to build retirement savings, and left no ",
            "cushion against aging or illness, while forcing me to entirely ",
            "miss the current, highly time-sensitive generative AI wave."
          ].join("")
        },
        {
          num: "3",
          title: "Explicit Refusal to Acknowledge Professional Value",
          desc: [
            "The administrator has explicitly treated my professional skills, ",
            "career achievements, and earning potential as irrelevant to how ",
            "support was structured. This stood in direct contrast to a career ",
            "history of building products that generated billions in value, ",
            "and a past professional recommendation that helped build ",
            "a $15B enterprise."
          ].join("")
        },
        {
          num: "4",
          title: "Ideological Framing Over Practical Outcomes",
          desc: [
            "The structure of the support was heavily influenced by an ",
            "individualistic ideology that treats financial setback as a moral ",
            "failure and views restorative support as an improper handout. ",
            "This produced a punitive environment that sustained survival but ",
            "actively blocked professional recovery, culminating in cutting off ",
            "the second half of the allocation."
          ].join("")
        },
        {
          num: "5",
          title: "Inconsistencies and Lack of Transparency",
          desc: [
            "I was told that early financial modifications were impossible due ",
            "to trust limitations and estate risks, and was denied financial ",
            "transparency under the guise of privacy. Yet, when proposing to ",
            "pay back the estate from future lucrative ventures, I was told ",
            "nobody wanted the money back because everyone else is already wealthy."
          ].join("")
        },
        {
          num: "6",
          title: "A Profound Lack of Empathy & Hostile Comments",
          desc: [
            "Expressing vulnerability regarding family isolation was met with the ",
            "dismissive comment that 'at 61 years old, you shouldn't need family ",
            "approval.' This lack of empathy came from an administrator who ",
            "has not faced similar hardships and has previously used hostile ",
            "verbal and physical intimidation (the late 2022 gun threat) ",
            "to assert control."
          ].join("")
        }
      ];

      const concernsContainer = makeElement("div", { className: "elder-analysis-grid" }, 
        concerns.map(c => {
          return makeElement("div", { className: "elder-analysis-card" }, [
            makeElement("div", { className: "flex justify-between items-center mb-3" }, [
              makeElement("span", { className: "elder-card-badge" }, `Concern #${c.num}`)
            ]),
            makeElement("h4", { className: "text-base font-bold text-[var(--text-title)] mb-2" }, c.title),
            makeElement("p", { className: "text-sm text-[var(--text-secondary)] leading-relaxed" }, c.desc)
          ]);
        })
      );

      const requestBlock = makeElement("div", {
        className: "transcript-quote-box leading-relaxed text-sm text-[var(--text-primary)] space-y-4"
      }, [
        makeElement("h4", { 
          className: "font-bold text-[var(--text-title)] text-base border-b border-[var(--border-color)] pb-2 uppercase tracking-wider" 
        }, "The Restorative Alternative: Why a Strategic Runway Was Requested"),
        makeElement("p", {}, "Rather than seeking venture capital or avoiding responsibility, I had requested a short, front-loaded runway that would have acknowledged:"),
        makeElement("ul", { className: "list-disc pl-5 space-y-2 text-[var(--text-secondary)]" }, [
          makeElement("li", {}, [
            makeElement("strong", {}, "Extremely Rare Skills: "), 
            "My documented expertise in foundational drafting interfaces (such as inventing AccuDraw and inspiring Inspect Element, detailed on the ",
            makeElement("a", {
              href: "#/value-assessment",
              className: "inline-link-highlight"
            }, "Valuation Assessment page"),
            ") remains a rare and valuable asset that should have been leveraged."
          ]),
          makeElement("li", {}, [
            makeElement("strong", {}, "The Timing Window: "), 
            "Missing the current generative AI and visual design wave represents a permanent loss of strategic opportunity."
          ]),
          makeElement("li", {}, [
            makeElement("strong", {}, "Realism and Math: "), 
            "At 62 years of age and in debt, a plan requiring me to abandon my core professional capability to take a low-level job was mathematically guaranteed to fail. It left no path to cover debt or ever retire."
          ])
        ]),
        makeElement("p", { className: "text-xs text-[var(--text-secondary)] italic border-t border-[var(--border-color)] pt-3 mt-4" }, 
          "Conclusion: Cutting off the second half of the allocation as punishment for not taking an unrelated low-level job ignores the underlying math. The requested runway was a realistic, self-funding transition plan."
        )
      ]);

      return makeElement("div", { className: "space-y-8" }, [
        headerCard,
        makeElement("section", { className: "cad-panel space-y-6" }, [
          makeElement("h2", { 
            className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", 
            style: { fontFamily: "ui-monospace, monospace" } 
          }, "Trust Arrangements & Systemic Roadblocks"),
          concernsContainer
        ]),
        requestBlock
      ]);
    }

    applyStyles() {
      // Styles are imported dynamically when page mounts
    }
  }