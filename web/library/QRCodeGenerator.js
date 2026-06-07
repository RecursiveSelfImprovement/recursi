class QRCodeGenerator {
    constructor() {
      this.name = 'QRCodeGenerator';
    }

    static async loadLib() {
      if (typeof window.QRCode === 'function') return window.QRCode;
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = () => resolve(window.QRCode);
        script.onerror = () => {
          console.error("Failed to load QR code library dynamically");
          resolve(null);
        };
        document.head.appendChild(script);
      });
    }

    static async draw(text, canvas, size = 150) {
      try {
        const QRCodeLib = await QRCodeGenerator.loadLib();
        if (!QRCodeLib) {
          console.error("QRCode library not loaded on page.");
          return;
        }

        const wrapper = document.createElement('div');
        wrapper.style.display = 'none';
        document.body.appendChild(wrapper);

        new QRCodeLib(wrapper, {
          text: text,
          width: size,
          height: size,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCodeLib.CorrectLevel.M
        });

        // Small timeout to allow the library to render to the DOM
        await new Promise(r => setTimeout(r, 80));

        const qrCanvas = wrapper.querySelector('canvas');
        const qrImg = wrapper.querySelector('img');

        if (qrCanvas) {
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(qrCanvas, 0, 0);
        } else if (qrImg) {
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(qrImg, 0, 0);
        }

        if (wrapper.parentNode) {
          document.body.removeChild(wrapper);
        }
      } catch (err) {
        console.error("QR Code generation failed:", err);
      }
    }

    static async drawSVG(text, container) {
      try {
        const dataURL = await QRCodeGenerator.generateQRDataURL(text);
        if (!dataURL) {
          container.innerHTML = `<div style="color: #ff5555; font-size: 11px;">Failed to load QR.</div>`;
          return;
        }

        // Render EXACTLY the clean, borderless standalone image with the white Quiet Zone
        container.innerHTML = `<img src="${dataURL}" style="display: block; border: 20px solid white !important; background: white !important; box-sizing: border-box; width: 140px; height: 140px; margin: 0 auto;">`;

      } catch (err) {
        console.error("QR SVG generation failed:", err);
      }
    }
  
  static async generateQRDataURL(text) {
      const QRCodeLib = await QRCodeGenerator.loadLib();
      if (!QRCodeLib) return null;

      const temp = document.createElement('div');
      new QRCodeLib(temp, {
        text: text,
        width: 120,
        height: 120,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCodeLib.CorrectLevel.M
      });

      // Brief tick for the library to write the Base64 src
      await new Promise(r => setTimeout(r, 60));

      const img = temp.querySelector('img');
      return img ? img.src : null;
    }
}