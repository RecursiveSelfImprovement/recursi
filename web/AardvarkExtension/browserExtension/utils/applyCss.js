/**
 * Applies CSS rules by creating/updating a <style> tag.
 * @param {string} cssString - The CSS rules.
 * @param {string} [id] - Unique ID for the style block (recommended for updates).
 * @param {Document} [doc=document] - Target document.
 */
function applyCss(cssString, id, doc) {
  const styleId = 'cssId_' + (id || 'default_' + Date.now()); // Use timestamp for default uniqueness
  const targetDocument = doc || document;
  let styleElement = targetDocument.getElementById(styleId);

  if (!styleElement) {
    styleElement = targetDocument.createElement('style');
    styleElement.id = styleId;
    (
      targetDocument.head || targetDocument.getElementsByTagName('head')[0]
    ).appendChild(styleElement);
  }

  if (styleElement.textContent !== cssString) {
    // Avoid unnecessary updates
    styleElement.textContent = cssString;
  }
}