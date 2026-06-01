class FrontPageContent {
  static heroTaglineLine1() {
    return `<strong>recursi</strong> is a <em>highly optimized</em>, recursively self-improving environment for building with AI.<br>`;
  }

  static heroTaglineLine2() {
    return `Built for web apps, dynamic tools, and fast human-in-the-loop collaboration. <em>It gets better by building better versions of itself.</em>`;
  }

  static heroTagline() {
    return this.heroTaglineLine1() + this.heroTaglineLine2();
  }

  static manifesto1() {
    return `Two tools, one evolving system: <strong>you stay in the conversation</strong>. The AI does the heavy lifting, but you stay close to the structure, shape the big picture, and keep your hands on the wheel. This is optimized augmentation, not push-a-button automation.`;
  }

  static manifesto2() {
    return `<strong>Vibes</strong> is the structured side — visual, project-focused, and especially good at building dynamic web pages out of small composable functions that AI can revise surgically without trashing everything around them.`;
  }

  static manifesto3() {
    return `<strong>YOLO</strong> is the unrestricted side — full filesystem access, live code execution, self-modification, running locally because it has to. It is powerful on its own, but the real story is that Vibes and YOLO increasingly help build and improve each other.`;
  }

  static manifesto4() {
    return `The result is fast, unusually efficient, sometimes weird, and open to people who would never start with an API key and a billing dashboard. Kids, artists, tinkerers, non-coders, serious builders — all welcome.`;
  }

  static manifesto() {
    return [
      this.manifesto1(),
      this.manifesto2(),
      this.manifesto3(),
      this.manifesto4(),
    ];
  }

  static svgPlaceholder(color) {
    return `<svg viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="25" cy="25" r="20" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
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
      desc: 'A notebook that fills in missing pieces of today’s chatbot web interfaces — paste rich text from AI or the web, clean it to Markdown, edit either view, and save a single HTML file you still own.',
      featured: true,
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
      desc: 'A playful local coding environment for Scratch. Drop in a .sb3, describe what you want, and Scratchy applies surgical patches instead of starting over. No accounts, no API keys, no cloud.',
      featured: true,
    });
  }

  static projectAardvarkBookmarklet() {
    return this.project({
      href: 'http://localhost:7001/aardvarkBookmarklet/',
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
      desc: 'The legendary element inspector reborn — hover over anything, hit R to remove it, W to go wider, U to undo. One bookmarklet, works on any page, no extension needed.',
      featured: true,
    });
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
      name: 'Aardvark',
      tag: 'beta preview',
      tagClass: 'tag-demo',
      desc: 'A browser extension that turns YouTube into a personal music-and-learning environment — clean playback, parent-friendly playlists, a full 3D piano with synchronized piano rolls, SVG tools, dictation, and more.',
      featured: false,
    });
  }

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
      name: 'Vibes',
      desc: 'The structured side of Recursi — visual, project-focused, and excellent at building dynamic pages from composable functions that can be revised cleanly instead of rewritten as one giant blob.',
      featured: false,
    });
  }

  static projectYolo() {
    return this.project({
      href: '/yolo/',
      icon: this.svgPlaceholder('#ff6a00'),
      image: 'yolo.png',
      imageSide: 'right',
      imageWidthPct: 28,
      imageHoverScale: 1.3,
      imageOverlapPct: 0,
      imageBottomOffsetPct: 0,
      imageAlignY: 'center',
      imageObjectPosition: 'center center',
      name: 'YOLO',
      desc: 'The unrestricted side — full filesystem access, live code execution, self-modification, and deep local control. Not the opposite of Vibes so much as its wilder counterpart in the same evolving system.',
      featured: false,
    });
  }

  static projects() {
    return [
      this.projectMarkdownNotebook(),
      this.projectScratchy(),
      this.projectAardvarkBookmarklet(),
      this.projectAardvark(),
      this.projectVibes(),
      this.projectYolo(),
    ];
  }

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
      desc: 'Clip the recursi logo to your keys so you can think about recursion every time you lock your front door.',
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
      desc: 'A tasteful desktop-sized neon sign for your workbench, streaming setup, or the altar where you pray to the demo gods.',
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

}

