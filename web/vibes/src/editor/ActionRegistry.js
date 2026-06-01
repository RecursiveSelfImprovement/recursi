
class ActionRegistry {
  constructor(app) {
    this.app = app;
    this.actions = new Map();
  }

  /**
   * Registers a new action with the application.
   * @param {object} actionConfig - The configuration object for the action.
   * @param {string} actionConfig.id - A unique identifier (e.g., 'tools:show-playground').
   * @param {string} actionConfig.label - The user-facing text for menus and buttons.
   * @param {function} actionConfig.handler - The function to execute when the action is triggered.
   * @param {string} [actionConfig.shortcut] - An optional keyboard shortcut (e.g., 'p', 'ctrl+s').
   * @param {string} [actionConfig.menuPath] - An optional path for menu placement (e.g., 'Tools/Playground').
   * @param {string} [actionConfig.category] - An optional category for grouping (e.g., 'playground').
   * @param {string} [actionConfig.description] - An optional description for tooltips or playground cards.
   * @param {function} [actionConfig.renderPlaygroundContent] - A function that returns an HTMLElement for the playground card content.
   */
  register(actionConfig) {
    if (!actionConfig.id || !actionConfig.label || !actionConfig.handler) {
      console.error(
        'Action registration failed. `id`, `label`, and `handler` are required.',
        actionConfig
      );
      return;
    }
    if (this.actions.has(actionConfig.id)) {
      console.warn(
        `Action with id '${actionConfig.id}' is already registered. Overwriting.`
      );
    }
    this.actions.set(actionConfig.id, actionConfig);
  }

  execute(id) {
    const action = this.actions.get(id);
    if (action && action.handler) {
      action.handler();
    } else {
      console.warn(`Attempted to execute unregistered action: '${id}'`);
    }
  }

  getActionForShortcut(key) {
    // This is a simple implementation. It can be expanded to handle modifiers (ctrl, alt, etc.).
    for (const action of this.actions.values()) {
      if (
        action.shortcut &&
        action.shortcut.toLowerCase() === key.toLowerCase()
      ) {
        return action;
      }
    }
    return null;
  }

  getActionsByCategory(category) {
    const results = [];
    for (const action of this.actions.values()) {
      if (action.category === category) {
        results.push(action);
      }
    }
    return results;
  }

  /**
   * Builds a flat list of items suitable for the DropdownMenu component,
   * based on registered actions that have a 'menuPath'.
   * Handles separators automatically.
   */
  getMenuItems() {
    const menuItems = [];
    const menuActions = [];

    for (const action of this.actions.values()) {
      if (action.menuPath) {
        menuActions.push(action);
      }
    }

    // Sort by menuPath to group items together
    menuActions.sort((a, b) => a.menuPath.localeCompare(b.menuPath));

    let lastGroup = null;
    for (const action of menuActions) {
      const group = action.menuPath.split('/')[0];

      if (lastGroup && group !== lastGroup) {
        menuItems.push({ separator: true });
      }

      menuItems.push({
        label: action.label,
        onClick: action.handler,
      });

      lastGroup = group;
    }

    return menuItems;
  }

    


  static _doc_overview() {
      return "### ActionRegistry\n\nCentral register for editor actions. Decouples UI elements from their execution logic, enabling dynamic menu construction and global command handling.";
    }

  static _doc_dispatch() {
      return "## Dynamic Menu Generation and Key Interception\n\n- **Dynamic Menus**: `getMenuItems` scans registered actions, filters for those with a `menuPath` (e.g. 'File / Save'), and automatically groups them with dividers into structured arrays prepared for the `DropdownMenu` component.\n- **Hotkey Interception**: Intercepts keyboard inputs globally and checks them against the registry's registered shortcuts, preventing overlapping listeners across different components.";
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_dispatch(),
        this._doc_methods()
      ].join('\n\n');
    }

  

  static _doc_methods() {
      return "### Key Methods\n\n- `register(config)`: Registers a command with its label, keyboard shortcut, and handler.\n- `execute(id)`: Invokes the action handler by ID.\n- `getMenuItems()`: Translates registered actions into categorized items suitable for rendering in dropdown menus.";
    }
}

