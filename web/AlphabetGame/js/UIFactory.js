
class UIFactory {
  static createGridSizeSelector(onSizeChange) {
    const createButton = (size) => {
      return makeElement(
        'button',
        {
          'data-size': size,
          onclick: () => onSizeChange(size),
        },
        `${size} x ${size}`
      );
    };

    return makeElement('div', { className: 'grid-size-selector' }, [
      createButton(4),
      createButton(5),
      createButton(6),
    ]);
  }

  static showInputDialog(title, message, defaultValue, env = null) {
      return new Promise((resolve) => {
        const input = makeElement('input', { type: 'text', value: defaultValue });
        const messageEl = makeElement('p', {}, message);

        const okButton = makeElement(
          'button',
          {
            onclick: () => {
              dialog.close();
              resolve(input.value);
            },
          },
          'OK'
        );

        const cancelButton = makeElement(
          'button',
          {
            style: { backgroundColor: '#7f8c8d' },
            onclick: () => {
              dialog.close();
              resolve(null);
            },
          },
          'Cancel'
        );

        const content = makeElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          [
            messageEl,
            input,
            makeElement(
              'div',
              { style: { display: 'flex', justifyContent: 'flex-end', gap: '10px' } },
              [cancelButton, okButton]
            ),
          ]
        );

        const dialog = UITools.makeDialog({
          env: env,
          title: title,
          contentElement: content,
          size: [350, 150],
        });

        setTimeout(() => input.focus(), 50);
      });
    }

  static loadGoogleFont(fontName) {
    const fontId = `google-font-${fontName.replace(/\s/g, '-')}`;
    if (document.getElementById(fontId)) return;

    const link = makeElement('link', {
      id: fontId,
      rel: 'stylesheet',
      href: `https://fonts.googleapis.com/css2?family=${fontName.replace(
        /\s/g,
        '+'
      )}&display=swap`,
    });
    document.head.appendChild(link);
  }

}

