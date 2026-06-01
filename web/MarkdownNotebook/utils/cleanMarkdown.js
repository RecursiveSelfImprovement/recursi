function cleanMarkdown(input) {
  // Pattern to match lines like "markdown", "javascript", "html" followed by "Copy code",
  // often added by code snippet tools. Allows for surrounding whitespace/newlines.
  const unwantedPattern =
    /^(?:\s*(?:markdown|javascript|html)\s*\n\s*Copy code\s*)$/gim;
  const cleanedContent = input.replace(unwantedPattern, '');
  return cleanedContent.trim(); // Trim leading/trailing whitespace from the final result
}