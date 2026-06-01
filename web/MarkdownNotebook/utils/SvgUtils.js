
class SvgUtils {
  static createSVGPath({
    width,
    height,
    color,
    lineWidth,
    joinStyle,
    capStyle,
    coordinates,
    offsetX = 0,
    offsetY = 0,
  }) {
    let pathData = '';
    coordinates.forEach((coord, i) => {
      const x = (coord[0] + offsetX) * width;
      const y = (coord[1] + offsetY) * height;
      pathData += (i === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
    });
    return makeElement('svg:path', {
      d: pathData,
      stroke: color || 'black',
      'stroke-width': lineWidth || '2',
      'stroke-linecap': capStyle || 'round',
      'stroke-linejoin': joinStyle || 'round',
      fill: 'none',
    });
  }
  static createSVGElement({ width, height, className, elements = [] }) {
    return makeElement(
      'svg:svg',
      { width, height, class: className, viewBox: `0 0 ${width} ${height}` },
      ...elements
    );
  }
  static makeArrowHead(opts) {
    const {
      width = 16,
      height = 16,
      direction = 'down',
      color = '#555',
      strokeWidth = 2,
      className = '',
    } = opts;
    let points;
    if (direction === 'up') {
      points = [
        [0.2, 0.7],
        [0.5, 0.3],
        [0.8, 0.7],
      ];
    } else {
      points = [
        [0.2, 0.3],
        [0.5, 0.7],
        [0.8, 0.3],
      ];
    }
    const arrowPath = this.createSVGPath({
      width: width,
      height: height,
      coordinates: points,
      color: color,
      lineWidth: strokeWidth,
      capStyle: 'round',
      joinStyle: 'round',
    });
    return this.createSVGElement({
      width: width,
      height: height,
      className: className,
      elements: [arrowPath],
    });
  }
  static makeCrossMark(opts) {
    const { width: w, height: h } = opts;
    const coords1 = [
      [0.2, 0.2],
      [0.8, 0.8],
    ];
    const coords2 = [
      [0.2, 0.8],
      [0.8, 0.2],
    ];
    const path1 = this.createSVGPath({
      width: w,
      height: h,
      coordinates: coords1,
      color: '#555',
      lineWidth: 2,
    });
    const path2 = this.createSVGPath({
      width: w,
      height: h,
      coordinates: coords2,
      color: '#555',
      lineWidth: 2,
    });
    return this.createSVGElement({
      width: w,
      height: h,
      className: opts.className,
      elements: [path1, path2],
    });
  }
  static makeResizerCorner(opts) {
    const { width: w, height: h, whichCorner } = opts;
    const paths = [
      [
        [0.2, 0.15],
        [0.85, 0.15],
        [0.85, 0.8],
      ],
      [
        [0.2, 0.85],
        [0.85, 0.85],
        [0.85, 0.2],
      ],
      [
        [0.8, 0.85],
        [0.15, 0.85],
        [0.15, 0.2],
      ],
      [
        [0.8, 0.15],
        [0.15, 0.15],
        [0.15, 0.8],
      ],
    ];
    const coordinates = paths[whichCorner % paths.length];
    const path = this.createSVGPath({
      width: w,
      height: h,
      lineWidth: 2.5,
      capStyle: 'butt',
      color: '#666',
      coordinates,
    });
    return this.createSVGElement({
      width: w,
      height: h,
      className: opts.className,
      elements: [path],
    });
  }
}



