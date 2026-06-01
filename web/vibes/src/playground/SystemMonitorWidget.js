class SystemMonitorWidget {
  constructor() {
    this.element = null;
    this.render();
  }

  render() {
    const card = makeElement('div', { className: 'dashboard-card' });
    const title = makeElement(
      'h3',
      { style: { color: '#8bc34a' } },
      '✅ TEST: FULL FILE REPLACE'
    );
    const description = makeElement(
      'p',
      'This component was successfully updated via a full file replacement. The original content is gone.'
    );

    card.append(title, description);

    this.element = card;
  }

  getElement() {
    return this.element;
  }

  testProtocol() {
    console.log('This method has been successfully REPLACED.');
    return 'replace success';
  }

  practiceAddMethod() {
    console.log('This is a new method added for protocol practice.');
    return 'add success';
  }

    


  static _doc() {
      return [
        this._doc_overview()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### SystemMonitorWidget\n\nA test placeholder component for whole-file replacement validation.";
    }
}

