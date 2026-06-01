
class HighlightUtilities {
  static applyHighlight(element, highlightColor) {
    if (!element || !element.threejsObject) return;
    element.threejsObject.traverse(function (child) {
      if (child.material) {
        if (child.material.color) {
          if (child.userData.originalColor === undefined) {
            child.userData.originalColor = child.material.color.getHex();
          }
          child.material.color.setHex(highlightColor);
        }
        if (child.material.emissive) {
          if (child.userData.originalEmissive === undefined) {
            child.userData.originalEmissive = child.material.emissive.getHex();
          }
          child.material.emissive.setHex(highlightColor);
        }
      }
    });
  }

  static removeHighlight(element) {
    if (!element || !element.threejsObject) return;
    element.threejsObject.traverse(function (child) {
      if (child.material && child.userData.originalColor !== undefined) {
        child.material.color.setHex(child.userData.originalColor);
        delete child.userData.originalColor;
      }
      if (child.material && child.userData.originalEmissive !== undefined) {
        child.material.emissive.setHex(child.userData.originalEmissive);
        delete child.userData.originalEmissive;
      }
    });
  }

}

