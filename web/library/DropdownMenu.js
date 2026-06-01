class DropdownMenu {




_handleWindowClick = (e) => {
    if (this.menuElement && !this.menuElement.contains(e.target)) {
      this.close();
    }
  };

_handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

constructor({ targetElement, items, onClose }) {
    if (!targetElement || !items) {
      throw new Error('DropdownMenu requires a targetElement and items array.');
    }
    this.targetElement = targetElement;
    this.items = items;
    this.menuElement = null;
    this.onCloseCallback = onClose;

    this._createMenu();
    this._positionMenu();

    this._openMenu();
  }

_createMenu() {
    const menuItems = this.items.map((item, index) => {
      if (item.separator) {
        return makeElement('li', {
          className: 'dropdown-menu-separator',
          role: 'separator',
        });
      }
      const li = makeElement('li', {
        className: 'dropdown-menu-item',
        role: 'menuitem',
        tabIndex: -1,
        'data-index': index,
      }, item.label);

      // Both click and touchend so there's no hover-only activation
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        item.onClick();
        this.close();
      });

      // Keyboard: Enter / Space activate the item
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.onClick();
          this.close();
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this._focusItem(index + 1);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this._focusItem(index - 1);
        }
      });

      return li;
    });

    this.menuElement = makeElement('ul', {
      className: 'dropdown-menu',
      role: 'menu',
      'aria-label': 'Options',
    }, menuItems);

    // Store only the focusable items for arrow-key nav
    this._focusableItems = menuItems.filter(
      (li) => !li.classList.contains('dropdown-menu-separator')
    );

    document.body.appendChild(this.menuElement);
  }

_positionMenu() {
    const targetRect = this.targetElement.getBoundingClientRect();
    // Measure after appending so we get real dimensions
    const menuRect = this.menuElement.getBoundingClientRect();
    const margin = 8;
    const vp = { w: window.innerWidth, h: window.innerHeight };

    let top = targetRect.bottom + margin;
    let left = targetRect.left;

    // Flip up if it would overflow the bottom
    if (top + menuRect.height > vp.h - margin) {
      top = targetRect.top - menuRect.height - margin;
    }
    // Clamp to right edge
    if (left + menuRect.width > vp.w - margin) {
      left = vp.w - menuRect.width - margin;
    }
    // Clamp to left edge
    if (left < margin) left = margin;

    this.menuElement.style.top = `${Math.max(margin, top)}px`;
    this.menuElement.style.left = `${left}px`;
  }

close() {
    if (!this.menuElement) return;

    window.removeEventListener('click', this._handleWindowClick);
    window.removeEventListener('keydown', this._handleKeyDown);
    // (listener was registered without once:true to support arrow-key nav)

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }

    this.menuElement.classList.remove('open');
    setTimeout(() => {
      if (this.menuElement) {
        this.menuElement.remove();
      }
      this.menuElement = null;
    }, 200);
  }

_focusItem(index) {
    const items = this._focusableItems;
    if (!items || items.length === 0) return;
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    items[clamped].focus();
  }

_openMenu() {
    setTimeout(() => {
      this.menuElement.classList.add('open');
      // Move focus to first item so keyboard navigation works immediately
      this._focusItem(0);
      window.addEventListener('click', this._handleWindowClick, { once: true });
      window.addEventListener('keydown', this._handleKeyDown);
    }, 10);
  }


  

  
}


