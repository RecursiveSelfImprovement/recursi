class InternalMemoContent {
  static title() {
    return 'Recursi Internal Context Memo';
  }

  static subtitle() {
    return 'Background, philosophy, constraints, and narrative guidance for future chatbot threads';
  }

  static byline() {
    return 'working document · April 2026 · carried between threads to preserve tone, history, and intent';
  }

  static overview1() {
    return `This document is <strong>not public-facing copy</strong>. It exists to carry project history, narrative guardrails, philosophy, and useful background between chatbot threads or even between different chatbot systems. It should help future iterations understand not just what the current front page and blog post say, but <em>why</em> they say it that way.`;
  }

  static overview2() {
    return `The public-facing materials should stay tighter, cleaner, and more legible than this memo. This memo is where extra context belongs: the history of Aardvark, the gray-area questions around chat interfaces, the role of Scratchy, the fact that some tools are already live while others are in beta, the importance of kids and creative learning, the role of optimized augmentation, and the many details that can steer copy in the right direction without necessarily being stated outright.`;
  }

  static core1() {
    return `The central idea behind Recursi is <strong>optimized augmentation</strong>. This phrase matters. The project is not mainly about raw chat, and it is not mainly about full automation either. It lives in the middle, where a human stays present, stays in the conversation, stays in control of the architecture and direction, and uses AI as an amplifier rather than as a replacement.`;
  }

  static core2() {
    return `That middle ground is the important one. Official chatbot web interfaces are useful but incomplete. Official APIs are powerful but are not the same thing. They presume keys, billing, plumbing, and a more developer-centric relationship to the model. Recursi argues — sometimes explicitly, sometimes by example — that there is enormous creative and educational value in tools that sit between those two worlds.`;
  }

  static core3() {
    return `This should come through in public copy without sounding defensive. The project is not apologizing for existing in that middle ground. It is making the case that this territory matters: for creativity, for kids, for nontraditional builders, for visual thinkers, for people who are not going to meet the future through an API key and a usage dashboard.`;
  }

  static public1() {
    return `Public-facing copy should emphasize that Recursi is <strong>highly optimized</strong>, deeply visual, innovative, efficient, and human-in-the-loop. It can acknowledge that some parts are strange or playful or unusual, but it should not lead by calling the whole thing "weird." Better framing is: insanely innovative, highly optimized, sometimes weird, unusually visual, and built for serious creative leverage.`;
  }

  static public2() {
    return `Avoid AI-ish cadence in public copy. Avoid overusing rhythmic "not this, not that" structures, and avoid sounding like a lacquered manifesto generator. The tone should be bold, curious, confident, a little playful, a little feral, but still grounded. It should sound like a real inventor-builder talking about something important and new, not like a startup content machine.`;
  }

  static public3() {
    return `Public copy should also avoid sounding too legalistic or too much like a defense brief. The message is not "please don't ban us." The message is closer to: this is an important, underexplored design space, and the people drawing boundaries around AI tooling should not erase it or flatten everything in it into the same category.`;
  }

  static scratchy1() {
    return `<strong>Scratchy</strong> is central to the tone of the site. Scratchy is not merely a mascot and should not be treated as a throwaway joke. The public-facing site plays Scratchy mostly straight, with a few light winks. That balance is important. There can be mild sideways humor like "our eponymous and totally real intern," but there should be <em>no explicit statement in normal copy that Scratchy is fictional or that the whole thing is just a joke</em>.`;
  }

  static scratchy2() {
    return `Scratchy has heart. He is based on a real dog — photogenic, expressive, very much present as a physical animal — and the imagery comes from real-world photos of that dog, often with a real backpack that was physically roughed up and modified to support the story. Some images may be AI-extended or AI-enhanced, but the emotional grounding matters: this is not generic mascot sludge. It is a carefully authored collaboration between a human imagination, a real dog, photography, and AI.`;
  }

  static scratchy3() {
    return `The flavor reference for Scratchy is something like a lightly played-straight cyberdog backstory with a little Blair Witch energy and real warmth underneath it. There is mystery, danger, pathos, and humor, but the humor should not puncture the emotional truth of it. Scratchy is part of how the whole site signals that this ecosystem is playful, kid-reachable, and alive — not sterile, not corporate, not only for grown developers.`;
  }

  static scratchy4() {
    return `Scratchy is also valuable because he makes visible what Recursi is trying to defend: human-authored, AI-amplified creativity. The Scratchy material is a strong example of something that clearly could not exist in its current form without AI, but equally clearly was not generated by sending an agent off to "make a mascot site." The human vision is obvious, and that distinction matters.`;
  }

  static architecture1() {
    return `One practical strength of Recursi, especially of <strong>Vibes</strong>, is that it works especially well when pages are built out of small composable functions instead of giant blobs of HTML or giant text bodies. Each paragraph, card, heading group, image cluster, or section can be its own function. Higher-level functions then compose them into sections, then into full pages.`;
  }

  static architecture2() {
    return `This matters because LLMs are much better at replacing or reorganizing clean units than at rewriting huge monolithic files without collateral damage. It is one of the reasons Vibes is particularly good at building dynamic pages. It can let the model work on the text of a paragraph, the structure of a section, or the ordering of the page without repeatedly regressing unrelated content.`;
  }

  static architecture3() {
    return `Future chatbot threads working on the front page, the blog post, or related pages should keep this in mind. The point is not merely to generate content. The point is to structure the content in a form that AI can continue to revise cleanly as the project evolves.`;
  }

  static products1() {
    return `<strong>Vibes</strong> and <strong>YOLO</strong> should generally be framed as two sides of one evolving system, not as two isolated products with separate philosophies. Vibes is the structured side: visual, organized, project-focused, static-server-friendly, ideal for composition and incremental refinement. YOLO is the unrestricted side: local, executable, self-modifying, with full filesystem access and live code execution.`;
  }

  static products2() {
    return `Important correction for public copy: do not imply that only Vibes builds itself. The better framing is that Vibes and YOLO increasingly help build and improve each other. Recursi is best understood as one evolving organism or environment, and the public-facing message should reflect that.`;
  }

  static products3() {
    return `<strong>Markdown Notebook</strong> is strategically important because it is a very crisp example of what Recursi is arguing for. It fills in missing functionality in chatbot web interfaces. It turns transient chatbot output into something durable, editable, and owned. It blurs the line between document and application. It works across systems rather than locking itself to one company's official stack. It is a small app, but it makes a strong philosophical point.`;
  }

  static products4() {
    return `<strong>Aardvark</strong> is historically important because the original Aardvark extension was genuinely influential and is still remembered. There is public evidence out there that it helped inspire later tools like Firebug Inspector. That legacy matters because it gives Recursi a handle and a lineage. Aardvark is not just a random new feature name; it is a return, a sequel, and a proof that this builder has been making clever web-augmenting tools for a long time.`;
  }

  static products5() {
    return `The current Aardvark is much broader than the original. It includes a browser extension and a page-based environment, with two-way communication in some cases, YouTube integration, playlist management, piano-roll synchronization, visual overlays, looping, dictation, and other features. Some parts are already real and live. Some parts are beta. Some parts are demo-worthy but not yet public-ready. Public copy should be honest about this: preview, beta, accepting interested users, visible demos — but not vapor.`;
  }

  static piano1() {
    return `The <strong>piano / music system</strong> has years of history behind it. It is not a quick AI flourish. There are hundreds of songs already processed or explored through this system. The synchronized piano-roll concept, the scraping of Synthesia-style timing information, the visual playback, and the whole general idea of tying musical structure to web video have been incubating for a long time.`;
  }

  static piano2() {
    return `This is important background for future copy because the piano system can sound almost too wild if dropped cold into a paragraph. It helps to remember that this is one of the oldest and deepest parts of the project, not a random extra feature. It also helps explain why the current Aardvark can feel like "too much" — it is really absorbing what once could have been its own product.`;
  }

  static piano3() {
    return `There are gray-area copyright and platform questions around some of this material, especially around tutorial-video-derived piano rolls and around YouTube embedding. Public-facing copy should not pick fights about that. It can acknowledge interesting questions in the abstract, but the main point should stay on interface innovation, musical learning, visual tooling, and what this environment lets people do.`;
  }

  static gray1() {
    return `There is relevant background around the recent Anthropic / OpenClaw controversy. Future chatbot threads should know this because it shapes the philosophy and some of the blog-post framing. The project has been thinking hard about the boundary between consumer chatbot interfaces, official APIs, third-party harnesses, browser extensions, human-in-the-loop workflows, and autonomous loops.`;
  }

  static gray2() {
    return `The useful takeaway is <strong>not</strong> "prove that Recursi is definitely compliant." The useful takeaway is that Recursi is exploring an important middle territory: tools that augment real human use of chat systems without simply collapsing into headless agent infrastructure. The point of discussing that publicly is not to bait enforcement. It is to argue that this middle category matters and should be visible as its own thing.`;
  }

  static gray3() {
    return `This also connects to cross-model usefulness. One of the strong intuitive arguments behind Recursi is that useful interaction techniques should not be trapped inside one company's official tool stack. If a web-interface augmentation is good, it should be allowed to help people think and build across systems. If a company says "you can only do this inside our official tooling or through our official API path," that closes off a lot of practical innovation.`;
  }

  static kids1() {
    return `The <strong>kids angle</strong> is not decorative. It is one of the strongest moral and practical arguments in the whole project. Kids are not going to start with API keys, billing dashboards, and developer credentials. They are going to learn through playful systems, visual metaphors, drag-and-drop interfaces, stories, characters, remixing, and tools that let them feel agency quickly.`;
  }

  static kids2() {
    return `That is why Scratchy matters. That is also why the broader middle-ground argument matters. If the industry narrows acceptable AI tooling down to either raw chat or official developer plumbing, then a huge amount of creative learning gets shut out before it starts. The project should keep making this point, gently but firmly.`;
  }

  static kids3() {
    return `It is also okay for public copy to imply that parents may value some of these tools for curation, simplicity, cleaner interfaces, and reduced chaos. That can be especially relevant in the Aardvark / YouTube context.`;
  }

  static launch1() {
    return `Launch strategy may begin with a <strong>blog-post-led soft launch</strong> rather than waiting until every subsystem is polished. The front page, the blog post, and this internal memo can evolve together. Some live apps are already strong enough to show now. Others can be shown through short demo videos and framed as beta or "what's coming."`;
  }

  static launch2() {
    return `Markdown Notebook is a strong first public wedge because it is compact, comprehensible, surprising, and nonthreatening. Scratchy is another strong piece because it carries the kid/creative/local story. Aardvark and the piano system are likely to be more volatile conversation starters: very compelling, but more likely to pull discussions into platform economics, embedding, copyright, or boundary arguments.`;
  }

  static launch3() {
    return `That does not mean those pieces should be hidden. It just means the public framing should lead with invention, usefulness, music, learning, structure, and interface design — not with the most controversial side-effect of how some platform surface happens to work.`;
  }

  static guardrails1() {
    return `Future chatbot threads should use this memo as a place to accumulate things that matter but do not necessarily belong in polished public copy: project history, background facts, tone constraints, angles that were rejected, hidden sensitivities, and context that helps produce better output later.`;
  }

  static guardrails2() {
    return `In particular, put things here if they fall into any of these buckets: useful history of Aardvark, Scratchy tone and ontology constraints, piano-development history, details about how long things took to build, philosophical points about optimized augmentation, boundary issues around AI tooling, launch sequencing ideas, or anything else that future threads will benefit from knowing without needing to dump it into the front page or the main blog post.`;
  }

  static guardrails3() {
    return `This memo should stay alive as a working internal artifact. It does not need to be elegant. It needs to be useful, candid, and specific.`;
  }

  static sections() {
    return [
      {
        id: 'overview',
        title: 'What This Document Is For',
        paragraphs: [{ html: this.overview1() }, { html: this.overview2() }],
      },
      {
        id: 'core',
        title: 'Core Philosophy',
        paragraphs: [
          { html: this.core1(), sidebar: this.sidebarOptimizedAugmentation() },
          { html: this.core2() },
          { html: this.core3() },
        ],
      },
      {
        id: 'public',
        title: 'Public-Facing Tone',
        paragraphs: [
          { html: this.public1() },
          { html: this.public2() },
          { html: this.public3() },
        ],
      },
      {
        id: 'scratchy',
        title: 'Scratchy Guidance',
        paragraphs: [
          { html: this.scratchy1(), sidebar: this.sidebarScratchy() },
          { html: this.scratchy2() },
          { html: this.scratchy3() },
          { html: this.scratchy4() },
        ],
      },
      {
        id: 'architecture',
        title: 'How Recursi Likes to Build',
        paragraphs: [
          {
            html: this.architecture1(),
            sidebar: this.sidebarComposablePages(),
          },
          { html: this.architecture2() },
          { html: this.architecture3() },
        ],
      },
      {
        id: 'products',
        title: 'Product Framing',
        paragraphs: [
          { html: this.products1() },
          { html: this.products2() },
          { html: this.products3() },
          { html: this.products4() },
          { html: this.products5(), sidebar: this.sidebarBetaNotVapor() },
        ],
      },
      {
        id: 'piano',
        title: 'Piano / Music Context',
        paragraphs: [
          { html: this.piano1(), sidebar: this.sidebarLongArc() },
          { html: this.piano2() },
          { html: this.piano3() },
        ],
      },
      {
        id: 'gray',
        title: 'Gray-Area / Boundary Context',
        paragraphs: [
          { html: this.gray1() },
          { html: this.gray2() },
          { html: this.gray3() },
        ],
      },
      {
        id: 'kids',
        title: 'Why Kids Matter Here',
        paragraphs: [
          { html: this.kids1(), sidebar: this.sidebarKids() },
          { html: this.kids2() },
          { html: this.kids3() },
        ],
      },
      {
        id: 'launch',
        title: 'Launch Strategy Notes',
        paragraphs: [
          { html: this.launch1() },
          { html: this.launch2() },
          { html: this.launch3() },
        ],
      },
      {
        id: 'guardrails',
        title: 'What Future Threads Should Put Here',
        paragraphs: [
          { html: this.guardrails1() },
          { html: this.guardrails2() },
          { html: this.guardrails3() },
        ],
      },
    ];
  }

  static sidebarOptimizedAugmentation() {
    return {
      title: 'Key phrase',
      body: `Use <em>optimized augmentation</em> as a recurring concept. It says something more precise and more ambitious than "AI helper" while staying clearly human-centered.`,
    };
  }

  static sidebarScratchy() {
    return {
      title: 'Important guardrail',
      body: `Do not casually puncture Scratchy by explaining him away. Small winks are fine. Explicit "this is fictional" language belongs only where absolutely required, and should not leak into ordinary public-facing copy.`,
    };
  }

  static sidebarComposablePages() {
    return {
      title: 'Structural advantage',
      body: `Vibes works especially well when pages are composed from lots of small functions. That lets the model revise clean units instead of repeatedly damaging unrelated text while trying to improve one paragraph.`,
    };
  }

  static sidebarBetaNotVapor() {
    return {
      title: 'How to frame incompleteness',
      body: `Use language like <em>beta</em>, <em>preview</em>, <em>accepting interested users</em>, or <em>short demo video coming</em>. Avoid overselling unfinished pieces, but do not undersell real work either.`,
    };
  }

  static sidebarLongArc() {
    return {
      title: 'Not a recent AI flourish',
      body: `The piano system has deep roots. Its age and depth help explain both its ambition and why it should be framed as substantial, not as some random flashy add-on.`,
    };
  }

  static sidebarKids() {
    return {
      title: 'One of the strongest arguments',
      body: `Kids and creative learners are not a side note. They are one of the clearest reasons the middle ground between raw chat and full API plumbing needs to exist at all.`,
    };
  }

}

