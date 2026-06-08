
class RankedChoiceApp {
  constructor() {
      // Standard standardized constructor
    }

  async init() {
      const params = new URLSearchParams(window.location.search);
      const urlTheme = params.get('theme');
      this.applyTheme(urlTheme);

      const urlMethod = params.get('method') || params.get('tab');
      if (urlMethod) {
        const val = urlMethod.toLowerCase().includes('irv') ? 'irv' : 'condorcet';
        const radio = this.tabMethodRadios.find(r => r.value === val);
        if (radio) {
          this.tabMethodRadios.forEach(r => r.checked = (r.value === val));
        }
      }

      const urlBallot = params.get('ballot');
      if (urlBallot) {
        if (urlBallot.startsWith('http://') || urlBallot.startsWith('https://')) {
          this.ballotSelector.value = 'custom';
          this.ballotTextArea.value = 'Loading custom ballot data...';
          this.tabulateButton.disabled = true;
          try {
            const raw = await fetch(urlBallot).then(r => r.text());
            this.ballotTextArea.value = raw.split(/\r?\n/).map(l => l.trim()).join('\n');
            this.tabulate();
          } catch (e) {
            this.widgetContainer.innerHTML = '<p>Error loading custom ballot URL.</p>';
          }
        } else {
          const targetId = urlBallot.toLowerCase().trim();
          const found = this.electionsList.find(item => item.id.toLowerCase() === targetId);
          if (found) {
            this.ballotSelector.value = found.id;
            await this.loadBallot();
          } else {
            await this.loadBallot();
          }
        }
      } else {
        await this.loadBallot();
      }
    }

  wireUi() {
      this.ballotSelector.addEventListener('change', () => {
        this.loadBallot();
        this.updateUrlParams();
      });
      this.showInfoButton.addEventListener('click', () => this.showIntroDialog());
      this.ballotTextArea.addEventListener('input', () => {
        this.tabulateButton.disabled = false;
        this.exportButton.disabled = true;
        if (this.ballotSelector.value !== 'custom') this.ballotSelector.value = 'custom';
        this.updateUrlParams();
      });
      this.tabulateButton.addEventListener('click', () => this.tabulate());
      this.exportButton.addEventListener('click', () => this.exportBallotData());
      this.tabMethodRadios.forEach((r) => r.addEventListener('change', () => this.tabulate()));
      
      this.themeSelector.addEventListener('change', () => {
        ThemeManager.apply(this.themeSelector.value, this.rootElement);
        localStorage.setItem(this.savedThemeKey, this.themeSelector.value);
        this.updateUrlParams();
      });

      // Circular Vote Demo - Regular Button
      if (this.controlsDiv) {
        const cvContainer = makeElement('div', { style: { marginLeft: 'auto' } });
        const circBtn = makeElement('button', {}, 'Circular Vote');
        cvContainer.appendChild(circBtn);
        this.controlsDiv.appendChild(cvContainer);

        circBtn.addEventListener('click', () => {
          this.openCircularVoteDialog();
        });
      }
    }

  prepareBallotSelector() {
      this.ballotSelector.append(makeElement('option', { value: 'custom' }, 'Custom'));
      this.electionsList.forEach((item) => {
        this.ballotSelector.append(makeElement('option', { value: item.id }, item.name));
      });
      if (this.electionsList.length > 0) {
        this.ballotSelector.value = this.electionsList[0].id;
      } else {
        this.ballotSelector.value = 'custom';
      }
    }

  async loadBallot() {
      const sel = this.ballotSelector.value;
      const descText = this.ballotDescriptionText;
      if (sel === 'custom') {
        this.ballotTextArea.value = '';
        this.widgetContainer.innerHTML = '<p>Enter ballot data in the text area.</p>';
        descText.textContent = '';
        descText.style.display = 'none';
        this.tabulateButton.disabled = true;
        this.exportButton.disabled = true;
        return;
      }
      const election = this.electionsList.find(item => item.id === sel);
      if (!election) return;

      if (election.description) {
        descText.textContent = election.description;
        descText.style.display = 'block';
      } else {
        descText.textContent = '';
        descText.style.display = 'none';
      }

      try {
        const raw = await fetch(election.file).then((r) => r.text());
        this.ballotTextArea.value = raw.split(/\r?\n/).map((l) => l.trim()).join('\n');
        this.tabulate();
      } catch (e) {
        this.widgetContainer.innerHTML = '<p>Error loading ballot file from server.</p>';
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
        const options = { view: 'both', displayMode: 'none' };
        if (params.has('view')) { options.view = params.get('view'); options.useLocalStorage = false; }
        const contentMode = params.get('content') || params.get('display');
        if (contentMode) { options.displayMode = contentMode; options.useLocalStorage = false; }

        this.state.widget = new PairwiseMatrixWidget(data, this.state.electionData.candidates, {
          ...options,
          onStateChange: () => this.updateUrlParams()
        }, this.env);
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
      this.updateUrlParams();
    }

  updateWidget() {
      if (this.state.method !== 'condorcet' || !this.state.electionData) return;
      if (this.state.widget && typeof this.state.widget.destroy === 'function') this.state.widget.destroy();

      const tabulator = new CondorcetTabulator(this.state.electionData);
      const data = tabulator.run();
      this.state.widget = new PairwiseMatrixWidget(data, this.state.electionData.candidates, { 
        view: 'both',
        onStateChange: () => this.updateUrlParams()
      }, this.env);
      this.widgetContainer.innerHTML = '';
      this.widgetContainer.append(this.state.widget.element);
      this.updateUrlParams();
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
        makeElement('h2', { style: { textAlign: 'center', marginTop: '0' } }, 'Welcome to the Ranked Choice Visualizer'),
        makeElement('p', {}, 'This tool analyzes and visualizes ranked choice voting ballots. You can choose from several pre-loaded, real-world elections or paste your own ballot data to see how different tabulation methods work.'),
        makeElement('h3', {}, 'Condorcet vs. Instant Runoff (IRV)'),
        makeElement('p', {}, `This page demonstrates two different ways to count ranked ballots:`),
        makeElement('ul', {}, [
          makeElement('li', {}, [
            makeElement('strong', {}, 'Instant Runoff (IRV): '),
            "Also known as Ranked Choice Voting (RCV) in some parts of the US. It works in rounds. In each round, the candidate with the fewest first-place votes is eliminated, and their votes are transferred to the voter's next choice. This continues until one candidate has a majority.",
          ]),
          makeElement('li', {}, [
            makeElement('strong', {}, 'Condorcet (Pairwise): '),
            'This method simulates a head-to-head election between every pair of candidates. The candidate who wins all of their one-on-one matchups is the Condorcet Winner. This is often preferred, as this candidate is preferred over all others by a majority of voters.',
          ]),
        ]),
        makeElement('p', {}, 'Sometimes, these methods produce different winners, which can be controversial.'),
        makeElement('h3', {}, 'The Condorcet Widget'),
        makeElement('p', {}, `The Condorcet visualization is particularly sophisticated. It shows the full pairwise matrix of head-to-head results. The most important feature is the bar chart display (select 'Scores' or 'Both' view). Each candidate's score is their worst pairwise performance-the lowest percentage of votes they received against any single opponent. The candidate with the highest "worst-case" score wins. This is known as the Minimax method.`),
      ]);

      const closeButton = makeElement('button', { className: 'info-close-button', onclick: () => this.toggleInfoPanel(false) }, '×');
      const panel = makeElement('div', { className: 'info-panel' }, [closeButton, content]);
      this.infoPanel = makeElement('div', { id: 'infoOverlay' }, [panel]);

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
      this.env = env;
      this.rootElement = env.container;
      this.rootElement.classList.add('ranked-choice-wrapper');

      this.electionsList = [];
      this.savedThemeKey = 'pvTheme';
      this.state = { manualCounts: {}, electionData: null, widget: null, method: 'condorcet' };
      this.infoPanel = null;
      this.intervals = [];

      this.injectStyles();
      await this.fetchBallotsConfig();
      this.buildDOM();
      await this.init();
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
        .ranked-choice-wrapper .ballot-description {
          font-size: 13.5px;
          opacity: 0.85;
          font-style: italic;
          margin-top: -12px;
          margin-bottom: 20px;
          line-height: 1.45;
        }
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
      
      this.ballotDescriptionText = makeElement('div', { 
        className: 'ballot-description', 
        style: { display: 'none' } 
      });

      this.ballotTextArea = makeElement('textarea', { id: 'ballotText' });

      const textContainer = makeElement('div', { className: 'text-container' }, this.controlsDiv, this.ballotDescriptionText, this.ballotTextArea);
      const contentArea = makeElement('div', { className: 'content-area' }, textContainer);

      const container = makeElement('div', { className: 'container' }, headerBar, this.widgetContainer, contentArea);
      this.rootElement.appendChild(container);

      this.wireUi();
      this.prepareBallotSelector();
    }


  updateUrlParams() {
      const params = new URLSearchParams(window.location.search);

      if (this.themeSelector) {
        params.set('theme', this.themeSelector.value);
      }

      const activeRadio = this.tabMethodRadios.find(r => r.checked);
      const method = activeRadio ? activeRadio.value : 'condorcet';
      params.set('method', method);

      const sel = this.ballotSelector.value;
      if (sel === 'custom') {
        const queryBallot = new URLSearchParams(window.location.search).get('ballot');
        if (queryBallot && (queryBallot.startsWith('http://') || queryBallot.startsWith('https://'))) {
          params.set('ballot', queryBallot);
        } else {
          params.set('ballot', 'custom');
        }
      } else {
        params.set('ballot', sel);
      }

      if (method === 'condorcet' && this.state.widget) {
        params.set('view', this.state.widget.options.view || 'both');
        params.set('display', this.state.widget.displayMode || 'none');
      } else {
        params.delete('view');
        params.delete('display');
      }

      const newSearch = '?' + params.toString();
      if (window.location.search !== newSearch) {
        window.history.replaceState(null, '', newSearch);
      }
    }

  async fetchBallotsConfig() {
      try {
        const res = await fetch('/SiteResources/rankedBallotData/ballots.json');
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        this.electionsList = data.elections || [];
      } catch (e) {
        console.warn("Could not fetch server-hosted ballots.json, loading safe fallback structure", e);
        this.electionsList = [
          {
            id: "burlington",
            name: "Burlington 2009",
            file: "/SiteResources/rankedBallotData/burlington2009.txt",
            description: "These are ones where the Condorcet winner differed from the Instant Runoff (IRV) winner."
          },
          {
            id: "alaska",
            name: "Alaska 2022",
            file: "/SiteResources/rankedBallotData/alaskaspecial2022.txt",
            description: "These are ones where the Condorcet winner differed from the Instant Runoff (IRV) winner."
          },
          {
            id: "meta",
            name: "endFPTP 'Meta'",
            file: "/SiteResources/rankedBallotData/endfptpVotingMethod.txt",
            description: "We actually voted on voting methods in the end fast first past the post group."
          },
          {
            id: "sf",
            name: "SF Mayor 2024",
            file: "/SiteResources/rankedBallotData/sanfrancisco2024.txt",
            description: "Notable for electing a very popular Centrist."
          }
        ];
      }
    }
}

