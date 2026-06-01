// svgButtonManager.js
function createSvgButtonManager(svgElement) {
  // SVG formatting functions
  function roundSvgNumbers(svgString) {
      const pathNumberRegex = /(?<=[\s,MmLlAaCcSsQqTtHhVvZz])\d+\.?\d*(?![,\s]*[Aa][\s,]*[0-1])/g;
      const attrNumberRegex = /(?<=\b(x|y|width|height|stroke-width)=")\d+\.?\d*/g;
      svgString = svgString.replace(pathNumberRegex, match => {
          const num = Number(match).toFixed(1);
          return num.endsWith('.0') ? parseInt(num).toString() : num;
      });
      svgString = svgString.replace(attrNumberRegex, match => {
          const num = Number(match).toFixed(1);
          return num.endsWith('.0') ? parseInt(num).toString() : num;
      });
      return svgString;
  }

  function formatSvg(svgElement) {
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);
      //svgString = roundSvgNumbers(svgString);
      const contentMatch = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
      const content = contentMatch ? contentMatch[1].replace(/></g, '>\n<') : svgString;
      const width = svgElement.getAttribute('width') || '900px';
      const height = svgElement.getAttribute('height') || '300px';
      const viewBox = svgElement.getAttribute('viewBox') || '0 0 900 300';
      return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
${content}
</svg>`;
  }

  // Button actions
  function downloadSvg() {
      const svgData = formatSvg(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = makeElement('a', { 
          href: url, 
          download: 'piano.svg' 
      });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  }

  function openSvgInNewTab() {
      const svgData = formatSvg(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Don't revoke URL immediately to ensure tab can load it
  }

  // Create button container and buttons
  const buttonContainer = makeElement('div', {
      style: {
          position: 'fixed',
          top: '0',
          right: '0',
          zIndex: '1000',
          background: 'linear-gradient(135deg, #2a2a4a, #1e1e2f)',
          borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
          borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '0 0 0 10px',
          padding: '8px',
          display: 'flex',
          gap: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
      }
  });

  const saveButton = makeElement('button', {
      textContent: 'Save SVG',
      style: {
          padding: '6px 12px',
          background: 'linear-gradient(45deg, #4a4a8a, #6a6aaa)',
          border: 'none',
          borderRadius: '5px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          outline: 'none'
      },
      onmouseover: function() {
          this.style.transform = 'scale(1.05)';
          this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      },
      onmouseout: function() {
          this.style.transform = 'scale(1)';
          this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
      },
      onclick: downloadSvg
  });

  const openButton = makeElement('button', {
      textContent: 'Open in New Tab',
      style: {
          padding: '6px 12px',
          background: 'linear-gradient(45deg, #4a8a4a, #6aaa6a)',
          border: 'none',
          borderRadius: '5px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          outline: 'none'
      },
      onmouseover: function() {
          this.style.transform = 'scale(1.05)';
          this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      },
      onmouseout: function() {
          this.style.transform = 'scale(1)';
          this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
      },
      onclick: openSvgInNewTab
  });

  // Assemble the container
  buttonContainer.appendChild(saveButton);
  buttonContainer.appendChild(openButton);
  document.body.appendChild(buttonContainer);
}

// Add to your existing HTML file after all other scripts: