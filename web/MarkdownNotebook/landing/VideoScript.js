
/**
 * VideoScript.js — Teleprompter-style video script.
 * Each chunk is a named static method returning a string.
 * compose() assembles them in order with section labels.
 */
class VideoScript {
  static hook() {
    return "You're deep into a conversation with Claude or ChatGPT, the thread is getting long, and you need to hand off context to a new thread. Or maybe you just want to save what you've got so far. The AI gives you this beautifully formatted response — headings, code blocks, bullet lists — but when you try to grab it, you're stuck. Copy it into a text file and you lose all the structure. Paste it into a doc and it's a formatting mess. What you really want is clean Markdown — because that's what LLMs actually understand best.";
  }

  static whatIsIt() {
    return "That's what Markdown Notebook does. It's a browser-based editor — no accounts, no sign-ups, nothing stored on a server. You paste in formatted text and it gives you clean Markdown. But it's more than a converter — it's a notebook you can keep building in, save, reopen, and keep going.";
  }

  static pasteDemo() {
    return "Let me show you. I've got a conversation going here and I want to capture this response. I select it right in the browser — all the formatted text, headings, code, everything — and copy it. Now I switch over to Markdown Notebook and paste. And look — it's all there, cleanly converted to Markdown. Headings are headings, code blocks are fenced, lists are formatted properly. I didn't have to fix anything.";
  }

  static whyItMatters() {
    return "This matters because when you paste Markdown back into a new chat thread, the LLM gets proper structure — not a blob of plain text, not messy HTML. It can actually read your headings and code blocks. That's the difference between a good handoff and losing half your context. And of course Markdown is portable beyond chatbots too — wikis, GitHub, blog posts, documentation.";
  }

  static editingFlow() {
    return "So now I've got my content in here. Let me show you around quickly — there's a menu up here with all your options. You can add new blocks, toggle dark mode, save in different formats. Each block has two views — formatted for reading and pasting, Markdown for precise edits. They stay in sync. You can create multiple blocks, give them titles, collapse them, drag to reorder. And there are checkboxes so you can select specific blocks to copy or export — you don't have to grab everything at once.";
  }

  static savingIntro() {
    return "Now here's the part I think is really clever. When you're ready to save, you have two options.";
  }

  static savingLive() {
    return "Option one: Save as a live HTML file. This gives you a single dot-HTML file that, when you open it in a browser, is a fully working notebook again. You can keep editing, add more content, rearrange things, and save again. It's self-replicating — each saved file can produce the next version of itself. You never have to come back to the website.";
  }

  static savingStatic() {
    return "Option two: Save as static HTML. This is just a plain, clean, readable web page. No JavaScript dependencies, no server calls. It's a snapshot — great for sharing, archiving, or just having a permanent record. And if you ever want to edit it again, just drop it onto the Markdown Notebook landing page. It gets re-imported with all your sections intact, ready to work with.";
  }

  static ownership() {
    return "One thing I want to be really clear about: there are no accounts here. No databases storing your stuff. The website serves the app code — that's it. Your actual notes, your Markdown, your block titles and order — all of that lives inside the HTML files you save. You own them completely. Move them, rename them, put them in Git, email them to someone. They're just files.";
  }

  static workflowExample() {
    return "Let me show you a quick real-world workflow. I'm working on a project and I ask Claude for a technical explanation. I get back a nice response with code examples. I select it, copy, paste into Markdown Notebook. Now I switch to Markdown view, clean up a couple of things, maybe add my own notes in a second block. I save the live HTML version to my project folder. Tomorrow I double-click that file, it opens in my browser, and I pick up right where I left off. When the document is done, I save a static version for the team wiki.";
  }

  static close() {
    return "That's Markdown Notebook. Paste formatted text from Claude, ChatGPT, Gemini, or any web page. Edit in Markdown or formatted view. Save as a self-replicating notebook or a static page. No accounts, no cloud, just files you own. Try it out — the link is in the description.";
  }

  static compose() {
    return [
      ['Hook', VideoScript.hook()],
      ['What is it', VideoScript.whatIsIt()],
      ['Paste demo', VideoScript.pasteDemo()],
      ['Why it matters', VideoScript.whyItMatters()],
      ['Editing flow', VideoScript.editingFlow()],
      ['Saving — intro', VideoScript.savingIntro()],
      ['Saving — live', VideoScript.savingLive()],
      ['Saving — static', VideoScript.savingStatic()],
      ['Ownership', VideoScript.ownership()],
      ['Workflow example', VideoScript.workflowExample()],
      ['Close', VideoScript.close()],
    ];
  }

  static render() {
    applyCss(
      `
      .vs-page {
        max-width: 720px;
        margin: 0 auto;
        padding: 40px 24px 80px;
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        background: #111;
        color: #e8e8e8;
        min-height: 100vh;
      }
      .vs-page-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1.6rem;
        font-weight: 700;
        color: #999;
        margin-bottom: 40px;
        padding-bottom: 16px;
        border-bottom: 1px solid #333;
      }
      .vs-chunk {
        margin-bottom: 36px;
      }
      .vs-chunk-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #555;
        margin-bottom: 8px;
      }
      .vs-chunk-text {
        font-size: 1.25rem;
        line-height: 1.8;
        color: #e0e0e0;
        font-weight: 400;
      }
      .vs-divider {
        border: none;
        border-top: 1px solid #222;
        margin: 0 0 36px 0;
      }
    `,
      'video-script-styles'
    );

    const chunks = VideoScript.compose();

    const children = [];
    chunks.forEach(([label, text], i) => {
      if (i > 0) {
        children.push(makeElement('hr', { className: 'vs-divider' }));
      }
      children.push(
        makeElement(
          'div',
          { className: 'vs-chunk' },
          makeElement('div', { className: 'vs-chunk-label' }, label),
          makeElement('div', { className: 'vs-chunk-text' }, text)
        )
      );
    });

    return makeElement(
      'div',
      { className: 'vs-page' },
      makeElement(
        'div',
        { className: 'vs-page-title' },
        'Video Script — Markdown Notebook'
      ),
      ...children
    );
  }
}



