
class BlogPost {
  constructor() {}

  init(env) {
      BlogPostStyles.init();
      this._render(env.container);
    }

  _render(target) {
      const article = makeElement('article', { className: 'blog-article' });
      article.append(this._buildHeader(), this._buildBody(), this._buildFooter());
      target.appendChild(article);
    }

  _buildHeader() {
      const header = makeElement('header');
      header.append(
        makeElement('h1', { className: 'blog-title' }, BlogPostContent.title()),
        makeElement(
          'p',
          { className: 'blog-subtitle' },
          BlogPostContent.subtitle()
        ),
        this._buildByline()
      );
      return header;
    }

  _buildByline() {
      const byline = makeElement('div', { className: 'blog-byline' });
      byline.innerHTML = BlogPostContent.byline();
      return byline;
    }

  _buildBody() {
      const body = makeElement('div', { className: 'blog-body' });
      const sections = BlogPostContent.sections();

      sections.forEach((section, i) => {
        if (i > 0) {
          body.appendChild(this._buildSectionBreak());
        }
        body.appendChild(this._buildSection(section));
      });

      return body;
    }

  _buildSection(section) {
      const div = makeElement('div', { className: 'blog-section' });

      if (section.title) {
        div.appendChild(makeElement('h2', {}, section.title));
      }

      for (const para of section.paragraphs) {
        div.appendChild(this._buildParagraphBlock(para));
      }

      return div;
    }

  _buildSectionBreak() {
      return makeElement('div', { className: 'blog-section-break' }, '· · ·');
    }

  _buildFooter() {
      const footer = makeElement('div', { className: 'blog-footer' });
      footer.innerHTML = '← <a href="/frontPage/">back to recursi.dev</a>';
      return footer;
    }

  _buildParagraphBlock(para) {
      const wrap = makeElement('div', { className: 'blog-para-wrap' });
      const p = makeElement('p');
      p.innerHTML = para.html;
      wrap.appendChild(p);

      if (para.sidebar) {
        wrap.appendChild(this._buildSidebar(para.sidebar));
      }

      return wrap;
    }

  _buildSidebar(sidebar) {
      const aside = makeElement('aside', { className: 'blog-sidebar' });
      const title = makeElement(
        'div',
        { className: 'blog-sidebar-title' },
        sidebar.title
      );
      const body = makeElement('div', { className: 'blog-sidebar-body' });
      body.innerHTML = sidebar.body;
      aside.append(title, body);
      return aside;
    }

  async run(env) {
      if (this.rootElement) {
        this.destroy();
      }
      this.env = env;
      this.rootElement = env.container;
      this.init(env);
      return this;
    }


  destroy() {
      if (this.rootElement) {
        this.rootElement.innerHTML = '';
      }
      this.rootElement = null;
    }
}

