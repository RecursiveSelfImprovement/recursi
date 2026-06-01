
class Hatchy {
  constructor() {
    this._ensureStyles();
    this.easterEggFound = false;
    this.peekTimeout = null;
  }

  async spawn(options = {}) {
    // Determine starting coordinates
    const startX = options.dropFrom
      ? options.dropFrom.x
      : window.innerWidth / 2;
    const startY = options.dropFrom ? options.dropFrom.y : 100;

    const eggW = 75;
    const eggH = 95;

    // Create a fixed full-screen container for the scene
    const scene = makeElement('div', {
      className: 'hatchy-scene',
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: '99999',
      },
    });
    document.body.appendChild(scene);

    // Group that will fall to the floor
    const actorGroup = makeElement('div', {
      className: 'hatchy-actor-group',
      style: {
        position: 'absolute',
        left: `${startX - eggW / 2}px`,
        top: `${startY - eggH / 2}px`,
        width: `${eggW}px`,
        height: `${eggH}px`,
        transformOrigin: 'center bottom',
      },
    });
    scene.appendChild(actorGroup);

    // Beautiful SVG Chick Construction
    const chickSvg = makeElement(
      'svg:svg',
      {
        class: 'chick-svg',
        viewBox: '0 0 100 100',
        style: {
          width: '95px',
          height: '95px',
          transformOrigin: 'center bottom',
        },
      },
      [
        makeElement('svg:defs', {}, [
          makeElement(
            'svg:radialGradient',
            { id: 'bodyGrad', cx: '35%', cy: '35%', r: '65%' },
            [
              makeElement('svg:stop', {
                offset: '0%',
                'stop-color': '#FFF07C',
              }),
              makeElement('svg:stop', {
                offset: '80%',
                'stop-color': '#FFD13B',
              }),
              makeElement('svg:stop', {
                offset: '100%',
                'stop-color': '#FFB703',
              }),
            ]
          ),
          makeElement(
            'svg:linearGradient',
            { id: 'wingGrad', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
            [
              makeElement('svg:stop', {
                offset: '0%',
                'stop-color': '#FFD13B',
              }),
              makeElement('svg:stop', {
                offset: '100%',
                'stop-color': '#FF9E00',
              }),
            ]
          ),
          makeElement(
            'svg:linearGradient',
            { id: 'beakGrad', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
            [
              makeElement('svg:stop', {
                offset: '0%',
                'stop-color': '#FF9F1C',
              }),
              makeElement('svg:stop', {
                offset: '100%',
                'stop-color': '#E85D04',
              }),
            ]
          ),
        ]),
        // Left Leg
        makeElement(
          'svg:g',
          { class: 'chick-leg left-leg', 'transform-origin': '40 75' },
          [
            makeElement('svg:path', {
              d: 'M 40 70 L 40 90 L 30 90 M 40 90 L 48 90',
              stroke: '#FB8500',
              'stroke-width': '4',
              fill: 'none',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
            }),
          ]
        ),
        // Right Leg
        makeElement(
          'svg:g',
          { class: 'chick-leg right-leg', 'transform-origin': '55 75' },
          [
            makeElement('svg:path', {
              d: 'M 55 70 L 55 90 L 45 90 M 55 90 L 63 90',
              stroke: '#FB8500',
              'stroke-width': '4',
              fill: 'none',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
            }),
          ]
        ),
        // Body Group
        makeElement('svg:g', { class: 'chick-body-group' }, [
          // Tail
          makeElement('svg:path', {
            d: 'M 25 65 Q 10 55 25 45 Z',
            fill: '#FFB703',
          }),
          // Main Body
          makeElement('svg:ellipse', {
            cx: '48',
            cy: '60',
            rx: '28',
            ry: '26',
            fill: 'url(#bodyGrad)',
          }),
          // Soft Belly Highlight
          makeElement('svg:ellipse', {
            cx: '54',
            cy: '64',
            rx: '18',
            ry: '16',
            fill: '#FFF8B0',
            opacity: '0.8',
          }),
          // Head
          makeElement('svg:circle', {
            cx: '62',
            cy: '38',
            r: '24',
            fill: 'url(#bodyGrad)',
          }),
          // Cheek blush
          makeElement('svg:circle', {
            cx: '72',
            cy: '48',
            r: '5',
            fill: '#FF5400',
            opacity: '0.3',
          }),
          // Beak
          makeElement('svg:path', {
            d: 'M 82 38 Q 94 38 90 44 Q 82 46 82 38 Z',
            fill: 'url(#beakGrad)',
          }),
          makeElement('svg:path', {
            d: 'M 83 43 Q 90 48 88 44 Z',
            fill: '#DC2F02',
          }),
          // Eye (Cute Anime Style)
          makeElement('svg:g', { class: 'chick-eye' }, [
            makeElement('svg:circle', {
              cx: '72',
              cy: '34',
              r: '5',
              fill: '#023047',
            }),
            makeElement('svg:circle', {
              cx: '73.5',
              cy: '32.5',
              r: '1.5',
              fill: '#FFFFFF',
            }),
            makeElement('svg:circle', {
              cx: '70',
              cy: '35.5',
              r: '0.8',
              fill: '#FFFFFF',
            }),
          ]),
          // Wing
          makeElement(
            'svg:g',
            { class: 'chick-wing', 'transform-origin': '48 55' },
            [
              makeElement('svg:path', {
                d: 'M 48 50 C 35 50, 28 60, 36 70 C 46 76, 58 65, 48 50 Z',
                fill: 'url(#wingGrad)',
              }),
              makeElement('svg:path', {
                d: 'M 46 54 C 38 56, 32 63, 38 68 C 44 72, 52 64, 46 54 Z',
                fill: '#FFB703',
                opacity: '0.5',
              }),
            ]
          ),
          // Head Tuft
          makeElement('svg:path', {
            d: 'M 55 15 Q 50 2 60 5 Q 68 -2 65 15 Z',
            fill: '#FFD13B',
          }),
        ]),
      ]
    );

    const chick = makeElement('div', {
      className: 'hatchy-chick-container',
      style: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 2, // Behind top egg initially, behind bottom egg shell visually
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        opacity: '0', // Completely invisible until hatch
        transform: 'translateY(15px) scale(0.6)', // Squished deep inside
      },
    });
    chick.appendChild(chickSvg);

    const eggBottom = makeElement('img', {
      src: 'https://recursi.dev/SiteResources/scratchy/eggbottom.png',
      style: { position: 'absolute', width: '100%', height: '100%', zIndex: 3 },
    });

    const eggTop = makeElement('img', {
      src: 'https://recursi.dev/SiteResources/scratchy/eggtop.png',
      style: { position: 'absolute', width: '100%', height: '100%', zIndex: 4 },
    });

    actorGroup.appendChild(chick);
    actorGroup.appendChild(eggBottom);
    actorGroup.appendChild(eggTop);

    // Animation helper
    const playAnim = (el, frames, opts) =>
      new Promise((resolve) => {
        const a = el.animate(frames, opts);
        a.onfinish = resolve;
        a.oncancel = resolve;
      });

    // Snappy flip helper (Squash & stretch mid-air turn)
    const snappyFlip = async (el, currentScaleX, targetScaleX) => {
      await playAnim(
        el,
        [
          { transform: `scaleX(${currentScaleX}) scaleY(1) translateY(0)` },
          {
            transform: `scaleX(${currentScaleX}) scaleY(0.8) translateY(4px)`,
            offset: 0.2,
          }, // Anticipation squish
          { transform: `scaleX(0) scaleY(1.3) translateY(-12px)`, offset: 0.5 }, // Mid-air spin/stretch
          {
            transform: `scaleX(${targetScaleX}) scaleY(0.85) translateY(2px)`,
            offset: 0.8,
          }, // Land squish
          { transform: `scaleX(${targetScaleX}) scaleY(1) translateY(0)` }, // Settle
        ],
        { duration: 350, easing: 'ease-in-out', fill: 'forwards' }
      );
    };

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const floorY = window.innerHeight - 80;
    const currentBottomY = startY + eggH / 2;
    const fallDistance = Math.max(0, floorY - currentBottomY);

    // --- PHASE 1: FALL & BOUNCE ---
    await playAnim(
      actorGroup,
      [
        { transform: 'translateY(0px)' },
        { transform: `translateY(${fallDistance}px)` },
      ],
      { duration: 600, easing: 'ease-in', fill: 'forwards' }
    );

    await playAnim(
      actorGroup,
      [
        { transform: `translateY(${fallDistance}px) scale(1, 1)` },
        {
          transform: `translateY(${fallDistance}px) scale(1.2, 0.8)`,
          offset: 0.3,
        },
        {
          transform: `translateY(${fallDistance}px) scale(0.9, 1.1)`,
          offset: 0.6,
        },
        { transform: `translateY(${fallDistance}px) scale(1, 1)` },
      ],
      { duration: 350, easing: 'ease-out', fill: 'forwards' }
    );

    // --- PHASE 2: SHAKE ---
    await wait(800);
    await playAnim(
      actorGroup,
      [
        { transform: `translateY(${fallDistance}px) rotate(0deg)` },
        {
          transform: `translateY(${fallDistance}px) rotate(15deg)`,
          offset: 0.25,
        },
        {
          transform: `translateY(${fallDistance}px) rotate(-15deg)`,
          offset: 0.75,
        },
        { transform: `translateY(${fallDistance}px) rotate(0deg)` },
      ],
      { duration: 250, iterations: 3, fill: 'forwards' }
    );

    // --- PHASE 3: CRACK (Top Egg flies off, Chick pops up) ---
    await wait(300);
    playAnim(
      eggTop,
      [
        { transform: 'translate(0px, 0px) rotate(0deg)' },
        { transform: 'translate(40px, -70px) rotate(45deg)', offset: 0.4 },
        { transform: 'translate(90px, 80px) rotate(110deg)' },
      ],
      {
        duration: 700,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards',
      }
    );

    playAnim(
      actorGroup,
      [
        { transform: `translateY(${fallDistance}px) scale(1)` },
        {
          transform: `translateY(${fallDistance}px) scale(1.05, 0.95)`,
          offset: 0.3,
        },
        { transform: `translateY(${fallDistance}px) scale(1)` },
      ],
      { duration: 300 }
    );

    // Chick pops out from hiding
    await playAnim(
      chick,
      [
        { transform: 'translateY(15px) scale(0.6)', opacity: '0' },
        { transform: 'translateY(-10px) scale(1)', opacity: '1', offset: 0.6 },
        { transform: 'translateY(-5px) scale(1)', opacity: '1' },
      ],
      { duration: 400, easing: 'ease-out', fill: 'forwards' }
    );

    // --- PHASE 4: PEEK & LOOK AROUND ---
    await wait(400);
    // Look Left (Snappy pseudo-3D turn)
    await snappyFlip(chickSvg, 1, -1);
    await wait(600);
    // Look Right
    await snappyFlip(chickSvg, -1, 1);
    await wait(400);

    // --- PHASE 5: HOP OUT ---
    chick.style.zIndex = '5'; // Bring chick to front so it lands in front of the shell
    chick.classList.add('is-hopping');
    await playAnim(
      chick,
      [
        { transform: 'translate(0px, -5px)' },
        { transform: 'translate(55px, -80px)', offset: 0.5 },
        { transform: 'translate(110px, 15px)' }, // Lands on the ground to the right
      ],
      {
        duration: 600,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards',
      }
    );
    chick.classList.remove('is-hopping');

    // Landing squish
    await playAnim(
      chickSvg,
      [
        { transform: 'scaleX(1) scaleY(1) translateY(0)' },
        { transform: 'scaleX(1) scaleY(0.75) translateY(5px)', offset: 0.5 },
        { transform: 'scaleX(1) scaleY(1) translateY(0)' },
      ],
      { duration: 250, fill: 'forwards' }
    );

    // --- PHASE 6: WALK, STOP, AND LOOK AROUND ---
    await wait(500);
    chick.classList.add('is-walking');
    await playAnim(
      chick,
      [
        { transform: 'translate(110px, 15px)' },
        { transform: 'translate(220px, 15px)' },
      ],
      { duration: 1000, fill: 'forwards' }
    );
    chick.classList.remove('is-walking');

    await wait(400);
    // Look back at the broken egg
    await snappyFlip(chickSvg, 1, -1);
    await wait(800);
    // Look forward again
    await snappyFlip(chickSvg, -1, 1);
    await wait(400);

    // --- PHASE 7: WALK OFF SCREEN ---
    chick.classList.add('is-walking');
    const screenWidth = window.innerWidth;
    const startGlobalX = startX - eggW / 2;
    const distanceLeftToWalk = screenWidth - startGlobalX + 200;

    let targetTx = 220 + distanceLeftToWalk;
    if (options.pop) {
      // Walk until nearly off screen
      targetTx = Math.max(220 + 50, screenWidth - startGlobalX - 100);
    }

    const walkDuration = (Math.abs(targetTx - 220) / 100) * 1000;

    await playAnim(
      chick,
      [
        { transform: `translate(220px, 15px)` },
        { transform: `translate(${targetTx}px, 15px)` },
      ],
      { duration: walkDuration, fill: 'forwards' }
    );

    chick.classList.remove('is-walking');

    if (options.pop) {
      // Twitch
      const twitchDuration = 600;
      await playAnim(
        chick,
        [
          { transform: `translate(${targetTx}px, 15px) rotate(0deg)` },
          { transform: `translate(${targetTx - 5}px, 15px) rotate(-15deg)` },
          { transform: `translate(${targetTx + 5}px, 15px) rotate(15deg)` },
          { transform: `translate(${targetTx}px, 15px) rotate(0deg)` },
          { transform: `translate(${targetTx - 5}px, 15px) rotate(-15deg)` },
          { transform: `translate(${targetTx + 5}px, 15px) rotate(15deg)` },
          { transform: `translate(${targetTx}px, 15px) rotate(0deg)` },
          { transform: `translate(${targetTx - 5}px, 15px) rotate(-20deg)` },
          { transform: `translate(${targetTx + 5}px, 15px) rotate(20deg)` },
          { transform: `translate(${targetTx}px, 15px) rotate(0deg)` },
        ],
        { duration: twitchDuration, fill: 'forwards' }
      );

      // Play pop sound
      const audio = new Audio('https://recursi.dev/SiteResources/scratchy/pop.wav');
      audio.play().catch((e) => console.log('Audio play failed', e));

      // Explode
      this._explodeChick(chick, chickSvg, scene);
      chick.style.opacity = '0';

      await wait(3500); // give time for physics and smoke to fade out
    }

    // Cleanup
    await playAnim(scene, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 500,
      fill: 'forwards',
    });
    scene.remove();
  }

  _ensureStyles() {
    applyCss(
      `
    .rocky-egg {
      position: fixed;
      width: 50px;
      height: 80px;
      z-index: 9999;
      cursor: pointer;
      transition: top 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28), left 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28), transform 0.2s ease;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
    }
    .rocky-egg:hover {
        transform: scale(1.1);
    }

    @keyframes hatchy-walk-leg-l {
      0% { transform: rotate(0deg); }
      25% { transform: rotate(35deg); }
      50% { transform: rotate(0deg); }
      75% { transform: rotate(-25deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes hatchy-walk-leg-r {
      0% { transform: rotate(0deg); }
      25% { transform: rotate(-25deg); }
      50% { transform: rotate(0deg); }
      75% { transform: rotate(35deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes hatchy-body-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    @keyframes hatchy-wing-flap {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-30deg); }
    }
    @keyframes hatchy-blink {
      0%, 96%, 100% { transform: scaleY(1); }
      98% { transform: scaleY(0.1); }
    }

    .hatchy-chick-container.is-walking .left-leg { 
      animation: hatchy-walk-leg-l 0.25s infinite; 
    }
    .hatchy-chick-container.is-walking .right-leg { 
      animation: hatchy-walk-leg-r 0.25s infinite; 
    }
    .hatchy-chick-container.is-walking .chick-body-group { 
      animation: hatchy-body-bob 0.25s infinite; 
    }
    .hatchy-chick-container.is-walking .chick-wing { 
      animation: hatchy-wing-flap 0.25s infinite; 
    }
    
    .hatchy-chick-container.is-hopping .chick-wing { 
      animation: hatchy-wing-flap 0.15s infinite; 
    }

    .chick-eye {
      transform-origin: 72px 34px;
      animation: hatchy-blink 4s infinite;
    }
    `,
      'hatchy-hatch-controller-styles'
    );
  }

  _explodeChick(chickWrapper, originalSvg, sceneContainer) {
    const EXPLOSION_SETTINGS = {
      minForce: 12,
      maxForce: 35,
      gravity: 0.9,
      minRotSpeed: -20,
      maxRotSpeed: 20,
      smokeCountMin: 6,
      smokeCountMax: 10,
      smokeMinSize: 20,
      smokeMaxSize: 45,
      smokeDriftX: 1,
      smokeDriftY: -1.5,
      smokeDecay: 0.015,
    };

    const rect = originalSvg.getBoundingClientRect();

    // Hide original visual
    originalSvg.style.visibility = 'hidden';

    // Collect all renderable elements directly to explode independently
    const parts = [];
    const collectParts = (parent) => {
      Array.from(parent.children).forEach((child) => {
        if (child.tagName.toLowerCase() === 'defs') return;
        // Retain logical groupings so things like eyes or wings stay as single pieces
        if (
          child.tagName.toLowerCase() === 'g' &&
          !child.classList.contains('chick-eye') &&
          !child.classList.contains('chick-wing') &&
          !child.classList.contains('chick-leg')
        ) {
          collectParts(child);
        } else {
          parts.push(child);
        }
      });
    };
    collectParts(originalSvg);

    const particles = [];
    const defs = originalSvg.querySelector('defs');

    parts.forEach((part) => {
      const svgClone = makeElement('svg:svg', {
        viewBox: '0 0 100 100',
        style: {
          position: 'absolute',
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 99999,
        },
      });

      if (defs) {
        svgClone.appendChild(defs.cloneNode(true));
      }

      const partClone = part.cloneNode(true);
      svgClone.appendChild(partClone);
      sceneContainer.appendChild(svgClone);

      // Calculate a pop angle that flings outward from center of chick
      const partBBox = part.getBoundingClientRect();
      const partCx = partBBox.left + partBBox.width / 2;
      const partCy = partBBox.top + partBBox.height / 2;
      const centerCx = rect.left + rect.width / 2;
      const centerCy = rect.top + rect.height / 2;

      let popAngle = Math.atan2(partCy - centerCy, partCx - centerCx);
      // Add a strong upward bias so pieces jump into air before falling
      popAngle -= 0.5 + Math.random() * 0.5;

      const force =
        EXPLOSION_SETTINGS.minForce +
        Math.random() *
          (EXPLOSION_SETTINGS.maxForce - EXPLOSION_SETTINGS.minForce);

      particles.push({
        el: svgClone,
        x: rect.left,
        y: rect.top,
        vx: Math.cos(popAngle) * force + (Math.random() - 0.5) * 5,
        vy: Math.sin(popAngle) * force - 5,
        rot: 0,
        vRot:
          EXPLOSION_SETTINGS.minRotSpeed +
          Math.random() *
            (EXPLOSION_SETTINGS.maxRotSpeed - EXPLOSION_SETTINGS.minRotSpeed),
        gravity: EXPLOSION_SETTINGS.gravity,
      });
    });

    // Spawn Smoke Puffs
    const smokeParticles = [];
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const smokeContainer = makeElement('svg:svg', {
      style: {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 99998,
      },
    });
    sceneContainer.appendChild(smokeContainer);

    const smokeCount =
      EXPLOSION_SETTINGS.smokeCountMin +
      Math.floor(
        Math.random() *
          (EXPLOSION_SETTINGS.smokeCountMax - EXPLOSION_SETTINGS.smokeCountMin)
      );
    for (let i = 0; i < smokeCount; i++) {
      const size =
        EXPLOSION_SETTINGS.smokeMinSize +
        Math.random() *
          (EXPLOSION_SETTINGS.smokeMaxSize - EXPLOSION_SETTINGS.smokeMinSize);
      const shade = Math.floor(120 + Math.random() * 80); // Nuanced gray range
      const color = `rgb(${shade},${shade},${shade})`;

      const el = makeElement('svg:circle', {
        cx: cx,
        cy: cy,
        r: size,
        fill: color,
        style: {
          opacity: 0.85,
          filter: 'blur(10px)',
        },
      });
      smokeContainer.appendChild(el);

      smokeParticles.push({
        el: el,
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * EXPLOSION_SETTINGS.smokeDriftX * 6,
        vy: EXPLOSION_SETTINGS.smokeDriftY - Math.random() * 3,
        life: 1.0,
        decay: EXPLOSION_SETTINGS.smokeDecay + Math.random() * 0.01,
        size: size,
      });
    }

    // Custom Physics Loop
    const loop = () => {
      let active = false;

      particles.forEach((p) => {
        if (p.y < window.innerHeight + 200) {
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vRot;

          p.el.style.transform = `translate(${p.x - rect.left}px, ${
            p.y - rect.top
          }px) rotate(${p.rot}deg)`;
          active = true;
        }
      });

      for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        p.el.setAttribute('cx', p.x);
        p.el.setAttribute('cy', p.y);

        p.size += 0.6; // Puffs slowly expand out
        p.el.setAttribute('r', p.size);

        p.el.style.opacity = Math.max(0, p.life * 0.85);

        if (p.life <= 0) {
          p.el.remove();
          smokeParticles.splice(i, 1);
        } else {
          active = true;
        }
      }

      if (active) {
        requestAnimationFrame(loop);
      } else {
        smokeContainer.remove();
        particles.forEach((p) => p.el.remove());
      }
    };
    requestAnimationFrame(loop);
  }

  startEasterEgg() {
    if (this.easterEggFound) return;
    if (document.querySelector('.rocky-egg')) return;

    const egg = makeElement('img', {
      src: 'https://recursi.dev/SiteResources/scratchy/egg.png',
      className: 'rocky-egg',
      style: {
        left: '-71px',
        top: '50%',
        width: '61px',
        height: '80px',
      },
      onclick: (e) => {
        e.stopPropagation();
        this.handleEggClick(egg);
      },
    });

    document.body.appendChild(egg);

    egg.addEventListener('mouseenter', () => {
      if (Math.random() < 0.4) {
        const h = window.innerHeight;
        const newY = Math.random() * (h - 100);
        egg.style.top = `${newY}px`;
      }
    });

    const peekLoop = () => {
      if (this.easterEggFound) return;

      const nextPeek = 5000 + Math.random() * 10000;

      this.peekTimeout = setTimeout(() => {
        if (this.easterEggFound) return;
        if (!document.body.contains(egg)) return;

        const side = Math.random() > 0.5 ? 'right' : 'left';
        const height = window.innerHeight;
        const topPos = 50 + Math.random() * (height - 200);

        egg.style.transition = 'none';
        egg.style.top = `${topPos}px`;

        if (side === 'left') {
          egg.style.left = '-71px';
          egg.style.right = 'auto';
          egg.style.transform = 'rotate(15deg)';
        } else {
          egg.style.left = 'auto';
          egg.style.right = '-71px';
          egg.style.transform = 'rotate(-15deg)';
        }

        void egg.offsetWidth;

        egg.style.transition = 'all 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        if (side === 'left') {
          egg.style.left = '-10px';
        } else {
          egg.style.right = '-10px';
        }

        setTimeout(() => {
          if (!document.body.contains(egg)) return;
          if (side === 'left') {
            egg.style.left = '-71px';
          } else {
            egg.style.right = '-71px';
          }
          peekLoop();
        }, 2000 + Math.random() * 2000);
      }, nextPeek);
    };

    peekLoop();
  }

  handleEggClick(egg) {
      if (this.easterEggFound) return;

      console.log('[Hatchy] Easter Egg clicked!');
      const eggRect = egg.getBoundingClientRect();

      const content = makeElement('div', {
        innerHTML: [
          '<div style="text-align: center; padding: 10px; position: relative;">',
          '  <img id="dialog-egg-img" src="https://recursi.dev/SiteResources/scratchy/egg.png" style="height: 60px; margin-bottom: 10px;">',
          '  <p style="font-size: 1.1em; margin-bottom: 10px;">It\'s just a literal Easter egg.</p>',
          '  <p style="font-size: 0.9em; color: #999;">Sorry if you were expecting more.</p>',
          '  <div style="position: absolute; bottom: -5px; left: -5px; display: flex; align-items: center; gap: 5px;">',
          '    <select id="hatchy-pop-select" style="font-size: 0.75em; padding: 2px 4px; background: rgba(0,0,0,0.5); color: #ccc; border: 1px solid #555; border-radius: 4px; outline: none; cursor: pointer;">',
          '      <option value="popless" selected>happy</option>',
          '      <option value="pop!">sad</option>',
          '    </select>',
          '  </div>',
          '</div>'
        ].join('\\n')
      });

      const box = UITools.makeDialog({
        env: window.projectApp?.env || null,
        title: 'Easter Egg Found!',
        size: [300, 260],
        contentElement: content,
        buttons: [
          {
            label: 'Oh, okay',
            onClick: (btn, dialogInstance) => {
              this.easterEggFound = true;
              if (this.peekTimeout) clearTimeout(this.peekTimeout);

              console.log('[Hatchy] "Oh, okay" button clicked.');

              let dropFrom = null;
              let popAction = false;

              if (dialogInstance && dialogInstance.contentElement) {
                const selectEl = dialogInstance.contentElement.querySelector('#hatchy-pop-select');
                if (selectEl && selectEl.value === 'pop!') {
                  popAction = true;
                }

                const img = dialogInstance.contentElement.querySelector('#dialog-egg-img');
                if (img) {
                  const rect = img.getBoundingClientRect();
                  dropFrom = { x: rect.left + rect.width / 2, y: rect.top };
                } else {
                  const rect = dialogInstance.contentElement.getBoundingClientRect();
                  dropFrom = { x: rect.left + rect.width / 2, y: rect.top };
                }
              } else {
                dropFrom = {
                  x: eggRect.left + eggRect.width / 2,
                  y: eggRect.top,
                };
              }

              try {
                this.spawn({ dropFrom, pop: popAction });
              } catch (err) {
                console.error('[Hatchy] Error spawning:', err);
              }

              dialogInstance.close();

              if (egg.classList && egg.classList.contains('rocky-egg')) {
                egg.style.transition = 'opacity 0.5s';
                egg.style.opacity = '0';
                setTimeout(() => egg.remove(), 500);
              }

              return true;
            }
          }
        ]
      });
    }

  showFoundDialog() {
    this.handleEggClick(document.querySelector('.rocky-egg') || document.body);
  }

  

  
}

