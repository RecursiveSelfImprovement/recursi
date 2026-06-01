
class RotaryEncoders {
  static _hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0,
      g = 0,
      b = 0;

    if (0 <= hh && hh < 1) {
      r = c;
      g = x;
    } else if (1 <= hh && hh < 2) {
      r = x;
      g = c;
    } else if (2 <= hh && hh < 3) {
      g = c;
      b = x;
    } else if (3 <= hh && hh < 4) {
      g = x;
      b = c;
    } else if (4 <= hh && hh < 5) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

    const m = l - c / 2;
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  static _rgbToHex(r, g, b) {
    return (
      '#' +
      [r, g, b]
        .map((component) => {
          const hex = component.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  static initialize(baseController) {
    let _b = 0;
    let lineWidth = 4;

    const handleRotaryInput = (which, delta) => {
      if (which === 3) {
        SpinnerWidget.handleGlobalWheel({
          deltaY: delta * 100,
          preventDefault: () => {},
        });
        if (baseController) baseController.refreshMousePosition();
      }

      if (which === 0) {
        lineWidth = Math.max(1, lineWidth + delta * 1);
        if (baseController) {
          baseController.lineWidth = lineWidth;
          baseController.refreshMousePosition();
        }
      }

      if (which === 1) {
        _b = (_b + delta * 6) % 360;
        if (_b < 0) _b += 360;
        let rgb = this._hslToRgb(_b, 100, 50);
        let hex = this._rgbToHex(rgb.r, rgb.g, rgb.b);
        if (baseController) {
          baseController.currentColor = hex;
          baseController.refreshMousePosition();
        }
      }

      if (which === 2) {
        if (baseController) {
          baseController.commandControlValue *= delta == 1 ? 1.05 : 1 / 1.05;
          baseController.refreshMousePosition();
        }
      }
    };

    this._setRotaryEncoderHandler(handleRotaryInput);
    console.log('Rotary encoder handlers initialized.');
  }

  static _setRotaryEncoderHandler(callback) {
    let rotaryEncoderHandlers = window.rotaryEncoderHandlers || {};

    // Clear any previous handlers to avoid duplicates
    for (let id in rotaryEncoderHandlers) {
      if (MidiInputHandler.removeDataHandler) {
        // Check if removeDataHandler exists
        MidiInputHandler.removeDataHandler(rotaryEncoderHandlers[id]);
      }
    }

    const encoderIds = [16, 17, 18, 19];
    rotaryEncoderHandlers = {};

    encoderIds.forEach((id, index) => {
      const handler = function (message) {
        // Check if the message is a Control Change (CC) on ANY channel (176-191)
        const isControlChange = message.type >= 176 && message.type <= 191;

        if (isControlChange && message.data[1] === id) {
          const delta =
            message.data[2] === 65 ? 1 : message.data[2] === 63 ? -1 : 0;
          if (delta !== 0) {
            callback(index, delta);
          }
        }
      };
      MidiInputHandler.addDataHandler(handler);
      rotaryEncoderHandlers[id] = handler;
    });
  }

}

