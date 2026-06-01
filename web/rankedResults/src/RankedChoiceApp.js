
class RankedChoiceApp {
  constructor() {
      // Intentionally left empty to overwrite the legacy constructor!
      // All setup now happens properly in the run(env) -> buildDOM() flow.
    }

  init() {
      const params = new URLSearchParams(window.location.search);
      const urlTheme = params.get('theme');
      this.applyTheme(urlTheme);

      const urlMethod = params.get('method') || params.get('tab');
      if (urlMethod) {
        const val = urlMethod.toLowerCase().includes('irv') ? 'irv' : 'condorcet';
        const radio = this.tabMethodRadios.find(r => r.value === val);
        if (radio) radio.checked = true;
      }

      const urlBallot = params.get('ballot');
      if (urlBallot) {
        const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = normalize(urlBallot);
        const key = Object.keys(this.ballotFiles).find((k) => normalize(k) === target);
        if (key) this.ballotSelector.value = key;
      }

      this.loadBallot();
    }

  wireUi() {
      this.ballotSelector.addEventListener('change', () => this.loadBallot());
      this.showInfoButton.addEventListener('click', () => this.showIntroDialog());
      this.ballotTextArea.addEventListener('input', () => {
        this.tabulateButton.disabled = false;
        this.exportButton.disabled = true;
        if (this.ballotSelector.value !== 'custom') this.ballotSelector.value = 'custom';
      });
      this.tabulateButton.addEventListener('click', () => this.tabulate());
      this.exportButton.addEventListener('click', () => this.exportBallotData());
      this.tabMethodRadios.forEach((r) => r.addEventListener('change', () => this.tabulate()));
      
      this.themeSelector.addEventListener('change', () => {
        ThemeManager.apply(this.themeSelector.value, this.rootElement);
        localStorage.setItem(this.savedThemeKey, this.themeSelector.value);
      });

      // Circular Vote Demo
      if (this.controlsDiv) {
        applyCss(`
          .cv-btn-container { position: relative; margin-left: auto; display: inline-block; }
          .cv-btn {
            position: relative; z-index: 101; background: linear-gradient(135deg, #e65c00, #F9D423); color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 0 15px rgba(230, 92, 0, 0.8), inset 0 0 10px rgba(255,255,255,0.3); transition: all 0.5s ease; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          }
          .cv-btn.active-pulse { animation: cv-pulse-intense 2s infinite alternate ease-in-out; }
          .cv-btn.settled { animation: cv-pulse-subtle 4s infinite alternate ease-in-out; background: linear-gradient(135deg, #b34700, #cc7a00); box-shadow: 0 0 5px rgba(179, 71, 0, 0.4); }
          .cv-btn:hover { transform: scale(1.03); }
          @keyframes cv-pulse-intense { 0% { box-shadow: 0 0 10px rgba(230, 92, 0, 0.6), inset 0 0 5px rgba(255,255,255,0.2); filter: brightness(1); } 100% { box-shadow: 0 0 25px rgba(255, 120, 0, 1), 0 0 10px rgba(255, 50, 0, 0.8), inset 0 0 15px rgba(255,255,255,0.6); filter: brightness(1.15); } }
          @keyframes cv-pulse-subtle { 0% { box-shadow: 0 0 3px rgba(179, 71, 0, 0.3); } 100% { box-shadow: 0 0 8px rgba(179, 71, 0, 0.6); } }
        `, 'circularVote-btn-animations');

        const cvContainer = makeElement('div', { className: 'cv-btn-container' });
        const circBtn = makeElement('button', { className: 'cv-btn active-pulse' }, 'Circular Vote');
        cvContainer.appendChild(circBtn);
        this.controlsDiv.appendChild(cvContainer);

        let embersActive = true;
        const spawnEmber = () => {
          if (!embersActive) return;
          const rect = circBtn.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;

          const ember = makeElement('div');
          const size = Math.random() * 3 + 2;
          const colors = ['#ffcc00', '#ff9900', '#ff6600', '#ffaa33'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          const startX = rect.left + Math.random() * rect.width;
          const startY = rect.top + Math.random() * rect.height;

          Object.assign(ember.style, {
            position: 'fixed', left: startX + 'px', top: startY + 'px', width: size + 'px', height: size + 'px', backgroundColor: color, borderRadius: '50%', boxShadow: `0 0 ${size * 2.5}px ${color}`, pointerEvents: 'none', zIndex: '999999', transform: 'translate(-50%, -50%)',
          });

          this.env.container.appendChild(ember);

          const dx = (Math.random() - 0.5) * 40;
          const dy = -(Math.random() * 60 + 50);
          const duration = Math.random() * 2000 + 1500;

          ember.animate([
            { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
            { transform: `translate(calc(-50% + ${dx * 0.3}px), calc(-50% + ${dy * 0.3}px)) scale(1.1)`, opacity: 0.8, offset: 0.3 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.1)`, opacity: 0 },
          ], { duration, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => ember.remove();
        };

        const emberInterval = setInterval(spawnEmber, 100);
        this.intervals.push(emberInterval);

        circBtn.addEventListener('click', () => {
          circBtn.classList.remove('active-pulse');
          circBtn.classList.add('settled');
          embersActive = false;
          clearInterval(emberInterval);
          this.openCircularVoteDialog();
        });
      }
    }

  prepareBallotSelector() {
      this.ballotSelector.append(makeElement('option', { value: 'custom' }, 'Custom'));
      Object.entries(this.ballotFiles).forEach(([k, _]) => {
        this.ballotSelector.append(makeElement('option', { value: k }, k.replace(/([a-z])([A-Z])/g, '$1 $2')));
      });
      this.ballotSelector.value = 'Burlington 2009';
    }

  async loadBallot() {
      const sel = this.ballotSelector.value;
      if (sel === 'custom') {
        this.ballotTextArea.value = '';
        this.widgetContainer.innerHTML = '<p>Enter ballot data in the text area.</p>';
        this.tabulateButton.disabled = true;
        this.exportButton.disabled = true;
        return;
      }
      const url = this.ballotFiles[sel];
      if (!url) return;
      try {
        const raw = await fetch(url).then((r) => r.text());
        this.ballotTextArea.value = raw.split(/\r?\n/).map((l) => l.trim()).join('\n');
        this.tabulate();
      } catch (e) {
        this.widgetContainer.innerHTML = '<p>Error loading ballot file.</p>';
      }
    }

  tabulate() {
      const txt = this.ballotTextArea.value;
      if (!txt.trim()) {
        this.widgetContainer.innerHTML = '<p>Ballot data is empty.</p>';
        this.tabulateButton.disabled = true;
        this.exportButton.disabled = true;
        return;
      }
      this.state.electionData = ElectionData.fromBallotText(txt);
      if (Object.keys(this.state.electionData.candidates).length === 0 && this.state.electionData.ballots.length === 0) {
        this.widgetContainer.innerHTML = '<p>No valid data found.</p>';
        return;
      }
      this.widgetContainer.innerHTML = '';
      
      const activeRadio = this.tabMethodRadios.find(r => r.checked);
      this.state.method = activeRadio ? activeRadio.value : 'condorcet';

      if (this.state.widget && typeof this.state.widget.destroy === 'function') {
        this.state.widget.destroy();
      }

      if (this.state.method === 'condorcet') {
        const tabulator = new CondorcetTabulator(this.state.electionData);
        const data = tabulator.run();
        const params = new URLSearchParams(window.location.search);
        const options = { view: 'both' };
        if (params.has('view')) { options.view = params.get('view'); options.useLocalStorage = false; }
        const contentMode = params.get('content') || params.get('display');
        if (contentMode) { options.displayMode = contentMode; options.useLocalStorage = false; }

        this.state.widget = new PairwiseMatrixWidget(data, this.state.electionData.candidates, options, this.env);
        this.widgetContainer.append(this.state.widget.element);
        this.exportButton.disabled = false;
      } else {
        const tabulator = new IrvTabulator(this.state.electionData);
        const data = tabulator.run();
        this.state.widget = new InstantRunoffWidget(data);
        this.widgetContainer.append(this.state.widget.element);
        this.exportButton.disabled = true;
      }
      this.tabulateButton.disabled = true;
    }

  updateWidget() {
      if (this.state.method !== 'condorcet' || !this.state.electionData) return;
      if (this.state.widget && typeof this.state.widget.destroy === 'function') this.state.widget.destroy();

      const tabulator = new CondorcetTabulator(this.state.electionData);
      const data = tabulator.run();
      this.state.widget = new PairwiseMatrixWidget(data, this.state.electionData.candidates, { view: 'both' }, this.env);
      this.widgetContainer.innerHTML = '';
      this.widgetContainer.append(this.state.widget.element);
    }

  addVotes(namePrefix, qty) {
      if (!this.state.electionData) return;
      const prefix = namePrefix.toLowerCase().trim();
      const matches = Object.entries(this.state.electionData.candidates).filter(([short, long]) => long.toLowerCase().startsWith(prefix));
      if (matches.length !== 1) return;
      const [shortKey, longName] = matches[0];
      const already = this.state.manualCounts[shortKey] || 0;
      const delta = qty > 0 ? qty : Math.max(qty, -already);
      if (delta === 0) return;

      this.state.electionData.ballots.push({ count: delta, ranks: [shortKey] });
      this.state.manualCounts[shortKey] = already + delta;
      this.updateWidget();
    }

  exportBallotData() {
      if (this.state.method !== 'condorcet' || !this.state.widget) return;
      const { candidates, ballots } = this.state.electionData;
      const matrixData = this.state.widget.matrix;
      const sortedKeys = this.state.widget.sortedCandidates;
      const lines = [];
      const done = new Set();
      const ranksToStr = (ranksArr) => ranksArr.map((g) => (Array.isArray(g) ? g.join('=') : g)).join('>');

      if (sortedKeys) {
        sortedKeys.forEach((short) => {
          const long = candidates[short], info = matrixData[short];
          let line = `${short}: ${long}`;
          if (info && typeof info.score === 'number') line += ` [${info.score.toFixed(1)}]`;
          lines.push(line);
          done.add(short);
        });
      }
      Object.entries(candidates).forEach(([s, l]) => { if (!done.has(s)) lines.push(`${s}: ${l}`); });
      lines.push('---');
      ballots.forEach(({ count = 1, ranks, name }) => {
        let line = count === 1 ? ranksToStr(ranks) : `${count}: ${ranksToStr(ranks)}`;
        if (name) line += ` [${name}]`;
        lines.push(line);
      });
      this.ballotTextArea.value = lines.join('\n');
      this.tabulateButton.disabled = false;
    }

  showIntroDialog() {
      const content = makeElement('div', { style: { padding: '0 10px', lineHeight: '1.6', color: 'var(--text-primary)' } }, [
        makeElement('h2', { style: { textAlign: 'center', marginTop: '0' } }, 'Welcome to the Ranked Choice Visualizer'),
        makeElement('p', {}, 'This tool analyzes and visualizes ranked choice voting ballots.'),
        makeElement('h3', {}, 'Condorcet vs. Instant Runoff (IRV)'),
        makeElement('ul', {}, [
          makeElement('li', {}, [makeElement('strong', {}, 'Instant Runoff (IRV): '), 'Eliminates candidate with fewest first-place votes, redistributing until a majority is found.']),
          makeElement('li', {}, [makeElement('strong', {}, 'Condorcet (Pairwise): '), 'Simulates a head-to-head election between every pair of candidates.']),
        ]),
        makeElement('h3', {}, 'The Condorcet Widget'),
        makeElement('p', {}, `It shows the full pairwise matrix. The candidate with the highest "worst-case" score wins.`),
      ]);

      UITools.makeDialog({
        env: this.env,
        title: 'About This Page',
        contentElement: content,
        width: '600px'
      });
    }

  createInfoPanel() {
    const content = makeElement('div', { className: 'info-content' }, [
      makeElement(
        'h2',
        { style: { textAlign: 'center', marginTop: '0' } },
        'Welcome to the Ranked Choice Visualizer'
      ),
      makeElement(
        'p',
        {},
        'This tool analyzes and visualizes ranked choice voting ballots. You can choose from several pre-loaded, real-world elections or paste your own ballot data to see how different tabulation methods work.'
      ),

      makeElement('h3', {}, 'Condorcet vs. Instant Runoff (IRV)'),
      makeElement(
        'p',
        {},
        `This page demonstrates two different ways to count ranked ballots:`
      ),
      makeElement('ul', {}, [
        makeElement('li', {}, [
          makeElement('strong', {}, 'Instant Runoff (IRV): '),
          "Also known as Ranked Choice Voting (RCV) in some parts of the US. It works in rounds. In each round, the candidate with the fewest first-place votes is eliminated, and their votes are transferred to the voter's next choice. This continues until one candidate has a majority.",
        ]),
        makeElement('li', {}, [
          makeElement('strong', {}, 'Condorcet (Pairwise): '),
          'This method simulates a head-to-head election between every pair of candidates. The candidate who wins all of their one-on-one matchups is the Condorcet Winner. This is often considered the fairest outcome, as this candidate is preferred over all others by a majority of voters.',
        ]),
      ]),
      makeElement(
        'p',
        {},
        'Sometimes, these methods produce different winners, which can be controversial.'
      ),

      makeElement('h3', {}, 'The Condorcet Widget'),
      makeElement(
        'p',
        {},
        `The Condorcet visualization is particularly sophisticated. It shows the full pairwise matrix of head-to-head results. The most important feature is the bar chart display (select 'Scores' or 'Both' view). Each candidate's score is their worst pairwise performance—the lowest percentage of votes they received against any single opponent. The candidate with the highest "worst-case" score wins. This is known as the Minimax method.`
      ),

      makeElement('h3', {}, 'Example Elections'),
      makeElement('ul', {}, [
        makeElement('li', {}, [
          makeElement('strong', {}, 'Burlington & Alaska Special: '),
          'These are interesting because in both cases, IRV failed to elect the Condorcet winner. This tool lets you see exactly how that happened.',
        ]),
        makeElement('li', {}, [
          makeElement('strong', {}, 'Reddit "Meta" Election: '),
          'A poll conducted on Reddit where users voted on their preferred voting methods. A fun, self-referential example.',
        ]),
        makeElement('li', {}, [
          makeElement('strong', {}, 'San Francisco Mayor: '),
          'Notable for the large number of candidates. The ranked choice system performed well, navigating the complex field to elect a centrist candidate.',
        ]),
      ]),
    ]);

    const closeButton = makeElement(
      'button',
      {
        className: 'info-close-button',
        onclick: () => this.toggleInfoPanel(false),
      },
      '×'
    );
    const panel = makeElement('div', { className: 'info-panel' }, [
      closeButton,
      content,
    ]);
    this.infoPanel = makeElement('div', { id: 'infoOverlay' }, [panel]);

    // Clicking on the overlay background also closes the panel
    this.infoPanel.addEventListener('click', (e) => {
      if (e.target === this.infoPanel) {
        this.toggleInfoPanel(false);
      }
    });

    document.body.append(this.infoPanel);
  }

  toggleInfoPanel(show) {
    if (!this.infoPanel) {
      this.createInfoPanel();
    }

    if (show) {
      this.infoPanel.classList.add('visible');
      localStorage.setItem('rankedChoiceIntroShown', 'true');
    } else {
      this.infoPanel.classList.remove('visible');
    }
  }

  applyTheme(override = null) {
      let mode = override || localStorage.getItem(this.savedThemeKey) || 'dark';
      ThemeManager.apply(mode, this.rootElement);
      if (this.themeSelector) this.themeSelector.value = mode;
    }

  openCircularVoteDialog() {
      applyCss(`
        .cv-slider-group { margin-bottom: 10px; }
        .cv-slider-group label { display: block; font-size: 13px; color: var(--text-primary); margin-bottom: 3px; font-weight: 500; }
        .cv-slider-group input[type="range"] { width: 100%; cursor: pointer; }
        .cv-btn-export { width: 100%; padding: 10px; background-color: #e67e22; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; margin-top: 10px; transition: background-color 0.2s; }
        .cv-btn-export:hover { background-color: #d35400; }
      `, 'circularVote-app-styles');

      let numVoters = 1400, donutRadius = 1.55, voterSpread = 0.12, candidateSpread = 1.6;
      let candidates = [], voters = [];

      const svgContainer = makeElement('div', { style: { width: '100%', height: '250px', backgroundColor: '#1a1a1a', borderRadius: '6px', marginBottom: '15px' } });

      const updateData = () => {
        candidates = [
          { id: 'C', name: 'Center', x: 0, y: 0 },
          { id: 'N', name: 'North', x: 0, y: -candidateSpread },
          { id: 'E', name: 'East', x: candidateSpread, y: 0 },
          { id: 'S', name: 'South', x: 0, y: candidateSpread },
          { id: 'W', name: 'West', x: -candidateSpread, y: 0 },
        ];
        voters = [];
        for (let i = 0; i < numVoters; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const z0 = Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random());
          const radius = Math.max(0, donutRadius + z0 * voterSpread);
          voters.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        }
        renderSVG();
      };

      const renderSVG = () => {
        svgContainer.innerHTML = '';
        const maxExtent = Math.max(donutRadius + voterSpread * 3, candidateSpread) * 1.2;
        const size = maxExtent * 2;
        const axesGroup = makeElement('svg:g', { stroke: '#444', 'stroke-width': size * 0.005 },
          makeElement('svg:line', { x1: -maxExtent, y1: 0, x2: maxExtent, y2: 0 }),
          makeElement('svg:line', { x1: 0, y1: -maxExtent, x2: 0, y2: maxExtent }),
          makeElement('svg:circle', { cx: 0, cy: 0, r: donutRadius, fill: 'none', stroke: '#555', 'stroke-width': size * 0.004, 'stroke-dasharray': '0.05,0.05' })
        );
        const votersGroup = makeElement('svg:g', { fill: '#3498db', opacity: 0.7 });
        voters.forEach((v) => votersGroup.appendChild(makeElement('svg:circle', { cx: v.x, cy: v.y, r: size * 0.008 })));
        const candidatesGroup = makeElement('svg:g', { fill: '#ff7f0e', stroke: '#222', 'stroke-width': size * 0.003 });
        candidates.forEach((c) => candidatesGroup.appendChild(makeElement('svg:circle', { cx: c.x, cy: c.y, r: size * 0.015 })));
        svgContainer.appendChild(makeElement('svg:svg', { viewBox: `${-maxExtent} ${-maxExtent} ${size} ${size}`, style: { width: '100%', height: '100%', display: 'block' } }, [axesGroup, votersGroup, candidatesGroup]));
      };

      const createSlider = (labelText, min, max, step, initialValue, onChange) => {
        const group = makeElement('div', { className: 'cv-slider-group' });
        const label = makeElement('label', `${labelText}: ${initialValue}`);
        const slider = makeElement('input', { type: 'range', min, max, step, value: initialValue, oninput: (e) => {
          const val = parseFloat(e.target.value); label.textContent = `${labelText}: ${val}`; onChange(val);
        }});
        group.appendChild(label); group.appendChild(slider);
        return group;
      };

      const controlsDiv = makeElement('div');
      controlsDiv.appendChild(createSlider('Number of Voters', 100, 5000, 100, numVoters, (v) => { numVoters = v; updateData(); }));
      controlsDiv.appendChild(createSlider('Donut Radius', 0.1, 3.0, 0.05, donutRadius, (v) => { donutRadius = v; updateData(); }));
      controlsDiv.appendChild(createSlider('Randomness', 0.01, 1.0, 0.01, voterSpread, (v) => { voterSpread = v; updateData(); }));
      controlsDiv.appendChild(createSlider('Candidate Spread', 0.1, 3.0, 0.05, candidateSpread, (v) => { candidateSpread = v; updateData(); }));

      const exportBtn = makeElement('button', { className: 'cv-btn-export', onclick: () => {
        const ballots = {};
        voters.forEach((v) => {
          const dists = candidates.map((c) => ({ id: c.id, d: Math.hypot(v.x - c.x, v.y - c.y) }));
          dists.sort((a, b) => a.d - b.d);
          const rankStr = dists.map((c) => c.id).join('>');
          ballots[rankStr] = (ballots[rankStr] || 0) + 1;
        });
        const lines = [];
        candidates.forEach((c) => lines.push(`${c.id}: ${c.name}`));
        lines.push('---');
        Object.entries(ballots).sort((a, b) => b[1] - a[1]).forEach(([rankStr, count]) => lines.push(`${count}: ${rankStr}`));
        
        this.ballotTextArea.value = lines.join('\n');
        if (this.ballotSelector.value !== 'custom') this.ballotSelector.value = 'custom';
        this.tabulateButton.disabled = false;
        this.exportButton.disabled = true;
        this.tabulate();
        dialog.close();
      }}, 'Export to Ballots & Tabulate');
      controlsDiv.appendChild(exportBtn);

      const content = makeElement('div', { style: { padding: '10px' } }, [svgContainer, controlsDiv]);
      updateData();

      const dialog = UITools.makeDialog({
        env: this.env,
        title: 'Circular Vote Generator',
        contentElement: content,
        width: '350px'
      });
    }

  async run(env) {
      if (this.rootElement) this.destroy();
      this.env = env;
      this.rootElement = env.container;

      if (this.rootElement === document.body) {
        document.documentElement.style.height = '100%';
        document.documentElement.style.margin = '0';
        document.body.style.height = '100%';
        document.body.style.margin = '0';
      }

      this.rootElement.classList.add('ranked-choice-wrapper');

      this.ballotFiles = {
        'Burlington 2009': 'https://recursi.dev/rankedBallots/burlington2009.txt',
        'Alaska 2022': 'https://recursi.dev/rankedBallots/alaskaspecial2022.txt',
        'endFPTP "Meta"': 'https://recursi.dev/rankedBallots/endfptpVotingMethod.txt',
        'SF Mayor 2024': 'https://recursi.dev/rankedBallots/sanfrancisco2024.txt',
      };
      
      this.savedThemeKey = 'pvTheme';
      this.state = { manualCounts: {}, electionData: null, widget: null, method: 'condorcet' };
      this.infoPanel = null;
      this.intervals = [];

      this.injectStyles();
      this.buildDOM();
      this.init();
    }

  destroy() {
      if (this.state.widget && typeof this.state.widget.destroy === 'function') {
        this.state.widget.destroy();
      }
      for (const id of this.intervals) clearInterval(id);
      this.intervals = [];
    }

  injectStyles() {
      applyCss(`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
        .ranked-choice-wrapper {
          font-family:'Roboto',sans-serif;
          line-height:1.6;
          color:#333;
          width: 100%;
          height: 100%;
          overflow: auto;
          box-sizing: border-box;
          background:#f0f0f0;
          padding: 20px;
        }
        .ranked-choice-wrapper .container {max-width: 1200px; margin: 0 auto; background:#fff;border-radius:10px;box-shadow:0 0 20px rgba(0,0,0,.1);padding:30px}
        .ranked-choice-wrapper .header-bar {display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px;}
        .ranked-choice-wrapper .app-title {font-size:20px;line-height:1.1;word-break:break-word;max-width:110px;min-width:190px;margin:0;}
        .ranked-choice-wrapper .theme-select {flex:0 0 auto;width:110px;padding:6px 8px;font-family:'Roboto',sans-serif;font-size:15px;border-radius:5px;}
        .ranked-choice-wrapper .header-actions {display:flex;flex-direction:column;gap:8px;align-items:flex-end;}
        .ranked-choice-wrapper #showInfoButton {padding:6px 12px;font-size:14px;width:110px;}
        .ranked-choice-wrapper .tabulation-controls fieldset {border:1px solid #bdc3c7;border-radius:5px;padding:10px 15px}
        .ranked-choice-wrapper .tabulation-controls legend {padding:0 5px;font-weight:bold;}
        .ranked-choice-wrapper .radio-group {display:flex;gap:20px}
        .ranked-choice-wrapper .radio-group label {display:flex;align-items:center;gap:5px;cursor:pointer}
        .ranked-choice-wrapper .widget-area {background-color:#ecf0f1;border-radius:5px;padding:20px;margin-bottom:30px;min-height:300px}
        .ranked-choice-wrapper .controls {display:flex;align-items:center;gap:8px;margin-bottom:20px;}
        .ranked-choice-wrapper select, .ranked-choice-wrapper button {font-family:'Roboto',sans-serif;font-size:16px;padding:10px;border-radius:5px;border:1px solid #bdc3c7;}
        .ranked-choice-wrapper #ballotSelector {flex:1 1 auto;}
        .ranked-choice-wrapper button {background-color:#3498db;color:#fff;border:none;cursor:pointer;transition:background-color .3s}
        .ranked-choice-wrapper button:disabled {background-color:#cccccc}
        .ranked-choice-wrapper button:hover:not(:disabled) {background-color:#2980b9}
        .ranked-choice-wrapper textarea {width:100%;height:200px;font-family:'Roboto',sans-serif;font-size:14px;padding:10px;border-radius:5px;border:1px solid #bdc3c7;resize:vertical}
        @media (min-width:768px){
          .ranked-choice-wrapper .content-area {display:flex;justify-content:space-between}
          .ranked-choice-wrapper .text-container {width:400px}
          .ranked-choice-wrapper textarea {height:300px}
        }
      `, 'rcv-base-styles');
    }

  buildDOM() {
      this.rootElement.innerHTML = '';

      const title = makeElement('h1', { className: 'app-title' });
      title.innerHTML = 'Ranked<br>Choice<br>Visualizer';

      const condorcetRadio = makeElement('input', { type: 'radio', name: 'tabulationMethod', value: 'condorcet', checked: true });
      const irvRadio = makeElement('input', { type: 'radio', name: 'tabulationMethod', value: 'irv' });
      this.tabMethodRadios = [condorcetRadio, irvRadio];

      const fieldset = makeElement('fieldset', {}, 
        makeElement('legend', {}, 'Tabulation Method'),
        makeElement('div', { className: 'radio-group' }, 
          makeElement('label', {}, condorcetRadio, 'Condorcet (Pairwise)'),
          makeElement('label', {}, irvRadio, 'Instant Runoff (IRV)')
        )
      );
      const tabControls = makeElement('div', { className: 'tabulation-controls' }, fieldset);

      this.showInfoButton = makeElement('button', { id: 'showInfoButton' }, 'What is this?');
      this.themeSelector = makeElement('select', { id: 'themeSelector', className: 'theme-select' }, 
        makeElement('option', { value: 'light' }, 'Light'),
        makeElement('option', { value: 'sublime' }, 'Sublime'),
        makeElement('option', { value: 'dark' }, 'Dark'),
        makeElement('option', { value: 'warm' }, 'Dark Warm'),
        makeElement('option', { value: 'neon' }, 'Dark Funky')
      );

      const headerActions = makeElement('div', { className: 'header-actions' }, this.showInfoButton, this.themeSelector);
      const headerBar = makeElement('div', { className: 'header-bar' }, title, tabControls, headerActions);

      this.widgetContainer = makeElement('div', { id: 'widgetContainer', className: 'widget-area' });

      this.ballotSelector = makeElement('select', { id: 'ballotSelector' });
      this.tabulateButton = makeElement('button', { id: 'tabulateButton' }, 'Tabulate');
      this.exportButton = makeElement('button', { id: 'exportButton', disabled: true }, 'Export Data');

      this.controlsDiv = makeElement('div', { className: 'controls' }, this.ballotSelector, this.tabulateButton, this.exportButton);
      this.ballotTextArea = makeElement('textarea', { id: 'ballotText' });

      const textContainer = makeElement('div', { className: 'text-container' }, this.controlsDiv, this.ballotTextArea);
      const contentArea = makeElement('div', { className: 'content-area' }, textContainer);

      const container = makeElement('div', { className: 'container' }, headerBar, this.widgetContainer, contentArea);
      this.rootElement.appendChild(container);

      this.wireUi();
      this.prepareBallotSelector();
    }

}

