class HamburgerMenu {
    constructor(options = {}) {
      this.options = {
        menuItems: [],
        size: 25,
        hoverScale: 1.5,
        animationDuration: 150,
        menuPadding: 10,
        hideDelay: 500,
        ...options,
      };

      this.options.menuItems = Array.isArray(this.options.menuItems)
        ? this.options.menuItems
        : [];

      this.hideTimeout = null;
      this.isMouseOverMenu = false;
      this.isMouseOverIcon = false;
      this.createElements();
      this.setupEventListeners();
    }

    createElements() {
      this.container = makeElement('div', {
        className: 'hamburger-menu-icon',
        style: {
          position: 'relative',
          display: 'inline-block',
          width: `${this.options.size}px`,
          height: `${this.options.size}px`,
          cursor: 'pointer',
          transform: 'scale(1)',
          transition: `transform ${this.options.animationDuration}ms ease`,
          verticalAlign: 'middle',
        },
      });

      const barHeight = Math.max(1, Math.floor(this.options.size / 6));
      const barSpacing = Math.max(1, Math.floor(barHeight / 1.6));
      const totalBarsHeight = 3 * barHeight + 2 * barSpacing;
      const startY = (this.options.size - totalBarsHeight) / 2;

      this.bars = [0, 1, 2].map((i) =>
        makeElement('div', {
          className: 'hamburger-bar',
          style: {
            position: 'absolute',
            left: '0',
            height: `${barHeight}px`,
            width: '100%',
            backgroundColor: '#555',
            top: `${startY + i * (barHeight + barSpacing)}px`,
            borderRadius: `${Math.max(1, Math.floor(barHeight / 2))}px`,
            pointerEvents: 'none',
          },
        })
      );
      this.bars.forEach((bar) => this.container.appendChild(bar));

      this.menu = makeElement('div', {
        className: 'hamburger-popup-menu',
        style: {
          position: 'fixed',
          display: 'none',
          opacity: '0',
          backgroundColor: '#fff',
          color: '#000',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          borderRadius: '4px',
          padding: '8px 0',
          transition: `opacity ${this.options.animationDuration}ms ease`,
          zIndex: '10000',
          minWidth: '150px',
        },
      });

      this.options.menuItems.forEach((item) => {
        const menuItemContainer = makeElement('div', {
          className: 'hamburger-menu-item',
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '8px 16px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            backgroundColor: 'transparent',
            color: '#000',
            transition: `background-color ${this.options.animationDuration}ms ease, color ${this.options.animationDuration}ms ease`,
          },
        });

        let checkbox = null;
        if (item.toggle) {
          checkbox = new StaticCheckbox(16);
          checkbox.attachTo(menuItemContainer);
          checkbox.setState(!!item.isChecked);
        }

        const itemLabel = makeElement('span', {
          textContent: item.name || 'Unnamed Item',
          style: {
            marginLeft: item.toggle ? '8px' : '0px',
            flexGrow: 1,
          },
        });
        menuItemContainer.appendChild(itemLabel);

        menuItemContainer.onmouseenter = () => {
          menuItemContainer.style.backgroundColor = '#e0e0e0';
        };
        menuItemContainer.onmouseleave = () => {
          menuItemContainer.style.backgroundColor = 'transparent';
        };

        menuItemContainer.onclick = (e) => {
          e.stopPropagation();

          menuItemContainer.style.backgroundColor = '#cceeff';

          if (checkbox) {
            item.isChecked = !item.isChecked;
            checkbox.setState(item.isChecked);
          }

          if (typeof item.action === 'function') {
            item.action(item);
          }

          setTimeout(() => {
            this.hideMenu(true);
          }, 50);
        };

        this.menu.appendChild(menuItemContainer);
      });

      document.body.appendChild(this.menu);
    }

    adjustMenuPosition() {
      if (!this.container || !this.menu) return;

      const rect = this.container.getBoundingClientRect();
      const menuWidth = this.menu.offsetWidth;
      const menuHeight = this.menu.offsetHeight;
      const vpWidth = window.innerWidth;
      const vpHeight = window.innerHeight;
      const padding = this.options.menuPadding;

      let left = rect.right + padding;
      let top = rect.top + rect.height / 2 - menuHeight / 2;

      if (left + menuWidth > vpWidth - padding) {
        left = rect.left - menuWidth - padding;
        if (left < padding) {
          left = padding;
        }
      }
      if (left < padding) {
        left = padding;
      }

      if (top + menuHeight > vpHeight - padding) {
        top = vpHeight - menuHeight - padding;
      }
      if (top < padding) {
        top = padding;
      }

      this.menu.style.left = `${left}px`;
      this.menu.style.top = `${top}px`;
    }

    showMenu() {
      clearTimeout(this.hideTimeout);
      if (
        this.menu.style.display === 'block' &&
        this.menu.style.opacity === '1'
      ) {
        return;
      }

      this.menu.style.display = 'block';
      this.adjustMenuPosition();

      requestAnimationFrame(() => {
        this.menu.style.opacity = '1';
      });
    }

    hideMenu(immediate = false) {
      clearTimeout(this.hideTimeout);

      const doHide = () => {
        this.menu.style.opacity = '0';
        setTimeout(() => {
          if (this.menu.style.opacity === '0') {
            this.menu.style.display = 'none';
          }
        }, this.options.animationDuration);
      };

      if (immediate) {
        doHide();
      } else {
        this.hideTimeout = setTimeout(() => {
          if (!this.isMouseOverIcon && !this.isMouseOverMenu) {
            doHide();
          }
        }, this.options.hideDelay);
      }
    }

    setupEventListeners() {
      this.container.onmouseenter = () => {
        this.isMouseOverIcon = true;
        this.container.style.transform = `scale(${this.options.hoverScale})`;
        this.showMenu();
      };

      this.container.onmouseleave = () => {
        this.isMouseOverIcon = false;
        this.container.style.transform = 'scale(1)';
        this.hideMenu();
      };

      this.menu.onmouseenter = () => {
        this.isMouseOverMenu = true;
        this.showMenu();
      };

      this.menu.onmouseleave = () => {
        this.isMouseOverMenu = false;
        this.hideMenu();
      };
    }

    destroy() {
      clearTimeout(this.hideTimeout);
      if (this.menu && this.menu.parentNode) {
        this.menu.parentNode.removeChild(this.menu);
      }
      this.menu = null;
      this.container = null;
      this.options = null;
      this.bars = null;
    }
  }