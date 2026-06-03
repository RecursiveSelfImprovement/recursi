class FrontPageContent {
  static heroTaglineLine1() {
    return `<strong>recursi</strong> is a <em>recursive</em>, self-improving environment for building with AI.<br>`;
  }

  static heroTaglineLine2() {
    return `Fast, visual, human-in-the-loop — and the whole thing was built by building itself. <em>Vibes built Vibes.</em>`;
  }

  static heroTagline() {
    return this.heroTaglineLine1() + this.heroTaglineLine2();
  }

  // ─── Manifesto ────────────────────────────────────────────────────────────

  static manifesto1() {
    return `<strong>Vibes</strong> is the heart of recursi — a structured, visual vibe-coding environment where you stay in the conversation while AI does the heavy lifting. It builds dynamic web pages out of small composable functions that can be revised cleanly, surgically, without trashing everything around them. <em>It built itself. That's not a metaphor.</em>`;
  }

  static manifesto2() {
    return `The rest of recursi is the ecosystem that grew around it: a legendary element inspector reborn, a YouTube playlist and music environment unlike anything else, a kid-friendly Scratch coding tool, a notebook for turning chatbot output into something you actually keep. All of it built fast, in the loop, with a human shaping every decision.`;
  }

  static manifesto3() {
    return `This is <strong>optimized augmentation</strong> — not push-a-button automation, not raw API plumbing. You stay close, you stay curious, and the tooling amplifies everything you bring to it. Wide open to kids, artists, tinkerers, and anyone who would never start with a billing dashboard.`;
  }

  static manifesto() {
    return [
      this.manifesto1(),
      this.manifesto2(),
      this.manifesto3(),
    ];
  }

  // ─── SVG placeholder ──────────────────────────────────────────────────────

  static svgPlaceholder(color) {
    return `<svg viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="25" cy="25" r="20" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
  }

  // ─── Projects ─────────────────────────────────────────────────────────────

  static projectVibes() {
    return this.project({
      href: '/vibes/',
      icon: this.svgPlaceholder('#39ff14'),
      image: 'vibes.png',
      imageSide: 'left',
      imageWidthPct: 28,
      imageHoverScale: 1.22,
      imageAlignY: 'center',
      imageObjectPosition: 'center center',
      name: 'Recursive Vibes',
      tag: 'live',
      tagClass: 'tag-live',
      desc: 'The vibe-coding environment at the center of recursi — visual, structured, and extraordinary at building dynamic pages from composable functions. It built itself. Seriously.',
      featured: true,
    });
  }

  projectAardvark() {
      return this.project({
        href: '/AardvarkPlaylist/',
        icon: this.svgPlaceholder('#ff2d95'),
        image: 'aardvarkbig.png',
        imageSide: 'right',
        imageWidthPct: 28,
        imageHoverScale: 1.34,
        imageOverlapPct: 2,
        imageBottomOffsetPct: 0,
        imageAlignY: 'center',
        imageObjectPosition: 'center center',
        name: 'Aardvark Extension <span class="aardvark-playlist-parens">(YouTube Playlist)</span>',
        tag: 'live',
        tagClass: 'tag-live',
        desc: 'A browser extension and YouTube playlist environment - clean playback, curated playlists, a full 3D piano with synchronized piano rolls, SVG tools, dictation, and more. The original Aardvark helped inspire Firebug. This one goes further.',
        featured: true,
        isAardvark: true,
      });
    }

  static projectMarkdownNotebook() {
    return this.project({
      href: '/MarkdownNotebook/',
      icon: this.svgPlaceholder('#3b82f6'),
      image: 'markdownNotebook.png',
      imageSide: 'left',
      imageWidthPct: 28,
      imageHoverScale: 1.22,
      imageAlignY: 'center',
      imageObjectPosition: 'center center',
      name: 'Markdown Notebook',
      tag: 'live',
      tagClass: 'tag-live',
      desc: 'Paste rich text from AI or the web, clean it to Markdown, edit either view, save one HTML file you actually own. Fills in the gap that every chatbot interface leaves wide open.',
      featured: false,
    });
  }

  static projectScratchy() {
    return this.project({
      href: '/Scratchy/',
      icon: this.svgPlaceholder('#ff8c1a'),
      image: 'scratchy.svg',
      imageSide: 'right',
      imageWidthPct: 28,
      imageHoverScale: 1.22,
      imageAlignY: 'center',
      imageObjectPosition: 'center center',
      name: 'Scratchy',
      tag: 'live',
      tagClass: 'tag-live',
      desc: 'A playful local AI coding environment for Scratch — built by a dog, naturally. Drop in a .sb3, describe what you want, and Scratchy applies surgical patches instead of starting over. No accounts, no keys, no cloud.',
      featured: false,
    });
  }

  static projectAardvarkBookmarklet() {
    return this.project({
      href: '/aardvarkBookmarklet/',
      icon: this.svgPlaceholder('#00e5ff'),
      image: 'vark.png',
      imageSide: 'left',
      imageWidthPct: 28,
      imageHoverScale: 1.34,
      imageOverlapPct: 0,
      imageBottomOffsetPct: 0,
      imageAlignY: 'center',
      imageObjectPosition: 'center center',
      name: 'Aardvark Bookmarklet',
      tag: 'live',
      tagClass: 'tag-live',
      desc: 'The legendary element inspector reborn — hover anything, hit R to remove it, W to widen, U to undo. One bookmarklet, any page, no extension required.',
      featured: false,
    });
  }

  static projects() {
      return [
        this.projectVibes(),
        this.projectAardvark(),
        this.projectLegoDetective(),
        this.projectGuessTheNote(),
        this.projectAccuCAD(),
        this.projectMarkdownNotebook(),
        this.projectScratchy(),
        this.projectAardvarkBookmarklet(),
      ];
    }

  // ─── Merch ────────────────────────────────────────────────────────────────

  static merchTshirt() {
    return {
      file: 'tshirt',
      thumb: 'tshirt-t.jpg',
      full: 'tshirt.jpg',
      name: 'Logo Tee',
      price: '$34.99',
      desc: 'Our model is wearing it. Your model could never. Soft-touch cotton with the recursi sigil front and center.',
    };
  }

  static merchKeychain() {
    return {
      file: 'keychain',
      thumb: 'keychain-t.png',
      full: 'keychain.png',
      name: 'Keychain',
      price: '$12.99',
      desc: 'An AI designed this keychain. Then it revised the keychain. Then it revised the revision. We eventually had to stop it. You\'re holding the final commit.',
    };
  }

  static merchSignCafe() {
    return {
      file: 'signCafe',
      thumb: 'signCafe-t.png',
      full: 'signCafe.png',
      name: 'Café Sign',
      price: '$249.99',
      desc: "Nothing says 'I run a totally normal café' like a glowing recursi logo in the window.",
    };
  }

  static merchOffice() {
    return {
      file: 'office',
      thumb: 'office.png',
      full: 'office.png',
      name: 'Wall Sign',
      price: '$9,999.99',
      desc: "It's big and expensive but super glowy and cool.",
    };
  }

  static merchSignOnTable() {
    return {
      file: 'signOnTable',
      thumb: 'signOnTable-t.jpg',
      full: 'signOnTable.jpg',
      name: 'Desktop Sign',
      price: '$89.99',
      desc: 'A tasteful desktop neon sign for your workbench, streaming setup, or wherever you make offerings to the demo gods.',
    };
  }

  static merchCar() {
    return {
      file: 'car',
      thumb: 'car-t.png',
      full: 'car.png',
      name: 'The Recursi GT',
      price: '$84,900',
      desc: "Yes, it's a BMW with our logo on it. Yes, we're listing it as merch. 0–60 in 3.5 seconds.",
    };
  }

  static merch() {
    return [
      this.merchTshirt(),
      this.merchKeychain(),
      this.merchSignCafe(),
      this.merchOffice(),
      this.merchSignOnTable(),
      this.merchCar(),
    ];
  }

  // ─── Lightbox sold-out text ────────────────────────────────────────────────

  static soldOutText() {
    return 'Physically nonexistent · AI-verified unavailable';
  }

  // ─── Merch disclaimer ─────────────────────────────────────────────────────

  static merchDisclaimerText() {
    return '[ These items were designed by an AI and do not exist. We think that\'s sort of the point. ]';
  }

  // ─── Footer ───────────────────────────────────────────────────────────────

  static footerCopyright() {
    return '&copy; 2026 Rob Brown &amp; Scratchy the Cyber Dog. All recursions reserved.';
  }

  // ─── Scratchy tagline (used in Scratchy card / elsewhere) ─────────────────

  static scratchyTagline() {
    return 'A playful local environment for Scratch — built by a dog.';
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  static project(data) {
    const comingSoon = !!data.comingSoon;
    return {
      featured: false,
      comingSoon,
      tag: comingSoon ? 'coming soon' : 'live',
      tagClass: comingSoon ? 'tag-soon' : 'tag-live',
      image: 'scratchy.svg',
      imageSide: 'left',
      imageWidthPct: 28,
      imageHoverScale: 1.33,
      imageOverlapPct: 0,
      imageBottomOffsetPct: 0,
      imageAlignY: 'center',
      imageObjectPosition: 'center center',
      imageBackdrop: false,
      ...data,
    };
  }

  static projectAardvark() {
      return this.project({
        href: '/AardvarkPlaylist/',
        icon: this.svgPlaceholder('#ff2d95'),
        image: 'aardvarkbig.png',
        imageSide: 'right',
        imageWidthPct: 28,
        imageHoverScale: 1.34,
        imageOverlapPct: 2,
        imageBottomOffsetPct: 0,
        imageAlignY: 'center',
        imageObjectPosition: 'center center',
        name: 'Aardvark Extension <span class="aardvark-playlist-parens">(YouTube Playlist)</span>',
        tag: 'live',
        tagClass: 'tag-live',
        desc: 'A browser extension and YouTube playlist environment - clean playback, curated playlists, a full 3D piano with synchronized piano rolls, SVG tools, dictation, and more. The original Aardvark helped inspire Firebug. This one goes further.',
        featured: true,
        isAardvark: true,
      });
    }

  static projectLegoDetective() {
      return this.project({
        href: '/LegoDetective/',
        icon: this.svgPlaceholder('#ffea00'),
        image: 'legoDetective.png',
        imageSide: 'left',
        imageWidthPct: 28,
        imageHoverScale: 1.25,
        name: 'Lego Detective',
        tag: 'live',
        tagClass: 'tag-live',
        desc: 'Spot the differences between twin 3D Lego structures in a playful, Where\'s Waldo style game. Designed to build 3D spatial awareness, featuring voxel explosion effects when you successfully identify anomalies.',
        featured: false,
      });
    }

  static projectGuessTheNote() {
      return this.project({
        href: '/GuessTheNote/',
        icon: this.svgPlaceholder('#b84dff'),
        image: 'guessTheNote.png',
        imageSide: 'right',
        imageWidthPct: 28,
        imageHoverScale: 1.25,
        name: 'Guess the Note',
        tag: 'live',
        tagClass: 'tag-live',
        desc: 'Playful musical interval ear training. Listen to a three-note sequence, see the first two highlighted on an interactive on-screen piano roll, and guess the third note to build your play-by-ear intuition.',
        featured: false,
      });
    }

  static projectAccuCAD() {
      return this.project({
        href: '/AccuCAD/',
        icon: this.svgPlaceholder('#00e5ff'),
        image: 'accuCad.png',
        imageSide: 'left',
        imageWidthPct: 28,
        imageHoverScale: 1.25,
        name: 'AccuCAD',
        tag: 'beta preview',
        tagClass: 'tag-demo',
        desc: 'A sophisticated web-based CAD system reviving the historic drafting paradigm of AccuDraw. Brings construction reference vectors, lockable constraint sweeps, and high-precision coordinate alignment to the browser.',
        featured: false,
      });
    }
}