
class StaticCheckbox {
  /**
   * @param {number} [size=18] - The width and height of the checkbox SVG.
   */
  constructor(size = 18) {
    this.size = size;
    this.svg = this.createSvg();
  }

  createSvg() {
    const checkboxSize = this.size;
    const shadowOffset = checkboxSize * 0.08;
    const rectSize = 16;
    const checkPath = 'M4 10 L8 14 L16 6';

    return makeElement(
      'svg:svg',
      {
        width: checkboxSize,
        height: checkboxSize,
        viewBox: `0 0 20 20`,
        style: { display: 'block', flexShrink: 0 },
      },
      makeElement('svg:rect', {
        x: 2 + shadowOffset,
        y: 2 + shadowOffset,
        width: rectSize,
        height: rectSize,
        rx: 2,
        ry: 2,
        fill: 'black',
        opacity: 0.3,
      }),
      makeElement('svg:rect', {
        x: 2,
        y: 2,
        width: rectSize,
        height: rectSize,
        rx: 2,
        ry: 2,
        fill: 'darkgray',
      }),
      makeElement('svg:path', {
        d: checkPath,
        stroke: 'black',
        'stroke-width': 2.5,
        fill: 'none',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        style: { display: 'none' },
        transform: `translate(${shadowOffset * 0.8}, ${shadowOffset * 0.8})`,
      }),
      makeElement('svg:path', {
        d: checkPath,
        stroke: 'blue',
        'stroke-width': 2,
        fill: 'none',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        style: { display: 'none' },
      })
    );
  }

  setState(isChecked) {
    const checkPaths = this.svg.querySelectorAll('path');
    checkPaths.forEach((path) => {
      path.style.display = isChecked ? 'block' : 'none';
    });

    const backgroundRect = this.svg.querySelector('rect:nth-of-type(2)');
    if (backgroundRect) {
      backgroundRect.setAttribute('fill', isChecked ? 'lightblue' : 'darkgray');
    }
  }

  attachTo(parent) {
    if (parent && parent.appendChild) {
      parent.appendChild(this.svg);
    } else {
      console.error(
        'StaticCheckbox: Invalid parent element provided for attachment.'
      );
    }
  }
}



