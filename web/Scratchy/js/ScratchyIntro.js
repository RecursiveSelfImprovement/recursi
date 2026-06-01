
class ScratchyIntro {
  constructor(app) {
    this._app = app;
    this._wiggleTimeout = null;
  }

  createIntroElements() {
    // Return a dummy element since we animate the real DOM now
    return makeElement('div', { style: { display: 'none' } });
  }

  async playIntroAnimation() {
    const app = this._app;

    // 1. Detect Mode
    const isFast = localStorage.getItem('scratchy_intro_done') === 'true';
    const duration = isFast ? 600 : 1500;
    const stagger = isFast ? 100 : 400;

    // 2. Prepare Elements (Start BIG)
    // We apply the transform immediately, before transition property is set
    app.logoImg.style.transition = 'none';
    app.logoImg.style.transform = 'scale(1.2)';
    app.logoImg.style.opacity = '0';

    app.logoSubtitle.style.transition = 'none';
    app.logoSubtitle.style.transform = 'translateY(10px) scale(1.1)';
    app.logoSubtitle.style.opacity = '0';

    app.settingsBtn.style.opacity = '0';

    // Mascot starts large
    app.mascotContainer.style.transition = 'none';
    app.mascotContainer.style.transform = 'scale(1.3) translateX(10px)';
    app.mascotContainer.style.opacity = '0';

    // Force reflow
    void app.logoImg.offsetWidth;

    // 3. Animate (Slide/Shrink to Normal)
    const ease = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

    // Logo In
    app.logoImg.style.transition = `transform ${duration}ms ${ease}, opacity ${duration}ms ease`;
    app.logoImg.style.transform = 'scale(1)';
    app.logoImg.style.opacity = '1';

    // Subtitle + Settings In
    setTimeout(() => {
      app.logoSubtitle.style.transition = `transform ${duration}ms ${ease}, opacity ${duration}ms ease`;
      app.logoSubtitle.style.transform = 'translateY(0) scale(1)';
      app.logoSubtitle.style.opacity = '1';

      app.settingsBtn.style.transition = `opacity ${duration}ms ease`;
      app.settingsBtn.style.opacity = '1';
    }, stagger * 0.5);

    // Mascot In
    setTimeout(() => {
      app.mascotContainer.style.transition = `transform ${duration}ms ${ease}, opacity ${duration}ms ease`;
      app.mascotContainer.style.transform = 'scale(1) translateX(0)';
      app.mascotContainer.style.opacity = '1';
    }, stagger);

    // 4. Cleanup
    const totalTime = duration + stagger + 100;
    setTimeout(() => {
      app.logoImg.style.transition = '';
      app.logoImg.style.transform = '';
      app.logoSubtitle.style.transition = '';
      app.logoSubtitle.style.transform = '';
      app.mascotContainer.style.transition = '';
      app.mascotContainer.style.transform = '';
      app.mascotContainer.style.opacity = '';

      this.startRandomWiggles();
      localStorage.setItem('scratchy_intro_done', 'true');
    }, totalTime);
  }

  wiggleMascot() {
    const app = this._app;
    app.mascotImg.classList.add('wiggle');
    setTimeout(() => app.mascotImg.classList.remove('wiggle'), 800);
  }

  wiggleLogo() {
    const app = this._app;
    app.logoImg.classList.add('wiggle');
    setTimeout(() => app.logoImg.classList.remove('wiggle'), 800);
  }

  startRandomWiggles() {
    const loop = () => {
      if (Math.random() < 0.5) this.wiggleMascot();
      else this.wiggleLogo();
      const delay = 5000 + Math.random() * 10000;
      this._wiggleTimeout = setTimeout(loop, delay);
    };
    this._wiggleTimeout = setTimeout(loop, 5000);
  }
}

