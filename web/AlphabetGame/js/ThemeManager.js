
class ThemeManager {
  constructor(atlasManager) {
    this.atlasManager = atlasManager;
    this.isDarkMode = false;
  }

  createDarkModeToggle() {
    const toggleCheckbox = makeElement('input', {
      type: 'checkbox',
      id: 'darkModeToggle',
    });

    toggleCheckbox.addEventListener('change', (e) => {
      this.toggleDarkMode(e.target.checked);
    });

    const toggleSwitch = makeElement(
      'label',
      {
        htmlFor: 'darkModeToggle',
        className: 'dark-mode-switch',
      },
      [toggleCheckbox, makeElement('span', { className: 'toggle-slider' })]
    );

    const toggleContainer = makeElement(
      'div',
      { className: 'dark-mode-toggle' },
      [
        makeElement('span', { className: 'dark-mode-label' }, 'Dark Mode'),
        toggleSwitch,
      ]
    );

    return toggleContainer;
  }

  toggleDarkMode(isDark) {
    this.isDarkMode = isDark;
    const newAtlasKey = this.isDarkMode ? 'Macabre' : 'Simple';
    this.atlasManager.changeAtlas(newAtlasKey);
  }

}

