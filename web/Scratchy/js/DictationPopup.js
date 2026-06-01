
class DictationPopup {
  constructor() {
    this.textElement = makeElement('span');
    this.element = makeElement(
      'div',
      { className: 'tentative-popup' },
      this.textElement
    );

    this.svgPath = makeElement('svg:path', {});

    this.svgConnector = makeElement(
      'svg:svg',
      {
        className: 'tentative-popup-connector',
        style: {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
        },
      },
      this.svgPath
    );

    document.body.appendChild(this.element);
    document.body.appendChild(this.svgConnector);

    this.isVisible = false;
  }

  update(text) {
    if (text) {
      this.textElement.textContent = text;
      this.show();
    } else {
      this.hide();
    }
  }

  show() {
    if (this.isVisible) return;
    this.isVisible = true;
  }

  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.element.style.display = 'none';
    this.svgConnector.style.display = 'none';
  }

  position(caretRect, editorRect) {
    if (!this.isVisible || !caretRect || !editorRect) return;

    this.element.style.display = 'block';
    this.svgConnector.style.display = 'block';
    const popupEl = this.element;

    void popupEl.offsetHeight; // Force reflow
    const popupRect = popupEl.getBoundingClientRect();

    const isNearRightEdge =
      caretRect.left > editorRect.left + editorRect.width * 0.75;
    const spacing = isNearRightEdge ? 8 : 15;
    const sideSpacing = isNearRightEdge ? 12 : 20;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const positions = [
      { side: 'top', top: caretRect.bottom + spacing, left: caretRect.left },
      {
        side: 'bottom',
        top: caretRect.top - popupRect.height - spacing,
        left: caretRect.left,
      },
      {
        side: 'left',
        top: caretRect.top + caretRect.height / 2 - popupRect.height / 2,
        left: caretRect.right + sideSpacing,
      },
      {
        side: 'right',
        top: caretRect.top + caretRect.height / 2 - popupRect.height / 2,
        left: caretRect.left - popupRect.width - sideSpacing,
      },
    ];

    let bestPosition = null;
    for (const pos of positions) {
      if (
        pos.top > 5 &&
        pos.left > 5 &&
        pos.top + popupRect.height < viewportH - 5 &&
        pos.left + popupRect.width < viewportW - 5
      ) {
        bestPosition = pos;
        break;
      }
    }

    if (!bestPosition) bestPosition = positions[0];

    bestPosition.top = Math.max(
      5,
      Math.min(bestPosition.top, viewportH - popupRect.height - 5)
    );
    bestPosition.left = Math.max(
      5,
      Math.min(bestPosition.left, viewportW - popupRect.width - 5)
    );

    // THE FIX FOR `position: absolute`: Add scroll offsets to convert viewport
    // coordinates into document coordinates.
    const finalLeft = bestPosition.left + window.scrollX;
    const finalTop = bestPosition.top + window.scrollY;

    popupEl.style.transform = `translate(${finalLeft}px, ${finalTop}px)`;

    Promise.resolve().then(() => {
      const finalPopupRect = popupEl.getBoundingClientRect();
      this.drawConnector(caretRect, finalPopupRect, bestPosition.side);
    });
  }

  drawConnector(caretRect, popupRect, anchorSide) {
    const startX = caretRect.left + caretRect.width / 2;
    const startY = caretRect.top + caretRect.height / 2;

    let endX, endY;

    switch (anchorSide) {
      case 'top':
        endX = popupRect.left + popupRect.width / 2;
        endY = popupRect.top;
        break;
      case 'bottom':
        endX = popupRect.left + popupRect.width / 2;
        endY = popupRect.bottom;
        break;
      case 'left':
        endX = popupRect.left;
        endY = popupRect.top + popupRect.height / 2;
        break;
      case 'right':
        endX = popupRect.right;
        endY = popupRect.top + popupRect.height / 2;
        break;
      default:
        endX = popupRect.left;
        endY = popupRect.top;
    }

    let cp1x, cp1y, cp2x, cp2y;
    if (anchorSide === 'top' || anchorSide === 'bottom') {
      const halfY = (endY - startY) * 0.5;
      cp1x = startX;
      cp1y = startY + halfY;
      cp2x = endX;
      cp2y = endY - halfY;
    } else {
      const halfX = (endX - startX) * 0.5;
      cp1x = startX + halfX;
      cp1y = startY;
      cp2x = endX - halfX;
      cp2y = endY;
    }

    this.svgPath.setAttribute(
      'd',
      `M ${startX},${startY} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`
    );
  }

  destroy() {
    this.element.remove();
    this.svgConnector.remove();
  }

  showCentered(editorRect) {
    if (!this.isVisible || !editorRect) return;
    this.svgConnector.style.display = 'none';
    this.element.style.display = 'block';

    const popupEl = this.element;
    void popupEl.offsetHeight;
    const popupRect = popupEl.getBoundingClientRect();

    const targetTop =
      editorRect.top + editorRect.height / 2 - popupRect.height / 2;
    const targetLeft =
      editorRect.left + editorRect.width / 2 - popupRect.width / 2;

    // THE FIX FOR `position: absolute`: Add scroll offsets here as well.
    const finalLeft = targetLeft + window.scrollX;
    const finalTop = targetTop + window.scrollY;

    popupEl.style.transform = `translate(${finalLeft}px, ${finalTop}px)`;
  }
}

