
/**
 * LandingPageText.js — Every visible text chunk on the landing page
 * is its own function. Surgical edits to any paragraph = one method swap.
 *
 * The compose() method returns an array of elements in display order.
 * LandingPage.js calls these instead of inline strings.
 */
class LandingPageText {
  static heroTitle() {
    return makeElement('h1', 'Markdown Notebook');
  }

  static heroSubtitle() {
    return makeElement(
      'div',
      { className: 'hero-subtitle' },
      'Paste formatted text from Claude, ChatGPT, Gemini, or the web — it becomes clean Markdown you can edit, organize, and save as a single HTML file.'
    );
  }

  static featureCardPasteTitle() {
    return '📥 Paste formatted text, get clean Markdown';
  }

  static featureCardPasteDesc() {
    return 'Select a response from Claude, ChatGPT, Gemini, or any web page — headings, bold, code blocks, lists — and paste it into the editor. The app converts the formatted HTML into clean Markdown automatically. No manual cleanup, no copy-paste headaches.';
  }

  static featureCardSaveTitle() {
    return '💾 Save as a self-contained HTML file';
  }

  static featureCardSaveDesc() {
    return 'Download your notebook as a single .html file. Open it later and keep editing — it picks up right where you left off. You can also export a static read-only version. Either way, your notes live in a file you control.';
  }

  static featureCardSyncTitle() {
    return '🔁 Formatted view + Markdown, always in sync';
  }

  static featureCardSyncDesc() {
    return 'Read and paste in the formatted view, or switch to raw Markdown for precise control. The Markdown stays canonical, so round-tripping is safe. Use multiple collapsible blocks, reorder them, and copy just what you need.';
  }

  static docsHeading() {
    return makeElement(
      'h2',
      { className: 'docs-heading' },
      'How Markdown Notebook works'
    );
  }

  static docsIntroP1() {
    return 'Markdown Notebook sits between "paste from an LLM" and "commit to a real document." ';
  }

  static docsIntroP2() {
    return 'Paste formatted output from any AI or web page, and it becomes editable Markdown. Work in a friendly formatted view or raw Markdown — your choice.';
  }

  static docsIntro() {
    return makeElement(
      'p',
      { className: 'docs-intro' },
      LandingPageText.docsIntroP1(),
      LandingPageText.docsIntroP2()
    );
  }

  static docsPasteTitle() {
    return makeElement('h3', 'What does "paste HTML" mean here?');
  }

  static docsPasteBodyPart1() {
    return 'In normal browsing, when you select text on a web page (headings, bold, links, bullet lists, code blocks) and press Copy, the browser copies both plain text and HTML. ';
  }

  static docsPasteBodyPart2() {
    return 'When you paste into Markdown Notebook\u2019s editor (a \u201ccontenteditable\u201d area, just like in an email app), the browser gives it that HTML. ';
  }

  static docsPasteBodyPart3() {
    return 'You are not pasting literal angle brackets like ';
  }

  static docsPasteBodyCode() {
    return makeElement('code', '&lt;div&gt;');
  }

  static docsPasteBodyPart4() {
    return ' into a code editor; you are pasting rich, formatted content, and the app strips junk styling and converts the structure into Markdown.';
  }

  static docsPasteBody() {
    return makeElement(
      'p',
      null,
      LandingPageText.docsPasteBodyPart1(),
      LandingPageText.docsPasteBodyPart2(),
      LandingPageText.docsPasteBodyPart3(),
      LandingPageText.docsPasteBodyCode(),
      LandingPageText.docsPasteBodyPart4()
    );
  }

  static docsWorkflowTitle() {
    return makeElement('h3', 'Typical workflow');
  }

  static docsWorkflowStep1() {
    return makeElement(
      'li',
      'Open Markdown Notebook and click "Launch Editor" to go to the live notebook page.'
    );
  }

  static docsWorkflowStep2() {
    return makeElement(
      'li',
      'Paste content from ChatGPT, Gemini, or a web page into the top editor. The app shows a formatted view and keeps a synced Markdown version.'
    );
  }

  static docsWorkflowStep3() {
    return makeElement(
      'li',
      'Add your own notes, headings, and comments. You can create multiple blocks, collapse them, and reorder them.'
    );
  }

  static docsWorkflowStep4() {
    return makeElement(
      'li',
      'When a block is ready, you can copy its Markdown out to another tool (docs, wikis, blog, codebase).'
    );
  }

  static docsWorkflowStep5() {
    return makeElement(
      'li',
      'When the whole page feels like a "snapshot" you want to keep, click "Save HTML" to download an .html notebook file.'
    );
  }

  static docsWorkflowList() {
    return makeElement(
      'ul',
      { className: 'docs-list' },
      LandingPageText.docsWorkflowStep1(),
      LandingPageText.docsWorkflowStep2(),
      LandingPageText.docsWorkflowStep3(),
      LandingPageText.docsWorkflowStep4(),
      LandingPageText.docsWorkflowStep5()
    );
  }

  static docsSaveTitle() {
    return makeElement('h3', 'Saving to HTML');
  }

  static docsSaveIntro() {
    return makeElement(
      'p',
      null,
      'The "Save HTML" button builds a single .html file that contains:'
    );
  }

  static docsSaveItem1() {
    return makeElement('li', 'All of your Markdown blocks and their order');
  }

  static docsSaveItem2() {
    return makeElement(
      'li',
      'The layout and settings needed to render the notebook'
    );
  }

  static docsSaveItem3() {
    return makeElement(
      'li',
      'A small reference to a shared script so the notebook can run again when reopened'
    );
  }

  static docsSaveList() {
    return makeElement(
      'ul',
      { className: 'docs-list' },
      LandingPageText.docsSaveItem1(),
      LandingPageText.docsSaveItem2(),
      LandingPageText.docsSaveItem3()
    );
  }

  static docsSaveNote() {
    return makeElement(
      'p',
      { className: 'docs-note' },
      'The saved file stays small and diff-friendly. ',
      'Rename it, move it, sync it with Git, or send it to someone — it just works.'
    );
  }

  static docsServerTitle() {
    return makeElement('h3', 'What lives in your file vs on the server?');
  }

  static docsServerBody() {
    return makeElement(
      'p',
      null,
      'Your actual notes (Markdown, block order, titles, etc.) are all stored inside the .html file you download, as markdown in textareas. ',
      'The server only provides static JavaScript and assets needed to run the notebook UI. There are no accounts, no per-user databases, and no server-side copies of your notebooks.'
    );
  }

  static docsOfflineNote() {
    return makeElement(
      'p',
      { className: 'docs-note' },
      'The live notebook loads a small shared script to run. ',
      'If you prefer a plain static HTML file with no dependencies, use "Save HTML (static)" instead. ',
      'You can always bring a static file back to life by dropping it onto the landing page.'
    );
  }

  static dropZoneTitle() {
    return makeElement('strong', 'Drop an HTML file here');
  }

  static dropZoneSubtitle() {
    return 'to open it in the editor';
  }

  static dropZoneErrorText() {
    return 'Please drop an .html file';
  }

  static composeDocsSectionChildren() {
    return [
      LandingPageText.docsHeading(),
      LandingPageText.docsIntro(),
      LandingPageText.docsPasteTitle(),
      LandingPageText.docsPasteBody(),
      LandingPageText.docsWorkflowTitle(),
      LandingPageText.docsWorkflowList(),
      LandingPageText.docsSaveTitle(),
      LandingPageText.docsSaveIntro(),
      LandingPageText.docsSaveList(),
      LandingPageText.docsSaveNote(),
      LandingPageText.docsServerTitle(),
      LandingPageText.docsServerBody(),
      LandingPageText.docsOfflineNote(),
    ];
  }

  static composeFeatureCards() {
    return [
      [
        LandingPageText.featureCardPasteTitle(),
        LandingPageText.featureCardPasteDesc(),
      ],
      [
        LandingPageText.featureCardSaveTitle(),
        LandingPageText.featureCardSaveDesc(),
      ],
      [
        LandingPageText.featureCardSyncTitle(),
        LandingPageText.featureCardSyncDesc(),
      ],
    ];
  }
}



