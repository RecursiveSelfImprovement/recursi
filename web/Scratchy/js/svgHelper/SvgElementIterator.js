class SvgElementIterator {
  static iterate(svgElement, callback) {
    SvgElementIterator._walk(svgElement, callback, []);
  }

  static _walk(node, callback, pathSoFar) {
    if (node.nodeType !== 1) return;
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    if (
      tag === 'svg' ||
      tag === 'defs' ||
      tag === 'style' ||
      tag === 'title' ||
      tag === 'desc' ||
      tag === 'metadata'
    ) {
      for (const child of Array.from(node.childNodes)) {
        SvgElementIterator._walk(child, callback, [
          ...pathSoFar,
          { tag, id: node.getAttribute('id') || null },
        ]);
      }
      return;
    }

    const entry = {
      tag,
      id: node.getAttribute('id') || null,
      className: node.getAttribute('class') || null,
    };

    const currentPath = [...pathSoFar, entry];

    const info = {
      element: node,
      tag,
      path: currentPath,
      pathString: currentPath
        .map((p) => p.tag + (p.id ? `#${p.id}` : ''))
        .join(' > '),
      depth: currentPath.length,
      id: node.getAttribute('id'),
      className: node.getAttribute('class'),
      attributes: SvgElementIterator._getAttributes(node),
    };

    callback(info);

    for (const child of Array.from(node.childNodes)) {
      SvgElementIterator._walk(child, callback, currentPath);
    }
  }

  static _getAttributes(el) {
    const attrs = {};
    for (const attr of Array.from(el.attributes)) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  static flatList(svgElement) {
    const list = [];
    SvgElementIterator.iterate(svgElement, (info) => {
      list.push(info);
    });
    return list;
  }

  static runUserScript(svgElement, userCode) {
    const clone = svgElement.cloneNode(true);
    const fn = new Function('info', userCode);
    SvgElementIterator.iterate(clone, (info) => {
      try {
        fn(info);
      } catch (e) {
        console.warn('User script error on element:', info.pathString, e);
      }
    });
    return clone;
  }

  static getStats(svgElement) {
    const stats = { total: 0, byTag: {} };
    SvgElementIterator.iterate(svgElement, (info) => {
      stats.total++;
      stats.byTag[info.tag] = (stats.byTag[info.tag] || 0) + 1;
    });
    return stats;
  }
}

