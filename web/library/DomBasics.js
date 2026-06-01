class DomBasics {
  static run() {
    if (typeof globalThis.makeElement === 'undefined') {
      globalThis.makeElement = function(type, ...args) {
        let element;

        if (type.startsWith('svg:')) {
          element = document.createElementNS('http://www.w3.org/2000/svg', type.substring(4));
        } else {
          element = document.createElement(type);
        }

        const attributeMappings = { className: 'class', htmlFor: 'for' };

        for (const arg of args) {
          if (typeof arg === 'string') {
            element.appendChild(document.createTextNode(arg));
          } else if (arg instanceof Node) {
            element.appendChild(arg);
          } else if (Array.isArray(arg)) {
            arg.forEach((child) => {
              if (Array.isArray(child)) {
                if (child.length > 0) element.appendChild(globalThis.makeElement(...child));
              } else if (child instanceof Node) {
                element.appendChild(child);
              } else if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
              }
            });
          } else if (typeof arg === 'object' && arg !== null) {
            Object.entries(arg).forEach(([key, value]) => {
              if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
              } else if (key === 'textContent' || key === 'innerHTML') {
                element[key] = value;
              } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.substring(2).toLowerCase(), value);
              } else if (typeof value === 'boolean') {
                const attrName = attributeMappings[key] || key;
                if (value) element.setAttribute(attrName, '');
                else element.removeAttribute(attrName);
              } else if (value !== undefined && value !== null) {
                element.setAttribute(attributeMappings[key] || key, String(value));
              }
            });
          }
        }
        return element;
      };
    }

    if (typeof globalThis.applyCss === 'undefined') {
      globalThis.applyCss = function(cssString, id, doc) {
        const styleId = 'cssId_' + (id || 'default_' + Date.now());
        const targetDocument = doc || document;
        let styleElement = targetDocument.getElementById(styleId);

        if (!styleElement) {
          styleElement = targetDocument.createElement('style');
          styleElement.id = styleId;
          (targetDocument.head || targetDocument.getElementsByTagName('head')[0]).appendChild(styleElement);
        }

        if (styleElement.textContent !== cssString) {
          styleElement.textContent = cssString;
        }
      };
    }
  }
}
