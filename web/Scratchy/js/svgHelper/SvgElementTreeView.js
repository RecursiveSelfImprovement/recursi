
class SvgElementTreeView {
  constructor(container) {
    this.container = container;
    this.filterInput = null;
    this.treeContainer = null;
    this.svgElement = null;
    this.collapsedPaths = new Set();
    this.selectedElement = null;
    this.onElementSelect = null;
    this.filterText = '';
  }

  init() {
    this.filterInput = makeElement('input', {
      className: 'svgh-filter-input',
      placeholder: 'Filter elements...',
      oninput: (e) => {
        this.filterText = e.target.value.toLowerCase();
        this.render();
      },
    });
    this.treeContainer = makeElement('div', { className: 'svgh-element-tree' });
    this.container.appendChild(this.filterInput);
    this.container.appendChild(this.treeContainer);
  }

  setSvg(svgElement) {
    this.svgElement = svgElement;
    this.collapsedPaths.clear();
    this.selectedElement = null;
    this.render();
  }

  render() {
    this.treeContainer.innerHTML = '';
    if (!this.svgElement) return;

    const items = SvgElementIterator.flatList(this.svgElement);

    for (const info of items) {
      if (this.filterText) {
        const searchStr = `${info.tag} ${info.id || ''} ${
          info.className || ''
        }`.toLowerCase();
        if (!searchStr.includes(this.filterText)) continue;
      }

      const hasChildren = info.element.childElementCount > 0;
      const pathKey = info.pathString;
      const isCollapsed = this.collapsedPaths.has(pathKey);
      const isSelected = this.selectedElement === info.element;

      const depth = Math.max(0, info.depth - 1);
      const indents = [];
      for (let i = 0; i < depth; i++) {
        indents.push(makeElement('span', { className: 'svgh-tree-indent' }));
      }

      let toggle = null;
      if (hasChildren && info.tag === 'g') {
        toggle = makeElement(
          'span',
          {
            className: `svgh-tree-toggle ${isCollapsed ? 'collapsed' : ''}`,
            onclick: (e) => {
              e.stopPropagation();
              if (this.collapsedPaths.has(pathKey)) {
                this.collapsedPaths.delete(pathKey);
              } else {
                this.collapsedPaths.add(pathKey);
              }
              this.render();
            },
          },
          makeElement(
            'svg:svg',
            { viewBox: '0 0 10 10', fill: 'currentColor' },
            makeElement('svg:path', { d: 'M2 3L5 7L8 3' })
          )
        );
      } else {
        toggle = makeElement('span', {
          className: 'svgh-tree-indent',
          style: { width: '14px' },
        });
      }

      const tagBadgeClass = SvgElementTreeView._tagClass(info.tag);

      const parts = [
        ...indents,
        toggle,
        makeElement(
          'span',
          { className: `svgh-tag-badge ${tagBadgeClass}` },
          `<${info.tag}>`
        ),
      ];

      if (info.id) {
        parts.push(
          makeElement('span', { className: 'id-attr' }, `#${info.id}`)
        );
      }
      if (info.className) {
        parts.push(
          makeElement(
            'span',
            { className: 'class-attr' },
            `.${info.className.split(' ')[0]}`
          )
        );
      }

      const item = makeElement(
        'div',
        {
          className: `svgh-tree-item ${isSelected ? 'active' : ''}`,
          onclick: () => {
            this.selectedElement = info.element;
            if (this.onElementSelect) this.onElementSelect(info);
            this.render();
          },
        },
        parts
      );

      this.treeContainer.appendChild(item);
    }
  }

  static _tagClass(tag) {
    const known = ['path', 'rect', 'circle', 'ellipse', 'line', 'g', 'text'];
    return known.includes(tag) ? tag : 'default';
  }
}

